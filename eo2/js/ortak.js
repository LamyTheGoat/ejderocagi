/* Ejder Ocağı 2.0 · Ortak PvE altyapısının istemci ucu (EO2.ortak)
   Sunucu tarafı: server/ortak_odalar.js. Bu dosya OYNANIŞ ve EKRAN içermez: örnek odaları için ince bir arayüzdür.
   Zindan, kervan, boss gibi türleri uygulayan sistem bu arayüzü kullanır; protokol eo2/docs/ORTAK_PVE_ALTYAPISI.md içinde.

     EO2.ortak.kur(tur, anahtar, { ozel })   oda kurar (özel: yalnız kodla ya da davetle girilir)
     EO2.ortak.katil(kod)  .cik()  .hazir(v)  .baslat()  .davet(hesapAdi)
     EO2.ortak.kuyruk(tur, anahtar)  .kuyrukCik()      görev bulucu: eşleşince oda kendiliğinden açılıp başlar
     EO2.ortak.eylem(nesne)                            örnek içi eylem; sunucu doğrular ve herkese olay olarak yayar
     EO2.ortak.dinle(fn) → kapatıcı                    fn(olay, veri): 'oda' | 'ayrildi' | 'basladi' | 'olay' | 'bitti' | 'kuyruk' | 'davet' | 'hata'
     EO2.ortak.durum()                                 { oda, ben, ortak (sunucudaki ortak durum), kuyruk, hata }
   Bağlantı kopup geri gelince sunucudan güncel oda ve ortak durum yeniden istenir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!AG) return;
  const D = { oda: null, ben: null, ortak: null, kuyruk: null, hata: '' }, dinleyen = new Set();
  const yay = (olay, veri) => { for (const fn of [...dinleyen]) { try { fn(olay, veri); } catch (e) { console.error('ortak dinleyici', e); } } };
  const ad = () => (G && G.ad ? G.ad() : '');
  const yolla = o => { D.hata = ''; if (AG.gonder(o)) return true; D.hata = 'baglanti_yok'; yay('hata', { kod: 'baglanti_yok' }); return false; };
  AG.dinle('ortak_oda', m => { D.oda = m.oda; D.ben = m.sen; if (m.oda.durum !== 'oyunda' && m.oda.durum !== 'bitti') D.ortak = null; yay('oda', m.oda); });
  AG.dinle('ortak_ayrildi', m => { D.oda = null; D.ortak = null; yay('ayrildi', m); });
  AG.dinle('ortak_basladi', m => { D.oda = m.oda; D.ortak = m.durum; yay('basladi', m); });
  AG.dinle('ortak_olay', m => { D.ortak = m.durum; yay('olay', m); });
  AG.dinle('ortak_bitti', m => { D.oda = m.oda; yay('bitti', m); });
  AG.dinle('ortak_kuyruk', m => { D.kuyruk = m.durum === 'ariyor' ? 'ariyor' : null; yay('kuyruk', m); });
  AG.dinle('ortak_davet', m => yay('davet', m));
  AG.dinle('ortak_davet_gitti', m => yay('davet_gitti', m));
  AG.dinle('ortak_hata', m => { D.hata = m.kod; yay('hata', m); });
  AG.dinle('durum', d => { if (d === 'cevrimici') { D.kuyruk = null; setTimeout(() => AG.gonder({ type: 'ortak_durum' }), 600); } });
  EO2.ortak = {
    kur: (tur, anahtar, o) => yolla({ type: 'ortak_kur', tur, anahtar, ozel: !(o && o.ozel === false), ad: ad() }),
    katil: kod => yolla({ type: 'ortak_katil', kod, ad: ad() }), cik: () => yolla({ type: 'ortak_cik' }),
    hazir: v => yolla({ type: 'ortak_hazir', hazir: v !== false }), baslat: () => yolla({ type: 'ortak_baslat' }), davet: h => yolla({ type: 'ortak_davet', to: h }),
    kuyruk: (tur, anahtar) => yolla({ type: 'ortak_kuyruk', tur, anahtar, ad: ad() }), kuyrukCik: () => yolla({ type: 'ortak_kuyruk_cik' }),
    eylem: e => yolla({ type: 'ortak_eylem', eylem: e }),
    dinle(fn) { dinleyen.add(fn); return () => dinleyen.delete(fn); }, durum: () => D,
  };
})();
