const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra la latencia del bot'),
  async execute(interaction) {
    const msg = await interaction.deferReply({ fetchReply: true });
    const ping = msg.createdTimestamp - interaction.createdTimestamp;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ PING')
      .addFields(
        { name: 'Bot', value: `${ping}ms`, inline: true },
        { name: 'WebSocket', value: `${interaction.client.ws.ping}ms`, inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.editReply({ embeds: [embed] });
  }
};
