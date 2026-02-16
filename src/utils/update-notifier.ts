/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PersonalJARVIS — Update Notifier
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Checks npm registry for newer versions and displays a non-intrusive
 * notification if an update is available. Caches check results for 24h.
 * 
 * Runs asynchronously, never blocks startup, never throws.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface UpdateCache {
    lastChecked: string;
    latestVersion: string;
    currentVersion: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PACKAGE_NAME = 'personaljarvis';

function getCachePath(): string {
    return path.join(os.homedir(), '.jarvis', 'update-check.json');
}

function readCache(): UpdateCache | null {
    try {
        const cachePath = getCachePath();
        if (fs.existsSync(cachePath)) {
            return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        }
    } catch {
        // Ignore cache read errors
    }
    return null;
}

function writeCache(cache: UpdateCache): void {
    try {
        const dir = path.dirname(getCachePath());
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getCachePath(), JSON.stringify(cache));
    } catch {
        // Ignore cache write errors
    }
}

function getCurrentVersion(): string {
    try {
        // Read from package.json in the installed location
        const pkgPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json');
        // On Windows, strip leading / from file paths
        const cleanPath = process.platform === 'win32' ? pkgPath.replace(/^\//, '') : pkgPath;
        const pkg = JSON.parse(fs.readFileSync(cleanPath, 'utf-8'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((partsA[i] || 0) < (partsB[i] || 0)) return -1;
        if ((partsA[i] || 0) > (partsB[i] || 0)) return 1;
    }
    return 0;
}

function displayUpdateNotice(current: string, latest: string): void {
    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const dim = '\x1b[2m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.log('');
    console.log(`  ${yellow}╭──────────────────────────────────────────────╮${reset}`);
    console.log(`  ${yellow}│${reset}                                              ${yellow}│${reset}`);
    console.log(`  ${yellow}│${reset}   Update available: ${dim}${current}${reset} → ${cyan}${bold}${latest}${reset}        ${yellow}│${reset}`);
    console.log(`  ${yellow}│${reset}   Run ${cyan}npm i -g personaljarvis${reset} to update   ${yellow}│${reset}`);
    console.log(`  ${yellow}│${reset}                                              ${yellow}│${reset}`);
    console.log(`  ${yellow}╰──────────────────────────────────────────────╯${reset}`);
    console.log('');
}

/**
 * Check for updates and display a notification if available.
 * Non-blocking, fire-and-forget. Never throws.
 */
export async function checkForUpdates(): Promise<void> {
    try {
        const currentVersion = getCurrentVersion();

        // Check cache first
        const cached = readCache();
        if (cached) {
            const lastChecked = new Date(cached.lastChecked).getTime();
            if (Date.now() - lastChecked < CACHE_TTL_MS) {
                // Use cached result
                if (compareVersions(currentVersion, cached.latestVersion) < 0) {
                    displayUpdateNotice(currentVersion, cached.latestVersion);
                }
                return;
            }
        }

        // Fetch latest version from npm registry (3s timeout)
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timer);

        if (!res.ok) return;

        const data = await res.json() as { version?: string };
        const latestVersion = data.version || currentVersion;

        // Cache the result
        writeCache({
            lastChecked: new Date().toISOString(),
            latestVersion,
            currentVersion,
        });

        // Display notice if update available
        if (compareVersions(currentVersion, latestVersion) < 0) {
            displayUpdateNotice(currentVersion, latestVersion);
        }
    } catch {
        // Silent fail — update checks should never break the app
    }
}
