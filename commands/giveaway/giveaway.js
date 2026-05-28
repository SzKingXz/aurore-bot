const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { createGiveaway } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Crea un sorteo')
    .addStringOption(opt => opt.setName('premio').setDescription('Premio del sorteo').setRequired(true).setMaxLength(256))
    .addIntegerOption(opt => opt.setName('minutos').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(20160))
    .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen opcional (https://…)')),
  async execute(interaction) {
    const premio  = interaction.options.getString('premio');
    const minutos = interaction.options.getInteger('minutos');
    const imagen  = interaction.options.getString('imagen') ?? null;
    const endsAt  = new Date(Date.now() + minutos * 60_000);

    if (imagen && !imagen.startsWith('https://')) {
      return interaction.reply({ content: '❌ La imagen debe ser una URL https.', ephemeral: true });
    }

    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(PALETTE.gold)
      .setTitle('SORTEO')
      .setDescription(`**${premio}**`)
      .addFields({ name: 'Termina', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>` })
      .setFooter({ text: 'Participantes: 0  ·  AURORE SYSTEM' });

    if (imagen) embed.setImage(imagen);

    const msg = await interaction.editReply({ embeds: [embed], fetchReply: true });

    const giveaway = createGiveaway(interaction.guildId, msg.id, interaction.channelId, premio, endsAt, imagen);
    const id       = giveaway?.id ?? 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${id}`)
        .setLabel('🎁 Participar')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
  },
};
