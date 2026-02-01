/**
 * JARVIS Gateway Handlers
 * 
 * Agent-specific handlers for the Gateway that enable
 * clients to interact with JARVIS.
 */

import type { Gateway, GatewaySession } from './Gateway.js';
import { SkillAwareAgent, createSkillAgent, type CreateSkillAgentOptions } from '../agent/SkillAwareAgent.js';
import { initializeSkills, getSkillRegistry } from '../skills/index.js';
import type { Message, StreamChunk } from '../agent/types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Session Store
// ═══════════════════════════════════════════════════════════════════════════════

interface AgentSession {
    agent: SkillAwareAgent;
    conversationHistory: Message[];
    createdAt: Date;
    lastActivity: Date;
}

const agentSessions: Map<string, AgentSession> = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// Handler Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface JarvisHandlerOptions {
    defaultWorkspaceDir?: string;
    maxConversationHistory?: number;
    autoInitSkills?: boolean;
    agentOptions?: Partial<CreateSkillAgentOptions>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Register JARVIS Handlers
// ═══════════════════════════════════════════════════════════════════════════════

export async function registerJarvisHandlers(
    gateway: Gateway,
    options: JarvisHandlerOptions = {}
): Promise<void> {
    const {
        defaultWorkspaceDir = process.cwd(),
        maxConversationHistory = 100,
        autoInitSkills = true,
        agentOptions = {},
    } = options;

    // Initialize skills if requested
    if (autoInitSkills) {
        initializeSkills();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Chat Handler - Main conversation endpoint
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('chat', async (session, params) => {
        const message = params['message'] as string;
        const stream = params['stream'] as boolean;
        const workspaceDir = (params['workspaceDir'] as string) ?? defaultWorkspaceDir;

        if (!message) {
            throw new Error('Message is required');
        }

        // Get or create agent session
        let agentSession = agentSessions.get(session.id);
        if (!agentSession) {
            agentSession = createAgentSession(session, workspaceDir, agentOptions);
            agentSessions.set(session.id, agentSession);
        }

        agentSession.lastActivity = new Date();

        // Add user message to history
        const userMessage: Message = {
            role: 'user',
            content: message,
            timestamp: new Date(),
        };
        agentSession.conversationHistory.push(userMessage);

        // Trim history if needed
        if (agentSession.conversationHistory.length > maxConversationHistory) {
            agentSession.conversationHistory = agentSession.conversationHistory.slice(-maxConversationHistory);
        }

        logger.agent('Chat request', {
            sessionId: session.id,
            messageLength: message.length,
            stream,
        });

        try {
            if (stream) {
                // Streaming response
                let fullContent = '';

                for await (const chunk of agentSession.agent.runStream(userMessage.content)) {
                    gateway.sendStreamChunk(session.id, chunk);
                    if (chunk.content) {
                        fullContent += chunk.content;
                    }
                }

                // Add assistant response to history
                agentSession.conversationHistory.push({
                    role: 'assistant',
                    content: fullContent,
                    timestamp: new Date(),
                });

                return { success: true, streamed: true };
            } else {
                // Non-streaming response
                const response = await agentSession.agent.run(userMessage.content);

                // Add assistant response to history
                agentSession.conversationHistory.push({
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date(),
                });

                return {
                    content: response.content,
                    toolCalls: response.toolCalls,
                    usage: response.usage,
                };
            }
        } catch (error) {
            logger.error('Chat error', {
                sessionId: session.id,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            throw error;
        }
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Get Conversation History
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('getHistory', async (session) => {
        const agentSession = agentSessions.get(session.id);

        return {
            history: agentSession?.conversationHistory ?? [],
            count: agentSession?.conversationHistory.length ?? 0,
        };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Clear Conversation History
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('clearHistory', async (session) => {
        const agentSession = agentSessions.get(session.id);
        if (agentSession) {
            agentSession.conversationHistory = [];
        }

        return { success: true };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Execute Tool Directly
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('executeTool', async (session, params) => {
        const toolName = params['tool'] as string;
        const toolArgs = (params['args'] as Record<string, unknown>) ?? {};
        const workspaceDir = (params['workspaceDir'] as string) ?? defaultWorkspaceDir;

        if (!toolName) {
            throw new Error('Tool name is required');
        }

        const registry = getSkillRegistry();
        const skill = registry.get(toolName);

        if (!skill) {
            throw new Error(`Skill not found: ${toolName}`);
        }

        // Check if skill is dangerous - require explicit confirmation
        if (skill.dangerous && !params['confirmed']) {
            return {
                requiresConfirmation: true,
                skill: skill.name,
                description: skill.description,
                dangerous: true,
            };
        }

        logger.agent('Direct tool execution', {
            sessionId: session.id,
            tool: toolName,
        });

        const result = await registry.execute(toolName, toolArgs, {
            workspaceDir,
            userId: session.userId,
            sessionId: session.id,
        });

        return { result };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // List Available Tools
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('listTools', async () => {
        const registry = getSkillRegistry();
        const tools = registry.getAll().map(skill => ({
            name: skill.name,
            category: skill.category,
            description: skill.description,
            dangerous: skill.dangerous,
        }));

        return {
            tools,
            count: tools.length,
        };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Get Agent Status
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('getStatus', async (session) => {
        const agentSession = agentSessions.get(session.id);

        if (!agentSession) {
            return {
                hasAgent: false,
            };
        }

        const metadata = agentSession.agent.getMetadata();

        return {
            hasAgent: true,
            agentName: metadata.name,
            agentType: metadata.type,
            capabilities: metadata.capabilities,
            historyLength: agentSession.conversationHistory.length,
            createdAt: agentSession.createdAt.toISOString(),
            lastActivity: agentSession.lastActivity.toISOString(),
        };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Reset Agent Session
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.registerHandler('resetAgent', async (session, params) => {
        const workspaceDir = (params['workspaceDir'] as string) ?? defaultWorkspaceDir;

        // Remove old session
        agentSessions.delete(session.id);

        // Create new session
        const agentSession = createAgentSession(session, workspaceDir, agentOptions);
        agentSessions.set(session.id, agentSession);

        return {
            success: true,
            agentName: agentSession.agent.getMetadata().name,
        };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Cleanup on disconnect
    // ─────────────────────────────────────────────────────────────────────────────

    gateway.on('disconnected', (disconnectedSession: GatewaySession) => {
        agentSessions.delete(disconnectedSession.id);
        logger.agent('Agent session cleaned up', { sessionId: disconnectedSession.id });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Heartbeat/Scheduler Handlers
    // ─────────────────────────────────────────────────────────────────────────────

    // Get the scheduler instance and wire it up
    const { getHeartbeatScheduler } = await import('./HeartbeatScheduler.js');
    const scheduler = getHeartbeatScheduler();

    // Register preset tasks if not already registered
    if (scheduler.getTasks().length === 0) {
        scheduler.registerPresets();
    }

    // Wire task execution to create an agent and run the prompt
    scheduler.onTask(async (task) => {
        logger.gateway('Executing heartbeat task via agent', { taskId: task.id, name: task.name });

        try {
            // Create a temporary agent for the task
            const taskAgent = createSkillAgent({
                ...agentOptions,
                workspaceDir: defaultWorkspaceDir,
            });

            await taskAgent.initialize();
            const result = await taskAgent.execute(task.prompt);

            // Broadcast the result to all connected clients
            gateway.broadcast('heartbeat.result', {
                taskId: task.id,
                taskName: task.name,
                content: result.finalContent,
                timestamp: new Date().toISOString(),
            });

            logger.gateway('Heartbeat task completed', { taskId: task.id, contentLength: result.finalContent.length });
        } catch (error) {
            logger.error('Heartbeat task execution failed', {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error),
            });

            gateway.broadcast('heartbeat.error', {
                taskId: task.id,
                taskName: task.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    });

    // Start the scheduler
    scheduler.start();
    logger.gateway('HeartbeatScheduler started with task handlers');

    // List all heartbeat tasks
    gateway.registerHandler('heartbeat.list', async () => {
        const tasks = scheduler.getTasks();
        return {
            tasks: tasks.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                schedule: t.schedule,
                enabled: t.enabled,
                nextRun: t.nextRun?.toISOString(),
                lastRun: t.lastRun?.toISOString(),
                runCount: t.runCount,
                priority: t.priority,
            })),
            schedulerActive: scheduler.isActive(),
        };
    });

    // Get a specific task
    gateway.registerHandler('heartbeat.get', async (_session, params) => {
        const taskId = params['taskId'] as string;
        if (!taskId) throw new Error('taskId is required');

        const task = scheduler.getTask(taskId);
        if (!task) throw new Error('Task not found');

        return {
            id: task.id,
            name: task.name,
            description: task.description,
            schedule: task.schedule,
            prompt: task.prompt,
            enabled: task.enabled,
            nextRun: task.nextRun?.toISOString(),
            lastRun: task.lastRun?.toISOString(),
            runCount: task.runCount,
            priority: task.priority,
        };
    });

    // Enable/disable a task
    gateway.registerHandler('heartbeat.setEnabled', async (_session, params) => {
        const taskId = params['taskId'] as string;
        const enabled = params['enabled'] as boolean;

        if (!taskId) throw new Error('taskId is required');
        if (typeof enabled !== 'boolean') throw new Error('enabled must be a boolean');

        const success = scheduler.setTaskEnabled(taskId, enabled);
        if (!success) throw new Error('Task not found');

        const task = scheduler.getTask(taskId);
        return {
            success: true,
            taskId,
            enabled,
            nextRun: task?.nextRun?.toISOString(),
        };
    });

    // Manually trigger a task
    gateway.registerHandler('heartbeat.trigger', async (_session, params) => {
        const taskId = params['taskId'] as string;
        if (!taskId) throw new Error('taskId is required');

        const task = scheduler.getTask(taskId);
        if (!task) throw new Error('Task not found');

        // Trigger asynchronously so we can return immediately
        scheduler.triggerTask(taskId).catch(err => {
            logger.error('Manual task trigger failed', { taskId, error: err.message });
        });

        return {
            success: true,
            taskId,
            taskName: task.name,
            message: 'Task triggered, results will be broadcast',
        };
    });

    // Register a custom task
    gateway.registerHandler('heartbeat.register', async (_session, params) => {
        const name = params['name'] as string;
        const description = params['description'] as string;
        const schedule = params['schedule'] as string;
        const prompt = params['prompt'] as string;
        const enabled = (params['enabled'] as boolean) ?? false;
        const priority = (params['priority'] as number) ?? 5;

        if (!name || !description || !schedule || !prompt) {
            throw new Error('name, description, schedule, and prompt are required');
        }

        const task = scheduler.registerTask({
            name,
            description,
            schedule,
            prompt,
            enabled,
            priority,
        });

        return {
            success: true,
            task: {
                id: task.id,
                name: task.name,
                schedule: task.schedule,
                enabled: task.enabled,
                nextRun: task.nextRun?.toISOString(),
            },
        };
    });

    // Delete a task
    gateway.registerHandler('heartbeat.delete', async (_session, params) => {
        const taskId = params['taskId'] as string;
        if (!taskId) throw new Error('taskId is required');

        const success = scheduler.unregisterTask(taskId);
        return { success, taskId };
    });

    // Update task schedule
    gateway.registerHandler('heartbeat.updateSchedule', async (_session, params) => {
        const taskId = params['taskId'] as string;
        const schedule = params['schedule'] as string;

        if (!taskId || !schedule) throw new Error('taskId and schedule are required');

        const success = scheduler.updateTaskSchedule(taskId, schedule);
        if (!success) throw new Error('Task not found or invalid cron expression');

        const task = scheduler.getTask(taskId);
        return {
            success: true,
            taskId,
            schedule,
            nextRun: task?.nextRun?.toISOString(),
        };
    });

    logger.agent('JARVIS handlers registered (including heartbeat)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function createAgentSession(
    session: GatewaySession,
    workspaceDir: string,
    options: Partial<CreateSkillAgentOptions>
): AgentSession {
    const agent = createSkillAgent({
        ...options,
        workspaceDir,
        userId: session.userId,
        sessionId: session.id,
    });

    return {
        agent,
        conversationHistory: [],
        createdAt: new Date(),
        lastActivity: new Date(),
    };
}

/**
 * Get stats about active agent sessions
 */
export function getAgentSessionStats(): {
    activeSessions: number;
    totalMessages: number;
} {
    let totalMessages = 0;
    for (const session of agentSessions.values()) {
        totalMessages += session.conversationHistory.length;
    }

    return {
        activeSessions: agentSessions.size,
        totalMessages,
    };
}
