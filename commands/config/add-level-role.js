const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { addLevelRole } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-level-role')
    .setDescription('Asigna un rol a un nivel')
    .addIntegerOption(opt => opt
      .setName('nivel')
      .setDescription('Nivel')
      .setRequired(true)
      .setMinValue(1))
    .addRoleOption(opt => opt
      .setName('rol')
      .setDescription('Rol a asignar')
      .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const nivel = interaction.options.getInteger('nivel');
    const rol = interaction.options.getRole('rol');
    
    addLevelRole(interaction.guildId, nivel, rol.id);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ ROL ASIGNADO')
      .setDescription(`Nivel ${nivel} → ${rol}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
