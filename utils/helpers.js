const spamTracker = new Map();

function checkSpam(userId, guildId, config) {
  const key = `${guildId}_${userId}`;
  const now = Date.now();
  if (!spamTracker.has(key)) spamTracker.set(key, []);
  const timestamps = spamTracker.get(key).filter(t => now - t < config.WINDOW);
  timestamps.push(now);
  spamTracker.set(key, timestamps);
  return timestamps.length >= config.LIMIT;
}

function clearSpamTracker(userId, guildId) {
  const key = `${guildId}_${userId}`;
  spamTracker.delete(key);
}

function getXPBar(xp, xpNeeded) {
  const progress = Math.min(Math.floor((xp / xpNeeded) * 100), 100);
  const filled = Math.floor(progress / 10);
  return { bar: '█'.repeat(filled) + '░'.repeat(10 - filled), progress };
}

function formatNumber(num) {
  return num.toLocaleString('es-ES');
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

module.exports = { checkSpam, clearSpamTracker, getXPBar, formatNumber, formatUptime };
