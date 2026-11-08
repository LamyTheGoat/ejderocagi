'use strict';

/* Gerçek Er Meydanı: server-authoritative classic dragon duels. */
function mpDuelToast(message, kind) {
  if (typeof toast === 'function') toast(message, kind || 'mute');
}

// ENG-10 · Ödüllü düello (isteğe bağlı): davet ve kabul sunucu defterindeki ejderhanın `dragonAssetId`'sini taşır.
// Ödül (zafer/beraberlik/yenilgi tutarı, günlük ve rakip limiti) yalnız sunucuda belirlenir; istemci yalnız gösterir.
// Vitrin (dostça) düello kalıcıdır ve eskisi gibi çalışır (kullanıcı kararı A-12 revize).
function mpRankedDuelDragon() {
  return typeof ECO_LINK !== 'undefined' && ECO_LINK.linked ? ECO_LINK.duelDragon() : null;
}
function mpSendDragonDuelInvite(handle, opts) {
  const ranked = !!(opts && opts.ranked);
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
  const rankedDragon = ranked ? mpRankedDuelDragon() : null;
  if (ranked && !rankedDragon) {
    mpDuelToast(typeof ECO_LINK !== 'undefined' && ECO_LINK.linked ? 'Sunucu kesende düelloya çıkabilecek bir ejderha yok (görevde, kilitli ya da ölü).' : 'Ödüllü düello için sunucu kesene bağlı olmalısın. Dostça (vitrin) düello açık.');
    return false;
  }
  if (!ranked && !dragon) {
    mpDuelToast('Meydana çıkarabileceğin bir ejderhan yok.');
    return false;
  }
  const sendInvite = () => {
    if (!MP.ws || MP.ws.readyState !== 1) {
      mpDuelToast('Sunucu bağlantısı kesildi. Davet gönderilemedi.', 'warn');
      return;
    }
    mpSendWs(ranked ? { type: 'duel_invite', to: target, dragonAssetId: rankedDragon.assetId } : { type: 'duel_invite', to: target });
    if (ranked) mpDuelToast(`🏆 Ödüllü düello daveti gönderildi · sunucu ejderhan: <b>${esc(rankedDragon.data.name || 'Ejderha')}</b>.`);
  };
  const sync = typeof mpSyncState === 'function' ? mpSyncState() : null;
  if (sync && typeof sync.then === 'function') sync.then(sendInvite).catch(sendInvite);
  else sendInvite();
  return true;
}

function mpReplyDragonDuelInvite(inviteId, accept, opts) {
  if (!inviteId || !MP.ws || MP.ws.readyState !== 1) {
    mpDuelToast('Sunucu bağlantısı yok. Davet yanıtlanamadı.');
    return false;
  }
  if (accept && opts && opts.ranked) {
    const mine = mpRankedDuelDragon();
    if (!mine) {
      mpDuelToast('Ödüllü düello için sunucu kesende düelloya çıkabilecek bir ejderha olmalı. Davet açık kaldı.', 'warn');
      return false;
    }
    mpSendWs({ type: 'duel_invite_reply', inviteId, accept: true, dragonAssetId: mine.assetId });
    return true;
  }
  mpSendWs({ type: 'duel_invite_reply', inviteId, accept: !!accept });
  return true;
}

function socialOnDuelInvite(msg) {
  if (!msg || !msg.id || !msg.from || !S) return;
  const s = ensureSocial();
  s.invites = s.invites.filter(x => !(x.kind === 'vs_duel' && x.id === msg.id));
  s.invites.push({ id: msg.id, kind: 'vs_duel', from: msg.from, dragon: msg.dragon || null, chibi: msg.chibi || null, ranked: !!msg.ranked });
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play('bell');
  mpDuelToast(msg.ranked ? `🏆 <b>${esc(msg.from)}</b> seni ödüllü düelloya çağırıyor! Ödül sunucuda belirlenir.` : `⚔️ <b>${esc(msg.from)}</b>, ejderhanla gerçek bir er meydanı düellosu istiyor!`, 'goal');
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
  const ranked = !!msg.ranked;
  // Ödüllü odada savaşçı sunucu defterindeki ejderhadır; görsel de oradan (yerel S'e dokunulmaz).
  const ledger = ranked ? (role === 'p1' ? msg.players[0] : msg.players[1]).dragon : null;
  const mine = ranked ? (ledger ? mpClone(ledger) : null) : ((typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]));
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
    mpOpts: { serverRoom: true, rewardGold: 85, ranked, matchId: msg.matchId || null },
    mpRoomId: msg.roomId,
    mpRole: role,
    waitingForOpponent: !!(msg.submitted || []).includes(me),
    spectators: 2,
    mode: 'mp', tier: 'koy', lethal: false,
    log: [{ t: `<b>${ranked ? 'Ödüllü Düello' : 'Gerçek Er Meydanı'}:</b> ${esc(mine.name)} ile ${esc(other.handle)} ocağından <b>${esc(opp.name)}</b> karşı karşıya!`, c: 'mute' }],
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
  } else if (msg.type === 'duel_settlement') {
    mpApplyDuelSettlement(msg);
  } else if (msg.type === 'duel_error') {
    if (FT && FT.mpRoomId && msg.roomId === FT.mpRoomId && Array.isArray(msg.submitted)) {
      FT.waitingForOpponent = msg.submitted.includes(S.handle || '@ejder_ocagi');
      if (!FT.busy && !FT.pre) fightModal();
    }
    mpDuelToast(esc(msg.message || 'Düello işlemi tamamlanamadı.'), 'warn');
  }
}

// Sunucu ödül sonucu (commit'ten SONRA gelir). Metin yalnız bu mesajdan üretilir; yerel altın yazılmaz.
function mpApplyDuelSettlement(msg) {
  if (!msg) return;
  const text = typeof ECO_LINK_LIB !== 'undefined' ? ECO_LINK_LIB.settlementText(msg) : '';
  if (FT && FT.mpOpts && FT.mpOpts.ranked && (FT.mpRoomId === msg.roomId || (msg.matchId && FT.mpOpts.matchId === msg.matchId))) {
    FT.result = (FT.result || []).filter(l => !/data-settle/.test(l));
    FT.result.push(`<span data-settle class="${msg.status === 'paid' ? 'good' : 'mute'}">${esc(text)}</span>`);
    if (!FT.busy && !FT.pre && typeof fightModal === 'function') fightModal();
  }
  mpDuelToast(`🏆 ${esc(text)}`, msg.status === 'paid' ? 'goal' : 'mute');
  if (typeof ECO_LINK !== 'undefined') ECO_LINK.boot(true);
}
