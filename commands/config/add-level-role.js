const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { addLevelRole } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-level-role')
    .setDescription('Asigna un rol automático al alcanzar un nivel')
    .addIntegerOption(opt => opt.setName('nivel').setDescription('Nivel requerido').setRequired(true).setMinValue(1).setMaxValue(999))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol a asignar').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const nivel = interaction.options.getInteger('nivel');
    const rol   = interaction.options.getRole('rol');

    if (rol.managed) {
      return interaction.reply({ content: '❌ No puedo gestionar roles de bots o integrados.', ephemeral: true });
    }

    addLevelRole(interaction.guildId, nivel, rol.id);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('ROL DE NIVEL CONFIGURADO')
      .setDescription(`Al alcanzar el **Nivel ${nivel}** se asignará ${rol}.`)
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
