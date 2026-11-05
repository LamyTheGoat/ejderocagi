'use strict';

const assert = require('node:assert/strict');
const { applyTrade, normalizeOffer, TradeError } = require('../js/trade_engine');

function account(handle, extra = {}) {
  return {
    handle,
    gold: 500,
    inv: [{ uid: 1, id: 'zirh1' }, { uid: 2, id: 'kilic1' }],
    dragons: [{ id: 'd1', name: 'Kor', equip: {} }],
    eggs: [{ id: 'e1', inK: false, genes: { el: ['ates', 'ates'] } }],
    food: { balik: 5, mantar: 2 },
    ...extra,
  };
}

function expectTradeError(fn, code) {
  assert.throws(fn, err => err instanceof TradeError && err.code === code);
}

{
  const accounts = {
    '@a': account('@a'),
    '@b': account('@b', { gold: 100, inv: [], dragons: [], eggs: [], food: {} }),
  };
  const result = applyTrade(
    accounts, '@a', '@b',
    { gold: 120, items: [1], dragons: ['d1'], eggs: ['e1'], food: { balik: 2 } },
    { gold: 20, items: [], dragons: [], eggs: [], food: {} },
    { tradeId: 'trade_test_1', ts: 123 }
  );

  assert.equal(result.accounts['@a'].gold, 400);
  assert.equal(result.accounts['@b'].gold, 200);
  assert.equal(result.accounts['@a'].inv.some(x => x.uid === 1), false);
  assert.equal(result.accounts['@b'].inv.some(x => x.uid === 1), true);
  assert.equal(result.accounts['@b'].dragons[0].id, 'd1');
  assert.equal(result.accounts['@b'].eggs[0].id, 'e1');
  assert.equal(result.accounts['@a'].food.balik, 3);
  assert.equal(result.record.id, 'trade_test_1');

  // Pure/transactional behavior: original account map was not mutated.
  assert.equal(accounts['@a'].gold, 500);
  assert.equal(accounts['@a'].dragons.length, 1);
}

{
  const accounts = {
    '@a': account('@a'),
    '@b': account('@b', { gold: 0, inv: [], dragons: [], eggs: [], food: {} }),
  };
  expectTradeError(
    () => applyTrade(accounts, '@a', '@b', { gold: 999 }, {}, {}),
    'insufficient_gold'
  );
  assert.equal(accounts['@a'].gold, 500);
  assert.equal(accounts['@b'].gold, 0);
}

{
  const a = account('@a');
  a.dragons[0].equip = { head: 1 };
  const accounts = { '@a': a, '@b': account('@b', { inv: [], dragons: [], eggs: [], food: {} }) };
  expectTradeError(
    () => applyTrade(accounts, '@a', '@b', { items: [1] }, {}, {}),
    'item_equipped'
  );
}

{
  const a = account('@a');
  a.eggs[0].inK = true;
  const accounts = { '@a': a, '@b': account('@b', { inv: [], dragons: [], eggs: [], food: {} }) };
  expectTradeError(
    () => applyTrade(accounts, '@a', '@b', { eggs: ['e1'] }, {}, {}),
    'egg_unavailable'
  );
}

{
  const a = account('@a');
  a.dragons[0].equip = { head: 88 };
  const accounts = { '@a': a, '@b': account('@b', { inv: [], dragons: [], eggs: [], food: {} }) };
  expectTradeError(
    () => applyTrade(accounts, '@a', '@b', { dragons: ['d1'] }, {}, {}),
    'dragon_has_equipment'
  );
}

{
  const offer = normalizeOffer({ gold: '12', items: [1], food: { balik: 2 } });
  assert.equal(offer.gold, 12);
  assert.equal(offer.food.balik, 2);
  expectTradeError(() => normalizeOffer({ gold: -1 }), 'invalid_gold');
  expectTradeError(() => normalizeOffer({ items: [1, 1] }), 'duplicate_or_invalid_items');
  expectTradeError(() => normalizeOffer({ gold: 1, admin: true }), 'unknown_offer_field');
}


{
  // Incoming assets/gold cannot be re-offered within the same transaction.
  const a = account('@a');
  const b = account('@b', { gold: 0, inv: [], dragons: [], eggs: [], food: {} });
  const accounts = { '@a': a, '@b': b };
  expectTradeError(
    () => applyTrade(accounts, '@a', '@b', { gold: 100, items: [1] }, { gold: 100, items: [1] }, {}),
    'insufficient_gold'
  );
  assert.equal(accounts['@a'].gold, 500);
  assert.equal(accounts['@b'].gold, 0);
}

console.log('PASS: atomic two-sided transfer, gold, items, dragons, eggs, food, ownership, equipment and incubation guards.');
