/**
 * JARVIS Browser Automation Skills
 * 
 * Playwright-powered browser automation for web interactions.
 * Features:
 * - Page navigation and content extraction
 * - Form filling and clicking
 * - Screenshot capture
 * - PDF generation
 * - JavaScript execution
 * - Tab management
 * - Cookie and storage handling
 */

import { Skill, type SkillExecutionContext } from './Skill.js';
import type { ToolDefinition } from '../agent/types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BrowserSession {
    id: string;
    browser: import('playwright').Browser;
    context: import('playwright').BrowserContext;
    page: import('playwright').Page;
    createdAt: Date;
    lastActivity: Date;
}

// Lazy-loaded Playwright to avoid startup cost
let playwright: typeof import('playwright') | null = null;

async function getPlaywright(): Promise<typeof import('playwright')> {
    if (!playwright) {
        try {
            playwright = await import('playwright');
        } catch {
            throw new Error('Playwright is not installed. Run: npm install playwright');
        }
    }
    return playwright;
}

// Browser session storage
const sessions: Map<string, BrowserSession> = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Launch Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserLaunchSkill extends Skill {
    readonly name = 'browser_launch';
    readonly category = 'web' as const;
    readonly description = 'Launch a new browser instance for web automation';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    browserType: {
                        type: 'string',
                        description: 'Browser to use: chromium, firefox, or webkit',
                        enum: ['chromium', 'firefox', 'webkit'],
                    },
                    headless: {
                        type: 'boolean',
                        description: 'Run in headless mode (default: true)',
                    },
                    viewport: {
                        type: 'object',
                        description: 'Viewport size',
                        properties: {
                            width: { type: 'number', description: 'Viewport width in pixels' },
                            height: { type: 'number', description: 'Viewport height in pixels' },
                        },
                    },
                },
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ sessionId: string; browserType: string }> {
        const pw = await getPlaywright();

        const browserType = (args.browserType as string) ?? 'chromium';
        const headless = (args.headless as boolean) ?? true;
        const viewport = args.viewport as { width: number; height: number } | undefined;

        const browserLauncher = pw[browserType as 'chromium' | 'firefox' | 'webkit'];
        const browser = await browserLauncher.launch({ headless });

        const contextOptions: import('playwright').BrowserContextOptions = {
            viewport: viewport ?? { width: 1280, height: 720 },
        };

        const browserContext = await browser.newContext(contextOptions);
        const page = await browserContext.newPage();

        const sessionId = `browser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        sessions.set(sessionId, {
            id: sessionId,
            browser,
            context: browserContext,
            page,
            createdAt: new Date(),
            lastActivity: new Date(),
        });

        logger.tool(this.name, 'Browser launched', { sessionId, browserType, headless });

        return { sessionId, browserType };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Navigate Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserNavigateSkill extends Skill {
    readonly name = 'browser_navigate';
    readonly category = 'web' as const;
    readonly description = 'Navigate to a URL in the browser';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID from browser_launch',
                    },
                    url: {
                        type: 'string',
                        description: 'URL to navigate to',
                    },
                    waitUntil: {
                        type: 'string',
                        description: 'When to consider navigation complete',
                        enum: ['load', 'domcontentloaded', 'networkidle'],
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
    ): Promise<{ url: string; title: string; status: number | null }> {
        this.validateArgs(args, ['url']);

        const sessionId = args.sessionId as string | undefined;
        const url = args.url as string;
        const waitUntil = (args.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') ?? 'domcontentloaded';

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        const response = await page.goto(url, { waitUntil });
        session.lastActivity = new Date();

        logger.tool(this.name, 'Navigated', { sessionId: session.id, url });

        return {
            url: page.url(),
            title: await page.title(),
            status: response?.status() ?? null,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Content Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserContentSkill extends Skill {
    readonly name = 'browser_content';
    readonly category = 'web' as const;
    readonly description = 'Get page content (text, HTML, or specific elements)';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector to extract content from (optional, gets body text if omitted)',
                    },
                    format: {
                        type: 'string',
                        description: 'Output format',
                        enum: ['text', 'html', 'markdown'],
                    },
                },
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ content: string; url: string; title: string }> {
        const sessionId = args.sessionId as string | undefined;
        const selector = (args.selector as string) ?? 'body';
        const format = (args.format as 'text' | 'html' | 'markdown') ?? 'text';

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        let content: string;

        if (format === 'html') {
            content = await page.locator(selector).innerHTML();
        } else if (format === 'markdown') {
            // Basic HTML to markdown conversion
            const html = await page.locator(selector).innerHTML();
            content = this.htmlToMarkdown(html);
        } else {
            content = await page.locator(selector).innerText();
        }

        session.lastActivity = new Date();

        // Truncate very long content
        if (content.length > 50000) {
            content = content.slice(0, 50000) + '\n\n[Content truncated...]';
        }

        return {
            content,
            url: page.url(),
            title: await page.title(),
        };
    }

    private htmlToMarkdown(html: string): string {
        // Basic conversion
        return html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Click Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserClickSkill extends Skill {
    readonly name = 'browser_click';
    readonly category = 'web' as const;
    readonly description = 'Click on an element in the page';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector or text to click',
                    },
                    text: {
                        type: 'string',
                        description: 'Text content to find and click',
                    },
                    button: {
                        type: 'string',
                        description: 'Mouse button to use',
                        enum: ['left', 'right', 'middle'],
                    },
                    clickCount: {
                        type: 'number',
                        description: 'Number of clicks (1 for single, 2 for double)',
                    },
                },
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ clicked: boolean; selector: string }> {
        const sessionId = args.sessionId as string | undefined;
        const selector = args.selector as string | undefined;
        const text = args.text as string | undefined;
        const button = (args.button as 'left' | 'right' | 'middle') ?? 'left';
        const clickCount = (args.clickCount as number) ?? 1;

        if (!selector && !text) {
            throw new Error('Either selector or text is required');
        }

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        let locator;
        if (text) {
            locator = page.getByText(text);
        } else {
            locator = page.locator(selector!);
        }

        await locator.click({ button, clickCount });
        session.lastActivity = new Date();

        logger.tool(this.name, 'Clicked', { selector: selector ?? `text="${text}"` });

        return { clicked: true, selector: selector ?? `text="${text}"` };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Fill Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserFillSkill extends Skill {
    readonly name = 'browser_fill';
    readonly category = 'web' as const;
    readonly description = 'Fill in a form field';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector for the input field',
                    },
                    label: {
                        type: 'string',
                        description: 'Label text to find the input',
                    },
                    placeholder: {
                        type: 'string',
                        description: 'Placeholder text to find the input',
                    },
                    value: {
                        type: 'string',
                        description: 'Value to fill in',
                    },
                },
                required: ['value'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ filled: boolean; selector: string }> {
        this.validateArgs(args, ['value']);

        const sessionId = args.sessionId as string | undefined;
        const selector = args.selector as string | undefined;
        const label = args.label as string | undefined;
        const placeholder = args.placeholder as string | undefined;
        const value = args.value as string;

        if (!selector && !label && !placeholder) {
            throw new Error('Either selector, label, or placeholder is required');
        }

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        let locator;
        if (label) {
            locator = page.getByLabel(label);
        } else if (placeholder) {
            locator = page.getByPlaceholder(placeholder);
        } else {
            locator = page.locator(selector!);
        }

        await locator.fill(value);
        session.lastActivity = new Date();

        const usedSelector = selector ?? (label ? `label="${label}"` : `placeholder="${placeholder}"`);
        logger.tool(this.name, 'Filled', { selector: usedSelector, valueLength: value.length });

        return { filled: true, selector: usedSelector };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Screenshot Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserScreenshotSkill extends Skill {
    readonly name = 'browser_screenshot';
    readonly category = 'web' as const;
    readonly description = 'Take a screenshot of the current page';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    path: {
                        type: 'string',
                        description: 'File path to save screenshot',
                    },
                    fullPage: {
                        type: 'boolean',
                        description: 'Capture full scrollable page',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector to screenshot specific element',
                    },
                },
                required: ['path'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ path: string; size: { width: number; height: number } }> {
        this.validateArgs(args, ['path']);

        const sessionId = args.sessionId as string | undefined;
        const path = args.path as string;
        const fullPage = (args.fullPage as boolean) ?? false;
        const selector = args.selector as string | undefined;

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        let buffer: Buffer;
        if (selector) {
            buffer = await page.locator(selector).screenshot({ path });
        } else {
            buffer = await page.screenshot({ path, fullPage });
        }

        session.lastActivity = new Date();

        logger.tool(this.name, 'Screenshot taken', { path, size: buffer.length });

        // Get viewport size
        const viewport = page.viewportSize() ?? { width: 0, height: 0 };

        return { path, size: viewport };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Execute Script Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserExecuteSkill extends Skill {
    readonly name = 'browser_execute';
    readonly category = 'web' as const;
    readonly description = 'Execute JavaScript in the browser context';
    readonly version = '1.0.0';
    readonly dangerous = true;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    script: {
                        type: 'string',
                        description: 'JavaScript code to execute',
                    },
                },
                required: ['script'],
            },
            category: 'web',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ result: unknown }> {
        this.validateArgs(args, ['script']);

        const sessionId = args.sessionId as string | undefined;
        const script = args.script as string;

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        const result = await page.evaluate(script);
        session.lastActivity = new Date();

        logger.tool(this.name, 'Script executed', { scriptLength: script.length });

        return { result };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser PDF Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserPdfSkill extends Skill {
    readonly name = 'browser_pdf';
    readonly category = 'web' as const;
    readonly description = 'Generate a PDF of the current page';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    path: {
                        type: 'string',
                        description: 'File path to save PDF',
                    },
                    format: {
                        type: 'string',
                        description: 'Paper format',
                        enum: ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
                    },
                    printBackground: {
                        type: 'boolean',
                        description: 'Print background graphics',
                    },
                },
                required: ['path'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ path: string; pages: number }> {
        this.validateArgs(args, ['path']);

        const sessionId = args.sessionId as string | undefined;
        const path = args.path as string;
        const format = (args.format as string) ?? 'Letter';
        const printBackground = (args.printBackground as boolean) ?? true;

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        const buffer = await page.pdf({
            path,
            format: format as 'Letter' | 'A4',
            printBackground,
        });

        session.lastActivity = new Date();

        logger.tool(this.name, 'PDF generated', { path, size: buffer.length });

        // Rough page count estimate
        const pageCount = Math.max(1, Math.round(buffer.length / 50000));

        return { path, pages: pageCount };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Wait Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserWaitSkill extends Skill {
    readonly name = 'browser_wait';
    readonly category = 'web' as const;
    readonly description = 'Wait for an element, navigation, or timeout';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector to wait for',
                    },
                    state: {
                        type: 'string',
                        description: 'State to wait for',
                        enum: ['visible', 'hidden', 'attached', 'detached'],
                    },
                    timeout: {
                        type: 'number',
                        description: 'Timeout in milliseconds',
                    },
                    delay: {
                        type: 'number',
                        description: 'Simple delay in milliseconds (if no selector)',
                    },
                },
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ waited: boolean; duration: number }> {
        const sessionId = args.sessionId as string | undefined;
        const selector = args.selector as string | undefined;
        const state = (args.state as 'visible' | 'hidden' | 'attached' | 'detached') ?? 'visible';
        const timeout = (args.timeout as number) ?? 30000;
        const delay = args.delay as number | undefined;

        const session = getOrCreateSession(sessionId);
        const page = await ensurePage(session);

        const startTime = Date.now();

        if (delay && !selector) {
            await page.waitForTimeout(delay);
        } else if (selector) {
            await page.locator(selector).waitFor({ state, timeout });
        } else {
            throw new Error('Either selector or delay is required');
        }

        session.lastActivity = new Date();
        const duration = Date.now() - startTime;

        return { waited: true, duration };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Close Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class BrowserCloseSkill extends Skill {
    readonly name = 'browser_close';
    readonly category = 'web' as const;
    readonly description = 'Close a browser session';
    readonly version = '1.0.0';

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Browser session ID to close',
                    },
                },
                required: ['sessionId'],
            },
            category: 'web',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{ closed: boolean }> {
        this.validateArgs(args, ['sessionId']);

        const sessionId = args.sessionId as string;
        const session = sessions.get(sessionId);

        if (!session) {
            return { closed: false };
        }

        await session.browser.close();
        sessions.delete(sessionId);

        logger.tool(this.name, 'Browser closed', { sessionId });

        return { closed: true };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function getOrCreateSession(sessionId?: string): BrowserSession {
    if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
            return session;
        }
        throw new Error(`Browser session not found: ${sessionId}. Launch a browser first.`);
    }

    // Get most recent session or throw
    const entries = Array.from(sessions.entries());
    if (entries.length > 0) {
        return entries[entries.length - 1]![1];
    }

    throw new Error('No browser session active. Use browser_launch first.');
}

async function ensurePage(session: BrowserSession): Promise<import('playwright').Page> {
    return session.page;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Collection Export
// ═══════════════════════════════════════════════════════════════════════════════

export function getBrowserSkills(): Skill[] {
    return [
        new BrowserLaunchSkill(),
        new BrowserNavigateSkill(),
        new BrowserContentSkill(),
        new BrowserClickSkill(),
        new BrowserFillSkill(),
        new BrowserScreenshotSkill(),
        new BrowserExecuteSkill(),
        new BrowserPdfSkill(),
        new BrowserWaitSkill(),
        new BrowserCloseSkill(),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════════════════════════

export function getActiveBrowserSessions(): string[] {
    return Array.from(sessions.keys());
}

export async function closeAllBrowserSessions(): Promise<void> {
    for (const [id, session] of sessions) {
        try {
            await session.browser.close();
        } catch {
            // Ignore close errors
        }
    }
    sessions.clear();
}
