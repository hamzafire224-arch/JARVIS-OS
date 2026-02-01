/**
 * JARVIS Agent Configuration
 * 
 * Centralized configuration management with dual-variant support:
 * - Productivity: Single-agent, low resource, conservative approval
 * - Balanced: Multi-agent routing, high resource, balanced approval
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { resolve } from 'path';

// Load environment variables
config();

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Schema with Zod Validation
// ═══════════════════════════════════════════════════════════════════════════════

const JarvisVariant = z.enum(['productivity', 'balanced']);
const ToolApprovalMode = z.enum(['conservative', 'balanced', 'trust']);
const LogLevel = z.enum(['error', 'warn', 'info', 'debug']);
const LogOutput = z.enum(['console', 'file', 'both']);

const ConfigSchema = z.object({
    // Variant Selection
    variant: JarvisVariant.default('balanced'),

    // LLM Provider Keys
    providers: z.object({
        anthropic: z.object({
            apiKey: z.string().optional(),
            model: z.string().default('claude-3-5-sonnet-20241022'),
        }),
        openai: z.object({
            apiKey: z.string().optional(),
            model: z.string().default('gpt-4o'),
        }),
        gemini: z.object({
            apiKey: z.string().optional(),
            model: z.string().default('gemini-1.5-pro'),
        }),
        ollama: z.object({
            baseUrl: z.string().default('http://localhost:11434'),
            model: z.string().default('llama3:8b'),
        }),
    }),

    // Provider Priority (fallback order)
    providerPriority: z.array(z.enum(['anthropic', 'openai', 'gemini', 'ollama']))
        .default(['anthropic', 'openai', 'ollama']),

    // Agent Configuration
    agent: z.object({
        maxContextTokens: z.number().default(100000),
        maxResponseTokens: z.number().default(4096),
        temperature: z.number().min(0).max(1).default(0.7),
    }),

    // Tool Approval
    toolApproval: z.object({
        mode: ToolApprovalMode.default('balanced'),
    }),

    // Memory & Persistence
    memory: z.object({
        filePath: z.string().default('./memory/memory.md'),
        compactionThreshold: z.number().default(50),
    }),

    // Logging
    logging: z.object({
        level: LogLevel.default('info'),
        output: LogOutput.default('both'),
        filePath: z.string().default('./logs/jarvis.log'),
    }),
});

export type JarvisConfig = z.infer<typeof ConfigSchema>;
export type JarvisVariant = z.infer<typeof JarvisVariant>;
export type ToolApprovalMode = z.infer<typeof ToolApprovalMode>;
export type ProviderName = 'anthropic' | 'openai' | 'gemini' | 'ollama';

// ═══════════════════════════════════════════════════════════════════════════════
// Environment Variable Parsing
// ═══════════════════════════════════════════════════════════════════════════════

function parseProviderPriority(envValue: string | undefined): ProviderName[] {
    if (!envValue) return ['anthropic', 'openai', 'ollama'];
    return envValue.split(',').map(p => p.trim() as ProviderName);
}

function loadConfigFromEnv(): JarvisConfig {
    const rawConfig = {
        variant: process.env['JARVIS_VARIANT'] || 'balanced',

        providers: {
            anthropic: {
                apiKey: process.env['ANTHROPIC_API_KEY'],
                model: process.env['ANTHROPIC_MODEL'] || 'claude-3-5-sonnet-20241022',
            },
            openai: {
                apiKey: process.env['OPENAI_API_KEY'],
                model: process.env['OPENAI_MODEL'] || 'gpt-4o',
            },
            gemini: {
                apiKey: process.env['GOOGLE_AI_API_KEY'],
                model: process.env['GEMINI_MODEL'] || 'gemini-1.5-pro',
            },
            ollama: {
                baseUrl: process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434',
                model: process.env['OLLAMA_MODEL'] || 'llama3:8b',
            },
        },

        providerPriority: parseProviderPriority(process.env['LLM_PROVIDER_PRIORITY']),

        agent: {
            maxContextTokens: parseInt(process.env['MAX_CONTEXT_TOKENS'] || '100000', 10),
            maxResponseTokens: parseInt(process.env['MAX_RESPONSE_TOKENS'] || '4096', 10),
            temperature: parseFloat(process.env['LLM_TEMPERATURE'] || '0.7'),
        },

        toolApproval: {
            mode: process.env['TOOL_APPROVAL_MODE'] || 'balanced',
        },

        memory: {
            filePath: process.env['MEMORY_FILE_PATH'] || './memory/memory.md',
            compactionThreshold: parseInt(process.env['SESSION_COMPACTION_THRESHOLD'] || '50', 10),
        },

        logging: {
            level: process.env['LOG_LEVEL'] || 'info',
            output: process.env['LOG_OUTPUT'] || 'both',
            filePath: process.env['LOG_FILE_PATH'] || './logs/jarvis.log',
        },
    };

    return ConfigSchema.parse(rawConfig);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Variant-Specific Configuration Overrides
// ═══════════════════════════════════════════════════════════════════════════════

function applyVariantDefaults(config: JarvisConfig): JarvisConfig {
    if (config.variant === 'productivity') {
        // Productivity variant: Conservative, single-agent optimized
        return {
            ...config,
            toolApproval: {
                mode: config.toolApproval.mode === 'balanced' ? 'conservative' : config.toolApproval.mode,
            },
            providers: {
                ...config.providers,
                ollama: {
                    ...config.providers.ollama,
                    model: config.providers.ollama.model === 'llama3:70b'
                        ? 'llama3:8b' // Downgrade for productivity
                        : config.providers.ollama.model,
                },
            },
        };
    }

    // Balanced variant: Multi-agent, high-resource
    return config;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exported Configuration Instance
// ═══════════════════════════════════════════════════════════════════════════════

let _config: JarvisConfig | null = null;

export function getConfig(): JarvisConfig {
    if (!_config) {
        _config = applyVariantDefaults(loadConfigFromEnv());
    }
    return _config;
}

export function reloadConfig(): JarvisConfig {
    _config = null;
    return getConfig();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

export function isProductivityVariant(): boolean {
    return getConfig().variant === 'productivity';
}

export function isBalancedVariant(): boolean {
    return getConfig().variant === 'balanced';
}

export function getAvailableProviders(): ProviderName[] {
    const config = getConfig();
    const available: ProviderName[] = [];

    if (config.providers.anthropic.apiKey) available.push('anthropic');
    if (config.providers.openai.apiKey) available.push('openai');
    if (config.providers.gemini.apiKey) available.push('gemini');
    // Ollama is always "available" (checked at runtime)
    available.push('ollama');

    return available;
}

export function getFirstAvailableProvider(): ProviderName | null {
    const config = getConfig();
    const available = getAvailableProviders();

    for (const provider of config.providerPriority) {
        if (available.includes(provider)) {
            return provider;
        }
    }

    return null;
}

export function resolveMemoryPath(): string {
    return resolve(process.cwd(), getConfig().memory.filePath);
}

export function resolveLogPath(): string {
    return resolve(process.cwd(), getConfig().logging.filePath);
}
