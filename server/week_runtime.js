'use strict';
// ENG06 P-C · Sunucu hafta komutu (`week.end`) ve haftalık borç (D4).
// ENG-12: hafta bileti (D2) KALDIRILDI. `week.end` sınırsızdır; idempotency (`requestId`) ve sürüm kontrolü
// depo katmanında aynen geçerlidir. Eski kayıttaki `weekTickets` alanı sessizce silinir (dropLegacyTickets).
// Mevcut `endWeek` (js/week.js) sunucu VM'inde AYNEN çalışır; burada yalnız sunucu sınırı vardır:
//   1. `endWeek` içindeki her altın değişimi sırasıyla kaydedilir; VM içinde bakiye 0'ın altına
//      inmez (istemcideki `S.neg`/iflas yolu tetiklenmez). Değişimler sonra ENG-05 kovalarına
//      `economy_debt` üzerinden uygulanır: gider → charge (kalan borç), gelir → receive (önce borç).
//   2. Kaynağı doğrulanmamış haftalık çıktılar (rol geliri, yem, ün, yeni varlık) 'unknown' olur.
const sources = require('./economy_sources');
const debt = require('./economy_debt');
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const count = n => Number.isSafeInteger(n) && n >= 0;

// ENG-12: bilet artık yok. Eski kayıtlarda kalan alan hiçbir şeyi kısıtlamaz; görüldüğü komutta silinir.
function dropLegacyTickets(game) {
  if (game && typeof game === 'object' && Object.hasOwn(game, 'weekTickets')) delete game.weekTickets;
  return game;
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
function weekResult(out, summary) {
  const hatchReady = [], events = [];
  for (const q of out.queue) {
    if (q.type === 'hatch') hatchReady.push(q.egg.assetId);
    else if (q.type === 'event') events.push(q.ev.id); // Olay seçimleri istemci etkileşimi; sunucuda uygulanmaz.
  }
  return {
    ...summary, hatchReady, events,
    report: out.report.map(r => ({ dragonAssetId: r.d.assetId || null, lines: [...r.lines] })),
    gen: [...out.gen],
    skipped: summary.season ? ['rivalWeek', 'ordersWeek', 'careerCheck', 'eventChoices', 'seasonStarPick', 'careerSetup'] : ['rivalWeek', 'ordersWeek', 'careerCheck', 'eventChoices'],
  };
}

// ENG-10 · Salt okunur hafta durumu (GET /api/economy). Kaydı DEĞİŞTİRMEZ.
// ENG-12: bilet görünümü kaldırıldı; eski kayıttaki `weekTickets` yok sayılır.
const SEASON_WEEKS = 20; // js/week.js SEASON ile aynı (testle doğrulanır).
function weekStatus(game, now) {
  if (!game || typeof game !== 'object') return null;
  const debtNow = Number.isSafeInteger(game.debt) && game.debt > 0 ? game.debt : 0;
  const weeks = count(game.debtWeeks) ? game.debtWeeks : 0;
  let rebuild = null;
  try { const r = debt.rebuildStatus(game); rebuild = { available: r.available, threshold: r.threshold, cooldown: r.cooldown, waitWeeks: r.waitWeeks }; } catch (_) { rebuild = null; }
  return { week: Number.isSafeInteger(game.week) ? game.week : 1, seasonNo: Number.isSafeInteger(game.seasonNo) ? game.seasonNo : 1,
    season: SEASON_WEEKS, debt: debtNow, debtWeeks: weeks, rebuild, serverNow: now };
}

module.exports = { dropLegacyTickets, runWeek, weekResult, closeDebtWeek, weekStatus, SEASON_WEEKS };
