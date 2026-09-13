# JARVIS-OS Setup Guide

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Node.js** | v22+ | v24 LTS |
| **RAM** | 4 GB | 8 GB (16 GB with local models) |
| **Disk** | 200 MB | 1 GB (with Ollama models) |
| **OS** | Windows 10, macOS 12, Ubuntu 20.04 | Latest stable |

## Installation

```bash
git clone https://github.com/hamzafire224-arch/JARVIS-OS.git
cd JARVIS-OS
npm install
```

## API Key Setup

You need **at least one** LLM provider key. Copy the example config:

```bash
cp .env.example .env
```

### Option A: Google Gemini (Recommended — Free Tier)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Add to `.env`:
   ```env
   GOOGLE_AI_API_KEY=your_key_here
   LLM_PROVIDER_PRIORITY=gemini,ollama
   ```

### Option B: Anthropic Claude

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key under Settings → API Keys
3. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   LLM_PROVIDER_PRIORITY=anthropic,ollama
   ```

### Option C: OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Add to `.env`:
   ```env
   OPENAI_API_KEY=your_key_here
   LLM_PROVIDER_PRIORITY=openai,ollama
   ```

### Option D: Ollama (Fully Local — No API Key Needed)

1. Install Ollama: [ollama.com/download](https://ollama.com/download)
2. Pull a model: `ollama pull llama3:8b`
3. Add to `.env`:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3:8b
   LLM_PROVIDER_PRIORITY=ollama
   ```

## Web Search (Optional)

For web search capabilities, get a free Brave Search API key:

1. Go to [brave.com/search/api](https://brave.com/search/api/)
2. Sign up for the free tier (2,000 queries/month)
3. Add to `.env`:
   ```env
   BRAVE_SEARCH_API_KEY=your_key_here
   ```

## Running JARVIS

```bash
# Build TypeScript
npm run build

# Start JARVIS
npm start

# Or run in development mode (auto-reload)
npm run dev
```

## Variant Selection

JARVIS has two operating modes:

| | Balanced | Productivity |
|---|---|---|
| **Use case** | Personal assistant | Developer AI teammate |
| **Agents** | Single agent | Multi-agent (Coder, Researcher, Personal) |
| **Terminal** | Safe operations only | Full access |
| **Cost** | Lower (~$2/mo) | Higher (~$5/mo) |

Set in `.env`:
```env
JARVIS_VARIANT=balanced      # or productivity
```

## Telegram Bot (Optional)

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the token to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
4. Restart JARVIS

## Troubleshooting

**"No LLM provider available"** — Set at least one API key in `.env`

**"Module not found"** — Run `npm install` again

**"Permission denied" on terminal commands** — Set `TOOL_APPROVAL_MODE=balanced` in `.env`

**Ollama not connecting** — Ensure Ollama is running: `ollama serve`
