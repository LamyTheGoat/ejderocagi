/* ============================================================================
   ZİNDAN II · HARİTA 2/4: BAZALT KÖPRÜ & LAV NEHRİ
   (js/minigame/raids/komutan/stage_2_bridge.js)
   ============================================================================ */

registerRaidStageMap("komutan", ["kom_2", "kom_ex_2", "kom_ex_7", "kom_ex_8"], {
  stageNumber: 2,
  name: "Aşama 2 · Bazalt Köprü & Lav Nehri",

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
        type: "wyvern",
        name: "Uçan Kor-Kanat Wyvern",
        hp: Math.round((720 + SHM.selectedStage * 55) * diffMult),
        maxHp: Math.round((720 + SHM.selectedStage * 55) * diffMult),
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
