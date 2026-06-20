const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getSocialByGuild } = require('../../db');

const PLATFORM_LABEL = { youtube: '▶ YouTube', x: '✕ X', tiktok: '♪ TikTok' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-list')
    .setDescription('Muestra los creadores monitoreados en este servidor'),
  async execute(interaction) {
    const monitors = getSocialByGuild(interaction.guildId);

    if (!monitors.length) {
      return interaction.reply({ content: '◈ No hay creadores monitoreados. Usa `/social-add` para añadir uno.', ephemeral: true });
    }

    const desc = monitors.map(m =>
      `${PLATFORM_LABEL[m.platform] ?? m.platform} — **${m.creator_name}**\n` +
      `└ ID: \`${m.id}\` · Canal: <#${m.channel_id}> · ${m.enabled ? '🟢 Activo' : '🔴 Pausado'}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('MONITORES DE REDES SOCIALES')
      .setDescription(desc)
      .setFooter({ text: `${monitors.length} configurado${monitors.length !== 1 ? 's' : ''} · /social-remove <id> para eliminar` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
