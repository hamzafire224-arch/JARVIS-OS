/**
 * JARVIS Skills Exports
 * 
 * Central export for all skills and skill utilities.
 */

// Base classes and registry
export {
    Skill,
    SkillRegistry,
    getSkillRegistry,
    resetSkillRegistry,
    type SkillCategory,
    type SkillMetadata,
    type SkillExecutionContext,
    type SkillHandler,
} from './Skill.js';

// Filesystem skills
export {
    ReadFileSkill,
    WriteFileSkill,
    ListDirectorySkill,
    SearchFilesSkill,
    DeleteFileSkill,
    type DirectoryEntry,
    type SearchMatch,
} from './FilesystemSkills.js';

// Terminal skills
export {
    RunCommandSkill,
    StartBackgroundCommandSkill,
    CheckBackgroundCommandSkill,
    StopBackgroundCommandSkill,
    type CommandResult,
} from './TerminalSkills.js';

// Web skills
export {
    HttpFetchSkill,
    ReadWebpageSkill,
    WebSearchSkill,
    DownloadFileSkill,
    type HttpResponse,
    type WebpageContent,
    type SearchResult,
} from './WebSkills.js';

// Browser skills (Playwright)
export {
    BrowserLaunchSkill,
    BrowserNavigateSkill,
    BrowserContentSkill,
    BrowserClickSkill,
    BrowserFillSkill,
    BrowserScreenshotSkill,
    BrowserExecuteSkill,
    BrowserPdfSkill,
    BrowserWaitSkill,
    BrowserCloseSkill,
    getBrowserSkills,
    getActiveBrowserSessions,
    closeAllBrowserSessions,
} from './BrowserSkills.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Initialization
// ═══════════════════════════════════════════════════════════════════════════════

import { getSkillRegistry, type SkillRegistry } from './Skill.js';
import { ReadFileSkill, WriteFileSkill, ListDirectorySkill, SearchFilesSkill, DeleteFileSkill } from './FilesystemSkills.js';
import { RunCommandSkill, StartBackgroundCommandSkill, CheckBackgroundCommandSkill, StopBackgroundCommandSkill } from './TerminalSkills.js';
import { HttpFetchSkill, ReadWebpageSkill, WebSearchSkill, DownloadFileSkill } from './WebSkills.js';
import { getBrowserSkills } from './BrowserSkills.js';
import { logger } from '../utils/logger.js';

export interface SkillInitOptions {
    enableFilesystem?: boolean;
    enableTerminal?: boolean;
    enableWeb?: boolean;
    enableBrowser?: boolean;
}

/**
 * Initialize all default skills and register them.
 */
export function initializeSkills(options: SkillInitOptions = {}): SkillRegistry {
    const registry = getSkillRegistry();

    // Default to all enabled (except browser which requires Playwright)
    const enableFilesystem = options.enableFilesystem !== false;
    const enableTerminal = options.enableTerminal !== false;
    const enableWeb = options.enableWeb !== false;
    const enableBrowser = options.enableBrowser === true; // Opt-in for browser

    // Register filesystem skills
    if (enableFilesystem) {
        registry.register(new ReadFileSkill());
        registry.register(new WriteFileSkill());
        registry.register(new ListDirectorySkill());
        registry.register(new SearchFilesSkill());
        registry.register(new DeleteFileSkill());
        logger.info('Registered filesystem skills');
    }

    // Register terminal skills
    if (enableTerminal) {
        registry.register(new RunCommandSkill());
        registry.register(new StartBackgroundCommandSkill());
        registry.register(new CheckBackgroundCommandSkill());
        registry.register(new StopBackgroundCommandSkill());
        logger.info('Registered terminal skills');
    }

    // Register web skills
    if (enableWeb) {
        registry.register(new HttpFetchSkill());
        registry.register(new ReadWebpageSkill());
        registry.register(new WebSearchSkill());
        registry.register(new DownloadFileSkill());
        logger.info('Registered web skills');
    }

    // Register browser skills (Playwright)
    if (enableBrowser) {
        for (const skill of getBrowserSkills()) {
            registry.register(skill);
        }
        logger.info('Registered browser automation skills');
    }

    logger.info('Skills initialized', {
        total: registry.getAll().length,
        categories: {
            filesystem: enableFilesystem,
            terminal: enableTerminal,
            web: enableWeb,
            browser: enableBrowser,
        },
    });

    return registry;
}

/**
 * Get a skill handler that can be used as an agent tool handler.
 * This bridges the gap between skills and agent tools.
 */
export function createSkillToolHandler(
    skillName: string,
    context: Partial<import('./Skill.js').SkillExecutionContext> = {}
): (args: Record<string, unknown>) => Promise<unknown> {
    const registry = getSkillRegistry();

    return async (args: Record<string, unknown>) => {
        const skill = registry.get(skillName);
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        return skill.execute(args, {
            workspaceDir: context.workspaceDir,
            userId: context.userId,
            sessionId: context.sessionId,
            timeout: context.timeout,
        });
    };
}
