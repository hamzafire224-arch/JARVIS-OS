/**
 * JARVIS Capability Manager
 * 
 * Implements capability-based security for tool execution.
 * Instead of "God Mode" access, tools must request specific permissions.
 * 
 * Features:
 * - Permission declarations for each tool
 * - Risk level classification (safe/moderate/dangerous/destructive)
 * - User approval flow for risky operations
 * - Audit logging for all tool executions
 * - Scope restrictions (e.g., only /projects/* directory)
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname, resolve, normalize } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type RiskLevel = 'safe' | 'moderate' | 'dangerous' | 'destructive';

export type CapabilityCategory =
    | 'filesystem.read'
    | 'filesystem.write'
    | 'filesystem.delete'
    | 'terminal.execute'
    | 'terminal.background'
    | 'network.http'
    | 'network.websocket'
    | 'browser.navigate'
    | 'browser.execute'
    | 'database.read'
    | 'database.write'
    | 'github.read'
    | 'github.write'
    | 'memory.read'
    | 'memory.write'
    | 'system.info';

export interface Capability {
    category: CapabilityCategory;
    scope?: string;          // e.g., '/projects/*' for filesystem
    riskLevel: RiskLevel;
    description: string;
}

export interface ToolPermission {
    toolName: string;
    capabilities: Capability[];
    alwaysRequireApproval?: boolean;
}

export interface PermissionGrant {
    capability: CapabilityCategory;
    scope: string;
    grantedAt: Date;
    expiresAt?: Date;        // Optional expiry for temporary grants
    grantedBy: 'user' | 'policy' | 'auto';
}

export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    toolName: string;
    capabilities: CapabilityCategory[];
    args: Record<string, unknown>;
    result: 'approved' | 'denied' | 'auto-approved';
    approvalSource: 'user' | 'policy' | 'auto';
    userId?: string;
}

export interface SecurityPolicy {
    /** Auto-approve safe operations */
    autoApproveSafe: boolean;
    /** Auto-approve moderate operations */
    autoApproveModerate: boolean;
    /** Never auto-approve dangerous operations */
    neverAutoApproveDangerous: boolean;
    /** Allowed filesystem paths (glob patterns) */
    allowedPaths: string[];
    /** Blocked filesystem paths (glob patterns) */
    blockedPaths: string[];
    /** Blocked commands (regex patterns) */
    blockedCommands: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Security Policy
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
    autoApproveSafe: true,
    autoApproveModerate: false,
    neverAutoApproveDangerous: true,
    allowedPaths: [
        process.cwd(),           // Current working directory
        './data/*',              // JARVIS data directory
        './memory/*',            // Memory files
    ],
    blockedPaths: [
        '~/.ssh/*',              // SSH keys
        '~/.aws/*',              // AWS credentials
        '~/.config/*',           // Config files
        '/etc/*',                // System configs
        '/System/*',             // macOS system
        'C:\\Windows\\*',        // Windows system
    ],
    blockedCommands: [
        'rm\\s+-rf\\s+/',        // Dangerous rm commands
        'sudo\\s+rm',            // Sudo delete
        'chmod\\s+777',          // Overly permissive chmod
        'curl.*\\|.*sh',         // Pipe to shell
        'wget.*\\|.*sh',         // Pipe to shell
        'format\\s+',            // Format commands
        'mkfs\\.',               // Make filesystem
        ':(){:|:&};:',           // Fork bomb pattern
    ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Risk Level Definitions
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
    safe: 'Read-only operations with no side effects',
    moderate: 'Operations that modify local state reversibly',
    dangerous: 'Operations that could cause data loss or external effects',
    destructive: 'Operations that permanently delete data or affect system integrity',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Capability Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class CapabilityManager extends EventEmitter {
    private policy: SecurityPolicy;
    private grants: Map<string, PermissionGrant[]> = new Map();
    private auditLog: AuditLogEntry[] = [];
    private toolPermissions: Map<string, ToolPermission> = new Map();
    private auditLogPath: string;
    private approvalHandler?: (request: ApprovalRequest) => Promise<boolean>;

    constructor(policy: Partial<SecurityPolicy> = {}, dataDir?: string) {
        super();
        this.policy = { ...DEFAULT_SECURITY_POLICY, ...policy };
        this.auditLogPath = join(dataDir ?? './data/security', 'audit.json');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        try {
            await fs.mkdir(dirname(this.auditLogPath), { recursive: true });

            // Load existing audit log
            try {
                const content = await fs.readFile(this.auditLogPath, 'utf-8');
                this.auditLog = JSON.parse(content);
            } catch {
                this.auditLog = [];
            }

            logger.info('CapabilityManager initialized', {
                grantCount: this.grants.size,
                auditLogEntries: this.auditLog.length,
            });
        } catch (error) {
            logger.error('Failed to initialize CapabilityManager', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a tool with its required capabilities
     */
    registerTool(permission: ToolPermission): void {
        this.toolPermissions.set(permission.toolName, permission);
        logger.debug('Registered tool capabilities', {
            tool: permission.toolName,
            capabilities: permission.capabilities.map(c => c.category),
        });
    }

    /**
     * Get the permission definition for a tool
     */
    getToolPermission(toolName: string): ToolPermission | undefined {
        return this.toolPermissions.get(toolName);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Permission Checking
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check if a tool execution is allowed
     */
    async checkPermission(
        toolName: string,
        args: Record<string, unknown>,
        userId?: string
    ): Promise<PermissionCheckResult> {
        const permission = this.toolPermissions.get(toolName);

        // Unknown tool - require explicit approval
        if (!permission) {
            return {
                allowed: false,
                requiresApproval: true,
                reason: `Unknown tool: ${toolName}`,
                riskLevel: 'dangerous',
            };
        }

        // Check each capability
        for (const capability of permission.capabilities) {
            const result = await this.checkCapability(capability, args, userId);
            if (!result.allowed) {
                return result;
            }
        }

        // Determine if auto-approval is possible
        const maxRisk = this.getMaxRiskLevel(permission.capabilities);
        const canAutoApprove = this.canAutoApprove(maxRisk);

        if (permission.alwaysRequireApproval || !canAutoApprove) {
            return {
                allowed: true,
                requiresApproval: true,
                reason: `Tool '${toolName}' requires user approval`,
                riskLevel: maxRisk,
            };
        }

        return {
            allowed: true,
            requiresApproval: false,
            riskLevel: maxRisk,
        };
    }

    /**
     * Check a specific capability
     */
    private async checkCapability(
        capability: Capability,
        args: Record<string, unknown>,
        userId?: string
    ): Promise<PermissionCheckResult> {
        // Check for existing grant
        const grants = this.grants.get(userId ?? 'default') ?? [];
        const hasGrant = grants.some(g =>
            g.capability === capability.category &&
            this.scopeMatches(capability.scope, g.scope) &&
            (!g.expiresAt || g.expiresAt > new Date())
        );

        if (hasGrant) {
            return { allowed: true, requiresApproval: false, riskLevel: capability.riskLevel };
        }

        // Check blocked paths for filesystem operations
        if (capability.category.startsWith('filesystem.')) {
            const path = this.extractPath(args);
            if (path && this.isBlockedPath(path)) {
                return {
                    allowed: false,
                    requiresApproval: false,
                    reason: `Path '${path}' is blocked by security policy`,
                    riskLevel: 'destructive',
                };
            }
        }

        // Check blocked commands for terminal operations
        if (capability.category === 'terminal.execute') {
            const command = args['command'] as string;
            if (command && this.isBlockedCommand(command)) {
                return {
                    allowed: false,
                    requiresApproval: false,
                    reason: `Command blocked by security policy: ${command.slice(0, 50)}...`,
                    riskLevel: 'destructive',
                };
            }
        }

        return {
            allowed: true,
            requiresApproval: !this.canAutoApprove(capability.riskLevel),
            riskLevel: capability.riskLevel,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Approval Flow
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Set the approval handler (called when user approval is needed)
     */
    setApprovalHandler(handler: (request: ApprovalRequest) => Promise<boolean>): void {
        this.approvalHandler = handler;
    }

    /**
     * Request user approval for a tool execution
     */
    async requestApproval(
        toolName: string,
        args: Record<string, unknown>,
        riskLevel: RiskLevel,
        reason?: string
    ): Promise<boolean> {
        if (!this.approvalHandler) {
            logger.warn('No approval handler set, denying by default');
            return false;
        }

        const request: ApprovalRequest = {
            toolName,
            args,
            riskLevel,
            reason,
            riskDescription: RISK_DESCRIPTIONS[riskLevel],
            timestamp: new Date(),
        };

        this.emit('approval_requested', request);

        const approved = await this.approvalHandler(request);

        this.emit('approval_result', { ...request, approved });

        return approved;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Permission Grants
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Grant a permission
     */
    grantPermission(
        capability: CapabilityCategory,
        scope: string,
        options: { duration?: number; userId?: string; grantedBy?: 'user' | 'policy' | 'auto' } = {}
    ): void {
        const userId = options.userId ?? 'default';
        const grants = this.grants.get(userId) ?? [];

        const grant: PermissionGrant = {
            capability,
            scope,
            grantedAt: new Date(),
            expiresAt: options.duration
                ? new Date(Date.now() + options.duration)
                : undefined,
            grantedBy: options.grantedBy ?? 'user',
        };

        grants.push(grant);
        this.grants.set(userId, grants);

        logger.info('Permission granted', { capability, scope, expiresAt: grant.expiresAt });
    }

    /**
     * Revoke a permission
     */
    revokePermission(capability: CapabilityCategory, scope: string, userId?: string): boolean {
        const key = userId ?? 'default';
        const grants = this.grants.get(key);
        if (!grants) return false;

        const filtered = grants.filter(g =>
            !(g.capability === capability && g.scope === scope)
        );

        if (filtered.length === grants.length) return false;

        this.grants.set(key, filtered);
        logger.info('Permission revoked', { capability, scope });
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Audit Logging
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Log a tool execution
     */
    async logExecution(
        toolName: string,
        capabilities: CapabilityCategory[],
        args: Record<string, unknown>,
        result: 'approved' | 'denied' | 'auto-approved',
        approvalSource: 'user' | 'policy' | 'auto',
        userId?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date(),
            toolName,
            capabilities,
            args: this.sanitizeArgs(args),
            result,
            approvalSource,
            userId,
        };

        this.auditLog.push(entry);

        // Keep only last 1000 entries in memory
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }

        // Persist to disk
        await this.persistAuditLog();

        this.emit('audit_logged', entry);
    }

    /**
     * Get recent audit entries
     */
    getAuditLog(limit = 50): AuditLogEntry[] {
        return this.auditLog.slice(-limit);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private canAutoApprove(riskLevel: RiskLevel): boolean {
        switch (riskLevel) {
            case 'safe':
                return this.policy.autoApproveSafe;
            case 'moderate':
                return this.policy.autoApproveModerate;
            case 'dangerous':
            case 'destructive':
                return !this.policy.neverAutoApproveDangerous;
            default:
                return false;
        }
    }

    private getMaxRiskLevel(capabilities: Capability[]): RiskLevel {
        const levels: RiskLevel[] = ['safe', 'moderate', 'dangerous', 'destructive'];
        let maxIndex = 0;
        for (const cap of capabilities) {
            const index = levels.indexOf(cap.riskLevel);
            if (index > maxIndex) maxIndex = index;
        }
        // Safe access with fallback to 'safe'
        return levels[maxIndex] ?? 'safe';
    }

    private extractPath(args: Record<string, unknown>): string | null {
        // Common path argument names
        const pathKeys = ['path', 'filePath', 'directory', 'dir', 'file', 'targetPath'];
        for (const key of pathKeys) {
            if (typeof args[key] === 'string') {
                return args[key] as string;
            }
        }
        return null;
    }

    private isBlockedPath(path: string): boolean {
        const normalizedPath = normalize(resolve(path));

        for (const pattern of this.policy.blockedPaths) {
            const normalizedPattern = pattern
                .replace('~', process.env.HOME ?? process.env.USERPROFILE ?? '')
                .replace(/\*/g, '.*');

            if (new RegExp(normalizedPattern, 'i').test(normalizedPath)) {
                return true;
            }
        }
        return false;
    }

    private isBlockedCommand(command: string): boolean {
        for (const pattern of this.policy.blockedCommands) {
            if (new RegExp(pattern, 'i').test(command)) {
                return true;
            }
        }
        return false;
    }

    private scopeMatches(required?: string, granted?: string): boolean {
        if (!required) return true;
        if (!granted) return false;

        // Simple glob matching
        const pattern = granted.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(required);
    }

    private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
        // Remove sensitive data from audit logs
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'credential'];
        const sanitized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(args)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string' && value.length > 500) {
                sanitized[key] = value.slice(0, 500) + '...[truncated]';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    private async persistAuditLog(): Promise<void> {
        try {
            await fs.writeFile(
                this.auditLogPath,
                JSON.stringify(this.auditLog.slice(-500), null, 2),
                'utf-8'
            );
        } catch (error) {
            logger.error('Failed to persist audit log', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Policy Management
    // ─────────────────────────────────────────────────────────────────────────────

    getPolicy(): SecurityPolicy {
        return { ...this.policy };
    }

    updatePolicy(updates: Partial<SecurityPolicy>): void {
        this.policy = { ...this.policy, ...updates };
        logger.info('Security policy updated', updates);
    }

    addAllowedPath(path: string): void {
        if (!this.policy.allowedPaths.includes(path)) {
            this.policy.allowedPaths.push(path);
        }
    }

    addBlockedPath(path: string): void {
        if (!this.policy.blockedPaths.includes(path)) {
            this.policy.blockedPaths.push(path);
        }
    }

    addBlockedCommand(pattern: string): void {
        if (!this.policy.blockedCommands.includes(pattern)) {
            this.policy.blockedCommands.push(pattern);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Additional Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface PermissionCheckResult {
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
    riskLevel: RiskLevel;
}

export interface ApprovalRequest {
    toolName: string;
    args: Record<string, unknown>;
    riskLevel: RiskLevel;
    riskDescription: string;
    reason?: string;
    timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let capabilityManagerInstance: CapabilityManager | null = null;

export function getCapabilityManager(policy?: Partial<SecurityPolicy>): CapabilityManager {
    if (!capabilityManagerInstance) {
        capabilityManagerInstance = new CapabilityManager(policy);
    }
    return capabilityManagerInstance;
}

export async function initializeCapabilityManager(
    policy?: Partial<SecurityPolicy>,
    dataDir?: string
): Promise<CapabilityManager> {
    capabilityManagerInstance = new CapabilityManager(policy, dataDir);
    await capabilityManagerInstance.initialize();
    return capabilityManagerInstance;
}

export function resetCapabilityManager(): void {
    capabilityManagerInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-defined Tool Permissions
// ═══════════════════════════════════════════════════════════════════════════════

export const BUILTIN_TOOL_PERMISSIONS: ToolPermission[] = [
    // Filesystem - Read
    {
        toolName: 'read_file',
        capabilities: [
            { category: 'filesystem.read', riskLevel: 'safe', description: 'Read file contents' }
        ],
    },
    {
        toolName: 'list_directory',
        capabilities: [
            { category: 'filesystem.read', riskLevel: 'safe', description: 'List directory contents' }
        ],
    },
    {
        toolName: 'search_files',
        capabilities: [
            { category: 'filesystem.read', riskLevel: 'safe', description: 'Search for files' }
        ],
    },
    // Filesystem - Write
    {
        toolName: 'write_file',
        capabilities: [
            { category: 'filesystem.write', riskLevel: 'moderate', description: 'Write file contents' }
        ],
    },
    // Filesystem - Delete
    {
        toolName: 'delete_file',
        capabilities: [
            { category: 'filesystem.delete', riskLevel: 'dangerous', description: 'Delete files' }
        ],
        alwaysRequireApproval: true,
    },
    // Terminal
    {
        toolName: 'run_command',
        capabilities: [
            { category: 'terminal.execute', riskLevel: 'dangerous', description: 'Execute shell command' }
        ],
        alwaysRequireApproval: true,
    },
    {
        toolName: 'start_background_command',
        capabilities: [
            { category: 'terminal.background', riskLevel: 'dangerous', description: 'Start background process' }
        ],
        alwaysRequireApproval: true,
    },
    // Browser
    {
        toolName: 'browser_navigate',
        capabilities: [
            { category: 'browser.navigate', riskLevel: 'moderate', description: 'Navigate to URL' }
        ],
    },
    {
        toolName: 'browser_execute',
        capabilities: [
            { category: 'browser.execute', riskLevel: 'dangerous', description: 'Execute JavaScript' }
        ],
        alwaysRequireApproval: true,
    },
    // Network
    {
        toolName: 'http_fetch',
        capabilities: [
            { category: 'network.http', riskLevel: 'moderate', description: 'Make HTTP request' }
        ],
    },
    // Memory (always safe - internal to JARVIS)
    {
        toolName: 'remember',
        capabilities: [
            { category: 'memory.write', riskLevel: 'safe', description: 'Store in memory' }
        ],
    },
    {
        toolName: 'recall',
        capabilities: [
            { category: 'memory.read', riskLevel: 'safe', description: 'Retrieve from memory' }
        ],
    },
];
