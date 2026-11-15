/* Ejder Ocağı 2.0 · Bölüm: Pazar (odalı çarşı)
   Yalnız veri. Motor: js/bolum.js. Sözleşme: docs/BOLUM_SOZLESMESI.md. Tasarım notu: docs/bolumler/carsi.md.
   Anahtar kare (hedef görsel): docs/bolumler/kaynak/kv_pazar_v1.png. Çizimler pz-* (ChatGPT, 2026-11-12), ham dosyalar docs/bolumler/kaynak/pz_*.
   Kullanıcı fikri (2026-11-12): çarşının içinde dükkân odaları: demirci, yumurta satıcısı, baharatçı, ejderha satıcısı, bedesten ve açık artırma. Oyuncular dükkân önlerinde
   birbirini görsün diye odalar ayrı sahne DEĞİL, tek salona açılan kemerli gözlerdir. Satıcılar duvar çiziminde yoktur: oyunun kişi sistemiyle dükkânların önünde durur
   (chibi satıcı çizimleri ayrı hattan gelecek). Yeni mekanik yok: dükkânlar var olan ekranları açar ya da kişinin kayıtlı repliğini söyletir.
   Kamera: yakın kip (aşağıda). Her şey dünya ölçüsüyle (x doğu, y kuzey; oyuncu 3, 6'da başlar). Eski Pazar sahnesi (js/scenes2.js, 'pazar') duruyor. */
EO2.bolum.tanimla({
  id: 'carsi', ad: 'Pazar', altAd: 'Bedesten çarşısı', oyuncuY: 6,
  /* KAMERA: "yakın" kip (kullanıcı kararı, 2026-11-12: "merkez hariç yeni bölümler yakın kamera açısı"). Eski sahnelerdeki CAM.yakin'in (eğim 0, yükseklik 3,57, uzaklık 7,
     ufuk ekranın %30'u) bölüm motorundaki eşdeğeri; zemin izdüşümü aynıdır. Merkez Meydan master'ın kamerasında kalır. Işıkların pikselleri bu kameraya göredir. */
  referans: { ufuk: 282, hp: 3.572, odak: 775, oyuncu: [836, 677], kisiBoy: 188 }, yaprak: false,

  nesneler: [
    /* arka duvar: beş kemerli dükkân (soldan sağa: demirci, yumurtacı, baharatçı, ejder satıcısı, müzayede). Duvar tektir; salon iki yanda yan duvarlarla (pz-yan-duvar), üstte kemer sıralarıyla (pz-tavan) kapanır.
       pz-duvar-v2 KİŞİSİZ sürümdür (kullanıcı, 2026-11-12: satıcılar chibi hattından gelecek); pz-duvar-v1'de satıcılar çizimin içindeydi, dosyası duruyor. */
    { ad: 'pz-duvar-v2', x: 3, y: 20, w: 22, carp: 0, ort: false },   // en 22 → yükseklik 6,7 birim: çini kuşağı ve dükkân levhaları ekrana sığar; dükkân ortaları x -5.05, -0.92, 3.04, 6.98, 11.14
    /* YAN DUVARLAR (pz-yan-duvar: üç kör kemer, raflar, halı ruloları; kişisiz). Arka duvarın iki ucundan kameraya doğru açılarak uzanır: sol (-8, 20) → (-12,5, 1,5), sağı aynası.
       Çizim enine daraltılmıştır; çapraz derinlikle (yon) gerçek boyuna (19 birim) açılır, yüksekliği arka duvarla aynıdır (6,64). */
    { ad: 'pz-yan-duvar', x: -10.05, y: 10.75, w: 4.5, yon: 18.5, carp: 0, ort: false }, { ad: 'pz-yan-duvar', x: 16.05, y: 10.75, w: 4.5, yon: -18.5, ayna: 1, carp: 0, ort: false },   // uzak uç arka duvarın kenarına 0,2 birim biner: köşede aralık kalmaz
    /* TONOZ: taş kemer kaburgaları ve sarkan kumaşlar (pz-tavan), üç sıra; her biri o derinlikteki salon eni kadar. Dünyaya bağlıdır: oyuncu yürüdükçe üstten geçer. tavan: true → kamera parçanın altından yükseğe çıkınca (dikey ekran) çizilmez.
       Püsküllerin ucu z 5,2'den aşağı inmez: kamera yüksekliğinin (3,47) üstündedir (kişilerin önüne düşmez) ve kameraya çok yaklaşınca ekranın üstünden çıkar. */
    { ad: 'pz-tavan', x: 3, y: 17.0, w: 24.0, z: 4.5, carp: 0, tavan: true }, { ad: 'pz-tavan', x: 3, y: 12.8, w: 26.2, z: 4.85, ayna: 1, carp: 0, tavan: true }, { ad: 'pz-tavan', x: 3, y: 8.6, w: 28.2, z: 4.82, carp: 0, tavan: true },
    /* duvarların ardı ve üstü: koyu tonoz boşluğu (motorun göğünü ve salon dışındaki zemini örter) */
    { ad: 'pz-bosluk', x: 3, y: 20.3, w: 320, carp: 0, ort: false },
    /* asılı mozaik fenerler (pz-fener-0…3): zincirlerinin ucu ekranın üstünde kalacak yükseklikte (z 4); iki sıra, dükkân aralarının hizasında */
    ...[[-7.0, 0], [-2.98, 1], [1.06, 2], [5.0, 3], [9.06, 0], [13.1, 1]].map(q => ({ ad: 'pz-fener-' + q[1], x: q[0], y: 16.6, w: 1.05, z: 4.0, carp: 0 })),
    ...[[-4.2, 2], [3.0, 3], [10.2, 1]].map(q => ({ ad: 'pz-fener-' + q[1], x: q[0], y: 12.4, w: 1.2, z: 4.0, carp: 0 })),
    ...[[-7.4, 3], [13.4, 0]].map(q => ({ ad: 'pz-fener-' + q[1], x: q[0], y: 8.2, w: 1.3, z: 4.0, carp: 0 })),
    /* salonun iki ucu: sandık, fıçı ve saksı öbekleri (yürüme hattı ortada boş kalır) */
    { ad: 'mg-b23', x: -7.4, y: 15.6, w: 2.8, carp: 1.0 }, { ad: 'mg-c06', x: -9.3, y: 9.4, w: 1.9, carp: 0.8 }, { ad: 'mg-a06', x: 14.2, y: 15.2, w: 1.4, carp: 0.6 }, { ad: 'mg-b23', x: 14.9, y: 9.8, w: 2.6, ayna: 1, carp: 1.0 },
    { ad: 'mg-b28', x: -7.5, y: 18.9, w: 0.85, carp: 0.4 }, { ad: 'mg-b28', x: 13.5, y: 18.9, w: 0.85, ayna: 1, carp: 0.4 },
    /* dükkân önleri: her dükkânın önünde işini anlatan küçük bir eşya */
    { ad: 'mm-h-odun', x: -6.6, y: 18.2, w: 1.2, carp: 0.5 },                          // demirci: ocağın odunu
    { ad: 'mm-h-kova', x: 4.7, y: 18.5, w: 0.95, carp: 0.4 },                          // baharatçı: kovalarda kuru çiçek
    { ad: 'mm-h-elma', x: -2.7, y: 18.3, w: 0.8, carp: 0.3 },                          // yumurtacının önünde devrilmiş sepet
    { ad: 'mm-h-kedi', x: -7.2, y: 15.56, w: 0.62, z: 0.62, carp: 0 },                              // sandıkların üstünde uyuyan kedi
    { ad: 'mm-h-tavla', x: 14.4, y: 11.4, w: 0.95, carp: 0.45 }, { ad: 'mm-h-kitap', x: 15.5, y: 11.9, w: 0.6, carp: 0.3 },   // doğu ucunda bekleyenlerin tavlası
    { ad: 'mg-b31', x: -4.6, y: 7.9, w: 0.55, carp: 0.25 }, { ad: 'mg-b31', x: 10.6, y: 7.9, w: 0.55, carp: 0.25 },   // halının iki başında fenerli babalar
  ],

  golgesiz: ['pz-duvar-v2', 'pz-yan-duvar', 'pz-tavan', 'pz-bosluk', 'pz-fener-0', 'pz-fener-1', 'pz-fener-2', 'pz-fener-3'],
  cizimler: ['pz-duvar-v1', 'mg-c05', 'mg-c09', 'mg-c10', 'mm-h-supurge', 'mm-h-guvercin'],

  /* ışıklar (referans pikseli; oyuncuY 6 ile): beş dükkânın önü ve demirci ocağı */
  isiklar: [[641, 420, 4.2, 1], [800, 420, 4, 0.8], [954, 420, 4, 0.8], [1106, 420, 4, 0.8], [1267, 420, 4.2, 0.9], [595, 419, 3, 0.8]],

  /* zemin: krem-lila taş; halkaların merkezi salonun ortası. İki yuvarlak ejder arması (mm-muhur) anahtar karedeki zemin madalyonlarının yerindedir. */
  zemin: { merkez: [1032, 515], yumusat: 0.6, derz: '#7a6a86',
    tugla: [['#efe2d2', 14], ['#e9dccf', 12], ['#e2d2cc', 12], ['#d9c8c8', 10], ['#d0bfc6', 8], ['#ead9c0', 6], ['#c9b6c2', 4]],
    alanlar: [[-26, 0, 32, 22, 80, 11]],
    resimler: [
      ...[-26, -20, -14, -8, -2, 4, 10, 16, 22, 28].flatMap(x => [0, 6, 12, 18].map(y => ['pz-zemin', x, y, x + 6, y + 6])),   // desenli taş zemin (pz-zemin, tepeden, 6 birimlik karolar); motorun döşemesi altta kalır
      ['pz-hali', -5, 5.5, 11, 8.43],   // girişte uzun kırmızı yolluk (pz-hali, tepeden çizim): oyuncu üstünde başlar
      ['mm-muhur', -4.5, 9.0, 0.1, 13.6], ['mm-muhur', 5.9, 9.0, 10.5, 13.6], ['mm-iz-hasir', 13.5, 10.6, 15.3, 12.3], ['mm-iz-tahil', -2.4, 17.4, -1.6, 18.0]] },

  onPlan: [
    ['mm-sicak', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:soft-light;opacity:.22'],
    ['mm-kenar', 'left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:1'],
  ],

  /* oyun tarafı. Dükkânlar: demirci → Üretim (panel:uretim, eski meydandaki Usta Kerim'le aynı); ejder satıcısı ve müzayede → Pazar ekranı (panel:pazar, eski Pazar'daki
     Tüccar ve Rüstem Ağa ile aynı); yumurtacı ve baharatçı yalnız kayıtlı repliklerini söyler. Kişiler, portreler ve replikler js/world.js ve js/scenes2.js'ten aynen. */
  /* tavan düzlemi (motorun `tavan` alanı): yıldızlı taş kaset dokusu (pz-tavan-doku), arka duvarın tepesinin (6,64) hemen altında; kemer kaburgaları ve kumaşlar ondan sarkar */
  tavan: { ad: 'pz-tavan-doku', z: 6.45, x0: -15, x1: 21, y0: -2, y1: 20.2, karo: 6, isik: 0.78 },

  /* yan duvarların çarpışması: duvar çizgisinin hemen dışına dizili daireler (referans pikseli, iki uç) */
  engeller: { cizgi: [[510.5, 415.2, -2815.5, 1268, 16, 0, 0, 1], [1385.2, 415.2, 6143.6, 1268, 16, 0, 0, 1]] },

  yer() { return {
    indoor: true, light: { fog: 0, clear: [0.075, 0.05, 0.085] },   // iç mekân: gök, güneş ve uzak pus yok; çizimin örtmediği yer koyu tonoz boşluğudur
    bounds: [-11.4, 17.4, 4.4, 18.3],   // salon kameraya doğru genişler; yan duvarların çizgisini engeller.cizgi tutar
    signs: [{ id: 'demirci', label: 'Demirci', x: -5.05, y: 19.6, z: 5.0 }, { id: 'yumurta', label: 'Yumurtacı', x: -0.92, y: 19.6, z: 5.0 }, { id: 'baharat', label: 'Baharatçı', x: 3.04, y: 19.6, z: 5.0 },
      { id: 'ejder', label: 'Ejder Satıcısı', x: 6.98, y: 19.6, z: 5.0 }, { id: 'muzayede', label: 'Müzayede', x: 11.14, y: 19.6, z: 5.0 }],
    interact: [
      { id: 'cikis', x: 3, y: 4.6, r: 1.6, z: 2.4, label: 'Meydana çık', sub: 'Çarşı kapısı', act: 'go:master' },
      { id: 'demirci', x: -4.6, y: 17.7, r: 1.5, z: 2.6, label: 'Örse bak', sub: 'Demirci', act: 'panel:uretim' },
      { id: 'ejder', x: 7.5, y: 17.7, r: 1.5, z: 2.6, label: 'Ejderlere bak', sub: 'Gece Çarşısı', act: 'panel:pazar' },
      { id: 'muzayede', x: 10.7, y: 17.7, r: 1.5, z: 2.6, label: 'İlanlara bak', sub: 'Bedesten ve müzayede', act: 'panel:pazar' },
    ],
    npcs: [
      { id: 'cr-kerim', name: 'Usta Kerim', role: 'Demirci', portrait: 'npc-kerim', set: 'madenci', x: -5.5, y: 19.0, dir: 'down', act: 'panel:uretim', lines: ['Örs sıcak. Dövülecek bir şeyin varsa getir.'] },
      { id: 'cr-yumurtaci', name: 'Yumurtacı', role: 'Ejder Bahçesi', portrait: 'npc-yumurtaci', set: 'bare', x: -1.2, y: 19.0, dir: 'down', lines: ['Bahçede yavrular güneşleniyor.'] },
      { id: 'cr-baharatci', name: 'Baharatçı', role: 'Pazar', portrait: 'npc-baharatci', set: 'temel', x: 3.2, y: 19.0, dir: 'down', lines: ['Taze geldi, kokusundan belli.', 'Ejderin iştahsızsa bana uğra.'] },
      { id: 'cr-tuccar', name: 'Tüccar', role: 'Gece Çarşısı', portrait: 'npc-tuccar', set: 'avci', x: 6.6, y: 19.0, dir: 'down', act: 'panel:pazar', lines: ['Tezgâhım açık, terbiyeci.', 'İyi mal kendini belli eder.'] },
      { id: 'cr-rustem', name: 'Rüstem Ağa', role: 'Bedesten', portrait: 'npc-bedesten', set: 'temel', x: 11.6, y: 19.0, dir: 'down', act: 'panel:pazar', lines: ['Bedesten\'e hoş geldin. İlanlar panoda.', 'Malını getir, fiyatını sen koy.'] },
      { id: 'cr-hamal', name: 'Hamal', role: 'NPC', set: 'bare', x: -5, y: 14.6, dir: 'right', path: [[-5, 14.6], [11, 14.8], [11, 8.4], [-5, 8.2]], lines: ['Yol ver terbiyeci, yük ağır.'] },
    ] }; },
});
