/**
 * JARVIS Session Persistence (AGI Feature 1.3)
 * 
 * Saves and restores conversation sessions across terminal restarts:
 * - Serializes conversation history to ~/.jarvis/sessions/
 * - Offers resume on startup: "Continue where you left off?"
 * - Cloud sync via Supabase sessions table (for multi-device)
 * - SessionCompactor integration for efficient storage
 * 
 * Session Format:
 * {
 *   id: "session-uuid",
 *   title: "auto-generated from first message",
 *   messages: Message[],
 *   metadata: { tools_used, duration, tokens },
 *   createdAt, lastActivityAt
 * }
 */

import { existsSync } from 'fs';
import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { homedir } from 'os';
import type { Message } from '../agent/types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersistedSession {
    id: string;
    title: string;
    messages: Message[];
    metadata: SessionMetadata;
    createdAt: string;
    lastActivityAt: string;
    version: string;
}

export interface SessionMetadata {
    toolsUsed: string[];
    messageCount: number;
    estimatedTokens: number;
    workingDirectory?: string;
    variant?: string;
}

export interface SessionListEntry {
    id: string;
    title: string;
    messageCount: number;
    lastActivityAt: string;
    preview: string; // First 100 chars of last user message
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Persistence Manager
// ═══════════════════════════════════════════════════════════════════════════════

const SESSIONS_DIR = resolve(join(homedir(), '.jarvis', 'sessions'));
const MAX_SESSION_FILES = 50; // Keep last 50 sessions

export class SessionPersistence {
    private sessionsDir: string;
    private currentSessionId: string | null = null;

    constructor(sessionsDir?: string) {
        this.sessionsDir = sessionsDir ?? SESSIONS_DIR;
    }

    /**
     * Initialize persistence — ensure directory exists
     */
    async initialize(): Promise<void> {
        if (!existsSync(this.sessionsDir)) {
            await mkdir(this.sessionsDir, { recursive: true });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Save / Restore
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Save the current conversation as a session file.
     * Called on /save command or on clean exit.
     */
    async saveSession(
        messages: Message[],
        metadata?: Partial<SessionMetadata>
    ): Promise<string> {
        await this.initialize();

        const id = this.currentSessionId ?? randomUUID();
        this.currentSessionId = id;

        const title = this.generateTitle(messages);
        const toolsUsed = this.extractToolsUsed(messages);
        const estimatedTokens = this.estimateTokens(messages);

        const session: PersistedSession = {
            id,
            title,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                name: m.name,
                timestamp: m.timestamp,
            })),
            metadata: {
                toolsUsed,
                messageCount: messages.length,
                estimatedTokens,
                workingDirectory: metadata?.workingDirectory ?? process.cwd(),
                variant: metadata?.variant,
            },
            createdAt: messages[0]?.timestamp?.toISOString() ?? new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            version: '1.0.0',
        };

        const filePath = join(this.sessionsDir, `${id}.json`);
        await writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');

        logger.info('[SESSION] Saved', { id, messages: messages.length, title });

        // Cleanup old sessions
        await this.cleanupOldSessions();

        return id;
    }

    /**
     * Restore a session by ID — returns messages to replay into agent context.
     */
    async restoreSession(sessionId: string): Promise<PersistedSession | null> {
        const filePath = join(this.sessionsDir, `${sessionId}.json`);

        if (!existsSync(filePath)) {
            logger.warn('[SESSION] Not found', { sessionId });
            return null;
        }

        try {
            const content = await readFile(filePath, 'utf-8');
            const session = JSON.parse(content) as PersistedSession;
            this.currentSessionId = session.id;

            logger.info('[SESSION] Restored', {
                id: session.id,
                title: session.title,
                messages: session.messages.length,
            });

            return session;
        } catch (err) {
            logger.warn('[SESSION] Failed to restore', {
                sessionId,
                error: err instanceof Error ? err.message : String(err),
            });
            return null;
        }
    }

    /**
     * Get the most recent session for "Continue where you left off?" prompt.
     */
    async getLastSession(): Promise<PersistedSession | null> {
        const entries = await this.listSessions();
        if (entries.length === 0) return null;

        // entries is sorted by lastActivityAt desc
        return this.restoreSession(entries[0]!.id);
    }

    /**
     * List all saved sessions, sorted by most recent first.
     */
    async listSessions(): Promise<SessionListEntry[]> {
        await this.initialize();

        try {
            const files = await readdir(this.sessionsDir);
            const sessions: SessionListEntry[] = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                try {
                    const content = await readFile(join(this.sessionsDir, file), 'utf-8');
                    const session = JSON.parse(content) as PersistedSession;

                    // Get last user message for preview
                    const lastUserMsg = [...session.messages]
                        .reverse()
                        .find(m => m.role === 'user');

                    sessions.push({
                        id: session.id,
                        title: session.title,
                        messageCount: session.metadata.messageCount,
                        lastActivityAt: session.lastActivityAt,
                        preview: lastUserMsg ? lastUserMsg.content.slice(0, 100) : '(no messages)',
                    });
                } catch {
                    // Skip corrupted files
                }
            }

            // Sort by most recent
            sessions.sort((a, b) =>
                new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
            );

            return sessions;
        } catch {
            return [];
        }
    }

    /**
     * Delete a session by ID
     */
    async deleteSession(sessionId: string): Promise<boolean> {
        const filePath = join(this.sessionsDir, `${sessionId}.json`);
        try {
            await unlink(filePath);
            logger.info('[SESSION] Deleted', { sessionId });
            return true;
        } catch {
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Cloud Sync
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Sync sessions to Supabase for multi-device access.
     * Uploads the current session summary (not full messages for privacy).
     */
    async syncToCloud(userId: string): Promise<void> {
        try {
            const { getSupabaseClient } = await import('../db/SupabaseClient.js');
            const supabase = getSupabaseClient();
            if (!supabase || !this.currentSessionId) return;

            const filePath = join(this.sessionsDir, `${this.currentSessionId}.json`);
            if (!existsSync(filePath)) return;

            const content = await readFile(filePath, 'utf-8');
            const session = JSON.parse(content) as PersistedSession;

            await supabase.from('jarvis_sessions').upsert({
                id: session.id,
                user_id: userId,
                title: session.title,
                message_count: session.metadata.messageCount,
                tools_used: session.metadata.toolsUsed,
                estimated_tokens: session.metadata.estimatedTokens,
                last_activity: session.lastActivityAt,
                created_at: session.createdAt,
            });

            logger.info('[SESSION] Synced to cloud', { id: session.id });
        } catch (err) {
            logger.warn('[SESSION] Cloud sync failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }

    startNewSession(): string {
        this.currentSessionId = randomUUID();
        return this.currentSessionId;
    }

    private generateTitle(messages: Message[]): string {
        // Use the first user message as the title
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (!firstUserMsg) return 'Untitled Session';

        const title = firstUserMsg.content
            .replace(/\n/g, ' ')
            .trim()
            .slice(0, 80);

        return title.length < firstUserMsg.content.length ? `${title}...` : title;
    }

    private extractToolsUsed(messages: Message[]): string[] {
        // Extract tool names from assistant messages that mention tools
        const tools = new Set<string>();
        for (const msg of messages) {
            if (msg.role === 'assistant') {
                // Look for tool execution patterns in content
                const toolMatches = msg.content.match(/`(\w+_\w+)`/g);
                if (toolMatches) {
                    for (const match of toolMatches) {
                        tools.add(match.replace(/`/g, ''));
                    }
                }
            }
        }
        return [...tools];
    }

    private estimateTokens(messages: Message[]): number {
        let total = 0;
        for (const msg of messages) {
            total += Math.ceil(msg.content.length / 4) + 4;
        }
        return total;
    }

    private async cleanupOldSessions(): Promise<void> {
        const entries = await this.listSessions();
        if (entries.length <= MAX_SESSION_FILES) return;

        // Delete oldest sessions beyond the limit
        const toDelete = entries.slice(MAX_SESSION_FILES);
        for (const entry of toDelete) {
            await this.deleteSession(entry.id);
        }

        if (toDelete.length > 0) {
            logger.info('[SESSION] Cleaned up old sessions', { deleted: toDelete.length });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: SessionPersistence | null = null;

export function getSessionPersistence(): SessionPersistence {
    if (!instance) {
        instance = new SessionPersistence();
    }
    return instance;
}
