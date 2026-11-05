'use strict';
/* ============ EJDER OCAĞI — MAÇ ÖNCESİ / SONRASI OLAYLAR ============
   Umamusume'deki gibi: dövüşten hemen önce küçük bir sahne ve seçim, dövüşe geçici bir etki verir.
   Dövüşten sonra da kısa bir an: kutlama, teselli, bir teklif, bir laf.
   Koşul ve hafıza tabanlı diyalog ağacı: ejderhanın karakter izleri (Cesur, Temkinli, Sıcak, Disiplinli),
   yüksek bağ (>=75), element üstünlüğü/dezavantajı ve rakip geçmişi sahneleri ve seçenekleri şekillendirir. */

// b: dövüşte geçici etki { atk, def, crit, dodge, nefes, hp, sta }
const FIGHT_PRE = [
  { id: 'bakis', title: 'Rakibin Bakışları', w: () => 1,
    text: c => `Kum meydanın öbür ucunda ${c.o.trainer} kollarını kavuşturmuş, sırıtıyor: "O mu senin ejderhan? ${c.o.name} onu kahvaltıya yer."`,
    opts: [
      { t: 'Sakin kal, cevap verme', fx: c => { nudge(c.d, 'ces', -1); return { b: { def: 5 }, r: `${c.d.name} senin sükûnetini kokladı ve omuzlarını gevşetti. Zırh +5.` }; } },
      { t: '"Bakalım kim kimi yer."', fx: c => { nudge(c.d, 'ces', 3); return { b: { atk: 6, def: -2 }, r: `${c.d.name} kükreyerek öne atıldı; kalabalık coştu. Saldırı +6, zırh -2.` }; } },
      { t: c => `${ek(c.d.name, 'gen')} başını okşa`, fx: c => { addBond(c.d, 2); return { b: { crit: 6 }, r: `${c.d.name} gözlerini kapayıp alnını eline dayadı. Bağ +2, kritik +%6.` }; } },
      { cond: c => hasMark(c.d, 'Cesur'), t: c => `[Cesur] ${c.d.name} bir adım öne çıkıp kükresin`, fx: c => { addBond(c.d, 2); return { b: { atk: 8, crit: 4 }, r: `${c.d.name} kumları titreten bir kükreme saldı; ${c.o.trainer} geri çekildi. Saldırı +8, kritik +%4.` }; } },
      { cond: c => hasMark(c.d, 'Disiplinli'), t: c => `[Disiplinli] Tek bir el işaretiyle ${ek(c.d.name, 'acc')} duruşa geçir`, fx: c => { return { b: { def: 6, dodge: 5 }, r: `${c.d.name} gözünü bile kırpmadan savaş nizamına geçti. Zırh +6, kaçınma +%5.` }; } },
    ] },
  { id: 'tezahurat', title: 'Tribünden Bir Ses', w: c => c.d.w >= 2 ? 2 : 0,
    text: c => `Tribünlerden biri ${ek(c.d.name, 'gen')} adını bağırmaya başladı. Önce bir kişi, sonra bir sıra, sonra bütün taraf.`,
    opts: [
      { t: 'Elini kaldır, kalabalığı selamla', fx: c => { S.un += 1; nudge(c.d, 'sic', 2); return { b: { crit: 8 }, r: `${c.d.name} kanatlarını açıp kalabalığa döndü. +1 ün, kritik +%8.` }; } },
      { t: 'Ejderhanı rakibe odakla', fx: c => { nudge(c.d, 'dis', 2); return { b: { dodge: 6 }, r: `Sesler arkada kaldı; ${c.d.name} yalnızca rakibi görüyor. Kaçınma +%6.` }; } },
      { cond: c => hasMark(c.d, 'Sıcak') || c.d.bond >= 75, t: c => `[Sıcak Bağ] ${c.d.name} ile tribünlere kor üfle`, fx: c => { S.un += 1; addBond(c.d, 2); return { b: { nefes: 16, sta: 15 }, r: `Tribünler ayağa kalktı! ${c.d.name} coşkuyla doldu. +1 ün, nefes +%16, başlangıç nefesi +15.` }; } },
    ] },
  { id: 'taktik', title: 'Son Dakika Taktiği', w: () => 1,
    text: c => `${c.o.name} ${EL_AD[c.o.el].toLowerCase()} ejderhası. Kulübenin gölgesinde ${ek(c.d.name, 'gen')} kulağına bir plan fısıldıyorsun.`,
    opts: [
      { t: 'Nefesle aç, uzaktan yık', fx: c => ({ b: { nefes: 18, sta: 15 }, r: 'Göğsünde kor birikiyor. Nefes gücü +%18, başlangıç nefesi +15.' }) },
      { t: 'Savun, yorulmasını bekle', fx: c => { nudge(c.d, 'ces', -1); return { b: { def: 7, hp: 10 }, r: 'Sabırlı bir dövüş olacak. Zırh +7, can +10.' }; } },
      { t: 'İlk saniyede çullan', fx: c => { nudge(c.d, 'ces', 2); return { b: { atk: 5, dodge: 3 }, r: 'Pençeler kumda, kuyruk gergin. Saldırı +5, kaçınma +%3.' }; } },
      { cond: c => hasMark(c.d, 'Temkinli'), t: '[Temkinli] Rakibin kör noktasını ezberlet', fx: c => ({ b: { dodge: 8, crit: 5 }, r: `${c.d.name} rakibin kanat açısını dikkatle süzdü. Kaçınma +%8, kritik +%5.` }) },
    ] },
  { id: 'titreme', title: 'Titreyen Kanat', w: c => (c.d.mood <= 2 || c.d.pers.ces < -10) ? 3 : 0,
    text: c => `${ek(c.d.name, 'gen')} kanadının ucu titriyor. Arenanın gürültüsü onu ürkütmüş; gözü çıkış kapısında.`,
    opts: [
      { t: 'Fısılda: "Buradayım."', fx: c => { addBond(c.d, 3); addMood(c.d, 1); return { b: { def: 3 }, r: `${c.d.name} sana yaslandı, titreme durdu. Bağ +3, moral +1.` }; } },
      { t: 'Bir kova soğuk su ver', fx: c => ({ b: { hp: 16 }, r: `${c.d.name} suyu bir dikişte bitirdi. Can +16.` }) },
      { t: 'Sert ol: "Kalk!"', fx: c => { nudge(c.d, 'dis', 4); addBond(c.d, -2); return { b: { atk: 4 }, r: `${c.d.name} irkilip doğruldu ama sana bakmıyor. Disiplin +4, bağ -2, saldırı +4.` }; } },
      { cond: c => c.d.bond >= 75, t: '[Can Bağı] Alnını onun alnına daya', fx: c => { addMood(c.d, 1); return { b: { hp: 20, def: 6 }, r: `Aranızdaki derin bağ korkuyu sildi. ${c.d.name} dimdik doğruldu. Moral +1, can +20, zırh +6.` }; } },
    ] },
  { id: 'kayis', title: 'Gevşek Kayış', w: c => Object.values(c.d.equip).some(v => v != null) ? 2 : 0,
    text: c => `Arena kapısı açılmadan hemen önce ${ek(c.d.name, 'gen')} koşumundaki bir kayışın gevşediğini fark ediyorsun.`,
    opts: [
      { t: 'Hemen sıkıca bağla', fx: c => ({ b: { def: 6 }, r: 'Toka yerine oturdu. Zırh +6.' }) },
      { t: 'Kayışı tamamen çıkar, hafiflesin', fx: c => ({ b: { def: -4, dodge: 8 }, r: `${c.d.name} silkinip hafifledi. Zırh -4, kaçınma +%8.` }) },
    ] },
  { id: 'demirhan_tribun', title: 'Tribündeki Kara Zırh', w: c => S.week >= 5 && c.tier !== 'yavru' ? 1.5 : 0,
    text: c => S.flags && S.flags.rivalPassed
      ? `Locada Demirhan oturuyor. Ocağının ünü Kara Kanat'ı geçtiğinden beri bakışları buz gibi; ${ek(c.d.name, 'acc')} tartıyor.`
      : 'Locada siyah zırhlı biri oturuyor: Demirhan. Bu dövüşü seyretmeye gelmiş. Gözünü senden ayırmıyor.',
    opts: [
      { t: 'Ona bir gösteri borçluyuz', fx: c => { nudge(c.d, 'ces', 3); if (S.flags) S.flags.demirhanNod = (S.flags.demirhanNod || 0) + 1; return { b: { atk: 7, def: -3 }, r: 'Ejderhan gösteriş yapacak. Saldırı +7, zırh -3.' }; } },
      { t: 'Onu görmezden gel', fx: c => { nudge(c.d, 'dis', 2); return { b: { dodge: 4, def: 3 }, r: 'Demirhan yok sayıldı. Kaçınma +%4, zırh +3.' }; } },
      { cond: c => S.flags && S.flags.rivalPassed, t: 'Locaya dönüp dimdik selam ver', fx: c => { S.un += 1; addBond(c.d, 2); return { b: { crit: 7, atk: 4 }, r: `Demirhan çenesini sıktı; tribünler senin özgüvenini konuşuyor. +1 ün, kritik +%7, saldırı +4.` }; } },
    ] },
  { id: 'bahis', title: 'Bahisçi', w: c => (c.tier === 'sehir' || c.tier === 'cukur') && S.gold >= 80 ? 2 : 0,
    text: c => `İnce bıyıklı bir bahisçi yanına süzülüyor: "${c.d.name} üstüne 80 altın? Kazanırsa 180 öderim."`,
    opts: [
      { t: '80 altın yatır', fx: c => { S.gold -= 80; return { b: {}, bet: 180, r: 'Altınlar kesesine girdi. Bahis kâğıdı cebinde.' }; } },
      { t: 'Kendi ejderhama kumar oynamam', fx: c => { nudge(c.d, 'sic', 2); return { b: { crit: 3 }, r: `Bahisçi omuz silkti. ${c.d.name} sana minnetle baktı. Kritik +%3.` }; } },
    ] },
  { id: 'cukur_koku', title: 'Çukurun Kokusu', w: c => c.tier === 'cukur' ? 4 : 0,
    text: c => `Çukurun dibinde kan ve is kokusu. ${c.d.name} burun deliklerini açıp hırlıyor; gözleri koyulaşıyor.`,
    opts: [
      { t: 'Gözlerini kapat, birlikte nefes al', fx: c => { nudge(c.d, 'ces', -2); return { b: { dodge: 7, def: 3 }, r: 'Hırıltı yavaşladı. Kaçınma +%7, zırh +3.' }; } },
      { t: 'Bırak, öfkesini kullansın', fx: c => { nudge(c.d, 'dis', -3); return { b: { atk: 9 }, r: `${c.d.name} kendini kaybetmenin eşiğinde. Saldırı +9, disiplin -3.` }; } },
    ] },
  /* --- Yeni Koşul ve Hafıza Tabanlı Maç Öncesi Sahneleri --- */
  { id: 'element_ustun', title: 'Doğanın Üstünlüğü', w: c => elMult(c.d.el, c.o.el) > 1 ? 3 : 0,
    text: c => `Karşı kafesteki ${c.o.name} (${EL_AD[c.o.el]}), ${ek(c.d.name, 'gen')} yaydığı ${EL_AD[c.d.el].toLowerCase()} soluğunu hissedince huzursuzca geri adım atıyor.`,
    opts: [
      { t: 'Nefes ateşini harla, üstünlüğü ezici kıl', fx: c => { nudge(c.d, 'ces', 2); return { b: { nefes: 22, sta: 15 }, r: `${c.d.name} boğazında ${EL_AD[c.d.el].toLowerCase()} gücünü topladı. Nefes +%22, başlangıç nefesi +15.` }; } },
      { t: 'Gücünü sakla, rakibin paniğinden faydalan', fx: c => { nudge(c.d, 'dis', 2); return { b: { crit: 7, dodge: 5 }, r: `${c.d.name} soğukkanlılıkla rakibin açığını kolluyor. Kritik +%7, kaçınma +%5.` }; } },
    ] },
  { id: 'element_ters', title: 'Ters Rüzgâr', w: c => elMult(c.d.el, c.o.el) < 1 ? 3 : 0,
    text: c => `Meydandaki hava ${c.o.name} yüzünden yoğun bir ${EL_AD[c.o.el].toLowerCase()} baskısıyla dolu. ${c.d.name} kendi ${EL_AD[c.d.el].toLowerCase()} nefesinin zorlanacağını seziyor.`,
    opts: [
      { t: 'Nefese güvenme, yakın pençe ve hıza dön', fx: c => { nudge(c.d, 'dis', 2); return { b: { atk: 7, dodge: 6 }, r: `${c.d.name} kanatlarını toplayıp pençe dövüşüne hazırlandı. Saldırı +7, kaçınma +%6.` }; } },
      { t: 'Siper al, fırtınayı zırhla göğüsle', fx: c => { nudge(c.d, 'ces', -1); return { b: { def: 9, hp: 14 }, r: `${c.d.name} pullarını sıkılaştırıp savunma duruşuna geçti. Zırh +9, can +14.` }; } },
      { cond: c => hasMark(c.d, 'Cesur'), t: '[Cesur] "Element ne olursa olsun geri adım yok!"', fx: c => { addBond(c.d, 2); return { b: { atk: 8, nefes: 15 }, r: `${c.d.name} inatla kükredi; dezavantajı öfkeyle aşacak! Bağ +2, saldırı +8, nefes +%15.` }; } },
    ] },
  { id: 'yuksek_bag_soz', title: 'Sözsüz Anlaşma', w: c => c.d.bond >= 75 || hasMark(c.d, 'Sıcak') ? 2.5 : 0,
    text: c => `Kapı demirleri gıcırdarken ${c.d.name} dönüp burnunu avucuna bastırıyor. Aranızdaki bağ o kadar güçlü ki tek kelime etmeden ne yapacağınızı biliyorsunuz.`,
    opts: [
      { t: 'Kalpleriniz aynı ritimde atsın', fx: c => { addBond(c.d, 3); return { b: { hp: 18, def: 5, crit: 5 }, r: `${c.d.name} senin sesini yüreğinde taşıyarak kumlara adım attı. Bağ +3, can +18, zırh +5, kritik +%5.` }; } },
      { t: 'Göz kırp ve tam hücum işareti ver', fx: c => { addMood(c.d, 1); return { b: { atk: 6, sta: 20 }, r: `${c.d.name} neşeyle kanat çırpıp ileri fırladı. Moral +1, saldırı +6, başlangıç nefesi +20.` }; } },
    ] },
  { id: 'karakter_izi_ani', title: 'Karakterin Mührü', w: c => (hasMark(c.d, 'Cesur') || hasMark(c.d, 'Temkinli') || hasMark(c.d, 'Disiplinli')) ? 2.5 : 0,
    text: c => hasMark(c.d, 'Cesur')
      ? `${c.d.name} demir parmaklıklara pençe atıp rakibine meydan okuyor; cesareti bütün tüneli inletiyor.`
      : hasMark(c.d, 'Temkinli')
      ? `${c.d.name} gölgede durup kumun eğimini, rüzgârın yönünü ve ${ek(c.o.name, 'gen')} adımlarını tek tek ölçüyor.`
      : `${c.d.name} gürültülü tünelde bir taş heykel gibi kıpırdamadan senin ilk komutunu bekliyor.`,
    opts: [
      { cond: c => hasMark(c.d, 'Cesur'), t: '[Cesur] Bırak kükremesiyle meydanı titresin', fx: c => ({ b: { atk: 8, crit: 5 }, r: `${c.d.name} kapı açılır açılmaz şimşek gibi fırladı. Saldırı +8, kritik +%5.` }) },
      { cond: c => hasMark(c.d, 'Temkinli'), t: '[Temkinli] Rakibin ilk açığını beklemesini söyle', fx: c => ({ b: { dodge: 9, def: 5 }, r: `${c.d.name} her adımı hesaplayarak meydana çıktı. Kaçınma +%9, zırh +5.` }) },
      { cond: c => hasMark(c.d, 'Disiplinli'), t: '[Disiplinli] Kusursuz talim nizamını koru', fx: c => ({ b: { crit: 7, def: 5, sta: 15 }, r: `${c.d.name} talimdeki gibi kusursuz bir dengeyle ilerledi. Kritik +%7, zırh +5, nefes +15.` }) },
      { t: 'Derin bir nefesle dengeyi bul', fx: c => ({ b: { hp: 14, atk: 4 }, r: `${c.d.name} gücünü dengeli yaydı. Can +14, saldırı +4.` }) },
    ] },
  { id: 'rakip_ocak_iz', title: 'Rakip Ocakların Gözü', w: c => (c.o.trainer === 'Leyla Hatun' || c.o.trainer === 'Baron Vasıf' || (c.d.streak || 0) >= 2) ? 2.5 : 0,
    text: c => (c.o.trainer === 'Leyla Hatun' || c.o.trainer === 'Baron Vasıf')
      ? `Karşı köşede ünlü ocak sahibi ${c.o.trainer} duruyor: "Senin ocağın adını çarşıda çok duyar olduk. Bakalım ${c.d.name} anlatıldığı kadar var mı?"`
      : `${c.d.name} üst üste kazandığı zaferlerle dikkat çekti. Rakip antrenör ${c.o.trainer} özellikle senin dövüş tarzına karşı hazırlık yapmış.`,
    opts: [
      { t: 'Alışılmış taktiği değiştir, şaşırt', fx: c => { nudge(c.d, 'dis', 2); return { b: { dodge: 7, crit: 6 }, r: `${c.d.name} beklenmedik bir kanat oyunuyla maça başlıyor. Kaçınma +%7, kritik +%6.` }; } },
      { t: 'Kendi gücümüzle ezip geçelim', fx: c => { nudge(c.d, 'ces', 2); return { b: { atk: 6, hp: 12 }, r: `Karşı hazırlık umurunda değil; ${c.d.name} tüm ağırlığıyla yükleniyor. Saldırı +6, can +12.` }; } },
    ] },
];

const FIGHT_POST = [
  { id: 'zafer_turu', when: 'win', title: 'Zafer Turu',
    text: c => `Kalabalık ayakta. ${c.d.name} kumun ortasında soluk soluğa, sana bakıyor.`,
    opts: [
      { t: 'Seyirciyi birlikte selamlayın', fx: c => { S.un += 1; nudge(c.d, 'sic', 2); return `Bir tur attınız; çiçekler yağdı. +1 ün.`; } },
      { t: 'Hemen ahıra götür, dinlensin', fx: c => { c.d.fat = Math.max(0, c.d.fat - 15); return 'Gürültüden uzak bir köşede su ve saman. Yorgunluk -15.'; } },
      { t: 'Boynuna sarıl', fx: c => { addBond(c.d, 5); return `${c.d.name} seni kanadının altına aldı. Bağ +5.`; } },
    ] },
  { id: 'kizgin_rakip', when: 'win', title: 'Yenilen Antrenör',
    text: c => `${c.o.trainer} kapıda yolunu kesiyor; yüzü kıpkırmızı: "Şansına güvenme. Bir dahakine görüşürüz."`,
    opts: [
      { t: 'Elini uzat: "İyi dövüştünüz."', fx: c => { S.un += 1; return 'Bir an tereddüt etti, sonra elini sıktı. Tribünden alkış. +1 ün.'; } },
      { t: 'Yanından geç', fx: c => { nudge(c.d, 'ces', 2); return `${c.d.name} kuyruğunu onun ayaklarının dibinden sürüyerek geçti. Cesaret +2.`; } },
      { cond: c => hasMark(c.d, 'Disiplinli') || hasMark(c.d, 'Temkinli'), t: c => `[Soğukkanlı] "${c.d.name} şansla değil, çalışmayla kazandı."`, fx: c => { S.un += 1; nudge(c.d, 'dis', 3); return `${c.o.trainer} diyecek söz bulamadı. Çevredeki terbiyeciler başıyla onayladı. +1 ün, disiplin +3.`; } },
    ] },
  { id: 'cocuk_hediye', when: 'win', title: 'Küçük Hayran',
    text: c => `Çitin dibinden bir çocuk ${ek(c.d.name, 'dat')} uzanıyor; avucunda ezik bir şey var: "Bu onun için!"`,
    opts: [
      { t: 'Hediyeyi kabul et', fx: c => { const f = pick(['balik', 'biber', 'kar', 'mantar', 'yumru']); S.food[f]++; addMood(c.d, 1); return `Bir ${FOODS[f].ad.toLowerCase()}! Kilere kondu. ${c.d.name} çocuğun saçını kokladı; moral +1.`; } },
      { t: 'Çocuğu sırtına bindir', fx: c => { nudge(c.d, 'sic', 4); c.d.fat = clamp(c.d.fat + 6, 0, 100); return 'Çocuğun çığlıkları bütün arenayı güldürdü. Sıcaklık +4.'; } },
    ] },
  { id: 'teselli', when: 'lose', title: 'Yenilginin Ardından',
    text: c => `${c.d.name} başını yere eğmiş, kumun üstünde kıvrılmış. Sana bakmıyor.`,
    opts: [
      { t: 'Yanına otur, bir şey söyleme', fx: c => { nudge(c.d, 'sic', 4); addBond(c.d, 3); return 'Uzun süre öyle kaldınız. Sonra başını dizine koydu. Sıcaklık +4, bağ +3.'; } },
      { t: 'Dövüşü birlikte baştan düşün', fx: c => { const g = Math.min(2, capOf(c.d, 'ze') - c.d.st.ze); c.d.st.ze += g; nudge(c.d, 'dis', 2); return `Kumda pençe izlerini çizdin. ZEK +${g}.`; } },
      { t: '"Bir dahakine yeneceğiz."', fx: c => { addMood(c.d, 1); nudge(c.d, 'ces', 2); return `${c.d.name} burnundan bir kıvılcım üfledi. Moral +1.`; } },
    ] },
  { id: 'teklif', when: 'any', title: 'Locadan Bir Teklif', cond: c => S.dragons.length >= 3,
    text: c => `İpek kaftanlı bir tüccar kâtibini yolluyor: "Efendim ${ek(c.d.name, 'acc')} beğendi. ${c.price} altın öder. Hemen, peşin."`,
    opts: [
      { t: c => `Sat (${c.price} altın)`, fx: c => { S.gold += c.price; for (const s in c.d.equip) c.d.equip[s] = null; linReg(c.d); S.dragons = S.dragons.filter(x => x !== c.d); chron(`${c.d.name} arenada ${c.price} altına satıldı.`); return `Anlaşma tamam. ${c.d.name} giderken bir kez dönüp sana baktı.`; } },
      { t: '"Satılık değil."', fx: c => { addBond(c.d, 4); return `Kâtip başını eğip çekildi. ${c.d.name} sesini duydu. Bağ +4.`; } },
    ] },
  { id: 'ozan_ani', when: 'win', title: 'Ozanın Kalemi', cond: c => c.d.w >= 3,
    text: c => `Tribünde saz çalan bir ozan şimdiden bir dörtlük uyduruyor: "${c.d.name} geldi, kum tutuştu..."`,
    opts: [
      { t: 'Ozana bir kese at (20 altın)', req: () => S.gold >= 20 ? null : 'Yeterli altın yok', fx: c => { S.gold -= 20; S.un += 2; return 'Türkü çarşıya yayıldı. +2 ün.'; } },
      { t: 'Gülümse ve geç', fx: () => 'Ozan sözü yine de bitirdi; kimse duymadı.' },
    ] },
  /* --- Yeni Koşul ve Hafıza Tabanlı Maç Sonrası Sahneleri --- */
  { id: 'cesur_kukreyis', when: 'win', title: 'Meydanın Hakimi', cond: c => hasMark(c.d, 'Cesur') || (c.d.streak || 0) >= 3,
    text: c => `${c.d.name} zaferden sonra arenadan çıkmak bilmiyor! Kanatlarını açıp göğe kükredi; ${(c.d.streak || 0) >= 3 ? `üst üste ${c.d.streak}. zaferiyle` : 'cesur duruşuyla'} tribünleri ayağa kaldırdı.`,
    opts: [
      { t: 'Bırak kükresin, bu an onun hakkı', fx: c => { S.un += 2; addMood(c.d, 1); return `Tribünler "${c.d.name}!" diye inledi. +2 ün, moral +1.`; } },
      { t: 'Heyecanını antrenman disiplininde topla', fx: c => { const g = Math.min(2, capOf(c.d, 'gu') - c.d.st.gu); c.d.st.gu += g; nudge(c.d, 'dis', 2); return `${c.d.name} coşkusunu güce dönüştürdü: GÜÇ +${g}, disiplin +2.`; } },
    ] },
  { id: 'temkinli_ders', when: 'win', title: 'Kusursuz Hamlenin İzleri', cond: c => hasMark(c.d, 'Temkinli') || hasMark(c.d, 'Disiplinli'),
    text: c => `Zafer çanları çalarken bile ${c.d.name} kumun üstündeki ayak izlerini inceliyor; ${ek(c.o.name, 'gen')} son hamlesini zihnine kazıyor.`,
    opts: [
      { t: 'Birlikte son sıyrılış hamlesini tekrarlayın', fx: c => { const g = Math.min(2, capOf(c.d, 'ce') - c.d.st.ce); c.d.st.ce += g; addBond(c.d, 2); return `Dövüş tecrübesi kalıcı bir reflekse dönüştü: ÇEV +${g}, bağ +2.`; } },
      { t: 'Sırtını sıvazla ve dinlenmeye götür', fx: c => { c.d.fat = Math.max(0, c.d.fat - 18); addBond(c.d, 3); return `${c.d.name} derin bir nefes alıp gevşedi. Yorgunluk -18, bağ +3.`; } },
    ] },
  { id: 'ters_element_destan', when: 'win', title: 'İmkânsız Zafer', cond: c => elMult(c.d.el, c.o.el) < 1,
    text: c => `${EL_AD[c.o.el]} elementli ${ek(c.o.name, 'dat')} karşı ${EL_AD[c.d.el].toLowerCase()} ejderhasıyla kazanmak herkesi şaşırttı! Eski terbiyeciler şapkalarını çıkarıp seni selamlıyor.`,
    opts: [
      { t: 'Terbiyecilerle sohbet et, tecrübeni paylaş', fx: c => { S.un += 2; const g = Math.min(2, capOf(c.d, 'ze') - c.d.st.ze); c.d.st.ze += g; return `Ustalığın dilden dile yayıldı: +2 ün, ZEK +${g}.`; } },
      { t: c => `Övgüyü ${ek(c.d.name, 'dat')} bırak`, fx: c => { addBond(c.d, 5); addMood(c.d, 1); return `${c.d.name} gururla göğsünü kabarttı. Bağ +5, moral +1.`; } },
    ] },
  { id: 'can_bagi_ani', when: 'any', title: 'Göz Göze', cond: c => c.d.bond >= 75 || hasMark(c.d, 'Sıcak'),
    text: c => c.won
      ? `Zafer kalabalığının ortasında ${c.d.name} ne altına ne de alkışlara bakıyor; doğruca yanına gelip başını omzuna yaslıyor.`
      : `Yenilginin ağırlığına rağmen ${c.d.name} yalnız kalmak istemiyor; sessizce yanına sokulup kanadını senin üstüne örtüyor.`,
    opts: [
      { t: 'Onunla sessizce alnını birleştir', fx: c => { addBond(c.d, 5); c.d.fat = Math.max(0, c.d.fat - 12); return `Aranızdaki bağ her dövüşle daha da sarsılmaz oluyor. Bağ +5, yorgunluk -12.`; } },
      { t: 'Heybeden sıcak bir lokma çıkarıp elinle besle', fx: c => { addMood(c.d, 1); addBond(c.d, 3); return `${c.d.name} avucundan lokmayı nazikçe aldı. Moral +1, bağ +3.`; } },
    ] },
  { id: 'rakip_ocak_selam', when: 'any', title: 'Locadan Gelen Haber', cond: c => S.week >= 4 && ((S.flags && S.flags.rivalPassed) || c.o.trainer === 'Leyla Hatun' || c.o.trainer === 'Baron Vasıf'),
    text: c => `Tünel çıkışında rakip ocakların ulaklarından biri seni bekliyor: "${c.won ? `${c.d.name} bugün göz doldurdu.` : `${c.d.name} yenilse de kolay lokma olmadığını gösterdi.`} Ocak beyleri Kızıl Taç öncesi seni yakından izliyor."`,
    opts: [
      { t: '"Ocağımızın kapısı da meydanı da açık."', fx: c => { S.un += 1; nudge(c.d, 'ces', 2); return `Sözün rakip ocaklara ulaştı. +1 ün, cesaret +2.`; } },
      { t: 'Sadece başınla selamla ve geç', fx: c => { nudge(c.d, 'dis', 3); return `Ağırbaşlı tavrın saygı uyandırdı. Disiplin +3.`; } },
    ] },
];

function resolveEvOpts(ev, c) {
  if (!ev) return ev;
  const target = ev.ev && Array.isArray(ev.ev.opts) ? ev.ev : ev;
  const ctx = c || ev.c || {};
  if (!Array.isArray(target.opts)) return ev;
  return { ...target, opts: target.opts.filter(op => !op.cond || op.cond(ctx)) };
}

function pickFightPre(d, o, tier) {
  const c = { d, o, tier };
  let pool = FIGHT_PRE.map(e => ({ e, w: e.w(c) })).filter(x => x.w > 0);
  if (pool.length > 1 && typeof S !== 'undefined' && S && S.lastFightPreId) {
    const nonRep = pool.filter(x => x.e.id !== S.lastFightPreId);
    if (nonRep.length) pool = nonRep;
  }
  const tot = sum(pool.map(x => x.w)); if (!tot) return null;
  let picked = pool[0].e;
  let r = Math.random() * tot;
  for (const x of pool) { r -= x.w; if (r <= 0) { picked = x.e; break; } }
  if (typeof S !== 'undefined' && S) S.lastFightPreId = picked.id;
  return { ev: resolveEvOpts(picked, c), c };
}

function pickFightPost(d, o, won) {
  const c = { d, o, won, price: Math.round(value(d) * 1.4) };
  let pool = FIGHT_POST.filter(e => (e.when === 'any' || (e.when === 'win') === won) && (!e.cond || e.cond(c)));
  if (!pool.length) return null;
  if (pool.length > 1 && typeof S !== 'undefined' && S && S.lastFightPostId) {
    const nonRep = pool.filter(e => e.id !== S.lastFightPostId);
    if (nonRep.length) pool = nonRep;
  }
  const picked = pick(pool);
  if (typeof S !== 'undefined' && S) S.lastFightPostId = picked.id;
  return { ev: resolveEvOpts(picked, c), c };
}

function applyBuff(f, b) {
  if (!b) return;
  if (b.atk) f.atk += b.atk; if (b.def) f.def += b.def; if (b.crit) f.crit += b.crit; if (b.dodge) f.dodge += b.dodge;
  if (b.nefes) f.nefesB += b.nefes; if (b.sta) f.sta = Math.min(100, f.sta + b.sta);
  if (b.hp) { f.maxHp += b.hp; f.hp += b.hp; }
}
