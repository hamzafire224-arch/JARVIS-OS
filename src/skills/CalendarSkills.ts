/**
 * JARVIS Calendar Skills
 *
 * Local JSON-file-backed calendar for personal event management:
 * - Create, list, and delete events
 * - Query upcoming events or events by date range
 * - Atomic writes for crash safety
 */

import { MultiToolSkill } from './Skill.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { logger } from '../utils/logger.js';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;    // ISO 8601
    endTime?: string;     // ISO 8601
    description?: string;
    location?: string;
    reminder?: number;    // minutes before event
    createdAt: string;
}

interface CalendarStore {
    version: string;
    events: CalendarEvent[];
}

const DEFAULT_STORE: CalendarStore = { version: '1.0.0', events: [] };
const DEFAULT_PATH = resolve('./data/calendar/events.json');

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar Skills
// ═══════════════════════════════════════════════════════════════════════════════

export class CalendarSkills extends MultiToolSkill {
    private filePath: string;
    private store: CalendarStore | null = null;

    constructor(options: { filePath?: string } = {}) {
        super({
            name: 'CalendarSkills',
            description: 'Personal calendar for creating, listing, and managing events',
            version: '1.0.0',
            category: 'personal',
        });
        this.filePath = options.filePath ?? DEFAULT_PATH;
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'create_event',
                description: 'Create a calendar event with a title, time, and optional details',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Event title' },
                        startTime: { type: 'string', description: 'Start time (ISO 8601 or natural like "2025-03-15 10:00")' },
                        endTime: { type: 'string', description: 'End time (optional)' },
                        description: { type: 'string', description: 'Event description' },
                        location: { type: 'string', description: 'Event location' },
                        reminder: { type: 'number', description: 'Reminder minutes before event' },
                    },
                    required: ['title', 'startTime'],
                },
                category: 'personal',
            },
            {
                name: 'list_events',
                description: 'List calendar events. By default shows upcoming events. Can filter by date range.',
                parameters: {
                    type: 'object',
                    properties: {
                        from: { type: 'string', description: 'Start of date range (ISO 8601)' },
                        to: { type: 'string', description: 'End of date range (ISO 8601)' },
                        limit: { type: 'number', description: 'Max events to return (default: 20)' },
                    },
                },
                category: 'personal',
            },
            {
                name: 'delete_event',
                description: 'Delete a calendar event by its ID',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Event ID to delete' },
                    },
                    required: ['id'],
                },
                category: 'personal',
            },
        ];
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        await this.ensureLoaded();

        switch (toolName) {
            case 'create_event':
                return this.createEvent(args);
            case 'list_events':
                return this.listEvents(args);
            case 'delete_event':
                return this.deleteEvent(args);
            default:
                return this.createResult(`Unknown tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────

    private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
        const event: CalendarEvent = {
            id: randomUUID(),
            title: args['title'] as string,
            startTime: new Date(args['startTime'] as string).toISOString(),
            endTime: args['endTime'] ? new Date(args['endTime'] as string).toISOString() : undefined,
            description: args['description'] as string | undefined,
            location: args['location'] as string | undefined,
            reminder: args['reminder'] as number | undefined,
            createdAt: new Date().toISOString(),
        };

        this.store!.events.push(event);
        await this.save();

        logger.tool('create_event', 'Event created', { id: event.id, title: event.title });

        return this.createResult({
            message: `Event "${event.title}" created`,
            event,
        });
    }

    private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
        const now = new Date();
        const from = args['from'] ? new Date(args['from'] as string) : now;
        const to = args['to'] ? new Date(args['to'] as string) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const limit = (args['limit'] as number) ?? 20;

        const events = this.store!.events
            .filter(e => {
                const start = new Date(e.startTime);
                return start >= from && start <= to;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, limit);

        return this.createResult({
            events,
            count: events.length,
            range: { from: from.toISOString(), to: to.toISOString() },
        });
    }

    private async deleteEvent(args: Record<string, unknown>): Promise<ToolResult> {
        const id = args['id'] as string;
        const index = this.store!.events.findIndex(e => e.id === id);

        if (index === -1) {
            return this.createResult(`Event not found: ${id}`, true);
        }

        const removed = this.store!.events.splice(index, 1)[0]!;
        await this.save();

        return this.createResult({ message: `Deleted event: "${removed.title}"` });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    private async ensureLoaded(): Promise<void> {
        if (this.store) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        if (existsSync(this.filePath)) {
            const content = await readFile(this.filePath, 'utf-8');
            this.store = JSON.parse(content);
        } else {
            this.store = { ...DEFAULT_STORE, events: [] };
            await this.save();
        }
    }

    private async save(): Promise<void> {
        if (!this.store) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const content = JSON.stringify(this.store, null, 2);
        const tmpPath = `${this.filePath}.tmp`;
        await writeFile(tmpPath, content, 'utf-8');
        await rename(tmpPath, this.filePath);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let calendarInstance: CalendarSkills | null = null;

export function getCalendarSkills(options?: { filePath?: string }): CalendarSkills {
    if (!calendarInstance) {
        calendarInstance = new CalendarSkills(options);
    }
    return calendarInstance;
}

export function resetCalendarSkills(): void {
    calendarInstance = null;
}
