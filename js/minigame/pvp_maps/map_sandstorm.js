/* ============================================================================
   PVP ARENA HARİTASI 3/6: KIZIL KANYON (KARA HARİTASI)
   (js/minigame/pvp_maps/map_sandstorm.js)
   ============================================================================ */

registerPvpArenaMap("sandstorm", {
  id: "sandstorm",
  aliases: [],
  name: "Kızıl Kanyon",
  shortName: "Kızıl Kanyon",
  sub: "Kara Haritası · Kızıl Kumtaşı Tortul Katmanları · Derin Kanyon Siperleri",
  terrainType: "ground",
  biome: "fire",
  baseLevel: 895,
  gradientStops: ["#d97706", "#92400e", "#451a03", "#1c0a00"],
  soilKey: "soil_kizil_kanyon",
  crestKey: "mod_ejder_kafatasi",
  archKey: "mod_tas_kopru",
  bgKey: "pvp_bg_sandstorm",
  bgUrl: "img/minigame/pvp_bg_sandstorm.webp",
  propIcon: "assets/minigame/asset_soil_02_kizil_kanyon.png",
  terKey: "ter_11",
  desc: "Kızıl çöl kumu ve kehribar kumtaşı katmanlarıyla kaplı sarp kanyon tepeleri! Yüksek açılı aşırtma atışlarla siperleri parçala!",
  windScale: 1.25,
  hazardText: "Kara Haritası · Kızıl Tortul Kumtaşı",

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
