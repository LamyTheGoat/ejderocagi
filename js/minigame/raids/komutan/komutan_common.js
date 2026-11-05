/* ============================================================================
   ZİNDAN II EKLENTİSİ: YANARDAĞ KALDERASI & BAŞKOMUTAN KARA KOR EJDERİ KALGAROT
   (js/minigame/raids/raid_komutan.js)
   ============================================================================ */

const KOMUTAN_NORMAL_STAGES = [
  { stage: 1, name: "Aşama 1 · Yanık Bazalt Yolu & Kül Boğazı", sub: "Öncü Lejyon: Zırhlı Magma Drakeleri & Volkanik Lav Totemi", bgKey: "kom_bg_gate", bgUrl: "img/komutan/komutan_gate_bg.webp", desc: "Cehennem Kapısı'nı tutan Zırhlı Magma Drakelerini, Lav Totemini ve patlayıcı Magma Çekirdeklerini imha et!", preset: "kom_1" },
  { stage: 2, name: "Aşama 2 · Kaynayan Lav Şelaleleri & Köprü", sub: "Uçan Kor-Kanat Wyvern'leri, Bazalt Sarkıtlar & Lav Denizi", bgKey: "kom_bg_bridge", bgUrl: "img/komutan/komutan_bridge_bg.webp", desc: "Kaynayan magma denizinin üstündeki kırılgan obsidiyen köprüleri yık, Wyvern ve Drakeleri lavlara göm!", preset: "kom_2" },
  { stage: 3, name: "Aşama 3 · Kızıl Krater İni & Ejder Mezarlığı", sub: "İkiz Kül Wyvern Muhafızları, Elit Kor Drake & Lav Totemi", bgKey: "kom_bg_crater", bgUrl: "img/komutan/komutan_crater_bg.webp", desc: "Düşmüş dev ejderha iskeletlerinin arasındaki krater terasında Kalgarot'un iç muhafız sürüsünü yar!", preset: "kom_3" },
  { stage: 4, name: "Aşama 4 · Başkomutan Kara Kor Ejderi Kalgarot", sub: "Kaldera Mabedi: Faz I Magma Nefesi · Faz II Kanat Kasırgası · Faz III Kıyamet Çekirdeği", bgKey: "kom_bg_sanctum", bgUrl: "img/komutan/komutan_sanctum_bg.webp", desc: "Korkunç ve devasa Kara Kor Ejderi Kalgarot ile ölüm kalım savaşı! Göğsündeki Açık Kor Kalbini (x2.7 Kritik) hedef al!", preset: "kom_boss" }
];

const KOMUTAN_EXTREME_STAGES = [
  { stage: 1, name: "Aşama 1/12 · Yanık Bazalt Surları", sub: "Ekstrem Öncü Lejyon: Zırhlı Magma Drakeleri & Magma Küreleri", bgKey: "kom_bg_gate", bgUrl: "img/komutan/komutan_gate_bg.webp", desc: "Ekstrem Sefer (1/12): Cehennem Kapısı önündeki Zırhlı Magma Drakelerini patlayıcı kürelerle imha et!", preset: "kom_1" },
  { stage: 2, name: "Aşama 2/12 · Kül Boğazı & Lav Gayzerleri", sub: "Fışkıran Lav Gayzerleri, Kor Drakeler & POW Sunağı", bgKey: "kom_bg_gate", bgUrl: "img/komutan/komutan_gate_bg.webp", desc: "Ekstrem Sefer (2/12): Yerdeki Lav Gayzerlerinden kaçın, POW Sunağını vurarak öfkeni doldur!", preset: "kom_ex_2" },
  { stage: 3, name: "Aşama 3/12 · [ARA-BOSS I] Zırhlı Magma Behemoth", sub: "Yıkık Kadim Ejderha Örsü & Demirhane Mahzeni", bgKey: "ex_kom_forge_bg", bgUrl: "img/extreme/ex_kom_forge_bg.webp", desc: "Ekstrem Ara-Boss (3/12): Dev Zırhlı Magma Behemoth yer sarsıntısıyla yürüyor! Sarkıtları ve kraterleri kullan!", preset: "kom_ex_3_subboss" },
  { stage: 4, name: "Aşama 4/12 · Kaynayan Lav Şelaleleri", sub: "Uçan Kor-Kanat Wyvern Sürüsü & Çöken Obsidiyen Köprü", bgKey: "kom_bg_bridge", bgUrl: "img/komutan/komutan_bridge_bg.webp", desc: "Ekstrem Sefer (4/12): Kırılgan obsidiyen kemerlerin üstündeki Wyvern ve Drakeleri lav denizine göm!", preset: "kom_2" },
  { stage: 5, name: "Aşama 5/12 · Mühürlü Zincir Kemerleri", sub: "Obsidiyen Zincir Sütunları & Elit Magma Drakeleri", bgKey: "kom_bg_bridge", bgUrl: "img/komutan/komutan_bridge_bg.webp", desc: "Ekstrem Sefer (5/12): Düşmanlara kalkan veren Mühürlü Zincir Sütunlarını kırarak geri tepme hasarı vur!", preset: "kom_ex_5" },
  { stage: 6, name: "Aşama 6/12 · [ARA-BOSS II] Kızıl Kasırga Alfa Wyvern", sub: "Dört Kanatlı Fırtına Ejderi & Lav Gayzerleri", bgKey: "kom_bg_crater", bgUrl: "img/komutan/komutan_crater_bg.webp", desc: "Ekstrem Ara-Boss (6/12): Gökyüzünü ateşe veren 4 kanatlı Kızıl Kasırga Alfa Wyvern'i avla!", preset: "kom_ex_6_subboss" },
  { stage: 7, name: "Aşama 7/12 · Ejder Kemikleri Mezarlığı", sub: "Kıdemli Kor Drakeler, Çifte Lav Totemi & Meteor Kraterleri", bgKey: "kom_bg_crater", bgUrl: "img/komutan/komutan_crater_bg.webp", desc: "Ekstrem Sefer (7/12): Mavi-Kor Meteor Kraterlerini patlatarak içerdeki Drake sürüsünü temizle!", preset: "kom_3" },
  { stage: 8, name: "Aşama 8/12 · Otuz Yıllık Zincir Anıtı", sub: "Magma Behemoth + Uçan Wyvern + Zincir Sütunu", bgKey: "ex_kom_forge_bg", bgUrl: "img/extreme/ex_kom_forge_bg.webp", desc: "Ekstrem Sefer (8/12): Dedenin otuz yıl önce mühürlediği Zincir Anıtı'nda Behemoth ve Wyvern pususu!", preset: "kom_ex_8" },
  { stage: 9, name: "Aşama 9/12 · [ARA-BOSS III] İkiz Kaldera Muhafızları", sub: "Zırhlı Magma Behemoth & Kızıl Kasırga Alfa Wyvern Aynı Anda!", bgKey: "ex_kom_forge_bg", bgUrl: "img/extreme/ex_kom_forge_bg.webp", desc: "Ekstrem Ara-Boss (9/12): Hem karadan Magma Behemoth hem havadan Alfa Wyvern saldırıyor!", preset: "kom_ex_9_subboss" },
  { stage: 10, name: "Aşama 10/12 · Kül Yutan'ın Mühürlü Sunağı", sub: "3 Elit Kor Drake + 2 Volkanik Lav Totemi + Lav Gayzerleri", bgKey: "kom_bg_sanctum", bgUrl: "img/komutan/komutan_sanctum_bg.webp", desc: "Ekstrem Sefer (10/12): Kaldera Sunağını koruyan 3 Elit Drake ve 2 Lav Totemini yık!", preset: "kom_ex_10" },
  { stage: 11, name: "Aşama 11/12 · Başkomutanın Muhafız Lejyonu", sub: "Alfa Wyvern + Magma Behemoth + Zincir Sütunları", bgKey: "ex_kom_bluecore_bg", bgUrl: "img/extreme/ex_kom_bluecore_bg.webp", desc: "Ekstrem Sefer (11/12): Kalgarot'un tahtı önündeki son muhafız ordusunu yar!", preset: "kom_ex_11" },
  { stage: 12, name: "Aşama 12/12 · [5 FAZLI EKSTREM BOSS] Mavi-Kor Kalgarot", sub: "Mavi-Kor Süpernova Kalderası: Meteor Dalışı · Kuyruk Depremi · Zincir Kasırgası · Mavi Cehennem Nefesi", bgKey: "ex_kom_bluecore_bg", bgUrl: "img/extreme/ex_kom_bluecore_bg.webp", desc: "EKSTREM FİNAL (12/12): 5 Fazlı Mavi-Kor Kıyamet Ejderi Kalgarot! Havalanıp Meteor Dalışı yapar, Kuyruk Depremi ve Mavi-Kor Süpernova ateşler!", preset: "kom_boss" }
];

registerRaidPlugin("komutan", {
  id: "komutan",
  normalBadge: "ZİNDAN II · 4 AŞAMA",
  extremeBadge: "CEHENNEM (KÂBUS) · 4 AŞAMA · 5 FAZ",
  normalStages: KOMUTAN_NORMAL_STAGES,
  extremeStages: KOMUTAN_EXTREME_STAGES,
  defaultPersona: "kalgarot",
  lootSet: [
    {
      id: "hat_10",
      slot: "hat",
      name: "Kara Kor Ejderboynuzu Tolgası",
      icon: "img/komutan/loot_komutan_helm.webp",
      fc: 2650,
      stats: "GÜÇ +28 · ÇEV +18 · DAY +24 · ZEK +22",
      passive: "Kalp Çekirdeği & Boynuz Kritiğine +%30 Bonus"
    },
    {
      id: "armor_10",
      slot: "armor",
      name: "Kalgarot Kor-Kaburga Zırhı",
      icon: "img/komutan/loot_komutan_armor.webp",
      fc: 3100,
      stats: "GÜÇ +32 · ÇEV +18 · DAY +30 · ZEK +22",
      passive: "Magma Kalkanı: +350 Maks HP & Ateş Direnci"
    },
    {
      id: "wpn_10",
      slot: "wpn",
      name: "Kalgarot Magma Yatağan-Teberi",
      icon: "img/komutan/loot_komutan_blade.webp",
      fc: 3250,
      stats: "GÜÇ +36 · ÇEV +20 · DAY +22 · ZEK +24",
      passive: "Krater Yıkım Çapını +%25 Büyütür & Zırh Deler"
    },
    {
      id: "tal_10",
      slot: "tal",
      name: "Kalgarot'un Sönmeyen Kor Kalbi",
      icon: "img/komutan/loot_komutan_heart.webp",
      fc: 2600,
      stats: "GÜÇ +26 · ÇEV +22 · DAY +24 · ZEK +26",
      passive: "Savaşa %60 POW Öfkesiyle Başlatır & +30 Enerji"
    },
    {
      id: "hat_12",
      slot: "hat",
      isExtreme: true,
      name: "Mavi-Kor Kıyamet Tolgası (Ekstrem)",
      icon: "img/extreme/loot_ex_kom_helm.webp",
      fc: 4100,
      stats: "GÜÇ +44 · ÇEV +28 · DAY +36 · ZEK +34",
      passive: "Mavi-Kor Zırh Delici & +%35 Kalp Çekirdeği Kritiği"
    },
    {
      id: "armor_11",
      slot: "armor",
      isExtreme: true,
      name: "Mavi-Kor Süpernova Zırhı (Ekstrem)",
      icon: "img/extreme/loot_ex_kom_armor.webp",
      fc: 4500,
      stats: "GÜÇ +46 · ÇEV +30 · DAY +48 · ZEK +36",
      passive: "+550 Maksimum HP & Süpernova Hasarını %50 Azaltır"
    },
    {
      id: "wpn_11",
      slot: "wpn",
      isExtreme: true,
      name: "Mavi-Kor Kıyamet Kılıcı (Ekstrem)",
      icon: "img/extreme/loot_ex_kom_wpn.webp",
      fc: 4650,
      stats: "GÜÇ +52 · ÇEV +32 · DAY +30 · ZEK +38",
      passive: "Atışları Mavi-Kor Süpernova Küresine Dönüştürür (+%35 Hasar)"
    },
    {
      id: "back_10",
      slot: "back",
      isExtreme: true,
      name: "Mavi-Şimşek Ejder Kanatları (Ekstrem)",
      icon: "img/extreme/loot_ex_kom_wings.webp",
      fc: 4200,
      stats: "GÜÇ +42 · ÇEV +42 · DAY +36 · ZEK +38",
      passive: "Lav Denizinden Kurtarır & Her Tur +40 Enerji"
    },
    {
      id: "face_9",
      slot: "face",
      isExtreme: true,
      name: "Mavi-Kor Kıyamet Vizörü (Ekstrem)",
      icon: "img/extreme/loot_ex_kom_mask.webp",
      fc: 3600,
      stats: "GÜÇ +32 · ÇEV +36 · DAY +28 · ZEK +40",
      passive: "Kalıcı Tam Nişan Yörüngesi & +%20 Kritik"
    }
  ],
  campaign: {
    id: "komutan",
    badge: "ZİNDAN II",
    title: "KÜL YUTAN'IN BAŞKOMUTANI: KARA KOR EJDERİ KALGAROT",
    bossName: "BAŞKOMUTAN KALGAROT",
    bossTitle: "Kül Yutan'ın Sağ Kolu · Dev Kara Kor Ejderi",
    closeupImg: "img/komutan/komutan_closeup.webp",
    enrageImg: "img/komutan/komutan_enrage.webp",
    ascendedImg: "img/extreme/kom_ex_ascended.webp",
    chestImg: "img/komutan/loot_komutan_chest.webp",
    exChestImg: "img/extreme/loot_ex_chest.webp",
    lobbyBg: "img/komutan/komutan_sanctum_bg.webp",
    corridorBg: "img/komutan/komutan_gate_bg.webp",
    nativeComicId: "komutan_prolog",
    corridorPois: {
      steleLabel: "1. Kadim Ejder İskeleti Anıtı (İncele)",
      steleDone: "Ejder İskeleti İncelendi (+%30 Kalp & Boynuz Kritik)",
      steleMsg: "Dedenin otuz yıl önce kırdığı zincir halkasını buldun: Kalgarot'un Açık Kor Kalbi ve Boynuz zayıf noktalarına +%30 ek kritik hasar!",
      brazierLabel: "2. Kül Yutan'ın Kor Ateşgedesi (Soğur)",
      brazierDone: "Kor Ateşgedesi Soğuruldu (+400 Maks HP)",
      brazierMsg: "Yavru ejderhan volkanik kor sütununu yuttu: Tüm aşamalar boyunca +400 Maksimum HP ve Lav Direnci kazanıldı!",
      gateLabel: "3. OBSİDİYEN CEHENNEM KAPISI (Mührü Kır & Aşama 1'e Gir)"
    },
    comics: [
      {
        act: "PERDE I · OTUZ YIL ÖNCEKİ MÜHÜR",
        title: "Yedi Ocak Beyinin Zincirlediği Dev Kara Kor Ejderi",
        leftBg: "img/extreme/comic_kom_ex_1.webp",
        rightBg: "img/komutan/komutan_sanctum_bg.webp",
        leftArt: "img/npc-kerim.webp",
        rightArt: "img/komutan/komutan_closeup.webp",
        leftSpeaker: "Demirci Usta Kerim & Dede'nin Hatırası",
        leftSay: "“Otuz yıl önce dedenin de aralarında olduğu yedi ulu terbiyeci, Kül Yutan'ın Başkomutanı Kalgarot'u kor zincirlerle bu kalderaya mühürlemişti!”",
        leftNarr: "Kalgarot sıradan bir yaratık değil; kanatları güneşi örten, göğüs kafesinde açık magma çekirdeği yanan devasa bir Kara Kor Ejderidir.",
        rightSpeaker: "Başkomutan Kara Kor Ejderi Kalgarot",
        rightSay: "“OTUZ YIL BOYUNCA BU ZİNCİRLERİ ERİTTİM! ŞİMDİ GÖĞSÜMDEKİ KOR YARAYLA TÜM ANADOLU'YU KÜLE ÇEVİRECEĞİM!”",
        rightNarr: "Ekstrem Modda Kalgarot'a ulaşmak için 12 aşamalı Volkanik Kaldera'yı ve 3 dev Ara-Boss'u aşmak gerekir!"
      },
      {
        act: "PERDE II · YIKIK EJDERHA ÖRSÜ & MAGMA BEHEMOTH",
        title: "Demirhane Mahzeninin Zırhlı Canavarı",
        leftBg: "img/extreme/comic_kom_ex_2.webp",
        rightBg: "img/extreme/ex_kom_forge_bg.webp",
        leftArt: "img/extreme/sub_behemoth_2.webp",
        rightArt: "img/extreme/haz_lava_geyser.webp",
        leftSpeaker: "Zırhlı Magma Behemoth (Ara-Boss I)",
        leftSay: "“KROOOAAARGH! Demirhane mahzeninin örsleri altında kemiklerin un ufak olacak!”",
        leftNarr: "Ekstrem Mod Aşama 3, 8 ve 9'da devasa Zırhlı Magma Behemoth sahneye iner ve ön toynaklarıyla deprem yaratır.",
        rightSpeaker: "Usta Kerim · Demirhane Sırrı",
        rightSay: "“Behemoth'un sırt zırhı çok kalındır ama tavandaki bazalt sarkıtları ve yerdeki Mavi-Kor Meteor Çekirdeklerini patlatırsan zırhı yarılır!”",
        rightNarr: "Ayrıca sahadaki Lav Gayzerleri her tur sonunda patlayarak dikey magma sütunları fışkırtır."
      },
      {
        act: "PERDE III · KÜL FIRTINASI & ALFA WYVERN",
        title: "Dört Kanatlı Kızıl Kasırga Alfa Wyvern",
        leftBg: "img/extreme/comic_kom_ex_3.webp",
        rightBg: "img/komutan/komutan_crater_bg.webp",
        leftArt: "img/extreme/sub_alpha_wyvern_2.webp",
        rightArt: "img/extreme/haz_chain_pillar.webp",
        leftSpeaker: "Kızıl Kasırga Alfa Wyvern (Ara-Boss II)",
        leftSay: "“Dört kanadımın rüzgârı mermilerini tersine çevirecek! Lav nehirlerinin üstünden sağ çıkamayacaksın!”",
        leftNarr: "Ekstrem Mod Aşama 6, 9 ve 11'de 4 kanatlı Kızıl Kasırga Alfa Wyvern gökyüzünden alev hortumları yağdırır.",
        rightSpeaker: "Mühürlü Zincir Sütunları",
        rightSay: "“Kalgarot'un Mühürlü Zincir Sütunlarını (haz_chain_pillar) vurup kırarsan düşmanların kalkanı çöker ve 450 şok hasarı alırlar!”",
        rightNarr: "Rehber Selin yanındayken rüzgâr sapmalarını tam yörünge çizgisiyle önceden görebilirsin."
      },
      {
        act: "PERDE IV · MAVİ-KOR SÜPERNOVA (EKSTREM FAZ IV & V)",
        title: "Göğüs Kafesinde Doğan Mavi Yıldız: Kalgarot'un Kıyamet Formu!",
        leftBg: "img/extreme/comic_kom_ex_4.webp",
        rightBg: "img/extreme/comic_kom_ex_5.webp",
        leftArt: "img/extreme/kom_ex_ascended.webp",
        rightArt: "img/extreme/kom_ex_divebomb.webp",
        leftSpeaker: "Mavi-Kor Kıyamet Ejderi Kalgarot (Faz V)",
        leftSay: "“KIZIL ATEŞ BİTTİ... ŞİMDİ GÖĞSÜMDEKİ ÇEKİRDEK MAVİ-BEYAZ YILDIZ ATEŞİYLE YANIYOR! GÖKYÜZÜNDEN METEOR GİBİ TEPENE İNECEĞİM!”",
        leftNarr: "Ekstrem Modda Kalgarot 5 faza sahiptir: Havalanıp Süpersonik Meteor Dalışı yapar, Kuyruk Depremi vurur, Kor Zincir savurur ve Mavi-Kor Cehennem Nefesi üfler!",
        rightSpeaker: "Çifte Zayıf Nokta · Mavi-Kor Yıldız Kalbi (x3.2)",
        rightSay: "“Kalgarot Faz V'te Mavi-Kor Overlord formuna geçtiğinde göğsündeki Yıldız Kalbi vurmak x3.2 Kritik Hasar verir ve Süpernova'yı bozar!”",
        rightNarr: "Dikkat: Kalgarot havalandığında bir sonraki tur Meteor Dalışı yapacaktır — Rün Kalkanını [Q] hazır tut!"
      },
      {
        act: "FİNAL PERDESİ · KIRILAN ZİNCİRLER & MAVİ-KOR MİRASI",
        title: "Başkomutanın Saygısı ve Kadim Mavi-Kor Kıyamet Seti",
        leftBg: "img/extreme/comic_kom_ex_6.webp",
        rightBg: "img/extreme/ex_kom_bluecore_bg.webp",
        leftArt: "img/extreme/kom_ex_ko.webp",
        rightArt: "img/extreme/loot_ex_chest.webp",
        leftSpeaker: "Başkomutan Kalgarot",
        leftSay: "“Hrrrgh... Otuz yıl önce deden beni zincirlemişti; sen ise Kül Yutan'ın ruhuma vurduğu esaret zincirlerini kırdın! Mavi-Kor ateşim artık senin ocağını koruyacak!”",
        leftNarr: "Devasa ejderha başını eğerek selam verirken, kırılan zincirlerin ortasında Mavi-Kor Kıyamet Hazine Sandığı belirdi.",
        rightSpeaker: "Ekstrem Kadim Mavi-Kor Kıyamet Hazinesi",
        rightSay: "“Mavi-Kor Kıyamet Tolgası, Süpernova Zırhı, Kıyamet Yaran Kılıcı, Mavi-Şimşek Kanatları ve Vizörü artık senin!”",
        rightNarr: "Ödül: Tüm Efsanevi ve Kadim Ekstrem ekipmanlar tek tıkla Terbiyeciye kuşanılabilir!"
      }
    ]
  },
  personas: {
  kalgarot: {
    id: "kalgarot",
    npc: "komutan",
    closeNpc: "komutan-yakin",
    divineNpc: "komutan-mavikor",
    bg: "bg-komutan-sanctum",
    divineBg: "bg-ex-kom-bluecore",
    portrait: SHM_ASSETS_PATHS.kom_closeup,
    title: "BAŞKOMUTAN KALGAROT",
    sub: "Kül Yutan’ın Zincir Kıran Volkanik Savaş Lordu",
    entranceRoarLine: "OTUZ YIL BOYUNCA BU ZİNCİRLERİ ERİTTİM! YEDİ OCAĞIN MÜHRÜNÜ KIRDIM! SIRA SENDE TORUN!",
    entranceSfx: "ZİNCİR KIRILIR!!",
    introPanels: (st) => [
      {
        bg: "bg-komutan-sanctum", night: 1, heat: 1, npc: "komutan", side: "r", clash: 1, shout: 1,
        speaker: "BAŞKOMUTAN KALGAROT", sfx: "ZİNCİR KIRILIR!!",
        cap: "Kaldera’nın bazalt kubbesi çöktü; otuz yıllık esaret zincirlerini eriten Kalgarot küllerden yükseldi!",
        say: "YEDİ OCAĞIN BEYİ BİRLEŞİP BENİ ANCAK MÜHÜRLEYEBİLMİŞTİ! SEN TEK BAŞINA MI KARŞIMA ÇIKIYORSUN VELET?!"
      },
      typeof D === "function" && st ? D(st, "P16", {
        bg: "bg-komutan-crater", night: 1, heat: 1, face: "r", av: ["34", "front"], sfx: "ALEV KÜKRER!!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: `${st.name} lav şelalelerinin önünde pençelerini bazalt kayaya geçirip göğe alev püskürttü!`,
        say: "Dedemin yarım bıraktığı mührü tamamlamaya geldim Kalgarot! Seni bu kraterden çıkarmayacağız!"
      }) : {
        bg: "bg-komutan-crater", night: 1, heat: 1, npc: "kerim", side: "l", sfx: "ALEV KÜKRER!!",
        speaker: "EJDER OCAĞI VARİSİ",
        cap: "Lav şelalelerinin önünde silahını doğrulttun!",
        say: "Dedemin yarım bıraktığı mührü tamamlamaya geldim Kalgarot!"
      },
      {
        bg: "bg-ex-kom-bluecore", night: 1, heat: 1, npc: "komutan-yakin", side: "l", clash: 1, shout: 1,
        speaker: "MAVİ-KOR KALGAROT", sfx: "KÜKRER!!",
        cap: "Göğsündeki açık Mavi-Kor çekirdeği yıldız ateşi gibi parladı; krater sarsıldı!",
        say: "GWAHAHAHA! KORKAKLAR GİBİ KAÇMA Kİ SENİ KÜLE ÇEVİRİRKEN KEYİF ALAYIM!"
      }
    ],
    taunts: [
      {
        sfx: "KAHKAHA!!",
        line: "GWAHAHAHA! Bu attığın kıvılcımlarla demir bile dövülmez velet! Göğsümdeki Kor Kalbi tam karşında, vurabilirsen vur!",
        replySay: "Açık bıraktığın o kor çekirdeği kendi ateşinle söndüreceğim!",
        effectDesc: "Kalgarot saldırmak yerine göğsünü yumruklayarak sana laf attı! Zayıf Nokta Açığı (+%35 Kritik) ve +25 POW Öfkesi!"
      },
      {
        sfx: "MEYDAN OKUMA!",
        line: "İhtiyar deden en azından kalkanını dik tutardı! Senin dizlerin şimdiden titriyor, terbiyeci bozuntusu!",
        replySay: "Dizlerim titremiyor, yayımı geriyorum Kalgarot!",
        effectDesc: "Kalgarot seninle alay ederek sırasını geçirdi: +30 POW Öfkesi ve +30 Enerji kazandın!"
      },
      {
        sfx: "ALAYCI KÜKREME!",
        line: "Bu tur pençemi bile kaldırmıyorum fani! Bir nefes daha al ki yenilginin bahanesi olmasın!",
        replySay: "Bu kibrin senin sonun olacak Başkomutan! Nişan al!",
        effectDesc: "Kalgarot kibirle gardını indirdi: Sıradaki Kor Kalp / Boynuz vuruşun +%35 Kritik Hasar verir!"
      },
      {
        sfx: "ZİNCİR SESİ!",
        line: "Kül Yutan’ın orduları ufukta! Senin küçük ocağın ilk ezilen karınca yuvası olacak!",
        replySay: "Ocağımıza el uzatanın pençesini kırarız!",
        effectDesc: "Kalgarot’un laf atması ejderhanı çileden çıkardı: +30 POW Öfkesi!"
      }
    ],
    attackLines: [
      "CEHENNEM YARILACAK! KÜL OLUN!",
      "MAVİ-KOR YILDIZ ATEŞİ SİZİ ERİTECEK!",
      "ZIRHINIZ DA KALKANINIZ DA BAZALT GİBİ ÇATLAYACAK!"
    ],
    weakHitLines: [
      "GRAAAH!! Kor çekirdeğime nasıl ulaştın?!",
      "Lanet olsun… bu darbe dedenin çekici gibi indi!",
      "Beni sarsabileceğini mi sanıyorsun velet?!"
    ],
    missLines: [
      "HAHAHA! Dağ kadar cüssemi bile ıskaladın!",
      "Volkanın dumanı gözünü mü yaşarttı küçük terbiyeci?!"
    ]
  },

  sub_behemoth: {
    id: "sub_behemoth",
    npc: "magma-behemoth",
    closeNpc: "magma-behemoth",
    bg: "bg-ex-kom-forge",
    portrait: SHM_ASSETS_PATHS.sub_behemoth_1,
    title: "ZIRHLI MAGMA BEHEMOTH",
    sub: "Ara-Boss I · Ejder Örsü’nün Yaşayan Kuşatma Devi",
    entranceRoarLine: "KROOOAARGH! ÖRSÜN ATEŞİ SİZİ ERİTECEK! ZIRHIMI HİÇBİR TOP DELİP GEÇEMEZ!",
    entranceSfx: "GÜMBÜRTÜ!!",
    introPanels: (st) => [
      {
        bg: "bg-ex-kom-forge", night: 1, heat: 1, npc: "magma-behemoth", side: "r", clash: 1, shout: 1,
        speaker: "ZIRHLI MAGMA BEHEMOTH", sfx: "GÜMBÜRTÜ!!",
        cap: "Yıkık Ejder Örsü mahzeninin zemini sarsıldı; lav kanallarından devasa zırhlı Behemoth yükseldi!",
        say: "KROOOAARGH! KALGAROT’UN DEMİRHANESİNDEN SAĞ ÇIKAMAZSINIZ! SİZİ ÖRSÜN ÜSTÜNDE EZECEĞİM!"
      },
      typeof D === "function" && st ? D(st, "P7", {
        bg: "bg-komutan-bridge", night: 1, heat: 1, face: "r", av: ["34", "front"], sfx: "KARŞI KÜKREME!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: `${st.name} dev Behemoth'un karşısında geri adım atmadı!`,
        say: "Zırhın ne kadar kalın olursa olsun, sırtındaki kor yarığını patlatacağız!"
      }) : {
        bg: "bg-komutan-bridge", night: 1, heat: 1, npc: "kerim", side: "l", sfx: "DEMİRCİ GÖZÜ!",
        speaker: "USTA KERİM",
        cap: "Usta Kerim çekicini doğrulttu.",
        say: "Başındaki zırh plakalarının birleşim yeri açıkta, tam oraya nişan al!"
      }
    ],
    taunts: [
      {
        sfx: "ZIRH GÜMBÜRTÜSÜ!",
        line: "GWAHAHA! O KÜÇÜK MERMİLERİNİZ BAZALT ZIRHIMI GIDIKLIYOR BİLE DEĞİL! DAHA SERT VURUN!",
        replySay: "Zırhının çatlağından içeri kor mermisi girdiğinde de gülebilecek misin bakalım?!",
        effectDesc: "Magma Behemoth göğüs zırhına vurarak laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 Öfke!"
      },
      {
        sfx: "KÜKRER!!",
        line: "KALGAROT SİZİNLE UĞRAŞMAYA TENEZZÜL BİLE ETMEZ! BEN TEK BAŞIMA YETERİM!",
        replySay: "Önce seni devirelim, sonra Başkomutanına selamımızı iletiriz!",
        effectDesc: "Behemoth saldırmak yerine böbürlendi: +25 POW Öfkesi ve +25 Enerji!"
      }
    ],
    attackLines: [
      "MAGMA GÜLLESİ! EZEN YUMRUK!",
      "LAV DALGASI SİZİ YUTACAK!"
    ],
    weakHitLines: [
      "GRAAAH! ZIRH PLAKAM ÇATLADI!",
      "KOR YARIĞIMA NASIL İSABET ETTİRDİN?!"
    ],
    missLines: [
      "GWAHAHA! BU KADAR İRİ BİR HEDEFİ BİLE VURAMADIN!",
      "MERMİN KAYALARA ÇARPIP ERİDİ!"
    ]
  },

  sub_alpha_wyvern: {
    id: "sub_alpha_wyvern",
    npc: "alfa-wyvern",
    closeNpc: "alfa-wyvern",
    bg: "bg-komutan-bridge",
    portrait: SHM_ASSETS_PATHS.sub_alpha_wyvern_1,
    title: "KIZIL KASIRGA ALFA WYVERN",
    sub: "Ara-Boss II · Dört Kanatlı Kaldera Gök Avcısı",
    entranceRoarLine: "SKREEEAAAH! GÖKYÜZÜ BENİM AV SAHAMDIR! YERDE SÜRÜNENLER BANA DOKUNAMAZ!",
    entranceSfx: "KASIRGA!!",
    introPanels: (st) => [
      {
        bg: "bg-komutan-bridge", night: 1, heat: 1, npc: "alfa-wyvern", side: "r", clash: 1, shout: 1,
        speaker: "KIZIL KASIRGA ALFA WYVERN", sfx: "KASIRGA!!",
        cap: "Kül bulutlarını yaran dört kanatlı Alfa Wyvern, kor fırtınasıyla köprünün üstüne süzüldü!",
        say: "SKREEEAAAH! KANATLARIMIN RÜZGÂRI BİLE MERMİLERİNİZİ SAVURMAYA YETER! GÖKYÜZÜNDE BANA KİM DOKUNABİLİR?!"
      },
      typeof D === "function" && st ? D(st, "P16", {
        bg: "bg-komutan-crater", night: 1, heat: 1, face: "r", av: ["34", "front"], sfx: "GÖK ATIŞI!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: `${st.name} kanatlarını açıp rüzgâr akımını dengeledi!`,
        say: "Rüzgârı okumak bizim işimiz! Seni o bulutlardan aşağı indireceğiz!"
      }) : {
        bg: "bg-komutan-crater", night: 1, heat: 1, npc: "kuzey", side: "l", sfx: "RÜZGÂR OKUMA!",
        speaker: "KUZEY RÜZGÂRI",
        cap: "Kuzey yayını gökyüzüne kaldırdı.",
        say: "Kanat çırpışının duraksadığı anda boynuzuna nişan al!"
      }
    ],
    taunts: [
      {
        sfx: "ALAYCI ÇIĞLIK!",
        line: "SKREEE-HAHA! AŞAĞIDA KARINCALAR GİBİ KOŞUŞMANIZ ÇOK EĞLENCELİ! YUKARIYA NİŞAN ALABİLECEK MİSİNİZ?!",
        replySay: "Kanatlarını o kadar açtığına pişman olacaksın Alfa Wyvern!",
        effectDesc: "Alfa Wyvern havada süzülerek laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 Öfke!"
      },
      {
        sfx: "KANAT FIRTINASI!",
        line: "RÜZGÂR BENİM EMRİMDE! ATTIĞINIZ HER OK KENDİ BAŞINIZA DÜŞECEK!",
        replySay: "Rüzgârı hesaba kattık bile, sıkı dur!",
        effectDesc: "Alfa Wyvern saldırmak yerine alay etti: +25 POW Öfkesi ve +25 Enerji!"
      }
    ],
    attackLines: [
      "KIZIL KASIRGA DALIŞI! YANIN!",
      "GÖKTEN KOR YAĞMURU İNİYOR!"
    ],
    weakHitLines: [
      "SKREEE—!! KANADIMIN ZIRHI DELİNDİ!",
      "BU RÜZGÂRDA BENİ NASIL VURDUNUZ?!"
    ],
    missLines: [
      "SKREEE-HAHA! RÜZGÂRIM MERMİNİ SAVURDU!",
      "GÖKYÜZÜNDEKİ GÖLGEMİ BİLE YAKALAYAMAZSIN!"
    ]
  },
  },
  dramaticAttacks: {
  divebomb: {
    key: "divebomb",
    title: "METEOR DALIŞI & KALDERA ÇÖKÜŞÜ",
    ono: "METEOR DALIŞI!!",
    line: "GÖKYÜZÜNDEN METEOR GİBİ TEPENE İNİYORUM! KAÇACAK YERİN YOK!",
    hint: "[F] Kanat Uçuşu ile kraterden çık veya [Q] Rün Kalkanı aç!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_meteor,
    poseImg: SHM_ASSETS_PATHS.kom_ex_divebomb,
    glow: "#ef7f3e",
    el: "ates",
    vp: "64% 42%"
  },
  tailslam: {
    key: "tailslam",
    title: "OBSİDİYEN KUYRUK DEPREMİ",
    ono: "KUYRUK DEPREMİ!!",
    line: "OBSİDİYEN KUYRUK DEPREMİ! YER AYAĞININ ALTINDAN KAYACAK!",
    hint: "Sismik şok dalgası 3 krater açar — yüksek zeminde kal!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_meteor,
    poseImg: SHM_ASSETS_PATHS.kom_ex_tailslam,
    glow: "#ea580c",
    el: "toprak",
    vp: "62% 48%"
  },
  chainwhip: {
    key: "chainwhip",
    title: "OTUZ YILLIK KOR ZİNCİR KASIRGASI",
    ono: "ZİNCİR DARBESİ!!",
    line: "OTUZ YILLIK KOR ZİNCİRLERİM SENİ VE EJDERHANI BİÇECEK!",
    hint: "Kızgın demir zincir lazeri doğrudan nişan alır — siper al!",
    bg: SHM_ASSETS_PATHS.cut_kulyutan_cataclysm,
    poseImg: SHM_ASSETS_PATHS.kom_ex_chainwhip,
    glow: "#ef7f3e",
    el: "ates",
    vp: "66% 45%"
  },
  bluefire: {
    key: "bluefire",
    title: "MAVİ-KOR CEHENNEM PLAZMASI",
    ono: "MAVİ-KOR ATEŞİ!!",
    line: "MAVİ-KOR CEHENNEM NEFESİ! BU ALEV ZIRHLARI BİLE ERİTİR!",
    hint: "Göğsündeki Mavi Yıldız Çekirdeğini vurarak plazmayı dağıt!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_supernova,
    poseImg: SHM_ASSETS_PATHS.kom_ex_bluefire,
    glow: "#7eb8d8",
    el: "firtina",
    vp: "68% 42%"
  },
  supernova: {
    key: "supernova",
    title: "SÜPERNOVA KIYAMET ÇEKİRDEĞİ",
    ono: "SÜPERNOVA!!",
    line: "KALDERA'NIN KALBİ PATLIYOR! MAVİ-KOR SÜPERNOVA KIYAMETİ!",
    hint: "Gökyüzünden 3 dalga Mavi-Kor meteoru ve lazeri iniyor!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_supernova,
    poseImg: SHM_ASSETS_PATHS.kom_ex_supernova,
    glow: "#7eb8d8",
    el: "firtina",
    vp: "66% 40%"
  },
  sub_behemoth_eruption: {
    key: "sub_behemoth_eruption",
    title: "BAZALT VOLKAN PÜSKÜRMESİ",
    ono: "MAGMA PÜSKÜRMESİ!!",
    line: "SIRTIMDAKİ YANARDAĞ PATLIYOR! KIZGIN LAVLAR ALTINDA KAL!",
    hint: "Magma Behemoth volkanik şok dalgası ve 2 lav kayası fırlattı!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_meteor,
    poseImg: SHM_ASSETS_PATHS.sub_behemoth_2,
    glow: "#ef7f3e",
    el: "ates",
    vp: "64% 46%"
  },
  sub_wyvern_storm: {
    key: "sub_wyvern_storm",
    title: "SÜPERSONİK ALEV KASIRGASI",
    ono: "ALEV KASIRGASI!!",
    line: "KIZIL KASIRGA DALIŞI! GÖKTEN ÜÇLÜ KOR YAĞMURU İNİYOR!",
    hint: "Alfa Wyvern yüksek irtifadan 3'lü magma dalgası yağdırıyor!",
    bg: SHM_ASSETS_PATHS.cut_kalgarot_supernova,
    poseImg: SHM_ASSETS_PATHS.sub_alpha_wyvern_2,
    glow: "#7eb8d8",
    el: "firtina",
    vp: "66% 40%"
  },
  },


  paintTerrain(tctx, hMap, W, H) {
    for (let x = 0; x < W; x++) {
      const topY = Math.round(hMap[x]);
      const blockWave = Math.sin(x * 0.038) * 3 + Math.cos(x * 0.09) * 1.5;
      tctx.fillStyle = "#3a241b";
      tctx.fillRect(x, topY, 1, 6);
      tctx.fillStyle = (Math.sin(x * 0.07) > 0.65) ? "#c95a26" : "#261813";
      tctx.fillRect(x, topY + 6, 1, 9 + Math.round(blockWave));

      const grad = tctx.createLinearGradient(0, topY + 15, 0, H);
      grad.addColorStop(0, "#211612");
      grad.addColorStop(0.35, "#18100d");
      grad.addColorStop(0.75, "#120b09");
      grad.addColorStop(1, "#080504");
      tctx.fillStyle = grad;
      tctx.fillRect(x, topY + 15, 1, H - topY - 15);
    }
    const rockTex = SHM_IMAGES.terrain_kaldera_rock;
    if (rockTex && rockTex.complete && rockTex.naturalWidth > 0) {
      tctx.save();
      tctx.globalCompositeOperation = "source-atop";
      const tw = 860, th = 480;
      for (let tx = 0; tx < W; tx += tw) {
        for (let ty = 520; ty < H; ty += th) {
          tctx.drawImage(rockTex, tx, ty, tw, th);
        }
      }
      tctx.globalCompositeOperation = "source-atop";
      for (let x = 0; x < W; x++) {
        const topY = Math.round(hMap[x]);
        tctx.fillStyle = "#4a2c20";
        tctx.fillRect(x, topY, 1, 6);
        tctx.fillStyle = "#1e120d";
        tctx.fillRect(x, topY + 6, 1, 5);
      }
      tctx.restore();
    } else if (rockTex && !rockTex._boundReinit) {
      rockTex._boundReinit = true;
      rockTex.onload = () => {
        if (SHM.open && SHM.screen === "battle") {
          initSahmeranBattleStage(SHM.selectedStage);
        }
      };
    }
    rebuildHeightMapFromCanvas();
  },
});
