/**
 * JARVIS Researcher Agent
 * 
 * Specialized agent for information gathering and research:
 * - Web search and content extraction
 * - Document analysis and summarization
 * - Fact-checking and source verification
 * - Knowledge synthesis
 */

import { Agent, type AgentOptions } from './Agent.js';
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

export class ResearcherAgent extends Agent {
    private maxSearchResults: number;

    constructor(options: ResearcherAgentOptions = {}) {
        super({
            name: 'ResearcherAgent',
            systemPrompt: RESEARCHER_AGENT_SYSTEM_PROMPT,
            memory: options.memory,
            onApprovalRequired: options.onApprovalRequired,
            maxIterations: 15,
        });

        this.maxSearchResults = options.maxSearchResults ?? 10;

        // Register research-specific tools
        this.registerResearchTools();

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

    // ─────────────────────────────────────────────────────────────────────────────
    // Research Tools
    // ─────────────────────────────────────────────────────────────────────────────

    private registerResearchTools(): void {
        // Web search tool
        this.registerTool(
            {
                name: 'web_search',
                description: 'Search the web for information using a search engine',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query',
                        },
                        maxResults: {
                            type: 'number',
                            description: `Maximum number of results (default: ${this.maxSearchResults})`,
                        },
                        domain: {
                            type: 'string',
                            description: 'Limit search to a specific domain (e.g., "stackoverflow.com")',
                        },
                        timeRange: {
                            type: 'string',
                            description: 'Time range filter',
                            enum: ['day', 'week', 'month', 'year', 'all'],
                        },
                    },
                    required: ['query'],
                },
                category: 'web',
            },
            async (args) => {
                const { query, maxResults, domain, timeRange } = args as {
                    query: string;
                    maxResults?: number;
                    domain?: string;
                    timeRange?: string;
                };
                logger.tool('web_search', 'Searching', { query, domain, timeRange });
                return {
                    status: 'not_implemented',
                    message: 'Web search will be implemented in the Skills layer',
                };
            }
        );

        // Read webpage tool
        this.registerTool(
            {
                name: 'read_webpage',
                description: 'Extract and read content from a webpage URL',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to read',
                        },
                        extractType: {
                            type: 'string',
                            description: 'Type of content to extract',
                            enum: ['text', 'article', 'links', 'metadata', 'full'],
                        },
                        selector: {
                            type: 'string',
                            description: 'CSS selector to extract specific content',
                        },
                    },
                    required: ['url'],
                },
                category: 'web',
            },
            async (args) => {
                const { url, extractType, selector } = args as {
                    url: string;
                    extractType?: string;
                    selector?: string;
                };
                logger.tool('read_webpage', 'Reading', { url, extractType });
                return {
                    status: 'not_implemented',
                    message: 'Web reading will be implemented in the Skills layer',
                };
            }
        );

        // Summarize content tool
        this.registerTool(
            {
                name: 'summarize',
                description: 'Summarize a piece of text or document',
                parameters: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            description: 'The content to summarize',
                        },
                        length: {
                            type: 'string',
                            description: 'Desired summary length',
                            enum: ['brief', 'medium', 'detailed'],
                        },
                        focus: {
                            type: 'string',
                            description: 'Specific aspect to focus on',
                        },
                    },
                    required: ['content'],
                },
                category: 'system',
            },
            async (args) => {
                const { content, length, focus } = args as {
                    content: string;
                    length?: string;
                    focus?: string;
                };
                logger.tool('summarize', 'Summarizing', {
                    contentLength: content.length,
                    length,
                    focus
                });
                // This could use the LLM to summarize
                return {
                    status: 'not_implemented',
                    message: 'Summarization will use the LLM provider in the Skills layer',
                };
            }
        );

        // Verify fact tool
        this.registerTool(
            {
                name: 'verify_fact',
                description: 'Attempt to verify a factual claim across multiple sources',
                parameters: {
                    type: 'object',
                    properties: {
                        claim: {
                            type: 'string',
                            description: 'The factual claim to verify',
                        },
                        sources: {
                            type: 'number',
                            description: 'Number of sources to check (default: 3)',
                        },
                    },
                    required: ['claim'],
                },
                category: 'web',
            },
            async (args) => {
                const { claim, sources } = args as { claim: string; sources?: number };
                logger.tool('verify_fact', 'Verifying', { claim, sources });
                return {
                    status: 'not_implemented',
                    message: 'Fact verification will be implemented in the Skills layer',
                };
            }
        );

        // Save research tool
        this.registerTool(
            {
                name: 'save_research',
                description: 'Save research findings to memory for future reference',
                parameters: {
                    type: 'object',
                    properties: {
                        topic: {
                            type: 'string',
                            description: 'Topic or title of the research',
                        },
                        findings: {
                            type: 'string',
                            description: 'Key findings to save',
                        },
                        sources: {
                            type: 'array',
                            description: 'List of source URLs',
                            items: { type: 'string', description: 'Source URL' },
                        },
                        tags: {
                            type: 'array',
                            description: 'Tags for categorization',
                            items: { type: 'string', description: 'Tag' },
                        },
                    },
                    required: ['topic', 'findings'],
                },
                category: 'memory',
            },
            async (args) => {
                const { topic, findings, sources, tags } = args as {
                    topic: string;
                    findings: string;
                    sources?: string[];
                    tags?: string[];
                };
                logger.tool('save_research', 'Saving', { topic, tags });
                return {
                    status: 'not_implemented',
                    message: 'Will integrate with MemoryManager',
                };
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════

export function createResearcherAgent(options: ResearcherAgentOptions = {}): ResearcherAgent {
    return new ResearcherAgent(options);
}
