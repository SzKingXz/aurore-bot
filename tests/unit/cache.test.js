const { cache, cached, TTL } = require('../../cache');

beforeEach(() => {
  cache.store.clear();
});

describe('MemCache — get/set/del', () => {
  test('set y get devuelven el mismo valor', () => {
    cache.set('key1', { data: 42 }, 5000);
    expect(cache.get('key1')).toEqual({ data: 42 });
  });

  test('get devuelve null para clave inexistente', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('expira entradas tras el TTL', async () => {
    cache.set('expire', 'value', 50);
    expect(cache.get('expire')).toBe('value');
    await new Promise(r => setTimeout(r, 80));
    expect(cache.get('expire')).toBeNull();
  });

  test('del elimina la clave', () => {
    cache.set('del-me', 'here', 5000);
    cache.del('del-me');
    expect(cache.get('del-me')).toBeNull();
  });

  test('delPrefix elimina todas las claves con prefijo', () => {
    cache.set('guild:stats:111', 'a', 5000);
    cache.set('guild:stats:222', 'b', 5000);
    cache.set('guild:config:111','c', 5000);
    cache.delPrefix('guild:stats:');
    expect(cache.get('guild:stats:111')).toBeNull();
    expect(cache.get('guild:stats:222')).toBeNull();
    expect(cache.get('guild:config:111')).toBe('c');
  });

  test('stats reporta tamaño correcto', () => {
    cache.set('a', 1, 5000);
    cache.set('b', 2, 5000);
    expect(cache.stats().size).toBe(2);
    expect(cache.stats().max).toBe(2000);
  });

  test('sobrescribir una clave actualiza el valor', () => {
    cache.set('k', 'old', 5000);
    cache.set('k', 'new', 5000);
    expect(cache.get('k')).toBe('new');
  });
});

describe('cached() helper', () => {
  test('llama a fn si no hay hit y cachea el resultado', async () => {
    const fn = jest.fn().mockResolvedValue({ result: 'fresh' });
    const v1 = await cached('c1', 5000, fn);
    const v2 = await cached('c1', 5000, fn);
    expect(v1).toEqual({ result: 'fresh' });
    expect(v2).toEqual({ result: 'fresh' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('no llama a fn si hay hit válido', async () => {
    const fn = jest.fn().mockResolvedValue('data');
    await cached('c2', 5000, fn);
    await cached('c2', 5000, fn);
    await cached('c2', 5000, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('vuelve a llamar a fn tras expirar', async () => {
    const fn = jest.fn().mockResolvedValue('fresh');
    await cached('c3', 50, fn);
    await new Promise(r => setTimeout(r, 80));
    await cached('c3', 50, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('propaga errores de fn sin cachearlos', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('DB down'));
    await expect(cached('c4', 5000, fn)).rejects.toThrow('DB down');
    expect(cache.get('c4')).toBeNull();
  });

  test('soporta fn síncrona que devuelve valor directo', async () => {
    const fn = jest.fn(() => 'sync-value');
    const v  = await cached('c5', 5000, fn);
    expect(v).toBe('sync-value');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('TTL — valores diferenciados', () => {
  test('stats tiene TTL mayor que giveaways', () => {
    expect(TTL.stats).toBeGreaterThan(TTL.giveaways);
  });
  test('config tiene el TTL más alto', () => {
    const max = Math.max(...Object.values(TTL));
    expect(TTL.config).toBe(max);
  });
  test('todos los TTL son números positivos', () => {
    for (const v of Object.values(TTL)) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    }
  });
});
