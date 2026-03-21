/**
 * JARVIS Lesson Memory
 *
 * Implements the meta-learning capability (AGI feature).
 * Tracks success/failure rates of tool usage and tasks.
 * Stores explicit and implicit lessons derived from mistakes
 * or user corrections for injection into future run sessions.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

export interface Lesson {
    id: string;
    topic: string; // e.g. 'coding_style', 'tool_usage', 'user_preference'
    trigger: string; // The context that triggered this lesson being learned
    rule: string; // The actionable instruction to inject into the system prompt
    appliedCount: number;
    createdAt: string;
}

export interface ToolUsageStat {
    success: number;
    failure: number;
    lastFailureReason?: string;
}

interface MetaStore {
    version: string;
    lessons: Lesson[];
    toolStats: Record<string, ToolUsageStat>;
}

const DEFAULT_STORE: MetaStore = { version: '1.0.0', lessons: [], toolStats: {} };
const DEFAULT_PATH = resolve('./data/memory/meta_learning.json');

export class LessonMemory {
    private filePath: string;
    private store: MetaStore | null = null;
    private isDirty: boolean = false;

    constructor(filePath?: string) {
        this.filePath = filePath ?? DEFAULT_PATH;
    }

    /**
     * Initializes the Meta Learning local store.
     */
    async initialize(): Promise<void> {
        if (this.store) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        if (existsSync(this.filePath)) {
            try {
                const content = await readFile(this.filePath, 'utf-8');
                this.store = JSON.parse(content);
            } catch (err) {
                logger.error('Failed to parse meta learning store. Recreating.', { error: String(err) });
                this.store = { ...DEFAULT_STORE };
            }
        } else {
            this.store = { ...DEFAULT_STORE };
            await this.save();
        }

        logger.info('Meta-Learning subsystem initialized', { 
            lessons: this.store!.lessons.length, 
            trackedTools: Object.keys(this.store!.toolStats).length 
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lesson Management
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Store a new lesson to improve future behavior natively
     */
    async addLesson(topic: string, trigger: string, rule: string): Promise<Lesson> {
        await this.ensureLoaded();

        const lesson: Lesson = {
            id: randomUUID(),
            topic,
            trigger,
            rule,
            appliedCount: 0,
            createdAt: new Date().toISOString(),
        };

        this.store!.lessons.push(lesson);
        this.isDirty = true;
        await this.save();

        logger.info('Learned a new lesson', { topic, rule });
        return lesson;
    }

    /**
     * Generate the dynamic lesson augmentation string for System Prompts.
     * Selects lessons that are most relevant (currently selects all, could be vectorized).
     */
    async getLessonAugmentation(): Promise<string> {
        await this.ensureLoaded();

        if (this.store!.lessons.length === 0) return '';

        let injection = `\n## Meta-Learned Core Directives\n`;
        injection += `The following rules have been uniquely learned from past mistakes or explicit user corrections. Prioritize them highly:\n`;

        for (const lesson of this.store!.lessons) {
            injection += `- [${lesson.topic.toUpperCase()}]: ${lesson.rule}\n`;
            lesson.appliedCount++;
        }

        if (this.store!.lessons.length > 0) {
            this.isDirty = true;
            this.save().catch(e => logger.warn('Failed to save appliedCount', { error: String(e) }));
        }

        return injection;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Telemetry
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Track a specific tool invocation outcome for pattern observation
     */
    async recordToolUsage(toolName: string, success: boolean, failureReason?: string): Promise<void> {
        await this.ensureLoaded();

        if (!this.store!.toolStats[toolName]) {
            this.store!.toolStats[toolName] = { success: 0, failure: 0 };
        }

        const stat = this.store!.toolStats[toolName]!;
        if (success) {
            stat.success++;
        } else {
            stat.failure++;
            if (failureReason) {
                stat.lastFailureReason = failureReason;
            }
        }

        this.isDirty = true;
        // Optimization: Do not block for logging
        this.save().catch(e => logger.warn('Failed to save tool telemetry', { error: String(e) }));
    }

    /**
     * Returns tool telemetry. Useful for reflection mechanics if the agent is trying 
     * failing tools repeatedly without progress.
     */
    async getToolTelemetry(): Promise<Record<string, ToolUsageStat>> {
        await this.ensureLoaded();
        return this.store!.toolStats;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    private async ensureLoaded(): Promise<void> {
        if (!this.store) {
            await this.initialize();
        }
    }

    private async save(): Promise<void> {
        if (!this.store || !this.isDirty) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const content = JSON.stringify(this.store, null, 2);
        const tmpPath = `${this.filePath}.tmp`;
        await writeFile(tmpPath, content, 'utf-8');
        await rename(tmpPath, this.filePath);
        
        this.isDirty = false;
    }
}

// Singleton
let lessonMemoryInstance: LessonMemory | null = null;

export function getLessonMemory(): LessonMemory {
    if (!lessonMemoryInstance) {
        lessonMemoryInstance = new LessonMemory();
    }
    return lessonMemoryInstance;
}
