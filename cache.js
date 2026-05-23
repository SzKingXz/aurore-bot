/** TTL en milisegundos para cada tipo de dato de la API. */
const TTL = {
  stats:       60_000,
  leaderboard: 30_000,
  modLogs:     20_000,
  giveaways:   15_000,
  profile:     45_000,
  channels:   120_000,
  config:     120_000,
};

const MAX_ENTRIES = 2000;

/**
 * Caché en memoria con expiración por TTL y eviction LRU automático.
 * No requiere dependencias externas — adecuado para un único proceso Node.
 *
 * Si el proceso se reinicia, el caché se vacía. Para persistencia entre
 * reinicios considerar Redis, aunque para este caso el coste no justifica
 * la complejidad.
 */
class MemCache {
  constructor() {
    /** @type {Map<string, { val: unknown, exp: number, hits: number }>} */
    this.store = new Map();

    setInterval(() => this._evict(), 60_000).unref();
  }

  /**
   * Elimina entradas expiradas y aplica LRU si se supera MAX_ENTRIES.
   * Se ejecuta cada 60 segundos en background.
   * @private
   */
  _evict() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.exp) this.store.delete(k);
    }
    if (this.store.size > MAX_ENTRIES) {
      const sorted = [...this.store.entries()].sort((a, b) => a[1].exp - b[1].exp);
      for (const [k] of sorted.slice(0, this.store.size - MAX_ENTRIES)) {
        this.store.delete(k);
      }
    }
  }

  /**
   * Recupera un valor del caché si existe y no ha expirado.
   *
   * @param {string} key
   * @returns {unknown | null} El valor almacenado, o `null` si no existe o expiró
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.exp) { this.store.delete(key); return null; }
    entry.hits++;
    return entry.val;
  }

  /**
   * Almacena un valor con tiempo de expiración.
   *
   * @param {string}  key - Clave única. Usar formato `dominio:tipo:id` (ej. `guild:stats:12345`)
   * @param {unknown} val - Valor a almacenar (debe ser serializable a JSON)
   * @param {number}  ttl - Tiempo de vida en milisegundos
   */
  set(key, val, ttl) {
    this.store.set(key, { val, exp: Date.now() + ttl, hits: 0 });
  }

  /**
   * Elimina una entrada por clave exacta.
   * Útil para invalidar datos tras operaciones de escritura (PATCH config).
   *
   * @param {string} key
   */
  del(key) { this.store.delete(key); }

  /**
   * Elimina todas las entradas cuya clave empieza por `prefix`.
   * Útil para invalidar todo el caché de un guild a la vez.
   *
   * @param {string} prefix - Prefijo a buscar (ej. `guild:stats:12345:`)
   *
   * @example
   * cache.delPrefix(`guild:${guildId}:`);
   */
  delPrefix(prefix) {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  /** @returns {{ size: number, max: number }} Estadísticas del caché para /health */
  stats() {
    return { size: this.store.size, max: MAX_ENTRIES };
  }
}

const cache = new MemCache();

/**
 * Helper que implementa el patrón cache-aside: devuelve el hit si existe,
 * o ejecuta `fn`, cachea el resultado y lo devuelve.
 *
 * Los errores de `fn` se propagan sin cachear para que SWR pueda reintentarlos.
 *
 * @template T
 * @param {string}        key - Clave de caché
 * @param {number}        ttl - Tiempo de vida en ms
 * @param {() => Promise<T> | T} fn - Función que obtiene los datos si hay miss
 * @returns {Promise<T>}
 *
 * @example
 * const data = await cached(
 *   `guild:stats:${guildId}`,
 *   TTL.stats,
 *   () => fetchStatsFromDB(guildId)
 * );
 */
function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit !== null) return Promise.resolve(hit);
  return Promise.resolve(fn()).then(val => { cache.set(key, val, ttl); return val; });
}

module.exports = { cache, cached, TTL };
