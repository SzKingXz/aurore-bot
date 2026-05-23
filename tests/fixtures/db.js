const Database = require('better-sqlite3');

const GUILD_ID  = '111122223333444455';
const USER_ID   = '555566667777888899';
const MOD_ID    = '999900001111222233';
const CHANNEL_ID= '444433332222111100';

function buildDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE levels (
      key TEXT PRIMARY KEY, user_id TEXT NOT NULL, guild_id TEXT NOT NULL,
      username TEXT DEFAULT 'Unknown', xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0, messages INTEGER DEFAULT 0, last_message INTEGER DEFAULT 0
    );
    CREATE INDEX idx_levels_ranking ON levels(guild_id, level DESC, xp DESC);

    CREATE TABLE guild_config (
      guild_id TEXT PRIMARY KEY, level_channel TEXT, log_channel TEXT, welcome_channel TEXT
    );

    CREATE TABLE mod_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
      type TEXT NOT NULL, user_id TEXT, moderator_id TEXT, reason TEXT,
      timestamp INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
    );
    CREATE INDEX idx_modlogs_guild ON mod_logs(guild_id);

    CREATE TABLE giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
      channel_id TEXT, message_id TEXT, prize TEXT NOT NULL,
      ends_at INTEGER, active INTEGER DEFAULT 1, winner_id TEXT, imagen TEXT
    );

    CREATE TABLE giveaway_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL, UNIQUE(giveaway_id, user_id)
    );

    CREATE TABLE level_roles (
      guild_id TEXT NOT NULL, level INTEGER NOT NULL, role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    );

    CREATE TABLE reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, channel_id TEXT NOT NULL,
      guild_id TEXT NOT NULL, message TEXT NOT NULL, due_at INTEGER NOT NULL, sent INTEGER DEFAULT 0
    );

    CREATE TABLE command_stats (
      guild_id TEXT NOT NULL, command TEXT NOT NULL, uses INTEGER DEFAULT 1,
      last_used INTEGER, PRIMARY KEY (guild_id, command)
    );
  `);

  db.prepare('INSERT INTO levels (key,user_id,guild_id,username,xp,level,messages,last_message) VALUES (?,?,?,?,?,?,?,?)')
    .run(`${GUILD_ID}_${USER_ID}`, USER_ID, GUILD_ID, 'TestUser', 80, 1, 42, Date.now() - 10000);

  for (let i = 1; i <= 5; i++) {
    const uid = String(10000000000000000 + i).padStart(18, '0');
    db.prepare('INSERT INTO levels (key,user_id,guild_id,username,xp,level,messages) VALUES (?,?,?,?,?,?,?)')
      .run(`${GUILD_ID}_${uid}`, uid, GUILD_ID, `User${i}`, i * 20, i, i * 10);
  }

  db.prepare('INSERT INTO guild_config (guild_id,level_channel,log_channel) VALUES (?,?,?)')
    .run(GUILD_ID, CHANNEL_ID, null);

  db.prepare('INSERT INTO mod_logs (guild_id,type,user_id,moderator_id,reason) VALUES (?,?,?,?,?)')
    .run(GUILD_ID, 'warn', USER_ID, MOD_ID, 'Comportamiento inadecuado');
  db.prepare('INSERT INTO mod_logs (guild_id,type,user_id,moderator_id,reason) VALUES (?,?,?,?,?)')
    .run(GUILD_ID, 'ban',  USER_ID, MOD_ID, 'Reincidencia');

  db.prepare('INSERT INTO giveaways (guild_id,channel_id,message_id,prize,ends_at,active) VALUES (?,?,?,?,?,?)')
    .run(GUILD_ID, CHANNEL_ID, '123456789012345678', 'Nitro x1', Math.floor(Date.now() / 1000) + 3600, 1);
  db.prepare('INSERT INTO giveaways (guild_id,channel_id,message_id,prize,ends_at,active,winner_id) VALUES (?,?,?,?,?,?,?)')
    .run(GUILD_ID, CHANNEL_ID, '987654321098765432', 'Discord Merch', Math.floor(Date.now() / 1000) - 100, 0, USER_ID);

  return db;
}

module.exports = { buildDb, GUILD_ID, USER_ID, MOD_ID, CHANNEL_ID };
