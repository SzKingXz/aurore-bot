const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../../utils/constants');
const { getGlobalStats } = require('../../db');
const { formatNumber, formatUptime } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Muestra estadísticas globales del bot'),
  async execute(interaction) {
    const stats = getGlobalStats();
    const uptime = formatUptime(Math.floor(process.uptime()));
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const embed = new EmbedBuilder()
      .setColor(PALETTE.gold)
      .setTitle('✦ ESTADÍSTICAS')
      .addFields(
        { name: 'Servidores', value: formatNumber(interaction.client.guilds.cache.size), inline: true },
        { name: 'Usuarios', value: formatNumber(stats.totalUsers), inline: true },
        { name: 'Mensajes', value: formatNumber(stats.totalMessages), inline: true },
        { name: 'XP Total', value: formatNumber(stats.totalXP), inline: true },
        { name: 'Nivel Máx', value: `${stats.topLevel}`, inline: true },
        { name: 'Uptime', value: uptime, inline: true },
        { name: 'Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
        { name: 'Memoria', value: `${memory}MB`, inline: true }
      )
      .setFooter({ text: 'AURORE SYSTEM' });
    interaction.reply({ embeds: [embed] });
  }
};
