/**
 * JARVIS Agent Type Definitions
 * 
 * Core types and interfaces for the agent system.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Message Types
// ═══════════════════════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
    role: MessageRole;
    content: string;
    name?: string;
    timestamp?: Date;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    toolCallId: string;
    result: unknown;
    error?: string;
}

export interface AssistantMessage extends Message {
    role: 'assistant';
    toolCalls?: ToolCall[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface ToolParameter {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    enum?: string[];
    items?: ToolParameter;
    properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, ToolParameter>;
        required?: string[];
    };
    dangerous?: boolean; // Requires approval
    category?: 'filesystem' | 'terminal' | 'web' | 'memory' | 'system' | 'github' | 'database';
    requiresApproval?: boolean;  // Alias for dangerous
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Response Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentResponse {
    content: string;
    toolCalls?: ToolCall[];
    finishReason: 'stop' | 'tool_use' | 'max_tokens' | 'error';
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

export interface StreamChunk {
    type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done';
    content?: string;
    toolCall?: Partial<ToolCall>;
    finishReason?: AgentResponse['finishReason'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AgentType = 'main' | 'researcher' | 'coder' | 'personal' | 'custom';

export interface AgentContext {
    messages: Message[];
    systemPrompt: string;
    tools: ToolDefinition[];
    memory?: string;
    workspaceDir?: string;
}

export interface AgentMetadata {
    name: string;
    type: AgentType;
    description: string;
    capabilities: string[];
    allowedTools: string[];
    workspaceDir?: string;
}

export interface AgentExecutionResult {
    response: AgentResponse;
    toolResults?: ToolResult[];
    finalContent: string;
    conversationHistory: Message[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memory Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemoryEntry {
    id: string;
    type: 'preference' | 'fact' | 'project' | 'context' | 'feedback';
    content: string;
    source: string;
    createdAt: Date;
    updatedAt: Date;
    importance: number; // 1-10
    tags: string[];
}

export interface SessionSummary {
    id: string;
    summary: string;
    keyPoints: string[];
    createdAt: Date;
    messageCount: number;
    tokensSaved: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Approval Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApprovalRequest {
    id: string;
    toolName: string;
    operation: string;
    description: string;
    arguments: Record<string, unknown>;
    risk: 'low' | 'medium' | 'high';
    createdAt: Date;
}

export interface ApprovalResponse {
    requestId: string;
    approved: boolean;
    reason?: string;
    respondedAt: Date;
}

export type ApprovalCallback = (request: ApprovalRequest) => Promise<ApprovalResponse>;

// ═══════════════════════════════════════════════════════════════════════════════
// Conversation State
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConversationState {
    id: string;
    messages: Message[];
    activeAgent: string;
    startedAt: Date;
    lastActivityAt: Date;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Schemas for Runtime Validation
// ═══════════════════════════════════════════════════════════════════════════════

export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    name: z.string().optional(),
    timestamp: z.date().optional(),
});

export const ToolCallSchema = z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
});

export const ToolResultSchema = z.object({
    toolCallId: z.string(),
    result: z.unknown(),
    error: z.string().optional(),
});
