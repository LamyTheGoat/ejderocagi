'use strict';
// ENG-14 · Topçu PvP oda kaydı: yaşam döngüsü, yalnız-oda yönlendirmesi, kopma/hükmen, hızlı savaş eşleşmesi.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createPvpRooms } = require('../server/pvp_rooms.js');

const wait = ms => new Promise(r => setTimeout(r, ms));
function setup(config = {}) {
  const WS_CLIENTS = new Set();
  const rooms = createPvpRooms({ crypto, WS_CLIENTS, encodeWsFrame: o => o, config: { disconnectGraceMs: 80, readyCardMs: 60, queueSlowMs: 50, ...config } });
  let n = 0;
  const connect = (handle, accountId) => {
    const s = { playerInfo: { accountId: accountId || 'acc_' + (++n), handle }, destroyed: false, inbox: [], write(o) { this.inbox.push(o); } };
    WS_CLIENTS.add(s); rooms.onConnect(s); return s;
  };
  const drop = s => { s.destroyed = true; WS_CLIENTS.delete(s); rooms.onDisconnect(s); };
  const sendMsg = (s, msg) => rooms.onMessage(s, msg);
  const last = (s, type) => [...s.inbox].reverse().find(m => m.type === type);
  const all = (s, type) => s.inbox.filter(m => m.type === type);
  return { rooms, WS_CLIENTS, connect, drop, sendMsg, last, all };
}
// A oda kurar, B kodla katılır, hazır, başlat.
function startedMatch(t) {
  const A = t.connect('@ayse'), B = t.connect('@bora'), C = t.connect('@cem');
  t.sendMsg(A, { type: 'pvp_room_create', mode: '1v1', mapId: 'glacier' });
  const room = t.last(A, 'pvp_room').room;
  t.sendMsg(B, { type: 'pvp_room_join', code: room.code.toLowerCase().replace('ejd-', '') });
  t.sendMsg(B, { type: 'pvp_room_ready', ready: true });
  t.sendMsg(A, { type: 'pvp_room_start' });
  return { A, B, C, room };
}

test('oda yaşam döngüsü: kur, listede gör, kodla katıl, hazır, başlat → iki tarafa tek ve aynı başlangıç', () => {
  const t = setup();
  const A = t.connect('@ayse'), B = t.connect('@bora'), C = t.connect('@cem');
  t.sendMsg(C, { type: 'pvp_lobby_sub', friends: ['@ayse', '@yok'] });
  assert.deepEqual(t.last(C, 'pvp_lobby').rooms, []);
  assert.deepEqual(t.last(C, 'pvp_lobby').online, ['@ayse']);
  t.sendMsg(A, { type: 'pvp_room_create', mode: '1v1', mapId: 'glacier' });
  const room = t.last(A, 'pvp_room').room;
  assert.match(room.code, /^EJD-[A-Z2-9]{3}$/);
  assert.equal(room.mapId, 'glacier'); assert.equal(room.players, 1); assert.equal(room.host, '@ayse');
  assert.equal(t.last(C, 'pvp_lobby').rooms.length, 1, 'lobi izleyicisi yeni odayı görür');
  t.sendMsg(B, { type: 'pvp_room_join', roomId: room.id });
  const rb = t.last(B, 'pvp_room').room;
  assert.equal(rb.players, 2); assert.equal(rb.slots[1].handle, '@bora'); assert.equal(rb.slots[1].ready, false);
  t.sendMsg(A, { type: 'pvp_room_start' });
  assert.equal(t.last(A, 'pvp_error').code, 'not_ready');
  t.sendMsg(B, { type: 'pvp_room_start' });
  assert.equal(t.last(B, 'pvp_error').code, 'host_only');
  t.sendMsg(A, { type: 'pvp_room_map', mapId: 'sandstorm' });
  assert.equal(t.last(B, 'pvp_room').room.mapId, 'sandstorm', 'kurucunun harita değişikliği misafire gider');
  t.sendMsg(B, { type: 'pvp_room_ready', ready: true });
  t.sendMsg(A, { type: 'pvp_room_start' });
  const sa = t.all(A, 'pvp_match_start'), sb = t.all(B, 'pvp_match_start');
  assert.equal(sa.length, 1); assert.equal(sb.length, 1);
  for (const k of ['matchId', 'mapId', 'seed', 'firstTurn', 'mode']) assert.equal(sa[0][k], sb[0][k], k);
  assert.equal(sa[0].mapId, 'sandstorm');
  assert.ok(['@ayse', '@bora'].includes(sa[0].firstTurn));
  assert.equal(sa[0].rival, '@bora'); assert.equal(sb[0].rival, '@ayse');
  assert.equal(t.all(C, 'pvp_match_start').length, 0);
  assert.equal(t.last(C, 'pvp_lobby').rooms[0].state, 'playing');
  t.rooms.stop();
});

test('kodla katılma hataları, dolu oda, 2v2 yakında, ayrılma ve kurucu devri', () => {
  const t = setup();
  const A = t.connect('@ayse'), B = t.connect('@bora'), C = t.connect('@cem');
  t.sendMsg(A, { type: 'pvp_room_create', mode: '2v2' });
  assert.equal(t.last(A, 'pvp_error').code, 'mode_soon');
  t.sendMsg(A, { type: 'pvp_room_create', mode: '1v1', mapId: 'yok_boyle_harita' });
  const room = t.last(A, 'pvp_room').room;
  assert.equal(room.mapId, 'steppe_canyon');
  t.sendMsg(B, { type: 'pvp_room_join', code: 'EJD-000' });
  assert.equal(t.last(B, 'pvp_error').code, 'room_not_found');
  t.sendMsg(B, { type: 'pvp_room_join', code: room.code });
  t.sendMsg(C, { type: 'pvp_room_join', code: room.code });
  assert.equal(t.last(C, 'pvp_error').code, 'room_full');
  t.sendMsg(A, { type: 'pvp_room_leave' });
  const after = t.last(B, 'pvp_room').room;
  assert.equal(after.host, '@bora'); assert.equal(after.slots[0].handle, '@bora'); assert.equal(after.slots[1].kind, 'empty');
  t.sendMsg(B, { type: 'pvp_room_leave' });
  assert.ok(t.last(B, 'pvp_room_left'));
  assert.equal(t.rooms._debug.rooms.size, 0, 'boş oda silinir');
  t.rooms.stop();
});

test('yönlendirme: pvp_sync yalnız odadaki rakibe gider; üçüncü bağlam ve oda dışı hiçbir şey almaz', () => {
  const t = setup();
  const { A, B, C } = startedMatch(t);
  const cBefore = C.inbox.length;
  t.sendMsg(A, { type: 'pvp_sync', action: 'fire', angle: 40, power: 70, dmg: 260, turnNo: 0 });
  t.sendMsg(A, { type: 'pvp_sync', action: 'hit', dmg: 200, turnNo: 0 });
  t.sendMsg(B, { type: 'pvp_sync', action: 'hp_sync', hp: 1450, maxHp: 1650 });
  assert.equal(t.all(B, 'pvp_sync').length, 2);
  assert.equal(t.all(A, 'pvp_sync').length, 1);
  assert.equal(t.all(A, 'pvp_sync')[0].hp, 1450);
  assert.equal(t.all(B, 'pvp_sync')[0].from, '@ayse');
  assert.equal(t.all(A, 'pvp_sync').filter(m => m.from === '@ayse').length, 0, 'gönderen kendi mesajını almaz');
  // Oda dışındaki C pvp_sync gönderse bile kimse almaz.
  t.sendMsg(C, { type: 'pvp_sync', action: 'fire', dmg: 999 });
  assert.equal(t.all(A, 'pvp_sync').length, 1); assert.equal(t.all(B, 'pvp_sync').length, 2);
  // Davet yalnız hedefe gider.
  const D = t.connect('@dila');
  t.sendMsg(D, { type: 'pvp_room_create' });
  t.sendMsg(D, { type: 'pvp_room_invite', to: '@ayse' });
  assert.equal(t.all(A, 'pvp_invite').length, 1);
  assert.equal(t.all(B, 'pvp_invite').length, 0);
  assert.equal(C.inbox.slice(cBefore).filter(m => m.type !== 'pvp_lobby').length, 0, 'C yalnız (abone değil) hiçbir oda/maç mesajı almadı');
  assert.equal(C.inbox.slice(cBefore).length, 0);
  t.rooms.stop();
});

test('maç sonu: canı biten taraf bildirir, iki tarafa tek ve aynı sonuç; rövanşta kaybeden başlar', () => {
  const t = setup();
  const { A, B } = startedMatch(t);
  const matchId = t.last(A, 'pvp_match_start').matchId;
  t.sendMsg(B, { type: 'pvp_match_result', matchId, result: 'lose' });
  t.sendMsg(B, { type: 'pvp_match_result', matchId, result: 'lose' });
  const ea = t.all(A, 'pvp_match_end'), eb = t.all(B, 'pvp_match_end');
  assert.equal(ea.length, 1); assert.equal(eb.length, 1);
  assert.equal(ea[0].winner, '@ayse'); assert.equal(eb[0].winner, '@ayse'); assert.equal(ea[0].reason, 'ko');
  t.sendMsg(A, { type: 'pvp_rematch' });
  assert.equal(t.last(B, 'pvp_rematch_pending').from, '@ayse');
  t.sendMsg(B, { type: 'pvp_rematch' });
  const s2a = t.all(A, 'pvp_match_start'), s2b = t.all(B, 'pvp_match_start');
  assert.equal(s2a.length, 2); assert.equal(s2b.length, 2);
  assert.notEqual(s2a[1].matchId, matchId);
  assert.equal(s2a[1].firstTurn, '@bora', 'rövanşı kaybeden başlatır');
  t.rooms.stop();
});

test('kopma: rakibe pvp_peer_left, süre dolunca kalan hükmen kazanır; geri dönerse maç sürer', async () => {
  const t = setup();
  const { A, B } = startedMatch(t);
  t.drop(B);
  const left = t.last(A, 'pvp_peer_left');
  assert.equal(left.handle, '@bora'); assert.equal(left.graceMs, 80);
  t.sendMsg(A, { type: 'pvp_sync', action: 'fire' }); // kopuk rakibe gönderilmez, hata da olmaz
  await wait(130);
  const end = t.last(A, 'pvp_match_end');
  assert.equal(end.winner, '@ayse'); assert.equal(end.reason, 'disconnect');

  // Geri dönüş senaryosu: aynı hesap yeni soketle süre dolmadan bağlanır.
  const t2 = setup();
  const m2 = startedMatch(t2);
  const accB = m2.B.playerInfo.accountId;
  t2.drop(m2.B);
  const B2 = t2.connect('@bora', accB);
  assert.ok(t2.last(B2, 'pvp_match_resume'));
  assert.ok(t2.last(m2.A, 'pvp_peer_back'));
  await wait(130);
  assert.equal(t2.all(m2.A, 'pvp_match_end').length, 0, 'geri dönen oyuncu hükmen kaybetmez');
  t2.sendMsg(m2.A, { type: 'pvp_sync', action: 'turn_handoff', turnNo: 1 });
  assert.equal(t2.last(B2, 'pvp_sync').turnNo, 1, 'yeni sokete yönlenir');
  t.rooms.stop(); t2.rooms.stop();
});

test('ayrılma: maçta ayrılan hükmen kaybeder; rakip kopukken "Beklemeden çık" diyen kazanır', () => {
  const t = setup({ disconnectGraceMs: 10000 });
  const { A, B } = startedMatch(t);
  t.sendMsg(B, { type: 'pvp_room_leave' });
  assert.equal(t.last(A, 'pvp_match_end').winner, '@ayse'); assert.equal(t.last(A, 'pvp_match_end').reason, 'forfeit');
  assert.equal(t.last(B, 'pvp_match_end').winner, '@ayse');
  t.rooms.stop();
  const t2 = setup({ disconnectGraceMs: 10000 });
  const m = startedMatch(t2);
  t2.drop(m.B);
  t2.sendMsg(m.A, { type: 'pvp_room_leave' });
  assert.equal(t2.last(m.A, 'pvp_match_end').winner, '@ayse'); assert.equal(t2.last(m.A, 'pvp_match_end').reason, 'disconnect');
  t2.rooms.stop();
});

test('bekleme odasında kopma: oyuncu odadan düşer, oda kalan oyuncuyla açık kalır; bot provası yalnız kurucuya başlar', () => {
  const t = setup();
  const A = t.connect('@ayse'), B = t.connect('@bora');
  t.sendMsg(A, { type: 'pvp_room_create' });
  const room = t.last(A, 'pvp_room').room;
  t.sendMsg(B, { type: 'pvp_room_join', code: room.code });
  t.drop(B);
  assert.equal(t.last(A, 'pvp_room').room.players, 1);
  t.sendMsg(A, { type: 'pvp_room_bot', add: true });
  assert.equal(t.last(A, 'pvp_room').room.slots[1].kind, 'bot');
  t.sendMsg(A, { type: 'pvp_room_start' });
  const st = t.last(A, 'pvp_match_start');
  assert.equal(st.practice, true); assert.equal(st.matchId, null);
  assert.equal(t.rooms._debug.rooms.get(room.id).state, 'waiting', 'prova odayı maç durumuna sokmaz');
  t.rooms.stop();
});

test('hızlı savaş: iki oyuncu eşleşir, iki taraf "Hazırım" derse aynı maç başlar; karşılık yoksa düşer; 30 sn bildirimi', async () => {
  const t = setup();
  const A = t.connect('@ayse'), B = t.connect('@bora'), C = t.connect('@cem');
  t.sendMsg(A, { type: 'pvp_queue_join', mode: '1v1' });
  assert.equal(t.last(A, 'pvp_queue_state').status, 'searching');
  await wait(70);
  assert.equal(t.last(A, 'pvp_queue_state').slow, true, 'uzun aramada istemciye bildirim');
  t.sendMsg(B, { type: 'pvp_queue_join', mode: '1v1' });
  const fa = t.last(A, 'pvp_queue_found'), fb = t.last(B, 'pvp_queue_found');
  assert.equal(fa.matchKey, fb.matchKey); assert.equal(fa.opponent, '@bora'); assert.equal(fa.mapId, fb.mapId);
  t.sendMsg(A, { type: 'pvp_queue_ready', matchKey: fa.matchKey });
  assert.equal(t.last(B, 'pvp_queue_peer_ready').handle, '@ayse');
  t.sendMsg(B, { type: 'pvp_queue_ready', matchKey: fb.matchKey });
  const sa = t.last(A, 'pvp_match_start'), sb = t.last(B, 'pvp_match_start');
  assert.ok(sa && sb); assert.equal(sa.matchId, sb.matchId); assert.equal(sa.mapId, fa.mapId); assert.equal(sa.quick, true);
  assert.equal(C.inbox.length, 0);

  // Karşılık yok: B hazır demez → B düşer, hazır diyen C aramaya geri döner.
  const D = t.connect('@dila');
  t.sendMsg(C, { type: 'pvp_queue_join', mode: '1v1' });
  t.sendMsg(D, { type: 'pvp_queue_join', mode: '1v1' });
  const fc = t.last(C, 'pvp_queue_found');
  t.sendMsg(C, { type: 'pvp_queue_ready', matchKey: fc.matchKey });
  await wait(90);
  assert.equal(t.last(D, 'pvp_queue_state').status, 'dropped');
  const cs = t.all(C, 'pvp_queue_state').find(m => m.requeued);
  assert.ok(cs, 'hazır diyen kuyruğa geri döner'); assert.equal(cs.status, 'searching');
  assert.equal(t.last(C, 'pvp_queue_state').status, 'searching');
  assert.equal(t.all(C, 'pvp_match_start').length, 0);
  t.sendMsg(C, { type: 'pvp_queue_leave' });
  assert.equal(t.last(C, 'pvp_queue_state').status, 'idle');
  assert.equal(t.rooms._debug.queue.length, 0);
  t.rooms.stop();
});

test('süre aşımı: hareketsiz bekleme odası temizlenir; PvE sefer daveti oda yöneticisine takılmaz', () => {
  let clock = 1000;
  const WS_CLIENTS = new Set();
  const rooms = createPvpRooms({ crypto, WS_CLIENTS, encodeWsFrame: o => o, now: () => clock, config: { idleRoomMs: 1000 } });
  const A = { playerInfo: { accountId: 'a', handle: '@ayse' }, destroyed: false, inbox: [], write(o) { this.inbox.push(o); } };
  WS_CLIENTS.add(A);
  rooms.onMessage(A, { type: 'pvp_room_create' });
  assert.equal(rooms._debug.rooms.size, 1);
  clock += 2000; rooms.sweep();
  assert.equal(rooms._debug.rooms.size, 0);
  assert.equal(A.inbox.at(-1).type, 'pvp_room_closed');
  assert.equal(rooms.onMessage(A, { type: 'pvp_sync', action: 'invite', raidId: 'sahmeran' }), false);
  assert.equal(rooms.onMessage(A, { type: 'chat' }), false);
  rooms.stop();
});
