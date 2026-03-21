/**
 * JARVIS World Model (AGI Feature 5D)
 *
 * Maintains a live understanding of the user's operational state:
 * - Active Projects and code branch health
 * - Upcoming Calendar Events
 * - Communication queues (Emails to respond to)
 * 
 * Provides proactive evaluation hooks that can trigger JARVIS
 * to act without explicit user prompting.
 */

import { logger } from '../utils/logger.js';
import { getMemoryManager } from '../memory/MemoryManager.js';
import { getCalendarSkills } from '../skills/CalendarSkills.js';
import { getEmailSkills } from '../skills/EmailSkills.js';

export interface WorldState {
    timestamp: string;
    upcomingDeadlines: number;
    unreadHighPriorityEmails: number;
    failingProjects: string[];
    alerts: string[];
}

export class WorldModel {
    private lastState: WorldState | null = null;
    
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
            alerts
        };

        if (alerts.length > 0) {
            logger.info('WorldModel assessed critical alerts', { alerts });
        }

        return this.lastState;
    }

    /**
     * Determines if JARVIS should interject proactively
     */
    shouldTriggerProactiveIntervention(): boolean {
        if (!this.lastState) return false;
        // Trigger if there are any immediate alerts
        return this.lastState.alerts.length > 0;
    }

    getLastState(): WorldState | null {
        return this.lastState;
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
