const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crea una encuesta')
    .addStringOption(opt => opt
      .setName('pregunta')
      .setDescription('La pregunta')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('opcion1')
      .setDescription('Primera opción')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('opcion2')
      .setDescription('Segunda opción')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('opcion3')
      .setDescription('Tercera opción'))
    .addStringOption(opt => opt
      .setName('opcion4')
      .setDescription('Cuarta opción')),
  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const ops = [];
    ops.push(interaction.options.getString('opcion1'));
    ops.push(interaction.options.getString('opcion2'));
    if (interaction.options.getString('opcion3')) ops.push(interaction.options.getString('opcion3'));
    if (interaction.options.getString('opcion4')) ops.push(interaction.options.getString('opcion4'));
    
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const desc = ops.map((o, i) => `${emojis[i]} ${o}`).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('✦ ENCUESTA')
      .setDescription(pregunta)
      .addFields({ name: 'Opciones', value: desc })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < ops.length; i++) {
      await msg.react(emojis[i]).catch(() => {});
    }
  }
};
