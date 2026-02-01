# JARVIS — Your Sovereign AI Operative

> **Just A Rather Very Intelligent System**  
> A local-first Personal OS that transforms you from a busy professional into a person with superpowers.

---

## Table of Contents

1. [What is JARVIS?](#what-is-jarvis)
2. [Architecture Overview](#architecture-overview)
3. [Installation & Setup](#installation--setup)
4. [Configuration Modes](#configuration-modes)
5. [Complete Feature Reference](#complete-feature-reference)
6. [User Experience Walkthrough](#user-experience-walkthrough)
7. [Backend Deep Dive](#backend-deep-dive)
8. [API & Provider Setup](#api--provider-setup)
9. [Capabilities & Limitations](#capabilities--limitations)
10. [Security & Privacy](#security--privacy)
11. [Future Enhancements](#future-enhancements)
12. [Why JARVIS is Different](#why-jarvis-is-different)

---

## What is JARVIS?

JARVIS is not a chatbot. It's an **autonomous AI operative** that lives on your hardware and acts as a 24/7 digital partner. While ChatGPT forgets you the moment you close the tab, JARVIS remembers your wife's birthday, your project deadlines, and your preference for black coffee.

### The Core Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL AI ASSISTANTS                     │
│  • Cloud-dependent          • Forgets everything each session   │
│  • Your data on their servers • Reactive only                   │
│  • Limited to chat interface  • No real-world actions           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ vs ↓
┌─────────────────────────────────────────────────────────────────┐
│                           JARVIS                                 │
│  • Local-first             • Persistent memory across sessions  │
│  • Your data stays yours   • Proactive (wakes up to help)       │
│  • Multi-platform presence • Takes real actions in your world   │
└─────────────────────────────────────────────────────────────────┘
```

### What JARVIS Actually Does

| Capability | Example |
|------------|---------|
| **Morning Briefing** | Wakes you at 8 AM with calendar, weather, and top emails |
| **Inbox Triage** | Categorizes emails, unsubscribes from spam, drafts replies |
| **Web Automation** | Checks flight prices, fills forms, books appointments |
| **Code Assistant** | Writes, tests, and deploys code while you sleep |
| **Memory Partner** | Remembers everything you tell it—preferences, dates, context |
| **Multi-Platform** | Reaches you via Telegram, WhatsApp, Discord, or local CLI |

---

## Architecture Overview

JARVIS operates as a modular system with four primary components:

```
                    ┌───────────────────────────────────────┐
                    │           USER INTERFACES             │
                    │  Telegram • WhatsApp • Discord • CLI  │
                    └──────────────────┬────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        THE GATEWAY                                │
│                     (WebSocket Server)                            │
│  • Port 18789                • JSON-RPC 2.0 Protocol             │
│  • Session Management        • Message Routing                   │
│  • Authentication            • Heartbeat Scheduling              │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   THE BRAIN     │    │    MEMORY        │    │    SKILLS       │
│   (Agents)      │    │    SYSTEM        │    │    (Tools)      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • MainAgent     │    │ • MemoryManager  │    │ • Filesystem    │
│ • CoderAgent    │    │ • SessionContext │    │ • Terminal      │
│ • ResearchAgent │    │ • SessionCompactor│   │ • Browser       │
│ • CalendarAgent │    │ • PreferenceLearner│  │ • Web/HTTP      │
│ • EmailAgent    │    │ • FeedbackManager│    │ • Code Execution│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────────────┐
                    │         LLM PROVIDERS                 │
                    │  Gemini • Claude • GPT-4 • Ollama     │
                    │      (with automatic failover)        │
                    └───────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Gateway** | Central switchboard for all messages | Node.js WebSocket server |
| **MainAgent** | Orchestrator that routes to specialists | LangChain-style agent loop |
| **Sub-Agents** | Specialized agents for specific domains | Coder, Research, Calendar, Email |
| **Memory** | Persistent storage for context & learning | Local JSON/Markdown files |
| **Skills** | Modular tool implementations | TypeScript modules |
| **Adapters** | Platform connectors | Telegram, WhatsApp, Discord APIs |
| **Providers** | LLM integration layer | Multiple AI model support |

---

## Installation & Setup

### System Requirements

| Mode | RAM | CPU | Storage | Cost |
|------|-----|-----|---------|------|
| **Productivity** | 2-4 GB | Any modern CPU | 1 GB | $5/mo VPS or old laptop |
| **Balanced** | 16+ GB | Apple M1+ or modern x86 | 10 GB | Mac Mini or workstation |

### Step 1: Prerequisites

```bash
# 1. Install Node.js 22+ (required)
# Windows: Download from https://nodejs.org
# macOS: brew install node@22
# Linux: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# 2. Verify installation
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x

# 3. Install Git
git --version   # Should show 2.x.x
```

### Step 2: Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/JARVIS.git
cd JARVIS

# Install dependencies
npm install

# Install Playwright browsers (for web automation)
npx playwright install chromium
```

### Step 3: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your settings
notepad .env  # Windows
nano .env     # macOS/Linux
```

**Required Environment Variables:**

```env
# ═══════════════════════════════════════════════════════════════
# LLM PROVIDER CONFIGURATION (choose at least one)
# ═══════════════════════════════════════════════════════════════

# Google Gemini (recommended - best cost/performance)
GEMINI_API_KEY=your_gemini_api_key_here

# Alternative: Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_key_here

# Alternative: OpenAI
OPENAI_API_KEY=your_openai_key_here

# Alternative: Local Ollama (free, runs on your machine)
OLLAMA_BASE_URL=http://localhost:11434

# ═══════════════════════════════════════════════════════════════
# JARVIS CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Mode: 'productivity' (lightweight) or 'balanced' (full power)
JARVIS_VARIANT=balanced

# Gateway port
GATEWAY_PORT=18789

# Log level: debug, info, warn, error
LOG_LEVEL=info

# ═══════════════════════════════════════════════════════════════
# MESSAGING ADAPTERS (optional - enable what you need)
# ═══════════════════════════════════════════════════════════════

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# WhatsApp (Meta Cloud API)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

### Step 4: Build & Start

```bash
# Build the TypeScript
npm run build

# Start JARVIS
npm start

# Or run in development mode (auto-reload)
npm run dev
```

**Expected Output:**

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗                 ║
║       ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝                 ║
║       ██║███████║██████╔╝██║   ██║██║███████╗                 ║
║  ██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║                 ║
║  ╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║                 ║
║   ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝                 ║
║                                                                ║
║  Just A Rather Very Intelligent System                         ║
║  Version 1.0.0 | Mode: balanced                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

[INFO] Gateway started on ws://localhost:18789
[INFO] Memory Manager initialized (47 memories loaded)
[INFO] Heartbeat Scheduler started (5 tasks registered)
[INFO] Skills initialized: 25 tools available
[INFO] Ready to serve.
```

---

## Configuration Modes

JARVIS operates in two distinct modes, each optimized for different use cases:

### Productivity Mode

**Target User:** Busy professionals who want automation without complexity.

**Hardware:** $5/month VPS, Raspberry Pi 4, or any old laptop with 2-4GB RAM.

```typescript
// .env
JARVIS_VARIANT=productivity
```

**Capabilities:**

| Feature | Status |
|---------|--------|
| Single MainAgent | ✅ Enabled |
| Multi-Agent Delegation | ❌ Disabled |
| Memory System | ✅ Full |
| Heartbeat Scheduler | ✅ Enabled |
| Messaging Adapters | ✅ All |
| Terminal Commands | ⚠️ Read-only |
| Browser Automation | ✅ Enabled |
| File Operations | ⚠️ Restricted to safe directories |

**Best For:**
- Morning briefings and daily digests
- Email triage and auto-responses
- Calendar management
- Web research and price monitoring
- Simple automations

### Balanced Mode

**Target User:** Developers and power users who want a true AI teammate.

**Hardware:** Mac Mini M1+ (16GB RAM) or powerful workstation.

```typescript
// .env
JARVIS_VARIANT=balanced
```

**Capabilities:**

| Feature | Status |
|---------|--------|
| MainAgent + Sub-Agents | ✅ Full multi-agent |
| Multi-Agent Delegation | ✅ Automatic routing |
| Memory System | ✅ Full |
| Heartbeat Scheduler | ✅ Enabled |
| All Messaging Adapters | ✅ Enabled |
| Terminal Commands | ✅ Full access |
| Browser Automation | ✅ Full Playwright |
| File Operations | ✅ Full filesystem |
| Code Execution | ✅ Sandboxed |
| Git Operations | ✅ Enabled |

**Best For:**
- Autonomous coding sessions
- CI/CD monitoring and fixes
- Research + implementation tasks
- System monitoring
- Full development workflow automation

---

## Complete Feature Reference

### 1. Persistent Memory System

Unlike cloud assistants that forget everything, JARVIS maintains a sophisticated memory system:

```
~/.jarvis/
├── memory/
│   ├── memories.json        # All stored memories
│   ├── sessions/            # Conversation history
│   ├── preferences.json     # Learned user preferences
│   └── feedback/            # Self-improvement data
```

**Memory Types:**

| Type | Purpose | Example |
|------|---------|---------|
| `preference` | How you like things done | "User prefers concise responses" |
| `fact` | Important information | "User's wife is named Sarah" |
| `project` | Active work contexts | "Working on Q1 budget proposal" |
| `context` | Situational awareness | "User is on vacation until Jan 15" |
| `feedback` | Learning from corrections | "Don't use emojis with this user" |

**Agent Tools:**

```
remember(key, value, category, importance)
  → Store new information

recall(query, type?)
  → Search memories by content or type
```

### 2. Heartbeat Scheduler (Proactive Tasks)

JARVIS doesn't wait for you to ask—it wakes up on schedule:

**Preset Tasks:**

| Task | Default Schedule | Description |
|------|------------------|-------------|
| `morning-briefing` | 8:00 AM daily | Calendar, weather, emails, tasks |
| `email-triage` | Every 30 min | Check and categorize new emails |
| `pipeline-monitor` | Every 15 min | Check CI/CD status |
| `evening-summary` | 6:00 PM daily | Day recap and tomorrow prep |
| `weekly-review` | Monday 9:00 AM | Week planning summary |

**Custom Tasks:**

```typescript
// Register via Gateway JSON-RPC
{
  "method": "heartbeat.register",
  "params": {
    "name": "check-flight-prices",
    "description": "Monitor flight to Tokyo",
    "schedule": "0 */6 * * *",  // Every 6 hours
    "prompt": "Check prices for SFO to TYO flights for Feb 14-21",
    "enabled": true
  }
}
```

### 3. Multi-Platform Messaging

JARVIS meets you where you are:

**Telegram Integration:**

```bash
# 1. Create bot with @BotFather
# 2. Get token and add to .env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# 3. Bot features:
- /start - Begin conversation
- /status - System status
- /help - Command list
- /reset - Clear conversation
```

**Discord Integration:**

```bash
# 1. Create application at discord.com/developers
# 2. Add bot and get token
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id

# 3. Invite bot to server with proper permissions
# 4. @mention bot or DM to interact
```

**WhatsApp Integration:**

```bash
# 1. Set up Meta Cloud API
# 2. Configure webhook endpoint
# 3. Add credentials to .env
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

### 4. Browser Automation (Playwright)

JARVIS can browse the web for you:

**Available Skills:**

| Skill | Description |
|-------|-------------|
| `browser_launch` | Start Chromium, Firefox, or WebKit |
| `browser_navigate` | Go to any URL |
| `browser_content` | Extract page text/HTML/markdown |
| `browser_click` | Click buttons and links |
| `browser_fill` | Fill form fields |
| `browser_screenshot` | Capture page images |
| `browser_pdf` | Generate PDFs |
| `browser_execute` | Run JavaScript |
| `browser_wait` | Wait for elements |
| `browser_close` | Close session |

**Example Workflow:**

```
User: "Check the price of flights to Tokyo for Valentine's Day"

JARVIS:
1. browser_launch → Opens headless Chrome
2. browser_navigate → Goes to Google Flights
3. browser_fill → Enters SFO → TYO, Feb 14-21
4. browser_click → Searches
5. browser_content → Extracts prices
6. browser_close → Cleans up

Response: "Direct flights to Tokyo for Feb 14-21:
• ANA: $1,247 (cheapest)
• JAL: $1,389
• United: $1,512"
```

### 5. Multi-Agent Delegation (Balanced Mode)

In balanced mode, JARVIS routes tasks to specialists:

**Available Sub-Agents:**

| Agent | Specialty | Triggers |
|-------|-----------|----------|
| `CoderAgent` | Writing code, debugging, Git | "write a function", "fix this bug" |
| `ResearchAgent` | Web research, documentation | "find out about", "research" |
| `CalendarAgent` | Scheduling, reminders | "schedule", "remind me" |
| `EmailAgent` | Email management | "check email", "draft a reply" |

**Routing Process:**

```
User: "Research the best practices for React 19 and create a summary component"

MainAgent analyzes → Routes to ResearchAgent
  → Searches web, reads documentation
  → Returns findings

MainAgent analyzes → Routes to CoderAgent  
  → Writes React component
  → Tests code
  → Returns implementation
  
MainAgent synthesizes → Delivers complete response
```

### 6. Self-Improvement Feedback Loop

JARVIS learns from your feedback:

**Feedback Types:**

| Type | When to Use | Example |
|------|-------------|---------|
| `positive` | JARVIS did well | "That was exactly what I needed" |
| `negative` | JARVIS made a mistake | "This response was too long" |
| `correction` | How it should have been | "Next time, just give me the summary" |
| `preference` | General preference | "I prefer bullet points" |

**The Learning Loop:**

```
1. You provide feedback → "You're being too verbose"
2. JARVIS records it via give_feedback tool
3. FeedbackManager tracks patterns
4. After 3+ similar feedbacks → Creates LearnedBehavior
5. Learning injected into future prompts
6. Optionally updates SOUL.md (core personality file)
```

**View Learnings:**

```
User: "What have you learned about my preferences?"

JARVIS uses my_learnings tool:
{
  "learnings": [
    {
      "description": "User prefers concise, bullet-point responses",
      "learnedAt": "2026-01-15T10:30:00Z"
    },
    {
      "description": "Avoid using emojis in professional contexts",
      "learnedAt": "2026-01-20T14:45:00Z"
    }
  ],
  "statistics": {
    "total": 47,
    "byType": { "positive": 30, "negative": 12, "correction": 5 }
  }
}
```

### 7. Terminal & Filesystem Skills

**Filesystem Operations:**

| Skill | Description |
|-------|-------------|
| `read_file` | Read file contents |
| `write_file` | Create/update files |
| `list_directory` | Browse directories |
| `search_files` | Find files by pattern |
| `delete_file` | Remove files (with approval) |

**Terminal Commands:**

| Skill | Description |
|-------|-------------|
| `run_command` | Execute shell command |
| `start_background_command` | Run async process |
| `check_background_command` | Check process status |
| `stop_background_command` | Terminate process |

### 8. Web Skills (HTTP)

| Skill | Description |
|-------|-------------|
| `http_fetch` | Make API requests |
| `read_webpage` | Extract web page content |
| `web_search` | Search the web |
| `download_file` | Download files |

---

## User Experience Walkthrough

### First-Time Setup Experience

**Step 1: Clone and Configure**

```bash
git clone https://github.com/yourusername/JARVIS.git
cd JARVIS
npm install
cp .env.example .env
```

**Step 2: Get Your API Key**

For Gemini (recommended):
1. Go to https://aistudio.google.com/apikey
2. Create new API key
3. Paste into `.env` as `GEMINI_API_KEY`

**Step 3: Connect Your Messaging App**

For Telegram:
1. Open Telegram, search @BotFather
2. Send `/newbot`, follow prompts
3. Copy token to `.env` as `TELEGRAM_BOT_TOKEN`

**Step 4: Start JARVIS**

```bash
npm run build
npm start
```

**Step 5: Send Your First Message**

Open Telegram, find your bot, send:
```
Hello JARVIS, remember that my name is Alex and I work at Acme Corp
```

JARVIS responds:
```
Nice to meet you, Alex! I've stored this information:
- Name: Alex
- Workplace: Acme Corp

I'll remember this across all our future conversations. 
What can I help you with today?
```

### Daily Workflow Example

**Morning (8:00 AM) — Automatic Briefing**

Your phone buzzes with a Telegram message from JARVIS:

```
☀️ Good morning, Alex!

📅 TODAY'S CALENDAR
• 9:30 AM - Team standup (Zoom)
• 2:00 PM - Dentist appointment
• 4:00 PM - 1:1 with Sarah

📧 EMAIL SUMMARY
• 3 high-priority (VP request, client follow-up, contract review)
• 12 newsletters (auto-archived)
• 5 notifications (GitHub PRs ready for review)

🌤️ WEATHER
San Francisco: 62°F, partly cloudy. Rain expected after 6 PM.

📋 PENDING TASKS
• Finish Q1 budget proposal (due tomorrow)
• Review PR #234 from Jamie

Anything you'd like me to handle first?
```

**Mid-Day — Research Request**

You message JARVIS:
```
Research the best project management tools for a 10-person startup. 
Focus on ones with good GitHub integration.
```

JARVIS:
```
Researching now... I'll check pricing, features, and reviews.

[2 minutes later]

📊 TOP PROJECT MANAGEMENT TOOLS FOR STARTUPS

1. LINEAR ($8/user/mo)
   ✅ Native GitHub integration (best-in-class)
   ✅ Built for engineering teams
   ⚠️ Less robust for non-dev workflows

2. NOTION + GITHUB APP (Free-$10/user)
   ✅ Very flexible, great documentation
   ✅ GitHub sync via third-party integrations  
   ⚠️ Requires setup and customization

3. ASANA ($10.99/user/mo)
   ✅ Excellent workflow automation
   ✅ GitHub integration via Unito
   ⚠️ Can feel heavyweight for small teams

RECOMMENDATION: Linear if you're engineering-heavy, 
Notion if you need flexibility across departments.

Want me to draft a comparison doc for your team?
```

**Evening — Autonomous Task**

You leave this instruction before heading out:
```
While I'm at dinner, can you:
1. Check if there are any failing CI builds
2. If the tests are just flaky retries, restart them
3. Send me a summary when done
```

JARVIS at 9:30 PM:
```
✅ CI/CD CHECK COMPLETE

I checked your 3 active repositories:

ACME-FRONTEND
• Build #456: ✅ Passed

ACME-API  
• Build #789: ⚠️ Failed (flaky test in auth.spec.ts)
• Action: Restarted build → Now passing ✅

ACME-MOBILE
• Build #234: ✅ Passed

All systems green. Enjoy your evening!
```

---

## Backend Deep Dive

### What Happens When You Send a Message

```
┌─────────────────────────────────────────────────────────────────┐
│                      MESSAGE FLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. USER SENDS MESSAGE VIA TELEGRAM
   ↓
2. TELEGRAM ADAPTER receives webhook/polling update
   └── Parses message, extracts user ID, content
   └── Rate limiting check
   └── Authorization check (if configured)
   ↓
3. ADAPTER EMITS 'message' EVENT
   └── Gateway's TelegramHandler catches this
   └── Finds or creates session for user
   ↓
4. MESSAGE ROUTED TO GATEWAY
   └── Session context loaded from memory
   └── Conversation history appended
   ↓
5. MAIN AGENT RECEIVES REQUEST
   └── System prompt + memory context + user message
   └── Sent to LLM provider (Gemini/Claude/GPT)
   ↓
6. LLM GENERATES RESPONSE
   └── May include tool calls (function calling)
   ↓
7. IF TOOL CALLS PRESENT:
   └── Agent executes each tool
   └── Results returned to LLM
   └── LLM generates final response
   ↓
8. RESPONSE SENT BACK
   └── Through Gateway → Adapter → Telegram
   └── Session state saved
   └── Memory updated if needed
```

### Code: How Gateway Handles a Chat Message

```typescript
// src/gateway/JarvisHandlers.ts

gateway.registerHandler('chat', async (session, params) => {
    const message = params['message'] as string;
    const conversationId = params['conversationId'] as string;

    // 1. Get or create agent for this session
    let agent = agentSessions.get(session.id);
    if (!agent) {
        agent = createMainAgent({
            onApprovalRequired: async (tool, args) => {
                // Broadcast approval request to client
                gateway.sendToSession(session.id, {
                    method: 'approval_required',
                    params: { tool, args }
                });
                return waitForApproval(session.id);
            }
        });
        await agent.initialize();
        agentSessions.set(session.id, agent);
    }

    // 2. Load conversation context from memory
    const sessionManager = getSessionManager();
    const sessionContext = await sessionManager.getSession(conversationId);
    
    // 3. Inject memory into agent context
    const memories = await memoryManager.search(message);
    const learnings = feedbackManager.getLearningsContext();
    
    // 4. Execute agent with full context
    const result = await agent.execute(message, {
        conversationHistory: sessionContext.messages,
        relevantMemories: memories,
        learnedBehaviors: learnings
    });

    // 5. Store interaction in memory
    await sessionContext.addMessage('user', message);
    await sessionContext.addMessage('assistant', result.content);

    // 6. Return response
    return {
        content: result.content,
        toolsUsed: result.toolsUsed,
        tokensUsed: result.usage
    };
});
```

### Code: How an Agent Uses Tools

```typescript
// src/agent/Agent.ts

async execute(userMessage: string): Promise<AgentExecutionResult> {
    let iterations = 0;
    const maxIterations = this.options.maxIterations ?? 10;
    
    // Build messages array
    const messages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.conversationHistory,
        { role: 'user', content: userMessage }
    ];

    while (iterations < maxIterations) {
        iterations++;

        // Call LLM with tools
        const response = await this.provider.generateContent({
            messages,
            tools: this.getToolDefinitions(),
            generationConfig: this.generationConfig
        });

        // Check for tool calls
        const toolCalls = response.candidates[0]?.content?.parts
            ?.filter(p => p.functionCall);

        if (!toolCalls || toolCalls.length === 0) {
            // No tool calls = final response
            return {
                content: response.candidates[0]?.content?.parts[0]?.text,
                iterations,
                toolsUsed: this.toolsUsedThisRun
            };
        }

        // Execute each tool
        for (const call of toolCalls) {
            const { name, args } = call.functionCall;
            
            // Check if approval needed
            if (this.requiresApproval(name)) {
                const approved = await this.requestApproval(name, args);
                if (!approved) {
                    return { content: 'Action cancelled by user', blocked: true };
                }
            }

            // Execute tool
            const result = await this.executeTool(name, args);
            
            // Add result to messages for next iteration
            messages.push({
                role: 'function',
                name,
                content: JSON.stringify(result)
            });
        }
    }

    return { content: 'Max iterations reached', error: true };
}
```

### Code: Memory Search

```typescript
// src/memory/MemoryManager.ts

async search(query: string, limit = 10): Promise<MemoryEntry[]> {
    await this.initialize();
    
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    // Score each memory
    const scored = this.entries.map(entry => {
        let score = 0;
        const content = entry.content.toLowerCase();
        const tags = entry.tags.map(t => t.toLowerCase());

        // Exact phrase match (highest score)
        if (content.includes(lowerQuery)) {
            score += 100;
        }

        // Individual word matches
        for (const word of words) {
            if (content.includes(word)) score += 10;
            if (tags.some(t => t.includes(word))) score += 15;
        }

        // Boost by importance
        score *= (1 + entry.importance / 10);

        // Recency boost
        const age = Date.now() - entry.createdAt.getTime();
        const daysSinceCreation = age / (1000 * 60 * 60 * 24);
        score *= Math.max(0.5, 1 - daysSinceCreation / 365);

        return { entry, score };
    });

    // Sort and return top results
    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.entry);
}
```

---

## API & Provider Setup

### LLM Provider Configuration

JARVIS supports multiple AI providers with automatic failover:

**Priority Chain:**
```
1. Gemini (default) → 2. Claude → 3. GPT-4 → 4. Ollama (local)
```

**Gemini (Recommended)**

| Aspect | Details |
|--------|---------|
| Model | `gemini-2.0-flash` |
| Cost | ~$0.10 per 1M tokens |
| Speed | Very fast |
| Context | 1M tokens |
| Best For | Most use cases |

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

**Claude (Anthropic)**

| Aspect | Details |
|--------|---------|
| Model | `claude-3-sonnet-20240229` |
| Cost | ~$3 per 1M tokens |
| Speed | Fast |
| Context | 200K tokens |
| Best For | Complex reasoning |

```env
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

**OpenAI GPT-4**

| Aspect | Details |
|--------|---------|
| Model | `gpt-4-turbo-preview` |
| Cost | ~$10 per 1M tokens |
| Speed | Medium |
| Context | 128K tokens |
| Best For | Established compatibility |

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

**Ollama (Local, Free)**

| Aspect | Details |
|--------|---------|
| Model | `mixtral`, `llama3`, etc. |
| Cost | FREE (runs on your hardware) |
| Speed | Depends on GPU |
| Context | Varies by model |
| Best For | Privacy, offline use |

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull mixtral

# Configure JARVIS
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mixtral
```

### Why These APIs Are Needed

| API/Service | Why Needed | Cost When in Use |
|-------------|------------|------------------|
| LLM Provider | The "brain" that understands and responds | ~$0.10-$10/1M tokens |
| Telegram Bot | Receive/send messages via Telegram | FREE |
| Discord Bot | Receive/send messages via Discord | FREE |
| WhatsApp Business | Enterprise messaging (optional) | Pay-per-message |

### Cost Estimation

**Productivity Mode (Light Use):**
- ~500 messages/day
- ~$0.50-$2/month with Gemini

**Balanced Mode (Heavy Use):**
- ~2000 messages/day
- Complex multi-agent tasks
- ~$5-$20/month with Gemini

---

## Capabilities & Limitations

### What JARVIS Can Do

| Capability | Description | Mode Required |
|------------|-------------|---------------|
| ✅ Remember everything | Stores facts, preferences, context indefinitely | Both |
| ✅ Proactive scheduling | Wakes up on schedule for briefings, monitoring | Both |
| ✅ Multi-platform presence | Telegram, WhatsApp, Discord, CLI | Both |
| ✅ Web browsing | Navigate sites, fill forms, extract data | Both |
| ✅ File management | Read, write, search files | Both |
| ✅ Run commands | Execute shell commands | Balanced |
| ✅ Write code | Generate, test, deploy code | Balanced |
| ✅ Manage Git | Commits, PRs, branch management | Balanced |
| ✅ Learn from feedback | Improves based on corrections | Both |
| ✅ Sub-agent delegation | Routes to specialists | Balanced |

### What JARVIS Cannot Do

| Limitation | Reason | Workaround |
|------------|--------|------------|
| ❌ Make phone calls | No telephony integration | Use Twilio API as custom skill |
| ❌ Physical actions | It's software, not a robot | Connect to smart home APIs |
| ❌ Access paid services | No built-in subscriptions | Provide your own API keys |
| ❌ 100% accuracy | AI models have limitations | Always verify critical actions |
| ❌ Real-time video | Processing limitations | Screenshot-based approach |
| ❌ Native mobile app | Web/CLI focused | Telegram/Discord work on mobile |

### Honest Assessment

**Strengths:**
- Privacy-first (your data stays on your machine)
- Highly customizable (modify any behavior)
- Cost-effective (use your own API keys)
- Persistent memory (never forgets)
- Multi-platform (meet users where they are)

**Weaknesses:**
- Requires technical setup (not click-and-go)
- Depends on external LLM APIs for intelligence
- No GUI for configuration (config files)
- Occasional hallucinations (AI limitation)
- Self-hosting responsibility (updates, security)

---

## Security & Privacy

### Data Sovereignty

```
YOUR DATA NEVER LEAVES YOUR MACHINE
(except for LLM API calls, which are stateless)

~/.jarvis/
├── memory/         # Your memories (local JSON)
├── sessions/       # Conversation history (local)
├── credentials/    # Your API keys (local, encrypted)
└── logs/           # Activity logs (local)
```

### API Call Privacy

**What gets sent to LLM:**
- Current message
- Recent conversation context
- Relevant memories (for context)
- Tool definitions

**What is NOT sent:**
- Your API keys (except to authenticate)
- Raw file contents (unless requested)
- System information
- Other users' data

### Security Best Practices

**1. Use Tailscale for Remote Access**

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect your device
tailscale up

# Access JARVIS from anywhere via private tunnel
# No ports exposed to the internet!
```

**2. Sandboxed Execution (Docker)**

```bash
# Run JARVIS in Docker for isolation
docker run -d \
  --name jarvis \
  -v ~/.jarvis:/app/data \
  -p 18789:18789 \
  jarvis:latest
```

**3. Tool Approval Policies**

```env
# Conservative: Ask before any file/command changes
TOOL_APPROVAL_MODE=strict

# Balanced: Ask for dangerous operations only
TOOL_APPROVAL_MODE=balanced

# YOLO: Approve everything (dangerous!)
TOOL_APPROVAL_MODE=auto
```

---

## Future Enhancements

### Planned Features

| Feature | Description | Priority |
|---------|-------------|----------|
| 🎙️ Voice Mode | ElevenLabs integration for spoken conversations | High |
| 📱 Native Mobile App | iOS/Android companion app | Medium |
| 🔌 Plugin Marketplace | Community-created skills | Medium |
| 🧠 Local LLM Support | Run entirely offline with Ollama | High |
| 📧 Gmail Native | Direct Gmail integration (not IMAP) | Medium |
| 📅 Calendar Sync | Native Google/Outlook calendar | High |
| 🏠 Smart Home | HomeAssistant integration | Low |
| 📊 Analytics Dashboard | Usage and performance metrics | Low |

### Voice Mode (Coming Soon)

```typescript
// Future integration
const voiceConfig = {
  provider: 'elevenlabs',
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: 'jarvis-voice-001', // Custom trained voice
  inputMode: 'whisper',        // Speech-to-text
  outputMode: 'streaming'      // Real-time speech
};
```

### Self-Skill Creation (Experimental)

JARVIS can write new skills for itself:

```
User: "I need a skill that monitors my Shopify store sales"

JARVIS:
1. Researches Shopify API documentation
2. Writes ShopifySkill.ts
3. Tests in sandbox
4. Integrates into skill registry
5. Now available as a tool!
```

---

## Why JARVIS is Different

### Comparison Table

| Feature | ChatGPT | Claude | JARVIS |
|---------|---------|--------|--------|
| Memory Persistence | ❌ Session only | ❌ Session only | ✅ Forever |
| Local Data | ❌ Their cloud | ❌ Their cloud | ✅ Your machine |
| Proactive Actions | ❌ Wait for you | ❌ Wait for you | ✅ Scheduled tasks |
| Multi-Platform | ❌ Web/app only | ❌ Web/app only | ✅ Any messaging app |
| Terminal Access | ❌ None | ❌ None | ✅ Full access |
| Browser Automation | ❌ None | ❌ None | ✅ Full Playwright |
| Self-Improving | ❌ Same every time | ❌ Same every time | ✅ Learns from you |
| Model Flexibility | ❌ GPT only | ❌ Claude only | ✅ Any provider |
| Cost | $20/mo minimum | $20/mo minimum | ~$2-5/mo (API usage) |
| Customization | ❌ Limited | ❌ Limited | ✅ Full control |

### The Honest Take

**JARVIS is better if you:**
- Value privacy and data ownership
- Want an assistant that truly knows you over time
- Need proactive automations, not just reactive chat
- Are comfortable with some technical setup
- Want to save money on AI subscriptions

**JARVIS might not be for you if you:**
- Want zero setup (just click and chat)
- Don't care about data privacy
- Only need occasional AI help
- Prefer a polished consumer app
- Don't want to manage your own infrastructure

### The Vision

JARVIS represents a shift from "AI as a service" to "AI as a partner." It's not about replacing human judgment—it's about extending your capabilities so you can focus on what matters most.

```
The future isn't AI that works FOR you.
It's AI that works WITH you.

That's JARVIS.
```

---

## Quick Reference Card

### Essential Commands

```bash
# Start JARVIS
npm start

# Development mode
npm run dev

# Build TypeScript
npm run build

# Type checking
npm run typecheck

# Run tests
npm test
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (API keys, settings) |
| `src/soul/SOUL.md` | JARVIS's personality and rules |
| `data/memory/memories.json` | Stored memories |
| `data/feedback/learned_behaviors.json` | What JARVIS has learned |

### Useful JSON-RPC Methods

```json
// Send a message
{ "method": "chat", "params": { "message": "Hello" } }

// List heartbeat tasks
{ "method": "heartbeat.list" }

// Trigger a task manually
{ "method": "heartbeat.trigger", "params": { "taskId": "morning-briefing" } }

// Get system status
{ "method": "system.status" }
```

---

## Getting Help

- **Documentation:** This file + inline code comments
- **Issues:** Open a GitHub issue
- **Community:** Discord server (coming soon)

---

*Built with ❤️ for humans who want their time back.*

**JARVIS v1.0.0** | MIT License
