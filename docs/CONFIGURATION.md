# JARVIS-OS Configuration Reference

All settings are configured via environment variables in `.env`. Copy `.env.example` to get started.

---

## Variant Selection

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `JARVIS_VARIANT` | `balanced`, `productivity` | `balanced` | Operating mode |

- **balanced**: Single agent, conservative tool approval, lower resource usage
- **productivity**: Multi-agent routing (Coder/Researcher/Personal), full tool access

---

## LLM Provider API Keys

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | One of these | Claude API key |
| `OPENAI_API_KEY` | is required | OpenAI API key |
| `GOOGLE_AI_API_KEY` | | Google Gemini API key |

At least one provider key must be set. JARVIS tries providers in priority order.

---

## Provider Priority

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER_PRIORITY` | `anthropic,openai,ollama` | Comma-separated fallback order |

Options: `anthropic`, `openai`, `gemini`, `ollama`

Example: `gemini,ollama` — tries Gemini first, falls back to local Ollama.

---

## Local Model (Ollama)

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3:8b` | Model to use |

Recommended models by RAM:
- **8 GB**: `llama3:8b`, `mistral:7b`
- **16 GB**: `llama3:8b` (faster), `codellama:13b`
- **48 GB+**: `llama3:70b`

---

## Web Search

| Variable | Default | Description |
|----------|---------|-------------|
| `BRAVE_SEARCH_API_KEY` | *(empty)* | Brave Search API key |

Free tier: 2,000 queries/month. Get key at [brave.com/search/api](https://brave.com/search/api/).
Without this key, web search returns a helpful message instead of results.

---

## Agent Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONTEXT_TOKENS` | `100000` | Maximum tokens for context window |
| `MAX_RESPONSE_TOKENS` | `4096` | Maximum tokens for agent response |
| `LLM_TEMPERATURE` | `0.7` | Creativity (0.0 = deterministic, 1.0 = creative) |

---

## Tool Approval

| Variable | Default | Description |
|----------|---------|-------------|
| `TOOL_APPROVAL_MODE` | `balanced` | How tool execution is gated |

Modes:
- **conservative**: All dangerous tools require user approval
- **balanced**: Only file deletion and system commands require approval
- **trust**: No approval required *(not recommended for production)*

---

## Memory & Persistence

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_FILE_PATH` | `./memory/memory.md` | Path to persistent memory file |
| `SESSION_COMPACTION_THRESHOLD` | `50` | Messages before session compaction |

Memory features:
- **Atomic writes**: Crash-safe (write to `.tmp` → rename)
- **Auto-backup**: `.bak` file updated before each save
- **Export/Import**: Programmatic methods for data portability

---

## Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` |
| `LOG_OUTPUT` | `both` | `console`, `file`, `both` |
| `LOG_FILE_PATH` | `./logs/jarvis.log` | Log file location |

Logs auto-rotate at 10 MB with 5 file retention.
