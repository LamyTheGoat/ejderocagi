/* Ejder Ocağı fragmanı · oynatıcı: yükleme, oynat/duraklat, konum çubuğu, ses, tam ekran.
   Adres seçenekleri: ?t=12.4 (o saniyenin durağan karesi, denetim için) · ?res=1280 (çizim eni) */
(function () {
  'use strict';
  const T = window.EO2.tr, $ = id => document.getElementById(id), root = $('trl'), cv = $('film'), q = new URLSearchParams(location.search), DUR = T.CUE.dur;
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const IC = { play: 'M6 3.5v17l14-8.5z', pause: 'M6 4h4v16H6zm8 0h4v16h-4z', on: 'M4 9v6h4l5 4V5L8 9zm11.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zm-2-8v2a7 7 0 0 1 0 12v2a9 9 0 0 0 0-16z', off: 'M4 9v6h4l5 4V5L8 9zm17.6.4L20.2 8 18 10.2 15.8 8l-1.4 1.4 2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4-2.2-2.2z' };
  const setIcon = (id, d) => $(id).firstElementChild.setAttribute('d', d);
  function size() { const want = +q.get('res') || Math.round(Math.min(1920, Math.max(960, root.clientWidth * (window.devicePixelRatio || 1)))), w = Math.round(want / 16) * 16, h = Math.round(w * 9 / 16); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; if (T.ready) T.resize(w, h); } }
  let hideT = 0; const wake = () => { root.classList.add('ui'); clearTimeout(hideT); hideT = setTimeout(() => { if (T.playing) root.classList.remove('ui'); }, 2200); };
  const sync = () => { setIcon('bPlay', T.playing ? IC.pause : IC.play); $('veil').classList.toggle('gone', T.playing || T.time > 0.05); };
  async function toggle() { if (!T.ready) return; if (T.playing) T.pause(); else await T.play(); sync(); wake(); }
  size();
  T.boot(cv, (k, s) => { $('loadbar').style.setProperty('--p', k); $('loadtxt').textContent = s; }).then(() => {
    if (q.has('t')) { root.classList.add('still'); T.render(+q.get('t')); window.__ready = true; return; }
    $('load').hidden = true; $('big').hidden = false; $('big').focus(); window.__ready = true;
    T.onTick(t => { if (document.activeElement !== $('seek') || T.playing) $('seek').value = t; $('clock').textContent = fmt(t) + ' / ' + fmt(DUR); if (!T.playing) sync(); });
  }).catch(e => { $('loadtxt').textContent = String(e.message || e); console.error(e); });
  $('big').onclick = toggle; $('bPlay').onclick = toggle; cv.onclick = toggle;
  $('seek').oninput = e => { T.seek(+e.target.value); sync(); };
  $('bMute').onclick = () => { T.mute(!T.muted); setIcon('bMute', T.muted ? IC.off : IC.on); };
  const full = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }; $('bFull').onclick = full;
  root.addEventListener('pointermove', wake); root.addEventListener('pointerdown', wake); addEventListener('resize', size);
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' && e.key !== ' ') return; if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); } else if (e.key === 'ArrowRight') T.seek(T.time + 2.4); else if (e.key === 'ArrowLeft') T.seek(T.time - 2.4); else if (e.key === 'f') full(); else if (e.key === 'm') $('bMute').click(); wake(); });
})();
