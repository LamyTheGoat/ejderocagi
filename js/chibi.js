'use strict';
/* ============ EJDER OCAĞI — 3/4 CHİBİ PAPER-DOLL, ÖZELLEŞTİRME, 48 EKİPMAN & DEMİRCİ +BASMA MOTORU ============ */

const CHIBI_GENDERS = [
  { k: 'male', ad: 'Ocak Beyi (Erkek Baz)' },
  { k: 'female', ad: 'Ocak Hatunu (Kadın Baz)' },
];

const CHIBI_SKINS = [
  { k: 'bugday',   ad: 'Anadolu Buğday', sw: '#e8b288', flt: 'none' },
  { k: 'fildisi',  ad: 'Açık Fildişi',   sw: '#f7d8be', flt: 'brightness(1.12) saturate(0.84)' },
  { k: 'tunc',     ad: 'Güneş Tunç',     sw: '#c48252', flt: 'brightness(0.85) saturate(1.16) contrast(1.04)' },
  { k: 'kehribar', ad: 'Altın Kehribar', sw: '#df9b52', flt: 'sepia(0.26) saturate(1.32) brightness(0.97)' },
  { k: 'esmer',    ad: 'Kavruk Bozkır',  sw: '#8e5737', flt: 'brightness(0.68) saturate(1.10) contrast(1.07)' },
  { k: 'kizilkor', ad: 'Kor Soyu',       sw: '#d97c64', flt: 'hue-rotate(-11deg) saturate(1.24) brightness(0.95)' },
  { k: 'ayaz',     ad: 'Buzul Ayazı',    sw: '#c7d4dc', flt: 'hue-rotate(165deg) saturate(0.36) brightness(1.06)' },
  { k: 'gece',     ad: 'Obsidyen Gölge', sw: '#6e6878', flt: 'hue-rotate(210deg) saturate(0.42) brightness(0.68) contrast(1.10)' },
];

const CHIBI_HAIRS = [
  { k: 0, ad: 'Saçsız (Kel Baz)' },
  { k: 1, ad: 'Dikenli Kor Perçemi' },
  { k: 2, ad: 'Kısa Çırak Kesimi' },
  { k: 3, ad: 'Çift Örgülü Bozkır' },
  { k: 4, ad: 'Savaşçı At Kuyruğu' },
  { k: 5, ad: 'Uzun Dalgalı Gece' },
  { k: 6, ad: 'Kızıl Savaş Örgüsü' },
  { k: 7, ad: 'Fırtına Gümüş Yelesi' },
  { k: 8, ad: 'Altın Tokalı Asil Topuz' },
];

const CHIBI_HAIR_COLORS = [
  { k: 'dogal',   ad: 'Orijinal / Kuzguni', sw: '#2b2a2e', flt: 'none' },
  { k: 'kestane', ad: 'Kestane Kahve',      sw: '#6e3b26', flt: 'sepia(0.65) hue-rotate(-15deg) saturate(1.6) brightness(0.95)' },
  { k: 'kizil',   ad: 'Kor Kızılı',         sw: '#b83228', flt: 'sepia(0.8) hue-rotate(-32deg) saturate(2.6) brightness(0.95)' },
  { k: 'altin',   ad: 'Altın Sarısı',       sw: '#e5b842', flt: 'sepia(0.9) hue-rotate(8deg) saturate(2.3) brightness(1.22)' },
  { k: 'gumus',   ad: 'Ayaz Gümüşü',        sw: '#d8dee6', flt: 'grayscale(0.85) brightness(1.35) contrast(1.08)' },
  { k: 'indigo',  ad: 'Gece İndigosu',      sw: '#384c8e', flt: 'sepia(0.7) hue-rotate(190deg) saturate(2.1) brightness(0.92)' },
  { k: 'zumrut',  ad: 'Zümrüt Yeşili',      sw: '#2e8b57', flt: 'sepia(0.7) hue-rotate(85deg) saturate(2.1) brightness(0.95)' },
  { k: 'mor',     ad: 'Hiçlik Moru',        sw: '#7a3b9e', flt: 'sepia(0.75) hue-rotate(245deg) saturate(2.3) brightness(0.95)' },
];

const CHIBI_EXPRS = [
  { k: 1, ad: 'Cesur Tebessüm' },
  { k: 2, ad: 'Zarif Kirpikli Bakış' },
  { k: 3, ad: 'Savaşçı Hırsı' },
  { k: 4, ad: 'Neşeli Kahkaha' },
  { k: 5, ad: 'Hayret / Şaşkın' },
  { k: 6, ad: 'Meydan Okuyan Sırıtış' },
  { k: 7, ad: 'Keyifli Han Gülüşü' },
  { k: 8, ad: 'Keskin Nişancı' },
];

const CHIBI_EYE_COLORS = [
  { k: 'kehribar', ad: 'Kor Kehribarı',   sw: '#e89428', flt: 'none' },
  { k: 'gok',      ad: 'Gök Mavisi',      sw: '#3898e8', flt: 'hue-rotate(175deg) saturate(1.35)' },
  { k: 'zumrut',   ad: 'Zümrüt Yeşili',   sw: '#38c868', flt: 'hue-rotate(85deg) saturate(1.35)' },
  { k: 'kizil',    ad: 'Kan Yakutu',      sw: '#e03838', flt: 'hue-rotate(-25deg) saturate(1.65)' },
  { k: 'mor',      ad: 'Efsun Moru',      sw: '#9848e8', flt: 'hue-rotate(240deg) saturate(1.45)' },
  { k: 'altin',    ad: 'Güneş Altını',    sw: '#f8d030', flt: 'hue-rotate(15deg) saturate(1.5) brightness(1.10)' },
  { k: 'turkuaz',  ad: 'Mercan Turkuazı', sw: '#28d0c8', flt: 'hue-rotate(135deg) saturate(1.45)' },
  { k: 'obsidyen', ad: 'Kara Obsidyen',   sw: '#3a3542', flt: 'saturate(0.25) brightness(0.68) contrast(1.2)' },
];

const CHIBI_SLOTS = [
  { k: 'hat',   ad: 'Başlık & Miğfer', side: 'L' },
  { k: 'face',  ad: 'Yüz Aksesuarı',   side: 'L' },
  { k: 'armor', ad: 'Zırh & Kaftan',   side: 'L' },
  { k: 'back',  ad: 'Pelerin & Kanat', side: 'R' },
  { k: 'wpn',   ad: 'Silah & Asa',     side: 'R' },
  { k: 'tal',   ad: 'Tılsım & Yüzük',  side: 'R' },
];

const CHIBI_ITEMS = {
  // 1. BAŞLIK & MİĞFER (12)
  hat_1: { id: 'hat_1', slot: 'hat', idx: 1, tier: 1, ad: 'Kızıl Çırak Bandanası', d: 'Ocak ateşinin terini silen keten alın sargısı.', fc: 120, st: { gu: 2, ce: 3, zi: 1, ru: 1 } },
  hat_2: { id: 'hat_2', slot: 'hat', idx: 2, tier: 1, ad: 'Kürklü Anadolu Börkü', d: 'Bozkır rüzgârından koruyan tilki kürklü deri börk.', fc: 240, st: { gu: 3, ce: 3, zi: 4, ru: 2 } },
  hat_3: { id: 'hat_3', slot: 'hat', idx: 3, tier: 2, ad: 'Tunç Selçuklu Tolgası', d: 'Örgü zırh ense korumalıklı dövme tunç miğfer.', fc: 390, st: { gu: 5, ce: 3, zi: 6, ru: 3 } },
  hat_4: { id: 'hat_4', slot: 'hat', idx: 4, tier: 2, ad: 'Tüylü Efsuncu Kukuletası', d: 'Gece çivitinden dokunmuş, kartal tüylü gizemli başlık.', fc: 540, st: { gu: 4, ce: 6, zi: 4, ru: 8 } },
  hat_5: { id: 'hat_5', slot: 'hat', idx: 5, tier: 3, ad: 'Yakutlu Sultan Tacı', d: 'Saray divanında sözü geçen terbiyecilerin altın tacı.', fc: 720, st: { gu: 6, ce: 6, zi: 6, ru: 10 } },
  hat_6: { id: 'hat_6', slot: 'hat', idx: 6, tier: 3, ad: 'Boynuzlu Kara Demir Miğfer', d: 'Obsidiyen ocağında dövülmüş çift boynuzlu savaş tolgası.', fc: 940, st: { gu: 11, ce: 5, zi: 10, ru: 6 } },
  hat_7: { id: 'hat_7', slot: 'hat', idx: 7, tier: 4, ad: 'Zümrüt Kristal Diadem', d: 'Kadim zümrüt kristalleriyle nefes yenileyen efsunlu taç.', fc: 1220, st: { gu: 9, ce: 10, zi: 9, ru: 14 } },
  hat_8: { id: 'hat_8', slot: 'hat', idx: 8, tier: 4, ad: 'Kanatlı Kor Ejderbeyi Miğferi', d: 'Tepesinde sönmeyen ejderha ateşi yanan altın kanatlı miğfer.', fc: 1600, st: { gu: 15, ce: 12, zi: 14, ru: 15 } },
  hat_9: { id: 'hat_9', slot: 'hat', idx: 9, tier: 5, raidDrop: true, shardKey: 'sahmeran_kalip', ad: 'Şahmeran Sırça Taç Miğferi', d: 'Sırça Saray Zindanı Özel Yadigârı: Yılan Kraliçe Şahmeran\'ın zümrüt taşlı altın kobra tacı.', fc: 2450, st: { gu: 24, ce: 18, zi: 20, ru: 26 } },
  hat_10: { id: 'hat_10', slot: 'hat', idx: 10, tier: 5, raidDrop: true, shardKey: 'kalgarot_kalip', ad: 'Kara Kor Ejderboynuzu Tolgası', d: 'Volkanik Kaldera Zindanı Özel Yadigârı: Başkomutan Kalgarot\'un lav damarlı çift boynuzlu obsidiyen miğferi.', fc: 2650, st: { gu: 28, ce: 18, zi: 24, ru: 22 } },
  hat_11: { id: 'hat_11', slot: 'hat', idx: 11, tier: 6, raidDrop: true, ascendFrom: 'hat_9', shardKey: 'sahmeran_kalip', ad: 'Ebedi Sırça Tanrıçası Tacı (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Altı kanatlı altın engerek ve üçüncü göz yakutu taşıyan tanrıça tacı.', fc: 3850, st: { gu: 36, ce: 28, zi: 30, ru: 42 } },
  hat_12: { id: 'hat_12', slot: 'hat', idx: 12, tier: 6, raidDrop: true, ascendFrom: 'hat_10', shardKey: 'kalgarot_kalip', ad: 'Mavi-Kor Kıyamet Ejderi Tolgası (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Mavi-beyaz plazma alevli boynuzlarıyla kıyamet ejderi miğferi.', fc: 4100, st: { gu: 44, ce: 28, zi: 36, ru: 34 } },

  // 2. ZIRH & KAFTAN (11)
  armor_1: { id: 'armor_1', slot: 'armor', idx: 1, tier: 1, ad: 'Keten Çırak Tuniği', d: 'Ocak eğitiminde giyilen rahat keten gömlek ve deri çizme.', fc: 150, st: { gu: 2, ce: 4, zi: 3, ru: 2 } },
  armor_2: { id: 'armor_2', slot: 'armor', idx: 2, tier: 1, ad: 'Deri Avcı Yeleği', d: 'Sefer patikalarında çeviklik sağlayan çok cepli meşin yelek.', fc: 290, st: { gu: 4, ce: 6, zi: 5, ru: 3 } },
  armor_3: { id: 'armor_3', slot: 'armor', idx: 3, tier: 2, ad: 'Bordo Selçuklu Kaftanı', d: 'Altın sırma işlemeli, ağırbaşlı Anadolu bey kaftanı.', fc: 470, st: { gu: 6, ce: 5, zi: 7, ru: 6 } },
  armor_4: { id: 'armor_4', slot: 'armor', idx: 4, tier: 2, ad: 'İndigo Kilim Cübbesi', d: 'Kadim kilim motifleriyle ejderha bağını güçlendiren uzun cübbe.', fc: 660, st: { gu: 6, ce: 7, zi: 8, ru: 10 } },
  armor_5: { id: 'armor_5', slot: 'armor', idx: 5, tier: 3, ad: 'Tunç Ejder Pulu Zırh', d: 'Gerçek ejderha pullarından dizilmiş ateşe dayanıklı zırh.', fc: 890, st: { gu: 10, ce: 7, zi: 12, ru: 8 } },
  armor_6: { id: 'armor_6', slot: 'armor', idx: 6, tier: 3, ad: 'Demirci Kor-Örs Zırhı', d: 'İçinde kor ızgaraları parlayan ağır kara demir plaka zırh.', fc: 1150, st: { gu: 13, ce: 6, zi: 16, ru: 9 } },
  armor_7: { id: 'armor_7', slot: 'armor', idx: 7, tier: 4, ad: 'Zümrüt Sancak Şövalye Zırhı', d: 'Omuzlarında ejder başı kabartmaları taşıyan asil zümrüt zırh.', fc: 1460, st: { gu: 14, ce: 12, zi: 16, ru: 13 } },
  armor_8: { id: 'armor_8', slot: 'armor', idx: 8, tier: 4, ad: 'Magma Ejderbeyi Zırhı', d: 'Canlı lav damarlarıyla parıldayan efsanevi başkomutan zırhı.', fc: 1950, st: { gu: 19, ce: 15, zi: 20, ru: 18 } },
  armor_9: { id: 'armor_9', slot: 'armor', idx: 9, tier: 5, raidDrop: true, shardKey: 'sahmeran_kalip', ad: 'Şahmeran Zümrüt Pul Zırhı', d: 'Sırça Saray Zindanı Özel Yadigârı: Zehir ve asit işlemeyen kızıl-zümrüt yılan pulu zırh.', fc: 2800, st: { gu: 26, ce: 20, zi: 28, ru: 24 } },
  armor_10: { id: 'armor_10', slot: 'armor', idx: 10, tier: 5, raidDrop: true, shardKey: 'kalgarot_kalip', ad: 'Kalgarot Kor-Kaburga Zırhı', d: 'Volkanik Kaldera Zindanı Özel Yadigârı: Göğsünde canlı magma çekirdeği yanan ağır obsidiyen ejder zırhı.', fc: 3100, st: { gu: 32, ce: 18, zi: 30, ru: 22 } },
  armor_11: { id: 'armor_11', slot: 'armor', idx: 11, tier: 6, raidDrop: true, ascendFrom: 'armor_10', shardKey: 'kalgarot_kalip', ad: 'Mavi-Kor Süpernova Ejder Zırhı (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Göğsünde mavi-beyaz yıldız çekirdeği parlayan mutlak obsidiyen zırh.', fc: 4500, st: { gu: 46, ce: 30, zi: 48, ru: 36 } },

  // 3. PELERİN & KANAT (10)
  back_1: { id: 'back_1', slot: 'back', idx: 1, tier: 1, ad: 'Gezgin Keten Pelerini', d: 'Tozlu kervan yollarında rüzgârı kesen yolcu pelerini.', fc: 110, st: { gu: 1, ce: 3, zi: 2, ru: 1 } },
  back_2: { id: 'back_2', slot: 'back', idx: 2, tier: 1, ad: 'Kızıl Kilim Omuz Şalı', d: 'Anadolu motifleriyle dokunmuş sıcak yün pelerin.', fc: 230, st: { gu: 2, ce: 4, zi: 3, ru: 3 } },
  back_3: { id: 'back_3', slot: 'back', idx: 3, tier: 2, ad: 'Ak Kurt Postu Pelerin', d: 'Buzul Sırtı ayazına bana mısın demeyen kalın kürklü post.', fc: 380, st: { gu: 5, ce: 3, zi: 6, ru: 4 } },
  back_4: { id: 'back_4', slot: 'back', idx: 4, tier: 2, ad: 'Çifte Selçuklu Savaş Sancağı', d: 'Sırtta taşınan, dost ejderhalara cesaret veren turkuaz tuğlar.', fc: 550, st: { gu: 7, ce: 5, zi: 6, ru: 7 } },
  back_5: { id: 'back_5', slot: 'back', idx: 5, tier: 3, ad: 'Kızıl Yavru Ejder Kanatları', d: 'Terbiyeciye hafif süzülme çevikliği katan zarlı ejder kanatları.', fc: 760, st: { gu: 8, ce: 11, zi: 6, ru: 8 } },
  back_6: { id: 'back_6', slot: 'back', idx: 6, tier: 3, ad: 'Zümrüt Kristal Kanatlar', d: 'Işığı kırarak büyüsel kalkan oluşturan saf zümrüt kanatlar.', fc: 1020, st: { gu: 9, ce: 12, zi: 10, ru: 12 } },
  back_7: { id: 'back_7', slot: 'back', idx: 7, tier: 4, ad: 'Gölge Dumanı Kanatları', d: 'Obsidiyen karanlığından yoğrulmuş, rakipleri şaşırtan tayf kanatlar.', fc: 1340, st: { gu: 13, ce: 16, zi: 10, ru: 14 } },
  back_8: { id: 'back_8', slot: 'back', idx: 8, tier: 4, ad: 'Anka-Ejder Kor Kanatları', d: 'Saf altın alevlerden oluşan, gökyüzünü aydınlatan efsanevi kanatlar.', fc: 1780, st: { gu: 17, ce: 18, zi: 15, ru: 18 } },
  back_9: { id: 'back_9', slot: 'back', idx: 9, tier: 5, raidDrop: true, shardKey: 'sahmeran_kalip', ad: 'Şahmeran Altı-Kanat Serafim Pelerini', d: 'Sırça Saray Zindanı Özel Yadigârı: Altı adet altın-zümrüt tüylü tanrısal yılan kanadı.', fc: 3900, st: { gu: 34, ce: 40, zi: 32, ru: 42 } },
  back_10: { id: 'back_10', slot: 'back', idx: 10, tier: 6, raidDrop: true, ascendFrom: 'back_9', shardKey: 'kalgarot_kalip', ad: 'Kalgarot Mavi-Şimşek Ejder Kanatları (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Mavi-beyaz volkanik yıldırımlarla çakan devasa obsidiyen kanatlar.', fc: 4200, st: { gu: 42, ce: 42, zi: 36, ru: 38 } },

  // 4. SİLAH & ASA (11)
  wpn_1: { id: 'wpn_1', slot: 'wpn', idx: 1, tier: 1, ad: 'Meşe Çoban Asası', d: 'Genç ejderhaları yönlendirmekte kullanılan sağlam meşe değnek.', fc: 140, st: { gu: 3, ce: 2, zi: 2, ru: 2 } },
  wpn_2: { id: 'wpn_2', slot: 'wpn', idx: 2, tier: 1, ad: 'Tunç Ejderha Başlı Asa', d: 'Tepesinde ejderha oyma mührü taşıyan terbiyeci asası.', fc: 280, st: { gu: 5, ce: 3, zi: 3, ru: 4 } },
  wpn_3: { id: 'wpn_3', slot: 'wpn', idx: 3, tier: 2, ad: 'Kor Ateşi Terbiyeci Kırbacı', d: 'Şakladığında havada kor kıvılcımlar bırakan esnek kırbaç.', fc: 450, st: { gu: 8, ce: 7, zi: 2, ru: 5 } },
  wpn_4: { id: 'wpn_4', slot: 'wpn', idx: 4, tier: 2, ad: 'Selçuklu Dilimli Tunç Topuz', d: 'Zırhlı hedefleri sarsan altı dilimli ağır süvari gürzü.', fc: 640, st: { gu: 11, ce: 4, zi: 7, ru: 5 } },
  wpn_5: { id: 'wpn_5', slot: 'wpn', idx: 5, tier: 3, ad: 'Buzul Kristal Asa', d: 'Buzul Sırtı çekirdeğinden yontulmuş dondurucu efsun asası.', fc: 880, st: { gu: 9, ce: 8, zi: 7, ru: 13 } },
  wpn_6: { id: 'wpn_6', slot: 'wpn', idx: 6, tier: 3, ad: 'Zümrüt Alevli Savaş Teberi', d: 'Yeşil ejder ateşiyle yıkanmış geniş ağızlı muhafız teberi.', fc: 1160, st: { gu: 15, ce: 9, zi: 10, ru: 10 } },
  wpn_7: { id: 'wpn_7', slot: 'wpn', idx: 7, tier: 4, ad: 'Gölge Hilal Tırpan-Asası', d: 'Gece sisini biçen hilal başlıklı kadim gölge silahı.', fc: 1480, st: { gu: 17, ce: 14, zi: 9, ru: 15 } },
  wpn_8: { id: 'wpn_8', slot: 'wpn', idx: 8, tier: 4, ad: 'Magma Ejder Kemiği Sancağı', d: 'Kadim bir ejderhanın omurgasından dövülmüş, lav çekirdekli ulu asa.', fc: 1920, st: { gu: 22, ce: 15, zi: 15, ru: 20 } },
  wpn_9: { id: 'wpn_9', slot: 'wpn', idx: 9, tier: 5, raidDrop: true, shardKey: 'sahmeran_kalip', ad: 'Camasb\'ın Zümrüt Yılan Asası', d: 'Sırça Saray Zindanı Özel Yadigârı: Çifte tunç engereğin sardığı kadim zümrüt çekirdekli asa.', fc: 2950, st: { gu: 30, ce: 22, zi: 18, ru: 28 } },
  wpn_10: { id: 'wpn_10', slot: 'wpn', idx: 10, tier: 5, raidDrop: true, shardKey: 'kalgarot_kalip', ad: 'Kalgarot Magma Yatağan-Teberi', d: 'Volkanik Kaldera Zindanı Özel Yadigârı: Kor rünleriyle dövülmüş, zırh ve kaya parçalayan devasa ejder kemiği yatağan.', fc: 3250, st: { gu: 36, ce: 20, zi: 22, ru: 24 } },
  wpn_11: { id: 'wpn_11', slot: 'wpn', idx: 11, tier: 6, raidDrop: true, ascendFrom: 'wpn_10', shardKey: 'kalgarot_kalip', ad: 'Mavi-Kor Kıyamet Yaran Kılıcı (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Mavi plazma alevleriyle dağı taşı ikiye yaran devasa obsidiyen kılıç.', fc: 4650, st: { gu: 52, ce: 32, zi: 30, ru: 38 } },

  // 5. YÜZ AKSESUARI & MASKE (9)
  face_1: { id: 'face_1', slot: 'face', idx: 1, tier: 1, ad: 'Avcı Yara İzi ve Sargısı', d: 'İlk yaban ejderhası karşılaşmasından kalan onur nişanı.', fc: 95, st: { gu: 3, ce: 2, zi: 2, ru: 1 } },
  face_2: { id: 'face_2', slot: 'face', idx: 2, tier: 1, ad: 'Altın Simyacı Monoklu', d: 'Ejderhaların gizli gen potansiyelini süzen büyüteçli mercek.', fc: 210, st: { gu: 2, ce: 4, zi: 2, ru: 5 } },
  face_3: { id: 'face_3', slot: 'face', idx: 3, tier: 2, ad: 'Pirinç Demirci Gözlüğü', d: 'Örs kıvılcımlarına ve kül fırtınasına karşı koruyucu gözlük.', fc: 350, st: { gu: 4, ce: 5, zi: 5, ru: 4 } },
  face_4: { id: 'face_4', slot: 'face', idx: 4, tier: 2, ad: 'Kızıl İpek Esrar Peçesi', d: 'Tuz Çölü fırtınalarında yüzü koruyan altın işlemeli peçe.', fc: 510, st: { gu: 5, ce: 8, zi: 4, ru: 6 } },
  face_5: { id: 'face_5', slot: 'face', idx: 5, tier: 3, ad: 'Kemik Yarı-Maske', d: 'Obsidiyen avcılarının taktığı korkutucu ejder kemiği maske.', fc: 720, st: { gu: 9, ce: 7, zi: 6, ru: 8 } },
  face_6: { id: 'face_6', slot: 'face', idx: 6, tier: 3, ad: 'Boynuzlu Tunç Savaş Maskesi', d: 'Arenada rakiplerin yüreğine korku salan dövme tunç maske.', fc: 960, st: { gu: 12, ce: 7, zi: 10, ru: 8 } },
  face_7: { id: 'face_7', slot: 'face', idx: 7, tier: 4, ad: 'Ulu Anadolu Beyi Pala Bıyığı', d: 'Bilgeliğin ve sözü geçen ocak reisliğinin gür nişanesi.', fc: 1240, st: { gu: 12, ce: 10, zi: 13, ru: 12 } },
  face_8: { id: 'face_8', slot: 'face', idx: 8, tier: 4, ad: 'Altın Rünlü Kahin Göz Bağı', d: 'Gözleri kapatsa da ejderhanın ruhuyla görmeyi sağlayan kadim bağ.', fc: 1580, st: { gu: 14, ce: 15, zi: 12, ru: 18 } },
  face_9: { id: 'face_9', slot: 'face', idx: 9, tier: 6, raidDrop: true, ascendFrom: 'face_8', shardKey: 'kalgarot_kalip', ad: 'Mavi-Kor Kıyamet Vizörü (Uyanış)', d: 'Tier 6 Uyanış Yadigârı: Tüm rüzgâr sapmalarını ve zayıf noktaları gösteren mavi alevli altın vizör.', fc: 3600, st: { gu: 32, ce: 36, zi: 28, ru: 40 } },

  // 6. TILSIM & YÜZÜK (10)
  tal_1: { id: 'tal_1', slot: 'tal', idx: 1, tier: 1, ad: 'Ejder Dişi Kolye', d: 'Süt dişinden yapılmış, yavru ejderhaları sakinleştiren muska.', fc: 105, st: { gu: 2, ce: 2, zi: 2, ru: 3 } },
  tal_2: { id: 'tal_2', slot: 'tal', idx: 2, tier: 1, ad: 'Parlayan Kehribar Muska', d: 'İçinde bin yıllık güneş sıcaklığı hapsolmuş üçgen kehribar.', fc: 225, st: { gu: 3, ce: 3, zi: 3, ru: 5 } },
  tal_3: { id: 'tal_3', slot: 'tal', idx: 3, tier: 2, ad: 'Tunç Güneş Madalyonu', d: 'Anadolu güneş kursu motifli, nefes yenileyen madalyon.', fc: 375, st: { gu: 5, ce: 4, zi: 5, ru: 6 } },
  tal_4: { id: 'tal_4', slot: 'tal', idx: 4, tier: 2, ad: 'Yakut Ejder Kalbi Tılsımı', d: 'Canlı bir kor gibi atan, ejderhaya fazladan can veren yakut kalp.', fc: 540, st: { gu: 7, ce: 5, zi: 7, ru: 8 } },
  tal_5: { id: 'tal_5', slot: 'tal', idx: 5, tier: 3, ad: 'Zümrüt Mühür Yüzüğü', d: 'Hanedan terbiyecilerinin parmağında taşıdığı asil mühür yüzüğü.', fc: 750, st: { gu: 8, ce: 8, zi: 8, ru: 10 } },
  tal_6: { id: 'tal_6', slot: 'tal', idx: 6, tier: 3, ad: 'Yıldırım Fırtına Küresi', d: 'Terbiyecinin omzunda süzülen, şimşek çaktıran enerji küresi.', fc: 1010, st: { gu: 11, ce: 12, zi: 7, ru: 12 } },
  tal_7: { id: 'tal_7', slot: 'tal', idx: 7, tier: 4, ad: 'Çifte Altın İkrar Yüzüğü', d: 'Kan kardeşliği ve yoldaşlık yeminiyle bağlananların kutsal halkası.', fc: 1320, st: { gu: 13, ce: 13, zi: 13, ru: 15 } },
  tal_8: { id: 'tal_8', slot: 'tal', idx: 8, tier: 4, ad: 'Göksel Ejderha Ruhu Küresi', d: 'İçinde kadim bir ejderha ruhu dönen, mutlak kudret küresi.', fc: 1720, st: { gu: 16, ce: 16, zi: 16, ru: 20 } },
  tal_9: { id: 'tal_9', slot: 'tal', idx: 9, tier: 5, raidDrop: true, shardKey: 'sahmeran_kalip', ad: 'Şahmeran Kehribar Gözyaşı', d: 'Sırça Saray Zindanı Özel Yadigârı: Bin yıllık Tarsus kehribarında mühürlü ölümsüzlük tılsımı.', fc: 2400, st: { gu: 22, ce: 22, zi: 22, ru: 30 } },
  tal_10: { id: 'tal_10', slot: 'tal', idx: 10, tier: 5, raidDrop: true, shardKey: 'kalgarot_kalip', ad: 'Kalgarot\'un Sönmeyen Kor Kalbi', d: 'Volkanik Kaldera Zindanı Özel Yadigârı: Kara demir kafes içinde atan, POW öfkesini hızla dolduran saf ejderha kalbi.', fc: 2600, st: { gu: 26, ce: 22, zi: 24, ru: 26 } },

  // 7. BATIK DONANMA & DERYA YILANI ABRA LEVIATHAN SETİ (6)
  abra_helm:     { id: 'abra_helm',     slot: 'hat',   idx: 13, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/abra_head_only_roar.webp',     layerKey: 'hat_11',  ad: 'Abra Derin Derya Miğferi',        d: 'Batık Donanma Özel Yadigârı: Biyolüminesan mercan tepelikli ve pirinç dalgıç vizörlü derin derya miğferi.', fc: 2720, st: { gu: 26, ce: 22, zi: 28, ru: 24 } },
  abra_armor:    { id: 'abra_armor',    slot: 'armor', idx: 12, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/abra_neck_pillar_v2.webp',     layerKey: 'armor_9', ad: 'Leviathan Pullu Kaptan Zırhı',   d: 'Batık Donanma Özel Yadigârı: Derya Yılanı Abra\'nın su ve yıldırım geçirmeyen fosforlu pullarıyla kaplı kaptan zırhı.', fc: 3150, st: { gu: 30, ce: 22, zi: 34, ru: 26 } },
  abra_weapon:   { id: 'abra_weapon',   slot: 'wpn',   idx: 12, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/proj_abyssal_coral_lance.webp',layerKey: 'wpn_5',   ad: 'Girdap Zıpkını & Mercan Topu',   d: 'Batık Donanma Özel Yadigârı: Yüksek açılı aşırtma atışlarda mercan mızrağı ve abisal girdap saçan kadim zıpkın.', fc: 3320, st: { gu: 38, ce: 24, zi: 22, ru: 28 } },
  abra_back:     { id: 'abra_back',     slot: 'back',  idx: 11, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/abra_tail_fin_v2.webp',        layerKey: 'back_6',  ad: 'Fosforlu Yüzgeç Pelerini',       d: 'Batık Donanma Özel Yadigârı: Sırtında biyolüminesan derya yüzgeci parlayan, dalga savrulmasını azaltan pelerin.', fc: 2880, st: { gu: 26, ce: 32, zi: 26, ru: 30 } },
  abra_talisman: { id: 'abra_talisman', slot: 'tal',   idx: 11, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/proj_abyssal_water_orb.webp',  layerKey: 'tal_6',   ad: 'Batık Kadırga Pusulası',         d: 'Batık Donanma Özel Yadigârı: Fırtınalı denizlerde bile rüzgâr sapmasını sıfırlayan kadim Selçuklu usturlap pusulası.', fc: 2680, st: { gu: 24, ce: 28, zi: 24, ru: 30 } },
  abra_face:     { id: 'abra_face',     slot: 'face',  idx: 10, tier: 5, raidDrop: true, shardKey: 'abra_kalip', shardsNeeded: 3, ic: 'img/abra/golem_coral_body.webp',        layerKey: 'face_3',  ad: 'Abisal Solungaç Maskesi',        d: 'Batık Donanma Özel Yadigârı: Derin hendek basıncına ve abisal yıldırımlara dayanıklı pirinç-mercan solungaç maskesi.', fc: 2540, st: { gu: 24, ce: 26, zi: 26, ru: 28 } },
};

const CHIBI_STONES = {
  kor_t1:      { k: 'kor_t1',      ad: 'Kıvılcım Kor Taşı', ic: 'img/ui/items/stone_kor_t1.webp',      tier: 1, basePrice: 45,  d: '+1..+4 güvenli kademe dövme taşı (Köy/Şehir Arenası & Sefer)' },
  kor_t2:      { k: 'kor_t2',      ad: 'Harlı Kor Taşı',    ic: 'img/ui/items/stone_kor_t2.webp',      tier: 2, basePrice: 140, d: '+5..+8 riskli kademe dövme taşı (Şehir/Çukur Arenası, Kervan & Zindan)' },
  kor_t3:      { k: 'kor_t3',      ad: 'Kadim Magma Taşı',  ic: 'img/ui/items/stone_kor_t3.webp',      tier: 3, basePrice: 380, d: '+9..+12 cehennem kademesi dövme taşı (Çukur, Gök Kulesi, Kül Yutan & Zindan)' },
  anka_koruma: { k: 'anka_koruma', ad: 'Anka Mühür Taşı',   ic: 'img/ui/items/stone_anka_koruma.webp', tier: 4, basePrice: 950, d: '+5..+12 dövmede seviye düşmesini ve eşyanın yanıp hurdaya dönmesini %100 önler!' },
};

const CHIBI_ORES = {
  obsidiyen: { k: 'obsidiyen', ad: 'Obsidiyen Cevheri',  ic: 'img/ui/items/ore_obsidiyen.webp', route: 'Kızıl Vadi',     basePrice: 110, d: 'Kızıl Vadi Kervan Yolu volkanik cevheri (Silah & Miğfer dökümü)' },
  kehribar:  { k: 'kehribar',  ad: 'Donmuş Kehribar',    ic: 'img/ui/items/ore_kehribar.webp',  route: 'Buzul Geçidi',   basePrice: 110, d: 'Buzul Geçidi Kervan Yolu kehribar cevheri (Zırh & Tılsım dökümü)' },
  mercan:    { k: 'mercan',    ad: 'Derin Mercan Taşı',  ic: 'img/ui/items/ore_mercan.webp',    route: 'Mercan Kıyısı',  basePrice: 110, d: 'Mercan Kıyısı Kervan Yolu biyolüminesan cevheri (Pelerin & Maske dökümü)' },
  yildirim:  { k: 'yildirim',  ad: 'Yıldırım Kuvarsı',   ic: 'img/ui/items/ore_yildirim.webp',  route: 'Fırtına Boğazı', basePrice: 130, d: 'Fırtına Boğazı Kervan Yolu şimşekli kuvars cevheri (Üst Kademe & Uyanış dökümü)' },
};

const CHIBI_SHARDS = {
  sahmeran_kalip: { k: 'sahmeran_kalip', ad: 'Şahmeran Sırça Kalıbı', ic: 'img/ui/items/shard_sahmeran.webp',           basePrice: 480, d: 'Sırça Saray Zindanı kadim ekipman şeması parçası' },
  kalgarot_kalip: { k: 'kalgarot_kalip', ad: 'Kalgarot Kor Kalıbı',   ic: 'img/ui/items/shard_kalgarot.webp',           basePrice: 520, d: 'Volkanik Kaldera Zindanı kadim ekipman şeması parçası' },
  abra_kalip:     { k: 'abra_kalip',     ad: 'Abra Derya Kalıbı', ic: 'img/abra/abra_closeup_portrait_v2.webp',     basePrice: 540, d: 'Batık Donanma & Derya Yılanı Abra Zindanı kadim ekipman şeması parçası' },
};

const CHIBI_ESSENCES = {
  kiyamet_ozu: { k: 'kiyamet_ozu', ad: 'Kıyamet Özü', ic: 'img/ui/items/essence_kiyamet.webp', basePrice: 900, d: 'Tier 6 Uyanış ekipmanlarını dövmek için gereken saf enerji küresi' },
};

function syncChibiSlotPlus(C) {
  if (!C) return;
  if (!C.plus) C.plus = { hat: 0, face: 0, armor: 0, back: 0, wpn: 0, tal: 0 };
  if (!C.itemPlus) C.itemPlus = {};
  if (!C.burnedItems) C.burnedItems = {};
  for (const sl of CHIBI_SLOTS) {
    const itemId = C.eq && C.eq[sl.k];
    if (itemId && C.burnedItems[itemId]) {
      C.eq[sl.k] = null;
      C.plus[sl.k] = 0;
    } else if (itemId && CHIBI_ITEMS[itemId]) {
      C.plus[sl.k] = C.itemPlus[itemId] || 0;
    } else {
      C.plus[sl.k] = 0;
    }
  }
  if (C.stones) {
    C.korTasi = C.stones.kor_t1 || 0;
    C.korumaTilsimi = C.stones.anka_koruma || 0;
  }
  if (C.shards) {
    C.shards.sahmeran = C.shards.sahmeran_kalip || 0;
    C.shards.kalgarot = C.shards.kalgarot_kalip || 0;
    C.shards.abra = C.shards.abra_kalip || 0;
  }
  if (C.essences) {
    C.essences.kiyamet = C.essences.kiyamet_ozu || 0;
  }
}

function ensureChibi() {
  if (!S) return null;
  if (!S.chibi) {
    S.chibi = {
      gender: 'male',
      skin: 'bugday',
      hair: 1,
      hairColor: 'dogal',
      expr: 1,
      eyeColor: 'kehribar',
      eq: {
        hat: 'hat_1',
        face: 'face_1',
        armor: 'armor_1',
        back: 'back_1',
        wpn: 'wpn_1',
        tal: 'tal_1',
      },
      plus: { hat: 0, face: 0, armor: 0, back: 0, wpn: 0, tal: 0 },
      unlockedItems: {
        hat_1: true,
        armor_1: true,
        back_1: true,
        wpn_1: true,
        face_1: true,
        tal_1: true,
      },
      itemPlus: {},
      burnedItems: {},
      stones: {
        kor_t1: 12,
        kor_t2: 2,
        kor_t3: 0,
        anka_koruma: 1,
      },
      ores: {
        obsidiyen: 0,
        kehribar: 0,
        mercan: 0,
        yildirim: 0,
      },
      shards: {
        sahmeran_kalip: 0,
        kalgarot_kalip: 0,
        abra_kalip: 0,
      },
      essences: {
        kiyamet_ozu: 0,
      },
      korTasi: 12,
      korumaTilsimi: 1,
      showDragon: true,
      _migratedV24: true,
    };
  }
  const C = S.chibi;
  if (!C.eq) C.eq = { hat: 'hat_1', face: 'face_1', armor: 'armor_1', back: 'back_1', wpn: 'wpn_1', tal: 'tal_1' };
  if (!C.plus) C.plus = { hat: 0, face: 0, armor: 0, back: 0, wpn: 0, tal: 0 };
  if (!C.unlockedItems) C.unlockedItems = {};
  ['hat_1', 'armor_1', 'back_1', 'wpn_1', 'face_1', 'tal_1'].forEach(id => { C.unlockedItems[id] = true; });
  if (!C.itemPlus) C.itemPlus = {};
  if (!C.burnedItems) C.burnedItems = {};
  if (!C.stones) {
    C.stones = {
      kor_t1: typeof C.korTasi === 'number' ? Math.max(0, C.korTasi) : 12,
      kor_t2: 2,
      kor_t3: 0,
      anka_koruma: typeof C.korumaTilsimi === 'number' ? Math.max(0, C.korumaTilsimi) : 1,
    };
  } else {
    if (typeof C.stones.kor_t1 !== 'number') C.stones.kor_t1 = 0;
    if (typeof C.stones.kor_t2 !== 'number') C.stones.kor_t2 = 0;
    if (typeof C.stones.kor_t3 !== 'number') C.stones.kor_t3 = 0;
    if (typeof C.stones.anka_koruma !== 'number') C.stones.anka_koruma = 0;
  }
  if (!C.ores) C.ores = { obsidiyen: 0, kehribar: 0, mercan: 0, yildirim: 0 };
  ['obsidiyen', 'kehribar', 'mercan', 'yildirim'].forEach(k => { if (typeof C.ores[k] !== 'number') C.ores[k] = 0; });
  if (!C.shards) C.shards = { sahmeran_kalip: 0, kalgarot_kalip: 0, abra_kalip: 0 };
  ['sahmeran_kalip', 'kalgarot_kalip', 'abra_kalip'].forEach(k => { if (typeof C.shards[k] !== 'number') C.shards[k] = 0; });
  if (!C.essences) C.essences = { kiyamet_ozu: 0 };
  if (typeof C.essences.kiyamet_ozu !== 'number') C.essences.kiyamet_ozu = 0;

  // Migrate equipped items from older saves so nothing currently worn disappears
  if (!C._migratedV24) {
    for (const sl of CHIBI_SLOTS) {
      const eqId = C.eq[sl.k];
      if (eqId && CHIBI_ITEMS[eqId]) {
        C.unlockedItems[eqId] = true;
        if (C.itemPlus[eqId] == null && C.plus && C.plus[sl.k] > 0) {
          C.itemPlus[eqId] = C.plus[sl.k];
        }
      }
    }
    C._migratedV24 = true;
  }
  syncChibiSlotPlus(C);
  return C;
}

function awardChibiStones(drops) {
  const C = ensureChibi();
  if (!C || !drops) return [];
  const summary = [];
  const addStone = (k, amt) => {
    if (amt > 0 && CHIBI_STONES[k]) {
      C.stones[k] = (C.stones[k] || 0) + amt;
      summary.push(`+${amt} ${CHIBI_STONES[k].ad}`);
    }
  };
  const addOre = (k, amt) => {
    if (amt > 0 && CHIBI_ORES[k]) {
      C.ores[k] = (C.ores[k] || 0) + amt;
      summary.push(`+${amt} ${CHIBI_ORES[k].ad}`);
    }
  };
  const addShard = (rawKey, amt) => {
    if (amt <= 0) return;
    if (CHIBI_ITEMS && CHIBI_ITEMS[rawKey]) {
      const it = CHIBI_ITEMS[rawKey];
      C.shards[rawKey] = (C.shards[rawKey] || 0) + amt;
      const bossKey = it.shardKey || (it.idx % 2 === 1 ? 'sahmeran_kalip' : 'kalgarot_kalip');
      C.shards[bossKey] = (C.shards[bossKey] || 0) + amt;
      summary.push(`+${amt} ${it.ad} Kalıp Parçası`);
      return;
    }
    const k = rawKey === 'sahmeran' ? 'sahmeran_kalip' : rawKey === 'kalgarot' ? 'kalgarot_kalip' : rawKey === 'abra' ? 'abra_kalip' : rawKey;
    if (CHIBI_SHARDS[k]) {
      C.shards[k] = (C.shards[k] || 0) + amt;
      summary.push(`+${amt} ${CHIBI_SHARDS[k].ad}`);
    }
  };
  const addEssence = (rawKey, amt) => {
    const k = rawKey === 'kiyamet' ? 'kiyamet_ozu' : rawKey;
    if (amt > 0 && CHIBI_ESSENCES[k]) {
      C.essences[k] = (C.essences[k] || 0) + amt;
      summary.push(`+${amt} ${CHIBI_ESSENCES[k].ad}`);
    }
  };

  if (drops.stones) {
    for (const [k, amt] of Object.entries(drops.stones)) addStone(k, amt);
  }
  if (drops.ores) {
    for (const [k, amt] of Object.entries(drops.ores)) addOre(k, amt);
  }
  if (drops.shards) {
    for (const [k, amt] of Object.entries(drops.shards)) addShard(k, amt);
  }
  if (drops.essences) {
    for (const [k, amt] of Object.entries(drops.essences)) addEssence(k, amt);
  }

  // Also support flat drop maps: { kor_t1: 2, obsidiyen: 3, sahmeran_kalip: 1, kiyamet_ozu: 1 }
  for (const [k, amt] of Object.entries(drops)) {
    if (typeof amt !== 'number' || amt <= 0) continue;
    if (CHIBI_STONES[k]) addStone(k, amt);
    else if (CHIBI_ORES[k]) addOre(k, amt);
    else if (CHIBI_SHARDS[k] || k === 'sahmeran' || k === 'kalgarot' || k === 'abra') addShard(k, amt);
    else if (CHIBI_ESSENCES[k] || k === 'kiyamet') addEssence(k, amt);
  }

  syncChibiSlotPlus(C);
  return summary;
}

function getChibiEnhancementSpec(itemId, currentPlus) {
  const it = CHIBI_ITEMS[itemId];
  const tier = it ? (it.tier || 1) : 1;
  const pl = Math.max(0, Math.min(12, currentPlus || 0));
  if (pl >= 12) return null;
  const tierMult = Math.max(1, Math.ceil(tier * 0.75));
  if (pl < 4) {
    return {
      pl,
      nextPl: pl + 1,
      stoneKey: 'kor_t1',
      stoneCost: [3, 6, 10, 16][pl] * tierMult,
      goldCost: [40, 80, 140, 220][pl] * tier,
      rate: [100, 95, 90, 82][pl],
      zone: 'safe',
      zoneLabel: 'Güvenli Kademe (Yanma/Düşme Yok)',
    };
  }
  if (pl < 7) {
    const idx = pl - 4;
    return {
      pl,
      nextPl: pl + 1,
      stoneKey: 'kor_t2',
      stoneCost: [5, 9, 14][idx] * tierMult,
      goldCost: [320, 480, 680][idx] * tier,
      rate: [70, 58, 46][idx],
      zone: 'downgrade',
      zoneLabel: 'Harlı Kademe (Başarısızlıkta -1 Seviye Düşer)',
    };
  }
  const idx = pl - 7;
  const stoneKey = pl === 7 ? 'kor_t2' : 'kor_t3';
  const baseStones = pl === 7 ? 20 : [6, 11, 18, 28][pl - 8];
  return {
    pl,
    nextPl: pl + 1,
    stoneKey,
    stoneCost: baseStones * tierMult,
    goldCost: [950, 1300, 1800, 2500, 3500][idx] * tier,
    rate: [36, 26, 18, 12, 8][idx],
    zone: 'burn',
    zoneLabel: 'CEHENNEM KADEMESİ (Anka Mührü Yoksa EŞYA YANAR!)',
  };
}

function getChibiItemPrimaryOre(it) {
  if (!it) return 'obsidiyen';
  if (it.id && String(it.id).includes('abra')) return 'mercan';
  if (it.shardKey === 'abra_kalip') return (it.slot === 'wpn' || it.slot === 'tal') ? 'yildirim' : 'mercan';
  if (it.tier >= 5 && it.idx % 2 === 0) return 'yildirim';
  if (it.slot === 'wpn' || it.slot === 'hat') return it.idx >= 6 && it.idx % 2 === 0 ? 'yildirim' : 'obsidiyen';
  if (it.slot === 'armor' || it.slot === 'tal') return 'kehribar';
  return 'mercan';
}

function getChibiItemCraftRecipe(itemId) {
  const it = CHIBI_ITEMS[itemId];
  if (!it) return null;
  if (it.idx === 1) return { starter: true, gold: 0, stones: {}, ores: {}, shards: {}, essences: {} };
  const oreKey = getChibiItemPrimaryOre(it);
  const shardKey = it.shardKey || (it.idx % 2 === 1 ? 'sahmeran_kalip' : 'kalgarot_kalip');
  if (it.tier === 1) {
    // idx === 2
    return {
      gold: 200,
      stones: { kor_t1: 4 },
      ores: {},
      shards: {},
      essences: {},
    };
  }
  if (it.tier === 2) {
    return {
      gold: 450,
      stones: { kor_t1: 8 },
      ores: { [oreKey]: 2 },
      shards: {},
      essences: {},
    };
  }
  if (it.tier === 3) {
    return {
      gold: 950,
      stones: { kor_t2: 6 },
      ores: { [oreKey]: 6 },
      shards: { [shardKey]: 1 },
      essences: {},
    };
  }
  if (it.tier === 4) {
    return {
      gold: 1800,
      stones: { kor_t2: 12, kor_t3: 3 },
      ores: { [oreKey]: 12 },
      shards: { [shardKey]: 3 },
      essences: {},
    };
  }
  if (it.tier === 5) {
    return {
      gold: 1200,
      stones: { kor_t3: 6 },
      ores: { [oreKey]: 15 },
      shards: { [shardKey]: it.shardsNeeded || 5 },
      essences: {},
    };
  }
  // Tier 6 Ascension
  return {
    gold: 2500,
    ascendFrom: it.ascendFrom || null,
    reqPlus: 10,
    stones: { kor_t3: 10 },
    ores: { [oreKey]: 25 },
    shards: {},
    essences: { kiyamet_ozu: 5 },
  };
}

function getChibiRepairCost(itemId) {
  const it = CHIBI_ITEMS[itemId];
  if (!it) return null;
  const oreKey = getChibiItemPrimaryOre(it);
  const shardKey = it.shardKey || (it.idx % 2 === 1 ? 'sahmeran_kalip' : 'kalgarot_kalip');
  if (it.tier <= 2) {
    return { gold: 250, stones: { kor_t1: 10 }, ores: {}, shards: {} };
  }
  return { gold: 600, stones: {}, ores: { [oreKey]: 5 }, shards: { [shardKey]: 1 } };
}

function chibiSkinFilter(skinKey) {
  const s = CHIBI_SKINS.find(x => x.k === skinKey);
  return s ? s.flt : 'none';
}
function chibiHairFilter(hcKey) {
  const c = CHIBI_HAIR_COLORS.find(x => x.k === hcKey);
  return c ? c.flt : 'none';
}
function chibiEyeFilter(ecKey) {
  const c = CHIBI_EYE_COLORS.find(x => x.k === ecKey);
  return c ? c.flt : 'none';
}

const CHIBI_SET_DEFS = {
  sahmeran: {
    id: 'sahmeran',
    ad: 'Şahmeran Sırça Seti',
    items: ['hat_9', 'hat_11', 'armor_9', 'wpn_9', 'back_9', 'tal_9'],
    minPieces: 3,
    mult: 1.15,
    bonusDesc: '+15% Tüm Nitelikler & Özel Zindan Aurası',
    auraLabel: 'Sırça Zümrüt Zindan Aurası',
    color: '#9ad07a',
    border: '#6b9e4f',
    bg: 'linear-gradient(90deg, rgba(22, 38, 18, 0.94), rgba(74, 118, 52, 0.32))'
  },
  kalgarot: {
    id: 'kalgarot',
    ad: 'Kalgarot Kıyamet Seti',
    items: ['hat_10', 'hat_12', 'armor_10', 'armor_11', 'wpn_10', 'wpn_11', 'back_10', 'face_9', 'tal_10'],
    minPieces: 3,
    mult: 1.15,
    bonusDesc: '+15% Tüm Nitelikler & Özel Zindan Aurası',
    auraLabel: 'Mavi-Kor Zindan Aurası',
    color: '#ffb067',
    border: '#d9b062',
    bg: 'linear-gradient(90deg, rgba(42, 20, 12, 0.94), rgba(217, 120, 48, 0.32))'
  },
  abra: {
    id: 'abra',
    ad: 'Derin Derya Leviathan Seti',
    items: ['abra_helm', 'abra_armor', 'abra_weapon', 'abra_back', 'abra_talisman', 'abra_face'],
    minPieces: 3,
    mult: 1.15,
    bonusDesc: '+15% Tüm Nitelikler & Biyolüminesan Derya Aurası',
    auraLabel: 'Derin Derya Leviathan Aurası',
    color: '#4deeea',
    border: '#00b4d8',
    bg: 'linear-gradient(90deg, rgba(8, 30, 44, 0.94), rgba(0, 180, 216, 0.32))'
  }
};

function calcChibiStats(ch) {
  const C = ch || (S && ensureChibi());
  const st = { gu: 0, ce: 0, zi: 0, ru: 0 };
  let eqFc = 100; // Baz terbiyeci kudreti
  let maxPlus = 0;
  let totalPlus = 0;
  if (!C || !C.eq) return { st, eqFc, dragonFc: 0, totalFc: 100, maxPlus: 0, totalPlus: 0, auraTier: 0, activeSet: null, sahCount: 0, kalCount: 0, abraCount: 0 };

  let sahCount = 0;
  let kalCount = 0;
  let abraCount = 0;

  for (const sl of CHIBI_SLOTS) {
    const itemId = C.eq[sl.k];
    if (itemId && C.burnedItems && C.burnedItems[itemId]) continue; // Yanmış hurda eşya 0 nitelik verir
    const pl = (C.itemPlus && itemId && C.itemPlus[itemId] != null)
      ? C.itemPlus[itemId]
      : ((C.plus && C.plus[sl.k]) || 0);
    if (itemId && CHIBI_ITEMS[itemId]) {
      const it = CHIBI_ITEMS[itemId];
      const mult = 1 + pl * 0.14;
      eqFc += Math.round(it.fc * mult);
      st.gu += Math.round(it.st.gu * mult);
      st.ce += Math.round(it.st.ce * mult);
      st.zi += Math.round(it.st.zi * mult);
      st.ru += Math.round(it.st.ru * mult);
      if (pl > maxPlus) maxPlus = pl;
      totalPlus += pl;
      if (CHIBI_SET_DEFS.sahmeran.items.includes(itemId)) sahCount++;
      if (CHIBI_SET_DEFS.kalgarot.items.includes(itemId)) kalCount++;
      if (CHIBI_SET_DEFS.abra.items.includes(itemId)) abraCount++;
    }
  }

  let activeSet = null;
  if (abraCount >= CHIBI_SET_DEFS.abra.minPieces && abraCount >= kalCount && abraCount >= sahCount) {
    activeSet = Object.assign({ count: abraCount }, CHIBI_SET_DEFS.abra);
  } else if (kalCount >= CHIBI_SET_DEFS.kalgarot.minPieces && kalCount >= sahCount) {
    activeSet = Object.assign({ count: kalCount }, CHIBI_SET_DEFS.kalgarot);
  } else if (sahCount >= CHIBI_SET_DEFS.sahmeran.minPieces) {
    activeSet = Object.assign({ count: sahCount }, CHIBI_SET_DEFS.sahmeran);
  }

  if (activeSet) {
    st.gu = Math.round(st.gu * activeSet.mult);
    st.ce = Math.round(st.ce * activeSet.mult);
    st.zi = Math.round(st.zi * activeSet.mult);
    st.ru = Math.round(st.ru * activeSet.mult);
    eqFc = Math.round(eqFc * activeSet.mult);
  }

  let dragonFc = 0;
  if (typeof S !== 'undefined' && S && S.dragons && S.dragons.length) {
    const star = (typeof byId === 'function' && byId(S.star)) || S.dragons[0];
    if (star && star.st) {
      dragonFc = Math.round(((star.st.gu || 0) + (star.st.ce || 0) + (star.st.da || 0) + (star.st.ze || 0)) * 4.5 + (star.w || 0) * 35 + (star.bond || 0) * 3);
    }
  }
  const baseAuraTier = maxPlus >= 12 ? 3 : maxPlus >= 9 ? 2 : maxPlus >= 7 ? 1 : 0;
  const auraTier = activeSet ? Math.max(3, baseAuraTier) : baseAuraTier;
  return { st, eqFc, dragonFc, totalFc: eqFc + dragonFc, maxPlus, totalPlus, auraTier, activeSet, sahCount, kalCount, abraCount };
}

/* ---------- KATMANLI CHİBİ PAPER-DOLL & 4 KONSEPTLİ SAVAŞ POZİSYONU RENDERER ---------- */

const BATTLE_CONCEPTS = [
  { id: 1, ad: 'Hibrit 1+2 (Kolda Ejder + Belden Mafsallı + Silah)', kisa: 'Hibrit 1+2 (Önerilen)', d: 'Konsept 1 ve 2 birleşimi: Bacaklar yere sağlam basar; üst gövde, kuşanılan silah ve koldaki genetik yavru ejderha bel mafsalından nişan açısına ve animasyona göre esner.' },
  { id: 2, ad: 'Konsept 2 (Saf Belden Mafsallı Topçu)',              kisa: '2. Belden Topçu',       d: 'Yüksek açılı atışlarda üst gövde ve yavru ejderha daha dik açıyla geriye yaslanır.' },
  { id: 3, ad: 'Konsept 3 (Rün Kundaklı Hava Bataryası)',            kisa: '3. Rün Bataryası',      d: 'Genetik yavru ejderha karakterin önünde dönen rün çemberi içinde süzülür.' },
];

const BATTLE_ANIMS = [
  { k: 'idle',        ad: '1. Nefes & Nişan (Idle)',   kisa: 'Nefes / Idle',     dmg: 0,   tag: '' },
  { k: 'dragon_shot', ad: '2. Ejder Nefesi Atışı',     kisa: 'Ejder Atışı',      dmg: 340, tag: 'EJDER NEFESİ!' },
  { k: 'wpn_slash',   ad: '3. Silah / Asa Hücumu',     kisa: 'Silah Hamlesi',    dmg: 420, tag: 'SİLAH DARBESİ!' },
  { k: 'ult_combo',   ad: '4. Hibrit Ulti Kombo',      kisa: 'Hibrit Ulti!',     dmg: 860, tag: 'HİBRİT KOMBO KRİTİK!' },
  { k: 'guard',       ad: '5. Siper & Rün Kalkanı',    kisa: 'Siper / Kalkan',   dmg: 0,   tag: 'KALKAN AKTİF' },
  { k: 'charge',      ad: '6. Kudret & Aura Yükle',    kisa: 'Güç Yükle',        dmg: 0,   tag: 'KUDRET YÜKLENDİ!' },
  { k: 'hit',         ad: '7. Rakip Saldırısı (Hasar)',kisa: 'Hasar Testi',      dmg: 215, tag: '-215 HASAR!' },
  { k: 'victory',     ad: '8. Zafer Şahlanışı',        kisa: 'Zafer Pozu',       dmg: 0,   tag: 'ZAFER!' },
];

const BATTLE_RIVALS = [
  { idx: 2, ad: 'Demirhan (Magma Beyi)',   el: 'ates',    genes: { el: ['ates','ates'], pul: ['kizil','kizil'], sus: ['altin','altin'], pig: ['m','m'], par: ['P','P'], eyec: ['kizil','kizil'] } },
  { idx: 0, ad: 'Kuzey Rüzgârı (Buz)',     el: 'buz',     genes: { el: ['buz','buz'],   pul: ['gok','gok'],     sus: ['inci','inci'],   pig: ['a','a'], par: ['P','p'], eyec: ['gok','gok'] } },
  { idx: 1, ad: 'Leydi Süreyya (Fırtına)', el: 'firtina', genes: { el: ['firtina','firtina'], pul: ['mor','mor'], sus: ['altin','altin'], pig: ['N','N'], par: ['P','P'], eyec: ['mor','mor'] } },
  { idx: 3, ad: 'Bozkır Kurdu (Toprak)',   el: 'toprak',  genes: { el: ['toprak','toprak'],   pul: ['zumrut','zumrut'], sus: ['altin','altin'], pig: ['N','N'], par: ['p','p'], eyec: ['kehribar','kehribar'] } },
];

const GENETIC_BABY_PRESETS = [
  { k: 'star',    ad: 'Kendi Yıldız Ejderhan (Yavru Hâli)', d: 'Ocağındaki seçili ejderhanın tüm gerçek genleriyle yavru formunu kullanır.' },
  { k: 'ates_g',  ad: 'Ateş · Altın Pul + Zümrüt Süs',      el: 'ates',    genes: { el: ['ates','ates'], pul: ['altin','altin'], sus: ['zumrut','zumrut'], pig: ['N','N'], par: ['P','p'], eyec: ['altin','altin'] } },
  { k: 'buz_a',   ad: 'Buz · Albino (aa) + Gül Süs',        el: 'buz',     genes: { el: ['buz','buz'],   pul: ['gok','gok'],     sus: ['gul','gul'],       pig: ['a','a'], par: ['P','p'], eyec: ['kizil','kizil'] } },
  { k: 'fir_p',   ad: 'Fırtına · Mor Pul + Parıltı (P)',    el: 'firtina', genes: { el: ['firtina','firtina'], pul: ['mor','mor'], sus: ['altin','altin'], pig: ['N','N'], par: ['P','P'], eyec: ['gok','gok'] } },
  { k: 'gol_m',   ad: 'Gölge · Melanistik (mm) + Kızıl Pul', el: 'golge',  genes: { el: ['golge','golge'], pul: ['kizil','kizil'], sus: ['altin','altin'], pig: ['m','m'], par: ['P','p'], eyec: ['kizil','kizil'] } },
  { k: 'top_z',   ad: 'Toprak · Zümrüt Pul + İnci Süs',     el: 'toprak',  genes: { el: ['toprak','toprak'], pul: ['zumrut','zumrut'], sus: ['inci','inci'], pig: ['N','N'], par: ['p','p'], eyec: ['kehribar','kehribar'] } },
];

function getBattleBabyDragon() {
  const mode = (typeof UI !== 'undefined' && UI.battleDragonKey) || 'star';
  const star = (typeof S !== 'undefined' && S && S.dragons && ((typeof byId === 'function' && byId(S.star)) || S.dragons[0])) || null;
  if (mode === 'star' && star) {
    return Object.assign({}, star, { stage: 'yavru' });
  }
  const pr = GENETIC_BABY_PRESETS.find(x => x.k === mode) || GENETIC_BABY_PRESETS[1];
  const baseEl = pr.el || 'ates';
  return {
    id: 999,
    name: pr.ad.split('·')[0].trim(),
    el: baseEl,
    stage: 'yavru',
    sex: 'F',
    st: { gu: 65, ce: 65, da: 65, ze: 65 },
    genes: pr.genes || { el: [baseEl, baseEl], pul: ['altin','altin'], sus: ['zumrut','zumrut'], pig: ['N','N'], par: ['P','p'], eyec: ['altin','altin'] },
    traits: ['kor', 'asil'],
  };
}

function renderChibiDoll(ch, opts = {}) {
  const C = ch || ensureChibi() || { gender: 'male', skin: 1, hair: 2, hairColor: 1, eyeColor: 1, expr: 3, eq: { armor: 'armor_7', hat: 'hat_7', wpn: 'wpn_6' } };
  const isBattle = opts.battleStance || (opts.allowBattlePreview && typeof UI !== 'undefined' && UI.chibiBattlePreview);
  const concept = opts.battleConcept || (typeof UI !== 'undefined' && UI.battleConcept) || 1;
  const aimAngle = opts.battleAngle != null ? opts.battleAngle : ((typeof UI !== 'undefined' && UI.battleAngle != null) ? UI.battleAngle : 25);
  const firing = (typeof UI !== 'undefined' && UI.battleFiring) ? ' firing' : '';

  const gender = C.gender || 'male';
  const skinFlt = chibiSkinFilter(C.skin);
  const hairFlt = chibiHairFilter(C.hairColor);
  const eyeFlt  = chibiEyeFilter(C.eyeColor);
  const eq = opts.underwearOnly ? { hat: C.eq?.hat, face: C.eq?.face, armor: null, back: null, wpn: null, tal: null } : (C.eq || {});
  const info = calcChibiStats(C);
  const auraTier = opts.hideAura ? 0 : info.auraTier;
  const flipCls = opts.flip ? ' flip' : '';
  const szCls = opts.cls || '';

  // 1. Arka Pelerin / Kanat
  const backLayer = eq.back && CHIBI_ITEMS[eq.back]
    ? `<img src="img/chibi/layers/${CHIBI_ITEMS[eq.back].layerKey || eq.back}.webp" class="ch-l ch-back" alt="">`
    : '';

  // 2. Gövde: Zırh varsa zırh katmanı, yoksa iç çamaşırlı baz gövde
  let bodyLayer = '';
  if (eq.armor && CHIBI_ITEMS[eq.armor]) {
    bodyLayer = `<img src="img/chibi/layers/neck_${gender}.webp" class="ch-l ch-neck" style="filter:${skinFlt}" alt=""><img src="img/chibi/layers/${CHIBI_ITEMS[eq.armor].layerKey || eq.armor}.webp" class="ch-l ch-armor" alt="">`;
  } else {
    bodyLayer = `
      <img src="img/chibi/layers/body_torso_${gender}.webp" class="ch-l ch-skin" style="filter:${skinFlt}" alt="">
      <img src="img/chibi/layers/underwear_${gender}.webp" class="ch-l ch-uw" alt="">
    `;
  }

  // 3 & 4. Kafa ve Yüz İfadesi
  const exprIdx = C.expr || (gender === 'female' ? 2 : 1);
  const headLayer = `<img src="img/chibi/layers/head_expr_${exprIdx}.webp" class="ch-l ch-head" style="filter:${skinFlt}" alt="">`;
  const exprLayer = (C.eyeColor && C.eyeColor !== 'kehribar')
    ? `<img src="img/chibi/layers/iris_${exprIdx}.webp" class="ch-l ch-iris" style="filter:${eyeFlt}" alt="">`
    : '';

  // 5. Yüz Aksesuarı / Maske
  const faceLayer = eq.face && CHIBI_ITEMS[eq.face]
    ? `<img src="img/chibi/layers/${CHIBI_ITEMS[eq.face].layerKey || eq.face}.webp" class="ch-l ch-face" alt="">`
    : '';

  // 6. Saç Katmanı
  const hideHairForHelm = ['hat_2', 'hat_3', 'hat_4', 'hat_6', 'hat_8', 'hat_9', 'hat_10', 'hat_11', 'hat_12', 'abra_helm'].includes(eq.hat);
  const hairIdx = C.hair != null ? C.hair : 1;
  const hairLayer = (hairIdx > 0 && !hideHairForHelm)
    ? `<img src="img/chibi/layers/hair_${hairIdx}.webp" class="ch-l ch-hair" style="filter:${hairFlt}" alt="">`
    : '';

  // 7. Başlık / Miğfer Katmanı
  const hatLayer = eq.hat && CHIBI_ITEMS[eq.hat]
    ? `<img src="img/chibi/layers/${CHIBI_ITEMS[eq.hat].layerKey || eq.hat}.webp" class="ch-l ch-hat" alt="">`
    : '';

  // 8. Silah / Asa Katmanı
  const wpnPlus = (C.plus && C.plus.wpn) || 0;
  const wpnGlowCls = wpnPlus >= 12 ? ' wpn-glow-12' : wpnPlus >= 9 ? ' wpn-glow-9' : wpnPlus >= 7 ? ' wpn-glow-7' : '';
  const wpnLayer = eq.wpn && CHIBI_ITEMS[eq.wpn]
    ? `<img src="img/chibi/layers/${CHIBI_ITEMS[eq.wpn].layerKey || eq.wpn}.webp" class="ch-l ch-wpn${wpnGlowCls}" alt="">`
    : '';

  // 9. Tılsım / Yüzük
  const talLayer = eq.tal && CHIBI_ITEMS[eq.tal]
    ? `<div class="ch-tal-ring t${CHIBI_ITEMS[eq.tal].tier}"></div>`
    : '';

  // 10. +7 / +9 / +12 Demirci Parlama Aurası & Özel Zindan Set Sinerjisi Aurası
  const setAuraHtml = (!opts.hideAura && info.activeSet)
    ? `<div class="ch-set-aura set-${info.activeSet.id}"></div>`
    : '';
  const auraLayer = auraTier > 0
    ? `${setAuraHtml}<div class="ch-aura tier-${auraTier}"><i></i><i></i><i></i></div>`
    : setAuraHtml;

  // EĞER SAVAŞ POZİSYONU AKTİFSE: HİBRİT 1+2 (Belden Mafsallı Gövde + Kolda Genetik Yavru Ejderha + Sağ Elde Silah + 8 Animasyon Durumu!)
  if (isBattle) {
    const babyD = opts.customBabyDragon || getBattleBabyDragon();
    const babySvg = typeof dragonSVG === 'function' ? dragonSVG(babyD, { still: false, noShadow: true }) : '';
    const elCol = { ates: '#ff7828', buz: '#6ce4ff', firtina: '#c478ff', toprak: '#8ce060', golge: '#e83868' }[babyD.el || 'ates'] || '#ff7828';
    const animState = opts.battleAnim || ((typeof UI !== 'undefined' && UI.battleAnim) ? UI.battleAnim : (firing ? 'dragon_shot' : 'idle'));
    // Hibrit 1+2: Bacaklar sabit basarken üst gövde nişan açısına göre hafifçe (-0.22 * aimAngle) belden esner!
    const tiltFactor = concept === 2 ? -0.34 : -0.22;
    const torsoTilt = Math.round(aimAngle * tiltFactor);
    const hideBadge = opts.hideStanceBadge ? '' : `<span class="battle-stance-badge">HİBRİT 1+2 · ${aimAngle}°</span>`;

    return `<div class="chibi-doll battle-mode bc-hybrid bc-${concept} anim-${animState}${firing} ${szCls}${flipCls} aura-t${auraTier}" style="--aim:${-aimAngle}deg;--tilt:${torsoTilt}deg;--elc:${elCol}" title="Hibrit 1+2 Savaş Pozisyonu · Nişan Açısı: ${aimAngle}°">
      ${auraLayer}
      ${talLayer}
      ${animState === 'guard' ? `<div class="battle-guard-shield"></div>` : ''}
      ${animState === 'charge' || animState === 'ult_combo' ? `<div class="battle-charge-vortex"></div>` : ''}
      <!-- Alt Gövde (Belden aşağı yere sağlam basan bacaklar) -->
      <div class="ch-part ch-lower-legs">
        ${bodyLayer}
      </div>
      <!-- Üst Gövde, Zırh ve Sağ Eldeki Kuşanılmış Silah (Bel mafsalından açıyla ve aksiyonla hareket eder!) -->
      <div class="ch-part ch-body-group">
        ${backLayer}
        ${bodyLayer}
        <div class="ch-wpn-arm">
          ${wpnLayer}
          <div class="wpn-slash-trail"></div>
        </div>
      </div>
      <!-- Kafa & Başlık Grubu (Üst gövdeyle senkronize bel mafsalı) -->
      <div class="ch-part ch-head-group">
        ${headLayer}
        ${exprLayer}
        ${faceLayer}
        ${hairLayer}
        ${hatLayer}
      </div>
      <!-- Genetik Yavru Ejderha Atıcı Namlusu (dragonSVG noShadow ile sıfır dikdörtgen, tüm genler aktif!) -->
      <div class="ch-battle-dragon-mount mount-el-${babyD.el || 'ates'}">
        ${concept === 3 ? `<div class="battle-rune-ring"></div>` : ''}
        <div class="battle-baby-dr">${babySvg}</div>
        <div class="battle-muzzle-orb"></div>
        ${!opts.hideAimArc ? `
          <div class="battle-aim-arc" aria-hidden="true">
            <i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i>
            <span class="battle-target-reticle"></span>
          </div>
        ` : ''}
      </div>
      ${hideBadge}
    </div>`;
  }

  return `<div class="chibi-doll ${szCls}${flipCls} aura-t${auraTier}">
    ${auraLayer}
    ${backLayer}
    ${bodyLayer}
    ${headLayer}
    ${exprLayer}
    ${faceLayer}
    ${hairLayer}
    ${hatLayer}
    ${wpnLayer}
    ${talLayer}
  </div>`;
}
// Akran (Peer) oyuncular ve Er Meydanı rakipleri için sabit tohumlu/prosedürel Chibi üretici (Asla oyuncunun kendi avatarını kopyalamaz!)
function peerChibiConfig(peer, idx) {
  if (peer && peer.chibi) return peer.chibi;
  const presets = [
    { gender: 'male',   skin: 'fildisi',  hair: 7, hairColor: 'gumus',   expr: 3, eyeColor: 'gok',      eq: { hat: 'hat_6', face: 'face_5', armor: 'armor_5', back: 'back_3', wpn: 'wpn_5', tal: 'tal_6' }, plus: { hat: 9, face: 6, armor: 10, back: 8, wpn: 9, tal: 7 } },
    { gender: 'female', skin: 'bugday',   hair: 8, hairColor: 'dogal',   expr: 2, eyeColor: 'mor',      eq: { hat: 'hat_5', face: 'face_4', armor: 'armor_4', back: 'back_6', wpn: 'wpn_7', tal: 'tal_7' }, plus: { hat: 11, face: 8, armor: 12, back: 10, wpn: 11, tal: 10 } },
    { gender: 'male',   skin: 'tunc',     hair: 1, hairColor: 'kizil',   expr: 6, eyeColor: 'kehribar', eq: { hat: 'hat_8', face: 'face_1', armor: 'armor_8', back: 'back_8', wpn: 'wpn_8', tal: 'tal_4' }, plus: { hat: 12, face: 7, armor: 12, back: 12, wpn: 12, tal: 9 } },
    { gender: 'female', skin: 'kehribar', hair: 6, hairColor: 'kestane', expr: 4, eyeColor: 'zumrut',   eq: { hat: 'hat_7', face: 'face_3', armor: 'armor_7', back: 'back_4', wpn: 'wpn_6', tal: 'tal_8' }, plus: { hat: 8, face: 5, armor: 9, back: 7, wpn: 9, tal: 8 } },
    { gender: 'male',   skin: 'gece',     hair: 4, hairColor: 'kizil',   expr: 6, eyeColor: 'kizil',    eq: { hat: 'hat_10', face: 'face_9', armor: 'armor_10', back: 'back_10', wpn: 'wpn_10', tal: 'tal_8' }, plus: { hat: 12, face: 10, armor: 12, back: 12, wpn: 12, tal: 11 } },
  ];
  const h = String((peer && (peer.handle || peer.trainer || peer.name)) || (typeof FT !== 'undefined' && FT && FT.peer && FT.peer.handle) || '').toLowerCase();
  if (h.includes('kuzey')) return presets[0];
  if (h.includes('sureyya') || h.includes('süreyya')) return presets[1];
  if (h.includes('altin') || h.includes('altın') || h.includes('tuz taciri')) return presets[2];
  if (h.includes('selin') || h.includes('firtina') || h.includes('fırtına')) return presets[3];
  if (h.includes('demirhan') || h.includes('karabela')) return presets[4];

  const keyStr = [
    peer && (peer.id || ''),
    peer && (peer.name || ''),
    peer && (peer.trainer || ''),
    peer && (peer.handle || ''),
    peer && (peer.arch || ''),
    peer && (peer.el || ''),
    idx != null ? String(idx) : ''
  ].filter(Boolean).join('|') || 'arena_rakip_' + (idx || 0);

  let rawSeed = 0;
  if (typeof seedOf === 'function') {
    rawSeed = Math.abs(seedOf(keyStr));
  } else {
    for (let i = 0; i < keyStr.length; i++) {
      rawSeed = ((rawSeed << 5) - rawSeed + keyStr.charCodeAt(i)) | 0;
    }
    rawSeed = Math.abs(rawSeed);
  }
  const pick = (arr, step) => arr[Math.abs(Math.floor(rawSeed / step) + step * 7) % arr.length];
  const skins = ['bugday', 'fildisi', 'tunc', 'kehribar', 'esmer', 'kizilkor', 'ayaz', 'gece'];
  const hairCols = ['dogal', 'kestane', 'kizil', 'altin', 'gumus', 'indigo', 'zumrut', 'mor'];
  const eyeCols = ['kehribar', 'gok', 'zumrut', 'kizil', 'mor', 'altin', 'turkuaz', 'obsidyen'];
  const hairs = [1, 2, 3, 4, 5, 6, 7, 8];
  const exprs = [1, 2, 3, 4, 5, 6, 7, 8];
  const hats = ['hat_1', 'hat_2', 'hat_3', 'hat_4', 'hat_5', 'hat_6', 'hat_7', 'hat_8', 'hat_9', 'hat_10'];
  const faces = ['face_1', 'face_2', 'face_3', 'face_4', 'face_5', 'face_6', 'face_7', 'face_8', 'face_9', 'face_10'];
  const armors = ['armor_1', 'armor_2', 'armor_3', 'armor_4', 'armor_5', 'armor_6', 'armor_7', 'armor_8', 'armor_9', 'armor_10'];
  const backs = ['back_1', 'back_2', 'back_3', 'back_4', 'back_5', 'back_6', 'back_7', 'back_8', 'back_9', 'back_10'];
  const wpns = ['wpn_1', 'wpn_2', 'wpn_3', 'wpn_4', 'wpn_5', 'wpn_6', 'wpn_7', 'wpn_8', 'wpn_9', 'wpn_10'];
  const tals = ['tal_1', 'tal_2', 'tal_3', 'tal_4', 'tal_5', 'tal_6', 'tal_7', 'tal_8'];

  const gender = (rawSeed % 2 === 0) ? 'male' : 'female';
  const plusLv = 6 + (rawSeed % 7);
  return {
    gender,
    skin: pick(skins, 3),
    hair: pick(hairs, 5),
    hairColor: pick(hairCols, 7),
    expr: pick(exprs, 11),
    eyeColor: pick(eyeCols, 13),
    eq: {
      hat: pick(hats, 17),
      face: pick(faces, 19),
      armor: pick(armors, 23),
      back: pick(backs, 29),
      wpn: pick(wpns, 31),
      tal: pick(tals, 37),
    },
    plus: { hat: plusLv, face: plusLv, armor: plusLv, back: plusLv, wpn: plusLv, tal: plusLv },
  };
}

/* ---------- TERBİYECİ KUŞANMA VİTRİNİ & ÖZELLEŞTİRME MODAL (YALNIZCA GARDIROP & SİMA) ---------- */
UI.chibiTab = 'dolap'; // 'dolap' | 'gorunum'
UI.chibiSlot = 'armor';
UI.chibiApPage = 0;    // 0: Beden & Saç | 1: Yüz & Göz | 2: Cilt Tonu
UI.orsSlot = 'wpn';
UI.orsItemId = null;
UI.orsUseScroll = true;
UI.salvageFromOre = 'obsidiyen';
UI.salvageToOre = 'kehribar';

function getSelectedOrsItem(C, slotKey) {
  const slKey = slotKey || UI.orsSlot || 'wpn';
  if (UI.orsItemId && CHIBI_ITEMS[UI.orsItemId] && CHIBI_ITEMS[UI.orsItemId].slot === slKey && (C.unlockedItems[UI.orsItemId] || C.burnedItems[UI.orsItemId])) {
    return CHIBI_ITEMS[UI.orsItemId];
  }
  const eqId = C.eq && C.eq[slKey];
  if (eqId && CHIBI_ITEMS[eqId]) {
    UI.orsItemId = eqId;
    return CHIBI_ITEMS[eqId];
  }
  const firstOwned = Object.values(CHIBI_ITEMS).find(i => i.slot === slKey && (C.unlockedItems[i.id] || C.burnedItems[i.id]));
  if (firstOwned) {
    UI.orsItemId = firstOwned.id;
    return firstOwned;
  }
  return null;
}

/* ═══════════ CANLI KOR ÖRSÜ (Tav Barı + 3 Çekiç Vuruşu Ritüeli) ═══════════ */
const ORS_HEAT_MS = 1800;          // Tav barının açık kalma süresi
const ORS_SWEEP_MS = 640;          // Göstergenin bir gidiş-geliş turu
const ORS_GOLD = [0.42, 0.58];     // Altın Kor Bölgesi
const ORS_GOOD = [0.30, 0.70];     // Turuncu (iyi) bölge
const ORS_MILESTONES = [7, 10, 12];
UI.orsRitual = UI.orsRitual || null;
UI.orsPreviewPl = UI.orsPreviewPl || 0;

function orsPos(t) {
  const ph = (t % ORS_SWEEP_MS) / ORS_SWEEP_MS;
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
}
function orsRitualBusy() {
  const R = UI.orsRitual;
  return !!R && (R.phase === 'heat' || R.phase === 'hammer');
}
function orsAuraName(pl) {
  return pl >= 12 ? 'Kadim Magma Aurası (+12)' : pl >= 9 ? 'Zümrüt Zindan Aurası (+9)' : pl >= 7 ? 'Kor Aurası (+7)' : 'Henüz Aura Yok';
}

function renderUstaKerimOrsTab() {
  const C = ensureChibi();
  syncChibiSlotPlus(C);
  const sl = CHIBI_SLOTS.find(s => s.k === UI.orsSlot) || CHIBI_SLOTS[0];
  const ownedInSlot = Object.values(CHIBI_ITEMS).filter(i => i.slot === sl.k && (C.unlockedItems[i.id] || C.burnedItems[i.id]));
  const it = getSelectedOrsItem(C, sl.k);
  const isBurned = it ? !!C.burnedItems[it.id] : false;
  const R = UI.orsRitual && it && UI.orsRitual.itemId === it.id ? UI.orsRitual : null;
  const pl = it ? (isBurned ? 0 : (C.itemPlus[it.id] || 0)) : 0;
  const spec = (it && !isBurned && pl < 12) ? getChibiEnhancementSpec(it.id, pl) : null;
  const repairCost = (it && isBurned) ? getChibiRepairCost(it.id) : null;
  const busy = orsRitualBusy();

  const transferSources = ownedInSlot.filter(x => !C.burnedItems[x.id] && (C.itemPlus[x.id] || 0) >= 6);
  const transferTargets = it && !isBurned
    ? ownedInSlot
        .filter(x => !C.burnedItems[x.id] && x.id !== it.id && (C.itemPlus[x.id] || 0) < Math.max(0, pl - 2))
        .sort((a, b) => (a.tier - b.tier) || (a.idx - b.idx))
    : [];

  /* ── Üst Şerit: 6 yuvalı ekipman seçici ── */
  const slotStrip = `
    <div class="ors-slot-strip">
      ${CHIBI_SLOTS.map(s => {
        const eqId = C.eq[s.k];
        const eqIt = eqId ? CHIBI_ITEMS[eqId] : null;
        const p = eqId ? (C.itemPlus[eqId] || 0) : 0;
        const hasBurned = Object.values(CHIBI_ITEMS).some(i => i.slot === s.k && C.burnedItems[i.id]);
        return `<button class="ors-slot-btn ${UI.orsSlot === s.k ? 'on' : ''}" data-a="ch-ors-slot" data-s="${s.k}" title="${esc(s.ad)}">
          ${eqIt ? `<img src="${eqIt.ic || ('img/chibi/icons/' + eqIt.id + '.webp')}" alt="">` : `<span class="ors-slot-empty">∅</span>`}
          <b>${esc(s.ad.split('&')[0].trim())}</b>
          <em>${hasBurned ? '🔥' : '+' + p}</em>
        </button>`;
      }).join('')}
    </div>
    ${ownedInSlot.length > 1 ? `
      <div class="ors-owned-row">
        <small class="mute">Örsteki Eşya:</small>
        ${ownedInSlot.map(o => {
          const oBurn = !!C.burnedItems[o.id];
          const oPl = oBurn ? 0 : (C.itemPlus[o.id] || 0);
          return `<button class="btn xs ${it && it.id === o.id ? 'primary' : 'ghost'}" data-a="ch-ors-pick-item" data-id="${o.id}">${esc(o.ad)} ${oBurn ? '🔥 Hurda' : (oPl > 0 ? '+' + oPl : '')}</button>`;
        }).join('')}
      </div>` : ''}`;

  const head = `
    <div class="ch-pane-head ors-head">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="img/ui/items/seal_smith_anvil.webp" style="width:42px;height:42px;object-fit:contain;" alt="">
        <div>
          <span class="kicker">Demirci Usta Kerim · Canlı Kor Örsü</span>
          <h4>Tav Tut, Çekici İndir, Kaderi Dinle</h4>
        </div>
      </div>
      <div class="ch-ors-res" style="display:flex;flex-wrap:wrap;gap:6px;">
        ${Object.values(CHIBI_STONES).map(st => `<span class="tag" title="${esc(st.d)}" style="display:inline-flex;align-items:center;gap:4px;"><img src="${st.ic}" style="width:18px;height:18px;object-fit:contain;" alt="">${esc(st.ad.split(' ')[0])}: <b>${C.stones[st.k] || 0}</b></span>`).join('')}
      </div>
    </div>`;

  if (!it) {
    return `<div class="ch-ors-pane kerim-ors-wrap ors-live">${head}${slotStrip}<div class="vempty">Bu yuvada henüz açılmış bir ekipman yok. Dökümhane sekmesinden yeni ekipman dökebilirsiniz.</div></div>`;
  }

  /* ── Yanmış eşya: Küllerden Onarım ── */
  if (isBurned && repairCost) {
    return `<div class="ch-ors-pane kerim-ors-wrap ors-live">${head}${slotStrip}
      <div class="ors-altar burned">
        <img src="${it.ic || ('img/chibi/icons/' + it.id + '.webp')}" class="ors-altar-ic" style="filter:grayscale(0.85) contrast(1.2) drop-shadow(0 0 6px #ff3b1f);" alt="">
        <h3>${esc(it.ad)} <span class="tag bad">🔥 YANMIŞ HURDA (+0)</span></h3>
        <p class="sm bad">Cehennem Kademesinde Anka Mührü olmadan dövülürken çatladı. Onarılana kadar kuşanılamaz ve <b>0 nitelik</b> verir.</p>
        <div style="margin:8px 0;font-size:13px;">
          <b>🛠️ Küllerden Onarım Bedeli:</b>
          <span class="tag">${repairCost.gold} Altın</span>
          ${Object.entries(repairCost.stones).map(([k, v]) => `<span class="tag"><img src="${CHIBI_STONES[k].ic}" style="width:14px;height:14px;vertical-align:middle"> ${v}× ${CHIBI_STONES[k].ad}</span>`).join('')}
          ${Object.entries(repairCost.shards).map(([k, v]) => `<span class="tag"><img src="${CHIBI_SHARDS[k].ic}" style="width:14px;height:14px;vertical-align:middle"> ${v}× ${CHIBI_SHARDS[k].ad}</span>`).join('')}
          ${Object.entries(repairCost.ores).map(([k, v]) => `<span class="tag"><img src="${CHIBI_ORES[k].ic}" style="width:14px;height:14px;vertical-align:middle"> ${v}× ${CHIBI_ORES[k].ad}</span>`).join('')}
        </div>
        <button class="btn primary big" data-a="ch-smith-repair" data-id="${it.id}">🛠️ Küllerden Onar (+0 Sağlam Duruma Döndür)</button>
      </div></div>`;
  }

  /* ── Ritüel durumu ── */
  const phase = R ? R.phase : 'idle';
  const hits = R ? (R.hits || 0) : 0;
  const nextPl = spec ? spec.nextPl : pl;
  const haveStone = spec ? (C.stones[spec.stoneKey] || 0) : 0;
  const stoneOk = spec ? haveStone >= spec.stoneCost || phase !== 'idle' : false;
  const stoneInfo = spec ? CHIBI_STONES[spec.stoneKey] : null;
  const ankaHave = C.stones.anka_koruma || 0;
  const ankaOpen = !!spec && nextPl >= 5;
  const fcNow = Math.round(it.fc * (1 + pl * 0.14));
  const fcNext = spec ? Math.round(it.fc * (1 + nextPl * 0.14)) : fcNow;
  const ankaOn = phase === 'idle' ? (UI.orsUseScroll && ankaHave > 0 && ankaOpen) : !!(R && R.usedAnka);

  // Canlı Chibi önizleme: hedef kademe (7 / 10 / 12) ulaşıldığında karakter nasıl parlar?
  const nextMile = ORS_MILESTONES.find(m => m > pl) || 12;
  const prevPl = ORS_MILESTONES.includes(UI.orsPreviewPl) && UI.orsPreviewPl > pl ? UI.orsPreviewPl : nextMile;
  const resultOk = R && R.phase === 'result' && R.result && R.result.ok;
  const previewLevel = resultOk ? (C.itemPlus[it.id] || pl) : prevPl;
  const pc = Object.assign({}, C, {
    itemPlus: Object.assign({}, C.itemPlus, { [it.id]: previewLevel }),
    plus: Object.assign({}, C.plus, { [it.slot]: previewLevel }),
    eq: Object.assign({}, C.eq, { [it.slot]: it.id }),
    burnedItems: {}
  });
  const dollHtml = typeof renderChibiDoll === 'function'
    ? renderChibiDoll(pc, resultOk
        ? { battleStance: true, battleAnim: 'ult_combo', hideAimArc: true, hideStanceBadge: true, cls: 'ors-doll' }
        : { cls: 'ors-doll' })
    : '';

  const grade = R && R.grade;
  const gradeTxt = grade === 'gold' ? '🔥 KUSURSUZ TAV! (+%5 Ekstra Başarı Şansı)' : grade === 'good' ? '⚡ İYİ TAV (+%2 Ekstra Şans)' : grade === 'miss' ? 'Tav kaçtı — normal taban şans' : '';
  const effRate = spec ? Math.min(100, spec.rate + (R && R.bonus ? R.bonus : 0)) : 0;

  const hitLabels = ['', 'Çınn!', 'Çınn!', 'GÜÜÜM!'];

  const stampHtml = (phase === 'result' && R.result) ? `
    <div class="ors-stamp ${R.result.ok ? 'ok' : 'bad'}">
      <b>${esc(R.result.stamp)}</b>
      <small>${esc(R.result.sub || '')}</small>
      <button class="btn xs ghost" data-a="ors-ritual-close">Tamam</button>
    </div>` : '';

  const heatHtml = (phase === 'heat' || phase === 'hammer' || phase === 'result') ? `
    <div class="ors-heat-wrap">
      <div class="ors-heat-label">${phase === 'heat' ? '🔨 ÇEKİCİ KALDIR! — Göstergeyi altın kor bölgesinde durdur' : esc(gradeTxt)}</div>
      <div class="ors-heat" id="ors-heat">
        <i class="zone good" style="left:${ORS_GOOD[0] * 100}%;width:${(ORS_GOOD[1] - ORS_GOOD[0]) * 100}%"></i>
        <i class="zone gold" style="left:${ORS_GOLD[0] * 100}%;width:${(ORS_GOLD[1] - ORS_GOLD[0]) * 100}%"></i>
        <b class="ors-cursor ${phase !== 'heat' ? 'frozen' : ''}" id="ors-cursor" style="left:${(R && R.freezePos != null ? R.freezePos : 0) * 100}%"></b>
      </div>
    </div>` : '';

  const actionHtml = phase === 'heat'
    ? `<button class="btn danger big ors-strike-btn" data-a="ors-strike">🔥 ÇEKİCİ İNDİR! (Space)</button>`
    : phase === 'hammer'
      ? `<button class="btn big" disabled>⚒️ Usta Kerim vuruyor…</button>`
      : spec
        ? `<button class="btn ${spec.zone === 'burn' && !ankaOn ? 'danger' : 'primary'} big" data-a="ch-smith-up" data-s="${sl.k}" data-id="${it.id}" ${stoneOk ? '' : 'data-short="1"'}>
             🔨 +${spec.nextPl} İçin Döv <small>(${spec.goldCost} Altın)</small>
           </button>`
        : '';

  return `
    <div class="ch-ors-pane kerim-ors-wrap ors-live" data-ors-phase="${phase}">
      ${head}
      ${slotStrip}
      <div class="ors-grid">
        <div class="ors-socket-col">
          ${spec ? `
            <div class="ors-socket rune ${stoneOk ? 'ready' : 'low'}">
              <small>SOL RÜN SOKETİ</small>
              <img src="${stoneInfo.ic}" alt="">
              <b>${esc(stoneInfo.ad)}</b>
              <span>Eldeki: <b>${haveStone}</b> / Gereken: <b>${spec.stoneCost}</b></span>
              <i class="ors-flow ${stoneOk ? 'on' : ''}"></i>
            </div>` : ''}
        </div>

        <div class="ors-center">
          <div class="ors-altar t${it.tier}" id="ors-altar" data-hit="${hits}" data-phase="${phase}">
            <div class="ors-embers"></div>
            <div class="ors-rune-ring"></div>
            <img src="${it.ic || ('img/chibi/icons/' + it.id + '.webp')}" class="ors-altar-ic" alt="">
            <div class="ors-smoke"></div>
            <div class="ors-sparks" id="ors-sparks"></div>
            <div class="ors-hit-txt" id="ors-hit-txt">${hits ? hitLabels[hits] : ''}</div>
            ${stampHtml}
            <div class="ors-anvil-base"></div>
          </div>
          <div class="ors-info">
            <span class="kicker">${esc(sl.ad)} · Tier ${it.tier}</span>
            <h3>${esc(it.ad)} <span class="ch-plus-badge">+${pl}</span>${spec ? ` <span class="ors-arrow">➔ +${spec.nextPl}</span>` : ''}</h3>
            ${spec ? `
              <p class="sm">Kudret: <b>+${fcNow}</b> ➔ <b class="good">+${fcNext}</b> <em>(${fcNext >= fcNow ? '+' : ''}${fcNext - fcNow})</em></p>
              <p class="sm">Aura: <b>${esc(orsAuraName(nextPl))}</b>${nextPl >= 7 && pl < 7 || nextPl >= 9 && pl < 9 || nextPl >= 12 && pl < 12 ? ' <span class="tag good">YENİ AURA AÇILIYOR!</span>' : ''}</p>
              <div class="ch-rate-bar">
                <div class="ch-rate-fill" style="width:${effRate}%;background:${spec.zone === 'burn' ? 'linear-gradient(90deg,#c92a2a,#ff6b35)' : spec.zone === 'downgrade' ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#2b8a3e,#51cf66)'}"></div>
                <span>Başarı: <b>%${effRate}</b>${R && R.bonus ? ` <em>(taban %${spec.rate} + tav %${R.bonus})</em>` : ''} · ${esc(spec.zoneLabel)}</span>
              </div>` : `<div class="vempty good"><b>ZİRVE KADEMESİ (+12)</b> Bu yadigâr Kadim Magma Aurası yayıyor.</div>`}
          </div>
          ${heatHtml}
          <div class="ors-actions">${actionHtml}</div>
        </div>

        <div class="ors-socket-col">
          ${spec ? `
            <label class="ors-socket anka ${ankaOpen ? (ankaOn ? 'ready' : '') : 'locked'}" ${ankaOpen && phase === 'idle' ? 'data-a="ch-toggle-scroll"' : ''}>
              <small>SAĞ RÜN SOKETİ</small>
              <img src="${CHIBI_STONES.anka_koruma.ic}" alt="">
              ${ankaOpen
                ? `<b>🔥 Anka Mühür Taşı Kullan</b><span>${pl >= 7 ? 'Yanarsa eşya yanmaz, seviye düşmez' : 'Yanarsa seviye düşmez'} · Kalan: <b>${ankaHave}</b></span>
                   <em class="ors-toggle ${ankaOn ? 'on' : ''}">${ankaOn ? 'AKTİF' : (ankaHave > 0 ? 'KAPALI' : 'TAŞ YOK')}</em>`
                : `<b>Mühür Soketi</b><span>+5 ve üzerinde aktifleşir</span>`}
            </label>` : ''}
        </div>

        <div class="ors-doll-pane">
          <small class="kicker">Canlı Önizleme</small>
          <div class="ors-doll-stage ${resultOk ? 'victory' : ''}">${dollHtml}</div>
          <div class="ors-milestones">
            ${ORS_MILESTONES.map(m => `<button class="btn xs ${previewLevel === m ? 'primary' : 'ghost'}" ${m > pl && !busy ? `data-a="ors-preview" data-pl="${m}"` : 'disabled'}>+${m}</button>`).join('')}
          </div>
          <small class="mute">${esc(orsAuraName(previewLevel))}</small>
        </div>
      </div>

      ${(!busy && !isBurned && pl >= 6 && transferTargets.length > 0) ? `
        <div class="ors-transfer">
          <div style="font-size:12px;">
            <b>🔄 Kor Aktarımı (Miras):</b> +${pl} kademesini <b>${esc(transferTargets[transferTargets.length - 1].ad)}</b> eşyasına <b>+${Math.max(0, pl - 2)}</b> olarak aktar (3× Harlı Kor Taşı + 500 Altın).
          </div>
          <button class="btn sm ghost" data-a="ch-smith-transfer" data-from="${it.id}" data-to="${transferTargets[transferTargets.length - 1].id}">🔄 +${Math.max(0, pl - 2)} Olarak Aktar</button>
        </div>` : ''}
    </div>`;
}

/* ── Ritüel motoru: Tav barı → 3 çekiç vuruşu → patlama ── */
function orsRedraw() {
  if (typeof redrawActiveChibiOrStallModal === 'function') redrawActiveChibiOrStallModal();
}
function orsTickHeat() {
  const R = UI.orsRitual;
  if (!R || R.phase !== 'heat') return;
  const t = performance.now() - R.t0;
  if (t >= ORS_HEAT_MS) { orsStrike(true); return; }
  const cur = document.getElementById('ors-cursor');
  if (cur) cur.style.left = (orsPos(t) * 100) + '%';
  R.raf = requestAnimationFrame(orsTickHeat);
}
function orsSparks(n, big) {
  const box = document.getElementById('ors-sparks');
  if (!box) return;
  let h = '';
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = (big ? 70 : 38) + Math.random() * (big ? 90 : 46);
    h += `<i class="ors-spark" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 24)}px;--sz:${(big ? 4 : 2.5) + Math.random() * 2}px"></i>`;
  }
  box.insertAdjacentHTML('beforeend', h);
  setTimeout(() => { while (box.children.length > 70) box.removeChild(box.firstChild); }, 900);
}
function orsShakeScreen(ms) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.add('ors-screen-shake');
  setTimeout(() => document.body.classList.remove('ors-screen-shake'), ms || 320);
}
function orsHit(n) {
  const R = UI.orsRitual;
  if (!R || R.phase !== 'hammer') return;
  R.hits = n;
  const altar = document.getElementById('ors-altar');
  const txt = document.getElementById('ors-hit-txt');
  if (altar) {
    altar.dataset.hit = String(n);
    altar.classList.remove('hit-pulse'); void altar.offsetWidth; altar.classList.add('hit-pulse');
  }
  if (txt) {
    txt.textContent = ['', 'Çınn!', 'Çınn!', 'GÜÜÜM!'][n];
    txt.classList.remove('pop'); void txt.offsetWidth; txt.classList.add('pop');
  }
  orsSparks(n === 1 ? 8 : n === 2 ? 16 : 30, n === 3);
  if (n === 2) orsShakeScreen(260);
  if (n === 3) orsShakeScreen(420);
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play(n === 3 ? 'lose' : 'click');
}
function orsStrike(timedOut) {
  const R = UI.orsRitual;
  if (!R || R.phase !== 'heat') return;
  if (R.raf) cancelAnimationFrame(R.raf);
  const t = performance.now() - R.t0;
  const pos = timedOut ? null : orsPos(t);
  let grade = 'miss', bonus = 0;
  if (pos != null) {
    if (pos >= ORS_GOLD[0] && pos <= ORS_GOLD[1]) { grade = 'gold'; bonus = 5; }
    else if (pos >= ORS_GOOD[0] && pos <= ORS_GOOD[1]) { grade = 'good'; bonus = 2; }
  }
  R.grade = grade; R.bonus = bonus; R.freezePos = pos != null ? pos : 0; R.hits = 0;
  R.phase = 'hammer';
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play(grade === 'gold' ? 'win' : 'tab');
  orsRedraw();
  setTimeout(() => orsHit(1), 0);
  setTimeout(() => orsHit(2), 400);
  setTimeout(() => orsHit(3), 850);
  setTimeout(() => orsResolve(), 850 + 350);
}
function orsResolve() {
  const R = UI.orsRitual;
  if (!R || R.phase !== 'hammer') return;
  const C = ensureChibi();
  const it = CHIBI_ITEMS[R.itemId];
  if (!it) { UI.orsRitual = null; return; }
  const spec = R.spec;
  const pl = R.pl;
  const effRate = Math.min(100, spec.rate + (R.bonus || 0));
  const fcOf = p => Math.round(it.fc * (1 + p * 0.14));
  let result;
  if (chance(effRate)) {
    C.itemPlus[it.id] = spec.nextPl;
    syncChibiSlotPlus(C);
    result = { ok: true, stamp: `✨ +${spec.nextPl} BAŞARILI! (KUDRET +${fcOf(spec.nextPl) - fcOf(pl)})`, sub: `${it.ad} yeni kademesine yükseldi.` };
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('win');
    orsSparks(60, true);
    orsShakeScreen(520);
    try {
      const a = document.getElementById('ors-altar');
      if (a && typeof FX !== 'undefined' && FX.burst) {
        const r = a.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height / 2, 'ates', 44, 1.5);
      }
    } catch (e) {}
  } else if (spec.zone === 'safe' || R.usedAnka) {
    syncChibiSlotPlus(C);
    result = { ok: false, stamp: `💨 METAL ÇATLADI! (${R.usedAnka ? 'Anka korudu' : 'Güvenli kademe'} / +${pl} korundu)`, sub: R.usedAnka ? 'Anka Mühür Taşı seni kurtardı.' : 'Güvenli kademede kayıp yok.' };
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('error');
  } else if (spec.zone === 'downgrade') {
    C.itemPlus[it.id] = Math.max(0, pl - 1);
    syncChibiSlotPlus(C);
    result = { ok: false, stamp: `💨 METAL ÇATLADI! (Seviye -1 düştü → +${C.itemPlus[it.id]})`, sub: 'Anka Mührü olmadığı için kademe geriledi.' };
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('error');
  } else {
    C.burnedItems[it.id] = true;
    C.itemPlus[it.id] = 0;
    if (C.eq[it.slot] === it.id) C.eq[it.slot] = null;
    syncChibiSlotPlus(C);
    result = { ok: false, stamp: '💨 METAL ÇATLADI! (Eşya yandı → +0 hurda)', sub: 'Anka Mührü olmadan Cehennem Kademesi affetmez. Küllerden onarabilirsin.' };
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('lose');
  }
  R.result = result;
  R.phase = 'result';
  saveGame();
  orsRedraw();
  if (typeof render === 'function') render();
}
if (typeof document !== 'undefined' && !window.__orsKeyBound) {
  window.__orsKeyBound = true;
  document.addEventListener('keydown', e => {
    const R = UI.orsRitual;
    if (!R || R.phase !== 'heat') return;
    if (e.code !== 'Space') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    orsStrike(false);
  });
}


function renderUstaKerimDokumTab() {
  const C = ensureChibi();
  const curSlot = CHIBI_SLOTS.find(s => s.k === (UI.orsSlot || 'wpn')) || CHIBI_SLOTS[0];
  const slotItems = Object.values(CHIBI_ITEMS).filter(i => i.slot === curSlot.k && i.idx >= 2);

  // SIFIR KAYDIRMA: sayfa başına 2 kart (tek satır) — gereksinimler kompakt ikon çipleri (tam ad fare ile üzerine gelince title'da)
  const pagedRecipes = pager('kerim-dokum-' + curSlot.k, slotItems, 2, it => {
    const unlocked = !!C.unlockedItems[it.id];
    const burned = !!C.burnedItems[it.id];
    const rec = getChibiItemCraftRecipe(it.id);
    const baseIt = rec && rec.ascendFrom ? CHIBI_ITEMS[rec.ascendFrom] : null;
    const basePl = baseIt ? (C.itemPlus[baseIt.id] || 0) : 0;

    const chip = (ok, ic, txt, title) => `<span class="kd-req ${ok ? 'ok' : 'no'}" title="${esc(title)}">${ic ? `<img src="${ic}" alt="">` : ''}<em>${txt}</em></span>`;
    const reqTags = [];
    if (rec) {
      if (baseIt) {
        const okBase = C.unlockedItems[baseIt.id] && !C.burnedItems[baseIt.id] && basePl >= (rec.reqPlus || 10);
        reqTags.push(chip(okBase, `img/chibi/icons/${baseIt.id}.webp`, `+${basePl}/+${rec.reqPlus || 10}`, `Temel: ${baseIt.ad} +${rec.reqPlus || 10} (Mevcut: +${basePl})`));
      }
      for (const [k, v] of Object.entries(rec.shards || {})) {
        const have = C.shards[k] || 0;
        reqTags.push(chip(have >= v, CHIBI_SHARDS[k].ic, `${have}/${v}`, CHIBI_SHARDS[k].ad));
      }
      for (const [k, v] of Object.entries(rec.essences || {})) {
        const have = C.essences[k] || 0;
        reqTags.push(chip(have >= v, CHIBI_ESSENCES[k].ic, `${have}/${v}`, CHIBI_ESSENCES[k].ad));
      }
      for (const [k, v] of Object.entries(rec.ores || {})) {
        const have = C.ores[k] || 0;
        reqTags.push(chip(have >= v, CHIBI_ORES[k].ic, `${have}/${v}`, CHIBI_ORES[k].ad));
      }
      for (const [k, v] of Object.entries(rec.stones || {})) {
        const have = C.stones[k] || 0;
        reqTags.push(chip(have >= v, CHIBI_STONES[k].ic, `${have}/${v}`, CHIBI_STONES[k].ad));
      }
      if (rec.gold > 0) {
        reqTags.push(chip(S.gold >= rec.gold, '', `${rec.gold} Altın`, `${rec.gold} Altın`));
      }
    }

    return `
      <div class="ch-item-card kd-card t${it.tier} ${unlocked ? 'on' : ''}">
        <div class="ch-ic-box"><img src="${it.ic || ('img/chibi/icons/' + it.id + '.webp')}" alt=""></div>
        <div class="ch-ic-info">
          <b title="${esc(it.ad)}">${esc(it.ad)} <span class="tag">${it.tier === 6 ? '⚡ T6 UYANIŞ' : 'Tier ' + it.tier}</span></b>
          <small class="mute" title="${esc(it.d)}">${esc(it.d)}</small>
          <div class="ch-ic-stats">
            <span>Kudret <b>+${it.fc}</b></span>
            <span>GÜÇ +${it.st.gu}</span>
            <span>ÇEV +${it.st.ce}</span>
            <span>DAY +${it.st.zi}</span>
            <span>ZEK +${it.st.ru}</span>
          </div>
        </div>
        <div class="kd-foot">
          <div class="kd-reqs">${reqTags.join('')}</div>
          ${unlocked
            ? `<button class="btn sm good" data-a="ch-ors-pick-item" data-id="${it.id}" title="${burned ? 'Hurda — Örste Onar' : 'Açık — Örste Seç'}">${burned ? '🔥' : '✓'}<span class="kd-btn-lbl"> ${burned ? 'Hurda (Onar)' : 'Açık (Örste Seç)'}</span></button>`
            : `<button class="btn sm primary" data-a="ch-craft-item" data-id="${it.id}" title="${it.tier === 6 ? 'Uyanış Döv' : 'Kalıbı Dök'}">${it.tier === 6 ? '⚡' : '⚒️'}<span class="kd-btn-lbl"> ${it.tier === 6 ? 'Uyanış Döv' : 'Kalıbı Dök'}</span><span class="kd-btn-short"> ${it.tier === 6 ? 'Döv' : 'Dök'}</span></button>`}
        </div>
      </div>
    `;
  });

  return `
    <div class="ch-ors-pane kerim-dokum-wrap">
      <div class="ch-pane-head" style="flex-wrap:wrap;gap:8px;">
        <div>
          <span class="kicker">Zindan Kalıpları & Kervan Cevherleri</span>
          <h4>Kalıp & Uyanış Dökümhanesi (${curSlot.ad})</h4>
        </div>
        <div class="kd-stock-row" style="display:flex;flex-wrap:wrap;gap:5px;">
          ${Object.values(CHIBI_SHARDS).map(sh => `<span class="tag" title="${esc(sh.ad)}"><img src="${sh.ic}" style="width:15px;height:15px;vertical-align:middle"> <span class="kd-stock-lbl">${sh.ad.split(' ')[0]}:</span> <b>${C.shards[sh.k] || 0}</b></span>`).join('')}
          <span class="tag" title="Kıyamet Özü"><img src="${CHIBI_ESSENCES.kiyamet_ozu.ic}" style="width:15px;height:15px;vertical-align:middle"> <span class="kd-stock-lbl">Kıyamet Özü:</span> <b>${C.essences.kiyamet_ozu || 0}</b></span>
          ${Object.values(CHIBI_ORES).map(or => `<span class="tag" title="${esc(or.ad)}"><img src="${or.ic}" style="width:15px;height:15px;vertical-align:middle"> <span class="kd-stock-lbl">${or.ad.split(' ')[0]}:</span> <b>${C.ores[or.k] || 0}</b></span>`).join('')}
        </div>
      </div>

      <div class="ch-slot-pills" style="margin-bottom:8px;">
        ${CHIBI_SLOTS.map(s => `<button class="btn sm ${curSlot.k === s.k ? 'primary' : 'ghost'}" data-a="ch-ors-slot" data-s="${s.k}">${s.ad.split('&')[0].trim()}</button>`).join('')}
      </div>

      <div class="ch-paged-wrap">
        ${pagedRecipes}
      </div>
    </div>
  `;
}

function renderUstaKerimSentezTab() {
  const C = ensureChibi();
  const fromOre = UI.salvageFromOre || 'obsidiyen';
  const toOre = UI.salvageToOre === fromOre ? (fromOre === 'obsidiyen' ? 'kehribar' : 'obsidiyen') : (UI.salvageToOre || 'kehribar');

  return `
    <div class="ch-ors-pane kerim-sentez-wrap">
      <div class="ch-pane-head">
        <div>
          <span class="kicker">Usta Kerim Eritme Potaları</span>
          <h4>Taş Sentezi & Solo Kalıp/Cevher Dönüşümü (5:1)</h4>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:8px;">
        <div style="padding:10px;border-radius:8px;background:rgba(36,24,14,0.75);border:1px solid rgba(217,176,98,0.35);">
          <h4 style="margin:0 0 6px;">🔥 Kademeli Güçlendirme Taşı Sentezi (5:1)</h4>
          <p class="sm mute" style="margin-bottom:8px;">Alt kademe kor taşlarını yüksek ısıda birleştirerek üst kademe taş ve Anka Mührü sentezleyin.</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;"><img src="${CHIBI_STONES.kor_t1.ic}" style="width:16px;height:16px;vertical-align:middle"> 5× Kıvılcım (T1) + 50g ➔ <img src="${CHIBI_STONES.kor_t2.ic}" style="width:16px;height:16px;vertical-align:middle"> <b>1× Harlı Kor (T2)</b></span>
              <button class="btn xs primary" data-a="ch-stone-synth" data-from="kor_t1">Sentezle (${C.stones.kor_t1 || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;"><img src="${CHIBI_STONES.kor_t2.ic}" style="width:16px;height:16px;vertical-align:middle"> 5× Harlı (T2) + 200g ➔ <img src="${CHIBI_STONES.kor_t3.ic}" style="width:16px;height:16px;vertical-align:middle"> <b>1× Kadim Magma (T3)</b></span>
              <button class="btn xs primary" data-a="ch-stone-synth" data-from="kor_t2">Sentezle (${C.stones.kor_t2 || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;"><img src="${CHIBI_STONES.kor_t3.ic}" style="width:16px;height:16px;vertical-align:middle"> 5× Magma (T3) + 500g ➔ <img src="${CHIBI_STONES.anka_koruma.ic}" style="width:16px;height:16px;vertical-align:middle"> <b>1× Anka Mührü</b></span>
              <button class="btn xs primary" data-a="ch-stone-synth" data-from="kor_t3">Sentezle (${C.stones.kor_t3 || 0}/5)</button>
            </div>
          </div>
        </div>

        <div style="padding:10px;border-radius:8px;background:rgba(36,24,14,0.75);border:1px solid rgba(217,176,98,0.35);">
          <h4 style="margin:0 0 6px;">♻️ Solo Kalıp & Kervan Cevheri Eritme (5:1 + 150 Altın)</h4>
          <p class="sm mute" style="margin-bottom:8px;">Takas Masası veya Bedesten'de diğer oyuncularla <b>1:1</b> takas yapabilir ya da Usta Kerim'de <b>5:1</b> oranında eritebilirsiniz.</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Şahmeran Kalıbı + 150g ➔ <b>1× Kalgarot Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="sahmeran_kalip" data-to="kalgarot_kalip">Erit (${C.shards.sahmeran_kalip || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Kalgarot Kalıbı + 150g ➔ <b>1× Şahmeran Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="kalgarot_kalip" data-to="sahmeran_kalip">Erit (${C.shards.kalgarot_kalip || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Şahmeran Kalıbı + 150g ➔ <b>1× Abra Derya Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="sahmeran_kalip" data-to="abra_kalip">Erit (${C.shards.sahmeran_kalip || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Kalgarot Kalıbı + 150g ➔ <b>1× Abra Derya Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="kalgarot_kalip" data-to="abra_kalip">Erit (${C.shards.kalgarot_kalip || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Abra Derya Kalıbı + 150g ➔ <b>1× Şahmeran Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="abra_kalip" data-to="sahmeran_kalip">Erit (${C.shards.abra_kalip || 0}/5)</button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <span style="font-size:12px;">5× Abra Derya Kalıbı + 150g ➔ <b>1× Kalgarot Kalıbı</b></span>
              <button class="btn xs ghost" data-a="ch-salvage-convert" data-kind="shard" data-from="abra_kalip" data-to="kalgarot_kalip">Erit (${C.shards.abra_kalip || 0}/5)</button>
            </div>
            <div style="padding:6px;background:rgba(0,0,0,0.28);border-radius:6px;">
              <div style="font-size:11px;margin-bottom:4px;"><b>Kervan Cevheri Dönüşümü (5× Kaynak + 150g ➔ 1× Hedef):</b></div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">
                <span style="font-size:11px;align-self:center;">Ver (5×):</span>
                ${Object.values(CHIBI_ORES).map(o => `<button class="btn xs ${fromOre === o.k ? 'primary' : 'ghost'}" data-a="ch-salvage-pick" data-dir="from" data-k="${o.k}">${o.ad.split(' ')[0]} (${C.ores[o.k] || 0})</button>`).join('')}
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  <span style="font-size:11px;align-self:center;">Al (1×):</span>
                  ${Object.values(CHIBI_ORES).filter(o => o.k !== fromOre).map(o => `<button class="btn xs ${toOre === o.k ? 'primary' : 'ghost'}" data-a="ch-salvage-pick" data-dir="to" data-k="${o.k}">${o.ad.split(' ')[0]}</button>`).join('')}
                </div>
                <button class="btn xs primary" data-a="ch-salvage-convert" data-kind="ore" data-from="${fromOre}" data-to="${toOre}">5:1 Cevher Erit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function chibiModal() {
  UI.modalRedraw = chibiModal;
  const C = ensureChibi();
  syncChibiSlotPlus(C);
  if (UI.chibiTab !== 'dolap' && UI.chibiTab !== 'gorunum') UI.chibiTab = 'dolap';
  const info = calcChibiStats(C);
  const star = (typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]);

  const renderSlotBox = sl => {
    const itemId = C.eq[sl.k];
    const it = itemId ? CHIBI_ITEMS[itemId] : null;
    const pl = (itemId && C.itemPlus && C.itemPlus[itemId]) || (C.plus && C.plus[sl.k]) || 0;
    const active = UI.chibiTab === 'dolap' && UI.chibiSlot === sl.k;
    return `
      <div class="ch-slot-wrap ${active ? 'sel' : ''} ${it ? 't' + it.tier : 'empty'}">
        <button class="ch-slot" data-a="ch-pick-slot" data-s="${sl.k}" title="${sl.ad}">
          <span class="ch-slot-lbl">${sl.ad}</span>
          ${it
            ? `<img src="${it.ic || ('img/chibi/icons/' + it.id + '.webp')}" class="ch-slot-ic" alt="">
               <b class="ch-slot-nm">${esc(it.ad)}</b>
               ${pl > 0 ? `<span class="ch-plus-tag p${pl >= 12 ? 12 : pl >= 9 ? 9 : pl >= 7 ? 7 : 1}">+${pl}</span>` : ''}`
            : `<span class="ch-slot-empty">Boş (${sl.k === 'armor' ? 'İç Çamaşırı' : 'Takılmadı'})</span>`}
        </button>
        ${it ? `<button class="ch-unequip-x" data-a="ch-unequip" data-s="${sl.k}" title="${sl.ad} çıkar">−</button>` : ''}
      </div>
    `;
  };

  const leftSlots  = CHIBI_SLOTS.filter(s => s.side === 'L').map(renderSlotBox).join('');
  const rightSlots = CHIBI_SLOTS.filter(s => s.side === 'R').map(renderSlotBox).join('');

  let rightPane = '';
  if (UI.chibiTab === 'dolap') {
    const curSlot = CHIBI_SLOTS.find(s => s.k === UI.chibiSlot) || CHIBI_SLOTS[0];
    const slotItems = Object.values(CHIBI_ITEMS).filter(i => i.slot === curSlot.k);
    const curEquipped = C.eq[curSlot.k];

    // 4 items per page via pager() -> ZERO scrollbar, navigated with < and > arrows!
    const pagedItems = pager('ch-dolap-' + curSlot.k, slotItems, 4, it => {
      const isEq = curEquipped === it.id;
      const isUnlocked = !!C.unlockedItems[it.id];
      const isBurned = !!C.burnedItems[it.id];
      const pl = isBurned ? 0 : (C.itemPlus[it.id] || 0);
      const mult = 1 + pl * 0.14;
      const effFc = isBurned ? 0 : Math.round(it.fc * mult);
      const lockRec = (!isUnlocked && it.tier === 5) ? getChibiItemCraftRecipe(it.id) : null;
      const lockShardKey = lockRec ? Object.keys(lockRec.shards || {})[0] : null;
      const reqShards = lockShardKey ? lockRec.shards[lockShardKey] : 0;
      const haveShards = lockShardKey ? Math.min(C.shards[lockShardKey] || 0, 99) : 0;
      const shardBar = lockShardKey ? `
        <span class="tag" style="display:inline-flex;align-items:center;gap:6px;">
          🔒 Kalıp: ${haveShards}/${reqShards}
          <i style="display:inline-block;width:46px;height:6px;border-radius:3px;background:rgba(0,0,0,0.45);overflow:hidden;vertical-align:middle;"><i style="display:block;height:100%;width:${Math.min(100, Math.round(haveShards / reqShards * 100))}%;background:linear-gradient(90deg,#ff9a3c,#ffd27a);"></i></i>
        </span>` : '';
      return `
        <div class="ch-item-card t${it.tier} ${isEq ? 'on' : ''} ${!isUnlocked ? 'locked-item' : ''} ${isBurned ? 'burned-item' : ''}" data-a="ch-equip" data-s="${curSlot.k}" data-id="${it.id}" style="${!isUnlocked ? 'opacity:0.78;' : ''}">
          <div class="ch-ic-box"><img src="${it.ic || ('img/chibi/icons/' + it.id + '.webp')}" style="${isBurned ? 'filter:grayscale(0.9) drop-shadow(0 0 4px #e03131);' : !isUnlocked ? 'filter:grayscale(0.65);' : ''}" alt=""></div>
          <div class="ch-ic-info">
            <b>
              ${esc(it.ad)}
              ${isBurned ? `<span class="tag bad">🔥 YANMIŞ HURDA (+0)</span>` : pl > 0 ? `<em class="ch-in-plus">+${pl}</em>` : ''}
              ${!isUnlocked ? (shardBar || `<span class="tag">🔒 Kilitli (T${it.tier})</span>`) : ''}
            </b>
            <small class="mute">${esc(it.d)}</small>
            <div class="ch-ic-stats">
              <span>Kudret <b>+${effFc}</b></span>
              <span>GÜÇ +${isBurned ? 0 : Math.round(it.st.gu * mult)}</span>
              <span>ÇEV +${isBurned ? 0 : Math.round(it.st.ce * mult)}</span>
              <span>DAY +${isBurned ? 0 : Math.round(it.st.zi * mult)}</span>
              <span>ZEK +${isBurned ? 0 : Math.round(it.st.ru * mult)}</span>
            </div>
          </div>
          ${isBurned
            ? `<button class="btn sm danger" data-a="go-usta-kerim" data-tab="ors" data-s="${curSlot.k}" data-id="${it.id}">🔨 Onar</button>`
            : !isUnlocked
              ? `<button class="btn sm ${lockShardKey && haveShards >= reqShards ? 'primary' : 'ghost'}" data-a="go-usta-kerim" data-tab="dokum" data-s="${curSlot.k}" data-id="${it.id}">⚒️ ${lockShardKey && haveShards >= reqShards ? 'Dökümhanede Döv' : 'Dökümhane'}</button>`
              : `<button class="btn sm ${isEq ? 'good' : 'primary'}">${isEq ? 'Kuşanıldı' : 'Kuşan'}</button>`}
        </div>
      `;
    });

    rightPane = `
      <div class="ch-pane-head">
        <div>
          <span class="kicker">Sancak Cephaneliği</span>
          <h4>${curSlot.ad}</h4>
        </div>
        <div class="ch-slot-pills">
          ${CHIBI_SLOTS.map(s => `<button class="btn sm ${UI.chibiSlot === s.k ? 'primary' : 'ghost'}" data-a="ch-pick-slot" data-s="${s.k}">${s.ad.split('&')[0].trim()}</button>`).join('')}
          ${curEquipped ? `<button class="btn sm danger" data-a="ch-equip" data-s="${curSlot.k}" data-id="">Çıkar</button>` : ''}
        </div>
      </div>
      <div class="ch-paged-wrap">
        ${pagedItems}
      </div>
    `;
  } else if (UI.chibiTab === 'gorunum') {
    const apPage = UI.chibiApPage || 0;
    const pageTitles = ['Endam ve Saç Biçimi', 'Sima ve Göz Rengi', 'Ten Tonu ve Düzen'];
    let apBody = '';

    if (apPage === 0) {
      apBody = `
        <div class="ch-cust-sec">
          <label>Endam</label>
          <div class="ch-btn-row">
            ${CHIBI_GENDERS.map(g => `<button class="btn sm ${C.gender === g.k ? 'primary' : 'ghost'}" data-a="ch-set-gender" data-v="${g.k}">${g.ad}</button>`).join('')}
            <button class="btn sm ghost" data-a="ch-strip-all">Zırhları Çıkar</button>
          </div>
        </div>
        <div class="ch-cust-sec">
          <label>Saç Biçimi</label>
          <div class="ch-face-grid">
            ${CHIBI_HAIRS.map(h => `
              <button class="ch-mini-card ${C.hair === h.k ? 'on' : ''}" data-a="ch-set-hair" data-v="${h.k}">
                ${h.k > 0 ? `<img src="img/chibi/icons/hair_${h.k}.webp" style="filter:${chibiHairFilter(C.hairColor)}" alt="">` : `<div class="ch-kel-ic">Kazınmış</div>`}
                <small>${h.ad}</small>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="ch-cust-sec">
          <label>Saç Rengi</label>
          <div class="ch-swatch-row">
            ${CHIBI_HAIR_COLORS.map(c => `
              <button class="ch-swatch ${C.hairColor === c.k ? 'on' : ''}" data-a="ch-set-haircol" data-v="${c.k}" title="${c.ad}">
                <i style="background:${c.sw}"></i><span>${c.ad}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (apPage === 1) {
      apBody = `
        <div class="ch-cust-sec">
          <label>Bakış ve Sima</label>
          <div class="ch-face-grid">
            ${CHIBI_EXPRS.map(e => `
              <button class="ch-mini-card ${C.expr === e.k ? 'on' : ''}" data-a="ch-set-expr" data-v="${e.k}">
                <img src="img/chibi/icons/expr_${e.k}.webp" style="filter:${chibiEyeFilter(C.eyeColor)}" alt="">
                <small>${e.ad}</small>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="ch-cust-sec">
          <label>Göz Rengi</label>
          <div class="ch-swatch-row">
            ${CHIBI_EYE_COLORS.map(c => `
              <button class="ch-swatch ${C.eyeColor === c.k ? 'on' : ''}" data-a="ch-set-eyecol" data-v="${c.k}" title="${c.ad}">
                <i style="background:${c.sw}"></i><span>${c.ad}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      apBody = `
        <div class="ch-cust-sec">
          <label>Ten Tonu</label>
          <div class="ch-swatch-row">
            ${CHIBI_SKINS.map(s => `
              <button class="ch-swatch ${C.skin === s.k ? 'on' : ''}" data-a="ch-set-skin" data-v="${s.k}" title="${s.ad}">
                <i style="background:${s.sw}"></i><span>${s.ad}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="ch-cust-sec">
          <label>Kuşanma Düzeni</label>
          <div class="ch-btn-row">
            <button class="btn sm primary" data-a="ch-random-fit">Açık Ekipmanlardan Rastgele Kuşan</button>
            <button class="btn sm ghost" data-a="ch-strip-all">Tüm Kuşamı Çıkar</button>
          </div>
        </div>
      `;
    }

    rightPane = `
      <div class="ch-custom-pane">
        <div class="ch-pane-head">
          <div>
            <span class="kicker">Terbiyeci Siması</span>
            <h4>${pageTitles[apPage]}</h4>
          </div>
          <div class="ch-ap-nav">
            <button class="pbtn" data-a="ch-ap-page" data-p="${(apPage + 2) % 3}" aria-label="Önceki sayfa">${ui('left')}</button>
            <button class="btn sm ${apPage === 0 ? 'primary' : 'ghost'}" data-a="ch-ap-page" data-p="0">Saç & Endam</button>
            <button class="btn sm ${apPage === 1 ? 'primary' : 'ghost'}" data-a="ch-ap-page" data-p="1">Sima & Göz</button>
            <button class="btn sm ${apPage === 2 ? 'primary' : 'ghost'}" data-a="ch-ap-page" data-p="2">Ten Tonu</button>
            <button class="pbtn" data-a="ch-ap-page" data-p="${(apPage + 1) % 3}" aria-label="Sonraki sayfa">${ui('right')}</button>
          </div>
        </div>
        ${apBody}
      </div>
    `;
  }

  showModal(`
    <div class="mhead">
      <div>
        <span class="kicker">Sancak Beyliği & Cephanelik</span>
        <h2>${esc(S.handle || '@ejder_ocagi')} · Terbiyeci Kuşanma Vitrini</h2>
      </div>
      <button class="mclose" data-a="mclose" aria-label="Kapat">${ui('x')}</button>
    </div>

    <div class="ch-vitrin-layout">
      <div class="ch-paperdoll-box">
        <div class="ch-pd-cols">
          <div class="ch-pd-side">${leftSlots}</div>

          <div class="ch-pd-stage">
            <div class="ch-pedestal-bg">
              ${(!UI.chibiBattlePreview && C.showDragon && star) ? `<div class="ch-comp-dragon" title="Yoldaş Ejderhan: ${esc(star.name)}">${dragonSVG(star)}</div>` : ''}
              ${renderChibiDoll(C, { cls: 'vitrin-doll', allowBattlePreview: true })}
              <div class="ch-pedestal-stone"></div>
            </div>

            <div class="ch-stage-toggles">
              <button class="btn xs ${UI.chibiBattlePreview ? 'primary' : 'ghost'}" data-a="ch-battle-toggle">${UI.chibiBattlePreview ? 'Savaş Duruşu: Açık' : 'Savaş Duruşu'}</button>
              <button class="btn xs ghost" data-a="ch-toggle-dr">${C.showDragon ? 'Ejderhayı Gizle' : 'Ejderhayı Göster'}</button>
              <button class="btn xs ghost" data-a="ch-strip-all">Zırhları Çıkar</button>
              <button class="btn xs ghost" data-a="ch-random-fit">Rastgele Kuşan</button>
            </div>
            ${UI.chibiBattlePreview ? `
              <div class="ch-battle-quickbar">
                <div class="cbq-row">
                  ${BATTLE_CONCEPTS.map(bc => `<button class="btn xs ${(UI.battleConcept || 1) === bc.id ? 'primary' : 'ghost'}" data-a="ch-battle-concept" data-c="${bc.id}">${bc.kisa}</button>`).join('')}
                </div>
                <div class="cbq-row">
                  <span>Açı:</span>
                  ${[15, 25, 45, 65].map(ang => `<button class="btn xs ${(UI.battleAngle || 25) === ang ? 'primary' : 'ghost'}" data-a="ch-battle-angle" data-ang="${ang}">${ang}°</button>`).join('')}
                </div>
              </div>
            ` : ''}

            <div class="ch-fc-banner">
              <div class="ch-fc-main">
                <small>TOPLAM OCAK KUDRETİ</small>
                <b>${info.totalFc.toLocaleString('tr-TR')}</b>
              </div>
              <div class="ch-fc-sub">
                <span>Terbiyeci: <b>${info.eqFc}</b></span>
                <span>Yoldaş Ejder: <b>${info.dragonFc}</b></span>
                <span>Aura: <b>${info.activeSet ? info.activeSet.auraLabel : (info.auraTier === 3 ? '+12 Magma' : info.auraTier === 2 ? '+9 Zümrüt' : info.auraTier === 1 ? '+7 Kor' : 'Yok')}</b></span>
              </div>
              <div class="ch-fc-bonuses" title="Terbiyeci ekipmanlarının ejderhalarına verdiği toplam savaş bonusu">
                <span>GÜÇ <b>+${info.st.gu}</b></span>
                <span>ÇEV <b>+${info.st.ce}</b></span>
                <span>DAY <b>+${info.st.zi}</b></span>
                <span>ZEK <b>+${info.st.ru}</b></span>
              </div>
              ${info.activeSet ? `
                <div class="ch-set-synergy-badge active">
                  <div>
                    <b class="ch-syn-title">${esc(info.activeSet.ad)} Sinerjisi (${info.activeSet.count} Parça)</b>
                    <small class="ch-syn-sub">${esc(info.activeSet.bonusDesc)}</small>
                  </div>
                  <span class="tag good">+%15 KUDRET</span>
                </div>
              ` : `
                <div class="ch-set-synergy-badge">
                  <span><b>Yadigâr Takımı (3+ Parça):</b> Şahmeran (${info.sahCount}/3) · Kalgarot (${info.kalCount}/3) · Abra (${info.abraCount || 0}/3)</span>
                  <span class="tag">Zindan & Dökümhane</span>
                </div>
              `}
            </div>
          </div>

          <div class="ch-pd-side">${rightSlots}</div>
        </div>
      </div>

      <div class="ch-wardrobe-box">
        <div class="vtabs ch-vtabs">
          <button class="vtab ${UI.chibiTab === 'dolap' ? 'on' : ''}" data-a="ch-tab" data-t="dolap">Kuşanma Dolabı</button>
          <button class="vtab ${UI.chibiTab === 'gorunum' ? 'on' : ''}" data-a="ch-tab" data-t="gorunum">Sima & Endam</button>
        </div>
        <div class="ch-pane-body">
          ${rightPane}
        </div>
        <div class="ch-kerim-redirect-bar" style="margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(42,24,14,0.92);border:1px solid rgba(217,176,98,0.45);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span style="font-size:12px;color:#f3d9a4;">🔨 Ekipman dövmek, kalıp birleştirmek ve +Basmak için Çarşı'daki Demirci Usta Kerim'in Kor Örsü'ne gidin.</span>
          <button class="btn sm primary" data-a="go-usta-kerim" data-tab="ors">🔨 Demirci Usta Kerim'e Git</button>
        </div>
      </div>
    </div>
  `, 'paper wide chibi-modal');
}

function redrawActiveChibiOrStallModal() {
  const modalOpen = typeof document !== 'undefined' && document.querySelector('#modal-root .modal');
  if (modalOpen && typeof UI !== 'undefined' && typeof UI.modalRedraw === 'function') {
    UI.modalRedraw();
  }
  if (typeof render === 'function') render();
}

/* ---------- EYLEM KANALLARI (CLICK HANDLERS) ---------- */
const CHIBI_ACT = {
  'chibi-open'() {
    ensureChibi();
    UI.chibiTab = 'dolap';
    pushModal(chibiModal);
    chibiModal();
  },
  'chibi-ors-open'(el) {
    CHIBI_ACT['go-usta-kerim'](el);
  },
  'go-usta-kerim'(el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    ensureChibi();
    const targetTab = (el && el.dataset && el.dataset.tab) || 'ors';
    if (el && el.dataset && el.dataset.s) UI.orsSlot = el.dataset.s;
    if (el && el.dataset && el.dataset.id) UI.orsItemId = el.dataset.id;
    if (typeof closeModal === 'function') closeModal();
    UI.view = 'pazar';
    UI.stall = 'demir';
    UI.stallTab = targetTab;
    UI.vsay = null;
    if (typeof SFX !== 'undefined') SFX.play('tab');
    render();
  },
  'ch-tab'(el) {
    const t = el.dataset.t || 'dolap';
    UI.chibiTab = (t === 'gorunum') ? 'gorunum' : 'dolap';
    chibiModal();
  },
  'ch-ap-page'(el) {
    UI.chibiApPage = +el.dataset.p || 0;
    if (typeof SFX !== 'undefined') SFX.play('page');
    chibiModal();
  },
  'ch-battle-toggle'() {
    UI.chibiBattlePreview = !UI.chibiBattlePreview;
    if (UI.chibiBattlePreview && !UI.battleConcept) UI.battleConcept = 1;
    if (typeof SFX !== 'undefined') SFX.play('tab');
    chibiModal();
    render();
  },
  'ch-battle-concept'(el) {
    UI.chibiBattlePreview = true;
    UI.battleConcept = +el.dataset.c || 1;
    if (UI.battleConcept === 2 && (UI.battleAngle || 25) < 40) UI.battleAngle = 50;
    if (UI.battleConcept === 4) UI.battleAngle = 15;
    if (typeof SFX !== 'undefined') SFX.play('click');
    chibiModal();
    render();
  },
  'ch-battle-angle'(el) {
    UI.chibiBattlePreview = true;
    UI.battleAngle = +el.dataset.ang;
    if (typeof SFX !== 'undefined') SFX.play('click');
    chibiModal();
    render();
  },
  'ch-battle-dragon'(el) {
    UI.chibiBattlePreview = true;
    UI.battleDragonKey = el.dataset.k || 'star';
    if (typeof SFX !== 'undefined') SFX.play('click');
    chibiModal();
    render();
  },
  'ch-pick-slot'(el) {
    const s = el.dataset.s;
    UI.chibiTab = 'dolap';
    UI.chibiSlot = s;
    chibiModal();
  },
  'ch-ors-slot'(el) {
    if (typeof orsRitualBusy === 'function' && orsRitualBusy()) return;
    UI.orsSlot = el.dataset.s;
    UI.orsItemId = null;
    redrawActiveChibiOrStallModal();
  },
  'ch-ors-pick-item'(el) {
    if (typeof orsRitualBusy === 'function' && orsRitualBusy()) return;
    const id = el.dataset.id;
    if (id && CHIBI_ITEMS[id]) {
      UI.orsSlot = CHIBI_ITEMS[id].slot;
      UI.orsItemId = id;
      if (UI.stallTab === 'dokum') UI.stallTab = 'ors';
    }
    redrawActiveChibiOrStallModal();
  },
  'ch-equip'(el) {
    const C = ensureChibi();
    const s = el.dataset.s;
    const id = el.dataset.id || null;
    if (id) {
      if (C.burnedItems && C.burnedItems[id]) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast('🔥 Bu ekipman yanmış hurda durumunda! Kuşanmak için Çarşı\'daki Demirci Usta Kerim\'de <b>Küllerden Onarım</b> yapmalısınız.');
      }
      if (!C.unlockedItems || !C.unlockedItems[id]) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast('🔒 Bu ekipmanın kalıbı henüz dökülmedi! Çarşı\'daki Demirci Usta Kerim\'in <b>Dökümhane</b> sekmesinde üretebilirsiniz.');
      }
    }
    C.eq[s] = id;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('click');
    saveGame();
    chibiModal();
    render();
  },
  'ch-unequip'(el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const C = ensureChibi();
    const s = el.dataset.s;
    C.eq[s] = null;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('click');
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-gender'(el) {
    const C = ensureChibi();
    C.gender = el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-skin'(el) {
    const C = ensureChibi();
    C.skin = el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-hair'(el) {
    const C = ensureChibi();
    C.hair = +el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-haircol'(el) {
    const C = ensureChibi();
    C.hairColor = el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-expr'(el) {
    const C = ensureChibi();
    C.expr = +el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-set-eyecol'(el) {
    const C = ensureChibi();
    C.eyeColor = el.dataset.v;
    saveGame();
    chibiModal();
    render();
  },
  'ch-toggle-dr'() {
    const C = ensureChibi();
    C.showDragon = !C.showDragon;
    saveGame();
    chibiModal();
  },
  'ch-strip-all'() {
    const C = ensureChibi();
    C.eq = { hat: null, face: null, armor: null, back: null, wpn: null, tal: null };
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('click');
    toast('Tüm ekipmanlar çıkarıldı; karakter iç çamaşırlı baz görünüme döndü.');
    saveGame();
    chibiModal();
    render();
  },
  'ch-random-fit'() {
    const C = ensureChibi();
    C.gender = pick(['male', 'female']);
    C.skin = pick(CHIBI_SKINS).k;
    C.hair = ri(1, 8);
    C.hairColor = pick(CHIBI_HAIR_COLORS).k;
    C.expr = ri(1, 8);
    C.eyeColor = pick(CHIBI_EYE_COLORS).k;
    for (const sl of CHIBI_SLOTS) {
      const avail = Object.values(CHIBI_ITEMS).filter(i => i.slot === sl.k && C.unlockedItems[i.id] && !C.burnedItems[i.id]);
      if (avail.length) C.eq[sl.k] = pick(avail).id;
    }
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('win');
    saveGame();
    chibiModal();
    render();
  },
  'ch-toggle-scroll'() {
    UI.orsUseScroll = !UI.orsUseScroll;
    redrawActiveChibiOrStallModal();
  },
  'ch-smith-up'(el) {
    if (orsRitualBusy()) return;
    const C = ensureChibi();
    const s = (el && el.dataset && el.dataset.s) || UI.orsSlot || 'wpn';
    const itemId = (el && el.dataset && el.dataset.id) || UI.orsItemId || C.eq[s];
    const it = itemId ? CHIBI_ITEMS[itemId] : null;
    if (!it || !C.unlockedItems[it.id]) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast('Örste dövmek için geçerli bir açık ekipman seçmelisiniz.');
    }
    if (C.burnedItems[it.id]) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast('🔥 Yanmış hurda ekipmana + basılamaz! Önce Küllerden Onarım yapmalısınız.');
    }
    const pl = C.itemPlus[it.id] || 0;
    const spec = getChibiEnhancementSpec(it.id, pl);
    if (!spec) return;

    const stoneInfo = CHIBI_STONES[spec.stoneKey];
    if ((C.stones[spec.stoneKey] || 0) < spec.stoneCost) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Bu kademe için <b>${spec.stoneCost}× ${stoneInfo.ad}</b> gerekiyor (Mevcut: ${C.stones[spec.stoneKey] || 0}).`);
    }
    if (S.gold < spec.goldCost) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Kor dövme işçiliği için <b>${spec.goldCost} Altın</b> gerekiyor.`);
    }

    // Malzemeler ritüel başlarken harcanır; sonuç tav + 3 çekiç vuruşundan sonra açıklanır.
    S.gold -= spec.goldCost;
    C.stones[spec.stoneKey] -= spec.stoneCost;
    let usedAnka = false;
    if (spec.nextPl >= 5 && UI.orsUseScroll && (C.stones.anka_koruma || 0) > 0) {
      C.stones.anka_koruma--;
      usedAnka = true;
    }
    saveGame();

    UI.orsRitual = { phase: 'heat', itemId: it.id, slot: it.slot, pl, spec, usedAnka, t0: performance.now(), hits: 0, bonus: 0, grade: null, freezePos: null, result: null };
    if (typeof SFX !== 'undefined') SFX.play('tab');
    orsRedraw();
    UI.orsRitual.raf = requestAnimationFrame(orsTickHeat);
  },
  'ors-strike'() {
    orsStrike(false);
  },
  'ors-ritual-close'() {
    if (orsRitualBusy()) return;
    UI.orsRitual = null;
    orsRedraw();
  },
  'ors-preview'(el) {
    if (orsRitualBusy()) return;
    UI.orsPreviewPl = +el.dataset.pl || 0;
    orsRedraw();
  },
  'ch-smith-repair'(el) {
    const C = ensureChibi();
    const itemId = (el && el.dataset && el.dataset.id) || UI.orsItemId;
    const it = itemId ? CHIBI_ITEMS[itemId] : null;
    if (!it || !C.burnedItems[it.id]) return;
    const cost = getChibiRepairCost(it.id);
    if (!cost) return;

    if (S.gold < cost.gold) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Küllerden Onarım için <b>${cost.gold} Altın</b> gerekiyor.`);
    }
    for (const [k, v] of Object.entries(cost.stones)) {
      if ((C.stones[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Onarım için <b>${v}× ${CHIBI_STONES[k].ad}</b> gerekiyor.`);
      }
    }
    for (const [k, v] of Object.entries(cost.shards)) {
      if ((C.shards[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Onarım için <b>${v}× ${CHIBI_SHARDS[k].ad}</b> gerekiyor.`);
      }
    }
    for (const [k, v] of Object.entries(cost.ores)) {
      if ((C.ores[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Onarım için <b>${v}× ${CHIBI_ORES[k].ad}</b> gerekiyor.`);
      }
    }

    S.gold -= cost.gold;
    for (const [k, v] of Object.entries(cost.stones)) C.stones[k] -= v;
    for (const [k, v] of Object.entries(cost.shards)) C.shards[k] -= v;
    for (const [k, v] of Object.entries(cost.ores)) C.ores[k] -= v;

    delete C.burnedItems[it.id];
    C.itemPlus[it.id] = 0;
    if (!C.eq[it.slot]) C.eq[it.slot] = it.id;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('win');
    toast(`🛠️ <b>KÜLLERDEN ONARIM TAMAMLANDI!</b> <b>${esc(it.ad)}</b> küllerinden yeniden dövülerek +0 sağlam duruma getirildi.`);
    saveGame();
    redrawActiveChibiOrStallModal();
    render();
  },
  'ch-smith-transfer'(el) {
    const C = ensureChibi();
    const fromId = el.dataset.from;
    const toId = el.dataset.to;
    const srcIt = CHIBI_ITEMS[fromId];
    const dstIt = CHIBI_ITEMS[toId];
    if (!srcIt || !dstIt || srcIt.slot !== dstIt.slot) return;
    if (C.burnedItems[fromId] || C.burnedItems[toId] || !C.unlockedItems[toId]) return;
    const srcPl = C.itemPlus[fromId] || 0;
    if (srcPl < 6) return toast('Kor Aktarımı için kaynak ekipman en az +6 kademesinde olmalıdır.');
    if ((C.stones.kor_t2 || 0) < 3 || S.gold < 500) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast('Kor Aktarımı için <b>3× Harlı Kor Taşı (T2)</b> ve <b>500 Altın</b> gerekiyor.');
    }
    S.gold -= 500;
    C.stones.kor_t2 -= 3;
    const newPl = Math.max(C.itemPlus[toId] || 0, srcPl - 2);
    C.itemPlus[toId] = newPl;
    C.itemPlus[fromId] = 0;
    C.eq[dstIt.slot] = toId;
    UI.orsItemId = toId;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('win');
    toast(`🔄 <b>KOR AKTARIMI!</b> ${esc(srcIt.ad)} içindeki kor ruhu <b>${esc(dstIt.ad)} (+${newPl})</b> eşyasına aktarıldı!`);
    saveGame();
    redrawActiveChibiOrStallModal();
    render();
  },
  'ch-craft-item'(el) {
    const C = ensureChibi();
    const itemId = el.dataset.id;
    const it = CHIBI_ITEMS[itemId];
    if (!it || C.unlockedItems[itemId]) return;
    const rec = getChibiItemCraftRecipe(itemId);
    if (!rec) return;

    if (rec.ascendFrom) {
      const baseIt = CHIBI_ITEMS[rec.ascendFrom];
      const basePl = C.itemPlus[rec.ascendFrom] || 0;
      if (!C.unlockedItems[rec.ascendFrom] || C.burnedItems[rec.ascendFrom] || basePl < (rec.reqPlus || 10)) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`⚡ Tier 6 Uyanış için önce <b>${esc(baseIt ? baseIt.ad : rec.ascendFrom)}</b> eşyasını en az <b>+${rec.reqPlus || 10}</b> kademesine ulaştırmalısınız!`);
      }
    }
    if (S.gold < rec.gold) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Döküm için <b>${rec.gold} Altın</b> gerekiyor.`);
    }
    for (const [k, v] of Object.entries(rec.shards || {})) {
      if ((C.shards[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Döküm için <b>${v}× ${CHIBI_SHARDS[k].ad}</b> gerekiyor (Zindan Seferinden elde edilir).`);
      }
    }
    for (const [k, v] of Object.entries(rec.essences || {})) {
      if ((C.essences[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Uyanış için <b>${v}× ${CHIBI_ESSENCES[k].ad}</b> gerekiyor (Ağır/Cehennem Zindan & Kül Yutan'dan düşer).`);
      }
    }
    for (const [k, v] of Object.entries(rec.ores || {})) {
      if ((C.ores[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Döküm için <b>${v}× ${CHIBI_ORES[k].ad}</b> gerekiyor (${CHIBI_ORES[k].route} Kervan Yolu'ndan elde edilir).`);
      }
    }
    for (const [k, v] of Object.entries(rec.stones || {})) {
      if ((C.stones[k] || 0) < v) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Döküm için <b>${v}× ${CHIBI_STONES[k].ad}</b> gerekiyor.`);
      }
    }

    S.gold -= rec.gold;
    for (const [k, v] of Object.entries(rec.shards || {})) C.shards[k] -= v;
    for (const [k, v] of Object.entries(rec.essences || {})) C.essences[k] -= v;
    for (const [k, v] of Object.entries(rec.ores || {})) C.ores[k] -= v;
    for (const [k, v] of Object.entries(rec.stones || {})) C.stones[k] -= v;

    C.unlockedItems[itemId] = true;
    if (rec.ascendFrom) {
      // Carry over +8 when ascending a +10/+12 Tier 5 item into Tier 6
      const oldPl = C.itemPlus[rec.ascendFrom] || 10;
      C.itemPlus[itemId] = Math.max(0, oldPl - 4);
    } else {
      C.itemPlus[itemId] = C.itemPlus[itemId] || 0;
    }
    C.eq[it.slot] = itemId;
    UI.orsSlot = it.slot;
    UI.orsItemId = itemId;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('win');
    toast(`⚒️ <b>DÖKÜMHANE ZAFERİ!</b> <b>${esc(it.ad)}</b> dövüldü ve kuşanıldı!`);
    saveGame();
    redrawActiveChibiOrStallModal();
    render();
  },
  'ch-stone-synth'(el) {
    const C = ensureChibi();
    const fromKey = el.dataset.from;
    const map = {
      kor_t1: { to: 'kor_t2', gold: 50 },
      kor_t2: { to: 'kor_t3', gold: 200 },
      kor_t3: { to: 'anka_koruma', gold: 500 },
    };
    const cfg = map[fromKey];
    if (!cfg) return;
    if ((C.stones[fromKey] || 0) < 5) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Sentez için <b>5× ${CHIBI_STONES[fromKey].ad}</b> gerekiyor.`);
    }
    if (S.gold < cfg.gold) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast(`Sentez için <b>${cfg.gold} Altın</b> gerekiyor.`);
    }
    S.gold -= cfg.gold;
    C.stones[fromKey] -= 5;
    C.stones[cfg.to] = (C.stones[cfg.to] || 0) + 1;
    syncChibiSlotPlus(C);
    if (typeof SFX !== 'undefined') SFX.play('win');
    toast(`🔥 <b>TAŞ SENTEZİ!</b> 5× ${CHIBI_STONES[fromKey].ad} birleştirilerek <b>+1 ${CHIBI_STONES[cfg.to].ad}</b> elde edildi!`);
    saveGame();
    redrawActiveChibiOrStallModal();
    render();
  },
  'ch-salvage-pick'(el) {
    if (el.dataset.dir === 'from') {
      UI.salvageFromOre = el.dataset.k;
      if (UI.salvageToOre === UI.salvageFromOre) {
        UI.salvageToOre = Object.keys(CHIBI_ORES).find(k => k !== UI.salvageFromOre) || 'kehribar';
      }
    } else {
      UI.salvageToOre = el.dataset.k;
    }
    redrawActiveChibiOrStallModal();
  },
  'ch-salvage-convert'(el) {
    const C = ensureChibi();
    const kind = el.dataset.kind;
    const fromK = el.dataset.from;
    const toK = el.dataset.to;
    if (S.gold < 150) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      return toast('5:1 Pota eritme işlemi için <b>150 Altın</b> gerekiyor.');
    }
    if (kind === 'shard') {
      if (!CHIBI_SHARDS[fromK] || !CHIBI_SHARDS[toK]) return;
      if ((C.shards[fromK] || 0) < 5) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Eritme için <b>5× ${CHIBI_SHARDS[fromK].ad}</b> gerekiyor.`);
      }
      S.gold -= 150;
      C.shards[fromK] -= 5;
      C.shards[toK] = (C.shards[toK] || 0) + 1;
      if (typeof SFX !== 'undefined') SFX.play('win');
      toast(`♻️ 5× ${CHIBI_SHARDS[fromK].ad} eritilerek <b>+1 ${CHIBI_SHARDS[toK].ad}</b> döküldü!`);
    } else if (kind === 'ore') {
      if (!CHIBI_ORES[fromK] || !CHIBI_ORES[toK] || fromK === toK) return;
      if ((C.ores[fromK] || 0) < 5) {
        if (typeof SFX !== 'undefined') SFX.play('error');
        return toast(`Eritme için <b>5× ${CHIBI_ORES[fromK].ad}</b> gerekiyor.`);
      }
      S.gold -= 150;
      C.ores[fromK] -= 5;
      C.ores[toK] = (C.ores[toK] || 0) + 1;
      if (typeof SFX !== 'undefined') SFX.play('win');
      toast(`♻️ 5× ${CHIBI_ORES[fromK].ad} eritilerek <b>+1 ${CHIBI_ORES[toK].ad}</b> elde edildi!`);
    }
    saveGame();
    redrawActiveChibiOrStallModal();
    render();
  },
};

if (typeof ACT !== 'undefined') Object.assign(ACT, CHIBI_ACT);
if (typeof window !== 'undefined') {
  window.CHIBI_SET_DEFS = CHIBI_SET_DEFS;
  window.CHIBI_STONES = CHIBI_STONES;
  window.CHIBI_ORES = CHIBI_ORES;
  window.CHIBI_SHARDS = CHIBI_SHARDS;
  window.CHIBI_ESSENCES = CHIBI_ESSENCES;
  window.awardChibiStones = awardChibiStones;
  window.calcChibiStats = calcChibiStats;
  window.renderUstaKerimOrsTab = renderUstaKerimOrsTab;
  window.renderUstaKerimDokumTab = renderUstaKerimDokumTab;
  window.renderUstaKerimSentezTab = renderUstaKerimSentezTab;
}
if (typeof global !== 'undefined') {
  global.CHIBI_SET_DEFS = CHIBI_SET_DEFS;
  global.CHIBI_STONES = CHIBI_STONES;
  global.CHIBI_ORES = CHIBI_ORES;
  global.CHIBI_SHARDS = CHIBI_SHARDS;
  global.CHIBI_ESSENCES = CHIBI_ESSENCES;
  global.awardChibiStones = awardChibiStones;
  global.calcChibiStats = calcChibiStats;
}
