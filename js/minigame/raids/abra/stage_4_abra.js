/* ============================================================================
   ZİNDAN III · HARİTA 4/4: ÜÇE BÖLÜNMÜŞ SELÇUKLU KADIRGASI (FİNAL BOSS: DERYA YILANI ABRA)
   (js/minigame/raids/abra/stage_4_abra.js)
   ============================================================================ */

function getAbraTailAnchor(b) {
  const x = Math.max(1830, (b.anchorX || 2020) - 175); // boynun solunda, kıç kasarasının (x=1750) arkasındaki açık suda
  const rise = b.tailRise || 0;                         // 0 = batık, 1 = tam yükselmiş
  const finH = 290;
  const waterline = b.waterlineY || 1238;
  const baseY = waterline + 40 + (1 - rise) * (finH + 60);
  return { x, baseY, topY: baseY - finH, finH, visible: rise > 0.05 };
}

function pickAbraTarget() {
  const aliveTargets = [];
  if (SHM.player && SHM.player.hp > 0) {
    aliveTargets.push(SHM.player);
  }
  if (Array.isArray(SHM.coopUnits)) {
    for (const cu of SHM.coopUnits) {
      if (cu && cu.hp > 0) {
        aliveTargets.push(cu);
      }
    }
  }
  if (aliveTargets.length === 0) return SHM.player;
  return aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
}

registerRaidStageMap("abra", ["abra_boss"], {
  stageNumber: 4,
  name: "Aşama 4 · Derya Yılanı Abra (Final Boss)",

  computeTerrainY(x) {
    let y = 1455;
    if (x >= 165 && x <= 595) {
      // Pruva (Bow) güvertesi
      const u = Math.max(0, Math.min(1, (595 - x) / 430));
      y = 962 - u * 44;
    } else if (x > 595 && x < 810) {
      // 1. Kırık Gemi Boşluğu (215px genişliğinde açık deniz yarığı!)
      y = 1455;
    } else if (x >= 810 && x <= 1205) {
      // Orta Gövde (Mid) güvertesi
      y = 962 + Math.sin((x - 810) * 0.015) * 3;
    } else if (x > 1205 && x < 1410) {
      // 2. Kırık Gemi Boşluğu (205px genişliğinde açık deniz yarığı!)
      y = 1455;
    } else if (x >= 1410 && x <= 1835) {
      // Kıç Kasarası (Stern) güvertesi
      const u = Math.max(0, Math.min(1, (x - 1410) / 425));
      y = 962 - u * 36;
    }
    return Math.max(580, Math.min(1460, y));
  },

  paintTerrain(tctx, hMap, W, H) {
    const sBow = SHM_IMAGES.abraShipBow;
    const sMid = SHM_IMAGES.abraShipMid;
    const sStern = SHM_IMAGES.abraShipStern;
    if (
      sBow && sBow.complete && sBow.naturalWidth > 0 &&
      sMid && sMid.complete && sMid.naturalWidth > 0 &&
      sStern && sStern.complete && sStern.naturalWidth > 0
    ) {
      // Kırık gemi parçalarının arası genişletildi (180px açık deniz kanalları):
      tctx.drawImage(sBow, 150, 815, 460, 465);
      tctx.drawImage(sMid, 790, 765, 430, 515);
      tctx.drawImage(sStern, 1395, 765, 455, 515);
    } else {
      [sBow, sMid, sStern].forEach(RAID_PLUGINS.abra.bindAbraTerLoad);
      RAID_PLUGINS.abra.fillFallbackSeaTerrain(tctx, hMap, W, H, "#5c3a21");
    }
  },

  spawnStage(preset, diffMult, isEx) {
    const bossHp = Math.round((isEx ? 6400 : 4800) * diffMult);
    SHM.boss = {
      id: "abra",
      isAbra: true,
      isDragonCommander: false,
      name: isEx ? "ABİSAL LEVIATHAN HÜKÜMDARI ABRA" : "DERYA YILANI ABRA",
      title: "Batık Donanma Muhafızı · Kadim Derya Leviathanı",
      x: 2040,
      y: 1020,
      targetX: 2040,
      anchorX: 2040,
      waterlineY: 1238,
      headTargetY: 760,
      submerge: 1,
      submergeTarget: 0,
      tailRise: 0,
      tailRiseTarget: 0,
      facing: -1,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      maxPhase: 3,
      phaseTitle: "FAZ I · ABİSAL KÜKREME & SÖNÜMLENEN TSUNAMİ",
      shield: isEx ? 320 : 0,
      stunned: 0,
      staggerTurns: 0,
      staggerImmuneTurns: 0,
      lastTailHitTurn: -1,
      mustActNext: false,
      tailHits: 0,
      tailDamageAccum: 0,
      tailExposed: false,
      submergedState: null,
      boilX: 980,
      boilY: 962,
      abraHeadKey: "abraHeadIdle",
      apocalypseCharge: 0,
      specialKey: null,
      state: "entrance_roar",
      stateTimer: 120,
      dead: false
    };

    // Giriş (Denizden Yükseliş): submerge 1 -> 0, başlangıçta splash + geyser + shake
    SHM.abraActiveVfx = SHM.abraActiveVfx || [];
    SHM.abraActiveVfx.push({ type: "dive", x: SHM.boss.anchorX - 30, y: SHM.boss.waterlineY - 10, timer: 50, maxTimer: 50 });
    SHM.abraActiveVfx.push({ type: "geyser", x: SHM.boss.anchorX, y: SHM.boss.waterlineY - 20, timer: 54, maxTimer: 54 });
    SHM.cam.shake = 10;

    triggerActionPip(
      "AŞAMA 4/4 · FİNAL BOSS: ÜÇE BÖLÜNMÜŞ KALYON",
      SHM.boss.name,
      "Abra tsunami attığında Fosforlu Kuyruk Yüzgeci 1 tur yüzeye çıkar — 2 isabetle 1 tur SERSEMLET!",
      SHM_ASSETS_PATHS.abraPortrait
    );
  },

  checkBossProjectileHit(pr, b) {
    if (!b.isAbra) return false;
    const isSubmerged = (b.submerge || 0) > 0.55;

    const t = getAbraTailAnchor(b);
    const hitTailFin = t.visible && !isSubmerged &&
      Math.abs(pr.x - t.x) <= 58 &&
      pr.y >= t.topY + 20 &&
      pr.y <= b.waterlineY - 10;

    const headX = b._renderedHeadX != null ? b._renderedHeadX : (b.anchorX - 30);
    const headY = b._renderedHeadY != null ? b._renderedHeadY : b.headTargetY;
    const hitHead = !isSubmerged && Math.hypot(pr.x - headX, pr.y - headY) <= 92;

    const swayAtY = (b._renderedSwayX || 0);
    const neckCenterX = b.anchorX + swayAtY;
    const hitNeck = !isSubmerged &&
      Math.abs(pr.x - neckCenterX) <= 70 &&
      pr.y >= headY + 60 &&
      pr.y <= b.waterlineY - 10;

    // Su altındayken mermiler su sıçratır ve hasarsız söner
    if (isSubmerged && (Math.abs(pr.x - b.anchorX) <= 180 || hitTailFin)) {
      addFloatText(pr.x, pr.y - 45, "🌊 ABRA SU ALTINDA!", "#38bdf8", 20, true);
      SHM.abraActiveVfx = SHM.abraActiveVfx || [];
      SHM.abraActiveVfx.push({ type: "dive", x: pr.x, y: b.waterlineY, timer: 30, maxTimer: 30 });
      spawnExplosionParticles(pr.x, pr.y, "#38bdf8", 18);
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
      return true;
    }

    const isStaggered = (b.staggerTurns || 0) > 0;

    if (hitTailFin) {
      const tailDmg = Math.round(pr.dmg * 1.35);
      b.tailDamageAccum = (b.tailDamageAccum || 0) + tailDmg;
      SHM.stats.crownHits++;
      SHM.stats.curCombo++;
      SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
      SHM.cam.impactHoldTimer = 28;
      SHM.cam.impactX = pr.x;
      SHM.cam.impactY = pr.y;

      const curTurn = (SHM.stats && SHM.stats.turnsTaken) || 0;
      if (b.staggerImmuneTurns > 0) {
        applyDamageToBoss(tailDmg, true, `🎯 KUYRUK İSABETİ (-${tailDmg}) (🛡️ SERSEMLEMEYE DİRENÇLİ: ${b.staggerImmuneTurns}T)`);
      } else {
        if (b.lastTailHitTurn !== curTurn) {
          b.lastTailHitTurn = curTurn;
          b.tailHits = (b.tailHits || 0) + 1;
        }
        if (b.tailHits >= 2) {
          b.staggerTurns = 1;
          b.abraHeadKey = "abraHeadStagger";
          b.tailHits = 0;
          b.tailDamageAccum = 0;
          applyDamageToBoss(tailDmg, true, `💥 KUYRUK YÜZGEÇLERİ KIRILDI! ABRA 1 TUR SERSEMLEDİ (STAGGER)! (-${tailDmg})`);
          setBossWorldBubble(b, "Fosforlu kuyruk yüzgeçlerim... Dengem bozuldu, güverteye çöküyorum!", { sfx: "STAGGER (1 TUR)!!", color: "#fde047", duration: 220 });
        } else {
          applyDamageToBoss(tailDmg, true, `🎯 FOSFORLU KUYRUK İSABETİ (${b.tailHits}/2 -> STAGGER!) (-${tailDmg})`);
        }
      }

      SHM.freezeFrames = 9;
      SHM.cam.shake = 24;
      spawnExplosionParticles(pr.x, pr.y, "#38bdf8", 42);
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 10, maxR: 155, color: "#38bdf8", alpha: 1 });
      if (typeof SFX !== "undefined" && SFX.play) {
        SFX.play("crown_crit");
        SFX.play("crit");
      }
      return true;
    }

    if (hitHead || (isStaggered && hitNeck)) {
      const mult = isStaggered ? 2.0 : 1.4;
      const finalDmg = Math.round(pr.dmg * mult);
      SHM.stats.crownHits++;
      SHM.stats.curCombo++;
      SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
      SHM.cam.impactHoldTimer = 28;
      SHM.cam.impactX = pr.x;
      SHM.cam.impactY = pr.y;
      const lbl = isStaggered
        ? `💥 SERSEMLEMİŞ ABRA BAŞ KRİTİĞİ! x2.0 (-${finalDmg})`
        : `🎯 ABRA BAŞ İSABETİ x1.4 (-${finalDmg})`;
      applyDamageToBoss(finalDmg, true, lbl);
      SHM.freezeFrames = isStaggered ? 10 : 7;
      SHM.cam.shake = isStaggered ? 26 : 18;
      spawnExplosionParticles(pr.x, pr.y, "#fde047", 44);
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 10, maxR: 160, color: "#fde047", alpha: 1 });
      if (typeof SFX !== "undefined" && SFX.play) {
        SFX.play("crown_crit");
        SFX.play("crit");
      }
      return true;
    }

    if (hitNeck) {
      const bodyDmg = Math.round(pr.dmg * 0.70);
      SHM.stats.curCombo++;
      SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
      SHM.cam.impactHoldTimer = 24;
      SHM.cam.impactX = pr.x;
      SHM.cam.impactY = pr.y;
      applyDamageToBoss(bodyDmg, pr.armorPierce, `🛡️ LEVIATHAN PUL ZIRHI (-%30) -${bodyDmg} (KUYRUK YÜZGEÇLERİNİ VUR!)`);
      SHM.freezeFrames = 5;
      SHM.cam.shake = 14;
      spawnExplosionParticles(pr.x, pr.y, "#38bdf8", 28);
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 8, maxR: 110, color: "#38bdf8", alpha: 1 });
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
      return true;
    }

    return false;
  },

  onBossPhaseCheck(b, hpRatio) {
    if (!b.isAbra) return false;
    if (b.phase === 1 && hpRatio <= 0.70 && b.hp > 0) {
      b.phase = 2;
      b.shield = 280;
      b.phaseTitle = "SUYA DALIŞ & ABİSAL ŞİMŞEK ISIRIĞI";
      b.specialKey = "abra_dive";
      b.stateTimer = 85;
      b.abraHeadKey = "abraHeadRoar";
      b.forceTauntNext = true; // Faz geçişinde 1 kez laf atma hakkı
      SHM.cam.shake = 18;
      SHM.abraActiveVfx = SHM.abraActiveVfx || [];
      SHM.abraActiveVfx.push({ type: "dive", x: b.anchorX - 45, y: b.waterlineY - 10, timer: 44, maxTimer: 44 });
      triggerActionPip(
        "FAZ II/3 · SUYA DALIŞ & KAYNAMA TELEGRAPH",
        "Abra Suya Daldı — Güverte Altında Su Kaynıyor!",
        "Kaynama halkası belirdiğinde yürüyerek uzaklaş veya [G] Demir Çapa at!",
        SHM_ASSETS_PATHS.abraVfxDive
      );
      triggerBossAttackComicCut(b, "abra_dive");
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    } else if (b.phase <= 2 && hpRatio <= 0.40 && b.hp > 0) {
      b.phase = 3;
      b.shield = 320;
      b.phaseTitle = "FOSFORLU KUYRUK YÜZGEÇ ZAYIF NOKTASI!";
      b.specialKey = "abra_tsunami";
      b.stateTimer = 95;
      b.abraHeadKey = "abraHeadRoar";
      b.tailRiseTarget = 1; // Faz 3'te kuyruk sürekli yüzeyde
      b.forceTauntNext = true;
      SHM.cam.shake = 22;
      triggerActionPip(
        "FAZ III/3 · FOSFORLU KUYRUK YÜZGEÇ ZAYIF NOKTASI!",
        "Abra'nın Fosforlu Kuyruk Yüzgeci Sancak Kıçından Yükseldi!",
        "Kuyruk yüzgecine 2 isabet veya 450+ hasar vererek Abra'yı 1 tur STAGGER (2.0x Kafa Kritiği!) durumuna düşür!",
        SHM_ASSETS_PATHS.abraTailV2
      );
      triggerBossAttackComicCut(b, "abra_tsunami");
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("roar");
    }
    return true;
  },

  onBossTurnStart(b) {
    if (!b.isAbra) return false;

    // Stagger bağışıklık sayacını boss turu başında azalt
    if (b.staggerImmuneTurns > 0) {
      b.staggerImmuneTurns--;
    }

    // Görev 4.7: Kural — Abra arka arkaya en fazla 1 boss turu pas geçebilir
    if (b.mustActNext) {
      b.mustActNext = false;
      b.staggerTurns = 0;
      b.stunned = 0;
      b.abraHeadKey = "abraHeadIdle";
      return false; // Turu pas geçme, doğrudan hamle seçimine ve saldırıya git
    }

    if ((b.staggerTurns || 0) > 0) {
      b.staggerTurns--;
      b.mustActNext = true; // Pas geçildi, bir sonraki tur kesin saldıracak
      b.staggerImmuneTurns = 2; // Stagger bitişinde 2 tur bağışıklık
      b.abraHeadKey = b.staggerTurns > 0 ? "abraHeadStagger" : "abraHeadIdle";
      addFloatText(
        b.x,
        b.y - 310,
        b.staggerTurns > 0
          ? `💫 ABRA STAGGER DURUMUNDA! (2.0x KAFA KRİTİĞİ AÇIK · KALAN: ${b.staggerTurns}T)`
          : "ABRA SERSEMLİKTEN ÇIKTI! (🛡️ 2 TUR DİRENÇ KAZANDI)",
        "#5eead4",
        20,
        true
      );
      setTimeout(() => {
        SHM.bossActionBusy = false;
        SHM.cam.lockedUnit = null;
      }, SHM.fastSim ? 150 : 900);
      return true;
    }
    return false;
  },

  selectBossMove(b) {
    // Görev 2: Dalış turu başladıysa sonraki hamle zorunlu olarak emerge (çıkış)
    if (b.pendingEmerge) {
      b.pendingEmerge = false;
      return "abra_emerge";
    }

    const movePool = b.phase >= 3
      ? ["abra_tsunami", "abra_lightning", "abra_dive"]
      : b.phase >= 2
      ? ["abra_dive", "abra_lightning", "abra_tsunami"]
      : ["abra_tsunami", "abra_dive", "abra_lightning"];
    const chosen = movePool[SHM.stats.turnsTaken % movePool.length];
    return chosen;
  },

  executeBossAttack(b, p, chosen, diffDmgMult) {
    if (!b.isAbra) return false;
    b.abraHeadKey = "abraHeadRoar";
    SHM.abraActiveVfx = SHM.abraActiveVfx || [];
    SHM.activeTsunamis = SHM.activeTsunamis || [];

    const tgt = pickAbraTarget();

    if (chosen === "abra_tsunami") {
      SHM.cam.shake = 7;
      SHM.activeTsunamis.push({
        startX: b.anchorX - 80,
        travelDist: 1650,
        baseY: b.waterlineY - 20,
        maxW: 360,
        maxH: 255,
        timer: 0,
        maxTimer: 58,
        dmg: Math.round(165 * diffDmgMult),
        hitPlayer: false
      });
      // Görev 3.4: Tsunami sonrası 1 oyuncu turu boyunca kuyruk yüzeyde yükselir
      if (b.phase < 3) {
        b.tailRiseTarget = 1;
        b.tailExposedTurns = 1;
      }
      launchAimedEnemyProjectile(b.anchorX - 140, b.y - 250, tgt.x - 18, tgt.y - 30, Math.round(180 * diffDmgMult), "buz", 52, { isAbyssalOrb: true, arcH: 185 });
      launchAimedEnemyProjectile(b.anchorX - 140, b.y - 250, tgt.x + 24, tgt.y - 30, Math.round(175 * diffDmgMult), "firtina", 48, { isCoralLance: true, arcH: 165 });
    } else if (chosen === "abra_dive") {
      // Görev 2: Dalış Turu (Tur N) — Mermi yok, submergeTarget = 1, oyuncuya dangerZone & boil
      SHM.cam.shake = 8;
      b.submergeTarget = 1;
      b.pendingEmerge = true;
      SHM.abraActiveVfx.push({ type: "dive", x: b.anchorX - 40, y: b.waterlineY - 10, timer: 44, maxTimer: 44 });
      
      SHM.dangerZones = SHM.dangerZones || [];
      SHM.dangerZones.push({
        x: p.x,
        y: p.y,
        radius: 120,
        dmg: 230,
        el: "buz",
        label: "ABRA ALTTAN FIŞKIRACAK!"
      });
      SHM.abraActiveVfx.push({ type: "boil", x: p.x, y: b.waterlineY - 20, timer: 120, maxTimer: 120 });
      setBossWorldBubble(b, "Güvertenin altından fışkıracağım!", { sfx: "DERİN DALIŞ!!", color: "#38bdf8", duration: 240 });
    } else if (chosen === "abra_emerge") {
      // Görev 2: Çıkış Turu (Tur N+1) — Gayzer + yeni mevkide çıkış
      SHM.cam.shake = 10;
      const emergePositions = [1960, 2040, 2140];
      const otherPositions = emergePositions.filter(x => Math.abs(x - b.anchorX) > 40);
      b.anchorX = otherPositions[Math.floor(Math.random() * otherPositions.length)] || 2040;
      b.x = b.anchorX;
      b.targetX = b.anchorX;
      b.submergeTarget = 0;

      SHM.abraActiveVfx.push({ type: "geyser", x: b.anchorX, y: b.waterlineY - 15, timer: 48, maxTimer: 48 });
      SHM.abraActiveVfx.push({ type: "dive", x: b.anchorX - 30, y: b.waterlineY - 10, timer: 44, maxTimer: 44 });
      launchAimedEnemyProjectile(b.anchorX - 120, b.y - 240, tgt.x, tgt.y - 30, Math.round(175 * diffDmgMult), "buz", 48, { isCoralLance: true, arcH: 170 });
    } else {
      // abra_lightning
      SHM.cam.shake = 8;
      SHM.abraActiveVfx.push({ type: "lightning", x1: b.anchorX - 145, y1: b.y - 260, x2: tgt.x, y2: tgt.y - 38, timer: 42, maxTimer: 42 });
      SHM.abraActiveVfx.push({ type: "deck_slam", x: tgt.x, y: tgt.y + 8, timer: 42, maxTimer: 42 });
      launchAimedEnemyProjectile(b.anchorX - 140, b.y - 250, tgt.x - 16, tgt.y - 30, Math.round(190 * diffDmgMult), "firtina", 54, { isAbyssalOrb: true, arcH: 190 });
      launchAimedEnemyProjectile(b.anchorX - 140, b.y - 250, tgt.x + 22, tgt.y - 30, Math.round(180 * diffDmgMult), "buz", 48, { isCoralLance: true, arcH: 165 });
    }

    setTimeout(() => {
      if (b && !b.dead && (b.staggerTurns || 0) <= 0) {
        b.abraHeadKey = "abraHeadIdle";
      }
    }, 950);
    return true;
  },

  renderBoss(ctx, b, brx, bossBobY, bossLungeX, tSec) {
    if (!b.isAbra) return false;

    // Zamana bağlı submerge & tailRise güncellemesi (Görev 1.5)
    const dt = SHM._lastDt || 0.0166;
    if (b.submerge == null) b.submerge = 0;
    if (b.submergeTarget == null) b.submergeTarget = 0;
    const diffSub = b.submergeTarget - b.submerge;
    if (Math.abs(diffSub) > 0.001) {
      b.submerge += Math.sign(diffSub) * Math.min(Math.abs(diffSub), dt / 0.7);
    } else {
      b.submerge = b.submergeTarget;
    }

    // Faz 1-2 kuyruk süresi dolduysa batır
    if (b.phase < 3 && b.tailExposedTurns != null && b.tailExposedTurns <= 0) {
      b.tailRiseTarget = 0;
    }
    if (b.phase >= 3) {
      b.tailRiseTarget = (b.staggerTurns || 0) > 0 ? 0 : 1;
    }
    if ((b.staggerTurns || 0) > 0) {
      b.tailRiseTarget = 0; // Stagger sırasında batık
    }

    if (b.tailRise == null) b.tailRise = 0;
    const diffTail = (b.tailRiseTarget || 0) - b.tailRise;
    if (Math.abs(diffTail) > 0.001) {
      b.tailRise += Math.sign(diffTail) * Math.min(Math.abs(diffTail), dt / 0.6);
    } else {
      b.tailRise = b.tailRiseTarget || 0;
    }

    const anchorX = b.anchorX || 1920;
    const waterlineY = b.waterlineY || 1238;
    const headTargetY = b.headTargetY || 760;
    const neckBaseY = waterlineY + 48;
    const neckH = neckBaseY - headTargetY; // ~526 px
    const sinkY = b.submerge * (neckH + 120);

    // Su hattı kırpması: Su hattının altını kes (Görev 1.2)
    const camX = (SHM.cam && SHM.cam.x) || 0;
    const camZoom = (SHM.cam && SHM.cam.zoom) || 1;
    const cv = typeof document !== "undefined" ? document.getElementById("shmCanvas") : null;
    const viewW = cv ? cv.width / camZoom : SHM.WORLD_W;

    ctx.save();
    ctx.beginPath();
    ctx.rect(camX - 100, -2000, viewW + 200, waterlineY + 10 + 2000);
    ctx.clip();

    // 1. KUYRUK ÇİZİMİ (Tek kaynaklı getAbraTailAnchor)
    const tailAnchor = getAbraTailAnchor(b);
    if (tailAnchor.visible && b.submerge < 0.95) {
      const tailSway = [
        Math.sin(tSec * 2.4) * 14,
        Math.sin(tSec * 2.4 - 0.7) * 24,
        Math.sin(tSec * 2.4 - 1.4) * 34,
        Math.sin(tSec * 2.4 - 2.1) * 44
      ];
      drawSeamlessTail(ctx, SHM_IMAGES.abraTailV2, tailAnchor.x, tailAnchor.baseY + sinkY * 0.5, 175, tailAnchor.finH, tailSway, b.phase >= 3 ? 1.12 : 0.94);
    }

    // 2. BOYUN + KAFA ÇİZİMİ
    const isStaggered = (b.staggerTurns || 0) > 0;
    const swayAmp = isStaggered ? 18 : 26;
    const lungeShift = bossLungeX * 1.4;
    const bob = Math.sin(tSec * 2.8 + anchorX * 0.0052) * 10; // dalga senkron salınım

    const boneOffsetsX = [
      Math.sin(tSec * 1.9) * (swayAmp * 0.25) + lungeShift * 0.15,
      Math.sin(tSec * 1.9 - 0.5) * (swayAmp * 0.45) + lungeShift * 0.30,
      Math.sin(tSec * 1.9 - 1.0) * (swayAmp * 0.65) + lungeShift * 0.50,
      Math.sin(tSec * 1.9 - 1.5) * (swayAmp * 0.85) + lungeShift * 0.70,
      Math.sin(tSec * 1.9 - 2.0) * (swayAmp * 1.05) + lungeShift * 0.88,
      Math.sin(tSec * 1.9 - 2.5) * (swayAmp * 1.25) + lungeShift * 1.05
    ];
    b._renderedSwayX = boneOffsetsX[3]; // Orta boyun sway fallback

    const stretchY = isStaggered ? 0.78 : (1.0 + Math.sin(tSec * 2.2) * 0.04);
    const headKey = isStaggered
      ? "abraHeadStagger"
      : (b.state === "attack" || b.state === "windup" || b.state === "taunt" || b.state === "entrance_roar")
      ? "abraHeadRoar"
      : (b.abraHeadKey || "abraHeadIdle");
    const headImg = SHM_IMAGES[headKey] || SHM_IMAGES.abraHeadIdle;
    const headDeg = isStaggered ? -18 + Math.sin(tSec * 3.2) * 8 : (b.state === "attack" ? -12 : Math.sin(tSec * 1.8) * 5);

    const neckOriginY = neckBaseY + sinkY + bob;
    const headPos = drawSeamlessNeck(ctx, SHM_IMAGES.abraNeckTile, headImg, anchorX + brx, neckOriginY, 235, neckH, boneOffsetsX, stretchY, headDeg);
    b._renderedHeadX = headPos.x;
    b._renderedHeadY = headPos.y;

    // Görev 5.2: Abra filtre optimizasyonu
    // Hit flash: Kafa sprite'ı lighter modunda ikinci kez çizilir
    if (b.hitFlash > 0 && headImg && headImg.complete) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45;
      drawAbraPivot(ctx, headImg, headPos.x, headPos.y, 235 * 1.22, 235 * 0.95, 0.54, 0.62, headDeg);
      ctx.restore();
    }

    // Taunt/windup halesi: filtre yerine radyal gradyan çemberi
    if ((b.state === "windup" || b.state === "taunt" || b.state === "entrance_roar") && b.submerge < 0.8) {
      ctx.save();
      const haloGrad = ctx.createRadialGradient(headPos.x, headPos.y, 20, headPos.x, headPos.y, 140);
      haloGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
      haloGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(headPos.x, headPos.y, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // Clip bitişi

    if (isStaggered && b.submerge < 0.6) {
      drawOrbitingStunStars(ctx, headPos.x - 18, headPos.y - 54, tSec);
    }

    // Debug hitbox çizimi (window.__abraHitboxes = true)
    if (typeof window !== "undefined" && window.__abraHitboxes) {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.lineWidth = 2;
      // Head
      ctx.beginPath();
      ctx.arc(headPos.x, headPos.y, 92, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Neck
      ctx.strokeRect(anchorX + (b._renderedSwayX || 0) - 70, headPos.y + 60, 140, Math.max(10, waterlineY - 10 - (headPos.y + 60)));
      // Tail
      if (tailAnchor.visible) {
        ctx.strokeStyle = "rgba(45, 212, 191, 0.9)";
        ctx.fillStyle = "rgba(45, 212, 191, 0.2)";
        ctx.strokeRect(tailAnchor.x - 58, tailAnchor.topY + 20, 116, Math.max(10, waterlineY - 10 - (tailAnchor.topY + 20)));
        ctx.fillRect(tailAnchor.x - 58, tailAnchor.topY + 20, 116, Math.max(10, waterlineY - 10 - (tailAnchor.topY + 20)));
      }
      ctx.restore();
    }

    return true;
  },

  renderWeakSpotReticle(ctx, b, now) {
    if (!b.isAbra) return false;
    if (b.submerge > 0.55) return false;
    if (!((SHM.charging && SHM.turn === "player") || b.tauntExposed || (b.staggerTurns || 0) > 0)) return false;

    const crownX = b._renderedHeadX || (b.anchorX - 35);
    const crownY = (b._renderedHeadY || (b.headTargetY || 760)) - 12;
    ctx.save();
    ctx.strokeStyle = (b.tauntExposed || (b.staggerTurns || 0) > 0) ? "rgba(94, 234, 212, 0.96)" : "rgba(255, 224, 160, 0.9)";
    ctx.lineWidth = (b.tauntExposed || (b.staggerTurns || 0) > 0) ? 3.2 : 2.4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(crownX, crownY, (b.tauntExposed || (b.staggerTurns || 0) > 0) ? 34 + Math.sin((now || 0) * 0.015) * 4 : 28, 0, Math.PI * 2);
    ctx.stroke();
    if ((b.staggerTurns || 0) > 0) {
      ctx.font = "900 10.5px sans-serif";
      ctx.fillStyle = "#5eead4";
      ctx.textAlign = "center";
      ctx.fillText("💫 2.0x", crownX, crownY - 38);
    } else if (b.tauntExposed) {
      ctx.font = "900 10px sans-serif";
      ctx.fillStyle = "#d9b062";
      ctx.textAlign = "center";
      ctx.fillText("🎯 +35%", crownX, crownY - 36);
    }
    ctx.restore();

    // Görev 3.6: Kuyruk reticle getAbraTailAnchor (x, topY + finH * 0.45)'e ve sadece visible iken
    const t = getAbraTailAnchor(b);
    if (t.visible) {
      const rx = t.x;
      const ry = t.topY + t.finH * 0.45;
      ctx.save();
      ctx.strokeStyle = "rgba(45, 212, 191, 0.95)";
      ctx.lineWidth = 2.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(rx, ry, 32 + Math.sin((now || 0) * 0.014) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "900 10px sans-serif";
      ctx.fillStyle = "#5eead4";
      ctx.textAlign = "center";
      ctx.fillText("🎯 KUYRUK", rx, ry - 36);
      ctx.restore();
    }
    return true;
  }
});
