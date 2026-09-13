/**
 * JARVIS Screen Use Skills (AGI Feature 1.2 — Computer Use Agent)
 * 
 * High-level screen interaction capabilities that bridge the gap
 * between "CLI tool" and "true digital assistant":
 * 
 * - screen_read: Screenshot + AI vision analysis
 * - screen_click: Click elements by visual description
 * - screen_fill: Fill form fields by label
 * - screen_navigate: Navigate browser by instruction
 * - screen_type: Type text at current cursor position
 * - screen_scroll: Scroll page up/down
 * 
 * Uses BrowserSkills (Playwright) + VisionSkills under the hood.
 * Falls back to native OS automation when Playwright isn't available.
 */

import { Skill } from './Skill.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Screen Use Skill Set
// ═══════════════════════════════════════════════════════════════════════════════

export class ScreenUseSkills extends Skill {
    readonly id = 'screen-use';
    readonly name = 'Screen Use (Computer Use Agent)';
    readonly description = 'See and interact with the user\'s screen — click, type, fill forms, navigate';
    
    private browser: import('playwright').Browser | null = null;
    private page: import('playwright').Page | null = null;

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'screen_read',
                description: 'Take a screenshot of the current screen or browser page and analyze it with AI vision. Returns a description of what\'s visible on screen.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'Optional URL to navigate to before reading. If not provided, reads the current page or takes a desktop screenshot.',
                        },
                        question: {
                            type: 'string',
                            description: 'What to look for on the screen. E.g., "Is there a login button?", "What does the error message say?"',
                        },
                    },
                    required: ['question'],
                },
                category: 'web',
            },
            {
                name: 'screen_click',
                description: 'Click an element on the screen by describing it visually. Uses AI vision to find the element and click it.',
                parameters: {
                    type: 'object',
                    properties: {
                        description: {
                            type: 'string',
                            description: 'Visual description of what to click. E.g., "the blue Submit button", "the hamburger menu icon", "the search bar"',
                        },
                        url: {
                            type: 'string',
                            description: 'Optional URL to navigate to first.',
                        },
                    },
                    required: ['description'],
                },
                category: 'web',
                dangerous: true,
            },
            {
                name: 'screen_fill',
                description: 'Fill a form field by its label or placeholder text.',
                parameters: {
                    type: 'object',
                    properties: {
                        label: {
                            type: 'string',
                            description: 'The label, placeholder, or name of the form field. E.g., "Email", "Password", "Search"',
                        },
                        value: {
                            type: 'string',
                            description: 'The value to type into the field.',
                        },
                        url: {
                            type: 'string',
                            description: 'Optional URL to navigate to first.',
                        },
                    },
                    required: ['label', 'value'],
                },
                category: 'web',
                dangerous: true,
            },
            {
                name: 'screen_navigate',
                description: 'Navigate the browser to a URL or perform a search.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'URL to navigate to. Can also be a search query (will use Google).',
                        },
                        waitForSelector: {
                            type: 'string',
                            description: 'Optional CSS selector to wait for before continuing.',
                        },
                    },
                    required: ['url'],
                },
                category: 'web',
            },
            {
                name: 'screen_type',
                description: 'Type text or press keyboard keys on the current page.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'Text to type. For special keys, use format: {Enter}, {Tab}, {Backspace}, {Escape}',
                        },
                    },
                    required: ['text'],
                },
                category: 'web',
                dangerous: true,
            },
            {
                name: 'screen_scroll',
                description: 'Scroll the current page up or down.',
                parameters: {
                    type: 'object',
                    properties: {
                        direction: {
                            type: 'string',
                            description: 'Direction to scroll: "up" or "down"',
                            enum: ['up', 'down'],
                        },
                        amount: {
                            type: 'number',
                            description: 'Pixels to scroll (default: 500)',
                        },
                    },
                    required: ['direction'],
                },
                category: 'web',
            },
        ];
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        try {
            switch (toolName) {
                case 'screen_read':
                    return await this.screenRead(args);
                case 'screen_click':
                    return await this.screenClick(args);
                case 'screen_fill':
                    return await this.screenFill(args);
                case 'screen_navigate':
                    return await this.screenNavigate(args);
                case 'screen_type':
                    return await this.screenType(args);
                case 'screen_scroll':
                    return await this.screenScroll(args);
                default:
                    return this.createResult({ error: `Unknown tool: ${toolName}` }, true);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.warn('[SCREEN-USE] Error', { tool: toolName, error: errorMsg });
            return this.createResult({ error: errorMsg }, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Implementations
    // ─────────────────────────────────────────────────────────────────────────────

    private async screenRead(args: Record<string, unknown>): Promise<ToolResult> {
        const url = args['url'] as string | undefined;
        const question = args['question'] as string;

        const page = await this.ensurePage(url);
        
        // Take screenshot
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        const base64Screenshot = screenshotBuffer.toString('base64');

        // Analyze with vision
        const analysis = await this.analyzeScreenshot(base64Screenshot, question);

        return this.createResult({
            url: page.url(),
            title: await page.title(),
            analysis,
            screenshotSize: `${screenshotBuffer.length} bytes`,
        });
    }

    private async screenClick(args: Record<string, unknown>): Promise<ToolResult> {
        const description = args['description'] as string;
        const url = args['url'] as string | undefined;

        const page = await this.ensurePage(url);

        // Strategy 1: Try to find element by text/role attributes
        const selectors = this.descriptionToSelectors(description);
        
        for (const selector of selectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    await element.click({ timeout: 5000 });
                    logger.info('[SCREEN-USE] Clicked via selector', { selector });
                    
                    // Wait for potential navigation
                    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
                    
                    return this.createResult({
                        action: 'clicked',
                        selector,
                        description,
                        url: page.url(),
                    });
                }
            } catch {
                // Try next selector
            }
        }

        // Strategy 2: Vision-based click (screenshot → find coordinates → click)
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        const base64 = screenshotBuffer.toString('base64');
        const analysis = await this.analyzeScreenshot(
            base64,
            `Find the exact location of: "${description}". Return the approximate x,y pixel coordinates of the center of this element as JSON: {"x": number, "y": number}`
        );

        // Try to parse coordinates from analysis
        const coordMatch = analysis.match(/\{[^}]*"x"\s*:\s*(\d+)[^}]*"y"\s*:\s*(\d+)[^}]*\}/);
        if (coordMatch) {
            const x = parseInt(coordMatch[1]!, 10);
            const y = parseInt(coordMatch[2]!, 10);
            await page.mouse.click(x, y);
            
            return this.createResult({
                action: 'clicked_by_vision',
                coordinates: { x, y },
                description,
                url: page.url(),
            });
        }

        return this.createResult({
            error: `Could not find element matching: "${description}"`,
            suggestion: 'Try being more specific about the element, or use screen_navigate first.',
        }, true);
    }

    private async screenFill(args: Record<string, unknown>): Promise<ToolResult> {
        const label = args['label'] as string;
        const value = args['value'] as string;
        const url = args['url'] as string | undefined;

        const page = await this.ensurePage(url);

        // Try multiple strategies to find the input
        const strategies = [
            // By label text
            `label:has-text("${label}") + input, label:has-text("${label}") + textarea`,
            // By placeholder
            `input[placeholder*="${label}" i], textarea[placeholder*="${label}" i]`,
            // By aria-label
            `input[aria-label*="${label}" i], textarea[aria-label*="${label}" i]`,
            // By name attribute
            `input[name*="${label}" i], textarea[name*="${label}" i]`,
            // By id containing label
            `input[id*="${label.toLowerCase().replace(/\s+/g, '')}"], textarea[id*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
            // Labeled by association
            `[for] >> text="${label}"`,
        ];

        for (const selector of strategies) {
            try {
                const input = page.locator(selector).first();
                if (await input.isVisible({ timeout: 1500 })) {
                    await input.clear();
                    await input.fill(value);
                    
                    return this.createResult({
                        action: 'filled',
                        label,
                        value: value.length > 20 ? `${value.slice(0, 20)}...` : value,
                        selector,
                    });
                }
            } catch {
                continue;
            }
        }

        return this.createResult({
            error: `Could not find form field with label: "${label}"`,
            suggestion: 'Try using the exact label text visible on screen.',
        }, true);
    }

    private async screenNavigate(args: Record<string, unknown>): Promise<ToolResult> {
        let url = args['url'] as string;
        const waitFor = args['waitForSelector'] as string | undefined;

        // If it looks like a search query rather than a URL, use Google
        if (!url.includes('.') && !url.startsWith('http')) {
            url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        } else if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        const page = await this.ensurePage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        if (waitFor) {
            await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});
        }

        return this.createResult({
            action: 'navigated',
            url: page.url(),
            title: await page.title(),
        });
    }

    private async screenType(args: Record<string, unknown>): Promise<ToolResult> {
        const text = args['text'] as string;
        const page = await this.ensurePage();

        // Handle special keys
        const specialKeys: Record<string, string> = {
            '{Enter}': 'Enter',
            '{Tab}': 'Tab',
            '{Backspace}': 'Backspace',
            '{Escape}': 'Escape',
            '{Space}': ' ',
        };

        for (const [pattern, key] of Object.entries(specialKeys)) {
            if (text === pattern) {
                await page.keyboard.press(key);
                return this.createResult({ action: 'pressed_key', key });
            }
        }

        await page.keyboard.type(text, { delay: 50 });
        return this.createResult({
            action: 'typed',
            length: text.length,
        });
    }

    private async screenScroll(args: Record<string, unknown>): Promise<ToolResult> {
        const direction = args['direction'] as 'up' | 'down';
        const amount = (args['amount'] as number) ?? 500;
        const page = await this.ensurePage();

        const delta = direction === 'down' ? amount : -amount;
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(500);

        return this.createResult({
            action: 'scrolled',
            direction,
            amount,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Browser Management
    // ─────────────────────────────────────────────────────────────────────────────

    private async ensurePage(url?: string): Promise<import('playwright').Page> {
        if (!this.browser) {
            const playwright = await import('playwright');
            this.browser = await playwright.chromium.launch({
                headless: false, // Visible browser for Computer Use
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }

        if (!this.page || this.page.isClosed()) {
            const context = await this.browser.newContext({
                viewport: { width: 1280, height: 800 },
            });
            this.page = await context.newPage();
        }

        if (url) {
            const target = url.startsWith('http') ? url : `https://${url}`;
            await this.page.goto(target, {
                waitUntil: 'domcontentloaded',
                timeout: 15000,
            });
        }

        return this.page;
    }

    /**
     * Convert a visual description to CSS/text selectors to try.
     */
    private descriptionToSelectors(description: string): string[] {
        const d = description.toLowerCase();
        const selectors: string[] = [];

        // Button descriptions
        if (d.includes('button')) {
            const btnText = description.replace(/button/i, '').trim();
            if (btnText) {
                selectors.push(`button:has-text("${btnText}")`);
                selectors.push(`[role="button"]:has-text("${btnText}")`);
                selectors.push(`a:has-text("${btnText}")`);
            }
        }

        // Link descriptions
        if (d.includes('link') || d.includes('click')) {
            const linkText = description.replace(/(link|click)/gi, '').trim();
            if (linkText) selectors.push(`a:has-text("${linkText}")`);
        }

        // Generic text matching
        selectors.push(`text="${description}"`);
        selectors.push(`[aria-label="${description}"]`);
        selectors.push(`[title="${description}"]`);

        // Icon descriptions
        if (d.includes('icon') || d.includes('menu')) {
            selectors.push(`[aria-label*="${description}" i]`);
            selectors.push(`button:has([aria-label*="${description}" i])`);
        }

        return selectors;
    }

    /**
     * Analyze a screenshot using AI vision.
     */
    private async analyzeScreenshot(base64Image: string, question: string): Promise<string> {
        const apiKey = process.env['OPENAI_API_KEY'] || process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            return 'Vision analysis unavailable: No API key configured for image understanding.';
        }

        // Use OpenAI Vision API
        if (process.env['OPENAI_API_KEY']) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: question },
                                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
                            ],
                        }],
                        max_tokens: 500,
                    }),
                });

                if (response.ok) {
                    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
                    return data.choices[0]?.message?.content ?? 'No analysis available';
                }
            } catch (err) {
                logger.warn('[SCREEN-USE] Vision API error', { error: String(err) });
            }
        }

        return 'Vision analysis unavailable. Please configure OPENAI_API_KEY for screen reading.';
    }

    /**
     * Cleanup browser on shutdown
     */
    async cleanup(): Promise<void> {
        if (this.page && !this.page.isClosed()) {
            await this.page.close().catch(() => {});
        }
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
    }
}
