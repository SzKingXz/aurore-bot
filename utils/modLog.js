async function sendModLog(guild, embed) {
  const { getGuildConfig } = require('../db');
  const config = getGuildConfig(guild.id);
  if (!config?.log_channel) return;
  const ch = guild.channels.cache.get(config.log_channel);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

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
