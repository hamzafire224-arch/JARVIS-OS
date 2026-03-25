/**
 * JARVIS Agent Collaborator (Tier 2 AGI Upgrade)
 * 
 * Multi-agent collaboration with shared Blackboard:
 * 1. MainAgent decomposes a complex task into subtasks
 * 2. Routes subtasks to specialized agents (Coder, Researcher, Personal)
 * 3. Agents execute in parallel, posting results to Blackboard
 * 4. MainAgent synthesizes a unified response
 * 
 * This is the key differentiator: JARVIS doesn't just route,
 * it orchestrates multiple AI minds working together.
 */

import type { Agent } from './Agent.js';
import type { AgentResponse } from './types.js';
import { getAgentRegistry, IntentClassifier, type AgentRegistry } from './AgentRegistry.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// Blackboard — Shared Context Store
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlackboardEntry {
    id: string;
    agentName: string;
    subtask: string;
    result: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    startedAt: number;
    completedAt?: number;
    error?: string;
}

/**
 * Shared Blackboard where agents post findings.
 * MainAgent reads this to synthesize the final response.
 */
export class Blackboard {
    private entries: Map<string, BlackboardEntry> = new Map();

    post(entry: Omit<BlackboardEntry, 'id'>): string {
        const id = randomUUID();
        this.entries.set(id, { ...entry, id });
        return id;
    }

    update(id: string, updates: Partial<BlackboardEntry>): void {
        const entry = this.entries.get(id);
        if (entry) {
            Object.assign(entry, updates);
        }
    }

    getAll(): BlackboardEntry[] {
        return Array.from(this.entries.values());
    }

    getSuccessful(): BlackboardEntry[] {
        return this.getAll().filter(e => e.status === 'success');
    }

    getFailed(): BlackboardEntry[] {
        return this.getAll().filter(e => e.status === 'failed');
    }

    getSummary(): string {
        const entries = this.getAll();
        if (entries.length === 0) return 'No subtask results available.';

        return entries.map(e => {
            const status = e.status === 'success' ? '✅' : e.status === 'failed' ? '❌' : '⏳';
            const duration = e.completedAt ? `${e.completedAt - e.startedAt}ms` : 'pending';
            return `${status} [${e.agentName}] ${e.subtask} (${duration})\n   Result: ${(e.result || e.error || 'pending').slice(0, 200)}`;
        }).join('\n\n');
    }

    clear(): void {
        this.entries.clear();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Collaboration Plan
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubtaskAssignment {
    subtask: string;
    agentName: string;
    mode: 'parallel' | 'sequential';
    priority: number; // Lower = higher priority
}

export interface CollaborationPlan {
    originalGoal: string;
    assignments: SubtaskAssignment[];
    synthesisPrompt: string; // How MainAgent should merge results
}

// ═══════════════════════════════════════════════════════════════════════════════
// Collaboration Progress Callbacks
// ═══════════════════════════════════════════════════════════════════════════════

export interface CollaborationCallbacks {
    onPlanCreated?: (plan: CollaborationPlan) => void;
    onAgentStart?: (agentName: string, subtask: string) => void;
    onAgentComplete?: (agentName: string, subtask: string, success: boolean) => void;
    onSynthesisStart?: () => void;
    onComplete?: (result: string, durationMs: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Collaborator
// ═══════════════════════════════════════════════════════════════════════════════

export class AgentCollaborator {
    private registry: AgentRegistry;
    private classifier: IntentClassifier;

    constructor(registry?: AgentRegistry) {
        this.registry = registry ?? getAgentRegistry();
        this.classifier = new IntentClassifier();
    }

    /**
     * Determine if a message warrants multi-agent collaboration.
     * Triggers when the task is complex enough to benefit from parallel processing.
     */
    shouldCollaborate(message: string): boolean {
        const intent = this.classifier.classify(message);
        const wordCount = message.split(/\s+/).length;

        // Complex tasks: long messages or ones that span multiple categories
        const isLong = wordCount > 30;
        const hasMultipleKeywords = intent.keywords.length >= 3;

        // Check for collaboration-triggering phrases
        const collabPhrases = [
            'research and implement', 'analyze and build', 'compare and create',
            'full stack', 'end to end', 'comprehensive', 'complete solution',
            'plan and execute', 'design and implement',
        ];
        const hasCollabPhrase = collabPhrases.some(phrase =>
            message.toLowerCase().includes(phrase)
        );

        return (isLong && hasMultipleKeywords) || hasCollabPhrase;
    }

    /**
     * Create a collaboration plan from a user message.
     * Uses intent analysis to determine which agents should participate.
     */
    createPlan(message: string, mainAgent: Agent): CollaborationPlan {
        const intent = this.classifier.classify(message);
        const assignments: SubtaskAssignment[] = [];

        // Always include the main agent for coordination
        const availableAgents = this.registry.getAll();
        const agentNames = new Set(availableAgents.map(a => a.getMetadata().name));

        // Assign research subtask if ResearcherAgent exists
        if (agentNames.has('ResearcherAgent')) {
            assignments.push({
                subtask: `Research and gather information relevant to: ${message}. Focus on best practices, existing solutions, and technical documentation.`,
                agentName: 'ResearcherAgent',
                mode: 'parallel',
                priority: 1,
            });
        }

        // Assign coding subtask if CoderAgent exists
        if (agentNames.has('CoderAgent')) {
            assignments.push({
                subtask: `Analyze the technical requirements and prepare implementation details for: ${message}. Focus on code structure, dependencies, and architecture.`,
                agentName: 'CoderAgent',
                mode: 'parallel',
                priority: 1,
            });
        }

        // Assign personal subtask if relevant and PersonalAgent exists
        if (agentNames.has('PersonalAgent') && (intent.category === 'personal' || message.toLowerCase().includes('schedule') || message.toLowerCase().includes('email'))) {
            assignments.push({
                subtask: `Check for any personal context (calendar, email, tasks) relevant to: ${message}`,
                agentName: 'PersonalAgent',
                mode: 'parallel',
                priority: 2,
            });
        }

        // If no sub-agents are available, main agent handles everything
        if (assignments.length === 0) {
            assignments.push({
                subtask: message,
                agentName: mainAgent.getMetadata().name,
                mode: 'sequential',
                priority: 1,
            });
        }

        return {
            originalGoal: message,
            assignments,
            synthesisPrompt: `You are synthesizing results from multiple JARVIS agents who worked in parallel on this request: "${message}".

Below are the findings from each agent. Merge them into a single, cohesive, high-quality response.
Do NOT list which agent said what — the user should see one unified answer.
Prioritize actionable information and concrete solutions.`,
        };
    }

    /**
     * Execute a collaborative multi-agent task.
     * 
     * @returns The synthesized response from MainAgent
     */
    async collaborate(
        message: string,
        mainAgent: Agent,
        callbacks?: CollaborationCallbacks
    ): Promise<string> {
        const startTime = Date.now();
        const blackboard = new Blackboard();

        // Create plan
        const plan = this.createPlan(message, mainAgent);
        callbacks?.onPlanCreated?.(plan);

        logger.info('[COLLAB] Collaboration plan created', {
            goal: plan.originalGoal,
            agents: plan.assignments.map(a => a.agentName),
        });

        // Group assignments by priority for parallel execution
        const priorityGroups = new Map<number, SubtaskAssignment[]>();
        for (const assignment of plan.assignments) {
            const group = priorityGroups.get(assignment.priority) ?? [];
            group.push(assignment);
            priorityGroups.set(assignment.priority, group);
        }

        // Execute each priority group
        const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => a - b);

        for (const priority of sortedPriorities) {
            const group = priorityGroups.get(priority)!;

            // Execute agents in parallel within the same priority level
            const agentPromises = group.map(async (assignment) => {
                const entryId = blackboard.post({
                    agentName: assignment.agentName,
                    subtask: assignment.subtask,
                    result: '',
                    status: 'running',
                    startedAt: Date.now(),
                });

                callbacks?.onAgentStart?.(assignment.agentName, assignment.subtask);

                try {
                    const agent = this.registry.get(assignment.agentName);
                    const response = await agent.run(assignment.subtask);

                    blackboard.update(entryId, {
                        status: 'success',
                        result: response.content,
                        completedAt: Date.now(),
                    });

                    callbacks?.onAgentComplete?.(assignment.agentName, assignment.subtask, true);

                    logger.info('[COLLAB] Agent completed subtask', {
                        agent: assignment.agentName,
                        durationMs: Date.now() - (blackboard.getAll().find(e => e.id === entryId)?.startedAt ?? Date.now()),
                    });
                } catch (err) {
                    blackboard.update(entryId, {
                        status: 'failed',
                        error: err instanceof Error ? err.message : String(err),
                        completedAt: Date.now(),
                    });

                    callbacks?.onAgentComplete?.(assignment.agentName, assignment.subtask, false);

                    logger.warn('[COLLAB] Agent failed subtask', {
                        agent: assignment.agentName,
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            });

            // Wait for all agents in this priority group
            await Promise.allSettled(agentPromises);
        }

        // Synthesis: MainAgent merges all results
        callbacks?.onSynthesisStart?.();

        const synthesisInput = `${plan.synthesisPrompt}

--- Agent Results ---
${blackboard.getSummary()}
--- End Results ---

Provide a unified response:`;

        let finalResponse: string;
        try {
            const synthesis = await mainAgent.run(synthesisInput);
            finalResponse = synthesis.content;
        } catch (err) {
            // If synthesis fails, concatenate results
            const successes = blackboard.getSuccessful();
            finalResponse = successes.length > 0
                ? successes.map(e => e.result).join('\n\n')
                : `Collaboration failed: ${err instanceof Error ? err.message : String(err)}`;
        }

        const durationMs = Date.now() - startTime;
        callbacks?.onComplete?.(finalResponse, durationMs);

        logger.info('[COLLAB] Collaboration complete', {
            durationMs,
            agentsUsed: plan.assignments.length,
            successful: blackboard.getSuccessful().length,
            failed: blackboard.getFailed().length,
        });

        return finalResponse;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let collaboratorInstance: AgentCollaborator | null = null;

export function getAgentCollaborator(): AgentCollaborator {
    if (!collaboratorInstance) {
        collaboratorInstance = new AgentCollaborator();
    }
    return collaboratorInstance;
}

export function resetAgentCollaborator(): void {
    collaboratorInstance = null;
}
