/**
 * JARVIS Soul Module Exports
 * 
 * The soul defines JARVIS's identity, values, and learned behaviors.
 */

export {
    FeedbackManager,
    getFeedbackManager,
    initializeFeedbackManager,
    resetFeedbackManager,
    type FeedbackType,
    type FeedbackCategory,
    type FeedbackEntry,
    type FeedbackPattern,
    type SoulModification,
    type LearnedBehavior,
} from './FeedbackManager.js';

export {
    PersonaManager,
    getPersonaManager,
    initializePersonaManager,
    resetPersonaManager,
    BUILTIN_PERSONAS,
    type Persona,
    type PersonaContext,
    type PersonaConfig,
} from './PersonaManager.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Soul Loading Utilities
// ═══════════════════════════════════════════════════════════════════════════════

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load the SOUL.md content for inclusion in agent prompts
 */
export async function loadSoulContent(): Promise<string> {
    try {
        const soulPath = join(__dirname, 'SOUL.md');
        return await fs.readFile(soulPath, 'utf-8');
    } catch (error) {
        console.error('Failed to load SOUL.md:', error);
        return '';
    }
}

/**
 * Get just the core identity section from SOUL.md
 */
export async function loadSoulIdentity(): Promise<string> {
    const content = await loadSoulContent();

    // Extract identity section
    const identityStart = content.indexOf('## Identity');
    const coreValuesStart = content.indexOf('## Core Values');

    if (identityStart !== -1 && coreValuesStart !== -1) {
        return content.slice(identityStart, coreValuesStart).trim();
    }

    return '';
}

/**
 * Get behavioral guidelines from SOUL.md
 */
export async function loadSoulBehaviors(): Promise<string> {
    const content = await loadSoulContent();

    // Extract behavioral sections
    const sections = [
        '## Communication Style',
        '## Behavioral Boundaries',
    ];

    let result = '';

    for (const section of sections) {
        const start = content.indexOf(section);
        if (start !== -1) {
            const nextSection = content.indexOf('\n## ', start + 1);
            const end = nextSection === -1 ? content.length : nextSection;
            result += content.slice(start, end) + '\n';
        }
    }

    return result.trim();
}
