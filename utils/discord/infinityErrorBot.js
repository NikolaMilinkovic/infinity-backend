require('dotenv').config();
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_INFINITY_ERROR_BOT;

class Discord_log {
  constructor(webhook_url) {
    this.webhook_url = webhook_url;
    this.queue = [];
    this.processing = false;
  }

  truncate(str, max) {
    return str.length > max ? str.slice(0, max - 3) + '…' : str;
  }
  async logError(error, req = null, passedData = null) {
    try {
      const stack = error.stack || error.message || String(error);
      const safeMessage = this.truncate(error.message || 'Unknown error', 2048);
      const safeStack = this.truncate(stack, 1000);

      const extra = req
        ? {
            route: req.originalUrl,
            method: req.method,
            path: req.path,
            user: req.user ? `${req.user._id} (${req.user.username})` : 'Guest/Unauthenticated',
          }
        : {};

      // stringify passedData safely
      let safePassedData = null;
      if (passedData !== null && passedData !== undefined) {
        try {
          safePassedData = this.truncate(
            typeof passedData === 'string' ? passedData : JSON.stringify(passedData, null, 2),
            1000
          );
        } catch {
          safePassedData = '[Unserializable data]';
        }
      }

      const fields = [
        { name: 'Stack Trace', value: `\`\`\`${safeStack}\`\`\`` },
        extra.user && { name: 'User', value: this.truncate(extra.user, 1024) },
        extra.route && { name: 'Route', value: this.truncate(extra.route, 1024), inline: true },
        extra.method && { name: 'Method', value: this.truncate(extra.method, 1024), inline: true },
        safePassedData && { name: 'Passed Data', value: `\`\`\`${safePassedData}\`\`\`` },
      ].filter(Boolean);

      const payload = {
        username: 'ErrorLogger',
        embeds: [
          {
            title: '🚨 Application Error',
            description: safeMessage,
            color: 15158332,
            timestamp: new Date().toISOString(),
            footer: { text: 'Error Logger v1.0' },
            fields,
          },
        ],
      };

      const res = await fetch(this.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('> Discord webhook failed:', res.status, text);
      }
    } catch (err) {
      console.error('> Failed to send error to Discord:', err);
    }
  }
}

const Discord = new Discord_log(DISCORD_WEBHOOK_URL);

module.exports = { Discord };
