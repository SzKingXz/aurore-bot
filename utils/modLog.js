/**
 * Envía un embed de moderación al canal de logs configurado para el servidor.
 * Si el servidor no tiene canal de logs configurado, no hace nada.
 *
 * @param {import('discord.js').Guild} guild  - Instancia del servidor de Discord
 * @param {import('discord.js').EmbedBuilder} embed - Embed con los detalles de la acción
 * @returns {Promise<void>}
 */
async function sendModLog(guild, embed) {
  const { getGuildConfig } = require('../db');
  const config = getGuildConfig(guild.id);
  if (!config?.log_channel) return;
  const ch = guild.channels.cache.get(config.log_channel);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Asigna el rol de nivel configurado a un miembro cuando alcanza ese nivel.
 * Si no hay rol configurado para ese nivel exacto, no hace nada.
 * Falla silenciosamente para no interrumpir el flujo de XP.
 *
 * @param {import('discord.js').GuildMember} member - Miembro que subió de nivel
 * @param {import('discord.js').Guild} guild         - Servidor donde ocurrió el level-up
 * @param {number} level                             - Nuevo nivel alcanzado
 * @returns {Promise<void>}
 */
async function assignLevelRole(member, guild, level) {
  const { getLevelRole } = require('../db');
  const levelRole = getLevelRole(guild.id, level);
  if (!levelRole) return;
  const role = guild.roles.cache.get(levelRole.role_id);
  if (role && !member.roles.cache.has(role.id)) {
    await member.roles.add(role).catch(() => {});
  }
}

module.exports = { sendModLog, assignLevelRole };
