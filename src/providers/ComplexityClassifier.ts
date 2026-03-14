/**
 * JARVIS Complexity Classifier
 * 
 * Determines the complexity of a user request to route to the appropriate model tier.
 * Simple tasks → Local model (free)
 * Complex tasks → Cloud model (paid)
 * 
 * This saves 80-90% on API costs by using cheap/free local models for:
 * - Heartbeat checks ("anything important happen?")
 * - Simple yes/no decisions
 * - Quick status queries
 * - Routine reminders
 */

import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

export interface ComplexityResult {
    level: ComplexityLevel;
    score: number;           // 0-100, higher = more complex
    reason: string;
    suggestLocalModel: boolean;
    features: ComplexityFeatures;
}

export interface ComplexityFeatures {
    wordCount: number;
    hasCodeRequest: boolean;
    hasMultiStep: boolean;
    hasCreativeRequest: boolean;
    hasResearchRequest: boolean;
    hasMemoryRequest: boolean;
    hasToolRequest: boolean;
    isQuestion: boolean;
    isCommand: boolean;
    estimatedTokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pattern Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// Patterns that indicate SIMPLE requests (can be handled by local model)
const SIMPLE_PATTERNS = [
    // Status checks
    /^(hi|hello|hey|good morning|good evening)/i,
    /what('?s| is) (the )?time/i,
    /what('?s| is) (the )?date/i,
    /what('?s| is) (the )?weather/i,
    /how are you/i,
    /thank(s| you)/i,

    // Yes/no questions
    /^(is|are|was|were|do|does|did|can|could|will|would|should) /i,

    // Simple queries
    /remind me (to|about)/i,
    /^set (a )?reminder/i,
    /^add (to|a) (my )?(list|todo|task)/i,
    /^what('?s| is) on my (calendar|schedule)/i,
    /^check (my )?(email|messages|notifications)/i,

    // Confirmations
    /^(yes|no|ok|okay|sure|got it|understood)/i,
    /^(cancel|stop|abort|never ?mind)/i,
];

// Patterns that indicate COMPLEX requests (need powerful model)
const COMPLEX_PATTERNS = [
    // Code-related
    /\b(code|program|script|function|class|api|debug|fix|refactor|implement)\b/i,
    /\b(javascript|typescript|python|java|c\+\+|rust|go|ruby|php|sql)\b/i,
    /```[\s\S]*```/,  // Code blocks

    // Multi-step tasks
    /\b(and then|after that|next|first|second|third|finally|step \d+)\b/i,
    /\b(create|build|develop|design|architect|plan)\b.*\b(app|application|website|system|service)\b/i,

    // Creative/analytical
    /\b(write|compose|draft|create) (a |an )?(story|essay|article|blog|poem|email|letter|report)\b/i,
    /\b(analyze|analyse|evaluate|compare|contrast|summarize|explain in detail)\b/i,
    /\b(brainstorm|ideate|suggest|recommend|advise)\b/i,

    // Research
    /\b(research|investigate|find out|look up|search for)\b/i,
    /\b(explain|describe|elaborate|tell me (more )?about)\b.*\b(how|why|what)\b/i,

    // Complex planning
    /\b(plan|strategy|roadmap|outline|breakdown)\b/i,
    /\b(optimize|improve|enhance|upgrade)\b/i,
];

// Patterns for tool requests
const TOOL_PATTERNS = [
    /\b(file|folder|directory|read|write|delete|create|move|copy)\b/i,
    /\b(run|execute|command|terminal|shell|bash|powershell)\b/i,
    /\b(browse|browser|website|web page|url|open)\b/i,
    /\b(search|google|look up online)\b/i,
    /\b(git|github|commit|push|pull|branch)\b/i,
    /\b(database|sql|query|table)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// Complexity Classifier
// ═══════════════════════════════════════════════════════════════════════════════

export class ComplexityClassifier {
    private simpleThreshold: number;
    private complexThreshold: number;

    constructor(options?: { simpleThreshold?: number; complexThreshold?: number }) {
        this.simpleThreshold = options?.simpleThreshold ?? 30;
        this.complexThreshold = options?.complexThreshold ?? 60;
    }

    /**
     * Classify a message's complexity
     */
    classify(message: string): ComplexityResult {
        const features = this.extractFeatures(message);
        const score = this.calculateScore(features);
        const level = this.determineLevel(score);

        const result: ComplexityResult = {
            level,
            score,
            reason: this.generateReason(level, features),
            suggestLocalModel: level === 'simple',
            features,
        };

        logger.debug('Complexity classification', {
            level,
            score,
            messagePreview: message.slice(0, 50),
        });

        return result;
    }

    /**
     * Quick check if a message can use local model
     */
    canUseLocalModel(message: string): boolean {
        return this.classify(message).suggestLocalModel;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Feature Extraction
    // ─────────────────────────────────────────────────────────────────────────────

    private extractFeatures(message: string): ComplexityFeatures {
        const words = message.split(/\s+/).filter(w => w.length > 0);

        return {
            wordCount: words.length,
            hasCodeRequest: this.matchesAny(message, [
                /\b(code|program|script|function|implement|debug)\b/i,
                /```/,
            ]),
            hasMultiStep: this.matchesAny(message, [
                /\b(and then|after that|step \d+|first|second|finally)\b/i,
                /\d+\.\s+/,  // Numbered lists
            ]),
            hasCreativeRequest: this.matchesAny(message, [
                /\b(write|compose|create|draft|design)\b/i,
            ]),
            hasResearchRequest: this.matchesAny(message, [
                /\b(research|investigate|analyze|explain|describe)\b/i,
            ]),
            hasMemoryRequest: this.matchesAny(message, [
                /\b(remember|recall|what did (I|we)|last time)\b/i,
            ]),
            hasToolRequest: this.matchesAny(message, TOOL_PATTERNS),
            isQuestion: /\?$/.test(message.trim()) || /^(what|how|why|when|where|who|which|is|are|can|do)/i.test(message),
            isCommand: /^(do|make|create|run|execute|set|add|remove|delete)/i.test(message),
            estimatedTokens: Math.ceil(message.length / 4), // Rough estimate
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Score Calculation
    // ─────────────────────────────────────────────────────────────────────────────

    private calculateScore(features: ComplexityFeatures): number {
        let score = 0;

        // Word count impact (0-25 points)
        if (features.wordCount < 5) score += 0;
        else if (features.wordCount < 15) score += 10;
        else if (features.wordCount < 30) score += 20;
        else score += 25;

        // Feature-based scoring
        if (features.hasCodeRequest) score += 30;
        if (features.hasMultiStep) score += 20;
        if (features.hasCreativeRequest) score += 25;
        if (features.hasResearchRequest) score += 20;
        if (features.hasToolRequest) score += 15;
        if (features.hasMemoryRequest) score += 5;

        // Simple question bonus (reduces complexity)
        if (features.isQuestion && features.wordCount < 10 && !features.hasCodeRequest) {
            score -= 15;
        }

        // Cap at 100
        return Math.max(0, Math.min(100, score));
    }

    private determineLevel(score: number): ComplexityLevel {
        if (score < this.simpleThreshold) return 'simple';
        if (score < this.complexThreshold) return 'moderate';
        return 'complex';
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private matchesAny(text: string, patterns: RegExp[]): boolean {
        return patterns.some(p => p.test(text));
    }

    private generateReason(level: ComplexityLevel, features: ComplexityFeatures): string {
        const reasons: string[] = [];

        if (features.hasCodeRequest) reasons.push('code request');
        if (features.hasMultiStep) reasons.push('multi-step task');
        if (features.hasCreativeRequest) reasons.push('creative task');
        if (features.hasResearchRequest) reasons.push('research needed');
        if (features.hasToolRequest) reasons.push('tool usage');

        if (reasons.length === 0) {
            if (features.wordCount < 10) reasons.push('short query');
            else reasons.push('general request');
        }

        return `${level} (${reasons.join(', ')})`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let classifierInstance: ComplexityClassifier | null = null;

export function getComplexityClassifier(): ComplexityClassifier {
    if (!classifierInstance) {
        classifierInstance = new ComplexityClassifier();
    }
    return classifierInstance;
}

export function resetComplexityClassifier(): void {
    classifierInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quick classification function
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyComplexity(message: string): ComplexityResult {
    return getComplexityClassifier().classify(message);
}

export function shouldUseLocalModel(message: string): boolean {
    return getComplexityClassifier().canUseLocalModel(message);
}
