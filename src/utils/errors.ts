/**
 * JARVIS Custom Error Classes
 * 
 * Structured error handling for agent operations with rich context.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Base Error Class
// ═══════════════════════════════════════════════════════════════════════════════

export class JarvisError extends Error {
    public readonly code: string;
    public readonly context: Record<string, unknown>;
    public readonly timestamp: Date;

    constructor(message: string, code: string, context?: Record<string, unknown>) {
        super(message);
        this.name = 'JarvisError';
        this.code = code;
        this.context = context ?? {};
        this.timestamp = new Date();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class ProviderError extends JarvisError {
    public readonly providerName: string;
    public readonly statusCode: number;

    constructor(
        providerName: string,
        message: string,
        statusCode?: number,
        context?: Record<string, unknown>
    ) {
        super(message, 'PROVIDER_ERROR', { ...context, providerName, statusCode });
        this.name = 'ProviderError';
        this.providerName = providerName;
        this.statusCode = statusCode ?? 500;
    }
}

export class ProviderUnavailableError extends ProviderError {
    constructor(providerName: string, reason?: string) {
        super(
            providerName,
            `Provider ${providerName} is unavailable${reason ? `: ${reason}` : ''}`,
            503
        );
        this.name = 'ProviderUnavailableError';
        // Note: code is readonly from parent, set via super()
    }
}

export class ProviderRateLimitError extends ProviderError {
    public readonly retryAfter: number;

    constructor(providerName: string, retryAfter?: number) {
        super(
            providerName,
            `Rate limited by ${providerName}${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
            429,
            { retryAfter }
        );
        this.name = 'ProviderRateLimitError';
        this.retryAfter = retryAfter ?? 60;
    }
}

export class ProviderAuthError extends ProviderError {
    constructor(providerName: string) {
        super(
            providerName,
            `Authentication failed for ${providerName} - check API key`,
            401
        );
        this.name = 'ProviderAuthError';
    }
}

export class NoProvidersAvailableError extends JarvisError {
    constructor(attemptedProviders: string[]) {
        super(
            `No LLM providers available. Attempted: ${attemptedProviders.join(', ')}`,
            'NO_PROVIDERS_AVAILABLE',
            { attemptedProviders }
        );
        this.name = 'NoProvidersAvailableError';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class AgentError extends JarvisError {
    public readonly agentName: string;

    constructor(
        agentName: string,
        message: string,
        code: string = 'AGENT_ERROR',
        context?: Record<string, unknown>
    ) {
        super(message, code, { ...context, agentName });
        this.name = 'AgentError';
        this.agentName = agentName;
    }
}

export class AgentNotFoundError extends AgentError {
    constructor(agentName: string) {
        super(agentName, `Agent "${agentName}" not found in registry`, 'AGENT_NOT_FOUND');
        this.name = 'AgentNotFoundError';
    }
}

export class ContextOverflowError extends AgentError {
    public readonly tokenCount: number;
    public readonly maxTokens: number;

    constructor(agentName: string, tokenCount: number, maxTokens: number) {
        super(
            agentName,
            `Context overflow: ${tokenCount} tokens exceeds limit of ${maxTokens}`,
            'CONTEXT_OVERFLOW',
            { tokenCount, maxTokens }
        );
        this.name = 'ContextOverflowError';
        this.tokenCount = tokenCount;
        this.maxTokens = maxTokens;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class ToolError extends JarvisError {
    public readonly toolName: string;

    constructor(
        toolName: string,
        message: string,
        code: string = 'TOOL_ERROR',
        context?: Record<string, unknown>
    ) {
        super(message, code, { ...context, toolName });
        this.name = 'ToolError';
        this.toolName = toolName;
    }
}

export class ToolNotFoundError extends ToolError {
    constructor(toolName: string) {
        super(toolName, `Tool "${toolName}" not found in registry`, 'TOOL_NOT_FOUND');
        this.name = 'ToolNotFoundError';
    }
}

export class ToolExecutionError extends ToolError {
    public readonly originalError: Error | null;

    constructor(toolName: string, message: string, originalError?: Error) {
        super(toolName, message, 'TOOL_EXECUTION_FAILED', {
            originalMessage: originalError?.message,
        });
        this.name = 'ToolExecutionError';
        this.originalError = originalError ?? null;
    }
}

export class ToolApprovalRequiredError extends ToolError {
    public readonly operation: string;

    constructor(toolName: string, operation: string) {
        super(
            toolName,
            `User approval required for ${toolName}: ${operation}`,
            'TOOL_APPROVAL_REQUIRED',
            { operation }
        );
        this.name = 'ToolApprovalRequiredError';
        this.operation = operation;
    }
}

export class ToolApprovalDeniedError extends ToolError {
    public readonly operation: string;

    constructor(toolName: string, operation: string) {
        super(
            toolName,
            `User denied approval for ${toolName}: ${operation}`,
            'TOOL_APPROVAL_DENIED',
            { operation }
        );
        this.name = 'ToolApprovalDeniedError';
        this.operation = operation;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memory Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class MemoryError extends JarvisError {
    constructor(message: string, code: string = 'MEMORY_ERROR', context?: Record<string, unknown>) {
        super(message, code, context);
        this.name = 'MemoryError';
    }
}

export class MemoryCorruptedError extends MemoryError {
    constructor(filePath: string, reason: string) {
        super(`Memory file corrupted at ${filePath}: ${reason}`, 'MEMORY_CORRUPTED', { filePath });
        this.name = 'MemoryCorruptedError';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class ConfigError extends JarvisError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CONFIG_ERROR', context);
        this.name = 'ConfigError';
    }
}
