/* Ejder Ocağı 2.0 · eski çizim katmanı barındırıcısı
   Bazı sistemler (gök yarışı gibi gerçek zamanlı küçük oyunlar) kendi sahnelerini kendi çizer: yüzlerce satırlık fizik ve çizim
   kodu oyunun kendisidir ve aynen kullanılır. Bu dosya o sahneyi 2.0'ın içinde bir gölge kökte (Shadow DOM) barındırır:
   eski stil yalnız o sahnenin içinde geçerlidir, 2.0 arayüzüne karışmaz. shim.js'teki $ / showModal / closeModal buraya bağlıdır;
   sahnedeki data-a düğmeleri verilen eylem tablosuna yönlendirilir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  /* oyunun görsel adresleri (ASSETS) 2.0 sayfası başka klasörden açıldığı için mutlak adrese çevrilir */
  if (typeof ASSETS !== 'undefined') for (const k in ASSETS) if (typeof ASSETS[k] === 'string' && !/^(https?:|data:|blob:|\/)/.test(ASSETS[k])) ASSETS[k] = G.url(ASSETS[k]);
  const fix = s => String(s).replace(/(src=["']|href=["']|url\(\s*["']?)(img|assets|sfx)\//g, (m, a, b) => a + G.url(b + '/'));
  let cssText = null; async function css() { if (cssText != null) return cssText; try { cssText = fix((await (await fetch(OLD + 'style.css')).text()).replace(/:root\b/g, ':host')); } catch (e) { cssText = ''; } return cssText; }
  G.eskiCss = css; css();
  const EXTRA = ':host{position:fixed;inset:0;z-index:72;display:block;font-family:"Alegreya Sans",system-ui,sans-serif;color:#f4ead6;animation:es-gel .3s}@keyframes es-gel{from{opacity:0}}#modal-root{position:absolute;inset:0}.scrim{position:absolute;inset:0;display:grid;place-items:center;background:rgba(4,4,10,.9)}.scrim>.modal{width:100%;height:100%;max-width:none;max-height:none;margin:0;border-radius:0;box-sizing:border-box}' +
    /* Saray podyum gösterisi: sahne ekranın tamamını kaplar; büyük ekranda yazılar ve düğmeler orantılı büyür */
    '.carem.saraym{position:absolute;inset:0;height:auto;overflow-y:auto}@media (min-width:1400px) and (min-height:760px){.carem.saraym{zoom:1.18}}';
  let host = null, root = null, acts = null, onClose = null;
  const E = window.EO2_ESKI = {
    open(a, kapaninca) { acts = a; onClose = kapaninca || null; G.mesgul = true; },
    async show(html, cls) { if (!acts) return; if (!host) { host = document.createElement('div'); host.className = 'eski'; document.getElementById('app').appendChild(host); root = host.attachShadow({ mode: 'open' }); window.EO2_GOLGE = root;
        root.innerHTML = '<style>' + (cssText || '') + EXTRA + '</style><div id="modal-root"><div class="scrim"><div class="modal"></div></div></div>';
        root.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-a]'); if (!el || !acts) return; const fn = acts[el.dataset.a]; if (fn) { if (EO2.audio) EO2.audio.ui(); fn(el); } });
        if (cssText == null) css().then(t => { const st = root && root.querySelector('style'); if (st) st.textContent = t + EXTRA; }); }
      const m = root.querySelector('.modal'); m.className = 'modal ' + (cls || ''); m.innerHTML = fix(html); },
    close() { if (host) host.remove(); host = null; root = null; window.EO2_GOLGE = null; acts = null; G.mesgul = false; const f = onClose; onClose = null; if (f) f(); },
    active: () => !!host,
  };
})();
