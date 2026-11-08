'use strict';
// ENG-08 · Ocak Sandığı saf mantığı (DOM'suz): giriş listesi, kaynak rozeti, rezerve, filtre/arama/sıralama, Bedesten ön seçimi.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/ocak_sandigi.js');

const catalog = { itemName: id => ({ til1: 'Bakır Tılsım', pen1: 'Demir Pençe' }[id] || id), itemSlot: () => 'Tılsım', foodName: k => ({ balik: 'Balık', biber: 'Biber' }[k] || k), elName: el => ({ ates: 'Ateş', buz: 'Buz' }[el] || ''), stageName: s => ({ genc: 'Genç' }[s] || '') };
function economy() {
  return {
    accountId: 'acc-a', version: 3, gold: 420,
    dragons: [
      { assetId: 'acc-a:dragon:1', data: { id: 1, name: 'Kor', el: 'ates', stage: 'genc', funding: 'bound', equip: {} } },
      { assetId: 'acc-a:dragon:2', data: { id: 2, name: 'Ayaz', el: 'buz', stage: 'genc', funding: 'earned', equip: {} } },
      { assetId: 'acc-a:dragon:3', data: { id: 3, name: 'Çığ', el: 'buz', stage: 'genc', funding: 'earned', equip: { tilsim: 99 } } },
    ],
    eggs: [{ assetId: 'acc-a:egg:5', data: { id: 5, genes: { el: ['ates', 'buz'] }, inK: false, funding: 'earned' } }],
    items: [
      { assetId: 'acc-a:item:7', data: { uid: 7, id: 'til1', funding: 'earned' } },
      { assetId: 'acc-a:item:8', data: { uid: 8, id: 'pen1', funding: 'unknown' } },
    ],
    game: { food: { balik: 5, biber: 2, kar: 0 }, foodSources: { balik: { bound: 2, unknown: 0, earned: 3 }, biber: { bound: 2, unknown: 0, earned: 0 }, kar: { bound: 0, unknown: 0, earned: 0 } } },
  };
}
const byKey = (list, key) => list.find(e => e.key === key);

test('sunucu ekonomisi yoksa hiçbir kalem üretilmez (yerel veri karıştırılmaz)', () => {
  assert.deepEqual(S.buildEntries({ economy: null }), []);
  assert.deepEqual(S.buildEntries({ economy: { accountId: 'x', dragons: [{ assetId: 'a', data: {} }] } }), []);
});

test('kalemler sunucu envanterinden kurulur; sıfır yem atlanır; adlar katalogdan', () => {
  const list = S.buildEntries({ economy: economy() }, catalog);
  assert.equal(list.length, 3 + 1 + 2 + 2);
  assert.equal(byKey(list, 'egg:acc-a:egg:5').name, 'Ateş Yumurtası');
  assert.equal(byKey(list, 'item:acc-a:item:7').name, 'Bakır Tılsım');
  assert.equal(byKey(list, 'food:balik').count, 5);
  assert.equal(byKey(list, 'food:kar'), undefined);
});

test('kaynak rozeti oyuncu dilinde ve yalnız earned/mixed takas edilebilir', () => {
  assert.match(S.sourceBadge('earned').label, /Kazanılmış · takas edilebilir/);
  assert.match(S.sourceBadge('bound').label, /takas edilemez/);
  assert.match(S.sourceBadge('unknown').label, /doğrulanmadı/);
  assert.equal(S.sourceBadge('weird'), S.sourceBadge('unknown'));
  assert.equal(S.sourceBadge('bound').tradable, false);
  for (const k of Object.keys(S.SOURCE_BADGE)) assert.ok(S.SOURCE_BADGE[k].icon, 'rozet yalnız renge dayanmaz');
  const list = S.buildEntries({ economy: economy() }, catalog);
  assert.equal(byKey(list, 'food:balik').source, 'mixed');
  assert.equal(byKey(list, 'food:biber').source, 'bound');
  assert.equal(byKey(list, 'item:acc-a:item:8').source, 'unknown');
});

test('Bedestende Sat yalnız earned, rezerve olmayan, aktarılabilir kalemde', () => {
  const e = economy();
  const mine = [
    { status: 'open', kind: 'dragon', assetId: 'acc-a:dragon:2', remaining: 1 },
    { status: 'sold', kind: 'egg', assetId: 'acc-a:egg:5', remaining: 0 },
    { status: 'open', kind: 'food', foodKey: 'balik', remaining: 1 },
  ];
  const trade = { status: 'active', offers: { 'acc-a': { gold: 0, items: ['acc-a:item:7'], dragons: [], eggs: [], food: { balik: 1 } } } };
  const list = S.buildEntries({ economy: e, mine, trade, accountId: 'acc-a' }, catalog);
  const st = k => S.entryStatus(byKey(list, k));
  assert.equal(st('dragon:acc-a:dragon:1').sell, false, 'bound ejderha');
  assert.match(st('dragon:acc-a:dragon:1').text, /Hesaba bağlı/);
  assert.equal(st('dragon:acc-a:dragon:2').sell, false, 'ilanda');
  assert.match(st('dragon:acc-a:dragon:2').text, /ilanda/);
  assert.equal(st('dragon:acc-a:dragon:3').sell, false, 'ekipmanlı');
  assert.match(st('dragon:acc-a:dragon:3').text, /ekipman/);
  assert.equal(st('egg:acc-a:egg:5').sell, true, 'satılmış ilan rezervasyon değildir');
  assert.equal(st('item:acc-a:item:7').sell, false, 'takasta');
  assert.match(st('item:acc-a:item:7').text, /takas/);
  assert.equal(st('item:acc-a:item:8').sell, false, 'unknown');
  const balik = byKey(list, 'food:balik');
  assert.equal(balik.sellQty, 1, '3 earned − 1 ilanda − 1 takasta');
  assert.equal(S.entryStatus(balik).sell, true);
  assert.equal(S.entryStatus(byKey(list, 'food:biber')).sell, false);
  assert.equal(S.bedestenTarget(byKey(list, 'dragon:acc-a:dragon:1')), null);
  assert.deepEqual(S.bedestenTarget(byKey(list, 'egg:acc-a:egg:5')), { sellCat: 'egg', kind: 'egg', id: 'acc-a:egg:5' });
  assert.deepEqual(S.bedestenTarget(balik), { sellCat: 'food', kind: 'food', id: 'balik' });
});

test('kapanmış veya başkasının takası rezervasyon sayılmaz', () => {
  const trade = { status: 'completed', offers: { 'acc-a': { items: ['acc-a:item:7'], dragons: [], eggs: [], food: {} } } };
  const list = S.buildEntries({ economy: economy(), trade, accountId: 'acc-a' }, catalog);
  assert.equal(S.entryStatus(byKey(list, 'item:acc-a:item:7')).sell, true);
  const other = { status: 'active', offers: { 'acc-b': { items: ['acc-a:item:7'], dragons: [], eggs: [], food: {} } } };
  assert.equal(S.entryStatus(byKey(S.buildEntries({ economy: economy(), trade: other, accountId: 'acc-a' }, catalog), 'item:acc-a:item:7')).sell, true);
});

test('kuşanılmış eşya ve görevdeki/kuluçkadaki varlık engellenir', () => {
  const e = economy();
  e.dragons[2].data.equip = { tilsim: 7 }; // Çığ, uid 7 tılsımı kuşanıyor
  e.dragons[1].data.task = { t: 'train' };
  e.eggs[0].data.inK = true;
  const list = S.buildEntries({ economy: e }, catalog);
  assert.match(byKey(list, 'item:acc-a:item:7').blocked, /kuşanmış/);
  assert.match(byKey(list, 'dragon:acc-a:dragon:2').blocked, /görevde/);
  assert.match(byKey(list, 'egg:acc-a:egg:5').blocked, /Kuluçkada/);
});

test('kategoriler yalnız sunucuda olan türleri ve sayıları gösterir', () => {
  const e = economy(); e.eggs = [];
  const cats = S.categories(S.buildEntries({ economy: e }, catalog));
  assert.deepEqual(cats.map(c => [c.k, c.n]), [['tumu', 7], ['dragon', 3], ['item', 2], ['food', 2]]);
});

test('filtre ve Türkçe büyük/küçük harf duyarsız arama', () => {
  const list = S.buildEntries({ economy: economy() }, catalog);
  assert.equal(S.filterEntries(list, { cat: 'dragon' }).length, 3);
  assert.deepEqual(S.filterEntries(list, { q: 'ÇIĞ' }).map(e => e.name), ['Çığ']);
  assert.deepEqual(S.filterEntries(list, { q: 'ateş' }).map(e => e.key).sort(), ['dragon:acc-a:dragon:1', 'egg:acc-a:egg:5']);
  assert.deepEqual(S.filterEntries(list, { cat: 'food', q: 'yumurta' }), []);
  assert.equal(S.filterEntries(list, { q: 'yem' }).length, 2, 'tür adıyla arama');
});

test('sıralama: ada göre (tr) ve yeni (sunucu sırasının tersi)', () => {
  const list = S.buildEntries({ economy: economy() }, catalog);
  const dragons = S.filterEntries(list, { cat: 'dragon' });
  assert.deepEqual(S.sortEntries(dragons, 'ad').map(e => e.name), ['Ayaz', 'Çığ', 'Kor']);
  assert.deepEqual(S.sortEntries(dragons, 'yeni').map(e => e.name), ['Çığ', 'Ayaz', 'Kor']);
  assert.notEqual(S.sortEntries(list, 'ad'), list, 'girdi dizisi değiştirilmez');
});

test('modül fiyat ya da değer alanı üretmez', () => {
  for (const e of S.buildEntries({ economy: economy() }, catalog)) for (const k of Object.keys(e)) assert.ok(!/price|value|fiyat|deger/i.test(k), k);
});
