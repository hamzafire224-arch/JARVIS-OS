/**
 * JARVIS Task Skills
 *
 * Local JSON-file-backed task/todo management:
 * - Create, list, complete, and delete tasks
 * - Filter by status, priority, tags
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

export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;    // ISO 8601
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'done';
    tags: string[];
    createdAt: string;
    completedAt?: string;
}

interface TaskStore {
    version: string;
    tasks: Task[];
}

const DEFAULT_STORE: TaskStore = { version: '1.0.0', tasks: [] };
const DEFAULT_PATH = resolve('./data/tasks/tasks.json');

// ═══════════════════════════════════════════════════════════════════════════════
// Task Skills
// ═══════════════════════════════════════════════════════════════════════════════

export class TaskSkills extends MultiToolSkill {
    private filePath: string;
    private store: TaskStore | null = null;

    constructor(options: { filePath?: string } = {}) {
        super({
            name: 'TaskSkills',
            description: 'Personal task/todo management with priorities and status tracking',
            version: '1.0.0',
            category: 'personal',
        });
        this.filePath = options.filePath ?? DEFAULT_PATH;
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'create_task',
                description: 'Create a new task/todo item with optional priority and due date',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Task title' },
                        description: { type: 'string', description: 'Task description' },
                        dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priority level (default: medium)' },
                        tags: { type: 'array', items: { type: 'string', description: 'Tag name' }, description: 'Tags for categorization' },
                    },
                    required: ['title'],
                },
                category: 'personal',
            },
            {
                name: 'list_tasks',
                description: 'List tasks. Can filter by status, priority, or tags.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'all'], description: 'Filter by status (default: all non-done)' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by priority' },
                        tag: { type: 'string', description: 'Filter by tag' },
                        limit: { type: 'number', description: 'Max tasks to return (default: 50)' },
                    },
                },
                category: 'personal',
            },
            {
                name: 'complete_task',
                description: 'Mark a task as completed',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Task ID to complete' },
                    },
                    required: ['id'],
                },
                category: 'personal',
            },
            {
                name: 'delete_task',
                description: 'Delete a task permanently',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Task ID to delete' },
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
            case 'create_task':
                return this.createTask(args);
            case 'list_tasks':
                return this.listTasks(args);
            case 'complete_task':
                return this.completeTask(args);
            case 'delete_task':
                return this.deleteTask(args);
            default:
                return this.createResult(`Unknown tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────

    private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
        const task: Task = {
            id: randomUUID(),
            title: args['title'] as string,
            description: args['description'] as string | undefined,
            dueDate: args['dueDate'] ? new Date(args['dueDate'] as string).toISOString() : undefined,
            priority: (args['priority'] as Task['priority']) ?? 'medium',
            status: 'todo',
            tags: (args['tags'] as string[]) ?? [],
            createdAt: new Date().toISOString(),
        };

        this.store!.tasks.push(task);
        await this.save();

        logger.tool('create_task', 'Task created', { id: task.id, title: task.title });

        return this.createResult({
            message: `Task "${task.title}" created`,
            task,
        });
    }

    private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
        const statusFilter = args['status'] as string | undefined;
        const priorityFilter = args['priority'] as string | undefined;
        const tagFilter = args['tag'] as string | undefined;
        const limit = (args['limit'] as number) ?? 50;

        let tasks = [...this.store!.tasks];

        // Filter by status (default: show non-done tasks)
        if (statusFilter && statusFilter !== 'all') {
            tasks = tasks.filter(t => t.status === statusFilter);
        } else if (!statusFilter) {
            tasks = tasks.filter(t => t.status !== 'done');
        }

        if (priorityFilter) {
            tasks = tasks.filter(t => t.priority === priorityFilter);
        }

        if (tagFilter) {
            tasks = tasks.filter(t => t.tags.includes(tagFilter));
        }

        // Sort: urgent > high > medium > low, then by due date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        tasks.sort((a, b) => {
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        tasks = tasks.slice(0, limit);

        return this.createResult({
            tasks,
            count: tasks.length,
            totalNonDone: this.store!.tasks.filter(t => t.status !== 'done').length,
        });
    }

    private async completeTask(args: Record<string, unknown>): Promise<ToolResult> {
        const id = args['id'] as string;
        const task = this.store!.tasks.find(t => t.id === id);

        if (!task) {
            return this.createResult(`Task not found: ${id}`, true);
        }

        task.status = 'done';
        task.completedAt = new Date().toISOString();
        await this.save();

        return this.createResult({ message: `Completed task: "${task.title}"`, task });
    }

    private async deleteTask(args: Record<string, unknown>): Promise<ToolResult> {
        const id = args['id'] as string;
        const index = this.store!.tasks.findIndex(t => t.id === id);

        if (index === -1) {
            return this.createResult(`Task not found: ${id}`, true);
        }

        const removed = this.store!.tasks.splice(index, 1)[0]!;
        await this.save();

        return this.createResult({ message: `Deleted task: "${removed.title}"` });
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
            this.store = { ...DEFAULT_STORE, tasks: [] };
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

let taskInstance: TaskSkills | null = null;

export function getTaskSkills(options?: { filePath?: string }): TaskSkills {
    if (!taskInstance) {
        taskInstance = new TaskSkills(options);
    }
    return taskInstance;
}

export function resetTaskSkills(): void {
    taskInstance = null;
}
