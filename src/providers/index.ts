/**
 * JARVIS Provider Factory
 * 
 * Creates and manages LLM providers with automatic fallback support.
 * Implements provider priority ordering and availability checking.
 */

import type { LLMProvider } from './LLMProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { getConfig, type ProviderName } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { NoProvidersAvailableError } from '../utils/errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Registry
// ═══════════════════════════════════════════════════════════════════════════════

const providerConstructors: Record<ProviderName, () => LLMProvider> = {
    anthropic: () => new AnthropicProvider(),
    openai: () => new OpenAIProvider(),
    gemini: () => new GeminiProvider(),
    ollama: () => new OllamaProvider(),
};

// Cached provider instances
const providerInstances: Map<ProviderName, LLMProvider> = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a specific provider by name (creates if not cached)
 */
export function getProvider(name: ProviderName): LLMProvider {
    let provider = providerInstances.get(name);

    if (!provider) {
        const constructor = providerConstructors[name];
        if (!constructor) {
            throw new Error(`Unknown provider: ${name}`);
        }
        provider = constructor();
        providerInstances.set(name, provider);
    }

    return provider;
}

/**
 * Get all configured providers in priority order
 */
export function getProvidersByPriority(): LLMProvider[] {
    const config = getConfig();
    return config.providerPriority.map(name => getProvider(name));
}

/**
 * Get the first available provider (checking availability in priority order)
 */
export async function getFirstAvailableProvider(): Promise<LLMProvider> {
    const config = getConfig();
    const attemptedProviders: string[] = [];

    for (const name of config.providerPriority) {
        attemptedProviders.push(name);
        const provider = getProvider(name);

        logger.provider(name, 'Checking availability...');
        const isAvailable = await provider.isAvailable();

        if (isAvailable) {
            logger.provider(name, 'Selected as primary provider');
            return provider;
        }
    }

    throw new NoProvidersAvailableError(attemptedProviders);
}

/**
 * Provider manager with fallback support
 */
export class ProviderManager {
    private currentProvider: LLMProvider | null = null;
    private fallbackIndex: number = 0;

    /**
     * Initialize and get the primary available provider
     */
    async initialize(): Promise<LLMProvider> {
        this.currentProvider = await getFirstAvailableProvider();
        this.fallbackIndex = 0;
        return this.currentProvider;
    }

    /**
     * Get current provider (or initialize if not done)
     */
    async getProvider(): Promise<LLMProvider> {
        if (!this.currentProvider) {
            return this.initialize();
        }
        return this.currentProvider;
    }

    /**
     * Attempt to switch to the next available fallback provider
     */
    async fallbackToNext(): Promise<LLMProvider | null> {
        const config = getConfig();
        const priority = config.providerPriority;

        for (let i = this.fallbackIndex + 1; i < priority.length; i++) {
            const name = priority[i];
            if (!name) continue;

            const provider = getProvider(name);
            logger.provider(name, 'Checking as fallback...');

            if (await provider.isAvailable()) {
                logger.provider(name, 'Switching to fallback provider');
                this.currentProvider = provider;
                this.fallbackIndex = i;
                return provider;
            }
        }

        logger.warn('No more fallback providers available');
        return null;
    }

    /**
     * Reset to primary provider
     */
    async reset(): Promise<LLMProvider> {
        this.fallbackIndex = 0;
        return this.initialize();
    }

    /**
     * Get the name of the current provider
     */
    getCurrentProviderName(): string | null {
        return this.currentProvider?.name ?? null;
    }

    /**
     * Check if we're using a fallback provider
     */
    isUsingFallback(): boolean {
        return this.fallbackIndex > 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let providerManager: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
    if (!providerManager) {
        providerManager = new ProviderManager();
    }
    return providerManager;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════════════════════

export { LLMProvider, BaseLLMProvider, type LLMProviderOptions } from './LLMProvider.js';
export { AnthropicProvider } from './AnthropicProvider.js';
export { OpenAIProvider } from './OpenAIProvider.js';
export { GeminiProvider } from './GeminiProvider.js';
export { OllamaProvider } from './OllamaProvider.js';
