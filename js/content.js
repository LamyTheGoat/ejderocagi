'use strict';
/* ============ EJDER OCAĞI — İÇERİK: DİYALOG, OLAY, SEFER ============ */

/* ---------- Diyaloglar ----------
   Her seçenek: eksen itmeleri (ces/sic/dis), bağ, moral. "ax": ejderhanın bu cevaba tepkisini belirleyen eksen.
   Ejderhanın o eksendeki eğilimi cevapla aynı yöndeyse daha çok sever, tersse küser. */
const TALKS = [
  { t: '{ad} sahanın kenarına oturmuş ufku izliyor. Yanına gidince başını sana çeviriyor.', o: [
    { t: '"Bugün sadece birlikte oturalım."', ax: 'sic', v: 6, bond: 5, mood: 1 },
    { t: '"Hadi kalk, rakipler beklemez!"', ax: 'dis', v: 6, bond: 1, extra: { ces: 2 } },
    { t: '"Ufukta ne var? Uçmak mı istiyorsun?"', ax: 'ces', v: 5, bond: 3 } ] },
  { t: '{ad} dünkü antrenmanda tökezledi. Seni görünce başını eğiyor.', o: [
    { t: '"Herkes düşer. Yarın yine deneriz."', ax: 'sic', v: 6, bond: 5 },
    { t: '"Daha dikkatli olmalısın. Bir daha olmasın."', ax: 'dis', v: 6, bond: 0 },
    { t: '"Tökezlemek mi? Sen hiçbir şeyden korkmazsın!"', ax: 'ces', v: 6, bond: 2 } ] },
  { t: 'Gece yarısı {ad} huzursuz. Uzaktan yabancı bir ejderhanın kükremesi geliyor.', o: [
    { t: 'Yanına uzan: "Buradayım, sakin ol."', ax: 'sic', v: 5, bond: 5, extra: { ces: -3 } },
    { t: '"Sen de kükre! Burası kimin, göster."', ax: 'ces', v: 7, bond: 2, extra: { dis: -2 } },
    { t: '"Uyu. Yarın uzun bir gün."', ax: 'dis', v: 5, bond: 1 } ] },
  { t: '{ad} kilerin kapısını burnuyla açmaya çalışırken yakalandı.', o: [
    { t: 'Gül ve bir parça et ver.', ax: 'sic', v: 5, bond: 6, mood: 1, extra: { dis: -5 } },
    { t: 'Sertçe uyar: "Kiler yasak!"', ax: 'dis', v: 7, bond: -2, extra: { sic: -3 } },
    { t: '"Kapıyı açabilirsen hak ettin demektir."', ax: 'ces', v: 3, bond: 3, stat: ['ze', 2], extra: { dis: -3 } } ] },
  { t: 'Pazar dönüşü {ad} kanatlarını sonuna kadar açıp sana gösteriş yapıyor.', o: [
    { t: '"Göklerin en güzeli sensin!"', ax: 'sic', v: 5, bond: 5, mood: 1 },
    { t: '"Gösteriş yerine kanat çırpışını çalış."', ax: 'dis', v: 6, bond: 0 },
    { t: '"Hadi, tepeye kadar yarışalım!"', ax: 'ces', v: 4, bond: 4, stat: ['ce', 2], fat: 6 } ] },
  { t: 'Bir dövüşten sonra {ad} hâlâ gergin. Rakibin kokusu üzerinden gitmemiş.', o: [
    { t: '"Bitti artık. Evdesin."', ax: 'sic', v: 5, bond: 4, extra: { ces: -2 } },
    { t: '"O öfkeyi sakla, bir sonrakine lazım olacak."', ax: 'ces', v: 6, bond: 2, extra: { dis: -3 } },
    { t: 'Birlikte yavaşça nefes alıp verin.', ax: 'dis', v: 5, bond: 2, mood: 1 } ] },
  { t: 'Köyden gelen bir çocuk {ad}\'ye titreyen eliyle bir elma uzatıyor.', o: [
    { t: '"Al, o bizim dostumuz."', ax: 'sic', v: 7, bond: 3 },
    { t: 'Çocuğu uzaklaştır: "Ejderhalar oyuncak değil."', ax: 'sic', v: -5, bond: 1, extra: { dis: 4 } },
    { t: '{ad}\'ye başını eğip selam vermeyi göster.', ax: 'dis', v: 4, bond: 3, extra: { sic: 3 } } ] },
  { t: 'Yağmur yağıyor. {ad} ininden çıkmak istemiyor.', o: [
    { t: '"Peki, bugün dinlen. Ama yarın erkenden."', ax: 'dis', v: 3, bond: 3, extra: { sic: 3 } },
    { t: '"Yağmur da senin rakibin. Dışarı!"', ax: 'dis', v: 6, bond: -2, extra: { ces: 3 } },
    { t: 'İçeri gir, birlikte yağmuru dinleyin.', ax: 'sic', v: 7, bond: 5 } ] },
  { t: '{ad} bir su birikintisindeki yansımasını gördü ve kendi gölgesine saldırıyor.', o: [
    { t: 'Kahkahayla izle.', ax: 'dis', v: -4, bond: 3, mood: 1, extra: { sic: 3 } },
    { t: '"Kendinle değil, rakiplerinle savaş."', ax: 'dis', v: 5, bond: 1, extra: { ces: 2 } },
    { t: 'Birikintinin yanına çömel, yansımanın ne olduğunu göster.', ax: 'sic', v: 3, bond: 3, stat: ['ze', 2] } ] },
  { t: 'Yaşlı bir terbiyeci {ad}\'ye bakıp "Bu ejderhada ateş yok" diyor.', o: [
    { t: '"Ateşi içinde. Sen göremiyorsun."', ax: 'ces', v: 5, bond: 5 },
    { t: '"Haklı olabilirsin. Daha çok çalışacağız."', ax: 'dis', v: 6, bond: -1 },
    { t: 'Adamı umursama, {ad}\'nin boynunu sıvazla.', ax: 'sic', v: 5, bond: 4 } ] },
  { t: '{ad} gece gökyüzünde Ejder Takımyıldızı\'na bakıyor.', o: [
    { t: 'Dedenin anlattığı efsaneyi anlat.', ax: 'sic', v: 4, bond: 4, extra: { dis: 2 } },
    { t: '"Bir gün sen de orada olacaksın."', ax: 'ces', v: 5, bond: 3, mood: 1 },
    { t: '"Haydi say bakalım, kaç yıldız var?"', ax: 'dis', v: 3, bond: 2, stat: ['ze', 3] } ] },
  { t: '{ad} başka bir ejderhayla aynı kemiğe uzandı. Hırlaşma başlamak üzere.', o: [
    { t: 'Araya gir ve ikisini ayır.', ax: 'dis', v: 5, bond: 1 },
    { t: 'Bırak kendi aralarında çözsünler.', ax: 'ces', v: 5, bond: 1, extra: { sic: -3 } },
    { t: '{ad}\'ye paylaşmayı öğret.', ax: 'sic', v: 5, bond: 3, extra: { dis: 2 } } ] },
  { t: 'Sabah {ad} sana küçük, parlak bir taş getirip ayaklarının dibine bıraktı.', o: [
    { t: 'Taşı ipe geçirip boynuna as.', ax: 'sic', v: 7, bond: 7, mood: 1 },
    { t: '"Teşekkürler. Şimdi işe dönelim."', ax: 'dis', v: 4, bond: 1 },
    { t: 'Taşı uzağa fırlat, oyun başlasın!', ax: 'dis', v: -4, bond: 3, mood: 1, extra: { ces: 2 } } ] },
  { t: '{ad} uzun süredir aynı noktaya pençesiyle çizgiler çiziyor.', o: [
    { t: 'Yanına çömel, çizgiyi sen devam ettir.', ax: 'sic', v: 4, bond: 4, stat: ['ze', 2] },
    { t: '"Bu bir savaş planı mı? Göster bakalım."', ax: 'ces', v: 4, bond: 2, extra: { dis: 2 } },
    { t: 'Rahatsız etmeden uzaklaş.', ax: 'sic', v: -4, bond: 2, mood: 1 } ] },
  { t: '{ad} ilk kez kendi başına kısa bir uçuş denedi ve sendeleyerek konmaya çalışıyor.', yavru: true, o: [
    { t: 'Koşup altına gir, düşerse tut.', ax: 'sic', v: 6, bond: 6, extra: { ces: -2 } },
    { t: 'Alkışla: "Bir daha! Daha yükseğe!"', ax: 'ces', v: 6, bond: 3, stat: ['ce', 2] },
    { t: '"Kanatlarını önce yerde güçlendirmeliyiz."', ax: 'dis', v: 6, bond: 1, stat: ['da', 2] } ] },
  { t: '{ad} kuyruğunu kovalayarak dönüp duruyor ve sonunda sersemleyip yere yığılıyor.', yavru: true, o: [
    { t: 'Yanına yatıp sen de başını döndür.', ax: 'dis', v: -5, bond: 5, mood: 1, extra: { sic: 3 } },
    { t: '"Kuyruk düşman değil. Bunu bir oyuna çevirelim."', ax: 'dis', v: 4, bond: 2, stat: ['ce', 2] },
    { t: 'Su ver, ateşi düşünce dinlensin.', ax: 'sic', v: 4, bond: 3 } ] },
  { id: 'cesur_iz', cond: d => hasMark(d, 'Cesur'), t: '{ad} pençesindeki eski dövüş izini yalıyor; gözlerinde korkudan eser yok, yeni bir meydan okuma arıyor.', o: [
    { t: '"Bu iz senin şerefin. Daha nicelerini kazanacağız!"', ax: 'ces', v: 7, bond: 5, mood: 1, stat: ['gu', 2] },
    { t: '"Cesaret güzel ama kalkanını da unutma."', ax: 'dis', v: 5, bond: 3, stat: ['da', 2] },
    { t: 'Yara izinin üstünü şefkatle okşa.', ax: 'sic', v: 5, bond: 5 } ] },
  { id: 'temkinli_gozcu', cond: d => hasMark(d, 'Temkinli'), t: '{ad} inin en yüksek taşına tünemiş, rüzgârın yönünü ve gölgeleri sessizce tartıyor.', o: [
    { t: 'Yanına çıkıp sessizce nöbete katıl.', ax: 'dis', v: 5, bond: 5, stat: ['ze', 2] },
    { t: '"Tehlike yok dostum, benim yanımda güvendesin."', ax: 'sic', v: 6, bond: 6, mood: 1 },
    { t: '"Gölgeden korkma, üstüne yürü!"', ax: 'ces', v: 6, bond: 1, extra: { dis: -2 } } ] },
  { id: 'sicak_omuz', cond: d => hasMark(d, 'Sıcak') || d.bond >= 70, t: '{ad} sen daha seslenmeden adımlarını tanıyıp kapıya koşuyor; başını yavaşça omzuna yaslıyor.', o: [
    { t: 'Alnını alnına daya: "İyi ki varsın."', ax: 'sic', v: 7, bond: 7, mood: 1 },
    { t: 'Birlikte nefes egzersizi yapıp odaklanın.', ax: 'dis', v: 5, bond: 4, stat: ['ze', 2] },
    { t: '"Hadi bakalım, bu enerjiyi gökyüzüne taşıyalım!"', ax: 'ces', v: 5, bond: 5, stat: ['ce', 2] } ] },
  { id: 'disiplin_idman', cond: d => hasMark(d, 'Disiplinli'), t: '{ad} sabah borusu çalmadan antrenman taşlarının karşısına geçmiş, kusursuz bir duruşla seni bekliyor.', o: [
    { t: 'Selam verip ağır idmanı başlat.', ax: 'dis', v: 7, bond: 4, stat: ['da', 2] },
    { t: '"Bugün yeterince çalıştın, biraz da keyfine bak."', ax: 'sic', v: 5, bond: 5, mood: 1, extra: { dis: -2 } },
    { t: '"Kuralları bırak, bugün içgüdülerinle saldır!"', ax: 'ces', v: 6, bond: 2, stat: ['gu', 2], extra: { dis: -3 } } ] },
  { id: 'asi_ruzgar', cond: d => hasMark(d, 'Asi'), t: '{ad} eyer kayışını dişleriyle çekiştirip yere fırlattı; özgürce uçmak istediğini belli ediyor.', o: [
    { t: 'Kayışı bırak, eyersiz birlikte uçmayı teklif et.', ax: 'ces', v: 6, bond: 6, mood: 1, stat: ['ce', 2] },
    { t: 'Sakince oturup kendi isteğiyle yaklaşmasını bekle.', ax: 'sic', v: 5, bond: 5 },
    { t: 'Kayışı yeniden bağla: "Kurallar ikimiz için de geçerli."', ax: 'dis', v: 7, bond: -1, stat: ['da', 2] } ] },
];
const REACT = {
  love: ['{ad} başını göğsüne dayıyor. Seni çok iyi anlıyor.', '{ad}\'nin gözleri parlıyor; tam da duymak istediği buydu.', '{ad} kanadıyla seni sarıyor.'],
  ok: ['{ad} bir süre düşünüyor, sonra yavaşça başını sallıyor.', '{ad} kulaklarını kıpırdatıyor. Mesaj alındı.', '{ad} homurdanıyor ama yanından ayrılmıyor.'],
  hate: ['{ad} burnundan kıvılcım saçıp arkasını dönüyor.', '{ad} bunu hiç beğenmedi. Kuyruğunu sertçe yere vuruyor.', '{ad} sana uzun, kırgın bir bakış atıyor.'],
};
const REACT_MARK = {
  Cesur: '{ad} cesur doğasına yakışır biçimde göğsünü kabartıp kükredi.',
  Temkinli: '{ad} temkinli bakışlarını yumuşatıp sana güvenle yaklaştı.',
  Sıcak: '{ad} sıcakkanlılıkla boynuna sürtünüp mırıltı çıkardı.',
  Mesafeli: '{ad} mesafeli duruşunu bozmadan hafifçe başını eğerek onayladı.',
  Disiplinli: '{ad} disiplinli bir terbiyeyle kanatlarını toplayıp selam durdu.',
  Asi: '{ad} asi ruhunun anlaşılmasından hoşnut, neşeyle kanat çırptı.',
};
const REACT_BOND = [
  'Aranızdaki derin bağ sayesinde tek bir bakış bile yetiyor.',
  'Kalp atışlarınız aynı ritimde buluşuyor; ocağın en sarsılmaz ikilisisiniz.',
  '{ad} senin sesindeki en ufak tonu bile yüreğinde hissediyor.',
];

function pickTalk(d) {
  d.seenTalk = d.seenTalk || [];
  const valid = (t, i) => (!t.yavru || d.stage !== 'yetiskin') && (!t.cond || t.cond(d));
  let pool = TALKS.map((t, i) => i).filter(i => !d.seenTalk.includes(i) && valid(TALKS[i], i) && i !== d.lastTalkId);
  const condPool = pool.filter(i => TALKS[i].cond);
  let i;
  if (condPool.length && chance(65)) {
    i = pick(condPool);
  } else if (pool.length) {
    i = pick(pool);
  } else {
    d.seenTalk = [];
    const fallback = TALKS.map((t, idx) => idx).filter(idx => valid(TALKS[idx], idx) && idx !== d.lastTalkId);
    i = fallback.length ? pick(fallback) : 0;
  }
  d.seenTalk.push(i);
  d.lastTalkId = i;
  return i;
}
function applyTalk(d, ti, oi) {
  const o = TALKS[ti].o[oi];
  const lean = d.pers[o.ax];
  d.talkMem = d.talkMem || { total: 0, loveStreak: 0, lastAx: null };
  let kind = 'ok', bond = o.bond;
  if (Math.sign(lean) === Math.sign(o.v) && Math.abs(lean) > 15) { kind = 'love'; bond += 3; }
  else if (Math.sign(lean) === -Math.sign(o.v) && Math.abs(lean) > 25) { kind = 'hate'; bond = -4; }

  const matchMark = o.v > 0 ? AXES[o.ax].p : AXES[o.ax].n;
  const hasMatchingMark = hasMark(d, matchMark);
  if (hasMatchingMark && kind !== 'hate') {
    kind = 'love';
    bond += 1;
  }

  d.talkMem.total++;
  if (kind === 'love') d.talkMem.loveStreak = (d.talkMem.loveStreak || 0) + 1;
  else if (kind === 'hate') d.talkMem.loveStreak = 0;
  d.talkMem.lastAx = o.ax;

  const fx = [];
  const ms = [nudge(d, o.ax, o.v)];
  for (const ax in (o.extra || {})) ms.push(nudge(d, ax, o.extra[ax]));

  let deepBonus = 0;
  if (kind === 'love' && (d.talkMem.loveStreak >= 2 || d.bond >= 75)) {
    deepBonus = 2;
    bond += deepBonus;
  }

  addBond(d, bond);
  fx.push([`Bağ ${bond >= 0 ? '+' : ''}${bond}`, bond >= 0 ? 'heart' : 'bad']);
  if (deepBonus > 0) fx.push([`Derin Uyum +${deepBonus}`, 'heart']);
  if (hasMatchingMark) fx.push([`${matchMark} Doğası`, 'good']);

  const axes = { [o.ax]: o.v, ...(o.extra || {}) };
  for (const ax in axes) { const v = axes[ax]; fx.push([`${v > 0 ? AXES[ax].p : AXES[ax].n} +${Math.abs(v)}`, 'mute']); }
  if (o.mood && kind !== 'hate') { addMood(d, o.mood); fx.push([`Moral +${o.mood}`, 'good']); }
  if (kind === 'hate') { addMood(d, -1, true); fx.push(['Moral -1', 'bad']); }
  if (o.stat) { const [k, v] = o.stat; const g = Math.min(v, capOf(d, k) - d.st[k]); d.st[k] += g; if (g) fx.push([`${ST_KISA[k]} +${g}`, 'good']); }
  if (o.fat) d.fat = clamp(d.fat + o.fat, 0, 100);

  let reactText = pick(REACT[kind]).replace(/\{ad\}/g, d.name);
  if (hasMatchingMark && REACT_MARK[matchMark]) {
    reactText += ' ' + REACT_MARK[matchMark].replace(/\{ad\}/g, d.name);
  } else if (kind === 'love' && d.bond >= 70) {
    reactText += ' ' + pick(REACT_BOND).replace(/\{ad\}/g, d.name);
  }
  if (kind === 'love' && d.bond >= 65 && !d.favKnown && d.fav && FOODS[d.fav]) {
    d.favKnown = true;
    S.st.fav++;
    fx.push([`Favori Yem: ${FOODS[d.fav].ad}`, 'good']);
    reactText += ` Sana iyice ısındığı için burnuyla kilerdeki <b>${FOODS[d.fav].ad}</b> kokusunu işaret etti!`;
  }

  d.talked = true; S.st.talk++;
  return { react: reactText, kind, fx, marks: ms.filter(Boolean) };
}

/* ---------- Olaylar ---------- */
const anyD = (f) => S.dragons.filter(f || (() => true));
const randD = (f) => { const a = anyD(f); return a.length ? pick(a) : null; };
const topD = () => [...S.dragons].sort((a, b) => (b.w - a.w) || (sum(STATS.map(k => b.st[k])) - sum(STATS.map(k => a.st[k]))))[0];

const STORY = {
  2: { id: 'harita', title: 'Haritacı Selin', text: () => 'Kapıda tozlu pelerinli bir kadın duruyor. "Deden bana bir harita borçluydu, ben de ona bir iyilik. Ödeşelim." Elindeki deri tomarda yaban ejderhalarının yuvaları işaretli.', opts: [
    { t: 'Haritayı al ve teşekkür et', fx: () => { S.flags.sefer = true; S.food.balik += 2; return 'Sefer sekmesi açıldı. Selin giderken iki taze balık da bıraktı. Yabani ejderhaları yakalamak için yanına bir eskort ejderha ve biraz yem al.'; } } ] },
  3: { id: 'demirhan', title: 'Kara Kanat\'ın Sahibi', text: () => 'Pazarda kalabalık yarılıyor. Simsiyah zırhlı ejderhasının yanında Demirhan, Kara Kanat Ahırları\'nın sahibi. Gözünü kestiği ejderhanın parasını sayıp sana dönüyor: "Dedenin harabesini mi diriltiyorsun? Kızıl Taç\'ta görüşürüz. Tabii oraya kadar dayanabilirsen." Aynı gün demirci Usta Kerim de dükkânını açtığını duyuruyor.', pre: () => { const m = S.market.dragons; if (m.length) { m.sort((a, b) => b.price - a.price); m.shift(); } S.flags.smith = true; refreshSmith(); }, opts: [
    { t: '"Taç\'ta görüşürüz, Demirhan."', fx: () => { S.un += 2; const k = S.dragons[0]; if (k) nudge(k, 'ces', 6); return 'Pazar yerinde fısıltılar başlıyor: +2 ün. Demirci sekmesi açıldı; pazardaki en pahalı ejderha artık Demirhan\'ın.'; } },
    { t: 'Cevap verme, işine bak', fx: () => { const k = S.dragons[0]; if (k) nudge(k, 'dis', 5); return 'Demirhan güldü ve gitti. Demirci sekmesi açıldı; pazardaki en pahalı ejderha artık onun.'; } } ] },
  5: { id: 'cukur', title: 'Yara İzli Eller', text: () => 'Gece, kapının altından bir kart itiliyor. Üzerinde yalnızca bir meşale çizimi ve bir adres. Ertesi sabah yara izli elleri olan bir adam bekliyor: "Çukurda dövüşenler bir gecede bir aylık para kazanır. Kaybedenlerin bazıları eve dönmez. Senin seçimin."', opts: [
    { t: 'Kartı sakla', fx: () => { S.flags.cukur = true; return 'Arena\'da Yeraltı Çukuru açıldı. Yenilgide ölüm riski var; riski dövüşten önce görürsün.'; } },
    { t: 'Kartı adamın önünde yırt', fx: () => { S.un += 3; S.flags.cukurRed = true; return 'Köyde dürüst bir ocak olarak anılıyorsun: +3 ün. (Çukur kapıları 9. haftada bir kez daha aralanacak.)'; } } ] },
  8: { id: 'kupa_ilan', yearly: 1, title: 'Bahar Kupası İlanı', text: () => 'Meydandaki direğe kırmızı mühürlü bir ferman asıldı: <b>10. hafta, Bahar Kupası</b>. Üç tur, tek ejderha, yetişkinler. Katılım için en az 15 ün. Şampiyona 600 altın ve büyük bir ün.', opts: [
    { t: 'Fermanı katlayıp cebine koy', fx: () => `Şu an ${S.un} ünün var. Kupaya seçeceğin ejderhayı iyi dinlendir ve donat.` } ] },
  9: { id: 'cukur2', cond: () => S.flags.cukurRed && !S.flags.cukur, title: 'İkinci Kart', text: () => 'Yine aynı kart. Bu kez arkasında el yazısı bir not var: "Dürüstlük güzel. Ama Kızıl Taç\'a dürüstlükle varılmaz."', opts: [
    { t: 'Kartı sakla', fx: () => { S.flags.cukur = true; return 'Yeraltı Çukuru açıldı.'; } },
    { t: 'Kartı yine yırt', fx: () => { S.un += 2; return '+2 ün. Bu sefer kapı bir daha çalınmayacak.'; } } ] },
  12: { id: 'bataklik', title: 'Selin\'in Dönüşü', text: () => 'Haritacı Selin, çamura bulanmış çizmeleriyle geri döndü. "Haritaların boş bıraktığı yeri buldum. Gölge Bataklığı. Oradan sağ dönen pek olmaz ama orada yaşayanlar... efsane."', opts: [
    { t: 'Haritayı al', fx: () => { S.flags.bataklik = true; return 'Sefer\'de Gölge Bataklığı açıldı. Orada saf Gölge ejderhaları yaşıyor.'; } } ] },
  13: { id: 'kan_tuccari', title: 'Kan Tüccarı', text: () => 'Kapüşonlu bir tüccar bir sandığın kapağını aralıyor. İçinde mor damarlı, simsiyah bir yumurta. "İki ebeveyni de saf Gölge. 240 altın. Pazarlık yok."', opts: [
    { t: 'Satın al (240 altın)', req: () => S.gold >= 240 ? null : 'Yeterli altın yok', fx: () => {
      S.gold -= 240;
      const g = randomGenes({ q: 0.45, el: 'golge', pure: true });
      S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: chance(50) ? ['kor'] : [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Kan tüccarının yumurtası' });
      return 'Yumurta artık senin. ' + (hasB('kulucka') ? 'Kuluçkada yer varsa doğrudan oraya yerleştirildi.' : 'Kuluçka Ocağı kurarsan çatlayacak.');
    } },
    { t: 'Geri çevir', fx: () => 'Tüccar omuz silkip sise karıştı.' } ] },
  15: { id: 'tac_davet', yearly: 1, title: 'Kızıl Taç Davetiyeleri', text: () => `Kızıl Taç davetiyeleri dağıtılmaya başlandı. 20. haftada en az <b>45 ünü</b> olan ocaklar katılabilecek. Senin ünün: <b>${S.un}</b>. Demirhan şampiyonunu meydanda gezdiriyor: ${(typeof rivals === 'function' && rivals()[0].champ.name) || 'Karabela'}, saf kanlı bir Gölge ejderhası.`, opts: [
    { t: 'Hazırlıklara başla', fx: () => S.un >= 45 ? 'Davetiye çoktan cebinde. Şimdi şampiyonunu seç ve sonuna kadar hazırla.' : `Davetiye için ${45 - S.un} ün daha lazım. Şehir Arenası ve Çukur en hızlı yol.` } ] },
  17: { id: 'pul', yearly: 1, title: 'Pul Hastalığı', text: () => 'Bölgede pul hastalığı yayılıyor. Ejderhaların pulları matlaşıp dökülüyor. Bir şifacı her ejderha için ilaç öneriyor.', opts: [
    { t: () => `Herkesi ilaçla (${S.dragons.length * 25} altın)`, req: () => S.gold >= S.dragons.length * 25 ? null : 'Yeterli altın yok', fx: () => { S.gold -= S.dragons.length * 25; return 'Bütün ejderhalar korundu.'; } },
    { t: 'Ocağı karantinaya al, şansına güven', fx: () => {
      const hit = []; for (const d of S.dragons) if (chance(hasB('sifa') ? 20 : 45)) { d.inj = Math.max(d.inj, 1); addMood(d, -1, true); hit.push(d.name); }
      return hit.length ? `Hastalık şunlara bulaştı: ${hit.join(', ')}. Birer hafta dinlenmeleri gerekecek.` : 'Şans yüzüne güldü; kimse hastalanmadı.';
    } } ] },
  19: { id: 'son_gece', title: 'Dedenin İkinci Mektubu', text: () => 'Kuluçka ocağının taşlarından biri gevşemiş. Arkasından dedenin el yazısıyla bir mektup çıkıyor: "Kazanmak için yetiştirme onları. Yetiştir ki kazanmak bir anlam taşısın." Yarın Kızıl Taç haftası.', opts: [
    { t: 'Geceyi ejderhalarınla geçir', fx: () => { for (const d of S.dragons) { addBond(d, 6); addMood(d, 1); } return 'Bütün ejderhalar: bağ +6, moral +1.'; } },
    { t: 'Rakiplerin kayıtlarını incele', fx: () => { S.un += 2; for (const d of S.dragons) nudge(d, 'dis', 4); return '+2 ün ve herkes biraz daha disiplinli.'; } } ] },
};

const EVENTS = [
  { id: 'firtina', title: 'Fırtınalı Gece', text: () => 'Gece bir fırtına inlerden birinin çatısını uçurdu. Ejderhalar sabaha kadar ıslak taşlarda titredi.', opts: [
    { t: 'Çatıyı hemen onart (50 altın)', req: () => S.gold >= 50 ? null : 'Yeterli altın yok', fx: () => { S.gold -= 50; return 'Usta sabah gelip çatıyı onardı.'; } },
    { t: 'Kendin yamamaya çalış', fx: () => { for (const d of S.dragons) addMood(d, -1, true); return 'Yama tuttu ama gece soğuktu. Bütün ejderhalar: moral -1 (Mesafeli olanlar etkilenmez).'; } } ] },
  { id: 'cocuk', cond: () => anyD(d => d.stage !== 'yavru').length, prep: () => ({ d: randD(d => d.stage !== 'yavru') }), title: 'Köyün Çocukları', text: c => `Bir avuç köy çocuğu çitin üstünden ${ek(c.d.name, 'acc')} seyrediyor. En cesuru sırtına binip binemeyeceğini soruyor.`, opts: [
    { t: c => `${c.d.name} çocukları gezdirsin`, fx: c => { nudge(c.d, 'sic', 8); addBond(c.d, 2); S.un += 1; c.d.fat = clamp(c.d.fat + 8, 0, 100); return `${c.d.name} çocukları tek tek tepeye kadar taşıdı. Sıcak +8, +1 ün.`; } },
    { t: 'Çocukları nazikçe geri gönder', fx: c => { nudge(c.d, 'dis', 3); return 'Çocuklar homurdanarak dağıldı.'; } } ] },
  { id: 'kristal', cond: () => S.week >= 4, prep: () => ({ d: randD() }), title: 'Gezgin Tüccar', text: c => `Bir gezgin tüccar avucunda parıldayan bir taş tutuyor: "Kristal Çekirdek. Yutturduğun ejderhanın kanına işler, en zayıf genini güçlendirir." Seçtiği ejderha: ${c.d.name}.`, opts: [
    { t: 'Satın al (150 altın)', req: () => S.gold >= 150 ? null : 'Yeterli altın yok', fx: c => {
      S.gold -= 150; const d = c.d; let best = null;
      for (const k of STATS) for (let i = 0; i < 2; i++) if (d.genes.pot[k][i] < 5 && (!best || d.genes.pot[k][i] < d.genes.pot[best[0]][best[1]])) best = [k, i];
      if (!best) return 'Çekirdek parladı ama işe yaramadı; bu ejderhanın genleri zaten kusursuz.';
      const [k, i] = best; const old = d.genes.pot[k][i]; d.genes.pot[k][i]++;
      return `${ek(d.name, 'gen')} ${ST_AD[k]} geni ${GRADE[old]} kademesinden ${GRADE[old + 1]} kademesine çıktı. Bu gen yavrulara da geçebilir.`;
    } },
    { t: 'Şarlatanlara para yok', fx: () => 'Tüccar başka kapıya yöneldi.' } ] },
  { id: 'yetim', cond: () => freeSlots() > 0, title: 'Kapıdaki Yavru', text: () => 'Sabah kapının önünde, bir sepetin içinde, minik bir ejderha yavrusu buldun. Boynunda yalnızca "Bakamıyoruz" yazan bir not var.', opts: [
    { t: 'Sahiplen', fx: c => { const d = mkDragon({ genes: (c && c.yg) || randomGenes({ q: 0.18 }), stage: 'yavru', age: 0, bond: 50, mood: 3, origin: 'Kapıda bulundu' }); S.dragons.push(d); S.st.acq++; chron(`${d.name} kapıda bulundu.`); return `Ona ${d.name} adını verdin. (${EL_AD[d.el]})`; } },
    { t: 'Köydeki barınağa götür', fx: () => { S.un += 1; return 'Barınak sorumlusu sana minnettar: +1 ün.'; } } ] },
  { id: 'kavga', cond: () => S.dragons.length >= 2, prep: () => { const a = shuffle([...S.dragons]); return { d: a[0], d2: a[1] }; }, title: 'Kemik Kavgası', text: c => `${c.d.name} ile ${c.d2.name} aynı yemek kabına uzandı. Dişler gösterildi, kuyruklar kalktı.`, opts: [
    { t: 'Araya gir ve azarla', fx: c => { for (const x of [c.d, c.d2]) { nudge(x, 'dis', 6); addBond(x, -2); } return 'İkisi de geri çekildi. Disiplin +6, bağ -2.'; } },
    { t: 'Bırak kendileri çözsün', fx: c => { for (const x of [c.d, c.d2]) nudge(x, 'ces', 5); addAff(c.d.id, c.d2.id, -10); return 'Kısa ve gürültülü bir kavga oldu. İkisi de cesaretlendi ama aralarındaki yakınlık -10.'; } },
    { t: 'İkisine de balık ver (2 balık)', req: () => S.food.balik >= 2 ? null : '2 Taze Balık gerekir', fx: c => { S.food.balik -= 2; addAff(c.d.id, c.d2.id, 8); return 'Karınlar doyunca kavga unutuldu. Yakınlık +8.'; } } ] },
  { id: 'ozan', cond: () => S.st.wins >= 2, prep: () => ({ d: topD() }), title: 'Ozanın Türküsü', text: c => `Bir gezgin ozan, ${ek(c.d.name, 'gen')} zaferleri üstüne bir türkü yaktı. Hanlarda söylemek için senden biraz harçlık bekliyor.`, opts: [
    { t: 'Ozana harçlık ver (30 altın)', req: () => S.gold >= 30 ? null : 'Yeterli altın yok', fx: c => { S.gold -= 30; S.un += 7; addMood(c.d, 1); return 'Türkü üç vilayete yayıldı: +7 ün.'; } },
    { t: 'Türküyü dinle, teşekkür et', fx: () => { S.un += 3; return 'Türkü yine de köyde dilden dile dolaştı: +3 ün.'; } } ] },
  { id: 'hirsiz', title: 'Kilerde Hırsız', text: () => 'Gece kilerden tıkırtılar geldi. Biri çuvalları karıştırıyor.', opts: [
    { t: 'Ejderhaları sal', fx: () => {
      const brave = randD(d => hasMark(d, 'Cesur') && d.stage !== 'yavru');
      if (brave) { S.un += 3; S.gold += 40; addBond(brave, 3); return `${brave.name} hırsızı ağaca kovaladı. Muhtar 40 altın ödül verdi, +3 ün.`; }
      const lost = Math.min(40, Math.max(0, S.gold)); S.gold -= lost; return `Ejderhalar ürktü, kimse kovalamadı. Hırsız ${lost} altınla kaçtı. (Cesur bir ejderha olsaydı...)`;
    } },
    { t: 'Fener yak, bağır', fx: () => { const k = Object.keys(S.food).filter(f => S.food[f] > 0); let t = 'Hırsız kaçtı ama'; if (k.length) { const f = pick(k); S.food[f] = Math.max(0, S.food[f] - 2); t += ` ${FOODS[f].ad.toLowerCase()} stoğundan bir kısmını götürdü.`; } else t += ' kilerde zaten bir şey yoktu.'; return t; } } ] },
  { id: 'hasta', cond: () => S.dragons.length, prep: () => ({ d: randD() }), title: 'Ateşli Burun', text: c => `${ek(c.d.name, 'gen')} burnu kuru ve sıcak. Bütün gün inden çıkmadı.`, opts: [
    { t: 'Şifacı çağır (50 altın)', req: () => S.gold >= 50 ? null : 'Yeterli altın yok', fx: c => { S.gold -= 50; addBond(c.d, 3); return `Şifacı otlar bıraktı. ${c.d.name} ertesi gün ayaktaydı. Bağ +3.`; } },
    { t: 'Kendin ilgilen', fx: c => { if (hasB('sifa') || chance(45)) { addBond(c.d, 5); return `Şifahanede bütün gece başında bekledin. ${c.d.name} iyileşti. Bağ +5.`; } c.d.inj = Math.max(c.d.inj, 2); addMood(c.d, -1, true); return `${ek(c.d.name, 'gen')} durumu kötüleşti: 2 hafta dinlenmesi gerekiyor.`; } } ] },
  { id: 'bilge', cond: () => S.dragons.length, prep: () => ({ d: randD() }), title: 'Bilge Ejderha', text: c => `Dağdan inen yaşlı, kör bir ejderha ${ek(c.d.name, 'gen')} önünde durup bir bilmece soruyor: "Ne kadar çok olursa, o kadar az görürsün. Nedir?"`, opts: [
    { t: '"Karanlık."', fx: c => { const g = Math.min(6, capOf(c.d, 'ze') - c.d.st.ze); c.d.st.ze += g; nudge(c.d, 'dis', 3); return `Yaşlı ejderha memnun. ${ek(c.d.name, 'gen')} alnına dokundu: ZEK +${g}.`; } },
    { t: '"Sis."', fx: c => { nudge(c.d, 'ces', 2); return '"Yakın, ama sis dağılır." Yaşlı ejderha gülümseyip yoluna devam etti.'; } },
    { t: '"Yaşlılık."', fx: c => { nudge(c.d, 'sic', 3); return '"Hah! Akıllı ama yanlış." Yaşlı ejderha kahkahayla uzaklaştı.'; } } ] },
  { id: 'meteor', title: 'Yıldız Yağmuru', text: () => 'Gece gökyüzünden yüzlerce yıldız kaydı. Ejderhalar inlerinden çıkıp sabaha kadar gökyüzünü seyretti.', opts: [
    { t: 'Sen de onlara katıl', fx: () => { for (const d of S.dragons) { addMood(d, 1); if (d.el === 'firtina') addBond(d, 4); } return 'Bütün ejderhalar: moral +1. Fırtına ejderhaları ayrıca bağ +4.'; } } ] },
  { id: 'sponsor', cond: () => S.week >= 3, title: 'Lonca Sponsorluğu', text: () => 'Tüccarlar loncası, ejderhalarının loncanın sarı bayrağını taşımasını istiyor. Karşılığında peşin para.', opts: [
    { t: 'Kabul et (+150 altın, -3 ün)', fx: () => { S.gold += 150; S.un = Math.max(0, S.un - 3); return 'Kese doldu; ama halk "loncanın ejderhaları" diye fısıldıyor.'; } },
    { t: 'Reddet', fx: () => { S.un += 1; return 'Bağımsızlığın takdir gördü: +1 ün.'; } } ] },
  { id: 'casus', cond: () => S.week >= 4 && anyD(d => d.stage !== 'yavru').length, prep: () => ({ d: randD(d => d.stage !== 'yavru') }), title: 'Çitteki Gölge', text: c => `Antrenman sırasında çitin arkasında Demirhan'ın adamlarından birini fark ettin. ${ek(c.d.name, 'acc')} izliyor ve not alıyor.`, opts: [
    { t: c => `${c.d.name} kovalasın`, fx: c => { nudge(c.d, 'ces', 5); if (c.d.st.ce >= 30 + S.week * 2) { S.gold += 60; return `${c.d.name} adamı yakaladı. Kurtulmak için 60 altın bıraktı.`; } return 'Adam kaçtı ama bir daha gelmeye cesaret edemez.'; } },
    { t: 'İzlesin; gösteri yap', fx: c => { S.un += 3; nudge(c.d, 'dis', -3); return 'Bütün hünerlerini sergiledin. Dedikodu yayıldı: +3 ün.'; } } ] },
  { id: 'sicak', cond: () => S.week >= 6, title: 'Kavurucu Yaz', text: () => 'Bir hafta boyunca güneş taşları kızdırdı. Kuyular yarıya indi.', opts: [
    { t: 'Gölgelikler kur', fx: () => { const r = []; for (const d of S.dragons) { if (d.el === 'buz' && !hasB('buzc')) { addMood(d, -1, true); r.push(`${d.name} bunaldı`); } if (d.el === 'ates') { addMood(d, 1); r.push(`${d.name} keyiflendi`); } } return r.length ? r.join(', ') + '.' : 'Ejderhalar sıcağı iyi atlattı.'; } } ] },
  { id: 'terk', title: 'Dere Kenarındaki Yumurta', text: () => 'Dere kıyısında, sazlıkların arasında yarı gömülü, hâlâ ılık bir yumurta buldun.', opts: [
    { t: 'Eve götür', fx: c => { const g = (c && c.eg) || randomGenes({ q: 0.22 }); S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Dere kenarında bulundu' }); return 'Yumurta artık senin. ' + (kuluckaFree() >= 0 && hasB('kulucka') ? 'Yer varsa kuluçkaya yerleşti.' : 'Kuluçka Ocağı gerekiyor.'); } },
    { t: 'Annesi döner, bırak', fx: () => 'Ertesi gün dönüp baktığında yumurta yoktu.' } ] },
  { id: 'yakin', cond: () => Object.values(S.aff).some(v => v >= 30), prep: () => { const k = Object.keys(S.aff).filter(k => S.aff[k] >= 30); const [a, b] = pick(k).split('|').map(Number); const d = byId(a), d2 = byId(b); return d && d2 ? { d, d2 } : null; }, title: 'Kanat Kanada', text: c => `Sabah inlere baktığında ${c.d.name} ile ${ek(c.d2.name, 'acc')} kanatları birbirine sarılmış uyurken buldun.`, opts: [
    { t: 'Sessizce kapıyı kapat', fx: c => { addAff(c.d.id, c.d2.id, 15); return 'Yakınlık +15.'; } } ] },
  { id: 'mektup', cond: () => S.week >= 3, title: 'Eski Bir Dost', text: () => 'Dedenin eski yol arkadaşından bir mektup ve küçük bir kese geldi: "Bir ejderha, ebeveynlerinde görünmeyen bir şeyi taşıyabilir. Gözler ve gölge, ikisi de saklanmayı sever."', opts: [
    { t: 'Keseyi aç', fx: () => { S.gold += 100; return '+100 altın. (İpucu: Parlak göz ve Gölge elementi çekiniktir; kızıl göz ise en çekinik renktir. Ebeveynlerin ikisi de taşımalıdır. Gen Laboratuvarı taşıyıcıları gösterir.)'; } } ] },
  { id: 'kacak', cond: () => anyD(d => hasMark(d, 'Asi') || hasTrait(d, 'vahsi') || d.bond < 25).length, prep: () => ({ d: randD(d => hasMark(d, 'Asi') || hasTrait(d, 'vahsi') || d.bond < 25) }), title: 'Boş İn', text: c => `Gece ${ek(c.d.name, 'gen')} ini boş kaldı. Tepelerden uzun bir ulama geliyor.`, opts: [
    { t: 'Fenerle peşinden git', fx: c => { if (c.d.bond >= 30 || chance(50)) { addBond(c.d, 8); nudge(c.d, 'sic', 4); return `${ek(c.d.name, 'acc')} bir kayanın üstünde buldun. Sesini duyunca yanına geldi. Bağ +8.`; } addMood(c.d, -1, true); c.d.fat = clamp(c.d.fat + 20, 0, 100); return `Bütün gece aradın. ${c.d.name} sabaha karşı kendi döndü, yorgun ve huysuz.`; } },
    { t: 'Bekle, kendisi döner', fx: c => { addBond(c.d, -5); nudge(c.d, 'dis', -4); return `${c.d.name} öğlene doğru döndü. Aranmadığını fark etti: bağ -5.`; } } ] },
  { id: 'bayram', cond: () => S.week >= 5, title: 'Ejder Bayramı', text: () => 'Köyde Ejder Bayramı. Herkes ejderhalarına şölen veriyor, ocaklar kurdeleyle süsleniyor.', opts: [
    { t: 'Şölen ver (60 altın)', req: () => S.gold >= 60 ? null : 'Yeterli altın yok', fx: () => { S.gold -= 60; for (const d of S.dragons) { addMood(d, 1); addBond(d, 4); } S.un += 1; return 'Bütün ejderhalar: moral +1, bağ +4. +1 ün.'; } },
    { t: 'Sade bir kutlama yap', fx: () => { for (const d of S.dragons) addBond(d, 2); return 'Bütün ejderhalar: bağ +2.'; } } ] },
  { id: 'yarali', cond: () => freeSlots() > 0 && S.week >= 4, title: 'Yaralı Yaban Ejderhası', text: () => 'Kanadı yırtılmış genç bir yaban ejderhası, ocağın dışındaki tepeye inip orada kaldı. Avcıların tuzağından kaçmış olmalı.', opts: [
    { t: 'Yarasını sar ve yanına al (40 altın)', req: () => S.gold >= 40 ? null : 'Yeterli altın yok', fx: c => { S.gold -= 40; const d = mkDragon({ genes: (c && c.wg) || randomGenes({ q: 0.25 }), stage: 'genc', age: 2, bond: 45, traits: ['vahsi'], extra: S.week, origin: 'Yaralıyken kurtarıldı' }); d.inj = 1; S.dragons.push(d); S.st.acq++; chron(`${d.name} yaralı bulunup kurtarıldı.`); return `${d.name} ocağa katıldı. Vahşi ama sana minnettar.`; } },
    { t: 'Uzaktan su bırak', fx: () => 'Ertesi sabah ejderha uçup gitmişti.' } ] },
  { id: 'kerim', cond: () => S.flags.smith && S.week >= 5, title: 'Usta Kerim\'in Denemesi', text: () => 'Usta Kerim yeni bir dövme tekniği denemiş ve ürünlerden birini yarı fiyatına vermek istiyor.', opts: [
    { t: 'Ne olduğuna bak', fx: c => { const pool = Object.keys(ITEMS).filter(k => ITEMS[k].tier === 2); const id = (c && c.item) || pick(pool); const p = Math.round(ITEMS[id].fiyat / 2); if (S.gold < p) return `${ITEMS[id].ad} (${p} altın) ama kesen yetmiyor.`; S.gold -= p; S.inv.push({ uid: S.uid++, id }); return `${ITEMS[id].ad} ${p} altına senin. Demircide kuşandırabilirsin.`; } },
    { t: 'Sonraya kalsın', fx: () => 'Kerim omuz silkti.' } ] },
];

function pickEvent() {
  const s2 = typeof STORY2 !== 'undefined' && typeof seasonNo === 'function' && seasonNo() > 1 ? STORY2[S.week] : null;
  if (s2 && !S.seenEv.includes(s2.id) && (!s2.cond || s2.cond())) { S.seenEv.push(s2.id); return { ...s2, ctx: {} }; }
  const st = STORY[S.week];
  // Yeni sezonlarda tanışma hikâyeleri tekrar oynanmaz; yalnız her yıl dönen ilanlar (kupa, taç, salgın) yeniden gelir
  const again = st && (st.yearly || !(typeof seasonNo === 'function' && seasonNo() > 1 && S.seenEv.includes(st.id)));
  if (st && again && (!st.cond || st.cond())) { S.seenEv.push(st.id); if (st.pre) st.pre(); return { ...st, ctx: {} }; }
  if (!chance(75)) return null;
  const pool = shuffle(EVENTS.filter(e => !S.seenEv.includes(e.id) && (!e.cond || e.cond())));
  for (const e of pool) {
    const ctx = e.prep ? e.prep() : {};
    if (ctx === null || (e.prep && (!ctx.d))) continue;
    S.seenEv.push(e.id);
    if (e.pre) e.pre();
    return { ...e, ctx };
  }
  return null;
}

/* ---------- Sefer ---------- */
const SEFER_CARDS = [
  /* Encounter 1: Exploration / Scout (Keşif ve İz Sürme) */
  { id: 'kervan', beat: 'scout', w: 3, t: 'Yolun kenarında devrilmiş, yarı yanmış bir kervan.', o: [
    { t: 'Enkazı ara', fx: e => { const g = ri(40, 90); S.gold += g; return `Bir sandığın dibinde ${g} altın buldun.`; } },
    { t: 'Ölüler için dua edip geç', fx: e => { nudge(e, 'sic', 3); return `${e.name} başını eğdi. Sıcak +3.`; } } ] },
  { id: 'kaynak', beat: 'scout', w: 3, t: 'Kayaların arasından buharı tüten, mineral kokulu bir kaynak.', o: [
    { t: 'Biraz dinlenin', fx: e => { e.fat = Math.max(0, e.fat - 30); addMood(e, 1); return `${e.name} suya gömüldü. Yorgunluk -30, moral +1.`; } },
    { t: 'Çevredeki taze izleri incele', fx: e => { const g = Math.min(3, capOf(e, 'ze') - e.st.ze); e.st.ze += g; addBond(e, 2); return `${e.name} su başındaki pençe izlerini koklayıp yönü buldu: ZEK +${g}, bağ +2.`; } } ] },
  { id: 'kesis', beat: 'scout', w: 2, t: 'Bir mağara ağzında ejderhalarla konuşabildiği söylenen bir keşiş oturuyor.', o: [
    { t: 'Bağış yap (30 altın)', req: () => S.gold >= 30 ? null : 'Yeterli altın yok', fx: e => { S.gold -= 30; const g = Math.min(5, capOf(e, 'ze') - e.st.ze); e.st.ze += g; nudge(e, 'dis', 3); return `Keşiş ${ek(e.name, 'gen')} kulağına bir şey fısıldadı. ZEK +${g}, Disiplinli +3.`; } },
    { t: 'Selam verip geç', fx: () => 'Keşiş gözlerini bile açmadı.' } ] },
  { id: 'izci_kulesi', beat: 'scout', w: 3, t: 'Yamaçta terk edilmiş eski bir gözetleme kulesi. Tepesinden bütün vadi görünüyor.', o: [
    { t: 'Kuleye çıkıp vadiyi gözetle', fx: e => { const g = Math.min(3, capOf(e, 'ze') - e.st.ze); e.st.ze += g; nudge(e, 'dis', 3); return `${e.name} yüksekten av sahasını taradı: ZEK +${g}, Disiplinli +3.`; } },
    { t: 'Kulenin mahzenini karıştır', fx: () => { S.food.balik += 2; const g = ri(25, 55); S.gold += g; return `Eski erzak sandığından 2 kurutulmuş balık ve ${g} altın çıktı.`; } } ] },
  { id: 'eski_kamp', beat: 'scout', w: 3, t: 'Külleri hâlâ ılık bir gezgin kampı. Çevrede taze ejderha pulları dökülmüş.', o: [
    { t: 'Pulları ve izleri takip et', fx: e => { addBond(e, 3); nudge(e, 'ces', 3); return `${e.name} kokuyu yakaladı; birlikte uyum içinde iz sürdünüz. Bağ +3, Cesur +3.`; } },
    { t: 'Közün başında nefeslen', fx: e => { e.fat = Math.max(0, e.fat - 20); nudge(e, 'sic', 2); return `${e.name} ılık küllerin yanında kıvrıldı. Yorgunluk -20, Sıcak +2.`; } } ] },

  /* Encounter 2: Hazard / Skill Test (Tehlike ve Yetenek Sınavı) */
  { id: 'tuzak', beat: 'hazard', w: 3, t: 'Bir avcı tuzağına kısılmış, bacağı kanayan bir yaban keçisi.', o: [
    { t: 'Kurtar', fx: e => { nudge(e, 'sic', 6); addBond(e, 3); return `${e.name} tuzağı dişleriyle açtı. Sıcak +6, bağ +3.`; } },
    { t: 'Akşam yemeği', fx: e => { S.food.balik += 2; nudge(e, 'sic', -3); return 'Kilere iki öğünlük et eklendi (2 balık değerinde).'; } } ] },
  { id: 'avci', beat: 'hazard', w: 3, t: 'Rakip bir ocağın avcıları senin bölgende yaban ejderhası kovalıyor.', o: [
    { t: 'Onları kov', fx: e => { const p = e.st.gu + e.st.ce + (e.inj ? -30 : 0), need = 60 + S.week * 5; nudge(e, 'ces', 4); if (p + ri(-15, 15) >= need) { S.gold += 70; S.un += 1; return `${e.name} avcıları dağıttı. Bıraktıkları ganimet: 70 altın, +1 ün.`; } e.inj = Math.max(e.inj, 1); e.fat = clamp(e.fat + 15, 0, 100); return `<span class="warn">Avcılar kalabalıktı. ${e.name} hafif yaralandı (1 hafta).</span>`; } },
    { t: 'Saklan', fx: e => { nudge(e, 'ces', -3); return 'Avcılar geçip gitti.'; } } ] },
  { id: 'gecit', beat: 'hazard', w: 3, t: 'Daracık bir geçit. Ya üstünden uçacaksınız ya da yarım günlük yoldan dolanacaksınız.', o: [
    { t: 'Uçarak geç', fx: e => { if (e.st.ce + ri(-10, 10) >= 28 + S.week * 2.5) { const g = ri(50, 80); S.gold += g; return `${e.name} rüzgârı yakaladı. Tepede eski bir kartal yuvasında ${g} altın vardı.`; } e.fat = clamp(e.fat + 20, 0, 100); if (chance(30)) { e.inj = Math.max(e.inj, 1); return `<span class="warn">${e.name} kayalara sürtündü; hafif yaralı.</span>`; } return `${e.name} zor bela geçti. Yorgunluk +20.`; } },
    { t: 'Dolaş', fx: e => { e.fat = clamp(e.fat + 12, 0, 100); return 'Uzun yol yordu ama sağ salim geçtiniz.'; } } ] },
  { id: 'heyelan', beat: 'hazard', w: 3, t: 'Yukarıdaki yamaçtan kopan dev kayalar patikayı kapatmak üzere!', o: [
    { t: 'Kuyruk darbesiyle kayaları parçala', fx: e => { if (e.st.gu + e.st.da + ri(-12, 12) >= 58 + S.week * 4) { const g = Math.min(3, capOf(e, 'gu') - e.st.gu); e.st.gu += g; S.gold += 55; return `${e.name} dev kayayı tuzla buz etti! İçinden 55 altınlık cevher çıktı, GÜÇ +${g}.`; } e.fat = clamp(e.fat + 18, 0, 100); return `${e.name} kayayı sektirdi ama darbe omuzlarını yordu: yorgunluk +18.`; } },
    { t: 'Kanat çırpıp yana sıçra', fx: e => { if (e.st.ce >= 26 + S.week * 2) { addBond(e, 2); return `${e.name} seni de kavrayıp son anda toz bulutundan sıyrıldı! Bağ +2.`; } e.fat = clamp(e.fat + 14, 0, 100); return 'Toz duman içinde patikadan çıktınız. Yorgunluk +14.'; } } ] },
  { id: 'sis_pususu', beat: 'hazard', w: 2, t: 'Vadinin tabanını bir anda göz gözü görmeyen zehirli bir sis kapladı.', o: [
    { t: 'Sezgilerine güvenip içinden geç', fx: e => { if (e.st.ze + e.bond * 0.4 >= 42 + S.week * 2.5) { const g = Math.min(3, capOf(e, 'ze') - e.st.ze); e.st.ze += g; addBond(e, 3); return `${e.name} senin sesinle yön bulup sisi yarıp geçti! ZEK +${g}, bağ +3.`; } e.fat = clamp(e.fat + 16, 0, 100); return 'Siste yönünüzü şaşırdınız; çıkana kadar epey ter döktünüz. Yorgunluk +16.'; } },
    { t: 'Yüksek kayada sisin dağılmasını bekle', fx: e => { nudge(e, 'dis', 4); e.fat = clamp(e.fat + 8, 0, 100); return 'Sabırla beklediniz. Disiplinli +4, yorgunluk +8.'; } } ] },

  /* Encounter 3: Climax / Discovery (Doruk Noktası ve Keşif) */
  { id: 'yuva', beat: 'climax', w: 2, t: 'Bir kaya kovuğunda terk edilmiş bir yuva. İçinde soğumaya yüz tutmuş bir yumurta.', o: [
    { t: 'Yumurtayı al', fx: (e, R) => { const g = randomGenes({ q: 0.22 + S.week * 0.012, el: chance(70) ? REGIONS[R].el : null }); S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: `${ek(REGIONS[R].ad, 'loc')} bulundu` }); return 'Yumurtayı pelerinine sarıp heybeye koydun.'; } },
    { t: 'Dokunma', fx: e => { nudge(e, 'sic', 4); return `${e.name} yuvayı kokladı ve uzaklaştı. Sıcak +4.`; } } ] },
  { id: 'kadim_sunak', beat: 'climax', w: 2, t: 'Yaban yuvasının hemen öncesinde, unutulmuş bir İlk Ocak sunağı yükseliyor. Taşların arasında eski bir ateş yanıyor.', o: [
    { t: 'Sunağın önünde ejderhanla ant iç', fx: e => { addBond(e, 5); addMood(e, 1); const k = pick(STATS); const g = Math.min(3, capOf(e, k) - e.st[k]); e.st[k] += g; return `Kadim kor parladı! ${e.name}: bağ +5, moral +1${g ? `, ${ST_KISA[k]} +${g}` : ''}.`; } },
    { t: 'Sunaktaki adak kesesini al', fx: e => { const g = ri(65, 110); S.gold += g; nudge(e, 'dis', -3); return `Keseden ${g} altın çıktı ama ${e.name} huzursuzca homurdandı.`; } } ] },
  { id: 'kristal_damar', beat: 'climax', w: 2, t: 'Mağara duvarında bölge elementinin enerjisiyle nabız gibi atan parlak bir kristal damarı buldun.', o: [
    { t: 'Ejderhanın kristali özümsemesine izin ver', fx: (e, R) => { const sameEl = REGIONS[R] && e.el === REGIONS[R].el; const k = sameEl ? 'gu' : 'da'; const g = Math.min(sameEl ? 4 : 3, capOf(e, k) - e.st[k]); e.st[k] += g; addBond(e, 3); return `${e.name} kristalin enerjisini içine çekti: ${ST_KISA[k]} +${g}, bağ +3.`; } },
    { t: 'Kristali söküp satmak için heybeleştir', fx: () => { const g = ri(75, 115); S.gold += g; return `Saf kristal parçaları ${g} altın değerinde!`; } } ] },
];
const SEFER_LOCAL = {
  kul: { t: 'Lav akıntılarının arasında kıpkırmızı bir Ateş Biberi tarlası.', o: [
    { t: 'Biber topla', fx: () => { S.food.biber += 3; return '+3 Ateş Biberi.'; } },
    { t: 'Kızgın kayalarda çalış', fx: e => { const g = Math.min(4, capOf(e, 'da') - e.st.da); e.st.da += g; e.fat = clamp(e.fat + 10, 0, 100); return `${e.name} kızgın taşlarda yürüdü: DAY +${g}.`; } } ] },
  buzul: { t: 'Donmuş bir gölün altında parlayan bir şey var.', o: [
    { t: 'Buzu kır', fx: e => { if (chance(55)) { S.gold += 100; return 'Buzun altından eski bir kılıç kını çıktı: 100 altına satılır.'; } e.fat = clamp(e.fat + 10, 0, 100); return 'Sadece donmuş bir balıkmış.'; } },
    { t: 'Kar Meyvesi topla', fx: () => { S.food.kar += 3; return '+3 Kar Meyvesi.'; } } ] },
  kayalik: { t: 'Yıldırımın sürekli düştüğü bir tepe. Toprak cam gibi erimiş.', o: [
    { t: 'Yıldırım kristali bekle', fx: e => { if (chance(25)) { e.inj = Math.max(e.inj, 1); return `<span class="warn">Yıldırım çok yakına düştü. ${e.name} sersemledi (1 hafta).</span>`; } S.gold += 60; const g = Math.min(3, capOf(e, 'ze') - e.st.ze); e.st.ze += g; return `Bir kristal kopardınız: 60 altın. ${e.name} ZEK +${g}.`; } },
    { t: 'Yıldırım Mantarı topla', fx: () => { S.food.mantar += 3; return '+3 Yıldırım Mantarı.'; } } ] },
  orman: { t: 'Kökleri birer kemer gibi yükselen bin yaşında bir ağaç.', o: [
    { t: 'Gölgesinde dinlen', fx: e => { addMood(e, 1); addBond(e, 4); e.fat = Math.max(0, e.fat - 15); return 'Moral +1, bağ +4, yorgunluk -15.'; } },
    { t: 'Kökleri kaz', fx: () => { S.food.yumru += 3; return '+3 Kök Yumrusu.'; } } ] },
  bataklik: { t: 'Sisin içinde, yalnızca gece açan mor çiçekler.', o: [
    { t: 'Gece Zambağı topla', fx: () => { S.food.zambak += 3; return '+3 Gece Zambağı.'; } },
    { t: 'Çiçeklerin kökündeki yuvayı ara', fx: e => { if (chance(40)) { S.eggs.push({ id: 'e' + S.uid++, genes: randomGenes({ q: 0.35, el: 'golge', pure: chance(50) }), sex: pick(['F', 'M']), traits: [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Gölge Bataklığı\'nda bulundu' }); return 'Simsiyah, ılık bir yumurta!'; } e.fat = clamp(e.fat + 15, 0, 100); return 'Bataklık seni yordu, yuva boş çıktı.'; } } ] },
};

function weightedSeferPick(pool, usedIds, recentIds) {
  const candidates = pool.filter(c => !usedIds.has(c.id));
  if (!candidates.length) return pick(pool);
  const weights = candidates.map(c => {
    const base = c.w || 2;
    return recentIds.includes(c.id) ? Math.max(0.25, base * 0.2) : base;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function seferCards(R) {
  S.recentSeferEvs = S.recentSeferEvs || [];
  const usedIds = new Set();
  const scoutPool = SEFER_CARDS.filter(c => c.beat === 'scout');
  const hazardPool = SEFER_CARDS.filter(c => c.beat === 'hazard');
  const localCard = SEFER_LOCAL[R] ? [{ id: 'local_' + R, beat: 'climax', w: 5, ...SEFER_LOCAL[R] }] : [];
  const climaxPool = [...localCard, ...SEFER_CARDS.filter(c => c.beat === 'climax')];

  const c1 = weightedSeferPick(scoutPool, usedIds, S.recentSeferEvs);
  usedIds.add(c1.id);
  const c2 = weightedSeferPick(hazardPool, usedIds, S.recentSeferEvs);
  usedIds.add(c2.id);
  const c3 = weightedSeferPick(climaxPool, usedIds, S.recentSeferEvs);
  usedIds.add(c3.id);

  const chosen = [c1, c2, c3];
  for (const c of chosen) {
    if (!c.id.startsWith('local_')) S.recentSeferEvs.push(c.id);
  }
  if (S.recentSeferEvs.length > 6) S.recentSeferEvs = S.recentSeferEvs.slice(-6);
  return chosen;
}

const BIOME_TRAITS = {
  kul: ['kor', 'demir', 'asil'],
  buzul: ['demir', 'sabirli', 'cabuk'],
  kayalik: ['kartal', 'hizli', 'kor'],
  orman: ['dogurgan', 'cabuk', 'obur'],
  bataklik: ['kor', 'kartal', 'asil'],
  col: ['demir', 'hizli', 'sabirli'],
  mercan: ['dogurgan', 'cabuk', 'sabirli'],
  bulut: ['kartal', 'hizli', 'asil'],
  obsidiyen: ['kor', 'demir', 'asil'],
};

function genWild(R) {
  const regEl = REGIONS[R] ? REGIONS[R].el : rEl();
  const el = R === 'bataklik' ? 'golge' : chance(84) ? regEl : rEl();

  S.wildPity = S.wildPity || 0;
  const rareWeight = Math.min(35, 10 + Math.floor(S.week * 0.6) + S.wildPity * 6);
  const uncommonWeight = 30;
  const commonWeight = Math.max(35, 100 - rareWeight - uncommonWeight);
  const roll = ri(1, commonWeight + uncommonWeight + rareWeight);
  const tier = roll <= rareWeight ? 'rare' : roll <= rareWeight + uncommonWeight ? 'uncommon' : 'common';

  if (tier === 'rare') S.wildPity = 0;
  else S.wildPity++;

  const qBonus = tier === 'rare' ? 0.14 : tier === 'uncommon' ? 0.06 : 0;
  const pureChance = R === 'bataklik' ? (tier === 'rare' ? 85 : 60) : (tier === 'rare' ? 45 : tier === 'uncommon' ? 20 : 8);
  const g = randomGenes({ q: clamp(0.14 + S.week * 0.02 + qBonus, 0.14, 0.88), el, pure: chance(pureChance) });

  const stage = tier === 'rare' ? 'yetiskin' : chance(65) ? 'yetiskin' : 'genc';
  const traits = ['vahsi'];
  const biomePool = (BIOME_TRAITS[R] || []).filter(t => TRAIT_KEYS.includes(t));
  const extraTraitChance = tier === 'rare' ? 85 : tier === 'uncommon' ? 50 : 28;
  if (chance(extraTraitChance)) {
    const tPool = biomePool.length && chance(70) ? biomePool : TRAIT_KEYS.filter(t => t !== 'vahsi');
    const picked = pick(tPool);
    if (picked && !traits.includes(picked)) traits.push(picked);
  }

  const statBoost = S.week * 1.6 + (tier === 'rare' ? 6 : tier === 'uncommon' ? 3 : 0);
  const regName = REGIONS[R] ? REGIONS[R].ad : 'Yaban';
  const d = mkDragon({ genes: g, stage, age: stage === 'yetiskin' ? 4 : 2, traits, bond: 10, mood: tier === 'rare' ? 3 : 2, extra: statBoost, origin: `${ek(regName, 'loc')} yakalandı` });
  d.rarity = tier;
  S.nid--; d.id = 'w' + S.uid++;
  return d;
}
function catchOdds(e, w, m) {
  if (m === 'yem') return null; // yeme göre ayrı hesap
  if (m === 'sakin') return Math.round(clamp(20 + e.st.ze * 0.5 + e.bond * 0.25 + (hasMark(e, 'Sıcak') ? 10 : 0), 5, 90));
  if (m === 'guc') return Math.round(clamp(25 + (e.st.gu + e.st.da - w.st.gu - w.st.da) * 0.6 + (hasMark(e, 'Cesur') ? 10 : 0), 5, 90));
}
function foodOdds(w, f) { if (f === w.fav) return 92; if (FOODS[f].el === w.el) return 68; if (f === 'ziyafet') return 75; return 40; }
