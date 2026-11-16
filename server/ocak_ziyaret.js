'use strict';
// Ocak ziyareti ve birlikte çiftleştirme (Ejder Ocağı 2.0, 2026-11-16).
// Bir oyuncu ötekini kendi ocağına çağırır; kabul eden misafir, ev sahibinin arazisini (kareler, yapılar, ejderhalar) görür ve
// orada dolaşır. Ocak verisi istemcidedir: ev sahibi arazisinin sade bir tablosunu yollar, sunucu süzer ve misafirlere iletir.
// Birlikte çiftleştirme mevcut Damızlık kuralıdır: misafir bir ejderhasını sunar, ev sahibi kendi ejderhasıyla eşleştirir,
// bedeli öder ve yumurta EV SAHİBİNİN ocağına gelir. Sunucu yalnız teklifi taşır; yeni kural, ödül ya da altın hareketi yoktur.
// Hiçbir şey kalıcı değildir. Kimlik soketten gelir. Gelen her alan güvenilmezdir: biçime uymayan atılır, boyut sınırlanır.
//
//   ziyaret_davet { to }            ev sahibi → hedef: ziyaret_davet { h, ad }            (davet 90 sn geçerli)
//   ziyaret_kabul { ev }            misafir: ziyaret_basladi { h, ad, tablo } · ev sahibi: ziyaret_geldi { h, ad }
//   ziyaret_tablo { tablo }         ev sahibi → misafirleri: ziyaret_tablo { tablo }
//   ziyaret_bitir {}                misafir çıkar (ev sahibi: ziyaret_gitti { h }); ev sahibi yollarsa bütün misafirler ziyaret_bitti alır
//   ziyaret_iste { to }             ev sahibi → misafir: ziyaret_iste { h, ad }           ("bir ejderhanı sun")
//   ziyaret_teklif { d }            misafir → ev sahibi: ziyaret_teklif { h, ad, d }      (d: misafirin ejderhası)
//   ziyaret_oldu { to, benim, onun } ev sahibi → misafir: ziyaret_oldu { ad, benim, onun } (eşleşme yapıldı, yumurta ev sahibinde)
//   hata: ziyaret_hata { kod }      cevrimdisi | davet_yok | kendin | misafir_degil | bicim | dolu
const { temizAd } = require('./meydan_presence');
const DAVET_MS = 90000, EN_COK_MISAFIR = 6, HIZ = 6, EJDER_BOYU = 16000;
const EL = new Set(['ates', 'buz', 'firtina', 'toprak', 'golge']), EVRE = new Set(['yavru', 'genc', 'yetiskin']);

function temizTablo(v) {
  if (!v || typeof v !== 'object' || !Array.isArray(v.grid) || v.grid.length !== 48 || !Array.isArray(v.dragons)) return null;
  const grid = []; for (const t of v.grid) { if (!Array.isArray(t)) return null; grid.push([t[0] ? 1 : 0, typeof t[1] === 'string' && /^[a-z]{2,10}$/.test(t[1]) ? t[1] : 0]); }
  const dragons = []; for (const d of v.dragons.slice(0, 14)) { if (!d || typeof d !== 'object' || !EL.has(d.el) || !EVRE.has(d.stage)) continue;
    dragons.push({ id: String(d.id).replace(/[^\w-]/g, '').slice(0, 12) || '0', name: temizAd(d.name), el: d.el, stage: d.stage, sex: d.sex === 'M' ? 'M' : 'F' }); }
  return { grid, dragons, yum: Number.isInteger(v.yum) ? Math.max(0, Math.min(20, v.yum)) : 0 };
}
// misafirin sunduğu ejderha: oyunun kendi ejderha nesnesi (genler, huylar). Yalnız biçim ve boyut denetlenir; ad süzgeçten geçer.
function temizEjder(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || !EL.has(d.el) || !EVRE.has(d.stage) || d.stage === 'yavru' || (d.sex !== 'F' && d.sex !== 'M')) return null;
  const g = d.genes; if (!g || typeof g !== 'object' || !g.pot || typeof g.pot !== 'object' || !['el', 'pat', 'eye', 'horn'].every(k => Array.isArray(g[k]) && g[k].length <= 4) || !Array.isArray(d.traits) || d.traits.length > 12) return null;
  let j; try { j = JSON.stringify(d); } catch (_) { return null; } if (j.length > EJDER_BOYU) return null;
  const c = JSON.parse(j); c.name = temizAd(c.name); return c;
}

function createOcakZiyaret({ send, sockets, kimlik, now = () => Date.now() }) {
  const ev = new Map();        // misafir hesap → ev sahibi hesap
  const davet = new Map();     // 'ev|hedef' → bitiş zamanı
  const tablolar = new Map();  // ev sahibi hesap → son tablo
  const adlar = new Map();     // hesap → son bildirdiği ad
  const soketler = id => [...sockets()].filter(s => !s.destroyed && kimlik(s) && kimlik(s).accountId === id);
  const adindan = h => { for (const s of sockets()) { const k = !s.destroyed && kimlik(s); if (k && k.handle === h) return k; } return null; };
  const yolla = (id, m) => { for (const s of soketler(id)) send(s, m); };
  const misafirler = id => [...ev].filter(([, e]) => e === id).map(([m]) => m);
  const adOf = k => adlar.get(k.accountId) || 'Gezgin';
  function ayril(misafir, neden) { const e = ev.get(misafir); if (!e) return; ev.delete(misafir); const k = [...sockets()].map(kimlik).find(x => x && x.accountId === misafir);
    yolla(e, { type: 'ziyaret_gitti', h: k ? k.handle : null }); if (neden) yolla(misafir, { type: 'ziyaret_bitti', neden }); }

  function onMessage(socket, msg) {
    if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('ziyaret_')) return false;
    const k = kimlik(socket); if (!k) return true;
    const t = now(); if (!socket.zyP || t - socket.zyP >= 1000) { socket.zyP = t; socket.zyN = 0; } if (++socket.zyN > HIZ) return true;
    if (typeof msg.ad === 'string') adlar.set(k.accountId, temizAd(msg.ad));
    const hata = kod => send(socket, { type: 'ziyaret_hata', kod });
    switch (msg.type) {
      case 'ziyaret_davet': { const h = adindan(String(msg.to || '')); if (!h) return hata('cevrimdisi'), true; if (h.accountId === k.accountId) return hata('kendin'), true;
        if (ev.has(k.accountId)) return hata('misafirsin'), true;   // başkasının ocağındayken kendi ocağına çağıramazsın
        davet.set(k.accountId + '|' + h.accountId, t + DAVET_MS); yolla(h.accountId, { type: 'ziyaret_davet', h: k.handle, ad: adOf(k) }); send(socket, { type: 'ziyaret_davet_gitti', to: h.handle }); break; }
      case 'ziyaret_kabul': { const h = adindan(String(msg.ev || '')); if (!h) return hata('cevrimdisi'), true; const a = h.accountId + '|' + k.accountId;
        if (!(davet.get(a) > t)) return hata('davet_yok'), true; davet.delete(a);
        if (misafirler(k.accountId).length) return hata('misafirin_var'), true;   // ocağında misafir varken başka ocağa gidilmez
        if (misafirler(h.accountId).length >= EN_COK_MISAFIR) return hata('dolu'), true;
        if (ev.has(k.accountId)) ayril(k.accountId); ev.set(k.accountId, h.accountId);
        send(socket, { type: 'ziyaret_basladi', h: h.handle, ad: adOf(h), tablo: tablolar.get(h.accountId) || null }); yolla(h.accountId, { type: 'ziyaret_geldi', h: k.handle, ad: adOf(k) }); break; }
      case 'ziyaret_tablo': { const tb = temizTablo(msg.tablo); if (!tb) return hata('bicim'), true; tablolar.set(k.accountId, tb); for (const m of misafirler(k.accountId)) yolla(m, { type: 'ziyaret_tablo', tablo: tb }); break; }
      case 'ziyaret_bitir': { if (ev.has(k.accountId)) { ayril(k.accountId); send(socket, { type: 'ziyaret_bitti', neden: 'cikti' }); } else for (const m of misafirler(k.accountId)) ayril(m, 'ev_sahibi_yolladi'); break; }
      case 'ziyaret_iste': { const h = adindan(String(msg.to || '')); if (!h || ev.get(h.accountId) !== k.accountId) return hata('misafir_degil'), true; yolla(h.accountId, { type: 'ziyaret_iste', h: k.handle, ad: adOf(k) }); break; }
      case 'ziyaret_teklif': { const e = ev.get(k.accountId); if (!e) return hata('misafir_degil'), true; const d = temizEjder(msg.d); if (!d) return hata('bicim'), true;
        yolla(e, { type: 'ziyaret_teklif', h: k.handle, ad: adOf(k), d }); send(socket, { type: 'ziyaret_teklif_gitti' }); break; }
      case 'ziyaret_oldu': { const h = adindan(String(msg.to || '')); if (!h || ev.get(h.accountId) !== k.accountId) return hata('misafir_degil'), true;
        yolla(h.accountId, { type: 'ziyaret_oldu', ad: adOf(k), benim: temizAd(msg.benim), onun: temizAd(msg.onun) }); break; }
      default: break;
    }
    return true;
  }
  function onDisconnect(socket) { const k = kimlik(socket); if (!k) return; if ([...sockets()].some(s => s !== socket && !s.destroyed && kimlik(s) && kimlik(s).accountId === k.accountId)) return;
    if (ev.has(k.accountId)) ayril(k.accountId); for (const m of misafirler(k.accountId)) ayril(m, 'ev_sahibi_cikti'); tablolar.delete(k.accountId); adlar.delete(k.accountId);
    for (const a of [...davet.keys()]) if (a.startsWith(k.accountId + '|') || a.endsWith('|' + k.accountId)) davet.delete(a); }
  // meydan varlığı için: 'ocak' alanı herkesin kendi ocağıdır; misafir ev sahibinin ocağında sayılır
  const alan = (socket, a) => { if (a !== 'ocak') return a; const k = kimlik(socket); return k ? 'ocak:' + (ev.get(k.accountId) || k.accountId) : a; };
  return { onMessage, onDisconnect, alan, evOf: id => ev.get(id) || null, sayim: () => ({ ziyaret: ev.size, davet: davet.size }) };
}

module.exports = { createOcakZiyaret, temizTablo, temizEjder, DAVET_MS };
