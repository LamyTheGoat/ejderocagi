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
      kulak: { cw: 127, ch: 48, ax: 70, ay: 272, hucre: HUCRE6 }
    },
    /* yürüyüş hücresi olmayan parçanın duruş hücresine göre kayması (piksel, ölçüm 2026-11-22: saç, yüz ve kulak aynı kaymayı verir) */
    iz: { down: [0, 0.62], up: [0, 2.62], right: [0, -10.12] },
    /* katman sırası, alttan üste. Henüz çizimi olmayan slotlar (pelerin, yüz aksesuarı, başlık) yerlerini tutar. */
    sira: ['pelerinArka', 'sacArka', 'govde', 'yuz', 'yuzAks', 'sacOn', 'kulak', 'baslik', 'pelerinOn'],
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
    /* zırh setlerinin gövdesi (53 kare, eski sayfa; ölçüler assets/gorunus_atlas.js govde.<set>) */
    govde: { dosya: set => 'gorunus/govde_' + set + '.webp' }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = kok.EO2_KAT;
})(typeof window !== 'undefined' ? window : globalThis);
