/**
 * JARVIS Terminal Skills
 * 
 * Skills for executing shell commands in the terminal.
 * Implements safety limits and output streaming.
 */

import { spawn, type ChildProcess } from 'child_process';
import { Skill, type SkillExecutionContext } from './Skill.js';
import type { ToolDefinition } from '../agent/types.js';
import { ToolExecutionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Run Command Skill
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    killed: boolean;
    command: string;
    cwd: string;
    durationMs: number;
}

export class RunCommandSkill extends Skill {
    readonly name = 'run_command';
    readonly category = 'terminal' as const;
    readonly description = 'Execute a shell command in the terminal';
    readonly version = '1.0.0';
    readonly dangerous = true; // Always requires approval

    private readonly defaultTimeout = 30000; // 30 seconds
    private readonly maxTimeout = 300000; // 5 minutes
    private readonly maxOutputSize = 100000; // 100KB

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The command to execute',
                    },
                    cwd: {
                        type: 'string',
                        description: 'Working directory for the command',
                    },
                    timeout: {
                        type: 'number',
                        description: `Timeout in milliseconds (default: ${this.defaultTimeout}, max: ${this.maxTimeout})`,
                    },
                    shell: {
                        type: 'string',
                        description: 'Shell to use (default: system shell)',
                    },
                    env: {
                        type: 'object',
                        description: 'Additional environment variables',
                    },
                },
                required: ['command'],
            },
            category: 'terminal',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<CommandResult> {
        this.validateArgs(args, ['command']);

        const command = args['command'] as string;
        const cwd = (args['cwd'] as string) ?? context.workspaceDir ?? process.cwd();
        const timeout = Math.min(
            (args['timeout'] as number) ?? this.defaultTimeout,
            this.maxTimeout
        );
        const shell = (args['shell'] as string) ?? true;
        const additionalEnv = (args['env'] as Record<string, string>) ?? {};

        return this.safeExecute(async () => {
            const startTime = Date.now();

            logger.tool(this.name, 'Executing command', { command, cwd, timeout });

            const result = await this.runWithTimeout(command, {
                cwd,
                timeout,
                shell,
                env: { ...process.env, ...additionalEnv },
            });

            const durationMs = Date.now() - startTime;

            logger.tool(this.name, 'Command completed', {
                exitCode: result.exitCode,
                durationMs,
                timedOut: result.timedOut,
            });

            return {
                ...result,
                command,
                cwd,
                durationMs,
            };
        }, 'run_command');
    }

    private runWithTimeout(
        command: string,
        options: {
            cwd: string;
            timeout: number;
            shell: boolean | string;
            env: Record<string, string | undefined>;
        }
    ): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
        timedOut: boolean;
        killed: boolean;
    }> {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let killed = false;

            // Use platform-appropriate shell
            const isWindows = process.platform === 'win32';
            const shellOption = typeof options.shell === 'string'
                ? options.shell
                : (isWindows ? 'cmd.exe' : '/bin/sh');

            const shellArgs = isWindows ? ['/c', command] : ['-c', command];

            const child = spawn(shellOption, shellArgs, {
                cwd: options.cwd,
                env: options.env as NodeJS.ProcessEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            // Timeout handler
            const timeoutId = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');

                // Force kill if still running after 5 seconds
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 5000);
            }, options.timeout);

            // Collect output with size limits
            child.stdout?.on('data', (data: Buffer) => {
                if (stdout.length < this.maxOutputSize) {
                    stdout += data.toString();
                    if (stdout.length > this.maxOutputSize) {
                        stdout = stdout.slice(0, this.maxOutputSize) + '\n... [output truncated]';
                    }
                }
            });

            child.stderr?.on('data', (data: Buffer) => {
                if (stderr.length < this.maxOutputSize) {
                    stderr += data.toString();
                    if (stderr.length > this.maxOutputSize) {
                        stderr = stderr.slice(0, this.maxOutputSize) + '\n... [output truncated]';
                    }
                }
            });

            child.on('close', (code, signal) => {
                clearTimeout(timeoutId);
                killed = signal !== null;

                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code ?? (timedOut ? 124 : 1),
                    timedOut,
                    killed,
                });
            });

            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(new ToolExecutionError(this.name, error.message, error));
            });
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Read Command Output Skill (for long-running commands)
// ═══════════════════════════════════════════════════════════════════════════════

// Store for background processes
const backgroundProcesses: Map<string, {
    process: ChildProcess;
    stdout: string;
    stderr: string;
    startTime: number;
    complete: boolean;
    exitCode?: number;
}> = new Map();

export class StartBackgroundCommandSkill extends Skill {
    readonly name = 'start_background_command';
    readonly category = 'terminal' as const;
    readonly description = 'Start a long-running command in the background';
    readonly version = '1.0.0';
    readonly dangerous = true;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The command to execute',
                    },
                    cwd: {
                        type: 'string',
                        description: 'Working directory for the command',
                    },
                    name: {
                        type: 'string',
                        description: 'Name to identify this process',
                    },
                },
                required: ['command'],
            },
            category: 'terminal',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        processId: string;
        name: string;
        started: boolean;
    }> {
        this.validateArgs(args, ['command']);

        const command = args['command'] as string;
        const cwd = (args['cwd'] as string) ?? context.workspaceDir ?? process.cwd();
        const name = (args['name'] as string) ?? `process-${Date.now()}`;

        return this.safeExecute(async () => {
            const processId = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const isWindows = process.platform === 'win32';
            const shellOption = isWindows ? 'cmd.exe' : '/bin/sh';
            const shellArgs = isWindows ? ['/c', command] : ['-c', command];

            const child = spawn(shellOption, shellArgs, {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
            });

            const processInfo = {
                process: child,
                stdout: '',
                stderr: '',
                startTime: Date.now(),
                complete: false,
                exitCode: undefined as number | undefined,
            };

            child.stdout?.on('data', (data: Buffer) => {
                processInfo.stdout += data.toString();
                // Keep only last 50KB
                if (processInfo.stdout.length > 50000) {
                    processInfo.stdout = processInfo.stdout.slice(-50000);
                }
            });

            child.stderr?.on('data', (data: Buffer) => {
                processInfo.stderr += data.toString();
                if (processInfo.stderr.length > 50000) {
                    processInfo.stderr = processInfo.stderr.slice(-50000);
                }
            });

            child.on('close', (code) => {
                processInfo.complete = true;
                processInfo.exitCode = code ?? 1;
            });

            backgroundProcesses.set(processId, processInfo);

            logger.tool(this.name, 'Background process started', { processId, name, command });

            return {
                processId,
                name,
                started: true,
            };
        }, 'start_background_command');
    }
}

export class CheckBackgroundCommandSkill extends Skill {
    readonly name = 'check_background_command';
    readonly category = 'terminal' as const;
    readonly description = 'Check the status and output of a background command';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    processId: {
                        type: 'string',
                        description: 'The process ID returned by start_background_command',
                    },
                    tailLines: {
                        type: 'number',
                        description: 'Number of output lines to return (default: 50)',
                    },
                },
                required: ['processId'],
            },
            category: 'terminal',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        status: 'running' | 'complete' | 'not_found';
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        runningMs?: number;
    }> {
        this.validateArgs(args, ['processId']);

        const processId = args['processId'] as string;
        const tailLines = (args['tailLines'] as number) ?? 50;

        const processInfo = backgroundProcesses.get(processId);

        if (!processInfo) {
            return { status: 'not_found' };
        }

        const tailOutput = (output: string): string => {
            const lines = output.split('\n');
            return lines.slice(-tailLines).join('\n');
        };

        return {
            status: processInfo.complete ? 'complete' : 'running',
            stdout: tailOutput(processInfo.stdout),
            stderr: tailOutput(processInfo.stderr),
            exitCode: processInfo.exitCode,
            runningMs: Date.now() - processInfo.startTime,
        };
    }
}

export class StopBackgroundCommandSkill extends Skill {
    readonly name = 'stop_background_command';
    readonly category = 'terminal' as const;
    readonly description = 'Stop a running background command';
    readonly version = '1.0.0';
    readonly dangerous = true;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    processId: {
                        type: 'string',
                        description: 'The process ID to stop',
                    },
                    force: {
                        type: 'boolean',
                        description: 'Force kill (SIGKILL) instead of graceful (SIGTERM)',
                    },
                },
                required: ['processId'],
            },
            category: 'terminal',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        stopped: boolean;
        notFound?: boolean;
    }> {
        this.validateArgs(args, ['processId']);

        const processId = args['processId'] as string;
        const force = args['force'] === true;

        const processInfo = backgroundProcesses.get(processId);

        if (!processInfo) {
            return { stopped: false, notFound: true };
        }

        if (processInfo.complete) {
            backgroundProcesses.delete(processId);
            return { stopped: true };
        }

        processInfo.process.kill(force ? 'SIGKILL' : 'SIGTERM');

        // Wait briefly for process to exit
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!processInfo.process.killed) {
            processInfo.process.kill('SIGKILL');
        }

        backgroundProcesses.delete(processId);

        logger.tool(this.name, 'Background process stopped', { processId, force });

        return { stopped: true };
    }
}
