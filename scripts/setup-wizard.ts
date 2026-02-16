#!/usr/bin/env node
/**
 * JARVIS Setup Wizard
 * 
 * Interactive CLI setup for first-time users.
 * Replaces "Setup Hell" with a friendly guided experience.
 * 
 * Usage:
 *   npx jarvis-setup           # Interactive mode
 *   npx jarvis-setup --quick   # Quick mode with defaults
 *   npx jarvis-setup --help    # Show help
 */

import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SetupConfig {
    provider: 'gemini' | 'anthropic' | 'openai' | 'ollama';
    apiKey?: string;
    ollamaModel?: string;
    dataDir: string;
    enableSecurity: boolean;
    enableTieredInference: boolean;
    persona: 'professional' | 'casual' | 'concise' | 'creative';
    licenseKey?: string;
    accountEmail?: string;
}

const DASHBOARD_URL = process.env.JARVIS_DASHBOARD_URL || 'https://app.personaljarvis.dev';
const API_URL = process.env.JARVIS_API_URL || DASHBOARD_URL;

interface ProviderInfo {
    name: string;
    requiresKey: boolean;
    keyEnvVar: string;
    signupUrl: string;
    freeOption?: boolean;
    models: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Database
// ═══════════════════════════════════════════════════════════════════════════════

const PROVIDERS: Record<string, ProviderInfo> = {
    gemini: {
        name: 'Google Gemini',
        requiresKey: true,
        keyEnvVar: 'GEMINI_API_KEY',
        signupUrl: 'https://aistudio.google.com/apikey',
        freeOption: true,
        models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    },
    anthropic: {
        name: 'Anthropic Claude',
        requiresKey: true,
        keyEnvVar: 'ANTHROPIC_API_KEY',
        signupUrl: 'https://console.anthropic.com/account/keys',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    },
    openai: {
        name: 'OpenAI GPT',
        requiresKey: true,
        keyEnvVar: 'OPENAI_API_KEY',
        signupUrl: 'https://platform.openai.com/api-keys',
        models: ['gpt-4o', 'gpt-4o-mini'],
    },
    ollama: {
        name: 'Ollama (Local)',
        requiresKey: false,
        keyEnvVar: '',
        signupUrl: 'https://ollama.ai/download',
        freeOption: true,
        models: ['qwen2.5:7b', 'llama3.2:8b', 'mistral:7b'],
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Colors & Formatting
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

const c = {
    title: (s: string) => `${colors.bright}${colors.cyan}${s}${colors.reset}`,
    success: (s: string) => `${colors.green}✓${colors.reset} ${s}`,
    error: (s: string) => `${colors.red}✗${colors.reset} ${s}`,
    warn: (s: string) => `${colors.yellow}⚠${colors.reset} ${s}`,
    info: (s: string) => `${colors.blue}ℹ${colors.reset} ${s}`,
    highlight: (s: string) => `${colors.bright}${colors.magenta}${s}${colors.reset}`,
    dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Setup Wizard Class
// ═══════════════════════════════════════════════════════════════════════════════

class SetupWizard {
    private rl: ReturnType<typeof createInterface>;
    private config: Partial<SetupConfig> = {};

    constructor() {
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Main Flow
    // ─────────────────────────────────────────────────────────────────────────────

    async run(): Promise<void> {
        this.printBanner();

        // Check for quick mode
        if (process.argv.includes('--quick')) {
            await this.runQuickSetup();
        } else if (process.argv.includes('--help')) {
            this.printHelp();
        } else {
            await this.runInteractiveSetup();
        }

        this.rl.close();
    }

    private async runQuickSetup(): Promise<void> {
        console.log(c.info('Running quick setup with defaults...\n'));

        // Set defaults
        this.config = {
            provider: 'gemini',
            dataDir: './data',
            enableSecurity: true,
            enableTieredInference: true,
            persona: 'professional',
        };

        // Check for existing API key in env
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            console.log(c.success('Found GEMINI_API_KEY in environment'));
            this.config.apiKey = geminiKey;
        } else {
            console.log(c.warn('No GEMINI_API_KEY found. Please set it before running JARVIS.'));
            console.log(c.info(`Get a free key at: ${PROVIDERS.gemini.signupUrl}`));
        }

        await this.generateConfigFile();
        this.printNextSteps();
    }

    private async runInteractiveSetup(): Promise<void> {
        // Step 0: Account & License
        await this.setupAccount();

        // Step 1: Choose provider
        await this.selectProvider();

        // Step 2: Configure API key (if needed)
        await this.configureApiKey();

        // Step 3: Select data directory
        await this.selectDataDir();

        // Step 4: Security options
        await this.configureSecurity();

        // Step 5: Persona preference
        await this.selectPersona();

        // Generate configuration
        await this.generateConfigFile();

        // Save license to ~/.jarvis/ if provided
        if (this.config.licenseKey) {
            await this.saveLicenseCache();
        }

        // Print next steps
        this.printNextSteps();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Account & License
    // ─────────────────────────────────────────────────────────────────────────────

    private async setupAccount(): Promise<void> {
        console.log(c.title('\n👤 Step 0: PersonalJARVIS Account\n'));
        console.log('Link your account for Productivity features and license management.\n');

        const options = [
            `  ${c.highlight('1.')} I have an account — enter my license key`,
            `  ${c.highlight('2.')} Create a new account ${c.dim('(opens dashboard in browser)')}`,
            `  ${c.highlight('3.')} Skip ${c.dim('— use free Balanced tier')}`,
        ];

        console.log(options.join('\n'));
        console.log('');

        const choice = await this.question('Enter choice [1-3] (default: 3): ');

        switch (choice.trim()) {
            case '1':
                await this.enterLicenseKey();
                break;
            case '2':
                await this.createAccount();
                break;
            default:
                console.log(c.info('Skipping account setup. You can link your account later.'));
                console.log(c.dim(`  Dashboard: ${DASHBOARD_URL}\n`));
                break;
        }
    }

    private async enterLicenseKey(): Promise<void> {
        console.log(c.title('\n🔑 Enter License Key\n'));
        console.log(c.dim('Find your key at: ' + DASHBOARD_URL + '/dashboard/license\n'));

        const key = await this.question('License key: ');

        if (!key.trim()) {
            console.log(c.warn('No key entered. Continuing with free tier.'));
            return;
        }

        // Validate key against API
        console.log(c.dim('Validating...'));
        try {
            const res = await fetch(`${API_URL}/api/license/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: key.trim() }),
                signal: AbortSignal.timeout(5000),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.valid) {
                    this.config.licenseKey = key.trim();
                    const variant = data.variant || 'balanced';
                    console.log(c.success(`License validated! Plan: ${variant.toUpperCase()}`));
                    if (data.warning) {
                        console.log(c.warn(data.warning));
                    }
                    return;
                }
            }

            console.log(c.warn('Could not validate license. Saving key anyway — it will be checked on startup.'));
            this.config.licenseKey = key.trim();
        } catch {
            console.log(c.warn('Could not reach API. Saving key — it will be validated on next startup.'));
            this.config.licenseKey = key.trim();
        }
    }

    private async createAccount(): Promise<void> {
        console.log(c.title('\n🌐 Creating Account\n'));
        console.log(c.info('Opening the PersonalJARVIS dashboard in your browser...'));
        console.log(c.dim(`  ${DASHBOARD_URL}/signup\n`));

        // Open browser
        try {
            const openCmd = process.platform === 'win32' ? 'start'
                : process.platform === 'darwin' ? 'open'
                    : 'xdg-open';
            execSync(`${openCmd} ${DASHBOARD_URL}/signup`, { stdio: 'ignore' });
        } catch {
            console.log(c.warn(`Could not open browser. Please visit: ${DASHBOARD_URL}/signup`));
        }

        console.log(c.info('After creating your account and getting a license key, enter it below.'));
        console.log(c.dim('(Press Enter to skip and add it later)\n'));

        const key = await this.question('License key (or Enter to skip): ');
        if (key.trim()) {
            this.config.licenseKey = key.trim();
            console.log(c.success('License key saved!'));
        } else {
            console.log(c.info('You can add your license key later by running: jarvis setup'));
        }
    }

    private async saveLicenseCache(): Promise<void> {
        const jarvisDir = join(homedir(), '.jarvis');
        try {
            if (!existsSync(jarvisDir)) {
                await fs.mkdir(jarvisDir, { recursive: true });
            }

            // Save license to config.json (read by LicenseManager)
            const configPath = join(jarvisDir, 'config.json');
            let config: Record<string, unknown> = {};
            if (existsSync(configPath)) {
                try {
                    config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
                } catch { /* ignore corrupt config */ }
            }
            config.license_key = this.config.licenseKey;
            if (this.config.accountEmail) {
                config.email = this.config.accountEmail;
            }
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log(c.success('License key saved to ~/.jarvis/config.json'));
        } catch (err) {
            console.log(c.warn(`Could not save license cache: ${(err as Error).message}`));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Interactive Steps
    // ─────────────────────────────────────────────────────────────────────────────

    private async selectProvider(): Promise<void> {
        console.log(c.title('\n📡 Step 1: Choose Your AI Provider\n'));
        console.log('JARVIS supports multiple AI backends. Pick one:\n');

        const options = [
            `  ${c.highlight('1.')} Gemini (Google) - ${c.dim('Free tier available, recommended for beginners')}`,
            `  ${c.highlight('2.')} Claude (Anthropic) - ${c.dim('Best for code and writing')}`,
            `  ${c.highlight('3.')} GPT-4 (OpenAI) - ${c.dim('Most well-known')}`,
            `  ${c.highlight('4.')} Ollama (Local) - ${c.dim('Free, runs on your computer, private')}`,
        ];

        console.log(options.join('\n'));
        console.log('');

        const choice = await this.question('Enter choice [1-4] (default: 1): ');
        const providers: SetupConfig['provider'][] = ['gemini', 'anthropic', 'openai', 'ollama'];
        const index = parseInt(choice) - 1;

        this.config.provider = providers[index] ?? 'gemini';
        console.log(c.success(`Selected: ${PROVIDERS[this.config.provider].name}`));
    }

    private async configureApiKey(): Promise<void> {
        const provider = PROVIDERS[this.config.provider!];

        if (!provider.requiresKey) {
            // Ollama case
            console.log(c.title('\n🦙 Setting up Ollama\n'));

            // Check if Ollama is installed
            const ollamaInstalled = this.checkOllamaInstalled();
            if (!ollamaInstalled) {
                console.log(c.warn('Ollama not found on your system.'));
                console.log(c.info(`Download from: ${provider.signupUrl}`));
                console.log('');
                const proceed = await this.question('Continue anyway? [y/N]: ');
                if (proceed.toLowerCase() !== 'y') {
                    console.log(c.info('Switching to Gemini as backup...'));
                    this.config.provider = 'gemini';
                    await this.configureApiKey();
                    return;
                }
            } else {
                console.log(c.success('Ollama is installed'));
            }

            // Select model
            console.log('\nRecommended models:');
            provider.models.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
            const modelChoice = await this.question('\nEnter model name (default: qwen2.5:7b): ');
            this.config.ollamaModel = modelChoice || 'qwen2.5:7b';
            return;
        }

        console.log(c.title(`\n🔑 Step 2: API Key for ${provider.name}\n`));

        // Check existing env var
        const existingKey = process.env[provider.keyEnvVar];
        if (existingKey) {
            console.log(c.success(`Found ${provider.keyEnvVar} in your environment!`));
            const useExisting = await this.question('Use this key? [Y/n]: ');
            if (useExisting.toLowerCase() !== 'n') {
                this.config.apiKey = existingKey;
                return;
            }
        }

        console.log(`${c.info(`Get your API key from: ${c.highlight(provider.signupUrl)}`)}\n`);
        console.log(c.dim('(Your key is stored locally and never sent anywhere except the AI provider)\n'));

        const apiKey = await this.question(`Enter your ${provider.keyEnvVar}: `);
        if (apiKey.trim()) {
            this.config.apiKey = apiKey.trim();
            console.log(c.success('API key saved'));
        } else {
            console.log(c.warn('No API key provided. You will need to set it later.'));
        }
    }

    private async selectDataDir(): Promise<void> {
        console.log(c.title('\n📁 Step 3: Data Storage Location\n'));
        console.log('Where should JARVIS store memory and files?\n');

        const defaultDir = './data';
        const choice = await this.question(`Enter path (default: ${defaultDir}): `);
        this.config.dataDir = choice.trim() || defaultDir;

        // Create directory if it doesn't exist
        if (!existsSync(this.config.dataDir)) {
            await fs.mkdir(this.config.dataDir, { recursive: true });
            console.log(c.success(`Created: ${this.config.dataDir}`));
        } else {
            console.log(c.success(`Using: ${this.config.dataDir}`));
        }
    }

    private async configureSecurity(): Promise<void> {
        console.log(c.title('\n🔒 Step 4: Security Settings\n'));
        console.log('JARVIS includes advanced security features:\n');
        console.log(`  ${c.highlight('•')} Capability-based permissions for tools`);
        console.log(`  ${c.highlight('•')} Blocked paths (protects ~/.ssh, ~/.aws, etc.)`);
        console.log(`  ${c.highlight('•')} Blocked commands (rm -rf, sudo rm, etc.)`);
        console.log(`  ${c.highlight('•')} Audit logging for all operations\n`);

        const enableSecurity = await this.question('Enable security features? [Y/n]: ');
        this.config.enableSecurity = enableSecurity.toLowerCase() !== 'n';

        if (this.config.enableSecurity) {
            console.log(c.success('Security features enabled'));
        } else {
            console.log(c.warn('Security disabled. Use caution!'));
        }

        // Tiered inference
        console.log('\n' + c.info('Cost-saving tip: Tiered inference uses local models for simple tasks.'));
        const enableTiered = await this.question('Enable tiered inference? [Y/n]: ');
        this.config.enableTieredInference = enableTiered.toLowerCase() !== 'n';

        if (this.config.enableTieredInference) {
            console.log(c.success('Tiered inference enabled (saves up to 80% on API costs)'));
        }
    }

    private async selectPersona(): Promise<void> {
        console.log(c.title('\n🎭 Step 5: Choose JARVIS Personality\n'));
        console.log('How should JARVIS communicate with you?\n');

        const options = [
            `  ${c.highlight('1.')} Professional - ${c.dim('Formal, detailed explanations')}`,
            `  ${c.highlight('2.')} Casual - ${c.dim('Friendly, conversational tone')}`,
            `  ${c.highlight('3.')} Concise - ${c.dim('Minimal words, maximum efficiency')}`,
            `  ${c.highlight('4.')} Creative - ${c.dim('Playful, witty responses')}`,
        ];

        console.log(options.join('\n'));
        console.log('');

        const choice = await this.question('Enter choice [1-4] (default: 1): ');
        const personas: SetupConfig['persona'][] = ['professional', 'casual', 'concise', 'creative'];
        const index = parseInt(choice) - 1;

        this.config.persona = personas[index] ?? 'professional';
        console.log(c.success(`Selected: ${this.config.persona}`));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Config Generation
    // ─────────────────────────────────────────────────────────────────────────────

    private async generateConfigFile(): Promise<void> {
        console.log(c.title('\n⚙️  Generating Configuration...\n'));

        // Generate .env file
        const envContent = this.generateEnvContent();
        await fs.writeFile('.env', envContent, 'utf-8');
        console.log(c.success('Created .env file'));

        // Generate jarvis.config.json
        const configContent = this.generateConfigContent();
        await fs.writeFile('jarvis.config.json', JSON.stringify(configContent, null, 2), 'utf-8');
        console.log(c.success('Created jarvis.config.json'));

        // Create data directories
        const dirs = [
            join(this.config.dataDir!, 'memory'),
            join(this.config.dataDir!, 'security'),
            join(this.config.dataDir!, 'logs'),
        ];

        for (const dir of dirs) {
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
        }
        console.log(c.success('Created data directories'));
    }

    private generateEnvContent(): string {
        const lines: string[] = [
            '# JARVIS Configuration',
            '# Generated by setup wizard',
            '',
        ];

        // Add license key
        if (this.config.licenseKey) {
            lines.push(`JARVIS_LICENSE_KEY=${this.config.licenseKey}`);
            lines.push('');
        }

        // Add API key
        if (this.config.apiKey && this.config.provider !== 'ollama') {
            const provider = PROVIDERS[this.config.provider!];
            lines.push(`${provider.keyEnvVar}=${this.config.apiKey}`);
        }

        // Add Ollama model
        if (this.config.provider === 'ollama' && this.config.ollamaModel) {
            lines.push(`OLLAMA_MODEL=${this.config.ollamaModel}`);
        }

        // Add other settings
        lines.push('');
        lines.push('# JARVIS Settings');
        lines.push(`JARVIS_DATA_DIR=${this.config.dataDir}`);
        lines.push(`JARVIS_PROVIDER=${this.config.provider}`);
        lines.push(`JARVIS_SECURITY_ENABLED=${this.config.enableSecurity}`);
        lines.push(`JARVIS_TIERED_INFERENCE=${this.config.enableTieredInference}`);

        return lines.join('\n') + '\n';
    }

    private generateConfigContent(): Record<string, unknown> {
        return {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            provider: {
                primary: this.config.provider,
                fallback: this.config.provider === 'ollama' ? 'gemini' : 'ollama',
            },
            security: {
                enabled: this.config.enableSecurity,
                mode: this.config.enableSecurity ? 'balanced' : 'trust',
            },
            inference: {
                tiered: this.config.enableTieredInference,
                localProvider: 'ollama',
                cloudProvider: this.config.provider === 'ollama' ? 'gemini' : this.config.provider,
            },
            persona: this.config.persona,
            paths: {
                data: this.config.dataDir,
                memory: join(this.config.dataDir!, 'memory'),
                logs: join(this.config.dataDir!, 'logs'),
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private question(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    private checkOllamaInstalled(): boolean {
        try {
            execSync('ollama --version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    private printBanner(): void {
        console.log('');
        console.log(c.title('╔═══════════════════════════════════════════════════════════╗'));
        console.log(c.title('║                                                           ║'));
        console.log(c.title('║         🤖 JARVIS Setup Wizard                           ║'));
        console.log(c.title('║         Your AI Assistant, Ready in Minutes              ║'));
        console.log(c.title('║                                                           ║'));
        console.log(c.title('╚═══════════════════════════════════════════════════════════╝'));
        console.log('');
    }

    private printHelp(): void {
        console.log('Usage: npx jarvis-setup [options]');
        console.log('');
        console.log('Options:');
        console.log('  --quick    Run quick setup with defaults');
        console.log('  --help     Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  npx jarvis-setup           # Interactive mode');
        console.log('  npx jarvis-setup --quick   # Use defaults (Gemini + Security)');
        console.log('');
    }

    private printNextSteps(): void {
        console.log('\n' + c.title('🎉 Setup Complete!\n'));
        console.log('Next steps:\n');

        let step = 1;

        if (!this.config.licenseKey) {
            console.log(`  ${c.highlight(`${step++}.`)} Create an account: ${c.dim(DASHBOARD_URL + '/signup')}`);
            console.log(`  ${c.highlight(`${step++}.`)} Get your license key and re-run: ${c.dim('npm run setup')}`);
        }

        if (!this.config.apiKey && this.config.provider !== 'ollama') {
            const provider = PROVIDERS[this.config.provider!];
            console.log(`  ${c.highlight(`${step++}.`)} Get your API key from: ${provider.signupUrl}`);
            console.log(`  ${c.highlight(`${step++}.`)} Add it to your .env file: ${provider.keyEnvVar}=your-key`);
        }

        console.log(`  ${c.highlight(`${step++}.`)} Run JARVIS: ${c.dim('npm start')}`);
        console.log(`  ${c.highlight(`${step}.`)} Or in CLI mode: ${c.dim('npm run cli')}`);

        console.log('');
        console.log(c.dim(`Dashboard: ${DASHBOARD_URL}`));
        console.log(c.dim('Documentation: https://github.com/personaljarvis/jarvis#readme'));
        console.log(c.dim('Need help? Open an issue on GitHub'));
        console.log('');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Run Wizard
// ═══════════════════════════════════════════════════════════════════════════════

const wizard = new SetupWizard();
wizard.run().catch((error) => {
    console.error(c.error(`Setup failed: ${error.message}`));
    process.exit(1);
});
