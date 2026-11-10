/* Mobil UX güvenlik ağı (U1): yalnız html.mux (≤760 px). Yeni eklenen DOM düğümlerinde
   dokunma hedefi < 44 px olan etkileşimli öğelere min boyut, yazısı < 12 px olanlara 12 px verir.
   CSS (style_mobile.css) bilinen yerleri düzeltir; bu dosya geri kalanı ve modalları kapsar.
   Kapatma: ?mux=0 ya da localStorage eo_mux=0 (html.mux sınıfı hiç eklenmez). Oyun durumuna dokunmaz. */
(function () {
  'use strict';
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const MIN_T = 44, MIN_F = 12;
  const INTER = 'button,a[href],[data-a],[role=tab],[role=button],input:not([type=hidden]),select,textarea';
  const SKIP = '[data-mux-skip],[data-mux-skip] *,canvas,svg *';
  const queue = new Set();
  let scheduled = false;

  function muxActive() { return document.documentElement.classList.contains('mux'); }
  function visible(r, cs) { return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }

  function fixTree(root) {
    if (!root || root.nodeType !== 1) return;
    const nodes = [root, ...root.querySelectorAll('*')];
    for (const el of nodes) {
      if (el.dataset && el.dataset.mx === '1') continue;
      if (el.matches(SKIP)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      // Yazı: doğrudan metin düğümü olan öğe
      let ownText = false;
      for (const c of el.childNodes) { if (c.nodeType === 3 && c.textContent.trim()) { ownText = true; break; } }
      if (ownText && parseFloat(cs.fontSize) < MIN_F) el.style.setProperty('font-size', MIN_F + 'px', 'important');
      // Dokunma hedefi
      if (el.matches(INTER)) {
        const r = el.getBoundingClientRect();
        if (visible(r, cs)) {
          if (r.width < MIN_T) el.style.setProperty('min-width', MIN_T + 'px');
          if (r.height < MIN_T) el.style.setProperty('min-height', MIN_T + 'px');
          if ((r.width < MIN_T || r.height < MIN_T) && cs.display === 'inline') el.style.setProperty('display', 'inline-block');
        }
      }
      if (el.dataset) el.dataset.mx = '1';
    }
  }

  function flush() {
    scheduled = false;
    if (!muxActive()) { queue.clear(); return; }
    const items = [...queue]; queue.clear();
    for (const n of items) { if (n.isConnected) fixTree(n); }
  }
  function schedule(n) {
    queue.add(n);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }

  function start() {
    new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) schedule(n);
    }).observe(document.body, { childList: true, subtree: true });
    schedule(document.body);
    // html.mux sonradan eklenirse (render sonrası) tüm gövdeyi yeniden tara
    new MutationObserver(() => { if (muxActive()) schedule(document.body); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  // Çanta araması: kalem adına göre süzer (yalnız gösterim; veri değişmez)
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t || t.id !== 'bag-search') return;
    const q = t.value.trim().toLocaleLowerCase('tr');
    document.querySelectorAll('.bag-grid .bag-cell').forEach(c => {
      const nm = (c.textContent || '').toLocaleLowerCase('tr');
      c.toggleAttribute('data-mxhide', !!q && !nm.includes(q));
    });
  });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
