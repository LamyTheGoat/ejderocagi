/* Ejder Ocağı 2.0 · Ayarlar
   Ses düzeyleri (müzik, efekt, ortam), hareketi azaltma, arayüz boyu, çizim kalitesi, tam ekran.
   Hepsi tek nesnede kalıcıdır (localStorage 'eo2-ayar') ve açılışta uygulanır.
   Bu dosya shim.js'ten hemen sonra, oyunun öteki betiklerinden ÖNCE yüklenir: hareket tercihi, dünyayı kuran betikler
   sistem ayarını okumadan önce yerinde olmalı. Ekranın kendisi (G.open('ayarlar')) sayfa hazır olunca kaydedilir.
   Oyun kuralına, fiyata ve kayda dokunmaz. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {}, app = document.getElementById('app');
  const ANAHTAR = 'eo2-ayar';
  const VARSAYILAN = { muzik: 0.6, efekt: 0.8, ortam: 0.7, hareket: null, olcek: 'normal', kalite: 'yuksek' };      // hareket: null = sistem tercihini izle
  const OLCEK = { kucuk: 0.9, normal: 1, buyuk: 1.12 };
  const sistemMM = window.matchMedia ? window.matchMedia.bind(window) : null;
  const sistemSakin = () => !!(sistemMM && sistemMM('(prefers-reduced-motion: reduce)').matches);

  let a = Object.assign({}, VARSAYILAN), yazilamadi = false;
  try { const ham = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); if (ham && typeof ham === 'object') {
    for (const k of ['muzik', 'efekt', 'ortam']) if (typeof ham[k] === 'number' && isFinite(ham[k])) a[k] = Math.max(0, Math.min(1, ham[k]));
    if (ham.hareket === true || ham.hareket === false) a.hareket = ham.hareket;
    if (OLCEK[ham.olcek]) a.olcek = ham.olcek; if (ham.kalite === 'dengeli' || ham.kalite === 'yuksek') a.kalite = ham.kalite; } } catch (_) { }
  const yaz = () => { try { localStorage.setItem(ANAHTAR, JSON.stringify(a)); yazilamadi = false; } catch (_) { yazilamadi = true; } };
  const sakin = () => a.hareket == null ? sistemSakin() : a.hareket;

  /* Hareket tercihi: oyuncu ayarı sistem ayarından farklıysa, tercihi soran betikler oyuncununkini görür. */
  if (sistemMM) window.matchMedia = function (q) {
    if (a.hareket != null && /prefers-reduced-motion\s*:\s*reduce/.test(String(q))) { const bos = () => { }; return { matches: a.hareket, media: String(q), onchange: null, addEventListener: bos, removeEventListener: bos, addListener: bos, removeListener: bos, dispatchEvent: () => false }; }
    return sistemMM(q); };

  /* ---------- uygulama ---------- */
  function olcekUygula() { if (!app) return; app.style.removeProperty('font-size'); const k = OLCEK[a.olcek] || 1; app.dataset.olcek = a.olcek; if (k === 1) return;
    const px = parseFloat(getComputedStyle(app).fontSize); if (px > 0) app.style.setProperty('font-size', (px * k).toFixed(2) + 'px', 'important'); }
  /* Çizim kalitesi: dengeli kipte dünya daha düşük çözünürlükte çizilir, cam paneller bulanıklaştırma yapmaz. */
  const kaliteDpr = () => { const d = window.devicePixelRatio || 1; return a.kalite === 'dengeli' ? Math.max(0.85, Math.min(1.25, d * 0.75)) : Math.min(d, 2); };
  function kaliteUygula() { if (!app) return; app.classList.toggle('dengeli', a.kalite === 'dengeli'); const A = EO2.api; if (!A || !A.R || !A.R.resize) return; const r = app.getBoundingClientRect(); if (r.width && r.height) A.R.resize(r.width, r.height, kaliteDpr()); }
  function hareketUygula() { if (app) app.classList.toggle('sakin', sakin()); }
  function sesUygula() { const s = EO2.audio; if (s && s.duzey) for (const k of ['muzik', 'efekt', 'ortam']) s.duzey(k, a[k]); }
  function hepsi() { hareketUygula(); olcekUygula(); kaliteUygula(); sesUygula(); }

  EO2.ayar = {
    al: () => Object.assign({}, a), sakin, varsayilan: () => Object.assign({}, VARSAYILAN),
    koy(k, v) { if (!(k in VARSAYILAN)) return; a[k] = v; yaz();
      if (k === 'olcek') { olcekUygula(); kaliteUygula(); } else if (k === 'kalite') kaliteUygula(); else if (k === 'hareket') hareketUygula(); else if (EO2.audio && EO2.audio.duzey) EO2.audio.duzey(k, v); },
    sifirla() { a = Object.assign({}, VARSAYILAN); yaz(); hepsi(); },
  };
  hareketUygula(); olcekUygula(); if (app) app.classList.toggle('dengeli', a.kalite === 'dengeli');
  if (sistemMM) { const m = sistemMM('(prefers-reduced-motion: reduce)'); if (m.addEventListener) m.addEventListener('change', hareketUygula); }

  /* pencere boyu değişince: yazı boyu yeniden ölçülür; dünya tuvali oyunun kendi ayarından sonra bir kez daha boyutlanır */
  let bekleyen = 0;
  const yenidenOlc = () => { if (bekleyen) return; bekleyen = requestAnimationFrame(() => { bekleyen = 0; olcekUygula(); if (a.kalite === 'dengeli') kaliteUygula(); }); };
  addEventListener('resize', yenidenOlc);
  if (app && window.ResizeObserver) new ResizeObserver(yenidenOlc).observe(app);
  (function bekle() { if (!EO2.api) return setTimeout(bekle, 150); kaliteUygula(); sesUygula(); })();

  /* ---------- tam ekran ---------- */
  const tamKok = document.documentElement, tamVar = !!(tamKok.requestFullscreen || tamKok.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
  const tamAcik = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function tamDegistir() { try { if (tamAcik()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { const p = (tamKok.requestFullscreen || tamKok.webkitRequestFullscreen).call(tamKok); if (p && p.catch) p.catch(() => { if (window.toast) window.toast('Tarayıcı tam ekrana izin vermedi.'); }); } } catch (_) { } }
  EO2.ayar.tamEkran = { var: tamVar, acik: tamAcik, degistir: tamDegistir };

  /* ---------- ekran ---------- */
  function kur() { const G = EO2.game; if (!G || !G.screen) return;
    const yuzde = v => Math.round(v * 100);
    const surgu = (k, ad, alt) => '<label class="ay-surgu" style="--d:' + yuzde(a[k]) + '%"><span class="ay-ad">' + ad + '<small>' + alt + '</small></span><input type="range" min="0" max="100" step="5" value="' + yuzde(a[k]) + '" data-ses="' + k + '" aria-label="' + ad + ' düzeyi"><output>' + (a[k] > 0 ? yuzde(a[k]) : 'kapalı') + '</output></label>';
    const hap = (alan, secenekler) => '<div class="ay-hap" role="radiogroup">' + secenekler.map(s => '<button type="button" role="radio" data-' + alan + '="' + s[0] + '" aria-checked="' + (a[alan] === s[0]) + '">' + s[1] + '</button>').join('') + '</div>';
    G.screen('ayarlar', { k: 'Ses ve görüntü', t: 'Ayarlar', cls: 'ay', bg: 'bg-title', draw(body) {
      const acik = !EO2.audio || !EO2.audio.isOn || EO2.audio.isOn();
      body.innerHTML = '<div class="ay-pencere cam">' +
        '<section class="ay-bolum"><h2>Ses</h2>' + (acik ? '' : '<p class="ay-uyari">Ses kapalı. <button type="button" class="ay-bag" data-sesac>Sesi aç</button></p>') +
          surgu('muzik', 'Müzik', 'Meydanın, hanın ve arenanın ezgileri') + surgu('efekt', 'Efektler', 'Adımlar, düğmeler, dövüş') + surgu('ortam', 'Ortam', 'Çeşme, rüzgâr, kuşlar') + '</section>' +
        '<section class="ay-bolum"><h2>Görüntü</h2>' +
          '<div class="ay-secim"><span class="ay-ad">Arayüz boyu<small>Yazılar ve düğmeler</small></span>' + hap('olcek', [['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük']]) + '</div>' +
          '<div class="ay-secim"><span class="ay-ad">Çizim kalitesi<small>' + (a.kalite === 'dengeli' ? 'Dengeli: daha akıcı, pili daha az yer' : 'Yüksek: en keskin görüntü') + '</small></span>' + hap('kalite', [['yuksek', 'Yüksek'], ['dengeli', 'Dengeli']]) + '</div>' +
          '<button type="button" class="ay-anahtar" role="switch" aria-checked="' + sakin() + '" data-hareket><span class="ay-ad">Hareketi azalt<small>Geçişler ve süs animasyonları kısılır</small></span><i></i></button>' +
          (tamVar ? '<button type="button" class="ay-anahtar" role="switch" aria-checked="' + tamAcik() + '" data-tam><span class="ay-ad">Tam ekran<small>Tarayıcı çubukları gizlenir</small></span><i></i></button>' : '') + '</section>' +
        '<footer class="ay-alt">' + (yazilamadi ? '<span class="ay-uyari">Ayarlar bu tarayıcıda saklanamıyor.</span>' : '<span>Ayarlar bu cihazda saklanır.</span>') + '<button type="button" class="ay-bag" data-sifirla>Varsayılana dön</button></footer></div>';
      const ses = () => { if (EO2.audio && EO2.audio.ui) EO2.audio.ui(); }, yeniden = () => G.redraw();
      body.querySelectorAll('[data-ses]').forEach(inp => { const k = inp.dataset.ses, lb = inp.closest('.ay-surgu'), out = lb.querySelector('output');
        inp.addEventListener('input', () => { const v = +inp.value / 100; EO2.ayar.koy(k, v); lb.style.setProperty('--d', inp.value + '%'); out.textContent = v > 0 ? inp.value : 'kapalı'; });
        inp.addEventListener('change', () => { if (k === 'efekt') ses(); });
        inp.addEventListener('keydown', e => e.stopPropagation()); });
      body.querySelectorAll('[data-olcek]').forEach(b => b.addEventListener('click', () => { EO2.ayar.koy('olcek', b.dataset.olcek); ses(); yeniden(); }));
      body.querySelectorAll('[data-kalite]').forEach(b => b.addEventListener('click', () => { EO2.ayar.koy('kalite', b.dataset.kalite); ses(); yeniden(); }));
      const h = body.querySelector('[data-hareket]'); h.addEventListener('click', () => { const yeni = !sakin(); EO2.ayar.koy('hareket', yeni === sistemSakin() ? null : yeni); ses(); yeniden(); if (window.toast) window.toast(yeni ? 'Hareket azaltıldı. Dünyadaki süsler bir sonraki açılışta sadeleşir.' : 'Hareket açıldı. Dünyadaki süsler bir sonraki açılışta geri gelir.'); });
      const t = body.querySelector('[data-tam]'); if (t) t.addEventListener('click', () => { ses(); tamDegistir(); });
      const sa = body.querySelector('[data-sesac]'); if (sa) sa.addEventListener('click', () => { const b = document.getElementById('btnSound'); if (b) b.click(); yeniden(); });
      body.querySelector('[data-sifirla]').addEventListener('click', () => { EO2.ayar.sifirla(); ses(); yeniden(); });
    } });
    document.addEventListener('fullscreenchange', () => { if (G.ekran && G.ekran() === 'ayarlar') G.redraw(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur); else kur();
})();
