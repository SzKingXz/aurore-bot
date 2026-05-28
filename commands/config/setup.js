const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configuración inicial rápida del servidor'),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ No tienes permisos de gestión del servidor.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const results = [];

    const hasAutoroles = interaction.guild.channels.cache.some(c => c.name === 'autoroles');
    if (!hasAutoroles) {
      await interaction.guild.channels.create({ name: 'autoroles', type: 4, reason: 'Setup AURORE' }).catch(() => null);
      results.push('✅ Categoría `autoroles` creada');
    } else {
      results.push('◈ Categoría `autoroles` ya existe');
    }

    const embed = new EmbedBuilder()
      .setColor(PALETTE.success)
      .setTitle('CONFIGURACIÓN COMPLETADA')
      .setDescription(results.join('\n'))
      .addFields({
        name: 'Próximos pasos',
        value: [
          '`/set-level-channel` — canal de level-up',
          '`/set-log-channel` — canal de logs de moderación',
          '`/set-welcome-channel` — canal de bienvenida',
          '`/add-level-role` — rol por nivel',
        ].join('\n'),
      })
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
