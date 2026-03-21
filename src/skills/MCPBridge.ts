/**
 * JARVIS MCP (Model Context Protocol) Bridge
 *
 * Connects to MCP-compatible tool servers and dynamically registers
 * their tools as JARVIS skills. Supports stdio and HTTP transports.
 *
 * MCP lets JARVIS instantly access hundreds of community-built tool servers
 * (GitHub, Slack, databases, file systems, APIs, etc.) without custom code.
 *
 * Configuration via mcp.json:
 * {
 *   "servers": [
 *     { "name": "github", "transport": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
 *     { "name": "filesystem", "transport": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }
 *   ]
 * }
 */

import { spawn, type ChildProcess } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ToolDefinition, ToolResult, ToolParameter } from '../agent/types.js';
import { MultiToolSkill } from './Skill.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MCPServerConfig {
    /** Unique server name */
    name: string;
    /** Transport type */
    transport: 'stdio' | 'http';
    /** Command to launch (stdio) or URL (http) */
    command?: string;
    /** Command arguments (stdio) */
    args?: string[];
    /** HTTP endpoint (http transport) */
    url?: string;
    /** Environment variables for the server */
    env?: Record<string, string>;
    /** Auto-connect on startup */
    autoConnect?: boolean;
}

export interface MCPConfig {
    servers: MCPServerConfig[];
}

interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties?: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
        }>;
        required?: string[];
    };
}

interface MCPResponse {
    jsonrpc: '2.0';
    id: number;
    result?: {
        tools?: MCPTool[];
        content?: Array<{ type: string; text?: string }>;
        [key: string]: unknown;
    };
    error?: { code: number; message: string };
}

interface MCPConnection {
    config: MCPServerConfig;
    process?: ChildProcess;
    tools: MCPTool[];
    nextId: number;
    pending: Map<number, {
        resolve: (value: MCPResponse) => void;
        reject: (error: Error) => void;
    }>;
    buffer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Bridge
// ═══════════════════════════════════════════════════════════════════════════════

export class MCPBridge extends MultiToolSkill {
    private connections: Map<string, MCPConnection> = new Map();
    private toolMap: Map<string, { serverName: string; mcpToolName: string }> = new Map();

    constructor() {
        super({
            name: 'mcp_bridge',
            description: 'Connect to MCP tool servers and use their tools',
            version: '1.0.0',
            category: 'system',
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Load MCP config and connect to servers
     */
    async initialize(configPath?: string): Promise<void> {
        const path = configPath ?? join(process.cwd(), 'mcp.json');

        let config: MCPConfig;
        try {
            const raw = await readFile(path, 'utf-8');
            config = JSON.parse(raw) as MCPConfig;
        } catch {
            logger.debug('No mcp.json found, MCP bridge inactive');
            return;
        }

        logger.info('MCP Bridge loading', { servers: config.servers.length });

        for (const serverConfig of config.servers) {
            if (serverConfig.autoConnect !== false) {
                try {
                    await this.connect(serverConfig);
                } catch (err) {
                    logger.warn(`Failed to connect to MCP server ${serverConfig.name}: ${err}`);
                }
            }
        }
    }

    /**
     * Connect to an MCP server via stdio
     */
    async connect(config: MCPServerConfig): Promise<MCPTool[]> {
        if (config.transport === 'http') {
            return this.connectHTTP(config);
        }

        if (!config.command) {
            throw new Error(`MCP server ${config.name} requires a command for stdio transport`);
        }

        logger.info('Connecting to MCP server', { name: config.name, command: config.command });

        const conn: MCPConnection = {
            config,
            tools: [],
            nextId: 1,
            pending: new Map(),
            buffer: '',
        };

        // Spawn the MCP server process
        const child = spawn(config.command, config.args ?? [], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ...config.env },
        });

        conn.process = child;

        // Handle stdout — parse JSON-RPC messages
        child.stdout!.on('data', (data: Buffer) => {
            conn.buffer += data.toString();
            this.processBuffer(conn);
        });

        child.stderr!.on('data', (data: Buffer) => {
            logger.debug(`MCP ${config.name} stderr: ${data.toString().trim()}`);
        });

        child.on('exit', (code) => {
            logger.info(`MCP server ${config.name} exited`, { code });
            this.connections.delete(config.name);
        });

        this.connections.set(config.name, conn);

        // Initialize the MCP protocol
        await this.sendRequest(conn, 'initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'jarvis', version: '1.0.0' },
        });

        // Send initialized notification
        this.sendNotification(conn, 'notifications/initialized', {});

        // Discover tools
        const toolsResponse = await this.sendRequest(conn, 'tools/list', {});
        conn.tools = toolsResponse.result?.tools ?? [];

        // Register tools in our map
        for (const tool of conn.tools) {
            const jarvisName = `mcp_${config.name}_${tool.name}`;
            this.toolMap.set(jarvisName, {
                serverName: config.name,
                mcpToolName: tool.name,
            });
        }

        logger.info(`MCP server ${config.name} connected`, { tools: conn.tools.length });
        return conn.tools;
    }

    /**
     * Connect to an MCP server via HTTP/SSE
     */
    private async connectHTTP(config: MCPServerConfig): Promise<MCPTool[]> {
        if (!config.url) {
            throw new Error(`MCP server ${config.name} requires a URL for HTTP transport`);
        }

        const conn: MCPConnection = {
            config,
            tools: [],
            nextId: 1,
            pending: new Map(),
            buffer: '',
        };

        this.connections.set(config.name, conn);

        // Initialize via HTTP
        const initResponse = await fetch(`${config.url}/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: conn.nextId++,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'jarvis', version: '1.0.0' },
                },
            }),
        });

        if (!initResponse.ok) {
            throw new Error(`HTTP MCP init failed: ${initResponse.status}`);
        }

        // List tools
        const toolsResponse = await fetch(`${config.url}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: conn.nextId++,
                method: 'tools/list',
                params: {},
            }),
        });

        const toolsData = await toolsResponse.json() as MCPResponse;
        conn.tools = toolsData.result?.tools ?? [];

        for (const tool of conn.tools) {
            const jarvisName = `mcp_${config.name}_${tool.name}`;
            this.toolMap.set(jarvisName, {
                serverName: config.name,
                mcpToolName: tool.name,
            });
        }

        logger.info(`MCP HTTP server ${config.name} connected`, { tools: conn.tools.length });
        return conn.tools;
    }

    /**
     * Disconnect from a server
     */
    disconnect(serverName: string): void {
        const conn = this.connections.get(serverName);
        if (conn?.process) {
            conn.process.kill();
        }
        this.connections.delete(serverName);

        // Remove tools from map
        for (const [key, value] of this.toolMap) {
            if (value.serverName === serverName) {
                this.toolMap.delete(key);
            }
        }
    }

    /**
     * Disconnect all servers
     */
    disconnectAll(): void {
        for (const name of this.connections.keys()) {
            this.disconnect(name);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MultiToolSkill Implementation
    // ─────────────────────────────────────────────────────────────────────────────

    getTools(): ToolDefinition[] {
        const tools: ToolDefinition[] = [];

        for (const [jarvisName, mapping] of this.toolMap) {
            const conn = this.connections.get(mapping.serverName);
            const mcpTool = conn?.tools.find(t => t.name === mapping.mcpToolName);

            if (mcpTool) {
                const properties: Record<string, ToolParameter> = {};
                if (mcpTool.inputSchema.properties) {
                    for (const [key, schema] of Object.entries(mcpTool.inputSchema.properties)) {
                        properties[key] = {
                            type: schema.type as ToolParameter['type'],
                            description: schema.description ?? key,
                        };
                    }
                }

                tools.push({
                    name: jarvisName,
                    description: `[MCP:${mapping.serverName}] ${mcpTool.description}`,
                    parameters: {
                        type: 'object',
                        properties,
                        required: mcpTool.inputSchema.required ?? [],
                    },
                });
            }
        }

        return tools;
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        const mapping = this.toolMap.get(toolName);
        if (!mapping) {
            return this.createResult(`Unknown MCP tool: ${toolName}`, true);
        }

        const conn = this.connections.get(mapping.serverName);
        if (!conn) {
            return this.createResult(`MCP server ${mapping.serverName} not connected`, true);
        }

        try {
            logger.tool(toolName, 'Calling MCP tool', { server: mapping.serverName, tool: mapping.mcpToolName });

            const response = await this.callTool(conn, mapping.mcpToolName, args);

            // Extract text content from MCP response
            const content = response.result?.content;
            if (Array.isArray(content)) {
                const textParts = content
                    .filter(c => c.type === 'text' && c.text)
                    .map(c => c.text);
                return this.createResult({ output: textParts.join('\n') });
            }

            return this.createResult(response.result ?? { output: 'Tool executed successfully' });
        } catch (err) {
            return this.createResult(`MCP tool error: ${err instanceof Error ? err.message : err}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * List connected servers and their tool counts
     */
    getServerStatus(): Array<{ name: string; transport: string; toolCount: number; connected: boolean }> {
        return Array.from(this.connections.entries()).map(([name, conn]) => ({
            name,
            transport: conn.config.transport,
            toolCount: conn.tools.length,
            connected: conn.config.transport === 'stdio' ? !conn.process?.killed : true,
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JSON-RPC Transport
    // ─────────────────────────────────────────────────────────────────────────────

    private async callTool(conn: MCPConnection, toolName: string, args: Record<string, unknown>): Promise<MCPResponse> {
        return this.sendRequest(conn, 'tools/call', {
            name: toolName,
            arguments: args,
        });
    }

    private sendRequest(conn: MCPConnection, method: string, params: Record<string, unknown>): Promise<MCPResponse> {
        return new Promise((resolve, reject) => {
            const id = conn.nextId++;

            conn.pending.set(id, { resolve, reject });

            const message = JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params,
            }) + '\n';

            if (conn.config.transport === 'stdio' && conn.process?.stdin) {
                conn.process.stdin.write(message);
            } else {
                reject(new Error('No transport available'));
            }

            // Timeout after 30 seconds
            setTimeout(() => {
                if (conn.pending.has(id)) {
                    conn.pending.delete(id);
                    reject(new Error(`MCP request timed out: ${method}`));
                }
            }, 30_000);
        });
    }

    private sendNotification(conn: MCPConnection, method: string, params: Record<string, unknown>): void {
        const message = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
        }) + '\n';

        if (conn.config.transport === 'stdio' && conn.process?.stdin) {
            conn.process.stdin.write(message);
        }
    }

    private processBuffer(conn: MCPConnection): void {
        const lines = conn.buffer.split('\n');
        conn.buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                const msg = JSON.parse(trimmed) as MCPResponse;

                if (msg.id !== undefined) {
                    const pending = conn.pending.get(msg.id);
                    if (pending) {
                        conn.pending.delete(msg.id);
                        if (msg.error) {
                            pending.reject(new Error(msg.error.message));
                        } else {
                            pending.resolve(msg);
                        }
                    }
                }
            } catch {
                logger.debug(`MCP ${conn.config.name}: unparseable line: ${trimmed.slice(0, 100)}`);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton & Config Loader
// ═══════════════════════════════════════════════════════════════════════════════

let mcpBridge: MCPBridge | null = null;

export function getMCPBridge(): MCPBridge {
    if (!mcpBridge) {
        mcpBridge = new MCPBridge();
    }
    return mcpBridge;
}

export async function initializeMCPBridge(configPath?: string): Promise<MCPBridge> {
    const bridge = getMCPBridge();
    await bridge.initialize(configPath);
    return bridge;
}

export function resetMCPBridge(): void {
    if (mcpBridge) {
        mcpBridge.disconnectAll();
    }
    mcpBridge = null;
}
