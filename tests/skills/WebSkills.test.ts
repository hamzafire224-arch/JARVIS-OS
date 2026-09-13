/**
 * WebSkills Unit Tests
 * 
 * Tests for WebSearchSkill behavior:
 * - Returns empty results with helpful note when no API key is set
 * - validates args correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSearchSkill, HttpFetchSkill, ReadWebpageSkill } from '../../src/skills/WebSkills.js';
import type { SkillExecutionContext } from '../../src/skills/Skill.js';

const context: SkillExecutionContext = {};

// ═══════════════════════════════════════════════════════════════════════════════
// WebSearchSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('WebSearchSkill', () => {
    const skill = new WebSearchSkill();

    it('returns tool definition with correct name and category', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('web_search');
        expect(toolDef.category).toBe('web');
    });

    it('returns empty results with note when no API key is set', async () => {
        // Ensure env var is not set
        const original = process.env['BRAVE_SEARCH_API_KEY'];
        delete process.env['BRAVE_SEARCH_API_KEY'];

        try {
            const result = await skill.execute({ query: 'test query' }, context);
            expect(result.results).toEqual([]);
            expect(result.totalResults).toBe(0);
            expect(result.note).toContain('BRAVE_SEARCH_API_KEY');
            expect(result.query).toBe('test query');
        } finally {
            // Restore env var
            if (original !== undefined) {
                process.env['BRAVE_SEARCH_API_KEY'] = original;
            }
        }
    });

    it('validates required query arg', async () => {
        await expect(skill.execute({}, context)).rejects.toThrow();
    });

    it('has proper search result interface', () => {
        const toolDef = skill.getToolDefinition();
        const queryParam = toolDef.parameters.properties['query'];
        expect(queryParam).toBeDefined();
        expect(queryParam.type).toBe('string');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HttpFetchSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('HttpFetchSkill', () => {
    const skill = new HttpFetchSkill();

    it('returns tool definition with correct name', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('http_fetch');
        expect(toolDef.category).toBe('web');
        expect(toolDef.parameters.required).toContain('url');
    });

    it('validates required url arg', async () => {
        await expect(skill.execute({}, context)).rejects.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ReadWebpageSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReadWebpageSkill', () => {
    const skill = new ReadWebpageSkill();

    it('returns tool definition with correct name', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('read_webpage');
        expect(toolDef.category).toBe('web');
    });

    it('validates required url arg', async () => {
        await expect(skill.execute({}, context)).rejects.toThrow();
    });
});
