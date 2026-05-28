const SNOWFLAKE_RE = /^\d{17,20}$/;

function isValidSnowflake(id) {
  return typeof id === 'string' && SNOWFLAKE_RE.test(id);
}

function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`;\\]/g, '').slice(0, maxLen).trim();
}

function sanitizeInt(val, { min = 0, max = 10000, def = 0 } = {}) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

class RateLimiter {
  constructor({ windowMs = 60_000, max = 60 } = {}) {
    this.windowMs = windowMs;
    this.max      = max;
    this.store    = new Map();
    setInterval(() => {
      const now = Date.now();
      for (const [k, e] of this.store) {
        if (now - e.reset > this.windowMs * 2) this.store.delete(k);
      }
    }, this.windowMs * 2).unref();
  }

  middleware() {
    return (req, res, next) => {
      const key = getIP(req);
      const now = Date.now();
      if (!this.store.has(key)) this.store.set(key, { count: 0, reset: now });
      const e = this.store.get(key);
      if (now - e.reset > this.windowMs) { e.count = 0; e.reset = now; }
      e.count++;
      const remaining = Math.max(0, this.max - e.count);
      const resetSec  = Math.ceil((e.reset + this.windowMs - now) / 1000);
      res.setHeader('X-RateLimit-Limit',     this.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset',     resetSec);
      if (e.count > this.max) {
        res.setHeader('Retry-After', resetSec);
        return res.status(429).json({ error: 'Too many requests', retryAfter: resetSec });
      }
      next();
    };
  }
}

const limiters = {
  global: new RateLimiter({ windowMs: 60_000, max: 120 }),
  search: new RateLimiter({ windowMs: 60_000, max: 30  }),
  config: new RateLimiter({ windowMs: 60_000, max: 20  }),
  ws:     new RateLimiter({ windowMs: 60_000, max: 10  }),
};

function validateSnowflake(paramName) {
  return (req, res, next) => {
    if (!isValidSnowflake(req.params[paramName])) {
      return res.status(400).json({ error: `Invalid ${paramName}: must be a Discord snowflake` });
    }
    next();
  };
}

const ALLOWED_QUERY = ['limit','offset','type','search','status','q','minLevel','maxLevel','sort','guildId'];

function sanitizeQuery(req, res, next) {
  for (const key of Object.keys(req.query)) {
    if (!ALLOWED_QUERY.includes(key)) { delete req.query[key]; continue; }
    if (typeof req.query[key] === 'string') req.query[key] = sanitizeString(req.query[key], 100);
  }
  next();
}

const ALLOWED_BODY = ['level_channel', 'log_channel', 'welcome_channel', 'suggest_channel'];

function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next();
  for (const key of Object.keys(req.body)) {
    if (!ALLOWED_BODY.includes(key)) { delete req.body[key]; continue; }
    const val = req.body[key];
    if (val !== null && val !== '' && !isValidSnowflake(String(val))) {
      return res.status(400).json({ error: `Invalid ${key}: must be a valid channel ID or null` });
    }
  }
  next();
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
}

module.exports = {
  isValidSnowflake, sanitizeString, sanitizeInt, getIP,
  RateLimiter, limiters,
  validateSnowflake, sanitizeQuery, sanitizeBody, securityHeaders,
};
