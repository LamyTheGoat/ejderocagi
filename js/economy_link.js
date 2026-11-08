'use strict';
// ENG-10 · İstemci ↔ sunucu kesesi bağlantısı (hafta, borç, ödüllü düello sonucu, ocağı yeniden kur).
// ENG-12: hafta bileti KALDIRILDI. Yerel hafta hiçbir zaman bekletilmez; bağlıyken her hafta sonu sunucuya
// `week.end` olarak kuyruğa girer (aynı requestId ile yeniden deneme, kuyruk kalıcı). Göstergede yalnız borç kalır.
// İLKE (kullanıcı talimatı): oyunu YAVAŞLATMA, yerel oynanışı BOZMA.
//  - Bakım, üretme, Topçu ve tüm yerel akışlar eskisi gibi yerel `S` üzerinde çalışır. Sunucu yalnız
//    takas edilen ve kazanılan şeye (sunucu kesesi) bakar; bu dosya yerel `S`'e altın/varlık YAZMAZ.
//  - Bağlı değilken (çevrimdışı, statik sunucu, oturum yok, sunucu hatası, sunucu ocağı kurulmamış) eski akış.
//  - Bağlıyken "Haftayı Bitir" yerel haftayı HEMEN bitirir, sunucu `week.end` arka planda gider.
//  - Belirsiz yanıt (ağ/5xx): aynı gövde (aynı requestId) saklanır ve sonra aynen yeniden gönderilir.
// Üst kısım saf mantıktır (DOM'suz; tests/eng10_economy_link.test.js), alt kısım yalnız tarayıcıda çalışır.
(function (root) {
  const WEEK_ERRORS = {
    debt_outstanding: 'Sunucu kesende borç var: takas, Bedesten alımı ve harcama kapalı. Kazançların önce borca gider.',
    version_conflict: 'Sunucu kesen başka bir sekmede değişti; yeniden denendi.',
    request_id_reused: 'Hafta isteği çakıştı; durum yenilendi.',
    game_not_started: 'Sunucu ocağın henüz kurulmadı; hafta yalnız yerelde ilerledi.',
    trade_reserved_dragon: 'Açık takas teklifindeki varlık yüzünden sunucu haftası ilerlemedi. Takası bitir ya da iptal et.',
    trade_reserved_gold: 'Açık takas teklifindeki altın yüzünden sunucu haftası ilerlemedi. Takası bitir ya da iptal et.',
    trade_reserved_asset: 'Açık takas teklifindeki varlık yüzünden sunucu haftası ilerlemedi. Takası bitir ya da iptal et.',
    market_reserved_asset: 'Bedesten ilanındaki bir varlık yüzünden sunucu haftası ilerlemedi. İlanı kontrol et.',
    rate_limited: 'Çok sık istek; sunucu haftası birazdan yeniden denenecek.',
    rebuild_unavailable: 'Ocağı yeniden kurma şu an gerekli değil.',
    rebuild_cooldown: 'Ocağı yakın zamanda yeniden kurdun; bir sonraki yeniden kurma için birkaç hafta daha geçmeli.',
  };
  const SETTLEMENT_REASONS = {
    daily_pair_limit: 'Bu rakiple bugünkü ödüllü düello sınırına ulaştın. Maç oynandı, ödül yok. Sınır yarın (UTC) yenilenir.',
    daily_account_limit: 'Bugünkü ödüllü düello sınırın doldu. Maç oynandı, ödül yok. Sınır yarın (UTC) yenilenir.',
    forfeit_too_short: 'Rakip çok erken çekildi; ödül için yeterli tur oynanmadı.',
    forfeit_leaver: 'Meydandan çekildiğin için bu maçtan ödül yok.',
    match_expired: 'Maç süresi doldu; ödül yok.',
    match_void: 'Maç geçersiz sayıldı; ödül yok.',
    same_account: 'Aynı hesaba karşı ödüllü düello ödül vermez.',
  };
  const REBUILD_HINT = '<b>Ocak iflasın eşiğinde.</b> Hesabın silinmez: Menü (Çanta) → "Sunucu Kesesi" ekranından ocağı yeniden kurabilirsin; varlıkların olduğu gibi kalır.';
  const OUTCOME = { win: 'Zafer', draw: 'Beraberlik', loss: 'Yenilgi', forfeit: 'Çekilme', void: 'Geçersiz maç', none: 'Ödülsüz' };

  // Yerel "Haftayı Bitir"in ne yapacağını söyler (ENG-12: bekletme yok).
  //  local  → bağlı değil ya da sunucu görünümü yok: eski akış (yerel hafta, sunucu çağrısı yok)
  //  server → yerel hafta hemen biter, sunucu week.end arka planda (kuyruk)
  function weekGate({ linked, week }) {
    if (!linked || !week) return { mode: 'local' };
    return { mode: 'server' };
  }
  // Hafta düğmesinin altındaki kısa satır: yalnız borç varsa kısa borç rozeti (bilet göstergesi yok).
  function badgeText({ linked, week }) {
    if (!linked || !week) return '';
    return week.debt > 0 ? `Borç ${week.debt}` : '';
  }
  function weekSummary(result) {
    if (!result) return '';
    const parts = [];
    if (result.season) parts.push(`Sunucu ocağında ${result.season.to}. sezon başladı`);
    else if (result.week) parts.push(`Sunucu kesesi: hafta ${result.week.to}`);
    if (result.upkeep && result.upkeep.charged) parts.push(`bakım −${result.upkeep.charged}`);
    if (result.income && result.income.paidDebt) parts.push(`borca ${result.income.paidDebt}`);
    if (result.debt && result.debt.after > 0) parts.push(`borç ${result.debt.after}`);
    return parts.join(' · ');
  }
  function errorText(code) { return WEEK_ERRORS[code] || 'Sunucu haftası şu an doğrulanamadı; yerel oyun etkilenmedi.'; }
  function settlementText(msg) {
    if (!msg) return '';
    if (msg.status === 'pending') return 'Ödül işleniyor; sunucu kesinleştirince kesene yansır.';
    const head = OUTCOME[msg.outcome] ? `${OUTCOME[msg.outcome]}. ` : '';
    if (msg.status === 'paid') {
      const debt = msg.paidDebt ? ` (${msg.paidDebt} altını borcuna gitti)` : '';
      return `${head}Ödüllü düello: +${msg.amount} altın kazanılmış olarak sunucu kesene eklendi${debt}.`;
    }
    return head + (SETTLEMENT_REASONS[msg.reason] || 'Bu maçtan ödül yok.');
  }
  // Ödüllü düelloya çıkacak sunucu ejderhası: önce sunucu yıldızı, yoksa ilk uygun ejderha.
  // Sunucu yine de denetler (checkDuelEntry); bu yalnız varsayılan seçimdir.
  function pickDuelDragon(economy) {
    if (!economy || !economy.game || !Array.isArray(economy.dragons)) return null;
    const ok = row => row && row.assetId && row.data && !row.data.dead && !row.data.task && !row.data.tradeLocked && !row.data.busy;
    const star = economy.dragons.find(row => row.data && row.data.id === economy.game.star);
    if (ok(star)) return star;
    return economy.dragons.find(ok) || null;
  }
  function rebuildAvailable(week, threshold) {
    return !!(week && week.rebuild && week.rebuild.available && (!threshold || week.debtWeeks >= threshold));
  }

  // createEconomyLink: tarayıcı dışı testte `client` sahte verilir.
  function createEconomyLink({ getClient, isOnline = () => true, notify = () => {}, onChange = () => {}, onWeek = () => {}, storage = null, queueKey = () => null } = {}) {
    let status = 'off', lastError = '', lastWeek = null, inflight = null, conflictRetried = false, owed = 0, loadedKey = null;
    // O-3: henüz gönderilmemiş haftalar da hesap anahtarıyla saklanır (yenilemede kaybolmaz). Hata → yalnız bellek.
    const saveOwed = () => {
      const key = queueKey(); if (!storage || !key) return;
      try { if (owed > 0) storage.setItem(key, String(owed)); else storage.removeItem(key); } catch (_) {}
    };
    const loadOwed = () => {
      const key = queueKey(); if (!storage || !key || key === loadedKey) return;
      loadedKey = key;
      try { const n = Number(storage.getItem(key)); owed = Number.isSafeInteger(n) && n > 0 && n <= 50 ? n : 0; } catch (_) { owed = 0; }
    };
    const client = () => (getClient && getClient()) || null;
    const linked = () => {
      const c = client();
      return !!(c && isOnline() && c.economyReady && c.state && c.state.game && status === 'ready');
    };
    const week = () => (client() ? client().week : null);
    const pendingWeek = () => !!(client() && client().pendingType === 'week.end');
    const gate = () => weekGate({ linked: linked(), week: week() });
    const changed = () => { try { onChange(); } catch (_) {} };

    async function sync() {
      loadOwed();
      const c = client();
      if (!c || !isOnline()) { status = 'off'; changed(); return status; }
      try {
        await c.refresh();
        status = c.economyReady && c.state && c.state.game ? 'ready' : 'nogame';
        lastError = '';
      } catch (e) { status = 'error'; lastError = e.message; }
      changed();
      return status;
    }
    // O-2: haftalar kuyruğu. Her bağlı yerel hafta sonu bir `week.end` borcudur (`owed`). Kuyruk boşaltılırken önce
    // askıdaki HER komut (week.end ya da başka) aynı gövdeyle yeniden denenir; `command_pending_retry_required`
    // gelirse hafta kaybolmaz, askıdaki iş bitince sıradaki hafta gönderilir.
    const AMBIGUOUS = 'Sunucu haftası doğrulanamadı; aynı istek sonra otomatik yeniden denenecek. Yerel oyun etkilenmedi.';
    const definite = e => e && e.status >= 400 && e.status < 500;
    async function flush() {
      const c = client();
      if (!c) return null;
      let last = null, guard = 0;
      try {
        while (guard++ < 50) {
          if (c.hasPending) {
            try { await c.retry(); } catch (e) {
              if (!definite(e)) { lastError = e.message; notify(AMBIGUOUS, 'warn'); return last; }
              lastError = e.message; // kesin ret: askı temizlendi, sıradakine geç
            }
            continue;
          }
          if (owed <= 0) break;
          try {
            const data = await c.command('week.end', {});
            owed--; saveOwed(); conflictRetried = false; lastWeek = data.result || null; lastError = ''; last = data;
            try { onWeek(lastWeek); } catch (_) {} // ENG-12: kayıtlı senkron (hatchReady → egg.hatch) kuyruğa ekler
            const text = weekSummary(lastWeek);
            if (text) notify(text, 'mute');
          } catch (e) {
            const code = e.message;
            if (code === 'command_pending_retry_required') continue;
            if (code === 'version_conflict' && !conflictRetried) { conflictRetried = true; continue; }
            conflictRetried = false; lastError = code;
            owed--; saveOwed(); // belirsizse artık askıdaki komuttur; kesinse sunucu reddetti
            notify(definite(e) ? errorText(code) : AMBIGUOUS, 'warn');
            if (!definite(e)) return last;
          }
        }
        return last;
      } finally {
        try { await c.refresh(); } catch (_) {}
        // K5: eşik aşıldıysa yol göster (sunucu bayrağı; eşik sayısı istemcide tutulmaz).
        if (lastWeek && rebuildAvailable(c.week)) notify(REBUILD_HINT, 'warn');
        changed();
      }
    }
    function schedule() {
      const job = (inflight || Promise.resolve()).then(flush);
      inflight = job.finally(() => { if (inflight === job) inflight = null; });
      return inflight;
    }
    // ENG-12 · Genel ekonomi komutu (kayıtlı hesap senkronu: satın alma, satış, kuluçka…). Hafta kuyruğuyla AYNI
    // zincirde çalışır; tek askı kuralı korunur: askıdaki komut önce aynı gövdeyle yeniden denenir. Sonuç:
    // { ok:true, data } | { ok:false, definite, code }. definite=false (ağ/5xx/zaman aşımı) → askıda, sonra yeniden.
    function exec(type, args) {
      const run = async () => {
        const c = client();
        if (!c || !linked()) return { ok: false, definite: false, code: 'not_linked' };
        let conflict = false;
        for (let guard = 0; guard < 6; guard++) {
          if (c.hasPending) {
            try { await c.retry(); } catch (e) { if (!definite(e)) return { ok: false, definite: false, code: e.message }; }
            continue;
          }
          try { return { ok: true, data: await c.command(type, args) }; } catch (e) {
            if (e.message === 'command_pending_retry_required') continue;
            if (e.message === 'version_conflict' && !conflict) { conflict = true; continue; }
            return { ok: false, definite: definite(e), code: e.message };
          }
        }
        return { ok: false, definite: false, code: 'economy_busy' };
      };
      const job = (inflight || Promise.resolve()).then(run, run);
      inflight = job.then(() => {}, () => {});
      return job;
    }
    // runLocal: mevcut yerel hafta sonu (ACT.endweek gövdesi). Dönen: 'local' | 'server'.
    function endWeek(runLocal) {
      const g = gate();
      runLocal();
      if (g.mode === 'server') { owed++; saveOwed(); schedule(); }
      return g.mode;
    }
    // ENG-10 (6): kayıtlı (X oturumlu) hesapta sunucu ocağı ilk girişte sessizce kurulur (`game.start`). Yerel `S`
    // hiç değişmez ve sunucuya taşınmaz (istemci verisine güvenilmez); sunucu ocağı başlangıç varlıklarıyla açılır.
    // Hata olursa sessizce eski akış sürer. Oyunu beklemez.
    let autoTried = false;
    async function autoStart(registered) {
      const c = client();
      if (!c || !registered || autoTried || !isOnline() || status !== 'nogame' || c.hasPending) return false;
      autoTried = true;
      try { await c.command('game.start', {}); } catch (_) { return false; }
      await sync();
      return linked();
    }
    async function rebuild() {
      const c = client();
      if (!c || !linked()) return null;
      try {
        const data = await c.command('ocak.rebuild', {});
        notify('<b>Ocak yeniden kuruldu.</b> Borç silindi; ejderhaların, yumurtaların, eşyaların ve yemin olduğu gibi duruyor.', 'goal');
        return data;
      } catch (e) { notify(errorText(e.message), 'warn'); return null; } finally { await sync(); }
    }
    // Açılışta/odakta: askıdaki komut ve bekleyen haftalar varsa kuyruk boşaltılır.
    async function retryPending() {
      loadOwed();
      const c = client();
      if (!c || !isOnline() || (!c.hasPending && owed <= 0)) return;
      await schedule();
    }
    return {
      sync, endWeek, rebuild, retryPending, gate, autoStart, exec,
      badge: () => badgeText({ linked: linked(), week: week() }),
      duelDragon: () => (linked() ? pickDuelDragon(client().state) : null),
      get linked() { return linked(); },
      get idle() { return !inflight; },
      get state() { return { status, lastError, lastWeek, week: week(), linked: linked(), pendingWeek: pendingWeek(), queued: owed }; },
      whenIdle: () => inflight || Promise.resolve(),
    };
  }

  // Söz en geç `ms` içinde çözülür (iş iptal edilmez, arka planda tamamlanır).
  function bounded(promise, ms, fallback) {
    let timer = null;
    const late = new Promise(resolve => { timer = setTimeout(() => resolve(fallback()), ms); });
    return Promise.race([Promise.resolve(promise).catch(() => fallback()), late]).finally(() => clearTimeout(timer));
  }

  const api = { createEconomyLink, bounded, weekGate, badgeText, weekSummary, errorText, settlementText, pickDuelDragon, rebuildAvailable, SETTLEMENT_REASONS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  Object.assign(root, { ECO_LINK_LIB: api });

  // ---------- Tarayıcı ----------
  const escHtml = s => (typeof esc === 'function' ? esc(s) : String(s));
  const link = createEconomyLink({
    getClient: () => (typeof MP !== 'undefined' && MP.economyClient) || null,
    storage: (() => { try { return root.localStorage; } catch (_) { return null; } })(),
    queueKey: () => (typeof MP !== 'undefined' && MP.accountId ? 'eo-week-queue:' + MP.accountId : null),
    isOnline: () => typeof MP !== 'undefined' && !MP.staticServer && !!MP.authenticated,
    notify: (html, kind) => { if (typeof toast === 'function') toast(html, kind); },
    onWeek: result => { if (root.ECO_SYNC && root.ECO_SYNC.afterServerWeek) root.ECO_SYNC.afterServerWeek(result); },
    onChange: () => {
      if (typeof MP !== 'undefined') MP.economyReady = link.linked;
      // Tam yeniden çizim yok (yazı/animasyon kesilmesin): yalnız hafta düğmesindeki kısa borç satırı güncellenir.
      const ew = root.document && root.document.querySelector('.endweek .eco-week');
      if (ew) { ew.textContent = link.badge(); ew.hidden = !ew.textContent; }
      if (typeof root.ECO_SYNC !== 'undefined' && root.ECO_SYNC.onLinkChange) root.ECO_SYNC.onLinkChange();
    },
  });
  let lastSync = 0;
  const BOOT_MS = 5000;
  root.ECO_LINK = Object.assign(link, {
    // Bağlantı kurulduktan sonra (net.js) ve odak dönüşünde çağrılır; en sık 30 sn'de bir okur.
    // O-1: boot en geç BOOT_MS (5 sn) içinde döner; ağ yavaşsa iş arka planda sürer, oyun beklemez.
    boot(force) {
      const t = Date.now();
      if (!force && t - lastSync < 30000) return Promise.resolve(link.state.status);
      lastSync = t;
      return bounded(link.retryPending().then(() => link.sync()).then(st => (st === 'nogame' && typeof MP !== 'undefined' && MP.xVerified ? link.autoStart(true).then(() => link.state.status) : st)), BOOT_MS, () => link.state.status);
    },
    statusModal() {
      if (typeof showModal !== 'function') return;
      const st = link.state, w = st.week;
      const lines = [];
      if (!st.linked) lines.push('<p>Sunucu kesesine bağlı değilsin; oyun yerel olarak eskisi gibi oynanır. Takas, Bedesten ve Ocak Sandığı açıldığında sunucu ocağın kurulur.</p>');
      else {
        lines.push(`<p><b>Sunucu haftası:</b> ${w.seasonNo > 1 ? `${w.seasonNo}. sezon · ` : ''}${w.week}/${w.season}</p>`);
        lines.push(`<p><b>Borç:</b> ${w.debt > 0 ? `${w.debt} altın · ${w.debtWeeks} haftadır borçlu. Takas, Bedesten alımı ve harcama kapalı; kazançlar önce borca gider.` : 'yok'}</p>`);
        if (w.rebuild && w.rebuild.available) lines.push(`<div class="eco-rebuild"><p><b>Ocak iflasın eşiğinde.</b> Hesabın silinmez. "Ocağı yeniden kur" borcu siler; ejderha, yumurta, eşya ve yemin olduğu gibi kalır.</p><button class="btn primary" data-a="eco-rebuild">Ocağı yeniden kur</button></div>`);
        else if (w.debt > 0 && w.rebuild && w.rebuild.waitWeeks > 0) lines.push(`<p class="mute sm">Ocağı son yeniden kuruşundan beri yeterli hafta geçmedi; ${w.rebuild.waitWeeks} hafta sonra yeniden açılır.</p>`);
        else if (w.debt > 0 && w.rebuild) lines.push(`<p class="mute sm">Borç ${w.rebuild.threshold} hafta üst üste sürerse "Ocağı yeniden kur" açılır.</p>`);
      }
      if (st.lastError) lines.push(`<p class="mute sm">${escHtml(errorText(st.lastError))}</p>`);
      showModal(`<div class="parch eco-modal"><p class="kicker">Sunucu kesesi</p><h2>Sunucu haftası ve borç</h2>${lines.join('')}<div class="mbtns"><button class="btn ghost" data-a="mclose">Kapat</button></div></div>`, 'paper');
    },
  });
  if (typeof ACT !== 'undefined') Object.assign(ACT, {
    'eco-status'() { root.ECO_LINK.statusModal(); },
    'eco-rebuild'() { link.rebuild().then(() => { if (typeof closeModal === 'function') closeModal(); }); },
  });
  if (root.addEventListener) root.addEventListener('focus', () => { if (typeof MP !== 'undefined' && MP.economyClient) root.ECO_LINK.boot(); });
})(typeof globalThis !== 'undefined' ? globalThis : this);
