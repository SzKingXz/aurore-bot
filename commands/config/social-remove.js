const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { deleteSocialMonitor } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-remove')
    .setDescription('Elimina un monitor de red social')
    .addIntegerOption(opt => opt.setName('id').setDescription('ID del monitor (ver /social-list)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const id = interaction.options.getInteger('id');
    const ok = deleteSocialMonitor(id, interaction.guildId);

    if (!ok) {
      return interaction.reply({ content: '❌ No se encontró ese monitor en este servidor.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('MONITOR ELIMINADO')
      .setDescription(`El monitor \`#${id}\` fue eliminado.`)
      .setFooter({ text: 'AURORE SYSTEM' });

    interaction.reply({ embeds: [embed] });
  },
};
