'use strict';
// Ortak PvE altyapısı (Ejder Ocağı 2.0, 2026-11-16): örnek (instance) odaları, görev bulucu kuyruğu ve sunucuda ortak durum.
// BU DOSYA OYNANIŞ İÇERMEZ. Zindan, kervan, boss gibi türler buraya bir "tür tanımı" olarak kaydolur (kaydet); oda kurma,
// kodla katılma, davet, hazır olma, kuyruk, başlatma, kopma ve bitiş burada ortak çözülür. Ödül bu dosyada yazılmaz: tür
// tanımının `bitir` kancası çağrılır; ödülü yazacak olan, o türü uygulayan sistemdir (sunucu komutlarıyla).
//
// TÜR TANIMI  kaydet(ad, tanim)
//   enAz, enCok        : oyuncu sayısı (varsayılan 1 ve 4)
//   oyundaEnAz         : oyun sürerken odada kalması gereken en az üye (varsayılan enAz). Takım savaşı gibi, biri ayrılınca
//                        kalanların sürdürdüğü türler 1 verir; sonucu türün kendi kuralı söyler.
//   anahtarGecerli(k)  : oda anahtarı (ör. zindan kimliği) geçerli mi
//   baslat(oda)        : ortak başlangıç durumu (ör. { can, enCan, asama }); sunucuda durur
//   eylem(durum, uye, eylem, oda) : oyuncunun eylemini işler; { olaylar: [...], bitti?: { kazanan: bool, ... } } döner ya da
//                        hata fırlatır (kod alanıyla). Durumu yerinde değiştirir. Doğrulama türün işidir.
//   bitir(oda, sonuc, durum) : örnek bitince bir kez çağrılır (ödül yazımı burada tetiklenir). Oyuncu kalmadığı için bittiyse
//                        sonuc = { kazanan: false, neden: 'oyuncu_kalmadi', ayrilan: <hesap> }
//   tik(durum, oda)    : (isteğe bağlı) süpürmede çağrılır; süreye bağlı kurallar için. eylem ile aynı biçimde döner ya da boş.
//   eylem ve tik söz (Promise) döndürebilir; bir odanın eylemleri sırayla işlenir.
//
// MESAJLAR (istemci → sunucu, tür alanı `type`)
//   ortak_kur { tur, anahtar, ozel }   ortak_katil { kod }      ortak_cik {}          ortak_hazir { hazir }
//   ortak_baslat {}                    ortak_davet { to }       ortak_kuyruk { tur, anahtar } / ortak_kuyruk_cik {}
//   ortak_eylem { eylem }              ortak_durum {}
// MESAJLAR (sunucu → istemci)
//   ortak_oda { oda, sen }   ortak_ayrildi {}   ortak_hata { kod }   ortak_davet { kod, tur, anahtar, from }
//   ortak_basladi { oda, durum }   ortak_olay { olaylar, durum }   ortak_bitti { sonuc }   ortak_kuyruk { durum: 'ariyor'|'yok' }
// Oda yalnız üyelerine yayın yapar. Kimlik soketten gelir. Bellekte durur (tek sunucu örneği); kalıcı değildir.
const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const hata = kod => Object.assign(new Error(kod), { kod });

function createOrtakOdalar({ send, sockets, kimlik, crypto = require('node:crypto'), now = () => Date.now(), random = Math.random, config = {} }) {
  const KOPMA_MS = config.kopmaMs ?? 45000, BOS_ODA_MS = config.bosOdaMs ?? 10 * 60000, HIZ = config.hiz ?? 30;   // saniyede en çok eylem (2026-11-20: 12'den 30'a; sekiz yılanlık dalgada bir patlama birden çok hasar bildirir, fazlası düşünce canlar ayrışıyordu)
  const turler = new Map(), odalar = new Map(), kodlar = new Map(), uyelik = new Map(), kuyruk = [];   // uyelik: hesap → oda kimliği
  const hesapOf = s => { const k = kimlik(s); return k && k.accountId ? k : null; };
  const soketler = id => [...sockets()].filter(s => !s.destroyed && hesapOf(s) && hesapOf(s).accountId === id);
  const kodUret = () => { for (let d = 0; d < 50; d++) { let k = 'ORT-'; for (let i = 0; i < 4; i++) k += ALFABE[Math.floor(random() * ALFABE.length)]; if (!kodlar.has(k)) return k; } return 'ORT-' + crypto.randomBytes(3).toString('hex').toUpperCase(); };
  const gorunum = o => ({ id: o.id, kod: o.kod, tur: o.tur, anahtar: o.anahtar, ozel: o.ozel, durum: o.durum, kurucu: o.kurucu, enAz: o.tanim.enAz, enCok: o.tanim.enCok,
    uyeler: o.uyeler.map(u => ({ id: u.id, h: u.h, ad: u.ad, hazir: u.hazir, bagli: u.bagli })) });
  const yay = (o, m) => { for (const u of o.uyeler) for (const s of soketler(u.id)) send(s, m); };
  const odaYay = o => { for (const u of o.uyeler) for (const s of soketler(u.id)) send(s, { type: 'ortak_oda', oda: gorunum(o), sen: u.id }); };
  const odaOf = id => odalar.get(uyelik.get(id));
  const kuyrukCik = id => { const i = kuyruk.findIndex(k => k.id === id); if (i >= 0) kuyruk.splice(i, 1); return i >= 0; };

  function kaydet(ad, tanim) {
    if (!/^[a-z]{2,16}$/.test(ad) || typeof tanim.baslat !== 'function' || typeof tanim.eylem !== 'function') throw new Error('ortak_tur_gecersiz');
    turler.set(ad, Object.assign({ enAz: 1, enCok: 4, anahtarGecerli: () => true, bitir: () => { } }, tanim));
  }
  function odaKur(k, tur, anahtar, ozel, ad) {
    const tanim = turler.get(tur); if (!tanim) throw hata('tur_bilinmiyor');
    if (typeof anahtar !== 'string' || !/^[a-z0-9_-]{1,32}$/i.test(anahtar) || !tanim.anahtarGecerli(anahtar)) throw hata('anahtar_gecersiz');
    if (uyelik.has(k.accountId)) throw hata('zaten_odada');
    kuyrukCik(k.accountId);
    const o = { id: crypto.randomUUID(), kod: kodUret(), tur, anahtar, ozel: !!ozel, tanim, durum: 'bekliyor', kurucu: k.accountId, uyeler: [], ortak: null, kuruldu: now(), sonHareket: now() };
    odalar.set(o.id, o); kodlar.set(o.kod, o.id); uyeEkle(o, k, ad); return o;
  }
  function uyeEkle(o, k, ad) { o.uyeler.push({ id: k.accountId, h: k.handle, ad: typeof ad === 'string' && ad ? ad.slice(0, 16) : 'Gezgin', hazir: false, bagli: true, kopma: 0 }); uyelik.set(k.accountId, o.id); o.sonHareket = now(); }
  function odadanCik(o, id, neden) {
    const i = o.uyeler.findIndex(u => u.id === id); if (i < 0) return;
    o.uyeler.splice(i, 1); uyelik.delete(id); for (const s of soketler(id)) send(s, { type: 'ortak_ayrildi', neden: neden || 'cikti' });
    if (!o.uyeler.length) return odaKapat(o);
    if (o.kurucu === id) o.kurucu = o.uyeler[0].id;
    if (o.durum === 'oyunda' && o.uyeler.length < (o.tanim.oyundaEnAz ?? o.tanim.enAz)) return bitir(o, { kazanan: false, neden: 'oyuncu_kalmadi', ayrilan: id });
    odaYay(o); tikCalistir(o);   // kalanların beklediği koşul (herkes hazır, herkes çarkını çevirdi) ayrılanla birlikte değişmiş olabilir
  }
  function odaKapat(o) { for (const u of o.uyeler) uyelik.delete(u.id); odalar.delete(o.id); kodlar.delete(o.kod); }
  function basla(o) {
    o.durum = 'oyunda'; o.tohum = 1 + Math.floor(random() * 2147483646); o.ortak = o.tanim.baslat(gorunum(o), o.tohum) || {}; o.sonHareket = now();
    yay(o, { type: 'ortak_basladi', oda: gorunum(o), durum: o.ortak, tohum: o.tohum });
  }
  function bitir(o, sonuc) {
    if (o.durum === 'bitti') return; o.durum = 'bitti'; o.sonHareket = now();
    try { o.tanim.bitir(gorunum(o), sonuc, o.ortak); } catch (e) { console.error('[ortak] bitir kancası', o.tur, e.message); }
    for (const u of o.uyeler) u.hazir = false;   // rövanş için herkes yeniden hazır olur; istemci bunu ortak_bitti içindeki odadan görür
    yay(o, { type: 'ortak_bitti', sonuc, oda: gorunum(o) });
  }
  /* görev bulucu: aynı tür ve anahtarı arayanlar enCok kişiye (ya da enAz'a ulaşıp en eski bekleyen 20 sn beklediyse) dolunca oda açılır */
  function eslestir() {
    const gruplar = new Map(); for (const k of kuyruk) { const g = k.tur + ':' + k.anahtar; if (!gruplar.has(g)) gruplar.set(g, []); gruplar.get(g).push(k); }
    for (const L of gruplar.values()) { const tanim = turler.get(L[0].tur); if (!tanim) continue;
      const bekleme = now() - L[0].t, n = L.length >= tanim.enCok ? tanim.enCok : (L.length >= Math.max(2, tanim.enAz) && bekleme >= (config.kuyrukMs ?? 20000)) ? L.length : 0; if (!n) continue;
      const secilen = L.slice(0, n); for (const k of secilen) kuyrukCik(k.id);
      const o = odaKur(secilen[0].k, secilen[0].tur, secilen[0].anahtar, false, secilen[0].ad); for (const k of secilen.slice(1)) uyeEkle(o, k.k, k.ad);
      for (const u of o.uyeler) { u.hazir = true; for (const s of soketler(u.id)) send(s, { type: 'ortak_kuyruk', durum: 'yok', bulundu: true }); }
      odaYay(o); basla(o); }
  }

  function onMessage(socket, msg) {
    if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('ortak_')) return false;
    const k = hesapOf(socket); if (!k) return true;
    const t = now(); if (!socket.ortakP || t - socket.ortakP >= 1000) { socket.ortakP = t; socket.ortakN = 0; } if (++socket.ortakN > HIZ) return true;
    try {
      const o = odaOf(k.accountId);
      switch (msg.type) {
        case 'ortak_kur': { const y = odaKur(k, msg.tur, msg.anahtar, msg.ozel !== false, msg.ad); odaYay(y); break; }
        case 'ortak_katil': { if (o) throw hata('zaten_odada'); const y = odalar.get(kodlar.get(String(msg.kod || '').toUpperCase().trim())); if (!y) throw hata('oda_yok');
          if (y.durum !== 'bekliyor') throw hata('oda_mesgul'); if (y.uyeler.length >= y.tanim.enCok) throw hata('oda_dolu'); kuyrukCik(k.accountId); uyeEkle(y, k, msg.ad); odaYay(y); break; }
        case 'ortak_cik': if (o) odadanCik(o, k.accountId); else send(socket, { type: 'ortak_ayrildi' }); break;
        case 'ortak_hazir': { if (!o) throw hata('odada_degil'); if (o.durum === 'oyunda') throw hata('oda_mesgul');   /* biten örnekten sonra aynı odada yeniden hazır olunur (rövanş) */ const u = o.uyeler.find(x => x.id === k.accountId); u.hazir = msg.hazir !== false; o.sonHareket = t; odaYay(o); break; }
        case 'ortak_baslat': { if (!o) throw hata('odada_degil'); if (o.kurucu !== k.accountId) throw hata('yalniz_kurucu'); if (o.durum === 'oyunda') throw hata('oda_mesgul');
          if (o.uyeler.length < o.tanim.enAz) throw hata('oyuncu_eksik'); if (o.uyeler.some(u => u.id !== o.kurucu && !u.hazir)) throw hata('hazir_degil'); basla(o); break; }
        case 'ortak_davet': { if (!o) throw hata('odada_degil'); if (o.durum !== 'bekliyor') throw hata('oda_mesgul'); const to = String(msg.to || '');
          const hedef = [...sockets()].filter(s => !s.destroyed && hesapOf(s) && hesapOf(s).handle === to && hesapOf(s).accountId !== k.accountId); if (!hedef.length) throw hata('cevrimdisi');
          const ben = o.uyeler.find(u => u.id === k.accountId); for (const s of hedef) send(s, { type: 'ortak_davet', kod: o.kod, tur: o.tur, anahtar: o.anahtar, from: k.handle, ad: ben.ad }); send(socket, { type: 'ortak_davet_gitti', to }); break; }
        case 'ortak_kuyruk': { if (o) throw hata('zaten_odada'); const tanim = turler.get(msg.tur); if (!tanim) throw hata('tur_bilinmiyor');
          if (typeof msg.anahtar !== 'string' || !/^[a-z0-9_-]{1,32}$/i.test(msg.anahtar) || !tanim.anahtarGecerli(msg.anahtar)) throw hata('anahtar_gecersiz');
          kuyrukCik(k.accountId); kuyruk.push({ id: k.accountId, k, tur: msg.tur, anahtar: msg.anahtar, ad: typeof msg.ad === 'string' ? msg.ad.slice(0, 16) : '', t }); send(socket, { type: 'ortak_kuyruk', durum: 'ariyor' }); eslestir(); break; }
        case 'ortak_kuyruk_cik': kuyrukCik(k.accountId); send(socket, { type: 'ortak_kuyruk', durum: 'yok' }); break;
        case 'ortak_eylem': { if (!o || o.durum !== 'oyunda') throw hata('oyunda_degil'); const u = o.uyeler.find(x => x.id === k.accountId);
          // tür kancası söz döndürebilir (depo okuması gerekebilir); aynı odanın eylemleri sıraya girer, böylece durum yarışmaz
          o.sira = (o.sira || Promise.resolve()).then(async () => { if (o.durum !== 'oyunda') throw hata('oyunda_degil');
            const r = (await o.tanim.eylem(o.ortak, { id: u.id, h: u.h, ad: u.ad }, msg.eylem, gorunum(o))) || {}; o.sonHareket = now();
            yay(o, { type: 'ortak_olay', olaylar: r.olaylar || [], durum: o.ortak, kim: u.id }); if (r.bitti) bitir(o, r.bitti); })
            .catch(e => { send(socket, { type: 'ortak_hata', kod: e.kod || 'hata' }); if (!e.kod) console.error('[ortak] eylem', e.message); });
          break; }
        case 'ortak_liste': { const tur = String(msg.tur || ''); if (!turler.has(tur)) throw hata('tur_bilinmiyor');   // açık odalar: özel olmayan, bekleyen, yeri olan (en yeni önce, en çok 30)
          const L = [...odalar.values()].filter(y => y.tur === tur && !y.ozel && y.durum === 'bekliyor' && y.uyeler.length < y.tanim.enCok).sort((p, q) => q.kuruldu - p.kuruldu).slice(0, 30)
            .map(y => ({ kod: y.kod, anahtar: y.anahtar, kurucu: (y.uyeler.find(u => u.id === y.kurucu) || y.uyeler[0] || {}).ad || '', n: y.uyeler.length, enCok: y.tanim.enCok }));
          send(socket, { type: 'ortak_liste', tur, odalar: L }); break; }
        case 'ortak_durum': if (o) { send(socket, { type: 'ortak_oda', oda: gorunum(o), sen: k.accountId }); if (o.durum === 'oyunda') send(socket, { type: 'ortak_basladi', oda: gorunum(o), durum: o.ortak, tohum: o.tohum, surur: true }); } else send(socket, { type: 'ortak_ayrildi' }); break;
        default: throw hata('komut_bilinmiyor');
      }
    } catch (e) { send(socket, { type: 'ortak_hata', kod: e.kod || 'hata' }); if (!e.kod) console.error('[ortak]', e.message); }
    return true;
  }
  /* kopma: üye "bağlı değil" olur; süre içinde dönerse (ortak_durum) kaldığı yerden sürer, dönmezse odadan düşer */
  function onDisconnect(socket) {
    const k = hesapOf(socket); if (!k) return; kuyrukCik(k.accountId);
    const o = odaOf(k.accountId); if (!o) return; if (soketler(k.accountId).some(s => s !== socket)) return;
    const u = o.uyeler.find(x => x.id === k.accountId); if (!u) return; u.bagli = false; u.kopma = now(); odaYay(o); tikCalistir(o);
  }
  function onConnect(socket) { const k = hesapOf(socket); if (!k) return; const o = odaOf(k.accountId); if (!o) return; const u = o.uyeler.find(x => x.id === k.accountId); if (u && !u.bagli) { u.bagli = true; u.kopma = 0; odaYay(o); } }
  function supur() { const t = now();
    for (const o of [...odalar.values()]) { for (const u of [...o.uyeler]) if (!u.bagli && t - u.kopma >= KOPMA_MS) odadanCik(o, u.id, 'koptu');
      if (odalar.has(o.id) && o.durum !== 'oyunda' && t - o.sonHareket >= BOS_ODA_MS) { for (const u of [...o.uyeler]) odadanCik(o, u.id, 'oda_kapandi'); }
      // tik kancası: süreye bağlı kurallar (ör. hamle süresi dolan oyuncu adına karar) türün kendisindedir
      tikCalistir(o); }
    eslestir(); }
  function tikCalistir(o) { if (!odalar.has(o.id) || o.durum !== 'oyunda' || typeof o.tanim.tik !== 'function') return;
    o.sira = (o.sira || Promise.resolve()).then(async () => { if (o.durum !== 'oyunda') return;
      const r = await o.tanim.tik(o.ortak, gorunum(o)); if (!r) return; yay(o, { type: 'ortak_olay', olaylar: r.olaylar || [], durum: o.ortak, kim: null }); if (r.bitti) bitir(o, r.bitti); }).catch(e => console.error('[ortak] tik', e.message)); }
  return { kaydet, onMessage, onDisconnect, onConnect, supur, odaKimligi: hesap => { const o = odaOf(hesap); return o ? o.id : null; }, sayim: () => ({ oda: odalar.size, kuyruk: kuyruk.length, turler: [...turler.keys()] }) };
}

module.exports = { createOrtakOdalar };
