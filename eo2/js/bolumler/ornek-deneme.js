/* Ejder Ocağı 2.0 · Bölüm: Deneme alanı (sistem ajanının mekanik deneme bölümü; tasarım değildir)
   Amaç: bölüm motorunun sözleşmesini küçük bir örnekle sınamak ve perspektifi göz önünde tutmak.
   - İki sırada bankın on altı yönü (açı ailesi, zemine bağlama): arkada dokuz çizim, önde yedisinin aynası.
   - Önde aynı fener üç derinlikte (uzaklaştıkça küçülme) ve dünya ölçüsüyle yazılmış iki nesne (nesnenin ikinci yazım biçimi).
   - Akşam tonu, iki gölge kütlesi (biri eğik) ve iki ok hattı (biri çapraz): ışık isteklerinin denemesi.
   Menü → Deneme alanı. Bölüm ajanı bu dosyayı örnek olarak okuyabilir; içeriğine dokunmaz. */
EO2.bolum.tanimla({
  id: 'deneme', ad: 'Deneme alanı', altAd: 'Motor ve perspektif denemesi',
  nesneler: [
    /* referans pikseliyle: aynı çizim üç derinlikte. Piksel eni tabanın derinliğine göre verilir, dünya eni hep aynı çıkar. */
    ['mg-a04', 300, 760, 62, { carp: 0.25 }], ['mg-a04', 420, 560, 44, { carp: 0.25 }], ['mg-a04', 500, 420, 31, { carp: 0.25 }],
    ['mg-a01', 1380, 520, 300, { carp: 1.3, cy: 0.6 }],
    /* dünya ölçüsüyle: arka sırada dokuz çizim, ön sırada eksi açılar (aynalanan yedi yön) */
    ...[0, 30, 45, 60, 90, 120, 135, 150, 180].map((a, i) => ({ ad: 'ms-bank', x: -9 + i * 2.6, y: 15.5, w: 1.75, aci: a, carp: 0.7 })),
    ...[-30, -45, -60, -90, -120, -135, -150].map((a, i) => ({ ad: 'ms-bank', x: -6.4 + i * 2.6, y: 12.6, w: 1.75, aci: a, carp: 0.7 })),
    { ad: 'mg-c05', x: 3.2, y: 8.2, w: 1.3, carp: 0.5 }, { ad: 'mg-b14', x: -4.6, y: 8.6, w: 1.6, carp: 0.5 },
  ],
  aileler: { 'ms-bank': { onek: 'mb-bank-', acilar: [0, 30, 45, 60, 90, 120, 135, 150, 180], varsayilan: 30, bagla: true } },
  isiklar: [[300, 760, 3.6, 0.9], [420, 560, 3.6, 0.8], [500, 420, 3.6, 0.7]],
  /* akşam denemesi: ortam tonu bütün sahneye, gölge kütleleri zemine ve içindeki kişilere, oklar yola */
  isik: { ik: 0.55, sicak: 0.45, ton: [0.86, 0.8, 0.95] },
  golgeler: [[1180, 700, 4.2, 1.5, 1, -12], [620, 470, 5, 1.2, 0.7, 0]],
  oklar: [[836, 800, 836, 500], [900, 480, 1250, 440, 0.8]],
  noktalar: [[815, 705, 215, 'oyuncu']],
  zemin: { merkez: [836, 520] },
  yer(P) { return { bounds: [-12, 14, 3.5, 24],
    interact: [{ id: 'cikis', x: 0, y: 5, r: 1.6, z: 2.4, label: 'Merkez Meydan', sub: 'Deneme alanından çık', act: 'go:master' }] }; },
});
