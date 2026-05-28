const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra todos los comandos disponibles'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(PALETTE.primary)
      .setTitle('AURORE — Comandos')
      .addFields(
        { name: '⚡ General',      value: '`/ping` `/help`',                                                                          inline: true },
        { name: '📊 Perfil',       value: '`/rank` `/leaderboard`',                                                                   inline: true },
        { name: '🔍 Info',         value: '`/userinfo` `/serverinfo` `/avatar`',                                                      inline: true },
        { name: '🗳️ Utilidades',  value: '`/poll` `/remindme`',                                                                      inline: true },
        { name: '🎲 Diversión',   value: '`/coinflip` `/dice` `/8ball`',                                                              inline: true },
        { name: '🎁 Sorteos',      value: '`/giveaway`',                                                                              inline: true },
        { name: '💡 Sugerencias',  value: '`/suggest` `/set-suggest-channel`',                                                        inline: true },
        { name: '🎨 Autoroles',    value: '`/automsg`',                                                                               inline: true },
        { name: '🛡️ Moderación',  value: '`/warn` `/kick` `/ban` `/timeout` `/clear` `/slowmode` `/lock` `/unlock` `/announce` `/infractions`', inline: false },
        { name: '⚙️ Config',       value: '`/setup` `/set-level-channel` `/set-log-channel` `/set-welcome-channel` `/set-suggest-channel` `/add-level-role` `/level-roles`', inline: false },
      )
      .setFooter({ text: 'AURORE SYSTEM' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
