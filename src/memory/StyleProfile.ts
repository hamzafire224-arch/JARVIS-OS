/**
 * JARVIS Style Profile (AGI Feature 2.2)
 * 
 * Distills user coding style preferences from interaction history:
 * - Naming conventions (camelCase, snake_case, PascalCase)
 * - Indentation (tabs vs spaces, width)
 * - Framework preferences (React, Vue, Express, etc.)
 * - Language preferences (TypeScript, Python, etc.)
 * - Code patterns (functional vs OOP, async/await vs promises)
 * - Comment style and documentation level
 * 
 * Feeds into the system prompt at runtime to personalize responses.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeStylePreferences {
    naming: {
        variables: 'camelCase' | 'snake_case' | 'unknown';
        functions: 'camelCase' | 'snake_case' | 'unknown';
        classes: 'PascalCase' | 'unknown';
        files: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case' | 'unknown';
        confidence: number; // 0-1
    };
    formatting: {
        indentation: 'tabs' | 'spaces' | 'unknown';
        indentWidth: 2 | 4 | 'unknown';
        semicolons: boolean | 'unknown';
        singleQuotes: boolean | 'unknown';
        trailingComma: boolean | 'unknown';
        confidence: number;
    };
    patterns: {
        paradigm: 'functional' | 'oop' | 'mixed' | 'unknown';
        asyncStyle: 'async-await' | 'promises' | 'callbacks' | 'unknown';
        errorHandling: 'try-catch' | 'result-type' | 'unknown';
        stateManagement: string | 'unknown'; // e.g., "zustand", "redux", "context"
        confidence: number;
    };
    frameworks: {
        frontend: string[];    // e.g., ["react", "next.js"]
        backend: string[];     // e.g., ["express", "fastify"]
        testing: string[];     // e.g., ["vitest", "jest"]
        languages: string[];   // e.g., ["typescript", "python"]
        confidence: number;
    };
    documentation: {
        level: 'minimal' | 'moderate' | 'extensive' | 'unknown';
        jsdoc: boolean | 'unknown';
        inlineComments: boolean | 'unknown';
        confidence: number;
    };
}

interface StyleProfileData {
    version: string;
    userId: string;
    profile: CodeStylePreferences;
    observations: StyleObservation[];
    updatedAt: string;
}

interface StyleObservation {
    timestamp: string;
    category: keyof CodeStylePreferences;
    signal: string;
    value: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Profile
// ═══════════════════════════════════════════════════════════════════════════════

function createDefaultProfile(): CodeStylePreferences {
    return {
        naming: { variables: 'unknown', functions: 'unknown', classes: 'PascalCase', files: 'unknown', confidence: 0 },
        formatting: { indentation: 'unknown', indentWidth: 'unknown', semicolons: 'unknown', singleQuotes: 'unknown', trailingComma: 'unknown', confidence: 0 },
        patterns: { paradigm: 'unknown', asyncStyle: 'unknown', errorHandling: 'unknown', stateManagement: 'unknown', confidence: 0 },
        frameworks: { frontend: [], backend: [], testing: [], languages: [], confidence: 0 },
        documentation: { level: 'unknown', jsdoc: 'unknown', inlineComments: 'unknown', confidence: 0 },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Style Profile Manager
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PATH = resolve('./data/memory/style_profile.json');
const MAX_OBSERVATIONS = 200;

export class StyleProfileManager {
    private filePath: string;
    private data: StyleProfileData | null = null;
    private isDirty = false;

    constructor(filePath?: string) {
        this.filePath = filePath ?? DEFAULT_PATH;
    }

    async initialize(userId: string = 'default'): Promise<void> {
        if (this.data) return;

        if (existsSync(this.filePath)) {
            try {
                const content = await readFile(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
                logger.info('[STYLE-PROFILE] Loaded', { observations: this.data!.observations.length });
                return;
            } catch {
                // Corrupted — recreate
            }
        }

        this.data = {
            version: '1.0.0',
            userId,
            profile: createDefaultProfile(),
            observations: [],
            updatedAt: new Date().toISOString(),
        };
        await this.save();
        logger.info('[STYLE-PROFILE] Created default profile');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Learning from Code
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Analyze a code snippet to extract style signals.
     * Called implicitly when user shares code or JARVIS reads user files.
     */
    async learnFromCode(code: string): Promise<void> {
        await this.ensureLoaded();

        // Detect indentation
        const tabLines = (code.match(/^\t/gm) || []).length;
        const spaceLines = (code.match(/^ {2,}/gm) || []).length;
        if (tabLines > spaceLines && tabLines > 3) {
            this.addObservation('formatting', 'indentation', 'tabs');
        } else if (spaceLines > tabLines && spaceLines > 3) {
            this.addObservation('formatting', 'indentation', 'spaces');
            const twoSpaces = (code.match(/^ {2}[^ ]/gm) || []).length;
            const fourSpaces = (code.match(/^ {4}[^ ]/gm) || []).length;
            this.addObservation('formatting', 'indentWidth', twoSpaces > fourSpaces ? '2' : '4');
        }

        // Detect semicolons
        const withSemicolons = (code.match(/;\s*$/gm) || []).length;
        const withoutSemicolons = (code.match(/[^;{}\s]\s*$/gm) || []).length;
        if (withSemicolons > withoutSemicolons * 2) {
            this.addObservation('formatting', 'semicolons', 'true');
        } else if (withoutSemicolons > withSemicolons * 2) {
            this.addObservation('formatting', 'semicolons', 'false');
        }

        // Detect quote style
        const singleQuotes = (code.match(/'/g) || []).length;
        const doubleQuotes = (code.match(/"/g) || []).length;
        if (singleQuotes > doubleQuotes * 1.5) {
            this.addObservation('formatting', 'singleQuotes', 'true');
        } else if (doubleQuotes > singleQuotes * 1.5) {
            this.addObservation('formatting', 'singleQuotes', 'false');
        }

        // Detect naming conventions
        const camelCaseVars = (code.match(/(?:const|let|var)\s+[a-z][a-zA-Z0-9]*/g) || []).length;
        const snakeCaseVars = (code.match(/(?:const|let|var)\s+[a-z][a-z0-9_]*/g) || []).length;
        if (camelCaseVars > snakeCaseVars * 1.5) {
            this.addObservation('naming', 'variables', 'camelCase');
        } else if (snakeCaseVars > camelCaseVars * 1.5) {
            this.addObservation('naming', 'variables', 'snake_case');
        }

        // Detect async pattern
        if (code.includes('async') && code.includes('await')) {
            this.addObservation('patterns', 'asyncStyle', 'async-await');
        } else if (code.includes('.then(')) {
            this.addObservation('patterns', 'asyncStyle', 'promises');
        }

        // Detect paradigm
        const classCount = (code.match(/\bclass\s+/g) || []).length;
        const arrowFnCount = (code.match(/=>/g) || []).length;
        if (classCount > 2) {
            this.addObservation('patterns', 'paradigm', 'oop');
        } else if (arrowFnCount > 5 && classCount === 0) {
            this.addObservation('patterns', 'paradigm', 'functional');
        }

        // Detect frameworks
        const frameworkSignals: Record<string, string[]> = {
            react: ['import React', 'from \'react\'', 'useState', 'useEffect', 'jsx', '<div'],
            nextjs: ['from \'next', 'getServerSideProps', 'getStaticProps', 'NextPage'],
            vue: ['from \'vue\'', 'defineComponent', 'ref(', '<template>'],
            express: ['express()', 'app.get(', 'app.post(', 'req, res'],
            fastify: ['from \'fastify\'', 'fastify('],
            vitest: ['from \'vitest\'', 'describe(', 'it(', 'expect('],
            jest: ['from \'jest\'', 'describe(', 'it(', 'expect('],
            typescript: [': string', ': number', 'interface ', 'type '],
            python: ['def ', 'import ', 'class ', 'self.'],
        };

        for (const [framework, signals] of Object.entries(frameworkSignals)) {
            const matchCount = signals.filter(s => code.includes(s)).length;
            if (matchCount >= 2) {
                const category = ['react', 'nextjs', 'vue'].includes(framework) ? 'frontend' :
                    ['express', 'fastify'].includes(framework) ? 'backend' :
                    ['vitest', 'jest'].includes(framework) ? 'testing' : 'languages';
                this.addObservation('frameworks', category, framework);
            }
        }

        // Detect documentation level
        const jsdocCount = (code.match(/\/\*\*/g) || []).length;
        const inlineComments = (code.match(/\/\/.+/g) || []).length;
        const codeLines = code.split('\n').length;

        if (jsdocCount > 0) this.addObservation('documentation', 'jsdoc', 'true');
        if (inlineComments / codeLines > 0.15) {
            this.addObservation('documentation', 'level', 'extensive');
        } else if (inlineComments / codeLines > 0.05) {
            this.addObservation('documentation', 'level', 'moderate');
        } else {
            this.addObservation('documentation', 'level', 'minimal');
        }

        this.rebuildProfile();
        await this.save();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Profile Access
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get augmentation text for the system prompt.
     * Only includes preferences with sufficient confidence.
     */
    async getAugmentation(): Promise<string> {
        await this.ensureLoaded();
        const p = this.data!.profile;
        const parts: string[] = [];

        // Naming
        if (p.naming.confidence >= 0.5) {
            const details: string[] = [];
            if (p.naming.variables !== 'unknown') details.push(`variables: ${p.naming.variables}`);
            if (p.naming.functions !== 'unknown') details.push(`functions: ${p.naming.functions}`);
            if (p.naming.files !== 'unknown') details.push(`files: ${p.naming.files}`);
            if (details.length > 0) parts.push(`Naming: ${details.join(', ')}`);
        }

        // Formatting
        if (p.formatting.confidence >= 0.5) {
            const details: string[] = [];
            if (p.formatting.indentation !== 'unknown') {
                const indent = p.formatting.indentation === 'spaces' && p.formatting.indentWidth !== 'unknown'
                    ? `${p.formatting.indentWidth} spaces` : p.formatting.indentation;
                details.push(`indent: ${indent}`);
            }
            if (p.formatting.semicolons !== 'unknown') details.push(`semicolons: ${p.formatting.semicolons ? 'yes' : 'no'}`);
            if (p.formatting.singleQuotes !== 'unknown') details.push(`quotes: ${p.formatting.singleQuotes ? 'single' : 'double'}`);
            if (details.length > 0) parts.push(`Formatting: ${details.join(', ')}`);
        }

        // Frameworks
        if (p.frameworks.confidence >= 0.3 && (p.frameworks.frontend.length > 0 || p.frameworks.backend.length > 0)) {
            const all = [...p.frameworks.frontend, ...p.frameworks.backend, ...p.frameworks.testing].slice(0, 8);
            parts.push(`Tech stack: ${all.join(', ')}`);
        }

        // Patterns
        if (p.patterns.confidence >= 0.4) {
            const details: string[] = [];
            if (p.patterns.paradigm !== 'unknown') details.push(`style: ${p.patterns.paradigm}`);
            if (p.patterns.asyncStyle !== 'unknown') details.push(`async: ${p.patterns.asyncStyle}`);
            if (details.length > 0) parts.push(`Patterns: ${details.join(', ')}`);
        }

        // Documentation
        if (p.documentation.confidence >= 0.4 && p.documentation.level !== 'unknown') {
            parts.push(`Documentation: ${p.documentation.level}`);
        }

        if (parts.length === 0) return '';

        return `\n## User Code Style (learned from past interactions)\n${parts.map(p => `- ${p}`).join('\n')}`;
    }

    getProfile(): CodeStylePreferences | null {
        return this.data?.profile ?? null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────────

    private addObservation(category: keyof CodeStylePreferences, signal: string, value: string): void {
        if (!this.data) return;

        this.data.observations.push({
            timestamp: new Date().toISOString(),
            category,
            signal,
            value,
        });

        // Trim old observations
        if (this.data.observations.length > MAX_OBSERVATIONS) {
            this.data.observations = this.data.observations.slice(-MAX_OBSERVATIONS);
        }

        this.isDirty = true;
    }

    /**
     * Rebuild profile from accumulated observations using majority voting.
     */
    private rebuildProfile(): void {
        if (!this.data) return;

        const p = this.data.profile;
        const obs = this.data.observations;

        // Helper: get most common value for a category+signal pair
        const majority = (cat: string, sig: string): { value: string; confidence: number } => {
            const relevant = obs.filter(o => o.category === cat && o.signal === sig);
            if (relevant.length === 0) return { value: 'unknown', confidence: 0 };

            const counts = new Map<string, number>();
            for (const o of relevant) {
                counts.set(o.value, (counts.get(o.value) ?? 0) + 1);
            }

            let maxVal = 'unknown';
            let maxCount = 0;
            for (const [v, c] of counts) {
                if (c > maxCount) { maxVal = v; maxCount = c; }
            }

            return { value: maxVal, confidence: Math.min(maxCount / 10, 1) };
        };

        // Rebuild naming
        const varNaming = majority('naming', 'variables');
        p.naming.variables = varNaming.value as typeof p.naming.variables;
        p.naming.functions = (majority('naming', 'functions').value || varNaming.value) as typeof p.naming.functions;
        p.naming.files = majority('naming', 'files').value as typeof p.naming.files;
        p.naming.confidence = varNaming.confidence;

        // Rebuild formatting
        const indent = majority('formatting', 'indentation');
        p.formatting.indentation = indent.value as typeof p.formatting.indentation;
        p.formatting.indentWidth = (majority('formatting', 'indentWidth').value === '2' ? 2 : majority('formatting', 'indentWidth').value === '4' ? 4 : 'unknown') as typeof p.formatting.indentWidth;
        p.formatting.semicolons = majority('formatting', 'semicolons').value === 'true' ? true : majority('formatting', 'semicolons').value === 'false' ? false : 'unknown';
        p.formatting.singleQuotes = majority('formatting', 'singleQuotes').value === 'true' ? true : majority('formatting', 'singleQuotes').value === 'false' ? false : 'unknown';
        p.formatting.confidence = indent.confidence;

        // Rebuild patterns
        p.patterns.paradigm = majority('patterns', 'paradigm').value as typeof p.patterns.paradigm;
        p.patterns.asyncStyle = majority('patterns', 'asyncStyle').value as typeof p.patterns.asyncStyle;
        p.patterns.confidence = majority('patterns', 'paradigm').confidence;

        // Rebuild frameworks (collect unique values)
        const collectFrameworks = (sig: string): string[] => {
            const relevant = obs.filter(o => o.category === 'frameworks' && o.signal === sig);
            return [...new Set(relevant.map(o => o.value))];
        };
        p.frameworks.frontend = collectFrameworks('frontend');
        p.frameworks.backend = collectFrameworks('backend');
        p.frameworks.testing = collectFrameworks('testing');
        p.frameworks.languages = collectFrameworks('languages');
        p.frameworks.confidence = Math.min(obs.filter(o => o.category === 'frameworks').length / 10, 1);

        // Rebuild documentation
        p.documentation.level = majority('documentation', 'level').value as typeof p.documentation.level;
        p.documentation.jsdoc = majority('documentation', 'jsdoc').value === 'true' ? true : 'unknown';
        p.documentation.confidence = majority('documentation', 'level').confidence;

        this.data.updatedAt = new Date().toISOString();
    }

    private async ensureLoaded(): Promise<void> {
        if (!this.data) await this.initialize();
    }

    private async save(): Promise<void> {
        if (!this.data) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
        this.isDirty = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: StyleProfileManager | null = null;

export function getStyleProfile(): StyleProfileManager {
    if (!instance) {
        instance = new StyleProfileManager();
    }
    return instance;
}
