require('dotenv').config();
const { Client, GatewayIntentBits, Routes, REST } = require('discord.js');
const { loadCommands } = require('./utils/commandLoader');
const { loadEvents }   = require('./utils/eventLoader');

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

async function registerCommands(commands) {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(c => c.data.toJSON()) }
    );
    console.log(`[CMD] ${commands.length} comandos registrados en Discord`);
  } catch (err) {
    console.error('[CMD] Error registrando:', err.message);
  }
}

async function init() {
  if (!process.env.TOKEN)     { console.error('[BOOT] TOKEN no configurado');     process.exit(1); }
  if (!process.env.CLIENT_ID) { console.error('[BOOT] CLIENT_ID no configurado'); process.exit(1); }

  const commands     = loadCommands();
  client.commands    = commands;

  loadEvents(client);

  const { broadcast } = require('./api')(client);
  global.auroreBroadcast = broadcast;
  client.broadcast       = broadcast;

  await client.login(process.env.TOKEN);
  await registerCommands(commands);
}

process.on('unhandledRejection', err  => console.error('[UnhandledRejection]', err?.message ?? err));
process.on('uncaughtException',  err  => { console.error('[UncaughtException]', err?.message ?? err); process.exit(1); });
process.on('SIGTERM',            ()   => { console.log('[BOOT] SIGTERM — shutdown'); client.destroy(); process.exit(0); });

init().catch(err => { console.error('[BOOT] Fatal:', err.message); process.exit(1); });
