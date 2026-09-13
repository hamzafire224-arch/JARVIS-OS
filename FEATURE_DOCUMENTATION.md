# PersonalJARVIS — Complete Feature Documentation

> Every feature showcased on the website, with models, code, examples, and working status.

---

## Table of Contents

1. [Security Framework](#1-security-framework)
2. [Tiered Inference Engine](#2-tiered-inference-engine)
3. [Memory System](#3-memory-system)
4. [Skill Marketplace](#4-skill-marketplace)
5. [Usage Analytics](#5-usage-analytics)
6. [AI Providers](#6-ai-providers)
7. [Skills (Tools)](#7-skills-tools)
8. [Persona & Feedback System](#8-persona--feedback-system)
9. [Plans — Balanced vs Productivity](#9-plans)
10. [Launch Readiness Summary](#10-launch-readiness-summary)

---

## 1. Security Framework

**Source:** `src/security/CapabilityManager.ts`, `src/security/SkillScanner.ts`
**Status:** ✅ Fully integrated into `Agent.checkToolApproval()`

### How It Works

Every time JARVIS executes a tool (file write, terminal command, web fetch, etc.), the request passes through the `CapabilityManager` before execution.

**Flow:**
```
User request → Agent decides tool call → CapabilityManager.checkPermission()
  → If BLOCKED by policy → deny immediately, log to audit
  → If REQUIRES APPROVAL → prompt user via CLI "Allow this operation? [y/n]"
  → If AUTO-APPROVED → execute silently, log to audit
```

### Risk Levels (4 tiers)

| Level | Description | Example Tools |
|-------|------------|---------------|
| `safe` | No side effects | `read_file`, `list_directory` |
| `moderate` | Limited side effects | `write_file`, `http_fetch` |
| `dangerous` | System-level changes | `run_command`, `delete_file` |
| `destructive` | Irreversible damage | `rm -rf`, database drops |

### Security Presets

```typescript
// Conservative (Balanced plan default)
{ mode: 'conservative' }
// → Approval required for ALL tool calls except reads

// Balanced
{ mode: 'balanced' }
// → Auto-approve safe + moderate, ask for dangerous

// Trust
{ mode: 'trust' }
// → Auto-approve everything except destructive
```

### SkillScanner — Malware Detection

When installing community skills, `SkillScanner` scans for:
- `eval()`, `Function()` constructor usage
- `process.exit()`, `child_process.exec()` calls
- Network access patterns (`http.request`, `fetch`)
- File system writes outside workspace
- Environment variable access (`process.env`)

```typescript
// Example scan result
{
  riskScore: 7.5,
  detections: [
    { pattern: 'child_process.exec', severity: 'high', line: 42 },
    { pattern: 'process.env', severity: 'medium', line: 15 }
  ],
  recommendation: 'REVIEW_REQUIRED'
}
```

### Example — Security in Action

```
👤 You: delete all files in /tmp
🤖 JARVIS: I'll need to delete files. Let me execute this...

⚠️  APPROVAL REQUIRED
   Tool: delete_file
   Risk: HIGH (dangerous operation)
   Arguments: { "path": "/tmp/*" }
   Allow? [y/n]: _
```

---

## 2. Tiered Inference Engine

**Source:** `src/providers/ComplexityClassifier.ts`, `src/providers/TieredProviderManager.ts`
**Status:** ⚠️ Code complete but NOT INTEGRATED into the agent loop

### How It Works (Design)

The system classifies every user message by complexity, then routes to the cheapest model that can handle it.

**ComplexityClassifier scoring (0–100):**

| Score Range | Level | Routed To |
|------------|-------|-----------|
| 0–30 | `trivial` | Local (Ollama llama3:8b) |
| 31–50 | `simple` | Local (Ollama) |
| 51–70 | `moderate` | Cloud (Gemini/GPT-4o) |
| 71–85 | `complex` | Cloud (Claude/GPT-4o) |
| 86–100 | `expert` | Cloud (best available) |

**Features extracted for scoring:**
- Token count, sentence count, question marks
- Code block presence, multi-step indicators ("then", "after that")
- Domain keywords (regex, SQL, API, deploy, debug)
- Explicit tool requests (file, terminal, web)

### Example — Classification

```typescript
import { classifyComplexity } from './providers/ComplexityClassifier.js';

classifyComplexity("What's the weather today?");
// → { level: 'trivial', score: 12, useLocal: true }

classifyComplexity("Refactor the auth module to use JWT with refresh tokens, update the database schema, and write migration scripts");
// → { level: 'complex', score: 78, useLocal: false }
```

### Cost Savings Model

```
Local model (Ollama): $0.00/request
Cloud model (Gemini): ~$0.002/request
Cloud model (GPT-4o): ~$0.01/request
Cloud model (Claude): ~$0.015/request

If 70% of requests are simple → routed locally → 70% cost savings
Website claim: "up to 90%" → achievable if most queries are simple
```

### What's Missing

The `TieredProviderManager` is not called from `Agent.initialize()` or `Agent.think()`. The agent always uses the standard `ProviderManager` which picks the first available provider in priority order. **Integration required** (see Launch Readiness section).

---

## 3. Memory System

**Source:** `src/memory/MemoryManager.ts`, `src/memory/HierarchicalMemory.ts`, `src/memory/EpisodicMemory.ts`, `src/memory/MemoryReranker.ts`, `src/memory/PreferenceLearner.ts`, `src/memory/SessionCompactor.ts`

### 3a. Basic Memory (MemoryManager) — ✅ WORKING

Persistent key-value memory stored in a markdown file. Used via `remember` and `recall` tools in MainAgent.

```
👤 You: Remember that my favorite color is blue
🤖 JARVIS: Remembered: favorite_color = blue

👤 You: What's my favorite color?
🤖 JARVIS: [recalls from memory] Your favorite color is blue!
```

**Storage format:** `./memory/memory.md` — human-readable markdown
**Search:** Tag-based + content substring matching

### 3b. Hierarchical Memory (4 Layers) — ⚠️ NOT INTEGRATED

| Layer | Class | Duration | Purpose |
|-------|-------|----------|---------|
| Working | Built-in context | Current session | Active conversation |
| Episodic | `EpisodicMemory` | Days–weeks | Session summaries, highlights |
| Semantic | `MemoryManager` | Permanent | Facts, preferences, projects |
| Vector | `MemoryReranker` | Permanent | Similarity-based retrieval |

**What's missing:** `HierarchicalMemory.ts` has a complete `retrieveContext()` method that queries all 4 layers and combines results, but it's never called from `index.ts` or `MainAgent`. Only the basic `MemoryManager` is initialized.

### 3c. Episodic Memory — ⚠️ NOT INTEGRATED

Creates compressed summaries of past conversations with highlights.

```typescript
// How it WOULD work when integrated:
const episode = await episodicMemory.endSession();
// → {
//   id: "ep-2026-02-14-001",
//   summary: "User asked about deploying a Node.js app...",
//   highlights: ["Configured PM2", "Set up Nginx reverse proxy"],
//   duration: 1200, // seconds
//   toolsUsed: ["run_command", "write_file"]
// }
```

### 3d. Memory Reranker — ⚠️ NOT INTEGRATED

Re-scores retrieved memories based on recency, importance, and contextual relevance.

```typescript
// Scoring formula:
finalScore = (relevance * 0.4) + (recency * 0.3) + (importance * 0.2) + (frequency * 0.1)
```

---

## 4. Skill Marketplace

**Source:** `src/skills/SkillMarketplace.ts`
**Status:** ⚠️ Code complete but NOT accessible from CLI

### How It Works (Design)

A community skill registry that lets users discover, install, and manage third-party skills.

**Supported operations:**
- `browse(category?, page?)` — List available skills
- `search(query)` — Find skills by keyword
- `install(skillId)` — Download, scan for malware, register
- `uninstall(skillId)` — Remove skill and its files
- `update(skillId)` — Check for newer versions
- `getInstalled()` — List installed community skills

### Example — Installing a Skill

```typescript
const marketplace = getSkillMarketplace();
await marketplace.initialize();

// Search for skills
const results = await marketplace.search('docker');
// → [{ id: 'docker-manager', name: 'Docker Manager', rating: 4.5, downloads: 1200 }]

// Install
const result = await marketplace.install('docker-manager');
// → Scans for malware first → Registers with skill registry
```

### What's Missing

No `/marketplace` CLI command in `index.ts`. The marketplace is a standalone module with no user-facing interface.

---

## 5. Usage Analytics

**Source:** `src/analytics/UsageAnalytics.ts`
**Status:** ⚠️ Code complete but NOT instantiated

### How It Works (Design)

Tracks all agent interactions locally (no data sent externally).

**Events tracked:**
- `session_start`, `session_end`
- `message_sent`, `message_received`
- `tool_used` (with tool name, duration, success/failure)
- `provider_used` (which LLM, response time)
- `error` (type, context)

**Reports generated:**
- Daily summary (messages, tools used, provider breakdown)
- Cost estimate based on provider pricing
- Most-used tools and patterns
- Error frequency

### Example — Analytics Report

```typescript
const analytics = getUsageAnalytics();
const report = await analytics.generateReport('daily');
// → {
//   date: '2026-02-14',
//   sessions: 3,
//   messages: 47,
//   toolsUsed: { run_command: 12, write_file: 8, read_file: 22 },
//   providers: { gemini: 30, ollama: 17 },
//   estimatedCost: '$0.18',
//   topPatterns: ['file editing', 'terminal commands']
// }
```

### What's Missing

Never initialized in `index.ts`. No REPL commands (`/stats`, `/report`) exist.

---

## 6. AI Providers

**Source:** `src/providers/`
**Status:** ✅ All 4 providers are functional with fallback

### Supported Providers

| Provider | Class | Default Model | API Key Env Var |
|----------|-------|--------------|----------------|
| **Anthropic** | `AnthropicProvider` | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` |
| **OpenAI** | `OpenAIProvider` | `gpt-4o` | `OPENAI_API_KEY` |
| **Google Gemini** | `GeminiProvider` | `gemini-1.5-pro` | `GOOGLE_AI_API_KEY` |
| **Ollama (Local)** | `OllamaProvider` | `llama3:8b` | None (local) |

### Provider Fallback

Configured via `LLM_PROVIDER_PRIORITY` env var. Default: `anthropic, openai, ollama`.

```
Attempt Anthropic → ❌ no key → Attempt OpenAI → ❌ no key → Attempt Ollama → ✅ local server running → Use Ollama
```

### All Providers Support:
- Text generation with tool calling
- Streaming responses (`runStream()`)
- Token counting and context management
- Availability checking

---

## 7. Skills (Tools)

**Source:** `src/skills/`
**Status:** ✅ All registered and functional

### Filesystem Skills (5 tools)

| Tool | Description |
|------|------------|
| `read_file` | Read file contents with optional line range |
| `write_file` | Write/overwrite file contents |
| `list_directory` | List directory entries with metadata |
| `search_files` | Grep/regex search across files |
| `delete_file` | Delete a file (requires approval) |

### Terminal Skills (4 tools)

| Tool | Description |
|------|------------|
| `run_command` | Execute shell command and return output |
| `start_background_command` | Start long-running process |
| `check_background_command` | Check status of background process |
| `stop_background_command` | Kill a background process |

### Web Skills (4 tools)

| Tool | Description |
|------|------------|
| `http_fetch` | Make HTTP requests (GET, POST, etc.) |
| `read_webpage` | Scrape and extract text from a URL |
| `web_search` | Search the web (requires search API) |
| `download_file` | Download a file from URL to disk |

### Browser Skills — Opt-in (10 tools)

Requires Playwright. Enable with `enableBrowser: true` in skill init.

| Tool | Description |
|------|------------|
| `browser_launch` | Launch a browser instance |
| `browser_navigate` | Navigate to URL |
| `browser_content` | Get page content/DOM |
| `browser_click` | Click an element |
| `browser_fill` | Fill form fields |
| `browser_screenshot` | Take screenshot |
| `browser_execute` | Run JavaScript in page |
| `browser_pdf` | Export page as PDF |
| `browser_wait` | Wait for element/time |
| `browser_close` | Close browser instance |

### GitHub Skills — Opt-in (requires `gh` CLI)

Issues, PRs, repos, labels, milestones management via GitHub CLI.

### Database Skills — Opt-in

SQLite and PostgreSQL support with query execution, table management, schema inspection.

---

## 8. Persona & Feedback System

**Source:** `src/soul/PersonaManager.ts`, `src/soul/FeedbackManager.ts`
**Status:** ✅ Both integrated into MainAgent

### PersonaManager — 4 Presets

| Persona | Style | Best For |
|---------|-------|---------|
| `professional` | Formal, precise, structured | Business/enterprise use |
| `friendly` | Warm, conversational, emoji | Personal assistant |
| `technical` | Terse, code-heavy, minimal prose | Developer workflows |
| `creative` | Expressive, metaphorical | Writing, brainstorming |

Persona augments the system prompt at construction time.

### FeedbackManager — Self-Improvement Loop

```
👤 You: That response was too verbose, I prefer shorter answers
🤖 JARVIS: [calls give_feedback tool]
   → Records: { type: 'preference', category: 'communication_style', message: 'prefer shorter answers' }
   → Stores as learning: "User prefers concise responses"
   → Future responses are adjusted via learnings context
```

**Tools registered:**
- `give_feedback` — Record positive/negative/correction/preference
- `my_learnings` — View what JARVIS has learned from past feedback

---

## 9. Plans

### Balanced Plan (Free)

| Feature | Included |
|---------|---------|
| **AI Model** | Ollama (local, llama3:8b) |
| **Provider Fallback** | Ollama only |
| **Tool Approval** | Conservative (ask for everything) |
| **Memory** | Basic `MemoryManager` (semantic only) |
| **Skills** | Filesystem, Terminal, Web |
| **Security** | Full CapabilityManager |
| **Persona** | Default only |

**Config:** `JARVIS_VARIANT=balanced`

### Productivity Plan ($20/month)

| Feature | Included |
|---------|---------|
| **AI Models** | Claude, GPT-4o, Gemini, Ollama |
| **Provider Fallback** | Full priority chain |
| **Tool Approval** | Balanced or Trust mode |
| **Memory** | Full 4-layer hierarchical (when integrated) |
| **Skills** | All + Browser, GitHub, Database |
| **Security** | Full + SkillScanner |
| **Marketplace** | Browse, install, update community skills |
| **Analytics** | Daily reports, cost tracking |
| **Persona** | All 4 presets + custom |

**Config:** `JARVIS_VARIANT=productivity`

---

## 10. Launch Readiness Summary

### ✅ Ready to Ship (15 features)

- Security framework (CapabilityManager + audit logging)
- 4 risk levels with approval flows
- Skills: Filesystem (5), Terminal (4), Web (4), Browser (10), GitHub, Database
- Provider fallback chain (Anthropic → OpenAI → Gemini → Ollama)
- Basic memory (remember/recall)
- Persona presets (4 + custom)
- Feedback/learning loop
- Setup wizard + Quick start
- CLI REPL interface

### ⚠️ Code Complete but Not Wired (8 features)

| Feature | What's Needed | Effort |
|---------|--------------|--------|
| Tiered inference routing | Wire `TieredProviderManager` into `Agent.initialize()` + `think()` | Medium |
| Hierarchical memory (4 layers) | Replace `initializeMemory()` with `initializeHierarchicalMemory()` in `index.ts` | Medium |
| Episodic memory | Call `endSession()` on REPL exit / `/clear` | Small |
| Memory reranker | Call `rerank()` in `recall` tool handler | Small |
| Usage analytics | Initialize in `index.ts`, track events, add `/stats` command | Medium |
| Skill marketplace | Add `/marketplace` REPL command | Small |
| Cost tracking | Depends on tiered inference integration | Small (after tiered) |
| Cost reporting | Depends on analytics integration | Small (after analytics) |

**Total integration effort: ~4-6 hours of focused work**

### What the Website Claims vs Reality

The website accurately describes the system's *capabilities* — all the code exists and is well-structured. The gap is that **8 modules are standalone rather than connected to the main application flow**. The integration is straightforward because each module has clean initialization functions and singleton patterns ready to plug in.
