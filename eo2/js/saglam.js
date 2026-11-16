/* Ejder Ocağı 2.0 · Sağlamlık: sekme arka plandayken susma, ses tercihinin kalıcılığı, hata yakalama,
   yükleme hatasında yeniden deneme, görüntü bağlamı kaybı. Oyun kurallarına dokunmaz. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {}, $ = id => document.getElementById(id);
  const sakla = { al(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, yaz(k, v) { try { localStorage.setItem(k, v); } catch (_) { } } };

  /* ---- hata günlüğü: son 30 hata bellekte durur (sorun bildirirken okunur), oyuncuya tek sade bildirim ---- */
  const hatalar = EO2.hatalar = []; let sonUyari = 0;
  /* ilk hatadan birkaç saniye sonra hata günlüğü sunucuya bir kez gider (/api/report, otomatik). Oyuncunun yazdığı bir şey,
     kayıt ya da altın gitmez: yalnız hata metinleri, sürüm, sahne ve ekran ölçüsü. Sayfa başına tek bildirim; sunucuda hız sınırı var. */
  let bildirildi = false;
  function otomatikBildir() {
    if (bildirildi) return; bildirildi = true;
    setTimeout(() => { try {
      const A = EO2.api, ilk = hatalar[0] || { mesaj: 'bilinmeyen' };
      fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true,
        body: JSON.stringify({ otomatik: true, metin: '[otomatik] ' + ilk.mesaj + (ilk.yer ? ' @ ' + ilk.yer : ''), surum: EO2.surum || '', sahne: A && A.scene ? A.scene() : '', ekran: innerWidth + 'x' + innerHeight + '@' + (devicePixelRatio || 1), tarayici: navigator.userAgent, hatalar: hatalar.slice(-30) }) }).catch(() => { });
    } catch (_) { /* bildirim başarısızsa oyun etkilenmez */ } }, 4000);
  }
  function hata(tur, mesaj, yer) {
    hatalar.push({ t: Date.now(), tur, mesaj: String(mesaj).slice(0, 300), yer: yer || '' }); if (hatalar.length > 30) hatalar.shift();
    otomatikBildir();
    const simdi = Date.now(); if (simdi - sonUyari < 15000) return; sonUyari = simdi;
    const de = typeof window.toast === 'function' ? window.toast : null;
    if (de && EO2.game && EO2.game.live) de('Bir şey ters gitti. Kaydın yerinde; sorun sürerse sayfayı yenile.');
  }
  window.addEventListener('error', e => { if (e && e.message) hata('hata', e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || 0)); });
  window.addEventListener('unhandledrejection', e => hata('söz', (e.reason && (e.reason.message || e.reason)) || 'bilinmeyen'));

  /* ---- yükleme hatası ve görüntü bağlamı kaybı: aynı perde, "Yeniden dene" düğmesiyle ---- */
  function perde(yazi) {
    const l = $('loading'), t = $('loadtxt'); if (!l || !t) return; l.classList.remove('gone'); t.textContent = yazi;
    if (!l.querySelector('.yeniden')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gbtn altin yeniden'; b.textContent = 'Yeniden dene'; b.addEventListener('click', () => location.reload()); l.appendChild(b); b.focus(); }
  }
  const lt = $('loadtxt');
  if (lt) new MutationObserver(() => { if (/^Yüklenemedi/.test(lt.textContent) && !$('loading').querySelector('.yeniden')) perde('Oyun yüklenemedi. Bağlantını denetleyip yeniden dene.'); }).observe(lt, { childList: true, characterData: true, subtree: true });
  const tuval = $('world');
  if (tuval) tuval.addEventListener('webglcontextlost', e => { e.preventDefault(); hata('görüntü', 'webglcontextlost'); setTimeout(() => perde('Görüntü kesildi. Kaydın yerinde; oyunu yeniden başlat.'), 600); });
  if (tuval && !window.WebGLRenderingContext) perde('Bu tarayıcı oyunun çizimini desteklemiyor. Güncel bir Chrome, Edge, Firefox ya da Safari ile aç.');

  /* ---- ses: sekme gizlenince sus, geri gelince sür; aç/kapa tercihi hatırlanır ---- */
  document.addEventListener('visibilitychange', () => { if (EO2.audio && EO2.audio.duraklat) EO2.audio.duraklat(document.hidden); });
  (function bekle() {
    const b = $('btnSound'); if (!EO2.api || !b) return setTimeout(bekle, 150);
    if (sakla.al('eo2-ses') === '0' && b.getAttribute('aria-pressed') !== 'false') b.click();
    b.addEventListener('click', () => sakla.yaz('eo2-ses', b.getAttribute('aria-pressed') === 'false' ? '0' : '1'));
  })();
})();
