#!/usr/bin/env node
/**
 * PersonalJARVIS — CLI Entry Point
 * 
 * This is the global `jarvis` command installed via `npm install -g personaljarvis`.
 * It handles sub-commands and launches the main REPL.
 * 
 * Usage:
 *   jarvis           # Start REPL
 *   jarvis setup     # Run setup wizard
 *   jarvis --version # Show version
 *   jarvis --help    # Show help
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { checkForUpdates } from './utils/update-notifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

async function main() {
    // Check for updates (non-blocking)
    checkForUpdates().catch(() => { });

    switch (command) {
        case 'setup': {
            // Dynamic import to avoid loading everything for setup
            const { execSync } = await import('child_process');
            try {
                execSync(`npx tsx ${join(__dirname, '../scripts/setup-wizard.ts')}`, {
                    stdio: 'inherit',
                    cwd: process.cwd(),
                });
            } catch {
                process.exit(1);
            }
            break;
        }

        case '--version':
        case '-v': {
            const pkg = await import('../package.json', { with: { type: 'json' } });
            console.log(`PersonalJARVIS v${pkg.default.version}`);
            break;
        }

        case '--help':
        case '-h': {
            console.log(`
PersonalJARVIS — Your AI-Powered Development Assistant

Usage:
  jarvis              Start the JARVIS REPL
  jarvis setup        Run the interactive setup wizard
  jarvis --version    Show version number
  jarvis --help       Show this help message

Dashboard: https://app.personaljarvis.dev
Docs:      https://github.com/personaljarvis/jarvis#readme
`);
            break;
        }

        default: {
            // Launch main REPL
            await import('./index.js');
        }
    }
}

main().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
