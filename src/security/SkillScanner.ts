/**
 * JARVIS Skill Scanner
 * 
 * Scans skills/tools for potentially malicious patterns.
 * Helps protect against the "26% vulnerability" problem identified in OpenClaw.
 * 
 * Features:
 * - Pattern-based detection of dangerous code
 * - Risk scoring for skills
 * - Sandbox recommendations
 * - Community skill verification
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScanResult {
    skillPath: string;
    skillName: string;
    riskScore: number;           // 0-100, higher = riskier
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    findings: Finding[];
    scannedAt: Date;
    recommendation: 'allow' | 'review' | 'sandbox' | 'block';
}

export interface Finding {
    type: FindingType;
    severity: 'info' | 'warning' | 'danger' | 'critical';
    line?: number;
    code?: string;
    description: string;
    mitigation?: string;
}

export type FindingType =
    | 'data_exfiltration'
    | 'credential_access'
    | 'shell_execution'
    | 'network_request'
    | 'file_deletion'
    | 'code_injection'
    | 'obfuscation'
    | 'privilege_escalation'
    | 'environment_access'
    | 'suspicious_import';

// ═══════════════════════════════════════════════════════════════════════════════
// Detection Patterns
// ═══════════════════════════════════════════════════════════════════════════════

interface DetectionPattern {
    type: FindingType;
    pattern: RegExp;
    severity: Finding['severity'];
    description: string;
    mitigation?: string;
    score: number;
}

const DETECTION_PATTERNS: DetectionPattern[] = [
    // Data Exfiltration
    {
        type: 'data_exfiltration',
        pattern: /curl\s+.*(-d|--data)\s.*\$|fetch\(.*\+.*\)/gi,
        severity: 'critical',
        description: 'Potential data exfiltration via HTTP request with dynamic data',
        mitigation: 'Review what data is being sent to external servers',
        score: 40,
    },
    {
        type: 'data_exfiltration',
        pattern: /webhook\.site|requestbin|pipedream|ngrok|burpcollaborator/gi,
        severity: 'critical',
        description: 'Known data exfiltration endpoints detected',
        mitigation: 'Block this skill immediately',
        score: 50,
    },
    {
        type: 'data_exfiltration',
        pattern: /base64.*encode.*fetch|btoa.*XMLHttpRequest/gi,
        severity: 'danger',
        description: 'Base64 encoding combined with HTTP request (obfuscated exfiltration)',
        mitigation: 'Investigate what data is being encoded and sent',
        score: 35,
    },

    // Credential Access
    {
        type: 'credential_access',
        pattern: /\.ssh|\.aws|\.gnupg|\.config|keychain|credentials/gi,
        severity: 'critical',
        description: 'Access to sensitive credential directories',
        mitigation: 'Block access to credential paths',
        score: 45,
    },
    {
        type: 'credential_access',
        pattern: /API_KEY|SECRET_KEY|PRIVATE_KEY|PASSWORD|TOKEN/g,
        severity: 'warning',
        description: 'References to credential-like environment variables',
        mitigation: 'Ensure credentials are not being exfiltrated',
        score: 20,
    },
    {
        type: 'credential_access',
        pattern: /os\.environ|process\.env\[|getenv\(/gi,
        severity: 'warning',
        description: 'Environment variable access',
        mitigation: 'Verify only necessary env vars are accessed',
        score: 15,
    },

    // Shell Execution
    {
        type: 'shell_execution',
        pattern: /exec\(|execSync|spawn\(|child_process|subprocess|os\.system|popen/gi,
        severity: 'danger',
        description: 'Shell command execution capability',
        mitigation: 'Ensure commands are validated and sanitized',
        score: 25,
    },
    {
        type: 'shell_execution',
        pattern: /eval\(|new Function\(|setTimeout\(.*\+|setInterval\(.*\+/gi,
        severity: 'critical',
        description: 'Dynamic code execution (potential code injection)',
        mitigation: 'Never allow eval with user-controlled input',
        score: 40,
    },
    {
        type: 'shell_execution',
        pattern: /rm\s+-rf|rmdir.*\/s|del\s+\/f\s+\/q/gi,
        severity: 'critical',
        description: 'Recursive delete commands',
        mitigation: 'Block destructive file operations',
        score: 45,
    },

    // Network Requests
    {
        type: 'network_request',
        pattern: /fetch\(|axios|XMLHttpRequest|http\.request|requests\.(get|post)/gi,
        severity: 'info',
        description: 'Network request capability',
        mitigation: 'Ensure requests go to expected domains only',
        score: 10,
    },
    {
        type: 'network_request',
        pattern: /\$\(curl|`curl|`wget|\$\(wget/gi,
        severity: 'danger',
        description: 'Shell-based network requests with command substitution',
        mitigation: 'Review for data exfiltration',
        score: 30,
    },

    // File Deletion
    {
        type: 'file_deletion',
        pattern: /fs\.unlink|fs\.rmdir|os\.remove|shutil\.rmtree|unlink\(/gi,
        severity: 'warning',
        description: 'File deletion capability',
        mitigation: 'Ensure deletions are scoped to safe directories',
        score: 20,
    },

    // Code Injection
    {
        type: 'code_injection',
        pattern: /innerHTML\s*=|outerHTML\s*=|document\.write/gi,
        severity: 'warning',
        description: 'DOM manipulation (potential XSS vector)',
        mitigation: 'Use safe DOM methods instead',
        score: 15,
    },

    // Obfuscation
    {
        type: 'obfuscation',
        pattern: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|atob\(|Buffer\.from\(.*base64/gi,
        severity: 'warning',
        description: 'Encoded/obfuscated strings detected',
        mitigation: 'Decode and review obfuscated content',
        score: 20,
    },
    {
        type: 'obfuscation',
        pattern: /\['.*'\]\s*\(/gi,
        severity: 'warning',
        description: 'Bracket notation function calls (obfuscation technique)',
        mitigation: 'Review for hidden functionality',
        score: 15,
    },

    // Privilege Escalation
    {
        type: 'privilege_escalation',
        pattern: /sudo|chmod\s+[0-7]{3,4}|chown|setuid|setgid/gi,
        severity: 'danger',
        description: 'Privilege escalation commands',
        mitigation: 'Block elevated permission operations',
        score: 35,
    },

    // Suspicious Imports
    {
        type: 'suspicious_import',
        pattern: /require\(['"]crypto['"]|import\s+.*from\s+['"]node:crypto/gi,
        severity: 'info',
        description: 'Crypto module import',
        mitigation: 'Verify crypto is used for legitimate purposes',
        score: 5,
    },
    {
        type: 'suspicious_import',
        pattern: /require\(['"]net['"]|import\s+.*from\s+['"]node:net/gi,
        severity: 'warning',
        description: 'Low-level network module import',
        mitigation: 'Review for backdoor connections',
        score: 15,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Scanner
// ═══════════════════════════════════════════════════════════════════════════════

export class SkillScanner {
    private scanCache: Map<string, ScanResult> = new Map();

    // ─────────────────────────────────────────────────────────────────────────────
    // Main Scanning Methods
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Scan a skill file for security issues
     */
    async scanFile(filePath: string): Promise<ScanResult> {
        // Check cache first
        const cached = this.scanCache.get(filePath);
        if (cached && (Date.now() - cached.scannedAt.getTime()) < 3600000) {
            return cached;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const result = this.scanContent(content, filePath);

        this.scanCache.set(filePath, result);
        return result;
    }

    /**
     * Scan skill code content directly
     */
    scanContent(content: string, skillPath: string): ScanResult {
        const findings: Finding[] = [];
        const lines = content.split('\n');

        for (const pattern of DETECTION_PATTERNS) {
            let match;
            pattern.pattern.lastIndex = 0; // Reset regex state

            // Line-by-line matching for better location info
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue; // Skip empty/undefined lines
                pattern.pattern.lastIndex = 0;

                while ((match = pattern.pattern.exec(line)) !== null) {
                    findings.push({
                        type: pattern.type,
                        severity: pattern.severity,
                        line: i + 1,
                        code: match[0],
                        description: pattern.description,
                        mitigation: pattern.mitigation,
                    });
                }
            }
        }

        // Calculate risk score
        const riskScore = this.calculateRiskScore(findings);
        const riskLevel = this.getRiskLevel(riskScore);
        const recommendation = this.getRecommendation(riskLevel, findings);

        const result: ScanResult = {
            skillPath,
            skillName: basename(skillPath, '.ts').replace('.js', ''),
            riskScore,
            riskLevel,
            findings,
            scannedAt: new Date(),
            recommendation,
        };

        logger.debug('Skill scan complete', {
            skill: result.skillName,
            riskScore,
            riskLevel,
            findingCount: findings.length,
        });

        return result;
    }

    /**
     * Scan an entire directory of skills
     */
    async scanDirectory(dirPath: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                    const fullPath = join(dirPath, entry.name);
                    const result = await this.scanFile(fullPath);
                    results.push(result);
                }
            }
        } catch (error) {
            logger.error('Failed to scan directory', {
                path: dirPath,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return results;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Risk Assessment
    // ─────────────────────────────────────────────────────────────────────────────

    private calculateRiskScore(findings: Finding[]): number {
        let score = 0;

        for (const finding of findings) {
            // Find matching pattern to get score
            const pattern = DETECTION_PATTERNS.find(
                p => p.type === finding.type && p.severity === finding.severity
            );
            if (pattern) {
                score += pattern.score;
            } else {
                // Default scores by severity
                switch (finding.severity) {
                    case 'critical': score += 40; break;
                    case 'danger': score += 25; break;
                    case 'warning': score += 15; break;
                    case 'info': score += 5; break;
                }
            }
        }

        // Cap at 100
        return Math.min(100, score);
    }

    private getRiskLevel(score: number): ScanResult['riskLevel'] {
        if (score === 0) return 'safe';
        if (score <= 20) return 'low';
        if (score <= 50) return 'medium';
        if (score <= 80) return 'high';
        return 'critical';
    }

    private getRecommendation(
        riskLevel: ScanResult['riskLevel'],
        findings: Finding[]
    ): ScanResult['recommendation'] {
        // Critical findings always block
        if (findings.some(f => f.severity === 'critical')) {
            return 'block';
        }

        switch (riskLevel) {
            case 'safe':
                return 'allow';
            case 'low':
                return 'allow';
            case 'medium':
                return 'review';
            case 'high':
                return 'sandbox';
            case 'critical':
                return 'block';
            default:
                return 'review';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Reporting
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate a human-readable report
     */
    generateReport(result: ScanResult): string {
        const lines: string[] = [
            `# Security Scan Report: ${result.skillName}`,
            '',
            `**Risk Score:** ${result.riskScore}/100`,
            `**Risk Level:** ${result.riskLevel.toUpperCase()}`,
            `**Recommendation:** ${result.recommendation.toUpperCase()}`,
            `**Scanned:** ${result.scannedAt.toISOString()}`,
            '',
        ];

        if (result.findings.length === 0) {
            lines.push('✅ No security issues detected.');
        } else {
            lines.push(`## Findings (${result.findings.length})`);
            lines.push('');

            // Group by severity
            const bySeverity = this.groupBySeverity(result.findings);

            for (const severity of ['critical', 'danger', 'warning', 'info'] as Finding['severity'][]) {
                const group = bySeverity[severity];
                if (!group || group.length === 0) continue;

                const icon = this.getSeverityIcon(severity);
                lines.push(`### ${icon} ${severity.toUpperCase()} (${group.length})`);
                lines.push('');

                for (const finding of group) {
                    const lineInfo = finding.line !== undefined ? `line ${finding.line}` : 'unknown location';
                    lines.push(`- **${finding.type}** (${lineInfo})`);
                    lines.push(`  - ${finding.description}`);
                    if (finding.code) {
                        lines.push(`  - Code: \`${finding.code.slice(0, 50)}\``);
                    }
                    if (finding.mitigation) {
                        lines.push(`  - 💡 ${finding.mitigation}`);
                    }
                    lines.push('');
                }
            }
        }

        return lines.join('\n');
    }

    private groupBySeverity(findings: Finding[]): Record<Finding['severity'], Finding[]> {
        const groups: Record<Finding['severity'], Finding[]> = {
            critical: [],
            danger: [],
            warning: [],
            info: [],
        };

        for (const finding of findings) {
            groups[finding.severity].push(finding);
        }

        return groups;
    }

    private getSeverityIcon(severity: Finding['severity']): string {
        switch (severity) {
            case 'critical': return '🔴';
            case 'danger': return '🟠';
            case 'warning': return '🟡';
            case 'info': return '🔵';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Cache Management
    // ─────────────────────────────────────────────────────────────────────────────

    clearCache(): void {
        this.scanCache.clear();
    }

    getCacheStats(): { entries: number; oldestScan: Date | null } {
        let oldest: Date | null = null;

        for (const result of this.scanCache.values()) {
            if (!oldest || result.scannedAt < oldest) {
                oldest = result.scannedAt;
            }
        }

        return {
            entries: this.scanCache.size,
            oldestScan: oldest,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let scannerInstance: SkillScanner | null = null;

export function getSkillScanner(): SkillScanner {
    if (!scannerInstance) {
        scannerInstance = new SkillScanner();
    }
    return scannerInstance;
}

export function resetSkillScanner(): void {
    scannerInstance = null;
}
