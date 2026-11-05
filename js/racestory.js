'use strict';
/* ============ EJDER OCAĞI — GÖK YOLU HİKÂYESİ ve YENİ SEZON BÖLÜMLERİ ============
   Gök yarışlarının kendi hikâyesi ezeli rakip etrafında döner; bölümler yarış bitince çizgi roman olarak açılır:
     1) Kanat Kanada Bir Söz — ezeli rakip ortaya çıkar, meydan okur.
     2) Rüzgârın Sırrı — Selin bir uçuş sırrı öğretir: rüzgâr kuyruğu ya da atılım (kalıcı yarış avantajı).
     3) Gök Kemeri Daveti — skor kızışınca hakem iki ocağı tek yarışlık bir düelloya çağırır.
     4) Gök Kemeri Düellosu — yarış listesine özel bir yarış olarak gelir: yalnız sen ve ezeli rakip.
     5) Gökyüzünün Efendisi / Bir Dahaki Sefere — kazanırsan rakip dostun olur; kaybedersen birkaç hafta sonra rövanş daveti gelir.
   Yeni sezonlarda (2. sezondan itibaren) ilk sezonun tanışma hikâyeleri yerine yeni yıldıza özel bölümler gelir. */

const rs = () => (S.rs = S.rs || {});
const nemD = () => S.nemesis ? poseDragon(S.nemesis, 'nm') : null;
const nemEvs = () => S.nemesis ? S.nemesis.w + S.nemesis.l : 0;
const raceTrick = () => (S.flags && S.flags.raceTrick) || null;
// Uçuş sırları: rüzgâr kuyruğu daha çok hırs verir; atılım daha az hırs harcar
const dashCost = () => DASH_COST - (raceTrick() === 'atilim' ? 12 : 0);
const draftHirs = () => raceTrick() === 'kuyruk' ? 21 : 14;

const RSTORY = {
  rs_soz: { title: 'Kanat Kanada Bir Söz', text: () => `${S.nemesis.name} pistin kenarında kanatlarını silkeliyor. Sahibi ${S.nemesis.trainer} sana bağırıyor: "Gök Yolu ikimize dar!"`,
    opts: [
      { t: 'Meydan okumayı kabul et', fx: () => { rs().bet = 1; const st = comicStar(); if (st) nudge(st, 'ces', 4); return `Artık ${ek(S.nemesis.name, 'acc')} her geçişinde fazladan +2 ün kazanacaksın.`; } },
      { t: 'Gülüp geç', fx: () => { const st = comicStar(); if (st) nudge(st, 'dis', 4); return `${S.nemesis.trainer} sinirden kırmızı kesildi. Senin ejderhan sakinliğini korudu: disiplin arttı.`; } },
    ] },
  rs_sir: { title: 'Rüzgârın Sırrı', text: () => `Haritacı Selin yarışını izlemiş: "${S.nemesis.name} her seferinde aynı hatayı yapıyor. Sana gökyüzünün bir sırrını öğreteyim."`,
    opts: [
      { t: 'Rüzgâr kuyruğunun sırrı', fx: () => { S.flags.raceTrick = 'kuyruk'; return 'Öndekinin arkasına girdiğinde hırsın artık %50 daha hızlı dolacak.'; } },
      { t: 'Atılımın sırrı', fx: () => { S.flags.raceTrick = 'atilim'; return `Atılım artık daha az hırs harcıyor (${DASH_COST} yerine ${DASH_COST - 12}).`; } },
    ] },
  rs_davet: { title: 'Gök Kemeri Daveti', text: () => `Muhtar iki ocağı meydana çağırdı: "Skor ${S.nemesis.l}–${S.nemesis.w}. Bu iş Gök Kemeri’nde, tek yarışta bitsin."`,
    opts: [
      { t: 'Düelloyu kabul et', fx: () => { rs().duel = 'pending'; S.races = null; return 'Gök Kemeri Düellosu bu haftanın yarışları arasında. Yalnız sen ve ezeli rakibin: kazanan 450 altın ve büyük bir ün alır.'; } },
      { t: 'Şimdilik değil', fx: () => { rs().retry = S.week + 2; rs().s3 = 0; return 'Muhtar omuz silkti: "Hazır olduğunda kapım açık."'; } },
    ] },
  rs_efendi: { title: 'Gökyüzünün Efendisi', text: () => `Gök Kemeri’nin altından ilk sen geçtin. ${S.nemesis.trainer} yavaşça yaklaşıyor ve elini uzatıyor.`,
    opts: [
      { t: 'Elini sık', fx: () => { S.nemesis.friend = true; S.un += 2; chron(`${S.nemesis.name} ile rekabet dostluğa döndü.`); return `${S.nemesis.name} artık dostun. Yarışlarda yine karşına çıkacak ama bu sefer sana iyi uçuşlar dileyecek. +2 ün.`; } },
      { t: 'Kemeri göğe kaldır', fx: () => { const st = comicStar(); S.un += 4; if (st) { addBond(st, 5); nudge(st, 'ces', 5); } return `Kalabalık adını haykırdı: +4 ün.${st ? ` ${st.name} gururla kükredi (bağ +5).` : ''}`; } },
    ] },
  rs_rovans: { title: 'Bir Dahaki Sefere', text: () => `${S.nemesis.name} Gök Kemeri’nin altından önce geçti. ${S.nemesis.trainer} gülüyor: "Gökyüzü benim."`,
    opts: [
      { t: 'Rövanş sözü ver', fx: () => { const st = comicStar(); if (st) nudge(st, 'ces', 5); return 'Muhtar birkaç hafta sonra yeniden çağıracak.'; } },
      { t: 'Ejderhanı teselli et', fx: () => { const st = comicStar(); if (st) { addBond(st, 5); addMood(st, 1); } return 'Başını okşadın; yorgun ama sana yakın (bağ +5, moral +1).'; } },
    ] },
};
// Yarış bittikten sonra sıradaki Gök Yolu bölümü
function raceStoryNext(lastRace) {
  const R = rs(), N = S.nemesis; if (!N) return null;
  if (lastRace && lastRace.id === 'duel' && (R.duel === 'won' || R.duel === 'lost')) { const id = R.duel === 'won' ? 'rs_efendi' : 'rs_rovans'; if (R.duel === 'won') R.done = 1; else { R.retry = S.week + 2; R.s3 = 0; } R.duel = null; return id; }
  if (!R.s1) { R.s1 = 1; return 'rs_soz'; }
  if (!R.s2 && nemEvs() >= 2) { R.s2 = 1; return 'rs_sir'; }
  if (R.s2 && !R.s3 && !R.done && !R.duel && (N.w >= 3 || N.l >= 3 || nemEvs() >= 4) && S.week >= (R.retry || 0) && S.week < SEASON) { R.s3 = 1; return 'rs_davet'; }
  return null;
}
function raceStoryShow(id) { const E = RSTORY[id]; if (E) pushModal(() => eventModal({ id, rstory: 1, ...E, ctx: {} })); }

// Düello yarışı: o haftanın büyük yarışının yerine geçer
function duelRace() {
  const N = S.nemesis, L = raceLevel(1);
  return { id: 'duel', venue: 'kayalik', ad: 'Gök Kemeri Düellosu', fee: 0, odul: [450, 60], un: 8, len: 46, duel: true,
    rivals: [{ name: N.name, trainer: N.trainer, el: N.el, style: N.style, gx: N.gx, hue: N.hue, nem: true, ce: Math.round(L * 1.0), da: Math.round(L * 1.0) }] };
}

const S2 = () => typeof seasonNo === 'function' && seasonNo() > 1;
const legendD = () => { const last = (S.seasons || []).slice(-1)[0]; const L = S.dragons.filter(d => d.legend && !d.dead); return L.find(d => last && d.name === last.star) || L[0] || null; };
const STORY2 = {
  3: { id: 'yeni_kanat', cond: () => !!legendD(), title: 'Yeni Kanat',
    text: () => `${legendD().name} hocalığa çekildi; ocağın yeni yıldızı ${comicStar() ? comicStar().name : 'henüz yok'}. Meydanda Demirhan da yeni şampiyonunu tanıtıyor: ${karabela().name}.`,
    opts: [
      { t: () => `${legendD().name} hocalığını yapsın`, fx: () => { const st = comicStar(), L = legendD(); if (st) { addBond(st, 4); st.st.ze = Math.min(capOf(st, 'ze'), st.st.ze + 2); } addBond(L, 3); return `${L.name} yeni yıldızın başından ayrılmıyor. ${st ? `${st.name}: bağ +4, Zekâ +2.` : ''}`; } },
      { t: 'Demirhan’a meydan oku', fx: () => { const st = comicStar(); S.un += 3; if (st) nudge(st, 'ces', 6); return `"Yeni nesil de aynı inattan!" Meydan güldü: +3 ün.`; } },
    ] },
  6: { id: 'hoca_ders', cond: () => !!legendD() && !!comicStar(), title: 'Hocanın Dersi',
    text: () => `${legendD().name} bir sabah ${ek(comicStar().name, 'acc')} ahırın ortasına çağırdı. Bugün ders var.`,
    opts: [
      { t: 'Nefes dersi', fx: () => { const st = comicStar(); st.st.ze = Math.min(capOf(st, 'ze'), st.st.ze + 3); st.fat = clamp(st.fat + 8, 0, 100); return `${st.name} nefesini toplamayı öğrendi: Zekâ +3.`; } },
      { t: 'Pençe dersi', fx: () => { const st = comicStar(); st.st.gu = Math.min(capOf(st, 'gu'), st.st.gu + 3); st.fat = clamp(st.fat + 8, 0, 100); return `${st.name} pençesini daha sert indiriyor: Güç +3.`; } },
    ] },
  18: { id: 'efsane_gece', cond: () => !!legendD() && !!comicStar(), title: 'Efsanenin Gecesi',
    text: () => `Kızıl Taç’a iki hafta var. ${legendD().name}, eskiden kendi yattığı inin önünde ${ek(comicStar().name, 'acc')} bekliyor.`,
    opts: [
      { t: 'İkisini baş başa bırak', fx: () => { const st = comicStar(), L = legendD(); addAff(st.id, L.id, 12); addMood(st, 2); return `Sabah ikisini yan yana uyurken buldun. ${st.name}: moral +2. Aralarındaki yakınlık arttı.`; } },
      { t: 'Üçünüz birlikte uçun', fx: () => { const st = comicStar(); st.st.ce = Math.min(capOf(st, 'ce'), st.st.ce + 2); addBond(st, 4); return `Hoca önde, yıldız arkada, sen sırtında. ${st.name}: Çeviklik +2, bağ +4.`; } },
    ] },
};

Object.assign(COMIC, {
  rs_soz: () => { const N = nemD(), st = comicStar(), v = S.nemesis; return [
    { lay: 'a', p: [
      { bg: 'rbg-kayalik-parkur', dr: N, pz: 'P1', face: 'l', box: '4,10,92,80,c', cap: `Yarıştan sonra ${v.name} pistin üstünde bir tur daha atıyor.` },
      { bg: 'rbg-kayalik-bitis', dr: N, pz: 'P3', face: 'l', rim: 1, say: 'Gök Yolu ikimize dar!', side: 'r', cap: `Sahibi ${v.trainer} bağırıyor.` },
      D(st, 'P3', { bg: 'rbg-kayalik-bitis', face: 'r', av: ['front'], cap: st ? `${st.name} gözünü ondan ayırmıyor.` : '' }),
    ] },
  ]; },
  rs_sir: () => { const st = comicStar(); return [
    { lay: 'a', p: [
      { bg: 'rbg-orman-parkur', npc: 'selin', side: 'r', cap: 'Haritacı Selin yarışını tepeden izlemiş.', say: 'Gökyüzünde iki sır vardır.' },
      D(st, 'P1', { bg: 'rbg-orman-parkur', face: 'r', av: ['34'], box: '4,12,92,80,c', cap: 'Biri: öndekinin rüzgârına sığınmak.' }),
      D(st, 'P10', { bg: 'rbg-orman-bitis', face: 'l', av: ['low'], cap: 'Öteki: doğru anda atılmak. Hangisini öğrenmek istersin?' }),
    ] },
  ]; },
  rs_davet: () => { const N = nemD(), st = comicStar(); return [
    { lay: 'a', p: [
      { bg: 'bg-pazar', npc: 'muhtar', side: 'r', cap: 'Muhtar iki ocağı meydana çağırdı.', say: `Skor ${S.nemesis.l}–${S.nemesis.w}. Bu iş Gök Kemeri’nde bitsin!` },
      { bg: 'rbg-kayalik-bitis', dr: N, pz: 'P7', face: 'l', rim: 1, box: '8,4,84,92,c', cap: `${S.nemesis.name} kükrüyor.` },
      D(st, 'P7', { bg: 'rbg-kayalik-bitis', face: 'r', av: ['low', '34'], box: '8,4,84,92,c', cap: st ? `${st.name} cevap veriyor.` : '' }),
    ] },
  ]; },
  rs_efendi: () => { const N = nemD(), st = comicStar(); return [
    { lay: 'a', p: [
      D(st, 'P7', { bg: 'rbg-kayalik-bitis', face: 'r', av: ['low', '34'], box: '6,4,88,92,c', cap: 'Gök Kemeri’nin altından ilk sen geçtin!', html2: '<i class="cconfetti"></i>' }),
      { bg: 'rbg-kayalik-bitis', dr: N, pz: 'P6', face: 'l', cap: `${S.nemesis.name} başını eğiyor.` },
      { bg: 'bg-pazar', npc: 'muhtar', side: 'r', say: 'Gökyüzünün efendisi senin ocağından!', html2: '<i class="cconfetti"></i>' },
    ] },
  ]; },
  rs_rovans: () => { const N = nemD(), st = comicStar(); return [
    { lay: 'c', p: [
      { bg: 'rbg-kayalik-bitis', dr: N, pz: 'P7', face: 'l', rim: 1, box: '6,4,88,92,c', cap: `${S.nemesis.name} kemerin altından önce geçti.`, say: 'Gökyüzü benim!', side: 'r' },
      D(st, 'P5', { bg: 'rbg-kayalik-bitis', face: 'r', av: ['front'], box: '6,24,88,72,c', cap: st ? `${st.name} nefes nefese, yere çökmüş.` : '' }),
    ] },
  ]; },
  yeni_kanat: () => { const L = legendD(), st = comicStar(), kb = karabela(); return [
    { lay: 'a', p: [
      D(L, 'P6', { bg: 'bg-ahir', face: 'r', av: ['front'], cap: `${L.name} hocalığa çekildi. Burnunu yeni yıldıza uzatıyor.` }),
      D(st, 'P3', { bg: 'bg-ahir', face: 'l', av: ['front'], cap: st ? `${st.name}: ocağın yeni yıldızı.` : '' }),
      { bg: 'bg-pazar', dr: kb, pz: 'P7', face: 'l', rim: 1, box: '6,4,88,92,c', cap: `Meydanda Demirhan yeni şampiyonunu tanıtıyor: ${kb.name}.` },
    ] },
  ]; },
  hoca_ders: () => { const L = legendD(), st = comicStar(); return [
    { lay: 'a', p: [
      D(L, 'P12', { bg: 'bg-ocak', face: 'r', av: ['34'], cap: `${L.name} önce kendisi gösteriyor…`, html2: `<i class="fbreath cbreath" style="--c:${PAL[L.el].glow}"></i>` }),
      D(L, 'P8', { bg: 'bg-ocak', face: 'r', av: ['34'], cap: '…sonra pençesini taşa indiriyor.' }),
      D(st, 'P3', { bg: 'bg-ocak', face: 'l', av: ['front'], cap: st ? `${st.name} pür dikkat izliyor.` : '' }),
    ] },
  ]; },
  efsane_gece: () => { const L = legendD(), st = comicStar(); return [
    { lay: 'c', p: [
      D(L, 'P15', { bg: 'bg-ahir', night: 1, face: 'r', av: ['front'], zz: 1, cap: `${L.name} eskiden kendi yattığı inin önünde kıvrılmış.` }),
      D(st, 'P6', { bg: 'bg-ahir', night: 1, face: 'l', av: ['front'], cap: st ? `${st.name} sessizce yanına sokuluyor.` : '' }),
    ] },
  ]; },
});
