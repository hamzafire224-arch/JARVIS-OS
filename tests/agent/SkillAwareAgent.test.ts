/**
 * SkillAwareAgent Unit Tests
 * 
 * Tests that SkillAwareAgent correctly bridges the SkillRegistry
 * to the Agent tool system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillAwareAgent } from '../../src/agent/SkillAwareAgent.js';
import { initializeSkills, getSkillRegistry, resetSkillRegistry } from '../../src/skills/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
    resetSkillRegistry();
    initializeSkills({
        enableFilesystem: true,
        enableTerminal: true,
        enableWeb: true,
        enableBrowser: false,
        enableGitHub: false,
        enableDatabase: false,
    });
});

afterEach(() => {
    resetSkillRegistry();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillAwareAgent', () => {
    it('auto-registers skills as tools based on categories', () => {
        const agent = new SkillAwareAgent({
            name: 'TestAgent',
            systemPrompt: 'Test prompt',
            skillCategories: ['filesystem', 'terminal'],
        });

        const metadata = agent.getMetadata();
        const toolNames = metadata.allowedTools ?? [];

        // Should have filesystem tools
        expect(toolNames).toContain('read_file');
        expect(toolNames).toContain('write_file');
        expect(toolNames).toContain('list_directory');
        expect(toolNames).toContain('search_files');
        expect(toolNames).toContain('delete_file');

        // Should have terminal tools
        expect(toolNames).toContain('run_command');

        // Should NOT have web tools (not in categories)
        expect(toolNames).not.toContain('http_fetch');
        expect(toolNames).not.toContain('web_search');
    });

    it('registers web tools when web category is included', () => {
        const agent = new SkillAwareAgent({
            name: 'WebAgent',
            systemPrompt: 'Test prompt',
            skillCategories: ['web'],
        });

        const metadata = agent.getMetadata();
        const toolNames = metadata.allowedTools ?? [];

        expect(toolNames).toContain('http_fetch');
        expect(toolNames).toContain('read_webpage');
        expect(toolNames).toContain('web_search');
        expect(toolNames).toContain('download_file');

        // Should NOT have filesystem tools
        expect(toolNames).not.toContain('read_file');
    });

    it('registers all default categories when none specified', () => {
        const agent = new SkillAwareAgent({
            name: 'DefaultAgent',
            systemPrompt: 'Test prompt',
            // No skillCategories → defaults to filesystem, terminal, web, memory, system
        });

        const metadata = agent.getMetadata();
        const toolNames = metadata.allowedTools ?? [];
        
        // Should have a mix of tools from default categories
        expect(toolNames.length).toBeGreaterThan(0);
    });

    it('provides correct metadata', () => {
        const agent = new SkillAwareAgent({
            name: 'MetaAgent',
            systemPrompt: 'Test prompt',
            workspaceDir: '/test/workspace',
            skillCategories: ['filesystem'],
        });

        const metadata = agent.getMetadata();
        expect(metadata.name).toBe('MetaAgent');
        expect(metadata.type).toBe('custom');
        expect(metadata.workspaceDir).toBe('/test/workspace');
    });

    it('updates skill context', () => {
        const agent = new SkillAwareAgent({
            name: 'ContextAgent',
            systemPrompt: 'Test prompt',
            skillCategories: ['filesystem'],
        });

        agent.setSkillContext({ workspaceDir: '/new/workspace' });
        const ctx = agent.getSkillContext();
        expect(ctx.workspaceDir).toBe('/new/workspace');
    });
});
