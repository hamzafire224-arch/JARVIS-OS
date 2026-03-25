/**
 * JARVIS Voice Service (Tier 3 AGI Upgrade)
 * 
 * Background voice service that enables hands-free JARVIS interaction:
 * - Wake word detection ("Hey JARVIS", "JARVIS")
 * - Continuous microphone listening via system commands
 * - Streaming TTS response playback
 * - Multi-provider support (OpenAI, ElevenLabs)
 * - Graceful degradation when APIs unavailable
 * 
 * Architecture:
 * - VoiceService wraps VoiceSkills for provider abstraction
 * - Uses system audio recording tools (sox/ffmpeg) for mic input
 * - Wake word detected via streaming STT on short audio chunks
 * - Full utterance captured after wake word, processed through agent loop
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { writeFile, unlink } from 'fs/promises';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceServiceConfig {
    wakeWords?: string[];          // Default: ["hey jarvis", "jarvis"]
    sttProvider?: 'openai' | 'local'; // Default: openai
    ttsProvider?: 'openai' | 'elevenlabs'; // Default: openai
    ttsVoice?: string;             // Default: "alloy" (OpenAI) or voice ID (ElevenLabs)
    listenDurationMs?: number;     // Wake word check interval (default: 3000ms)
    silenceThresholdMs?: number;   // How long silence = end of utterance (default: 2000ms)
}

export type VoiceServiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceEvent {
    type: 'wake_word' | 'transcription' | 'state_change' | 'error' | 'tts_complete';
    data: unknown;
    timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wake Word Patterns
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WAKE_WORDS = ['hey jarvis', 'jarvis', 'hey j.a.r.v.i.s'];

// ═══════════════════════════════════════════════════════════════════════════════
// Voice Service
// ═══════════════════════════════════════════════════════════════════════════════

export class VoiceService extends EventEmitter {
    private config: Required<VoiceServiceConfig>;
    private state: VoiceServiceState = 'idle';
    private isRunning = false;
    private listenTimer: NodeJS.Timeout | null = null;

    constructor(config?: VoiceServiceConfig) {
        super();
        this.config = {
            wakeWords: config?.wakeWords ?? DEFAULT_WAKE_WORDS,
            sttProvider: config?.sttProvider ?? 'openai',
            ttsProvider: config?.ttsProvider ?? (process.env['ELEVENLABS_API_KEY'] ? 'elevenlabs' : 'openai'),
            ttsVoice: config?.ttsVoice ?? 'alloy',
            listenDurationMs: config?.listenDurationMs ?? 3000,
            silenceThresholdMs: config?.silenceThresholdMs ?? 2000,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the voice service in background mode.
     * Continuously listens for wake words.
     */
    async start(): Promise<boolean> {
        if (this.isRunning) {
            logger.warn('[VOICE] Service already running');
            return false;
        }

        // Check prerequisites
        const apiKey = this.getSTTApiKey();
        if (!apiKey) {
            logger.warn('[VOICE] No STT API key available, voice service disabled');
            this.setState('error');
            return false;
        }

        const hasAudioTool = await this.checkAudioToolAvailable();
        if (!hasAudioTool) {
            logger.warn('[VOICE] No audio recording tool found (sox/rec/ffmpeg), voice service disabled');
            this.setState('error');
            return false;
        }

        this.isRunning = true;
        this.setState('listening');

        logger.info('[VOICE] Service started', {
            sttProvider: this.config.sttProvider,
            ttsProvider: this.config.ttsProvider,
            wakeWords: this.config.wakeWords,
        });

        // Start listening loop
        this.startListenLoop();
        return true;
    }

    /**
     * Stop the voice service
     */
    stop(): void {
        this.isRunning = false;
        if (this.listenTimer) {
            clearTimeout(this.listenTimer);
            this.listenTimer = null;
        }
        this.setState('idle');
        logger.info('[VOICE] Service stopped');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Wake Word Detection
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Main listening loop — records short audio chunks and checks for wake words
     */
    private startListenLoop(): void {
        if (!this.isRunning) return;

        this.listenTimer = setTimeout(async () => {
            if (!this.isRunning || this.state !== 'listening') {
                this.startListenLoop();
                return;
            }

            try {
                // Record a short audio chunk
                const audioPath = await this.recordChunk(this.config.listenDurationMs);
                if (!audioPath) {
                    this.startListenLoop();
                    return;
                }

                // Transcribe the chunk
                const transcript = await this.transcribe(audioPath);

                // Clean up temp file
                unlink(audioPath).catch(() => {});

                if (!transcript) {
                    this.startListenLoop();
                    return;
                }

                // Check for wake word
                const detected = this.detectWakeWord(transcript);
                if (detected) {
                    logger.info('[VOICE] Wake word detected!', { transcript });

                    // Extract the command after the wake word
                    const command = this.extractCommandAfterWakeWord(transcript);

                    this.emit('voice_event', {
                        type: 'wake_word',
                        data: { transcript, command },
                        timestamp: new Date(),
                    } as VoiceEvent);

                    if (command) {
                        // If there's a command in the same chunk, process it immediately
                        this.emit('voice_event', {
                            type: 'transcription',
                            data: { text: command },
                            timestamp: new Date(),
                        } as VoiceEvent);
                    } else {
                        // Record a longer chunk for the full command
                        this.setState('processing');
                        const fullAudioPath = await this.recordChunk(5000);
                        if (fullAudioPath) {
                            const fullTranscript = await this.transcribe(fullAudioPath);
                            unlink(fullAudioPath).catch(() => {});

                            if (fullTranscript) {
                                this.emit('voice_event', {
                                    type: 'transcription',
                                    data: { text: fullTranscript },
                                    timestamp: new Date(),
                                } as VoiceEvent);
                            }
                        }
                        this.setState('listening');
                    }
                }
            } catch (err) {
                logger.warn('[VOICE] Listen loop error', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }

            this.startListenLoop();
        }, 500); // Small delay between chunks
    }

    /**
     * Check if transcript contains a wake word
     */
    private detectWakeWord(transcript: string): boolean {
        const lower = transcript.toLowerCase().trim();
        return this.config.wakeWords.some(ww => lower.includes(ww));
    }

    /**
     * Extract the user's command from a transcript that contains a wake word
     */
    private extractCommandAfterWakeWord(transcript: string): string | null {
        const lower = transcript.toLowerCase();

        for (const ww of this.config.wakeWords) {
            const index = lower.indexOf(ww);
            if (index !== -1) {
                const afterWakeWord = transcript.slice(index + ww.length).trim();
                if (afterWakeWord.length > 2) {
                    return afterWakeWord;
                }
            }
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Audio Recording
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record audio from microphone for specified duration.
     * Uses sox (rec) on Unix/macOS or ffmpeg on Windows.
     */
    private recordChunk(durationMs: number): Promise<string | null> {
        return new Promise((resolve) => {
            const outputPath = join(tmpdir(), `jarvis_mic_${randomUUID()}.wav`);
            const durationSec = (durationMs / 1000).toFixed(1);

            // Try sox first, then ffmpeg
            const isWindows = process.platform === 'win32';
            const command = isWindows
                ? `ffmpeg -f dshow -i audio="Microphone" -t ${durationSec} -y "${outputPath}" 2>nul`
                : `rec -q "${outputPath}" trim 0 ${durationSec} 2>/dev/null`;

            exec(command, { timeout: durationMs + 5000 }, (error) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(outputPath);
                }
            });
        });
    }

    /**
     * Check if an audio recording tool is available
     */
    private checkAudioToolAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            const command = isWindows ? 'where ffmpeg' : 'which rec || which ffmpeg';

            exec(command, (error) => {
                resolve(!error);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Speech-to-Text
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Transcribe an audio file using the configured STT provider
     */
    private async transcribe(audioPath: string): Promise<string | null> {
        const apiKey = this.getSTTApiKey();
        if (!apiKey) return null;

        try {
            const { readFile } = await import('fs/promises');
            const fileBuffer = await readFile(audioPath);

            const boundary = `----JARVISVoice${Date.now()}`;
            const preData = `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
                `Content-Type: audio/wav\r\n\r\n`;
            const postData = `\r\n--${boundary}\r\n` +
                `Content-Disposition: form-data; name="model"\r\n\r\n` +
                `whisper-1\r\n--${boundary}--\r\n`;

            const body = Buffer.concat([
                Buffer.from(preData, 'utf-8'),
                fileBuffer,
                Buffer.from(postData, 'utf-8'),
            ]);

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                body,
            });

            if (!response.ok) return null;

            const data = await response.json() as { text: string };
            return data.text?.trim() || null;
        } catch {
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Text-to-Speech
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Convert text to speech and play it.
     * Supports OpenAI TTS and ElevenLabs.
     */
    async speak(text: string): Promise<boolean> {
        this.setState('speaking');

        try {
            const audioPath = await this.generateSpeech(text);
            if (!audioPath) {
                this.setState('listening');
                return false;
            }

            await this.playAudio(audioPath);
            unlink(audioPath).catch(() => {});

            this.emit('voice_event', {
                type: 'tts_complete',
                data: { text },
                timestamp: new Date(),
            } as VoiceEvent);

            this.setState('listening');
            return true;
        } catch (err) {
            logger.warn('[VOICE] TTS failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            this.setState('listening');
            return false;
        }
    }

    /**
     * Generate speech audio file from text
     */
    private async generateSpeech(text: string): Promise<string | null> {
        const outputPath = join(tmpdir(), `jarvis_tts_${randomUUID()}.mp3`);

        if (this.config.ttsProvider === 'elevenlabs') {
            return this.generateElevenLabsSpeech(text, outputPath);
        }

        return this.generateOpenAISpeech(text, outputPath);
    }

    private async generateOpenAISpeech(text: string, outputPath: string): Promise<string | null> {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) return null;

        try {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: this.config.ttsVoice,
                }),
            });

            if (!response.ok) return null;

            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(outputPath, buffer);
            return outputPath;
        } catch {
            return null;
        }
    }

    private async generateElevenLabsSpeech(text: string, outputPath: string): Promise<string | null> {
        const apiKey = process.env['ELEVENLABS_API_KEY'];
        if (!apiKey) return null;

        const voiceId = this.config.ttsVoice || 'EXAVITQu4vr4xnSDxMaL'; // Default: "Bella"

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) return null;

            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(outputPath, buffer);
            return outputPath;
        } catch {
            return null;
        }
    }

    /**
     * Play an audio file using system command
     */
    private playAudio(audioPath: string): Promise<void> {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            const isMac = process.platform === 'darwin';

            let command: string;
            if (isWindows) {
                command = `powershell -c "(New-Object Media.SoundPlayer '${audioPath}').PlaySync()"`;
            } else if (isMac) {
                command = `afplay "${audioPath}"`;
            } else {
                command = `aplay "${audioPath}" 2>/dev/null || mpv --no-terminal "${audioPath}" 2>/dev/null`;
            }

            exec(command, { timeout: 60000 }, () => resolve());
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private getSTTApiKey(): string | undefined {
        return process.env['OPENAI_API_KEY'];
    }

    private setState(state: VoiceServiceState): void {
        const prev = this.state;
        this.state = state;

        if (prev !== state) {
            this.emit('voice_event', {
                type: 'state_change',
                data: { from: prev, to: state },
                timestamp: new Date(),
            } as VoiceEvent);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────────

    getState(): VoiceServiceState { return this.state; }
    get running(): boolean { return this.isRunning; }

    getStatus(): { state: VoiceServiceState; sttProvider: string; ttsProvider: string; wakeWords: string[] } {
        return {
            state: this.state,
            sttProvider: this.config.sttProvider,
            ttsProvider: this.config.ttsProvider,
            wakeWords: this.config.wakeWords,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: VoiceService | null = null;

export function getVoiceService(config?: VoiceServiceConfig): VoiceService {
    if (!instance) {
        instance = new VoiceService(config);
    }
    return instance;
}

export function resetVoiceService(): void {
    if (instance) {
        instance.stop();
    }
    instance = null;
}
