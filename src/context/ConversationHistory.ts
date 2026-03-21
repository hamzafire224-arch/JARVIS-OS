/**
 * JARVIS Conversation History Manager
 *
 * Provides conversation snapshots, rollback, and branching — enabling users
 * to experiment freely and revert to any prior point in the conversation.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────┐
 * │  Branch: main                                       │
 * │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐               │
 * │  │ S0  │──│ S1  │──│ S2  │──│ S3  │  (snapshots)   │
 * │  └─────┘  └─────┘  └──┬──┘  └─────┘               │
 * │                       │                             │
 * │                 ┌─────┴─────┐                       │
 * │                 │ Branch: B │                       │
 * │                 │ ┌─┐ ┌─┐  │                       │
 * │                 │ │S0│─│S1│ │                       │
 * │                 │ └─┘ └─┘  │                       │
 * │                 └──────────┘                       │
 * └─────────────────────────────────────────────────────┘
 */

import type { Message } from '../agent/types.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConversationSnapshot {
    /** Unique snapshot ID */
    id: string;
    /** Timestamp of the snapshot */
    timestamp: Date;
    /** Messages at the time of snapshot */
    messages: Message[];
    /** Optional label for this snapshot */
    label?: string;
}

export interface ConversationBranch {
    /** Branch name (unique) */
    name: string;
    /** Ordered list of snapshots */
    snapshots: ConversationSnapshot[];
    /** ID of the snapshot this branch was forked from (null for main) */
    parentSnapshotId: string | null;
    /** Parent branch name (null for main) */
    parentBranch: string | null;
    /** When the branch was created */
    createdAt: Date;
}

export interface ConversationHistoryOptions {
    /** Maximum snapshots per branch (default: 100) */
    maxSnapshots?: number;
    /** Auto-snapshot on every N messages (0 = manual only, default: 2) */
    autoSnapshotInterval?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversation History Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class ConversationHistory {
    private branches: Map<string, ConversationBranch> = new Map();
    private activeBranch: string = 'main';
    private messagesSinceSnapshot: number = 0;
    private maxSnapshots: number;
    private autoSnapshotInterval: number;

    constructor(options: ConversationHistoryOptions = {}) {
        this.maxSnapshots = options.maxSnapshots ?? 100;
        this.autoSnapshotInterval = options.autoSnapshotInterval ?? 2;

        // Create main branch
        this.branches.set('main', {
            name: 'main',
            snapshots: [],
            parentSnapshotId: null,
            parentBranch: null,
            createdAt: new Date(),
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Snapshots
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Create a snapshot of the current conversation state
     */
    snapshot(messages: Message[], label?: string): ConversationSnapshot {
        const branch = this.getBranch();

        const snap: ConversationSnapshot = {
            id: randomUUID(),
            timestamp: new Date(),
            messages: messages.map(m => ({ ...m })), // Deep copy
            label,
        };

        branch.snapshots.push(snap);

        // Trim old snapshots if over limit
        while (branch.snapshots.length > this.maxSnapshots) {
            branch.snapshots.shift();
        }

        this.messagesSinceSnapshot = 0;

        logger.debug('Conversation snapshot created', {
            branch: this.activeBranch,
            snapshotId: snap.id,
            messageCount: messages.length,
            label,
        });

        return snap;
    }

    /**
     * Automatically snapshot if interval reached.
     * Call this after each user/assistant message pair.
     * Returns the snapshot if one was created, null otherwise.
     */
    autoSnapshot(messages: Message[]): ConversationSnapshot | null {
        if (this.autoSnapshotInterval <= 0) return null;

        this.messagesSinceSnapshot++;
        if (this.messagesSinceSnapshot >= this.autoSnapshotInterval) {
            return this.snapshot(messages);
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Rollback
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Rollback to N messages ago.
     * Returns the messages to restore, or null if not enough history.
     */
    rollback(steps: number = 1): Message[] | null {
        const branch = this.getBranch();

        if (branch.snapshots.length === 0) {
            logger.warn('No snapshots available for rollback');
            return null;
        }

        // Target is N snapshots back from the end
        const targetIndex = branch.snapshots.length - 1 - steps;
        if (targetIndex < 0) {
            // Go to the oldest snapshot
            const oldest = branch.snapshots[0]!;
            logger.info('Rolled back to oldest snapshot', {
                branch: this.activeBranch,
                snapshotId: oldest.id,
            });
            return oldest.messages.map(m => ({ ...m }));
        }

        const target = branch.snapshots[targetIndex]!;

        // Remove snapshots after the target
        branch.snapshots = branch.snapshots.slice(0, targetIndex + 1);

        logger.info('Conversation rolled back', {
            branch: this.activeBranch,
            snapshotId: target.id,
            stepsBack: steps,
            remainingSnapshots: branch.snapshots.length,
        });

        return target.messages.map(m => ({ ...m }));
    }

    /**
     * Rollback to a specific snapshot ID.
     */
    rollbackToSnapshot(snapshotId: string): Message[] | null {
        const branch = this.getBranch();
        const index = branch.snapshots.findIndex(s => s.id === snapshotId);

        if (index === -1) {
            logger.warn('Snapshot not found for rollback', { snapshotId });
            return null;
        }

        const target = branch.snapshots[index]!;
        branch.snapshots = branch.snapshots.slice(0, index + 1);

        logger.info('Rolled back to specific snapshot', {
            branch: this.activeBranch,
            snapshotId,
        });

        return target.messages.map(m => ({ ...m }));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Branching
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Create a new branch from the current state.
     * The new branch starts with a copy of the current messages.
     */
    branch(name: string, currentMessages: Message[]): ConversationBranch {
        if (this.branches.has(name)) {
            throw new Error(`Branch "${name}" already exists`);
        }

        // Get the latest snapshot ID from parent
        const parentBranch = this.getBranch();
        const lastSnapshot = parentBranch.snapshots[parentBranch.snapshots.length - 1];

        // Create initial snapshot for the new branch
        const initialSnapshot: ConversationSnapshot = {
            id: randomUUID(),
            timestamp: new Date(),
            messages: currentMessages.map(m => ({ ...m })),
            label: `Branched from ${this.activeBranch}`,
        };

        const newBranch: ConversationBranch = {
            name,
            snapshots: [initialSnapshot],
            parentSnapshotId: lastSnapshot?.id ?? null,
            parentBranch: this.activeBranch,
            createdAt: new Date(),
        };

        this.branches.set(name, newBranch);

        logger.info('Conversation branched', {
            from: this.activeBranch,
            to: name,
            messageCount: currentMessages.length,
        });

        return newBranch;
    }

    /**
     * Switch to a different branch.
     * Returns the messages from the latest snapshot of the target branch,
     * or null if the branch doesn't exist.
     */
    switchBranch(name: string): Message[] | null {
        const branch = this.branches.get(name);
        if (!branch) {
            logger.warn('Branch not found', { name });
            return null;
        }

        this.activeBranch = name;
        this.messagesSinceSnapshot = 0;

        // Return the latest snapshot's messages
        const latestSnapshot = branch.snapshots[branch.snapshots.length - 1];
        if (!latestSnapshot) {
            return [];
        }

        logger.info('Switched to branch', {
            branch: name,
            messageCount: latestSnapshot.messages.length,
        });

        return latestSnapshot.messages.map(m => ({ ...m }));
    }

    /**
     * Delete a branch (cannot delete main or the active branch).
     */
    deleteBranch(name: string): boolean {
        if (name === 'main') {
            logger.warn('Cannot delete main branch');
            return false;
        }
        if (name === this.activeBranch) {
            logger.warn('Cannot delete the active branch, switch first');
            return false;
        }

        const deleted = this.branches.delete(name);
        if (deleted) {
            logger.info('Branch deleted', { name });
        }
        return deleted;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * List all branches with summary info.
     */
    listBranches(): Array<{
        name: string;
        isActive: boolean;
        snapshotCount: number;
        parentBranch: string | null;
        createdAt: Date;
    }> {
        return Array.from(this.branches.values()).map(b => ({
            name: b.name,
            isActive: b.name === this.activeBranch,
            snapshotCount: b.snapshots.length,
            parentBranch: b.parentBranch,
            createdAt: b.createdAt,
        }));
    }

    /**
     * List snapshots in the current branch.
     */
    listSnapshots(): Array<{
        id: string;
        timestamp: Date;
        messageCount: number;
        label?: string;
    }> {
        const branch = this.getBranch();
        return branch.snapshots.map(s => ({
            id: s.id,
            timestamp: s.timestamp,
            messageCount: s.messages.length,
            label: s.label,
        }));
    }

    /**
     * Get the active branch name.
     */
    getActiveBranch(): string {
        return this.activeBranch;
    }

    /**
     * Get the number of snapshots in the current branch.
     */
    getSnapshotCount(): number {
        return this.getBranch().snapshots.length;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────────────────────────────────────────

    private getBranch(): ConversationBranch {
        const branch = this.branches.get(this.activeBranch);
        if (!branch) {
            throw new Error(`Active branch "${this.activeBranch}" not found`);
        }
        return branch;
    }
}
