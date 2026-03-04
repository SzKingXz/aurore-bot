const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands, registerCommands } = require('./utils/commandLoader');
const { loadEvents } = require('./utils/eventLoader');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

async function initializeBot() {
  try {
    const commands = loadCommands();
    client.commands = commands;
    loadEvents(client);
    await client.login(process.env.TOKEN);
    client.once('ready', async () => {
      await registerCommands(client);
      require('./api')(client);
    });
  } catch (error) {
    console.error('Error inicializando bot:', error);
    process.exit(1);
  }
}

initializeBot();
