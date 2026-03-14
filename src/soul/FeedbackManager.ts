/**
 * JARVIS Feedback Manager
 * 
 * Implements the self-improvement feedback loop.
 * Collects user feedback, analyzes patterns, and can suggest
 * modifications to SOUL.md based on learnings.
 * 
 * Features:
 * - Feedback collection (positive, negative, correction)
 * - Pattern analysis across feedback history
 * - SOUL.md modification suggestions
 * - Feedback-driven preference learning
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type FeedbackType = 'positive' | 'negative' | 'correction' | 'preference';
export type FeedbackCategory =
    | 'response_quality'    // Quality of agent responses
    | 'task_execution'      // How well tasks were executed
    | 'communication_style' // Tone, verbosity, format
    | 'tool_usage'          // Correct tool selection/usage
    | 'memory_accuracy'     // Remembering things correctly
    | 'proactivity'         // Being too proactive or not enough
    | 'general';            // Uncategorized

export interface FeedbackEntry {
    id: string;
    timestamp: Date;
    type: FeedbackType;
    category: FeedbackCategory;
    message: string;
    context?: {
        conversationId?: string;
        lastAgentResponse?: string;
        userQuery?: string;
    };
    resolved?: boolean;
    learningApplied?: string;
}

export interface FeedbackPattern {
    category: FeedbackCategory;
    count: number;
    recentExamples: string[];
    suggestedLearning: string;
}

export interface SoulModification {
    section: string;
    currentContent: string;
    suggestedContent: string;
    reason: string;
    basedOnPatterns: FeedbackPattern[];
}

export interface LearnedBehavior {
    id: string;
    learnedAt: Date;
    description: string;
    basedOn: string[]; // feedback IDs
    active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feedback Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class FeedbackManager {
    private feedbackHistory: FeedbackEntry[] = [];
    private learnedBehaviors: LearnedBehavior[] = [];
    private soulPath: string;
    private feedbackStorePath: string;
    private learningsStorePath: string;

    constructor(dataDir?: string) {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const baseDir = dataDir ?? join(__dirname, '..', '..', 'data', 'feedback');

        this.soulPath = join(__dirname, 'SOUL.md');
        this.feedbackStorePath = join(baseDir, 'feedback_history.json');
        this.learningsStorePath = join(baseDir, 'learned_behaviors.json');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        try {
            // Ensure data directory exists
            await fs.mkdir(dirname(this.feedbackStorePath), { recursive: true });

            // Load existing feedback history
            try {
                const feedbackData = await fs.readFile(this.feedbackStorePath, 'utf-8');
                const parsed = JSON.parse(feedbackData);
                this.feedbackHistory = parsed.map((f: FeedbackEntry) => ({
                    ...f,
                    timestamp: new Date(f.timestamp),
                }));
            } catch {
                this.feedbackHistory = [];
            }

            // Load learned behaviors
            try {
                const learningsData = await fs.readFile(this.learningsStorePath, 'utf-8');
                const parsed = JSON.parse(learningsData);
                this.learnedBehaviors = parsed.map((l: LearnedBehavior) => ({
                    ...l,
                    learnedAt: new Date(l.learnedAt),
                }));
            } catch {
                this.learnedBehaviors = [];
            }

            logger.info('FeedbackManager initialized', {
                feedbackCount: this.feedbackHistory.length,
                learningsCount: this.learnedBehaviors.length,
            });
        } catch (error) {
            logger.error('Failed to initialize FeedbackManager', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Feedback Collection
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record user feedback
     */
    async recordFeedback(
        type: FeedbackType,
        message: string,
        category: FeedbackCategory = 'general',
        context?: FeedbackEntry['context']
    ): Promise<FeedbackEntry> {
        const entry: FeedbackEntry = {
            id: `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date(),
            type,
            category,
            message,
            context,
            resolved: false,
        };

        this.feedbackHistory.push(entry);
        await this.persistFeedback();

        logger.info('Recorded feedback', { id: entry.id, type, category });

        // Auto-analyze if we have enough negative feedback in a category
        const recentNegative = this.getRecentFeedback('negative', category, 3);
        if (recentNegative.length >= 3) {
            await this.analyzeAndLearn(category);
        }

        return entry;
    }

    /**
     * Record positive feedback (shorthand)
     */
    async recordPositive(message: string, category?: FeedbackCategory): Promise<FeedbackEntry> {
        return this.recordFeedback('positive', message, category);
    }

    /**
     * Record negative feedback (shorthand)
     */
    async recordNegative(message: string, category?: FeedbackCategory): Promise<FeedbackEntry> {
        return this.recordFeedback('negative', message, category);
    }

    /**
     * Record a correction (what should have been done)
     */
    async recordCorrection(
        message: string,
        category?: FeedbackCategory,
        context?: FeedbackEntry['context']
    ): Promise<FeedbackEntry> {
        return this.recordFeedback('correction', message, category, context);
    }

    /**
     * Record a user preference
     */
    async recordPreference(
        message: string,
        category: FeedbackCategory = 'communication_style'
    ): Promise<FeedbackEntry> {
        return this.recordFeedback('preference', message, category);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Feedback Analysis
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get recent feedback of a specific type and category
     */
    getRecentFeedback(
        type?: FeedbackType,
        category?: FeedbackCategory,
        limit = 10
    ): FeedbackEntry[] {
        let filtered = this.feedbackHistory;

        if (type) {
            filtered = filtered.filter(f => f.type === type);
        }
        if (category) {
            filtered = filtered.filter(f => f.category === category);
        }

        return filtered
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    /**
     * Analyze feedback patterns
     */
    analyzePatterns(): FeedbackPattern[] {
        const patterns: Map<FeedbackCategory, FeedbackPattern> = new Map();

        // Count feedback by category (focus on negative and corrections)
        for (const entry of this.feedbackHistory) {
            if (entry.type !== 'positive') {
                const existing = patterns.get(entry.category) ?? {
                    category: entry.category,
                    count: 0,
                    recentExamples: [],
                    suggestedLearning: '',
                };

                existing.count++;
                if (existing.recentExamples.length < 3) {
                    existing.recentExamples.push(entry.message);
                }

                patterns.set(entry.category, existing);
            }
        }

        // Generate suggested learnings
        for (const pattern of patterns.values()) {
            pattern.suggestedLearning = this.generateLearning(pattern);
        }

        return Array.from(patterns.values())
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Generate a learning suggestion based on pattern
     */
    private generateLearning(pattern: FeedbackPattern): string {
        const examples = pattern.recentExamples.join('; ');

        switch (pattern.category) {
            case 'response_quality':
                return `Improve response quality: ${examples}`;
            case 'communication_style':
                return `Adjust communication style: ${examples}`;
            case 'tool_usage':
                return `Better tool selection: ${examples}`;
            case 'proactivity':
                return `Calibrate proactivity level: ${examples}`;
            case 'memory_accuracy':
                return `Improve memory usage: ${examples}`;
            case 'task_execution':
                return `Enhance task execution: ${examples}`;
            default:
                return `General improvement: ${examples}`;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Learning & Self-Improvement
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Analyze feedback and create a learned behavior
     */
    async analyzeAndLearn(category: FeedbackCategory): Promise<LearnedBehavior | null> {
        const recentFeedback = this.getRecentFeedback(undefined, category, 10);

        if (recentFeedback.length < 2) {
            return null;
        }

        // Synthesize learning from feedback
        const corrections = recentFeedback.filter(f => f.type === 'correction');
        const preferences = recentFeedback.filter(f => f.type === 'preference');
        const negative = recentFeedback.filter(f => f.type === 'negative');

        let description = '';

        if (corrections.length > 0) {
            description = `When handling ${category}, remember: ${corrections.map(c => c.message).join('; ')}`;
        } else if (preferences.length > 0) {
            description = `User preference for ${category}: ${preferences.map(p => p.message).join('; ')}`;
        } else if (negative.length > 0) {
            description = `Avoid in ${category}: ${negative.map(n => n.message).join('; ')}`;
        }

        if (!description) {
            return null;
        }

        const learning: LearnedBehavior = {
            id: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            learnedAt: new Date(),
            description,
            basedOn: recentFeedback.map(f => f.id),
            active: true,
        };

        this.learnedBehaviors.push(learning);
        await this.persistLearnings();

        // Mark feedback as resolved
        for (const feedback of recentFeedback) {
            feedback.resolved = true;
            feedback.learningApplied = learning.id;
        }
        await this.persistFeedback();

        logger.info('Created new learning', { id: learning.id, category, description });

        return learning;
    }

    /**
     * Get all active learned behaviors
     */
    getActiveLearnings(): LearnedBehavior[] {
        return this.learnedBehaviors.filter(l => l.active);
    }

    /**
     * Generate context about learned behaviors for agent prompts
     */
    getLearningsContext(): string {
        const active = this.getActiveLearnings();

        if (active.length === 0) {
            return '';
        }

        const lines = ['## Learned Behaviors', ''];
        for (const learning of active) {
            lines.push(`- ${learning.description}`);
        }

        return lines.join('\n');
    }

    /**
     * Deactivate a learning (if it's no longer relevant)
     */
    async deactivateLearning(learningId: string): Promise<boolean> {
        const learning = this.learnedBehaviors.find(l => l.id === learningId);

        if (learning) {
            learning.active = false;
            await this.persistLearnings();
            return true;
        }

        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SOUL.md Modification
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Suggest modifications to SOUL.md based on accumulated learnings
     */
    async suggestSoulModifications(): Promise<SoulModification[]> {
        const patterns = this.analyzePatterns();
        const significantPatterns = patterns.filter(p => p.count >= 3);

        if (significantPatterns.length === 0) {
            return [];
        }

        const soulContent = await this.readSoul();
        const modifications: SoulModification[] = [];

        for (const pattern of significantPatterns) {
            const modification = this.createModificationSuggestion(soulContent, pattern);
            if (modification) {
                modifications.push(modification);
            }
        }

        return modifications;
    }

    /**
     * Create a modification suggestion for a pattern
     */
    private createModificationSuggestion(
        soulContent: string,
        pattern: FeedbackPattern
    ): SoulModification | null {
        // Map categories to SOUL.md sections
        const sectionMapping: Record<FeedbackCategory, string> = {
            response_quality: '## Communication Style',
            communication_style: '## Communication Style',
            tool_usage: '## Behavioral Boundaries',
            proactivity: '### 2. Proactive Partnership',
            memory_accuracy: '## Memory Philosophy',
            task_execution: '## Behavioral Boundaries',
            general: '## Core Values',
        };

        const targetSection = sectionMapping[pattern.category];
        const sectionStart = soulContent.indexOf(targetSection);

        if (sectionStart === -1) {
            return null;
        }

        // Find section content
        const nextSection = soulContent.indexOf('\n## ', sectionStart + 1);
        const sectionEnd = nextSection === -1 ? soulContent.length : nextSection;
        const currentContent = soulContent.slice(sectionStart, sectionEnd);

        return {
            section: targetSection,
            currentContent,
            suggestedContent: currentContent + `\n\n### Learned from User Feedback\n- ${pattern.suggestedLearning}\n`,
            reason: `Based on ${pattern.count} feedback items in category: ${pattern.category}`,
            basedOnPatterns: [pattern],
        };
    }

    /**
     * Apply a modification to SOUL.md
     */
    async applySoulModification(modification: SoulModification): Promise<boolean> {
        try {
            let soulContent = await this.readSoul();

            // Replace the section
            soulContent = soulContent.replace(
                modification.currentContent,
                modification.suggestedContent
            );

            await fs.writeFile(this.soulPath, soulContent, 'utf-8');

            logger.info('Applied SOUL.md modification', { section: modification.section });

            return true;
        } catch (error) {
            logger.error('Failed to apply SOUL.md modification', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Read current SOUL.md content
     */
    async readSoul(): Promise<string> {
        try {
            return await fs.readFile(this.soulPath, 'utf-8');
        } catch {
            return '';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get feedback statistics
     */
    getStatistics(): {
        total: number;
        byType: Record<FeedbackType, number>;
        byCategory: Record<FeedbackCategory, number>;
        learningsCount: number;
        resolvedCount: number;
    } {
        const byType: Record<FeedbackType, number> = {
            positive: 0,
            negative: 0,
            correction: 0,
            preference: 0,
        };

        const byCategory: Partial<Record<FeedbackCategory, number>> = {};

        let resolvedCount = 0;

        for (const entry of this.feedbackHistory) {
            byType[entry.type]++;
            byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
            if (entry.resolved) {
                resolvedCount++;
            }
        }

        return {
            total: this.feedbackHistory.length,
            byType,
            byCategory: byCategory as Record<FeedbackCategory, number>,
            learningsCount: this.learnedBehaviors.length,
            resolvedCount,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    private async persistFeedback(): Promise<void> {
        try {
            await fs.mkdir(dirname(this.feedbackStorePath), { recursive: true });
            await fs.writeFile(
                this.feedbackStorePath,
                JSON.stringify(this.feedbackHistory, null, 2),
                'utf-8'
            );
        } catch (error) {
            logger.error('Failed to persist feedback', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private async persistLearnings(): Promise<void> {
        try {
            await fs.mkdir(dirname(this.learningsStorePath), { recursive: true });
            await fs.writeFile(
                this.learningsStorePath,
                JSON.stringify(this.learnedBehaviors, null, 2),
                'utf-8'
            );
        } catch (error) {
            logger.error('Failed to persist learnings', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let feedbackInstance: FeedbackManager | null = null;

export function getFeedbackManager(): FeedbackManager {
    if (!feedbackInstance) {
        feedbackInstance = new FeedbackManager();
    }
    return feedbackInstance;
}

export async function initializeFeedbackManager(dataDir?: string): Promise<FeedbackManager> {
    feedbackInstance = new FeedbackManager(dataDir);
    await feedbackInstance.initialize();
    return feedbackInstance;
}

export function resetFeedbackManager(): void {
    feedbackInstance = null;
}
