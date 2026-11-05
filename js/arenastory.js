'use strict';
/* ============ EJDER OCAĞI — ARENA HİKÂYELERİ ============
   Arenanın iki hikâyesi var; bölümler dövüş bitince çizgi roman olarak açılır. Anlatıcı gezgin Ozan.
   DEMİR KEMER (Şehir Arenası):
     1) Arenanın Tozu — ilk şehir zaferinden sonra Ozan, kemerin sahibi Taşyürek'i anlatır.
     2) Kör Halil'in Gözü — 3. şehir zaferinde şampiyonun sahibi seni izlemeye gelir; bir çalışma seçersin.
     3) Kemer Daveti — 5. şehir zaferinde Taşyürek meydan okur; kabul edersen kemer maçı arena panosuna asılır.
     4) Kemerin Sahibi / Tozun İçinde — kazanırsan Demir Kemer senin (o ejderhanın her arena zaferi +1 ün); kaybedersen iki hafta sonra rövanş.
   KANLI GECE (Yeraltı Çukuru):
     1) Kanlı Gece Daveti — iki çukur zaferinden sonra Çukur Ağası tek gecelik büyük bir dövüş önerir.
     2) Çukurun Efsanesi — kazanırsan Çukur Ağası bir sır verir: casusları kimin gönderdiği. Kaybedip sağ kalırsan "Kan ve Kum". */

const as = () => (S.as = S.as || { sw: 0, cw: 0 });
const CHAMP0 = {
  belt: { name: 'Taşyürek', trainer: 'Kör Halil', el: 'toprak', arch: 'Demir Kemer şampiyonu', tier: 'sehir', odul: 400, un: 6, k: 1.14 },
  kanli: { name: 'Kemikkıran', trainer: 'Çukur Ağası Rüstem', el: 'ates', arch: 'Kanlı Gecenin canavarı', tier: 'cukur', odul: 650, un: 8, k: 1.12 },
};
// Şampiyonların görünüşü kayıtta saklanır: her karede ve dövüşte aynı ejderha
function champ(k) { const A = as(); A.ch = A.ch || {}; if (!A.ch[k]) A.ch[k] = { gx: randLook(), hue: ri(-6, 6) }; const C = CHAMP0[k]; return poseDragon({ name: C.name, el: C.el, gx: A.ch[k].gx, hue: A.ch[k].hue }, 'ch' + k); }
function champOpp(k) {
  const C = CHAMP0[k], T = TIERS[C.tier], L = (T.base + S.week * T.grow + (typeof seasonBonus === 'function' ? seasonBonus() : 0)) * C.k;
  const o = genOpp(C.tier, L, T.gear + 4), A = as();
  return Object.assign(o, { name: C.name, trainer: C.trainer, el: C.el, arch: C.arch, gx: A.ch[k].gx, hue: A.ch[k].hue, odul: C.odul, special: k === 'belt' ? 'KEMER MAÇI' : 'KANLI GECE', story: k, cards: [EL_CARD[C.el]] });
}
// Haftalık arena yenilenince bekleyen özel maç panoya asılır
const _refreshArena0 = refreshArena;
refreshArena = function () { _refreshArena0(); arenaInject(); };
function arenaInject() {
  const A = S && S.as; if (!A || !S.arena) return;
  for (const k of ['belt', 'kanli']) if (A[k] === 'pending') { champ(k); const t = CHAMP0[k].tier; if (S.arena[t] && !S.arena[t].some(o => o.story === k)) S.arena[t].push(champOpp(k)); }
}

const ASTORY = {
  as_toz: { title: 'Arenanın Tozu', text: () => 'Gezgin Ozan tribünden iniyor: "Şehir Arenası’nın bir Demir Kemeri var. Sahibi Taşyürek, üç yıldır yenilmedi."',
    opts: [
      { t: 'Kemer için söz ver', fx: () => { as().bet = 1; return 'Ozan söylediğini türküye kattı. Bundan sonra her şehir zaferinde fazladan +1 ün.'; } },
      { t: 'Ozan’a bir türkü ısmarla (20 altın)', req: () => S.gold >= 20 ? null : 'Yeterli altın yok', fx: () => { S.gold -= 20; S.un += 2; return 'Türkü bütün hanlarda söylendi: +2 ün.'; } },
    ] },
  as_goz: { title: 'Kör Halil’in Gözü', text: c => `Tribünün en üstünde yaşlı, kör bir adam: Taşyürek’in sahibi Kör Halil. "${c.d.name} gibi dövüşen bir ejderhanın adımını kulağımla duyarım."`,
    opts: [
      { t: c => `${c.d.name} güç çalışsın`, fx: c => { c.d.st.gu = Math.min(capOf(c.d, 'gu'), c.d.st.gu + 2); return `${c.d.name}: Güç +2. Taşyürek’in kayadan derisine hazırlanıyor.`; } },
      { t: c => `${c.d.name} dayanıklılık çalışsın`, fx: c => { c.d.st.da = Math.min(capOf(c.d, 'da'), c.d.st.da + 2); return `${c.d.name}: Dayanıklılık +2. Uzun bir dövüşe hazırlanıyor.`; } },
    ] },
  as_davet: { title: 'Kemer Daveti', text: () => 'Taşyürek arenanın ortasına çıkıyor. Kör Halil: "Beş zafer. Kemeri istiyorsan gel, al."',
    opts: [
      { t: 'Meydan okumayı kabul et', fx: () => { as().belt = 'pending'; champ('belt'); if (S.arena && S.arena.sehir && !S.arena.sehir.some(o => o.story === 'belt')) S.arena.sehir.push(champOpp('belt')); return 'Kemer maçı Şehir Arenası’nın panosunda. Kazanana 400 altın, büyük bir ün ve Demir Kemer.'; } },
      { t: 'Henüz hazır değiliz', fx: () => { const A = as(); A.retry = S.week + 2; A.s3 = 0; return 'Kör Halil gülümsedi: "Acele eden kemer taşıyamaz."'; } },
    ] },
  as_kemer: { title: 'Kemerin Sahibi', text: c => `Taşyürek tozun içinde. Kör Halil Demir Kemeri çözüp ${ek(c.d.name, 'gen')} boynuna takıyor.`,
    opts: [
      { t: 'Kemeri arenaya göster', fx: c => { S.flags.beltHolder = c.d.id; S.un += 3; chron(`${c.d.name} Şehir Arenası’nın Demir Kemerini kazandı.`); snapAlbum('tour', 'Demir Kemer', `${c.d.name} Taşyürek’i yenip Demir Kemeri aldı.`, c.d); return `Demir Kemer artık ${ek(c.d.name, 'gen')}: arenadaki her zaferi +1 ün getirecek. +3 ün.`; } },
      { t: 'Kör Halil’e saygını göster', fx: c => { S.flags.beltHolder = c.d.id; S.un += 1; addBond(c.d, 4); chron(`${c.d.name} Demir Kemeri kazandı; Kör Halil’le el sıkıştı.`); return `Kör Halil elini omzuna koydu: "Ona iyi bak." Kemer ${ek(c.d.name, 'gen')}; bağ +4.`; } },
    ] },
  as_tozun: { title: 'Tozun İçinde', text: c => `${c.d.name} tozun içinde. Taşyürek kemerini taşıyıp tribünleri selamlıyor.`,
    opts: [
      { t: 'Rövanş sözü ver', fx: c => { nudge(c.d, 'ces', 5); return 'Kör Halil iki hafta sonra seni yeniden çağıracak.'; } },
      { t: 'Yaralarını sar', fx: c => { addBond(c.d, 5); addMood(c.d, 1); return `${c.d.name}: bağ +5, moral +1.`; } },
    ] },
  as_kanli: { title: 'Kanlı Gece Daveti', text: () => 'Çukur Ağası meşaleyi yüzüne tutuyor: "Ayda bir gece çukurun dibine Kemikkıran iner. Kazanan zengin olur. Kaybedenin adını kimse anmaz."',
    opts: [
      { t: 'Kanlı Geceye gir', fx: () => { as().kanli = 'pending'; champ('kanli'); if (S.arena && S.arena.cukur && !S.arena.cukur.some(o => o.story === 'kanli')) S.arena.cukur.push(champOpp('kanli')); return 'Kemikkıran çukurun panosunda: 650 altın, büyük bir ün. Ölüm riski çukurun her dövüşündeki gibi.'; } },
      { t: 'Meşaleyi geri it', fx: () => { const A = as(); A.kretry = S.week + 3; A.k1 = 0; return '"Korku akıllıca," dedi Ağa. "Ama çukur unutmaz."'; } },
    ] },
  as_efsane: { title: 'Çukurun Efsanesi', text: c => `Kemikkıran düştü. Çukur Ağası ${ek(c.d.name, 'acc')} süzüyor ve sesini alçaltıyor: "Çitinin arkasındaki casusları kim gönderdi, biliyor musun?"`,
    opts: [
      { t: 'Söyle: kim?', fx: () => { const dem = typeof rivals === 'function' ? rivals()[0] : null; if (dem) dem.un = Math.max(0, dem.un - 3); S.un += 2; chron('Çukur Ağası, casusları Demirhan’ın gönderdiğini anlattı; köyde duyuldu.'); return '"Kara Kanat." Ertesi gün bütün köy konuşuyordu: Demirhan’ın ünü düştü, seninki arttı (+2 ün).'; } },
      { t: 'Sırrını sakla, ödülünü al', fx: () => { S.gold += 100; return 'Ağa güldü ve keseye 100 altın daha ekledi: "Ağzı sıkı olanı severim."'; } },
    ] },
  as_kum: { title: 'Kan ve Kum', text: c => `${c.d.name} çukurdan sağ çıktı. Kemikkıran’ın kükremesi hâlâ tünellerde yankılanıyor.`,
    opts: [
      { t: 'Bir daha asla', fx: c => { nudge(c.d, 'ces', -4); addBond(c.d, 4); return `${c.d.name} sana sokuldu. Bağ +4.`; } },
      { t: 'Bir gün geri döneceğiz', fx: c => { nudge(c.d, 'ces', 5); as().kretry = S.week + 3; as().k1 = 0; return 'Çukur Ağası birkaç hafta sonra yeniden çağıracak.'; } },
    ] },
};
// Dövüş bittikten sonra sıradaki arena bölümü
function arenaStoryNext(d, tier, opp, won) {
  if (!d || !S.dragons.includes(d)) return null;
  const A = as(), ctx = { d };
  if (won && S.flags.beltHolder === d.id && (tier === 'sehir' || tier === 'cukur' || tier === 'koy')) { S.un += 1; setTimeout(() => toast(`<b>Demir Kemer</b>${esc(d.name)} kemeriyle kazandı: +1 ün.`), 500); }
  if (opp && opp.story === 'belt') { A.belt = null; if (won) { A.done = 1; return ['as_kemer', ctx]; } A.retry = S.week + 2; A.s3 = 0; return ['as_tozun', ctx]; }
  if (opp && opp.story === 'kanli') { A.kanli = null; if (won) { A.kdone = 1; return ['as_efsane', ctx]; } return ['as_kum', ctx]; }
  if (tier === 'sehir' && won) {
    A.sw++; if (A.bet && !A.done) S.un += 1;
    if (!A.s1) { A.s1 = 1; return ['as_toz', ctx]; }
    if (!A.s2 && A.sw >= 3) { A.s2 = 1; return ['as_goz', ctx]; }
    if (!A.s3 && !A.done && !A.belt && A.sw >= 5 && S.week >= (A.retry || 0)) { A.s3 = 1; return ['as_davet', ctx]; }
  }
  if (tier === 'cukur' && won) { A.cw++; if (!A.k1 && !A.kdone && !A.kanli && A.cw >= 2 && S.week >= (A.kretry || 0)) { A.k1 = 1; return ['as_kanli', ctx]; } }
  return null;
}
function arenaStoryShow(r) { const [id, ctx] = r, E = ASTORY[id]; if (E) pushModal(() => eventModal({ id, astory: 1, ...E, ctx })); }

Object.assign(COMIC, {
  as_toz: c => { const ch = champ('belt'); return [
    { lay: 'a', p: [
      { bg: 'bg-arena', npc: 'ozan', side: 'r', cap: 'Zaferin ardından gezgin Ozan tribünden iniyor.', say: 'Bu arenanın bir Demir Kemeri var…' },
      { bg: 'bg-arena', dr: ch, pz: 'P7', face: 'l', rim: 1, box: '6,4,88,92,c', cap: `…sahibi ${ch.name}. Üç yıldır yenilmedi.` },
      D(c.d, 'P3', { bg: 'bg-arena', face: 'r', av: ['front'], cap: `${c.d.name} kemeri ilk kez duyuyor.` }),
    ] },
  ]; },
  as_goz: c => { const ch = champ('belt'); return [
    { lay: 'a', p: [
      { bg: 'bg-arena', npc: 'muhtar', sil: 1, side: 'r', cap: 'Tribünün en üstünde yaşlı, kör bir adam: Kör Halil.', say: 'Adımını kulağımla duyarım.' },
      D(c.d, 'P8', { bg: 'bg-arena', face: 'r', av: ['34'], cap: `${c.d.name} dövüşüyor; her darbesi tribünde yankılanıyor.` }),
      { bg: 'bg-arena', dr: ch, pz: 'P3', face: 'l', rim: 1, cap: `${ch.name} gölgede bekliyor.` },
    ] },
  ]; },
  as_davet: c => { const ch = champ('belt'); return [
    { lay: 'c', p: [
      { bg: 'bg-arena', dr: ch, pz: 'P12', face: 'l', rim: 1, box: '4,6,92,90,c', cap: `${ch.name} arenanın ortasına çıkıyor.`, html2: `<i class="fbreath cbreath" style="--c:${PAL[ch.el].glow};left:0;transform:scaleX(-1)"></i>` },
      D(c.d, 'P7', { bg: 'bg-arena', face: 'r', av: ['low', '34'], box: '6,4,88,92,c', cap: 'Kör Halil: “Beş zafer. Kemeri istiyorsan gel, al.”' }),
    ] },
  ]; },
  as_kemer: c => { const ch = champ('belt'); return [
    { lay: 'a', p: [
      { bg: 'bg-arena', dr: ch, pz: 'P5', face: 'l', box: '4,24,92,72,c', cap: `${ch.name} tozun içinde.` },
      D(c.d, 'P7', { bg: 'bg-arena', face: 'r', av: ['low', '34'], box: '6,4,88,92,c', html2: '<i class="cconfetti"></i>', cap: `${c.d.name} zaferini haykırıyor!` }),
      { bg: 'bg-arena', cap: `Kör Halil kemeri çözüp uzatıyor. Demir Kemer artık ${ek(c.d.name, 'gen')}!`, html: `<i class="cconfetti"></i><div class="cbeltimg"><i></i><img src="${asset('item-kemer')}" alt="Demir Kemer"></div>` },
    ] },
  ]; },
  as_tozun: c => { const ch = champ('belt'); return [
    { lay: 'c', p: [
      D(c.d, 'P5', { bg: 'bg-arena', face: 'r', av: ['front'], box: '4,24,92,72,c', cap: `${c.d.name} tozun içinde.` }),
      { bg: 'bg-arena', dr: ch, pz: 'P7', face: 'l', rim: 1, box: '6,4,88,92,c', cap: `${ch.name} kemerini taşıyıp tribünleri selamlıyor.` },
    ] },
  ]; },
  as_kanli: c => { const ch = champ('kanli'); return [
    { lay: 'a', p: [
      { bg: 'bg-pit', night: 1, npc: 'cukur', side: 'r', cap: 'Çukur Ağası meşaleyi yüzüne tutuyor.', say: 'Ayda bir gece çukurun dibine Kemikkıran iner.' },
      { bg: 'bg-pit', night: 1, dr: ch, pz: 'P12', face: 'l', rim: 1, box: '4,6,92,90,c', cap: 'Zincirlerini koparan bir ateş.' },
      { bg: 'bg-pit', night: 1, npc: 'cukur', side: 'l', say: 'Kazanan zengin olur. Kaybedenin adını kimse anmaz.' },
    ] },
  ]; },
  as_efsane: c => { const ch = champ('kanli'); return [
    { lay: 'a', p: [
      D(c.d, 'P7', { bg: 'bg-pit', night: 1, face: 'r', av: ['low', '34'], box: '6,4,88,92,c', cap: `${ch.name} düştü. Çukur ${ek(c.d.name, 'gen')} adını haykırıyor.` }),
      { bg: 'bg-pit', night: 1, npc: 'cukur', side: 'r', cap: 'Ağa sesini alçaltıyor.', say: 'Çitinin arkasındaki casusları kim gönderdi, biliyor musun?' },
      { bg: 'bg-pazar', night: 1, npc: 'demirhan', sil: 1, side: 'l', cap: 'Aklına bir gölge geliyor…' },
    ] },
  ]; },
  as_kum: c => { const ch = champ('kanli'); return [
    { lay: 'c', p: [
      D(c.d, 'P5', { bg: 'bg-pit', night: 1, face: 'r', av: ['front'], box: '4,24,92,72,c', sick: 1, cap: `${c.d.name} çukurdan sağ çıktı.` }),
      { bg: 'bg-pit', night: 1, dr: ch, pz: 'P7', face: 'l', rim: 1, box: '6,4,88,92,c', cap: 'Kemikkıran’ın kükremesi hâlâ tünellerde yankılanıyor.' },
    ] },
  ]; },
});
