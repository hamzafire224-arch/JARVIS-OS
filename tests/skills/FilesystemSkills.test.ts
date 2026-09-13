/**
 * FilesystemSkills Unit Tests
 * 
 * Tests for ReadFileSkill, WriteFileSkill, ListDirectorySkill,
 * SearchFilesSkill, and DeleteFileSkill.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    ReadFileSkill,
    WriteFileSkill,
    ListDirectorySkill,
    SearchFilesSkill,
    DeleteFileSkill,
} from '../../src/skills/FilesystemSkills.js';
import type { SkillExecutionContext } from '../../src/skills/Skill.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

let tempDir: string;
let context: SkillExecutionContext;

beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'jarvis-test-'));
    context = { workspaceDir: tempDir };
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ReadFileSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReadFileSkill', () => {
    const skill = new ReadFileSkill();

    it('reads a text file and returns its content', async () => {
        const filePath = join(tempDir, 'test.txt');
        await writeFile(filePath, 'Hello, JARVIS!', 'utf-8');

        const result = await skill.execute({ path: filePath }, context);
        expect(result.content).toBe('Hello, JARVIS!');
        expect(result.lineCount).toBeGreaterThan(0);
    });

    it('returns tool definition with correct name and category', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('read_file');
        expect(toolDef.category).toBe('filesystem');
    });

    it('throws error for non-existent file', async () => {
        const filePath = join(tempDir, 'does-not-exist.txt');
        await expect(skill.execute({ path: filePath }, context)).rejects.toThrow();
    });

    it('validates required args', async () => {
        await expect(skill.execute({}, context)).rejects.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WriteFileSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('WriteFileSkill', () => {
    const skill = new WriteFileSkill();

    it('creates a new file with content', async () => {
        const filePath = join(tempDir, 'output.txt');
        const result = await skill.execute(
            { path: filePath, content: 'Test content' },
            context
        );

        expect(result.success).toBe(true);
        const written = await readFile(filePath, 'utf-8');
        expect(written).toBe('Test content');
    });

    it('creates parent directories when needed', async () => {
        const filePath = join(tempDir, 'nested', 'deep', 'file.txt');
        const result = await skill.execute(
            { path: filePath, content: 'Nested content', createDirs: true },
            context
        );

        expect(result.success).toBe(true);
        const written = await readFile(filePath, 'utf-8');
        expect(written).toBe('Nested content');
    });

    it('returns tool definition with dangerous flag', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('write_file');
        expect(toolDef.dangerous).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ListDirectorySkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('ListDirectorySkill', () => {
    const skill = new ListDirectorySkill();

    it('lists files in a directory', async () => {
        await writeFile(join(tempDir, 'a.txt'), 'a');
        await writeFile(join(tempDir, 'b.txt'), 'b');
        await mkdir(join(tempDir, 'subdir'));

        const result = await skill.execute({ path: tempDir }, context);
        expect(result.entries.length).toBe(3);
        
        const names = result.entries.map((e: { name: string }) => e.name).sort();
        expect(names).toEqual(['a.txt', 'b.txt', 'subdir']);
    });

    it('throws error for non-existent directory', async () => {
        await expect(
            skill.execute({ path: join(tempDir, 'nope') }, context)
        ).rejects.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DeleteFileSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeleteFileSkill', () => {
    const skill = new DeleteFileSkill();

    it('deletes an existing file', async () => {
        const filePath = join(tempDir, 'to-delete.txt');
        await writeFile(filePath, 'delete me');

        const result = await skill.execute({ path: filePath }, context);
        expect(result.success).toBe(true);

        // File should no longer exist
        const readSkill = new ReadFileSkill();
        await expect(readSkill.execute({ path: filePath }, context)).rejects.toThrow();
    });

    it('returns tool definition with dangerous flag', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('delete_file');
        expect(toolDef.dangerous).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SearchFilesSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('SearchFilesSkill', () => {
    const skill = new SearchFilesSkill();

    it('finds files matching a pattern in content', async () => {
        await writeFile(join(tempDir, 'haystack.txt'), 'needle in a haystack');
        await writeFile(join(tempDir, 'empty.txt'), 'nothing here');

        const result = await skill.execute(
            { path: tempDir, query: 'needle' },
            context
        );
        expect(result.matches.length).toBeGreaterThanOrEqual(1);
    });

    it('returns tool definition with correct name', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('search_files');
        expect(toolDef.category).toBe('filesystem');
    });
});
