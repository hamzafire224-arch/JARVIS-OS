/**
 * JARVIS - Next-Generation Autonomous AI Operative
 * 
 * Main entry point for the JARVIS Agent cognitive core.
 * Provides a REPL interface for development and testing.
 */

import { createInterface } from 'readline';
import { createMainAgent } from './agent/index.js';
import { initializeMemory } from './memory/index.js';
import { initializeHierarchicalMemory, getHierarchicalMemory } from './memory/index.js';
import { initializeEpisodicMemory, getEpisodicMemory } from './memory/index.js';
import { getConfig, isProductivityVariant, isBalancedVariant } from './config/index.js';
import { logger } from './utils/logger.js';
import { getUsageAnalytics } from './analytics/index.js';
import { SkillMarketplace, initializeSkills } from './skills/index.js';
import { getTieredProviderManager } from './providers/index.js';
import { LicenseManager } from './license/index.js';
import type { ApprovalRequest, ApprovalResponse } from './agent/types.js';
import { ConversationHistory } from './context/ConversationHistory.js';
import { ReasoningEngine, type ProgressCallbacks } from './agent/ReasoningEngine.js';
import { AgentCollaborator, type CollaborationCallbacks } from './agent/AgentCollaborator.js';
import { getWorldModel } from './agent/WorldModel.js';
import { getMCPBridge } from './skills/MCPBridge.js';
import { getMCPConnectorGallery } from './skills/MCPConnectorGallery.js';
import { getVoiceService, type VoiceEvent } from './skills/VoiceService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Banner
// ═══════════════════════════════════════════════════════════════════════════════

const BANNER = `
     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
     ██║███████║██████╔╝██║   ██║██║███████╗
██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║
╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝

     Just A Rather Very Intelligent System
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Approval Handler
// ═══════════════════════════════════════════════════════════════════════════════

function createCLIApprovalHandler(rl: ReturnType<typeof createInterface>) {
    return async (request: ApprovalRequest): Promise<ApprovalResponse> => {
        console.log('\n┌─────────────────────────────────────────────┐');
        console.log('│           ⚠️  APPROVAL REQUIRED              │');
        console.log('├─────────────────────────────────────────────┤');
        console.log(`│ Tool: ${request.toolName.padEnd(37)}│`);
        console.log(`│ Risk: ${request.risk.toUpperCase().padEnd(37)}│`);
        console.log('├─────────────────────────────────────────────┤');
        console.log(`│ ${request.description.slice(0, 43).padEnd(43)}│`);
        console.log('└─────────────────────────────────────────────┘');

        return new Promise((resolve) => {
            rl.question('\n[Y]es / [N]o: ', (answer) => {
                const approved = answer.toLowerCase().startsWith('y');
                resolve({
                    requestId: request.id,
                    approved,
                    reason: approved ? undefined : 'User denied via CLI',
                    respondedAt: new Date(),
                });
            });
        });
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main REPL
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log(BANNER);

    // Validate license on startup
    console.log('🔑 Checking license...');
    const licenseManager = new LicenseManager();
    const licenseStatus = await licenseManager.initialize();
    LicenseManager.printStatus(licenseStatus);

    const config = getConfig();

    // Override variant if license says Productivity but subscription degraded
    const effectiveVariant = licenseStatus.isProductivity ? 'productivity' : config.variant;

    console.log(`📍 Variant: ${effectiveVariant.toUpperCase()}`);
    console.log(`🔌 Provider Priority: ${config.providerPriority.join(' → ')}`);
    console.log(`🔒 Approval Mode: ${config.toolApproval.mode}`);
    console.log('');

    // Initialize memory — use hierarchical for Productivity, basic for Balanced
    console.log('📚 Initializing memory system...');
    let memoryContext: string;
    const memoryManager = await initializeMemory();

    if (isProductivityVariant()) {
        try {
            await initializeHierarchicalMemory();
            await initializeEpisodicMemory();
            memoryContext = await memoryManager.getMemoryContext();
            console.log('   ✓ Hierarchical memory (4-layer) active');
        } catch (err) {
            memoryContext = await memoryManager.getMemoryContext();
            logger.warn(`Hierarchical memory unavailable, using basic: ${err}`);
        }
    } else {
        memoryContext = await memoryManager.getMemoryContext();
    }

    // Initialize Usage Analytics
    const analytics = getUsageAnalytics();
    await analytics.initialize();
    analytics.track('session_start', { variant: config.variant });
    console.log('   ✓ Usage analytics active');

    // Initialize skills registry (must happen before agent creation)
    console.log('🛠️  Initializing skills...');
    initializeSkills({
        enableFilesystem: true,
        enableTerminal: true,
        enableWeb: true,
        enableBrowser: false,   // Opt-in: requires Playwright
        enableGitHub: false,    // Opt-in: requires gh CLI
        enableDatabase: false,  // Opt-in: requires database config
    });
    console.log('   ✓ Skills registry initialized');

    // Create readline interface
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // Create main agent with CLI approval handler
    console.log('🧠 Initializing JARVIS cognitive core...');
    const agent = createMainAgent({
        memory: memoryContext,
        onApprovalRequired: createCLIApprovalHandler(rl),
    });

    // Initialize the agent (connects to LLM provider)
    try {
        await agent.initialize();
        console.log('✅ JARVIS is ready.\n');
    } catch (error) {
        console.error('❌ Failed to initialize JARVIS:', error);
        console.error('\nPlease check your API keys in .env file.');
        process.exit(1);
    }

    // Initialize conversation history (branching & rollback)
    const conversationHistory = new ConversationHistory({
        maxSnapshots: 100,
        autoSnapshotInterval: 2,   // Auto-snapshot every 2 messages
    });

    // Help text
    const showHelp = () => {
        console.log(`
┌─────────────────────────────────────────────┐
│              JARVIS Commands                │
├─────────────────────────────────────────────┤
│ /help        - Show this help message       │
│ /clear       - Clear conversation history   │
│ /memory      - Show memory statistics       │
│ /context     - Show context statistics      │
│ /stats       - Usage analytics summary      │
│ /report      - Full analytics report        │
│ /savings     - Tiered inference savings     │
│ /marketplace - Browse community skills      │
│ /rollback N  - Undo last N exchanges        │
│ /branch NAME - Fork conversation            │
│ /branches    - List all branches            │
│ /switch NAME - Switch to branch             │
│ /auto GOAL   - Autonomous goal execution    │
│ /collab MSG  - Multi-agent collaboration    │
│ /alerts      - View proactive suggestions   │
│ /connect ID  - Connect MCP server           │
│ /mcp         - List MCP servers/connectors  │
│ /voice       - Toggle voice mode            │
│ /exit        - Exit JARVIS                  │
└─────────────────────────────────────────────┘
`);
    };

    showHelp();

    // REPL loop
    const prompt = () => {
        rl.question('\n👤 You: ', async (input) => {
            const trimmed = input.trim();

            if (!trimmed) {
                prompt();
                return;
            }

            // Handle commands
            if (trimmed.startsWith('/')) {
                const command = trimmed.toLowerCase();

                switch (command) {
                    case '/help':
                        showHelp();
                        break;

                    case '/clear':
                        // Create episode summary before clearing
                        if (isProductivityVariant()) {
                            try {
                                const episodic = getEpisodicMemory();
                                const ctx = agent.getContext();
                                await episodic.recordSession(
                                    `session-${Date.now()}`,
                                    ctx.messages.map(m => ({ role: m.role, content: m.content ?? '' }))
                                );
                            } catch { /* episodic may not be initialized */ }
                        }
                        agent.clearHistory();
                        console.log('🗑️  Conversation history cleared.');
                        break;

                    case '/memory':
                        const stats = await memoryManager.getStats();
                        console.log('\n📊 Memory Statistics:');
                        console.log(`   Total entries: ${stats.totalEntries}`);
                        console.log(`   By type: ${JSON.stringify(stats.byType)}`);
                        console.log(`   Sessions: ${stats.totalSessions}`);
                        break;

                    case '/context':
                        const context = agent.getContext();
                        console.log('\n📊 Context Statistics:');
                        console.log(`   Messages: ${context.messages.length}`);
                        console.log(`   Tools: ${context.tools.length}`);
                        break;

                    case '/stats':
                        const usageStats = analytics.getTodayStats();
                        console.log('\n📊 Usage Statistics:');
                        console.log(`   Sessions: ${usageStats.sessions}`);
                        console.log(`   Messages: ${usageStats.messages}`);
                        console.log(`   Tool calls: ${usageStats.toolCalls}`);
                        console.log(`   Local inferences: ${usageStats.localInferences}`);
                        console.log(`   Cloud inferences: ${usageStats.cloudInferences}`);
                        console.log(`   Est. savings: $${usageStats.estimatedSavings.toFixed(2)}`);
                        break;

                    case '/report':
                        const report = await analytics.getWeeklyReport();
                        console.log('\n📈 Weekly Report:');
                        console.log(`   Period: ${report.weekStart} → ${report.weekEnd}`);
                        console.log(`   Total sessions: ${report.totalSessions}`);
                        console.log(`   Total messages: ${report.totalMessages}`);
                        console.log(`   Avg session: ${report.avgSessionLength.toFixed(0)}s`);
                        console.log(`   Cost savings: $${report.costSavings.toFixed(2)}`);
                        console.log(`   Productivity: ${report.productivityScore}/10`);
                        if (report.mostUsedTools.length > 0) {
                            console.log('   Top tools:');
                            for (const t of report.mostUsedTools.slice(0, 5)) {
                                console.log(`     • ${t.name}: ${t.count} uses`);
                            }
                        }
                        break;

                    case '/savings':
                        try {
                            const tiered = getTieredProviderManager();
                            console.log('\n💰 Tiered Inference Savings:');
                            console.log(tiered.getSavingsSummary());
                        } catch {
                            console.log('\n💰 Tiered inference not active (Balanced plan or Ollama unavailable)');
                        }
                        break;

                    case '/marketplace':
                        try {
                            const mp = new SkillMarketplace();
                            await mp.initialize();
                            const skills = await mp.getFeatured();
                            console.log('\n🛒 Skill Marketplace:');
                            if (skills.length === 0) {
                                console.log('   No community skills available yet.');
                            } else {
                                for (const s of skills.slice(0, 10)) {
                                    console.log(`   • ${s.name} v${s.version} — ${s.description}`);
                                    console.log(`     ⭐ ${s.rating ?? 'N/A'} | ↓ ${s.downloads ?? 0} | ${s.verified ? '✓ Verified' : 'Community'}`);
                                }
                            }
                        } catch (err) {
                            console.log(`\n🛒 Marketplace unavailable: ${err}`);
                        }
                        break;

                    case '/exit':
                    case '/quit':
                        analytics.track('session_end', {});
                        if (isProductivityVariant()) {
                            try {
                                const episodic = getEpisodicMemory();
                                const ctx = agent.getContext();
                                await episodic.recordSession(
                                    `session-${Date.now()}`,
                                    ctx.messages.map(m => ({ role: m.role, content: m.content ?? '' }))
                                );
                            } catch { /* ignore */ }
                        }
                        console.log('\n👋 Goodbye! JARVIS signing off.\n');
                        rl.close();
                        process.exit(0);

                    default: {
                        // Handle parameterized commands
                        const parts = trimmed.split(/\s+/);
                        const cmd = parts[0]!.toLowerCase();
                        const cmdArg = parts.slice(1).join(' ');

                        switch (cmd) {
                            case '/rollback': {
                                const steps = parseInt(cmdArg || '1', 10);
                                const restored = conversationHistory.rollback(steps);
                                if (restored) {
                                    agent.clearHistory();
                                    for (const msg of restored) {
                                        agent.getContext().messages.push(msg);
                                    }
                                    console.log(`⏪ Rolled back ${steps} step${steps > 1 ? 's' : ''}. Conversation restored to ${restored.length} messages.`);
                                } else {
                                    console.log('⚠️  No snapshots available. Send some messages first.');
                                }
                                break;
                            }

                            case '/branch': {
                                if (!cmdArg) {
                                    console.log('Usage: /branch <name> — create a fork of the current conversation');
                                    break;
                                }
                                try {
                                    const branchCtx = agent.getContext();
                                    conversationHistory.branch(cmdArg, branchCtx.messages);
                                    const branchMsgs = conversationHistory.switchBranch(cmdArg);
                                    if (branchMsgs) {
                                        agent.clearHistory();
                                        for (const msg of branchMsgs) {
                                            agent.getContext().messages.push(msg);
                                        }
                                    }
                                    console.log(`🌿 Created and switched to branch "${cmdArg}"`);
                                } catch (err) {
                                    console.log(`⚠️  ${err instanceof Error ? err.message : err}`);
                                }
                                break;
                            }

                            case '/switch': {
                                if (!cmdArg) {
                                    console.log('Usage: /switch <name> — switch to a different branch');
                                    break;
                                }
                                const switchMsgs = conversationHistory.switchBranch(cmdArg);
                                if (switchMsgs) {
                                    agent.clearHistory();
                                    for (const msg of switchMsgs) {
                                        agent.getContext().messages.push(msg);
                                    }
                                    console.log(`🔀 Switched to branch "${cmdArg}" (${switchMsgs.length} messages)`);
                                } else {
                                    console.log(`⚠️  Branch "${cmdArg}" not found. Use /branches to list.`);
                                }
                                break;
                            }

                            case '/branches': {
                                const allBranches = conversationHistory.listBranches();
                                console.log('\n🌳 Conversation Branches:');
                                for (const b of allBranches) {
                                    const active = b.isActive ? ' ← active' : '';
                                    const parent = b.parentBranch ? ` (from ${b.parentBranch})` : '';
                                    console.log(`   ${b.isActive ? '●' : '○'} ${b.name}${parent} — ${b.snapshotCount} snapshots${active}`);
                                }
                                break;
                            }

                            case '/auto': {
                                if (!cmdArg) {
                                    console.log('Usage: /auto <goal> — JARVIS autonomously decomposes and executes a complex goal');
                                    console.log('Example: /auto Create a REST API for a todo app with Express and TypeScript');
                                    break;
                                }
                                console.log('\n🧠 Autonomous Execution Mode');
                                console.log('━'.repeat(50));
                                console.log(`🎯 Goal: ${cmdArg}`);
                                console.log('');

                                const progressCallbacks: ProgressCallbacks = {
                                    onPlanStart: (goal) => {
                                        console.log('📋 Planning... Decomposing goal into execution tree...');
                                    },
                                    onPlanComplete: (_tree, nodeCount) => {
                                        console.log(`✅ Plan ready: ${nodeCount} step(s) identified\n`);
                                    },
                                    onNodeStart: (node, iteration, max) => {
                                        console.log(`⚡ [${iteration}/${max}] Executing: ${node.description}`);
                                    },
                                    onNodeComplete: (node, success) => {
                                        if (success) {
                                            console.log(`   ✅ Success`);
                                        } else {
                                            console.log(`   ❌ Failed: ${node.error || 'Verification rejected'}`);
                                        }
                                    },
                                    onReplan: (failed, patch) => {
                                        console.log(`   🔄 Replanning: ${patch.description}`);
                                    },
                                    onComplete: (result, success) => {
                                        console.log('\n' + '━'.repeat(50));
                                        console.log(success ? '🎉 Goal completed successfully!' : '⚠️  Goal completed with issues.');
                                    },
                                };

                                try {
                                    const reasoningEngine = new ReasoningEngine(agent as any);
                                    const autoResult = await reasoningEngine.executeComplexGoal(cmdArg, progressCallbacks);
                                    console.log('\n📝 Final Output:\n');
                                    console.log(autoResult);
                                } catch (autoErr) {
                                    console.error(`\n❌ Autonomous execution failed: ${autoErr instanceof Error ? autoErr.message : autoErr}`);
                                }
                                break;
                            }

                            case '/collab': {
                                if (!cmdArg) {
                                    console.log('Usage: /collab <task> — JARVIS uses multiple agents in parallel for complex tasks');
                                    console.log('Example: /collab Research best practices for authentication and implement a JWT solution');
                                    break;
                                }
                                console.log('\n🤝 Multi-Agent Collaboration Mode');
                                console.log('━'.repeat(50));
                                console.log(`🎯 Task: ${cmdArg}`);
                                console.log('');

                                const collabCallbacks: CollaborationCallbacks = {
                                    onPlanCreated: (plan) => {
                                        console.log(`📋 Plan: ${plan.assignments.length} subtask(s) across ${new Set(plan.assignments.map(a => a.agentName)).size} agent(s)`);
                                        for (const a of plan.assignments) {
                                            console.log(`   • ${a.agentName} [${a.mode}]: ${a.subtask.slice(0, 80)}...`);
                                        }
                                        console.log('');
                                    },
                                    onAgentStart: (agentName, subtask) => {
                                        console.log(`⚡ ${agentName} starting...`);
                                    },
                                    onAgentComplete: (agentName, subtask, success) => {
                                        console.log(`   ${success ? '✅' : '❌'} ${agentName} ${success ? 'completed' : 'failed'}`);
                                    },
                                    onSynthesisStart: () => {
                                        console.log('\n🔗 Synthesizing results...');
                                    },
                                    onComplete: (result, durationMs) => {
                                        console.log('\n' + '━'.repeat(50));
                                        console.log(`🎉 Collaboration complete (${(durationMs / 1000).toFixed(1)}s)`);
                                    },
                                };

                                try {
                                    const collaborator = new AgentCollaborator();
                                    const collabResult = await collaborator.collaborate(cmdArg, agent as any, collabCallbacks);
                                    console.log('\n📝 Response:\n');
                                    console.log(collabResult);
                                } catch (collabErr) {
                                    console.error(`\n❌ Collaboration failed: ${collabErr instanceof Error ? collabErr.message : collabErr}`);
                                }
                                break;
                            }

                            case '/alerts': {
                                const worldModel = getWorldModel();
                                const alerts = worldModel.getPendingAlerts();
                                if (alerts.length === 0) {
                                    console.log('\n✨ No pending alerts — everything looks good!');
                                } else {
                                    console.log(`\n🔔 Proactive Alerts (${alerts.length}):`);
                                    for (const alert of alerts) {
                                        const urgencyIcon = { low: '💡', medium: '📌', high: '⚠️', critical: '🚨' }[alert.urgency];
                                        console.log(`   ${urgencyIcon} [${alert.source}] ${alert.message}`);
                                        console.log(`      Action: ${alert.actionSuggestion}`);
                                    }
                                }
                                break;
                            }

                            case '/connect': {
                                if (!cmdArg) {
                                    console.log('Usage: /connect <connector-id> — Connect an MCP server');
                                    console.log('Example: /connect github');
                                    console.log('\nRun /mcp to see available connectors.');
                                    break;
                                }
                                console.log(`\n🔌 Connecting to MCP server: ${cmdArg}...`);

                                try {
                                    const bridge = getMCPBridge();
                                    const result = await bridge.connectByName(cmdArg);
                                    if (result.success) {
                                        console.log(`✅ Connected! ${result.tools} tools now available.`);
                                    } else {
                                        console.log(`❌ ${result.error}`);
                                    }
                                } catch (err) {
                                    console.error(`❌ Connection failed: ${err instanceof Error ? err.message : err}`);
                                }
                                break;
                            }

                            case '/mcp': {
                                const bridge = getMCPBridge();
                                console.log('\n' + bridge.getConnectedSummary());
                                console.log('');
                                const gallery = getMCPConnectorGallery();
                                console.log(gallery.getSummary());
                                break;
                            }

                            case '/voice': {
                                const voiceService = getVoiceService();
                                if (voiceService.running) {
                                    voiceService.stop();
                                    console.log('\n🔇 Voice mode disabled.');
                                } else {
                                    console.log('\n🎙️ Starting voice mode...');
                                    const started = await voiceService.start();
                                    if (started) {
                                        voiceService.on('voice_event', (event: VoiceEvent) => {
                                            if (event.type === 'wake_word') {
                                                console.log('\n🗣️ Wake word detected! Listening...');
                                            } else if (event.type === 'transcription') {
                                                const text = (event.data as any).text;
                                                console.log(`\n📝 You said: "${text}"`);
                                                console.log('Processing...');
                                            }
                                        });
                                        const status = voiceService.getStatus();
                                        console.log(`✅ Voice mode active (STT: ${status.sttProvider}, TTS: ${status.ttsProvider})`);
                                        console.log(`   Wake words: ${status.wakeWords.join(', ')}`);
                                    } else {
                                        console.log('❌ Could not start voice mode. Check OPENAI_API_KEY and audio tools (sox/ffmpeg).');
                                    }
                                }
                                break;
                            }

                            default:
                                console.log(`❓ Unknown command: ${command}. Type /help for available commands.`);
                        }
                    }
                }

                prompt();
                return;
            }

            // Process user message (streaming)
            try {
                process.stdout.write('\n🤖 JARVIS: ');
                const startTime = Date.now();
                let hasContent = false;
                let toolCount = 0;

                for await (const chunk of agent.runStream(trimmed)) {
                    switch (chunk.type) {
                        case 'text':
                            if (chunk.content) {
                                if (!hasContent) {
                                    // Clear the "JARVIS: " and start fresh with response
                                    process.stdout.write('\r🤖 JARVIS:\n\n');
                                    hasContent = true;
                                }
                                process.stdout.write(chunk.content);
                            }
                            break;

                        case 'tool_call_start':
                            if (chunk.toolCall?.name) {
                                toolCount++;
                                process.stdout.write(`\n  ⚙️  Running ${chunk.toolCall.name}...`);
                            }
                            break;

                        case 'tool_call_end':
                            process.stdout.write(' ✓\n');
                            break;

                        case 'done':
                            // Handled after loop
                            break;
                    }
                }

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                process.stdout.write(`\n\n⏱️  ${elapsed}s`);
                if (toolCount > 0) {
                    process.stdout.write(` · 📋 ${toolCount} tool${toolCount > 1 ? 's' : ''}`);
                }
                process.stdout.write('\n');

                // Auto-snapshot after each exchange
                conversationHistory.autoSnapshot(agent.getContext().messages);
            } catch (error) {
                console.error('\n❌ Error:', error instanceof Error ? error.message : error);
                logger.error('Execution error', { error: String(error) });
            }

            prompt();
        });
    };

    // Handle graceful shutdown
    rl.on('close', () => {
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('\n\n👋 Interrupted. Goodbye!\n');
        rl.close();
        process.exit(0);
    });

    // Start the REPL
    prompt();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Run
// ═══════════════════════════════════════════════════════════════════════════════

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
