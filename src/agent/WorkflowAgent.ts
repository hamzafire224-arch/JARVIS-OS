/**
 * JARVIS Autonomous Workflow Engine
 *
 * Executes predefined, step-by-step workflows consisting of tool calls
 * or specialized prompts. Supports safe auto-execution for verified steps
 * while preserving manual approval bounds for dangerous operations.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';
import { getSkillRegistry } from '../skills/Skill.js';
import { ToolExecutionError } from '../utils/errors.js';

export interface WorkflowStep {
    name: string;
    description?: string;
    tool?: string;
    args?: Record<string, unknown>;
    safeToAutoRun?: boolean;
    // For agent-based steps, not just pure tool calls
    prompt?: string;
}

export interface WorkflowDefinition {
    name: string;
    description: string;
    version: string;
    steps: WorkflowStep[];
}

export interface WorkflowContext {
    cwd: string;
    env: Record<string, string>;
    outputs: Record<string, unknown>;
}

export class WorkflowAgent {
    private registry = getSkillRegistry();
    private approvalCallback: (tool: string, args: any) => Promise<boolean>;

    constructor(approvalCallback: (tool: string, args: any) => Promise<boolean>) {
        this.approvalCallback = approvalCallback;
    }

    /**
     * Load a workflow definition from a JSON file
     */
    public async loadWorkflow(path: string): Promise<WorkflowDefinition> {
        try {
            const absolutePath = resolve(process.cwd(), path);
            const content = await readFile(absolutePath, 'utf8');
            return JSON.parse(content) as WorkflowDefinition;
        } catch (err) {
            logger.error(`Failed to load workflow from ${path}`, { error: String(err) });
            throw new Error(`Failed to load workflow: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /**
     * Execute a loaded workflow
     * Yields progress updates for streaming back to the user
     */
    public async *executeWorkflow(workflow: WorkflowDefinition): AsyncGenerator<string, void, unknown> {
        yield `Starting Workflow: ${workflow.name} (v${workflow.version})\n`;
        yield `${workflow.description}\n\n`;

        const context: WorkflowContext = {
            cwd: process.cwd(),
            env: { ...process.env } as Record<string, string>,
            outputs: {},
        };

        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i]!;
            yield `[Step ${i + 1}/${workflow.steps.length}] ${step.name}...\n`;

            try {
                if (step.tool) {
                    yield* this.executeToolStep(step, context);
                } else if (step.prompt) {
                    yield `  → Agent reasoning steps not fully implemented in JSON workflows yet. Skipping.\n`;
                } else {
                    yield `  → Invalid step definition: neither tool nor prompt provided.\n`;
                }
            } catch (err) {
                yield `❌ Workflow failed at step '${step.name}': ${err instanceof Error ? err.message : String(err)}\n`;
                return;
            }
        }

        yield `\n✅ Workflow '${workflow.name}' completed successfully.\n`;
    }

    private async *executeToolStep(
        step: WorkflowStep, 
        context: WorkflowContext
    ): AsyncGenerator<string, void, unknown> {
        const skill = this.registry.get(step.tool!);
        if (!skill) {
            throw new Error(`Required skill '${step.tool}' not found in registry.`);
        }

        // Interpolate context outputs into arguments dynamically
        const args = this.interpolateArgs(step.args ?? {}, context);

        // Security check
        const isDangerous = skill.getMetadata().dangerous;
        if (isDangerous && !step.safeToAutoRun) {
            const approved = await this.approvalCallback(step.tool!, args);
            if (!approved) {
                throw new Error('User denied execution of dangerous tool step.');
            }
        }

        try {
            const result = await skill.execute(args, { workspaceDir: context.cwd });
            context.outputs[step.name] = result;
            yield `  ✓ Success\n`;
        } catch (err) {
            logger.error(`Workflow tool execution failed`, { step: step.name, tool: step.tool, error: String(err) });
            throw new ToolExecutionError(step.tool!, err instanceof Error ? err.message : String(err));
        }
    }

    /**
     * Replaces {{outputs.stepName.prop}} inside argument strings with actual context data
     */
    private interpolateArgs(args: Record<string, unknown>, context: WorkflowContext): Record<string, unknown> {
        const interpolated: Record<string, unknown> = {};
        
        for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string') {
                interpolated[key] = value.replace(/\{\{outputs\.([^}]+)\}\}/g, (_, path) => {
                    const parts = path.split('.');
                    let current: any = context.outputs;
                    for (const part of parts) {
                        if (current == null) return String(current);
                        current = current[part];
                    }
                    return String(current);
                });
            } else {
                interpolated[key] = value;
            }
        }
        return interpolated;
    }
}
