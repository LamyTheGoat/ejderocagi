'use strict';
// K2 (Y-3): Oturum imzalama sırrı çözümlemesi.
// Üretimde (NODE_ENV=production veya Cloud Run K_SERVICE) SESSION_SECRET zorunludur; yoksa açılış
// reddedilir. Yerel geliştirme/testte süreç başına rastgele sır üretilir ve tek satır uyarı verilir.
// Sırrın değeri hiçbir yere yazdırılmaz.
const crypto = require('crypto');

function isProductionEnv(env) {
  return env.NODE_ENV === 'production' || !!env.K_SERVICE;
}

function resolveSessionSecret(env = process.env, warn = (msg) => console.warn(msg)) {
  const secret = env.SESSION_SECRET;
  if (typeof secret === 'string' && secret !== '') return secret;
  if (isProductionEnv(env)) throw new Error('SESSION_SECRET is required in production');
  warn('[uyarı] SESSION_SECRET tanımlı değil; geçici rastgele sır kullanılıyor (oturumlar yeniden başlatmada sıfırlanır).');
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { resolveSessionSecret, isProductionEnv };
