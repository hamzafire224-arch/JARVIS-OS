/**
 * JARVIS Email Skills
 *
 * Provides real email integration (Gmail & Microsoft 365).
 * Uses robust OAuth2 token authentication via environment bounds.
 */

import { MultiToolSkill } from './Skill.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { logger } from '../utils/logger.js';

export class EmailSkills extends MultiToolSkill {
    constructor() {
        super({
            name: 'EmailSkills',
            description: 'Read, send, and search emails from connected accounts',
            version: '1.0.0',
            category: 'personal',
        });
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'read_email_inbox',
                description: 'Fetches the recent emails from the inbox',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Number of emails to fetch (default: 10)' },
                        provider: { type: 'string', description: 'Provider to use: "gmail" or "microsoft"' },
                    },
                    required: ['provider'],
                },
                category: 'personal',
            },
            {
                name: 'send_email',
                description: 'Sends an email to a specified address',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'Recipient email address' },
                        subject: { type: 'string', description: 'Email subject line' },
                        body: { type: 'string', description: 'Email body content (text/plain)' },
                        provider: { type: 'string', description: 'Provider to use: "gmail" or "microsoft"' },
                    },
                    required: ['to', 'subject', 'body', 'provider'],
                },
                category: 'personal',
                dangerous: true,
            },
        ];
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        const provider = args['provider'] as string;
        
        if (provider !== 'gmail' && provider !== 'microsoft') {
            return this.createResult('Provider must be "gmail" or "microsoft"', true);
        }

        try {
            switch (toolName) {
                case 'read_email_inbox':
                    return await this.readInbox(provider, (args['limit'] as number) || 10);
                case 'send_email':
                    return await this.sendEmail(
                        provider,
                        args['to'] as string,
                        args['subject'] as string,
                        args['body'] as string
                    );
                default:
                    return this.createResult(`Unknown tool: ${toolName}`, true);
            }
        } catch (err) {
            return this.createResult(`Email operation failed: ${err instanceof Error ? err.message : String(err)}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Operations
    // ─────────────────────────────────────────────────────────────────────────────

    private async readInbox(provider: 'gmail' | 'microsoft', limit: number): Promise<ToolResult> {
        logger.tool('read_email_inbox', 'Fetching inbox', { provider, limit });

        if (provider === 'microsoft') {
            const token = process.env['MS_GRAPH_ACCESS_TOKEN'];
            if (!token) throw new Error('MS_GRAPH_ACCESS_TOKEN is required in env variables');

            const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Microsoft Graph API error: ${res.status} ${await res.text()}`);

            const data = await res.json() as any;
            return this.createResult({ emails: data.value });
        } else {
            const token = process.env['GMAIL_ACCESS_TOKEN'];
            if (!token) throw new Error('GMAIL_ACCESS_TOKEN is required in env variables');

            // Fetches thread list simply for demonstration. Real Gmail requires fetching threads -> then message data.
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Gmail API error: ${res.status} ${await res.text()}`);

            const data = await res.json() as any;
            return this.createResult({ emails: data.messages || [] });
        }
    }

    private async sendEmail(provider: 'gmail' | 'microsoft', to: string, subject: string, body: string): Promise<ToolResult> {
        logger.tool('send_email', 'Sending mail', { provider, to });

        if (provider === 'microsoft') {
            const token = process.env['MS_GRAPH_ACCESS_TOKEN'];
            if (!token) throw new Error('MS_GRAPH_ACCESS_TOKEN is required in env variables');

            const payload = {
                message: {
                    subject,
                    body: { contentType: 'Text', content: body },
                    toRecipients: [{ emailAddress: { address: to } }]
                },
                saveToSentItems: 'true'
            };

            const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`Microsoft Graph API error: ${res.status} ${await res.text()}`);
            return this.createResult({ message: 'Email sent successfully via Microsoft Graph' });
            
        } else {
            const token = process.env['GMAIL_ACCESS_TOKEN'];
            if (!token) throw new Error('GMAIL_ACCESS_TOKEN is required in env variables');

            // Construct simple RFC 2822 email payload and base64url encode it
            const rawMessage = [
                `To: ${to}`,
                `Subject: ${subject}`,
                '',
                body
            ].join('\n');
            const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encodedMessage })
            });

            if (!res.ok) throw new Error(`Gmail API error: ${res.status} ${await res.text()}`);
            return this.createResult({ message: 'Email sent successfully via Gmail API' });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let emailInstance: EmailSkills | null = null;

export function getEmailSkills(): EmailSkills {
    if (!emailInstance) {
        emailInstance = new EmailSkills();
    }
    return emailInstance;
}

export function resetEmailSkills(): void {
    emailInstance = null;
}
