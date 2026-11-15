'use strict';
// Er Meydanı lobisi (js/duel_server.js `duel_lobby`): savaşçı lobiye girişle gelir (ayrı /api/sync beklenmez),
// kuyruk eşleşmesi, açık oda (sancak), meydan okuma; lobi maçları dostça odadır: kayıt ve ödül yoktur.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createDragonDuelServer } = require('../js/duel_server.js');

const star = (name, el) => ({ id: name, name, el, stage: 'yetiskin', bond: 70, st: { gu: 60, ce: 55, da: 50, ze: 55 }, traits: [], cards: [] });
const fighter = (name, el) => ({ name, el, gu: 60, ce: 55, da: 50, ze: 55, atk: 4, def: 3, maxHp: 150, mood: 3, bond: 70, seasonMult: 1, cards: ['celik_pence'] });
function kur() {
  const clients = new Set(), world = { players: {} }, settled = [];
  // Depo verilse bile lobi maçı ona hiç dokunmamalı: her çağrı kayda geçer.
  const store = new Proxy({}, { get: (_, k) => (...a) => { settled.push([k, a]); throw Object.assign(new Error('store_should_not_be_used'), { code: 'store_should_not_be_used' }); } });
  const server = createDragonDuelServer({ crypto, WS_CLIENTS: clients, WORLD: world, encodeWsFrame: JSON.stringify, store });
  const soket = (handle, authenticated = true) => { const s = { playerInfo: { handle, authenticated, accountId: 'acc' + handle }, destroyed: false, messages: [], write(f) { this.messages.push(JSON.parse(f)); },
    last(type) { return this.messages.filter(m => m.type === type).at(-1); }, all(type) { return this.messages.filter(m => m.type === type); } }; clients.add(s); return s; };
  const gir = (s, name = 'Kor', el = 'ates') => server.onMessage(s, { type: 'duel_lobby', action: 'enter', star: star(name, el), duelFighter: fighter(name, el) });
  return { server, soket, gir, settled, clients };
}
const durum = (s, h) => s.last('duel_lobby_state').players.find(p => p.handle === h).status;

test('lobi: giriş savaşçıyı taşır; yeni giren oyuncuya İLK davet düşmez (/api/sync gerekmez)', () => {
  const { server, soket, gir } = kur(), a = soket('@alpha'), b = soket('@beta');
  gir(a, 'Kor'); gir(b, 'Ayaz', 'buz');                 // WORLD.players boş: hiçbir /api/sync yapılmadı
  assert.deepEqual(a.last('duel_lobby_state').players.map(p => p.handle).sort(), ['@alpha', '@beta']);
  assert.equal(a.last('duel_lobby_state').rewards, false);
  server.onMessage(a, { type: 'duel_invite', to: '@beta' });
  const inv = b.last('duel_invite'); assert.ok(inv && inv.id); assert.equal(inv.ranked, false); assert.equal(inv.dragon.name, 'Kor');
  server.onMessage(b, { type: 'duel_invite_reply', inviteId: inv.id, accept: true });
  const ra = a.last('duel_room_start'), rb = b.last('duel_room_start');
  assert.equal(ra.roomId, rb.roomId); assert.equal(ra.ranked, false); assert.equal(ra.via, 'invite'); assert.equal(ra.matchId, undefined);
  assert.equal(durum(a, '@alpha'), 'fight'); assert.equal(durum(a, '@beta'), 'fight');
});

test('lobi: lobide olmayan ya da savaşçısız oyuncu kuyruk/oda isteyemez; bozuk giriş reddedilir', () => {
  const { server, soket } = kur(), a = soket('@alpha'), g = soket('@guest', false);
  server.onMessage(a, { type: 'duel_lobby', action: 'queue' });
  assert.equal(a.last('duel_error').code, 'lobby_required');
  server.onMessage(a, { type: 'duel_lobby', action: 'enter', star: null, duelFighter: fighter('Kor', 'ates') });
  assert.equal(a.last('duel_error').code, 'sync_required');
  server.onMessage(a, { type: 'duel_lobby', action: 'enter', star: { name: 'x'.repeat(13000) }, duelFighter: fighter('Kor', 'ates') });
  assert.equal(a.last('duel_error').code, 'sync_required');
  server.onMessage(g, { type: 'duel_lobby', action: 'enter', star: star('Kor', 'ates'), duelFighter: fighter('Kor', 'ates') });
  assert.match(g.last('duel_error').message, /oturumu/);
  assert.equal(a.last('duel_lobby_state'), undefined);
});

test('lobi: kuyruk iki oyuncuyu eşleştirir; dövüş baştan sona oynanır, sonuç iki tarafta aynı, depo hiç kullanılmaz (ödül yok)', async () => {
  const { server, soket, gir, settled } = kur(), a = soket('@alpha'), b = soket('@beta'), c = soket('@gamma');
  gir(a); gir(b, 'Ayaz', 'buz'); gir(c, 'Sis', 'golge');
  server.onMessage(a, { type: 'duel_lobby', action: 'queue' });
  assert.equal(durum(c, '@alpha'), 'queue'); assert.equal(a.last('duel_room_start'), undefined);
  server.onMessage(b, { type: 'duel_lobby', action: 'queue' });
  const ra = a.last('duel_room_start'), rb = b.last('duel_room_start');
  assert.ok(ra && rb && ra.roomId === rb.roomId); assert.equal(ra.via, 'queue'); assert.equal(c.last('duel_room_start'), undefined);
  assert.equal(durum(c, '@alpha'), 'fight'); assert.equal(durum(c, '@gamma'), 'idle');
  // dövüşteyken kuyruk/oda istenemez
  server.onMessage(a, { type: 'duel_lobby', action: 'room_open' }); assert.equal(a.last('duel_error').code, 'duel_busy');
  for (let round = 1; round <= 30 && !a.last('duel_room_state')?.fight.over; round++) for (const s of [a, b]) server.onMessage(s, { type: 'duel_action', roomId: ra.roomId, round, action: 'pence' });
  const fa = a.last('duel_room_state').fight, fb = b.last('duel_room_state').fight;
  assert.equal(fa.over, true); assert.deepEqual(fa, fb);                 // tek kanonik durum
  assert.equal(a.last('duel_room_state').ranked, false);
  await server.idle();
  assert.equal(a.all('duel_settlement').length + b.all('duel_settlement').length, 0);
  assert.deepEqual(settled, []);                                         // maç kaydı, kilit, settlement yok
  assert.equal(durum(c, '@alpha'), 'idle');                              // dövüş bitince meydana dönülür
});

test('lobi: sancak (açık oda) ilk katılanla başlar; kapalı ya da kendi odasına katılım reddedilir; kopan oyuncu lobiden düşer', () => {
  const { server, soket, gir, clients } = kur(), a = soket('@alpha'), b = soket('@beta'), c = soket('@gamma');
  gir(a); gir(b, 'Ayaz', 'buz'); gir(c, 'Sis', 'golge');
  server.onMessage(b, { type: 'duel_lobby', action: 'room_join', host: '@alpha' }); assert.equal(b.last('duel_error').code, 'room_closed');
  server.onMessage(a, { type: 'duel_lobby', action: 'room_open' }); assert.equal(durum(b, '@alpha'), 'room');
  server.onMessage(a, { type: 'duel_lobby', action: 'room_join', host: '@alpha' }); assert.equal(a.last('duel_error').code, 'room_closed');
  server.onMessage(b, { type: 'duel_lobby', action: 'room_join', host: '@alpha' });
  const ra = a.last('duel_room_start'); assert.equal(ra.via, 'room'); assert.equal(ra.players[0].handle, '@alpha'); assert.equal(ra.players[1].handle, '@beta');
  server.onMessage(c, { type: 'duel_lobby', action: 'room_join', host: '@alpha' }); assert.equal(c.last('duel_error').code, 'room_closed');
  // teslim: oda biter, ödül mesajı yok
  server.onMessage(b, { type: 'duel_action', roomId: ra.roomId, round: 1, action: 'teslim' }); server.onMessage(a, { type: 'duel_action', roomId: ra.roomId, round: 1, action: 'pence' });
  assert.equal(a.last('duel_room_state').fight.winner, 'p'); assert.equal(a.all('duel_settlement').length, 0);
  c.destroyed = true; clients.delete(c); server.onDisconnect(c);
  assert.deepEqual(a.last('duel_lobby_state').players.map(p => p.handle).sort(), ['@alpha', '@beta']);
});
