const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getUserData, getLeaderboard } = require('../../db');
const { getXPBar, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Ver tu rango en el servidor')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a consultar')),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const data = getUserData(user.id, interaction.guildId);
    if (!data) return interaction.reply({ content: `${user} no tiene estadísticas.`, ephemeral: true });
    
    const lb = getLeaderboard(interaction.guildId, 100);
    const pos = lb.findIndex(u => u.user_id === user.id) + 1;
    const xpNeeded = 100 * data.level;
    const { bar, progress } = getXPBar(data.xp, xpNeeded);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`✦ PERFIL - ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nivel', value: `${data.level}`, inline: true },
        { name: 'Posición', value: `#${pos}/${lb.length}`, inline: true },
        { name: 'XP', value: `${formatNumber(data.xp)}/${formatNumber(xpNeeded)}`, inline: true },
        { name: 'Progreso', value: `${bar} ${progress}%`, inline: false },
        { name: 'Mensajes', value: formatNumber(data.messages), inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
