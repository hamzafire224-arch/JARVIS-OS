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

// Skill Marketplace
export {
    SkillMarketplace,
    getSkillMarketplace,
    initializeSkillMarketplace,
    resetSkillMarketplace,
    type SkillMetadata as MarketplaceSkillMetadata,
    type SkillCategory as MarketplaceSkillCategory,
    type SkillSearchResult,
    type InstalledSkill,
    type MarketplaceConfig,
} from './SkillMarketplace.js';

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

// Database skills
export {
    DatabaseSkills,
    SQLiteProvider,
    PostgreSQLProvider,
    getDatabaseSkills,
    createDatabaseSkills,
    resetDatabaseSkills,
    connectSQLite,
    type DatabaseConfig,
    type QueryResult,
    type TableInfo,
    type ColumnInfo,
    type DatabaseProvider,
} from './DatabaseSkills.js';

// GitHub skills
export { GitHubSkills } from './GitHubSkills.js';

// Calendar skills
export {
    CalendarSkills,
    getCalendarSkills,
    resetCalendarSkills,
    type CalendarEvent,
} from './CalendarSkills.js';

// Task skills
export {
    TaskSkills,
    getTaskSkills,
    resetTaskSkills,
    type Task,
} from './TaskSkills.js';

// MCP Bridge
export {
    MCPBridge,
    getMCPBridge,
    initializeMCPBridge,
    resetMCPBridge,
    type MCPServerConfig,
    type MCPConfig,
} from './MCPBridge.js';

// Vision skills
export {
    VisionSkills,
    getVisionSkills,
    resetVisionSkills,
    type ImageAnalysis,
    type PDFContent,
} from './VisionSkills.js';

// Voice skills
export {
    VoiceSkills,
    getVoiceSkills,
    resetVoiceSkills,
} from './VoiceSkills.js';

// Project Analyzer
export {
    ProjectAnalyzer,
    getProjectAnalyzer,
} from './ProjectAnalyzer.js';

// Email skills
export {
    EmailSkills,
    getEmailSkills,
    resetEmailSkills,
} from './EmailSkills.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Initialization
// ═══════════════════════════════════════════════════════════════════════════════

import { getSkillRegistry, type SkillRegistry } from './Skill.js';
import { ReadFileSkill, WriteFileSkill, ListDirectorySkill, SearchFilesSkill, DeleteFileSkill } from './FilesystemSkills.js';
import { RunCommandSkill, StartBackgroundCommandSkill, CheckBackgroundCommandSkill, StopBackgroundCommandSkill } from './TerminalSkills.js';
import { HttpFetchSkill, ReadWebpageSkill, WebSearchSkill, DownloadFileSkill } from './WebSkills.js';
import { getBrowserSkills } from './BrowserSkills.js';
import { getDatabaseSkills } from './DatabaseSkills.js';
import { GitHubSkills, getGitHubSkills } from './GitHubSkills.js';
import { logger } from '../utils/logger.js';
import { getCalendarSkills } from './CalendarSkills.js';
import { getTaskSkills } from './TaskSkills.js';
import { getMCPBridge } from './MCPBridge.js';
import { getVisionSkills } from './VisionSkills.js';
import { getVoiceSkills } from './VoiceSkills.js';
import { getProjectAnalyzer } from './ProjectAnalyzer.js';
import { getEmailSkills } from './EmailSkills.js';

export interface SkillInitOptions {
    enableFilesystem?: boolean;
    enableTerminal?: boolean;
    enableWeb?: boolean;
    enableBrowser?: boolean;
    enableGitHub?: boolean;
    enableDatabase?: boolean;
    enablePersonal?: boolean;
    enableMCP?: boolean;
    enableVision?: boolean;
    enableVoice?: boolean;
}

/**
 * Initialize all default skills and register them.
 */
export function initializeSkills(options: SkillInitOptions = {}): SkillRegistry {
    const registry = getSkillRegistry();

    // Default to all enabled (except browser/github/database which are opt-in)
    const enableFilesystem = options.enableFilesystem !== false;
    const enableTerminal = options.enableTerminal !== false;
    const enableWeb = options.enableWeb !== false;
    const enableBrowser = options.enableBrowser === true; // Opt-in for browser
    const enableGitHub = options.enableGitHub === true; // Opt-in for GitHub CLI
    const enableDatabase = options.enableDatabase === true; // Opt-in for database
    const enablePersonal = options.enablePersonal !== false; // Default on

    // Register filesystem skills
    if (enableFilesystem) {
        registry.register(new ReadFileSkill());
        registry.register(new WriteFileSkill());
        registry.register(new ListDirectorySkill());
        registry.register(new SearchFilesSkill());
        registry.register(new DeleteFileSkill());
        
        const projectAnalyzer = getProjectAnalyzer();
        for (const toolDef of projectAnalyzer.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'filesystem' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return projectAnalyzer.execute(toolDef.name, args); },
            } as any);
        }

        logger.info('Registered filesystem and project analysis skills');
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

    // Register GitHub skills (requires gh CLI)
    if (enableGitHub) {
        const githubSkills = getGitHubSkills();
        for (const toolDef of githubSkills.getTools()) {
            // Create wrapper that the registry can use
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'github' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return githubSkills.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('Registered GitHub skills', { count: githubSkills.getTools().length });
    }

    // Register Database skills
    if (enableDatabase) {
        const dbSkills = getDatabaseSkills();
        for (const toolDef of dbSkills.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'database' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return dbSkills.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('Registered Database skills', { count: dbSkills.getTools().length });
    }

    // Register Calendar, Task, and Email skills
    if (enablePersonal) {
        const calendarSkills = getCalendarSkills();
        for (const toolDef of calendarSkills.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'personal' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return calendarSkills.execute(toolDef.name, args); },
            } as any);
        }
        const taskSkills = getTaskSkills();
        for (const toolDef of taskSkills.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'personal' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return taskSkills.execute(toolDef.name, args); },
            } as any);
        }
        const emailSkills = getEmailSkills();
        for (const toolDef of emailSkills.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'personal' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return emailSkills.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('Registered personal skills (calendar, tasks, email)');
    }

    // Register MCP Bridge (opt-in)
    const enableMCP = options.enableMCP === true;
    if (enableMCP) {
        const mcpBridge = getMCPBridge();
        // MCP tools are registered after initialize() is called
        // But we register the bridge so it's accessible
        for (const toolDef of mcpBridge.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'system' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return mcpBridge.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('MCP Bridge registered', { tools: mcpBridge.getTools().length });
    }

    // Register Vision skills (opt-in)
    const enableVision = options.enableVision === true;
    if (enableVision) {
        const vision = getVisionSkills();
        for (const toolDef of vision.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'web' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return vision.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('Registered Vision skills (image + PDF)');
    }

    // Register Voice skills (opt-in)
    const enableVoice = options.enableVoice === true;
    if (enableVoice) {
        const voice = getVoiceSkills();
        for (const toolDef of voice.getTools()) {
            registry.register({
                name: toolDef.name,
                get description() { return toolDef.description; },
                get category() { return 'system' as const; },
                get version() { return '1.0.0'; },
                getToolDefinition() { return toolDef; },
                async execute(args: Record<string, unknown>) { return voice.execute(toolDef.name, args); },
            } as any);
        }
        logger.info('Registered Voice skills ( TTS + STT )');
    }

    logger.info('Skills initialized', {
        total: registry.getAll().length,
        categories: {
            filesystem: enableFilesystem,
            terminal: enableTerminal,
            web: enableWeb,
            browser: enableBrowser,
            github: enableGitHub,
            database: enableDatabase,
            personal: enablePersonal,
            mcp: enableMCP,
            vision: enableVision,
            voice: enableVoice,
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
