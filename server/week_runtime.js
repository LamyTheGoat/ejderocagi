'use strict';
// ENG06 P-C · Sunucu hafta komutu (`week.end`), hafta bileti (D2) ve haftalık borç (D4).
// Mevcut `endWeek` (js/week.js) sunucu VM'inde AYNEN çalışır; burada yalnız sunucu sınırı vardır:
//   1. Hafta bileti tembel hesaplanır: zaman yalnız sunucu saatinden (`now`), cron/arka plan yok.
//   2. `endWeek` içindeki her altın değişimi sırasıyla kaydedilir; VM içinde bakiye 0'ın altına
//      inmez (istemcideki `S.neg`/iflas yolu tetiklenmez). Değişimler sonra ENG-05 kovalarına
//      `economy_debt` üzerinden uygulanır: gider → charge (kalan borç), gelir → receive (önce borç).
//   3. Kaynağı doğrulanmamış haftalık çıktılar (rol geliri, yem, ün, yeni varlık) 'unknown' olur.
const sources = require('./economy_sources');
const debt = require('./economy_debt');
const { TICKETS } = require('./week_config');
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const count = n => Number.isSafeInteger(n) && n >= 0;

// Bilet durumu: game.weekTickets = { schema: 1, count, at }. `at`, bir sonraki dolumun sayıldığı çapa.
function syncTickets(game, now, cfg = TICKETS) {
  if (!Number.isSafeInteger(now) || now <= 0) fail('server_time_unavailable', 503);
  // Eski kayıt (alan yok): yeni hesapla aynı başlangıç, çapa şimdiki sunucu zamanı.
  if (game.weekTickets === undefined) game.weekTickets = { schema: 1, count: cfg.initial, at: now };
  const t = game.weekTickets;
  if (!t || typeof t !== 'object' || t.schema !== 1 || !count(t.count) || !count(t.at)) fail('week_ticket_state_invalid');
  if (t.count > cfg.cap) t.count = cfg.cap; // Tavan düşürüldüyse fazlası tutulmaz.
  if (t.count >= cfg.cap) { if (now > t.at) t.at = now; return t; } // Tavanda zaman biriktirilmez.
  if (now <= t.at) return t; // Saat geri alındı/aynı an: dolum yok, çapa geri gitmez.
  const gained = Math.floor((now - t.at) / cfg.refillMs);
  if (gained > 0) {
    t.count = Math.min(cfg.cap, t.count + gained);
    t.at = t.count >= cfg.cap ? now : t.at + gained * cfg.refillMs;
  }
  return t;
}
function ticketView(t, cfg = TICKETS) {
  return { count: t.count, cap: cfg.cap, nextAt: t.count >= cfg.cap ? null : t.at + cfg.refillMs };
}
function takeTicket(game, now, cfg = TICKETS) {
  const t = syncTickets(game, now, cfg);
  if (t.count < 1) fail('week_ticket_unavailable');
  t.count -= 1;
  return ticketView(t, cfg);
}

// `api` VM çalışma zamanıdır (makeRuntime({week:true})). `S` onun durum nesnesidir.
function runWeek(api, S) {
  // ENG-10 (O-2): son haftada endWeek oyunu 'sezon' sonuyla bitirir (istemcideki gibi); sunucu ardından
  // nesil devrini (api.seasonRollServer, js/season.js seasonStart'ın veri kısmı) uygular. Çıkmaz sokak yok.
  const seasonEnd = S.week >= api.SEASON;
  const debtBefore = debt.debtOf(S);
  const gold0 = S.gold, food0 = { ...S.food }, un0 = S.un, week0 = S.week;
  const deltas = [];
  let virtual = gold0;
  Object.defineProperty(S, 'gold', {
    configurable: true, enumerable: true,
    get: () => virtual,
    set: value => {
      if (!Number.isSafeInteger(value)) fail('gold_limit');
      if (value !== virtual) deltas.push(value - virtual);
      virtual = Math.max(0, value); // Kasa VM içinde eksiye düşmez; borç ayrıca tutulur.
    },
  });
  let out;
  try { out = api.endWeekServer(); }
  finally { Object.defineProperty(S, 'gold', { value: gold0, writable: true, enumerable: true, configurable: true }); }
  let season = null;
  if (seasonEnd && S.over && S.ending === 'sezon') season = api.seasonRollServer();
  // İflas ya da beklenmeyen bitiş sunucuda onaylı değil; oluşursa komut tamamen geri alınır.
  if (S.over || S.ending) fail('week_end_state_invalid');

  // Altın: endWeek sırasıyla uygula.
  let charged = 0, paid = 0, unpaid = 0, income = 0, paidDebt = 0;
  const debit = sources.bucket(0, 'earned');
  for (const delta of deltas) {
    if (delta < 0) {
      const r = debt.charge(S, -delta);
      charged += -delta; paid += r.paid; unpaid += r.unpaid;
      for (const k of ['bound', 'unknown', 'earned']) debit[k] += r.debit[k];
    } else {
      // Haftalık gelir (ör. avcı rolü) için doğrulanmış üretici yok: en muhafazakâr sınıf.
      const r = debt.receive(S, delta, 'unknown');
      income += delta; paidDebt += r.paidDebt;
    }
  }
  // Yem: haftada artan yem kaynağı doğrulanmamış; azalma beklenmiyor (fail-closed).
  for (const key of new Set([...Object.keys(food0), ...Object.keys(S.food)])) {
    const before = food0[key] || 0, after = S.food[key] || 0;
    if (after < before) fail('week_food_unreconciled');
    if (after > before) { S.food[key] = before; sources.addFood(S, key, after - before, 'unknown'); }
  }
  if (S.un > un0) S.milestoneSources.renown = 'unknown';
  return {
    out, summary: {
      week: { from: week0, to: S.week },
      upkeep: { charged, paid, unpaid, debit },
      income: { amount: income, source: 'unknown', paidDebt },
      debt: { before: debtBefore },
      ...(season ? { season } : {}),
    },
  };
}
// Haftanın TÜM girişleri (hedef ödülleri dahil) uygulandıktan sonra çağrılır.
// debtWeeks: art arda borçla kapanan hafta sayısı. Yalnız sayılır; iflas/bitiş YOK (D1a açık).
function closeDebtWeek(S, result) {
  const now = debt.debtOf(S);
  S.debt = now;
  S.debtWeeks = now > 0 ? (count(S.debtWeeks) ? S.debtWeeks : 0) + 1 : 0;
  result.debt = { ...result.debt, after: now, weeks: S.debtWeeks };
}

// VM nesneleri (rapor, kuyruk) makbuza düz veri olarak yazılır.
function weekResult(out, summary, ticket) {
  const hatchReady = [], events = [];
  for (const q of out.queue) {
    if (q.type === 'hatch') hatchReady.push(q.egg.assetId);
    else if (q.type === 'event') events.push(q.ev.id); // Olay seçimleri istemci etkileşimi; sunucuda uygulanmaz.
  }
  return {
    ...summary, ticket, hatchReady, events,
    report: out.report.map(r => ({ dragonAssetId: r.d.assetId || null, lines: [...r.lines] })),
    gen: [...out.gen],
    skipped: summary.season ? ['rivalWeek', 'ordersWeek', 'careerCheck', 'eventChoices', 'seasonStarPick', 'careerSetup'] : ['rivalWeek', 'ordersWeek', 'careerCheck', 'eventChoices'],
  };
}

// ENG-10 · Salt okunur hafta durumu (GET /api/economy). Kaydı DEĞİŞTİRMEZ: dolum bir kopya üzerinde
// hesaplanır; gerçek dolum yine yalnız `week.end` komutunda yazılır. Bozuk bilet durumu → ticket:null.
const SEASON_WEEKS = 20; // js/week.js SEASON ile aynı (testle doğrulanır).
function weekStatus(game, now, cfg = TICKETS) {
  if (!game || typeof game !== 'object') return null;
  let ticket = null;
  try {
    const probe = { weekTickets: game.weekTickets === undefined ? undefined : JSON.parse(JSON.stringify(game.weekTickets)) };
    ticket = ticketView(syncTickets(probe, now, cfg), cfg);
  } catch (_) { ticket = null; }
  const debtNow = Number.isSafeInteger(game.debt) && game.debt > 0 ? game.debt : 0;
  const weeks = count(game.debtWeeks) ? game.debtWeeks : 0;
  return { week: Number.isSafeInteger(game.week) ? game.week : 1, seasonNo: Number.isSafeInteger(game.seasonNo) ? game.seasonNo : 1,
    season: SEASON_WEEKS, ticket, debt: debtNow, debtWeeks: weeks, serverNow: now };
}

module.exports = { syncTickets, takeTicket, ticketView, runWeek, weekResult, closeDebtWeek, weekStatus, SEASON_WEEKS };
