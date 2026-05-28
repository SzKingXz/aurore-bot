const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PALETTE, COLOR_ROLES, REGION_ROLES } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automsg')
    .setDescription('Envía menús de autoroles al canal actual')
    .addStringOption(opt => opt
      .setName('categoria').setDescription('Menú a enviar').setRequired(true)
      .addChoices(
        { name: 'Colores',   value: 'colors'  },
        { name: 'Regiones',  value: 'regions' },
      )),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const categoria = interaction.options.getString('categoria');

    if (categoria === 'colors') {
      const options = COLOR_ROLES.map(r => ({ label: r.name, value: r.value }));
      const menu  = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_color')
          .setPlaceholder('Elige tu color…')
          .addOptions(options)
      );
      const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('ROLES DE COLOR')
        .setDescription('Selecciona el color de tu nombre en el servidor.')
        .setFooter({ text: 'AURORE SYSTEM' });
      return interaction.reply({ embeds: [embed], components: [menu] });
    }

    const options = REGION_ROLES.map(r => ({ label: r.name, value: r.value }));
    const menu  = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_region')
        .setPlaceholder('Elige tu región…')
        .addOptions(options)
    );
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('ROLES DE REGIÓN')
      .setDescription('Selecciona la región desde donde te conectas.')
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed], components: [menu] });
  },
};
