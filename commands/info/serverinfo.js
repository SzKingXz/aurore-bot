const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Ver información del servidor'),
  async execute(interaction) {
    const guild = interaction.guild;
    const created = Math.floor(guild.createdTimestamp / 1000);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`✦ SERVIDOR - ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Nombre', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Dueño', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Miembros', value: formatNumber(guild.memberCount), inline: true },
        { name: 'Canales', value: formatNumber(guild.channels.cache.size), inline: true },
        { name: 'Roles', value: formatNumber(guild.roles.cache.size), inline: true },
        { name: 'Creado', value: `<t:${created}:R>`, inline: true },
        { name: 'Nivel de Verificación', value: guild.verificationLevel.toString(), inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
