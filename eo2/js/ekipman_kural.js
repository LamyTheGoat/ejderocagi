/* Ejder Ocağı 2.0 · Ekipman kuralları (EO2_EKIPMAN) · 2026-11-21
   Kullanıcı (Mehmet, 2026-11-21): "her bir ekipman ayrı kuşanılacak şekilde baştan kurgulamak istiyorum ... her biri ayrı ayrı upgrade edilebilecek."
   Şartname: "Oyuncu ekipmanı: beş slot" (Claude Doc, 2026-11-21). Yalnız kural, katalog ve sayı; ekranlar js/ekipman.js'tedir.
   Dosya hem oyunda hem testte (Node) yüklenir.

   SLOTLAR (KARAR): silah (Ejder Topu), zırh (tam beden set), başlık, pelerin, yüz aksesuarı.
   GÜÇ (KARAR: toplam tavan %60; aksesuar güç vermez, başlık ve pelerin verir; PvP'de kademe tam sayılır):
     güç veren dört parçanın her biri kademe başına %1,25, +12'de %15 → dördü birden +12'de %60.
       silah  → topçu hasarı       zırh    → topçu canı
       başlık → tam isabet hasarı (kafaya isabet ve boss zayıf noktası)
       pelerin → dayanıklılık (hareket yakıtı)
     Güç YALNIZ kademeden gelir (SEÇİM): aynı slottaki parçalar birbirinden güçlü değildir; fark görünüş ve kademededir.
     Çatlak parça artış vermez (Kor Örsü kuralı, js/ors_kural.js).
   YÜKSELTME: güç veren her parça Kor Örsü'nde aynı kuralla dövülür (bedel, bölgeler, çatlama, Anka Mührü). Kademe parçanın üstünde durur.
   KAYIT: S.ekipman = { surum, parca: [{ uid, id, kademe, catlak, deneme, zirve, t }], giyili: { silah, zirh, baslik, pelerin, yuz } (uid ya da null) }.
   ESKİ KAYIT (S.kusam + S.ors): sahip olunan setler zırh parçası olur; Ejder Topu'nun kademesi silahta kalır.
     Top eskiden can ve hasarı birlikte artırıyordu; can artık zırhtan gelir. Oyuncu güç kaybetmesin diye giydiği zırh,
     tek seferlik, topun kademesiyle başlar (SEÇİM, şartname §6). */
(function (kok) {
  'use strict';
  const ARTIS = 0.0125, EN_COK = 12;
  const SLOT = ['silah', 'zirh', 'baslik', 'pelerin', 'yuz'];
  const SLOT_AD = { silah: 'Silah', zirh: 'Zırh', baslik: 'Başlık', pelerin: 'Pelerin', yuz: 'Yüz aksesuarı' };
  /* güç veren slot → artırdığı değer */
  const ETKI = { silah: 'hasar', zirh: 'can', baslik: 'kritik', pelerin: 'dayaniklilik' };
  const ETKI_AD = { hasar: 'Topçu hasarı', can: 'Topçu canı', kritik: 'Tam isabet hasarı', dayaniklilik: 'Dayanıklılık' };
  const BOS_OLUR = { silah: false, zirh: false, baslik: true, pelerin: true, yuz: true };   // çıkarılabilir slotlar (silah ve zırh hep giyilidir; çıplak set de bir zırhtır)

  /* KATALOG. ikon: oyun kökünden yol (G.url ile). set: zırhın meydan ve savaş çizimi. malzeme: S.topcu.ganimet anahtarları.
     Zırh fiyatları ve malzemeleri 2026-11-17 kuşam tablosuyla aynıdır (js/gorunum.js bu listeyi kullanır).
     Başlık, pelerin ve yüz fiyatları SEÇİM (2026-11-21); kalıplar zindan çarkının boşa biriken kalıp parçalarıdır. */
  const K = (id, slot, ad, acik, fiyat, malzeme, o) => Object.assign({ id, slot, ad, acik, fiyat, malzeme: malzeme || {} }, o || {});
  const KATALOG = [
    K('ejder_topu', 'silah', 'Ejder Topu', 'Terbiyecinin omzundaki ejder ağızlı top. Kor Örsü\'nde dövülür.', 0, {}, { ikon: 'assets/ik/ejder-topu.webp', baslangic: true, satilmaz: true }),
    K('bare', 'zirh', 'Çıplak', 'Yola çıktığın hâl.', 0, {}, { set: 'bare', baslangic: true, satilmaz: true }),
    K('temel', 'zirh', 'Temel', 'Deri yelek, kürk yaka.', 120, {}, { set: 'temel' }),
    K('avci', 'zirh', 'Avcı', 'Hafif deri, yeşil pelerin.', 250, { kor_t1: 4 }, { set: 'avci' }),
    K('madenci', 'zirh', 'Madenci', 'Kalın önlük, iş eldiveni.', 250, { obsidiyen: 4 }, { set: 'madenci' }),
    K('senlik', 'zirh', 'Ocak Şenliği', 'Bayram kuşağı, süslü yelek.', 350, { kor_t1: 6 }, { set: 'senlik' }),
    K('buyucu', 'zirh', 'Büyücü', 'Uzun cübbe, yıldızlı pelerin.', 400, { kor_t2: 3 }, { set: 'buyucu' }),
    K('muhafiz', 'zirh', 'Muhafız', 'Çelik göğüslük, kızıl pelerin.', 500, { kor_t2: 4, kor_t3: 2 }, { set: 'muhafiz' }),
    K('bork', 'baslik', 'Keçe Börk', 'Sade keçe başlık.', 180, {}, { ikon: null }),
    K('tolga', 'baslik', 'Tunç Tolga', 'Dövme tunç başlık.', 320, { kalip_zirh: 1 }, { ikon: null }),
    K('kukulete', 'baslik', 'Yün Kukuleta', 'Kalın yün başlık.', 450, { kalip_zirh: 2 }, { ikon: null }),
    K('kara_migfer', 'baslik', 'Kara Miğfer', 'Obsidiyenle sertleştirilmiş demir başlık.', 600, { kalip_zirh: 3, obsidiyen: 2 }, { ikon: null }),
    K('keten_pelerin', 'pelerin', 'Keten Pelerin', 'Yol pelerini.', 150, {}, { ikon: null }),
    K('kilim_sal', 'pelerin', 'Kilim Pelerin', 'Dokuma yün pelerin.', 260, { kalip_zirh: 1 }, { ikon: null }),
    K('kurt_postu', 'pelerin', 'Post Pelerin', 'Kalın kürk pelerin.', 400, { kalip_zirh: 2 }, { ikon: null }),
    K('sancak', 'pelerin', 'Tuğlu Pelerin', 'Ağır, süslü pelerin.', 550, { kalip_zirh: 3 }, { ikon: null }),
    K('sargi', 'yuz', 'Bez Sargı', 'Sade yüz sargısı.', 90, {}, { ikon: null }),
    K('monokl', 'yuz', 'Mercek', 'Tek gözlük mercek.', 200, { kalip_silah: 1 }, { ikon: null }),
    K('gozluk', 'yuz', 'Demirci Gözlüğü', 'Kıvılcıma karşı gözlük.', 300, { kalip_silah: 1 }, { ikon: null }),
    K('tunc_maske', 'yuz', 'Tunç Maske', 'Dövme tunç yüz maskesi.', 500, { kalip_silah: 2 }, { ikon: null })
  ];
  const KAT = Object.fromEntries(KATALOG.map(k => [k.id, k]));
  const MALZ_AD = { kor_t1: 'Kıvılcım Kor Taşı', kor_t2: 'Harlı Kor Taşı', kor_t3: 'Kadim Magma Taşı', obsidiyen: 'Obsidiyen Cevheri', kalip_zirh: 'Zırh kalıp parçası', kalip_silah: 'Silah ve maske kalıp parçası' };
  const MALZ_NEREDEN = { kor_t1: 'zindan çarkı', kor_t2: 'zindan çarkı', kor_t3: 'zindan çarkı', obsidiyen: 'kervan baskını', kalip_zirh: 'zindan çarkı (büyük kalıp)', kalip_silah: 'zindan çarkı (büyük kalıp)' };

  const kat = id => KAT[id] || null;
  const slotu = p => { const k = p && kat(p.id); return k ? k.slot : null; };
  const gucVerir = slot => !!ETKI[slot];
  const kademe = p => Math.max(0, Math.min(EN_COK, (p && p.kademe) | 0));
  /* parçanın kendi artışı (0–0,15); çatlak ya da güç vermeyen parçada 0 */
  const artis = p => (p && !p.catlak && gucVerir(slotu(p)) ? Math.round(kademe(p) * ARTIS * 10000) / 10000 : 0);

  let sayac = 0;
  const yeniUid = () => 'p' + Date.now().toString(36) + (sayac++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const yeniParca = (id, o) => Object.assign({ uid: yeniUid(), id, kademe: 0, catlak: false, deneme: 0, zirve: 0, t: Date.now() }, o || {});

  /* kaydı düzene sokar; eski kayıttan (kusam, ors) ilk kez kurar. Aynı nesneyi döndürür (S.ekipman yerinde). */
  function duzenle(S) {
    if (!S || typeof S !== 'object') return null;
    let E = S.ekipman;
    if (!E || typeof E !== 'object' || !Array.isArray(E.parca)) {
      E = { surum: 1, parca: [], giyili: { silah: null, zirh: null, baslik: null, pelerin: null, yuz: null } };
      const ks = S.kusam && Array.isArray(S.kusam.sahip) ? S.kusam : null, ors = S.ors && typeof S.ors === 'object' ? S.ors : null;
      const topK = ors ? Math.max(0, Math.min(EN_COK, ors.kademe | 0)) : 0;
      const top = yeniParca('ejder_topu', { kademe: topK, catlak: !!(ors && ors.catlak), deneme: ors ? ors.deneme | 0 : 0, zirve: Math.max(ors ? ors.zirve | 0 : 0, topK) });
      E.parca.push(top); E.giyili.silah = top.uid;
      const sahip = ks ? ks.sahip.filter(id => kat(id) && kat(id).slot === 'zirh') : ['bare', 'temel'];   // kuşam alanı olmayan çok eski kayıt Temel'in sahibidir (gorunum.js ile aynı)
      if (!sahip.includes('bare')) sahip.unshift('bare');
      const giyId = ks && sahip.includes(ks.giyili) ? ks.giyili : (ks ? 'bare' : 'temel');
      for (const id of [...new Set(sahip)]) { const p = yeniParca(id); if (id === giyId && topK > 0) { p.kademe = topK; p.zirve = topK; } E.parca.push(p); if (id === giyId) E.giyili.zirh = p.uid; }
      S.ekipman = E;
    }
    E.surum = 1; E.giyili = Object.assign({ silah: null, zirh: null, baslik: null, pelerin: null, yuz: null }, E.giyili || {});
    E.parca = E.parca.filter(p => p && typeof p === 'object' && kat(p.id));
    for (const p of E.parca) { if (!p.uid) p.uid = yeniUid(); p.kademe = kademe(p); p.catlak = !!p.catlak && gucVerir(slotu(p)); p.deneme = p.deneme | 0; p.zirve = Math.max(p.zirve | 0, p.kademe); if (!gucVerir(slotu(p))) p.kademe = 0; }
    /* her başlangıç parçası bir kez bulunur */
    for (const k of KATALOG) if (k.baslangic && !E.parca.some(p => p.id === k.id)) E.parca.push(yeniParca(k.id));
    for (const s of SLOT) { const p = E.parca.find(q => q.uid === E.giyili[s]); if (!p || slotu(p) !== s) E.giyili[s] = null;
      if (!E.giyili[s] && !BOS_OLUR[s]) { const ilk = E.parca.find(q => slotu(q) === s && (s !== 'zirh' || q.id === 'bare')) || E.parca.find(q => slotu(q) === s); E.giyili[s] = ilk ? ilk.uid : null; } }
    return E;
  }
  const parca = (E, uid) => (E && E.parca.find(p => p.uid === uid)) || null;
  const giyiliParca = (E, slot) => parca(E, E && E.giyili[slot]);
  const sahipMi = (E, id) => !!(E && E.parca.some(p => p.id === id));

  /* giyili parçalardan savaş çarpanları. hasar/can/dayaniklilik: 1 + artış; kritik: tam isabet hasarına eklenen oran (0–0,15). */
  function carpanlar(E) {
    const a = s => artis(giyiliParca(E, s));
    return { hasar: 1 + a('silah'), can: 1 + a('zirh'), kritik: a('baslik'), dayaniklilik: 1 + a('pelerin'), toplam: SLOT.reduce((t, s) => t + a(s), 0) };
  }
  /* kuşanma: uid'li parça kendi slotuna giyilir. Dönen: true/false */
  function giy(E, uid) { const p = parca(E, uid); if (!p) return false; E.giyili[slotu(p)] = p.uid; return true; }
  function cikar(E, slot) { if (!BOS_OLUR[slot]) return false; E.giyili[slot] = null; return true; }
  /* satın alma kuralı: altın ve malzeme yeter mi? (tek kopya: aynı parçadan ikincisi satılmaz, Bedesten gelince açılır) */
  const malzemeVar = (k, heybe) => Object.keys(k.malzeme).every(m => ((heybe && heybe[m]) | 0) >= k.malzeme[m]);
  function alinabilir(E, id, altin, heybe) { const k = kat(id); if (!k || k.baslangic || sahipMi(E, id)) return { ok: false, neden: k && sahipMi(E, id) ? 'sende' : 'yok' };
    if ((altin || 0) < k.fiyat) return { ok: false, neden: 'altin' }; if (!malzemeVar(k, heybe)) return { ok: false, neden: 'malzeme' }; return { ok: true }; }
  /* alımı kayda işler: altın ve malzeme düşer, parça eklenir ve giyilir. S.gold ve heybe yerinde değişir. Dönen: yeni parça ya da null */
  function satinAl(S, id, heybe) { const E = duzenle(S), k = kat(id); if (!alinabilir(E, id, S.gold, heybe).ok) return null;
    S.gold -= k.fiyat; for (const m in k.malzeme) heybe[m] = (heybe[m] | 0) - k.malzeme[m]; const p = yeniParca(id); E.parca.push(p); E.giyili[k.slot] = p.uid; return p; }

  const yuzde = x => Math.round(x * 10000) / 100;   // 0,0125 → 1,25 · 0,15 → 15
  const EK = { ARTIS, EN_COK, SLOT, SLOT_AD, ETKI, ETKI_AD, BOS_OLUR, KATALOG, MALZ_AD, MALZ_NEREDEN, kat, slotu, gucVerir, kademe, artis, yeniParca, duzenle, parca, giyiliParca, sahipMi, carpanlar, giy, cikar, malzemeVar, alinabilir, satinAl, yuzde };
  if (typeof module !== 'undefined' && module.exports) module.exports = EK; else kok.EO2_EKIPMAN = EK;
})(typeof window !== 'undefined' ? window : this);
