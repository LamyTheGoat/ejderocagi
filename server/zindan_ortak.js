'use strict';
// Ortak zindan seferi (Ejder Ocağı 2.0, 2026-11-16): ortak oda altyapısının (server/ortak_odalar.js) "zindan" türü.
// İlk zindan: Zümrüt Saray. Bir ile dört terbiyeci aynı örneğe girer. Akış sunucudadır:
//   bekleme (sefer kampı) → herkes hazır → aşama savaşı → çark (herkes kendi çarkını çevirir) → bekleme → … → son aşama → çark → bitti
// SAVAŞ MODELİ: TEK ORTAK SAVAŞ (kullanıcı, 2026-11-16: "her şeyi ortak yap, senkronize online oyun istiyorum").
//   - Düşmanların canı tektir ve burada durur; bir oyuncunun hasarı herkesin ekranında düşer.
//   - SIRA tektir ve burada durur: her turda önce ayaktaki oyuncular sırayla oynar, sonra yaşayan düşmanlar sırayla saldırır.
//     Sıra kimdeyse herkesin ekranında o oynar. Rüzgârı sunucu üretir: herkes aynı rüzgârı görür.
//   - Düşman hamlesi için sunucu hedefi (ayaktaki bir oyuncu) ve bir rastgelelik tohumu seçer; bütün ekranlar aynı hamleyi
//     aynı hedefe, aynı saçılmayla oynatır. Hasarı her oyuncu yalnız kendi topçusu için hesaplar ve canını bildirir.
//   - Bir adım, ayaktaki bağlı oyuncuların hepsi "bu adım bende bitti" deyince ilerler; adımın sahibi bitirdikten sonra
//     ötekiler en çok GECIKME_MS beklenir, hiç kimse bitirmezse adımın süresi dolunca ilerlenir (kopan ya da donan beklenmez).
//   - Adımın sahibi düşmanların yerini de bildirir; sonraki adımda herkes o yerlere eşitlenir (ekranlar arası kayma birikmez).
// Düşen oyuncu (Anka külü de tükendiyse) ARENADA KALIR, savaşı izler ve sırası atlanır (kullanıcı, 2026-11-17: oturum bitene dek kimse düşürülmez); ayakta kimse kalmazsa aşama başarısız olur,
// kampa dönülür, aynı aşama yeniden denenir.
// ÖDÜL burada YAZILMAZ: aşama ve zindan ödülleri ile çark, tek oyunculu seferdeki kurallarla istemcide işlenir (js/topcu.js odulYaz;
// miktar ve olasılıklar değişmedi). Sunucu yalnız "aşama temizlendi" ve "sefer bitti" gerçeğini söyler.
// Düşman canları burada tanımlıdır (istemci canı buradan alır): sayılar tek oyunculu Sırça Saray seferindeki aynı düşmanların canlarıdır.
// Parti çarpanı: can × (1 + 0,5 × (oyuncu − 1)). Zorluk çarpanı tek oyunculu seferle aynıdır (normal 0,75; ağır 1,0).
//
// EYLEMLER (ortak_eylem.eylem)
//   { t: 'hazir', v }            kampta: bu aşamaya hazırım / değilim
//   { t: 'hasar', i, h }         savaşta: i numaralı düşmana h hasar verdim (i: aşamadaki düşman sırası)
//   { t: 'can', hp, max }        savaşta: canım (arkadaşların çerçevesinde görünür)
//   { t: 'konum', x, y, aci, yon }          savaşta: topçumun yeri ve nişanı (yoldaşların ekranında görünür)
//   { t: 'ates', x, y, aci, guc, yon, ruz, mod }  savaşta: ateş ettim (yoldaşların ekranında merminin uçuşu; hasar ayrıca 'hasar' ile gelir)
//   { t: 'dustu' }               savaşta: düştüm (Anka külü tükendi)
//   { t: 'tur_bitti', adim, ex, x, y }  savaşta: bu adım benim ekranımda bitti (ex: düşmanların yeri, x-y: topçumun yeri)
//   { t: 'cark' }                çarkta: çarkımı çevirdim, hazırım
// OLAYLAR (ortak_olay.olaylar): asama_basla { asama, dusman } · hasar { kim, i, h, hp } · can { kim, hp, max } · dustu { kim } ·
//   asama_bitti { zafer, asama, son } · kampa_don { asama } · hazir { kim, v } · cark { kim } ·
//   sira { adim, tur, tip: 'oyuncu' | 'dusman', kim, i, hedef, tohum, ruzgar, ex } · tur_bitti { kim, adim, x, y }
const ZORLUK = { normal: 0.75, zor: 1.0 };
// Zindanlar tek tarif dosyasından okunur (eo2/js/zindan_tarif.js; oyun da aynı dosyayı okur). Yeni zindan oraya eklenir; burada değişiklik gerekmez.
// Arenalar (düşman sayısı ve canları) eo2/js/arena_veri.js'ten gelir: eo2/arenalar klasörlerinden derlenir (eo2/tools/arena_derle.mjs).
const TARIF = require('../eo2/js/zindan_tarif.js'), ARENA = require('../eo2/js/arena_veri.js');
const tariftenKur = (T, AR) => { const Z = {}; for (const k in T) Z[k] = { ad: T[k].ad, asama: T[k].asama.map(ad => { const A = (AR || ARENA)[ad]; if (!A) throw new Error('arena yok: ' + ad); return { ad: A.ad, dusman: (A.dusman || []).map(q => ({ hp: q.hp, dalga: q.dalga > 1 ? q.dalga : 1 })).concat(A.boss ? [{ hp: A.boss.hp, boss: true }] : []) }; }) }; return Z; };
const ZINDANLAR = tariftenKur(TARIF);
const HASAR_UST = 6000;   // tek bildirimde kabul edilen en büyük hasar (hata ve bozuk veri süzgeci; denge kuralı değildir)
const hata = kod => Object.assign(new Error(kod), { kod });
const sinir = (v, a, b) => Math.round(Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : 0)) * 100) / 100;
const ELLER = ['ates', 'buz', 'firtina', 'toprak', 'golge', 'venom', 'magma', 'bluekor', 'talim'];
const MODLAR = ['trident', 'plus1', 'plus2', 'powUlt', 'heavy', 'crater', 'teleport'];
const SURE = { giris: 15000, oyuncu: 50000, dusman: 16000 }, GECIKME_MS = 6000;   // bağlantı koruması: oyun kuralı değil, donan ekranı beklememek için
const partiCarpan = n => 1 + 0.5 * (Math.max(1, n) - 1);

function createZindanOrtak(secenek) {
  const ZINDANLAR = secenek && secenek.tarif ? tariftenKur(secenek.tarif, secenek.arena) : module.exports.ZINDANLAR;   // testler kendi tarifini verebilir
  const now = (secenek && secenek.now) || Date.now, rast = (secenek && secenek.rast) || Math.random;
  const bagli = oda => oda.uyeler.filter(u => u.bagli).map(u => u.id);
  const uye = (d, id) => d.uye[id] || (d.uye[id] = { hazir: false, hayatta: true, hasar: 0, cark: false, hp: 0, max: 0 });
  function asamaBasla(d, oda, olaylar) { const A = ZINDANLAR[d.zindan].asama[d.asama], k = ZORLUK[d.zorluk] * partiCarpan(bagli(oda).length);
    d.faz = 'savas'; d.tur++; d.dusman = A.dusman.map(q => { const hp = Math.round(q.hp * k); return { hp, max: hp, boss: !!q.boss, dalga: q.dalga || 1 }; });   // dalga: önceki dalgalar inmeden sıra almaz (ekranda da yoktur)
    for (const id in d.uye) Object.assign(d.uye[id], { hazir: false, hayatta: true, cark: false, hp: 0, max: 0 });
    d.sav = { adim: 0, tur: 0, tip: 'giris', kim: null, i: -1, hedef: null, tohum: 0, ruzgar: 0, t0: now(), tb: 0, bitti: {}, kuyruk: [], ex: null };
    olaylar.push({ t: 'asama_basla', asama: d.asama, dusman: d.dusman.map(q => q.max) }); }
  const ayakta = (d, oda) => bagli(oda).filter(id => d.uye[id] && d.uye[id].hayatta);
  /* sıradaki adım: turun kuyruğu boşsa yeni tur kurulur (önce oyuncular, sonra düşmanlar); düşen oyuncu ve ölen düşman atlanır */
  function ilerle(d, oda, olaylar) { const s = d.sav, canli = ayakta(d, oda); if (!canli.length) return;
    for (let k = 0; k < 60; k++) {
      if (!s.kuyruk.length) { s.tur++; s.kuyruk = canli.map(id => ({ p: id })).concat(d.dusman.map((q, i) => ({ e: i }))); }
      const n = s.kuyruk.shift();
      if (n.p) { if (!canli.includes(n.p)) continue; Object.assign(s, { tip: 'oyuncu', kim: n.p, i: -1, hedef: null, tohum: 0, ruzgar: Math.round((rast() * 4.6 - 2.3) * 10) / 10 }); }
      else { if (!(d.dusman[n.e].hp > 0)) continue; const dalga = Math.min(...d.dusman.filter(q => q.hp > 0 && !q.boss).map(q => q.dalga || 1), 99); if (!d.dusman[n.e].boss && (d.dusman[n.e].dalga || 1) > dalga) continue;   // bekleyen dalga sıra almaz
        Object.assign(s, { tip: 'dusman', kim: null, i: n.e, hedef: canli[Math.floor(rast() * canli.length) % canli.length], tohum: 1 + Math.floor(rast() * 2147483646) }); }
      s.adim++; s.t0 = now(); s.tb = 0; s.bitti = {};
      olaylar.push({ t: 'sira', adim: s.adim, tur: s.tur, tip: s.tip, kim: s.kim, i: s.i, hedef: s.hedef, tohum: s.tohum, ruzgar: s.ruzgar, ex: s.ex }); return; } }
  /* kuralların tek yeri: her eylemden ve süpürmeden sonra çağrılır (bağlantısı kopan ya da ayrılan üye beklenmez) */
  function degerlendir(d, oda) { const olaylar = [], aktif = bagli(oda), son = d.asama === ZINDANLAR[d.zindan].asama.length - 1; if (!aktif.length) return { olaylar };
    for (const id of aktif) uye(d, id);
    if (d.faz === 'bekleme') { if (aktif.every(id => d.uye[id].hazir)) asamaBasla(d, oda, olaylar); }
    else if (d.faz === 'savas') {
      if (d.dusman.every(q => q.hp <= 0)) { d.faz = 'cark'; for (const id in d.uye) d.uye[id].cark = false; olaylar.push({ t: 'asama_bitti', zafer: true, asama: d.asama, son }); }
      else if (!aktif.some(id => d.uye[id].hayatta)) { d.faz = 'bekleme'; d.deneme++; for (const id in d.uye) Object.assign(d.uye[id], { hazir: false, hayatta: true }); olaylar.push({ t: 'asama_bitti', zafer: false, asama: d.asama, son }); }
      else if (d.sav) { const s = d.sav, canli = ayakta(d, oda), t = now();
        if ((s.tip === 'oyuncu' && !canli.includes(s.kim)) || canli.every(id => s.bitti[id]) || (s.tb && t - s.tb >= GECIKME_MS) || t - s.t0 >= SURE[s.tip]) ilerle(d, oda, olaylar); } }
    else if (d.faz === 'cark') { if (aktif.every(id => d.uye[id].cark)) {
      if (son) { d.faz = 'bitti'; return { olaylar, bitti: { kazanan: true, zindan: d.zindan, zorluk: d.zorluk } }; }
      d.asama++; d.faz = 'bekleme'; d.deneme = 0; for (const id in d.uye) d.uye[id].hazir = false; olaylar.push({ t: 'kampa_don', asama: d.asama }); } }
    return { olaylar }; }
  const tanim = {
    enAz: 1, enCok: 4,
    anahtarGecerli: a => { const [z, zr] = String(a).split('-'); return !!ZINDANLAR[z] && !!ZORLUK[zr]; },
    baslat(oda) { const [zindan, zorluk] = oda.anahtar.split('-'), d = { zindan, zorluk, asama: 0, n: ZINDANLAR[zindan].asama.length, faz: 'bekleme', tur: 0, deneme: 0, dusman: [], uye: {} };
      for (const u of oda.uyeler) uye(d, u.id); return d; },
    eylem(d, kim, e, oda) { if (!e || typeof e !== 'object') throw hata('eylem_gecersiz'); const u = uye(d, kim.id), olaylar = [];
      if (e.t === 'hazir') { if (d.faz !== 'bekleme') throw hata('faz_uygun_degil'); u.hazir = e.v !== false; olaylar.push({ t: 'hazir', kim: kim.id, v: u.hazir }); }
      else if (e.t === 'hasar') { if (d.faz !== 'savas') return { olaylar };   // aşama bitmişken yolda kalan hasar bildirimi sessizce düşer
        const q = d.dusman[e.i], h = Math.floor(+e.h); if (!q || !(h > 0)) throw hata('eylem_gecersiz'); if (q.hp <= 0 || !u.hayatta) return { olaylar };
        const v = Math.min(h, HASAR_UST, q.hp); q.hp -= v; u.hasar += v; if (q.boss && q.hp <= 0) for (const o of d.dusman) o.hp = 0;   // boss düşünce yanındakiler de düşer (savaş motorunun kuralı)
        olaylar.push({ t: 'hasar', kim: kim.id, i: e.i, h: v, hp: q.hp }); }
      else if (e.t === 'can') { if (d.faz !== 'savas') return { olaylar }; u.max = Math.max(1, Math.min(99999, Math.floor(+e.max) || 1)); u.hp = Math.max(0, Math.min(u.max, Math.floor(+e.hp) || 0)); olaylar.push({ t: 'can', kim: kim.id, hp: u.hp, max: u.max }); }
      else if (e.t === 'konum' || e.t === 'ates') { if (d.faz !== 'savas' || !u.hayatta) return { olaylar };   // yoldaşların ekranında topçunun yeri, nişanı ve atışı (yalnız görüntü)
        const o = { t: e.t, kim: kim.id, x: sinir(e.x, 0, 64), y: sinir(e.y, -10, 40), aci: sinir(e.aci, -10, 70), yon: e.yon === -1 ? -1 : 1 };
        if (e.t === 'ates') { o.guc = sinir(e.guc, 0, 1); o.ruz = sinir(e.ruz, -6, 6); o.mod = {}; for (const k of MODLAR) if (e.mod && e.mod[k]) o.mod[k] = true; o.el = ELLER.includes(e.el) ? e.el : ''; }   // el: topun elementi (yoldaşların ekranında lav havuzu gibi izler için; yalnız görüntü)
        olaylar.push(o); return { olaylar }; }
      else if (e.t === 'oyuk') { if (d.faz !== 'savas') return { olaylar }; olaylar.push({ t: 'oyuk', kim: kim.id, x: sinir(e.x, -4, 68), y: sinir(e.y, -10, 40), r: sinir(e.r, 0.2, 6) }); return { olaylar }; }   // güllenin açtığı oyuk: atanın ekranındaki yer (zemin her ekranda aynı kalsın; yalnız görüntü)
      else if (e.t === 'tur_bitti') { const s = d.sav; if (d.faz !== 'savas' || !s || e.adim !== s.adim) return { olaylar };   // eski adımın bildirimi sessizce düşer
        s.bitti[kim.id] = true; const sahip = s.tip === 'oyuncu' ? s.kim === kim.id : s.tip === 'dusman' ? s.hedef === kim.id : true;
        if (sahip) { s.tb = s.tb || now(); if (Array.isArray(e.ex)) s.ex = e.ex.slice(0, d.dusman.length).map(x => sinir(x, 0, 64)); }
        olaylar.push({ t: 'tur_bitti', kim: kim.id, adim: s.adim, x: sinir(e.x, 0, 64), y: sinir(e.y, -10, 40) }); }
      else if (e.t === 'dustu') { if (d.faz !== 'savas') return { olaylar }; u.hayatta = false; u.hp = 0; olaylar.push({ t: 'dustu', kim: kim.id }); }
      else if (e.t === 'cark') { if (d.faz !== 'cark') throw hata('faz_uygun_degil'); u.cark = true; olaylar.push({ t: 'cark', kim: kim.id }); }
      else throw hata('eylem_gecersiz');
      const r = degerlendir(d, oda); return { olaylar: olaylar.concat(r.olaylar), bitti: r.bitti }; },
    tik(d, oda) { const r = degerlendir(d, oda); return r.olaylar.length || r.bitti ? r : null; },
    bitir() { },
  };
  return { tanim, ZINDANLAR, ZORLUK, partiCarpan };
}

module.exports = { createZindanOrtak, ZINDANLAR, ZORLUK, partiCarpan, HASAR_UST, SURE, GECIKME_MS };
