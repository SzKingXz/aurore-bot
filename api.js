const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { WebSocketServer } = require('ws');
const path       = require('path');
const Database   = require('better-sqlite3');
const { cache, cached, TTL } = require('./cache');
const {
  limiters, validateSnowflake, sanitizeQuery, sanitizeBody,
  securityHeaders, sanitizeInt, sanitizeString, isValidSnowflake, getIP,
} = require('./security');

const DB_PATH = path.join(__dirname, 'aurore.db');
let rodb, wrdb;
function getDb()   { if (!rodb?.open) rodb = new Database(DB_PATH, { readonly: true }); return rodb; }
function getWrDb() { if (!wrdb?.open) wrdb = new Database(DB_PATH); return wrdb; }

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function internalOnly(req, res, next) {
  const t = req.headers['x-internal-token'];
  if (!process.env.INTERNAL_TOKEN || t !== process.env.INTERNAL_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function requireSession(req, res, next) {
  const raw   = req.headers.cookie ?? '';
  const m     = raw.match(/(?:^|;\s*)aurore_access=([^;]+)/);
  const token = m ? decodeURIComponent(m[1]) : null;
  const bearer = req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null;
  req._accessToken = bearer ?? token ?? null;
  if (!req._accessToken) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  const raw = req.headers.cookie ?? '';
  let guilds = [];
  try { const m = raw.match(/(?:^|;\s*)aurore_guilds=([^;]+)/); if (m) guilds = JSON.parse(decodeURIComponent(m[1])); } catch {}
  const guild = guilds.find(g => g.id === req.params.guildId);
  if (!guild) return res.status(403).json({ error: 'Forbidden: not in this guild' });
  const p = BigInt(guild.permissions ?? 0);
  if ((p & 0x8n) === 0n && (p & 0x20n) === 0n) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  req._guild = guild;
  next();
}

function requireMod(client) {
  return async (req, res, next) => {
    const raw = req.headers.cookie ?? '';
    let userObj = null;
    try { const m = raw.match(/(?:^|;\s*)aurore_user=([^;]+)/); if (m) userObj = JSON.parse(decodeURIComponent(m[1])); } catch {}
    if (!userObj?.id) return requireAdmin(req, res, next);
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return requireAdmin(req, res, next);
    const member = await guild.members.fetch(userObj.id).catch(() => null);
    if (!member) return res.status(403).json({ error: 'Forbidden: not a member' });
    const p = member.permissions.bitfield;
    if ((p & (0x4n | 0x2n | 0x8n | 0x10000000n)) === 0n) return res.status(403).json({ error: 'Forbidden: requires mod permissions' });
    req._member = member;
    next();
  };
}

const guildClients = new Map();
function broadcast(guildId, data) {
  const clients = guildClients.get(String(guildId));
  if (!clients?.size) return;
  const msg = JSON.stringify(data);
  for (const ws of clients) { if (ws.readyState === 1) ws.send(msg); }
}

module.exports = function startAPI(client) {
  const app    = express();
  const server = http.createServer(app);
  const wss    = new WebSocketServer({ server, path: '/ws' });
  const wsConns = new Map();

  wss.on('connection', (ws, req) => {
    const url     = new URL(req.url, `http://${req.headers.host}`);
    const guildId = sanitizeString(url.searchParams.get('guildId') ?? '', 25);
    if (!isValidSnowflake(guildId)) { ws.close(4000, 'Invalid guildId'); return; }
    const ip = getIP(req);
    wsConns.set(ip, (wsConns.get(ip) ?? 0) + 1);
    if (wsConns.get(ip) > 5) { ws.close(4029, 'Too many connections'); return; }
    if (!guildClients.has(guildId)) guildClients.set(guildId, new Set());
    guildClients.get(guildId).add(ws);
    ws.on('close', () => { guildClients.get(guildId)?.delete(ws); wsConns.set(ip, Math.max(0, (wsConns.get(ip) ?? 1) - 1)); });
    ws.on('error', () => ws.close());
  });

  global.auroreBroadcast = broadcast;

  app.set('trust proxy', 1);
  app.use(cors({ origin: (process.env.ALLOWED_ORIGINS?.split(',') ?? []).map(o => o.trim()), methods: ['GET','PATCH','POST'], allowedHeaders: ['Content-Type','Authorization','x-internal-token'], credentials: true }));
  app.use(express.json({ limit: '50kb' }));
  app.use(securityHeaders);
  app.use(limiters.global.middleware());
  app.use(sanitizeQuery);

  app.get('/health', (_, res) => res.json({ status: 'ok', cache: cache.stats(), timestamp: Date.now() }));

  app.get('/api/bot/stats', requireSession, wrap(async (req, res) => {
    const data = await cached('bot:stats', TTL.stats, () => {
      const db = getDb();
      return {
        guilds:     db.prepare('SELECT COUNT(DISTINCT guild_id) as c FROM levels').get()?.c ?? 0,
        users:      db.prepare('SELECT COUNT(DISTINCT user_id)  as c FROM levels').get()?.c ?? 0,
        modActions: db.prepare('SELECT COUNT(*) as c FROM mod_logs').get()?.c ?? 0,
        giveaways:  db.prepare('SELECT COUNT(*) as c FROM giveaways').get()?.c ?? 0,
        wsLatency:  client?.ws?.ping ?? null,
        uptime:     process.uptime(),
        memoryMB:   Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp:  Date.now(),
      };
    });
    res.json(data);
  }));

  app.get('/api/leaderboard', requireSession, limiters.search.middleware(), wrap(async (req, res) => {
    const limit  = sanitizeInt(req.query.limit,  { min: 1, max: 100, def: 10 });
    const offset = sanitizeInt(req.query.offset, { min: 0, max: 50000, def: 0 });
    const data   = await cached(`lb:global:${limit}:${offset}`, TTL.leaderboard, () => {
      const db   = getDb();
      const rows = db.prepare('SELECT user_id, guild_id, username, xp, level, messages FROM levels ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(limit, offset);
      const total= db.prepare('SELECT COUNT(*) as c FROM levels').get()?.c ?? 0;
      return { leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, userId: r.user_id, username: r.username, level: r.level, xp: r.xp, messages: r.messages, xpForNext: 100 })), total, limit, offset };
    });
    res.json(data);
  }));

  const guild = express.Router({ mergeParams: true });
  guild.use(requireSession, validateSnowflake('guildId'), requireAdmin);

  guild.get('/stats', wrap(async (req, res) => {
    const { guildId } = req.params;
    const data = await cached(`guild:stats:${guildId}`, TTL.stats, () => {
      const db = getDb();
      return {
        guildId,
        users:         db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0,
        totalXP:       db.prepare('SELECT SUM(xp) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0,
        totalMessages: db.prepare('SELECT SUM(messages) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0,
        modLogs:       db.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(guildId)?.c ?? 0,
        topUser:       db.prepare('SELECT user_id, username, level, xp FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 1').get(guildId) ?? null,
        modBreakdown:  db.prepare('SELECT type, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY type ORDER BY count DESC').all(guildId),
      };
    });
    res.json(data);
  }));

  guild.get('/leaderboard', wrap(async (req, res) => {
    const { guildId } = req.params;
    const limit  = sanitizeInt(req.query.limit,  { min: 1, max: 100, def: 10 });
    const offset = sanitizeInt(req.query.offset, { min: 0, max: 50000, def: 0 });
    const data   = await cached(`guild:lb:${guildId}:${limit}:${offset}`, TTL.leaderboard, () => {
      const db    = getDb();
      const rows  = db.prepare('SELECT user_id, username, xp, level, messages FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(guildId, limit, offset);
      const total = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
      return { leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, userId: r.user_id, username: r.username, level: r.level, xp: r.xp, messages: r.messages, xpForNext: 100 })), total, limit, offset };
    });
    res.json(data);
  }));

  guild.get('/users/search', limiters.search.middleware(), wrap(async (req, res) => {
    const { guildId } = req.params;
    const q        = sanitizeString(req.query.q ?? '', 100);
    const minLevel = sanitizeInt(req.query.minLevel, { min: 0, max: 9999, def: 0 });
    const maxLevel = sanitizeInt(req.query.maxLevel, { min: 0, max: 9999, def: 9999 });
    const sortMap  = { level: 'level DESC, xp DESC', xp: 'xp DESC', messages: 'messages DESC' };
    const sort     = sortMap[req.query.sort] ?? sortMap.level;
    const limit    = sanitizeInt(req.query.limit, { min: 1, max: 50, def: 30 });
    const cacheKey = `guild:search:${guildId}:${q}:${minLevel}:${maxLevel}:${sort}:${limit}`;

    const data = await cached(cacheKey, 15_000, () => {
      const db = getDb();
      const params = [guildId];
      let where = 'WHERE guild_id = ?';
      if (q)               { where += ' AND (username LIKE ? OR user_id = ?)'; params.push(`%${q}%`, q); }
      if (minLevel > 0)    { where += ' AND level >= ?'; params.push(minLevel); }
      if (maxLevel < 9999) { where += ' AND level <= ?'; params.push(maxLevel); }
      const rows  = db.prepare(`SELECT user_id, username, xp, level, messages FROM levels ${where} ORDER BY ${sort} LIMIT ?`).all(...params, limit);
      const total = db.prepare(`SELECT COUNT(*) as c FROM levels ${where}`).get(...params)?.c ?? 0;
      return {
        users: rows.map(r => {
          const rank = (db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))').get(guildId, r.level, r.level, r.xp)?.c ?? 0) + 1;
          return { userId: r.user_id, username: r.username, level: r.level, xp: r.xp, messages: r.messages, rank, xpForNext: 100 };
        }),
        total,
      };
    });
    res.json(data);
  }));

  guild.get('/user/:userId/profile', validateSnowflake('userId'), wrap(async (req, res) => {
    const { guildId, userId } = req.params;
    const data = await cached(`guild:profile:${guildId}:${userId}`, TTL.profile, () => {
      const db   = getDb();
      const user = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
      if (!user) return null;
      const rank       = (db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))').get(guildId, user.level, user.level, user.xp)?.c ?? 0) + 1;
      const modHistory = db.prepare('SELECT type, reason, moderator_id, timestamp FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 10').all(guildId, userId);
      return { guildId, userId, username: user.username, level: user.level, xp: user.xp, messages: user.messages, rank, xpForNext: 100, warnings: modHistory.filter(l => l.type === 'warn').length, modHistory };
    });
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  }));

  guild.get('/mod-logs', requireMod(client), wrap(async (req, res) => {
    const { guildId } = req.params;
    const limit  = sanitizeInt(req.query.limit,  { min: 1, max: 100, def: 20 });
    const offset = sanitizeInt(req.query.offset, { min: 0, max: 50000, def: 0 });
    const type   = sanitizeString(req.query.type ?? '', 20);
    const search = sanitizeString(req.query.search ?? '', 25);
    const VALID_TYPES = ['ban','kick','warn','timeout','mute','unmute','unban'];
    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type filter' });
    if (search && !isValidSnowflake(search))  return res.status(400).json({ error: 'Invalid search ID' });

    const cacheKey = `guild:modlogs:${guildId}:${limit}:${offset}:${type}:${search}`;
    const data = await cached(cacheKey, TTL.modLogs, () => {
      const db = getDb();
      const params = [guildId];
      let where = 'WHERE guild_id = ?';
      if (type)   { where += ' AND type = ?'; params.push(type); }
      if (search) { where += ' AND (user_id = ? OR moderator_id = ?)'; params.push(search, search); }
      return {
        guildId,
        logs:      db.prepare(`SELECT * FROM mod_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset),
        total:     db.prepare(`SELECT COUNT(*) as c FROM mod_logs ${where}`).get(...params)?.c ?? 0,
        breakdown: db.prepare('SELECT type, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY type').all(guildId),
        limit, offset,
      };
    });
    res.json(data);
  }));

  guild.get('/giveaways', wrap(async (req, res) => {
    const { guildId } = req.params;
    const status = req.query.status;
    if (status && !['active','ended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const data = await cached(`guild:giveaways:${guildId}:${status ?? 'all'}`, TTL.giveaways, () => {
      const db = getDb();
      let where = 'WHERE guild_id = ?';
      const params = [guildId];
      if (status === 'active') { where += ' AND active = 1'; }
      else if (status === 'ended') { where += ' AND active = 0'; }
      const rows = db.prepare(`SELECT * FROM giveaways ${where} ORDER BY ends_at DESC`).all(...params);
      return {
        guildId,
        giveaways: rows.map(g => ({ ...g, participants: db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(g.id)?.c ?? 0 })),
        total: rows.length,
      };
    });
    res.json(data);
  }));

  guild.get('/config', internalOnly, wrap(async (req, res) => {
    const { guildId } = req.params;
    const data = await cached(`guild:config:${guildId}`, TTL.config, () => {
      const db = getDb();
      return {
        ...(db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId) ?? { guild_id: guildId }),
        levelRoles: db.prepare('SELECT level, role_id FROM level_roles WHERE guild_id = ? ORDER BY level ASC').all(guildId),
      };
    });
    res.json(data);
  }));

  guild.patch('/config', limiters.config.middleware(), internalOnly, sanitizeBody, wrap((req, res) => {
    const { guildId } = req.params;
    const { level_channel, log_channel, welcome_channel } = req.body ?? {};
    const db  = getWrDb();
    const toV = v => (v === '' || v == null) ? null : v;
    const ex  = db.prepare('SELECT guild_id FROM guild_config WHERE guild_id = ?').get(guildId);
    if (ex) {
      const sets = [], vals = [];
      if (level_channel   !== undefined) { sets.push('level_channel = ?');   vals.push(toV(level_channel)); }
      if (log_channel     !== undefined) { sets.push('log_channel = ?');     vals.push(toV(log_channel)); }
      if (welcome_channel !== undefined) { sets.push('welcome_channel = ?'); vals.push(toV(welcome_channel)); }
      if (sets.length) db.prepare(`UPDATE guild_config SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals, guildId);
    } else {
      db.prepare('INSERT INTO guild_config (guild_id, level_channel, log_channel, welcome_channel) VALUES (?, ?, ?, ?)').run(guildId, toV(level_channel), toV(log_channel), toV(welcome_channel));
    }
    cache.del(`guild:config:${guildId}`);
    res.json(db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId));
  }));

  guild.get('/channels', internalOnly, wrap(async (req, res) => {
    const { guildId } = req.params;
    const data = await cached(`guild:channels:${guildId}`, TTL.channels, () => {
      const g = client?.guilds?.cache?.get(guildId);
      if (!g) return null;
      return { channels: g.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name, parentName: c.parent?.name ?? null })).sort((a, b) => a.name.localeCompare(b.name)) };
    });
    if (!data) return res.status(404).json({ error: 'Guild not in cache' });
    res.json(data);
  }));

  app.use('/api/guild/:guildId', guild);

  app.use((err, req, res, _next) => { console.error('[API]', err.message); res.status(500).json({ error: 'Internal server error' }); });
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => console.log(`[API] :${PORT}`));
  return { app, broadcast };
};
