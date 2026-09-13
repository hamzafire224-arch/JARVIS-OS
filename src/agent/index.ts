/**
 * JARVIS Agent Exports
 */

// Core Agent
export { Agent, type AgentOptions } from './Agent.js';
export { MainAgent, createMainAgent, type MainAgentOptions } from './MainAgent.js';
export { SkillAwareAgent, createSkillAgent, type SkillAwareAgentOptions, type CreateSkillAgentOptions } from './SkillAwareAgent.js';

// Specialized Sub-Agents
export { CoderAgent, createCoderAgent, type CoderAgentOptions } from './CoderAgent.js';
export { ResearcherAgent, createResearcherAgent, type ResearcherAgentOptions } from './ResearcherAgent.js';
export { PersonalAgent, createPersonalAgent, type PersonalAgentOptions } from './PersonalAgent.js';

// Agent Registry and Routing
export {
    AgentRegistry,
    AgentRouter,
    IntentClassifier,
    getAgentRegistry,
    getAgentRouter,
    initializeAgents,
    resetAgentSingletons,
    type Intent,
    type SubAgentInitOptions,
} from './AgentRegistry.js';

// Types
export * from './types.js';
