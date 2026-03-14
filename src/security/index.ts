/**
 * JARVIS Security Module
 * 
 * Provides capability-based security, skill scanning, and audit logging
 * to protect against the "God Mode" vulnerability pattern.
 */

export * from './CapabilityManager.js';
export * from './SkillScanner.js';

import {
    CapabilityManager,
    getCapabilityManager,
    initializeCapabilityManager,
    BUILTIN_TOOL_PERMISSIONS,
    type SecurityPolicy
} from './CapabilityManager.js';
import {
    SkillScanner,
    getSkillScanner
} from './SkillScanner.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize the complete security system
 */
export async function initializeSecurity(
    policy?: Partial<SecurityPolicy>,
    dataDir?: string
): Promise<{ capabilityManager: CapabilityManager; skillScanner: SkillScanner }> {
    // Initialize capability manager
    const capabilityManager = await initializeCapabilityManager(policy, dataDir);

    // Register built-in tool permissions
    for (const permission of BUILTIN_TOOL_PERMISSIONS) {
        capabilityManager.registerTool(permission);
    }

    // Get skill scanner
    const skillScanner = getSkillScanner();

    logger.info('Security system initialized', {
        toolsRegistered: BUILTIN_TOOL_PERMISSIONS.length,
        policyMode: policy?.autoApproveSafe ? 'permissive' : 'strict',
    });

    return { capabilityManager, skillScanner };
}

/**
 * Quick security check for a tool execution
 */
export async function checkToolSecurity(
    toolName: string,
    args: Record<string, unknown>,
    userId?: string
): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
}> {
    const manager = getCapabilityManager();
    return manager.checkPermission(toolName, args, userId);
}

/**
 * Security configuration presets
 */
export const SECURITY_PRESETS = {
    /** Maximum safety - all operations require approval */
    strict: {
        autoApproveSafe: false,
        autoApproveModerate: false,
        neverAutoApproveDangerous: true,
    } as Partial<SecurityPolicy>,

    /** Balanced - safe operations auto-approved */
    balanced: {
        autoApproveSafe: true,
        autoApproveModerate: false,
        neverAutoApproveDangerous: true,
    } as Partial<SecurityPolicy>,

    /** Developer mode - moderate operations also auto-approved */
    developer: {
        autoApproveSafe: true,
        autoApproveModerate: true,
        neverAutoApproveDangerous: true,
    } as Partial<SecurityPolicy>,

    /** Trust mode - only destructive operations blocked (NOT RECOMMENDED) */
    trust: {
        autoApproveSafe: true,
        autoApproveModerate: true,
        neverAutoApproveDangerous: false,
    } as Partial<SecurityPolicy>,
};
