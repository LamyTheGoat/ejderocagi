'use strict';
// Hesap tezgâhı (2.0): sunucu pazar stoğunun yenilenmesi (tezgah.hafta) ve bağlı ocakta shop.dragon / shop.egg.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { reduceCommand, validateCommand } = require('../server/economy_commands');

const env = (seed = 'tezgah-seed') => ({ accountId: 'acct', seed, now: Date.UTC(2026, 10, 16, 12) });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}, e = env()) => reduceCommand(state, cmd(type, args), e);
const bagla = g => run(g, 'ocak.sync', { body: JSON.stringify({ ocak: 'ocak-0001-aaaa', ej: [], yu: [], ejIds: [], yuIds: [] }) }).game;
const zengin = (g, earned) => { g.funds.earned += earned; g.gold += earned; return g; };
const bosalt = g => { g.gold -= g.funds.bound; g.funds.bound = 0; return g; };

test('tezgah.hafta şema: hafta tam sayı olmalı; bağlı olmayan ocakta reddedilir', () => {
  assert.throws(() => cmd('tezgah.hafta', { week: '3' }), /invalid_arguments/);
  assert.throws(() => cmd('tezgah.hafta', { week: 0 }), /invalid_arguments/);
  assert.throws(() => cmd('tezgah.hafta', { week: 3, gold: 5 }), /invalid_arguments/);
  assert.throws(() => run(start(), 'tezgah.hafta', { week: 3 }), /ocak_not_bound/);
});

test('tezgah.hafta: hafta ilerleyince stok yenilenir, aynı ya da eski hafta yenilemez; sunucu haftası ve kesesi değişmez', () => {
  const g = bagla(start()), once = JSON.stringify(g.market);
  const a = run(g, 'tezgah.hafta', { week: 5 });
  assert.equal(a.result.tezgah.yenilendi, true);
  assert.notEqual(JSON.stringify(a.game.market), once);
  assert.equal(a.game.week, g.week); assert.equal(a.game.gold, g.gold); assert.deepEqual(a.game.funds, g.funds);
  assert.equal(a.game.ocak.hafta, 5);
  for (const tekrar of [5, 4, 1]) {
    const b = run(a.game, 'tezgah.hafta', { week: tekrar }, env('baska-zar'));
    assert.equal(b.result.tezgah.yenilendi, false);
    assert.deepEqual(b.game.market, a.game.market);
  }
  const c = run(a.game, 'tezgah.hafta', { week: 9 }, env('baska-zar'));
  assert.equal(c.result.tezgah.yenilendi, true); assert.equal(c.game.market.dragons.length, 3); // 8. haftadan sonra üçüncü ejderha (core.js)
});

test('bağlı ocakta shop.dragon: sunucu ızgarası dolu olsa da alınır; kazanılmış altınla alınan kazanılmış, bağlı altın karışırsa bağlı olur', () => {
  let g = bagla(start());
  g = run(g, 'tezgah.hafta', { week: 2 }).game;
  const mal = g.market.dragons[0], fiyat = mal.price;
  // bağlanmamış ocakta yer denetimi sürer
  const dolu = start(); dolu.grid.forEach(t => { if (t.b === 'in') t.b = null; });
  assert.throws(() => run(zengin(dolu, 5000), 'shop.dragon', { id: dolu.market.dragons[0].id }), /dragon_unavailable/);
  // bağlı ocak: in olmasa da alınır
  const b = bosalt(zengin(JSON.parse(JSON.stringify(g)), 5000)); b.grid.forEach(t => { if (t.b === 'in') t.b = null; });
  const r = run(b, 'shop.dragon', { id: mal.id });
  const alinan = r.game.dragons[r.game.dragons.length - 1];
  assert.equal(alinan.funding, 'earned'); assert.equal(alinan.name, mal.name); assert.ok(alinan.assetId);
  assert.equal(r.game.gold, b.gold - fiyat); assert.equal(r.game.funds.earned, 5000 - fiyat);
  assert.equal(r.game.market.dragons.some(d => d.name === mal.name && d.price === fiyat), false);
  // bağlı altın duruyorken: önce o harcanır, mal bağlı olur (kaynak politikası değişmedi)
  const k = run(zengin(JSON.parse(JSON.stringify(g)), 5000), 'shop.dragon', { id: mal.id });
  assert.equal(k.game.dragons[k.game.dragons.length - 1].funding, 'bound');
  // altın yetmezse reddedilir
  assert.throws(() => run(bosalt(JSON.parse(JSON.stringify(g))), 'shop.dragon', { id: mal.id }), /insufficient_gold/);
});

test('bağlı ocakta shop.egg: kazanılmış altınla alınan yumurta kazanılmıştır', () => {
  let g = bagla(start());
  g = bosalt(zengin(run(g, 'tezgah.hafta', { week: 3 }).game, 1000));
  const r = run(g, 'shop.egg', { id: g.market.egg.id });
  assert.equal(r.game.eggs[r.game.eggs.length - 1].funding, 'earned'); assert.equal(r.game.market.egg, null);
});
