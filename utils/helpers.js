const spamTracker = new Map();

/**
 * Detecta si un usuario está enviando mensajes a una velocidad que supera
 * el umbral configurado dentro de la ventana de tiempo indicada.
 *
 * @param {string} userId   - Discord snowflake ID del usuario
 * @param {string} guildId  - Discord snowflake ID del servidor
 * @param {{ WINDOW: number, LIMIT: number }} config
 *   - WINDOW: tamaño de la ventana en milisegundos
 *   - LIMIT: número máximo de mensajes permitidos en esa ventana
 * @returns {boolean} true si el usuario supera el límite (spam detectado)
 *
 * @example
 * if (checkSpam(userId, guildId, { WINDOW: 5000, LIMIT: 5 })) {
 *   await message.delete();
 * }
 */
function checkSpam(userId, guildId, config) {
  const key = `${guildId}_${userId}`;
  const now = Date.now();
  if (!spamTracker.has(key)) spamTracker.set(key, []);
  const timestamps = spamTracker.get(key).filter(t => now - t < config.WINDOW);
  timestamps.push(now);
  spamTracker.set(key, timestamps);
  return timestamps.length >= config.LIMIT;
}

/**
 * Limpia el historial de timestamps de un usuario para reiniciar
 * el contador de spam tras aplicar una acción de moderación.
 *
 * @param {string} userId  - Discord snowflake ID del usuario
 * @param {string} guildId - Discord snowflake ID del servidor
 */
function clearSpamTracker(userId, guildId) {
  const key = `${guildId}_${userId}`;
  spamTracker.delete(key);
}

/**
 * Genera una barra de progreso de XP en texto con caracteres Unicode.
 * Útil para embeds de Discord donde no se pueden usar estilos CSS.
 *
 * @param {number} xp       - XP actual del usuario en el nivel actual
 * @param {number} xpNeeded - XP requerido para subir al siguiente nivel
 * @returns {{ bar: string, progress: number }}
 *   - bar: string de 10 caracteres con '█' (lleno) y '░' (vacío)
 *   - progress: porcentaje de progreso entre 0 y 100
 *
 * @example
 * const { bar, progress } = getXPBar(75, 100);
 * // bar: "███████░░░", progress: 75
 */
function getXPBar(xp, xpNeeded) {
  const progress = Math.min(Math.floor((xp / xpNeeded) * 100), 100);
  const filled   = Math.floor(progress / 10);
  return { bar: '█'.repeat(filled) + '░'.repeat(10 - filled), progress };
}

/**
 * Formatea un número con separadores de miles en español.
 * Usado para mostrar XP, mensajes y recuentos en embeds.
 *
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado (ej. 1.234.567)
 */
function formatNumber(num) {
  return num.toLocaleString('es-ES');
}

/**
 * Convierte segundos de uptime en formato legible "Xh Ym Zs".
 *
 * @param {number} seconds - Segundos de uptime (process.uptime())
 * @returns {string} Uptime formateado (ej. "12h 34m 56s")
 */
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

module.exports = { checkSpam, clearSpamTracker, getXPBar, formatNumber, formatUptime };
