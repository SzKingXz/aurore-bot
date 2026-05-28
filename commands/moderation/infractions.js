const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getModLogs } = require('../../db');
const { formatNumber } = require('../../utils/helpers');

const TYPE_EMOJI = { ban: '🔨', kick: '👢', warn: '⚠️', timeout: '🔇', mute: '🔇' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('Ver infracciones de un usuario')
    .addUserOption(opt => opt
      .setName('usuario')
      .setDescription('Usuario a consultar')
      .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }
    const user        = interaction.options.getUser('usuario');
    const infractions = getModLogs(interaction.guildId, user.id, 10);

    if (!infractions.length) {
      return interaction.reply({
        content: `✅ **${user.username}** no tiene infracciones registradas.`,
        ephemeral: true,
      });
    }

    const desc = infractions.map((inf, i) => {
      const emoji = TYPE_EMOJI[inf.type] ?? '◈';
      const fecha = new Date(Number(inf.timestamp)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${emoji} **${inf.type.toUpperCase()}** — ${inf.reason ?? 'Sin razón'}\n└ *${fecha}*`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(PALETTE.error)
      .setTitle(`INFRACCIONES — ${user.username}`)
      .setDescription(desc)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `${infractions.length} infraccione${infractions.length !== 1 ? 's' : ''} · AURORE SYSTEM` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
