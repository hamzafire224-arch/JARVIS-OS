#!/usr/bin/env node
/**
 * JARVIS Quick Start
 * 
 * Verifies configuration and starts JARVIS with minimal setup.
 * Auto-detects provider and launches appropriately.
 */

import { existsSync } from 'fs';
import { spawn, execSync } from 'child_process';
import { join, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// Colors
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    ok: (s: string) => `\x1b[32m✓\x1b[0m ${s}`,
    err: (s: string) => `\x1b[31m✗\x1b[0m ${s}`,
    warn: (s: string) => `\x1b[33m⚠\x1b[0m ${s}`,
    info: (s: string) => `\x1b[36mℹ\x1b[0m ${s}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Preflight Checks
// ═══════════════════════════════════════════════════════════════════════════════

interface CheckResult {
    passed: boolean;
    message: string;
    fix?: string;
}

async function runPreflightChecks(): Promise<boolean> {
    console.log('\n🔍 Running preflight checks...\n');

    const checks: CheckResult[] = [];

    // 1. Check .env file
    const hasEnv = existsSync('.env');
    checks.push({
        passed: hasEnv,
        message: '.env file exists',
        fix: 'Run: npx ts-node scripts/setup-wizard.ts',
    });

    // Load .env if exists
    if (hasEnv) {
        config();
    }

    // 2. Check for API key
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasOllama = checkOllama();

    const hasAnyProvider = hasGemini || hasClaude || hasOpenAI || hasOllama;
    checks.push({
        passed: hasAnyProvider,
        message: 'AI provider configured',
        fix: hasOllama
            ? 'Ollama detected - will use local inference'
            : 'Add GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY to .env',
    });

    // 3. Check data directory
    const dataDir = process.env.JARVIS_DATA_DIR ?? './data';
    const hasDataDir = existsSync(dataDir);
    checks.push({
        passed: hasDataDir,
        message: `Data directory exists (${dataDir})`,
        fix: `Will create: ${dataDir}`,
    });

    // 4. Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]!);
    checks.push({
        passed: majorVersion >= 18,
        message: `Node.js version ${nodeVersion}`,
        fix: 'JARVIS requires Node.js 18 or higher',
    });

    // Print results
    let allPassed = true;
    for (const check of checks) {
        if (check.passed) {
            console.log(c.ok(check.message));
        } else {
            console.log(c.err(check.message));
            if (check.fix) {
                console.log(`   ${c.info(check.fix)}`);
            }
            allPassed = false;
        }
    }

    console.log('');
    return allPassed;
}

function checkOllama(): boolean {
    try {
        execSync('ollama --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Start JARVIS
// ═══════════════════════════════════════════════════════════════════════════════

async function startJarvis(): Promise<void> {
    console.log(`${c.bright}${c.cyan}🤖 Starting JARVIS...${c.reset}\n`);

    // Determine which entry point to use
    const cliMode = process.argv.includes('--cli');
    const entryPoint = cliMode
        ? join(__dirname, '..', 'dist', 'cli', 'index.js')
        : join(__dirname, '..', 'dist', 'index.js');

    // Check if dist exists
    if (!existsSync(entryPoint)) {
        console.log(c.warn('Build not found. Running build first...'));
        try {
            execSync('npm run build', { stdio: 'inherit' });
        } catch (error) {
            console.log(c.err('Build failed. Please run: npm run build'));
            process.exit(1);
        }
    }

    // Start JARVIS
    const jarvis = spawn('node', [entryPoint], {
        stdio: 'inherit',
        env: process.env,
    });

    jarvis.on('error', (error) => {
        console.log(c.err(`Failed to start: ${error.message}`));
        process.exit(1);
    });

    jarvis.on('close', (code) => {
        process.exit(code ?? 0);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    console.log(`${c.bright}${c.cyan}╔═══════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bright}${c.cyan}║      🤖 JARVIS Quick Start           ║${c.reset}`);
    console.log(`${c.bright}${c.cyan}╚═══════════════════════════════════════╝${c.reset}`);

    // Skip preflight with --force
    if (!process.argv.includes('--force')) {
        const passed = await runPreflightChecks();

        if (!passed) {
            console.log(c.warn('Some checks failed. Run setup wizard:'));
            console.log(`   ${c.info('npx ts-node scripts/setup-wizard.ts')}`);
            console.log('');
            console.log('Or start anyway with: npm run start -- --force');
            process.exit(1);
        }
    }

    await startJarvis();
}

main().catch((error) => {
    console.error(c.err(`Error: ${error.message}`));
    process.exit(1);
});
