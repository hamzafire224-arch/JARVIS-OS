/**
 * JARVIS Skill Marketplace
 * 
 * Enables discovery, installation, and sharing of community-built skills.
 * Part of the growth strategy to build network effects.
 * 
 * Features:
 * - Browse curated skill collections
 * - Install skills with one command
 * - Rate and review skills
 * - Submit custom skills
 * - Automatic security scanning before install
 */

import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SkillMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'proprietary';
    category: SkillCategory;
    tags: string[];
    repository?: string;
    homepage?: string;
    dependencies?: string[];
    jarvisVersion?: string;
    rating?: number;
    downloads?: number;
    verified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type SkillCategory =
    | 'productivity'
    | 'development'
    | 'communication'
    | 'data'
    | 'automation'
    | 'integration'
    | 'utility'
    | 'other';

export interface SkillSearchResult {
    skill: SkillMetadata;
    matchScore: number;
    matchReason: string;
}

export interface InstalledSkill extends SkillMetadata {
    installPath: string;
    installedAt: Date;
    lastUsed?: Date;
    usageCount: number;
}

export interface MarketplaceConfig {
    registryUrl: string;
    skillsDir: string;
    cacheDir: string;
    autoUpdate: boolean;
    securityScanEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Featured Skills (Built-in Registry)
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURED_SKILLS: SkillMetadata[] = [
    {
        id: 'jarvis-git-advanced',
        name: 'Git Advanced',
        version: '1.2.0',
        description: 'Advanced Git operations: interactive rebase, cherry-pick, bisect, and conflict resolution',
        author: 'JARVIS Team',
        license: 'MIT',
        category: 'development',
        tags: ['git', 'version-control', 'development'],
        rating: 4.8,
        downloads: 5420,
        verified: true,
    },
    {
        id: 'jarvis-docker-manager',
        name: 'Docker Manager',
        version: '1.0.5',
        description: 'Manage Docker containers, images, and compose stacks through natural language',
        author: 'JARVIS Team',
        license: 'MIT',
        category: 'development',
        tags: ['docker', 'containers', 'devops'],
        rating: 4.7,
        downloads: 3210,
        verified: true,
    },
    {
        id: 'jarvis-database-query',
        name: 'Database Query',
        version: '2.0.0',
        description: 'Query PostgreSQL, MySQL, and SQLite databases with natural language',
        author: 'JARVIS Team',
        license: 'MIT',
        category: 'data',
        tags: ['database', 'sql', 'postgresql', 'mysql'],
        rating: 4.9,
        downloads: 8750,
        verified: true,
    },
    {
        id: 'jarvis-api-tester',
        name: 'API Tester',
        version: '1.1.0',
        description: 'Test REST and GraphQL APIs with automatic request building and response validation',
        author: 'JARVIS Team',
        license: 'MIT',
        category: 'development',
        tags: ['api', 'rest', 'graphql', 'testing'],
        rating: 4.6,
        downloads: 4120,
        verified: true,
    },
    {
        id: 'jarvis-slack-integration',
        name: 'Slack Integration',
        version: '1.0.0',
        description: 'Send messages, manage channels, and interact with Slack workspaces',
        author: 'Community',
        license: 'MIT',
        category: 'communication',
        tags: ['slack', 'messaging', 'teams'],
        rating: 4.5,
        downloads: 2890,
        verified: false,
    },
    {
        id: 'jarvis-notion-sync',
        name: 'Notion Sync',
        version: '0.9.0',
        description: 'Sync notes and databases with Notion workspace',
        author: 'Community',
        license: 'MIT',
        category: 'productivity',
        tags: ['notion', 'notes', 'productivity'],
        rating: 4.3,
        downloads: 1560,
        verified: false,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Marketplace
// ═══════════════════════════════════════════════════════════════════════════════

export class SkillMarketplace {
    private config: MarketplaceConfig;
    private installedSkills: Map<string, InstalledSkill> = new Map();
    private cache: Map<string, SkillMetadata[]> = new Map();

    constructor(config?: Partial<MarketplaceConfig>) {
        this.config = {
            registryUrl: config?.registryUrl ?? 'https://registry.jarvis.ai/skills',
            skillsDir: config?.skillsDir ?? './data/skills',
            cacheDir: config?.cacheDir ?? './data/cache/skills',
            autoUpdate: config?.autoUpdate ?? true,
            securityScanEnabled: config?.securityScanEnabled ?? true,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        // Ensure directories exist
        await fs.mkdir(this.config.skillsDir, { recursive: true });
        await fs.mkdir(this.config.cacheDir, { recursive: true });

        // Load installed skills
        await this.loadInstalledSkills();

        logger.info('SkillMarketplace initialized', {
            installedCount: this.installedSkills.size,
        });
    }

    private async loadInstalledSkills(): Promise<void> {
        const manifestPath = join(this.config.skillsDir, 'installed.json');

        if (existsSync(manifestPath)) {
            try {
                const content = await fs.readFile(manifestPath, 'utf-8');
                const skills: InstalledSkill[] = JSON.parse(content);
                for (const skill of skills) {
                    this.installedSkills.set(skill.id, skill);
                }
            } catch (error) {
                logger.error('Failed to load installed skills manifest', { error });
            }
        }
    }

    private async saveInstalledSkills(): Promise<void> {
        const manifestPath = join(this.config.skillsDir, 'installed.json');
        const skills = Array.from(this.installedSkills.values());
        await fs.writeFile(manifestPath, JSON.stringify(skills, null, 2), 'utf-8');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Browse & Search
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get featured/popular skills
     */
    async getFeatured(): Promise<SkillMetadata[]> {
        // In production, this would fetch from registry
        // For now, return built-in featured list
        return FEATURED_SKILLS.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    }

    /**
     * Browse skills by category
     */
    async browseByCategory(category: SkillCategory): Promise<SkillMetadata[]> {
        const all = await this.getFeatured();
        return all.filter(s => s.category === category);
    }

    /**
     * Search skills by query
     */
    async search(query: string): Promise<SkillSearchResult[]> {
        const all = await this.getFeatured();
        const lowerQuery = query.toLowerCase();
        const results: SkillSearchResult[] = [];

        for (const skill of all) {
            let score = 0;
            let reason = '';

            // Name match (highest weight)
            if (skill.name.toLowerCase().includes(lowerQuery)) {
                score += 10;
                reason = 'Name match';
            }

            // Tag match
            if (skill.tags.some(t => t.toLowerCase().includes(lowerQuery))) {
                score += 5;
                reason = reason || 'Tag match';
            }

            // Description match
            if (skill.description.toLowerCase().includes(lowerQuery)) {
                score += 3;
                reason = reason || 'Description match';
            }

            // Boost verified skills
            if (skill.verified) {
                score += 2;
            }

            // Boost popular skills
            score += Math.min((skill.downloads ?? 0) / 1000, 3);

            if (score > 0) {
                results.push({ skill, matchScore: score, matchReason: reason });
            }
        }

        return results.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * Get skill details
     */
    async getSkillDetails(skillId: string): Promise<SkillMetadata | null> {
        const all = await this.getFeatured();
        return all.find(s => s.id === skillId) ?? null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Installation
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Install a skill from the marketplace
     */
    async install(skillId: string): Promise<{ success: boolean; message: string }> {
        // Check if already installed
        if (this.installedSkills.has(skillId)) {
            return { success: false, message: 'Skill already installed' };
        }

        // Get skill metadata
        const skill = await this.getSkillDetails(skillId);
        if (!skill) {
            return { success: false, message: 'Skill not found' };
        }

        // Security scan (placeholder - in production would scan actual code)
        if (this.config.securityScanEnabled) {
            const scanResult = this.performSecurityScan(skill);
            if (!scanResult.safe) {
                return {
                    success: false,
                    message: `Security scan failed: ${scanResult.reason}`
                };
            }
        }

        // Create skill directory
        const skillPath = join(this.config.skillsDir, skillId);
        await fs.mkdir(skillPath, { recursive: true });

        // In production, this would download from registry
        // For now, create placeholder
        await fs.writeFile(
            join(skillPath, 'skill.json'),
            JSON.stringify(skill, null, 2),
            'utf-8'
        );

        // Register as installed
        const installed: InstalledSkill = {
            ...skill,
            installPath: skillPath,
            installedAt: new Date(),
            usageCount: 0,
        };

        this.installedSkills.set(skillId, installed);
        await this.saveInstalledSkills();

        logger.info('Skill installed', { skillId, name: skill.name });

        return {
            success: true,
            message: `Successfully installed ${skill.name} v${skill.version}`
        };
    }

    /**
     * Uninstall a skill
     */
    async uninstall(skillId: string): Promise<{ success: boolean; message: string }> {
        const skill = this.installedSkills.get(skillId);
        if (!skill) {
            return { success: false, message: 'Skill not installed' };
        }

        // Remove skill directory
        try {
            await fs.rm(skill.installPath, { recursive: true, force: true });
        } catch (error) {
            logger.error('Failed to remove skill directory', { skillId, error });
        }

        // Remove from registry
        this.installedSkills.delete(skillId);
        await this.saveInstalledSkills();

        logger.info('Skill uninstalled', { skillId, name: skill.name });

        return {
            success: true,
            message: `Successfully uninstalled ${skill.name}`
        };
    }

    /**
     * Update an installed skill
     */
    async update(skillId: string): Promise<{ success: boolean; message: string }> {
        const installed = this.installedSkills.get(skillId);
        if (!installed) {
            return { success: false, message: 'Skill not installed' };
        }

        // Get latest version
        const latest = await this.getSkillDetails(skillId);
        if (!latest) {
            return { success: false, message: 'Skill not found in registry' };
        }

        // Compare versions
        if (installed.version === latest.version) {
            return { success: true, message: 'Skill is already up to date' };
        }

        // Uninstall and reinstall
        await this.uninstall(skillId);
        return this.install(skillId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Security
    // ─────────────────────────────────────────────────────────────────────────────

    private performSecurityScan(skill: SkillMetadata): { safe: boolean; reason?: string } {
        // Check for verified badge
        if (skill.verified) {
            return { safe: true };
        }

        // Check minimum rating
        if ((skill.rating ?? 0) < 3.0) {
            return { safe: false, reason: 'Low community rating' };
        }

        // Check minimum downloads (for community trust)
        if ((skill.downloads ?? 0) < 100) {
            return { safe: false, reason: 'Low download count - skill not widely tested' };
        }

        // In production: would scan actual code for suspicious patterns
        // using the SkillScanner from security module

        return { safe: true };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Installed Skills
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get all installed skills
     */
    getInstalled(): InstalledSkill[] {
        return Array.from(this.installedSkills.values());
    }

    /**
     * Check if a skill is installed
     */
    isInstalled(skillId: string): boolean {
        return this.installedSkills.has(skillId);
    }

    /**
     * Record skill usage
     */
    async recordUsage(skillId: string): Promise<void> {
        const skill = this.installedSkills.get(skillId);
        if (skill) {
            skill.usageCount++;
            skill.lastUsed = new Date();
            await this.saveInstalledSkills();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────────

    getStats(): {
        installed: number;
        totalUsage: number;
        mostUsed: InstalledSkill | null;
    } {
        const installed = this.getInstalled();
        const totalUsage = installed.reduce((sum, s) => sum + s.usageCount, 0);
        const mostUsed = installed.length > 0
            ? installed.reduce((a, b) => a.usageCount > b.usageCount ? a : b)
            : null;

        return { installed: installed.length, totalUsage, mostUsed };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let marketplaceInstance: SkillMarketplace | null = null;

export function getSkillMarketplace(config?: Partial<MarketplaceConfig>): SkillMarketplace {
    if (!marketplaceInstance) {
        marketplaceInstance = new SkillMarketplace(config);
    }
    return marketplaceInstance;
}

export async function initializeSkillMarketplace(
    config?: Partial<MarketplaceConfig>
): Promise<SkillMarketplace> {
    marketplaceInstance = new SkillMarketplace(config);
    await marketplaceInstance.initialize();
    return marketplaceInstance;
}

export function resetSkillMarketplace(): void {
    marketplaceInstance = null;
}
