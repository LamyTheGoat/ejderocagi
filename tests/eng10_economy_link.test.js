'use strict';
// ENG-10 · İstemci ↔ sunucu kesesi bağlantısı: hafta bileti kapısı, çevrimdışı geri düşüş, belirsiz yanıtta
// aynı gövdeyle yeniden deneme, borç/bilet metni, ödüllü düello sonucu metni. DOM'suz.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEconomyClient } = require('../js/economy_client');
const L = require('../js/economy_link');

const HOUR = 3600_000;
const T0 = 1_800_000_000_000;
const weekView = (count, extra = {}) => ({ week: 3, seasonNo: 1, season: 20, ticket: { count, cap: 8, nextAt: count >= 8 ? null : T0 + 2 * HOUR }, debt: 0, debtWeeks: 0, serverNow: T0, receivedAt: T0, ...extra });

// Sahte sunucu: GET /api/economy ve POST /api/economy/command; davranış senaryoya göre değiştirilir.
function fakeServer({ count = 2, started = true, ready = true } = {}) {
  const srv = { count, version: 5, posts: [], gets: 0, mode: 'ok', debt: 0 };
  srv.fetch = async (url, options = {}) => {
    if (!options.method || options.method === 'GET') {
      srv.gets++;
      if (srv.mode === 'down') throw new TypeError('network');
      return { ok: true, status: 200, json: async () => ({ ok: true, economyReady: ready, economy: { version: srv.version, gold: 10, game: started ? { star: 1 } : undefined, dragons: [] },
        week: started ? { week: 3, seasonNo: 1, season: 20, ticket: { count: srv.count, cap: 8, nextAt: Date.now() + HOUR }, debt: srv.debt, debtWeeks: 0, serverNow: Date.now() } : null }) };
    }
    const body = JSON.parse(options.body); srv.posts.push(body);
    if (srv.mode === 'lost') { srv.mode = 'ok'; srv.count--; srv.version++; srv.applied = body.requestId; throw new TypeError('response_lost'); }
    if (srv.mode === 'conflict') { srv.mode = 'ok'; return { ok: false, status: 409, json: async () => ({ error: 'version_conflict' }) }; }
    if (srv.applied === body.requestId) return { ok: true, status: 200, json: async () => ({ ok: true, replayed: true, result: { week: { from: 3, to: 4 } }, economy: { version: srv.version, gold: 10, game: { star: 1 }, dragons: [] } }) };
    if (body.expectedVersion !== srv.version) return { ok: false, status: 409, json: async () => ({ error: 'version_conflict' }) };
    if (srv.count < 1) return { ok: false, status: 409, json: async () => ({ error: 'week_ticket_unavailable' }) };
    srv.count--; srv.version++;
    return { ok: true, status: 200, json: async () => ({ ok: true, replayed: false, result: { week: { from: 3, to: 4 }, ticket: { count: srv.count, cap: 8, nextAt: Date.now() + HOUR }, upkeep: { charged: 10 }, debt: { after: 0 } },
      economy: { version: srv.version, gold: 0, game: { star: 1 }, dragons: [] } }) };
  };
  return srv;
}
function harness(srv, { online = true } = {}) {
  let n = 0;
  const client = createEconomyClient({ fetch: srv.fetch, uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` });
  const notes = [];
  const link = L.createEconomyLink({ getClient: () => client, isOnline: () => online, notify: (t, k) => notes.push([t, k]) });
  return { client, link, notes };
}

test('ENG-10 weekGate: bağlı değilken eski akış; bilet varsa sunucu; bilet kesin yoksa bekletir', () => {
  assert.deepEqual(L.weekGate({ linked: false, week: weekView(0) }, T0), { mode: 'local' });
  assert.deepEqual(L.weekGate({ linked: true, week: null }, T0), { mode: 'local' });
  assert.equal(L.weekGate({ linked: true, week: weekView(3) }, T0).mode, 'server');
  const wait = L.weekGate({ linked: true, week: weekView(0) }, T0 + 60_000);
  assert.equal(wait.mode, 'wait'); assert.equal(wait.waitMs, 2 * HOUR - 60_000);
  // Bilet bekleme sırasında doldu (sunucu saatiyle tahmin) → yeniden açılır, kısıt gereksiz uzamaz.
  assert.equal(L.weekGate({ linked: true, week: weekView(0) }, T0 + 2 * HOUR).mode, 'server');
  // Belirsiz kalan hafta isteği bir bilet sayılır (aynı istek yeniden gönderilecek).
  assert.equal(L.weekGate({ linked: true, week: weekView(1), pendingWeek: true }, T0).mode, 'wait');
  assert.equal(L.formatWait(2 * HOUR + 14 * 60_000), '2 sa 14 dk'); assert.equal(L.formatWait(30_000), '1 dk');
  assert.equal(L.badgeText({ linked: true, week: weekView(4, { debt: 120 }) }, T0), '🎟 4/8 · Borç 120');
  assert.match(L.badgeText({ linked: true, week: weekView(0) }, T0), /^🎟 0 · 2 sa/);
  assert.equal(L.badgeText({ linked: false, week: weekView(4) }, T0), '');
});

test('ENG-10 çevrimdışı / statik sunucu / sunucu hatası / ocak kurulmamış: yerel hafta eskisi gibi, sunucu çağrısı yok', async () => {
  for (const [label, srv, opts] of [
    ['çevrimdışı', fakeServer(), { online: false }],
    ['sunucu hatası', Object.assign(fakeServer(), { mode: 'down' }), {}],
    ['ocak kurulmamış', fakeServer({ started: false }), {}],
    ['economyReady false', fakeServer({ ready: false }), {}],
  ]) {
    const { link } = harness(srv, opts);
    await link.sync();
    let local = 0;
    assert.equal(link.endWeek(() => local++), 'local', label);
    await link.whenIdle();
    assert.equal(local, 1, label); assert.equal(srv.posts.length, 0, label); assert.equal(link.linked, false, label);
  }
});

test('ENG-10 bağlıyken yerel hafta HEMEN biter, week.end arka planda gider; bilet bitince yeni hafta bekletilir', async () => {
  const srv = fakeServer({ count: 1 });
  const { link, notes } = harness(srv);
  assert.equal(await link.sync(), 'ready'); assert.equal(link.linked, true);
  let local = 0;
  const mode = link.endWeek(() => local++);
  assert.equal(mode, 'server'); assert.equal(local, 1, 'yerel hafta sunucu yanıtını beklemeden bitti');
  await link.whenIdle();
  assert.equal(srv.posts.length, 1); assert.equal(srv.posts[0].type, 'week.end'); assert.deepEqual(srv.posts[0].args, {});
  assert.match(notes.at(-1)[0], /hafta 4 · 🎟 0\/8 · bakım −10/);
  // Bilet yok: yerel hafta bitmez, net mesaj, istek gönderilmez.
  assert.equal(link.endWeek(() => local++), 'wait');
  assert.equal(local, 1); assert.equal(srv.posts.length, 1);
  assert.match(notes.at(-1)[0], /Yeni hafta bekleniyor/);
});

test('ENG-10 belirsiz yanıt: aynı requestId ve gövde aynen yeniden gönderilir; ikinci bilet harcanmaz', async () => {
  const srv = fakeServer({ count: 3 });
  const { link, client, notes } = harness(srv);
  await link.sync();
  srv.mode = 'lost';
  link.endWeek(() => {});
  await link.whenIdle();
  assert.equal(client.pendingType, 'week.end'); assert.match(notes.at(-1)[0], /doğrulanamadı/);
  assert.equal(srv.count, 2, 'sunucu ilk isteği uyguladı');
  link.endWeek(() => {}); // sonraki hafta: önce bekleyen aynen, sonra yeni istek
  await link.whenIdle();
  assert.deepEqual(srv.posts[1], srv.posts[0], 'aynı gövde yeniden gönderildi');
  assert.notEqual(srv.posts[2].requestId, srv.posts[0].requestId);
  assert.equal(srv.count, 1, 'yalnız iki bilet harcandı');
  assert.equal(client.hasPending, false);
});

test('ENG-10 sürüm çakışması (başka sekme): durum yenilenir ve hafta bir kez yeniden istenir', async () => {
  const srv = fakeServer({ count: 2 });
  const { link } = harness(srv);
  await link.sync();
  srv.mode = 'conflict';
  link.endWeek(() => {});
  await link.whenIdle();
  assert.equal(srv.posts.length, 2); assert.equal(srv.count, 1);
});

test('ENG-10 ekonomi istemcisi: week görünümü ve economyReady saklanır; komut yanıtı onları silmez', async () => {
  const srv = fakeServer({ count: 2 });
  const { client } = harness(srv);
  await client.refresh();
  assert.equal(client.economyReady, true); assert.equal(client.week.ticket.count, 2); assert.ok(client.week.receivedAt);
  await client.command('week.end', {});
  assert.equal(client.week.ticket.count, 2, 'komut yanıtında week alanı yok; görünüm değişmez');
  await client.refresh(); assert.equal(client.week.ticket.count, 1);
});

test('ENG-10 ödüllü düello sonucu metinleri ve sunucu ejderhası seçimi', () => {
  assert.match(L.settlementText({ status: 'paid', outcome: 'win', amount: 85, paidDebt: 0 }), /^Zafer\. .*\+85 altın kazanılmış/);
  assert.match(L.settlementText({ status: 'paid', outcome: 'loss', amount: 20, paidDebt: 20 }), /20 altını borcuna gitti/);
  assert.match(L.settlementText({ status: 'no_reward', outcome: 'win', reason: 'daily_pair_limit' }), /Bu rakiple bugünkü ödüllü düello sınırına/);
  assert.match(L.settlementText({ status: 'no_reward', outcome: 'draw', reason: 'daily_account_limit' }), /Bugünkü ödüllü düello sınırın doldu/);
  assert.match(L.settlementText({ status: 'no_reward', outcome: 'forfeit', reason: 'forfeit_leaver' }), /çekildiğin/);
  assert.match(L.settlementText({ status: 'pending' }), /işleniyor/);
  const eco = { game: { star: 2 }, dragons: [
    { assetId: 'a:dragon:1', data: { id: 1, name: 'Kor' } },
    { assetId: 'a:dragon:2', data: { id: 2, name: 'Yıldız', task: { t: 'train' } } },
    { assetId: 'a:dragon:3', data: { id: 3, name: 'Ölü', dead: true } }] };
  assert.equal(L.pickDuelDragon(eco).assetId, 'a:dragon:1', 'görevdeki yıldız atlandı');
  eco.dragons[1].data.task = null;
  assert.equal(L.pickDuelDragon(eco).assetId, 'a:dragon:2', 'uygun yıldız önce');
  assert.equal(L.pickDuelDragon({ dragons: [] }), null);
});

test('ENG-10 sunucu weekStatus: salt okunur (kaydı değiştirmez), dolumu gösterir, bozuk bilette null; sezon js/week.js ile aynı', () => {
  const { weekStatus, SEASON_WEEKS } = require('../server/week_runtime');
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/week.js'), 'utf8');
  assert.equal(SEASON_WEEKS, Number(/const SEASON = (\d+);/.exec(src)[1]));
  const cfg = { refillMs: HOUR, cap: 8, initial: 6 };
  const game = { week: 4, weekTickets: { schema: 1, count: 0, at: T0 }, debt: 30, debtWeeks: 2, gold: 0 };
  const frozen = JSON.stringify(game);
  const view = weekStatus(game, T0 + 2.5 * HOUR, cfg);
  assert.deepEqual(view.ticket, { count: 2, cap: 8, nextAt: T0 + 3 * HOUR });
  assert.equal(view.debt, 30); assert.equal(view.debtWeeks, 2); assert.equal(view.week, 4); assert.equal(view.serverNow, T0 + 2.5 * HOUR);
  assert.equal(JSON.stringify(game), frozen, 'okuma kaydı değiştirmedi');
  assert.equal(weekStatus({ week: 1, weekTickets: { schema: 9 } }, T0, cfg).ticket, null);
  assert.equal(weekStatus({ week: 1 }, T0, cfg).ticket.count, 6, 'eski kayıt: başlangıç bileti');
  assert.equal(weekStatus(null, T0, cfg), null);
});

test('ENG-10 O-1: zaman aşımı belirsiz sayılır (askıdaki komut aynı requestId ile korunur), istek iptal edilir, bağlantı eski akışa düşer', async () => {
  let hang = true, aborted = 0; const sent = [];
  const fetch = (url, options = {}) => {
    if (options.signal) options.signal.addEventListener('abort', () => aborted++);
    if (options.method === 'POST') sent.push(options.body);
    if (hang) return new Promise(() => {});
    if (options.method === 'POST') return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, replayed: true, economy: { version: 2, game: {} } }) });
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ economyReady: true, economy: { version: 1, game: {} }, week: weekView(3) }) });
  };
  const client = createEconomyClient({ fetch, timeoutMs: 30, uuid: () => '00000000-0000-4000-8000-000000000009' });
  await assert.rejects(client.refresh(), /economy_timeout/);
  const link = L.createEconomyLink({ getClient: () => client });
  assert.equal(await link.sync(), 'error'); assert.equal(link.gate().mode, 'local', 'zaman aşımı oyunu kilitlemez');
  hang = false; await client.refresh(); hang = true;
  const t0 = Date.now();
  await assert.rejects(client.command('week.end', {}), err => err.message === 'economy_timeout' && err.status === undefined);
  assert.ok(Date.now() - t0 < 1000); assert.ok(aborted >= 2, 'istek AbortController ile iptal edildi');
  assert.equal(client.pendingType, 'week.end', 'belirsiz: askıda kaldı');
  hang = false;
  assert.equal((await client.retry()).replayed, true);
  assert.equal(sent[0], sent[1], 'aynı gövde (aynı requestId) yeniden gönderildi');
  // boot sınırı: söz süresi dolunca yedek değerle döner.
  const slow = new Promise(r => setTimeout(() => r('late'), 200));
  assert.equal(await L.bounded(slow, 20, () => 'fallback'), 'fallback');
  assert.equal(await L.bounded(Promise.resolve('fast'), 200, () => 'fallback'), 'fast');
});
