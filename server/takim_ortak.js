'use strict';
// Takım Meydanı (2026-11-17): Ejder topçusu 2v2 takım savaşı. Ortak oda altyapısının (server/ortak_odalar.js) "takim" türü.
// Ortak zindanla aynı model (kullanıcı kuralları): tek arena, sıra sunucuda, aksiyon bütün ekranlarda aynı, oturum bitene dek kimse
// düşürülmez (düşenin yalnız sırası atlanır, arenada izler).
//   - Dört oyuncu: odaya giriş sırasına göre 1. ve 3. Mavi takım (solda), 2. ve 4. Kızıl takım (sağda).
//   - SIRA: Mavi 1 → Kızıl 1 → Mavi 2 → Kızıl 2 → … Düşen ya da bağlantısı kopan atlanır. Rüzgârı sunucu üretir.
//   - CAN sunucudadır: atan oyuncu isabeti bildirir ({ t: 'isabet', kime, h }), sunucu canı düşürür ve herkese söyler; can bitince
//     o oyuncu düşer. Yalnız sırası gelen oyuncunun, yalnız karşı takıma verdiği isabet sayılır. (Hile koruması ayrı iş: istemci dürüst varsayılır.)
//   - Bir takımda ayakta kimse kalmayınca öteki takım kazanır. ÖDÜL YOK: altın, ün, sıralama yazılmaz (eldeki 1v1 düello ile aynı).
// EYLEMLER: can { hp, max } (ilk bildirim en çok canı belirler) · konum · ates · isabet { kime, h, bas, it } · tur_bitti { adim, x, y }
// OLAYLAR:  sira { adim, tur, kim, ruzgar } · konum · ates · can { kim, hp, max, h, bas, it, vuran } · dustu { kim } · tur_bitti { kim, adim, x, y }
const HASAR_UST = 6000, VARSAYILAN_CAN = 1350;
const SURE = { giris: 15000, oyuncu: 50000 }, GECIKME_MS = 6000;   // bağlantı koruması: oyun kuralı değil
const ELLER = ['ates', 'buz', 'firtina', 'toprak', 'golge', 'venom', 'magma', 'bluekor', 'talim'];
const MODLAR = ['trident', 'plus1', 'plus2', 'powUlt', 'heavy', 'crater', 'teleport'];
const hata = kod => Object.assign(new Error(kod), { kod });
const sinir = (v, a, b) => Math.round(Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : 0)) * 100) / 100;

function createTakimOrtak(secenek) {
  const now = (secenek && secenek.now) || Date.now, rast = (secenek && secenek.rast) || Math.random;
  const bagli = oda => oda.uyeler.filter(u => u.bagli).map(u => u.id);
  const ayakta = (d, oda, takim) => bagli(oda).filter(id => d.uye[id] && d.uye[id].hayatta && (!takim || d.uye[id].takim === takim));
  function ilerle(d, oda, olaylar) { const s = d.sav, canli = ayakta(d, oda); if (!canli.length) return;
    for (let k = 0; k < 40; k++) { if (!s.kuyruk.length) { s.tur++; s.kuyruk = d.sira.slice(); }
      const id = s.kuyruk.shift(); if (!canli.includes(id)) continue;
      Object.assign(s, { tip: 'oyuncu', kim: id, ruzgar: Math.round((rast() * 4.6 - 2.3) * 10) / 10, adim: s.adim + 1, t0: now(), tb: 0, bitti: {} });
      olaylar.push({ t: 'sira', adim: s.adim, tur: s.tur, kim: s.kim, ruzgar: s.ruzgar }); return; } }
  function degerlendir(d, oda) { const olaylar = []; if (d.faz !== 'savas') return { olaylar };
    const A = ayakta(d, oda, 'A').length, B = ayakta(d, oda, 'B').length;
    if (!A || !B) { d.faz = 'bitti'; d.kazanan = A ? 'A' : B ? 'B' : null; return { olaylar, bitti: { kazananTakim: d.kazanan, takim: Object.fromEntries(Object.entries(d.uye).map(([id, u]) => [id, u.takim])) } }; }
    const s = d.sav, hepsi = bagli(oda), t = now();
    if ((s.tip === 'oyuncu' && !ayakta(d, oda).includes(s.kim)) || hepsi.every(id => s.bitti[id]) || (s.tb && t - s.tb >= GECIKME_MS) || t - s.t0 >= SURE[s.tip]) ilerle(d, oda, olaylar);
    return { olaylar }; }
  const tanim = {
    enAz: 4, enCok: 4, oyundaEnAz: 1,   // maç dört kişiyle başlar; biri ayrılırsa takım arkadaşı tek başına sürdürür
    anahtarGecerli: a => a === '2v2',
    baslat(oda) { const d = { faz: 'savas', uye: {}, sira: [], kazanan: null, sav: { adim: 0, tur: 0, tip: 'giris', kim: null, ruzgar: 0, t0: now(), tb: 0, bitti: {}, kuyruk: [] } };
      oda.uyeler.forEach((u, i) => { d.uye[u.id] = { takim: i % 2 ? 'B' : 'A', yuva: i >> 1, hayatta: true, hp: 0, max: 0 }; d.sira.push(u.id); }); return d; },
    eylem(d, kim, e, oda) { if (!e || typeof e !== 'object') throw hata('eylem_gecersiz'); const u = d.uye[kim.id], olaylar = []; if (!u) throw hata('eylem_gecersiz'); if (d.faz !== 'savas') return { olaylar };
      if (e.t === 'can') { if (!u.max) { u.max = Math.max(1, Math.min(99999, Math.floor(+e.max) || VARSAYILAN_CAN)); u.hp = u.max; olaylar.push({ t: 'can', kim: kim.id, hp: u.hp, max: u.max }); } return { olaylar }; }   // can sunucudadır: sonraki bildirimler sayılmaz
      if (e.t === 'konum' || e.t === 'ates') { if (!u.hayatta) return { olaylar };
        const o = { t: e.t, kim: kim.id, x: sinir(e.x, 0, 64), y: sinir(e.y, -10, 40), aci: sinir(e.aci, -10, 70), yon: e.yon === -1 ? -1 : 1 };
        if (e.t === 'ates') { o.guc = sinir(e.guc, 0, 1); o.ruz = sinir(e.ruz, -6, 6); o.mod = {}; for (const k of MODLAR) if (e.mod && e.mod[k]) o.mod[k] = true; o.el = ELLER.includes(e.el) ? e.el : ''; }
        olaylar.push(o); return { olaylar }; }
      if (e.t === 'oyuk') { if (!u.hayatta) return { olaylar }; olaylar.push({ t: 'oyuk', kim: kim.id, x: sinir(e.x, -4, 68), y: sinir(e.y, -10, 40), r: sinir(e.r, 0.2, 6) }); return { olaylar }; }   // güllenin açtığı oyuk (zemin iki takımın ekranında aynı kalsın)
      if (e.t === 'isabet') { const q = d.uye[e.kime], h = Math.floor(+e.h); if (!q || !(h > 0)) throw hata('eylem_gecersiz');
        if (!u.hayatta || q.takim === u.takim || !q.hayatta || d.sav.kim !== kim.id) return { olaylar };   // yalnız sırası gelen, yalnız karşı takıma
        if (!q.max) { q.max = VARSAYILAN_CAN; q.hp = q.max; } const v = Math.min(h, HASAR_UST, q.hp); q.hp -= v;
        olaylar.push({ t: 'can', kim: e.kime, hp: q.hp, max: q.max, h: v, bas: !!e.bas, it: e.it === -1 ? -1 : 1, vuran: kim.id });
        if (q.hp <= 0) { q.hayatta = false; olaylar.push({ t: 'dustu', kim: e.kime }); } }
      else if (e.t === 'tur_bitti') { const s = d.sav; if (e.adim !== s.adim) return { olaylar }; s.bitti[kim.id] = true; if (s.tip !== 'oyuncu' || s.kim === kim.id) s.tb = s.tb || now();
        olaylar.push({ t: 'tur_bitti', kim: kim.id, adim: s.adim, x: sinir(e.x, 0, 64), y: sinir(e.y, -10, 40) }); }
      else throw hata('eylem_gecersiz');
      const r = degerlendir(d, oda); return { olaylar: olaylar.concat(r.olaylar), bitti: r.bitti }; },
    tik(d, oda) { const r = degerlendir(d, oda); return r.olaylar.length || r.bitti ? r : null; },
    bitir() { },   // ödül yok
  };
  return { tanim };
}
module.exports = { createTakimOrtak, HASAR_UST, VARSAYILAN_CAN, SURE, GECIKME_MS };
