# JARVIS-OS Gateway API Reference

JARVIS exposes a **WebSocket-based JSON-RPC 2.0** API for external clients (dashboards, mobile apps, etc.).

---

## Connection

```
ws://localhost:3000/ws
```

### Authentication

Include an auth token in the connection URL or as the first message:

```json
{ "jsonrpc": "2.0", "method": "auth", "params": { "token": "your_token" }, "id": 1 }
```

---

## Methods

### `chat.send`

Send a message to JARVIS.

```json
{
  "jsonrpc": "2.0",
  "method": "chat.send",
  "params": {
    "message": "What's on my calendar today?",
    "sessionId": "optional-session-id"
  },
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": "You have 3 events today...",
    "sessionId": "abc123",
    "usage": { "inputTokens": 150, "outputTokens": 200, "totalTokens": 350 }
  },
  "id": 2
}
```

### `chat.stream`

Send a message and receive streaming chunks.

```json
{ "jsonrpc": "2.0", "method": "chat.stream", "params": { "message": "Write a poem" }, "id": 3 }
```

**Streaming chunks:**
```json
{ "jsonrpc": "2.0", "method": "chat.chunk", "params": { "content": "Roses are ", "done": false } }
{ "jsonrpc": "2.0", "method": "chat.chunk", "params": { "content": "red...", "done": true } }
```

### `memory.search`

Search JARVIS memories.

```json
{ "jsonrpc": "2.0", "method": "memory.search", "params": { "query": "TypeScript preferences" }, "id": 4 }
```

### `memory.add`

Add a memory entry.

```json
{
  "jsonrpc": "2.0",
  "method": "memory.add",
  "params": { "type": "preference", "content": "I prefer dark mode", "tags": ["ui"] },
  "id": 5
}
```

### `session.list`

List active sessions.

```json
{ "jsonrpc": "2.0", "method": "session.list", "params": {}, "id": 6 }
```

### `health.check`

Health check endpoint (also available via HTTP GET at `/health`).

```json
{ "jsonrpc": "2.0", "method": "health.check", "params": {}, "id": 7 }
```

**Response:**
```json
{ "jsonrpc": "2.0", "result": { "status": "ok", "uptime": 3600, "version": "1.0.0" }, "id": 7 }
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error (invalid JSON) |
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |
| `-32001` | Authentication required |
| `-32002` | Rate limit exceeded |
| `-32003` | Tool approval required |

---

## Rate Limiting

Configurable via `LLM_RATE_LIMIT_PER_MINUTE` (default: 60). When exceeded, returns error code `-32002` with a `retryAfter` field.
