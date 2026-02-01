/**
 * JARVIS Heartbeat Scheduler
 * 
 * Cron-based scheduling system for proactive tasks:
 * - Morning briefings
 * - Email/notification triage
 * - Pipeline monitoring
 * - Periodic health checks
 * - Custom user-defined schedules
 */

import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface HeartbeatTask {
    id: string;
    name: string;
    description: string;
    /** Cron expression: "minute hour dayOfMonth month dayOfWeek" */
    schedule: string;
    /** The prompt to send to the agent when triggered */
    prompt: string;
    /** Whether the task is currently enabled */
    enabled: boolean;
    /** Optional: channel to send results to */
    channel?: string;
    /** Optional: priority (higher = more urgent) */
    priority?: number;
    /** Last execution time */
    lastRun?: Date;
    /** Next scheduled execution */
    nextRun?: Date;
    /** Execution count */
    runCount: number;
    /** Created at */
    createdAt: Date;
}

export interface HeartbeatConfig {
    /** Check interval in milliseconds (default: 60000 = 1 minute) */
    checkInterval?: number;
    /** Timezone for schedule interpretation */
    timezone?: string;
    /** Maximum concurrent tasks */
    maxConcurrent?: number;
}

export type HeartbeatHandler = (task: HeartbeatTask) => Promise<void>;

// ═══════════════════════════════════════════════════════════════════════════════
// Cron Parser (simplified)
// ═══════════════════════════════════════════════════════════════════════════════

interface CronParts {
    minute: number[];
    hour: number[];
    dayOfMonth: number[];
    month: number[];
    dayOfWeek: number[];
}

function parseCronExpression(cron: string): CronParts {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
        throw new Error(`Invalid cron expression: ${cron}. Expected 5 parts.`);
    }

    return {
        minute: parseCronPart(parts[0]!, 0, 59),
        hour: parseCronPart(parts[1]!, 0, 23),
        dayOfMonth: parseCronPart(parts[2]!, 1, 31),
        month: parseCronPart(parts[3]!, 1, 12),
        dayOfWeek: parseCronPart(parts[4]!, 0, 6),
    };
}

function parseCronPart(part: string, min: number, max: number): number[] {
    const values: number[] = [];

    // Handle wildcard
    if (part === '*') {
        for (let i = min; i <= max; i++) values.push(i);
        return values;
    }

    // Handle step values (*/5)
    if (part.startsWith('*/')) {
        const step = parseInt(part.slice(2), 10);
        for (let i = min; i <= max; i += step) values.push(i);
        return values;
    }

    // Handle ranges (1-5) and lists (1,3,5)
    const segments = part.split(',');
    for (const segment of segments) {
        if (segment.includes('-')) {
            const rangeParts = segment.split('-');
            const start = parseInt(rangeParts[0] ?? '0', 10);
            const end = parseInt(rangeParts[1] ?? '0', 10);
            for (let i = start; i <= end; i++) values.push(i);
        } else {
            values.push(parseInt(segment, 10));
        }
    }

    return values.filter(v => v >= min && v <= max);
}

function matchesCron(cron: CronParts, date: Date): boolean {
    return (
        cron.minute.includes(date.getMinutes()) &&
        cron.hour.includes(date.getHours()) &&
        cron.dayOfMonth.includes(date.getDate()) &&
        cron.month.includes(date.getMonth() + 1) &&
        cron.dayOfWeek.includes(date.getDay())
    );
}

function calculateNextRun(cronExpr: string, after: Date = new Date()): Date {
    const cron = parseCronExpression(cronExpr);
    const next = new Date(after);
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    // Search up to 1 year ahead
    const maxIterations = 60 * 24 * 365;
    for (let i = 0; i < maxIterations; i++) {
        if (matchesCron(cron, next)) {
            return next;
        }
        next.setMinutes(next.getMinutes() + 1);
    }

    throw new Error(`Could not find next run for cron: ${cronExpr}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Heartbeat Scheduler
// ═══════════════════════════════════════════════════════════════════════════════

export class HeartbeatScheduler {
    private tasks: Map<string, HeartbeatTask> = new Map();
    private handlers: HeartbeatHandler[] = [];
    private checkInterval: number;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private activeTasks: Set<string> = new Set();
    private maxConcurrent: number;

    constructor(config: HeartbeatConfig = {}) {
        this.checkInterval = config.checkInterval ?? 60000; // 1 minute
        this.maxConcurrent = config.maxConcurrent ?? 5;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.isRunning) {
            logger.warn('Heartbeat scheduler already running');
            return;
        }

        this.isRunning = true;

        // Run immediately, then on interval
        this.checkTasks();
        this.intervalId = setInterval(() => this.checkTasks(), this.checkInterval);

        logger.gateway('Heartbeat scheduler started', {
            checkInterval: this.checkInterval,
            taskCount: this.tasks.size,
        });
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        logger.gateway('Heartbeat scheduler stopped');
    }

    /**
     * Check if scheduler is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Task Management
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a new heartbeat task
     */
    registerTask(task: Omit<HeartbeatTask, 'id' | 'createdAt' | 'runCount' | 'nextRun'>): HeartbeatTask {
        const id = randomUUID();
        const now = new Date();

        const fullTask: HeartbeatTask = {
            ...task,
            id,
            createdAt: now,
            runCount: 0,
            nextRun: task.enabled ? calculateNextRun(task.schedule) : undefined,
        };

        this.tasks.set(id, fullTask);

        logger.gateway('Registered heartbeat task', {
            id,
            name: task.name,
            schedule: task.schedule,
            nextRun: fullTask.nextRun?.toISOString(),
        });

        return fullTask;
    }

    /**
     * Unregister a task
     */
    unregisterTask(taskId: string): boolean {
        const deleted = this.tasks.delete(taskId);
        if (deleted) {
            logger.gateway('Unregistered heartbeat task', { taskId });
        }
        return deleted;
    }

    /**
     * Enable/disable a task
     */
    setTaskEnabled(taskId: string, enabled: boolean): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        task.enabled = enabled;
        if (enabled) {
            task.nextRun = calculateNextRun(task.schedule);
        } else {
            task.nextRun = undefined;
        }

        logger.gateway('Task enable toggled', { taskId, enabled });
        return true;
    }

    /**
     * Get all registered tasks
     */
    getTasks(): HeartbeatTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Get a specific task
     */
    getTask(taskId: string): HeartbeatTask | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * Update a task's schedule
     */
    updateTaskSchedule(taskId: string, schedule: string): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        // Validate cron expression
        try {
            parseCronExpression(schedule);
        } catch (error) {
            return false;
        }

        task.schedule = schedule;
        if (task.enabled) {
            task.nextRun = calculateNextRun(schedule);
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Handler Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a handler to be called when tasks are triggered
     */
    onTask(handler: HeartbeatHandler): void {
        this.handlers.push(handler);
    }

    /**
     * Remove all handlers
     */
    clearHandlers(): void {
        this.handlers = [];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check and execute due tasks
     */
    private async checkTasks(): Promise<void> {
        const now = new Date();

        for (const task of this.tasks.values()) {
            // Skip if not enabled or already running
            if (!task.enabled || this.activeTasks.has(task.id)) {
                continue;
            }

            // Skip if at max concurrent
            if (this.activeTasks.size >= this.maxConcurrent) {
                logger.warn('Max concurrent heartbeat tasks reached');
                break;
            }

            // Check if task is due
            if (task.nextRun && now >= task.nextRun) {
                this.executeTask(task);
            }
        }
    }

    /**
     * Execute a task
     */
    private async executeTask(task: HeartbeatTask): Promise<void> {
        this.activeTasks.add(task.id);

        logger.gateway('Executing heartbeat task', {
            id: task.id,
            name: task.name,
        });

        try {
            // Call all handlers
            const handlerPromises = this.handlers.map(handler =>
                handler(task).catch(error => {
                    logger.error('Heartbeat handler error', {
                        taskId: task.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                })
            );

            await Promise.all(handlerPromises);

            // Update task state
            task.lastRun = new Date();
            task.runCount++;
            task.nextRun = calculateNextRun(task.schedule, task.lastRun);

            logger.gateway('Heartbeat task completed', {
                id: task.id,
                name: task.name,
                nextRun: task.nextRun.toISOString(),
            });
        } catch (error) {
            logger.error('Heartbeat task execution failed', {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.activeTasks.delete(task.id);
        }
    }

    /**
     * Manually trigger a task (for testing)
     */
    async triggerTask(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        await this.executeTask(task);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Preset Tasks
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register common preset tasks
     */
    registerPresets(): void {
        // Morning briefing at 8 AM daily
        this.registerTask({
            name: 'morning-briefing',
            description: 'Daily morning summary of calendar, tasks, and important updates',
            schedule: '0 8 * * *',
            prompt: `Good morning! Please provide my daily briefing:
1. What's on my calendar today?
2. Any urgent tasks or reminders?
3. Important emails or messages to address?
4. Weather summary for today.
Keep it concise and actionable.`,
            enabled: false, // User must enable
            priority: 10,
        });

        // Hourly email check
        this.registerTask({
            name: 'email-triage',
            description: 'Hourly email inbox scan for important messages',
            schedule: '0 * * * *',
            prompt: `Check my inbox for any urgent or important emails. Summarize:
1. Messages requiring immediate response
2. VIP sender messages
3. Any spam to unsubscribe from
Only report if there's something actionable.`,
            enabled: false,
            priority: 5,
        });

        // Pipeline monitoring every 30 minutes
        this.registerTask({
            name: 'pipeline-monitor',
            description: 'Monitor CI/CD pipelines and development workflows',
            schedule: '*/30 * * * *',
            prompt: `Check development pipeline status:
1. Any failing CI/CD builds?
2. Open pull requests needing review?
3. Error logs from monitoring (Sentry, etc)?
Only report issues, stay silent if everything is green.`,
            enabled: false,
            priority: 7,
        });

        // Evening summary at 6 PM
        this.registerTask({
            name: 'evening-summary',
            description: 'End of day summary and planning for tomorrow',
            schedule: '0 18 * * *',
            prompt: `Provide my end-of-day summary:
1. What did I accomplish today?
2. Any tasks that are overdue?
3. What should I prepare for tomorrow?
4. Suggest one thing to wind down.`,
            enabled: false,
            priority: 8,
        });

        // Weekly review on Sundays
        this.registerTask({
            name: 'weekly-review',
            description: 'Weekly productivity and goal review',
            schedule: '0 10 * * 0',
            prompt: `It's time for my weekly review:
1. Key accomplishments this week
2. Goals progress update
3. Lessons learned or improvements
4. Top priorities for next week
Make it reflective and forward-looking.`,
            enabled: false,
            priority: 9,
        });

        logger.gateway('Registered preset heartbeat tasks', {
            count: 5,
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let schedulerInstance: HeartbeatScheduler | null = null;

export function getHeartbeatScheduler(): HeartbeatScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new HeartbeatScheduler();
    }
    return schedulerInstance;
}

export function resetHeartbeatScheduler(): void {
    if (schedulerInstance) {
        schedulerInstance.stop();
        schedulerInstance = null;
    }
}
