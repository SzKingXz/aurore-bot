const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');
const { loadCommands, registerCommands } = require('./utils/commandLoader');
const { loadEvents } = require('./utils/eventLoader');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3001;

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

    await client.login(TOKEN);

    client.once('ready', async () => {
      await registerCommands(client);
      startAPIServer();
    });
  } catch (error) {
    console.error('Error inicializando bot:', error);
    process.exit(1);
  }
}

function startAPIServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/stats', (req, res) => {
    const { getGlobalStats } = require('./db');
    const gs = getGlobalStats();
    const upSec = Math.floor(process.uptime());

    res.json({
      guilds: client.guilds.cache.size,
      users: gs.totalUsers,
      messages: gs.totalMessages,
      xp: gs.totalXP,
      topLevel: gs.topLevel,
      uptime: upSec,
      ping: client.ws.ping,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  });

  app.listen(PORT, () => {
    console.log(`🌐 API en puerto ${PORT}`);
  });
}

initializeBot();
