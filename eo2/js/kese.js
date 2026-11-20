/* Ejder Ocağı 2.0 · tek kese (EO2.kese)
   Sunucu, altının TEK doğruluk kaynağıdır. Bu dosya yalnız saf kuralları tutar (DOM'suz, tests/tek_kese.test.js);
   ağ ve kayıt işi eo2/js/ag.js'tedir.

   DÜZEN
   - Hesap birleşmeden önce (eski "iki kese"): gösterge = yerel kese + sunucudaki arena payı (ag.js `esitle`).
   - Birleşme (gold.merge, hesap başına bir kez): yerel kesenin sunucuda görünmeyen kısmı hesaba taşınır. Tutar =
     gösterge − sunucu altını, yalnız durgun anda hesaplanır (bekleyen pay, harcama, sahne tutması yokken). Böylece
     oyuncunun gördüğü sayı değişmez. Sunucu bu altını BAĞLI yazar: harcanır, takasa girmez (eskiden de girmiyordu).
   - Birleştikten sonra: `S.gold` bir erişimcidir. Okuma = son bilinen sunucu altını + gönderilmemiş yerel fark +
     yoldaki fark. Yerel koda dokunulmaz: `S.gold += n` farkı biriktirir; fark sırayla `gold.local` olarak gider.
   - Tekrarsızlık: yoldaki istek (requestId, expectedVersion, tutar) kayda yazılır, kopan bağlantıda AYNI gövdeyle
     yeniden gönderilir. Sunucu makbuzu varsa ikinci kez uygulamaz; sürüm çakışması "uygulanmadı" demektir, tutar
     bekleyen farka geri döner. Kesin ret (ör. altın yetmedi) farkı düşer: gösterge sunucu değerine döner.

   A = S.ag alanları (kayıtla saklanır): acct, tek (true), son (son bilinen sunucu altını), bek (gönderilmemiş fark),
   ucus ({ govde, tutar } | null). */
(function (root) {
  'use strict';
  const PARCA = 1000000;                                            // gold.local tek istek sınırı (server/economy_commands.js)
  const tam = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };

  /* Göstergedeki altın. `donuk`: sahne tutması sürerken (müzayede tokmağı) sunucu kısmı sabit kalır. */
  function goster(A, donuk) {
    const s = donuk != null ? donuk : tam(A.son);
    return s + tam(A.bek) + (A.ucus ? tam(A.ucus.tutar) : 0);
  }
  /* Yerel kod S.gold'a yazdı: fark bekleyene eklenir. Döner: eklenen fark. */
  function yaz(A, deger, donuk) {
    const f = tam(deger) - goster(A, donuk);
    if (f) A.bek = tam(A.bek) + f;
    return f;
  }
  /* Gönderilecek parça (sunucu tek istekte en çok 1.000.000 kabul eder). 0: gönderecek yok. */
  function parca(bek) { const b = tam(bek); return b > 0 ? Math.min(b, PARCA) : b < 0 ? Math.max(b, -PARCA) : 0; }

  /* Yanıtın anlamı. 'uygulandi': sunucu yazdı (makbuz tekrarı da). 'ayni': belirsiz (ağ, 5xx), aynı gövde yeniden.
     'geri': uygulanmadı (sürüm çakışması, oturum düştü), tutar bekleyene döner. 'dus': kesin ret, tutar düşer. */
  function anlam(hata) {
    if (!hata) return 'uygulandi';
    if (!hata.status || hata.status >= 500) return 'ayni';
    if (hata.code === 'version_conflict' || hata.status === 401 || hata.code === 'rate_limited' || hata.status === 429) return 'geri';
    return 'dus';
  }
  /* Yoldaki istek sonuçlandı: A güncellenir. `yeniSunucu`: başarıda sunucunun yeni altını. */
  function sonuc(A, hata, yeniSunucu) {
    const u = A.ucus, k = anlam(hata);
    if (!u) return k;
    if (k === 'uygulandi') { A.ucus = null; if (Number.isSafeInteger(yeniSunucu)) A.son = yeniSunucu; else A.son = tam(A.son) + tam(u.tutar); }
    else if (k === 'geri') { A.ucus = null; A.bek = tam(A.bek) + tam(u.tutar); }
    else if (k === 'dus') A.ucus = null;
    return k;
  }

  /* Birleşme tutarı: gösterge − sunucu altını. Durgun değilse null (sonra yeniden denenir). */
  function birlesmeTutari(gosterge, sunucuAltin, durgun) {
    if (!durgun || !Number.isSafeInteger(tam(gosterge)) || !Number.isSafeInteger(sunucuAltin)) return null;
    return tam(gosterge) - sunucuAltin;
  }
  /* Birleşme sunucuda uygulandı (ya da hesap zaten birleşmişti): A tek keseye geçer. `simdi`: o anki gösterge (yerel),
     `gonderilen`: istek giderken göstergedeki değer. Arada yerel kod yazdıysa o fark kaybolmaz, bekleyene geçer. */
  function tekeGec(A, sunucuAltin, simdi, gonderilen, zatenBirlesik) {
    A.tek = true; A.son = sunucuAltin; A.ucus = null;
    A.bek = zatenBirlesik ? 0 : tam(simdi) - tam(gonderilen);
    delete A.base; delete A.srv; delete A.dus;
    return A;
  }

  const api = { goster, yaz, parca, anlam, sonuc, birlesmeTutari, tekeGec, PARCA };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.EO2 = root.EO2 || {}; root.EO2.kese = api; }
})(typeof window !== 'undefined' ? window : globalThis);
