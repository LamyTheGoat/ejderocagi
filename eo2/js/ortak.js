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
  const D = { oda: null, ben: null, ortak: null, kuyruk: null, hata: '', liste: {} }, dinleyen = new Set();
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
  /* ---------- açık oda listesi ---------- */
  const listeAyar = {}, e_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function listeIc(tur) { const L = D.liste[tur] || [], A = listeAyar[tur] || {};
    return '<h3>' + e_(A.baslik || 'Açık odalar') + '</h3>' + (L.length ? '<ul>' + L.map(o => '<li><span><b>' + e_(o.kurucu || 'Terbiyeci') + '</b><small>' + e_(A.adOf ? A.adOf(o.anahtar) : '') + '</small></span><em>' + o.n + ' / ' + o.enCok + '</em><button type="button" class="gbtn kucuk altin" data-oda-kod="' + e_(o.kod) + '">Katıl</button></li>').join('') + '</ul>' : '<p class="soluk">' + e_(A.bos || 'Şu an açık oda yok.') + '</p>'); }
  function listeDugme(el) { el.querySelectorAll('[data-oda-kod]').forEach(b => b.addEventListener('click', () => { if (EO2.audio && EO2.audio.ui) EO2.audio.ui(); yolla({ type: 'ortak_katil', kod: b.dataset.odaKod, ad: ad() }); })); }
  let listeT = 0; function iste(tur, hemen) { const t = Date.now(); if (!AG.cevrimici() || (!hemen && t - listeT < 2800) || (hemen && t - listeT < 700)) return; listeT = t; AG.gonder({ type: 'ortak_liste', tur }); }
  setInterval(() => { const el = document.querySelector('[data-or-liste]'); if (el && el.offsetParent !== null) iste(el.dataset.orListe); }, 1000);
  AG.dinle('ortak_liste', m => { const yeni = JSON.stringify(m.odalar || []), eski = JSON.stringify(D.liste[m.tur] || []); D.liste[m.tur] = Array.isArray(m.odalar) ? m.odalar : []; if (yeni === eski) return;
    document.querySelectorAll('[data-or-liste="' + m.tur + '"]').forEach(el => { el.innerHTML = listeIc(m.tur); listeDugme(el); }); yay('liste', m); });
  EO2.ortak = {
    kur: (tur, anahtar, o) => yolla({ type: 'ortak_kur', tur, anahtar, ozel: !(o && o.ozel === false), ad: ad() }),
    katil: kod => yolla({ type: 'ortak_katil', kod, ad: ad() }), cik: () => yolla({ type: 'ortak_cik' }),
    hazir: v => yolla({ type: 'ortak_hazir', hazir: v !== false }), baslat: () => yolla({ type: 'ortak_baslat' }), davet: h => yolla({ type: 'ortak_davet', to: h }),
    kuyruk: (tur, anahtar) => yolla({ type: 'ortak_kuyruk', tur, anahtar, ad: ad() }), kuyrukCik: () => yolla({ type: 'ortak_kuyruk_cik' }),
    eylem: e => yolla({ type: 'ortak_eylem', eylem: e }),
    /* açık odalar (özel olmayan, bekleyen, yeri olan). Lobi ekranı listeHtml(tur, adOf, başlık, boşken) parçasını koyar, çizdikten sonra listeBagla(body) çağırır.
       Liste ekranda durdukça üç saniyede bir yenilenir ve yerinde güncellenir (ekranın geri kalanı yeniden çizilmez). */
    liste: tur => D.liste[tur] || [],
    listeHtml(tur, adOf, baslik, bos) { listeAyar[tur] = { adOf, baslik, bos }; return '<div class="or-liste" data-or-liste="' + tur + '">' + listeIc(tur) + '</div>'; },
    listeBagla(kok) { (kok || document).querySelectorAll('[data-or-liste]').forEach(el => { listeDugme(el); iste(el.dataset.orListe, true); }); },
    dinle(fn) { dinleyen.add(fn); return () => dinleyen.delete(fn); }, durum: () => D,
  };
})();
