'use strict';

const DuelEngine = require('./duel_engine.js');

function createDragonDuelServer(deps) {
  const { crypto, WS_CLIENTS, WORLD, encodeWsFrame } = deps;
  const invites = new Map();
  const rooms = new Map();
  const INVITE_TTL = 30_000;
  const DISCONNECT_GRACE = 30_000;
  const ROOM_TTL = 3 * 60_000;

  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const send = (socket, payload) => {
    if (!socket || socket.destroyed) return;
    try { socket.write(encodeWsFrame(payload)); } catch (_) {}
  };
  const sendError = (socket, message, extra = {}) => send(socket, { type: 'duel_error', message, ...extra });
  const handleOf = socket => socket && socket.playerInfo && socket.playerInfo.handle;
  const isAuthed = socket => !!(socket && socket.playerInfo && socket.playerInfo.authenticated && handleOf(socket));
  const socketFor = handle => [...WS_CLIENTS].find(s => !s.destroyed && isAuthed(s) && handleOf(s) === handle) || null;
  const playerFor = handle => WORLD.players && WORLD.players[handle] || null;

  function cleanFighter(raw, dragon) {
    if (!raw || !dragon || typeof raw !== 'object') return null;
    const num = (v, fallback, max) => {
      const n = Number(v);
      return Math.max(0, Math.min(max, Number.isFinite(n) ? n : fallback));
    };
    const cards = Array.isArray(raw.cards) ? raw.cards.filter(k => typeof k === 'string').slice(0, 3) : [];
    return {
      name: String(dragon.name || raw.name || 'Ejderha').slice(0, 40),
      el: ['ates', 'buz', 'firtina', 'toprak', 'golge'].includes(raw.el) ? raw.el : 'ates',
      gu: num(raw.gu, dragon.st && dragon.st.gu || 30, 500),
      ce: num(raw.ce, dragon.st && dragon.st.ce || 30, 500),
      da: num(raw.da, dragon.st && dragon.st.da || 30, 500),
      ze: num(raw.ze, dragon.st && dragon.st.ze || 30, 500),
      atk: num(raw.atk, 0, 500), def: num(raw.def, 0, 500),
      crit: num(raw.crit, 0, 100), dodge: num(raw.dodge, 0, 90),
      nefesB: num(raw.nefesB, 0, 200), seasonMult: num(raw.seasonMult, 1, 1.2), maxHp: num(raw.maxHp, 100, 5000),
      mood: Math.round(num(raw.mood, 2, 4)),
      cesur: !!raw.cesur, temkinli: !!raw.temkinli, demir: !!raw.demir, vahsi: !!raw.vahsi,
      bond: num(raw.bond, dragon.bond || 0, 100), bondUsed: !!raw.bondUsed,
      heart: !!raw.heart, saves: num(raw.saves, 0, 2), tired: !!raw.tired,
      cards,
    };
  }

  function liveRoomFor(handle) {
    for (const room of rooms.values()) {
      if (!room.fight.over && (room.p1.handle === handle || room.p2.handle === handle)) return room;
    }
    return null;
  }

  function publicPlayers(room) {
    return [room.p1, room.p2].map(p => ({
      handle: p.handle, guild: p.guild, title: p.title,
      defenseBonus: p.defenseBonus, chibi: copy(p.chibi), dragon: copy(p.dragon),
    }));
  }

  function roomMessage(room, type, you, extra = {}) {
    return {
      type, roomId: room.id, you, players: publicPlayers(room),
      fight: copy(room.fight), submitted: Object.keys(room.actions), ...extra,
    };
  }

  function broadcastRoomState(room, events, before) {
    for (const p of [room.p1, room.p2]) {
      send(socketFor(p.handle), roomMessage(room, 'duel_room_state', p.handle, {
        events: copy(events || []), before: copy(before || null),
      }));
    }
    if (room.fight.over && !room.cleanupTimer) {
      room.finishedAt = Date.now();
      room.cleanupTimer = setTimeout(() => rooms.delete(room.id), ROOM_TTL);
    }
  }

  function finishByForfeit(room, disconnectedHandle) {
    if (!room || room.fight.over) return;
    room.fight.over = true;
    room.fight.disconnected = disconnectedHandle;
    room.fight.winner = disconnectedHandle === room.p1.handle ? 'e' : 'p';
    broadcastRoomState(room, [], null);
  }

  function onDisconnect(socket) {
    const handle = handleOf(socket);
    if (!handle || !socket.playerInfo || !socket.playerInfo.authenticated) return;
    if (socketFor(handle)) return;
    for (const room of rooms.values()) {
      if (room.fight.over || (room.p1.handle !== handle && room.p2.handle !== handle)) continue;
      if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
      const other = room.p1.handle === handle ? room.p2.handle : room.p1.handle;
      send(socketFor(other), { type: 'duel_opponent_disconnected', roomId: room.id, handle, graceMs: DISCONNECT_GRACE });
      room.disconnectTimer = setTimeout(() => {
        if (!socketFor(handle)) finishByForfeit(room, handle);
      }, DISCONNECT_GRACE);
    }
  }

  function onConnect(socket) {
    if (!isAuthed(socket)) return;
    const handle = handleOf(socket);
    for (const room of rooms.values()) {
      if (room.fight.over || (room.p1.handle !== handle && room.p2.handle !== handle)) continue;
      if (room.disconnectTimer) { clearTimeout(room.disconnectTimer); room.disconnectTimer = null; }
      send(socket, roomMessage(room, 'duel_room_resume', handle));
      const other = room.p1.handle === handle ? room.p2.handle : room.p1.handle;
      send(socketFor(other), { type: 'duel_opponent_reconnected', roomId: room.id, handle });
      break;
    }
  }

  function invite(socket, msg) {
    if (!isAuthed(socket)) return sendError(socket, 'Gerçek düello için X oturumu ile giriş yapmalısın.');
    const from = handleOf(socket);
    const to = String(msg.to || '').trim();
    if (!/^@[a-zA-Z0-9_]{2,24}$/.test(to) || to === from) return sendError(socket, 'Geçerli bir rakip seçilemedi.');
    if (liveRoomFor(from)) return sendError(socket, 'Zaten devam eden bir düellodasın.');
    if (liveRoomFor(to)) return sendError(socket, 'Rakibin şu anda başka bir düelloda.');
    const targetSocket = socketFor(to);
    if (!targetSocket) return sendError(socket, `${to} şu anda çevrimiçi değil.`);
    const p1 = playerFor(from), p2 = playerFor(to);
    if (!p1 || !p1.star || !p1.duelFighter) return sendError(socket, 'Ejderhanın savaş verileri sunucuya henüz eşitlenmedi. Meydana dönüp tekrar dene.');
    if (!p2 || !p2.star || !p2.duelFighter) return sendError(socket, 'Rakibin ejderhası henüz meydan verilerini eşitlemedi.');
    for (const old of invites.values()) {
      if (old.from === from && old.to === to) return sendError(socket, 'Bu rakibe zaten bekleyen bir davetin var.');
    }
    const id = crypto.randomBytes(12).toString('hex');
    const item = { id, from, to, createdAt: Date.now() };
    invites.set(id, item);
    send(targetSocket, {
      type: 'duel_invite', id, from,
      dragon: copy(p1.star), chibi: copy(p1.chibi),
    });
    send(socket, { type: 'duel_invite_sent', inviteId: id, to });
    item.timer = setTimeout(() => {
      const pending = invites.get(id);
      if (!pending) return;
      invites.delete(id);
      send(socketFor(from), { type: 'duel_invite_result', status: 'expired', to });
      send(socketFor(to), { type: 'duel_invite_result', status: 'expired', from });
    }, INVITE_TTL);
  }

  function reply(socket, msg) {
    if (!isAuthed(socket)) return sendError(socket, 'Davet yanıtı için giriş yapmalısın.');
    const inviteId = String(msg.inviteId || '');
    const pending = invites.get(inviteId);
    if (!pending || pending.to !== handleOf(socket)) return sendError(socket, 'Bu düello daveti artık geçerli değil.');
    invites.delete(inviteId);
    if (pending.timer) clearTimeout(pending.timer);
    const senderSocket = socketFor(pending.from);
    if (!msg.accept) {
      send(senderSocket, { type: 'duel_invite_result', status: 'rejected', from: handleOf(socket) });
      send(socket, { type: 'duel_invite_result', status: 'cancelled', to: pending.from });
      return;
    }
    if (!senderSocket || liveRoomFor(pending.from) || liveRoomFor(pending.to)) {
      send(senderSocket, { type: 'duel_invite_result', status: 'expired', to: pending.to });
      return sendError(socket, 'Rakip artık hazır değil; düello başlatılamadı.');
    }
    const p1 = playerFor(pending.from), p2 = playerFor(pending.to);
    const f1 = p1 && cleanFighter(p1.duelFighter, p1.star);
    const f2 = p2 && cleanFighter(p2.duelFighter, p2.star);
    if (!f1 || !f2) return sendError(socket, 'Ejderha savaş verileri eksik; düello başlatılamadı.');
    const id = 'dragon_' + crypto.randomBytes(10).toString('hex');
    const room = {
      id,
      p1: { handle: pending.from, guild: p1.guild || 'Gezgin Ocak', title: p1.title || 'Ocak Ustası', defenseBonus: p1.defenseBonus || 12, chibi: p1.chibi || null, dragon: p1.star },
      p2: { handle: pending.to, guild: p2.guild || 'Gezgin Ocak', title: p2.title || 'Ocak Ustası', defenseBonus: p2.defenseBonus || 12, chibi: p2.chibi || null, dragon: p2.star },
      fight: DuelEngine.createFight(f1, f2),
      actions: {}, disconnectTimer: null, cleanupTimer: null,
    };
    rooms.set(id, room);
    send(senderSocket, roomMessage(room, 'duel_room_start', pending.from));
    send(socket, roomMessage(room, 'duel_room_start', pending.to));
  }

  function submitAction(socket, msg) {
    if (!isAuthed(socket)) return sendError(socket, 'Düello hamlesi için giriş yapmalısın.');
    const room = rooms.get(String(msg.roomId || ''));
    const handle = handleOf(socket);
    if (!room || room.fight.over || (room.p1.handle !== handle && room.p2.handle !== handle)) return sendError(socket, 'Düello odası bulunamadı veya sona erdi.');
    const role = room.p1.handle === handle ? 'p' : 'e';
    const round = Number(msg.round);
    if (!Number.isInteger(round) || round !== room.fight.round + 1) return sendError(socket, 'Bu hamle eski bir tura ait.', { roomId: room.id, submitted: Object.keys(room.actions) });
    const action = String(msg.action || '');
    if (!DuelEngine.isLegalAction(room.fight[role], action)) return sendError(socket, 'Bu ejderha şu anda bu hamleyi yapamaz.', { roomId: room.id, submitted: Object.keys(room.actions) });
    if (room.actions[handle]) return sendError(socket, 'Bu turdaki hamleni zaten gönderdin.', { roomId: room.id, submitted: Object.keys(room.actions) });
    room.actions[handle] = action;
    const submitted = Object.keys(room.actions);
    for (const p of [room.p1, room.p2]) {
      send(socketFor(p.handle), { type: 'duel_waiting', roomId: room.id, submitted });
    }
    if (!room.actions[room.p1.handle] || !room.actions[room.p2.handle]) return;
    const before = DuelEngine.snapshot(room.fight);
    const events = DuelEngine.resolveRound(room.fight, room.actions[room.p1.handle], room.actions[room.p2.handle]);
    room.actions = {};
    broadcastRoomState(room, events, before);
  }

  function leave(socket, msg) {
    if (!isAuthed(socket)) return;
    const room = rooms.get(String(msg.roomId || ''));
    const handle = handleOf(socket);
    if (!room || room.fight.over) return;
    if (room.p1.handle !== handle && room.p2.handle !== handle) return;
    finishByForfeit(room, handle);
  }

  function onMessage(socket, msg) {
    if (!msg || !['duel_invite', 'duel_invite_reply', 'duel_action', 'duel_leave'].includes(msg.type)) return false;
    if (msg.type === 'duel_invite') invite(socket, msg);
    else if (msg.type === 'duel_invite_reply') reply(socket, msg);
    else if (msg.type === 'duel_action') submitAction(socket, msg);
    else if (msg.type === 'duel_leave') leave(socket, msg);
    return true;
  }

  return { onMessage, onConnect, onDisconnect, cleanFighter };
}

module.exports = { createDragonDuelServer };
