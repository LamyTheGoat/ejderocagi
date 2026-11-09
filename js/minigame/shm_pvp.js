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

/* ---------------- ENG-14 · CANLI 1v1 MAÇ EŞİTLEMESİ ----------------
   Tek yetkili model: atan taraf `fire` + `hit {dmg}` bildirir; ALICI hasarı kendi canına yazar ve
   `hp_sync {hp,maxHp}` ile gerçek canını geri bildirir (atan taraf rakip canını buna eşitler).
   Tur sırası sunucunun seçtiği ilk tur sahibiyle başlar ve `turn_handoff {turnNo}` ile ilerler.
   Rüzgâr sunucu tohumundan tur numarasıyla iki tarafta aynı üretilir (her taraf kendini solda gördüğü için
   mavi yuva dışındaki taraf işareti ters çevirir). Canı biten taraf `pvp_match_result {lose}` gönderir;
   sunucu iki tarafa tek `pvp_match_end {winner}` yollar. Canlı rakip varken yerel bot ATIŞ YAPMAZ.
   Ödül/altın/ün yazılmaz (kullanıcı kararı). */

function pvpSelfHandle() {
  return (SHM.pvpLive && SHM.pvpLive.me) || (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
}

function pvpIsLive() {
  return !!(SHM.pvpLive && SHM.pvpLive.matchId && !SHM.pvpLive.ended && SHM.gameMode === "pvp");
}

function pvpMulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Tur numarasına göre iki tarafta aynı rüzgâr (mavi yuvanın bakışında); kırmızı yuva işareti çevirir.
function pvpWindFor(turnNo, live = SHM.pvpLive, mapId = SHM.pvpMap) {
  if (!live) return 0;
  const rnd = pvpMulberry(((live.seed | 0) ^ Math.imul((turnNo | 0) + 1, 0x9E3779B1)) >>> 0);
  rnd(); // ilk değer tohuma çok yakın, atla
  const span = mapId === "glacier" ? 3.2 : 2.1;
  const w = +((rnd() * 2 - 1) * span).toFixed(1);
  return (live.sign || 1) * w;
}

function pvpSyncSend(action, fields = {}) {
  if (!pvpIsLive() || typeof mpSendWs !== "function") return;
  mpSendWs(Object.assign({ type: "pvp_sync", action, turnNo: SHM.pvpLive.turnNo }, fields));
}

function pvpSendHpSync() {
  if (!SHM.player) return;
  pvpSyncSend("hp_sync", { hp: Math.round(SHM.player.hp), maxHp: Math.round(SHM.player.maxHp) });
}

// Sunucunun TEK başlangıç mesajından canlı maç durumu.
function pvpLiveFromStart(msg) {
  const slots = Array.isArray(msg.slots) ? msg.slots : [];
  const me = msg.you;
  const rivalSlot = slots.find(s => s && s.kind !== "empty" && s.handle !== me) || {};
  return {
    matchId: msg.matchId, roomId: msg.roomId, me, rival: msg.rival || rivalSlot.handle || null,
    rivalChibi: rivalSlot.chibi || null, rivalEl: rivalSlot.el || null,
    seed: msg.seed | 0, firstTurn: msg.firstTurn, turnNo: 0,
    sign: slots[0] && slots[0].handle === me ? 1 : -1,
    quick: !!msg.quick, mapId: msg.mapId, peerConnected: true, peerLeftAt: 0, graceMs: 30000,
    ended: false, reportedDefeat: false, inited: null,
    stats: { shots: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, turns: 0 }
  };
}

function pvpLaunchMatch(mapId, mode, opts = {}) {
  SHM.pvpTeamMode = "1v1";
  SHM.pvpMap = mapId;
  SHM.pvpLive = opts.live || null;
  SHM.pvpPractice = opts.practice || null;
  SHM.pvpResult = null;
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
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("powerup_arm");
  SHM.gameMode = "pvp";
  SHM.entryContext = "pvp_arena";
  SHM.screen = "battle";
  initTopcuPvpStage(mapId, "1v1");
  renderSahmeranApp();
}

// Alıcı taraf: rakibin bildirdiği hasarı KENDİ canına yazar (savunma: kalkan/zırh, mevcut kurallar).
function pvpApplyIncomingHit(rawDmg) {
  const p = SHM.player;
  if (!p || !pvpIsLive()) return;
  let dmg = Math.max(0, Math.round(Number(rawDmg) || 0));
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  if (C && C.eq && (C.eq.armor === "armor_11" || C.eq.armor === "abra_armor")) dmg = Math.round(dmg * 0.50);
  else if (C && C.eq && (C.eq.armor === "armor_9" || C.eq.armor === "armor_10")) dmg = Math.round(dmg * 0.65);
  if (p.shield > 0) { dmg = Math.round(dmg * 0.40); p.shield--; }
  if (p.ghostHp == null) p.ghostHp = p.hp;
  p.ghostHoldTimer = 18; p.hitFlash = 8;
  p.hp = Math.max(0, p.hp - dmg);
  p.rage = Math.min(100, p.rage + 18);
  p.animState = "hit"; p.animTimer = 28;
  SHM.pvpLive.stats.dmgTaken += dmg;
  addFloatText(p.x, p.y - 92, `-${dmg} HASAR!`, "#ff7a6a", 21, true);
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
  pvpSendHpSync();
  updateBattleHudDom();
  if (p.hp <= 0 && (p.revivesLeft ?? 1) <= 0) pvpReportDefeat();
}

function pvpReportDefeat() {
  const L = SHM.pvpLive;
  if (!L || L.ended || L.reportedDefeat) return;
  L.reportedDefeat = true;
  SHM.turn = "over";
  if (typeof mpSendWs === "function") mpSendWs({ type: "pvp_match_result", matchId: L.matchId, result: "lose" });
  if (typeof triggerTurnBanner === "function") triggerTurnBanner("CANIN BİTTİ", "Sonuç bekleniyor…", "enemy");
}

// Sıra rakibe geçti (atış bitti, pas ya da süre doldu).
function pvpHandOffTurn() {
  const L = SHM.pvpLive;
  pvpSendHpSync();
  L.turnNo += 1;
  mpSendWs({ type: "pvp_sync", action: "turn_handoff", turnNo: L.turnNo, wind: pvpWindFor(L.turnNo) });
  SHM.wind = pvpWindFor(L.turnNo);
  pvpTickCalderaMagma();
}

function pvpTickCalderaMagma() {
  if (SHM.pvpMap === "forge" || SHM.pvpMap === "dragon_caldera") {
    SHM.waterRaise = Math.min(72, (SHM.waterRaise || 0) + 10);
    if (SHM.player) addFloatText(SHM.player.x, SHM.player.y - 115, "KALDERA MAGMASI YÜKSELİYOR!", "#ef7f3e", 18, true);
  }
}

function pvpClearLiveTimers() {
  if (SHM._liveRivalTimeout) { clearTimeout(SHM._liveRivalTimeout); SHM._liveRivalTimeout = null; }
  if (SHM._pvpHandoffWait) { clearInterval(SHM._pvpHandoffWait); SHM._pvpHandoffWait = null; }
}

// Sunucunun tek sonucu: iki tarafta aynı kazanan (biri Zafer biri Yenilgi).
function pvpOnMatchEnd(msg) {
  const L = SHM.pvpLive;
  if (!L || msg.matchId !== L.matchId || L.ended) return;
  L.ended = true;
  pvpClearLiveTimers();
  SHM.charging = false;
  SHM.turn = "over";
  SHM.pvpResult = {
    live: true, win: msg.winner === L.me, winner: msg.winner, loser: msg.loser, reason: msg.reason,
    rival: L.rival, mapId: L.mapId || SHM.pvpMap, quick: L.quick, stats: Object.assign({}, L.stats),
    roomId: L.roomId, rematchSent: false, rematchFrom: null, peerGone: msg.reason !== "ko" && msg.winner === L.me
  };
  if (typeof SFX !== "undefined" && SFX.play) SFX.play(SHM.pvpResult.win ? "win" : "ko");
  if (!SHM.open) return;
  SHM.screen = "pvp_result";
  renderSahmeranApp();
}

// Bot provası ya da yerel (çevrimdışı) maç: ödülsüz sonuç ekranı.
function pvpFinishLocal(win) {
  pvpClearLiveTimers();
  SHM.turn = "over";
  SHM.pvpResult = {
    live: false, practice: true, win: !!win, rival: (SHM.pvpRival && SHM.pvpRival.handle) || null, mapId: SHM.pvpMap,
    stats: { shots: 0, hits: 0, dmgDealt: Math.round((SHM.stats && SHM.stats.totalDmg) || 0), dmgTaken: 0, turns: 0 }
  };
  SHM.screen = "pvp_result";
  renderSahmeranApp();
}

function pvpOnPeerLeft(msg) {
  const L = SHM.pvpLive;
  if (!L || L.ended || msg.matchId !== L.matchId) return;
  L.peerConnected = false;
  L.peerLeftAt = Date.now();
  L.graceMs = msg.graceMs || 30000;
  if (typeof pvprShowPeerOverlay === "function") pvprShowPeerOverlay();
}

function pvpOnPeerBack(msg) {
  const L = SHM.pvpLive;
  if (!L || L.ended || msg.roomId !== L.roomId) return;
  L.peerConnected = true;
  if (typeof pvprShowPeerOverlay === "function") pvprShowPeerOverlay();
  if (typeof toast === "function") toast(`<b>${msg.handle}</b> geri bağlandı. Maç sürüyor.`, "goal");
}

const FOOT_SINK_Y = 14; // Layer 3: 3/4 Perspective Foot Sink Offset so Chibi feet stand inside the grass/stone strip

function initTopcuPvpStage(mapId = "steppe_canyon", teamMode = null) {
  // ENG-14: harita görseli geç yüklenince arazi yeniden kurulur; canlı maçta can/tur/rüzgâr durumu korunur.
  const liveKeep = (SHM.pvpLive && SHM.pvpLive.inited && SHM.pvpLive.inited === SHM.pvpLive.matchId && SHM.player && SHM.pvpRival)
    ? { player: SHM.player, rival: SHM.pvpRival, turn: SHM.turn, wind: SHM.wind, turnTimer: SHM.turnTimer, waterRaise: SHM.waterRaise }
    : null;
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

  // ENG-14: rakip yalnız sunucunun başlangıç mesajından gelir (canlı maç) ya da bot provasıdır; MP.pvpPeers tahmini yok.
  const L = SHM.pvpLive && SHM.pvpLive.matchId ? SHM.pvpLive : null;
  const practiceRival = SHM.pvpPractice && SHM.pvpPractice.rival ? SHM.pvpPractice.rival : null;
  const liveHandle = L ? L.rival : null;
  const livePeerData = L ? { chibi: L.rivalChibi, el: L.rivalEl } : (practiceRival ? { chibi: null, el: practiceRival.el } : null);
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
    name: liveHandle ? `Canlı Rakip (${liveHandle})` : (practiceRival ? `${practiceRival.name || practiceRival.handle} (Bot)` : "Kuzey Rüzgârı"),
    handle: liveHandle || (practiceRival && practiceRival.handle) || "@kuzey_ruzgari",
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
  if (L) {
    // Sunucu: ilk tur sahibi ve rüzgâr tohumu iki tarafta aynı.
    SHM.wind = pvpWindFor(L.turnNo, L, SHM.pvpMap);
    SHM.turn = L.firstTurn === L.me ? "player" : "enemy";
  }
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

  if (!liveKeep) {
    triggerTurnBanner(
      L ? (SHM.turn === "player" ? "İLK ATIŞ SENDE" : "İLK ATIŞ RAKİPTE") : `TOPÇU ER MEYDANI (${SHM.pvpTeamMode.toUpperCase()}) · ${mapDef.name.toUpperCase()}`,
      L ? `${mapDef.name} · Rakip: ${L.rival}` : (isGroundMap ? "Toprak Katmanlarını Parçala veya Kemer Tünelinden Nişan Al!" : "Uçan Adaları Parçala ve Rakipleri Boşluğa Düşür!"),
      SHM.turn === "enemy" ? "enemy" : "player"
    );
  }

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

  if (liveKeep) {
    // Yalnız arazi yenilendi: canlı maçın can, konum, tur ve rüzgâr durumu aynen kalır.
    SHM.player = liveKeep.player;
    SHM.pvpRival = liveKeep.rival;
    SHM.pvpRivals = [liveKeep.rival];
    SHM.turn = liveKeep.turn;
    SHM.wind = liveKeep.wind;
    SHM.turnTimer = liveKeep.turnTimer;
    SHM.waterRaise = liveKeep.waterRaise;
    return;
  }
  if (L) {
    L.inited = L.matchId;
    if (SHM.turn === "player") L.stats.turns += 1;
    // Rakibe gerçek canımızı ve konumumuzu bildir (rakip ekranındaki can çubuğu ve yeri eşitlenir).
    pvpSendHpSync();
    pvpSyncSend("move_aim", { mapId: SHM.pvpMap, x: Math.round(SHM.player.x), y: Math.round(SHM.player.y), facing: SHM.player.facing, angle: Math.round(SHM.player.angle) });
    if (SHM.turn === "enemy") {
      setTimeout(() => { if (pvpIsLive() && SHM.turn === "enemy") executePvpRivalTurn(); }, SHM.fastSim ? 60 : 300);
    }
  }
}

function executePvpRivalTurn() {
  if (pvpIsLive()) {
    // Canlı rakip: yerel bot ATIŞ YAPMAZ. Rakibin `fire`/`turn_handoff` mesajı beklenir; kopmada sunucu karar verir.
    const rv = SHM.pvpRival;
    if (!rv) return;
    SHM.turn = "enemy";
    rv.isLivePlayer = true;
    SHM.cam.activeActor = { x: rv.x, y: rv.y - 75, zoom: 1.22, label: rv.name };
    triggerTurnBanner("RAKİBİN SIRASI", `${SHM.pvpLive.rival} nişan alıyor…`, "enemy");
    updateBattleHudDom();
    return;
  }
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

// ENG-14: sunucu `pvp_sync`i yalnız odadaki rakibe yollar; istemci yine de maç/oda/gönderen filtresi uygular.
function onRemoteTopcuPvpSync(msg) {
  if (!msg) return;
  if (msg.action === "invite" && msg.raidId) {
    const me = (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
    if (msg.to && msg.to !== me) return;
    if (typeof toast === "function") toast("<b>🏰 Sefer Daveti</b><br><b>" + msg.from + "</b> seni zindan seferine çağırıyor.", "goal");
    return;
  }
  const L = SHM.pvpLive;
  if (!L || L.ended || !msg.matchId || msg.matchId !== L.matchId || msg.from !== L.rival) return;
  if (!SHM.open || SHM.gameMode !== "pvp" || SHM.screen !== "battle" || !SHM.player || !SHM.pvpRival) return;
  const rv = SHM.pvpRival;
  rv.isLivePlayer = true;
  if (msg.chibi) rv.chibi = msg.chibi;
  if (msg.el) rv.el = msg.el;
  if (msg.action === "move_aim") {
    if (typeof msg.x === "number") {
      const mirroredX = Math.max(2160, Math.min(3020, 3400 - msg.x));
      if (SHM.heightMap && SHM.heightMap[Math.round(mirroredX)] < 1420) {
        rv.x = mirroredX;
        rv.y = typeof findLocalGroundY === "function" ? findLocalGroundY(Math.round(mirroredX), rv.y) : SHM.heightMap[Math.round(mirroredX)];
      }
    }
    if (typeof msg.facing === "number") rv.facing = -msg.facing;
    if (typeof msg.angle === "number") rv.aimAngle = msg.angle;
    return;
  }
  if (msg.action === "hp_sync") {
    // Rakibin kendi yazdığı gerçek can: atan taraftaki tahmin buna eşitlenir.
    if (typeof msg.maxHp === "number" && msg.maxHp > 0) rv.maxHp = msg.maxHp;
    if (typeof msg.hp === "number") {
      if (rv.ghostHp == null || msg.hp > rv.hp) rv.ghostHp = msg.hp;
      rv.hp = Math.max(0, Math.min(rv.maxHp, msg.hp));
    }
    updateBattleHudDom();
    return;
  }
  if (msg.action === "hit") {
    pvpApplyIncomingHit(msg.dmg);
    return;
  }
  if (msg.action === "turn_handoff") {
    const next = Number(msg.turnNo);
    if (!Number.isInteger(next) || next <= L.turnNo) return; // yinelenen/eski devir
    L.turnNo = next;
    SHM.wind = pvpWindFor(L.turnNo);
    pvpTickCalderaMagma();
    updateBattleHudDom();
    if (SHM._pvpHandoffWait) clearInterval(SHM._pvpHandoffWait);
    const t0 = Date.now();
    // Rakibin mermisi bu ekranda hâlâ uçuyorsa düşmesini bekle (en çok 3,5 sn), sonra sıra bizde.
    SHM._pvpHandoffWait = setInterval(() => {
      if (!pvpIsLive() || !SHM.open || SHM.screen !== "battle") { clearInterval(SHM._pvpHandoffWait); SHM._pvpHandoffWait = null; return; }
      if ((SHM.projectiles.length === 0 && (SHM.cam.impactHoldTimer || 0) <= 0) || Date.now() - t0 > 3500) {
        clearInterval(SHM._pvpHandoffWait); SHM._pvpHandoffWait = null;
        SHM.projectiles = SHM.projectiles.filter(pr => !pr.remote);
        if (SHM.cam && SHM.cam.lockedUnit === rv) SHM.cam.lockedUnit = null;
        startNewPlayerTurn();
      }
    }, 70);
    return;
  }
  if (msg.action === "fire") {
    rv.state = "fire";
    rv.animTimer = 32;
    const rad = ((msg.angle || 42) * Math.PI) / 180;
    const spd = 5.2 + ((msg.power || 68) / 100) * 21.5;
    const dir = rv.x > SHM.player.x ? -1 : 1;
    // Görsel mermi: hasar bu ekranda HESAPLANMAZ (atan taraf `hit` ile bildirir).
    SHM.projectiles.push({
      owner: "enemy", remote: true,
      x: rv.x + dir * 32, y: rv.y - 54,
      vx: Math.cos(rad) * spd * dir, vy: -Math.sin(rad) * spd,
      r: 13, dmg: 0, blastRadius: 68, craterRadius: 56,
      el: msg.el || rv.el || "firtina", trail: []
    });
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("cannon_launch");
    addFloatText(rv.x, rv.y - 116, `${msg.from} ATEŞ ETTİ!`, "#38bdf8", 19, true);
    return;
  }
  if (msg.action === "taunt") {
    addFloatText(rv.x, rv.y - 120, `“${String(msg.text || "Nişanın şaştı!").slice(0, 60)}”`, "#fbbf24", 19, true);
  }
}

if (typeof window !== "undefined") {
  window.PVP_ARENA_MAPS = PVP_ARENA_MAPS;
  window.PVP_PRIMARY_MAP_IDS = PVP_PRIMARY_MAP_IDS;
  window.initTopcuPvpStage = initTopcuPvpStage;
  window.onRemoteTopcuPvpSync = onRemoteTopcuPvpSync;
  window.pvpWindFor = pvpWindFor;
}
if (typeof global !== "undefined") {
  global.PVP_ARENA_MAPS = PVP_ARENA_MAPS;
  global.PVP_PRIMARY_MAP_IDS = PVP_PRIMARY_MAP_IDS;
  global.initTopcuPvpStage = initTopcuPvpStage;
  global.onRemoteTopcuPvpSync = onRemoteTopcuPvpSync;
}
