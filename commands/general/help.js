const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, HELP_DATA } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la ayuda de todos los comandos'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('✦ AYUDA - AURORE')
      .setDescription('Usa `/help` para ver todas las categorías')
      .addFields(
        { name: '⚡ General', value: '`/ping` `/help` `/stats`', inline: true },
        { name: '📊 Perfil', value: '`/rank` `/leaderboard`', inline: true },
        { name: '🔍 Info', value: '`/userinfo` `/serverinfo` `/avatar`', inline: true },
        { name: '🗳️ Utilidades', value: '`/poll` `/remindme`', inline: true },
        { name: '🎲 Diversión', value: '`/coinflip` `/dice` `/8ball`', inline: true },
        { name: '🎁 Sorteos', value: '`/giveaway`', inline: true },
        { name: '💡 Sugerencias', value: '`/suggest` `/set-suggest-channel`', inline: true },
        { name: '🎨 Autoroles', value: '`/automsg` `/crear-roles`', inline: true },
        { name: '🛡️ Moderación', value: '`/warn` `/kick` `/ban` `/timeout` `/clear` `/slowmode` `/lock` `/unlock` `/announce` `/infractions`', inline: true },
        { name: '⚙️ Config', value: '`/setup` `/set-level-channel` `/set-log-channel` `/set-welcome-channel` `/add-level-role` `/level-roles`', inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
