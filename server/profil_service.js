'use strict';
// Oyuncu profili (Ejder Ocağı 2.0, 2026-11-16).
// Ocağın verisi istemcidedir: oyuncu kendi künyesini (ad, kuşam, hafta, ün, ejderha sayısı, yıldız ejderha, birkaç sayaç) bildirir;
// sunucu süzer, bellekte tutar ve soranlara verir. Gösterim amaçlıdır: ekonomiye, sıralamaya ya da eşleşmeye girdi olmaz.
// Yeniden başlatma (2026-11-20): değişen künyeler topluca depoya yazılır (kaydet(), sunucu dakikada bir çağırır; tür 'kunye', 30 gün).
// Bellekte olmayan künye sorulunca depodan okunur; böylece sunucu yeniden başlasa da çevrimdışı oyuncunun künyesi görünür.
//   profil { p }          oyuncu kendi künyesini bildirir
//   profil_iste { h }     → profil_kart { h, p | null, cevrimici }
const { temizAd } = require('./meydan_presence');
const EL = new Set(['ates', 'buz', 'firtina', 'toprak', 'golge']), EVRE = new Set(['yavru', 'genc', 'yetiskin']);
const SAYAC = ['wins', 'losses', 'kupa', 'bred', 'hatch', 'seferler', 'raceWins'], EN_COK = 5000, HIZ = 8;
const tam = (v, a, b) => Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.floor(+v))) : a;

function temizProfil(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const y = p.yildiz, st = {}; for (const k of SAYAC) st[k] = tam(p.st && p.st[k], 0, 99999);
  return { ad: temizAd(p.ad), set: typeof p.set === 'string' && /^[a-z]{2,12}$/.test(p.set) ? p.set : 'temel', gor: typeof p.gor === 'string' && /^[a-z0-9]{1,12}(\.[a-z0-9]{1,12}){3}(\.[a-z0-9_]{1,16}){0,2}$/.test(p.gor) ? p.gor : '', hafta: tam(p.hafta, 1, 999), un: tam(p.un, 0, 9999), ejder: tam(p.ejder, 0, 50),
    yildiz: y && typeof y === 'object' && EL.has(y.el) && EVRE.has(y.stage) ? { name: temizAd(y.name), el: y.el, stage: y.stage, sex: y.sex === 'M' ? 'M' : 'F' } : null, st };
}

const KUNYE_OMUR = 30 * 24 * 3600000, YOK_MS = 5 * 60000;
function createProfil({ send, sockets, kimlik, kalici = null, now = () => Date.now() }) {
  const kartlar = new Map();   // hesap adı (@...) → { p, t }
  const kirli = new Set(), yazilan = new Map(), yok = new Map();   // depoya yazılacak künyeler · son yazılanın özeti · depoda bulunmayan künye (5 dk yeniden sorulmaz)
  function onMessage(socket, msg) {
    if (!msg || (msg.type !== 'profil' && msg.type !== 'profil_iste')) return false;
    const k = kimlik(socket); if (!k) return true;
    const t = now(); if (!socket.prP || t - socket.prP >= 1000) { socket.prP = t; socket.prN = 0; } if (++socket.prN > HIZ) return true;
    if (msg.type === 'profil') { const p = temizProfil(msg.p); if (!p) return true; kartlar.delete(k.handle); kartlar.set(k.handle, { p, t });
      yok.delete(k.handle); if (kalici && yazilan.get(k.handle) !== JSON.stringify(p)) kirli.add(k.handle);
      if (kartlar.size > EN_COK) kartlar.delete(kartlar.keys().next().value); return true; }
    const h = String(msg.h || '').slice(0, 41), kayit = kartlar.get(h), cevrimici = () => [...sockets()].some(s => !s.destroyed && kimlik(s) && kimlik(s).handle === h);
    if (kayit || !kalici || !/^@[\w]{1,40}$/.test(h) || yok.get(h) > t) { send(socket, { type: 'profil_kart', h, p: kayit ? kayit.p : null, cevrimici: cevrimici() }); return true; }
    kalici.get('kunye', h).then(v => { const p = v && temizProfil(v); if (p && !kartlar.has(h)) { kartlar.set(h, { p, t: now() }); yazilan.set(h, JSON.stringify(p)); if (kartlar.size > EN_COK) kartlar.delete(kartlar.keys().next().value); } return p; },
      e => { console.error('[profil] okuma', e.code || e.message); return null; })
      .then(p => { if (!p) { if (yok.size >= EN_COK) yok.clear(); yok.set(h, now() + YOK_MS); } return p; })
      .then(p => { if (!socket.destroyed) send(socket, { type: 'profil_kart', h, p: (kartlar.get(h) || {}).p || p || null, cevrimici: cevrimici() }); });
    return true;
  }
  /* değişen künyeleri depoya yazar (en çok 20'si aynı anda); yazılamayan bir sonraki turda yeniden denenir */
  async function kaydet() {
    if (!kalici || !kirli.size) return 0; const L = [...kirli]; kirli.clear(); let n = 0;
    for (let i = 0; i < L.length; i += 20) await Promise.all(L.slice(i, i + 20).map(async h => { const kayit = kartlar.get(h); if (!kayit) return; const j = JSON.stringify(kayit.p);
      try { await kalici.put('kunye', h, kayit.p, KUNYE_OMUR); yazilan.set(h, j); n++; } catch (e) { kirli.add(h); console.error('[profil] yazım', e.code || e.message); } }));
    if (yazilan.size > EN_COK * 2) yazilan.clear();
    return n;
  }
  return { onMessage, kaydet, kart: h => (kartlar.get(h) || {}).p || null, sayim: () => kartlar.size };
}

module.exports = { createProfil, temizProfil };
