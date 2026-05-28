const { EmbedBuilder } = require('discord.js');
const { enterGiveaway } = require('../../db');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'aurore.db');

function getParticipantCount(giveawayId) {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(giveawayId);
    db.close();
    return row?.c ?? 0;
  } catch { return 0; }
}

async function handleButton(interaction) {
  if (!interaction.customId.startsWith('giveaway_enter_')) return;

  const rawId     = interaction.customId.split('_')[2];
  const giveawayId = parseInt(rawId, 10);
  if (isNaN(giveawayId) || giveawayId <= 0) {
    return interaction.reply({ content: '❌ Sorteo no válido.', ephemeral: true });
  }

  try {
    const joined = enterGiveaway(giveawayId, interaction.user.id);
    if (!joined) {
      return interaction.reply({ content: '❌ Ya estás participando en este sorteo.', ephemeral: true });
    }

    const count   = getParticipantCount(giveawayId);
    const msg     = interaction.message;
    const oldEmbed = msg?.embeds?.[0];

    if (oldEmbed && msg.editable) {
      const updated = EmbedBuilder.from(oldEmbed)
        .setFooter({ text: `Participantes: ${count}  ·  AURORE SYSTEM` });
      await msg.edit({ embeds: [updated] }).catch(() => {});
    }

    const prize = oldEmbed?.description?.replace(/\*\*/g, '').trim() ?? 'el sorteo';
    await interaction.reply({ content: `🎉 ¡Entraste al sorteo de **${prize}**! Somos ${count} participantes.`, ephemeral: true });
  } catch (err) {
    console.error('[handleButton]', err.message);
    await interaction.reply({ content: '❌ Error al procesar tu participación.', ephemeral: true }).catch(() => {});
  }
}

module.exports = { handleButton };
