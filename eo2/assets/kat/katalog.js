/* Ejder Ocağı 2.0 · KAT KATALOĞU (window.EO2_KAT) · 2026-11-22
   Kullanıcı (Mehmet, 2026-11-22): "Layerlar zırhlar setler kostümler iyice karıştı orada reliable bir sistem kurmamız lazım. Tek bir saç modeli eklerken bile çok zorlanıyoruz."
   Karakterin başa bağlı parçaları (saç, yüz, kulak; sonra başlık ve yüz aksesuarı) BU DOSYADAN kurulur. Kurucu: js/kat.js (EO2.kat).
   Gövde (zırh seti) şimdilik eski sayfadır: assets/gorunus/govde_<set>.webp (53 kare). Savaş ekranı ve NPC'ler henüz eski yoldan çizilir (Faz 4).

   ŞABLON: bir slottaki her dosya aynı hücre ölçüsünde çizilir. ax, ay: karakterin ayak noktasının hücre içindeki yeri (piksel).
     Hücreler soldan sağa "hucre" sırasıyla dizilir. Parçanın yürüyüş hücresi yoksa duruş hücresi "iz" kadar kaydırılarak yürür;
     sevinç hücresi yoksa duruş hücresi kullanılır. Böylece yeni bir parça için 3 hücre (önden, arkadan, yandan) yeter.
   RENK: saç gri tonlu çizilir; renk rampadan gelir (kat/rampa.png, satır başına 256 ton: griliği renge çevirir).
     "Özgün" renk rampaya uymaz (uçlarda mor, parıltıda turuncu: renk konuma bağlı): her stilin ayrıca renkli bir "ozgun" sayfası vardır.
     Göz rengi rampaya uymuyor: yüz dosyasında her göz rengi ayrı satırdır (gozRenk.satir).
   SIRA: katmanlar alttan üste "sira" dizisiyle çizilir. Bir yön başka sıra isterse "siraYon" ona yazılır (ör. arkadan bakışta pelerin önde).
     Bir parça başka bir katmanı gizleyebilir: gizler: ['sacOn'] (ör. saçı örten başlık).

   YENİ SAÇ EKLEMEK
     1. sablon.sac ölçüsünde (199 × 245, ayak noktası 114, 374) bir sayfa çiz: üst satır arkada kalan saç, alt satır öndeki saç
        (arka kısmı yoksa tek satır). Özgün rengini de istiyorsan aynı düzende renkli bir sayfa (sac_<ad>_ozgun.webp). Hücreler: önden, arkadan, yandan duruş (+ istersen yürüyüş hücreleri, sıra "hucre" dizisindeki gibi).
        Gri tonlu çiz: açık yerler açık renk, koyu yerler koyu renk olur. Dosyayı assets/kat/sac_<ad>.webp olarak koy.
     2. Aşağıda "sac" altına tek satır yaz: <ad>: { ad: 'Görünen ad', dosya: 'kat/sac_<ad>.webp', ozgun: 'kat/sac_<ad>_ozgun.webp', parca: ['sacArka', 'sacOn'] },
        yalnız 3 hücre çizdiysen hucre: ['down_durus', 'up_durus', 'right_durus'] ekle.
     3. node --test tests/kat.test.js (dosya, ölçü, hücre denetimi) ve eo2/tools/kat_vitrini.html (her yönde, her renkte göz kontrolü).
   YENİ SAÇ RENGİ: rampa.png'ye bir satır ekle (256 ton; rampa.satir'a adını yaz), sacRenk altına tek satır yaz (ad, rampa, ornek).
   Bu dosya hem oyunda hem testte (Node) yüklenir. Dönüşüm aracı: eo2/tools/kat_donustur.py (tek seferlik, eski 53 karelik sayfalardan). */
(function (kok) {
  'use strict';
  const HUCRE6 = ['down_durus', 'down_yuru', 'up_durus', 'up_yuru', 'right_durus', 'right_yuru'];
  kok.EO2_KAT = {
    surum: 1,
    sablon: {
      sac: { cw: 199, ch: 245, ax: 114, ay: 374, hucre: HUCRE6 },
      yuz: { cw: 128, ch: 124, ax: 72, ay: 330, hucre: HUCRE6.concat(['down_sevinc', 'right_sevinc']) },
      kulak: { cw: 127, ch: 48, ax: 70, ay: 272, hucre: HUCRE6 },
      baslik: { cw: 172, ch: 256, ax: 96, ay: 365, hucre: HUCRE6 },
      /* başlık takılıyken saçın görünen kısmı: başlık başına bir sayfa, satır = stil x parça (stiller sırasıyla, her stilde parca sırasıyla) */
      sacAlti: { cw: 197, ch: 244, ax: 113, ay: 374, hucre: HUCRE6, stiller: ['orig', 'kisa', 'topuz', 'atkuyrugu', 'yan', 'uzun', 'ikiz', 'kut', 'orgu'], parca: ['sacArka', 'sacOn', 'sacUst'] }
    },
    /* yürüyüş hücresi olmayan parçanın duruş hücresine göre kayması (piksel, ölçüm 2026-11-22: saç, yüz ve kulak aynı kaymayı verir) */
    iz: { down: [0, 0.62], up: [0, 2.62], right: [0, -10.12] },
    /* katman sırası, alttan üste. Henüz çizimi olmayan slotlar (pelerin, yüz aksesuarı) yerlerini tutar.
       baslikArka: başlığın gövde arkasında kalan ucu · yama: kapüşonun kulak yerini örten ten · kulakUst: başlığın üstündeki kulak · sacUst: arkadan açık başlığın üstünde kalan topuz */
    sira: ['pelerinArka', 'sacArka', 'baslikArka', 'govde', 'yuz', 'yama', 'yuzAks', 'sacOn', 'kulak', 'baslik', 'kulakUst', 'sacUst', 'pelerinOn'],
    siraYon: {},
    rampa: { dosya: 'kat/rampa.png', satir: { black: 0, blond: 1, white: 2, blue: 3, orange: 4, green: 5, pink: 6 } },

    /* saç stilleri. dosya: gri ana çizim · ozgun: "Özgün" renk seçiliyken çizilen kendi renkli sayfası (isteğe bağlı; yoksa gri çizim rampasız çizilir) */
    sac: {
      orig: { ad: 'Özgün', dosya: 'kat/sac_orig.webp', ozgun: 'kat/sac_orig_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      kisa: { ad: 'Kısa kesim', dosya: 'kat/sac_kisa.webp', ozgun: 'kat/sac_kisa_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      topuz: { ad: 'Topuz', dosya: 'kat/sac_topuz.webp', ozgun: 'kat/sac_topuz_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      atkuyrugu: { ad: 'At kuyruğu', dosya: 'kat/sac_atkuyrugu.webp', ozgun: 'kat/sac_atkuyrugu_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      yan: { ad: 'Yana taranmış', dosya: 'kat/sac_yan.webp', ozgun: 'kat/sac_yan_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      uzun: { ad: 'Uzun düz', dosya: 'kat/sac_uzun.webp', ozgun: 'kat/sac_uzun_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      ikiz: { ad: 'İkiz kuyruk', dosya: 'kat/sac_ikiz.webp', ozgun: 'kat/sac_ikiz_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      kut: { ad: 'Küt kesim', dosya: 'kat/sac_kut.webp', ozgun: 'kat/sac_kut_ozgun.webp', parca: ['sacArka', 'sacOn'] },
      orgu: { ad: 'Örgü', dosya: 'kat/sac_orgu.webp', ozgun: 'kat/sac_orgu_ozgun.webp', parca: ['sacArka', 'sacOn'] }
    },
    /* rampa: null → stilin ozgun sayfası · ornek: görünüş ekranındaki renk düğmesi */
    sacRenk: {
      orig: { ad: 'Özgün', rampa: null, ornek: '#9a3b2a' }, black: { ad: 'Siyah', rampa: 'black', ornek: '#262433' }, blond: { ad: 'Sarı', rampa: 'blond', ornek: '#f0cc60' }, white: { ad: 'Beyaz', rampa: 'white', ornek: '#dcdcea' },
      blue: { ad: 'Mavi', rampa: 'blue', ornek: '#4a8ae8' }, orange: { ad: 'Turuncu', rampa: 'orange', ornek: '#ee7428' }, green: { ad: 'Yeşil', rampa: 'green', ornek: '#3aa858' }, pink: { ad: 'Pembe', rampa: 'pink', ornek: '#ec7ab4' }
    },
    /* göz biçimleri: her dosyada satır = göz rengi, sütun = sablon.yuz.hucre */
    goz: {
      orig: { ad: 'Özgün', dosya: 'kat/yuz_orig.webp' },
      iri: { ad: 'İri ve yuvarlak', dosya: 'kat/yuz_iri.webp' },
      dar: { ad: 'Dar, yarı kapalı', dosya: 'kat/yuz_dar.webp' }
    },
    gozRenk: {
      orig: { ad: 'Kırmızı', satir: 0, ornek: '#d8303a' }, blue: { ad: 'Mavi', satir: 1, ornek: '#3f8fe6' }, green: { ad: 'Yeşil', satir: 2, ornek: '#3fb85a' },
      gold: { ad: 'Altın', satir: 3, ornek: '#e6b83c' }, purple: { ad: 'Mor', satir: 4, ornek: '#9a55d8' }, grey: { ad: 'Gri', satir: 5, ornek: '#9aa0a8' }
    },
    kulak: { dosya: 'kat/kulak.webp' },

    /* BAŞLIKLAR (Faz 3, 2026-11-22). Kaynak: çizicinin 12 başlığı (prototype/chibi_rig, parts/styles_npc.js), pişiren: tools/kat_baslik_pisir.mjs + kat_baslik_donustur.py.
       dosya: başlığın kendisi, satırlar parca sırasıyla · sacAlti / sacAltiOzgun: başlık takılıyken saç (gri + özgün renk), sablon.sacAlti düzeninde
       tur: başlığın saça ve kulağa ne yaptığı (baslikTur) · kaynak: başka bir başlığın renk çeşidi (saç kesimi ve türü ondan gelir)
       Ekipman bağlantısı: js/ekipman_kural.js'te başlık eşyasının "kat" alanı buradaki kimliktir. */
    baslikTur: {
      open: { tasi: { kulak: 'kulakUst' } },     // bant, taç: saç tümüyle görünür, kulak başlığın üstünde
      closed: { tasi: { kulak: 'kulakUst' } },   // fes, kep, miğfer, şapka: tacın hacmi başlığın altında kalır (saç altı sayfasında kesilmiş), kulak üstte
      hood: { gizler: ['kulak'] },               // kapüşon, kukuleta: yalnız yüz çevresindeki saç; kulağın yerini ten yaması örter
      wrap: { gizler: ['kulak'] }                // kefiye, başörtüsü: kapüşon gibi
    },
    baslik: {
      bandana: { ad: 'Bandana', tur: 'open', dosya: 'kat/baslik_bandana.webp', parca: ['baslik'], sacAlti: 'kat/baslik_bandana_sac.webp', sacAltiOzgun: 'kat/baslik_bandana_sac_ozgun.webp' },
      sapka1: { ad: 'Ozan şapkası', tur: 'closed', dosya: 'kat/baslik_sapka1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_sapka1_sac.webp', sacAltiOzgun: 'kat/baslik_sapka1_sac_ozgun.webp' },
      fes: { ad: 'Fes', tur: 'closed', dosya: 'kat/baslik_fes.webp', parca: ['baslik'], sacAlti: 'kat/baslik_fes_sac.webp', sacAltiOzgun: 'kat/baslik_fes_sac_ozgun.webp' },
      kep1: { ad: 'Brokar kep', tur: 'closed', dosya: 'kat/baslik_kep1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_kep1_sac.webp', sacAltiOzgun: 'kat/baslik_kep1_sac_ozgun.webp' },
      tac1: { ad: 'Demir taç', tur: 'open', dosya: 'kat/baslik_tac1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_bandana_sac.webp', sacAltiOzgun: 'kat/baslik_bandana_sac_ozgun.webp' },
      kapuson1: { ad: 'Kapüşon', tur: 'hood', dosya: 'kat/baslik_kapuson1.webp', parca: ['baslikArka', 'baslik', 'yama'], sacAlti: 'kat/baslik_kapuson1_sac.webp', sacAltiOzgun: 'kat/baslik_kapuson1_sac_ozgun.webp' },
      kask1: { ad: 'Demir miğfer', tur: 'closed', dosya: 'kat/baslik_kask1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_kask1_sac.webp', sacAltiOzgun: 'kat/baslik_kask1_sac_ozgun.webp' },
      kefiye1: { ad: 'Kefiye', tur: 'wrap', dosya: 'kat/baslik_kefiye1.webp', parca: ['baslikArka', 'baslik', 'yama'], sacAlti: 'kat/baslik_kefiye1_sac.webp', sacAltiOzgun: 'kat/baslik_kefiye1_sac_ozgun.webp' },
      hasir1: { ad: 'Hasır şapka', tur: 'closed', dosya: 'kat/baslik_hasir1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_hasir1_sac.webp', sacAltiOzgun: 'kat/baslik_hasir1_sac_ozgun.webp' },
      kukuleta1: { ad: 'Kukuleta', tur: 'hood', dosya: 'kat/baslik_kukuleta1.webp', parca: ['baslik', 'yama'], sacAlti: 'kat/baslik_kukuleta1_sac.webp', sacAltiOzgun: 'kat/baslik_kukuleta1_sac_ozgun.webp' },
      basortu1: { ad: 'Başörtüsü', tur: 'wrap', dosya: 'kat/baslik_basortu1.webp', parca: ['baslikArka', 'baslik', 'yama'], sacAlti: 'kat/baslik_basortu1_sac.webp', sacAltiOzgun: 'kat/baslik_basortu1_sac_ozgun.webp' },
      sarik1: { ad: 'Sarık', tur: 'closed', dosya: 'kat/baslik_sarik1.webp', parca: ['baslik'], sacAlti: 'kat/baslik_sarik1_sac.webp', sacAltiOzgun: 'kat/baslik_sarik1_sac_ozgun.webp' },
      /* renk çeşitleri (ekipman başlıkları): yalnız başlık sayfası ayrı */
      bork: { ad: 'Keçe Börk', kaynak: 'fes', dosya: 'kat/baslik_bork.webp' },
      tolga: { ad: 'Tunç Tolga', kaynak: 'kask1', dosya: 'kat/baslik_tolga.webp' },
      kara_migfer: { ad: 'Kara Miğfer', kaynak: 'kask1', dosya: 'kat/baslik_kara_migfer.webp' }
    },
    /* zırh setlerinin gövdesi (53 kare, eski sayfa; ölçüler assets/gorunus_atlas.js govde.<set>) */
    govde: { dosya: set => 'gorunus/govde_' + set + '.webp' }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = kok.EO2_KAT;
})(typeof window !== 'undefined' ? window : globalThis);
