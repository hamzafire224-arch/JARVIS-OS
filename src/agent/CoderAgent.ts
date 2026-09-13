/**
 * JARVIS Coder Agent
 * 
 * Specialized agent for software development tasks:
 * - Code generation and modification
 * - Debugging and error analysis
 * - Code review and optimization
 * - Technical documentation
 * 
 * Extends SkillAwareAgent to get real filesystem, terminal, web, and GitHub
 * tools from the SkillRegistry instead of placeholder stubs.
 */

import { SkillAwareAgent } from './SkillAwareAgent.js';
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
- Use the 'analyze_project' tool FIRST when entering a new codebase to understand the structure, frameworks, and dependencies.
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

export class CoderAgent extends SkillAwareAgent {
    constructor(options: CoderAgentOptions = {}) {
        super({
            name: 'CoderAgent',
            systemPrompt: CODER_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 20, // Coding tasks often need more iterations
            workspaceDir: options.workspaceDir,
            skillCategories: ['filesystem', 'terminal', 'web', 'github'],
        });

        logger.agent('CoderAgent created', { workspaceDir: options.workspaceDir });
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
            workspaceDir: this.skillContext.workspaceDir,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createCoderAgent(options: CoderAgentOptions = {}): CoderAgent {
    return new CoderAgent(options);
}
