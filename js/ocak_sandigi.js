'use strict';
// ENG-08 · Ocak Sandığı. Sunucu envanterinin (GET /api/economy) ikonlu, salt okunur görünümü.
// Kurallar: yerel S'i envanter gibi GÖSTERMEZ; fiyat/değer (value()) göstermez; hiçbir şey yazmaz.
// Satış Bedesten'in "Satışa Çıkar" formundan, takas mevcut takas ekranından yapılır.
// Üst kısım saf mantıktır (DOM'suz, tests/ocak_sandigi.test.js); alt kısım yalnız tarayıcıda çalışır.
(function (root) {
  const KIND_ORDER = ['dragon', 'egg', 'item', 'food'];
  const KIND_LABEL = { dragon: 'Ejderhalar', egg: 'Yumurtalar', item: 'Eşyalar', food: 'Yem & İksir' };
  const KIND_ONE = { dragon: 'Ejderha', egg: 'Yumurta', item: 'Eşya', food: 'Yem' };
  // Bedesten "Satışa Çıkar" sekmesindeki kategori anahtarları (js/pazar.js UI.bedSellCat).
  const BED_CAT = { dragon: 'dragon', egg: 'egg', item: 'equip', food: 'food' };

  // Kaynak sınıfı → oyuncu dili. Renk tek başına durum taşımaz: her rozetin simgesi ve metni var.
  const SOURCE_BADGE = {
    earned: { icon: '✦', label: 'Kazanılmış · takas edilebilir', detail: 'Oyunda kazandığın altınla ya da başka oyuncudan edindin. Bedesten\'de satılabilir, takasa konabilir.', tradable: true },
    bound: { icon: '⛓', label: 'Hesaba bağlı · takas edilemez', detail: 'Başlangıç hediyesi ya da tek seferlik hedef ödülüyle geldi. Oyunda kullanabilirsin; satılamaz, takas edilemez.', tradable: false },
    unknown: { icon: '?', label: 'Kaynağı doğrulanmadı · takas edilemez', detail: 'Kaynak kaydı tutulmadan önce edinildi. İnceleme bitene dek satılamaz, takas edilemez.', tradable: false },
    mixed: { icon: '◐', label: 'Kısmen takas edilebilir', detail: 'Bu yemin bir kısmı kazanılmış, bir kısmı hesaba bağlı. Yalnız kazanılmış kısmı satılabilir.', tradable: true },
  };
  function sourceBadge(source) { return SOURCE_BADGE[source] || SOURCE_BADGE.unknown; }

  const lower = s => String(s == null ? '' : s).toLocaleLowerCase('tr');
  const fallbackCatalog = {
    itemName: id => String(id), itemSlot: () => '', foodName: k => String(k),
    elName: el => String(el || ''), stageName: s => String(s || ''),
  };

  // Takas/ilan rezervasyonları: yalnız sunucudan gelen açık ilan ve açık takas teklifi.
  function reservations({ mine = [], trade = null, accountId = null } = {}) {
    const listedAssets = new Set(), listedFood = {}, tradeAssets = new Set(), tradeFood = {};
    for (const L of mine || []) {
      if (!L || L.status !== 'open') continue;
      if (L.kind === 'food') listedFood[L.foodKey] = (listedFood[L.foodKey] || 0) + (Number(L.remaining) || 0);
      else if (L.assetId) listedAssets.add(L.assetId);
    }
    if (trade && ['invited', 'active'].includes(trade.status) && accountId && trade.offers && trade.offers[accountId]) {
      const offer = trade.offers[accountId];
      for (const kind of ['items', 'dragons', 'eggs']) for (const id of offer[kind] || []) tradeAssets.add(id);
      for (const [k, n] of Object.entries(offer.food || {})) tradeFood[k] = (tradeFood[k] || 0) + (Number(n) || 0);
    }
    return { listedAssets, listedFood, tradeAssets, tradeFood };
  }

  // Bedesten/takas doğrulamalarının istemci aynası (js/pazar.js why(), js/trade_ui.js unavailable).
  // Sunucu yine de yeniden denetler; bu yalnız kısayolu gizlemek ve nedenini söylemek içindir.
  function blockedReason(kind, d, economy) {
    if (!d) return 'Kayıt eksik';
    if (d.dead) return 'Ejderha artık yaşamıyor';
    if (d.old) return 'Yaşlılık nedeniyle aktarılamaz';
    if (d.heirloomId) return 'Yadigâr eşya aktarılamaz';
    if (d.tradeLocked) return 'Kilitli';
    if (d.task || d.busy) return 'Bu hafta görevde';
    if (d.inK || d.hatching) return 'Kuluçkada';
    if (kind === 'dragon' && Object.values(d.equip || {}).some(v => v != null)) return 'Üzerinde ekipman var';
    if (kind === 'item' && (economy.dragons || []).some(dr => Object.values((dr.data && dr.data.equip) || {}).some(v => v != null && String(v) === String(d.uid)))) return 'Bir ejderha kuşanmış';
    return '';
  }

  function buildEntries({ economy, mine = [], trade = null, accountId = null } = {}, catalog = fallbackCatalog) {
    if (!economy || !economy.game) return [];
    const cat = { ...fallbackCatalog, ...catalog };
    const R = reservations({ mine, trade, accountId: accountId || economy.accountId });
    const out = [];
    const asset = (kind, row, seq) => {
      const d = row.data || {};
      const source = ['earned', 'bound', 'unknown'].includes(d.funding) ? d.funding : 'unknown';
      let name, sub;
      if (kind === 'dragon') { name = d.name || 'Ejderha'; sub = [cat.elName(d.el), cat.stageName(d.stage)].filter(Boolean).join(' · '); }
      else if (kind === 'egg') { const el = (d.genes && d.genes.el && d.genes.el[0]) || d.el; name = `${cat.elName(el) || 'Gizemli'} Yumurtası`; sub = d.inK ? 'Kuluçkada' : 'Sepette'; }
      else { name = cat.itemName(d.id); sub = cat.itemSlot(d.id); }
      const reserved = R.listedAssets.has(row.assetId) ? 'market' : R.tradeAssets.has(row.assetId) ? 'trade' : '';
      const blocked = blockedReason(kind, d, economy);
      const tradable = source === 'earned';
      return { key: kind + ':' + row.assetId, kind, assetId: row.assetId, foodKey: null, name, sub, count: 1, seq, source,
        split: null, reserved, reservedQty: reserved ? 1 : 0, blocked, tradable,
        canSell: tradable && !reserved && !blocked, sellQty: tradable && !reserved && !blocked ? 1 : 0, data: d };
    };
    (economy.dragons || []).forEach((row, i) => out.push(asset('dragon', row, i)));
    (economy.eggs || []).forEach((row, i) => out.push(asset('egg', row, i)));
    (economy.items || []).forEach((row, i) => out.push(asset('item', row, i)));
    const food = economy.game.food || {}, fs = economy.game.foodSources || {};
    Object.keys(food).forEach((k, i) => {
      const n = Number(food[k]) || 0;
      if (n <= 0) return;
      const b = fs[k] || { bound: 0, unknown: n, earned: 0 };
      const split = { earned: b.earned || 0, bound: b.bound || 0, unknown: b.unknown || 0 };
      const source = split.earned > 0 && split.earned < n ? 'mixed' : split.earned >= n ? 'earned' : split.unknown > 0 ? 'unknown' : 'bound';
      const listed = R.listedFood[k] || 0, inTrade = R.tradeFood[k] || 0;
      const free = Math.max(0, split.earned - listed - inTrade);
      out.push({ key: 'food:' + k, kind: 'food', assetId: null, foodKey: k, name: cat.foodName(k), sub: '', count: n, seq: i, source, split,
        reserved: listed ? 'market' : inTrade ? 'trade' : '', reservedQty: listed + inTrade, listedQty: listed, tradeQty: inTrade,
        blocked: '', tradable: split.earned > 0, canSell: free > 0, sellQty: free, data: null });
    });
    return out;
  }

  function categories(entries) {
    const counts = {};
    for (const e of entries) counts[e.kind] = (counts[e.kind] || 0) + 1;
    return [{ k: 'tumu', label: 'Tümü', n: entries.length }, ...KIND_ORDER.filter(k => counts[k]).map(k => ({ k, label: KIND_LABEL[k], n: counts[k] }))];
  }

  function filterEntries(entries, { cat = 'tumu', q = '' } = {}) {
    const needle = lower(q).trim();
    return entries.filter(e => (cat === 'tumu' || e.kind === cat) && (!needle || lower(e.name + ' ' + e.sub + ' ' + KIND_ONE[e.kind]).includes(needle)));
  }

  // "Yeni": sunucu dizisindeki sıra (son eklenen en sonda). Sunucu edinme zamanı tutmuyor; bkz. ENG08_DELIVERY.
  function sortEntries(entries, mode = 'yeni') {
    const list = entries.slice();
    if (mode === 'ad') list.sort((a, b) => a.name.localeCompare(b.name, 'tr') || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.key.localeCompare(b.key));
    else list.sort((a, b) => b.seq - a.seq || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.key.localeCompare(b.key));
    return list;
  }

  // Detay ekranındaki durum satırı ve kısayol kararı (tek yer: test edilir).
  function entryStatus(e) {
    if (e.kind === 'food') {
      const parts = [];
      if (e.listedQty) parts.push(`${e.listedQty} adet Bedesten'de ilanda`);
      if (e.tradeQty) parts.push(`${e.tradeQty} adet takas teklifinde`);
      if (!e.tradable) return { tone: 'locked', icon: '⛓', text: 'Bu yemin tamamı hesaba bağlı; satılamaz, takas edilemez.', sell: false, trade: false };
      if (!e.canSell) return { tone: 'reserved', icon: '⏳', text: (parts.join(', ') || 'Kazanılmış kısmın tamamı rezerve') + '. Serbest kazanılmış yem kalmadı.', sell: false, trade: false };
      return { tone: 'ok', icon: '✦', text: `${e.sellQty} adet satışa ya da takasa hazır${parts.length ? ' (' + parts.join(', ') + ')' : ''}.`, sell: true, trade: true };
    }
    if (e.reserved === 'market') return { tone: 'reserved', icon: '⏳', text: 'Bedesten\'de ilanda. İlan açıkken rezervedir; Bedesten > Tezgâhım bölümünden geri çekebilirsin.', sell: false, trade: false };
    if (e.reserved === 'trade') return { tone: 'reserved', icon: '⏳', text: 'Açık bir takas teklifinde rezerve. Takas bitince serbest kalır.', sell: false, trade: false };
    if (!e.tradable) return { tone: 'locked', icon: sourceBadge(e.source).icon, text: e.source === 'bound' ? 'Hesaba bağlı: oyunda kullan, satış ve takas kapalı.' : 'Kaynağı doğrulanmadı: satış ve takas kapalı.', sell: false, trade: false };
    if (e.blocked) return { tone: 'busy', icon: '⌛', text: `Şu an aktarılamaz: ${e.blocked}.`, sell: false, trade: false };
    return { tone: 'ok', icon: '✦', text: 'Satışa ya da takasa hazır.', sell: true, trade: true };
  }

  // Bedesten "Satışa Çıkar" formunun ön seçimi (ENG07_DELIVERY §5).
  function bedestenTarget(e) {
    if (!e || !entryStatus(e).sell) return null;
    return { sellCat: BED_CAT[e.kind], kind: e.kind, id: e.kind === 'food' ? e.foodKey : e.assetId };
  }

  const api = { KIND_ORDER, KIND_LABEL, SOURCE_BADGE, sourceBadge, reservations, blockedReason, buildEntries, categories, filterEntries, sortEntries, entryStatus, bedestenTarget };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.OCAK_SANDIGI = api;
  if (typeof document === 'undefined') return;

  /* ---------------- Tarayıcı arayüzü ---------------- */
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catalog = {
    itemName: id => (typeof ITEMS !== 'undefined' && ITEMS[id] && ITEMS[id].ad) || String(id),
    itemSlot: id => (typeof ITEMS !== 'undefined' && ITEMS[id] && typeof SLOT_AD !== 'undefined' && SLOT_AD[ITEMS[id].slot]) || '',
    foodName: k => (typeof FOODS !== 'undefined' && FOODS[k] && FOODS[k].ad) || String(k),
    elName: el => (typeof EL_AD !== 'undefined' && EL_AD[el]) || '',
    stageName: s => (typeof STAGE_AD !== 'undefined' && STAGE_AD[s]) || '',
  };
  const V = { cat: 'tumu', q: '', sort: 'yeni', sel: null, trade: null, tradeOk: true, loading: false, opener: null };
  const dlg = document.createElement('dialog');
  dlg.className = 'sandik';
  dlg.setAttribute('aria-labelledby', 'sandik-title');
  document.body.append(dlg);

  const market = () => (typeof MARKET_CLIENT !== 'undefined' ? MARKET_CLIENT : null);
  function art(e, big) {
    const d = e.data;
    try {
      if (e.kind === 'dragon' && typeof dragonSVG === 'function') return dragonSVG(d, { still: true });
      if (e.kind === 'egg' && typeof eggSVG === 'function') return eggSVG(d, 0.6, { glow: !!big });
      if (e.kind === 'item' && typeof itemIcon === 'function' && typeof ITEMS !== 'undefined' && ITEMS[d.id]) return itemIcon(d.id);
      if (e.kind === 'food' && typeof foodIcon === 'function') { const s = foodIcon(e.foodKey); if (s && !/undefined/.test(s)) return s; }
    } catch (_) { /* eksik görünüm alanı: simgeye düş */ }
    return `<span class="sandik-glyph" aria-hidden="true">${{ dragon: '🐉', egg: '🥚', item: '🛡️', food: '🍖' }[e.kind]}</span>`;
  }
  function badge(e, small) {
    const b = sourceBadge(e.source);
    return `<span class="sandik-badge src-${h(e.source)}${small ? ' sm' : ''}"><i aria-hidden="true">${b.icon}</i>${h(small ? b.label.split(' · ')[0] : b.label)}</span>`;
  }

  async function load() {
    const M = market();
    if (!M) { render(); return; }
    V.loading = true; render();
    await M.refresh();
    const st = M.state;
    V.trade = null; V.tradeOk = true;
    if (st.accountId && st.economy && st.economy.game) {
      try {
        const r = await fetch('/api/trade/state', { credentials: 'same-origin', headers: { 'X-Trade-Account': st.accountId } });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'trade_unavailable');
        V.trade = data.trade || null;
      } catch (_) { V.tradeOk = false; }
    }
    V.loading = false;
    if (dlg.open) render();
  }

  function open(opener) {
    V.opener = opener || document.activeElement;
    V.sel = null;
    if (!dlg.open) dlg.showModal();
    render();
    const first = dlg.querySelector('.sandik-close');
    if (first) first.focus();
    load();
  }
  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { V.sel = null; const o = V.opener; V.opener = null; const back = o && o.isConnected ? o : document.querySelector('.hud-bag-btn, .mob-hub-btn'); if (back && back.focus) back.focus(); });

  function emptyState(st) {
    const M = market();
    if (!M) return { text: 'Sunucu envanterine bağlı değil. Ocak Sandığı yalnız sunucuda kayıtlı kalemleri gösterir; yerel oyun verisi burada listelenmez.', btn: '' };
    if (!st.loaded && (V.loading || st.busy)) return { text: 'Sunucu envanterin okunuyor…', btn: '' };
    if (!st.loaded && st.error) return { text: 'Sunucu envanterine ulaşılamadı. Yerel oyun verisi yerine geçmez; bağlantı gelince yeniden dene.', btn: '<button class="sandik-btn" data-sandik="refresh">Yeniden dene</button>' };
    if (!st.economy || !st.economy.game) return { text: 'Sunucu envanterin henüz oluşturulmadı. Hesabını Takas ekranından hazırlayabilirsin.', btn: '<button class="sandik-btn" data-sandik="trade">⇄ Takas ekranını aç</button>' };
    return null;
  }

  function cardHtml(e) {
    const st = entryStatus(e);
    const flag = st.tone === 'ok' ? '' : `<span class="sandik-flag tone-${st.tone}" aria-hidden="true">${st.icon}</span>`;
    const label = `${e.name}, ${KIND_ONE[e.kind]}${e.count > 1 ? ', ' + e.count + ' adet' : ''}, ${sourceBadge(e.source).label}${e.reserved ? ', rezerve' : ''}. Ayrıntıyı aç`;
    return `<li><button class="sandik-card kind-${e.kind}" data-sandik="pick" data-key="${h(e.key)}" aria-label="${h(label)}"${V.sel === e.key ? ' aria-current="true"' : ''}>
      <span class="sandik-art">${art(e)}</span>${flag}
      <span class="sandik-name">${h(e.name)}</span>
      <span class="sandik-meta">${e.count > 1 ? `<b>×${e.count}</b>` : ''}${badge(e, true)}</span>
    </button></li>`;
  }

  function detailHtml(e) {
    const b = sourceBadge(e.source), st = entryStatus(e);
    const food = e.kind === 'food' ? `<p class="sandik-split">Toplam <b>${e.count}</b> adet · kazanılmış ${e.split.earned} · hesaba bağlı ${e.split.bound}${e.split.unknown ? ' · doğrulanmamış ' + e.split.unknown : ''}</p>` : '';
    const actions = st.sell
      ? `<button class="sandik-btn primary" data-sandik="sell" data-key="${h(e.key)}" aria-label="${h(e.name)} kalemini Bedesten'de satışa çıkar">Bedestende Sat</button>
         ${typeof TRADE_UI !== 'undefined' ? `<button class="sandik-link" data-sandik="trade" aria-label="Takas ekranını aç">⇄ Takasa ekle</button>` : ''}`
      : '';
    return `<article class="sandik-detail" aria-labelledby="sandik-dname">
      <button class="sandik-back" data-sandik="back" aria-label="Listeye dön">‹ Sandık</button>
      <div class="sandik-dart">${art(e, true)}</div>
      <h3 id="sandik-dname">${h(e.name)}</h3>
      <p class="sandik-dsub">${h([KIND_ONE[e.kind], e.sub].filter(Boolean).join(' · '))}</p>
      ${food}
      <div class="sandik-dbadge">${badge(e)}<p>${h(b.detail)}</p></div>
      <p class="sandik-status tone-${st.tone}" role="status"><i aria-hidden="true">${st.icon}</i> ${h(st.text)}</p>
      <div class="sandik-actions">${actions}</div>
    </article>`;
  }

  function render() {
    if (!dlg.open) return;
    const M = market();
    const st = M ? M.state : { loaded: false, economy: null, mine: [], accountId: null, error: '', busy: false };
    const focusKey = document.activeElement && dlg.contains(document.activeElement) ? (document.activeElement.dataset.key ? 'k:' + document.activeElement.dataset.key : document.activeElement.id ? '#' + document.activeElement.id : '') : '';
    const caret = document.activeElement && document.activeElement.id === 'sandik-q' ? document.activeElement.selectionStart : null;
    const empty = emptyState(st);
    let body = '';
    if (empty) body = `<div class="sandik-empty" role="status"><span aria-hidden="true">🧰</span><p>${h(empty.text)}</p>${empty.btn}</div>`;
    else {
      const all = buildEntries({ economy: st.economy, mine: st.mine, trade: V.trade, accountId: st.accountId }, catalog);
      const cats = categories(all);
      if (!cats.some(c => c.k === V.cat)) V.cat = 'tumu';
      const shown = sortEntries(filterEntries(all, { cat: V.cat, q: V.q }), V.sort);
      const sel = V.sel && all.find(e => e.key === V.sel);
      if (V.sel && !sel) V.sel = null;
      const tabs = `<div class="sandik-tabs-wrap"><div class="sandik-tabs" role="tablist" aria-label="Kategori">${cats.map(c => `<button role="tab" class="sandik-tab ${V.cat === c.k ? 'on' : ''}" aria-selected="${V.cat === c.k}" data-sandik="cat" data-k="${c.k}">${h(c.label)} <small>${c.n}</small></button>`).join('')}</div></div>`;
      const tools = `<div class="sandik-tools"><label class="sandik-search"><span class="sr">Sandıkta ara</span><input id="sandik-q" type="search" placeholder="Sandıkta ara…" value="${h(V.q)}" autocomplete="off"></label>
        <label class="sandik-sort"><span class="sr">Sıralama</span><select id="sandik-sort" aria-label="Sıralama"><option value="yeni" ${V.sort === 'yeni' ? 'selected' : ''}>En yeni</option><option value="ad" ${V.sort === 'ad' ? 'selected' : ''}>Ada göre</option></select></label></div>`;
      const list = all.length
        ? shown.length ? `<ul class="sandik-grid" aria-label="Sandıktaki kalemler">${shown.map(cardHtml).join('')}</ul>` : `<div class="sandik-empty sm" role="status"><p>Aramana uyan kalem yok.</p></div>`
        : `<div class="sandik-empty" role="status"><span aria-hidden="true">🧰</span><p>Sandığın boş. Sunucu hesabına kayıtlı ejderha, yumurta, eşya ya da yem yok.</p></div>`;
      const note = `<p class="sandik-note">Cevher, kalıp, Kor taşı ve özlerin sunucuda kaynak kaydı yok; bu yüzden sandıkta görünmez.${V.tradeOk ? '' : ' Takas rezervasyonları okunamadı; sunucu satışta yine denetler.'}</p>`;
      body = `<div class="sandik-body ${sel ? 'has-detail' : ''}"><section class="sandik-list">${tabs}${tools}${list}${note}</section>${sel ? detailHtml(sel) : ''}</div>`;
    }
    const busy = V.loading || st.busy;
    dlg.innerHTML = `<header class="sandik-head">
        <div class="sandik-titles"><small>Sunucu envanteri</small><h2 id="sandik-title">Ocak Sandığı</h2></div>
        <button class="sandik-icb" data-sandik="refresh" aria-label="Sunucudan yenile" ${busy ? 'disabled' : ''}>⟳</button>
        <button class="sandik-icb sandik-close" data-sandik="close" aria-label="Ocak Sandığı'nı kapat">✕</button>
      </header>
      <p class="sandik-live" aria-live="polite">${busy ? 'Sunucudan okunuyor…' : st.economy && st.economy.game ? `Sunucu hesabındaki kalemler · Ocak Kesesi ${h(st.economy.gold)} altın. Yerel oyundaki varlıklar ve yerel kese ayrıdır.` : ''}</p>
      ${body}`;
    if (focusKey) {
      const el = focusKey.startsWith('k:') ? dlg.querySelector(`[data-key="${CSS.escape(focusKey.slice(2))}"]`) : dlg.querySelector(focusKey);
      if (el) { el.focus(); if (caret != null) try { el.setSelectionRange(caret, caret); } catch (_) {} }
    }
    const tabsEl = dlg.querySelector('.sandik-tabs');
    if (tabsEl) {
      const on = tabsEl.querySelector('.on');
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      edge(tabsEl);
      tabsEl.addEventListener('scroll', () => edge(tabsEl), { passive: true });
    }
  }
  // Yatay taşan sekme satırında görünür kaydırma belirteci (kenar gölgesi + ok).
  function edge(el) {
    const w = el.parentElement;
    w.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    w.classList.toggle('more-l', el.scrollLeft > 2);
  }

  function goBedesten(e) {
    const t = bedestenTarget(e);
    if (!t || typeof ACT === 'undefined' || !ACT['bedesten-open']) return;
    close();
    if (typeof modalOn !== 'undefined' && modalOn && typeof closeModal === 'function') closeModal();
    ACT['bedesten-open']();
    UI.bedTab = 'ilanver'; UI.bedSellCat = t.sellCat; UI.bedArm = null;
    UI.bedPick = { kind: t.kind, id: t.id, jump: true };
    render_();
    requestAnimationFrame(() => {
      const input = document.querySelector(`[data-bed="${CSS.escape(t.kind === 'food' ? 'qty:food:' + t.id : 'price:' + t.kind + ':' + t.id)}"]`);
      if (input) { input.closest('.gcard')?.scrollIntoView({ block: 'center' }); input.focus(); }
    });
  }
  function render_() { if (typeof root.render === 'function') root.render(); }

  dlg.addEventListener('click', ev => {
    if (ev.target === dlg) { close(); return; } // kenar (backdrop) tıklaması
    const el = ev.target.closest('[data-sandik]');
    if (!el || el.disabled) return;
    const a = el.dataset.sandik;
    if (a === 'close') close();
    else if (a === 'refresh') load();
    else if (a === 'cat') { V.cat = el.dataset.k; V.sel = null; render(); dlg.querySelector('.sandik-tab.on')?.focus(); }
    else if (a === 'pick') { V.sel = el.dataset.key; render(); dlg.querySelector('.sandik-back')?.focus(); }
    else if (a === 'back') { const k = V.sel; V.sel = null; render(); dlg.querySelector(`[data-key="${CSS.escape(k || '')}"]`)?.focus(); }
    else if (a === 'sell') {
      const M = market(), st = M && M.state;
      const e = st && buildEntries({ economy: st.economy, mine: st.mine, trade: V.trade, accountId: st.accountId }, catalog).find(x => x.key === el.dataset.key);
      if (e) goBedesten(e);
    } else if (a === 'trade') { close(); if (typeof TRADE_UI !== 'undefined') TRADE_UI.open(); }
  });
  dlg.addEventListener('input', ev => { if (ev.target.id === 'sandik-q') { V.q = ev.target.value; V.sel = null; render(); } });
  dlg.addEventListener('change', ev => { if (ev.target.id === 'sandik-sort') { V.sort = ev.target.value; render(); } });
  dlg.addEventListener('keydown', ev => {
    if (ev.target.classList && ev.target.classList.contains('sandik-tab') && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      const tabs = [...dlg.querySelectorAll('.sandik-tab')], i = tabs.indexOf(ev.target);
      const next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      if (next) { ev.preventDefault(); next.click(); }
    }
  });
  // Giriş noktaları: [data-open-sandik] (Çanta, mobil Komuta Merkezi). Oyun modali açıksa önce kapanır.
  document.addEventListener('click', ev => {
    const el = ev.target.closest && ev.target.closest('[data-open-sandik]');
    if (!el) return;
    ev.preventDefault(); ev.stopPropagation();
    if (typeof modalOn !== 'undefined' && modalOn && typeof closeModal === 'function') closeModal();
    open(el);
  }, true);
  root.SANDIK_UI = { open, close, get isOpen() { return dlg.open; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
