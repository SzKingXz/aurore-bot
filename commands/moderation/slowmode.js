const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Configura slowmode del canal')
    .addIntegerOption(opt => opt
      .setName('segundos')
      .setDescription('Segundos entre mensajes (0 para desactivar)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21600)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageChannels')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    
    const segundos = interaction.options.getInteger('segundos');
    await interaction.channel.setRateLimitPerUser(segundos);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ SLOWMODE')
      .setDescription(`Slowmode configurado a ${segundos === 0 ? 'desactivado' : `${segundos} segundos`}`)
      .setFooter({ text: 'AURORE SYSTEM' });
    
    interaction.reply({ embeds: [embed] });
  }
};
