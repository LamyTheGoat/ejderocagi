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
// küfür ve hakaret süzgeci ayrı dosyadadır (server/kufur_suzgec.js); ad ve söz aynı kuralları kullanır
const { metniSuz, adUygunsuz } = require('./kufur_suzgec');

function temizAd(v) {
  if (typeof v !== 'string') return 'Gezgin';
  const ad = v.normalize('NFC').replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (ad.length < 2) return 'Gezgin';
  return adUygunsuz(ad) ? 'Gezgin' : ad;
}
const sayi = (v, a, b) => (typeof v === 'number' && Number.isFinite(v)) ? Math.round(Math.max(a, Math.min(b, v)) * 100) / 100 : null;

// Sohbet sözü: en çok 120 karakter, denetim karakteri ve bağlantı yok; uygunsuz sözcükler yıldızlanır.
// Dönen: temiz metin ya da null (boş, yalnız bağlantı, biçimsiz).
const BAGLANTI = /(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|net|org|io|gg|tr|ru|xyz|app|me|co)\b\S*/gi;
function temizSoz(v) {
  if (typeof v !== 'string') return null;
  let s = v.normalize('NFC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(BAGLANTI, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!s) return null;
  return metniSuz(s);
}

function temizDurum(msg) {
  const a = typeof msg.a === 'string' && /^[a-z0-9]{2,16}$/.test(msg.a) ? msg.a : null, x = sayi(msg.x, -400, 400), y = sayi(msg.y, -400, 400);
  if (!a || x === null || y === null) return null;
  const e = msg.e && typeof msg.e === 'object' && JEST.has(msg.e.k) && Number.isSafeInteger(msg.e.t) ? { k: msg.e.k, t: msg.e.t } : null;
  return { a, x, y, d: YON.has(msg.d) ? msg.d : 'down', s: typeof msg.s === 'string' && /^[a-z]{2,12}$/.test(msg.s) ? msg.s : 'temel', gr: typeof msg.g === 'string' && /^[a-z]{2,10}(\.[a-z]{2,10}){3}(\.[a-z0-9_]{2,16}){0,2}$/.test(msg.g) ? msg.g : '', p: msg.p ? 1 : 0, e, n: temizAd(msg.n) };
}

// kimlik(socket): oyuncunun sunucudaki hesap adı (@gezgin_...). Gizli değildir; düello daveti ve takas bu adla yapılır.
// alan(socket, a): oyuncunun gerçekte hangi öbekte sayılacağı. 'ocak' herkesin kendi arazisidir; ziyaret (server/ocak_ziyaret.js)
// misafiri ev sahibinin öbeğine koyar. İstemciye giden alan adı değişmez ('ocak'); yalnız kimin kimi gördüğü değişir.
function createMeydanPresence({ send, now = () => Date.now(), kimlik = () => null, alan = (socket, a) => a }) {
  const kanallar = [];                       // kanal no → Set<socket>
  let sira = 0;
  const kanalBul = () => { for (let i = 0; i < kanallar.length; i++) if (kanallar[i].size < KANAL_BOYU) return i; kanallar.push(new Set()); return kanallar.length - 1; };
  const paket = m => ({ type: 'meydan', id: m.id, h: m.h, n: m.d.n, a: m.d.a, x: m.d.x, y: m.d.y, d: m.d.d, s: m.d.s, g: m.d.gr, p: m.d.p, e: m.d.e });   // g: görünüş kodu (saç.saçRengi.göz.gözRengi[.başlık], başlık 2026-11-22 Kat Faz 3), yalnız görüntü
  const ayniAlan = (socket, alan) => { const out = []; const m = socket.meydan; if (!m) return out; for (const o of kanallar[m.kanal]) if (o !== socket && o.meydan && o.meydan.d && o.meydan.d.g === alan) out.push(o); return out; };

  /* alan sohbeti: yalnız meydana katılmış oyuncu yazar; aynı kanal ve alandakiler duyar. Kalıcı değildir.
     Hız: iki söz arası en az 1,2 saniye ve otuz saniyede en çok sekiz söz; aşan söz sessizce atılır, gönderene bildirilir. */
  function soz(socket, msg) {
    const m = socket.meydan; if (!m || !m.d) return true;
    const t = now(); m.sozler = (m.sozler || []).filter(z => t - z < 30000);
    if ((m.sozler.length && t - m.sozler[m.sozler.length - 1] < 1200) || m.sozler.length >= 8) { send(socket, { type: 'meydan_soz_red', neden: 'hiz' }); return true; }
    const x = temizSoz(msg.x); if (!x) return true;
    m.sozler.push(t);
    const p = { type: 'meydan_soz', id: m.id, h: m.h, n: m.d.n, x };
    for (const o of ayniAlan(socket, m.d.g)) send(o, p);
    send(socket, { type: 'meydan_soz', id: m.id, h: m.h, n: m.d.n, x, ben: true });   // gönderen süzülmüş hâlini görür
    return true;
  }
  function onMessage(socket, msg) {
    if (msg && msg.type === 'meydan_soz') return soz(socket, msg);
    if (!msg || msg.type !== 'meydan') return false;
    let m = socket.meydan;
    const t = now();
    if (m) { if (t - m.pencere >= 1000) { m.pencere = t; m.sayac = 0; } if (++m.sayac > HIZ) return true; }
    const d = temizDurum(msg); if (!d) return true;
    if (!m) { const kanal = kanalBul(); const h = kimlik(socket); m = socket.meydan = { id: 'm' + (++sira).toString(36), h: typeof h === 'string' ? h.slice(0, 41) : null, kanal, d: null, pencere: t, sayac: 1 }; kanallar[kanal].add(socket); }
    const eskiAlan = m.d ? m.d.g : null; d.g = alan(socket, d.a); m.d = d;
    if (eskiAlan !== d.g) {
      if (eskiAlan) for (const o of ayniAlan(socket, eskiAlan)) send(o, { type: 'meydan_cik', id: m.id });
      send(socket, { type: 'meydan_liste', a: d.a, liste: ayniAlan(socket, d.g).map(o => paket(o.meydan)) });
    }
    const p = paket(m); for (const o of ayniAlan(socket, d.g)) send(o, p);
    return true;
  }
  function onDisconnect(socket) {
    const m = socket.meydan; if (!m) return;
    if (m.d) for (const o of ayniAlan(socket, m.d.g)) send(o, { type: 'meydan_cik', id: m.id });
    kanallar[m.kanal].delete(socket); socket.meydan = null;
  }
  return { onMessage, onDisconnect, sayim: () => kanallar.map(k => k.size) };
}

module.exports = { createMeydanPresence, temizAd, temizDurum, temizSoz, KANAL_BOYU, HIZ };
