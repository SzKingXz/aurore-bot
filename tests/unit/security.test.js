const {
  isValidSnowflake, sanitizeString, sanitizeInt,
  RateLimiter, validateSnowflake, sanitizeQuery, sanitizeBody, securityHeaders,
} = require('../../security');

describe('isValidSnowflake', () => {
  test('acepta snowflakes válidos de 17-20 dígitos', () => {
    expect(isValidSnowflake('12345678901234567')).toBe(true);
    expect(isValidSnowflake('1464318434849591336')).toBe(true);
    expect(isValidSnowflake('99999999999999999999')).toBe(true);
  });
  test('rechaza IDs cortos', () => {
    expect(isValidSnowflake('1234')).toBe(false);
    expect(isValidSnowflake('1234567890')).toBe(false);
  });
  test('rechaza IDs demasiado largos', () => {
    expect(isValidSnowflake('123456789012345678901')).toBe(false);
  });
  test('rechaza no numéricos', () => {
    expect(isValidSnowflake('1234567890123456a')).toBe(false);
    expect(isValidSnowflake('abc')).toBe(false);
    expect(isValidSnowflake('')).toBe(false);
  });
  test('rechaza tipos no string', () => {
    expect(isValidSnowflake(null)).toBe(false);
    expect(isValidSnowflake(undefined)).toBe(false);
    expect(isValidSnowflake(1234567890123456789)).toBe(false);
  });
});

describe('sanitizeString', () => {
  test('elimina caracteres peligrosos', () => {
    expect(sanitizeString('<script>')).toBe('script');
    expect(sanitizeString('"quoted"')).toBe('quoted');
    expect(sanitizeString("it's")).toBe('its');
    expect(sanitizeString('`backtick`')).toBe('backtick');
    expect(sanitizeString('semi;colon')).toBe('semicolon');
    expect(sanitizeString('back\\slash')).toBe('backslash');
  });
  test('respeta maxLen', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeString(long, 200).length).toBe(200);
    expect(sanitizeString(long, 50).length).toBe(50);
  });
  test('retorna string vacío para no-strings', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(42)).toBe('');
  });
  test('trimea espacios en extremos', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
});

describe('sanitizeInt', () => {
  test('parsea enteros dentro del rango', () => {
    expect(sanitizeInt('10',  { min: 0, max: 100 })).toBe(10);
    expect(sanitizeInt('0',   { min: 0, max: 100 })).toBe(0);
    expect(sanitizeInt('100', { min: 0, max: 100 })).toBe(100);
  });
  test('aplica límite inferior', () => {
    expect(sanitizeInt('-5',   { min: 0, max: 100, def: 0 })).toBe(0);
    expect(sanitizeInt('-999', { min: 5, max: 100, def: 5 })).toBe(5);
  });
  test('aplica límite superior', () => {
    expect(sanitizeInt('9999', { min: 0, max: 100 })).toBe(100);
    expect(sanitizeInt('200',  { min: 0, max: 100 })).toBe(100);
  });
  test('devuelve default para NaN', () => {
    expect(sanitizeInt('abc', { def: 42 })).toBe(42);
    expect(sanitizeInt(null,  { def: 7  })).toBe(7);
    expect(sanitizeInt('',    { def: 1  })).toBe(1);
  });
  test('ignora decimales', () => {
    expect(sanitizeInt('10.9', { min: 0, max: 100 })).toBe(10);
  });
});

describe('RateLimiter', () => {
  const makeReq = (ip = '1.2.3.4') => ({ headers: {}, socket: { remoteAddress: ip } });
  const makeRes = () => {
    const h = {};
    return { headers: h, setHeader: (k, v) => { h[k] = v; }, status: c => ({ json: b => ({ code: c, body: b }) }) };
  };

  test('permite requests dentro del límite', () => {
    const mw  = new RateLimiter({ windowMs: 60_000, max: 5 }).middleware();
    let passed = 0;
    for (let i = 0; i < 5; i++) mw(makeReq(), makeRes(), () => passed++);
    expect(passed).toBe(5);
  });

  test('bloquea requests que superan el límite', () => {
    const mw  = new RateLimiter({ windowMs: 60_000, max: 3 }).middleware();
    let blocked = 0;
    for (let i = 0; i < 5; i++) {
      const res = makeRes();
      const r   = mw(makeReq(), res, () => {});
      if (r?.code === 429) blocked++;
    }
    expect(blocked).toBe(2);
  });

  test('IPs distintas son independientes', () => {
    const mw  = new RateLimiter({ windowMs: 60_000, max: 2 }).middleware();
    let passed = 0;
    mw(makeReq('1.2.3.4'), makeRes(), () => passed++);
    mw(makeReq('1.2.3.4'), makeRes(), () => passed++);
    mw(makeReq('9.9.9.9'), makeRes(), () => passed++);
    expect(passed).toBe(3);
  });

  test('incluye headers X-RateLimit-*', () => {
    const res = makeRes();
    new RateLimiter({ windowMs: 60_000, max: 10 }).middleware()(makeReq(), res, () => {});
    expect(res.headers['X-RateLimit-Limit']).toBe(10);
    expect(typeof res.headers['X-RateLimit-Remaining']).toBe('number');
    expect(typeof res.headers['X-RateLimit-Reset']).toBe('number');
  });

  test('respuesta 429 incluye Retry-After', () => {
    const mw  = new RateLimiter({ windowMs: 60_000, max: 1 }).middleware();
    mw(makeReq(), makeRes(), () => {});
    const res = makeRes();
    const r   = mw(makeReq(), res, () => {});
    expect(r?.code).toBe(429);
    expect(r?.body?.retryAfter).toBeGreaterThan(0);
  });
});

describe('validateSnowflake middleware', () => {
  const ctx = (id) => ({
    req:  { params: { userId: id } },
    res:  { status: c => ({ json: b => ({ code: c, body: b }) }) },
    next: jest.fn(),
  });

  test('llama next() para snowflake válido', () => {
    const mw = validateSnowflake('userId');
    const { req, res, next } = ctx('1464318434849591336');
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('responde 400 para snowflake inválido', () => {
    const mw = validateSnowflake('userId');
    const { req, res, next } = ctx('abc');
    const r = mw(req, res, next);
    expect(r?.code).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('responde 400 para ID vacío', () => {
    const mw = validateSnowflake('userId');
    const { req, res, next } = ctx('');
    const r = mw(req, res, next);
    expect(r?.code).toBe(400);
  });
});

describe('sanitizeQuery middleware', () => {
  test('elimina parámetros no permitidos', () => {
    const req  = { query: { limit: '10', evil: 'payload', admin: '1' } };
    sanitizeQuery(req, {}, jest.fn());
    expect(req.query.evil).toBeUndefined();
    expect(req.query.admin).toBeUndefined();
    expect(req.query.limit).toBe('10');
  });

  test('sanitiza valores de string en parámetros permitidos', () => {
    const req  = { query: { q: '<script>alert(1)</script>' } };
    sanitizeQuery(req, {}, jest.fn());
    expect(req.query.q).not.toContain('<');
    expect(req.query.q).not.toContain('>');
  });

  test('llama a next()', () => {
    const next = jest.fn();
    sanitizeQuery({ query: {} }, {}, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('sanitizeBody middleware', () => {
  const res = { status: c => ({ json: b => ({ code: c, body: b }) }) };

  test('permite snowflake válido', () => {
    const next = jest.fn();
    sanitizeBody({ body: { level_channel: '1464318434849591336' } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('permite null', () => {
    const next = jest.fn();
    sanitizeBody({ body: { level_channel: null } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('rechaza channel ID inválido con 400', () => {
    const next = jest.fn();
    const r = sanitizeBody({ body: { level_channel: 'drop-table' } }, res, next);
    expect(r?.code).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('elimina campos no permitidos', () => {
    const req  = { body: { level_channel: null, sql_injection: 'DROP TABLE levels;' } };
    sanitizeBody(req, res, jest.fn());
    expect(req.body.sql_injection).toBeUndefined();
  });

  test('no falla con body null', () => {
    const next = jest.fn();
    sanitizeBody({ body: null }, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('securityHeaders middleware', () => {
  test('inyecta todos los headers de seguridad', () => {
    const h   = {};
    const res = { setHeader: (k, v) => { h[k] = v; }, removeHeader: jest.fn() };
    securityHeaders({}, res, jest.fn());
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});
