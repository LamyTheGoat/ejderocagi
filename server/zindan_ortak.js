'use strict';
// Ortak zindan seferi (Ejder Ocağı 2.0, 2026-11-16): ortak oda altyapısının (server/ortak_odalar.js) "zindan" türü.
// İlk zindan: Zümrüt Saray. Bir ile dört terbiyeci aynı örneğe girer. Akış sunucudadır:
//   bekleme (sefer kampı) → herkes hazır → aşama savaşı → çark (herkes kendi çarkını çevirir) → bekleme → … → son aşama → çark → bitti
// SAVAŞ MODELİ: "ortak düşman canı". Her oyuncu savaşı kendi ekranında oynar (js/battle.js); düşmanların canı ise TEKTİR ve
// burada durur. Oyuncu bir düşmana vurunca hasarı bildirir, sunucu candan düşer ve herkese yayar; öteki oyuncuların ekranında
// o düşmanın canı da iner. Bütün düşmanlar ölünce aşama herkes için aynı anda biter. Düşen oyuncu (Anka külü de tükendiyse)
// seyirci kalır; ayakta kimse kalmazsa aşama başarısız olur ve kampa dönülür, aynı aşama yeniden denenir.
// Böylece ağda yalnız hasar ve can bildirimleri dolaşır; konum ve mermi eşlemesi gerekmez, bağlantı gecikmesi oynanışı bozmaz.
// ÖDÜL burada YAZILMAZ: aşama ve zindan ödülleri ile çark, tek oyunculu seferdeki kurallarla istemcide işlenir (js/topcu.js odulYaz;
// miktar ve olasılıklar değişmedi). Sunucu yalnız "aşama temizlendi" ve "sefer bitti" gerçeğini söyler.
// Düşman canları burada tanımlıdır (istemci canı buradan alır): sayılar tek oyunculu Sırça Saray seferindeki aynı düşmanların canlarıdır.
// Parti çarpanı: can × (1 + 0,5 × (oyuncu − 1)). Zorluk çarpanı tek oyunculu seferle aynıdır (normal 0,75; ağır 1,0).
//
// EYLEMLER (ortak_eylem.eylem)
//   { t: 'hazir', v }            kampta: bu aşamaya hazırım / değilim
//   { t: 'hasar', i, h }         savaşta: i numaralı düşmana h hasar verdim (i: aşamadaki düşman sırası)
//   { t: 'can', hp, max }        savaşta: canım (arkadaşların çerçevesinde görünür)
//   { t: 'dustu' }               savaşta: düştüm (Anka külü tükendi)
//   { t: 'cark' }                çarkta: çarkımı çevirdim, hazırım
// OLAYLAR (ortak_olay.olaylar): asama_basla { asama, dusman } · hasar { kim, i, h, hp } · can { kim, hp, max } · dustu { kim } ·
//   asama_bitti { zafer, asama, son } · kampa_don { asama } · hazir { kim, v } · cark { kim }
const ZORLUK = { normal: 0.75, zor: 1.0 };
const ZINDANLAR = {
  zumrut: { ad: 'Zümrüt Saray', asama: [
    // Zümrüt Saray Köprüsü: iki yandan gelen yılanlar (solda iki, sağda iki)
    { ad: 'Zümrüt Saray Köprüsü', dusman: [{ hp: 760 }, { hp: 800 }, { hp: 760 }, { hp: 800 }] },
    // Şahmeran'ın defilesi: iki taht muhafızı ve sağ uçta yükseltide Şahmeran
    { ad: 'Şahmeran\'ın Defilesi', dusman: [{ hp: 640 }, { hp: 640 }, { hp: 3600, boss: true }] },
  ] },
};
const HASAR_UST = 6000;   // tek bildirimde kabul edilen en büyük hasar (hata ve bozuk veri süzgeci; denge kuralı değildir)
const hata = kod => Object.assign(new Error(kod), { kod });
const partiCarpan = n => 1 + 0.5 * (Math.max(1, n) - 1);

function createZindanOrtak() {
  const bagli = oda => oda.uyeler.filter(u => u.bagli).map(u => u.id);
  const uye = (d, id) => d.uye[id] || (d.uye[id] = { hazir: false, hayatta: true, hasar: 0, cark: false, hp: 0, max: 0 });
  function asamaBasla(d, oda, olaylar) { const A = ZINDANLAR[d.zindan].asama[d.asama], k = ZORLUK[d.zorluk] * partiCarpan(bagli(oda).length);
    d.faz = 'savas'; d.tur++; d.dusman = A.dusman.map(q => { const hp = Math.round(q.hp * k); return { hp, max: hp, boss: !!q.boss }; });
    for (const id in d.uye) Object.assign(d.uye[id], { hazir: false, hayatta: true, cark: false, hp: 0, max: 0 });
    olaylar.push({ t: 'asama_basla', asama: d.asama, dusman: d.dusman.map(q => q.max) }); }
  /* kuralların tek yeri: her eylemden ve süpürmeden sonra çağrılır (bağlantısı kopan ya da ayrılan üye beklenmez) */
  function degerlendir(d, oda) { const olaylar = [], aktif = bagli(oda), son = d.asama === ZINDANLAR[d.zindan].asama.length - 1; if (!aktif.length) return { olaylar };
    for (const id of aktif) uye(d, id);
    if (d.faz === 'bekleme') { if (aktif.every(id => d.uye[id].hazir)) asamaBasla(d, oda, olaylar); }
    else if (d.faz === 'savas') {
      if (d.dusman.every(q => q.hp <= 0)) { d.faz = 'cark'; for (const id in d.uye) d.uye[id].cark = false; olaylar.push({ t: 'asama_bitti', zafer: true, asama: d.asama, son }); }
      else if (!aktif.some(id => d.uye[id].hayatta)) { d.faz = 'bekleme'; d.deneme++; for (const id in d.uye) Object.assign(d.uye[id], { hazir: false, hayatta: true }); olaylar.push({ t: 'asama_bitti', zafer: false, asama: d.asama, son }); } }
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
      else if (e.t === 'dustu') { if (d.faz !== 'savas') return { olaylar }; u.hayatta = false; u.hp = 0; olaylar.push({ t: 'dustu', kim: kim.id }); }
      else if (e.t === 'cark') { if (d.faz !== 'cark') throw hata('faz_uygun_degil'); u.cark = true; olaylar.push({ t: 'cark', kim: kim.id }); }
      else throw hata('eylem_gecersiz');
      const r = degerlendir(d, oda); return { olaylar: olaylar.concat(r.olaylar), bitti: r.bitti }; },
    tik(d, oda) { const r = degerlendir(d, oda); return r.olaylar.length || r.bitti ? r : null; },
    bitir() { },
  };
  return { tanim, ZINDANLAR, ZORLUK, partiCarpan };
}

module.exports = { createZindanOrtak, ZINDANLAR, ZORLUK, partiCarpan, HASAR_UST };
