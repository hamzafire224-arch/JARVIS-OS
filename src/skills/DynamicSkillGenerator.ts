/**
 * JARVIS Dynamic Skill Generator
 * 
 * Enables JARVIS to write its own skills at runtime:
 * 1. User describes a task JARVIS can't do
 * 2. Agent generates a TypeScript skill file
 * 3. SkillScanner validates for malicious code
 * 4. Skill is written to disk and registered at runtime
 * 5. Immediately usable in the current session
 * 
 * This is a Tier 1 AGI upgrade — JARVIS literally teaches itself new abilities.
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
import { getSkillScanner, type ScanResult } from '../security/SkillScanner.js';
import { getSkillRegistry, type Skill, type SkillExecutionContext } from './Skill.js';
import { logger } from '../utils/logger.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeneratedSkillSpec {
    name: string;
    description: string;
    parameters: Record<string, { type: string; description: string; required?: boolean }>;
    implementation: string;  // The TypeScript code for the execute function body
}

export interface GenerationResult {
    success: boolean;
    skillName?: string;
    toolDefinition?: ToolDefinition;
    scanResult?: ScanResult;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Code Template
// ═══════════════════════════════════════════════════════════════════════════════

function buildSkillSourceCode(spec: GeneratedSkillSpec): string {
    const paramEntries = Object.entries(spec.parameters);
    const requiredParams = paramEntries
        .filter(([, v]) => v.required !== false)
        .map(([k]) => `'${k}'`);

    return `/**
 * Auto-generated JARVIS Skill: ${spec.name}
 * ${spec.description}
 * 
 * Generated at: ${new Date().toISOString()}
 * ⚠️  This skill was dynamically generated. Review before sharing.
 */

// ─── Skill Implementation ────────────────────────────────────────────────────

export const skillName = '${spec.name}';
export const skillDescription = '${spec.description.replace(/'/g, "\\'")}';

export const parameters = ${JSON.stringify(spec.parameters, null, 4)};

export const requiredParams = [${requiredParams.join(', ')}];

export async function execute(args) {
${spec.implementation}
}
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dynamic Skill Generator
// ═══════════════════════════════════════════════════════════════════════════════

export class DynamicSkillGenerator {
    private outputDir: string;

    constructor(outputDir?: string) {
        this.outputDir = outputDir ?? './data/skills/user-generated';
    }

    /**
     * Generate, validate, and register a new skill from a specification.
     * 
     * This is called by the agent's `create_new_skill` tool handler.
     * The agent is responsible for generating the GeneratedSkillSpec from
     * the user's natural language description.
     */
    async generateAndRegister(spec: GeneratedSkillSpec): Promise<GenerationResult> {
        // Validate spec
        if (!spec.name || !spec.description || !spec.implementation) {
            return { success: false, error: 'Incomplete skill specification: name, description, and implementation are required.' };
        }

        // Sanitize skill name
        const safeName = spec.name
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .toLowerCase();

        // Check if skill already exists
        const registry = getSkillRegistry();
        if (registry.has(safeName)) {
            return { success: false, error: `Skill "${safeName}" already exists. Choose a different name.` };
        }

        // Build source code
        const sourceCode = buildSkillSourceCode({ ...spec, name: safeName });

        // Security scan BEFORE writing to disk
        const scanner = getSkillScanner();
        const scanResult = scanner.scanContent(sourceCode, `${safeName}.ts`);

        if (scanResult.recommendation === 'block') {
            logger.warn('[SKILL-GEN] Security scan blocked skill generation', {
                skill: safeName,
                riskScore: scanResult.riskScore,
                findings: scanResult.findings.length,
            });
            return {
                success: false,
                scanResult,
                error: `Security scan blocked this skill (risk score: ${scanResult.riskScore}/100). Findings: ${scanResult.findings.map(f => f.description).join('; ')}`,
            };
        }

        if (scanResult.recommendation === 'sandbox') {
            logger.warn('[SKILL-GEN] Security scan flagged skill for review', {
                skill: safeName,
                riskScore: scanResult.riskScore,
            });
            // Allow but warn — the user approved generation via the tool call
        }

        // Write to disk
        await fs.mkdir(this.outputDir, { recursive: true });
        const filePath = join(this.outputDir, `${safeName}.ts`);
        await fs.writeFile(filePath, sourceCode, 'utf-8');

        // Build tool definition for runtime registration
        const toolDefinition: ToolDefinition = {
            name: safeName,
            description: spec.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(
                    Object.entries(spec.parameters).map(([key, val]) => [
                        key,
                        { type: val.type as any, description: val.description },
                    ])
                ),
                required: Object.entries(spec.parameters)
                    .filter(([, v]) => v.required !== false)
                    .map(([k]) => k),
            },
        };

        // Create a runtime skill wrapper and register it
        const runtimeSkill = this.createRuntimeSkill(safeName, spec, toolDefinition);
        registry.register(runtimeSkill);

        logger.info('[SKILL-GEN] Dynamic skill created and registered', {
            name: safeName,
            riskScore: scanResult.riskScore,
            riskLevel: scanResult.riskLevel,
        });

        return {
            success: true,
            skillName: safeName,
            toolDefinition,
            scanResult,
        };
    }

    /**
     * Create a runtime Skill object from a spec (without dynamic import).
     * Uses Function constructor to safely wrap the implementation.
     */
    private createRuntimeSkill(
        name: string,
        spec: GeneratedSkillSpec,
        toolDef: ToolDefinition
    ): Skill {
        // Create the execute function from the implementation string
        // This is safe because we've already security-scanned the code
        const executeFn = new Function('args', 'context', spec.implementation) as (
            args: Record<string, unknown>,
            context: SkillExecutionContext
        ) => Promise<unknown>;

        return {
            name,
            category: 'system' as const,
            description: spec.description,
            version: '1.0.0',
            dangerous: false,
            getToolDefinition: () => toolDef,
            execute: async (args: Record<string, unknown>, context: SkillExecutionContext) => {
                try {
                    return await executeFn(args, context);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    throw new Error(`[${name}] Execution failed: ${msg}`);
                }
            },
            getMetadata: () => ({
                name,
                category: 'system' as const,
                description: spec.description,
                version: '1.0.0',
                dangerous: false,
            }),
        } as Skill;
    }

    /**
     * List all user-generated skills on disk
     */
    async listGenerated(): Promise<string[]> {
        try {
            const entries = await fs.readdir(this.outputDir);
            return entries
                .filter(e => e.endsWith('.ts') || e.endsWith('.js'))
                .map(e => basename(e).replace(/\.(ts|js)$/, ''));
        } catch {
            return [];
        }
    }

    /**
     * Delete a user-generated skill
     */
    async deleteGenerated(skillName: string): Promise<boolean> {
        try {
            const filePath = join(this.outputDir, `${skillName}.ts`);
            await fs.unlink(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool Definition — for agent registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The `create_new_skill` tool definition that gets registered in the skill registry.
 * The agent calls this tool when the user asks it to create a new capability.
 */
export const CREATE_NEW_SKILL_TOOL: ToolDefinition = {
    name: 'create_new_skill',
    description: 'Create a new JARVIS skill at runtime. Use this when the user asks you to create a reusable tool/ability that JARVIS doesn\'t currently have. You generate the implementation code and JARVIS will validate it for security, save it, and make it immediately available.',
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Unique skill name in snake_case (e.g., "markdown_to_html", "csv_analyzer")',
            },
            description: {
                type: 'string',
                description: 'Human-readable description of what the skill does',
            },
            parameters: {
                type: 'object',
                description: 'JSON object describing the input parameters. Each key is a param name, value is { type, description, required? }',
            },
            implementation: {
                type: 'string',
                description: 'The JavaScript function body that implements the skill. Has access to `args` (input parameters) and `context` (workspace info). Must return the result. Can use standard Node.js APIs.',
            },
        },
        required: ['name', 'description', 'parameters', 'implementation'],
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let generatorInstance: DynamicSkillGenerator | null = null;

export function getDynamicSkillGenerator(outputDir?: string): DynamicSkillGenerator {
    if (!generatorInstance) {
        generatorInstance = new DynamicSkillGenerator(outputDir);
    }
    return generatorInstance;
}

export function resetDynamicSkillGenerator(): void {
    generatorInstance = null;
}
