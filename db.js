const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'aurore.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS levels (
    key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    username TEXT DEFAULT 'Unknown',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    level_channel TEXT,
    log_channel TEXT,
    welcome_channel TEXT
  );
  CREATE TABLE IF NOT EXISTS mod_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    type TEXT NOT NULL,
    user_id TEXT,
    moderator_id TEXT,
    reason TEXT,
    timestamp INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );
  CREATE TABLE IF NOT EXISTS command_stats (
    guild_id TEXT NOT NULL,
    command TEXT NOT NULL,
    uses INTEGER DEFAULT 1,
    last_used INTEGER,
    PRIMARY KEY (guild_id, command)
  );
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    message TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    sent INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS level_roles (
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  );
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    host_id TEXT NOT NULL,
    prize TEXT NOT NULL,
    ends_at INTEGER NOT NULL,
    ended INTEGER DEFAULT 0,
    winner_id TEXT
  );
  CREATE TABLE IF NOT EXISTS giveaway_entries (
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    user_id TEXT NOT NULL,
    username TEXT,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );
`);

try { db.exec('ALTER TABLE guild_config ADD COLUMN suggest_channel TEXT'); } catch {}

const XP_CONFIG = { xpPerMessage: { min: 15, max: 25 }, cooldown: 60000 };

function getXPForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

function getUserData(userId, guildId) {
  const key = `${guildId}_${userId}`;
  let user = db.prepare('SELECT * FROM levels WHERE key = ?').get(key);
  if (!user) {
    db.prepare('INSERT INTO levels (key, user_id, guild_id) VALUES (?, ?, ?)').run(key, userId, guildId);
    user = db.prepare('SELECT * FROM levels WHERE key = ?').get(key);
  }
  return user;
}

function addXP(userId, guildId, amount, username) {
  const key = `${guildId}_${userId}`;
  const data = getUserData(userId, guildId);
  const newXP = data.xp + amount;
  const xpNeeded = getXPForLevel(data.level);
  let leveledUp = false;
  let newLevel = data.level;
  if (newXP >= xpNeeded) { newLevel++; leveledUp = true; }
  db.prepare('UPDATE levels SET xp = ?, level = ?, messages = messages + 1, username = ? WHERE key = ?')
    .run(newXP, newLevel, username || data.username, key);
  return { leveledUp, newLevel, newXP, xpNeeded };
}

function canGainXP(userId, guildId) {
  const key = `${guildId}_${userId}`;
  const data = getUserData(userId, guildId);
  if (Date.now() - data.last_message < XP_CONFIG.cooldown) return false;
  db.prepare('UPDATE levels SET last_message = ? WHERE key = ?').run(Date.now(), key);
  return true;
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?').all(guildId, limit);
}

function getUserRank(userId, guildId) {
  const all = db.prepare('SELECT user_id FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC').all(guildId);
  const idx = all.findIndex(u => u.user_id === userId);
  return idx === -1 ? all.length + 1 : idx + 1;
}

function getGlobalStats() {
  return {
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM levels').get().c,
    totalMessages: db.prepare('SELECT SUM(messages) as s FROM levels').get().s || 0,
    totalXP: db.prepare('SELECT SUM(xp) as s FROM levels').get().s || 0,
    topLevel: db.prepare('SELECT MAX(level) as m FROM levels').get().m || 0,
  };
}

function getGlobalLeaderboard(limit = 10, offset = 0) {
  return db.prepare('SELECT * FROM levels ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(limit, offset);
}

function getGuildConfig(guildId) {
  db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)').run(guildId);
  return db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
}

function setGuildConfig(guildId, key, value) {
  db.prepare(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
}

function logMod(guildId, type, userId, moderatorId, reason) {
  db.prepare('INSERT INTO mod_logs (guild_id, type, user_id, moderator_id, reason) VALUES (?, ?, ?, ?, ?)').run(guildId, type, userId, moderatorId, reason || 'Sin razón');
}

function getModLogs(guildId, userId, limit = 10) {
  return db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, userId, limit);
}

function trackCommand(guildId, command) {
  const now = Date.now();
  db.prepare('INSERT INTO command_stats (guild_id, command, uses, last_used) VALUES (?, ?, 1, ?) ON CONFLICT(guild_id, command) DO UPDATE SET uses = uses + 1, last_used = ?').run(guildId, command, now, now);
}

function getTopCommands(guildId, limit = 5) {
  return db.prepare('SELECT command, uses FROM command_stats WHERE guild_id = ? ORDER BY uses DESC LIMIT ?').all(guildId, limit);
}

function addReminder(userId, channelId, guildId, message, dueAt) {
  return db.prepare('INSERT INTO reminders (user_id, channel_id, guild_id, message, due_at) VALUES (?, ?, ?, ?, ?)').run(userId, channelId, guildId, message, dueAt);
}

function getRemindersDue() {
  return db.prepare('SELECT * FROM reminders WHERE due_at <= ? AND sent = 0').all(Date.now());
}

function markReminderSent(id) {
  db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(id);
}

function setLevelRole(guildId, level, roleId) {
  db.prepare('INSERT INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT(guild_id, level) DO UPDATE SET role_id = ?').run(guildId, level, roleId, roleId);
}

function getLevelRoles(guildId) {
  return db.prepare('SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level ASC').all(guildId);
}

function getLevelRole(guildId, level) {
  return db.prepare('SELECT * FROM level_roles WHERE guild_id = ? AND level = ?').get(guildId, level);
}

function createGiveaway(guildId, channelId, hostId, prize, endsAt) {
  return db.prepare('INSERT INTO giveaways (guild_id, channel_id, host_id, prize, ends_at) VALUES (?, ?, ?, ?, ?)').run(guildId, channelId, hostId, prize, endsAt);
}

function setGiveawayMessageId(id, messageId) {
  db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(messageId, id);
}

function getActiveGiveaways() {
  return db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?').all(Date.now());
}

function endGiveaway(id, winnerId) {
  db.prepare('UPDATE giveaways SET ended = 1, winner_id = ? WHERE id = ?').run(winnerId ?? null, id);
}

function enterGiveaway(giveawayId, userId) {
  try {
    return db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)').run(giveawayId, userId);
  } catch { return null; }
}

function getGiveawayEntries(giveawayId) {
  return db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?').all(giveawayId);
}

function createSuggestion(guildId, channelId, userId, username, content) {
  return db.prepare('INSERT INTO suggestions (guild_id, channel_id, user_id, username, content) VALUES (?, ?, ?, ?, ?)').run(guildId, channelId, userId, username, content);
}

function setSuggestionMessageId(id, messageId) {
  db.prepare('UPDATE suggestions SET message_id = ? WHERE id = ?').run(messageId, id);
}

module.exports = {
  db, XP_CONFIG, getXPForLevel, getUserData, addXP, canGainXP,
  getLeaderboard, getUserRank, getGlobalStats, getGlobalLeaderboard,
  getGuildConfig, setGuildConfig, logMod, getModLogs, trackCommand, getTopCommands,
  addReminder, getRemindersDue, markReminderSent, setLevelRole, getLevelRoles, getLevelRole,
  createGiveaway, setGiveawayMessageId, getActiveGiveaways, endGiveaway,
  enterGiveaway, getGiveawayEntries, createSuggestion, setSuggestionMessageId
};
