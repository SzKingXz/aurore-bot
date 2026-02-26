const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Lanza un dado')
    .addIntegerOption(opt => opt
      .setName('caras')
      .setDescription('Número de caras (2-100)')
      .setMinValue(2)
      .setMaxValue(100)),
  async execute(interaction) {
    const caras = interaction.options.getInteger('caras') || 6;
    const resultado = Math.floor(Math.random() * caras) + 1;
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ DADO')
      .setDescription(`**${resultado}**/${caras} 🎲`)
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
