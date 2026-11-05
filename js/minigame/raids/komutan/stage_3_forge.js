/* ============================================================================
   ZİNDAN II · HARİTA 3/4: YIKIK EJDERHA ÖRSÜ (ARA-BOSS: MAGMA BEHEMOTH & ALFA WYVERN)
   (js/minigame/raids/komutan/stage_3_forge.js)
   ============================================================================ */

registerRaidStageMap("komutan", ["kom_ex_3_subboss", "kom_ex_6_subboss", "kom_ex_9_subboss", "kom_ex_10", "kom_ex_11"], {
  stageNumber: 3,
  name: "Aşama 3 · Yıkık Ejderha Örsü (Ara-Boss)",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 800) y = 1015 + Math.sin(x * 0.012) * 18;
    else if (x < 1620) y = 1050 - Math.sin(((x - 800) / 820) * Math.PI) * 68;
    else if (x < 2380) y = 995 + Math.sin((x - 1620) * 0.015) * 28;
    else y = 915 + Math.cos((x - 2380) * 0.012) * 18;
    return Math.max(580, Math.min(1390, y));
  },

  spawnStage(preset, diffMult) {
    if (preset === "kom_ex_6_subboss" || preset === "kom_ex_9_subboss") {
      SHM.boss = {
        id: "sub_alpha_wyvern",
        isSubBoss: true,
        subType: "alpha_wyvern",
        name: "KIZIL KASIRGA ALFA WYVERN",
        title: "Dört Kanatlı Fırtına Ejderi (Ara-Boss)",
        x: 2580,
        y: SHM.heightMap[2580],
        targetX: 2580,
        facing: -1,
        hp: Math.round(3200 * diffMult),
        maxHp: Math.round(3200 * diffMult),
        phase: 1,
        maxPhase: 3,
        phaseTitle: "ALEV HORTUMU & FIRTINA DALIŞI",
        shield: 240,
        stunned: 0,
        apocalypseCharge: 0,
        state: "idle",
        stateTimer: 0,
        dead: false
      };
      if (preset === "kom_ex_9_subboss") {
        SHM.enemies.push({
          id: "duo_behemoth",
          type: "behemoth",
          name: "Zırhlı Magma Behemoth",
          hp: 1150,
          maxHp: 1150,
          x: 1920,
          y: SHM.heightMap[1920],
          facing: -1,
          state: "idle",
          animTimer: 0,
          dead: false
        });
      }
      triggerActionPip("ARA-BOSS · AŞAMA " + SHM.selectedStage + "/12", "Kızıl Kasırga Alfa Wyvern!", "Dört kanatlı fırtına wyvern'i havadan alev hortumu indiriyor!", SHM_ASSETS_PATHS.sub_alpha_wyvern_1);
    } else {
      SHM.boss = {
        id: "sub_behemoth",
        isSubBoss: true,
        subType: "behemoth",
        name: "ZIRHLI MAGMA BEHEMOTH",
        title: "Yıkık Ejderha Örsünün Devi (Ara-Boss I)",
        x: 2560,
        y: SHM.heightMap[2560],
        targetX: 2560,
        facing: -1,
        hp: Math.round(2900 * diffMult),
        maxHp: Math.round(2900 * diffMult),
        phase: 1,
        maxPhase: 3,
        phaseTitle: "ÖRS DEPREMİ & MAGMA ZIRHI",
        shield: 300,
        stunned: 0,
        apocalypseCharge: 0,
        state: "idle",
        stateTimer: 0,
        dead: false
      };
      triggerActionPip("ARA-BOSS I · AŞAMA 3", "Zırhlı Magma Behemoth!", "Demirhane mahzeninin dev canavarı! Zırh delici atışlarla kalkanını parçala!", SHM_ASSETS_PATHS.sub_behemoth_1);
    }
  },

  selectBossMove(b) {
    return b.subType === "behemoth" ? "sub_behemoth_eruption" : "sub_wyvern_storm";
  },

  executeBossAttack(b, p, chosen, diffDmgMult) {
    if (b.subType === "behemoth") {
      SHM.cam.shake = 7;
      SHM.shockwaves.push({ x: b.x - 90, y: b.y, r: 14, maxR: 250, color: "#ef7f3e", alpha: 1 });
      carveTerrainCrater(b.x - 150, b.y, 46);
      launchAimedEnemyProjectile(b.x - 75, b.y - 155, p.x - 26, p.y - 30, Math.round(175 * diffDmgMult), "magma", 52);
      launchAimedEnemyProjectile(b.x - 75, b.y - 155, p.x + 28, p.y - 30, Math.round(175 * diffDmgMult), "magma", 52);
    } else {
      SHM.cam.shake = 6;
      launchBossMeteorRain(b, p, 3, Math.round(155 * diffDmgMult), "magma", 48);
    }
    return true;
  }
});
