require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const channel_manager_bot = new Client({ intents: [GatewayIntentBits.Guilds] });

channel_manager_bot.once('clientReady', () => console.log(`Logged in as ${channel_manager_bot.user.tag}`));
channel_manager_bot.login(process.env.DISCORD_CHANNEL_MODERATOR_BOT_TOKEN);

async function createTextChannel(channelName) {
  const guild = await channel_manager_bot.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const formattedName = channelName.toLowerCase().replace(/\s+/g, '_');

  const existing = guild.channels.cache.find((c) => c.name === formattedName);
  if (existing) return existing;

  // Find or create category
  const categoryName = 'boutique_manager_error_channels';
  let category = guild.channels.cache.find((c) => c.name === categoryName && c.type === 4);
  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: 4,
      reason: 'Auto-created category for boutiques',
    });
  }

  // Create text channel under that category
  const newChannel = await guild.channels.create({
    name: formattedName,
    type: 0,
    parent: category.id,
    reason: `Auto-created for boutique ${channelName}`,
  });

  console.log(`Created new channel: ${newChannel.name} under ${category.name}`);
  return newChannel;
}

module.exports = {
  channel_manager_bot,
  createTextChannel,
};
