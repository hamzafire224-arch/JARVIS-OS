/**
 * JARVIS Skill Base Class
 * 
 * Abstract base for all skills (tool implementations).
 * Skills provide the actual functionality behind agent tools.
 */

import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { ToolExecutionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Types
// ═══════════════════════════════════════════════════════════════════════════════

export type SkillCategory = 'filesystem' | 'terminal' | 'web' | 'memory' | 'system' | 'github' | 'database';

export interface SkillMetadata {
    name: string;
    category: SkillCategory;
    description: string;
    version: string;
    dangerous: boolean;
}

export interface SkillExecutionContext {
    workspaceDir?: string;
    userId?: string;
    sessionId?: string;
    timeout?: number;
}

export type SkillHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
    args: TArgs,
    context: SkillExecutionContext
) => Promise<TResult>;

export interface BaseSkillOptions {
    name: string;
    description: string;
    version: string;
    category?: SkillCategory;
    dangerous?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Base Class
// ═══════════════════════════════════════════════════════════════════════════════

export abstract class Skill {
    abstract readonly name: string;
    abstract readonly category: SkillCategory;
    abstract readonly description: string;
    abstract readonly version: string;
    readonly dangerous: boolean = false;

    /**
     * Get the tool definition for this skill
     */
    abstract getToolDefinition(): ToolDefinition;

    /**
     * Execute the skill with the given arguments
     */
    abstract execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<unknown>;

    /**
     * Get metadata about this skill
     */
    getMetadata(): SkillMetadata {
        return {
            name: this.name,
            category: this.category,
            description: this.description,
            version: this.version,
            dangerous: this.dangerous,
        };
    }

    /**
     * Validate arguments before execution
     */
    protected validateArgs(args: Record<string, unknown>, required: string[]): void {
        for (const key of required) {
            if (args[key] === undefined || args[key] === null) {
                throw new ToolExecutionError(
                    this.name,
                    `Missing required argument: ${key}`
                );
            }
        }
    }

    /**
     * Safe execution wrapper with error handling
     */
    protected async safeExecute<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.tool(this.name, `Error in ${operationName}`, { error: message });
            throw new ToolExecutionError(this.name, message, error instanceof Error ? error : undefined);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-Tool Skill Base Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base class for skills that provide multiple tools (e.g., GitHubSkills, DatabaseSkills)
 */
export abstract class MultiToolSkill {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly category: SkillCategory;
    readonly dangerous: boolean;

    constructor(options: BaseSkillOptions) {
        this.name = options.name;
        this.description = options.description;
        this.version = options.version;
        this.category = options.category ?? 'system';
        this.dangerous = options.dangerous ?? false;
    }

    /**
     * Get all tool definitions for this skill
     */
    abstract getTools(): ToolDefinition[];

    /**
     * Execute a specific tool by name
     */
    abstract execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult>;

    /**
     * Get metadata about this skill
     */
    getMetadata(): SkillMetadata {
        return {
            name: this.name,
            category: this.category,
            description: this.description,
            version: this.version,
            dangerous: this.dangerous,
        };
    }

    /**
     * Helper to create a standard ToolResult
     */
    protected createResult(data: unknown, isError = false): ToolResult {
        if (isError) {
            return {
                toolCallId: '',
                result: typeof data === 'string' ? { error: data } : data,
                error: typeof data === 'string' ? data : undefined,
            };
        }
        return {
            toolCallId: '',
            result: data,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Registry
// ═══════════════════════════════════════════════════════════════════════════════

export class SkillRegistry {
    private skills: Map<string, Skill> = new Map();
    private skillsByCategory: Map<SkillCategory, Skill[]> = new Map();

    constructor() {
        // Initialize category buckets
        const categories: SkillCategory[] = ['filesystem', 'terminal', 'web', 'memory', 'system', 'github', 'database'];
        for (const category of categories) {
            this.skillsByCategory.set(category, []);
        }
    }

    /**
     * Register a skill
     */
    register(skill: Skill): void {
        this.skills.set(skill.name, skill);

        const categorySkills = this.skillsByCategory.get(skill.category) ?? [];
        categorySkills.push(skill);
        this.skillsByCategory.set(skill.category, categorySkills);

        logger.tool(skill.name, 'Registered skill', { category: skill.category });
    }

    /**
     * Get a skill by name
     */
    get(name: string): Skill | undefined {
        return this.skills.get(name);
    }

    /**
     * Check if a skill exists
     */
    has(name: string): boolean {
        return this.skills.has(name);
    }

    /**
     * Get all skills in a category
     */
    getByCategory(category: SkillCategory): Skill[] {
        return this.skillsByCategory.get(category) ?? [];
    }

    /**
     * Get all skills
     */
    getAll(): Skill[] {
        return Array.from(this.skills.values());
    }

    /**
     * Get tool definitions for all skills
     */
    getToolDefinitions(): ToolDefinition[] {
        return this.getAll().map(skill => skill.getToolDefinition());
    }

    /**
     * Get tool definitions for specific categories
     */
    getToolDefinitionsForCategories(categories: SkillCategory[]): ToolDefinition[] {
        const skills: Skill[] = [];
        for (const category of categories) {
            skills.push(...this.getByCategory(category));
        }
        return skills.map(skill => skill.getToolDefinition());
    }

    /**
     * Execute a skill by name
     */
    async execute(
        name: string,
        args: Record<string, unknown>,
        context: SkillExecutionContext = {}
    ): Promise<unknown> {
        const skill = this.get(name);
        if (!skill) {
            throw new ToolExecutionError(name, `Skill not found: ${name}`);
        }

        logger.tool(name, 'Executing skill', { args: Object.keys(args) });

        const startTime = Date.now();
        const result = await skill.execute(args, context);
        const duration = Date.now() - startTime;

        logger.tool(name, 'Skill completed', { durationMs: duration });
        return result;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
    if (!registryInstance) {
        registryInstance = new SkillRegistry();
    }
    return registryInstance;
}

export function resetSkillRegistry(): void {
    registryInstance = null;
}
