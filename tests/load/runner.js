const autocannon = require('autocannon');
const express    = require('express');
const http       = require('http');
const { buildDb, GUILD_ID, USER_ID } = require('../fixtures/db');
const { securityHeaders, sanitizeQuery } = require('../../security');
const { cache } = require('../../cache');

const SCENARIOS = [
  {
    title:       'GET /health — Healthcheck endpoint',
    path:        '/health',
    connections: 50,
    duration:    10,
    expectP99:   50,
  },
  {
    title:       'GET /api/guild/:id/stats — Cached stats',
    path:        `/api/guild/${GUILD_ID}/stats`,
    connections: 30,
    duration:    10,
    expectP99:   100,
  },
  {
    title:       'GET /api/guild/:id/leaderboard — Paginated leaderboard',
    path:        `/api/guild/${GUILD_ID}/leaderboard?limit=20&offset=0`,
    connections: 20,
    duration:    10,
    expectP99:   150,
  },
  {
    title:       'GET /api/guild/:id/mod-logs — Mod log list',
    path:        `/api/guild/${GUILD_ID}/mod-logs`,
    connections: 20,
    duration:    10,
    expectP99:   150,
  },
  {
    title:       'GET /api/guild/:id/user/:uid/profile — User profile',
    path:        `/api/guild/${GUILD_ID}/user/${USER_ID}/profile`,
    connections: 20,
    duration:    10,
    expectP99:   100,
  },
];

function buildTestApp(db) {
  const app = express();
  app.use(express.json());
  app.use(securityHeaders);
  app.use(sanitizeQuery);

  app.get('/health', (_, res) => res.json({ status: 'ok' }));

  const authBypass = (req, res, next) => next();

  app.get(`/api/guild/:guildId/stats`, authBypass, (req, res) => {
    const { guildId } = req.params;
    const hit = cache.get(`load:stats:${guildId}`);
    if (hit) return res.json(hit);
    const data = {
      guildId,
      users:    db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0,
      modLogs:  db.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(guildId)?.c ?? 0,
      modBreakdown: [],
    };
    cache.set(`load:stats:${guildId}`, data, 60_000);
    res.json(data);
  });

  app.get('/api/guild/:guildId/leaderboard', authBypass, (req, res) => {
    const { guildId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit  ?? '20', 10), 100);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const key    = `load:lb:${guildId}:${limit}:${offset}`;
    const hit    = cache.get(key);
    if (hit) return res.json(hit);
    const rows  = db.prepare('SELECT user_id,username,xp,level FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?').all(guildId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(guildId)?.c ?? 0;
    const data  = { leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, ...r })), total };
    cache.set(key, data, 30_000);
    res.json(data);
  });

  app.get('/api/guild/:guildId/mod-logs', authBypass, (req, res) => {
    const { guildId } = req.params;
    const logs  = db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 20').all(guildId);
    const total = db.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(guildId)?.c ?? 0;
    res.json({ logs, total });
  });

  app.get('/api/guild/:guildId/user/:userId/profile', authBypass, (req, res) => {
    const { guildId, userId } = req.params;
    const key = `load:profile:${guildId}:${userId}`;
    const hit = cache.get(key);
    if (hit) return res.json(hit);
    const user = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    cache.set(key, user, 45_000);
    res.json(user);
  });

  return app;
}

function fmt(n)  { return n?.toFixed(2) ?? '—'; }
function pad(s, w) { return String(s).padEnd(w); }

async function runScenario(server, s) {
  const result = await autocannon({
    url:         `http://127.0.0.1:${server.address().port}${s.path}`,
    connections: s.connections,
    duration:    s.duration,
    pipelining:  1,
    headers:     { Authorization: 'Bearer test-token' },
  });

  const p99    = result.latency.p99;
  const rps    = result.requests.average;
  const errors = result.errors;
  const passed = p99 <= s.expectP99 && errors === 0;

  console.log(`\n${passed ? '✅' : '❌'} ${s.title}`);
  console.log(`   ${pad('Req/s:',        14)} ${fmt(rps)}`);
  console.log(`   ${pad('Latencia p50:',14)} ${fmt(result.latency.p50)} ms`);
  console.log(`   ${pad('Latencia p99:',14)} ${fmt(p99)} ms  (límite: ${s.expectP99} ms)`);
  console.log(`   ${pad('Errores:',      14)} ${errors}`);
  console.log(`   ${pad('2xx:',          14)} ${result['2xx']}`);

  return { title: s.title, rps, p99, errors, passed };
}

async function main() {
  const db     = buildDb();
  const server = http.createServer(buildTestApp(db));
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  console.log('╔══════════════════════════════════════════╗');
  console.log('║     AURORE — LOAD TEST SUITE             ║');
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`   Servidor: 127.0.0.1:${server.address().port}`);
  console.log(`   Escenarios: ${SCENARIOS.length}\n`);

  const results = [];
  for (const s of SCENARIOS) {
    results.push(await runScenario(server, s));
  }

  const passed = results.filter(r => r.passed).length;
  console.log('\n──────────────────────────────────────────');
  console.log(`   Resultado: ${passed}/${results.length} escenarios OK`);

  const failed = results.filter(r => !r.passed);
  if (failed.length) {
    console.log('\n   Fallidos:');
    for (const f of failed) {
      console.log(`   ❌ ${f.title}  p99=${fmt(f.p99)}ms  errors=${f.errors}`);
    }
  }
  console.log('──────────────────────────────────────────\n');

  server.close();
  db.close();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
