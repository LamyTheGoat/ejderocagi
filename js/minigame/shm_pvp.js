/* ============================================================================
   EJDER TOPÇUSU — 1v1 & 2v2 PVP ARENA MOTORU VE SENKRONİZASYONU
   (js/minigame/shm_pvp.js)
   Harita modülleri: js/minigame/pvp_maps/map_*.js
   ============================================================================ */

const PVP_ARENA_MAPS = {};
const PVP_PRIMARY_MAP_IDS = [
  "steppe_canyon",
  "sky_archipelago",
  "sandstorm",
  "seljuk_ruins",
  "dragon_caldera",
  "glacier"
];

function registerPvpArenaMap(mapId, mapDef) {
  if (!mapId || !mapDef) return;
  mapDef.id = mapId;
  PVP_ARENA_MAPS[mapId] = mapDef;
  if (Array.isArray(mapDef.aliases)) {
    for (const aliasId of mapDef.aliases) {
      PVP_ARENA_MAPS[aliasId] = Object.assign({}, mapDef, { id: aliasId, hiddenInFilter: true });
    }
  }
}
if (typeof window !== "undefined") window.registerPvpArenaMap = registerPvpArenaMap;
if (typeof global !== "undefined") global.registerPvpArenaMap = registerPvpArenaMap;

const PVP_QUEUE_TIMEOUT_SEC = 90;

function pvpQueueSend(action, payload, to) {
  if (typeof mpSendWs !== "function") return;
  try {
    mpSendWs({
      type: "pvp_sync",
      action,
      from: (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi",
      to: to || null,
      roomId: "pvp_queue",
      mapId: (SHM.pvpQueueState && SHM.pvpQueueState.pickedMap) || SHM.pvpMap || "steppe_canyon",
      text: JSON.stringify(payload || {})
    });
  } catch (e) { /* ağ hatası: kuyruk 90 sn sonra botlu maça düşer */ }
}

function cancelPvpQueue(silent) {
  const q = SHM.pvpQueueState;
  if (SHM._pvpQueueTimer) { clearInterval(SHM._pvpQueueTimer); SHM._pvpQueueTimer = null; }
  if (q) pvpQueueSend("queue_leave", { mode: q.mode });
  SHM.pvpQueueState = null;
  if (!silent && typeof renderSahmeranApp === "function") renderSahmeranApp();
}

function pvpLaunchMatch(mapId, mode, opts = {}) {
  if (SHM._pvpQueueTimer) { clearInterval(SHM._pvpQueueTimer); SHM._pvpQueueTimer = null; }
  SHM.pvpQueueState = null;
  SHM.pvpTeamMode = mode;
  SHM.pvpMap = mapId;
  const isAutomatedTest = typeof window !== "undefined" && (window.__fastFx || window.__noCuts);
  SHM.vsSplashActive = !isAutomatedTest;
  if (SHM._vsSplashTimer) clearTimeout(SHM._vsSplashTimer);
  if (SHM.vsSplashActive) {
    SHM._vsSplashTimer = setTimeout(() => {
      SHM.vsSplashActive = false;
      const el = typeof document !== "undefined" ? document.getElementById("shmPvpVsSplash") : null;
      if (el) el.remove();
    }, 2500);
  }
  // Eşleşen gerçek oyuncuları canlı rakip/müttefik sırasının başına al
  if (opts.matched && opts.matched.length && typeof MP !== "undefined") {
    const old = MP.pvpPeers || {};
    const ordered = {};
    opts.matched.forEach(h => { ordered[h] = old[h] || { from: h }; });
    Object.keys(old).forEach(h => { if (!ordered[h]) ordered[h] = old[h]; });
    MP.pvpPeers = ordered;
  }
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("powerup_arm");
  SHM.gameMode = "pvp";
  SHM.entryContext = "pvp_arena";
  SHM.screen = "battle";
  initTopcuPvpStage(mapId, mode);
  renderSahmeranApp();
}

function pvpQueueTick() {
  const q = SHM.pvpQueueState;
  if (!q || !SHM.open) { cancelPvpQueue(true); return; }
  q.elapsedSec = Math.floor((Date.now() - q.startedAt) / 1000);
  const now = Date.now();
  Object.keys(q.peers).forEach(h => { if (now - q.peers[h] > 14000) delete q.peers[h]; });
  if (q.elapsedSec > 0 && q.elapsedSec % 5 === 0 && q.lastPing !== q.elapsedSec) {
    q.lastPing = q.elapsedSec;
    pvpQueueSend("queue_join", { mode: q.mode });
  }
  if (q.elapsedSec >= PVP_QUEUE_TIMEOUT_SEC) {
    const { pickedMap, mode } = q;
    cancelPvpQueue(true);
    if (typeof toast === "function") toast(`⏱️ ${PVP_QUEUE_TIMEOUT_SEC} saniyede rakip bulunamadı. Botlu maça geçiliyor.`, "bad");
    pvpLaunchMatch(pickedMap, mode);
    return;
  }
  pvpQueueTryHost();
  const el = typeof document !== "undefined" ? document.getElementById("shmPvpQueueTimer") : null;
  if (el) el.textContent = pvpFmtQueueTime(q.elapsedSec);
}

function pvpFmtQueueTime(sec) {
  const s = Math.max(0, sec | 0);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Eşleşme kurucusu: katılımcılar arasında alfabetik olarak en küçük handle maçı başlatır.
function pvpQueueTryHost() {
  const q = SHM.pvpQueueState;
  if (!q) return;
  const need = q.mode === "2v2" ? 4 : 2;
  const me = (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
  const peers = Object.keys(q.peers);
  if (peers.length < need - 1) return;
  const group = [me].concat(peers.sort()).slice(0, need);
  if (group.slice().sort()[0] !== me) return; // kurucu başkası, queue_start bekle
  const blue = q.mode === "2v2" ? group.slice(0, 2) : [group[0]];
  const red = q.mode === "2v2" ? group.slice(2, 4) : [group[1]];
  pvpQueueSend("queue_start", { mode: q.mode, map: q.pickedMap, members: group, blue, red });
  if (typeof toast === "function") toast("⚔️ <b>Rakip bulundu!</b> Maç başlıyor.", "goal");
  pvpLaunchMatch(q.pickedMap, q.mode, { matched: group.filter(h => h !== me) });
}

function onPvpQueueMessage(msg) {
  const q = SHM.pvpQueueState;
  const me = (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
  if (msg.to && msg.to !== me) return;
  let p = {};
  try { p = msg.text ? JSON.parse(msg.text) : {}; } catch (e) { p = {}; }
  if (msg.action === "queue_leave") {
    if (q) delete q.peers[msg.from];
    return;
  }
  if (!q) return;
  if (msg.action === "queue_join" || msg.action === "queue_offer") {
    if (p.mode !== q.mode) return;
    q.peers[msg.from] = Date.now();
    if (msg.action === "queue_join") pvpQueueSend("queue_offer", { mode: q.mode }, msg.from);
    pvpQueueTryHost();
  } else if (msg.action === "queue_start") {
    if (!Array.isArray(p.members) || !p.members.includes(me) || p.mode !== q.mode) return;
    pvpLaunchMatch(p.map || q.pickedMap, p.mode, { matched: p.members.filter(h => h !== me) });
  }
}

function queueQuickMatch(opts = {}) {
  cancelPvpQueue(true);
  const mode = opts.mode === "2v2" ? "2v2" : "1v1";
  const pool = PVP_PRIMARY_MAP_IDS;
  const pickedMap = (opts.map && opts.map !== "any" && PVP_ARENA_MAPS[opts.map])
    ? opts.map
    : pool[Math.floor(Math.random() * pool.length)];
  SHM.pvpTeamMode = mode;
  SHM.pvpMap = pickedMap;
  SHM.gameMode = "pvp";
  SHM.entryContext = "pvp_arena";
  SHM.pvpActiveRoom = null;
  SHM.pvpQueueState = {
    mode,
    map: opts.map || "any",
    pickedMap,
    startedAt: Date.now(),
    elapsedSec: 0,
    peers: {}
  };
  pvpQueueSend("queue_join", { mode });
  SHM._pvpQueueTimer = setInterval(pvpQueueTick, 1000);
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("powerup_arm");
  renderSahmeranApp();
}
if (typeof window !== "undefined") window.queueQuickMatch = queueQuickMatch;

/* ---------------- GERÇEK ODA / BEKLEME LOBİSİ YARDIMCILARI ---------------- */
const PVP_BOT_POOL = [
  { handle: "@bozkir_avcisi", name: "Bozkır Avcısı", el: "toprak", sub: "Toprak Yavrusu" },
  { handle: "@kuzey_ruzgari", name: "Kuzey Rüzgârı", el: "firtina", sub: "Fırtına Yavrusu" },
  { handle: "@kara_golge", name: "Kara Gölge", el: "golge", sub: "Gölge Yavrusu" }
];

function pvpSelfHandle() {
  return (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
}

// 1v1: [mavi, kırmızı] · 2v2: [mavi1, mavi2, kırmızı1, kırmızı2]
function pvpBuildSlots(mode, hostHandle, prevSlots) {
  const layout = mode === "2v2" ? ["blue", "blue", "red", "red"] : ["blue", "red"];
  const slots = layout.map((team, idx) => ({ idx, team, kind: "empty", handle: null, name: null, ready: false }));
  if (!Array.isArray(prevSlots)) {
    Object.assign(slots[0], { kind: "host", handle: hostHandle, name: hostHandle, ready: true });
    return slots;
  }
  ["blue", "red"].forEach(team => {
    const old = prevSlots.filter(s => s.team === team && s.kind !== "empty");
    const tgt = slots.filter(s => s.team === team);
    old.slice(0, tgt.length).forEach((o, i) => {
      const keep = Object.assign({}, o);
      delete keep.idx; delete keep.team;
      Object.assign(tgt[i], keep);
    });
  });
  return slots;
}

function pvpSyncRoomCounts(room) {
  if (!room) return;
  const cur = room.slots.filter(s => s.kind !== "empty").length;
  room.curPlayers = cur;
  room.maxPlayers = room.mode === "2v2" ? 4 : 2;
  const listed = (SHM.pvpRooms || []).find(r => r.id === room.id);
  if (listed) {
    listed.curPlayers = cur;
    listed.maxPlayers = room.maxPlayers;
    listed.mode = room.mode;
    listed.mapId = room.mapId;
  }
}

function pvpSetRoomMode(mode) {
  const room = SHM.pvpActiveRoom;
  SHM.pvpTeamMode = mode;
  if (!room || !room.isHost || room.mode === mode) return;
  room.mode = mode;
  room.slots = pvpBuildSlots(mode, room.host, room.slots);
  pvpSyncRoomCounts(room);
}

function pvpSetRoomMap(mapId) {
  SHM.pvpMap = mapId;
  const room = SHM.pvpActiveRoom;
  if (room && room.isHost && PVP_ARENA_MAPS[mapId]) {
    room.mapId = mapId;
    pvpSyncRoomCounts(room);
  }
}

function pvpFormationHtml(teamMode, mapObj, curMap, myDoll, eternalBaby, stInfo) {
  const room = SHM.pvpActiveRoom || null;
  const mode = room ? room.mode : teamMode;
  const isHost = !!(room && room.isHost);
  const selfHandle = pvpSelfHandle();
  const slots = room ? room.slots : pvpBuildSlots(mode, selfHandle);

  const slotHtml = (slot) => {
    const tIdx = slot.team === "blue"
      ? (slot.idx === 0 ? 1 : 2)
      : (mode === "2v2" && slot.idx === 3 ? 2 : 1);
    const lbl = `${slot.team === "blue" ? "MAVİ" : "KIRMIZI"} ${tIdx}`;
    const btnCss = "font-size:10px;padding:2px 7px;min-height:0;";
    if (slot.kind === "empty") {
      return `
        <div class="shm-pvp-fslot ${slot.team} empty">
          <span class="shm-fslot-badge ${slot.team}">${lbl} · BOŞ</span>
          <div class="shm-fslot-avatar"><div class="shm-fslot-lock">?</div></div>
          <b class="shm-fslot-name">BOŞ — OYUNCU BEKLENİYOR</b>
          ${isHost ? `
            <div class="shm-btn-row" style="gap:4px;justify-content:center;flex-wrap:wrap">
              <button class="btn ghost sm" style="${btnCss}" data-shm-slot-invite="${slot.idx}">➕ Arkadaş Çağır</button>
              <button class="btn good sm" style="${btnCss}" data-soc-lobby="pvp:${slot.idx}">📩 Arkadaşını Lobiye Çağır</button>
              <button class="btn primary sm" style="${btnCss}" data-shm-slot-bot="${slot.idx}">🤖 Bot Ekle</button>
            </div>` : `<small class="shm-fslot-sub">${room ? "Kurucu bekleniyor" : "Oda kur veya katıl"}</small>`}
        </div>`;
    }
    if (slot.kind === "host" || slot.kind === "self") {
      return `
        <div class="shm-pvp-fslot ${slot.team} ready">
          <span class="shm-fslot-badge ${slot.team}">${lbl} · SEN${slot.kind === "host" && room ? " (KURUCU)" : ""}</span>
          <div class="shm-fslot-avatar"><div class="shm-fslot-doll">${myDoll}</div></div>
          <b class="shm-fslot-name">${slot.handle || selfHandle}</b>
          <small class="shm-fslot-sub">${eternalBaby.name} · ${stInfo.totalFc} · HAZIR</small>
        </div>`;
    }
    const chibi = typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: slot.handle, name: slot.name, chibi: slot.chibi || null }, slot.idx) : null;
    const doll = typeof renderChibiDoll === "function"
      ? renderChibiDoll(chibi, { battle: true, hideAura: true, flip: slot.team === "red", el: slot.el || "ates" })
      : "";
    return `
      <div class="shm-pvp-fslot ${slot.team} ready" style="position:relative">
        <span class="shm-fslot-badge ${slot.team}">${lbl} · ${slot.kind === "bot" ? "BOT" : "OYUNCU"}</span>
        ${isHost ? `<button class="btn bad sm" style="position:absolute;top:4px;right:4px;${btnCss}z-index:3" data-shm-slot-kick="${slot.idx}">✕ Çıkar</button>` : ""}
        <div class="shm-fslot-avatar"><div class="shm-fslot-doll">${doll}</div></div>
        <b class="shm-fslot-name">${slot.name || slot.handle}</b>
        <small class="shm-fslot-sub">${slot.sub || "Topçu"} · ${slot.ready ? "HAZIR" : "BEKLİYOR"}</small>
      </div>`;
  };

  const lockedHtml = (team) => `
    <div class="shm-pvp-fslot ${team} locked">
      <span class="shm-fslot-badge ${team}">1v1 KAPALI</span>
      <div class="shm-fslot-avatar"><div class="shm-fslot-lock">1v1</div></div>
      <b class="shm-fslot-name">Tekli Düello</b>
      <small class="shm-fslot-sub">2v2 Seçildiğinde Açılır</small>
    </div>`;

  const cells = mode === "2v2"
    ? [slotHtml(slots[0]), slotHtml(slots[1]), slotHtml(slots[2]), slotHtml(slots[3])]
    : [slotHtml(slots[0]), lockedHtml("blue"), slotHtml(slots[1]), lockedHtml("red")];

  const canSwitch = !room || isHost;
  const mapPills = isHost ? PVP_PRIMARY_MAP_IDS.map(mid => `
    <button class="shm-mini-pill ${curMap === mid ? "active" : ""}" data-shm-pvp-map="${mid}">${PVP_ARENA_MAPS[mid].shortName || PVP_ARENA_MAPS[mid].name}</button>`).join("") : "";

  const barHtml = room ? `
    <div class="shm-pvp-queue-bar" style="flex-wrap:wrap;gap:8px">
      <div>
        <b>🏰 ${room.name} · ${room.curPlayers}/${room.maxPlayers} ${room.curPlayers >= room.maxPlayers ? "(Dolu)" : "(Bekliyor)"}</b>
        <small>Harita: ${mapObj.name}${isHost ? " — oda kurucusu olarak haritayı ve 1v1/2v2 modunu şimdi değiştirebilirsin." : " — maçı oda kurucusu başlatır."}</small>
        ${isHost ? `<div class="shm-btn-row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${mapPills}</div>` : ""}
      </div>
      <div class="shm-btn-row">
        <button class="shm-top-btn" data-shm-act="pvp-leave-room">🚪 Odayı Kapat / Ayrıl</button>
        ${isHost ? `<button class="shm-top-btn" data-shm-act="pvp-send-invite">📨 Lobiye Davet Yayınla</button>
        <button class="btn primary" data-shm-act="pvp-start-match">⚔️ MAÇI BAŞLAT</button>` : ""}
      </div>
    </div>` : `
    <div class="shm-pvp-queue-bar">
      <div>
        <b>🔍 Seçili Harita: ${mapObj.name} (${mapObj.terrainType === "islands" ? "Uçan Adalar" : "Kara / Toprak Kesiti"})</b>
        <small>Henüz bir odada değilsin. Sağdan <b>+ Özel Oyun Odası Kur</b> de veya listeden bir odaya katıl; yuvalar sen istemedikçe bot ile dolmaz.</small>
      </div>
    </div>`;

  const qs = SHM.pvpQueueState;
  const queueHtml = qs ? `
    <div class="shm-pvp-queue-bar" style="margin-bottom:8px;border:1px solid rgba(245,194,73,.5)">
      <div>
        <b>⏳ Rakip aranıyor… (${qs.mode.toUpperCase()})  <span id="shmPvpQueueTimer">${pvpFmtQueueTime(qs.elapsedSec)}</span> / ${pvpFmtQueueTime(PVP_QUEUE_TIMEOUT_SEC)}</b>
        <small>${PVP_QUEUE_TIMEOUT_SEC} saniyede gerçek oyuncu bulunamazsa botlu maça geçilir.</small>
      </div>
      <button class="shm-top-btn" data-shm-act="pvp-cancel-queue">✖ Kuyruğu İptal Et</button>
    </div>` : "";

  const inv = SHM.pendingInvite;
  const inviteHtml = (inv && !room) ? `
    <div class="shm-pvp-queue-bar" style="margin-bottom:8px;border:1px solid rgba(74,222,128,.5)">
      <div><b>📨 ${inv.from} seni <u>${inv.name}</u> odasına davet etti (${String(inv.mode).toUpperCase()})</b></div>
      <div class="shm-btn-row">
        <button class="btn primary sm" data-shm-act="pvp-accept-invite">✅ Katıl</button>
        <button class="shm-top-btn" data-shm-act="pvp-decline-invite">Reddet</button>
      </div>
    </div>` : "";

  return `
    ${inviteHtml}
    ${queueHtml}
    <div class="shm-pvp-formation-box">
      <div class="shm-pvp-form-head">
        <span>${room ? "BEKLEME ODASI" : "TAKIM FORMASYONU"} (${mode.toUpperCase()} MODU)</span>
        ${canSwitch ? `
        <div class="shm-pvp-mode-switch-pills">
          <button class="shm-mini-pill ${mode === "1v1" ? "active" : ""}" data-shm-act="pvp-select-1v1">1v1 Formasyon</button>
          <button class="shm-mini-pill ${mode === "2v2" ? "active" : ""}" data-shm-act="pvp-select-2v2">2v2 Formasyon (4 Slot)</button>
        </div>` : ""}
      </div>
      <div class="shm-pvp-formation-slots">
        ${cells[0]}
        ${cells[1]}
        <div class="shm-pvp-vs-divider">
          <img src="${SHM_ASSETS_PATHS.asset_ui_12_vs_match_clash_emblem}" class="shm-pvp-vs-emblem-img" alt="VS">
          <b>VS</b>
        </div>
        ${cells[2]}
        ${cells[3]}
      </div>
      ${barHtml}
    </div>`;
}

function renderPvpLobbyScreen(star) {
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const stInfo = typeof calcChibiStats === "function" ? calcChibiStats(C) : { totalFc: 1450 };
  const eternalBaby = (typeof getEternalBabyDragon === "function" && getEternalBabyDragon()) || star || { name: "Kor-Yavru", el: "ates" };
  const curMap = (SHM.pvpMap && PVP_ARENA_MAPS[SHM.pvpMap]) ? SHM.pvpMap : "steppe_canyon";
  const mapObj = PVP_ARENA_MAPS[curMap] || PVP_ARENA_MAPS.steppe_canyon;
  const teamMode = SHM.pvpTeamMode === "2v2" ? "2v2" : "1v1";

  const livePeerHandles = (typeof MP !== "undefined" && MP.pvpPeers) ? Object.keys(MP.pvpPeers) : [];
  const activeRivalHandle = livePeerHandles[0] || "@kuzey_ruzgari";
  const allyHandle = livePeerHandles[1] || "@bozkir_avcisi";
  const rival2Handle = livePeerHandles[2] || "@kara_golge";

  const myDoll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(C, { battle: true, hideAura: true, el: eternalBaby.el || "ates" })
    : "";
  const allyChibi = typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: allyHandle, name: "Bozkır Avcısı" }, 1) : null;
  const allyDoll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(allyChibi, { battle: true, hideAura: true, el: "toprak" })
    : "";
  const rival1Chibi = (typeof MP !== "undefined" && MP.pvpPeers && MP.pvpPeers[activeRivalHandle] && MP.pvpPeers[activeRivalHandle].chibi)
    || (typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: activeRivalHandle, name: "Kuzey Rüzgârı" }, 2) : null);
  const rival1Doll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(rival1Chibi, { battle: true, flip: true, hideAura: true, el: "firtina" })
    : "";
  const rival2Chibi = typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: rival2Handle, name: "Kara Gölge" }, 3) : null;
  const rival2Doll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(rival2Chibi, { battle: true, flip: true, hideAura: true, el: "golge" })
    : "";

  const modeFilter = SHM.pvpRoomFilterMode || "all";
  const mapFilter = SHM.pvpRoomFilterMap || "all";

  const filteredRooms = (SHM.pvpRooms || []).filter(r => {
    if (modeFilter !== "all" && r.mode !== modeFilter) return false;
    if (mapFilter !== "all" && r.mapId !== mapFilter) return false;
    return true;
  });

  const roomRowsHtml = filteredRooms.map(r => {
    const mDef = PVP_ARENA_MAPS[r.mapId] || PVP_ARENA_MAPS.steppe_canyon;
    const isFull = r.curPlayers >= r.maxPlayers;
    return `
      <div class="shm-pvp-room-row ${isFull ? "full" : ""}">
        <div class="shm-pvp-room-main">
          <b>${r.name}</b>
          <small>Kurucu: ${r.host} · ${mDef.hazardText}</small>
        </div>
        <div class="shm-pvp-room-map">
          <img src="${mDef.propIcon}" alt="">
          <div>
            <span>${mDef.shortName || mDef.name}</span>
            <small class="shm-terrain-tag ${mDef.terrainType}">${mDef.terrainType === "islands" ? "☁️ Uçan Adalar" : "⛰️ Kara / Toprak"}</small>
          </div>
        </div>
        <div class="shm-pvp-room-mode">
          <span class="shm-pvp-mode-badge ${r.mode === "2v2" ? "team" : "solo"}">${r.mode.toUpperCase()}</span>
        </div>
        <div class="shm-pvp-room-count">
          <b>${r.curPlayers}/${r.maxPlayers}</b>
          <small>${isFull ? "Dolu" : "Bekliyor"}</small>
        </div>
        <div class="shm-pvp-room-act">
          <button class="btn ${isFull ? "ghost" : "primary"} sm" data-shm-join-room="${r.id}">
            ${isFull ? "İzle / Katıl" : "ODAYA KATIL"}
          </button>
        </div>
      </div>
    `;
  }).join("");

  const mapFilterPillsHtml = [
    { id: "all", lbl: "Tüm Haritalar" },
    ...PVP_PRIMARY_MAP_IDS.map(id => ({
      id,
      lbl: PVP_ARENA_MAPS[id].shortName || PVP_ARENA_MAPS[id].name
    }))
  ].map(mp => `
    <button class="shm-pvp-map-pill ${mapFilter === mp.id ? "active" : ""}" data-shm-room-map="${mp.id}">
      ${mp.lbl}
    </button>
  `).join("");

  return `
    <div class="shm-screen-body shm-no-scroll" style="background-image:url('${mapObj.bgUrl}')">
      <div class="shm-screen-backdrop"></div>
      <div class="shm-pvp-lobby-v2">
        <!-- LEFT PANEL: 1v1 & 2v2 QUICK MATCHMAKING + 4-SLOT TEAM FORMATION -->
        <div class="shm-panel-box shm-pvp-left-col">
          <div class="shm-pvp-col-head">
            <img src="${SHM_ASSETS_PATHS.ic_pvp_topcu}" class="shm-crest-md" alt="">
            <div>
              <div class="shm-story-act">HARİTA FARK ETMEKSİZİN OTOMATİK SIRAYA GİR</div>
              <div class="shm-panel-title">⚡ HIZLI EŞLEŞME (1v1 & 2v2)</div>
            </div>
          </div>

          <div class="shm-pvp-quick-cards">
            <!-- 1v1 QUICK DUEL CARD -->
            <div class="shm-pvp-qcard solo ${teamMode === "1v1" ? "active" : ""}" data-shm-act="pvp-select-1v1">
              <img src="${SHM_ASSETS_PATHS.asset_ui_09_emblem_1v1_topcu}" class="shm-pvp-qcard-emblem" alt="1v1 Topçu">
              <div class="shm-pvp-qcard-info">
                <span class="shm-pvp-qtag">TEKLİ SIRA · RASTGELE KARA & UÇAN ADA HAVUZU</span>
                <b>⚡ 1v1 HIZLI DÜELLO</b>
                <small>Harita fark etmeksizin anında 1'e 1 keskin nişancı topçu düellosuna gir!</small>
              </div>
              <button class="btn primary shm-pvp-qbtn shm-btn-emerald-plate" data-shm-act="pvp-quick-1v1">
                1v1 SAVAŞA GİR
              </button>
            </div>

            <!-- 2v2 TEAM BATTLE CARD -->
            <div class="shm-pvp-qcard team ${teamMode === "2v2" ? "active" : ""}" data-shm-act="pvp-select-2v2">
              <img src="${SHM_ASSETS_PATHS.asset_ui_10_emblem_2v2_takim}" class="shm-pvp-qcard-emblem" alt="2v2 Takım">
              <div class="shm-pvp-qcard-info">
                <span class="shm-pvp-qtag">TAKIM SIRASI · 4 TOPÇU SIRALI ATIŞ KUYRUĞU</span>
                <b>⚡⚡ 2v2 TAKIM SAVAŞI</b>
                <small>Mavi Takım (2) vs Kırmızı Takım (2) · Kara kanyonlarında ve uçan adalarda takım savaşı!</small>
              </div>
              <button class="btn primary shm-pvp-qbtn team shm-btn-emerald-plate" data-shm-act="pvp-quick-2v2">
                2v2 SAVAŞA GİR
              </button>
            </div>
          </div>

          \r
        </div>

        <!-- RIGHT PANEL: CUSTOM GAME ROOMS (+ ÖZEL OYUN ODASI KUR, FILTERS, LIVE ROOM LIST) -->
        <div class="shm-panel-box shm-pvp-right-col">
          <div class="shm-pvp-col-head between">
            <div>
              <div class="shm-story-act">KARA HARİTALARI & GÖKYÜZÜ UÇAN ADALAR HAVUZU</div>
              <div class="shm-panel-title">🏰 ÖZEL OYUN ODALARI (1v1 & 2v2)</div>
            </div>
            <button class="btn good shm-create-room-btn" data-shm-act="pvp-toggle-create-room">
              + ÖZEL OYUN ODASI KUR
            </button>
          </div>

          ${SHM.pvpCreateRoomOpen ? `
            <div class="shm-pvp-create-drawer">
              <div class="shm-pvp-create-row">
                <div>
                  <small>TAKIM MODU SEÇ:</small>
                  <div class="shm-btn-row">
                    <button class="shm-mini-pill ${SHM.pvpNewRoomMode === "1v1" ? "active" : ""}" data-shm-newroom-mode="1v1">1v1 Düello (2 Kişi)</button>
                    <button class="shm-mini-pill ${SHM.pvpNewRoomMode === "2v2" ? "active" : ""}" data-shm-newroom-mode="2v2">2v2 Takım (4 Kişi)</button>
                  </div>
                </div>
                <div>
                  <small>HARİTA TİPİ SEÇ (KARA VEYA UÇAN ADA):</small>
                  <div class="shm-btn-row">
                    ${PVP_PRIMARY_MAP_IDS.map(mid => `
                      <button class="shm-mini-pill ${SHM.pvpNewRoomMap === mid ? "active" : ""}" data-shm-newroom-map="${mid}">
                        ${PVP_ARENA_MAPS[mid].shortName}
                      </button>
                    `).join("")}
                  </div>
                </div>
                <button class="btn primary sm" data-shm-act="pvp-confirm-create-room">
                  🏰 Odayı Kur (Bekleme Odasını Aç)
                </button>
              </div>
            </div>
          ` : ""}

          <!-- MODE FILTER TABS & MAP QUICK SELECTOR -->
          <div class="shm-pvp-filter-bar">
            <div class="shm-pvp-mode-tabs">
              <button class="shm-pvp-tab ${modeFilter === "all" ? "active" : ""}" data-shm-room-mode="all">Tümü (${(SHM.pvpRooms || []).length})</button>
              <button class="shm-pvp-tab ${modeFilter === "1v1" ? "active" : ""}" data-shm-room-mode="1v1">1v1 Odalar</button>
              <button class="shm-pvp-tab ${modeFilter === "2v2" ? "active" : ""}" data-shm-room-mode="2v2">2v2 Odalar</button>
            </div>
            <div class="shm-pvp-map-pills">
              ${mapFilterPillsHtml}
            </div>
          </div>

          <!-- LIVE CUSTOM ROOMS TABLE -->
          <div class="shm-pvp-rooms-list">
            ${roomRowsHtml}
          </div>

          <!-- MAP TOPOLOGY SELECTOR STRIP (GROUND STRATA VS FLOATING ISLANDS) -->
          <div class="shm-pvp-map-strip">
            ${PVP_PRIMARY_MAP_IDS.map(mid => {
              const m = PVP_ARENA_MAPS[mid];
              return `
                <div class="shm-pvp-map-mini ${curMap === mid ? "active" : ""}" data-shm-pvp-map="${mid}">
                  <img src="${m.propIcon}" alt="${m.name}">
                  <div>
                    <b>${m.shortName}</b>
                    <small>${m.terrainType === "islands" ? "☁️ Uçan Adalar" : "⛰️ Kara / Toprak"}</small>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

const FOOT_SINK_Y = 14; // Layer 3: 3/4 Perspective Foot Sink Offset so Chibi feet stand inside the grass/stone strip

function initTopcuPvpStage(mapId = "steppe_canyon", teamMode = null) {
  SHM.gameMode = "pvp";
  SHM.entryContext = "pvp_arena";
  if (teamMode === "1v1" || teamMode === "2v2") {
    SHM.pvpTeamMode = teamMode;
  } else if (!SHM.pvpTeamMode) {
    SHM.pvpTeamMode = "1v1";
  }
  const normalizedMap = mapId === "any"
    ? PVP_PRIMARY_MAP_IDS[Math.floor(Math.random() * PVP_PRIMARY_MAP_IDS.length)]
    : (PVP_ARENA_MAPS[mapId] ? mapId : "steppe_canyon");
  SHM.pvpMap = normalizedMap;
  const mapDef = PVP_ARENA_MAPS[SHM.pvpMap] || PVP_ARENA_MAPS.steppe_canyon;
  const isGroundMap = mapDef.terrainType === "ground" || mapDef.topology === "ground";
  const W = SHM.WORLD_W; // 3400
  const H = SHM.WORLD_H; // 1550
  SHM.waterRaise = mapDef.waterRaise != null ? mapDef.waterRaise : ((SHM.pvpMap === "forge" || SHM.pvpMap === "dragon_caldera") ? 16 : 0);

  // LAYER 1: Non-Collidable Background Ruins / Upper Fortress Decorations Canvas (SHM.bgDecoCanvas)
  if (!SHM.bgDecoCanvas && typeof document !== "undefined") {
    SHM.bgDecoCanvas = document.createElement("canvas");
  }
  if (SHM.bgDecoCanvas) {
    if (SHM.bgDecoCanvas.width !== W) SHM.bgDecoCanvas.width = W;
    if (SHM.bgDecoCanvas.height !== H) SHM.bgDecoCanvas.height = H;
    if (!SHM.bgDecoCtx) {
      SHM.bgDecoCtx = SHM.bgDecoCanvas.getContext("2d");
    }
  }
  const bgctx = SHM.bgDecoCtx;
  if (bgctx) bgctx.clearRect(0, 0, W, H);

  // LAYER 2: Physical Destructible Terrain & Collider Canvas (SHM.terrainCanvas)
  if (!SHM.terrainCanvas && typeof document !== "undefined") {
    SHM.terrainCanvas = document.createElement("canvas");
  }
  if (SHM.terrainCanvas) {
    if (SHM.terrainCanvas.width !== W) SHM.terrainCanvas.width = W;
    if (SHM.terrainCanvas.height !== H) SHM.terrainCanvas.height = H;
    if (!SHM.terrainCtx) {
      SHM.terrainCtx = SHM.terrainCanvas.getContext("2d", { willReadFrequently: true });
    }
  }
  const tctx = SHM.terrainCtx;
  if (tctx) tctx.clearRect(0, 0, W, H);

  if (!SHM.heightMap || SHM.heightMap.length !== W) {
    SHM.heightMap = new Float32Array(W);
  }
  const hMap = new Float32Array(W);

  // BİYOM TUTARLILIĞI: Buzul haritada _ice, Kızıl Kanyon / Ejder Kalderası'nda _fire modüler parçalar seçilir.
  // (Buzulda ASLA yeşil çimli MOD-3, kahverengi MOD-6 veya yeşil ISL-2 kullanılmaz!)
  const pvpBiome = mapDef.biome != null
    ? mapDef.biome
    : ((SHM.pvpMap === "glacier" || SHM.pvpMap === "frost_stalactite_cavern")
      ? "ice"
      : (SHM.pvpMap === "sandstorm" || SHM.pvpMap === "dragon_caldera" || SHM.pvpMap === "forge") ? "fire" : "");
  const getBiomeModKey = (baseKey) => {
    if (!pvpBiome || typeof baseKey !== "string") return baseKey;
    if (!/^(mod_|asset_mod_terrain_)/.test(baseKey) || /_(ice|fire)$/.test(baseKey)) return baseKey;
    const variant = `${baseKey}_${pvpBiome}`;
    return SHM_ASSETS_PATHS[variant] ? variant : baseKey;
  };

  const ensureModImg = (rawKey) => {
    const key = getBiomeModKey(rawKey);
    const im = SHM_IMAGES[key];
    if (im && im.complete && im.naturalWidth > 0) return im;
    if (im && !im._boundPvpModReinit) {
      im._boundPvpModReinit = true;
      im.onload = () => {
        if (SHM.open && SHM.screen === "battle" && SHM.gameMode === "pvp") {
          initTopcuPvpStage(SHM.pvpMap, SHM.pvpTeamMode);
        }
      };
    }
    return null;
  };

  // Non-collidable arka tünel oyuğu: opak/yarı-saydam gri yarım daire çizilmez, doğrudan arka plan kanyon manzarası görünür
  const fillDarkTunnelBackdrop = (_drawPath) => {};

  // Draws an asset split at splitWorldY:
  // - Upper part (y .. splitWorldY) -> SHM.bgDecoCtx (Layer 1: visual background ruin arch, NO collider!)
  // - Lower part (splitWorldY .. y+h) -> SHM.terrainCtx (Layer 2: walkable & destructible physical collider!)
  const stampSplitColliderAsset = (key, x, y, w, h, splitWorldY, fallbackColor = "#5c4028") => {
    const im = ensureModImg(key);
    const clampedSplit = Math.max(y, Math.min(y + h, splitWorldY));
    const topRatio = (clampedSplit - y) / Math.max(1, h);
    if (im) {
      const nw = im.naturalWidth;
      const nh = im.naturalHeight;
      const splitSrcY = Math.round(nh * topRatio);
      if (bgctx && splitSrcY > 2) {
        bgctx.drawImage(im, 0, 0, nw, splitSrcY, x, y, w, clampedSplit - y);
      }
      if (tctx && nh - splitSrcY > 2) {
        tctx.drawImage(im, 0, splitSrcY, nw, nh - splitSrcY, x, clampedSplit, w, y + h - clampedSplit);
      }
    } else if (tctx) {
      tctx.fillStyle = fallbackColor;
      tctx.fillRect(x + 28, clampedSplit, w - 56, Math.max(24, y + h - clampedSplit - 16));
    }
  };

  // Draws a 100% physical obstacle/bunker/pillar/stalactite onto SHM.terrainCtx (Layer 2) at full brightness
  const stampPhysicalModAsset = (key, x, y, w, h, fallbackColor = "#475569") => {
    const im = ensureModImg(key);
    if (im && tctx) {
      tctx.drawImage(im, x, y, w, h);
    } else if (tctx) {
      tctx.fillStyle = fallbackColor;
      tctx.fillRect(x + 18, y + 12, w - 36, h - 24);
    }
  };

  SHM.pvpRimSegments = [];


  if (isGroundMap) {
    const baseLevel = mapDef.baseLevel || 895;
    for (let x = 0; x < W; x++) {
      let y = 1485;
      if (x >= 80 && x <= 3320) {
        const gentleWave = Math.sin(((x - 80) / 3240) * Math.PI * 3) * 14 + Math.cos(x * 0.012) * 5;
        y = baseLevel - gentleWave;
      }
      hMap[x] = Math.max(580, Math.min(1485, y));
      SHM.heightMap[x] = Math.round(hMap[x]);
    }

    if (tctx) {
      const stops = mapDef.gradientStops || ["#65a30d", "#5c4028", "#3a2818", "#181009"];
      for (let x = 0; x < W; x++) {
        const topY = Math.round(hMap[x]);
        if (topY >= 1460) continue;
        const grad = tctx.createLinearGradient(0, topY, 0, H);
        grad.addColorStop(0, stops[0]);
        grad.addColorStop(0.22, stops[1]);
        grad.addColorStop(0.65, stops[2]);
        grad.addColorStop(1, stops[3]);
        tctx.fillStyle = grad;
        tctx.fillRect(x, topY, 1, H - topY);
      }

      const soilKey = mapDef.soilKey || mapDef.soilAssetKey || "soil_bozkir_cim";
      const soilTex = ensureModImg(soilKey);
      if (soilTex && soilTex.complete && soilTex.naturalWidth > 0) {
        const texW = soilTex.naturalWidth;
        const texH = soilTex.naturalHeight;
        const tileWorldW = 680;
        const sliceStep = 6;
        tctx.save();
        tctx.globalCompositeOperation = "source-atop";
        tctx.globalAlpha = 0.96;
        for (let tx = 0; tx < W; tx += tileWorldW) {
          tctx.drawImage(soilTex, 0, Math.floor(texH * 0.28), texW, Math.floor(texH * 0.72), tx, 880, tileWorldW, 360);
          tctx.drawImage(soilTex, 0, Math.floor(texH * 0.42), texW, Math.floor(texH * 0.58), tx, 1180, tileWorldW, 370);
        }
        tctx.globalCompositeOperation = "source-over";
        tctx.globalAlpha = 1;
        for (let x = 80; x <= 3320; x += sliceStep) {
          const topY = Math.round(hMap[x]);
          if (topY >= 1460) continue;
          const u = ((x - 80) % tileWorldW) / tileWorldW;
          const sx = Math.floor(u * (texW - 8));
          const sw = Math.max(4, Math.ceil((sliceStep / tileWorldW) * texW));
          tctx.drawImage(soilTex, sx, 0, sw, texH, x, topY - 22, sliceStep + 1, 390);
        }
        tctx.restore();
      }

      const stampSeljukStoneBridgeWithHollowArch = (bridgeY = 775, deckY = 842, archCenterY = 955) => {
        const bridgeImg = ensureModImg("mod_tas_kopru");
        const archPath = (c) => {
          c.ellipse(1200, archCenterY, 176, 88, 0, Math.PI, 0, false);
          c.lineTo(1376, archCenterY + 38);
          c.lineTo(1024, archCenterY + 38);
          c.closePath();
        };
        tctx.save();
        tctx.fillStyle = pvpBiome === "ice" ? "#0284c7" : pvpBiome === "fire" ? "#9a3412" : "#475569";
        tctx.fillRect(875, deckY, 650, 44);
        if (bridgeImg) {
          tctx.drawImage(bridgeImg, 845, bridgeY, 710, 275);
        }
        tctx.globalCompositeOperation = "destination-out";
        tctx.beginPath();
        archPath(tctx);
        tctx.fill();
        tctx.restore();
      };

      if (typeof mapDef.stampStructures === "function") {
        mapDef.stampStructures({
          tctx,
          bgctx,
          W,
          H,
          pvpBiome,
          stampPhysicalModAsset,
          stampSplitColliderAsset,
          stampSeljukStoneBridgeWithHollowArch
        });
      }
    }
  } else {
    for (let x = 0; x < W; x++) {
      hMap[x] = H - 60;
      SHM.heightMap[x] = H - 60;
    }

    const isCaldera = Boolean(mapDef.isCalderaBunker) || SHM.pvpMap === "dragon_caldera" || SHM.pvpMap === "forge";
    const islands = (Array.isArray(mapDef.islandsLayout) && mapDef.islandsLayout.length > 0)
      ? mapDef.islandsLayout
      : [
          { key: isCaldera ? "asset_island_04_ejder_kaburga_magma" : "asset_island_01_selcuklu_harabe", x: 1010, y: 650, w: 460, h: 250, flip: false },
          { key: isCaldera ? "asset_island_04_ejder_kaburga_magma" : "asset_island_02_tas_kemer_tunel", x: 1515, y: 575, w: 470, h: 255, flip: false },
          { key: isCaldera ? "asset_island_04_ejder_kaburga_magma" : "asset_island_01_selcuklu_harabe", x: 1925, y: 735, w: 500, h: 268, flip: true }
        ];

    const geologicalSeamRatio = (u, rx) => {
      let base = 0.432;
      if (u < 0.15) {
        const t = (0.15 - u) / 0.15;
        base = 0.432 - t * t * 0.14;
      } else if (u > 0.70) {
        const t = (u - 0.70) / 0.30;
        base = 0.428 - Math.sin(t * Math.PI * 0.85) * 0.085;
      }
      const wave = (Math.sin(rx * 0.055) * 2.5 + Math.cos(rx * 0.14) * 1.5) / 250;
      return base + wave;
    };

    if (tctx && bgctx && typeof document !== "undefined") {
      tctx.clearRect(0, 0, W, H);
      bgctx.clearRect(0, 0, W, H);

      islands.forEach((isl, idx) => {
        const islImg = ensureModImg(isl.key) || SHM_IMAGES[isl.key];
        if (!islImg || !islImg.complete || islImg.naturalWidth === 0) return;

        const off = document.createElement("canvas");
        off.width = isl.w;
        off.height = isl.h;
        const octx = off.getContext("2d");
        if (isl.flip) {
          octx.translate(isl.w, 0);
          octx.scale(-1, 1);
        }
        octx.drawImage(islImg, 0, 0, isl.w, isl.h);
        if (isl.flip) octx.setTransform(1, 0, 0, 1, 0, 0);

        const srcData = octx.getImageData(0, 0, isl.w, isl.h);
        const sd = srcData.data;

        const decoCan = document.createElement("canvas");
        decoCan.width = isl.w;
        decoCan.height = isl.h;
        const dctx = decoCan.getContext("2d");
        const decoData = dctx.createImageData(isl.w, isl.h);
        const dd = decoData.data;

        const hitCan = document.createElement("canvas");
        hitCan.width = isl.w;
        hitCan.height = isl.h;
        const hctx = hitCan.getContext("2d");
        const hitData = hctx.createImageData(isl.w, isl.h);
        const hd = hitData.data;

        for (let x = 0; x < isl.w; x++) {
          const normX = x / isl.w;
          const u = isl.flip ? (1.0 - normX) : normX;
          const seamY = Math.round(isl.h * geologicalSeamRatio(u, x + idx * 53));

          for (let y = 0; y < isl.h; y++) {
            const p = (y * isl.w + x) * 4;
            const a = sd[p + 3];
            if (a < 15) continue;

            if (y < seamY) {
              const r = sd[p], g = sd[p + 1], b = sd[p + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              const nr = Math.round((r * 0.38 + lum * 0.62) * 0.48 + 14);
              const ng = Math.round((g * 0.38 + lum * 0.62) * 0.42 + 9);
              const nb = Math.round((b * 0.38 + lum * 0.62) * 0.38 + 7);
              dd[p] = nr;
              dd[p + 1] = ng;
              dd[p + 2] = nb;
              dd[p + 3] = Math.round(a * 0.78);
            } else {
              hd[p] = sd[p];
              hd[p + 1] = sd[p + 1];
              hd[p + 2] = sd[p + 2];
              hd[p + 3] = a;
            }
          }
        }

        dctx.putImageData(decoData, 0, 0);
        hctx.putImageData(hitData, 0, 0);

        bgctx.save();
        bgctx.drawImage(decoCan, isl.x, isl.y);
        bgctx.restore();

        tctx.save();
        tctx.filter = "drop-shadow(0 16px 22px rgba(0,0,0,0.92))";
        tctx.drawImage(hitCan, isl.x, isl.y);
        tctx.restore();
      });

      const bunkerImg = ensureModImg("asset_mod_terrain_04_selcuklu_siper_burc") || SHM_IMAGES["asset_mod_terrain_04_selcuklu_siper_burc"];
      if (bunkerImg && bunkerImg.complete && bunkerImg.naturalWidth > 0) {
        const bw = 152;
        const bh = 102;
        const bCan = document.createElement("canvas");
        bCan.width = bw;
        bCan.height = bh;
        const bctx = bCan.getContext("2d");
        bctx.drawImage(bunkerImg, 0, 0, bw, bh);
        if (isCaldera) {
          const bData = bctx.getImageData(0, 0, bw, bh);
          const bd = bData.data;
          for (let y = 0; y < bh; y++) {
            for (let x = 0; x < bw; x++) {
              const p = (y * bw + x) * 4;
              const a = bd[p + 3];
              if (a < 20) continue;
              const r = bd[p], g = bd[p + 1], b = bd[p + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum < 34) {
                bd[p] = 18; bd[p + 1] = 12; bd[p + 2] = 10;
              } else if (lum >= 34 && lum < 64 && y > 18) {
                const t = (64 - lum) / 30;
                bd[p] = Math.round(85 + t * 170);
                bd[p + 1] = Math.round(52 + t * 54);
                bd[p + 2] = Math.round(40 - t * 24);
              } else {
                const norm = (lum - 64) / 191;
                bd[p] = Math.round(48 + norm * 78);
                bd[p + 1] = Math.round(42 + norm * 68);
                bd[p + 2] = Math.round(44 + norm * 62);
              }
            }
          }
          bctx.putImageData(bData, 0, 0);
        }

        const bx = 1985;
        const by = 735 + Math.round(268 * 0.428) - 94;
        tctx.save();
        tctx.filter = "drop-shadow(0 8px 14px rgba(0,0,0,0.92))";
        tctx.drawImage(bCan, bx, by);
        tctx.restore();
      }

      // 2B Organik Hitbox Konturu (#fbbf24): terrainCanvas alfa maskesinin gerçek dış çarpışma sınırını tarar
      const rx0 = 990, ry0 = 520, rw = 1460, rh = 520;
      const tData = tctx.getImageData(rx0, ry0, rw, rh);
      const td = tData.data;
      const alphaAt = (x, y) => {
        if (x < 0 || x >= rw || y < 0 || y >= rh) return 0;
        return td[(y * rw + x) * 4 + 3];
      };

      const rimCan = document.createElement("canvas");
      rimCan.width = rw;
      rimCan.height = rh;
      const rctx = rimCan.getContext("2d");
      const rData = rctx.createImageData(rw, rh);
      const rd = rData.data;

      for (let y = 3; y < rh - 3; y++) {
        for (let x = 3; x < rw - 3; x++) {
          const a = alphaAt(x, y);
          if (a <= 140) continue;
          const idx = (y * rw + x) * 4;

          const aUp1 = alphaAt(x, y - 1);
          const aUp2 = alphaAt(x, y - 2);
          const aUp3 = alphaAt(x, y - 3);
          const aLeft2 = alphaAt(x - 2, y);
          const aRight2 = alphaAt(x + 2, y);

          if (aUp1 < 50) {
            rd[idx] = 20; rd[idx + 1] = 12; rd[idx + 2] = 8; rd[idx + 3] = 255;
          } else if (aUp2 < 50 || aUp3 < 50) {
            rd[idx] = 251; rd[idx + 1] = 191; rd[idx + 2] = 36; rd[idx + 3] = 235;
          } else if (aLeft2 < 50 || aRight2 < 50) {
            rd[idx] = 245; rd[idx + 1] = 158; rd[idx + 2] = 11; rd[idx + 3] = 190;
          }
        }
      }
      rctx.putImageData(rData, 0, 0);
      tctx.drawImage(rimCan, rx0, ry0);
    }
  }

  if (tctx) {
    rebuildHeightMapFromCanvas();
  }
  if (!isGroundMap && bgctx && tctx) {
    const startX = 1170, startY = 720;
    const endX = 1685, endY = (SHM.heightMap && SHM.heightMap[1685]) || 684;
    const midX = 1440, midY = 540;
    bgctx.save();
    for (let i = 1; i <= 26; i++) {
      const t = i / 26;
      const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
      const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
      bgctx.beginPath();
      bgctx.arc(px, py, i % 3 === 0 ? 5.2 : 3.5, 0, Math.PI * 2);
      bgctx.fillStyle = i > 20 ? '#ef4444' : '#fbbf24';
      bgctx.fill();
      bgctx.lineWidth = 1.5;
      bgctx.strokeStyle = 'rgba(0,0,0,0.85)';
      bgctx.stroke();
    }
    bgctx.restore();

    tctx.save();
    tctx.beginPath();
    tctx.arc(endX, endY, 18, 0, Math.PI * 2);
    tctx.fillStyle = 'rgba(239, 68, 68, 0.30)';
    tctx.fill();
    tctx.lineWidth = 3.2;
    tctx.strokeStyle = '#ef4444';
    tctx.stroke();
    tctx.beginPath();
    tctx.arc(endX, endY, 7, 0, Math.PI * 2);
    tctx.fillStyle = '#fef08a';
    tctx.fill();
    tctx.restore();
  }
  if (bgctx && typeof document !== "undefined") {
    if (!SHM.bgDecoCanvasDim) {
      SHM.bgDecoCanvasDim = document.createElement("canvas");
      SHM.bgDecoCanvasDim.width = W;
      SHM.bgDecoCanvasDim.height = H;
    }
    const dimCtx = SHM.bgDecoCanvasDim.getContext("2d");
    if (dimCtx) {
      dimCtx.clearRect(0, 0, W, H);
      const isPreDarkenedPvpIslands = !(SHM.pvpMap === "steppe_canyon" || SHM.pvpMap === "glacier" || SHM.pvpMap === "sandstorm");
      if (isPreDarkenedPvpIslands) {
        dimCtx.drawImage(SHM.bgDecoCanvas, 0, 0);
      } else {
        dimCtx.save();
        dimCtx.filter = "brightness(0.48) saturate(0.58) contrast(0.90)";
        dimCtx.globalAlpha = 0.86;
        dimCtx.drawImage(SHM.bgDecoCanvas, 0, 0);
        dimCtx.restore();
      }
    }
  }

  SHM.pvpRimSegments = [];
  SHM.pvpRimColor = isGroundMap ? (pvpBiome === "ice" ? "#7dd3fc" : pvpBiome === "fire" ? "#fbbf24" : "#a3e635") : "transparent";
  SHM.lastPower = 62;

  const eternalBaby = (typeof getEternalBabyDragon === "function" && getEternalBabyDragon()) || null;
  const star = eternalBaby || (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor-Yavru", el: "ates" };
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const syn = calcMainDragonSynergy(star, C);
  SHM.dragonSynergy = syn;
  const baseMaxHp = 1650 + syn.hpBonus;
  const baseSta = 120 + syn.staBonus;

  const pStartX = isGroundMap ? 470 : 1145;
  const pHintY = isGroundMap ? 865 : 758;
  const pStartY = isGroundMap ? findLocalGroundY(pStartX, pHintY) : (SHM.heightMap[pStartX] || 760);

  SHM.player = {
    x: pStartX,
    y: pStartY,
    vx: 0,
    vy: 0,
    facing: 1,
    angle: 36,
    aimDeg: 36,
    slopeAngle: 0,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    stamina: baseSta,
    maxStamina: baseSta,
    rage: 50,
    shield: 0, // CRITICAL: No default circular aura around players!
    poison: 0,
    team: "blue",
    el: star.el || "ates",
    walkPhase: 0,
    walkSpeed: 0,
    animState: "idle",
    animTimer: 0,
    dragonSynergy: syn,
    revivesLeft: 1
  };

  const livePeerHandles = (typeof MP !== "undefined" && MP.pvpPeers) ? Object.keys(MP.pvpPeers) : [];
  const liveHandle = livePeerHandles[0] || null;
  const livePeerData = (liveHandle && typeof MP !== "undefined" && MP.pvpPeers) ? MP.pvpPeers[liveHandle] : null;
  const hubPeerMatch = (typeof S !== "undefined" && S && S.hub && Array.isArray(S.hub.peers))
    ? S.hub.peers.find(hp => hp.handle === (liveHandle || "@kuzey_ruzgari"))
    : null;
  const rivalChibi = (livePeerData && livePeerData.chibi)
    || (hubPeerMatch && hubPeerMatch.chibi)
    || (typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: liveHandle || "@kuzey_ruzgari", name: liveHandle || "Kuzey Rüzgârı" }) : null);

  SHM.coopUnits = [];
  const rv1X = isGroundMap ? 1825 : 1765;
  const rv1HintY = isGroundMap ? 865 : 684;
  const rv1Y = isGroundMap ? findLocalGroundY(rv1X, rv1HintY) : (SHM.heightMap[rv1X] || 760);
  SHM.pvpRival = {
    id: "pvp_rival_kuzey",
    name: liveHandle ? `Canlı Rakip (${liveHandle})` : "Kuzey Rüzgârı",
    handle: liveHandle || "@kuzey_ruzgari",
    team: "red",
    isLivePlayer: !!liveHandle,
    x: rv1X,
    y: rv1Y,
    facing: -1,
    angle: 40,
    hp: 1750,
    maxHp: 1750,
    ghostHp: 1750,
    shield: 0, // CRITICAL: No default circular aura around rivals!
    el: (livePeerData && livePeerData.el) || (hubPeerMatch && hubPeerMatch.d && hubPeerMatch.d.el) || "firtina",
    chibi: rivalChibi,
    armor: (rivalChibi && rivalChibi.eq && rivalChibi.eq.armor) || "armor_10",
    hat: (rivalChibi && rivalChibi.eq && rivalChibi.eq.hat) || "hat_10",
    wpn: (rivalChibi && rivalChibi.eq && rivalChibi.eq.wpn) || "wpn_10",
    state: "idle",
    animTimer: 0,
    dead: false
  };

  if (SHM.pvpTeamMode === "2v2") {
    const allyChibi = typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: "@leydi_sureyya", name: "Leydi Süreyya" }, 0) : null;
    // Place Mavi-2 on the bridge deck (ground maps) or on the left island (floating islands)
    const allyX = isGroundMap ? 955 : 1345;
    const allyHintY = isGroundMap ? 842 : 758;
    const allyY = isGroundMap ? findLocalGroundY(allyX, allyHintY) : (SHM.heightMap[allyX] || 760);
    SHM.pvpAlly = {
      id: "pvp_ally_sureyya",
      name: "Leydi Süreyya",
      handle: "@leydi_sureyya",
      team: "blue",
      x: allyX,
      y: allyY,
      facing: 1,
      angle: 38,
      hp: 1680,
      maxHp: 1680,
      ghostHp: 1680,
      shield: 0,
      el: "buz",
      chibi: allyChibi,
      state: "idle",
      animTimer: 0,
      dead: false
    };

    const rv2Chibi = typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: "@kor_avcisi", name: "Kor Avcısı" }, 1) : null;
    const rv2X = isGroundMap ? 2230 : 2245;
    const rv2HintY = isGroundMap ? 865 : 850;
    const rv2Y = isGroundMap ? findLocalGroundY(rv2X, rv2HintY) : (SHM.heightMap[rv2X] || 850);
    const secondRival = {
      id: "pvp_rival_kor",
      name: "Kor Avcısı",
      handle: "@kor_avcisi",
      team: "red",
      isLivePlayer: false,
      x: rv2X,
      y: rv2Y,
      facing: -1,
      angle: 42,
      hp: 1720,
      maxHp: 1720,
      ghostHp: 1720,
      shield: 0,
      el: "toprak",
      chibi: rv2Chibi,
      armor: "armor_9",
      hat: "hat_9",
      wpn: "wpn_9",
      state: "idle",
      animTimer: 0,
      dead: false
    };
    SHM.pvpRivals = [SHM.pvpRival, secondRival];
  } else {
    SHM.pvpAlly = null;
    SHM.pvpRivals = [SHM.pvpRival];
  }

  // Clean V2 PvP Battlefield: no cluttering barrels/crates/portals unless explicitly spawned
  SHM.props = [];

  if (typeof mpSendWs === "function") {
    mpSendWs({
      type: "pvp_sync",
      action: "join_map",
      from: (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi",
      mapId: SHM.pvpMap,
      teamMode: SHM.pvpTeamMode
    });
  }

  SHM.boss = null;
  SHM.enemies = [];
  SHM.projectiles = [];
  SHM.particles = [];
  SHM.debris = [];
  SHM.shockwaves = [];
  SHM.floatTexts = [];
  SHM.laserBeams = [];
  SHM.dangerZones = [];
  SHM.turn = "player";
  SHM.turnTimer = 20;
  SHM.wind = +(Math.random() * (SHM.pvpMap === "glacier" ? 6.4 : 4.2) - (SHM.pvpMap === "glacier" ? 3.2 : 2.1)).toFixed(1);
  SHM.activeMods = { plus1: false, plus2: false, trident: false, heavy: false, crater: false, teleport: false, powUlt: false };
  SHM.cooldowns = { teleport: 0, shield: 0, heal: 0 };

  SHM.skyParticles = [];
  for (let i = 0; i < 42; i++) {
    SHM.skyParticles.push({
      x: Math.random() * W,
      y: 80 + Math.random() * (H - 220),
      r: 2 + Math.random() * 3,
      baseVx: (Math.random() - 0.5) * 0.5,
      vy: (SHM.pvpMap === "forge" || SHM.pvpMap === "dragon_caldera") ? (-0.45 - Math.random() * 0.6) : (0.2 + Math.random() * 0.45),
      phase: Math.random() * Math.PI * 2,
      alpha: 0.4 + Math.random() * 0.5
    });
  }

  triggerTurnBanner(
    `TOPÇU ER MEYDANI (${SHM.pvpTeamMode.toUpperCase()}) · ${mapDef.name.toUpperCase()}`,
    isGroundMap ? "Toprak Katmanlarını Parçala veya Kemer Tünelinden Nişan Al!" : "Uçan Adaları Parçala ve Rakipleri Boşluğa Düşür!",
    "player"
  );

  if (!isGroundMap) {
    SHM.cam.mode = "manual";
    SHM.cam.introTimer = 0;
    SHM.cam.manualPan = true;
    SHM.cam.zoom = 0.85;
    SHM.cam.tZoom = 0.85;
    SHM.cam.focusX = SHM.player.x;
    SHM.cam.focusY = SHM.player.y - 80;
    SHM.cam.leadX = SHM.player.facing * 95;
    SHM.cam.leadY = 0;
    SHM.cam.activeActor = { x: SHM.player.x, y: SHM.player.y - 80, zoom: SHM.cam.zoom, label: "SEN" };
    SHM.cam.x = 955;
    SHM.cam.tx = 955;
    SHM.cam.y = 285;
    SHM.cam.ty = 285;
  } else {
    SHM.cam.mode = "follow";
    SHM.cam.introTimer = 0;
    SHM.cam.manualPan = false;
    SHM.cam.zoom = SHM.pvpTeamMode === "2v2" ? 0.90 : 0.98;
    SHM.cam.tZoom = SHM.pvpTeamMode === "2v2" ? 0.90 : 0.98;
    SHM.cam.focusX = SHM.player.x;
    SHM.cam.focusY = SHM.player.y - 80;
    SHM.cam.leadX = SHM.player.facing * 95;
    SHM.cam.leadY = 0;
    SHM.cam.activeActor = { x: SHM.player.x, y: SHM.player.y - 80, zoom: SHM.cam.zoom, label: "SEN" };
    SHM.cam.x = Math.max(0, SHM.player.x - 320);
    SHM.cam.y = Math.max(0, SHM.player.y - 340);
    SHM.cam.tx = SHM.cam.x;
    SHM.cam.ty = SHM.cam.y;
  }
}

function executePvpRivalTurn() {
  if (!SHM.open || SHM.screen !== "battle" || !SHM.pvpRival || SHM.pvpRival.dead || !SHM.player) {
    startNewPlayerTurn();
    return;
  }
  const rv = SHM.pvpRival;
  const p = SHM.player;
  rv.facing = p.x < rv.x ? -1 : 1;
  const stepX = Math.max(2220, Math.min(2980, rv.x + (Math.random() < 0.5 ? -48 : 48)));
  if (SHM.heightMap[Math.round(stepX)] < 1420) {
    rv.x = stepX;
    rv.y = SHM.heightMap[Math.round(stepX)];
  }
  rv.state = "attack";
  rv.animTimer = 54;
  SHM.cam.lockedUnit = rv;
  SHM.cam.activeActor = { x: rv.x, y: rv.y - 75, zoom: 1.22, label: rv.name };
  triggerTurnBanner("RAKİP HAMLESİ", rv.name, "enemy");
  setDialogue(
    rv.name || "Kuzey Rüzgârı (@kuzey_ruzgari)",
    rv.isLivePlayer ? "Canlı rakip nişan alıyor... Rüzgâr ve arazi fiziği devrede!" : "Fırtına Yavru Ejderham rüzgârı arkasına aldı! Siperini sağlam tut!",
    SHM_ASSETS_PATHS.ic_pvp_topcu
  );
  updateBattleHudDom();

  const waitDelay = rv.isLivePlayer ? (SHM.fastSim ? 450 : 1800) : (SHM.fastSim ? 180 : 580);
  SHM._liveRivalTimeout = setTimeout(() => {
    if (!SHM.open || SHM.screen !== "battle" || rv.dead || SHM.turn !== "enemy") return;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("cannon_launch");
    launchAimedEnemyProjectile(rv.x + rv.facing * 32, rv.y - 56, p.x + (Math.random() * 48 - 24), p.y - 28, 175, rv.el || "firtina", 50);
    setTimeout(() => {
      if (SHM.cam && SHM.cam.lockedUnit === rv) SHM.cam.lockedUnit = null;
      const waitCheck = setInterval(() => {
        if (!SHM.open || SHM.screen !== "battle") {
          clearInterval(waitCheck);
          return;
        }
        if (SHM.projectiles.length === 0 && (SHM.cam.impactHoldTimer || 0) <= 0) {
          clearInterval(waitCheck);
          startNewPlayerTurn();
        }
      }, 70);
    }, SHM.fastSim ? 80 : 280);
  }, waitDelay);
}

function drawPvpRivalUnit(ctx, rv, now) {
  ctx.save();
  const sinkY = SHM.gameMode === "pvp" ? FOOT_SINK_Y : 8;
  if (rv.animTimer > 0) {
    rv.animTimer--;
    if (rv.animTimer <= 0) rv.state = "idle";
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.beginPath();
  ctx.ellipse(rv.x, rv.y + sinkY - 2, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (rv.shield > 0) {
    ctx.strokeStyle = "rgba(192, 132, 252, 0.88)";
    ctx.fillStyle = "rgba(192, 132, 252, 0.14)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(rv.x, rv.y - 46, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.save();
  if (rv.hitFlash > 0) {
    rv.hitFlash--;
    ctx.filter = "brightness(2.1) contrast(1.3) drop-shadow(0 0 14px #ff7a6a)";
  } else {
    ctx.filter = "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 -1px 4px rgba(192, 132, 252, 0.35))";
  }
  const breath = Math.sin((now || 0) * 0.0044 + 1.2);
  ctx.translate(rv.x, rv.y + sinkY);
  ctx.scale(rv.facing * (1 - breath * 0.014), 1 + breath * 0.022);

  const C = rv.chibi || (typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: rv.handle, name: rv.name }) : null);
  const gender = (C && C.gender) || "male";
  const expr = (C && C.expr) || 3;
  const hair = (C && C.hair != null) ? C.hair : 7;
  const eq = (C && C.eq) || {};
  const resolveLayer = id => (id && typeof CHIBI_ITEMS !== "undefined" && CHIBI_ITEMS[id] && CHIBI_ITEMS[id].layerKey) ? CHIBI_ITEMS[id].layerKey : id;
  const backId = resolveLayer(eq.back || null);
  const armorId = resolveLayer(eq.armor || rv.armor || "armor_10");
  const faceId = resolveLayer(eq.face || null);
  const hatId = resolveLayer(eq.hat || rv.hat || "hat_10");
  const wpnId = resolveLayer(eq.wpn || rv.wpn || "wpn_10");
  const hideHair = ["hat_2", "hat_3", "hat_4", "hat_6", "hat_8", "hat_9", "hat_10", "hat_11", "hat_12", "abra_helm"].includes(hatId);

  if (backId) drawCachedLayer(ctx, `img/chibi/layers/${backId}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/neck_${gender}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/${armorId}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/head_expr_${expr}.webp`, -44, -104, 88, 112);
  if (faceId) drawCachedLayer(ctx, `img/chibi/layers/${faceId}.webp`, -44, -104, 88, 112);
  if (hair > 0 && !hideHair) drawCachedLayer(ctx, `img/chibi/layers/hair_${hair}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/${hatId}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/${wpnId}.webp`, -44, -104, 88, 112);
  if (!armorId) drawCachedLayer(ctx, `img/chibi/layers/hand_grip.webp`, -44, -104, 88, 112);

  // Rival's Eternal Youth Baby Dragon on Shoulder!
  ctx.save();
  const wingBob = Math.sin((now || 0) * 0.0085 + 1.5) * 4.5;
  ctx.translate(24, -56 + wingBob);
  drawCachedLayer(ctx, `img/dr-${rv.el || "firtina"}-yavru.webp`, -20, -22, 48, 44);
  ctx.restore();
  ctx.restore();

  const rvLabel = `RAKİP: ${(rv.handle || rv.name || "KUZEY RÜZGÂRI").toUpperCase()}`;
  drawWorldHpBar(ctx, rv.x, rv.y - 120, 96, rv.hp, rv.maxHp, "#ff7a6a", rvLabel, rv);
  ctx.restore();
}

function onRemoteTopcuPvpSync(msg) {
  if (!msg) return;
  if (typeof msg.action === "string" && msg.action.indexOf("queue_") === 0) { onPvpQueueMessage(msg); return; }
  const meH = (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
  if (msg.action === "accept_invite") {
    const room = SHM.pvpActiveRoom;
    if (!room || !room.isHost || room.id !== msg.roomId || (msg.to && msg.to !== meH)) return;
    if (room.slots.some(s => s.handle === msg.from)) return;
    let slot = room.slots[msg.slot];
    if (!slot || slot.kind !== "empty") slot = room.slots.find(s => s.kind === "empty");
    if (!slot) return;
    Object.assign(slot, { kind: "peer", handle: msg.from, name: msg.from, sub: "Davetli Oyuncu", ready: true });
    pvpSyncRoomCounts(room);
    if (typeof toast === "function") toast("✅ <b>" + msg.from + "</b> odaya katıldı!", "goal");
    if (SHM.open && SHM.screen === "pvp_lobby") renderSahmeranApp();
    return;
  }
  if (msg.action === "invite" && msg.roomId && String(msg.roomId).indexOf("room_custom_") === 0) {
    let info = {};
    try { info = msg.text ? JSON.parse(msg.text) : {}; } catch (e) { info = {}; }
    SHM.pendingInvite = { from: msg.from, roomId: msg.roomId, mapId: msg.mapId, slot: msg.slot, name: info.name || "Özel Oda", mode: info.mode || "1v1", host: info.host || msg.from };
    if (typeof toast === "function") toast("<b>📨 Oda Daveti</b><br><b>" + msg.from + "</b> seni <b>" + SHM.pendingInvite.name + "</b> odasına çağırıyor. Topçu Er Meydanı lobisinden katıl.", "goal");
    if (SHM.open && SHM.screen === "pvp_lobby") renderSahmeranApp();
    return;
  }
  if (msg.action === "invite" && msg.raidId) {
    if (typeof toast === "function") toast("<b>🏰 Sefer Daveti</b><br><b>" + msg.from + "</b> seni zindan seferine çağırıyor.", "goal");
    return;
  }
  if (msg.action === "invite") {
    const mapCfg = PVP_ARENA_MAPS[msg.mapId || "skybridge"] || PVP_ARENA_MAPS.skybridge;
    if (typeof toast === "function") {
      toast(`<b>⚔️ Canlı Ejder Topçusu PvP Düello Daveti!</b><br><b>${msg.from || "@gezgin_topcu"}</b> seni <b>${mapCfg.name}</b> arenasında canlı düelloya çağırıyor!`, "goal");
    }
    return;
  }
  if (!SHM.open) return;
  if (msg.action === "join_map") {
    if (SHM.screen === "pvp_lobby") renderSahmeranApp();
    return;
  }
  if (SHM.gameMode !== "pvp") return;
  if (msg.action === "move_aim" && SHM.pvpRival && !SHM.pvpRival.dead && SHM.player) {
    const rv = SHM.pvpRival;
    rv.isLivePlayer = true;
    rv.handle = msg.from || rv.handle;
    rv.name = `Canlı Rakip (${msg.from || "@gezgin_topcu"})`;
    if (msg.chibi) rv.chibi = msg.chibi;
    if (msg.el) rv.el = msg.el;
    if (typeof msg.x === "number") {
      const mirroredX = Math.max(2160, Math.min(3020, 3400 - msg.x));
      if (SHM.heightMap && SHM.heightMap[Math.round(mirroredX)] < 1420) {
        rv.x = mirroredX;
        rv.y = SHM.heightMap[Math.round(mirroredX)];
      }
    }
    if (typeof msg.angle === "number") rv.aimAngle = msg.angle;
    return;
  }
  if (msg.action === "turn_handoff" && SHM.pvpRival) {
    SHM.pvpRival.isLivePlayer = true;
    if (msg.chibi) SHM.pvpRival.chibi = msg.chibi;
    if (typeof msg.wind === "number") {
      SHM.wind = -msg.wind;
      updateBattleHudDom();
    }
    return;
  }
  if (msg.action === "hit" && SHM.pvpRival && msg.rivalHp != null) {
    SHM.pvpRival.hp = Math.max(0, msg.rivalHp);
    updateBattleHudDom();
  } else if (msg.action === "fire" && SHM.pvpRival && !SHM.pvpRival.dead && SHM.player) {
    if (SHM._liveRivalTimeout) {
      clearTimeout(SHM._liveRivalTimeout);
      SHM._liveRivalTimeout = null;
    }
    const rv = SHM.pvpRival;
    rv.isLivePlayer = true;
    rv.handle = msg.from || rv.handle;
    rv.name = `Canlı Rakip (${msg.from || "@gezgin_topcu"})`;
    if (msg.chibi) rv.chibi = msg.chibi;
    if (msg.el) rv.el = msg.el;
    rv.state = "fire";
    rv.animTimer = 32;
    const rad = ((msg.angle || 42) * Math.PI) / 180;
    const spd = 5.2 + ((msg.power || 68) / 100) * 21.5;
    const dir = rv.x > SHM.player.x ? -1 : 1;
    SHM.projectiles.push({
      owner: "enemy",
      x: rv.x + dir * 32,
      y: rv.y - 54,
      vx: Math.cos(rad) * spd * dir,
      vy: -Math.sin(rad) * spd,
      r: 13,
      dmg: msg.dmg || 260,
      blastRadius: 68,
      craterRadius: 56,
      el: msg.el || rv.el || "firtina",
      trail: []
    });
    addFloatText(rv.x, rv.y - 116, `${msg.from || "@rakip"} CANLI ATIŞ YAPTI!`, "#38bdf8", 19, true);
    if (SHM.turn === "enemy") {
      setTimeout(() => {
        if (SHM.cam && SHM.cam.lockedUnit === rv) SHM.cam.lockedUnit = null;
        const waitCheck = setInterval(() => {
          if (!SHM.open || SHM.screen !== "battle") {
            clearInterval(waitCheck);
            return;
          }
          if (SHM.projectiles.length === 0 && (SHM.cam.impactHoldTimer || 0) <= 0) {
            clearInterval(waitCheck);
            startNewPlayerTurn();
          }
        }, 70);
      }, 150);
    }
  } else if (msg.action === "taunt" && SHM.pvpRival) {
    addFloatText(SHM.pvpRival.x, SHM.pvpRival.y - 120, `“${msg.text || "Nişanın şaştı terbiyeci!"}”`, "#fbbf24", 19, true);
  }
}

if (typeof window !== "undefined") {
  window.PVP_ARENA_MAPS = PVP_ARENA_MAPS;
  window.PVP_PRIMARY_MAP_IDS = PVP_PRIMARY_MAP_IDS;
  window.queueQuickMatch = queueQuickMatch;
  window.initTopcuPvpStage = initTopcuPvpStage;
  window.onRemoteTopcuPvpSync = onRemoteTopcuPvpSync;
}
if (typeof global !== "undefined") {
  global.PVP_ARENA_MAPS = PVP_ARENA_MAPS;
  global.PVP_PRIMARY_MAP_IDS = PVP_PRIMARY_MAP_IDS;
  global.queueQuickMatch = queueQuickMatch;
  global.initTopcuPvpStage = initTopcuPvpStage;
  global.onRemoteTopcuPvpSync = onRemoteTopcuPvpSync;
}

