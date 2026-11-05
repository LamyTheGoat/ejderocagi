'use strict';
/* ============ EJDER OCAĞI — YENİ OYUN, HAFTA SONU, YUMURTA ============ */

const SEASON = 20;
const TOURS = {
  10: { id: 'kupa', ad: 'Bahar Kupası', unReq: 15, rounds: [56, 63, 72], gear: 10, odul: [120, 160, 600], un: [3, 3, 15] },
  20: { id: 'tac', ad: 'Kızıl Taç', unReq: 45, rounds: [84, 95, 110], gear: 18, odul: [200, 300, 2000], un: [4, 4, 30] },
};

function newGame(startId) {
  S = {
    week: 1, gold: 420, un: 0, neg: 0, grid: [], cleared: 0, dragons: [], dead: [], eggs: [], inv: [],
    food: { balik: 2, biber: 1, kar: 0, mantar: 0, yumru: 0, zambak: 0, ziyafet: 0, genclik: 0 },
    market: null, smith: [], arena: null, flags: {}, seenEv: [], goals: [],
    st: { wins: 0, losses: 0, train: 0, acq: 0, bred: 0, talk: 0, feed: 0, fav: 0, hatch: 0, fights: 0, seferler: 0, catches: 0, kupa: 0, deaths: 0 },
    aff: {}, nid: startId || 1, uid: 1, tour: null, over: false, ending: null, chron: [],
  };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) S.grid.push({ b: null, open: x >= 2 && x <= 5 && y >= 1 && y <= 4 });
  S.grid[idx(3, 2)].b = 'in';
  S.grid[idx(2, 2)].b = 'fener';
  const kor = mkDragon({
    name: 'Kor', sex: 'M', stage: 'yetiskin', age: 9, traits: ['kor'], bond: 45, mood: 3, fav: 'biber',
    genes: { pot: { gu: [3, 4], ce: [2, 3], da: [3, 3], ze: [2, 2] }, el: ['ates', 'buz'], pat: ['C', 'd'], eye: ['N', 'A'], horn: ['k', 'd'] },
    st: { gu: 42, ce: 30, da: 38, ze: 24 }, pers: { ces: 22, sic: 8, dis: 4 }, origin: 'Dedenden kaldı',
  });
  S.dragons.push(kor);
  S.eggs.push({
    id: 'e' + S.uid++, sex: 'F', traits: ['kartal'], w: 0, inK: false, gen: 1, parents: null, origin: 'Dedenin yumurtası', special: 'dede',
    genes: { pot: { gu: [3, 2], ce: [4, 4], da: [3, 2], ze: [4, 3] }, el: ['buz', 'golge'], pat: ['B', 'd'], eye: ['A', 'N'], horn: ['t', 'k'] },
  });
  refreshMarket(); refreshArena(); refreshSmith();
  chron('Dedenin ocağını devraldın. Yanında yaşlı Kor ve soğumaya yüz tutmuş bir yumurta var.');
}
function chron(t) { S.chron.push({ w: S.week, t }); if (S.chron.length > 60) S.chron.shift(); }

function makeEggs(A, B) {
  const aff = getAff(A.id, B.id);
  const n = (hasTrait(A, 'dogurgan') || hasTrait(B, 'dogurgan')) && chance(35) ? 2 : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const { genes, muts } = inheritGenes(A, B);
    const { traits, mut } = inheritTraits(A, B, aff);
    out.push({
      id: 'e' + S.uid++, genes, sex: pick(['F', 'M']), traits, w: 0, inK: false, gen: Math.max(A.gen, B.gen) + 1,
      parents: [A.name, B.name], pids: [A.id, B.id], muts, traitMut: mut, origin: `${A.name} ile ${ek(B.name, 'gen')} yumurtası`,
    });
  }
  return out;
}
function kuluckaFree() { return hasB('kulucka') ? 2 - S.eggs.filter(e => e.inK).length : 0; }

function hatchEgg(egg) {
  const d = mkDragon({ pids: egg.pids, genes: egg.genes, sex: egg.sex, traits: egg.traits, stage: 'yavru', age: 0, gen: egg.gen, parents: egg.parents, origin: egg.origin, bond: 40, mood: 3 });
  if (egg.special === 'dede') d.name = 'Gece';
  S.eggs = S.eggs.filter(e => e !== egg);
  S.dragons.push(d);
  S.st.hatch++;
  const notes = [];
  notes.push(`${EL_AD[d.el]} elementi · ${lookText(d)} · ${EYEC[eyeColor(d)].ad.toLowerCase()} gözlü · ${PAT_AD[d.pat]}`);
  if (pigOf(d) === 'a') notes.push('<b class="good">Ak bir yavru!</b> Süt beyazı pullar, kızıl gözler. Çok nadir.');
  else if (pigOf(d) === 'm') notes.push('<b class="good">Kara bir yavru!</b> Gece kadar koyu pullar.');
  if (parOf(d)) notes.push('<b class="good">Pulları parıldıyor!</b> Parıltı geni taşıyor.');
  let unG = 0;
  if (d.eye === 'A') { notes.push('<b>Parlak göz!</b> İki çekinik gen buluştu, gözlerinde bir hare var. Kritik vuruş şansı +%6.'); unG += 2; }
  if (d.el === 'golge') { notes.push('<b>Gölge ejderhası!</b> Çekinik element ortaya çıktı.'); unG += 3; }
  for (const k of STATS) { const s = d.genes.pot[k][0] + d.genes.pot[k][1]; if (s >= 9) { notes.push(`${ST_AD[k]} potansiyeli olağanüstü: ${potLetter(s)}`); unG += 1; } }
  if (egg.muts && egg.muts.length) notes.push('Mutasyon: ' + egg.muts.join(', '));
  if (egg.traitMut) notes.push(`Kendiliğinden ortaya çıkan özellik: ${TRAITS[egg.traitMut].ad}`);
  if (d.traits.length) notes.push('Özellikler: ' + d.traits.map(t => TRAITS[t].ad).join(', '));
  if (unG) { S.un += unG; notes.push(`Haber yayıldı: +${unG} ün`); }
  chron(`${d.name} yumurtadan çıktı (${egg.origin}).`);
  snapAlbum('hatch', 'Yumurtadan çıkış', `${d.name} kabuğunu kırdı. ${egg.origin}.`, d);
  return { d, notes };
}

function feedDragon(d, food) {
  if (!S.food[food]) return null;
  if (food === 'genclik') {
    if (d.stage !== 'yavru') {
      if (typeof toast === 'function') toast('<b class="bad">Yalnızca Yavrular İçebilir!</b> Sonsuz Gençlik İksiri sadece <b>Yavru</b> ejderhalara içirilebilir!', 'bad');
      if (typeof SFX !== 'undefined' && SFX.play) SFX.play('error');
      return null;
    }
    if (d.eternalYouth) {
      if (typeof toast === 'function') toast(`<b>${d.name}</b> zaten Sonsuz Gençlik İksiri ile mühürlenmiş!`);
      return null;
    }
    S.food.genclik--;
    d.eternalYouth = true;
    S.flags = S.flags || {};
    S.flags.eternalBabyReady = true;
    addMood(d, 2);
    addBond(d, 10);
    S.st.feed++;
    chron(`${d.name} Sonsuz Gençlik İksiri içti; ebedi yavru olarak Zindan ve Topçu meydanlarında silahın oldu!`);
    return ['<b>Sonsuz Gençlik İksiri içirildi!</b> Bu yavru artık hiç büyümeyecek; Zindan ve Ejder Topçusu savaşlarında omuz silahın olarak seninle çarpışacak!'];
  }
  if (d.fed) return null;
  S.food[food]--; d.fed = true; S.st.feed++;
  const lines = [];
  const F = FOODS[food];
  if (food === 'ziyafet') { addMood(d, 2); addBond(d, 5); d.fat = Math.max(0, d.fat - 20); lines.push('Ziyafeti son lokmasına kadar bitirdi.'); }
  else if (food === d.fav) {
    addMood(d, 2); addBond(d, 8);
    d.fedFav = S.week;
    if (!d.favKnown) { d.favKnown = true; S.st.fav++; lines.push(`<b>${F.ad} onun en sevdiği yemekmiş!</b> Gözleri parladı.`); }
    else lines.push(`En sevdiği ${F.ad.toLowerCase()} karşısında kuyruğunu yere vurdu.`);
  } else { addMood(d, 1); addBond(d, 3); lines.push(`${F.ad} hoşuna gitti.`); }
  if (hasTrait(d, 'obur')) { addMood(d, 1); lines.push('Obur ejderha daha fazlasını istiyor.'); }
  return lines;
}

function resolveTrain(d, k, rep) {
  if (hasMark(d, 'Asi') && chance(10)) { rep.push(`Antrenmana gelmedi. Asi ruhu bugün dinlemedi.`); d.fat = Math.max(0, d.fat - 10); return; }
  const c = trainCalc(d, k);
  if (chance(c.fail)) {
    d.inj = ri(1, 2); addMood(d, -1); d.fat += 5;
    rep.push(`<span class="bad">Antrenmanda sakatlandı</span> (${d.inj} hafta). Yorgunluk çok yüksekti.`);
    return;
  }
  let g = c.capped ? 0 : Math.max(0, c.gain + ri(-1, 2));
  let dbl = false;
  if (hasMark(d, 'Asi') && chance(20)) { g *= 2; dbl = true; }
  g = Math.min(g, capOf(d, k) - d.st[k]);
  const s2 = Math.min(c.sec, capOf(d, c.sk) - d.st[c.sk]);
  const M = d.stage !== 'yetiskin' && typeof mentorOf === 'function' ? mentorOf() : null;
  if (M && g > 0 && d.st[k] + g < capOf(d, k)) g += 1;
  const SB = starTrainBonus(d, k, g); if (SB.add) g += Math.max(0, Math.min(SB.add, capOf(d, k) - d.st[k] - g));
  const before = d.st[k];
  d.st[k] += g; d.st[c.sk] += s2;
  d.fat = clamp(d.fat + c.fat, 0, 100);
  addBond(d, 1);
  S.st.train++;
  const parts = [`${ST_AD[k]} antrenmanı (${STYLES[d.style].ad.toLowerCase()}): <b class="good">${ST_KISA[k]} +${g}</b>${s2 ? `, ${ST_KISA[c.sk]} +${s2}` : ''}`];
  if (dbl) parts.push('Asi bir ilhamla iki kat çalıştı!');
  if (M && g > 0) { parts.push(`${esc(M.name)} başında durup homurdanarak düzeltti (+1).`); addBond(M, 1); }
  if (SB.line) parts.push(SB.line);
  if (g === 0) parts.push('<span class="warn">Genetik sınırına dayandı.</span>');
  rep.push(parts.join(' '));
  const ms = [];
  if (d.style === 'sert') { ms.push(nudge(d, 'dis', 4)); ms.push(nudge(d, 'sic', -2)); }
  if (d.style === 'yumusak') ms.push(nudge(d, 'sic', 3));
  if (d.style === 'oyun') { ms.push(nudge(d, 'sic', 2)); ms.push(nudge(d, 'dis', -3)); if (chance(40)) addMood(d, 1); }
  if (k === 'gu') ms.push(nudge(d, 'ces', 2));
  if (k === 'ze') { ms.push(nudge(d, 'ces', -1)); ms.push(nudge(d, 'dis', 1)); }
  ms.filter(Boolean).forEach(m => rep.push(m));
  const cm = trainCardRoll(d, k, before); if (cm) rep.push(cm);
}

function endWeek() {
  const report = [], queue = [];
  const H = housing();
  const done = new Set();
  const star = ensureStar(), starRep = [];
  for (const d of S.dragons) {
    const rep = [];
    const t = d.task;
    if (d.inj && t && t.t !== 'done') { rep.push('Yarası yüzünden dinlendi.'); d.fat = Math.max(0, d.fat - 25); }
    else if (!t && supporting(d)) supportWeek(d, rep, starRep, star);
    else if (!t) { rep.push('Boş bir hafta geçirdi, biraz dinlendi.'); d.fat = Math.max(0, d.fat - 15); }
    else if (t.t === 'train') resolveTrain(d, t.k, rep);
    else if (t.t === 'rest') {
      const before = d.fat; d.fat = Math.max(0, d.fat - (hasB('kaynak') ? 55 : 40));
      if (before > 30 || chance(50)) addMood(d, 1);
      rep.push(`Dinlendi. Yorgunluk ${before} iken ${d.fat} oldu${hasB('kaynak') ? ' (sıcak kaynak)' : ''}.`);
    } else if ((t.t === 'walk' || t.t === 'breed') && !done.has(d.id)) {
      const P = byId(t.p);
      done.add(d.id); if (P) done.add(P.id);
      if (!P || !P.task || P.task.p !== d.id) { rep.push('Eşi gelmedi; yalnız dolaştı.'); d.fat = Math.max(0, d.fat - 10); }
      else if (t.t === 'walk') {
        const g = 12 + compat(d, P) + (hasB('yuva') ? 6 : 0);
        addAff(d.id, P.id, g);
        for (const x of [d, P]) { x.fat = Math.max(0, x.fat - 10); if (chance(50)) addMood(x, 1); }
        rep.push(`${P.name} ile gezintiye çıktı. <b class="heart">Yakınlık +${g}</b> (${getAff(d.id, P.id)}).`);
        report.push({ d: P, lines: [`${d.name} ile gezintiye çıktı. <b class="heart">Yakınlık +${g}</b>.`] });
      } else {
        const ok = breedChecks(d, P).every(c => c[1]);
        if (ok && chance(breedChance(d, P))) {
          const F = d.sex === 'F' ? d : P, M = F === d ? P : d;
          const eggs = makeEggs(F, M);
          S.eggs.push(...eggs); S.st.bred += eggs.length;
          addAff(d.id, P.id, 10);
          const line = `<b class="heart">${P.name} ile yuva kurdu.</b> ${eggs.length === 2 ? 'İKİZ yumurta!' : 'Bir yumurta!'}`;
          rep.push(line); report.push({ d: P, lines: [line] });
          chron(`${F.name} ve ${M.name} ${eggs.length === 2 ? 'ikiz yumurta' : 'bir yumurta'} verdi.`);
          snapAlbum('love', 'Yuva', `${F.name} ve ${M.name} ${eggs.length === 2 ? 'ikiz yumurta' : 'bir yumurta'} verdi.`, F, M);
          for (const e of eggs) if (kuluckaFree() > 0) e.inK = true;
        } else {
          addAff(d.id, P.id, -5);
          const line = ok ? `${P.name} ile birlikte oldu ama bu sefer yumurta olmadı.` : `${P.name} ile çiftleşme koşulları bozulmuştu.`;
          rep.push(line); report.push({ d: P, lines: [line] });
        }
        for (const x of [d, P]) x.fat = clamp(x.fat + 10, 0, 100);
      }
    }
    // pasif
    d.fat = Math.max(0, d.fat - 8);
    if (d.inj) { d.inj = Math.max(0, d.inj - (hasB('sifa') ? 2 : 1) * (hasTrait(d, 'cabuk') ? 2 : 1)); if (!d.inj) rep.push('<span class="good">Yarası iyileşti.</span>'); }
    const c = comfortOf(d, H);
    const before = d.mood;
    if (c >= 4 && chance(50)) addMood(d, 1);
    else if (c >= 2 && chance(20)) addMood(d, 1);
    else if (c <= 0 && chance(45)) addMood(d, -1, true);
    if (d.fat >= 70 && chance(50)) addMood(d, -1, true);
    d.dirt = clamp((d.dirt || 0) + 6, 0, 100);
    if (d.dirt >= 70 && chance(35)) { addMood(d, -1, true); rep.push('<span class="warn">Pulları çamurdan kaşınıyor. Bakım ekranında yıkanmak istiyor.</span>'); }
    if (d.mood !== before) rep.push(d.mood > before ? `Moral yükseldi: ${MOOD[d.mood]}.` : `<span class="warn">Moral düştü: ${MOOD[d.mood]}.</span>`);
    // yaş
    d.age++;
    const ns = stageFor(d);
    if (ns !== d.stage) {
      d.stage = ns; linReg(d); (window.__grew = window.__grew || []).push(d.id);
      for (const k of STATS) d.st[k] = Math.min(capOf(d, k), Math.round(d.st[k] * 1.15 + 4));
      rep.push(`<b>Büyüdü! Artık ${STAGE_AD[ns].toLowerCase()}.</b> Bütün değerleri arttı.`);
      if (ns === 'yetiskin') chron(`${d.name} yetişkin oldu.`);
    }
    ageCheck(d, rep); titleCheck(d);
    if (rep.length) {
      const ex = report.find(r => r.d === d);
      if (ex) ex.lines.unshift(...rep); else report.push({ d, lines: rep });
    }
  }
  // yıldızın haftalık payı (neşe kaynakları, yıldızlık)
  if (star && !star.dead) { starWeek(star, starRep); if (starRep.length) { const ex = report.find(r => r.d === star); if (ex) ex.lines.push(...starRep); else report.push({ d: star, lines: starRep }); } }
  // aynı inde yaşayanlar
  const byHouse = {};
  for (const d of S.dragons) { const h = H[d.id]; (byHouse[h] = byHouse[h] || []).push(d); }
  for (const h in byHouse) if (byHouse[h].length === 2) addAff(byHouse[h][0].id, byHouse[h][1].id, 4);

  // giderler
  let upkeep = 0;
  for (const d of S.dragons) upkeep += hasTrait(d, 'obur') ? 15 : 10;
  if (hasB('kiler')) upkeep = Math.round(upkeep * 0.75);
  S.gold -= upkeep;
  const gen = [];
  gen.push(`Yem ve bakım gideri: <b>-${upkeep} altın</b>`);
  const hk = countB('heykel'); if (hk) { S.un += hk; gen.push(`Heykeller ocağın adını yayıyor: +${hk} ün`); }

  // yumurtalar
  let slots = freeSlots();
  for (const e of [...S.eggs]) {
    if (!e.inK) continue;
    e.w++;
    if (e.w >= (perk('yumurtaci', 50) ? 1 : 2)) {
      if (slots > 0) { slots--; queue.push({ type: 'hatch', egg: e }); }
      else gen.push('<span class="warn">Bir yumurta çatlamaya hazır ama inlerde yer yok!</span>');
    }
  }

  // turnuva kaçırıldı mı
  const T = TOURS[S.week];
  if (T && !(S.tour && S.tour.done)) gen.push(`<span class="warn">${ek(T.ad, 'dat')} katılmadın.</span>`);

  // borç
  if (S.gold < 0) {
    S.neg++;
    for (const d of S.dragons) addMood(d, -1, true);
    gen.push(`<span class="bad">Kasa eksiye düştü (${S.neg}/3). Alacaklılar kapıda; ejderhalar huzursuz.</span>`);
    if (S.neg >= 3) { S.over = true; S.ending = 'iflas'; }
  } else S.neg = 0;

  if (typeof careerCheck === 'function') careerCheck(true, gen);
  if (typeof ordersWeek === 'function') ordersWeek(gen);
  resolveWishes(report); socialWeek(gen); rivalWeek(gen);
  for (const d of S.dragons) { d.task = null; d.talked = false; d.fed = false; }

  if (S.week >= SEASON && !S.over) { S.over = true; S.ending = S.ending || 'sezon'; }
  if (!S.over) {
    S.week++;
    refreshMarket(); refreshSmith(); refreshArena();
    S.tour = TOURS[S.week] ? { ...TOURS[S.week], rounds: TOURS[S.week].rounds.map(r => r + (typeof seasonBonus === 'function' ? seasonBonus() : 0)), round: 0, dragon: null, done: false, results: [] } : null;
    rollWishes();
    if (seasonOf(S.week).k !== seasonOf(S.week - 1).k) { const s = seasonOf(S.week); gen.push(`<b>${s.ad} geldi.</b> ${s.d}`); chron(`${s.ad} başladı.`); }
    const ev = pickEvent();
    if (ev) queue.push({ type: 'event', ev });
  }
  checkGoals();
  return { report, gen, queue };
}

function checkGoals() {
  const got = [];
  for (const g of GOALS) if (!S.goals.includes(g.id) && g.c()) { S.goals.push(g.id); S.gold += g.r; got.push(g); }
  return got;
}
function activeGoals(n = 3) { return GOALS.filter(g => !S.goals.includes(g.id)).slice(0, n); }

/* ---------- Dövüş sonuçları ---------- */
function fightOutcome(d, F, tierKey, opp) {
  const T = TIERS[tierKey];
  const won = F.winner === 'p';
  const lines = [];
  d.fat = clamp(d.fat + (won ? 16 : 24), 0, 100); d.dirt = clamp((d.dirt || 0) + 22, 0, 100);
  S.st.fights++;
  if (won) {
    const eq = equipStats(d);
    const gold = (opp.odul || 0) + eq.gold;
    const nCos = Object.values(d.cos || {}).filter(Boolean).length;
    const un = (T ? T.un : 0) + (hasTrait(d, 'asil') ? 1 : 0) + (perk('ozan', 25) ? 1 : 0) + (nCos ? 1 : 0) + (nCos >= 5 ? 1 : 0) + (isStar(d) ? 1 : 0);
    if (nCos >= 5) addMood(d, 1);
    S.gold += gold; S.un += un; d.w++; S.st.wins++; d.cw = d.cw || {}; d.cw[tierKey] = (d.cw[tierKey] || 0) + 1;
    d.streak = (d.streak || 0) + 1; d.bestStreak = Math.max(d.bestStreak || 0, d.streak); if (tierKey === 'cukur') d.pitW = (d.pitW || 0) + 1;
    if (d.w === 1) snapAlbum('win', 'İlk zafer', `${d.name} ${T ? ek(T.ad, 'loc') : 'arenada'} ilk zaferini aldı.`, d);
    else if (d.w === 5) snapAlbum('win', 'Beşinci zafer', `${d.name} artık arenada tanınan bir isim.`, d);
    addBond(d, 3);
    lines.push(`<b class="good">Zafer!</b> +${gold} altın, +${un} ün.`);
    if (typeof awardChibiStones === 'function') {
      const bonusDrop = (S.sofraBuff && S.sofraBuff >= S.week) ? 1 : 0;
      const stDrops = {};
      if (tierKey === 'cukur') {
        stDrops.kor_t2 = ri(2, 4) + bonusDrop;
        stDrops.kor_t3 = ri(1, 2);
        if (chance(35)) stDrops.anka_koruma = 1;
      } else if (tierKey === 'sehir') {
        stDrops.kor_t1 = ri(3, 4) + bonusDrop;
        stDrops.kor_t2 = ri(1, 2);
      } else {
        stDrops.kor_t1 = ri(2, 3) + bonusDrop;
      }
      const gotStones = awardChibiStones({ stones: stDrops });
      if (gotStones.length) lines.push(`<b class="good">Arena Kor Ganimeti:</b> ${gotStones.join(', ')}.`);
    }
    if (isStar(d)) lines.push('Ocağın yıldızı meydanda: ün +1.');
    if (nCos) lines.push(nCos >= 5 ? 'Tam takım süsüyle seyircinin gözdesi oldu: ün +2, moral +1.' : 'Süsleri seyircinin gözünü aldı: ün +1.');
    const m = nudge(d, 'ces', 4); if (m) lines.push(m);
    if (tierKey === 'cukur') { const m2 = nudge(d, 'dis', -3); if (m2) lines.push(m2); }
    if (!T?.safe && F.p.hp < F.p.maxHp * 0.3 && chance(hasMark(d, 'Temkinli') ? 15 : 30)) { d.inj = 1; lines.push('<span class="warn">Zafere rağmen hafif yaralandı (1 hafta).</span>'); }
    if (chance(35)) addMood(d, 1);
  } else {
    d.l++; S.st.losses++; d.streak = 0;
    if (F.surrender) {
      lines.push('Teslim oldun. Ejderhan güvende ama kalabalık yuhalıyor.');
      const m = nudge(d, 'ces', -6); if (m) lines.push(m);
      if (tierKey === 'cukur') { S.gold -= 60; lines.push('Çukur teslim olanı cezalandırır: -60 altın.'); }
      S.un = Math.max(0, S.un - 1);
    } else {
      lines.push('<span class="bad">Yenilgi.</span>');
      if (typeof awardChibiStones === 'function') {
        const stCons = tierKey === 'cukur' ? { kor_t2: 1 } : { kor_t1: 1 };
        const gotCons = awardChibiStones({ stones: stCons });
        if (gotCons.length) lines.push(`Teselli Ganimeti: ${gotCons.join(', ')}.`);
      }
      const m = nudge(d, 'ces', -2); if (m) lines.push(m);
      if (!T?.safe && chance(hasMark(d, 'Temkinli') ? 28 : 55)) { d.inj = ri(1, 2); lines.push(`<span class="warn">Yaralandı (${d.inj} hafta).</span>`); }
    }
    addMood(d, -1, true);
  }
  if (F.p.saves) d.saved = (d.saved || 0) + F.p.saves;
  titleCheck(d);
  return { won, lines };
}
// Ölüm zarı. {died, saved}
function rollDeath(d, base) {
  const r = deathRisk(d, base);
  if (!r || !chance(r)) return { died: false, risk: r };
  const ankaSlot = Object.keys(d.equip).find(s => d.equip[s] != null && itemOf(d.equip[s])?.anka);
  if (ankaSlot) {
    const uid = d.equip[ankaSlot]; d.equip[ankaSlot] = null; S.inv = S.inv.filter(i => i.uid !== uid);
    return { died: false, anka: true, risk: r };
  }
  return { died: true, risk: r };
}
function killDragon(d, cause) {
  snapAlbum('death', 'Veda', `${d.name} ${cause}.`, { ...d, dead: true }); linReg({ ...d, dead: true });
  S.dragons = S.dragons.filter(x => x !== d);
  for (const s in d.equip) d.equip[s] = null;
  d.cause = cause; d.diedW = S.week;
  S.dead.push(d); S.st.deaths++;
  for (const o of S.dragons) { addMood(o, getAff(o.id, d.id) >= 40 ? -2 : -1, true); }
  chron(`${d.name} ${cause}. Ocak yasta.`);
}
