/* Ejder Ocağı 2.0 · Arena: kademeler, rakip ilanları, tur tabanlı dövüş ve turnuvalar
   Dövüş motoru oyunun kendisidir (js/core.js: newFight, fightRound; js/week.js: fightOutcome, rollDeath). Sonuç, ödül ve ölüm
   zarı eski arayüzdeki finishFight / finishTourRound ile aynı sırayla işlenir. Maç öncesi ve sonrası hikâye sahneleri henüz yok. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, el = G.el, app = document.getElementById('app');
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const wait = ms => new Promise(r => setTimeout(r, window.__fastFx ? 10 : ms));
  const pw = o => Math.round(sum(STATS.map(k => o.st[k])) / 4);
  let FT = null;
  /* oyunun kule mantığı (endgame.js) dövüş durumunu küresel FT adıyla kurar ve okur; buradaki duruma bağlanır */
  Object.defineProperty(window, 'FT', { configurable: true, get: () => FT, set: v => { FT = v; } });
  const pickAuto = () => { const x = autoChoose(FT.F.p, FT.F.e); return can(x) ? x : 'pence'; };      // otomatik dövüş: oyunun kendi dövüş zekâsı oyuncu adına seçer

  /* ---------- olay metni (eski evText ile aynı cümleler) ---------- */
  function evText(ev) { const F = FT.F, a = ev.who === 'p' ? F.p : F.e, t = ev.who === 'p' ? F.e : F.p, A = '<b>' + esc(a.name) + '</b>';
    if (ev.act === 'savun') return { t: A + ' savunmaya geçti ve nefeslendi.' };
    if (ev.act === 'teslim') return { t: A + ' başını eğdi.', c: 'kotu' };
    if (ev.act === 'stun') return { t: A + ' sersemledi, bu tur kıpırdayamadı.', c: ev.who === 'p' ? 'kotu' : 'iyi' };
    const c = ev.who === 'p' ? 'iyi' : 'kotu';
    if (ev.act === 'card') { const K = '<b class="au">' + CARDS[ev.card].ad + '</b>';
      if (ev.heal && (ev.card === 'son_nefes' || ev.card === 'kadim_buzul')) return { t: A + ' ' + K + '! <b>' + ev.heal + '</b> can topladı.', c };
      if (ev.miss) return { t: A + ' ' + K + ' denedi ama ' + (ev.evaded ? esc(t.name) + ' gölgeden sıyrıldı' : 'boşa gitti') + '.', c: 'soluk' };
      if (ev.blocked) return { t: A + ' ' + K + ' indirdi ama ' + esc(t.name) + ' kanat kalkanıyla hepsini savuşturdu.', c: 'soluk' };
      if (!ev.dmg) return { t: A + ' ' + K + '!', c };
      return { t: A + ' ' + K + ': <b>' + ev.dmg + '</b> hasar' + (ev.hits === 2 ? ' (iki darbe)' : '') + (ev.crit ? ', kritik!' : '') + (ev.saved ? ' <b class="heart">' + esc(t.name) + ' düşmek üzereyken sana baktı ve ayağa kalktı!</b>' : ''), c }; }
    if (ev.act === 'kukre') return ev.ok ? { t: A + ' kükredi! ' + esc(t.name) + ' sarsıldı.', c: 'iyi' } : { t: A + ' kükredi ama ' + esc(t.name) + ' istifini bozmadı.', c: 'soluk' };
    const nm = ev.act === 'nefes' ? EL_AD[a.el].toLowerCase() + ' nefesi' : 'pençesi', fb = ev.fb ? A + ' nefesi yetmedi, pençeye döndü. ' : '';
    if (ev.miss) return { t: fb + (ev.evaded ? esc(t.name) + ' gölgeden sıyrıldı; ' : '') + ek(A, 'gen') + ' ' + nm + ' boşa gitti.', c: 'soluk' };
    if (ev.covered) return { t: '<b>' + esc(ev.covered) + '</b> araya atıldı ve darbeyi göğsüyle karşıladı!', c: ev.who === 'e' ? 'iyi' : 'kotu' };
    if (ev.blocked) return { t: esc(t.name) + ' kanat kalkanıyla darbeyi savuşturdu.', c: 'soluk' };
    return { t: fb + ek(A, 'gen') + ' ' + nm + ': <b>' + ev.dmg + '</b> hasar' + (ev.crit ? ', kritik!' : '') + (ev.elm > 1 ? ' Element üstünlüğü!' : '') + (ev.saved ? ' <b class="heart">' + esc(t.name) + ' düşmek üzereyken sana baktı ve ayağa kalktı!</b>' : ''), c }; }

  /* ---------- dövüş sahnesi ---------- */
  const can = x => { const p = FT.F.p; if (x === 'pence' || x === 'savun' || x === 'teslim') return true; if (x === 'nefes') return p.sta >= NEFES_COST; if (x === 'kukre') return p.sta >= 15; if (x.startsWith('card:')) { const k = x.slice(5); return p.cards.includes(k) && !(p.used || []).includes(k); } return false; };
  function fightUI() { const F = FT.F, w = el('div', 'dov'); w.id = 'dov'; w.style.setProperty('--sahne', 'url("' + (FT.mode === 'kule' ? G.bgUrl('a:kule') : G.url('img/' + (FT.tier === 'cukur' ? 'bg-pit' : FT.mode === 'tour' ? 'bg-saray' : 'bg-arena') + '.webp')) + '")');
    w.innerHTML = '<header><small>' + esc(FT.title) + '</small><b id="dovTur"></b></header><div class="dov-saha"><div class="taraf sol" style="--el:' + G.ELC[F.p.el] + '"><div class="isim"><b>' + esc(F.p.name) + '</b><span class="etk el-' + F.p.el + '">' + EL_AD[F.p.el] + '</span></div><div class="can"><i id="hpP"></i><b id="hpPt"></b></div><div class="nefes"><i id="stP"></i></div><div class="govde"><img id="imP" alt="" src="' + G.img(FT.d) + '"><em id="dmP"></em></div></div>' +
      '<div class="vs">VS</div><div class="taraf sag" style="--el:' + G.ELC[F.e.el] + '"><div class="isim"><span class="etk el-' + F.e.el + '">' + EL_AD[F.e.el] + '</span><b>' + esc(F.e.name) + '</b></div><div class="can"><i id="hpE"></i><b id="hpEt"></b></div><div class="nefes"><i id="stE"></i></div><div class="govde"><img id="imE" alt="" src="' + G.img(FT.opp) + '"><em id="dmE"></em></div></div></div>' +
      '<div class="dov-kayit cam kay" id="dovLog"></div><div class="dov-eylem" id="dovAct"></div>';
    app.appendChild(w); FT.view = { p: { hp: F.p.hp, sta: F.p.sta }, e: { hp: F.e.hp, sta: F.e.sta } }; for (const l of FT.log) logLine(l); paint(); }
  function logLine(l) { const box = document.getElementById('dovLog'), p = el('p', l.c || '', l.t); box.appendChild(p); while (box.children.length > 40) box.firstChild.remove(); box.scrollTop = box.scrollHeight; }
  function bars() { const F = FT.F, v = FT.view, set = (id, k) => { document.getElementById(id).style.width = Math.max(0, Math.min(100, k * 100)) + '%'; };
    set('hpP', v.p.hp / F.p.maxHp); set('hpE', v.e.hp / F.e.maxHp); set('stP', v.p.sta / 100); set('stE', v.e.sta / 100);
    document.getElementById('hpPt').textContent = Math.max(0, v.p.hp) + ' / ' + F.p.maxHp; document.getElementById('hpEt').textContent = Math.max(0, v.e.hp) + ' / ' + F.e.maxHp;
    document.getElementById('hpP').classList.toggle('az', v.p.hp / F.p.maxHp < 0.3); document.getElementById('hpE').classList.toggle('az', v.e.hp / F.e.maxHp < 0.3);
    document.getElementById('dovTur').textContent = 'Tur ' + Math.max(1, F.round + (F.over ? 0 : 1)) + ' / 30'; }
  function paint() { bars(); const box = document.getElementById('dovAct'), p = FT.F.p; if (FT.F.over) { box.innerHTML = ''; return; }
    const IK = { pence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"><path d="M6 3c1.600 6 2 11 0 18M12 2c1.600 7 2 13 0 20M18 3c1.600 6 2 11 0 18"/></svg>', nefes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.500 2c1 4-3.500 6-3.500 10 0 1.500.8 2.600 1.800 3-.2-2 .9-3.200 2-4.200.3 2.500 3.200 3.400 3.200 6.400 0 2.700-2 4.800-4.800 4.800C7.600 22 5 19.400 5 15.600 5 9.800 11 8 12.500 2z"/></svg>', kukre: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M4 9v6M9 5v14M14 8v8M19 3v18"/></svg>', savun: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5z"/></svg>', teslim: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 2h2v20H5zM8 3h11l-3 4 3 4H8z"/></svg>' };
    const B = (x, t, sub, cls) => { const card = x.startsWith('card:') ? x.slice(5) : null; return '<button type="button" class="beceri ' + (cls || '') + '" data-x="' + x + '" ' + (can(x) && !FT.busy ? '' : 'disabled') + ' title="' + (card && CARDS[card].d ? CARDS[card].d : '') + '"><i>' + (card ? '<img alt="" src="' + G.OLD + 'img/ui/card-' + card + '.webp">' : IK[x] || '') + '</i><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>'; };
    box.innerHTML = B('pence', 'Pençe', '', 'altin') + B('nefes', EL_AD[p.el] + ' nefesi', NEFES_COST + ' nefes', 'kor') + B('kukre', 'Kükre', '15 nefes', '') + B('savun', 'Savun', 'nefes toplar', 'cini') +
      p.cards.filter(k => !(p.used || []).includes(k)).map(k => B('card:' + k, CARDS[k].ad, 'kart', 'kart')).join('') + '<span class="ara"></span>' + '<button type="button" class="beceri kucuk' + (FT.auto ? ' secili' : '') + '" data-auto="1"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4l9 8-9 8zM13 4l9 8-9 8z"/></svg></i><b>Otomatik</b></button>' + B('teslim', 'Teslim ol', '', 'kucuk');
    on(box, '[data-x]', b => act(b.dataset.x)); on(box, '[data-auto]', () => { FT.auto = !FT.auto; paint(); if (FT.auto && !FT.busy) act(pickAuto()); }); }
  async function play(ev) { const t = evText(ev); logLine(t); if (ev.after) FT.view = ev.after; const tgt = ev.who === 'p' ? 'E' : 'P', im = document.getElementById('im' + tgt), me = document.getElementById('im' + (ev.who === 'p' ? 'P' : 'E'));
    const fx = G.fx, who = ev.who === 'p' ? FT.d : FT.opp, elc = G.ELC[(ev.who === 'p' ? FT.F.p : FT.F.e).el], pz = ev.act === 'kukre' ? 'P7' : ev.act === 'savun' ? 'P6' : ev.act === 'nefes' || (ev.act || '').startsWith('card') ? 'P12' : ev.act === 'pence' ? 'P8' : null;
    if (pz && who && who.stage === 'yetiskin' && typeof hasPose === 'function' && hasPose(who, pz) && !window.__fastFx) { const base = me.dataset.base || (me.dataset.base = me.getAttribute('src')); me.src = G.poz(who, pz); clearTimeout(me._pz); me._pz = setTimeout(() => { me.src = base; }, 720); }
    if (ev.act !== 'savun' && ev.act !== 'stun' && ev.act !== 'teslim') { me.classList.remove('hamle'); void me.offsetWidth; me.classList.add('hamle'); }
    if (fx && ev.act === 'kukre') { fx.shake(document.getElementById('dov')); fx.stars(me, 8, '#fff3c4'); } if (fx && ev.act === 'savun') fx.stars(me, 8, '#a6e0ff');
    if (fx && (ev.act === 'nefes' || (ev.act || '').startsWith('card')) && !ev.miss) { const a = me.getBoundingClientRect(), b = im.getBoundingClientRect(), A = app.getBoundingClientRect(); for (let i = 1; i <= 5; i++) setTimeout(() => fx.burst([a.left - A.left + a.width / 2 + (b.left + b.width / 2 - a.left - a.width / 2) * i / 6, a.top - A.top + a.height * 0.42], elc, 5), i * 28); }
    if (ev.dmg && !ev.miss && !ev.blocked) { await wait(170); const d = document.getElementById('dm' + tgt); d.textContent = '-' + ev.dmg; d.className = ev.crit ? 'kritik' : ''; void d.offsetWidth; d.classList.add('uc'); im.classList.remove('vuruldu'); void im.offsetWidth; im.classList.add('vuruldu'); if (fx) { fx.burst(im, ev.act === 'pence' ? '#fff' : elc, ev.crit ? 26 : 12); if (ev.crit) { fx.shake(document.getElementById('dov'), true); fx.flash('rgba(255,255,255,.28)'); } } if (EO2.audio) (ev.crit ? EO2.audio.boom || EO2.audio.pop : EO2.audio.hit || EO2.audio.pop)(); }
    else if (EO2.audio) EO2.audio.pop();
    bars(); await wait(FT.auto ? 300 : 620); }
  async function act(x) { if (!FT || FT.busy || FT.F.over || !can(x)) return; FT.busy = true; paint(); const evs = fightRound(FT.F, x); for (const ev of evs) await play(ev); FT.busy = false;
    if (FT.F.over) return finish(); paint(); if (FT.auto) act(pickAuto()); }
  function closeFight() { const w = document.getElementById('dov'); if (w) w.remove(); FT = null; }
  async function died(d, why, where) { killDragon(d, why); afterAction(true); await G.pen({ k: where, t: esc(d.name) + ' aramızdan ayrıldı', face: G.img(d), body: '<p>' + esc(d.name) + ' ' + why + '. Ocak bu gece sessiz.</p>', btns: [{ t: 'Uğurla', cls: 'altin' }] }); }
  async function ending() { closeFight(); return G.son(); }
  /* Gök Kulesi (js/endgame.js): kat kurulumu, ödül, lütuf ve sıfırlama kuralları oyunun kendisidir; dövüş 2.0 sahnesinde oynanır */
  G.kuleBasla = d => { if (!d || d.dead || d.stage === 'yavru') return; window.fightModal = () => {}; startKuleFloor(d); FT.auto = false; FT.busy = false; G.close(); fightUI(); };
  async function kuleSonra(d, kat, won) { const T = ensureTowerState(); if (!won || d.dead) return G.open('kule');
    const sec = shuffle([...TOWER_BOONS]).slice(0, 3), i = await G.vn({ bg: 'a:kule', k: kat + '. kat tamamlandı · sıradaki: kat ' + T.curFloor, name: 'Kadim Kule Sunağı', face: G.img(d), dragon: true,
      text: esc(d.name) + ' kulenin ' + kat + '. katını aştı. Mermer sunaktaki üç kadim mühürden birini seçip ' + T.curFloor + '. kata tırmanabilir ya da dinlenmek için ocağa dönebilirsin.',
      btns: [...sec.map((b, j) => ({ t: b.ad + ': ' + b.d, v: j })), { t: 'Ganimetle kuleden ayrıl', v: -1 }] });
    if (i >= 0 && sec[i]) { if (!T.boons.includes(sec[i].k)) T.boons.push(sec[i].k); saveGame(); return G.kuleBasla(d); } G.open('kule'); }
  async function finish() { const { F, d, opp } = FT, won = F.winner === 'p'; let lines = [], dead = false, tourOver = false;
    if (FT.mode === 'kule') { finishKuleFight(); lines = (FT.result || []).map(x => x.replace(/class="good"/g, 'class="iyi"').replace(/class="bad"/g, 'class="kotu"')); }
    else if (FT.mode === 'tour') { const T = S.tour; d.fat = clamp(d.fat + 12, 0, 100);
      if (won) { const g = T.odul[T.round], u = T.un[T.round]; S.gold += g; S.un += u; d.w++; S.st.wins++; addBond(d, 3); nudge(d, 'ces', 3); d.tourW = d.tourW || {}; d.tourW[T.id] = Math.max(d.tourW[T.id] || 0, T.round + 1);
        lines.push('<b class="iyi">' + ['İlk turu', 'Yarı finali', 'Finali'][T.round] + ' kazandın!</b> +' + g + ' altın, +' + u + ' ün.');
        if (typeof awardChibiStones === 'function') { const rs = awardChibiStones({ stones: { kor_t2: ri(1, 2) } }); if (rs.length) lines.push('Turnuva Turu Ödülü: <b>' + rs.join(', ') + '</b>.'); }
        T.hp = F.p.hp; T.round++; if (F.p.saves) d.saved = (d.saved || 0) + F.p.saves; if (T.round === 3 && T.id === 'kupa' && typeof rivalBeaten === 'function') rivalBeaten('demirhan', 6);
        if (T.round >= 3) { d.champ = T.id; if (T.id === 'tac') { S.flags = S.flags || {}; S.flags.champ = true; S.flags.kizilTac = true; S.st.kupa = (S.st.kupa || 0) + 1; }
          if (typeof awardChibiStones === 'function') { const got = awardChibiStones({ stones: T.id === 'tac' ? { anka_koruma: 1, kor_t3: 2 } : { anka_koruma: 1, kor_t2: 2 } }); if (got.length) lines.push('<b class="iyi">Şampiyonluk Hazinesi:</b> ' + got.join(', ') + '!'); }
          if (typeof titleCheck === 'function') titleCheck(d); snapAlbum('tour', T.ad, d.name + ' ' + ek(T.ad, 'acc') + ' kazandı!', d); T.done = true; T.won = true; tourOver = true; T.summary = d.name + ' şampiyon oldu!'; chron(d.name + ' ' + ek(T.ad, 'acc') + ' kazandı!'); lines.push('<b>' + T.ad + ' senin!</b>'); } }
      else { d.l++; S.st.losses++; T.done = true; T.won = false; tourOver = true; const where = ['ilk turda', 'yarı finalde', 'finalde'][T.round]; T.summary = d.name + ' ' + where + ' elendi.'; chron(d.name + ' ' + ek(T.ad, 'loc') + ' ' + where + ' elendi.');
        lines.push(F.surrender ? 'Teslim oldun ve turnuvadan çekildin.' : '<span class="kotu">' + where[0].toUpperCase() + where.slice(1) + ' elendin.</span>');
        if (!F.surrender) { if (chance(hasMark(d, 'Temkinli') ? 25 : 50)) d.inj = ri(1, 2); const r = rollDeath(d, 10); if (r.anka) lines.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümden döndü.'); else if (r.died) { dead = true; lines.push('<b class="kotu">' + esc(d.name) + ' ayağa kalkmadı.</b>'); } }
        addMood(d, -1, true); } }
    else { const out = fightOutcome(d, F, FT.tier, opp); lines = out.lines;
      if (!out.won && !F.surrender && FT.lethal) { const r = rollDeath(d, TIERS[FT.tier].olum); if (r.anka) lines.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümün eşiğinden döndü. Tılsım yandı.'); else if (r.died) { dead = true; lines.push('<b class="kotu">' + esc(d.name) + ' ayağa kalkmadı.</b>'); } else lines.push('Ölüm zarı (%' + r.risk + ') tuttu; ' + esc(d.name) + ' yaralı ama hayatta.'); }
      if (out.won && FT.bet) { S.gold += FT.bet; lines.push('Bahis kâğıdı kazandı: <b class="iyi">+' + FT.bet + ' altın</b>.'); }
      S.arena[FT.tier].splice(FT.idx, 1); d.task = { t: 'done', what: (out.won ? 'Kazandığı' : 'Kaybettiği') + ' bir dövüşe çıktı' }; }
    const mode = FT.mode, tier = FT.tier, kat = FT.floor; paint(); if (EO2.audio) (won ? EO2.audio.win || EO2.audio.chime : EO2.audio.pop)();
    await wait(500); await G.pen({ k: FT.title, t: won ? 'Zafer' : F.surrender ? 'Teslim' : 'Yenilgi', face: G.img(d), body: '<div class="rap">' + lines.map(l => '<div class="genel"><span>' + l + '</span></div>').join('') + '</div>', btns: [{ t: 'Devam', cls: 'altin' }] });
    closeFight();
    if (mode === 'kule') { afterAction(true); return kuleSonra(d, kat, won); }
    if (dead) { await died(d, mode === 'tour' ? 'turnuvada öldü' : tier === 'cukur' ? 'Yeraltı Çukuru\'nda öldü' : 'arenada öldü', mode === 'tour' ? 'Turnuva' : 'Arena'); if (mode === 'tour' && S.tour.id === 'tac') { S.over = true; S.ending = 'tac-kayip'; return ending(); } afterAction(); return; }
    if (mode === 'tour' && !tourOver) { afterAction(true); return tourRound(); }
    if (mode === 'tour' && S.tour.id === 'tac') { S.over = true; S.ending = S.tour.won ? 'taj' : 'tac-kayip'; afterAction(true); return ending(); }
    /* arena hikâyeleri (js/arenastory.js) dövüş sonrası sahnelerden önce gelir; eski finishFight ile aynı sıra */
    const asr = mode !== 'tour' && typeof arenaStoryNext === 'function' ? arenaStoryNext(d, tier, opp, won) : null;
    if (asr && typeof ASTORY !== 'undefined' && ASTORY[asr[0]]) await G.olay(Object.assign({ id: asr[0], astory: 1 }, ASTORY[asr[0]], { ctx: asr[1] }));
    else if (mode !== 'tour' && typeof pickFightPost === 'function' && chance(45) && S.dragons.includes(d)) { const pp = pickFightPost(d, opp, won); if (pp) await postScene(pp); }
    afterAction(); }
  /* maç öncesi ve sonrası sahneler: oyunun kendi olayları (js/fightev.js). Öncesinde verilen destek dövüşçüye işlenir, bahis kazanılırsa ödenir. */
  async function preScene(pe, d, o) { const c = pe.c, face = G.img(o), i = await G.vn({ bg: 'bg-arena', k: 'Dövüşten önce', name: pe.ev.title, face: G.img(d), dragon: true, face2: face, text: pe.ev.text(c), btns: pe.ev.opts.map((x, i) => ({ t: typeof x.t === 'function' ? x.t(c) : x.t, v: i })) });
    const res = pe.ev.opts[i].fx(c); afterAction(true); await G.vn({ bg: 'bg-arena', k: 'Dövüşten önce', name: pe.ev.title, face: G.img(d), dragon: true, face2: face, text: res.r, btns: [{ t: 'Arenaya çık', cls: 'altin' }] }); return { buff: res.b, bet: res.bet || 0, buffText: pe.ev.title + ': ' + res.r }; }
  async function postScene(pp) { const c = pp.c, face = G.img(c.d), i = await G.vn({ bg: 'bg-arena', k: c.won ? 'Zaferin ardından' : 'Dövüşten sonra', name: pp.ev.title, face, dragon: true, text: pp.ev.text(c), btns: pp.ev.opts.map((x, i) => { const why = x.req ? x.req(c) : null; return { t: typeof x.t === 'function' ? x.t(c) : x.t, sub: why || '', off: why || null, v: i }; }) });
    const r = pp.ev.opts[i].fx(c); afterAction(true); if (r) await G.vn({ bg: 'bg-arena', k: c.won ? 'Zaferin ardından' : 'Dövüşten sonra', name: pp.ev.title, face, dragon: true, text: r }); }
  function start(d, opp, ctx) { const F = newFight(fighterFromDragon(d), fighterFromOpp(opp)); if (ctx.buff && typeof applyBuff === 'function') applyBuff(F.p, ctx.buff); FT = Object.assign({ F, d, opp, log: [], auto: false, busy: false }, ctx); if (ctx.buffText) FT.log.push({ t: ctx.buffText, c: 'soluk' });
    if (typeof scoutBuff === 'function') { const sb = scoutBuff(d, F.p); if (sb) FT.log.push({ t: sb, c: 'soluk' }); } return F; }
  function tourRound() { const T = S.tour, d = byId(T.dragon), opp = genOpp(null, T.rounds[T.round], T.gear);
    if (T.id === 'tac' && T.round === 2) { const rv = rivals()[0], L = Math.round((T.rounds[2] + rv.power) / 2); Object.assign(opp, genOpp(null, L, T.gear), { id: opp.id });
      Object.assign(opp, { name: (rv.champ && rv.champ.name) || 'Karabela', trainer: 'Demirhan', el: 'golge', eye: 'A', horn: 't', pat: 'd', arch: 'Saf kanlı şampiyon', traits: ['demir'] });
      if (S.flags.demHelped) Object.assign(opp, { traits: [], arch: 'Saf kanlı şampiyon · borcunu ödüyor' }); if (S.flags.demRefused) { for (const k of STATS) opp.st[k] = Math.round(opp.st[k] * 0.92); opp.arch = 'Saf kanlı şampiyon · yarası tam kapanmadı'; } }
    if (T.id === 'kupa' && T.round === 2) Object.assign(opp, { trainer: 'Demirhan', name: 'Kuzgun' });
    const F = start(d, opp, { mode: 'tour', lethal: true, risk: deathRisk(d, 10), title: T.ad + ' · ' + ['İlk tur', 'Yarı final', 'Final'][T.round] + ' · ' + opp.trainer });
    if (T.hp != null) { F.p.hp = Math.round(T.hp + (F.p.maxHp - T.hp) * 0.5); if (T.round > 0) FT.log.push({ t: 'Turlar arası yaraların yarısı sarıldı. ' + esc(d.name) + ' ' + F.p.hp + '/' + F.p.maxHp + ' canla çıkıyor.', c: 'soluk' }); }
    fightUI(); }
  function startTour(d) { const T = S.tour; d.tourW = d.tourW || {}; if (d.tourW[T.id] == null) d.tourW[T.id] = 0; if (typeof careerCheck === 'function') careerCheck(false); T.dragon = d.id; T.round = 0; T.hp = null; d.task = { t: 'done', what: ek(T.ad, 'loc') + ' dövüştü' }; tourRound(); }
  EO2.arena = { fight: () => FT, act };

  /* ---------- arena ekranı ---------- */
  /* Arena: eşleşme sahnesi. Dövüşçün solda, seçili rakip sağda karşı karşıya durur; değerler ortada kıyaslanır, rakipler alttaki madalyonlardan seçilir. */
  G.screen('arena', { k: 'Dövüş ve turnuva', t: 'Arena', cls: 'ar2', bg: 'bg-arena', enter() { if (!TIERS[UI.arenaTier]) UI.arenaTier = 'koy'; UI.arenaOpp = 0; }, draw(body) {
    const elig = S.dragons.filter(d => canAct(d)); if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null; if (!UI.arenaSel && elig.length) UI.arenaSel = (elig.find(d => d.stage === 'yetiskin') || elig[0]).id;
    const f = byId(UI.arenaSel), tk = UI.arenaTier, T = TIERS[tk]; let lock = '';
    if (T.flag && !S.flags[T.flag]) lock = 'Bu kapının yerini henüz bilmiyorsun.'; else if (T.unReq && S.un < T.unReq) lock = 'Mermer kapıdaki bekçi seni içeri almıyor: ' + T.unReq + ' ün gerekiyor (sende ' + S.un + ').';
    const okStage = f && T.stages.includes(f.stage) && !f.old, opps = lock ? [] : (S.arena[tk] || []); if (!(UI.arenaOpp >= 0 && UI.arenaOpp < opps.length)) UI.arenaOpp = 0; const oi = UI.arenaOpp, o = opps[oi];
    const zor = x => { const adv = f ? elMult(f.el, x.el) : 1, dadv = f ? elMult(x.el, f.el) : 1, p = pw(x), mine = f ? pw(f) : 0, ratio = mine ? (p * dadv) / (mine * adv) : 9; return { adv, dadv, p, mine, st: ratio < 0.82 ? ['kolay', 'Kolay lokma'] : ratio < 1.06 ? ['denk', 'Denk dövüş'] : ratio < 1.3 ? ['zor', 'Zorlu'] : ['olum', 'Çok güçlü'] }; };
    const Z = o ? zor(o) : null, risk = f && T.olum ? deathRisk(f, T.olum) : 0;
    const kiyas = o && f ? '<div class="kiyas">' + STATS.map(k => { const a = f.st[k], b = o.st[k], m = Math.max(a, b, 1); return '<div><b class="' + (a >= b ? 'ust' : '') + '">' + a + '</b><span class="cb sol"><i style="width:' + (a / m * 100) + '%"></i></span><em>' + ST_KISA[k] + '</em><span class="cb sag"><i style="width:' + (b / m * 100) + '%"></i></span><b class="' + (b > a ? 'ust' : '') + '">' + b + '</b></div>'; }).join('') + '</div>' : '';
    let tour = ''; if (S.tour) { const Tt = S.tour, okUn = S.un >= Tt.unReq, cand = f && canAct(f) && f.stage === 'yetiskin' && !f.old;
      tour = '<div class="turnuva2' + (Tt.done ? ' bitti' : '') + '"><span class="ust">Turnuva</span><b>' + Tt.ad + '</b><p>' + (Tt.done ? (Tt.summary || '') : 'Üç tur, tek ejderha. Turlar arasında yaraların yarısı sarılır. Yenilgide ölüm riski %10. Şampiyona ' + Tt.odul[2] + ' altın.' + (okUn ? '' : ' <span class="kotu">Katılmak için ' + Tt.unReq + ' ün gerekiyor (sende ' + S.un + ').</span>')) + '</p>' + (Tt.done ? '' : '<button type="button" class="gbtn altin" data-tour="1" ' + (okUn && cand ? '' : 'disabled') + '>' + (cand ? esc(f.name) + ' ile katıl' : 'Yetişkin bir dövüşçü seç') + '</button>') + '</div>'; }
    body.innerHTML = '<div class="ar-sekme"><div class="sekme" role="tablist">' + Object.keys(TIERS).map(k => '<button type="button" role="tab" data-tier="' + k + '" aria-selected="' + (k === tk) + '">' + (TIERS[k].flag && !S.flags[TIERS[k].flag] ? '???' : TIERS[k].ad) + '</button>').join('') + '</div></div>' + tour +
      '<div class="ar-ben" style="--el:' + (f ? G.ELC[f.el] : '#888') + '">' + (f ? '<img class="ar-ej" alt="" src="' + G.img(f) + '"><div class="ar-ad"><span class="ust">' + STAGE_AD[f.stage] + ' · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>Güç ' + pw(f) + ' · ' + f.w + ' G ' + f.l + ' M</small></div>' : '<p class="ah-not">Boşta dövüşçü yok: ejderlerin görevde ya da sakat.</p>') + '</div>' +
      (elig.length > 1 ? '<div class="ar-kadro">' + elig.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      (lock ? '<div class="ar-kilit"><i></i><p>' + lock + '</p></div>' : !o ? '<div class="ar-kilit bos"><p>Bu hafta başka rakip kalmadı. Haftaya yeni ilanlar asılır.</p></div>' :
        '<div class="ar-rakip" style="--el:' + G.ELC[o.el] + '"><img class="ar-ej" alt="" src="' + G.img(o) + '"><div class="ar-ad"><span class="ust">' + esc(o.trainer) + ' · ' + o.arch + '</span><h2>' + esc(o.name) + '</h2><small><span class="etk el-' + o.el + '">' + EL_AD[o.el] + '</span>' + (Z.adv > 1 ? '<span class="etk iyi">üstünsün</span>' : Z.dadv > 1 ? '<span class="etk kotu">dezavantaj</span>' : '') + '</small></div></div>' +
        '<div class="ar-orta"><i class="vs2">VS</i>' + (f && okStage ? '<span class="damga2 ' + Z.st[0] + '">' + Z.st[1] + '</span>' : '') + kiyas + '</div>' +
        '<div class="ar-alt"><div class="ar-odul"><b class="au">' + o.odul + ' altın</b><span>+' + T.un + ' ün</span>' + (T.olum ? '<span class="kotu">ölüm riski %' + risk + '</span>' : '') + '</div>' +
          '<button type="button" class="gbtn buyuk ' + (T.olum ? 'kor' : 'altin') + '" data-fight="' + oi + '" ' + (!f || !okStage ? 'disabled' : '') + '>' + (!f ? 'Boşta dövüşçü yok' : okStage ? 'Meydan oku' : f.old ? 'Emekli, dövüşmüyor' : STAGE_AD[f.stage] + ' giremez') + '</button>' +
          '<div class="kadro">' + opps.map((x, i) => { const z = zor(x); return '<button type="button" class="madalyon ejm zr-' + z.st[0] + '" data-opp="' + i + '" aria-pressed="' + (i === oi) + '" title="' + esc(x.name) + '"><img alt="" src="' + G.img(x) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(x.name) + '</span></button>'; }).join('') + '</div></div>');
    on(body, '[data-tier]', b => { UI.arenaTier = b.dataset.tier; UI.arenaOpp = 0; render(); }); on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); }); on(body, '[data-opp]', b => { UI.arenaOpp = +b.dataset.opp; render(); });
    on(body, '[data-tour]', () => { if (f) startTour(f); });
    on(body, '[data-fight]', async b => { const i = +b.dataset.fight, o = S.arena[tk][i]; if (!o || !f) return; if (T.olum) { const ok = await G.pen({ k: T.ad, t: 'Ölüm riski var', body: '<p>Bu dövüşte yenilirsen ' + esc(f.name) + ' için ölüm riski <b class="kotu">%' + deathRisk(f, T.olum) + '</b>.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yine de çık', cls: 'kor', v: true }] }); if (!ok) return; }
      const ctx = { tier: tk, idx: i, lethal: !!T.olum, risk: deathRisk(f, T.olum), title: T.ad + ' · ' + o.trainer }, pe = !window.__noPre && typeof pickFightPre === 'function' && chance(55) ? pickFightPre(f, o, tk) : null; if (pe) Object.assign(ctx, await preScene(pe, f, o));
      UI.arenaOpp = 0; start(f, o, ctx); fightUI(); });
  } });
})();
