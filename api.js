const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'aurore.db');

let rodb, wrdb;
function getDb()  { if (!rodb || !rodb.open) rodb = new Database(DB_PATH, { readonly: true });  return rodb; }
function getWrDb(){ if (!wrdb || !wrdb.open) wrdb = new Database(DB_PATH); return wrdb; }

function wrap(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }

function internal(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (!process.env.INTERNAL_TOKEN || token !== process.env.INTERNAL_TOKEN)
    return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = function startAPI(client) {
  const app = express();

  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-internal-token'],
  }));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

  app.get('/api/bot/stats', wrap((req, res) => {
    const db = getDb();
    res.json({
      guilds:     db.prepare('SELECT COUNT(DISTINCT guild_id) as c FROM levels').get()?.c ?? 0,
      users:      db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM levels').get()?.c ?? 0,
      modActions: db.prepare('SELECT COUNT(*) as c FROM mod_logs').get()?.c ?? 0,
      giveaways:  db.prepare('SELECT COUNT(*) as c FROM giveaways').get()?.c ?? 0,
      wsLatency:  client?.ws?.ping ?? null,
      uptime:     process.uptime(),
      memoryMB:   Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp:  Date.now(),
    });
  }));

  app.get('/api/leaderboard', wrap((req, res) => {
    const db = getDb();
    const limit   = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset  = parseInt(req.query.offset) || 0;
    const guildId = req.query.guildId;
    const params  = [];
    let query = 'SELECT user_id, guild_id, username, xp, level, messages FROM levels';
    if (guildId) { query += ' WHERE guild_id = ?'; params.push(guildId); }
    query += ' ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const rows  = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as c FROM levels${guildId ? ' WHERE guild_id = ?' : ''}`).get(...(guildId ? [guildId] : []))?.c ?? 0;
    res.json({
      leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, userId: r.user_id, username: r.username, level: r.level, xp: r.xp, messages: r.messages, xpForNext: 100 })),
      total, limit, offset,
    });
  }));

  app.get('/api/guild/:guildId/stats', wrap((req, res) => {
    const { guildId } = req.params;
    const db = getDb();
    const users   = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const xp      = db.prepare('SELECT SUM(xp) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const msgs    = db.prepare('SELECT SUM(messages) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const modLogs = db.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const topUser = db.prepare('SELECT user_id, username, level, xp FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 1').get(guildId) ?? null;
    const modBreakdown = db.prepare(`
      SELECT type, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY type ORDER BY count DESC
    `).all(guildId);
    res.json({ guildId, users, totalXP: xp, totalMessages: msgs, modLogs, topUser, modBreakdown });
  }));

  app.get('/api/guild/:guildId/leaderboard', wrap((req, res) => {
    const { guildId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    const db = getDb();
    const rows  = db.prepare('SELECT user_id, username, xp, level, messages FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(guildId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    res.json({
      leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, userId: r.user_id, username: r.username, level: r.level, xp: r.xp, messages: r.messages, xpForNext: 100 })),
      total, limit, offset,
    });
  }));

  app.get('/api/guild/:guildId/user/:userId/profile', wrap((req, res) => {
    const { guildId, userId } = req.params;
    const db = getDb();
    const user = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const rank = (db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))').get(guildId, user.level, user.level, user.xp)?.c ?? 0) + 1;
    const modHistory = db.prepare('SELECT type, reason, moderator_id, timestamp FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 10').all(guildId, userId);
    const warnings = modHistory.filter(l => l.type === 'warn').length;
    res.json({ guildId, userId, username: user.username, level: user.level, xp: user.xp, messages: user.messages, rank, xpForNext: 100, warnings, modHistory });
  }));

  app.get('/api/guild/:guildId/mod-logs', wrap((req, res) => {
    const { guildId } = req.params;
    const limit   = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset  = parseInt(req.query.offset) || 0;
    const type    = req.query.type;
    const search  = req.query.search;
    const db = getDb();
    const params = [guildId];
    let where = 'WHERE guild_id = ?';
    if (type)   { where += ' AND type = ?';    params.push(type); }
    if (search) { where += ' AND (user_id = ? OR moderator_id = ?)'; params.push(search, search); }
    const rows  = db.prepare(`SELECT * FROM mod_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as c FROM mod_logs ${where}`).get(...params)?.c ?? 0;
    const breakdown = db.prepare(`SELECT type, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY type`).all(guildId);
    const topMods   = db.prepare(`SELECT moderator_id, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY moderator_id ORDER BY count DESC LIMIT 5`).all(guildId);
    res.json({ guildId, logs: rows, total, limit, offset, breakdown, topMods });
  }));

  app.get('/api/guild/:guildId/giveaways', wrap((req, res) => {
    const { guildId } = req.params;
    const status = req.query.status;
    const db = getDb();
    let where = 'WHERE guild_id = ?';
    const params = [guildId];
    if (status === 'active') { where += ' AND active = 1'; }
    else if (status === 'ended') { where += ' AND active = 0'; }
    const rows = db.prepare(`SELECT * FROM giveaways ${where} ORDER BY ends_at DESC`).all(...params);
    const enriched = rows.map(g => ({
      ...g,
      participants: db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(g.id)?.c ?? 0,
    }));
    res.json({ guildId, giveaways: enriched, total: enriched.length });
  }));

  app.get('/api/guild/:guildId/config', internal, wrap((req, res) => {
    const { guildId } = req.params;
    const db = getDb();
    const config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId) ?? { guild_id: guildId };
    const levelRoles = db.prepare('SELECT level, role_id FROM level_roles WHERE guild_id = ? ORDER BY level ASC').all(guildId);
    res.json({ ...config, levelRoles });
  }));

  app.patch('/api/guild/:guildId/config', internal, wrap((req, res) => {
    const { guildId } = req.params;
    const { level_channel, log_channel, welcome_channel } = req.body ?? {};
    const db = getWrDb();
    const existing = db.prepare('SELECT guild_id FROM guild_config WHERE guild_id = ?').get(guildId);
    if (existing) {
      const sets = [], vals = [];
      if (level_channel   !== undefined) { sets.push('level_channel = ?');   vals.push(level_channel   || null); }
      if (log_channel     !== undefined) { sets.push('log_channel = ?');     vals.push(log_channel     || null); }
      if (welcome_channel !== undefined) { sets.push('welcome_channel = ?'); vals.push(welcome_channel || null); }
      if (sets.length) db.prepare(`UPDATE guild_config SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals, guildId);
    } else {
      db.prepare('INSERT INTO guild_config (guild_id, level_channel, log_channel, welcome_channel) VALUES (?, ?, ?, ?)').run(guildId, level_channel || null, log_channel || null, welcome_channel || null);
    }
    const updated = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    res.json(updated);
  }));

  app.get('/api/guild/:guildId/channels', internal, wrap((req, res) => {
    const { guildId } = req.params;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not in cache' });
    const channels = guild.channels.cache
      .filter(c => c.type === 0)
      .map(c => ({ id: c.id, name: c.name, parentName: c.parent?.name ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  }));

  app.get('/api/guild/:guildId/roles', internal, wrap((req, res) => {
    const { guildId } = req.params;
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not in cache' });
    const roles = guild.roles.cache
      .filter(r => !r.managed && r.id !== guild.id)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
      .sort((a, b) => b.position - a.position);
    res.json({ roles });
  }));

  app.use((err, req, res, _next) => {
    console.error('[API]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`[API] Running on port ${PORT}`));
  return app;
};
