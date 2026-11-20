/* Ejder Ocağı 2.0 · seyirci panelleri (2026-11-20)
   İlk sürümün maç içi çizgi roman panelleri (js/pip.js: simitçi, coşan tribün, yuhalayan, hakem, uyuklayan ihtiyar, bahisçi,
   rakip terbiyeci, laf atan boss...) 2.0 dövüş sahnesine taşındı. Seçim kuralı aynıdır: olaya uyan adaylardan ağırlıkla biri,
   turda en çok bir panel, iki tur bekleme, maç başına en çok beş panel, aynı kişi bir maçta bir kez.
   YALNIZ GÖRÜNTÜ: eski panellerin dövüşe etkisi (öfke, nefes, şifa) burada uygulanmaz. Dövüşü sunucu kendi tohumuyla yeniden
   oynatıp ödülü öyle yazar; istemcide dövüşü değiştiren bir panel sunucuyla ayrışırdı. Şifacı paneli bu yüzden çıkmaz
   (iyileştirmeyen şifacı yanıltır). Hareketi azalt ayarında panel kayarak değil yerinde belirir; hızlı kipte hiç çıkmaz. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, app = document.getElementById('app');
  const DISI = { sifaci: 1 };
  const yol = k => { const a = typeof asset === 'function' ? asset(k) : ''; return a ? (/^(img|assets)\//.test(a) ? G.url(a) : a) : ''; };
  let D = null;   // { n, cd, seen, simdi, missRow }
  function sifirla() { D = { n: 0, cd: 0, seen: {}, simdi: false }; if (window.FT) window.FT.missRow = 0; }
  /* ev: dövüş olayı ya da { act: 'round' } (tur başı); F: dövüş durumu */
  function olay(ev, F) { const FT = window.FT; if (!FT || !F || window.__fastFx || typeof PIP === 'undefined') return; if (!D) sifirla();
    if (ev.who === 'p' && (ev.dmg != null || ev.miss)) FT.missRow = ev.miss ? (FT.missRow || 0) + 1 : 0;
    if (ev.act === 'round' && D.cd > 0) D.cd--;
    if (D.n >= 5 || D.cd > 0 || D.simdi) return;
    let ad; try { ad = PIP.filter(p => !DISI[p.id] && !D.seen[p.id] && yol(p.ch) && p.when(ev, F)); } catch (e) { return; }
    if (!ad.length || Math.random() * 100 >= (ev.act === 'round' ? 75 : 88)) return;
    let r = Math.random() * ad.reduce((t, p) => t + p.w, 0), P = ad[0]; for (const c of ad) { r -= c.w; if (r <= 0) { P = c; break; } }
    D.n++; D.cd = 2; D.seen[P.id] = true; const ls = typeof P.lines === 'function' ? P.lines(F) : P.lines;
    goster(P, ls[Math.floor(Math.random() * ls.length)], FT.tier === 'cukur' ? 'pipbg-cukur' : P.bg); }
  function goster(P, soz, bg) { const dov = document.getElementById('dov'); if (!dov) return; const sol = P.side === 'p';
    const e = document.createElement('div'); e.className = 'syc ' + (sol ? 'sol' : 'sag') + (P.speaker ? ' boss' : '');
    e.innerHTML = '<div class="syc-ic"><i class="syc-bg"></i><i class="syc-ton"></i><img class="syc-kisi" alt=""><i class="syc-cizgi"></i>' + (P.sfx ? '<b class="syc-ses"></b>' : '') + '</div><div class="syc-balon">' + (P.speaker ? '<small></small>' : '') + '<b></b></div>';
    e.querySelector('.syc-bg').style.backgroundImage = 'url("' + yol(bg) + '")'; e.querySelector('.syc-kisi').src = yol(P.ch);
    e.querySelector('.syc-balon b').textContent = soz; if (P.speaker) e.querySelector('.syc-balon small').textContent = P.speaker; if (P.sfx) e.querySelector('.syc-ses').textContent = P.sfx;
    /* can ve nefes çubuklarının hemen altına oturur; çubukları örtmez */
    { const R = dov.getBoundingClientRect(); let alt = 0; dov.querySelectorAll('.taraf .can, .taraf .nefes').forEach(b => { alt = Math.max(alt, b.getBoundingClientRect().bottom - R.top); }); if (alt > 0) e.style.top = Math.round(alt + 12) + 'px'; }
    dov.appendChild(e); D.simdi = true;
    const A = EO2.audio; try { if (A) { A.pop(); if (P.snd === 'cheer' || P.snd === 'drum') setTimeout(() => A.chime(), 140); else if (P.snd === 'horn' || P.snd === 'boo') setTimeout(() => A.whoosh(), 120); } } catch (x) {}
    const omur = 3200; setTimeout(() => e.classList.add('git'), omur); setTimeout(() => { e.remove(); if (D) D.simdi = false; }, omur + 420); }
  EO2.seyirci = { sifirla, olay };
})();
