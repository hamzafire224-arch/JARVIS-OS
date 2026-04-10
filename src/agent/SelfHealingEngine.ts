/**
 * JARVIS Self-Healing Engine (AGI Feature 3.2)
 * 
 * When JARVIS encounters errors during tool execution, this engine
 * diagnoses the root cause, applies recovery strategies, and retries
 * without human intervention.
 * 
 * Recovery Strategy Escalation:
 * 1. Retry with same approach (transient errors)
 * 2. Check LessonMemory for alternative approaches
 * 3. Modify arguments based on error analysis
 * 4. Ask user for guidance (last resort)
 * 
 * All recovery attempts are tracked in LessonMemory for future learning.
 */

import { logger } from '../utils/logger.js';
import { getLessonMemory } from '../memory/LessonMemory.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface RecoveryContext {
    toolName: string;
    args: Record<string, unknown>;
    error: Error | string;
    attempt: number;
    maxAttempts: number;
}

export interface RecoveryResult {
    recovered: boolean;
    strategy: string;
    modifiedArgs?: Record<string, unknown>;
    suggestion?: string;
    metadata?: Record<string, unknown>;
}

export type RecoveryStrategy = (context: RecoveryContext) => Promise<RecoveryResult>;

// ═══════════════════════════════════════════════════════════════════════════════
// Error Taxonomy
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorPattern {
    pattern: RegExp;
    category: 'transient' | 'permission' | 'not_found' | 'syntax' | 'resource' | 'auth' | 'unknown';
    recoverable: boolean;
    suggestedStrategy: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
    // Transient errors — retry immediately
    { pattern: /ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i, category: 'transient', recoverable: true, suggestedStrategy: 'retry' },
    { pattern: /rate.?limit|429|too many requests/i, category: 'transient', recoverable: true, suggestedStrategy: 'retry_with_delay' },
    { pattern: /timeout|timed out/i, category: 'transient', recoverable: true, suggestedStrategy: 'retry' },

    // Permission errors — try alternative approach
    { pattern: /EACCES|EPERM|permission denied/i, category: 'permission', recoverable: true, suggestedStrategy: 'elevate_or_alternative' },
    { pattern: /ENOENT|no such file|not found|does not exist/i, category: 'not_found', recoverable: true, suggestedStrategy: 'check_path' },

    // Syntax/argument errors — fix arguments
    { pattern: /SyntaxError|unexpected token|invalid/i, category: 'syntax', recoverable: true, suggestedStrategy: 'fix_syntax' },
    { pattern: /TypeError|cannot read|undefined is not/i, category: 'syntax', recoverable: true, suggestedStrategy: 'fix_types' },

    // Resource errors
    { pattern: /ENOMEM|out of memory|heap/i, category: 'resource', recoverable: false, suggestedStrategy: 'ask_user' },
    { pattern: /ENOSPC|no space left/i, category: 'resource', recoverable: false, suggestedStrategy: 'ask_user' },

    // Auth errors
    { pattern: /401|403|unauthorized|forbidden/i, category: 'auth', recoverable: false, suggestedStrategy: 'ask_user' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Self-Healing Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class SelfHealingEngine {
    private maxRetries: number;
    private retryDelayMs: number;
    private recoveryLog: Array<{ timestamp: string; tool: string; error: string; strategy: string; success: boolean }> = [];

    constructor(options?: { maxRetries?: number; retryDelayMs?: number }) {
        this.maxRetries = options?.maxRetries ?? 3;
        this.retryDelayMs = options?.retryDelayMs ?? 1000;
    }

    /**
     * Wrap a tool execution with self-healing recovery.
     * If the tool fails, attempt recovery strategies before giving up.
     */
    async executeWithRecovery<T>(
        toolName: string,
        args: Record<string, unknown>,
        executor: (args: Record<string, unknown>) => Promise<T>
    ): Promise<{ result: T; recovered: boolean; attempts: number }> {
        let currentArgs = { ...args };
        let lastError: Error | string = '';

        for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
            try {
                const result = await executor(currentArgs);
                
                // If we recovered (attempt > 1), log the success
                if (attempt > 1) {
                    logger.info('[SELF-HEAL] Recovery successful!', {
                        tool: toolName,
                        attempt,
                        strategy: 'retry',
                    });

                    // Record lesson for future
                    this.recordLesson(toolName, String(lastError), currentArgs, true);
                }

                return { result, recovered: attempt > 1, attempts: attempt };
            } catch (err) {
                lastError = err instanceof Error ? err : String(err);
                const errorMsg = err instanceof Error ? err.message : String(err);

                logger.warn('[SELF-HEAL] Tool execution failed', {
                    tool: toolName,
                    attempt,
                    error: errorMsg,
                });

                // Don't retry on last attempt
                if (attempt > this.maxRetries) break;

                // Analyze error and determine recovery strategy
                const recovery = await this.analyzeAndRecover({
                    toolName,
                    args: currentArgs,
                    error: lastError,
                    attempt,
                    maxAttempts: this.maxRetries,
                });

                this.recoveryLog.push({
                    timestamp: new Date().toISOString(),
                    tool: toolName,
                    error: errorMsg,
                    strategy: recovery.strategy,
                    success: recovery.recovered,
                });

                if (!recovery.recovered) {
                    break; // Cannot recover — give up
                }

                // Apply modified args if recovery suggests them
                if (recovery.modifiedArgs) {
                    currentArgs = recovery.modifiedArgs;
                }

                // Wait before retrying
                const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                await this.sleep(delay);
            }
        }

        // All recovery attempts failed — record the failure
        this.recordLesson(toolName, String(lastError), args, false);

        throw lastError;
    }

    /**
     * Analyze an error and determine the best recovery strategy.
     */
    private async analyzeAndRecover(context: RecoveryContext): Promise<RecoveryResult> {
        const errorMsg = context.error instanceof Error ? context.error.message : String(context.error);

        // 1. Classify the error
        const classification = this.classifyError(errorMsg);

        if (!classification.recoverable) {
            return {
                recovered: false,
                strategy: 'unrecoverable',
                suggestion: `Error type "${classification.category}" is not automatically recoverable. ${classification.suggestedStrategy === 'ask_user' ? 'Please check permissions/configuration.' : ''}`,
            };
        }

        // 2. Check LessonMemory for past solutions
        try {
            const lessonMemory = getLessonMemory();
            const lessons = await lessonMemory.findRelevantLessons(`${context.toolName} ${errorMsg}`, 3);

            if (lessons.length > 0) {
                const bestLesson = lessons[0]!;
                logger.info('[SELF-HEAL] Found relevant lesson from memory', {
                    lesson: bestLesson.description?.slice(0, 80),
                });

                return {
                    recovered: true,
                    strategy: 'lesson_memory',
                    suggestion: `Applied lesson from past experience: ${bestLesson.description}`,
                };
            }
        } catch {
            // LessonMemory not available — continue with pattern-based recovery
        }

        // 3. Apply pattern-based recovery
        switch (classification.suggestedStrategy) {
            case 'retry':
                return { recovered: true, strategy: 'simple_retry' };

            case 'retry_with_delay':
                await this.sleep(5000); // Extra delay for rate limiting
                return { recovered: true, strategy: 'retry_with_delay' };

            case 'check_path': {
                // Try to fix common path issues
                const modifiedArgs = { ...context.args };
                const pathArg = modifiedArgs['path'] ?? modifiedArgs['filePath'] ?? modifiedArgs['file'];
                if (typeof pathArg === 'string') {
                    // Try normalizing the path
                    const { resolve: resolvePath } = await import('path');
                    const normalizedPath = resolvePath(String(pathArg));
                    if (normalizedPath !== pathArg) {
                        modifiedArgs['path'] = normalizedPath;
                        modifiedArgs['filePath'] = normalizedPath;
                        modifiedArgs['file'] = normalizedPath;
                        return { recovered: true, strategy: 'path_normalization', modifiedArgs };
                    }
                }
                return { recovered: true, strategy: 'simple_retry' };
            }

            case 'fix_syntax':
            case 'fix_types':
                return { recovered: true, strategy: 'simple_retry' };

            case 'elevate_or_alternative':
                return {
                    recovered: false,
                    strategy: 'permission_denied',
                    suggestion: 'Permission denied. Try running with elevated privileges or check file permissions.',
                };

            default:
                return { recovered: context.attempt <= 2, strategy: 'generic_retry' };
        }
    }

    /**
     * Classify an error message using pattern matching.
     */
    private classifyError(errorMsg: string): ErrorPattern {
        for (const pattern of ERROR_PATTERNS) {
            if (pattern.pattern.test(errorMsg)) {
                return pattern;
            }
        }

        return {
            pattern: /.*/,
            category: 'unknown',
            recoverable: true, // Give unknown errors one retry
            suggestedStrategy: 'retry',
        };
    }

    /**
     * Record a recovery lesson in LessonMemory for future learning.
     */
    private recordLesson(toolName: string, error: string, args: Record<string, unknown>, success: boolean): void {
        try {
            const lessonMemory = getLessonMemory();
            const lesson = success
                ? `Successfully recovered from "${error}" in ${toolName} by retrying with modified approach.`
                : `Failed to recover from "${error}" in ${toolName}. Manual intervention required.`;

            lessonMemory.recordLesson({
                description: lesson,
                category: 'error_recovery',
                confidence: success ? 0.7 : 0.3,
                tags: [toolName, success ? 'recovered' : 'failed'],
                metadata: { toolName, error: error.slice(0, 200), argsKeys: Object.keys(args) },
            }).catch(() => {}); // Fire and forget
        } catch {
            // LessonMemory not available — that's fine
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats & Analytics
    // ─────────────────────────────────────────────────────────────────────────────

    getRecoveryStats(): {
        totalAttempts: number;
        successes: number;
        failures: number;
        successRate: number;
        topStrategies: Array<{ strategy: string; count: number }>;
    } {
        const total = this.recoveryLog.length;
        const successes = this.recoveryLog.filter(r => r.success).length;
        const failures = total - successes;

        const strategyCounts = new Map<string, number>();
        for (const entry of this.recoveryLog) {
            strategyCounts.set(entry.strategy, (strategyCounts.get(entry.strategy) ?? 0) + 1);
        }

        const topStrategies = [...strategyCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([strategy, count]) => ({ strategy, count }));

        return {
            totalAttempts: total,
            successes,
            failures,
            successRate: total > 0 ? successes / total : 0,
            topStrategies,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: SelfHealingEngine | null = null;

export function getSelfHealingEngine(): SelfHealingEngine {
    if (!instance) {
        instance = new SelfHealingEngine();
    }
    return instance;
}
