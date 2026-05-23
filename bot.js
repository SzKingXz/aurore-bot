const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands, registerCommands } = require('./utils/commandLoader');
const { loadEvents } = require('./utils/eventLoader');
require('dotenv').config();

global.auroreBroadcast = () => {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

async function init() {
  try {
    client.commands = loadCommands();
    loadEvents(client);

    const { broadcast } = require('./api')(client);

    global.auroreBroadcast = broadcast;
    client.broadcast       = broadcast;

    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error('[BOOT]', err.message);
    process.exit(1);
  }
}

init();
