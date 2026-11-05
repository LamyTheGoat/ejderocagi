'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createDragonDuelServer } = require('../js/duel_server.js');

function makePlayer(handle, dragonName, element, stats) {
  return {
    handle,
    guild: `${handle} Loncası`,
    title: 'Ocak Ustası',
    defenseBonus: 12,
    chibi: null,
    star: { id: dragonName, name: dragonName, el: element, stage: 'yetiskin', bond: 70, st: stats, traits: [], cards: [] },
    duelFighter: {
      name: dragonName, el: element, ...stats, atk: 4, def: 3, maxHp: 150,
      mood: 3, bond: 70, seasonMult: 1, cards: ['celik_pence'],
    },
  };
}

function makeSocket(handle, authenticated = true) {
  return {
    playerInfo: { handle, authenticated },
    destroyed: false,
    messages: [],
    write(frame) { this.messages.push(JSON.parse(frame)); },
    take(type) { return this.messages.filter(m => m.type === type); },
    last(type) { return this.take(type).at(-1); },
  };
}

const clients = new Set();
const world = {
  players: {
    '@alpha': makePlayer('@alpha', 'Kor', 'ates', { gu: 60, ce: 55, da: 50, ze: 55 }),
    '@beta': makePlayer('@beta', 'Ayaz', 'buz', { gu: 52, ce: 70, da: 52, ze: 58 }),
  },
};
const server = createDragonDuelServer({ crypto, WS_CLIENTS: clients, WORLD: world, encodeWsFrame: JSON.stringify });

// Unauthenticated sockets cannot create actual duel invitations.
const guest = makeSocket('@guest', false);
clients.add(guest);
assert.equal(server.onMessage(guest, { type: 'duel_invite', to: '@beta' }), true);
assert.match(guest.last('duel_error').message, /X oturumu/);
// Existing spectator reactions are not consumed by the duel-room handler.
assert.equal(server.onMessage(guest, { type: 'duel_cheer', roomId: 'main' }), false);

const alpha = makeSocket('@alpha');
const beta = makeSocket('@beta');
clients.add(alpha);
clients.add(beta);

// A rejected invitation never creates a fight room.
server.onMessage(alpha, { type: 'duel_invite', to: '@beta' });
let invite = beta.last('duel_invite');
assert.ok(invite && invite.id);
server.onMessage(beta, { type: 'duel_invite_reply', inviteId: invite.id, accept: false });
assert.equal(alpha.last('duel_invite_result').status, 'rejected');
assert.equal(alpha.take('duel_room_start').length, 0);

// An accepted invitation gives both clients the exact same server-owned room.
server.onMessage(alpha, { type: 'duel_invite', to: '@beta' });
invite = beta.last('duel_invite');
server.onMessage(beta, { type: 'duel_invite_reply', inviteId: invite.id, accept: true });
const startA = alpha.last('duel_room_start');
const startB = beta.last('duel_room_start');
assert.ok(startA && startB);
assert.equal(startA.roomId, startB.roomId);
assert.equal(startA.you, '@alpha');
assert.equal(startB.you, '@beta');

// One player's action waits. The round is resolved only after the second player acts.
server.onMessage(alpha, { type: 'duel_action', roomId: startA.roomId, round: 1, action: 'pence' });
assert.ok(alpha.last('duel_waiting'));
assert.equal(alpha.take('duel_room_state').length, 0);
server.onMessage(beta, { type: 'duel_action', roomId: startA.roomId, round: 1, action: 'nefes' });
const stateA = alpha.last('duel_room_state');
const stateB = beta.last('duel_room_state');
assert.ok(stateA && stateB);
assert.equal(stateA.roomId, stateB.roomId);
assert.equal(stateA.fight.round, 1);
assert.equal(stateB.fight.round, 1);
assert.equal(stateA.events.length, 2);
assert.deepEqual(stateA.fight.p, stateB.fight.p);
assert.deepEqual(stateA.fight.e, stateB.fight.e);

// Stale/duplicate turns and illegal actions are rejected by the server.
server.onMessage(alpha, { type: 'duel_action', roomId: startA.roomId, round: 1, action: 'pence' });
assert.match(alpha.last('duel_error').message, /eski bir tura/);
server.onMessage(beta, { type: 'duel_action', roomId: startA.roomId, round: 2, action: 'admin_win' });
assert.match(beta.last('duel_error').message, /hamle/);

console.log('PASS: authentication, invite accept/reject, shared room, simultaneous actions, canonical state, stale/illegal action guards.');
