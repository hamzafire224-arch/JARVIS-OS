/**
 * JARVIS Preference Learning Module
 * 
 * Learns user preferences over time to personalize JARVIS behavior:
 * - Tracks user feedback patterns (explicit and implicit)
 * - Learns communication style preferences
 * - Adapts tool usage patterns
 * - Maintains user-specific settings
 */

import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { constants } from 'fs';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Preference Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserPreferences {
    userId: string;
    createdAt: string;
    updatedAt: string;

    // Communication preferences
    communication: {
        verbosity: 'concise' | 'balanced' | 'detailed';
        formality: 'casual' | 'professional' | 'formal';
        codeCommentLevel: 'minimal' | 'moderate' | 'extensive';
        useEmoji: boolean;
        preferredLanguage: string;
    };

    // Tool usage preferences
    tools: {
        autoApprove: string[]; // Tool names to auto-approve
        neverUse: string[]; // Tools to never suggest
        preferredShell: string;
        defaultEditor: string;
    };

    // Behavior preferences
    behavior: {
        proactivity: 'reactive' | 'balanced' | 'proactive';
        explainBefore: boolean; // Explain before actions
        askConfirmation: boolean; // Ask before destructive ops
        showProgress: boolean; // Show progress for long tasks
    };

    // Learning data (internal)
    _learning: {
        feedbackHistory: FeedbackEntry[];
        interactionPatterns: InteractionPattern[];
        topicAffinity: Record<string, number>; // topic -> affinity score
        timePatterns: TimePattern[];
    };
}

export interface FeedbackEntry {
    timestamp: string;
    type: 'positive' | 'negative' | 'correction' | 'preference';
    context: string;
    value?: string;
    topic?: string;
}

export interface InteractionPattern {
    pattern: string;
    occurrences: number;
    lastSeen: string;
    category: 'style' | 'tool' | 'topic' | 'timing';
}

export interface TimePattern {
    hour: number;
    dayOfWeek: number;
    activityLevel: number;
    preferredTopics: string[];
}

export interface PreferenceUpdate {
    path: string; // dot notation path like "communication.verbosity"
    value: unknown;
    reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Preferences
// ═══════════════════════════════════════════════════════════════════════════════

function createDefaultPreferences(userId: string): UserPreferences {
    return {
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        communication: {
            verbosity: 'balanced',
            formality: 'professional',
            codeCommentLevel: 'moderate',
            useEmoji: false,
            preferredLanguage: 'en',
        },

        tools: {
            autoApprove: [],
            neverUse: [],
            preferredShell: process.platform === 'win32' ? 'powershell' : 'bash',
            defaultEditor: 'vscode',
        },

        behavior: {
            proactivity: 'balanced',
            explainBefore: true,
            askConfirmation: true,
            showProgress: true,
        },

        _learning: {
            feedbackHistory: [],
            interactionPatterns: [],
            topicAffinity: {},
            timePatterns: [],
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preference Learning Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class PreferenceLearner {
    private preferences: Map<string, UserPreferences> = new Map();
    private storagePath: string;
    private maxFeedbackHistory: number;
    private maxPatterns: number;

    constructor(options: {
        storagePath?: string;
        maxFeedbackHistory?: number;
        maxPatterns?: number;
    } = {}) {
        this.storagePath = options.storagePath ?? '.jarvis/preferences';
        this.maxFeedbackHistory = options.maxFeedbackHistory ?? 500;
        this.maxPatterns = options.maxPatterns ?? 100;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Preference Management
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get preferences for a user, loading from disk or creating defaults
     */
    async getPreferences(userId: string): Promise<UserPreferences> {
        // Check cache
        if (this.preferences.has(userId)) {
            return this.preferences.get(userId)!;
        }

        // Try to load from disk
        const filePath = this.getPreferencePath(userId);
        try {
            await access(filePath, constants.R_OK);
            const data = await readFile(filePath, 'utf-8');
            const prefs = JSON.parse(data) as UserPreferences;
            this.preferences.set(userId, prefs);
            logger.memory('Loaded preferences', { userId });
            return prefs;
        } catch {
            // Create defaults
            const prefs = createDefaultPreferences(userId);
            this.preferences.set(userId, prefs);
            await this.savePreferences(userId);
            logger.memory('Created default preferences', { userId });
            return prefs;
        }
    }

    /**
     * Update specific preferences
     */
    async updatePreferences(userId: string, updates: PreferenceUpdate[]): Promise<void> {
        const prefs = await this.getPreferences(userId);

        for (const update of updates) {
            this.setNestedValue(prefs as unknown as Record<string, unknown>, update.path, update.value);

            // Track why this changed
            if (update.reason) {
                prefs._learning.feedbackHistory.push({
                    timestamp: new Date().toISOString(),
                    type: 'preference',
                    context: update.path,
                    value: String(update.value),
                });
            }
        }

        prefs.updatedAt = new Date().toISOString();
        await this.savePreferences(userId);

        logger.memory('Updated preferences', {
            userId,
            updates: updates.map(u => u.path)
        });
    }

    /**
     * Save preferences to disk
     */
    private async savePreferences(userId: string): Promise<void> {
        const prefs = this.preferences.get(userId);
        if (!prefs) return;

        const filePath = this.getPreferencePath(userId);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(prefs, null, 2), 'utf-8');
    }

    private getPreferencePath(userId: string): string {
        const safeId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
        return join(this.storagePath, `${safeId}.json`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Feedback Processing
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record explicit feedback (thumbs up/down, corrections)
     */
    async recordFeedback(
        userId: string,
        type: FeedbackEntry['type'],
        context: string,
        value?: string
    ): Promise<void> {
        const prefs = await this.getPreferences(userId);

        prefs._learning.feedbackHistory.push({
            timestamp: new Date().toISOString(),
            type,
            context,
            value,
        });

        // Trim history if needed
        if (prefs._learning.feedbackHistory.length > this.maxFeedbackHistory) {
            prefs._learning.feedbackHistory = prefs._learning.feedbackHistory.slice(-this.maxFeedbackHistory);
        }

        // Analyze patterns based on feedback type
        if (type === 'negative') {
            await this.analyzeNegativeFeedback(userId, context, value);
        } else if (type === 'positive') {
            await this.analyzePositiveFeedback(userId, context);
        } else if (type === 'correction') {
            await this.analyzeCorrection(userId, context, value);
        }

        await this.savePreferences(userId);
    }

    /**
     * Learn from a negative feedback instance
     */
    private async analyzeNegativeFeedback(
        userId: string,
        context: string,
        value?: string
    ): Promise<void> {
        const prefs = await this.getPreferences(userId);

        // Check for verbosity complaints
        if (this.matchesPattern(context, ['too long', 'verbose', 'shorter', 'tldr', 'too much'])) {
            this.increasePatternWeight(prefs, 'verbosity_too_high');
            if (this.getPatternWeight(prefs, 'verbosity_too_high') >= 3) {
                prefs.communication.verbosity = 'concise';
            }
        }

        // Check for brevity complaints
        if (this.matchesPattern(context, ['too short', 'more detail', 'explain more', 'unclear'])) {
            this.increasePatternWeight(prefs, 'verbosity_too_low');
            if (this.getPatternWeight(prefs, 'verbosity_too_low') >= 3) {
                prefs.communication.verbosity = 'detailed';
            }
        }

        // Check for formality issues
        if (this.matchesPattern(context, ['too casual', 'unprofessional'])) {
            this.increasePatternWeight(prefs, 'too_casual');
            if (this.getPatternWeight(prefs, 'too_casual') >= 2) {
                prefs.communication.formality = 'formal';
            }
        }

        // Check for tool-related issues
        if (this.matchesPattern(context, ["don't use", 'stop using', 'never', 'avoid'])) {
            const toolMatch = value?.match(/(\w+_\w+|\w+)/);
            if (toolMatch?.[1] && !prefs.tools.neverUse.includes(toolMatch[1])) {
                prefs.tools.neverUse.push(toolMatch[1]);
            }
        }
    }

    /**
     * Learn from positive feedback
     */
    private async analyzePositiveFeedback(userId: string, context: string): Promise<void> {
        const prefs = await this.getPreferences(userId);

        // Extract topics from positive feedback
        const topics = this.extractTopics(context);
        for (const topic of topics) {
            prefs._learning.topicAffinity[topic] = (prefs._learning.topicAffinity[topic] ?? 0) + 1;
        }

        // Reinforce current behavior patterns
        if (this.matchesPattern(context, ['perfect', 'exactly', 'great explanation', 'love it'])) {
            // Current settings are working well, increase confidence
            this.increasePatternWeight(prefs, 'current_style_works');
        }
    }

    /**
     * Learn from user corrections
     */
    private async analyzeCorrection(userId: string, context: string, correctedValue?: string): Promise<void> {
        const prefs = await this.getPreferences(userId);

        // Style corrections
        if (this.matchesPattern(context, ['use', 'always', 'prefer', 'instead'])) {
            // Detect language preference
            if (this.matchesPattern(context, ['typescript', 'ts'])) {
                prefs._learning.topicAffinity['typescript'] = (prefs._learning.topicAffinity['typescript'] ?? 0) + 5;
            }
            if (this.matchesPattern(context, ['python', 'py'])) {
                prefs._learning.topicAffinity['python'] = (prefs._learning.topicAffinity['python'] ?? 0) + 5;
            }
        }

        // Code comment preference
        if (this.matchesPattern(context, ['more comments', 'add comments', 'document'])) {
            prefs.communication.codeCommentLevel = 'extensive';
        }
        if (this.matchesPattern(context, ['less comments', 'no comments', 'clean code'])) {
            prefs.communication.codeCommentLevel = 'minimal';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Implicit Learning
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Learn from interaction patterns (called after each conversation turn)
     */
    async learnFromInteraction(
        userId: string,
        interaction: {
            userMessage: string;
            assistantMessage: string;
            toolsUsed?: string[];
            wasHelpful?: boolean;
            responseTime?: number;
        }
    ): Promise<void> {
        const prefs = await this.getPreferences(userId);
        const now = new Date();

        // Learn time patterns
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const topics = this.extractTopics(interaction.userMessage);

        let timePattern = prefs._learning.timePatterns.find(
            p => p.hour === hour && p.dayOfWeek === dayOfWeek
        );

        if (!timePattern) {
            timePattern = {
                hour,
                dayOfWeek,
                activityLevel: 0,
                preferredTopics: [],
            };
            prefs._learning.timePatterns.push(timePattern);
        }

        timePattern.activityLevel++;
        timePattern.preferredTopics = [...new Set([...timePattern.preferredTopics, ...topics])].slice(0, 10);

        // Learn topic affinity
        for (const topic of topics) {
            prefs._learning.topicAffinity[topic] = (prefs._learning.topicAffinity[topic] ?? 0) + 0.5;
        }

        // Learn tool preferences
        if (interaction.toolsUsed && interaction.wasHelpful !== false) {
            for (const tool of interaction.toolsUsed) {
                this.increasePatternWeight(prefs, `tool_success_${tool}`);
            }
        }

        // Trim old patterns
        if (prefs._learning.timePatterns.length > this.maxPatterns) {
            prefs._learning.timePatterns = prefs._learning.timePatterns.slice(-this.maxPatterns);
        }

        await this.savePreferences(userId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Preference Application
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate a system prompt modifier based on user preferences
     */
    async getSystemPromptModifier(userId: string): Promise<string> {
        const prefs = await this.getPreferences(userId);
        const modifiers: string[] = [];

        // Communication style
        switch (prefs.communication.verbosity) {
            case 'concise':
                modifiers.push('Be brief and to the point. Avoid unnecessary explanations.');
                break;
            case 'detailed':
                modifiers.push('Provide thorough explanations with context and examples.');
                break;
        }

        switch (prefs.communication.formality) {
            case 'casual':
                modifiers.push('Use a friendly, casual tone.');
                break;
            case 'formal':
                modifiers.push('Maintain a formal, professional tone.');
                break;
        }

        // Code style
        switch (prefs.communication.codeCommentLevel) {
            case 'minimal':
                modifiers.push('Write clean code with minimal comments.');
                break;
            case 'extensive':
                modifiers.push('Include detailed comments explaining the code.');
                break;
        }

        // Behavior
        if (prefs.behavior.explainBefore) {
            modifiers.push('Explain your approach before taking action.');
        }

        if (prefs.behavior.proactivity === 'proactive') {
            modifiers.push('Proactively suggest improvements and next steps.');
        } else if (prefs.behavior.proactivity === 'reactive') {
            modifiers.push('Wait for explicit instructions before taking action.');
        }

        // Topic expertise (highlight user interests)
        const topTopics = Object.entries(prefs._learning.topicAffinity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic]) => topic);

        if (topTopics.length > 0) {
            modifiers.push(`User has shown interest in: ${topTopics.join(', ')}.`);
        }

        // Tool preferences
        if (prefs.tools.neverUse.length > 0) {
            modifiers.push(`Avoid using these tools: ${prefs.tools.neverUse.join(', ')}.`);
        }

        return modifiers.length > 0
            ? `\n\n## User Preferences\n${modifiers.map(m => `- ${m}`).join('\n')}`
            : '';
    }

    /**
     * Check if a tool should be auto-approved
     */
    async shouldAutoApprove(userId: string, toolName: string): Promise<boolean> {
        const prefs = await this.getPreferences(userId);
        return prefs.tools.autoApprove.includes(toolName);
    }

    /**
     * Check if a tool should never be used
     */
    async shouldAvoidTool(userId: string, toolName: string): Promise<boolean> {
        const prefs = await this.getPreferences(userId);
        return prefs.tools.neverUse.includes(toolName);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Utility Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private matchesPattern(text: string, patterns: string[]): boolean {
        const lower = text.toLowerCase();
        return patterns.some(p => lower.includes(p.toLowerCase()));
    }

    private extractTopics(text: string): string[] {
        // Simple topic extraction based on keywords
        const topicKeywords: Record<string, string[]> = {
            typescript: ['typescript', 'ts', '.ts', 'tsc'],
            javascript: ['javascript', 'js', '.js', 'node'],
            python: ['python', 'py', '.py', 'pip'],
            react: ['react', 'jsx', 'tsx', 'component'],
            database: ['database', 'sql', 'postgres', 'mysql', 'mongo'],
            api: ['api', 'rest', 'graphql', 'endpoint'],
            testing: ['test', 'jest', 'vitest', 'mocha', 'pytest'],
            deployment: ['deploy', 'docker', 'kubernetes', 'ci/cd'],
            git: ['git', 'commit', 'branch', 'merge', 'pr'],
        };

        const lower = text.toLowerCase();
        const topics: string[] = [];

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(k => lower.includes(k))) {
                topics.push(topic);
            }
        }

        return topics;
    }

    private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
        const parts = path.split('.');
        let current: Record<string, unknown> = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part === undefined) continue;
            if (!(part in current) || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
        }

        const lastPart = parts[parts.length - 1];
        if (lastPart !== undefined) {
            current[lastPart] = value;
        }
    }

    private increasePatternWeight(prefs: UserPreferences, patternId: string): void {
        let pattern = prefs._learning.interactionPatterns.find(p => p.pattern === patternId);

        if (!pattern) {
            pattern = {
                pattern: patternId,
                occurrences: 0,
                lastSeen: new Date().toISOString(),
                category: 'style',
            };
            prefs._learning.interactionPatterns.push(pattern);
        }

        pattern.occurrences++;
        pattern.lastSeen = new Date().toISOString();
    }

    private getPatternWeight(prefs: UserPreferences, patternId: string): number {
        const pattern = prefs._learning.interactionPatterns.find(p => p.pattern === patternId);
        return pattern?.occurrences ?? 0;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Analytics
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get insights about user preferences
     */
    async getInsights(userId: string): Promise<{
        topTopics: Array<{ topic: string; score: number }>;
        activeHours: number[];
        preferredTools: string[];
        feedbackSummary: {
            positive: number;
            negative: number;
            corrections: number;
        };
    }> {
        const prefs = await this.getPreferences(userId);

        // Top topics
        const topTopics = Object.entries(prefs._learning.topicAffinity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic, score]) => ({ topic, score }));

        // Active hours
        const hourActivity = new Map<number, number>();
        for (const pattern of prefs._learning.timePatterns) {
            const current = hourActivity.get(pattern.hour) ?? 0;
            hourActivity.set(pattern.hour, current + pattern.activityLevel);
        }
        const activeHours = [...hourActivity.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hour]) => hour);

        // Preferred tools (from successful patterns)
        const preferredTools = prefs._learning.interactionPatterns
            .filter(p => p.pattern.startsWith('tool_success_'))
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 5)
            .map(p => p.pattern.replace('tool_success_', ''));

        // Feedback summary
        const feedbackSummary = {
            positive: prefs._learning.feedbackHistory.filter(f => f.type === 'positive').length,
            negative: prefs._learning.feedbackHistory.filter(f => f.type === 'negative').length,
            corrections: prefs._learning.feedbackHistory.filter(f => f.type === 'correction').length,
        };

        return {
            topTopics,
            activeHours,
            preferredTools,
            feedbackSummary,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let learnerInstance: PreferenceLearner | null = null;

export function getPreferenceLearner(options?: ConstructorParameters<typeof PreferenceLearner>[0]): PreferenceLearner {
    if (!learnerInstance) {
        learnerInstance = new PreferenceLearner(options);
    }
    return learnerInstance;
}

export function resetPreferenceLearner(): void {
    learnerInstance = null;
}
