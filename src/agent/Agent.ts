/**
 * JARVIS Base Agent
 * 
 * Abstract base class implementing the core agent loop:
 * Think → Decide → Act → Observe
 * 
 * All specialized agents extend this class.
 */

import type {
    Message,
    ToolDefinition,
    ToolCall,
    ToolResult,
    AgentResponse,
    AgentMetadata,
    AgentContext,
    AgentExecutionResult,
    ApprovalCallback,
    ApprovalRequest,
} from './types.js';
import { ContextManager } from '../context/ContextManager.js';
import { getProviderManager, type LLMProvider } from '../providers/index.js';
import { getTieredProviderManager, initializeTieredProvider, type TieredProviderManager } from '../providers/index.js';
import { logger } from '../utils/logger.js';
import {
    AgentError,
    ToolApprovalRequiredError,
    ToolApprovalDeniedError,
    ToolExecutionError,
} from '../utils/errors.js';
import { getConfig, isProductivityVariant } from '../config/index.js';
import { randomUUID } from 'crypto';
import { getCapabilityManager, type CapabilityManager } from '../security/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentOptions {
    name: string;
    systemPrompt: string;
    tools?: ToolDefinition[];
    maxIterations?: number;
    onApprovalRequired?: ApprovalCallback;
    memory?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Base Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export abstract class Agent {
    protected name: string;
    protected systemPrompt: string;
    protected tools: Map<string, ToolDefinition> = new Map();
    protected toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>> = new Map();
    protected contextManager: ContextManager;
    protected provider: LLMProvider | null = null;
    protected maxIterations: number;
    protected onApprovalRequired: ApprovalCallback | null;
    protected capabilityManager: CapabilityManager;
    protected tieredProvider: TieredProviderManager | null = null;

    constructor(options: AgentOptions) {
        this.name = options.name;
        this.systemPrompt = options.systemPrompt;
        this.maxIterations = options.maxIterations ?? 10;
        this.onApprovalRequired = options.onApprovalRequired ?? null;

        this.contextManager = new ContextManager({
            systemPrompt: options.systemPrompt,
            memory: options.memory,
        });

        // Initialize security capability manager
        this.capabilityManager = getCapabilityManager();

        // Register provided tools
        if (options.tools) {
            for (const tool of options.tools) {
                this.registerTool(tool);
            }
        }
    }

    /**
     * Get agent metadata
     */
    abstract getMetadata(): AgentMetadata;

    /**
     * Initialize the agent (called before first use)
     */
    async initialize(): Promise<void> {
        const providerManager = getProviderManager();
        this.provider = await providerManager.getProvider();
        this.contextManager.setProvider(this.provider);

        // If Productivity variant, attempt to initialize tiered inference
        if (isProductivityVariant()) {
            try {
                this.tieredProvider = await initializeTieredProvider();
                await this.tieredProvider.initialize();
                logger.agent(`${this.name} tiered inference enabled: local=${this.tieredProvider.getLocalProviderName()}, cloud=${this.tieredProvider.getCloudProviderName()}`);
            } catch (err) {
                logger.warn(`Tiered inference unavailable, using standard provider: ${err}`);
                this.tieredProvider = null;
            }
        }

        logger.agent(`${this.name} initialized with ${this.provider.name}`);
    }

    /**
     * Main execution method - runs the agent loop
     */
    async execute(userMessage: string): Promise<AgentExecutionResult> {
        if (!this.provider) {
            await this.initialize();
        }

        logger.agent(`${this.name} executing`, { messageLength: userMessage.length });

        // Add user message to context
        this.contextManager.addMessage({
            role: 'user',
            content: userMessage,
        });

        let iteration = 0;
        let finalContent = '';
        const allToolResults: ToolResult[] = [];

        // Agent loop: Think → Decide → Act → Observe
        while (iteration < this.maxIterations) {
            iteration++;
            logger.agent(`${this.name} iteration ${iteration}/${this.maxIterations}`);

            // Think: Generate response from LLM
            const response = await this.think();

            // Check if we need to use tools
            if (response.toolCalls && response.toolCalls.length > 0) {
                // Act: Execute tools
                const toolResults = await this.act(response.toolCalls);
                allToolResults.push(...toolResults);

                // Observe: Add results to context and continue loop
                this.observe(response, toolResults);
            } else {
                // No tools needed - we're done
                finalContent = response.content;

                // Add assistant response to context
                this.contextManager.addMessage({
                    role: 'assistant',
                    content: finalContent,
                });

                break;
            }
        }

        if (iteration >= this.maxIterations) {
            logger.warn(`${this.name} reached max iterations`);
            finalContent = finalContent || 'I apologize, but I was unable to complete the task within the allowed iterations.';
        }

        return {
            response: {
                content: finalContent,
                toolCalls: undefined,
                finishReason: 'stop',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                model: this.provider?.model ?? 'unknown',
                provider: this.provider?.name ?? 'unknown',
            },
            toolResults: allToolResults.length > 0 ? allToolResults : undefined,
            finalContent,
            conversationHistory: this.contextManager.getMessages(),
        };
    }

    /**
     * Register a tool with its handler
     */
    registerTool(
        definition: ToolDefinition,
        handler?: (args: Record<string, unknown>) => Promise<unknown>
    ): void {
        this.tools.set(definition.name, definition);
        if (handler) {
            this.toolHandlers.set(definition.name, handler);
        }
        logger.debug(`Registered tool: ${definition.name}`);
    }

    /**
     * Get all registered tool definitions
     */
    getToolDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Add memory context
     */
    setMemory(memory: string): void {
        this.contextManager.setMemory(memory);
    }

    /**
     * Get conversation context
     */
    getContext(): AgentContext {
        return {
            messages: this.contextManager.getMessages(),
            systemPrompt: this.systemPrompt,
            tools: this.getToolDefinitions(),
            memory: undefined, // Memory is part of system prompt
        };
    }

    /**
     * Clear conversation history
     */
    clearHistory(): void {
        this.contextManager.clearMessages();
        logger.agent(`${this.name} history cleared`);
    }

    /**
     * Convenience method - run a single message and get response
     */
    async run(userMessage: string): Promise<AgentResponse> {
        const result = await this.execute(userMessage);
        return result.response;
    }

    /**
     * Streaming version of run (yields chunks as they come)
     * Uses the provider's native streaming with tool execution inline.
     */
    async *runStream(userMessage: string): AsyncGenerator<import('./types.js').StreamChunk> {
        if (!this.provider) {
            await this.initialize();
        }

        logger.agent(`${this.name} streaming execution`, { messageLength: userMessage.length });

        // Add user message to context
        this.contextManager.addMessage({
            role: 'user',
            content: userMessage,
        });

        let iteration = 0;
        let finalContent = '';
        let done = false;

        // Agent loop: Think → Act → Observe (streaming version)
        while (iteration < this.maxIterations && !done) {
            iteration++;

            // Get current context
            const messages = this.contextManager.getMessages();
            const systemPrompt = this.contextManager.getFullSystemPrompt();
            const tools = Array.from(this.tools.values());

            // Stream response from provider
            const stream = this.provider!.streamResponse(messages, systemPrompt, tools);

            let toolCalls: ToolCall[] = [];
            let currentToolCall: Partial<ToolCall> | null = null;

            for await (const chunk of stream) {
                // Yield all chunks to caller
                yield chunk;

                // Track tool calls for execution
                if (chunk.type === 'tool_call_start' && chunk.toolCall) {
                    currentToolCall = { ...chunk.toolCall };
                } else if (chunk.type === 'tool_call_end' && chunk.toolCall) {
                    toolCalls.push(chunk.toolCall as ToolCall);
                    currentToolCall = null;
                } else if (chunk.type === 'text' && chunk.content) {
                    finalContent += chunk.content;
                } else if (chunk.type === 'done') {
                    // Check if we need to execute tools
                    if (toolCalls.length > 0) {
                        // Execute tools
                        const toolResults = await this.act(toolCalls);

                        // Yield tool results
                        for (const result of toolResults) {
                            yield {
                                type: 'tool_call_end',
                                content: JSON.stringify(result.result),
                                toolCall: { id: result.toolCallId, name: '', arguments: {} },
                            };
                        }

                        // Add tool results to context and continue loop
                        this.observe({ content: finalContent, toolCalls, finishReason: 'tool_use', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, model: '', provider: '' }, toolResults);

                        // Reset for next iteration
                        finalContent = '';
                        toolCalls = [];
                    } else {
                        // No tools, we're done
                        done = true;

                        // Add assistant response to context
                        this.contextManager.addMessage({
                            role: 'assistant',
                            content: finalContent,
                        });
                    }
                }
            }
        }

        // Yield final done
        yield { type: 'done', content: finalContent };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Protected Methods (Override in subclasses)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Think: Generate a response from the LLM
     */
    protected async think(): Promise<AgentResponse> {
        if (!this.provider) {
            throw new AgentError(this.name, 'Provider not initialized');
        }

        const messages = this.contextManager.getOptimizedMessages();
        const systemPrompt = this.contextManager.getFullSystemPrompt();
        const tools = this.getToolDefinitions();

        logger.agent(`${this.name} thinking`, {
            messageCount: messages.length,
            toolCount: tools.length,
        });

        // Use tiered routing if available
        if (this.tieredProvider && this.tieredProvider.isTieringEnabled()) {
            const lastUserMsg = messages.filter(m => m.role === 'user').pop();
            const userText = lastUserMsg?.content ?? '';

            if (this.tieredProvider.shouldUseLocalModel(userText, tools.length > 0)) {
                try {
                    const tieredResponse = await this.tieredProvider.generateResponse(
                        messages,
                        systemPrompt,
                        tools.length > 0 ? tools : undefined
                    );

                    logger.agent(`${this.name} tiered response: tier=${tieredResponse.tier}, complexity=${tieredResponse.complexity.level}`);

                    // tieredResponse wraps an AgentResponse, return the underlying one
                    return {
                        content: (tieredResponse as any).content ?? '',
                        toolCalls: (tieredResponse as any).toolCalls,
                        finishReason: (tieredResponse as any).finishReason ?? 'stop',
                        usage: (tieredResponse as any).usage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                        model: (tieredResponse as any).model ?? 'tiered',
                        provider: (tieredResponse as any).provider ?? tieredResponse.tier,
                    };
                } catch (err) {
                    logger.warn(`Tiered routing failed, falling back to standard: ${err}`);
                }
            }
        }

        const response = await this.provider.generateResponse(
            messages,
            systemPrompt,
            tools.length > 0 ? tools : undefined
        );

        logger.agent(`${this.name} thought complete`, {
            hasContent: !!response.content,
            toolCalls: response.toolCalls?.length ?? 0,
            tokens: response.usage.totalTokens,
        });

        return response;
    }

    /**
     * Act: Execute tool calls
     */
    protected async act(toolCalls: ToolCall[]): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const toolCall of toolCalls) {
            logger.tool(toolCall.name, 'Executing', { args: toolCall.arguments });

            try {
                // Check if approval is required
                await this.checkToolApproval(toolCall);

                // Execute the tool
                const result = await this.executeTool(toolCall);

                results.push({
                    toolCallId: toolCall.id,
                    result,
                });

                logger.tool(toolCall.name, 'Completed', {
                    resultType: typeof result,
                    resultLength: typeof result === 'string' ? result.length : undefined,
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                results.push({
                    toolCallId: toolCall.id,
                    result: null,
                    error: errorMessage,
                });

                logger.tool(toolCall.name, 'Failed', { error: errorMessage });
            }
        }

        return results;
    }

    /**
     * Observe: Process tool results and add to context
     */
    protected observe(response: AgentResponse, toolResults: ToolResult[]): void {
        // Add assistant response with tool calls to context
        let assistantContent = response.content || '';

        if (response.toolCalls) {
            const toolCallSummary = response.toolCalls
                .map(tc => `[Calling ${tc.name}]`)
                .join(' ');
            assistantContent = assistantContent
                ? `${assistantContent}\n${toolCallSummary}`
                : toolCallSummary;
        }

        this.contextManager.addMessage({
            role: 'assistant',
            content: assistantContent,
        });

        // Add tool results as user messages (simulating the tool output)
        for (const result of toolResults) {
            const toolCall = response.toolCalls?.find(tc => tc.id === result.toolCallId);
            const toolName = toolCall?.name ?? 'unknown';

            let resultContent: string;
            if (result.error) {
                resultContent = `[Tool ${toolName} error: ${result.error}]`;
            } else {
                resultContent = `[Tool ${toolName} result: ${JSON.stringify(result.result)}]`;
            }

            this.contextManager.addMessage({
                role: 'user',
                content: resultContent,
            });
        }
    }

    /**
     * Execute a specific tool
     */
    protected async executeTool(toolCall: ToolCall): Promise<unknown> {
        const handler = this.toolHandlers.get(toolCall.name);

        if (!handler) {
            throw new ToolExecutionError(
                toolCall.name,
                `No handler registered for tool: ${toolCall.name}`
            );
        }

        return handler(toolCall.arguments);
    }

    /**
     * Check if a tool requires approval and get it
     * Uses CapabilityManager for enhanced security checks
     */
    protected async checkToolApproval(toolCall: ToolCall): Promise<void> {
        const config = getConfig();
        const toolDef = this.tools.get(toolCall.name);

        if (!toolDef) return;

        // First check with CapabilityManager for security policy
        const securityCheck = await this.capabilityManager.checkPermission(
            toolCall.name,
            toolCall.arguments
        );

        // If blocked by security policy, deny immediately
        if (!securityCheck.allowed) {
            // Log the denial
            await this.capabilityManager.logExecution(
                toolCall.name,
                [],
                toolCall.arguments,
                'denied',
                'policy'
            );

            throw new ToolApprovalDeniedError(
                toolCall.name,
                securityCheck.reason ?? 'Blocked by security policy'
            );
        }

        // Determine if approval is needed based on mode, tool danger level, AND security check
        const needsApproval = securityCheck.requiresApproval ||
            this.toolNeedsApproval(toolDef, config.toolApproval.mode);

        if (!needsApproval) {
            // Log auto-approved execution
            await this.capabilityManager.logExecution(
                toolCall.name,
                [],
                toolCall.arguments,
                'auto-approved',
                'auto'
            );
            return;
        }

        if (!this.onApprovalRequired) {
            throw new ToolApprovalRequiredError(
                toolCall.name,
                'No approval callback configured for dangerous operation'
            );
        }

        const request: ApprovalRequest = {
            id: randomUUID(),
            toolName: toolCall.name,
            operation: toolDef.description,
            description: `Execute ${toolCall.name} with arguments: ${JSON.stringify(toolCall.arguments)}`,
            arguments: toolCall.arguments,
            risk: securityCheck.riskLevel === 'destructive' || securityCheck.riskLevel === 'dangerous'
                ? 'high'
                : toolDef.dangerous ? 'high' : 'medium',
            createdAt: new Date(),
        };

        logger.agent(`${this.name} requesting approval`, {
            tool: toolCall.name,
            riskLevel: securityCheck.riskLevel,
        });

        const response = await this.onApprovalRequired(request);

        if (!response.approved) {
            // Log the denial
            await this.capabilityManager.logExecution(
                toolCall.name,
                [],
                toolCall.arguments,
                'denied',
                'user'
            );

            throw new ToolApprovalDeniedError(
                toolCall.name,
                response.reason ?? 'User denied the operation'
            );
        }

        // Log the approval
        await this.capabilityManager.logExecution(
            toolCall.name,
            [],
            toolCall.arguments,
            'approved',
            'user'
        );

        logger.agent(`${this.name} approval granted`, { tool: toolCall.name });
    }

    /**
     * Determine if a tool needs approval based on mode
     */
    private toolNeedsApproval(tool: ToolDefinition, mode: string): boolean {
        switch (mode) {
            case 'conservative':
                // All potentially dangerous tools need approval
                return tool.dangerous === true ||
                    tool.category === 'filesystem' ||
                    tool.category === 'terminal' ||
                    tool.category === 'web';

            case 'balanced':
                // Only explicitly dangerous tools need approval
                return tool.dangerous === true;

            case 'trust':
                // No approval needed
                return false;

            default:
                return tool.dangerous === true;
        }
    }
}
