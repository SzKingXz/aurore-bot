const { Events } = require('discord.js');
const { trackCommand } = require('../db');
const { getCommand } = require('../utils/commandLoader');
const { handleSelectMenu } = require('./handlers/selectMenu');
const { handleButton } = require('./handlers/buttons');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu()) {
      return handleSelectMenu(interaction, client);
    }
    if (interaction.isButton()) {
      return handleButton(interaction, client);
    }
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild } = interaction;
    if (guild) trackCommand(guild.id, commandName);
    const commands = interaction.client.commands;
    const command = getCommand(commandName, commands);
    if (!command) {
      return interaction.reply({ content: '❌ Comando no encontrado.', ephemeral: true });
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error ejecutando comando ${commandName}:`, error);
      return interaction.reply({ content: '❌ Hubo un error ejecutando el comando.', ephemeral: true }).catch(() => {});
    }
  }
};
