/* ============================================================================
   ZİNDAN I EKLENTİSİ: SIRÇA SARAYI & YILAN KRALİÇE ŞAHMERAN
   (js/minigame/raids/raid_sahmeran.js)
   ============================================================================ */

const SAHMERAN_NORMAL_STAGES = [
  { stage: 1, name: "Aşama 1 · Tarsus Kehribar Kuyusu", sub: "Öncü Karakol: Bronz Engerek Muhafızları & Zümrüt Şifa Totemi", bgKey: "bg_gate", bgUrl: "img/sahmeran/sahmeran_gate_bg.webp", desc: "Sırça Kapısı'nın önündeki Selçuklu taş köprüsünü tutan öncü Kobra Savaşçılarını ve Şifa Totemini yık!", preset: "sah_1" },
  { stage: 2, name: "Aşama 2 · Sırça Köprü & Zümrüt Şelale", sub: "Uçan Sırça Engerekleri, Kehribar Sarkıtları & Asit Gölü Geçidi", bgKey: "bg_bridge", bgUrl: "img/sahmeran/sahmeran_bridge_bg.webp", desc: "Kırılgan kristal köprülerde uçan engerekleri avla; tavandaki kehribar sarkıtları düşmanların tepesine indir!", preset: "sah_2" },
  { stage: 3, name: "Aşama 3 · Sırça Kristal Mahzeni (Ara-Boss)", sub: "Camasb'ın Mühürlü Sırça Mahzeni: Dev Sırça Kristal Golemi", bgKey: "ex_sah_vault_bg", bgUrl: "img/extreme/ex_sah_vault_bg.webp", desc: "Taht odasının mühürlü kapısını koruyan dev Sırça Kristal Yılan-Golemi ve Sırça Yansıtma Aynalarını parçala!", preset: "sah_ex_3_subboss" },
  { stage: 4, name: "Aşama 4 · Yılan Kraliçe Şahmeran (Final Boss)", sub: "Sırça Saray İç Mabedi: Faz I Nöbet · Faz II Kızıl Taç · Faz III Yılan Kıyameti", bgKey: "bg_sanctum", bgUrl: "img/sahmeran/sahmeran_bg.webp", desc: "Yılan Kraliçe Şahmeran'ın destansı sınavı! Altın Tacını hedef al ve sarkıtları düşür!", preset: "sah_boss" }
];

const SAHMERAN_EXTREME_STAGES = [
  { stage: 1, name: "Aşama 1/9 · Tarsus Çöken Kuyu Girişi", sub: "Ekstrem Öncü Hat: Zırhlı Kobralar & Patlayan Zehir Kozaları", bgKey: "bg_gate", bgUrl: "img/sahmeran/sahmeran_gate_bg.webp", desc: "Ekstrem Sefer (1/9): Patlayan kehribar zehir kozalarını vurarak Kobra muhafızlarını havaya uçur!", preset: "sah_ex_1" },
  { stage: 2, name: "Aşama 2/9 · Zümrüt Asit Şelaleleri", sub: "Fışkıran Asit Gayzerleri & Uçan Sırça Engerekleri", bgKey: "bg_bridge", bgUrl: "img/sahmeran/sahmeran_bridge_bg.webp", desc: "Ekstrem Sefer (2/9): Her tur fışkıran Zümrüt Asit Gayzerlerine dikkat et ve Uçan Engerekleri düşür!", preset: "sah_ex_2" },
  { stage: 3, name: "Aşama 3/9 · [ARA-BOSS I] Sırça Kristal Golemi", sub: "Camasb'ın Mühürlü Sırça Mahzeni & Yansıtma Aynaları", bgKey: "ex_sah_vault_bg", bgUrl: "img/extreme/ex_sah_vault_bg.webp", desc: "Ekstrem Ara-Boss (3/9): Dev Sırça Kristal Yılan-Golemi ve onu koruyan Sırça Yansıtma Aynalarını parçala!", preset: "sah_ex_3_subboss" },
  { stage: 4, name: "Aşama 4/9 · Kehribar Sarkıtlar Koridoru", sub: "Kıdemli Kobra Muhafız Alayı & 6 Dev Tavan Sarkıtı", bgKey: "bg_gate", bgUrl: "img/sahmeran/sahmeran_gate_bg.webp", desc: "Ekstrem Sefer (4/9): Tavandaki 6 dev kehribar sarkıtı yüksek açılı atışlarla Kobra Alayının tepesine yık!", preset: "sah_ex_4" },
  { stage: 5, name: "Aşama 5/9 · [ARA-BOSS II] Engerek Başrahibesi", sub: "Zehirli Buhurdan Divanı & Çifte Zümrüt Şifa Totemi", bgKey: "ex_sah_vault_bg", bgUrl: "img/extreme/ex_sah_vault_bg.webp", desc: "Ekstrem Ara-Boss (5/9): Sırça Engerek Başrahibesi Kahin'in zehir novalarını boz ve çifte totemi yık!", preset: "sah_ex_5_subboss" },
  { stage: 6, name: "Aşama 6/9 · Kaynayan Zehir Gölü Köprüsü", sub: "Ayaz-Zehir Engerek Sürüsü, Asit Gayzerleri & Koruma Rünü", bgKey: "bg_bridge", bgUrl: "img/sahmeran/sahmeran_bridge_bg.webp", desc: "Ekstrem Sefer (6/9): Ortadaki Kadim Koruma Rününü ve POW Sunağını vurarak kalkan ve öfke kazan!", preset: "sah_ex_6" },
  { stage: 7, name: "Aşama 7/9 · Sırça Saray Muhafız Alayı", sub: "Sırça Golem Muhafızı + 2 Elit Kobra + Sırça Aynası", bgKey: "bg_throne", bgUrl: "img/sahmeran/sahmeran_throne_bg.webp", desc: "Ekstrem Sefer (7/9): Taht odasının dış kapısını tutan Sırça Golem ve Elit Kobraları yar!", preset: "sah_ex_7" },
  { stage: 8, name: "Aşama 8/9 · Kızıl Kehribar İç Divanı", sub: "Engerek Başrahibesi + Sırça Golem + Uçan Engerekler", bgKey: "bg_sanctum", bgUrl: "img/sahmeran/sahmeran_bg.webp", desc: "Ekstrem Sefer (8/9): Şahmeran'ın iki başkomutanı aynı anda sahada! POW Ultini ve sarkıtları kullan!", preset: "sah_ex_8" },
  { stage: 9, name: "Aşama 9/9 · [5 FAZLI EKSTREM BOSS] Tanrıça Şahmeran", sub: "Altı Kanatlı Ebedi Sırça Tanrıçası: Çifte Ölüm Işını · Asit Tufanı · Taşlaştırma · Kehribar Yağmuru", bgKey: "ex_sah_divine_bg", bgUrl: "img/extreme/ex_sah_divine_bg.webp", desc: "EKSTREM FİNAL (9/9): 5 Fazlı Ebedi Sırça Tanrıçası Şahmeran! Yeni özel saldırılar, yükselen asit tufanı ve Altı Kanatlı Tanrıça Formu!", preset: "sah_boss" }
];

registerRaidPlugin("sahmeran", {
  id: "sahmeran",
  normalBadge: "ZİNDAN I · 4 AŞAMA",
  extremeBadge: "CEHENNEM (KÂBUS) · 4 AŞAMA · 5 FAZ",
  normalStages: SAHMERAN_NORMAL_STAGES,
  extremeStages: SAHMERAN_EXTREME_STAGES,
  defaultPersona: "sahmeran",
  lootSet: [
    {
      id: "hat_9",
      slot: "hat",
      name: "Şahmeran Sırça Taç Miğferi",
      icon: "img/sahmeran/loot_sahmeran_crown.webp",
      fc: 2450,
      stats: "GÜÇ +24 · ÇEV +18 · DAY +20 · ZEK +26",
      passive: "Zayıf Nokta Vuruşlarında +%25 Ek Kritik Hasar"
    },
    {
      id: "armor_9",
      slot: "armor",
      name: "Şahmeran Zümrüt Pul Zırhı",
      icon: "img/sahmeran/loot_sahmeran_armor.webp",
      fc: 2800,
      stats: "GÜÇ +26 · ÇEV +20 · DAY +28 · ZEK +24",
      passive: "Zehir ve Lav Hasarını %40 Azaltır, +250 Maks HP"
    },
    {
      id: "wpn_9",
      slot: "wpn",
      name: "Camasb'ın Zümrüt Yılan Asası",
      icon: "img/sahmeran/loot_sahmeran_staff.webp",
      fc: 2950,
      stats: "GÜÇ +30 · ÇEV +22 · DAY +18 · ZEK +28",
      passive: "Atışlara Zümrüt Efsun İzi Ekler (+%15 Hasar)"
    },
    {
      id: "tal_9",
      slot: "tal",
      name: "Şahmeran Kehribar Gözyaşı",
      icon: "img/sahmeran/loot_sahmeran_talisman.webp",
      fc: 2400,
      stats: "GÜÇ +22 · ÇEV +22 · DAY +22 · ZEK +30",
      passive: "Her Tur Başında +25 Ek Hamle Enerjisi"
    },
    {
      id: "hat_11",
      slot: "hat",
      isExtreme: true,
      name: "Ebedi Sırça Tanrıçası Tacı (Ekstrem)",
      icon: "img/extreme/loot_ex_sah_crown.webp",
      fc: 3850,
      stats: "GÜÇ +36 · ÇEV +28 · DAY +30 · ZEK +42",
      passive: "Taç Kritik Çarpanını +0.5 Artırır & Taşlaşma Bağışıklığı"
    },
    {
      id: "back_9",
      slot: "back",
      isExtreme: true,
      name: "Altı-Kanat Serafim Pelerini (Ekstrem)",
      icon: "img/extreme/loot_ex_sah_wings.webp",
      fc: 3900,
      stats: "GÜÇ +34 · ÇEV +40 · DAY +32 · ZEK +42",
      passive: "Asit Tufanından Korur & Her Tur +35 Enerji"
    }
  ],
  campaign: {
    id: "sahmeran",
    badge: "ZİNDAN I",
    title: "ŞAHMERAN: YERALTI SIRÇA SARAY DESTANI",
    bossName: "Yılan Kraliçe Şahmeran",
    bossTitle: "Sırça Saray'ın Ebedi Hükümdarı",
    closeupImg: "img/sahmeran/sahmeran_closeup.webp",
    enrageImg: "img/sahmeran/sahmeran_enrage.webp",
    ascendedImg: "img/extreme/sah_ex_ascended.webp",
    chestImg: "img/sahmeran/loot_sahmeran_chest.webp",
    exChestImg: "img/extreme/loot_ex_chest.webp",
    lobbyBg: "img/sahmeran/sahmeran_throne_bg.webp",
    corridorBg: "img/sahmeran/sahmeran_gate_bg.webp",
    nativeComicId: "sahmeran_prolog",
    corridorPois: {
      steleLabel: "1. Camasb'ın Kadim Kitabesi (İncele)",
      steleDone: "Camasb Kitabesi Okundu (+%25 Taç Kritik)",
      steleMsg: "Camasb'ın Kitabesi okundu: Şahmeran'ın Altın Tacı zayıf nokta kritik hasarı x2.8'e yükseldi!",
      brazierLabel: "2. Tarsus Kehribar Ateşgedesi (Yak)",
      brazierDone: "Kehribar Ateşgedesi Yakıldı (+350 HP)",
      brazierMsg: "Tarsus Kehribar Ateşgedesi ejderha nefesiyle yakıldı: Tüm zindan boyunca +350 Maksimum HP kazanıldı!",
      gateLabel: "3. ZÜMRÜT SIRÇA KAPISI (Mührü Aç & Aşama 1'e Gir)"
    },
    comics: [
      {
        act: "PERDE I · TARSUS'UN YEDİ KAT ALTI",
        title: "Kehribar Kuyusundan Yükselen Zümrüt Duman",
        leftBg: "img/extreme/comic_sah_ex_1.webp",
        rightBg: "img/sahmeran/sahmeran_throne_bg.webp",
        leftArt: "img/npc-selin.webp",
        rightArt: "img/sahmeran/sahmeran_closeup.webp",
        leftSpeaker: "Haritacı Selin & Dede'nin Güncesi",
        leftSay: "“Kül Yutan'ın kara külleri Tarsus'un yeraltı sularını zehirledi! Sırça Saray'ın mührü kırıldı; Yılan Kraliçe Şahmeran bunu insanoğlunun yeni bir ihaneti sanıyor!”",
        leftNarr: "Dedenin eski derisinde tek bir uyarı yazılıydı: Sırça Saray'a kılıçla giren taş kesilir, onurla giren ateşle sınanır.",
        rightSpeaker: "Yılan Kraliçe Şahmeran (Yakın Çekim)",
        rightSay: "“Bin yıl önce Camasb'a canımı ve sırrımı verdim; karşılığı ihanet oldu! Ejder Ocağı'nın varisi... Kehribar Kuyusu'na barış için mi indin, yoksa kan için mi?”",
        rightNarr: "Şahmeran'ın zümrüt gözleri karanlıkta parıldarken, omuzlarındaki çifte engerek tıslayarak altın tacını koruma altına aldı."
      },
      {
        act: "PERDE II · CAMASB'IN MÜHÜRLÜ MAHZENİ",
        title: "Uyanan Sırça Kristal Yılan-Golemi",
        leftBg: "img/extreme/comic_sah_ex_2.webp",
        rightBg: "img/extreme/ex_sah_vault_bg.webp",
        leftArt: "img/extreme/sub_sirca_golem_1.webp",
        rightArt: "img/extreme/haz_crystal_mirror.webp",
        leftSpeaker: "Sırça Mahzen Muhafızı (Ara-Boss I)",
        leftSay: "“Camasb'ın mühürlü mahzenine adım atan her fani, Sırça Kristal Goleminin yumrukları altında ezilecek!”",
        leftNarr: "Ekstrem Mod Aşama 3'te devasa Sırça Kristal Yılan-Golemi ve mermileri saptıran Sırça Aynaları sahneye çıkar.",
        rightSpeaker: "Haritacı Selin · Taktiksel Analiz",
        rightSay: "“Sırça Aynalarını kırarsan aynanın içinde biriken büyü enerjisi patlayarak Golem'e ve Boss'a 450 geri tepme hasarı vurur!”",
        rightNarr: "İpucu: Sahadaki Kadim Koruma Rününü ve POW Sunağını vurarak anında kalkan ve öfke kazanabilirsin."
      },
      {
        act: "PERDE III · KAHİNLER DİVANI & ASİT TUFANI",
        title: "Engerek Başrahibesi ve Yükselen Zümrüt Tufan",
        leftBg: "img/extreme/comic_sah_ex_3.webp",
        rightBg: "img/extreme/comic_sah_ex_4.webp",
        leftArt: "img/extreme/sub_oracle_2.webp",
        rightArt: "img/extreme/sah_ex_tsunami.webp",
        leftSpeaker: "Sırça Engerek Başrahibesi (Ara-Boss II)",
        leftSay: "“Zehir kazanlarımız kaynıyor! Zümrüt Asit Gölü taşacak ve tüm köprüleri yutacak!”",
        leftNarr: "Ekstrem Mod Aşama 5 ve 8'de Engerek Başrahibesi zehir novaları atar ve çifte şifa totemi diker.",
        rightSpeaker: "Yılan Kraliçe Şahmeran · Zümrüt Tufan",
        rightSay: "“Tarsus'un yeraltı suları emrimdedir! Zümrüt Asit Tufanı yükselsin, Sırça Taşlaştırma Bakışım adımlarını dondursun!”",
        rightNarr: "Ekstrem Modda Şahmeran Çifte Ölüm Işını, Zümrüt Asit Tufanı, Taşlaştırma Bakışı ve Kehribar Sütun Yağmuru kullanır!"
      },
      {
        act: "PERDE IV · ALTI KANATLI TANRIÇA FORMU (EKSTREM FAZ V)",
        title: "Ebedi Sırça Tanrıçası Şahmeran'ın Yükselişi",
        leftBg: "img/extreme/comic_sah_ex_5.webp",
        rightBg: "img/extreme/ex_sah_divine_bg.webp",
        leftArt: "img/extreme/sah_ex_ascended.webp",
        rightArt: "img/extreme/sah_ex_twinbeam.webp",
        leftSpeaker: "Ebedi Sırça Tanrıçası Şahmeran (Faz V)",
        leftSay: "“Bin yıldır hiçbir ölümlü beni gerçek Tanrıça formuma zorlamamıştı! Altı altın kanadımın ve Üçüncü Göz Tacımın ışığıyla sınanacaksın!”",
        leftNarr: "Canı %20'nin altına indiğinde (Ekstrem Faz V) Şahmeran 6 altın kanadını açarak Ebedi Sırça Tanrıçası formuna yükselir!",
        rightSpeaker: "Zayıf Nokta · Üçüncü Göz Tanrıça Tacı",
        rightSay: "“Başındaki ateşten Üçüncü Göz Tacını yüksek açılı atışlarla vurmak x3.0 Kritik Hasar verir ve Kıyamet büyüsünü bozar!”",
        rightNarr: "Tavandaki kehribar sarkıtları düşürmek Tanrıça kalkanını tek darbede kırar."
      },
      {
        act: "FİNAL PERDESİ · EBEDİ SIRÇA İTTİFAKI",
        title: "Altın Asa Yemini ve Kadim Tanrıça Ganimetleri",
        leftBg: "img/extreme/comic_sah_ex_6.webp",
        rightBg: "img/sahmeran/sahmeran_throne_bg.webp",
        leftArt: "img/extreme/sah_ex_ko.webp",
        rightArt: "img/extreme/loot_ex_chest.webp",
        leftSpeaker: "Yılan Kraliçe Şahmeran",
        leftSay: "“Asamı tut, Ejder Ocağı'nın varisi! Ateşinde Camasb'ın ihaneti değil, kadim Anadolu'nun sönmeyen onuru var. Sırça Saray artık senin müttefikindir!”",
        leftNarr: "Şahmeran altı kanadını indirip asasını seninle birlikte kavradı; Sırça Saray'ın Ekstrem Mühürlü Hazine Sandığı açıldı.",
        rightSpeaker: "Ekstrem Kadim Tanrıça Hazinesi",
        rightSay: "“Ebedi Sırça Tanrıçası Tacı (hat_11) ve Altı-Kanat Serafim Pelerini (back_9) artık senin!”",
        rightNarr: "Ödül: Efsanevi ve Kadim Efsanevi Şahmeran Seti parçaları doğrudan Terbiyeciye kuşanılabilir!"
      }
    ]
  },
  personas: {
  sahmeran: {
    id: "sahmeran",
    npc: "sahmeran",
    closeNpc: "sahmeran-yakın",
    divineNpc: "sahmeran-tanrica",
    bg: "bg-sahmeran-sanctum",
    divineBg: "bg-ex-sah-divine",
    portrait: SHM_ASSETS_PATHS.sah_closeup,
    title: "YILANLAR ŞAHI ŞAHMERAN",
    sub: "Bin Yıllık Sırça Tahtın Ebedi Hükümdarı",
    entranceRoarLine: "Bin yıl önce Camasb sırrımı çaldı… Şimdi ocağın varisi karşıma çıkmış! Ateşinde onur mu var, ihanet mi?!",
    entranceSfx: "TISSLAAR!!",
    introPanels: (st) => [
      {
        bg: "bg-sahmeran-sanctum", night: 1, npc: "sahmeran", side: "r", clash: 1,
        speaker: "YILANLAR ŞAHI ŞAHMERAN", sfx: "TISSLAAR!!",
        cap: "Sırça sütunlar zümrüt bir ışıkla yarıldı; Yılanlar Şahı bin yıllık kehribar tahtından doğruldu!",
        say: "Camasb’ın ihanetinden bin yıl sonra bir fani daha eşiğime bastı… Gözlerinde dedenin ateşi var ama yüreğin kimin?"
      },
      typeof D === "function" && st ? D(st, "P16", {
        bg: "bg-sahmeran-bridge", night: 1, face: "r", av: ["34", "front"], sfx: "MEYDAN OKUMA!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: `${st.name} Sırça Köprü'nün başında kanatlarını gerip zümrüt karanlığa kükredi!`,
        say: "Sırça Saray’ı yağmalamaya değil, Kül Yutan’ın zehirli mührünü kırmaya geldik Şahmeran!"
      }) : {
        bg: "bg-sahmeran-bridge", night: 1, npc: "selin", side: "l", sfx: "MEYDAN OKUMA!",
        speaker: "EJDER OCAĞI VARİSİ",
        cap: "Ocağın sancağı kehribar dehlizde dalgalandı.",
        say: "Sırça Saray’ı yağmalamaya değil, Kül Yutan’ın zehirli mührünü kırmaya geldik!"
      },
      {
        bg: "bg-ex-sah-divine", night: 1, npc: "sahmeran-yakın", side: "l", clash: 1, shout: 1,
        speaker: "EBEDİ SIRÇA TANRIÇASI", sfx: "SIRÇA HÜKMÜ!!",
        cap: "Yılan Kraliçe kehribar asasını mermer zemine vurdu; tavandaki sarkıtlar sarsıldı!",
        say: "Söz kolaydır Ejder Çocuğu! Ateşinin doğruluğunu Sırça Divan’da kanıtla bakalım!"
      }
    ],
    taunts: [
      {
        sfx: "KÜÇÜMSEME!",
        line: "Bütün nişancılığın bu mu fani?! Camasb bile hançerini senden daha kararlı tutmuştu!",
        replySay: "Sırça pullarının ardına saklanma Şahmeran, sıradaki atışım tacını sarsacak!",
        effectDesc: "Şahmeran doğrudan saldırmak yerine laf attı! Gardı açıldı: Sıradaki Zayıf Nokta vuruşun +%35 Kritik Hasar verir ve +25 POW Öfkesi kazandın!"
      },
      {
        sfx: "MEYDAN OKUMA!",
        line: "Başımdaki Altın Tacı vurabileceğini mi sanıyorsun? Hadi dene bakalım, kımıldamadan bekliyorum!",
        replySay: "Bu daveti geri çevirmeyeceğim! Nişan alıyoruz!",
        effectDesc: "Şahmeran alaycı bir tebessümle sırasını laf atarak geçirdi: Zayıf Nokta Açığı (+%35 Kritik) ve +25 Enerji!"
      },
      {
        sfx: "KAHKAHA!!",
        line: "Hahaha! Attığın mermiler mermer sütunlarımı bile çizemiyor! İhtiyar deden görse yüzü kızarırdı!",
        replySay: "Dedemin adını ağzına alma! Ocağın gerçek ateşini şimdi göreceksin!",
        effectDesc: "Şahmeran’ın kahkahası kanını kaynattı: +30 POW Öfkesi ve Zayıf Nokta Açığı!"
      },
      {
        sfx: "TISSLAAR!!",
        line: "Ejderhanın kanatları titriyor! Yeraltının zümrüt karanlığı köyünüzün sıcak ahırına benzemez!",
        replySay: "Bizim ocağımızın ateşi yedi kat yerin altında bile sönmez!",
        effectDesc: "Şahmeran psikolojik baskı kurmaya çalıştı: +25 POW Öfkesi ve +30 Enerji!"
      }
    ],
    attackLines: [
      "Zümrüt Dişlerim kalkanını parçalayacak, hazırlan!",
      "Kehribar kuyularının bin yıllık zehri damarlarında dolaşsın!",
      "Sırça Saray’ın gazabından hiçbir fani kaçamaz!"
    ],
    weakHitLines: [
      "Ghh—! Sırça Tacıma nasıl isabet ettirdin?!",
      "Bu atış… tıpkı otuz yıl önceki ihtiyar terbiyecinin eli!",
      "Küçük fani… tacımı çatlattın ha?!"
    ],
    missLines: [
      "Hah! Rüzgârı bile okuyamayan bir nişancı!",
      "Karanlıkta gölgelerimi mi avlıyorsun, Ejder Çocuğu?"
    ]
  },

  sub_sirca_golem: {
    id: "sub_sirca_golem",
    npc: "sirca-golem",
    closeNpc: "sirca-golem",
    bg: "bg-ex-sah-vault",
    portrait: SHM_ASSETS_PATHS.sub_sirca_golem_1,
    title: "SIRÇA KRİSTAL YILAN-GOLEMİ",
    sub: "Ara-Boss I · Camasb’ın Pişmanlığından Yontulmuş Muhafız",
    entranceRoarLine: "KRİSTAL MÜHÜR UYANDI! HİÇBİR FANİ SIRÇA KEMERİNDEN GEÇEMEZ!",
    entranceSfx: "ÇATIRTI!!",
    introPanels: (st) => [
      {
        bg: "bg-ex-sah-vault", night: 1, npc: "sirca-golem", side: "r", clash: 1,
        speaker: "SIRÇA KRİSTAL GOLEMİ", sfx: "ÇATIRTI!!",
        cap: "Kehribar mahzenin ortasındaki dev kristal sütun çatırdadı ve ikiye yarıldı!",
        say: "CAMASB’IN KANINI TAŞIYAN HİÇBİR FANİ BU KÖPRÜDEN GEÇEMEZ! KRİSTAL ÇEKİRDEĞİM SİZİ EZECEK!"
      },
      typeof D === "function" && st ? D(st, "P16", {
        bg: "bg-sahmeran-gate", night: 1, face: "r", av: ["34", "front"], sfx: "NİŞAN AL!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: "Selin parmağıyla Golem'in alnındaki kehribar çekirdeği işaret etti!",
        say: "Alnındaki kehribar rün çekirdeği zırhının en zayıf noktası! Orayı hedef alalım!"
      }) : {
        bg: "bg-sahmeran-gate", night: 1, npc: "selin", side: "l", sfx: "NİŞAN AL!",
        speaker: "HARİTACI SELİN",
        cap: "Selin Golem'in alnındaki çekirdeği işaret etti.",
        say: "Alnındaki kehribar rün çekirdeğini vurursan kristal zırhı tuzla buz olur!"
      }
    ],
    taunts: [
      {
        sfx: " yankı!!",
        line: "FANİ SİLAHLARINIZ SIRÇA ZIRHIMDA SADECE ÇİZİK BIRAKIR! BOŞUNA YORULMAYIN!",
        replySay: "O kristal zırhının alnındaki çatlağı gördüm bile!",
        effectDesc: "Sırça Golemi göğsünü yumruklayarak meydan okudu: Zayıf Nokta Açığı (+%35 Kritik) ve +25 Öfke!"
      },
      {
        sfx: "REelZONANS!",
        line: "BİN YILDIR BU KAPIYI BEKLİYORUM! SİZİN GİBİ YÜZLERCE AVCININ KEMİĞİ AYAĞIMIN ALTINDA!",
        replySay: "Biz avcı değiliz, Ejder Ocağı'nın muhafızlarıyız!",
        effectDesc: "Golem doğrudan saldırmak yerine gözdağı verdi: +25 POW Öfkesi ve +25 Enerji!"
      }
    ],
    attackLines: [
      "KEHRİBAR SÜTUNLAR ÜZERİNİZE YIKILSIN!",
      "KRİSTAL YUMRUK! KAÇAMAZSIN!"
    ],
    weakHitLines: [
      "KRRR—! ÇEKİRDEĞİM ÇATLADI!",
      "NASIL… RÜN MÜHRÜMÜ NASIL GÖRDÜN?!"
    ],
    missLines: [
      "KRİSTAL GÖVDEMİ BİLE TUTTURAMADIN, FANİ!",
      "ATIŞIN DUVARLARDA YANKILANIP SÖNDÜ!"
    ]
  },

  sub_oracle: {
    id: "sub_oracle",
    npc: "engerek-rahibe",
    closeNpc: "engerek-rahibe",
    bg: "bg-sahmeran-bridge",
    portrait: SHM_ASSETS_PATHS.sub_oracle_1,
    title: "SIRÇA ENGEREK BAŞRAHİBESİ",
    sub: "Ara-Boss II · Zümrüt Buhurdanlık Kâhini",
    entranceRoarLine: "Buhurdanlığımdaki zümrüt dumanlar ölümünüzü fısıldıyor… Şahmeran’ın huzuruna çıkamayacaksınız!",
    entranceSfx: "ZEHİR SİSİ!",
    introPanels: (st) => [
      {
        bg: "bg-sahmeran-bridge", night: 1, npc: "engerek-rahibe", side: "r", clash: 1,
        speaker: "ENGEREK BAŞRAHİBESİ", sfx: "ZEHİR SİSİ!",
        cap: "Zümrüt buhurdanlıklardan yükselen yeşil dumanların arasından Başrahibe süzülerek çıktı!",
        say: "Dumanların içinde kaderinizi okudum… İkiniz de bu köprüde taş kesileceksiniz!"
      },
      typeof D === "function" && st ? D(st, "P7", {
        bg: "bg-sahmeran-bridge", night: 1, face: "r", av: ["34", "front"], sfx: "KÜKRER!!",
        speaker: (st.name || "YILDIZ EJDERHA").toUpperCase(),
        cap: `${st.name} kanat çırparak zehirli dumanı dağıttı!`,
        say: "Kaderimizi senin dumanların değil, ocağımızın ateşi yazar!"
      }) : {
        bg: "bg-sahmeran-bridge", night: 1, npc: "sureyya", side: "l", sfx: "ŞİFA NURU!",
        speaker: "LEYDİ SÜREYYA",
        cap: "Süreyya asasını kaldırdı.",
        say: "Zehirli dumanlarına kanmayın, başındaki kâhin tacını hedef alın!"
      }
    ],
    taunts: [
      {
        sfx: "KEHANET!",
        line: "Hihihi! Ellerinin titrediğini buradan görebiliyorum! Zehirli sisim gözlerini mi bulandırdı?!",
        replySay: "Sislerin arkasına saklanmak seni kurtarmayacak Başrahibe!",
        effectDesc: "Başrahibe alaycı bir kehanetle laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 Öfke!"
      },
      {
        sfx: "TISSLAAR!",
        line: "Şahmeran’ın divanına varmadan önce benim zümrüt sınavımdan geçmelisiniz, zavallı faniler!",
        replySay: "Sınavını tek bir atışla bitireceğiz!",
        effectDesc: "Başrahibe saldırmak yerine laf attı: +25 POW Öfkesi ve +25 Enerji!"
      }
    ],
    attackLines: [
      "ZÜMRÜT LANETİ ÜZERİNİZE ÇÖKSÜN!",
      "ZEHİRLİ DİŞLERİM KALKANINI DELECEK!"
    ],
    weakHitLines: [
      "Ahh—! Kâhin tacım kırıldı!",
      "Dumanların arasından beni nasıl vurdun?!"
    ],
    missLines: [
      "Hihihi! Sadece dumanımı vurdun avcı!",
      "Kehanetim doğru çıktı, ıskaladın!"
    ]
  },

  },
  dramaticAttacks: {
  twinbeam: {
    key: "twinbeam",
    title: "ÇİFTE ENGEREK ÖLÜM IŞINI",
    ono: "ÖLÜM IŞINI!!",
    line: "ÇİFTE ENGEREK ÖLÜM IŞINI! ZÜMRÜT NURUYLA DELİNECEKSİN!",
    hint: "İkiz engerek lazerleri çapraz ateşlenir — Başındaki Tacı vur!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_tsunami,
    poseImg: SHM_ASSETS_PATHS.sah_ex_twinbeam,
    glow: "#9ad07a",
    el: "toprak",
    vp: "65% 44%"
  },
  tsunami: {
    key: "tsunami",
    title: "ZÜMRÜT ASİT TUFANI",
    ono: "ASİT TUFANI!!",
    line: "ZÜMRÜT ASİT TUFANI YÜKSELSİN! SULARIM SİZİ YUTACAK!",
    hint: "Asit gölü yükseliyor ve 3 zehir dalgası geliyor!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_tsunami,
    poseImg: SHM_ASSETS_PATHS.sah_ex_tsunami,
    glow: "#9ad07a",
    el: "toprak",
    vp: "64% 46%"
  },
  petrify: {
    key: "petrify",
    title: "SIRÇA TAŞLAŞTIRMA BAKIŞI",
    ono: "TAŞ BAKIŞI!!",
    line: "SIRÇA TAŞLAŞTIRMA BAKIŞI! GÖZLERİME BAKAN TAŞ KESİLİR!",
    hint: "[Q] Rün Kalkanı veya Şahmeran Taç Miğferi taşlaştırmayı engeller!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_petrify,
    poseImg: SHM_ASSETS_PATHS.sah_ex_petrify,
    glow: "#d9b062",
    el: "firtina",
    vp: "66% 40%"
  },
  shed: {
    key: "shed",
    title: "EBEDİ DERİ DEĞİŞİMİ & ZÜMRÜT KALKANI",
    ono: "DERİ DEĞİŞİMİ!!",
    line: "EBEDİ DERİ DEĞİŞİMİ! YILAN PULLARIM YENİDEN DOĞUYOR!",
    hint: "Şahmeran kalkan açtı — [5] Dev Krater veya Taç Kritiğiyle kır!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_tsunami,
    poseImg: SHM_ASSETS_PATHS.sah_ex_shed,
    glow: "#9ad07a",
    el: "toprak",
    vp: "64% 44%"
  },
  meteor: {
    key: "meteor",
    title: "KEHRİBAR SÜTUN YAĞMURU",
    ono: "KEHRİBAR YAĞMURU!!",
    line: "KEHRİBAR SÜTUN YAĞMURU! GÖKYÜZÜNDEN ALTIN MIZRAKLAR İNSİN!",
    hint: "Kubbeden 3 dev kehribar sütunu düşüyor — pozisyon değiştir!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_petrify,
    poseImg: SHM_ASSETS_PATHS.sah_ex_meteor,
    glow: "#d9b062",
    el: "toprak",
    vp: "66% 42%"
  },
  ascended: {
    key: "ascended",
    title: "ALTI KANATLI TANRIÇA HÜKMÜ",
    ono: "TANRIÇA HÜKMÜ!!",
    line: "ALTI ALTIN KANADIM AÇILDI! SIRÇA SARAY'IN İLAHİ HÜKMÜ!",
    hint: "Üçüncü Göz Tacını vurarak Tanrıça Kıyametini sersemlet!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_petrify,
    poseImg: SHM_ASSETS_PATHS.sah_ex_ascended,
    glow: "#d9b062",
    el: "firtina",
    vp: "66% 38%"
  },
  // 4 Sub-Bosses Signature Attacks
  sub_golem_quake: {
    key: "sub_golem_quake",
    title: "SIRÇA PRİZMA DEPREMİ",
    ono: "PRİZMA ÇÖKÜŞÜ!!",
    line: "SIRÇA YUMRUĞUM YERİ YARACAK! KRİSTAL SÜTUNLAR YÜKSELSİN!",
    hint: "Sırça Golem sismik kristal dalgası ve 2 dev kaya fırlatıyor!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_tsunami,
    poseImg: SHM_ASSETS_PATHS.sub_sirca_golem_2,
    glow: "#9ad07a",
    el: "toprak",
    vp: "64% 45%"
  },
  sub_oracle_curse: {
    key: "sub_oracle_curse",
    title: "İKİZ KOBRA KEHANET LANETİ",
    ono: "ZEHİR KEHANETİ!!",
    line: "ZEHİRLİ KEHANETİM DAMARLARINI DONDURACAK, YABANCI!",
    hint: "Engerek Başrahibesi zümrüt ölüm ışını ve ikiz zehir küresi saldı!",
    bg: SHM_ASSETS_PATHS.cut_sahmeran_petrify,
    poseImg: SHM_ASSETS_PATHS.sub_oracle_2,
    glow: "#9ad07a",
    el: "golge",
    vp: "64% 44%"
  },
  },


  paintTerrain(tctx, hMap, W, H) {
    for (let x = 0; x < W; x++) {
      const topY = Math.round(hMap[x]);
      const blockWave = Math.sin(x * 0.038) * 3 + Math.cos(x * 0.09) * 1.5;
      tctx.fillStyle = "#5a462e";
      tctx.fillRect(x, topY, 1, 6);
      tctx.fillStyle = (Math.sin(x * 0.06) > 0.62) ? "#2d5a4c" : "#3d2f20";
      tctx.fillRect(x, topY + 6, 1, 9 + Math.round(blockWave));

      const grad = tctx.createLinearGradient(0, topY + 15, 0, H);
      grad.addColorStop(0, "#2a2118");
      grad.addColorStop(0.35, "#1e1711");
      grad.addColorStop(0.75, "#14110e");
      grad.addColorStop(1, "#090806");
      tctx.fillStyle = grad;
      tctx.fillRect(x, topY + 15, 1, H - topY - 15);
    }
    const rockTex = SHM_IMAGES.terrain_sirca_rock;
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
        tctx.fillStyle = "#6a5236";
        tctx.fillRect(x, topY, 1, 6);
        tctx.fillStyle = "#2b2016";
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
