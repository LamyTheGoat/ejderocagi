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

module.exports = { debtOf, assertNoDebt, receive, charge, MAX_DEBT };
