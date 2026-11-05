'use strict';
/* ============ EJDER OCAĞI — VERİ ============ */

const ELS = ['ates', 'buz', 'firtina', 'toprak', 'golge'];
// Baskınlık sırası: soldaki baskın. Gölge tamamen çekinik.
const EL_DOM = ['ates', 'firtina', 'toprak', 'buz', 'golge'];
const EL_AD = { ates: 'Ateş', buz: 'Buz', firtina: 'Fırtına', toprak: 'Toprak', golge: 'Gölge' };
// Ateş buzu eritir, buz toprağı dondurur, toprak fırtınayı topraklar, fırtına ateşi söndürür.
const EL_ADV = { ates: 'buz', buz: 'toprak', toprak: 'firtina', firtina: 'ates' };
function elMult(a, d) {
  if (a === 'golge' && d !== 'golge') return 1.2;
  if (d === 'golge' && a !== 'golge') return 1.15;
  if (EL_ADV[a] === d) return 1.4;
  if (EL_ADV[d] === a) return 0.72;
  return 1;
}

const STATS = ['gu', 'ce', 'da', 'ze'];
const ST_AD = { gu: 'Güç', ce: 'Çeviklik', da: 'Dayanıklılık', ze: 'Zekâ' };
const ST_KISA = { gu: 'GÜÇ', ce: 'ÇEV', da: 'DAY', ze: 'ZEK' };
const GRADE = ['', 'D', 'C', 'B', 'A', 'S'];
const MOOD = ['Berbat', 'Kötü', 'Normal', 'İyi', 'Harika'];
const MOOD_MULT = [0.6, 0.8, 1, 1.15, 1.3];
const MOOD_DMG = [0.86, 0.93, 1, 1.06, 1.12];
const STAGE_AD = { yavru: 'Yavru', genc: 'Genç', yetiskin: 'Yetişkin' };

const TRAITS = {
  demir: { ad: 'Demir Pul', d: 'Aldığı hasar %15 azalır.' },
  kor: { ad: 'Kor Yürek', d: 'Nefes saldırısı %20 daha güçlü.' },
  kartal: { ad: 'Kartal Kanat', d: 'Saldırılardan kaçınma +%8.' },
  sabirli: { ad: 'Sabırlı', d: 'Antrenman yorgunluğu %30 az.' },
  obur: { ad: 'Obur', d: 'Yem gideri 1,5 kat; ikramdan ek moral alır.' },
  asil: { ad: 'Asil Kan', d: 'Her zaferde +1 ün; değeri %50 fazla.' },
  hizli: { ad: 'Hızlı Büyüme', d: 'Yarı sürede yetişkin olur.' },
  cabuk: { ad: 'Çabuk İyileşir', d: 'Yaralar iki kat hızlı kapanır; ölüm riski -5.' },
  dogurgan: { ad: 'Doğurgan', d: 'Çiftleşmede %35 ikiz yumurta şansı.' },
  vahsi: { ad: 'Vahşi', d: 'Bağ kazanımı %30 az; hasarı %10 fazla.' },
};
const TRAIT_KEYS = Object.keys(TRAITS);

// Karakter eksenleri: -100..100. |40| üstü bir "iz" açar.
const AXES = {
  ces: { p: 'Cesur', n: 'Temkinli', pd: 'Hasar +%12, kükreme daha sık tutar.', nd: 'Yaralanma riski yarıya iner, aldığı hasar -%10.' },
  sic: { p: 'Sıcak', n: 'Mesafeli', pd: 'Senden aldığı bağ 1,5 kat artar.', nd: 'Olaylar ve konforsuzluk moralini düşürmez.' },
  dis: { p: 'Disiplinli', n: 'Asi', pd: 'Antrenman kazancı +%15.', nd: '%20 çift kazanç, %10 antrenmanı reddetme.' },
};
const MARK_T = 40;

const STYLES = {
  sert: { ad: 'Sert', mult: 1.2, fat: 26, d: 'Kazanç +%20, yorgunluk fazla. Disiplin artar, sıcaklık azalır.' },
  yumusak: { ad: 'Yumuşak', mult: 1, fat: 18, d: 'Dengeli. Sıcaklığı besler.' },
  oyun: { ad: 'Oyunla', mult: 0.85, fat: 12, d: 'Kazanç -%15, az yorar, morali yükseltebilir. Asiliği besler.' },
};

const FOODS = {
  balik: { ad: 'Taze Balık', fiyat: 12, d: 'Herkes sever. +1 moral, +3 bağ.' },
  biber: { ad: 'Ateş Biberi', fiyat: 18, el: 'ates' },
  kar: { ad: 'Kar Meyvesi', fiyat: 18, el: 'buz' },
  mantar: { ad: 'Yıldırım Mantarı', fiyat: 18, el: 'firtina' },
  yumru: { ad: 'Kök Yumrusu', fiyat: 18, el: 'toprak' },
  zambak: { ad: 'Gece Zambağı', fiyat: 24, el: 'golge' },
  ziyafet: { ad: 'Ejder Ziyafeti', fiyat: 55, kiler: true, d: '+2 moral, +5 bağ, yorgunluk -20. Kiler gerekir.' },
  genclik: { ad: 'Sonsuz Gençlik İksiri', fiyat: 140, onlyBaby: true, d: 'Sadece Yavru ejderhalar içebilir! Yavruyu ebediyen genç mühürler; Zindan ve Ejder Topçusu savaşlarında silahın olur.' },
};
const EL_FOOD = { ates: 'biber', buz: 'kar', firtina: 'mantar', toprak: 'yumru', golge: 'zambak' };

const BUILD = {
  in: { ad: 'İn', fiyat: 120, multi: true, d: 'İki ejderha barınır. Çevresindeki süsler sakinlerinin konforunu artırır.' },
  kulucka: { ad: 'Kuluçka Ocağı', fiyat: 160, d: 'İki yumurtayı aynı anda kuluçkaya yatırır. Yumurtalar 2 haftada çatlar.' },
  talim: { ad: 'Talim Meydanı', fiyat: 150, d: 'Bütün antrenmanlar %25 daha verimli.' },
  agirlik: { ad: 'Ağırlık Kayaları', fiyat: 170, stat: 'gu', d: 'Güç antrenmanı %40 daha verimli.' },
  parkur: { ad: 'Rüzgâr Parkuru', fiyat: 170, stat: 'ce', d: 'Çeviklik antrenmanı %40 daha verimli.' },
  kaynak: { ad: 'Sıcak Kaynak', fiyat: 170, stat: 'da', comfort: 1, d: 'Dayanıklılık antrenmanı %40 verimli, dinlenme daha etkili. Komşu inlere +1 konfor.' },
  magara: { ad: 'Bilmece Mağarası', fiyat: 170, stat: 'ze', d: 'Zekâ antrenmanı %40 daha verimli.' },
  kiler: { ad: 'Kiler', fiyat: 100, d: 'Yem gideri %25 azalır. Pazarda Ejder Ziyafeti açılır.' },
  yuva: { ad: 'Yuva Bahçesi', fiyat: 220, comfort: 1, d: 'Çiftleştirmeyi mümkün kılar; gezintiler daha romantik geçer. Komşu inlere +1 konfor.' },
  sifa: { ad: 'Şifahane', fiyat: 200, d: 'Yaralar iki kat hızlı iyileşir. Ölümcül dövüşlerde risk -8.' },
  lab: { ad: 'Gen Laboratuvarı', fiyat: 280, un: 15, d: 'Gizli genleri görünür kılar ve yavru olasılıklarını hesaplar.' },
  fener: { ad: 'Fener', fiyat: 30, multi: true, decor: 1, d: 'Komşu inlere +1 konfor.' },
  heykel: { ad: 'Ejder Heykeli', fiyat: 90, multi: true, decor: 2, d: 'Komşu inlere +2 konfor. Her hafta +1 ün.' },
  lav: { ad: 'Lav Çukuru', fiyat: 60, multi: true, decor: 1, el: 'ates', d: '+1 konfor; Ateş ejderhalarına +3.' },
  buzc: { ad: 'Buz Çeşmesi', fiyat: 60, multi: true, decor: 1, el: 'buz', d: '+1 konfor; Buz ejderhalarına +3.' },
  direk: { ad: 'Fırtına Direği', fiyat: 60, multi: true, decor: 1, el: 'firtina', d: '+1 konfor; Fırtına ejderhalarına +3.' },
  yosun: { ad: 'Yosunlu Kaya', fiyat: 60, multi: true, decor: 1, el: 'toprak', d: '+1 konfor; Toprak ejderhalarına +3.' },
  golgetas: { ad: 'Gölge Taşı', fiyat: 80, multi: true, decor: 1, el: 'golge', d: '+1 konfor; Gölge ejderhalarına +3.' },
  mezar: { ad: 'Mezar Taşı', fiyat: 0, multi: true, decor: 1, hidden: true, d: 'Kaybettiğin bir dostun anısı. +1 konfor.' },
};
const BUILD_GROUPS = [
  ['Temel', ['in', 'kulucka', 'kiler', 'yuva', 'sifa', 'lab']],
  ['Antrenman', ['talim', 'agirlik', 'parkur', 'kaynak', 'magara']],
  ['Süs ve konfor', ['fener', 'heykel', 'lav', 'buzc', 'direk', 'yosun', 'golgetas']],
];

const ITEMS = {
  kin1: { ad: 'Demir Pençe Kını', slot: 'pence', atk: 6, fiyat: 80, tier: 1 },
  kin2: { ad: 'Çelik Tırnaklar', slot: 'pence', atk: 13, fiyat: 190, tier: 2 },
  kin3: { ad: 'Ejderdişi Kını', slot: 'pence', atk: 22, fiyat: 380, tier: 3 },
  zirh1: { ad: 'Deri Koşum', slot: 'govde', def: 10, fiyat: 70, tier: 1 },
  zirh2: { ad: 'Pullu Zırh', slot: 'govde', def: 22, ce: -4, fiyat: 200, tier: 2 },
  zirh3: { ad: 'Mithril Göğüslük', slot: 'govde', def: 34, fiyat: 420, tier: 3 },
  bas1: { ad: 'Boynuz Halkası', slot: 'bas', crit: 8, fiyat: 90, tier: 1 },
  bas2: { ad: 'Savaş Miğferi', slot: 'bas', def: 8, hp: 30, fiyat: 210, tier: 2 },
  bas3: { ad: 'Kartal Başlığı', slot: 'bas', ce: 14, crit: 6, fiyat: 330, tier: 3 },
  til1: { ad: 'Bereket Muskası', slot: 'tilsim', gold: 25, fiyat: 120, tier: 1 },
  til2: { ad: 'Kor Taşı', slot: 'tilsim', nefes: 25, fiyat: 170, tier: 2 },
  til3: { ad: 'Rüzgâr Tüyü', slot: 'tilsim', dodge: 8, fiyat: 180, tier: 2 },
  til4: { ad: 'Anka Külü', slot: 'tilsim', anka: 1, fiyat: 320, tier: 3 },
};
const SLOT_AD = { bas: 'Baş', govde: 'Gövde', pence: 'Pençe', tilsim: 'Tılsım' };
function itemDesc(it) {
  const p = [];
  if (it.atk) p.push(`Saldırı +${it.atk}`);
  if (it.def) p.push(`Zırh +${it.def}`);
  if (it.hp) p.push(`Can +${it.hp}`);
  if (it.ce) p.push(`ÇEV ${it.ce > 0 ? '+' : ''}${it.ce}`);
  if (it.crit) p.push(`Kritik +%${it.crit}`);
  if (it.dodge) p.push(`Kaçınma +%${it.dodge}`);
  if (it.nefes) p.push(`Nefes +%${it.nefes}`);
  if (it.gold) p.push(`Zafer başına +${it.gold} altın`);
  if (it.anka) p.push('Ölümcül yenilgiden bir kez kurtarır, sonra yanar');
  return p.join(' · ');
}

const TIERS = {
  yavru: { ad: 'Yavru Ligi', base: 16, grow: 1.5, gear: 0, odul: [30, 50], un: 1, olum: 0, stages: ['yavru', 'genc'], safe: true,
    d: 'Yavrular ve gençler için. Kimse yaralanmaz; küçük ödül, büyük tecrübe.' },
  koy: { ad: 'Köy Arenası', base: 30, grow: 1.8, gear: 3, odul: [55, 90], un: 2, olum: 0, stages: ['genc', 'yetiskin'],
    d: 'Panayır kalabalığı, tahta tribünler. Kaybedersen yaralanabilirsin.' },
  sehir: { ad: 'Şehir Arenası', base: 48, grow: 2.2, gear: 8, odul: [120, 190], un: 4, olum: 0, unReq: 20, stages: ['yetiskin'],
    d: 'Mermer basamaklar, soylu bahisçiler. Ün kazandırır. 20 ün gerekir.' },
  cukur: { ad: 'Yeraltı Çukuru', base: 55, grow: 2.4, gear: 12, odul: [240, 360], un: 3, olum: 25, flag: 'cukur', stages: ['yetiskin'],
    d: 'Kuralsız, meşaleli bir çukur. Para çok, merhamet yok. Yenilen ejderha ölebilir.' },
};

const NAMES_F = ['Ayaz', 'Cemre', 'Efsun', 'Gece', 'Ilgın', 'Lâl', 'Mehtap', 'Nar', 'Peri', 'Sema', 'Tipi', 'Umay', 'Yakut', 'Zümrüt', 'Selvi', 'Alaz', 'Duru', 'Kıvılcım', 'İnci', 'Serap', 'Şule', 'Ela', 'Tuna', 'Melis'];
const NAMES_M = ['Bora', 'Poyraz', 'Duman', 'Lodos', 'Sarp', 'Şimşek', 'Tufan', 'Kaya', 'Toprak', 'Kızılca', 'Akın', 'Çakır', 'Börü', 'Karayel', 'Oğuz', 'Yalın', 'Volkan', 'Doruk', 'Rüzgâr', 'Kurt', 'Batu', 'Demir', 'Atlas', 'Kartal'];
const OPP_NAMES = ['Kızılpençe', 'Kül', 'Karakuyruk', 'Taşkafa', 'Sis', 'Alaz', 'Tufan', 'Çakıl', 'Zehir', 'Gökbörü', 'Kanca', 'Pas', 'Kuzgun', 'Yarık', 'Dolu', 'Kasırga', 'Kemik', 'Is', 'Kırağı', 'Mızrak', 'Çatal', 'Sürgün', 'Kara Mehmet', 'Diken'];
const TRAINERS = ['Ayşe Ana', 'Kör Halil', 'İkizler Nur ve Nil', 'Baron Vasıf', 'Tilki Cemal', 'Leyla Hatun', 'Değirmenci Ali', 'Sarı Zeybek', 'Dul Fatma', 'Bilgin Rıza', 'Han Kızı Esma', 'Kasap Recep'];
const CUKUR_TRAINERS = ['Çukur Ağası Rüstem', 'Yaralı Selim', 'Kırık Burun', 'Sessiz Kadın', 'Karaborsacı Zekai'];
const ARCH = {
  kaba: { ad: 'Kaba kuvvet', gu: 1.25, ce: 0.85, da: 1.05, ze: 0.75 },
  cevik: { ad: 'Çevik', gu: 0.95, ce: 1.3, da: 0.82, ze: 0.95 },
  kale: { ad: 'Kale', gu: 0.9, ce: 0.75, da: 1.4, ze: 0.9 },
  bilge: { ad: 'Bilge', gu: 0.85, ce: 1, da: 0.9, ze: 1.3 },
  denge: { ad: 'Dengeli', gu: 1, ce: 1, da: 1, ze: 1 },
};

const REGIONS = {
  kul: { ad: 'Kül Vadisi', el: 'ates', fiyat: 30, d: 'Lav damarları, kızgın kaya ve ateş ejderhalarının av sahası.' },
  buzul: { ad: 'Buzul Sırtı', el: 'buz', fiyat: 30, d: 'Rüzgârın kesik nefes aldığı beyaz tepeler.' },
  kayalik: { ad: 'Fırtına Kayalıkları', el: 'firtina', fiyat: 30, d: 'Her öğleden sonra yıldırım düşen sivri kayalar.' },
  orman: { ad: 'Kök Ormanı', el: 'toprak', fiyat: 30, d: 'Ağaç köklerinin mağara gibi kemerler kurduğu yaşlı orman.' },
  bataklik: { ad: 'Gölge Bataklığı', el: 'golge', fiyat: 60, flag: 'bataklik', d: 'Haritalarda boş bırakılmış yer. Gölge ejderhalarının yuvası.' },
};

/* Göz rengi geni: her ejderha iki alel taşır, baskınlığı yüksek olan görünür. */
const EYEC = {
  kehribar: { ad: 'Kehribar', c: '#f0962a', dom: 4 }, yesil: { ad: 'Yeşil', c: '#3cc85a', dom: 3 },
  mavi: { ad: 'Mavi', c: '#3a90f0', dom: 2 }, mor: { ad: 'Mor', c: '#a050f0', dom: 2 },
  altin: { ad: 'Altın', c: '#ffd23a', dom: 1 }, kizil: { ad: 'Kızıl', c: '#f03a3a', dom: 0 },
};
const EL_EYE = { ates: 'kehribar', buz: 'mavi', firtina: 'altin', toprak: 'yesil', golge: 'mor' };
const EYEC_KEYS = Object.keys(EYEC);

/* ---------- Renk ve görünüş genleri ----------
   Pul (ana gövde) ve Süs (zar, şimşek, kristal, damar) iki ayrı lokus. 'n' = yerli alel: ejderhanın
   elementine özgü doğal renk. Baskınlığı yüksek alel görünür; baskınlığı eşit iki renk KARIŞIR
   (eksik baskınlık): gök + zümrüt → turkuaz. */
const RENK = {
  kizil: { ad: 'Kızıl', h: 2, s: .68 }, altin: { ad: 'Altın', h: 44, s: .80 }, zumrut: { ad: 'Zümrüt', h: 142, s: .58 },
  gok: { ad: 'Gök', h: 208, s: .66 }, mor: { ad: 'Mor', h: 276, s: .54 }, gul: { ad: 'Gül', h: 332, s: .58 },
  kul: { ad: 'Kül', h: 220, s: .06 }, inci: { ad: 'İnci', h: 36, s: .14 },
};
const PUL_DOM = { kizil: 3, n: 2.5, zumrut: 2, gok: 2, mor: 2, gul: 2, altin: 1, kul: 1 };
const SUS_DOM = { altin: 3, n: 2.5, kizil: 2, gok: 2, zumrut: 2, gul: 2, mor: 2, inci: 1, kul: 1 };
const NATIVE = {
  ates: { pul: { ad: 'Ateş kızılı', h: 5, s: .62 }, sus: { ad: 'Kor turuncusu', h: 28, s: .80 } },
  buz: { pul: { ad: 'Buz mavisi', h: 212, s: .40 }, sus: { ad: 'Kristal camgöbeği', h: 188, s: .50 } },
  firtina: { pul: { ad: 'Fırtına moru', h: 262, s: .42 }, sus: { ad: 'Şimşek altını', h: 42, s: .78 } },
  toprak: { pul: { ad: 'Yosun yeşili', h: 72, s: .45 }, sus: { ad: 'Toprak kahvesi', h: 30, s: .42 } },
  golge: { pul: { ad: 'Gece moru', h: 266, s: .32 }, sus: { ad: 'Ruh ışığı', h: 285, s: .60 } },
};
const SUS_AD = { ates: 'kanat zarı ve alev', buz: 'buz kristalleri', firtina: 'şimşek desenleri', toprak: 'kanat zarı ve boynuz', golge: 'ruh damarları' };
/* Pigment: a (ak) ve m (kara) çekinik. aa → Ak, mm → Kara, am → Dumanlı. Taşıyıcılar normal görünür. */
const PIG_AD = { N: 'Normal', a: 'Ak', m: 'Kara', am: 'Dumanlı' };
const PIG_D = { a: 'Pulları süt beyazı, gözleri kızıl. Göz alıcıdır: kaçınma +4.', m: 'Gece gibi kara pullar. Korkutucu: kritik +4.', am: 'Duman rengi, solgun pullar. İki farklı çekinik geni birden taşıyor.' };
/* Boy: alleller toplanır (iri +1, küçük −1). */
const BOY_AD = { '-2': 'Cüce', '-1': 'Ufak', '0': 'Orta', '1': 'İri', '2': 'Dev' };

/* ---------- Kozmetik ----------
   Beş yuva. Satın alınan bir süs bütün ejderhalarda kullanılabilir. Süslü ejderha seyircinin gözdesidir:
   en az bir süsle kazanılan dövüş +1 ün; beş yuvası dolu ejderha zaferden sonra moral +1. */
const COS_SLOTS = { taban: 'Taban', aura: 'Aura', bas: 'Baş', boyun: 'Boyun', kuyruk: 'Kuyruk' };
const COSMETICS = {
  kilim: { slot: 'taban', ad: 'Ocak kilimi', fiyat: 60, d: 'Ayaklarının altına serilmiş kırmızı bir kilim.' },
  cicekh: { slot: 'taban', ad: 'Çiçek halkası', fiyat: 80, d: 'Ayaklarının dibinde açan kır çiçekleri.' },
  run: { slot: 'taban', ad: 'Rün çemberi', fiyat: 150, d: 'Yavaşça dönen, parlayan kadim bir çember.' },
  kaide: { slot: 'taban', ad: 'Altın kaide', fiyat: 230, d: 'Şampiyonlara yakışır yaldızlı bir kaide.' },
  kivilcim: { slot: 'aura', ad: 'Kor kıvılcımı', fiyat: 90, d: 'Etrafında yükselen sıcak kıvılcımlar.' },
  kar: { slot: 'aura', ad: 'Kar taneleri', fiyat: 90, d: 'Üstüne usul usul kar yağar.' },
  kelebek: { slot: 'aura', ad: 'Kelebekler', fiyat: 120, d: 'Çevresinde uçuşan küçük kelebekler.' },
  yildiz: { slot: 'aura', ad: 'Yıldız tozu', fiyat: 170, d: 'Pullarında göz kırpan yıldızcıklar.' },
  cicektac: { slot: 'bas', ad: 'Çiçek tacı', fiyat: 70, d: 'Papatya ve gelincikten örülmüş bir taç.' },
  sorguc: { slot: 'bas', ad: 'Tüylü sorguç', fiyat: 140, d: 'Mücevherli tokaya takılı uzun bir tüy.' },
  altintac: { slot: 'bas', ad: 'Altın taç', fiyat: 260, d: 'Yakut taşlı altın bir taç.' },
  bandana: { slot: 'boyun', ad: 'Kırmızı yazma', fiyat: 50, d: 'Boynuna bağlanmış oyalı bir yazma.' },
  can: { slot: 'boyun', ad: 'Bakır çan', fiyat: 70, d: 'Her adımda tıngırdayan küçük bir çan.' },
  nazar: { slot: 'boyun', ad: 'Nazar boncuğu', fiyat: 100, d: 'Kem gözlere karşı mavi bir boncuk.' },
  kurdele: { slot: 'kuyruk', ad: 'Kurdele', fiyat: 40, d: 'Kuyruğuna bağlanmış ipek bir fiyonk.' },
  halka: { slot: 'kuyruk', ad: 'Altın kuyruk halkası', fiyat: 110, d: 'Kuyruğunu saran işlemeli altın halkalar.' },
};
const COS_GEO = /* çizimlerden %1 ızgarayla elle okundu: taç tabanı L-R, kayış e1-e2 (boyun kenarları), kuyruk alt kenarı giriş noktaları, dış normal°, kurdele bandı P-Q, kuyruk kalınlığı (H oranı) */ {"ates-yavru":{"L":[0.64,0.24],"R":[0.78,0.25],"e1":[0.5249,0.5122],"e2":[0.7415,0.5821],"pts":[[0.145,0.765],[0.17,0.8],[0.205,0.833]],"n":130,"P":[0.1504,0.8492],"Q":[0.2081,0.7013],"th":0.0993,"rings":[{"c":[0.1457,0.7916],"r":0.0238,"a0":250.0,"a1":310.0,"dir":1,"hole":[0.1572,0.7733]},{"c":[0.1837,0.844],"r":0.0219,"a0":234.0,"a1":292.0,"dir":1,"hole":[0.1898,0.8236]},{"c":[0.2294,0.8766],"r":0.02,"a0":220.0,"a1":278.0,"dir":1,"hole":[0.2315,0.8568]}],"top":[0.1985,0.7259],"u":[0.887,0.461],"throat":[0.735,0.58]},"ates-genc":{"L":[0.81,0.295],"R":[0.9,0.315],"e1":[0.7417,0.4564],"e2":[0.8602,0.5072],"pts":[[0.057,0.645],[0.068,0.68],[0.086,0.713]],"n":150,"P":[0.0166,0.7075],"Q":[0.1259,0.6265],"th":0.0646,"rings":[{"c":[0.0304,0.6713],"r":0.0155,"a0":264.0,"a1":316.0,"dir":1,"hole":[0.0388,0.6606]},{"c":[0.0538,0.7054],"r":0.0143,"a0":244.0,"a1":302.0,"dir":1,"hole":[0.0595,0.6933]},{"c":[0.0759,0.7405],"r":0.013,"a0":246.0,"a1":302.0,"dir":1,"hole":[0.081,0.7295]}],"top":[0.0886,0.6542],"u":[0.486,0.874],"throat":[0.855,0.505]},"ates-yetiskin":{"L":[0.83,0.31],"R":[0.9,0.335],"e1":[0.7424,0.4484],"e2":[0.872,0.5016],"pts":[[0.05,0.805],[0.062,0.845],[0.088,0.875]],"n":144,"P":[0.0215,0.8732],"Q":[0.1255,0.7808],"th":0.066,"rings":[{"c":[0.0516,0.8179],"r":0.0158,"a0":264.0,"a1":322.0,"dir":1,"hole":[0.061,0.8081]},{"c":[0.0705,0.8563],"r":0.0146,"a0":246.0,"a1":306.0,"dir":1,"hole":[0.0769,0.8445]},{"c":[0.0967,0.8882],"r":0.0133,"a0":232.0,"a1":288.0,"dir":1,"hole":[0.0998,0.8755]}],"top":[0.1034,0.8004],"u":[0.555,0.832],"throat":[0.868,0.5]},"buz-yavru":{"L":[0.63,0.23],"R":[0.77,0.23],"e1":[0.5441,0.5516],"e2":[0.7809,0.6284],"pts":[[0.123,0.848],[0.152,0.872],[0.185,0.89]],"n":117,"P":[0.1351,0.9515],"Q":[0.1789,0.7955],"th":0.0951,"rings":[{"c":[0.1335,0.8767],"r":0.0228,"a0":232.0,"a1":286.0,"dir":1,"hole":[0.1382,0.8548]},{"c":[0.1774,0.9093],"r":0.021,"a0":228.0,"a1":286.0,"dir":1,"hole":[0.1817,0.8891]},{"c":[0.2235,0.9341],"r":0.0192,"a0":214.0,"a1":270.0,"dir":1,"hole":[0.2235,0.9149]}],"top":[0.1804,0.7903],"u":[0.936,0.351],"throat":[0.755,0.62]},"buz-genc":{"L":[0.8,0.37],"R":[0.89,0.395],"e1":[0.7324,0.4857],"e2":[0.8463,0.5508],"pts":[[0.065,0.86],[0.095,0.883],[0.128,0.896]],"n":113,"P":[0.0761,0.9556],"Q":[0.1234,0.8014],"th":0.0569,"rings":[{"c":[0.0794,0.8756],"r":0.0137,"a0":232.0,"a1":288.0,"dir":1,"hole":[0.0826,0.8626]},{"c":[0.1061,0.8936],"r":0.0126,"a0":222.0,"a1":276.0,"dir":1,"hole":[0.107,0.8811]},{"c":[0.1348,0.9045],"r":0.0115,"a0":212.0,"a1":268.0,"dir":1,"hole":[0.1345,0.893]}],"top":[0.1145,0.8303],"u":[0.926,0.379],"throat":[0.81,0.53]},"buz-yetiskin":{"L":[0.86,0.28],"R":[0.92,0.295],"e1":[0.8001,0.3835],"e2":[0.9159,0.4368],"pts":[[0.055,0.885],[0.084,0.91],[0.115,0.926]],"n":117,"P":[0.0756,0.9843],"Q":[0.1194,0.8282],"th":0.0701,"rings":[{"c":[0.0739,0.9234],"r":0.0168,"a0":236.0,"a1":294.0,"dir":1,"hole":[0.079,0.908]},{"c":[0.1064,0.9467],"r":0.0155,"a0":218.0,"a1":274.0,"dir":1,"hole":[0.1072,0.9313]},{"c":[0.1428,0.9564],"r":0.0141,"a0":202.0,"a1":262.0,"dir":1,"hole":[0.1413,0.9424]}],"top":[0.1094,0.864],"u":[0.936,0.351],"throat":[0.912,0.435]},"firtina-yavru":{"L":[0.66,0.29],"R":[0.8,0.31],"e1":[0.5541,0.587],"e2":[0.7509,0.648],"pts":[[0.1,0.88],[0.13,0.905],[0.165,0.922]],"n":116,"P":[0.1151,0.9765],"Q":[0.1589,0.8205],"th":0.1049,"rings":[{"c":[0.1126,0.9049],"r":0.0252,"a0":258.0,"a1":304.0,"dir":1,"hole":[0.1232,0.884]},{"c":[0.1614,0.9392],"r":0.0232,"a0":218.0,"a1":276.0,"dir":1,"hole":[0.1633,0.9161]},{"c":[0.2158,0.9539],"r":0.0211,"a0":200.0,"a1":258.0,"dir":1,"hole":[0.2125,0.9332]}],"top":[0.1615,0.8114],"u":[0.936,0.351],"throat":[0.725,0.64]},"firtina-genc":{"L":[0.81,0.33],"R":[0.9,0.36],"e1":[0.7401,0.4634],"e2":[0.8439,0.5118],"pts":[[0.058,0.825],[0.078,0.856],[0.11,0.883]],"n":130,"P":[0.0331,0.9037],"Q":[0.1284,0.7958],"th":0.0799,"rings":[{"c":[0.0539,0.8489],"r":0.0181,"a0":250.0,"a1":306.0,"dir":1,"hole":[0.0619,0.8343]},{"c":[0.0756,0.8931],"r":0.0166,"a0":224.0,"a1":284.0,"dir":1,"hole":[0.0786,0.877]},{"c":[0.119,0.9126],"r":0.0152,"a0":202.0,"a1":270.0,"dir":1,"hole":[0.119,0.8974]}],"top":[0.1042,0.8232],"u":[0.647,0.763],"throat":[0.84,0.51]},"firtina-yetiskin":{"L":[0.86,0.25],"R":[0.925,0.265],"e1":[0.7901,0.3634],"e2":[0.8939,0.4118],"pts":[[0.085,0.932],[0.115,0.938],[0.145,0.94]],"n":96,"P":[0.0888,1.0129],"Q":[0.1107,0.8488],"th":0.0868,"rings":[{"c":[0.0796,0.9419],"r":0.0181,"a0":224.0,"a1":280.0,"dir":1,"hole":[0.0819,0.9242]},{"c":[0.1159,0.9685],"r":0.0166,"a0":200.0,"a1":256.0,"dir":1,"hole":[0.1129,0.9524]},{"c":[0.1568,0.9609],"r":0.0152,"a0":186.0,"a1":250.0,"dir":1,"hole":[0.1529,0.9466]}],"top":[0.1083,0.8666],"u":[0.985,0.175],"throat":[0.89,0.41]},"toprak-yavru":{"L":[0.66,0.29],"R":[0.8,0.3],"e1":[0.5844,0.5773],"e2":[0.7846,0.6374],"pts":[[0.1,0.92],[0.13,0.929],[0.165,0.929]],"n":90,"P":[0.1331,0.9904],"Q":[0.1409,0.8241],"th":0.0993,"rings":[{"c":[0.1156,0.94],"r":0.0238,"a0":208.0,"a1":264.0,"dir":1,"hole":[0.1137,0.9163]},{"c":[0.1674,0.9417],"r":0.0219,"a0":196.0,"a1":254.0,"dir":1,"hole":[0.1629,0.9206]},{"c":[0.2199,0.9317],"r":0.02,"a0":184.0,"a1":244.0,"dir":1,"hole":[0.2133,0.9137]}],"top":[0.1403,0.8372],"u":[0.998,0.062],"throat":[0.76,0.63]},"toprak-genc":{"L":[0.8,0.32],"R":[0.89,0.35],"e1":[0.73,0.4525],"e2":[0.8289,0.502],"pts":[[0.095,0.873],[0.125,0.858],[0.155,0.844]],"n":70,"P":[0.1432,0.9297],"Q":[0.1073,0.7701],"th":0.0431,"rings":[{"c":[0.1135,0.8696],"r":0.0103,"a0":160.0,"a1":220.0,"dir":1,"hole":[0.1076,0.863]},{"c":[0.1339,0.8562],"r":0.0095,"a0":176.0,"a1":234.0,"dir":1,"hole":[0.1297,0.8485]},{"c":[0.1553,0.8467],"r":0.0087,"a0":178.0,"a1":240.0,"dir":1,"hole":[0.152,0.8392]}],"top":[0.1173,0.8146],"u":[0.958,-0.287],"throat":[0.825,0.5]},"toprak-yetiskin":{"L":[0.84,0.27],"R":[0.9,0.285],"e1":[0.7802,0.3831],"e2":[0.8819,0.4319],"pts":[[0.095,0.916],[0.125,0.903],[0.155,0.891]],"n":73,"P":[0.1354,0.9741],"Q":[0.1051,0.8124],"th":0.0792,"rings":[{"c":[0.111,0.9282],"r":0.0181,"a0":178.0,"a1":238.0,"dir":1,"hole":[0.1038,0.9129]},{"c":[0.1492,0.9158],"r":0.0166,"a0":188.0,"a1":248.0,"dir":1,"hole":[0.1445,0.9004]},{"c":[0.1882,0.9081],"r":0.0152,"a0":190.0,"a1":246.0,"dir":1,"hole":[0.1836,0.8943]}],"top":[0.1108,0.8427],"u":[0.97,-0.243],"throat":[0.878,0.43]},"golge-yavru":{"L":[0.64,0.27],"R":[0.78,0.3],"e1":[0.5643,0.5867],"e2":[0.7511,0.6468],"pts":[[0.16,0.853],[0.19,0.865],[0.22,0.876]],"n":106,"P":[0.1706,0.9443],"Q":[0.2144,0.7882],"th":0.0778,"rings":[{"c":[0.1717,0.8734],"r":0.0187,"a0":242.0,"a1":302.0,"dir":1,"hole":[0.1791,0.8576]},{"c":[0.205,0.909],"r":0.0172,"a0":230.0,"a1":286.0,"dir":1,"hole":[0.2086,0.8925]},{"c":[0.2424,0.9302],"r":0.0157,"a0":212.0,"a1":272.0,"dir":1,"hole":[0.2428,0.9146]}],"top":[0.2073,0.8136],"u":[0.936,0.351],"throat":[0.73,0.64]},"golge-genc":{"L":[0.82,0.33],"R":[0.9,0.35],"e1":[0.7501,0.4634],"e2":[0.8539,0.5118],"pts":[[0.043,0.71],[0.055,0.745],[0.075,0.775]],"n":147,"P":[0.0329,0.8366],"Q":[0.1363,0.7429],"th":0.0778,"rings":[{"c":[0.0562,0.789],"r":0.0181,"a0":232.0,"a1":280.0,"dir":1,"hole":[0.0585,0.7712]},{"c":[0.0987,0.8137],"r":0.0166,"a0":230.0,"a1":294.0,"dir":1,"hole":[0.1038,0.7986]},{"c":[0.1292,0.8495],"r":0.0152,"a0":212.0,"a1":276.0,"dir":1,"hole":[0.1304,0.8344]}],"top":[0.1303,0.7484],"u":[0.562,0.827],"throat":[0.85,0.51]},"golge-yetiskin":{"L":[0.87,0.275],"R":[0.93,0.29],"e1":[0.7951,0.3634],"e2":[0.8989,0.4118],"pts":[[0.058,0.83],[0.07,0.863],[0.092,0.893]],"n":144,"P":[0.1019,0.9871],"Q":[0.1521,0.8344],"th":0.1042,"rings":[{"c":[0.0946,0.9377],"r":0.0181,"a0":226.0,"a1":280.0,"dir":1,"hole":[0.0969,0.9199]},{"c":[0.1361,0.9418],"r":0.0166,"a0":196.0,"a1":256.0,"dir":1,"hole":[0.1331,0.9257]},{"c":[0.1736,0.958],"r":0.0152,"a0":218.0,"a1":274.0,"dir":1,"hole":[0.1744,0.9429]}],"top":[0.1402,0.8707],"u":[0.916,0.401],"throat":[0.895,0.41]}};
const COS_ANCHOR = /* elle işaretlendi: [x, y, açı°] çizim kutusuna oranla */ {"ates-yavru":{"bas":[0.74,0.21,8],"neck":[0.67,0.53,-12],"tail":[0.18,0.758,26,1.0]},"ates-genc":{"bas":[0.87,0.24,10],"neck":[0.83,0.48,-30],"tail":[0.07,0.629,75,0.54]},"ates-yetiskin":{"bas":[0.86,0.28,15],"neck":[0.82,0.47,-25],"tail":[0.08,0.802,63,0.68]},"buz-yavru":{"bas":[0.77,0.27,5],"neck":[0.72,0.58,-10],"tail":[0.13,0.781,15,1.15]},"buz-genc":{"bas":[0.84,0.35,10],"neck":[0.8,0.52,-30],"tail":[0.08,0.8,40,1.15]},"buz-yetiskin":{"bas":[0.87,0.32,12],"neck":[0.84,0.45,-25],"tail":[0.06,0.828,45,1.15]},"firtina-yavru":{"bas":[0.8,0.27,10],"neck":[0.7,0.63,-10],"tail":[0.15,0.809,17,0.4]},"firtina-genc":{"bas":[0.87,0.29,15],"neck":[0.82,0.53,-30],"tail":[0.09,0.791,42,1.15]},"firtina-yetiskin":{"bas":[0.87,0.26,15],"neck":[0.84,0.42,-25],"tail":[0.1,0.927,-10,0.8]},"toprak-yavru":{"bas":[0.79,0.28,8],"neck":[0.72,0.64,-10],"tail":[0.12,0.892,-9,0.65]},"toprak-genc":{"bas":[0.84,0.3,12],"neck":[0.8,0.5,-30],"tail":[0.11,0.845,-22,0.49]},"toprak-yetiskin":{"bas":[0.83,0.29,12],"neck":[0.8,0.45,-25],"tail":[0.12,0.872,-27,1.0]},"golge-yavru":{"bas":[0.78,0.29,8],"neck":[0.72,0.6,-10],"tail":[0.17,0.769,25,1.15]},"golge-genc":{"bas":[0.86,0.3,12],"neck":[0.82,0.5,-30],"tail":[0.06,0.695,65,0.84]},"golge-yetiskin":{"bas":[0.885,0.275,15],"neck":[0.83,0.4,-25],"tail":[0.08,0.822,50,1.08]}};

/* Mevsimler: 20 haftalık sezon dörde bölünür. O mevsimin elementi dövüşte ve antrenmanda %10 güçlüdür. */
const SEASONS = [
  { k: 'bahar', ad: 'İlkbahar', el: 'firtina', fx: 'rain', d: 'Bahar fırtınaları: Fırtına ejderhaları güçlü.' },
  { k: 'yaz', ad: 'Yaz', el: 'ates', fx: 'embers', d: 'Kavurucu yaz: Ateş ejderhaları güçlü.' },
  { k: 'guz', ad: 'Sonbahar', el: 'toprak', fx: 'dust', d: 'Hasat mevsimi: Toprak ejderhaları güçlü.' },
  { k: 'kis', ad: 'Kış', el: 'buz', fx: 'snow', d: 'Uzun kış geceleri: Buz ejderhaları güçlü, Gölge ejderhaları da biraz.' },
];
function seasonOf(w) { return SEASONS[Math.min(3, Math.floor(((w || S.week) - 1) / 5))]; }
function seasonMult(el, w) { const s = seasonOf(w); return el === s.el ? 1.1 : (s.k === 'kis' && el === 'golge') ? 1.05 : 1; }
