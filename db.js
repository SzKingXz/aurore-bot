let db;
const path = require('path');

try {
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'aurore.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('✅ SQLite inicializado');
} catch (err) {
  console.log('⚠️ better-sqlite3 no disponible, usando fallback en memoria');
  db = {
    data: {},
    prepare: () => ({
      run: () => ({ changes: 1 }),
      all: () => [],
      get: () => null
    }),
    exec: () => {}
  };
}

const XP_CONFIG = {
  xpPerMessage: { min: 10, max: 25 },
  cooldown: 5000,
  xpPerLevel: 100
};

module.exports = {
  XP_CONFIG,
  
  addXP: (userId, guildId, xpGain, username) => {
    try {
      const key = `${guildId}_${userId}`;
      const user = db.prepare?.('SELECT * FROM levels WHERE key = ?')?.get(key) || {
        user_id: userId,
        guild_id: guildId,
        username: username || 'Unknown',
        xp: 0,
        level: 0,
        messages: 0
      };

      const newXP = (user.xp || 0) + xpGain;
      const xpNeeded = XP_CONFIG.xpPerLevel;
      const leveledUp = newXP >= xpNeeded;
      const newLevel = leveledUp ? (user.level || 0) + 1 : (user.level || 0);
      const remainingXP = leveledUp ? newXP - xpNeeded : newXP;

      if (db.prepare) {
        db.prepare(`
          INSERT OR REPLACE INTO levels (key, user_id, guild_id, username, xp, level, messages, last_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(key, userId, guildId, username, remainingXP, newLevel, (user.messages || 0) + 1, Date.now());
      }

      return {
        leveledUp,
        newLevel,
        newXP: remainingXP
      };
    } catch (err) {
      console.error('Error en addXP:', err);
      return { leveledUp: false, newLevel: 0, newXP: 0 };
    }
  },

  getUserData: (userId, guildId) => {
    try {
      const key = `${guildId}_${userId}`;
      const user = db.prepare?.('SELECT * FROM levels WHERE key = ?')?.get(key);
      return user || { xp: 0, level: 0, messages: 0, username: 'Unknown' };
    } catch {
      return { xp: 0, level: 0, messages: 0, username: 'Unknown' };
    }
  },

  getLeaderboard: (guildId, limit = 10) => {
    try {
      return db.prepare?.(`
        SELECT * FROM levels 
        WHERE guild_id = ?
        ORDER BY level DESC, xp DESC
        LIMIT ?
      `)?.all(guildId, limit) || [];
    } catch {
      return [];
    }
  },

  canGainXP: (userId, guildId) => {
    try {
      const key = `${guildId}_${userId}`;
      const user = db.prepare?.('SELECT last_message FROM levels WHERE key = ?')?.get(key);
      const lastTime = user?.last_message || 0;
      return Date.now() - lastTime > XP_CONFIG.cooldown;
    } catch {
      return true;
    }
  },

  getGuildConfig: (guildId) => {
    try {
      return db.prepare?.('SELECT * FROM guild_config WHERE guild_id = ?')?.get(guildId) || null;
    } catch {
      return null;
    }
  },

  setGuildConfig: (guildId, key, value) => {
    try {
      if (db.prepare) {
        db.prepare(`
          INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)
        `).run(guildId);
        db.prepare(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
      }
    } catch (err) {
      console.error('Error en setGuildConfig:', err);
    }
  },

  logMod: (guildId, type, userId, modId, reason) => {
    try {
      if (db.prepare) {
        db.prepare(`
          INSERT INTO mod_logs (guild_id, type, user_id, moderator_id, reason)
          VALUES (?, ?, ?, ?, ?)
        `).run(guildId, type, userId, modId, reason);
      }
    } catch (err) {
      console.error('Error en logMod:', err);
    }
  },

  getModLogs: (guildId, userId, limit = 10) => {
    try {
      return db.prepare?.(`
        SELECT * FROM mod_logs 
        WHERE guild_id = ? AND user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `)?.all(guildId, userId, limit) || [];
    } catch {
      return [];
    }
  },

  trackCommand: (guildId, command) => {
    try {
      if (db.prepare) {
        db.prepare(`
          INSERT INTO command_stats (guild_id, command, last_used) VALUES (?, ?, ?)
          ON CONFLICT(guild_id, command) DO UPDATE SET uses = uses + 1, last_used = ?
        `).run(guildId, command, Date.now(), Date.now());
      }
    } catch {
      return;
    }
  },

  addReminder: (userId, channelId, guildId, message, dueAt) => {
    try {
      if (db.prepare) {
        return db.prepare(`
          INSERT INTO reminders (user_id, channel_id, guild_id, message, due_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, channelId, guildId, message, dueAt);
      }
    } catch (err) {
      console.error('Error en addReminder:', err);
    }
  },

  getRemindersDue: () => {
    try {
      return db.prepare?.(`
        SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?
      `)?.all(Date.now()) || [];
    } catch {
      return [];
    }
  },

  markReminderSent: (reminderId) => {
    try {
      if (db.prepare) {
        db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(reminderId);
      }
    } catch {
      return;
    }
  },

  createGiveaway: (guildId, messageId, channelId, prize, endsAt, imagen = null) => {
    try {
      if (db.prepare) {
        db.prepare(`
          INSERT INTO giveaways (guild_id, channel_id, message_id, prize, ends_at, imagen, active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(guildId, channelId, messageId, prize, Math.floor(endsAt.getTime() / 1000), imagen);
        
        const giveaway = db.prepare(`
          SELECT id FROM giveaways WHERE message_id = ? AND guild_id = ?
        `).get(messageId, guildId);
        
        return giveaway || { id: 1 };
      }
      return { id: Math.random() * 1000 };
    } catch (err) {
      console.error('Error en createGiveaway:', err);
      return { id: 1 };
    }
  },

  getActiveGiveaways: () => {
    try {
      return db.prepare?.(`
        SELECT * FROM giveaways WHERE active = 1 AND ends_at <= ?
      `)?.all(Date.now()) || [];
    } catch {
      return [];
    }
  },

  getGiveawayEntries: (giveawayId) => {
    try {
      return db.prepare?.(`
        SELECT * FROM giveaway_entries WHERE giveaway_id = ?
      `)?.all(giveawayId) || [];
    } catch {
      return [];
    }
  },

  enterGiveaway: (giveawayId, userId) => {
    try {
      if (db.prepare) {
        const entry = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').get(giveawayId, userId);
        if (entry) return false;
        db.prepare(`
          INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)
        `).run(giveawayId, userId);
        return true;
      }
      return true;
    } catch {
      return true;
    }
  },

  endGiveaway: (giveawayId, winnerId) => {
    try {
      if (db.prepare) {
        db.prepare('UPDATE giveaways SET active = 0, winner_id = ? WHERE id = ?').run(winnerId, giveawayId);
      }
    } catch {
      return;
    }
  },

  getGlobalStats: () => {
    try {
      const totalUsers = db.prepare?.('SELECT COUNT(DISTINCT user_id) as count FROM levels')?.get()?.count || 0;
      const totalMessages = db.prepare?.('SELECT SUM(messages) as total FROM levels')?.get()?.total || 0;
      const totalXP = db.prepare?.('SELECT SUM(xp) as total FROM levels')?.get()?.total || 0;
      const topLevel = db.prepare?.('SELECT level FROM levels ORDER BY level DESC LIMIT 1')?.get()?.level || 0;

      return { totalUsers, totalMessages, totalXP, topLevel };
    } catch {
      return { totalUsers: 0, totalMessages: 0, totalXP: 0, topLevel: 0 };
    }
  },

  getLevelRole: (guildId, level) => {
    try {
      return db.prepare?.('SELECT role_id FROM level_roles WHERE guild_id = ? AND level = ?')?.get(guildId, level) || null;
    } catch {
      return null;
    }
  }
};
