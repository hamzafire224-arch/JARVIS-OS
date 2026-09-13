/**
 * JARVIS MCP Connector Gallery (Tier 3 AGI Upgrade)
 * 
 * Registry of known MCP-compatible servers with their connection configs.
 * Enables user-friendly commands like "/connect notion" instead of
 * manually editing mcp.json.
 * 
 * Features:
 * - Built-in gallery of popular MCP servers
 * - Fuzzy search for connectors by name or category
 * - Auto-discovery of installed @modelcontextprotocol/server-* packages
 * - Default configs with sensible defaults
 */

import { logger } from '../utils/logger.js';
import type { MCPServerConfig } from './MCPBridge.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Connector Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface MCPConnectorEntry {
    name: string;                   // Display name
    id: string;                     // Unique ID for /connect commands
    description: string;
    category: 'code' | 'productivity' | 'database' | 'cloud' | 'communication' | 'filesystem' | 'custom';
    npmPackage: string;             // @modelcontextprotocol/server-*
    defaultConfig: Omit<MCPServerConfig, 'name'>;
    requiredEnvVars?: string[];     // Env vars needed for this connector
    setupInstructions?: string;     // Help text for users
}

// Built-in gallery of popular MCP servers
const GALLERY: MCPConnectorEntry[] = [
    {
        name: 'GitHub',
        id: 'github',
        description: 'Access GitHub repositories, issues, pull requests, and more',
        category: 'code',
        npmPackage: '@modelcontextprotocol/server-github',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
        },
        requiredEnvVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
        setupInstructions: 'Set GITHUB_PERSONAL_ACCESS_TOKEN in your .env file',
    },
    {
        name: 'Filesystem',
        id: 'filesystem',
        description: 'Safe, sandboxed access to the local file system',
        category: 'filesystem',
        npmPackage: '@modelcontextprotocol/server-filesystem',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
        },
    },
    {
        name: 'PostgreSQL',
        id: 'postgres',
        description: 'Query and manage PostgreSQL databases',
        category: 'database',
        npmPackage: '@modelcontextprotocol/server-postgres',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres'],
        },
        requiredEnvVars: ['DATABASE_URL'],
        setupInstructions: 'Set DATABASE_URL in your .env (e.g., postgresql://user:pass@localhost:5432/db)',
    },
    {
        name: 'SQLite',
        id: 'sqlite',
        description: 'Query and manage SQLite databases',
        category: 'database',
        npmPackage: '@modelcontextprotocol/server-sqlite',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sqlite'],
        },
    },
    {
        name: 'Slack',
        id: 'slack',
        description: 'Send messages, read channels, manage Slack workspace',
        category: 'communication',
        npmPackage: '@modelcontextprotocol/server-slack',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-slack'],
        },
        requiredEnvVars: ['SLACK_BOT_TOKEN'],
        setupInstructions: 'Set SLACK_BOT_TOKEN from your Slack app settings',
    },
    {
        name: 'Google Drive',
        id: 'gdrive',
        description: 'Search and read files from Google Drive',
        category: 'productivity',
        npmPackage: '@modelcontextprotocol/server-gdrive',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-gdrive'],
        },
        requiredEnvVars: ['GOOGLE_APPLICATION_CREDENTIALS'],
    },
    {
        name: 'Notion',
        id: 'notion',
        description: 'Read and manage Notion pages, databases, and blocks',
        category: 'productivity',
        npmPackage: '@modelcontextprotocol/server-notion',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-notion'],
        },
        requiredEnvVars: ['NOTION_API_KEY'],
        setupInstructions: 'Set NOTION_API_KEY from your Notion integration settings',
    },
    {
        name: 'Brave Search',
        id: 'brave-search',
        description: 'Web search via Brave Search API',
        category: 'productivity',
        npmPackage: '@modelcontextprotocol/server-brave-search',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
        },
        requiredEnvVars: ['BRAVE_API_KEY'],
    },
    {
        name: 'Puppeteer',
        id: 'puppeteer',
        description: 'Browser automation — navigate, screenshot, interact with web pages',
        category: 'code',
        npmPackage: '@modelcontextprotocol/server-puppeteer',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-puppeteer'],
        },
    },
    {
        name: 'Memory',
        id: 'memory',
        description: 'Knowledge graph-based persistent memory',
        category: 'productivity',
        npmPackage: '@modelcontextprotocol/server-memory',
        defaultConfig: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Connector Gallery
// ═══════════════════════════════════════════════════════════════════════════════

export class MCPConnectorGallery {

    /**
     * Search gallery by name, description, or category
     */
    search(query: string): MCPConnectorEntry[] {
        const q = query.toLowerCase();
        return GALLERY.filter(entry =>
            entry.name.toLowerCase().includes(q) ||
            entry.id.toLowerCase().includes(q) ||
            entry.description.toLowerCase().includes(q) ||
            entry.category.toLowerCase().includes(q)
        );
    }

    /**
     * Get a connector by its ID
     */
    getById(id: string): MCPConnectorEntry | undefined {
        return GALLERY.find(e => e.id === id.toLowerCase());
    }

    /**
     * Get the MCPServerConfig for a connector, ready to use with MCPBridge
     */
    getConnectionConfig(id: string): MCPServerConfig | null {
        const entry = this.getById(id);
        if (!entry) return null;

        // Check required env vars
        if (entry.requiredEnvVars) {
            const missing = entry.requiredEnvVars.filter(v => !process.env[v]);
            if (missing.length > 0) {
                logger.warn(`[MCP-GALLERY] Missing env vars for ${entry.name}`, { missing });
            }
        }

        return {
            name: entry.id,
            ...entry.defaultConfig,
            env: entry.requiredEnvVars?.reduce((acc, v) => {
                if (process.env[v]) acc[v] = process.env[v]!;
                return acc;
            }, {} as Record<string, string>),
        };
    }

    /**
     * List all available connectors
     */
    listAll(): MCPConnectorEntry[] {
        return [...GALLERY];
    }

    /**
     * List connectors by category
     */
    listByCategory(category: string): MCPConnectorEntry[] {
        return GALLERY.filter(e => e.category === category);
    }

    /**
     * Auto-discover installed MCP server packages
     */
    async discoverInstalled(): Promise<string[]> {
        const installed: string[] = [];

        for (const entry of GALLERY) {
            try {
                // Check if the package is resolvable
                await import(entry.npmPackage).catch(() => null);
                installed.push(entry.id);
            } catch {
                // Not installed — that's fine
            }
        }

        return installed;
    }

    /**
     * Get a human-readable summary of the gallery
     */
    getSummary(): string {
        const lines = ['Available MCP Connectors:', ''];

        const byCategory = new Map<string, MCPConnectorEntry[]>();
        for (const entry of GALLERY) {
            const cat = byCategory.get(entry.category) ?? [];
            cat.push(entry);
            byCategory.set(entry.category, cat);
        }

        for (const [category, entries] of byCategory) {
            lines.push(`  ${category.toUpperCase()}:`);
            for (const entry of entries) {
                const envNote = entry.requiredEnvVars
                    ? ` (needs: ${entry.requiredEnvVars.join(', ')})`
                    : '';
                lines.push(`    • ${entry.id} — ${entry.description}${envNote}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: MCPConnectorGallery | null = null;

export function getMCPConnectorGallery(): MCPConnectorGallery {
    if (!instance) {
        instance = new MCPConnectorGallery();
    }
    return instance;
}
