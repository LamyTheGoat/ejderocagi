'use strict';
/* ============ EJDER OCAĞI — YILDIZIN KARİYERİ ============
   Ocağın yıldızının, seçildiği anki evresine ve sezonun haftasına göre sıralı hedefleri olur:
   yavruyken bir değeri büyütmek, arenada zaferler, Bahar Kupası'nda yarı final, Şehir Arenası ya da gök yarışı,
   en sonda Kızıl Taç. Her hedefin son haftası vardır.
   Tutturursa: bağ sahnesi (çizgi roman karesi), lakap, ödül ve sıradaki hedef.
   Tutturamazsa: kariyeri biter, emekli olup ocağın hocası olur; yıldızlık başka bir ejderhaya geçer.
   Böylece her hafta "bu hafta ne yapsam?" sorusunun bir cevabı olur. */

const CAREER_TITLES = ['umut', 'gozde', 'aday', 'efsane'];
const STAT_GOAL = { ze: 'Zekâ', ce: 'Çeviklik', gu: 'Güç', da: 'Dayanıklılık' };
// sayılara yönelme eki: 5'e, 6'ya, 9'a, 10'a, 20'ye
const numDat = n => { const l = n % 10, t = n % 100; const e = l ? { 1: 'e', 2: 'ye', 3: 'e', 4: 'e', 5: 'e', 6: 'ya', 7: 'ye', 8: 'e', 9: 'a' }[l] : { 0: 'a', 10: 'a', 20: 'ye', 30: 'a', 40: 'a', 50: 'ye', 60: 'a', 70: 'e', 80: 'e', 90: 'a' }[t] || 'e'; return `${n}'${e}`; };

function careerBuild(d) {
  const w = S.week, goals = [];
  const adultBy = w + Math.max(0, 4 - d.age) * (typeof hasTrait === 'function' && hasTrait(d, 'hizli') ? .5 : 1);
  let last = w;
  const push = g => { if (g.by <= w) return; if (g.by < last + 2) { const nb = Math.min(SEASON, last + 2); g.t = g.t.replace(/Hafta \d+'[aeiy]+/, `Hafta ${numDat(nb)}`); g.by = nb; } last = g.by; goals.push(g); };
  // 1) yavruyken: bir değeri büyüt (en yüksek kapasiteli değer; yavrularda öncelik zekâ)
  if (d.stage === 'yavru') {
    const k = 'ze', cur = d.st[k], cap = capOf(d, k), v = Math.min(cap, Math.ceil((cur + 8) / 5) * 5);
    if (v > cur) push({ k: 'stat', s: k, v, by: Math.min(w + 3, 9), t: `Hafta ${numDat(Math.min(w + 3, 9))} kadar ${STAT_GOAL[k]} ${v}` });
  }
  // 2) arenada iki zafer (yavru ligi ya da köy arenası; yetişkinse köy ya da şehir)
  if (w <= 7) push({ k: 'wins', tiers: d.stage === 'yetiskin' ? ['koy', 'sehir', 'cukur'] : ['yavru', 'koy'], n: 2, by: Math.min(9, w + 4), t: `Hafta ${numDat(Math.min(9, w + 4))} kadar arenada 2 zafer` });
  // 3) Bahar Kupası'nda yarı final (yetişkin olacaksa)
  if (w <= 9 && adultBy <= 10) push({ k: 'tour', id: 'kupa', r: 1, by: 10, t: "Bahar Kupası'nda yarı finale kal (15 ün gerekir)" });
  // 4) Şehir Arenası'nda zafer ya da gök yarışında birincilik
  if (w <= 15) push({ k: 'any', tiers: ['sehir'], race: 1, by: 16, t: `Hafta ${numDat(16)} kadar Şehir Arenası'nda bir zafer ya da gök yarışında birincilik` });
  // 5) Kızıl Taç'a katıl
  push({ k: 'tour', id: 'tac', r: 0, by: 20, t: "Kızıl Taç'a katıl (45 ün gerekir)" });
  // ödül ayrı alanda (gold); turnuva hedefinde r = geçilmesi gereken tur sayısıdır (0: katılmak, 1: yarı finale kalmak)
  for (const g of goals) g.gold = g.k === 'tour' ? (g.id === 'tac' ? 200 : 120) : { stat: 50, wins: 60, any: 100 }[g.k];
  return goals;
}
// Yıldızın kariyeri: yoksa ya da yıldız değiştiyse yeniden kurulur
function career() {
  const st = typeof ensureStar === 'function' ? ensureStar() : null;
  if (!st || st.old || st.dead) return null;
  if (!S.career || S.career.id !== st.id) {
    S.career = { id: st.id, i: 0, goals: careerBuild(st), done: 0 };
    careerSnap(st);
  }
  return S.career;
}
const goalGold = g => g.gold != null ? g.gold : g.r;
/* Eski kayıtlar: ödül turnuva hedefinin tur şartının üstüne yazılmıştı (r = 120/200), bu yüzden kupayı kazanan yıldız
   bile "yarı finale kalamadı" sayılıp emekli ediliyordu. Kayıt açılırken hedefler düzeltilir, haksız emekli edilen yıldız geri döner. */
function careerRepair() {
  if (!S || S.careerFix2) return; S.careerFix2 = 1;
  const fixG = g => { if (g && g.k === 'tour' && g.gold == null) { g.gold = g.r; g.r = g.id === 'tac' ? 0 : 1; } else if (g && g.gold == null && g.r != null) g.gold = g.r; };
  if (S.career) S.career.goals.forEach(fixG);
  const met = (d, id, r) => { const b = (d.tourW || {})[id]; return b != null && b >= r; };
  for (const d of S.dragons) {
    if (!d.retired || d.legend || d.dead) continue;
    const c = (S.chron || []).find(x => x.t.startsWith(`${d.name} kariyer hedefini tutturamadı (`));
    if (!c) continue;
    const kupa = c.t.includes('Bahar Kupası') && met(d, 'kupa', 1), tac = c.t.includes('Kızıl Taç') && met(d, 'tac', 0);
    if (!kupa && !tac) continue;
    d.old = false; d.retired = false;
    if (!S.over) { S.star = d.id; S.career = null; career(); }
    chron(`${d.name} kariyerine geri döndü: hedefi aslında tutmuştu (oyundaki bir hata düzeltildi).`);
    if (typeof toast === 'function') setTimeout(() => toast(`<b>${esc(d.name)} kariyerine geri döndü</b>Turnuva hedefini tutturmuştu; onu yanlışlıkla emekli eden hata düzeltildi.`, 'goal'), 600);
  }
}
const careerGoal = () => { const C = career(); return C && C.goals[C.i] || null; };
// Hedefin başında sayaçları not al (yalnızca o hedef süresince kazanılanlar sayılır)
function careerSnap(d) {
  const C = S.career, g = C && C.goals[C.i]; if (!g) return;
  g.base = { cw: { ...(d.cw || {}) }, raceW: d.raceW || 0 };
}
const cwSince = (d, g, tiers) => tiers.reduce((t, k) => t + ((d.cw || {})[k] || 0) - ((g.base && g.base.cw[k]) || 0), 0);
function careerProg(d, g) {
  if (!g) return { ok: false, txt: '' };
  if (g.k === 'stat') return { ok: d.st[g.s] >= g.v, txt: `${STAT_GOAL[g.s]} ${d.st[g.s]}/${g.v}` };
  if (g.k === 'wins') { const n = cwSince(d, g, g.tiers); return { ok: n >= g.n, txt: `${Math.min(n, g.n)}/${g.n} zafer` }; }
  if (g.k === 'any') { const n = cwSince(d, g, g.tiers), r = (d.raceW || 0) - ((g.base && g.base.raceW) || 0); return { ok: n >= 1 || r >= g.race, txt: n || r ? 'tamam' : 'henüz yok' }; }
  if (g.k === 'tour') {
    const best = (d.tourW || {})[g.id];
    if (g.r === 0) return { ok: best != null, txt: best != null ? 'katıldı' : `ün ${S.un}/${TOURS[g.by] ? TOURS[g.by].unReq : 45}` };
    return { ok: best != null && best >= g.r, txt: best != null ? `${best} tur` : `ün ${S.un}/${TOURS[g.by] ? TOURS[g.by].unReq : 15}` };
  }
  return { ok: false, txt: '' };
}
const weeksLeft = g => g.by - S.week;

/* --- Kontrol: başarı her işten sonra, başarısızlık haftanın sonunda --- */
function careerCheck(endOfWeek, gen) {
  const C = career(); if (!C) return;
  const d = byId(C.id); if (!d || d.dead) return;
  const g = C.goals[C.i]; if (!g) return;
  const p = careerProg(d, g);
  if (p.ok) {
    g.st = 'ok'; C.done++; C.i++;
    S.storyQ = S.storyQ || []; S.storyQ.push({ id: d.id, lv: 'career', g: { ...g }, last: C.i >= C.goals.length });
    S.gold += goalGold(g); addBond(d, 4);
    const k = g.k === 'stat' ? g.s : g.k === 'wins' ? 'gu' : 'ce';
    if (d.st[k] < capOf(d, k)) d.st[k] = Math.min(capOf(d, k), d.st[k] + 2);
    d.careerN = (d.careerN || 0) + 1; if (C.i >= C.goals.length) d.careerDone = true;
    titleCheck(d);
    chron(`${d.name} kariyer hedefini tutturdu: ${g.t}.`);
    if (C.i < C.goals.length) careerSnap(d);
    if (gen) gen.push(`<b class="good">Kariyer:</b> ${esc(d.name)} hedefini tutturdu (+${goalGold(g)} altın).`);
    else toast(`<b>Kariyer hedefi tamam</b>${esc(g.t)}<span class="gold-t">${ui('gold')}+${goalGold(g)}</span>`, 'goal');
    return careerCheck(endOfWeek, gen); // bir sonraki hedef de şimdiden tutmuş olabilir
  }
  if (endOfWeek && S.week >= g.by) careerFail(d, g, gen);
}
function careerFail(d, g, gen) {
  g.st = 'fail';
  d.old = true; d.retired = true; d.role = null; for (const s in d.equip) d.equip[s] = null;
  chron(`${d.name} kariyer hedefini tutturamadı (${g.t}); kariyeri bitti, artık ocağın hocası.`);
  if (gen) gen.push(`<b class="bad">Kariyer sona erdi:</b> ${esc(d.name)} hedefi tutturamadı. Artık dövüşmeyecek; ocağın hocası olacak.`);
  S.storyQ = S.storyQ || []; S.storyQ.push({ id: d.id, lv: 'retire', g: { ...g } });
  S.star = null; S.career = null; // ensureStar sıradaki en uygun ejderhayı yıldız yapar
}

/* --- Sahneler: kariyer adımları çizgi roman karesiyle anlatılır --- */
const CAREER_LINES = {
  stat: [`{n} ahırın köşesinde, kimse bakmazken kendi kendine çalışıyor. Seni görünce utanıp duruyor; sonra gururla bir kez daha deniyor.`],
  wins: [`Arenadan dönerken köyün çocukları {n:gen} peşine takılıyor. {n} başını dik tutuyor ama gözü hep sende: "Gördün mü?" der gibi.`],
  tour: [`Kupanın ışıkları sönerken {n} kalabalığın arasında seni arıyor. Bulunca başını alnına dayıyor. Bu yolu birlikte yürüdünüz.`],
  any: [`Şehrin taş meydanında adı ilk kez yüksek sesle anılıyor. {n} sesin geldiği yöne bakıyor, sonra yine sana dönüyor.`],
};
function careerScene(it) {
  const d = byId(it.id); if (!d) return nextModal();
  if (typeof BGM !== 'undefined') BGM.mood('bag');
  // Yetişkinse poz bir çizgi roman karesinde gösterilir (kare üstte, diyalog altta; poz kareye tam sığar)
  const pz = it.lv === 'retire' ? 'P5' : 'P6', panel = d.stage === 'yetiskin' ? careerPanel(d, pz, 'r') : null;
  const art = panel ? '' : `<div class="vdr">${dragonSVG(d)}</div>`;
  const T = TITLES.find(t => t.k === CAREER_TITLES[Math.min(CAREER_TITLES.length - 1, (d.careerN || 1) - 1)]);
  let text, kicker;
  if (it.lv === 'retire') {
    kicker = 'Kariyerin sonu';
    text = nameFill(`{n} son haftanın akşamı ahırın kapısında duruyor. Hedefe yetişemedi: ${esc(it.g.t).toLocaleLowerCase('tr')}. Bir süre arenanın yoluna bakıyor; sonra başını eğip yavruların oynadığı avluya dönüyor. Artık dövüşmeyecek. Ama bundan sonra ocaktaki her yavru, ondan öğrendikleriyle büyüyecek.`, d);
  } else {
    kicker = it.last ? 'Kariyer tamamlandı' : 'Kariyer adımı';
    text = nameFill(pick(CAREER_LINES[it.g.k] || CAREER_LINES.wins), d) + (T ? ` Meydanda artık ona <b>“${titleName(T)(d)}”</b> diyorlar.` : '');
  }
  const opts = it.lv === 'retire'
    ? `<button class="vopt" data-a="careeropt" data-i="0">Yanına otur, başını okşa</button><button class="vopt" data-a="careeropt" data-i="1">"Yavrular seni bekliyor" de</button>`
    : `<button class="vopt" data-a="careeropt" data-i="0">Burnunu okşa</button><button class="vopt" data-a="careeropt" data-i="1">"Daha yeni başlıyoruz" de</button>`;
  CUR_CAREER = it;
  vn({ speaker: esc(d.name), kicker, art, text, opts, bg: sceneOr('ahir', sceneAhir(d.el)), cls: 'storyvn careervn' + (panel ? ' haspanel' : '') });
  // kare arka planın karartmasından etkilenmesin diye arka plan katmanının üstüne eklenir
  if (panel) { const bgEl = $('#modal-root .vnbg'); if (bgEl) bgEl.insertAdjacentHTML('afterend', panel); cutFit($('.vnpanel .rcp')); }
  SFX.play(it.lv === 'retire' ? 'sad' : 'heart');
}
let CUR_CAREER = null;
function careerPanel(d, pz, face) {
  if (!hasPose(d, pz)) return null;
  const es = poseEdgeStyle(d, pz, face), M = POSE_META[d.el + '-' + pz], ar = (M[1] / M[0]).toFixed(4);
  const inner = `<div class="rcd ${es ? 'edge' : ''}" ${es ? `style="${es}"` : `data-box="${poseBox(d, pz, '12,8,76,84,c')}" data-ar="${ar}"`}>${poseSVG(d, pz, { face, still: true })}</div>`;
  return `<div class="vnpanel ${pz === 'P5' ? 'sad' : ''}"><div class="rcp"><div class="rcbg own" style="background-image:url(${asset('bg-ahir') || ''})"></div><div class="rctone"></div>${inner}</div></div>`;
}
const CAREER_ACT = {
  careeropt(el) {
    const it = CUR_CAREER, d = it && byId(it.id); if (!d) return closeModal();
    const i = +el.dataset.i;
    if (it.lv === 'retire') { addBond(d, i ? 2 : 4); if (i) nudge(d, 'dis', 4); else nudge(d, 'sic', 4); const st = ensureStar(); career(); if (st) setTimeout(() => toast(`Ocağın yeni yıldızı: <b>${esc(st.name)}</b>. Kariyer hedefleri yeniden kuruldu.`, 'goal'), 400); }
    else { if (i) nudge(d, 'ces', 4); else { nudge(d, 'sic', 4); addMood(d, 1); } }
    closeModal(); afterAction(true);
  },
};

/* --- Arayüz --- */
function careerCard() {
  const C = career(); if (!C) return '';
  const d = byId(C.id), g = C.goals[C.i];
  if (!g) return `<div class="career-card done"><b>${ui('un')} ${esc(d.name)}</b><span>Kariyer tamamlandı. ${d.champ === 'tac' ? 'Kızıl Taç onun.' : ''}</span></div>`;
  const p = careerProg(d, g), wl = weeksLeft(g);
  return `<button class="career-card ${wl <= 1 ? 'urgent' : ''}" data-a="drawer-career"><span class="cc-h">${ui('un')} ${esc(d.name)} · kariyer ${C.i + 1}/${C.goals.length}</span><b>${esc(g.t)}</b><span class="cc-p">${esc(p.txt)} · ${wl <= 0 ? 'bu hafta son' : `${wl} hafta kaldı`}</span></button>`;
}
function careerDrawer() {
  const C = career(); if (!C) return drawer('Kariyer', '<p class="mute">Yıldız olabilecek bir ejderha yok.</p>');
  const d = byId(C.id);
  const li = C.goals.map((g, i) => { const st = g.st === 'ok' ? 'ok' : i === C.i ? 'now' : 'next'; const p = i === C.i ? careerProg(d, g) : null;
    return `<li class="${st}"><i>${i + 1}</i><div><b>${esc(g.t)}</b><small>${st === 'ok' ? 'tamamlandı' : st === 'now' ? `${esc(p.txt)} · ${weeksLeft(g) <= 0 ? 'bu hafta son' : weeksLeft(g) + ' hafta kaldı'}` : `son hafta ${g.by}`} · ödül ${goldTxt(goalGold(g))}</small></div></li>`; }).join('');
  return drawer(`${esc(d.name)} · kariyer`, `<p class="sm">Yıldızın hedefleri sırayla gelir. Tutturursa bağ sahnesi, lakap ve ödül açılır. <b>Tutturamazsa kariyeri biter:</b> emekli olur, ocağın hocası olarak kalır; yıldızlık başkasına geçer.</p><ol class="career-list">${li}</ol>`, 'wide');
}
