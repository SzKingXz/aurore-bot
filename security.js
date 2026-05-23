/** Patrón que acepta exactamente 17-20 dígitos decimales (rango de snowflakes de Discord). */
const SNOWFLAKE_RE = /^\d{17,20}$/;

/**
 * Verifica que un string sea un Discord snowflake válido.
 * Los IDs de Discord tienen entre 17 y 20 dígitos decimales.
 * Se usa en TODOS los parámetros de ruta que representen un ID de Discord
 * antes de pasarlos a SQLite.
 *
 * @param {unknown} id - Valor a validar
 * @returns {boolean}
 *
 * @example
 * isValidSnowflake('1464318434849591336') // true
 * isValidSnowflake('abc')                 // false
 * isValidSnowflake(null)                  // false
 */
function isValidSnowflake(id) {
  return typeof id === 'string' && SNOWFLAKE_RE.test(id);
}

/**
 * Elimina caracteres potencialmente peligrosos y trunca el string.
 * No es un escape para SQL (better-sqlite3 usa prepared statements para eso),
 * sino una defensa adicional para strings que van a mostrarse en la UI o logs.
 *
 * Caracteres eliminados: `< > " ' \` ; \`
 *
 * @param {unknown} str    - Valor a sanitizar
 * @param {number}  maxLen - Longitud máxima permitida (default: 200)
 * @returns {string} String limpio, o `''` si la entrada no es string
 */
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`;\\]/g, '').slice(0, maxLen).trim();
}

/**
 * Parsea un valor como entero dentro de un rango [min, max].
 * Retorna `def` si el valor no es parseable como número.
 *
 * Útil para parámetros de paginación (`limit`, `offset`) donde
 * un string inválido o un valor fuera de rango podría generar queries
 * pesadas o comportamientos inesperados.
 *
 * @param {unknown} val
 * @param {{ min?: number, max?: number, def?: number }} opts
 * @returns {number}
 *
 * @example
 * sanitizeInt('9999', { min: 0, max: 100, def: 10 }) // 100
 * sanitizeInt('abc',  { def: 20 })                   // 20
 */
function sanitizeInt(val, { min = 0, max = 10000, def = 0 } = {}) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

/**
 * Extrae la IP real del cliente intentando respetar proxies de confianza.
 * Render y Vercel añaden `X-Forwarded-For` cuando pasan el tráfico.
 *
 * @param {import('express').Request} req
 * @returns {string} Dirección IP del cliente
 */
function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Rate limiter en memoria con ventana deslizante.
 * Cada instancia mantiene su propio store de IPs independiente,
 * lo que permite configurar límites distintos por tipo de endpoint.
 *
 * El store se limpia automáticamente cada `windowMs * 2` ms para evitar
 * acumulación de memoria con IPs que dejan de hacer requests.
 */
class RateLimiter {
  /**
   * @param {{ windowMs?: number, max?: number }} opts
   *   - windowMs: tamaño de la ventana en ms (default: 60_000)
   *   - max: máximo de requests permitidos en la ventana (default: 60)
   */
  constructor({ windowMs = 60_000, max = 60 } = {}) {
    this.windowMs = windowMs;
    this.max      = max;
    /** @type {Map<string, { count: number, reset: number }>} */
    this.store    = new Map();
    setInterval(() => {
      const now = Date.now();
      for (const [k, e] of this.store) {
        if (now - e.reset > this.windowMs * 2) this.store.delete(k);
      }
    }, this.windowMs * 2).unref();
  }

  /**
   * Retorna el middleware de Express que aplica el rate limiting.
   * Añade headers estándar `X-RateLimit-*` a todas las respuestas
   * y devuelve 429 con `Retry-After` cuando se supera el límite.
   *
   * @returns {import('express').RequestHandler}
   */
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

/**
 * Instancias preconfiguradas de RateLimiter para cada tipo de endpoint.
 * Se importan en `api.js` y se aplican como middleware en las rutas correspondientes.
 */
const limiters = {
  /** Límite general: 120 req/min por IP */
  global: new RateLimiter({ windowMs: 60_000, max: 120 }),
  /** Búsqueda de usuarios: 30 req/min (queries más costosas) */
  search: new RateLimiter({ windowMs: 60_000, max: 30  }),
  /** Cambios de config: 20 req/min (escrituras a DB) */
  config: new RateLimiter({ windowMs: 60_000, max: 20  }),
  /** Conexiones WebSocket: 10 por IP (no req/min, sino conexiones abiertas) */
  ws:     new RateLimiter({ windowMs: 60_000, max: 10  }),
};

/**
 * Middleware de Express que valida que `req.params[paramName]` sea un snowflake válido.
 * Responde 400 inmediatamente si no lo es, evitando llegar a SQLite con datos inválidos.
 *
 * @param {string} paramName - Nombre del parámetro de ruta (ej. `'guildId'`, `'userId'`)
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/user/:userId/profile',
 *   validateSnowflake('userId'),
 *   handler
 * );
 */
function validateSnowflake(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!isValidSnowflake(id)) {
      return res.status(400).json({ error: `Invalid ${paramName}: must be a valid Discord snowflake ID` });
    }
    next();
  };
}

/**
 * Middleware que sanitiza todos los parámetros de query string.
 * Elimina parámetros no incluidos en la lista blanca y sanitiza los valores string.
 * Se aplica globalmente a todos los endpoints.
 *
 * @type {import('express').RequestHandler}
 */
function sanitizeQuery(req, res, next) {
  const allowed = ['limit','offset','type','search','status','q','minLevel','maxLevel','sort','guildId'];
  for (const key of Object.keys(req.query)) {
    if (!allowed.includes(key)) { delete req.query[key]; continue; }
    if (typeof req.query[key] === 'string') req.query[key] = sanitizeString(req.query[key], 100);
  }
  next();
}

/**
 * Middleware que valida el body de PATCH /config.
 * Solo permite los campos de la lista blanca y valida que sean snowflakes válidos o null.
 * Responde 400 si hay un valor inválido antes de llegar a la DB.
 *
 * @type {import('express').RequestHandler}
 */
function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next();
  const allowed = ['level_channel', 'log_channel', 'welcome_channel'];
  for (const key of Object.keys(req.body)) {
    if (!allowed.includes(key)) { delete req.body[key]; continue; }
    const val = req.body[key];
    if (val !== null && val !== '' && !isValidSnowflake(String(val))) {
      return res.status(400).json({ error: `Invalid ${key}: must be a valid channel ID or null` });
    }
  }
  next();
}

/**
 * Middleware que añade headers de seguridad HTTP a todas las respuestas
 * y elimina `X-Powered-By` para no revelar el stack tecnológico.
 *
 * @type {import('express').RequestHandler}
 */
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
