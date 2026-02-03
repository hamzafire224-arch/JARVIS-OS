/**
 * JARVIS Main Agent (Orchestrator)
 * 
 * The primary "brain" of JARVIS that:
 * - Triages incoming requests
 * - Delegates to specialized sub-agents
 * - Maintains global conversation state
 * - Implements the "check-verify-execute" safety loop
 */

import { Agent, type AgentOptions } from './Agent.js';
import type { AgentMetadata, ApprovalCallback } from './types.js';
import { getConfig, isProductivityVariant } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Main Agent System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const MAIN_AGENT_SYSTEM_PROMPT = `You are JARVIS, an advanced autonomous AI operative designed to assist your user across all aspects of their digital life. You operate as a proactive, local-first system that respects privacy while delivering unparalleled agency.

## Core Identity
- You are a 24/7 personal assistant with persistent memory across sessions
- You maintain a unified presence across all communication channels
- You act proactively when appropriate, not just reactively
- You prioritize user privacy and data sovereignty

## Operational Principles

### 1. Check-Verify-Execute
Before any significant action:
1. **Check**: Understand the user's intent clearly
2. **Verify**: Confirm you have the necessary context and permissions
3. **Execute**: Perform the action with precision
4. **Report**: Summarize what was done

### 2. Intelligent Assistance
- Anticipate needs based on context and memory
- Provide concise, actionable responses
- Ask clarifying questions only when truly necessary
- Remember user preferences and apply them automatically

### 3. Tool Usage
- Use tools efficiently and purposefully
- Combine multiple tools when tasks require it
- Report tool outcomes clearly
- Handle errors gracefully with fallback strategies

### 4. Communication Style
- Be professional yet personable
- Match the user's communication style
- Use formatting (markdown) to enhance readability
- Keep responses focused and avoid unnecessary verbosity

## Current Context
You have access to your persistent memory which contains:
- User preferences and past interactions
- Project contexts and ongoing tasks
- Important dates and reminders
- Learned patterns and behaviors

Always consult your memory before asking the user for information they may have already provided.`;

// ═══════════════════════════════════════════════════════════════════════════════
// Main Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface MainAgentOptions {
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
    customSystemPrompt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class MainAgent extends Agent {
    private variant: 'productivity' | 'balanced';

    constructor(options: MainAgentOptions = {}) {
        const config = getConfig();

        super({
            name: 'JARVIS',
            systemPrompt: options.customSystemPrompt ?? MAIN_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 15, // Main agent may need more iterations for complex tasks
        });

        this.variant = config.variant;

        // Register core tools
        this.registerCoreTools();

        logger.agent('MainAgent created', { variant: this.variant });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'JARVIS',
            type: 'main',
            description: 'Primary AI operative - orchestrates all tasks and delegates to specialists',
            capabilities: [
                'Natural language understanding',
                'Task orchestration and delegation',
                'Memory retrieval and storage',
                'Context-aware responses',
                'Multi-step reasoning',
            ],
            allowedTools: Array.from(this.tools.keys()),
        };
    }

    /**
     * Override execute to add orchestration logic
     */
    async execute(userMessage: string) {
        logger.agent('MainAgent processing request', {
            variant: this.variant,
            messagePreview: userMessage.slice(0, 100),
        });

        // In productivity variant (full power), route to specialized agents based on intent
        if (this.variant === 'productivity') {
            const delegation = await this.attemptDelegation(userMessage);
            if (delegation) {
                return delegation;
            }
        }

        return super.execute(userMessage);
    }

    /**
     * Attempt to delegate to a specialized sub-agent
     */
    private async attemptDelegation(userMessage: string): Promise<import('./types.js').AgentExecutionResult | null> {
        // Import router lazily to avoid circular dependencies
        const { getAgentRouter, getAgentRegistry } = await import('./AgentRegistry.js');

        const registry = getAgentRegistry();

        // Check if sub-agents are registered (they might not be in minimal setups)
        if (registry.getAll().length <= 1) {
            logger.agent('No sub-agents registered, handling directly');
            return null;
        }

        try {
            const router = getAgentRouter();
            const { agent, intent } = router.route(userMessage);

            // Only delegate if we have a specialized agent AND high confidence
            if (intent.suggestedAgent && intent.confidence > 0.6 && agent !== this) {
                logger.agent(`Delegating to ${agent.getMetadata().name}`, {
                    category: intent.category,
                    confidence: intent.confidence,
                });

                // Ensure the delegate agent is initialized
                await agent.initialize();

                // Execute on delegate agent
                const result = await agent.execute(userMessage);

                // Add delegation metadata to result
                return {
                    ...result,
                    delegatedFrom: 'JARVIS',
                    delegatedTo: agent.getMetadata().name,
                    intent,
                } as import('./types.js').AgentExecutionResult;
            }
        } catch (error) {
            logger.warn('Delegation failed, handling directly', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Core Tools Registration
    // ─────────────────────────────────────────────────────────────────────────────


    private registerCoreTools(): void {
        // Memory tool - always available
        this.registerTool(
            {
                name: 'remember',
                description: 'Store important information in persistent memory for future reference',
                parameters: {
                    type: 'object',
                    properties: {
                        key: {
                            type: 'string',
                            description: 'A short identifier for this memory (e.g., "user_name", "project_deadline")',
                        },
                        value: {
                            type: 'string',
                            description: 'The information to remember',
                        },
                        category: {
                            type: 'string',
                            description: 'Category of memory',
                            enum: ['preference', 'fact', 'project', 'reminder'],
                        },
                        importance: {
                            type: 'number',
                            description: 'Importance level 1-10 (higher = more important)',
                        },
                    },
                    required: ['key', 'value'],
                },
                category: 'memory',
            },
            async (args) => {
                const { key, value, category, importance } = args as {
                    key: string;
                    value: string;
                    category?: 'preference' | 'fact' | 'project';
                    importance?: number;
                };

                const memoryManager = await import('../memory/MemoryManager.js').then(m => m.getMemoryManager());

                // Map category to MemoryEntry type
                const typeMap: Record<string, 'preference' | 'fact' | 'project' | 'context' | 'feedback'> = {
                    preference: 'preference',
                    fact: 'fact',
                    project: 'project',
                    reminder: 'context',
                };

                const entry = await memoryManager.add({
                    type: typeMap[category ?? 'fact'] ?? 'fact',
                    content: `${key}: ${value}`,
                    source: 'user-request',
                    importance: importance ?? 5,
                    tags: [key, category ?? 'general'],
                });

                logger.memory(`Stored: ${key} = ${value}`, { id: entry.id, type: entry.type });
                return {
                    success: true,
                    message: `Remembered: ${key}`,
                    memoryId: entry.id,
                };
            }
        );

        this.registerTool(
            {
                name: 'recall',
                description: 'Retrieve information from persistent memory',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'What to search for in memory (key, keyword, or natural language query)',
                        },
                        type: {
                            type: 'string',
                            description: 'Optional filter by memory type',
                            enum: ['preference', 'fact', 'project', 'context', 'feedback'],
                        },
                    },
                    required: ['query'],
                },
                category: 'memory',
            },
            async (args) => {
                const { query, type } = args as { query: string; type?: 'preference' | 'fact' | 'project' | 'context' | 'feedback' };

                const memoryManager = await import('../memory/MemoryManager.js').then(m => m.getMemoryManager());
                await memoryManager.initialize();

                let results;
                if (type) {
                    // Filter by type first, then search within results
                    const byType = await memoryManager.getByType(type);
                    const lowerQuery = query.toLowerCase();
                    results = byType.filter(e =>
                        e.content.toLowerCase().includes(lowerQuery) ||
                        e.tags.some(t => t.toLowerCase().includes(lowerQuery))
                    );
                } else {
                    results = await memoryManager.search(query);
                }

                logger.memory(`Searching for: ${query}`, { resultsCount: results.length });

                if (results.length === 0) {
                    return {
                        found: false,
                        message: `No memories found matching "${query}"`,
                        results: [],
                    };
                }

                // Format results for the agent
                const formatted = results.slice(0, 10).map(entry => ({
                    id: entry.id,
                    type: entry.type,
                    content: entry.content,
                    tags: entry.tags,
                    importance: entry.importance,
                    createdAt: entry.createdAt.toISOString(),
                }));

                return {
                    found: true,
                    count: results.length,
                    results: formatted,
                };
            }
        );

        // Thinking tool - for complex reasoning
        this.registerTool(
            {
                name: 'think',
                description: 'Take time to reason through a complex problem step by step. Use this when you need to break down a problem, weigh options, or plan a multi-step approach.',
                parameters: {
                    type: 'object',
                    properties: {
                        problem: {
                            type: 'string',
                            description: 'The problem or question to think through',
                        },
                        approach: {
                            type: 'string',
                            description: 'Your step-by-step reasoning',
                        },
                        conclusion: {
                            type: 'string',
                            description: 'Your conclusion or recommended action',
                        },
                    },
                    required: ['problem', 'approach', 'conclusion'],
                },
                category: 'system',
            },
            async (args) => {
                const { problem, approach, conclusion } = args as {
                    problem: string;
                    approach: string;
                    conclusion: string;
                };
                logger.agent('Deep thinking', { problem: problem.slice(0, 100) });
                return {
                    thought: true,
                    problem,
                    reasoning: approach,
                    conclusion,
                };
            }
        );

        // Request clarification tool
        this.registerTool(
            {
                name: 'ask_clarification',
                description: 'Ask the user for clarification when the request is ambiguous or missing critical details',
                parameters: {
                    type: 'object',
                    properties: {
                        question: {
                            type: 'string',
                            description: 'The clarifying question to ask',
                        },
                        options: {
                            type: 'array',
                            description: 'Optional list of choices to present to the user',
                            items: { type: 'string', description: 'A choice option' },
                        },
                        context: {
                            type: 'string',
                            description: 'Why this clarification is needed',
                        },
                    },
                    required: ['question'],
                },
                category: 'system',
            },
            async (args) => {
                const { question, options, context } = args as {
                    question: string;
                    options?: string[];
                    context?: string;
                };
                return {
                    type: 'clarification_needed',
                    question,
                    options,
                    context,
                };
            }
        );

        // Feedback tool - for self-improvement loop
        this.registerTool(
            {
                name: 'give_feedback',
                description: 'Record user feedback to help JARVIS learn and improve. Use this when the user expresses satisfaction, dissatisfaction, or provides corrections about your behavior.',
                parameters: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            description: 'Type of feedback',
                            enum: ['positive', 'negative', 'correction', 'preference'],
                        },
                        message: {
                            type: 'string',
                            description: 'The feedback message or what the user said',
                        },
                        category: {
                            type: 'string',
                            description: 'Category of feedback',
                            enum: ['response_quality', 'task_execution', 'communication_style', 'tool_usage', 'memory_accuracy', 'proactivity', 'general'],
                        },
                        context: {
                            type: 'object',
                            description: 'Additional context',
                            properties: {
                                lastAgentResponse: { type: 'string', description: 'What JARVIS said that prompted feedback' },
                                userQuery: { type: 'string', description: 'The original user query' },
                            },
                        },
                    },
                    required: ['type', 'message'],
                },
                category: 'system',
            },
            async (args) => {
                const { type, message, category, context } = args as {
                    type: 'positive' | 'negative' | 'correction' | 'preference';
                    message: string;
                    category?: 'response_quality' | 'task_execution' | 'communication_style' | 'tool_usage' | 'memory_accuracy' | 'proactivity' | 'general';
                    context?: { lastAgentResponse?: string; userQuery?: string };
                };

                const { getFeedbackManager } = await import('../soul/index.js');
                const feedbackManager = getFeedbackManager();
                await feedbackManager.initialize();

                const entry = await feedbackManager.recordFeedback(
                    type,
                    message,
                    category ?? 'general',
                    context
                );

                logger.info('Recorded user feedback', { id: entry.id, type, category });

                return {
                    recorded: true,
                    feedbackId: entry.id,
                    type,
                    message: `Feedback recorded. ${type === 'positive' ? 'Thank you!' : 'I will learn from this.'}`
                };
            }
        );

        // Learnings tool - to see what JARVIS has learned
        this.registerTool(
            {
                name: 'my_learnings',
                description: 'Retrieve learned behaviors and feedback statistics. Use this to show the user what JARVIS has learned from past feedback.',
                parameters: {
                    type: 'object',
                    properties: {
                        showStats: {
                            type: 'boolean',
                            description: 'Include feedback statistics',
                        },
                    },
                },
                category: 'system',
            },
            async (args) => {
                const { showStats } = args as { showStats?: boolean };

                const { getFeedbackManager } = await import('../soul/index.js');
                const feedbackManager = getFeedbackManager();
                await feedbackManager.initialize();

                const learnings = feedbackManager.getActiveLearnings();
                const stats = showStats ? feedbackManager.getStatistics() : null;

                return {
                    learnings: learnings.map(l => ({
                        id: l.id,
                        description: l.description,
                        learnedAt: l.learnedAt.toISOString(),
                        active: l.active,
                    })),
                    learningsCount: learnings.length,
                    statistics: stats,
                    learningsContext: feedbackManager.getLearningsContext(),
                };
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createMainAgent(options: MainAgentOptions = {}): MainAgent {
    return new MainAgent(options);
}
