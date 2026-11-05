'use strict';
/* ============ EJDER OCAĞI — BAĞ: KİŞİSEL HİKÂYELER, LAKAPLAR, YAŞLILIK ============
   Bağ 30, 60 ve 90'ı ilk aştığında o ejderhaya özel bir sahne açılır. Sahne ejderhanın kökenine
   (dededen kalan, pazardan alınan, yumurtadan çıkan, yabanda bulunan) ve karakter izine göre değişir.
   90'daki sahne kalıcı bir "can bağı" verir. Lakaplar yaşananlardan kendiliğinden doğar.
   Yetişkin bir ejderha 34 haftalık olunca yaşlanır: dövüşmez, gençlere hocalık eder. */

const OLD_AGE = 34;
function originKind(d) {
  const o = d.origin || '';
  if (o === 'Dedenden kaldı') return 'kor';
  if (o.includes('Dedenin yumurtası')) return 'dede';
  if (d.parents) return 'bred';
  if (/Pazar|Müzayede/.test(o)) return 'bought';
  if (/yumurta/i.test(o)) return 'hatched';
  return 'wild';
}
const himher = d => d.sex === 'F' ? 'o' : 'o'; // Türkçede cinsiyetsiz; ileride gerekirse
const MARK_LINE = {
  Cesur: n => `${n} burnunu dikip sana bakıyor; korkmadığını göstermek istiyor ama gözleri yumuşak.`,
  Temkinli: n => `${n} önce etrafı kolaçan ediyor, sonra yalnızca sana güvenip yaklaşıyor.`,
  Sıcak: n => `${n} başını omzuna yaslıyor. Pullarından yayılan sıcaklık bir battaniye gibi.`,
  Mesafeli: n => `${n} her zamanki gibi birkaç adım uzakta duruyor; ama bu kez gitmiyor.`,
  Disiplinli: n => `${n} her akşamki gibi tam vaktinde ahırın kapısında bekliyor.`,
  Asi: n => `${n} kuyruğuyla kovayı deviriyor, sonra sana bakıp masum masum göz kırpıyor.`,
};
const n = '{n}'; // seçenek sonuç metinlerinde yer tutucu; çalışırken ejderhanın adıyla değişir
// her köken için üç bölüm: [başlık, metin, seçenekler: [metin, sonuç, etki]]
const STORIES = {
  kor: [
    ['Dedenin sesi', () => `Gece yarısı {n:acc} ocağın başında buluyorsun. Gözleri dedenin eski eğerinde. Sana bakıp alçak bir hırıltı çıkarıyor; sanki "o burada otururdu" diyor.`,
      [['Eğeri ona doğru it', `{n} eğeri burnuyla kokluyor ve yanına kıvrılıyor. O gece ilk kez senin yanında uyuyor.`, d => addBond(d, 3)],
       ['Dedenin türküsünü mırıldan', `{n:gen} kuyruğu türküyle birlikte ritim tutuyor. Bu şarkıyı bildiğini bilmiyordun.`, d => { addMood(d, 1); nudge(d, 'sic', 6); }]]],
    ['Eski yara', () => `{n:gen} göğsündeki eski bir yara izini fark ediyorsun. Dokununca irkiliyor, ama çekilmiyor. Muhtar bir zamanlar anlatmıştı: deden bir çığdan onu bu yarayla çıkarmış.`,
      [['Yarayı merhemle ov', `{n} gözlerini kapatıyor. Yıllardır kimse o yaraya dokunmamış.`, d => { addBond(d, 3); nudge(d, 'sic', 5); }],
       ['"Artık ben buradayım" de', `{n} başını kaldırıp sana uzun uzun bakıyor. Sonra bir kez, kararlı, başını sallıyor.`, d => { addBond(d, 2); nudge(d, 'ces', 6); }]]],
    ['Kor ve sen', () => `Sabah ocağa geldiğinde {n} seni kapıda bekliyor. Ağzında dedenin kemerinden kopmuş eski bir tunç toka var. Onu ayaklarının dibine bırakıyor.`,
      [['Tokayı boynuna as', `Toka göğsünde parlıyor. {n} artık dedenin değil, senin ejderhan. Bunu ikiniz de biliyorsunuz.`, null],
       ['Tokayı onun kemerine tak', `Toka {n:gen} koşumunda parlıyor. Gururla kabarıyor; ikiniz de artık aynı ailedensiniz.`, null]]],
  ],
  dede: [
    ['Ilık kabuk', () => `{n} yumurta kabuğundan kalan bir parçayı inine saklamış. Ona her dokunduğunda mırlıyor. Dedenin son emaneti olduğunu biliyor mu acaba?`,
      [['Kabuğu kolyeye çevir', `{n} kolyeyi her gün kokluyor. Kabuğun ılıklığı hiç geçmiyor.`, d => addBond(d, 3)],
       ['Kabuğu ocağın taşına göm', `{n} kabuğun gömüldüğü taşın üstüne kıvrılıyor. Orayı kendi yeri belledi.`, d => { addMood(d, 1); nudge(d, 'dis', 5); }]]],
    ['İlk rüya', () => `{n} uykusunda kanatlarını çırpıyor, sonra korkuyla uyanıyor. Gözleri seni arıyor. Bulunca derin bir nefes alıyor.`,
      [['Yanına uzan, sabaha kadar bekle', `Sabah ikiniz de yorgunsunuz. Ama {n} artık kâbusların sen varken gelmediğini biliyor.`, d => { addBond(d, 3); nudge(d, 'sic', 5); }],
       ['Ona yıldızları göster', `Ejder'in Kuyruğu'nu gösteriyorsun. {n} uzun uzun bakıyor ve bir daha korkuyla uyanmıyor.`, d => { addMood(d, 1); nudge(d, 'ces', 5); }]]],
    ['Dedenin mirası', () => `{n} seni dedenin eski ambarına götürüyor ve toprağı eşelemeye başlıyor. Altından kehribar gözlü küçük bir ejderha heykeli çıkıyor. Dedenin el yazısıyla: "Bunu bulan, yumurtayı sevmiştir."`,
      [['Heykeli ocağın başına koy', `{n} her sabah heykelin yanından geçerken başını eğiyor.`, null],
       ['Heykeli ona hediye et', `{n} heykeli inine taşıyor ve etrafına kıvrılıyor. Hazinesi bu.`, null]]],
  ],
  bred: [
    ['Annesinin kokusu', () => `{n} ${'{p0}'}'un yanına sokulup onu kokluyor, sonra sana koşuyor. İkiniz arasında gidip geliyor; sanki iki ailesi olduğunu anlatmaya çalışıyor.`,
      [['Üçünüz birlikte oturun', `Ocağın başı o akşam kalabalık ve sıcak. {n} ikinizin arasında uyuyakalıyor.`, d => addBond(d, 3)],
       ['Ona kendi inini göster', `{n} kendi inine gururla bakıyor. Artık büyüdüğünü hissediyor.`, d => { addMood(d, 1); nudge(d, 'ces', 5); }]]],
    ['İlk uçuş', () => `{n} uçurumun kenarında duruyor. Kanatları titriyor. Sana dönüp bakıyor: atlasın mı?`,
      [['Başını salla', `{n} atlıyor. Bir an düşüyor, sonra kanatları açılıyor ve göğe yükseliyor. Döndüğünde gözleri ışıl ışıl.`, d => { addBond(d, 3); nudge(d, 'ces', 6); }],
       ['Önce birlikte koşun', `Yamaçtan aşağı birlikte koşuyorsunuz; {n} hızlanıyor, hızlanıyor ve ayakları yerden kesiliyor.`, d => { addBond(d, 2); nudge(d, 'sic', 5); }]]],
    ['Ocağın çocuğu', () => `{n} senin elinde yumurtadan çıktı, senin elinde büyüdü. Bu sabah ilk kez seni koruyormuş gibi önüne geçiyor; yoldan geçen bir köpeğe hırlıyor.`,
      [['Başını okşa', `{n} gururla homurdanıyor. Artık o da ocağı koruyanlardan.`, null],
       ['Gülüp köpeği sev', `{n} şaşkın bakıyor, sonra köpekle oynamaya başlıyor. Koruyucu ama yumuşak kalpli.`, null]]],
  ],
  bought: [
    ['Eski sahibinin izi', () => `{n:gen} koşumunun iç yüzüne kazınmış bir isim buluyorsun: başka birinin adı. {n} o yere her dokunduğunda geriliyor.`,
      [['Koşumu değiştir', `Yeni koşumu kendi ellerinle dikiyorsun. {n} eskisinin yakıldığı ateşe uzun uzun bakıyor, sonra sana dönüyor.`, d => addBond(d, 3)],
       ['İsmi kazı, yanına kendi adını yaz', `{n} yeni ismi kokluyor. Geçmişini silmedin; sadece yanına yenisini ekledin.`, d => { addMood(d, 1); nudge(d, 'dis', 5); }]]],
    ['Kafes korkusu', () => `Kuluçkanın demir kapısı kapanınca {n} birden panikliyor; duvarlara çarpıyor. Pazarda ne kadar kafeste kaldığını hiç düşünmemiştin.`,
      [['Kapıyı ardına kadar aç', `{n} kapının açık kaldığını görünce sakinleşiyor. O gece kapıyı hiç kapatmıyorsun.`, d => { addBond(d, 3); nudge(d, 'sic', 5); }],
       ['İçeri gir, yanında otur', `Kafeste yalnız olmadığını görünce {n:gen} titremesi geçiyor.`, d => { addBond(d, 2); nudge(d, 'ces', 5); }]]],
    ['Satın alınmadı, seçildi', () => `Pazardaki tüccar uğruyor ve {n} için iki katı altın teklif ediyor. {n} kulağını dikip sana bakıyor; bekliyor.`,
      [['"Satılık değil"', `Tüccar omuz silkip gidiyor. {n} kocaman bir kuyruk vuruşuyla tozları havaya kaldırıyor; bu onun sevinç dansı.`, null],
       ['Tüccarı ocaktan kov', `Tüccar kaçarcasına gidiyor. {n} sana yaslanıp uzun uzun mırlıyor.`, null]]],
  ],
  hatched: [
    ['Kabuktan sonra', () => `{n} hâlâ kabuğundan çıktığı yuvaya dönüp orada uyumayı seviyor. Büyüdü, yuvaya sığmıyor artık; ama inat ediyor.`,
      [['Yuvayı büyüt', `Kenarlarına saman ekliyorsun. {n} sığınca memnun bir iç çekiyor.`, d => addBond(d, 3)],
       ['Ona yeni bir yuva yap', `{n} yeni yuvayı önce beğenmiyor, sonra eskisinden bir saman çöpünü taşıyıp ortasına koyuyor.`, d => { addMood(d, 1); nudge(d, 'dis', 5); }]]],
    ['Bulunduğu yer', () => `{n:acc} yumurtasının bulunduğu yere götürüyorsun. Etrafı kokluyor, bir taşın dibini eşeliyor. Belki annesinin bir izini arıyor.`,
      [['Onunla birlikte ara', `Bir kabuk parçası buluyorsunuz. {n} onu ağzında ocağa taşıyor.`, d => { addBond(d, 3); nudge(d, 'sic', 5); }],
       ['"Ailen artık biziz" de', `{n} bir süre daha kokluyor, sonra arkasını dönüp seninle eve yürüyor.`, d => { addBond(d, 2); nudge(d, 'ces', 5); }]]],
    ['Senin ejderhan', () => `{n} sabah seni uyandırıyor, burnuyla dürterek. Elinde ilk gün kabuğunu sildiğin bez var; onu bir yerden bulup getirmiş.`,
      [['Bezi ona geri ver', `{n} bezi inine taşıyor. En değerli eşyası.`, null],
       ['Bezi boynuna bağla', `{n} boynundaki bezle gururla geziniyor. Herkes görsün istiyor.`, null]]],
  ],
  wild: [
    ['Yabanın çağrısı', () => `Gece uzaklardan bir ejderha çığlığı geliyor. {n} kulak kabartıyor, kanatlarını açıyor. Kapıya doğru yürüyor, duruyor ve sana bakıyor.`,
      [['Gitmesine izin ver', `{n} karanlığa uçuyor. Sabaha karşı geri dönüyor ve inine kıvrılıyor. Kendi isteğiyle.`, d => { addBond(d, 4); nudge(d, 'dis', -4); }],
       ['Yanına git ve otur', `{n} çağrıya bir kez cevap veriyor, sonra yanına uzanıyor. Burası artık onun yuvası.`, d => { addBond(d, 2); nudge(d, 'sic', 5); }]]],
    ['Avcı içgüdüsü', () => `{n} sana getirdiği bir tavşanı ayaklarının dibine bırakıyor. Kendi avından pay ayırmış; yabanda bu en büyük saygı.`,
      [['Payını kabul et', `Tavşanı ateşte pişiriyorsun, yarısını ona veriyorsun. {n} memnun.`, d => { addBond(d, 3); nudge(d, 'ces', 4); }],
       ['Ona geri ver, okşa', `{n} şaşırıyor ama yiyor. Yanında karnının doyduğunu anlıyor.`, d => { addMood(d, 1); nudge(d, 'sic', 5); }]]],
    ['Evcil değil, sadık', () => `{n} hâlâ yabani. Başkalarına hırlıyor, köpekleri kovalıyor. Ama sen ıslık çaldığında dünyanın öbür ucundan bile geliyor.`,
      [['Islığını ona öğret', `Artık kendi ıslığınız var. {n} o sesi duyunca her şeyi bırakıp koşuyor.`, null],
       ['Ona bir isim fısılda', `Kimsenin bilmediği gizli bir isim. {n} onu duyunca gözlerini kapatıyor.`, null]]],
  ],
};
const OLD_STORY = ['Yaşlı kanatlar', () => `{n} bu sabah ahırdan çıkarken duraksıyor. Pulları ağarmış, adımları ağırlaşmış. Arenanın tozuna uzun uzun bakıyor, sonra yavruların oynadığı yere dönüyor.`,
  [['Onu emekliye ayır, hoca yap', `{n} artık dövüşmeyecek. Ama yavruların her antrenmanında başlarında duruyor, homurdanarak düzeltiyor. Bilgeliği ocağın en değerli hazinesi.`, null],
   ['Yanına otur, eski günleri an', `İlk zaferini, ilk yarasını, ilk kez sana yaslandığı günü konuşuyorsunuz. {n} gözlerini kapatıp dinliyor.`, d => addBond(d, 5)]]];

/* ---------- Sıra ve gösterim ---------- */
const nameFill = (s, d) => s.replace(/\{n:gen\}/g, ek(esc(d.name), 'gen')).replace(/\{n:acc\}/g, ek(esc(d.name), 'acc')).replace(/\{n\}/g, esc(d.name));
function bondCheck(d, was) {
  if (!S || d.dead || !d.id) return;
  d.storyLv = d.storyLv || 0;
  for (const [lv, th] of [[1, 30], [2, 60], [3, 90]]) if (d.storyLv < lv && d.bond >= th && (was == null || was < th || d.storyLv < lv)) {
    d.storyLv = lv; S.storyQ = S.storyQ || []; S.storyQ.push({ id: d.id, lv });
  }
}
function storyFlush() {
  if (!S || !S.storyQ || !S.storyQ.length) return;
  const q = S.storyQ.splice(0); for (const it of q) pushModal(() => storyModal(it));
}
let CUR_STORY = null;
function storyModal(it) {
  if (it.lv === 'career' || it.lv === 'retire') return careerScene(it);
  if (typeof BGM !== 'undefined') BGM.mood('bag');
  const d = byId(it.id); if (!d) return nextModal();
  const kind = originKind(d), sc = it.lv === 'old' ? OLD_STORY : STORIES[kind][it.lv - 1];
  CUR_STORY = { d, it, sc };
  const mk = marks(d)[0], fill = s => nameFill(s.replace(/\{p0\}'un/g, d.parents ? ek(esc(d.parents[0]), 'gen') : 'annesinin').replace(/\{p0\}/g, d.parents ? esc(d.parents[0]) : 'annesi'), d);
  const text = fill(sc[1]()) + (mk && MARK_LINE[mk] && it.lv !== 'old' ? ' ' + MARK_LINE[mk](esc(d.name)) : '');
  const opts = sc[2].map((o, i) => `<button class="vopt" data-a="storyopt" data-i="${i}">${o[0]}</button>`).join('');
  vn({ speaker: esc(d.name), kicker: it.lv === 'old' ? 'Yaşlılık' : `Bağ ${['', 'I', 'II', 'III'][it.lv]} · ${sc[0]}`, art: `<div class="vdr">${dragonSVG(d)}</div>`, text, opts, bg: sceneOr('ahir', sceneAhir(d.el)), cls: 'storyvn' });
  SFX.play('heart');
}
const BOND_ACT = {
  storyopt(el) {
    const { d, it, sc } = CUR_STORY, o = sc[2][+el.dataset.i];
    if (o[2]) o[2](d);
    let extra = '';
    if (it.lv === 3) { d.heart = true; extra = ` <b class="heart">Can bağı kuruldu.</b> ${esc(d.name)} artık senin için bir kez değil, her dövüşte yeniden kalkmaya çalışacak.`; snapAlbum('bond', 'Can bağı', `${d.name} ile aranızda kopmaz bir bağ var.`, d); chron(`${d.name} ile can bağı kuruldu.`); titleCheck(d); }
    if (it.lv === 'old') { snapAlbum('old', 'Bilge hoca', `${d.name} emekliye ayrıldı; artık yavruların hocası.`, d); }
    vn({ speaker: esc(d.name), kicker: sc[0], art: $('.vnart')?.innerHTML || '', text: nameFill(o[1], d).replace(/<[^>]+>/g, ''), after: extra ? `<p class="vnextra">${extra}</p>` : '', opts: `<button class="vopt primary" data-a="mclose">Devam</button>`, bg: sceneOr('ahir', sceneAhir(d.el)), cls: 'storyvn' });
    afterAction(true);
  },
};

/* ---------- Lakaplar ---------- */
const TITLES = [
  { k: 'tac', ad: 'Kızıl Taç', c: d => d.champ === 'tac' },
  { k: 'efsane', ad: 'Yaşayan Efsane', c: d => d.careerDone },
  { k: 'can', ad: 'Can Yoldaşı', c: d => d.heart },
  { k: 'demirkalp', ad: 'Demirkalp', c: d => (d.saved || 0) >= 3 },
  { k: 'kupa', ad: 'Kupa Şampiyonu', c: d => d.champ === 'kupa' },
  { k: 'cukur', ad: 'Çukurun Belası', c: d => (d.pitW || 0) >= 3 },
  { k: 'durmaz', ad: 'Durdurulamaz', c: d => (d.bestStreak || 0) >= 5 },
  { k: 'ruzgar', ad: d => d.sex === 'F' ? 'Rüzgârın Kızı' : 'Rüzgârın Oğlu', c: d => (d.raceW || 0) >= 2 },
  { k: 'bilge', ad: 'Bilge Hoca', c: d => d.old && !d.retired },
  { k: 'donen', ad: 'Ölümden Dönen', c: d => (d.saved || 0) >= 1 },
  { k: 'kurt', ad: 'Meydan Kurdu', c: d => d.w >= 10 },
  { k: 'yilmaz', ad: 'Yılmaz', c: d => d.l >= 5 && d.w >= 5 },
  { k: 'aday', ad: 'Kupa Adayı', c: d => (d.careerN || 0) >= 3 },
  { k: 'gozde', ad: 'Meydanın Gözdesi', c: d => (d.careerN || 0) >= 2 },
  { k: 'umut', ad: 'Umut Vaat Eden', c: d => (d.careerN || 0) >= 1 },
];
const titleName = T => typeof T.ad === 'function' ? T.ad : () => T.ad;
function titleOf(d) { if (!d || !d.titles || !d.titles.length) return null; const T = TITLES.find(t => d.titles.includes(t.k)); return T ? titleName(T)(d) : null; }
function titleTag(d) { const t = titleOf(d); return t ? `<span class="dtitle">“${t}”</span>` : ''; }
function titleCheck(d) {
  if (!d || d.dead || typeof d.id !== 'number') return;
  d.titles = d.titles || [];
  for (const T of TITLES) if (!d.titles.includes(T.k) && T.c(d)) {
    d.titles.push(T.k); const nm = titleName(T)(d);
    chron(`${d.name} artık "${nm}" diye anılıyor.`);
    if (typeof toast === 'function') setTimeout(() => toast(`Halk ${esc(d.name)} için yeni bir lakap uydurdu: <b>“${nm}”</b>`, 'goal'), 500);
  }
}

/* ---------- Yaşlılık ---------- */
function ageCheck(d, rep) {
  if (d.old || d.dead || d.stage !== 'yetiskin' || d.age < OLD_AGE) return;
  d.old = true; for (const s in d.equip) d.equip[s] = null;
  rep.push(`<b>${esc(d.name)} yaşlandı.</b> Artık dövüşmeyecek; ocaktaki gençlere hocalık edecek.`);
  chron(`${d.name} yaşlandı ve emekliye ayrıldı.`);
  S.storyQ = S.storyQ || []; S.storyQ.push({ id: d.id, lv: 'old' });
  titleCheck(d);
}
function mentorOf() { return S.dragons.filter(x => x.old && !x.dead).sort((a, b) => b.bond - a.bond)[0] || null; }
