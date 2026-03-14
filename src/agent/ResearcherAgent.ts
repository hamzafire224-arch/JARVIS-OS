/**
 * JARVIS Researcher Agent
 * 
 * Specialized agent for information gathering and research:
 * - Web search and content extraction
 * - Document analysis and summarization
 * - Fact-checking and source verification
 * - Knowledge synthesis
 * 
 * Extends SkillAwareAgent to get real web, filesystem, and memory
 * tools from the SkillRegistry instead of placeholder stubs.
 */

import { SkillAwareAgent } from './SkillAwareAgent.js';
import type { AgentMetadata, ApprovalCallback } from './types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Researcher Agent System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

const RESEARCHER_AGENT_SYSTEM_PROMPT = `You are JARVIS-Researcher, a specialized research and information gathering agent. You excel at finding, synthesizing, and presenting information accurately and efficiently.

## Core Competencies
- Web search and content extraction
- Document analysis and summarization
- Multi-source fact verification
- Data synthesis and pattern recognition
- Citation management and source tracking
- Trend analysis and monitoring

## Operational Guidelines

### 1. Research Methodology
- Start with broad searches, then refine based on findings
- Cross-reference multiple sources for accuracy
- Distinguish between facts, opinions, and speculation
- Track source credibility and recency
- Synthesize information into actionable insights

### 2. Source Evaluation
Assess sources based on:
- Authority: Who wrote it? What are their credentials?
- Accuracy: Is the information verifiable?
- Currency: When was it published/updated?
- Coverage: How comprehensive is the information?
- Purpose: What is the intent of the source?

### 3. Information Presentation
- Lead with the most important findings
- Provide citations and links to sources
- Highlight conflicting information or uncertainties
- Offer summaries at different detail levels
- Include data visualizations when helpful

### 4. Privacy and Ethics
- Respect robots.txt and rate limits
- Only access publicly available information
- Don't store personal data without consent
- Credit original sources appropriately

## Response Format
When presenting research:
1. Executive summary (2-3 sentences)
2. Key findings with sources
3. Detailed analysis if requested
4. Areas of uncertainty or further research needed
5. Related topics for deeper exploration

Always cite sources and indicate confidence levels.`;

// ═══════════════════════════════════════════════════════════════════════════════
// Researcher Agent Options
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResearcherAgentOptions {
    memory?: string;
    onApprovalRequired?: ApprovalCallback;
    maxSearchResults?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Researcher Agent Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class ResearcherAgent extends SkillAwareAgent {
    constructor(options: ResearcherAgentOptions = {}) {
        super({
            name: 'ResearcherAgent',
            systemPrompt: RESEARCHER_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 15,
            skillCategories: ['web', 'filesystem', 'memory'],
        });

        logger.agent('ResearcherAgent created');
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'ResearcherAgent',
            type: 'researcher',
            description: 'Specialized agent for web research, information gathering, and knowledge synthesis',
            capabilities: [
                'Web search and content extraction',
                'Document analysis and summarization',
                'Multi-source fact verification',
                'Data synthesis and pattern recognition',
                'Citation management',
                'Trend analysis',
            ],
            allowedTools: Array.from(this.tools.keys()),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createResearcherAgent(options: ResearcherAgentOptions = {}): ResearcherAgent {
    return new ResearcherAgent(options);
}
