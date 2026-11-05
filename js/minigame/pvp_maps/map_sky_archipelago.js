/* ============================================================================
   PVP ARENA HARİTASI 2/6: GÖKYÜZÜ UÇAN ADALAR (UÇAN ADA HARİTASI)
   (js/minigame/pvp_maps/map_sky_archipelago.js)
   ============================================================================ */

registerPvpArenaMap("sky_archipelago", {
  id: "sky_archipelago",
  aliases: ["floating_sky_islands", "fungal"],
  name: "Gökyüzü Uçan Adalar",
  shortName: "Gökyüzü Uçan Adalar",
  sub: "Uçan Ada Haritası · 4 Farklı Biyom Uçan Ada · Boşluğa Düşürme",
  terrainType: "islands",
  biome: "",
  islandKeys: [
    "island_selcuklu_harabe",
    "island_tas_kemer_tunel",
    "island_ayaz_kristal",
    "island_ejder_kaburga_magma"
  ],
  islandsLayout: [
    { key: "asset_island_01_selcuklu_harabe", x: 1010, y: 650, w: 460, h: 250, flip: false },
    { key: "asset_island_02_tas_kemer_tunel", x: 1515, y: 575, w: 470, h: 255, flip: false },
    { key: "asset_island_01_selcuklu_harabe", x: 1925, y: 735, w: 500, h: 268, flip: true }
  ],
  bgKey: "pvp_bg_skybridge",
  bgUrl: "img/minigame/pvp_bg_skybridge.webp",
  propIcon: "assets/minigame/asset_island_01_selcuklu_harabe.png",
  terKey: "ter_11",
  desc: "Bulutların üzerinde asılı duran Selçuklu Harabe, Taş Kemer Tünel, Ayaz Kristal ve Volkanik Ejder Kaburgası adalarında 1v1 veya 2v2 taktiksel topçu savaşı!",
  windScale: 1.30,
  hazardText: "Uçan Adalar · Çok Katmanlı Kemer & Boşluk"
});
