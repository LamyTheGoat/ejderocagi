'use strict';
/* ============ EJDER OCAĞI — GÖRSEL VARLIKLAR ============
   Midjourney ve Nano Banana'dan gelen görseller. Bir anahtar burada tanımlıysa kodla çizilen hâlinin yerine geçer. */
Object.assign(ASSETS, {
  'bg-title': 'img/bg-title.webp', 'bg-ocak': 'img/bg-ocak.webp', 'bg-ahir': 'img/bg-ahir.webp', 'bg-yuva': 'img/bg-yuva.webp',
  'bg-arena': 'img/bg-arena.webp', 'bg-pit': 'img/bg-pit.webp', 'bg-pazar': 'img/bg-pazar.webp', 'bg-pazar-iso': 'img/bg-pazar-iso.webp', 'bg-table': 'img/bg-table.webp',
  'bg-harita': 'img/bg-harita.webp', 'bg-kul': 'img/bg-kul.webp', 'bg-buzul': 'img/bg-buzul.webp', 'bg-kayalik': 'img/bg-kayalik.webp',
  'bg-orman': 'img/bg-orman.webp', 'bg-bataklik': 'img/bg-bataklik.webp',
  'bg-saray': 'img/bg-saray.webp', 'bg-meydan': 'img/bg-meydan.webp', 'bg-kasaba': 'img/bg-kasaba.webp', 'bg-sofra': 'img/bg-sofra.webp', 'bg-kaplica': 'img/bg-kaplica.webp', 'chibi-battle': 'img/chibi/battle/battle_base.webp',
  'bg-col': 'img/bg-col.webp', 'bg-mercan': 'img/bg-mercan.webp', 'bg-bulut': 'img/bg-bulut.webp', 'bg-obsidiyen': 'img/bg-obsidiyen.webp', 'bg-raid': 'img/bg-raid.webp', 'bg-kervan': 'img/bg-kervan.webp', 'bg-kule': 'img/bg-kule.webp', 'bg-gok': 'img/bg-kule.webp',
});
for (const k of ['dede', 'selin', 'demirhan', 'kerim', 'tuccar', 'yumurtaci', 'baharatci', 'kantuccari', 'cukur', 'muhtar', 'ozan', 'bilge']) ASSETS['npc-' + k] = `img/npc-${k}.webp`;

// Ejderha çizimleri (Canva): element × evre
for (const e of ['ates', 'buz', 'firtina', 'toprak', 'golge']) for (const g of ['yavru', 'genc', 'yetiskin']) ASSETS[`dr-${e}-${g}`] = `img/dr-${e}-${g}.webp`;
for (const e of ['ates', 'buz', 'firtina', 'toprak', 'golge']) for (const g of ['yavru', 'genc', 'yetiskin']) ASSETS[`eye-${e}-${g}`] = `img/eye-${e}-${g}.webp`;
// Bina, eşya ve yem görselleri (Midjourney, arka planı kesilmiş)
for (const k of ['b-buzc', 'b-direk', 'b-fener', 'b-golgetas', 'b-heykel', 'b-in', 'b-kaynak', 'b-kiler', 'b-kulucka', 'b-lab', 'b-lav', 'b-magara', 'b-mezar', 'b-parkur', 'b-sifa', 'b-talim', 'b-yosun', 'b-yuva', 'food-balik', 'food-biber', 'food-kar', 'food-mantar', 'food-yumru', 'food-zambak', 'food-ziyafet', 'item-bas1', 'item-bas2', 'item-bas3', 'item-kin1', 'item-kin2', 'item-kin3', 'item-til1', 'item-til2', 'item-til3', 'item-til4', 'item-zirh1', 'item-zirh2', 'item-zirh3', 'item-kemer']) ASSETS[k] = `img/${k}.webp`;
// İkonlar, pazar dükkânları, han, karo, ağırlık taşları
for (const k of ['ic-ocak', 'ic-ahir', 'ic-yuva', 'ic-arena', 'ic-sefer', 'ic-pazar', 'ic-meydan', 'ic-kasaba', 'ic-saray', 'ic-train', 'ic-rest', 'ic-walk', 'ic-talk', 'ic-feed', 'ic-care', 'stall-ejder', 'stall-yumurta', 'stall-yem', 'stall-demir', 'stall-han', 'tile-bramble', 'tile-grass', 'tile-stone', 'b-agirlik']) ASSETS[k] = `img/${k}.webp`;

for (const el of ['ates', 'buz', 'firtina', 'toprak', 'golge']) for (const st of ['yavru', 'genc', 'yetiskin']) for (const r of ['pul', 'sus']) ASSETS[`rg-${r}-${el}-${st}`] = `img/rg/${r}-${el}-${st}.webp`;
for (const k of ['cosku', 'yuha', 'bahisci', 'cocuk', 'simitci', 'hakem', 'ihtiyar', 'rakip', 'soylu', 'cift', 'davul', 'sifaci']) ASSETS['pip-' + k] = `img/pip/pip-${k}.webp`;
for (const k of ['tribun', 'bahis', 'loca', 'kapi', 'kose', 'merdiven', 'calgi', 'cukur']) ASSETS['pipbg-' + k] = `img/pip/pipbg-${k}.webp`;
// Yarış çizgi roman kareleri için arka planlar (Gemini): mekân × bitiş kemeri / parkur
for (const v of ['kul', 'kayalik', 'buzul', 'orman']) for (const k of ['bitis', 'parkur']) ASSETS[`rbg-${v}-${k}`] = `img/rbg-${v}-${k}.webp`;

for (const k of ["ocak", "ahir", "yuva", "pazar", "meydan", "arena", "sefer", "konak"]) ASSETS["town-" + k] = `img/iso/town-${k}.webp`;
for (const k of ["ejder", "yumurta", "yem", "demir", "han", "muz", "orders", "kan"]) ASSETS["pazar-" + k] = `img/iso/pazar-${k}.webp`;


// Şahmeran: Yeraltı Sırça Saray Zindanı & Çizgi Roman Varlıkları
Object.assign(ASSETS, {
  'bg-sahmeran-gate': 'img/sahmeran/sahmeran_gate_bg.webp',
  'bg-sahmeran-bridge': 'img/sahmeran/sahmeran_bridge_bg.webp',
  'bg-sahmeran-throne': 'img/sahmeran/sahmeran_throne_bg.webp',
  'bg-sahmeran-sanctum': 'img/sahmeran/sahmeran_bg.webp',
  'npc-sahmeran': 'img/sahmeran/sahmeran_closeup.webp',
});


// Kül Yutan'ın Başkomutanı: Kara Kor Ejderi Kalgarot (4 Aşamalı Volkanik Kaldera Zindanı)
Object.assign(ASSETS, {
  'bg-komutan-gate': 'img/komutan/komutan_gate_bg.webp',
  'bg-komutan-bridge': 'img/komutan/komutan_bridge_bg.webp',
  'bg-komutan-crater': 'img/komutan/komutan_crater_bg.webp',
  'bg-komutan-sanctum': 'img/komutan/komutan_sanctum_bg.webp',
  'npc-komutan': 'img/komutan/komutan_closeup.webp',
});

// Ekstrem (Kâbus) Modu 4K Sahneleri
Object.assign(ASSETS, {
  'bg-ex-sah-vault': 'img/extreme/ex_sah_vault_bg.webp',
  'bg-ex-sah-divine': 'img/extreme/ex_sah_divine_bg.webp',
  'bg-ex-kom-forge': 'img/extreme/ex_kom_forge_bg.webp',
  'bg-ex-kom-bluecore': 'img/extreme/ex_kom_bluecore_bg.webp',
});

// V16: 32 Özel Arazi (Terrain) Asseti & 10.5 FPS Çok-Kareli Animasyon Şeritleri
Object.assign(ASSETS, {
  'ter-01': 'img/terrain/ter_01.webp',
  'ter-02': 'img/terrain/ter_02.webp',
  'ter-03': 'img/terrain/ter_03.webp',
  'ter-04': 'img/terrain/ter_04.webp',
  'ter-05': 'img/terrain/ter_05.webp',
  'ter-06': 'img/terrain/ter_06.webp',
  'ter-07': 'img/terrain/ter_07.webp',
  'ter-08': 'img/terrain/ter_08.webp',
  'ter-09': 'img/terrain/ter_09.webp',
  'ter-10': 'img/terrain/ter_10.webp',
  'ter-11': 'img/terrain/ter_11.webp',
  'ter-12': 'img/terrain/ter_12.webp',
  'ter-13': 'img/terrain/ter_13.webp',
  'ter-14': 'img/terrain/ter_14.webp',
  'ter-15': 'img/terrain/ter_15.webp',
  'ter-16': 'img/terrain/ter_16.webp',
  'ter-17': 'img/terrain/ter_17.webp',
  'ter-18': 'img/terrain/ter_18.webp',
  'ter-19': 'img/terrain/ter_19.webp',
  'ter-20': 'img/terrain/ter_20.webp',
  'ter-21': 'img/terrain/ter_21.webp',
  'ter-22': 'img/terrain/ter_22.webp',
  'ter-23': 'img/terrain/ter_23.webp',
  'ter-24': 'img/terrain/ter_24.webp',
  'ter-25': 'img/terrain/ter_25.webp',
  'ter-26': 'img/terrain/ter_26.webp',
  'ter-27': 'img/terrain/ter_27.webp',
  'ter-28': 'img/terrain/ter_28.webp',
  'ter-29': 'img/terrain/ter_29.webp',
  'ter-30': 'img/terrain/ter_30.webp',
  'ter-31': 'img/terrain/ter_31.webp',
  'ter-32': 'img/terrain/ter_32.webp',
  'sah_seq_1': 'img/anim_seq/sah_seq_1.webp',
  'sah_seq_2': 'img/anim_seq/sah_seq_2.webp',
  'sah_seq_3': 'img/anim_seq/sah_seq_3.webp',
  'sah_seq_4': 'img/anim_seq/sah_seq_4.webp',
  'viper_seq_1': 'img/anim_seq/viper_seq_1.webp',
  'viper_seq_2': 'img/anim_seq/viper_seq_2.webp',
  'viper_seq_3': 'img/anim_seq/viper_seq_3.webp',
  'viper_seq_4': 'img/anim_seq/viper_seq_4.webp',
  'kom_seq_1': 'img/anim_seq/kom_seq_1.webp',
  'kom_seq_2': 'img/anim_seq/kom_seq_2.webp',
  'kom_seq_3': 'img/anim_seq/kom_seq_3.webp',
  'kom_seq_4': 'img/anim_seq/kom_seq_4.webp',
  'drake_seq_1': 'img/anim_seq/drake_seq_1.webp',
  'drake_seq_2': 'img/anim_seq/drake_seq_2.webp',
  'drake_seq_3': 'img/anim_seq/drake_seq_3.webp',
  'drake_seq_4': 'img/anim_seq/drake_seq_4.webp',
  'strip_sahmeran_10f': 'img/anim_seq/strip_sahmeran_10f.webp',
  'strip_komutan_10f': 'img/anim_seq/strip_komutan_10f.webp',
  'strip_viper_10f': 'img/anim_seq/strip_viper_10f.webp',
  'strip_drake_10f': 'img/anim_seq/strip_drake_10f.webp',
  'strip_golem_10f': 'img/anim_seq/strip_golem_10f.webp',
  'strip_oracle_10f': 'img/anim_seq/strip_oracle_10f.webp',
  'strip_behemoth_10f': 'img/anim_seq/strip_behemoth_10f.webp',
  'strip_wyvern_10f': 'img/anim_seq/strip_wyvern_10f.webp',
});


Object.assign(ASSETS, {
  'npc-sahmeran': 'img/sahmeran/sahmeran_idle_1.webp',
  'npc-sahmeran-yakın': 'img/sahmeran/sahmeran_closeup.webp',
  'npc-sahmeran-tanrica': 'img/extreme/sah_ex_ascended.webp',
  'npc-komutan': 'img/komutan/komutan_idle_1.webp',
  'npc-komutan-yakin': 'img/komutan/komutan_closeup.webp',
  'npc-komutan-mavikor': 'img/extreme/kom_ex_ascended.webp',
  'npc-sirca-golem': 'img/extreme/sub_sirca_golem_1.webp',
  'npc-engerek-rahibe': 'img/extreme/sub_oracle_1.webp',
  'npc-magma-behemoth': 'img/extreme/sub_behemoth_1.webp',
  'npc-alfa-wyvern': 'img/extreme/sub_alpha_wyvern_1.webp',
  'cut-kalgarot-supernova': 'img/extreme/cut_kalgarot_supernova.webp',
  'cut-kalgarot-meteor': 'img/extreme/cut_kalgarot_meteor.webp',
  'cut-sahmeran-tsunami': 'img/extreme/cut_sahmeran_tsunami.webp',
  'cut-sahmeran-petrify': 'img/extreme/cut_sahmeran_petrify.webp',
  'cut-karabela-eclipse': 'img/extreme/cut_karabela_eclipse.webp',
  'cut-kulyutan-cataclysm': 'img/extreme/cut_kulyutan_cataclysm.webp',
});

// V18: 17 Özel El Çizimi UI İkonu, Kadran, Pusula ve Boss Arması
Object.assign(ASSETS, {
  'ui_skill_plus1': 'img/ui/ui_skill_plus1.webp',
  'ui_skill_plus2': 'img/ui/ui_skill_plus2.webp',
  'ui_skill_trident': 'img/ui/ui_skill_trident.webp',
  'ui_skill_heavy': 'img/ui/ui_skill_heavy.webp',
  'ui_skill_crater': 'img/ui/ui_skill_crater.webp',
  'ui_skill_wing': 'img/ui/ui_skill_wing.webp',
  'ui_skill_shield': 'img/ui/ui_skill_shield.webp',
  'ui_skill_heal': 'img/ui/ui_skill_heal.webp',
  'ui_skill_pow': 'img/ui/ui_skill_pow.webp',
  'ui_dial_frame': 'img/ui/ui_dial_frame.webp',
  'ui_wind_rose': 'img/ui/ui_wind_rose.webp',
  'ui_crest_sahmeran': 'img/ui/ui_crest_sahmeran.webp',
  'ui_crest_kalgarot': 'img/ui/ui_crest_kalgarot.webp',
  'ui_seal_normal': 'img/ui/ui_seal_normal.webp',
  'ui_seal_zor': 'img/ui/ui_seal_zor.webp',
  'ui_seal_kabus': 'img/ui/ui_seal_kabus.webp',
  'ui_plaque_frame': 'img/ui/ui_plaque_frame.webp',
  // V22: 80 Nano Banana El Boyaması Arayüz, Eylem, Yumurta, Moral, Kart ve Kozmetik İkonları
  'ic-zindan': 'img/ic-zindan.webp',
  'ic-konak': 'img/ui/ic-konak.webp',
  'ic-ors': 'img/ui/ic-ors.webp',
  'ic-divan': 'img/ui/ic-divan.webp',
  'ic-kunye': 'img/ui/ic-kunye.webp',
  'ic-pence': 'img/ui/ic-pence.webp',
  'ic-nefes': 'img/ui/ic-nefes.webp',
  'ic-kukre': 'img/ui/ic-kukre.webp',
  'ic-savun': 'img/ui/ic-savun.webp',
  'ic-teslim': 'img/ui/ic-teslim.webp',
  'ic-card': 'img/ui/ic-card.webp',
  'ic-sofra': 'img/ui/ic-sofra.webp',
  'ic-kaplica': 'img/ui/ic-kaplica.webp',
  'ic-kervan': 'img/ui/ic-kervan.webp',
  'ic-sancak': 'img/ui/ic-sancak.webp',
  'item-yadigar': 'img/ui/item-yadigar.webp',
  'ui-M': 'img/ui/ui-m.webp',
  'ui-F': 'img/ui/ui-f.webp',
  // V23: Sonsuz Gençlik İksiri, Kader Çarkı, Oyuncu Bedesteni ve Ejder Topçusu PvP Arenaları
  'ik-genclik': 'img/ui/ik-genclik.webp',
  'food-genclik': 'img/ui/ik-genclik.webp',
  'wheel-frame': 'img/ui/wheel-frame.webp',
  'wheel-center': 'img/ui/wheel-center.webp',
  'bg-bedesten': 'img/bg-bedesten.webp',
  'bedesten-banner': 'img/ui/bedesten-banner.webp',
  'npc-bedesten': 'img/npc-bedesten.webp',
  'pazar-bedesten': 'img/iso/pazar-bedesten.webp',
  'ic-bedesten': 'img/ui/ic-bedesten.webp',
  'ic-pvp-topcu': 'img/ui/ic-pvp-topcu.webp',
  'pvp-bg-skybridge': 'img/minigame/pvp_bg_skybridge.webp',
  'pvp-bg-forge': 'img/minigame/pvp_bg_forge.webp',
  'pvp-bg-glacier': 'img/minigame/pvp_bg_glacier.webp',
  'pvp-bg-fungal': 'img/minigame/pvp_bg_fungal.webp',
  'pvp-bg-sandstorm': 'img/minigame/pvp_bg_sandstorm.webp',
  'pvp-bg-tesla': 'img/minigame/pvp_bg_tesla.webp',
  'pvp-prop-barrel': 'img/minigame/pvp_prop_barrel.webp',
  'pvp-prop-crate': 'img/minigame/pvp_prop_crate.webp',
  'pvp-prop-bumper': 'img/minigame/pvp_prop_bumper.webp',
  'pvp-prop-vortex': 'img/minigame/pvp_prop_vortex.webp',
  'pvp-prop-portal': 'img/minigame/pvp_prop_portal.webp',
  'pvp-prop-tesla': 'img/minigame/pvp_prop_tesla.webp',
});

for (const e of ['ates', 'buz', 'firtina', 'toprak', 'golge']) ASSETS['egg-' + e] = `img/ui/egg-${e}.webp`;
for (let m = 0; m < 5; m++) ASSETS['ui-mood-' + m] = `img/ui/ui-mood-${m}.webp`;
for (const k of ['gold', 'un', 'heart', 'moon', 'flame', 'skull', 'sound', 'mute', 'book', 'q', 'sword', 'shield', 'scroll', 'crown', 'anvil', 'tree', 'm', 'f', 'target', 'chat', 'check', 'fast', 'left', 'right', 'x']) {
  ASSETS['ui-' + k] = `img/ui/ui-${k}.webp`;
}
for (const k of ['kilim', 'cicekh', 'run', 'kaide', 'kivilcim', 'kar', 'kelebek', 'yildiz', 'cicektac', 'sorguc', 'altintac', 'bandana', 'can', 'nazar', 'kurdele', 'halka']) {
  ASSETS['cos-' + k] = `img/ui/cos-${k}.webp`;
}
for (const k of ['alev_yagmuru', 'buz_zirh', 'yildirim', 'sarsinti', 'golge_adim', 'son_nefes', 'kukreyen_yurek', 'celik_pence', 'kanat_kalkan', 'kara_alev', 'ayaz_tayfi', 'kadim_buzul', 'lav_seli']) {
  ASSETS['card-' + k] = `img/ui/card-${k}.webp`;
}
