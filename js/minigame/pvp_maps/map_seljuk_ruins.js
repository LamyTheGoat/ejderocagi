/* ============================================================================
   PVP ARENA HARİTASI 4/6: SELÇUKLU KERVANSARAY KÖPRÜSÜ (KARA HARİTASI)
   (js/minigame/pvp_maps/map_seljuk_ruins.js)
   ============================================================================ */

registerPvpArenaMap("seljuk_ruins", {
  id: "seljuk_ruins",
  aliases: ["caravanserai_bridge", "tesla"],
  name: "Selçuklu Kervansaray Köprüsü",
  shortName: "Kervansaray Köprüsü",
  sub: "Kara Haritası · Zümrüt Mağara Kesiti · Selçuklu Taş Köprü & Siper Burcu",
  terrainType: "ground",
  biome: "",
  baseLevel: 892,
  gradientStops: ["#14b8a6", "#475569", "#1e293b", "#0f172a"],
  soilKey: "soil_zumrut_magara",
  crestKey: "mod_selcuklu_burc",
  archKey: "mod_tas_kopru",
  bgKey: "pvp_bg_tesla",
  bgUrl: "img/minigame/pvp_bg_tesla.webp",
  propIcon: "assets/minigame/asset_mod_terrain_01_tas_kopru.png",
  terKey: "terrain_sirca_rock",
  desc: "İki sarp kara yakasını birbirine bağlayan yıkılabilir Selçuklu taş köprüsü, siper burçları ve dikey kaya sütunları üzerinde tarihi topçu düellosu!",
  windScale: 1.18,
  hazardText: "Kara Haritası · Selçuklu Taş Köprü & Burç",

  stampStructures(api) {
    api.stampPhysicalModAsset("mod_kaya_sutun", 1125, 1015, 145, 330, "#475569");
    api.stampSeljukStoneBridgeWithHollowArch(775, 842, 955);
    api.stampPhysicalModAsset("mod_selcuklu_burc", 165, 695, 250, 195, "#475569");
    api.stampPhysicalModAsset("mod_kanyon_rampa", 545, 755, 290, 190, "#475569");
    api.stampPhysicalModAsset("mod_ejder_kafatasi", 1485, 730, 295, 200, "#475569");
    api.stampPhysicalModAsset("mod_selcuklu_burc", 1935, 695, 260, 195, "#475569");
    api.stampPhysicalModAsset("mod_magara_sarkit", 640, 14, 340, 240, "#334155");
    api.stampPhysicalModAsset("mod_magara_sarkit", 1420, 14, 340, 240, "#334155");
  }
});
