const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lanza una moneda'),
  async execute(interaction) {
    const resultado = Math.random() > 0.5 ? 'CARA' : 'CRUZ';
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ MONEDA')
      .setDescription(`**${resultado}** 🪙`)
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
