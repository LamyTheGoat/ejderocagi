'use strict';
// ENG06 P-C · Borç modeli (D4, onaylı).
// - Bakiye 0'da durur; ENG-05 kovaları negatif olmaz. Ödenemeyen zorunlu gider `game.debt`te birikir.
// - `debt`, `funds`un parçası değildir: funds.bound + funds.unknown + funds.earned === gold korunur.
// - Değişmez: debt > 0 ise gold === 0 (her giriş önce borcu öder).
// - Mahsup: borç varken gelen HER kazanç, kaynak sınıfı ne olursa olsun önce borçtan düşer. Mahsup edilen
//   kısım hiçbir kovaya girmez (yok olur); kalan kısım kendi sınıfıyla `sources.credit` üzerinden girer.
//   Böylece mahsup hiçbir tutarı daha serbest bir sınıfa taşıyamaz (fail-closed).
// - İflas (D1a) ONAYLI DEĞİL: bu modül hesabı silmez, oyunu bitirmez. Yalnız `debtWeeks` sayılır (week_runtime).
const sources = require('./economy_sources');
const MAX_DEBT = 2_000_000_000;
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const count = n => Number.isSafeInteger(n) && n >= 0;

function debtOf(game) {
  const debt = game.debt === undefined ? 0 : game.debt; // Eski kayıt: alan yoksa borç yok.
  if (!count(debt) || debt > MAX_DEBT) fail('debt_state_invalid');
  if (debt > 0 && game.gold !== 0) fail('debt_state_invalid');
  return debt;
}
// Tek korumalı kapı: borç varken hiçbir harcama/takas ilerlemez.
function assertNoDebt(game) { if (debtOf(game) > 0) fail('debt_outstanding'); }

// Her sunucu kazancı buradan girer: önce borç, sonra kova.
function receive(game, amount, source) {
  if (!count(amount)) fail('invalid_credit_source');
  const debt = debtOf(game), paid = Math.min(debt, amount);
  if (paid) game.debt = debt - paid;
  sources.credit(game, amount - paid, source);
  return { paidDebt: paid, credited: amount - paid };
}

// Zorunlu gider (haftalık bakım): ödenebilen kısım normal harcama sırasıyla düşer, kalanı borç olur.
function charge(game, amount) {
  if (!count(amount)) fail('invalid_server_price');
  const debt = debtOf(game), paid = Math.min(game.gold, amount), unpaid = amount - paid;
  const debit = sources.spend(game, paid);
  if (debt + unpaid > MAX_DEBT) fail('debt_limit');
  if (unpaid) game.debt = debt + unpaid;
  return { paid, unpaid, debit };
}

// ENG-10 · K5 iflas: hesap SİLİNMEZ, oyun BİTMEZ. Borç art arda REBUILD_DEBT_WEEKS hafta sürerse (istemcideki
// "3 hafta eksi" eşiğiyle aynı sayı; yeni eşik icat edilmedi) oyuncu "ocağı yeniden kur" der: borç silinir,
// borçlu hafta sayacı sıfırlanır. Varlık kaybı YOK: ejderha, yumurta, eşya, yem, kaynak kovaları ve bina olduğu
// gibi kalır (takas edilebilir varlıklar dahil). Yeni altın üretmez (bakiye 0 kalır). Yukarıdaki D4 kuralları
// (bakiye 0'da durur, kalan borç, mahsup, harcama/takas kapısı) değişmedi; bu yalnız eşik sonrası çıkış yoludur.
const REBUILD_DEBT_WEEKS = 3;
// ENG-10 Y-2 · Sıklık sınırı: bir yeniden kurmadan sonra en az REBUILD_COOLDOWN_WEEKS sunucu haftası geçmeli.
// Varsayılan 8; sunucu yapılandırmasıyla (EO_REBUILD_COOLDOWN_WEEKS, 0..1000 tamsayı) ayarlanır, geçersiz değer
// açılışta hata verir (fail-closed). İstemci etkileyemez. Varlık bedeli YOK.
function readRebuildCooldown(env = process.env) {
  const raw = env.EO_REBUILD_COOLDOWN_WEEKS;
  if (raw === undefined || raw === '') return 8;
  if (!/^\d+$/.test(String(raw)) || Number(raw) > 1000) throw new Error('invalid_EO_REBUILD_COOLDOWN_WEEKS');
  return Number(raw);
}
const REBUILD_COOLDOWN_WEEKS = readRebuildCooldown();
// Sezonlar arası tekdüze hafta sayısı (sezon başına 20 hafta; js/week.js SEASON): sezon devrinde sayaç sıfırlanmaz.
const absWeek = game => ((Number.isSafeInteger(game.seasonNo) && game.seasonNo > 0 ? game.seasonNo : 1) - 1) * 20 + (Number.isSafeInteger(game.week) ? game.week : 1);
function rebuildStatus(game, cooldown = REBUILD_COOLDOWN_WEEKS) {
  const owed = debtOf(game), weeks = count(game.debtWeeks) ? game.debtWeeks : 0;
  const last = count(game.lastRebuildWeek) ? game.lastRebuildWeek : null;
  const waitWeeks = last == null ? 0 : Math.max(0, last + cooldown - absWeek(game));
  return { available: owed > 0 && weeks >= REBUILD_DEBT_WEEKS && waitWeeks === 0, threshold: REBUILD_DEBT_WEEKS, cooldown, waitWeeks, debt: owed, debtWeeks: weeks };
}
function rebuild(game, cooldown = REBUILD_COOLDOWN_WEEKS) {
  const st = rebuildStatus(game, cooldown);
  if (st.debt > 0 && st.debtWeeks >= REBUILD_DEBT_WEEKS && st.waitWeeks > 0) fail('rebuild_cooldown');
  if (!st.available) fail('rebuild_unavailable');
  game.debt = 0; game.debtWeeks = 0;
  game.rebuilds = (count(game.rebuilds) ? game.rebuilds : 0) + 1;
  game.lastRebuildWeek = absWeek(game);
  return { rebuilt: true, writtenOff: st.debt, debtWeeks: st.debtWeeks, rebuilds: game.rebuilds, nextAfterWeeks: cooldown };
}

module.exports = { debtOf, assertNoDebt, receive, charge, MAX_DEBT, REBUILD_DEBT_WEEKS, REBUILD_COOLDOWN_WEEKS, readRebuildCooldown, rebuildStatus, rebuild };
