/**
 * JARVIS Project Analyzer Skill
 *
 * Scans directories, reads package.json, tsconfig.json, and other config
 * files to understand project architecture, context, and dependencies.
 * Provides rich context back to CoderAgent for accurate code generation.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { MultiToolSkill } from './Skill.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { logger } from '../utils/logger.js';

export class ProjectAnalyzer extends MultiToolSkill {
    constructor() {
        super({
            name: 'project_analyzer',
            description: 'Scans and analyzes project architecture, dependencies, and rules',
            version: '1.0.0',
            category: 'system',
        });
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'analyze_project',
                description: 'Analyzes the project structure at the given directory path to build context.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Absolute path to the project root directory',
                        },
                    },
                    required: ['path'],
                },
            },
        ];
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        if (toolName === 'analyze_project') {
            return this.analyzeProject(args);
        }
        return this.createResult(`Unknown tool: ${toolName}`, true);
    }

    private async analyzeProject(args: Record<string, unknown>): Promise<ToolResult> {
        const targetPath = args['path'] as string;
        if (!targetPath) {
            return this.createResult('Missing required argument: path', true);
        }

        try {
            logger.tool('analyze_project', 'Scanning project directory', { path: targetPath });

            const [packageJson, tsconfig, structure] = await Promise.all([
                this.readSafe(join(targetPath, 'package.json')),
                this.readSafe(join(targetPath, 'tsconfig.json')),
                this.scanDirectory(targetPath, 2) // Scan 2 levels deep
            ]);

            const analysis = {
                dependencies: packageJson ? this.extractDependencies(packageJson) : null,
                isTypeScript: !!tsconfig || !!packageJson?.includes('"typescript"'),
                frameworks: this.detectFrameworks(packageJson || ''),
                structure,
            };

            return this.createResult({ analysis });

        } catch (err) {
            return this.createResult(
                `Failed to analyze project: ${err instanceof Error ? err.message : String(err)}`, 
                true
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private async readSafe(filePath: string): Promise<string | null> {
        try {
            return await readFile(filePath, 'utf8');
        } catch {
            return null;
        }
    }

    private extractDependencies(packageJsonStr: string): Record<string, string[]> {
        try {
            const parsed = JSON.parse(packageJsonStr);
            return {
                deps: Object.keys(parsed.dependencies || {}),
                devDeps: Object.keys(parsed.devDependencies || {}),
            };
        } catch {
            return { deps: [], devDeps: [] };
        }
    }

    private detectFrameworks(packageJsonStr: string): string[] {
        const frameworks: string[] = [];
        if (packageJsonStr.includes('"react"')) frameworks.push('React');
        if (packageJsonStr.includes('"next"')) frameworks.push('Next.js');
        if (packageJsonStr.includes('"vue"')) frameworks.push('Vue');
        if (packageJsonStr.includes('"express"')) frameworks.push('Express');
        if (packageJsonStr.includes('"@nestjs/core"')) frameworks.push('NestJS');
        if (packageJsonStr.includes('"svelte"')) frameworks.push('Svelte');
        return frameworks;
    }

    private async scanDirectory(dir: string, currentDepth: number): Promise<any> {
        if (currentDepth < 0) return '...';
        try {
            const entries = await readdir(dir);
            const structure: Record<string, any> = {};
            
            for (const entry of entries) {
                if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.next') continue;
                
                const fullPath = join(dir, entry);
                const fileStat = await stat(fullPath);
                
                if (fileStat.isDirectory()) {
                    structure[entry + '/'] = currentDepth > 0 ? await this.scanDirectory(fullPath, currentDepth - 1) : '{...}';
                } else {
                    structure[entry] = 'file';
                }
            }
            return structure;
        } catch {
            return '{unreadable}';
        }
    }
}

// Singleton
let projectAnalyzer: ProjectAnalyzer | null = null;
export function getProjectAnalyzer(): ProjectAnalyzer {
    if (!projectAnalyzer) {
        projectAnalyzer = new ProjectAnalyzer();
    }
    return projectAnalyzer;
}
