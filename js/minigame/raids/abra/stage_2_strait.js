/* ============================================================================
   ZİNDAN III · HARİTA 2/4: GİRDAP BOĞAZI & DEMİR ÇAPA KAYALIKLARI
   (js/minigame/raids/abra/stage_2_strait.js)
   ============================================================================ */

registerRaidStageMap("abra", ["abra_2"], {
  stageNumber: 2,
  name: "Aşama 2 · Girdap Boğazı & Demir Çapa Kayalıkları",

  computeTerrainY(x) {
    let y = 1455;
    if (x >= 180 && x <= 1120) {
      y = 965 + Math.sin((x - 180) * 0.009) * 14;
    } else if (x >= 1620 && x <= 2880) {
      y = 950 + Math.cos((x - 1620) * 0.009) * 16;
    }
    return Math.max(580, Math.min(1460, y));
  },

  paintTerrain(tctx, hMap, W, H) {
    const t2L = SHM_IMAGES.abraTerStage2L;
    const t2R = SHM_IMAGES.abraTerStage2R;
    let drawn = false;
    if (t2L && t2L.complete && t2L.naturalWidth > 0) {
      tctx.drawImage(t2L, 140, 775, 1020, 565);
      drawn = true;
    } else {
      RAID_PLUGINS.abra.bindAbraTerLoad(t2L);
    }
    if (t2R && t2R.complete && t2R.naturalWidth > 0) {
      tctx.drawImage(t2R, 1580, 765, 1340, 575);
      drawn = true;
    } else {
      RAID_PLUGINS.abra.bindAbraTerLoad(t2R);
    }
    if (!drawn) {
      RAID_PLUGINS.abra.fillFallbackSeaTerrain(tctx, hMap, W, H, "#164e63");
    }
  },

  spawnStage(preset, diffMult) {
    SHM.abraVortex = { x: 1370, y: 945, radius: 135, active: true };
    SHM.abraVanguardTail = { x: 2680, y: 1085, turnCounter: 0 };
    SHM.enemies.push(
      {
        id: "abra_karkinos_2_1",
        type: "karkinos",
        name: "Zırhlı Boğaz Karkinosu",
        hp: Math.round(800 * diffMult),
        maxHp: Math.round(800 * diffMult),
        x: 1840,
        y: SHM.heightMap[1840],
        facing: -1,
        state: "idle",
        animTimer: 0,
        clawGuard: true,
        dead: false
      },
      {
        id: "abra_karkinos_2_2",
        type: "karkinos",
        name: "Derin Girdap Karkinosu",
        hp: Math.round(850 * diffMult),
        maxHp: Math.round(850 * diffMult),
        x: 2340,
        y: SHM.heightMap[2340],
        facing: -1,
        state: "idle",
        animTimer: 0,
        clawGuard: true,
        dead: false
      }
    );
    triggerActionPip(
      "AŞAMA 2/4 · GİRDAP BOĞAZI & DEMİR ÇAPA",
      "Boğaz Su Hortumu & Öncü Kuyruk Dalgası!",
      "İki adacık arasındaki su hortumu alçak mermileri saptırır! Her 2 turda bir gelen öncü dalgaya karşı Demir Çapa [G] atarak itilmeyi %75 azalt ve +%25 Hasar kazan!",
      SHM_ASSETS_PATHS.abraPropAnchor
    );
  },

  onProjectileFlightTick(pr) {
    if (SHM.abraVortex && SHM.abraVortex.active && !pr.isTeleport && !pr._abraVortexDeflected) {
      const vx0 = SHM.abraVortex.x || 1370;
      if (Math.abs(pr.x - vx0) <= 95 && pr.y >= 720 && pr.y <= 1180) {
        pr._abraVortexDeflected = true;
        pr.vy -= 5.6;
        pr.vx *= 0.86;
        SHM.shockwaves.push({ x: vx0, y: pr.y, r: 10, maxR: 102, color: "#38bdf8", alpha: 0.95 });
        addFloatText(vx0, pr.y - 44, "🌀 BOĞAZ HORTUMU ALÇAK MERMİYİ YUKARI SAPTIRDI!", "#38bdf8", 18, true);
      }
    }
  },

  onEnemyTurnPhaseStart(p) {
    if (SHM.abraVanguardTail && p && (SHM.stats.turnsTaken || 0) % 2 === 1) {
      SHM.abraVanguardTail.timer = 58;
      SHM.activeTsunamis = SHM.activeTsunamis || [];
      SHM.activeTsunamis.push({
        startX: SHM.abraVanguardTail.x - 120,
        travelDist: 1750,
        baseY: 1218,
        maxW: 340,
        maxH: 235,
        timer: 0,
        maxTimer: 58,
        dmg: 145,
        hitPlayer: false
      });
      addFloatText(SHM.abraVanguardTail.x - 80, 980, "🌊 ABRA ÖNCÜ KUYRUK DARBESİ: TSUNAMİ GELİYOR!", "#38bdf8", 20, true);
    }
  },

  renderMidgroundFX(ctx, W, tSec) {
    if (SHM.abraVortex) {
      drawAbraPivot(ctx, SHM_IMAGES.abraVortex, SHM.abraVortex.x, SHM.abraVortex.y, 260, 260, 0.5, 0.5, tSec * 165, 0.90);
    }
    if (SHM.abraVanguardTail) {
      const vt = SHM.abraVanguardTail;
      if (vt.timer > 0) vt.timer--;
      const vtSway = [
        Math.sin(tSec * 2.5) * 16,
        Math.sin(tSec * 2.5 - 0.8) * 26,
        Math.sin(tSec * 2.5 - 1.5) * 36,
        Math.sin(tSec * 2.5 - 2.2) * 46
      ];
      const stretch = 1.0 + (vt.timer > 0 ? Math.sin((vt.timer / 58) * Math.PI) * 0.22 : 0);
      drawSeamlessTail(ctx, SHM_IMAGES.abraTailV2, vt.x, vt.y, 165, 290, vtSway, stretch);
    }
  }
});
