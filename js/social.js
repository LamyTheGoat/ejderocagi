'use strict';
/* ============ EJDER OCAĞI — HAN: İLİŞKİLER, FLÖRT, EJDER DİLİ, DİLEKLER ============
   Her hafta bir akşamı handa biriyle geçirebilirsin. Yakınlık arttıkça ayrıcalıklar açılır;
   üç kişiyle (Selin, Kerim, Ozan) ilişki romantiğe dönebilir. Hatice'yle derin bir dostluk kurulur.
   Bilge Ejder'den alınan Ejder Dili dersleri ejderhalarla konuşmanı derinleştirir. */

const SOC = {
  selin: { npc: 'selin', ad: 'Selin', unvan: 'Haritacı', romance: true,
    perks: [[25, 'Kestirme yollar: seferler yarı fiyatına'], [50, 'İz sürücü: yaban ejderha yakalama şansı +%10'], [80, 'Sevgili olabilirsiniz']],
    scenes: [
      { t: '"Kül Vadisi\'nin bu kısmı yanlış çizilmiş. Kim çizdiyse ya hiç gitmemiş ya da geri dönememiş." Selin başını haritadan kaldırmadan konuşuyor.',
        o: [['"Ben gittim. Doğusunda bir lav yarığı var."', 10, 'Gözleri parladı. "Göster!" Kalemini sana uzattı; gece yarısına kadar çizdiniz.'],
            ['"Haritalardan anlamam ama dinlerim."', 5, '"Dinleyen biri. Ne nadir." Sana yer açtı.'],
            ['"Bir içki ısmarlayayım mı?"', 2, '"Kendi içkimi kendim alırım." Yine de gülümsedi.']] },
      { t: 'Selin kahkahayla masana çöküyor: "Bugün bir bataklık kurbağası beni kovaladı. Ciddiyim. Kurbağa at kadardı."',
        o: [['"Bir dahakine ejderhamı yanına al."', 10, '"Ciddi misin? Bu bir teklif mi yoksa?" Yanakları kızardı, hemen konuyu değiştirdi.'],
            ['"Kurbağayı yendin mi bari?"', 5, '"Bir ağaca çıktım ve bekledim. Kahramanca, değil mi?"'],
            ['"Kendine dikkat etmelisin."', 2, '"Annem gibi konuştun." Ama sesi yumuşaktı.']] },
      { t: 'Selin bu akşam sessiz. Elindeki eski pusulayı çeviriyor. "Babamındı. Haritanın bittiği yere gitti; dönmedi."',
        o: [['"Bir gün oraya birlikte gideriz."', 10, 'Pusulayı avucunda sıktı. "Söz mü?" "Söz."'],
            ['"Çok üzgünüm."', 5, '"Ben değilim. Yani... bazen."'],
            ['"Belki dönmek istemedi."', -3, 'Gözleri sertleşti. "Belki." Erken kalktı.']] },
      { t: 'Selin seni hanın damına çıkarıyor. Yıldızlar. "Şu üç yıldız Ejder\'in Kuyruğu. Kaybolursan ona bak; seni hep ocağına döndürür."',
        o: [['"Kaybolursam beni sen bulursun."', 10, 'Bir süre konuşmadı. Sonra omzuna yaslandı.'],
            ['"Bana bütün yıldızları öğret."', 6, 'Sabaha kadar gökyüzünü çizdiniz.'],
            ['"Soğuk oldu, inelim."', -2, '"Tabii." Hayal kırıklığını saklamaya çalıştı.']] },
      { t: 'Selin pusulayı avucuna bırakıyor. "Bunu kimseye vermedim. Sana veriyorum çünkü artık nereye gidersem gideyim, döneceğim yer burası."', confess: true,
        o: [['Pusulayı al, elini tut.', 10, 'Elini bırakmadı. Hanın gürültüsü uzaklaştı.', 'partner'],
            ['"Arkadaşlığın benim için çok değerli."', 0, '"Biliyorum." Gülümsedi. "Pusula yine de sende kalsın."', 'friend']] },
    ],
    chat: ['Selin yeni bir patikadan söz ediyor; gözlerinde yol tozu var.', 'Selin haritanın köşesine küçük bir ejderha çizmiş. Seninkine benziyor.'],
    date: 'Selin\'le ocağın arkasındaki tepede, haritası dizlerinizde, yarın gideceğiniz yeri seçtiniz.' },
  kerim: { npc: 'kerim', ad: 'Usta Kerim', unvan: 'Demirci', romance: true,
    perks: [[25, 'Dost fiyatı: demircide %15 indirim'], [50, 'Hurdaya iyi para: eşyalar %70\'e geri alınır'], [80, 'Sevgili olabilirsiniz']],
    scenes: [
      { t: 'Kerim örsün başında, kollarında kurum. "Akşam mı oldu? Örsten başımı kaldırmadım ki."',
        o: [['"Sana bir kupa ayran getirdim."', 10, 'Yüzü kulaklarına kadar kızardı. "Benim için mi?"'],
            ['"Hep böyle çok mu çalışırsın?"', 5, '"Örs susunca kafam konuşuyor. Ondan."'],
            ['"Yarın bir pençe kını lazım."', 2, '"İş konuşmaya geldin yani." Güldü ama biraz kırıldı.']] },
      { t: 'Kerim bir şey saklıyor gibi. Sonunda avucunu açıyor: demirden minicik bir ejderha. "Boş zamanımda... Saçma işte."',
        o: [['"Saçma değil, harika!"', 10, 'Biblonun kuyruğunu düzeltti, sonra sana uzattı. "Senin olsun."'],
            ['"Benim için de yapar mısın?"', 6, '"Belki yaparım. Belki çoktan yaptım."'],
            ['"Bunu satsan iyi para eder."', 2, '"Satmak için yapmadım." Avucunu kapadı.']] },
      { t: 'Kerim\'in ocağı bu gece soğuk. "Ustam bugün öldü, beş yıl oldu. Her yıl bu gece ocağı yakmam."',
        o: [['"Yanında otururum. Konuşmasak da olur."', 10, 'Saatlerce oturdunuz. Gitmeden önce omzunu sıktı.'],
            ['"Onu bana anlatır mısın?"', 8, 'Ustasını anlattı; sesi hiç olmadığı kadar yumuşaktı.'],
            ['"Hadi hana gidelim, biraz dağıl."', 2, '"Bu gece olmaz." Başını salladı.']] },
      { t: 'Kerim sana bir yüzük uzatıyor, sonra panikle geri çekiyor. "Yanlış anlama! Tılsım yüzüğü bu, ejderha için. Yani..." Kulaklarına kadar kızardı.',
        o: [['"Yanlış anlamadım. Ama keşke yanlış olsaydı."', 10, 'Yüzüğü düşürdü. İkiniz de eğilip aynı anda aldınız.'],
            ['"Kızarınca çok tatlı oluyorsun."', 8, '"Sus." Ama gülüyordu.'],
            ['"Tılsımı ejderhama takarım, sağ ol."', 3, '"Tabii. Ejderha için." Yüzü düştü.']] },
      { t: 'Kerim yüzüğü bu sefer geri çekmiyor. "Bu sefer ejderha için değil."', confess: true,
        o: [['Yüzüğü parmağına tak.', 10, 'Elleri titriyordu. Örs bile sustu.', 'partner'],
            ['"Senin dostluğun bana yeter Kerim."', 0, '"Anladım." Yüzüğü cebine koydu. "Dostluk da iyidir."', 'friend']] },
    ],
    chat: ['Kerim yeni bir alaşım denediğini anlatıyor; gözleri ateş gibi.', 'Kerim sana ocağın başında sıcak bir ekmek uzatıyor.'],
    date: 'Kerim\'le dökümhanenin damında, kıvılcımların yıldızlara karıştığı bir gece geçirdiniz.' },
  ozan: { npc: 'ozan', ad: 'Ozan', unvan: 'Gezgin ozan', romance: true,
    perks: [[25, 'Türkülerin dilinde: her zafer +1 ün'], [50, 'Destan yayılıyor: her hafta +1 ün'], [80, 'Sevgili olabilirsiniz']],
    scenes: [
      { t: 'Ozan sazını akort ediyor. "Bir ejderha yetiştiricisi! Şarkı ister misin? Kafiye zor ama: ejder... mecder... neyse."',
        o: [['"Ejder, değer, eğer, yeter..."', 10, '"Sen şair misin yoksa?" Bütün hana senin dizeni okudu.'],
            ['"Benim için bir türkü yak."', 5, 'Türkü güzeldi. Ejderhanın adını yanlış söyledi ama.'],
            ['"Hayır, teşekkürler."', -2, '"Kalbimi kırdın. Ama sorun değil, buna alışkınım."']] },
      { t: 'Ozan bütün masaları güldürüyor; sonra seni görüp yanına sızıyor. "Kurtar beni. Şu adam bana borç verecek, ben de alacağım."',
        o: [['"Birlikte kaçalım!"', 10, 'Arka kapıdan koşarak çıktınız. Ara sokakta nefes nefese güldünüz.'],
            ['"Borcunu ben öderim." (30 altın)', 8, '"Bunu bir türküye koyacağım. Kahraman gibi sen."', 'pay30'],
            ['"Kendi başının çaresine bak."', 3, '"Acımasız! Bunu da bir türküye koyacağım."']] },
      { t: 'Ozan susmuş, sazını koynuna almış. "Herkes güler, kimse sormaz: Ozan nereden gelir? Benim köyüm yandı. Ejderhalar yaktı."',
        o: [['"Ocağımda sana hep yer var."', 10, 'Uzun süre baktı. "Bunu kimse söylememişti."'],
            ['"Ejderhalardan korkuyor musun?"', 6, '"Korkardım. Seninkileri görene kadar."'],
            ['"Ama yine de arenaya geliyorsun."', 4, '"Korktuğun şeye bakmak... bir tür şarkı."']] },
      { t: 'Ozan sana yeni bir türkü çalıyor. Türkü senin hakkında.',
        o: [['"Bir sonrakini birlikte yazalım."', 10, '"Ortaklık mı? Kabul." Elini uzattı; bırakmadı.'],
            ['"Utandım şimdi."', 8, '"İyi. Demek ki doğru yazmışım."'],
            ['Sessizce alkışla.', 6, 'Han alkışa katıldı. Ozan sana göz kırptı.']] },
      { t: 'Ozan sazını bırakıyor. "Bir türkü bitmiyor. Sonu yok çünkü... sonunu seninle yazmak istiyorum."', confess: true,
        o: [['"Yaz o zaman."', 10, 'O gece handa kimse uyumadı; Ozan sabaha kadar çaldı.', 'partner'],
            ['"Sen benim en iyi dostumsun."', 0, '"Dost türküleri de güzeldir." Göz kırptı ama sesi titredi.', 'friend']] },
    ],
    chat: ['Ozan yeni bir dörtlük deniyor; sonunu sana soruyor.', 'Ozan çarşıdan duyduğu dedikoduları anlatıyor; yarısı uydurma.'],
    date: 'Ozan\'la gece yarısı köprünün üstünde, yalnızca ikiniz için çalınan bir türküyle oturdunuz.' },
  yumurtaci: { npc: 'yumurtaci', ad: 'Hatice', unvan: 'Yumurtacı', romance: false,
    perks: [[25, 'Komşu hatırı: yumurtalar %20 ucuz'], [50, 'Sıcak eller: yumurtalar 1 haftada çatlar'], [80, 'Nadir bir yumurta hediyesi']],
    scenes: [
      { t: 'Hatice çay demlemiş. "Otur evladım. Yorgunsun, yüzünden belli."',
        o: [['"Teşekkür ederim, gerçekten yorgunum."', 10, 'Önüne bir dilim çörek koydu. "Ye bakalım."'],
            ['"Yumurtalardan konuşalım."', 4, '"İş, iş, iş. Gençler hep böyle."'],
            ['"Vaktim yok."', -2, '"Vakit bulunur evladım." Ama ısrar etmedi.']] },
      { t: 'Hatice sana bir yumurtayı mum ışığına tutmayı öğretiyor. "Bak, şu gölge kanat. Şu da kalbi."',
        o: [['"Bunu dedem de yapardı!"', 10, '"Deden mi? Ben onu tanırdım..." Gözleri doldu.'],
            ['"Hangi yumurta daha iyi?"', 4, '"Hepsi iyi. Ama şunu sev, o sevgiyi bilir."']] },
      { t: '"Dedeni tanırdım. Bir kış yumurtalarım donacaktı; Kor\'u getirdi, bütün gece kümesi ısıttı."',
        o: [['"Bana onu anlatır mısın?"', 10, 'Gece boyu anlattı. Bilmediğin bir dedeyle tanıştın.'],
            ['"Kor bunu hiç anlatmadı."', 6, '"Ejderhalar iyiliklerini anlatmaz evladım."']] },
      { t: 'Hatice sana kendi ördüğü bir atkı uzatıyor. "Kış geliyor. Ocakta kim bakacak sana?"',
        o: [['Sarıl.', 10, '"Hadi hadi." Sırtını sıvazladı. Sesi titriyordu.'],
            ['Atkıyı hemen tak.', 8, '"Yakıştı." Memnun memnun baktı.']] },
      { t: 'Hatice bir sepetin örtüsünü kaldırıyor; içinde sıcacık, damarları ışıldayan bir yumurta. "Bunu yıllardır saklıyordum. Sen artık benim evladım gibisin."', confess: true,
        o: [['Yumurtayı al, elini öp.', 10, 'Yumurta sepete kondu. Hatice\'nin gözleri gülüyordu.', 'gift']] },
    ],
    chat: ['Hatice çarşının dedikodularını anlatıyor; hepsine bir öğüt ekliyor.', 'Hatice yeni yumurtaların hangisinin huysuz olacağını tahmin ediyor.'],
    date: '' },
};
const LANG = [
  null,
  { ad: 'Pul Dili', fiyat: 120, un: 10, d: 'Ejderhaların dileklerini anlarsın. Yerine getirilen dilek bağ +6, moral +1 verir.' },
  { ad: 'Kor Dili', fiyat: 220, un: 25, d: 'Sohbetlerde "derin sohbet" seçeneği açılır: karakterini istediğin yöne güçlü biçimde şekillendirirsin.' },
  { ad: 'Kadim Dil', fiyat: 360, un: 45, d: 'Ejderhalar kendi kanlarını anlatır: genler laboratuvarsız görünür, sohbette favori yemeğini söyler.' },
];

function rel(k) { return (S.rel && S.rel[k]) || 0; }
function addRel(k, v) { S.rel = S.rel || {}; const b = rel(k); S.rel[k] = clamp(b + v, 0, 100); for (const [lv, t] of SOC[k].perks) if (b < lv && S.rel[k] >= lv) toast(`<b>${SOC[k].ad}</b> · ${t}`, 'goal'); }
const perk = (k, lv) => rel(k) >= lv;
function socStage(k) { const r = rel(k); return r < 20 ? 0 : r < 40 ? 1 : r < 60 ? 2 : r < 80 ? 3 : 4; }
const langLv = () => S.lang || 0;
const seferCost = r => Math.round(REGIONS[r].fiyat * (perk('selin', 25) ? 0.5 : 1));
const smithPrice = id => Math.round(ITEMS[id].fiyat * (perk('kerim', 25) ? 0.85 : 1));
const sellBack = id => Math.floor(ITEMS[id].fiyat * (perk('kerim', 50) ? 0.7 : 0.5));
const eggPrice = e => Math.round(e.price * (perk('yumurtaci', 25) ? 0.8 : 1));

/* ---------- Han ekranı ---------- */
function hanView() {
  const used = S.evening === S.week;
  const card = k => {
    const N = SOC[k], r = rel(k), partner = S.partner === k;
    const img = asset('npc-' + N.npc) ? `<img src="${asset('npc-' + N.npc)}" alt="">` : npcSVG(N.npc);
    return `<div class="hcard ${partner ? 'partner' : ''}" data-hover>
      <div class="hpic">${img}${partner ? '<span class="hbadge">Sevgilin</span>' : ''}</div>
      <div class="htxt"><b>${N.ad}</b><small>${N.unvan}${N.romance ? '' : ' · dostluk'}</small>
        <div class="hmeter"><i style="width:${r}%"></i><span>${r}</span></div>
        <ul class="hperks">${N.perks.map(([lv, t]) => `<li class="${r >= lv ? 'on' : ''}"><em>${lv}</em>${t}</li>`).join('')}</ul></div>
      <button class="btn ${used ? 'ghost' : 'primary'} sm wide" data-a="eve" data-k="${k}" ${used ? 'disabled' : ''}>${used ? 'Bu akşam doldu' : partner ? 'Birlikte bir akşam' : 'Akşamı onunla geçir'}</button></div>`;
  };
  const L = langLv(), next = LANG[L + 1];
  const bilge = `<div class="hcard bilge" data-hover>
    <div class="hpic">${asset('npc-bilge') ? `<img src="${asset('npc-bilge')}" alt="">` : npcSVG('bilge')}</div>
    <div class="htxt"><b>Bilge Ejder</b><small>Ejder Dili öğretmeni</small>
      <ul class="hperks">${LANG.slice(1).map((x, i) => `<li class="${L > i ? 'on' : ''}"><em>${['I', 'II', 'III'][i]}</em><span><b>${x.ad}</b> ${x.d}</span></li>`).join('')}</ul></div>
    ${next ? `<button class="btn primary sm wide" data-a="lang" ${S.gold < next.fiyat || S.un < next.un ? 'disabled' : ''}>${next.ad} · ${goldTxt(next.fiyat)}${S.un < next.un ? ` <small>(${next.un} ün gerekir)</small>` : ''}</button>` : '<span class="mute sm">Bütün dersleri tamamladın.</span>'}</div>`;
  return `<div class="han">
    <button class="backbtn" data-a="stall-back">${ui('left')} Çarşıya dön</button>
    <header class="hhead"><h2>Kervansaray Hanı</h2><p>${used ? 'Bu akşamı zaten birisiyle geçirdin. Haftaya yine gel.' : 'Haftada bir akşam. Kiminle geçireceksin?'}</p></header>
    ${pager('han', [...Object.keys(SOC).map(card), bilge], PER(5, 1), x => x)}
  </div>`;
}

let CUR_EVE = null;
function eveModal(k) {
  const N = SOC[k]; S.relSeen = S.relSeen || [];
  let st = socStage(k), sc = N.scenes[st];
  const id = k + ':' + st;
  if (st === 4 && (S.partner === k || S.relSeen.includes(id))) sc = null;
  else if (st < 4 && S.relSeen.includes(id)) sc = null;
  if (!sc) {
    const text = S.partner === k && N.date ? N.date : pick(N.chat);
    sc = { t: text, o: [['Sohbeti uzat.', S.partner === k ? 3 : 5, `${N.ad} ile gece uzadı.`]], chat: true };
  }
  CUR_EVE = { k, sc, id };
  vn({ speaker: N.ad, kicker: `Han · ${N.unvan}`, art: npcSVG(N.npc, 'big'), text: sc.t,
    opts: sc.o.map((o, i) => { const why = o[3] === 'pay30' && S.gold < 30 ? 'Yeterli altın yok' : null; return `<button class="vopt" data-a="eveopt" data-i="${i}" ${why ? 'disabled' : ''}>${o[0]}${why ? `<small>${why}</small>` : ''}</button>`; }).join(''),
    bg: sceneOr('pazar', '') });
  SFX.play('page');
}
const SOC_ACT = {
  han() { UI.stall = 'han'; UI.vsay = null; SFX.play('tab'); render(); },
  eve(el) { if (S.evening === S.week) return; pushModal(() => eveModal(el.dataset.k)); },
  eveopt(el) {
    const { k, sc, id } = CUR_EVE, o = sc.o[+el.dataset.i], N = SOC[k];
    if (o[3] === 'pay30') { if (S.gold < 30) return; S.gold -= 30; }
    S.evening = S.week; S.relSeen = S.relSeen || [];
    if (!sc.chat) S.relSeen.push(id);
    addRel(k, o[1]);
    let extra = '';
    if (o[3] === 'partner') { S.partner = k; chron(`${N.ad} ile sevgili oldunuz.`); S.album = S.album || []; S.album.push({ w: S.week, kind: 'heart', title: N.ad, text: `${N.ad} ile o akşam bir şey değişti.`, npc: N.npc }); extra = ' Artık sevgilisiniz: her hafta ejderhalarından biri bu mutluluktan pay alır.'; SFX.play('heart'); FX.hearts(innerWidth * 0.3, innerHeight * 0.4); }
    if (o[3] === 'gift') {
      const g = randomGenes({ q: 0.5 }); g.eye = ['A', 'A'];
      S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [pick(TRAIT_KEYS.filter(t => t !== 'vahsi'))], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Hatice\'nin hediyesi' });
      chron('Hatice sana nadir bir yumurta hediye etti.'); extra = ' Nadir yumurta Yuva\'ya kondu.';
    }
    vn({ speaker: N.ad, kicker: `Han · ${N.unvan}`, art: $('.vnart')?.innerHTML || '', text: o[2] + extra,
      after: `<div class="fxchips"><span class="${o[1] >= 0 ? 'good' : 'bad'}">${N.ad} ${o[1] >= 0 ? '+' : ''}${o[1]}</span></div>`,
      opts: `<button class="vopt primary" data-a="mclose">Hana dön</button>`, bg: sceneOr('pazar', '') });
    afterAction(true);
  },
  lang() {
    const L = langLv(), n = LANG[L + 1]; if (!n || S.gold < n.fiyat || S.un < n.un) return;
    S.gold -= n.fiyat; S.lang = L + 1; chron(`Bilge Ejder'den ${n.ad} öğrendin.`);
    toast(`<b>${n.ad}</b> öğrenildi. ${n.d}`, 'goal'); afterAction();
  },
  deeptalk(el) {
    const d = CUR_TALK?.d; if (!d) return; const ax = el.dataset.x, s = +el.dataset.s;
    const m = nudge(d, ax, 9 * s); addBond(d, 4); d.talked = true; S.st.talk++;
    const said = { ces: s > 0 ? 'Cesaretini övdün; göğsünü kabarttı.' : 'Sabrın gücünü anlattın; gözlerini kıstı.', sic: s > 0 ? 'Onu sevdiğini söyledin; kanadını üstüne örttü.' : 'Kendi ayakları üstünde durmasını öğütledin; başını dikti.', dis: s > 0 ? 'Disiplinin değerini anlattın; kuyruğunu düzeltip dimdik durdu.' : 'Kuralları biraz esnetmesini söyledin; gözleri muzipçe parladı.' }[ax];
    vn({ speaker: d.name, kicker: 'Derin sohbet · Kor Dili', art: `<div class="vdr love">${dragonSVG(d)}</div>`, text: said, after: `<div class="fxchips"><span class="heart">Bağ +4</span>${m ? `<span class="good">${m}</span>` : ''}</div>`, opts: `<button class="vopt primary" data-a="mclose">Devam</button>`, bg: sceneOr('ahir', sceneAhir(d.el)) });
    afterAction(true);
  },
};

/* ---------- Dilekler (Pul Dili) ---------- */
const WISHES = [
  { t: 'walk', txt: d => 'Biriyle gezmek istiyor', ok: d => d.task && d.task.t === 'walk', can: d => d.stage !== 'yavru' },
  { t: 'rest', txt: d => 'Bir hafta dinlenmek istiyor', ok: d => d.task && d.task.t === 'rest', can: d => d.fat >= 20 },
  { t: 'train', txt: d => `${ST_AD[d.wish.k]} çalışmak istiyor`, ok: d => d.task && d.task.t === 'train' && d.task.k === d.wish.k, can: () => true, k: () => pick(STATS) },
  { t: 'feed', txt: d => d.favKnown ? `${FOODS[d.fav].ad} özledi` : 'En sevdiği yemeği özledi', ok: d => d.fedFav === S.week, can: () => true },
  { t: 'care', txt: d => 'Yıkanmak istiyor', ok: d => careDone(d, 'wash'), can: d => (d.dirt || 0) >= 20 },
  { t: 'fight', txt: d => 'Arenada dövüşmek istiyor', ok: d => d.task && d.task.t === 'done' && /dövüş/.test(d.task.what || ''), can: d => d.stage !== 'yavru' && !d.inj },
];
function wishText(d) { const W = d.wish && WISHES.find(w => w.t === d.wish.t); return W ? W.txt(d) : ''; }
function resolveWishes(report) {
  for (const d of S.dragons) {
    if (!d.wish) continue;
    const W = WISHES.find(w => w.t === d.wish.t), lines = [];
    if (W && W.ok(d)) { addBond(d, 6); addMood(d, 1); lines.push(`<b class="heart">Dileği yerine geldi:</b> ${W.txt(d).toLowerCase()}. Bağ +6, moral +1.`); }
    else if (W) { addMood(d, -1, true); lines.push(`<span class="warn">Dileği yerine gelmedi (${W.txt(d).toLowerCase()}). Moral -1.</span>`); }
    d.wish = null;
    const ex = report.find(r => r.d === d); if (ex) ex.lines.push(...lines); else report.push({ d, lines });
  }
}
function rollWishes() {
  if (langLv() < 1) return;
  for (const d of S.dragons) {
    if (d.wish || !chance(32)) continue;
    const pool = WISHES.filter(w => w.can(d)); if (!pool.length) continue;
    const W = pick(pool); d.wish = { t: W.t }; if (W.k) d.wish.k = W.k();
  }
}
/* ---------- Haftalık sosyal etkiler ---------- */
function socialWeek(gen) {
  if (perk('ozan', 50)) { S.un += 1; gen.push('Ozan\'ın türküsü çarşıda dolaşıyor: +1 ün'); }
  if (S.partner && S.dragons.length) { const d = pick(S.dragons); addMood(d, 1); gen.push(`${SOC[S.partner].ad} ocağa uğradı; ${d.name} sevindi: moral +1`); }
}
