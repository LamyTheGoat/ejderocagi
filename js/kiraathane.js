/* ═══════════════════════════════════════════════════════════════════════
   KERVANSARAY KIRAATHANESİ — 3'lü Canlı Sosyal Masa Oyunu
   Kor 21 (Blackjack) · Hızlı Kervan Tavlası (12 haneli) · 5 Zarlı Ejder Pokeri
   hub.js → meydanView() içinde H.tab === 'kiraathane' iken kiraathaneView() çağrılır.
   ═══════════════════════════════════════════════════════════════════════ */

const KIR = { oppHandle: null, bet: 'tea', bubbles: { me: '', opp: '' }, bj: null, tv: null, pk: null, timers: [] };

const KIR_BETS = {
  tea: { lbl: '🍵 Çayına', sub: 'Bahissiz / Eğlencesine · +5 Dostluk' },
  gold: { lbl: '🪙 50 Altın Bahsi', sub: 'Kazanan +50 Altın alır' },
  ore: { lbl: '💎 1 Kervan Cevheri Bahsi', sub: 'Kazanan +1 Cevher alır' },
  stone: { lbl: '🔥 2× Kıvılcım Kor Taşı Bahsi', sub: 'Kazanan +2 Kor Taşı alır' },
};
const KIR_EMOTES = [
  ['🎲', 'Gelsin Düşeş!'], ['🤨', 'Zar tutma!'], ['😎', 'Kolay lokmasın!'], ['🍵', 'Çaylar benden!'], ['😂', 'Mars kokusu alıyorum!'],
];
const KIR_REPLIES = [
  ['Düşeş sana değil, bana gelecek!', 'Zarlar bugün benden yana, göreceksin.'],
  ['Zar tutmak mı? Ben dürüst oynarım!', 'Gözün zarda kalmasın, elim temiz.'],
  ['Lokma değilim, kemik zarım!', 'Gülme, son hamle benim olacak.'],
  ['Çaylar senden, zaferler benden!', 'Sağ ol, şekeri bol atma.'],
  ['Mars mı? Hele önce pulunu çıkar!', 'Ha ha, kokuyu ben de aldım ama senden geliyor.'],
];

function kirClearTimers() { KIR.timers.forEach(clearTimeout); KIR.timers = []; }
function kirLater(fn, ms) { const t = setTimeout(fn, ms); KIR.timers.push(t); return t; }
function kirResetGame() { kirClearTimers(); KIR.bj = null; KIR.tv = null; KIR.pk = null; KIR.bubbles = { me: '', opp: '' }; }
function kirRender() { if (typeof render === 'function') render(); }
function kirActive() { return typeof UI !== 'undefined' && UI.view === 'meydan' && typeof S !== 'undefined' && S && S.hub && S.hub.tab === 'kiraathane'; }
function kirRnd(n) { return 1 + Math.floor(Math.random() * n); }
function kirE(s) { return typeof esc === 'function' ? esc(String(s)) : String(s); }

function kirOpp() {
  const H = ensureHub();
  const peers = H.peers || [];
  let idx = -1;
  if (KIR.oppHandle) idx = peers.findIndex(p => p.handle === KIR.oppHandle);
  if (idx < 0 && !KIR.oppHandle) idx = H.selPeer || 0;
  const peer = idx >= 0 ? peers[idx] : null;
  if (peer) {
    return { handle: peer.handle, title: peer.title || 'Ocak Ustası', chibi: typeof peerChibiConfig === 'function' ? peerChibiConfig(peer, idx) : null, real: !!peer.isLive };
  }
  const info = typeof socInfo === 'function' ? socInfo(KIR.oppHandle) : { chibi: null, real: false };
  return { handle: KIR.oppHandle || '@gezgin', title: 'Gezgin', chibi: info.chibi, real: info.real };
}

/* ───────────── Bahis uygulama ───────────── */
function kirOreTotal() { const C = ensureChibi(); return Object.values(C.ores || {}).reduce((a, b) => a + (b || 0), 0); }
function kirCanAfford(mult) {
  const C = ensureChibi();
  if (KIR.bet === 'gold') return S.gold >= 50 * mult;
  if (KIR.bet === 'ore') return kirOreTotal() >= mult;
  if (KIR.bet === 'stone') return (C.stones.kor_t1 || 0) >= 2 * mult;
  return true;
}
/** result: 'win' | 'lose' | 'push' — kazanç/kayıp metnini döndürür. */
function kirSettle(res, mult) {
  const C = ensureChibi();
  const opp = kirOpp();
  let txt = '';
  if (KIR.bet === 'tea') {
    if (typeof addPeerAff === 'function') addPeerAff(opp.handle, 5);
    txt = '+5 Dostluk';
  } else if (res === 'push') {
    txt = 'Bahis iade';
  } else if (KIR.bet === 'gold') {
    const amt = 50 * mult;
    if (res === 'win') { S.gold += amt; txt = `+${amt} Altın`; }
    else { const lost = Math.min(S.gold, amt); S.gold -= lost; txt = `-${lost} Altın`; }
  } else if (KIR.bet === 'ore') {
    if (res === 'win') {
      const k = ['obsidiyen', 'kehribar', 'mercan', 'yildirim'][Math.floor(Math.random() * 4)];
      awardChibiStones({ [k]: mult });
      txt = `+${mult} ${CHIBI_ORES[k].ad}`;
    } else {
      let left = mult, lost = 0;
      Object.keys(C.ores).sort((a, b) => (C.ores[b] || 0) - (C.ores[a] || 0)).forEach(k => {
        const take = Math.min(left, C.ores[k] || 0);
        C.ores[k] -= take; left -= take; lost += take;
      });
      txt = `-${lost} Cevher`;
    }
  } else if (KIR.bet === 'stone') {
    const amt = 2 * mult;
    if (res === 'win') { awardChibiStones({ kor_t1: amt }); txt = `+${amt} Kıvılcım Kor Taşı`; }
    else { const lost = Math.min(C.stones.kor_t1 || 0, amt); C.stones.kor_t1 -= lost; txt = `-${lost} Kıvılcım Kor Taşı`; }
    if (typeof syncChibiSlotPlus === 'function') syncChibiSlotPlus(C);
  }
  if (res === 'win') { S.un = (S.un || 0) + 1; if (typeof SFX !== 'undefined') SFX.play('win'); }
  else if (res === 'lose' && typeof SFX !== 'undefined') SFX.play('error');
  if (typeof saveGame === 'function') saveGame();
  return txt;
}

/* ═════════════════ OYUN 1 — KOR 21 (BLACKJACK) ═════════════════ */
function bjDeck() {
  const d = [];
  for (const s of ['♠', '♥', '♦', '♣']) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function bjVal(h) {
  let t = 0, a = 0;
  h.forEach(c => {
    if (c.r === 'A') { a++; t += 11; } else if (c.r === 'J' || c.r === 'Q' || c.r === 'K') t += 10; else t += +c.r;
  });
  while (t > 21 && a > 0) { t -= 10; a--; }
  return t;
}
function bjFinish(res, text) {
  const B = KIR.bj;
  if (!B || B.done) return;
  B.done = true; B.phase = 'done'; B.reveal = true; B.res = res;
  const reward = kirSettle(res, B.mult);
  B.text = `${text} (${reward})`;
  kirRender();
}
function bjStart() {
  if (!kirCanAfford(2) && !kirCanAfford(1)) { toast('Bu bahis için yeterli kaynağın yok. Çayına oyna veya başka bahis seç.'); return; }
  kirClearTimers();
  const deck = bjDeck();
  const B = KIR.bj = { deck, me: [deck.pop(), deck.pop()], opp: [deck.pop(), deck.pop()], phase: 'player', mult: 1, done: false, reveal: false, text: '', res: '' };
  const meNat = bjVal(B.me) === 21, opNat = bjVal(B.opp) === 21;
  if (typeof SFX !== 'undefined') SFX.play('click');
  if (meNat && opNat) bjFinish('push', '🔥 İki taraf da EJDER GÖZÜ! Berabere');
  else if (meNat) bjFinish('win', '🔥 EJDER GÖZÜ (BLACKJACK)! Anında kazandın');
  else if (opNat) bjFinish('lose', 'Rakip 🔥 EJDER GÖZÜ (BLACKJACK) yaptı');
  else kirRender();
}
function bjDraw(hand) { const B = KIR.bj; if (!B.deck.length) B.deck = bjDeck(); hand.push(B.deck.pop()); }
function bjStand() {
  const B = KIR.bj;
  if (!B || B.phase !== 'player') return;
  B.phase = 'opp'; B.reveal = true;
  kirRender();
  kirLater(bjOppStep, 500);
}
function bjOppStep() {
  const B = KIR.bj;
  if (!B || B.done) return;
  const mv = bjVal(B.me), ov = bjVal(B.opp);
  if (ov < 17 && ov <= mv) {
    bjDraw(B.opp);
    if (typeof SFX !== 'undefined') SFX.play('page');
    kirRender();
    kirLater(bjOppStep, 500);
    return;
  }
  const ov2 = bjVal(B.opp);
  if (ov2 > 21) bjFinish('win', `Rakip yandı (${ov2})! Kazandın`);
  else if (ov2 > mv) bjFinish('lose', `Rakip ${ov2} ile senin ${mv} elini geçti`);
  else if (ov2 === mv) bjFinish('push', `İkiniz de ${mv}! Berabere`);
  else bjFinish('win', `${mv} ile rakibin ${ov2} elini geçtin! Kazandın`);
}
function bjHit() {
  const B = KIR.bj;
  if (!B || B.phase !== 'player') return;
  bjDraw(B.me);
  const v = bjVal(B.me);
  if (v > 21) { B.reveal = true; bjFinish('lose', `Yandın (${v})! `); return; }
  if (v === 21) { bjStand(); return; }
  kirRender();
}
function bjDouble() {
  const B = KIR.bj;
  if (!B || B.phase !== 'player' || B.me.length !== 2) return;
  if (!kirCanAfford(2)) { toast('Çiftlemek için bahsin 2 katı kadar kaynağın olmalı.'); return; }
  B.mult = 2;
  bjDraw(B.me);
  const v = bjVal(B.me);
  if (v > 21) { B.reveal = true; bjFinish('lose', `Elini büyüttün ama yandın (${v})! `); return; }
  bjStand();
}
function bjCardHtml(c, hidden) {
  if (hidden) return '<span class="kir-card back"></span>';
  const red = c.s === '♥' || c.s === '♦';
  return `<span class="kir-card ${red ? 'red' : ''}"><b>${c.r}</b><i>${c.s}</i></span>`;
}
function bjView(opp) {
  const B = KIR.bj;
  if (!B) return `<div class="kir-felt-msg"><h3>🃏 Kor 21</h3><p>Hazır 52'lik han destesiyle klasik Blackjack. As 1 veya 11, J/Q/K 10. Kart toplama / deste kurma yok!</p><button class="btn primary big" data-a="kir-bj-start">🃏 Eli Dağıt</button></div>`;
  const mv = bjVal(B.me);
  const showAll = B.reveal;
  const myTurn = B.phase === 'player';
  return `
    <div class="kir-hand"><small>${kirE(opp.handle)} ${showAll ? `· <b>${bjVal(B.opp)}</b>` : ''}</small><div class="kir-cards">${B.opp.map((c, i) => bjCardHtml(c, !showAll && i === 1)).join('')}</div></div>
    <div class="kir-hand"><small>Sen · <b>${mv}</b>${B.mult === 2 ? ' · 🔥 ÇİFTLENDİ (2× bahis)' : ''}</small><div class="kir-cards">${B.me.map(c => bjCardHtml(c)).join('')}</div></div>
    ${B.done ? `<div class="kir-result ${B.res}">${kirE(B.text)}</div><button class="btn primary" data-a="kir-bj-start">🃏 Yeni El</button>` : `
      <div class="kir-actions">
        <button class="btn primary" data-a="kir-bj-hit" ${myTurn ? '' : 'disabled'}>🃏 Kart Çek (Hit)</button>
        <button class="btn" data-a="kir-bj-stand" ${myTurn ? '' : 'disabled'}>✋ Kal (Stand)</button>
        <button class="btn danger" data-a="kir-bj-double" ${myTurn && B.me.length === 2 ? '' : 'disabled'}>🔥 Elini Büyüt / Çiftle (Double Down)</button>
      </div>
      ${B.phase === 'opp' ? '<p class="mute sm">Rakip düşünüyor…</p>' : ''}`}`;
}

/* ═════════════════ OYUN 2 — HIZLI KERVAN TAVLASI (12 haneli) ═════════════════ */
const TV_DIR = { me: 1, opp: -1 };
function tvOther(s) { return s === 'me' ? 'opp' : 'me'; }
function tvNew() {
  const pts = Array.from({ length: 12 }, () => ({ o: null, n: 0 }));
  pts[0] = { o: 'me', n: 6 };
  pts[11] = { o: 'opp', n: 6 };
  return { pts, bar: { me: 0, opp: 0 }, off: { me: 0, opp: 0 }, turn: 'me', dice: [], moves: [], phase: 'roll', sel: null, winner: null, text: 'Zarları at!', mars: false, settled: false, res: '', busy: false };
}
function tvEnter(s, d) { return s === 'me' ? d - 1 : 12 - d; }
function tvDist(s, i) { return s === 'me' ? 12 - i : i + 1; }
function tvAllHome(T, s) {
  if (T.bar[s] > 0) return false;
  for (let i = 0; i < 12; i++) {
    const p = T.pts[i];
    if (p.o === s && p.n > 0 && !(s === 'me' ? i >= 8 : i <= 3)) return false;
  }
  return true;
}
function tvMovesFor(T, s, d) {
  const out = [];
  const o = tvOther(s);
  const blocked = i => T.pts[i].o === o && T.pts[i].n >= 2;
  if (T.bar[s] > 0) {
    const to = tvEnter(s, d);
    if (!blocked(to)) out.push({ from: 'bar', to, hit: T.pts[to].o === o && T.pts[to].n === 1, d });
    return out;
  }
  const home = tvAllHome(T, s);
  let maxDist = 0;
  for (let i = 0; i < 12; i++) if (T.pts[i].o === s && T.pts[i].n > 0) maxDist = Math.max(maxDist, tvDist(s, i));
  for (let i = 0; i < 12; i++) {
    const p = T.pts[i];
    if (p.o !== s || p.n <= 0) continue;
    const to = i + TV_DIR[s] * d;
    if (to >= 0 && to <= 11) {
      if (!blocked(to)) out.push({ from: i, to, hit: T.pts[to].o === o && T.pts[to].n === 1, d });
    } else if (home) {
      const dist = tvDist(s, i);
      if (d === dist || (d > dist && maxDist <= dist)) out.push({ from: i, to: 'off', hit: false, d });
    }
  }
  return out;
}
function tvAllMoves(T, s) {
  const seen = new Set();
  let all = [];
  T.moves.forEach(d => { if (!seen.has(d)) { seen.add(d); all = all.concat(tvMovesFor(T, s, d)); } });
  return all;
}
function tvApply(T, s, mv) {
  if (mv.from === 'bar') T.bar[s]--;
  else { const p = T.pts[mv.from]; p.n--; if (p.n === 0) p.o = null; }
  if (mv.to === 'off') T.off[s]++;
  else {
    const q = T.pts[mv.to];
    if (mv.hit) { q.n = 0; q.o = null; T.bar[tvOther(s)]++; }
    if (q.o !== s) { q.o = s; q.n = 0; }
    q.n++;
  }
  const k = T.moves.indexOf(mv.d);
  if (k >= 0) T.moves.splice(k, 1);
}
function tvScore(T, s, mv) {
  let sc = mv.d * 0.3;
  if (mv.from === 'bar') sc += 20;
  if (mv.hit) sc += 12;
  if (mv.to === 'off') sc += 9;
  else {
    const q = T.pts[mv.to];
    if (q.o === s) sc += 4; else if (!q.o) sc -= 0.5;
  }
  if (mv.from !== 'bar' && T.pts[mv.from].n === 2) sc -= 1.5;
  return sc;
}
function tvBest(T, s, all, noise) {
  let best = null, bs = -1e9;
  all.forEach(m => { const sc = tvScore(T, s, m) + (noise ? Math.random() * 1.5 : 0); if (sc > bs) { bs = sc; best = m; } });
  return best;
}
function tvRoll(T) {
  const d1 = kirRnd(6), d2 = kirRnd(6);
  T.dice = [d1, d2];
  T.moves = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  T.phase = 'move';
  T.text = d1 === d2 ? '✨ DÜŞEŞ! (4 HAMLE)' : `Zarlar: ${d1} · ${d2}`;
}
function tvWinCheck(T, s) {
  if (T.off[s] < 6) return false;
  T.winner = s; T.phase = 'done';
  const loserOff = T.off[tvOther(s)];
  T.mars = loserOff === 0;
  const mult = T.mars ? 2 : 1;
  const name = s === 'me' ? 'Kazandın' : 'Rakip kazandı';
  const reward = kirSettle(s === 'me' ? 'win' : 'lose', mult);
  T.res = s === 'me' ? 'win' : 'lose';
  T.text = `${s === 'me' ? '🏆' : '💨'} ${name}!${T.mars ? ' 🔥 MARS ETTİN! (2× Ödül)' : ''} (${reward})`;
  if (s === 'opp' && T.mars) T.text = `💨 Rakip kazandı ve seni MARS etti! (2× Kayıp) (${reward})`;
  kirRender();
  return true;
}
function tvEndTurn() {
  const T = KIR.tv;
  if (!T || T.winner) return;
  T.turn = tvOther(T.turn);
  T.phase = 'roll';
  T.moves = [];
  T.sel = null;
  if (T.turn === 'opp') {
    T.text = 'Rakibin sırası…';
    kirRender();
    kirLater(tvOppPlay, 800);
  } else {
    T.text = 'Sıra sende — zarları at!';
    kirRender();
  }
}
function tvOppPlay() {
  const T = KIR.tv;
  if (!T || T.winner || T.turn !== 'opp') return;
  if (T.phase === 'roll') {
    tvRoll(T);
    T.text = `Rakip attı: ${T.dice[0]} · ${T.dice[1]}${T.dice[0] === T.dice[1] ? ' — ✨ DÜŞEŞ!' : ''}`;
    kirRender();
    kirLater(tvOppPlay, 800);
    return;
  }
  const all = tvAllMoves(T, 'opp');
  if (!T.moves.length || !all.length) { tvEndTurn(); return; }
  const mv = tvBest(T, 'opp', all, true);
  tvApply(T, 'opp', mv);
  if (mv.hit && typeof SFX !== 'undefined') SFX.play('lose');
  if (tvWinCheck(T, 'opp')) return;
  kirRender();
  kirLater(tvOppPlay, 650);
}
function tvAfterMyMove() {
  const T = KIR.tv;
  T.sel = null;
  if (tvWinCheck(T, 'me')) return;
  const all = T.moves.length ? tvAllMoves(T, 'me') : [];
  if (!all.length) {
    T.text = T.moves.length ? 'Oynanabilir hamle kalmadı.' : 'Hamleler tamam.';
    kirRender();
    kirLater(tvEndTurn, 700);
    return;
  }
  if (T.bar.me > 0) tvSelect('bar');
  kirRender();
}
function tvSelect(from) {
  const T = KIR.tv;
  const targets = tvAllMoves(T, 'me').filter(m => m.from === from);
  T.sel = targets.length ? { from, targets } : null;
}
function tvAuto() {
  const T = KIR.tv;
  if (!T || T.turn !== 'me' || T.phase !== 'move' || T.winner) return;
  const all = tvAllMoves(T, 'me');
  if (!all.length) return;
  T.busy = true;
  const mv = tvBest(T, 'me', all, false);
  tvApply(T, 'me', mv);
  if (mv.hit && typeof SFX !== 'undefined') SFX.play('coin');
  if (tvWinCheck(T, 'me')) { T.busy = false; return; }
  const rest = T.moves.length ? tvAllMoves(T, 'me') : [];
  if (rest.length) { kirRender(); kirLater(tvAuto, 450); }
  else { T.busy = false; tvAfterMyMove(); }
}
function tvPointHtml(T, i) {
  const p = T.pts[i];
  const sel = T.sel;
  const target = sel ? sel.targets.find(t => t.to === i) : null;
  const mine = T.turn === 'me' && T.phase === 'move' && !T.busy && p.o === 'me' && p.n > 0 && (T.bar.me === 0) && tvAllMoves(T, 'me').some(m => m.from === i);
  const stack = Array.from({ length: Math.min(p.n, 6) }, () => `<i class="tv-ch ${p.o}"></i>`).join('');
  const attr = target ? `data-a="kir-tv-to" data-p="${i}"` : mine ? `data-a="kir-tv-sel" data-p="${i}"` : '';
  const tag = attr ? 'button' : 'div';
  const lastHit = target && target.hit ? ' hit' : '';
  return `<${tag} class="tv-pt ${i % 2 ? 'dk' : 'lt'} ${mine ? 'mine' : ''} ${target ? 'target' + lastHit : ''} ${sel && sel.from === i ? 'sel' : ''}" ${attr} title="Hane ${i + 1}">
    <span class="tv-no">${i + 1}</span><span class="tv-stack">${stack}</span>${p.n > 1 ? `<b class="tv-cnt">${p.n}</b>` : ''}</${tag}>`;
}
function tvView(opp) {
  const T = KIR.tv;
  if (!T) return `<div class="kir-felt-msg"><h3>🎲 Hızlı Kervan Tavlası</h3><p>12 haneli ahşap tahta · 6'şar pul · Düşeş = 4 hamle · Kapı (2+ pul) blok · Tek pulu kır → bar · Mars = 2× ödül.</p><button class="btn primary big" data-a="kir-tv-start">🎲 Tahtayı Kur</button></div>`;
  const myTurnMove = T.turn === 'me' && T.phase === 'move' && !T.winner;
  const offBtn = T.sel && T.sel.targets.some(t => t.to === 'off') ? `<button class="btn good sm" data-a="kir-tv-to" data-p="off">🏁 Dışarı Topla</button>` : '';
  const barBtn = T.bar.me > 0 && myTurnMove ? `<button class="btn danger sm" data-a="kir-tv-sel" data-p="bar">Kırık Pulunu Oyuna Sok (${T.bar.me})</button>` : '';
  return `
    <div class="tv-board">
      <div class="tv-row">${[0, 1, 2, 3, 4, 5].map(i => tvPointHtml(T, i)).join('')}</div>
      <div class="tv-mid">
        <span>🧱 Bar — Sen: <b>${T.bar.me}</b> · Rakip: <b>${T.bar.opp}</b></span>
        <span>🏁 Çıkan — Sen: <b>${T.off.me}/6</b> · Rakip: <b>${T.off.opp}/6</b></span>
      </div>
      <div class="tv-row">${[6, 7, 8, 9, 10, 11].map(i => tvPointHtml(T, i)).join('')}</div>
    </div>
    <div class="tv-dice">
      ${T.dice.length ? T.dice.map(d => `<span class="kir-die">${d}</span>`).join('') : ''}
      <span class="tv-left">${T.moves.length ? `Kalan hamle zarı: ${T.moves.join(' · ')}` : ''}</span>
    </div>
    <div class="kir-result ${T.winner ? T.res : 'info'}">${kirE(T.text)}</div>
    <div class="kir-actions">
      <button class="btn primary" data-a="kir-tv-roll" ${T.turn === 'me' && T.phase === 'roll' && !T.winner ? '' : 'disabled'}>🎲 Zarları At</button>
      <button class="btn" data-a="kir-tv-auto" ${myTurnMove && !T.busy ? '' : 'disabled'}>⚡ Hamleyi Otomatik Oyna</button>
      ${barBtn}${offBtn}
      ${T.winner ? '<button class="btn primary" data-a="kir-tv-start">🎲 Yeni Oyun</button>' : ''}
    </div>
    <p class="mute sm">Sen <b>altın pullar</b> 1 ➜ 12 yönünde (ev: 9–12) · Rakip <b>obsidiyen pullar</b> 12 ➜ 1 yönünde (ev: 1–4). Pulunu tıkla, yeşil haneye tıkla.</p>`;
}

/* ═════════════════ OYUN 3 — 5 ZARLI EJDER POKERİ ═════════════════ */
const PK_NAMES = ['YÜKSEK ZAR', 'TEK PER', 'DÖPER', 'ÜÇLÜ', 'KENT', 'FUL', 'KARE', '🐉 EJDERHA ELİ'];
function pkNew() {
  const side = () => ({ d: [0, 0, 0, 0, 0], hold: [false, false, false, false, false], done: false });
  return { me: side(), opp: side(), roll: 0, phase: 'idle', text: '', res: '', settled: false, mult: 1 };
}
function pkEval(dice) {
  const c = {};
  dice.forEach(v => { c[v] = (c[v] || 0) + 1; });
  const groups = Object.keys(c).map(v => ({ v: +v, n: c[v] })).sort((a, b) => b.n - a.n || b.v - a.v);
  const key = [];
  groups.forEach(g => { for (let i = 0; i < g.n; i++) key.push(g.v); });
  const sorted = dice.slice().sort((a, b) => a - b);
  const straight = groups.length === 5 && sorted[4] - sorted[0] === 4;
  let rank = 0;
  if (groups[0].n === 5) rank = 7;
  else if (groups[0].n === 4) rank = 6;
  else if (groups[0].n === 3 && groups[1].n === 2) rank = 5;
  else if (straight) rank = 4;
  else if (groups[0].n === 3) rank = 3;
  else if (groups[0].n === 2 && groups[1].n === 2) rank = 2;
  else if (groups[0].n === 2) rank = 1;
  const keyShown = rank === 4 ? sorted.slice() : key;
  return { rank, key, name: PK_NAMES[rank], label: `${PK_NAMES[rank]} (${keyShown.join('-')})` };
}
function pkCompare(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < 5; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
  return 0;
}
function pkAiHold(side) {
  const c = {};
  side.d.forEach(v => { c[v] = (c[v] || 0) + 1; });
  const max = Math.max.apply(null, Object.values(c));
  side.hold = side.d.map(v => false);
  if (max >= 2) {
    side.hold = side.d.map(v => c[v] >= 2);
    return;
  }
  const uniq = Array.from(new Set(side.d)).sort((a, b) => a - b);
  const runs = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
  for (const run of runs) {
    const hit = run.filter(v => uniq.includes(v));
    if (hit.length >= 4) {
      const used = new Set();
      side.hold = side.d.map(v => { if (hit.includes(v) && !used.has(v)) { used.add(v); return true; } return false; });
      return;
    }
  }
  const hi = Math.max.apply(null, side.d);
  let kept = false;
  side.hold = side.d.map(v => { if (!kept && v === hi) { kept = true; return true; } return false; });
}
function pkRollSide(side) { side.d = side.d.map((v, i) => (side.hold[i] && v ? v : kirRnd(6))); }
function pkRollAll() {
  const P = KIR.pk;
  if (!P || P.phase === 'done') return;
  if (P.roll === 0) {
    kirClearTimers();
    pkRollSide(P.me); pkRollSide(P.opp);
  } else {
    pkRollSide(P.me);
    if (!P.opp.done) { pkAiHold(P.opp); pkRollSide(P.opp); }
  }
  P.roll++;
  P.phase = 'play';
  if (typeof SFX !== 'undefined') SFX.play('page');
  if (P.roll >= 3) { pkFinish(); return; }
  P.me.hold = [false, false, false, false, false];
  kirRender();
}
function pkOpen() {
  const P = KIR.pk;
  if (!P || P.phase !== 'play') return;
  P.me.done = true;
  while (P.roll < 3) { pkAiHold(P.opp); pkRollSide(P.opp); P.roll++; }
  pkFinish();
}
function pkFinish() {
  const P = KIR.pk;
  const me = pkEval(P.me.d), op = pkEval(P.opp.d);
  const cmp = pkCompare(me, op);
  P.phase = 'done';
  P.me.hold = P.me.hold.map(() => false);
  const dragon = (cmp > 0 ? me : op).rank === 7;
  P.mult = cmp !== 0 && dragon ? 2 : 1;
  let res, text;
  if (cmp > 0) { res = 'win'; text = `🏆 ${me.label} İLE KAZANDIN!${dragon ? ' (2× Ödül)' : ''}`; }
  else if (cmp < 0) { res = 'lose'; text = `💨 Rakip ${op.label} ile kazandı.${dragon ? ' (2× Kayıp)' : ''}`; }
  else { res = 'push'; text = `🤝 İkiniz de ${me.label}! Berabere`; }
  P.res = res;
  P.text = `${text} (${kirSettle(res, P.mult)})`;
  P.myLabel = me.label; P.opLabel = op.label;
  kirRender();
}
function pkDiceHtml(side, mine) {
  const P = KIR.pk;
  return `<div class="pk-dice">${side.d.map((v, i) => {
    const held = side.hold[i];
    const can = mine && P.phase === 'play' && P.roll >= 1 && P.roll < 3 && !side.done;
    return `<${can ? 'button' : 'div'} class="kir-die ${held ? 'held' : ''} ${v ? '' : 'blank'}" ${can ? `data-a="kir-pk-hold" data-i="${i}" title="${held ? 'Kilidi aç' : '🔒 Tut (Kilitle)'}"` : ''}>${v || '·'}${held ? '<em>🔒</em>' : ''}</${can ? 'button' : 'div'}>`;
  }).join('')}</div>`;
}
function pkView(opp) {
  const P = KIR.pk;
  if (!P) return `<div class="kir-felt-msg"><h3>🦴 5 Zarlı Ejder Pokeri</h3><p>3 atış · zar kilitle · Yüksek Zar < Per < Döper < Üçlü < Kent < Ful < Kare < 🐉 Ejderha Eli (5 aynı = 2× ödül).</p><button class="btn primary big" data-a="kir-pk-new">🎲 Zarları Savur - 1/3</button></div>`;
  const myEval = P.me.d[0] ? pkEval(P.me.d) : null;
  return `
    <div class="kir-hand"><small>${kirE(opp.handle)} ${P.phase === 'done' ? `· <b>${kirE(P.opLabel || '')}</b>` : ''}</small>${pkDiceHtml(P.opp, false)}</div>
    <div class="kir-hand"><small>Sen ${myEval ? `· <b>${kirE(myEval.label)}</b>` : ''}</small>${pkDiceHtml(P.me, true)}</div>
    ${P.phase === 'done'
      ? `<div class="kir-result ${P.res}">${kirE(P.text)}</div><button class="btn primary" data-a="kir-pk-new">🎲 Yeni El</button>`
      : `<div class="kir-actions">
          <button class="btn primary" data-a="kir-pk-roll">${P.roll === 0 ? '🎲 Zarları Savur - 1/3' : `🎲 Kalanları Yeniden At (${P.roll + 1}/3)`}</button>
          <button class="btn" data-a="kir-pk-open" ${P.phase === 'play' ? '' : 'disabled'}>✋ Elini Aç</button>
        </div>
        <p class="mute sm">${P.roll === 0 ? 'Önce zarları savur.' : 'Tutmak istediğin zarlara tıkla (🔒), kalanları yeniden at.'}</p>`}`;
}

/* ═════════════════ ANA GÖRÜNÜM ═════════════════ */
function kiraathaneView() {
  const H = ensureHub();
  if (!['blackjack', 'tavla', 'poker'].includes(H.tavernGame)) H.tavernGame = 'blackjack';
  const opp = kirOpp();
  const g = H.tavernGame;
  const myBub = KIR.bubbles.me ? `<div class="kir-bub me">${kirE(KIR.bubbles.me)}</div>` : '';
  const opBub = KIR.bubbles.opp ? `<div class="kir-bub opp">${kirE(KIR.bubbles.opp)}</div>` : '';
  const gameBody = g === 'blackjack' ? bjView(opp) : g === 'tavla' ? tvView(opp) : pkView(opp);
  const dollMe = typeof renderChibiDoll === 'function' ? renderChibiDoll(null, { cls: 'kir-doll', hideAura: true }) : '';
  const dollOp = typeof renderChibiDoll === 'function' ? renderChibiDoll(opp.chibi, { cls: 'kir-doll', hideAura: true, flip: true }) : '';
  const tabs = [['blackjack', '🃏 Kor 21'], ['tavla', '🎲 Kervan Tavlası'], ['poker', '🦴 Ejder Pokeri']]
    .map(([k, l]) => `<button class="plaque ${g === k ? 'on' : ''}" data-a="kir-game" data-k="${k}"><span>${l}</span></button>`).join('');
  const bets = Object.keys(KIR_BETS).map(k => `<button class="btn xs ${KIR.bet === k ? 'primary' : 'ghost'}" data-a="kir-bet" data-k="${k}" title="${kirE(KIR_BETS[k].sub)}">${KIR_BETS[k].lbl}</button>`).join('');
  const emotes = KIR_EMOTES.map((e, i) => `<button class="btn xs ghost" data-a="kir-emote" data-i="${i}">${e[0]} "${kirE(e[1])}"</button>`).join('');
  const me = (typeof S !== 'undefined' && S.handle) || '@ejder_ocagi';
  return `
    <div class="kir-wrap">
      <div class="kir-top">
        <div><span class="kicker">Kervansaray Kıraathanesi</span><h3>Tavla, Kor 21 Blackjack & Ejder Pokeri</h3></div>
        <button class="btn primary sm" data-soc-lobby="table:0">📩 Arkadaşını Masaya Çağır</button>
      </div>
      <div class="kir-tabs">${tabs}</div>
      <div class="kir-bets"><small>Masa bahsi:</small> ${bets}<small class="mute"> — ${kirE(KIR_BETS[KIR.bet].sub)}</small></div>
      <div class="kir-table">
        <div class="kir-seat me">${myBub}<div class="kir-doll-wrap">${dollMe}</div><b>${kirE(me)}</b><small>${kirE((typeof S !== 'undefined' && S.guild) || 'Ocak Ustası')}</small></div>
        <div class="kir-felt">${gameBody}</div>
        <div class="kir-seat opp">${opBub}<div class="kir-doll-wrap">${dollOp}</div><b>${kirE(opp.handle)}</b><small>${kirE(opp.title)}${opp.real ? ' · 🟢 Canlı' : ''}</small></div>
      </div>
      <div class="kir-emotes">${emotes}</div>
    </div>`;
}

/* ═════════════════ ACT kanalları ═════════════════ */
function kirGameIdle() {
  const g = (ensureHub().tavernGame) || 'blackjack';
  if (g === 'blackjack') return !KIR.bj || KIR.bj.done;
  if (g === 'tavla') return !KIR.tv || !!KIR.tv.winner;
  return !KIR.pk || KIR.pk.phase === 'done' || KIR.pk.phase === 'idle';
}

Object.assign(ACT, {
  'kir-game'(el) {
    const H = ensureHub();
    if (!kirGameIdle() && H.tavernGame !== el.dataset.k) { toast('Önce oynadığın eli bitir.'); return; }
    H.tavernGame = el.dataset.k;
    kirClearTimers();
    render();
  },
  'kir-bet'(el) {
    if (!kirGameIdle()) { toast('Bahis, oyun sürerken değiştirilemez.'); return; }
    KIR.bet = el.dataset.k in KIR_BETS ? el.dataset.k : 'tea';
    render();
  },
  'kir-emote'(el) {
    const i = Math.max(0, Math.min(4, +el.dataset.i || 0));
    KIR.bubbles.me = `"${KIR_EMOTES[i][1]}"`;
    KIR.bubbles.opp = '';
    if (typeof SFX !== 'undefined') SFX.play('click');
    const opp = kirOpp();
    if (typeof socInfo === 'function' && opp.real && typeof mpSendWs === 'function') {
      mpSendWs({ type: 'chat', handle: (S.handle || '@ejder_ocagi'), text: KIR_EMOTES[i][1] });
    }
    render();
    if (!opp.real) {
      const rep = KIR_REPLIES[i][Math.floor(Math.random() * KIR_REPLIES[i].length)];
      kirLater(() => { KIR.bubbles.opp = `"${rep}"`; if (kirActive()) render(); }, 900);
    }
    kirLater(() => { KIR.bubbles = { me: '', opp: '' }; if (kirActive()) render(); }, 5200);
  },
  'kir-bj-start'() { bjStart(); },
  'kir-bj-hit'() { bjHit(); },
  'kir-bj-stand'() { bjStand(); },
  'kir-bj-double'() { bjDouble(); },
  'kir-tv-start'() {
    if (!kirCanAfford(1)) { toast('Bu bahis için yeterli kaynağın yok.'); return; }
    kirClearTimers();
    KIR.tv = tvNew();
    if (typeof SFX !== 'undefined') SFX.play('click');
    render();
  },
  'kir-tv-roll'() {
    const T = KIR.tv;
    if (!T || T.turn !== 'me' || T.phase !== 'roll' || T.winner) return;
    tvRoll(T);
    if (typeof SFX !== 'undefined') SFX.play('page');
    if (!tvAllMoves(T, 'me').length) {
      T.text += ' — oynanabilir hamle yok.';
      render();
      kirLater(tvEndTurn, 900);
      return;
    }
    if (T.bar.me > 0) tvSelect('bar');
    render();
  },
  'kir-tv-sel'(el) {
    const T = KIR.tv;
    if (!T || T.turn !== 'me' || T.phase !== 'move' || T.busy || T.winner) return;
    const p = el.dataset.p === 'bar' ? 'bar' : +el.dataset.p;
    if (T.sel && T.sel.from === p && p !== 'bar') T.sel = null;
    else tvSelect(p);
    render();
  },
  'kir-tv-to'(el) {
    const T = KIR.tv;
    if (!T || !T.sel || T.turn !== 'me' || T.busy || T.winner) return;
    const to = el.dataset.p === 'off' ? 'off' : +el.dataset.p;
    const cands = T.sel.targets.filter(t => t.to === to).sort((a, b) => a.d - b.d);
    const mv = cands[0];
    if (!mv) return;
    tvApply(T, 'me', mv);
    if (mv.hit) { T.text = '💥 Rakibin pulunu kırdın!'; if (typeof SFX !== 'undefined') SFX.play('coin'); }
    else if (typeof SFX !== 'undefined') SFX.play('click');
    tvAfterMyMove();
  },
  'kir-tv-auto'() { tvAuto(); },
  'kir-pk-new'() {
    if (!kirCanAfford(1)) { toast('Bu bahis için yeterli kaynağın yok.'); return; }
    kirClearTimers();
    KIR.pk = pkNew();
    pkRollAll();
    render();
  },
  'kir-pk-roll'() {
    if (!KIR.pk) { ACT['kir-pk-new'](); return; }
    if (KIR.pk.phase === 'done') return;
    pkRollAll();
    render();
  },
  'kir-pk-hold'(el) {
    const P = KIR.pk;
    if (!P || P.phase !== 'play' || P.roll < 1 || P.roll >= 3) return;
    const i = +el.dataset.i;
    if (i >= 0 && i < 5) P.me.hold[i] = !P.me.hold[i];
    if (typeof SFX !== 'undefined') SFX.play('click');
    render();
  },
  'kir-pk-open'() { pkOpen(); },
});
