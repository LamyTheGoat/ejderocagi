/* Ejder Ocağı 2.0 · Bölüm: Kuzey Yolu (Kuzey Kapısı'nın dışı)
   Yalnız veri. Motor: js/bolum.js. Sözleşme: docs/BOLUM_SOZLESMESI.md. Tasarım notu: docs/bolumler/kuzey-yolu.md.
   Anahtar kare (hedef görsel): docs/bolumler/kaynak/kv_kuzey_yolu_v1.png. Çizimler ky-* (ChatGPT, 2026-11-12; anahtar kare referansıyla), ham dosyalar docs/bolumler/kaynak/ky_*.
   Kamera: yakın kip (aşağıda). Bu bölümün master pikseli yoktur: her şey dünya ölçüsüyle yazılır (x doğu, y kuzey; oyuncu 0, 5'te başlar, kuzeye bakar).
   Var olan sisteme yer açar: eski Kuzey Yolu sahnesindeki (js/scenes.js, kimlik 'yol') etkileşimler ve kişiler aynen taşındı; yeni mekanik yoktur. */
EO2.bolum.tanimla({
  id: 'kuzeyyolu', ad: 'Kuzey Yolu', altAd: 'Kervan kampı ve taş köprü', oyuncuY: 5,
  /* KAMERA: "yakın" kip (kullanıcı kararı, 2026-11-12: "merkez hariç yeni bölümler yakın kamera açısı"). Eski sahnelerdeki CAM.yakin'in (eğim 0, yükseklik 3,57, uzaklık 7,
     ufuk ekranın %30'u) bölüm motorundaki eşdeğeri; zemin izdüşümü aynıdır. Merkez Meydan master'ın kamerasında kalır. Işıkların pikselleri bu kameraya göredir. */
  referans: { ufuk: 282, hp: 3.572, odak: 775, oyuncu: [836, 677], kisiBoy: 188 },

  nesneler: [
    /* A · yol ağzı (solda): büyük ağacın altında bank ve yön tabelası. Oyuncunun ilk gördüğü durak; tabela seferi anlatır. */
    { ad: 'mm-agac', x: -7.4, y: 13.6, w: 8.6, carp: 0.9, bagla: true }, { ad: 'mm-bank', x: -4.7, y: 11.3, w: 1.8, carp: 0.8, bagla: true }, { ad: 'mm-tabela', x: -3.3, y: 9.1, w: 1.3, carp: 0.35, bagla: true },
    { ad: 'mg-b16', x: -6.3, y: 8.0, w: 1.9, carp: 0.6, bagla: true }, { ad: 'mg-b06', x: -5.6, y: 6.2, w: 1.6, carp: 0.4, bagla: true }, { ad: 'mm-h-kitap', x: -5.9, y: 11.0, w: 0.6, carp: 0.3, bagla: true },
    /* B · yılankavi çit: dik çizimle kuzey-güney çit kurulamaz; çit parçaları çapraz derinlikle (yon) sağa sola kırılarak kuzeye gider (ky-cit-22: çitin enine daraltılmış kopyası).
       Sağ çit kampın önünde biter (kamp yola açıktır); köprüden sonra iki yanda sürer. */
    ...[3, 4, 5, 6, 7].map(i => ({ ad: 'ky-cit-22', x: -3.4, y: 8.56 + i * 3.12, w: 0.704, yon: i % 2 ? -3.12 : 3.12, carp: 0.5, cy: 0 })),
    ...[0, 1, 2, 3].map(i => ({ ad: 'ky-cit-22', x: 3.4, y: 8.56 + i * 3.12, w: 0.704, yon: i % 2 ? 3.12 : -3.12, ayna: 1, carp: 0.5, cy: 0 })),
    ...[0, 1, 2, 3, 4, 5].flatMap(i => [{ ad: 'ky-cit-22', x: -3.4, y: 41.6 + i * 3.12, w: 0.704, yon: i % 2 ? -3.12 : 3.12, carp: 0.5 }, { ad: 'ky-cit-22', x: 3.4, y: 41.6 + i * 3.12, w: 0.704, yon: i % 2 ? 3.12 : -3.12, ayna: 1, carp: 0.5 }]),
    /* C · kervan kampı (sağda, y 21–31): araba, ateş, iki çadır, sandık ve fıçılar. Ateşin çevresi boş: kervancı ve oyuncu orada durur. */
    { ad: 'ky-cadir', x: 9.6, y: 28.0, w: 4.8, carp: 1.8, cy: 0.6, bagla: true }, { ad: 'ky-cadir', x: 5.5, y: 30.4, w: 4.2, ayna: 1, carp: 1.6, cy: 0.6, bagla: true },
    { ad: 'ky-araba', x: 9.4, y: 22.6, w: 4.8, carp: 1.7, cy: 0.4, bagla: true }, { ad: 'ky-ates', x: 5.6, y: 25.2, w: 1.6, carp: 0.7, bagla: true },
    { ad: 'mg-b23', x: 11.6, y: 25.6, w: 2.4, carp: 0.9, bagla: true }, { ad: 'mg-a06', x: 3.9, y: 28.6, w: 1.2, carp: 0.6, bagla: true }, { ad: 'mm-h-odun', x: 4.2, y: 23.9, w: 1.3, carp: 0.5, bagla: true },
    { ad: 'mg-c09', x: 12.4, y: 29.4, w: 0.8, carp: 0.25, bagla: true }, { ad: 'mm-h-tavla', x: 7.3, y: 26.5, w: 0.9, carp: 0.4, bagla: true }, { ad: 'mm-h-kedi', x: 8.3, y: 26.9, w: 0.6, carp: 0, bagla: true },
    { ad: 'ky-cit', x: 12.6, y: 20.4, w: 3.2, carp: 0.6 }, { ad: 'ky-cit', x: 13.4, y: 31.6, w: 3.2, ayna: 1, carp: 0.6 },
    /* D · taş köprü (y 34,4–38,6): dört köşede fenerli, sancaklı ayak; dere zemine serilidir (zemin.resimler) */
    { ad: 'ky-kopru', x: -3.3, y: 34.4, w: 2.4, ayna: 1, carp: 0.7, bagla: true }, { ad: 'ky-kopru', x: 3.3, y: 34.4, w: 2.4, carp: 0.7, bagla: true },
    { ad: 'ky-kopru', x: -3.3, y: 38.8, w: 2.4, ayna: 1, carp: 0.7 }, { ad: 'ky-kopru', x: 3.3, y: 38.8, w: 2.4, carp: 0.7 },
    /* E · çayır: yolun iki yanında ağaç, çalı, kaya; kenarlara doğru sıklaşır ve alanı kapatır */
    { ad: 'ms-erguvan', x: 7.6, y: 12.6, w: 4.4, carp: 0.5, bagla: true }, { ad: 'mm-cam', x: 11.6, y: 15.6, w: 3.2, carp: 0.4, bagla: true }, { ad: 'mm-agac', x: 15.5, y: 10.5, w: 6.6, ayna: 1, carp: 0.6, bagla: true },
    { ad: 'mm-agac', x: 16.6, y: 24.5, w: 6.2, carp: 0.6, bagla: true }, { ad: 'ms-erguvan', x: 15.4, y: 33.2, w: 4.6, ayna: 1, carp: 0.5, bagla: true }, { ad: 'mm-cam', x: 13.2, y: 37.6, w: 3.0, carp: 0.4, bagla: true },
    { ad: 'mm-agac', x: -13.6, y: 22.4, w: 6.8, carp: 0.6, bagla: true }, { ad: 'ms-erguvan', x: -9.4, y: 27.6, w: 4.4, carp: 0.5, bagla: true }, { ad: 'mm-cam', x: -12.2, y: 31.4, w: 3.2, ayna: 1, carp: 0.4, bagla: true },
    { ad: 'mm-agac', x: -15.4, y: 37.8, w: 6.4, ayna: 1, carp: 0.6, bagla: true }, { ad: 'mm-agac', x: -9.6, y: 46.5, w: 6.6, carp: 0.6, bagla: true }, { ad: 'ms-erguvan', x: 9.2, y: 45.4, w: 4.6, carp: 0.5, bagla: true },
    { ad: 'mm-agac', x: 14.6, y: 50.6, w: 6.8, ayna: 1, carp: 0.6, bagla: true }, { ad: 'mm-cam', x: -6.4, y: 54.2, w: 3.4, carp: 0.4, bagla: true }, { ad: 'mm-agac', x: 6.6, y: 58.6, w: 7.0, carp: 0.6, bagla: true }, { ad: 'mm-agac', x: -12.4, y: 59.4, w: 7.4, ayna: 1, carp: 0.6, bagla: true },
    { ad: 'ms-cali0', x: 5.4, y: 7.6, w: 2.2, carp: 0.6, bagla: true }, { ad: 'mg-b14', x: 6.6, y: 16.6, w: 1.4, carp: 0.4, bagla: true }, { ad: 'mg-b18', x: 4.6, y: 19.4, w: 1.5, carp: 0.5, bagla: true }, { ad: 'mg-b08', x: -5.4, y: 19.6, w: 1.5, carp: 0.4, bagla: true },
    { ad: 'mg-b16', x: -6.6, y: 24.6, w: 1.8, carp: 0.6, bagla: true }, { ad: 'mg-b06', x: -4.9, y: 29.4, w: 1.6, carp: 0.4, bagla: true }, { ad: 'ms-cali0', x: -7.6, y: 33.4, w: 2.2, ayna: 1, carp: 0.6, bagla: true }, { ad: 'mg-b18', x: 6.4, y: 33.2, w: 1.5, carp: 0.5, bagla: true },
    { ad: 'mg-b14', x: -5.6, y: 41.4, w: 1.4, carp: 0.4, bagla: true }, { ad: 'mg-b16', x: 5.8, y: 43.0, w: 1.9, ayna: 1, carp: 0.6, bagla: true }, { ad: 'mg-b06', x: 5.2, y: 50.4, w: 1.6, carp: 0.4, bagla: true }, { ad: 'mg-b08', x: -5.2, y: 49.6, w: 1.5, carp: 0.4, bagla: true },
    { ad: 'mm-h-guvercin', x: 1.4, y: 14.4, w: 0.95, carp: 0 },
    /* H · orman kenarı: çayırın kuzey ucunu kapatan ağaç sırası; yol aralarından geçip ufka gider */
    ...[-74, -68.2, -62.6, -57, -51.8, -46.4, -41, -36.2, -31, -25.5, -20, -14.6, -9.4, -4.6, 4.8, 9.8, 15.2, 20.6, 26, 31.4, 36.8, 42, 47.6, 53, 58.4, 64, 69.4, 75].map((x, i) => ({ ad: i % 3 === 1 ? 'mm-cam' : 'mm-agac', x, y: 61.4 + (i % 2) * 1.3, w: i % 3 === 1 ? 3.6 : 7.2, ayna: i % 2, carp: 0 })),
    /* G · ufuk: tepeler, şato ve gün batımı (ky-ufuk). Yakın kamerada ufuk ekranın üst üçte birindedir ve görüş geniştir; görsel çok uzakta (y 260) ve çok büyük durur ki
       oyuncu yürürken büyümesin, geniş ekranda kenarı görünmesin. Boyanan çimden hemen önce çizilir; çim alt bölümünü örter; z eksi → görselin şatolu orta kuşağı ufuk çizgisinin üstünde kalır. */
    { ad: 'ky-ufuk', x: -32, y: 260, w: 820, z: -125.3, key: 701, carp: 0, ort: false },   // sıra anahtarı 260 + 701 = 961: boyanan zeminden (960) hemen önce, motorun düz zemininden sonra çizilir
    /* F · güney (kameranın arkası): kasabanın suru ve kapısı oyuncunun arkasındadır; ekranın altından ağaç tepeleri girer */
    { ad: 'mm-agac', x: -10.5, y: 1.2, w: 6.4, z: -2.6, carp: 0 }, { ad: 'mm-agac', x: 10.2, y: 1.0, w: 6.4, z: -2.8, ayna: 1, carp: 0 },
  ],

  cizimler: ['ky-cit', 'mg-a04', 'mg-c10', 'mm-h-kova', 'mm-h-supurge', 'mm-h-elma'],
  golgesiz: ['ky-cit-22', 'ky-cit', 'ky-ufuk'],

  /* ışıklar (referans pikseli; oyuncuY 5 ile hesaplandı): kamp ateşi, çadırın içi, yön tabelasının feneri, köprü fenerleri */
  isiklar: [[999, 386, 5.2, 1.2], [1089, 376, 3.5, 0.7], [603, 534, 3.8, 0.8], [764, 360, 3.4, 0.7], [908, 360, 3.4, 0.7]],

  /* zemin: çim dokusu (ky-cim, tepeden, 6 birimlik karolar) bütün alana döşenir; üstüne yol (ky-yol, 4,4 birim en) uç uca; dere köprünün altından doğu-batı akar.
     Motorun tuğla döşemesi altta kalır ve görünmez. */
  zemin: { merkez: [836, 677],
    alanlar: [[-24, -4, 24, 26, 80, 11], [-36, 26, 36, 64, 36, 23]],
    resimler: [
      ...[-24, -18, -12, -6, 0, 6, 12, 18].flatMap(x => [-4, 2, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62].map(y => ['ky-cim', x, y, x + 6, y + 6])),
      ...[-6, 6, 18, 30, 42, 54].map(y => ['ky-cim', -36, y, -24, y + 12]), ...[-6, 6, 18, 30, 42, 54].map(y => ['ky-cim', 24, y, 36, y + 12]),
      ...[-39, -13, 13].map(x => ['ky-dere', x, 34.9, x + 26, 38.1]),   // dere yoldan ÖNCE serilir: yol üstünden geçer, köprünün tabliyesi olur
      ...[0, 1, 2, 3, 4, 5].map(i => ['ky-yol', -2.2, -4 + i * 11.36, 2.2, -4 + (i + 1) * 11.36]),
      ['mm-iz-teker', -0.9, 6.4, 0.5, 8.2], ['mm-iz-teker', -0.2, 17.6, 1.2, 19.4], ['mm-iz-teker', 1.6, 21.4, 3.2, 23.4], ['mm-iz-su', -1.6, 30.6, -0.2, 31.5], ['mm-iz-yaprak-pembe', 6.8, 11.4, 8.3, 12.7], ['mm-iz-hasir', 6.5, 25.9, 8.2, 27.5],
    ] },

  onPlan: [
    ['mm-sicak', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:soft-light;opacity:.1'],
    ['mm-kenar', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:.8'],
    ['mm-agac', 'left:-30%;top:-8%;height:84vh;width:auto;filter:blur(2px) brightness(.5) saturate(.95);transform:translateX(calc(var(--kx,0)*.6px))'],
    ['ms-cali0', 'left:-12%;bottom:-25%;height:40vh;width:auto;filter:blur(2px) brightness(.8) saturate(1.05);transform:translateX(calc(var(--kx,0)*1px))'],
    ['mm-agac', 'right:-20%;bottom:-60%;height:92vh;width:auto;filter:blur(2.5px) brightness(.5) saturate(.95);transform:translateX(calc(var(--kx,0)*1px))'],
    ['ms-cali1', 'right:8%;bottom:-21%;height:19vh;width:auto;filter:blur(1.5px) brightness(.8) saturate(1.05);transform:translateX(calc(var(--kx,0)*1.1px)) scaleX(-1)'],
  ],

  /* oyun tarafı: etkileşimler, kişiler ve replikler eski Kuzey Yolu sahnesinden (js/scenes.js, 'yol') aynen. Çıkış yeni Meydan'a (go:master) döner. */
  yer() { return {
    light: { fog: 0.34 },   // uzak pus: motorun varsayılanı (0,86) ufuk görselini beyaza boğuyordu; şato ve gün batımı okunur, orman kenarı yine hafif puslu
    flyer: true,
    bounds: [-6.4, 12.6, 3.6, 57],
    planters: [[5.4, 7.6, 0], [0, 0, 0], [6.6, 16.6, 0], [0, 0, 0], [-5.4, 19.6, 0], [0, 0, 0], [-4.9, 29.4, 0], [0, 0, 0], [5.2, 50.4, 0]].filter(p => p[0] || p[1]),
    signs: [{ id: 'kamp', label: 'Kervan Kampı', x: 7.6, y: 27, z: 4.8 }],
    interact: [
      { id: 'cikis', x: 0, y: 4.0, r: 1.6, z: 2.4, label: 'Meydana dön', sub: 'Kuzey Kapısı', act: 'go:master' },
      { id: 'tabela', x: -3.0, y: 8.5, r: 1.5, z: 2.9, label: 'Tabelayı oku', sub: 'Yol tabelası', act: 'panel:kuzey' },
      { id: 'kamp', x: 5.6, y: 23.6, r: 1.7, z: 2.6, label: 'Sefere çık', sub: 'Kervan Kampı', act: 'panel:kuzey' },
      { id: 'dere', x: 0, y: 36.6, r: 1.6, z: 1.6, label: 'Dereye bak', sub: 'Taş köprü', act: 'toast:Derenin suyu Ejder Bahçesi\'ndeki gölete iniyor.' },
    ],
    rects: [[-40, -3.8, 33.6, 39.6], [3.8, 40, 33.6, 39.6]],   // derenin iki yakası: köprü dışında geçilmez
    npcs: [
      { id: 'ky-kervanci', name: 'Kervancı', role: 'Kervan Kampı', set: 'avci', x: 7.0, y: 24.4, dir: 'down', act: 'panel:kervan', lines: ['Kervan şafakta yola çıkar.', 'Seferden dönen terbiyeciler burada soluklanır.'] },
      { id: 'ky-devriye', name: 'Bekçi', role: 'Kuzey Yolu', set: 'muhafiz', x: -1.2, y: 10, dir: 'up', path: [[-1.2, 10], [-1.2, 31], [1.2, 31], [1.2, 10]], lines: ['Yol açık. Dereyi köprüden geç.'] },
    ] }; },
});
