/**
 * JARVIS Personal Agent
 * 
 * Specialized agent for personal productivity:
 * - Note-taking and organization
 * - File management and document handling
 * - Web research for personal tasks
 * 
 * Extends SkillAwareAgent to get real filesystem, web, and memory
 * tools from the SkillRegistry instead of placeholder stubs.
 * 
 * Note: Calendar, email, and task management integrations are planned
 * for a future release (Google Workspace / Microsoft Graph APIs).
 * Currently, the agent can use filesystem tools to save notes, tasks,
 * and reminders as local files.
 */

import { SkillAwareAgent } from './SkillAwareAgent.js';
import type { AgentMetadata, ApprovalCallback } from './types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Agent System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAL_AGENT_SYSTEM_PROMPT = `You are JARVIS-Personal, a specialized personal productivity agent. You help manage schedules, communications, tasks, and personal organization with discretion and efficiency.

## Core Competencies
- Note-taking and personal knowledge management
- Task tracking using local files
- Web research for personal needs
- File organization and management
- Personal reminders (saved as files)

## Operational Guidelines

### 1. Task & Note Management
- Save tasks and notes as organized files (e.g., ./data/notes/, ./data/tasks/)
- Use clear naming conventions (date-based, topic-based)
- Maintain structured formats (markdown) for readability
- Track completion status within task files

### 2. Communication
- Draft emails and messages (save to files for user to send)
- Maintain the user's voice and tone
- Prioritize based on urgency and importance

### 3. Organization
- Keep work and personal contexts separate when appropriate
- Use consistent file structures and naming
- Provide regular summaries of pending items

### 4. Privacy and Discretion
- Handle all personal information with care
- Never share personal data without explicit consent
- Store sensitive information securely

## Current Limitations
- Calendar integration is not yet available (planned: Google Calendar / Outlook)
- Email sending is not yet available (can draft emails and save locally)
- For calendar and email, suggest the user use their existing tools directly

## Response Format
When managing personal tasks:
1. Acknowledge the request
2. Confirm understanding of any details
3. Describe actions taken or proposed
4. Ask for confirmation if needed
5. Provide relevant follow-up suggestions

Be proactive but not intrusive. Anticipate needs when appropriate.`;

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonalAgentOptions {
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
    userTimezone?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class PersonalAgent extends SkillAwareAgent {
    constructor(options: PersonalAgentOptions = {}) {
        super({
            name: 'PersonalAgent',
            systemPrompt: PERSONAL_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 10,
            skillCategories: ['filesystem', 'web', 'memory', 'personal'],
        });

        logger.agent('PersonalAgent created', {
            timezone: options.userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'PersonalAgent',
            type: 'personal',
            description: 'Specialized agent for personal productivity, notes, file management, and task tracking',
            capabilities: [
                'Note-taking and organization',
                'Task tracking via local files',
                'Web research for personal needs',
                'File management',
                'Email drafting (saved locally)',
            ],
            allowedTools: Array.from(this.tools.keys()),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createPersonalAgent(options: PersonalAgentOptions = {}): PersonalAgent {
    return new PersonalAgent(options);
}
