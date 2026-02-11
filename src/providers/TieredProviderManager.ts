/**
 * JARVIS Tiered Provider Manager
 * 
 * Implements intelligent model routing to reduce API costs by 80-90%.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     USER MESSAGE                                │
 * └──────────────────────┬──────────────────────────────────────────┘
 *                        │
 *                        ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │         COMPLEXITY CLASSIFIER                                   │
 * │  "Is this simple or complex?"                                   │
 * └──────────────────────┬──────────────────────────────────────────┘
 *                        │
 *         ┌──────────────┴──────────────┐
 *         │ Simple                      │ Complex
 *         ▼                             ▼
 * ┌───────────────────┐   ┌────────────────────────────────────────┐
 * │ LOCAL MODEL       │   │ CLOUD MODEL (Gemini/Claude/GPT)        │
 * │ (Ollama/Qwen)     │   │ Full reasoning power                   │
 * │ Cost: $0          │   │ Cost: ~$0.10/1K tokens                 │
 * └───────────────────┘   └────────────────────────────────────────┘
 * 
 * Use cases for local model:
 * - "Good morning!" → greeting response
 * - "What time is it?" → simple query
 * - Heartbeat checks → "any new emails?"
 * - Confirmations → "yes", "no", "cancel"
 */

import type { LLMProvider } from './LLMProvider.js';
import type { Message, ToolDefinition } from '../agent/types.js';
import type { AgentResponse } from '../agent/types.js';
import { getProvider, ProviderManager, getProviderManager } from './index.js';
import { classifyComplexity, type ComplexityResult, type ComplexityLevel } from './ComplexityClassifier.js';
import { getConfig, type ProviderName } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TieredProviderOptions {
    /** Provider for simple tasks (default: ollama) */
    localProvider?: ProviderName;
    /** Provider for complex tasks (default: from config priority) */
    cloudProvider?: ProviderName;
    /** Force cloud provider for all requests (disables tiering) */
    alwaysUseCloud?: boolean;
    /** Force local provider for all requests (testing) */
    alwaysUseLocal?: boolean;
    /** Custom complexity thresholds */
    complexityThresholds?: {
        simple?: number;
        complex?: number;
    };
}

export interface TieredResponse extends AgentResponse {
    tier: 'local' | 'cloud';
    complexity: ComplexityResult;
    costSavings: number;  // Estimated cost saved by using local model
}

export interface UsageStats {
    totalRequests: number;
    localRequests: number;
    cloudRequests: number;
    estimatedSavings: number;  // In USD
    byComplexity: Record<ComplexityLevel, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cost Estimation
// ═══════════════════════════════════════════════════════════════════════════════

// Approximate cost per 1K tokens (input + output combined)
const PROVIDER_COSTS: Record<ProviderName, number> = {
    anthropic: 0.015,   // Claude 3.5 Sonnet
    openai: 0.01,       // GPT-4o
    gemini: 0.00025,    // Gemini 1.5 Flash (cheapest cloud)
    ollama: 0,          // Free (local)
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tiered Provider Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class TieredProviderManager {
    private localProvider: LLMProvider | null = null;
    private cloudProvider: LLMProvider | null = null;
    private fallbackManager: ProviderManager;
    private options: TieredProviderOptions;
    private stats: UsageStats;

    constructor(options: TieredProviderOptions = {}) {
        this.options = options;
        this.fallbackManager = getProviderManager();
        this.stats = {
            totalRequests: 0,
            localRequests: 0,
            cloudRequests: 0,
            estimatedSavings: 0,
            byComplexity: {
                simple: 0,
                moderate: 0,
                complex: 0,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        // Initialize local provider (prefer Ollama)
        const localName = this.options.localProvider ?? 'ollama';
        try {
            this.localProvider = getProvider(localName);
            const isAvailable = await this.localProvider.isAvailable();
            if (!isAvailable) {
                logger.warn(`Local provider ${localName} not available, tiering disabled`);
                this.localProvider = null;
            } else {
                logger.info(`Local provider ${localName} initialized for simple tasks`);
            }
        } catch (error) {
            logger.warn(`Failed to initialize local provider: ${error}`);
            this.localProvider = null;
        }

        // Initialize cloud provider (from config or explicit)
        if (this.options.cloudProvider) {
            this.cloudProvider = getProvider(this.options.cloudProvider);
        } else {
            this.cloudProvider = await this.fallbackManager.getProvider();
        }

        logger.info('TieredProviderManager initialized', {
            localProvider: this.localProvider?.name ?? 'none',
            cloudProvider: this.cloudProvider?.name ?? 'none',
            tieringEnabled: this.isTieringEnabled(),
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Main Generation Method
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate a response using the appropriate tier
     */
    async generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[]
    ): Promise<TieredResponse> {
        // Get the last user message for classification
        const lastMessage = messages.filter(m => m.role === 'user').pop();
        const messageText = lastMessage?.content ?? '';

        // Classify complexity
        const complexity = classifyComplexity(messageText);

        // Select provider based on complexity
        const { provider, tier } = this.selectProvider(complexity, tools);

        logger.debug('Tiered routing decision', {
            complexity: complexity.level,
            score: complexity.score,
            tier,
            provider: provider.name,
            hasTools: !!tools?.length,
        });

        // Generate response
        const response = await provider.generateResponse(messages, systemPrompt, tools);

        // Update stats
        this.updateStats(tier, complexity, response.usage.totalTokens);

        // Calculate savings
        const costSavings = tier === 'local'
            ? this.calculateSavings(response.usage.totalTokens)
            : 0;

        return {
            ...response,
            tier,
            complexity,
            costSavings,
        };
    }

    /**
     * Check if a message should use the local model
     */
    shouldUseLocalModel(message: string, hasTools: boolean = false): boolean {
        // Tools always require cloud model for reliability
        if (hasTools) return false;

        // Check options
        if (this.options.alwaysUseCloud) return false;
        if (this.options.alwaysUseLocal) return true;

        // Local provider not available
        if (!this.localProvider) return false;

        // Classify and decide
        const complexity = classifyComplexity(message);
        return complexity.suggestLocalModel;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Provider Selection
    // ─────────────────────────────────────────────────────────────────────────────

    private selectProvider(
        complexity: ComplexityResult,
        tools?: ToolDefinition[]
    ): { provider: LLMProvider; tier: 'local' | 'cloud' } {
        // Guard: ensure initialize() was called
        if (!this.cloudProvider) {
            throw new Error(
                'TieredProviderManager: No cloud provider available. ' +
                'Call initialize() before generating responses.'
            );
        }

        const cloud = this.cloudProvider;

        // Force options
        if (this.options.alwaysUseCloud) {
            return { provider: cloud, tier: 'cloud' };
        }
        if (this.options.alwaysUseLocal && this.localProvider) {
            return { provider: this.localProvider, tier: 'local' };
        }

        // Tools require cloud model for reliable execution
        if (tools && tools.length > 0) {
            return { provider: cloud, tier: 'cloud' };
        }

        // No local provider available
        if (!this.localProvider) {
            return { provider: cloud, tier: 'cloud' };
        }

        // Use local for simple tasks
        if (complexity.suggestLocalModel) {
            return { provider: this.localProvider, tier: 'local' };
        }

        return { provider: cloud, tier: 'cloud' };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats & Cost Tracking
    // ─────────────────────────────────────────────────────────────────────────────

    private updateStats(
        tier: 'local' | 'cloud',
        complexity: ComplexityResult,
        tokens: number
    ): void {
        this.stats.totalRequests++;
        this.stats.byComplexity[complexity.level]++;

        if (tier === 'local') {
            this.stats.localRequests++;
            // Calculate savings (what it would have cost on cloud)
            this.stats.estimatedSavings += this.calculateSavings(tokens);
        } else {
            this.stats.cloudRequests++;
        }
    }

    private calculateSavings(tokens: number): number {
        // Calculate what this would have cost on the cloud provider
        const cloudProviderName = this.options.cloudProvider ??
            getConfig().providerPriority.find(p => p !== 'ollama') ??
            'gemini';

        const cloudCost = PROVIDER_COSTS[cloudProviderName] ?? 0.01;
        return (tokens / 1000) * cloudCost;
    }

    getStats(): UsageStats {
        return { ...this.stats };
    }

    getLocalRatio(): number {
        if (this.stats.totalRequests === 0) return 0;
        return this.stats.localRequests / this.stats.totalRequests;
    }

    resetStats(): void {
        this.stats = {
            totalRequests: 0,
            localRequests: 0,
            cloudRequests: 0,
            estimatedSavings: 0,
            byComplexity: { simple: 0, moderate: 0, complex: 0 },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Status & Configuration
    // ─────────────────────────────────────────────────────────────────────────────

    isTieringEnabled(): boolean {
        return !!this.localProvider && !this.options.alwaysUseCloud;
    }

    getLocalProviderName(): string | null {
        return this.localProvider?.name ?? null;
    }

    getCloudProviderName(): string | null {
        return this.cloudProvider?.name ?? null;
    }

    /**
     * Get a formatted summary of cost savings
     */
    getSavingsSummary(): string {
        const stats = this.stats;
        const ratio = this.getLocalRatio() * 100;

        return [
            `📊 Tiered Inference Stats:`,
            `   Total requests: ${stats.totalRequests}`,
            `   Local model: ${stats.localRequests} (${ratio.toFixed(1)}%)`,
            `   Cloud model: ${stats.cloudRequests}`,
            `   Estimated savings: $${stats.estimatedSavings.toFixed(4)}`,
        ].join('\n');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let tieredManagerInstance: TieredProviderManager | null = null;

export function getTieredProviderManager(
    options?: TieredProviderOptions
): TieredProviderManager {
    if (!tieredManagerInstance) {
        tieredManagerInstance = new TieredProviderManager(options);
    }
    return tieredManagerInstance;
}

export async function initializeTieredProvider(
    options?: TieredProviderOptions
): Promise<TieredProviderManager> {
    tieredManagerInstance = new TieredProviderManager(options);
    await tieredManagerInstance.initialize();
    return tieredManagerInstance;
}

export function resetTieredProviderManager(): void {
    tieredManagerInstance = null;
}
