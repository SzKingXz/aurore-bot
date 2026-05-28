const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getUserData, getLeaderboard } = require('../../db');
const { getXPBar, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Ver tu rango en el servidor')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar')),
  async execute(interaction) {
    const user   = interaction.options.getUser('usuario') ?? interaction.user;
    const data   = getUserData(user.id, interaction.guildId);

    if (!data || (!data.xp && !data.messages && !data.level)) {
      return interaction.reply({ content: `**${user.username}** no tiene estadísticas en este servidor.`, ephemeral: true });
    }

    const lb       = getLeaderboard(interaction.guildId, 500);
    const pos      = lb.findIndex(u => u.user_id === user.id) + 1;
    const xpNeeded = Math.max(100, 100 * Math.max(data.level, 1));
    const { bar, progress } = getXPBar(data.xp, xpNeeded);

    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle(`PERFIL — ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nivel',    value: `${data.level}`,                                   inline: true },
        { name: 'Posición', value: pos > 0 ? `#${pos}/${lb.length}` : '—',            inline: true },
        { name: 'XP',       value: `${formatNumber(data.xp)}/${formatNumber(xpNeeded)}`, inline: true },
        { name: 'Progreso', value: `${bar} ${progress}%`,                             inline: false },
        { name: 'Mensajes', value: formatNumber(data.messages ?? 0),                  inline: true },
      )
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
