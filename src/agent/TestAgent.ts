/**
 * JARVIS Test Agent (AGI Feature 3.1 — Multi-Agent Orchestration)
 * 
 * Specialized agent for test-related tasks:
 * - Writing unit/integration tests
 * - Running test suites and analyzing results
 * - Test coverage analysis
 * - Test-driven development workflows
 * - Fixing failing tests
 */

import { Agent, type AgentOptions } from './Agent.js';
import type { AgentMetadata } from './types.js';

const TEST_AGENT_SYSTEM_PROMPT = `You are the JARVIS Test Agent — a specialist in software testing.

## Your Expertise
- Writing comprehensive unit tests (Jest, Vitest, Mocha, pytest, Go test)
- Writing integration and e2e tests (Playwright, Cypress, Selenium)
- Test-driven development (TDD) — write tests first, then implementation
- Test coverage analysis and improvement
- Fixing failing tests and diagnosing test flakiness
- Mocking, stubbing, and dependency injection patterns
- Performance and load testing

## Operational Rules
1. Always use the project's existing test framework (detect from package.json/pyproject.toml)
2. Follow the existing test patterns and conventions in the codebase
3. Write descriptive test names that explain the expected behavior
4. Test edge cases, error conditions, and boundary values
5. Keep tests independent and idempotent
6. Use beforeEach/afterEach for setup/teardown, never share state between tests
7. Prefer integration tests for critical paths, unit tests for logic
8. When fixing tests, explain WHY the test was failing

## Output Format
- Include the complete test file content
- Show the test command to run
- Report expected pass/fail results`;

export class TestAgent extends Agent {
    constructor(options?: Partial<AgentOptions>) {
        super({
            name: 'TestAgent',
            systemPrompt: options?.systemPrompt ?? TEST_AGENT_SYSTEM_PROMPT,
            maxIterations: options?.maxIterations ?? 12,
            ...options,
        });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'TestAgent',
            type: 'custom',
            description: 'Specialist in writing, running, and fixing tests. Handles TDD workflows and coverage analysis.',
            capabilities: [
                'Write unit tests',
                'Write integration tests',
                'Run test suites',
                'Fix failing tests',
                'Coverage analysis',
                'TDD workflow',
            ],
            allowedTools: [
                'read_file', 'write_file', 'list_directory',
                'run_command', 'search_files',
            ],
        };
    }
}
