'use strict';
// Meydanda öteki oyuncular (Ejder Ocağı 2.0, 2026-11-16).
// İstemci kendi konumunu bildirir (tür: 'meydan'); sunucu doğrular ve AYNI KANALDA, AYNI ALANDA duran oyunculara iletir.
// Hiçbir şey kalıcı değildir, ekonomiye dokunmaz. Kimlik soketten gelir; mesajdaki kimlik alanları yok sayılır.
//   kanal : en çok KANAL_BOYU oyuncu. Oyuncu ilk bildirimde en boş olmayan uygun kanala oturur ve oturum boyunca orada kalır.
//           (Kalabalıkta herkes herkesi görmez; yük oyuncu sayısının karesiyle büyümez.)
//   alan  : sahne kimliği (master, han, pazar ...). Alan değişince eski alandakilere "çıktı", yeni alandakilerin listesi gelir.
//   ad    : oyuncunun ocağına verdiği ad. Sohbet kapalıdır; ad yine de süzgeçten geçer (uygunsuzsa "Gezgin").
// Gelen her alan güvenilmezdir: sayılar sınırlanır, metinler biçime uymazsa atılır, saniyede en çok HIZ bildirim işlenir.
const KANAL_BOYU = 30, HIZ = 10;
const YON = new Set(['up', 'down', 'left', 'right']);
const JEST = new Set(['smile', 'wave', 'heart', 'spark', 'think', 'note']);
// yaygın küfür ve hakaret kökleri (sadeleştirilmiş yazıyla aranır); liste bilerek kısadır, sohbet açılırken genişletilmelidir
const YASAK = ['amk', 'aq', 'amina', 'amcik', 'orospu', 'pic', 'sik', 'yarak', 'yarrak', 'gotveren', 'ibne', 'pezevenk', 'kahpe', 'gavat', 'fuck', 'shit', 'bitch', 'nigg', 'faggot', 'cunt', 'hitler', 'nazi'];
const sade = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z]/g, '');

function temizAd(v) {
  if (typeof v !== 'string') return 'Gezgin';
  const ad = v.normalize('NFC').replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (ad.length < 2) return 'Gezgin';
  const s = sade(ad);
  // "sik" ve "pic" gibi kısa kökler masum sözcüklerin içinde geçebilir (Sıkı, Piçuk yok ama "klasik" var): onlar yalnız söz başında aranır
  for (const k of YASAK) if (k.length <= 3 ? s.startsWith(k) || s === k : s.includes(k)) return 'Gezgin';
  return ad;
}
const sayi = (v, a, b) => (typeof v === 'number' && Number.isFinite(v)) ? Math.round(Math.max(a, Math.min(b, v)) * 100) / 100 : null;

function temizDurum(msg) {
  const a = typeof msg.a === 'string' && /^[a-z0-9]{2,16}$/.test(msg.a) ? msg.a : null, x = sayi(msg.x, -400, 400), y = sayi(msg.y, -400, 400);
  if (!a || x === null || y === null) return null;
  const e = msg.e && typeof msg.e === 'object' && JEST.has(msg.e.k) && Number.isSafeInteger(msg.e.t) ? { k: msg.e.k, t: msg.e.t } : null;
  return { a, x, y, d: YON.has(msg.d) ? msg.d : 'down', s: typeof msg.s === 'string' && /^[a-z]{2,12}$/.test(msg.s) ? msg.s : 'temel', p: msg.p ? 1 : 0, e, n: temizAd(msg.n) };
}

function createMeydanPresence({ send, now = () => Date.now() }) {
  const kanallar = [];                       // kanal no → Set<socket>
  let sira = 0;
  const kanalBul = () => { for (let i = 0; i < kanallar.length; i++) if (kanallar[i].size < KANAL_BOYU) return i; kanallar.push(new Set()); return kanallar.length - 1; };
  const paket = m => ({ type: 'meydan', id: m.id, n: m.d.n, a: m.d.a, x: m.d.x, y: m.d.y, d: m.d.d, s: m.d.s, p: m.d.p, e: m.d.e });
  const ayniAlan = (socket, alan) => { const out = []; const m = socket.meydan; if (!m) return out; for (const o of kanallar[m.kanal]) if (o !== socket && o.meydan && o.meydan.d && o.meydan.d.a === alan) out.push(o); return out; };

  function onMessage(socket, msg) {
    if (!msg || msg.type !== 'meydan') return false;
    let m = socket.meydan;
    const t = now();
    if (m) { if (t - m.pencere >= 1000) { m.pencere = t; m.sayac = 0; } if (++m.sayac > HIZ) return true; }
    const d = temizDurum(msg); if (!d) return true;
    if (!m) { const kanal = kanalBul(); m = socket.meydan = { id: 'm' + (++sira).toString(36), kanal, d: null, pencere: t, sayac: 1 }; kanallar[kanal].add(socket); }
    const eskiAlan = m.d ? m.d.a : null; m.d = d;
    if (eskiAlan !== d.a) {
      if (eskiAlan) for (const o of ayniAlan(socket, eskiAlan)) send(o, { type: 'meydan_cik', id: m.id });
      send(socket, { type: 'meydan_liste', a: d.a, liste: ayniAlan(socket, d.a).map(o => paket(o.meydan)) });
    }
    const p = paket(m); for (const o of ayniAlan(socket, d.a)) send(o, p);
    return true;
  }
  function onDisconnect(socket) {
    const m = socket.meydan; if (!m) return;
    if (m.d) for (const o of ayniAlan(socket, m.d.a)) send(o, { type: 'meydan_cik', id: m.id });
    kanallar[m.kanal].delete(socket); socket.meydan = null;
  }
  return { onMessage, onDisconnect, sayim: () => kanallar.map(k => k.size) };
}

module.exports = { createMeydanPresence, temizAd, temizDurum, KANAL_BOYU, HIZ };
