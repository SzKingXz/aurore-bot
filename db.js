const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'aurore.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -8000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      key          TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      guild_id     TEXT NOT NULL,
      username     TEXT DEFAULT 'Unknown',
      xp           INTEGER DEFAULT 0,
      level        INTEGER DEFAULT 0,
      messages     INTEGER DEFAULT 0,
      last_message INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_levels_guild   ON levels(guild_id);
    CREATE INDEX IF NOT EXISTS idx_levels_ranking ON levels(guild_id, level DESC, xp DESC);

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id         TEXT PRIMARY KEY,
      level_channel    TEXT,
      log_channel      TEXT,
      welcome_channel  TEXT,
      suggest_channel  TEXT
    );

    CREATE TABLE IF NOT EXISTS mod_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id     TEXT    NOT NULL,
      type         TEXT    NOT NULL,
      user_id      TEXT,
      moderator_id TEXT,
      reason       TEXT,
      timestamp    INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_modlogs_guild ON mod_logs(guild_id);
    CREATE INDEX IF NOT EXISTS idx_modlogs_user  ON mod_logs(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_modlogs_ts    ON mod_logs(guild_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS giveaways (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id   TEXT    NOT NULL,
      channel_id TEXT,
      message_id TEXT,
      prize      TEXT    NOT NULL,
      ends_at    INTEGER,
      active     INTEGER DEFAULT 1,
      winner_id  TEXT,
      imagen     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_giveaways_guild  ON giveaways(guild_id);
    CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(active, ends_at);

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
      user_id     TEXT    NOT NULL,
      UNIQUE(giveaway_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_entries_giveaway ON giveaway_entries(giveaway_id);

    CREATE TABLE IF NOT EXISTS level_roles (
      guild_id TEXT    NOT NULL,
      level    INTEGER NOT NULL,
      role_id  TEXT    NOT NULL,
      PRIMARY KEY (guild_id, level)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT    NOT NULL,
      channel_id TEXT    NOT NULL,
      guild_id   TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      due_at     INTEGER NOT NULL,
      sent       INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(sent, due_at);

    CREATE TABLE IF NOT EXISTS command_stats (
      guild_id  TEXT    NOT NULL,
      command   TEXT    NOT NULL,
      uses      INTEGER DEFAULT 1,
      last_used INTEGER,
      PRIMARY KEY (guild_id, command)
    );
  `);

  db.exec(`ALTER TABLE guild_config ADD COLUMN suggest_channel TEXT`).valueOf?.();
} catch (err) {
  if (!err.message?.includes('duplicate column')) {
    console.error('[DB] Error:', err.message);
    process.exit(1);
  }
}

console.log('[DB] SQLite listo');

const XP_CONFIG = {
  xpPerMessage: { min: 10, max: 25 },
  cooldown:     5_000,
  xpPerLevel:   100,
};

const stmts = {
  getUser:         db.prepare('SELECT * FROM levels WHERE key = ?'),
  upsertUser:      db.prepare('INSERT OR REPLACE INTO levels (key,user_id,guild_id,username,xp,level,messages,last_message) VALUES (?,?,?,?,?,?,?,?)'),
  leaderboard:     db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?'),
  getConfig:       db.prepare('SELECT * FROM guild_config WHERE guild_id = ?'),
  upsertConfig:    db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)'),
  insertMod:       db.prepare('INSERT INTO mod_logs (guild_id,type,user_id,moderator_id,reason) VALUES (?,?,?,?,?)'),
  getModLogs:      db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT ?'),
  getLevelRole:    db.prepare('SELECT role_id FROM level_roles WHERE guild_id = ? AND level = ?'),
  getLevelRoles:   db.prepare('SELECT level, role_id FROM level_roles WHERE guild_id = ? ORDER BY level ASC'),
  upsertLevelRole: db.prepare('INSERT OR REPLACE INTO level_roles (guild_id, level, role_id) VALUES (?,?,?)'),
  getDueReminders: db.prepare('SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?'),
  markReminder:    db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?'),
  getGiveaway:     db.prepare('SELECT id FROM giveaways WHERE message_id = ? AND guild_id = ?'),
  activeGiveaways: db.prepare('SELECT * FROM giveaways WHERE active = 1 AND ends_at <= ?'),
  getEntries:      db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?'),
  endGiveaway:     db.prepare('UPDATE giveaways SET active = 0, winner_id = ? WHERE id = ?'),
};

const ALLOWED_CONFIG = ['level_channel', 'log_channel', 'welcome_channel', 'suggest_channel'];

module.exports = {
  XP_CONFIG,

  addXP(userId, guildId, xpGain, username) {
    try {
      const key   = `${guildId}_${userId}`;
      const user  = stmts.getUser.get(key) ?? { xp: 0, level: 0, messages: 0 };
      const newXP     = user.xp + xpGain;
      const leveledUp = newXP >= XP_CONFIG.xpPerLevel;
      const newLevel  = leveledUp ? user.level + 1 : user.level;
      const remainXP  = leveledUp ? newXP - XP_CONFIG.xpPerLevel : newXP;
      stmts.upsertUser.run(key, userId, guildId, username, remainXP, newLevel, (user.messages ?? 0) + 1, Date.now());
      return { leveledUp, newLevel, newXP: remainXP };
    } catch (err) {
      console.error('[db.addXP]', err.message);
      return { leveledUp: false, newLevel: 0, newXP: 0 };
    }
  },

  getUserData(userId, guildId) {
    try { return stmts.getUser.get(`${guildId}_${userId}`) ?? { xp: 0, level: 0, messages: 0 }; }
    catch { return { xp: 0, level: 0, messages: 0 }; }
  },

  getLeaderboard(guildId, limit = 10) {
    try { return stmts.leaderboard.all(guildId, Math.min(limit, 25)); }
    catch { return []; }
  },

  canGainXP(userId, guildId) {
    try {
      const u = stmts.getUser.get(`${guildId}_${userId}`);
      return !u || (Date.now() - (u.last_message ?? 0)) > XP_CONFIG.cooldown;
    } catch { return true; }
  },

  getGuildConfig(guildId) {
    try { return stmts.getConfig.get(guildId) ?? null; }
    catch { return null; }
  },

  setGuildConfig(guildId, key, value) {
    if (!ALLOWED_CONFIG.includes(key)) return;
    try {
      stmts.upsertConfig.run(guildId);
      db.prepare(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
    } catch (err) { console.error('[db.setGuildConfig]', err.message); }
  },

  logMod(guildId, type, userId, modId, reason) {
    try {
      stmts.insertMod.run(guildId, type, userId, modId, reason);
      global.auroreBroadcast?.(guildId, {
        type: 'mod_action', guildId: String(guildId),
        action: type, userId: String(userId),
        message: `${type.toUpperCase()} — ${reason || 'Sin razón'}`,
        ts: Date.now(),
      });
    } catch (err) { console.error('[db.logMod]', err.message); }
  },

  getModLogs(guildId, userId, limit = 10) {
    try { return stmts.getModLogs.all(guildId, userId, limit); }
    catch { return []; }
  },

  getLevelRole(guildId, level) {
    try { return stmts.getLevelRole.get(guildId, level) ?? null; }
    catch { return null; }
  },

  getLevelRoles(guildId) {
    try { return stmts.getLevelRoles.all(guildId); }
    catch { return []; }
  },

  addLevelRole(guildId, level, roleId) {
    try { stmts.upsertLevelRole.run(guildId, level, roleId); }
    catch (err) { console.error('[db.addLevelRole]', err.message); }
  },

  getRemindersDue() {
    try { return stmts.getDueReminders.all(Date.now()); }
    catch { return []; }
  },

  markReminderSent(id) {
    try { stmts.markReminder.run(id); }
    catch {}
  },

  addReminder(userId, channelId, guildId, message, dueAt) {
    try {
      db.prepare('INSERT INTO reminders (user_id,channel_id,guild_id,message,due_at) VALUES (?,?,?,?,?)').run(userId, channelId, guildId, message, dueAt);
    } catch (err) { console.error('[db.addReminder]', err.message); }
  },

  createGiveaway(guildId, messageId, channelId, prize, endsAt, imagen = null) {
    try {
      db.prepare('INSERT INTO giveaways (guild_id,channel_id,message_id,prize,ends_at,imagen,active) VALUES (?,?,?,?,?,?,1)')
        .run(guildId, channelId, messageId, prize, Math.floor(endsAt.getTime() / 1000), imagen);
      return stmts.getGiveaway.get(messageId, guildId) ?? { id: 1 };
    } catch (err) { console.error('[db.createGiveaway]', err.message); return { id: 1 }; }
  },

  getActiveGiveaways() {
    try { return stmts.activeGiveaways.all(Math.floor(Date.now() / 1000)); }
    catch { return []; }
  },

  getGiveawayEntries(giveawayId) {
    try { return stmts.getEntries.all(giveawayId); }
    catch { return []; }
  },

  enterGiveaway(giveawayId, userId) {
    try {
      db.prepare('INSERT INTO giveaway_entries (giveaway_id,user_id) VALUES (?,?)').run(giveawayId, userId);
      return true;
    } catch { return false; }
  },

  endGiveaway(giveawayId, winnerId) {
    try { stmts.endGiveaway.run(winnerId, giveawayId); }
    catch (err) { console.error('[db.endGiveaway]', err.message); }
  },

  trackCommand(guildId, command) {
    try {
      db.prepare('INSERT INTO command_stats (guild_id,command,last_used) VALUES (?,?,?) ON CONFLICT(guild_id,command) DO UPDATE SET uses=uses+1, last_used=?')
        .run(guildId, command, Date.now(), Date.now());
    } catch {}
  },

  getGlobalStats() {
    try {
      return {
        totalUsers:    db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM levels').get()?.c ?? 0,
        totalMessages: db.prepare('SELECT SUM(messages) as c FROM levels').get()?.c ?? 0,
        totalXP:       db.prepare('SELECT SUM(xp) as c FROM levels').get()?.c ?? 0,
        topLevel:      db.prepare('SELECT level FROM levels ORDER BY level DESC LIMIT 1').get()?.level ?? 0,
      };
    } catch { return { totalUsers: 0, totalMessages: 0, totalXP: 0, topLevel: 0 }; }
  },
};
