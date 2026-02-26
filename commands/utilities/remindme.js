const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { createReminder } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Te recordará un mensaje')
    .addIntegerOption(opt => opt
      .setName('cantidad')
      .setDescription('Cantidad')
      .setRequired(true)
      .setMinValue(1))
    .addStringOption(opt => opt
      .setName('unidad')
      .setDescription('Unidad de tiempo')
      .setRequired(true)
      .addChoices(
        { name: 'Minutos', value: 'minutes' },
        { name: 'Horas', value: 'hours' },
        { name: 'Días', value: 'days' }
      ))
    .addStringOption(opt => opt
      .setName('mensaje')
      .setDescription('Tu recordatorio')
      .setRequired(true)),
  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad');
    const unidad = interaction.options.getString('unidad');
    const mensaje = interaction.options.getString('mensaje');
    
    const mult = { minutes: 60000, hours: 3600000, days: 86400000 };
    const ms = cantidad * mult[unidad];
    const fecha = new Date(Date.now() + ms);
    
    createReminder(interaction.user.id, interaction.channelId, mensaje, fecha);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('✦ RECORDATORIO CREADO')
      .setDescription(mensaje)
      .addFields({ name: 'Para', value: `<t:${Math.floor(fecha.getTime() / 1000)}:R>` })
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
