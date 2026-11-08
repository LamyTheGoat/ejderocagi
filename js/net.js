'use strict';
/* ============ EJDER OCAĞI — ÇOK OYUNCULU AĞ, ORİJİNAL DÖVÜŞ MOTORUYLA CANLI DÜELLO & SEYİRCİ TRİBÜNÜ ============ */

const MP = {
  connected: false,
  ws: null,
  onlineCount: 1,
  worldBoss: null,
  caravans: null,
  myRaids: null,
  liveMatches: [],
  chatLog: [],
  marketListings: null,
  lastWheelSpin: null,
  pvpPeers: {},
  coopPeers: {},
  serverUrl: (typeof location !== 'undefined' && location.protocol.startsWith('http')) ? location.origin : 'http://localhost:3000',
};

/* ---- X ile giriş (ana ekran): sunucunun imzalı oturum çerezi tek doğruluk kaynağıdır ---- */
const XAUTH = { handle: null, enabled: false, checked: false };

function xApplyToState() {
  if (!S) return;
  if (MP.authHandle) S.handle = MP.authHandle;
  S.xVerified = !!XAUTH.handle;
  if (typeof saveGame === 'function') saveGame();
}

function xAuthInit(announce) {
  if (typeof fetch === 'undefined' || typeof location === 'undefined' || !location.protocol.startsWith('http')) return;
  fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(me => {
    if (!me || !me.ok) return;
    XAUTH.checked = true;
    XAUTH.enabled = !!me.enabled;
    XAUTH.handle = me.handle ? (me.handle.startsWith('@') ? me.handle : '@' + me.handle) : null;
    xApplyToState();
    if (announce && XAUTH.handle) toast(`<b>X Hesabın Doğrulandı</b><br>Hoş geldin <b>${esc(XAUTH.handle)}</b>`, 'goal');
    if (typeof UI !== 'undefined' && UI.view === 'title' && typeof render === 'function') render();
  }).catch(() => {});
}

function mpCheckUrlParams() {
  if (typeof location === 'undefined') return;
  xAuthInit(false);
  if (!location.search) return;
  try {
    const params = new URLSearchParams(location.search);
    const xErr = params.get('x_error');
    if (xErr) {
      const msgs = {
        not_configured: 'X girişi bu sunucuda henüz etkin değil.',
        denied: 'X giriş izni verilmedi.',
        bad_state: 'Giriş oturumu süresi doldu, tekrar dene.',
        mock_disabled: 'Simülasyon girişi kapalı.',
      };
      setTimeout(() => toast(`<b>X Girişi Başarısız</b><br>${esc(msgs[xErr] || 'Bir hata oluştu, tekrar dene.')}`), 500);
    }
    if (params.get('x_verified') === '1') xAuthInit(true);
    const chal = params.get('challenge');
    if (chal && S) {
      const targetH = chal.startsWith('@') ? chal : '@' + chal;
      setTimeout(() => {
        UI.view = 'meydan';
        render();
        toast(`<b>${esc(targetH)} Ocağına Meydan Okuma Bağlantısıyla Geldin</b>`);
      }, 650);
    }
  } catch (e) {}
}

// Account identity is obtained from an HttpOnly session, never localStorage.
// The authoritative economy remains separate until gameplay commands are ported.
function mpEnsureGuestSession(baseHttp) {
  if (MP._sessionPromise) return MP._sessionPromise;
  const bootstrap = () => fetch(`${baseHttp}/api/session`, { method: 'POST', credentials: 'same-origin' })
    .then(async response => {
      if ([404, 405, 501].includes(response.status)) { MP.staticServer = true; return false; }
      if (!response.ok) throw new Error('guest_session_unavailable');
      const session = await response.json();
      if (!session.ok || !session.accountId || !session.handle) throw new Error('invalid_guest_session');
      if (MP.accountId !== session.accountId && typeof createEconomyClient === 'function') {
        let storage = null; try { storage = window.localStorage; } catch (_) {}
        MP.economyClient = createEconomyClient({ storage, storageKey: 'eo-economy-pending:' + session.accountId });
      }
      MP.accountId = session.accountId;
      MP.authHandle = session.handle;
      MP.authenticated = true;
      if (S) { S.handle = session.handle; S.xVerified = !!XAUTH.handle; }
      // ENG-10: sunucu kesesi (hafta/borç) arka planda okunur; oyunu bekletmez, hata yerel akışı kilitlemez.
      if (typeof ECO_LINK !== 'undefined') Promise.resolve().then(() => ECO_LINK.boot(true)).catch(() => {});
      return true;
    });
  // Serialize first-time bootstrap across tabs where Web Locks is available.
  MP._sessionPromise = (typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('eo-guest-bootstrap', bootstrap) : bootstrap())
    .finally(() => { MP._sessionPromise = null; });
  return MP._sessionPromise;
}

function mpConnect() {
  if (typeof WebSocket === 'undefined' || typeof fetch === 'undefined' || MP.staticServer) return;
  const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');
  const baseHttp = isHttp ? location.origin : 'http://localhost:3000';
  const baseWs = baseHttp.replace(/^http/, 'ws') + '/ws';

  mpEnsureGuestSession(baseHttp)
    .then(ready => ready ? fetch(`${baseHttp}/api/state`) : null)
    .then(r => {
      if (!r) return null;
      if (r.status === 404 || r.status === 405 || r.status === 501) {
        MP.staticServer = true;
        MP.connected = false;
        return null;
      }
      return r.ok ? r.json() : null;
    })
    .then(data => {
      if (!data || !data.ok) return;
      MP.connected = true;
      MP.onlineCount = data.onlineCount || 1;
      if (data.worldBoss) MP.worldBoss = data.worldBoss;
      if (data.caravans) MP.caravans = data.caravans;
      if (data.myRaids) MP.myRaids = data.myRaids;
      if (data.chatLog) MP.chatLog = data.chatLog;
      if (S) {
        if (data.codex) S.codex = Object.assign(S.codex || {}, data.codex);
        if (data.banners) {
          S.banners = S.banners || {};
          for (const rk of Object.keys(data.banners)) {
            const b = data.banners[rk];
            S.banners[rk] = { ...b, mine: b.owner === (S.handle || '@ejder_ocagi') };
          }
        }
        if (data.peers && data.peers.length && S.hub) {
          const others = data.peers.filter(p => p.handle !== (S.handle || '@ejder_ocagi'));
          if (others.length) S.hub.peers = others;
        }
      }
      if (typeof render === 'function' && UI.view === 'meydan') render();
      mpOpenWs(baseWs);
    })
    .catch(() => {
      MP.connected = false;
    });
}

function mpOpenWs(baseWs) {
  try {
    if (MP.ws) { try { MP.ws.close(); } catch (e) {} }
    const ws = new WebSocket(baseWs);
    MP.ws = ws;
    ws.onopen = () => {
      if(typeof TRADE_UI !== "undefined") TRADE_UI.reconnect();
      MP.connected = true;
      mpSyncState();
      if (MP._pingTimer) clearInterval(MP._pingTimer);
      MP._pingTimer = setInterval(() => {
        if (MP.ws && MP.ws.readyState === 1) {
          try { MP.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() })); } catch (e) {}
        }
      }, 25000);
      if (typeof render === 'function' && UI.view === 'meydan') render();
    };
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if (['trade_state','trade_error'].includes(msg.type) && typeof TRADE_UI !== 'undefined') { TRADE_UI.notify(msg); }
        if (msg.type === 'online_count') {
          MP.onlineCount = msg.count || 1;
          if (UI.view === 'meydan') render();
        } else if (msg.type === 'welcome') {
          MP.authenticated = !!msg.authenticated;
          MP.authHandle = msg.authenticated ? (msg.handle || null) : null;
          MP.accountId = msg.accountId || MP.accountId;
          MP.xVerified = !!msg.xVerified; // ENG-10 Y-1: ödüllü düello yalnız kayıtlı (X oturumlu) hesaba açık
          // ENG-10 (6): kayıtlı oturumda sunucu ocağı yoksa arka planda kurulur (hata → sessizce eski akış).
          if (MP.xVerified && typeof ECO_LINK !== 'undefined') Promise.resolve().then(() => ECO_LINK.boot(true)).then(() => ECO_LINK.autoStart(true)).catch(() => {});
          if (MP.authHandle && S) { S.handle = MP.authHandle; S.xVerified = !!msg.xVerified; if (typeof saveGame === 'function') saveGame(); }
          MP.onlineCount = msg.onlineCount || 1;
          if (msg.worldBoss) MP.worldBoss = msg.worldBoss;
          if (msg.caravans) MP.caravans = msg.caravans;
          if (msg.chatLog) MP.chatLog = msg.chatLog;
          if (msg.marketListings) MP.marketListings = msg.marketListings;
        } else if (['duel_invite', 'duel_invite_sent', 'duel_invite_result', 'duel_room_start', 'duel_room_resume', 'duel_waiting', 'duel_room_state', 'duel_opponent_disconnected', 'duel_opponent_reconnected', 'duel_error', 'duel_settlement'].includes(msg.type) && typeof handleDragonDuelNetMessage === 'function') {
          handleDragonDuelNetMessage(msg);
        } else if (msg.type === 'market_update') {
          if (msg.listings) {
            MP.marketListings = msg.listings;
            if (S) S.bedestenListings = msg.listings;
          }
          // ENG-10 (ENG-09 D-1): yayın yalnız "yenile" sinyalidir; satış geliri yerel S.gold'a ASLA yazılmaz
          // (Bedesten geliri yalnız sunucu kesesine, sunucu komutuyla girer).
          if (typeof MARKET_CLIENT !== 'undefined' && UI.view === 'pazar' && UI.stall === 'bedesten') MARKET_CLIENT.refresh();
          if (msg.offer && S && msg.offer.seller === (S.handle || '@ejder_ocagi')) {
            toast(`<b>Canlı Pazarlık Teklifi!</b> ${esc(msg.offer.buyer || 'Bir terbiyeci')}, <b>${esc(msg.offer.title)}</b> ilanın için <b>${msg.offer.price} altın</b> teklif etti!`);
            if (typeof SFX !== 'undefined' && SFX.play) SFX.play('bell');
          }
          if (UI.view === 'pazar' && UI.stall === 'bedesten') render();
        } else if (msg.type === 'wheel_spin' && (msg.from || msg.handle) !== ((S && S.handle) || '@ejder_ocagi')) {
          MP.lastWheelSpin = msg;
          const rTitle = msg.rewardTitle || msg.prize || '+350 Altın Kesesi';
          const sender = msg.from || msg.handle || '@gezgin';
          toast(`<b>Kader Çarkı (${esc(sender)}):</b> <b>${esc(rTitle)}</b> kazandı!`);
          if (typeof onRemoteLootWheelSpin === 'function') {
            onRemoteLootWheelSpin({ handle: sender, prize: rTitle, badge: msg.rewardKind || msg.badge || 'ÇARK' });
          } else if (typeof SHM !== 'undefined' && SHM.open && SHM.screen === 'victory' && typeof renderSahmeranApp === 'function') {
            renderSahmeranApp();
          }
        } else if (msg.type === 'dungeon_coop_sync' && msg.from !== ((S && S.handle) || '@ejder_ocagi')) {
          MP.coopPeers[msg.from] = msg;
          if (typeof onRemoteDungeonCoopSync === 'function') onRemoteDungeonCoopSync(msg);
        } else if (msg.type === 'pvp_sync' && msg.from !== ((S && S.handle) || '@ejder_ocagi')) {
          MP.pvpPeers[msg.from] = msg;
          if (typeof onRemoteTopcuPvpSync === 'function') onRemoteTopcuPvpSync(msg);
        } else if (msg.type === 'chat' && msg.entry) {
          MP.chatLog.push(msg.entry);
          if (MP.chatLog.length > 30) MP.chatLog.shift();
          if (UI.view === 'meydan') render();
        } else if (msg.type === 'boss_state' && msg.worldBoss) {
          MP.worldBoss = msg.worldBoss;
          if (UI.view === 'meydan') render();
        } else if (msg.type === 'caravans_update' && msg.caravans) {
          MP.caravans = msg.caravans;
          if (UI.view === 'meydan') render();
        } else if (msg.type === 'duel_cheer' && typeof FT !== 'undefined' && FT && !FT.F.over) {
          applySpectatorReaction(msg.kind, msg.from);
        } else if (msg.type === 'codex_new' && msg.item && S) {
          S.codex = S.codex || {};
          S.codex[msg.item.hash] = msg.item;
        } else if (msg.type === 'hub_actor' && S && msg.handle !== (S.handle || '@ejder_ocagi')) {
          if (!S.hub && typeof ensureHub === 'function') ensureHub();
          if (!S.hub) return;
          const idx = S.hub.peers.findIndex(p => p.handle === msg.handle);
          if (idx >= 0) {
            S.hub.peers[idx].isLive = true;
            if (msg.x != null) S.hub.peers[idx].x = msg.x;
            if (msg.y != null) S.hub.peers[idx].y = msg.y;
            if (msg.pose) S.hub.peers[idx].pose = msg.pose;
            if (msg.chat) S.hub.peers[idx].chat = msg.chat;
            if (msg.d) S.hub.peers[idx].d = msg.d;
            if (msg.chibi) S.hub.peers[idx].chibi = msg.chibi;
            if (typeof CITY_ROAM !== 'undefined' && CITY_ROAM['peer_' + idx]) {
              if (msg.x != null) CITY_ROAM['peer_' + idx].tx = msg.x;
              if (msg.y != null) CITY_ROAM['peer_' + idx].ty = msg.y;
            }
          } else if (msg.d) {
            S.hub.peers.push({ handle: msg.handle, guild: 'Gezgin Ocak', title: 'Ocak Ustası', x: msg.x || 45, y: msg.y || 55, pose: msg.pose || 'P1', chat: msg.chat || 'Selam!', studFee: 95, isLive: true, d: msg.d, chibi: msg.chibi || null });
          }
          if (UI.view === 'meydan' && msg.chat) render();
        } else if (msg.type === 'raid_event' && msg.raid) {
          MP.myRaids = MP.myRaids || [];
          MP.myRaids.unshift(msg.raid);
          if (S && msg.raid.target === (S.handle || '@ejder_ocagi')) {
            toast(`<b>Kervan Baskını!</b> ${esc(msg.raid.attacker)} kervanına saldırdı (${msg.raid.won ? 'Püskürtüldü/Yağmalandı' : 'Savunuldu'})!`, 'warn');
          }
          if (UI.view === 'meydan') render();
        } else if (msg.type === 'match_start' && msg.match) {
          MP.liveMatches = MP.liveMatches || [];
          MP.liveMatches.unshift(msg.match);
          if (MP.liveMatches.length > 8) MP.liveMatches.pop();
          if (UI.view === 'meydan' && UI.hubTab === 'canli') render();
        } else if ((msg.type === 'dm_msg' || msg.type === 'party_invite' || msg.type === 'party_reply' || msg.type === 'social_invite') && typeof socialOnNet === 'function') {
          socialOnNet(msg);
        } else if (msg.type === 'pageant_update' && msg.entries && S && S.hub) {
          S.hub.pageant = msg.entries;
          if (UI.view === 'meydan' && UI.hubTab === 'podyum') render();
        }
      } catch (e) {}
    };
    ws.onclose = () => {
      MP.connected = false;
      if (MP._pingTimer) { clearInterval(MP._pingTimer); MP._pingTimer = null; }
      if (MP.staticServer) return;
      if (MP._reconTimer) clearTimeout(MP._reconTimer);
      MP._reconTimer = setTimeout(() => {
        if (!MP.connected && !MP.staticServer) mpConnect();
      }, 8000);
    };
    if (!MP.bc && typeof BroadcastChannel !== 'undefined') {
      try {
        MP.bc = new BroadcastChannel('ejder_ocagi_v23_live');
        MP.bc.onmessage = ev => {
          if (MP.ws && MP.ws.readyState === 1) return; // WebSocket already handles live sync when connected
          if (ws.onmessage) ws.onmessage({ data: JSON.stringify(ev.data) });
        };
      } catch (e) {}
    }
  } catch (e) {}
}

function mpSendWs(obj) {
  if (obj && !obj.chibi && typeof ensureChibi === 'function' && (obj.type === 'hub_actor' || obj.type === 'hub_update' || obj.type === 'pvp_sync' || obj.type === 'dungeon_coop_sync')) {
    try { obj.chibi = ensureChibi(); } catch (e) {}
  }
  if (MP.ws && MP.ws.readyState === 1) {
    try { MP.ws.send(JSON.stringify(obj)); } catch (e) {}
  }
  if (MP.bc && !(obj && ['duel_invite', 'duel_invite_reply', 'duel_action', 'duel_leave'].includes(obj.type))) {
    try { MP.bc.postMessage(obj); } catch (e) {}
  }
}

function mpSyncState() {
  if (!S || typeof fetch === 'undefined' || MP.staticServer || !MP.connected) return Promise.resolve(false);
  if (MP.authHandle) S.handle = MP.authHandle;
  S.xVerified = !!XAUTH.handle;
  const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');
  const baseHttp = isHttp ? location.origin : 'http://localhost:3000';
  const star = byId(S.star) || S.dragons[0];
  const defBonus = typeof calcOcakDefenseBonus === 'function' ? calcOcakDefenseBonus().total : 12;
  return fetch(`${baseHttp}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle: S.handle || '@ejder_ocagi',
      verified: !!S.xVerified,
      guild: S.guild || 'Kızıl Ocak Birliği',
      un: S.un || 0,
      wins: (S.st && S.st.wins) || 0,
      defenseBonus: defBonus,
      star: star || null,
      duelFighter: star && typeof fighterFromDragon === 'function' ? { ...fighterFromDragon(star), seasonMult: typeof seasonMult === 'function' ? seasonMult(star.el) : 1 } : null,
      chibi: typeof ensureChibi === 'function' ? ensureChibi() : null,
      codex: S.codex || {},
      regionCount: S.regionCount || {},
    }),
  }).catch(() => {});
}

function mpSendCaravan(action, extra = {}) {
  if (!S || typeof fetch === 'undefined') return;
  const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');
  const baseHttp = isHttp ? location.origin : 'http://localhost:3000';
  fetch(`${baseHttp}/api/caravans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      handle: S.handle || '@ejder_ocagi',
      attacker: S.handle || '@ejder_ocagi',
      guild: S.guild || 'Kızıl Ocak Birliği',
      ...extra,
    }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.caravans) MP.caravans = res.caravans;
    })
    .catch(() => {});
}

function mpRecordBossHit(star, dmg) {
  if (typeof fetch === 'undefined') return;
  const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');
  const baseHttp = isHttp ? location.origin : 'http://localhost:3000';
  fetch(`${baseHttp}/api/boss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle: (S && S.handle) || '@ejder_ocagi',
      guild: (S && S.guild) || 'Kızıl Ocak Birliği',
      dName: star ? star.name : 'Kor',
      dmg,
    }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.worldBoss) {
        MP.worldBoss = res.worldBoss;
        if (UI.view === 'meydan') render();
      }
    })
    .catch(() => {});
}

function mpRecordRaid(targetHandle, targetDragon, myDragon, won, goldStolen, revengeId) {
  if (typeof fetch === 'undefined') return;
  const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');
  const baseHttp = isHttp ? location.origin : 'http://localhost:3000';
  fetch(`${baseHttp}/api/raid-ocak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attacker: (S && S.handle) || '@ejder_ocagi',
      attackerDragon: myDragon,
      target: targetHandle,
      targetDragon,
      won,
      goldStolen,
      revengeId: revengeId || null,
    }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.raidLog) MP.myRaids = res.raidLog;
    })
    .catch(() => {});
}

/* ============ ORİJİNAL DÖVÜŞ MOTORU (fightModal) ÜZERİNDE ÇOK OYUNCULU DÜELLO VE SEYİRCİ TRİBÜNÜ ============ */

function chooseGuardianMove(ef, pf, preset, round) {
  const ai = preset || { opener: 'kukre', lowHpPct: 40, lowHpAct: 'savun' };
  if (round === 1 && ai.opener) {
    if (ai.opener === 'nefes' && ef.sta >= NEFES_COST) return 'nefes';
    if (ai.opener === 'kukre' && !pf.weak && ef.sta >= 15) return 'kukre';
    if (ai.opener === 'pence') return 'pence';
  }
  const hpPct = (ef.hp / ef.maxHp) * 100;
  if (hpPct <= (ai.lowHpPct || 40)) {
    if (ai.lowHpAct === 'card') {
      const avail = (ef.cards || []).find(c => !(ef.used || []).includes(c));
      if (avail) return 'card:' + avail;
    }
    if (ai.lowHpAct === 'savun') return 'savun';
  }
  return _origAiChoose(ef, pf);
}

// Orijinal aiChoose fonksiyonunu Ocak Muhafızı taktik parşömenini destekleyecek şekilde genişlet
const _origAiChoose = typeof aiChoose === 'function' ? aiChoose : () => 'pence';
if (typeof aiChoose === 'function') {
  aiChoose = function(e, p) {
    if (typeof FT !== 'undefined' && FT && FT.peer && FT.peer.d && FT.peer.d.aiPreset) {
      return chooseGuardianMove(e, p, FT.peer.d.aiPreset, (FT.F && FT.F.round) || 1);
    }
    return _origAiChoose(e, p);
  };
}

function buildOppFromPeer(peer) {
  const pd = peer.d;
  return {
    id: pd.id || 'mp_' + peer.handle,
    name: pd.name || 'Bora',
    trainer: peer.handle || '@gezgin',
    arch: peer.guild || 'Ocak Muhafızı',
    sex: pd.sex || 'M',
    stage: pd.stage || 'yetiskin',
    el: pd.el || 'ates',
    hybrid: pd.hybrid || null,
    eye: pd.eye || 'N',
    horn: pd.horn || 'k',
    pat: pd.pat || 'd',
    st: { ...(pd.st || { gu: 48, ce: 46, da: 48, ze: 44 }) },
    gear: { atk: 6, def: Math.round((peer.defenseBonus || 12) * 0.5), hp: Math.round((peer.defenseBonus || 12) * 1.2) },
    traits: pd.traits || ['kor'],
    cards: pd.cards || (pd.hybrid && HYBRID_MAP[pd.hybrid] ? [HYBRID_MAP[pd.hybrid].card] : [EL_CARD[pd.el || 'ates']]),
    genes: pd.genes || randomGenes({ el: pd.el || 'ates' }),
    cos: pd.cos || {},
    hue: pd.hue || 0,
    chibi: typeof peerChibiConfig === 'function' ? peerChibiConfig(peer) : null,
  };
}

function startLiveDuelRoom(myD, peer, opts = {}) {
  if (!myD || !peer) return;
  const opp = buildOppFromPeer(peer);
  const pf = fighterFromDragon(myD);
  const ef = fighterFromOpp(opp);
  const F = newFight(pf, ef);
  const specCount = Math.max(2, (MP.onlineCount || 1) + ri(2, 5));
  const label = opts.mode === 'caravan' ? 'Kervan Baskını' : opts.mode === 'revenge' ? 'Husumet Rövanşı' : 'Er Meydanı';

  FT = {
    F,
    d: myD,
    opp,
    peer,
    mpOpts: opts,
    spectators: specCount,
    mode: 'mp',
    tier: opts.mode === 'caravan' ? 'sehir' : 'koy',
    lethal: false,
    log: [{ t: `<b>${esc(label)}:</b> ${esc(myD.name)} ile ${esc(peer.handle)} ocağından <b>${esc(opp.name)}</b> karşı karşıya! (${specCount} ocak tribünde izliyor)`, c: 'mute' }],
    title: `${label} · ${peer.handle} (${opp.name})`,
  };
  if (typeof pipReset === 'function') pipReset();
  mpSendWs({ type: 'match_start', pHandle: S.handle || '@ejder_ocagi', pName: myD.name, eHandle: peer.handle, eName: opp.name });
  fightModal();
  SFX.play('roar');
}

function finishMpFight() {
  const { F, d, opp, peer, mpOpts } = FT;
  const won = F.winner === 'p';
  const drawn = F.winner == null;
  const opts = mpOpts || {};
  FT.result = [];
  // ENG-10: ödüllü odada ödül YALNIZ sunucudadır (duel_settlement). Yerel altın/ün/taş/bağ yazılmaz;
  // savaşçı sunucu defterinin kopyasıdır, yerel ejderhaya dokunulmaz.
  if (opts.ranked) {
    FT.result.push(drawn ? '<b>Berabere!</b>' : won ? `<b class="good">${esc(peer.handle)} ocağından ${esc(opp.name)} mağlup edildi!</b>` : (F.surrender ? 'Meydandan çekildin.' : `<span class="bad">${esc(opp.name)} bu karşılaşmadan üstün çıktı.</span>`));
    FT.result.push('<span data-settle class="mute">Ödül sunucuda kesinleşiyor…</span>');
    return;
  }
  d.fat = clamp(d.fat + 10, 0, 100);

  const wEv = typeof currentWorldEvent === 'function' ? currentWorldEvent() : { raidMult: 1 };
  const divanMult = (typeof ensureDivan === 'function' && ensureDivan().active === 'gladyator') ? 1.35 : 1;
  const baseGold = opts.rewardGold || 85;
  const totalGold = Math.round(baseGold * (wEv.raidMult || 1) * divanMult) + (won && FT.bet ? FT.bet * 2 : 0);

  if (drawn) {
    S.gold += 35;
    FT.result.push('<b>Berabere!</b> İki ejderha da meydandan sağ çıktı. +35 altın.');
  } else if (won) {
    S.gold += totalGold;
    S.un += 3;
    d.w = (d.w || 0) + 1;
    S.st.wins++;
    addBond(d, 2);
    if (opts.foodReward && S.food[opts.foodReward] != null) S.food[opts.foodReward] += 2;
    const evolved = typeof addHeirloomXp === 'function' ? addHeirloomXp(d, 1) : null;
    FT.result.push(`<b class="good">${esc(peer.handle)} ocağından ${esc(opp.name)} mağlup edildi!</b> +${totalGold} altın, +3 ün.`);
    if (typeof awardChibiStones === 'function') {
      const gotMpStones = awardChibiStones({ stones: { kor_t2: ri(2, 4) } });
      if (gotMpStones.length) FT.result.push(`<b class="good">Er Meydanı Düello Ganimeti:</b> ${gotMpStones.join(', ')}.`);
    }
    if (opts.foodReward && FOODS[opts.foodReward]) FT.result.push(`Ganimet sandığından <b>+2 ${FOODS[opts.foodReward].ad}</b> çıktı.`);
    if (evolved) FT.result.push(`<b class="good">Ata Yadigârı Seviye ${evolved.lv} oldu!</b>`);
    setTimeout(() => FX.coins(innerWidth / 2, innerHeight / 2), 800);
  } else {
    d.l = (d.l || 0) + 1;
    S.st.losses++;
    S.gold += 20;
    FT.result.push(F.surrender ? 'Meydandan çekildin.' : `<span class="bad">${esc(opp.name)} bu karşılaşmadan üstün çıktı. Teselli: +20 altın.</span>`);
  }
  if (!opts.serverRoom) mpRecordRaid(peer.handle, opp.name, d.name, won, totalGold, opts.revengeId);
  chron(`${d.name}, ${peer.handle} ocağından ${opp.name} ile kapıştı (${won ? `Zafer: +${totalGold} altın` : 'Yenilgi'}).`);
  saveGame();
}

function doneMpFight() {
  if (FT && FT.mpOpts && FT.mpOpts.serverRoom && FT.mpRoomId) mpSendWs({ type: 'duel_leave', roomId: FT.mpRoomId });
  FT = null;
  afterAction(true);
  closeModal();
}

/* ---------- Canlı Seyirci Tepkisi (Orijinal showPip Çizgi Roman Paneliyle) ---------- */
function applySpectatorReaction(kind, fromHandle) {
  if (typeof FT === 'undefined' || !FT || !FT.F || FT.F.over) return;
  const { F } = FT;
  const who = fromHandle || '@kuzey_ruzgari';
  if (kind === 'cheer') {
    F.p.sta = Math.min(100, F.p.sta + 15);
    F.p.fury = Math.max(F.p.fury || 0, 1);
    const fxt = `${esc(who)} tribünden destek verdi: nefes +15`;
    if (typeof showPip === 'function' && typeof PIP !== 'undefined') {
      const P = PIP.find(x => x.id === 'cosku') || PIP[0];
      showPip(P, `${who}: "Vur pençeni, meydan senin!"`, P.bg, fxt);
    }
    if (typeof setBars === 'function') setBars('p', fsnap(F).p, F);
  } else if (kind === 'boo') {
    F.e.weak = Math.max(F.e.weak || 0, 1);
    const fxt = `${esc(who)} rakibi ıslıkladı: rakip sarsıldı`;
    if (typeof showPip === 'function' && typeof PIP !== 'undefined') {
      const P = PIP.find(x => x.id === 'yuha') || PIP[1];
      showPip(P, `${who}: "Yuuuh! O kalkan delinir!"`, P.bg, fxt);
    }
  }
}

/* ---------- Başka Oyuncuların Canlı Maçını İzleme Modu (Orijinal fightModal İçinde) ---------- */
function ensureLiveMatches() {
  if (!S) return [];
  const H = typeof ensureHub === 'function' ? ensureHub() : { peers: [] };
  const p0 = H.peers[0] || { handle: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', d: marketDragon(0.4) };
  const p1 = H.peers[1] || { handle: '@leydi_sureyya', guild: 'İnci Hanedanı', d: marketDragon(0.45) };
  const p2 = H.peers[2] || { handle: '@altin_kervan', guild: 'Tuz Tacirleri', d: marketDragon(0.38) };
  return [
    {
      id: 'lm_1',
      title: 'Kervansaray Baş Meydanı',
      spectators: 6 + (MP.onlineCount || 1),
      pPeer: p0,
      ePeer: p1,
    },
    {
      id: 'lm_2',
      title: 'İpek Geçidi Sancak Düellosu',
      spectators: 4 + (MP.onlineCount || 1),
      pPeer: p2,
      ePeer: p0,
    },
  ];
}

function startSpectateMatch(matchIndex = 0) {
  const list = ensureLiveMatches();
  const M = list[matchIndex] || list[0];
  if (!M) return;
  const d1 = buildOppFromPeer(M.pPeer);
  const d2 = buildOppFromPeer(M.ePeer);
  const F = newFight(fighterFromOpp(d1), fighterFromOpp(d2));

  FT = {
    F,
    d: d1,
    opp: d2,
    mode: 'spectate',
    spectating: true,
    spectators: M.spectators,
    cheersUsed: 0,
    bet: 0,
    tier: 'sehir',
    lethal: false,
    log: [{ t: `<b>Canlı Tribün:</b> ${esc(M.pPeer.handle)} (${esc(d1.name)}) ile ${esc(M.ePeer.handle)} (${esc(d2.name)}) kapışmasını izliyorsun.`, c: 'mute' }],
    title: `Canlı Yayın · ${M.pPeer.handle} vs ${M.ePeer.handle}`,
    specTimer: null,
  };
  if (typeof pipReset === 'function') pipReset();
  fightModal();
  SFX.play('horn');
  scheduleNextSpectateTurn();
}

function scheduleNextSpectateTurn() {
  if (typeof FT === 'undefined' || !FT || FT.mode !== 'spectate' || FT.F.over) return;
  if (FT.specTimer) clearTimeout(FT.specTimer);
  FT.specTimer = setTimeout(() => {
    if (!FT || FT.mode !== 'spectate' || FT.F.over) return;
    if (FT.pre) {
      scheduleNextSpectateTurn();
      return;
    }
    const pMove = chooseGuardianMove(FT.F.p, FT.F.e, null, FT.F.round);
    fightAction(pMove);
    if (!FT.F.over) scheduleNextSpectateTurn();
  }, 3400);
}

function finishSpectateFight() {
  const { F, d, opp } = FT;
  if (FT.specTimer) { clearTimeout(FT.specTimer); FT.specTimer = null; }
  const won = F.winner === 'p';
  FT.result = [`<b>${esc(won ? d.name : opp.name)}</b> karşılaşmayı kazandı!`];
  if (FT.bet) {
    if (won) {
      const prize = FT.bet * 2;
      S.gold += prize;
      FT.result.push(`<b class="good">Tribün bahsin tuttu: +${prize} altın kazandın!</b>`);
      setTimeout(() => FX.coins(innerWidth / 2, innerHeight / 2), 600);
    } else {
      FT.result.push(`<span class="mute">Yatırdığın ${FT.bet} altın bahis karşı tarafa geçti.</span>`);
    }
    saveGame();
  }
}

function ensureGuard(d) {
  if (!d) return;
  if (!d.aiPreset) {
    d.aiPreset = {
      opener: 'kukre',
      lowHpPct: 40,
      lowHpAct: 'savun',
      preferHybrid: true,
    };
  }
  return d.aiPreset;
}

function encodeChallengeCard(d) {
  if (!d) return '';
  const payload = {
    v: 2,
    h: (S && S.handle) || '@ejder_ocagi',
    g: (S && S.guild) || 'Kızıl Ocak Birliği',
    n: d.name,
    s: d.sex,
    el: d.el,
    hy: d.hybrid || null,
    st: d.st,
    gn: d.genes,
    tr: d.traits || [],
    cd: d.cards || [],
    cs: d.cos || {},
    ai: d.aiPreset || { opener: 'kukre', lowHpPct: 40, lowHpAct: 'savun' },
  };
  try {
    return 'EO2-' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch (e) {
    return '';
  }
}

function decodeChallengeCard(code) {
  try {
    const clean = (code || '').trim().replace(/^EO2-/, '');
    const obj = JSON.parse(decodeURIComponent(escape(atob(clean))));
    if (!obj || !obj.n || !obj.st) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function mpCardModal() {
  UI.modalRedraw = mpCardModal;
  ensureStar();
  const d = byId(UI.sel) || byId(S.star) || S.dragons[0];
  if (d) ensureGuard(d);
  const code = d ? encodeChallengeCard(d) : '';
  const elInfo = d ? fullEleganceCalc(d) : null;
  const ai = d ? d.aiPreset : null;
  const shareUrl = `${MP.serverUrl}/share/${encodeURIComponent((S && S.handle) || '@ejder_ocagi')}`;

  showModal(`<div class="parch mp-modal">
    <p class="kicker">Ocak Künyesi · Muhafız Parşömeni · Meydan Okuma</p>
    <h2>Ocak Birliği ve Paylaşım</h2>
    <div class="mp-grid">
      <div class="mp-card-preview" id="mp-card-visual">
        <div class="mp-card-head">
          <span class="mp-handle">${esc(S.handle || '@ejder_ocagi')}</span>
          <span class="mp-guild">${esc(S.guild || 'Kızıl Ocak Birliği')}</span>
        </div>
        ${d ? `
          <div class="mp-card-art mp-duo-art">${typeof renderChibiDoll === "function" ? `<div class="mp-chibi-side" data-a="chibi-open" title="Kuşanma Vitrinini Aç">${renderChibiDoll(null, { cls: "mp-doll" })}</div>` : ""}<div class="mp-dr-side">${dragonSVG(d)}</div></div>
          <h3>${esc(d.name)} ${sexIc(d.sex)} ${d.hybrid && HYBRID_MAP[d.hybrid] ? `<span class="trait sm"><b>${HYBRID_MAP[d.hybrid].ad}</b></span>` : elChip(d.el)}</h3>
          <p class="sm mute">${phenoTitle(d)} · ${d.gen}. Kuşak · Zarafet <b>${elInfo ? elInfo.total : 0}</b></p>
          <div class="pstats">${STATS.map(k => `<span>${ST_KISA[k]}<b>${d.st[k]}</b></span>`).join('')}</div>
        ` : '<p class="mute">Ejderha yok</p>'}
        <div style="margin-top:8px;font-size:11.5px;color:${MP.connected ? '#7cc674' : '#d4a070'}">
          ${MP.connected ? `Canlı Sunucuya Bağlı (${MP.onlineCount} Ocak)` : 'Yerel / Davet Kodu Modu'}
        </div>
      </div>

      <div class="mp-controls">
        <h4>1. Ocak Mahlası ve Birliğin</h4>
        <div class="mp-inputs">
          <label>Mahlas <input id="mp-handle-in" value="${esc(S.handle || '@ejder_ocagi')}" maxlength="24"></label>
          <label>Birlik <input id="mp-guild-in" value="${esc(S.guild || 'Kızıl Ocak Birliği')}" maxlength="28"></label>
          <button class="btn sm primary" data-a="mp-save-profile">Kaydet</button>
          <button class="btn sm ${S.xVerified ? 'ghost' : 'primary'}" data-a="mp-x-oauth">${S.xVerified ? 'X Hesabı Bağlı' : 'X Hesabını Bağla'}</button>
        </div>

        ${d ? `
          <h4>2. Ocak Muhafızı Taktik Parşömeni (${esc(d.name)})</h4>
          <p class="mute sm">Sen yokken ocağına gelen rakiplere karşı muhafız ejderhanın uygulayacağı savaş nizamı:</p>
          <div class="mp-ai-rules">
            <div>
              <span>İlk Hamle:</span>
              ${[['kukre', 'Kükre'], ['nefes', 'Element Nefesi'], ['pence', 'Pençe']].map(([k, lbl]) => `<button class="btn ghost sm ${ai.opener === k ? 'on' : ''}" data-a="mp-ai" data-f="opener" data-v="${k}">${lbl}</button>`).join('')}
            </div>
            <div>
              <span>Can Azaldığında:</span>
              ${[['savun', 'Savunmaya Geç'], ['card', 'Yetenek Kartı Aç']].map(([k, lbl]) => `<button class="btn ghost sm ${ai.lowHpAct === k ? 'on' : ''}" data-a="mp-ai" data-f="lowHpAct" data-v="${k}">${lbl}</button>`).join('')}
            </div>
          </div>

          <h4>3. Davet Bağlantısı ve Meydan Okuma Kodu</h4>
          <p class="mute sm">Paylaşım Bağlantısı: <code>${esc(shareUrl)}</code></p>
          <textarea id="mp-code-out" readonly rows="2" class="mp-code">${code}</textarea>
          <div class="mp-share-btns">
            <button class="btn sm primary" data-a="mp-copy-code">Kodu Kopyala</button>
            <button class="btn sm ghost" data-a="mp-tweet">X Üzerinde Paylaş</button>
          </div>
        ` : ''}

        <h4>4. Rakip Ocak Koduyla Er Meydanına Çık</h4>
        <div class="mp-import">
          <input id="mp-code-in" placeholder="EO2-... kodunu buraya yapıştır">
          <button class="btn primary sm" data-a="mp-fight-code">Meydan Oku</button>
        </div>
      </div>
    </div>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div>
  </div>`, 'paper wide');
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    mpCheckUrlParams();
    mpConnect();
  }, 400);
}

const NET_ACT = {
  'x-login'() {
    location.href = '/api/auth/x/login';
  },
  'x-logout'() {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => {
      XAUTH.handle = null;
      if (S) S.xVerified = false;
      if (typeof saveGame === 'function' && S) saveGame();
      render();
    });
  },
  'mp-card'() {
    pushModal(mpCardModal);
  },
  'mp-reconnect'() {
    mpConnect();
    toast('Sunucuya bağlanılıyor...');
  },
  'mp-x-oauth'() {
    // Gerçek X OAuth 2.0 akışı: sunucu X'e yönlendirir, callback'te handle'ı doğrular
    if (!MP.connected) {
      toast('<b>X girişi için canlı sunucuya bağlı olmalısın</b><br>Sayfayı yenileyip tekrar dene.');
      return;
    }
    location.href = '/api/auth/x/login';
  },
  'mp-save-profile'() {
    const h = ($('#mp-handle-in')?.value || '').trim();
    const g = ($('#mp-guild-in')?.value || '').trim();
    if (h) {
      const nh = h.startsWith('@') ? h : '@' + h;
      // Doğrulanmış X hesabından farklı bir mahlas seçilirse doğrulama düşer
      if (S.xVerified && nh.toLowerCase() !== String(S.handle || '').toLowerCase()) S.xVerified = false;
      S.handle = MP.authHandle || nh;
    }
    if (g) S.guild = g;
    saveGame();
    mpSyncState();
    SFX.play('coin');
    toast(`Künye güncellendi: <b>${esc(S.handle)}</b> · ${esc(S.guild)}`);
    mpCardModal();
  },
  'mp-ai'(el) {
    const d = byId(UI.sel) || byId(S.star) || S.dragons[0];
    if (!d) return;
    ensureGuard(d);
    d.aiPreset[el.dataset.f] = el.dataset.v;
    saveGame();
    mpSyncState();
    SFX.play('click');
    mpCardModal();
  },
  'mp-copy-code'() {
    const el = $('#mp-code-out');
    if (el) {
      el.select();
      navigator.clipboard?.writeText(el.value).catch(() => {});
      SFX.play('coin');
      toast('Meydan okuma kodu panoya kopyalandı.');
    }
  },
  'mp-tweet'() {
    const d = byId(UI.sel) || byId(S.star) || S.dragons[0];
    if (!d) return;
    const shareUrl = `${MP.serverUrl}/share/${encodeURIComponent((S && S.handle) || '@ejder_ocagi')}`;
    const txt = `Ejder Ocağı'nda ${d.name} (${phenoTitle(d)}, Zarafet: ${fullEleganceCalc(d).total}) ile meydandayım!`;
    navigator.clipboard?.writeText(`${txt} ${shareUrl}`).catch(() => {});
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,width=600,height=420');
    }
    toast(`<b>Paylaşım Penceresi Açıldı</b>`);
  },
  'mp-fight-code'() {
    const raw = ($('#mp-code-in')?.value || '').trim();
    const data = decodeChallengeCard(raw);
    if (!data) {
      SFX.play('error');
      toast('Geçersiz meydan okuma kodu! EO2- ile başlayan kodu tam yapıştır.');
      return;
    }
    const myD = byId(UI.sel) || byId(S.star) || S.dragons[0];
    if (!myD) return;
    const fakePeer = {
      handle: data.h,
      guild: data.g || 'Gezgin Ocak',
      title: 'Meydan Okuyan',
      d: {
        name: data.n,
        sex: data.s || 'M',
        stage: 'yetiskin',
        el: data.el || 'ates',
        hybrid: data.hy || null,
        st: data.st,
        genes: data.gn || randomGenes({ el: data.el || 'ates' }),
        traits: data.tr || [],
        cards: data.cd || [],
        aiPreset: data.ai || { opener: 'kukre', lowHpPct: 40, lowHpAct: 'savun' },
      },
    };
    closeModal();
    pushModal(() => startLiveDuelRoom(myD, fakePeer, { mode: 'x_code', rewardGold: 95 }));
  },
  'spec-watch'(el) {
    const idx = +el.dataset.i || 0;
    pushModal(() => startSpectateMatch(idx));
  },
  'spec-cheer'(el) {
    if (typeof FT === 'undefined' || !FT || FT.F.over || (FT.cheersUsed || 0) >= 2) return;
    FT.cheersUsed = (FT.cheersUsed || 0) + 1;
    const kind = el.dataset.k;
    applySpectatorReaction(kind, S.handle || '@sen');
    mpSendWs({ type: 'duel_cheer', kind, from: S.handle || '@ejder_ocagi' });
    fightModal();
  },
  'spec-bet'() {
    if (typeof FT === 'undefined' || !FT || FT.F.over || FT.bet || S.gold < 40) return;
    S.gold -= 40;
    FT.bet = 40;
    SFX.play('coin');
    if (typeof showPip === 'function' && typeof PIP !== 'undefined') {
      const P = PIP.find(x => x.id === 'bahisci') || PIP[2];
      showPip(P, `${esc(FT.F.p.name)} üstüne 40 altın yazıldı!`, P.bg, 'Kazanırsa +80 altın alacaksın');
    }
    saveGame();
    fightModal();
  },
  'spec-leave'() {
    if (typeof FT !== 'undefined' && FT && FT.specTimer) clearTimeout(FT.specTimer);
    FT = null;
    closeModal();
  },
};
