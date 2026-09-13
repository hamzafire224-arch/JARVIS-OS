/**
 * MemoryManager Unit Tests
 *
 * Tests for CRUD operations, atomic writes, backup, export/import,
 * and corrupted file handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MemoryManager } from '../../src/memory/MemoryManager.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════════════════

let tempDir: string;
let memoryPath: string;
let manager: MemoryManager;

beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jarvis-mem-test-'));
    memoryPath = join(tempDir, 'memory.json');
    manager = new MemoryManager(memoryPath);
    await manager.initialize();
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryManager CRUD', () => {
    it('adds a memory entry and retrieves it', async () => {
        const entry = await manager.add({
            type: 'fact',
            content: 'TypeScript is awesome',
            source: 'test',
            tags: ['tech'],
            importance: 5,
        });

        expect(entry.id).toBeDefined();
        expect(entry.content).toBe('TypeScript is awesome');
        expect(entry.type).toBe('fact');
    });

    it('searches memories by keyword', async () => {
        await manager.add({
            type: 'preference',
            content: 'I prefer dark mode',
            source: 'test',
            tags: ['ui'],
            importance: 7,
        });
        await manager.add({
            type: 'fact',
            content: 'The sky is blue',
            source: 'test',
            tags: ['nature'],
            importance: 3,
        });

        const results = await manager.search('dark mode');
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].content).toContain('dark mode');
    });

    it('updates an existing entry', async () => {
        const entry = await manager.add({
            type: 'fact',
            content: 'Initial content',
            source: 'test',
            tags: [],
            importance: 5,
        });

        const updated = await manager.update(entry.id, { content: 'Updated content' });
        expect(updated).not.toBeNull();
        expect(updated!.content).toBe('Updated content');
    });

    it('deletes an entry', async () => {
        const entry = await manager.add({
            type: 'fact',
            content: 'To be deleted',
            source: 'test',
            tags: [],
            importance: 1,
        });

        const deleted = await manager.delete(entry.id);
        expect(deleted).toBe(true);

        // Searching should not find the deleted entry
        const results = await manager.search('To be deleted');
        expect(results.length).toBe(0);
    });

    it('returns null for updating non-existent entry', async () => {
        const result = await manager.update('non-existent-id', { content: 'nope' });
        expect(result).toBeNull();
    });

    it('returns false for deleting non-existent entry', async () => {
        const result = await manager.delete('non-existent-id');
        expect(result).toBe(false);
    });

    it('gets entries by type', async () => {
        await manager.add({ type: 'preference', content: 'pref1', source: 'test', tags: [], importance: 5 });
        await manager.add({ type: 'fact', content: 'fact1', source: 'test', tags: [], importance: 5 });
        await manager.add({ type: 'preference', content: 'pref2', source: 'test', tags: [], importance: 5 });

        const prefs = await manager.getByType('preference');
        expect(prefs.length).toBe(2);
    });

    it('gets stats', async () => {
        await manager.add({ type: 'preference', content: 'p1', source: 'test', tags: [], importance: 5 });
        await manager.add({ type: 'fact', content: 'f1', source: 'test', tags: [], importance: 5 });

        const stats = await manager.getStats();
        expect(stats.totalEntries).toBe(2);
        expect(stats.byType['preference']).toBe(1);
        expect(stats.byType['fact']).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Persistence & Atomic Writes
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryManager Persistence', () => {
    it('persists data to disk and survives reload', async () => {
        await manager.add({
            type: 'fact',
            content: 'Persistent fact',
            source: 'test',
            tags: ['persist'],
            importance: 8,
        });

        // Create a new manager pointing at same file
        const reloaded = new MemoryManager(memoryPath);
        await reloaded.initialize();

        const results = await reloaded.search('Persistent fact');
        expect(results.length).toBe(1);
        expect(results[0].content).toBe('Persistent fact');
    });

    it('creates .bak backup file on save', async () => {
        await manager.add({
            type: 'fact',
            content: 'Backup test',
            source: 'test',
            tags: [],
            importance: 5,
        });

        // First save creates the file, second save creates backup
        await manager.add({
            type: 'fact',
            content: 'Second entry',
            source: 'test',
            tags: [],
            importance: 5,
        });

        const bakPath = `${memoryPath}.bak`;
        expect(existsSync(bakPath)).toBe(true);

        // Backup should contain the first entry but not yet the second
        const bakContent = JSON.parse(await readFile(bakPath, 'utf-8'));
        expect(bakContent.entries.length).toBeGreaterThanOrEqual(1);
    });

    it('does not leave .tmp files after successful save', async () => {
        await manager.add({
            type: 'fact',
            content: 'Atomic test',
            source: 'test',
            tags: [],
            importance: 5,
        });

        const tmpPath = `${memoryPath}.tmp`;
        expect(existsSync(tmpPath)).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Export / Import
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryManager Export/Import', () => {
    it('exports memories to a file', async () => {
        await manager.add({ type: 'fact', content: 'Export me', source: 'test', tags: [], importance: 5 });

        const exportPath = join(tempDir, 'export.json');
        const stats = await manager.export(exportPath);

        expect(stats.entries).toBe(1);
        expect(existsSync(exportPath)).toBe(true);

        const exportedData = JSON.parse(await readFile(exportPath, 'utf-8'));
        expect(exportedData.entries.length).toBe(1);
    });

    it('imports memories from a file, skipping duplicates', async () => {
        const entry = await manager.add({
            type: 'fact',
            content: 'Original entry',
            source: 'test',
            tags: [],
            importance: 5,
        });

        // Export
        const exportPath = join(tempDir, 'export.json');
        await manager.export(exportPath);

        // Import back — should skip the duplicate
        const result = await manager.import(exportPath);
        expect(result.skipped).toBe(1);
        expect(result.imported).toBe(0);
    });

    it('imports new memories from another instance', async () => {
        // Create a second manager with its own file
        const otherPath = join(tempDir, 'other-memory.json');
        const otherManager = new MemoryManager(otherPath);
        await otherManager.initialize();
        await otherManager.add({
            type: 'preference',
            content: 'I like vim',
            source: 'other',
            tags: ['editor'],
            importance: 8,
        });

        // Export from other, import into main
        const exportPath = join(tempDir, 'transfer.json');
        await otherManager.export(exportPath);

        const result = await manager.import(exportPath);
        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(0);

        // Verify imported entry is searchable
        const results = await manager.search('vim');
        expect(results.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryManager Error Handling', () => {
    it('throws MemoryCorruptedError for invalid JSON', async () => {
        // Write invalid JSON to the memory file
        await writeFile(memoryPath, '{invalid json!!!', 'utf-8');

        const badManager = new MemoryManager(memoryPath);
        await expect(badManager.initialize()).rejects.toThrow();
    });
});
