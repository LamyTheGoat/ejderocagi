/* ============================================================================
   PVP ARENA HARİTASI 5/6: EJDER İSKELETİ KALDERASI (UÇAN ADA HARİTASI)
   (js/minigame/pvp_maps/map_dragon_caldera.js)
   ============================================================================ */

registerPvpArenaMap("dragon_caldera", {
  id: "dragon_caldera",
  aliases: ["forge"],
  name: "Ejder İskeleti Kalderası",
  shortName: "Ejder İskeleti",
  sub: "Uçan Ada Haritası · Volkanik Obsidyen & Ejderha Kaburgası Adaları",
  terrainType: "islands",
  biome: "fire",
  isCalderaBunker: true,
  waterRaise: 16,
  islandKeys: [
    "island_ejder_kaburga_magma",
    "island_tas_kemer_tunel",
    "island_ejder_kaburga_magma",
    "island_selcuklu_harabe"
  ],
  islandsLayout: [
    { key: "asset_island_04_ejder_kaburga_magma", x: 1010, y: 650, w: 460, h: 250, flip: false },
    { key: "asset_island_04_ejder_kaburga_magma", x: 1515, y: 575, w: 470, h: 255, flip: false },
    { key: "asset_island_04_ejder_kaburga_magma", x: 1925, y: 735, w: 500, h: 268, flip: true }
  ],
  bgKey: "pvp_bg_forge",
  bgUrl: "img/minigame/pvp_bg_forge.webp",
  propIcon: "assets/minigame/asset_island_04_ejder_kaburga_magma.png",
  terKey: "terrain_kaldera_rock",
  desc: "Kaynayan kaldera semalarında süzülen dev ejderha kaburga kemikleri ve magma damarlı obsidyen adalar üzerinde ölümcül düello!",
  windScale: 1.10,
  hazardText: "Uçan Adalar · Ejder Kaburgası & Magma"
});
