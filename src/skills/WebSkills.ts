/**
 * JARVIS Web Skills
 * 
 * Skills for web interactions:
 * - HTTP requests and content fetching
 * - Web page reading and extraction
 * - Basic web search (mock - real implementation needs API keys)
 */

import { Skill, type SkillExecutionContext } from './Skill.js';
import type { ToolDefinition } from '../agent/types.js';
import { ToolExecutionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Fetch Skill
// ═══════════════════════════════════════════════════════════════════════════════

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    url: string;
    redirected: boolean;
}

export class HttpFetchSkill extends Skill {
    readonly name = 'http_fetch';
    readonly category = 'web' as const;
    readonly description = 'Make an HTTP request to a URL';
    readonly version = '1.0.0';
    readonly dangerous = false;

    private readonly maxBodySize = 500000; // 500KB
    private readonly defaultTimeout = 30000; // 30 seconds

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL to fetch',
                    },
                    method: {
                        type: 'string',
                        description: 'HTTP method (default: GET)',
                        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
                    },
                    headers: {
                        type: 'object',
                        description: 'Additional headers to send',
                    },
                    body: {
                        type: 'string',
                        description: 'Request body (for POST, PUT, PATCH)',
                    },
                    timeout: {
                        type: 'number',
                        description: `Timeout in milliseconds (default: ${this.defaultTimeout})`,
                    },
                },
                required: ['url'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<HttpResponse> {
        this.validateArgs(args, ['url']);

        const url = args['url'] as string;
        const method = (args['method'] as string) ?? 'GET';
        const headers = (args['headers'] as Record<string, string>) ?? {};
        const body = args['body'] as string | undefined;
        const timeout = (args['timeout'] as number) ?? this.defaultTimeout;

        return this.safeExecute(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'User-Agent': 'JARVIS/1.0',
                        ...headers,
                    },
                    body: body,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                // Read body with size limit
                let responseBody = '';
                const reader = response.body?.getReader();

                if (reader) {
                    const decoder = new TextDecoder();
                    let totalSize = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        totalSize += value.length;
                        if (totalSize > this.maxBodySize) {
                            responseBody += decoder.decode(value, { stream: true });
                            responseBody += '\n... [response truncated]';
                            reader.cancel();
                            break;
                        }

                        responseBody += decoder.decode(value, { stream: true });
                    }
                }

                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                logger.tool(this.name, 'HTTP request complete', {
                    url,
                    method,
                    status: response.status,
                    bodyLength: responseBody.length,
                });

                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                    body: responseBody,
                    url: response.url,
                    redirected: response.redirected,
                };
            } catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new ToolExecutionError(this.name, `Request timed out after ${timeout}ms`);
                }
                throw error;
            }
        }, 'http_fetch');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Read Webpage Skill
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebpageContent {
    url: string;
    title?: string;
    text: string;
    links: Array<{ text: string; href: string }>;
    headings: string[];
    wordCount: number;
}

export class ReadWebpageSkill extends Skill {
    readonly name = 'read_webpage';
    readonly category = 'web' as const;
    readonly description = 'Read and extract content from a webpage';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL to read',
                    },
                    extractType: {
                        type: 'string',
                        description: 'Type of content to extract',
                        enum: ['text', 'links', 'headings', 'full'],
                    },
                    maxLength: {
                        type: 'number',
                        description: 'Maximum text length to return (default: 10000)',
                    },
                },
                required: ['url'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<WebpageContent> {
        this.validateArgs(args, ['url']);

        const url = args['url'] as string;
        const extractType = (args['extractType'] as string) ?? 'text';
        const maxLength = (args['maxLength'] as number) ?? 10000;

        return this.safeExecute(async () => {
            // Fetch the page
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'JARVIS/1.0 (Web Reader)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
            });

            if (!response.ok) {
                throw new ToolExecutionError(
                    this.name,
                    `Failed to fetch page: ${response.status} ${response.statusText}`
                );
            }

            const html = await response.text();

            // Extract content (simple regex-based extraction)
            const content = this.extractContent(html, extractType, maxLength);

            logger.tool(this.name, 'Webpage read', {
                url,
                extractType,
                wordCount: content.wordCount,
            });

            return {
                url,
                ...content,
            };
        }, 'read_webpage');
    }

    private extractContent(
        html: string,
        extractType: string,
        maxLength: number
    ): Omit<WebpageContent, 'url'> {
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim();

        // Remove script and style content
        let cleanHtml = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

        // Extract links
        const links: Array<{ text: string; href: string }> = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(cleanHtml)) !== null) {
            if (linkMatch[1] && linkMatch[2]) {
                links.push({
                    href: linkMatch[1],
                    text: linkMatch[2].trim(),
                });
            }
        }

        // Extract headings
        const headings: string[] = [];
        const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
        let headingMatch;
        while ((headingMatch = headingRegex.exec(cleanHtml)) !== null) {
            if (headingMatch[1]) {
                headings.push(headingMatch[1].trim());
            }
        }

        // Extract text content
        let text = cleanHtml
            .replace(/<[^>]+>/g, ' ') // Remove tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        // Truncate if needed
        if (text.length > maxLength) {
            text = text.slice(0, maxLength) + '... [truncated]';
        }

        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

        // Return based on extract type
        switch (extractType) {
            case 'links':
                return { title, text: '', links, headings: [], wordCount: 0 };
            case 'headings':
                return { title, text: '', links: [], headings, wordCount: 0 };
            case 'full':
                return { title, text, links, headings, wordCount };
            case 'text':
            default:
                return { title, text, links: [], headings: [], wordCount };
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Web Search Skill (Mock - Real implementation needs API)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export class WebSearchSkill extends Skill {
    readonly name = 'web_search';
    readonly category = 'web' as const;
    readonly description = 'Search the web for information (requires API configuration)';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query',
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results (default: 10)',
                    },
                    domain: {
                        type: 'string',
                        description: 'Limit search to a specific domain',
                    },
                },
                required: ['query'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        results: SearchResult[];
        query: string;
        totalResults: number;
        note: string;
    }> {
        this.validateArgs(args, ['query']);

        const query = args['query'] as string;
        const maxResults = (args['maxResults'] as number) ?? 10;
        const domain = args['domain'] as string | undefined;

        // Note: This is a mock implementation
        // Real implementation would use:
        // - Brave Search API
        // - Google Custom Search API
        // - SerpAPI
        // - Bing Web Search API

        logger.tool(this.name, 'Web search (mock)', { query, maxResults, domain });

        return {
            results: [],
            query,
            totalResults: 0,
            note: 'Web search requires API configuration. Set BRAVE_API_KEY or GOOGLE_SEARCH_API_KEY in .env to enable.',
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Download File Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class DownloadFileSkill extends Skill {
    readonly name = 'download_file';
    readonly category = 'web' as const;
    readonly description = 'Download a file from a URL';
    readonly version = '1.0.0';
    readonly dangerous = true; // Writing files requires approval

    private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL to download from',
                    },
                    path: {
                        type: 'string',
                        description: 'Local path to save the file',
                    },
                    overwrite: {
                        type: 'boolean',
                        description: 'Overwrite existing file (default: false)',
                    },
                },
                required: ['url', 'path'],
            },
            category: 'web',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        success: boolean;
        path: string;
        size: number;
        contentType?: string;
    }> {
        this.validateArgs(args, ['url', 'path']);

        const url = args['url'] as string;
        const path = args['path'] as string;
        const overwrite = args['overwrite'] === true;

        return this.safeExecute(async () => {
            const { writeFile, access, mkdir } = await import('fs/promises');
            const { dirname, resolve, join } = await import('path');
            const { constants } = await import('fs');

            const fullPath = path.startsWith('/') || path.match(/^[A-Z]:\\/i)
                ? path
                : join(context.workspaceDir ?? process.cwd(), path);

            // Check if file exists
            if (!overwrite) {
                try {
                    await access(fullPath, constants.F_OK);
                    throw new ToolExecutionError(this.name, 'File already exists. Set overwrite: true to replace.');
                } catch (e) {
                    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                        throw e;
                    }
                }
            }

            // Create directory if needed
            await mkdir(dirname(fullPath), { recursive: true });

            // Download file
            const response = await fetch(url, {
                headers: { 'User-Agent': 'JARVIS/1.0 (Downloader)' },
            });

            if (!response.ok) {
                throw new ToolExecutionError(
                    this.name,
                    `Download failed: ${response.status} ${response.statusText}`
                );
            }

            // Check content length
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > this.maxFileSize) {
                throw new ToolExecutionError(
                    this.name,
                    `File too large: ${contentLength} bytes (max: ${this.maxFileSize})`
                );
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(fullPath, buffer);

            logger.tool(this.name, 'File downloaded', {
                url,
                path: fullPath,
                size: buffer.length,
            });

            return {
                success: true,
                path: fullPath,
                size: buffer.length,
                contentType: response.headers.get('content-type') ?? undefined,
            };
        }, 'download_file');
    }
}
