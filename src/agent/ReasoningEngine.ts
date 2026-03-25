/**
 * JARVIS Reasoning Engine (AGI Feature 5C)
 * 
 * Implements an advanced Reasoning Tree logic:
 * [Plan] -> [Execute Node] -> [Verify] -> [Reflect/Backtrack]
 * 
 * Allows JARVIS to formally define multi-step architectures and 
 * dynamically backtrack or branch execution if a step fails.
 * 
 * Tier 1 Upgrade: Added ProgressCallbacks for real-time visibility
 * and wired to the `/auto` REPL command.
 */

import { SkillAwareAgent } from './SkillAwareAgent.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

export interface ReasoningNode {
    id: string;
    description: string;
    dependencies: string[]; // Node IDs that must complete first
    status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
    result?: string;
    error?: string;
}

export interface ReasoningTree {
    goal: string;
    nodes: Record<string, ReasoningNode>;
}

/**
 * Progress callbacks for real-time execution visibility.
 * Used by the REPL `/auto` command and Gateway to display live updates.
 */
export interface ProgressCallbacks {
    onPlanStart?: (goal: string) => void;
    onPlanComplete?: (tree: ReasoningTree, nodeCount: number) => void;
    onNodeStart?: (node: ReasoningNode, iteration: number, maxIterations: number) => void;
    onNodeComplete?: (node: ReasoningNode, success: boolean) => void;
    onReplan?: (failedNode: ReasoningNode, patchNode: ReasoningNode) => void;
    onComplete?: (result: string, success: boolean) => void;
}

export class ReasoningEngine {
    private agent: SkillAwareAgent;

    constructor(agent: SkillAwareAgent) {
        this.agent = agent;
    }

    /**
     * Executes a complex goal using the Plan-Execute-Verify-Reflect loop.
     * Optionally accepts progress callbacks for real-time UI updates.
     */
    async executeComplexGoal(
        goal: string,
        onProgress?: ProgressCallbacks
    ): Promise<string> {
        logger.info('Initializing Reasoning Engine for complex goal', { goal });

        // Phase 1: PLAN
        onProgress?.onPlanStart?.(goal);
        const tree = await this.plan(goal);
        const nodeCount = Object.keys(tree.nodes).length;
        onProgress?.onPlanComplete?.(tree, nodeCount);

        // Phase 2: EXECUTE & VERIFY Loop
        const maxIterations = 20;
        let iteration = 0;
        
        while (iteration < maxIterations) {
            iteration++;
            const nextNode = this.getNextActionableNode(tree);

            if (!nextNode) {
                // Determine if we finished or deadlocked
                const failedNodes = Object.values(tree.nodes).filter(n => n.status === 'failed');
                const pendingNodes = Object.values(tree.nodes).filter(n => n.status === 'pending');
                
                if (pendingNodes.length === 0 && failedNodes.length === 0) {
                    const result = this.synthesizeFinalResult(tree);
                    onProgress?.onComplete?.(result, true);
                    return result;
                } else {
                    const result = `Reasoning Engine Deadlock: Unable to complete goal. Failed nodes: ${failedNodes.map(n => n.description).join(', ')}`;
                    onProgress?.onComplete?.(result, false);
                    return result;
                }
            }

            logger.info('Executing Node', { id: nextNode.id, description: nextNode.description });
            nextNode.status = 'executing';
            onProgress?.onNodeStart?.(nextNode, iteration, maxIterations);

            try {
                // Execute Step
                const stepResult = await this.executeNode(nextNode.description, tree);
                
                // Verify Step
                const isValid = await this.verifyNode(nextNode.description, stepResult.finalContent);
                
                if (isValid) {
                    nextNode.status = 'success';
                    nextNode.result = stepResult.finalContent;
                    onProgress?.onNodeComplete?.(nextNode, true);
                } else {
                    // Phase 3 & 4: REFLECT & BACKTRACK
                    logger.warn('Node verification failed. Reflecting and Backtracking.', { nodeId: nextNode.id });
                    nextNode.status = 'failed';
                    nextNode.error = 'Verification rejected execution result.';
                    onProgress?.onNodeComplete?.(nextNode, false);
                    const patchNode = await this.reflectAndReplan(tree, nextNode);
                    onProgress?.onReplan?.(nextNode, patchNode);
                }
            } catch (err) {
                nextNode.status = 'failed';
                nextNode.error = err instanceof Error ? err.message : String(err);
                onProgress?.onNodeComplete?.(nextNode, false);
                const patchNode = await this.reflectAndReplan(tree, nextNode);
                onProgress?.onReplan?.(nextNode, patchNode);
            }
        }

        const abortMsg = `Reasoning Engine Aborted: Exceeded max tree iterations (${maxIterations}).`;
        onProgress?.onComplete?.(abortMsg, false);
        return abortMsg;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Sub-Mechanics
    // ─────────────────────────────────────────────────────────────────────────────

    private async plan(goal: string): Promise<ReasoningTree> {
        const prompt = `You are the Planning Node of a Reasoning Engine.
Goal: ${goal}
Task: Break this down into an execution tree. Return strictly a JSON object (no markdown, no backticks) matching this interface:
{
  "goal": string,
  "nodes": {
    [id: string]: { "id": string, "description": string, "dependencies": string[], "status": "pending" }
  }
}`;
        // Standard agent run to generate the tree
        const response = await this.agent.run(prompt);
        let parsed: ReasoningTree;
        try {
            const rawJSON = response.content.replace(/```json/g, '').replace(/```/g, '');
            parsed = JSON.parse(rawJSON);
        } catch (e) {
            // Fallback simple linear plan
            parsed = {
                goal,
                nodes: {
                    "step1": { id: "step1", description: "Execute goal immediately", dependencies: [], status: "pending" }
                }
            };
        }
        return parsed;
    }

    private getNextActionableNode(tree: ReasoningTree): ReasoningNode | null {
        for (const node of Object.values(tree.nodes)) {
            if (node.status === 'pending') {
                const dependenciesMet = node.dependencies.every(depId => 
                    tree.nodes[depId] && tree.nodes[depId]!.status === 'success'
                );
                if (dependenciesMet) return node;
            }
        }
        return null;
    }

    private async executeNode(action: string, tree: ReasoningTree) {
        // Collect context from previous nodes
        const context = Object.values(tree.nodes)
            .filter(n => n.status === 'success')
            .map(n => `[Step: ${n.description}] -> Result: ${n.result}`)
            .join('\n');

        const prompt = `Execute the following step using tools unconditionally:
Step: ${action}

Previous Context:
${context}`;

        return await this.agent.execute(prompt);
    }

    private async verifyNode(action: string, result: string): Promise<boolean> {
        const prompt = `Verification Step.
Action Attempted: ${action}
Execution Output: ${result}

Did this action succeed fundamentally? Reply strictly with "YES" or "NO".`;
        const evalRes = await this.agent.run(prompt);
        return evalRes.content.toUpperCase().includes('YES');
    }

    private async reflectAndReplan(tree: ReasoningTree, failedNode: ReasoningNode): Promise<ReasoningNode> {
        // Simple replan: generate a new node to compensate, pointing to same dependencies
        const patchId = randomUUID();
        const patchNode: ReasoningNode = {
            id: patchId,
            description: `FIX for failed: ${failedNode.description}. Error: ${failedNode.error}`,
            dependencies: failedNode.dependencies,
            status: 'pending'
        };
        tree.nodes[patchId] = patchNode;

        // Update dependents of the failed node to point to the new patch node
        for (const node of Object.values(tree.nodes)) {
            if (node.dependencies.includes(failedNode.id)) {
                node.dependencies = node.dependencies.filter(id => id !== failedNode.id);
                node.dependencies.push(patchId);
            }
        }

        return patchNode;
    }

    private synthesizeFinalResult(tree: ReasoningTree): string {
        const successes = Object.values(tree.nodes).filter(n => n.status === 'success');
        return `Reasoning Chain Executed Successfully.\nFinal Outputs:\n` + successes.map(s => `- ${s.description}: ${s.result}`).join('\n');
    }
}
