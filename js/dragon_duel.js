'use strict';

/* Gerçek Er Meydanı: server-authoritative classic dragon duels. */
function mpDuelToast(message, kind) {
  if (typeof toast === 'function') toast(message, kind || 'mute');
}

function mpSendDragonDuelInvite(handle) {
  const target = String(handle || '').trim();
  if (!target || !MP.connected || !MP.ws || MP.ws.readyState !== 1) {
    mpDuelToast('Gerçek düello için sunucuya bağlı olmalısın.');
    return false;
  }
  if (target === ((S && S.handle) || '@ejder_ocagi')) {
    mpDuelToast('Kendi ocağına meydan okuyamazsın.');
    return false;
  }
  const dragon = (typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]);
  if (!dragon) {
    mpDuelToast('Meydana çıkarabileceğin bir ejderhan yok.');
    return false;
  }
  const sendInvite = () => {
    if (!MP.ws || MP.ws.readyState !== 1) {
      mpDuelToast('Sunucu bağlantısı kesildi. Davet gönderilemedi.', 'warn');
      return;
    }
    mpSendWs({ type: 'duel_invite', to: target });
  };
  const sync = typeof mpSyncState === 'function' ? mpSyncState() : null;
  if (sync && typeof sync.then === 'function') sync.then(sendInvite).catch(sendInvite);
  else sendInvite();
  return true;
}

function mpReplyDragonDuelInvite(inviteId, accept) {
  if (!inviteId || !MP.ws || MP.ws.readyState !== 1) {
    mpDuelToast('Sunucu bağlantısı yok. Davet yanıtlanamadı.');
    return false;
  }
  mpSendWs({ type: 'duel_invite_reply', inviteId, accept: !!accept });
  return true;
}

function socialOnDuelInvite(msg) {
  if (!msg || !msg.id || !msg.from || !S) return;
  const s = ensureSocial();
  s.invites = s.invites.filter(x => !(x.kind === 'vs_duel' && x.id === msg.id));
  s.invites.push({ id: msg.id, kind: 'vs_duel', from: msg.from, dragon: msg.dragon || null, chibi: msg.chibi || null });
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play('bell');
  mpDuelToast(`⚔️ <b>${esc(msg.from)}</b>, ejderhanla gerçek bir er meydanı düellosu istiyor!`, 'goal');
  if (typeof socRefresh === 'function') socRefresh();
}

function mpClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function mpDuelPerspectiveFight(serverFight, role) {
  const raw = mpClone(serverFight);
  const swapped = role === 'p2';
  if (swapped) {
    const oldP = raw.p; raw.p = raw.e; raw.e = oldP;
    raw.p.side = 'p'; raw.e.side = 'e';
    if (raw.winner === 'p') raw.winner = 'e';
    else if (raw.winner === 'e') raw.winner = 'p';
  } else {
    raw.p.side = 'p'; raw.e.side = 'e';
  }
  return raw;
}

function mpDuelPerspectiveSnap(snap, role) {
  if (!snap) return null;
  return role === 'p2' ? { p: mpClone(snap.e), e: mpClone(snap.p) } : mpClone(snap);
}

function mpDuelPerspectiveEvents(events, role) {
  const swapped = role === 'p2';
  return (events || []).map(ev => {
    const out = mpClone(ev);
    if (swapped) {
      out.who = out.who === 'p' ? 'e' : 'p';
      if (out.after) out.after = { p: out.after.e, e: out.after.p };
    }
    return out;
  });
}

function mpStartServerDragonDuel(msg) {
  if (!msg || !msg.roomId || !msg.fight || !S) return;
  const me = S.handle || '@ejder_ocagi';
  const role = msg.you === msg.players[0].handle ? 'p1' : 'p2';
  const mine = (typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]);
  if (!mine) {
    mpSendWs({ type: 'duel_leave', roomId: msg.roomId });
    mpDuelToast('Düello başladı ama meydan ejderhan bulunamadı.');
    return;
  }
  const other = role === 'p1' ? msg.players[1] : msg.players[0];
  const peer = {
    handle: other.handle,
    guild: other.guild || 'Gezgin Ocak',
    title: other.title || 'Ocak Ustası',
    defenseBonus: other.defenseBonus || 12,
    d: other.dragon,
    chibi: other.chibi || null,
    isLive: true,
  };
  const opp = buildOppFromPeer(peer);
  const baseP = fighterFromDragon(mine);
  const baseE = fighterFromOpp(opp);
  const F = mpDuelPerspectiveFight(msg.fight, role);
  F.p = { ...baseP, ...F.p, side: 'p', ref: mine };
  F.e = { ...baseE, ...F.e, side: 'e', ref: opp };
  FT = {
    F, d: mine, opp, peer,
    mpOpts: { serverRoom: true, rewardGold: 85 },
    mpRoomId: msg.roomId,
    mpRole: role,
    waitingForOpponent: !!(msg.submitted || []).includes(me),
    spectators: 2,
    mode: 'mp', tier: 'koy', lethal: false,
    log: [{ t: `<b>Gerçek Er Meydanı:</b> ${esc(mine.name)} ile ${esc(other.handle)} ocağından <b>${esc(opp.name)}</b> karşı karşıya!`, c: 'mute' }],
    title: `Er Meydanı · ${other.handle} (${opp.name})`,
    result: null,
  };
  if (typeof pipReset === 'function') pipReset();
  fightModal();
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play('roar');
}

function mpSubmitDragonDuelAction(action) {
  if (!FT || FT.mode !== 'mp' || !FT.mpRoomId || FT.F.over) return false;
  if (FT.waitingForOpponent) return false;
  if (typeof canUseFightAction === 'function' && !canUseFightAction(action)) return false;
  FT.waitingForOpponent = true;
  FT.bufferedAct = null;
  mpSendWs({ type: 'duel_action', roomId: FT.mpRoomId, round: FT.F.round + 1, action });
  fightModal();
  return true;
}

function mpHandleDragonDuelState(msg) {
  if (!msg || !msg.roomId || !msg.fight || !Array.isArray(msg.players)) return;
  if (!FT || FT.mpRoomId !== msg.roomId) {
    mpStartServerDragonDuel(msg);
    if (msg.fight.over) mpApplyDragonDuelResult(msg);
    return;
  }
  const role = FT.mpRole;
  const events = mpDuelPerspectiveEvents(msg.events, role);
  FT.F = mpDuelPerspectiveFight(msg.fight, role);
  const mine = FT.d;
  const baseP = fighterFromDragon(mine);
  const baseE = fighterFromOpp(FT.opp);
  FT.F.p = { ...baseP, ...FT.F.p, side: 'p', ref: mine };
  FT.F.e = { ...baseE, ...FT.F.e, side: 'e', ref: FT.opp };
  FT.waitingForOpponent = !!(msg.submitted || []).includes(S.handle || '@ejder_ocagi');
  FT.pre = mpDuelPerspectiveSnap(msg.before, role);
  FT.pending = events.map(evText);
  FT.cutNext = typeof fightCutPick === 'function' && events.length ? fightCutPick(events, FT.F) : null;
  if (FT.F.over) mpApplyDragonDuelResult({ ...msg, events });
  if (events.length && FT.pre) {
    fightModal(events);
  } else {
    FT.pre = null; FT.pending = null; FT.busy = false;
    fightModal();
  }
}

function mpApplyDragonDuelResult(msg) {
  if (!FT || FT.mpRoomId !== msg.roomId || FT.mpResultApplied) return;
  if (!FT.F.over) return;
  FT.mpResultApplied = true;
  if (typeof finishMpFight === 'function') finishMpFight();
}

function handleDragonDuelNetMessage(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === 'duel_invite') {
    socialOnDuelInvite(msg);
  } else if (msg.type === 'duel_invite_sent') {
    mpDuelToast(`<b>${esc(msg.to || 'Rakip')}</b> daveti aldı. Yanıt bekleniyor.`);
  } else if (msg.type === 'duel_invite_result') {
    if (msg.status === 'rejected') mpDuelToast(`<b>${esc(msg.from || msg.to || 'Rakip')}</b> düello davetini reddetti.`, 'warn');
    else if (msg.status === 'expired') mpDuelToast('Düello davetinin süresi doldu.', 'warn');
    else if (msg.status === 'cancelled') mpDuelToast('Düello daveti iptal edildi.');
  } else if (msg.type === 'duel_room_start' || msg.type === 'duel_room_resume') {
    mpStartServerDragonDuel(msg);
  } else if (msg.type === 'duel_waiting') {
    if (FT && FT.mpRoomId === msg.roomId) {
      FT.waitingForOpponent = (msg.submitted || []).includes(S.handle || '@ejder_ocagi');
      if (!FT.busy && !FT.pre) fightModal();
    }
  } else if (msg.type === 'duel_room_state') {
    mpHandleDragonDuelState(msg);
  } else if (msg.type === 'duel_opponent_disconnected') {
    if (FT && FT.mpRoomId === msg.roomId) mpDuelToast('Rakibin bağlantısı kesildi. Yeniden bağlanması için 30 saniye tanındı.', 'warn');
  } else if (msg.type === 'duel_opponent_reconnected') {
    if (FT && FT.mpRoomId === msg.roomId) mpDuelToast('Rakibin yeniden meydana döndü.');
  } else if (msg.type === 'duel_error') {
    if (FT && FT.mpRoomId && msg.roomId === FT.mpRoomId && Array.isArray(msg.submitted)) {
      FT.waitingForOpponent = msg.submitted.includes(S.handle || '@ejder_ocagi');
      if (!FT.busy && !FT.pre) fightModal();
    }
    mpDuelToast(esc(msg.message || 'Düello işlemi tamamlanamadı.'), 'warn');
  }
}
