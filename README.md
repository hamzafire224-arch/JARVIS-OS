# JARVIS — Your Sovereign AI Operative

> **Just A Rather Very Intelligent System**  
> A local-first Personal OS that lives on your hardware and acts as your 24/7 digital partner.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-green.svg" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/TypeScript-5.5+-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License">
</p>

---

## What Makes JARVIS Different?

| Feature | ChatGPT/Claude | JARVIS |
|---------|----------------|--------|
| Memory | Forgets each session | Remembers forever |
| Data Location | Their cloud | Your machine |
| Proactive Actions | Waits for you | Wakes up on schedule |
| Platform Presence | Web/app only | Telegram, WhatsApp, Discord |
| Terminal Access | None | Full access |
| Browser Automation | None | Full Playwright |
| Cost | $20/month | ~$2-5/month (API only) |

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- **Node.js 22+** ([download](https://nodejs.org/))
- **At least one API key**: Gemini (free), Anthropic, or OpenAI

### Step 1: Install

```bash
git clone https://github.com/hamzafire224-arch/JARVIS-OS.git
cd JARVIS-OS
npm install
```

### Step 2: Configure

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```env
# Recommended: Gemini (great performance, low cost)
GEMINI_API_KEY=your_key_here

# Choose your mode
JARVIS_VARIANT=productivity   # or 'balanced'
```

**Get a free Gemini API key:** https://aistudio.google.com/apikey

### Step 3: Launch

```bash
npm run build
npm start
```

### Step 4: Connect Telegram (Optional)

1. Message @BotFather on Telegram → `/newbot`
2. Copy the token to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
3. Restart JARVIS and message your bot!

---

## 🎯 Configuration Modes

### Balanced Mode
*For everyday automation on a $5/month VPS or old laptop*

- ✅ Morning briefings & email triage
- ✅ Calendar management & reminders
- ✅ Web research & price monitoring
- ⚠️ Limited terminal access (safe operations only)

```env
JARVIS_VARIANT=balanced
```

### Productivity Mode
*For developers who want an AI teammate*

- ✅ Everything in Balanced, plus:
- ✅ Multi-agent delegation (Coder, Researcher, Calendar agents)
- ✅ Full terminal and filesystem access
- ✅ Git operations and CI/CD monitoring
- ✅ Code generation and execution

```env
JARVIS_VARIANT=productivity
```

---

## 🧩 Complete Feature List

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Persistent Memory** | Remembers preferences, facts, projects across sessions |
| **Heartbeat Scheduler** | Proactive tasks (morning briefing, email checks) |
| **Multi-Platform** | Telegram, WhatsApp, Discord adapters |
| **Browser Automation** | Playwright-powered web interaction |
| **Terminal Access** | Shell command execution |
| **Filesystem Skills** | Read, write, search files |
| **Self-Improvement** | Learns from your feedback |

### LLM Providers

| Provider | Model | Best For |
|----------|-------|----------|
| **Gemini** (recommended) | gemini-2.0-flash | Cost-effective, fast |
| **Claude** | claude-3-sonnet | Complex reasoning |
| **GPT-4** | gpt-4-turbo | Established compatibility |
| **Ollama** | Local models | Privacy, offline use |

---

## 📖 Full Documentation

For complete setup instructions, architecture deep-dive, and feature reference:

**📚 [JARVIS Complete Guide](./JARVIS_COMPLETE_GUIDE.md)**

Includes:
- Detailed installation for all platforms
- Backend architecture explanation
- All JSON-RPC endpoints
- Security & privacy best practices
- Future roadmap

---

## 🛠️ Development

```bash
# Development mode (auto-reload)
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Production build
npm run build
```

---

## 📁 Project Structure

```
JARVIS/
├── src/
│   ├── agent/           # Agent core (MainAgent, sub-agents, registry)
│   ├── adapters/        # Platform adapters (Telegram, Discord, WhatsApp)
│   ├── gateway/         # WebSocket server & JSON-RPC handlers
│   ├── providers/       # LLM integrations (Gemini, Claude, GPT, Ollama)
│   ├── memory/          # Persistent memory system
│   ├── skills/          # Tool implementations (Browser, Terminal, Files)
│   ├── soul/            # Identity, personality, feedback learning
│   ├── context/         # Session management
│   ├── config/          # Configuration
│   └── index.ts         # Entry point
├── data/                # Runtime data (memory, sessions, logs)
├── memory/              # Persistent memory storage
└── JARVIS_COMPLETE_GUIDE.md  # Full documentation
```

---

## 🔐 Security

- **Local-First**: All data stays on your machine
- **Your API Keys**: You control what providers are used
- **Tool Approval**: Configure what actions require confirmation
- **Sandboxed Execution**: Docker support for safe code execution

---

## 📜 License

MIT License - Use it, modify it, make it yours.

---

<p align="center">
  <strong>JARVIS v1.0.0</strong><br>
  <em>"I am here to help you reclaim your most valuable resource: time."</em>
</p>