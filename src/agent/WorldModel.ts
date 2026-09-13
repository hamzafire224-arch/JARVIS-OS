/**
 * JARVIS World Model (AGI Feature 5D — Tier 2 Upgrade)
 *
 * Maintains a live understanding of the user's operational state:
 * - Active Projects and code branch health
 * - Upcoming Calendar Events
 * - Communication queues (Emails to respond to)
 * - File system changes (Tier 2: via FileSystemWatcher)
 * 
 * Tier 2 Upgrade: Proactive assessment loop that runs in the background
 * and surfaces actionable suggestions without user prompting.
 */

import { logger } from '../utils/logger.js';
import { getMemoryManager } from '../memory/MemoryManager.js';
import { getCalendarSkills } from '../skills/CalendarSkills.js';
import { getEmailSkills } from '../skills/EmailSkills.js';
import { FileSystemWatcher, type WatcherEvent } from './FileSystemWatcher.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorldState {
    timestamp: string;
    upcomingDeadlines: number;
    unreadHighPriorityEmails: number;
    failingProjects: string[];
    alerts: string[];
    fileSystemEvents: WatcherEvent[];  // Tier 2: Recent FS events
}

export interface ProactiveAlert {
    id: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    message: string;           // Human-readable suggestion
    actionSuggestion: string;  // What JARVIS proposes to do
    source: 'calendar' | 'email' | 'project' | 'filesystem' | 'general';
    timestamp: Date;
    dismissed: boolean;
}

export type AlertCallback = (alert: ProactiveAlert) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// World Model
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldModel {
    private lastState: WorldState | null = null;
    private proactiveTimer: NodeJS.Timeout | null = null;
    private fileWatcher: FileSystemWatcher | null = null;
    private alertCallbacks: AlertCallback[] = [];
    private pendingAlerts: ProactiveAlert[] = [];
    private recentFSEvents: WatcherEvent[] = [];
    private alertIdCounter = 0;
    
    /**
     * Re-evaluates the entire known "World" state by aggregating local
     * skill providers and memory contexts.
     */
    async assessEnvironment(): Promise<WorldState> {
        logger.debug('Assessing World Model State...');
        const alerts: string[] = [];

        // 1. Assess Calendar Deadlines (Next 24 hours)
        let upcomingDeadlines = 0;
        try {
            const calendar = getCalendarSkills();
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            const eventsRes = await calendar.execute('list_events', { 
                from: now.toISOString(), 
                to: tomorrow.toISOString(),
                limit: 10
            });

            if (eventsRes.result && typeof eventsRes.result === 'object' && 'events' in eventsRes.result) {
                const events = (eventsRes.result as any).events;
                upcomingDeadlines = events.length;
                if (upcomingDeadlines > 0) {
                    alerts.push(`You have ${upcomingDeadlines} calendar events in the next 24 hours.`);
                }
            }
        } catch (e) {
            logger.warn('WorldModel: Failed to assess calendar', { error: String(e) });
        }

        // 2. Assess Emails (Simulated or Real depending on tokens)
        let unreadHighPriorityEmails = 0;
        if (process.env['GMAIL_ACCESS_TOKEN'] || process.env['MS_GRAPH_ACCESS_TOKEN']) {
            try {
                const email = getEmailSkills();
                // Simple inbox check
                const inboxRes = await email.execute('read_email_inbox', { 
                    provider: process.env['MS_GRAPH_ACCESS_TOKEN'] ? 'microsoft' : 'gmail',
                    limit: 5 
                });
                if (inboxRes.result && typeof inboxRes.result === 'object' && 'emails' in inboxRes.result) {
                    const emails = (inboxRes.result as any).emails;
                    unreadHighPriorityEmails = emails.length;
                    if (unreadHighPriorityEmails > 0) {
                        alerts.push(`You have ${unreadHighPriorityEmails} recent emails that may need attention.`);
                    }
                }
            } catch (e) {
                logger.warn('WorldModel: Failed to assess emails', { error: String(e) });
            }
        }

        // 3. Assess Projects from Memory Context
        const failingProjects: string[] = [];
        try {
            const memory = getMemoryManager();
            const projects = await memory.getByType('project');
            for (const p of projects) {
                // If a project memory mentions "failing" or "bug", surface it
                if (p.content.toLowerCase().includes('failing') || p.content.toLowerCase().includes('bug')) {
                    failingProjects.push(p.tags[0] ?? 'Unknown Project');
                }
            }
            if (failingProjects.length > 0) {
                alerts.push(`Active bugs detected in projects: ${failingProjects.join(', ')}`);
            }
        } catch (e) {
            logger.warn('WorldModel: Failed to assess projects', { error: String(e) });
        }

        this.lastState = {
            timestamp: new Date().toISOString(),
            upcomingDeadlines,
            unreadHighPriorityEmails,
            failingProjects,
            alerts,
            fileSystemEvents: [...this.recentFSEvents],
        };

        if (alerts.length > 0) {
            logger.info('WorldModel assessed critical alerts', { alerts });
        }

        return this.lastState;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // Tier 2: Proactive Loop
    // ═════════════════════════════════════════════════════════════════════════════

    /**
     * Start the proactive assessment loop.
     * Periodically checks the environment and emits alerts.
     */
    startProactiveLoop(intervalMs: number = 60_000, workspaceDir?: string): void {
        if (this.proactiveTimer) {
            logger.warn('WorldModel: Proactive loop already running');
            return;
        }

        // Start file system watcher if workspace provided
        if (workspaceDir) {
            this.fileWatcher = new FileSystemWatcher({ watchDir: workspaceDir });
            this.fileWatcher.on('watch_event', (event: WatcherEvent) => {
                this.handleFileSystemEvent(event);
            });
            this.fileWatcher.start().catch(err => {
                logger.warn('WorldModel: Failed to start file watcher', { error: String(err) });
            });
        }

        // Run assessment loop
        this.proactiveTimer = setInterval(async () => {
            try {
                await this.assessEnvironment();
                this.evaluateAndAlert();
            } catch (err) {
                logger.warn('WorldModel: Proactive assessment failed', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }, intervalMs);

        // Run first assessment immediately
        this.assessEnvironment()
            .then(() => this.evaluateAndAlert())
            .catch(() => { /* initial assessment failure is non-fatal */ });

        logger.info('[WORLD-MODEL] Proactive loop started', { intervalMs, workspaceDir });
    }

    /**
     * Stop the proactive loop and file watcher
     */
    stopProactiveLoop(): void {
        if (this.proactiveTimer) {
            clearInterval(this.proactiveTimer);
            this.proactiveTimer = null;
        }
        if (this.fileWatcher) {
            this.fileWatcher.stop();
            this.fileWatcher = null;
        }
        this.recentFSEvents = [];
        logger.info('[WORLD-MODEL] Proactive loop stopped');
    }

    /**
     * Register a callback for proactive alerts.
     * Used by REPL/Gateway to display suggestions to the user.
     */
    onAlert(callback: AlertCallback): () => void {
        this.alertCallbacks.push(callback);
        return () => {
            this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Handle incoming file system events from the watcher
     */
    private handleFileSystemEvent(event: WatcherEvent): void {
        // Keep only last 20 events
        this.recentFSEvents.push(event);
        if (this.recentFSEvents.length > 20) {
            this.recentFSEvents = this.recentFSEvents.slice(-20);
        }

        // Emit proactive alerts for critical events
        if (event.severity === 'critical' || event.severity === 'warning') {
            const alertMessage = this.buildAlertFromFSEvent(event);
            if (alertMessage) {
                this.emitAlert(alertMessage);
            }
        }
    }

    /**
     * Build a proactive alert from a file system event
     */
    private buildAlertFromFSEvent(event: WatcherEvent): ProactiveAlert | null {
        switch (event.type) {
            case 'test_failure_detected':
                return this.createAlert(
                    'high',
                    `🧪 I noticed a test failure in ${event.path} — want me to investigate?`,
                    `Analyze the test file ${event.path} and suggest fixes for the failing tests.`,
                    'filesystem'
                );
            case 'build_error_detected':
                return this.createAlert(
                    'critical',
                    `🔧 Build error detected in ${event.path} — I can help fix this.`,
                    `Read ${event.path}, identify the compilation error, and propose a fix.`,
                    'filesystem'
                );
            case 'rapid_changes':
                return this.createAlert(
                    'medium',
                    `💡 You've been making a lot of changes to ${event.path} — need help with something?`,
                    `Analyze recent changes to ${event.path} and offer assistance.`,
                    'filesystem'
                );
            case 'new_error_pattern':
                return this.createAlert(
                    'high',
                    `⚠️ New error pattern detected in ${event.path}: ${event.details}`,
                    `Investigate the error in ${event.path} and suggest a resolution.`,
                    'filesystem'
                );
            default:
                return null;
        }
    }

    /**
     * Evaluate current state and emit alerts if thresholds are exceeded
     */
    private evaluateAndAlert(): void {
        if (!this.lastState) return;

        // Calendar alerts
        if (this.lastState.upcomingDeadlines > 3) {
            this.emitAlert(this.createAlert(
                'high',
                `📅 You have ${this.lastState.upcomingDeadlines} events coming up — want me to summarize your schedule?`,
                'List and summarize all upcoming calendar events.',
                'calendar'
            ));
        }

        // Email alerts
        if (this.lastState.unreadHighPriorityEmails > 0) {
            this.emitAlert(this.createAlert(
                'medium',
                `📧 ${this.lastState.unreadHighPriorityEmails} emails may need your attention — want a summary?`,
                'Summarize unread high-priority emails.',
                'email'
            ));
        }

        // Project health alerts
        if (this.lastState.failingProjects.length > 0) {
            this.emitAlert(this.createAlert(
                'high',
                `🐛 Active bugs in: ${this.lastState.failingProjects.join(', ')} — want me to look into them?`,
                `Investigate bugs in projects: ${this.lastState.failingProjects.join(', ')}`,
                'project'
            ));
        }
    }

    /**
     * Create a ProactiveAlert
     */
    private createAlert(
        urgency: ProactiveAlert['urgency'],
        message: string,
        actionSuggestion: string,
        source: ProactiveAlert['source']
    ): ProactiveAlert {
        return {
            id: `alert-${++this.alertIdCounter}`,
            urgency,
            message,
            actionSuggestion,
            source,
            timestamp: new Date(),
            dismissed: false,
        };
    }

    /**
     * Emit an alert to all registered callbacks
     */
    private emitAlert(alert: ProactiveAlert): void {
        this.pendingAlerts.push(alert);

        for (const cb of this.alertCallbacks) {
            try { cb(alert); } catch { /* callback errors don't propagate */ }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // Public API
    // ═════════════════════════════════════════════════════════════════════════════

    /**
     * Determines if JARVIS should interject proactively
     */
    shouldTriggerProactiveIntervention(): boolean {
        if (!this.lastState) return false;
        return this.lastState.alerts.length > 0 || this.recentFSEvents.some(e => e.severity === 'critical');
    }

    getLastState(): WorldState | null {
        return this.lastState;
    }

    getPendingAlerts(): ProactiveAlert[] {
        return this.pendingAlerts.filter(a => !a.dismissed);
    }

    dismissAlert(alertId: string): void {
        const alert = this.pendingAlerts.find(a => a.id === alertId);
        if (alert) alert.dismissed = true;
    }

    get isProactiveLoopRunning(): boolean {
        return this.proactiveTimer !== null;
    }
}

// Singleton
let worldModelInstance: WorldModel | null = null;
export function getWorldModel(): WorldModel {
    if (!worldModelInstance) {
        worldModelInstance = new WorldModel();
    }
    return worldModelInstance;
}

export function resetWorldModel(): void {
    if (worldModelInstance) {
        worldModelInstance.stopProactiveLoop();
    }
    worldModelInstance = null;
}
