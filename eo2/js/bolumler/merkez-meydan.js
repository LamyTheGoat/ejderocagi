/* Ejder Ocağı 2.0 · Bölüm: Merkez Meydan (master referanstan kurulum)
   Yalnız veri. Motor: js/bolum.js. Alanların anlamı: docs/BOLUM_SOZLESMESI.md. Yöntem ve geçmiş: docs/CIZIM_DUNYASI.md → "Master Meydan".
   Kaynak: 02_UI_MOCKUP/ANA_REFERANS_MERKEZ_MEYDAN_YAKIN_KAMERA.png (1672 × 941). Bütün piksel değerleri bu görselin pikselidir.
   Sahne kimliği 'master'dır (Menü → Master Meydan; kayıtlı düzenler bu kimlikle saklanır). */
EO2.bolum.tanimla({
  id: 'master', ad: 'Merkez Meydan', altAd: 'Çeşmeli meydan',

  /* nesneler: [çizim, taban ortası x, taban y, görseldeki piksel eni, seçenek]
     ayna: yatay çevir · key: sıra kayması (birim) · carp: çarpışma yarıçapı (birim) · cy: çarpışma dairesinin derinlik kayması · z: yerden yükseklik */
  nesneler: [
    /* arka plan: kapının iki yanında sur, arkasında ağaç sırası (kemerin içinden de görünür) */
    /* arka ağaçlar mm-* (ms-* çizimlerinin koyu, soğuk tonlu yeni kopyaları): master'da surun arkası koyu yeşildir; limon yeşili ağaç odağı çalıyordu */
    ['mm-agac', 980, 236, 210, { carp: 0 }], ['mm-agac', 1150, 238, 215, { ayna: 1, carp: 0 }], ['mm-cam', 1235, 250, 120, { carp: 0 }], ['mm-agac', 760, 246, 270, { carp: 0 }], ['mm-agac', 1500, 250, 290, { ayna: 1, carp: 0 }],
    ['mm-cam', 610, 252, 150, { carp: 0 }], ['mm-agac', 1760, 252, 300, { carp: 0 }], ['mm-cam', 1385, 246, 135, { ayna: 1, carp: 0 }], ['mm-agac', 400, 250, 300, { ayna: 1, carp: 0 }], ['mm-cam', 1640, 244, 150, { carp: 0 }],
    /* sur (mm-sur, ChatGPT 2026-11-12): düz modül, kapının iki yanında uç uca; kapıyla aynı derinlikte (taban y 262), kapının kenarlarına (805 ve 1285) dayanır. Önceki: ms-sur (470 ve 1640, en 620). */
    ['mm-sur-k', 570, 262, 470, { carp: 0 }], ['mm-sur-k', 100, 262, 470, { ayna: 1, carp: 0 }], ['mm-sur-k', 1520, 262, 470, { ayna: 1, carp: 0 }], ['mm-sur-k', 1990, 262, 470, { carp: 0 }],
    ['mm-agac', 560, 214, 420, { carp: 0 }], ['mm-agac', 900, 212, 400, { ayna: 1, carp: 0 }], ['mm-agac', 1230, 214, 420, { carp: 0 }], ['mm-agac', 1560, 212, 420, { ayna: 1, carp: 0 }], ['mm-agac', 1880, 214, 400, { carp: 0 }], ['mm-agac', 230, 212, 400, { ayna: 1, carp: 0 }],
    ['mm-cam', 1292, 305, 150, { carp: 0.4 }],
    /* çiçek öbekleri: han köşesi, kapı önü bankı, tezgâh ve çeşme yanı */
    ['ms-cali1', 738, 348, 105, { carp: 0.5 }], ['ms-cali1', 1545, 505, 130, { ayna: 1, carp: 0.6 }],   // kapı önündeki çalı kalktı: yeni kapının kendi çiçekli istinat duvarları var ['ms-cali0', 1640, 610, 190, { ayna: 1, carp: 0.7 }],
    ['ms-tabela', 548, 520, 108, { z: 2.05, carp: 0 }],
    /* han önü öbeği (master x 60–720): hanın solu master'da ön plan yaprağıyla kapalıdır (onPlan); dipte tek çiçek kütlesi han duvarına yaslanır, fıçılar sağ direğin dibinde tek öbektir */
    ['ms-cali0', 150, 588, 240, { ayna: 1, carp: 0.7 }], ['mg-b14', 262, 628, 150, { carp: 0.4 }],
    /* hanın solu dünyada da kapalı olmalı: ön plan yaprağı ekrana sabittir, oyuncu sola yürüyünce hanın yanı çıplak zemin kalıyordu (koyu ağaçlar, master çerçevesinin dışı) */
    ['mm-cam', -175, 525, 190, { carp: 0.5 }],   // (55, 548)'deki ağaç kalktı: orada artık hanın yan kanadı duruyor ['mm-agac', -250, 562, 390, { ayna: 1, carp: 0.6 }], ['ms-cali0', -70, 612, 230, { carp: 0.7 }],
    /* han (mm-han, ChatGPT 2026-11-12, master ve kırpması referans): çizimin en alt noktası sundurmanın yakın köşesidir, master'daki sol direğin dibine (390, 555) oturur.
       Master ölçüsü 520 piksel en verir; master'daki han daha yüksek ve kütleli olduğu için yüzde 23 büyük tutuldu (640). */
    /* han MODÜLER (kullanıcı düsturu, 2026-11-12: büyük yapı ayrı parçalardan dizilir). Üç ayrı çizim, her biri kendi derinliğinde:
       - arka gövde (mm-han-arka): üç kat ve çatı katı; ön bloğun alçak sol çatısının üstünden yükselir, üstü kadrajdan taşar.
       - yan kanat (mm-han-kanat): alçak kanat, solda.
       - ön blok (ms-han → mm-han): sundurmalı giriş; en 640 → 600.
       Sıra: key değerleri arka > kanat > ön blok olacak biçimde verildi (büyük key = daha geride). */
    ['mm-han-arka', 300, 505, 520, { key: 3, carp: 0 }],
    ['mm-han-kanat', 60, 545, 420, { key: 2.6, carp: 0 }],
    ['ms-han', 430, 558, 600, { key: 2.5, carp: 0 }],
    /* kapı ve merdiven MODÜLER (kullanıcı kararı, 2026-11-12): ayrı çizimler, biri kaldırılınca öteki durur.
       - kapı (mm-kapi2): surla aynı derinlikte durur (taban y 262); z: 0.2 → tabanı merdivenin sahanlığına oturur.
       - merdiven (mm-merdiven): tabanı en alt basamak (y 402). key: 12 → basamağın üstünde duran bekçilerden geride, kapıdan önde sıralanır.
       Önceki tek parça çizim: mm-kapi (taban 1045, 402, en 590, key 12); dosyası duruyor. */
    /* 2026-11-12, kullanıcı: "merdivene takılmayalım, direkt yerde olsun kapı." Merdiven sahneden kalktı (çizimi mm-merdiven duruyor; geri koymak için:
       ['mm-merdiven', 1045, 402, 560, { key: 12, carp: 0 }] ve kapıya z: 0.2). Kapı surla aynı derinlikte, yerde durur. */
    ['ms-kapi', 1045, 262, 480, { carp: 0 }],
    ['ms-tezgah0', 1370, 396, 220, { carp: 1.4, cy: 0.7 }], ['ms-tezgah1', 1655, 430, 235, { carp: 1.4, cy: 0.7 }],
    ['ms-erguvan', 1640, 335, 270, { carp: 0.5 }], ['ms-erguvan', 742, 300, 170, { ayna: 1, carp: 0.4 }],
    ['ms-fici', 702, 440, 64, { carp: 0.6 }],
    { ad: 'mm-bank', x: 1.1, y: 20.44, w: 1.45, ayna: 1, carp: 0.7, bagla: true },   /* kapı önü bankı (master 905, 418) */ ['ms-fener', 868, 268, 33, { carp: 0.25 }], ['ms-fener', 1132, 268, 33, { carp: 0.25 }],
    ['ms-masa', 512, 604, 230, { carp: 1.0, cy: 0.4 }],
    /* çeşme: master'da havuz 445 piksel enindedir. mg-a02 çiziminin iki yanında havuzu saran kendi tarhları var; önüne ayrıca konan iki kutu tarh
       "yanına iliştirilmiş" duruyordu, kaldırıldı. Soldaki tarh (sancağın arkası) master'daki yerinde kalır. */
    ['ms-cesme', 1310, 722, 440, { key: 1.5, carp: 1.95, cy: 1.7 }],
    ['ms-tarh0', 1000, 655, 165, { carp: 0.7, cy: 0.3 }],
    ['ms-sancak', 1058, 652, 82, { carp: 0.3 }], ['ms-sancak', 1548, 612, 76, { carp: 0.3 }],
    { ad: 'mm-bank', x: -3.05, y: 8.59, w: 1.8, carp: 0.9, cy: 0.3, bagla: true },   /* öndeki bank (master 385, 778) */ ['ms-fener', 590, 930, 76, { carp: 0.25 }],

    /* ===== MASTER KADRAJININ DIŞI (2026-11-12): meydan yürününce boş taş kalıyordu. Buradan aşağısı dünya ölçüsüyledir (x doğu, y kuzey; oyuncu 0, 10; çeşme 3.8, 9.6;
       kapı 4.8, 36.5; yürüme alanı x -9..15, y 3.5..38). Master'da karşılığı yok; düzen bölüm ajanının tasarımıdır. Kural: yürüme hatları (oyuncu → kapı, han → çeşme →
       pazar) boş kalır, eşya kenarlarda öbeklenir. ===== */
    /* A · kapı yolu: kapıya giden eksenin (x 4.8) iki yanında fener ve sancak sırası; göz kapıya gider */
    { ad: 'mg-a04', x: 2.0, y: 25, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mg-a04', x: 7.6, y: 25, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mg-a04', x: 2.0, y: 31, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mg-a04', x: 7.6, y: 31, w: 0.62, carp: 0.25, bagla: true },
    { ad: 'mg-c09', x: 2.0, y: 28, w: 0.75, carp: 0.25, bagla: true }, { ad: 'mg-c10', x: 7.6, y: 28, w: 0.8, carp: 0.25, bagla: true },
    { ad: 'mg-b28', x: 1.9, y: 34.2, w: 0.8, carp: 0.4, bagla: true }, { ad: 'mg-b28', x: 7.7, y: 34.2, w: 0.8, ayna: 1, carp: 0.4, bagla: true },
    /* B · kuzeybatı dinlenme köşesi (hanın arkası ile sur arası): ağaç altı, iki bank, çalılar; kuyu gelince ortaya konacak */
    { ad: 'mm-agac', x: -6.6, y: 30.5, w: 5.2, carp: 0.5, bagla: true }, { ad: 'mm-agac', x: -3.4, y: 33.6, w: 4.8, ayna: 1, carp: 0.5, bagla: true }, { ad: 'ms-erguvan', x: -8.2, y: 24.6, w: 4.0, carp: 0.5, bagla: true },
    { ad: 'mm-bank', x: -6.4, y: 22.4, w: 1.6, carp: 0.7, bagla: true }, { ad: 'mm-bank', x: -2.2, y: 23.0, w: 1.6, ayna: 1, carp: 0.7, bagla: true },
    { ad: 'mg-a04', x: -4.4, y: 21.6, w: 0.62, carp: 0.25, bagla: true },
    { ad: 'mg-b06', x: -7.8, y: 27.4, w: 1.6, carp: 0.5, bagla: true }, { ad: 'mg-b18', x: -3.0, y: 29.4, w: 1.4, carp: 0.5, bagla: true }, { ad: 'ms-cali0', x: -8.6, y: 33.4, w: 2.2, carp: 0.6, bagla: true }, { ad: 'mg-c05', x: -6.6, y: 25.0, w: 0.9, carp: 0.4, bagla: true },
    /* C · kuzeydoğu pazar köşesi: üçüncü tezgâh, sandık ve fıçı öbekleri, tabela; araba ve ilan panosu gelince eklenecek */
    { ad: 'mg-c02', x: 13.4, y: 24.4, w: 3.6, ayna: 1, carp: 1.4, cy: 0.7, bagla: true }, { ad: 'mg-b23', x: 10.2, y: 27.4, w: 3.0, carp: 1.1, bagla: true }, { ad: 'mg-c06', x: 14.4, y: 20.6, w: 1.8, carp: 0.8, bagla: true },
    { ad: 'mg-a06', x: 9.5, y: 24.6, w: 1.3, carp: 0.6, bagla: true }, { ad: 'mg-b33', x: 9.9, y: 18.0, w: 0.9, carp: 0.35, bagla: true }, { ad: 'mg-a04', x: 12.4, y: 22.8, w: 0.62, carp: 0.25, bagla: true },
    { ad: 'mg-b13', x: 15.6, y: 23.2, w: 0.8, carp: 0.4, bagla: true }, { ad: 'mg-b09', x: 12.0, y: 18.6, w: 1.2, carp: 0.5, bagla: true },
    /* D · doğu kenarı: ağaç ve çalı sırası meydanı kapatır (dik çizimle yan duvar kurulamaz); önünde fener, bank, saksı */
    { ad: 'mm-agac', x: 18.4, y: 5.6, w: 5.6, z: -5.3, carp: 0 }, { ad: 'ms-erguvan', x: 17.4, y: 11.6, w: 4.2, ayna: 1, carp: 0.5, bagla: true }, { ad: 'mm-agac', x: 18.6, y: 17.2, w: 5.4, ayna: 1, carp: 0.5, bagla: true }, { ad: 'mm-cam', x: 17.0, y: 21.6, w: 2.8, carp: 0.4, bagla: true },
    { ad: 'ms-cali0', x: 16.2, y: 8.6, w: 2.2, ayna: 1, carp: 0.6, bagla: true }, { ad: 'mg-b14', x: 16.0, y: 14.2, w: 1.4, carp: 0.4, bagla: true }, { ad: 'mg-b06', x: 13.9, y: 5.9, w: 1.5, carp: 0.5, bagla: true }, { ad: 'mg-b16', x: 16.2, y: 19.0, w: 1.6, carp: 0.5, bagla: true },
    { ad: 'mg-a04', x: 13.6, y: 8.0, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mg-a04', x: 13.6, y: 15.0, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mm-bank', x: 13.4, y: 11.6, w: 1.6, ayna: 1, carp: 0.7, bagla: true }, { ad: 'mg-c04', x: 13.9, y: 13.2, w: 1.4, carp: 0.6, bagla: true },
    /* E · batı ve güneybatı kenarı */
    { ad: 'mm-agac', x: -12.6, y: 9.6, w: 5.6, ayna: 1, carp: 0.5, bagla: true }, { ad: 'ms-erguvan', x: -12.2, y: 5.0, w: 4.2, z: -4.1, carp: 0 }, { ad: 'ms-cali0', x: -11.8, y: 8.8, w: 2.2, carp: 0.6, bagla: true }, { ad: 'mg-b18', x: -8.3, y: 5.9, w: 1.4, carp: 0.5, bagla: true },
    { ad: 'mg-a04', x: -7.2, y: 5.2, w: 0.62, carp: 0.25, bagla: true }, { ad: 'mg-c04', x: -6.0, y: 7.6, w: 1.4, carp: 0.6, bagla: true },
    /* F · güney kenarı: korkuluk sırası meydanın alt sınırıdır; iki açıklık (x -4 ve x 9) güney çıkışlarına ayrıldı, yanlarında fenerli babalar.
       y 2.6: oyuncunun en güney konumundan (y 5.0) 2,4 birim öndedir; daha yakın konunca korkuluk oyuncunun bacaklarını örtüyordu. */
    /* YUVARLAK TERAS (kullanıcı, 2026-11-12: "korkulukları bir tık daha yuvarlak ve geniş tut"). Güney düz koşu x -5.5..10.55 (y 2.6); iki köşede 5,13 birim yarıçaplı
       çeyrek yay, her biri dört kirişle. Kiriş = dik çizim + çapraz derinlik (yon): çizimin iki ucu ayrı derinlikte durur. Eğik duran parça ekranda enine kısaldığı için
       korkuluğun enine daraltılmış kopyaları kullanılır (mm-kork-83, -56, -20; yükseklik hep aynı). Yay bitince kenar kuzeye taş babalarla sürer. */
    ...[-2.5, -0.5, 1.5, 3.5, 5.5, 7.5].map((x, i) => ({ ad: 'mg-c07', x: x + 0.025, y: 2.6, w: 2.0, ayna: i % 2, carp: 0 })),
    ...[['mg-c07', 6.482, 2.795, 1.963, 0.39, 1.9, 0.5], ['mm-kork-83', 8.295, 3.547, 1.664, 1.113, 2.3, 0.8], ['mm-kork-56', 9.683, 4.935, 1.112, 1.664, 2.2, 1.2], ['mm-kork-20', 10.435, 6.749, 0.391, 1.963, 1.6, 1.0]]   // [çizim, x, y, en, yon, çarpışma yarıçapı, çarpışma kayması]: oyuncu köşede korkuluğun dibine giremez
      .flatMap(q => [{ ad: q[0], x: -q[1], y: q[2], w: q[3], yon: -q[4], carp: q[5], cy: q[6] }, { ad: q[0], x: q[1] + 5.05, y: q[2], w: q[3], yon: q[4], ayna: 1, carp: q[5], cy: q[6] }]),
    { ad: 'mg-b31', x: -5.5, y: 2.7, w: 0.55, carp: 0 }, { ad: 'mg-b31', x: -3.5, y: 2.7, w: 0.55, carp: 0 }, { ad: 'mg-b31', x: 8.55, y: 2.7, w: 0.55, carp: 0 }, { ad: 'mg-b31', x: 10.55, y: 2.7, w: 0.55, carp: 0 },   // iniş açıklıkları: x -4,5 (Arena) ve x 9,55 (Bahçe)
    { ad: 'mg-c05', x: 0.6, y: 3.4, w: 0.9, carp: 0, bagla: true }, { ad: 'mg-c05', x: 6.4, y: 3.4, w: 0.9, ayna: 1, carp: 0, bagla: true }, { ad: 'mg-c04', x: 12.2, y: 3.5, w: 1.4, carp: 0, bagla: true },
    /* H · TERAS KENARI (kullanıcı, 2026-11-12: "meydan yüksek bir yerde ve korkuluklarla çevrili gibi olsun; oyuncu güneye gelince platformu görsün, ileride şehir
       devam ediyormuş gibi"). Korkuluğun altında, zemin seviyesinin ALTINA inen duvar yüzü (z eksi) ve aşağı kotta ağaç tepeleri, çatılar. Döşeme korkulukta biter. */
    ...[-1.487, 6.538].flatMap((x, i) => [{ ad: 'mm-teras', x, y: 2.52, w: 8.03, z: -2.1, ayna: i % 2, carp: 0 }, { ad: 'mm-duvar', x, y: 2.5, w: 8.03, z: -3.47, ayna: (i + 1) % 2, carp: 0 }]),   // düz koşunun altı: kornişli duvar, altında düz taş sıra
    ...[['mm-terasp-100', 6.482, 2.795, 1.963, 0.39], ['mm-terasp-83', 8.295, 3.547, 1.664, 1.113], ['mm-terasp-56', 9.683, 4.935, 1.112, 1.664], ['mm-terasp-20', 10.435, 6.749, 0.391, 1.963]]
      .flatMap(q => [{ ad: q[0], x: -q[1], y: q[2] - 0.06, w: q[3], yon: -q[4], z: -2.1, carp: 0 }, { ad: q[0], x: q[1] + 5.05, y: q[2] - 0.06, w: q[3], yon: q[4], z: -2.1, ayna: 1, carp: 0 }]),   // köşe duvarı
    { ad: 'mm-agac', x: -7.5, y: -0.2, w: 5.6, z: -6.1, carp: 0 }, { ad: 'ms-erguvan', x: -1.8, y: -0.8, w: 4.4, z: -4.5, carp: 0 }, { ad: 'mm-agac', x: 4.6, y: 0.0, w: 5.2, z: -5.7, ayna: 1, carp: 0 },
    { ad: 'mm-cam', x: 9.8, y: -0.6, w: 3.0, z: -4.2, carp: 0 }, { ad: 'ms-erguvan', x: 13.6, y: -0.2, w: 4.6, z: -4.7, ayna: 1, carp: 0 }, { ad: 'mm-agac', x: 19.0, y: -0.8, w: 5.6, z: -4.2, carp: 0 }, { ad: 'mm-agac', x: -13.5, y: -0.6, w: 5.4, z: -4.0, ayna: 1, carp: 0 },
    { ad: 'mm-han-kanat', x: -9.6, y: -0.9, w: 5.0, z: -2.5, ayna: 1, carp: 0 }, { ad: 'mm-han-kanat', x: 12.9, y: -1.0, w: 5.2, z: -2.6, carp: 0 }, { ad: 'mm-han-arka', x: 21.6, y: 0.4, w: 5.2, z: -3.4, carp: 0 }, { ad: 'mm-han-arka', x: -16.8, y: 0.2, w: 5.0, z: -3.2, ayna: 1, carp: 0 },
    /* I · doğu ve batı kenarı: taş baba sırası (dik çizimle yan korkuluk kurulamıyor); arkasında çalı ve ağaç */
    ...[8.6, 10.6, 12.6, 14.6, 16.6, 18.6, 20.6, 22.6, 24.6].map(y => ({ ad: 'mg-b30', x: 15.68, y, w: 0.5, carp: 0, bagla: true })), ...[8.6, 10.4].map(y => ({ ad: 'mg-b30', x: -10.63, y, w: 0.5, carp: 0, bagla: true })),
    /* J · yeni parçalar (ChatGPT, 2026-11-12): kuyu dinlenme köşesinde, ilan panosu çeşme ile pazar arasında, araba pazar köşesinde, yön tabelası güneydoğuda */
    { ad: 'mm-kuyu', x: -4.7, y: 25.4, w: 2.3, carp: 0.9, bagla: true }, { ad: 'mm-pano', x: 9.0, y: 13.4, w: 2.4, carp: 0.9, bagla: true }, { ad: 'mm-araba', x: 11.9, y: 31.6, w: 3.0, carp: 1.1, bagla: true }, { ad: 'mm-tabela', x: 9.4, y: 6.6, w: 1.25, carp: 0.35, bagla: true },
    { ad: 'mm-agac', x: -9.6, y: 1.9, w: 5.0, z: -5.3, carp: 0 }, { ad: 'mm-cam', x: -12.4, y: 3.4, w: 3.2, z: -4.2, ayna: 1, carp: 0 }, { ad: 'mm-agac', x: -13.4, y: 6.6, w: 5.2, z: -5.2, ayna: 1, carp: 0 },
    { ad: 'mm-agac', x: 14.7, y: 1.8, w: 5.0, z: -5.3, ayna: 1, carp: 0 }, { ad: 'ms-erguvan', x: 17.3, y: 3.4, w: 4.4, z: -4.3, carp: 0 }, { ad: 'mm-cam', x: 18.9, y: 7.0, w: 3.2, z: -4.0, carp: 0 },
    /* K · HİKÂYE İZLERİ (kullanıcı, 2026-11-12: "meydan yaşanıyor hissettirmeli"). Küçük eşyalar bir işin yarıda kaldığını ya da birinin az önce burada olduğunu anlatır;
       her biri bir kişinin ya da bir öbeğin yanındadır, tek başına durmaz. Çizimler: mm-h-* (ChatGPT, tek sayfadan ayrıldı). */
    { ad: 'mm-h-kitap', x: -4.25, y: 8.25, w: 0.62, carp: 0.3, bagla: true },                       // Ozan'ın bankının yanında: taburede unutulmuş kitaplar (master'da bankta okuyan biri var)
    { ad: 'mm-h-kedi', x: -1.9, y: 8.15, w: 0.72, carp: 0, bagla: true },                           // bankın öbür ucunda uyuyan kedi
    { ad: 'mm-h-tavla', x: 7.9, y: 18.15, w: 0.95, carp: 0.45, bagla: true },                       // Gezgin ile Usta'nın arasında: sandık üstünde tavla ve iki çay ("Bir el tavla atar mıyız?")
    { ad: 'mm-h-elma', x: 8.9, y: 20.9, w: 0.85, carp: 0.3, bagla: true },                          // tezgâhın önünde devrilmiş elma sepeti
    { ad: 'mm-h-kova', x: 6.5, y: 20.5, w: 1.0, carp: 0.4, bagla: true },                           // Baharatçı'nın yanında kovalarda kesme çiçek
    { ad: 'mm-h-odun', x: 12.9, y: 22.5, w: 1.35, carp: 0.55, bagla: true },                        // Usta Kerim'in yanında odun yığını (örsün ateşi için)
    { ad: 'mm-h-supurge', x: -1.15, y: 17.55, w: 0.85, carp: 0.3, bagla: true },                    // hanın köşesinde kovaya yaslı süpürge
    { ad: 'mm-h-guvercin', x: 0.4, y: 6.15, w: 1.05, carp: 0 }, { ad: 'mm-h-guvercin', x: 6.9, y: 8.0, w: 0.9, ayna: 1, carp: 0 },   // yer mührünün ve çeşmenin yanında yem yiyen güvercinler
    { ad: 'mm-h-kedi', x: 10.9, y: 27.36, w: 0.62, z: 0.66, ayna: 1, carp: 0 },                     // pazar köşesinde sandıkların üstünde ikinci kedi
    { ad: 'mm-h-kova', x: -6.9, y: 26.4, w: 0.9, ayna: 1, carp: 0.4, bagla: true },                 // kuzeybatı bahçesinde bahçıvanın kovaları
    /* G · kapı yolu ile kuzeybatı bahçesi arasında saksı sırası (x -0.9): iki alanı ayırır, aralarından geçilir. Bahçe yürünür; oyuncu hanın kuzeyine geçince motor hanı soldurur. */
    ...[19, 22, 25, 28, 31, 34].map((y, i) => ({ ad: i % 2 ? 'mg-b28' : 'mg-b32', x: -0.9, y, w: 0.8, ayna: i % 2, carp: 0.45, bagla: true })),
  ],

  /* çizim seti: aynı düzen, kullanıcının master'dan ürettirdiği sayfalardaki çizimlerle (mg-*). Varsayılan budur; editörden ilk sete dönülür.
     [çizim, en çarpanı]; çizim null ise nesne bu sette çizilmez (hanın tabelası bu sette han çiziminin içindedir). */
  setler: { ad: 'master sayfaları', ilkAd: 'Midjourney',
    esle: { 'ms-han': ['mm-han', 1.0], 'ms-kapi': ['mm-kapi2', 1.0],   // önceki eşler: mg-a00 (1.0), mg-c01 (0.8)
 'ms-tezgah0': ['mg-a01', 1.1], 'ms-tezgah1': ['mg-c02', 1.1], 'ms-cesme': ['mg-a02', 1.1], 'ms-fener': ['mg-a04', 1.0], 'ms-sancak': ['mg-a05', 1.25],
      'ms-fici': ['mg-a06', 1.7], 'ms-masa': ['mg-masa', 1.1], 'ms-tarh0': ['mg-a08', 1.0], 'ms-tarh1': ['mg-c04', 0.9], 'ms-cali0': ['mg-a07', 1.0], 'ms-cali1': ['mg-b14', 1.0], 'ms-erguvan': ['mg-c00', 0.9], 'ms-tabela': [null, 1] } },

  /* açı ailesi: bankın dokuz yönü (eksi açılar ayna: 16 yön), ışıksız; zemine bağlanır (koyu ton, keskin elips gölge, ayak dibinde çakıl ve ot) */
  aileler: { 'ms-bank': { onek: 'mb-bank-', acilar: [0, 30, 45, 60, 90, 120, 135, 150, 180], varsayilan: 30, bagla: true } },

  /* ışıksız eşler (editörde "Işıksız çizim"; ilk sette denenir) */
  isiksiz: { 'ms-han': 'mn-han', 'ms-cesme': 'mn-cesme' },

  /* editör paletine eklenen öteki çizimler (sahnede kullanılmasa da yüklenir) */
  cizimler: ['mm-merdiven', 'mm-kapi', 'mm-sur', 'mg-a03','mg-a09', 'mg-b00', 'mg-b01', 'mg-b02', 'mg-b03', 'mg-b04', 'mg-b05', 'mg-b06', 'mg-b07', 'mg-b08', 'mg-b09', 'mg-b10', 'mg-b11', 'mg-b12', 'mg-b13', 'mg-b15', 'mg-b16', 'mg-b17', 'mg-b18', 'mg-b19',
    'mg-b23', 'mg-b24', 'mg-b25', 'mg-b26', 'mg-b27', 'mg-b28', 'mg-b29', 'mg-b30', 'mg-b31', 'mg-b32', 'mg-b33', 'mg-c03', 'mg-c05', 'mg-c06', 'mg-c07', 'mg-c08', 'mg-c09', 'mg-c10'],

  golgesiz: ['ms-sur', 'mm-sur', 'mm-sur-k', 'mm-merdiven', 'mg-c07', 'mg-b31', 'mg-b30', 'mm-duvar', 'mm-teras', 'mm-kork-83', 'mm-kork-56', 'mm-kork-20', 'mm-terasp-100', 'mm-terasp-83', 'mm-terasp-56', 'mm-terasp-20'],                                                                  // zemine gölge lekesi düşürmeyen çizimler

  /* ışıklı yerler (zemine işlenen ışık havuzu ve kişilerin aydınlanması): x, y, yarıçap (birim), şiddet */
  isiklar: [[590, 930, 4.2, 1], [868, 268, 4.5, 0.8], [1132, 268, 4.5, 0.8], [520, 540, 5.5, 1.1], [1370, 400, 4, 0.9], [1655, 432, 4, 0.8],
    /* kadraj dışındaki fenerler (dünya konumlarının referans pikseli karşılığı): kapı yolu dört fener, kuzeybatı köşe, pazar köşesi, doğu kenarı iki fener, güneybatı */
    [950, 357, 3.6, 0.8], [1298, 357, 3.6, 0.8], [931, 300, 3.6, 0.7], [1220, 300, 3.6, 0.7], [515, 400, 3.8, 0.8], [1658, 384, 3.8, 0.8], [2792, 814, 3.8, 0.9], [2090, 529, 3.8, 0.9], [-556, 1042, 3.8, 0.9]],

  /* ölçü noktaları (kılavuz): taban x, taban y, piksel boyu, ad */
  noktalar: [[815, 705, 215, 'oyuncu'], [926, 285, 95, 'bekçi sol'], [1172, 285, 95, 'bekçi sağ'], [1425, 450, 123, 'sarışın'], [1478, 450, 123, 'gümüş saçlı'], [790, 448, 113, 'kapı önü kişi'],
    [628, 478, 0, 'han sağ direk'], [390, 555, 0, 'han sol direk'], [1085, 775, 0, 'yer mührü']],

  /* döşeme halkalarının merkezi: çeşme havuzunun yerdeki ortası (kullanıcı kararı, 2026-11-11; önce han önündeydi: [600, 605]).
     Master'ın dünya düzlemine açılmış zemininde de halkalar çeşmenin çevresindedir (docs/zemin_deneme_acilmis_master_2026-11-11.png).
     Tonlar motorun varsayılanından biraz daha sıcak ve gri: gölge lekeleri bindikten sonra ekranda ölçülen zemin master'dan pembeydi
     (oyun 192,145,158 · master 203,161,159). Komşu taşların farkı da biraz kısıldı (yumusat 0.42 → 0.5). */
  zemin: { merkez: [1340, 612], yumusat: 0.5,
    resimler: [['mm-muhur', -0.3, 5.7, 3.5, 9.5],   // yer mührü
      /* yer izleri (mm-iz-*, ChatGPT tek sayfa, tepeden çizim): döşemeyle aynı tuvale boyanır, gölge ve ışık üstüne düşer. Her iz yanındaki bir şeyin sonucudur. */
      ['mm-iz-su', 5.55, 8.14, 7.05, 9.06], ['mm-iz-hasir', 7.05, 17.56, 8.75, 19.14], ['mm-iz-tahil', 0.13, 5.64, 0.98, 6.26], ['mm-iz-tahil', 10.8, 30, 11.6, 30.6], ['mm-iz-teker', 10.7, 28.64, 11.9, 30.16], ['mm-iz-teker', 5.72, 32.68, 6.88, 34.12], ['mm-iz-teker', 5.42, 29.68, 6.58, 31.12], ['mm-iz-yaprak-pembe', 12.55, 25.24, 14.05, 26.56], ['mm-iz-yaprak-pembe', -8.2, 22.89, -6.8, 24.11], ['mm-iz-yaprak-pembe', -1.85, 29.33, -0.55, 30.47], ['mm-iz-yaprak-pembe', 14.35, 10.03, 15.65, 11.17], ['mm-iz-yaprak-pembe', -1.6, 26.07, -0.4, 27.13], ['mm-iz-yosun', -3.65, 34.82, -2.35, 35.78], ['mm-iz-yosun', 10.95, 34.92, 12.25, 35.88], ['mm-iz-yosun', -4.25, 23.99, -3.15, 24.81], ['mm-iz-yosun', -7, 3.26, -5.8, 4.14], ['mm-iz-yosun', 10.8, 3.16, 12, 4.04], ['mm-iz-yosun', 14.05, 19.19, 15.15, 20.01], ['mm-iz-seksek', -6.25, 5.72, -5.15, 7.28]],   // yer mührü: tepeden çizilmiş ejder arması, çeşmenin önünde (master'da 2.0, 8.6)
    alanlar: [[-22, 7.73, 28, 26, 80, 11], [-5.5, 2.5, 10.55, 7.73, 80, 11],   // kuzey bölümü; güney düz koşunun içi (y 2.5: korkuluk hattı)
      [-7.46, 2.8, -5.5, 7.73, 80, 11], [-9.13, 3.5, -7.46, 7.73, 80, 11], [-10.24, 4.9, -9.13, 7.73, 80, 11], [-10.63, 6.7, -10.24, 7.73, 80, 11],   // güneybatı yayının içi
      [10.55, 2.8, 12.51, 7.73, 80, 11], [12.51, 3.5, 14.18, 7.73, 80, 11], [14.18, 4.9, 15.29, 7.73, 80, 11], [15.29, 6.7, 15.68, 7.73, 80, 11],     // güneydoğu yayının içi
      [-34, 26, 38, 58, 30, 23]],
    tugla: [['#f6cdb0', 13], ['#f3d3c6', 10], ['#eec0a0', 8], ['#e6bab4', 15], ['#dbb1aa', 13], ['#cfaab0', 12], ['#b996a4', 10], ['#b09eb6', 9], ['#9c8ea6', 5], ['#c89074', 3], ['#e0a982', 4]] },

  engeller: { cizgi: [[420, 556, 700, 520, 8, -0.9, 0.6, 1.0], [150, 525, 420, 556, 8, 0, 0.7, 1.0], [-140, 540, 150, 540, 6, 0, 0.7, 1.0]] },   // han: sundurmanın önü, ön bloğun sol duvarı, yan kanadın önü

  /* ön plan: master'ın alt köşelerindeki ve sol üstündeki bulanık yaprak ve çiçekler */
  /* Master'da çerçeve koyudur (sol kenar parlaklığı 70, sağ alt köşe 59; bizde 129 ve 72 idi): yapraklar koyu ve az bulanık, çiçekler onların önünde. */
  onPlan: [
    /* atmosfer (2026-11-12): master akşamüstüdür. Motorun ortam ışığı yalnız kişileri etkilediği için (çizimler ışığını içinde taşır) akşam havası ekrana sabit iki
       katmanla verilir: sıcak ton (soft-light) bütün çizimleri tek ışıkta birleştirir; mor kenar karartması (multiply) gözü ortaya toplar. Kodla üretilmiş düz geçişlerdir. */
    ['mm-sicak', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:soft-light;opacity:.14'],
    ['mm-kenar', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:.85'],
    ['mm-agac', 'left:-29%;top:-2%;height:79vh;width:auto;filter:blur(2px) brightness(.5) saturate(.95);transform:translateX(calc(var(--kx,0)*.6px))'],
    ['mm-agac', 'left:-24%;bottom:-52%;height:97vh;width:auto;filter:blur(2.5px) brightness(.42) saturate(.9);transform:translateX(calc(var(--kx,0)*.9px)) scaleX(-1)'],
    ['ms-cali0', 'left:-13%;bottom:-25%;height:41vh;width:auto;filter:blur(2px) brightness(.8) saturate(1.05);transform:translateX(calc(var(--kx,0)*1px))'],
    ['ms-cali1', 'left:12%;bottom:-23%;height:24vh;width:auto;filter:blur(1.5px) brightness(.86) saturate(1.05);transform:translateX(calc(var(--kx,0)*1.1px))'],
    ['mm-agac', 'right:-18%;bottom:-58%;height:92vh;width:auto;filter:blur(2.5px) brightness(.5) saturate(.95);transform:translateX(calc(var(--kx,0)*1px))'],
    ['ms-cali1', 'right:9%;bottom:-21%;height:19vh;width:auto;filter:blur(1.5px) brightness(.8) saturate(1.05);transform:translateX(calc(var(--kx,0)*1.1px)) scaleX(-1)'],
  ],

  /* oyun tarafı: sınırlar, tabelalar, etkileşimler, duvarlar, kişiler. P.PX(x, y) referans pikselini dünyaya çevirir; P.kisi(x, y) → { x, y }.
     Kişiler ve replikleri eski meydandaki (js/world.js) kayıtlı kişilerdir; yeni mekanik yoktur. Kapılar var olan alanlara açılır (go:han, go:yol, go:pazar, go:arena, go:bahce).
     O alanların çıkışları hâlâ eski meydana (go:meydan) döner; dönüş yönü sistem ajanının işidir. */
  yer(P) { const kapi = P.PX(1045, 285) /* kapının önü: bekçilerin durduğu hiza; kapının tabanı y 262'de */, han = P.PX(560, 520), cesme = P.PX(1240, 760);
    return {
      flyer: true,                                                                          // gökte arada bir ejder süzülür, gölgesi meydana düşer (motorun var olan özelliği)
      bounds: [-9, 14.6, 5.0, kapi[1] + 3.2],                                                 // oyuncu kemerin eşiğine kadar yürür; güneyde korkuluğun 2,4 birim gerisinde durur
      planters: [[2.2, 10.2, 0], [0, 0, 0], [5.6, 10.0, 0], [0, 0, 0], [-6.4, 13.0, 0], [0, 0, 0], [12.0, 18.6, 0], [0, 0, 0], [16.2, 8.6, 0], [0, 0, 0], [-7.8, 27.4, 0], [0, 0, 0], [0.6, 3.4, 0]].filter(p => p[0] || p[1]),   // çiçek öbekleri: motor buralarda kelebek uçurur
      signs: [{ id: 'han', label: 'Han', x: han[0], y: han[1], z: 4.4 }, { id: 'kapi', label: 'Kuzey Kapısı', x: kapi[0], y: kapi[1] + 1, z: 5.2 }, { id: 'pazar', label: 'Pazar', x: 9.6, y: 21.4, z: 4.2 },
        { id: 'arena', label: 'Topçu Arenası', x: -4.5, y: 3.2, z: 2.6 }, { id: 'bahce', label: 'Ejder Bahçesi', x: 9.55, y: 3.2, z: 2.6 }],
      /* kapılardan dönüş: oyuncu çıktığı kapının önünde belirir */
      entry: { hanici: { x: -0.8, y: 11.6, dir: 'down' }, han: { x: -0.8, y: 11.6, dir: 'down' }, kuzeyyolu: { x: kapi[0], y: kapi[1] + 0.8, dir: 'down' }, yol: { x: kapi[0], y: kapi[1] + 0.8, dir: 'down' },
        carsi: { x: 9.6, y: 18.6, dir: 'down' }, pazar: { x: 9.6, y: 18.6, dir: 'down' }, arena: { x: -4.5, y: 6.9, dir: 'up' }, bahce: { x: 9.55, y: 7.4, dir: 'up' } },   // bahçe dönüşü tabelanın (9.4, 6.6) bir adım önünde: noktaya düşen oyuncu kaydırılmaz
      interact: [
        { id: 'cesme', x: cesme[0], y: cesme[1], r: 1.8, z: 2.4, label: 'Etkileşime geç', sub: 'Çeşme', act: 'toast:Su, ejderin ağzından serin serin akıyor.' },
        { id: 'han', x: -0.8, y: 13.4, r: 1.5, z: 2.4, label: 'Hana gir', sub: 'Kervansaray Kıraathanesi', act: 'go:hanici' },
        { id: 'kapi', x: kapi[0], y: kapi[1] + 2.4, r: 1.8, z: 2.6, label: 'Yola çık', sub: 'Kuzey Kapısı', act: 'go:kuzeyyolu' },
        { id: 'pazar', x: 9.6, y: 20.2, r: 1.5, z: 2.4, label: 'Çarşıya gir', sub: 'Bedesten', act: 'go:carsi' },
        { id: 'arena', x: -4.5, y: 5.3, r: 1.5, z: 2.2, label: 'Arenaya in', sub: 'Topçu Arenası', act: 'go:arena' },
        { id: 'bahce', x: 9.55, y: 5.3, r: 1.5, z: 2.2, label: 'Bahçeye in', sub: 'Ejder Bahçesi', act: 'go:bahce' },
        { id: 'pano', x: 9.0, y: 12.6, r: 1.4, z: 2.4, label: 'İlanlara bak', sub: 'İlan panosu', act: 'toast:Panoda bugünün ilanları asılı.' },
        { id: 'kuyu', x: -4.7, y: 24.3, r: 1.4, z: 2.4, label: 'Kuyuya bak', sub: 'Kuyu', act: 'toast:Kovada serin su var.' }],
      rects: [[-40, kapi[0] - 1.1, kapi[1] + 2.6, kapi[1] + 6], [kapi[0] + 1.1, 40, kapi[1] + 2.6, kapi[1] + 6],   // kapının iki yanındaki sur (kemer açıklığı yaklaşık 2 birim)
        [-12, -1.4, 13.0, 19.2]],                                                           // hanın oturduğu yer (ön blok, arka gövde, kanat). Arkasındaki bahçe yürünür: oyuncu oraya geçince motor hanı soldurur
      npcs: [
        Object.assign({ id: 'ms-bekci1', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', dir: 'down', lines: ['Kapı gün batımında kapanır.'] }, P.kisi(926, 285)),
        Object.assign({ id: 'ms-bekci2', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', dir: 'down', lines: ['Kervanlar bu kapıdan geçer.'] }, P.kisi(1172, 285)),
        Object.assign({ id: 'ms-k1', name: 'Gezgin', role: 'Meydan', set: 'avci', dir: 'right', lines: ['Kuzeyden yeni geldim. Yollar çamur.'] }, P.kisi(1425, 450)),
        Object.assign({ id: 'ms-k2', name: 'Usta', role: 'Meydan', set: 'madenci', dir: 'left', lines: ['Bir el tavla atar mıyız?'] }, P.kisi(1478, 450)),
        Object.assign({ id: 'ms-k3', name: 'Hancı', role: 'Han', set: 'temel', dir: 'down', lines: ['Çay demlendi, masalar hazır.'] }, P.kisi(790, 448)),
        /* eski meydanın kayıtlı kişileri (ad, portre, kıyafet ve replikler js/world.js'ten aynen) */
        { id: 'ms-ozan', name: 'Ozan', role: 'NPC', portrait: 'npc-ozan', set: 'avci', x: -4.4, y: 9.2, dir: 'right', notes: true, lines: ['Çeşmenin sesi sazla iyi gider.', 'Bir türkü ister misin, terbiyeci?'] },
        { id: 'ms-baharatci', name: 'Baharatçı', role: 'Pazar', portrait: 'npc-baharatci', set: 'temel', x: 5.6, y: 21.2, dir: 'down', lines: ['Taze geldi, kokusundan belli.', 'Ejderin iştahsızsa bana uğra.'] },
        { id: 'ms-kerim', name: 'Usta Kerim', role: 'Demirci', portrait: 'npc-kerim', set: 'madenci', x: 11.2, y: 23.4, dir: 'down', act: 'panel:uretim', lines: ['Örs sıcak. Dövülecek bir şeyin varsa getir.'] },
        { id: 'ms-yumurtaci', name: 'Yumurtacı', role: 'Ejder Bahçesi', portrait: 'npc-yumurtaci', set: 'bare', x: 11.9, y: 7.6, dir: 'down', lines: ['Bahçede yavrular güneşleniyor.'] },
        { id: 'ms-muhtar', name: 'Muhtar', role: 'NPC', portrait: 'npc-muhtar', set: 'avci', x: 1.5, y: 14, dir: 'right', path: [[1.5, 14.0], [6.6, 16.6], [10.6, 11.4], [6.2, 6.8], [-2.2, 7.0], [-1.2, 11.6]], lines: ['Meydan bugün kalabalık, terbiyeci.'] },
        /* rol adlı kişiler (eski alanlardaki rollerle aynı): hamal pazarla kapı arasında, devriye güney korkuluğu boyunca yürür; bahçıvan kuzeybatı bahçesinde */
        { id: 'ms-hamal', name: 'Hamal', role: 'NPC', set: 'bare', x: 7.6, y: 29.4, dir: 'down', path: [[7.6, 29.4], [5.6, 26.0], [5.4, 19.6], [8.6, 17.6], [5.4, 19.6], [5.6, 26.0]], lines: ['Yol ver terbiyeci, yük ağır.'] },
        { id: 'ms-devriye', name: 'Bekçi', role: 'Merkez Meydan', set: 'muhafiz', x: -5.6, y: 5.9, dir: 'right', path: [[-5.6, 5.9], [3.0, 5.5], [11.2, 6.1], [3.0, 5.5]], lines: ['Meydanda koşmak serbest, kavga yasak.'] },
        { id: 'ms-bahcivan', name: 'Bahçıvan', role: 'Merkez Meydan', set: 'bare', x: -6.0, y: 27.0, dir: 'down', lines: ['Erguvanlar bu yıl erken açtı.'] },
      ] }; },
});
