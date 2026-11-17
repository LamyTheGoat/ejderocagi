/* Ejder Ocağı 2.0 · Kor Örsü kuralları (2026-11-17)
   Kullanıcı: "örs sistemini baştan, eğlenceli, heyecanlı ve riskli olacak şekilde kur."
   Yalnız kural ve sayı; ekran js/ors.js'tedir. Dosya hem oyunda hem testte (Node) yüklenir.

   NE DÖVÜLÜR: terbiyecinin Ejder Topu. Kademe +0'dan +12'ye çıkar; her kademe topçunun hasarını ve canını yüzde 2 artırır
   (zindan, düello, Takım Meydanı). Top çatlamışsa bu artış işlemez.

   BEDEL (eski oyunun birinci kademe eşya tablosuyla aynı sayılar): her denemede kor taşı ve altın peşin ödenir; deneme tutmasa da geri gelmez.
   BÖLGELER:
     +0 → +4   Güvenli   tutmazsa kayıp yok
     +4 → +7   Harlı     tutmazsa bir kademe düşer
     +7 → +12  Cehennem  tutmazsa top ÇATLAR: artış durur; onarılınca dört kademe geride döner
   ANKA MÜHÜR TAŞI: denemeye basılırsa (bir taş harcanır) tutmayan denemede kademe düşmez, top çatlamaz.
   TAV (çekiç oyunu): üç çekiç darbesi. Her darbe ibrenin durduğu yere göre şansı değiştirir:
     altın kor +5 · sıcak +2 · soğuk −3.   Körüğe yüklenilirse ibre hızlanır, altın kor +9 olur, soğuk −6 (kumar).
   USTA İŞİ: üç darbe de altın kora denk gelir ve deneme tutarsa kademe bir yerine İKİ artar (bölge sınırını aşabilir, +12'yi aşamaz).
   ONARIM: çatlak top altın ve kıvılcım kor taşıyla onarılır; kademe dört düşer (en az +4'e, çünkü çatlama yalnız +7 ve üstünde olur). */
(function (kok) {
  'use strict';
  const EN_COK = 12, ARTIS = 0.02;
  const TAS = ['kor_t1', 'kor_t2', 'kor_t3', 'anka_koruma'];
  /* sıradaki denemenin bedeli, tabandaki şansı ve bölgesi; +12'de null */
  function sira(k) { k = Math.max(0, Math.min(EN_COK, k | 0)); if (k >= EN_COK) return null;
    if (k < 4) return { kademe: k, tas: 'kor_t1', adet: [3, 6, 10, 16][k], altin: [40, 80, 140, 220][k], sans: [100, 95, 90, 82][k], bolge: 'guvenli' };
    if (k < 7) return { kademe: k, tas: 'kor_t2', adet: [5, 9, 14][k - 4], altin: [320, 480, 680][k - 4], sans: [70, 58, 46][k - 4], bolge: 'harli' };
    return { kademe: k, tas: k === 7 ? 'kor_t2' : 'kor_t3', adet: k === 7 ? 20 : [6, 11, 18, 28][k - 8], altin: [950, 1300, 1800, 2500, 3500][k - 7], sans: [36, 26, 18, 12, 8][k - 7], bolge: 'cehennem' }; }
  const ONARIM = { altin: 600, tas: 'kor_t1', adet: 12, geri: 4, taban: 4 };
  const TAV = { olagan: { altin: 5, sicak: 2, soguk: -3, tur: 640 }, koruk: { altin: 9, sicak: 2, soguk: -6, tur: 400 } };
  const ALTIN = [0.42, 0.58], SICAK = [0.30, 0.70];   // ibrenin 0–1 arasındaki yeri
  const vurus = yer => (yer >= ALTIN[0] && yer <= ALTIN[1] ? 'altin' : yer >= SICAK[0] && yer <= SICAK[1] ? 'sicak' : 'soguk');
  const tavPuani = (vuruslar, koruk) => vuruslar.reduce((t, v) => t + TAV[koruk ? 'koruk' : 'olagan'][v], 0);
  const sans = (k, vuruslar, koruk) => { const s = sira(k); return s ? Math.max(1, Math.min(100, s.sans + tavPuani(vuruslar || [], koruk))) : 0; };
  /* denemenin sonucu. zar: 0–100 arası sayı (şanstan küçükse tutar). Dönen: { tuttu, usta, kademe, catlak, anka (harcandı mı), olay } */
  function sonuc(k, o) { const s = sira(k), v = (o && o.vuruslar) || []; if (!s) return null;
    const esik = sans(k, v, o && o.koruk), tuttu = (o && o.zar) < esik, usta = tuttu && v.length === 3 && v.every(x => x === 'altin');
    if (tuttu) return { tuttu: true, usta, kademe: Math.min(EN_COK, k + (usta ? 2 : 1)), catlak: false, anka: false, sans: esik, olay: usta ? 'usta' : 'tuttu' };
    if (s.bolge === 'guvenli') return { tuttu: false, usta: false, kademe: k, catlak: false, anka: false, sans: esik, olay: 'kayipsiz' };
    if (o && o.anka) return { tuttu: false, usta: false, kademe: k, catlak: false, anka: true, sans: esik, olay: 'anka' };
    if (s.bolge === 'harli') return { tuttu: false, usta: false, kademe: k - 1, catlak: false, anka: false, sans: esik, olay: 'dustu' };
    return { tuttu: false, usta: false, kademe: k, catlak: true, anka: false, sans: esik, olay: 'catladi' }; }
  const onarilmis = k => Math.max(ONARIM.taban, k - ONARIM.geri);
  /* topçu değerlerine çarpan: çatlak top artış vermez */
  const carpan = d => 1 + (d && !d.catlak ? Math.max(0, Math.min(EN_COK, d.kademe | 0)) : 0) * ARTIS;
  const AD = k => (k >= 12 ? 'Kadim Magma Topu' : k >= 10 ? 'Zümrüt Ejder Topu' : k >= 7 ? 'Kor Ejder Topu' : k >= 4 ? 'Harlı Ejder Topu' : 'Ejder Topu');
  const K = { EN_COK, ARTIS, TAS, ONARIM, TAV, ALTIN, SICAK, sira, vurus, tavPuani, sans, sonuc, onarilmis, carpan, AD };
  if (typeof module !== 'undefined' && module.exports) module.exports = K; else kok.EO2_ORS = K;
})(typeof window !== 'undefined' ? window : this);
