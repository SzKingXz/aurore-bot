const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Ver información de un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario')),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const created = Math.floor(user.createdTimestamp / 1000);
    const joined = member ? Math.floor(member.joinedTimestamp / 1000) : 'N/A';
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`✦ INFORMACIÓN - ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Usuario', value: `<@${user.id}>`, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Sí' : 'No', inline: true },
        { name: 'Cuenta creada', value: `<t:${created}:R>`, inline: true },
        { name: 'Se unió', value: joined === 'N/A' ? 'N/A' : `<t:${joined}:R>`, inline: true },
        { name: 'Roles', value: member ? `${member.roles.cache.size - 1}` : 'N/A', inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
