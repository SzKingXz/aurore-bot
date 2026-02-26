const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getLeaderboard } = require('../../db');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Ver el ranking del servidor')
    .addIntegerOption(opt => opt
      .setName('limite')
      .setDescription('Cantidad de usuarios (1-25)')
      .setMinValue(1)
      .setMaxValue(25)),
  async execute(interaction) {
    const limite = interaction.options.getInteger('limite') || 10;
    const lb = getLeaderboard(interaction.guildId, limite);
    if (lb.length === 0) return interaction.reply({ content: 'No hay datos en el leaderboard.', ephemeral: true });
    
    const medals = ['🥇', '🥈', '🥉'];
    const desc = lb.map((u, i) => {
      const medal = medals[i] || '▫️';
      return `${medal} **#${i + 1}** - <@${u.user_id}> (Nivel ${u.level} • ${formatNumber(u.xp)} XP)`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(PALETTE.gold)
      .setTitle('✦ LEADERBOARD')
      .setDescription(desc)
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
