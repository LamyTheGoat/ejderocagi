/* ============================================================================
   EJDER TOPÇUSU — MODÜLER VERİ, ASSET ÖN-YÜKLEYİCİ & ZİNDAN EKLENTİ KAYIT SİSTEMİ
   (js/minigame/shm_data.js)
   ============================================================================ */

const RAID_PLUGINS = {};
const RAID_LOOT_SETS = {};
const RAID_CAMPAIGNS = {};
const BOSS_COMIC_PERSONAS = {};
const BOSS_DRAMATIC_ATTACKS = {};

const SHM_ASSETS_PATHS = {
  // Şahmeran (Zindan I) Temel Varlıkları
  bg_gate: "img/sahmeran/sahmeran_gate_bg.webp",
  bg_bridge: "img/sahmeran/sahmeran_bridge_bg.webp",
  bg_throne: "img/sahmeran/sahmeran_throne_bg.webp",
  bg_sanctum: "img/sahmeran/sahmeran_bg.webp",
  sah_idle1: "img/sahmeran/sahmeran_idle_1.webp",
  sah_idle2: "img/sahmeran/sahmeran_idle_2.webp",
  sah_attack: "img/sahmeran/sahmeran_attack.webp",
  sah_summon: "img/sahmeran/sahmeran_summon.webp",
  sah_hit: "img/sahmeran/sahmeran_hit.webp",
  sah_enrage: "img/sahmeran/sahmeran_enrage.webp",
  sah_closeup: "img/sahmeran/sahmeran_closeup.webp",
  cobra_idle: "img/sahmeran/cobra_idle_1.webp",
  cobra_slither: "img/sahmeran/cobra_slither_2.webp",
  cobra_spit: "img/sahmeran/cobra_spit_3.webp",
  cobra_hit: "img/sahmeran/cobra_hit_4.webp",
  viper_1: "img/sahmeran/viper_fly_1.webp",
  viper_2: "img/sahmeran/viper_fly_2.webp",
  viper_fly1: "img/sahmeran/viper_fly_1.webp",
  viper_fly2: "img/sahmeran/viper_fly_2.webp",
  totem: "img/sahmeran/totem_sahmeran.webp",
  urn: "img/sahmeran/urn_amber.webp",
  loot_crown: "img/sahmeran/loot_sahmeran_crown.webp",
  loot_armor: "img/sahmeran/loot_sahmeran_armor.webp",
  loot_staff: "img/sahmeran/loot_sahmeran_staff.webp",
  loot_talisman: "img/sahmeran/loot_sahmeran_talisman.webp",
  loot_chest: "img/sahmeran/loot_sahmeran_chest.webp",

  // Başkomutan Kalgarot (Zindan II) Temel Varlıkları
  kom_bg_gate: "img/komutan/komutan_gate_bg.webp",
  kom_bg_bridge: "img/komutan/komutan_bridge_bg.webp",
  kom_bg_crater: "img/komutan/komutan_crater_bg.webp",
  kom_bg_sanctum: "img/komutan/komutan_sanctum_bg.webp",
  kom_idle1: "img/komutan/komutan_idle_1.webp",
  kom_idle2: "img/komutan/komutan_idle_2.webp",
  kom_attack: "img/komutan/komutan_breath.webp",
  kom_summon: "img/komutan/komutan_wingstorm.webp",
  kom_hit: "img/komutan/komutan_hit.webp",
  kom_enrage: "img/komutan/komutan_enrage.webp",
  kom_closeup: "img/komutan/komutan_closeup.webp",
  drake_idle: "img/komutan/drake_idle_1.webp",
  drake_walk: "img/komutan/drake_walk_2.webp",
  drake_breath: "img/komutan/drake_breath_3.webp",
  drake_hit: "img/komutan/drake_hit_4.webp",
  wyvern_1: "img/komutan/wyvern_fly_1.webp",
  wyvern_2: "img/komutan/wyvern_fly_2.webp",
  wyvern_fly1: "img/komutan/wyvern_fly_1.webp",
  wyvern_fly2: "img/komutan/wyvern_fly_2.webp",
  totem_magma: "img/komutan/totem_magma.webp",
  bomb_magma: "img/komutan/bomb_magma.webp",
  loot_kom_helm: "img/komutan/loot_komutan_helm.webp",
  loot_kom_armor: "img/komutan/loot_komutan_armor.webp",
  loot_kom_blade: "img/komutan/loot_komutan_blade.webp",
  loot_kom_heart: "img/komutan/loot_komutan_heart.webp",
  loot_kom_chest: "img/komutan/loot_komutan_chest.webp",

  // YENİ EKSTREM MODU 4K ARKA PLANLARI (4 Adet)
  ex_sah_vault_bg: "img/extreme/ex_sah_vault_bg.webp",
  ex_sah_divine_bg: "img/extreme/ex_sah_divine_bg.webp",
  ex_kom_forge_bg: "img/extreme/ex_kom_forge_bg.webp",
  ex_kom_bluecore_bg: "img/extreme/ex_kom_bluecore_bg.webp",

  // YENİ EKSTREM MODU ŞAHMERAN ÖZEL SALDIRI & FAZ IV/V KARELERİ (8 Adet)
  sah_ex_coil: "img/extreme/sah_ex_coil.webp",
  sah_ex_twinbeam: "img/extreme/sah_ex_twinbeam.webp",
  sah_ex_tsunami: "img/extreme/sah_ex_tsunami.webp",
  sah_ex_petrify: "img/extreme/sah_ex_petrify.webp",
  sah_ex_shed: "img/extreme/sah_ex_shed.webp",
  sah_ex_meteor: "img/extreme/sah_ex_meteor.webp",
  sah_ex_ascended: "img/extreme/sah_ex_ascended.webp",
  sah_ex_ko: "img/extreme/sah_ex_ko.webp",

  // YENİ EKSTREM MODU KALGAROT ÖZEL SALDIRI & FAZ IV/V MAVİ-KOR KARELERİ (8 Adet)
  kom_ex_takeoff: "img/extreme/kom_ex_takeoff.webp",
  kom_ex_divebomb: "img/extreme/kom_ex_divebomb.webp",
  kom_ex_tailslam: "img/extreme/kom_ex_tailslam.webp",
  kom_ex_chainwhip: "img/extreme/kom_ex_chainwhip.webp",
  kom_ex_bluefire: "img/extreme/kom_ex_bluefire.webp",
  kom_ex_supernova: "img/extreme/kom_ex_supernova.webp",
  kom_ex_ascended: "img/extreme/kom_ex_ascended.webp",
  kom_ex_ko: "img/extreme/kom_ex_ko.webp",

  // YENİ EKSTREM ARA-BOSSLAR (8 Adet: Sırça Golem, Engerek Başrahibesi, Magma Behemoth, Alfa Wyvern)
  sub_sirca_golem_1: "img/extreme/sub_sirca_golem_1.webp",
  sub_sirca_golem_2: "img/extreme/sub_sirca_golem_2.webp",
  sub_oracle_1: "img/extreme/sub_oracle_1.webp",
  sub_oracle_2: "img/extreme/sub_oracle_2.webp",
  sub_behemoth_1: "img/extreme/sub_behemoth_1.webp",
  sub_behemoth_2: "img/extreme/sub_behemoth_2.webp",
  sub_alpha_wyvern_1: "img/extreme/sub_alpha_wyvern_1.webp",
  sub_alpha_wyvern_2: "img/extreme/sub_alpha_wyvern_2.webp",

  // YENİ ÖZEL ELEMENT & BOSS MERMİ SPRITE'LARI (8 Adet)
  proj_ates: "img/extreme/proj_ates.webp",
  proj_buz: "img/extreme/proj_buz.webp",
  proj_firtina: "img/extreme/proj_firtina.webp",
  proj_toprak: "img/extreme/proj_toprak.webp",
  proj_golge: "img/extreme/proj_golge.webp",
  proj_sahmeran: "img/extreme/proj_sahmeran.webp",
  proj_komutan: "img/extreme/proj_komutan.webp",
  proj_bluekor: "img/extreme/proj_bluekor.webp",

  // YENİ SAVAŞ ALANI TUZAKLARI, GAYZERLER, AYNALAR & SUNAKLAR (8 Adet)
  haz_acid_geyser: "img/extreme/haz_acid_geyser.webp",
  haz_lava_geyser: "img/extreme/haz_lava_geyser.webp",
  haz_crystal_mirror: "img/extreme/haz_crystal_mirror.webp",
  haz_chain_pillar: "img/extreme/haz_chain_pillar.webp",
  haz_poison_spore: "img/extreme/haz_poison_spore.webp",
  haz_meteor_crater: "img/extreme/haz_meteor_crater.webp",
  haz_shield_rune: "img/extreme/haz_shield_rune.webp",
  haz_pow_altar: "img/extreme/haz_pow_altar.webp",

  // YENİ TIER-6 EKSTREM KIYAMET GANİMETLERİ & SANDIĞI (8 Adet)
  loot_ex_sah_crown: "img/extreme/loot_ex_sah_crown.webp",
  loot_ex_sah_wings: "img/extreme/loot_ex_sah_wings.webp",
  loot_ex_kom_helm: "img/extreme/loot_ex_kom_helm.webp",
  loot_ex_kom_armor: "img/extreme/loot_ex_kom_armor.webp",
  loot_ex_kom_wpn: "img/extreme/loot_ex_kom_wpn.webp",
  loot_ex_kom_wings: "img/extreme/loot_ex_kom_wings.webp",
  loot_ex_kom_mask: "img/extreme/loot_ex_kom_mask.webp",
  loot_ex_chest: "img/extreme/loot_ex_chest.webp",
  ui_skill_plus1: "img/ui/ui_skill_plus1.webp",
  ui_skill_plus2: "img/ui/ui_skill_plus2.webp",
  ui_skill_trident: "img/ui/ui_skill_trident.webp",
  ui_skill_heavy: "img/ui/ui_skill_heavy.webp",
  ui_skill_crater: "img/ui/ui_skill_crater.webp",
  ui_skill_wing: "img/ui/ui_skill_wing.webp",
  ui_skill_shield: "img/ui/ui_skill_shield.webp",
  ui_skill_heal: "img/ui/ui_skill_heal.webp",
  ui_skill_pow: "img/ui/ui_skill_pow.webp",
  ui_dial_frame: "img/ui/ui_dial_frame.webp",
  ui_wind_rose: "img/ui/ui_wind_rose.webp",
  ui_crest_sahmeran: "img/ui/ui_crest_sahmeran.webp",
  ui_crest_kalgarot: "img/ui/ui_crest_kalgarot.webp",
  ui_seal_normal: "img/ui/ui_seal_normal.webp",
  ui_seal_zor: "img/ui/ui_seal_zor.webp",
  ui_seal_kabus: "img/ui/ui_seal_kabus.webp",
  ui_plaque_frame: "img/ui/ui_plaque_frame.webp",
  terrain_sirca_rock: "img/terrain/terrain_sirca_rock.webp",
  terrain_kaldera_rock: "img/terrain/terrain_kaldera_rock.webp",
  ter_01: "img/terrain/ter_01.webp",
  ter_02: "img/terrain/ter_02.webp",
  ter_03: "img/terrain/ter_03.webp",
  ter_04: "img/terrain/ter_04.webp",
  ter_05: "img/terrain/ter_05.webp",
  ter_06: "img/terrain/ter_06.webp",
  ter_07: "img/terrain/ter_07.webp",
  ter_08: "img/terrain/ter_08.webp",
  ter_09: "img/terrain/ter_09.webp",
  ter_10: "img/terrain/ter_10.webp",
  ter_11: "img/terrain/ter_11.webp",
  ter_12: "img/terrain/ter_12.webp",
  ter_13: "img/terrain/ter_13.webp",
  ter_14: "img/terrain/ter_14.webp",
  ter_15: "img/terrain/ter_15.webp",
  ter_16: "img/terrain/ter_16.webp",
  ter_17: "img/terrain/ter_17.webp",
  ter_18: "img/terrain/ter_18.webp",
  ter_19: "img/terrain/ter_19.webp",
  ter_20: "img/terrain/ter_20.webp",
  ter_21: "img/terrain/ter_21.webp",
  ter_22: "img/terrain/ter_22.webp",
  ter_23: "img/terrain/ter_23.webp",
  ter_24: "img/terrain/ter_24.webp",
  ter_25: "img/terrain/ter_25.webp",
  ter_26: "img/terrain/ter_26.webp",
  ter_27: "img/terrain/ter_27.webp",
  ter_28: "img/terrain/ter_28.webp",
  ter_29: "img/terrain/ter_29.webp",
  ter_30: "img/terrain/ter_30.webp",
  ter_31: "img/terrain/ter_31.webp",
  ter_32: "img/terrain/ter_32.webp",
  sah_seq_1: "img/anim_seq/sah_seq_1.webp",
  sah_seq_2: "img/anim_seq/sah_seq_2.webp",
  sah_seq_3: "img/anim_seq/sah_seq_3.webp",
  sah_seq_4: "img/anim_seq/sah_seq_4.webp",
  viper_seq_1: "img/anim_seq/viper_seq_1.webp",
  viper_seq_2: "img/anim_seq/viper_seq_2.webp",
  viper_seq_3: "img/anim_seq/viper_seq_3.webp",
  viper_seq_4: "img/anim_seq/viper_seq_4.webp",
  kom_seq_1: "img/anim_seq/kom_seq_1.webp",
  kom_seq_2: "img/anim_seq/kom_seq_2.webp",
  kom_seq_3: "img/anim_seq/kom_seq_3.webp",
  kom_seq_4: "img/anim_seq/kom_seq_4.webp",
  drake_seq_1: "img/anim_seq/drake_seq_1.webp",
  drake_seq_2: "img/anim_seq/drake_seq_2.webp",
  drake_seq_3: "img/anim_seq/drake_seq_3.webp",
  drake_seq_4: "img/anim_seq/drake_seq_4.webp",
  strip_sahmeran_10f: "img/anim_seq/strip_sahmeran_10f.webp",
  strip_komutan_10f: "img/anim_seq/strip_komutan_10f.webp",
  strip_viper_10f: "img/anim_seq/strip_viper_10f.webp",
  strip_drake_10f: "img/anim_seq/strip_drake_10f.webp",
  strip_golem_10f: "img/anim_seq/strip_golem_10f.webp",
  strip_oracle_10f: "img/anim_seq/strip_oracle_10f.webp",
  strip_behemoth_10f: "img/anim_seq/strip_behemoth_10f.webp",
  strip_wyvern_10f: "img/anim_seq/strip_wyvern_10f.webp",
  cut_kalgarot_supernova: "img/extreme/cut_kalgarot_supernova.webp",
  cut_kalgarot_meteor: "img/extreme/cut_kalgarot_meteor.webp",
  cut_sahmeran_tsunami: "img/extreme/cut_sahmeran_tsunami.webp",
  cut_sahmeran_petrify: "img/extreme/cut_sahmeran_petrify.webp",
  cut_karabela_eclipse: "img/extreme/cut_karabela_eclipse.webp",
  cut_kulyutan_cataclysm: "img/extreme/cut_kulyutan_cataclysm.webp",
  pvp_bg_skybridge: "img/minigame/pvp_bg_skybridge.webp",
  pvp_bg_forge: "img/minigame/pvp_bg_forge.webp",
  pvp_bg_glacier: "img/minigame/pvp_bg_glacier.webp",
  pvp_bg_fungal: "img/minigame/pvp_bg_fungal.webp",
  pvp_bg_sandstorm: "img/minigame/pvp_bg_sandstorm.webp",
  pvp_bg_tesla: "img/minigame/pvp_bg_tesla.webp",
  pvp_prop_barrel: "img/minigame/pvp_prop_barrel.webp",
  pvp_prop_crate: "img/minigame/pvp_prop_crate.webp",
  pvp_prop_bumper: "img/minigame/pvp_prop_bumper.webp",
  pvp_prop_vortex: "img/minigame/pvp_prop_vortex.webp",
  pvp_prop_portal: "img/minigame/pvp_prop_portal.webp",
  pvp_prop_tesla: "img/minigame/pvp_prop_tesla.webp",
  pvp_prop_wagon: "img/minigame/pvp_prop_wagon.webp",
  wheel_frame: "img/ui/wheel-frame.webp",
  wheel_center: "img/ui/wheel-center.webp",
  ic_pvp_topcu: "img/ui/ic-pvp-topcu.webp",
  ik_genclik: "img/ui/ik-genclik.webp",

  // ─── 16 MODÜLER HUD & LOBİ UI ASSET'İ (UI-1 .. UI-16) ───
  ui_top_turn_wind_bar: "assets/minigame/asset_ui_01_top_turn_wind_bar.png",
  ui_player_status_frame: "assets/minigame/asset_ui_02_player_status_frame.png",
  ui_round_ruby_medallion: "assets/minigame/asset_ui_03_round_ruby_medallion.png",
  ui_power_gauge_frame: "assets/minigame/asset_ui_04_power_gauge_frame.png",
  ui_skill_slot_normal: "assets/minigame/asset_ui_05_skill_slot_normal.png",
  ui_skill_slot_selected: "assets/minigame/asset_ui_06_skill_slot_selected.png",
  ui_minimap_radar_frame: "assets/minigame/asset_ui_07_minimap_radar_frame.png",
  ui_overhead_hp_plaque: "assets/minigame/asset_ui_08_overhead_hp_plaque.png",
  ui_1v1_duel_crest: "assets/minigame/asset_ui_09_emblem_1v1_topcu.png",
  ui_2v2_team_crest: "assets/minigame/asset_ui_10_emblem_2v2_takim.png",
  ui_turn_order_4slot_bar: "assets/minigame/asset_ui_11_turn_order_4slot_bar.png",
  ui_vs_clash_emblem: "assets/minigame/asset_ui_12_vs_match_clash_emblem.png",
  ui_wind_vane_arrow: "assets/minigame/asset_ui_13_wind_vane_arrow.png",
  ui_emerald_ruby_buttons: "assets/minigame/asset_ui_14_emerald_ruby_buttons.png",
  ui_powerup_ground_rune_ring: "assets/minigame/asset_ui_15_powerup_ground_rune_ring.png",
  ui_victory_defeat_banner: "assets/minigame/asset_ui_16_victory_defeat_banner.png",

  // ─── 6 SAVAŞ VE SEFER KAPISI V2 ASSET'İ (GATE_V2-1 .. GATE_V2-6) ───
  gate_v2_pve_tackapi: "assets/minigame/asset_gate_v2_01_pve_tackapi_cerceve.png",
  gate_v2_pvp_ermeydani: "assets/minigame/asset_gate_v2_02_pvp_er_meydani_cerceve.png",
  gate_v2_ayrim_sutunu: "assets/minigame/asset_gate_v2_03_ahsap_pirinc_ayrim_sutunu.png",
  gate_v2_ust_baslik: "assets/minigame/asset_gate_v2_04_ocak_ust_baslik_plakasi.png",
  gate_v2_pve_armasi: "assets/minigame/asset_gate_v2_05_sahmeran_kalgarot_zindan_armasi.png",
  gate_v2_pvp_armasi: "assets/minigame/asset_gate_v2_06_chibi_topcu_pvp_armasi.png",

  // ─── 6 MODÜLER HARİTA YAPI TAŞI (MOD-1 .. MOD-6) + BİYOM VARYANTLARI (_ice / _fire) ───
  mod_tas_kopru: "assets/minigame/asset_mod_terrain_01_tas_kopru.png",
  mod_tas_kopru_ice: "assets/minigame/asset_mod_terrain_01_tas_kopru_ice.png",
  mod_tas_kopru_fire: "assets/minigame/asset_mod_terrain_01_tas_kopru_fire.png",
  mod_kaya_sutun: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun.png",
  mod_kaya_sutun_ice: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun_ice.png",
  mod_kaya_sutun_fire: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun_fire.png",
  mod_kanyon_rampa: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa.png",
  mod_kanyon_rampa_ice: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa_ice.png",
  mod_kanyon_rampa_fire: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa_fire.png",
  mod_selcuklu_burc: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc.png",
  mod_selcuklu_burc_ice: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc_ice.png",
  mod_selcuklu_burc_fire: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc_fire.png",
  mod_ejder_kafatasi: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper.png",
  mod_ejder_kafatasi_ice: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper_ice.png",
  mod_ejder_kafatasi_fire: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper_fire.png",
  mod_magara_sarkit: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit.png",
  mod_magara_sarkit_ice: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit_ice.png",
  mod_magara_sarkit_fire: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit_fire.png",

  // ─── 4 KARA/TOPRAK KESİT DOKUSU (SOIL-1 .. SOIL-4) ───
  soil_bozkir_cim: "assets/minigame/asset_soil_01_bozkir_cim.png",
  soil_kizil_kanyon: "assets/minigame/asset_soil_02_kizil_kanyon.png",
  soil_zumrut_magara: "assets/minigame/asset_soil_03_selcuklu_harabe_toprak.png",
  soil_donmus_bazalt: "assets/minigame/asset_soil_04_donmus_bazalt_buzul.png",

  // ─── 4 UÇAN ADA GÖVDESİ (ISL-1 .. ISL-4) ───
  island_selcuklu_harabe: "assets/minigame/asset_island_01_selcuklu_harabe.png",
  island_tas_kemer_tunel: "assets/minigame/asset_island_02_tas_kemer_tunel.png",
  island_ayaz_kristal: "assets/minigame/asset_island_03_ayaz_kristal.png",
  island_ejder_kaburga_magma: "assets/minigame/asset_island_04_ejder_kaburga_magma.png",

  // ─── BACKWARD-COMPATIBLE FULL-FILENAME ALIASES (asset_*) ───
  asset_ui_01_top_turn_wind_bar: "assets/minigame/asset_ui_01_top_turn_wind_bar.png",
  asset_ui_02_player_status_frame: "assets/minigame/asset_ui_02_player_status_frame.png",
  asset_ui_03_round_ruby_medallion: "assets/minigame/asset_ui_03_round_ruby_medallion.png",
  asset_ui_04_power_gauge_frame: "assets/minigame/asset_ui_04_power_gauge_frame.png",
  asset_ui_05_skill_slot_normal: "assets/minigame/asset_ui_05_skill_slot_normal.png",
  asset_ui_06_skill_slot_selected: "assets/minigame/asset_ui_06_skill_slot_selected.png",
  asset_ui_07_minimap_radar_frame: "assets/minigame/asset_ui_07_minimap_radar_frame.png",
  asset_ui_08_overhead_hp_plaque: "assets/minigame/asset_ui_08_overhead_hp_plaque.png",
  asset_ui_09_emblem_1v1_topcu: "assets/minigame/asset_ui_09_emblem_1v1_topcu.png",
  asset_ui_10_emblem_2v2_takim: "assets/minigame/asset_ui_10_emblem_2v2_takim.png",
  asset_ui_11_turn_order_4slot_bar: "assets/minigame/asset_ui_11_turn_order_4slot_bar.png",
  asset_ui_12_vs_match_clash_emblem: "assets/minigame/asset_ui_12_vs_match_clash_emblem.png",
  asset_ui_13_wind_vane_arrow: "assets/minigame/asset_ui_13_wind_vane_arrow.png",
  asset_ui_14_emerald_ruby_buttons: "assets/minigame/asset_ui_14_emerald_ruby_buttons.png",
  asset_ui_15_powerup_ground_rune_ring: "assets/minigame/asset_ui_15_powerup_ground_rune_ring.png",
  asset_ui_16_victory_defeat_banner: "assets/minigame/asset_ui_16_victory_defeat_banner.png",
  asset_gate_v2_01_pve_tackapi_cerceve: "assets/minigame/asset_gate_v2_01_pve_tackapi_cerceve.png",
  asset_gate_v2_02_pvp_er_meydani_cerceve: "assets/minigame/asset_gate_v2_02_pvp_er_meydani_cerceve.png",
  asset_gate_v2_03_ahsap_pirinc_ayrim_sutunu: "assets/minigame/asset_gate_v2_03_ahsap_pirinc_ayrim_sutunu.png",
  asset_gate_v2_04_ocak_ust_baslik_plakasi: "assets/minigame/asset_gate_v2_04_ocak_ust_baslik_plakasi.png",
  asset_gate_v2_05_sahmeran_kalgarot_zindan_armasi: "assets/minigame/asset_gate_v2_05_sahmeran_kalgarot_zindan_armasi.png",
  asset_gate_v2_06_chibi_topcu_pvp_armasi: "assets/minigame/asset_gate_v2_06_chibi_topcu_pvp_armasi.png",
  asset_soil_01_bozkir_cim: "assets/minigame/asset_soil_01_bozkir_cim.png",
  asset_soil_02_kizil_kanyon: "assets/minigame/asset_soil_02_kizil_kanyon.png",
  asset_soil_03_selcuklu_harabe_toprak: "assets/minigame/asset_soil_03_selcuklu_harabe_toprak.png",
  asset_soil_04_donmus_bazalt_buzul: "assets/minigame/asset_soil_04_donmus_bazalt_buzul.png",
  asset_island_01_selcuklu_harabe: "assets/minigame/asset_island_01_selcuklu_harabe.png",
  asset_island_02_tas_kemer_tunel: "assets/minigame/asset_island_02_tas_kemer_tunel.png",
  asset_island_03_ayaz_kristal: "assets/minigame/asset_island_03_ayaz_kristal.png",
  asset_island_04_ejder_kaburga_magma: "assets/minigame/asset_island_04_ejder_kaburga_magma.png",
  asset_mod_terrain_01_tas_kopru: "assets/minigame/asset_mod_terrain_01_tas_kopru.png",
  asset_mod_terrain_01_tas_kopru_ice: "assets/minigame/asset_mod_terrain_01_tas_kopru_ice.png",
  asset_mod_terrain_01_tas_kopru_fire: "assets/minigame/asset_mod_terrain_01_tas_kopru_fire.png",
  asset_mod_terrain_02_dikey_kaya_sutun: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun.png",
  asset_mod_terrain_02_dikey_kaya_sutun_ice: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun_ice.png",
  asset_mod_terrain_02_dikey_kaya_sutun_fire: "assets/minigame/asset_mod_terrain_02_dikey_kaya_sutun_fire.png",
  asset_mod_terrain_03_egimli_kanyon_rampa: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa.png",
  asset_mod_terrain_03_egimli_kanyon_rampa_ice: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa_ice.png",
  asset_mod_terrain_03_egimli_kanyon_rampa_fire: "assets/minigame/asset_mod_terrain_03_egimli_kanyon_rampa_fire.png",
  asset_mod_terrain_04_selcuklu_siper_burc: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc.png",
  asset_mod_terrain_04_selcuklu_siper_burc_ice: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc_ice.png",
  asset_mod_terrain_04_selcuklu_siper_burc_fire: "assets/minigame/asset_mod_terrain_04_selcuklu_siper_burc_fire.png",
  asset_mod_terrain_05_ejder_kafatasi_siper: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper.png",
  asset_mod_terrain_05_ejder_kafatasi_siper_ice: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper_ice.png",
  asset_mod_terrain_05_ejder_kafatasi_siper_fire: "assets/minigame/asset_mod_terrain_05_ejder_kafatasi_siper_fire.png",
  asset_mod_terrain_06_magara_tavan_sarkit: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit.png",
  asset_mod_terrain_06_magara_tavan_sarkit_ice: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit_ice.png",
  asset_mod_terrain_06_magara_tavan_sarkit_fire: "assets/minigame/asset_mod_terrain_06_magara_tavan_sarkit_fire.png",

  // ── ZİNDAN III: BATIK DONANMA & DERYA YILANI ABRA (31 ASSET) ──
  // 1. Arka Planlar & Deniz Kemerleri
  abraBgSanctum:      "img/abra/abra_sanctum_bg.webp",
  abraBgDockVault:    "img/abra/abra_dock_vault_bg.webp",
  abraBgArena:        "img/abra/abra_arena_bg_v2.webp",
  abraSeaBelt:        "img/abra/sea_surface_belt_loop.webp",
  abraSwellBelt:      "img/abra/wave_rolling_belt_loop.webp",

  // 2. Aşama 1, 2, 3 ve 4 Yan-Profil 2D Arazi & Engel Parçaları
  abraTerStage1:      "img/abra/terrain_stage1_coral_coast.webp",
  abraTerStage2L:     "img/abra/terrain_stage2_island_left.webp",
  abraTerStage2R:     "img/abra/terrain_stage2_island_right.webp",
  abraTerStage3:      "img/abra/terrain_stage3_dock_pier.webp",
  abraVortex:         "img/abra/fx_trench_vortex.webp",
  abraAnchorProp:     "img/abra/prop_ship_anchor.webp",
  abraPropAnchor:     "img/abra/prop_ship_anchor.webp",

  // 3. Aşama 4: 3 Parçalı Parçalanmış Selçuklu Kadırgası
  abraShipBow:        "img/abra/terrain_ship_bow.webp",
  abraShipMid:        "img/abra/terrain_ship_mid.webp",
  abraShipStern:      "img/abra/terrain_ship_stern.webp",

  // 4. Aşama 1 & 2 Minyonu: Modüler Derin Deniz Karkinosu (2 Parça)
  abraKarkinosBody:   "img/abra/mob_karkinos_body.webp",
  abraKarkinosClaw:   "img/abra/mob_karkinos_claw.webp",

  // 5. Aşama 3 Sub-Boss: Modüler Dalgıç & Mercan Golemi (3 Parça)
  abraGolemBody:      "img/abra/golem_coral_body.webp",
  abraGolemAnchor:    "img/abra/golem_coral_arm_anchor.webp",
  abraGolemCannon:    "img/abra/golem_coral_arm_cannon.webp",

  // 6. Aşama 4 Final Boss: Derya Yılanı ABRA (Modüler Baş + Boyun + Kuyruk + Portre)
  abraHeadIdle:       "img/abra/abra_head_only_idle.webp",
  abraHeadRoar:       "img/abra/abra_head_only_roar.webp",
  abraHeadStagger:    "img/abra/abra_head_only_stagger.webp",
  abraNeckV2:         "img/abra/abra_neck_pillar_v2.webp",
  abraNeckSeg:        "img/abra/abra_neck_pillar_v2.webp",
  abraNeckTile:       "img/abra/abra_neck_pillar_v2.webp",
  abraTailV2:         "img/abra/abra_tail_fin_v2.webp",
  abraCloseup:        "img/abra/abra_closeup_portrait_v2.webp",
  abraPortrait:       "img/abra/abra_closeup_portrait_v2.webp",

  // 7. Mermiler, Dalgalar ve Savaş VFX Katmanları
  abraProjOrb:        "img/abra/proj_abyssal_water_orb.webp",
  abraProjWaterOrb:   "img/abra/proj_abyssal_water_orb.webp",
  abraProjLance:      "img/abra/proj_abyssal_coral_lance.webp",
  abraProjCoralLance: "img/abra/proj_abyssal_coral_lance.webp",
  abraWaveTsunami:    "img/abra/wave_crash_tsunami_seamless.webp",
  abraVfxDive:        "img/abra/vfx_water_dive_splash.webp",
  abraVfxSplash:      "img/abra/vfx_water_dive_splash.webp",
  abraVfxBoil:        "img/abra/vfx_water_telegraph_boil.webp",
  abraVfxGeyser:      "img/abra/vfx_water_emerge_geyser.webp",
  abraVfxLightning:   "img/abra/vfx_abyssal_lightning_bite.webp",
  abraVfxDeckSlam:    "img/abra/vfx_deck_slam_splinters.webp",
  abraVfxScaleHit:    "img/abra/vfx_hit_scale_shatter.webp",
  abraVfxStunHalo:    "img/abra/fx_stun_halo.webp",
};

function getMinorWheelSlices(stageNum = 1) {
  const isStage3 = Number(stageNum) === 3;
  return [
    { idx: 0, id: "minor_gold_120", cat: "gold",    weight: 25, title: "120 Altın",                   sub: "Öncü Ganimet Kesesi (+120 Altın)",                    color: "#7c5218", badge: "120 ALTIN",   icon: SHM_ASSETS_PATHS.loot_chest },
    { idx: 1, id: "minor_food_2",   cat: "food",    weight: 22, title: "2× Kiler Erzağı",             sub: "Rastgele Biber, Mantar, Kar, Balık veya Yumru",       color: "#3d5a34", badge: "2× ERZAK",    icon: SHM_ASSETS_PATHS.ik_genclik },
    { idx: 2, id: "minor_kort1_2",  cat: "stone",   weight: 20, title: "2× Kıvılcım Kor Taşı",        sub: "Tier 1 Güçlendirme Taşı (+1..+4)",                    color: "#5e3a24", badge: "2× T1 TAŞ",   icon: "img/ui/items/stone_kor_t1.webp" },
    { idx: 3, id: "minor_gold_220", cat: "gold",    weight: 12, title: "220 Altın",                   sub: "Ağır Ganimet Kesesi (+220 Altın)",                    color: "#8f621c", badge: "220 ALTIN",   icon: SHM_ASSETS_PATHS.loot_kom_chest },
    { idx: 4, id: "minor_feast_1",  cat: "food",    weight: 9,  title: "1× Ziyafet & Baharat",        sub: "Kilere +1 Ejder Ziyafeti & +1 Baharat",               color: "#4a6b28", badge: "ZİYAFET",     icon: SHM_ASSETS_PATHS.ik_genclik },
    { idx: 5, id: "minor_kort1_3",  cat: "stone",   weight: 6,  title: "3× Kıvılcım Kor Taşı",        sub: "Tier 1 Güçlendirme Taşı Paketi (+1..+4)",             color: "#6e4226", badge: "3× T1 TAŞ",   icon: "img/ui/items/stone_kor_t1.webp" },
    { idx: 6, id: "minor_ore_1",    cat: "ore",     weight: 4,  title: "2× Bölgesel Kervan Cevheri",  sub: "Obsidiyen, Kehribar, Mercan veya Yıldırım Kuvarsı",   color: "#2b5468", badge: "2× CEVHER",   icon: "img/ui/items/ore_obsidiyen.webp" },
    { idx: 7, id: "minor_kort2_1",  cat: "jackpot", weight: isStage3 ? 4 : 2, title: "🌟 1× Harlı Kor Taşı (T2)", sub: "Küçük Çark Büyük Ödülü (+5..+8 Güçlendirme Taşı)", color: "#8a241c", badge: "🌟 BÜYÜK ÖDÜL", icon: "img/ui/items/stone_kor_t2.webp" }
  ];
}

function getMajorWheelSlices() {
  const isEx = isExtremeMode();
  const isHard = SHM.difficulty === "zor" || SHM.difficulty === "agir" || SHM.difficulty === "destansi";
  const rareMult = isEx ? 1.8 : (isHard ? 1.35 : 1.0);
  const goldAmt = isEx ? 900 : 450;
  const isKom = SHM.raidId === "komutan";
  const isAbra = SHM.raidId === "abra";
  const shardIcon = isAbra
    ? "img/abra/abra_closeup_portrait_v2.webp"
    : (isKom ? "img/ui/items/shard_kalgarot.webp" : "img/ui/items/shard_sahmeran.webp");
  return [
    { idx: 0, id: "major_gold",        cat: "gold",    weight: 28, title: `${goldAmt} Altın`,                    sub: `Ulu Boss Hazine Altını (+${goldAmt} Altın)`,                 color: "#8a5a18", badge: `${goldAmt} ALTIN`, icon: SHM_ASSETS_PATHS.loot_kom_chest },
    { idx: 1, id: "major_kort2_2",     cat: "stone",   weight: 24, title: "2× Harlı Kor Taşı (T2)",              sub: "Tier 2 Güçlendirme Taşı (+5..+8)",                           color: "#5e3a24", badge: "2× T2 TAŞ",        icon: "img/ui/items/stone_kor_t2.webp" },
    { idx: 2, id: "major_kort2_3",     cat: "stone",   weight: 16, title: "3× Harlı Kor Taşı (T2)",              sub: "Zengin Tier 2 Kor Kristali Paketi (+5..+8)",                 color: "#6e4226", badge: "3× T2 TAŞ",        icon: "img/ui/items/stone_kor_t2.webp" },
    { idx: 3, id: "major_kort3_1",     cat: "stone",   weight: 12, title: "1× Kadim Magma Taşı (T3)",            sub: "Tier 3 Cehennem Kademesi Taşı (+9..+12)",                    color: "#7a2e1c", badge: "1× T3 TAŞ",        icon: "img/ui/items/stone_kor_t3.webp" },
    { idx: 4, id: "major_egg_1",       cat: "egg",     weight: 8,  title: isAbra ? "1× Kadim Derya / Abra Soy Yumurtası" : "1× Mühürlü Soy Yumurtası", sub: isAbra ? "Biyolüminesan Derya Soyu Ejder Yumurtası" : "Kuluçka İçin Nadir Genli Ejder Yumurtası", color: "#2b5468", badge: "SOY YUMURTASI", icon: "img/ui/egg-ates.webp" },
    { idx: 5, id: "major_shard_armor", cat: "equip",   weight: Number((6 * rareMult).toFixed(2)), title: isAbra ? "🟣 1× Abra Leviathan Zırh/Miğfer Kalıbı" : "🟣 1× Boss Zırh/Miğfer Kalıbı", sub: "Nadir: Rastgele Zırh, Miğfer veya Pelerin Kalıp Parçası", color: "#58246e", badge: "🟣 NADİR KALIP", icon: shardIcon },
    { idx: 6, id: "major_shard_wpn",   cat: "equip",   weight: Number((4 * rareMult).toFixed(2)), title: isAbra ? "🟣 1× Abra Zıpkın/Pusulası Kalıbı" : "🟣 1× Boss Silah/Tılsım Kalıbı", sub: "Çok Nadir: Rastgele Silah, Tılsım veya Maske Kalıp Parçası", color: "#6e1c48", badge: "🟣 ÇOK NADİR", icon: shardIcon },
    { idx: 7, id: "major_jackpot",     cat: "jackpot", weight: Number((2 * rareMult).toFixed(2)), title: "🔥 Anka Mührü + Kıyamet Özü",    sub: "EFSANEVİ JACKPOT: 1× Anka Mühür Taşı + 1× Kıyamet Özü",      color: "#9e1c1c", badge: "🔥 JACKPOT",       icon: "img/ui/items/stone_anka_koruma.webp" }
  ];
}

function getActiveLootWheelSlices() {
  if (SHM.wheelMode === "minor") {
    return getMinorWheelSlices(SHM.selectedStage || SHM.instanceStage || 1);
  }
  return getMajorWheelSlices();
}

const LOOT_WHEEL_SLICES = [
  { idx: 0, id: "major_gold",        cat: "gold",    weight: 28, title: "450 Altın",                    sub: "Ulu Boss Hazine Altını",               color: "#8a5a18", badge: "450 ALTIN" },
  { idx: 1, id: "major_kort2_2",     cat: "stone",   weight: 24, title: "2× Harlı Kor Taşı (T2)",       sub: "Tier 2 Güçlendirme Taşı (+5..+8)",     color: "#5e3a24", badge: "2× T2 TAŞ" },
  { idx: 2, id: "major_kort2_3",     cat: "stone",   weight: 16, title: "3× Harlı Kor Taşı (T2)",       sub: "Zengin Tier 2 Kor Kristali Paketi",    color: "#6e4226", badge: "3× T2 TAŞ" },
  { idx: 3, id: "major_kort3_1",     cat: "stone",   weight: 12, title: "1× Kadim Magma Taşı (T3)",     sub: "Tier 3 Cehennem Taşı (+9..+12)",       color: "#7a2e1c", badge: "1× T3 TAŞ" },
  { idx: 4, id: "major_egg_1",       cat: "egg",     weight: 8,  title: "1× Mühürlü Soy Yumurtası",     sub: "Nadir Genli Ejder Yumurtası",          color: "#2b5468", badge: "SOY YUMURTASI" },
  { idx: 5, id: "major_shard_armor", cat: "equip",   weight: 6,  title: "🟣 1× Boss Zırh/Miğfer Kalıbı",sub: "Rastgele Zırh/Miğfer/Pelerin Kalıbı",  color: "#58246e", badge: "🟣 NADİR KALIP" },
  { idx: 6, id: "major_shard_wpn",   cat: "equip",   weight: 4,  title: "🟣 1× Boss Silah/Tılsım Kalıbı",sub: "Rastgele Silah/Tılsım/Maske Kalıbı",  color: "#6e1c48", badge: "🟣 ÇOK NADİR" },
  { idx: 7, id: "major_jackpot",     cat: "jackpot", weight: 2,  title: "🔥 Anka Mührü + Kıyamet Özü",  sub: "1× Anka Mühür Taşı + 1× Kıyamet Özü",  color: "#9e1c1c", badge: "🔥 JACKPOT" }
];

const SHM_IMAGES = {};
const SHM_LOADED_RAIDS = new Set();

function registerRaidPlugin(id, pluginDef) {
  if (!id || !pluginDef) return;
  pluginDef.id = id;
  pluginDef.stageMaps = pluginDef.stageMaps || {};
  const baseComputeTerrainY = pluginDef.computeTerrainY;
  const basePaintTerrain = pluginDef.paintTerrain;
  const baseSpawnStage = pluginDef.spawnStage;
  const baseOnProjectileFlightTick = pluginDef.onProjectileFlightTick;
  const baseCheckBossProjectileHit = pluginDef.checkBossProjectileHit;
  const baseModifyEnemyDamage = pluginDef.modifyEnemyDamage;
  const baseOnBossPhaseCheck = pluginDef.onBossPhaseCheck;
  const baseOnBossTurnStart = pluginDef.onBossTurnStart;
  const baseSelectBossMove = pluginDef.selectBossMove;
  const baseExecuteBossAttack = pluginDef.executeBossAttack;
  const baseOnEnemyTurnPhaseStart = pluginDef.onEnemyTurnPhaseStart;
  const baseRenderBehindTerrain = pluginDef.renderBehindTerrain;
  const baseRenderMidgroundFX = pluginDef.renderMidgroundFX;
  const baseRenderBoss = pluginDef.renderBoss;
  const baseRenderWeakSpotReticle = pluginDef.renderWeakSpotReticle;
  const baseRenderForegroundFX = pluginDef.renderForegroundFX;

  pluginDef.computeTerrainY = function(x, W, stageNum, preset) {
    const sm = getRaidStageMap(id, preset);
    if (sm && typeof sm.computeTerrainY === "function") return sm.computeTerrainY(x, W, stageNum, preset);
    if (typeof baseComputeTerrainY === "function") return baseComputeTerrainY.call(this, x, W, stageNum, preset);
    return 1040;
  };
  pluginDef.paintTerrain = function(tctx, hMap, W, H, preset) {
    const sm = getRaidStageMap(id, preset);
    if (sm && typeof sm.paintTerrain === "function") return sm.paintTerrain(tctx, hMap, W, H, preset);
    if (typeof basePaintTerrain === "function") return basePaintTerrain.call(this, tctx, hMap, W, H, preset);
  };
  pluginDef.spawnStage = function(preset, diffMult, isEx) {
    const sm = getRaidStageMap(id, preset);
    if (sm && typeof sm.spawnStage === "function") return sm.spawnStage(preset, diffMult, isEx);
    if (typeof baseSpawnStage === "function") return baseSpawnStage.call(this, preset, diffMult, isEx);
  };
  pluginDef.onProjectileFlightTick = function(pr) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.onProjectileFlightTick === "function") sm.onProjectileFlightTick(pr);
    if (typeof baseOnProjectileFlightTick === "function") baseOnProjectileFlightTick.call(this, pr);
  };
  pluginDef.checkBossProjectileHit = function(pr, b) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.checkBossProjectileHit === "function") return sm.checkBossProjectileHit(pr, b);
    if (typeof baseCheckBossProjectileHit === "function") return baseCheckBossProjectileHit.call(this, pr, b);
    return false;
  };
  pluginDef.modifyEnemyDamage = function(e, pr, dmg) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.modifyEnemyDamage === "function") dmg = sm.modifyEnemyDamage(e, pr, dmg);
    if (typeof baseModifyEnemyDamage === "function") dmg = baseModifyEnemyDamage.call(this, e, pr, dmg);
    return dmg;
  };
  pluginDef.onBossPhaseCheck = function(b, hpRatio, isEx) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.onBossPhaseCheck === "function") return sm.onBossPhaseCheck(b, hpRatio, isEx);
    if (typeof baseOnBossPhaseCheck === "function") return baseOnBossPhaseCheck.call(this, b, hpRatio, isEx);
    return false;
  };
  pluginDef.onBossTurnStart = function(b) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.onBossTurnStart === "function") return sm.onBossTurnStart(b);
    if (typeof baseOnBossTurnStart === "function") return baseOnBossTurnStart.call(this, b);
    return false;
  };
  pluginDef.selectBossMove = function(b) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.selectBossMove === "function") return sm.selectBossMove(b);
    if (typeof baseSelectBossMove === "function") return baseSelectBossMove.call(this, b);
    return "tail_whip";
  };
  pluginDef.executeBossAttack = function(b, p, chosen, diffDmgMult, isEx) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.executeBossAttack === "function") return sm.executeBossAttack(b, p, chosen, diffDmgMult, isEx);
    if (typeof baseExecuteBossAttack === "function") return baseExecuteBossAttack.call(this, b, p, chosen, diffDmgMult, isEx);
    return false;
  };
  pluginDef.onEnemyTurnPhaseStart = function(p) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.onEnemyTurnPhaseStart === "function") sm.onEnemyTurnPhaseStart(p);
    if (typeof baseOnEnemyTurnPhaseStart === "function") baseOnEnemyTurnPhaseStart.call(this, p);
  };
  pluginDef.renderBehindTerrain = function(ctx, W, tSec) {
    if (typeof baseRenderBehindTerrain === "function") baseRenderBehindTerrain.call(this, ctx, W, tSec);
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.renderBehindTerrain === "function") sm.renderBehindTerrain(ctx, W, tSec);
  };
  pluginDef.renderMidgroundFX = function(ctx, W, tSec) {
    if (typeof baseRenderMidgroundFX === "function") baseRenderMidgroundFX.call(this, ctx, W, tSec);
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.renderMidgroundFX === "function") sm.renderMidgroundFX(ctx, W, tSec);
  };
  pluginDef.renderBoss = function(ctx, b, brx, bossBobY, bossLungeX, tSec) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.renderBoss === "function") return sm.renderBoss(ctx, b, brx, bossBobY, bossLungeX, tSec);
    if (typeof baseRenderBoss === "function") return baseRenderBoss.call(this, ctx, b, brx, bossBobY, bossLungeX, tSec);
    return false;
  };
  pluginDef.renderWeakSpotReticle = function(ctx, b, now) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.renderWeakSpotReticle === "function") return sm.renderWeakSpotReticle(ctx, b, now);
    if (typeof baseRenderWeakSpotReticle === "function") return baseRenderWeakSpotReticle.call(this, b, now);
    return false;
  };
  pluginDef.renderForegroundFX = function(ctx, W, p, tSec) {
    const sm = getRaidStageMap(id);
    if (sm && typeof sm.renderForegroundFX === "function") sm.renderForegroundFX(ctx, W, p, tSec);
    if (typeof baseRenderForegroundFX === "function") baseRenderForegroundFX.call(this, ctx, W, p, tSec);
  };

  RAID_PLUGINS[id] = pluginDef;
  if (pluginDef.assets && typeof pluginDef.assets === "object") {
    Object.assign(SHM_ASSETS_PATHS, pluginDef.assets);
  }
  if (Array.isArray(pluginDef.lootSet)) {
    RAID_LOOT_SETS[id] = pluginDef.lootSet;
  }
  if (pluginDef.campaign && typeof pluginDef.campaign === "object") {
    RAID_CAMPAIGNS[id] = pluginDef.campaign;
  }
  if (pluginDef.personas && typeof pluginDef.personas === "object") {
    Object.assign(BOSS_COMIC_PERSONAS, pluginDef.personas);
  }
  if (pluginDef.dramaticAttacks && typeof pluginDef.dramaticAttacks === "object") {
    Object.assign(BOSS_DRAMATIC_ATTACKS, pluginDef.dramaticAttacks);
  }
}

function getRaidPlugin(id) {
  const targetId = id || (typeof SHM !== "undefined" && SHM ? SHM.raidId : "komutan");
  return RAID_PLUGINS[targetId] || RAID_PLUGINS.komutan || RAID_PLUGINS.sahmeran || null;
}

function curRaidPlugin() {
  return getRaidPlugin(typeof SHM !== "undefined" && SHM ? SHM.raidId : "komutan");
}

function isAssetKeyForRaid(key, raidId) {
  if (raidId === "abra") return key.startsWith("abra");
  if (raidId === "komutan") return key.startsWith("kom_") || key.startsWith("ex_kom_") || key.startsWith("drake_") || key.startsWith("wyvern_") || key.startsWith("sub_behemoth") || key.startsWith("sub_alpha_wyvern");
  if (raidId === "sahmeran") return key.startsWith("sah_") || key.startsWith("ex_sah_") || key.startsWith("bg_") || key.startsWith("cobra_") || key.startsWith("viper_") || key.startsWith("sub_sirca_golem") || key.startsWith("sub_oracle");
  const plugin = RAID_PLUGINS[raidId];
  if (plugin && plugin.assets && Object.prototype.hasOwnProperty.call(plugin.assets, key)) return true;
  return false;
}

function isSharedMinigameAssetKey(key) {
  return !isAssetKeyForRaid(key, "abra") && !isAssetKeyForRaid(key, "komutan") && !isAssetKeyForRaid(key, "sahmeran");
}

function ensureLazyImageGetter(key, srcPath) {
  if (typeof Image === "undefined") return;
  const desc = Object.getOwnPropertyDescriptor(SHM_IMAGES, key);
  if (desc && (desc.value || desc.get)) return;
  Object.defineProperty(SHM_IMAGES, key, {
    configurable: true,
    enumerable: true,
    get() {
      const img = new Image();
      img.src = srcPath;
      Object.defineProperty(SHM_IMAGES, key, {
        value: img,
        writable: true,
        configurable: true,
        enumerable: true
      });
      return img;
    },
    set(val) {
      Object.defineProperty(SHM_IMAGES, key, {
        value: val,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  });
}

function preloadRaidAssets(raidId) {
  if (typeof Image === "undefined") return;
  const targetRaid = raidId || (typeof SHM !== "undefined" && SHM && SHM.raidId) || "komutan";
  for (const [k, p] of Object.entries(SHM_ASSETS_PATHS)) {
    const shouldEagerLoad = targetRaid === "all" || isSharedMinigameAssetKey(k) || isAssetKeyForRaid(k, targetRaid);
    if (shouldEagerLoad) {
      const desc = Object.getOwnPropertyDescriptor(SHM_IMAGES, k);
      if (!desc || !desc.value) {
        const img = new Image();
        img.src = p;
        Object.defineProperty(SHM_IMAGES, k, {
          value: img,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    } else {
      ensureLazyImageGetter(k, p);
    }
  }
  SHM_LOADED_RAIDS.add(targetRaid);
}

function preloadSahmeranAssets(raidId) {
  preloadRaidAssets(raidId || (typeof SHM !== "undefined" && SHM && SHM.raidId) || "komutan");
}

const SHM_COMPANIONS = [
  {
    id: "sureyya",
    handle: "@leydi_sureyya",
    name: "Leydi Süreyya",
    guild: "İnci Hanedanı",
    role: "Buz Şifacısı & Kalkan",
    el: "buz",
    chibi: { gender: "female", skin: "fildisi", hair: 6, hairColor: "gumus", expr: 2, eyeColor: "turkuaz", eq: { hat: "hat_11", face: "face_2", armor: "armor_9", back: "back_9", wpn: "wpn_9", tal: "tal_9" }, plus: { hat: 12, armor: 12, wpn: 12, back: 12, tal: 12 } },
    desc: "Her oyuncu turu başında +120 HP şifa verir, Zehir/Yanık temizler ve düşmana Buz Mızrağı fırlatır."
  },
  {
    id: "kuzey",
    handle: "@kuzey_ruzgari",
    name: "Kuzey Rüzgârı",
    guild: "Ayaz Muhafızı",
    el: "firtina",
    role: "Fırtına Keskin Nişancısı",
    chibi: { gender: "male", skin: "ayaz", hair: 7, hairColor: "indigo", expr: 8, eyeColor: "gok", eq: { hat: "hat_12", face: "face_9", armor: "armor_11", back: "back_10", wpn: "wpn_11", tal: "tal_10" }, plus: { hat: 12, armor: 12, wpn: 12, back: 12, tal: 12 } },
    desc: "Her tur sonunda en güçlü düşmana 210 hasarlık Mavi-Yıldırım darbesi indirir."
  },
  {
    id: "selin",
    handle: "@haritaci_selin",
    name: "Haritacı Selin",
    guild: "Tarsus Kâşifleri",
    el: "toprak",
    role: "Kâşif & Zayıf Nokta Rehberi",
    npcImg: "img/npc-selin.webp",
    chibi: { gender: "female", skin: "bugday", hair: 4, hairColor: "kestane", expr: 3, eyeColor: "zumrut", eq: { hat: "hat_4", face: "face_3", armor: "armor_2", back: "back_1", wpn: "wpn_2", tal: "tal_2" }, plus: { hat: 9, armor: 9, wpn: 9, back: 9, tal: 9 } },
    desc: "Tam rüzgâr yörünge rehberini açar ve Taç / Kor Kalbi / Sarkıt vuruşlarına +%30 ek hasar kazandırır."
  }
];

const SHM_BLESSINGS = [
  {
    id: "amber_fang",
    name: "Mavi-Kor & Zümrüt Diş Efsunu",
    desc: "Tüm atışlarının hasarı kalıcı olarak +%35 artar ve mermiler zırh delici süpernova izi bırakır.",
    apply: (st) => { st.dmgMult = (st.dmgMult || 1) + 0.35; }
  },
  {
    id: "crown_hunter",
    name: "Kıyamet Nişancısı Gözü",
    desc: "Boss Zayıf Nokta (Taç / Boynuz / Kor Kalp Çekirdeği) kritik çarpanı +0.6 artar ve tam nişan yörüngesi açılır!",
    apply: (st) => { st.headshotMult = (st.headshotMult || 2.6) + 0.6; st.guideAlways = true; }
  },
  {
    id: "emerald_blood",
    name: "Kadim Ocak Diriliş Pınarı",
    desc: "Kahramanın anında +750 HP iyileşir, Maksimum HP +450 artar, +50 POW Öfkesi ve her tur +35 ek Enerji kazanır.",
    apply: (st) => {
      st.maxHpBonus = (st.maxHpBonus || 0) + 450;
      if (SHM.player) {
        SHM.player.maxHp += 450;
        SHM.player.hp = Math.min(SHM.player.maxHp, SHM.player.hp + 750);
        SHM.player.rage = Math.min(100, (SHM.player.rage || 0) + 50);
      }
      st.BonusStamina = (st.BonusStamina || 0) + 35;
    }
  }
];


const SKILL_DISPLAY_NAMES = {
  plus1: "EK ATIŞ (+1 MERMİ)",
  plus2: "ÜÇLÜ SERİ (+2 MERMİ)",
  trident: "ÜÇLÜ ÇATAL ATIŞI",
  heavy: "AĞIR GÜLLE (+%50 HASAR)",
  crater: "DEV KRATER GÜLLESİ",
  teleport: "KANAT UÇUŞU (TELEPORT)",
  shield: "KORUMA KALKANI",
  heal: "OCAK İKSİRİ (+450 CAN)",
  anchor: "DEMİR ÇAPA (DALGA DİRENCİ %75 & +%25 İSABET)",
  powUlt: "EJDER ÖFKESİ (POW ULTİ)"
};

function hasArmedPowerup() {
  if (!SHM.activeMods) return false;
  return !!(
    SHM.activeMods.plus1 ||
    SHM.activeMods.plus2 ||
    SHM.activeMods.trident ||
    SHM.activeMods.heavy ||
    SHM.activeMods.crater ||
    SHM.activeMods.teleport ||
    SHM.activeMods.powUlt
  );
}

function getArmedPowerupLabel() {
  if (!SHM.activeMods) return "";
  const activeList = [];
  for (const [k, v] of Object.entries(SHM.activeMods)) {
    if (v && SKILL_DISPLAY_NAMES[k]) activeList.push(SKILL_DISPLAY_NAMES[k]);
  }
  return activeList.join(" + ");
}


function getActiveStagePreset(raidId, explicitPreset) {
  if (explicitPreset) return explicitPreset;
  const plugin = RAID_PLUGINS[raidId || (typeof SHM !== "undefined" && SHM ? SHM.raidId : "komutan")];
  if (!plugin) return null;
  const isEx = typeof isExtremeMode === "function" && isExtremeMode();
  const stages = (isEx && plugin.extremeStages) ? plugin.extremeStages : (plugin.normalStages || []);
  const stageNum = (typeof SHM !== "undefined" && SHM && (SHM.selectedStage || SHM.instanceStage)) || 1;
  const stObj = stages[Math.max(0, Math.min(stages.length - 1, stageNum - 1))];
  return stObj ? stObj.preset : null;
}

function getRaidStageMap(raidId, explicitPreset) {
  const rId = raidId || (typeof SHM !== "undefined" && SHM ? SHM.raidId : "komutan");
  const plugin = RAID_PLUGINS[rId];
  if (!plugin || !plugin.stageMaps) return null;
  const preset = getActiveStagePreset(rId, explicitPreset);
  if (preset && plugin.stageMaps[preset]) return plugin.stageMaps[preset];
  const stageNum = (typeof SHM !== "undefined" && SHM && (SHM.selectedStage || SHM.instanceStage)) || 1;
  return plugin.stageMaps["stage_" + stageNum] || null;
}

function curStageMap(explicitPreset) {
  return getRaidStageMap(typeof SHM !== "undefined" && SHM ? SHM.raidId : "komutan", explicitPreset);
}

function registerRaidStageMap(raidId, presets, stageDef) {
  if (!raidId || !stageDef) return;
  const plugin = RAID_PLUGINS[raidId];
  if (!plugin) return;
  if (!plugin.stageMaps) plugin.stageMaps = {};
  const list = Array.isArray(presets) ? presets : [presets];
  for (const p of list) {
    if (p) plugin.stageMaps[p] = stageDef;
  }
  if (stageDef.stageNumber) {
    plugin.stageMaps["stage_" + stageDef.stageNumber] = stageDef;
  }
}

if (typeof window !== "undefined") {
  window.registerRaidStageMap = registerRaidStageMap;
  window.getRaidStageMap = getRaidStageMap;
  window.curStageMap = curStageMap;
  window.RAID_PLUGINS = RAID_PLUGINS;
  window.registerRaidPlugin = registerRaidPlugin;
  window.getRaidPlugin = getRaidPlugin;
  window.curRaidPlugin = curRaidPlugin;
  window.preloadRaidAssets = preloadRaidAssets;
  window.preloadSahmeranAssets = preloadSahmeranAssets;
}
if (typeof global !== "undefined") {
  global.registerRaidStageMap = registerRaidStageMap;
  global.getRaidStageMap = getRaidStageMap;
  global.curStageMap = curStageMap;
  global.RAID_PLUGINS = RAID_PLUGINS;
  global.registerRaidPlugin = registerRaidPlugin;
  global.getRaidPlugin = getRaidPlugin;
  global.curRaidPlugin = curRaidPlugin;
  global.preloadRaidAssets = preloadRaidAssets;
  global.preloadSahmeranAssets = preloadSahmeranAssets;
}
