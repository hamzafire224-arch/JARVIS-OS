# JARVIS-OS Security Model

## Architecture

JARVIS uses a **defense-in-depth** approach with three security layers:

### 1. CapabilityManager

Controls what each agent variant can do:

| Capability | Balanced | Productivity |
|------------|----------|-------------|
| File read | ✅ | ✅ |
| File write | ⚠️ Approval | ✅ |
| File delete | ⚠️ Approval | ⚠️ Approval |
| Terminal commands | ⚠️ Safe only | ✅ |
| Web requests | ✅ | ✅ |
| Browser automation | ❌ | ✅ |
| GitHub operations | ❌ | ⚠️ Approval |
| Database queries | ❌ | ✅ Read-only |

### 2. SkillScanner

Scans tool arguments before execution:

- **Blocked paths**: `/etc/passwd`, `~/.ssh/`, `~/.env`, system directories
- **Dangerous SQL**: `DROP`, `DELETE`, `TRUNCATE` blocked in read-only mode
- **Shell injection**: Detects and blocks `&&`, `||`, `;` in untrusted input
- **File size limits**: Prevents reading files > 10MB

### 3. Tool Approval System

Configurable via `TOOL_APPROVAL_MODE`:

- **conservative**: All dangerous tools require user confirmation
- **balanced**: Only destructive actions (delete, system commands) need approval
- **trust**: No approval needed *(not recommended)*

---

## Data Privacy

- **Local-first**: All data stays on your machine — memory, logs, sessions
- **No telemetry**: Zero data sent to any analytics service
- **Your API keys**: You control which LLM providers are used and when
- **Memory encryption**: Planned for v1.1 (at-rest encryption with user passphrase)

---

## API Key Safety

- API keys are loaded from `.env` file (never hardcoded)
- `.env` is in `.gitignore` — never committed to version control
- Keys are never logged, even in debug mode
- Each provider only receives its own key

---

## Recommendations

1. **Use `balanced` approval mode** for production
2. **Set up blocked paths** for sensitive directories
3. **Use Ollama** for maximum privacy (no data leaves your machine)
4. **Review logs** periodically at `./logs/jarvis.log`
5. **Back up memory** regularly using the export feature
