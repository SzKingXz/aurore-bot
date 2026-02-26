const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal')
    .addIntegerOption(opt => opt
      .setName('cantidad')
      .setDescription('Cantidad de mensajes (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const cantidad = interaction.options.getInteger('cantidad');
    await interaction.channel.bulkDelete(cantidad, true);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ MENSAJES ELIMINADOS')
      .setDescription(`Se eliminaron **${cantidad}** mensajes`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
