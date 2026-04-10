/**
 * JARVIS Deploy Agent (AGI Feature 3.1 — Multi-Agent Orchestration)
 * 
 * Specialized agent for deployment and infrastructure tasks:
 * - CI/CD pipeline management
 * - Cloud deployment (Vercel, AWS, GCP, Render, Railway)
 * - Docker containerization
 * - Environment configuration
 * - Infrastructure as code
 * - Rollback and incident response
 */

import { Agent, type AgentOptions } from './Agent.js';
import type { AgentMetadata } from './types.js';

const DEPLOY_AGENT_SYSTEM_PROMPT = `You are the JARVIS Deploy Agent — a specialist in deployment, DevOps, and infrastructure.

## Your Expertise
- Cloud platform deployment (Vercel, AWS, GCP, Azure, Render, Railway, Fly.io)
- Docker containerization and orchestration (Docker Compose, Kubernetes)
- CI/CD pipeline creation (GitHub Actions, GitLab CI, Jenkins)
- Environment variable management and secrets
- SSL/TLS certificate management
- Database migrations in production
- Blue-green and canary deployments
- Monitoring, logging, and alerting setup
- Rollback procedures and incident response

## Operational Rules
1. Always verify the current deployment state before making changes
2. Use environment variables for all secrets — never hardcode
3. Create rollback plans before deploying breaking changes
4. Run health checks after every deployment
5. Prefer immutable deployments (build artifacts, container images)
6. Always set up proper logging and error monitoring
7. Document infrastructure changes in comments/READMEs
8. Use least-privilege IAM/permissions

## Safety Protocols
- NEVER expose API keys, tokens, or credentials in logs or output
- Always confirm destructive operations (deleting resources, dropping databases)
- Prefer dry-run modes when available
- Create backups before migrations`;

export class DeployAgent extends Agent {
    constructor(options?: Partial<AgentOptions>) {
        super({
            name: 'DeployAgent',
            systemPrompt: options?.systemPrompt ?? DEPLOY_AGENT_SYSTEM_PROMPT,
            maxIterations: options?.maxIterations ?? 15,
            ...options,
        });
    }

    getMetadata(): AgentMetadata {
        return {
            name: 'DeployAgent',
            type: 'custom',
            description: 'Specialist in deployment, DevOps, CI/CD, and infrastructure management.',
            capabilities: [
                'Cloud deployment',
                'Docker management',
                'CI/CD pipelines',
                'Environment configuration',
                'Infrastructure as code',
                'Rollback procedures',
            ],
            allowedTools: [
                'read_file', 'write_file', 'list_directory',
                'run_command', 'search_files',
            ],
        };
    }
}
