/* Ejder Ocağı 2.0 · oyuncu hunisi (EO2.huni)
   Oyuncunun ilerleme işaretlerini kendi sunucumuza bildirir (server/huni_service.js, POST /api/huni). Üçüncü taraf yoktur;
   giden tek şey adımın adıdır ('ad', 'hafta1' gibi): ad, metin, kayıt ya da cihaz bilgisi gitmez.
   Sunucu her adımı hesap başına bir kez sayar; burada da gönderilen adımlar hesap başına hatırlanır ki her açılışta yeniden gitmesin.
   'sayfa' her açılışta gider: sunucu "ertesi gün döndü mü" sorusunu bundan kendi saatiyle hesaplar.
   Çevrimdışıyken adımlar yerel depoda bekler, bağlantı gelince gider. Otomatik denetimlerde (navigator.webdriver) hiçbir şey gönderilmez. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};
  const BEKLEYEN = 'eo2.huni.bekleyen', GIDEN = 'eo2.huni.giden.', HER_SEFER = new Set(['sayfa']);
  const kapali = navigator.webdriver && !window.__huniDene;
  const oku = (k, v) => { try { const j = JSON.parse(localStorage.getItem(k) || 'null'); return Array.isArray(j) ? j : v; } catch (_) { return v; } };
  const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } };
  const bekleyen = new Set(oku(BEKLEYEN, []).filter(a => typeof a === 'string' && !HER_SEFER.has(a)).slice(0, 20));
  let gidiyor = false, buSayfa = new Set();

  async function gonder() {
    const AG = EO2.ag;
    if (kapali || gidiyor || !bekleyen.size || !AG || !AG.cevrimici()) return;
    const k = AG.kimlik(); if (!k) return;
    const giden = new Set(oku(GIDEN + k.accountId, []));
    for (const a of [...bekleyen]) if (!HER_SEFER.has(a) && giden.has(a)) bekleyen.delete(a);
    const liste = [...bekleyen]; if (!liste.length) return yaz(BEKLEYEN, []);
    gidiyor = true;
    try {
      await AG.istek('/api/huni', { body: { adimlar: liste } });
      for (const a of liste) { bekleyen.delete(a); if (!HER_SEFER.has(a)) giden.add(a); }
      yaz(GIDEN + k.accountId, [...giden]);
    } catch (e) {
      // 400 (bilinmeyen adım) bir daha denenmez; bağlantı, 401, 429 ve 5xx sonra yeniden denenir
      if (e.status === 400) for (const a of liste) bekleyen.delete(a);
    } finally {
      gidiyor = false;
      yaz(BEKLEYEN, [...bekleyen].filter(a => !HER_SEFER.has(a)));
      if (bekleyen.size && [...bekleyen].some(a => !liste.includes(a))) setTimeout(gonder, 0);   // gönderim sırasında yeni adım geldi
    }
  }

  /* EO2.huni('ad'): adımı işaretler. Bir sayfa açılışında aynı adım bir kez işlenir. */
  EO2.huni = function (adim) {
    if (kapali || typeof adim !== 'string' || buSayfa.has(adim)) return;
    buSayfa.add(adim); bekleyen.add(adim);
    if (!HER_SEFER.has(adim)) yaz(BEKLEYEN, [...bekleyen].filter(a => !HER_SEFER.has(a)));
    gonder();
  };
  /* hafta sonu: bitirilen hafta sayısına göre eşik adımları */
  EO2.huni.hafta = function (biten, sezonBitti) {
    if (biten >= 1) EO2.huni('hafta1');
    if (biten >= 5) EO2.huni('hafta5');
    if (biten >= 10) EO2.huni('hafta10');
    if (sezonBitti) EO2.huni('sezon');
  };

  EO2.huni('sayfa');
  if (document.readyState === 'complete') EO2.huni('yuklendi');
  else addEventListener('load', () => EO2.huni('yuklendi'), { once: true });
  const bagla = () => { if (!EO2.ag) return setTimeout(bagla, 200); EO2.ag.dinle('durum', d => { if (d === 'cevrimici') gonder(); }); gonder(); };
  bagla();
})();
