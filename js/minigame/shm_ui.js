/* ============================================================================
   EJDER TOPÇUSU — ARAYÜZ EKRANLARI, KOMİK CUT-IN, GANİMET ÇARKI & EVENT MOTORU
   (js/minigame/shm_ui.js)
   ============================================================================ */

function getBossPersona(b) {
  if (!b) return BOSS_COMIC_PERSONAS.kalgarot;
  if (b.id && BOSS_COMIC_PERSONAS[b.id]) return BOSS_COMIC_PERSONAS[b.id];
  if (b.id === "abra" || b.isAbra) return BOSS_COMIC_PERSONAS.abra;
  if (b.subType === "coral_golem" || b.id === "sub_coral_golem") return BOSS_COMIC_PERSONAS.sub_coral_golem;
  if (b.isSubBoss && BOSS_COMIC_PERSONAS[b.id]) return BOSS_COMIC_PERSONAS[b.id];
  if (b.isDragonCommander) return BOSS_COMIC_PERSONAS.kalgarot;
  const plugin = typeof curRaidPlugin === "function" ? curRaidPlugin() : null;
  if (plugin && plugin.defaultPersona && BOSS_COMIC_PERSONAS[plugin.defaultPersona]) {
    return BOSS_COMIC_PERSONAS[plugin.defaultPersona];
  }
  return BOSS_COMIC_PERSONAS.sahmeran;
}

function setBossWorldBubble(b, text, opts = {}) {
  if (!b) return;
  const persona = getBossPersona(b);
  SHM.canvasBubble = {
    x: b.x,
    y: b.y - (b.isDragonCommander ? 385 : b.isSubBoss ? 225 : 355),
    speaker: opts.speaker || b.name || persona.title,
    text: text || persona.entranceRoarLine,
    sfx: opts.sfx || "LAF ATMA!!",
    color: opts.color || (b.isDragonCommander ? "#ef7f3e" : "#9ad07a"),
    timer: opts.duration || 210,
    maxTimer: opts.duration || 210,
    isTaunt: !!opts.isTaunt
  };
}

function triggerBossEntranceComic(b) {
  if (!b || typeof document === "undefined") return;
  const persona = getBossPersona(b);
  setBossWorldBubble(b, persona.entranceRoarLine, {
    speaker: b.name,
    sfx: persona.entranceSfx || "KÜKRER!!",
    duration: 240,
    isTaunt: true
  });
  setDialogue(b.name, persona.entranceRoarLine, persona.portrait);

  const mount = document.getElementById("shmComicIntroMount");
  if (!mount) return;
  const star = (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor-Diş", el: "ates", stage: "yetiskin" };
  const bgUrl = (typeof asset === "function" && asset(persona.bg)) || persona.bg || curCampaign().lobbyBg;
  const heroAura = typeof cutAura === "function" ? cutAura(star.el || "ates") : "";
  const bossEl = b.isDragonCommander || b.subType === "behemoth" ? "ates" : (b.subType === "alpha_wyvern" ? "firtina" : "toprak");
  const bossAura = typeof cutAura === "function" ? cutAura(bossEl) : "";

  let heroArt = "";
  if (typeof isAdultPose === "function" && typeof poseSVG === "function" && isAdultPose(star, "P07")) {
    heroArt = `<div class="rcd fsA mine" style="left:2%;top:8%;width:45%;height:86%">${poseSVG(star, "P07", { face: "r", still: true })}${heroAura}<span class="rcn">${star.name || "Kor-Diş"}</span></div>`;
  } else if (typeof dragonSVG === "function") {
    heroArt = `<div class="rcd fsA mine" style="left:3%;top:12%;width:40%;height:80%">${dragonSVG(star, { still: true })}${heroAura}<span class="rcn">${star.name || "Kor-Diş"}</span></div>`;
  }

  mount.innerHTML = `
    <div class="rcut fcut basa boss-clash-cut" id="shmComicClashOverlay" data-shm-act="dismiss-comic-intro">
      <div class="rcp" style="--vp:48% 44%">
        <div class="rcbg own" style="background-image:url('${bgUrl}')"></div>
        <div class="rclines"></div>
        <div class="rcrad" style="display:block"></div>
        <div class="rctone"></div>
        ${heroArt}
        <div class="rcd fsB" style="right:2%;top:4%;width:52%;height:92%">
          <img src="${persona.portrait}" class="boss-cut-art" alt="${b.name}">
          ${bossAura}
          <span class="rcn">${b.name}</span>
        </div>
        <div class="rccap">${b.name}: “${persona.entranceRoarLine}”</div>
        <b class="rcono">${persona.entranceSfx || "KÜKRER!!"}</b>
      </div>
    </div>
  `;

  if (typeof SFX !== "undefined" && SFX.play) {
    SFX.play("page", { vol: 0.75 });
    setTimeout(() => SFX.play("roar", { vol: 0.85 }), 90);
  }

  const ov = document.getElementById("shmComicClashOverlay");
  if (ov) {
    ov.onclick = () => dismissBossEntranceComic();
  }
  if (SHM._introCutTimeout) clearTimeout(SHM._introCutTimeout);
  SHM._introCutTimeout = setTimeout(() => {
    dismissBossEntranceComic();
  }, 1550);
}

function dismissBossEntranceComic() {
  if (SHM._introCutTimeout) {
    clearTimeout(SHM._introCutTimeout);
    SHM._introCutTimeout = null;
  }
  const ov = document.getElementById("shmComicClashOverlay");
  if (ov && !ov.classList.contains("out")) {
    ov.classList.add("out");
    setTimeout(() => {
      if (ov && ov.parentNode) ov.parentNode.innerHTML = "";
    }, 280);
  }
  // Smoothly sweep the camera from the Boss across the 3400px arena to the Player!
  if (SHM.cam && SHM.cam.mode === "intro_pan") {
    SHM.cam.introTimer = Math.min(SHM.cam.introTimer || 36, 36);
  }
}

function triggerBossComicTaunt(b, chosenTaunt) {
  if (!b) return;
  const persona = getBossPersona(b);
  const tList = persona.taunts || [];
  const tItem = chosenTaunt || tList[(SHM.stats.turnsTaken + (b.tauntCount || 0)) % Math.max(1, tList.length)] || {
    sfx: "MEYDAN OKUMA!",
    line: persona.entranceRoarLine,
    replySay: "Bu sözlerini sana yedireceğim!",
    effectDesc: "Boss saldırmak yerine laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 POW Öfkesi!"
  };
  b.tauntCount = (b.tauntCount || 0) + 1;

  setBossWorldBubble(b, tItem.line, {
    speaker: b.name,
    sfx: tItem.sfx || "LAF ATMA!!",
    duration: 240,
    isTaunt: true
  });
  setDialogue(b.name + " (LAF ATIYOR!)", tItem.line, persona.portrait);

  if (typeof document === "undefined") return;
  const mount = document.getElementById("shmComicCutInMount");
  if (!mount) return;
  const bgKey = (b.phase >= 4 && persona.divineBg) ? persona.divineBg : persona.bg;
  const bgUrl = (typeof asset === "function" && asset(bgKey)) || bgKey || curCampaign().lobbyBg;

  mount.innerHTML = `
    <div class="rcut goz boss-taunt-cut" id="shmComicCutIn">
      <div class="rcp" style="--vp:64% 42%">
        <div class="rcbg own" style="background-image:url('${bgUrl}')"></div>
        <div class="rclines"></div>
        <div class="rctone"></div>
        <div class="rcd geye boss-taunt-art" style="right:3%;top:-14%;width:48%;height:132%">
          <img src="${persona.portrait}" class="boss-cut-art" alt="${b.name}">
        </div>
        <div class="rccap">${b.name}: “${tItem.line}”</div>
        <b class="rcono">${tItem.sfx || "LAF ATMA!"}</b>
      </div>
      <div class="rcut-banter-pills shm-banter-btns">
        <button type="button" class="shm-banter-btn rage" data-shm-banter="rage">Öfkeyle Kükre <small>+20 Öfke</small></button>
        <button type="button" class="shm-banter-btn focus" data-shm-banter="focus">Açığını Yakala <small>+%50 Kritik</small></button>
        <button type="button" class="shm-banter-btn shield" data-shm-banter="shield">Siper Al <small>+1 Kalkan & +25 Nefes</small></button>
      </div>
    </div>
  `;
  if (typeof SFX !== "undefined" && SFX.play) {
    SFX.play("page", { vol: 0.72 });
  }
  mount.querySelectorAll("[data-shm-banter]").forEach(btn => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      respondToBossTaunt(btn.getAttribute("data-shm-banter"));
    };
  });
  const cutEl = document.getElementById("shmComicCutIn");
  if (cutEl) {
    cutEl.onclick = (ev) => {
      if (!ev.target.closest("[data-shm-banter]")) respondToBossTaunt("close");
    };
  }
  if (SHM._tauntCutTimeout) clearTimeout(SHM._tauntCutTimeout);
  SHM._tauntCutTimeout = setTimeout(() => {
    respondToBossTaunt("close");
  }, 4400);
}

function respondToBossTaunt(choice) {
  if (SHM._tauntCutTimeout) {
    clearTimeout(SHM._tauntCutTimeout);
    SHM._tauntCutTimeout = null;
  }
  const p = SHM.player;
  const b = SHM.boss;
  if (p && choice && choice !== "close") {
    if (choice === "rage") {
      p.rage = Math.min(100, (p.rage || 0) + 20);
      addFloatText(p.x, p.y - 108, "CESUR KARŞILIK! +20 POW ÖFKESİ!", "#ef7f3e", 20, true);
      if (b) setBossWorldBubble(b, "Hah! İşte görmek istediğim öfke bu! Gel bakalım!", { sfx: "KÜKRER!!", duration: 220 });
    } else if (choice === "focus") {
      if (b) {
        b.tauntExposed = true;
        b.tauntCritBonus = 0.50;
      }
      SHM.activeMods.guide = true;
      addFloatText(p.x, p.y - 108, "KESKİN NİŞAN! ZAYIF NOKTA +%50 KRİTİK & REHBER AKTİF!", "#d9b062", 20, true);
      if (b) setBossWorldBubble(b, "Gözlerin tacımı mı arıyor?! Vurabilirsen vur!", { sfx: "MEYDAN OKUMA!", duration: 220 });
    } else if (choice === "shield") {
      p.shield = Math.min(3, (p.shield || 0) + 1);
      p.stamina = Math.min(p.maxStamina || 100, (p.stamina || 0) + 25);
      addFloatText(p.x, p.y - 108, "SOĞUKKANLI SİPER! +1 KALKAN & +25 ENERJİ!", "#7eb8d8", 20, true);
      if (b) setBossWorldBubble(b, "Kalkanının arkasına mı saklanıyorsun Ejder Çocuğu?!", { sfx: "KÜÇÜMSEME!", duration: 220 });
    }
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    updateBattleHudDom();
  }
  const el = document.getElementById("shmComicCutIn");
  if (el && !el.classList.contains("out")) {
    el.classList.add("out");
    setTimeout(() => {
      if (el && el.parentNode) el.parentNode.innerHTML = "";
    }, 260);
  }
  const isFast = (typeof window !== "undefined" && window.__fastFx) || SHM.fastSim;
  setTimeout(() => {
    SHM.bossActionBusy = false;
    if (SHM.cam && SHM.cam.lockedUnit === b) {
      SHM.cam.lockedUnit = null;
    }
  }, isFast ? 120 : 1250);
}

function triggerBossAttackComicCut(b, atkKeyOrDef) {
  if (!b) return null;
  const def = typeof atkKeyOrDef === "string"
    ? (BOSS_DRAMATIC_ATTACKS[atkKeyOrDef] || BOSS_DRAMATIC_ATTACKS.divebomb)
    : (atkKeyOrDef || BOSS_DRAMATIC_ATTACKS.divebomb);

  setBossWorldBubble(b, def.line, {
    speaker: b.name,
    sfx: def.ono || "ÖZEL SALDIRI!!",
    color: def.glow || "#ef7f3e",
    duration: 220
  });
  setDialogue(b.name + " · " + def.title, def.line, def.poseImg || getBossPersona(b).portrait);

  // Hold camera on the Boss while the comic cut-in slashes across the screen!
  const isLiveBrowser = typeof window !== "undefined" && typeof document !== "undefined" && !window.__fastFx && !window.__noCuts;
  SHM.bossAttackCutTimer = isLiveBrowser ? 78 : 0;

  if (typeof document === "undefined" || (typeof window !== "undefined" && (window.__fastFx || window.__noCuts))) {
    return def;
  }
  const mount = document.getElementById("shmComicCutInMount");
  if (!mount) return def;

  // Do not overwrite an interactive banter/taunt overlay if the player is currently choosing a response
  if (mount.innerHTML && mount.innerHTML.includes("shm-banter-btns")) {
    return def;
  }

  const star = (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor-Diş", el: "ates", stage: "yetiskin" };
  let heroPoseHtml = "";
  if (typeof isAdultPose === "function" && typeof poseSVG === "function" && isAdultPose(star, "P13")) {
    heroPoseHtml = `<div class="rcd fsA mine bcut-hero" style="left:2%;top:10%;width:44%;height:84%">${poseSVG(star, "P13", { face: "r", still: true })}${typeof cutAura === "function" ? cutAura(star.el || "ates") : ""}<span class="rcn">${star.name || "Kor-Diş"}</span></div>`;
  } else if (typeof dragonSVG === "function") {
    heroPoseHtml = `<div class="rcd fsA mine bcut-hero" style="left:3%;top:14%;width:38%;height:78%">${dragonSVG(star, { still: true })}<span class="rcn">${star.name || "Kor-Diş"}</span></div>`;
  }

  const auraHtml = typeof cutAura === "function" ? cutAura(def.el || "ates") : "";
  const bossPoseSrc = def.poseImg || getBossPersona(b).portrait;

  mount.innerHTML = `
    <div class="rcut fcut nefes boss-attack-cut" id="shmBossAttackCut" style="--bcut-glow:${def.glow || "#ef7f3e"}">
      <div class="rcp" style="--vp:${def.vp || "64% 44%"}">
        <div class="rcbg own" style="background-image:url('${def.bg}')"></div>
        <div class="rclines"></div>
        <div class="rcrad" style="display:block"></div>
        <div class="rctone"></div>
        <i class="fbreath boss-breath" style="--c:${def.glow || "#ef7f3e"}"></i>
        ${heroPoseHtml}
        <div class="rcd fsB bcut-boss" style="right:1%;top:2%;width:58%;height:94%">
          <img src="${bossPoseSrc}" class="boss-cut-art" alt="${b.name}">
          ${auraHtml}
          <span class="rcn boss-rcn">${b.name}</span>
        </div>
        <div class="rccap">${b.name}: “${def.line}”</div>
        <b class="rcono">${def.ono}</b>
      </div>
    </div>
  `;

  const cutNode = document.getElementById("shmBossAttackCut");
  if (cutNode) {
    cutNode.onclick = () => {
      if (!cutNode.classList.contains("out")) {
        cutNode.classList.add("out");
        setTimeout(() => {
          if (cutNode && cutNode.parentNode) cutNode.parentNode.innerHTML = "";
        }, 260);
      }
    };
  }

  if (typeof ENGINE_GL !== "undefined") {
    ENGINE_GL.pulseImpact({
      intensity: 0.95,
      chroma: true,
      biome: SHM.dungeonId === "komutan_kalesi" ? "kalgarot" : "sahmeran"
    });
  }
  if (typeof SFX !== "undefined" && SFX.play) {
    SFX.play("page", { vol: 0.75 });
    setTimeout(() => SFX.play("roar", { vol: 0.85 }), 110);
  }

  if (SHM._bossCutTimeout) clearTimeout(SHM._bossCutTimeout);
  if (SHM._bossCutRemoveTimeout) clearTimeout(SHM._bossCutRemoveTimeout);
  SHM._bossCutTimeout = setTimeout(() => {
    const cutEl = document.getElementById("shmBossAttackCut");
    if (cutEl) cutEl.classList.add("out");
  }, 1150);
  SHM._bossCutRemoveTimeout = setTimeout(() => {
    const cutEl = document.getElementById("shmBossAttackCut");
    if (cutEl && cutEl.parentNode) cutEl.parentNode.innerHTML = "";
  }, 1450);

  return def;
}
if (typeof window !== "undefined") window.triggerBossAttackComicCut = triggerBossAttackComicCut;

function openAnimTestRoom(opts = {}) {
  const isPvpReq = opts.mode === "pvp" || opts.gameMode === "pvp" || opts.screen === "pvp_lobby" || opts.entryContext === "pvp_arena";
  const allowed = isPvpReq
    ? (typeof getEternalBabyDragon === "function" ? !!getEternalBabyDragon() : true)
    : (typeof canEnterZindanOrTopcu === "function" ? canEnterZindanOrTopcu() : true);
  if (!opts.forceUnlock && !allowed) {
    if (typeof showZindanGateModal === "function") showZindanGateModal();
    return;
  }
  preloadSahmeranAssets();
  ensureSahmeranSave();
  SHM.open = true;

  if (opts.entryContext) {
    SHM.entryContext = opts.entryContext;
  } else if (isPvpReq) {
    SHM.entryContext = "pvp_arena";
  } else if (opts.screen === "mode_select") {
    SHM.entryContext = "mode_select";
  } else {
    SHM.entryContext = "pve_dungeon";
  }

  if (opts.pvpTeamMode) SHM.pvpTeamMode = opts.pvpTeamMode;
  if (opts.pvpFriend) SHM.pvpFriend = opts.pvpFriend;
  if (opts.gameMode || opts.mode) SHM.gameMode = opts.gameMode || opts.mode;
  else if (isPvpReq) SHM.gameMode = "pvp";
  else if (!opts.screen || opts.screen === "lobby") SHM.gameMode = "raid";

  if (opts.caravanRouteId) SHM.caravanRouteId = opts.caravanRouteId;
  if (opts.caravanTriElement !== undefined) SHM.caravanTriElement = !!opts.caravanTriElement;
  if (opts.caravanCoopCount !== undefined) SHM.caravanCoopCount = Number(opts.caravanCoopCount) || 0;

  if (opts.pvpMap && PVP_ARENA_MAPS[opts.pvpMap]) SHM.pvpMap = opts.pvpMap;
  else if (!SHM.pvpMap || !PVP_ARENA_MAPS[SHM.pvpMap]) SHM.pvpMap = "steppe_canyon";

  if (opts.raidId && opts.raidId !== SHM.raidId) {
    SHM.raidId = opts.raidId;
    resetDungeonInstanceProgress();
  }
  if (typeof preloadRaidAssets === "function") preloadRaidAssets(SHM.raidId);
  if (opts.difficulty && opts.difficulty !== SHM.difficulty) {
    SHM.difficulty = opts.difficulty;
    resetDungeonInstanceProgress();
  }
  if (!SHM.instanceStage || SHM.instanceStage < 1) SHM.instanceStage = 1;
  if (opts.screen) SHM.screen = opts.screen;
  else if (!SHM.screen) SHM.screen = isPvpReq ? "pvp_lobby" : "lobby";

  if (opts.screen === "battle") {
    SHM.player = null;
    SHM.selectedStage = SHM.instanceStage || 1;
  } else if (SHM.screen === "lobby") {
    SHM.selectedStage = SHM.instanceStage || 1;
  }

  if (SHM.screen === "battle" && SHM.gameMode === "pvp" && typeof initTopcuPvpStage === "function") {
    initTopcuPvpStage(SHM.pvpMap || "steppe_canyon", SHM.pvpTeamMode || "1v1");
  } else if (SHM.screen === "battle" && SHM.gameMode !== "pvp" && !SHM.player) {
    initSahmeranBattleStage(SHM.selectedStage || 1);
  }

  renderSahmeranApp();
  setTimeout(() => {
    if (typeof document !== "undefined") {
      const bg = document.querySelector(".modal-bg");
      if (bg) bg.classList.add("mg-fullscreen-bg");
      bindSahmeranEvents();
      startSahmeranLoop();
    }
  }, 20);
}

function closeSahmeranApp() {
  if (typeof pvprOnAppClose === "function") pvprOnAppClose(); // ENG-14: kuyruktan/odadan çık, lobi aboneliğini bırak
  SHM.open = false;
  SHM.keys = {};
  SHM.charging = false;
  resetDungeonInstanceProgress();
  if (typeof document !== "undefined") {
    const bg = document.querySelector(".modal-bg");
    if (bg) bg.classList.remove("mg-fullscreen-bg");
  }
  if (typeof closeModal === "function") closeModal();
  if (typeof render === "function") render();
}

/* ─── TOP-LEVEL UI RENDERER (STRICT PVE / PVP SEPARATION, NO .shm-seq-bar, NO CROSS-MODE BUTTON) ─── */
function renderSahmeranApp() {
  if (!SHM.open || typeof document === "undefined") return;
  const camp = curCampaign();
  const star = (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || { name: "Kor", el: "ates" };
  SHM.selectedStage = Math.max(1, Math.min(camp.maxStage, SHM.selectedStage));
  const stageObj = camp.stages.find(s => s.stage === SHM.selectedStage) || camp.stages[camp.stages.length - 1];
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const crestImg = isAbra ? SHM_ASSETS_PATHS.abraPortrait : (isKom ? SHM_ASSETS_PATHS.ui_crest_kalgarot : SHM_ASSETS_PATHS.ui_crest_sahmeran);

  const isModeSelect = SHM.screen === "mode_select" || SHM.screen === "mode_gate";
  const isPvp = !isModeSelect && (SHM.gameMode === "pvp" || SHM.screen === "pvp_lobby" || SHM.entryContext === "pvp_arena");
  const isCaravan = !isModeSelect && SHM.gameMode === "caravan";
  // ENG-14 O-1: PvP lobisinde başlıktaki harita odanın haritasıdır; odada değilken harita yazılmaz.
  const pvpRoomMap = (typeof PVPR !== "undefined" && PVPR.room && SHM.screen === "pvp_lobby") ? PVPR.room.mapId : null;
  const pvpMapObj = PVP_ARENA_MAPS[pvpRoomMap || SHM.pvpMap || "steppe_canyon"] || PVP_ARENA_MAPS.steppe_canyon;
  const pvpTitleMap = SHM.screen === "pvp_lobby" && !pvpRoomMap ? "" : ` · ${pvpMapObj.name.toUpperCase()}`;

  const topTitle = isModeSelect
    ? "SAVAŞ & SEFER KAPISI · MOD SEÇİMİ"
    : isCaravan
      ? `KERVAN SEFERİ PUSU SAVUNMASI · ${(SHM.caravanRouteId || "kizil_vadi").toUpperCase()}`
      : isPvp
        ? `TOPÇU ER MEYDANI (1V1)${pvpTitleMap}`
        : camp.title;

  const topSub = isModeSelect
    ? "Kadim Zindan Seferleri (PvE Boss Baskını) veya Topçu Er Meydanı (Canlı 1v1 & 2v2 PvP Düello)"
    : isCaravan
      ? `1 Aşamalı Topçu Kervan Muhafızlığı · Kervan Arabasını Koru & Haydutları İmha Et! ${SHM.caravanTriElement ? "· 🔥❄️⚡ ÜÇLÜ ELEMENT SANCAĞI (2× CEVHER)" : ""}`
      : SHM.screen === "battle"
        ? (isPvp
            ? `${pvpMapObj.sub} · A/D: Yürü · W/S: Nişan · Boşluk: Ateş · P: Pas`
            : `${stageObj.name} · A/D: Yürü · W/S: Nişan · Boşluk: Ateş`)
        : (isPvp
            ? "1v1 Topçu düellosu · Hızlı savaş, oda kur ya da kodla katıl · Ödülsüz"
            : `${camp.bossTitle} · ${camp.maxStage} Aşamalı Sıralı Zindan Seferi (PvE)`);

  // ADIM 2 & ADIM 5: Savaş ekranında (battle) ve Savaş ve Sefer Kapısı V2 (mode_select / mode_gate) ekranında üst bar (.shm-topbar) tamamen kaldırılır!
  const topbar = (SHM.screen === "battle" || isModeSelect) ? "" : `
    <div class="shm-topbar">
      <div class="shm-brand">
        <img src="${isPvp ? SHM_ASSETS_PATHS.ic_pvp_topcu : (isCaravan ? SHM_ASSETS_PATHS.pvp_prop_wagon : crestImg)}" class="shm-brand-crest" alt="">
        <div class="shm-title-wrap">
          <div class="shm-title">${topTitle}</div>
          <div class="shm-subtitle">${topSub}</div>
        </div>
      </div>

      <div class="shm-top-mode-badge-wrap">
        ${isCaravan ? `
          <span class="shm-mode-context-pill pve">🐉 KERVAN YOLU MUHAFIZLIĞI · BÖLGESEL CEVHER SEFERİ</span>
        ` : isPvp ? `
          <span class="shm-mode-context-pill pvp">⚔️ TOPÇU ER MEYDANI · CANLI PVP (${(SHM.pvpTeamMode || "1v1").toUpperCase()})</span>
        ` : `
          <span class="shm-mode-context-pill pve">🏰 KADİM ZİNDAN SEFERİ · PVE BOSS BASKINI</span>
        `}
      </div>

      <div class="shm-top-actions">
        <button class="shm-top-btn" data-shm-act="open-mode-select">Savaş & Sefer Kapısı</button>
        <button class="shm-top-btn" data-shm-act="fullscreen">Tam Ekran</button>
        <button class="shm-top-btn danger" data-shm-act="exit">Ocağa Dön (ESC)</button>
      </div>
    </div>
  `;

  let bodyHtml = "";
  if (isModeSelect) bodyHtml = renderModeSelectScreen(star);
  else if (SHM.screen === "pvp_lobby") bodyHtml = renderPvpLobbyScreen(star);
  else if (SHM.screen === "pvp_result" && typeof renderPvpResultScreen === "function") bodyHtml = renderPvpResultScreen(star);
  else if (SHM.screen === "lobby") bodyHtml = renderLobbyScreen(star);
  else if (SHM.screen === "comic") bodyHtml = renderComicScreen(star);
  else if (SHM.screen === "victory") bodyHtml = renderVictoryScreen(star);
  else if (SHM.screen === "studio") bodyHtml = renderStudioScreen(star);
  else {
    SHM.screen = "battle";
    bodyHtml = renderBattleScreen(star);
  }

  if (typeof showModal === "function") {
    showModal(`<div class="shm-root" data-shm-screen="${SHM.screen}" data-shm-mode="${isPvp ? "pvp" : "pve"}">${topbar}${bodyHtml}</div>`, "mg-modal");
  }
  const bg = document.querySelector(".modal-bg");
  if (bg) bg.classList.add("mg-fullscreen-bg");

  bindSahmeranEvents();
  if (SHM.screen === "battle") {
    if (SHM.pendingEntranceComic && SHM.boss && !SHM.boss.dead && SHM.gameMode !== "pvp") {
      SHM.pendingEntranceComic = false;
      triggerBossEntranceComic(SHM.boss);
    }
    setTimeout(() => {
      initBattleCanvasAndResize();
    }, 15);
  }
}

/* ─── SCREEN 0: SAVAŞ VE SEFER KAPISI V2 (28_savas_ve_sefer_kapisi_v2_oyun_stili_1536x864 & GATE_V2-1..6) ─── */
function renderModeSelectScreen(star) {
  return `
    <div class="shm-screen-body shm-no-scroll shm-gate-v2-screen" style="background-image:url('img/komutan/komutan_gate_bg.webp')">
      <div class="shm-screen-backdrop shm-gate-v2-backdrop"></div>
      <div class="shm-gate-v2-wrap">
        <!-- ÜST AHŞAP & PİRİNÇ BAŞLIK PLAKASI (GATE_V2-4) -->
        <header class="shm-gate-v2-header">
          <div class="shm-gate-v2-header-plaque" style="background-image:url('${SHM_ASSETS_PATHS.gate_v2_ust_baslik}')">
            <span class="shm-gate-v2-title">SAVAŞ VE SEFER KAPISI</span>
            <small class="shm-gate-v2-sub">EJDER OCAĞI</small>
          </div>
          <button class="shm-gate-v2-esc-btn" data-shm-act="exit" title="Ocağa Dön (ESC)">
            Ocağa Dön (ESC) ✕
          </button>
        </header>

        <!-- SOL PVE TAÇKAPISI + ORTA AYRIM SÜTUNU + SAĞ PVP ER MEYDANI TAÇKAPISI -->
        <div class="shm-gate-v2-main-grid">
          <!-- SOL KAPI: KADİM ZİNDAN SEFERLERİ (GATE_V2-1 & GATE_V2-5) -->
          <section class="shm-gate-v2-arch pve" style="background-image:url('${SHM_ASSETS_PATHS.gate_v2_pve_tackapi}')">
            <div class="shm-gate-v2-arch-inner">
              <div class="shm-gate-v2-arch-head">
                <h2>KADİM ZİNDAN SEFERLERİ</h2>
                <span class="shm-gate-v2-kicker pve">TEK OYUNCULU PvE · 4 ZİNDAN & BOSS BASKINI</span>
              </div>

              <div class="shm-gate-v2-emblem-stage" data-shm-act="gate-enter-pve">
                <img src="${SHM_ASSETS_PATHS.gate_v2_pve_armasi}" class="shm-gate-v2-hero-emblem" alt="Şahmeran & Kalgarot Zindan Arması">
              </div>

              <div class="shm-gate-v2-parch-pills">
                <button class="shm-gate-v2-pill" data-shm-gate-raid="sahmeran" title="I. Zindan: Yılanlar Şahı Şahmeran">
                  <span>🐍 I. Sırça Saray</span>
                </button>
                <button class="shm-gate-v2-pill" data-shm-gate-raid="komutan" title="II. Zindan: Başkomutan Kalgarot">
                  <span>🔥 II. Yanık Kaldera</span>
                </button>
                <button class="shm-gate-v2-pill" data-shm-gate-raid="abra" title="III. Zindan: Batık Donanma & Derya Yılanı ABRA">
                  <span>⚓ III. Batık Donanma</span>
                </button>
              </div>

              <div class="shm-gate-v2-cta-wrap">
                <button class="shm-gate-v2-cta emerald" data-shm-act="gate-enter-pve">
                  <span>Zindan Seferine Gir</span>
                </button>
              </div>
            </div>
          </section>

          <!-- ORTA DİKEY AHŞAP & PİRİNÇ AYRIM SÜTUNU (GATE_V2-3) -->
          <div class="shm-gate-v2-divider-col" aria-hidden="true">
            <img src="${SHM_ASSETS_PATHS.gate_v2_ayrim_sutunu}" class="shm-gate-v2-pillar-img" alt="">
          </div>

          <!-- SAĞ KAPI: TOPÇU ER MEYDANI (GATE_V2-2 & GATE_V2-6) -->
          <section class="shm-gate-v2-arch pvp" style="background-image:url('${SHM_ASSETS_PATHS.gate_v2_pvp_ermeydani}')">
            <div class="shm-gate-v2-arch-inner">
              <div class="shm-gate-v2-arch-head">
                <h2>TOPÇU ER MEYDANI</h2>
                <span class="shm-gate-v2-kicker pvp">CANLI MULTIPLAYER PvP · 1v1 DÜELLO & 2v2 TAKIM</span>
              </div>

              <div class="shm-gate-v2-emblem-stage" data-shm-act="gate-enter-pvp">
                <img src="${SHM_ASSETS_PATHS.gate_v2_pvp_armasi}" class="shm-gate-v2-hero-emblem" alt="Chibi Topçu PvP Arması">
              </div>

              <div class="shm-gate-v2-parch-pills">
                <button class="shm-gate-v2-pill" data-shm-act="pvp-quick-1v1" title="1v1 Hızlı Eşleşme">
                  <span>⚔️ 1v1 Hızlı Düello</span>
                </button>
                <button class="shm-gate-v2-pill" data-shm-act="pvp-quick-2v2" title="2v2 Takım Savaşı">
                  <span>🛡️ 2v2 Takım Savaşı</span>
                </button>
                <button class="shm-gate-v2-pill" data-shm-act="gate-enter-pvp" title="Özel Oyun Odaları & Harita Seçimi">
                  <span>🏛️ Özel Odalar</span>
                </button>
              </div>

              <div class="shm-gate-v2-cta-wrap">
                <button class="shm-gate-v2-cta ruby" data-shm-act="gate-enter-pvp">
                  <span>Topçu Er Meydanına Gir</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/* ─── SCREEN 1: MATCHMAKING RAID LOBBY (STRICT PVE ONLY — NO PVP BUTTONS) ─── */
function renderLobbyScreen(star) {
  const camp = curCampaign();
  const lootList = curLootList();
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const stInfo = typeof calcChibiStats === "function" ? calcChibiStats(C) : { totalFc: 1450 };
  const isKom = SHM.raidId === "komutan";

  const leaderDoll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(C, { battleStance: false, hideAura: true })
    : "";

  const diffSeals = [
    { k: "normal",   lbl: "Normal (Keşif)",   sub: `Boss HP ×0.75 · 1× Kalıp + 2× T2 Taş`, ic: SHM_ASSETS_PATHS.ui_seal_normal },
    { k: "zor",      lbl: "Ağır (Gazi)",      sub: `Boss HP ×1.00 · 2× Kalıp + T2/T3 Taş`, ic: SHM_ASSETS_PATHS.ui_seal_zor },
    { k: "ekstrem",  lbl: "Cehennem (Kâbus)", sub: `Boss HP ×1.45 · 3–4× Kalıp + Kıyamet Özü`, ic: SHM_ASSETS_PATHS.ui_seal_kabus }
  ].map(d => `
    <button class="shm-seal-card ${(SHM.difficulty === d.k || (d.k === "zor" && SHM.difficulty === "destansi")) ? "active" : ""}" data-shm-diff="${d.k}">
      <img src="${d.ic}" class="shm-seal-ic" alt="">
      <div class="shm-seal-txt">
        <b>${d.lbl}</b>
        <small>${d.sub}</small>
      </div>
    </button>
  `).join("");

  const comp1 = SHM_COMPANIONS[0];
  const comp2 = SHM_COMPANIONS[1];
  const comp1Doll = (comp1 && typeof renderChibiDoll === "function")
    ? renderChibiDoll(comp1.chibi, { battleStance: false, hideAura: true })
    : "";
  const comp2Doll = (comp2 && typeof renderChibiDoll === "function")
    ? renderChibiDoll(comp2.chibi, { battleStance: false, hideAura: true })
    : "";

  if (!Array.isArray(SHM.raidPartySlots)) SHM.raidPartySlots = [null, null];
  if (typeof syncRaidSoloMode === "function") syncRaidSoloMode();
  const raidSlotMeta = [
    { comp: comp1, doll: comp1Doll, tag: "2. OYUNCU · ŞİFA DESTEĞİ", bot: "Leydi Süreyya", fc: 2840, role: "Şifacı & Arındırma", desc: "Her tur sonunda +120 Can yeniler ve zehri temizler" },
    { comp: comp2, doll: comp2Doll, tag: "3. OYUNCU · YILDIRIM NİŞANCISI", bot: "Kuzey Rüzgârı", fc: 2960, role: "Fırtına Taarruzu", desc: "Her tur sonunda düşmana -210 yıldırım hasarı vurur" }
  ];
  const raidSlotHtml = (i) => {
    const m = raidSlotMeta[i];
    const filled = SHM.raidPartySlots[i];
    const num = i + 1;
    if (!filled) {
      return `
          <div class="shm-panel-box shm-mm-slot shm-hero-card solo-off empty">
            <div class="shm-mm-slot-top">
              <span class="shm-mm-role-tag">${num + 1}. YUVA · BOŞ</span>
              <span class="shm-mm-ready-tag solo">BEKLİYOR</span>
            </div>
            <div class="shm-mm-avatar-stage" style="display:flex;align-items:center;justify-content:center;font-size:44px;opacity:.55">➕</div>
            <div class="shm-mm-slot-info">
              <b>➕ OYUNCU VEYA YOLDAŞ BEKLENİYOR</b>
              <small>Boş bırakırsan tek başına (Solo) savaşırsın.</small>
              <div class="shm-btn-row" style="gap:6px;flex-wrap:wrap;margin-top:6px">
                <button class="btn ghost sm" data-shm-raid-invite="${num}">➕ Arkadaş Davet Et</button>
                <button class="btn primary sm" data-shm-raid-add-bot="${num}">🤖 NPC Yoldaş Ekle (${m.bot})</button>
                <button class="btn good sm" data-soc-lobby="raid:${num}">📩 Arkadaşını Lobiye Çağır</button>
              </div>
            </div>
          </div>`;
    }
    const nm = filled.name || m.bot;
    return `
          <div class="shm-panel-box shm-mm-slot shm-hero-card ready" style="position:relative">
            <div class="shm-mm-slot-top">
              <span class="shm-mm-role-tag">${m.tag}</span>
              <span class="shm-mm-ready-tag ready">HAZIR</span>
            </div>
            <button class="btn bad sm" style="position:absolute;top:6px;right:6px;z-index:3;font-size:10px;padding:2px 7px;min-height:0" data-shm-raid-kick="${num}">✕ Odadan Çıkar</button>
            <div class="shm-mm-avatar-stage">${(filled.chibi && typeof renderChibiDoll === "function") ? renderChibiDoll(filled.chibi, { battleStance: false, hideAura: true }) : m.doll}</div>
            <div class="shm-mm-slot-info">
              <b>${nm}${filled.kind === "bot" ? " (NPC yoldaş)" : (filled.kind === "peer" ? (filled.npc ? " (NPC arkadaş)" : " (Arkadaş)") : "")}</b>
              <div class="shm-hero-meta">Kudret: <b class="gold">${filled.fc || m.fc}</b> · Rol: <b class="ember">${m.role}</b></div>
              <small>${m.desc}</small>
            </div>
          </div>`;
  };

  const previewLoot = lootList.slice(0, 4).map(it => `
    <div class="shm-mm-loot-pill" title="${it.name} · Kudret +${it.fc} · ${it.passive}">
      <img src="${it.icon}" class="shm-mm-loot-ic" alt="">
      <span>${it.name}</span>
    </div>
  `).join("");

  const instStage = Math.max(1, Math.min(camp.maxStage, SHM.instanceStage || 1));
  SHM.instanceStage = instStage;
  SHM.selectedStage = instStage;

  const stagePills = camp.stages.slice(0, 4).map((s) => {
    const stNum = s.stage;
    const rawName = s.name.split("·")[1] ? s.name.split("·")[1].trim() : s.name;
    const shortName = rawName.replace(/\(.*?\)/g, "").trim().slice(0, 18);
    const isDone = stNum < instStage;
    const isCurrent = stNum === instStage;
    const isFinalBoss = stNum === camp.maxStage;
    const statusText = isDone ? "Tamamlandı ✓" : isCurrent ? "Sıradaki ⚔️" : "Kilitli 🔒";
    const statusStyle = isDone
      ? "border-color:rgba(74,222,128,.65);background:rgba(20,83,45,.45);color:#bbf7d0"
      : isCurrent
        ? "border-color:#f5c249;background:rgba(180,83,9,.38);color:#fef08a;box-shadow:0 0 12px rgba(245,194,73,.35)"
        : "opacity:.55;border-color:rgba(148,163,184,.25);color:#94a3b8";
    return `
      <span class="shm-mm-stage-chip ${isFinalBoss ? "boss" : ""}" style="${statusStyle}">
        <b>Aşama ${stNum}/4:</b> ${shortName} · <i>${statusText}</i>
      </span>
    `;
  }).join("");

  const blessingStrip = Array.isArray(SHM.activeBlessings) && SHM.activeBlessings.length
    ? `<div style="margin-top:4px;font-size:11px;color:#86efac">✨ Aktif Sefer Kutsamaları: <b>${SHM.activeBlessings.join(" · ")}</b></div>`
    : "";

  return `
    <div class="shm-screen-body shm-no-scroll" style="background-image:url('${camp.lobbyBg}')">
      <div class="shm-screen-backdrop"></div>
      <div class="shm-mm-wrap shm-lobby-wrap">
        <!-- TOP ROW: RAID BANNER, RAID SWITCHER & DIFFICULTY SELECTION -->
        <div class="shm-panel-box shm-mm-top">
          <div class="shm-mm-head-left">
            <img src="${SHM.raidId === "abra" ? SHM_ASSETS_PATHS.abraPortrait : (isKom ? SHM_ASSETS_PATHS.ui_crest_kalgarot : SHM_ASSETS_PATHS.ui_crest_sahmeran)}" class="shm-crest-lg" alt="">
            <div>
              <div class="shm-story-act">KADİM ZİNDAN SEFERİ EŞLEŞME ODASI (PVE) · ${camp.maxStage} AŞAMALI SEKANS</div>
              <div class="shm-panel-title">${camp.title}</div>
              <small class="shm-mm-sub">Zindan seçimi:
                <button class="shm-top-btn ${SHM.raidId === "sahmeran" ? "active" : ""}" style="padding:2px 8px;font-size:11px;margin-left:4px" data-shm-raid="sahmeran">I. Şahmeran Sırça Sarayı</button>
                <button class="shm-top-btn ${SHM.raidId === "komutan" ? "active" : ""}" style="padding:2px 8px;font-size:11px" data-shm-raid="komutan">II. Başkomutan Kalgarot</button>
                <button class="shm-top-btn ${SHM.raidId === "abra" ? "active" : ""}" style="padding:2px 8px;font-size:11px" data-shm-raid="abra">⚓ III. Batık Donanma: Abra</button>
                <button class="shm-top-btn" style="padding:2px 8px;font-size:11px;margin-left:6px" data-shm-nav="comic">📖 Giriş Hikâyesi (Prolog)</button>
              </small>
            </div>
          </div>
          <div class="shm-mm-diff-wrap">
            <div class="shm-seal-row">${diffSeals}</div>
          </div>
        </div>

        <!-- CENTER ROW: 3-PLAYER MATCHMAKING PARTY SLOTS -->
        <div class="shm-mm-roster">
          <!-- SLOT 1: PLAYER (LEADER) -->
          <div class="shm-panel-box shm-mm-slot shm-hero-card leader ready">
            <div class="shm-mm-slot-top">
              <span class="shm-mm-role-tag">1. OYUNCU · ODA LİDERİ</span>
              <span class="shm-mm-ready-tag ready">HAZIR</span>
            </div>
            <div class="shm-mm-avatar-stage">${leaderDoll}</div>
            <div class="shm-mm-slot-info">
              <b>${star.name || "Kor-Diş"} & Terbiyeci</b>
              <div class="shm-hero-meta">Kudret: <b class="gold">${stInfo.totalFc}</b> · Element: <b class="ember">${(star.el || "ates").toUpperCase()}</b></div>
              <small>Öncü Topçu & Ejderha Nefesi Komutanı</small>
            </div>
          </div>

          ${raidSlotHtml(0)}
          ${raidSlotHtml(1)}
        </div>

        <!-- BOTTOM ROW: SEQUENCE ROADMAP, FINAL REWARDS PREVIEW & READY BUTTON (NO PVP BUTTONS!) -->
        <div class="shm-panel-box shm-mm-footer">
          <div class="shm-mm-foot-left">
            <div class="shm-story-act">INSTANCED ZİNDAN SEFERİ SIRASI (${instStage}/${camp.maxStage}) · ${instStage === 1 ? "Başlangıç Bedeli: +15 Ejderha Yorgunluğu" : "Aktif Sefer: Ara Aşamalarda Ek Yorgunluk Yok"}</div>
            <div class="shm-mm-stage-strip">${stagePills}</div>
            ${blessingStrip}
            <div class="shm-mm-loot-strip">${previewLoot}</div>
          </div>
          <div class="shm-mm-foot-right">
            <span class="shm-top-btn" style="cursor:default">
              ${SHM.soloMode ? "Mod: Tek Başına (Solo · +%40 Hasar)" : `Mod: Co-op (${1 + (SHM.raidPartySlots || []).filter(Boolean).length} Kişilik Ekip)`}
            </span>
            <button class="btn primary big shm-mm-go-btn" data-shm-act="start-instance-stage">
              ⚔️ Aşama ${instStage}/${camp.maxStage} Başlat
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}


function renderComicScreen(star) {
  const camp = curCampaign();
  const isEpilogue = SHM.comicMode === "epilogue";
  const cId = isEpilogue
    ? (camp.victoryComicId || (SHM.raidId === "abra" ? "abra_zafer" : SHM.raidId === "komutan" ? "komutan_zafer" : "sahmeran_zafer"))
    : (camp.nativeComicId || (SHM.raidId === "abra" ? "abra_prolog" : SHM.raidId === "komutan" ? "komutan_prolog" : "sahmeran_prolog"));
  const pages = (typeof COMIC !== "undefined" && typeof COMIC[cId] === "function") ? COMIC[cId]() : [];
  const pg = Math.max(0, Math.min(pages.length - 1, SHM.comicIdx || 0));
  SHM.comicIdx = pg;
  const P = pages[pg] || { lay: "c", p: [] };
  const last = pg >= pages.length - 1;

  const renderPanel = (x, i) => {
    if (typeof buildNativeComicPanelHTML === "function") {
      return buildNativeComicPanelHTML(x, i);
    }
    let ch = "";
    if (x.html) ch = x.html;
    else if (x.npc && typeof asset === "function" && asset("npc-" + x.npc)) {
      ch = `<img class="cnpc ${x.side || "r"} ${x.sil ? "sil" : ""}" src="${asset("npc-" + x.npc)}" alt="">`;
    } else if (x.dr && typeof dragonSVG === "function") {
      if (x.pz && typeof hasPose === "function" && hasPose(x.dr, x.pz) && typeof poseSVG === "function" && typeof POSE_META !== "undefined") {
        const es = typeof poseEdgeStyle === "function" ? poseEdgeStyle(x.dr, x.pz, x.face) : "";
        const M = POSE_META[x.dr.el + "-" + x.pz] || [100, 100, ""];
        const ar = (M[1] / M[0]).toFixed(4);
        let cc = M[2] || "";
        if (x.face && typeof poseFace === "function" && x.face !== poseFace(x.dr, x.pz)) {
          cc = cc.replace(/[lr]/g, k => (k === "l" ? "r" : "l"));
        }
        const pBox = typeof poseBox === "function" ? poseBox(x.dr, x.pz, x.box || "10,8,80,88,c") : "";
        ch = `<div class="rcd ${es ? "edge" : ""} ${x.rim ? "rim" : ""}" data-ar="${ar}" data-c="${cc}" ${es ? `style="${es}"` : `data-box="${pBox}"`}>${poseSVG(x.dr, x.pz, { face: x.face, still: true })}</div>`;
      } else {
        const av = typeof bestAngle === "function" ? bestAngle(x.dr, ...(x.av || []), "34", "front") : null;
        ch = `<div class="cmdr ${av ? "cang" : ""}">${av && typeof angleSVG === "function" ? angleSVG(x.dr, av, { face: x.face }) : dragonSVG(x.dr, { still: true, flip: x.face === "l" })}</div>`;
      }
    }
    const sfxHtml = x.sfx ? `<div class="cpan-sfx-stamp">${x.sfx}</div>` : "";
    const speakerHtml = "";
    const bgUrl = (typeof asset === "function" && asset(x.bg)) || x.bg || camp.lobbyBg;
    return `<div class="cpan cp${i} cpan-parallax ${x.night ? "night" : ""} ${x.heat ? "heat" : ""} ${x.clash ? "cpan-clash" : ""}">${sfxHtml}<div class="cmbg" style="background-image:url('${bgUrl}')"></div>${ch}${x.cap ? `<div class="ccap">${x.cap}</div>` : ""}${x.say ? `<div class="cbub ${x.side === "l" ? "r" : "l"}">${speakerHtml}${x.say}</div>` : ""}</div>`;
  };

  setTimeout(() => {
    if (typeof document !== "undefined" && typeof comicFit === "function") {
      document.querySelectorAll(".shm-claude-comic-wrap .cpan").forEach(el => {
        comicFit(el);
        el.addEventListener("pointermove", ev => {
          const r = el.getBoundingClientRect();
          const nx = ((ev.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
          const ny = ((ev.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
          el.style.setProperty("--prx-x", (nx * 10).toFixed(2) + "px");
          el.style.setProperty("--prx-y", (ny * 7).toFixed(2) + "px");
        });
        el.addEventListener("pointerleave", () => {
          el.style.setProperty("--prx-x", "0px");
          el.style.setProperty("--prx-y", "0px");
        });
      });
    }
  }, 30);

  return `
    <div class="shm-screen-body shm-no-scroll" style="background-image:url('${camp.lobbyBg}')">
      <div class="shm-screen-backdrop dark"></div>
      <div class="shm-claude-comic-wrap">
        <div class="cmhead">
          <span class="kicker shm-comic-kicker">${isEpilogue ? "ZAFER DESTANI" : "GİRİŞ DESTANI"} · ${camp.title}</span>
          <span class="cpgn">Perde ${pg + 1} / ${Math.max(1, pages.length)}</span>
        </div>
        <div class="cpage lay-${P.lay || "c"}">
          ${(P.p || []).map(renderPanel).join("")}
        </div>
        <div class="cask shm-comic-ask">
          <p class="shm-comic-ask-txt">${P.ask || camp.bossTitle}</p>
          <div class="shm-btn-row">
            ${pg > 0 ? `<button class="btn ghost sm" data-shm-comic-idx="${pg - 1}">Önceki Perde</button>` : ""}
            ${!last
              ? `<button class="btn primary" data-shm-comic-idx="${pg + 1}">Sonraki Perdeye Geç</button>`
              : isEpilogue
                ? `<button class="btn primary big" data-shm-act="seq-open-victory">HAZIR — HAZİNE SANDIĞI VE ÖDÜLLERE GEÇ</button>`
                : `<button class="btn primary big" data-shm-stage="${SHM.selectedStage || 1}">HAZIR — AŞAMA ${SHM.selectedStage || 1} SAVAŞINA BAŞLA</button>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ─── SCREEN 3: KERVANSARAY WALKING PHYSICS DUNGEON CORRIDOR ─── */
function renderCorridorScreen(star) {
  const camp = curCampaign();
  const pois = camp.corridorPois;
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const heroDoll = typeof renderChibiDoll === "function"
    ? renderChibiDoll(C, { battleStance: true, battleConcept: 1, battleAngle: 15, hideAimArc: true, hideStanceBadge: true })
    : "";

  const cor = SHM.corridor;
  const allyHtml = (!SHM.soloMode && SHM.allies.length)
    ? SHM.allies.slice(0, 2).map((id, idx) => {
        const comp = SHM_COMPANIONS.find(c => c.id === id);
        if (!comp) return "";
        const ax = Math.max(6, cor.x - (idx + 1) * 7.5);
        const ay = cor.y + (idx % 2 === 0 ? 3 : -2);
        const dHtml = typeof renderChibiDoll === "function"
          ? renderChibiDoll(comp.chibi, { battleStance: true, battleConcept: 1, battleAngle: 12, hideAimArc: true, hideStanceBadge: true })
          : "";
        return `
          <div class="shm-walk-actor ally-walk-actor" data-idx="${idx}" style="left:${ax}%;top:${ay}%;z-index:${Math.round(ay * 10)}">
            <div class="hub-duo">${dHtml}</div>
            <div class="shm-walk-shadow"></div>
            <div class="shm-ally-name">${comp.name}</div>
          </div>
        `;
      }).join("")
    : "";

  return `
    <div class="shm-corridor-stage" id="shmCorridorStage">
      <div class="shm-corridor-bg" id="shmCorridorBg" style="background-image:url('${camp.corridorBg}')"></div>
      <div class="shm-corridor-mist"></div>

      <div class="shm-corridor-hud-wrap">
        <div class="shm-panel-box shm-corridor-bar">
          <div>
            <div class="shm-story-act">AŞAMA 0 · KERVANSARAY YÜRÜYÜŞ FİZİKLİ KEŞİF KORİDORU (${camp.title})</div>
            <div class="shm-corridor-msg" id="shmCorridorMsg">${cor.msg}</div>
          </div>
          <div class="shm-btn-row">
            <button class="btn primary sm" data-shm-stage="1">Aşama 1 Savaşı</button>
            <button class="btn good sm" data-shm-stage="${camp.maxStage}">Aşama ${camp.maxStage}: Final Boss</button>
          </div>
        </div>
      </div>

      <div class="shm-corridor-poi" style="left:36%;top:64%" data-shm-poi="stele">
        <span class="shm-poi-badge ${cor.steleRead ? "done" : ""}">
          ${cor.steleRead ? pois.steleDone : pois.steleLabel}
        </span>
        <div class="shm-poi-ring"></div>
      </div>

      <div class="shm-corridor-poi" style="left:58%;top:62%" data-shm-poi="brazier">
        <span class="shm-poi-badge ${cor.brazierLit ? "done" : ""}">
          ${cor.brazierLit ? pois.brazierDone : pois.brazierLabel}
        </span>
        <div class="shm-poi-ring"></div>
      </div>

      <div class="shm-corridor-poi" style="left:83%;top:46%" data-shm-poi="gate">
        <span class="shm-poi-badge shm-poi-gate-badge">
          ${pois.gateLabel}
        </span>
        <div class="shm-poi-ring shm-poi-gate-ring"></div>
      </div>

      <div id="shmWalkRing" class="city-walk-ring" style="display:none"></div>

      ${allyHtml}

      <div class="shm-walk-actor" id="shmCorridorMe" style="left:${cor.x}%;top:${cor.y}%;z-index:${Math.round(cor.y * 10)}">
        <div class="hub-duo" id="shmCorridorDuo">
          ${heroDoll}
        </div>
        <div class="shm-walk-shadow" id="shmCorridorShadow"></div>
        <div class="shm-me-name">
          Ocak Muhafızı & ${star.name || "Kor"}
        </div>
      </div>
    </div>
  `;
}

/* ─── SCREEN 4: FULL-SCREEN 100VW x 100VH EJDER TOPÇUSU TACTICAL BATTLE (V2 HUD) ─── */
function renderBattleScreen(star) {
  const camp = curCampaign();
  const isPvp = SHM.gameMode === "pvp";
  if (isPvp) {
    if (!SHM.player || !SHM.pvpRival) {
      initTopcuPvpStage(SHM.pvpMap || "steppe_canyon", SHM.pvpTeamMode || "1v1");
    }
  } else if (!SHM.player) {
    initSahmeranBattleStage(SHM.selectedStage);
  }
  const p = SHM.player;
  const b = SHM.boss;
  const pvpMapObj = PVP_ARENA_MAPS[SHM.pvpMap || "steppe_canyon"] || PVP_ARENA_MAPS.steppe_canyon;
  const stageObj = camp.stages.find(s => s.stage === SHM.selectedStage) || camp.stages[camp.stages.length - 1];
  const windVal = Math.abs(SHM.wind).toFixed(1);
  const windDir = SHM.wind > 0.05 ? "DOĞUYA" : SHM.wind < -0.05 ? "BATIYA" : "DURGUN";
  const truePitch = Math.round(p.angle - (p.slopeAngle || 0));
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const maxPh = b ? (b.maxPhase || 3) : 3;
  const bossCrest = isPvp
    ? SHM_ASSETS_PATHS.ic_pvp_topcu
    : (isAbra ? SHM_ASSETS_PATHS.abraPortrait : (isKom ? SHM_ASSETS_PATHS.ui_crest_kalgarot : SHM_ASSETS_PATHS.ui_crest_sahmeran));

  // Build PvP Turn Order Queue (Always 4 slots to match 4-compartment asset_ui_11_turn_order_4slot_bar.png)
  const is2v2 = isPvp && SHM.pvpTeamMode === "2v2";
  const turnOrderList = isPvp
    ? (is2v2
        ? [
            { id: "blue_1", team: "blue", shortName: "SEN",    active: SHM.turn === "player" && (SHM.pvpTurnIdx || 0) % 4 === 0 },
            { id: "red_1",  team: "red",  shortName: "KUZEY",  active: SHM.turn === "enemy" && (SHM.pvpTurnIdx || 0) % 4 === 1 },
            { id: "blue_2", team: "blue", shortName: "BOZKIR", active: (SHM.pvpTurnIdx || 0) % 4 === 2 },
            { id: "red_2",  team: "red",  shortName: "GÖLGE",  active: SHM.turn === "enemy" && (SHM.pvpTurnIdx || 0) % 4 === 3 }
          ]
        : [
            { id: "blue_1", team: "blue", shortName: "SEN",   active: SHM.turn === "player" },
            { id: "red_1",  team: "red",  shortName: "KUZEY", active: SHM.turn === "enemy" },
            { id: "blue_2", team: "blue", shortName: "SEN",   active: false },
            { id: "red_2",  team: "red",  shortName: "KUZEY", active: false }
          ])
    : [];

  const pvpTurnQueueHtml = isPvp ? `
    <div class="shm-pvp-turn-queue shm-ui-frame-turnbar" id="shmPvpTurnQueue">
      ${turnOrderList.map((item, idx) => `
        <div class="shm-tq-socket s${idx + 1} ${item.active ? "active" : ""}">
          <span>${idx + 1}. SIRA</span>
          <b>${item.shortName}</b>
        </div>
      `).join("")}
    </div>
  ` : "";

  // Boss HP banner is ONLY rendered in PvE Zindan mode (strictly hidden in PvP!)
  const bossBannerHtml = isPvp ? "" : (b && !b.dead ? `
    <div class="shm-boss-banner" id="shmBossBanner">
      <div class="shm-boss-top">
        <div class="shm-crest-row">
          <img src="${bossCrest}" class="shm-crest-md" alt="">
          <div>
            <span class="shm-boss-name" id="shmBossName">${b.name}</span>
            <div class="shm-boss-title-sub">${b.title}</div>
          </div>
        </div>
        <span class="shm-boss-phase" id="shmBossPhase">FAZ ${b.phase}/${maxPh} · ${b.phaseTitle || "DESTANSI SINAV"}</span>
      </div>
      <div class="shm-boss-hp-track">
        ${maxPh === 5 ? `
          <div class="shm-boss-hp-marker" style="left:80%"></div>
          <div class="shm-boss-hp-marker" style="left:60%"></div>
          <div class="shm-boss-hp-marker" style="left:40%"></div>
          <div class="shm-boss-hp-marker" style="left:20%"></div>
        ` : `
          <div class="shm-boss-hp-marker" style="left:60%"></div>
          <div class="shm-boss-hp-marker" style="left:28%"></div>
        `}
        <div class="shm-boss-hp-ghost" id="shmBossHpGhost" style="width:${Math.max(0, Math.min(100, ((b.ghostHp ?? b.hp) / b.maxHp) * 100)).toFixed(1)}%"></div>
        <div class="shm-boss-hp-fill" id="shmBossHpFill" style="width:${Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100)).toFixed(1)}%"></div>
      </div>
      <div class="shm-boss-sub">
        <span id="shmBossHpText">Can: ${Math.max(0, Math.round(b.hp))} / ${b.maxHp} ${b.shield > 0 ? `(Kalkan: +${b.shield})` : ""} ${b.staggerTurns > 0 ? `· 💫 STAGGER (${b.staggerTurns}T)` : ""}</span>
        <span>${b.id === "abra" ? "Zayıf Nokta: Fosforlu Kuyruk Yüzgeci (2 Vuruş = Stagger) & Baş (x2.0)" : b.subType === "coral_golem" ? "Zayıf Nokta: Pirinç Dalgıç Başlığı Lumbuz Camı (x2.0 Kritik & Top Kilidi)" : isKom ? "Zayıf Nokta: Göğüsteki Kor Kalp & Boynuz" : "Zayıf Nokta: Altın Kobra Tacı"}</span>
      </div>
    </div>
  ` : `
    <div class="shm-boss-banner" id="shmBossBanner">
      <div class="shm-boss-top">
        <div class="shm-crest-row">
          <img src="${bossCrest}" class="shm-crest-sm" alt="">
          <span class="shm-boss-name">${SHM.gameMode === "caravan" ? "Aşama 1/1 · Kervan Yolu Pusu Savunması" : stageObj.name}</span>
        </div>
        <span class="shm-boss-phase" id="shmEnemyCountBadge">
          Kalan Muhafız: ${SHM.enemies.filter(e => !e.dead).length}
        </span>
      </div>
      <div class="shm-boss-sub">
        <span>${SHM.gameMode === "caravan" ? "Kervan Arabasını koru ve pusuya yatan haydutları topçu ateşiyle imha et! (Zafer: Bölge Cevheri + Harlı Kor Taşı)" : stageObj.desc}</span>
      </div>
    </div>
  `);

  const baseHotbarList = [
    { key: "1", id: "plus1",    img: SHM_ASSETS_PATHS.ui_skill_plus1,   name: "Ek Atış",       cost: 25 },
    { key: "2", id: "plus2",    img: SHM_ASSETS_PATHS.ui_skill_plus2,   name: "Üçlü Seri",     cost: 40 },
    { key: "3", id: "trident",  img: SHM_ASSETS_PATHS.ui_skill_trident, name: "Üçlü Çatal",    cost: 45 },
    { key: "4", id: "heavy",    img: SHM_ASSETS_PATHS.ui_skill_heavy,   name: "Ağır Gülle",    cost: 35 },
    { key: "5", id: "crater",   img: SHM_ASSETS_PATHS.ui_skill_crater,  name: "Dev Krater",    cost: 30 },
    { key: "F", id: "teleport", img: SHM_ASSETS_PATHS.ui_skill_wing,    name: "Kanat Uçuşu",   cost: 50 },
    { key: "Q", id: "shield",   img: SHM_ASSETS_PATHS.ui_skill_shield,  name: "Koruma Kalkanı",cost: 40, instant: true },
    { key: "E", id: "heal",     img: SHM_ASSETS_PATHS.ui_skill_heal,    name: "Ocak İksiri",   cost: 45, instant: true },
    ...(isAbra ? [{ key: "G", id: "anchor", img: SHM_ASSETS_PATHS.abraAnchorProp, name: "⚓ Demir Çapa", cost: 20, instant: true }] : []),
    { key: "R", id: "powUlt",   img: SHM_ASSETS_PATHS.ui_skill_pow,     name: "Ejder Öfkesi",  cost: 100, isPow: true }
  ];
  const hotbarSlots = baseHotbarList.map(sl => {
    const isAct = SHM.activeMods[sl.id] || (sl.id === "anchor" && p && p.anchorBraced);
    const isPowReady = sl.isPow && p.rage >= 100;
    const cd = (SHM.cooldowns && SHM.cooldowns[sl.id]) || 0;
    return `
      <button class="shm-skill-slot ${isAct ? "active is-armed is-selected" : ""} ${sl.isPow ? "pow-slot" : ""} ${isPowReady ? "ready" : ""} ${cd > 0 ? "on-cd" : ""}"
              data-shm-skill="${sl.id}" title="[${sl.key}] ${sl.name} (${sl.isPow ? "100 Öfke" : sl.cost + " Enerji"})">
        <span class="shm-slot-armed-badge">⚡ SEÇİLİ</span>
        <img src="${sl.img}" class="shm-slot-art" alt="${sl.name}">
        <span class="shm-slot-key">${sl.key}</span>
        <span class="shm-slot-cost" data-shm-cd-lbl="${sl.id}">${cd > 0 ? cd + "T" : (sl.isPow ? "ULTİ" : sl.cost)}</span>
        <span class="shm-slot-name">${sl.name}</span>
      </button>
    `;
  }).join("");

  const armedLabel = getArmedPowerupLabel();

  return `
    <div class="shm-stage-wrap">
      <canvas id="shmCanvas"></canvas>

      <div class="shm-hud-overlay">
        <!-- TOP LEFT: HERO VITALS PLAQUE FRAMED WITH asset_ui_02_player_status_frame.png -->
        <div class="shm-hero-card shm-ui-frame-player" id="shmPlayerHudCard">
          <div class="shm-socket-portrait">
            <img src="assets/minigame/asset_ui_09_emblem_1v1_topcu.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.85));" alt="">
          </div>
          <div class="shm-card-head">
            <span class="shm-unit-name">${star.name || "Kor-Diş"} & Terbiyeci</span>
            <div class="shm-btn-row">
              <span class="shm-el-chip shm-revive-chip" id="shmReviveBadge" title="Anka Külü Diriliş Hakkı">Anka:${p.revivesLeft ?? 1}</span>
              <span class="shm-el-chip" data-shm-act="cycle-el">${(p.el || "ates").toUpperCase()}</span>
            </div>
          </div>
          <div class="shm-bar-row">
            <span class="shm-bar-lbl">CAN</span>
            <div class="shm-bar-track"><div class="shm-bar-fill ghost" id="shmHeroHpGhost" style="width:${Math.max(0, Math.min(100, ((p.ghostHp ?? p.hp) / p.maxHp) * 100)).toFixed(1)}%"></div><div class="shm-bar-fill hp" id="shmHeroHpFill" style="width:${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)).toFixed(1)}%"></div></div>
            <span class="shm-bar-val" id="shmHeroHpVal">${Math.round(p.hp)}/${p.maxHp}</span>
          </div>
          <div class="shm-bar-row">
            <span class="shm-bar-lbl">NEFES</span>
            <div class="shm-bar-track"><div class="shm-bar-fill sta" id="shmHeroStaFill" style="width:${Math.max(0, Math.min(100, (p.stamina / p.maxStamina) * 100)).toFixed(1)}%"></div></div>
            <span class="shm-bar-val" id="shmHeroStaVal">${Math.round(p.stamina)}/${p.maxStamina}</span>
          </div>
          <div class="shm-bar-row">
            <span class="shm-bar-lbl">ÖFKE</span>
            <div class="shm-bar-track"><div class="shm-bar-fill rage" id="shmHeroRageFill" style="width:${Math.max(0, Math.min(100, p.rage)).toFixed(1)}%"></div></div>
            <span class="shm-bar-val" id="shmHeroRageVal">%${Math.round(p.rage)}</span>
          </div>
        </div>
        ${(() => {
          const syn = p.dragonSynergy || SHM.dragonSynergy || calcMainDragonSynergy(star);
          return `
            <div class="shm-synergy-badge" id="shmDragonSynergyBadge" style="${isPvp ? "display:none" : ""}" title="Ana Oyundaki Yıldız Ejderha Sinerjisi (GÜÇ:${syn.gu} ÇEV:${syn.ce} DAY:${syn.da} ZEK:${syn.ze} · Bağ:%${syn.bond} · Soy:${syn.gen})">
              <span><b>Ocak Kan Bağı</b> (Soy ${syn.gen} · Bağ %${syn.bond})</span>
              <span class="shm-syn-vals">+${syn.hpBonus} Can · +%${syn.critBonusPct} Kritik · +${syn.staBonus} Nefes</span>
            </div>
          `;
        })()}

        <!-- TOP CENTER: ORNATE WIND COMPASS ROSE, TURN ORDER QUEUE & BOSS BANNER FRAMED WITH asset_ui_01_top_turn_wind_bar.png -->
        <div class="shm-center-hud">
          <div class="shm-wind-banner shm-ui-frame-topwind">
            <div class="shm-wind-wing left">
              <div class="shm-wind-pill">
                <span id="shmWindReadout">RÜZGÂR: ${windVal} ${windDir}</span>
                <img src="${SHM_ASSETS_PATHS.ui_wind_vane_arrow}" id="shmWindVaneImg" class="shm-wind-vane-img" style="transform:scaleX(${SHM.wind < 0 ? -1 : 1})" alt="">
              </div>
            </div>
            <div class="shm-wind-wing right">
              <span class="shm-turn-pill" id="shmTurnBadge">${SHM.turn === "player" ? "SIRA: MAVİ (SEN)" : "SIRA: KIRMIZI"}</span>
              <span class="shm-timer-pill" id="shmTurnTimer">${Math.ceil(SHM.turnTimer)}s</span>
              <button class="shm-btn-mini shm-fast-btn ${SHM.fastSim ? 'active' : ''}" data-shm-act="toggle-fast" title="Savaş ve mermi akış hızını 1.6 katına çıkar"><span>${SHM.fastSim ? '1.6×' : '1.0×'}</span></button>
            </div>
          </div>
          ${pvpTurnQueueHtml}
          ${bossBannerHtml}
        </div>

        <!-- TOP RIGHT: MINIMAP, CAMERA CONTROLS & COMPACT LOBI/ÇIKIŞ (ESC) BADGE FRAMED WITH asset_ui_07_minimap_radar_frame.png -->
        <div class="shm-minimap-card shm-ui-frame-minimap" id="shmMinimapCard">
          <canvas id="shmMinimap" width="220" height="72" title="Haritada istediğin yere tıklayarak kamerayı kaydır"></canvas>
          <div class="shm-cam-btns">
            <button class="shm-cam-btn ${!SHM.cam.manualPan && SHM.cam.mode === "follow" ? "active" : ""}" data-shm-cam="follow">Oyuncu</button>
            <button class="shm-cam-btn ${!SHM.cam.manualPan && SHM.cam.mode === "boss" ? "active" : ""}" data-shm-cam="boss">${isPvp ? "Rakip" : "Boss"}</button>
            <button class="shm-cam-btn ${!SHM.cam.manualPan && SHM.cam.mode === "overview" ? "active" : ""}" data-shm-cam="overview">Genel</button>
            <button class="shm-cam-btn" data-shm-cam="zoom-in" title="Yakınlaştır">+</button>
            <button class="shm-cam-btn" data-shm-cam="zoom-out" title="Uzaklaştır">−</button>
          </div>
          <div class="shm-battle-exit-row">
            <button class="shm-cam-btn shm-exit-lobby-btn" data-shm-nav="${isPvp ? "pvp_lobby" : "lobby"}" title="Lobiye Dön">← Lobi</button>
            <button class="shm-cam-btn shm-exit-esc-btn" data-shm-act="exit" title="Ocağa Dön (ESC)">Çıkış (ESC)</button>
          </div>
        </div>
      </div>

      ${isPvp && SHM.vsSplashActive ? `
        <div class="shm-pvp-vs-splash-overlay active" id="shmPvpVsSplash" style="position:absolute;inset:0;z-index:250;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at center, rgba(45, 16, 6, 0.90), rgba(6, 4, 3, 0.96));opacity:1" onclick="SHM.vsSplashActive=false;this.remove()">
          <div class="shm-pvp-vs-splash-card" style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px;padding:28px 38px;border-radius:18px;background:linear-gradient(180deg, rgba(28, 16, 10, 0.96), rgba(12, 7, 4, 0.98));border:2px solid #fbbf24;box-shadow:0 24px 60px rgba(0,0,0,0.95), 0 0 40px rgba(251,191,36,0.45);max-width:820px;width:92vw">
            <div class="shm-pvp-vs-side blue" style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border-radius:12px;background:rgba(12, 74, 110, 0.35);border:1.5px solid #38bdf8;text-align:right">
              <span class="shm-vs-team-tag" style="font-size:11px;font-weight:900;letter-spacing:0.8px;color:#fde68a">MAVİ TAKIM (${SHM.pvpTeamMode.toUpperCase()})</span>
              <strong style="font-family:var(--f-disp);font-size:20px;color:#fffbeb">${(typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi"}${is2v2 ? " & @leydi_sureyya" : ""}</strong>
              <small style="font-size:12px;color:#cbd5e1">${star.name || "Kor-Yavru"} · Topçu Birliği</small>
            </div>
            <div class="shm-pvp-vs-center" style="display:flex;flex-direction:column;align-items:center;gap:8px">
              <img src="${SHM_ASSETS_PATHS.ui_vs_clash_emblem}" style="width:142px;height:142px;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.9)) drop-shadow(0 0 22px rgba(251,191,36,0.75))" alt="VS">
              <span class="shm-vs-match-found-lbl" style="font-family:var(--f-disp);font-size:13px;font-weight:900;color:#fef08a;letter-spacing:1px;text-align:center">EŞLEŞME BULUNDU · ${pvpMapObj.name.toUpperCase()}</span>
            </div>
            <div class="shm-pvp-vs-side red" style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border-radius:12px;background:rgba(127, 29, 29, 0.35);border:1.5px solid #f87171;text-align:left">
              <span class="shm-vs-team-tag" style="font-size:11px;font-weight:900;letter-spacing:0.8px;color:#fde68a">KIRMIZI TAKIM (${SHM.pvpTeamMode.toUpperCase()})</span>
              <strong style="font-family:var(--f-disp);font-size:20px;color:#fffbeb">${(SHM.pvpRival && SHM.pvpRival.handle) || "@kuzey_ruzgari"}${is2v2 ? " & @kor_avcisi" : ""}</strong>
              <small style="font-size:12px;color:#cbd5e1">Kuzey Rüzgârı · Rakip Topçu</small>
            </div>
          </div>
        </div>
      ` : ""}

      <div id="shmTurnBannerMount"></div>
      <div id="shmPipMount"></div>
      <div id="shmComicIntroMount"></div>
      <div id="shmComicCutInMount"></div>
      <div id="shmStageClearMount"></div>

      <!-- DIALOGUE BANNER: STRICTLY HIDDEN IN PVP MODE -->
      <div class="shm-dialogue-banner" id="shmDialogueBanner" style="${isPvp ? "display:none" : ""}">
        <img src="${(SHM.gameMode !== "pvp" && SHM.raidId === "sahmeran" && /Kalgarot/i.test(SHM.dialogue.speaker)) ? SHM_ASSETS_PATHS.sah_closeup : SHM.dialogue.portrait}" class="shm-dlg-portrait" id="shmDlgPortrait" alt="">
        <div class="shm-dlg-body">
          <div class="shm-dlg-speaker" id="shmDlgSpeaker">${SHM.gameMode === "caravan" ? "KERVANBAŞI DESTAN (İPEK GEÇİDİ)" : ((SHM.gameMode !== "pvp" && SHM.raidId === "sahmeran" && /Kalgarot/i.test(SHM.dialogue.speaker)) ? "Yılan Kraliçe Şahmeran" : SHM.dialogue.speaker)}</div>
          <div class="shm-dlg-text" id="shmDlgText">“${SHM.gameMode === "caravan" ? "Kervan arabasını koruyun dostlar! Geçitteki haydutları topçu ateşiyle püskürtün!" : ((SHM.gameMode !== "pvp" && SHM.raidId === "sahmeran" && /Kalgarot/i.test(SHM.dialogue.speaker)) ? "Sırça Saray'ın zümrüt sütunları arasına izinsiz giren her yabancı sınavdan geçer!" : SHM.dialogue.text)}”</div>
        </div>
        ${SHM.boss && !SHM.boss.dead ? `<button class="shm-top-btn shm-provoke-btn" data-shm-act="provoke-boss" title="Boss'a çizgi roman sahnesiyle meydan oku / laf at!">Meydan Oku</button>` : ""}
        <button class="shm-top-btn" data-shm-act="skip-turn" title="Turunu pas geç (+45 Enerji yeniler)">Tur Pas Geç</button>
      </div>
    </div>

    <!-- BOTTOM ARTILLERY COMMAND DOCK (ONLY RENDERED IN BATTLE SCREEN) -->
    <div class="shm-bottom-dock">
      <div class="shm-angle-panel">
        <div class="shm-angle-dial">
          <span class="shm-medallion-key">W/S</span>
          <span class="shm-medallion-plate">AÇI · <b id="shmAngleNum">${truePitch}°</b></span>
        </div>
        <div class="shm-console-plaque">
          <div class="shm-cp-row"><kbd>A</kbd><kbd>D</kbd><span>Yürüyüş</span></div>
          <div class="shm-cp-row"><kbd>W</kbd><kbd>S</kbd><span>Nişan: <b id="shmAnglePlaqueNum" style="color:#fef08a">${truePitch}°</b></span></div>
          <div class="shm-cp-row"><kbd>SPACE</kbd><span>Basılı Tut & Ateş</span></div>
        </div>
      </div>

      <div class="shm-hotbar-wrap">
        <div class="shm-armed-cue-pill ${armedLabel ? "visible" : ""}" id="shmArmedPowerupCue">
          ${armedLabel ? `🔊 ⚡ ${armedLabel} AKTİF!` : ""}
        </div>
        <div class="shm-hotbar">
          ${hotbarSlots}
        </div>
      </div>

      <div class="shm-power-and-pass-wrap">
        <div class="shm-power-panel shm-power-wrap shm-ui-frame-power">
          <div class="shm-power-console-head">
            <span class="shm-pch-title">BARUT & NEFES GÜCÜ</span>
            <span class="shm-pch-val" id="shmPowerReadout">SON: <b>%${Math.round(SHM.lastPower || 62)}</b></span>
          </div>
          <div class="shm-power-socket-track" id="shmPowerGauge">
            <div class="shm-power-socket-fill" id="shmPowerFill" style="width:${SHM.charging ? SHM.power : (SHM.lastPower || 62)}%"></div>
            <div class="shm-power-socket-ticks">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
            <div class="shm-power-socket-prev" id="shmPowerLastMark" style="left:${SHM.lastPower || 62}%"></div>
          </div>
        </div>

        <!-- TRUE 1:1 CIRCULAR RUBY MEDALLION "TURU PAS GEÇ [P]" BUTTON (CLEAN RUBY CENTER + CORNER SOCKET + BOTTOM PLATE) -->
        <button class="shm-pass-medallion-btn" data-shm-act="skip-turn" title="Turu Pas Geç [P] (+45 Nefes Enerjisi)">
          <span class="shm-medallion-key right">P</span>
          <span class="shm-medallion-plate">PAS GEÇ</span>
        </button>
      </div>
    </div>
  `;
}

/* ─── SCREEN 5: POST-RAID / PVP VICTORY & 8-SLICE MULTIPLAYER LOOT WHEEL ("ÖNCÜ KÜÇÜK ÇARK" vs "ULU BÜYÜK KADER ÇARKI") ─── */
function renderVictoryScreen(star) {
  const camp = curCampaign();
  const lootList = curLootList();
  const isKom = SHM.raidId === "komutan";
  const isPvp = SHM.gameMode === "pvp";
  const isCaravan = SHM.gameMode === "caravan";
  const isMinorWheel = SHM.wheelMode === "minor" && !isPvp && !isCaravan;
  const activeSlices = getActiveLootWheelSlices();
  const totalWeight = activeSlices.reduce((acc, s) => acc + (s.weight || 10), 0);

  const rotDeg = SHM.wheelRotationDeg || 0;
  const wonSlice = SHM.wheelWonSlice || null;
  const wonEquipItem = SHM.wheelWonEquipItem || null;
  const spinning = !!SHM.wheelSpinning;
  const nextStageNum = Math.min(camp.maxStage, (SHM.selectedStage || SHM.instanceStage || 1) + 1);

  // Build SVG 8-slice wheel rotor
  const sliceCount = activeSlices.length; // 8
  const degPerSlice = 360 / sliceCount; // 45 deg
  const svgPaths = activeSlices.map((sl, i) => {
    const startDeg = i * degPerSlice - 90 - degPerSlice / 2;
    const endDeg = startDeg + degPerSlice;
    const sRad = (startDeg * Math.PI) / 180;
    const eRad = (endDeg * Math.PI) / 180;
    const r = 138;
    const x1 = 150 + r * Math.cos(sRad);
    const y1 = 150 + r * Math.sin(sRad);
    const x2 = 150 + r * Math.cos(eRad);
    const y2 = 150 + r * Math.sin(eRad);
    const midDeg = startDeg + degPerSlice / 2;
    const mRad = (midDeg * Math.PI) / 180;
    const tx = 150 + 88 * Math.cos(mRad);
    const ty = 150 + 88 * Math.sin(mRad);
    const isWon = wonSlice && wonSlice.idx === sl.idx;
    return `
      <g>
        <path d="M150,150 L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z"
              fill="${isWon ? '#c98a2c' : sl.color}" stroke="#f2bc52" stroke-width="${isWon ? '3' : '1.5'}"/>
        <g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${midDeg + 90})">
          <text x="0" y="-4" text-anchor="middle" fill="#ffe8b0" font-size="9.5" font-weight="900" font-family="Georgia,serif">${sl.badge}</text>
          <text x="0" y="8" text-anchor="middle" fill="#ffffff" font-size="8" font-weight="700">${sl.title.slice(0, 14)}</text>
        </g>
      </g>
    `;
  }).join("");

  const armorSample = lootList.find(x => x.slot === "armor" || x.slot === "hat") || lootList[0];
  const wpnSample = lootList.find(x => x.slot === "wpn" || x.slot === "tal") || lootList[1] || lootList[0];

  const sliceCardsHtml = activeSlices.map(sl => {
    const isHit = wonSlice && wonSlice.idx === sl.idx;
    const pct = Math.max(1, Math.round(((sl.weight || 10) / Math.max(1, totalWeight)) * 100));
    let icUrl = sl.icon || SHM_ASSETS_PATHS.ik_genclik;
    if ((sl.id === "major_shard_armor" || sl.id === "raid_armor") && wonEquipItem && isHit) icUrl = wonEquipItem.icon;
    else if ((sl.id === "major_shard_wpn" || sl.id === "raid_wpn") && wonEquipItem && isHit) icUrl = wonEquipItem.icon;

    return `
      <div class="shm-loot-card ${sl.cat === 'equip' || sl.cat === 'jackpot' ? 'owned' : ''} ${isHit ? 'just-dropped' : ''}" style="${isHit ? 'border-color:#f2bc52;box-shadow:0 0 18px rgba(242,188,82,.55)' : ''}">
        <img src="${icUrl}" class="shm-loot-ic" alt="">
        <div class="shm-loot-meta">
          <b>${isHit && wonEquipItem ? `${wonEquipItem.name} Kalıbı (+1/5)` : sl.title} ${isHit ? `<span class="shm-badge shm-badge-xs">ÇARKTAN ÇIKTI!</span>` : ""}</b>
          <div class="shm-loot-stats">${sl.badge} · Ağırlık: %${pct}</div>
          <small>${isHit && wonEquipItem ? `${wonEquipItem.name} için +1/5 Kalıp Parçası çantana eklendi!` : sl.sub}</small>
        </div>
        <span class="shm-badge" style="opacity:.85">%${pct}</span>
      </div>
    `;
  }).join("");

  const feedList = (SHM.partyWheelFeed && SHM.partyWheelFeed.length)
    ? SHM.partyWheelFeed.slice(0, 3)
    : [
        { handle: "@leydi_sureyya", prize: "+350 Altın Kesesi", badge: "ALTIN" },
        { handle: "@kuzey_ruzgari", prize: "+2× Harlı Kor Taşı (T2)", badge: "T2 TAŞ" }
      ];

  const feedHtml = feedList.map(f => `
    <span class="shm-mm-stage-chip" style="border-color:rgba(217,176,98,.45)">
      <b>${f.handle}:</b> ${f.prize} (${f.badge || "ÇARK"})
    </span>
  `).join("");

  return `
    <div class="shm-screen-body shm-no-scroll" style="background-image:url('${isPvp ? (PVP_ARENA_MAPS[SHM.pvpMap || "skybridge"]?.bgUrl || camp.lobbyBg) : camp.lobbyBg}')">
      <div class="shm-screen-backdrop"></div>
      <div class="shm-victory-wrap">
        <div class="shm-chest-showcase" style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:12px">
          <div style="text-align:center">
            <img src="${SHM_ASSETS_PATHS.asset_ui_16_victory_defeat_banner}" alt="Zafer Sancağı" style="height:44px;width:auto;object-fit:contain;margin:0 auto 2px;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.85))">
            <div class="shm-story-act">${isPvp ? "EJDER TOPÇUSU PVP DÜELLOSU ZAFERİ" : isCaravan ? "KERVAN SEFERİ PUSU SAVUNMASI TAMAMLANDI" : isMinorWheel ? `ARA AŞAMA ${SHM.selectedStage}/${camp.maxStage} TEMİZLENDİ · SOLUKLANMA` : `${camp.title} (AŞAMA 4/4 FİNAL BOSS) TAMAMLANDI`}</div>
            <div class="shm-panel-title shm-title-lg">${isMinorWheel ? "Öncü Ganimet Çarkı (Küçük Çark)" : "Ulu Kader Çarkı (Büyük Çark)"}</div>
            <small style="color:#d8c49e;display:block;margin-top:2px">${isMinorWheel ? `Ara aşama ödülü için <b>1 kez ücretsiz</b> çevir, ardından Sefer Odasına dönerek Aşama ${nextStageNum}/${camp.maxStage} hazırlığını yap!` : "Final Boss Zafer Ganimetlerine ek olarak Ulu Kader Çarkını çevirerek <b>1 ekstra ödül</b> kazanırsın!"}</small>
          </div>

          <!-- 8-SLICE INTERACTIVE LOOT WHEEL -->
          <div id="shmLootWheelWrap" style="position:relative;width:304px;height:304px;margin:4px auto">
            <!-- Ornate Wheel Outer Frame Asset -->
            <img src="${SHM_ASSETS_PATHS.wheel_frame}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:2;filter:drop-shadow(0 6px 18px rgba(0,0,0,.85))">
            <!-- Top Golden Pointer Needle -->
            <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:9;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:26px solid #f5c249;filter:drop-shadow(0 3px 6px #000)"></div>
            <!-- Rotating SVG Wheel (8 Visible Slices inside the Dragon Rim) -->
            <div id="shmLootWheelRotor" style="position:absolute;left:50%;top:50%;width:228px;height:228px;margin-left:-114px;margin-top:-114px;border-radius:50%;overflow:hidden;z-index:5;border:3px solid #f2bc52;box-shadow:0 0 16px rgba(0,0,0,.9),inset 0 0 14px rgba(0,0,0,.65);transform:rotate(${rotDeg}deg);transition:${spinning ? 'transform 2.2s cubic-bezier(0.14, 0.82, 0.18, 1)' : 'none'}">
              <svg viewBox="0 0 300 300" style="width:100%;height:100%;display:block">
                ${svgPaths}
              </svg>
            </div>
            <!-- Center Dragon Emblem Spin Button Asset -->
            <button data-shm-act="spin-wheel" title="Çarkı Çevir" ${spinning || (isMinorWheel && wonSlice) ? "disabled" : ""} style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;width:66px;height:66px;border-radius:50%;border:2.5px solid #f2bc52;background:rgba(20,10,6,.95);padding:0;cursor:pointer;box-shadow:0 0 18px rgba(0,0,0,.95)">
              <img src="${SHM_ASSETS_PATHS.wheel_center}" alt="Çevir" style="width:100%;height:100%;object-fit:contain">
            </button>
          </div>

          <div style="text-align:center;width:100%">
            <p class="shm-victory-desc" style="margin:4px 0 8px">
              ${wonSlice
                ? `Çark durdu! Kazandığın Ödül: <b style="color:#ffe0a0">${wonEquipItem ? `${wonEquipItem.name} Kalıbı (+1/5)` : wonSlice.title}</b> (${wonSlice.sub})`
                : isMinorWheel
                  ? "Öncü Ganimet Çarkı: T1/T2 Kor Taşı, Bölgesel Cevher, Sefer Kutsaması ve düşük şansla (+1/5) Zindan Kalıp Parçası!"
                  : "Ulu Kader Çarkı: T1/T2/T3 Kor Taşı, (+1/5) Zırh/Silah Kalıp Parçası ve %2 Jackpot (Anka Mühür Taşı + Kıyamet Özü)!"}
            </p>
            <div class="shm-victory-chest-btns" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              ${isMinorWheel && wonSlice ? `
                <button class="btn primary big" data-shm-act="return-to-lobby-next-stage">
                  🏰 Sefer Odasına Dön (Soluklan) — Sıradaki: Aşama ${nextStageNum}/${camp.maxStage}
                </button>
              ` : `
                <button class="btn primary big" data-shm-act="spin-wheel" ${spinning ? "disabled" : ""}>
                  ${spinning ? "Çark Dönüyor..." : (wonSlice ? "Tekrar Çark Çevir (120 Altın)" : (isMinorWheel ? "ÖNCÜ GANİMET ÇARKINI ÇEVİR (1 HAK)" : "ULU KADER ÇARKINI ÇEVİR (ÜCRETSİZ HAK)"))}
                </button>
              `}
            </div>
          </div>
        </div>

        <div class="shm-panel-box shm-victory-panel">
          <div>
            <div class="shm-panel-head">
              <div>
                <div class="shm-story-act">${isMinorWheel ? `ARA AŞAMA KÜÇÜK ÇARK HAVUZU (AŞAMA ${SHM.selectedStage}/${camp.maxStage} · 1 ÇEVİRME HAKKI)` : "ULU KADER ÇARKI HAVUZU (AĞIRLIKLI RNG · KALIP PARÇASI & ANKA JACKPOT)"}</div>
                <div class="shm-panel-title">${isPvp ? "Er Meydanı Topçu PvP Zafer Özeti" : isCaravan ? "Kervan Konvoyu Savunma Zaferi" : isMinorWheel ? `Aşama ${SHM.selectedStage}/${camp.maxStage} Öncü Ganimet Özeti` : `${camp.bossName} Final Zafer Özeti`}</div>
              </div>
              ${!isMinorWheel ? `<button class="shm-top-btn" data-shm-act="watch-epilog">Final Çizgi Romanını İzle</button>` : ""}
            </div>

            ${SHM.stats.guaranteedDropsText ? `
              <div style="margin:6px 0 8px;padding:7px 11px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.55);color:#fde68a;font-size:12px">
                <b>🏆 Garanti Zafer Ganimeti (Çantana Eklendi):</b> ${SHM.stats.guaranteedDropsText}
              </div>
            ` : ""}

            <div class="shm-stat-grid">
              <div class="shm-stat-plaque">
                <small>TOPLAM HASAR</small>
                <b>${SHM.stats.totalDmg || 3420}</b>
              </div>
              <div class="shm-stat-plaque">
                <small>KRİTİK & BARUT İSABETİ</small>
                <b>${SHM.stats.crownHits || 4} Kez</b>
              </div>
              <div class="shm-stat-plaque">
                <small>SEFER İLERLEMESİ</small>
                <b>${isMinorWheel ? `Aşama ${SHM.selectedStage}/${camp.maxStage} ✓` : `4/4 Tamamlandı 🏆`}</b>
              </div>
              <div class="shm-stat-plaque">
                <small>ÇARK ÖDÜLÜ</small>
                <b style="color:#ffe0a0">${wonSlice ? (wonEquipItem ? `${wonEquipItem.name.slice(0, 14)} Kalıbı` : wonSlice.title) : "Çarkı Çevir!"}</b>
              </div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0">
              <span class="shm-story-act" style="margin:0">CANLI EKİP ÇARK SONUÇLARI:</span>
              ${feedHtml}
            </div>

            <div class="shm-loot-grid shm-victory-loot-grid-noscroll">
              ${sliceCardsHtml}
            </div>
          </div>

          <div class="shm-victory-foot">
            ${isMinorWheel ? `
              <button class="btn primary" data-shm-act="return-to-lobby-next-stage">🏰 Sefer Odasına Dön (Soluklan · Aşama ${nextStageNum}/${camp.maxStage})</button>
            ` : `
              <button class="shm-top-btn" data-shm-nav="${isPvp ? "pvp_lobby" : "lobby"}">${isPvp ? "PvP Meydan Lobisine Dön" : "Zindan Sefer Lobisine Dön"}</button>
            `}
            <div class="shm-btn-row">
              <button class="btn ghost" data-shm-nav="mode_select">Mod Seçim Kapısı</button>
              <button class="btn good" data-shm-act="exit">Ödüllerle Ocağa Dön (Seferi Bitir)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ─── SCREEN 6: RIG & ANIMATION STUDIO ─── */
function renderStudioScreen(star) {
  const C = typeof ensureChibi === "function" ? ensureChibi() : null;
  const dollHtml = typeof renderChibiDoll === "function"
    ? renderChibiDoll(C, {
        battleStance: true,
        battleConcept: SHM.studioConcept,
        battleAnim: SHM.studioAnim,
        battleAngle: SHM.studioAngle
      })
    : "";

  return `
    <div class="shm-rig-studio">
      <div class="shm-rig-stage">
        <div class="shm-rig-Actors shm-rig-actors-row">
          <div>${dollHtml}</div>
          <div class="shm-rig-col">
            <img src="${SHM_ASSETS_PATHS.sah_ex_ascended}" class="shm-rig-boss-img" alt="">
            <span class="shm-badge">Kadim Sırça Tanrıçası</span>
          </div>
          <div class="shm-rig-col">
            <img src="${SHM_ASSETS_PATHS.kom_ex_ascended}" class="shm-rig-boss-img lg" alt="">
            <span class="shm-badge shm-badge-kal">Mavi-Kor Kalgarot</span>
          </div>
        </div>
        <div class="shm-studio-btns">
          ${(typeof BATTLE_ANIMS !== "undefined" ? BATTLE_ANIMS : []).map(a => `
            <button class="shm-top-btn ${SHM.studioAnim === a.k ? "active" : ""}" data-shm-stanim="${a.k}">${a.kisa}</button>
          `).join("")}
        </div>
      </div>

      <div class="shm-panel-box shm-panel-scroll">
        <div class="shm-panel-title">Terbiyeci Kuşanma & Duruş Vitrini</div>
        <div class="shm-studio-ctrl">
          <label class="shm-studio-lbl">Nişan Açısı: ${SHM.studioAngle}°</label>
          <input type="range" min="-15" max="80" value="${SHM.studioAngle}" id="shmStudioAngleRange">
        </div>
        <div class="shm-studio-set-col">
          <b class="shm-studio-set-sah">Şahmeran Sırça & Tanrıça Seti:</b>
          ${RAID_LOOT_SETS.sahmeran.map(it => `<button class="shm-top-btn" data-shm-equip="${it.id}">Kuşan: ${it.name}</button>`).join("")}
          <b class="shm-studio-set-kom">Başkomutan & Mavi-Kor Kıyamet Seti:</b>
          ${RAID_LOOT_SETS.komutan.map(it => `<button class="shm-top-btn" data-shm-equip="${it.id}">Kuşan: ${it.name}</button>`).join("")}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   AŞAMA SONU: YENİLGİ / GEÇİŞ / ZİNDAN ZAFERİ (ENG-13: banner yorumu kapatıldı; 6df80ec'ten beri açıktı)
   ============================================================================ */

function openStageDefeatRetryModal() {
  if (typeof document === "undefined") return;
  const mount = document.getElementById("shmStageClearMount");
  if (!mount) return;
  const camp = curCampaign();
  mount.innerHTML = `
    <div class="shm-story-modal">
      <div class="shm-story-card shm-retreat-card">
        <div class="shm-story-act bad">ANKA KÜLÜ TÜKENDİ · TAKTİKSEL GERİ ÇEKİLME</div>
        <div class="shm-story-title">Aşama ${SHM.selectedStage}/${camp.maxStage} — Yeniden Toparlan!</div>
        <p class="shm-modal-desc">
          Boss'un kırmızı <b>Tehlike Bölgesi</b> işaretlendiğinde <b>A/D</b> ile yürüyerek veya <b>[F] Kanat Uçuşu</b> ile bölgeden çıkabilir, ya da <b>[Q] Koruma Kalkanı</b> açarak hasarı sönümleyebilirsin.
        </p>
        <div class="shm-retreat-btns">
          <button class="btn ghost" data-shm-nav="lobby">Sefer Odasına Dön</button>
          <button class="btn primary" data-shm-stage="${SHM.selectedStage}">Bu Aşamayı Yeniden Dene (Tam Can)</button>
        </div>
      </div>
    </div>
  `;
}

function openStageClearBlessingModal() {
  const camp = curCampaign();
  SHM.stats.stagesCleared = (SHM.stats.stagesCleared || 0) + 1;
  SHM.wheelMode = "minor";
  SHM.wheelWonSlice = null;
  SHM.wheelWonEquipItem = null;
  SHM.wheelSpinning = false;
  SHM.wheelSpinsCount = 0;

  if (typeof S !== "undefined" && S) {
    S.gold = (S.gold || 0) + 150;
    if (typeof saveGame === "function") saveGame();
  }
  SHM.stats.goldEarned = (SHM.stats.goldEarned || 0) + 150;
  SHM.stats.guaranteedDropsText = `Aşama ${SHM.selectedStage}/${camp.maxStage} Temizlendi · +150 Altın · 1× Öncü Ganimet Çarkı Hakkı`;

  SHM.screen = "victory";
  renderSahmeranApp();
}

function completeSahmeranDungeonVictory() {
  const save = ensureSahmeranSave();
  save.clears = (save.clears || 0) + 1;
  SHM.stats.stagesCleared++;
  SHM.stats.chestOpened = false;
  SHM.wheelMode = "major";
  SHM.wheelWonSlice = null;
  SHM.wheelWonEquipItem = null;
  SHM.wheelSpinning = false;
  SHM.wheelSpinsCount = 0;
  SHM.comicMode = "epilogue";
  SHM.comicIdx = 0;
  // Reset instance progression back to Stage 1 after defeating Stage 4 Final Boss
  SHM.instanceStage = 1;
  SHM.activeBlessings = [];

  // Award Guaranteed Caravan / Dungeon Difficulty Drops (Shards, Regional Ores, Tiered Stones & Apocalypse Essence)
  const dropParts = [];
  const hasSofra = typeof S !== "undefined" && S && S.sofraBuff && S.sofraBuff.week === S.week;
  if (SHM.gameMode === "caravan") {
    const routeOreMap = {
      kizil_vadi: { k: "obsidiyen", name: "Obsidiyen Cevheri" },
      buzul_gecidi: { k: "kehribar", name: "Donmuş Kehribar" },
      mercan_kiyisi: { k: "mercan", name: "Derin Mercan Taşı" },
      firtina_bogazi: { k: "yildirim", name: "Yıldırım Kuvarsı" }
    };
    const rInfo = routeOreMap[SHM.caravanRouteId || "kizil_vadi"] || routeOreMap.kizil_vadi;
    let oreAmt = 1 + (Math.random() < 0.45 ? 1 : 0) + ((SHM.caravanCoopCount || 0) > 0 ? 1 : 0);
    if (SHM.caravanTriElement) oreAmt *= 2;
    let t2Amt = 1 + (Math.random() < 0.45 ? 1 : 0) + (SHM.caravanTriElement ? 1 : 0);
    if (hasSofra && Math.random() < 0.20) t2Amt += 1;
    const t3Amt = Math.random() < 0.25 ? 1 : 0;
    const shardWin = Math.random() < 0.35;
    const shardKey = Math.random() < 0.5 ? "sahmeran_kalip" : "kalgarot_kalip";

    const rw = { [rInfo.k]: oreAmt, kor_t2: t2Amt };
    if (t3Amt > 0) rw.kor_t3 = t3Amt;
    if (shardWin) rw[shardKey] = 1;
    if (typeof awardChibiStones === "function") awardChibiStones(rw);

    dropParts.push(`+${oreAmt}× ${rInfo.name}${SHM.caravanTriElement ? " (2× Üçlü Sancak!)" : ""}`);
    dropParts.push(`+${t2Amt}× Harlı Kor Taşı (T2)`);
    if (t3Amt > 0) dropParts.push(`+${t3Amt}× Kadim Magma Taşı (T3)`);
    if (shardWin) dropParts.push(`+1× ${shardKey === "kalgarot_kalip" ? "Kalgarot Kor Kalıbı" : "Şahmeran Sırça Kalıbı"}`);

    if (typeof S !== "undefined" && S) {
      S.gold = (S.gold || 0) + 180;
      S.un = (S.un || 0) + 8;
      if (S.hub && S.hub.caravan) {
        S.hub.caravan.dispatched = true;
        S.hub.caravan.ambushed = false;
      }
      if (typeof saveGame === "function") saveGame();
    }
  } else if (SHM.gameMode === "raid" || SHM.gameMode === "duel") {
    const isKom = SHM.raidId === "komutan";
    const isAbra = SHM.raidId === "abra";
    const shardKey = isAbra ? "abra_kalip" : isKom ? "kalgarot_kalip" : "sahmeran_kalip";
    const shardName = isAbra ? "Abra Leviathan Kalıbı" : isKom ? "Kalgarot Kor Kalıbı" : "Şahmeran Sırça Kalıbı";
    const isEx = isExtremeMode();
    const isNorm = SHM.difficulty === "normal";

    if (isNorm) {
      const t2Amt = 2 + (hasSofra && Math.random() < 0.20 ? 1 : 0);
      if (typeof awardChibiStones === "function") awardChibiStones({ [shardKey]: 1, kor_t2: t2Amt });
      dropParts.push(`+1× ${shardName}`, `+${t2Amt}× Harlı Kor Taşı (T2)`);
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + 250;
    } else if (isEx) {
      const shardAmt = 3 + (Math.random() < 0.5 ? 1 : 0);
      const t3Amt = 2 + (Math.random() < 0.5 ? 1 : 0) + (hasSofra && Math.random() < 0.20 ? 1 : 0);
      const ankaAmt = Math.random() < 0.25 ? 1 : 0;
      const rw = { [shardKey]: shardAmt, kor_t3: t3Amt, kiyamet_ozu: 1 };
      if (ankaAmt > 0) rw.anka_koruma = 1;
      if (typeof awardChibiStones === "function") awardChibiStones(rw);
      dropParts.push(`+${shardAmt}× ${shardName}`, `+${t3Amt}× Kadim Magma Taşı (T3)`, `+1× Kıyamet Özü`);
      if (ankaAmt > 0) dropParts.push(`+1× Anka Mühür Taşı`);
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + 950;
    } else {
      const t2Amt = 2 + (hasSofra && Math.random() < 0.20 ? 1 : 0);
      const t3Amt = Math.random() < 0.50 ? 1 : 0;
      const rw = { [shardKey]: 2, kor_t2: t2Amt };
      if (t3Amt > 0) rw.kor_t3 = t3Amt;
      if (typeof awardChibiStones === "function") awardChibiStones(rw);
      dropParts.push(`+2× ${shardName}`, `+${t2Amt}× Harlı Kor Taşı (T2)`);
      if (t3Amt > 0) dropParts.push(`+1× Kadim Magma Taşı (T3)`);
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + 500;
    }
    if (typeof saveGame === "function") saveGame();
  } else if (SHM.gameMode === "pvp") {
    if (typeof awardChibiStones === "function") awardChibiStones({ kor_t1: 2, kor_t2: 1 });
    dropParts.push(`+2× Kıvılcım Kor Taşı (T1)`, `+1× Harlı Kor Taşı (T2)`);
  }
  SHM.stats.guaranteedDropsText = dropParts.join(" · ");

  const isAutomatedOrFast = typeof window === "undefined" || typeof requestAnimationFrame === "undefined" || window.__fastFx || SHM.fastSim || SHM.gameMode === "pvp" || SHM.gameMode === "caravan";
  SHM.screen = isAutomatedOrFast ? "victory" : "comic";
  renderSahmeranApp();
}

/* ─── STEP 4: 8-SLICE WEIGHTED MINOR ("ÖNCÜ KÜÇÜK ÇARK") & MAJOR ("ULU KADER ÇARKI") ─── */
function spinSahmeranLootWheel(forcedSliceIdx = null) {
  if (SHM.wheelSpinning) return;
  const isMinorWheel = SHM.wheelMode === "minor" && SHM.gameMode !== "pvp" && SHM.gameMode !== "caravan";
  if (isMinorWheel && (SHM.wheelSpinsCount || 0) >= 1) {
    if (typeof toast === "function") toast("Ara aşama Öncü Ganimet Çarkı aşama başına yalnızca 1 kez çevrilebilir!");
    return;
  }

  const isPaidSpin = !isMinorWheel && (SHM.wheelSpinsCount || 0) > 0;
  if (isPaidSpin && typeof S !== "undefined" && S) {
    if ((S.gold || 0) < 120) {
      if (typeof toast === "function") toast("Ekstra çark çevirmek için 120 Altın gerekli!");
      return;
    }
    S.gold -= 120;
  }

  const activeSlices = getActiveLootWheelSlices();
  let chosen = activeSlices[0];
  if (forcedSliceIdx != null && activeSlices[forcedSliceIdx]) {
    chosen = activeSlices[forcedSliceIdx];
  } else {
    const totalWeight = activeSlices.reduce((acc, s) => acc + (s.weight || 10), 0);
    let r = Math.random() * totalWeight;
    for (const sl of activeSlices) {
      r -= (sl.weight || 10);
      if (r <= 0) {
        chosen = sl;
        break;
      }
    }
  }

  const degPerSlice = 360 / activeSlices.length; // 45 deg
  const targetSliceCenterDeg = 360 - (chosen.idx * degPerSlice);
  const baseTurns = (Math.floor((SHM.wheelRotationDeg || 0) / 360) + 4) * 360;
  SHM.wheelRotationDeg = baseTurns + targetSliceCenterDeg;
  SHM.wheelSpinning = true;
  SHM.wheelSpinsCount = (SHM.wheelSpinsCount || 0) + 1;

  if (typeof SFX !== "undefined" && SFX.play) SFX.play("click");
  renderSahmeranApp();

  const finalizeSpin = () => {
    SHM.wheelSpinning = false;
    SHM.wheelWonSlice = chosen;
    SHM.wheelWonEquipItem = null;
    SHM.stats.chestOpened = true;

    const lootList = curLootList();
    const C = typeof ensureChibi === "function" ? ensureChibi() : null;
    const isKom = SHM.raidId === "komutan";
    const isAbra = SHM.raidId === "abra";
    const shardKey = isAbra ? "abra_kalip" : isKom ? "kalgarot_kalip" : "sahmeran_kalip";
    let prizeSummary = chosen.title;

    // ─── MINOR WHEEL REWARDS (STAGES 1, 2, 3) ───
    if (chosen.id === "minor_gold_120") {
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + 120;
      SHM.stats.goldEarned = (SHM.stats.goldEarned || 0) + 120;
    } else if (chosen.id === "minor_food_2") {
      if (typeof S !== "undefined" && S) {
        S.food = S.food || {};
        const foodKeys = ["biber", "mantar", "kar", "balik", "zambak"];
        for (let k = 0; k < 2; k++) {
          const fk = foodKeys[Math.floor(Math.random() * foodKeys.length)];
          S.food[fk] = (S.food[fk] || 0) + 1;
        }
      }
    } else if (chosen.id === "minor_kort1_2") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t1: 2 });
    } else if (chosen.id === "minor_gold_220") {
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + 220;
      SHM.stats.goldEarned = (SHM.stats.goldEarned || 0) + 220;
    } else if (chosen.id === "minor_feast_1") {
      if (typeof S !== "undefined" && S) {
        S.food = S.food || {};
        S.food.ziyafet = (S.food.ziyafet || 0) + 1;
        S.food.biber = (S.food.biber || 0) + 2;
      }
      if (SHM.player) SHM.player.hp = Math.min(SHM.player.maxHp, SHM.player.hp + 150);
    } else if (chosen.id === "minor_kort1_3") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t1: 3 });
    } else if (chosen.id === "minor_ore_1") {
      const oreKeys = ["obsidiyen", "kehribar", "mercan", "yildirim"];
      const ok = oreKeys[Math.floor(Math.random() * oreKeys.length)];
      if (typeof awardChibiStones === "function") awardChibiStones({ [ok]: 2 });
    } else if (chosen.id === "minor_kort2_1") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t2: 1 });
    }
    // ─── MAJOR WHEEL REWARDS (FINAL BOSS STAGE 4) ───
    else if (chosen.id === "major_gold" || chosen.id === "gold_350") {
      const gAmt = isExtremeMode() ? 900 : 450;
      if (typeof S !== "undefined" && S) S.gold = (S.gold || 0) + gAmt;
      SHM.stats.goldEarned = (SHM.stats.goldEarned || 0) + gAmt;
    } else if (chosen.id === "major_kort2_2" || chosen.id === "kor_t2_2") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t2: 2 });
    } else if (chosen.id === "major_kort2_3") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t2: 3 });
    } else if (chosen.id === "major_kort3_1" || chosen.id === "kor_t3_1") {
      if (typeof awardChibiStones === "function") awardChibiStones({ kor_t3: 1 });
    } else if (chosen.id === "major_egg_1") {
      if (typeof S !== "undefined" && S) {
        if (!Array.isArray(S.eggs)) S.eggs = [];
        const el = ["ates", "buz", "firtina", "toprak", "golge"][Math.floor(Math.random() * 5)];
        const g = typeof randomGenes === "function" ? randomGenes({ q: 0.52, el }) : { el: [el, el], pot: { gu: [3, 3], ce: [3, 3], da: [3, 3], ze: [3, 3] }, eye: ["A", "N"], horn: ["k", "k"], pat: ["C", "B"], pig: ["N", "N"], par: ["P", "p"], pul: ["altin", "kizil"], sus: ["inci", "altin"], eyec: ["altin", "kehribar"] };
        const canIncubate = typeof kuluckaFree === "function" ? kuluckaFree() > 0 : false;
        S.eggs.push({
          id: "e" + (S.uid ? S.uid++ : Date.now()),
          genes: g,
          sex: Math.random() < 0.5 ? "F" : "M",
          traits: ["asil"],
          w: 0,
          inK: canIncubate,
          gen: 2,
          parents: null,
          origin: "Zindan Kader Çarkı Hazinesi"
        });
      }
    } else if (chosen.id === "major_shard_armor" || chosen.id === "major_shard_wpn" || chosen.id === "raid_armor" || chosen.id === "raid_wpn") {
      // Completely random item shard from armor or weapon pool (NO unowned[0] guarantee, NO direct equip!)
      const wantArmor = chosen.id === "major_shard_armor" || chosen.id === "raid_armor";
      const pool = lootList.filter(it => wantArmor ? (it.slot === "armor" || it.slot === "hat" || it.slot === "back") : (it.slot === "wpn" || it.slot === "tal" || it.slot === "face"));
      const picked = pool[Math.floor(Math.random() * pool.length)] || lootList[Math.floor(Math.random() * lootList.length)] || lootList[0];
      if (picked) {
        if (typeof awardChibiStones === "function") {
          awardChibiStones({ [shardKey]: 1 });
        } else if (C) {
          C.shards = C.shards || {};
          C.shards[shardKey] = (C.shards[shardKey] || 0) + 1;
        }
        if (C) {
          C.shards = C.shards || {};
          C.shards[picked.id] = (C.shards[picked.id] || 0) + 1;
        }
        SHM.wheelWonEquipItem = picked;
        prizeSummary = `${picked.name} Kalıbı (+1/${picked.shardsNeeded || 5})`;
      }
    } else if (chosen.id === "major_jackpot" || chosen.id === "jackpot_anka_ozu") {
      if (typeof awardChibiStones === "function") {
        awardChibiStones({ anka_koruma: 1, kiyamet_ozu: 1 });
      }
      prizeSummary = "JACKPOT: 1× Anka Mühür Taşı + 1× Kıyamet Özü";
    }

    if (typeof saveGame === "function") saveGame();
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("win");
    if (typeof toast === "function") {
      toast(`${isMinorWheel ? "Öncü Ganimet Çarkı" : "Ulu Kader Çarkı"} Ödülü: ${prizeSummary}!`);
    }
    if (!Array.isArray(SHM.partyWheelFeed)) SHM.partyWheelFeed = [];
    SHM.partyWheelFeed.unshift({ handle: "Sen", prize: prizeSummary, badge: chosen.badge });
    if (typeof mpSendWs === "function") {
      const myHandle = (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi";
      mpSendWs({
        type: "wheel_spin",
        from: myHandle,
        handle: myHandle,
        sliceIdx: chosen.idx,
        rewardTitle: prizeSummary,
        rewardKind: chosen.badge,
        prize: prizeSummary,
        badge: chosen.badge
      });
    }
    renderSahmeranApp();
  };

  const isFast = typeof window === "undefined" || window.__fastFx || SHM.fastSim;
  setTimeout(finalizeSpin, isFast ? 60 : 2150);
}

function openSahmeranTreasureChest() {
  // Legacy cheat code removed: Dungeon items are crafted at Usta Kerim's Forge using 5x Shards + Ores + Stones.
  spinSahmeranLootWheel();
}

function updateCorridorWalkTick(dt) {
  if (typeof document === "undefined") return;
  const cor = SHM.corridor;
  const meEl = document.getElementById("shmCorridorMe");
  if (!meEl) return;

  if (SHM.keys["ArrowRight"] || SHM.keys["KeyD"]) {
    cor.tx = Math.min(88, cor.x + 26 * dt);
    cor.ty = cor.tx > 64 ? 74 - (cor.tx - 64) * 1.05 : 74;
  } else if (SHM.keys["ArrowLeft"] || SHM.keys["KeyA"]) {
    cor.tx = Math.max(8, cor.x - 26 * dt);
    cor.ty = cor.tx > 64 ? 74 - (cor.tx - 64) * 1.05 : 74;
  }

  const dx = cor.tx - cor.x;
  const dy = cor.ty - cor.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.35) {
    cor.x = cor.tx;
    cor.y = cor.ty;
    cor.v = Math.max(0, cor.v - 45 * dt);
  } else {
    const vmax = 24;
    const want = Math.min(vmax, dist * 2.4 + 4);
    cor.v += Math.sign(want - cor.v) * Math.min(Math.abs(want - cor.v), 42 * dt);
    const stepDist = Math.min(dist, cor.v * dt);
    cor.x += (dx / dist) * stepDist;
    cor.y += (dy / dist) * stepDist;
    if (Math.abs(dx) > 0.2) cor.f = dx > 0 ? 1 : -1;
  }

  cor.ff += Math.sign(cor.f - cor.ff) * Math.min(Math.abs(cor.f - cor.ff), 9 * dt);
  cor.ph += (cor.v / 2.6) * Math.PI * dt;
  const step = Math.abs(Math.sin(cor.ph));
  const moving = cor.v > 0.5;
  const k = moving ? Math.min(1, cor.v / 24) : 0;
  const lift = step * k * 14;
  const land = Math.pow(1 - step, 5) * k;
  const tilt = moving ? Math.sin(cor.ph) * 2.6 * k : 0;
  const sx = (Math.abs(cor.ff) < 0.15 ? 0.15 * Math.sign(cor.ff || 1) : cor.ff) * (1 + 0.03 * land);
  const sy = 1 - 0.045 * land;

  meEl.style.left = cor.x.toFixed(2) + "%";
  meEl.style.top = cor.y.toFixed(2) + "%";
  meEl.style.zIndex = String(Math.round(cor.y * 10));

  const duo = document.getElementById("shmCorridorDuo");
  if (duo) {
    duo.style.transform = `translateY(${(-lift).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  }
  const sh = document.getElementById("shmCorridorShadow");
  if (sh) {
    sh.style.transform = `scale(${Math.max(0.65, 1 - lift * 0.018).toFixed(3)})`;
  }
  const bg = document.getElementById("shmCorridorBg");
  if (bg) {
    bg.style.transform = `translateX(${((50 - cor.x) * 0.28).toFixed(1)}px) scale(1.04)`;
  }

  if (Math.abs(cor.x - 36) < 4.5 && !cor.steleRead) {
    triggerCorridorPoi("stele");
  } else if (Math.abs(cor.x - 58) < 4.5 && !cor.brazierLit) {
    triggerCorridorPoi("brazier");
  } else if (cor.x >= 81 && !cor.gateOpened) {
    cor.gateOpened = true;
    triggerCorridorPoi("gate");
  }
}

function triggerCorridorPoi(poiKey) {
  const cor = SHM.corridor;
  const pois = curCampaign().corridorPois;
  if (poiKey === "stele") {
    cor.steleRead = true;
    SHM.runBuffs.headshotMult = Math.max(SHM.runBuffs.headshotMult, 2.9);
    cor.msg = pois.steleMsg;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("c-gasp");
    renderSahmeranApp();
  } else if (poiKey === "brazier") {
    cor.brazierLit = true;
    SHM.runBuffs.maxHpBonus = (SHM.runBuffs.maxHpBonus || 0) + 400;
    cor.msg = pois.brazierMsg;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("f-breath-ates");
    renderSahmeranApp();
  } else if (poiKey === "gate") {
    cor.gateOpened = true;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("c-horn");
    SHM.screen = "battle";
    initSahmeranBattleStage(1);
    renderSahmeranApp();
  }
}

function updateBattleHudDom() {
  if (typeof document === "undefined") return;
  const p = SHM.player;
  const b = SHM.boss;
  if (p) {
    const hpF = document.getElementById("shmHeroHpFill");
    const hpV = document.getElementById("shmHeroHpVal");
    const stF = document.getElementById("shmHeroStaFill");
    const stV = document.getElementById("shmHeroStaVal");
    const rgF = document.getElementById("shmHeroRageFill");
    const rgV = document.getElementById("shmHeroRageVal");
    if (hpF) hpF.style.width = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)).toFixed(1) + "%";
    if (hpV) hpV.textContent = `${Math.round(p.hp)}/${p.maxHp}`;
    if (stF) stF.style.width = Math.max(0, Math.min(100, (p.stamina / p.maxStamina) * 100)).toFixed(1) + "%";
    if (stV) stV.textContent = `${Math.round(p.stamina)}/${p.maxStamina}`;
    if (rgF) rgF.style.width = Math.max(0, Math.min(100, p.rage)).toFixed(1) + "%";
    if (rgV) rgV.textContent = `%${Math.round(p.rage)}`;
  }
  if (SHM.gameMode === "pvp" && SHM.pvpRival) {
    const rv = SHM.pvpRival;
    const bhpF = document.getElementById("shmBossHpFill");
    const bhpG = document.getElementById("shmBossHpGhost");
    const bhpT = document.getElementById("shmBossHpText");
    if (bhpF) bhpF.style.width = Math.max(0, Math.min(100, (rv.hp / rv.maxHp) * 100)).toFixed(1) + "%";
    if (bhpG) bhpG.style.width = Math.max(0, Math.min(100, ((rv.ghostHp ?? rv.hp) / rv.maxHp) * 100)).toFixed(1) + "%";
    if (bhpT) bhpT.textContent = `Rakip Can: ${Math.max(0, Math.round(rv.hp))} / ${rv.maxHp} ${rv.shield > 0 ? `(Kalkan: +${rv.shield})` : ""}`;
  } else if (b) {
    const bhpF = document.getElementById("shmBossHpFill");
    const bhpT = document.getElementById("shmBossHpText");
    const bPh = document.getElementById("shmBossPhase");
    if (bhpF) bhpF.style.width = Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100)).toFixed(1) + "%";
    if (bhpT) bhpT.textContent = `HP: ${Math.max(0, Math.round(b.hp))} / ${b.maxHp} ${b.shield > 0 ? `(Kalkan: +${b.shield})` : ""}`;
    if (bPh) bPh.textContent = `FAZ ${b.phase}/${b.maxPhase || 3} · ${b.phaseTitle || ""}`;
  }
  if (p) {
    const hpG = document.getElementById("shmHeroHpGhost");
    if (hpG) hpG.style.width = Math.max(0, Math.min(100, ((p.ghostHp ?? p.hp) / p.maxHp) * 100)).toFixed(1) + "%";
  }
  if (b) {
    const bhpG = document.getElementById("shmBossHpGhost");
    if (bhpG) bhpG.style.width = Math.max(0, Math.min(100, ((b.ghostHp ?? b.hp) / b.maxHp) * 100)).toFixed(1) + "%";
  }
  const ecBadge = document.getElementById("shmEnemyCountBadge");
  if (ecBadge) {
    ecBadge.textContent = `Kalan Muhafız: ${SHM.enemies.filter(e => !e.dead).length}`;
  }
  const wPill = document.getElementById("shmWindReadout") || document.getElementById("shmWindPill");
  if (wPill) {
    const windVal = Math.abs(SHM.wind).toFixed(1);
    const windDir = SHM.wind > 0.05 ? "DOĞUYA" : SHM.wind < -0.05 ? "BATIYA" : "DURGUN";
    wPill.textContent = `RÜZGÂR: ${windVal} ${windDir}`;
  }
  const wVane = document.getElementById("shmWindVaneImg");
  if (wVane) {
    wVane.style.transform = `scaleX(${SHM.wind < 0 ? -1 : 1})`;
  }
  const tPill = document.getElementById("shmTurnBadge") || document.getElementById("shmTurnPill");
  if (tPill) {
    const actorLbl = (SHM.turn === "enemy" && SHM.cam.activeActor && SHM.cam.activeActor.label)
      ? `SIRA: ${SHM.cam.activeActor.label}`
      : (SHM.gameMode === "pvp" ? "SIRA: KIRMIZI" : "DÜŞMAN HAMLESİ");
    const stageLbl = SHM.gameMode === "pvp"
      ? "SIRA: MAVİ (SEN)"
      : SHM.gameMode === "caravan"
      ? "KERVAN · SENİN SIRAN"
      : `AŞAMA ${SHM.selectedStage}/${curCampaign().maxStage} · SENİN SIRAN`;
    tPill.textContent = SHM.turn === "player" ? stageLbl : actorLbl;
  }
  const revBadge = document.getElementById("shmReviveBadge");
  if (revBadge && p) {
    revBadge.textContent = `Anka:${p.revivesLeft ?? 1}`;
  }
  const tqEl = document.getElementById("shmPvpTurnQueue");
  if (tqEl && SHM.gameMode === "pvp") {
    const is2v2 = SHM.pvpTeamMode === "2v2";
    const activeIdx = is2v2 ? ((SHM.pvpTurnIdx || 0) % 4) : (SHM.turn === "player" ? 0 : 1);
    tqEl.querySelectorAll(".shm-tq-socket").forEach((el, i) => {
      el.classList.toggle("active", i === activeIdx);
    });
  }
  const armedCueEl = document.getElementById("shmArmedPowerupCue");
  if (armedCueEl) {
    const lbl = getArmedPowerupLabel();
    armedCueEl.classList.toggle("visible", !!lbl);
    armedCueEl.textContent = lbl ? `🔊 ⚡ ${lbl} AKTİF!` : "";
  }
  document.querySelectorAll("[data-shm-skill]").forEach(btn => {
    const k = btn.getAttribute("data-shm-skill");
    const cd = (SHM.cooldowns && SHM.cooldowns[k]) || 0;
    const isArmed = !!SHM.activeMods[k] || (k === "anchor" && p && p.anchorBraced);
    btn.classList.toggle("active", isArmed);
    btn.classList.toggle("is-armed", isArmed);
    btn.classList.toggle("is-selected", isArmed);
    btn.classList.toggle("on-cd", cd > 0);
    const cdLbl = btn.querySelector("[data-shm-cd-lbl]");
    if (cdLbl) {
      const costs = { plus1: 25, plus2: 40, trident: 45, heavy: 35, crater: 30, teleport: 50, shield: 40, heal: 45, anchor: 20, powUlt: "ULTİ" };
      cdLbl.textContent = cd > 0 ? `${cd}T` : String(costs[k] || "");
    }
    if (k === "powUlt" && p) {
      btn.classList.toggle("ready", p.rage >= 100);
    }
  });
}

function toggleTopcuSkill(skillId) {
  if (SHM.turn !== "player" || !SHM.player) return;
  const p = SHM.player;
  const costs = { plus1: 25, plus2: 40, trident: 45, heavy: 35, crater: 30, teleport: 50, shield: 40, heal: 45, anchor: 20, powUlt: 0 };
  const cost = costs[skillId] || 0;
  const cd = (SHM.cooldowns && SHM.cooldowns[skillId]) || 0;
  if (cd > 0) {
    addFloatText(p.x, p.y - 95, `BEKLEME SÜRESİNDE (${cd} TUR)!`, "#d9b062", 16);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("error");
    return;
  }

  if (skillId === "anchor") {
    if (p.stamina < cost) {
      addFloatText(p.x, p.y - 90, "YETERSİZ NEFES ENERJİSİ!", "#ff7a6a", 16);
      return;
    }
    p.stamina -= cost;
    p.anchorBraced = true;
    p.anchorAimBonus = 0.25;
    if (SHM.cooldowns) SHM.cooldowns.anchor = 2;
    addFloatText(p.x, p.y - 98, "⚓ DEMİR ÇAPA ATILDI! DALGA İTMESİ -%75 & +%25 İSABET!", "#5eead4", 18, true);
    spawnExplosionParticles(p.x, p.y - 12, "#5eead4", 16);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("guard");
    updateBattleHudDom();
    return;
  }

  if (skillId === "shield") {
    if (p.stamina < cost) {
      addFloatText(p.x, p.y - 90, "YETERSİZ NEFES ENERJİSİ!", "#ff7a6a", 16);
      return;
    }
    p.stamina -= cost;
    p.shield = 2;
    p.poison = 0;
    p.animState = "guard";
    if (SHM.cooldowns) SHM.cooldowns.shield = 2;
    addFloatText(p.x, p.y - 95, "RÜN KALKANI AKTİF! (2 DARBE KORUMA)", "#d9b062", 18, true);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("guard");
    updateBattleHudDom();
    return;
  }

  if (skillId === "heal") {
    if (p.stamina < cost) {
      addFloatText(p.x, p.y - 90, "YETERSİZ NEFES ENERJİSİ!", "#ff7a6a", 16);
      return;
    }
    p.stamina -= cost;
    p.hp = Math.min(p.maxHp, p.hp + 450);
    p.ghostHp = p.hp;
    if (SHM.cooldowns) SHM.cooldowns.heal = 3;
    addFloatText(p.x, p.y - 95, "OCAK İLK YARDIM +450 HP!", "#9ad07a", 19, true);
    spawnExplosionParticles(p.x, p.y - 45, "#9ad07a", 22);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("heart");
    updateBattleHudDom();
    return;
  }

  if (skillId === "powUlt") {
    if (p.rage < 100) {
      addFloatText(p.x, p.y - 90, `POW ÖFKESİ YETERSİZ (%${Math.round(p.rage)}/100)`, "#d9b062", 16);
      return;
    }
    SHM.activeMods.powUlt = !SHM.activeMods.powUlt;
    addFloatText(p.x, p.y - 102, SHM.activeMods.powUlt ? "🔊 ⚡ POW! EJDER ÖFKESİ HAZIR!" : "POW İptal", "#ffe0a0", 20, true);
    if (typeof SFX !== "undefined" && SFX.play) {
      SFX.play(SHM.activeMods.powUlt ? "powerup_arm" : "click");
    }
    updateBattleHudDom();
    return;
  }

  if (SHM.activeMods[skillId]) {
    SHM.activeMods[skillId] = false;
    p.stamina = Math.min(p.maxStamina, p.stamina + cost);
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("click");
  } else {
    // Volley Group Exclusivity: [1] plus1, [2] plus2, and [3] trident are mutually exclusive volley modes!
    const volleyGroup = ["plus1", "plus2", "trident"];
    let refunded = 0;
    if (volleyGroup.includes(skillId)) {
      for (const vg of volleyGroup) {
        if (vg !== skillId && SHM.activeMods[vg]) {
          SHM.activeMods[vg] = false;
          refunded += costs[vg];
        }
      }
    }
    if (p.stamina + refunded < cost) {
      // Restore if still not enough stamina
      addFloatText(p.x, p.y - 90, "YETERSİZ NEFES ENERJİSİ!", "#ff7a6a", 16);
      return;
    }
    p.stamina = Math.min(p.maxStamina, p.stamina + refunded) - cost;
    SHM.activeMods[skillId] = true;
    if (typeof SFX !== "undefined" && SFX.play) SFX.play("powerup_arm");
  }
  updateBattleHudDom();
}

/* ============================================================================
   DOM & KEYBOARD EVENT LISTENERS
   ============================================================================ */
let SHM_KEYS_BOUND = false;
function bindSahmeranEvents() {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".shm-root");
  if (!root) return;

  root.querySelectorAll("[data-shm-raid]").forEach(btn => {
    btn.onclick = () => {
      const rId = btn.getAttribute("data-shm-raid");
      if (SHM.raidId !== rId) {
        SHM.raidId = rId;
        resetDungeonInstanceProgress();
      }
      if (typeof preloadRaidAssets === "function") preloadRaidAssets(rId);
      SHM.comicIdx = 0;
      SHM.corridor.steleRead = false;
      SHM.corridor.brazierLit = false;
      SHM.corridor.gateOpened = false;
      SHM.corridor.x = 14;
      SHM.corridor.tx = 14;
      SHM.player = null;
      if (SHM.screen === "battle") initSahmeranBattleStage(SHM.instanceStage || 1);
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-gate-raid]").forEach(row => {
    row.onclick = () => {
      const rId = row.getAttribute("data-shm-gate-raid") || "sahmeran";
      if (SHM.raidId !== rId) {
        SHM.raidId = rId;
        resetDungeonInstanceProgress();
      }
      if (typeof preloadRaidAssets === "function") preloadRaidAssets(rId);
      SHM.entryContext = "pve_dungeon";
      SHM.gameMode = "raid";
      SHM.screen = "lobby";
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-nav]").forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute("data-shm-nav");
      if (target === "mode_select") {
        closeSahmeranApp();
        if (typeof UI !== "undefined") { UI.view = "zindan"; if (typeof render === "function") render(); }
        return;
      } else if (target === "duel") {
        SHM.entryContext = "pve_dungeon";
        SHM.gameMode = "duel";
        SHM.screen = "battle";
        initSahmeranBattleStage(SHM.instanceStage || 1);
      } else if (target === "pvp_lobby") {
        if (typeof pvpIsLive === "function" && pvpIsLive()) {
          // ENG-14: canlı maçtan lobiye dönmek = maçtan ayrılmak (hükmen); sonuç sunucudan iki tarafa gelir.
          if (typeof mpSendWs === "function") mpSendWs({ type: "pvp_room_leave" });
          return;
        }
        resetDungeonInstanceProgress();
        SHM.entryContext = "pvp_arena";
        SHM.gameMode = "pvp";
        SHM.screen = "pvp_lobby";
      } else {
        SHM.entryContext = "pve_dungeon";
        SHM.gameMode = "raid";
        SHM.screen = target;
      }
      renderSahmeranApp();
    };
  });

  const raidSlotIdx = (btn, attr) => Math.max(0, Math.min(1, (parseInt(btn.getAttribute(attr), 10) || 1) - 1));
  root.querySelectorAll("[data-shm-raid-add-bot]").forEach(btn => {
    btn.onclick = () => {
      const i = raidSlotIdx(btn, "data-shm-raid-add-bot");
      if (!Array.isArray(SHM.raidPartySlots)) SHM.raidPartySlots = [null, null];
      if (SHM.raidPartySlots[i]) return;
      const comp = SHM_COMPANIONS[i] || SHM_COMPANIONS[0];
      SHM.raidPartySlots[i] = { kind: "bot", handle: comp.handle || ("@yoldas_" + (i + 1)), name: comp.name };
      syncRaidSoloMode();
      renderSahmeranApp();
    };
  });
  root.querySelectorAll("[data-shm-raid-invite]").forEach(btn => {
    btn.onclick = () => {
      if (typeof mpSendWs === "function") {
        mpSendWs({ type: "pvp_sync", action: "invite", from: pvpSelfHandle(), raidId: SHM.raidId, slot: raidSlotIdx(btn, "data-shm-raid-invite") + 1 });
      }
      if (typeof toast === "function") toast("📨 Sefer daveti gönderildi. Ortak sefer eşitlemesi henüz yok; yuva dolmaz, yalnız NPC yoldaş eklenebilir.", "goal");
    };
  });
  root.querySelectorAll("[data-shm-raid-kick]").forEach(btn => {
    btn.onclick = () => {
      const i = raidSlotIdx(btn, "data-shm-raid-kick");
      if (Array.isArray(SHM.raidPartySlots)) SHM.raidPartySlots[i] = null;
      syncRaidSoloMode();
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-stage]").forEach(btn => {
    btn.onclick = () => {
      const stg = Math.max(1, Math.min(curCampaign().maxStage, SHM.instanceStage || 1));
      SHM.gameMode = "raid";
      SHM.selectedStage = stg;
      SHM.screen = "battle";
      initSahmeranBattleStage(stg);
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-diff]").forEach(btn => {
    btn.onclick = () => {
      const nextDiff = btn.getAttribute("data-shm-diff");
      if (SHM.difficulty !== nextDiff) {
        SHM.difficulty = nextDiff;
        resetDungeonInstanceProgress();
      }
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-ally]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-shm-ally");
      SHM.soloMode = false;
      const idx = SHM.allies.indexOf(id);
      if (idx >= 0) SHM.allies.splice(idx, 1);
      else SHM.allies.push(id);
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-road]").forEach(node => {
    node.onclick = () => {
      const act = node.getAttribute("data-shm-road");
      if (act === "start-full") {
        SHM.comicIdx = 0;
        SHM.screen = "comic";
      }
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-equip]").forEach(btn => {
    btn.onclick = () => {
      renderSahmeranApp();
    };
  });

  root.querySelectorAll("[data-shm-comic-idx]").forEach(btn => {
    btn.onclick = () => {
      SHM.comicIdx = parseInt(btn.getAttribute("data-shm-comic-idx"), 10) || 0;
      renderSahmeranApp();
    };
  });

  const corStage = document.getElementById("shmCorridorStage");
  if (corStage) {
    corStage.onclick = (ev) => {
      if (ev.target.closest("button") || ev.target.closest(".shm-corridor-poi")) return;
      const rect = corStage.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * 100;
      SHM.corridor.tx = Math.max(8, Math.min(88, px));
      SHM.corridor.ty = SHM.corridor.tx > 64 ? 74 - (SHM.corridor.tx - 64) * 1.05 : 74;
      const ring = document.getElementById("shmWalkRing");
      if (ring) {
        ring.style.left = SHM.corridor.tx + "%";
        ring.style.top = SHM.corridor.ty + "%";
        ring.style.display = "block";
      }
    };
  }
  root.querySelectorAll("[data-shm-poi]").forEach(poi => {
    poi.onclick = (ev) => {
      ev.stopPropagation();
      const k = poi.getAttribute("data-shm-poi");
      triggerCorridorPoi(k);
    };
  });

  root.querySelectorAll("[data-shm-skill]").forEach(btn => {
    btn.onclick = () => {
      toggleTopcuSkill(btn.getAttribute("data-shm-skill"));
    };
  });

  root.querySelectorAll("[data-shm-cam]").forEach(btn => {
    btn.onclick = () => {
      const camAct = btn.getAttribute("data-shm-cam");
      if (camAct === "zoom-in") {
        SHM.cam.tZoom = Math.min(1.85, SHM.cam.tZoom + 0.16);
        return;
      }
      if (camAct === "zoom-out") {
        SHM.cam.tZoom = Math.max(0.48, SHM.cam.tZoom - 0.16);
        return;
      }
      SHM.cam.mode = camAct;
      SHM.cam.manualPan = (camAct === "free");
      root.querySelectorAll("[data-shm-cam]").forEach(b => {
        const a = b.getAttribute("data-shm-cam");
        if (a !== "zoom-in" && a !== "zoom-out") b.classList.toggle("active", b === btn);
      });
    };
  });

  root.setAttribute("data-bound", "1");
  root.onclick = (ev) => {
    const blCard = ev.target.closest("[data-shm-blessing]");
    if (blCard) {
      const bId = blCard.getAttribute("data-shm-blessing");
      const bl = SHM_BLESSINGS.find(x => x.id === bId);
      if (bl) bl.apply(SHM.runBuffs);
      const nextStg = Math.min(curCampaign().maxStage, (SHM.instanceStage || 1) + 1);
      SHM.instanceStage = nextStg;
      SHM.selectedStage = nextStg;
      SHM.screen = "lobby";
      renderSahmeranApp();
    }
  };

  const gauge = document.getElementById("shmPowerGauge");
  if (gauge) {
    gauge.onmousedown = () => {
      if (SHM.turn === "player" && !SHM.charging) {
        SHM.charging = true;
        SHM.power = 8;
        SHM.powerDir = 1;
        SHM.cam.manualPan = false;
        SHM.cam.mode = "follow";
      }
    };
    window.addEventListener("mouseup", () => {
      if (SHM.charging && SHM.turn === "player") {
        firePlayerVolley(SHM.power);
      }
    }, { once: true });
  }

  const cv = document.getElementById("shmCanvas");
  if (cv) {
    cv.onmousedown = (ev) => {
      SHM.cam.dragging = true;
      SHM.cam.manualPan = true;
      SHM.cam.mode = "free";
      SHM.cam.dragStartX = ev.clientX;
      SHM.cam.dragStartY = ev.clientY;
      SHM.cam.camStartX = SHM.cam.x;
      SHM.cam.camStartY = SHM.cam.y;
    };
    cv.onmousemove = (ev) => {
      if (!SHM.cam.dragging) return;
      const dx = (ev.clientX - SHM.cam.dragStartX) / SHM.cam.zoom;
      const dy = (ev.clientY - SHM.cam.dragStartY) / SHM.cam.zoom;
      SHM.cam.tx = SHM.cam.x = Math.max(0, Math.min(SHM.WORLD_W - cv.width / SHM.cam.zoom, SHM.cam.camStartX - dx));
      SHM.cam.ty = SHM.cam.y = Math.max(0, Math.min(SHM.WORLD_H - cv.height / SHM.cam.zoom, SHM.cam.camStartY - dy));
    };
    cv.onmouseup = () => { SHM.cam.dragging = false; };
    cv.onmouseleave = () => { SHM.cam.dragging = false; };
    cv.onwheel = (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY < 0 ? 0.12 : -0.12;
      SHM.cam.tZoom = Math.max(0.48, Math.min(1.85, SHM.cam.tZoom + delta));
    };
  }

  const mm = document.getElementById("shmMinimap");
  if (mm) {
    mm.onclick = (ev) => {
      const rect = mm.getBoundingClientRect();
      const rx = (ev.clientX - rect.left) / rect.width;
      const ry = (ev.clientY - rect.top) / rect.height;
      SHM.cam.mode = "free";
      SHM.cam.manualPan = true;
      SHM.cam.tx = rx * SHM.WORLD_W - 450;
      SHM.cam.ty = ry * SHM.WORLD_H - 280;
    };
  }

  root.querySelectorAll("[data-shm-act]").forEach(btn => {
    btn.onclick = () => {
      const act = btn.getAttribute("data-shm-act");
      const camp = curCampaign();
      if (act === "exit") {
        closeSahmeranApp();
      } else if (act === "fullscreen") {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (act === "toggle-solo") {
        SHM.soloMode = !SHM.soloMode;
        renderSahmeranApp();
      } else if (act === "toggle-fast") {
        SHM.fastSim = !SHM.fastSim;
        renderSahmeranApp();
      } else if (act === "cycle-el") {
        const els = ["ates", "buz", "firtina", "toprak", "golge"];
        const star = (typeof S !== "undefined" && S && S.dragons && ((typeof byId === "function" && byId(S.star)) || S.dragons[0])) || null;
        const curEl = (SHM.player && SHM.player.el) || (star && star.el) || "ates";
        const nextEl = els[(els.indexOf(curEl) + 1) % els.length];
        if (SHM.player) SHM.player.el = nextEl;
        if (star) star.el = nextEl;
        renderSahmeranApp();
      } else if (act === "start-instance-stage" || act === "start-full-campaign") {
        const stg = Math.max(1, Math.min(camp.maxStage, SHM.instanceStage || 1));
        SHM.instanceStage = stg;
        SHM.selectedStage = stg;
        SHM.stageIndex = stg - 1;
        // Starting a new instance (Stage 1) adds +15 Fatigue to the Star Dragon
        if (stg === 1 && typeof S !== "undefined" && S && Array.isArray(S.dragons)) {
          const starDr = (typeof byId === "function" && byId(S.star)) || S.dragons[0];
          if (starDr) {
            starDr.fat = Math.min(100, (starDr.fat || 0) + 15);
            if (typeof saveGame === "function") saveGame();
          }
        }
        SHM.screen = "battle";
        initSahmeranBattleStage(stg);
        renderSahmeranApp();
      } else if (act === "return-to-lobby-next-stage") {
        const nextStg = Math.min(camp.maxStage, (SHM.selectedStage || SHM.instanceStage || 1) + 1);
        SHM.instanceStage = nextStg;
        SHM.selectedStage = nextStg;
        SHM.stageIndex = nextStg - 1;
        SHM.screen = "lobby";
        renderSahmeranApp();
      } else if (act === "seq-open-victory") {
        SHM.screen = "victory";
        renderSahmeranApp();
      } else if (act === "open-native-comic") {
        const cId = camp.nativeComicId;
        if (typeof comicModal === "function" && typeof COMIC !== "undefined" && COMIC[cId]) {
          closeSahmeranApp();
          comicModal({
            id: cId,
            title: camp.title,
            opts: [
              { t: "Zindana Gir (Tam Ekran Raid)", fx: () => { openAnimTestRoom({ raidId: SHM.raidId, screen: "battle" }); return null; } }
            ]
          });
        }
      } else if (act === "reset-stage") {
        initSahmeranBattleStage(SHM.selectedStage);
        renderSahmeranApp();
      } else if (act === "dismiss-comic-intro") {
        dismissBossEntranceComic();
      } else if (act === "provoke-boss") {
        if (SHM.boss && !SHM.boss.dead && SHM.player) {
          performBossTauntTurn(SHM.boss, SHM.player, SHM.raidId === "komutan");
        }
      } else if (act === "skip-turn") {
        if (SHM.turn === "player" && SHM.player) {
          SHM.player.stamina = Math.min(SHM.player.maxStamina, SHM.player.stamina + 45);
          addFloatText(SHM.player.x, SHM.player.y - 90, "TUR PAS GEÇİLDİ (+45 NEFES ENERJİSİ)", "#d9b062", 17, true);
          advanceTurnAfterVolley();
        }
      } else if (act === "gate-enter-pve") {
        SHM.entryContext = "pve_dungeon";
        SHM.gameMode = "raid";
        SHM.screen = "lobby";
        renderSahmeranApp();
      } else if (act === "gate-enter-pvp") {
        SHM.entryContext = "pvp_arena";
        SHM.gameMode = "pvp";
        SHM.screen = "pvp_lobby";
        renderSahmeranApp();
      } else if (act === "pvp-quick-1v1") {
        // ENG-14: hızlı savaş sunucu kuyruğunda; PvP lobisine geçip aramayı başlat.
        SHM.entryContext = "pvp_arena";
        SHM.gameMode = "pvp";
        SHM.screen = "pvp_lobby";
        renderSahmeranApp();
        if (typeof PVPR !== "undefined" && typeof onPvpNetMessage === "function") {
          const q = document.querySelector('[data-pvpr-act="quick"]');
          if (q && !q.disabled) q.click();
        }
      } else if (act === "pvp-quick-2v2") {
        if (typeof toast === "function") toast("2v2 yakında. Şimdilik 1v1 oynayabilirsin.", "goal");
      } else if (act === "spin-wheel") {
        spinSahmeranLootWheel();
      } else if (act === "open-chest") {
        openSahmeranTreasureChest();
        renderSahmeranApp();
      } else if (act === "watch-epilog") {
        SHM.comicMode = "epilogue";
        SHM.comicIdx = 0;
        SHM.screen = "comic";
        renderSahmeranApp();
      }
    };
  });

  root.querySelectorAll("[data-shm-stanim]").forEach(btn => {
    btn.onclick = () => {
      const an = btn.getAttribute("data-shm-stanim") || "idle";
      SHM.studioAnim = an;
      renderSahmeranApp();
      document.querySelectorAll(".shm-rig-studio .chibi-doll.battle-mode").forEach(doll => {
        doll.classList.remove("anim-" + an);
        void doll.offsetWidth;
        doll.classList.add("anim-" + an);
      });
      clearTimeout(SHM._studioAnimTimer);
      if (an !== "idle" && an !== "guard" && an !== "aim_lock" && an !== "charge") {
        SHM._studioAnimTimer = setTimeout(() => {
          SHM.studioAnim = "idle";
          document.querySelectorAll(".shm-rig-studio .chibi-doll.battle-mode").forEach(doll => {
            Array.from(doll.classList).forEach(c => { if (c.startsWith("anim-")) doll.classList.remove(c); });
            doll.classList.add("anim-idle");
          });
          document.querySelectorAll("[data-shm-stanim]").forEach(b => {
            const isIdle = b.getAttribute("data-shm-stanim") === "idle";
            b.style.borderColor = isIdle ? "#d9b062" : "";
            b.style.color = isIdle ? "#ffe0a0" : "";
          });
        }, an === "ult_combo" ? 1150 : 820);
      }
    };
  });
  root.querySelectorAll(".shm-prx-interactive").forEach(panel => {
    panel.addEventListener("pointermove", ev => {
      const r = panel.getBoundingClientRect();
      const nx = ((ev.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      const ny = ((ev.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
      panel.style.setProperty("--prx-x", (nx * 22).toFixed(2) + "px");
      panel.style.setProperty("--prx-y", (ny * 14).toFixed(2) + "px");
    });
    panel.addEventListener("pointerleave", () => {
      panel.style.setProperty("--prx-x", "0px");
      panel.style.setProperty("--prx-y", "0px");
    });
  });

  const stRange = document.getElementById("shmStudioAngleRange");
  if (stRange) {
    stRange.oninput = () => {
      SHM.studioAngle = parseInt(stRange.value, 10) || 25;
      renderSahmeranApp();
    };
  }

  if (!SHM_KEYS_BOUND && typeof window !== "undefined") {
    SHM_KEYS_BOUND = true;
    window.addEventListener("keydown", (ev) => {
      if (!SHM.open) return;
      if (ev.code === "Escape") {
        closeSahmeranApp();
        return;
      }
      SHM.keys[ev.code] = true;

      if (SHM.screen === "battle") {
        const introOv = typeof document !== "undefined" ? document.getElementById("shmComicClashOverlay") : null;
        if (introOv && !introOv.classList.contains("out") && (ev.code === "Space" || ev.code === "Enter")) {
          ev.preventDefault();
          dismissBossEntranceComic();
          return;
        }
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(ev.code)) {
          ev.preventDefault();
        }
        if (ev.code === "Space" && SHM.turn === "player" && !SHM.charging) {
          SHM.charging = true;
          SHM.power = 8;
          SHM.powerDir = 1;
          SHM.cam.manualPan = false;
          SHM.cam.mode = "follow";
        } else if (ev.code === "Tab" || ev.code === "KeyC") {
          SHM.cam.mode = SHM.cam.mode === "boss" ? "follow" : "boss";
          SHM.cam.manualPan = false;
        } else if (ev.code === "KeyZ") {
          SHM.cam.mode = SHM.cam.mode === "overview" ? "follow" : "overview";
          SHM.cam.manualPan = false;
        } else if (ev.code === "Digit1") toggleTopcuSkill("plus1");
        else if (ev.code === "Digit2") toggleTopcuSkill("plus2");
        else if (ev.code === "Digit3") toggleTopcuSkill("trident");
        else if (ev.code === "Digit4") toggleTopcuSkill("heavy");
        else if (ev.code === "Digit5") toggleTopcuSkill("crater");
        else if (ev.code === "KeyF") toggleTopcuSkill("teleport");
        else if (ev.code === "KeyQ") toggleTopcuSkill("shield");
        else if (ev.code === "KeyE") toggleTopcuSkill("heal");
        else if (ev.code === "KeyG") toggleTopcuSkill("anchor");
        else if (ev.code === "KeyR") toggleTopcuSkill("powUlt");
        else if (ev.code === "KeyP") {
          if (SHM.turn === "player" && SHM.player) {
            SHM.player.stamina = Math.min(SHM.player.maxStamina, SHM.player.stamina + 45);
            addFloatText(SHM.player.x, SHM.player.y - 90, "TUR PAS GEÇİLDİ (+45 NEFES ENERJİSİ)", "#d9b062", 17, true);
            advanceTurnAfterVolley();
          }
        }
      }
    });

    window.addEventListener("keyup", (ev) => {
      if (!SHM.open) return;
      SHM.keys[ev.code] = false;
      if (SHM.screen === "battle" && ev.code === "Space" && SHM.charging && SHM.turn === "player") {
        ev.preventDefault();
        firePlayerVolley(SHM.power);
      }
    });

    window.addEventListener("resize", () => {
      if (SHM.open && SHM.screen === "battle") {
        initBattleCanvasAndResize();
      }
    });
  }
}

function onRemoteDungeonCoopSync(msg) {
  if (!SHM.open || !msg) return;
  if (Array.isArray(SHM.coopUnits) && SHM.coopUnits.length > 0 && msg.from) {
    let cu = SHM.coopUnits.find(u => u.handle === msg.from);
    if (!cu) {
      cu = SHM.coopUnits[0];
      cu.handle = msg.from;
      cu.name = `Canlı Müttefik (${msg.from})`;
      cu.isLivePlayer = true;
    }
    if (msg.chibi) cu.chibi = msg.chibi;
    if (msg.el) cu.el = msg.el;
    if (msg.action === "fire" || msg.action === "boss_dmg") {
      cu.state = "attack";
      cu.animTimer = 36;
      const target = (SHM.boss && !SHM.boss.dead) ? SHM.boss : SHM.enemies.find(e => !e.dead);
      if (target) {
        const sx = cu.x + 28;
        const sy = cu.y - 54;
        const tx = target.x;
        const ty = target.y - (target === SHM.boss ? 160 : 50);
        const flightT = 36;
        const vx = ((tx - sx) / flightT) - 0.5 * SHM.wind * 0.0085 * flightT;
        const vy = ((ty - sy) / flightT) - 0.5 * SHM.GRAVITY * flightT;
        SHM.projectiles.push({
          owner: "player",
          isCoopVisual: true,
          x: sx,
          y: sy,
          vx,
          vy,
          el: cu.el || "buz",
          dmg: 0,
          blastRadius: 42,
          trail: []
        });
      }
    }
  }
  if (msg.action === "boss_dmg" && SHM.boss && !SHM.boss.dead && msg.dmg) {
    applyDamageToBoss(msg.dmg, false, `${msg.from || "MÜTTEFİK"} İSABETİ -${msg.dmg}`);
  }
}

function onRemoteLootWheelSpin(msg) {
  if (!msg) return;
  if (!Array.isArray(SHM.partyWheelFeed)) SHM.partyWheelFeed = [];
  SHM.partyWheelFeed.unshift({
    handle: msg.handle || "@müttefik",
    prize: msg.prize || "+350 Altın",
    badge: msg.badge || "ÇARK"
  });
  if (SHM.open && SHM.screen === "victory") {
    renderSahmeranApp();
  }
}

if (typeof window !== "undefined") {
  window.openAnimTestRoom = openAnimTestRoom;
  window.spinSahmeranLootWheel = spinSahmeranLootWheel;
  window.onRemoteDungeonCoopSync = onRemoteDungeonCoopSync;
  window.onRemoteLootWheelSpin = onRemoteLootWheelSpin;
}
if (typeof global !== "undefined") {
  global.openAnimTestRoom = openAnimTestRoom;
  global.spinSahmeranLootWheel = spinSahmeranLootWheel;
  global.renderSahmeranApp = renderSahmeranApp;
  global.respondToBossTaunt = respondToBossTaunt;
  global.renderComicScreen = renderComicScreen;
  global.triggerBossAttackComicCut = triggerBossAttackComicCut;
  global.openStageClearBlessingModal = openStageClearBlessingModal;
  global.onRemoteDungeonCoopSync = onRemoteDungeonCoopSync;
  global.onRemoteLootWheelSpin = onRemoteLootWheelSpin;
}
