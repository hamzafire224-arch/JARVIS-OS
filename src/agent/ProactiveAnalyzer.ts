/**
 * JARVIS Proactive Analyzer (AGI Feature 2.1)
 * 
 * Intelligent trigger detection for proactive actions:
 * - Git monitoring: watch for new commits, PRs, failing CI
 * - Test monitoring: periodically run tests, report failures
 * - Dependency monitoring: check for outdated/vulnerable packages
 * - Code quality: detect patterns that need attention
 * 
 * Feeds actionable insights to HeartbeatScheduler for execution.
 * This is what makes JARVIS feel like a "colleague" not just an "assistant."
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProactiveInsight {
    id: string;
    type: 'git' | 'test' | 'dependency' | 'code_quality' | 'performance' | 'security';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    suggestedAction?: string;
    autoFixAvailable: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface InsightSummary {
    totalInsights: number;
    critical: number;
    warnings: number;
    info: number;
    insights: ProactiveInsight[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Proactive Analyzer
// ═══════════════════════════════════════════════════════════════════════════════

export class ProactiveAnalyzer {
    private insights: ProactiveInsight[] = [];
    private lastGitHash: string | null = null;
    private workingDir: string;

    constructor(workingDir?: string) {
        this.workingDir = workingDir ?? process.cwd();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Git Monitoring
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check for new git commits, unpushed changes, and branch status.
     */
    async analyzeGit(): Promise<ProactiveInsight[]> {
        const newInsights: ProactiveInsight[] = [];

        try {
            // Check if we're in a git repo
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: this.workingDir });
        } catch {
            return []; // Not a git repo
        }

        try {
            // Check for uncommitted changes
            const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: this.workingDir });
            const changedFiles = statusOut.trim().split('\n').filter(Boolean);
            
            if (changedFiles.length > 10) {
                newInsights.push({
                    id: `git-uncommitted-${Date.now()}`,
                    type: 'git',
                    severity: 'warning',
                    title: `${changedFiles.length} uncommitted changes detected`,
                    description: `You have ${changedFiles.length} modified files. Consider committing to avoid losing work.`,
                    suggestedAction: 'Run `git add -A && git commit -m "WIP: checkpoint"` to save progress.',
                    autoFixAvailable: true,
                    createdAt: new Date().toISOString(),
                    metadata: { fileCount: changedFiles.length },
                });
            }

            // Check for unpushed commits
            const { stdout: unpushed } = await execAsync(
                'git log --oneline @{upstream}..HEAD 2>/dev/null || echo ""',
                { cwd: this.workingDir }
            );
            const unpushedCount = unpushed.trim().split('\n').filter(Boolean).length;
            
            if (unpushedCount > 3) {
                newInsights.push({
                    id: `git-unpushed-${Date.now()}`,
                    type: 'git',
                    severity: 'info',
                    title: `${unpushedCount} unpushed commits`,
                    description: `You have ${unpushedCount} local commits not pushed to remote. Push to back up your work.`,
                    suggestedAction: 'Run `git push` to sync with remote.',
                    autoFixAvailable: true,
                    createdAt: new Date().toISOString(),
                });
            }

            // Check for new commits (compare HEAD with last known hash)
            const { stdout: currentHash } = await execAsync('git rev-parse HEAD', { cwd: this.workingDir });
            const trimmedHash = currentHash.trim();

            if (this.lastGitHash && this.lastGitHash !== trimmedHash) {
                const { stdout: commitLog } = await execAsync(
                    `git log --oneline ${this.lastGitHash}..${trimmedHash} 2>/dev/null || echo ""`,
                    { cwd: this.workingDir }
                );
                const newCommits = commitLog.trim().split('\n').filter(Boolean);

                if (newCommits.length > 0) {
                    newInsights.push({
                        id: `git-new-commits-${Date.now()}`,
                        type: 'git',
                        severity: 'info',
                        title: `${newCommits.length} new commit(s) detected`,
                        description: `Recent commits:\n${newCommits.slice(0, 5).join('\n')}`,
                        autoFixAvailable: false,
                        createdAt: new Date().toISOString(),
                        metadata: { commits: newCommits },
                    });
                }
            }

            this.lastGitHash = trimmedHash;

            // Check for merge conflicts
            const { stdout: conflictCheck } = await execAsync(
                'git diff --name-only --diff-filter=U 2>/dev/null || echo ""',
                { cwd: this.workingDir }
            );
            const conflictFiles = conflictCheck.trim().split('\n').filter(Boolean);

            if (conflictFiles.length > 0) {
                newInsights.push({
                    id: `git-conflicts-${Date.now()}`,
                    type: 'git',
                    severity: 'critical',
                    title: `${conflictFiles.length} merge conflict(s)`,
                    description: `Files with conflicts:\n${conflictFiles.join('\n')}`,
                    suggestedAction: 'I can help resolve these merge conflicts. Just say "fix merge conflicts".',
                    autoFixAvailable: true,
                    createdAt: new Date().toISOString(),
                    metadata: { files: conflictFiles },
                });
            }
        } catch (err) {
            logger.debug('[PROACTIVE] Git analysis error', { error: String(err) });
        }

        this.addInsights(newInsights);
        return newInsights;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Dependency Monitoring
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check for outdated packages and known vulnerabilities.
     */
    async analyzeDependencies(): Promise<ProactiveInsight[]> {
        const newInsights: ProactiveInsight[] = [];

        // Check for package.json
        const packageJsonPath = resolve(this.workingDir, 'package.json');
        if (!existsSync(packageJsonPath)) return [];

        try {
            // npm audit (security check)
            const { stdout: auditOutput } = await execAsync(
                'npm audit --json 2>/dev/null || echo "{}"',
                { cwd: this.workingDir, timeout: 30000 }
            );

            try {
                const audit = JSON.parse(auditOutput);
                const vulnerabilities = audit.metadata?.vulnerabilities;
                
                if (vulnerabilities) {
                    const critical = (vulnerabilities.critical ?? 0) + (vulnerabilities.high ?? 0);
                    const moderate = vulnerabilities.moderate ?? 0;

                    if (critical > 0) {
                        newInsights.push({
                            id: `dep-security-${Date.now()}`,
                            type: 'security',
                            severity: 'critical',
                            title: `${critical} critical/high security vulnerabilities`,
                            description: `npm audit found ${critical} critical or high severity issues. Run \`npm audit fix\` to resolve.`,
                            suggestedAction: 'Run `npm audit fix` or `npm audit fix --force` for breaking changes.',
                            autoFixAvailable: true,
                            createdAt: new Date().toISOString(),
                            metadata: { vulnerabilities },
                        });
                    } else if (moderate > 0) {
                        newInsights.push({
                            id: `dep-moderate-${Date.now()}`,
                            type: 'security',
                            severity: 'warning',
                            title: `${moderate} moderate security concerns`,
                            description: `npm audit found ${moderate} moderate severity issues.`,
                            suggestedAction: 'Consider running `npm audit fix` when convenient.',
                            autoFixAvailable: true,
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            } catch {
                // Invalid JSON from npm audit — skip
            }

            // Check for outdated packages
            const { stdout: outdatedOutput } = await execAsync(
                'npm outdated --json 2>/dev/null || echo "{}"',
                { cwd: this.workingDir, timeout: 30000 }
            );

            try {
                const outdated = JSON.parse(outdatedOutput);
                const outdatedCount = Object.keys(outdated).length;

                if (outdatedCount > 10) {
                    const majorUpdates = Object.entries(outdated)
                        .filter(([, info]: [string, unknown]) => {
                            const i = info as { current: string; latest: string };
                            return i.current?.split('.')[0] !== i.latest?.split('.')[0];
                        })
                        .map(([name]) => name);

                    newInsights.push({
                        id: `dep-outdated-${Date.now()}`,
                        type: 'dependency',
                        severity: majorUpdates.length > 0 ? 'warning' : 'info',
                        title: `${outdatedCount} packages outdated`,
                        description: majorUpdates.length > 0
                            ? `Major version updates available: ${majorUpdates.slice(0, 5).join(', ')}${majorUpdates.length > 5 ? ` +${majorUpdates.length - 5} more` : ''}`
                            : `${outdatedCount} packages have minor/patch updates available.`,
                        suggestedAction: 'Run `npm update` for safe updates.',
                        autoFixAvailable: true,
                        createdAt: new Date().toISOString(),
                        metadata: { outdatedCount, majorUpdates: majorUpdates.slice(0, 10) },
                    });
                }
            } catch {
                // Invalid JSON — skip
            }
        } catch (err) {
            logger.debug('[PROACTIVE] Dependency analysis error', { error: String(err) });
        }

        this.addInsights(newInsights);
        return newInsights;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Test Monitoring
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Run test suite and report failures.
     */
    async analyzeTests(): Promise<ProactiveInsight[]> {
        const newInsights: ProactiveInsight[] = [];
        const packageJsonPath = resolve(this.workingDir, 'package.json');

        if (!existsSync(packageJsonPath)) return [];

        try {
            const pkgContent = await readFile(packageJsonPath, 'utf-8');
            const pkg = JSON.parse(pkgContent);

            // Check if test script exists
            if (!pkg.scripts?.test || pkg.scripts.test === 'echo "Error: no test specified" && exit 1') {
                return [];
            }

            // Run tests with timeout
            const { stdout, stderr } = await execAsync('npm test -- --reporter=json 2>&1 || true', {
                cwd: this.workingDir,
                timeout: 60000,
            });

            const output = stdout + stderr;

            // Parse test results
            const failMatch = output.match(/(\d+)\s+fail/i);
            const passMatch = output.match(/(\d+)\s+pass/i);
            const errorMatch = output.match(/Error|FAIL|Failed/gi);

            if (failMatch && parseInt(failMatch[1]!, 10) > 0) {
                const failCount = parseInt(failMatch[1]!, 10);
                const passCount = passMatch ? parseInt(passMatch[1]!, 10) : 0;

                newInsights.push({
                    id: `test-failures-${Date.now()}`,
                    type: 'test',
                    severity: failCount > 5 ? 'critical' : 'warning',
                    title: `${failCount} test(s) failing (${passCount} passing)`,
                    description: `Test suite has ${failCount} failures. I can analyze and fix them.`,
                    suggestedAction: 'Say "fix failing tests" and I\'ll analyze the failures and propose fixes.',
                    autoFixAvailable: true,
                    createdAt: new Date().toISOString(),
                    metadata: { failCount, passCount },
                });
            } else if (errorMatch && errorMatch.length > 3) {
                newInsights.push({
                    id: `test-errors-${Date.now()}`,
                    type: 'test',
                    severity: 'warning',
                    title: 'Test suite encountered errors',
                    description: 'Multiple errors detected when running tests.',
                    suggestedAction: 'Check test configuration and dependencies.',
                    autoFixAvailable: false,
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            logger.debug('[PROACTIVE] Test analysis error', { error: String(err) });
        }

        this.addInsights(newInsights);
        return newInsights;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Full Analysis
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Run all analyzers and return combined insights.
     */
    async runFullAnalysis(): Promise<InsightSummary> {
        logger.info('[PROACTIVE] Running full analysis...');

        // Run analyzers in parallel
        const results = await Promise.allSettled([
            this.analyzeGit(),
            this.analyzeDependencies(),
            // Test analysis is heavier — only run if explicitly requested
        ]);

        // Collect all insights
        const allInsights: ProactiveInsight[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allInsights.push(...result.value);
            }
        }

        return {
            totalInsights: allInsights.length,
            critical: allInsights.filter(i => i.severity === 'critical').length,
            warnings: allInsights.filter(i => i.severity === 'warning').length,
            info: allInsights.filter(i => i.severity === 'info').length,
            insights: allInsights,
        };
    }

    /**
     * Get human-readable summary for agent context injection.
     */
    async getProactiveSummary(): Promise<string> {
        const summary = await this.runFullAnalysis();

        if (summary.totalInsights === 0) return '';

        const lines = ['\n## 🔔 Proactive Insights'];

        if (summary.critical > 0) {
            lines.push(`⚠️ ${summary.critical} critical issue(s) need attention!`);
        }

        for (const insight of summary.insights.slice(0, 5)) {
            const icon = insight.severity === 'critical' ? '🔴' : insight.severity === 'warning' ? '🟡' : '🔵';
            lines.push(`${icon} **${insight.title}**`);
            if (insight.suggestedAction) {
                lines.push(`  → ${insight.suggestedAction}`);
            }
        }

        if (summary.insights.length > 5) {
            lines.push(`  ... and ${summary.insights.length - 5} more insights`);
        }

        return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Insight Management
    // ─────────────────────────────────────────────────────────────────────────────

    getInsights(): ProactiveInsight[] {
        return [...this.insights];
    }

    clearInsights(): void {
        this.insights = [];
    }

    private addInsights(newInsights: ProactiveInsight[]): void {
        this.insights.push(...newInsights);
        // Keep last 50 insights
        if (this.insights.length > 50) {
            this.insights = this.insights.slice(-50);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: ProactiveAnalyzer | null = null;

export function getProactiveAnalyzer(workingDir?: string): ProactiveAnalyzer {
    if (!instance) {
        instance = new ProactiveAnalyzer(workingDir);
    }
    return instance;
}
