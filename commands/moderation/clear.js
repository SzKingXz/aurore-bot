const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal')
    .addIntegerOption(opt => opt
      .setName('cantidad').setDescription('Cantidad de mensajes (1–100)').setRequired(true)
      .setMinValue(1).setMaxValue(100)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const cantidad = interaction.options.getInteger('cantidad');

    await interaction.deferReply({ ephemeral: true });

    let deleted;
    try {
      deleted = await interaction.channel.bulkDelete(cantidad, true);
    } catch {
      return interaction.editReply({ content: '❌ No pude eliminar los mensajes. Los mensajes de más de 14 días no se pueden borrar en masa.' });
    }

    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('MENSAJES ELIMINADOS')
      .setDescription(`Se eliminaron **${deleted.size}** mensaje${deleted.size !== 1 ? 's' : ''}.`)
      .setFooter({ text: 'AURORE SYSTEM' });

    interaction.editReply({ embeds: [embed] });
  },
};
