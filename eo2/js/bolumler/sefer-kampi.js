/* Ejder Ocağı 2.0 · Bölüm: Sefer Kampı (Zümrüt Saray'ın kapısı önü)
   Yalnız veri. Motor: js/bolum.js. Ortak zindan seferinin (js/zindan_ortak.js) bekleme alanıdır: grup aşamalar arasında buraya döner,
   ateşin başında toplanır, sohbet eder, hazır olan Zümrüt Kapı'ya gidip "hazırım" der. Her grubun kampı kendine aittir
   (sunucu 'kamp' alanını ortak odaya göre öbekler); başka gruplar görünmez.
   Arka plan Sırça Saray kapı çiziminin üst bölümüdür (zs-magara, tools/kamp_arka.mjs ile kırpıldı): solda eski geçit, ortada şelaleler,
   sağda mühürlü Zümrüt Kapı. Eşyalar eldeki çizimlerdir: kamp ateşi, çadırlar, mangallar, sandık, fıçı, bank, kilim.
   Kamera: "yakın" kip (Han içi ile aynı ölçüler). Dünya ölçüsü: x doğu, y kuzey; oyuncu 3, 6'da başlar. */
EO2.bolum.tanimla({
  id: 'kamp', ad: 'Sefer Kampı', altAd: 'Zümrüt Saray\'ın kapısı önü', oyuncuY: 6,
  referans: { ufuk: 282, hp: 3.572, odak: 775, oyuncu: [836, 677], kisiBoy: 188 }, yaprak: false,

  nesneler: [
    { ad: 'zs-magara', x: 3, y: 19, w: 34, carp: 0, ort: false },                       // mağara ve Zümrüt Kapı: tek geniş arka plan
    { ad: 'hn-bosluk', x: 3, y: 19.3, w: 320, carp: 0, ort: false },                    // arkası ve üstü: karanlık mağara boşluğu
    /* ateş başı: grubun toplandığı yer */
    { ad: 'ky-ates', x: 3.1, y: 12.6, w: 1.9, carp: 0.8 },
    { ad: 'mb-bank-000', x: 3.1, y: 14.6, w: 1.9, carp: 0.7 }, { ad: 'mb-bank-090', x: 0.4, y: 12.4, w: 1.2, carp: 0.6 }, { ad: 'mb-bank-090', x: 5.8, y: 12.4, w: 1.2, ayna: 1, carp: 0.6 },
    /* çadırlar ve erzak: sol yanda konak yeri */
    { ad: 'ky-cadir', x: -6.6, y: 15.6, w: 4.6, carp: 1.7, cy: 0.6 }, { ad: 'ky-cadir', x: -8.4, y: 11.2, w: 4.2, ayna: 1, carp: 1.6, cy: 0.6 },
    { ad: 'sandik', x: -4.0, y: 13.4, w: 1.15, carp: 0.5 }, { ad: 'fici', x: -5.0, y: 12.9, w: 0.85, carp: 0.4 }, { ad: 'fici', x: -3.2, y: 16.6, w: 0.85, carp: 0.4 }, { ad: 'mm-h-odun', x: 1.2, y: 15.4, w: 1.2, carp: 0.5 },
    /* kapıya çıkan yol: iki yanında mangallar */
    { ad: 'mangal', x: 11.2, y: 15.6, w: 1.1, carp: 0.45 }, { ad: 'mangal', x: 15.4, y: 15.6, w: 1.1, carp: 0.45 }, { ad: 'mangal', x: -1.6, y: 17.4, w: 1.1, carp: 0.45 },
    { ad: 'mm-h-kova', x: -5.6, y: 9.6, w: 0.8, carp: 0.3 },
  ],
  golgesiz: ['zs-magara', 'hn-bosluk'],

  /* ışıklar (referans pikseli; oyuncuY 6): ateş, kapı yolu, çadır önü */
  isiklar: [[961, 520, 7.2, 1.5], [1300, 440, 5.2, 1.0], [640, 470, 4.2, 0.8]],
  isik: { ik: 0.62, sicak: 0.5, ton: [0.78, 0.9, 0.92] },

  /* zemin: koyu mağara taşı döşeme; ateşin çevresinde ve çadır önünde kilimler */
  zemin: { merkez: [961, 520], yumusat: 0.7, derz: '#221a17',
    tugla: [['#5c4a3f', 12], ['#514137', 12], ['#675347', 10], ['#48392f', 10], ['#5a4f48', 8]],
    alanlar: [[-26, 0, 32, 21, 80, 11]],
    resimler: [['hn-kilim', 0.6, 9.6, 5.6, 11.26], ['hn-kilim', -7.4, 12.6, -4.0, 13.72]] },

  onPlan: [
    ['mm-kenar', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:1'],
  ],

  yer() { return {
    indoor: true, light: { fog: 0, clear: [0.03, 0.05, 0.06] },
    bounds: [-10.6, 17.0, 4.4, 17.2],
    signs: [],
    interact: [
      { id: 'kapi', x: 13.3, y: 16.8, r: 2.6, z: 3.2, label: 'Zümrüt Kapı', sub: 'Aşamaya hazırım', act: 'zindan:hazir' },
      { id: 'ates', x: 3.1, y: 12.0, r: 1.9, z: 2.2, label: 'Ateşin başına otur', sub: 'Sefer durumu', act: 'zindan:durum' },
      { id: 'sandik', x: -4.0, y: 12.6, r: 1.5, z: 1.8, label: 'Ganimet sandığı', sub: 'Bu seferde topladıkların', act: 'zindan:ganimet' },
      { id: 'cikis', x: 3, y: 4.6, r: 1.6, z: 2.4, label: 'Seferden ayrıl', sub: 'Mağara ağzı', act: 'zindan:ayril' },
    ],
    npcs: [
      { id: 'kp-bekci', name: 'Öncü', role: 'Kamp', set: 'avci', x: 9.4, y: 15.9, dir: 'down', lines: ['Köprüde yılanlar iki yandan gelir. Önce yaklaşanı vurun.', 'Defilede zemin kırılmaz; Şahmeran sağ uçtaki yükseltide bekler.', 'Hazır olan Zümrüt Kapı\'ya yürüsün. Hepiniz hazır olunca mühür açılır.'] },
    ] }; },
});
