/* ============================================================================
   ZİNDAN III · HARİTA 1/4: FOSFORLU MERCAN KIYISI (KISKAÇ KALKANLI KARKİNOSLAR)
   (js/minigame/raids/abra/stage_1_coast.js)
   ============================================================================ */

registerRaidStageMap("abra", ["abra_1"], {
  stageNumber: 1,
  name: "Aşama 1 · Fosforlu Mercan Kıyısı",

  computeTerrainY(x) {
    let y = 1040;
    if (x < 920) y = 985 + Math.sin(x * 0.011) * 14;
    else if (x < 1780) y = 1015 + Math.sin((x - 920) * 0.014) * 20;
    else if (x < 2520) y = 955 + Math.cos((x - 1780) * 0.012) * 16;
    else y = 925 + Math.sin((x - 2520) * 0.012) * 14;
    return Math.max(580, Math.min(1460, y));
  },

  paintTerrain(tctx, hMap, W, H) {
    const t1 = SHM_IMAGES.abraTerStage1;
    if (t1 && t1.complete && t1.naturalWidth > 0) {
      tctx.drawImage(t1, 40, 815, 1180, 545);
      tctx.drawImage(t1, 1180, 845, 1180, 535);
      tctx.drawImage(t1, 2240, 795, 1120, 560);
    } else {
      RAID_PLUGINS.abra.bindAbraTerLoad(t1);
      RAID_PLUGINS.abra.fillFallbackSeaTerrain(tctx, hMap, W, H, "#164e63");
    }
  },

  spawnStage(preset, diffMult) {
    SHM.enemies.push(
      {
        id: "abra_karkinos_1",
        type: "karkinos",
        name: "Derin Deniz Karkinosu",
        hp: Math.round(650 * diffMult),
        maxHp: Math.round(650 * diffMult),
        x: 1580,
        y: SHM.heightMap[1580],
        facing: -1,
        state: "idle",
        animTimer: 0,
        clawGuard: true,
        dead: false
      },
      {
        id: "abra_karkinos_2",
        type: "karkinos",
        name: "Kıdemli Mercan Karkinosu",
        hp: Math.round(750 * diffMult),
        maxHp: Math.round(750 * diffMult),
        x: 2180,
        y: SHM.heightMap[2180],
        facing: -1,
        state: "idle",
        animTimer: 0,
        clawGuard: true,
        dead: false
      }
    );
    triggerActionPip(
      "AŞAMA 1/4 · FOSFORLU MERCAN KIYISI",
      "Kıskaç Kalkanlı Derin Deniz Karkinosları!",
      "Düşük açılı atışlar (15°–35°) dev mercan kıskaçtan seker (-%60 hasar)! Yüksek açılı aşırtma atışlarla (55°–75°) sırt kabuğunu vur (1.5× Kritik)!",
      SHM_ASSETS_PATHS.abraKarkinosBody
    );
  }
});
