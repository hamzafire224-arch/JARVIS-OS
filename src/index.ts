/**
 * JARVIS - Next-Generation Autonomous AI Operative
 * 
 * Main entry point for the JARVIS Agent cognitive core.
 * Provides a REPL interface for development and testing.
 */

import { createInterface } from 'readline';
import { createMainAgent } from './agent/index.js';
import { initializeMemory } from './memory/index.js';
import { getConfig, isProductivityVariant, isBalancedVariant } from './config/index.js';
import { logger } from './utils/logger.js';
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

    const config = getConfig();

    console.log(`📍 Variant: ${config.variant.toUpperCase()}`);
    console.log(`🔌 Provider Priority: ${config.providerPriority.join(' → ')}`);
    console.log(`🔒 Approval Mode: ${config.toolApproval.mode}`);
    console.log('');

    // Initialize memory
    console.log('📚 Initializing memory system...');
    const memoryManager = await initializeMemory();
    const memoryContext = await memoryManager.getMemoryContext();

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
│ /help     - Show this help message          │
│ /clear    - Clear conversation history      │
│ /memory   - Show memory statistics          │
│ /context  - Show context statistics         │
│ /exit     - Exit JARVIS                     │
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

                    case '/exit':
                    case '/quit':
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
