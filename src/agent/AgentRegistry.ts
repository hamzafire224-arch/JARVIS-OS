/**
 * JARVIS Agent Registry
 * 
 * Multi-agent routing system for the productivity variant:
 * - Registers specialized sub-agents
 * - Routes requests based on intent classification
 * - Provides context isolation between agents
 * - Supports hierarchical delegation
 */

import type { Agent } from './Agent.js';
import type { AgentMetadata, AgentType } from './types.js';
import { logger } from '../utils/logger.js';
import { AgentNotFoundError } from '../utils/errors.js';
import { isProductivityVariant } from '../config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Intent Classification
// ═══════════════════════════════════════════════════════════════════════════════

export interface Intent {
    category: 'coding' | 'research' | 'personal' | 'system' | 'general';
    confidence: number;
    keywords: string[];
    suggestedAgent?: string;
}

// Intent keywords for classification
const INTENT_PATTERNS: Record<Intent['category'], string[]> = {
    coding: [
        'code', 'program', 'debug', 'fix', 'implement', 'function', 'class', 'api',
        'bug', 'error', 'compile', 'build', 'test', 'deploy', 'git', 'commit',
        'typescript', 'javascript', 'python', 'react', 'node', 'database', 'sql',
    ],
    research: [
        'search', 'find', 'look up', 'research', 'what is', 'how does', 'explain',
        'compare', 'analyze', 'summarize', 'article', 'documentation', 'learn',
    ],
    personal: [
        'email', 'calendar', 'schedule', 'meeting', 'remind', 'todo', 'task',
        'appointment', 'birthday', 'flight', 'travel', 'book', 'reservation',
    ],
    system: [
        'file', 'folder', 'directory', 'terminal', 'command', 'install', 'update',
        'disk', 'memory', 'process', 'system', 'settings', 'config',
    ],
    general: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Registry
// ═══════════════════════════════════════════════════════════════════════════════

export class AgentRegistry {
    private agents: Map<string, Agent> = new Map();
    private agentsByType: Map<AgentType, Agent[]> = new Map();

    constructor() {
        // Initialize type buckets
        for (const type of ['main', 'researcher', 'coder', 'personal', 'custom'] as AgentType[]) {
            this.agentsByType.set(type, []);
        }
    }

    /**
     * Register an agent
     */
    register(agent: Agent): void {
        const metadata = agent.getMetadata();

        this.agents.set(metadata.name, agent);

        const typeAgents = this.agentsByType.get(metadata.type) ?? [];
        typeAgents.push(agent);
        this.agentsByType.set(metadata.type, typeAgents);

        logger.agent(`Registered agent: ${metadata.name}`, { type: metadata.type });
    }

    /**
     * Get an agent by name
     */
    get(name: string): Agent {
        const agent = this.agents.get(name);
        if (!agent) {
            throw new AgentNotFoundError(name);
        }
        return agent;
    }

    /**
     * Check if an agent exists
     */
    has(name: string): boolean {
        return this.agents.has(name);
    }

    /**
     * Get all agents of a specific type
     */
    getByType(type: AgentType): Agent[] {
        return this.agentsByType.get(type) ?? [];
    }

    /**
     * Get all registered agents
     */
    getAll(): Agent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get metadata for all agents
     */
    getAllMetadata(): AgentMetadata[] {
        return this.getAll().map(agent => agent.getMetadata());
    }

    /**
     * Unregister an agent
     */
    unregister(name: string): boolean {
        const agent = this.agents.get(name);
        if (!agent) return false;

        const metadata = agent.getMetadata();
        this.agents.delete(name);

        // Remove from type bucket
        const typeAgents = this.agentsByType.get(metadata.type) ?? [];
        const index = typeAgents.indexOf(agent);
        if (index > -1) {
            typeAgents.splice(index, 1);
        }

        logger.agent(`Unregistered agent: ${name}`);
        return true;
    }

    /**
     * Clear all agents
     */
    clear(): void {
        this.agents.clear();
        for (const type of this.agentsByType.keys()) {
            this.agentsByType.set(type, []);
        }
        logger.agent('Agent registry cleared');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Intent Classifier
// ═══════════════════════════════════════════════════════════════════════════════

export class IntentClassifier {
    /**
     * Classify user intent based on message content
     */
    classify(message: string): Intent {
        const lowerMessage = message.toLowerCase();
        const words = lowerMessage.split(/\s+/);

        const scores: Record<Intent['category'], number> = {
            coding: 0,
            research: 0,
            personal: 0,
            system: 0,
            general: 0,
        };

        const matchedKeywords: Record<Intent['category'], string[]> = {
            coding: [],
            research: [],
            personal: [],
            system: [],
            general: [],
        };

        // Score each category based on keyword matches
        for (const [category, patterns] of Object.entries(INTENT_PATTERNS)) {
            for (const pattern of patterns) {
                if (lowerMessage.includes(pattern)) {
                    scores[category as Intent['category']]++;
                    matchedKeywords[category as Intent['category']].push(pattern);
                }
            }
        }

        // Find the category with highest score
        let maxCategory: Intent['category'] = 'general';
        let maxScore = 0;

        for (const [category, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                maxCategory = category as Intent['category'];
            }
        }

        // Calculate confidence (0-1)
        const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
        const confidence = totalMatches > 0
            ? maxScore / Math.max(totalMatches, 3) // Normalize with minimum denominator
            : 0.5; // Default confidence for general

        // Map category to suggested agent
        const suggestedAgent = this.getCategorySuggestedAgent(maxCategory);

        return {
            category: maxCategory,
            confidence: Math.min(confidence, 1),
            keywords: matchedKeywords[maxCategory],
            suggestedAgent,
        };
    }

    private getCategorySuggestedAgent(category: Intent['category']): string | undefined {
        switch (category) {
            case 'coding':
                return 'CoderAgent';
            case 'research':
                return 'ResearcherAgent';
            case 'personal':
                return 'PersonalAgent';
            default:
                return undefined;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Router
// ═══════════════════════════════════════════════════════════════════════════════

export class AgentRouter {
    private registry: AgentRegistry;
    private classifier: IntentClassifier;
    private defaultAgentName: string;

    constructor(registry: AgentRegistry, defaultAgentName: string = 'JARVIS') {
        this.registry = registry;
        this.classifier = new IntentClassifier();
        this.defaultAgentName = defaultAgentName;
    }

    /**
     * Route a message to the appropriate agent
     */
    route(message: string): { agent: Agent; intent: Intent } {
        // In balanced variant (lightweight), always use main agent
        if (!isProductivityVariant()) {
            return {
                agent: this.registry.get(this.defaultAgentName),
                intent: { category: 'general', confidence: 1, keywords: [] },
            };
        }

        // Classify intent
        const intent = this.classifier.classify(message);

        logger.agent('Intent classified', {
            category: intent.category,
            confidence: intent.confidence,
            suggestedAgent: intent.suggestedAgent,
        });

        // Try to get suggested agent, fall back to default
        let agent: Agent;

        if (intent.suggestedAgent && intent.confidence > 0.6 && this.registry.has(intent.suggestedAgent)) {
            agent = this.registry.get(intent.suggestedAgent);
            logger.agent(`Routed to specialized agent: ${intent.suggestedAgent}`);
        } else {
            agent = this.registry.get(this.defaultAgentName);
            logger.agent(`Routed to default agent: ${this.defaultAgentName}`);
        }

        return { agent, intent };
    }

    /**
     * Force route to a specific agent
     */
    routeTo(agentName: string): Agent {
        return this.registry.get(agentName);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instances
// ═══════════════════════════════════════════════════════════════════════════════

let registryInstance: AgentRegistry | null = null;
let routerInstance: AgentRouter | null = null;

export function getAgentRegistry(): AgentRegistry {
    if (!registryInstance) {
        registryInstance = new AgentRegistry();
    }
    return registryInstance;
}

export function getAgentRouter(): AgentRouter {
    if (!routerInstance) {
        routerInstance = new AgentRouter(getAgentRegistry());
    }
    return routerInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Agent Initialization
// ═══════════════════════════════════════════════════════════════════════════════

import { CoderAgent, type CoderAgentOptions } from './CoderAgent.js';
import { ResearcherAgent, type ResearcherAgentOptions } from './ResearcherAgent.js';
import { PersonalAgent, type PersonalAgentOptions } from './PersonalAgent.js';
import { MainAgent, type MainAgentOptions } from './MainAgent.js';
import type { ApprovalCallback } from './types.js';

export interface SubAgentInitOptions {
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
    workspaceDir?: string;
    userTimezone?: string;
}

/**
 * Initialize and register all agents for the productivity variant.
 * Creates MainAgent + specialized sub-agents.
 */
export function initializeAgents(options: SubAgentInitOptions = {}): {
    mainAgent: MainAgent;
    registry: AgentRegistry;
    router: AgentRouter;
} {
    const registry = getAgentRegistry();
    const router = getAgentRouter();

    // Create MainAgent
    const mainAgent = new MainAgent({
        memory: options.memory,
        onApprovalRequired: options.onApprovalRequired,
    });
    registry.register(mainAgent);

    // Only register sub-agents in productivity variant (full power)
    if (isProductivityVariant()) {
        // Create and register CoderAgent
        const coderAgent = new CoderAgent({
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            workspaceDir: options.workspaceDir,
        });
        registry.register(coderAgent);

        // Create and register ResearcherAgent
        const researcherAgent = new ResearcherAgent({
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
        });
        registry.register(researcherAgent);

        // Create and register PersonalAgent
        const personalAgent = new PersonalAgent({
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            userTimezone: options.userTimezone,
        });
        registry.register(personalAgent);

        logger.agent('Initialized productivity variant with sub-agents', {
            agents: registry.getAllMetadata().map(m => m.name),
        });
    } else {
        logger.agent('Initialized balanced variant (single agent)');
    }

    return { mainAgent, registry, router };
}

/**
 * Reset all agent singletons (useful for testing)
 */
export function resetAgentSingletons(): void {
    if (registryInstance) {
        registryInstance.clear();
    }
    registryInstance = null;
    routerInstance = null;
}

