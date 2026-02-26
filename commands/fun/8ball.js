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
    try {
      const pregunta = interaction.options.getString('pregunta');
      const respuesta = EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)];
      
      const embed = new EmbedBuilder()
        .setColor(PALETTE.cyan)
        .setTitle('BOLA 8 MAGICA')
        .setDescription(`**Pregunta:** ${pregunta}\n\n**Respuesta:** ${respuesta}`)
        .setFooter({ text: 'AURORE SYSTEM' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en 8ball:', error);
      await interaction.reply({ content: 'Error al procesar el comando', ephemeral: true });
    }
  }
};
