/**
 * JARVIS File System Watcher (Tier 2 AGI Upgrade)
 * 
 * Monitors the workspace for changes and detects patterns:
 * - Repeated build/test failures
 * - File modifications that might break things
 * - New error patterns in log files
 * 
 * Uses Node.js fs.watch (zero external deps) with debouncing.
 * Emits events that the WorldModel consumes for proactive suggestions.
 */

import { watch, type FSWatcher } from 'fs';
import { promises as fs } from 'fs';
import { join, extname, basename, relative } from 'path';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type WatcherEventType =
    | 'file_changed'
    | 'test_failure_detected'
    | 'build_error_detected'
    | 'new_error_pattern'
    | 'rapid_changes';    // Lots of saves in short time = user is struggling

export interface WatcherEvent {
    type: WatcherEventType;
    path: string;
    timestamp: Date;
    details: string;
    severity: 'info' | 'warning' | 'critical';
}

export interface FileSystemWatcherConfig {
    watchDir: string;
    debounceMs?: number;         // Debounce interval (default: 1000ms)
    maxRecentChanges?: number;   // Rapid change threshold (default: 10)
    rapidChangeWindowMs?: number; // Window for rapid change detection (default: 30000ms)
    watchExtensions?: string[];  // File extensions to watch (default: common dev files)
    ignorePatterns?: string[];   // Dirs/files to ignore
}

// ═══════════════════════════════════════════════════════════════════════════════
// Error Pattern Detection
// ═══════════════════════════════════════════════════════════════════════════════

const ERROR_PATTERNS = [
    // Build errors
    { pattern: /error TS\d+/i, type: 'build_error_detected' as const, severity: 'critical' as const, desc: 'TypeScript compilation error' },
    { pattern: /SyntaxError/i, type: 'build_error_detected' as const, severity: 'critical' as const, desc: 'Syntax error detected' },
    { pattern: /Module not found/i, type: 'build_error_detected' as const, severity: 'critical' as const, desc: 'Missing module/dependency' },
    { pattern: /Cannot find module/i, type: 'build_error_detected' as const, severity: 'critical' as const, desc: 'Missing module import' },
    // Test failures
    { pattern: /FAIL|failed|✕|✗/i, type: 'test_failure_detected' as const, severity: 'warning' as const, desc: 'Test failure detected' },
    { pattern: /AssertionError/i, type: 'test_failure_detected' as const, severity: 'warning' as const, desc: 'Assertion failure' },
    { pattern: /Expected .+ but received/i, type: 'test_failure_detected' as const, severity: 'warning' as const, desc: 'Test expectation mismatch' },
    // Runtime errors
    { pattern: /Unhandled.*rejection/i, type: 'new_error_pattern' as const, severity: 'critical' as const, desc: 'Unhandled promise rejection' },
    { pattern: /ENOENT/i, type: 'new_error_pattern' as const, severity: 'warning' as const, desc: 'File not found error' },
    { pattern: /EACCES/i, type: 'new_error_pattern' as const, severity: 'warning' as const, desc: 'Permission denied' },
];

const DEFAULT_WATCH_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.py', '.rs', '.go'];
const DEFAULT_IGNORE_PATTERNS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];

// ═══════════════════════════════════════════════════════════════════════════════
// File System Watcher
// ═══════════════════════════════════════════════════════════════════════════════

export class FileSystemWatcher extends EventEmitter {
    private config: Required<FileSystemWatcherConfig>;
    private watcher: FSWatcher | null = null;
    private recentChanges: { path: string; time: number }[] = [];
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private isRunning = false;

    constructor(config: FileSystemWatcherConfig) {
        super();
        this.config = {
            watchDir: config.watchDir,
            debounceMs: config.debounceMs ?? 1000,
            maxRecentChanges: config.maxRecentChanges ?? 10,
            rapidChangeWindowMs: config.rapidChangeWindowMs ?? 30000,
            watchExtensions: config.watchExtensions ?? DEFAULT_WATCH_EXTENSIONS,
            ignorePatterns: config.ignorePatterns ?? DEFAULT_IGNORE_PATTERNS,
        };
    }

    /**
     * Start watching the workspace directory
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

        try {
            // Verify directory exists
            await fs.access(this.config.watchDir);

            this.watcher = watch(
                this.config.watchDir,
                { recursive: true },
                (eventType, filename) => {
                    if (filename) {
                        this.handleFileEvent(eventType, filename);
                    }
                }
            );

            this.watcher.on('error', (err) => {
                logger.warn('[FS-WATCHER] Watcher error', { error: err.message });
            });

            this.isRunning = true;
            logger.info('[FS-WATCHER] Started watching workspace', {
                dir: this.config.watchDir,
                extensions: this.config.watchExtensions,
            });
        } catch (err) {
            logger.warn('[FS-WATCHER] Failed to start', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    /**
     * Stop watching
     */
    stop(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        // Clear all debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        this.recentChanges = [];
        this.isRunning = false;

        logger.info('[FS-WATCHER] Stopped');
    }

    /**
     * Handle a file system event with debouncing
     */
    private handleFileEvent(eventType: string, filename: string): void {
        // Check if file should be ignored
        if (this.shouldIgnore(filename)) return;

        // Check extension
        const ext = extname(filename);
        if (ext && !this.config.watchExtensions.includes(ext)) return;

        // Debounce: don't fire for the same file within debounceMs
        const existing = this.debounceTimers.get(filename);
        if (existing) {
            clearTimeout(existing);
        }

        this.debounceTimers.set(filename, setTimeout(() => {
            this.debounceTimers.delete(filename);
            this.processFileChange(filename);
        }, this.config.debounceMs));
    }

    /**
     * Process a debounced file change
     */
    private async processFileChange(filename: string): Promise<void> {
        const now = Date.now();
        const fullPath = join(this.config.watchDir, filename);

        // Track for rapid change detection
        this.recentChanges.push({ path: filename, time: now });
        this.recentChanges = this.recentChanges.filter(
            c => now - c.time < this.config.rapidChangeWindowMs
        );

        // Emit basic file change event
        const changeEvent: WatcherEvent = {
            type: 'file_changed',
            path: filename,
            timestamp: new Date(),
            details: `File modified: ${filename}`,
            severity: 'info',
        };
        this.emit('watch_event', changeEvent);

        // Check for rapid changes (user struggling)
        if (this.recentChanges.length >= this.config.maxRecentChanges) {
            const rapidEvent: WatcherEvent = {
                type: 'rapid_changes',
                path: filename,
                timestamp: new Date(),
                details: `${this.recentChanges.length} changes in ${this.config.rapidChangeWindowMs / 1000}s — you might be working on a tricky problem`,
                severity: 'warning',
            };
            this.emit('watch_event', rapidEvent);
            // Reset counter
            this.recentChanges = [];
        }

        // Try to read file and scan for error patterns
        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            this.scanForErrors(filename, content);
        } catch {
            // File might have been deleted — that's fine
        }
    }

    /**
     * Scan file content for error patterns
     */
    private scanForErrors(filename: string, content: string): void {
        // Only scan certain files (logs, test output, etc.)
        const name = basename(filename).toLowerCase();
        const isLogOrOutput = name.includes('log') || name.includes('output') || name.includes('error');
        const isTestFile = name.includes('.test.') || name.includes('.spec.');

        // For non-log/test files, only scan if the content is small (likely error output)
        if (!isLogOrOutput && !isTestFile && content.length > 10000) return;

        for (const { pattern, type, severity, desc } of ERROR_PATTERNS) {
            if (pattern.test(content)) {
                const errorEvent: WatcherEvent = {
                    type,
                    path: filename,
                    timestamp: new Date(),
                    details: `${desc} in ${filename}`,
                    severity,
                };
                this.emit('watch_event', errorEvent);
                break; // One error per file change to avoid spam
            }
        }
    }

    /**
     * Check if a file path should be ignored
     */
    private shouldIgnore(filename: string): boolean {
        for (const pattern of this.config.ignorePatterns) {
            if (filename.includes(pattern)) return true;
        }
        return false;
    }

    get running(): boolean {
        return this.isRunning;
    }
}
