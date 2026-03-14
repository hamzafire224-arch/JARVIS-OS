/**
 * JARVIS Filesystem Skills
 * 
 * Skills for interacting with the local filesystem:
 * - Reading files and directories
 * - Writing and modifying files
 * - Searching for content
 */

import { readFile, writeFile, access, mkdir, readdir, stat, rm } from 'fs/promises';
import { join, dirname, resolve, relative, basename, extname } from 'path';
import { constants } from 'fs';
import { Skill, type SkillExecutionContext } from './Skill.js';
import type { ToolDefinition } from '../agent/types.js';
import { ToolExecutionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Read File Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class ReadFileSkill extends Skill {
    readonly name = 'read_file';
    readonly category = 'filesystem' as const;
    readonly description = 'Read the contents of a file from the filesystem';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Absolute path to the file to read',
                    },
                    startLine: {
                        type: 'number',
                        description: 'Optional start line (1-indexed)',
                    },
                    endLine: {
                        type: 'number',
                        description: 'Optional end line (1-indexed, inclusive)',
                    },
                    encoding: {
                        type: 'string',
                        description: 'File encoding (default: utf-8)',
                    },
                },
                required: ['path'],
            },
            category: 'filesystem',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        content: string;
        path: string;
        lineCount: number;
        startLine?: number;
        endLine?: number;
    }> {
        this.validateArgs(args, ['path']);

        const path = this.resolvePath(args['path'] as string, context.workspaceDir);
        const startLine = args['startLine'] as number | undefined;
        const endLine = args['endLine'] as number | undefined;
        const encoding = (args['encoding'] as BufferEncoding) || 'utf-8';

        return this.safeExecute(async () => {
            // Check file exists
            await access(path, constants.R_OK);

            // Read file
            const rawContent = await readFile(path, { encoding });
            const lines = rawContent.split('\n');
            const totalLines = lines.length;

            // Apply line range if specified
            let content: string;
            let actualStart: number | undefined;
            let actualEnd: number | undefined;

            if (startLine !== undefined || endLine !== undefined) {
                const start = Math.max(1, startLine ?? 1);
                const end = Math.min(totalLines, endLine ?? totalLines);
                actualStart = start;
                actualEnd = end;

                content = lines.slice(start - 1, end).join('\n');
            } else {
                content = rawContent;
            }

            logger.tool(this.name, 'File read', {
                path,
                totalLines,
                contentLength: content.length,
            });

            return {
                content,
                path,
                lineCount: totalLines,
                startLine: actualStart,
                endLine: actualEnd,
            };
        }, 'read_file');
    }

    private resolvePath(filePath: string, workspaceDir?: string): string {
        if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/i)) {
            return filePath; // Already absolute
        }
        if (workspaceDir) {
            return join(workspaceDir, filePath);
        }
        return resolve(filePath);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Write File Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class WriteFileSkill extends Skill {
    readonly name = 'write_file';
    readonly category = 'filesystem' as const;
    readonly description = 'Write content to a file, creating it if it does not exist';
    readonly version = '1.0.0';
    readonly dangerous = true; // Requires approval

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Absolute path to the file to write',
                    },
                    content: {
                        type: 'string',
                        description: 'Content to write to the file',
                    },
                    createDirs: {
                        type: 'boolean',
                        description: 'Create parent directories if they do not exist (default: true)',
                    },
                    append: {
                        type: 'boolean',
                        description: 'Append to existing file instead of overwriting',
                    },
                },
                required: ['path', 'content'],
            },
            category: 'filesystem',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        success: boolean;
        path: string;
        bytesWritten: number;
        created: boolean;
    }> {
        this.validateArgs(args, ['path', 'content']);

        const path = this.resolvePath(args['path'] as string, context.workspaceDir);
        const content = args['content'] as string;
        const createDirs = args['createDirs'] !== false; // Default true
        const append = args['append'] === true;

        return this.safeExecute(async () => {
            // Check if file exists
            let existed = false;
            try {
                await access(path, constants.F_OK);
                existed = true;
            } catch {
                existed = false;
            }

            // Create parent directories if needed
            if (createDirs) {
                const dir = dirname(path);
                await mkdir(dir, { recursive: true });
            }

            // Write file
            if (append && existed) {
                const existing = await readFile(path, 'utf-8');
                await writeFile(path, existing + content, 'utf-8');
            } else {
                await writeFile(path, content, 'utf-8');
            }

            logger.tool(this.name, 'File written', {
                path,
                bytesWritten: content.length,
                created: !existed,
            });

            return {
                success: true,
                path,
                bytesWritten: content.length,
                created: !existed,
            };
        }, 'write_file');
    }

    private resolvePath(filePath: string, workspaceDir?: string): string {
        if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/i)) {
            return filePath;
        }
        if (workspaceDir) {
            return join(workspaceDir, filePath);
        }
        return resolve(filePath);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// List Directory Skill
// ═══════════════════════════════════════════════════════════════════════════════

export interface DirectoryEntry {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    extension?: string;
}

export class ListDirectorySkill extends Skill {
    readonly name = 'list_directory';
    readonly category = 'filesystem' as const;
    readonly description = 'List contents of a directory';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to the directory to list',
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'List recursively (default: false)',
                    },
                    maxDepth: {
                        type: 'number',
                        description: 'Maximum recursion depth (default: 3)',
                    },
                    pattern: {
                        type: 'string',
                        description: 'Filter by file pattern (glob-like, e.g., "*.ts")',
                    },
                    includeHidden: {
                        type: 'boolean',
                        description: 'Include hidden files (default: false)',
                    },
                },
                required: ['path'],
            },
            category: 'filesystem',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        entries: DirectoryEntry[];
        path: string;
        totalFiles: number;
        totalDirectories: number;
    }> {
        this.validateArgs(args, ['path']);

        const dirPath = this.resolvePath(args['path'] as string, context.workspaceDir);
        const recursive = args['recursive'] === true;
        const maxDepth = (args['maxDepth'] as number) ?? 3;
        const pattern = args['pattern'] as string | undefined;
        const includeHidden = args['includeHidden'] === true;

        return this.safeExecute(async () => {
            const entries = await this.listDir(dirPath, {
                recursive,
                maxDepth,
                currentDepth: 0,
                pattern,
                includeHidden,
                basePath: dirPath,
            });

            const totalFiles = entries.filter(e => e.type === 'file').length;
            const totalDirectories = entries.filter(e => e.type === 'directory').length;

            logger.tool(this.name, 'Directory listed', {
                path: dirPath,
                totalFiles,
                totalDirectories,
            });

            return {
                entries,
                path: dirPath,
                totalFiles,
                totalDirectories,
            };
        }, 'list_directory');
    }

    private async listDir(
        dirPath: string,
        options: {
            recursive: boolean;
            maxDepth: number;
            currentDepth: number;
            pattern?: string;
            includeHidden: boolean;
            basePath: string;
        }
    ): Promise<DirectoryEntry[]> {
        const entries: DirectoryEntry[] = [];
        const items = await readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            // Skip hidden files unless requested
            if (!options.includeHidden && item.name.startsWith('.')) {
                continue;
            }

            const fullPath = join(dirPath, item.name);
            const relativePath = relative(options.basePath, fullPath);

            if (item.isDirectory()) {
                entries.push({
                    name: item.name,
                    path: relativePath,
                    type: 'directory',
                });

                // Recurse if needed
                if (options.recursive && options.currentDepth < options.maxDepth) {
                    const subEntries = await this.listDir(fullPath, {
                        ...options,
                        currentDepth: options.currentDepth + 1,
                    });
                    entries.push(...subEntries);
                }
            } else if (item.isFile()) {
                // Apply pattern filter
                if (options.pattern && !this.matchPattern(item.name, options.pattern)) {
                    continue;
                }

                const fileStat = await stat(fullPath);
                entries.push({
                    name: item.name,
                    path: relativePath,
                    type: 'file',
                    size: fileStat.size,
                    extension: extname(item.name),
                });
            }
        }

        return entries;
    }

    private matchPattern(filename: string, pattern: string): boolean {
        // Simple glob matching (*.ts, *.js, etc.)
        const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regex}$`, 'i').test(filename);
    }

    private resolvePath(filePath: string, workspaceDir?: string): string {
        if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/i)) {
            return filePath;
        }
        if (workspaceDir) {
            return join(workspaceDir, filePath);
        }
        return resolve(filePath);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Search Files Skill
// ═══════════════════════════════════════════════════════════════════════════════

export interface SearchMatch {
    file: string;
    line: number;
    column: number;
    content: string;
    match: string;
}

export class SearchFilesSkill extends Skill {
    readonly name = 'search_files';
    readonly category = 'filesystem' as const;
    readonly description = 'Search for text patterns in files';
    readonly version = '1.0.0';
    readonly dangerous = false;

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search pattern (supports regex)',
                    },
                    path: {
                        type: 'string',
                        description: 'Directory to search in',
                    },
                    filePattern: {
                        type: 'string',
                        description: 'File pattern to match (e.g., "*.ts")',
                    },
                    caseSensitive: {
                        type: 'boolean',
                        description: 'Case sensitive search (default: false)',
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results (default: 50)',
                    },
                    contextLines: {
                        type: 'number',
                        description: 'Lines of context around matches (default: 0)',
                    },
                },
                required: ['query'],
            },
            category: 'filesystem',
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        matches: SearchMatch[];
        totalMatches: number;
        filesSearched: number;
        truncated: boolean;
    }> {
        this.validateArgs(args, ['query']);

        const query = args['query'] as string;
        const searchPath = this.resolvePath(
            (args['path'] as string) ?? context.workspaceDir ?? '.',
            context.workspaceDir
        );
        const filePattern = args['filePattern'] as string | undefined;
        const caseSensitive = args['caseSensitive'] === true;
        const maxResults = (args['maxResults'] as number) ?? 50;

        return this.safeExecute(async () => {
            const matches: SearchMatch[] = [];
            let filesSearched = 0;
            let truncated = false;

            // Build regex
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(query, flags);

            // Get files to search
            const files = await this.getFiles(searchPath, filePattern);

            for (const file of files) {
                if (matches.length >= maxResults) {
                    truncated = true;
                    break;
                }

                try {
                    const content = await readFile(file, 'utf-8');
                    const lines = content.split('\n');

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line === undefined) continue;

                        let match;
                        while ((match = regex.exec(line)) !== null) {
                            if (matches.length >= maxResults) {
                                truncated = true;
                                break;
                            }

                            matches.push({
                                file: relative(searchPath, file),
                                line: i + 1,
                                column: match.index + 1,
                                content: line.trim(),
                                match: match[0],
                            });
                        }
                    }

                    filesSearched++;
                } catch {
                    // Skip files that can't be read
                }
            }

            logger.tool(this.name, 'Search complete', {
                query,
                matches: matches.length,
                filesSearched,
                truncated,
            });

            return {
                matches,
                totalMatches: matches.length,
                filesSearched,
                truncated,
            };
        }, 'search_files');
    }

    private async getFiles(dirPath: string, pattern?: string): Promise<string[]> {
        const files: string[] = [];

        const listDir = async (path: string): Promise<void> => {
            try {
                const items = await readdir(path, { withFileTypes: true });

                for (const item of items) {
                    // Skip hidden and common ignore directories
                    if (item.name.startsWith('.') ||
                        item.name === 'node_modules' ||
                        item.name === 'dist' ||
                        item.name === '__pycache__') {
                        continue;
                    }

                    const fullPath = join(path, item.name);

                    if (item.isDirectory()) {
                        await listDir(fullPath);
                    } else if (item.isFile()) {
                        if (!pattern || this.matchPattern(item.name, pattern)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch {
                // Skip directories that can't be read
            }
        };

        await listDir(dirPath);
        return files;
    }

    private matchPattern(filename: string, pattern: string): boolean {
        const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regex}$`, 'i').test(filename);
    }

    private resolvePath(filePath: string, workspaceDir?: string): string {
        if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/i)) {
            return filePath;
        }
        if (workspaceDir) {
            return join(workspaceDir, filePath);
        }
        return resolve(filePath);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Delete File Skill
// ═══════════════════════════════════════════════════════════════════════════════

export class DeleteFileSkill extends Skill {
    readonly name = 'delete_file';
    readonly category = 'filesystem' as const;
    readonly description = 'Delete a file or directory';
    readonly version = '1.0.0';
    readonly dangerous = true; // Definitely requires approval

    getToolDefinition(): ToolDefinition {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to the file or directory to delete',
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'Delete directories recursively (required for non-empty dirs)',
                    },
                },
                required: ['path'],
            },
            category: 'filesystem',
            dangerous: true,
        };
    }

    async execute(
        args: Record<string, unknown>,
        context: SkillExecutionContext
    ): Promise<{
        success: boolean;
        path: string;
        type: 'file' | 'directory';
    }> {
        this.validateArgs(args, ['path']);

        const path = this.resolvePath(args['path'] as string, context.workspaceDir);
        const recursive = args['recursive'] === true;

        return this.safeExecute(async () => {
            // Check what we're deleting
            const stats = await stat(path);
            const type = stats.isDirectory() ? 'directory' : 'file';

            await rm(path, { recursive, force: false });

            logger.tool(this.name, 'File deleted', { path, type });

            return {
                success: true,
                path,
                type,
            };
        }, 'delete_file');
    }

    private resolvePath(filePath: string, workspaceDir?: string): string {
        if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/i)) {
            return filePath;
        }
        if (workspaceDir) {
            return join(workspaceDir, filePath);
        }
        return resolve(filePath);
    }
}
