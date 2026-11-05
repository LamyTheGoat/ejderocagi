/* ============================================================================
   ZİNDAN II · HARİTA 4/4: KALDERA İÇ MABEDİ (FİNAL BOSS: BAŞKOMUTAN KALGAROT)
   (js/minigame/raids/komutan/stage_4_sanctum.js)
   ============================================================================ */

registerRaidStageMap("komutan", ["kom_boss"], {
  stageNumber: 4,
  name: "Aşama 4 · Başkomutan Kalgarot (Final Boss)",

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
    const bossHp = Math.round((isEx ? 6600 : 4400) * diffMult);
    SHM.boss = {
      id: "kalgarot",
      isDragonCommander: true,
      name: isEx ? "MAVİ-KOR KIYAMET EJDERİ KALGAROT" : "BAŞKOMUTAN KALGAROT",
      title: isEx ? "Süpernova Kaldera Hükümdarı (5 Fazlı Devasa Boss)" : "Kül Yutan'ın Sağ Kolu · Dev Kara Kor Ejderi",
      x: 2680,
      y: SHM.heightMap[2680],
      targetX: 2680,
      facing: -1,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      maxPhase: isEx ? 5 : 3,
      phaseTitle: "OBSİDİYEN ZIRH & MAGMA NEFESİ",
      shield: isEx ? 380 : 0,
      stunned: 0,
      apocalypseCharge: 0,
      specialKey: null,
      state: "idle",
      stateTimer: 0,
      dead: false
    };
    SHM.enemies.push({
      id: "royal_drake_1",
      type: "drake",
      name: "Kaldera Muhafız Drake'i",
      hp: Math.round(680 * diffMult),
      maxHp: Math.round(680 * diffMult),
      x: 2040,
      y: SHM.heightMap[2040],
      facing: -1,
      state: "idle",
      animTimer: 0,
      dead: false
    });
    triggerActionPip(
      isEx ? "EKSTREM FİNAL (12/12) · 5 FAZLI DEV EJDERHA" : "AŞAMA 4 · DEV KARA KOR EJDERİ KALGAROT",
      SHM.boss.name,
      isEx ? "5 Fazlı Ekstrem Savaş: Gökyüzüne Havalanış & Meteor Dalışı, Kuyruk Depremi, Zincir Kasırgası ve Mavi-Kor Süpernova!" : "Göğsündeki Açık Kor Kalbini vurmak x2.7 Kritik Hasar verir!",
      isEx ? SHM_ASSETS_PATHS.kom_ex_ascended : SHM_ASSETS_PATHS.kom_closeup
    );
  },

  selectBossMove(b) {
    const movePool = b.phase >= 5
      ? ["supernova", "bluefire", "divebomb", "chainwhip"]
      : b.phase >= 4
      ? ["bluefire", "supernova", "tailslam"]
      : b.phase >= 3
      ? ["tailslam", "chainwhip", "supernova"]
      : b.phase >= 2
      ? ["tailslam", "divebomb", "chainwhip"]
      : ["divebomb", "tailslam", "chainwhip"];
    return movePool[SHM.stats.turnsTaken % movePool.length];
  },

  executeBossAttack(b, p, chosen, diffDmgMult) {
    b.targetX = 2460 + Math.round(Math.random() * 320);
    if (chosen === "divebomb" || chosen === "takeoff") {
      SHM.cam.shake = 7;
      SHM.shockwaves.push({ x: b.x - 110, y: b.y - 180, r: 16, maxR: 240, color: "#ef7f3e", alpha: 1 });
      launchBossMeteorRain(b, p, b.phase >= 3 ? 3 : 2, Math.round(185 * diffDmgMult), "magma", 58);
      launchAimedEnemyProjectile(b.x - 110, b.y - 280, p.x, p.y - 30, Math.round(205 * diffDmgMult), "magma", 62);
    } else if (chosen === "tailslam") {
      SHM.cam.shake = 7;
      SHM.shockwaves.push(
        { x: b.x - 120, y: b.y, r: 14, maxR: 290, color: "#ef7f3e", alpha: 1 },
        { x: b.x - 260, y: b.y, r: 10, maxR: 220, color: "#d9b062", alpha: 0.9 }
      );
      carveTerrainCrater(b.x - 190, b.y, 52);
      launchAimedEnemyProjectile(b.x - 95, b.y - 110, p.x - 32, p.y - 30, Math.round(180 * diffDmgMult), "magma", 56);
      launchAimedEnemyProjectile(b.x - 95, b.y - 110, p.x + 36, p.y - 30, Math.round(180 * diffDmgMult), "magma", 56);
    } else if (chosen === "chainwhip") {
      SHM.cam.shake = 6;
      SHM.laserBeams.push(
        { x1: b.x - 110, y1: b.y - 210, x2: p.x, y2: p.y - 48, color: "#ef7f3e", life: 40 },
        { x1: b.x - 110, y1: b.y - 165, x2: p.x + 28, y2: p.y - 24, color: "#d9b062", life: 36 }
      );
      launchAimedEnemyProjectile(b.x - 95, b.y - 185, p.x - 18, p.y - 30, Math.round(190 * diffDmgMult), "magma", 52);
      launchAimedEnemyProjectile(b.x - 95, b.y - 185, p.x + 24, p.y - 30, Math.round(190 * diffDmgMult), "magma", 52);
    } else {
      SHM.cam.shake = 7;
      SHM.shockwaves.push({ x: b.x - 110, y: b.y - 210, r: 18, maxR: 310, color: "#7eb8d8", alpha: 1 });
      SHM.laserBeams.push(
        { x1: b.x - 110, y1: b.y - 225, x2: p.x, y2: p.y - 42, color: "#7eb8d8", life: 42 },
        { x1: b.x - 110, y1: b.y - 190, x2: p.x - 24, y2: p.y - 22, color: "#d9b062", life: 38 }
      );
      launchBossMeteorRain(b, p, chosen === "supernova" ? 3 : 2, Math.round(195 * diffDmgMult), "bluekor", 56);
      launchAimedEnemyProjectile(b.x - 95, b.y - 210, p.x, p.y - 30, Math.round(205 * diffDmgMult), "bluekor", 56);
    }
    return true;
  }
});
