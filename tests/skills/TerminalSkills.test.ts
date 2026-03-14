/**
 * TerminalSkills Unit Tests
 *
 * Tests for RunCommandSkill: simple execution, output, timeout,
 * and platform detection.
 */

import { describe, it, expect } from 'vitest';
import { RunCommandSkill } from '../../src/skills/TerminalSkills.js';
import type { SkillExecutionContext } from '../../src/skills/Skill.js';

const context: SkillExecutionContext = {};

// ═══════════════════════════════════════════════════════════════════════════════
// RunCommandSkill
// ═══════════════════════════════════════════════════════════════════════════════

describe('RunCommandSkill', () => {
    const skill = new RunCommandSkill();

    it('returns tool definition with correct name and category', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.name).toBe('run_command');
        expect(toolDef.category).toBe('terminal');
        expect(toolDef.parameters.required).toContain('command');
    });

    it('marks the tool as dangerous', () => {
        const toolDef = skill.getToolDefinition();
        expect(toolDef.dangerous).toBe(true);
    });

    it('validates required command arg', async () => {
        await expect(skill.execute({}, context)).rejects.toThrow();
    });

    it('executes a simple echo command', async () => {
        // Platform-aware command
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'cmd /c echo hello' : 'echo hello';

        const result = await skill.execute({ command }, context);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('hello');
    });

    it('captures stderr for failing commands', async () => {
        const isWindows = process.platform === 'win32';
        // Run a command that will fail
        const command = isWindows
            ? 'cmd /c exit 1'
            : 'bash -c "exit 1"';

        const result = await skill.execute({ command }, context);
        expect(result.exitCode).not.toBe(0);
    });

    it('respects timeout option', async () => {
        const isWindows = process.platform === 'win32';
        // Long-running command with very short timeout
        const command = isWindows
            ? 'cmd /c ping -n 10 127.0.0.1'
            : 'sleep 10';

        const result = await skill.execute(
            { command, timeout: 1000 }, // 1 second timeout
            context
        );

        // Should have been killed due to timeout
        expect(result.timedOut ?? result.exitCode !== 0).toBe(true);
    });

    it('returns output with line count', async () => {
        const isWindows = process.platform === 'win32';
        const command = isWindows
            ? 'cmd /c echo line1 && echo line2 && echo line3'
            : 'printf "line1\\nline2\\nline3"';

        const result = await skill.execute({ command }, context);
        expect(result.exitCode).toBe(0);
        // Should have multiple lines
        const lines = result.stdout.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        expect(lines.length).toBeGreaterThanOrEqual(3);
    });
});
