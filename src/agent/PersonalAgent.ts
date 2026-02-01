/**
 * JARVIS Personal Agent
 * 
 * Specialized agent for personal productivity:
 * - Calendar and scheduling
 * - Email management
 * - Task and todo management
 * - Reminders and notifications
 * - Personal finance tracking
 */

import { Agent, type AgentOptions } from './Agent.js';
import type { AgentMetadata, ApprovalCallback } from './types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Agent System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAL_AGENT_SYSTEM_PROMPT = `You are JARVIS-Personal, a specialized personal productivity agent. You help manage schedules, communications, tasks, and personal organization with discretion and efficiency.

## Core Competencies
- Calendar management and scheduling
- Email drafting and organization
- Task and project management
- Reminder and notification systems
- Personal note-taking and journaling
- Contact management
- Basic personal finance tracking

## Operational Guidelines

### 1. Calendar Management
- Understand user's scheduling preferences (work hours, buffer time, etc.)
- Check for conflicts before scheduling
- Consider time zones for participants
- Send appropriate reminders
- Suggest optimal meeting times based on availability

### 2. Email Handling
- Maintain the user's voice and tone
- Prioritize based on sender and content
- Draft responses that are clear and professional
- Summarize long email threads
- Flag urgent communications

### 3. Task Management
- Break large projects into actionable items
- Track deadlines and dependencies
- Suggest prioritization based on urgency/importance
- Provide regular progress updates
- Archive completed items appropriately

### 4. Privacy and Discretion
- Handle all personal information with care
- Never share personal data without explicit consent
- Keep work and personal contexts separate when appropriate
- Respect user's communication preferences

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

export class PersonalAgent extends Agent {
    private userTimezone: string;

    constructor(options: PersonalAgentOptions = {}) {
        super({
            name: 'PersonalAgent',
            systemPrompt: PERSONAL_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 10,
        });

        this.userTimezone = options.userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Register personal productivity tools
        this.registerPersonalTools();

        logger.agent('PersonalAgent created', { timezone: this.userTimezone });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'PersonalAgent',
            type: 'personal',
            description: 'Specialized agent for personal productivity, calendar, email, and task management',
            capabilities: [
                'Calendar management',
                'Email drafting and organization',
                'Task and todo management',
                'Reminders and notifications',
                'Note-taking',
                'Contact management',
            ],
            allowedTools: Array.from(this.tools.keys()),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Personal Tools
    // ─────────────────────────────────────────────────────────────────────────────

    private registerPersonalTools(): void {
        // Create reminder tool
        this.registerTool(
            {
                name: 'create_reminder',
                description: 'Create a reminder for a specific time or event',
                parameters: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'The reminder message',
                        },
                        datetime: {
                            type: 'string',
                            description: 'When to trigger the reminder (ISO 8601 format or natural language)',
                        },
                        recurring: {
                            type: 'string',
                            description: 'Recurrence pattern',
                            enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
                        },
                        priority: {
                            type: 'string',
                            description: 'Priority level',
                            enum: ['low', 'normal', 'high'],
                        },
                    },
                    required: ['message', 'datetime'],
                },
                category: 'system',
            },
            async (args) => {
                const { message, datetime, recurring, priority } = args as {
                    message: string;
                    datetime: string;
                    recurring?: string;
                    priority?: string;
                };
                logger.tool('create_reminder', 'Creating', { message, datetime, recurring });
                return {
                    status: 'not_implemented',
                    message: 'Reminder system will be implemented in the Skills layer',
                };
            }
        );

        // Create task tool
        this.registerTool(
            {
                name: 'create_task',
                description: 'Create a new task or todo item',
                parameters: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'Task title',
                        },
                        description: {
                            type: 'string',
                            description: 'Detailed task description',
                        },
                        dueDate: {
                            type: 'string',
                            description: 'Due date (ISO 8601 format or natural language)',
                        },
                        priority: {
                            type: 'string',
                            description: 'Priority level',
                            enum: ['low', 'normal', 'high', 'urgent'],
                        },
                        project: {
                            type: 'string',
                            description: 'Project or category this task belongs to',
                        },
                        tags: {
                            type: 'array',
                            description: 'Tags for organization',
                            items: { type: 'string', description: 'Tag' },
                        },
                    },
                    required: ['title'],
                },
                category: 'system',
            },
            async (args) => {
                const { title, description, dueDate, priority, project, tags } = args as {
                    title: string;
                    description?: string;
                    dueDate?: string;
                    priority?: string;
                    project?: string;
                    tags?: string[];
                };
                logger.tool('create_task', 'Creating', { title, dueDate, priority, project });
                return {
                    status: 'not_implemented',
                    message: 'Task management will be implemented in the Skills layer',
                };
            }
        );

        // List tasks tool
        this.registerTool(
            {
                name: 'list_tasks',
                description: 'List and filter tasks',
                parameters: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            description: 'Filter by status',
                            enum: ['pending', 'completed', 'all'],
                        },
                        project: {
                            type: 'string',
                            description: 'Filter by project',
                        },
                        priority: {
                            type: 'string',
                            description: 'Filter by priority',
                            enum: ['low', 'normal', 'high', 'urgent'],
                        },
                        dueBefore: {
                            type: 'string',
                            description: 'Tasks due before this date',
                        },
                    },
                },
                category: 'system',
            },
            async (args) => {
                const { status, project, priority, dueBefore } = args as {
                    status?: string;
                    project?: string;
                    priority?: string;
                    dueBefore?: string;
                };
                logger.tool('list_tasks', 'Listing', { status, project, priority });
                return {
                    status: 'not_implemented',
                    message: 'Task listing will be implemented in the Skills layer',
                };
            }
        );

        // Draft email tool
        this.registerTool(
            {
                name: 'draft_email',
                description: 'Draft an email based on user instructions',
                parameters: {
                    type: 'object',
                    properties: {
                        to: {
                            type: 'array',
                            description: 'Email recipients',
                            items: { type: 'string', description: 'Email address' },
                        },
                        subject: {
                            type: 'string',
                            description: 'Email subject line',
                        },
                        body: {
                            type: 'string',
                            description: 'Email body content (can use markdown)',
                        },
                        cc: {
                            type: 'array',
                            description: 'CC recipients',
                            items: { type: 'string', description: 'Email address' },
                        },
                        tone: {
                            type: 'string',
                            description: 'Desired tone of the email',
                            enum: ['formal', 'professional', 'casual', 'friendly'],
                        },
                        replyTo: {
                            type: 'string',
                            description: 'Email ID this is replying to',
                        },
                    },
                    required: ['subject', 'body'],
                },
                category: 'web',
            },
            async (args) => {
                const { to, subject, body, cc, tone } = args as {
                    to?: string[];
                    subject: string;
                    body: string;
                    cc?: string[];
                    tone?: string;
                };
                logger.tool('draft_email', 'Drafting', { subject, tone, recipientCount: to?.length });
                return {
                    status: 'not_implemented',
                    message: 'Email drafting will be implemented in the Skills layer',
                    draft: { to, subject, body, cc },
                };
            }
        );

        // Check calendar tool
        this.registerTool(
            {
                name: 'check_calendar',
                description: 'Check calendar for events and availability',
                parameters: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            description: 'Date to check (ISO 8601 format or natural language like "tomorrow")',
                        },
                        range: {
                            type: 'string',
                            description: 'Date range',
                            enum: ['day', 'week', 'month'],
                        },
                        calendar: {
                            type: 'string',
                            description: 'Specific calendar to check',
                        },
                    },
                },
                category: 'system',
            },
            async (args) => {
                const { date, range, calendar } = args as {
                    date?: string;
                    range?: string;
                    calendar?: string;
                };
                logger.tool('check_calendar', 'Checking', { date, range, calendar });
                return {
                    status: 'not_implemented',
                    message: 'Calendar integration will be implemented in the Skills layer',
                };
            }
        );

        // Create event tool
        this.registerTool(
            {
                name: 'create_event',
                description: 'Create a calendar event or meeting',
                parameters: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'Event title',
                        },
                        startTime: {
                            type: 'string',
                            description: 'Start time (ISO 8601 format)',
                        },
                        endTime: {
                            type: 'string',
                            description: 'End time (ISO 8601 format)',
                        },
                        location: {
                            type: 'string',
                            description: 'Event location or video call link',
                        },
                        attendees: {
                            type: 'array',
                            description: 'List of attendee emails',
                            items: { type: 'string', description: 'Email address' },
                        },
                        description: {
                            type: 'string',
                            description: 'Event description or agenda',
                        },
                        reminder: {
                            type: 'number',
                            description: 'Minutes before event to send reminder',
                        },
                    },
                    required: ['title', 'startTime'],
                },
                category: 'system',
            },
            async (args) => {
                const { title, startTime, endTime, location, attendees, description } = args as {
                    title: string;
                    startTime: string;
                    endTime?: string;
                    location?: string;
                    attendees?: string[];
                    description?: string;
                };
                logger.tool('create_event', 'Creating', { title, startTime, attendeeCount: attendees?.length });
                return {
                    status: 'not_implemented',
                    message: 'Calendar event creation will be implemented in the Skills layer',
                };
            }
        );

        // Quick note tool
        this.registerTool(
            {
                name: 'save_note',
                description: 'Save a quick note or thought to memory',
                parameters: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            description: 'The note content',
                        },
                        title: {
                            type: 'string',
                            description: 'Optional title for the note',
                        },
                        category: {
                            type: 'string',
                            description: 'Category for organization',
                        },
                        tags: {
                            type: 'array',
                            description: 'Tags for categorization',
                            items: { type: 'string', description: 'Tag' },
                        },
                    },
                    required: ['content'],
                },
                category: 'memory',
            },
            async (args) => {
                const { content, title, category, tags } = args as {
                    content: string;
                    title?: string;
                    category?: string;
                    tags?: string[];
                };
                logger.tool('save_note', 'Saving', { title, category });
                return {
                    status: 'not_implemented',
                    message: 'Notes will integrate with MemoryManager',
                };
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createPersonalAgent(options: PersonalAgentOptions = {}): PersonalAgent {
    return new PersonalAgent(options);
}
