'use strict';
/* ============ EJDER OCAĞI — BAKIM (Pou tarzı) ============
   Yıkama: dövüş ve seferden sonra ejderha kirlenir; süngerle lekeleri ovarak temizlersin.
   Besleme: kilerdeki yemi ejderhanın ağzına sürüklersin (ya da dokunursun).
   Oyun: salınan çubuk yeşil bölgedeyken topu atarsın; ejderha zıplayıp yakalar.
   Her biri haftada bir kez ödül verir; sonrası yine oynanabilir ama ödülsüzdür. */

let CARE = null;
let CARE_RAF = null;
function stopCareRaf() {
  if (CARE_RAF !== null) {
    cancelAnimationFrame(CARE_RAF);
    CARE_RAF = null;
  }
}

const DIRT_SPOTS = d => Math.min(6, Math.ceil((d.dirt || 0) / 17));
function dirtWord(v) { return v >= 70 ? 'Çamur içinde' : v >= 40 ? 'Kirli' : v >= 15 ? 'Biraz tozlu' : 'Pırıl pırıl'; }
function careWeekKey() { return S.week; }
function careDone(d, k) { return d.care && d.care[k] === careWeekKey(); }
function careMark(d, k) { d.care = d.care || {}; d.care[k] = careWeekKey(); }

function washCleanPct() {
  if (!CARE || !CARE.spots || !CARE.spots.length) return 100;
  const rem = CARE.spots.reduce((acc, s) => acc + Math.max(0, s.hp), 0);
  return Math.round(clamp((1 - rem / CARE.spots.length) * 100, 0, 100));
}

function careFloatBadge(parent, text, color = '#ffd96a') {
  if (!parent) return;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `position:absolute;left:50%;top:22%;transform:translate(-50%,0);padding:4px 12px;border-radius:999px;background:rgba(15,12,10,0.88);border:1px solid ${color};color:${color};font-weight:700;font-size:13px;pointer-events:none;z-index:12;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:transform .55s ease-out,opacity .55s ease-out;`;
  parent.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translate(-50%, -26px) scale(1.06)';
    el.style.opacity = '0';
  });
  setTimeout(() => el.remove(), 600);
}

function careModal(d, tab = 'wash') {
  stopCareRaf();
  const R = seeded(seedOf(d.id) + S.week * 7);
  const n = DIRT_SPOTS(d);
  CARE = CARE && CARE.d === d
    ? { ...CARE, tab }
    : {
        d,
        tab,
        initialDirt: d.dirt || 0,
        spots: Array.from({ length: n }, () => ({ x: 36 + R() * 38, y: 42 + R() * 34, r: 3 + R() * 2.6, hp: 1 })),
        play: { n: 0, hit: 0, streak: 0, bestStreak: 0, lastNote: '', t0: performance.now() },
        feedBanner: '',
      };
  careRender();
}
function careRender() {
  stopCareRaf();
  const { d, tab } = CARE;
  const tabs = [['wash', 'Yıka', 'care'], ['feed', 'Besle', 'feed'], ['play', 'Oyna', 'train']].map(([k, n, ic]) =>
    `<button class="ctab ${tab === k ? 'on' : ''}" data-a="care-tab" data-k="${k}">${ui(ic)} ${n}${careDone(d, k) ? ` <small>${ui('check')}</small>` : ''}</button>`).join('');
  let tool = '';
  if (tab === 'wash') {
    const left = CARE.spots.filter(s => s.hp > 0).length;
    const pct = washCleanPct();
    tool = `<div class="wash-prog" style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Temizlik Durumu</span><b id="wash-pct">%${pct}</b></div>
        <div class="bar good"><i id="wash-bar" style="width:${pct}%;transition:width .12s ease-out"></i></div>
      </div>
      <p class="chint"><span id="wash-left">${left ? `Süngeri lekelerin üstünde gezdir. <b>${left}</b> leke kaldı.` : `${esc(d.name)} pırıl pırıl!`}</span>${careDone(d, 'wash') ? ' <span class="mute">Bu haftanın ödülünü aldın.</span>' : ' <span class="mute">Temizlenince moral +1, bağ +2.</span>'}</p>`;
  }
  if (tab === 'feed') {
    const fs = Object.keys(FOODS).filter(f => S.food[f] > 0);
    const banner = CARE.feedBanner ? `<div class="chip good" style="display:inline-block;margin-bottom:6px">${CARE.feedBanner}</div>` : '';
    tool = `${banner}<p class="chint">${d.fed ? 'Bu hafta karnı tok; yine de bir lokma alabilir ama ödülü yok.' : 'Bir yemi ejderhanın ağzına sürükle ya da dokun.'}</p>
      <div class="cfoods">${fs.length ? fs.map(f => {
        const isFav = d.favKnown && d.fav === f;
        return `<button class="cfood ${isFav ? 'fav' : ''}" data-f="${f}" data-hover title="${FOODS[f].ad}${isFav ? ' (En Sevdiği Yem)' : ''}">${foodIcon(f)}<small>${isFav ? 'Sevdiği · ' : ''}×${S.food[f]}</small></button>`;
      }).join('') : '<span class="mute">Kiler boş. Pazardaki Nuri\'den yem alabilirsin.</span>'}</div>`;
  }
  if (tab === 'play') {
    const P = CARE.play;
    const streakBadge = P.streak >= 2 ? ` <span class="chip good">Seri ×${P.streak}</span>` : (P.lastNote ? ` <span class="chip mute">${P.lastNote}</span>` : '');
    tool = `<p class="chint">${P.n >= 3 ? `Oyun bitti: <b>${P.hit}/3</b> yakaladı${P.bestStreak === 3 ? ' <b>(Mükemmel Seri!)</b>' : ''}.` : `Çubuk yeşil bölgedeyken topu at. Atış ${P.n + 1}/3.`}${streakBadge}${careDone(d, 'play') ? ' <span class="mute">Bu haftanın ödülünü aldın.</span>' : ' <span class="mute">Her yakalayış bağ +1; 3/3 seri moral +1 ve ekstra bağ +1.</span>'}</p>
      <div class="pbar"><i class="zone"></i><b id="pmark"></b></div>
      <div class="pbtns">${P.n >= 3 ? `<button class="btn" data-a="care-replay">Yeniden oyna</button>` : `<button class="btn primary big" data-a="care-throw">Topu at!</button>`}</div>`;
  }
  const spots = tab === 'wash' ? CARE.spots.map((s, i) => `<i class="spot" data-i="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.r * 2}%;opacity:${Math.max(0, s.hp)}"></i>`).join('') : '';
  showModal(`<div class="carem"><div class="cbg">${sceneOr('ahir', sceneAhir(d.el))}</div>
    <header class="chead"><div><small>Bakım</small><b>${esc(d.name)}</b></div><div class="cstat"><span>${moodFace(normMood(d.mood))} ${MOOD[normMood(d.mood)]}</span><span>${heartGauge(d.bond)}</span><span class="dirt">${dirtWord(d.dirt || 0)}</span></div><button class="icb" data-a="mclose" aria-label="Kapat">${ui('x')}</button></header>
    <div class="cstage ${tab}" id="cstage"><div class="cdr ${CARE.anim || ''}" id="cdr">${dragonSVG(d)}</div>${spots}<div class="mouth" id="mouth" style="${{ yavru: 'left:64%;top:48%', genc: 'left:70%;top:30%', yetiskin: 'left:76%;top:20%' }[d.stage || 'yetiskin']}"></div>${tab === 'play' ? '<i class="ball" id="ball"></i>' : ''}${tab === 'wash' ? '<i class="sponge" id="sponge"></i>' : ''}</div>
    <footer class="cfoot"><div class="ctabs">${tabs}</div><div class="ctool">${tool}</div></footer></div>`, 'carewrap');
  CARE.anim = '';
  careBind();
}
function careBind() {
  const st = $('#cstage'); if (!st) return;
  if (CARE.tab === 'wash') {
    const sp = $('#sponge');
    const move = e => {
      const r = st.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (sp) sp.style.transform = `translate(${x - 28}px, ${y - 22}px)`;
      if (!(e.buttons & 1) && e.pointerType === 'mouse') return;
      let changed = false;
      const stepDmg = e.type === 'pointerdown' ? 0.34 : 0.085;
      CARE.spots.forEach((s, i) => {
        if (s.hp <= 0) return;
        const sx = s.x / 100 * r.width, sy = s.y / 100 * r.height, rad = s.r / 100 * r.width + 24;
        if (Math.hypot(x - sx, y - sy) < rad) {
          s.hp = Math.max(0, s.hp - stepDmg);
          changed = true;
          const el = st.querySelector(`.spot[data-i="${i}"]`); if (el) el.style.opacity = Math.max(0, s.hp);
          if (Math.random() < 0.38) bubble(st, x, y);
          if (s.hp <= 0) {
            SFX.play('wash', { vol: .8 });
            bubble(st, sx, sy, 6);
            if (typeof FX !== 'undefined' && FX.burst) FX.burst(r.left + sx, r.top + sy, '#9be7ff', 10);
          }
        }
      });
      if (changed) {
        const pct = washCleanPct();
        const left = CARE.spots.filter(s => s.hp > 0).length;
        CARE.d.dirt = Math.round((CARE.initialDirt || 0) * (1 - pct / 100));
        const pctEl = $('#wash-pct'), barEl = $('#wash-bar'), leftEl = $('#wash-left'), dirtEl = document.querySelector('.chead .dirt');
        if (pctEl) pctEl.textContent = `%${pct}`;
        if (barEl) barEl.style.width = `${pct}%`;
        if (leftEl) leftEl.innerHTML = left ? `Süngeri lekelerin üstünde gezdir. <b>${left}</b> leke kaldı.` : `${esc(CARE.d.name)} pırıl pırıl!`;
        if (dirtEl) dirtEl.textContent = dirtWord(CARE.d.dirt || 0);
        if (left === 0) washDone();
      }
    };
    st.addEventListener('pointermove', move); st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); move(e); });
  }
  if (CARE.tab === 'feed') {
    document.querySelectorAll('.cfood').forEach(b => {
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        const f = b.dataset.f, ghost = b.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost);
        const mv = ev => { ghost.style.left = ev.clientX - 30 + 'px'; ghost.style.top = ev.clientY - 30 + 'px'; };
        const up = ev => {
          document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); ghost.remove();
          const m = $('#mouth')?.getBoundingClientRect(), moved = Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 8;
          const onMouth = m && ev.clientX > m.left - 30 && ev.clientX < m.right + 30 && ev.clientY > m.top - 30 && ev.clientY < m.bottom + 30;
          if (onMouth || !moved) careFeed(f);
        };
        mv(e); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      });
    });
  }
  if (CARE.tab === 'play' && CARE.play.n < 3) {
    const mk = $('#pmark'), P = CARE.play;
    const tick = () => {
      if (!CARE || CARE.tab !== 'play' || (typeof modalOn !== 'undefined' && !modalOn) || !mk || !document.body.contains(mk)) {
        stopCareRaf();
        return;
      }
      mk.style.left = (playPos() * 100) + '%';
      CARE_RAF = requestAnimationFrame(tick);
    };
    P.t0 = performance.now(); P.period = 1500 - P.n * 250;
    stopCareRaf();
    CARE_RAF = requestAnimationFrame(tick);
  }
}
function bubble(st, x, y, n = 1) {
  for (let k = 0; k < n; k++) {
    const b = document.createElement('i'); b.className = 'bub';
    b.style.left = x + (Math.random() - .5) * 40 + 'px'; b.style.top = y + (Math.random() - .5) * 30 + 'px';
    const s = 8 + Math.random() * 16; b.style.width = b.style.height = s + 'px';
    st.appendChild(b); setTimeout(() => b.remove(), 1200);
  }
}
function washDone() {
  const d = CARE.d; d.dirt = 0;
  if (!careDone(d, 'wash')) { careMark(d, 'wash'); addMood(d, 1); addBond(d, 2); toast(`<b>${esc(d.name)}</b> pırıl pırıl! Moral +1, bağ +2.`); }
  SFX.play('heart');
  const st = $('#cstage');
  if (st) careFloatBadge(st, 'Pırıl Pırıl · %100 Temiz!', '#9be7ff');
  const r = $('#cdr')?.getBoundingClientRect(); if (r) FX.hearts(r.x + r.width * 0.6, r.y + r.height * 0.3);
  CARE.anim = 'shake'; saveGame(); setTimeout(() => CARE && careRender(), 350);
}
function careFeed(f) {
  const d = CARE.d;
  if (!S.food[f]) return;
  if (f === 'genclik') {
    const lines = feedDragon(d, 'genclik');
    if (!lines) return;
    CARE.feedBanner = `<b>Sonsuz Gençlik Mühürlendi!</b> ${esc(d.name)} artık ebedi yavru silahın!`;
    SFX.play('goal');
    CARE.anim = 'nom';
    toast(lines.join(' '));
    afterAction(true);
    careRender();
    return;
  }
  const wasFavKnown = !!d.favKnown;
  const wasFed = !!d.fed;
  let lines;
  if (!d.fed) lines = feedDragon(d, f);
  else { S.food[f]--; addMood(d, 0); lines = ['Bir lokma daha aldı; karnı zaten toktu.']; }

  const r = $('#mouth')?.getBoundingClientRect();
  const cx = r ? r.x + r.width / 2 : window.innerWidth / 2;
  const cy = r ? r.y : window.innerHeight / 2;

  if (!wasFed && f === d.fav && !wasFavKnown && d.favKnown) {
    CARE.feedBanner = `Favori Yem Keşfedildi: <b>${FOODS[f].ad}</b>! (${esc(d.name)} bayıldı!)`;
    SFX.play('goal');
    if (typeof FX !== 'undefined') {
      if (FX.burst) FX.burst(cx, cy, '#ffd96a', 26);
      if (FX.hearts) FX.hearts(cx, cy, 10);
    }
  } else if (!wasFed && f === d.fav) {
    CARE.feedBanner = `Favori yemi! <b>${FOODS[f].ad}</b> ile ${esc(d.name)} çok mutlu oldu.`;
    SFX.play('heart');
    if (typeof FX !== 'undefined' && FX.hearts) FX.hearts(cx, cy, 8);
  } else {
    CARE.feedBanner = '';
    if (r && typeof FX !== 'undefined' && FX.hearts) FX.hearts(cx, cy);
  }

  SFX.play('eat'); CARE.anim = 'nom'; if (lines) toast(lines.join(' ')); afterAction(true); careRender();
  if (!wasFed && f === d.fav && !wasFavKnown && d.favKnown) {
    careFloatBadge($('#cstage'), `FAVORİ YEM: ${FOODS[f].ad.toUpperCase()}!`, '#ffd96a');
  }
}
function playPos() { const P = CARE.play, ph = ((performance.now() - P.t0) % P.period) / P.period; return ph < 0.5 ? ph * 2 : 2 - ph * 2; }
function careThrow() {
  stopCareRaf();
  const P = CARE.play, d = CARE.d; if (P.n >= 3) return;
  const x = playPos(), hit = x > 0.38 && x < 0.62, perfect = Math.abs(x - 0.5) < 0.045;
  P.n++;
  const st = $('#cstage');
  if (hit) {
    P.hit++;
    P.streak = (P.streak || 0) + 1;
    P.bestStreak = Math.max(P.bestStreak || 0, P.streak);
    const label = P.streak === 3 ? 'KUSURSUZ SERİ ×3!' : P.streak === 2 ? 'KESKİN SERİ ×2!' : perfect ? 'TAM İSABET!' : 'YAKALADI!';
    P.lastNote = label;
    careFloatBadge(st, label, P.streak >= 2 || perfect ? '#ffd96a' : '#7ae582');
    const r = $('#cdr')?.getBoundingClientRect();
    if (r && (P.streak >= 2 || perfect) && typeof FX !== 'undefined') {
      if (FX.burst) FX.burst(r.x + r.width * 0.5, r.y + r.height * 0.35, '#ffd96a', 14);
      if (FX.hearts) FX.hearts(r.x + r.width * 0.5, r.y + r.height * 0.35, 5);
    }
  } else {
    P.streak = 0;
    P.lastNote = 'Kaçırdı…';
    careFloatBadge(st, 'Kaçırdı…', '#e07a7a');
  }
  const ball = $('#ball'); if (ball) ball.classList.add(hit ? 'catch' : 'miss');
  SFX.play(hit ? 'ball' : 'miss');
  setTimeout(() => {
    if (!CARE) return;
    CARE.anim = hit ? 'jump' : 'sulk'; if (!hit) SFX.play('sad', { vol: .7 });
    if (P.n >= 3 && !careDone(d, 'play')) {
      careMark(d, 'play');
      const streakBonus = P.bestStreak === 3 ? 1 : 0;
      const totalBond = P.hit + streakBonus;
      addBond(d, totalBond); d.fat = Math.max(0, d.fat - 5);
      if (P.hit === 3) { addMood(d, 1); SFX.play('goal'); }
      toast(`<b>${esc(d.name)}</b> ${P.hit}/3 yakaladı. Bağ +${totalBond}${P.hit === 3 ? ', moral +1 (3/3 Seri Bonusu!)' : ''}.`);
      afterAction(true);
    }
    careRender();
  }, 650);
}
const CARE_ACT = {
  care() { const d = byId(UI.sel); if (d) { stopCareRaf(); CARE = null; pushModal(() => careModal(d, (d.dirt || 0) >= 15 ? 'wash' : 'play')); } },
  'care-tab'(el) { SFX.play('tab'); careModal(CARE.d, el.dataset.k); },
  'care-throw'() { careThrow(); },
  'care-replay'() { stopCareRaf(); CARE.play = { n: 0, hit: 0, streak: 0, bestStreak: 0, lastNote: '', t0: performance.now() }; careRender(); },
};
