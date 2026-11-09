/* ============================================================================
   EJDER TOPÇUSU — ÇEKİRDEK FİZİK, TURN MOTORU VE 60 FPS CANVAS RENDERER
   (js/minigame.js)
   Modüler alt sistemler:
   - js/minigame/shm_data.js
   - js/minigame/raids/raid_sahmeran.js
   - js/minigame/raids/raid_komutan.js
   - js/minigame/raids/raid_abra.js
   - js/minigame/shm_pvp.js
   - js/minigame/shm_ui.js
   ============================================================================ */

function launchBossMeteorRain(b, p, count, dmg, el, blastR) {
  if (!b || !p) return;
  const isAutomatedTest = typeof window === "undefined" || typeof requestAnimationFrame === "undefined";
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) * 0.5) * 105 + (isAutomatedTest ? 0 : (Math.random() - 0.5) * 36);
    const tx = Math.max(160, Math.min(SHM.WORLD_W - 160, p.x + offset));
    const sx = tx + (b.x > p.x ? 260 : -260);
    const sy = Math.max(120, p.y - 680 - i * 55);
    const flightT = 58 + i * 8;
    const dx = tx - sx;
    const dy = (p.y - 24) - sy;
    const vx = (dx / flightT) - 0.5 * SHM.wind * 0.0085 * flightT;
    const vy = (dy / flightT) - 0.5 * SHM.GRAVITY * flightT;
    SHM.projectiles.push({
      owner: "enemy",
      x: sx,
      y: sy,
      vx,
      vy,
      el: el || "magma",
      dmg: Math.round(dmg),
      blastRadius: blastR || 54,
      isBossSpecial: true,
      trail: []
    });
  }
}

/* ─── GLOBAL DUNGEON STATE ─── */
const SHM = {
  open: false,
  fastSim: false,
  bossActionBusy: false,
  bossAttackCutTimer: 0,
  comicMode: "prologue",
  raidId: "komutan",     // 'sahmeran' | 'komutan'
  screen: "lobby",       // 'lobby' | 'comic' | 'corridor' | 'battle' | 'victory' | 'studio'
  gameMode: "raid",      // 'raid' | 'duel'
  difficulty: "normal",  // 'normal' | 'zor' | 'ekstrem'
  instanceStage: 1,      // WoW-style sequential stage progression (1..4), hard-resets on leaving dungeon
  selectedStage: 1,
  stageIndex: 0,
  comicIdx: 0,
  wheelMode: "major",    // 'minor' (Stages 1..3 Öncü Ganimet Çarkı) | 'major' (Stage 4 Ulu Kader Çarkı)
  activeBlessings: [],
  allies: ["sureyya", "kuzey", "selin"],
  soloMode: false,

  corridor: {
    x: 14,
    y: 74,
    tx: 14,
    ty: 74,
    v: 0,
    ph: 0,
    f: 1,
    ff: 1,
    steleRead: false,
    brazierLit: false,
    gateOpened: false,
    msg: "İlerlemek için [A/D] veya Sol/Sağ ok tuşlarını kullan ya da taş köprüde istediğin noktaya tıkla!"
  },

  runBuffs: {
    dmgMult: 1.0,
    headshotMult: 2.7,
    maxHpBonus: 0,
    BonusStamina: 0,
    guideAlways: false,
    blessings: []
  },
  stats: {
    totalDmg: 0,
    maxCombo: 0,
    curCombo: 0,
    crownHits: 0,
    stalactitesDropped: 0,
    turnsTaken: 1,
    stagesCleared: 0,
    chestOpened: false,
    droppedLootIds: [],
    goldEarned: 0
  },

  WORLD_W: 3400,
  WORLD_H: 1550,
  GRAVITY: 0.24,
  terrainCanvas: null,
  terrainCtx: null,
  heightMap: new Float32Array(3400),
  waterRaise: 0,

  cam: {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    focusX: 460,
    focusY: 940,
    leadX: 95,
    leadY: 0,
    deadzoneX: 42,
    deadzoneY: 28,
    zoom: 1.28,
    tZoom: 1.28,
    mode: "follow",
    manualPan: false,
    lockedUnit: null,
    activeActor: null,
    impactHoldTimer: 0,
    impactX: 0,
    impactY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    camStartX: 0,
    camStartY: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0
  },

  turn: "player",
  turnTimer: 25,
  lastTick: 0,
  wind: 0,
  freezeFrames: 0,
  skyFlash: 0,

  player: null,
  boss: null,
  enemies: [],
  stalactites: [],
  urns: [],
  totems: [],
  geysers: [],
  shrines: [],
  mirrors: [],
  projectiles: [],
  particles: [],
  debris: [],
  shockwaves: [],
  floatTexts: [],
  acidBubbles: [],
  laserBeams: [], // Active visual beams for Twin Cobra Beam / Chain Whip / Blue Hellfire!

  keys: {},
  charging: false,
  power: 0,
  powerDir: 1,
  lastPower: 62,
  activeMods: {
    plus1: false,
    plus2: false,
    trident: false,
    heavy: false,
    crater: false,
    teleport: false,
    powUlt: false
  },

  dialogue: {
    speaker: "Başkomutan Kara Kor Ejderi Kalgarot",
    text: "Volkanik Kaldera'nın bazalt sütunları altında adımlarını dikkatli at, Ejder Çocuğu!",
    portrait: "img/komutan/komutan_closeup.webp",
    timer: 0
  },
  pip: null,
  stageClearModal: null,

  studioConcept: 1,
  studioAnim: "idle",
  studioAngle: 28,
  studioElement: "ates",

  entryContext: "pve_dungeon", // 'mode_select' | 'pve_dungeon' | 'pvp_arena'
  pvpMap: "steppe_canyon",
  pvpTeamMode: "1v1",          // '1v1' | '2v2'
  // ENG-14: sahte oda listesi kaldırıldı; odalar ve kuyruk sunucudan gelir (js/minigame/shm_pvp_rooms.js · PVPR).
  pvpLive: null,               // canlı 1v1 maç durumu (sunucunun başlangıç mesajından)
  pvpPractice: null,           // bot provası (ödülsüz)
  pvpResult: null,             // maç sonu ekranı verisi
  raidPartySlots: [null, null], // PvE Sefer Odası 2. ve 3. yuva (başlangıçta BOŞ)
  pvpAlly: null,
  pvpRivals: [],
  pvpTurnOrder: [],
  pvpTurnIdx: 0,
  armedPowerupName: "",
  armedPowerupTimer: 0
};

function isExtremeMode() {
  return (SHM.difficulty === "ekstrem" || SHM.difficulty === "extreme") || SHM.difficulty === "extreme";
}

function resetDungeonInstanceProgress() {
  SHM.instanceStage = 1;
  SHM.selectedStage = 1;
  SHM.stageIndex = 0;
  SHM.activeBlessings = [];
  SHM.wheelMode = "major";
  SHM.wheelWonSlice = null;
  SHM.wheelWonEquipItem = null;
  SHM.wheelSpinning = false;
  SHM.wheelSpinsCount = 0;
  if (SHM.runBuffs) {
    SHM.runBuffs.dmgMult = 1.0;
    SHM.runBuffs.headshotMult = 2.7;
    SHM.runBuffs.maxHpBonus = 0;
    SHM.runBuffs.BonusStamina = 0;
    SHM.runBuffs.guideAlways = false;
    SHM.runBuffs.blessings = [];
  }
}


function curCampaign() {
  const plugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  const base = (plugin && plugin.campaign) || RAID_CAMPAIGNS[SHM.raidId] || RAID_CAMPAIGNS.komutan;
  const stages = (plugin && plugin.normalStages) || (SHM.raidId === "abra"
    ? ABRA_NORMAL_STAGES
    : (SHM.raidId === "komutan" ? KOMUTAN_NORMAL_STAGES : SAHMERAN_NORMAL_STAGES));
  return Object.assign({}, base, {
    stages,
    maxStage: stages.length,
    badge: isExtremeMode()
      ? ((plugin && plugin.extremeBadge) || (SHM.raidId === "abra" ? "CEHENNEM · ZİNDAN III · 4 AŞAMA" : "CEHENNEM (KÂBUS) · 4 AŞAMA · 5 FAZ"))
      : ((plugin && plugin.normalBadge) || (SHM.raidId === "abra" ? "ZİNDAN III · 4 AŞAMA" : SHM.raidId === "komutan" ? "ZİNDAN II · 4 AŞAMA" : "ZİNDAN I · 4 AŞAMA"))
  });
}

function curLootList() {
  return RAID_LOOT_SETS[SHM.raidId] || RAID_LOOT_SETS.komutan;
}

function ensureSahmeranSave() {
  if (typeof S === "undefined" || !S) return { ownedLoot: [], clears: 0 };
  if (!S.sahmeranRaid) {
    S.sahmeranRaid = {
      ownedLoot: [],
      clears: 0,
      bestRank: "S+"
    };
  }
  return S.sahmeranRaid;
}


function calcMainDragonSynergy(starObj, chibiObj) {
  const star = starObj || (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor-Diş", el: "ates", st: { gu: 68, ce: 66, da: 68, ze: 66 }, bond: 75, gen: 2 };
  const st = star.st || { gu: 68, ce: 66, da: 68, ze: 66 };
  const gu = Math.max(10, Number(st.gu) || 68);
  const ce = Math.max(10, Number(st.ce) || 66);
  const da = Math.max(10, Number(st.da) || 68);
  const ze = Math.max(10, Number(st.ze) || 66);
  const bond = Math.max(0, Math.min(100, star.bond != null ? Number(star.bond) : 75));
  const gen = Math.max(1, star.gen != null ? Number(star.gen) : 2);
  const chInfo = typeof calcChibiStats === "function" ? calcChibiStats(chibiObj) : null;
  const setMult = (chInfo && chInfo.activeSet) ? 1.15 : 1.0;

  const hpBonus = Math.round((da * 3.5 + bond * 2.4 + gen * 45) * setMult);
  const staBonus = Math.round((ce * 0.25 + bond * 0.14 + gen * 3) * setMult);
  const critBonusPct = Math.min(48, Math.round(ze * 0.18 + ce * 0.10 + bond * 0.08 + gen * 2));
  const dmgBonusPct = Math.round(gu * 0.15 + bond * 0.08 + gen * 3 + (setMult > 1 ? 15 : 0));

  return {
    name: star.name || "Kor-Diş",
    gu,
    ce,
    da,
    ze,
    bond,
    gen,
    hpBonus,
    staBonus,
    critBonusPct,
    dmgBonusPct,
    activeSet: chInfo ? chInfo.activeSet : null
  };
}

function syncRaidSoloMode() {
  const slots = Array.isArray(SHM.raidPartySlots) ? SHM.raidPartySlots : (SHM.raidPartySlots = [null, null]);
  SHM.soloMode = !slots.some(Boolean);
  return SHM.soloMode;
}

function initSahmeranBattleStage(stageNum = 1) {
  if (SHM.gameMode === "raid") syncRaidSoloMode();
  const camp = curCampaign();
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const isEx = isExtremeMode();
  SHM.selectedStage = Math.max(1, Math.min(camp.maxStage, stageNum));
  const stageObj = camp.stages.find(s => s.stage === SHM.selectedStage) || camp.stages[camp.stages.length - 1];
  const preset = stageObj.preset || "kom_boss";

  const W = SHM.WORLD_W; // 3400
  const H = SHM.WORLD_H; // 1550
  SHM.waterRaise = 0;
  SHM.abraVortex = null;
  SHM.abraVanguardTail = null;
  SHM.activeTsunamis = [];
  SHM.abraScaleHits = [];
  SHM.abraActiveVfx = [];

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
  if (SHM.bgDecoCtx) {
    SHM.bgDecoCtx.clearRect(0, 0, W, H);
  }
  const tctx = SHM.terrainCtx;
  if (tctx) tctx.clearRect(0, 0, W, H);

  if (!SHM.heightMap || SHM.heightMap.length !== W) {
    SHM.heightMap = new Float32Array(W);
  }
  const hMap = new Float32Array(W);
  const plugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  if (typeof preloadRaidAssets === "function") {
    preloadRaidAssets(SHM.raidId);
  }
  for (let x = 0; x < W; x++) {
    if (plugin && typeof plugin.computeTerrainY === "function") {
      hMap[x] = plugin.computeTerrainY(x, W, SHM.selectedStage, preset);
    } else {
      hMap[x] = 1040;
    }
    SHM.heightMap[x] = Math.round(hMap[x]);
  }

  if (tctx && plugin && typeof plugin.paintTerrain === "function") {
    plugin.paintTerrain(tctx, hMap, W, H, preset);
  }

  if (SHM.bgDecoCanvas && typeof document !== "undefined") {
    if (!SHM.bgDecoCanvasDim) {
      SHM.bgDecoCanvasDim = document.createElement("canvas");
      SHM.bgDecoCanvasDim.width = W;
      SHM.bgDecoCanvasDim.height = H;
    }
    const dimCtx = SHM.bgDecoCanvasDim.getContext("2d");
    if (dimCtx) {
      dimCtx.clearRect(0, 0, W, H);
      dimCtx.save();
      dimCtx.filter = "brightness(0.48) saturate(0.58) contrast(0.90)";
      dimCtx.globalAlpha = 0.86;
      dimCtx.drawImage(SHM.bgDecoCanvas, 0, 0);
      dimCtx.restore();
    }
  }

  const star = (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor", el: "ates" };
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const syn = calcMainDragonSynergy(star, C);
  SHM.dragonSynergy = syn;
  const hasTier6Armor = C && C.eq && C.eq.armor === "armor_11";
  const hasTier5Armor = C && C.eq && (C.eq.armor === "armor_9" || C.eq.armor === "armor_10");
  const hasTier6Wings = C && C.eq && (C.eq.back === "back_9" || C.eq.back === "back_10");
  const hasTal10 = C && C.eq && C.eq.tal === "tal_10";
  const hasSofraBuff = typeof S !== "undefined" && S && S.sofraBuff && S.sofraBuff.week === S.week;
  const hasSpaBuff = typeof S !== "undefined" && S && S.spaBuff && S.spaBuff.week === S.week;
  const baseMaxHp = 1350 + syn.hpBonus + (SHM.runBuffs.maxHpBonus || 0) + (hasTier6Armor ? 550 : hasTier5Armor ? 300 : 0);
  const baseSta = 100 + syn.staBonus + (SHM.runBuffs.BonusStamina || 0) + (hasTier6Wings ? 40 : 25) + (hasSofraBuff ? 25 : 0);

  const starGenes = Array.isArray(star.genes) ? star.genes : [];
  const starEl2 = star.el2 || (star.parents && star.parents[1] && star.parents[1].el && star.parents[1].el !== star.el ? star.parents[1].el : null);

  const initPlayerX = (preset === "abra_boss")
    ? 980
    : (((SHM.gameMode === "raid" || SHM.gameMode === "caravan") && !SHM.soloMode) ? 580 : 460);
  SHM.player = {
    x: initPlayerX,
    y: SHM.heightMap[initPlayerX],
    vx: 0,
    vy: 0,
    facing: 1,
    angle: preset === "abra_1" ? 58 : 38,
    slopeAngle: 0,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    stamina: baseSta,
    maxStamina: baseSta,
    rage: hasTal10 ? 60 : 40,
    shield: 0,
    poison: 0,
    anchorBraced: false,
    anchorAimBonus: 0,
    el: star.el || "ates",
    starEl2,
    starGenes,
    isHybrid: !!(star.hybrid || starGenes.includes("H") || starEl2),
    hasSofraBuff,
    hasSpaBuff,
    walkPhase: 0,
    walkSpeed: 0,
    animState: "idle",
    animTimer: 0,
    dragonSynergy: syn,
    revivesLeft: (hasTier6Armor || hasTier5Armor || SHM.allies.includes("sureyya")) ? 2 : 1
  };

  // ZERO CLUTTER: All arena clutter arrays remain strictly empty!
  SHM.enemies = [];
  SHM.props = [];
  SHM.lavaPools = [];
  SHM.pvpRival = null;
  SHM.coopUnits = [];
  if ((SHM.gameMode === "raid" && !SHM.soloMode) || (SHM.gameMode === "caravan" && (SHM.caravanCoopCount || 0) > 0)) {
    const liveCoopHandles = (typeof MP !== "undefined" && MP.coopPeers) ? Object.keys(MP.coopPeers) : [];
    const maxSlots = SHM.gameMode === "caravan" ? Math.min(2, SHM.caravanCoopCount || 1) : 2;
    const compSlots = (preset === "abra_boss")
      ? [
          { x: 380, defaultComp: SHM_COMPANIONS[0] },
          { x: 880, defaultComp: SHM_COMPANIONS[1] }
        ].slice(0, maxSlots)
      : [
          { x: 350, defaultComp: SHM_COMPANIONS[0] },
          { x: 465, defaultComp: SHM_COMPANIONS[1] }
        ].slice(0, maxSlots);
    compSlots.forEach((slot, idx) => {
      const partySlot = SHM.gameMode === "raid" ? (SHM.raidPartySlots || [])[idx] : null;
      if (SHM.gameMode === "raid" && !partySlot) return; // boş yuva: yoldaş yok
      const liveH = (partySlot && partySlot.kind === "bot") ? null : (liveCoopHandles[idx] || null);
      const livePeer = liveH && MP.coopPeers[liveH] ? MP.coopPeers[liveH] : null;
      const comp = slot.defaultComp || SHM_COMPANIONS[idx] || SHM_COMPANIONS[0];
      const uHandle = liveH || comp.handle || ("@muttefik_" + (idx + 2));
      const uName = liveH ? `Canlı Müttefik (${liveH})` : comp.name;
      const uChibi = (livePeer && livePeer.chibi)
        || (comp && comp.chibi)
        || (typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: uHandle, name: uName }, idx) : null);
      const uX = slot.x;
      const uY = (SHM.heightMap && SHM.heightMap[uX]) || (SHM.player ? SHM.player.y : 960);
      SHM.coopUnits.push({
        id: comp ? comp.id : ("coop_" + idx),
        handle: uHandle,
        name: uName,
        isLivePlayer: !!liveH,
        x: uX,
        y: uY,
        facing: 1,
        hp: 1580,
        maxHp: 1580,
        ghostHp: 1580,
        shield: 1,
        el: (livePeer && livePeer.el) || (comp && comp.el) || (idx === 0 ? "buz" : "firtina"),
        chibi: uChibi,
        state: "idle",
        animTimer: 0
      });
    });
  }
  SHM.stalactites = [];
  SHM.urns = [];
  SHM.totems = [];
  SHM.geysers = [];
  SHM.shrines = [];
  SHM.mirrors = [];
  SHM.terrainProps = [];
  SHM.runeGenerators = [];
  SHM.vortexRings = [];
  SHM.projectiles = [];
  SHM.particles = [];
  SHM.debris = [];
  SHM.shockwaves = [];
  SHM.floatTexts = [];
  SHM.laserBeams = [];
  SHM.boss = null;
  SHM.turn = "player";
  SHM.turnTimer = 25;
  SHM.wind = +(Math.random() * 4.4 - 2.2).toFixed(1);
  SHM.activeMods = { plus1: false, plus2: false, trident: false, heavy: false, crater: false, teleport: false, anchor: false, powUlt: false };
  SHM.cooldowns = { teleport: 0, shield: 0, heal: 0, anchor: 0 };
  SHM.dangerZones = [];

  const diffMult = (SHM.difficulty === "ekstrem" || SHM.difficulty === "extreme") ? 1.45 : SHM.difficulty === "normal" ? 0.75 : 1.0;

  // Spawn Stage Enemies, Sub-Bosses, or Colossal Final Boss across the 3400px Arena!
  if (SHM.gameMode === "caravan") {
    SHM.props.push(
      { type: "wagon", x: 1380, y: SHM.heightMap[1380], yOff: 0, hp: 1200, maxHp: 1200, dead: false },
      { type: "crate", x: 960, y: SHM.heightMap[960], yOff: 0, dead: false },
      { type: "barrel", x: 1920, y: SHM.heightMap[1920], yOff: 0, dead: false }
    );
    SHM.enemies.push(
      {
        id: "caravan_raider_1",
        type: "drake",
        name: "Kervan Pusucusu Drake",
        hp: 720,
        maxHp: 720,
        x: 1760,
        y: SHM.heightMap[1760],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      },
      {
        id: "caravan_raider_2",
        type: "cobra",
        name: "Bozkır Haydudu Engerek",
        hp: 680,
        maxHp: 680,
        x: 2180,
        y: SHM.heightMap[2180],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      },
      {
        id: "caravan_raider_3",
        type: "wyvern",
        name: "Hava Akıncısı Wyvern",
        hp: 740,
        maxHp: 740,
        x: 2540,
        y: 590,
        baseY: 590,
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      }
    );
    triggerActionPip(
      "KERVAN YOLU PUSU SAVUNMASI · 1 AŞAMA",
      "Kervan Arabasını Koru & Haydutları İmha Et!",
      `Kervan Arabası sahanın ortasında! Tüm pusu haydutlarını imha ederek bölgesel cevher ve kor taşlarını kazan! ${SHM.caravanTriElement ? "(🔥❄️⚡ ÜÇLÜ ELEMENT SANCAĞI AKTİF: 2× CEVHER!)" : ""}`,
      SHM_ASSETS_PATHS.pvp_prop_wagon
    );
  } else if (SHM.gameMode === "duel") {
    SHM.enemies.push({
      id: "rival_demirhan",
      type: isKom ? "drake" : "cobra",
      name: "Demirhan & Karabela",
      hp: Math.round(1600 * diffMult),
      maxHp: Math.round(1600 * diffMult),
      x: 2480,
      y: SHM.heightMap[2480],
      facing: -1,
      state: "idle",
      animTimer: 0,
      dead: false
    });
  } else if (plugin && typeof plugin.spawnStage === "function") {
    plugin.spawnStage(preset, diffMult, isEx);
  }

  SHM.stageMechanic = {
    id: "tactical_artillery",
    title: isAbra ? "Batık Donanma & Girdap Boğazı Meydanı" : (isKom ? "Yanardağ Kalderası Topçu Meydanı" : "Sırça Saray Sütunlu Meydanı"),
    desc: "Sıra kimdeyse kamera o birime odaklanır; fareyle sürükleyerek sahayı serbestçe inceleyebilirsin."
  };

  SHM.skyParticles = [];
  for (let i = 0; i < 48; i++) {
    SHM.skyParticles.push({
      x: Math.random() * W,
      y: 80 + Math.random() * (H - 220),
      r: 1.8 + Math.random() * 3.2,
      baseVx: (Math.random() - 0.5) * 0.45,
      vy: isKom ? (-0.35 - Math.random() * 0.65) : (0.15 + Math.random() * 0.45),
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.55
    });
  }
  SHM.acidBubbles = [];
  for (let i = 0; i < 36; i++) {
    SHM.acidBubbles.push({
      x: Math.random() * W,
      y: H - 15 - Math.random() * 55,
      r: 3 + Math.random() * 6,
      spd: 0.4 + Math.random() * 0.9
    });
  }

  // If a Boss is present, telegraph an initial Danger Zone and trigger Dramatic Boss Entrance + Comic Clash Overlay!
  if (SHM.boss && !SHM.boss.dead) {
    SHM.dangerZones.push({
      x: SHM.player.x,
      y: SHM.player.y,
      radius: 130,
      dmg: isKom ? 240 : 210,
      el: isAbra ? "buz" : (isKom ? "magma" : "venom"),
      label: isAbra ? (SHM.boss.isAbra ? "ABRA ABİSAL SU HEDEFİ" : "GOLEM ÇAPA HEDEFİ") : (isKom ? "KALGAROT METEOR HEDEFİ" : "ŞAHMERAN SÜTUN HEDEFİ")
    });
    SHM.boss.state = "entrance_roar";
    SHM.boss.stateTimer = 120;
    SHM.boss.maxStateTimer = 120;
    SHM.skyFlash = 0;
    SHM.cam.shake = 6;
    SHM.shockwaves.push(
      { x: SHM.boss.x, y: SHM.boss.y - 170, r: 16, maxR: 290, color: isAbra ? "#38bdf8" : (isKom ? "#ef7f3e" : "#9ad07a"), alpha: 1 },
      { x: SHM.boss.x, y: SHM.boss.y - 170, r: 42, maxR: 380, color: "#ffe0a0", alpha: 0.85 }
    );
    const persona = getBossPersona(SHM.boss);
    setBossWorldBubble(SHM.boss, persona.entranceRoarLine, {
      speaker: SHM.boss.name,
      sfx: persona.entranceSfx || "KÜKRER!!",
      duration: 260,
      isTaunt: true
    });
    setDialogue(SHM.boss.name, persona.entranceRoarLine, persona.portrait);
    SHM.pendingEntranceComic = true;
    if (typeof document !== "undefined" && document.getElementById("shmComicIntroMount")) {
      SHM.pendingEntranceComic = false;
      triggerBossEntranceComic(SHM.boss);
    }
  } else {
    SHM.canvasBubble = null;
    SHM.pendingEntranceComic = false;
    if (isAbra) {
      setDialogue(
        "Haritacı Selin & Dede'nin Pusulası",
        SHM.selectedStage === 1
          ? `Aşama 1/4: Karkinoslar kıskaçlarını kalkan yapıyor! Yüksek açıyla (55°–75°) aşırtma atış yapıp kabuklarını kır!`
          : `Aşama 2/4: Ortadaki Girdap Hortumu alçak mermileri saptırır! Öncü dalgalara karşı Demir Çapa [G] kullan!`,
        SHM_ASSETS_PATHS.abraPortrait
      );
    } else if (isKom) {
      setDialogue(
        "Başkomutan Kara Kor Ejderi Kalgarot",
        `Aşama ${SHM.selectedStage}/${camp.maxStage}: Volkanik Kaldera'nın bazalt sütunları altında adımlarını dikkatli at, Ejder Çocuğu!`,
        SHM_ASSETS_PATHS.kom_closeup
      );
    } else {
      setDialogue(
        "Yılan Kraliçe Şahmeran",
        `Aşama ${SHM.selectedStage}/${camp.maxStage}: Sırça Saray'ın zümrüt sütunları arasına izinsiz giren her yabancı sınavdan geçer!`,
        SHM_ASSETS_PATHS.sah_closeup
      );
    }
  }

  // Dramatic Boss Entrance Camera Swoop -> Smooth Glide to Player!
  const hasBossIntroPan = !!(SHM.boss && !SHM.boss.dead && typeof requestAnimationFrame !== "undefined");
  SHM.cam.mode = hasBossIntroPan ? "intro_pan" : "follow";
  SHM.cam.introTimer = hasBossIntroPan ? 125 : 0;
  SHM.cam.manualPan = false;
  SHM.cam.zoom = hasBossIntroPan ? 1.22 : 1.28;
  SHM.cam.tZoom = hasBossIntroPan ? 1.22 : 1.28;
  SHM.cam.focusX = SHM.player.x;
  SHM.cam.focusY = SHM.player.y - 80;
  SHM.cam.leadX = SHM.player.facing * 95;
  SHM.cam.leadY = 0;
  SHM.cam.activeActor = hasBossIntroPan
    ? { x: SHM.boss.x, y: SHM.boss.y - 180, zoom: 1.22, label: SHM.boss.name }
    : { x: SHM.player.x, y: SHM.player.y - 80, zoom: 1.28, label: "SEN" };
  SHM.cam.x = hasBossIntroPan ? Math.max(0, SHM.boss.x - 420) : Math.max(0, SHM.player.x - 320);
  SHM.cam.y = hasBossIntroPan ? Math.max(0, SHM.boss.y - 380) : Math.max(0, SHM.player.y - 340);
  SHM.cam.tx = SHM.cam.x;
  SHM.cam.ty = SHM.cam.y;
}

function rebuildHeightMapFromCanvas() {
  if (!SHM.terrainCtx || SHM.gameMode !== "pvp") return;
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;
  const imgData = SHM.terrainCtx.getImageData(0, 0, W, H).data;
  for (let x = 0; x < W; x++) {
    let foundY = H - 60;
    // Start floor scan at y = 480 (below ceiling stalactites MOD-6 which sit at y = 0..320!)
    for (let y = 480; y < H; y++) {
      const a = imgData[(y * W + x) * 4 + 3];
      if (a > 120) {
        foundY = y;
        break;
      }
    }
    SHM.heightMap[x] = foundY;
  }
}

/* ─── MULTI-TIERED & CAVE-TUNNEL LOCAL GROUND DETECTOR (2D ALPHA-MASK) ─── */
function findLocalGroundY(x, currentY) {
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;
  const ix = Math.max(0, Math.min(W - 1, Math.round(x)));
  if (!SHM.terrainCtx || SHM.gameMode !== "pvp") {
    return (SHM.heightMap && SHM.heightMap[ix]) || 960;
  }
  const startY = Math.max(480, Math.min(H - 20, Math.round((currentY || SHM.heightMap[ix] || 900) - 42)));
  const scanH = H - startY;
  if (scanH <= 4) return (SHM.heightMap && SHM.heightMap[ix]) || 960;
  const colData = SHM.terrainCtx.getImageData(ix, startY, 1, scanH).data;
  let seenAir = false;
  for (let dy = 0; dy < scanH; dy += 2) {
    const a = colData[dy * 4 + 3];
    if (a <= 90) {
      seenAir = true;
    } else if (seenAir && a > 90) {
      return startY + dy;
    }
  }
  return (SHM.heightMap && SHM.heightMap[ix]) || 960;
}

function carveTerrainCrater(cx, cy, radius) {
  const tctx = SHM.terrainCtx;
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;
  const isKom = SHM.raidId === "komutan";

  // Spawn physical tumbling rock/ember debris chunks & rising crater smoke!
  const debrisCount = Math.min(20, Math.max(8, Math.round(radius / 4)));
  for (let i = 0; i < debrisCount; i++) {
    const ang = -Math.PI * (0.12 + Math.random() * 0.76);
    const spd = 3.2 + Math.random() * 8.5;
    SHM.debris.push({
      x: cx + (Math.random() - 0.5) * radius * 0.6,
      y: cy - 4,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2.2,
      r: 4 + Math.random() * 6.5,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.32,
      color: isKom ? (i % 3 === 0 ? "#ea580c" : "#2b1912") : (i % 3 === 0 ? "#d9b062" : "#4a3824"),
      rimColor: isKom ? "#ffb067" : "#a38352",
      life: 38 + Math.floor(Math.random() * 26),
      maxLife: 64
    });
  }
  for (let s = 0; s < 6; s++) {
    SHM.particles.push({
      x: cx + (Math.random() - 0.5) * radius * 0.7,
      y: cy - 6,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -1.2 - Math.random() * 1.8,
      r: 10 + Math.random() * 12,
      color: isKom ? "rgba(42, 24, 18, 0.55)" : "rgba(38, 32, 24, 0.50)",
      isSmoke: true,
      life: 34 + Math.floor(Math.random() * 20),
      maxLife: 54
    });
  }

  // Zindan (PvE) savaşlarında zemin yok edilemez! Sadece PvP arenalarında krater oyulur.
  if (SHM.gameMode !== "pvp") {
    return;
  }

  if (SHM.bgDecoCtx) {
    SHM.bgDecoCtx.save();
    SHM.bgDecoCtx.globalCompositeOperation = "destination-out";
    SHM.bgDecoCtx.beginPath();
    SHM.bgDecoCtx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    SHM.bgDecoCtx.fill();
    SHM.bgDecoCtx.restore();
  }

  if (!tctx) {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(W - 1, Math.ceil(cx + radius));
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = Math.sqrt(Math.max(0, radius * radius - dx * dx));
      if (cy + dy > SHM.heightMap[x]) {
        SHM.heightMap[x] = Math.min(H + 20, Math.round(cy + dy));
      }
    }
    return;
  }
  tctx.save();
  tctx.globalCompositeOperation = "destination-out";
  tctx.beginPath();
  tctx.arc(cx, cy, radius, 0, Math.PI * 2);
  tctx.fill();
  tctx.restore();

  tctx.save();
  tctx.globalCompositeOperation = "source-atop";
  tctx.strokeStyle = isKom ? "#ea580c" : "#d9b062";
  tctx.lineWidth = 6;
  tctx.beginPath();
  tctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  tctx.stroke();
  tctx.strokeStyle = "#160d08";
  tctx.lineWidth = 3;
  tctx.beginPath();
  tctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  tctx.stroke();
  tctx.restore();

  const x0 = Math.max(0, Math.floor(cx - radius - 6));
  const x1 = Math.min(W - 1, Math.ceil(cx + radius + 6));
  const stripW = x1 - x0 + 1;
  const data = tctx.getImageData(x0, 0, stripW, H).data;
  for (let lx = 0; lx < stripW; lx++) {
    let fy = H + 50;
    for (let y = 480; y < H; y += 2) {
      if (data[(y * stripW + lx) * 4 + 3] > 90) {
        fy = y;
        break;
      }
    }
    SHM.heightMap[x0 + lx] = fy;
  }
}

/* ─── DIALOGUE, TURN BANNER & ACTION CLOSE-UP PIP HELPERS ─── */
function triggerTurnBanner(kicker, title, kind = "player") {
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("turn_switch");
  if (typeof document === "undefined") return;
  const mount = document.getElementById("shmTurnBannerMount");
  if (!mount) return;
  mount.innerHTML = `
    <div class="shm-turn-toast ${kind}">
      <span class="shm-tt-kicker">${kicker}</span>
      <b class="shm-tt-title">${title}</b>
    </div>
  `;
  if (SHM._turnBannerTimeout) clearTimeout(SHM._turnBannerTimeout);
  SHM._turnBannerTimeout = setTimeout(() => {
    if (mount) mount.innerHTML = "";
  }, 1350);
}

function setDialogue(speaker, text, portrait) {
  SHM.dialogue = {
    speaker,
    text,
    portrait: portrait || curCampaign().closeupImg,
    timer: 360
  };
  if (typeof document === "undefined") return;
  const spEl = document.getElementById("shmDlgSpeaker");
  const txEl = document.getElementById("shmDlgText");
  const imEl = document.getElementById("shmDlgPortrait");
  if (spEl) spEl.textContent = speaker;
  if (txEl) txEl.textContent = `“${text}”`;
  if (imEl && portrait) imEl.src = portrait;
}

function triggerActionPip(kicker, title, desc, img) {
  SHM.pip = { kicker, title, desc, img: img || curCampaign().closeupImg, timer: 195 };
  if (typeof document === "undefined") return;
  const mount = document.getElementById("shmPipMount");
  if (mount) {
    mount.innerHTML = `
      <div class="shm-closeup-pip">
        <img src="${SHM.pip.img}" class="shm-pip-img" alt="">
        <div>
          <div class="shm-pip-kicker">${kicker}</div>
          <div class="shm-pip-title">${title}</div>
          <div class="shm-pip-desc">${desc}</div>
        </div>
      </div>
    `;
  }
}

function addFloatText(x, y, text, color = "#ffe0a0", size = 18, isCrit = null) {
  const autoCrit = isCrit !== null ? isCrit : (size >= 20 || text.includes("KRİTİK") || text.includes("BOZULDU") || text.includes("POW"));
  SHM.floatTexts.push({
    x: x + (Math.random() - 0.5) * 18,
    y,
    vx: (Math.random() - 0.5) * 1.8,
    vy: autoCrit ? -3.6 : -2.4,
    grav: 0.065,
    text,
    color,
    size: autoCrit ? Math.max(21, size) : size,
    isCrit: autoCrit,
    scale: autoCrit ? 1.62 : 1.25,
    life: autoCrit ? 92 : 76,
    maxLife: autoCrit ? 92 : 76
  });
}

/* ============================================================================
   PLAYER FIRING & EJDER TOPÇUSU PROJECTILE VOLLEY ENGINE
   ============================================================================ */
function firePlayerVolley(powerPct) {
  if (SHM.turn !== "player" || !SHM.player) return;
  const p = SHM.player;
  const pct = Math.max(8, Math.min(100, powerPct));
  SHM.lastPower = pct;
  SHM.lastShotAngle = p.angle;
  SHM.lastShotFacing = p.facing;
  SHM.charging = false;
  SHM.power = 0;
  SHM.cam.manualPan = false;
  SHM.cam.mode = "follow";

  if (typeof document !== "undefined") {
    const markEl = document.getElementById("shmPowerLastMark");
    if (markEl) markEl.style.left = pct + "%";
    const fillEl = document.getElementById("shmPowerFill");
    if (fillEl) fillEl.style.width = pct + "%";
    const readEl = document.getElementById("shmPowerReadout");
    if (readEl) readEl.innerHTML = `SON: <b>%${Math.round(pct)}</b>`;
  }

  SHM.turn = "projectile";
  SHM.stats.turnsTaken++;
  p.animState = SHM.activeMods.powUlt ? "ult_combo" : "dragon_shot";
  p.animTimer = 42;
  p.recoilOffset = -p.facing * 14;
  p.muzzleFlash = 9;
  SHM.cam.shake = Math.max(SHM.cam.shake, SHM.activeMods.powUlt ? 14 : 7);

  const truePitch = p.angle - (p.slopeAngle || 0);
  const dir = p.facing;
  const speed = 5.2 + (pct / 100) * 21.5;

  // Muzzle blast ring & dust kickback at player feet
  const aRad0 = (truePitch * Math.PI) / 180;
  const tipX = p.x + Math.cos(aRad0) * 44 * dir;
  const tipY = (p.y - 50) - Math.sin(aRad0) * 44;
  SHM.shockwaves.push({ x: tipX, y: tipY, r: 6, maxR: SHM.activeMods.powUlt ? 76 : 44, color: "#ffe0a0", alpha: 0.95 });
  spawnExplosionParticles(tipX, tipY, "#ffe0a0", SHM.activeMods.powUlt ? 22 : 12);

  let waves = 1;
  if (SHM.activeMods.plus1) waves += 1;
  if (SHM.activeMods.plus2) waves += 2;
  if (SHM.activeMods.powUlt) waves = 3;

  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const hasWpn11 = C && C.eq && (C.eq.wpn === "wpn_11" || C.eq.wpn === "abra_weapon");
  const hasWpn10 = C && C.eq && (C.eq.wpn === "wpn_10" || hasWpn11);
  const hasAbraTal = C && C.eq && C.eq.tal === "abra_talisman";
  const spreadAngles = SHM.activeMods.trident ? [-6, 0, 6] : [0];
  const soloMult = SHM.soloMode ? 1.40 : 1.0;
  const heavyMult = SHM.activeMods.heavy ? 1.5 : 1.0;
  const powMult = SHM.activeMods.powUlt ? 1.65 : 1.0;
  const wpnMult = hasWpn11 ? 1.35 : 1.0;
  const anchorMult = 1 + (p.anchorAimBonus || 0) + ((p.anchorBraced && hasAbraTal) ? 0.20 : 0);
  const sofraMult = (p.hasSofraBuff || (typeof S !== "undefined" && S && S.sofraBuff && S.sofraBuff.week === S.week)) ? 1.15 : 1.0;
  const hasPariltiGene = Array.isArray(p.starGenes) && p.starGenes.includes("P");
  const pariltiMult = hasPariltiGene ? 1.15 : 1.0;
  const synMult = 1 + (((p.dragonSynergy || SHM.dragonSynergy)?.dmgBonusPct || 0) * 0.005);
  const baseDmg = Math.round(210 * soloMult * heavyMult * powMult * wpnMult * anchorMult * sofraMult * pariltiMult * synMult * (SHM.runBuffs.dmgMult || 1));
  if (p.anchorAimBonus > 0) {
    addFloatText(p.x, p.y - 108, "⚓ DEMİR ÇAPA İSABET BONUSU (+%25 HASAR)!", "#38bdf8", 18, true);
    p.anchorAimBonus = 0;
  }
  const blastR = Math.round((SHM.activeMods.crater ? 88 : 54) * (SHM.activeMods.powUlt ? 1.35 : 1) * (hasWpn10 ? 1.25 : 1));
  const isTeleport = SHM.activeMods.teleport;
  if (isTeleport && SHM.cooldowns) {
    SHM.cooldowns.teleport = 2;
  }

  const el1 = p.el || "ates";
  const el2 = p.starEl2 || null;
  const hasEl = (eKey) => el1 === eKey || (p.isHybrid && el2 === eKey);

  if (SHM.activeMods.powUlt) {
    p.rage = 0;
    SHM.skyFlash = 24;
    triggerActionPip(
      "POW! %100 EJDER ÖFKESİ ULTİSİ",
      "Kadim Ocak Kıyameti!",
      "Yavru ejderhan ve silahın birleşerek 3 dalgalı yıkıcı element fırtınası ateşledi!",
      hasWpn11 ? SHM_ASSETS_PATHS.loot_ex_kom_wpn : SHM_ASSETS_PATHS.loot_kom_blade
    );
    if (typeof SFX !== "undefined" && SFX.play) {
      SFX.play("cannon_launch");
      SFX.play("roar");
    }
  } else {
    if (typeof SFX !== "undefined" && SFX.play) {
      SFX.play("cannon_launch");
      SFX.play("breath-" + (p.el || "ates"));
    }
  }

  const spawnWave = (wIdx) => {
    if (!SHM.open || SHM.screen !== "battle") return;
    spreadAngles.forEach(spDeg => {
      const aRad = ((truePitch + spDeg) * Math.PI) / 180;
      const vx = Math.cos(aRad) * speed * dir;
      const vy = -Math.sin(aRad) * speed;
      SHM.projectiles.push({
        owner: "player",
        x: p.x + dir * 28,
        y: p.y - 46,
        vx,
        vy,
        launchAngle: Math.round(p.angle),
        ignoreSelfGroundFrames: 3,
        el: hasWpn11 ? "bluekor" : el1,
        el2: p.isHybrid ? el2 : null,
        dmg: Math.round(baseDmg / (SHM.activeMods.trident ? 1.45 : 1)),
        blastRadius: blastR,
        isTeleport: isTeleport && wIdx === 0 && spDeg === 0,
        isPow: SHM.activeMods.powUlt,
        armorPierce: SHM.activeMods.crater || hasWpn10 || hasPariltiGene,
        goldenTrail: hasPariltiGene,
        windMult: hasEl("firtina") ? 0.5 : 1.0,
        skyLightningCrit: hasEl("firtina") && (truePitch + spDeg) >= 60,
        craterMult: hasEl("toprak") ? 2.0 : 1.0,
        leavesLavaPool: hasEl("ates"),
        chillsTarget: hasEl("buz"),
        canShadowSplit: hasEl("golge") && wIdx === 0 && spDeg === 0,
        trail: []
      });
    });
  };

  spawnWave(0);
  for (let w = 1; w < waves; w++) {
    setTimeout(() => spawnWave(w), w * (SHM.fastSim ? 110 : 180));
  }

  if (SHM.gameMode === "pvp" && typeof pvpIsLive === "function" && pvpIsLive()) {
    SHM.pvpLive.stats.shots += 1;
    mpSendWs({
      type: "pvp_sync",
      action: "fire",
      turnNo: SHM.pvpLive.turnNo,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Math.round(p.angle),
      power: Math.round(pct),
      facing: p.facing,
      el: p.el,
      dmg: Math.round(baseDmg)
    });
  } else if (SHM.gameMode === "raid" && !SHM.soloMode && typeof mpSendWs === "function") {
    mpSendWs({
      type: "dungeon_coop_sync",
      raidId: SHM.raidId,
      stage: SHM.selectedStage,
      action: "fire",
      from: (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi",
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Math.round(p.angle),
      power: Math.round(pct),
      el: p.el,
      dmg: Math.round(baseDmg)
    });
  }

  const hadPowerup = hasArmedPowerup();
  if (hadPowerup && typeof SFX !== "undefined" && SFX.play) {
    SFX.play("powerup_discharge");
  }
  SHM.activeMods = { plus1: false, plus2: false, trident: false, heavy: false, crater: false, teleport: false, powUlt: false };
  updateBattleHudDom();
}

/* ============================================================================
   PROJECTILE PHYSICS, COLOSSAL BOSS WEAK-SPOT CRITS & TURN RESOLUTION
   ============================================================================ */
function updateProjectilesAndHazards() {
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;

  if (SHM.bossAttackCutTimer > 0) {
    SHM.bossAttackCutTimer--;
  }

  for (let i = SHM.projectiles.length - 1; i >= 0; i--) {
    const pr = SHM.projectiles[i];
    if (pr.owner === "enemy" && SHM.bossAttackCutTimer > 0) {
      // Hold projectile windup while the Boss's special attack pose & comic cut-in play!
      if (Math.random() < 0.75) {
        const elCols = { ates: "#ef7f3e", buz: "#d9b062", firtina: "#c8a0f0", toprak: "#84cc16", golge: "#ff7a6a", venom: "#7ab05a", magma: "#ea580c", bluekor: "#7eb8d8" };
        SHM.particles.push({
          x: pr.x + (Math.random() - 0.5) * 28,
          y: pr.y + (Math.random() - 0.5) * 28,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.5) * 2.2,
          r: 4.2,
          color: elCols[pr.el] || "#ffe0a0",
          life: 12,
          maxLife: 12
        });
      }
      continue;
    }
    pr.vx += SHM.wind * 0.0085 * (pr.windMult != null ? pr.windMult : 1.0);
    pr.vy += SHM.GRAVITY;
    pr.x += pr.vx;
    pr.y += pr.vy;

    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 20) pr.trail.shift();

    // Shadow Dragon (Gölge): Mid-air split into a parallel Shadow Twin dealing +35% bonus damage!
    if (pr.owner === "player" && pr.canShadowSplit && !pr._shadowSplitDone && pr.vy > -1.2 && !pr.isTeleport) {
      pr._shadowSplitDone = true;
      SHM.projectiles.push({
        owner: "player",
        isShadowTwin: true,
        x: pr.x,
        y: pr.y + 18,
        vx: pr.vx * 1.04,
        vy: pr.vy + 1.4,
        el: "golge",
        dmg: Math.max(45, Math.round(pr.dmg * 0.35)),
        blastRadius: Math.round((pr.blastRadius || 52) * 0.75),
        armorPierce: pr.armorPierce,
        goldenTrail: pr.goldenTrail,
        windMult: pr.windMult,
        trail: []
      });
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 6, maxR: 64, color: "#c084fc", alpha: 0.9 });
      addFloatText(pr.x, pr.y - 28, "GÖLGE İKİZİ AYRILDI! (+%35 BONUS HASAR)", "#c084fc", 17, true);
    }

    // Emit live elemental sparks (and Golden Shimmer for P Gene!) along projectile flight path
    if (Math.random() < 0.65) {
      const elCols = { ates: "#ef7f3e", buz: "#d9b062", firtina: "#c8a0f0", toprak: "#84cc16", golge: "#ff7a6a", venom: "#7ab05a", magma: "#ea580c", bluekor: "#7eb8d8" };
      SHM.particles.push({
        x: pr.x + (Math.random() - 0.5) * 8,
        y: pr.y + (Math.random() - 0.5) * 8,
        vx: -pr.vx * 0.12 + (Math.random() - 0.5) * 1.4,
        vy: -pr.vy * 0.12 + (Math.random() - 0.5) * 1.4,
        r: pr.isPow ? 4.5 : (pr.goldenTrail ? 3.6 : 2.8),
        color: (pr.goldenTrail && Math.random() < 0.5) ? "#fde047" : (elCols[pr.el] || "#ffe0a0"),
        life: 14,
        maxLife: 14
      });
    }

    if (pr.x < -120 || pr.x > W + 120 || pr.y > H + 120) {
      SHM.projectiles.splice(i, 1);
      continue;
    }

    // Interactive Arena Props: Bounce Bumper Mushrooms, Wind Vortexes, Sandstorm Portals & Tesla Coils
    if (SHM.props && SHM.props.length > 0 && !pr.isTeleport) {
      for (const prop of SHM.props) {
        if (prop.dead) continue;
        if (prop.type === "bumper" && !pr._bouncedProp) {
          const dBmp = Math.hypot(pr.x - prop.x, pr.y - (prop.y - 28));
          if (dBmp <= 58) {
            pr._bouncedProp = true;
            pr.vy = -Math.max(7.5, Math.abs(pr.vy) * 1.12);
            pr.vx = pr.vx * 1.14;
            pr.dmg = Math.round(pr.dmg * 1.25);
            SHM.shockwaves.push({ x: prop.x, y: prop.y - 26, r: 8, maxR: 92, color: "#4ade80", alpha: 0.95 });
            addFloatText(prop.x, prop.y - 68, "TRAMBOLİN MANTAR SEKMESİ! (+%25 HASAR)", "#4ade80", 18, true);
            if (typeof SFX !== "undefined" && SFX.play) SFX.play("jump");
          }
        } else if (prop.type === "vortex" && !pr._vortexBoosted) {
          const dVtx = Math.hypot(pr.x - prop.x, pr.y - (prop.y - 30));
          if (dVtx <= 66) {
            pr._vortexBoosted = true;
            pr.vx = pr.vx * 1.28;
            pr.vy = pr.vy - 2.2;
            pr.dmg = Math.round(pr.dmg * 1.20);
            SHM.shockwaves.push({ x: prop.x, y: prop.y - 28, r: 10, maxR: 105, color: "#38bdf8", alpha: 0.95 });
            addFloatText(prop.x, prop.y - 72, "FIRTINA GİRDABI İVMESİ! (+%20 HASAR)", "#38bdf8", 18, true);
          }
        } else if (prop.type === "portal" && !prop.isExit && !pr._teleportedPortal) {
          const dPrt = Math.hypot(pr.x - prop.x, pr.y - (prop.y - 30));
          if (dPrt <= 68) {
            pr._teleportedPortal = true;
            const targetUnit = pr.owner === "player" ? SHM.pvpRival : SHM.player;
            const outX = targetUnit ? targetUnit.x : (prop.exitX || 2350);
            const outY = targetUnit ? (targetUnit.y - 235) : (prop.exitY || 710);
            SHM.laserBeams.push({ x1: prop.x, y1: prop.y - 28, x2: outX, y2: outY, color: "#2dd4bf", life: 36 });
            SHM.shockwaves.push({ x: prop.x, y: prop.y - 28, r: 10, maxR: 110, color: "#fbbf24", alpha: 0.95 });
            SHM.shockwaves.push({ x: outX, y: outY, r: 10, maxR: 115, color: "#2dd4bf", alpha: 0.95 });
            pr.x = outX;
            pr.y = outY;
            pr.vx = (Math.random() - 0.5) * 1.5;
            pr.vy = 9.2;
            pr.dmg = Math.round(pr.dmg * 1.30);
            pr.trail = [];
            addFloatText(prop.x, prop.y - 76, "ASTRAL KUMUL GEÇİDİ! (+%30 HASAR)", "#2dd4bf", 19, true);
            addFloatText(outX, outY - 36, "BOYUT YARIĞINDAN ÇIKTI!", "#fbbf24", 18, true);
          }
        } else if (prop.type === "tesla" && !pr._teslaCharged) {
          const dTsl = Math.hypot(pr.x - prop.x, pr.y - (prop.y - 34));
          if (dTsl <= 72) {
            pr._teslaCharged = true;
            pr.dmg = Math.round(pr.dmg * 1.35);
            SHM.shockwaves.push({ x: prop.x, y: prop.y - 34, r: 10, maxR: 120, color: "#38bdf8", alpha: 0.95 });
            addFloatText(prop.x, prop.y - 80, "PARATONER YÜKÜ! (+%35 MERMİ HASARI)", "#38bdf8", 18, true);
            const zapTarget = pr.owner === "player" ? SHM.pvpRival : SHM.player;
            if (zapTarget && !zapTarget.dead) {
              SHM.laserBeams.push({ x1: prop.x, y1: prop.y - 44, x2: zapTarget.x, y2: zapTarget.y - 48, color: "#38bdf8", life: 38 });
              zapTarget.hp = Math.max(0, zapTarget.hp - 160);
              zapTarget.hitFlash = 10;
              SHM.stats.totalDmg = (SHM.stats.totalDmg || 0) + 160;
              addFloatText(zapTarget.x, zapTarget.y - 112, "PARATONER ZİNCİR ŞOKU -160!", "#38bdf8", 20, true);
              if (zapTarget === SHM.pvpRival && zapTarget.hp <= 0) {
                zapTarget.dead = true;
              }
              updateBattleHudDom();
            }
          }
        }
      }
    }


    const activePlugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
    if (activePlugin && typeof activePlugin.onProjectileFlightTick === "function") {
      activePlugin.onProjectileFlightTick(pr);
    }

    // Check collision with Colossal Boss or Sub-Boss
    const b = SHM.boss;
    if (pr.owner === "player" && !pr.isTeleport && b && !b.dead) {
      if (activePlugin && typeof activePlugin.checkBossProjectileHit === "function" && activePlugin.checkBossProjectileHit(pr, b)) {
        SHM.projectiles.splice(i, 1);
        continue;
      }
      if (!b.isAbra) {
      const isColossalKom = !!b.isDragonCommander;
      const isSub = !!b.isSubBoss;
      const crownX = b.x + b.facing * (isColossalKom ? 42 : isSub ? 14 : 18);
      const crownY = b.y - (isColossalKom ? 315 : isSub ? 175 : 295);
      const heartX = b.x + b.facing * 24;
      const heartY = b.y - 190;
      const bodyX = b.x;
      const bodyY = b.y - (isColossalKom ? 185 : isSub ? 110 : 175);

      const distCrown = Math.hypot(pr.x - crownX, pr.y - crownY);
      const distHeart = isColossalKom ? Math.hypot(pr.x - heartX, pr.y - heartY) : 9999;
      const distBody = Math.hypot(pr.x - bodyX, pr.y - bodyY);
      const bodyHitBox = isColossalKom
        ? (Math.abs(pr.x - b.x) <= 165 && pr.y >= b.y - 385 && pr.y <= b.y + 15)
        : isSub
        ? (Math.abs(pr.x - b.x) <= 95 && pr.y >= b.y - 220 && pr.y <= b.y + 15)
        : (Math.abs(pr.x - b.x) <= 145 && pr.y >= b.y - 360 && pr.y <= b.y + 15);

      const synCritBonus = (((SHM.player && SHM.player.dragonSynergy) || SHM.dragonSynergy)?.critBonusPct || 0) * 0.008;
      if (isColossalKom && distHeart <= 64) {
        const tauntBonus = b.tauntExposed ? (1 + (b.tauntCritBonus || 0.35)) : 1;
        if (b.tauntExposed) {
          b.tauntExposed = false;
          b.tauntCritBonus = 0;
          addFloatText(b.x, b.y - 385, "LAF ATMA CEZASI! AÇIK YAKALANDI (+%35 KRİTİK)!", "#d9b062", 21, true);
        }
        const critMult = ((SHM.runBuffs.headshotMult || 2.7) + 0.2 + synCritBonus) * (SHM.allies.includes("selin") ? 1.30 : 1) * tauntBonus;
        const finalDmg = Math.round(pr.dmg * critMult);
        SHM.stats.crownHits++;
        SHM.stats.curCombo++;
        SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
        SHM.cam.impactHoldTimer = 28;
        SHM.cam.impactX = pr.x;
        SHM.cam.impactY = pr.y;
        applyDamageToBoss(finalDmg, true, `KOR KALP ÇEKİRDEĞİ KRİTİK! x${critMult.toFixed(1)} (-${finalDmg})`);
        const persona = getBossPersona(b);
        const wLine = (persona.weakHitLines || [])[SHM.stats.crownHits % Math.max(1, (persona.weakHitLines || []).length)];
        if (wLine) setBossWorldBubble(b, wLine, { sfx: "SARSILDI!!", color: "#d9b062", duration: 155 });
        if (b.apocalypseCharge > 0) {
          b.apocalypseCharge = 0;
          b.stunned = 1;
          addFloatText(b.x, b.y - 360, "SÜPERNOVA KIYAMETİ BOZULDU! +SERSEMLETME!", "#d9b062", 22, true);
        }
        SHM.freezeFrames = 10;
        SHM.cam.shake = 26;
        spawnExplosionParticles(pr.x, pr.y, "#d9b062", 46);
        SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 10, maxR: 165, color: "#ffe0a0", alpha: 1 });
        if (typeof SFX !== "undefined" && SFX.play) {
          SFX.play("crown_crit");
          SFX.play("crit");
        }
        SHM.projectiles.splice(i, 1);
        continue;
      } else if (distCrown <= (isSub ? 48 : 66)) {
        const tauntBonus = b.tauntExposed ? (1 + (b.tauntCritBonus || 0.35)) : 1;
        if (b.tauntExposed) {
          b.tauntExposed = false;
          b.tauntCritBonus = 0;
          addFloatText(b.x, b.y - 365, "LAF ATMA CEZASI! AÇIK YAKALANDI (+%35 KRİTİK)!", "#d9b062", 21, true);
        }
        const critMult = ((SHM.runBuffs.headshotMult || 2.6) + synCritBonus) * (SHM.allies.includes("selin") ? 1.30 : 1) * tauntBonus;
        const finalDmg = Math.round(pr.dmg * critMult);
        SHM.stats.crownHits++;
        SHM.stats.curCombo++;
        SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
        SHM.cam.impactHoldTimer = 28;
        SHM.cam.impactX = pr.x;
        SHM.cam.impactY = pr.y;
        const tag = isColossalKom ? `BOYNUZ KRİTİK VURUŞU! x${critMult.toFixed(1)} (-${finalDmg})` : `TAÇ KRİTİK VURUŞU! x${critMult.toFixed(1)} (-${finalDmg})`;
        applyDamageToBoss(finalDmg, true, tag);
        const persona = getBossPersona(b);
        const wLine = (persona.weakHitLines || [])[SHM.stats.crownHits % Math.max(1, (persona.weakHitLines || []).length)];
        if (wLine) setBossWorldBubble(b, wLine, { sfx: "KRİTİK İSABET!!", color: "#d9b062", duration: 155 });
        if (b.apocalypseCharge > 0) {
          b.apocalypseCharge = 0;
          b.stunned = 1;
          addFloatText(b.x, b.y - 340, "KIYAMET BÜYÜSÜ BOZULDU! +SERSEMLETME!", "#9ad07a", 22, true);
        }
        SHM.freezeFrames = 9;
        SHM.cam.shake = 24;
        spawnExplosionParticles(pr.x, pr.y, "#d9b062", 42);
        SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 10, maxR: 150, color: "#ffe0a0", alpha: 1 });
        if (typeof SFX !== "undefined" && SFX.play) {
          SFX.play("crown_crit");
          SFX.play("crit");
        }
        SHM.projectiles.splice(i, 1);
        continue;
      } else if (distBody <= (isColossalKom ? 140 : isSub ? 82 : 122) || bodyHitBox) {
        SHM.stats.curCombo++;
        SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
        SHM.cam.impactHoldTimer = 24;
        SHM.cam.impactX = pr.x;
        SHM.cam.impactY = pr.y;
        applyDamageToBoss(pr.dmg, pr.armorPierce, `GÖVDE VURUŞU -${pr.dmg}`);
        SHM.freezeFrames = 6;
        SHM.cam.shake = 16;
        spawnExplosionParticles(pr.x, pr.y, "#9ad07a", 32);
        SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 8, maxR: 110, color: "#9ad07a", alpha: 1 });
        if (typeof SFX !== "undefined" && SFX.play) {
          SFX.play("crater_boom");
          SFX.play("hit");
        }
        SHM.projectiles.splice(i, 1);
        continue;
      }
      }
    }

    let exploded = false;
    if (SHM.props && SHM.props.length > 0 && !pr.isTeleport) {
      for (const prop of SHM.props) {
        if (prop.dead) continue;
        if ((prop.type === "barrel" || prop.type === "crate") && Math.hypot(pr.x - prop.x, pr.y - (prop.y - 30)) <= 46) {
          exploded = true;
          break;
        }
      }
    }
    if (!exploded && pr.owner === "player" && !pr.isTeleport) {
      if (SHM.gameMode === "pvp") {
        const rivals = Array.isArray(SHM.pvpRivals) && SHM.pvpRivals.length ? SHM.pvpRivals : (SHM.pvpRival ? [SHM.pvpRival] : []);
        for (const rv of rivals) {
          if (rv && !rv.dead && Math.hypot(pr.x - rv.x, pr.y - (rv.y - 52)) <= 56) {
            exploded = true;
            break;
          }
        }
      }
      for (const e of SHM.enemies) {
        if (e.dead) continue;
        if (Math.hypot(pr.x - e.x, pr.y - (e.y - 54)) <= 62) {
          exploded = true;
          break;
        }
      }
    } else if (!exploded && pr.owner === "enemy" && SHM.player) {
      if (Math.hypot(pr.x - SHM.player.x, pr.y - (SHM.player.y - 48)) <= 48) {
        exploded = true;
      }
    }

    const ix = Math.round(pr.x);
    const iy = Math.round(pr.y);
    if ((pr.ignoreSelfGroundFrames || 0) > 0) {
      pr.ignoreSelfGroundFrames--;
    } else if (!exploded && ix >= 0 && ix < W && iy >= 0 && iy < H) {
      if (SHM.terrainCtx) {
        const alpha = SHM.terrainCtx.getImageData(ix, iy, 1, 1).data[3];
        if (alpha > 90) exploded = true;
      } else if (iy >= SHM.heightMap[ix]) {
        exploded = true;
      }
    }

    if (exploded) {
      detonateProjectile(pr);
      SHM.projectiles.splice(i, 1);
    }
  }

  if (SHM.turn === "projectile" && SHM.projectiles.length === 0) {
    SHM.turn = "resolving";
    setTimeout(() => {
      if (SHM.turn === "resolving") advanceTurnAfterVolley();
    }, SHM.fastSim ? 240 : 420);
  }
}

function detonateProjectile(pr) {
  const p = SHM.player;
  SHM.cam.impactHoldTimer = 24;
  SHM.cam.impactX = pr.x;
  SHM.cam.impactY = pr.y;

  if (pr.isTeleport && p) {
    const safeX = Math.max(90, Math.min(SHM.WORLD_W - 90, Math.round(pr.x)));
    p.x = safeX;
    p.y = Math.min(pr.y, SHM.heightMap[safeX]);
    SHM.cam.manualPan = false;
    SHM.cam.focusX = p.x;
    SHM.cam.focusY = p.y - 80;
    SHM.cam.activeActor = { x: p.x, y: p.y - 80, zoom: 1.28, label: "SEN" };
    addFloatText(p.x, p.y - 85, "KANCA TELEPORT!", "#d9b062", 19, true);
    spawnExplosionParticles(p.x, p.y - 30, "#d9b062", 28);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("guard");
    return;
  }

  const effectiveBlastR = Math.round((pr.blastRadius || 52) * (pr.craterMult || 1.0));
  carveTerrainCrater(pr.x, pr.y, effectiveBlastR);
  SHM.cam.shake = Math.max(SHM.cam.shake, pr.isPow ? 22 : (pr.craterMult > 1 ? 18 : 14));
  SHM.freezeFrames = Math.max(SHM.freezeFrames, 5);
  if (typeof SFX !== "undefined" && SFX.play) SFX.play("crater_boom");

  const elColors = { ates: "#ef7f3e", buz: "#d9b062", firtina: "#c8a0f0", toprak: "#84cc16", golge: "#ff7a6a", venom: "#7ab05a", magma: "#ea580c", bluekor: "#7eb8d8" };
  const col = elColors[pr.el] || "#ef7f3e";
  spawnExplosionParticles(pr.x, pr.y, col, pr.isPow ? 42 : 28);
  SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 8, maxR: effectiveBlastR * 1.65, color: col, alpha: 1 });

  if (pr.owner === "player") {
    if (pr.craterMult && pr.craterMult > 1.0) {
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 14, maxR: effectiveBlastR * 2.1, color: "#84cc16", alpha: 0.9 });
      addFloatText(pr.x, pr.y - 68, "TOPRAK EJDERİ: 2× DEV KRATER & SARSINTI!", "#84cc16", 17, true);
    }
    if (pr.skyLightningCrit) {
      pr.dmg = Math.round(pr.dmg * 1.20);
      SHM.laserBeams.push({ x1: pr.x, y1: Math.max(40, pr.y - 520), x2: pr.x, y2: pr.y, color: "#c084fc", life: 36 });
      addFloatText(pr.x, pr.y - 92, "⚡ YILDIRIM GÖK ÇARPMASI! (+%20 KRİTİK)", "#c084fc", 19, true);
    }
    if (pr.leavesLavaPool) {
      if (!Array.isArray(SHM.lavaPools)) SHM.lavaPools = [];
      SHM.lavaPools.push({
        x: pr.x,
        y: pr.y,
        radius: 72,
        turnsLeft: 2,
        dmg: Math.max(45, Math.round(pr.dmg * 0.28))
      });
      addFloatText(pr.x, pr.y - 48, "🔥 KOR LAV HAVUZU (2 TUR YANMA)!", "#ef7f3e", 16);
    }
  }

  // Interactive Destructible Barrels & Supply Crates!
  if (SHM.props && SHM.props.length > 0) {
    const propRad = (pr.blastRadius || 54) + 54;
    for (const prop of SHM.props) {
      if (prop.dead || (prop.type !== "barrel" && prop.type !== "crate")) continue;
      const dProp = Math.hypot(pr.x - prop.x, pr.y - (prop.y - 28));
      if (dProp <= propRad) {
        prop.dead = true;
        if (prop.type === "barrel") {
          SHM.stats.crownHits = (SHM.stats.crownHits || 0) + 1;
          carveTerrainCrater(prop.x, prop.y, 98);
          spawnExplosionParticles(prop.x, prop.y - 24, "#ef7f3e", 46);
          SHM.shockwaves.push({ x: prop.x, y: prop.y - 24, r: 12, maxR: 185, color: "#ef7f3e", alpha: 1 });
          addFloatText(prop.x, prop.y - 88, "KIZIL BARUT FIÇISI PATLADI! (DEV KRATER!)", "#ef7f3e", 21, true);
          if (SHM.pvpRival && !SHM.pvpRival.dead && Math.hypot(prop.x - SHM.pvpRival.x, prop.y - SHM.pvpRival.y) <= 230) {
            SHM.pvpRival.hp = Math.max(0, SHM.pvpRival.hp - 280);
            SHM.pvpRival.hitFlash = 10;
            SHM.pvpRival.x += Math.sign(SHM.pvpRival.x - prop.x || 1) * 48;
            SHM.stats.totalDmg += 280;
            addFloatText(SHM.pvpRival.x, SHM.pvpRival.y - 108, "FIÇI ZİNCİR PATLAMASI -280!", "#ffe0a0", 21, true);
          }
        } else if (prop.type === "crate") {
          spawnExplosionParticles(prop.x, prop.y - 24, "#d9b062", 30);
          SHM.shockwaves.push({ x: prop.x, y: prop.y - 24, r: 10, maxR: 125, color: "#d9b062", alpha: 1 });
          if (pr.owner === "player" && p) {
            p.hp = Math.min(p.maxHp, p.hp + 380);
            p.ghostHp = p.hp;
            p.rage = Math.min(100, p.rage + 50);
            addFloatText(prop.x, prop.y - 84, "İKMAL SANDIĞI: +380 CAN & +50 POW!", "#9ad07a", 20, true);
          } else if (SHM.pvpRival && !SHM.pvpRival.dead) {
            SHM.pvpRival.hp = Math.min(SHM.pvpRival.maxHp, SHM.pvpRival.hp + 260);
            addFloatText(prop.x, prop.y - 84, "RAKİP İKMAL SANDIĞI ALDI (+260 CAN)", "#ffb067", 18, true);
          }
        }
      }
    }
  }

  if (pr.owner === "player") {
    const rad = (pr.blastRadius || 54) + 55;
    if (SHM.gameMode === "pvp") {
      const rivals = Array.isArray(SHM.pvpRivals) && SHM.pvpRivals.length ? SHM.pvpRivals : (SHM.pvpRival ? [SHM.pvpRival] : []);
      for (const rv of rivals) {
        if (!rv || rv.dead) continue;
        const dHead = Math.hypot(pr.x - rv.x, pr.y - (rv.y - 82));
        const dBody = Math.hypot(pr.x - rv.x, pr.y - (rv.y - 46));
        if (dHead <= 44 || dBody <= rad + 26) {
          const isHeadshot = dHead <= 44;
          const falloff = isHeadshot ? 1.75 : Math.max(0.55, 1 - dBody / (rad + 75));
          let dmg = Math.round(pr.dmg * falloff);
          if (rv.shield > 0 && !pr.armorPierce) {
            dmg = Math.round(dmg * 0.55);
            rv.shield--;
          }
          if (rv.ghostHp == null) rv.ghostHp = rv.hp;
          rv.ghostHoldTimer = 18;
          rv.hp = Math.max(0, rv.hp - dmg);
          rv.hitFlash = 9;
          rv.state = "hit";
          rv.animTimer = 28;
          const kbMult = SHM.pvpMap === "glacier" ? 2.15 : 1.25;
          const kbDir = Math.sign(rv.x - pr.x || pr.vx || 1);
          // ENG-14 Y-3: canlı maçta geri itmeyi isabet alan taraf kendi ekranında uygular ve konumunu bildirir;
          // burada rakip itilmez (hayalet konum olmasın). Yön `hit.kb` ile gider.
          if (!(typeof pvpIsLive === "function" && pvpIsLive())) {
            rv.x = Math.max(90, Math.min(SHM.WORLD_W - 90, rv.x + kbDir * Math.round(28 * kbMult)));
          }
          SHM.stats.totalDmg += dmg;
          if (isHeadshot) SHM.stats.crownHits = (SHM.stats.crownHits || 0) + 1;
          SHM.stats.curCombo = (SHM.stats.curCombo || 0) + 1;
          SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo || 0, SHM.stats.curCombo);
          if (p) p.rage = Math.min(100, p.rage + 18);
          addFloatText(rv.x, rv.y - 98, isHeadshot ? `TAM İSABET KRİTİK! -${dmg}` : `-${dmg}`, isHeadshot ? "#ffe0a0" : "#f8fafc", isHeadshot ? 22 : 20, isHeadshot);
          if (typeof pvpIsLive === "function" && pvpIsLive()) {
            // ENG-14: hasarı ALICI kendi canına yazar; buradaki rv.hp yalnız tahmin, rakibin hp_sync'i ile düzelir.
            SHM.pvpLive.stats.hits += 1;
            SHM.pvpLive.stats.dmgDealt += dmg;
            mpSendWs({ type: "pvp_sync", action: "hit", dmg, kb: kbDir, turnNo: SHM.pvpLive.turnNo });
          } else if (rv.hp <= 0) {
            rv.dead = true;
            addFloatText(rv.x, rv.y - 125, `${rv.name} MAĞLUP EDİLDİ!`, "#9ad07a", 22, true);
            if (typeof SFX !== "undefined" && SFX.play) SFX.play("win");
          }
        }
      }
    }
    if (SHM.boss && !SHM.boss.dead) {
      const b = SHM.boss;
      const dBoss = Math.hypot(pr.x - b.x, pr.y - (b.y - 140));
      if (dBoss <= rad + 115) {
        const falloff = Math.max(0.45, 1 - dBoss / (rad + 160));
        const dmg = Math.round(pr.dmg * falloff);
        if (pr.chillsTarget) {
          b.chilledTurns = 2;
          addFloatText(b.x, b.y - 245, "❄️ AYAZ MÜHRÜ! (-%15 SALDIRI HASARI)", "#38bdf8", 18, true);
        }
        applyDamageToBoss(dmg, pr.armorPierce, `-${dmg}`);
      }
    }
    for (const e of SHM.enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(pr.x - e.x, pr.y - (e.y - 48));
      if (dist <= rad + 20) {
        let dmg = Math.round(pr.dmg * Math.max(0.55, 1 - dist / (rad + 60)));
        const activePlugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
        if (activePlugin && typeof activePlugin.modifyEnemyDamage === "function") {
          dmg = activePlugin.modifyEnemyDamage(e, pr, dmg);
        }
        e.hp -= dmg;
        e.state = "hit";
        e.animTimer = 28;
        if (pr.chillsTarget) {
          e.chilledTurns = 2;
          addFloatText(e.x, e.y - 115, "❄️ AYAZ MÜHRÜ (-%15 HASAR)", "#38bdf8", 16);
        }
        if (e.ghostHp == null) e.ghostHp = e.hp + dmg; e.ghostHoldTimer = 18; e.hitFlash = 8;
        e.recoilOffset = pr.vx >= 0 ? 16 : -16;
        SHM.stats.totalDmg += dmg;
        if (p) p.rage = Math.min(100, p.rage + 14);
        addFloatText(e.x, e.y - 92, `-${dmg}`, "#ffe0a0", 20, dmg >= 220);
        if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
        if (e.hp <= 0) {
          e.dead = true;
          SHM.stats.mobsKilled = (SHM.stats.mobsKilled || 0) + 1;
          addFloatText(e.x, e.y - 118, `${e.name} YIKILDI!`, "#9ad07a", 21, true);
          if (typeof SFX !== "undefined" && SFX.play) SFX.play("ko");
        }
      }
    }
  } else if (pr.owner === "enemy" && p && !pr.remote) {
    // ENG-14: canlı rakibin mermisi (remote) bu ekranda yalnız görseldir; hasar rakibin `hit` mesajıyla gelir.
    const dist = Math.hypot(pr.x - p.x, pr.y - (p.y - 46));
    if (dist <= (pr.blastRadius || 48) + 48) {
      let dmg = pr.dmg;
      const C = typeof ensureChibi === "function" ? ensureChibi() : null;
      if (C && C.eq && (C.eq.armor === "armor_11" || C.eq.armor === "abra_armor")) dmg = Math.round(dmg * 0.50);
      else if (C && C.eq && (C.eq.armor === "armor_9" || C.eq.armor === "armor_10")) dmg = Math.round(dmg * 0.65);
      const hasSpa = p.hasSpaBuff || (typeof S !== "undefined" && S && S.spaBuff && S.spaBuff.week === S.week);
      if (hasSpa && (pr.el === "venom" || pr.el === "magma" || pr.el === "bluekor" || pr.el === "ates")) {
        dmg = Math.round(dmg * 0.75);
        addFloatText(p.x, p.y - 116, "♨️ ILICA BUHAR DİRENCİ (-%25 ASİT/LAV HASARI)", "#5eead4", 16);
      }
      if (p.shield > 0) {
        dmg = Math.round(dmg * 0.40);
        p.shield--;
      }
      p.hp = Math.max(0, p.hp - dmg);
      p.rage = Math.min(100, p.rage + 18);
      p.animState = "hit";
      p.animTimer = 28;
      if (p.ghostHp == null) p.ghostHp = p.hp + dmg; p.ghostHoldTimer = 18; p.hitFlash = 8;
      p.recoilOffset = pr.vx >= 0 ? 14 : -14;
      addFloatText(p.x, p.y - 92, `-${dmg} HASAR!`, "#ff7a6a", 21, true);
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
    }
  }

  settleUnitsOnTerrain();
  updateBattleHudDom();
}

function settleUnitsOnTerrain() {
  const W = SHM.WORLD_W;
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const lakeTop = 1445 - (SHM.waterRaise || 0);
  if (SHM.player) {
    const px = Math.max(45, Math.min(W - 45, Math.round(SHM.player.x)));
    const gy = findLocalGroundY(px, SHM.player.y);
    if (gy >= lakeTop - 10) {
      let rescueX = 560;
      if (isAbra && SHM.selectedStage === 4) {
        rescueX = px < 700 ? 480 : px > 1300 ? 1520 : 980;
      }
      SHM.player.x = rescueX;
      SHM.player.y = Math.min(1020, findLocalGroundY(rescueX, 860));
      addFloatText(rescueX, SHM.player.y - 80, "EJDER KANATLARI SENİ GÜVERTEYE TAŞIDI!", "#d9b062", 16, false);
    } else {
      SHM.player.y = gy;
    }
  }
  if (Array.isArray(SHM.coopUnits)) {
    for (const cu of SHM.coopUnits) {
      if (!cu || cu.hp <= 0) continue;
      const cx = Math.max(45, Math.min(W - 45, Math.round(cu.x)));
      const gy = findLocalGroundY(cx, cu.y);
      if (gy >= lakeTop - 10) {
        const rescueX = (isAbra && SHM.selectedStage === 4)
          ? (cx < 700 ? 380 : cx > 1300 ? 1480 : 880)
          : 465;
        cu.x = rescueX;
        cu.y = Math.min(1020, findLocalGroundY(rescueX, 860));
      } else {
        cu.y = gy;
      }
    }
  }
  if (SHM.gameMode === "pvp" && SHM.pvpAlly && !SHM.pvpAlly.dead) {
    const al = SHM.pvpAlly;
    const ax = Math.max(45, Math.min(W - 45, Math.round(al.x)));
    const gy = findLocalGroundY(ax, al.y);
    if (gy >= lakeTop - 12) {
      al.y = Math.min(980, findLocalGroundY(1390, 740));
    } else {
      al.y = gy;
    }
  }
  if (SHM.props && SHM.props.length > 0) {
    for (const prop of SHM.props) {
      if (prop.dead) continue;
      const prx = Math.max(45, Math.min(W - 45, Math.round(prop.x)));
      const gy = SHM.heightMap[prx];
      if (gy >= lakeTop - 12 && prop.type !== "vortex") {
        prop.dead = true;
      } else {
        prop.y = gy + (prop.yOff || 0);
      }
    }
  }
  if (SHM.gameMode === "pvp") {
    const rivals = Array.isArray(SHM.pvpRivals) && SHM.pvpRivals.length ? SHM.pvpRivals : (SHM.pvpRival ? [SHM.pvpRival] : []);
    for (const rv of rivals) {
      if (!rv || rv.dead) continue;
      const rx = Math.max(45, Math.min(W - 45, Math.round(rv.x)));
      const gy = findLocalGroundY(rx, rv.y);
      if (gy >= lakeTop - 12 && typeof pvpIsLive === "function" && pvpIsLive()) {
        // Canlı rakibin konumu bu ekranda tahmindir; düşme/ölüm kararını rakibin kendi ekranı verir.
        continue;
      } else if (gy >= lakeTop - 12) {
        rv.dead = true;
        rv.hp = 0;
        addFloatText(rv.x, lakeTop - 38, `${rv.name} UÇURUMA DÜŞTÜ! ZAFER!`, "#ffe0a0", 22, true);
        spawnExplosionParticles(rv.x, lakeTop, "#ef7f3e", 42);
      } else {
        rv.y = gy;
      }
    }
  }
  for (const e of SHM.enemies) {
    if (e.dead || e.type === "viper" || e.type === "wyvern" || e.type === "alpha_wyvern") continue;
    const ex = Math.max(45, Math.min(W - 45, Math.round(e.x)));
    const gy = SHM.heightMap[ex];
    if (gy >= lakeTop - 12) {
      e.dead = true;
      e.hp = 0;
      addFloatText(e.x, lakeTop - 35, `${e.name} ${isKom ? "LAV DENİZİNDE ERİDİ!" : "ASİT GÖLÜNE DÜŞTÜ!"}`, "#ef7f3e", 21, true);
      spawnExplosionParticles(e.x, lakeTop, isKom ? "#ef7f3e" : "#7ab05a", 34);
    } else {
      e.y = gy;
    }
  }
}

/* ============================================================================
   5-PHASE EXTREME BOSS & SUB-BOSS PROGRESSION ENGINE
   ============================================================================ */
function applyDamageToBoss(dmg, armorPierce, labelText) {
  const b = SHM.boss;
  if (!b || b.dead) return;
  const isKom = !!b.isDragonCommander;
  const isEx = isExtremeMode();
  let actual = dmg;
  if (!armorPierce && b.shield > 0) {
    const absorbed = Math.min(b.shield, Math.round(actual * 0.5));
    b.shield -= absorbed;
    actual -= absorbed;
  }
  b.hp = Math.max(0, b.hp - actual);
  b.state = "hit";
  b.stateTimer = 28;
  if (b.ghostHp == null) b.ghostHp = b.hp + actual; b.ghostHoldTimer = 20; b.hitFlash = 8;
  b.recoilOffset = 18;
  SHM.stats.totalDmg += actual;
  if (SHM.player) SHM.player.rage = Math.min(100, SHM.player.rage + 15);

  const floatY = b.isAbra ? b.y - 350 : b.isDragonCommander ? b.y - 340 : b.isSubBoss ? b.y - 210 : b.y - 320;
  const isBigCrit = labelText && labelText.includes("KRİTİK");
  addFloatText(b.x, floatY, labelText || `-${actual}`, isBigCrit ? "#ffe0a0" : "#f1e6cf", isBigCrit ? 24 : 21, isBigCrit);

  const hpRatio = b.hp / b.maxHp;

  if (b.isSubBoss) {
    if (b.phase === 1 && hpRatio <= 0.55 && b.hp > 0) {
      b.phase = 2;
      b.shield = 220;
      b.phaseTitle = b.subType === "coral_golem" ? "ABİSAL BASINÇ ZIRHI & ÇAPA DEPREMİ" : "ÖFKE PATLAMASI";
      addFloatText(b.x, b.y - 235, `${b.name} ÖFKELENDİ! (+KALKAN)`, "#ef7f3e", 20, true);
      const subMoveKey = b.subType === "coral_golem"
        ? "sub_coral_golem_slam"
        : b.subType === "sirca_golem"
        ? "sub_golem_quake"
        : b.subType === "oracle"
        ? "sub_oracle_curse"
        : b.subType === "behemoth"
        ? "sub_behemoth_eruption"
        : "sub_wyvern_storm";
      triggerBossAttackComicCut(b, subMoveKey);
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    }
  } else if (typeof curRaidPlugin === "function" && curRaidPlugin() && typeof curRaidPlugin().onBossPhaseCheck === "function" && curRaidPlugin().onBossPhaseCheck(b, hpRatio, isEx)) {
    // Handled by raid plugin's custom phase progression
  } else if (isEx && b.maxPhase === 5) {
    if (b.phase === 1 && hpRatio <= 0.80 && b.hp > 0) {
      b.phase = 2;
      b.shield = 320;
      SHM.skyFlash = 20;
      SHM.cam.shake = 20;
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
      if (isKom) {
        b.phaseTitle = "HAVALANIŞ & METEOR DALIŞI";
        b.specialKey = "takeoff";
        b.stateTimer = 85;
        triggerActionPip("EKSTREM FAZ II/5 · GÖKYÜZÜNE HAVALANIŞ", "Kalgarot Havalandı — Meteor Dalışı Geliyor!", "Kalgarot gökyüzünden süpersonik hızla dalış yapacak! [Q] Rün Kalkanını hazırla!", SHM_ASSETS_PATHS.kom_ex_divebomb);
        triggerBossAttackComicCut(b, "divebomb");
      } else {
        b.phaseTitle = "ÇİFTE ENGEREK ÖLÜM IŞINI";
        b.specialKey = "twinbeam";
        b.stateTimer = 85;
        triggerActionPip("EKSTREM FAZ II/5 · ÇİFTE ÖLÜM IŞINI", "Şahmeran İkiz Engerek Işınını Açtı!", "Omuzlarındaki engerekler yüksek hızlı lazer ışını ateşliyor!", SHM_ASSETS_PATHS.sah_ex_twinbeam);
        triggerBossAttackComicCut(b, "twinbeam");
      }
    } else if (b.phase <= 2 && hpRatio <= 0.60 && b.hp > 0) {
      b.phase = 3;
      b.shield = 360;
      SHM.skyFlash = 22;
      SHM.cam.shake = 24;
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
      if (isKom) {
        b.phaseTitle = "KUYRUK DEPREMİ & KOR ZİNCİR KASIRGASI";
        b.specialKey = "tailslam";
        b.stateTimer = 90;
        triggerActionPip("EKSTREM FAZ III/5 · KUYRUK DEPREMİ", "Kalgarot Obsidiyen Kuyruğuyla Yeri Yarıyor!", "Kuyruk darbesi ve kızgın demir zincir kasırgası başladı!", SHM_ASSETS_PATHS.kom_ex_chainwhip);
        triggerBossAttackComicCut(b, "tailslam");
      } else {
        b.phaseTitle = "ZÜMRÜT ASİT TUFANI & TAŞLAŞTIRMA BAKIŞI";
        b.specialKey = "tsunami";
        b.stateTimer = 90;
        SHM.waterRaise = 24;
        triggerActionPip("EKSTREM FAZ III/5 · ZÜMRÜT ASİT TUFANI", "Asit Gölü Yükseliyor & Taşlaştırma Bakışı!", "Şahmeran Zümrüt Tufanı çağırdı ve gözleriyle taşlaştırma büyüsü yapıyor!", SHM_ASSETS_PATHS.sah_ex_tsunami);
        triggerBossAttackComicCut(b, "tsunami");
      }
    } else if (b.phase <= 3 && hpRatio <= 0.40 && b.hp > 0) {
      b.phase = 4;
      b.shield = 420;
      SHM.skyFlash = 25;
      SHM.cam.shake = 25;
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
      if (isKom) {
        b.phaseTitle = "MAVİ-KOR CEHENNEM NEFESİ & SÜPERNOVA";
        b.specialKey = "bluefire";
        b.stateTimer = 95;
        triggerActionPip("EKSTREM FAZ IV/5 · MAVİ-KOR CEHENNEM NEFESİ", "Kalgarot'un Alevi Mavi-Beyaz Plazmaya Döndü!", "Mavi-Kor Cehennem Nefesi zırhları deler!", SHM_ASSETS_PATHS.kom_ex_bluefire);
        triggerBossAttackComicCut(b, "bluefire");
      } else {
        b.phaseTitle = "EBEDİ DERİ DEĞİŞİMİ & KEHRİBAR YAĞMURU";
        b.specialKey = "meteor";
        b.stateTimer = 95;
        triggerActionPip("EKSTREM FAZ IV/5 · KEHRİBAR SÜTUN YAĞMURU", "Şahmeran Gökyüzünden Kehribar Mızrakları Yağdırıyor!", "Deri değişimi kalkanını Taç Kritiğiyle kır!", SHM_ASSETS_PATHS.sah_ex_meteor);
        triggerBossAttackComicCut(b, "meteor");
      }
    } else if (b.phase <= 4 && hpRatio <= 0.22 && b.hp > 0) {
      b.phase = 5;
      b.shield = 480;
      b.apocalypseCharge = 2;
      b.specialKey = "ascended";
      b.stateTimer = 120;
      SHM.skyFlash = 32;
      SHM.cam.shake = 30;
      if (isKom) {
        b.phaseTitle = "FAZ V · MAVİ-KOR SÜPERNOVA OVERLORD FORMU!";
        SHM.enemies.push({
          id: "ex_p5_wyvern_" + Date.now(),
          type: "alpha_wyvern",
          name: "Mavi-Kor Alfa Wyvern",
          hp: 780,
          maxHp: 780,
          x: 1960,
          y: 560,
          baseY: 560,
          facing: -1,
          state: "idle",
          animTimer: 0,
          dead: false
        });
        triggerActionPip("EKSTREM FAZ V/5 · MAVİ-KOR KIYAMET FORMU!", "Kalgarot Mavi-Kor Overlord Formuna Yükseldi!", "Göğsündeki Mavi Yıldız Çekirdeğini (x3.2 Kritik!) vurarak Süpernova Kıyametini boz!", SHM_ASSETS_PATHS.kom_ex_ascended);
        triggerBossAttackComicCut(b, "supernova");
      } else {
        b.phaseTitle = "FAZ V · ALTI KANATLI SIRÇA TANRIÇASI FORMU!";
        SHM.enemies.push({
          id: "ex_p5_oracle_" + Date.now(),
          type: "oracle",
          name: "Tanrıça Başrahibesi",
          hp: 740,
          maxHp: 740,
          x: 2020,
          y: SHM.heightMap[2020],
          facing: -1,
          state: "idle",
          animTimer: 0,
          dead: false
        });
        triggerActionPip("EKSTREM FAZ V/5 · ALTI KANATLI TANRIÇA FORMU!", "Ebedi Sırça Tanrıçası Şahmeran Yükseldi!", "Altı altın kanadı açıldı! Başındaki Üçüncü Göz Tacını vurarak Kıyamet büyüsünü boz!", SHM_ASSETS_PATHS.sah_ex_ascended);
        triggerBossAttackComicCut(b, "ascended");
      }
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    }
  } else {
    if (b.phase === 1 && hpRatio <= 0.62 && b.hp > 0) {
      b.phase = 2;
      b.state = "enrage";
      b.specialKey = isKom ? "tailslam" : "twinbeam";
      b.stateTimer = 85;
      b.shield = 300;
      b.phaseTitle = isKom ? "KANAT KASIRGASI & KUYRUK DEPREMİ" : "KIZIL TAÇ ÖFKESİ & ÖLÜM IŞINI";
      SHM.skyFlash = 22;
      SHM.cam.shake = 22;
      triggerBossAttackComicCut(b, isKom ? "tailslam" : "twinbeam");
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    } else if (b.phase <= 2 && hpRatio <= 0.28 && b.hp > 0) {
      b.phase = 3;
      b.state = "summon";
      b.specialKey = isKom ? "supernova" : "petrify";
      b.stateTimer = 95;
      b.apocalypseCharge = 2;
      b.phaseTitle = isKom ? "KIYAMET ÇEKİRDEĞİ!" : "YILAN KIYAMETİ!";
      SHM.skyFlash = 28;
      SHM.cam.shake = 26;
      triggerBossAttackComicCut(b, isKom ? "supernova" : "petrify");
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    }
  }

  if (b.hp <= 0) {
    b.dead = true;
    b.specialKey = "ko";
    for (const e of SHM.enemies) e.dead = true;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("win");
    setTimeout(() => {
      if (!SHM.open || SHM.screen !== "battle") return;
      const camp = curCampaign();
      if (SHM.gameMode === "raid" && SHM.selectedStage < camp.maxStage) {
        openStageClearBlessingModal();
      } else {
        completeSahmeranDungeonVictory();
      }
    }, 900);
  }
  updateBattleHudDom();
}

/* ============================================================================
   ALLY SUPPORT & SEQUENTIAL ENEMY / COLOSSAL BOSS TURN CAMERA ENGINE
   ============================================================================ */
function advanceTurnAfterVolley() {
  if (!SHM.open || SHM.screen !== "battle") return;
  const camp = curCampaign();

  if (SHM.gameMode === "pvp" && typeof pvpIsLive === "function" && pvpIsLive()) {
    // ENG-14 canlı 1v1: sıra rakibe geçer (sonucu yalnız sunucunun pvp_match_end mesajı verir).
    if (!SHM.pvpLive.peerConnected || SHM.pvpLive.selfOffline) {
      // Y-1: rakip (ya da biz) kopukken sıra devredilmez; dönüşte devredilir.
      SHM.pvpLive.pendingHandoff = true;
      SHM.turn = "paused";
      updateBattleHudDom();
      return;
    }
    pvpHandOffTurn();
    SHM.turn = "enemy";
    SHM.cam.manualPan = false;
    SHM.cam.mode = "follow";
    updateBattleHudDom();
    setTimeout(() => { if (pvpIsLive() && SHM.turn === "enemy") executePvpRivalTurn(); }, SHM.fastSim ? 120 : 300);
    return;
  }
  if (SHM.gameMode === "pvp") {
    const rivals = Array.isArray(SHM.pvpRivals) && SHM.pvpRivals.length ? SHM.pvpRivals : (SHM.pvpRival ? [SHM.pvpRival] : []);
    const activeRival = rivals.find(r => r && !r.dead) || null;
    if (!activeRival) {
      // ENG-14: PvP (bot provası dahil) ödülsüz; zindan zafer/ganimet akışına girmez.
      if (typeof pvpFinishLocal === "function") pvpFinishLocal(true); else completeSahmeranDungeonVictory();
      return;
    }
    SHM.pvpRival = activeRival;
    if (SHM.pvpTeamMode === "2v2" && SHM.pvpAlly && !SHM.pvpAlly.dead) {
      const al = SHM.pvpAlly;
      al.state = "attack";
      al.animTimer = 36;
      addFloatText(al.x, al.y - 118, `${al.handle || "@leydi_sureyya"}: TAKIM DESTEK ATIŞI!`, "#38bdf8", 17, true);
      activeRival.hp = Math.max(0, activeRival.hp - 165);
      activeRival.hitFlash = 8;
      SHM.stats.totalDmg = (SHM.stats.totalDmg || 0) + 165;
      if (activeRival.hp <= 0) {
        activeRival.dead = true;
        const nextRv = rivals.find(r => r && !r.dead);
        if (!nextRv) {
          if (typeof pvpFinishLocal === "function") pvpFinishLocal(true); else completeSahmeranDungeonVictory();
          return;
        }
        SHM.pvpRival = nextRv;
      }
    }
    if (SHM.pvpMap === "forge" || SHM.pvpMap === "dragon_caldera") {
      SHM.waterRaise = Math.min(72, (SHM.waterRaise || 0) + 10);
      addFloatText(SHM.player.x, SHM.player.y - 115, "KALDERA MAGMASI YÜKSELİYOR!", "#ef7f3e", 18, true);
    }
    if (typeof mpSendWs === "function") {
      mpSendWs({
        type: "pvp_sync",
        action: "turn_handoff",
        from: (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi",
        mapId: SHM.pvpMap,
        wind: SHM.wind
      });
    }
    SHM.turn = "enemy";
    SHM.cam.manualPan = false;
    SHM.cam.mode = "follow";
    updateBattleHudDom();
    setTimeout(() => {
      executePvpRivalTurn();
    }, SHM.fastSim ? 250 : 420);
    return;
  }

  const bossAlive = SHM.boss && !SHM.boss.dead;
  const enemiesAlive = SHM.enemies.some(e => !e.dead);
  if (!bossAlive && !enemiesAlive) {
    if (SHM.gameMode === "raid" && SHM.selectedStage < camp.maxStage) {
      openStageClearBlessingModal();
      return;
    } else {
      completeSahmeranDungeonVictory();
      return;
    }
  }

  // Companion & Co-op Same-Map Support Volley & Healing
  if (!SHM.soloMode && SHM.allies.length > 0 && SHM.player && SHM.player.hp > 0) {
    const target = (SHM.boss && !SHM.boss.dead) ? SHM.boss : SHM.enemies.find(e => !e.dead);
    if (Array.isArray(SHM.coopUnits)) {
      SHM.coopUnits.forEach((cu, idx) => {
        cu.state = "attack";
        cu.animTimer = 36;
        if (target) {
          const sx = cu.x + 28;
          const sy = cu.y - 54;
          const tx = target.x - 20 + idx * 35;
          const ty = target.y - (target === SHM.boss ? 160 : 50);
          const flightT = 38 + idx * 6;
          const vx = ((tx - sx) / flightT) - 0.5 * SHM.wind * 0.0085 * flightT;
          const vy = ((ty - sy) / flightT) - 0.5 * SHM.GRAVITY * flightT;
          SHM.projectiles.push({
            owner: "player",
            isCoopVisual: true,
            x: sx,
            y: sy,
            vx,
            vy,
            el: cu.el || (idx === 0 ? "buz" : "firtina"),
            dmg: 0,
            blastRadius: 36,
            trail: []
          });
        }
      });
    }
    if (SHM.allies.includes("sureyya")) {
      SHM.player.hp = Math.min(SHM.player.maxHp, SHM.player.hp + 120);
      SHM.player.poison = 0;
      const c0 = (SHM.coopUnits && SHM.coopUnits[0]) || SHM.player;
      addFloatText(c0.x, c0.y - 125, `${c0.handle || "@leydi_sureyya"}: Şifa +120 HP`, "#d9b062", 16);
    }
    if (SHM.allies.includes("kuzey")) {
      if (target) {
        const c1 = (SHM.coopUnits && SHM.coopUnits[1]) || SHM.player;
        addFloatText(c1.x, c1.y - 125, `${c1.handle || "@kuzey_ruzgari"}: Yıldırım Atışı!`, "#c8a0f0", 16);
        spawnExplosionParticles(target.x, target.y - 90, "#c8a0f0", 20);
        if (target === SHM.boss) {
          applyDamageToBoss(210, false, `${c1.handle || "Kuzey Rüzgârı"} Yıldırımı -210`);
        } else {
          target.hp -= 210;
          addFloatText(target.x, target.y - 85, `${c1.handle || "Kuzey Rüzgârı"} -210`, "#c8a0f0", 16);
          if (target.hp <= 0) target.dead = true;
        }
      }
    }
  }

  if (!(SHM.boss && !SHM.boss.dead) && !SHM.enemies.some(e => !e.dead)) {
    if (SHM.gameMode === "raid" && SHM.selectedStage < camp.maxStage) {
      openStageClearBlessingModal();
      return;
    } else {
      completeSahmeranDungeonVictory();
      return;
    }
  }

  SHM.turn = "enemy";
  SHM.cam.manualPan = false;
  SHM.cam.mode = "follow";
  updateBattleHudDom();

  setTimeout(() => {
    executeEnemyAndBossActions();
  }, SHM.fastSim ? 250 : 420);
}


function performBossTauntTurn(b, p, isKom) {
  if (!b || b.dead || !p) return;
  b.forceTauntNext = false;
  b.lastTauntTurn = SHM.stats.turnsTaken;
  b.state = "taunt";
  b.stateTimer = 190;
  b.maxStateTimer = 190;
  b.specialKey = null;
  b.tauntExposed = true;
  b.tauntCritBonus = 0.35;

  p.rage = Math.min(100, (p.rage || 0) + 25);
  p.stamina = Math.min(p.maxStamina || 100, (p.stamina || 0) + 25);

  SHM.bossActionBusy = true;
  SHM.cam.manualPan = false;
  SHM.cam.mode = "follow";
  SHM.cam.lockedUnit = b;
  SHM.cam.activeActor = {
    x: b.x,
    y: b.y - (b.isDragonCommander ? 210 : b.isSubBoss ? 125 : 195),
    zoom: b.isSubBoss ? 1.24 : 1.16,
    label: b.name + " · LAF ATMA!"
  };
  SHM.cam.shake = Math.max(SHM.cam.shake || 0, 5);
  SHM.shockwaves.push({
    x: b.x,
    y: b.y - (b.isDragonCommander ? 210 : 170),
    r: 14,
    maxR: 220,
    color: "#d9b062",
    alpha: 0.95
  });

  const persona = getBossPersona(b);
  const tList = persona.taunts || [];
  const chosenTaunt = tList[(SHM.stats.turnsTaken + (b.tauntCount || 0)) % Math.max(1, tList.length)] || {
    sfx: "MEYDAN OKUMA!",
    line: persona.entranceRoarLine,
    replySay: "Bu sözlerini sana yedireceğim!",
    effectDesc: "Boss saldırmak yerine laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 POW Öfkesi!"
  };

  setBossWorldBubble(b, chosenTaunt.line, {
    speaker: b.name,
    sfx: chosenTaunt.sfx || "LAF ATMA!!",
    duration: 320,
    isTaunt: true
  });
  setDialogue(b.name + " · LAF ATIYOR", chosenTaunt.line, persona.portrait);

  if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
  addFloatText(b.x, b.y - (b.isDragonCommander ? 330 : 285), `${b.name} SALDIRMAK YERİNE LAF ATTI! (AÇIK VERDİ: ZAYIF NOKTA +%35!)`, "#d9b062", 20, true);
  addFloatText(p.x, p.y - 102, "TAHRİK EDİLDİN! +25 POW ÖFKESİ & +25 ENERJİ!", "#ef7f3e", 18, true);

  updateBattleHudDom();

  const isAutomated = typeof window === "undefined" || typeof requestAnimationFrame === "undefined";
  const isFast = isAutomated || window.__fastFx || SHM.fastSim;
  if (isAutomated) {
    triggerBossComicTaunt(b, chosenTaunt);
    SHM.bossActionBusy = false;
    SHM.cam.lockedUnit = null;
    return;
  }

  // First let the player read the Boss's speech bubble on the battlefield for 1.35s while camera stays locked on Boss, then open the interactive taunt cut-in!
  setTimeout(() => {
    if (!SHM.open || SHM.screen !== "battle" || !b || b.dead) {
      SHM.bossActionBusy = false;
      SHM.cam.lockedUnit = null;
      return;
    }
    triggerBossComicTaunt(b, chosenTaunt);
  }, isFast ? 120 : 1350);
}
if (typeof window !== "undefined") window.performBossTauntTurn = performBossTauntTurn;

function performSingleBossTurnAction(b, p, isKom, isEx) {
  if (!b || b.dead || !p) {
    SHM.bossActionBusy = false;
    SHM.cam.lockedUnit = null;
    return;
  }
  SHM.bossActionBusy = true;
  SHM.cam.manualPan = false;
  SHM.cam.mode = "follow";
  SHM.cam.lockedUnit = b;
  SHM.cam.activeActor = {
    x: b.x,
    y: b.y - (b.isAbra ? 215 : b.isDragonCommander ? 205 : b.isSubBoss ? 120 : 190),
    zoom: b.isSubBoss ? 1.16 : 1.08,
    label: b.name
  };
  updateBattleHudDom();

  const activePlugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  if (activePlugin && typeof activePlugin.onBossTurnStart === "function" && activePlugin.onBossTurnStart(b, p)) {
    return;
  }

  if (b.stunned > 0) {
    b.stunned--;
    addFloatText(b.x, b.y - 260, `${b.name} SERSEMLEMİŞ DURUMDA! (TUR PAS)`, "#d9b062", 20, true);
    setTimeout(() => {
      SHM.bossActionBusy = false;
      SHM.cam.lockedUnit = null;
    }, SHM.fastSim ? 150 : 900);
    return;
  }

  // BOSS "LAF ATMA" (TAUNT / BANTER TURN) MECHANIC:
  const canTauntThisTurn = b.lastTauntTurn !== SHM.stats.turnsTaken && (
    b.forceTauntNext ||
    SHM.stats.turnsTaken === 2 ||
    (!b.isAbra && SHM.stats.turnsTaken >= 1 && typeof requestAnimationFrame !== "undefined" && Math.random() < 0.35)
  );
  if (canTauntThisTurn) {
    performBossTauntTurn(b, p, isKom);
    return;
  }

  const baseDiffDmgMult = isEx ? 1.25 : SHM.difficulty === "normal" ? 0.80 : 1.00;
  const chillMult = (b.chilledTurns || 0) > 0 ? 0.85 : 1.0;
  if (b.chilledTurns > 0) b.chilledTurns--;
  const diffDmgMult = baseDiffDmgMult * chillMult;
  let chosen = "divebomb";

  if (activePlugin && typeof activePlugin.selectBossMove === "function") {
    chosen = activePlugin.selectBossMove(b, p, isEx);
  }

  const def = BOSS_DRAMATIC_ATTACKS[chosen] || BOSS_DRAMATIC_ATTACKS.divebomb;

  // PHASE 1: WIND-UP & SPEECH READABILITY ON BATTLEFIELD (Camera stays locked on Boss, no projectiles yet!)
  b.state = "windup";
  b.specialKey = null;
  b.stateTimer = 175;
  b.maxStateTimer = 175;
  b.telegraphTimer = 42;
  if (b.isAbra) b.abraHeadKey = "abraHeadRoar";
  setBossWorldBubble(b, def.line, {
    speaker: b.name,
    sfx: def.ono || "ÖZEL SALDIRI!!",
    color: def.glow || "#ef7f3e",
    duration: 320
  });
  setDialogue(b.name + " · " + def.title, def.line, def.poseImg || getBossPersona(b).portrait);
  updateBattleHudDom();

  const launchBossAttackPayload = () => {
    if (!b || b.dead || !p) {
      SHM.bossActionBusy = false;
      SHM.cam.lockedUnit = null;
      return;
    }
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("cannon_launch");

    // Resolve any active Boss Telegraph Danger Zone when the Boss actually strikes!
    if (SHM.dangerZones && SHM.dangerZones.length > 0) {
      const dz = SHM.dangerZones.shift();
      const dodged = Math.abs(p.x - dz.x) > dz.radius;
      SHM.laserBeams.push({
        x1: b.x - 85,
        y1: b.y - (b.isAbra ? 235 : b.isDragonCommander ? 220 : 185),
        x2: dz.x,
        y2: dz.y - 10,
        color: b.isAbra ? "#38bdf8" : isKom ? "#ef7f3e" : "#9ad07a",
        life: 34
      });
      carveTerrainCrater(dz.x, dz.y, 68);
      spawnExplosionParticles(dz.x, dz.y, b.isAbra ? "#38bdf8" : isKom ? "#ef7f3e" : "#9ad07a", 36);
      SHM.shockwaves.push({ x: dz.x, y: dz.y, r: 10, maxR: dz.radius * 1.15, color: b.isAbra ? "#38bdf8" : isKom ? "#ef7f3e" : "#9ad07a", alpha: 1 });
      SHM.cam.shake = Math.max(SHM.cam.shake, 6);
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("crater_boom");

      if (dodged) {
        addFloatText(p.x, p.y - 105, "TEHLİKE BÖLGESİNDEN KAÇINILDI! (0 HASAR)", "#9ad07a", 20, true);
      } else {
        let zDmg = Math.round((dz.dmg || 220) * diffDmgMult);
        const hasSpa = p.hasSpaBuff || (typeof S !== "undefined" && S && S.spaBuff && S.spaBuff.week === S.week);
        if (hasSpa) {
          zDmg = Math.round(zDmg * 0.75);
          addFloatText(p.x, p.y - 135, "♨️ ILICA BUHAR DİRENCİ (-%25 ZEMİN HASARI)", "#5eead4", 16);
        }
        if (p.shield > 0) {
          zDmg = Math.round(zDmg * 0.35);
          p.shield--;
          addFloatText(p.x, p.y - 115, "KALKAN TEHLİKE DARBESİNİ SÖNÜMLEDİ!", "#d9b062", 18, true);
        }
        if (p.ghostHp == null) p.ghostHp = p.hp;
        p.ghostHoldTimer = 18;
        p.hp = Math.max(0, p.hp - zDmg);
        p.hitFlash = 9;
        p.recoilOffset = -16;
        addFloatText(p.x, p.y - 92, `TEHLİKE BÖLGESİ DARBESİ -${zDmg}!`, "#ff7a6a", 21, true);
      }
      settleUnitsOnTerrain();
    }

    b.state = "attack";
    b.specialKey = b.isSubBoss ? null : chosen;
    b.stateTimer = 86;
    b.maxStateTimer = 86;

    if (activePlugin && typeof activePlugin.executeBossAttack === "function") {
      activePlugin.executeBossAttack(b, p, chosen, diffDmgMult, isEx);
    }
  };

  const isAutomated = typeof window === "undefined" || typeof requestAnimationFrame === "undefined";
  const isFast = isAutomated || window.__fastFx || SHM.fastSim;

  if (isAutomated) {
    triggerBossAttackComicCut(b, chosen);
    launchBossAttackPayload();
    SHM.bossActionBusy = false;
    SHM.cam.lockedUnit = null;
    return;
  }

  // Step 1 (1450ms): Let player read the Boss's speech bubble & windup on the battlefield with camera locked on Boss
  setTimeout(() => {
    if (!SHM.open || SHM.screen !== "battle" || !b || b.dead) {
      SHM.bossActionBusy = false;
      SHM.cam.lockedUnit = null;
      return;
    }
    // Step 2: Slash the frameless comic cut-in across the screen while camera stays locked on Boss
    triggerBossAttackComicCut(b, chosen);

    // Step 3 (1350ms later): After cut-in finishes its dramatic reveal, Boss performs its smooth attack lunge & fires projectiles!
    setTimeout(() => {
      if (!SHM.open || SHM.screen !== "battle" || !b || b.dead) {
        SHM.bossActionBusy = false;
        SHM.cam.lockedUnit = null;
        return;
      }
      launchBossAttackPayload();

      // Step 4 (480ms later): Keep camera on Boss through the forward strike lunge, then release lock so camera tracks projectiles to impact!
      setTimeout(() => {
        SHM.bossActionBusy = false;
        if (SHM.cam && SHM.cam.lockedUnit === b) {
          SHM.cam.lockedUnit = null;
        }
      }, isFast ? 60 : 480);
    }, isFast ? 110 : 1350);
  }, isFast ? 110 : 1450);
}

function performSingleEnemyTurnAction(e, p) {
  if (!e || e.dead || !p) return;
  const isChilled = (e.chilledTurns || 0) > 0;
  if (e.chilledTurns > 0) e.chilledTurns--;
  if (e.type === "cobra" || e.type === "drake" || e.type === "sirca_golem" || e.type === "behemoth" || e.type === "karkinos") {
    const stepDir = p.x < e.x ? -1 : 1;
    e.facing = stepDir;
    const minStepX = (SHM.raidId === "abra" && SHM.selectedStage === 2) ? 1960 : 820;
    const maxStepX = (SHM.raidId === "abra" && SHM.selectedStage === 2) ? 2660 : 3050;
    e.x = Math.max(minStepX, Math.min(maxStepX, e.x + stepDir * (isChilled ? 24 : 46)));
    e.y = SHM.heightMap[Math.round(e.x)];
  }
  e.state = "attack";
  e.animTimer = 56;
  e.maxAnimTimer = 56;
  SHM.cam.manualPan = false;
  SHM.cam.mode = "follow";
  SHM.cam.lockedUnit = e;
  SHM.cam.activeActor = { x: e.x, y: e.y - 75, zoom: 1.22, label: e.name };
  updateBattleHudDom();

  if (typeof SFX !== "undefined" && SFX.play) SFX.play("cannon_launch");
  const projEl = (e.type === "drake" || e.type === "wyvern" || e.type === "behemoth" || e.type === "alpha_wyvern")
    ? "magma"
    : (e.type === "viper" || e.type === "karkinos" ? "buz" : "venom");
  const diffDmgMult = isExtremeMode() ? 1.25 : SHM.difficulty === "normal" ? 0.80 : 1.00;
  const eDmg = Math.round(135 * diffDmgMult * (isChilled ? 0.85 : 1.0));
  const extraOpts = e.type === "karkinos" ? { isAbyssalOrb: true, arcH: 155 } : {};
  launchAimedEnemyProjectile(e.x + e.facing * 35, e.y - 58, p.x + (Math.random() * 44 - 22), p.y - 26, eDmg, projEl, 42, extraOpts);
  setTimeout(() => {
    if (SHM.cam && SHM.cam.lockedUnit === e) {
      SHM.cam.lockedUnit = null;
    }
  }, SHM.fastSim ? 40 : 280);
}

function executeEnemyAndBossActions() {
  if (!SHM.open || SHM.screen !== "battle") return;
  const p = SHM.player;
  const b = SHM.boss;
  const isKom = SHM.raidId === "komutan";
  const isEx = isExtremeMode();
  const livingEnemies = SHM.enemies.filter(e => !e.dead).slice(0, 2);


  const activePlugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  if (activePlugin && typeof activePlugin.onEnemyTurnPhaseStart === "function") {
    activePlugin.onEnemyTurnPhaseStart(p, b, livingEnemies);
  }

  const actorsQueue = [];
  livingEnemies.forEach(e => actorsQueue.push({ kind: "mob", unit: e }));
  if (b && !b.dead) actorsQueue.push({ kind: "boss", unit: b });

  if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
    actorsQueue.forEach(item => {
      if (item.kind === "mob") performSingleEnemyTurnAction(item.unit, p);
      else performSingleBossTurnAction(item.unit, p, isKom, isEx);
    });
    setTimeout(() => {
      if (SHM.projectiles.length === 0) startNewPlayerTurn();
    }, 850);
    return;
  }

  let qIdx = 0;
  const runNextActor = () => {
    if (!SHM.open || SHM.screen !== "battle" || !SHM.player) return;
    if (qIdx >= actorsQueue.length) {
      SHM.cam.lockedUnit = null;
      SHM.bossActionBusy = false;
      startNewPlayerTurn();
      return;
    }
    const item = actorsQueue[qIdx++];
    if (!item.unit || item.unit.dead) {
      runNextActor();
      return;
    }

    SHM.cam.manualPan = false;
    SHM.cam.mode = "follow";
    SHM.cam.impactHoldTimer = 0;
    if (item.kind === "mob") {
      const e = item.unit;
      SHM.cam.lockedUnit = e;
      SHM.cam.activeActor = { x: e.x, y: e.y - 75, zoom: 1.22, label: e.name };
      e.state = "windup";
      e.animTimer = 64;
      e.maxAnimTimer = 64;
      e.telegraphTimer = 28;
      triggerTurnBanner("DÜŞMAN HAMLESİ", e.name, "enemy");
      updateBattleHudDom();
      setTimeout(() => {
        if (!SHM.open || SHM.screen !== "battle") return;
        performSingleEnemyTurnAction(e, p);
        waitForProjectilesThenNext();
      }, (SHM.fastSim || window.__fastFx) ? 180 : 620);
    } else {
      const bossUnit = item.unit;
      SHM.bossActionBusy = true;
      SHM.cam.lockedUnit = bossUnit;
      SHM.cam.activeActor = {
        x: bossUnit.x,
        y: bossUnit.y - (bossUnit.isAbra ? 215 : bossUnit.isDragonCommander ? 205 : bossUnit.isSubBoss ? 120 : 190),
        zoom: bossUnit.isSubBoss ? 1.16 : 1.08,
        label: bossUnit.name
      };
      bossUnit.state = "windup";
      bossUnit.stateTimer = 180;
      bossUnit.maxStateTimer = 180;
      bossUnit.telegraphTimer = 42;
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("boss_telegraph");
      triggerTurnBanner("DEV BOSS HAMLESİ", bossUnit.name, "boss");
      updateBattleHudDom();
      setTimeout(() => {
        if (!SHM.open || SHM.screen !== "battle") return;
        performSingleBossTurnAction(bossUnit, p, isKom, isEx);
        waitForProjectilesThenNext();
      }, (SHM.fastSim || window.__fastFx) ? 180 : 680);
    }
  };

  const waitForProjectilesThenNext = () => {
    const checkInt = setInterval(() => {
      if (!SHM.open || SHM.screen !== "battle") {
        clearInterval(checkInt);
        return;
      }
      if (!SHM.bossActionBusy && SHM.projectiles.length === 0 && (SHM.cam.impactHoldTimer || 0) <= 0) {
        clearInterval(checkInt);
        setTimeout(() => runNextActor(), (SHM.fastSim || window.__fastFx) ? 120 : 520);
      }
    }, (SHM.fastSim || window.__fastFx) ? 50 : 80);
  };

  runNextActor();
}

function launchAimedEnemyProjectile(sx, sy, tx, ty, dmg, el, blastR, opts = {}) {
  // Natural ballistic scatter so terrain cover & repositioning matter (not 100% mathematical aimbot)
  const isAutomatedTest = typeof window === "undefined" || typeof requestAnimationFrame === "undefined";
  const scatter = isAutomatedTest ? 0 : ((Math.random() - 0.5) * 95 + SHM.wind * 12);
  const dx = (tx + scatter) - sx;
  const dy = ty - sy;
  const flightT = 72;
  const vx = (dx / flightT) - 0.5 * SHM.wind * 0.0085 * flightT;
  const vy = (dy / flightT) - 0.5 * SHM.GRAVITY * flightT;
  SHM.projectiles.push(Object.assign({
    owner: "enemy",
    x: sx,
    y: sy,
    startX: sx,
    startY: sy,
    targetX: tx + scatter,
    targetY: ty,
    flightT,
    age: 0,
    arcH: opts.arcH || 170,
    vx,
    vy,
    ignoreSelfGroundFrames: 3,
    el: el || "venom",
    dmg,
    blastRadius: blastR || 44,
    trail: []
  }, opts));
}

function startNewPlayerTurn() {
  if (!SHM.player) return;
  const p = SHM.player;
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const pvpLiveNow = SHM.gameMode === "pvp" && typeof pvpIsLive === "function" && pvpIsLive();
  if (SHM.gameMode === "pvp" && SHM.pvpLive && SHM.pvpLive.ended) return; // maç bitti, sıra yok
  if (p.hp <= 0) {
    if ((p.revivesLeft ?? 1) > 0 || typeof window === "undefined") {
      p.revivesLeft = Math.max(0, (p.revivesLeft ?? 1) - 1);
      p.hp = Math.round(p.maxHp * 0.65);
      p.ghostHp = p.hp;
      p.shield = 1;
      SHM.shockwaves.push({ x: p.x, y: p.y - 40, r: 10, maxR: 130, color: "#d9b062", alpha: 1 });
      spawnExplosionParticles(p.x, p.y - 40, "#d9b062", 32);
      addFloatText(p.x, p.y - 105, `ANKA KÜLÜ DİRİLİŞİ! (%65 CAN · Kalan Hak: ${p.revivesLeft})`, "#ffe0a0", 20, true);
      if (pvpLiveNow) pvpSendHpSync(); // dirilen can rakip ekranına da yazılır
    } else if (pvpLiveNow) {
      pvpReportDefeat(); // canı biten taraf bildirir; sonuç sunucudan iki tarafa tek gelir
      return;
    } else if (SHM.gameMode === "pvp" && typeof pvpFinishLocal === "function") {
      pvpFinishLocal(false);
      return;
    } else {
      openStageDefeatRetryModal();
      return;
    }
  }

  // Decrement active skill cooldowns by 1 turn
  if (SHM.cooldowns) {
    for (const k of Object.keys(SHM.cooldowns)) {
      if (SHM.cooldowns[k] > 0) SHM.cooldowns[k]--;
    }
  }

  if (isAbra && SHM.boss && SHM.boss.isAbra) {
    if (SHM.boss.tailExposedTurns != null && SHM.boss.tailExposedTurns > 0) {
      SHM.boss.tailExposedTurns--;
    }
  }

  // Tick Fire Dragon Lava Pools (burns Boss/enemies standing on molten pools for 2 turns!)
  if (Array.isArray(SHM.lavaPools) && SHM.lavaPools.length > 0) {
    for (const lp of SHM.lavaPools) {
      if (lp.turnsLeft <= 0) continue;
      if (SHM.boss && !SHM.boss.dead && Math.abs(SHM.boss.x - lp.x) <= lp.radius + 120) {
        applyDamageToBoss(lp.dmg, true, `🔥 LAV HAVUZU YANMASI -${lp.dmg}`);
      }
      for (const e of SHM.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - lp.x) <= lp.radius + 36) {
          e.hp -= lp.dmg;
          e.hitFlash = 6;
          SHM.stats.totalDmg += lp.dmg;
          addFloatText(e.x, e.y - 95, `🔥 LAV YANMASI -${lp.dmg}`, "#ef7f3e", 17);
          if (e.hp <= 0) e.dead = true;
        }
      }
      lp.turnsLeft--;
    }
    SHM.lavaPools = SHM.lavaPools.filter(lp => lp.turnsLeft > 0);
  }

  // Boss marks a new Telegraph Danger Zone around Player's current position for the upcoming turn!
  SHM.dangerZones = [];
  if (SHM.boss && !SHM.boss.dead) {
    SHM.dangerZones.push({
      x: p.x,
      y: p.y,
      radius: 130,
      dmg: isKom ? 240 : isAbra ? 225 : 210,
      el: isKom ? "magma" : isAbra ? "buz" : "venom",
      label: isKom ? "KALGAROT HEDEF BÖLGESİ" : isAbra ? "ABRA KAYNAMA HEDEF BÖLGESİ" : "ŞAHMERAN HEDEF BÖLGESİ"
    });
    if (isAbra && SHM.boss.isAbra) {
      SHM.abraActiveVfx = SHM.abraActiveVfx || [];
      SHM.abraActiveVfx.push({ type: "boil", x: p.x, y: 1218, timer: 90, maxTimer: 90 });
    }
  }

  SHM.turn = "player";
  SHM.turnTimer = 25;
  SHM.wind = pvpLiveNow ? pvpWindFor(SHM.pvpLive.turnNo) : +(Math.random() * 4.6 - 2.3).toFixed(1);
  if (pvpLiveNow) SHM.pvpLive.stats.turns += 1;
  p.stamina = p.maxStamina;
  SHM.cam.mode = "follow";
  SHM.cam.manualPan = false;
  SHM.cam.impactHoldTimer = 0;
  SHM.cam.focusX = p.x;
  SHM.cam.focusY = p.y - 80;
  SHM.cam.activeActor = { x: p.x, y: p.y - 80, zoom: 1.28, label: "SEN" };
  triggerTurnBanner(SHM.gameMode === "pvp" ? "SENİN SIRAN" : `AŞAMA ${SHM.selectedStage}/${curCampaign().maxStage} · SENİN TURUN`, SHM.dangerZones.length ? "Tehlike Bölgesinden Çık (A/D) ve Ateşle!" : "Nişan Al (W/S) ve Ateşle (Boşluk)", "player");
  updateBattleHudDom();
}


function initBattleCanvasAndResize() {
  if (typeof document === "undefined") return;
  const cv = document.getElementById("shmCanvas");
  if (!cv) return;
  const wrap = cv.parentElement;
  const rect = wrap.getBoundingClientRect();
  cv.width = Math.max(800, Math.floor(rect.width));
  cv.height = Math.max(420, Math.floor(rect.height));
}

function renderBattleCanvasFrame(now) {
  if (typeof document === "undefined") return;
  const cv = document.getElementById("shmCanvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const vw = cv.width;
  const vh = cv.height;
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;
  const camp = curCampaign();
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const tSec = (now || 0) * 0.001;
  const frameNow = now || (typeof performance !== "undefined" ? performance.now() : Date.now());
  const dt = SHM._prevFrameNow ? Math.min(0.1, Math.max(0.001, (frameNow - SHM._prevFrameNow) * 0.001)) : 0.0166;
  SHM._prevFrameNow = frameNow;
  SHM._lastDt = dt;

  const p = SHM.player;
  const b = SHM.boss;

  // Dynamic Close-Up Camera, Look-Ahead Projectile Tracking & Impact Hold
  if (SHM.cam.impactHoldTimer > 0) {
    SHM.cam.impactHoldTimer--;
  }
  if (!SHM.cam.dragging) {
    if (SHM.cam.lockedUnit && !SHM.cam.lockedUnit.dead && !SHM.cam.manualPan) {
      const lu = SHM.cam.lockedUnit;
      const isBossLock = lu === b;
      SHM.cam.tZoom = isBossLock ? (lu.isSubBoss ? 1.20 : 1.12) : 1.22;
      const offY = isBossLock ? (lu.isAbra ? 215 : lu.isDragonCommander ? 210 : lu.isSubBoss ? 130 : 190) : 75;
      SHM.cam.tx = lu.x - (vw / SHM.cam.tZoom) * (isBossLock ? 0.56 : 0.52);
      SHM.cam.ty = (lu.y - offY) - (vh / SHM.cam.tZoom) * 0.48;
    } else if (SHM.bossAttackCutTimer > 0 && b && !b.dead && !SHM.cam.manualPan) {
      SHM.cam.tZoom = b.isSubBoss ? 1.20 : 1.12;
      SHM.cam.tx = b.x - (vw / SHM.cam.tZoom) * 0.56;
      SHM.cam.ty = (b.y - (b.isAbra ? 215 : b.isDragonCommander ? 210 : b.isSubBoss ? 130 : 190)) - (vh / SHM.cam.tZoom) * 0.48;
    } else if (SHM.projectiles.length > 0 && !SHM.cam.manualPan) {
      const lead = SHM.projectiles[0];
      SHM.cam.tZoom = 1.15;
      const lookAheadX = lead.x + lead.vx * 11;
      const lookAheadY = lead.y + lead.vy * 6;
      SHM.cam.tx = lookAheadX - (vw / SHM.cam.tZoom) * 0.50;
      SHM.cam.ty = lookAheadY - (vh / SHM.cam.tZoom) * 0.52;
    } else if (SHM.cam.impactHoldTimer > 0 && !SHM.cam.manualPan) {
      SHM.cam.tZoom = 1.18;
      SHM.cam.tx = SHM.cam.impactX - (vw / SHM.cam.tZoom) * 0.50;
      SHM.cam.ty = SHM.cam.impactY - (vh / SHM.cam.tZoom) * 0.52;
    } else if (!SHM.cam.manualPan) {
      if (SHM.cam.mode === "intro_pan" && b && !b.dead) {
        const overlayOpen = typeof document !== "undefined" && !!document.getElementById("shmComicClashOverlay");
        if (!overlayOpen) {
          SHM.cam.introTimer = Math.max(0, (SHM.cam.introTimer || 0) - 1);
        }
        const it = SHM.cam.introTimer || 0;
        const bossFocusX = b.x - (vw / 1.18) * 0.56;
        const bossFocusY = (b.y - (b.isAbra ? 215 : b.isDragonCommander ? 210 : b.isSubBoss ? 130 : 190)) - (vh / 1.18) * 0.48;
        const playerFocusX = p ? (p.x + p.facing * 95 - (vw / 1.28) * 0.36) : 140;
        const playerFocusY = p ? ((p.y - 80) - (vh / 1.28) * 0.56) : 340;
        if (it > 42 || overlayOpen) {
          SHM.cam.tZoom = b.isSubBoss ? 1.24 : 1.16;
          SHM.cam.tx = bossFocusX;
          SHM.cam.ty = bossFocusY;
        } else if (it > 0) {
          const prog = 1 - it / 42;
          const ease = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
          SHM.cam.tZoom = (b.isSubBoss ? 1.24 : 1.16) * (1 - ease) + 1.28 * ease;
          SHM.cam.tx = bossFocusX * (1 - ease) + playerFocusX * ease;
          SHM.cam.ty = bossFocusY * (1 - ease) + playerFocusY * ease;
        } else {
          SHM.cam.mode = "follow";
        }
      } else if (SHM.cam.mode === "overview") {
        SHM.cam.tZoom = SHM.gameMode === "pvp" ? 0.54 : 0.62;
        SHM.cam.tx = SHM.gameMode === "pvp" ? 210 : 220;
        SHM.cam.ty = SHM.gameMode === "pvp" ? 0 : 190;
      } else if (SHM.cam.mode === "boss" && SHM.gameMode === "pvp" && SHM.pvpRival && !SHM.pvpRival.dead) {
        SHM.cam.tZoom = 1.04;
        SHM.cam.tx = SHM.pvpRival.x - (vw / SHM.cam.tZoom) * 0.56;
        SHM.cam.ty = (SHM.pvpRival.y - 80) - (vh / SHM.cam.tZoom) * 0.48;
      } else if (SHM.cam.mode === "boss" && b && !b.dead) {
        SHM.cam.tZoom = b.isSubBoss ? 1.15 : 1.06;
        SHM.cam.tx = b.x - (vw / SHM.cam.tZoom) * 0.58;
        SHM.cam.ty = (b.y - (b.isAbra ? 210 : b.isDragonCommander ? 205 : 185)) - (vh / SHM.cam.tZoom) * 0.48;
      } else if (SHM.turn === "enemy" && SHM.cam.activeActor) {
        SHM.cam.tZoom = SHM.cam.activeActor.zoom || 1.16;
        SHM.cam.tx = SHM.cam.activeActor.x - (vw / SHM.cam.tZoom) * 0.54;
        SHM.cam.ty = SHM.cam.activeActor.y - (vh / SHM.cam.tZoom) * 0.48;
      } else if (p && SHM.cam.mode === "follow") {
        SHM.cam.tZoom = SHM.gameMode === "pvp"
          ? ((SHM.pvpTeamMode || SHM.pvpQueueMode || "1v1") === "2v2" ? 0.90 : 0.98)
          : 1.28;
        if (SHM.cam.focusX == null) SHM.cam.focusX = p.x;
        if (SHM.cam.focusY == null) SHM.cam.focusY = p.y - 80;
        const dzX = SHM.cam.deadzoneX || 42;
        const dzY = SHM.cam.deadzoneY || 28;
        const toX = p.x - SHM.cam.focusX;
        const toY = (p.y - 80) - SHM.cam.focusY;
        // Camera deadzone: ignore tiny micro-steps inside the deadzone box so walking never jitters
        if (Math.abs(toX) > dzX) {
          SHM.cam.focusX += (Math.abs(toX) - dzX) * Math.sign(toX);
        }
        if (Math.abs(toY) > dzY) {
          SHM.cam.focusY += (Math.abs(toY) - dzY) * Math.sign(toY);
        }
        // Smooth velocity-based & aiming look-ahead
        const truePitchRad = (((p.angle || 25) - (p.slopeAngle || 0)) * Math.PI) / 180;
        const walkVelLeadX = (p.walkSpeed || 0) * p.facing * 52;
        const aimLeadX = Math.cos(truePitchRad) * p.facing * (SHM.charging ? 128 : 95);
        const aimLeadY = -Math.sin(truePitchRad) * (SHM.charging ? 52 : 20);
        const targetLeadX = aimLeadX + walkVelLeadX;
        const targetLeadY = aimLeadY;
        SHM.cam.leadX = (SHM.cam.leadX ?? targetLeadX) + (targetLeadX - (SHM.cam.leadX ?? targetLeadX)) * 0.14;
        SHM.cam.leadY = (SHM.cam.leadY ?? targetLeadY) + (targetLeadY - (SHM.cam.leadY ?? targetLeadY)) * 0.14;
        SHM.cam.tx = (SHM.cam.focusX + SHM.cam.leadX) - (vw / SHM.cam.tZoom) * 0.36;
        SHM.cam.ty = (SHM.cam.focusY + SHM.cam.leadY) - (vh / SHM.cam.tZoom) * 0.56;
      }
    }
  }

  const minWorldZoom = Math.max(
    SHM.gameMode === "pvp" ? 0.52 : (SHM.cam.mode === "overview" ? 0.58 : 0.85),
    vw / W,
    vh / (H - 40)
  );
  const effectiveTZoom = Math.max(minWorldZoom, SHM.cam.tZoom);
  const camSmoothT = 1 - Math.exp(-10.5 * 0.0167);
  SHM.cam.zoom += (effectiveTZoom - SHM.cam.zoom) * 0.14;
  if (SHM.cam.zoom < minWorldZoom) SHM.cam.zoom = minWorldZoom;
  const maxCamX = Math.max(0, W - vw / SHM.cam.zoom);
  const maxCamY = Math.max(0, H - vh / SHM.cam.zoom);
  SHM.cam.tx = Math.max(0, Math.min(maxCamX, SHM.cam.tx));
  SHM.cam.ty = Math.max(0, Math.min(maxCamY, SHM.cam.ty));
  SHM.cam.x += (SHM.cam.tx - SHM.cam.x) * camSmoothT;
  SHM.cam.y += (SHM.cam.ty - SHM.cam.y) * camSmoothT;
  SHM.cam.x = Math.max(0, Math.min(maxCamX, SHM.cam.x));
  SHM.cam.y = Math.max(0, Math.min(maxCamY, SHM.cam.y));

  if (SHM.cam.shake > 0.15) {
    const cappedShake = Math.min(7, SHM.cam.shake);
    SHM.cam.shakeX = Math.sin((now || 0) * 0.042) * cappedShake * 0.85;
    SHM.cam.shakeY = Math.cos((now || 0) * 0.054) * cappedShake * 0.75;
    SHM.cam.shake *= 0.88;
  } else {
    SHM.cam.shake = 0;
    SHM.cam.shakeX = 0;
    SHM.cam.shakeY = 0;
  }

  ctx.clearRect(0, 0, vw, vh);

  const stageObj = camp.stages.find(s => s.stage === SHM.selectedStage) || camp.stages[camp.stages.length - 1];
  const pvpMapObj = SHM.gameMode === "pvp" ? (PVP_ARENA_MAPS[SHM.pvpMap || "skybridge"] || PVP_ARENA_MAPS.skybridge) : null;
  const bgImg = pvpMapObj
    ? (SHM_IMAGES[pvpMapObj.bgKey] || SHM_IMAGES.pvp_bg_skybridge)
    : (SHM_IMAGES[stageObj.bgKey] || (isKom ? SHM_IMAGES.kom_bg_sanctum : isAbra ? SHM_IMAGES.abraBgSanctum : SHM_IMAGES.bg_sanctum));
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    const parX = -(SHM.cam.x / Math.max(1, W)) * (vw * 0.32);
    const parY = -(SHM.cam.y / Math.max(1, H)) * (vh * 0.24);
    ctx.drawImage(bgImg, parX, parY, vw * 1.35, vh * 1.28);
  } else {
    ctx.fillStyle = isKom ? "#1c0906" : isAbra ? "#061524" : "#071712";
    ctx.fillRect(0, 0, vw, vh);
  }

  ctx.fillStyle = (b && b.phase >= 4) ? "rgba(8, 22, 42, 0.26)" : "rgba(6, 10, 9, 0.20)";
  ctx.fillRect(0, 0, vw, vh);

  // Zero full-screen yellow strobe (SHM.skyFlash drained safely without flashing the screen)
  if (SHM.skyFlash > 0) {
    SHM.skyFlash = 0;
  }

  ctx.save();
  ctx.scale(SHM.cam.zoom, SHM.cam.zoom);
  ctx.translate(-SHM.cam.x + SHM.cam.shakeX, -SHM.cam.y + SHM.cam.shakeY);


  const activePlugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  if (activePlugin && typeof activePlugin.renderBehindTerrain === "function") {
    activePlugin.renderBehindTerrain(ctx, W, tSec);
  }

  // KATMAN 1: Arka Plan Dekor Katmanı (Non-collidable — %50 karartılmış atmosferik perspektif derinliği; mermi içinden geçer)
  if (SHM.bgDecoCanvasDim) {
    ctx.drawImage(SHM.bgDecoCanvasDim, 0, 0);
  } else if (SHM.bgDecoCanvas) {
    const isPreDarkenedPvpIslands = SHM.gameMode === "pvp" && !(SHM.pvpMap === "steppe_canyon" || SHM.pvpMap === "glacier" || SHM.pvpMap === "sandstorm");
    if (isPreDarkenedPvpIslands) {
      ctx.drawImage(SHM.bgDecoCanvas, 0, 0);
    } else {
      ctx.save();
      ctx.filter = "brightness(0.48) saturate(0.58) contrast(0.90)";
      ctx.globalAlpha = 0.86;
      ctx.drawImage(SHM.bgDecoCanvas, 0, 0);
      ctx.restore();
    }
  }
  // KATMAN 2: Yıkılabilir Fiziksel Zemin & Siper Katmanı (Alpha-Mask Collider — tam parlaklık, yapay 1B kontur çizgisi çizilmez)
  if (SHM.terrainCanvas) {
    ctx.drawImage(SHM.terrainCanvas, 0, 0);
  }


  if (activePlugin && typeof activePlugin.renderMidgroundFX === "function") {
    activePlugin.renderMidgroundFX(ctx, W, tSec);
  }

  // Bottom Boiling Lava Sea, Frost Abyss, Abyssal Ocean, or Rising Emerald Acid Lake
  const lakeTop = 1465 - (SHM.waterRaise || 0);
  const lakeBottom = Math.max(H, Math.ceil(SHM.cam.y + vh / Math.max(0.4, SHM.cam.zoom) + 120));
  const lakeRight = Math.max(W, Math.ceil(SHM.cam.x + vw / Math.max(0.4, SHM.cam.zoom) + 120));
  const lakeGrad = ctx.createLinearGradient(0, lakeTop, 0, lakeBottom);
  if (isAbra || (SHM.gameMode === "pvp" && SHM.pvpMap === "glacier")) {
    lakeGrad.addColorStop(0, "rgba(56, 189, 248, 0.78)");
    lakeGrad.addColorStop(0.3, "rgba(14, 116, 144, 0.92)");
    lakeGrad.addColorStop(1, "rgba(6, 20, 34, 0.99)");
  } else if (SHM.gameMode === "pvp" && SHM.pvpMap === "sandstorm") {
    lakeGrad.addColorStop(0, "rgba(251, 191, 36, 0.78)");
    lakeGrad.addColorStop(0.3, "rgba(180, 83, 9, 0.92)");
    lakeGrad.addColorStop(1, "rgba(28, 10, 0, 0.99)");
  } else if (SHM.gameMode === "pvp" && SHM.pvpMap === "tesla") {
    lakeGrad.addColorStop(0, "rgba(56, 189, 248, 0.82)");
    lakeGrad.addColorStop(0.3, "rgba(30, 58, 138, 0.92)");
    lakeGrad.addColorStop(1, "rgba(2, 6, 23, 0.99)");
  } else if (SHM.gameMode === "pvp" && SHM.pvpMap === "skybridge") {
    lakeGrad.addColorStop(0, "rgba(217, 176, 98, 0.55)");
    lakeGrad.addColorStop(0.3, "rgba(68, 36, 92, 0.88)");
    lakeGrad.addColorStop(1, "rgba(12, 8, 20, 0.99)");
  } else if (isKom || (SHM.gameMode === "pvp" && SHM.pvpMap === "forge")) {
    lakeGrad.addColorStop(0, isExtremeMode() ? "rgba(56, 189, 248, 0.85)" : "rgba(251, 146, 60, 0.88)");
    lakeGrad.addColorStop(0.25, "rgba(234, 88, 12, 0.95)");
    lakeGrad.addColorStop(1, "rgba(28, 10, 6, 0.99)");
  } else {
    lakeGrad.addColorStop(0, "rgba(16, 185, 129, 0.80)");
    lakeGrad.addColorStop(0.25, "rgba(5, 150, 105, 0.92)");
    lakeGrad.addColorStop(1, "rgba(5, 24, 18, 0.99)");
  }
  ctx.fillStyle = lakeGrad;
  ctx.fillRect(0, lakeTop, lakeRight, lakeBottom - lakeTop);

  // Live Wind-Driven Atmospheric Sky Particles (shows wind direction & velocity visually across the cavern!)
  if (SHM.skyParticles) {
    for (const sp of SHM.skyParticles) {
      const windVx = SHM.wind * 1.85 + sp.baseVx;
      sp.x += windVx;
      sp.y += sp.vy + Math.sin(now * 0.003 + sp.phase) * 0.25;
      if (sp.x > W + 40) sp.x = -20;
      else if (sp.x < -40) sp.x = W + 20;
      if (sp.y < 40) sp.y = lakeTop - 30;
      else if (sp.y > lakeTop - 20) sp.y = 80;

      ctx.save();
      ctx.globalAlpha = sp.alpha;
      const spCol = isKom ? "#ffb067" : isAbra ? "#7dd3fc" : "#9ad07a";
      ctx.fillStyle = spCol;
      ctx.strokeStyle = spCol;
      if (Math.abs(windVx) > 1.4) {
        ctx.lineWidth = sp.r * 0.75;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - windVx * 3.2, sp.y - sp.vy * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Render Tactical Boss Telegraph Danger Zones on the Ground!
  if (SHM.dangerZones && SHM.dangerZones.length > 0 && p) {
    for (const dz of SHM.dangerZones) {
      const inside = Math.abs(p.x - dz.x) <= dz.radius;
      const pulse = 0.65 + Math.sin(now * 0.01) * 0.25;
      ctx.save();
      const dzCol = inside ? `rgba(239, 68, 68, ${0.24 * pulse})` : "rgba(16, 185, 129, 0.16)";
      const strokeCol = inside ? "#ff7a6a" : "#9ad07a";
      ctx.fillStyle = dzCol;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(dz.x, dz.y + 2, dz.radius, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vertical laser boundary markers at left and right edge of Danger Zone
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(dz.x - dz.radius, dz.y);
      ctx.lineTo(dz.x - dz.radius, dz.y - 115);
      ctx.moveTo(dz.x + dz.radius, dz.y);
      ctx.lineTo(dz.x + dz.radius, dz.y - 115);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Active Turn Ground Spotlight Ring (highlights whose turn it is right now!)
  const pulseR = 1 + Math.sin(now * 0.008) * 0.08;
  if (SHM.turn === "player" && p) {
    ctx.save();
    ctx.strokeStyle = "rgba(154, 208, 122, 0.85)";
    ctx.fillStyle = "rgba(154, 208, 122, 0.14)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 46 * pulseR, 13 * pulseR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (SHM.turn === "enemy" && SHM.cam.activeActor) {
    const ax = SHM.cam.activeActor.x;
    const ay = SHM.heightMap[Math.max(0, Math.min(W - 1, Math.round(ax)))] || (SHM.cam.activeActor.y + 80);
    ctx.save();
    ctx.strokeStyle = "rgba(239, 127, 62, 0.90)";
    ctx.fillStyle = "rgba(239, 127, 62, 0.16)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(ax, ay + 3, 74 * pulseR, 18 * pulseR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ─── EVENT-DRIVEN KEYFRAME ANIMATION ENGINE: SMOOTH SINGLE-PASS LUNGE & BREATHING (ZERO RAPID SPRITE FLICKER) ───
  for (const e of SHM.enemies) {
    if (e.dead) continue;
    ctx.save();
    const isActing = e.animTimer > 0 && e.state !== "idle";
    const eMaxTimer = e.maxAnimTimer || 56;
    const eProg = isActing ? Math.max(0, Math.min(1, 1 - e.animTimer / eMaxTimer)) : 0;
    if (e.animTimer > 0) {
      e.animTimer--;
      if (e.animTimer === 0) e.state = "idle";
    }
    if (e.recoilOffset) {
      e.recoilOffset *= 0.78;
      if (Math.abs(e.recoilOffset) < 0.4) e.recoilOffset = 0;
    }
    let eLungeX = 0;
    if (isActing && e.state === "attack") {
      eLungeX = (eProg < 0.35 ? -(eProg / 0.35) * 10 : Math.sin(((eProg - 0.35) / 0.65) * Math.PI) * 24) * e.facing;
    } else if (isActing && e.state === "windup") {
      eLungeX = -Math.sin(eProg * Math.PI) * 10 * e.facing;
    }
    const rx = (e.recoilOffset || 0) + eLungeX;

    if (e.type !== "viper" && e.type !== "wyvern" && e.type !== "alpha_wyvern") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.beginPath();
      ctx.ellipse(e.x + rx, e.y + 3, 44, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (SHM.heightMap) {
      const groundY = SHM.heightMap[Math.max(0, Math.min(W - 1, Math.round(e.x + rx)))] || (e.y + 110);
      ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
      ctx.beginPath();
      ctx.ellipse(e.x + rx, groundY + 2, 32, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.telegraphTimer > 0) {
      e.telegraphTimer--;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 224, 160, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 58, 28 + (30 - e.telegraphTimer) * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (e.hitFlash > 0) {
      e.hitFlash--;
      ctx.filter = "brightness(1.75) contrast(1.2) drop-shadow(0 0 12px #ffe0a0)";
    } else {
      ctx.filter = isKom
        ? "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.82)) drop-shadow(0 -1px 4px rgba(251, 146, 60, 0.24))"
        : isAbra
        ? "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.82)) drop-shadow(0 -1px 4px rgba(56, 189, 248, 0.28))"
        : "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.82)) drop-shadow(0 -1px 4px rgba(110, 231, 183, 0.22))";
    }

    const eBreathPhase = (now || 0) * 0.0032 + (e.x || 0) * 0.015;
    const eBreathScaleY = 1 + Math.sin(eBreathPhase) * 0.022;
    const eBreathScaleX = 1 - Math.sin(eBreathPhase) * 0.012;

    if (e.type === "karkinos") {
      drawModularKarkinos(ctx, e, rx, tSec, isActing, eProg);
      ctx.restore();
      drawWorldHpBar(ctx, e.x + rx, e.y - 122, 92, e.hp, e.maxHp, "#38bdf8", e.name, e);
    } else if (e.type === "viper" || e.type === "wyvern" || e.type === "alpha_wyvern") {
      const hoverBob = Math.sin((now || 0) * 0.0042 + (e.x || 0) * 0.012) * 7;
      const wingFlapTick = Math.floor((now || 0) / 360) % 2;
      e.y = e.baseY + hoverBob;
      ctx.translate(e.x + rx, e.y);
      ctx.rotate(Math.sin((now || 0) * 0.003 + (e.x || 0) * 0.01) * 0.03 * e.facing);
      ctx.scale(e.facing * eBreathScaleX, eBreathScaleY);
      const vImg = e.type === "viper"
        ? (wingFlapTick === 1 ? SHM_IMAGES.viper_fly2 : SHM_IMAGES.viper_fly1)
        : (wingFlapTick === 1 ? SHM_IMAGES.wyvern_fly2 : SHM_IMAGES.wyvern_fly1);
      if (vImg && vImg.complete && vImg.naturalWidth > 0) {
        ctx.drawImage(vImg, -68, -64, 136, 122);
      }
      ctx.restore();
      drawWorldHpBar(ctx, e.x + rx, e.y - 76, 86, e.hp, e.maxHp, "#ef7f3e", e.name, e);
    } else if (e.type === "sirca_golem" || e.type === "behemoth" || e.type === "oracle") {
      ctx.translate(e.x + rx, e.y);
      ctx.scale(e.facing * eBreathScaleX, eBreathScaleY);
      const f1 = e.type === "sirca_golem" ? SHM_IMAGES.sub_sirca_golem_1 : (e.type === "behemoth" ? SHM_IMAGES.sub_behemoth_1 : SHM_IMAGES.sub_oracle_1);
      const f2 = e.type === "sirca_golem" ? SHM_IMAGES.sub_sirca_golem_2 : (e.type === "behemoth" ? SHM_IMAGES.sub_behemoth_2 : SHM_IMAGES.sub_oracle_2);
      const spImg = (isActing && e.state === "attack") ? f2 : f1;
      if (spImg && spImg.complete && spImg.naturalWidth > 0) {
        ctx.drawImage(spImg, -78, -148, 156, 154);
      }
      ctx.restore();
      drawWorldHpBar(ctx, e.x + rx, e.y - 158, 96, e.hp, e.maxHp, "#d9b062", e.name, e);
    } else if (e.type === "drake") {
      ctx.translate(e.x + rx, e.y);
      ctx.scale((e.facing === -1 ? -1 : 1) * eBreathScaleX, eBreathScaleY);
      let dImg = SHM_IMAGES.drake_idle;
      if (isActing) {
        if (e.state === "hit") dImg = SHM_IMAGES.drake_hit;
        else if (e.state === "windup") dImg = SHM_IMAGES.drake_walk || SHM_IMAGES.drake_idle;
        else dImg = SHM_IMAGES.drake_breath || SHM_IMAGES.drake_idle;
      }
      if (dImg && dImg.complete && dImg.naturalWidth > 0) {
        ctx.drawImage(dImg, -66, -116, 132, 120);
      }
      ctx.restore();
      drawWorldHpBar(ctx, e.x + rx, e.y - 126, 86, e.hp, e.maxHp, "#ef7f3e", e.name, e);
    } else {
      ctx.translate(e.x + rx, e.y);
      ctx.scale(e.facing * eBreathScaleX, eBreathScaleY);
      let cImg = SHM_IMAGES.cobra_idle;
      if (isActing) {
        if (e.state === "hit") cImg = SHM_IMAGES.cobra_hit;
        else if (e.state === "windup") cImg = SHM_IMAGES.cobra_slither || SHM_IMAGES.cobra_idle;
        else cImg = SHM_IMAGES.cobra_spit || SHM_IMAGES.cobra_idle;
      }
      if (cImg && cImg.complete && cImg.naturalWidth > 0) {
        ctx.drawImage(cImg, -64, -120, 128, 124);
      }
      ctx.restore();
      drawWorldHpBar(ctx, e.x + rx, e.y - 130, 86, e.hp, e.maxHp, "#ef7f3e", e.name, e);
    }
  }

  // COLOSSAL BOSS / SUB-BOSS RENDERING: SMOOTH KEYFRAMED POSES & SINGLE-PASS LUNGE (ZERO EPILEPTIC SPRITE STROBING)
  if (b && !b.dead) {
    const isMoving = Math.abs(b.targetX - b.x) > 2;
    if (isMoving) {
      const dir = Math.sign(b.targetX - b.x);
      b.x += dir * 2.2;
      b.y = SHM.heightMap[Math.round(b.x)];
    }
    if (b.recoilOffset) {
      b.recoilOffset *= 0.80;
      if (Math.abs(b.recoilOffset) < 0.5) b.recoilOffset = 0;
    }

    const bMaxTimer = Math.max(1, b.maxStateTimer || 86);
    const bProg = b.stateTimer > 0 ? Math.max(0, Math.min(1, 1 - b.stateTimer / bMaxTimer)) : 0;
    let sImg = null;

    if (b.isSubBoss) {
      const f1 = b.subType === "sirca_golem" ? SHM_IMAGES.sub_sirca_golem_1 : b.subType === "oracle" ? SHM_IMAGES.sub_oracle_1 : b.subType === "behemoth" ? SHM_IMAGES.sub_behemoth_1 : SHM_IMAGES.sub_alpha_wyvern_1;
      const f2 = b.subType === "sirca_golem" ? SHM_IMAGES.sub_sirca_golem_2 : b.subType === "oracle" ? SHM_IMAGES.sub_oracle_2 : b.subType === "behemoth" ? SHM_IMAGES.sub_behemoth_2 : SHM_IMAGES.sub_alpha_wyvern_2;
      sImg = (b.stateTimer > 0 && b.state === "attack") ? f2 : f1;
      if (b.stateTimer > 0) {
        b.stateTimer--;
        if (b.stateTimer === 0) b.state = "idle";
      }
    } else if (b.isAbra) {
      if (b.stateTimer > 0) {
        b.stateTimer--;
        if (b.stateTimer === 0) {
          b.state = "idle";
          b.specialKey = null;
          if ((b.staggerTurns || 0) <= 0) b.abraHeadKey = "abraHeadIdle";
        }
      }
    } else if (b.isDragonCommander) {
      if (b.stateTimer > 0) {
        b.stateTimer--;
        if (b.state === "attack") {
          sImg = (b.specialKey && SHM_IMAGES["kom_ex_" + b.specialKey]) || SHM_IMAGES.kom_attack || SHM_IMAGES.kom_idle1;
        } else if (b.state === "windup" || b.state === "summon") {
          sImg = SHM_IMAGES.kom_summon || SHM_IMAGES.kom_idle1;
        } else if (b.state === "taunt" || b.state === "entrance_roar") {
          sImg = SHM_IMAGES.kom_enrage || SHM_IMAGES.kom_idle1;
        } else if (b.state === "hit") {
          sImg = SHM_IMAGES.kom_hit || SHM_IMAGES.kom_idle1;
        } else {
          sImg = SHM_IMAGES.kom_idle1;
        }
        if (b.stateTimer === 0) {
          b.state = "idle";
          b.specialKey = null;
        }
      } else {
        sImg = (b.phase >= 5 && SHM_IMAGES.kom_ex_ascended)
          ? SHM_IMAGES.kom_ex_ascended
          : SHM_IMAGES.kom_idle1;
      }
    } else {
      if (b.stateTimer > 0) {
        b.stateTimer--;
        if (b.state === "attack") {
          sImg = (b.specialKey && SHM_IMAGES["sah_ex_" + b.specialKey]) || SHM_IMAGES.sah_attack || SHM_IMAGES.sah_idle1;
        } else if (b.state === "windup" || b.state === "summon") {
          sImg = SHM_IMAGES.sah_summon || SHM_IMAGES.sah_idle1;
        } else if (b.state === "taunt" || b.state === "entrance_roar") {
          sImg = SHM_IMAGES.sah_enrage || SHM_IMAGES.sah_idle1;
        } else if (b.state === "hit") {
          sImg = SHM_IMAGES.sah_hit || SHM_IMAGES.sah_idle1;
        } else {
          sImg = SHM_IMAGES.sah_idle1;
        }
        if (b.stateTimer === 0) {
          b.state = "idle";
          b.specialKey = null;
        }
      } else {
        sImg = (b.phase >= 5 && SHM_IMAGES.sah_ex_ascended)
          ? SHM_IMAGES.sah_ex_ascended
          : SHM_IMAGES.sah_idle1;
      }
    }

    // Boss Windup Telegraph Aura (smooth expanding ring)
    if (b.telegraphTimer > 0) {
      b.telegraphTimer--;
      const tgY = b.y - (b.isAbra ? 225 : b.isDragonCommander ? 220 : b.isSubBoss ? 125 : 200);
      ctx.save();
      ctx.strokeStyle = b.isAbra ? "rgba(56, 189, 248, 0.78)" : isKom ? "rgba(249, 115, 22, 0.72)" : "rgba(154, 208, 122, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x - 55, tgY, 36 + (42 - b.telegraphTimer) * 2.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Smooth Keyframed Breathing, Wind-up Coil, Single-Pass Strike Lunge & Gentle Taunt Sway
    const breathWave = Math.sin((now || 0) * 0.0026);
    let bossScaleX = 1 - breathWave * 0.014;
    let bossScaleY = 1 + breathWave * 0.022;
    let bossBobY = 0;
    let bossLungeX = 0;
    let bossTiltRad = Math.sin((now || 0) * 0.0018) * 0.012;

    if (b.state === "windup") {
      // Slow inhale coil back before attacking
      const coil = Math.sin(bProg * Math.PI);
      bossScaleX = 1 - coil * 0.032;
      bossScaleY = 1 + coil * 0.042;
      bossLungeX = -b.facing * coil * 16;
      bossBobY = -coil * 6;
      bossTiltRad = -b.facing * coil * 0.028;
    } else if (b.state === "attack") {
      // Single-pass physical lunge forward toward the player and smooth recovery
      if (bProg < 0.25) {
        const t = bProg / 0.25;
        bossLungeX = -b.facing * t * 14;
        bossScaleX = 1 - t * 0.025;
        bossScaleY = 1 + t * 0.025;
        bossTiltRad = -b.facing * t * 0.025;
      } else if (bProg < 0.60) {
        const t = Math.sin(((bProg - 0.25) / 0.35) * (Math.PI * 0.5));
        bossLungeX = b.facing * t * 44;
        bossScaleX = 1 + t * 0.055;
        bossScaleY = 1 - t * 0.032;
        bossBobY = -t * 8;
        bossTiltRad = b.facing * t * 0.042;
      } else {
        const t = 1 - (bProg - 0.60) / 0.40;
        const ease = t * t * (3 - 2 * t);
        bossLungeX = b.facing * ease * 44;
        bossScaleX = 1 + ease * 0.055;
        bossScaleY = 1 - ease * 0.032;
        bossBobY = -ease * 8;
        bossTiltRad = b.facing * ease * 0.042;
      }
    } else if (b.state === "entrance_roar" || b.state === "taunt") {
      // Smooth, dignified chest swell (zero high-frequency bounce)
      const swell = Math.sin(bProg * Math.PI);
      bossScaleX = 1 + swell * 0.035;
      bossScaleY = 1 + swell * 0.045;
      bossBobY = -swell * 8;
      bossTiltRad = Math.sin(bProg * Math.PI * 2) * 0.022;
    } else if (b.subType === "alpha_wyvern") {
      bossBobY = Math.sin((now || 0) * 0.004) * 9;
    }

    const brx = (b.recoilOffset || 0) + bossLungeX;

    if (b.isAbra) {
      // Görev 1.3: Abra için siyah zemin gölgesi yok; waterlineY'de 2 halkalı su dalgacığı
      const wY = b.waterlineY || 1238;
      const ripT = ((now || 0) * 0.001) % 1.6;
      const ripProg1 = ripT / 1.6;
      const ripProg2 = (ripProg1 + 0.5) % 1.0;
      ctx.save();
      ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
      ctx.lineWidth = 2.2;
      [ripProg1, ripProg2].forEach(rp => {
        const rw = 170 * (0.6 + rp * 0.4);
        const rh = 18 * (0.6 + rp * 0.4);
        const a = (1 - rp) * 0.45;
        ctx.strokeStyle = `rgba(125, 211, 252, ${a})`;
        ctx.beginPath();
        ctx.ellipse(b.x + brx, wY, rw, rh, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.beginPath();
      ctx.ellipse(b.x + brx, b.y + 6, b.isDragonCommander ? 150 : b.isSubBoss ? 86 : 126, b.isDragonCommander ? 22 : 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // If Boss is in Taunt Exposed state (from Laf Atma!), draw a pulsing golden target aura ring around the Boss!
      if (b.tauntExposed) {
        const expPulse = 0.65 + Math.sin((now || 0) * 0.006) * 0.25;
        ctx.save();
        ctx.strokeStyle = `rgba(253, 224, 71, ${expPulse})`;
        ctx.lineWidth = 3.2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(b.x + brx, b.y + 4, (b.isDragonCommander ? 165 : b.isSubBoss ? 98 : 140), 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (b.isAbra) {
      // Görev 5.2: Abra için ctx.filter = 'none', Canvas drop-shadow 76 dilim yükü kaldırıldı
      ctx.filter = "none";
    } else if (b.hitFlash > 0) {
      b.hitFlash--;
      ctx.filter = "brightness(1.65) contrast(1.2) drop-shadow(0 0 18px #ffe0a0)";
    } else if (b.state === "taunt" || b.state === "entrance_roar" || b.state === "windup") {
      ctx.filter = `drop-shadow(0 10px 18px rgba(0, 0, 0, 0.88)) drop-shadow(0 0 16px ${isKom ? "rgba(249, 115, 22, 0.65)" : "rgba(154, 208, 122, 0.65)"})`;
    } else {
      ctx.filter = isKom
        ? "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.88)) drop-shadow(0 -2px 8px rgba(249, 115, 22, 0.32))"
        : "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.88)) drop-shadow(0 -2px 8px rgba(154, 208, 122, 0.30))";
    }

    if (activePlugin && typeof activePlugin.renderBoss === "function" && activePlugin.renderBoss(ctx, b, brx, bossBobY, bossLungeX, tSec)) {
      // Custom modular boss rendered by raid plugin
    } else {
      ctx.translate(b.x + brx, b.y + bossBobY);
      ctx.rotate(bossTiltRad);
      ctx.scale(b.facing * bossScaleX, bossScaleY);
      if (sImg && sImg.complete && sImg.naturalWidth > 0) {
        if (b.isDragonCommander) {
          ctx.drawImage(sImg, -220, -405, 440, 415);
        } else if (b.isSubBoss) {
          ctx.drawImage(sImg, -118, -228, 236, 236);
        } else {
          ctx.drawImage(sImg, -188, -376, 376, 384);
        }
      }
      ctx.restore();
    }

    // Update Boss trailing ghostHp for the Top HUD Boss Banner (no duplicate canvas HP bar over Boss head!)
    if (b.ghostHp == null) b.ghostHp = b.hp;
    if (b.hp < b.ghostHp) {
      if ((b.ghostHoldTimer || 0) > 0) b.ghostHoldTimer--;
      else {
        b.ghostHp += (b.hp - b.ghostHp) * 0.14;
        if (Math.abs(b.ghostHp - b.hp) < 1) b.ghostHp = b.hp;
      }
    } else {
      b.ghostHp = b.hp;
    }
    if (typeof document !== "undefined") {
      const bhpG = document.getElementById("shmBossHpGhost");
      if (bhpG) bhpG.style.width = Math.max(0, Math.min(100, (b.ghostHp / b.maxHp) * 100)).toFixed(1) + "%";
    }

    if (activePlugin && typeof activePlugin.renderWeakSpotReticle === "function" && activePlugin.renderWeakSpotReticle(ctx, b, now)) {
      // Custom weak spot reticle rendered by raid plugin
    } else if ((SHM.charging && SHM.turn === "player") || b.tauntExposed) {
      const crownX = b.x + b.facing * (b.isDragonCommander ? 42 : b.isSubBoss ? 14 : 18);
      const crownY = b.y - (b.isDragonCommander ? 315 : b.isSubBoss ? 175 : 295);
      ctx.save();
      ctx.strokeStyle = b.tauntExposed ? "rgba(94, 234, 212, 0.96)" : "rgba(255, 224, 160, 0.9)";
      ctx.lineWidth = b.tauntExposed ? 3.2 : 2.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(crownX, crownY, b.tauntExposed ? 34 + Math.sin((now || 0) * 0.015) * 4 : 28, 0, Math.PI * 2);
      ctx.stroke();
      if (b.tauntExposed) {
        ctx.font = "900 10px sans-serif";
        ctx.fillStyle = "#d9b062";
        ctx.textAlign = "center";
        ctx.fillText("AÇIK VERDİ · +%35 KRİTİK!", crownX, crownY - 38);
      }
      ctx.restore();
    }

    // ─── WORLD-SPACE COMIC SPEECH BUBBLE NEXT TO BOSS (COMPACT & NON-INTRUSIVE) ───
    if (SHM.canvasBubble && SHM.canvasBubble.timer > 0) {
      const cb = SHM.canvasBubble;
      cb.timer--;
      const boxW = 248;
      const boxH = 56;
      const bHeadX = b.x - (b.isDragonCommander ? 195 : b.isSubBoss ? 125 : 175);
      let bHeadY = b.y - (b.isDragonCommander ? 335 : b.isSubBoss ? 195 : 310);
      const zoom = SHM.cam.zoom || 1;
      const screenLeft = (bHeadX - boxW - SHM.cam.x) * zoom;
      const screenTop = (bHeadY - boxH / 2 - SHM.cam.y) * zoom;
      if (screenLeft < 335 && screenTop < 185) {
        bHeadY += (185 - screenTop) / zoom;
      }
      const alpha = Math.min(1, cb.timer / 24, (cb.maxTimer - cb.timer + 1) / 8);
      const popScale = cb.maxTimer - cb.timer < 8 ? 0.86 + ((cb.maxTimer - cb.timer) / 8) * 0.14 : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(bHeadX, bHeadY);
      ctx.scale(popScale, popScale);

      const bx = -boxW;
      const by = -boxH / 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 5, boxW, boxH, 10);
      ctx.fill();

      const bubGrad = ctx.createLinearGradient(0, by, 0, by + boxH);
      bubGrad.addColorStop(0, "#fcf4e4");
      bubGrad.addColorStop(1, "#f3e2c3");
      ctx.fillStyle = bubGrad;
      ctx.strokeStyle = "#2a160c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      // Speech bubble tail pointing right toward the Boss's mouth
      ctx.fillStyle = "#f7ebd2";
      ctx.strokeStyle = "#2a160c";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(22, 4);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Word-wrap the Boss's live banter text inside the bubble (up to 2 lines, clean & concise)
      ctx.fillStyle = "#1c1008";
      ctx.font = "italic 700 11.5px Georgia, serif";
      ctx.textAlign = "left";
      const words = String(cb.text || "").split(/\s+/);
      const lines = [];
      let curLine = "";
      for (const w of words) {
        const test = curLine ? curLine + " " + w : w;
        if (ctx.measureText(test).width > boxW - 22 && curLine) {
          lines.push(curLine);
          curLine = w;
          if (lines.length >= 2) break;
        } else {
          curLine = test;
        }
      }
      if (curLine && lines.length < 2) lines.push(curLine);
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], bx + 12, by + 23 + li * 16);
      }

      ctx.restore();
    }
  }

  for (const lb of SHM.laserBeams) {
    lb.life--;
    ctx.save();
    ctx.strokeStyle = lb.color;
    ctx.lineWidth = 9;
    ctx.shadowColor = lb.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = Math.min(1, lb.life / 20);
    ctx.beginPath();
    ctx.moveTo(lb.x1, lb.y1);
    ctx.lineTo(lb.x2, lb.y2);
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
  }
  SHM.laserBeams = SHM.laserBeams.filter(lb => lb.life > 0);

  // Render Fire Dragon Molten Lava Pools on the Ground
  if (Array.isArray(SHM.lavaPools) && SHM.lavaPools.length > 0) {
    for (const lp of SHM.lavaPools) {
      if (lp.turnsLeft <= 0) continue;
      ctx.save();
      const lPulse = 0.72 + Math.sin((now || 0) * 0.012 + lp.x) * 0.22;
      ctx.fillStyle = `rgba(234, 88, 12, ${0.42 * lPulse})`;
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(lp.x, lp.y + 2, lp.radius, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Render Interactive Destructible & Physics Props (Barrels, Supply Crates, Bumper Mushrooms, Wind Vortexes, Portals, Tesla Coils & Caravan Wagon)
  if (SHM.props && SHM.props.length > 0) {
    for (const prop of SHM.props) {
      if (prop.dead) continue;
      ctx.save();
      const isBarrel = prop.type === "barrel";
      const isCrate = prop.type === "crate";
      const isBumper = prop.type === "bumper";
      const isVortex = prop.type === "vortex";
      const isPortal = prop.type === "portal";
      const isTesla = prop.type === "tesla";
      const isWagon = prop.type === "wagon";
      const pImg = isBarrel
        ? SHM_IMAGES.pvp_prop_barrel
        : isCrate
          ? SHM_IMAGES.pvp_prop_crate
          : isBumper
            ? SHM_IMAGES.pvp_prop_bumper
            : isPortal
              ? SHM_IMAGES.pvp_prop_portal
              : isTesla
                ? SHM_IMAGES.pvp_prop_tesla
                : isWagon
                  ? SHM_IMAGES.pvp_prop_wagon
                  : SHM_IMAGES.pvp_prop_vortex;
      const isFloating = isVortex || isPortal;
      const bobY = (isBarrel || isWagon) ? 0 : Math.sin((now || 0) * (isFloating ? 0.008 : 0.005) + prop.x) * (isFloating ? 6 : 3);
      if (!isFloating) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.ellipse(prop.x, prop.y + 2, isWagon ? 52 : 26, isWagon ? 12 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = isPortal ? "rgba(45, 212, 191, 0.65)" : "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y - 34 + bobY, 38, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (isTesla) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(prop.x, prop.y - 38 + bobY, 42 + Math.sin((now || 0) * 0.015) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (pImg && pImg.complete && pImg.naturalWidth > 0) {
        const sz = isWagon ? 122 : (isBumper || isVortex || isPortal || isTesla ? 76 : 64);
        ctx.drawImage(pImg, prop.x - sz / 2, prop.y - sz + 2 + bobY, sz, sz);
      } else {
        ctx.fillStyle = isBarrel ? "#dc2626" : isCrate ? "#d97706" : isBumper ? "#10b981" : isPortal ? "#14b8a6" : isTesla ? "#38bdf8" : "#0ea5e9";
        ctx.fillRect(prop.x - 20, prop.y - 46 + bobY, 40, 46);
      }
      if (SHM.gameMode === "pvp" || isWagon) {
        ctx.font = "900 9.5px sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2.5;
        const lbl = isWagon
          ? "🐉 KERVAN ARABASI"
          : isBarrel
            ? "BARUT FIÇISI"
            : isCrate
              ? "İKMAL SANDIĞI"
              : isBumper
                ? "TRAMBOLİN MANTAR"
                : isPortal
                  ? (prop.isExit ? "ÇIKIŞ PORTALI" : "ASTRAL GEÇİT")
                  : isTesla
                    ? "PARATONER"
                    : "FIRTINA GİRDABI";
        const lblY = prop.y - (isWagon ? 126 : 76) + bobY;
        ctx.strokeText(lbl, prop.x, lblY);
        ctx.fillStyle = isWagon ? "#fde047" : isBarrel ? "#fca5a5" : isCrate ? "#fde68a" : isBumper ? "#6ee7b7" : isPortal ? "#5eead4" : "#7dd3fc";
        ctx.fillText(lbl, prop.x, lblY);
      }
      ctx.restore();
    }
  }

  // Render Co-op Teammate Units on the Same Dungeon / Caravan Terrain Map!
  if ((SHM.gameMode === "raid" || SHM.gameMode === "caravan") && (!SHM.soloMode || SHM.gameMode === "caravan") && Array.isArray(SHM.coopUnits) && SHM.coopUnits.length > 0) {
    for (let ci = 0; ci < SHM.coopUnits.length; ci++) {
      const cu = SHM.coopUnits[ci];
      if (SHM.heightMap && cu.x >= 0 && cu.x < SHM.WORLD_W) {
        cu.y = SHM.heightMap[Math.round(cu.x)] || cu.y;
      }
      drawCoopAllyUnit(ctx, cu, now, ci);
    }
  }

  // Render 2v2 PvP Blue Team Teammate & Red Team Rivals
  if (SHM.gameMode === "pvp") {
    if (SHM.pvpTeamMode === "2v2" && SHM.pvpAlly && !SHM.pvpAlly.dead) {
      drawCoopAllyUnit(ctx, SHM.pvpAlly, now, 0);
    }
    const rivals = Array.isArray(SHM.pvpRivals) && SHM.pvpRivals.length ? SHM.pvpRivals : (SHM.pvpRival ? [SHM.pvpRival] : []);
    for (const rv of rivals) {
      if (rv && !rv.dead) {
        drawPvpRivalUnit(ctx, rv, now);
      }
    }
  }

  if (p) {
    drawPlayerUnitAndArtilleryCompass(ctx, p, now);
    if (p.anchorBraced || (p.anchorAimBonus || 0) > 0) {
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 4, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }


  if (activePlugin && typeof activePlugin.renderForegroundFX === "function") {
    activePlugin.renderForegroundFX(ctx, W, p, tSec);
  }

  // Render Tumbling Physical Rock & Ember Crater Debris!
  for (const d of SHM.debris) {
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 0.36;
    d.rot += d.vrot;
    d.life--;
    const ix = Math.max(0, Math.min(W - 1, Math.round(d.x)));
    if (d.y >= SHM.heightMap[ix] && d.vy > 0) {
      d.y = SHM.heightMap[ix];
      d.vy *= -0.44;
      d.vx *= 0.72;
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, d.life / 22));
    ctx.fillStyle = d.color;
    ctx.strokeStyle = d.rimColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-d.r, -d.r * 0.6);
    ctx.lineTo(d.r * 0.8, -d.r * 0.9);
    ctx.lineTo(d.r, d.r * 0.5);
    ctx.lineTo(-d.r * 0.5, d.r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  SHM.debris = SHM.debris.filter(d => d.life > 0);

  for (const sw of SHM.shockwaves) {
    sw.r += (sw.maxR - sw.r) * 0.22;
    sw.alpha *= 0.86;
    ctx.save();
    ctx.strokeStyle = sw.color;
    ctx.globalAlpha = sw.alpha;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  SHM.shockwaves = SHM.shockwaves.filter(s => s.alpha > 0.05);

  const projImgMap = {
    ates: SHM_IMAGES.proj_ates,
    buz: SHM_IMAGES.proj_buz,
    firtina: SHM_IMAGES.proj_firtina,
    toprak: SHM_IMAGES.proj_toprak,
    golge: SHM_IMAGES.proj_golge,
    venom: SHM_IMAGES.proj_sahmeran,
    magma: SHM_IMAGES.proj_komutan,
    bluekor: SHM_IMAGES.proj_bluekor
  };

  for (const pr of SHM.projectiles) {
    pr.age = (pr.age || 0) + 1;
    if (activePlugin && typeof activePlugin.renderCustomProjectile === "function" && activePlugin.renderCustomProjectile(ctx, pr, tSec)) {
      continue;
    }
    ctx.save();
    const elCols = { ates: "#ef7f3e", buz: "#d9b062", firtina: "#c8a0f0", toprak: "#84cc16", golge: "#ff7a6a", venom: "#7ab05a", magma: "#ea580c", bluekor: "#7eb8d8" };
    const col = pr.isTeleport ? "#d9b062" : (elCols[pr.el] || "#ef7f3e");

    for (let t = 0; t < pr.trail.length; t++) {
      const pt = pr.trail[t];
      const ratio = (t + 1) / pr.trail.length;
      ctx.fillStyle = col;
      ctx.globalAlpha = ratio * 0.58;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ratio * (pr.isPow ? 14 : 8.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const pSprite = projImgMap[pr.el];
    if (pSprite && pSprite.complete && pSprite.naturalWidth > 0 && !pr.isTeleport) {
      const sz = pr.isPow ? 54 : 40;
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.drawImage(pSprite, -sz / 2, -sz / 2, sz, sz);
    } else {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.isPow ? 14 : 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const pt of SHM.particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += pt.isSmoke ? -0.03 : 0.16;
    if (pt.isSmoke) pt.r += 0.25;
    pt.life--;
    ctx.save();
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  SHM.particles = SHM.particles.filter(pt => pt.life > 0);

  // Fountain Pop-Scale Floating Damage & Status Numbers
  for (const ft of SHM.floatTexts) {
    ft.x += ft.vx || 0;
    ft.y += ft.vy;
    if (ft.grav) ft.vy += ft.grav;
    if (ft.scale && ft.scale > 1.0) {
      ft.scale = Math.max(1.0, ft.scale - 0.055);
    }
    ft.life--;
    ctx.save();
    ctx.translate(ft.x, ft.y);
    const sc = ft.scale || 1;
    ctx.scale(sc, sc);
    ctx.font = `900 ${ft.size}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.max(0, Math.min(1, (ft.life / ft.maxLife) * 1.35));
    if (ft.isCrit) {
      const tw = ctx.measureText(ft.text).width + 22;
      ctx.fillStyle = "rgba(18, 10, 6, 0.85)";
      ctx.strokeStyle = "#d9b062";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -ft.size - 2, tw, ft.size + 10, 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4.5;
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }
  SHM.floatTexts = SHM.floatTexts.filter(ft => ft.life > 0);

  ctx.restore();

  // ─── UNIFIED BIOME COLOR-GRADING LUT & ATMOSPHERIC VIGNETTE OVERLAY ───
  ctx.save();
  const lutGrad = ctx.createRadialGradient(
    vw * 0.5, vh * 0.54, Math.min(vw, vh) * 0.24,
    vw * 0.5, vh * 0.5, Math.max(vw, vh) * 0.78
  );
  if (isKom) {
    const isBlueCore = (b && b.phase >= 4) || isExtremeMode();
    lutGrad.addColorStop(0, isBlueCore ? "rgba(56, 189, 248, 0.04)" : "rgba(251, 146, 60, 0.05)");
    lutGrad.addColorStop(0.65, "rgba(24, 10, 6, 0.14)");
    lutGrad.addColorStop(1, "rgba(12, 5, 3, 0.44)");
  } else if (isAbra) {
    lutGrad.addColorStop(0, "rgba(56, 189, 248, 0.05)");
    lutGrad.addColorStop(0.65, "rgba(6, 18, 30, 0.14)");
    lutGrad.addColorStop(1, "rgba(3, 10, 18, 0.42)");
  } else {
    lutGrad.addColorStop(0, "rgba(110, 231, 183, 0.04)");
    lutGrad.addColorStop(0.65, "rgba(8, 20, 15, 0.14)");
    lutGrad.addColorStop(1, "rgba(4, 10, 8, 0.42)");
  }
  ctx.fillStyle = lutGrad;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();

  drawOffscreenTargetIndicators(ctx, vw, vh, now);
  renderLiveMinimap();
}

function drawOffscreenTargetIndicators(ctx, vw, vh, now) {
  const p = SHM.player;
  const b = SHM.boss;
  const targets = [];

  if (SHM.gameMode === "pvp" && SHM.pvpRival && !SHM.pvpRival.dead) {
    const rv = SHM.pvpRival;
    targets.push({
      x: rv.x,
      y: rv.y - 68,
      name: "KUZEY RÜZGÂRI",
      role: "PVP RAKİP",
      isBoss: true,
      isFlying: false,
      hpRatio: Math.max(0, Math.min(1, rv.hp / Math.max(1, rv.maxHp))),
      color: "#ff7a6a",
      border: "#d9b062"
    });
  }

  if (b && !b.dead) {
    const bossCenterY = b.y - (b.isAbra ? 215 : b.isDragonCommander ? 205 : b.isSubBoss ? 125 : 190);
    targets.push({
      x: b.x,
      y: bossCenterY,
      name: b.isAbra ? "ABRA" : b.isDragonCommander ? "KALGAROT" : b.isSubBoss ? b.name.split(" ")[0] : "ŞAHMERAN",
      role: b.isSubBoss ? "ARA-BOSS" : "DEV BOSS",
      isBoss: true,
      isFlying: b.subType === "alpha_wyvern",
      hpRatio: Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp))),
      color: "#ff7a6a",
      border: "#d9b062"
    });
  }

  // Zindanlarda (PvE) ekran kenarlarında muhafız isim kutuları yığılmasın; yalnızca Boss veya PvP rakibi için minimal yön oku gösterilir.
  const refX = p ? p.x : (SHM.cam.x + (vw / SHM.cam.zoom) * 0.5);
  const refY = p ? (p.y - 50) : (SHM.cam.y + (vh / SHM.cam.zoom) * 0.5);
  let rightEdgeStackIdx = 0;
  let leftEdgeStackIdx = 0;

  for (const t of targets) {
    const sx = (t.x - SHM.cam.x) * SHM.cam.zoom;
    const sy = (t.y - SHM.cam.y) * SHM.cam.zoom;
    const isOffscreen = sx < -80 || sx > vw + 80;
    if (!isOffscreen) continue;

    const distM = Math.max(1, Math.round(Math.hypot(t.x - refX, t.y - refY) / 18));
    const ang = Math.atan2(sy - vh * 0.48, sx - vw * 0.42);

    const onRight = sx >= vw * 0.5;
    const stackOffset = onRight ? (rightEdgeStackIdx++ * 42) : (leftEdgeStackIdx++ * 42);
    const ix = Math.max(76, Math.min(vw - 76, sx));
    const rawIy = Math.max(118, Math.min(vh - 134, sy));
    const iy = Math.max(118, Math.min(vh - 134, rawIy + stackOffset));

    ctx.save();
    ctx.translate(ix, iy);

    ctx.save();
    ctx.rotate(ang);
    const pulse = 1 + Math.sin((now || 0) * 0.008) * 0.12;
    ctx.fillStyle = t.border;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(42 * pulse, 0);
    ctx.lineTo(28, -8);
    ctx.lineTo(32, 0);
    ctx.lineTo(28, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const boxW = 76;
    const boxH = 24;
    const bx = onRight ? -boxW + 22 : -22;
    const by = -boxH / 2;

    ctx.fillStyle = "rgba(14, 9, 6, 0.88)";
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "900 10px monospace";
    ctx.fillStyle = "#fde68a";
    ctx.fillText(`${distM}m`, bx + boxW / 2, by + 15);

    ctx.restore();
  }

  // Görev 5.8: Geliştirici ölçümü (window.__abraPerf = true)
  if (typeof window !== "undefined" && window.__abraPerf) {
    if (!window._abraPerfHistory) window._abraPerfHistory = [];
    const dt = SHM._lastDt || 0.0166;
    window._abraPerfHistory.push(dt * 1000);
    if (window._abraPerfHistory.length > 60) window._abraPerfHistory.shift();
    const avgMs = (window._abraPerfHistory.reduce((a, b) => a + b, 0) / window._abraPerfHistory.length).toFixed(1);
    const fps = (1000 / Math.max(1, avgMs)).toFixed(0);

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vw - 195, 15, 180, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "900 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`PERF: ${avgMs}ms (${fps} FPS)`, vw - 185, 33);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 10px monospace";
    ctx.fillText(`AŞAMA 4 · EJDER TOPÇUSU`, vw - 185, 48);
    ctx.restore();
  }
}

// KATMAN 3: 3/4 Perspektif Ayak Gömme Payı (Foot Sink Offset: FOOT_SINK_Y = 14)
// 3/4 Chibi karakterlerin ayakları çim/taş şeridinin tam tepesinde havada asılı kalmaz; +14px perspektif derinliğine basar.

function drawPlayerUnitAndArtilleryCompass(ctx, p, now) {
  ctx.save();
  const sinkY = SHM.gameMode === "pvp" ? FOOT_SINK_Y : 8;
  const step = Math.abs(Math.sin(p.walkPhase));
  const k = Math.min(1, p.walkSpeed);
  const lift = step * k * 11;
  const tilt = Math.sin(p.walkPhase) * 2.4 * k;
  if (p.recoilOffset) {
    p.recoilOffset *= 0.76;
    if (Math.abs(p.recoilOffset) < 0.4) p.recoilOffset = 0;
  }
  const rx = p.recoilOffset || 0;

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.beginPath();
  ctx.ellipse(p.x + rx, p.y + sinkY - 2, 30 * (1 - lift * 0.015), 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // ADIM 4: Yalnızca Power-Up (Yetenek) Seçiliyken Karakterin Ayaklarının Altında Yanan Elips Perspektifli Selçuklu Rün Halkası (UI-15)!
  if (SHM.turn === "player" && hasArmedPowerup()) {
    const runeImg = SHM_IMAGES.ui_powerup_ground_rune_ring || SHM_IMAGES.asset_ui_15_powerup_ground_rune_ring;
    if (runeImg && runeImg.complete && runeImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(p.x + rx, p.y + sinkY - 2);
      ctx.scale(1, 0.38);
      ctx.rotate((now || 0) * 0.0025);
      ctx.drawImage(runeImg, -58, -58, 116, 116);
      ctx.restore();
    }
  }

  if (p.shield > 0) {
    ctx.strokeStyle = "rgba(217, 176, 98, 0.88)";
    ctx.fillStyle = "rgba(217, 176, 98, 0.16)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(p.x + rx, p.y - 46, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.save();
  if (p.hitFlash > 0) {
    p.hitFlash--;
    ctx.filter = "brightness(2.2) contrast(1.3) drop-shadow(0 0 14px #ff7a6a)";
  } else if (SHM.charging) {
    const chGlow = Math.round(6 + (SHM.power / 100) * 14);
    ctx.filter = `drop-shadow(0 6px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 ${chGlow}px rgba(255, 195, 90, 0.85))`;
  } else {
    ctx.filter = "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 -1px 4px rgba(217, 176, 98, 0.28))";
  }
  const idleBreath = Math.sin((now || 0) * 0.0046);
  const chargeSquash = SHM.charging ? (SHM.power / 100) * 0.065 : 0;
  if (p.animTimer > 0) {
    p.animTimer--;
    if (p.animTimer <= 0 && p.animState !== "guard") p.animState = "idle";
  }
  const animK = p.animTimer > 0 ? Math.min(1, p.animTimer / 24) : 0;
  const isShotAnim = (p.animState === "dragon_shot" || p.animState === "ult_combo") && p.animTimer > 0;
  const isHitAnim = (p.animState === "hit" && p.animTimer > 0) || p.hitFlash > 0;
  const isSlashAnim = (p.animState === "wpn_slash" || p.animState === "ult_combo") && p.animTimer > 0;

  const pScaleX = 1 - idleBreath * 0.015 + chargeSquash + (isShotAnim ? animK * 0.06 : 0);
  const pScaleY = 1 + idleBreath * 0.025 - chargeSquash + (isShotAnim ? -animK * 0.04 : 0);
  const hitShakeX = isHitAnim ? Math.sin((now || 0) * 0.09) * 6 : 0;
  const aimLeanDeg = ((p.angle || 25) - 25) * -0.18;
  const shotRecoilDeg = isShotAnim ? -14 * Math.sin(animK * Math.PI) : (isHitAnim ? -16 * animK : 0);

  ctx.translate(p.x + rx + hitShakeX, (p.y + sinkY) - lift - (p.animState === "ult_combo" && p.animTimer > 0 ? Math.sin(animK * Math.PI) * 14 : 0));
  ctx.rotate(((tilt + (p.slopeAngle || 0) * 0.35 + (aimLeanDeg + shotRecoilDeg) * p.facing - (SHM.charging ? (SHM.power / 100) * 4.5 * p.facing : 0)) * Math.PI) / 180);
  ctx.scale(p.facing * pScaleX, pScaleY);

  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const resolveLayer = id => (id && typeof CHIBI_ITEMS !== "undefined" && CHIBI_ITEMS[id] && CHIBI_ITEMS[id].layerKey) ? CHIBI_ITEMS[id].layerKey : id;
  const backId = resolveLayer(C && C.eq && C.eq.back);
  const armorId = resolveLayer((C && C.eq && C.eq.armor) || "armor_7");
  const hatId = resolveLayer((C && C.eq && C.eq.hat) || "hat_7");
  const wpnId = resolveLayer((C && C.eq && C.eq.wpn) || "wpn_6");

  const faceId = resolveLayer(C && C.eq && C.eq.face);
  const hideHair = ["hat_2", "hat_3", "hat_4", "hat_6", "hat_8", "hat_9", "hat_10", "hat_11", "hat_12", "abra_helm"].includes(hatId);
  const headBobY = Math.sin((now || 0) * 0.0052) * 1.8;
  if (backId) {
    drawCachedLayer(ctx, `img/chibi/layers/${backId}.webp`, -44, -104 + headBobY * 0.5, 88, 112);
  }
  drawCachedLayer(ctx, `img/chibi/layers/neck_${(C && C.gender) || "male"}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/${armorId}.webp`, -44, -104, 88, 112);
  drawCachedLayer(ctx, `img/chibi/layers/head_expr_${(C && C.expr) || 3}.webp`, -44, -104 + headBobY, 88, 112);
  if (faceId) {
    drawCachedLayer(ctx, `img/chibi/layers/${faceId}.webp`, -44, -104 + headBobY, 88, 112);
  }
  if (C && C.hair > 0 && !hideHair) {
    drawCachedLayer(ctx, `img/chibi/layers/hair_${C.hair}.webp`, -44, -104 + headBobY, 88, 112);
  }
  drawCachedLayer(ctx, `img/chibi/layers/${hatId}.webp`, -44, -104 + headBobY, 88, 112);

  // Silah & El: Salınım ve Saldırı Açısı
  ctx.save();
  const wpnSwingRad = isSlashAnim
    ? Math.sin(animK * Math.PI * 2) * 0.68
    : isShotAnim
    ? -0.28 * Math.sin(animK * Math.PI)
    : Math.sin((now || 0) * 0.0048) * 0.055;
  ctx.translate(12, -46);
  ctx.rotate(wpnSwingRad);
  ctx.translate(-12, 46);
  drawCachedLayer(ctx, `img/chibi/layers/${wpnId}.webp`, -44, -104, 88, 112);
  if (!armorId) {
    drawCachedLayer(ctx, `img/chibi/layers/hand_grip.webp`, -44, -104, 88, 112);
  }
  ctx.restore();

  // Omuz Yoldaşı Yavru Ejderha: Nişan Açısı + Atış Atılımı + Kanat Çırpışı
  ctx.save();
  const drKey = `img/dr-${p.el || "ates"}-yavru.webp`;
  const wingBob = Math.sin((now || 0) * 0.0085) * 4.5 + (p.walkSpeed > 0.05 ? Math.sin(p.walkPhase) * 2.5 : 0);
  const drLungeX = isShotAnim ? Math.sin(animK * Math.PI) * 14 : 0;
  const drLungeY = isShotAnim ? -Math.sin(animK * Math.PI) * 6 : 0;
  const drAimRad = (-((p.angle || 25) - 25) * 0.45 * Math.PI) / 180;
  ctx.translate(24 + drLungeX, -56 + wingBob + drLungeY);
  ctx.rotate(drAimRad);
  if (isShotAnim) {
    ctx.scale(1.12, 1.12);
  }
  drawCachedLayer(ctx, drKey, -20, -22, 48, 44);
  ctx.restore();
  ctx.restore();

  if (SHM.turn === "player") {
    const originX = p.x;
    const originY = p.y - 50;
    const truePitch = p.angle - (p.slopeAngle || 0);
    const rad = (truePitch * Math.PI) / 180;

    ctx.save();
    ctx.translate(originX, originY);

    if (SHM.lastShotAngle != null && SHM.lastShotFacing === p.facing) {
      const ghostPitch = SHM.lastShotAngle - (p.slopeAngle || 0);
      const gRad = (ghostPitch * Math.PI) / 180;
      const gVx = Math.cos(gRad) * p.facing;
      const gVy = -Math.sin(gRad);
      ctx.save();
      ctx.strokeStyle = "rgba(217, 176, 98, 0.38)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(gVx * 18, gVy * 18);
      ctx.lineTo(gVx * 64, gVy * 64);
      ctx.stroke();
      ctx.restore();
    }

    const aimVx = Math.cos(rad) * p.facing;
    const aimVy = -Math.sin(rad);

    let impactDist = null;
    if (SHM.terrainCtx) {
      for (let d = 20; d <= 240; d += 4) {
        const wx = Math.round(originX + aimVx * d);
        const wy = Math.round(originY + aimVy * d);
        if (wx < 0 || wx >= SHM.WORLD_W || wy < 0 || wy >= SHM.WORLD_H) break;
        if (SHM.terrainCtx.getImageData(wx, wy, 1, 1).data[3] > 40) {
          impactDist = d;
          break;
        }
      }
    }
    const guideEnd = impactDist != null ? impactDist : 240;
    if (guideEnd > 68) {
      ctx.save();
      ctx.strokeStyle = impactDist != null ? "rgba(251, 191, 36, 0.62)" : "rgba(163, 230, 53, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(aimVx * 68, aimVy * 68);
      ctx.lineTo(aimVx * guideEnd, aimVy * guideEnd);
      ctx.stroke();
      ctx.restore();
    }
    if (impactDist != null) {
      const ix2 = aimVx * impactDist;
      const iy2 = aimVy * impactDist;
      const pulseI = 1 + Math.sin((now || 0) * 0.012) * 0.12;
      ctx.save();
      ctx.translate(ix2, iy2);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 11 * pulseI, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-17, 0); ctx.lineTo(-6, 0);
      ctx.moveTo(6, 0); ctx.lineTo(17, 0);
      ctx.moveTo(0, -17); ctx.lineTo(0, -6);
      ctx.moveTo(0, 6); ctx.lineTo(0, 17);
      ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = SHM.charging ? "#ef7f3e" : "#ffe0a0";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(aimVx * 18, aimVy * 18);
    ctx.lineTo(aimVx * 68, aimVy * 68);
    ctx.stroke();

    const tipX = aimVx * 68;
    const tipY = aimVy * 68;
    const headLen = 8.5;
    const ang = Math.atan2(aimVy, aimVx);
    ctx.fillStyle = SHM.charging ? "#ef7f3e" : "#ffe0a0";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - headLen * Math.cos(ang - 0.45), tipY - headLen * Math.sin(ang - 0.45));
    ctx.lineTo(tipX - headLen * Math.cos(ang + 0.45), tipY - headLen * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe0a0";
    ctx.font = "900 13px monospace";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(`${Math.round(truePitch)}°`, aimVx * 86, aimVy * 86 + 4);
    ctx.fillText(`${Math.round(truePitch)}°`, aimVx * 86, aimVy * 86 + 4);
    ctx.restore();

    const hasSniperSight = SHM.gameMode === "pvp" || SHM.allies.includes("selin") || SHM.runBuffs.guideAlways || (C && C.eq && (C.eq.face === "face_8" || C.eq.face === "face_9"));
    const isFloatingPvp = SHM.gameMode === "pvp" && !(SHM.pvpMap === "steppe_canyon" || SHM.pvpMap === "glacier" || SHM.pvpMap === "sandstorm");
    const maxPreviewSteps = isFloatingPvp ? 0 : (SHM.gameMode === "pvp" ? 36 : (hasSniperSight ? 24 : 9));
    const previewPct = SHM.charging ? SHM.power : (SHM.lastPower || 62);
    const spd = 5.2 + (previewPct / 100) * 21.5;
    let sx = originX + p.facing * 28;
    let sy = originY;
    let svx = Math.cos(rad) * spd * p.facing;
    let svy = -Math.sin(rad) * spd;

    const pts = [];
    let lockedWeakSpot = null;
    let terrainImpactPt = null;
    const b = SHM.boss;
    const isColossalKom = !!(b && b.isDragonCommander);
    const isSub = !!(b && b.isSubBoss);
    const crownX = b ? b.x + b.facing * (isColossalKom ? 42 : isSub ? 14 : 18) : 0;
    const crownY = b ? b.y - (isColossalKom ? 315 : isSub ? 175 : 295) : 0;
    const heartX = b ? b.x + b.facing * 24 : 0;
    const heartY = b ? b.y - 190 : 0;

    for (let stepIdx = 1; stepIdx <= maxPreviewSteps; stepIdx++) {
      svx += SHM.wind * 0.0085 * 2;
      svy += (SHM.GRAVITY || 0.24) * 2;
      sx += svx * 2;
      sy += svy * 2;
      pts.push({ x: sx, y: sy });

      if (SHM.gameMode === "pvp" && stepIdx > 4 && SHM.terrainCtx) {
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix >= 0 && ix < SHM.WORLD_W && iy >= 0 && iy < SHM.WORLD_H) {
          if (SHM.terrainCtx.getImageData(ix, iy, 1, 1).data[3] > 120) {
            terrainImpactPt = { x: ix, y: iy };
            break;
          }
        }
      }

      if (hasSniperSight && b && !b.dead && !lockedWeakSpot) {
        if (isColossalKom && Math.hypot(sx - heartX, sy - heartY) <= 64) {
          lockedWeakSpot = { x: heartX, y: heartY, lbl: "x2.9" };
        } else if (Math.hypot(sx - crownX, sy - crownY) <= (isSub ? 48 : 66)) {
          lockedWeakSpot = { x: crownX, y: crownY, lbl: "x2.6" };
        }
      }
    }

    ctx.save();
    for (let stepIdx = 0; stepIdx < pts.length; stepIdx++) {
      const pt = pts[stepIdx];
      const fade = SHM.gameMode === "pvp" ? 0.92 : (1 - (stepIdx / (maxPreviewSteps + 2)) * 0.65);
      ctx.globalAlpha = fade;
      ctx.fillStyle = lockedWeakSpot ? "#ffe0a0" : (SHM.charging ? "#ef7f3e" : (stepIdx > pts.length * 0.68 ? "#fbbf24" : "rgba(254, 240, 138, 0.85)"));
      ctx.shadowColor = "#ea580c";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, stepIdx === pts.length - 1 ? 4.5 : (stepIdx % 3 === 0 ? 3.8 : 3.0), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if (terrainImpactPt) {
      ctx.save();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(terrainImpactPt.x, terrainImpactPt.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(terrainImpactPt.x, terrainImpactPt.y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (lockedWeakSpot) {
      ctx.save();
      ctx.translate(lockedWeakSpot.x, lockedWeakSpot.y);
      ctx.rotate(now * 0.004);
      ctx.strokeStyle = "#ffe0a0";
      ctx.lineWidth = 2.2;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();
    }
    ctx.restore();
  }

  const pBarCol = SHM.gameMode === "pvp" ? "#38bdf8" : "#9ad07a";
  const pBarLbl = SHM.gameMode === "pvp" ? "MAVİ · SEN" : "";
  drawWorldHpBar(ctx, p.x + rx, p.y - 118, 86, p.hp, p.maxHp, pBarCol, pBarLbl, p);
  ctx.restore();
}

function drawCoopAllyUnit(ctx, cu, now, idx = 0) {
  ctx.save();
  const sinkY = SHM.gameMode === "pvp" ? FOOT_SINK_Y : 8;
  if (cu.animTimer > 0) {
    cu.animTimer--;
    if (cu.animTimer <= 0) cu.state = "idle";
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.beginPath();
  ctx.ellipse(cu.x, cu.y + sinkY - 2, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.filter = "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 -1px 4px rgba(56, 189, 248, 0.32))";
  const breath = Math.sin((now || 0) * 0.0045 + idx * 1.4);
  const isShot = cu.state === "attack" && cu.animTimer > 0;
  const lungeX = isShot ? 6 : 0;
  ctx.translate(cu.x + lungeX, cu.y + sinkY);
  ctx.scale((cu.facing || 1) * (1 - breath * 0.014), 1 + breath * 0.022);

  const C = cu.chibi || (typeof peerChibiConfig === "function" ? peerChibiConfig({ handle: cu.handle, name: cu.name }, idx) : null);
  const gender = (C && C.gender) || (idx === 0 ? "female" : "male");
  const expr = (C && C.expr) || (idx === 0 ? 2 : 8);
  const hair = (C && C.hair != null) ? C.hair : (idx === 0 ? 6 : 7);
  const eq = (C && C.eq) || {};
  const resolveLayer = id => (id && typeof CHIBI_ITEMS !== "undefined" && CHIBI_ITEMS[id] && CHIBI_ITEMS[id].layerKey) ? CHIBI_ITEMS[id].layerKey : id;
  const backId = resolveLayer(eq.back || (idx === 0 ? "back_9" : "back_10"));
  const armorId = resolveLayer(eq.armor || (idx === 0 ? "armor_9" : "armor_10"));
  const faceId = resolveLayer(eq.face || null);
  const hatId = resolveLayer(eq.hat || (idx === 0 ? "hat_9" : "hat_10"));
  const wpnId = resolveLayer(eq.wpn || (idx === 0 ? "wpn_9" : "wpn_10"));
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

  // Co-op Teammate's Shoulder Baby Dragon
  ctx.save();
  const wingBob = Math.sin((now || 0) * 0.0085 + idx) * 4.2;
  ctx.translate(24, -56 + wingBob);
  drawCachedLayer(ctx, `img/dr-${cu.el || "buz"}-yavru.webp`, -20, -22, 48, 44);
  ctx.restore();
  ctx.restore();

  const barCol = idx === 0 ? "#38bdf8" : "#c084fc";
  const lbl = SHM.gameMode === "pvp" ? `${(cu.handle || cu.name || "MÜTTEFİK").toUpperCase()}` : "";
  drawWorldHpBar(ctx, cu.x, cu.y - 118, 86, cu.hp, cu.maxHp, barCol, lbl, cu);
  ctx.restore();
}


const LAYER_CACHE = {};
function drawCachedLayer(ctx, src, x, y, w, h) {
  if (typeof Image === "undefined") return;
  if (!LAYER_CACHE[src]) {
    const im = new Image();
    im.src = src;
    LAYER_CACHE[src] = im;
  }
  const im = LAYER_CACHE[src];
  if (im && im.complete && im.naturalWidth > 0) {
    ctx.drawImage(im, x, y, w, h);
  }
}

function drawWorldHpBar(ctx, x, y, w, hp, maxHp, color, label, unitObj = null) {
  ctx.save();
  if (unitObj) {
    if (unitObj.ghostHp == null) unitObj.ghostHp = hp;
    if (hp < unitObj.ghostHp) {
      if ((unitObj.ghostHoldTimer || 0) > 0) {
        unitObj.ghostHoldTimer--;
      } else {
        unitObj.ghostHp += (hp - unitObj.ghostHp) * 0.14;
        if (Math.abs(unitObj.ghostHp - hp) < 1) unitObj.ghostHp = hp;
      }
    } else {
      unitObj.ghostHp = hp;
    }
  }
  const gHp = unitObj && unitObj.ghostHp != null ? unitObj.ghostHp : hp;
  const gRatio = Math.max(0, Math.min(1, gHp / Math.max(1, maxHp)));
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));

  const plaqueImg = SHM_IMAGES.ui_overhead_hp_plaque || SHM_IMAGES.asset_ui_08_overhead_hp_plaque;
  const pw = 118;
  const ph = 36;
  const px = Math.round(x - pw * 0.5);
  const py = Math.round(y - 22);
  if (plaqueImg && plaqueImg.complete && plaqueImg.naturalWidth > 0) {
    ctx.drawImage(plaqueImg, px, py, pw, ph);
  }
  const bx = Math.round(px + pw * 0.272);
  const by = Math.round(py + ph * 0.415);
  const bw = Math.round(pw * 0.628);
  const bh = Math.round(ph * 0.22);
  if (gRatio > ratio + 0.005) {
    ctx.fillStyle = "rgba(255, 224, 160, 0.88)";
    ctx.fillRect(bx, by, Math.round(bw * gRatio), bh);
  }
  ctx.fillStyle = color;
  ctx.fillRect(bx, by, Math.round(bw * ratio), bh);
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.fillRect(bx, by, Math.round(bw * ratio), 2);
  if (label && SHM.gameMode === "pvp") {
    const cleanLbl = label.replace(/^RAKİP:\s*/i, "");
    const cx = px + pw * 0.55;
    ctx.font = "800 9px 'Segoe UI', sans-serif";
    const tw = Math.ceil(ctx.measureText(cleanLbl).width) + 10;
    const pillX = Math.round(cx - tw * 0.5);
    const pillY = py - 9;
    ctx.fillStyle = "rgba(14, 9, 6, 0.90)";
    ctx.strokeStyle = "rgba(217, 176, 98, 0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, tw, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(cleanLbl, cx, pillY + 9);
  }
  ctx.restore();
}

function spawnExplosionParticles(x, y, color, count = 24) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 6.5;
    SHM.particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 2.2,
      r: 2.5 + Math.random() * 4.5,
      color: i % 3 === 0 ? "#ffe0a0" : color,
      life: 24 + Math.floor(Math.random() * 22),
      maxLife: 46
    });
  }
}

function renderLiveMinimap() {
  if (typeof document === "undefined") return;
  const mm = document.getElementById("shmMinimap");
  if (!mm) return;
  const mctx = mm.getContext("2d");
  const mw = mm.width;
  const mh = mm.height;
  const W = SHM.WORLD_W;
  const H = SHM.WORLD_H;

  mctx.clearRect(0, 0, mw, mh);
  mctx.fillStyle = "#06110e";
  mctx.fillRect(0, 0, mw, mh);

  mctx.fillStyle = SHM.raidId === "komutan" ? "#7c2d12" : "#1f5f52";
  mctx.beginPath();
  mctx.moveTo(0, mh);
  for (let x = 0; x < W; x += 28) {
    const mx = (x / W) * mw;
    const my = (SHM.heightMap[x] / H) * mh;
    mctx.lineTo(mx, my);
  }
  mctx.lineTo(mw, mh);
  mctx.closePath();
  mctx.fill();

  if (SHM.player) {
    mctx.fillStyle = "#9ad07a";
    mctx.beginPath();
    mctx.arc((SHM.player.x / W) * mw, (SHM.player.y / H) * mh - 3, 4.5, 0, Math.PI * 2);
    mctx.fill();
  }
  for (const e of SHM.enemies) {
    if (e.dead) continue;
    mctx.fillStyle = "#ffb067";
    mctx.beginPath();
    mctx.arc((e.x / W) * mw, (e.y / H) * mh - 3, 4, 0, Math.PI * 2);
    mctx.fill();
  }
  if (SHM.boss && !SHM.boss.dead) {
    mctx.fillStyle = "#ff7a6a";
    mctx.beginPath();
    mctx.arc((SHM.boss.x / W) * mw, (SHM.boss.y / H) * mh - 5, 6.5, 0, Math.PI * 2);
    mctx.fill();
  }
  if (SHM.gameMode === "pvp" && SHM.pvpRival && !SHM.pvpRival.dead) {
    mctx.fillStyle = "#ff7a6a";
    mctx.beginPath();
    mctx.arc((SHM.pvpRival.x / W) * mw, (SHM.pvpRival.y / H) * mh - 4, 5.5, 0, Math.PI * 2);
    mctx.fill();
  }
  if (SHM.props && SHM.props.length > 0) {
    for (const pr of SHM.props) {
      if (pr.dead) continue;
      mctx.fillStyle = pr.type === "barrel" ? "#ef4444" : "#facc15";
      mctx.fillRect((pr.x / W) * mw - 2, (pr.y / H) * mh - 5, 4, 4);
    }
  }
}

/* ============================================================================
   60 FPS MAIN LOOP
   ============================================================================ */
let SHM_RAF = null;
function startSahmeranLoop() {
  if (typeof requestAnimationFrame === "undefined") return;
  if (SHM_RAF) cancelAnimationFrame(SHM_RAF);
  SHM.lastTick = performance.now();
  const loop = (now) => {
    if (!SHM.open) return;
    SHM_RAF = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (SHM.lastTick || now)) / 1000);
    SHM.lastTick = now;

    if (SHM.screen === "corridor") {
      updateCorridorWalkTick(dt);
    } else if (SHM.screen === "battle") {
      if (SHM.freezeFrames > 0) {
        SHM.freezeFrames--;
        renderBattleCanvasFrame(now);
        return;
      }
      updateBattleInputAndPhysics(dt);
      updateProjectilesAndHazards();
      if (SHM.fastSim && SHM.bossAttackCutTimer <= 0 && SHM.projectiles.length > 0) {
        updateProjectilesAndHazards();
      }
      renderBattleCanvasFrame(now);
    }
  };
  SHM_RAF = requestAnimationFrame(loop);
}

function updateBattleInputAndPhysics(dt) {
  const p = SHM.player;
  if (!p) return;

  if (SHM.pip && SHM.pip.timer > 0) {
    SHM.pip.timer--;
    if (SHM.pip.timer <= 0) {
      if (typeof document !== "undefined") {
        const mount = document.getElementById("shmPipMount");
        if (mount) mount.innerHTML = "";
      }
      SHM.pip = null;
    }
  }

  if (SHM.turn !== "player") return;

  SHM.turnTimer = Math.max(0, SHM.turnTimer - dt);
  if (typeof document !== "undefined") {
    const timerEl = document.getElementById("shmTurnTimer") || document.getElementById("shmTimerPill");
    if (timerEl) timerEl.textContent = Math.ceil(SHM.turnTimer) + "s";
  }
  if (SHM.turnTimer <= 0 && !SHM.charging) {
    SHM.turn = "enemy";
    advanceTurnAfterVolley();
    return;
  }

  let moving = false;
  if (!SHM.charging) {
    const moveDir = (SHM.keys["ArrowRight"] || SHM.keys["KeyD"]) ? 1 : (SHM.keys["ArrowLeft"] || SHM.keys["KeyA"]) ? -1 : 0;
    if (moveDir !== 0 && p.stamina > 0.5) {
      SHM.cam.manualPan = false;
      SHM.cam.mode = "follow";
      p.facing = moveDir;
      let nextX = Math.max(60, Math.min(SHM.WORLD_W - 60, p.x + moveDir * 165 * dt));
      const curY = findLocalGroundY(p.x, p.y);
      let nextY = findLocalGroundY(nextX, p.y);
      // Abra Aşama 4'te genişletilmiş gemi parçaları arasındaki deniz yarıklarından kanat sıçramasıyla karşı güverteye geç:
      if (SHM.raidId === "abra" && SHM.selectedStage === 4 && nextY >= 1400) {
        if (nextX > 590 && nextX < 815) {
          nextX = moveDir > 0 ? 820 : 585;
          nextY = findLocalGroundY(nextX, p.y);
        } else if (nextX > 1200 && nextX < 1415) {
          nextX = moveDir > 0 ? 1420 : 1195;
          nextY = findLocalGroundY(nextX, p.y);
        }
      }
      const dy = nextY - curY;
      if (dy > -26 && nextY < 1435) {
        p.x = nextX;
        p.y = nextY;
        p.stamina = Math.max(0, p.stamina - 22 * dt);
        p.walkPhase += 11 * dt;
        p.walkSpeed = Math.min(1, p.walkSpeed + 8 * dt);
        moving = true;
        const hL = findLocalGroundY(Math.max(0, Math.round(p.x - 14)), p.y);
        const hR = findLocalGroundY(Math.min(SHM.WORLD_W - 1, Math.round(p.x + 14)), p.y);
        p.slopeAngle = Math.atan2(hR - hL, 28) * (180 / Math.PI) * p.facing;
      }
    }
  }
  if (!moving) {
    p.walkSpeed = Math.max(0, p.walkSpeed - 8 * dt);
  }

  const angleDir = (SHM.keys["ArrowUp"] || SHM.keys["KeyW"]) ? 1 : (SHM.keys["ArrowDown"] || SHM.keys["KeyS"]) ? -1 : 0;
  if (angleDir !== 0) {
    SHM.cam.manualPan = false;
    SHM.cam.mode = "follow";
    const prevInt = Math.round(p.angle);
    p.angle = Math.max(-20, Math.min(85, p.angle + angleDir * 52 * dt));
    if (Math.round(p.angle) !== prevInt && Math.round(p.angle) % 2 === 0 && typeof SFX !== "undefined" && SFX.play) {
      SFX.play("angle_tick");
    }
    const truePitch = Math.round(p.angle - (p.slopeAngle || 0));
    if (typeof document !== "undefined") {
      const angEl = document.getElementById("shmAngleNum");
      if (angEl) angEl.textContent = truePitch + "°";
      const angPlq = document.getElementById("shmAnglePlaqueNum");
      if (angPlq) angPlq.textContent = truePitch + "°";
    }
  }

  if (SHM.gameMode === "pvp" && (moving || angleDir !== 0) && typeof mpSendWs === "function") {
    const nowMs = Date.now();
    if (!SHM._lastPvpAimSync || nowMs - SHM._lastPvpAimSync > 160) {
      SHM._lastPvpAimSync = nowMs;
      mpSendWs({
        type: "pvp_sync",
        action: "move_aim",
        from: (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi",
        mapId: SHM.pvpMap,
        x: Math.round(p.x),
        y: Math.round(p.y),
        facing: p.facing,
        angle: Math.round(p.angle),
        power: Math.round(SHM.power || SHM.lastPower || 55)
      });
    }
  }

  if (SHM.charging) {
    SHM.cam.manualPan = false;
    SHM.cam.mode = "follow";
    const prevP = Math.floor(SHM.power / 6);
    SHM.power += SHM.powerDir * 78 * dt;
    if (Math.floor(SHM.power / 6) !== prevP && typeof SFX !== "undefined" && SFX.play) {
      SFX.play("charge_hum");
    }
    if (SHM.power >= 100) {
      SHM.power = 100;
      SHM.powerDir = -1;
    } else if (SHM.power <= 5) {
      SHM.power = 5;
      SHM.powerDir = 1;
    }
    if (typeof document !== "undefined") {
      const fillEl = document.getElementById("shmPowerFill");
      const readEl = document.getElementById("shmPowerReadout");
      if (fillEl) fillEl.style.width = SHM.power.toFixed(1) + "%";
      if (readEl) readEl.innerHTML = `GÜÇ: <b>%${Math.round(SHM.power)}</b>`;
    }
  }

  if (moving && typeof document !== "undefined") {
    const staFill = document.getElementById("shmHeroStaFill");
    const staVal = document.getElementById("shmHeroStaVal");
    if (staFill) staFill.style.width = ((p.stamina / p.maxStamina) * 100).toFixed(1) + "%";
    if (staVal) staVal.textContent = `${Math.round(p.stamina)}/${p.maxStamina}`;
  }
}

if (typeof window !== "undefined") {
  window.SHM = SHM;
  window.initSahmeranBattleStage = initSahmeranBattleStage;
  window.renderBattleCanvasFrame = renderBattleCanvasFrame;
  window.performBossTauntTurn = performBossTauntTurn;
  window.firePlayerVolley = firePlayerVolley;
  window.updateProjectilesAndHazards = updateProjectilesAndHazards;
  window.applyDamageToBoss = applyDamageToBoss;
  window.executeEnemyAndBossActions = executeEnemyAndBossActions;
  window.detonateProjectile = detonateProjectile;
  window.launchBossMeteorRain = launchBossMeteorRain;
}
if (typeof global !== "undefined") {
  global.SHM = SHM;
  global.initSahmeranBattleStage = initSahmeranBattleStage;
  global.renderBattleCanvasFrame = renderBattleCanvasFrame;
  global.performBossTauntTurn = performBossTauntTurn;
  global.firePlayerVolley = firePlayerVolley;
  global.updateProjectilesAndHazards = updateProjectilesAndHazards;
  global.applyDamageToBoss = applyDamageToBoss;
  global.executeEnemyAndBossActions = executeEnemyAndBossActions;
  global.detonateProjectile = detonateProjectile;
  global.launchBossMeteorRain = launchBossMeteorRain;
}
