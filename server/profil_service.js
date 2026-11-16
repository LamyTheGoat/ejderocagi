'use strict';
// Oyuncu profili (Ejder Ocağı 2.0, 2026-11-16).
// Ocağın verisi istemcidedir: oyuncu kendi künyesini (ad, kuşam, hafta, ün, ejderha sayısı, yıldız ejderha, birkaç sayaç) bildirir;
// sunucu süzer, bellekte tutar ve soranlara verir. Gösterim amaçlıdır: ekonomiye, sıralamaya ya da eşleşmeye girdi olmaz.
// Kalıcı değildir: sunucu yeniden başlayınca oyuncu yeniden bağlanana dek künyesi yoktur.
//   profil { p }          oyuncu kendi künyesini bildirir
//   profil_iste { h }     → profil_kart { h, p | null, cevrimici }
const { temizAd } = require('./meydan_presence');
const EL = new Set(['ates', 'buz', 'firtina', 'toprak', 'golge']), EVRE = new Set(['yavru', 'genc', 'yetiskin']);
const SAYAC = ['wins', 'losses', 'kupa', 'bred', 'hatch', 'seferler', 'raceWins'], EN_COK = 5000, HIZ = 8;
const tam = (v, a, b) => Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.floor(+v))) : a;

function temizProfil(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const y = p.yildiz, st = {}; for (const k of SAYAC) st[k] = tam(p.st && p.st[k], 0, 99999);
  return { ad: temizAd(p.ad), set: typeof p.set === 'string' && /^[a-z]{2,12}$/.test(p.set) ? p.set : 'temel', hafta: tam(p.hafta, 1, 999), un: tam(p.un, 0, 9999), ejder: tam(p.ejder, 0, 50),
    yildiz: y && typeof y === 'object' && EL.has(y.el) && EVRE.has(y.stage) ? { name: temizAd(y.name), el: y.el, stage: y.stage, sex: y.sex === 'M' ? 'M' : 'F' } : null, st };
}

function createProfil({ send, sockets, kimlik, now = () => Date.now() }) {
  const kartlar = new Map();   // hesap adı (@...) → { p, t }
  function onMessage(socket, msg) {
    if (!msg || (msg.type !== 'profil' && msg.type !== 'profil_iste')) return false;
    const k = kimlik(socket); if (!k) return true;
    const t = now(); if (!socket.prP || t - socket.prP >= 1000) { socket.prP = t; socket.prN = 0; } if (++socket.prN > HIZ) return true;
    if (msg.type === 'profil') { const p = temizProfil(msg.p); if (!p) return true; kartlar.delete(k.handle); kartlar.set(k.handle, { p, t });
      if (kartlar.size > EN_COK) kartlar.delete(kartlar.keys().next().value); return true; }
    const h = String(msg.h || '').slice(0, 41), kayit = kartlar.get(h);
    send(socket, { type: 'profil_kart', h, p: kayit ? kayit.p : null, cevrimici: [...sockets()].some(s => !s.destroyed && kimlik(s) && kimlik(s).handle === h) });
    return true;
  }
  return { onMessage, kart: h => (kartlar.get(h) || {}).p || null, sayim: () => kartlar.size };
}

module.exports = { createProfil, temizProfil };
