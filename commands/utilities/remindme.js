const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { addReminder } = require('../../db');

const MULT = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Crea un recordatorio')
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad').setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(opt => opt.setName('unidad').setDescription('Unidad de tiempo').setRequired(true)
      .addChoices(
        { name: 'Minutos', value: 'minutes' },
        { name: 'Horas',   value: 'hours'   },
        { name: 'Días',    value: 'days'    },
      ))
    .addStringOption(opt => opt.setName('mensaje').setDescription('Tu recordatorio').setRequired(true).setMaxLength(500)),
  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad');
    const unidad   = interaction.options.getString('unidad');
    const mensaje  = interaction.options.getString('mensaje');

    const ms    = cantidad * MULT[unidad];
    const dueAt = Date.now() + ms;
    const fecha = new Date(dueAt);

    addReminder(interaction.user.id, interaction.channelId, interaction.guildId, mensaje, dueAt);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.cyan)
      .setTitle('RECORDATORIO CREADO')
      .setDescription(`> ${mensaje}`)
      .addFields({ name: 'Te lo recuerdo', value: `<t:${Math.floor(fecha.getTime() / 1000)}:R> · <t:${Math.floor(fecha.getTime() / 1000)}:f>` })
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
