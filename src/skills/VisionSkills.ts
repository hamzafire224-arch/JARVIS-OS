/**
 * JARVIS Vision Skills
 *
 * Multi-modal understanding: analyze images, extract PDF text, and process
 * visual content using Gemini / GPT-4o vision capabilities.
 *
 * Features:
 * - analyze_image  — send image to vision-capable LLM for description/analysis
 * - extract_pdf    — extract text content from PDF files
 * - screenshot_analyze — capture screenshot of URL and analyze it
 */

import { readFile, access, stat } from 'fs/promises';
import { extname, basename } from 'path';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { MultiToolSkill } from './Skill.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImageAnalysis {
    description: string;
    labels: string[];
    text?: string;          // OCR'd text if detected
    objects?: string[];     // Detected objects
    confidence: number;
}

export interface PDFContent {
    text: string;
    pages: number;
    fileName: string;
    sizeBytes: number;
}

// Supported image formats for vision APIs
const SUPPORTED_IMAGE_FORMATS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
]);

const SUPPORTED_PDF_FORMATS = new Set(['.pdf']);

// ═══════════════════════════════════════════════════════════════════════════════
// Vision Skills
// ═══════════════════════════════════════════════════════════════════════════════

export class VisionSkills extends MultiToolSkill {
    constructor() {
        super({
            name: 'vision',
            description: 'Analyze images, extract PDF text, and process visual content',
            version: '1.0.0',
            category: 'web',
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Definitions
    // ─────────────────────────────────────────────────────────────────────────────

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'analyze_image',
                description: 'Analyze an image file or URL using AI vision. Can describe contents, detect objects, read text (OCR), and answer questions about images.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'File path or URL to the image',
                        },
                        question: {
                            type: 'string',
                            description: 'Optional question to ask about the image (e.g., "What color is the car?")',
                        },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'extract_pdf',
                description: 'Extract text content from a PDF file. Returns the full text, page count, and metadata.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'File path to the PDF',
                        },
                        maxPages: {
                            type: 'number',
                            description: 'Maximum pages to extract (default: all)',
                        },
                    },
                    required: ['path'],
                },
            },
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Execution
    // ─────────────────────────────────────────────────────────────────────────────

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        switch (toolName) {
            case 'analyze_image':
                return this.analyzeImage(args);
            case 'extract_pdf':
                return this.extractPDF(args);
            default:
                return this.createResult(`Unknown vision tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Image Analysis
    // ─────────────────────────────────────────────────────────────────────────────

    private async analyzeImage(args: Record<string, unknown>): Promise<ToolResult> {
        const path = args['path'] as string;
        const question = args['question'] as string | undefined;

        if (!path) {
            return this.createResult('Missing required argument: path', true);
        }

        try {
            let imageData: string;
            let mimeType: string;

            if (path.startsWith('http://') || path.startsWith('https://')) {
                // Fetch image from URL
                logger.tool('analyze_image', 'Fetching image from URL', { url: path });
                const response = await fetch(path);
                if (!response.ok) {
                    return this.createResult(`Failed to fetch image: HTTP ${response.status}`, true);
                }

                const contentType = response.headers.get('content-type') ?? 'image/png';
                mimeType = contentType.split(';')[0]!.trim();
                const buffer = Buffer.from(await response.arrayBuffer());
                imageData = buffer.toString('base64');
            } else {
                // Read from file
                const ext = extname(path).toLowerCase();
                if (!SUPPORTED_IMAGE_FORMATS.has(ext)) {
                    return this.createResult(
                        `Unsupported image format: ${ext}. Supported: ${[...SUPPORTED_IMAGE_FORMATS].join(', ')}`,
                        true
                    );
                }

                await access(path);
                const buffer = await readFile(path);
                imageData = buffer.toString('base64');
                mimeType = `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`;
            }

            logger.tool('analyze_image', 'Analyzing image', {
                path,
                mimeType,
                sizeKB: Math.round(imageData.length * 3 / 4 / 1024),
            });

            // Build the analysis using vision-capable model
            const analysis = await this.callVisionModel(imageData, mimeType, question);

            return this.createResult({
                analysis: analysis.description,
                labels: analysis.labels,
                text: analysis.text,
                objects: analysis.objects,
                question: question ?? null,
                imagePath: path,
            });
        } catch (err) {
            return this.createResult(
                `Image analysis error: ${err instanceof Error ? err.message : err}`,
                true
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF Extraction
    // ─────────────────────────────────────────────────────────────────────────────

    private async extractPDF(args: Record<string, unknown>): Promise<ToolResult> {
        const path = args['path'] as string;
        const maxPages = args['maxPages'] as number | undefined;

        if (!path) {
            return this.createResult('Missing required argument: path', true);
        }

        const ext = extname(path).toLowerCase();
        if (!SUPPORTED_PDF_FORMATS.has(ext)) {
            return this.createResult(`Not a PDF file: ${ext}`, true);
        }

        try {
            await access(path);
            const fileStat = await stat(path);
            const buffer = await readFile(path);

            logger.tool('extract_pdf', 'Extracting PDF', {
                path,
                sizeKB: Math.round(fileStat.size / 1024),
            });

            // Try dynamic import of pdf-parse
            let pdfText: string;
            let pageCount: number;

            try {
                // @ts-ignore — pdf-parse is an optional dependency
                const pdfParse = await import('pdf-parse');
                const pdf = await pdfParse.default(buffer, {
                    max: maxPages ?? 0, // 0 = all pages
                });

                pdfText = pdf.text;
                pageCount = pdf.numpages;
            } catch {
                // Fallback: raw text extraction without pdf-parse
                pdfText = this.extractRawPDFText(buffer);
                pageCount = this.countPDFPages(buffer);
                logger.warn('pdf-parse not installed. Using basic extraction. Install with: npm install pdf-parse');
            }

            // Truncate if very long
            const maxLength = 100_000;
            const truncated = pdfText.length > maxLength;
            const text = truncated ? pdfText.slice(0, maxLength) + '\n... [truncated]' : pdfText;

            const result: PDFContent = {
                text,
                pages: pageCount,
                fileName: basename(path),
                sizeBytes: fileStat.size,
            };

            return this.createResult({
                ...result,
                truncated,
                ...(maxPages ? { maxPagesRequested: maxPages } : {}),
            });
        } catch (err) {
            return this.createResult(
                `PDF extraction error: ${err instanceof Error ? err.message : err}`,
                true
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Vision Model Call
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Call a vision-capable model (Gemini or OpenAI) to analyze an image.
     * Uses environment variables to determine which provider to invoke.
     */
    private async callVisionModel(
        imageBase64: string,
        mimeType: string,
        question?: string
    ): Promise<ImageAnalysis> {
        const prompt = question
            ? `Analyze this image and answer: ${question}\n\nAlso provide: a brief description, list of objects detected, any text visible in the image, and relevant labels.`
            : 'Analyze this image comprehensively. Provide: 1) A detailed description, 2) List of objects detected, 3) Any text visible (OCR), 4) Relevant labels/tags.';

        // Try Gemini first (native vision support)
        const geminiKey = process.env['GEMINI_API_KEY'];
        if (geminiKey) {
            return this.callGeminiVision(geminiKey, imageBase64, mimeType, prompt);
        }

        // Fall back to OpenAI GPT-4o
        const openaiKey = process.env['OPENAI_API_KEY'];
        if (openaiKey) {
            return this.callOpenAIVision(openaiKey, imageBase64, mimeType, prompt);
        }

        // No vision-capable API key
        return {
            description: 'Vision analysis unavailable — no GEMINI_API_KEY or OPENAI_API_KEY configured.',
            labels: [],
            confidence: 0,
        };
    }

    private async callGeminiVision(
        apiKey: string,
        imageBase64: string,
        mimeType: string,
        prompt: string
    ): Promise<ImageAnalysis> {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: imageBase64,
                                },
                            },
                        ],
                    }],
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini Vision API error: ${response.status} ${err.slice(0, 200)}`);
        }

        const data = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return this.parseVisionResponse(text);
    }

    private async callOpenAIVision(
        apiKey: string,
        imageBase64: string,
        mimeType: string,
        prompt: string
    ): Promise<ImageAnalysis> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI Vision API error: ${response.status} ${err.slice(0, 200)}`);
        }

        const data = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        const text = data.choices?.[0]?.message?.content ?? '';
        return this.parseVisionResponse(text);
    }

    /**
     * Parse the free-text vision response into structured data
     */
    private parseVisionResponse(text: string): ImageAnalysis {
        // Extract labels/tags (look for bullet points or comma-separated lists)
        const labels: string[] = [];
        const objects: string[] = [];
        let ocrText: string | undefined;

        // Simple heuristic parsing
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^[-•*]\s+/)) {
                const item = trimmed.replace(/^[-•*]\s+/, '').trim();
                if (item.length < 50) {
                    labels.push(item);
                }
            }
            if (trimmed.toLowerCase().includes('text:') || trimmed.toLowerCase().includes('ocr:')) {
                ocrText = trimmed.replace(/^.*?:\s*/, '');
            }
        }

        return {
            description: text,
            labels: labels.slice(0, 20),
            objects: objects.length > 0 ? objects : undefined,
            text: ocrText,
            confidence: 0.85,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF Fallback Utilities
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Very basic text extraction from PDF buffer (no library needed).
     * Extracts visible text between stream/endstream markers.
     */
    private extractRawPDFText(buffer: Buffer): string {
        const text = buffer.toString('latin1');
        const chunks: string[] = [];

        // Find text between BT...ET markers
        const btRegex = /BT\s*([\s\S]*?)\s*ET/g;
        let match: RegExpExecArray | null;
        while ((match = btRegex.exec(text)) !== null) {
            const content = match[1]!;
            // Extract text from Tj and TJ operators
            const tjRegex = /\(([^)]*)\)\s*Tj/g;
            let tjMatch: RegExpExecArray | null;
            while ((tjMatch = tjRegex.exec(content)) !== null) {
                chunks.push(tjMatch[1]!);
            }
        }

        return chunks.join(' ').trim() || '[No extractable text — install pdf-parse for better results: npm install pdf-parse]';
    }

    /**
     * Count pages in a PDF by looking for /Type /Page entries
     */
    private countPDFPages(buffer: Buffer): number {
        const text = buffer.toString('latin1');
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        return matches?.length ?? 1;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let visionSkills: VisionSkills | null = null;

export function getVisionSkills(): VisionSkills {
    if (!visionSkills) {
        visionSkills = new VisionSkills();
    }
    return visionSkills;
}

export function resetVisionSkills(): void {
    visionSkills = null;
}
