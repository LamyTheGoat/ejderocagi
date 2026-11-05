/* ============================================================================
   ZİNDAN I · HARİTA 1/4: TARSUS KEHRİBAR KUYUSU (ÖNCÜ KARAKOL)
   (js/minigame/raids/sahmeran/stage_1_gate.js)
   ============================================================================ */

registerRaidStageMap("sahmeran", ["sah_1", "sah_ex_1", "sah_ex_4"], {
  stageNumber: 1,
  name: "Aşama 1 · Tarsus Kehribar Kuyusu",

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
        id: "cobra_a_" + SHM.selectedStage,
        type: SHM.selectedStage >= 7 ? "sirca_golem" : "cobra",
        name: SHM.selectedStage >= 7 ? "Sırça Kristal Golemi" : "Bronz Engerek Muhafızı",
        hp: Math.round((640 + SHM.selectedStage * 60) * diffMult),
        maxHp: Math.round((640 + SHM.selectedStage * 60) * diffMult),
        x: 1680,
        y: SHM.heightMap[1680],
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      },
      {
        id: "viper_b_" + SHM.selectedStage,
        type: "oracle",
        name: "Engerek Rahibesi",
        hp: Math.round((680 + SHM.selectedStage * 60) * diffMult),
        maxHp: Math.round((680 + SHM.selectedStage * 60) * diffMult),
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
