const express    = require('express');
const request    = require('supertest');
const { buildDb, GUILD_ID, USER_ID, MOD_ID, CHANNEL_ID } = require('../fixtures/db');
const { sanitizeQuery, sanitizeBody, securityHeaders, limiters, validateSnowflake } = require('../../security');
const { cache } = require('../../cache');

let app, db;

function buildApp(overrideDb) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(securityHeaders);
  app.use(sanitizeQuery);

  const VALID_GUILDS = [{ id: GUILD_ID, permissions: String(0x8) }];

  function fakeSession(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer valid-token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req._guilds = VALID_GUILDS;
    next();
  }

  function fakeAdmin(req, res, next) {
    const guild = VALID_GUILDS.find(g => g.id === req.params.guildId);
    if (!guild) return res.status(403).json({ error: 'Forbidden' });
    next();
  }

  function fakeInternal(req, res, next) {
    if (req.headers['x-internal-token'] !== 'test-token') return res.status(403).json({ error: 'Forbidden' });
    next();
  }

  app.get('/health', (_, res) => res.json({ status: 'ok', cache: cache.stats() }));

  const guild = express.Router({ mergeParams: true });
  guild.use(fakeSession, validateSnowflake('guildId'), fakeAdmin);

  guild.get('/stats', (req, res) => {
    const { guildId } = req.params;
    const users   = overrideDb.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const modLogs = overrideDb.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(guildId)?.c ?? 0;
    res.json({ guildId, users, modLogs, modBreakdown: [] });
  });

  guild.get('/leaderboard', (req, res) => {
    const { guildId } = req.params;
    const limit  = parseInt(req.query.limit  ?? '10', 10);
    const offset = parseInt(req.query.offset ?? '0',  10);
    const rows   = overrideDb.prepare('SELECT user_id,username,xp,level,messages FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(guildId, limit, offset);
    const total  = overrideDb.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    res.json({ leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, userId: r.user_id, username: r.username, level: r.level, xp: r.xp })), total });
  });

  guild.get('/user/:userId/profile', validateSnowflake('userId'), (req, res) => {
    const { guildId, userId } = req.params;
    const user = overrideDb.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const mod = overrideDb.prepare('SELECT type FROM mod_logs WHERE guild_id = ? AND user_id = ?').all(guildId, userId);
    res.json({ userId, username: user.username, level: user.level, xp: user.xp, rank: 1, xpForNext: 100, warnings: mod.filter(m => m.type === 'warn').length, modHistory: mod });
  });

  guild.get('/mod-logs', (req, res) => {
    const { guildId } = req.params;
    const limit  = parseInt(req.query.limit  ?? '20', 10);
    const offset = parseInt(req.query.offset ?? '0',  10);
    const type   = req.query.type ?? '';
    const VALID  = ['ban','kick','warn','timeout','mute','unmute','unban'];
    if (type && !VALID.includes(type)) return res.status(400).json({ error: 'Invalid type filter' });
    const params = [guildId];
    let where = 'WHERE guild_id = ?';
    if (type) { where += ' AND type = ?'; params.push(type); }
    const logs  = overrideDb.prepare(`SELECT * FROM mod_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = overrideDb.prepare(`SELECT COUNT(*) as c FROM mod_logs ${where}`).get(...params)?.c ?? 0;
    res.json({ logs, total });
  });

  guild.get('/giveaways', (req, res) => {
    const { guildId } = req.params;
    const status = req.query.status ?? '';
    if (status && !['active','ended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    let where = 'WHERE guild_id = ?'; const params = [guildId];
    if (status === 'active') { where += ' AND active = 1'; }
    else if (status === 'ended') { where += ' AND active = 0'; }
    res.json({ giveaways: overrideDb.prepare(`SELECT * FROM giveaways ${where}`).all(...params) });
  });

  guild.get('/config', fakeInternal, (req, res) => {
    const c = overrideDb.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(req.params.guildId);
    res.json(c ?? { guild_id: req.params.guildId });
  });

  guild.patch('/config', sanitizeBody, fakeInternal, (req, res) => {
    const { guildId } = req.params;
    const { level_channel, log_channel, welcome_channel } = req.body ?? {};
    const toV = v => (v === '' || v == null) ? null : v;
    const ex = overrideDb.prepare('SELECT guild_id FROM guild_config WHERE guild_id = ?').get(guildId);
    if (ex) {
      const sets = [], vals = [];
      if (level_channel   !== undefined) { sets.push('level_channel = ?');   vals.push(toV(level_channel)); }
      if (log_channel     !== undefined) { sets.push('log_channel = ?');     vals.push(toV(log_channel)); }
      if (welcome_channel !== undefined) { sets.push('welcome_channel = ?'); vals.push(toV(welcome_channel)); }
      if (sets.length) overrideDb.prepare(`UPDATE guild_config SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals, guildId);
    } else {
      overrideDb.prepare('INSERT INTO guild_config (guild_id,level_channel,log_channel,welcome_channel) VALUES (?,?,?,?)').run(guildId, toV(level_channel), toV(log_channel), toV(welcome_channel));
    }
    res.json(overrideDb.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId));
  });

  app.use('/api/guild/:guildId', guild);
  app.use((err, req, res, _) => res.status(500).json({ error: err.message }));
  return app;
}

beforeEach(() => { db = buildDb(); cache.store.clear(); app = buildApp(db); });
afterEach(() => { db.close(); });

const AUTH = { Authorization: 'Bearer valid-token' };
const INT  = { 'x-internal-token': 'test-token' };

describe('GET /health', () => {
  test('200 con status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/guild/:guildId/stats', () => {
  test('200 con datos de guild real', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/stats`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.guildId).toBe(GUILD_ID);
    expect(res.body.users).toBeGreaterThan(0);
    expect(res.body.modLogs).toBeGreaterThan(0);
  });

  test('401 sin token', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/stats`);
    expect(res.status).toBe(401);
  });

  test('400 con guildId inválido', async () => {
    const res = await request(app).get('/api/guild/not-a-snowflake/stats').set(AUTH);
    expect(res.status).toBe(400);
  });

  test('403 con guild desconocido', async () => {
    const res = await request(app).get('/api/guild/99999999999999999/stats').set(AUTH);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/guild/:guildId/leaderboard', () => {
  test('200 con lista paginada', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/leaderboard?limit=3&offset=0`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard.length).toBeLessThanOrEqual(3);
    expect(typeof res.body.total).toBe('number');
  });

  test('los rangos son correctos', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/leaderboard?limit=10&offset=0`).set(AUTH);
    expect(res.body.leaderboard[0].rank).toBe(1);
  });

  test('paginación con offset', async () => {
    const p1 = await request(app).get(`/api/guild/${GUILD_ID}/leaderboard?limit=2&offset=0`).set(AUTH);
    const p2 = await request(app).get(`/api/guild/${GUILD_ID}/leaderboard?limit=2&offset=2`).set(AUTH);
    const ids1 = p1.body.leaderboard.map(u => u.userId);
    const ids2 = p2.body.leaderboard.map(u => u.userId);
    expect(ids1).not.toEqual(expect.arrayContaining(ids2));
  });
});

describe('GET /api/guild/:guildId/user/:userId/profile', () => {
  test('200 para usuario existente', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/user/${USER_ID}/profile`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(USER_ID);
    expect(res.body.username).toBe('TestUser');
    expect(typeof res.body.level).toBe('number');
    expect(typeof res.body.warnings).toBe('number');
  });

  test('404 para usuario inexistente', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/user/11111111111111111/profile`).set(AUTH);
    expect(res.status).toBe(404);
  });

  test('400 para userId inválido', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/user/invalid-id/profile`).set(AUTH);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/guild/:guildId/mod-logs', () => {
  test('200 con lista y total', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/mod-logs`).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('filtra por type=ban correctamente', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/mod-logs?type=ban`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.logs.every(l => l.type === 'ban')).toBe(true);
  });

  test('400 para type inválido', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/mod-logs?type=drop_table`).set(AUTH);
    expect(res.status).toBe(400);
  });

  test('responde lista vacía para guild sin logs', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/mod-logs?type=mute`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(0);
  });
});

describe('GET /api/guild/:guildId/giveaways', () => {
  test('200 con lista de sorteos', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/giveaways`).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.giveaways)).toBe(true);
    expect(res.body.giveaways.length).toBe(2);
  });

  test('filtra activos correctamente', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/giveaways?status=active`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.giveaways.every(g => g.active === 1)).toBe(true);
  });

  test('filtra finalizados correctamente', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/giveaways?status=ended`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.giveaways.every(g => g.active === 0)).toBe(true);
  });

  test('400 para status inválido', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/giveaways?status=hack`).set(AUTH);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/guild/:guildId/config', () => {
  test('200 con token interno', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/config`).set(AUTH).set(INT);
    expect(res.status).toBe(200);
    expect(res.body.guild_id).toBe(GUILD_ID);
  });

  test('403 sin token interno', async () => {
    const res = await request(app).get(`/api/guild/${GUILD_ID}/config`).set(AUTH);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/guild/:guildId/config', () => {
  test('actualiza level_channel con snowflake válido', async () => {
    const res = await request(app)
      .patch(`/api/guild/${GUILD_ID}/config`)
      .set(AUTH).set(INT)
      .send({ level_channel: CHANNEL_ID });
    expect(res.status).toBe(200);
    expect(res.body.level_channel).toBe(CHANNEL_ID);
  });

  test('acepta null para borrar canal', async () => {
    const res = await request(app)
      .patch(`/api/guild/${GUILD_ID}/config`)
      .set(AUTH).set(INT)
      .send({ level_channel: null });
    expect(res.status).toBe(200);
    expect(res.body.level_channel).toBeNull();
  });

  test('400 para channel ID inválido', async () => {
    const res = await request(app)
      .patch(`/api/guild/${GUILD_ID}/config`)
      .set(AUTH).set(INT)
      .send({ level_channel: 'DROP TABLE guild_config;' });
    expect(res.status).toBe(400);
  });

  test('ignora campos no permitidos', async () => {
    const res = await request(app)
      .patch(`/api/guild/${GUILD_ID}/config`)
      .set(AUTH).set(INT)
      .send({ level_channel: null, evil: 'payload' });
    expect(res.status).toBe(200);
    expect(res.body.evil).toBeUndefined();
  });
});

describe('Security headers', () => {
  test('todos los endpoints incluyen headers de seguridad', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});
