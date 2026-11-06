'use strict';

const crypto = require('node:crypto');
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function createGuestSessions(store, publicUrl, production = false, { now = Date.now } = {}) {
  const origin = new URL(publicUrl).origin;
  const secure = production || origin.startsWith('https:');
  const cache = new Map();
  const CACHE_MS = 60000;
  const cookieName = secure ? '__Host-eo_guest' : 'eo_guest';

  function tokenFrom(req) {
    const entries = (req.headers.cookie || '').split(';').map(x => x.trim()).filter(x => x.startsWith(cookieName + '='));
    // Ambiguous cookies must never choose a principal by header order.
    if (entries.length > 1) return '';
    return entries.length ? entries[0].slice(cookieName.length + 1) : null;
  }
  function allowedOrigin(req) {
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    return !req.headers.origin || req.headers.origin === origin;
  }
  return Object.freeze({
    tokenFrom, allowedOrigin,
    async resolve(req, { fresh = false } = {}) {
      const token = tokenFrom(req);
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const key = crypto.createHash('sha256').update(token).digest('hex');
      const entry = cache.get(key), time = now();
      if (!fresh && entry && entry.until > time) return entry.value;
      if (cache.size >= 10000) cache.delete(cache.keys().next().value);
      const value = Promise.resolve(store.resolveSession(token));
      cache.set(key, { until: time + CACHE_MS, value });
      try {
        const session = await value;
        if (!session || session.expiresAt <= now()) { cache.delete(key); return null; }
        cache.set(key, { until: Math.min(time + CACHE_MS, session.expiresAt), value: session });
        return session;
      } catch (error) { cache.delete(key); throw error; }
    },
    cookie(token, expiresAt) {
      const maxAge = Math.max(0, Math.min(Math.floor(SESSION_TTL_MS / 1000), Math.floor((expiresAt - now()) / 1000)));
      return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
    },
  });
}

module.exports = { createGuestSessions };
