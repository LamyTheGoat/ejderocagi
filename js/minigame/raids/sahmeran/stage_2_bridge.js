/* ============================================================================
   ZİNDAN I · HARİTA 2/4: SIRÇA KÖPRÜ & ZÜMRÜT ŞELALE
   (js/minigame/raids/sahmeran/stage_2_bridge.js)
   ============================================================================ */

registerRaidStageMap("sahmeran", ["sah_2", "sah_ex_2", "sah_ex_6"], {
  stageNumber: 2,
  name: "Aşama 2 · Sırça Köprü & Zümrüt Şelale",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 780) y = 990 + Math.sin(x * 0.012) * 18;
    else if (x < 960) y = 1190;
    else if (x < 1880) y = 1025 + Math.sin((x - 960) * 0.012) * 28;
    else if (x < 2080) y = 1205;
    else y = 935 + Math.cos((x - 2080) * 0.011) * 20;
    return Math.max(580, Math.min(1390, y));
  },

  spawnStage(preset, diffMult) {
    SHM.enemies.push(
      {
        id: "cobra_a_" + SHM.selectedStage,
        type: "cobra",
        name: "Bronz Engerek Muhafızı",
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
        type: "viper",
        name: "Uçan Sırça Engereği",
        hp: Math.round((680 + SHM.selectedStage * 60) * diffMult),
        maxHp: Math.round((680 + SHM.selectedStage * 60) * diffMult),
        x: 2320,
        y: 590,
        baseY: 590,
        facing: -1,
        state: "idle",
        animTimer: 0,
        dead: false
      }
    );
  }
});
