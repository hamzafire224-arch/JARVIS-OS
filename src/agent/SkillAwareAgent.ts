/**
 * JARVIS Skill-Aware Agent
 * 
 * Enhanced agent that integrates with the skill registry
 * for actual tool execution.
 */

import { Agent, type AgentOptions } from './Agent.js';
import { getSkillRegistry, type SkillRegistry, type SkillExecutionContext } from '../skills/index.js';
import type { AgentMetadata, ToolDefinition, ApprovalCallback } from './types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill-Aware Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface SkillAwareAgentOptions extends Omit<AgentOptions, 'name' | 'systemPrompt'> {
    name: string;
    systemPrompt: string;
    workspaceDir?: string;
    userId?: string;
    sessionId?: string;
    skillCategories?: Array<'filesystem' | 'terminal' | 'web' | 'memory' | 'system' | 'github' | 'database'>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill-Aware Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class SkillAwareAgent extends Agent {
    protected skillRegistry: SkillRegistry;
    protected skillContext: SkillExecutionContext;
    protected skillCategories: string[];

    constructor(options: SkillAwareAgentOptions) {
        super({
            name: options.name,
            systemPrompt: options.systemPrompt,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: options.maxIterations,
        });

        this.skillRegistry = getSkillRegistry();
        this.skillContext = {
            workspaceDir: options.workspaceDir,
            userId: options.userId,
            sessionId: options.sessionId,
        };
        this.skillCategories = options.skillCategories ?? ['filesystem', 'terminal', 'web', 'memory', 'system'];

        // Register skills as tools
        this.registerSkillTools();

        logger.agent(`SkillAwareAgent created: ${options.name}`, {
            workspaceDir: options.workspaceDir,
            categories: this.skillCategories,
        });
    }

    /**
     * Register all skills in the allowed categories as agent tools
     */
    private registerSkillTools(): void {
        for (const category of this.skillCategories) {
            const skills = this.skillRegistry.getByCategory(category as 'filesystem' | 'terminal' | 'web' | 'memory' | 'system' | 'github' | 'database');

            for (const skill of skills) {
                const toolDef = skill.getToolDefinition();

                // Create a handler that delegates to the skill
                const handler = async (args: Record<string, unknown>) => {
                    return this.skillRegistry.execute(skill.name, args, this.skillContext);
                };

                this.registerTool(toolDef, handler);
            }
        }

        logger.agent(`Registered ${this.tools.size} skills as tools`);
    }

    /**
     * Update the skill execution context
     */
    setSkillContext(context: Partial<SkillExecutionContext>): void {
        this.skillContext = {
            ...this.skillContext,
            ...context,
        };
    }

    /**
     * Get the current skill context
     */
    getSkillContext(): SkillExecutionContext {
        return { ...this.skillContext };
    }

    getMetadata(): AgentMetadata {
        return {
            name: this.name,
            type: 'custom',
            description: 'Skill-aware agent with integrated tool execution',
            capabilities: this.skillCategories.map(cat => `${cat} operations`),
            allowedTools: Array.from(this.tools.keys()),
            workspaceDir: this.skillContext.workspaceDir,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Agent Factory
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateSkillAgentOptions {
    name?: string;
    systemPrompt?: string;
    workspaceDir?: string;
    userId?: string;
    sessionId?: string;
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
    skillCategories?: Array<'filesystem' | 'terminal' | 'web' | 'memory' | 'system' | 'github' | 'database'>;
}

const DEFAULT_JARVIS_PROMPT = `You are JARVIS, an advanced AI assistant with access to various tools for interacting with the filesystem, terminal, and web.

## Available Capabilities
- Read, write, and search files
- Execute terminal commands
- Fetch and read web pages
- Manage background processes

## Guidelines
1. Always explain what you're about to do before taking action
2. Use tools efficiently - combine operations when possible
3. Handle errors gracefully and provide helpful feedback
4. Ask for clarification if a request is ambiguous
5. Be mindful of potentially destructive operations

When executing tasks:
- Start by understanding the current state
- Plan the steps needed
- Execute with appropriate caution
- Verify the results`;

export function createSkillAgent(options: CreateSkillAgentOptions = {}): SkillAwareAgent {
    return new SkillAwareAgent({
        name: options.name ?? 'JARVIS',
        systemPrompt: options.systemPrompt ?? DEFAULT_JARVIS_PROMPT,
        workspaceDir: options.workspaceDir,
        userId: options.userId,
        sessionId: options.sessionId,
        memory: options.memory,
        onApprovalRequired: options.onApprovalRequired,
        skillCategories: options.skillCategories,
    });
}
