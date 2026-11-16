/* Ejder Ocağı 2.0 · çizgi roman okuyucusu
   Oyunun hikâye olayları çizgi roman sayfalarıdır (js/comic.js: COMIC, 41 hikâye). Sayfalar oyunun kendi çizicisiyle kurulur
   (buildNativeComicPanelHTML) ve kendi stiliyle (style.css) gösterilir. Eski stil 2.0 arayüzüne karışmasın diye okuyucu
   gölge kökte (Shadow DOM) yaşar: stil yalnız okuyucunun içinde geçerlidir. Seçimler son sayfanın altındadır; sonuçları aynen işlenir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  let cssText = null;
  const fix = s => String(s).replace(/(src=["']|href=["']|url\(\s*["']?)(img|assets|sfx)\//g, (m, a, b) => a + G.url(b + '/'));     // görsel adresleri: 2.0 sayfası başka klasörden açılır
  async function css() { if (cssText != null) return cssText; try { const t = await (await fetch(OLD + 'style.css')).text(); cssText = fix(t.replace(/:root\b/g, ':host')); } catch (e) { cssText = ''; }
    return cssText; }
  const EXTRA = ':host{position:fixed;inset:0;z-index:75;display:block;font-family:"Alegreya Sans",system-ui,sans-serif;color:#f4ead6;animation:cz-gel .3s}@keyframes cz-gel{from{opacity:0}}' +
    '.scrim{background:radial-gradient(120% 90% at 50% 40%,rgba(26,40,96,.86),rgba(6,10,28,.94));backdrop-filter:blur(10px)}' +
    /* sayfa ekrana sığdırılır (aşağıda sigdir): kaydırma çubuğu çıkmaz, okuyucu ayrı bir pencere gibi durmaz */
    '.modal.comicm{width:min(1180px,100%);max-height:none;overflow:visible;scrollbar-width:none;transform-origin:50% 50%}.modal.comicm::-webkit-scrollbar{display:none}' +
    '.comic .cnav,.comic .vnopts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}' +
    /* 2.0 arayüzü: mavi-altın cam, Noto Sans; eski kahverengi düğmeler ve süsleri kalkar */
    '#modal-root .cmhead .kicker{font:700 12px "Noto Sans",system-ui,sans-serif;letter-spacing:.16em;color:#f6d98a;text-transform:uppercase}#modal-root .cmhead .cpgn{font:700 12px "Noto Sans",system-ui,sans-serif;color:#cfd8f6}' +
    '#modal-root .btn,#modal-root .vopt{font-family:"Noto Sans",system-ui,sans-serif;border:0;cursor:pointer;min-height:44px;text-shadow:none;letter-spacing:0;text-transform:none;transition:transform .15s,filter .15s,box-shadow .15s}' +
    '#modal-root .btn::before,#modal-root .btn::after,#modal-root .vopt::before,#modal-root .vopt::after{display:none!important}' +
    '#modal-root .btn{font-weight:700;font-size:15px;padding:.5em 1.9em;border-radius:2em}' +
    '#modal-root .btn.primary,#modal-root .vopt.primary{color:#3b4560;background:linear-gradient(180deg,#fffaf0,#f1e3c0);box-shadow:inset 0 0 0 1px rgba(214,190,140,.95),0 0 0 2px #c9a24a,0 .25em .7em rgba(2,4,20,.5)}' +
    '#modal-root .btn.ghost{color:#fff;background:rgba(14,20,48,.88);box-shadow:inset 0 0 0 1px rgba(255,226,150,.5),0 .25em .7em rgba(2,4,20,.4)}' +
    '#modal-root .btn:hover,#modal-root .vopt:hover:not([disabled]){transform:translateY(-1px);filter:brightness(1.08)}#modal-root .btn:focus-visible,#modal-root .vopt:focus-visible{outline:2px solid #f6d98a;outline-offset:2px}' +
    '#modal-root .cask{margin-top:10px;padding:12px 14px;border:0;border-radius:16px;background:rgba(14,20,48,.9);box-shadow:inset 0 0 0 1px rgba(255,226,150,.38),0 .4em 1.2em rgba(2,4,20,.45)}' +
    '#modal-root .cask p{margin:0 0 10px;font:500 15px/1.45 "Noto Sans",system-ui,sans-serif;color:#e9ecfb}' +
    '#modal-root .cask .vnopts{flex-direction:column;align-items:stretch;gap:8px}' +
    '#modal-root .vopt{display:block;width:100%;text-align:left;font-weight:600;font-size:16px;line-height:1.35;padding:.65em 1.1em;border-radius:14px;color:#fff;background:linear-gradient(180deg,rgba(48,60,112,.96),rgba(22,30,66,.98));box-shadow:inset 0 0 0 1px rgba(255,226,150,.42)}' +
    '#modal-root .vopt:hover:not([disabled]){box-shadow:inset 0 0 0 1.5px #f6d98a,0 0 1em rgba(246,217,138,.35)}#modal-root .vopt[disabled]{opacity:.55;cursor:default}#modal-root .vopt small{display:block;font-weight:500;font-size:12px;color:#cfd8f6}' +
    '#modal-root .vopt.primary{width:auto;align-self:center;text-align:center;padding:.5em 2.2em;border-radius:2em}';
  G.hasComic = ev => typeof COMIC !== 'undefined' && !!COMIC[ev.id];
  G.comic = function (ev) { return new Promise(async res => { const c = ev.ctx = ev.ctx || {}; let pages; try { pages = COMIC[ev.id](c, ev); } catch (e) { console.error('çizgi roman kurulamadı', ev.id, e); return res(false); }
    const host = document.createElement('div'); host.className = 'cizgi'; document.getElementById('app').appendChild(host); const sh = host.attachShadow({ mode: 'open' }), style = await css(); let pg = 0;
    let done = v => { host.remove(); res(v); };
    function page() { const P = pages[pg], last = pg === pages.length - 1, first = (P.p && P.p[0]) || {}, bgKey = first.backdrop || first.bg || 'bg-ocak', bgUrl = (typeof asset === 'function' && asset(bgKey)) || '';
      const opts = last ? (ev.opts || []).map((o, i) => { const why = o.req ? o.req(c) : null, t = typeof o.t === 'function' ? o.t(c) : o.t; return '<button class="vopt" data-i="' + i + '" ' + (why ? 'disabled' : '') + '>' + t + (why ? '<small>' + why + '</small>' : '') + '</button>'; }).join('') : '';
      sh.innerHTML = '<style>' + style + EXTRA + '</style><div id="modal-root"><div class="scrim">' + (bgUrl && !/^linear-gradient/i.test(bgUrl) ? '<div class="comic-scrim-bg" style="background-image:url(\'' + fix('src="' + bgUrl + '"').slice(5, -1) + '\')"></div>' : '') +
        '<div class="modal comicm"><div class="comic"><div class="cmhead"><span class="kicker">' + (typeof STORY !== 'undefined' && STORY[S.week] && STORY[S.week].id === ev.id ? 'Hikâye' : 'Olay') + ' · ' + esc(ev.title || 'Destan') + '</span><span class="cpgn">' + (pg + 1) + '/' + pages.length + '</span></div>' +
        fix('<div class="cpage lay-' + P.lay + '">' + P.p.map((x, i) => buildNativeComicPanelHTML(x, i)).join('') + '</div>') +
        (last ? '<div class="cask">' + (P.ask ? '<p>' + P.ask + '</p>' : '') + '<div class="vnopts">' + opts + '</div></div>' : '<div class="cnav"><button class="btn ghost" data-skip="1">Atla</button><button class="btn primary" data-next="1">Devam</button></div>') + '</div></div></div></div>';
      if (typeof wireComicParallaxContainer === 'function') try { wireComicParallaxContainer(sh.querySelector('.comicm')); } catch (e) {}
      const nx = sh.querySelector('[data-next]'), sk = sh.querySelector('[data-skip]'); if (nx) nx.addEventListener('click', () => { pg++; if (EO2.audio) EO2.audio.ui(); page(); }); if (sk) sk.addEventListener('click', () => { pg = pages.length - 1; page(); });
      sh.querySelectorAll('.vopt[data-i]').forEach(b => b.addEventListener('click', () => { const r = ev.opts[+b.dataset.i].fx(c); afterAction(true); const txt = r == null ? '' : String(r).replace(/<[^>]+>/g, ''); if (!txt) return done(true);
        const cask = sh.querySelector('.cask'); cask.innerHTML = '<p>' + esc(txt) + '</p><div class="vnopts"><button class="vopt primary" data-ok="1">Devam</button></div>'; cask.querySelector('[data-ok]').addEventListener('click', () => done(true)); }));
      if (last && !(ev.opts || []).length) { const k = sh.querySelector('.cask'); k.innerHTML += '<div class="vnopts"><button class="vopt primary" data-ok="1">Devam</button></div>'; k.querySelector('[data-ok]').addEventListener('click', () => done(true)); }
      const f = sh.querySelector('[data-next], .vopt:not([disabled])'); if (f) f.focus({ preventScroll: true }); sigdir(); setTimeout(sigdir, 250); }
    /* sayfayı ekrana sığdır: içerik ekrandan uzunsa ya da genişse bütün olarak küçültülür (kaydırma yok) */
    function sigdir() { const m = sh.querySelector('.modal.comicm'); if (!m) return; m.style.transform = ''; const en = m.offsetWidth, boy = m.offsetHeight; if (!en || !boy) return;
      const k = Math.min(1, (innerHeight - 16) / boy, (innerWidth - 16) / en); m.style.transform = k < 1 ? 'scale(' + k.toFixed(4) + ')' : ''; m.style.marginTop = k < 1 ? Math.round((boy * k - boy) / 2) + 'px' : ''; m.style.marginBottom = m.style.marginTop; }
    const yeniden = () => sigdir(); addEventListener('resize', yeniden); const done0 = done; done = v => { removeEventListener('resize', yeniden); done0(v); };
    page(); }); };
})();
