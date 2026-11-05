/* ============================================================================
   ZİNDAN II · HARİTA 1/4: YANARDAĞ DIŞ SİPERLERİ (ÖNCÜ DRAKE KARAKOLU)
   (js/minigame/raids/komutan/stage_1_gate.js)
   ============================================================================ */

registerRaidStageMap("komutan", ["kom_1", "kom_ex_1", "kom_ex_4", "kom_ex_5"], {
  stageNumber: 1,
  name: "Aşama 1 · Yanardağ Dış Siperleri",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 820) y = 1020 + Math.sin(x * 0.011) * 18;
    else if (x < 1750) y = 1055 - ((x - 820) / 930) * 75 + Math.sin(x * 0.016) * 24;
    else if (x < 2450) y = 980 + Math.cos((x - 1750) * 0.013) * 26;
    else y = 925 - ((x - 2450) / 950) * 45 + Math.sin(x * 0.014) * 14;
    return Math.max(580, Math.min(1390, y));
  },

  spawnStage(preset, diffMult) {
    SHM.enemies.push(
      {
        id: "drake_a_" + SHM.selectedStage,
        type: "drake",
        name: "Zırhlı Magma Drake",
        hp: Math.round((680 + SHM.selectedStage * 55) * diffMult),
        maxHp: Math.round((680 + SHM.selectedStage * 55) * diffMult),
        x: 1680,
        y: SHM.heightMap[1680],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      },
      {
        id: "wyvern_b_" + SHM.selectedStage,
        type: "drake",
        name: "Kıdemli Kaldera Drake'i",
        hp: Math.round((720 + SHM.selectedStage * 55) * diffMult),
        maxHp: Math.round((720 + SHM.selectedStage * 55) * diffMult),
        x: 2320,
        y: SHM.heightMap[2320],
        baseY: 590,
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      }
    );
  }
});
