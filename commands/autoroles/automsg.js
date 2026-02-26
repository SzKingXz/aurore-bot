const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PALETTE, COLOR_ROLES, REGION_ROLES } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automsg')
    .setDescription('Envía menús de roles automáticos')
    .addStringOption(opt => opt
      .setName('categoria')
      .setDescription('Qué menú enviar')
      .setRequired(true)
      .addChoices(
        { name: 'Colores', value: 'colors' },
        { name: 'Regiones', value: 'regions' }
      )),
  async execute(interaction) {
    const categoria = interaction.options.getString('categoria');
    
    if (categoria === 'colors') {
      const options = COLOR_ROLES.map(r => ({ label: r.name, value: r.value, emoji: r.color }));
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_color')
          .setPlaceholder('Selecciona un color')
          .addOptions(options)
      );
      const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('✦ COLORES')
        .setDescription('Selecciona tu color de rol')
        .setFooter({ text: 'AURORE SYSTEM' });
      interaction.reply({ embeds: [embed], components: [menu] });
    } else {
      const options = REGION_ROLES.map(r => ({ label: r.name, value: r.value, emoji: r.emoji }));
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_region')
          .setPlaceholder('Selecciona tu región')
          .addOptions(options)
      );
      const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('✦ REGIONES')
        .setDescription('Selecciona tu región')
        .setFooter({ text: 'AURORE SYSTEM' });
      interaction.reply({ embeds: [embed], components: [menu] });
    }
  }
};
