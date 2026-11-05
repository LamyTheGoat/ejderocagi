'use strict';
/* ============ EJDER OCAĞI — GÖK YARIŞI ve UÇUŞ ============
   Basılı tut: yüksel. Bırak: süzül. Altın halkalar hız ve HIRS verir; bulut ve kayalar yavaşlatır.
   Öndeki rakibin hizasına girersen RÜZGÂR KUYRUĞUNA girersin: hız ve hırs kazanırsın.
   Hırs yarıyı geçince ATIL: kısa ve sert bir hamle. Son düzlükte herkes son kozunu oynar.
   Rakiplerin huyu vardır (öncü, son düzlükçü, yol kesen, istikrarlı). Seni kıl payı yenen ezeli rakibin olur.
   Kıyasıya anlarda çizgi roman kareleri araya girer: viraj, göz ucu, başa baş, foto finiş.
   Çeviklik hız, dayanıklılık çarpışma cezası, zekâ halka hızı demek. "Otomatik uç" mini oyunu atlar. */

const RACE_VENUES = {
  kul: { ad: 'Kül Vadisi Turu', bg: 'bg-kul', sky: ['#3a1c2c', '#c8643a'] },
  kayalik: { ad: 'Fırtına Kayalıkları Yarışı', bg: 'bg-kayalik', sky: ['#1c1c3a', '#6a5ab0'] },
  buzul: { ad: 'Buzul Geçidi', bg: 'bg-buzul', sky: ['#14284a', '#8ac8e8'] },
  orman: { ad: 'Kök Ormanı Koşusu', bg: 'bg-orman', sky: ['#14281c', '#a8b860'] },
};
const RACE_NAMES = ['Rüzgârkıran', 'Bulutdelen', 'Tüyhafif', 'Kanatçı', 'Ok', 'Serçe', 'Yıldırım Ayaz', 'Martı', 'Fırtınakuş', 'Süzülen', 'Karayel', 'Poyraz', 'Şahin', 'Doğan'];
// Rakip huyları: p = pistin ne kadarı geçildi (0–1) → hız çarpanı
const RACE_STYLE = {
  oncu: { ad: 'Öncü', d: 'Erken kaçar, sonda yorulur.', prof: p => p < .45 ? 1.075 : p < .75 ? 1 : .94 },
  sabirli: { ad: 'Son düzlükçü', d: 'Geride bekler, son düzlükte patlar.', prof: p => p < .6 ? .955 : p < .8 ? 1 : 1.11 },
  kurnaz: { ad: 'Yol kesen', d: 'Arkasına girersen önünü keser. Yükseklik değiştirip geç.', prof: () => 1 },
  istikrarli: { ad: 'İstikrarlı', d: 'Hep aynı tempoda uçar.', prof: () => 1.01 },
};
const RACE_TAUNT = {
  pass: ['Arkamda kal!', 'Kanatlarımı izle!', 'Tozumu yut!', 'Hoşça kal!'],
  passed: ['Daha bitmedi!', 'Şanslıydın!', 'Göreceğiz!', 'Hıh!'],
  block: ['Geçemezsin!', 'Yol kapalı!', 'Nereye?'],
  final: ['Şimdi göreceksin!', 'Son sözü ben söylerim!', 'Hadi bakalım!'],
  nemStart: { lead: ['Yine mi sen?', 'Bu sefer geçemezsin.', 'Rövanş zamanı!'], trail: ['Geçen sefer şanslıydın.', 'Bu sefer kıl payı bile olmayacak.', 'Yine karşılaştık.'], friend: ['İyi uçuşlar dostum!', 'Bu sefer de kemerde görüşelim!', 'Kanatların sağlam olsun!'] },
};
function raceLevel(k) { return (k === 0 ? 30 + S.week * 2.2 : 46 + S.week * 3) + (typeof seasonBonus === 'function' ? seasonBonus() * .75 : 0); }
function genRaces() {
  const vs = shuffle(Object.keys(RACE_VENUES)).slice(0, 2), N = S.nemesis;
  const nemIn = N ? (chance(70) ? 1 : chance(40) ? 0 : -1) : -1;
  S.races = { w: S.week, list: vs.map((v, k) => {
    const L = raceLevel(k), names = shuffle(RACE_NAMES.filter(n => !N || n !== N.name));
    const rivals = Array.from({ length: 3 }, (_, i) => { const el = rEl(); return { name: names[i], trainer: pick(TRAINERS), el, style: pick(Object.keys(RACE_STYLE)), gx: randLook(), hue: ri(-9, 9), ce: Math.round(L * rnd(.85, 1.15)), da: Math.round(L * rnd(.8, 1.1)) }; });
    if (nemIn === k) rivals[2] = { name: N.name, trainer: N.trainer, el: N.el, style: N.style, gx: N.gx, hue: N.hue, nem: true, ce: Math.round(L * rnd(1.02, 1.12)), da: Math.round(L * rnd(.95, 1.08)) };
    else if (typeof ensureHub === 'function' && S.hub && S.hub.peers && S.hub.peers[k]) { const hp = S.hub.peers[k]; rivals[0] = { name: hp.d.name, trainer: hp.handle, el: hp.d.el, style: 'oncu', gx: hp.d.genes, hue: hp.d.hue || 0, ce: Math.round(L * 1.03), da: Math.round(L * 1.0) }; }
    return { id: 'r' + S.week + k, venue: v, ad: RACE_VENUES[v].ad, fee: k ? 40 : 15, odul: k ? [220, 110, 50] : [90, 45, 20], un: k ? 3 : 1, len: k ? 42 : 34, rivals };
  }), practiced: false };
  if (S.nemesis && S.rs && S.rs.duel === 'pending') S.races.list[1] = duelRace(); // Gök Kemeri Düellosu
}
function races() { if (!S.races || S.races.w !== S.week) genRaces(); return S.races; }
const raceSpeed = (ce, da) => 1 + ce / 210 + da / 900;
const canRace = f => !!f && f.stage === 'yetiskin' && canAct(f) && !f.old;
const nemScore = () => S.nemesis ? `Sen <b>${S.nemesis.l}</b> – <b>${S.nemesis.w}</b> ${esc(S.nemesis.name)}` : '';

function raceBoard(f) {
  const R = races(), ok = canRace(f);
  const cards = R.list.map((r, i) => {
    const V = RACE_VENUES[r.venue], my = f ? raceSpeed(f.st.ce, f.st.da) : 0, top = Math.max(...r.rivals.map(x => raceSpeed(x.ce, x.da)));
    const ratio = my ? top / my : 9, [stc, stt] = ratio < .92 ? ['easy', 'Rüzgâr arkanda'] : ratio < 1.04 ? ['even', 'Kıyasıya'] : ['hard', 'Zorlu pist'];
    const nem = r.rivals.find(x => x.nem);
    return `<div class="poster rposter" style="--rot:${i ? 1.5 : -1.5}deg"><i class="nail"></i>${f && ok ? `<span class="stamp ${stc}">${stt}</span>` : ''}
      <div class="ph">GÖK YARIŞI</div><div class="rimg" style="background-image:url(${asset(V.bg) || ''})"></div>
      <b class="pname">${r.ad}</b><small>${r.len} saniyelik pist · 4 ejderha</small>
      ${nem ? `<div class="rnem">Ezeli rakibin burada: <b>${esc(nem.name)}</b> <span>${nemScore()}</span></div>` : ''}
      <div class="rriv">${r.rivals.map(x => `<span title="${esc(x.trainer)} · ${RACE_STYLE[x.style || 'istikrarli'].d}" class="${x.nem ? 'nem' : ''}">${elChip(x.el)}<b>${esc(x.name)}</b> <small>Çev ${x.ce} · ${RACE_STYLE[x.style || 'istikrarli'].ad}</small></span>`).join('')}</div>
      <div class="pfoot">Giriş ${goldTxt(r.fee)} · birinciye ${goldTxt(r.odul[0])} <span class="mute sm">+${r.un} ün</span></div>
      <button class="btn primary sm wide" data-a="race" data-i="${i}" ${ok && S.gold >= r.fee ? '' : 'disabled'}>${!f ? 'Boşta ejderha yok' : f.stage !== 'yetiskin' ? 'Yalnız yetişkinler yarışır' : S.gold < r.fee ? 'Giriş ücreti yetmiyor' : 'Yarışa gir'}</button></div>`;
  }).join('') || '<div class="poster locked"><p>Bu haftanın yarışları bitti.</p></div>';
  const prac = `<div class="poster rposter prac" style="--rot:-.5deg"><i class="nail"></i><div class="ph">ANTRENMAN UÇUŞU</div>
    <p class="sm">Ödül yok, baskı yok. Haftada bir kez: bağ +2, çeviklik +1.</p>${S.nemesis ? `<p class="rnem sm">Ezeli rakip: <b>${esc(S.nemesis.name)}</b> · ${nemScore()}</p>` : ''}
    <button class="btn sm wide" data-a="flypractice" ${ok && !R.practiced ? '' : 'disabled'}>${R.practiced ? 'Bu hafta uçtun' : 'Uç'}</button></div>`;
  return cards + prac;
}

/* ---------- Uçuş ve Fizik Motoru (Physics-Tuned) ---------- */
let RC = null;
const RACE_RV = 1.085; // rakiplerin taban hız payı: halka, koridor ve atılım avantajını dengeler
const DASH_COST = 50, DASH_T = 1.1, DASH_V = .5, DRAFT_V = .13, SLIP_SURGE_V = .26, SLIP_SURGE_T = 1.25, BLOCK_V = .2;
const RACE_ACCEL = 4.6, RACE_DRAG = 2.7, RACE_GUST_DAMP = 2.85;

function raceStart(d, race, practice) {
  const vk = race ? race.venue : pick(Object.keys(RACE_VENUES)), V = { ...RACE_VENUES[vk], key: vk };
  const len = race ? race.len : 26, sp = raceSpeed(d.st.ce, d.st.da);
  RC = { d, race, practice, V, len, L: len * sp, sp, pos: 0, y: .5, vy: 0, pitch: 0, curV: sp * .86, hold: false,
    boost: 0, boostT: 0, gustPenalty: 0, gustTurb: 0, rings: [], obs: [], got: 0, hits: 0, t: -3, last: 0, done: false,
    hirs: 15, dashT: 0, dashes: 0, draft: null, draftT: 0, draftCharge: 0, slipSurgeT: 0, slipSurge: 0, slipSurges: 0,
    blockT: 0, ts: 1, cut: null, cutSeen: {}, cutCd: 0, hist: [], histT: 0, rank: 0, final: false, comT: 0, myT: null, ev: [],
    riv: race ? race.rivals.map((x, i) => {
      const rs = raceSpeed(x.ce, x.da) * rnd(.975, 1.025) * RACE_RV;
      return { ...x, i, style: x.style || 'istikrarli', dz: poseDragon(x, 'rv' + i), s: rs, curV: rs * .86,
        pos: [.12, -.08, -.55][i] + rnd(-.05, .05), y: [.17, .83, .5][i], vy: 0, ty: .5, ph: rnd(0, 6),
        bT: 0, bA: 0, gustP: 0, draftCharge: 0, slipSurgeT: 0, nextB: rnd(1.5, 3.5), nextO: rnd(6, 12),
        dashed: false, fin: null, sayCd: 0, seenDraft: false };
    }) : [] };
  const Rn = seeded(Math.floor(Math.random() * 1e6));
  for (let x = 2.2; x < RC.L - 1; x += .9 + Rn() * .7) RC.rings.push({ x, y: .2 + Rn() * .6, hit: false });
  for (let x = 3.4; x < RC.L - 1.5; x += 1.3 + Rn() * 1.1) RC.obs.push({ x, y: .15 + Rn() * .7, k: Rn() < .55 ? 'bulut' : 'kaya', hit: false });
  showModal(raceHtml(), 'racewrap'); raceBind();
  if (typeof SFX !== 'undefined' && SFX.preload) SFX.preload();
  if (typeof BGM !== 'undefined' && BGM.sync) BGM.sync();
  if (window.__fastFx) return raceAuto();
  RC.last = performance.now(); requestAnimationFrame(raceTick);
}
function flyArt(d, cls) { return hasPose(d, 'P1') ? poseSVG(d, 'P1', { face: 'r', cls }) : dragonSVG(d, { cls: 'flying ' + (cls || '') }); }
function raceHtml() {
  const { d, V, race } = RC, solo = !RC.riv.length;
  return `<div class="racem ${solo ? 'solo' : ''}" id="racem" style="--s1:${V.sky[0]};--s2:${V.sky[1]}">
    <div class="rsky"></div><div class="rfar" id="rfar" style="background-image:url(${asset(V.bg) || ''})"></div><div class="rcloud c1" id="rc1"></div>
    <div class="rworld" id="rworld"></div><div class="rfin" id="rfin"><i></i><i></i><b></b></div>
    ${RC.riv.map(x => `<div class="rrv ${x.nem ? 'nem' : ''}" id="rrv${x.i}"><span class="rtag" style="--c:${PAL[x.el].glow}">${x.nem ? '<em>Ezeli rakip</em>' : ''}${esc(x.name)}</span>${flyArt(x.dz, 'rvart')}<span class="rsay"></span></div>`).join('')}
    <div class="rdr" id="rdr">${flyArt(d)}<span class="rsay"></span></div>
    <div class="rcloud c2" id="rc2"></div><div class="rspeed" id="rspeed"></div>
    <header class="rhud"><div class="rtitle"><small>${race ? 'Gök yarışı' : 'Antrenman uçuşu'}</small><b>${race ? race.ad : V.ad}</b></div>
      <div class="rtrack" id="rtrack"><i class="rline"></i><i class="rfinal"></i>${RC.riv.map(x => `<span class="rmk riv ${x.nem ? 'nem' : ''}" id="rv${x.i}" style="--c:${PAL[x.el].glow}">${esc(x.name)}</span>`).join('')}<span class="rmk me" id="rme">${esc(d.name)}</span><i class="rflag">${ui('crown')}</i></div>
      ${solo ? '' : `<div class="rrank" id="rrank"><b>${RC.riv.length + 1}</b><small>/${RC.riv.length + 1}</small></div>`}
      <div class="rbtns"><button class="btn sm ghost" data-a="race-auto">Otomatik uç</button></div></header>
    ${solo ? '' : `<div class="rgaps"><span id="rgapA"></span><span id="rgapB"></span></div>`}
    <div class="rhirs" id="rhirs"><b>Hırs</b><span><i id="rhirsf"></i><s></s></span></div>
    <button class="rhold" id="rhold" type="button"><b>KANAT ÇIRP</b><small>Basılı Tut · Yüksel</small></button>
    <button class="rdash" id="rdash" type="button"><b>ATIL</b><small>D · Shift</small></button>
    <div class="rcom" id="rcom"></div>
    <div class="rcount" id="rcount">3</div>
    <p class="rhint" id="rhint">Basılı tut: yüksel · <b>halkalar</b> hırs verir · öndekinin <b>rüzgâr koridoruna gir</b>: hız biriktirip fırla · hırs dolunca <b>ATIL</b></p>
  </div>`;
}
function raceBind() {
  const m = $('#racem'); if (!m) return;
  const rholdBtn = $('#rhold');
  const setHold = v => {
    if (!RC) return;
    if (v) {
      if (typeof SFX !== 'undefined' && SFX.preload) SFX.preload();
      if (typeof BGM !== 'undefined' && BGM.sync) BGM.sync();
    }
    RC.hold = !!v;
    m.classList.toggle('holding', !!v);
    rholdBtn?.classList.toggle('holding', !!v);
  };
  const on = e => {
    if (e.target.closest('button') && !e.target.closest('#rhold')) return;
    setHold(true);
    if (e.cancelable) e.preventDefault();
  };
  const off = () => setHold(false);
  const blockSel = e => { if (e.cancelable) e.preventDefault(); };
  m.addEventListener('pointerdown', on);
  m.addEventListener('touchstart', on, { passive: false });
  m.addEventListener('contextmenu', blockSel);
  m.addEventListener('selectstart', blockSel);
  rholdBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); setHold(true); if (e.cancelable) e.preventDefault(); });
  rholdBtn?.addEventListener('touchstart', e => { e.stopPropagation(); setHold(true); if (e.cancelable) e.preventDefault(); }, { passive: false });
  window.addEventListener('pointerup', off);
  window.addEventListener('pointercancel', off);
  window.addEventListener('touchend', off);
  window.addEventListener('touchcancel', off);
  window.addEventListener('blur', off);
  RC.off = off;
  $('#rdash')?.addEventListener('pointerdown', e => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); raceDash(); });
  $('#rdash')?.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); raceDash(); }, { passive: false });
  RC.key = e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { setHold(e.type === 'keydown'); e.preventDefault(); }
    else if (e.type === 'keydown' && !e.repeat && (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ShiftLeft' || e.code === 'ShiftRight')) { raceDash(); e.preventDefault(); }
  };
  window.addEventListener('keydown', RC.key); window.addEventListener('keyup', RC.key);
}
function raceUnbind() {
  if (!RC) return;
  if (RC.wing) { RC.wing.stop(.4); RC.wing = null; }
  if (RC.key) { window.removeEventListener('keydown', RC.key); window.removeEventListener('keyup', RC.key); RC.key = null; }
  if (RC.off) {
    window.removeEventListener('pointerup', RC.off);
    window.removeEventListener('pointercancel', RC.off);
    window.removeEventListener('touchend', RC.off);
    window.removeEventListener('touchcancel', RC.off);
    window.removeEventListener('blur', RC.off);
    RC.off = null;
  }
}
function raceDash() {
  if (!RC || RC.done || RC.t < 0 || RC.dashT > 0 || RC.hirs < dashCost()) { if (RC && !RC.done && RC.t >= 0 && RC.hirs < dashCost()) $('#rhirs')?.classList.add('no'), setTimeout(() => $('#rhirs')?.classList.remove('no'), 300); return; }
  RC.hirs -= dashCost(); RC.dashT = DASH_T; RC.dashes++;
  RC.gustPenalty *= 0.25; // Atılım rüzgâr sarsıntısını silkeleyip atar
  SFX.play('wing', { vol: .9 }); SFX.play(RC.d.stage === 'yavru' ? 'roarS' : 'roar', { vol: .45 }); raceFx('ATILIM!', 'good');
}

/* --- Fizik tabanlı benzetim adımı (gerçek zamanlı yarışta da otomatik uçuşta da aynı çalışır) --- */
function raceStep(dt, auto) {
  const p = clamp(RC.pos / RC.L, 0, 1.2);
  // Türbülans ve engel sarsıntısı sönümlemesi (damping)
  const damp = Math.exp(-RACE_GUST_DAMP * dt);
  RC.gustPenalty = (RC.gustPenalty || 0) * damp;
  if (RC.gustPenalty < 0.008) RC.gustPenalty = 0;
  RC.gustTurb = (RC.gustTurb || 0) * Math.exp(-4.2 * dt);

  if (!auto) {
    // Dikey kanat ivmesi + aerodinamik sönümleme + tavan/taban yumuşak yastıklaması
    const liftAcc = (RC.hold ? -2.05 : 1.32) + RC.gustTurb;
    const edgeCushion = RC.y < .11 ? (.11 - RC.y) * 5.5 : RC.y > .89 ? -((RC.y - .89) * 5.5) : 0;
    RC.vy = (RC.vy + (liftAcc + edgeCushion) * dt) * Math.exp(-1.15 * dt);
    RC.vy = clamp(RC.vy, -.76, .76);
    RC.y = clamp(RC.y + RC.vy * dt, .06, .94);
    if (RC.y <= .06 || RC.y >= .94) RC.vy *= .28;
  } else {
    // Otomatik uçuşta da koridor ve halkaları takip eden yumuşak dikey süzülüş
    const leadR = RC.riv.find(r => r.pos > RC.pos && r.pos - RC.pos < 1.25);
    const targetY = leadR ? leadR.y : .5 + .22 * Math.sin(RC.t * .7);
    RC.vy = clamp((targetY - RC.y) * 2.4, -.55, .55);
    RC.y = clamp(RC.y + RC.vy * dt, .1, .9);
  }

  RC.boostT = Math.max(0, RC.boostT - dt); if (!RC.boostT) RC.boost = 0;
  RC.dashT = Math.max(0, RC.dashT - dt);
  RC.blockT = Math.max(0, RC.blockT - dt);
  RC.slipSurgeT = Math.max(0, (RC.slipSurgeT || 0) - dt);
  if (!RC.slipSurgeT) RC.slipSurge = 0;

  // Rüzgâr Koridoru (Slipstream / Drafting) & Yol Kesme
  let draft = null;
  for (const r of RC.riv) {
    if (r.fin != null && r.pos > RC.L + 2) continue;
    const g = r.pos - RC.pos, dy = Math.abs(r.y - RC.y);
    if (g > .18 && g < 1.22 && dy < .13 && (!draft || g < draft.pos - RC.pos)) draft = r;
    if (!auto && r.style === 'kurnaz' && g > 0 && g < .32 && dy < .09 && !RC.blockT && RC.dashT <= 0 && RC.slipSurgeT <= 0) {
      RC.blockT = .55;
      RC.gustPenalty = Math.max(RC.gustPenalty, 0.14);
      RC.gustTurb = (RC.y >= r.y ? 0.45 : -0.45);
      raceFx('YOLU KESİLDİ!', 'bad'); SFX.play('miss', { vol: .6 }); raceSay(r, pick(RACE_TAUNT.block));
      raceCom(`${r.name} kanat çırpışıyla hava akımını bozdu! Yüksel ya da alçal.`);
    }
  }

  const prevDraft = RC.draft;
  RC.draft = draft;
  if (draft) {
    RC.draftT += dt;
    RC.draftCharge = Math.min(1, (RC.draftCharge || 0) + dt * 1.15);
    RC.hirs = Math.min(100, RC.hirs + draftHirs() * dt);
    if (!draft.seenDraft) {
      draft.seenDraft = true;
      if (!auto) {
        raceFx('RÜZGÂR KORİDORU', 'good');
        raceCom(`${RC.d.name}, ${ek(draft.name, 'gen')} rüzgâr koridoruna girdi! Hava akımı seni çekiyor.`);
      }
    }
    // Koridorda tam şarj olunca veya sollama mesafesine girince Koridor İvmesi (Slipstream Surge) patlar
    const gNow = draft.pos - RC.pos;
    if (RC.draftCharge >= 0.96 || (RC.draftCharge >= 0.68 && gNow < 0.3)) {
      RC.slipSurgeT = SLIP_SURGE_T;
      RC.slipSurge = SLIP_SURGE_V + (RC.d.st.ce || 30) / 1100;
      RC.draftCharge = 0;
      RC.slipSurges = (RC.slipSurges || 0) + 1;
      RC.hirs = Math.min(100, RC.hirs + 8);
      if (!auto) {
        SFX.play('wing', { vol: .82 });
        raceFx('KORİDOR İVMESİ!', 'good');
        raceCom(`${RC.d.name} ${ek(draft.name, 'gen')} rüzgâr koridorundan fırladı! Anlık hız patlaması!`);
      }
    }
  } else {
    // Koridordan yeterince şarj biriktirip yan şeride çıkınca da slingshot tetiklenir
    if (prevDraft && (RC.draftCharge || 0) >= 0.65 && RC.slipSurgeT <= 0) {
      RC.slipSurgeT = SLIP_SURGE_T * 0.85;
      RC.slipSurge = SLIP_SURGE_V * 0.9;
      RC.slipSurges = (RC.slipSurges || 0) + 1;
      if (!auto) {
        SFX.play('wing', { vol: .75 });
        raceFx('SIYRILMA İVMESİ!', 'good');
        raceCom(`${RC.d.name} hava koridorundan sıyrılıp sollama ivmesi yakaladı!`);
      }
    }
    RC.draftCharge = Math.max(0, (RC.draftCharge || 0) - dt * 1.6);
  }

  const draftPull = draft ? DRAFT_V * (0.85 + 0.45 * (RC.draftCharge || 0)) : 0;
  let mult = auto
    ? RC.autoPerf + draftPull * 0.45 + (RC.slipSurgeT > 0 ? RC.slipSurge * 0.55 : 0) - RC.gustPenalty * 0.5
    : 1 + RC.boost + draftPull + (RC.slipSurgeT > 0 ? RC.slipSurge : 0) - RC.gustPenalty - (RC.blockT ? BLOCK_V : 0);
  if (RC.dashT > 0) mult += DASH_V;
  mult = Math.max(0.42, mult);

  // Hedef hıza doğru yumuşak ivmelenme / aerodinamik sürüklenme (drag) eğrisi
  const targetV = RC.sp * mult;
  const curV = RC.curV != null ? RC.curV : RC.sp;
  const rate = targetV > curV ? (RC.dashT > 0 || RC.slipSurgeT > 0 ? RACE_ACCEL * 1.65 : RACE_ACCEL) : RACE_DRAG;
  RC.curV = curV + (targetV - curV) * (1 - Math.exp(-rate * dt));
  const v = RC.curV;
  RC.pos += v * dt; RC.v = v;

  // Görsel yunuslama açısı (pitch interpolation): hız patlamasında hafif öne eğilir, tırmanışta kalkar
  const targetPitch = clamp(RC.vy * 22 - Math.max(0, (v / RC.sp) - 1.05) * 9, -24, 24);
  RC.pitch = (RC.pitch || 0) + (targetPitch - (RC.pitch || 0)) * Math.min(1, 12 * dt);

  // Rakipler
  for (const r of RC.riv) {
    const rp = clamp(r.pos / RC.L, 0, 1.2), g = r.pos - RC.pos;
    r.bT = Math.max(0, r.bT - dt); if (!r.bT) r.bA = 0;
    r.gustP = (r.gustP || 0) * damp;
    r.slipSurgeT = Math.max(0, (r.slipSurgeT || 0) - dt);
    r.nextB -= dt; if (r.nextB <= 0) { r.nextB = rnd(2.2, 3.8); r.bA = rnd(.16, .3); r.bT = 1; }
    r.nextO -= dt;
    if (r.nextO <= 0) {
      r.nextO = rnd(7, 13);
      if (chance(55)) {
        r.gustP = rnd(.24, .38) * (1 - Math.min(.32, (r.da || 35) / 380));
        r.bA = 0; r.bT = 0;
        if (!auto && Math.abs(g) < 3) raceCom(`${r.name} ${pick(['bir bulut burgacına daldı', 'kayaya sürtündü', 'ters rüzgâra kapıldı'])} ama kanatlarını topluyor!`);
      }
    }
    // Son düzlük hamlesi: yanındaysan ya da vakti geldiyse
    if (!r.dashed && rp > .8 && rp < 1 && (Math.abs(g) < .35 || chance(dt * 60))) {
      r.dashed = true; r.bA = .34; r.bT = 1.1; r.gustP *= 0.3;
      if (!auto && Math.abs(g) < 2.5) raceSay(r, pick(RACE_TAUNT.final));
    }
    let band = 1;
    if (p < .9 && !auto) band = g < -1.1 ? 1.045 : g > 2.4 ? .97 : 1;
    // Rakip de öndeki ejderhanın (senin veya başka rakibin) rüzgâr koridoruna girer
    let rd = 0;
    const inMyWake = !auto && g < -.2 && g > -1.18 && Math.abs(r.y - RC.y) < .12;
    const inRivWake = RC.riv.some(o => o !== r && o.pos - r.pos > .2 && o.pos - r.pos < 1.15 && Math.abs(o.y - r.y) < .12);
    if (inMyWake || inRivWake) {
      rd = DRAFT_V * .8;
      r.draftCharge = Math.min(1, (r.draftCharge || 0) + dt * 0.9);
      if (r.draftCharge >= 0.95) { r.slipSurgeT = 0.95; r.draftCharge = 0; }
    } else {
      r.draftCharge = Math.max(0, (r.draftCharge || 0) - dt * 1.4);
    }
    const rMult = Math.max(0.45, RACE_STYLE[r.style].prof(rp) * band * (1 + r.bA + rd + (r.slipSurgeT > 0 ? 0.16 : 0) - (r.gustP || 0)));
    const targetRv = r.s * rMult;
    const rRate = targetRv > (r.curV || r.s) ? RACE_ACCEL : RACE_DRAG;
    r.curV = (r.curV || r.s) + (targetRv - (r.curV || r.s)) * (1 - Math.exp(-rRate * dt));
    const rv = r.curV;
    const before = r.pos; r.pos += rv * dt; r.v = rv;
    if (r.fin == null && r.pos >= RC.L) r.fin = RC.t + dt - (r.pos - RC.L) / rv;
    if (before < RC.L && r.pos >= RC.L && !auto && RC.myT == null) raceCom(`${r.name} çizgiyi geçti!`);
    // Yükseklik: kendi dalgası; yol kesen arkasındakinin önüne geçer
    r.ty = .5 + .3 * Math.sin(RC.t * .45 + r.ph) + .08 * Math.sin(RC.t * 1.3 + r.ph * 2);
    if (r.style === 'kurnaz' && g > 0 && g < 1.3) r.ty = RC.y;
    r.vy = clamp((r.ty - r.y) * 2.1, -.42, .42); r.y = clamp(r.y + r.vy * dt, .1, .9);
    r.sayCd = Math.max(0, r.sayCd - dt);
  }
  if (!RC.final && p >= .8 && RC.riv.length) {
    RC.final = true; RC.hirs = Math.min(100, RC.hirs + 35);
    if (!auto) { raceCom('SON DÜZLÜK! Hırsın kabardı.'); raceFx('SON DÜZLÜK', 'good'); SFX.play('drum'); setTimeout(() => SFX.play('cheer', { vol: .55 }), 200); $('#racem')?.classList.add('final'); }
  }
}
// Halkalar ve engeller (ejderha ekranın %26'sında): engel çarpması dayanıklılığa göre sönümlenen rüzgâr/kaya sarsıntısı uygular
function raceHits(quiet) {
  for (const r of RC.rings) {
    if (!r.hit && Math.abs(r.x - RC.pos) < .125 && Math.abs(r.y - RC.y) < .088) {
      r.hit = true; RC.got++;
      RC.boost = .33 + RC.d.st.ze / 580;
      RC.boostT = 1.15;
      RC.gustPenalty *= 0.4; // Halka akımı sarsıntıyı hızla toplar
      RC.hirs = Math.min(100, RC.hirs + 20);
      if (!quiet) { SFX.play('ring'); raceFx('+HIZ', 'good'); }
    }
  }
  for (const o of RC.obs) {
    if (!o.hit && Math.abs(o.x - RC.pos) < .14 && Math.abs(o.y - RC.y) < .1) {
      o.hit = true; RC.hits++;
      const daMitigation = Math.min(.32, RC.d.st.da / 380);
      const impact = (o.k === 'bulut' ? .46 : .56) - daMitigation;
      RC.gustPenalty = Math.min(.62, (RC.gustPenalty || 0) + impact);
      RC.curV = Math.max(RC.sp * 0.48, (RC.curV || RC.sp) * (1 - impact * 0.55));
      RC.gustTurb = (RC.y <= o.y ? -0.38 : 0.38) * (1 - daMitigation * 0.8);
      RC.boost = 0; RC.boostT = 0;
      RC.draftCharge = Math.max(0, (RC.draftCharge || 0) - 0.35);
      RC.hirs = Math.max(0, RC.hirs - 10);
      if (!quiet) {
        SFX.play('hit');
        raceFx(o.k === 'bulut' ? 'BURGAÇ!' : 'KAYA!', 'bad');
        raceCom(o.k === 'bulut'
          ? `${RC.d.name} bulut burgacına girdi! Kanatlarını toplayıp yeniden hızlanıyor.`
          : `${RC.d.name} kayaya sürtündü! Dayanıklılığı sayesinde dengesini korudu.`);
        shake($('#racem'));
      }
    }
  }
}
function raceRank() { return 1 + RC.riv.filter(r => (r.fin != null && (RC.myT == null || r.fin < RC.myT)) || (r.fin == null && RC.myT == null && r.pos > RC.pos)).length; }

function raceTick(now) {
  if (!RC || RC.done || !$('#racem')) return;
  const rdt = Math.min(.05, (now - RC.last) / 1000); RC.last = now;
  const cd = $('#rcount');
  if (RC.t < 0) { RC.t += rdt; if (cd) cd.textContent = Math.max(1, Math.ceil(-RC.t)); raceDraw(); requestAnimationFrame(raceTick); return; }
  if (cd && !cd.classList.contains('go')) {
    cd.textContent = 'UÇ!'; cd.classList.add('go'); SFX.play(RC.d.stage === 'yavru' ? 'roarS' : 'roar'); RC.wing = SFX.play('wing', { loop: true }); setTimeout(() => cd.remove(), 700);
    setTimeout(() => $('#rhint')?.classList.add('fade'), 2600);
    const nem = RC.riv.find(r => r.nem); if (nem) setTimeout(() => raceSay(nem, pick(S.nemesis && S.nemesis.friend ? RACE_TAUNT.nemStart.friend : S.nemesis && S.nemesis.w > S.nemesis.l ? RACE_TAUNT.nemStart.lead : RACE_TAUNT.nemStart.trail), true), 900);
  }
  const dt = rdt * RC.ts; RC.t += dt;
  raceStep(dt, false);
  raceHits(false);
  // sıra değişimi
  const rank = raceRank();
  if (RC.rank && rank !== RC.rank && RC.riv.length) {
    const up = rank < RC.rank, who = RC.riv.slice().sort((a, b) => Math.abs(a.pos - RC.pos) - Math.abs(b.pos - RC.pos))[0];
    raceFx(up ? `${rank}. SIRA (+)` : `${rank}. SIRA (−)`, up ? 'good' : 'bad');
    if (up) { if (rank === 1) SFX.play('cheer', { vol: .5 }); raceCom(`${RC.d.name} ${ek(who.name, 'acc')} geçti! ${rank === 1 ? 'Artık önde!' : `${rank}. sıraya yükseldi.`}`); raceSay(who, pick(RACE_TAUNT.passed)); }
    else { SFX.play('gasp', { vol: .4 }); raceCom(`${who.name} öne geçti!`); raceSay(who, pick(RACE_TAUNT.pass)); }
    $('#rrank')?.classList.remove('up', 'down'); void $('#rrank')?.offsetWidth; $('#rrank')?.classList.add(up ? 'up' : 'down');
  }
  RC.rank = rank;
  raceCuts(dt);
  raceDraw();
  if (RC.pos >= RC.L) { RC.myT = RC.t - (RC.pos - RC.L) / RC.v; return raceFinish(RC.myT); }
  requestAnimationFrame(raceTick);
}
function raceFx(t, c) { if (!$('#rdr')) return; const el = document.createElement('span'); el.className = 'rfx ' + c; el.textContent = t; $('#rdr').appendChild(el); setTimeout(() => el.remove(), 800); }
function raceCom(t) {
  const el = $('#rcom'); if (!el || !RC) return;
  const now = performance.now(); if (now - RC.comT < 900) return; RC.comT = now;
  el.innerHTML = `<span>${esc(t)}</span>`;
}
function raceSay(r, t, force) {
  if (!r || (!force && r.sayCd > 0)) return; r.sayCd = 3.5;
  const b = $(`#rrv${r.i} .rsay`); if (!b) return;
  b.textContent = t; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
}
const RK = 4.2; // ekranda görünen dünya genişliği
function raceDraw() {
  const W = $('#rworld'), dr = $('#rdr'); if (!W || !dr) return;
  const sx = x => ((x - RC.pos) / RK + .26) * 100;
  let h = '';
  for (const r of RC.rings) { const p = sx(r.x); if (p < -10 || p > 110) continue; h += `<i class="rring ${r.hit ? 'got' : ''}" style="left:${p}%;top:${r.y * 100}%"></i>`; }
  for (const o of RC.obs) { const p = sx(o.x); if (p < -15 || p > 115) continue; h += `<i class="robs ${o.k} ${o.hit ? 'hit' : ''}" style="left:${p}%;top:${o.y * 100}%"></i>`; }
  W.innerHTML = h;
  const fp = sx(RC.L), fin = $('#rfin'); if (fin) { fin.style.left = fp + '%'; fin.style.display = fp < 130 ? '' : 'none'; }
  dr.style.top = (RC.y * 100) + '%';
  const pitchDeg = RC.pitch != null ? RC.pitch : RC.vy * 20;
  dr.style.transform = `translate(-50%, -50%) rotate(${pitchDeg.toFixed(1)}deg)`;
  dr.classList.toggle('boost', RC.boost > 0 || RC.slipSurgeT > 0);
  dr.classList.toggle('slow', RC.gustPenalty > 0.08 || RC.blockT > 0);
  dr.classList.toggle('draft', !!RC.draft || RC.slipSurgeT > 0);
  dr.classList.toggle('dash', RC.dashT > 0);
  $('#rspeed')?.classList.toggle('on', RC.dashT > 0 || RC.slipSurgeT > 0 || RC.boost > .2);
  for (const r of RC.riv) {
    const e = $('#rrv' + r.i); if (!e) continue;
    const p = sx(r.pos), vis = p > -18 && p < 118;
    e.style.display = vis ? '' : 'none';
    if (vis) {
      e.style.left = p + '%'; e.style.top = (r.y * 100) + '%';
      e.style.transform = `translate(-50%, -50%) rotate(${(r.vy * 22).toFixed(1)}deg)`;
      e.classList.toggle('boost', r.bA > 0 || r.slipSurgeT > 0);
      e.classList.toggle('draftme', RC.draft === r);
    }
  }
  const prog = RC.pos / RC.L; $('#rfar').style.backgroundPosition = `${clamp(prog, 0, 1) * 100}% 50%`;
  $('#rc1').style.backgroundPositionX = `${-RC.pos * 60}px`; $('#rc2').style.backgroundPositionX = `${-RC.pos * 140}px`;
  const tw = x => `${clamp(x, 0, 1) * 100}%`;
  $('#rme').style.left = tw(prog); RC.riv.forEach(x => { const e = $('#rv' + x.i); if (e) e.style.left = tw(x.pos / RC.L); });
  const hf = $('#rhirsf'); if (hf) { hf.style.width = RC.hirs + '%'; $('#rhirs').classList.toggle('ready', RC.hirs >= dashCost()); $('#rdash').classList.toggle('ready', RC.hirs >= dashCost() && RC.dashT <= 0); }
  if (RC.riv.length) {
    const rk = $('#rrank b'); if (rk) rk.textContent = RC.rank || raceRank();
    const ahead = RC.riv.filter(r => r.pos > RC.pos).sort((a, b) => a.pos - b.pos)[0], behind = RC.riv.filter(r => r.pos <= RC.pos).sort((a, b) => b.pos - a.pos)[0];
    const sec = g => (Math.abs(g) / RC.sp).toFixed(1).replace('.', ',');
    const A = $('#rgapA'), B = $('#rgapB');
    const slipTag = RC.slipSurgeT > 0
      ? ` · <b class="good">Koridor İvmesi!</b>`
      : RC.draft
        ? ` · <b class="good">Rüzgâr Koridoru %${Math.round((RC.draftCharge || 0) * 100)}</b>`
        : '';
    if (A) { A.innerHTML = (ahead ? `Önde: <b>${esc(ahead.name)}</b> (${sec(ahead.pos - RC.pos)} sn)` : '<b class="good">Öndesin!</b>') + slipTag; A.className = (ahead && ahead.pos - RC.pos < .5) || RC.draft || RC.slipSurgeT > 0 ? 'hot' : ''; }
    if (B) { B.innerHTML = behind ? `Geride: <b>${esc(behind.name)}</b> (${sec(RC.pos - behind.pos)} sn)` : ''; B.className = behind && RC.pos - behind.pos < .5 ? 'hot' : ''; }
  }
}

/* --- Çizgi roman kareleri: kıyasıya anlar --- */
function raceCuts(dt) {
  RC.cutCd = Math.max(0, RC.cutCd - dt);
  RC.histT += dt;
  if (RC.histT >= .2) { RC.histT = 0; RC.hist.push({ t: RC.t, g: RC.riv.map(r => r.pos - RC.pos) }); while (RC.hist.length && RC.hist[0].t < RC.t - 3) RC.hist.shift(); }
  if (!RC.cut && !RC.cutSeen.kalkis && RC.t >= .2 && RC.riv.length && !window.__noCuts) { RC.cutSeen.kalkis = true; if (window.__cutForce || chance(55)) { const r = RC.riv.reduce((a, b) => Math.abs(b.pos) < Math.abs(a.pos) ? b : a); return raceCut('kalkis', RC.d, r.dz, r); } }
  if (RC.cut || RC.cutCd > 0 || RC.t < 3 || !RC.riv.length || window.__noCuts) return;
  const p = RC.pos / RC.L, old = RC.hist.find(h => h.t >= RC.t - 2.2), side = RC.hist.slice(-3);
  // Erken bölümde viraj ve göz ucu (her biri bir kez), son düzlükte son sürat ve başa baş; yarış başına en çok 3 kare (foto finiş ayrı)
  const n = RC.ev.filter(t => t !== 'foto' && t !== 'kalkis').length;
  if (n >= 3) return;
  for (const r of RC.riv) {
    if (r.fin != null) continue;
    const g = r.pos - RC.pos, dy = Math.abs(r.y - RC.y), me = RC.d, lead = g >= 0 ? r.dz : me, trail = g >= 0 ? me : r.dz;
    if (!RC.cutSeen.basa && p > .82 && p < .97 && Math.abs(g) < .3 && dy < .35) return raceCut('basa', lead, trail, r);
    if (!RC.cutSeen.surat && n < 2 && p > .8 && p < .92 && Math.abs(g) >= .3 && Math.abs(g) < 1.1 && (RC.dashT > 0 || r.bA > .3)) return raceCut('surat', lead, trail, r);
    if (p >= .8) continue;
    if (!RC.cutSeen.goz && p > .12 && Math.abs(g) < .1 && dy < .3 && side.length === 3 && side.every(h => Math.abs(h.g[r.i]) < .2)) return raceCut('goz', lead, trail, r);
    const g0 = old ? old.g[r.i] : null;
    if (!RC.cutSeen.viraj && g0 != null && Math.abs(g) < .42 && Math.abs(g0) > .95 && Math.sign(g) === Math.sign(g0)) return raceCut('viraj', g > 0 ? me : r.dz, g > 0 ? r.dz : me, r);
  }
}
const CUT_TXT = {
  viraj: (a, b) => [`${a.name} keskin bir virajla arayı kapatıyor!`, 'VUŞŞ!'],
  goz: (a, b) => [`${a.name} göz ucuyla ${ek(b.name, 'acc')} süzüyor...`, ''],
  surat: (a, b) => ['Son düzlük! İkisi de son süratle atılıyor!', 'VIIIZ!'],
  basa: (a, b) => [`Başa baş! Ne ${a.name} geri çekiliyor ne ${b.name}.`, ''],
  foto: (a, b) => [`Foto finiş! ${a.name} bir burun farkıyla!`, 'KIL PAYI!'],
  kalkis: (a, b) => [`Ve kalkış! ${a.name} göğe atılıyor!`, 'VUUŞ!'],
};
// a: sahnenin öznesi (viraj: kovalayan, göz: öndeki, başa baş: öndeki, foto: kazanan); b: öteki
function raceCut(type, a, b, r, then) {
  RC.cutSeen[type] = true;
  if (!window.__cutForce && (type === 'viraj' || type === 'goz') && !chance(65)) { RC.cutCd = 2; return; }
  RC.cutCd = type === 'surat' ? 2.5 : 6; RC.ev.push(type);
  const host = $('#racem'); if (!host) { then && then(); return; }
  const [cap, ono] = CUT_TXT[type](a, b), mine = x => x === RC.d;
  // box: kesiksiz pozun sığacağı kutu (karenin yüzdesi: sol,üst,en,boy) ve yatay hizası; poz oranını koruyarak tam sığar
  const art = (x, pz, cls, face, aura = true, sty, box) => { const es = sty || poseEdgeStyle(x, pz, face), M = POSE_META[x.el + '-' + pz], ar = M ? M[1] / M[0] : .75;
    const bx = !es && box ? ` data-box="${poseBox(x, pz, box)}" data-ar="${ar.toFixed(4)}"` : ''; return `<div class="rcd ${cls} ${es ? 'edge' : ''} ${mine(x) ? 'mine' : ''}" ${es ? `style="${es}"` : ''}${bx}>${poseSVG(x, pz, { face, still: true })}${aura ? cutAura(x.el) : ''}<span class="rcn">${esc(x.name)}</span></div>`; };
  let inner = '', vp = '50% 40%', trail = '';
  // viraj: öndeki büyük, kameranın önünden geçiyor; kovalayan uzakta keskin yatışla dönüyor (arkasında kavisli iz)
  if (type === 'viraj') { vp = '74% 34%'; trail = `<svg class="rctrail" viewBox="0 0 100 46" preserveAspectRatio="none"><path d="M98,6 C86,2 74,8 72,18 C70,28 80,34 92,30"/><path class="t2" d="M99,12 C90,9 80,13 78,20 C76,27 84,31 94,28"/></svg>`; inner = trail + art(a, 'P4', 'chase', 'l', true, null, '63,5,31,44,c') + art(b, 'P2', 'lead', 'l', true, null, '3,12,58,80,l'); }
  else if (type === 'goz') inner = art(b, 'P1', 'far', 'r', false, null, '2,48,32,44,l') + art(a, 'P3', 'head', 'l');
  // son sürat: ikisi yan yana, aynı derinlikte, kameraya doğru; hız çizgileri arkadaki bitiş kemerine toplanır
  // Referanstaki gibi: ikisi ortadaki bitiş kemerinden çıkıp ayrılıyor; biri sola, öteki sağa, kameraya doğru.
  // Kuyruklar ortada buluşur, başlar kenarlarda; kare enlemesine dolar. Öndeki solda ve biraz daha büyük.
  else if (type === 'surat') { vp = '50% 30%'; const pz = x => hasPose(x, 'P10') ? 'P10' : 'P2'; inner = art(b, pz(b), 'sideB', 'r', true, null, '50,16,45,70,r') + art(a, pz(a), 'sideA', 'l', true, null, '5,18,50,72,l'); }
  // başa baş: iki baş yakın planda burun buruna; öndeki biraz ileride ve derinde, öteki kameraya yakın ve büyük.
  // Arkadaki başın kesik kenarları öndekinin ardında ve alt kenarda kalır, sağı yumuşakça söner (yarım görünmez).
  else if (type === 'basa') { vp = '20% 40%'; const hz = x => hasPose(x, 'P11') ? 'P11' : 'P3'; inner = art(a, hz(a), 'hb', 'l', true, hz(a) === 'P11' ? `left:2%;right:auto;top:${(POSE_META[a.el + '-P11'][2] || '').includes('t') ? -5 : 4}%;bottom:auto;height:70%;width:auto` : 'left:3%;right:auto;bottom:-5%;top:auto;height:84%;width:auto') + art(b, hz(b), 'hf', 'l'); }
  // kalkış: yıldız önde ve büyük havalanıyor, en yakın rakip arkada yükseliyor
  else if (type === 'kalkis') { vp = '30% 60%'; const kz = x => hasPose(x, 'P16') ? 'P16' : 'P1'; inner = art(b, kz(b), 'far', 'r', false, null, '56,4,38,62,r') + art(a, kz(a), 'near', 'r', true, null, '4,14,54,84,l'); }
  else inner = `<i class="rcline"></i>` + art(b, 'P1', 'lose', 'r', false) + art(a, 'P1', 'win', 'r', false);
  const R = seeded(Math.floor(Math.random() * 1e6));
  const deb = type === 'foto' ? '' : Array.from({ length: 16 }, () => { const ang = R() * Math.PI * 2, dist = 30 + R() * 50; return `<i class="rcdeb ${R() < .5 ? 'dust' : ''}" style="--dx:${(Math.cos(ang) * dist).toFixed(1)}vw;--dy:${(Math.sin(ang) * dist * .5).toFixed(1)}vw;--d:${(R() * .5).toFixed(2)}s;--s:${(.5 + R()).toFixed(2)}"></i>`; }).join('');
  const el = document.createElement('div'); el.className = `rcut ${type}`;
  el.innerHTML = `<div class="rcp" style="--vp:${vp}"><div class="rcbg ${asset(`rbg-${RC.V.key}-parkur`) ? 'own' : ''}" style="background-image:url(${raceCutBg(type)})"></div><div class="rclines"></div><div class="rcrad"></div><div class="rctone"></div>
    <div class="rcdebs">${deb}</div>${inner}
    <div class="rccap">${esc(cap)}</div>${ono ? `<b class="rcono">${ono}</b>` : ''}${type === 'foto' ? '<i class="rcflash"></i>' : ''}</div>`;
  host.appendChild(el); window.__cuts = (window.__cuts || 0) + 1;
  cutFit(el.querySelector('.rcp'));
  RC.ts = .12; RC.cut = type;
  SFX.play('page', { vol: .7 }); setTimeout(() => SFX.play(type === 'foto' ? 'gasp' : type === 'goz' || type === 'basa' ? 'drum' : 'wing', { vol: .8 }), 140);
  const life = type === 'foto' ? 2600 : type === 'goz' || type === 'basa' ? 2200 : 1900;
  setTimeout(() => el.classList.add('out'), life);
  setTimeout(() => { el.remove(); if (RC) { RC.ts = 1; RC.cut = null; RC.last = performance.now(); } then && then(); }, life + 380);
}

// Kesiksiz pozları kutularına sığdırır (kare ölçüsü dönüşsüz ölçülür; animasyon payı için kutular içten %4 boşluklu tanımlı)
function cutFit(P) {
  if (!P) return; const pw = P.offsetWidth, ph = P.offsetHeight; if (!pw || !ph) return;
  P.querySelectorAll('.rcd[data-box]').forEach(e => {
    const [l, t, w, h, al, va] = e.dataset.box.split(','), ar = +e.dataset.ar, bw = +w / 100 * pw, bh = +h / 100 * ph;
    const W = Math.min(bw, bh / ar), H = W * ar, x = +l / 100 * pw + (al === 'r' ? bw - W : al === 'c' ? (bw - W) / 2 : 0);
    const y = +t / 100 * ph + (va === 'b' ? bh - H : va === 't' ? 0 : (bh - H) / 2);
    Object.assign(e.style, { width: (W / pw * 100) + '%', left: (x / pw * 100) + '%', top: (y / ph * 100) + '%', right: 'auto' });
  });
}
// Kare arka planı: mekânın bitiş ya da parkur sahnesi varsa o, yoksa yarış arka planı
function raceCutBg(type) {
  const k = RC.V.key || '', fin = type === 'surat' || type === 'foto' || type === 'kalkis';
  return asset(`rbg-${k}-${fin ? 'bitis' : 'parkur'}`) || asset(RC.V.bg) || '';
}
// Elemente göre efekt: ateşte kıvılcım, fırtınada şimşek, buzda kristal, toprakta yaprak ve taş, gölgede duman
function cutAura(el) {
  const R = seeded(Math.floor(Math.random() * 1e6)), n = { ates: 14, firtina: 5, buz: 10, toprak: 9, golge: 7 }[el] || 0;
  const items = Array.from({ length: n }, (_, i) => {
    const x = (8 + R() * 84).toFixed(1), y = (10 + R() * 80).toFixed(1), d = (R() * 1.2).toFixed(2), sc = (.6 + R() * .8).toFixed(2);
    const st = `style="animation-delay:-${d}s"`;
    if (el === 'ates') return `<circle cx="${x}" cy="${y}" r="${(.5 + R() * .9).toFixed(2)}" fill="${R() < .5 ? '#ffd23a' : '#ff7a2a'}" class="em" ${st}/>`;
    if (el === 'firtina') { let px = +x, py = +y, pts = `${px},${py}`; for (let k = 0; k < 4; k++) { px += (R() - .5) * 8; py += 3 + R() * 4; pts += ` ${px.toFixed(1)},${py.toFixed(1)}`; } return `<polyline points="${pts}" class="zap" ${st}/>`; }
    if (el === 'buz') return `<path d="M${x},${+y - 2 * sc} l${(.8 * sc).toFixed(2)},${2 * sc} l-${(.8 * sc).toFixed(2)},${2 * sc} l-${(.8 * sc).toFixed(2)},-${2 * sc} z" class="ice" ${st}/>`;
    if (el === 'toprak') return R() < .6 ? `<ellipse cx="${x}" cy="${y}" rx="${(1.4 * sc).toFixed(2)}" ry="${(.6 * sc).toFixed(2)}" transform="rotate(${Math.round(R() * 180)} ${x} ${y})" class="leaf" ${st}/>` : `<path d="M${x},${y} l${(1.2 * sc).toFixed(2)},-.6 l.5,1.1 l-1,.9 z" class="rock" ${st}/>`;
    if (el === 'golge') return `<circle cx="${x}" cy="${y}" r="${(2 + R() * 3).toFixed(1)}" class="smoke" ${st}/>`;
    return '';
  }).join('');
  return `<svg class="rcaura a-${el}" viewBox="0 0 100 100" preserveAspectRatio="none">${items}</svg>`;
}

function raceAuto() {
  if (!RC || RC.done) return;
  const d = RC.d;
  RC.autoPerf = rnd(1.01, 1.15) + d.st.ze / 2000 + d.st.da / 2400 - (d.fat >= 60 ? .06 : 0);
  if (RC.t < 0) RC.t = 0;
  const left = RC.rings.filter(r => !r.hit && r.x > RC.pos).length; RC.got += Math.round(left * rnd(.35, .6)); RC.hits += ri(0, 1);
  let guard = 0;
  while (RC.pos < RC.L && guard++ < 20000) { const dt = 1 / 30; RC.t += dt; raceStep(dt, true); }
  RC.myT = RC.t - (RC.pos - RC.L) / RC.v;
  raceFinish(RC.myT, true);
}
function raceFinish(myT, auto) {
  RC.done = true; RC.myT = myT; raceUnbind();
  // çizgiyi henüz geçmeyen rakiplerin varış zamanı: kalan yol / o anki hız
  for (const r of RC.riv) if (r.fin == null) r.fin = RC.t + Math.max(0, RC.L - r.pos) / Math.max(.4, r.s * RACE_STYLE[r.style].prof(1));
  const order = [{ me: true, name: RC.d.name, fin: myT }, ...RC.riv.map(r => ({ r, name: r.name, fin: r.fin, nem: r.nem }))].sort((a, b) => a.fin - b.fin);
  const rank = order.findIndex(o => o.me) + 1;
  const near = order.filter(o => !o.me).sort((a, b) => Math.abs(a.fin - myT) - Math.abs(b.fin - myT))[0];
  const photo = !auto && near && Math.abs(near.fin - myT) < .3;
  const show = () => raceResults(order, rank, auto);
  if (photo && $('#racem')) {
    const win = near.fin < myT ? near.r.dz : RC.d, lose = win === RC.d ? near.r.dz : RC.d;
    RC.cut = null; RC.cutCd = 0; setTimeout(() => raceCut('foto', win, lose, near.r, show), 250);
  } else show();
}
function raceResults(order, rank, auto) {
  const { d, race, practice } = RC, lines = [], myT = RC.myT;
  d.task = { t: 'done', what: practice ? 'Antrenman uçuşuna çıktı' : 'Gök yarışında uçtu' };
  d.fat = clamp(d.fat + (practice ? 6 : 12), 0, 100);
  const fmt = t => t.toFixed(2).replace('.', ',');
  let table = '';
  if (race) {
    const prize = race.odul[rank - 1] || 0, un = rank === 1 ? race.un : rank === 2 ? Math.floor(race.un / 2) : 0;
    S.gold += prize; S.un += un; S.st.races = (S.st.races || 0) + 1;
    const g = Math.min(rank === 1 ? 3 : 2, capOf(d, 'ce') - d.st.ce); d.st.ce += Math.max(0, g); addBond(d, 1);
    lines.push(`<b class="${rank === 1 ? 'good' : ''}">${rank}. oldun!</b>${prize ? ` +${goldTxt(prize)}${un ? `, +${un} ün` : ''}.` : ''}`);
    if (g > 0) lines.push(`Çeviklik +${g}.`);
    if (rank === 1) { d.raceW = (d.raceW || 0) + 1; titleCheck(d); addMood(d, 1); if (!(S.st.raceWins)) snapAlbum('race', race.ad, `${d.name} ilk gök yarışını kazandı!`, d); S.st.raceWins = (S.st.raceWins || 0) + 1; chron(`${d.name} ${ek(race.ad, 'acc')} kazandı.`); }
    lines.push(...raceNemesis(order, rank, myT));
    races().list = races().list.filter(r => r.id !== race.id);
    const t0 = order[0].fin;
    table = `<ol class="rres">${order.map((o, i) => `<li class="${o.me ? 'me' : ''} ${o.nem ? 'nem' : ''}"><b>${i + 1}.</b><span>${esc(o.name)}${o.nem ? ' <em>ezeli rakip</em>' : ''}</span><i>${i ? '+' + fmt(o.fin - t0) : fmt(o.fin) + ' sn'}</i></li>`).join('')}</ol>`;
  } else {
    races().practiced = true; addBond(d, 2); if (d.st.ce < capOf(d, 'ce')) d.st.ce++;
    lines.push(`Süre: ${fmt(myT)} sn. Bağ +2, çeviklik +1.`);
  }
  lines.unshift(`${RC.got} halka${RC.hits ? `, ${RC.hits} çarpma` : ', hiç çarpmadan'}${RC.dashes ? `, ${RC.dashes} atılım` : ''}${RC.slipSurges ? `, ${RC.slipSurges} koridor ivmesi` : ''}${RC.draftT > 1 ? `, ${Math.round(RC.draftT)} sn rüzgâr koridoru` : ''}${auto ? ' (otomatik)' : ''}.`);
  saveGame();
  const m = $('#racem'); if (!m) return;
  const box = document.createElement('div'); box.className = 'rend ' + (rank === 1 ? 'win' : '');
  box.innerHTML = `<h3>${race ? (rank === 1 ? 'Birinci!' : `${rank}. sıra`) : 'Güzel uçuş'}</h3>${table}<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><button class="btn primary big" data-a="race-done">Devam</button>`;
  m.appendChild(box); SFX.play(rank === 1 ? 'win' : 'page'); if (rank === 1 && race) FX.coins(innerWidth / 2, innerHeight / 2);
}
// Ezeli rakip: seni kıl payı yenen ya da sana kıl payı yenilen biri gözüne kestirir; her karşılaşmada skor tutulur
function raceNemesis(order, rank, myT) {
  const out = [], N = S.nemesis, mi = order.findIndex(o => o.me);
  const nemO = order.find(o => o.nem);
  if (N && nemO) {
    const won = myT < nemO.fin, gap = Math.abs(nemO.fin - myT);
    if (won) N.l++; else N.w++;
    if (RC.race && RC.race.duel && S.rs) S.rs.duel = won ? 'won' : 'lost';
    if (won && S.rs && S.rs.bet && !N.friend) { S.un += 2; out.push(`Meydan okuma tuttu: +2 ün.`); }
    out.push(won ? `<b class="good">${esc(N.name)} ile hesaplaşmayı kazandın</b> (${gap < .3 ? 'kıl payı' : gap.toFixed(1).replace('.', ',') + ' sn'}). ${nemScore()}.` : `<b class="bad">${esc(N.name)} yine önündeydi</b> (${gap.toFixed(1).replace('.', ',')} sn). ${nemScore()}.`);
    if (won && N.l === 3 && !N.done3) { N.done3 = true; chron(`${RC.d.name}, ezeli rakibi ${ek(N.name, 'acc')} üçüncü kez geçti.`); addBond(RC.d, 2); out.push('Üçüncü zafer: aranızdaki bağ kuvvetlendi (bağ +2).'); }
    return out;
  }
  if (N) return out;
  const ahead = order[mi - 1], behind = order[mi + 1];
  let pickR = null, how = '';
  if (ahead && ahead.fin && myT - ahead.fin < 1.2) { pickR = ahead; how = 'seni kıl payı geçti ve şimdi çarşıda böbürleniyor'; }
  else if (behind && behind.fin - myT < .6) { pickR = behind; how = 'kıl payı geride kaldı; hırsından kanatlarını yere vurdu'; }
  if (!pickR) return out;
  const r = pickR.r;
  S.nemesis = { name: r.name, trainer: r.trainer, el: r.el, style: r.style, gx: r.gx, hue: r.hue, w: pickR === ahead ? 1 : 0, l: pickR === ahead ? 0 : 1 };
  chron(`${r.name} (${r.trainer}) ${RC.d.name} için ezeli rakip oldu.`);
  out.push(`<b>${esc(r.name)}</b> ${how}. <b>Artık ezeli rakibin:</b> sonraki yarışlarda karşına çıkacak.`);
  return out;
}
const RACE_ACT = {
  race(el) { const f = byId(UI.arenaSel), r = races().list[+el.dataset.i]; if (!canRace(f) || !r || S.gold < r.fee) return; S.gold -= r.fee; pushModal(() => raceStart(f, r, false)); },
  flypractice() { const f = byId(UI.arenaSel); if (canRace(f)) pushModal(() => raceStart(f, null, true)); },
  'race-auto'() { if (RC && !RC.done && !RC.cut) raceAuto(); },
  'race-done'() {
    const lr = RC && RC.race;
    raceUnbind();
    RC = null;
    const sid = lr && typeof raceStoryNext === 'function' ? raceStoryNext(lr) : null;
    if (sid) raceStoryShow(sid);
    afterAction(true);
    closeModal();
  },
};
