/**
 * JARVIS GitHub CLI Integration Skills
 * 
 * Direct bridge to the host machine's GitHub CLI (gh), enabling:
 * - Issue Triage: Create, list, label, close issues
 * - PR Management: View, review, create, merge PRs
 * - CI/CD Remote: Trigger workflows, view runs
 * - Activity Tracking: Commit summaries, branch reports
 * 
 * Designed to reduce context switching for professional developers.
 */

import { MultiToolSkill } from './Skill.js';
import type { ToolDefinition, ToolResult, ToolParameter } from '../agent/types.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    state: string;
    labels: string[];
    author: string;
    createdAt: string;
    url: string;
}

interface GitHubPR {
    number: number;
    title: string;
    body: string;
    state: string;
    author: string;
    headBranch: string;
    baseBranch: string;
    additions: number;
    deletions: number;
    files: number;
    reviews: { author: string; state: string }[];
    url: string;
    mergeable: boolean;
}

interface GitHubWorkflow {
    id: number;
    name: string;
    state: string;
    path: string;
}

interface GitHubWorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    headBranch: string;
    createdAt: string;
    url: string;
}

interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    date: string;
}

interface ActivityReport {
    period: string;
    commits: number;
    prs: { opened: number; merged: number; closed: number };
    issues: { opened: number; closed: number };
    topContributors: { author: string; commits: number }[];
    staleBranches: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GitHub Skills Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class GitHubSkills extends MultiToolSkill {
    private defaultRepo: string | null = null;
    private cwd: string;

    constructor(options: { defaultRepo?: string; cwd?: string } = {}) {
        super({
            name: 'GitHubSkills',
            description: 'GitHub CLI integration for issue triage, PR management, CI/CD, and activity tracking',
            version: '1.0.0',
            category: 'github',
        });
        this.defaultRepo = options.defaultRepo ?? null;
        this.cwd = options.cwd ?? process.cwd();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Skill Registration
    // ─────────────────────────────────────────────────────────────────────────────

    getTools(): ToolDefinition[] {
        return [
            // Issue Management
            this.createIssueListTool(),
            this.createIssueCreateTool(),
            this.createIssueViewTool(),
            this.createIssueLabelTool(),
            this.createIssueCloseTool(),
            this.createIssueTriageTool(),

            // PR Management
            this.createPRListTool(),
            this.createPRViewTool(),
            this.createPRCreateTool(),
            this.createPRReviewTool(),
            this.createPRMergeTool(),
            this.createPRSummarizeTool(),

            // CI/CD
            this.createWorkflowListTool(),
            this.createWorkflowRunTool(),
            this.createWorkflowStatusTool(),

            // Activity Tracking
            this.createCommitSearchTool(),
            this.createActivityReportTool(),
            this.createBranchListTool(),
            this.createRepoInfoTool(),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper: Execute gh command
    // ─────────────────────────────────────────────────────────────────────────────

    private async executeGH(args: string[], options: { json?: boolean; repo?: string } = {}): Promise<{ success: boolean; output: string; parsed?: any }> {
        const fullArgs = [...args];

        if (options.json) {
            fullArgs.push('--json');
        }

        if (options.repo) {
            fullArgs.push('-R', options.repo);
        } else if (this.defaultRepo) {
            fullArgs.push('-R', this.defaultRepo);
        }

        const command = `gh ${fullArgs.join(' ')}`;
        logger.debug('Executing GitHub CLI', { command });

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.cwd,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
            });

            let parsed = undefined;
            if (options.json && stdout.trim()) {
                try {
                    parsed = JSON.parse(stdout);
                } catch {
                    // Not valid JSON, return as string
                }
            }

            return { success: true, output: stdout.trim(), parsed };
        } catch (error: any) {
            const errorMessage = error.stderr || error.message || String(error);
            logger.error('GitHub CLI error', { command, error: errorMessage });
            return { success: false, output: errorMessage };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Issue Management Tools
    // ═══════════════════════════════════════════════════════════════════════════════

    private createIssueListTool(): ToolDefinition {
        return {
            name: 'github_issue_list',
            description: 'List issues in a GitHub repository with optional filtering by state, labels, or assignee',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format (optional if in a git repo)',
                    },
                    state: {
                        type: 'string',
                        enum: ['open', 'closed', 'all'],
                        description: 'Filter by issue state (default: open)',
                    },
                    labels: {
                        type: 'array',
                        items: { type: 'string', description: 'Label name' },
                        description: 'Filter by labels',
                    },
                    assignee: {
                        type: 'string',
                        description: 'Filter by assignee username',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of issues to return (default: 30)',
                    },
                },
            },
            category: 'github',
        };
    }

    private createIssueCreateTool(): ToolDefinition {
        return {
            name: 'github_issue_create',
            description: 'Create a new GitHub issue from a description. Automatically formats the issue body.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    title: {
                        type: 'string',
                        description: 'Issue title',
                    },
                    body: {
                        type: 'string',
                        description: 'Issue body/description (supports markdown)',
                    },
                    labels: {
                        type: 'array',
                        items: { type: 'string', description: 'Label name' },
                        description: 'Labels to apply',
                    },
                    assignees: {
                        type: 'array',
                        items: { type: 'string', description: 'Username' },
                        description: 'Users to assign',
                    },
                },
                required: ['title', 'body'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createIssueViewTool(): ToolDefinition {
        return {
            name: 'github_issue_view',
            description: 'View details of a specific GitHub issue including comments',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'Issue number',
                    },
                    includeComments: {
                        type: 'boolean',
                        description: 'Include issue comments (default: true)',
                    },
                },
                required: ['number'],
            },
            category: 'github',
        };
    }

    private createIssueLabelTool(): ToolDefinition {
        return {
            name: 'github_issue_label',
            description: 'Add or remove labels from a GitHub issue',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'Issue number',
                    },
                    addLabels: {
                        type: 'array',
                        items: { type: 'string', description: 'Label to add' },
                        description: 'Labels to add',
                    },
                    removeLabels: {
                        type: 'array',
                        items: { type: 'string', description: 'Label to remove' },
                        description: 'Labels to remove',
                    },
                },
                required: ['number'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createIssueCloseTool(): ToolDefinition {
        return {
            name: 'github_issue_close',
            description: 'Close a GitHub issue with an optional comment',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'Issue number',
                    },
                    comment: {
                        type: 'string',
                        description: 'Optional closing comment',
                    },
                    reason: {
                        type: 'string',
                        enum: ['completed', 'not_planned'],
                        description: 'Reason for closing (default: completed)',
                    },
                },
                required: ['number'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createIssueTriageTool(): ToolDefinition {
        return {
            name: 'github_issue_triage',
            description: 'Analyze and triage issues: detect sentiment, suggest labels, identify duplicates',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'Specific issue number to triage',
                    },
                    triageNew: {
                        type: 'boolean',
                        description: 'Triage all unlabeled issues (default: false)',
                    },
                },
            },
            category: 'github',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PR Management Tools
    // ═══════════════════════════════════════════════════════════════════════════════

    private createPRListTool(): ToolDefinition {
        return {
            name: 'github_pr_list',
            description: 'List pull requests in a repository',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    state: {
                        type: 'string',
                        enum: ['open', 'closed', 'merged', 'all'],
                        description: 'Filter by PR state (default: open)',
                    },
                    author: {
                        type: 'string',
                        description: 'Filter by author username',
                    },
                    baseBranch: {
                        type: 'string',
                        description: 'Filter by base branch',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of PRs to return (default: 30)',
                    },
                },
            },
            category: 'github',
        };
    }

    private createPRViewTool(): ToolDefinition {
        return {
            name: 'github_pr_view',
            description: 'View details of a specific pull request including diff stats and reviews',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'PR number',
                    },
                    includeDiff: {
                        type: 'boolean',
                        description: 'Include file diff summary (default: true)',
                    },
                    includeComments: {
                        type: 'boolean',
                        description: 'Include review comments (default: true)',
                    },
                },
                required: ['number'],
            },
            category: 'github',
        };
    }

    private createPRCreateTool(): ToolDefinition {
        return {
            name: 'github_pr_create',
            description: 'Create a new pull request. Can auto-fill title and body from commits.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    title: {
                        type: 'string',
                        description: 'PR title (optional if using --fill)',
                    },
                    body: {
                        type: 'string',
                        description: 'PR description (supports markdown)',
                    },
                    head: {
                        type: 'string',
                        description: 'Source branch (default: current branch)',
                    },
                    base: {
                        type: 'string',
                        description: 'Target branch (default: main)',
                    },
                    draft: {
                        type: 'boolean',
                        description: 'Create as draft PR (default: false)',
                    },
                    autoFill: {
                        type: 'boolean',
                        description: 'Auto-fill title and body from commits (default: false)',
                    },
                    labels: {
                        type: 'array',
                        items: { type: 'string', description: 'Label name' },
                        description: 'Labels to apply',
                    },
                    reviewers: {
                        type: 'array',
                        items: { type: 'string', description: 'Reviewer username' },
                        description: 'Reviewers to request',
                    },
                },
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createPRReviewTool(): ToolDefinition {
        return {
            name: 'github_pr_review',
            description: 'Submit a review on a pull request (approve, request changes, or comment)',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'PR number',
                    },
                    action: {
                        type: 'string',
                        enum: ['approve', 'request-changes', 'comment'],
                        description: 'Review action',
                    },
                    body: {
                        type: 'string',
                        description: 'Review comment body',
                    },
                },
                required: ['number', 'action'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createPRMergeTool(): ToolDefinition {
        return {
            name: 'github_pr_merge',
            description: 'Merge a pull request',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'PR number',
                    },
                    method: {
                        type: 'string',
                        enum: ['merge', 'squash', 'rebase'],
                        description: 'Merge method (default: merge)',
                    },
                    deleteBranch: {
                        type: 'boolean',
                        description: 'Delete head branch after merge (default: false)',
                    },
                },
                required: ['number'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createPRSummarizeTool(): ToolDefinition {
        return {
            name: 'github_pr_summarize',
            description: 'Generate an AI summary of a PR including changes, discussion, and status',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    number: {
                        type: 'number',
                        description: 'PR number',
                    },
                },
                required: ['number'],
            },
            category: 'github',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CI/CD Tools
    // ═══════════════════════════════════════════════════════════════════════════════

    private createWorkflowListTool(): ToolDefinition {
        return {
            name: 'github_workflow_list',
            description: 'List GitHub Actions workflows in a repository',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                },
            },
            category: 'github',
        };
    }

    private createWorkflowRunTool(): ToolDefinition {
        return {
            name: 'github_workflow_run',
            description: 'Trigger a GitHub Actions workflow',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    workflow: {
                        type: 'string',
                        description: 'Workflow file name (e.g., ci.yml) or ID',
                    },
                    branch: {
                        type: 'string',
                        description: 'Branch to run on (default: main)',
                    },
                    inputs: {
                        type: 'object',
                        description: 'Workflow inputs as key-value pairs',
                    },
                },
                required: ['workflow'],
            },
            category: 'github',
            requiresApproval: true,
        };
    }

    private createWorkflowStatusTool(): ToolDefinition {
        return {
            name: 'github_workflow_status',
            description: 'Get status of recent workflow runs',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    workflow: {
                        type: 'string',
                        description: 'Filter by workflow name or file',
                    },
                    branch: {
                        type: 'string',
                        description: 'Filter by branch',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum runs to show (default: 10)',
                    },
                },
            },
            category: 'github',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Activity Tracking Tools
    // ═══════════════════════════════════════════════════════════════════════════════

    private createCommitSearchTool(): ToolDefinition {
        return {
            name: 'github_commit_search',
            description: 'Search commits in a repository by author, message, or date range',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    author: {
                        type: 'string',
                        description: 'Filter by author username or email',
                    },
                    message: {
                        type: 'string',
                        description: 'Search in commit messages',
                    },
                    since: {
                        type: 'string',
                        description: 'Commits after this date (YYYY-MM-DD)',
                    },
                    until: {
                        type: 'string',
                        description: 'Commits before this date (YYYY-MM-DD)',
                    },
                    branch: {
                        type: 'string',
                        description: 'Branch to search (default: main)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum commits to return (default: 30)',
                    },
                },
            },
            category: 'github',
        };
    }

    private createActivityReportTool(): ToolDefinition {
        return {
            name: 'github_activity_report',
            description: 'Generate a daily or weekly activity report for a repository or team',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    period: {
                        type: 'string',
                        enum: ['day', 'week', 'month'],
                        description: 'Report period (default: week)',
                    },
                    includeStale: {
                        type: 'boolean',
                        description: 'Include stale branch analysis (default: true)',
                    },
                    team: {
                        type: 'array',
                        items: { type: 'string', description: 'Username' },
                        description: 'Filter to specific team members',
                    },
                },
            },
            category: 'github',
        };
    }

    private createBranchListTool(): ToolDefinition {
        return {
            name: 'github_branch_list',
            description: 'List branches in a repository with metadata',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                    showStale: {
                        type: 'boolean',
                        description: 'Highlight stale branches (no commits in 30+ days)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum branches to return (default: 30)',
                    },
                },
            },
            category: 'github',
        };
    }

    private createRepoInfoTool(): ToolDefinition {
        return {
            name: 'github_repo_info',
            description: 'Get detailed information about a repository',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository in owner/repo format',
                    },
                },
                required: ['repo'],
            },
            category: 'github',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Tool Execution
    // ═══════════════════════════════════════════════════════════════════════════════

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        switch (toolName) {
            // Issue Management
            case 'github_issue_list':
                return this.executeIssueList(args);
            case 'github_issue_create':
                return this.executeIssueCreate(args);
            case 'github_issue_view':
                return this.executeIssueView(args);
            case 'github_issue_label':
                return this.executeIssueLabel(args);
            case 'github_issue_close':
                return this.executeIssueClose(args);
            case 'github_issue_triage':
                return this.executeIssueTriage(args);

            // PR Management
            case 'github_pr_list':
                return this.executePRList(args);
            case 'github_pr_view':
                return this.executePRView(args);
            case 'github_pr_create':
                return this.executePRCreate(args);
            case 'github_pr_review':
                return this.executePRReview(args);
            case 'github_pr_merge':
                return this.executePRMerge(args);
            case 'github_pr_summarize':
                return this.executePRSummarize(args);

            // CI/CD
            case 'github_workflow_list':
                return this.executeWorkflowList(args);
            case 'github_workflow_run':
                return this.executeWorkflowRun(args);
            case 'github_workflow_status':
                return this.executeWorkflowStatus(args);

            // Activity Tracking
            case 'github_commit_search':
                return this.executeCommitSearch(args);
            case 'github_activity_report':
                return this.executeActivityReport(args);
            case 'github_branch_list':
                return this.executeBranchList(args);
            case 'github_repo_info':
                return this.executeRepoInfo(args);

            default:
                return this.createResult(`Unknown GitHub tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Issue Execution
    // ─────────────────────────────────────────────────────────────────────────────

    private async executeIssueList(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, state = 'open', labels, assignee, limit = 30 } = args as {
            repo?: string;
            state?: string;
            labels?: string[];
            assignee?: string;
            limit?: number;
        };

        const cmdArgs = ['issue', 'list', '--limit', String(limit)];

        if (state && state !== 'open') {
            cmdArgs.push('--state', state);
        }
        if (labels?.length) {
            cmdArgs.push('--label', labels.join(','));
        }
        if (assignee) {
            cmdArgs.push('--assignee', assignee);
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ issues: result.output, message: `Found issues (state: ${state})` });
    }

    private async executeIssueCreate(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, title, body, labels, assignees } = args as {
            repo?: string;
            title: string;
            body: string;
            labels?: string[];
            assignees?: string[];
        };

        const cmdArgs = ['issue', 'create', '--title', title, '--body', body];

        if (labels?.length) {
            cmdArgs.push('--label', labels.join(','));
        }
        if (assignees?.length) {
            cmdArgs.push('--assignee', assignees.join(','));
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        // Extract issue URL from output
        const urlMatch = result.output.match(/https:\/\/github\.com\/[^\s]+/);

        return this.createResult({ url: urlMatch?.[0], output: result.output, message: `Issue created: ${title}` });
    }

    private async executeIssueView(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, includeComments = true } = args as {
            repo?: string;
            number: number;
            includeComments?: boolean;
        };

        const cmdArgs = ['issue', 'view', String(number)];

        if (includeComments) {
            cmdArgs.push('--comments');
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ issue: result.output, message: `Issue #${number} details` });
    }

    private async executeIssueLabel(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, addLabels, removeLabels } = args as {
            repo?: string;
            number: number;
            addLabels?: string[];
            removeLabels?: string[];
        };

        const results: string[] = [];

        if (addLabels?.length) {
            const addResult = await this.executeGH(
                ['issue', 'edit', String(number), '--add-label', addLabels.join(',')],
                { repo }
            );
            results.push(addResult.success ? `Added: ${addLabels.join(', ')}` : `Failed to add: ${addResult.output}`);
        }

        if (removeLabels?.length) {
            const removeResult = await this.executeGH(
                ['issue', 'edit', String(number), '--remove-label', removeLabels.join(',')],
                { repo }
            );
            results.push(removeResult.success ? `Removed: ${removeLabels.join(', ')}` : `Failed to remove: ${removeResult.output}`);
        }

        return this.createResult({ results, message: `Issue #${number} labels updated` });
    }

    private async executeIssueClose(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, comment, reason = 'completed' } = args as {
            repo?: string;
            number: number;
            comment?: string;
            reason?: string;
        };

        // Add comment first if provided
        if (comment) {
            await this.executeGH(['issue', 'comment', String(number), '--body', comment], { repo });
        }

        const cmdArgs = ['issue', 'close', String(number), '--reason', reason];
        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ message: `Issue #${number} closed (${reason})` });
    }

    private async executeIssueTriage(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, triageNew } = args as {
            repo?: string;
            number?: number;
            triageNew?: boolean;
        };

        // Get issue(s) to triage
        let issues: string;

        if (number) {
            const result = await this.executeGH(['issue', 'view', String(number)], { repo });
            if (!result.success) {
                return this.createResult(result.output, true);
            }
            issues = result.output;
        } else if (triageNew) {
            // Get unlabeled issues
            const result = await this.executeGH(['issue', 'list', '--limit', '20'], { repo });
            if (!result.success) {
                return this.createResult(result.output, true);
            }
            issues = result.output;
        } else {
            return this.createResult('Specify either number or triageNew=true', true);
        }

        // Return issue data for AI analysis
        // The agent will use this to perform sentiment analysis and suggest labels
        return this.createResult({
            issues,
            triageInstructions: `
Analyze the issue(s) above and provide:
1. Sentiment: positive/neutral/negative
2. Suggested labels from: bug, enhancement, documentation, question, good-first-issue, help-wanted
3. Priority: low/medium/high/critical
4. Potential duplicates if any
5. Suggested assignee based on file paths or expertise areas
`,
            message: 'Issue data ready for triage analysis',
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PR Execution
    // ─────────────────────────────────────────────────────────────────────────────

    private async executePRList(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, state = 'open', author, baseBranch, limit = 30 } = args as {
            repo?: string;
            state?: string;
            author?: string;
            baseBranch?: string;
            limit?: number;
        };

        const cmdArgs = ['pr', 'list', '--limit', String(limit)];

        if (state && state !== 'open') {
            cmdArgs.push('--state', state);
        }
        if (author) {
            cmdArgs.push('--author', author);
        }
        if (baseBranch) {
            cmdArgs.push('--base', baseBranch);
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ pullRequests: result.output, message: `Found PRs (state: ${state})` });
    }

    private async executePRView(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, includeDiff = true, includeComments = true } = args as {
            repo?: string;
            number: number;
            includeDiff?: boolean;
            includeComments?: boolean;
        };

        // Get PR details
        const prResult = await this.executeGH(['pr', 'view', String(number)], { repo });
        if (!prResult.success) {
            return this.createResult(prResult.output, true);
        }

        let diffSummary = '';
        if (includeDiff) {
            const diffResult = await this.executeGH(['pr', 'diff', String(number), '--stat'], { repo });
            if (diffResult.success) {
                diffSummary = diffResult.output;
            }
        }

        let comments = '';
        if (includeComments) {
            const commentsResult = await this.executeGH(['pr', 'view', String(number), '--comments'], { repo });
            if (commentsResult.success) {
                comments = commentsResult.output;
            }
        }

        return this.createResult({
            pr: prResult.output,
            diffSummary,
            comments,
            message: `PR #${number} details`,
        });
    }

    private async executePRCreate(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, title, body, head, base, draft, autoFill, labels, reviewers } = args as {
            repo?: string;
            title?: string;
            body?: string;
            head?: string;
            base?: string;
            draft?: boolean;
            autoFill?: boolean;
            labels?: string[];
            reviewers?: string[];
        };

        const cmdArgs = ['pr', 'create'];

        if (autoFill) {
            cmdArgs.push('--fill');
        } else {
            if (title) cmdArgs.push('--title', title);
            if (body) cmdArgs.push('--body', body);
        }

        if (head) cmdArgs.push('--head', head);
        if (base) cmdArgs.push('--base', base);
        if (draft) cmdArgs.push('--draft');
        if (labels?.length) cmdArgs.push('--label', labels.join(','));
        if (reviewers?.length) cmdArgs.push('--reviewer', reviewers.join(','));

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        const urlMatch = result.output.match(/https:\/\/github\.com\/[^\s]+/);

        return this.createResult({ url: urlMatch?.[0], output: result.output, message: `PR created${draft ? ' (draft)' : ''}` });
    }

    private async executePRReview(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, action, body } = args as {
            repo?: string;
            number: number;
            action: 'approve' | 'request-changes' | 'comment';
            body?: string;
        };

        const cmdArgs = ['pr', 'review', String(number), `--${action}`];

        if (body) {
            cmdArgs.push('--body', body);
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ message: `PR #${number} reviewed (${action})` });
    }

    private async executePRMerge(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number, method = 'merge', deleteBranch } = args as {
            repo?: string;
            number: number;
            method?: string;
            deleteBranch?: boolean;
        };

        const cmdArgs = ['pr', 'merge', String(number), `--${method}`];

        if (deleteBranch) {
            cmdArgs.push('--delete-branch');
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ message: `PR #${number} merged (${method})` });
    }

    private async executePRSummarize(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, number } = args as { repo?: string; number: number };

        // Gather all PR data
        const prView = await this.executePRView({ repo, number, includeDiff: true, includeComments: true });

        // prView uses createResult which returns {toolCallId, result}
        // Extract the actual data from the result
        const prResult = prView.result as Record<string, unknown> | undefined;
        if (!prResult || typeof prResult === 'string') {
            return prView;
        }

        return this.createResult({
            ...prResult,
            summarizeInstructions: `
Summarize this PR:
1. What changes are being made (high-level)
2. Key files modified
3. Discussion summary (if any disagreements or blockers)
4. Merge readiness (checks, approvals, conflicts)
5. Recommended action
`,
            message: `PR #${number} data ready for summarization`,
        });
    }

    private async executeWorkflowList(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo } = args as { repo?: string };

        const result = await this.executeGH(['workflow', 'list'], { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ workflows: result.output, message: 'Available workflows' });
    }

    private async executeWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, workflow, branch = 'main', inputs } = args as {
            repo?: string;
            workflow: string;
            branch?: string;
            inputs?: Record<string, string>;
        };

        const cmdArgs = ['workflow', 'run', workflow, '--ref', branch];

        if (inputs) {
            for (const [key, value] of Object.entries(inputs)) {
                cmdArgs.push('-f', `${key}=${value}`);
            }
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ message: `Workflow "${workflow}" triggered on ${branch}` });
    }

    private async executeWorkflowStatus(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, workflow, branch, limit = 10 } = args as {
            repo?: string;
            workflow?: string;
            branch?: string;
            limit?: number;
        };

        const cmdArgs = ['run', 'list', '--limit', String(limit)];

        if (workflow) {
            cmdArgs.push('--workflow', workflow);
        }
        if (branch) {
            cmdArgs.push('--branch', branch);
        }

        const result = await this.executeGH(cmdArgs, { repo });

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ runs: result.output, message: 'Recent workflow runs' });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Activity Tracking Execution
    // ─────────────────────────────────────────────────────────────────────────────

    private async executeCommitSearch(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, author, message, since, until, branch = 'main', limit = 30 } = args as {
            repo?: string;
            author?: string;
            message?: string;
            since?: string;
            until?: string;
            branch?: string;
            limit?: number;
        };

        // Use git log for local, or API for remote
        const cmdArgs = ['api', `repos/${repo || ':owner/:repo'}/commits`];

        const params: string[] = [];
        if (author) params.push(`author=${author}`);
        if (since) params.push(`since=${since}T00:00:00Z`);
        if (until) params.push(`until=${until}T23:59:59Z`);
        if (branch) params.push(`sha=${branch}`);
        params.push(`per_page=${limit}`);

        if (params.length) {
            cmdArgs.push('-f', params.join('&'));
        }

        // Fallback to simpler approach
        const simpleArgs = ['search', 'commits'];
        let query = repo ? `repo:${repo}` : '';
        if (author) query += ` author:${author}`;
        if (message) query += ` "${message}"`;

        if (query.trim()) {
            simpleArgs.push(query.trim());
            simpleArgs.push('--limit', String(limit));
        }

        const result = await this.executeGH(simpleArgs, {});

        if (!result.success) {
            // Try local git log as fallback
            try {
                const gitArgs = ['log', '--oneline', `-n${limit}`];
                if (author) gitArgs.push(`--author=${author}`);
                if (since) gitArgs.push(`--since=${since}`);
                if (until) gitArgs.push(`--until=${until}`);
                if (message) gitArgs.push(`--grep=${message}`);

                const { stdout } = await execAsync(`git ${gitArgs.join(' ')}`, { cwd: this.cwd });
                return this.createResult({ commits: stdout, message: 'Commits from local git log' });
            } catch {
                return this.createResult(result.output, true);
            }
        }

        return this.createResult({ commits: result.output, message: 'Commit search results' });
    }

    private async executeActivityReport(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, period = 'week', includeStale = true, team } = args as {
            repo?: string;
            period?: 'day' | 'week' | 'month';
            includeStale?: boolean;
            team?: string[];
        };

        // Calculate date range
        const now = new Date();
        const since = new Date(now);
        switch (period) {
            case 'day':
                since.setDate(since.getDate() - 1);
                break;
            case 'week':
                since.setDate(since.getDate() - 7);
                break;
            case 'month':
                since.setMonth(since.getMonth() - 1);
                break;
        }
        const sinceStr = since.toISOString().split('T')[0];

        // Gather data
        const [prResult, issueResult, branchResult] = await Promise.all([
            this.executeGH(['pr', 'list', '--state', 'all', '--limit', '100'], { repo }),
            this.executeGH(['issue', 'list', '--state', 'all', '--limit', '100'], { repo }),
            includeStale ? this.executeGH(['api', 'repos/:owner/:repo/branches', '--paginate'], { repo }) : Promise.resolve({ success: true, output: '' }),
        ]);

        return this.createResult({
            period,
            since: sinceStr,
            pullRequests: prResult.output,
            issues: issueResult.output,
            branches: branchResult.output,
            team,
            reportInstructions: `
Generate an activity report including:
1. Summary statistics (PRs opened/merged/closed, issues opened/closed)
2. Top contributors by commit count
3. Notable changes or achievements
4. Stale branches (no activity in 30+ days)
5. Blockers or concerning trends
`,
            message: `Activity report data for last ${period}`,
        });
    }

    private async executeBranchList(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo, showStale, limit = 30 } = args as {
            repo?: string;
            showStale?: boolean;
            limit?: number;
        };

        // Try local git first
        try {
            const { stdout } = await execAsync('git branch -a --sort=-committerdate --format="%(refname:short) %(committerdate:relative)"', {
                cwd: this.cwd
            });

            const branches = stdout.trim().split('\n').slice(0, limit);

            let staleBranches: string[] = [];
            if (showStale) {
                staleBranches = branches.filter(b =>
                    b.includes('months ago') || b.includes('years ago')
                );
            }

            return this.createResult({
                branches,
                staleBranches,
                message: `Found ${branches.length} branches${showStale ? `, ${staleBranches.length} stale` : ''}`,
            });
        } catch {
            // Fall back to gh api
            const result = await this.executeGH(['api', 'repos/:owner/:repo/branches', '--paginate'], { repo });

            if (!result.success) {
                return this.createResult(result.output, true);
            }

            return this.createResult({ branches: result.output });
        }
    }

    private async executeRepoInfo(args: Record<string, unknown>): Promise<ToolResult> {
        const { repo } = args as { repo: string };

        const result = await this.executeGH(['repo', 'view', repo], {});

        if (!result.success) {
            return this.createResult(result.output, true);
        }

        return this.createResult({ repository: result.output, message: `Repository info for ${repo}` });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton & Factory
// ═══════════════════════════════════════════════════════════════════════════════

let githubSkillsInstance: GitHubSkills | null = null;

export function getGitHubSkills(): GitHubSkills {
    if (!githubSkillsInstance) {
        githubSkillsInstance = new GitHubSkills();
    }
    return githubSkillsInstance;
}

export function createGitHubSkills(options: { defaultRepo?: string; cwd?: string } = {}): GitHubSkills {
    return new GitHubSkills(options);
}

export function resetGitHubSkills(): void {
    githubSkillsInstance = null;
}
