const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, EIGHTBALL } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Haz una pregunta a la bola 8')
    .addStringOption(opt => opt
      .setName('pregunta')
      .setDescription('Tu pregunta')
      .setRequired(true)),
  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const respuesta = EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)];
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ BOLA 8 MÁGICA')
      .addFields(
        { name: 'Pregunta', value: pregunta },
        { name: 'Respuesta', value: respuesta }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
