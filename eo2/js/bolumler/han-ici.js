/* Ejder Ocağı 2.0 · Bölüm: Han içi (Kervansaray Kıraathanesi)
   Yalnız veri. Motor: js/bolum.js. Sözleşme: docs/BOLUM_SOZLESMESI.md. Tasarım notu: docs/bolumler/han-ici.md.
   Anahtar kare (hedef görsel): docs/bolumler/kaynak/kv_han_ici_v1.png. Çizimler hn-* (ChatGPT, 2026-11-12), ham dosyalar docs/bolumler/kaynak/hn_*.
   Arka duvar tek geniş çizimdir (solda tezgâh ve fıçılar, ortada şömine, sağda merdiven); kişiler duvar çiziminde yoktur (hn-duvar-v2; ilk sürüm hn-duvar-v1'de hancı çiziliydi, dosyası duruyor), oyunun kişi sistemiyle gelir.
   Yeni mekanik yok: etkileşimler, kişiler ve replikler eski Han sahnesinden (js/scenes.js, 'han') aynen. Kamera: yakın kip (aşağıda). Dünya ölçüsü: x doğu, y kuzey; oyuncu 3, 6'da başlar. */
EO2.bolum.tanimla({
  id: 'hanici', ad: 'Han', altAd: 'Kervansaray Kıraathanesi', oyuncuY: 6,
  /* KAMERA: "yakın" kip (kullanıcı kararı, 2026-11-12: "merkez hariç yeni bölümler yakın kamera açısı"). Eski sahnelerdeki CAM.yakin'in (eğim 0, yükseklik 3,57, uzaklık 7,
     ufuk ekranın %30'u) bölüm motorundaki eşdeğeri; zemin izdüşümü aynıdır. Merkez Meydan master'ın kamerasında kalır. Işıkların pikselleri bu kameraya göredir. */
  referans: { ufuk: 282, hp: 3.572, odak: 775, oyuncu: [836, 677], kisiBoy: 188 }, yaprak: false,

  nesneler: [
    /* arka duvar (en 22 → tezgâh x -4, şömine x 3,1, merdiven x 10) */
    { ad: 'hn-duvar-v2', x: 3, y: 19, w: 22, carp: 0, ort: false },   // arka duvar TEK: yanlarına kopyası dizilmez (kullanıcı, 2026-11-12: "birbirine oturmayan tezgâh"); oda yan duvarlarla kapanır
    /* YAN DUVARLAR (hn-yan-duvar: ahşap karkas ve sıva, üç pencere, sedir, askılık, raf; kişisiz). Arka duvarın iki ucundan kameraya doğru açılarak uzanır: sol (-8, 19) → (-12,5, 1,5), sağı aynası.
       Çizim enine daraltılmıştır; çapraz derinlikle (yon) gerçek boyuna (18 birim) açılır, yüksekliği arka duvarla aynıdır (6,82). */
    { ad: 'hn-yan-duvar-bos', x: -10.05, y: 10.25, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-duvar-bos', x: 16.05, y: 10.25, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    /* KATMANLAR (kullanıcı, 2026-11-12: "Önce katmanlama"): duvarın eşyası duvar çiziminde değil, önünde ayrı durur; oyuncu yürürken duvarla eşya birbirine göre kayar (gerçek paralaks).
       Duvar eşyasızdır (hn-yan-duvar-bos; eşyalı ilk sürüm hn-yan-duvar duruyor). Her katman duvarla aynı boyda ve aynı dilimlerde bir saydam şerittir, yalnız içeri doğru kaydırılmıştır:
       böylece her dilim kendi duvar diliminden hemen sonra çizilir, sıra bozulmaz.
       · hn-yan-sedir: iki sedir (yastıklı), duvardan 0,45 birim içeride, yerde.
       · hn-yan-sedir-ust: yalnız oturma tahtası; duvarla sedirin önü arasına beş ara katman (0,075 aralıkla) dizilir, tahta duvara kadar derinleşir (ince raf gibi durmaz).
       · hn-yan-aski: askılık (pelerin, şapka) ve testili raf, duvardan 0,12 birim içeride, z 1,3–3,9. */
    { ad: 'hn-yan-aski', x: -9.93, y: 10.22, w: 4.5, yon: 17.5, z: 1.3, carp: 0, ort: false }, { ad: 'hn-yan-aski', x: 15.93, y: 10.22, w: 4.5, yon: -17.5, z: 1.3, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir-ust', x: -9.977, y: 10.231, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir-ust', x: 15.977, y: 10.231, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir-ust', x: -9.905, y: 10.213, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir-ust', x: 15.905, y: 10.213, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir-ust', x: -9.832, y: 10.194, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir-ust', x: 15.832, y: 10.194, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir-ust', x: -9.759, y: 10.175, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir-ust', x: 15.759, y: 10.175, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir-ust', x: -9.687, y: 10.157, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir-ust', x: 15.687, y: 10.157, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    { ad: 'hn-yan-sedir', x: -9.61, y: 10.14, w: 4.5, yon: 17.5, carp: 0, ort: false }, { ad: 'hn-yan-sedir', x: 15.61, y: 10.14, w: 4.5, yon: -17.5, ayna: 1, carp: 0, ort: false },
    /* ÇATI MAKASLARI (hn-tavan: kirişler, payandalar, avize, fenerler, kurutulmuş ot demetleri), üç sıra; her biri o derinlikteki salon eni kadar. Dünyaya bağlıdır: oyuncu yürüdükçe üstten geçer. tavan: true → kamera parçanın altından yükseğe çıkınca (dikey ekran) çizilmez.
       Sarkan uçlar z 5,3'ten aşağı inmez: kamera yüksekliğinin (3,47) üstündedir (kişilerin önüne düşmez) ve kameraya çok yaklaşınca ekranın üstünden çıkar (dev ve bulanık görünmez). */
    { ad: 'hn-tavan', x: 3, y: 16.2, w: 24, z: 5.09, carp: 0, tavan: true }, { ad: 'hn-tavan', x: 3, y: 11.8, w: 26.3, z: 5.07, ayna: 1, carp: 0, tavan: true }, { ad: 'hn-tavan', x: 3, y: 7.8, w: 28.4, z: 5.05, carp: 0, tavan: true },
    /* duvarların ardı ve üstü: koyu tavan boşluğu (motorun göğünü ve salon dışındaki zemini örter) */
    { ad: 'hn-bosluk', x: 3, y: 19.3, w: 320, carp: 0, ort: false },
    /* yeni masalar (hn-masa-*, ChatGPT): tavlalı masa iki Tavlacı'nın arasında; yemekli masa girişin solunda, çevresinde tabureler */
    { ad: 'hn-masa-yemek', x: -0.6, y: 9.4, w: 1.9, carp: 0.9 }, { ad: 'hn-tabure', x: -2.0, y: 9.7, w: 0.75, carp: 0.35 }, { ad: 'hn-tabure', x: 0.8, y: 9.9, w: 0.75, ayna: 1, carp: 0.35 }, { ad: 'hn-tabure', x: 5.1, y: 9.9, w: 0.75, carp: 0.35 }, { ad: 'hn-tabure', x: 8.1, y: 9.9, w: 0.75, ayna: 1, carp: 0.35 },
    /* masalar: şöminenin önü boş kalır (ısınma yeri); masalar iki yanda öbeklenir, her birinde bir iz var */
    { ad: 'mg-masa', x: -3.4, y: 12.4, w: 2.6, carp: 1.1, cy: 0.3 }, { ad: 'mg-masa', x: 9.2, y: 13.2, w: 2.6, ayna: 1, carp: 1.1, cy: 0.3 }, { ad: 'mg-masa', x: -4.6, y: 7.4, w: 2.6, ayna: 1, carp: 1.1, cy: 0.3 }, { ad: 'mg-masa', x: 10.4, y: 8.2, w: 2.6, carp: 1.1, cy: 0.3 },
    { ad: 'hn-masa-tavla', x: 6.6, y: 10.5, w: 2.0, carp: 0.9 }, { ad: 'mm-h-kitap', x: -6.6, y: 10.2, w: 0.6, carp: 0.3 }, { ad: 'mm-h-kedi', x: 5.4, y: 17.3, w: 0.66, carp: 0 },   // tavla sandığı; taburede kitaplar; şöminenin önünde uyuyan kedi
    { ad: 'mg-a06', x: -7.5, y: 16.4, w: 1.3, carp: 0.6 }, { ad: 'mg-c06', x: 13.6, y: 15.4, w: 1.8, carp: 0.8 }, { ad: 'mm-h-odun', x: 0.9, y: 18.1, w: 1.2, carp: 0.5 }, { ad: 'mm-h-supurge', x: -7.2, y: 18.3, w: 0.85, carp: 0.3 },
  ],

  golgesiz: ['hn-duvar-v2', 'hn-yan-duvar-bos', 'hn-yan-sedir', 'hn-yan-sedir-ust', 'hn-yan-aski', 'hn-tavan', 'hn-bosluk'],
  cizimler: ['hn-duvar-v1', 'hn-yan-duvar', 'mg-b23', 'mg-b28', 'mm-h-kova', 'mm-h-elma'],

  /* ışıklar (referans pikseli; oyuncuY 6 ile): şömine, tezgâh, merdiven feneri */
  isiklar: [[961, 426, 7.5, 1.4], [675, 426, 4.2, 0.9], [1218, 426, 4.2, 0.8]],

  /* zemin: tahta döşeme dokusu (hn-zemin) bütün salona serilir; motorun döşemesi altta kalır. Kilimler onun üstüne serilir. İç mekânda bagla kullanılmaz (dipte ot çıkmasın). */
  zemin: { merkez: [961, 426], yumusat: 0.7, derz: '#5a3a24',
    tugla: [['#b88552', 12], ['#ad7a49', 12], ['#c08e58', 10], ['#a37044', 10], ['#b47f4d', 8]],
    alanlar: [[-26, 0, 32, 21, 80, 11]],
    resimler: [
      ...[-26, -21, -16, -11, -6, -1, 4, 9, 14, 19, 24, 29].flatMap(x => [0, 5, 10, 15, 20].map(y => ['hn-zemin', x, y, x + 5, y + 5])),   // tahta döşeme: 5 birimlik karolar (hn-zemin, tepeden)
      ['hn-kilim', 0, 5.0, 6, 7.96], ['hn-kilim', 1.2, 15.0, 5.0, 16.88], ['hn-kilim', -5.1, 11.5, -1.7, 13.18], ['hn-kilim', 7.5, 12.3, 10.9, 13.98],   // kilimler: girişte, şöminenin önünde ve iki masanın altında
    ] },

  onPlan: [
    ['mm-sicak', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:soft-light;opacity:.28'],
    ['mm-kenar', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:1'],
  ],

  /* tavan düzlemi (motorun `tavan` alanı): tahta ve kirişli düz doku (hn-tavan-doku), arka duvarın tepesinin (6,82) hemen altında; makaslar ondan sarkar */
  tavan: { ad: 'hn-tavan-doku', z: 6.6, x0: -15, x1: 21, y0: -2, y1: 19.2, karo: 6, isik: 0.72 },

  /* yan duvarların çarpışması: duvar çizgisinin hemen dışına dizili daireler (referans pikseli, iki uç) */
  engeller: { cizgi: [[506.6, 422.3, -2819.5, 1295.2, 16, 0, 0, 1], [1401, 422.3, 6193.4, 1295.2, 16, 0, 0, 1]] },   // daireler çizginin 0,4 birim dışında: oyuncu sedirin önünde durur (duvara 0,9 birim)

  yer() { return {
    indoor: true, light: { fog: 0, clear: [0.085, 0.05, 0.045] },   // iç mekân: gök, güneş ve uzak pus yok; çizimin örtmediği yer koyu tavan boşluğudur
    bounds: [-11.2, 17.2, 4.4, 17.4],   // salon kameraya doğru genişler; yan duvarların çizgisini engeller.cizgi tutar
    signs: [],
    interact: [
      { id: 'cikis', x: 3, y: 4.6, r: 1.6, z: 2.4, label: 'Meydana çık', sub: 'Kapı', act: 'go:master' },
      { id: 'masa1', x: -3.4, y: 11.4, r: 1.5, z: 1.9, label: 'Masaya bak', sub: 'Tavla', act: 'panel:han' },
      { id: 'masa2', x: 9.2, y: 12.2, r: 1.5, z: 1.9, label: 'Masaya bak', sub: 'Kor 21', act: 'panel:han' },
      { id: 'ocak', x: 3.1, y: 16.9, r: 2.0, z: 3.0, label: 'Isın', sub: 'Ocak', act: 'toast:Ocağın koru yüzünü ısıttı.' },
    ],
    npcs: [
      { id: 'hi-hanci', name: 'Hancı', role: 'Han', set: 'madenci', x: -4.2, y: 17.6, dir: 'down', lines: ['Hoş geldin terbiyeci. Ocak yanıyor, masa boş.', 'Bugün tavlada zar kimseye gülmüyor.'] },
      { id: 'hi-tavlaci1', name: 'Tavlacı', role: 'NPC', set: 'avci', x: 5.0, y: 10.9, dir: 'right', lines: ['Şeş beş! Gördün mü?', 'Zar tutmuyorum, yemin ederim.'] },
      { id: 'hi-tavlaci2', name: 'Tavlacı', role: 'NPC', set: 'temel', x: 8.2, y: 10.9, dir: 'left', lines: ['Yine mars olacağım galiba.', 'Bir el daha, bu sefer benim.'] },
    ] }; },
});
