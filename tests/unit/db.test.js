const { buildDb, GUILD_ID, USER_ID, MOD_ID, CHANNEL_ID } = require('../fixtures/db');

let db;
beforeEach(() => { db = buildDb(); });
afterEach  (() => { db.close(); });

function xpLogic(xp) {
  const XP_PER_LEVEL = 100;
  const leveledUp    = xp >= XP_PER_LEVEL;
  const newLevel     = leveledUp ? 1 : 0;
  const remainXP     = leveledUp ? xp - XP_PER_LEVEL : xp;
  return { leveledUp, newLevel, remainXP };
}

describe('levels — lecturas básicas', () => {
  test('usuario fixture existe en la DB', () => {
    const u = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(GUILD_ID, USER_ID);
    expect(u).toBeTruthy();
    expect(u.username).toBe('TestUser');
    expect(u.level).toBe(1);
    expect(u.xp).toBe(80);
    expect(u.messages).toBe(42);
  });

  test('leaderboard ordena por level DESC, xp DESC', () => {
    const rows = db.prepare('SELECT user_id, level, xp FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC').all(GUILD_ID);
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      const prevScore = prev.level * 10000 + prev.xp;
      const currScore = curr.level * 10000 + curr.xp;
      expect(prevScore).toBeGreaterThanOrEqual(currScore);
    }
  });

  test('total de usuarios en el guild es correcto', () => {
    const c = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?').get(GUILD_ID)?.c;
    expect(c).toBe(6);
  });

  test('upsert de usuario nuevo funciona', () => {
    const newUid = '22222222222222222';
    const key    = `${GUILD_ID}_${newUid}`;
    db.prepare('INSERT OR REPLACE INTO levels (key,user_id,guild_id,username,xp,level,messages,last_message) VALUES (?,?,?,?,?,?,?,?)').run(key, newUid, GUILD_ID, 'NewUser', 50, 0, 5, Date.now());
    const u = db.prepare('SELECT * FROM levels WHERE key = ?').get(key);
    expect(u.username).toBe('NewUser');
    expect(u.xp).toBe(50);
  });

  test('rank: COUNT de usuarios con mejor score', () => {
    const u    = db.prepare('SELECT level, xp FROM levels WHERE guild_id = ? AND user_id = ?').get(GUILD_ID, USER_ID);
    const rank = db.prepare('SELECT COUNT(*) as c FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))').get(GUILD_ID, u.level, u.level, u.xp)?.c;
    expect(typeof rank).toBe('number');
    expect(rank).toBeGreaterThanOrEqual(0);
  });
});

describe('XP logic', () => {
  test('no level-up si xp < 100', () => {
    const { leveledUp, newLevel, remainXP } = xpLogic(80);
    expect(leveledUp).toBe(false);
    expect(newLevel).toBe(0);
    expect(remainXP).toBe(80);
  });

  test('level-up cuando xp >= 100', () => {
    const { leveledUp, newLevel, remainXP } = xpLogic(110);
    expect(leveledUp).toBe(true);
    expect(newLevel).toBe(1);
    expect(remainXP).toBe(10);
  });

  test('xp exacto en 100 provoca level-up', () => {
    const { leveledUp } = xpLogic(100);
    expect(leveledUp).toBe(true);
  });

  test('xp residual es correcto en múltiples casos', () => {
    expect(xpLogic(150).remainXP).toBe(50);
    expect(xpLogic(200).remainXP).toBe(100);
  });
});

describe('guild_config — lectura y escritura', () => {
  test('config fixture existe', () => {
    const c = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(GUILD_ID);
    expect(c).toBeTruthy();
    expect(c.level_channel).toBe(CHANNEL_ID);
    expect(c.log_channel).toBeNull();
  });

  test('UPDATE cambia solo los campos especificados', () => {
    db.prepare('UPDATE guild_config SET log_channel = ? WHERE guild_id = ?').run(CHANNEL_ID, GUILD_ID);
    const c = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(GUILD_ID);
    expect(c.level_channel).toBe(CHANNEL_ID);
    expect(c.log_channel).toBe(CHANNEL_ID);
  });

  test('se puede insertar config para nuevo guild', () => {
    const newGuild = '77777777777777777';
    db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(newGuild);
    const c = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(newGuild);
    expect(c.guild_id).toBe(newGuild);
    expect(c.level_channel).toBeNull();
  });

  test('INSERT OR IGNORE no sobreescribe config existente', () => {
    db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)').run(GUILD_ID);
    const c = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(GUILD_ID);
    expect(c.level_channel).toBe(CHANNEL_ID);
  });
});

describe('mod_logs — lecturas y escrituras', () => {
  test('fixture tiene 2 logs para el usuario', () => {
    const logs = db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ?').all(GUILD_ID, USER_ID);
    expect(logs.length).toBe(2);
  });

  test('filtra correctamente por type=ban', () => {
    const bans = db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND type = ?').all(GUILD_ID, 'ban');
    expect(bans.length).toBe(1);
    expect(bans[0].reason).toBe('Reincidencia');
  });

  test('filtra correctamente por type=warn', () => {
    const warns = db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND type = ?').all(GUILD_ID, 'warn');
    expect(warns.length).toBe(1);
    expect(warns[0].moderator_id).toBe(MOD_ID);
  });

  test('INSERT de nuevo log persiste', () => {
    db.prepare('INSERT INTO mod_logs (guild_id,type,user_id,moderator_id,reason) VALUES (?,?,?,?,?)').run(GUILD_ID, 'kick', USER_ID, MOD_ID, 'Test kick');
    const logs = db.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ?').all(GUILD_ID, USER_ID);
    expect(logs.length).toBe(3);
  });

  test('COUNT total retorna entero', () => {
    const total = db.prepare('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?').get(GUILD_ID)?.c;
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBeGreaterThan(0);
  });

  test('breakdown GROUP BY type es correcto', () => {
    const breakdown = db.prepare('SELECT type, COUNT(*) as count FROM mod_logs WHERE guild_id = ? GROUP BY type ORDER BY count DESC').all(GUILD_ID);
    expect(breakdown.length).toBe(2);
    const types = breakdown.map(b => b.type);
    expect(types).toContain('ban');
    expect(types).toContain('warn');
  });
});

describe('giveaways — lecturas y entries', () => {
  test('fixture tiene 1 activo y 1 finalizado', () => {
    const active = db.prepare('SELECT COUNT(*) as c FROM giveaways WHERE guild_id = ? AND active = 1').get(GUILD_ID)?.c;
    const ended  = db.prepare('SELECT COUNT(*) as c FROM giveaways WHERE guild_id = ? AND active = 0').get(GUILD_ID)?.c;
    expect(active).toBe(1);
    expect(ended).toBe(1);
  });

  test('el sorteo finalizado tiene winner_id asignado', () => {
    const g = db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND active = 0').get(GUILD_ID);
    expect(g.winner_id).toBe(USER_ID);
  });

  test('enterGiveaway inserta entry única', () => {
    const g = db.prepare('SELECT id FROM giveaways WHERE guild_id = ? AND active = 1').get(GUILD_ID);
    db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?,?)').run(g.id, USER_ID);
    const count = db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(g.id)?.c;
    expect(count).toBe(1);
  });

  test('UNIQUE constraint impide entrada doble', () => {
    const g = db.prepare('SELECT id FROM giveaways WHERE guild_id = ? AND active = 1').get(GUILD_ID);
    db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?,?)').run(g.id, USER_ID);
    expect(() => {
      db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?,?)').run(g.id, USER_ID);
    }).toThrow();
  });

  test('ON DELETE CASCADE borra entries al borrar giveaway', () => {
    const g = db.prepare('SELECT id FROM giveaways WHERE guild_id = ? AND active = 1').get(GUILD_ID);
    db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?,?)').run(g.id, USER_ID);
    db.prepare('DELETE FROM giveaways WHERE id = ?').run(g.id);
    const entries = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?').all(g.id);
    expect(entries.length).toBe(0);
  });

  test('endGiveaway actualiza active y winner_id', () => {
    const g = db.prepare('SELECT id FROM giveaways WHERE guild_id = ? AND active = 1').get(GUILD_ID);
    db.prepare('UPDATE giveaways SET active = 0, winner_id = ? WHERE id = ?').run(USER_ID, g.id);
    const updated = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(g.id);
    expect(updated.active).toBe(0);
    expect(updated.winner_id).toBe(USER_ID);
  });
});

describe('reminders — due_at y sent flag', () => {
  test('inserta y recupera reminder pendiente', () => {
    db.prepare('INSERT INTO reminders (user_id,channel_id,guild_id,message,due_at) VALUES (?,?,?,?,?)').run(USER_ID, CHANNEL_ID, GUILD_ID, 'Test reminder', Date.now() - 1000);
    const due = db.prepare('SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?').all(Date.now());
    expect(due.length).toBe(1);
    expect(due[0].message).toBe('Test reminder');
  });

  test('markSent excluye el reminder de pendientes', () => {
    db.prepare('INSERT INTO reminders (user_id,channel_id,guild_id,message,due_at) VALUES (?,?,?,?,?)').run(USER_ID, CHANNEL_ID, GUILD_ID, 'Mark me', Date.now() - 1000);
    const r = db.prepare('SELECT id FROM reminders WHERE sent = 0').get();
    db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(r.id);
    const due = db.prepare('SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?').all(Date.now());
    expect(due.length).toBe(0);
  });

  test('reminders futuros no aparecen en due', () => {
    db.prepare('INSERT INTO reminders (user_id,channel_id,guild_id,message,due_at) VALUES (?,?,?,?,?)').run(USER_ID, CHANNEL_ID, GUILD_ID, 'Future', Date.now() + 9999999);
    const due = db.prepare('SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?').all(Date.now());
    expect(due.length).toBe(0);
  });
});
