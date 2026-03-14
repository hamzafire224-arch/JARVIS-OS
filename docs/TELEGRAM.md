# JARVIS-OS Telegram Bot Setup

Connect JARVIS to Telegram so you can chat with your AI assistant from your phone.

---

## Step 1: Create a Bot

1. Open Telegram and message [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Choose a name (e.g., "My JARVIS")
4. Choose a username (e.g., `my_jarvis_bot`)
5. Copy the **bot token** (looks like `123456789:ABCDefGhIjKlmNoPQRSTuvwxyz`)

## Step 2: Configure

Add to your `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIjKlmNoPQRSTuvwxyz
```

### Optional: Restrict Access

To limit who can use your bot, set authorized user IDs:

```env
TELEGRAM_AUTHORIZED_USERS=123456789,987654321
```

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

## Step 3: Start

```bash
npm run build && npm start
```

JARVIS will automatically connect to Telegram on startup.

---

## Features

| Feature | Status |
|---------|--------|
| Text messages | ✅ |
| Typing indicators | ✅ |
| Rate limiting | ✅ (30 msg/min default) |
| Authorization | ✅ (whitelist user IDs) |
| Long message splitting | ✅ (auto-splits > 4096 chars) |
| Webhook mode | ✅ (for production/servers) |
| Polling mode | ✅ (for development/local) |

---

## Polling vs Webhook

### Polling (Default)

Best for development and local machines:
```env
TELEGRAM_MODE=polling
```

### Webhook (Production)

Best for servers with a public URL:
```env
TELEGRAM_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://your-server.com/telegram/webhook
```

---

## Troubleshooting

**Bot not responding?**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check logs: `tail -f ./logs/jarvis.log | grep telegram`
- Ensure your user ID is in `TELEGRAM_AUTHORIZED_USERS` (if set)

**"Unauthorized" errors?**
- Add your Telegram user ID to `TELEGRAM_AUTHORIZED_USERS`

**Duplicate messages?**
- Don't run multiple JARVIS instances with the same bot token
