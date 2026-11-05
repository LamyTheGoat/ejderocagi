/* ============================================================================
   PVP ARENA HARİTASI 1/6: ANADOLU BOZKIR KANYONU (KARA HARİTASI)
   (js/minigame/pvp_maps/map_steppe_canyon.js)
   ============================================================================ */

registerPvpArenaMap("steppe_canyon", {
  id: "steppe_canyon",
  aliases: ["skybridge"],
  name: "Anadolu Bozkır Kanyonu",
  shortName: "Anadolu Bozkır Kanyonu",
  sub: "Kara Haritası · Bozkır Çim & Toprak Kesiti · Selçuklu Taş Köprü & Siper Burcu",
  terrainType: "ground",
  biome: "",
  baseLevel: 895,
  gradientStops: ["#65a30d", "#5c4028", "#3a2818", "#181009"],
  soilKey: "soil_bozkir_cim",
  crestKey: "mod_selcuklu_burc",
  archKey: "mod_tas_kopru",
  bgKey: "pvp_bg_skybridge",
  bgUrl: "img/minigame/pvp_bg_skybridge.webp",
  propIcon: "assets/minigame/asset_soil_01_bozkir_cim.png",
  terKey: "ter_11",
  desc: "Bozkır çimi, kara toprak ve kireçtaşı katmanlarından oluşan siperli kanyon! Ortadaki Selçuklu taş köprüsünün altından mermi geçir veya toprağı kaz!",
  windScale: 1.15,
  hazardText: "Kara Haritası · Selçuklu Taş Köprü & Toprak Siper",

  stampStructures(api) {
    api.stampSeljukStoneBridgeWithHollowArch(775, 842, 955);
    api.stampPhysicalModAsset("mod_selcuklu_burc", 1045, 680, 300, 200, "#5c4028");
    api.stampPhysicalModAsset("mod_kanyon_rampa", 530, 758, 290, 190, "#5c4028");
    api.stampPhysicalModAsset("mod_ejder_kafatasi", 1485, 730, 295, 200, "#5c4028");
    api.stampPhysicalModAsset("mod_kaya_sutun", 1935, 690, 130, 265, "#5c4028");
    api.stampPhysicalModAsset("mod_magara_sarkit", 660, 12, 340, 240, "#5c4028");
    api.stampPhysicalModAsset("mod_magara_sarkit", 1410, 12, 340, 240, "#5c4028");
  }
});
