/* Ejder Ocağı 2.0 · Telefon davranışı (oyun kuralı içermez)
   1) Uzun basma menüsü: dokunmatik ekranda resme ya da düğmeye uzun basınca çıkan tarayıcı menüsü (resmi kaydet, kopyala)
      oyunun içinde kapatılır; yazı alanlarında ve sohbet günlüğünde açık kalır.
   2) Yatay öneri: telefon dik tutuluyorsa giriş ekranında bir kez, küçük bir öneri çıkar. Oyun dik de oynanır; öneri engellemez.
      "Yatay oyna" tam ekrana geçip yönü kilitlemeyi dener (Android Chrome destekler; iOS Safari desteklemez, orada yalnız öneri kalır). */
(function () {
  'use strict';
  const app = document.getElementById('app'); if (!app) return;
  const dokunmatik = matchMedia('(pointer: coarse)').matches;
  const sakla = { al(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, yaz(k, v) { try { localStorage.setItem(k, v); } catch (_) { } } };

  /* ---- uzun basma menüsü ---- */
  app.addEventListener('contextmenu', e => { if (!dokunmatik) return; const t = e.target; if (t && t.closest && t.closest('input, textarea, #chatLog, #dlgText, a[href]')) return; e.preventDefault(); });

  /* ---- yatay öneri ---- */
  if (!dokunmatik) return;
  const dik = () => innerHeight > innerWidth && innerWidth < 620;
  let kutu = null;
  const kapat = kalici => { if (kutu) { kutu.remove(); kutu = null; } if (kalici) sakla.yaz('eo2.yatayOneri', '1'); };
  async function yatay() {
    const kok = document.documentElement;
    try { const p = (kok.requestFullscreen || kok.webkitRequestFullscreen || (() => null)).call(kok); if (p && p.then) await p; } catch (_) { /* tam ekran reddedildi */ }
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (_) { /* yön kilidi desteklenmiyor: oyuncu telefonu kendisi çevirir */ }
    kapat(true);
  }
  function goster() {
    if (kutu || !dik() || sakla.al('eo2.yatayOneri')) return;
    kutu = document.createElement('div'); kutu.className = 'yatay-oneri'; kutu.setAttribute('role', 'status');
    kutu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="2.5" width="9" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20.5h13a3 3 0 0 0 3-3V15m0 0-2 2m2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>Telefonu yatay tutarsan meydan daha geniş görünür.</span><button type="button" class="yo-evet">Yatay oyna</button><button type="button" class="yo-hayir" aria-label="Öneriyi kapat">Kapat</button>';
    kutu.querySelector('.yo-evet').addEventListener('click', yatay); kutu.querySelector('.yo-hayir').addEventListener('click', () => kapat(true));
    app.appendChild(kutu);
  }
  const denetle = () => { if (dik()) goster(); else kapat(false); };
  addEventListener('resize', denetle); addEventListener('orientationchange', denetle);
  setTimeout(denetle, 1500);
})();
