/* ============================================================================
   ZİNDAN I · HARİTA 3/4: SIRÇA KRİSTAL MAHZENİ (ARA-BOSS: SIRÇA GOLEM & RAHİBE)
   (js/minigame/raids/sahmeran/stage_3_vault.js)
   ============================================================================ */

registerRaidStageMap("sahmeran", ["sah_ex_3_subboss", "sah_ex_5_subboss", "sah_ex_7", "sah_ex_8"], {
  stageNumber: 3,
  name: "Aşama 3 · Sırça Kristal Mahzeni (Ara-Boss)",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 800) y = 1015 + Math.sin(x * 0.012) * 18;
    else if (x < 1620) y = 1050 - Math.sin(((x - 800) / 820) * Math.PI) * 68;
    else if (x < 2380) y = 995 + Math.sin((x - 1620) * 0.015) * 28;
    else y = 915 + Math.cos((x - 2380) * 0.012) * 18;
    return Math.max(580, Math.min(1390, y));
  },

  spawnStage(preset, diffMult) {
    if (preset === "sah_ex_5_subboss") {
      SHM.boss = {
        id: "sub_oracle",
        isSubBoss: true,
        subType: "oracle",
        name: "SIRÇA ENGEREK BAŞRAHİBESİ",
        title: "Zehirli Buhurdan Kahini (Ara-Boss II)",
        x: 2580,
        y: SHM.heightMap[2580],
        targetX: 2580,
        facing: -1,
        hp: Math.round(2900 * diffMult),
        maxHp: Math.round(2900 * diffMult),
        phase: 1,
        maxPhase: 3,
        phaseTitle: "ZEHİR NOVASI & KEHANET LANETİ",
        shield: 200,
        stunned: 0,
        apocalypseCharge: 0,
        state: "idle",
        stateTimer: 0,
        dead: false
      };
      SHM.enemies.push({
        id: "oracle_guard",
        type: "cobra",
        name: "Tapınak Muhafızı",
        hp: 640,
        maxHp: 640,
        x: 1880,
        y: SHM.heightMap[1880],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      });
      triggerActionPip("ARA-BOSS II · AŞAMA 5/9", "Sırça Engerek Başrahibesi!", "Başrahibe her tur Zehir Novası savurur — kalkanını kırıp kritik vur!", SHM_ASSETS_PATHS.sub_oracle_1);
    } else {
      SHM.boss = {
        id: "sub_sirca_golem",
        isSubBoss: true,
        subType: "sirca_golem",
        name: "SIRÇA KRİSTAL YILAN-GOLEMİ",
        title: "Camasb'ın Mahzen Muhafızı (Ara-Boss I)",
        x: 2560,
        y: SHM.heightMap[2560],
        targetX: 2560,
        facing: -1,
        hp: Math.round(2600 * diffMult),
        maxHp: Math.round(2600 * diffMult),
        phase: 1,
        maxPhase: 3,
        phaseTitle: "KRİSTAL ZIRH & YILAN YUMRUĞU",
        shield: 250,
        stunned: 0,
        apocalypseCharge: 0,
        state: "idle",
        stateTimer: 0,
        dead: false
      };
      SHM.enemies.push({
        id: "golem_cobra",
        type: "cobra",
        name: "Mahzen Nöbetçisi",
        hp: 620,
        maxHp: 620,
        x: 1840,
        y: SHM.heightMap[1840],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      });
      triggerActionPip("ARA-BOSS I · AŞAMA 3", "Sırça Kristal Yılan-Golemi!", "Devasa Kristal Golem mahzen geçidini tutuyor — baş bölgesine nişan al!", SHM_ASSETS_PATHS.sub_sirca_golem_1);
    }
  },

  selectBossMove(b) {
    return b.subType === "sirca_golem" ? "sub_golem_quake" : "sub_oracle_curse";
  },

  executeBossAttack(b, p, chosen, diffDmgMult) {
    if (b.subType === "sirca_golem") {
      SHM.cam.shake = 6;
      SHM.shockwaves.push({ x: b.x - 80, y: b.y, r: 12, maxR: 230, color: "#9ad07a", alpha: 1 });
      carveTerrainCrater(b.x - 140, b.y, 42);
      launchAimedEnemyProjectile(b.x - 65, b.y - 135, p.x - 22, p.y - 30, Math.round(165 * diffDmgMult), "toprak", 48);
      launchAimedEnemyProjectile(b.x - 65, b.y - 135, p.x + 28, p.y - 30, Math.round(165 * diffDmgMult), "venom", 48);
    } else {
      SHM.cam.shake = 5;
      SHM.laserBeams.push({ x1: b.x - 60, y1: b.y - 150, x2: p.x, y2: p.y - 42, color: "#9ad07a", life: 36 });
      launchAimedEnemyProjectile(b.x - 65, b.y - 145, p.x - 20, p.y - 30, Math.round(170 * diffDmgMult), "venom", 46);
      launchAimedEnemyProjectile(b.x - 65, b.y - 145, p.x + 24, p.y - 30, Math.round(170 * diffDmgMult), "venom", 46);
    }
    return true;
  }
});
