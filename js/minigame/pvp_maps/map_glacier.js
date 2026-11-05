/* ============================================================================
   PVP ARENA HARİTASI 6/6: AYAZ KRİSTAL SARKIT MAĞARASI (KARA HARİTASI)
   (js/minigame/pvp_maps/map_glacier.js)
   ============================================================================ */

registerPvpArenaMap("glacier", {
  id: "glacier",
  aliases: ["frost_stalactite_cavern"],
  name: "Ayaz Kristal Sarkıt Mağarası",
  shortName: "Ayaz Kristal Mağarası",
  sub: "Kara Haritası · Donmuş Bazalt & Tavan Sarkıtları · Ejder Kafatası Siperi",
  terrainType: "ground",
  biome: "ice",
  baseLevel: 898,
  gradientStops: ["#7dd3fc", "#0284c7", "#1e3a5f", "#07111e"],
  soilKey: "soil_donmus_bazalt",
  crestKey: "mod_ejder_kafatasi",
  archKey: "mod_tas_kopru",
  bgKey: "pvp_bg_glacier",
  bgUrl: "img/minigame/pvp_bg_glacier.webp",
  propIcon: "assets/minigame/asset_soil_04_donmus_bazalt_buzul.png",
  terKey: "terrain_sirca_rock",
  desc: "Kar kabuğu altında turkuaz buz damarları, donmuş bazalt kayalar ve tavandan sarkan buz sarkıtları! Yüksek geri tepmeli kraterlerle rakibini savur!",
  windScale: 1.20,
  hazardText: "Kara Haritası · Donmuş Bazalt & Sarkıtlar",

  stampStructures(api) {
    api.stampSeljukStoneBridgeWithHollowArch(775, 842, 955);
    api.stampPhysicalModAsset("mod_ejder_kafatasi", 1030, 665, 340, 220, "#0284c7");
    api.stampPhysicalModAsset("mod_kanyon_rampa", 535, 755, 290, 190, "#0284c7");
    api.stampPhysicalModAsset("mod_kaya_sutun", 1935, 685, 135, 275, "#38bdf8");

    if (api.bgctx) {
      const roofGrad = api.bgctx.createLinearGradient(0, 0, 0, 215);
      roofGrad.addColorStop(0, "rgba(8, 24, 38, 0.95)");
      roofGrad.addColorStop(0.75, "rgba(12, 42, 64, 0.72)");
      roofGrad.addColorStop(1, "rgba(12, 42, 64, 0)");
      api.bgctx.fillStyle = roofGrad;
      api.bgctx.fillRect(0, 0, api.W, 215);
    }
    api.stampPhysicalModAsset("mod_magara_sarkit", 520, 16, 340, 250, "#0284c7");
    api.stampPhysicalModAsset("mod_magara_sarkit", 1015, 10, 370, 260, "#0284c7");
    api.stampPhysicalModAsset("mod_magara_sarkit", 1520, 18, 340, 250, "#0284c7");
  }
});
