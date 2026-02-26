const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { createGiveaway } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Crea un sorteo')
    .addStringOption(opt => opt
      .setName('premio')
      .setDescription('Qué se regala')
      .setRequired(true))
    .addIntegerOption(opt => opt
      .setName('minutos')
      .setDescription('Duración en minutos')
      .setRequired(true)
      .setMinValue(1)),
  async execute(interaction) {
    const premio = interaction.options.getString('premio');
    const minutos = interaction.options.getInteger('minutos');
    const fecha = new Date(Date.now() + minutos * 60000);
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.gold)
      .setTitle('✦ SORTEO')
      .setDescription(`**Premio: ${premio}**`)
      .addFields({ name: 'Termina', value: `<t:${Math.floor(fecha.getTime() / 1000)}:R>` })
      .setFooter({ text: 'AURORE SYSTEM' });
    
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter_0')
        .setLabel('Participar')
        .setStyle(ButtonStyle.Success)
    );
    
    const msg = await interaction.reply({ embeds: [embed], components: [btn], fetchReply: true });
    const giveaway = createGiveaway(interaction.guildId, msg.id, interaction.channelId, premio, fecha);
    
    if (giveaway) {
      const btn2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${giveaway.id}`)
          .setLabel('Participar')
          .setStyle(ButtonStyle.Success)
      );
      msg.edit({ components: [btn2] });
    }
  }
};
