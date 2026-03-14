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

                    default:
                        console.log(`❓ Unknown command: ${command}. Type /help for available commands.`);
                }

                prompt();
                return;
            }

            // Process user message
            try {
                console.log('\n🤖 JARVIS: Thinking...');
                const startTime = Date.now();

                const result = await agent.execute(trimmed);

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\n🤖 JARVIS (${elapsed}s):\n`);
                console.log(result.finalContent);

                if (result.toolResults && result.toolResults.length > 0) {
                    console.log(`\n📋 Tools used: ${result.toolResults.length}`);
                }
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
