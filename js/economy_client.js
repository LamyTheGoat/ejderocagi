'use strict';
(function (root) {
  // Economic commands have their own queue; neither animation nor movement uses it.
  // Until all dependent game flows are ported, snapshots live here, not in S.
  // ENG-10 O-1: her ekonomi isteği en çok `timeoutMs` (12 sn) bekler. Zaman aşımı BELİRSİZ sayılır: askıdaki komut
  // aynı requestId ile korunur ve sonra aynen yeniden gönderilir; arayüz beklemede kilitlenmez.
  const TIMEOUT_MS = 12000;
  function createEconomyClient({ fetch: request = root.fetch.bind(root), uuid = () => root.crypto.randomUUID(), onState = () => {}, timeoutMs = TIMEOUT_MS } = {}) {
    let snapshot = null, loading = null, pending = null, running = null, week = null, ready = false;
    const accept = data => {
      // ENG-10: GET /api/economy salt okunur hafta/bilet/borç görünümünü ve economyReady bayrağını taşır.
      if (Object.hasOwn(data, 'week')) week = data.week ? { ...data.week, receivedAt: Date.now() } : null;
      if (Object.hasOwn(data, 'economyReady')) ready = data.economyReady === true;
      if (data.economy && (!snapshot || data.economy.version >= snapshot.version)) { snapshot = data.economy; onState(snapshot); }
      return snapshot;
    };
    const read = async response => {
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || 'economy_unavailable'), { status: response.status });
      return data;
    };
    // fetch + gövde okuma tek zaman aşımı altında; süre dolunca istek iptal edilir (AbortController varsa).
    function timed(url, options) {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      let timer = null;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { try { if (ctrl) ctrl.abort(); } catch (_) {} reject(Object.assign(new Error('economy_timeout'), { timeout: true })); }, timeoutMs);
      });
      const work = Promise.resolve().then(() => request(url, ctrl ? { ...options, signal: ctrl.signal } : options)).then(read);
      work.catch(() => {}); // zaman aşımından sonra gelen ret yutulur
      return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
    }
    function refresh() {
      if (loading) return loading;
      loading = timed('/api/economy', { credentials: 'same-origin' }).then(accept).finally(() => { loading = null; });
      return loading;
    }
    async function sendPending() {
      if (!pending) throw new Error('no_pending_command');
      if (running) return running;
      running = (async () => {
        try {
          const data = await timed('/api/economy/command', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending),
          });
          pending = null; accept(data); return data;
        } catch (error) {
          // 5xx/network/timeout failures are ambiguous: keep the same request ID for retry.
          if (error.status >= 400 && error.status < 500) {
            pending = null;
            if (error.status === 409) await refresh();
          }
          throw error;
        } finally { running = null; }
      })();
      return running;
    }
    async function command(type, args = {}) {
      if (pending) throw new Error('command_pending_retry_required');
      if (!snapshot) await refresh();
      if (pending) throw new Error('command_pending_retry_required');
      pending = { requestId: uuid(), expectedVersion: snapshot.version, type, args };
      return sendPending();
    }
    return { refresh, command, retry: sendPending, get state() { return snapshot; }, get week() { return week; }, get economyReady() { return ready; },
      get pendingType() { return pending ? pending.type : null; }, get hasPending() { return !!pending; } };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createEconomyClient };
  else root.createEconomyClient = createEconomyClient;
})(typeof globalThis !== 'undefined' ? globalThis : this);
