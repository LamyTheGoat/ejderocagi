'use strict';

const DuelEngine = require('./duel_engine.js');
const duelService = require('../server/duel_service.js');

// İki oda türü vardır:
// - Vitrin (eski) oda: davette `dragonAssetId` yoktur. Savaşçı `/api/sync` `duelFighter`ından gelir,
//   kayıt ve ödül YOKTUR. Dostça (vitrin) düello; ENG-10 ile kalıcıdır (A-12 revize), davranışı değişmedi.
// - Ödüllü (ekonomi) oda (ENG06 P-D): davet ve kabul `dragonAssetId` taşır. Savaşçı sunucu defterindeki
//   ejderhadan türetilir, maç depoya kaydedilir, tur RNG'si tohumludur, ödül yalnız sunucuda ve bir kez yazılır.
function createDragonDuelServer(deps) {
  const { crypto, WS_CLIENTS, WORLD, encodeWsFrame, store = null, retryDelayMs = 250 } = deps;
  const invites = new Map();
  const rooms = new Map();
  const starting = new Set();
  const pending = new Set();
  const INVITE_TTL = 30_000;
  const DISCONNECT_GRACE = 30_000;
  const ROOM_TTL = 3 * 60_000;
  const ECONOMY_ERRORS = {
    dragon_not_owned: 'Bu ejderha sunucu defterinde senin değil.',
    dragon_busy: 'Bu ejderha şu anda düelloya çıkamaz (görevde, ölü ya da kilitli).',
    dragon_trade_reserved: 'Bu ejderha bir takas teklifinde; önce takası bitir.',
    dragon_market_listed: 'Bu ejderha Bedesten ilanında; önce ilanı kaldır.',
    duel_busy: 'Zaten ödüllü bir düellodasın.',
    same_account: 'Kendi hesabına karşı ödüllü düello açılamaz.',
    game_not_started: 'Sunucu ocağın henüz kurulmadı; ödüllü düello açılamaz.',
    invalid_dragon_asset: 'Geçerli bir ejderha seçilmedi.',
    account_required: 'Ödüllü düello için iki tarafın da oturumu olmalı.',
  };

  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const send = (socket, payload) => {
    if (!socket || socket.destroyed) return;
    try { socket.write(encodeWsFrame(payload)); } catch (_) {}
  };
  const sendError = (socket, message, extra = {}) => send(socket, { type: 'duel_error', message, ...extra });
  const sendEconomyError = (socket, error) => {
    const code = error && error.code || 'duel_unavailable';
    sendError(socket, ECONOMY_ERRORS[code] || 'Ödüllü düello şu anda başlatılamadı.', { code });
  };
  const handleOf = socket => socket && socket.playerInfo && socket.playerInfo.handle;
  const accountOf = socket => socket && socket.playerInfo && socket.playerInfo.accountId || null;
  const isAuthed = socket => !!(socket && socket.playerInfo && socket.playerInfo.authenticated && handleOf(socket));
  const socketFor = handle => [...WS_CLIENTS].find(s => !s.destroyed && isAuthed(s) && handleOf(s) === handle) || null;
  const playerFor = handle => WORLD.players && WORLD.players[handle] || null;
  const validAssetId = v => typeof v === 'string' && v.length > 0 && v.length <= 200;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Arka plan iş: hata yutulur (oda zaten kullanıcıya bildirilir); test/kapanış `idle()` ile bekler.
  function run(fn) {
    const job = Promise.resolve().then(fn).catch(() => {});
    pending.add(job);
    job.finally(() => pending.delete(job));
    return job;
  }
  async function idle() { while (pending.size) await Promise.all([...pending]); }
  async function retry(fn, attempts = 3) {
    let last;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (error) {
        last = error;
        if (error && error.status && error.status < 500 && error.code !== 'version_conflict') break; // kesin ret: yeniden deneme yok
        if (i + 1 < attempts) await wait(retryDelayMs);
      }
    }
    throw last;
  }

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
    if (starting.has(handle)) return true;
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
      fight: copy(room.fight), submitted: Object.keys(room.actions),
      ranked: !!room.economy, ...(room.economy ? { matchId: room.economy.matchId } : {}), ...extra,
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
      if (room.cleanupTimer.unref) room.cleanupTimer.unref();
    }
  }

  // Ödüllü oda bitişi: kayıt kesinleşir (kazanan depoda seed + günlükten yeniden üretilir), sonra her hesap
  // kendi tek seferlik settlement'ını alır. İstemciye ödül bilgisi yalnız commit'ten SONRA gider.
  function finishEconomy(room, forfeit) {
    const eco = room.economy;
    if (!eco || eco.finishing) return;
    eco.finishing = true;
    run(async () => {
      try {
        await retry(() => store.finalizeMatch(eco.matchId, { log: eco.log, forfeit }));
      } catch (error) {
        if (!error || error.code !== 'match_closed') {
          for (const p of [room.p1, room.p2]) send(socketFor(p.handle), { type: 'duel_settlement', roomId: room.id, matchId: eco.matchId, status: 'pending', error: error && error.code || 'match_unavailable' });
          return;
        }
      }
      for (const p of [room.p1, room.p2]) {
        try {
          const out = await retry(() => store.settleGameplay(p.accountId, { eventId: eco.matchId, kind: duelService.SETTLEMENT_KIND }));
          const r = out.result;
          send(socketFor(p.handle), { type: 'duel_settlement', roomId: room.id, matchId: eco.matchId, status: r.status, outcome: r.outcome,
            reason: r.reason, amount: r.amount, source: r.source, paidDebt: r.paidDebt, credited: r.credited, economyVersion: r.appliedVersion, matchStatus: r.matchStatus });
        } catch (error) {
          send(socketFor(p.handle), { type: 'duel_settlement', roomId: room.id, matchId: eco.matchId, status: 'pending', error: error && error.code || 'settlement_unavailable' });
        }
      }
    });
  }

  function finishByForfeit(room, disconnectedHandle, reason = 'leave') {
    if (!room || room.fight.over) return;
    room.fight.over = true;
    room.fight.disconnected = disconnectedHandle;
    room.fight.winner = disconnectedHandle === room.p1.handle ? 'e' : 'p';
    broadcastRoomState(room, [], null);
    if (room.economy) {
      const leaver = disconnectedHandle === room.p1.handle ? room.p1 : room.p2;
      finishEconomy(room, { accountId: leaver.accountId, reason });
    }
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
        if (!socketFor(handle)) finishByForfeit(room, handle, 'disconnect');
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

  function issueInvite(socket, targetSocket, from, to, extra, dragon, chibi) {
    for (const old of invites.values()) {
      if (old.from === from && old.to === to) return sendError(socket, 'Bu rakibe zaten bekleyen bir davetin var.');
    }
    const id = crypto.randomBytes(12).toString('hex');
    const item = { id, from, to, createdAt: Date.now(), ...extra };
    invites.set(id, item);
    send(targetSocket, {
      type: 'duel_invite', id, from,
      dragon: copy(dragon), chibi: copy(chibi), ranked: !!item.economy,
    });
    send(socket, { type: 'duel_invite_sent', inviteId: id, to, ranked: !!item.economy });
    item.timer = setTimeout(() => {
      const pendingInvite = invites.get(id);
      if (!pendingInvite) return;
      invites.delete(id);
      send(socketFor(from), { type: 'duel_invite_result', status: 'expired', to });
      send(socketFor(to), { type: 'duel_invite_result', status: 'expired', from });
    }, INVITE_TTL);
    if (item.timer.unref) item.timer.unref();
  }

  function invite(socket, msg) {
    if (!isAuthed(socket)) return sendError(socket, 'Gerçek düello için oyuncu oturumu ile giriş yapmalısın.');
    const from = handleOf(socket);
    const to = String(msg.to || '').trim();
    if (!/^@[a-zA-Z0-9_]{2,24}$/.test(to) || to === from) return sendError(socket, 'Geçerli bir rakip seçilemedi.');
    if (liveRoomFor(from)) return sendError(socket, 'Zaten devam eden bir düellodasın.');
    if (liveRoomFor(to)) return sendError(socket, 'Rakibin şu anda başka bir düelloda.');
    const targetSocket = socketFor(to);
    if (!targetSocket) return sendError(socket, `${to} şu anda çevrimiçi değil.`);
    const p1 = playerFor(from);
    if (Object.hasOwn(msg, 'dragonAssetId')) {
      // Ödüllü oda: istemci yalnız hangi ejderhayla gireceğini söyler; istatistik/sahiplik sunucu defterinden.
      const fromAccount = accountOf(socket), toAccount = accountOf(targetSocket);
      if (!store || !fromAccount || !toAccount) return sendEconomyError(socket, { code: 'account_required' });
      if (!validAssetId(msg.dragonAssetId)) return sendEconomyError(socket, { code: 'invalid_dragon_asset' });
      if (fromAccount === toAccount) return sendEconomyError(socket, { code: 'same_account' });
      const dragonAssetId = msg.dragonAssetId;
      return run(async () => {
        let entry;
        try { entry = await store.checkDuelEntry(fromAccount, dragonAssetId); } catch (error) { return sendEconomyError(socket, error); }
        if (liveRoomFor(from) || liveRoomFor(to) || !socketFor(to)) return sendError(socket, 'Rakip artık hazır değil.');
        issueInvite(socket, socketFor(to), from, to, { economy: true, fromAccount, dragonAssetId }, entry.dragon, p1 && p1.chibi);
      });
    }
    const p2 = playerFor(to);
    if (!p1 || !p1.star || !p1.duelFighter) return sendError(socket, 'Ejderhanın savaş verileri sunucuya henüz eşitlenmedi. Meydana dönüp tekrar dene.');
    if (!p2 || !p2.star || !p2.duelFighter) return sendError(socket, 'Rakibin ejderhası henüz meydan verilerini eşitlemedi.');
    issueInvite(socket, targetSocket, from, to, {}, p1.star, p1.chibi);
  }

  function playerSeat(handle, accountId, player, dragon) {
    return { handle, accountId: accountId || null, guild: player && player.guild || 'Gezgin Ocak', title: player && player.title || 'Ocak Ustası',
      defenseBonus: player && player.defenseBonus || 12, chibi: player && player.chibi || null, dragon };
  }

  function startEconomyRoom(socket, senderSocket, pendingInvite, msg) {
    const from = pendingInvite.from, to = pendingInvite.to;
    const toAccount = accountOf(socket);
    if (!store || !toAccount || accountOf(senderSocket) !== pendingInvite.fromAccount) {
      send(senderSocket, { type: 'duel_invite_result', status: 'expired', to });
      return sendEconomyError(socket, { code: 'account_required' });
    }
    starting.add(from); starting.add(to);
    run(async () => {
      try {
        const matchId = duelService.newMatchId(), seed = crypto.randomBytes(32).toString('hex');
        const { match, dragons } = await store.openMatch({ matchId, seed, participants: [
          { accountId: pendingInvite.fromAccount, handle: from, dragonAssetId: pendingInvite.dragonAssetId },
          { accountId: toAccount, handle: to, dragonAssetId: msg.dragonAssetId },
        ] });
        const [a, b] = match.participants;
        const room = {
          id: matchId,
          p1: playerSeat(from, a.accountId, playerFor(from), dragons[0]),
          p2: playerSeat(to, b.accountId, playerFor(to), dragons[1]),
          fight: DuelEngine.createFight(a.fighter, b.fighter),
          actions: {}, disconnectTimer: null, cleanupTimer: null,
          economy: { matchId, rng: duelService.seededRng(seed), log: [], finishing: false },
        };
        rooms.set(matchId, room);
        send(socketFor(from), roomMessage(room, 'duel_room_start', from));
        send(socketFor(to), roomMessage(room, 'duel_room_start', to));
      } catch (error) {
        sendEconomyError(socket, error);
        send(socketFor(from), { type: 'duel_invite_result', status: 'failed', to, code: error && error.code || 'duel_unavailable' });
      } finally {
        starting.delete(from); starting.delete(to);
      }
    });
  }

  function reply(socket, msg) {
    if (!isAuthed(socket)) return sendError(socket, 'Davet yanıtı için giriş yapmalısın.');
    const inviteId = String(msg.inviteId || '');
    const pendingInvite = invites.get(inviteId);
    if (!pendingInvite || pendingInvite.to !== handleOf(socket)) return sendError(socket, 'Bu düello daveti artık geçerli değil.');
    if (pendingInvite.economy && msg.accept && !validAssetId(msg.dragonAssetId)) return sendEconomyError(socket, { code: 'invalid_dragon_asset' });
    invites.delete(inviteId);
    if (pendingInvite.timer) clearTimeout(pendingInvite.timer);
    const senderSocket = socketFor(pendingInvite.from);
    if (!msg.accept) {
      send(senderSocket, { type: 'duel_invite_result', status: 'rejected', from: handleOf(socket) });
      send(socket, { type: 'duel_invite_result', status: 'cancelled', to: pendingInvite.from });
      return;
    }
    if (!senderSocket || liveRoomFor(pendingInvite.from) || liveRoomFor(pendingInvite.to)) {
      send(senderSocket, { type: 'duel_invite_result', status: 'expired', to: pendingInvite.to });
      return sendError(socket, 'Rakip artık hazır değil; düello başlatılamadı.');
    }
    if (pendingInvite.economy) return startEconomyRoom(socket, senderSocket, pendingInvite, msg);
    const p1 = playerFor(pendingInvite.from), p2 = playerFor(pendingInvite.to);
    const f1 = p1 && cleanFighter(p1.duelFighter, p1.star);
    const f2 = p2 && cleanFighter(p2.duelFighter, p2.star);
    if (!f1 || !f2) return sendError(socket, 'Ejderha savaş verileri eksik; düello başlatılamadı.');
    const id = 'dragon_' + crypto.randomBytes(10).toString('hex');
    const room = {
      id,
      p1: { handle: pendingInvite.from, guild: p1.guild || 'Gezgin Ocak', title: p1.title || 'Ocak Ustası', defenseBonus: p1.defenseBonus || 12, chibi: p1.chibi || null, dragon: p1.star },
      p2: { handle: pendingInvite.to, guild: p2.guild || 'Gezgin Ocak', title: p2.title || 'Ocak Ustası', defenseBonus: p2.defenseBonus || 12, chibi: p2.chibi || null, dragon: p2.star },
      fight: DuelEngine.createFight(f1, f2),
      actions: {}, disconnectTimer: null, cleanupTimer: null,
    };
    rooms.set(id, room);
    send(senderSocket, roomMessage(room, 'duel_room_start', pendingInvite.from));
    send(socket, roomMessage(room, 'duel_room_start', pendingInvite.to));
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
    const a1 = room.actions[room.p1.handle], a2 = room.actions[room.p2.handle];
    if (room.economy) room.economy.log.push({ round: room.fight.round + 1, actions: [a1, a2] });
    const events = DuelEngine.resolveRound(room.fight, a1, a2, room.economy ? room.economy.rng : undefined);
    room.actions = {};
    broadcastRoomState(room, events, before);
    if (room.economy && room.fight.over) finishEconomy(room, null);
  }

  function leave(socket, msg) {
    if (!isAuthed(socket)) return;
    const room = rooms.get(String(msg.roomId || ''));
    const handle = handleOf(socket);
    if (!room || room.fight.over) return;
    if (room.p1.handle !== handle && room.p2.handle !== handle) return;
    finishByForfeit(room, handle, 'leave');
  }

  function onMessage(socket, msg) {
    if (!msg || !['duel_invite', 'duel_invite_reply', 'duel_action', 'duel_leave'].includes(msg.type)) return false;
    if (msg.type === 'duel_invite') invite(socket, msg);
    else if (msg.type === 'duel_invite_reply') reply(socket, msg);
    else if (msg.type === 'duel_action') submitAction(socket, msg);
    else if (msg.type === 'duel_leave') leave(socket, msg);
    return true;
  }

  return { onMessage, onConnect, onDisconnect, cleanFighter, idle };
}

module.exports = { createDragonDuelServer };
