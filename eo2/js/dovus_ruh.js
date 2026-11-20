/* Ejder Ocağı 2.0 · ejder dövüşünün hareket dili (2026-11-20)
   Yalnız görüntü ve ses zamanı: hasar, sıra, olasılık ve sonuç değişmez (kurallar js/core.js fightRound'dadır).
   Her hamle üç vuruşla oynar: hazırlık (geri çekilme, çömelme, nefes toplama), atılım, dönüş. Darbe anında hedef savrulur,
   kamera vurulan tarafa itilir, kısa bir donma olur ve ayakların dibinden toz kalkar. Iskalanan hamlede hedef yana kaçar.
   Boşta ejderhalar kendi temposunda nefes alır (elemente göre), canı azalan soluklanır, sırası gelen öne eğilir.
   "Hareketi azalt" ayarında ve hızlı kipte (window.__fastFx) hiçbiri oynamaz; yalnız eski kısa bekleme kalır. */
(function () {
  'use strict';
  const EO2 = window.EO2, app = document.getElementById('app');
  const kapali = () => !!window.__fastFx || app.classList.contains('sakin');
  const bekle = ms => new Promise(r => setTimeout(r, window.__fastFx ? 10 : ms));
  /* öğe üstünde Web Animations; CSS'teki boşta nefes alma animasyonunun üstüne eklenir (composite: add) */
  const oyna = (e, kf, o) => { if (!e || !e.animate) return null; try { return e.animate(kf, Object.assign({ composite: 'add' }, o)); } catch (x) { return null; } };
  const govde = im => im && im.closest('.govde');
  const dov = () => document.getElementById('dov');
  /* çizimin görünen kutusu: resim kutusu ekranın tamamını kaplar (object-fit: contain, alta yaslı); telefonda dik ekranda ejderha
     kutunun dibinde küçük durur. Efektler kutuya değil çizimin kendisine oturur. */
  function gorsel(im) { const r = im.getBoundingClientRect(), nw = im.naturalWidth, nh = im.naturalHeight; if (!nw || !nh || !r.width || !r.height || im.tagName !== 'IMG') return r;
    const k = Math.min(r.width / nw, r.height / nh), w = nw * k, h = nh * k, x = r.left + (r.width - w) / 2, y = r.top + (r.height - h);
    return { left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, x, y }; }
  const kutu = e => { const D = dov().getBoundingClientRect(), r = gorsel(e); return { x: r.left - D.left, y: r.top - D.top, w: r.width, h: r.height }; };
  /* ağız: boşta duran pozda başın yaklaşık yeri (dov-isin ile aynı ölçü) */
  const agiz = (im, dir) => { const b = kutu(im); return { x: dir > 0 ? b.x + b.w * 0.8 : b.x + b.w * 0.2, y: b.y + b.h * 0.36 }; };
  const parca = (cls, x, y, css) => { const e = document.createElement('i'); e.className = cls; e.style.left = x + 'px'; e.style.top = y + 'px'; if (css) for (const k in css) e.style.setProperty(k, css[k]); dov().appendChild(e); return e; };
  const one = (g, v) => { const t = g && g.closest('.taraf'); if (t) t.classList.toggle('onde', v); };

  /* elemente göre boşta tempo: ateş kıpır kıpır, buz ağır ve sakin, fırtına sinirli, toprak ağır, gölge süzülür */
  const TEMPO = { ates: [3.0, 1.0], buz: [4.6, 0.8], firtina: [2.5, 1.15], toprak: [4.2, 0.7], golge: [3.8, 1.25] };
  function kur(kok, elP, elE) { if (!kok) return;
    [['imP', elP], ['imE', elE]].forEach(([id, el]) => { const g = govde(kok.querySelector('#' + id)); if (!g) return; const t = TEMPO[el] || [3.6, 1];
      g.style.setProperty('--ruh-sure', (t[0] * (0.92 + Math.random() * 0.16)).toFixed(2) + 's'); g.style.setProperty('--ruh-gec', (-Math.random() * t[0]).toFixed(2) + 's'); g.style.setProperty('--ruh-genlik', t[1]); g.dataset.el = el || ''; }); }

  /* ---------- hazırlık + atılım: söz, temas anında çözülür ---------- */
  async function pence(me, dir, hiz) { const g = govde(me); if (kapali() || !g) return bekle(170); hiz = hiz || 1;
    const T = 820 * hiz; one(g, true); setTimeout(() => one(g, false), T);
    oyna(g, [
      { transform: 'none', easing: 'cubic-bezier(.3,0,.4,1)' },
      { offset: 0.3, transform: `translate(${-7 * dir}%, 2.5%) rotate(${-5 * dir}deg) scale(.95, 1.04)`, easing: 'cubic-bezier(.6,0,.9,.5)' },   // geri çekil, çömel
      { offset: 0.46, transform: `translate(${30 * dir}%, -4%) rotate(${7 * dir}deg) scale(1.1, .94)`, easing: 'ease-out' },                      // atıl
      { offset: 0.6, transform: `translate(${25 * dir}%, -1%) rotate(${3 * dir}deg) scale(1.03)`, easing: 'cubic-bezier(.4,0,.2,1)' },
      { transform: 'none' }], { duration: T });
    kameraIt(dir, 0.3 * T, 0.5 * T);
    return bekle(0.44 * T); }
  /* nefes: geri kaykıl, ağızda element küresi büyür; bırakınca geri teper */
  async function nefes(me, dir, renk, hiz) { const g = govde(me); if (kapali() || !g) return bekle(170); hiz = hiz || 1;
    const T = 900 * hiz, a = agiz(me, dir), k = parca('ruh-sarj', a.x, a.y, { '--c': renk });
    oyna(g, [
      { transform: 'none', easing: 'cubic-bezier(.2,.6,.3,1)' },
      { offset: 0.36, transform: `translate(${-5 * dir}%, -2%) rotate(${-6 * dir}deg) scale(1.04, 1.06)`, easing: 'cubic-bezier(.7,0,.9,.4)' },   // başı kaldır, nefes al
      { offset: 0.44, transform: `translate(${4 * dir}%, 1%) rotate(${3 * dir}deg) scale(1.02, .97)`, easing: 'ease-out' },                         // bırak
      { offset: 0.62, transform: `translate(${-3 * dir}%, 0) rotate(${-1 * dir}deg)`, easing: 'ease-in-out' },                                         // geri tep
      { transform: 'none' }], { duration: T });
    oyna(k, [{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 0 }, { offset: 0.8, transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 0.42 * T, easing: 'ease-in', composite: 'replace', fill: 'forwards' });
    setTimeout(() => k.remove(), 0.44 * T);
    await bekle(0.4 * T); return 0.12 * T; }      // dönen: ışının hedefe varma süresi (ms)
  /* kükreme: dikilir, ağızdan halkalar yayılır, ekran sarsılır */
  async function kukre(me, dir, renk, hiz) { const g = govde(me); if (kapali() || !g) return bekle(120); hiz = hiz || 1; const T = 900 * hiz;
    oyna(g, [
      { transform: 'none', easing: 'ease-in' },
      { offset: 0.22, transform: `translate(${-3 * dir}%, 3%) scale(.96, 1.02)`, easing: 'cubic-bezier(.2,1.4,.4,1)' },
      { offset: 0.42, transform: `translate(${2 * dir}%, -5%) rotate(${-4 * dir}deg) scale(1.1)` },
      { offset: 0.7, transform: `translate(${2 * dir}%, -4%) rotate(${-3 * dir}deg) scale(1.08)`, easing: 'ease-in-out' },
      { transform: 'none' }], { duration: T });
    setTimeout(() => { const a = agiz(me, dir); for (let i = 0; i < 3; i++) { const h = parca('ruh-dalga', a.x, a.y, { '--c': renk || '#fff3c4' });
      oyna(h, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(5)', opacity: 0 }], { duration: 620, delay: i * 120, easing: 'cubic-bezier(.1,.7,.3,1)', composite: 'replace', fill: 'both' }); setTimeout(() => h.remove(), 660 + i * 120); } }, 0.38 * T);
    return bekle(0.42 * T); }
  /* savunma: çömelir, elementin renginde bir kalkan belirir */
  function savun(me, renk) { const g = govde(me); if (kapali() || !g) return; const k = document.createElement('i'); k.className = 'ruh-kalkan'; k.style.setProperty('--c', renk || '#a6e0ff');
    { const G0 = g.getBoundingClientRect(), v = gorsel(me); Object.assign(k.style, { left: (v.left - G0.left + v.width * 0.06) + 'px', top: (v.top - G0.top + v.height * 0.02) + 'px', width: v.width * 0.88 + 'px', height: v.height * 0.98 + 'px', right: 'auto', bottom: 'auto' }); } g.appendChild(k);
    oyna(g, [{ transform: 'none' }, { offset: 0.3, transform: 'translateY(3%) scale(1.02, .95)' }, { offset: 0.8, transform: 'translateY(2%) scale(1.01, .97)' }, { transform: 'none' }], { duration: 900, easing: 'ease-in-out' });
    oyna(k, [{ transform: 'scale(.6)', opacity: 0 }, { offset: 0.2, transform: 'scale(1.06)', opacity: 1 }, { offset: 0.75, transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.12)', opacity: 0 }], { duration: 1000, easing: 'ease-out', composite: 'replace', fill: 'forwards' });
    setTimeout(() => k.remove(), 1020); }
  /* sersemleme: başın üstünde dönen yıldızlar, gövde sallanır */
  function sersem(me) { const g = govde(me); if (kapali() || !g) return; const k = document.createElement('i'); k.className = 'ruh-sersem'; k.innerHTML = '<b>★</b><b>✦</b><b>★</b>'; k.style.top = (gorsel(me).top - g.getBoundingClientRect().top + 4) + 'px'; g.appendChild(k);
    oyna(g, [{ transform: 'none' }, { offset: 0.25, transform: 'rotate(-3deg)' }, { offset: 0.5, transform: 'rotate(2.5deg)' }, { offset: 0.75, transform: 'rotate(-1.5deg)' }, { transform: 'none' }], { duration: 1100, easing: 'ease-in-out' });
    setTimeout(() => k.remove(), 1300); }

  /* ---------- tepkiler ---------- */
  /* vuruldu: hedef geri savrulur (dir: saldıranın yönü), ağırsa sıçrar ve geç toparlanır */
  function vurul(im, dir, agir) { const g = govde(im); if (kapali() || !g) return; const k = agir ? 1.7 : 1;
    oyna(g, [
      { transform: 'none', easing: 'cubic-bezier(.1,.9,.3,1)' },
      { offset: 0.16, transform: `translate(${11 * k * dir}%, ${-2 * k}%) rotate(${6 * k * dir}deg) scale(.97, 1.03)`, easing: 'ease-out' },
      { offset: 0.45, transform: `translate(${8 * k * dir}%, ${1 * k}%) rotate(${2 * k * dir}deg) scale(1.03, .96)`, easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: 'none' }], { duration: agir ? 900 : 620 });
    setTimeout(() => toz(im, agir ? 14 : 8), agir ? 300 : 200); }
  /* ıska: hedef yana ve yukarı kaçar */
  function kac(im, dir) { const g = govde(im); if (kapali() || !g) return;
    oyna(g, [{ transform: 'none', easing: 'cubic-bezier(.1,.8,.3,1)' }, { offset: 0.3, transform: `translate(${14 * dir}%, -9%) rotate(${-6 * dir}deg)`, easing: 'cubic-bezier(.5,0,.6,1)' }, { offset: 0.7, transform: `translate(${4 * dir}%, 1%) scale(1.02, .96)` }, { transform: 'none' }], { duration: 640 }); }
  /* engellendi: hedefin önünde kısa kalkan parlaması */
  function engel(im, renk) { savun(im, renk); }
  function toz(im, n) { const fx = EO2.game.fx; if (!fx || !im || kapali()) return; const r = gorsel(im), A = app.getBoundingClientRect();
    fx.burst([r.left - A.left + r.width / 2, r.top - A.top + r.height * 0.92], 'rgba(214,196,150,.9)', n || 8); }

  /* ---------- kamera ---------- */
  /* darbe: sahne vurulan noktaya doğru kısa bir yakınlaşma ve hafif dönme yapar */
  function kamera(im, agir) { const s = document.querySelector('#dov .dov-saha'); if (kapali() || !s || !im) return; const b = kutu(im), S = kutu(s);
    s.style.transformOrigin = (b.x - S.x + b.w / 2) + 'px ' + (b.y - S.y + b.h * 0.5) + 'px'; const z = agir ? 1.09 : 1.045, r = agir ? 0.8 : 0.35;
    oyna(s, [{ transform: 'none', easing: 'cubic-bezier(.1,.9,.2,1)' }, { offset: 0.14, transform: `scale(${z}) rotate(${(Math.random() < 0.5 ? -1 : 1) * r}deg)`, easing: 'cubic-bezier(.4,0,.2,1)' }, { transform: 'none' }], { duration: agir ? 760 : 460, composite: 'replace' }); }
  /* atılımda kamera saldırganı biraz izler */
  function kameraIt(dir, gec, sure) { const s = document.querySelector('#dov .dov-saha'); if (!s) return;
    oyna(s, [{ transform: 'none' }, { offset: 0.5, transform: `translateX(${-1.2 * dir}%)` }, { transform: 'none' }], { duration: sure, delay: gec, easing: 'ease-in-out' }); }
  /* donma: sahnedeki bütün animasyonlar kısa bir an durur (vuruşun ağırlığı) */
  function donma(ms) { const d = dov(); if (kapali() || !d || !d.getAnimations || !ms) return; const L = d.getAnimations({ subtree: true }).filter(a => a.playState === 'running'); L.forEach(a => { try { a.pause(); } catch (x) {} });
    setTimeout(() => L.forEach(a => { try { if (a.playState === 'paused') a.play(); } catch (x) {} }), ms); }

  /* ---------- dövüşün sonu: kazanan dikilip iki kez sıçrar ---------- */
  async function zafer(im, dir) { const g = govde(im); if (kapali() || !g) return;
    oyna(g, [{ transform: 'none', easing: 'ease-in' }, { offset: 0.15, transform: 'translateY(3%) scale(1.04, .94)', easing: 'cubic-bezier(.2,1,.4,1)' }, { offset: 0.35, transform: `translate(${2 * dir}%, -9%) scale(.97, 1.06)`, easing: 'ease-in' },
      { offset: 0.5, transform: 'translateY(2%) scale(1.04, .95)', easing: 'cubic-bezier(.2,1,.4,1)' }, { offset: 0.68, transform: `translate(${1 * dir}%, -6%) scale(.98, 1.04)`, easing: 'ease-in' }, { offset: 0.82, transform: 'translateY(1%) scale(1.02, .97)' }, { transform: 'none' }], { duration: 1300 });
    setTimeout(() => toz(im, 6), 650); setTimeout(() => toz(im, 5), 1060); await bekle(900); }

  EO2.ruh = { kapali, gorsel, kur, pence, nefes, kukre, savun, sersem, vurul, kac, engel, toz, kamera, donma, zafer };
})();
