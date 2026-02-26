const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getLevelRoles } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level-roles')
    .setDescription('Ver los roles configurados por nivel'),
  async execute(interaction) {
    const roles = getLevelRoles(interaction.guildId);
    
    if (!roles || roles.length === 0) {
      return interaction.reply({ content: 'No hay roles configurados por nivel.', ephemeral: true });
    }
    
    const desc = roles
      .sort((a, b) => a.level - b.level)
      .map(r => {
        const rol = interaction.guild.roles.cache.get(r.role_id);
        return `**Nivel ${r.level}** → ${rol || 'Rol eliminado'}`;
      })
      .join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('✦ ROLES POR NIVEL')
      .setDescription(desc)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
