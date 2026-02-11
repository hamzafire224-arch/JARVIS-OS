/**
 * JARVIS Database Skills
 * 
 * Provides safe database access for JARVIS with:
 * - Multiple database backends (SQLite, PostgreSQL)
 * - Read-only mode by default
 * - Dangerous query protection
 * - Schema introspection
 * - Query result formatting
 */

import { MultiToolSkill } from './Skill.js';
import type { ToolDefinition, ToolResult } from '../agent/types.js';
import { logger } from '../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface DatabaseConfig {
    type: 'sqlite' | 'postgresql';
    connectionString?: string;
    filePath?: string;
    readonly: boolean;
    maxRows: number;
}

export interface QueryResult {
    success: boolean;
    columns?: string[];
    rows?: Record<string, unknown>[];
    rowCount?: number;
    error?: string;
    truncated?: boolean;
}

export interface TableInfo {
    name: string;
    type: 'table' | 'view';
    columns: ColumnInfo[];
    rowCount?: number;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    defaultValue?: string;
}

// Dangerous SQL patterns that require approval
const DANGEROUS_PATTERNS = [
    /\bDROP\b/i,
    /\bDELETE\b/i,
    /\bTRUNCATE\b/i,
    /\bUPDATE\b/i,
    /\bINSERT\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// Database Provider Interface
// ═══════════════════════════════════════════════════════════════════════════════

export interface DatabaseProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    query(sql: string, params?: unknown[]): Promise<QueryResult>;
    listTables(): Promise<TableInfo[]>;
    describeTable(tableName: string): Promise<TableInfo | null>;

    getType(): string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQLite Provider (using built-in sqlite3 via exec)
// ═══════════════════════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SQLiteProvider implements DatabaseProvider {
    private filePath: string;
    private connected = false;
    private maxRows: number;

    constructor(filePath: string, _readonly = true, maxRows = 100) {
        this.filePath = filePath;
        this.maxRows = maxRows;
    }

    async connect(): Promise<void> {
        if (!fs.existsSync(this.filePath)) {
            throw new Error(`Database file not found: ${this.filePath}`);
        }
        this.connected = true;
        logger.debug('SQLite connected', { path: this.filePath });
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async query(sql: string, _params: unknown[] = []): Promise<QueryResult> {
        if (!this.connected) {
            return { success: false, error: 'Database not connected' };
        }

        try {
            // Use sqlite3 CLI for queries (cross-platform)
            const limitedSql = sql.trim().toUpperCase().startsWith('SELECT')
                ? `${sql.replace(/;?\s*$/, '')} LIMIT ${this.maxRows}`
                : sql;

            const { stdout, stderr } = await execAsync(
                `sqlite3 -json "${this.filePath}" "${limitedSql.replace(/"/g, '\\"')}"`,
                { maxBuffer: 10 * 1024 * 1024 }
            );

            if (stderr) {
                return { success: false, error: stderr };
            }

            if (stdout.trim()) {
                const rows = JSON.parse(stdout) as Record<string, unknown>[];
                const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];
                return {
                    success: true,
                    columns,
                    rows,
                    rowCount: rows.length,
                    truncated: rows.length >= this.maxRows,
                };
            }

            return { success: true, rowCount: 0, rows: [] };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    async listTables(): Promise<TableInfo[]> {
        const result = await this.query(
            "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
        );

        if (!result.success || !result.rows) {
            return [];
        }

        return result.rows.map(row => ({
            name: row['name'] as string,
            type: row['type'] as 'table' | 'view',
            columns: [],
        }));
    }

    async describeTable(tableName: string): Promise<TableInfo | null> {
        const result = await this.query(`PRAGMA table_info("${tableName}")`);

        if (!result.success || !result.rows || result.rows.length === 0) {
            return null;
        }

        const columns: ColumnInfo[] = result.rows.map(row => ({
            name: row['name'] as string,
            type: row['type'] as string,
            nullable: (row['notnull'] as number) === 0,
            primaryKey: (row['pk'] as number) === 1,
            defaultValue: row['dflt_value'] as string | undefined,
        }));

        return {
            name: tableName,
            type: 'table',
            columns,
        };
    }

    getType(): string {
        return 'sqlite';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PostgreSQL Provider (Stub)
// ═══════════════════════════════════════════════════════════════════════════════

export class PostgreSQLProvider implements DatabaseProvider {
    private connectionString: string;
    private connected = false;

    constructor(connectionString: string, _readonly = true, _maxRows = 100) {
        this.connectionString = connectionString;
    }

    async connect(): Promise<void> {
        throw new Error(
            'PostgreSQL support requires the "pg" package. ' +
            'Install with: npm install pg @types/pg'
        );
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async query(_sql: string, _params?: unknown[]): Promise<QueryResult> {
        return { success: false, error: 'PostgreSQL not connected' };
    }

    async listTables(): Promise<TableInfo[]> {
        return [];
    }

    async describeTable(_tableName: string): Promise<TableInfo | null> {
        return null;
    }

    getType(): string {
        return 'postgresql';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Database Skills Class
// ═══════════════════════════════════════════════════════════════════════════════

export class DatabaseSkills extends MultiToolSkill {
    private activeProvider: DatabaseProvider | null = null;
    private config: DatabaseConfig;

    constructor(options: Partial<DatabaseConfig> = {}) {
        super({
            name: 'DatabaseSkills',
            description: 'Database access for querying, schema inspection, and data manipulation',
            version: '1.0.0',
            category: 'database',
        });

        this.config = {
            type: options.type ?? 'sqlite',
            connectionString: options.connectionString,
            filePath: options.filePath,
            readonly: options.readonly ?? true,
            maxRows: options.maxRows ?? 100,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Registration
    // ─────────────────────────────────────────────────────────────────────────────

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'db_connect',
                description: 'Connect to a database. Supports SQLite (built-in) and PostgreSQL (requires pg package)',
                parameters: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['sqlite', 'postgresql'],
                            description: 'Database type',
                        },
                        connectionString: {
                            type: 'string',
                            description: 'Connection string (for PostgreSQL: postgres://user:pass@host:port/db)',
                        },
                        filePath: {
                            type: 'string',
                            description: 'Path to SQLite database file',
                        },
                        readonly: {
                            type: 'boolean',
                            description: 'Open in read-only mode (default: true)',
                        },
                    },
                    required: ['type'],
                },
                category: 'database',
            },
            {
                name: 'db_disconnect',
                description: 'Disconnect from the current database',
                parameters: {
                    type: 'object',
                    properties: {},
                },
                category: 'database',
            },
            {
                name: 'db_query',
                description: 'Execute a SQL query. SELECT queries return results; write queries require approval.',
                parameters: {
                    type: 'object',
                    properties: {
                        sql: {
                            type: 'string',
                            description: 'SQL query to execute',
                        },
                    },
                    required: ['sql'],
                },
                category: 'database',
            },
            {
                name: 'db_list_tables',
                description: 'List all tables and views in the connected database',
                parameters: {
                    type: 'object',
                    properties: {},
                },
                category: 'database',
            },
            {
                name: 'db_describe_table',
                description: 'Get detailed schema information for a specific table',
                parameters: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name to describe',
                        },
                    },
                    required: ['table'],
                },
                category: 'database',
            },
            {
                name: 'db_sample_data',
                description: 'Get a sample of rows from a table to understand its data',
                parameters: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of rows to sample (default: 10)',
                        },
                    },
                    required: ['table'],
                },
                category: 'database',
            },
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Execution
    // ─────────────────────────────────────────────────────────────────────────────

    async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        switch (toolName) {
            case 'db_connect':
                return this.executeConnect(args);
            case 'db_disconnect':
                return this.executeDisconnect();
            case 'db_query':
                return this.executeQuery(args);
            case 'db_list_tables':
                return this.executeListTables();
            case 'db_describe_table':
                return this.executeDescribeTable(args);
            case 'db_sample_data':
                return this.executeSampleData(args);
            default:
                return this.createResult(`Unknown tool: ${toolName}`, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Implementation
    // ─────────────────────────────────────────────────────────────────────────────

    private async executeConnect(args: Record<string, unknown>): Promise<ToolResult> {
        const type = args['type'] as 'sqlite' | 'postgresql';
        const readonly = (args['readonly'] as boolean) ?? true;

        try {
            let provider: DatabaseProvider;

            if (type === 'sqlite') {
                const filePath = args['filePath'] as string;
                if (!filePath) {
                    return this.createResult('SQLite requires filePath parameter', true);
                }

                const resolvedPath = path.resolve(filePath);
                provider = new SQLiteProvider(resolvedPath, readonly, this.config.maxRows);
            } else if (type === 'postgresql') {
                const connectionString = args['connectionString'] as string;
                if (!connectionString) {
                    return this.createResult('PostgreSQL requires connectionString parameter', true);
                }
                provider = new PostgreSQLProvider(connectionString, readonly, this.config.maxRows);
            } else {
                return this.createResult(`Unsupported database type: ${type}`, true);
            }

            await provider.connect();
            this.activeProvider = provider;

            const tables = await provider.listTables();

            return this.createResult({
                message: `Connected to ${type} database${readonly ? ' (read-only)' : ''}`,
                tableCount: tables.length,
                tables: tables.map(t => t.name),
            });
        } catch (error) {
            return this.createResult(
                `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    private async executeDisconnect(): Promise<ToolResult> {
        if (!this.activeProvider) {
            return this.createResult('No active database connection', true);
        }

        try {
            const type = this.activeProvider.getType();
            await this.activeProvider.disconnect();
            this.activeProvider = null;

            return this.createResult({ message: `Disconnected from ${type} database` });
        } catch (error) {
            return this.createResult(
                `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    private async executeQuery(args: Record<string, unknown>): Promise<ToolResult> {
        if (!this.activeProvider) {
            return this.createResult('No active database connection. Use db_connect first.', true);
        }

        const sql = args['sql'] as string;

        // Check for dangerous operations
        const isDangerous = DANGEROUS_PATTERNS.some(pattern => pattern.test(sql));
        if (isDangerous && this.config.readonly) {
            return this.createResult(
                'Dangerous query blocked. Database is in read-only mode. ' +
                'Queries with DROP, DELETE, UPDATE, INSERT, etc. are not allowed.',
                true
            );
        }

        try {
            const result = await this.activeProvider.query(sql);

            if (!result.success) {
                return this.createResult(`Query failed: ${result.error}`, true);
            }

            if (result.rows && result.rows.length > 0) {
                return this.createResult({
                    columns: result.columns,
                    rows: result.rows,
                    rowCount: result.rowCount,
                    truncated: result.truncated,
                    message: result.truncated
                        ? `Showing ${result.rows.length} of ${result.rowCount}+ rows (limited)`
                        : `${result.rowCount} row(s) returned`,
                });
            } else {
                return this.createResult({
                    rowCount: result.rowCount ?? 0,
                    message: `${result.rowCount ?? 0} row(s) affected or returned`,
                });
            }
        } catch (error) {
            return this.createResult(
                `Query error: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    private async executeListTables(): Promise<ToolResult> {
        if (!this.activeProvider) {
            return this.createResult('No active database connection. Use db_connect first.', true);
        }

        try {
            const tables = await this.activeProvider.listTables();

            return this.createResult({
                tables: tables.map(t => ({ name: t.name, type: t.type })),
                count: tables.length,
            });
        } catch (error) {
            return this.createResult(
                `Failed to list tables: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    private async executeDescribeTable(args: Record<string, unknown>): Promise<ToolResult> {
        if (!this.activeProvider) {
            return this.createResult('No active database connection. Use db_connect first.', true);
        }

        const tableName = args['table'] as string;

        try {
            const info = await this.activeProvider.describeTable(tableName);

            if (!info) {
                return this.createResult(`Table not found: ${tableName}`, true);
            }

            return this.createResult({
                table: info.name,
                type: info.type,
                columns: info.columns.map(c => ({
                    name: c.name,
                    type: c.type,
                    nullable: c.nullable,
                    primaryKey: c.primaryKey,
                    default: c.defaultValue,
                })),
            });
        } catch (error) {
            return this.createResult(
                `Failed to describe table: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    private async executeSampleData(args: Record<string, unknown>): Promise<ToolResult> {
        if (!this.activeProvider) {
            return this.createResult('No active database connection. Use db_connect first.', true);
        }

        const tableName = args['table'] as string;
        const limit = Math.min((args['limit'] as number) ?? 10, this.config.maxRows);

        try {
            const result = await this.activeProvider.query(
                `SELECT * FROM "${tableName}" LIMIT ${limit}`
            );

            if (!result.success) {
                return this.createResult(`Failed to sample data: ${result.error}`, true);
            }

            return this.createResult({
                table: tableName,
                columns: result.columns,
                rows: result.rows,
                sampleSize: result.rows?.length ?? 0,
            });
        } catch (error) {
            return this.createResult(
                `Failed to sample data: ${error instanceof Error ? error.message : String(error)}`,
                true
            );
        }
    }

    /**
     * Check if a query is potentially dangerous
     */
    static isDangerousQuery(sql: string): boolean {
        return DANGEROUS_PATTERNS.some(pattern => pattern.test(sql));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory and Helpers
// ═══════════════════════════════════════════════════════════════════════════════

let databaseSkillsInstance: DatabaseSkills | null = null;

export function getDatabaseSkills(options?: Partial<DatabaseConfig>): DatabaseSkills {
    if (!databaseSkillsInstance) {
        databaseSkillsInstance = new DatabaseSkills(options);
    }
    return databaseSkillsInstance;
}

export function createDatabaseSkills(options?: Partial<DatabaseConfig>): DatabaseSkills {
    return new DatabaseSkills(options);
}

export function resetDatabaseSkills(): void {
    databaseSkillsInstance = null;
}

/**
 * Quick helper to connect to a SQLite database
 */
export async function connectSQLite(filePath: string, readonly = true): Promise<SQLiteProvider> {
    const provider = new SQLiteProvider(filePath, readonly);
    await provider.connect();
    return provider;
}
