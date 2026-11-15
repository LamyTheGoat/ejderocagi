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
    '.scrim{background:rgba(4,4,10,.82);backdrop-filter:blur(10px)}.modal.comicm{width:min(1180px,100%);max-height:100%;overflow:auto}.comic .cnav,.comic .vnopts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}';
  G.hasComic = ev => typeof COMIC !== 'undefined' && !!COMIC[ev.id];
  G.comic = function (ev) { return new Promise(async res => { const c = ev.ctx = ev.ctx || {}; let pages; try { pages = COMIC[ev.id](c, ev); } catch (e) { console.error('çizgi roman kurulamadı', ev.id, e); return res(false); }
    const host = document.createElement('div'); host.className = 'cizgi'; document.getElementById('app').appendChild(host); const sh = host.attachShadow({ mode: 'open' }), style = await css(); let pg = 0;
    const done = v => { host.remove(); res(v); };
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
      const f = sh.querySelector('[data-next], .vopt:not([disabled])'); if (f) f.focus(); }
    page(); }); };
})();
