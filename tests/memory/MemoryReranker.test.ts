/**
 * MemoryReranker Unit Tests
 *
 * Tests keyword-boost scoring, recency ranking,
 * LLM fallback behavior, and configuration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    MemoryReranker,
    resetMemoryReranker,
    getMemoryReranker,
    type MemoryEntry,
} from '../../src/memory/MemoryReranker.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════════════════

afterEach(() => {
    resetMemoryReranker();
});

const createEntry = (id: string, content: string, type: MemoryEntry['type'] = 'fact', daysAgo = 0): MemoryEntry => ({
    id,
    type,
    content,
    tags: [],
    timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Keyword-Boost Reranking
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryReranker - Keyword Boost', () => {
    it('ranks entries with matching keywords higher', async () => {
        const reranker = new MemoryReranker({
            method: 'keyword-boost',
            candidateLimit: 10,
            finalLimit: 5,
        });

        const entries: MemoryEntry[] = [
            createEntry('1', 'The weather is nice today'),
            createEntry('2', 'TypeScript is a typed superset of JavaScript'),
            createEntry('3', 'Python is great for data science'),
            createEntry('4', 'TypeScript supports interfaces and generics'),
            createEntry('5', 'Cooking pasta is easy'),
            createEntry('6', 'Music helps with focus'),
        ];

        const results = await reranker.rerank('TypeScript programming', entries);

        // TypeScript entries should rank in top 3
        const topIds = results.slice(0, 3).map(r => r.id);
        expect(topIds).toContain('2');
        expect(topIds).toContain('4');
    });

    it('returns all entries when count <= finalLimit', async () => {
        const reranker = new MemoryReranker({
            method: 'keyword-boost',
            finalLimit: 10,
        });

        const entries: MemoryEntry[] = [
            createEntry('1', 'Entry one'),
            createEntry('2', 'Entry two'),
        ];

        const results = await reranker.rerank('anything', entries);
        expect(results.length).toBe(2);
    });

    it('provides score breakdown for each entry', async () => {
        const reranker = new MemoryReranker({
            method: 'keyword-boost',
            candidateLimit: 10,
            finalLimit: 5,
        });

        const entries: MemoryEntry[] = [
            createEntry('1', 'Test content'),
            createEntry('2', 'Another entry'),
            createEntry('3', 'More test content here'),
            createEntry('4', 'Unrelated stuff'),
            createEntry('5', 'Also test related'),
            createEntry('6', 'Extra padding entry'),
        ];

        const results = await reranker.rerank('test', entries);

        for (const result of results) {
            expect(result.scoreBreakdown).toBeDefined();
            expect(typeof result.scoreBreakdown.keyword).toBe('number');
            expect(typeof result.scoreBreakdown.recency).toBe('number');
            expect(typeof result.scoreBreakdown.type).toBe('number');
            expect(typeof result.scoreBreakdown.rerank).toBe('number');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Recency Reranking
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryReranker - Recency', () => {
    it('ranks recent entries higher than old ones', async () => {
        const reranker = new MemoryReranker({
            method: 'recency',
            candidateLimit: 10,
            finalLimit: 5,
        });

        const entries: MemoryEntry[] = [
            createEntry('old', 'Old entry', 'fact', 60),   // 60 days ago
            createEntry('mid', 'Mid entry', 'fact', 15),   // 15 days ago
            createEntry('new', 'New entry', 'fact', 1),    // 1 day ago
            createEntry('newest', 'Newest entry', 'fact', 0), // today
            createEntry('ancient', 'Ancient entry', 'fact', 90), // 90 days ago
            createEntry('recent', 'Recent entry', 'fact', 5), // 5 days ago
        ];

        const results = await reranker.rerank('anything', entries);

        // Should be ordered by recency
        expect(results[0].id).toBe('newest');
        expect(results[1].id).toBe('new');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LLM Reranking (Fallback Behavior)
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryReranker - LLM Fallback', () => {
    it('falls back to keyword-boost when LLM is unavailable', async () => {
        const reranker = new MemoryReranker({
            method: 'llm',
            candidateLimit: 10,
            finalLimit: 5,
        });

        const entries: MemoryEntry[] = [
            createEntry('1', 'Test TypeScript code'),
            createEntry('2', 'Unrelated content'),
            createEntry('3', 'TypeScript compiler options'),
            createEntry('4', 'Random noise'),
            createEntry('5', 'More random noise'),
            createEntry('6', 'Even more noise'),
        ];

        // Should not throw even with no LLM provider
        const results = await reranker.rerank('TypeScript', entries);
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryReranker - Configuration', () => {
    it('respects disabled setting', async () => {
        const reranker = new MemoryReranker({ enabled: false });

        const entries = [createEntry('1', 'Test')];
        const results = await reranker.rerank('test', entries);

        // When disabled, should return entries with default scores
        expect(results.length).toBe(1);
        expect(results[0].score).toBe(1);
    });

    it('allows config updates', () => {
        const reranker = new MemoryReranker({ method: 'keyword-boost' });
        reranker.updateConfig({ method: 'recency' });

        const config = reranker.getConfig();
        expect(config.method).toBe('recency');
    });

    it('singleton works via getMemoryReranker', () => {
        const r1 = getMemoryReranker();
        const r2 = getMemoryReranker();
        expect(r1).toBe(r2);
    });
});
