const { EmbedBuilder } = require('discord.js');
const { PALETTE } = require('../utils/constants');
const { getRemindersDue, markReminderSent, getActiveGiveaways, getGiveawayEntries, endGiveaway } = require('../db');

function startReminderLoop(client) {
  setInterval(async () => {
    const due = getRemindersDue();
    for (const r of due) {
      try {
        const channel = await client.channels.fetch(r.channel_id).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(PALETTE.cyan)
            .setTitle('✦ RECORDATORIO')
            .setDescription(`<@${r.user_id}>, te pediste que te recuerde:\n\n**${r.message}**`)
            .setFooter({ text: 'AURORE SYSTEM', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
          await channel.send({ content: `<@${r.user_id}>`, embeds: [embed] }).catch(() => {});
        }
        markReminderSent(r.id);
      } catch {}
    }
  }, 30000);
}

function startGiveawayLoop(client) {
  setInterval(async () => {
    const ended = getActiveGiveaways();
    for (const g of ended) {
      try {
        const channel = await client.channels.fetch(g.channel_id).catch(() => null);
        const msg = channel ? await channel.messages.fetch(g.message_id).catch(() => null) : null;
        const entries = getGiveawayEntries(g.id);
        let winner = null;
        if (entries.length > 0) {
          const winnerId = entries[Math.floor(Math.random() * entries.length)].user_id;
          winner = await client.users.fetch(winnerId).catch(() => null);
        }
        endGiveaway(g.id, winner?.id ?? null);
        const embed = new EmbedBuilder()
          .setColor(winner ? PALETTE.gold : PALETTE.muted)
          .setTitle('✦ SORTEO FINALIZADO')
          .setDescription(winner ? `🎉 ¡${winner} ganó **${g.prize}**!` : `Sin participantes para **${g.prize}**.`)
          .setFooter({ text: 'AURORE SYSTEM', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        if (winner && channel) {
          await channel.send({ content: `🎉 ¡Felicidades ${winner}! Ganaste **${g.prize}**.` }).catch(() => {});
        }
      } catch {}
    }
  }, 15000);
}

module.exports = { startReminderLoop, startGiveawayLoop };
