const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE } = require('../utils/constants');
const { getRemindersDue, markReminderSent, getActiveGiveaways, getGiveawayEntries, endGiveaway } = require('../db');

function startKeepAlive() {
  const url = `https://aurore-bot-h05w.onrender.com/health`;
  const ping = () => fetch(url).catch(() => {});
  ping();
  setInterval(ping, 840_000);
}

function startReminderLoop(client) {
  const check = async () => {
    const due = getRemindersDue();
    for (const r of due) {
      try {
        const channel = await client.channels.fetch(r.channel_id).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(PALETTE.cyan)
            .setTitle('RECORDATORIO')
            .setDescription(`<@${r.user_id}>, me pediste que te recuerde:\n\n> ${r.message}`)
            .setFooter({ text: 'AURORE SYSTEM', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
          await channel.send({ content: `<@${r.user_id}>`, embeds: [embed] }).catch(() => {});
        }
        markReminderSent(r.id);
      } catch (err) {
        console.error('[ReminderLoop]', err.message);
      }
    }
  };
  check();
  const id = setInterval(check, 30_000);
  return () => clearInterval(id);
}

function startGiveawayLoop(client) {
  const check = async () => {
    const ended = getActiveGiveaways();
    for (const g of ended) {
      try {
        const channel = await client.channels.fetch(g.channel_id).catch(() => null);
        const msg     = channel ? await channel.messages.fetch(g.message_id).catch(() => null) : null;
        const entries = getGiveawayEntries(g.id);

        let winner = null;
        if (entries.length > 0) {
          const pick = entries[Math.floor(Math.random() * entries.length)];
          winner     = await client.users.fetch(pick.user_id).catch(() => null);
        }

        endGiveaway(g.id, winner?.id ?? null);

        client.broadcast?.(g.guild_id, {
          type: 'giveaway_end', guildId: String(g.guild_id),
          prize: g.prize, winnerId: winner?.id ?? null,
          message: winner ? `🎁 ${winner.username} ganó: ${g.prize}` : `Sin participantes para: ${g.prize}`,
          ts: Date.now(),
        });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_enter_${g.id}`)
            .setLabel('🏁 Sorteo finalizado')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        const embed = new EmbedBuilder()
          .setColor(winner ? PALETTE.gold : PALETTE.muted)
          .setTitle('SORTEO FINALIZADO')
          .setDescription(winner ? `🎉 ¡${winner} ganó **${g.prize}**!` : `Sin participantes para **${g.prize}**.`)
          .setFooter({ text: `${entries.length} participante${entries.length !== 1 ? 's' : ''}  ·  AURORE SYSTEM` })
          .setTimestamp();

        if (msg) await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
        if (winner && channel) await channel.send({ content: `🎉 ¡Felicidades ${winner}! Ganaste **${g.prize}**.` }).catch(() => {});
      } catch (err) {
        console.error('[GiveawayLoop]', err.message);
      }
    }
  };
  check();
  const id = setInterval(check, 15_000);
  return () => clearInterval(id);
}

module.exports = { startReminderLoop, startGiveawayLoop, startKeepAlive };
