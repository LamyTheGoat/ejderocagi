/* ============================================================================
   ZİNDAN I · HARİTA 4/4: SIRÇA SARAY İÇ MABEDİ (FİNAL BOSS: YILAN KRALİÇE ŞAHMERAN)
   (js/minigame/raids/sahmeran/stage_4_sanctum.js)
   ============================================================================ */

registerRaidStageMap("sahmeran", ["sah_boss"], {
  stageNumber: 4,
  name: "Aşama 4 · Yılan Kraliçe Şahmeran (Final Boss)",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 860) y = 1025 + Math.sin(x * 0.012) * 16;
    else if (x < 1520) y = 1065 + Math.sin((x - 860) * 0.016) * 28;
    else if (x < 2180) y = 1020 - Math.sin(((x - 1520) / 660) * Math.PI) * 60;
    else if (x < 2420) y = 995 - ((x - 2180) / 240) * 95;
    else y = 900 + Math.sin((x - 2420) * 0.009) * 12;
    return Math.max(580, Math.min(1390, y));
  },

  spawnStage(preset, diffMult, isEx) {
    const bossHp = Math.round((isEx ? 5800 : 3600) * diffMult);
    SHM.boss = {
      id: "sahmeran",
      isDragonCommander: false,
      name: isEx ? "EBEDİ SIRÇA TANRIÇASI ŞAHMERAN" : "YILAN KRALİÇE ŞAHMERAN",
      title: isEx ? "Altı Kanatlı Sırça Hükümdarı (5 Fazlı Devasa Boss)" : "Sırça Saray'ın Ebedi Hükümdarı",
      x: 2680,
      y: SHM.heightMap[2680],
      targetX: 2680,
      facing: -1,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      maxPhase: isEx ? 5 : 3,
      phaseTitle: "SIRÇA SARAY'IN NÖBETİ",
      shield: isEx ? 300 : 0,
      stunned: 0,
      apocalypseCharge: 0,
      specialKey: null,
      state: "idle",
      stateTimer: 0,
      dead: false
    };
    SHM.enemies.push({
      id: "royal_cobra_1",
      type: "cobra",
      name: "Sırça Taht Muhafızı",
      hp: Math.round(640 * diffMult),
      maxHp: Math.round(640 * diffMult),
      x: 2060,
      y: SHM.heightMap[2060],
      facing: -1,
      state: "idle",
      animTimer: 0,
      dead: false
    });
    triggerActionPip(
      isEx ? "EKSTREM FİNAL (9/9) · 5 FAZLI DEVASA BOSS" : "FAZ I · SIRÇA SARAY'IN NÖBETİ",
      SHM.boss.name,
      isEx ? "5 Fazlı Ekstrem Savaş: Çifte Ölüm Işını, Zümrüt Asit Tufanı, Taşlaştırma Bakışı ve Altı Kanatlı Tanrıça Formu!" : "Başındaki Altın Tacı vurmak x2.5 Kritik Hasar verir!",
      isEx ? SHM_ASSETS_PATHS.sah_ex_ascended : SHM_ASSETS_PATHS.sah_closeup
    );
  },

  selectBossMove(b) {
    const movePool = b.phase >= 5
      ? ["ascended", "twinbeam", "meteor", "tsunami"]
      : b.phase >= 4
      ? ["meteor", "shed", "twinbeam"]
      : b.phase >= 3
      ? ["tsunami", "petrify", "twinbeam"]
      : b.phase >= 2
      ? ["twinbeam", "tsunami", "petrify"]
      : ["twinbeam", "tsunami", "meteor"];
    return movePool[SHM.stats.turnsTaken % movePool.length];
  },

  executeBossAttack(b, p, chosen, diffDmgMult, isEx) {
    b.targetX = 2460 + Math.round(Math.random() * 320);
    if (chosen === "twinbeam") {
      SHM.cam.shake = 6;
      SHM.laserBeams.push(
        { x1: b.x - 90, y1: b.y - 220, x2: p.x, y2: p.y - 52, color: "#9ad07a", life: 40 },
        { x1: b.x - 90, y1: b.y - 175, x2: p.x, y2: p.y - 28, color: "#d9b062", life: 40 }
      );
      launchAimedEnemyProjectile(b.x - 85, b.y - 195, p.x - 20, p.y - 30, Math.round(185 * diffDmgMult), "venom", 48);
      launchAimedEnemyProjectile(b.x - 85, b.y - 195, p.x + 22, p.y - 30, Math.round(185 * diffDmgMult), "venom", 48);
    } else if (chosen === "tsunami") {
      SHM.cam.shake = 6;
      SHM.waterRaise = Math.min(48, (SHM.waterRaise || 0) + (isEx ? 12 : 8));
      SHM.shockwaves.push({ x: b.x - 95, y: b.y - 120, r: 16, maxR: 260, color: "#9ad07a", alpha: 1 });
      launchAimedEnemyProjectile(b.x - 85, b.y - 185, p.x - 26, p.y - 30, Math.round(175 * diffDmgMult), "venom", 52);
      launchAimedEnemyProjectile(b.x - 85, b.y - 185, p.x + 26, p.y - 30, Math.round(175 * diffDmgMult), "venom", 52);
    } else if (chosen === "petrify") {
      SHM.cam.shake = 5;
      SHM.laserBeams.push({ x1: b.x - 88, y1: b.y - 210, x2: p.x, y2: p.y - 46, color: "#d9b062", life: 38 });
      const C = typeof ensureChibi === "function" ? ensureChibi() : null;
      const immune = (C && C.eq && C.eq.hat === "hat_11") || p.shield > 0;
      if (!immune) {
        p.stamina = Math.max(25, p.stamina - 35);
        addFloatText(p.x, p.y - 105, "TAŞLAŞTIRMA BAKIŞI (-35 ENERJİ)!", "#7ab05a", 19, true);
      } else {
        addFloatText(p.x, p.y - 105, "TAŞLAŞTIRMA BAKIŞI ENGELLENDİ!", "#d9b062", 19, true);
      }
      launchAimedEnemyProjectile(b.x - 85, b.y - 185, p.x, p.y - 30, Math.round(175 * diffDmgMult), "venom", 48);
    } else if (chosen === "shed") {
      b.shield += Math.round(260 * diffDmgMult);
      b.hp = Math.min(b.maxHp, b.hp + Math.round(300 * diffDmgMult));
      SHM.shockwaves.push({ x: b.x, y: b.y - 180, r: 14, maxR: 240, color: "#9ad07a", alpha: 1 });
      addFloatText(b.x, b.y - 310, `DERİ DEĞİŞİMİ (+${Math.round(300 * diffDmgMult)} HP & +${Math.round(260 * diffDmgMult)} KALKAN)`, "#9ad07a", 20, true);
      launchAimedEnemyProjectile(b.x - 85, b.y - 185, p.x - 20, p.y - 30, Math.round(170 * diffDmgMult), "venom", 46);
      launchAimedEnemyProjectile(b.x - 85, b.y - 185, p.x + 20, p.y - 30, Math.round(170 * diffDmgMult), "venom", 46);
    } else {
      SHM.cam.shake = 6;
      SHM.laserBeams.push({ x1: b.x - 90, y1: b.y - 235, x2: p.x, y2: p.y - 42, color: "#d9b062", life: 40 });
      launchBossMeteorRain(b, p, chosen === "ascended" ? 3 : 2, Math.round(185 * diffDmgMult), "toprak", 54);
      launchAimedEnemyProjectile(b.x - 85, b.y - 220, p.x, p.y - 30, Math.round(190 * diffDmgMult), "toprak", 52);
    }
    return true;
  }
});
