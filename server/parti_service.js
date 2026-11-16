'use strict';
// Parti (Ejder Ocağı 2.0, 2026-11-16): en çok dört terbiyecilik kalıcı olmayan grup.
// Parti üyeleri birbirinin nerede olduğunu görür ve parti sohbetinde konuşur (alan sohbetinden bağımsız, her yerden).
// Oynanışa ve ekonomiye dokunmaz. Ortak PvE (server/ortak_odalar.js) ileride partiyi birlikte kuyruğa sokmak için uyeler() ucunu kullanabilir.
// Kimlik soketten gelir. Bellekte tutulur: sunucu yeniden başlayınca partiler dağılır. Tek sunucu örneği varsayar.
//
//   parti_davet { to }     lider (ya da partisi olmayan) → hedef: parti_davet { h, ad }   (90 sn geçerli)
//   parti_kabul { lider }  davet edenin partisine katılır (partisi yoksa ikisiyle kurulur)
//   parti_cik {}           ayrılır; lider ayrılırsa en eski üye lider olur; tek kişi kalınca parti dağılır
//   parti_at { to }        lider bir üyeyi çıkarır
//   parti_soz { x }        parti sohbeti (süzgeç ve hız sınırı alan sohbetiyle aynı)
//   parti_durum {}         güncel durumu ister
//   sunucudan: parti { parti: null | { lider, uyeler: [{ h, ad, set, alan, cevrimici }] } } · parti_soz { h, ad, x, ben } · parti_hata { kod }
const { temizAd, temizSoz } = require('./meydan_presence');
const EN_COK = 4, DAVET_MS = 90000, KOPMA_MS = 180000, HIZ = 6;

function createParti({ send, sockets, kimlik, yer = () => null, now = () => Date.now() }) {
  const partiler = new Map();   // kimlik → { id, uyeler: [{ id, h, ad, kopma }] }  (ilk üye liderdir)
  const uyelik = new Map();     // hesap → parti kimliği
  const davet = new Map();      // 'davet eden|hedef' → bitiş
  let sira = 0;
  const soketler = id => [...sockets()].filter(s => !s.destroyed && kimlik(s) && kimlik(s).accountId === id);
  const adindan = h => { for (const s of sockets()) { const k = !s.destroyed && kimlik(s); if (k && k.handle === h) return k; } return null; };
  const partiOf = id => partiler.get(uyelik.get(id)) || null;
  function gorunum(p) { return { lider: p.uyeler[0].h, uyeler: p.uyeler.map(u => { const ss = soketler(u.id), y = ss.length ? yer(ss[0]) : null; return { h: u.h, ad: u.ad, set: (y && y.set) || 'temel', alan: (y && y.alan) || null, cevrimici: ss.length > 0 }; }) }; }
  const yay = p => { const g = gorunum(p); for (const u of p.uyeler) for (const s of soketler(u.id)) send(s, { type: 'parti', parti: g }); };
  const bosalt = id => { for (const s of soketler(id)) send(s, { type: 'parti', parti: null }); };
  function cikar(p, id) { const i = p.uyeler.findIndex(u => u.id === id); if (i < 0) return; p.uyeler.splice(i, 1); uyelik.delete(id); bosalt(id);
    if (p.uyeler.length <= 1) { for (const u of p.uyeler) { uyelik.delete(u.id); bosalt(u.id); } partiler.delete(p.id); return; } yay(p); }

  function onMessage(socket, msg) {
    if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('parti_')) return false;
    const k = kimlik(socket); if (!k) return true;
    const t = now(); if (!socket.ptP || t - socket.ptP >= 1000) { socket.ptP = t; socket.ptN = 0; } if (++socket.ptN > HIZ) return true;
    const hata = kod => send(socket, { type: 'parti_hata', kod }), p = partiOf(k.accountId), ad = temizAd(msg.ad);
    if (p && typeof msg.ad === 'string') { const u = p.uyeler.find(x => x.id === k.accountId); if (u) u.ad = ad; }
    switch (msg.type) {
      case 'parti_davet': { const h = adindan(String(msg.to || '')); if (!h) return hata('cevrimdisi'), true; if (h.accountId === k.accountId) return hata('kendin'), true;
        if (p && p.uyeler[0].id !== k.accountId) return hata('lider_degil'), true; if (p && p.uyeler.length >= EN_COK) return hata('dolu'), true;
        if (p && p.uyeler.some(u => u.id === h.accountId)) return hata('zaten_partide'), true;
        davet.set(k.accountId + '|' + h.accountId, { t: t + DAVET_MS, ad }); for (const s of soketler(h.accountId)) send(s, { type: 'parti_davet', h: k.handle, ad }); send(socket, { type: 'parti_davet_gitti', to: h.handle }); break; }
      case 'parti_kabul': { const h = adindan(String(msg.lider || '')); if (!h) return hata('cevrimdisi'), true; const a = h.accountId + '|' + k.accountId, d = davet.get(a);
        if (!d || d.t <= t) return hata('davet_yok'), true; davet.delete(a);
        let hp = partiOf(h.accountId); if (hp && hp.uyeler[0].id !== h.accountId) return hata('davet_yok'), true; if (hp && hp.uyeler.length >= EN_COK) return hata('dolu'), true;
        if (p && p !== hp) cikar(p, k.accountId);
        if (!hp) { hp = { id: 'p' + (++sira).toString(36), uyeler: [{ id: h.accountId, h: h.handle, ad: d.ad, kopma: 0 }] }; partiler.set(hp.id, hp); uyelik.set(h.accountId, hp.id); }
        if (!hp.uyeler.some(u => u.id === k.accountId)) { hp.uyeler.push({ id: k.accountId, h: k.handle, ad, kopma: 0 }); uyelik.set(k.accountId, hp.id); } yay(hp); break; }
      case 'parti_cik': if (p) cikar(p, k.accountId); else bosalt(k.accountId); break;
      case 'parti_at': { if (!p || p.uyeler[0].id !== k.accountId) return hata('lider_degil'), true; const u = p.uyeler.find(x => x.h === String(msg.to || '') && x.id !== k.accountId); if (!u) return hata('uye_degil'), true;
        for (const s of soketler(u.id)) send(s, { type: 'parti_atildi' }); cikar(p, u.id); break; }
      case 'parti_soz': { if (!p) return hata('parti_yok'), true; socket.ptZ = (socket.ptZ || []).filter(z => t - z < 30000);
        if ((socket.ptZ.length && t - socket.ptZ[socket.ptZ.length - 1] < 1000) || socket.ptZ.length >= 10) return hata('hiz'), true;
        const x = temizSoz(msg.x); if (!x) return true; socket.ptZ.push(t); const u = p.uyeler.find(q => q.id === k.accountId);
        for (const o of p.uyeler) for (const s of soketler(o.id)) send(s, { type: 'parti_soz', h: k.handle, ad: u.ad, x, ben: o.id === k.accountId }); break; }
      case 'parti_durum': if (p) send(socket, { type: 'parti', parti: gorunum(p) }); else send(socket, { type: 'parti', parti: null }); break;
      default: break;
    }
    return true;
  }
  /* bağlantı kopunca üye partide kalır (çevrimdışı görünür); KOPMA_MS içinde dönmezse süpürme çıkarır */
  function onDisconnect(socket) { const k = kimlik(socket); if (!k) return; const p = partiOf(k.accountId); if (!p) return;
    if ([...sockets()].some(s => s !== socket && !s.destroyed && kimlik(s) && kimlik(s).accountId === k.accountId)) return;
    const u = p.uyeler.find(x => x.id === k.accountId); if (u) u.kopma = now(); setImmediate(() => { if (partiler.has(p.id)) yay(p); }); }
  function onConnect(socket) { const k = kimlik(socket); if (!k) return; const p = partiOf(k.accountId); if (!p) return; const u = p.uyeler.find(x => x.id === k.accountId); if (u) u.kopma = 0; yay(p); }
  function supur() { const t = now(); for (const p of [...partiler.values()]) for (const u of [...p.uyeler]) if (u.kopma && t - u.kopma > KOPMA_MS && !soketler(u.id).length) cikar(p, u.id);
    for (const [a, d] of davet) if (d.t <= t) davet.delete(a); }
  return { onMessage, onDisconnect, onConnect, supur, uyeler: id => { const p = partiOf(id); return p ? p.uyeler.map(u => u.id) : []; }, sayim: () => ({ parti: partiler.size, uye: uyelik.size }) };
}

module.exports = { createParti, EN_COK, DAVET_MS, KOPMA_MS };
