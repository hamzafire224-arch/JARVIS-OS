/**
 * JARVIS Coder Agent
 * 
 * Specialized agent for software development tasks:
 * - Code generation and modification
 * - Debugging and error analysis
 * - Code review and optimization
 * - Technical documentation
 */

import { Agent, type AgentOptions } from './Agent.js';
import type { AgentMetadata, ApprovalCallback } from './types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Coder Agent System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const CODER_AGENT_SYSTEM_PROMPT = `You are JARVIS-Coder, a specialized software development agent. You are an expert programmer with deep knowledge across multiple languages, frameworks, and best practices.

## Core Competencies
- Full-stack web development (React, Node.js, TypeScript, Python)
- System design and architecture
- Database design and optimization
- API development and integration
- Testing strategies and implementation
- DevOps and CI/CD pipelines
- Security best practices

## Operational Guidelines

### 1. Code Quality Standards
- Write clean, readable, maintainable code
- Follow language-specific conventions and idioms
- Include appropriate comments for complex logic
- Consider edge cases and error handling
- Optimize for both performance and readability

### 2. Development Approach
- Understand requirements fully before coding
- Break complex problems into smaller, manageable pieces
- Write tests alongside implementation when appropriate
- Consider backwards compatibility and migration paths
- Document breaking changes clearly

### 3. Communication Style
- Explain technical decisions succinctly
- Provide code snippets with context
- Highlight potential gotchas or trade-offs
- Offer alternatives when appropriate
- Ask clarifying questions for ambiguous requirements

### 4. Tool Usage
When you have access to coding tools:
- Use file operations to explore and modify code
- Run terminal commands to execute builds and tests
- Read documentation and search when needed
- Commit changes with meaningful messages

## Response Format
When providing code:
1. Brief explanation of the approach
2. The code itself with syntax highlighting
3. Instructions for usage or integration
4. Any caveats or next steps

Always prioritize working, production-ready code over theoretical explanations.`;

// ═══════════════════════════════════════════════════════════════════════════════
// Coder Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoderAgentOptions {
    workspaceDir?: string;
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Coder Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class CoderAgent extends Agent {
    private workspaceDir: string | null;

    constructor(options: CoderAgentOptions = {}) {
        super({
            name: 'CoderAgent',
            systemPrompt: CODER_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 20, // Coding tasks often need more iterations
        });

        this.workspaceDir = options.workspaceDir ?? null;

        // Register coding-specific tools
        this.registerCodingTools();

        logger.agent('CoderAgent created', { workspaceDir: this.workspaceDir });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'CoderAgent',
            type: 'coder',
            description: 'Specialized agent for software development, code generation, and technical tasks',
            capabilities: [
                'Code generation and modification',
                'Debugging and error analysis',
                'Code review and optimization',
                'Technical documentation',
                'Build and test execution',
                'Git operations',
            ],
            allowedTools: Array.from(this.tools.keys()),
            workspaceDir: this.workspaceDir ?? undefined,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Coding Tools
    // ─────────────────────────────────────────────────────────────────────────────

    private registerCodingTools(): void {
        // Read file tool
        this.registerTool(
            {
                name: 'read_file',
                description: 'Read the contents of a file from the filesystem',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Absolute path to the file to read',
                        },
                        startLine: {
                            type: 'number',
                            description: 'Optional start line (1-indexed)',
                        },
                        endLine: {
                            type: 'number',
                            description: 'Optional end line (1-indexed, inclusive)',
                        },
                    },
                    required: ['path'],
                },
                category: 'filesystem',
            },
            async (args) => {
                const { path, startLine, endLine } = args as {
                    path: string;
                    startLine?: number;
                    endLine?: number;
                };
                // TODO: Implement actual file reading
                logger.tool('read_file', 'Reading', { path, startLine, endLine });
                return {
                    status: 'not_implemented',
                    message: 'File system tools will be implemented in the Skills layer'
                };
            }
        );

        // Write file tool
        this.registerTool(
            {
                name: 'write_file',
                description: 'Write content to a file, creating it if it does not exist',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Absolute path to the file to write',
                        },
                        content: {
                            type: 'string',
                            description: 'Content to write to the file',
                        },
                        createDirs: {
                            type: 'boolean',
                            description: 'Create parent directories if they do not exist',
                        },
                    },
                    required: ['path', 'content'],
                },
                category: 'filesystem',
                dangerous: true, // Requires approval in conservative mode
            },
            async (args) => {
                const { path, content } = args as { path: string; content: string; createDirs?: boolean };
                logger.tool('write_file', 'Writing', { path, contentLength: content.length });
                return {
                    status: 'not_implemented',
                    message: 'File system tools will be implemented in the Skills layer'
                };
            }
        );

        // Run command tool
        this.registerTool(
            {
                name: 'run_command',
                description: 'Execute a shell command in the terminal',
                parameters: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description: 'The command to execute',
                        },
                        cwd: {
                            type: 'string',
                            description: 'Working directory for the command',
                        },
                        timeout: {
                            type: 'number',
                            description: 'Timeout in milliseconds (default: 30000)',
                        },
                    },
                    required: ['command'],
                },
                category: 'terminal',
                dangerous: true,
            },
            async (args) => {
                const { command, cwd } = args as { command: string; cwd?: string; timeout?: number };
                logger.tool('run_command', 'Executing', { command, cwd });
                return {
                    status: 'not_implemented',
                    message: 'Terminal tools will be implemented in the Skills layer'
                };
            }
        );

        // Search codebase tool
        this.registerTool(
            {
                name: 'search_code',
                description: 'Search for patterns or text in the codebase',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search pattern (supports regex)',
                        },
                        path: {
                            type: 'string',
                            description: 'Directory to search in',
                        },
                        filePattern: {
                            type: 'string',
                            description: 'File pattern to match (e.g., "*.ts")',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results to return',
                        },
                    },
                    required: ['query'],
                },
                category: 'filesystem',
            },
            async (args) => {
                const { query, path, filePattern } = args as {
                    query: string;
                    path?: string;
                    filePattern?: string;
                    maxResults?: number;
                };
                logger.tool('search_code', 'Searching', { query, path, filePattern });
                return {
                    status: 'not_implemented',
                    message: 'Search tools will be implemented in the Skills layer'
                };
            }
        );

        // Analyze code tool (for understanding code structure)
        this.registerTool(
            {
                name: 'analyze_code',
                description: 'Analyze code structure, dependencies, and provide insights',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'File or directory to analyze',
                        },
                        depth: {
                            type: 'number',
                            description: 'Analysis depth (1=surface, 3=deep)',
                        },
                        focus: {
                            type: 'string',
                            description: 'Specific focus area',
                            enum: ['structure', 'dependencies', 'complexity', 'security', 'performance'],
                        },
                    },
                    required: ['path'],
                },
                category: 'system',
            },
            async (args) => {
                const { path, depth, focus } = args as {
                    path: string;
                    depth?: number;
                    focus?: string;
                };
                logger.tool('analyze_code', 'Analyzing', { path, depth, focus });
                return {
                    status: 'not_implemented',
                    message: 'Code analysis tools will be implemented in the Skills layer'
                };
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createCoderAgent(options: CoderAgentOptions = {}): CoderAgent {
    return new CoderAgent(options);
}
