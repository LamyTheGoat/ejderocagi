/* ============================================================================
   ZİNDAN III · HARİTA 3/4: BATIK TERSANE MAHZENİ (ARA-BOSS: DALGIÇ & MERCAN GOLEMİ)
   (js/minigame/raids/abra/stage_3_golem.js)
   ============================================================================ */

registerRaidStageMap("abra", ["abra_3_subboss"], {
  stageNumber: 3,
  name: "Aşama 3 · Batık Tersane Mahzeni (Ara-Boss)",

  computeTerrainY(x) {
    let y = 1455;
    if (x < 880) y = 978 + Math.sin(x * 0.006) * 8;
    else if (x < 1760) y = 968 + Math.cos((x - 880) * 0.006) * 8;
    else if (x < 2850) y = 958 + Math.sin((x - 1760) * 0.005) * 6;
    return Math.max(580, Math.min(1460, y));
  },

  paintTerrain(tctx, hMap, W, H) {
    const t3 = SHM_IMAGES.abraTerStage3;
    if (t3 && t3.complete && t3.naturalWidth > 0) {
      tctx.drawImage(t3, 40, 885, 1440, 485);
      tctx.drawImage(t3, 1440, 870, 1480, 500);
    } else {
      RAID_PLUGINS.abra.bindAbraTerLoad(t3);
      RAID_PLUGINS.abra.fillFallbackSeaTerrain(tctx, hMap, W, H, "#164e63");
    }
  },

  spawnStage(preset, diffMult) {
    const golemHp = Math.round(2200 * diffMult);
    SHM.boss = {
      id: "sub_coral_golem",
      isSubBoss: true,
      isCoralGolem: true,
      subType: "coral_golem",
      name: "MODÜLER DALGIÇ & MERCAN GOLEMİ",
      title: "Batık Tersane Mahzeni Muhafızı (Ara-Boss)",
      x: 2260,
      y: SHM.heightMap[2260],
      targetX: 2260,
      facing: -1,
      hp: golemHp,
      maxHp: golemHp,
      phase: 1,
      maxPhase: 2,
      phaseTitle: "ÇAPA DEPREMİ & ABİSAL TOP KOLU",
      shield: 200,
      stunned: 0,
      cannonJammed: 0,
      golemAttackType: "cannon",
      apocalypseCharge: 0,
      state: "idle",
      stateTimer: 0,
      dead: false
    };
    triggerActionPip(
      "AŞAMA 3/4 · ARA-BOSS: BATIK TERSANE MAHZENİ",
      "Modüler Dalgıç & Mercan Golemi!",
      "Göğüs zırhı %30 hasar azaltır; başındaki Pirinç Dalgıç Miğferi Camına (Lumbuz) isabet ettirerek 2.0× Kritik Hasar vur ve top-kolunu 1 tur kilitle!",
      SHM_ASSETS_PATHS.abraGolemBody
    );
  },

  checkBossProjectileHit(pr, b) {
    if (b.subType !== "coral_golem") return false;
    const portholeX = b.x - 10;
    const portholeY = b.y - 196;
    const distPorthole = Math.hypot(pr.x - portholeX, pr.y - portholeY);
    const inPortholeBox = distPorthole <= 62 || (Math.abs(pr.x - b.x) <= 78 && pr.y >= b.y - 252 && pr.y <= b.y - 152);
    const inBodyBox = Math.abs(pr.x - b.x) <= 112 && pr.y >= b.y - 152 && pr.y <= b.y + 20;
    if (inPortholeBox) {
      const finalDmg = Math.round(pr.dmg * 2.0);
      b.cannonJammed = 1;
      SHM.stats.crownHits++;
      SHM.stats.curCombo++;
      SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
      SHM.cam.impactHoldTimer = 28;
      SHM.cam.impactX = pr.x;
      SHM.cam.impactY = pr.y;
      applyDamageToBoss(finalDmg, true, `🎯 MİĞFER CAMI (LUMBUZ) KRİTİĞİ! x2.0 & TOP KİLİTLENDİ! (-${finalDmg})`);
      setBossWorldBubble(b, "Gözetleme camım çatladı! Top-kolum su kaçırıyor, ateşleme kilitlendi!", { sfx: "KRİTİK İSABET!!", color: "#38bdf8", duration: 165 });
      SHM.freezeFrames = 9;
      SHM.cam.shake = 22;
      spawnExplosionParticles(pr.x, pr.y, "#38bdf8", 40);
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 10, maxR: 145, color: "#fde047", alpha: 1 });
      if (typeof SFX !== "undefined" && SFX.play) {
        SFX.play("crown_crit");
        SFX.play("crit");
      }
      return true;
    }
    if (inBodyBox) {
      const reducedDmg = Math.round(pr.dmg * 0.70);
      SHM.stats.curCombo++;
      SHM.stats.maxCombo = Math.max(SHM.stats.maxCombo, SHM.stats.curCombo);
      SHM.cam.impactHoldTimer = 24;
      SHM.cam.impactX = pr.x;
      SHM.cam.impactY = pr.y;
      applyDamageToBoss(reducedDmg, pr.armorPierce, `🛡️ MERCAN GÖĞÜS ZIRHI (-%30) -${reducedDmg} (MİĞFER CAMINI VUR!)`);
      SHM.freezeFrames = 5;
      SHM.cam.shake = 14;
      spawnExplosionParticles(pr.x, pr.y, "#38bdf8", 28);
      SHM.shockwaves.push({ x: pr.x, y: pr.y, r: 8, maxR: 105, color: "#38bdf8", alpha: 1 });
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("hit");
      return true;
    }
    return false;
  },

  selectBossMove() {
    return "sub_coral_golem_slam";
  },

  executeBossAttack(b, p, chosen, diffDmgMult) {
    SHM.cam.shake = 6;
    const jammed = (b.cannonJammed || 0) > 0;
    if (jammed) {
      b.cannonJammed--;
      addFloatText(b.x, b.y - 245, "⚙️ TOP KOLU TUTUKLUK YAPTI! SADECE ÇAPA DARBESİ!", "#5eead4", 18, true);
    }
    const useAnchor = jammed || (SHM.stats.turnsTaken % 2 === 1);
    b.golemAttackState = { type: useAnchor ? "anchor" : "cannon", timer: 64, maxTimer: 64 };
    SHM.abraActiveVfx = SHM.abraActiveVfx || [];
    if (useAnchor) {
      SHM.abraActiveVfx.push({ type: "deck_slam", x: p.x, y: p.y + 8, timer: 42, maxTimer: 42 });
      SHM.shockwaves.push({ x: b.x - 95, y: b.y, r: 14, maxR: 250, color: "#38bdf8", alpha: 1 });
      launchAimedEnemyProjectile(b.x - 65, b.y - 135, p.x, p.y - 30, Math.round(170 * diffDmgMult), "buz", 52, { isCoralLance: true, arcH: 155 });
    } else {
      launchAimedEnemyProjectile(b.x - 65, b.y - 145, p.x - 24, p.y - 30, Math.round(165 * diffDmgMult), "buz", 48, { isAbyssalOrb: true, arcH: 175 });
      launchAimedEnemyProjectile(b.x - 65, b.y - 145, p.x + 26, p.y - 30, Math.round(165 * diffDmgMult), "firtina", 48, { isAbyssalOrb: true, arcH: 195 });
    }
    return true;
  },

  renderBoss(ctx, b, brx, bossBobY, bossLungeX, tSec) {
    if (!b.isSubBoss || b.subType !== "coral_golem") return false;
    let gAtk = null;
    if (b.golemAttackState && b.golemAttackState.timer > 0) {
      b.golemAttackState.timer--;
      gAtk = {
        type: b.golemAttackState.type,
        progress: Math.max(0, Math.min(1, 1 - b.golemAttackState.timer / (b.golemAttackState.maxTimer || 64)))
      };
    }
    drawModularGolem(ctx, SHM_IMAGES, b.x + brx, b.y - 122 + bossBobY, 1.05, tSec, gAtk);
    ctx.restore();
    return true;
  },

  renderWeakSpotReticle(ctx, b, now) {
    if (!((SHM.charging && SHM.turn === "player") || b.tauntExposed)) return false;
    if (b.subType !== "coral_golem") return false;
    const crownX = b.x - 14;
    const crownY = b.y - 172;
    ctx.save();
    ctx.strokeStyle = b.tauntExposed ? "rgba(94, 234, 212, 0.96)" : "rgba(255, 224, 160, 0.9)";
    ctx.lineWidth = b.tauntExposed ? 3.2 : 2.4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(crownX, crownY, b.tauntExposed ? 34 + Math.sin((now || 0) * 0.015) * 4 : 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "900 10px sans-serif";
    ctx.fillStyle = "#fde047";
    ctx.textAlign = "center";
    ctx.fillText("🎯 2.0x", crownX, crownY - 34);
    ctx.restore();
    return true;
  }
});
