require('dotenv').config();
const { channel_manager_bot } = require('./discordClient');

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '…' : str;
}

async function logErrorToChannel(boutiqueName, error, passedData = null) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const guild = await channel_manager_bot.guilds.fetch(guildId);

  // Find or create category
  const categoryName = 'boutique_manager_error_channels';
  let category = guild.channels.cache.find((c) => c.name === categoryName && c.type === 4);
  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: 4,
      reason: 'Category for boutique error channels',
    });
  }

  // Find or create boutique-specific channel
  const channelName = boutiqueName.toLowerCase().replace(/\s+/g, '_');
  let channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: category.id,
      reason: `Error channel for boutique ${boutiqueName}`,
    });
  }

  // truncate BEFORE wrapping in triple backticks
  const safeMessage = truncate(error.message || 'Unknown error', 1000);
  const safeStack = truncate(error.stack || 'No stack available', 1000);

  let safePassedData = null;
  if (passedData) {
    try {
      const jsonStr = JSON.stringify(passedData, null, 2);
      safePassedData = truncate(jsonStr, 1000);
    } catch {
      safePassedData = '[Unserializable data]';
    }
  }

  const fields = [
    { name: 'Stack Trace', value: `\`\`\`${safeStack}\`\`\`` },
    safePassedData && { name: 'Passed Data', value: `\`\`\`${safePassedData}\`\`\`` },
  ].filter(Boolean);

  await channel.send({
    embeds: [
      {
        title: '🚨 Application Error',
        description: safeMessage,
        color: 15158332,
        timestamp: new Date().toISOString(),
        fields,
      },
    ],
  });
}

module.exports = { logErrorToChannel };
