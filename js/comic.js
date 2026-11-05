'use strict';
/* ============ EJDER OCAĞI — ÇİZGİ ROMAN HİKÂYE SAYFALARI ============
   Hikâye olayları sayfa sayfa çizgi roman kareleriyle anlatılır; seçimler son sayfanın altında gelir.
   Bir kare: arka plan + karakter (NPC portresi, ocağın yıldızı ya da rakip ejderha pozu) + konuşma balonu / anlatı kutusu.
   Pozlar karelere kutu-sığdırma ve kesik kenar kuralıyla yerleşir: hiçbir ejderha ya da kafa yarım görünmez.
   Demirhan hikâyesi (3. hafta, 7. hafta, Taç daveti), ocağın kuruluş hikâyeleri ve rastgele olayların çoğu çizgi roman olarak anlatılır.
   Yetişkin ejderhalar ek pozlarla (nefes, siper, uyku, havalanma…), yavru ve gençler açı çizimleriyle (önden, üç çeyrek) görünür. */

// Demirhan'ın şampiyonu: saf kanlı, kara pullu bir Gölge
function karabela() {
  const r = typeof rivals === 'function' ? rivals()[0] : null, ch = (r && r.champ) || { name: 'Karabela', el: 'golge' };
  if (!ch.gx) ch.gx = { pul: ['n', 'n'], sus: ['n', 'n'], pig: ['m', 'm'], par: ['p', 'p'], boy: ['i', 'o'] };
  if (ch.hue == null) ch.hue = 0;
  return poseDragon(ch, 'kb');
}
const comicStar = () => (typeof ensureStar === 'function' && ensureStar()) || (typeof S !== 'undefined' && S && Array.isArray(S.dragons) && S.dragons[0]) || { name: 'Kızılpul', el: 'ates', stage: 'yetiskin' };

// Kare yardımcıları: yetişkinse poz, değilse açı çizimi (yavru ve gençlerde pozlar yok)
const AD = d => d && (d.stage || 'yetiskin') === 'yetiskin';
const D = (d, pz, o = {}) => ({ dr: d, pz: AD(d) && hasPose(d, pz) ? pz : null, ...o });
const otherD = (not, f) => (typeof S !== 'undefined' && S && Array.isArray(S.dragons) ? S.dragons.filter(x => x !== not && !x.dead && (!f || f(x)))[0] : null) || null;

const COMIC = {
  /* ---------- Demirhan hikâyesi ---------- */
  demirhan: () => { const st = comicStar(), kb = karabela(); return [
    { lay: 'a', p: [
      { bg: 'bg-pazar', cap: 'Pazarda kalabalık bir anda yarılıyor. Simsiyah pullu bir ejderha yürüyor; adımlarıyla taşlar titriyor.', dr: kb, pz: 'P7', face: 'l', rim: 1, box: '26,8,72,90,c' },
      { bg: 'bg-pazar', npc: 'demirhan', side: 'r', say: 'Dedenin harabesini mi diriltiyorsun?' },
      { bg: 'bg-pazar', npc: 'demirhan', side: 'l', say: 'Kızıl Taç’ta görüşürüz. Tabii oraya kadar dayanabilirsen.' },
    ] },
    { lay: 'c', p: [
      D(st, 'P3', { bg: 'bg-pazar', face: 'r', av: ['front'], cap: st ? `${st.name} gözünü ${ek(kb.name, 'abl')} ayırmıyor.` : 'Ocağın ejderhaları uzaktan izliyor.' }),
      { bg: 'bg-pazar', npc: 'kerim', side: 'r', cap: 'Aynı gün demirci Usta Kerim de dükkânının kepenklerini kaldırıyor.', say: 'Demirhan’a kafa tutacaksan çelik lazım evlat.' },
    ], ask: 'Demirhan cevabını bekliyor.' },
  ]; },
  dem2: () => { const st = comicStar(); return [
    { lay: 'a', p: [
      D(st, 'P3', { bg: 'bg-ahir', night: 1, cap: 'Kupa’ya birkaç hafta var. Gece yarısı, ahırın çitinde bir kıpırtı.', face: 'r', box: '14,8,72,90,c', av: ['front'] }),
      { bg: 'bg-ahir', night: 1, npc: 'kantuccari', sil: 1, side: 'r', cap: 'Kara pelerinli biri. Elinde bir torba.', say: 'Bunu yemine kat, Kupa’da ayakta duramaz…' },
      { bg: 'bg-pazar', npc: 'demirhan', side: 'l', cap: 'Pelerinde Kara Kanat’ın arması. O sözler hâlâ kulağında:', say: 'Tabii oraya kadar dayanabilirsen.' },
    ] },
    { lay: 'b', p: [
      D(st, 'P12', { bg: 'bg-ahir', night: 1, face: 'r', box: '6,6,88,90,c', av: ['low', '34'], cap: st ? `${st.name} uyanık. Dişlerini gösteriyor.` : 'Ejderhalar uyanık. Bekliyor.' }),
    ], ask: 'Ne yapacaksın?' },
  ]; },
  tac_davet: () => { const st = comicStar(), kb = karabela(); return [
    { lay: 'a', p: [
      { bg: 'bg-pazar', npc: 'muhtar', side: 'r', cap: 'Meydanda Kızıl Taç davetiyeleri dağıtılıyor. 20. hafta, en az 45 ün.', say: `Senin ünün ${S.un}. ${S.un >= 45 ? 'Davetiye senin.' : 'Biraz daha çalışman lazım.'}` },
      { bg: 'bg-arena', dr: kb, pz: 'P16', face: 'l', rim: 1, box: '6,4,88,92,c', cap: `Demirhan şampiyonunu meydanda uçuruyor: ${kb.name}, saf kanlı bir Gölge.` },
      D(st, 'P3', { bg: 'bg-pazar', face: 'r', av: ['34', 'front'], cap: st ? `${st.name} gökteki gölgeyi izliyor.` : 'Ocağın ejderhaları gökyüzünü izliyor.' }),
    ], ask: 'Son beş hafta.' },
  ]; },
  /* ---------- Ocağın kuruluş hikâyeleri ---------- */
  harita: () => { const st = comicStar(); return [
    { lay: 'c', p: [
      { bg: 'bg-ocak', npc: 'selin', side: 'r', cap: 'Kapıda tozlu pelerinli bir kadın duruyor.', say: 'Deden bana bir harita borçluydu, ben de ona bir iyilik. Ödeşelim.' },
      { bg: 'bg-harita', cap: 'Deri tomarda yaban ejderhalarının yuvaları işaretli. Küller, buzullar, kayalıklar, ormanlar…', ...D(st, 'P16', { face: 'r', av: ['34'], box: '30,20,66,76,r' }) },
    ], ask: 'Selin cevabını bekliyor.' },
  ]; },
  cukur: () => [
    { lay: 'a', p: [
      { bg: 'bg-ocak', night: 1, cap: 'Gece kapının altından bir kart itiliyor: bir meşale çizimi ve bir adres.', dr: comicStar(), av: ['front'], face: 'r' },
      { bg: 'bg-pit', npc: 'cukur', side: 'r', cap: 'Ertesi sabah, yara izli elleri olan bir adam.', say: 'Çukurda dövüşenler bir gecede bir aylık para kazanır.' },
      { bg: 'bg-pit', npc: 'cukur', side: 'l', say: 'Kaybedenlerin bazıları eve dönmez. Senin seçimin.' },
    ] },
  ],
  kupa_ilan: () => { const st = comicStar(); return [
    { lay: 'c', p: [
      { bg: 'bg-pazar', npc: 'muhtar', side: 'r', cap: 'Meydandaki direğe kırmızı mühürlü bir ferman asıldı.', say: '10. hafta Bahar Kupası! Üç tur, tek ejderha. En az 15 ün.' },
      D(st, 'P7', { bg: 'bg-arena', face: 'r', av: ['low', '34'], box: '10,4,80,92,c', cap: 'Şampiyona 600 altın ve büyük bir ün.' }),
    ], ask: `Şu an ${S.un} ünün var.` },
  ]; },
  bataklik: () => [
    { lay: 'c', p: [
      { bg: 'bg-ocak', npc: 'selin', side: 'r', cap: 'Haritacı Selin çamura bulanmış çizmeleriyle geri döndü.', say: 'Haritaların boş bıraktığı yeri buldum: Gölge Bataklığı.' },
      { bg: 'bg-bataklik', night: 1, dr: poseDragon({ name: 'Bataklık gölgesi', el: 'golge', hue: 0, gx: { pul: ['n', 'n'], sus: ['n', 'n'], pig: ['N', 'N'], par: ['p', 'p'], boy: ['o', 'o'] } }, 'bt'), pz: 'P3', face: 'l', rim: 1, cap: 'Oradan sağ dönen pek olmaz. Ama orada yaşayanlar… efsane.' },
    ] },
  ],
  kan_tuccari: () => [
    { lay: 'c', p: [
      { bg: 'bg-pazar', night: 1, npc: 'kantuccari', side: 'r', cap: 'Kapüşonlu bir tüccar bir sandığın kapağını aralıyor.', say: 'İki ebeveyni de saf Gölge. 240 altın. Pazarlık yok.' },
      { bg: 'bg-yuva', night: 1, html: `<div class="cegg">${eggSVG({ id: 'kt', genes: { el: ['golge', 'golge'] } }, 0, { glow: true, cls: 'wobble big' })}</div>`, cap: 'Mor damarlı, simsiyah bir yumurta. İçinde bir şey kıpırdıyor.' },
    ] },
  ],
  son_gece: () => { const st = comicStar(); return [
    { lay: 'a', p: [
      { bg: 'bg-yuva', night: 1, cap: 'Kuluçka ocağının taşlarından biri gevşemiş. Arkasında dedenin el yazısıyla bir mektup.', npc: 'dede', side: 'r', say: 'Kazanmak için yetiştirme onları.' },
      { bg: 'bg-yuva', night: 1, npc: 'dede', side: 'l', say: 'Yetiştir ki kazanmak bir anlam taşısın.' },
      D(st, 'P6', { bg: 'bg-ahir', night: 1, face: 'r', av: ['front'], cap: st ? `Yarın Kızıl Taç haftası. ${st.name} burnunu eline dayıyor.` : 'Yarın Kızıl Taç haftası.' }),
    ] },
  ]; },
  /* ---------- Rastgele olaylar ---------- */
  cocuk: c => [
    { lay: 'c', p: [
      D(c.d, 'P6', { bg: 'bg-ocak', face: 'r', av: ['front'], cap: `Bir avuç köy çocuğu çitin üstünden ${ek(c.d.name, 'acc')} seyrediyor.` }),
      D(c.d, 'P16', { bg: 'bg-kayalik', face: 'r', av: ['34'], side: 'l', say: `${c.d.name}! Sırtına binebilir miyiz?`, cap: 'En cesuru bir adım öne çıkıyor.' }),
    ] },
  ],
  kavga: c => [
    { lay: 'c', p: [
      D(c.d, 'P12', { bg: 'bg-ahir', face: 'r', av: ['34'], cap: `${c.d.name} ile ${c.d2.name} aynı yemek kabına uzandı.` }),
      D(c.d2, 'P13', { bg: 'bg-ahir', face: 'l', av: ['34'], cap: 'Dişler gösterildi, kuyruklar kalktı.' }),
    ] },
  ],
  yakin: c => [
    { lay: 'c', p: [
      D(c.d, 'P15', { bg: 'bg-ahir', night: 1, face: 'r', av: ['front'], zz: 1, cap: 'Sabah inlere baktığında…' }),
      D(c.d2, 'P15', { bg: 'bg-ahir', night: 1, face: 'l', av: ['front'], zz: 1, cap: `${c.d.name} ile ${ek(c.d2.name, 'acc')} kanatları birbirine sarılmış uyurken buldun.` }),
    ] },
  ],
  kacak: c => [
    { lay: 'a', p: [
      { bg: 'bg-ahir', night: 1, cap: `Gece ${ek(c.d.name, 'gen')} ini boş kaldı.` },
      D(c.d, 'P16', { bg: 'bg-kayalik', night: 1, face: 'r', av: ['34'], rim: 1, cap: 'Tepelerden uzun bir ulama geliyor.' }),
      D(c.d, 'P3', { bg: 'bg-kayalik', night: 1, face: 'l', av: ['front'], cap: 'Ay ışığında iki göz parlıyor.' }),
    ] },
  ],
  hasta: c => [
    { lay: 'c', p: [
      D(c.d, 'P15', { bg: 'bg-ahir', face: 'r', av: ['front'], cap: `${ek(c.d.name, 'gen')} burnu kuru ve sıcak. Bütün gün inden çıkmadı.`, sick: 1 }),
      D(c.d, 'P3', { bg: 'bg-ahir', face: 'l', av: ['front'], sick: 1, cap: 'Gözleri yarı kapalı, sana bakıyor.' }),
    ] },
  ],
  bilge: c => [
    { lay: 'c', p: [
      { bg: 'bg-kayalik', npc: 'bilge', side: 'r', cap: `Dağdan yaşlı, kör bir ejderha indi. ${ek(c.d.name, 'gen')} önünde durdu.`, say: 'Ne kadar çok olursa, o kadar az görürsün. Nedir?' },
      D(c.d, 'P3', { bg: 'bg-kayalik', face: 'l', av: ['front'], cap: `${c.d.name} düşünüyor.` }),
    ] },
  ],
  casus: c => [
    { lay: 'a', p: [
      D(c.d, 'P8', { bg: 'bg-ocak', face: 'r', av: ['34'], cap: `${c.d.name} antrenmanda.` }),
      { bg: 'bg-ocak', npc: 'kantuccari', sil: 1, side: 'r', cap: 'Çitin arkasında Demirhan’ın adamlarından biri…' },
      { bg: 'bg-ocak', npc: 'kantuccari', sil: 1, side: 'l', say: '…hızı fena değil. Not al.' },
    ] },
  ],
  meteor: () => { const st = comicStar(), o = otherD(st); return [
    { lay: 'a', p: [
      D(st, 'P16', { bg: 'bg-ocak', night: 1, stars: 1, face: 'r', av: ['34'], box: '6,6,88,90,c', cap: 'Gece gökyüzünden yüzlerce yıldız kaydı.' }),
      o ? { bg: 'bg-ocak', night: 1, stars: 1, dr: o, av: ['front'], cap: 'Ejderhalar inlerinden çıktı.' } : { bg: 'bg-ocak', night: 1, stars: 1, cap: 'Ejderhalar inlerinden çıktı.' },
      D(st, 'P6', { bg: 'bg-ocak', night: 1, stars: 1, face: 'l', av: ['front'], cap: 'Sabaha kadar gökyüzünü seyrettiler.' }),
    ] },
  ]; },
  ozan: c => [
    { lay: 'c', p: [
      { bg: 'bg-pazar', npc: 'ozan', side: 'r', cap: `Bir gezgin ozan, ${ek(c.d.name, 'gen')} zaferleri üstüne bir türkü yaktı.`, say: `"${c.d.name} kanat açtı, arena sustu…"` },
      D(c.d, 'P7', { bg: 'bg-arena', face: 'r', av: ['low', '34'], box: '10,4,80,92,c', cap: 'Hanlarda söylemek için senden biraz harçlık bekliyor.' }),
    ] },
  ],
  hirsiz: () => { const b = S.dragons.find(d => AD(d) && hasMark(d, 'Cesur')) || comicStar(); return [
    { lay: 'c', p: [
      { bg: 'bg-ahir', night: 1, npc: 'cukur', sil: 1, side: 'r', cap: 'Gece kilerden tıkırtılar geldi. Biri çuvalları karıştırıyor.' },
      D(b, 'P12', { bg: 'bg-ahir', night: 1, face: 'l', av: ['34', 'front'], cap: b ? `${b.name} uyandı.` : 'Ejderhalar uyandı.' }),
    ] },
  ]; },
  firtina: () => { const st = comicStar(); return [
    { lay: 'c', p: [
      { bg: 'bg-ocak', night: 1, rain: 1, cap: 'Gece bir fırtına inlerden birinin çatısını uçurdu.' },
      D(st, 'P13', { bg: 'bg-ahir', night: 1, rain: 1, face: 'r', av: ['front'], cap: 'Ejderhalar kanatlarına sarınıp sabaha kadar ıslak taşlarda titredi.' }),
    ] },
  ]; },
  yarali: c => { c.wg = c.wg || randomGenes({ q: 0.25 }); const w = { id: 'yw', name: 'Yaban ejderhası', el: expEl(c.wg.el), stage: 'genc', genes: c.wg, hue: 0, st: { gu: 30, ce: 30, da: 30, ze: 30 } }; return [
    { lay: 'c', p: [
      { bg: 'bg-kayalik', cap: 'Kanadı yırtılmış genç bir yaban ejderhası ocağın dışındaki tepeye indi.', dr: w, av: ['34'], face: 'l' },
      { bg: 'bg-kayalik', dr: w, av: ['front'], cap: 'Avcıların tuzağından kaçmış olmalı. Sana ürkek ürkek bakıyor.' },
    ] },
  ]; },
};
/* ---------- Kalan olaylar ---------- */
Object.assign(COMIC, {
  kristal: c => [
    { lay: 'c', p: [
      { bg: 'bg-pazar', npc: 'tuccar', side: 'r', cap: 'Bir gezgin tüccar avucunda parıldayan bir taş tutuyor.', say: 'Kristal Çekirdek. Yutturduğun ejderhanın en zayıf genini güçlendirir.' },
      D(c.d, 'P3', { bg: 'bg-pazar', face: 'l', av: ['front'], html2: '<i class="ccrystal"></i>', cap: `Tüccarın gözü ${ek(c.d.name, 'dat')} takıldı.` }),
    ] },
  ],
  yetim: c => { c.yg = c.yg || randomGenes({ q: 0.18 }); const y = { id: 'yy', name: 'Yavru', el: expEl(c.yg.el), stage: 'yavru', genes: c.yg, hue: 0, st: { gu: 10, ce: 10, da: 10, ze: 10 } }; return [
    { lay: 'c', p: [
      { bg: 'bg-ocak', cap: 'Sabah kapının önünde bir sepet. İçinde minik bir ejderha yavrusu.', dr: y, av: ['front'], html2: '<i class="cbasket"></i>' },
      { bg: 'bg-ocak', dr: y, av: ['front'], cap: 'Boynunda tek bir not: “Bakamıyoruz.”', say: '…mii?', side: 'l' },
    ] },
  ]; },
  sponsor: () => { const st = comicStar(); return [
    { lay: 'c', p: [
      { bg: 'bg-pazar', npc: 'tuccar', side: 'r', cap: 'Tüccarlar loncasından biri geldi. Elinde sarı bir bayrak.', say: 'Ejderhaların bu bayrağı taşısın; kesen peşin dolsun.' },
      D(st, 'P7', { bg: 'bg-arena', face: 'r', av: ['low', '34'], html2: '<i class="cflag"></i>', cap: 'Seyirci bayrağı görür. Ama kimin ocağı olduğunu da hatırlar.' }),
    ] },
  ]; },
  sicak: () => { const a = S.dragons.find(d => d.el === 'ates') || comicStar(), b = S.dragons.find(d => d.el === 'buz') || otherD(a); return [
    { lay: 'c', p: [
      D(a, 'P7', { bg: 'bg-kul', heat: 1, face: 'r', av: ['low', '34'], cap: 'Bir hafta boyunca güneş taşları kızdırdı.' }),
      b ? D(b, 'P15', { bg: 'bg-kul', heat: 1, face: 'l', av: ['front'], cap: 'Kuyular yarıya indi. Herkes gölge arıyor.' }) : { bg: 'bg-kul', heat: 1, cap: 'Kuyular yarıya indi.' },
    ] },
  ]; },
  terk: c => { c.eg = c.eg || randomGenes({ q: 0.22 }); return [
    { lay: 'c', p: [
      { bg: 'bg-orman', cap: 'Dere kıyısında, sazlıkların arasında yarı gömülü bir şey.', html: `<div class="cegg reed">${eggSVG({ id: 'tk', genes: c.eg }, 0, { glow: true })}</div>` },
      { bg: 'bg-orman', html: `<div class="cegg">${eggSVG({ id: 'tk', genes: c.eg }, .5, { glow: true, cls: 'wobble big' })}</div>`, cap: 'Hâlâ ılık. İçinden belli belirsiz bir tıkırtı geliyor.' },
    ] },
  ]; },
  bayram: () => { const st = comicStar(), o = otherD(st); return [
    { lay: 'a', p: [
      { bg: 'bg-pazar', npc: 'muhtar', side: 'r', cap: 'Köyde Ejder Bayramı! Ocaklar kurdeleyle süsleniyor.', say: 'Bu akşam bütün ejderhalar şölende!', html2: '<i class="cconfetti"></i>' },
      D(st, 'P14', { bg: 'bg-pazar', face: 'r', av: ['front'], cap: 'Kazanlar kaynıyor, sofralar kuruluyor.' }),
      o ? D(o, 'P6', { bg: 'bg-pazar', face: 'l', av: ['front'], html2: '<i class="cconfetti"></i>', cap: 'Herkes ejderhasına bir ikram getirmiş.' }) : { bg: 'bg-pazar', cap: 'Herkes ejderhasına bir ikram getirmiş.' },
    ] },
  ]; },
  kerim: c => { const pool = Object.keys(ITEMS).filter(k => ITEMS[k].tier === 2); c.item = c.item || pick(pool); return [
    { lay: 'c', p: [
      { bg: 'bg-pazar', npc: 'kerim', side: 'r', cap: 'Usta Kerim yeni bir dövme tekniği denemiş.', say: 'Usta işi bir parça. Sana yarı fiyatına veririm.' },
      { bg: 'bg-pazar', night: 1, html: `<div class="citem">${itemIcon(c.item)}</div>`, cap: `${ITEMS[c.item].ad}. Örsten yeni çıkmış, hâlâ kızıl.` },
    ] },
  ]; },
  mektup: () => [
    { lay: 'c', p: [
      { bg: 'bg-yuva', npc: 'dede', side: 'r', cap: 'Dedenin eski yol arkadaşından bir mektup ve küçük bir kese geldi.', say: 'Bir ejderha, ebeveynlerinde görünmeyen bir şeyi taşıyabilir.' },
      { bg: 'bg-yuva', night: 1, html: `<div class="cegg">${eggSVG({ id: 'mk', genes: { el: ['golge', 'buz'] } }, 0, { glow: true })}</div>`, cap: 'Gözler ve gölge, ikisi de saklanmayı sever.' },
    ] },
  ],
});

/* ---------- Ek hikâye bölümleri (boş haftalara) ---------- */
const kupaWon = () => S.dragons.some(d => ((d.tourW || {}).kupa || 0) >= 3) || (S.chron || []).some(x => / Bahar Kupası'nı kazandı!/.test(x.t));
const korD = () => S.dragons.find(d => d.origin === 'Dedenden kaldı' && !d.dead) || null;
const ADD_STORY = {
  6: { id: 'kor_ani', cond: () => !!korD(), title: 'Kor’un Hatırası',
    text: () => `${korD().name}, ahırın köşesinde dedenin eski eyerini kokluyor. Uzun süre başını kaldırmıyor.`,
    opts: [
      { t: 'Yanına otur, dedeni anlat', fx: () => { const k = korD(); addBond(k, 8); addMood(k, 1); chron(`${k.name} dedenin eyerini buldu; o gece uzun uzun dedeni anlattın.`); return `${k.name} başını dizine koydu ve sabaha kadar dinledi. Bağ +8, moral +1.`; } },
      { t: 'Eyeri temizle ve ahırın duvarına as', fx: () => { for (const d of S.dragons) addMood(d, 1); S.un += 1; return 'Eyer artık ocağın duvarında. Ejderhalar önünden geçerken duruyor: bütün ejderhalar moral +1, +1 ün.'; } },
    ] },
  11: { id: 'dem3', title: 'Kupanın Ardından',
    text: () => kupaWon() ? 'Demirhan meydanda yolunu kesiyor. Gözleri kupada: "Bir kupa kazandın diye kendini bir şey sandın."' : 'Demirhan meydanda gülüyor: "Kupa bile sana çok geldi. Taç’ı rüyanda görürsün."',
    opts: [
      { t: () => kupaWon() ? '“Taç’ta görüşeceğiz, unutma.”' : 'Rövanş sözü ver', fx: () => { const st = comicStar(); S.un += 3; if (st) nudge(st, 'ces', 6); return `Meydandakiler duydu: +3 ün.${st ? ` ${st.name} cesaretlendi.` : ''}`; } },
      { t: () => kupaWon() ? 'Elini uzat' : 'Sessizce çalışmaya dön', fx: () => { const st = comicStar(); if (kupaWon()) { S.flags.demHand = 1; S.un += 1; if (st) nudge(st, 'sic', 4); return 'Demirhan elini sıkmadı ama bir an durakladı. +1 ün.'; } if (st) { const k = STATS.reduce((a, b) => st.st[a] <= st.st[b] ? a : b); st.st[k] = Math.min(capOf(st, k), st.st[k] + 2); nudge(st, 'dis', 5); return `${st.name} o gece geç saate kadar çalıştı: ${ST_AD[k]} +2, disiplin arttı.`; } return 'Çalışmaya döndün.'; } },
    ] },
  14: { id: 'selin_yavru', title: 'Bataklıktaki Yavru',
    text: () => 'Haritacı Selin nefes nefese geldi: Gölge Bataklığı’nda kayalara sıkışmış bir yaban yavrusu bulmuş. Tek başına çıkaramıyor; güçlü bir ejderha lazım.',
    opts: [
      { t: 'Bir ejderhanı gönder', req: () => freeSlots() < 1 ? 'İnlerde boş yer yok' : S.dragons.some(d => d.stage === 'yetiskin' && canAct(d)) ? null : 'Boşta bir yetişkin ejderha gerekir', fx: c => {
        const e = S.dragons.filter(d => d.stage === 'yetiskin' && canAct(d)).sort((a, b) => b.st.gu - a.st.gu)[0]; e.fat = clamp(e.fat + 20, 0, 100); addBond(e, 3);
        c.sg = c.sg || randomGenes({ q: 0.35, el: 'golge' });
        const y = mkDragon({ genes: c.sg, stage: 'yavru', age: 0, bond: 40, mood: 3, origin: 'Bataklıktan kurtarıldı' }); S.dragons.push(y); S.st.acq++;
        chron(`${e.name}, Selin'le birlikte bataklıktan ${ek(y.name, 'acc')} kurtardı.`); return `${e.name} kayaları omzuyla itti; yavru kurtuldu. Ona ${y.name} adını verdin (${EL_AD[y.el]}). ${e.name} yoruldu ama gururlu.`; } },
      { t: 'Selin’e yem ver, yavruyu kendi yuvasına götürsün', fx: () => { S.food.balik = Math.max(0, (S.food.balik || 0) - 1); S.un += 2; return 'Selin yavruyu annesinin yuvasına kadar taşıdı. Köyde anlatılıyor: +2 ün.'; } },
    ] },
  16: { id: 'dem4', title: 'Karabela’nın Yarası',
    text: () => `Gece kapın çalınıyor. Demirhan, yanında kanadı kanlar içinde ${karabela().name}. Avcıların tuzağına düşmüş. "Köyde senden iyi bakan yok. Yardım et."`,
    opts: [
      { t: () => hasB('sifa') ? 'Şifahanende tedavi et' : 'Yarasını sar (60 altın)', req: () => hasB('sifa') || S.gold >= 60 ? null : 'Şifahane ya da 60 altın gerekir', fx: () => { if (!hasB('sifa')) S.gold -= 60; S.flags.demHelped = 1; S.un += 4; chron(`Rakibin şampiyonu ${karabela().name}, senin ocağında iyileşti.`); return `${karabela().name} sabaha karşı ayağa kalktı. Demirhan kapıda durdu: "Taç’ta zırhsız çıkacağım. Borcumu böyle öderim." +4 ün.`; } },
      { t: 'Kapıyı kapat', fx: () => { S.flags.demRefused = 1; S.un = Math.max(0, S.un - 3); return `Demirhan tek kelime etmeden gitti. Köyde “katı yürekli” diye konuşuluyor (−3 ün). ${karabela().name} Taç’a yarası tam kapanmadan çıkacak.`; } },
    ] },
  18: { id: 'tac_gece', title: 'Taç’tan Önce',
    text: () => { const st = comicStar(); return st ? `Kızıl Taç’a iki hafta var. ${st.name} gece uyuyamıyor; inin önünde dolanıp duruyor.` : 'Kızıl Taç’a iki hafta var.'; },
    opts: [
      { t: 'Bütün gece yanında kal', fx: () => { const st = comicStar(); if (!st) return 'Gece sessiz geçti.'; addBond(st, 6); addMood(st, 2); return `Sabaha kadar yan yana oturdunuz. ${st.name} sonunda başını omzuna koyup uyudu. Bağ +6, moral +2.`; } },
      { t: 'Gece uçuşuna çık', fx: () => { const st = comicStar(); if (!st) return 'Gece sessiz geçti.'; st.st.ce = Math.min(capOf(st, 'ce'), st.st.ce + 3); st.fat = clamp(st.fat + 10, 0, 100); return `Yıldızların altında uzun bir uçuş. ${st.name} çevikliğini tazeledi: Çeviklik +3, biraz yoruldu.`; } },
    ] },
};
for (const w in ADD_STORY) if (!STORY[w]) STORY[w] = ADD_STORY[w];

Object.assign(COMIC, {
  kor_ani: () => { const k = korD(); return [
    { lay: 'a', p: [
      D(k, 'P6', { bg: 'bg-ahir', face: 'r', av: ['front'], html2: '<i class="csaddle"></i>', cap: `${k.name} ahırın köşesinde dedenin eski eyerini kokluyor.` }),
      { bg: 'bg-yuva', night: 1, npc: 'dede', side: 'r', cap: 'Eyerin derisinde dedenin parmak izleri…', say: `${k.name}, bu ocağın kalbi sensin.` },
      D(k, 'P3', { bg: 'bg-ahir', face: 'l', av: ['front'], cap: 'Başını kaldırıp sana bakıyor.' }),
    ] },
  ]; },
  dem3: () => { const st = comicStar(), kb = karabela(), won = kupaWon(); return [
    { lay: 'a', p: [
      { bg: 'bg-pazar', npc: 'demirhan', side: 'r', cap: won ? 'Kupa sendeyken meydanda Demirhan yolunu kesiyor.' : 'Meydanda Demirhan’ın kahkahası.', say: won ? 'Bir kupa kazandın diye kendini bir şey sandın.' : 'Kupa bile sana çok geldi.' },
      { bg: 'bg-pazar', dr: kb, pz: 'P12', face: 'l', rim: 1, box: '4,6,92,90,c', cap: `${kb.name} dişlerini gösteriyor.` },
      D(st, won ? 'P7' : 'P3', { bg: 'bg-pazar', face: 'r', av: ['low', '34'], cap: st ? (won ? `${st.name} geri adım atmıyor.` : `${st.name} gözünü yere indirmiyor.`) : 'Ocağın ejderhaları izliyor.' }),
    ] },
  ]; },
  selin_yavru: c => { c.sg = c.sg || randomGenes({ q: 0.35, el: 'golge' }); const y = { id: 'sy', name: 'Yavru', el: expEl(c.sg.el), stage: 'yavru', genes: c.sg, hue: 0, st: { gu: 10, ce: 10, da: 10, ze: 10 } }; const e = S.dragons.filter(d => d.stage === 'yetiskin' && canAct(d)).sort((a, b) => b.st.gu - a.st.gu)[0]; return [
    { lay: 'a', p: [
      { bg: 'bg-ocak', npc: 'selin', side: 'r', cap: 'Haritacı Selin nefes nefese geldi.', say: 'Bataklıkta kayalara sıkışmış bir yavru var! Tek başıma çıkaramıyorum.' },
      { bg: 'bg-bataklik', night: 1, dr: y, av: ['front'], cap: 'Gölge Bataklığı. Sis, çamur ve küçük, korkmuş bir ses.' },
      e ? D(e, 'P16', { bg: 'bg-bataklik', night: 1, face: 'r', av: ['34'], cap: `${e.name} kanatlarını açıyor. Hazır.` }) : { bg: 'bg-bataklik', night: 1, cap: 'Güçlü bir ejderha lazım.' },
    ] },
  ]; },
  dem4: () => { const kb = karabela(); return [
    { lay: 'a', p: [
      { bg: 'bg-ocak', night: 1, rain: 1, npc: 'demirhan', side: 'r', cap: 'Gece kapın çalınıyor. Kapıda, ıslanmış bir Demirhan.', say: 'Köyde senden iyi bakan yok…' },
      { bg: 'bg-ocak', night: 1, rain: 1, dr: kb, pz: 'P5', face: 'l', rim: 1, box: '4,24,92,72,c', cap: `${kb.name} avcıların tuzağına düşmüş. Kanadı kanlar içinde.` },
      { bg: 'bg-ocak', night: 1, rain: 1, npc: 'demirhan', side: 'l', say: 'Yardım et. Lütfen.' },
    ] },
  ]; },
  tac_gece: () => { const st = comicStar(); return [
    { lay: 'a', p: [
      D(st, 'P3', { bg: 'bg-ahir', night: 1, face: 'r', av: ['front'], cap: 'Kızıl Taç’a iki hafta var. Ahırda herkes uyuyor…' }),
      D(st, 'P16', { bg: 'bg-ocak', night: 1, stars: 1, face: 'r', av: ['34'], cap: st ? `…${st.name} hariç. İnin önünde dolanıp gökyüzüne bakıyor.` : '…biri hariç.' }),
      D(st, 'P6', { bg: 'bg-ahir', night: 1, face: 'l', av: ['front'], cap: 'Seni görünce burnunu uzatıyor.' }),
    ] },
  ]; },
});

function buildNativeComicPanelHTML(x, i = 0) {
  if (!x) return '';
  if (typeof x.html === 'string' && x.html.trim().startsWith('<div class="cpan')) {
    let pre = x.html.replace(/\bcp0\b/, 'cp' + i);
    if (x.bg && /^linear-gradient/i.test(x.bg)) {
      pre = pre.replace('<div class="cpan ', `<div style="background:${x.bg}" class="cpan `);
    }
    return pre;
  }
  let ch = '';
  const drObj = x.dr || (x.dragon ? (typeof comicStar === 'function' ? comicStar() : { el: 'ates', stage: 'yavru' }) : null);
  if (x.html) ch += x.html;
  if (x.npc) {
    const npcSrc = asset('npc-' + x.npc) || ('img/npc-' + x.npc + '.webp');
    ch += `<img class="cnpc ${x.side || 'r'} ${x.sil ? 'sil' : ''} ${x.zoom ? 'cnpc-zoom' : ''}" src="${npcSrc}" alt="">`;
  }
  if (x.prop) {
    const propSrc = asset(x.prop) || x.prop;
    ch += `<img class="cnpc ${x.side || 'r'} ${x.zoom ? 'cnpc-zoom' : ''}" src="${propSrc}" alt="">`;
  }
  if (drObj) {
    const hasCoProp = !!(x.prop || x.npc);
    const dFace = x.face || (hasCoProp ? 'r' : undefined);
    const coStyle = hasCoProp ? 'style="left:4%;right:auto;width:44%"' : '';
    if (x.pz && AD(drObj) && hasPose(drObj, x.pz)) {
      const es = poseEdgeStyle(drObj, x.pz, dFace), M = POSE_META[drObj.el + '-' + x.pz], ar = (M[1] / M[0]).toFixed(4);
      let cc = M[2] || ''; if (dFace && dFace !== poseFace(drObj, x.pz)) cc = cc.replace(/[lr]/g, k => k === 'l' ? 'r' : 'l');
      ch += `<div class="rcd ${es ? 'edge' : ''} ${x.rim ? 'rim' : ''}" data-ar="${ar}" data-c="${cc}" ${es ? `style="${es}"` : `data-box="${poseBox(drObj, x.pz, x.box || '10,8,80,88,c')}"`}>${poseSVG(drObj, x.pz, { face: dFace, still: true })}</div>`;
    } else {
      const av = bestAngle(drObj, ...(x.av || []), '34', 'front');
      ch += `<div class="cmdr ${av ? 'cang' : ''}" ${coStyle}>${av ? angleSVG(drObj, av, { face: dFace }) : dragonSVG(drObj, { still: true, flip: dFace === 'l' })}</div>`;
    }
  }
  if (x.html2) ch += x.html2;
  const fx = (x.zz ? '<i class="zz">z</i><i class="zz z2">z</i><i class="zz z3">Z</i>' : '') + (x.stars ? '<i class="cstars"></i>' : '') + (x.rain ? '<i class="crain"></i>' : '');
  const sfxHtml = x.sfx ? `<div class="cpan-sfx-stamp ${x.sfxStyle || ''}">${x.sfx}</div>` : '';
  const speakerHtml = '';
  const rawBg = x.backdrop || x.bg || '';
  const bgUrl = asset(rawBg) || rawBg || '';
  const bgStyle = /^linear-gradient/i.test(bgUrl) ? `background:${bgUrl}` : (bgUrl ? `background-image:url('${bgUrl}')` : '');
  const capText = x.cap || x.caption || '';
  let bubblesHtml = '';
  if (x.say) {
    bubblesHtml += `<div class="cbub ${x.side === 'l' ? 'r' : 'l'} ${x.shout ? 'cbub-shout' : ''}">${speakerHtml}${x.say}</div>`;
  }
  if (Array.isArray(x.bubbles) && x.bubbles.length) {
    bubblesHtml += x.bubbles.map(b => {
      const sideCls = b.right ? 'r' : 'l';
      const posStyle = [
        b.bottom ? `bottom:${b.bottom};top:auto` : 'bottom:5%;top:auto',
        b.left ? `left:${b.left}` : '',
        b.right ? `right:${b.right};left:auto` : ''
      ].filter(Boolean).join(';');
      return `<div class="cbub ${sideCls}" ${posStyle ? `style="${posStyle}"` : ''}>${speakerHtml}${b.text || ''}</div>`;
    }).join('');
  }
  return `<div class="cpan cp${i} cpan-parallax ${x.night ? 'night' : ''} ${x.sick ? 'sick' : ''} ${x.heat ? 'heat' : ''} ${x.clash ? 'cpan-clash' : ''}">${fx}${sfxHtml}<div class="cmbg" style="${bgStyle}"></div>${ch}${capText ? `<div class="ccap">${capText}</div>` : ''}${bubblesHtml}</div>`;
}

function wireComicParallaxContainer(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.cpan').forEach(el => {
    comicFit(el);
    el.addEventListener('pointermove', ev => {
      const r = el.getBoundingClientRect();
      const nx = ((ev.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      const ny = ((ev.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
      el.style.setProperty('--prx-x', (nx * 18).toFixed(2) + 'px');
      el.style.setProperty('--prx-y', (ny * 12).toFixed(2) + 'px');
      el.style.setProperty('--prx-rot-x', (-ny * 4.5).toFixed(2) + 'deg');
      el.style.setProperty('--prx-rot-y', (nx * 5.5).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--prx-x', '0px');
      el.style.setProperty('--prx-y', '0px');
      el.style.setProperty('--prx-rot-x', '0deg');
      el.style.setProperty('--prx-rot-y', '0deg');
    });
  });
}

function renderNativeComicStrip(panels, lay = 'a', extraClass = '') {
  return `<div class="cpage lay-${lay} ${extraClass}">${(panels || []).map((x, i) => buildNativeComicPanelHTML(x, i)).join('')}</div>`;
}
window.buildNativeComicPanelHTML = buildNativeComicPanelHTML;
window.renderNativeComicStrip = renderNativeComicStrip;
window.wireComicParallaxContainer = wireComicParallaxContainer;

let CUR_COMIC = null;
function comicModal(ev, pg = 0) {
  const c = ev.ctx = ev.ctx || {};
  const pages = pg > 0 && CUR_COMIC && CUR_COMIC.ev === ev ? CUR_COMIC.pages : COMIC[ev.id](c, ev); CUR_EV = ev; CUR_COMIC = { ev, pages, pg };
  const P = pages[pg], last = pg === pages.length - 1;
  const firstPanel = (P.p && P.p[0]) || {};
  const lastPanel = (P.p && P.p[P.p.length - 1]) || firstPanel;
  const pageBgKey = firstPanel.backdrop || firstPanel.bg || lastPanel.backdrop || lastPanel.bg || 'bg-ocak';
  const pageBgUrl = asset(pageBgKey) || pageBgKey || '';
  const isGradBg = /^linear-gradient/i.test(pageBgUrl);
  if (pageBgUrl && !isGradBg) {
    ev._lastBgHtml = `<img class="scene-img" src="${pageBgUrl}" alt="">`;
  }
  const panel = (x, i) => buildNativeComicPanelHTML(x, i);
  const opts = last ? (ev.opts || []).map((o, i) => { const why = o.req ? o.req(c) : null; const t = typeof o.t === 'function' ? o.t(c) : o.t; return `<button class="vopt" data-a="evopt" data-i="${i}" ${why ? 'disabled' : ''}>${t}${why ? `<small>${why}</small>` : ''}</button>`; }).join('') : '';
  const scrimStyle = isGradBg ? `background:${pageBgUrl}` : `background-image:url('${pageBgUrl}')`;
  const curWk = (typeof S !== 'undefined' && S && S.week) || 0;
  showModal(`${pageBgUrl ? `<div class="comic-scrim-bg" style="${scrimStyle}"></div>` : ''}<div class="comic"><div class="cmhead"><span class="kicker">${ev.rstory ? 'Gök Yolu' : ev.astory ? 'Arena' : (STORY[curWk] && STORY[curWk].id === ev.id) || (typeof STORY2 !== 'undefined' && STORY2[curWk] && STORY2[curWk].id === ev.id) ? 'Hikâye' : 'Olay'} · ${esc(ev.title || 'Destan')}</span><span class="cpgn">${pg + 1}/${pages.length}</span></div>
    <div class="cpage lay-${P.lay}">${P.p.map(panel).join('')}</div>
    ${last ? `<div class="cask">${P.ask ? `<p>${P.ask}</p>` : ''}<div class="vnopts">${opts}</div></div>` : `<div class="cnav"><button class="btn primary" data-a="comic-next">Devam</button></div>`}</div>`, 'comicm');
  wireComicParallaxContainer(document.querySelector('.comicm'));
  SFX.play('page');
}
// Kesik kenarlı pozlar dar karelerde taşmasın: genişliğe sığdır, kesik kenar yine çerçevenin dışında kalsın
function comicFit(P) {
  cutFit(P);
  const pw = P.offsetWidth, ph = P.offsetHeight; if (!pw || !ph) return;
  P.querySelectorAll('.rcd.edge').forEach(e => {
    const ar = +e.dataset.ar, c = e.dataset.c || '', h = parseFloat(e.style.height) / 100 * ph;
    if (h / ar <= pw * .9) return;
    const W = pw * .9, H = W * ar;
    Object.assign(e.style, { width: (W / pw * 100) + '%', height: 'auto' });
    if (c.includes('t') && !c.includes('b')) Object.assign(e.style, { top: '-5%', bottom: 'auto' });
    else if (c.includes('b')) Object.assign(e.style, { bottom: '-5%', top: 'auto' });
    else Object.assign(e.style, { top: Math.max(0, (ph - H) / 2 / ph * 100) + '%', bottom: 'auto' });
    e.querySelector('.pose').style.cssText += ';width:100%;height:auto';
  });
}
const COMIC_ACT = {
  'comic-next'() { if (!CUR_COMIC) return; comicModal(CUR_COMIC.ev, CUR_COMIC.pg + 1); },
};

/* --- Demirhan bölüm 2: haftanın hikâyesi olarak 7. haftaya eklenir --- */
STORY[7] = STORY[7] || { id: 'dem2', title: 'Çitteki Kara Pelerin',
  text: () => 'Gece yarısı ahırın çitinde kara pelerinli biri. Elindeki torbadan yemlerin üstüne bir ot serpmeye hazırlanıyor. Pelerinin kenarında Kara Kanat\'ın arması var.',
  opts: [
    { t: 'Gece boyu ahırda nöbet tut', fx: () => { const st = comicStar(); if (st) { st.fat = clamp(st.fat + 10, 0, 100); addBond(st, 4); } S.flags.demNobet = 1; chron('Kara Kanat\'ın casusu nöbet tutan ocak sahibini görünce kaçtı.'); return `Sabaha kadar ${st ? ek(st.name, 'gen') + ' yanında' : 'ahırda'} oturdun. Casus seni görünce karanlığa karıştı. ${st ? `${st.name} biraz yorgun ama sana her zamankinden yakın (bağ +4).` : ''}`; } },
    { t: 'Avcıyı pusuya yatır', req: () => S.dragons.some(d => typeof roleOf === 'function' && roleOf(d) === 'avci') ? null : 'Avcı rolünde bir destekçi gerekir', fx: () => {
      const a = S.dragons.find(d => roleOf(d) === 'avci'); S.un += 3; addBond(a, 3); if (typeof rivals === 'function') { const r = rivals()[0]; r.un = Math.max(0, r.un - 2); }
      chron(`${a.name}, Kara Kanat'ın casusunu çitte yakaladı.`); return `${a.name} çalılıkta bekledi ve casusu pelerininden yakaladı. Sabah muhtar torbadaki otu meydanda herkese gösterdi: Demirhan'ın adı lekelendi, senin ünün arttı (+3 ün).`; } },
    { t: 'Ejderhalarım kendini korur', fx: () => {
      const st = comicStar();
      if (chance(50) && st) { nudge(st, 'ces', 6); return `${st.name} karanlıkta kıpırtıyı duydu ve öyle bir kükredi ki casus torbasını düşürüp kaçtı. ${st.name} sabah gururla çitin başında bekliyordu.`; }
      S.food.balik = Math.max(0, (S.food.balik || 0) - 2); for (const d of S.dragons) if (chance(25)) addMood(d, -1, true);
      return 'Sabah kilerin kapısı aralık, iki balık eksik ve bazı yemlerde tuhaf bir koku vardı. Birkaç ejderhanın morali bozuk.'; } },
  ] };


/* ---------- ŞAHMERAN, KALGAROT VE ABRA ZİNDAN DESTANLARI — ÇİZGİ ROMAN SAYFALARI ---------- */
Object.assign(COMIC, {
  sahmeran_prolog: () => {
    const st = comicStar();
    return [
      { lay: 'a', p: [
        { bg: 'bg-pazar', npc: 'selin', side: 'r', speaker: 'Haritacı Selin', cap: 'Tarsus yolundan dönen Selin, zümrüt mühürlü bir taş levha getirdi.', say: 'Yedi kat yerin altındaki Sırça Saray uyandı! Kuyulardan yeşil dumanlar tütüyor.' },
        { bg: 'bg-yuva', night: 1, npc: 'dede', side: 'l', speaker: 'Dedenin Hatıratı', cap: 'Dedenin defterinde Camasb’ın İhaneti ve Şahmeran’ın öyküsü yazılıydı.', say: 'Kül Yutan’ın zehirli külleri yeraltı sularına karıştı; Şahmeran bunu yeni bir ihanet sanıyor.' },
        D(st, 'P16', { bg: 'bg-sahmeran-gate', night: 1, face: 'r', av: ['low', '34'], box: '8,6,84,88,c', cap: st ? `${st.name} Sırça Kapısı'nın önünde kanatlarını gerdi.` : 'Sırça Kapısı’nın kadim rünleri karanlıkta parıldıyor.' }),
      ] },
      { lay: 'c', p: [
        { bg: 'bg-ex-sah-vault', night: 1, npc: 'sirca-golem', side: 'r', speaker: 'Sırça Golemi', clash: 1, cap: 'Dar kemerli dehlizlerde kristalden yontulmuş dev muhafızlar nöbet tutuyor.', say: 'Camasb’ın kanını taşıyan hiçbir fani bu köprüden geçemez!' },
        { bg: 'bg-sahmeran-bridge', night: 1, npc: 'sahmeran', side: 'l', speaker: 'Şahmeran', clash: 1, cap: 'Kehribar sütunların arasından Yılan Kraliçe’nin sesi yankılandı:', say: 'Bin yıl önce sırrımı verdim, karşılığı ihanet oldu. Ocağın varisi, ne için geldin?' },
      ] },
      { lay: 'a', p: [
        D(st, 'P7', { bg: 'bg-sahmeran-bridge', night: 1, face: 'r', av: ['34', 'front'], box: '10,6,82,88,c', cap: st ? `${st.name} kristal köprünün başında kükredi.` : 'Tavandaki kehribar sarkıtlar sarsılıyor.' }),
        { bg: 'bg-ex-sah-divine', night: 1, npc: 'sahmeran-tanrica', side: 'r', speaker: 'Şahmeran', clash: 1, cap: 'Sırça Saray’ın en derin divanında Şahmeran gerçek kudretini açığa çıkarıyor.', say: 'Ateşinde dedenin onuru var mı, yoksa Camasb gibi açgözlü müsün? Göreceğiz!' },
        { bg: 'bg-sahmeran-sanctum', night: 1, npc: 'selin', side: 'l', speaker: 'Selin', cap: 'Selin kemerin gerisinden sesleniyor:', say: 'Tavandaki sarkıtları ve sırlı iksir küplerini kullanmayı unutma!' },
      ], ask: 'Sırça Saray’ın kapıları açılıyor.' },
    ];
  },
  sahmeran_zafer: () => {
    const st = comicStar();
    return [
      { lay: 'a', p: [
        { bg: 'bg-sahmeran-sanctum', night: 1, npc: 'sahmeran', side: 'r', speaker: 'Şahmeran', cap: 'Şahmeran asasını mermer zemine vurdu; öfke dumanları dağıldı.', say: 'Dur, Ejder Çocuğu… Ateşinde Camasb’ın açgözlülüğü değil, dedenin onuru yanıyor.' },
        D(st, 'P6', { bg: 'bg-sahmeran-throne', night: 1, face: 'r', av: ['front'], cap: st ? `${st.name} başını eğdi. Yeraltı sularındaki kara kül mührü kırıldı.` : 'Yeraltı sularındaki kara kül mührü kırıldı.' }),
        { bg: 'bg-sahmeran-bridge', night: 1, npc: 'sahmeran', side: 'l', speaker: 'Şahmeran', cap: 'Yılan Kraliçe bin yıllık sırça sandığın mührünü açtı.', say: 'Kül Yutan kapına dayandığında, Tarsus’un yılanları senin sancağın altında savaşacak.' },
      ], ask: 'Sırça Saray ile kadim ittifak kuruldu.' },
    ];
  },
  komutan_prolog: () => {
    const st = comicStar();
    return [
      { lay: 'a', p: [
        { bg: 'bg-pazar', npc: 'kerim', side: 'r', speaker: 'Demirci Kerim', cap: 'Demirci Kerim, örsüne düşen korlaşmış siyah ejderha pulunu maşayla kaldırdı.', say: 'Bu sıradan bir pul değil evlat… Başkomutan Kalgarot, Yanık Kaldera’ya indi!' },
        { bg: 'bg-komutan-gate', night: 1, npc: 'dede', side: 'l', speaker: 'Dedenin Kalkanı', cap: 'Dedenin kalkanındaki derin pençe izlerinin sahibi o dev ejderhaydı.', say: 'Otuz yıl önce yedi ocağın beyi birleşip onu ancak zincirleyebilmişti.' },
        D(st, 'P7', { bg: 'bg-komutan-bridge', night: 1, face: 'r', av: ['low', '34'], box: '8,6,84,88,c', cap: st ? `${st.name} lav şelalelerinin karşısında dişlerini gösterdi.` : 'Bazalt köprüler kor gibi parlıyor.' }),
      ] },
      { lay: 'c', p: [
        { bg: 'bg-ex-kom-forge', night: 1, heat: 1, npc: 'magma-behemoth', side: 'r', speaker: 'Magma Devi', clash: 1, cap: 'Yıkık demirhane mahzeninde zırhlı magma devleri yolu tutmuş.', say: 'Örsün ateşi sizi küle çevirecek!' },
        { bg: 'bg-komutan-sanctum', night: 1, heat: 1, npc: 'komutan', side: 'l', speaker: 'Kalgarot', clash: 1, cap: 'Kaldera’nın kalbinden yükselen kükreme bazalt sütunları çatlattı:', say: 'Otuz yıl boyunca bu zincirleri erittim! Önümde diz çökmeyen her ocak yanacak!' },
      ] },
      { lay: 'a', p: [
        D(st, 'P16', { bg: 'bg-komutan-crater', night: 1, heat: 1, face: 'r', av: ['34', 'front'], box: '10,6,82,88,c', cap: st ? `${st.name} dumanlı gökyüzüne doğru alev püskürttü.` : 'Kaldera’nın tepesinde mavi-kor şimşekler çakıyor.' }),
        { bg: 'bg-ex-kom-bluecore', night: 1, heat: 1, npc: 'komutan-mavikor', side: 'r', speaker: 'Kalgarot', clash: 1, cap: 'Kalgarot’un göğsündeki açık kor çekirdeği yıldız ateşiyle harlanıyor.', say: 'Gel bakalım ihtiyar terbiyecinin torunu, ocağının ateşi beni durdurabilecek mi!' },
        { bg: 'bg-komutan-bridge', night: 1, npc: 'kerim', side: 'l', speaker: 'Usta Kerim', cap: 'Usta Kerim’in uyarısı kulağında:', say: 'Göğsündeki açık kor yarası ve boynuzu en zayıf noktasıdır!' },
      ], ask: 'Volkanik Kaldera’ya adım atıyorsun.' },
    ];
  },
  komutan_zafer: () => {
    const st = comicStar();
    return [
      { lay: 'a', p: [
        { bg: 'bg-komutan-sanctum', night: 1, npc: 'komutan', side: 'r', speaker: 'Kalgarot', cap: 'Göğsündeki kor mührü kırılan Kalgarot, sarsılarak obsidiyen kayalıklara çöktü.', say: 'Bu ateş… ihtiyar terbiyecinin ateşiyle aynı. Kül Yutan’ın esaret zincirleri sonunda koptu!' },
        D(st, 'P6', { bg: 'bg-komutan-crater', night: 1, face: 'r', av: ['front'], cap: st ? `${st.name} zaferle kanatlarını açtı; kara dumanlar dağıldı.` : 'Kaldera’daki kara dumanlar dağıldı.' }),
        { bg: 'bg-komutan-sanctum', night: 1, npc: 'kerim', side: 'l', speaker: 'Usta Kerim', cap: 'Kırılan zincirlerin arasından Kalgarot’un kadim zırh sandığı çıkarıldı.', say: 'Bu obsidiyen tolga ve kor zırh artık senin hakkındır evlat!' },
      ], ask: 'Başkomutan Kalgarot mağlup edildi.' },
    ];
  },
  kul_yutan_prolog: () => {
    const st = comicStar();
    return [
      { lay: 'c', p: [
        { bg: 'bg-komutan-crater', night: 1, heat: 1, npc: 'komutan-mavikor', side: 'r', speaker: 'Kül Yutan', clash: 1, cap: 'Gök Kulesi’nin ötesinde, yedi dağın külünden yoğrulmuş devasa gölge kanatlarını açtı.', say: 'Fani ocakların kıvılcımı bin yıllık kül fırtınamı söndüremez! Toprağınız da göğünüz de benimdir!' },
        D(st, 'P16', { bg: 'bg-gok', night: 1, stars: 1, face: 'r', av: ['34', 'front'], box: '8,6,84,88,c', cap: st ? `${st.name} bütün ocağın sancağı önünde göğe yükseldi!` : 'Ocağın tüm ejderhaları son taarruz için kenetlendi!' }),
      ], ask: 'Kül Yutan ile nihai yüzleşme başlıyor!' }
    ];
  },

  abra_prolog: () => {
    const st = comicStar();
    return [
      {
        lay: 'a',
        p: [
          {
            bg: 'img/abra/abra_sanctum_bg.webp',
            night: 1,
            npc: 'muhtar',
            side: 'r',
            speaker: 'Muhtar',
            cap: 'Fırtına çıktığından beri Derya Yılanı Abra, boğazdan geçen her kalyonu parçalıyor!',
            say: 'Biri Batık Tersane mahzenindeki Rünlü Mühür Çapasını yerinden sökmüş! Abra zincirini kırdı!'
          },
          {
            bg: 'img/abra/abra_dock_vault_bg.webp',
            night: 1,
            npc: 'demirhan',
            side: 'l',
            speaker: 'Demirhan',
            cap: 'Mühürlü çapayı gizlice söktüren Demirhan, suçunu örtmek için meydanda önüne dikildi.',
            say: 'Arenada şansın yaver gitti ama açık denizde hakem yok! Bakalım Abra’nın dişini önce kim sökecek?'
          },
          D(st, 'P16', {
            bg: 'img/abra/abra_arena_bg_v2.webp',
            night: 1,
            rain: 1,
            face: 'r',
            av: ['34', 'front'],
            box: '8,6,84,88,c',
            cap: 'Demirhan kalyonuyla önden denize açıldı bile! Fırtına Boğazı’nda kırık güverteler seni bekliyor.',
            say: 'Demir çapanı sağlam tut! Abra dalgalarla güverteyi süpürürken fosforlu yüzgecini hedef alacağız!'
          })
        ],
        ask: 'Fırtına Boğazı’na yelken açılıyor.'
      }
    ];
  },

  abra_zafer: () => {
    const st = comicStar();
    return [
      {
        lay: 'c',
        p: [
          D(st, 'P6', {
            bg: 'img/abra/abra_arena_bg_v2.webp',
            night: 1,
            face: 'r',
            av: ['front'],
            cap: 'Kırık kalyon enkazının ortasında Derya Yılanı Abra son kez kükreyip derin sulara gömüldü!',
            say: 'Fırtına dindi! Batık Donanmanın kraliyet sandıkları ve Leviathan pulları artık ocağımızındır!'
          }),
          {
            bg: 'img/abra/abra_sanctum_bg.webp',
            night: 1,
            npc: 'demirhan',
            side: 'r',
            speaker: 'Demirhan',
            cap: 'Gemisi üçe bölünüp kayalıklara savrulan sırılsıklam Demirhan, kıyıdan dişlerini sıkarak zaferini izledi.',
            say: 'Kalyonumu parçalayan canavarı gözümün önünde indirdin... Bu bahsi sen kazandın!'
          }
        ],
        ask: 'Derya Yılanı Abra derin sulara geri mühürlendi!'
      }
    ];
  }
});
