'use strict';
// ENG-07 · Bedesten istemcisi. Tek otorite sunucudur: bu dosya yerel S'e (altın, envanter) YAZMAZ.
// Belirsiz yanıtta (ağ/5xx) aynı gövde saklanır ve "Sonucu doğrula" ile aynen yeniden gönderilir;
// sonuç doğrulanmadan başarı gösterilmez.
(function (root) {
  function createMarketClient({ fetch: request = root.fetch && root.fetch.bind(root), storage = root.localStorage, uuid = () => root.crypto.randomUUID(), onChange = () => {} } = {}) {
    let accountId = null, handle = '', listings = [], mine = [], economy = null, pending = null, busy = false, error = '', notice = '', loaded = false, refreshing = null, epoch = 0;
    const emit = () => { try { onChange(api.state); } catch (_) {} };
    const key = id => 'eo-market-pending:' + id;
    const persist = () => { try { if (pending) storage.setItem(key(accountId), JSON.stringify(pending)); else storage.removeItem(key(accountId)); } catch (_) {} };
    async function json(url, options = {}) {
      const r = await request(url, { credentials: 'same-origin', ...options });
      let data = {};
      try { data = await r.json(); } catch (_) {}
      if (!r.ok) throw Object.assign(new Error(data.error || 'market_unavailable'), { status: r.status });
      return data;
    }
    async function session() {
      const bootstrap = () => json('/api/session', { method: 'POST' });
      const data = await (root.navigator && root.navigator.locks ? root.navigator.locks.request('eo-guest-bootstrap', bootstrap) : bootstrap());
      if (accountId !== data.accountId) {
        epoch++; accountId = data.accountId; handle = data.handle; listings = []; mine = []; economy = null; pending = null; loaded = false;
        try { const saved = JSON.parse(storage.getItem(key(accountId)) || 'null'); if (saved && saved.accountId === accountId) pending = saved; } catch (_) {}
      }
    }
    function refresh() {
      if (refreshing) return refreshing;
      refreshing = (async () => {
        try {
          await session();
          const captured = epoch;
          const [market, eco] = await Promise.all([json('/api/market'), json('/api/economy')]);
          if (captured !== epoch) return;
          listings = Array.isArray(market.listings) ? market.listings : [];
          mine = Array.isArray(market.mine) ? market.mine : [];
          if (!economy || !eco.economy || (eco.economy.version || 0) >= (economy.version || 0)) economy = eco.economy || null;
          loaded = true; error = '';
        } catch (e) { error = e.message; } finally { refreshing = null; emit(); }
      })();
      return refreshing;
    }
    const DONE = { list: 'İlan sunucuya kaydedildi.', cancel: 'İlan geri çekildi; varlık hesabında serbest.', buy: 'Satın alma sunucuda tamamlandı.' };
    async function transmit() {
      const captured = epoch, body = pending.body;
      try {
        const data = await json('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (captured !== epoch) return data;
        pending = null; persist(); notice = DONE[body.op] || ''; error = '';
        await refresh();
        return data;
      } catch (e) {
        // 4xx kesin ret: hiçbir şey yazılmadı. Ağ/5xx belirsiz: gövde saklanır, başarı gösterilmez.
        if (captured === epoch && e.status >= 400 && e.status < 500) { pending = null; persist(); notice = ''; await refresh(); }
        error = e.status >= 400 && e.status < 500 ? e.message : 'market_unverified';
        throw e;
      }
    }
    async function send(op, fields) {
      if (busy) throw new Error('market_busy');
      busy = true; error = ''; notice = ''; emit();
      try {
        await session();
        if (pending) throw new Error('market_pending_retry');
        pending = { accountId, body: { op, requestId: uuid(), ...fields } }; persist();
        return await transmit();
      } catch (e) { if (!error) error = e.message; throw e; } finally { busy = false; emit(); }
    }
    async function retry() {
      if (busy || !pending) return;
      busy = true; error = ''; emit();
      try { await session(); if (pending) await transmit(); } catch (_) {} finally { busy = false; emit(); }
    }
    const api = {
      refresh, retry,
      list: (kind, idOrKey, quantity, unitPrice) => send('list', { kind, ...(kind === 'food' ? { foodKey: idOrKey } : { assetId: idOrKey }), quantity, unitPrice }),
      cancel: listingId => send('cancel', { listingId }),
      // ENG-10 (O-7): alıcının gördüğü ilan sürümü bağlanır; ilan o arada değiştiyse sunucu 'listing_changed' döner.
      buy: (listing, quantity) => send('buy', { listingId: listing.id, quantity, unitPrice: listing.unitPrice, ...(Number.isSafeInteger(listing.stateVersion) ? { stateVersion: listing.stateVersion } : {}) }),
      get state() { return { accountId, handle, listings, mine, economy, pending, busy, error, notice, loaded }; },
    };
    return api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createMarketClient };
  else {
    root.createMarketClient = createMarketClient;
    const open = () => typeof UI !== 'undefined' && UI.view === 'pazar' && UI.stall === 'bedesten';
    root.MARKET_CLIENT = createMarketClient({
      onChange() {
        // Yazım sırasında yeniden çizme girdiyi silmesin.
        const active = root.document && root.document.activeElement;
        if (open() && typeof render === 'function' && !(active && active.closest && active.closest('.v-bedesten input'))) render();
      },
    });
    setInterval(() => { if (open() && !root.document.hidden) root.MARKET_CLIENT.refresh(); }, 10000);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
