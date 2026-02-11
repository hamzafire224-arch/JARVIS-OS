/**
 * JARVIS Persona Manager
 * 
 * Implements persona persistence via response prefill:
 * - Maintains consistent character across sessions
 * - Project-specific personas and tones
 * - Prefill injection for LLM responses
 */

import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Persona {
    id: string;
    name: string;
    tone: 'professional' | 'casual' | 'technical' | 'friendly' | 'formal';
    prefill: string;  // Response starter (can be empty for natural responses)
    rules: string[];  // Always/Never behaviors
    projectPatterns?: string[];  // Regex patterns to match project contexts
}

export interface PersonaContext {
    persona: Persona;
    projectName?: string;
    userName?: string;
    sessionHistory?: number;  // Number of messages in session
}

export interface PersonaConfig {
    enabled: boolean;
    defaultPersonaId: string;
    projectDetectionEnabled: boolean;
    persistenceStorePath: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Personas
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_JARVIS_PERSONA: Persona = {
    id: 'jarvis-default',
    name: 'JARVIS',
    tone: 'professional',
    prefill: '',  // Empty = natural response
    rules: [
        'Acknowledge the user by name if known',
        'Be concise but thorough',
        'Never use excessive apologies',
        'Maintain context from previous sessions',
        'Match formality to the project context',
        'Proactively suggest improvements when appropriate',
    ],
};

const DEVELOPER_PERSONA: Persona = {
    id: 'jarvis-developer',
    name: 'JARVIS-Dev',
    tone: 'technical',
    prefill: '',
    rules: [
        'Use code examples when explaining',
        'Reference existing codebase patterns',
        'Suggest best practices proactively',
        'Be direct and efficient',
        'Explain trade-offs when presenting options',
    ],
    projectPatterns: [
        '.*\\.(ts|js|py|go|rs)$',
        '.*\\/src\\/',
        '.*package\\.json$',
    ],
};

const CASUAL_PERSONA: Persona = {
    id: 'jarvis-casual',
    name: 'JARVIS-Chill',
    tone: 'casual',
    prefill: '',
    rules: [
        'Use casual language',
        'Be creative and playful',
        'Suggest content ideas freely',
        'Keep responses light but helpful',
    ],
    projectPatterns: [
        '.*blog.*',
        '.*personal.*',
        '.*hobby.*',
    ],
};

const FORMAL_PERSONA: Persona = {
    id: 'jarvis-formal',
    name: 'JARVIS-Business',
    tone: 'formal',
    prefill: '',
    rules: [
        'Use formal language',
        'Be precise and professional',
        'Avoid colloquialisms',
        'Structure responses clearly',
    ],
    projectPatterns: [
        '.*enterprise.*',
        '.*business.*',
        '.*client.*',
    ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Persona Manager Class
// ═══════════════════════════════════════════════════════════════════════════════

export class PersonaManager {
    private config: PersonaConfig;
    private personas: Map<string, Persona> = new Map();
    private projectPersonaMap: Map<string, string> = new Map();  // projectName -> personaId
    private currentPersona: Persona;

    constructor(config: Partial<PersonaConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            defaultPersonaId: config.defaultPersonaId ?? 'jarvis-default',
            projectDetectionEnabled: config.projectDetectionEnabled ?? true,
            persistenceStorePath: config.persistenceStorePath ?? './data/personas.json',
        };

        // Register built-in personas
        this.registerPersona(DEFAULT_JARVIS_PERSONA);
        this.registerPersona(DEVELOPER_PERSONA);
        this.registerPersona(CASUAL_PERSONA);
        this.registerPersona(FORMAL_PERSONA);

        this.currentPersona = DEFAULT_JARVIS_PERSONA;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persona Registration
    // ─────────────────────────────────────────────────────────────────────────────

    registerPersona(persona: Persona): void {
        this.personas.set(persona.id, persona);
        logger.debug('Registered persona', { id: persona.id, name: persona.name });
    }

    getPersona(id: string): Persona | undefined {
        return this.personas.get(id);
    }

    getAllPersonas(): Persona[] {
        return Array.from(this.personas.values());
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Context Detection
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Detect the appropriate persona based on context
     */
    detectPersona(context: {
        message?: string;
        projectPath?: string;
        projectName?: string;
        explicitPersonaId?: string;
    }): Persona {
        // Explicit persona request takes priority
        if (context.explicitPersonaId) {
            const explicit = this.personas.get(context.explicitPersonaId);
            if (explicit) {
                this.currentPersona = explicit;
                return explicit;
            }
        }

        // Check project-persona mapping
        if (context.projectName) {
            const mappedPersonaId = this.projectPersonaMap.get(context.projectName);
            if (mappedPersonaId) {
                const mapped = this.personas.get(mappedPersonaId);
                if (mapped) {
                    this.currentPersona = mapped;
                    return mapped;
                }
            }
        }

        // Auto-detect from project patterns
        if (this.config.projectDetectionEnabled && context.projectPath) {
            for (const persona of this.personas.values()) {
                if (persona.projectPatterns) {
                    for (const pattern of persona.projectPatterns) {
                        if (new RegExp(pattern, 'i').test(context.projectPath)) {
                            this.currentPersona = persona;
                            return persona;
                        }
                    }
                }
            }
        }

        // Default persona
        const defaultPersona = this.personas.get(this.config.defaultPersonaId) ?? DEFAULT_JARVIS_PERSONA;
        this.currentPersona = defaultPersona;
        return defaultPersona;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Project-Persona Mapping
    // ─────────────────────────────────────────────────────────────────────────────

    setProjectPersona(projectName: string, personaId: string): boolean {
        if (!this.personas.has(personaId)) {
            return false;
        }
        this.projectPersonaMap.set(projectName, personaId);
        return true;
    }

    getProjectPersona(projectName: string): Persona | undefined {
        const personaId = this.projectPersonaMap.get(projectName);
        return personaId ? this.personas.get(personaId) : undefined;
    }

    clearProjectPersona(projectName: string): void {
        this.projectPersonaMap.delete(projectName);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Prefill Generation
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate the system prompt augmentation for the current persona
     */
    generateSystemPromptAugmentation(context?: PersonaContext): string {
        const persona = context?.persona ?? this.currentPersona;

        const parts: string[] = [
            '\n## Persona Guidelines',
            `You are ${persona.name}.`,
            `Tone: ${persona.tone}`,
            '',
            '### Behavioral Rules:',
            ...persona.rules.map(r => `- ${r}`),
        ];

        if (context?.userName) {
            parts.push('', `### Current User: ${context.userName}`);
        }

        if (context?.projectName) {
            parts.push(`### Current Project: ${context.projectName}`);
        }

        return parts.join('\n');
    }

    /**
     * Get the response prefill string (if any)
     */
    getResponsePrefill(context?: PersonaContext): string | undefined {
        const persona = context?.persona ?? this.currentPersona;
        return persona.prefill || undefined;
    }

    /**
     * Generate a context-aware prefill based on project and user
     */
    generateContextualPrefill(context: PersonaContext): string | undefined {
        const persona = context.persona;

        // If persona has explicit prefill, use it
        if (persona.prefill) {
            return persona.prefill;
        }

        // Generate contextual prefill based on conditions
        if (context.projectName) {
            switch (persona.tone) {
                case 'technical':
                    return `Regarding the ${context.projectName} codebase: `;
                case 'formal':
                    return `In reference to ${context.projectName}: `;
                default:
                    return undefined;  // Natural response
            }
        }

        return undefined;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    async save(): Promise<void> {
        const data = {
            customPersonas: Array.from(this.personas.entries())
                .filter(([id]) => !id.startsWith('jarvis-'))  // Only custom personas
                .map(([, persona]) => persona),
            projectMappings: Object.fromEntries(this.projectPersonaMap),
            currentPersonaId: this.currentPersona.id,
        };

        try {
            const dirPath = path.dirname(this.config.persistenceStorePath);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(this.config.persistenceStorePath, JSON.stringify(data, null, 2));
            logger.debug('Saved persona state');
        } catch (error) {
            logger.error('Failed to save persona state', { error });
        }
    }

    async load(): Promise<void> {
        try {
            const content = await fs.readFile(this.config.persistenceStorePath, 'utf-8');
            const data = JSON.parse(content);

            // Load custom personas
            if (data.customPersonas) {
                for (const persona of data.customPersonas) {
                    this.registerPersona(persona);
                }
            }

            // Load project mappings
            if (data.projectMappings) {
                for (const [project, personaId] of Object.entries(data.projectMappings)) {
                    this.projectPersonaMap.set(project, personaId as string);
                }
            }

            // Restore current persona
            if (data.currentPersonaId) {
                const restored = this.personas.get(data.currentPersonaId);
                if (restored) {
                    this.currentPersona = restored;
                }
            }

            logger.debug('Loaded persona state', {
                customPersonas: data.customPersonas?.length ?? 0,
                projectMappings: Object.keys(data.projectMappings ?? {}).length,
            });
        } catch {
            // File doesn't exist or is corrupted, use defaults
            logger.debug('No existing persona state found, using defaults');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Current State
    // ─────────────────────────────────────────────────────────────────────────────

    getCurrentPersona(): Persona {
        return this.currentPersona;
    }

    setCurrentPersona(id: string): boolean {
        const persona = this.personas.get(id);
        if (persona) {
            this.currentPersona = persona;
            return true;
        }
        return false;
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let personaManagerInstance: PersonaManager | null = null;

export function getPersonaManager(config?: Partial<PersonaConfig>): PersonaManager {
    if (!personaManagerInstance) {
        personaManagerInstance = new PersonaManager(config);
    }
    return personaManagerInstance;
}

export async function initializePersonaManager(config?: Partial<PersonaConfig>): Promise<PersonaManager> {
    const manager = getPersonaManager(config);
    await manager.load();
    return manager;
}

export function resetPersonaManager(): void {
    personaManagerInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

export const BUILTIN_PERSONAS = {
    DEFAULT: DEFAULT_JARVIS_PERSONA,
    DEVELOPER: DEVELOPER_PERSONA,
    CASUAL: CASUAL_PERSONA,
    FORMAL: FORMAL_PERSONA,
};
