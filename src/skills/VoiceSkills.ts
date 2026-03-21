/**
 * JARVIS Voice Skills
 *
 * Provides Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities.
 * Relies on OpenAI's audio APIs (tts-1 and whisper-1) via native fetch
 * to avoid heavy local dependencies, but falls back gracefully if keys are missing.
 */

import { readFile, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { MultiToolSkill } from './Skill.js';
import { logger } from '../utils/logger.js';

export class VoiceSkills extends MultiToolSkill {
    constructor() {
        super({
            name: 'voice',
            description: 'Speech-to-text transcription and text-to-speech synthesis',
            version: '1.0.0',
            category: 'system',
        });
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'transcribe_audio',
                description: 'Transcribe an audio file to text. Useful for processing voice memos or dictation.',
                parameters: {
                    type: 'object',
                    properties: {
                        audioPath: {
                            type: 'string',
                            description: 'Absolute path to the audio file (mp3, wav, m4a, etc.)',
                        },
                    },
                    required: ['audioPath'],
                },
            },
            {
                name: 'speak_text',
                description: 'Convert text to speech and save it as an audio file. Returns the path to the generated audio.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The text to speak',
                        },
                        voice: {
                            type: 'string',
                            description: 'Voice to use (alloy, echo, fable, onyx, nova, shimmer). Default: alloy',
                            enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                        },
                        outputPath: {
                            type: 'string',
                            description: 'Optional path to save the audio. If not provided, a temporary file is used.',
                        },
                    },
                    required: ['text'],
                },
            },
        ];
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        switch (toolName) {
            case 'transcribe_audio':
                return this.transcribeAudio(args);
            case 'speak_text':
                return this.speakText(args);
            default:
                return this.createResult(`Unknown voice tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Speech-to-Text (Transcribe)
    // ─────────────────────────────────────────────────────────────────────────────

    private async transcribeAudio(args: Record<string, unknown>): Promise<ToolResult> {
        const audioPath = args['audioPath'] as string;
        if (!audioPath) {
            return this.createResult('Missing required argument: audioPath', true);
        }

        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            return this.createResult('OPENAI_API_KEY is required for voice transcription', true);
        }

        try {
            logger.tool('transcribe_audio', 'Transcribing file', { path: audioPath });
            
            const fileBuffer = await readFile(audioPath);
            const ext = extname(audioPath).replace('.', '') || 'mp3';
            const filename = `audio.${ext}`;

            // Create a multipart/form-data body manually for fetch
            const boundary = `----JARVISBoundary${randomUUID().replace(/-/g, '')}`;
            
            const preData = `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
                `Content-Type: audio/${ext}\r\n\r\n`;
            
            const postData = `\r\n--${boundary}\r\n` +
                `Content-Disposition: form-data; name="model"\r\n\r\n` +
                `whisper-1\r\n` +
                `--${boundary}--\r\n`;

            const bodyParts = [
                Buffer.from(preData, 'utf-8'),
                fileBuffer,
                Buffer.from(postData, 'utf-8')
            ];

            const body = Buffer.concat(bodyParts);

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                body,
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI Whisper API error: ${response.status} ${err}`);
            }

            const data = await response.json() as { text: string };
            logger.tool('transcribe_audio', 'Transcription complete');

            return this.createResult({ transcription: data.text });
        } catch (err) {
            return this.createResult(
                `Transcription failed: ${err instanceof Error ? err.message : String(err)}`, 
                true
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Text-to-Speech (Speak)
    // ─────────────────────────────────────────────────────────────────────────────

    private async speakText(args: Record<string, unknown>): Promise<ToolResult> {
        const text = args['text'] as string;
        const voice = (args['voice'] as string) || 'alloy';
        const outputPath = (args['outputPath'] as string) || join(tmpdir(), `jarvis_speech_${randomUUID()}.mp3`);

        if (!text) {
            return this.createResult('Missing required argument: text', true);
        }

        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            return this.createResult('OPENAI_API_KEY is required for text-to-speech', true);
        }

        try {
            logger.tool('speak_text', 'Generating speech', { voice });

            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice,
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI TTS API error: ${response.status} ${err}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            await writeFile(outputPath, buffer);
            logger.tool('speak_text', 'Audio generated and saved', { path: outputPath });

            return this.createResult({ 
                audioPath: outputPath,
                message: 'Audio generated and saved successfully',
            });
        } catch (err) {
            return this.createResult(
                `Text-to-speech failed: ${err instanceof Error ? err.message : String(err)}`, 
                true
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let voiceSkills: VoiceSkills | null = null;

export function getVoiceSkills(): VoiceSkills {
    if (!voiceSkills) {
        voiceSkills = new VoiceSkills();
    }
    return voiceSkills;
}

export function resetVoiceSkills(): void {
    voiceSkills = null;
}
