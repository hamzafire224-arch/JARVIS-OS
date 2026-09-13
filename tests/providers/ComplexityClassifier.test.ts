/**
 * ComplexityClassifier Unit Tests
 * 
 * Tests that the classifier correctly categorizes prompts
 * as simple, moderate, or complex.
 */

import { describe, it, expect } from 'vitest';
import { ComplexityClassifier, type ComplexityLevel } from '../../src/providers/ComplexityClassifier.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('ComplexityClassifier', () => {
    const classifier = new ComplexityClassifier();

    describe('simple prompts', () => {
        const simplePrompts = [
            'hello',
            'hi there',
            'yes',
            'no',
            'thanks',
            'ok',
            'what time is it?',
            'good morning',
        ];

        it.each(simplePrompts)('classifies "%s" as simple', (prompt) => {
            const result = classifier.classify(prompt);
            expect(result.level).toBe('simple');
        });
    });

    describe('complex prompts', () => {
        const complexPrompts = [
            'Write a comprehensive React component that manages state, handles API calls, validates user input, and renders a responsive dashboard with charts',
            'Research and compare the top 5 cloud providers, analyze their pricing models, evaluate their machine learning services, and provide recommendations for a startup',
            'Debug this production error by analyzing the stack trace, reviewing the database queries, checking the cache invalidation logic, and proposing a fix with tests',
        ];

        it.each(complexPrompts)('classifies complex prompt as moderate or complex', (prompt) => {
            const result = classifier.classify(prompt);
            expect(['moderate', 'complex']).toContain(result.level);
        });
    });

    describe('classify return format', () => {
        it('returns level, score, and reason', () => {
            const result = classifier.classify('Hello world');
            expect(result).toHaveProperty('level');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('reason');
            expect(typeof result.score).toBe('number');
            expect(typeof result.reason).toBe('string');
        });

        it('returns a score between 0 and 100', () => {
            const result = classifier.classify('explain quantum physics in depth');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });

    describe('pattern detection', () => {
        it('detects code-related prompts as higher complexity', () => {
            const codeResult = classifier.classify('write a Python function to sort data');
            const simpleResult = classifier.classify('hello');
            expect(codeResult.score).toBeGreaterThan(simpleResult.score);
        });

        it('detects multi-step prompts as higher complexity', () => {
            const multiStep = classifier.classify(
                'First research the topic, then create an outline, then write the article, and finally proofread it'
            );
            const singleStep = classifier.classify('What is TypeScript?');
            expect(multiStep.score).toBeGreaterThan(singleStep.score);
        });

        it('detects long prompts as higher complexity', () => {
            const longPrompt = classifier.classify(
                'I need you to help me build a complete application. ' +
                'It should have authentication, a dashboard, user management, ' +
                'API endpoints, database migrations, and comprehensive tests. ' +
                'Please also set up CI/CD and deployment configuration.'
            );
            const shortPrompt = classifier.classify('hi');
            expect(longPrompt.score).toBeGreaterThan(shortPrompt.score);
        });
    });
});
