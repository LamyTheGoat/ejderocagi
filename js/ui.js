'use strict';
/* ============ EJDER OCAĞI — ARAYÜZ (sahne tabanlı) ============ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = { view: 'title', sel: null, tile: null, drawer: null, drawerArg: null, arenaTier: 'koy', arenaSel: null, seferR: null, seferEsc: null, stall: null, stallTab: 'al', sellArm: null, sceneKey: null, buildTab: 0, goalsOpen: true };

/* ---------- küçük parçalar ---------- */
const elChip = el => `<span class="el el-${el}">${EL_AD[el]}</span>`;
const sexIc = s => ui(s === 'F' ? 'F' : 'M', 'sex');
const goldTxt = n => `<span class="gold-t">${ui('gold')}${n}</span>`;
function moodFace(m, cls = '') {
  const idx = clamp(m | 0, 0, 4);
  const a = asset('ui-mood-' + idx);
  if (a) return `<img src="${a}" class="face face-img ${cls}" alt="${MOOD[idx] || ''}" title="${MOOD[idx] || ''}">`;
  const mouth = ['M5,12 Q8,8 11,12', 'M5,11.5 Q8,9.5 11,11.5', 'M5,11 H11', 'M5,10 Q8,12.5 11,10', 'M4.5,9.5 Q8,14 11.5,9.5'][idx];
  const col = ['#e0574d', '#e09a4d', '#c8bca8', '#9ad07a', '#ffb067'][idx];
  return `<svg viewBox="0 0 16 16" class="face ${cls}" aria-label="${MOOD[idx]}"><circle cx="8" cy="8" r="7" fill="${col}" stroke="#1a1210" stroke-width="1"/><circle cx="5.6" cy="6.3" r="1" fill="#1a1210"/><circle cx="10.4" cy="6.3" r="1" fill="#1a1210"/><path d="${mouth}" stroke="#1a1210" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
}
function meter(v, max, cls) { return `<span class="meter ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></span>`; }
function heartGauge(v) {
  const a = asset('ui-heart');
  if (a) return `<span class="hg hg-nb" style="--hf:${clamp(v, 0, 100)}%"><img src="${a}" class="hg-heart-img" alt="" aria-hidden="true"><b>${v}</b></span>`;
  return `<span class="hg"><svg viewBox="0 0 16 16"><defs><clipPath id="hgc${v}"><rect x="0" y="${16 - v * 0.16}" width="16" height="16"/></clipPath></defs><path d="M8,14 C2,9 1,5.5 3.5,3.5 C5.5,2 7.5,3 8,5 C8.5,3 10.5,2 12.5,3.5 C15,5.5 14,9 8,14 Z" fill="#3a1a24" stroke="#e86c8f" stroke-width=".8"/><path clip-path="url(#hgc${v})" d="M8,14 C2,9 1,5.5 3.5,3.5 C5.5,2 7.5,3 8,5 C8.5,3 10.5,2 12.5,3.5 C15,5.5 14,9 8,14 Z" fill="#e86c8f"/></svg><b>${v}</b></span>`;
}
function statBars(d) {
  return `<div class="sbars">${STATS.map(k => {
    const g = d.genes.pot[k][0] + d.genes.pot[k][1], cap = capOf(d, k), v = d.st[k];
    return `<div class="sbar st-${k}" title="${ST_AD[k]}: ${v} / en fazla ${cap}"><span class="sn">${ST_AD[k]}</span><b class="sv">${v}</b><span class="strk"><i class="cur" style="width:${clamp(v / 1.7, 0, 100)}%"></i><i class="cap" style="left:${clamp(cap / 1.7, 0, 100)}%"></i></span><span class="sp g${Math.floor(g / 2)}">${potLetter(g)}</span></div>`;
  }).join('')}</div>`;
}
function radar(d, size = 200) {
  const c = size / 2, r = size / 2 - 26, M = 170;
  const ang = [-90, 0, 90, 180].map(a => a * Math.PI / 180);
  const pt = (k, i, v) => [c + Math.cos(ang[i]) * r * v / M, c + Math.sin(ang[i]) * r * v / M];
  const poly = vals => vals.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const cur = STATS.map((k, i) => pt(k, i, Math.max(6, d.st[k])));
  const cap = STATS.map((k, i) => pt(k, i, capOf(d, k)));
  const grid = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${poly(STATS.map((k, i) => pt(k, i, M * f)))}" fill="none" stroke="#fff" stroke-opacity=".08"/>`).join('');
  const P = PAL[d.el];
  const lab = STATS.map((k, i) => { const [x, y] = pt(k, i, M + 30); const s = d.genes.pot[k][0] + d.genes.pot[k][1]; return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="rl">${ST_KISA[k]} <tspan class="rv">${d.st[k]}</tspan> <tspan class="g${Math.floor(s / 2)}">${potLetter(s)}</tspan></text>`; }).join('');
  return `<svg viewBox="-30 -6 ${size + 60} ${size + 12}" class="radar" aria-label="Değerler">${grid}
    ${STATS.map((k, i) => { const [x, y] = pt(k, i, M); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#fff" stroke-opacity=".08"/>`; }).join('')}
    <polygon points="${poly(cap)}" fill="none" stroke="#f3dfb0" stroke-opacity=".55" stroke-dasharray="4 3"/>
    <polygon points="${poly(cur)}" fill="${P.base}" fill-opacity=".55" stroke="${P.hi}" stroke-width="2"/>${lab}</svg>`;
}
function canAct(d) { return !d.inj && !d.task; }
function labOn() { return hasB('lab'); }
function upkeepNow() { let u = 0; for (const d of S.dragons) u += hasTrait(d, 'obur') ? 15 : 10; return hasB('kiler') ? Math.round(u * 0.75) : u; }
function taskText(d) {
  if (d.inj) return `Yaralı · ${d.inj} hafta dinlenecek`;
  const t = d.task; if (!t) return null;
  if (t.t === 'train') return `${ST_AD[t.k]} antrenmanı · ${STYLES[d.style].ad.toLowerCase()}`;
  if (t.t === 'rest') return 'Dinlenecek';
  if (t.t === 'walk') return `${byId(t.p)?.name || '?'} ile gezinti`;
  if (t.t === 'breed') return `${byId(t.p)?.name || '?'} ile yuva kuracak`;
  if (t.t === 'done') return t.what;
  return null;
}
function toast(html, cls = '') {
  const t = document.createElement('div'); t.className = 'toast ' + cls; t.innerHTML = html;
  $('#toasts').appendChild(t); if (/\bgoal\b/.test(cls)) SFX.play('goal'); setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
}
UI.pg = {};
function pager(key, items, per, render, col) {
  const n = Math.max(1, Math.ceil(items.length / per));
  const p = clamp(UI.pg[key] || 0, 0, n - 1); UI.pg[key] = p;
  const page = items.slice(p * per, p * per + per), body = page.map(render).join('');
  const st = `class="pgitems${col ? ' col' : ''}" style="--per:${per};--n:${Math.max(1, page.length)}"`;
  if (n <= 1) return `<div class="pgrow solo"><div ${st}>${body}</div></div>`;
  return `<div class="pgrow${col ? ' col' : ''}"><button class="pgb" data-a="page" data-k="${key}" data-d="-1" ${p === 0 ? 'disabled' : ''} aria-label="Önceki sayfa">${ui('left')}</button><div ${st}>${body}</div><button class="pgb" data-a="page" data-k="${key}" data-d="1" ${p === n - 1 ? 'disabled' : ''} aria-label="Sonraki sayfa">${ui('right')}</button></div><div class="pgdots">${Array.from({ length: n }, (_, i) => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div>`;
}
function afterAction(keep) {
  if (typeof careerCheck === 'function' && S && !S.over) careerCheck(false);
  if (typeof storyFlush === 'function') storyFlush();
  const got = checkGoals();
  for (const g of got) { toast(`<b>Hedef tamamlandı</b>${g.t}<span class="gold-t">${ui('gold')}+${g.r}</span>`, 'goal'); SFX.play('coin'); }
  saveGame();
  if (typeof window.__onSave === 'function') window.__onSave(S);
  if (!keep) render();
}

function syncHudDeltas() {
  if (!S) return;
  const now = Date.now();
  if (UI._lastGold == null || UI._lastSeason !== (S.seasonNo || 1)) {
    UI._lastGold = S.gold;
    UI._lastUn = S.un;
    UI._lastSeason = S.seasonNo || 1;
    return;
  }
  if (S.gold !== UI._lastGold) {
    const dg = S.gold - UI._lastGold;
    UI._lastGold = S.gold;
    UI._goldDelta = { v: dg, exp: now + 1900 };
  }
  if (S.un !== UI._lastUn) {
    const du = S.un - UI._lastUn;
    UI._lastUn = S.un;
    UI._unDelta = { v: du, exp: now + 1900 };
  }
}

window.__onSave = function (savedState) {
  UI._savedAt = Date.now() + 2200;
  syncHudDeltas();
  const sb = document.getElementById('hud-save-badge');
  if (sb) {
    sb.classList.remove('show');
    void sb.offsetWidth;
    sb.classList.add('show');
  }
};

/* ---------- sahne / kabuk ---------- */
function shell() {
  if ($('#app .shell')) return;
  $('#app').innerHTML = `<div class="shell"><div id="bg"></div><div id="hud"></div><main id="stage"></main><nav id="dock"></nav><div id="placecard" aria-hidden="true"></div></div>`;
}
function setScene(key, svg, fxMode) {
  FX.setMode(fxMode);
  if (UI.sceneKey === key) return;
  UI.sceneKey = key;
  const bg = $('#bg'); if (!bg) return;
  const layer = document.createElement('div'); layer.className = 'bg-layer'; layer.innerHTML = sceneOr(bgKey(key), svg);
  bg.appendChild(layer);
  requestAnimationFrame(() => layer.classList.add('in'));
  const old = [...bg.children].slice(0, -1); setTimeout(() => old.forEach(o => o.remove()), 700);
}
const VIEWS = {
  ocak: { ad: 'Ocak', scene: () => ['ocak' + Math.ceil(S.week / 5), sceneOcak(S.week), seasonOf().fx], draw: () => ocakView() },
  ahir: { ad: 'Ahır', scene: () => { const d = byId(UI.sel); return ['ahir-' + (d ? d.el : 'ates'), sceneAhir(d ? d.el : 'ates'), 'torch']; }, draw: () => ahirView() },
  yuva: { ad: 'Yuva', scene: () => ['yuva', sceneYuva(), 'fireflies'], draw: () => yuvaView() },
  arena: { ad: 'Arena', scene: () => UI.arenaTier === 'cukur' ? ['pit', scenePit(), 'embers'] : UI.arenaTier === 'saray' ? ['saray', sceneArena(), 'fireflies'] : UI.arenaTier === 'kule' ? ['kule', scenePit(), 'stars'] : UI.arenaTier === 'yaris' ? ['kayalik', sceneArena(), 'dust'] : ['arena', sceneArena(), 'dust'], draw: () => arenaView() },
  sefer: { ad: 'Sefer', scene: () => ['table', tableScene(), null], draw: () => seferView() },
  pazar: { ad: 'Pazar', scene: () => [UI.stall === 'bedesten' ? 'bedesten' : UI.vendor ? 'pazar' : 'pazar-iso', scenePazar(), 'lanterns'], draw: () => pazarView() },
  meydan: { ad: 'Meydan', scene: () => ['meydan', scenePazar(), 'lanterns'], draw: () => meydanView() },
  kasaba: { ad: 'Kasaba', scene: () => ['kasaba', scenePazar(), 'fireflies'], draw: () => kasabaView() },
  zindan: { ad: 'Zindanlar', scene: () => ['zindan', scenePit(), 'embers'], draw: () => zindanHubView() },
};
function bgKey(k) { return k.replace(/\d+$/, '').replace(/^ahir-.*/, 'ahir'); }
function viewBg() { const r = VIEWS[UI.view]?.scene(); return r ? sceneOr(bgKey(r[0]), r[1]) : ''; }
function tableScene() { return wrapScene(`<defs>${grad('tb', [[0, '#2a1c14'], [1, '#120c08']])}<pattern id="tbw" width="1600" height="60" patternUnits="userSpaceOnUse"><path d="M0,30 Q400,20 800,32 T1600,28" stroke="#000" stroke-opacity=".25" fill="none" stroke-width="2"/></pattern></defs><rect width="1600" height="900" fill="url(#tb)"/><rect width="1600" height="900" fill="url(#tbw)"/>${glowAt('tbg', 800, 450, 700, '#ffb067', 0.12)}`); }

const PLACE_NAMES = { ocak: ['Dedenin Ocağı', 'Ocak'], ahir: ['Taş Ahır', 'Ejderhaların'], yuva: ['Yuva Bahçesi', 'Kuluçka ve çiftler'], arena: ['Arena & Saray', 'Dövüş, yarış ve zarafet'], sefer: ['Harita Odası', 'Seferler ve biyomlar'], pazar: ['Gece Çarşısı', 'Pazar ve mezat'], meydan: ['Kervansaray Meydanı', 'Canlı sosyal avlu'], kasaba: ['Ejder Kasabası', 'Panoramik şehir ve diyar haritası'], zindan: ['Yeraltı Zindan Kapıları', 'Şahmeran & Başkomutan Kalgarot Seferleri'] };
function flashPlace(v) {
  const el = $('#placecard'); if (!el || !PLACE_NAMES[v]) return;
  const [a, b] = PLACE_NAMES[v];
  el.innerHTML = `<small>${b}</small><b>${a}</b><i></i>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function render() {
  if (UI.view === 'title') {
    shell(); setScene('title', sceneTitle(), 'stars');
    $('#hud').innerHTML = ''; $('#dock').innerHTML = ''; $('#stage').className = 'stage st-title'; $('#stage').innerHTML = titleView();
    if (typeof ENGINE_GL !== 'undefined') ENGINE_GL.onViewRender('title');
    return;
  }
  if (!S) return;
  if (Array.isArray(S.dragons) && typeof repairDragonRecord === 'function') S.dragons.forEach((d, i) => repairDragonRecord(d, i + 1));
  if (Array.isArray(S.eggs) && typeof repairEggRecord === 'function') S.eggs.forEach((e, i) => repairEggRecord(e, i + 1));
  shell();
  const V = VIEWS[UI.view] || VIEWS.ocak;
  const [k, svg, fx] = V.scene(); setScene(k, svg, modalOn ? null : fx);
  $('#hud').innerHTML = hud();
  $('#stage').className = 'stage st-' + UI.view;
  const st = $('#stage'), keepX = st.scrollLeft, sameView = st.dataset.v === UI.view; st.dataset.v = UI.view;
  st.innerHTML = V.draw();
  if (UI.vsayNew) { UI.vsayNew = false; typeInto($('#vsay'), esc(UI.vsay || ''), 14); }
  $('#dock').innerHTML = dock();
  if (UI.view === 'ocak' && st.scrollWidth > st.clientWidth) st.scrollLeft = sameView ? keepX : (st.scrollWidth - st.clientWidth) / 2;
  if (typeof ENGINE_GL !== 'undefined') ENGINE_GL.onViewRender(UI.view);
}

function hud() {
  syncHudDeltas();
  const now = Date.now();
  const gd = UI._goldDelta && now < UI._goldDelta.exp ? UI._goldDelta.v : 0;
  const ud = UI._unDelta && now < UI._unDelta.exp ? UI._unDelta.v : 0;
  const savedOn = UI._savedAt && now < UI._savedAt;
  const goldDeltaHtml = gd ? `<em class="res-delta ${gd > 0 ? 'up pos' : 'down neg'}">${gd > 0 ? '+' + gd : '−' + Math.abs(gd)}</em>` : '';
  const unDeltaHtml = ud ? `<em class="res-delta ${ud > 0 ? 'up pos' : 'down neg'}">${ud > 0 ? '+' + ud : '−' + Math.abs(ud)} Ün</em>` : '';
  let ticks = '';
  for (let w = 1; w <= SEASON; w++) ticks += `<i class="${w < S.week ? 'past' : w === S.week ? 'now' : ''} ${TOURS[w] ? 'tour' : ''}" title="${TOURS[w] ? TOURS[w].ad + ' · ' : ''}Hafta ${w}"></i>`;
  const chFc = typeof calcChibiStats === "function" ? calcChibiStats().totalFc : 0;
  const curSlot = typeof getSaveSlot === 'function' ? getSaveSlot() : 1;
  return `<div class="hud-l"><span class="crest">${placeIcon('ocak')}</span><span class="hud-name">Ejder Ocağı</span><button class="hud-chibi-btn" data-a="chibi-open" title="Terbiyeci Kuşanma Vitrini ve Kor Örsü"><span class="hud-ch-mini">${typeof renderChibiDoll === "function" ? renderChibiDoll(null, { cls: "hud-doll", hideAura: true }) : ""}</span><span class="hud-ch-txt"><b>Terbiyeci</b><small>Kudret ${chFc}</small></span></button>${typeof hudBagSocialHtml === 'function' ? hudBagSocialHtml() : ''}</div>
    <div class="hud-c"><div class="wk" title="Hafta ${S.week}/${SEASON} · ${seasonOf().ad}">${ui('moon')}${seasonNo() > 1 ? `<em class="sno">${seasonNo()}. sezon</em>` : ''}<span>Hafta</span><b>${S.week}</b><span>/${SEASON}</span><em class="ssn ssn-${seasonOf().k}" title="${seasonOf().d}">${seasonOf().ad}</em>${S.tour && !S.tour.done ? `<em class="tourflag">${S.tour.ad}</em>` : S.worldEv ? `<em class="tourflag worldev" title="${esc(S.worldEv.d || '')}">${esc(S.worldEv.ad)}</em>` : ''}</div><div class="ticks">${ticks}</div></div>
    <div class="hud-r">
      <span class="res" title="Altın · haftalık bakım gideri ${upkeepNow()} altın">${ui('gold')}<b class="${S.gold < 0 ? 'bad' : ''}">${S.gold}</b><small>−${upkeepNow()}/hf</small>${goldDeltaHtml}</span>
      <span class="res" title="Ocak ünü · yüksek ün yeni arena ve bölgeleri açar">${ui('un')}<b>${S.un}</b>${unDeltaHtml}</span>
      <span class="res" title="Ejderhalar / İn kapasitesi">${ui('heart')}<b>${S.dragons.length}/${capacity()}</b></span>
      <span class="save-badge ${savedOn ? 'show' : ''}" id="hud-save-badge" title="Yuva ${curSlot} kaydedildi">Kaydedildi</span>
      <button class="icb" data-a="sound" title="Ses" aria-label="Ses">${ui(SFX.on ? 'sound' : 'mute')}</button>
      <button class="icb" data-a="chron" title="Ocak defteri" aria-label="Ocak defteri">${ui('book')}</button>
      <button class="icb" data-a="help" title="Nasıl oynanır ve ayarlar" aria-label="Nasıl oynanır">${ui('q')}</button>
      <button class="mob-hub-btn" data-a="mob-hub-menu" title="Komuta Merkezi · Tüm Özellikler" aria-label="Tüm Özellikler Menüsü"><span>⊞</span><b>Menü</b></button>
    </div>${typeof partyBarHtml === 'function' ? partyBarHtml() : ''}`;
}
function dock() {
  ensureStar(); const idle = S.dragons.filter(d => needsOrder(d)).length;
  // ENG-12: bilet göstergesi kaldırıldı; sunucu kesesinde borç varsa kısa borç rozeti (yoksa boş; eski görünüm).
  const ecoBadge = typeof ECO_LINK !== 'undefined' ? ECO_LINK.badge() : '';
  const items = [
    ['ocak', 'Ocak', '', false, false, 1],
    ['ahir', 'Ahır', idle || '', false, false, 2],
    ['yuva', 'Yuva', S.eggs.length || '', false, false, 3],
    ['arena', 'Arena', S.tour && !S.tour.done ? '!' : '', false, false, 4],
    ['sefer', 'Sefer', '', !S.flags.sefer, false, 5],
    ['pazar', 'Pazar', '', false, false, 6],
    ['meydan', 'Meydan', '', false, false, 7],
    ['kasaba', 'Kasaba', '', false, true, 8],
    ['zindan', 'Zindan', '', false, false, 9]
  ];
  return `<div class="places">${items.map(([k, n, b, lock, isHero, kbd], i) => `
    <button class="place ${isHero ? 'kasaba-place' : ''} ${UI.view === k ? 'on' : ''}" data-a="go" data-v="${k}" ${lock ? 'disabled title="Henüz yolu bilmiyorsun"' : ''} title="${n} [${kbd || i + 1}]">
      <span class="medal">${placeIcon(k)}</span><kbd>${kbd || i + 1}</kbd><span class="pn">${n}</span>${b ? `<span class="badge">${b}</span>` : ''}
    </button>`).join('')}</div>
    <button class="endweek ${UI.arm === 'endweek' ? 'armed' : ''}" data-a="endweek">
      <span class="lantern">${ui('moon')}</span>
      <div><b>${S.week >= SEASON ? 'Sezonu Bitir' : 'Haftayı Bitir'}</b>
      <small>${UI.arm === 'endweek' ? `${idle} ejderha görevsiz · yine de bitir` : idle ? `${idle} ejderha görev bekliyor` : 'Geceye geç'}</small><small class="eco-week" ${ecoBadge ? '' : 'hidden'}>${esc(ecoBadge)}</small></div>
    </button>`;
}

/* ---------- BAŞLIK ---------- */
function titleView() {
  const sv = loadGame();
  return `<div class="title">
    <h1>Ejder Ocağı</h1>
    <p class="lede">Dedenden kalan harabe bir ocak. Yaşlı bir ateş ejderhası. Soğumaya yüz tutmuş bir yumurta.<br>Yirmi hafta sonra Kızıl Taç başlıyor.</p>
    <div class="title-btns">
      ${typeof XAUTH !== 'undefined' && XAUTH.handle
        ? `<p class="title-foot" style="width:100%;margin:0 0 4px">✔ X hesabı: <b>${esc(XAUTH.handle)}</b> · <button class="btn ghost sm" data-a="x-logout">Çıkış</button></p>`
        : (typeof XAUTH !== 'undefined' && XAUTH.enabled ? `<button class="btn primary big" data-a="x-login">X ile giriş yap <small>Mahlasın doğrulansın · misafir de oynayabilirsin</small></button>` : '')}
      ${sv && (!sv.over || sv.ending !== 'iflas') ? `<button class="btn primary big" data-a="continue">Ocağa dön <small>${sv.over ? `${sv.seasonNo || 1}. sezon bitti` : `${sv.seasonNo ? `${sv.seasonNo}. sezon · ` : ''}Hafta ${sv.week} · ${(sv.dragons || []).length} ejderha · ${sv.gold} altın`}</small></button>` : ''}
      <button class="btn ${sv && !sv.over ? 'ghost' : 'primary'} big" data-a="newgame">Yeni ocak kur</button>
      <button class="btn ghost sm" data-a="help">Kayıt Defteri ve Ses</button>
    </div>
    <p class="title-foot">Her hafta bir karar · bağ, kan ve ateş</p>
  </div>`;
}

/* ================= OCAK (izometrik) ================= */
const VB = { x: -350, y: -150, w: 812, h: 560 };
const diaOf = i => { const [sx, sy] = isoXY(i); return `M${sx},${sy - TH} L${sx + TW},${sy} L${sx},${sy + TH} L${sx - TW},${sy} Z`; };
function tileLabel(i) {
  const t = S.grid[i]; if (!t) return '';
  if (!t.open) return canClear(i) ? `<b>Çalılık</b> · temizle ${goldTxt(clearCost())}` : '<b>Çalılık</b> · <span class="mute">önce yanındaki araziyi aç</span>';
  if (!t.b) return '<b>Boş arazi</b> · inşa et';
  const H = housing(), who = S.dragons.filter(d => H[d.id] === i).map(d => esc(d.name));
  return `<b>${BUILD[t.b].ad}</b>${who.length ? ` · ${who.join(', ')}` : ''}`;
}
let MAP_HL = null;
document.addEventListener('pointermove', e => {
  const box = e.target.closest && e.target.closest('.mapbox'); const hv = $('#hovdia'), tag = $('#tiptag');
  if (!hv || !tag) return;
  const t = box && e.target.closest('.isomap .tile');
  if (!t) { hv.setAttribute('d', ''); tag.classList.remove('on'); if (MAP_HL != null) { document.querySelectorAll('.isomap .hl').forEach(x => x.classList.remove('hl')); MAP_HL = null; } return; }
  const i = +t.dataset.i; hv.setAttribute('d', diaOf(i));
  if (MAP_HL !== i) { document.querySelectorAll('.isomap .hl').forEach(x => x.classList.remove('hl')); document.querySelectorAll(`.isomap .bspr[data-i="${i}"], .isomap .lockspr[data-i="${i}"]`).forEach(x => x.classList.add('hl')); MAP_HL = i; } hv.classList.toggle('locked', !S.grid[i].open && !canClear(i));
  const r = box.getBoundingClientRect(); tag.innerHTML = tileLabel(i); tag.classList.add('on');
  tag.style.left = (e.clientX - r.left + 16) + 'px'; tag.style.top = (e.clientY - r.top + 14) + 'px';
});
const SOFT_B = new Set(['yuva', 'yosun', 'sifa', 'mezar', 'kaynak']);
const isoXY = i => { const x = i % GW, y = Math.floor(i / GW); return [(x - y) * TW, (x + y) * TH]; };
function ocakView() {
  const H = housing();
  const rnd = srand(17);
  const order = S.grid.map((t, i) => i).sort((a, b) => { const ax = a % GW, ay = Math.floor(a / GW), bx = b % GW, by = Math.floor(b / GW); return (ax + ay) - (bx + by) || ax - bx; });
  let ground = '', sprites = '';
  for (const i of order) {
    const t = S.grid[i], [sx, sy] = isoXY(i), x = i % GW, y = Math.floor(i / GW);
    const v = rnd();
    const dia = `M${sx},${sy - TH} L${sx + TW},${sy} L${sx},${sy + TH} L${sx - TW},${sy} Z`;
    let fill = t.open ? ['#3d5a32', '#42603a', '#38552e', '#466640'][Math.floor(v * 4)] : '#1c2a22';
    if (t.b === 'talim' || t.b === 'parkur') fill = '#3a4a2c';
    const sel = UI.tile === i;
    let side = '';
    if (x === GW - 1) side += `<path d="M${sx + TW},${sy} L${sx},${sy + TH} L${sx},${sy + TH + 22} L${sx + TW},${sy + 22} Z" fill="#2a1e14" stroke="#120c08"/>`;
    if (y === GH - 1) side += `<path d="M${sx - TW},${sy} L${sx},${sy + TH} L${sx},${sy + TH + 22} L${sx - TW},${sy + 22} Z" fill="#3a2a1c" stroke="#120c08"/>`;
    const clear = !t.open && canClear(i);
    const tk = !t.open ? 'tile-grass' : t.b && !SOFT_B.has(t.b) ? 'tile-stone' : 'tile-grass', timg = asset(tk);
    const tileArt = timg ? `<image href="${timg}" x="${sx - TW}" y="${sy - TH}" width="${TW * 2}" height="${tk === 'tile-stone' ? 67 : 62}" preserveAspectRatio="none" ${!t.open ? 'class="dim"' : ''} ${t.open && !t.b && v > 0.5 ? `transform="translate(${2 * sx},0) scale(-1,1)"` : ''}/>` : `${side}<path d="${dia}" fill="${fill}" stroke="${t.open ? '#24361e' : '#101812'}" stroke-width="1"/>`;
    ground += `<g class="tile ${t.open ? 'open' : 'locked'} ${clear ? 'clearable' : ''} ${sel ? 'sel' : ''}" data-a="tile" data-i="${i}">${tileArt}
      ${!timg && t.open && !t.b && v > 0.6 ? `<path d="M${sx - 10},${sy + 4} l3,-7 l2,6 M${sx + 12},${sy - 6} l2,-6 l2,6" stroke="#5a7a44" stroke-width="1.5" fill="none"/>` : ''}
      ${sel ? `<path d="${dia}" fill="#ffb067" fill-opacity=".18" stroke="#ffb067" stroke-width="2.5"/>` : ''}<path class="hov" d="${dia}" fill="#fff" fill-opacity="0"/></g>`;
    if (!t.open) {
      sprites += `<g class="lockspr" data-a="tile" data-i="${i}" data-z="${sy + 2}" transform="translate(${sx},${sy})" pointer-events="${clear ? 'auto' : 'none'}">
        ${asset('tile-bramble') ? `<image href="${asset('tile-bramble')}" x="-46" y="${24 - 68}" width="92" height="68" preserveAspectRatio="xMidYMax meet"/>` : `<path d="M-30,2 q6,-26 14,-6 q4,-30 14,-4 q8,-24 12,2 q10,-18 16,4" stroke="#1a3020" stroke-width="5" fill="none" stroke-linecap="round"/>${rnd() > 0.5 ? rock(14, 6, 9, '#3a3a34') : ''}`}
        ${clear ? `<g class="sign"><rect x="-1.5" y="-26" width="3" height="24" fill="#5a3e24"/><circle cx="0" cy="-30" r="9" fill="#c9a86a" stroke="#3a2414"/><path d="M-4.5,-30 h9 M0,-34.5 v9" stroke="#3a1a08" stroke-width="2.2"/></g>` : ''}</g>`;
    } else if (t.b) {
      sprites += `<g class="bspr ${sel ? 'sel' : ''}" data-a="tile" data-i="${i}" data-z="${sy + (SOFT_B.has(t.b) || t.b === 'talim' || t.b === 'parkur' ? -TH : 2)}" transform="translate(${sx},${sy})">${buildingSprite(t.b)}</g>`;
    }
  }
  // sis
  const fog = `<rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" fill="url(#mapfog)" pointer-events="none"/>`;
  // ejderhalar haritanın içinde, binalarla aynı derinlik sırasında gezer (roam.js)
  const drs = '';
  const eggsK = S.eggs.filter(e => e.inK).length;
  const idleCount = S.dragons.filter(x => needsOrder(x)).length;
  const builtTiles = [], emptyTiles = [], brambleTiles = [];
  S.grid.forEach((t, idx) => {
    if (t.open && t.b) builtTiles.push([t, idx]);
    else if (t.open && !t.b) emptyTiles.push([t, idx]);
    else if (!t.open && canClear(idx)) brambleTiles.push([t, idx]);
  });
  const ocakPortraitList = `
    <div class="mob-portrait-list ocak-portrait-list">
      <div class="mob-ocak-Quickbar">
        ${idleCount > 0 ? `<button class="btn primary sm" data-a="auto-assign-idle">${ui('train')} Nöbet Dağıt (${idleCount} Boşta)</button>` : `<span class="tag good">Tüm ejderhalar görevde</span>`}
        ${eggsK ? `<span class="tag">${ui('egg')} Kuluçkada ${eggsK} yumurta</span>` : ''}
        <button class="btn ghost sm" data-a="mob-view-toggle">Harita Görünümü</button>
      </div>
      <div class="mob-sec-title">8×6 Ocak Parsel Haritası (Parsel Seçmek İçin Dokun)</div>
      <div class="mob-ocak-mini-grid">
        ${S.grid.map((t, idx) => {
          const isSel = UI.tile === idx;
          if (t.open && t.b) {
            const B = BUILD[t.b];
            return `<button class="mob-parcel built ${isSel ? 'sel' : ''}" data-a="tile" data-i="${idx}" title="${esc(B.ad)}">
              <span class="mp-ic">${buildingIcon(t.b)}</span>
            </button>`;
          }
          if (t.open && !t.b) {
            return `<button class="mob-parcel open-empty ${isSel ? 'sel' : ''}" data-a="tile" data-i="${idx}" title="Boş Arsa (Parsel ${idx + 1})">
              <span class="mp-dot">+</span>
            </button>`;
          }
          if (!t.open && canClear(idx)) {
            return `<button class="mob-parcel clearable ${isSel ? 'sel' : ''}" data-a="tile" data-i="${idx}" title="Çalılık Temizle (${clearCost()} Altın)">
              <span class="mp-ic">${ui('tree')}</span>
            </button>`;
          }
          return `<button class="mob-parcel locked ${isSel ? 'sel' : ''}" data-a="tile" data-i="${idx}" title="Kapalı Çalılık">
            <span class="mp-dot">·</span>
          </button>`;
        }).join('')}
      </div>
      <div class="mob-sec-title">Kurulu Yapılar (${builtTiles.length}) · Boş Arsalar (${emptyTiles.length})</div>
      <div class="mob-bldg-grid">
        ${builtTiles.map(([t, idx]) => {
          const B = BUILD[t.b];
          const who = S.dragons.filter(d => H[d.id] === idx).map(d => esc(d.name));
          return `
            <button class="mob-dir-card compact ${UI.tile === idx ? 'ready' : ''}" data-a="tile" data-i="${idx}">
              <div class="mob-dir-ic">${buildingIcon(t.b)}</div>
              <div class="mob-dir-info">
                <b>${esc(B.ad)}</b>
                <small>${who.length ? who.join(', ') : esc(B.d)}</small>
              </div>
            </button>
          `;
        }).join('')}
        ${emptyTiles.map(([, idx], k) => `
          <button class="mob-dir-card compact ${UI.tile === idx ? 'ready' : ''}" data-a="tile" data-i="${idx}">
            <div class="mob-dir-ic">${ui('anvil')}</div>
            <div class="mob-dir-info">
              <b>Boş Arsa #${k + 1} (Parsel ${idx + 1})</b>
              <small>Yeni bina inşa etmek için dokun</small>
            </div>
          </button>
        `).join('')}
        ${brambleTiles.map(([, idx]) => `
          <button class="mob-dir-card compact ${UI.tile === idx ? 'ready' : ''}" data-a="tile" data-i="${idx}">
            <div class="mob-dir-ic">${ui('tree')}</div>
            <div class="mob-dir-info">
              <b>Çalılık Temizle (Parsel ${idx + 1})</b>
              <small>Ocağı genişlet · ${goldTxt(clearCost())}</small>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  const showMapOnMob = !!(UI && UI.mobShowMap);
  return `<div class="ocak ${UI.tile != null ? 'has-drawer' : ''} ${showMapOnMob ? 'mob-force-map' : ''}">
    <div class="mapbox" style="aspect-ratio:${VB.w}/${VB.h}">
      <button class="btn ghost xs mob-view-toggle sefer-map-toggle" data-a="mob-view-toggle">Rehber Listesi</button>
      <svg class="isomap" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}">${SVG_DEFS_SMALL}<defs>${rgrad('mapfog', [[0.55, '#0a0f14', 0], [1, '#0a0f14', 0.75]])}${ROAM_DEFS}</defs>${ground}<g id="ents">${sprites}${roamMarkup(H)}</g>${UI.tile != null ? `<path class="seldia" d="${diaOf(UI.tile)}"/>` : ''}<path class="hovdia" id="hovdia" d=""/></svg>
      <div class="tiptag" id="tiptag"></div>
      ${drs}
    </div>
    ${UI.tile != null ? tileDrawer() : `<div class="hint-pill">Bir kareye dokun: inşa et, araziyi aç ya da bir binayı incele.${eggsK ? ` Kuluçkada ${eggsK} yumurta ısınıyor.` : ''}${idleCount > 0 ? ` <button class="btn primary sm btn-auto-order" data-a="auto-assign-idle" title="Boştaki tüm ejderhalara yorgunluk ve potansiyellerine göre otomatik talim veya dinlenme nöbeti ata">Nöbet Dağıt (${idleCount})</button>` : ''}</div>`}
    ${ocakPortraitList}
    <div class="ocak-cards">${careerCard()}${goalsCard()}</div>
  </div>`;
}
function goalsCard() {
  const gs = activeGoals(3);
  if (!gs.length) return '';
  return `<aside class="scroll-card goals ${UI.goalsOpen ? '' : 'shut'}"><button class="sc-h" data-a="goals">Hedefler <span>${UI.goalsOpen ? '−' : '+'}</span></button>
    ${UI.goalsOpen ? `<ol>${gs.map(g => `<li><span>${g.t}</span><span class="gold-t">${ui('gold')}${g.r}</span></li>`).join('')}</ol>` : ''}</aside>`;
}
function tileDrawer() {
  const i = UI.tile, t = S.grid[i];
  let body = '';
  if (!t.open) {
    if (!canClear(i)) body = `<p class="mute">Bu çalılığa ulaşmak için önce yanındaki araziyi açmalısın.</p>`;
    else { const c = clearCost(); body = `<div class="clearbox"><p>Dikenleri söküp taşları kenara yığarsan ocak bir kare büyür. Her yeni kare biraz daha pahalı.</p><button class="btn primary" data-a="clear" ${S.gold < c ? 'disabled' : ''}>Araziyi aç · ${goldTxt(c)}</button></div>`; }
    return drawer('Çalılık', body);
  }
  if (!t.b) {
    const [g, ks] = BUILD_GROUPS[UI.buildTab];
    const tabs = BUILD_GROUPS.map(([n], k) => `<button class="seg ${UI.buildTab === k ? 'on' : ''}" data-a="btab" data-k="${k}">${n}</button>`).join('');
    const card = k => {
      const B = BUILD[k]; let why = '';
      if (!B.multi && hasB(k)) why = 'Zaten kurulu';
      else if (B.un && S.un < B.un) why = `${B.un} ün gerekir`;
      else if (S.gold < B.fiyat) why = `${B.fiyat - S.gold} altın eksik`;
      return `<div class="bcard ${why ? 'off' : ''}" data-hover><div class="bart">${buildingIcon(k)}</div><b>${B.ad}</b><small>${B.d}</small><button class="btn ${why ? 'ghost' : 'primary'} sm" data-a="build" data-k="${k}" ${why ? 'disabled' : ''}>${why || 'Kur · ' + goldTxt(B.fiyat)}</button></div>`;
    };
    return drawer('Boş arsa', `<div class="segs">${tabs}</div>${pager('build' + UI.buildTab, ks, PER(4, 2), card)}`, 'wide');
  }
  const B = BUILD[t.b];
  let info = '';
  if (t.b === 'in') { const H = housing(); const rs = S.dragons.filter(d => H[d.id] === i); info = rs.length ? `<div class="residents">${rs.map(d => `<button class="resi" data-a="sel" data-id="${d.id}">${dragonSVG(d, { still: true })}<b>${esc(d.name)}</b><small>Konfor ${comfortOf(d, H)} · ${comfortWord(comfortOf(d, H))}</small></button>`).join('')}</div>` : '<p class="mute">Boş. Yeni gelen ejderhalar buraya yerleşir.</p>'; }
  if (t.b === 'kulucka') info = `<p>${S.eggs.filter(e => e.inK).length}/2 yumurta ısınıyor. <button class="link" data-a="go" data-v="yuva">Yuva'ya git</button></p>`;
  let block = '';
  if (t.b === 'in' && capacity() - 2 < S.dragons.length) block = 'Burada yaşayanlar var.';
  if (t.b === 'kulucka' && S.eggs.some(e => e.inK)) block = 'İçinde yumurta var.';
  return drawer(B.ad, `<div class="binfo"><div class="bart big">${buildingIcon(t.b)}</div><div><p>${B.d}</p>${info}
    ${t.b === 'mezar' ? '' : `<button class="btn ${UI.arm === 'demolish' ? 'danger' : 'ghost danger'} sm" data-a="demolish" ${block ? 'disabled' : ''}>${UI.arm === 'demolish' ? `Yık, geri alınamaz · ${Math.floor(B.fiyat / 2)} altın geri` : `Yık · ${Math.floor(B.fiyat / 2)} altın geri`}</button>${block ? ` <small class="mute">${block}</small>` : ''}`}</div></div>`);
}
function drawer(title, body, cls = '') {
  return `<section class="drawer ${cls}" role="dialog" aria-label="${esc(title)}"><header><h3>${title}</h3><button class="icb" data-a="close-drawer" aria-label="Kapat">${ui('x')}</button></header><div class="dbody">${body}</div></section>`;
}

/* ================= AHIR (galeri) ================= */
function ahirView() {
  if (typeof registerAllHeirlooms === "function") registerAllHeirlooms();
  if (!S.dragons.length) return `<div class="empty-hall"><h2>İnler boş</h2><p>Pazardan bir ejderha al, seferde yakala ya da bir yumurtayı kuluçkaya yatır.</p>${memorial()}</div>`;
  if (!byId(UI.sel)) UI.sel = S.dragons[0].id;
  const i = S.dragons.findIndex(d => d.id === UI.sel), d = S.dragons[i], n = S.dragons.length;
  const prev = S.dragons[(i - 1 + n) % n], next = S.dragons[(i + 1) % n];
  const H = housing(), cf = comfortOf(d, H);
  const tt = taskText(d);
  const busy = !canAct(d);
  const act = (a, ic, label, sub, dis, on) => `<button class="actb ${on ? 'on' : ''}" data-a="${a}" ${dis ? 'disabled' : ''}><span class="aicw">${actIcon(ic)}</span><span class="at"><b>${label}</b><small>${sub}</small></span>${on ? '<em>bu hafta</em>' : ''}</button>`;
  if (UI.rosterSel !== d.id) { UI.pg.roster = Math.floor(i / 8); UI.rosterSel = d.id; }
  const roster = n > 1 ? `<div class="roster">${pager('roster', S.dragons, 8, x => `<button class="rcell ${x.id === d.id ? 'on' : ''} ${needsOrder(x) ? 'idle' : 'set'} ${isStar(x) ? 'star' : ''}" data-a="sel" data-id="${x.id}" title="${esc(x.name)}${isStar(x) ? ' · yıldız' : supporting(x) ? ' · ' + ROLES[x.role].ad : needsOrder(x) ? ' · görev bekliyor' : ''}">${dragonSVG(x, { still: true })}<span>${esc(x.name)}</span>${x.wish ? '<i class="wdot" title="Bir dileği var"></i>' : ''}</button>`)}</div>` : '';
  const ct = d.task && d.task.t;
  const idleCount = S.dragons.filter(x => needsOrder(x)).length;
  const mobTab = UI.mobAhirTab || 'actions';
  const mobQuickStats = `<div class="mob-ahir-quickstats">
    <span><b>GÜÇ</b> ${d.st.gu}<small>/${capOf(d, 'gu')}</small></span>
    <span><b>ÇEV</b> ${d.st.ce}<small>/${capOf(d, 'ce')}</small></span>
    <span><b>DAY</b> ${d.st.da}<small>/${capOf(d, 'da')}</small></span>
    <span><b>ZEK</b> ${d.st.ze}<small>/${capOf(d, 'ze')}</small></span>
    <span class="${d.fat >= 60 ? 'bad' : d.fat >= 35 ? 'warn' : 'good'}">${ui('flame')}${d.fat}</span>
  </div>`;
  const mobTabs = `<div class="mob-ahir-tabs" role="tablist">
    <button class="mob-ahir-tab ${mobTab === 'actions' ? 'on' : ''}" data-a="mob-ahir-tab" data-tab="actions" role="tab">⚡ Eylemler & Talim</button>
    <button class="mob-ahir-tab ${mobTab === 'kunye' ? 'on' : ''}" data-a="mob-ahir-tab" data-tab="kunye" role="tab">📊 Künye, Genler & Evrim</button>
  </div>`;
  return `<div class="ahir mob-tab-${mobTab}">
    <div class="showroom">
      ${n > 1 ? `<button class="arrow l" data-a="sel" data-id="${prev.id}" aria-label="Önceki">${ui('left')}</button><button class="arrow r" data-a="sel" data-id="${next.id}" aria-label="Sonraki">${ui('right')}</button>` : ''}
      <div class="nameplate"><h2 data-a="rename-start" title="Adını değiştirmek için dokun">${esc(d.name)}</h2>${starBadge(d)}${titleTag(d)}
        <div class="np-sub">${sexIc(d.sex)} ${elChip(d.el)} ${d.hybrid && typeof HYBRID_MAP !== 'undefined' && HYBRID_MAP[d.hybrid] ? `<span class="trait sm good"><b>${HYBRID_MAP[d.hybrid].ad}</b></span>` : ''} <span>${d.retired ? 'Emekli · hoca' : d.old ? 'Yaşlı · hoca' : STAGE_AD[d.stage]}</span>${d.eternalYouth ? ` <span class="trait sm good"><b>Sonsuz Gençlik Mühürlü · Topçu Silahı</b></span>` : ''}${d.heart ? `<span class="dot">·</span><span class="heartb">${ui('heart')} can bağı</span>` : ''}<span class="dot">·</span><span>${d.gen}. nesil</span><span class="dot">·</span><span>${d.age} haftalık</span></div>
        <div class="np-sub mute">${d.parents ? `${esc(d.parents[0])} × ${esc(d.parents[1])}` : esc(d.origin)}</div></div>
      ${d.wish ? `<div class="wish"><span>Dileği</span>${esc(wishText(d))}</div>` : ''}
      ${d.task && d.task.t === 'rest' && d.stage === 'yetiskin' && hasPose(d, 'P15') ? `<div class="hero-dr sleep" id="hero">${poseSVG(d, 'P15', { face: 'r' })}<i class="zz">z</i><i class="zz z2">z</i><i class="zz z3">Z</i></div>` : `<div class="hero-dr" id="hero">${dragonSVG(d)}</div>`}
      <div class="ribbon ${busy ? 'busy' : tt || supporting(d) ? 'set' : 'idle'}"><span>${tt ? esc(tt) : supporting(d) ? `Destek: ${ROLES[d.role].ad} · her hafta` : 'Bu hafta görev bekliyor'}</span>${idleCount > 0 ? ` <button class="btn primary sm btn-auto-order" data-a="auto-assign-idle" title="Boştaki tüm ejderhalara yorgunluk ve potansiyellerine göre otomatik talim veya dinlenme nöbeti ata">Nöbet Dağıt (${idleCount})</button>` : ''}</div>
      ${roster}
    </div>
    ${mobTabs}
    ${mobQuickStats}
    <aside class="kunye">
      <div class="gauges">
        <div><span>Bağ</span>${heartGauge(d.bond)}</div>
        <div><span>Moral</span>${moodFace(normMood(d.mood))}<b>${MOOD[normMood(d.mood)]}</b></div>
        <div><span>Yorgunluk</span><span class="flamemeter ${d.fat >= 60 ? 'hot' : d.fat >= 35 ? 'warm' : ''}">${ui('flame')}${meter(d.fat, 100, d.fat >= 60 ? 'bad' : d.fat >= 35 ? 'warn' : 'ok')}<b>${d.fat}</b></span></div>
        <div><span>Konfor</span><b>${comfortWord(cf)}</b><small class="mute">(${cf})</small></div>
      </div>
      <h4 class="ksec">Yetenekler <small>şu an · sınır · potansiyel</small></h4>${statBars(d)}
      <div class="marks">${marks(d).map(m => `<span class="mark">${m}</span>`).join('') || '<span class="mute sm">Karakteri henüz şekillenmedi</span>'}</div>
      <div class="kbtns"><button class="btn ghost sm" data-a="drawer" data-k="info" title="Künye ve genler">Künye</button><button class="btn ghost sm" data-a="drawer" data-k="role" title="Ünvan ve destek görevi">Ünvan</button><button class="btn ghost sm" data-a="drawer" data-k="tree" title="Soy ağacı">Soy</button><button class="btn ghost sm" data-a="mp-card" title="Ocak Fermanı ve Sancak">Ferman</button><button class="btn ghost sm" data-a="ward" title="Süsle">Süsle</button>${typeof canForgeHeirloom === "function" && canForgeHeirloom(d) ? `<button class="btn ghost sm" data-a="forge-heirloom" data-id="${d.id}">Yadigâr</button>` : ""}${typeof canAwakenHybrid === 'function' && canAwakenHybrid(d) ? `<button class="btn primary sm" data-a="awaken-hybrid" data-id="${d.id}">Melez (${awakenCost(d)})</button>` : ''}</div>
    </aside>
    <aside class="actions">
      ${act('drawer-train', 'train', 'Antrenman', ct === 'train' ? `${ST_AD[d.task.k]} çalışıyor` : busy ? 'bu hafta meşgul' : 'değer kazan', d.inj || (d.task && d.task.t === 'done'), ct === 'train')}
      ${act('rest', 'rest', 'Dinlen', `yorgunluk −${hasB('kaynak') ? 55 : 40}`, d.inj || (d.task && d.task.t === 'done'), ct === 'rest')}
      ${act('drawer-walk', 'walk', 'Gezinti', ct === 'walk' ? byId(d.task.p)?.name || '' : 'yakınlık kur', d.inj || d.stage === 'yavru' || (d.task && d.task.t === 'done'), ct === 'walk')}
      ${act('talk', 'talk', 'Konuş', d.talked ? 'bu hafta konuştunuz' : 'karakterini şekillendir', d.talked)}
      ${act('drawer-feed', 'feed', 'İkram', d.fed && !(d.stage === 'yavru' && !d.eternalYouth && S.food.genclik > 0) ? 'bu hafta yedi' : 'moral, bağ ve iksir', d.fed && !(d.stage === 'yavru' && !d.eternalYouth && S.food.genclik > 0))}
      ${act('care', 'care', 'Bakım', (d.dirt || 0) >= 15 ? `${dirtWord(d.dirt)} · yıka, besle, oyna` : 'yıka, besle, oyna', false, false)}
      ${act('drawer-gear', 'gear', 'Kuşan', `${Object.values(d.equip).filter(v => v != null).length}/4 yuva dolu`)}
    </aside>
    ${UI.drawer ? ahirDrawer(d) : ''}
  </div>`;
}
function memorial() {
  if (!S.dead.length) return '';
  return `<div class="memorial">${S.dead.map(d => `<div class="grave">${dragonSVG({ ...d, dead: true }, { still: true })}<b>${esc(d.name)}</b><small>${d.cause}</small></div>`).join('')}</div>`;
}
function ahirDrawer(d) {
  const k = UI.drawer;
  if (k === 'role') return roleDrawer(d);
  if (k === 'career') return careerDrawer();
  if (k === 'train') {
    const styles = Object.keys(STYLES).map(s => `<button class="seg ${d.style === s ? 'on' : ''}" data-a="style" data-s="${s}"><b>${STYLES[s].ad}</b><small>${STYLES[s].d}</small></button>`).join('');
    const icons = { gu: 'agirlik', ce: 'parkur', da: 'kaynak', ze: 'magara' };
    const cards = STATS.map(st => {
      const c = trainCalc(d, st); const on = d.task && d.task.t === 'train' && d.task.k === st;
      return `<button class="tcard ${on ? 'on' : ''}" data-a="train" data-k="${st}"><div class="tart">${buildingIcon(icons[st])}</div><b>${ST_AD[st]}</b>
        <span class="gain">${c.capped ? 'Sınırda' : '+' + c.gain}<small>${c.capped ? '' : ST_KISA[st]}</small></span>${c.sec ? `<span class="sec">+${c.sec} ${ST_KISA[c.sk]}</span>` : ''}
        <span class="risk ${c.fail >= 30 ? 'bad' : c.fail > 0 ? 'warn' : ''}">${ui('flame')} %${c.fail}</span>${hasB(SPEC[st]) ? '<span class="fac">tesis</span>' : ''}</button>`;
    }).join('');
    const mIdx = normMood(d.mood);
    return drawer(`${esc(d.name)} · antrenman`, `<p class="mute sm">Moral ${(MOOD[mIdx] || 'Normal').toLowerCase()}: kazanç ×${MOOD_MULT[mIdx] ?? 1}. Alevli sayı sakatlanma ihtimali.</p><div class="segs styles">${styles}</div><div class="tcards">${cards}</div>`, 'wide');
  }
  if (k === 'walk') {
    const ps = S.dragons.filter(x => x !== d && !x.inj && x.stage !== 'yavru' && (!x.task || x.task.p === d.id));
    const cur = d.task && d.task.t === 'walk' ? d.task.p : null;
    return drawer(`${esc(d.name)} kiminle gezsin?`, ps.length ? pager('walk', ps, PER(5, 2), p => `<button class="pcard ${cur === p.id ? 'on' : ''}" data-a="walkwith" data-id="${p.id}" data-hover>${dragonSVG(p, { still: true, flip: true })}<b>${esc(p.name)} ${sexIc(p.sex)}</b>${heartGauge(getAff(d.id, p.id))}<small>${compat(d, p) >= 4 ? 'Karakterleri uyumlu' : 'Sıradan bir uyum'}</small></button>`) : '<p class="mute">Bu hafta gezintiye çıkabilecek başka bir genç ya da yetişkin ejderha yok.</p>');
  }
  if (k === 'feed') {
    const fs = Object.keys(FOODS).filter(f => S.food[f] > 0);
    return drawer(`${esc(d.name)} için ikram`, fs.length ? `${pager('feed', fs, PER(6, 3), f => {
      const onlyB = FOODS[f].onlyBaby;
      const badge = onlyB ? (d.stage === 'yavru' ? ' · <span class="good">Yavruya İçirilebilir</span>' : ' · <span class="bad">Sadece Yavrular İçebilir</span>') : (d.favKnown && d.fav === f ? ' · <span class="heart">en sevdiği</span>' : '');
      return `<button class="fcard ${onlyB && d.stage !== 'yavru' ? 'off' : ''}" data-a="feed" data-f="${f}" data-hover>${foodIcon(f)}<b>${FOODS[f].ad}</b><small>×${S.food[f]}${badge}</small></button>`;
    })}<p class="mute sm">Sonsuz Gençlik İksiri yalnızca Yavru ejderhalara içirilebilir ve yavruyu Zindan & Topçu savaşlarında silahın yapar.</p>` : `<p class="mute">Kilerde ikram edecek bir şey yok.</p><button class="btn sm" data-a="go" data-v="pazar">Pazara git</button>`);
  }
  if (k === 'gear') {
    const slots = Object.keys(SLOT_AD).map(s => {
      const cur = d.equip[s] != null ? S.inv.find(i => i.uid === d.equip[s]) : null;
      const opts = S.inv.filter(i => ITEMS[i.id].slot === s && i !== cur);
      return `<div class="gslot"><h4>${SLOT_AD[s]}</h4>${cur ? `<div class="gitem on">${itemIcon(cur.id)}<span><b>${ITEMS[cur.id].ad}</b><small>${itemDesc(ITEMS[cur.id])}</small></span><button class="btn ghost sm" data-a="unequip" data-s="${s}">Çıkar</button></div>` : '<div class="gitem empty">Boş</div>'}
        ${opts.length ? pager('gear-' + s, opts, 2, i => { const w = equippedBy(i.uid); return `<button class="gitem" data-a="equip" data-s="${s}" data-uid="${i.uid}">${itemIcon(i.id)}<span><b>${ITEMS[i.id].ad}</b><small>${itemDesc(ITEMS[i.id])}${w ? ` · şu an ${ek(esc(w.name), 'loc')}` : ''}</small></span></button>`; }, true) : ''}</div>`;
    }).join('');
    return drawer(`${esc(d.name)} · kuşam`, `<div class="gslots">${slots}</div>${S.inv.length ? '' : '<p class="mute sm">Sandığın boş. Pazardaki Usta Kerim\'den pençe, zırh, miğfer ve tılsım alabilirsin. <button class="link" data-a="go" data-v="pazar">Pazara git</button></p>'}`, 'wide');
  }
  if (k === 'tree') {
    const node = (id, role, big) => {
      const L = linGet(id);
      if (!L) return `<div class="tnode unk ${big ? 'big' : ''}"><div class="tart">?</div><b>Bilinmiyor</b><small>${role}</small></div>`;
      const st = L.d.dead ? 'öldü' : L.d.sold ? 'ocaktan ayrıldı' : '';
      return `<div class="tnode ${big ? 'big' : ''} ${L.d.dead ? 'dead' : ''}"><div class="tart">${dragonSVG(L.d, { still: true })}</div><b>${esc(L.name)} ${sexIc(L.sex)}</b><small>${role}${st ? ' · ' + st : ''}</small></div>`;
    };
    const P = d.pids || [], gp = id => (linGet(id)?.pids) || [];
    const origin = !P.length ? `<p class="mute sm torigin">${esc(d.origin || 'Kökeni bilinmiyor')}. Soyu burada başlıyor.</p>` : '';
    const kids = S.dragons.concat(S.dead).filter(x => x.pids && x.pids.includes(d.id));
    return drawer(`${esc(d.name)} · soy ağacı`, `<div class="tree">
      ${P.length ? `<div class="trow g2">${[0, 1].map(i => [0, 1].map(j => node(gp(P[i])[j], i ? 'anneanne / büyükbaba' : 'babaanne / büyükbaba')).join('')).join('')}</div>
      <div class="trow g1">${node(P[0], 'ebeveyn')}${node(P[1], 'ebeveyn')}</div>` : origin}
      <div class="trow g0">${node(d.id, `${d.gen}. nesil`, true)}</div>
      ${kids.length ? `<h4>Yavruları</h4><div class="trow kids">${kids.slice(0, 6).map(x => node(x.id, `${x.gen}. nesil`)).join('')}</div>` : ''}
    </div>`, 'wide');
  }
  if (k === 'info') {
    const axes = ['ces', 'sic', 'dis'].map(ax => { const v = d.pers[ax], A = AXES[ax]; return `<div class="axis"><span class="an ${v <= -MARK_T ? 'on' : ''}">${A.n}</span><span class="atrack"><i class="th l"></i><i class="th r"></i><b style="left:${(v + 100) / 2}%"></b></span><span class="ap ${v >= MARK_T ? 'on' : ''}">${A.p}</span></div>`; }).join('');
    const mk = ['ces', 'sic', 'dis'].map(ax => { const m = markOf(d, ax); if (!m) return ''; const A = AXES[ax]; return `<p class="markc"><b>${m}</b> ${m === A.p ? A.pd : A.nd}</p>`; }).join('');
    const traits = d.traits.map(t => `<div class="trait"><b>${TRAITS[t].ad}</b><small>${TRAITS[t].d}</small></div>`).join('') || '<p class="mute sm">Belirgin bir özelliği yok.</p>';
    const sw = c => `<i class="eyedot" style="--c:${colCss(c, 52)}"></i>`;
    const alC = (k, x) => x === 'n' ? sw(NATIVE[d.el][k]) + 'yerli' : sw(RENK[x]) + RENK[x].ad;
    const pigA = x => ({ N: 'N', a: 'ak (a)', m: 'kara (m)' }[x]), boyA = x => ({ i: 'iri', o: 'orta', k: 'küçük' }[x]);
    const G2 = [['Element', d.genes.el.map(e => EL_AD[e]).join(' / ')], ['Göz rengi', eyeAlleles(d).map(x => `<i class="eyedot" style="--c:${EYEC[x].c}"></i>${EYEC[x].ad}`).join(' / ')],
      ['Pul rengi', GL(d, 'pul').map(x => alC('pul', x)).join(' / ')], ['Süs rengi', GL(d, 'sus').map(x => alC('sus', x)).join(' / ')],
      ['Pigment', GL(d, 'pig').map(pigA).join(' / ')], ['Parıltı', GL(d, 'par').map(x => x === 'P' ? 'var' : 'yok').join(' / ')],
      ['Boy', GL(d, 'boy').map(boyA).join(' / ')], ['Desen', d.genes.pat.join(' / ')], ['Parlak göz', d.genes.eye.map(x => x === 'A' ? 'taşıyor' : 'yok').join(' / ')], ['Boynuz', d.genes.horn.join(' / ')],
      ...STATS.map(k2 => [ST_AD[k2], `${GRADE[d.genes.pot[k2][0]]} / ${GRADE[d.genes.pot[k2][1]]}`])];
    const genes = labOn() || langLv() >= 3 ? `<div class="gtab2">${G2.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`
      : `<p class="mute sm">Görünen: ${EL_AD[d.el]}, ${lookText(d)}, ${PAT_AD[d.pat].toLowerCase()}, ${EYEC[eyeColor(d)].ad.toLowerCase()} gözlü${d.eye === 'A' ? ', parlak hareli' : ''}.${pigOf(d) !== 'N' ? ` <b>${PIG_AD[pigOf(d)]}:</b> ${PIG_D[pigOf(d)]}` : ''} Gizli genleri Gen Laboratuvarı gösterir.</p>`;
    return drawer(`${esc(d.name)} · künye`, `<div class="infocols"><div><h4>Karakter</h4>${axes}${mk || '<p class="mute sm">Bir eksen 40\'ı geçince kalıcı bir iz belirir.</p>'}</div><div><h4>Özellikler</h4>${traits}<h4>Genler</h4>${genes}</div>
      <div><h4>Yetenekler <small class="mute">${(d.cards || []).length}/${CARD_MAX}</small></h4>${(d.cards || []).length ? `<div class="kcards">${d.cards.map(c => cardFace(c)).join('')}</div>` : '<p class="mute sm">Henüz kart yok. Bir yeteneği 60, 90 ya da 120\'yi aşınca ya da bağınız 60\'a varınca kart öğrenebilir.</p>'}
      <h4>Kayıt</h4><p>${d.w} zafer · ${d.l} yenilgi<br>Değeri ${goldTxt(value(d))}<br>Sevdiği yemek: <b>${d.favKnown ? FOODS[d.fav].ad : 'bilinmiyor'}</b></p>
      <label class="rename-l">Adı <input id="rename" value="${esc(d.name)}" maxlength="16"></label></div></div>`, 'wide');
  }
  return '';
}

/* ================= YUVA ================= */
function yuvaView() {
  const inK = S.eggs.filter(e => e.inK), out = S.eggs.filter(e => !e.inK);
  const has = hasB('kulucka');
  const nest = [0, 1].map(i => {
    const e = inK[i];
    if (!e) return `<div class="nslot empty"><span>${has ? 'Boş yuva' : ''}</span></div>`;
    return `<div class="nslot">${eggSVG(e, e.w / 2, { cls: e.w >= 1 ? 'wobble' : '', glow: true })}<div class="moons">${[0, 1].map(k => `<i class="${k < e.w ? 'on' : ''}"></i>`).join('')}</div><small>${esc(e.origin)}</small><button class="btn ghost sm" data-a="egg-out" data-id="${e.id}">Kuluçkadan çıkar</button></div>`;
  }).join('');
  const basket = pager('basket', out, 2, e => `<div class="bslot">${eggSVG(e)}<small>${esc(e.origin)}</small><button class="btn sm" data-a="egg-in" data-id="${e.id}" ${kuluckaFree() > 0 ? '' : 'disabled'}>Kuluçkaya koy</button></div>`, true);
  const adults = S.dragons.filter(d => d.stage !== 'yavru');
  const pairs = [];
  for (let i = 0; i < adults.length; i++) for (let j = i + 1; j < adults.length; j++) { const [A, B] = adults[i].sex === 'F' ? [adults[j], adults[i]] : [adults[i], adults[j]]; pairs.push([A, B]); }
  pairs.sort((a, b) => (b[0].sex !== b[1].sex) - (a[0].sex !== a[1].sex) || getAff(b[0].id, b[1].id) - getAff(a[0].id, a[1].id));
  const CK = ['yuva', 'sex', 'adult', 'aff', 'mood', 'health'];
  const pairHtml = pairs.length ? pager('pairs', pairs, PER(3, 1), ([A, B]) => {
    const aff = getAff(A.id, B.id), romance = A.sex !== B.sex;
    const checks = breedChecks(A, B), ok = checks.every(c => c[1]);
    const pairOn = A.task && A.task.p === B.id;
    const busy = (!canAct(A) || !canAct(B)) && !pairOn;
    return `<div class="couple ${pairOn ? 'on' : ''} ${romance ? 'rom' : ''}">
      <div class="cpl">${dragonSVG(A, { still: true })}<div class="bigheart" style="--f:${aff}%"><img src="${asset('ui-heart') || 'img/ui/ui-heart.webp'}" class="bigheart-img" alt=""><b>${aff}</b></div>${dragonSVG(B, { still: true, flip: true })}</div>
      <div class="cn"><b>${esc(A.name)}</b> ${sexIc(A.sex)} <span class="mute">&</span> <b>${esc(B.name)}</b> ${sexIc(B.sex)}</div>
      ${romance ? `<div class="checks">${checks.map(([t, v], k) => `<span class="ck ${v ? 'ok' : ''}" title="${t}">${t}</span>`).join('')}</div>` : '<p class="mute sm">Dostluk kurarlar; yumurta olmaz.</p>'}
      <div class="cact">
        <button class="btn sm" data-a="walkpair" data-x="${A.id}" data-y="${B.id}" ${busy ? 'disabled' : ''}>${pairOn && A.task.t === 'walk' ? 'Gezintiyi iptal et' : 'Gezintiye çıkar'}</button>
        ${romance ? `<button class="btn sm love" data-a="breedpair" data-x="${A.id}" data-y="${B.id}" ${!ok || busy ? 'disabled' : ''}>${pairOn && A.task.t === 'breed' ? 'İptal' : `Yuva kur · %${breedChance(A, B)}`}</button><button class="btn ghost sm" data-a="odds" data-x="${A.id}" data-y="${B.id}">Kehanet</button>` : ''}
      </div></div>`;
  }) : '';
  return `<div class="yuva">
    <section class="hatchery">
      <div class="hearth">${has ? `<div class="hearth-art warm">${asset('b-kulucka') ? `<img src="${asset('b-kulucka')}" alt="">` : buildingIcon('kulucka')}</div><div class="nslots">${nest}</div>` : `<div class="hearth-art cold">${asset('b-kulucka') ? `<img src="${asset('b-kulucka')}" alt="">` : buildingIcon('kulucka')}</div><p>Kuluçka Ocağı henüz kurulmadı. <button class="link" data-a="go" data-v="ocak">Ocak'ta kur</button></p>`}</div>
      ${out.length ? `<div class="basket"><h4>Yumurta sepeti</h4><div class="bslots">${basket}</div></div>` : ''}
    </section>
    <section class="couples"><h3 class="sect">Çiftler</h3><p class="mute sm">Gezinti, aynı inde yaşamak ve olaylar yakınlığı artırır. Yuva kurmak için bir dişi ve bir erkek, Yuva Bahçesi, en az 60 yakınlık ve iyi moral gerekir.${labOn() ? '' : ' Kehaneti netleştirmek için Gen Laboratuvarı kur.'}</p>
      <div class="cgrid">${pairHtml || '<p class="mute">Yakınlık kurabilmek için en az iki genç ya da yetişkin ejderha gerekir.</p>'}</div></section>
  </div>`;
}
let CUR_ODDS = null;
function colorKey(k, el, part) {
  if (k === 'n') return { ...NATIVE[el][part], native: true };
  if (k.includes('+')) { const [x, y] = k.split('+'); return expColor([x, y], part === 'pul' ? PUL_DOM : SUS_DOM, NATIVE[el][part]); }
  return RENK[k];
}
function looksOdds(A, B, O, lab) {
  const sw = c => `<i class="eyedot big" style="--c:${colCss(c, 52)}"></i>`;
  const dist = (o, f) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, p]) => `<span>${f(k)}<b>%${Math.round(p)}</b></span>`).join('');
  const colRow = part => dist(O[part], k => { const c = colorKey(k, A.el, part); return sw(c) + c.ad + ' '; });
  if (!lab) {
    return `<p class="sm">Görünenler: <b>${esc(A.name)}</b> ${lookText(A)}; <b>${esc(B.name)}</b> ${lookText(B)}.</p>
      <p class="mute sm">Renk, pigment ve boy genlerinin gizli alelleri ancak Gen Laboratuvarı'nda görünür. Ak ve kara gibi çekinik genler kuşak atlayabilir: iki normal görünen ejderhadan ak bir yavru doğabilir.</p>`;
  }
  const pa = GL(A, 'pul'), pb = GL(B, 'pul');
  const cell = (x, y) => { const c = expColor([x, y], PUL_DOM, NATIVE[A.el].pul); return `<td>${sw(c)}<small>${c.ad}</small></td>`; };
  const al = x => x === 'n' ? 'yerli' : RENK[x].ad;
  const punnett = `<table class="punnett"><tr><th></th>${pb.map(y => `<th>${esc(B.name)}<br><small>${al(y)}</small></th>`).join('')}</tr>${pa.map(x => `<tr><th>${esc(A.name)}<br><small>${al(x)}</small></th>${pb.map(y => cell(x, y)).join('')}</tr>`).join('')}</table>`;
  return `<div class="lookodds"><div><h4>Pul rengi · Punnett karesi</h4>${punnett}<p class="mute sm">Her ebeveyn iki alelinden birini verir. Baskın olan görünür; eşit baskın iki renk karışır.</p></div>
    <div><h4>Pul rengi</h4><div class="eyeodds">${colRow('pul')}</div>
    <h4>Süs rengi <small class="mute">(${SUS_AD[A.el]})</small></h4><div class="eyeodds">${colRow('sus')}</div>
    <h4>Pigment</h4><div class="eyeodds">${dist(O.pig, k => PIG_AD[k] + ' ')}</div>
    <h4>Parıltı · Boy</h4><div class="eyeodds">${dist(O.par, k => k === 'P' ? 'Parıltılı ' : 'Parıltısız ')}${dist(O.boy, k => BOY_AD[k] + ' ')}</div></div></div>`;
}
function oddsModal(A, B, tab = 'genel') {
  CUR_ODDS = { A, B };
  const aff = getAff(A.id, B.id), O = offspringOdds(A, B, aff), lab = labOn();
  const tabs = `<div class="ctabs otabs">${[['genel', 'Element ve güç'], ['gorunus', 'Görünüş']].map(([k, n]) => `<button class="ctab ${tab === k ? 'on' : ''}" data-a="otab" data-k="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'gorunus') {
    showModal(`<div class="parch"><p class="kicker">Kehanet</p><h2>${esc(A.name)} × ${esc(B.name)}</h2>${tabs}${looksOdds(A, B, O, lab)}
      <p class="mute sm">Her yavruda renk genlerinde %3, pigmentte %1,5 ihtimalle mutasyon olur.</p><div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div></div>`, 'paper');
    return;
  }
  const els = lab ? Object.entries(O.el).sort((a, b) => b[1] - a[1]).map(([e, p]) => `<div class="oel">${eggSVG({ id: 'x' + e, genes: { el: [e, e] } })}<b>%${p}</b>${elChip(e)}</div>`).join('') : `<p>${elChip(A.el)} ya da ${elChip(B.el)}… belki gizli bir şey. <span class="mute">(Laboratuvar gerekli)</span></p>`;
  const pots = STATS.map(k => { const o = O.pot[k]; return `<tr><td>${ST_AD[k]}</td><td>${lab ? potLetter(Math.round(o.exp)) : '?'}</td><td>${lab ? `${potLetter(o.best)} <small>%${o.pBest}</small>` : '?'}</td><td>${lab ? potLetter(o.worst) : '?'}</td></tr>`; }).join('');
  const tr = Object.entries(O.tr).map(([t, p]) => `<span class="trait"><b>${TRAITS[t].ad}</b><small>%${p}</small></span>`).join('') || '<span class="mute">Aktarılacak özellik yok.</span>';
  showModal(`<div class="parch"><p class="kicker">Kehanet</p><h2>${esc(A.name)} × ${esc(B.name)}</h2>${tabs}
    <div class="orow"><div><h4>Yumurtanın rengi</h4><div class="oels">${els}</div></div><div>
    <h4>Göz rengi</h4><div class="eyeodds">${lab ? Object.entries(O.eyec).sort((a, b) => b[1] - a[1]).map(([e, p]) => `<span><i class="eyedot big" style="--c:${EYEC[e].c}"></i><b>%${Math.round(p)}</b> ${EYEC[e].ad}</span>`).join('') : `<span><i class="eyedot big" style="--c:${EYEC[eyeColor(A)].c}"></i>${EYEC[eyeColor(A)].ad}</span><span><i class="eyedot big" style="--c:${EYEC[eyeColor(B)].c}"></i>${EYEC[eyeColor(B)].ad}</span><span class="mute">… ya da ikisinin de taşıdığı gizli bir renk. (Laboratuvar gerekli)</span>`}</div>
    <h4>Parlak göz (hare)</h4><p>${lab ? `%${Math.round(O.gold)}${O.gold === 0 ? '. Ebeveynlerden en az biri taşıyıcı değil.' : ''}` : 'Çekinik bir gen; taşıyıcıları yalnızca laboratuvar görür.'}</p></div></div>
    <h4>Potansiyel</h4><div class="tablewrap"><table class="otab"><tr><th></th><th>Beklenen</th><th>En iyi</th><th>En kötü</th></tr>${pots}</table></div>
    <h4>Özellik aktarımı</h4><div class="traits">${tr}</div>
    <p class="mute sm">Her yavruda %8 ihtimalle bir gen mutasyona uğrar, %7 ihtimalle yeni bir özellik belirir.</p>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div></div>`, 'paper');
}

/* ================= ARENA ================= */
function arenaView() {
  const elig = S.dragons.filter(d => canAct(d));
  if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null;
  if (!UI.arenaSel && elig.length) UI.arenaSel = (elig.find(d => d.stage === 'yetiskin') || elig[0]).id;
  const f = byId(UI.arenaSel);
  const RACE_T = { ad: 'Gök Yarışı', d: 'Kanat kanada yarış, yalnız yetişkinler. Basılı tut, yüksel; halkalar hırs verir, öndekinin arkasına girersen rüzgâr kuyruğu seni çeker, hırs dolunca atıl. Çeviklik hız, dayanıklılık sağlamlık demek.', stages: ['yetiskin'] };
  const SARAY_T = { ad: 'Saray Zarafet Merasimi', d: 'Savaş gücü değil; soy asilliği, melez/nadir renkler, parıltı, temizlik ve 3 aşamalı koreografi yarışır.', stages: ['yavru', 'genc', 'yetiskin'] };
  const KULE_T = { ad: 'Kadim Gök Kulesi', d: 'Her katta değişen kule tılsımları, zafer sonrası seçilen kadim lütuflar ve kuşaktan kuşağa güçlenen Ata Yadigârı.', stages: ['genc', 'yetiskin'] };
  const yaris = UI.arenaTier === 'yaris', saray = UI.arenaTier === 'saray', kule = UI.arenaTier === 'kule', T = yaris ? RACE_T : saray ? SARAY_T : kule ? KULE_T : TIERS[UI.arenaTier];
  let lock = '';
  if (T.flag && !S.flags[T.flag]) lock = 'Bu kapının yerini henüz bilmiyorsun.';
  else if (T.unReq && S.un < T.unReq) lock = `Mermer kapıdaki bekçi seni içeri almıyor: ${T.unReq} ün gerekiyor (sende ${S.un}).`;
  const stoneDropMap = {
    yavru: { ic: 'img/ui/items/stone_kor_t1.webp', lbl: '2–3× Kıvılcım Kor (T1)' },
    koy:   { ic: 'img/ui/items/stone_kor_t1.webp', lbl: '2–3× Kıvılcım Kor (T1)' },
    sehir: { ic: 'img/ui/items/stone_kor_t2.webp', lbl: '3–4× T1 + 1–2× Harlı Kor (T2)' },
    cukur: { ic: 'img/ui/items/stone_kor_t3.webp', lbl: '2–4× T2 + 1–2× Magma (T3) + %35 Anka Mührü' },
    yaris: { ic: 'img/ui/items/stone_kor_t1.webp', lbl: 'Gök Yarışı Ödülü' },
    saray: { ic: 'img/ui/items/stone_kor_t2.webp', lbl: 'Saray Zarafet Ödülü' },
    kule:  { ic: 'img/ui/items/stone_kor_t3.webp', lbl: 'Her Kat 2–3× Magma (T3) · Boss Katı +1 Anka Mührü' },
  };
  const curStoneMeta = stoneDropMap[UI.arenaTier] || stoneDropMap.koy;
  const plaques = Object.keys(TIERS).map(k => { const t = TIERS[k], hidden = t.flag && !S.flags[t.flag]; return `<button class="plaque ${UI.arenaTier === k ? 'on' : ''} ${k === 'cukur' ? 'pit' : ''}" data-a="tier" data-k="${k}">${hidden ? '???' : t.ad}</button>`; }).join('');
  const posters = yaris ? raceBoard(f) : saray ? sarayBoard(f) : kule ? kuleBoard(f) : lock ? `<div class="poster locked"><p>${lock}</p></div>` : (S.arena[UI.arenaTier] || []).map((o, i) => {
    const okStage = f && T.stages.includes(f.stage) && !f.old;
    const adv = f ? elMult(f.el, o.el) : 1, dadv = f ? elMult(o.el, f.el) : 1;
    const risk = f && T.olum ? deathRisk(f, T.olum) : 0;
    const pw = Math.round(sum(STATS.map(k => o.st[k])) / 4);
    const mine = f ? Math.round(sum(STATS.map(k => f.st[k])) / 4) : 0;
    const ratio = mine ? (pw * dadv) / (mine * adv) : 9;
    const [stc, stt] = ratio < 0.82 ? ['easy', 'Kolay lokma'] : ratio < 1.06 ? ['even', 'Denk dövüş'] : ratio < 1.3 ? ['hard', 'Zorlu'] : ['deadly', 'Çok güçlü'];
    return `<div class="poster ${o.special ? 'special' : ''}" style="--rot:${[-2, 1.5, -1][i % 3]}deg"><i class="nail"></i>${f && okStage ? `<span class="stamp ${stc}">${stt}</span>` : ''}
      <div class="ph">${o.special || (UI.arenaTier === 'cukur' ? 'ÇUKURDA' : 'MEYDAN OKUYOR')}</div>
      <div class="pdr">${dragonSVG(o, { still: true, flip: true })}</div>
      <b class="pname">${esc(o.name)}</b><small>${esc(o.trainer)} · ${o.arch}</small>
      <div class="pmeta">${elChip(o.el)}${adv > 1 ? '<span class="good">üstünsün</span>' : dadv > 1 ? '<span class="bad">dezavantaj</span>' : ''}</div>
      <div class="pstats">${STATS.map(k => `<span>${ST_KISA[k]}<b>${o.st[k]}</b></span>`).join('')}</div>
      ${f ? `<div class="vsb ${stc}"><span>Sen <b>${mine}</b></span><i><em style="width:${clamp(mine / (mine + pw) * 100, 8, 92)}%"></em></i><span><b>${pw}</b> Rakip</span></div>` : ''}
      <div class="pfoot">${goldTxt(o.odul)} <span class="mute sm">+${T.un} ün</span>${T.olum ? `<span class="risk">${ui('skull')}%${risk}</span>` : ''}</div>
      <div style="font-size:10.5px;margin:2px 0 4px;display:flex;align-items:center;justify-content:center;gap:4px;color:#e8c478;"><img src="${curStoneMeta.ic}" style="width:14px;height:14px;object-fit:contain;" alt=""><span>${curStoneMeta.lbl}</span></div>
      <button class="btn ${UI.arenaTier === 'cukur' ? 'danger' : 'primary'} sm wide" data-a="fight" data-i="${i}" ${(!f || !okStage) ? 'disabled' : ''}>${!f ? 'Boşta dövüşçü yok' : okStage ? (UI.arm === 'fight:' + i ? `Ölüm riski %${risk} · yine de çık` : 'Meydan oku') : f.old ? 'Emekli, dövüşmüyor' : STAGE_AD[f.stage] + ' giremez'}</button></div>`;
  }).join('') || '<div class="poster locked"><p>Bu hafta başka rakip kalmadı.</p></div>';
  let tour = '';
  if (S.tour) {
    const Tt = S.tour; const okUn = S.un >= Tt.unReq; const cand = f && canAct(f) && f.stage === 'yetiskin' && !f.old;
    tour = `<div class="banner ${Tt.done ? 'done' : ''}"><h3>${Tt.ad}</h3>${Tt.done ? `<p>${Tt.summary || ''}</p>` : `<p>Üç tur, tek ejderha. Turlar arasında yaraların yarısı sarılır. Yenilgide ölüm riski %10. Şampiyona ${Tt.odul[2]} altın + <b>2× Anka Mühür Taşı & 3× Kadim Magma Taşı</b>.</p>
      ${okUn ? '' : `<p class="bad">Katılmak için ${Tt.unReq} ün gerekiyor (sende ${S.un}).</p>`}<button class="btn primary" data-a="tour" ${okUn && cand ? '' : 'disabled'}>${cand ? `${esc(f.name)} ile katıl` : 'Yetişkin bir dövüşçü seç'}</button>`}</div>`;
  }
  return `<div class="arena">
    ${tour}
    <section class="corner">
      <h3 class="sect">Dövüşçün</h3>${careerCard()}
      ${f ? `<div class="fighter">${dragonSVG(f)}<div class="fi"><b>${esc(f.name)}</b> ${elChip(f.el)}<div class="mini-g">${moodFace(f.mood)} <span class="flamemeter ${f.fat >= 60 ? 'hot' : ''}">${ui('flame')}${f.fat}</span> ${heartGauge(f.bond)}</div>${f.fat >= 60 ? '<small class="warn">Çok yorgun: hasarı düşer.</small>' : ''}</div></div>${statBars(f)}` : '<p class="mute">Bu hafta dövüşebilecek ejderha yok. Görevi olmayan bir ejderha gerekir.</p>'}
      <div class="fpick">${pager('fpick', elig, 4, d => `<button class="fp ${UI.arenaSel === d.id ? 'on' : ''}" data-a="fsel" data-id="${d.id}" title="${esc(d.name)}">${dragonSVG(d, { still: true })}<span>${esc(d.name)}</span></button>`)}</div>
      <div class="elcycle" title="Gölge herkese biraz üstün ama herkesten fazla hasar alır.">${['ates', 'buz', 'toprak', 'firtina', 'ates'].map(e => elChip(e)).join('<i>›</i>')}<span class="mute">Gölge: herkese üstün, herkesten fazla hasar alır</span></div>
    </section>
    <section class="board ${UI.arenaTier === 'cukur' ? 'pitboard' : ''}">
      <div class="plaques">${plaques}<button class="plaque sky ${yaris ? 'on' : ''}" data-a="tier" data-k="yaris">Gök Yarışı</button><button class="plaque royal ${saray ? 'on' : ''}" data-a="tier" data-k="saray">Saray Merasimi</button><button class="plaque pit ${kule ? 'on' : ''}" data-a="tier" data-k="kule">Gök Kulesi</button><button class="plaque rankb" data-a="rank">Sıralama · ${rankList().findIndex(r => r.me) + 1}.</button></div>
      <p class="tierd">${T.d} <span class="tag" style="margin-left:6px;"><img src="${curStoneMeta.ic}" style="width:14px;height:14px;vertical-align:middle"> Ganimet: <b>${curStoneMeta.lbl}</b></span></p>
      <div class="posters">${posters}</div>
    </section>
  </div>`;
}


/* ================= ZİNDAN & EJDER TOPÇUSU (MAHZEN, KALDERA & PVP SEFERLERİ) ================= */
function showZindanGateModal() {
  const hasChamp = typeof hasKizilTacChamp === 'function' ? hasKizilTacChamp() : !!(S && S.flags && S.flags.champ);
  const baby = typeof getEternalBabyDragon === 'function' ? getEternalBabyDragon() : null;
  const anyBaby = S && S.dragons ? S.dragons.find(d => d.stage === 'yavru') : null;
  const elixirCount = (S && S.food && S.food.genclik) || 0;
  const ikImg = asset('ik-genclik') || 'img/ui/ik-genclik.webp';

  showModal(`<div class="gate-modal" style="max-width:780px;margin:0 auto;padding:22px 26px;background:radial-gradient(circle at 50% 20%,#2d150e,#120906 85%);border:2px solid #c8923b;border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.85);color:#f3dfb0">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(200,146,59,.35);padding-bottom:10px;margin-bottom:14px">
      <div>
        <span class="kicker" style="color:#e5a94c;font-size:12px;letter-spacing:1px;text-transform:uppercase">Kadim Mühür Kapısı · Zindanlar & Ejder Topçusu Meydanı</span>
        <h2 style="margin:2px 0 0;color:#ffe299;font-size:22px">Giriş Şartları Henüz Tamamlanmadı</h2>
      </div>
      <button class="icb" data-a="mclose" aria-label="Kapat">${ui('x')}</button>
    </div>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.45;color:#d8c398">Yerin yedi kat altındaki <b>Kadim Zindanlara</b> ve <b>Ejder Topçusu Meydanına (Sefer & Canlı PvP)</b> adım atabilmek için ocağının iki kutsal şartı yerine getirmesi gerekir:</p>
    <div class="gate-cond-grid">
      <div style="padding:14px;border-radius:10px;background:rgba(20,10,7,.78);border:1.5px solid ${hasChamp ? '#54b86a' : '#b84a39'}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <img src="img/ui/ui-crown.webp" style="width:44px;height:44px;object-fit:contain" alt="">
          <div>
            <b style="display:block;font-size:15px;color:#ffe094">1. Kızıl Taç Şampiyonluğu</b>
            <span class="chip ${hasChamp ? 'good' : 'bad'}" style="font-size:11px">${hasChamp ? 'ŞART TAMAMLANDI' : 'HENÜZ KAZANILMADI'}</span>
          </div>
        </div>
        <p style="margin:0 0 10px;font-size:12.5px;color:#cbb58b">Arenada 20. Hafta düzenlenen <b>Kızıl Taç Turnuvasında</b> 3 turu da kazanarak Kızıl Taç Şampiyonu unvanını almalısın.</p>
        <button class="btn ${hasChamp ? 'ghost' : 'primary'} sm wide" data-a="gate-go-arena">${hasChamp ? 'Kızıl Taç Kazanıldı' : 'Arenaya Git'}</button>
      </div>
      <div style="padding:14px;border-radius:10px;background:rgba(20,10,7,.78);border:1.5px solid ${baby ? '#54b86a' : '#b84a39'}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <img src="${ikImg}" style="width:44px;height:44px;object-fit:contain" alt="">
          <div>
            <b style="display:block;font-size:15px;color:#ffe094">2. Sonsuz Gençlik İksirli Yavru</b>
            <span class="chip ${baby ? 'good' : 'bad'}" style="font-size:11px">${baby ? 'HAZIR: ' + esc(baby.name) : 'EKSİK (Kilerde İksir: ×' + elixirCount + ')'}</span>
          </div>
        </div>
        <p style="margin:0 0 10px;font-size:12.5px;color:#cbb58b">Gece Çarşısı'ndaki <b>Baharatçı Nuri'den</b> <b>Sonsuz Gençlik İksiri</b> alıp bir <b>Yavru Ejderhaya</b> içirmelisin. Bu iksiri sadece yavrular içebilir ve silahın olur!</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn primary sm" style="flex:1" data-a="gate-go-nuri">Baharatçı Nuri'ye Git</button>
          ${elixirCount > 0 && anyBaby && !baby ? `<button class="btn good sm" style="flex:1" data-a="gate-drink-baby" data-id="${anyBaby.id}">${esc(anyBaby.name)} İçsin</button>` : `<button class="btn ghost sm" style="flex:1" data-a="gate-go-ahir">Ahır / Yavrular</button>`}
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid rgba(200,146,59,.25)">
      <span class="mute sm">İpucu: Yumurtadan yeni çıkan yavru ejderhana Sonsuz Gençlik İksiri içirdiğinde asla büyümez ve omuz topun olur.</span>
      <button class="btn ghost sm" data-a="mclose">Anladım</button>
    </div>
  </div>`, 'gatewrap');
}

function zindanHubView() {
  const unlocked = typeof canEnterZindanOrTopcu === 'function' ? canEnterZindanOrTopcu() : false;
  const hasChamp = typeof hasKizilTacChamp === 'function' ? hasKizilTacChamp() : false;
  const eternalBaby = typeof getEternalBabyDragon === 'function' ? getEternalBabyDragon() : null;
  const anyBaby = S && S.dragons ? S.dragons.find(d => d.stage === 'yavru') : null;
  const elixirCount = (S && S.food && S.food.genclik) || 0;
  const ikImg = asset('ik-genclik') || 'img/ui/ik-genclik.webp';

  const elig = S.dragons.filter(d => canAct(d));
  if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null;
  if (!UI.arenaSel && elig.length) UI.arenaSel = (eternalBaby || elig.find(d => d.stage === 'yetiskin') || elig[0]).id;
  const f = eternalBaby || byId(UI.arenaSel) || S.dragons[0];
  const save = (S && S.sahmeranRaid) || { ownedLoot: [], clears: 0 };
  const curTab = UI.zindanTab || 'tumu';

  if (!unlocked) {
    return `<div class="arena">
      <section class="corner">
        <h3 class="sect">Mühürlü Zindan & Topçu Silahı</h3>
        <div class="fighter" style="align-items:center;gap:12px">
          <img src="${ikImg}" style="width:76px;height:76px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(255,160,60,.45))" alt="Sonsuz Gençlik İksiri">
          <div class="fi">
            <b>Sonsuz Gençlik İksiri</b>
            <small class="mute" style="display:block;margin-top:4px">Sadece <b>Yavru</b> ejderhalar içebilir. İçen yavru ebediyen genç kalır ve Zindan/Topçu savaşlarında omuz topun olur.</small>
          </div>
        </div>
        <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(212,162,76,.3)">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>1. Kızıl Taç Şampiyonluğu:</span><b class="${hasChamp ? 'good' : 'bad'}">${hasChamp ? 'Tamamlandı' : 'Kazanılmadı'}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>2. Kilerde Gençlik İksiri:</span><b>×${elixirCount}</b></div>
          <div style="display:flex;justify-content:space-between"><span>3. Mühürlü Yavru Silahı:</span><b class="${eternalBaby ? 'good' : 'bad'}">${eternalBaby ? esc(eternalBaby.name) : 'Yok'}</b></div>
        </div>
        <div class="cact" style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <button class="btn primary sm wide" data-a="gate-go-nuri">Baharatçı Nuri'den İksir Al (140 Altın)</button>
          ${elixirCount > 0 && anyBaby && !eternalBaby ? `<button class="btn good sm wide" data-a="gate-drink-baby" data-id="${anyBaby.id}">${esc(anyBaby.name)} (Yavru) İksiri İçsin</button>` : ''}
          <button class="btn ghost sm wide" data-a="gate-go-arena">Arenaya Git (Kızıl Taç Turnuvası)</button>
        </div>
      </section>
      <section class="board pitboard">
        <div class="plaques">
          <button class="plaque on">Kadim Zindanlar & Ejder Topçusu Meydanı (MÜHÜRLÜ)</button>
        </div>
        <p class="tierd">Zindanlar ve Ejder Topçusu Mini-Oyunu (Sefer & Canlı PvP) yalnızca <b>bir Kızıl Taç Şampiyonluğu kazanıldıktan</b> ve <b>Baharatçı Nuri'den alınan Sonsuz Gençlik İksiri bir Yavru Ejderhaya içirildikten</b> sonra açılır.</p>
        <div class="posters">
          <div class="poster special zindan-poster" style="max-width:340px">
            <i class="nail"></i>
            <span class="stamp deadly zindan-poster-badge">Şart 1</span>
            <div class="ph zindan-poster-badge">KIZIL TAÇ ŞAMPİYONLUĞU</div>
            <div class="pdr zindan-poster-art" style="display:flex;align-items:center;justify-content:center">
              <img src="img/ui/ui-crown.webp" class="zindan-poster-img" style="max-height:110px;object-fit:contain" alt="Kızıl Taç">
            </div>
            <b class="pname">Kızıl Taç Turnuvası</b>
            <small>20. Hafta Büyük Turnuva Şampiyonluğu</small>
            <div class="pmeta"><span class="chip ${hasChamp ? 'good' : 'bad'}">${hasChamp ? 'Şampiyonluk Kazanıldı' : 'Şampiyonluk Gerekli'}</span></div>
            <button class="btn ${hasChamp ? 'ghost' : 'primary'} sm wide zindan-poster-go" data-a="gate-go-arena">${hasChamp ? 'Tamamlandı' : 'Arenaya Git'}</button>
          </div>
          <div class="poster special zindan-poster" style="max-width:340px">
            <i class="nail"></i>
            <span class="stamp hard zindan-poster-badge">Şart 2</span>
            <div class="ph zindan-poster-badge">SONSUZ GENÇLİK İKSİRİ</div>
            <div class="pdr zindan-poster-art" style="display:flex;align-items:center;justify-content:center">
              <img src="${ikImg}" class="zindan-poster-img" style="max-height:110px;object-fit:contain" alt="Sonsuz Gençlik İksiri">
            </div>
            <b class="pname">Yavru Ejderha Silahı</b>
            <small>Baharatçı Nuri'den Alınır · Sadece Yavrular İçebilir</small>
            <div class="pmeta"><span class="chip ${eternalBaby ? 'good' : 'bad'}">${eternalBaby ? 'Hazır: ' + esc(eternalBaby.name) : 'Yavruya İçirilmeli'}</span></div>
            <button class="btn primary sm wide zindan-poster-go" data-a="gate-go-nuri">Baharatçı Nuri'ye Git</button>
          </div>
        </div>
      </section>
    </div>`;
  }

  /* ===== SAVAŞ & SEFER KOMUTA MERKEZİ ===== */
  const mainMode = (UI.zindanMainMode === 'pvp') ? 'pvp' : 'pve';
  if (!UI.zindanDiffMap) UI.zindanDiffMap = {};

  const DIFFS = [
    { k: 'normal', ic: '🟢', lbl: 'Normal', sub: '×0.75 HP · 550-850g' },
    { k: 'zor', ic: '🟠', lbl: 'Ağır', sub: '×1.0 HP · 850-1350g' },
    { k: 'ekstrem', ic: '🔴', lbl: 'Cehennem', sub: '×1.45 HP · 2400-3500g + Kıyamet Özü' }
  ];
  const DIFF_LOOT = {
    normal: '1× Kalıp + 2× T2 Taş',
    zor: '1–2× Kalıp + 2× Magma (T3) + %35 Kıyamet Özü',
    ekstrem: '2× Kalıp + Kıyamet Özü + 4× T3 + %40 Anka Mührü'
  };
  const DIFF_GOLD = { normal: '550-850g', zor: '850-1350g', ekstrem: '2400-3500g + Kıyamet Özü' };

  const RAID_CARDS = [
    {
      raidId: 'sahmeran', roman: 'I', title: 'Sırça Saray', boss: 'Yılanlar Şahı Şahmeran',
      elTxt: 'Toprak', loot: 'Sırça Yılan Seti Kalıbı & Obsidiyen', comicAct: 'zindan-comic-sah',
      imgs: { normal: 'img/sahmeran/sahmeran_idle_1.webp', zor: 'img/sahmeran/sahmeran_idle_1.webp', ekstrem: 'img/extreme/sah_ex_ascended.webp' },
      exNames: 'Ebedi Sırça Tanrıçası'
    },
    {
      raidId: 'komutan', roman: 'II', title: 'Yanık Kaldera', boss: 'Başkomutan Kalgarot',
      elTxt: 'Ateş / Gölge', loot: 'Kara Kor Seti Kalıbı & Magma Taşı', comicAct: 'zindan-comic-kom',
      imgs: { normal: 'img/komutan/komutan_idle_1.webp', zor: 'img/komutan/komutan_idle_1.webp', ekstrem: 'img/extreme/kom_ex_ascended.webp' },
      exNames: 'Mavi-Kor Ejderi Kalgarot'
    },
    {
      raidId: 'abra', roman: 'III', title: 'Batık Donanma', boss: 'Derya Yılanı ABRA',
      elTxt: 'Buz / Fırtına', loot: 'Leviathan Seti Kalıbı & Derin Mercan', comicAct: 'zindan-comic-abra',
      imgs: { normal: 'img/abra/abra_closeup_portrait_v2.webp', zor: 'img/abra/abra_closeup_portrait_v2.webp', ekstrem: 'img/abra/abra_head_only_roar.webp' },
      exNames: 'Abisal Leviathan ABRA'
    }
  ];

  const raidCardHtml = (r) => {
    const dk = UI.zindanDiffMap[r.raidId] || 'zor';
    const dInfo = DIFFS.find(d => d.k === dk) || DIFFS[1];
    const bossName = dk === 'ekstrem' ? r.exNames : r.boss;
    const pills = DIFFS.map(d => `<button class="btn ${dk === d.k ? (d.k === 'ekstrem' ? 'danger' : 'primary') : 'ghost'} sm" style="flex:1;font-size:11px;padding:4px 6px" data-a="zindan-card-diff" data-raid="${r.raidId}" data-diff="${d.k}" title="${d.sub}">${d.ic} ${d.lbl}</button>`).join('');
    return `
      <div class="poster special zindan-poster ${dk === 'ekstrem' ? 'zindan-poster--extreme' : 'zindan-poster--classic'}" style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <i class="nail"></i>
        <div class="ph zindan-poster-badge">${r.roman}. ZİNDAN: ${esc(r.title.toUpperCase())}</div>
        <div style="display:flex;gap:4px">${pills}</div>
        <div class="pdr zindan-poster-art"><img src="${r.imgs[dk]}" class="zindan-poster-img" alt="${esc(bossName)}"></div>
        <b class="pname">${esc(bossName)}</b>
        <small>${dInfo.sub}</small>
        <div class="pmeta"><span class="chip">Element: ${r.elTxt}</span></div>
        <small class="mute">🎁 Ganimet: <b>${esc(r.loot)}</b></small>
        <small class="mute">${DIFF_LOOT[dk]} · ${DIFF_GOLD[dk]}</small>
        <div class="cact zindan-poster-actions" style="margin-top:auto">
          <button class="btn ghost sm" data-a="${r.comicAct}">📖 Destan</button>
          <button class="btn ${dk === 'ekstrem' ? 'danger' : 'primary'} sm" data-a="zindan-open-raid-room" data-raid="${r.raidId}">🏰 Sefer Odası Kur / Gir</button>
        </div>
      </div>`;
  };

  const chibiStInfo = (typeof calcChibiStats === 'function') ? calcChibiStats(typeof ensureChibi === 'function' ? ensureChibi() : null) : { totalFc: 0, activeSet: null };
  const syn = (eternalBaby && typeof calcMainDragonSynergy === 'function')
    ? calcMainDragonSynergy(eternalBaby, typeof ensureChibi === 'function' ? ensureChibi() : null)
    : null;
  const setName = chibiStInfo.activeSet ? (chibiStInfo.activeSet.name || chibiStInfo.activeSet.label || chibiStInfo.activeSet.id || 'Zindan Seti') : null;

  const pveHtml = `
    <p class="tierd"><b>Kadim Zindan Seferleri (PvE Boss Baskını):</b> Bir zindan seç, zorluğunu belirle ve Sefer Odası'nı kur. Yoldaşlar sen istemedikçe odaya eklenmez.</p>
    <div class="zindan-card-grid">
      ${RAID_CARDS.map(raidCardHtml).join('')}
    </div>`;

  const pvpHtml = `
    <p class="tierd"><b>Ejder Topçusu Er Meydanı:</b> 1v1 ve 2v2 PvP odaları. Oda kurduğunda savaş otomatik başlamaz; bekleme odasında yuvalar boş gelir.</p>
    <div class="poster special zindan-poster" style="max-width:520px;margin:12px auto;display:flex;flex-direction:column;gap:8px;align-items:center">
      <i class="nail"></i>
      <div class="ph zindan-poster-badge">TOPÇU ER MEYDANI · 1v1 &amp; 2v2</div>
      <small>Hızlı eşleşme, özel oyun odaları, harita seçimi ve boş yuvalara arkadaş / bot ekleme.</small>
      <button class="btn primary wide" data-a="zindan-pvp-lobby">🎯 Topçu Er Meydanı Oda Lobisini Aç (1v1 &amp; 2v2)</button>
    </div>`;

  return `<div class="arena">
    <section class="corner">
      <h3 class="sect">🐉 Topçu Silahın &amp; Terbiyeci</h3>
      ${eternalBaby ? `
        <div class="fighter">${dragonSVG(eternalBaby)}<div class="fi"><b>${esc(eternalBaby.name)}</b> ${elChip(eternalBaby.el)} <span class="chip good" style="font-size:10px">Sonsuz Gençlik Silahı</span></div></div>
        ${statBars(eternalBaby)}
        ${syn ? `<div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(212,162,76,.3);font-size:12px;display:flex;flex-direction:column;gap:3px">
          <div>🎯 Topçu Hasar Bonusu: <b class="good">+%${syn.dmgBonusPct}</b></div>
          <div>❤️ Can Katkısı: <b class="good">+${syn.hpBonus}</b></div>
          <div>💥 Kritik: <b class="good">+%${syn.critBonusPct}</b></div>
        </div>` : ''}` : `<p class="mute sm">Kuşanılmış Sonsuz Gençlik Silah Yavrusu yok.</p>`}
      <div style="margin-top:8px;display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:12px">
        <span>⚔️ Terbiyeci Kudret: <b class="gold">${chibiStInfo.totalFc}</b></span>
        ${setName ? `<span class="chip good" style="font-size:10px">${esc(String(setName))}</span>` : `<span class="chip" style="font-size:10px">Set yok</span>`}
      </div>
      <div class="cact" style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
        <button class="btn primary sm wide" data-a="chibi-open-baby">🐉 Silah Yavrusunu &amp; Zırhı Değiştir (Kuşanma Dolabı)</button>
        <button class="btn ghost sm wide" data-a="go-usta-kerim" data-tab="dokum">⚒️ Usta Kerim Kalıp Dökümhanesi</button>
      </div>
    </section>
    <section class="board pitboard">
      <div class="plaques">
        <button class="plaque royal ${mainMode === 'pve' ? 'on' : ''}" data-a="zindan-main-mode" data-m="pve">🏰 KADİM ZİNDAN SEFERLERİ (PvE Boss Baskını)</button>
        <button class="plaque pit ${mainMode === 'pvp' ? 'on' : ''}" data-a="zindan-main-mode" data-m="pvp">🎯 EJDER TOPÇUSU ER MEYDANI (1v1 &amp; 2v2 PvP Odaları)</button>
      </div>
      ${mainMode === 'pve' ? pveHtml : pvpHtml}
    </section>
  </div>`;
}

/* ================= SEFER ================= */
function seferView() {
  const escs = S.dragons.filter(d => canAct(d) && d.stage !== 'yavru');
  if (UI.seferEsc && !escs.find(d => d.id === UI.seferEsc)) UI.seferEsc = null;
  if (!UI.seferEsc && escs.length) UI.seferEsc = escs[0].id;
  const e = byId(UI.seferEsc);
  const pins = Object.keys(REGIONS).map(r => { const R = REGIONS[r], [x, y] = MAP_POS[r], lock = (R.flag && !S.flags[R.flag]) || (R.unReq && S.un < R.unReq); const ban = typeof getRegionBanner === 'function' ? getRegionBanner(r) : null; return `<button class="pin ${UI.seferR === r ? 'on' : ''} ${lock ? 'locked' : ''} ${ban && ban.mine ? 'my-banner' : ''}" style="left:${x / 16}%;top:${y / 9}%" data-a="region" data-r="${r}"><span>${R.flag && !S.flags[R.flag] ? '???' : R.ad}${R.unReq && S.un < R.unReq ? ` (${R.unReq} Ün)` : ban && ban.mine ? ' · Sancak' : ''}</span></button>`; }).join('');
  let card = '';
  if (UI.seferR) {
    const R = REGIONS[UI.seferR], lock = (R.flag && !S.flags[R.flag]) || (R.unReq && S.un < R.unReq);
    card = `<aside class="regcard rg-${R.el}"><button class="icb close" data-a="region" data-r="">${ui('x')}</button><div class="regart">${sceneOr(UI.seferR, sceneRegion(UI.seferR))}</div><h3>${lock ? 'Haritada boş bir yer' : R.ad}</h3>${elChip(R.el)}<p>${lock ? 'Buranın yolunu bilen biri henüz çıkmadı.' : R.d}</p>
      <h4>Eskort</h4><div class="fpick">${escs.length ? pager('esc', escs, 4, d => `<button class="fp ${UI.seferEsc === d.id ? 'on' : ''}" data-a="esc" data-id="${d.id}" title="${esc(d.name)}">${dragonSVG(d, { still: true })}<span>${esc(d.name)}</span></button>`) : '<p class="mute sm">Boşta bir genç ya da yetişkin ejderha yok.</p>'}</div>
      ${e ? `<p class="mute sm">${esc(e.name)}: ZEK ${e.st.ze}, bağ ${e.bond}, GÜÇ ${e.st.gu}. Heybede ${Object.keys(FOODS).filter(f => S.food[f] > 0).map(f => FOODS[f].ad + ' ×' + S.food[f]).join(', ') || 'yem yok'}. İnlerde boş yer: ${freeSlots()}.</p>` : ''}
      <button class="btn primary wide" data-a="sefer" data-r="${UI.seferR}" ${lock || !e || S.gold < seferCost(UI.seferR) ? 'disabled' : ''}>Yola çık · ${goldTxt(seferCost(UI.seferR))}${perk('selin', 25) ? ' <small>Selin\'in yolu</small>' : ''}</button></aside>`;
  }
  const showMapOnMob = !!(UI && UI.mobShowMap);
  const seferPortraitList = `
    <div class="mob-portrait-list sefer-portrait-list">
      <div class="mob-list-hero" style="background-image:url('${asset('bg-harita') || 'img/bg-harita.webp'}')">
        <div class="mob-list-hero-ov">
          <div class="mob-list-hero-top">
            <div>
              <span class="kicker">Diyar Keşif Patikaları · 8 Bölge</span>
              <h2>Sefer & Keşif Rehberi</h2>
            </div>
            <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Harita Görünümü</button>
          </div>
          <div class="mob-sefer-esc-bar">
            <span class="kicker">Sefer Eskortu:</span>
            ${escs.length
              ? `<div class="mob-esc-pills">${escs.map(d => `<button class="btn xs ${UI.seferEsc === d.id ? 'primary' : 'ghost'}" data-a="esc" data-id="${d.id}">${esc(d.name)} (GÜÇ ${d.st.gu})</button>`).join('')}</div>`
              : `<span class="mute sm">Boşta genç veya yetişkin ejderha yok.</span>`}
          </div>
        </div>
      </div>
      <div class="mob-list-cards">
        ${Object.keys(REGIONS).map(r => {
          const R = REGIONS[r];
          const lock = (R.flag && !S.flags[R.flag]) || (R.unReq && S.un < R.unReq);
          const ban = typeof getRegionBanner === 'function' ? getRegionBanner(r) : null;
          const cost = seferCost(r);
          const bgReg = asset('bg-' + r) || '';
          const whyLock = R.flag && !S.flags[R.flag] ? 'Haritada henüz açılmadı' : (R.unReq && S.un < R.unReq ? `${R.unReq} Ün gerekir (Mevcut: ${S.un})` : '');
          return `
            <div class="mob-dir-card sefer-reg-row ${UI.seferR === r ? 'ready' : ''} ${lock ? 'closed' : ''}">
              <div class="mob-dir-ic" ${bgReg ? `style="background-image:url('${bgReg}');background-size:cover;background-position:center"` : ''}></div>
              <div class="mob-dir-info">
                <span class="kicker">${ban ? (ban.mine ? 'Senin Sancağın (+25 Altın/hf)' : `Sancak: ${esc(ban.guild)}`) : 'Keşif Bölgesi'}</span>
                <b>${lock && R.flag && !S.flags[R.flag] ? 'Gizemli Bölge (???)' : esc(R.ad)} ${!lock ? elChip(R.el) : ''}</b>
                <small>${lock ? esc(whyLock) : esc(R.d)}</small>
              </div>
              <div class="mob-sefer-act">
                ${lock
                  ? `<span class="tag">Kilitli</span>`
                  : `<button class="btn primary sm" data-a="sefer" data-r="${r}" ${!e || S.gold < cost ? 'disabled' : ''}>Yola Çık · ${cost}g</button>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  return `<div class="sefer ${showMapOnMob ? 'mob-force-map' : ''}">
    ${seferPortraitList}
    <div class="mapwrap">
      <div class="map16">
        ${sceneOr('harita', sceneSefer(S.flags))}
        <button class="btn ghost xs mob-view-toggle sefer-map-toggle" data-a="mob-view-toggle">Bölge Listesi</button>
        ${pins}
      </div>
      ${!UI.seferR ? '<div class="hint-pill">Haritada bir bölge seç. Seferde iki karşılaşma ve bir yaban ejderhası seni bekler.</div>' : ''}
    </div>
    ${card}
  </div>`;
}

/* ================= MODAL SİSTEMİ ================= */
const MQ = []; let modalOn = false;
function pushModal(fn) { MQ.push(fn); if (!modalOn) nextModal(); }
function nextModal() { const fn = MQ.shift(); if (!fn) { modalOn = false; $('#modal-root').innerHTML = ''; render(); return; } modalOn = true; FX.setMode(null); fn(); }
function showModal(html, cls = '') {
  modalOn = true;
  const scrimCls = `scrim ${cls.includes('vn') ? 'vnscrim' : ''} ${cls.includes('comicm') ? 'comicscrim' : ''}`.trim();
  const scrim = $('#modal-root .scrim');
  const ex = $('#modal-root .modal');
  if (ex && scrim) {
    const keep = cls.includes('fightm') && ex.classList.contains('fightm');
    scrim.className = scrimCls;
    ex.className = `modal ${cls} still`; ex.innerHTML = html;
    if (!keep) ex.scrollTop = 0;
    if (typeof ENGINE_GL !== 'undefined') ENGINE_GL.decorateDOM($('#modal-root'), false);
    return;
  }
  $('#modal-root').innerHTML = `<div class="${scrimCls}"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  if (typeof ENGINE_GL !== 'undefined') ENGINE_GL.decorateDOM($('#modal-root'), true);
}
function closeModal() {
  if (typeof stopCareRaf === 'function') stopCareRaf();
  if (typeof FT !== 'undefined' && FT && FT.specTimer) { clearTimeout(FT.specTimer); FT.specTimer = null; }
  if (typeof cleanupSarayListeners === 'function') cleanupSarayListeners();
  UI.modalRedraw = null;
  if (MQ.length > 0) {
    nextModal();
    return;
  }
  $('#modal-root').innerHTML = '';
  modalOn = false;
  render();
}

function vn({ speaker, art, kicker, text, opts, after, cls = '', bg }) {
  showModal(`${bg ? `<div class="vnbg">${bg}</div>` : ''}<div class="vnart">${art || ''}</div>
    <div class="vnbox"><div class="vnname">${speaker || ''}</div>${kicker ? `<p class="kicker">${kicker}</p>` : ''}<p class="vntext" id="vntext"></p>${after || ''}<div class="vnopts">${opts || ''}</div></div>`, 'vn ' + cls);
  typeInto($('#vntext'), text);
}
function normSaveSlot(item, idx, curSlot) {
  const slot = (item && (item.slot || item.id)) || (idx + 1);
  const raw = item && item.data ? item.data : item;
  const empty = !raw || !!raw.empty || raw.exists === false || (raw.week == null && raw.gold == null && !(item && item.hasData));
  const active = slot === curSlot || !!(item && item.active);
  if (empty) return { slot, empty: true, active };
  const dCount = Array.isArray(raw.dragons) ? raw.dragons.length : (typeof raw.dragonCount === 'number' ? raw.dragonCount : (typeof raw.dragons === 'number' ? raw.dragons : (item && item.dragons) || 0));
  const starStr = raw.starName ? ` · Yıldız: ${raw.starName}` : '';
  return {
    slot,
    empty: false,
    active,
    week: raw.week ?? (item && item.week) ?? 1,
    seasonNo: raw.seasonNo ?? (item && item.seasonNo) ?? 1,
    gold: raw.gold ?? (item && item.gold) ?? 0,
    un: raw.un ?? (item && item.un) ?? 0,
    dragons: dCount,
    summary: (item && item.summary) || `${(raw.seasonNo || 1)}. Sezon · Hafta ${raw.week || 1} · ${dCount} Ejderha${starStr}`
  };
}
function helpModal() {
  UI.modalRedraw = helpModal;
  const htab = UI.helpTab || 'tumu';
  const sfxPct = clamp(Math.round((typeof SFX.getVol === 'function' ? SFX.getVol() : (UI._sfxVol ?? 0.8)) * 100), 0, 100);
  const bgmPct = clamp(Math.round((typeof BGM.getVol === 'function' ? BGM.getVol() : (UI._bgmVol ?? 0.6)) * 100), 0, 100);
  const ambPct = clamp(Math.round((typeof BGM.getAmbVol === 'function' ? BGM.getAmbVol() : (UI._ambVol ?? 0.5)) * 100), 0, 100);
  const curSlot = typeof getSaveSlot === 'function' ? getSaveSlot() : (UI._saveSlot || 1);
  const rawSlots = typeof listSaveSlots === 'function' ? listSaveSlots() : [
    S ? { slot: 1, data: S, active: curSlot === 1 } : { slot: 1, empty: true },
    { slot: 2, empty: true },
    { slot: 3, empty: true }
  ];
  const slots = [0, 1, 2].map(i => normSaveSlot(rawSlots && rawSlots[i], i, curSlot));
  const tabs = [
    ['tumu', 'Tümü'],
    ['rehber', 'El Kitabı'],
    ['ses', 'Ses Mikseri'],
    ['kayit', 'Kayıt & Yedek'],
    ['kisayol', 'Kısayollar']
  ].map(([k, n]) => `<button class="vtab ${htab === k ? 'on' : ''}" data-a="htab" data-k="${k}">${n}</button>`).join('');

  const slotCards = slots.map(s => `
    <div class="sslot-card ${s.active ? 'active' : ''} ${s.empty ? 'empty' : ''}">
      <div class="sslot-head">
        <b>Kayıt Yuvası ${s.slot}</b>
        ${s.active ? '<span class="sslot-tag">Aktif Yuva</span>' : ''}
      </div>
      <div class="sslot-meta">
        ${s.empty ? '<span class="mute">Boş yuva · yeni ocak kurmaya hazır</span>' : `<span>${esc(s.summary)}</span><small>${ui('gold')}${s.gold} · ${ui('un')}${s.un} Ün</small>`}
      </div>
      <button class="btn ${s.active ? 'ghost' : 'primary'} sm wide" data-a="save-slot" data-slot="${s.slot}">
        ${s.active ? `Yuva ${s.slot} Seçili` : s.empty ? `Yuva ${s.slot}'e Geç (Yeni)` : `Yuva ${s.slot}'i Yükle`}
      </button>
    </div>
  `).join('');

  showModal(`<div class="parch help-parch">
    <div class="help-head">
      <div><p class="kicker">Ocak Defteri & Nizamnâme</p><h2>Rehber & Ocak Ayarları</h2></div>
      <button class="icb" data-a="mclose" aria-label="Kapat">${ui('x')}</button>
    </div>
    <div class="vtabs help-tabs">${tabs}</div>

    <div class="help-body" data-htab="${htab}">
      <section class="hsec ${htab === 'tumu' || htab === 'ses' ? 'on' : 'hide'}" data-sec="ses">
        <h4>Ses Dengesi</h4>
        <div class="mixer-grid">
          <label class="mixer-row">
            <span class="mixer-lbl">Efekt Sesi</span>
            <input type="range" min="0" max="100" step="1" value="${sfxPct}" data-vol="sfx" aria-label="Efekt Sesi">
            <b class="mixer-val" id="val-sfx">%${sfxPct}</b>
          </label>
          <label class="mixer-row">
            <span class="mixer-lbl">Müzik</span>
            <input type="range" min="0" max="100" step="1" value="${bgmPct}" data-vol="bgm" aria-label="Müzik Sesi">
            <b class="mixer-val" id="val-bgm">%${bgmPct}</b>
          </label>
          <label class="mixer-row">
            <span class="mixer-lbl">Ortam Sesi</span>
            <input type="range" min="0" max="100" step="1" value="${ambPct}" data-vol="amb" aria-label="Ortam Sesi">
            <b class="mixer-val" id="val-amb">%${ambPct}</b>
          </label>
        </div>
        <div class="mixer-toggles">
          <button class="btn sm" data-a="sound-modal">Tüm Sesler: ${SFX.on ? 'Açık' : 'Sessiz'}</button>
          <button class="btn sm" data-a="mustoggle">Müzik: ${BGM.on ? 'Açık' : 'Kapalı'}</button>
          <button class="btn sm" data-a="fxtoggle">Efektler: ${REDUCED ? 'Sade (Sakin)' : 'Tam'}</button>
        </div>
      </section>

      <section class="hsec ${htab === 'tumu' || htab === 'kayit' ? 'on' : 'hide'}" data-sec="kayit">
        <h4>Kayıt Defteri & Yedekleme</h4>
        <div class="sslots-grid">${slotCards}</div>
        <div class="save-io-wrap">
          <textarea id="save-io-box" class="save-io-box" rows="2" placeholder="Kayıt mührü kodunu buraya yapıştırarak içe aktarabilir veya dışa aktarılan mührü kopyalayabilirsin...">${esc(UI._lastExportStr || '')}</textarea>
          <div class="save-io-btns">
            <button class="btn sm" data-a="save-export">Kayıt Mührünü Kopyala</button>
            <button class="btn primary sm" data-a="save-import">Kayıt Mührünü Yükle</button>
          </div>
        </div>
      </section>

      <section class="hsec ${htab === 'tumu' || htab === 'kisayol' ? 'on' : 'hide'}" data-sec="kisayol">
        <h4>Klavye Kısayolları Rehberi</h4>
        <div class="tablewrap">
          <table class="otab kbd-table">
            <thead><tr><th>Kısayol</th><th>Alan</th><th>İşlev</th></tr></thead>
            <tbody>
              <tr><td><kbd>1</kbd> – <kbd>7</kbd></td><td>Mekân Geçişleri</td><td>Ocak (1), Ahır (2), Yuva (3), Arena (4), Sefer (5), Pazar (6), Meydan (7)</td></tr>
              <tr><td><kbd>8</kbd> / <kbd>9</kbd></td><td>Yeni Bölgeler</td><td><kbd>8</kbd> Ejder Kasabası · <kbd>9</kbd> Yeraltı Zindan Kapıları</td></tr>
              <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></td><td>Arena Dövüşü</td><td><kbd>1</kbd> Pençe · <kbd>2</kbd> Element Nefesi · <kbd>3</kbd> Kükre · <kbd>4</kbd> Savun (Hamle Önbellekli)</td></tr>
              <tr><td><kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd></td><td>Arena Kartları</td><td>Ejderhanın 1., 2. ve 3. Yetenek Kartını kullanır (Tur oynatılırken basılırsa sıraya alır)</td></tr>
              <tr><td><kbd>1</kbd>–<kbd>4</kbd> / <kbd>Boşluk</kbd></td><td>Olay & Sefer</td><td>Diyalog seçeneklerini (<kbd>1-4</kbd>) seçer; <kbd>Boşluk</kbd> tek düğmeli adımları ilerletir</td></tr>
              <tr><td><kbd>A/D</kbd> · <kbd>Ok Tuşları</kbd> · <kbd>Boşluk</kbd></td><td>Zindan & Yarış</td><td>Yürüyüş (A/D), Nişan Açısı (Yukarı/Aşağı Ok), Güç Doldur & Ateşle / Yüksel (Boşluk)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="hsec ${htab === 'tumu' || htab === 'rehber' ? 'on' : 'hide'}" data-sec="rehber">
        <h4>El Kitabı · Nasıl Oynanır</h4>
        <div class="prose">
          <p><b>Her hafta</b> her ejderha bir iş yapar: antrenman, dinlenme, gezinti, yuva kurma, bir dövüş ya da bir sefer. Konuşmak ve ikram etmek haftada birer kez ayrıca yapılabilir. Sonra sağ alttaki fenerle haftayı bitir.</p>
          <p><b>Antrenman</b> değerleri genetik sınıra kadar büyütür. Moral kazancı çarpar, yorgunluk sakatlanma riskini (alevli sayı) artırır. Üslup karakteri de şekillendirir.</p>
          <p><b>Karakter</b> üç eksende yavaş yavaş oluşur: cesaret, sıcaklık, disiplin. Bir eksen 40'ı geçince kalıcı bir iz belirir ve dövüşte ya da bakımda işe yarar.</p>
          <p><b>Genetik:</b> her değer için iki gen (D–S). Yavru her ebeveynden birini alır. Element, desen, boynuz ve göz de genle geçer; Altın Göz ve Gölge çekiniktir.</p>
          <p><b>Dövüş:</b> Pençe güvenilir. Nefes 40 nefes yer, element üstünlüğünde yıkıcıdır. Savunma hasarı yarıya indirir. Kükreme rakibi sarsar. Yüksek bağ ejderhanı bir kez yere düşmekten kurtarabilir.</p>
          <p><b>Yıldız ve destek:</b> Bir ejderha ocağın yıldızıdır; onu sen eğitirsin. Ötekilere adlarının altındaki rozetten destek rolü ver (antrenman eşi, neşe kaynağı, avcı, gözcü): rol her hafta kendiliğinden işler.</p>
          <p><b>Kariyer:</b> Yıldızın sırayla hedefleri olur (bir değeri büyütmek, arenada zaferler, Bahar Kupası, Şehir Arenası ya da gök yarışı, Kızıl Taç). Her hedefin son haftası var. Tutturursa bağ sahnesi, lakap ve ödül; tutturamazsa kariyeri biter, emekli olup ocağın hocası olur ve yıldızlık başkasına geçer.</p>
          <p><b>Nesil geçişi:</b> Sezon bitince oyun bitmez. Yıldız hocalığa çekilir; yeni sezonun yıldızını onun yavruları arasından seçersin. Ocak, binalar, ejderhalar ve yumurtalar kalır; ünün yarısı taşınır. Rakipler ve arena her sezon biraz daha güçlenir.</p>
          <p><b>Dövüşte destek:</b> Yıldız dövüşürken sağ alttaki düğmeyle destekçilerinden birini maç başına bir kez çağırabilirsin; tur harcamaz. Antrenman eşi bir darbeyi karşılar, neşe kaynağı moral verir, gözcü rakibin hamlesini gösterir, avcı pusudan vurur.</p>
          <p><b>Hedef:</b> 10. haftada Bahar Kupası, 20. haftada Kızıl Taç (45 ün gerekir).</p>
        </div>
      </section>
    </div>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Anladım</button></div>
  </div>`, 'paper wide');
}
function albumCard(a) {
  const art = a.d ? `<div class="pdr2">${dragonSVG(a.d, { still: true })}${a.d2 ? dragonSVG(a.d2, { still: true, flip: true }) : ''}</div>` : `<div class="pdr2 npcph">${a.npc ? npcSVG(a.npc) : ''}</div>`;
  return `<figure class="polar k-${a.kind}" style="--rot:${(((a.w * 7 + (a.title || '').length) % 7) - 3) * 0.8}deg">${art}<figcaption><b>${esc(a.title)}</b><small>Hafta ${a.w}</small><span>${esc(a.text)}</span></figcaption></figure>`;
}
function chronModal() {
  UI.modalRedraw = chronModal; UI.chronTab = UI.chronTab || 'defter';
  const tabs = `<div class="vtabs"><button class="vtab ${UI.chronTab === 'defter' ? 'on' : ''}" data-a="chtab" data-k="defter">Defter</button><button class="vtab ${UI.chronTab === 'album' ? 'on' : ''}" data-a="chtab" data-k="album">Albüm (${(S.album || []).length})</button></div>`;
  if (UI.chronTab === 'album') {
    const al = (S.album || []).slice().reverse();
    showModal(`<div class="parch albumm"><h2>Ocak albümü</h2>${tabs}${al.length ? pager('album', al, PER(6, 2), albumCard) : '<p class="mute">Henüz bir an yok. İlk zafer, ilk yumurta, ilk veda... hepsi buraya işlenecek.</p>'}<div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div></div>`, 'paper wide');
    return;
  }
  showModal(`<div class="parch"><h2>Ocak defteri</h2>${tabs}<div class="chron">${pager('chron', S.chron.slice().reverse(), 9, c => `<div class="ch"><span>H${c.w}</span>${c.t}</div>`, true)}</div>${S.dead.length ? `<h4>Anıt</h4>${memorial()}` : ''}<div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div></div>`, 'paper');
}
function introModal() {
  showModal(`<div class="letter">${asset('npc-dede') ? `<div class="letter-portrait">${npcSVG('dede')}</div>` : ''}<p class="from">Torunuma,</p>
  <p>Bu mektubu okuyorsan ocak artık senin. Çatılar akıyor, kuluçka ocağı yıllardır soğuk, demirci bile yolu unuttu. Ama Kor hâlâ burada. Yaşlandı, inatlaştı, ama yüreği hâlâ kızgın bir kor.</p>
  <p>Bir de yumurta bırakıyorum. Nereden geldiğini sorma. Onu ısıt; ne çıkacağını ben de bilmiyorum.</p>
  <p>Kızıl Taç'ı bir kez de bu ocak alsın isterdim. Yirmi haftan var.</p><p class="sig">Deden</p>
  <div class="mbtns"><button class="btn primary" data-a="mclose">Ocağa gir</button></div></div>`, 'letterm');
  SFX.play('page');
}

/* --- hafta sonu: gece ve sonuç kartları --- */
let PRE = null;
function snapshot() { const m = {}; for (const d of S.dragons) m[d.id] = { st: { ...d.st }, bond: d.bond, mood: d.mood, fat: d.fat, stage: d.stage, marks: marks(d) }; return m; }
function reportModal(R) {
  UI.modalRedraw = () => reportModal(R);
  const cards = pager('rep', R.report, PER(4, 1), ({ d, lines }) => {
    const p = PRE[d.id]; const chips = [];
    if (p) {
      for (const k of STATS) { const v = d.st[k] - p.st[k]; if (v) chips.push(`<span class="chip st-${k}">${ST_KISA[k]} <b class="cu" data-to="${v}">0</b></span>`); }
      if (d.bond !== p.bond) chips.push(`<span class="chip heart">Bağ ${d.bond > p.bond ? '+' : ''}${d.bond - p.bond}</span>`);
      if (d.mood !== p.mood) chips.push(`<span class="chip ${d.mood > p.mood ? 'good' : 'bad'}">${moodFace(normMood(d.mood))} ${MOOD[normMood(d.mood)]}</span>`);
      if (d.stage !== p.stage) chips.push(`<span class="chip big">Büyüdü: ${STAGE_AD[d.stage]}</span>`);
      for (const m of marks(d)) if (!p.marks.includes(m)) chips.push(`<span class="chip mark">Yeni iz: ${m}</span>`);
    }
    return `<div class="rcard">${dragonSVG(d, { still: true })}<b>${esc(d.name)}</b><div class="chips">${chips.join('') || '<span class="mute sm">Sakin bir hafta</span>'}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
  });
  showModal(`<div class="night"><div class="moonrise">${ui('moon')}</div><p class="kicker">Gece çöktü</p><h2>Hafta ${S.over ? S.week : S.week - 1} sona erdi</h2>
    <div class="rcards">${cards}</div><ul class="gen">${R.gen.map(l => `<li>${l}</li>`).join('')}</ul>
    <div class="mbtns"><button class="btn primary big" data-a="mclose">${S.over ? 'Sonuca bak' : `Hafta ${ek(S.week, 'dat')} uyan`}</button></div></div>`, 'nightm');
  document.querySelectorAll('.rcard').forEach((c, i) => { c.style.animationDelay = (0.25 + i * 0.18) + 's'; });
  setTimeout(() => document.querySelectorAll('.cu').forEach(el => { const v = +el.dataset.to; el.textContent = (v > 0 ? '+' : '') + v; if (v > 0) { el.textContent = '+0'; const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 700); el.textContent = '+' + Math.round(v * k); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); } }), 500);
}

/* --- olay --- */
const EV_NPC = { harita: 'selin', bataklik: 'selin', demirhan: 'demirhan', tac_davet: 'demirhan', dem2: 'demirhan', dem3: 'demirhan', dem4: 'demirhan', selin_yavru: 'selin', kor_ani: 'dede', cukur: 'cukur', cukur2: 'cukur', kan_tuccari: 'kantuccari', kerim: 'kerim', kristal: 'tuccar', ozan: 'ozan', sponsor: 'tuccar', kupa_ilan: 'muhtar', hirsiz: 'muhtar', son_gece: 'dede', mektup: 'dede', bilge: 'bilge', pul: 'muhtar' };
let CUR_EV = null;
function evBgFor(ev) {
  if (!ev) return viewBg();
  const id = ev.id || '';
  if (ev.rstory || id.startsWith('rs_')) return arenaBg('yaris');
  if (id === 'cukur' || id === 'cukur2' || id === 'kan_tuccari' || id === 'as_kanli' || id === 'as_efsane' || id === 'as_kum') return arenaBg('cukur');
  if (ev.astory || id.startsWith('as_')) return arenaBg(UI.arenaTier === 'yaris' ? 'sehir' : (UI.arenaTier || 'koy'));
  if (ev._lastBgHtml) return ev._lastBgHtml;
  if (id === 'harita' || id === 'bataklik' || id === 'selin_yavru' || id === 'pul') return sceneOr('harita', sceneSefer(S.flags));
  if (id === 'tuccar' || id === 'kristal' || id === 'sponsor' || id === 'kerim' || id === 'dem3') return sceneOr('pazar', scenePazar());
  if (ev.ctx && ev.ctx.d) return sceneOr('ahir', sceneAhir(ev.ctx.d.el));
  return sceneOr('ocak', sceneOcak());
}
function eventModal(ev) {
  if (typeof COMIC !== 'undefined' && COMIC[ev.id]) return comicModal(ev);
  CUR_EV = ev; const c = ev.ctx || {};
  const npc = EV_NPC[ev.id];
  const art = c.d ? `<div class="vdr">${dragonSVG(c.d)}</div>${c.d2 ? `<div class="vdr second">${dragonSVG(c.d2, { flip: true })}</div>` : ''}` : npc ? npcSVG(npc, 'big') : '';
  const opts = ev.opts.map((o, i) => { const why = o.req ? o.req(c) : null; const t = typeof o.t === 'function' ? o.t(c) : o.t; return `<button class="vopt" data-a="evopt" data-i="${i}" ${why ? 'disabled' : ''}>${t}${why ? `<small>${why}</small>` : ''}</button>`; }).join('');
  vn({ speaker: npc ? NPCS[npc].ad : ev.title, kicker: `${STORY[S.week] && STORY[S.week].id === ev.id ? 'Hikâye' : 'Olay'} · ${ev.title}`, art, text: ev.text(c), opts, bg: evBgFor(ev) });
  SFX.play('page');
}
/* --- konuşma --- */
let CUR_TALK = null;
function talkModal(d) {
  const ti = pickTalk(d); CUR_TALK = { d, ti };
  const T = TALKS[ti];
  let lore = '';
  if (langLv() >= 3 && !d.favKnown) { d.favKnown = true; lore = ` Kadim Dil'le fısıldıyor: en çok ${FOODS[d.fav].ad.toLowerCase()} seviyormuş.`; }
  const deep = langLv() >= 2 ? [['ces', 1, 'Cesaretini öv'], ['ces', -1, 'Sabrı anlat'], ['sic', 1, 'Onu sevdiğini söyle'], ['sic', -1, 'Kendi ayağında durmasını öğütle'], ['dis', 1, 'Disiplinin değerini anlat'], ['dis', -1, 'Kuralları esnetmesini söyle']].map(([x, s, t]) => `<button class="vopt deep" data-a="deeptalk" data-x="${x}" data-s="${s}">${t} <small>Kor Dili · derin sohbet</small></button>`).join('') : '';
  vn({ speaker: d.name, kicker: 'Sohbet', art: angleVdr(d, ['front']), text: T.t.replace(/\{ad\}/g, d.name) + lore, opts: T.o.map((o, i) => `<button class="vopt" data-a="talkopt" data-i="${i}">${esc(o.t.replace(/\{ad\}/g, d.name))}</button>`).join('') + (deep ? `<details class="deepwrap"><summary>Derin sohbet (Kor Dili)</summary>${deep}</details>` : ''), bg: sceneOr('ahir', sceneAhir(d.el)) });
}
/* --- yumurta --- */
let CUR_HATCH = null;
function hatchModal(egg) {
  CUR_HATCH = { egg };
  showModal(`<div class="hatchm"><p class="kicker">Kuluçka ocağı</p><h2>Kabuk çatlıyor</h2><div class="egg-stage">${eggSVG(egg, 1, { cls: 'wobble big', glow: true })}</div><p class="vntext">${esc(egg.origin)}. İçeriden tırmalama sesleri geliyor.</p>
    <div class="mbtns center"><button class="btn primary big" data-a="hatch-go">Kabuğu arala</button></div></div>`, 'hatchwrap');
}
function hatchReveal() {
  const { d, notes } = hatchEgg(CUR_HATCH.egg); CUR_HATCH.d = d;
  if (typeof ECO_SYNC !== 'undefined') ECO_SYNC.localHatched(CUR_HATCH.egg, d); // ENG-12: sunucu yumurtasına bağ
  SFX.play('hatch');
  showModal(`<div class="hatchm"><div class="flash"></div><p class="kicker">Yeni bir ejderha</p><div class="egg-stage reveal">${hasAngle(d, 'front') ? angleSVG(d, 'front') : dragonSVG(d)}</div>
    <label class="namefld"><span>Adını koy</span><input id="hatch-name" value="${esc(d.name)}" maxlength="16"></label>
    <p class="np-sub">${sexIc(d.sex)} ${elChip(d.el)} ${d.gen}. nesil ${d.parents ? `· ${esc(d.parents[0])} × ${esc(d.parents[1])}` : ''}</p>
    <ul class="notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul>
    <div class="potrow">${STATS.map(k => { const s = d.genes.pot[k][0] + d.genes.pot[k][1]; return `<span>${ST_KISA[k]} <b class="g${Math.floor(s / 2)}">${potLetter(s)}</b></span>`; }).join('')}</div>
    <div class="mbtns center"><button class="btn primary big" data-a="hatch-ok">Hoş geldin</button></div></div>`, 'hatchwrap');
  setTimeout(() => { const r = $('.egg-stage')?.getBoundingClientRect(); if (r) { FX.burst(r.x + r.width / 2, r.y + r.height / 2, d.el, 60, 1.4); } }, 50);
}
/* --- ölüm --- */
function deathModal(d, where) {
  BGM.mood('veda');
  const spot = S.grid.findIndex(t => t.open && !t.b);
  SFX.play('death');
  showModal(`<div class="deathm"><p class="kicker">${where}</p><h2>${esc(d.name)} geri dönmedi</h2><div class="egg-stage dead">${dragonSVG({ ...d, dead: true }, { still: true })}<span class="candle"></span></div>
    <p class="vntext">${esc(d.name)} ${d.age} hafta yaşadı, ${d.w} zafer kazandı. Bağınız ${d.bond} idi. O gece ocaktaki ejderhaların hiçbiri uyumadı.</p>
    <div class="mbtns center">${spot >= 0 ? '<button class="btn" data-a="grave">Ocağa mezar taşı dik</button>' : ''}<button class="btn ghost" data-a="mclose">Sessizce veda et</button></div></div>`, 'deathwrap');
}

/* ================= DÖVÜŞ ================= */
let FT = null;
function cardColor(k) { const el = CARDS[k].el; return el ? PAL[el].glow : '#e9c27a'; }
function cardFace(k, mini) {
  const C = CARDS[k];
  const ic = asset('card-' + k) || asset('ic-card') || 'img/ui/ic-card.webp';
  return `<div class="ycard ${mini ? 'mini' : ''}" style="--cc:${cardColor(k)}" title="${esc(C.d)}"><i class="ycg"></i><img src="${ic}" class="ycard-ic" alt="" aria-hidden="true"><div class="ycard-tx"><b>${C.ad}</b>${mini ? '' : `<small>${C.k}</small>`}</div>${C.el ? `<em>${EL_AD[C.el]}</em>` : ''}</div>`;
}
function startFight(d, opp, ctx) { const F = newFight(fighterFromDragon(d), fighterFromOpp(opp)); applyBuff(F.p, ctx.buff); FT = { F, d, opp, log: [], ...ctx }; { const sb = scoutBuff(d, F.p); if (sb) FT.log.push({ t: sb, c: 'mute' }); } if (ctx.buffText) FT.log.push({ t: ctx.buffText, c: 'mute' }); fightModal(); SFX.play('roar'); }
/* --- maç öncesi / sonrası sahneler --- */
let CUR_PRE = null, CUR_POST = null;
const arenaBg = tier => sceneOr(tier === 'cukur' ? 'pit' : tier === 'saray' ? 'saray' : tier === 'kule' ? 'kule' : tier === 'yaris' ? 'kayalik' : 'arena', '');
function fightPair(d, o) { return angleVdr(d, ['34', 'front'], { face: 'r' }) + (o ? angleVdr(o, ['34', 'front'], { face: 'l', cls: 'second vs' }) : ''); }
function preFightModal(pe, d, o, ctx) {
  CUR_PRE = { ...pe, d, o, ctx };
  const c = pe.c, opts = pe.ev.opts.map((x, i) => { const t = typeof x.t === 'function' ? x.t(c) : x.t; return `<button class="vopt" data-a="preopt" data-i="${i}">${t}</button>`; }).join('');
  vn({ speaker: pe.ev.title, kicker: 'Dövüşten önce', art: fightPair(d, o), text: pe.ev.text(c), opts, bg: arenaBg(ctx.tier) }); SFX.play('page');
}
function postFightModal(pp) {
  CUR_POST = pp; const c = pp.c;
  const opts = pp.ev.opts.map((x, i) => { const why = x.req ? x.req(c) : null; const t = typeof x.t === 'function' ? x.t(c) : x.t; return `<button class="vopt" data-a="postopt" data-i="${i}" ${why ? 'disabled' : ''}>${t}${why ? `<small>${why}</small>` : ''}</button>`; }).join('');
  vn({ speaker: pp.ev.title, kicker: c.won ? 'Zaferin ardından' : 'Dövüşten sonra', art: fightPair(c.d), text: pp.ev.text(c), opts, bg: arenaBg(UI.arenaTier) }); SFX.play('page');
}
const hpw = (f, pre) => Math.max(0, (pre ? pre.hp : f.hp) / f.maxHp * 100);
function plate(f, side, pre) {
  return `<div class="plate ${side}"><div class="pl-top"><b>${esc(f.name)}</b>${side === 'p' && f.ref ? titleTag(f.ref) : ''}${elChip(f.el)}${f.weak ? '<span class="stc bad">sarsıldı</span>' : ''}${f.fury ? '<span class="stc">öfkeli</span>' : ''}${f.shield ? '<span class="stc ice">buz zırh</span>' : ''}${f.evade ? '<span class="stc">gölgede</span>' : ''}${f.stun ? '<span class="stc bad">sersem</span>' : ''}${f.roar ? '<span class="stc">yürek</span>' : ''}${side === 'e' && FT && FT.F && FT.F.eNext ? `<span class="stc nxt">sıradaki: ${eActName(FT.F.eNext, f)}</span>` : ''}${side === 'p' && f.cover ? `<span class="stc">${esc(f.cover)} siper</span>` : ''}${side === 'e' && f.cards && f.cards.length ? `<span class="stc kc" title="${f.used.length ? CARDS[f.cards[0]].ad : 'Bilinmeyen bir yetenek kartı'}">${f.used.length ? CARDS[f.cards[0]].ad : '1 kart'}</span>` : ''}</div>
    <div class="hp fbar" id="hp-${side}"><i class="ghost" style="width:${hpw(f, pre)}%"></i><i class="fill" style="width:${hpw(f, pre)}%"></i><span>${pre ? pre.hp : Math.max(0, f.hp)} / ${f.maxHp}</span></div><div class="sta" id="sta-${side}"><i style="width:${pre ? pre.sta : f.sta}%"></i></div></div>`;
}
function fightModal(evs) {
  const { F, d, opp } = FT, play = !!(evs && FT.pre);
  if (play) FT.busy = true;
  const adv = elMult(F.p.el, F.e.el);
  const elc = PAL[F.p.el].glow;
  const CARD_KEYS = ['Q', 'W', 'E'];
  const isBuf = x => !!(FT.bufferedAct && FT.bufferedAct === x);
  const fab = (attrs, icon, name, sub, cls = '', dis = false, kbd = '', actKey = '') =>
    `<button class="fab ${cls}${actKey && isBuf(actKey) ? ' buffered' : ''}" ${attrs} ${(dis && (!play || FT.spectating)) || (FT.waitingForOpponent && !FT.spectating) ? 'disabled' : ''} aria-label="${name}${kbd ? ' [' + kbd + ']' : ''}"><span class="fi">${icon}${kbd ? `<kbd class="fkbd">[${kbd}]</kbd>` : ''}</span><span class="ftx"><b>${name}${kbd ? ` <kbd class="fkbd-in">[${kbd}]</kbd>` : ''}</b><small>${sub}</small></span></button>`;
  const cardIc = k => { const a = asset('card-' + k) || asset('ic-card'); if (a) return `<img src="${a}" class="aic aicimg card-ic-img" alt="">`; return `<svg viewBox="0 0 48 48" class="aic" aria-hidden="true"><rect x="13" y="7" width="22" height="32" rx="4" fill="${cardColor(k)}" opacity=".9" transform="rotate(-8 24 23)"/><rect x="15" y="9" width="22" height="32" rx="4" fill="#160a0c" stroke="${cardColor(k)}" stroke-width="2.5" transform="rotate(6 24 25)"/><path d="M26 17 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="${cardColor(k)}" transform="rotate(6 24 25)"/></svg>`; };
  let acts = '';
  if (!F.over || play) {
    if (FT.spectating) {
      acts = `<nav class="fdock" aria-label="Tribün Eylemleri">
        ${fab('data-a="spec-cheer" data-k="cheer"', actIcon('kukre'), 'Tezahürat', `${esc(F.p.name)} +15 nefes alır`, '', (FT.cheersUsed || 0) >= 2)}
        ${fab('data-a="spec-cheer" data-k="boo"', actIcon('pence'), 'Yuhala', `${esc(F.e.name)} sarsılır`, '', (FT.cheersUsed || 0) >= 2)}
        ${fab('data-a="spec-bet"', actIcon('gear'), FT.bet ? 'Bahis Tutuldu' : 'Bahis (40 Altın)', `${esc(F.p.name)} kazanırsa +80 altın`, 'el', !!FT.bet || S.gold < 40)}
        <i class="fsep"></i>${fab('data-a="spec-leave"', actIcon('teslim'), 'Ayrıl', 'Tribünden çık', 'surr')}
      </nav>`;
    } else if (!F.over) {
      acts = `<nav class="fdock ${play ? 'wait' : ''}" aria-label="Eylemler">
        ${fab('data-a="fact" data-x="pence"', actIcon('pence'), 'Pençe', 'Güvenilir yakın saldırı', '', false, '1', 'pence')}
        ${fab('data-a="fact" data-x="nefes"', actIcon('nefes', elc), `${EL_AD[F.p.el]} nefesi`, `40 nefes · ${adv > 1 ? 'rakibe üstün' : adv < 1 ? 'rakibe zayıf' : 'normal etki'}`, 'el', F.p.sta < NEFES_COST, '2', 'nefes')}
        ${fab('data-a="fact" data-x="kukre"', actIcon('kukre'), 'Kükre', '15 nefes · rakibi sarsar', '', F.p.sta < 15, '3', 'kukre')}
        ${fab('data-a="fact" data-x="savun"', actIcon('savun'), 'Savun', 'Hasar yarıya, biraz can ve nefes', '', false, '4', 'savun')}
        ${F.p.cards.length ? `<i class="fsep"></i>${F.p.cards.map((k, idx) => { const used = F.p.used.includes(k); const cKey = CARD_KEYS[idx] || ''; return fab(`data-a="fcard" data-k="${k}" style="--cc:${cardColor(k)}"`, cardIc(k), CARDS[k].ad, used ? 'Bu dövüşte kullanıldı' : CARDS[k].d, 'card' + (used ? ' used' : ''), used, cKey, 'card:' + k); }).join('')}` : ''}
        ${FT.mode === 'mp' && !FT.bet && S.gold >= 40 ? `<i class="fsep"></i>${fab('data-a="spec-bet"', actIcon('gear'), 'Bahis (40)', 'Kazanırsan +80 altın')}` : ''}
        <i class="fsep"></i>${fab('data-a="fact" data-x="teslim"', actIcon('teslim'), 'Teslim', FT.lethal ? 'Dövüşü bırak · ölüm zarı yok' : 'Dövüşü bırak', 'surr')}
      </nav>`;
    }
  }
  const logHtml = FT.log.slice(-3).map(l => `<li class="${l.c || ''}">${l.t}</li>`).join('');
  const done = F.over && !play ? `<div class="fend ${F.draw ? 'draw' : F.winner === 'p' ? 'win' : 'lose'}"><h3>${FT.spectating ? 'Karşılaşma Sona Erdi' : F.draw ? 'Berabere' : F.winner === 'p' ? 'Zafer' : F.surrender ? 'Teslim' : 'Yenilgi'}</h3><ul>${(FT.result || []).map(l => `<li>${l}</li>`).join('')}</ul><button class="btn primary big" data-a="fight-done">Devam <kbd class="fkbd-in">[Boşluk]</kbd></button></div>` : '';
  const bgScene = FT.mode === 'kule' ? sceneOr('kule', scenePit()) : FT.tier === 'cukur' ? sceneOr('pit', scenePit()) : sceneOr('arena', sceneArena());
  const specTag = FT.spectators ? ` · <span>Tribün: ${FT.spectators} ocak izliyor</span>` : '';
  const needIntroCut = !FT.introShown && F.round <= 1 && !play && !FT.spectating;
  if (needIntroCut) FT.introShown = true;
  showModal(`<div class="fbg">${bgScene}</div>
    <div class="fight v2 ${FT.lethal ? 'lethal' : ''} ${F.round <= 1 ? 'fight-dramatic-entry' : ''}">
      <div class="fhead"><span>${FT.title}</span><span>${play ? `<button class="fskip" data-a="fskip">${ui('fast')} Atla</button>` : ''}Tur ${F.round}${FT.waitingForOpponent ? ' · Hamlen alındı, rakip bekleniyor' : ''}${specTag}${FT.lethal ? ` · ${ui('skull')} yenilgide %${FT.risk}` : ''}</span></div>
      <div class="plates">${plate(F.p, 'p', play && FT.pre.p)}<div class="vs">VS</div>${plate(F.e, 'e', play && FT.pre.e)}</div>

      <div class="arena-floor"><div class="fbanner" id="fbanner"></div>${typeof renderChibiDoll === "function" ? `<div class="arena-tamer p">${renderChibiDoll(null, { cls: "arena-doll", battle: true, anim: (F.over && !play && F.winner === 'p') ? 'victory' : 'idle', el: F.p.el })}</div><div class="arena-tamer e">${renderChibiDoll(typeof peerChibiConfig === "function" ? peerChibiConfig((typeof FT !== "undefined" && FT && FT.peer) || opp, opp && opp.peerIdx != null ? opp.peerIdx : undefined) : null, { cls: "arena-doll", flip: true, battle: true, anim: (F.over && !play && F.winner === 'e') ? 'victory' : 'idle', el: F.e.el })}</div>` : ""}<div class="fart fdr p${F.over && !play && !F.surrender && F.winner !== 'p' ? ' ko done' : ''}" id="fa-p">${dragonSVG(d)}</div><div class="fart fdr e${F.over && !play && !F.surrender && F.winner !== 'e' ? ' ko done' : ''}" id="fa-e">${dragonSVG(opp, { flip: true })}</div></div>
      ${acts}${(F.over && !play) || FT.spectating ? '' : supFab(play)}<ul class="flog" id="flog">${logHtml}</ul>${done}${FT.spectating ? '' : supChooser()}
    </div>`, 'fightm');
  if (needIntroCut && typeof fightCut === 'function' && !FX_FAST()) {
    const isBossMatch = !!(FT.final || FT.mode === 'kule' || FT.mode === 'tour' || FT.tier === 'cukur' || /Karabela|Kül Yutan|Demirhan|Muhafız|Şampiyon/i.test((opp && opp.name) || FT.title || ''));
    const introCap = FT.final
      ? `Demirhan: “Dedenin ocağını söndürmeye geldim! ${opp ? opp.name : 'Karabela'} seni yere serecek!”`
      : FT.mode === 'kule'
      ? `${opp ? opp.name : 'Gök Kulesi Muhafızı'} kükreyerek ${d ? d.name : 'ejderhanın'} karşısına dikildi!`
      : FT.tier === 'cukur'
      ? `Yeraltı Çukuru'nda merhamet yok — ${d ? d.name : 'ejderhan'} ve ${opp ? opp.name : 'rakibi'} karşı karşıya!`
      : `${d ? d.name : 'Ejderhan'} ve ${opp ? opp.name : 'rakibi'} er meydanında karşı karşıya!`;
    fightCut('kalkis', {
      cap: introCap,
      ono: isBossMatch ? 'MEYDAN OKUMA!' : 'BAŞLA!'
    });
  }
  if (play) playRound(evs);
}
function evText(ev) {
  const a = ev.who === 'p' ? FT.F.p : FT.F.e, t = ev.who === 'p' ? FT.F.e : FT.F.p, A = `<b>${esc(a.name)}</b>`;
  if (ev.act === 'savun') return { t: `${A} savunmaya geçti ve nefeslendi.` };
  if (ev.act === 'teslim') return { t: `${A} başını eğdi.`, c: 'bad' };
  if (ev.act === 'stun') return { t: `${A} sersemledi, bu tur kıpırdayamadı.`, c: ev.who === 'p' ? 'bad' : 'good' };
  if (ev.act === 'card') {
    const C = CARDS[ev.card], K = `<b class="cardn" style="--cc:${cardColor(ev.card)}">${C.ad}</b>`, c = ev.who === 'p' ? 'good' : 'bad';
    if (ev.card === 'buz_zirh') return { t: `${A} ${K}! Pulları buzla kaplandı.`, c };
    if (ev.card === 'sarsinti') return { t: `${A} ${K}! Yer yarıldı, ${esc(t.name)} sersemledi.`, c };
    if (ev.card === 'golge_adim') return { t: `${A} ${K}! Gölgelere karıştı.`, c };
    if (ev.card === 'son_nefes') return { t: `${A} ${K}! <b>${ev.heal}</b> can topladı.`, c };
    if (ev.card === 'kukreyen_yurek') return { t: `${A} ${K}! Yüreği alev aldı, ${esc(t.name)} sarsıldı.`, c };
    if (ev.card === 'kanat_kalkan') return { t: `${A} ${K}! Kanatlarını kalkan gibi kapadı.`, c };
    if (ev.card === 'ayaz_tayfi') return { t: `${A} ${K}! Sis ve gölgeye karışıp ${esc(t.name)} adlı rakibi dondurdu.`, c };
    if (ev.card === 'kadim_buzul') return { t: `${A} ${K}! Donmuş toprak zırhıyla <b>${ev.heal}</b> can yeniledi.`, c };
    if (ev.miss) return { t: `${A} ${K} denedi ama ${ev.evaded ? `${esc(t.name)} gölgeden sıyrıldı` : 'boşa gitti'}.`, c: 'mute' };
    let s2 = `${A} ${K}: <b>${ev.dmg}</b> hasar${ev.hits === 2 ? ' (iki darbe)' : ''}${ev.crit ? ', kritik!' : ''}`;
    if (ev.blocked) s2 = `${A} ${K} indirdi ama ${esc(t.name)} kanat kalkanıyla hepsini savuşturdu.`;
    if (ev.saved) s2 += ` <b class="heart">${esc(t.name)} düşmek üzereyken sana baktı ve ayağa kalktı!</b>`;
    return { t: s2, c };
  }
  const W = list => list && list.length ? ` <span class="why">(${list.map(esc).join(' · ')})</span>` : '';
  if (ev.act === 'kukre') return ev.ok ? { t: `${A} kükredi! ${esc(t.name)} sarsıldı. <span class="why">(%${ev.c} şans)</span>`, c: 'good' } : { t: `${A} kükredi ama ${esc(t.name)} istifini bozmadı.${W([`%${ev.c} şans`, ...(ev.why || [])])}`, c: 'mute' };
  const nm = ev.act === 'nefes' ? `${EL_AD[a.el].toLowerCase()} nefesi` : 'pençesi';
  const fb = ev.fb ? `${A} nefesi yetmedi, pençeye döndü. ` : '';
  if (ev.miss) return { t: fb + (ev.evaded ? `${esc(t.name)} gölgeden sıyrıldı; ${ek(A, 'gen')} ${nm} boşa gitti.` : `${ek(A, 'gen')} ${nm} boşa gitti.${W([`%${ev.hitP} isabet`, ...(ev.why || [])])}`), c: 'mute' };
  if (ev.covered) return { t: `<b>${esc(ev.covered)}</b> araya atıldı ve ${ek(A, 'gen')} ${nm.replace(/si$/, 'sini')} göğsüyle karşıladı!`, c: ev.who === 'e' ? 'good' : 'bad' };
  if (ev.blocked) return { t: `${esc(t.name)} kanat kalkanıyla ${ek(A, 'gen')} ${nm.replace(/si$/, 'sini')} savuşturdu.`, c: 'mute' };
  let s = fb + `${ek(A, 'gen')} ${nm}: <b>${ev.dmg}</b> hasar`;
  if (ev.crit) s += ', kritik!'; if (ev.elm > 1) s += ' Element üstünlüğü!';
  s += W(ev.why);
  if (ev.saved) s += ` <b class="heart">${esc(t.name)} düşmek üzereyken sana baktı ve ayağa kalktı!</b>`;
  return { t: s, c: ev.who === 'p' ? 'good' : 'bad' };
}
/* ---- Tur oynatıcı: olaylar tek tek, darbe anında can düşer ---- */
const FX_FAST = () => !!window.__fastFx;
const wait = ms => new Promise(r => setTimeout(r, FX_FAST() ? Math.min(ms, 15) : ms));
function actName(ev, a) {
  if (ev.act === 'card') return CARDS[ev.card].ad;
  return { pence: 'Pençe', nefes: `${EL_AD[a.el]} nefesi`, savun: 'Savunma', kukre: 'Kükreme', stun: 'Sersem', teslim: 'Teslim' }[ev.act] || ev.act;
}
function setBars(side, st, F) {
  const f = F[side], hp = $('#hp-' + side), sta = $('#sta-' + side); if (!hp) return;
  const w = Math.max(0, st.hp / f.maxHp * 100);
  const bar = hp.querySelector('i.fill') || hp.querySelector('i:not(.ghost)');
  const gh = hp.querySelector('.ghost');
  const prev = bar ? (parseFloat(bar.style.width) || 0) : w;
  if (bar) bar.style.width = w + '%';
  hp.querySelector('span').textContent = `${st.hp} / ${f.maxHp}`;
  if (w < prev) {
    hp.classList.remove('dmgflash'); void hp.offsetWidth; hp.classList.add('dmgflash');
    setTimeout(() => { if (gh) gh.style.width = w + '%'; }, FX_FAST() ? 0 : 280);
  } else if (gh) {
    gh.style.width = w + '%';
  }
  hp.classList.toggle('low', w <= 25);
  if (sta) sta.querySelector('i').style.width = st.sta + '%';
}
function banner(ev, a) {
  const b = $('#fbanner'); if (!b) return;
  const tag = ev.act === 'card' ? 'YETENEK' : ev.act === 'stun' ? 'SERSEM' : ev.act === 'savun' ? 'SAVUNMA' : ev.act === 'kukre' ? 'KÜKREME' : 'SALDIRI';
  b.className = 'fbanner ' + ev.who + (ev.act === 'card' ? ' card' : '');
  if (ev.act === 'card') b.style.setProperty('--cc', cardColor(ev.card)); else b.style.removeProperty('--cc');
  b.innerHTML = `<span class="fbt">${tag}</span><b>${esc(a.name)}</b><em>${actName(ev, a)}</em>`;
  void b.offsetWidth; b.classList.add('in');
}
function popTag(el, txt, cls) { const n = document.createElement('span'); n.className = 'ftag ' + (cls || ''); n.textContent = txt; el.appendChild(n); setTimeout(() => n.remove(), FX_FAST() ? 30 : 1100); }
function spawnCombatPopup(el, txt, cls) {
  if (!el) return;
  const n = document.createElement('span');
  n.className = 'dmg fdmg ' + (cls || '');
  n.textContent = txt;
  el.appendChild(n);
  setTimeout(() => n.remove(), FX_FAST() ? 40 : 1050);
}
function setArenaTamerAnim(side, animKey) {
  const doll = document.querySelector(`.arena-tamer.${side} .chibi-doll`);
  if (!doll) return;
  doll.classList.forEach(c => { if (c.startsWith('anim-')) doll.classList.remove(c); });
  void doll.offsetWidth;
  doll.classList.add('anim-' + (animKey || 'idle'));
}
async function playStep(ev, txt, F0) {
  if (!FT || FT.F !== F0) return;
  const a = F0[ev.who], ds = ev.who === 'p' ? 'e' : 'p';
  const atk = document.getElementById('fa-' + ev.who), def = document.getElementById('fa-' + ds);
  if (!atk || !def) return;
  banner(ev, a); atk.classList.add('acting');
  const breath = ev.act === 'nefes' || ['alev_yagmuru', 'kizil_buhar', 'magma_zirh', 'plazma_akimi', 'dondurucu_bora', 'kara_alev'].includes(ev.card);
  const striking = ev.dmg != null || ev.miss || ev.blocked;
  if (ev.act === 'savun') setArenaTamerAnim(ev.who, 'guard');
  else if (ev.act === 'kukre') setArenaTamerAnim(ev.who, 'charge');
  else if (ev.act === 'card') setArenaTamerAnim(ev.who, striking ? 'ult_combo' : 'charge');
  else if (breath) setArenaTamerAnim(ev.who, 'dragon_shot');
  else if (striking) setArenaTamerAnim(ev.who, 'wpn_slash');
  await wait(240);
  const ra = atk.getBoundingClientRect(), rd = def.getBoundingClientRect();
  const mouth = [ev.who === 'p' ? ra.x + ra.width * 0.82 : ra.x + ra.width * 0.18, ra.y + ra.height * 0.3];
  const target = [rd.x + rd.width / 2, rd.y + rd.height * 0.5];
  const atkCenter = [ra.x + ra.width / 2, ra.y + ra.height * 0.36];
  if (ev.act === 'savun') {
    SFX.play('guard'); atk.classList.add('guarding'); popTag(atk, 'SAVUNMA', 'blue');
    const healAmt = Math.max(1, Math.round(a.maxHp * 0.04));
    spawnCombatPopup(atk, '+' + healAmt, 'heal');
    if (typeof FX?.floatText === 'function') FX.floatText(atkCenter[0], atkCenter[1], `+${healAmt} CAN`, '#9ad07a');
  }
  if (ev.act === 'stun') { setArenaTamerAnim(ev.who, 'hit'); atk.classList.add('dizzy'); popTag(atk, 'SERSEM', 'bad'); SFX.play('stun'); setTimeout(() => atk.classList.remove('dizzy'), 900); }
  if (ev.act === 'kukre') {
    SFX.play(((a.ref && a.ref.stage) || a.stage) === 'yavru' ? 'roarS' : 'roar'); atk.classList.add('roar'); shake($('.fight'));
    const ring = document.createElement('i'); ring.className = 'shockwave ' + ev.who; atk.appendChild(ring); setTimeout(() => ring.remove(), 900);
    if (typeof FX?.shockwave === 'function') FX.shockwave(atkCenter[0], atkCenter[1], a.el);
    await wait(300); if (ev.ok) { setArenaTamerAnim(ds, 'hit'); def.classList.add('hit', 'hit-flash'); setTimeout(() => def.classList.remove('hit', 'hit-flash'), 360); popTag(def, 'SARSILDI', 'bad'); } else popTag(def, 'DİRENDİ', 'mute');
  }
  if (ev.act === 'card') {
    const fl = document.createElement('div'); fl.className = 'cardflash ' + ev.who; fl.style.setProperty('--cc', cardColor(ev.card)); fl.innerHTML = `<b>${CARDS[ev.card].ad}</b>`;
    atk.appendChild(fl); setTimeout(() => fl.remove(), 1100); SFX.play('card');
    FX.burst(atkCenter[0], atkCenter[1], CARDS[ev.card].el || null, 24, 1);
    if (typeof FX?.shockwave === 'function') FX.shockwave(atkCenter[0], atkCenter[1], CARDS[ev.card].el || a.el);
    if (ev.card === 'sarsinti') { shake($('.fight'), true); setArenaTamerAnim(ds, 'hit'); def.classList.add('dizzy'); setTimeout(() => def.classList.remove('dizzy'), 900); }
    if (ev.card === 'son_nefes' || ev.card === 'kadim_buzul') {
      FX.hearts(atkCenter[0], atkCenter[1]);
      if (typeof ev.heal === 'number' && ev.heal > 0) {
        spawnCombatPopup(atk, '+' + ev.heal, 'heal');
        if (typeof FX?.floatText === 'function') FX.floatText(atkCenter[0], atkCenter[1] - 16, `+${ev.heal} CAN`, '#9ad07a');
      }
    }
    if (ev.card === 'buz_zirh' || ev.card === 'kanat_kalkan') { atk.classList.add('guarding'); setArenaTamerAnim(ev.who, 'guard'); }
    if (ev.card === 'golge_adim') atk.classList.add('ghosted');
    if (!striking) await wait(450);
  }
  if (striking) {
    atk.classList.add('lunge-squash', 'lunge-' + ev.who);
    setTimeout(() => atk.classList.remove('lunge-squash', 'lunge-' + ev.who), 460);
    if (breath) { FX.breath(mouth[0], mouth[1], target[0], target[1], a.el); SFX.play('breath-' + a.el); }
    await wait(breath ? 360 : 185);
    const popCls = (ev.crit ? 'crit ' : '') + (ev.miss || ev.blocked ? 'miss' : '');
    const popTxt = ev.miss ? (ev.evaded ? 'sıyrıldı' : 'ıska') : ev.blocked ? 'engellendi' : '−' + ev.dmg;
    spawnCombatPopup(def, popTxt, popCls);
    if (ev.miss) {
      def.classList.add('dodge-' + ds); setTimeout(() => def.classList.remove('dodge-' + ds), 450); SFX.play('miss');
      if (typeof FX?.floatText === 'function') FX.floatText(target[0], target[1] - 20, ev.evaded ? 'SIYRILDI' : 'ISKA', '#a39a88');
      if (!ev.evaded) popTag(def, `KAÇTI · %${100 - (ev.hitP || 0)}`, 'mute');
    } else if (ev.blocked) {
      SFX.play('guard'); def.classList.add('guarding'); setArenaTamerAnim(ds, 'guard');
      if (typeof FX?.floatText === 'function') FX.floatText(target[0], target[1] - 20, 'ENGELLENDİ', '#7cc6e6');
    } else {
      setArenaTamerAnim(ds, 'hit');
      def.classList.add('hit', 'hit-flash');
      if (typeof FX?.shockwave === 'function') FX.shockwave(target[0], target[1], breath ? a.el : (ev.crit ? a.el : null));
      if (typeof FX?.floatText === 'function') FX.floatText(target[0], target[1] - 24, (ev.crit ? 'KRİTİK! −' : '−') + ev.dmg, ev.crit ? '#ffd23a' : '#ff7a6a');
      await wait(ev.crit ? 85 : 45);
      setTimeout(() => def.classList.remove('hit', 'hit-flash'), 360);
      FX.burst(target[0], target[1], breath ? a.el : null, ev.crit ? 40 : 18, ev.crit ? 1.4 : 0.9); SFX.play(ev.crit ? 'crit' : 'hit');
      if (ev.crit) { shake($('.fight'), true); popTag(def, 'KRİTİK!', 'crit'); $('.fight')?.classList.add('critflash'); setTimeout(() => $('.fight')?.classList.remove('critflash'), 260); }
      else if (ev.elm > 1) popTag(def, 'ETKİLİ!', 'good');
      else if (ev.elm < 1) popTag(def, `DAYANIKLI · ${EL_AD[F0[ds].el]}`, 'mute');
      else if (ev.guarded || ev.shielded) { }
      else if (ev.why && ev.why.length && ev.dmg < F0[ds].maxHp * .06) popTag(def, 'AZ ETKİ', 'mute');
      if (ev.shielded || ev.guarded) popTag(def, ev.shielded ? 'ZIRH' : 'SAVUNDU', 'blue');
      if (ev.saved) { FX.hearts(target[0], target[1]); SFX.play('heart'); popTag(def, 'BAĞ!', 'heart'); }
    }
  }
  if (ev.after) { setBars('p', ev.after.p, F0); setBars('e', ev.after.e, F0); }
  const log = $('#flog');
  if (log && txt) { const li = document.createElement('li'); li.className = (txt.c || '') + ' new'; li.innerHTML = txt.t; log.appendChild(li); while (log.children.length > 3) log.firstElementChild.remove(); }
  if (typeof pipOnEvent === 'function') pipOnEvent(ev, F0);
  await wait(ev.act === 'savun' || ev.act === 'stun' ? 520 : 620);
  atk.classList.remove('acting', 'guarding', 'roar', 'ghosted'); def.classList.remove('guarding');
  setArenaTamerAnim('p', 'idle'); setArenaTamerAnim('e', 'idle');
}
const playEvent = playStep;
async function playRound(evs) {
  const F0 = FT.F, texts = FT.pending || [], my = FT.playId = (FT.playId || 0) + 1;
  FT.busy = true;
  const b0 = $('#fbanner'); if (b0) { b0.className = 'fbanner round'; b0.innerHTML = `<span class="fbt">TUR</span><b>${F0.round}</b>`; void b0.offsetWidth; b0.classList.add('in'); }
  await wait(360);
  if (typeof pipOnEvent === 'function') pipOnEvent({ act: 'round' }, F0);
  for (let i = 0; i < evs.length; i++) { if (!FT || FT.playId !== my || FT.skip) break; await playStep(evs[i], texts[i], F0); }
  if (!FT || FT.playId !== my) return;
  const ct = FT.cutNext; FT.cutNext = null;
  if ((ct === 'darbe' || ct === 'sendele' || ct === 'nefes' || ct === 'siper' || ct === 'boss_ult' || ct === 'boss_darbe') && !FT.skip) { FT.cutN = (FT.cutN || 0) + 1; FT.cutSeen[ct] = 1; await fightCut(ct); if (!FT || FT.playId !== my) return; }
  if (F0.over && !F0.surrender) {
    const loser = document.getElementById('fa-' + (F0.winner === 'p' ? 'e' : 'p'));
    if (loser && !FT.skip) { loser.classList.add('ko'); const st = document.createElement('div'); st.className = 'kostamp'; st.textContent = F0.timeout ? 'SÜRE!' : 'NAKAVT!'; $('.arena-floor')?.appendChild(st); SFX.play('ko'); setTimeout(() => SFX.play(F0.winner === 'p' ? 'cheer' : 'gasp', { vol: .7 }), 500); await wait(1300); }
    if ((ct === 'zafer' || ct === 'yenik') && !FT.skip) { FT.cutN = (FT.cutN || 0) + 1; await fightCut(ct); if (!FT || FT.playId !== my) return; }
  }
  endPlayback();
}
function canUseFightAction(x) {
  if (!FT || !FT.F || FT.F.over || FT.spectating || FT.waitingForOpponent) return false;
  const p = FT.F.p;
  if (x === 'pence' || x === 'savun' || x === 'teslim') return true;
  if (x === 'nefes') return p.sta >= NEFES_COST;
  if (x === 'kukre') return p.sta >= 15;
  if (typeof x === 'string' && x.startsWith('card:')) {
    const k = x.slice(5);
    return Array.isArray(p.cards) && p.cards.includes(k) && !(p.used || []).includes(k);
  }
  return false;
}
function updateBufferedFabUI() {
  if (!FT) return;
  const b = FT.bufferedAct;
  document.querySelectorAll('.fdock .fab').forEach(btn => {
    const act = btn.dataset.a === 'fcard' ? 'card:' + btn.dataset.k : btn.dataset.x;
    btn.classList.toggle('buffered', !!(b && act === b));
  });
}
function endPlayback() {
  if (!FT || (!FT.pre && !FT.busy)) return;
  FT.log.push(...(FT.pending || []), ...(FT.pipLog || [])); FT.pending = null; FT.pipLog = null; FT.pre = null; FT.busy = false; FT.skip = false;
  fightModal();
  if (FT.F.over) {
    FT.bufferedAct = null;
    setTimeout(() => SFX.play(FT && FT.F.draw ? 'gasp' : FT && FT.F.winner === 'p' ? 'win' : 'lose'), 200);
  } else if (FT.bufferedAct) {
    const nextAct = FT.bufferedAct;
    FT.bufferedAct = null;
    if (canUseFightAction(nextAct)) {
      setTimeout(() => { if (FT && !FT.F.over && !FT.busy && !FT.pre) fightAction(nextAct); }, 55);
    }
  }
}
function fightAction(x) {
  if (!FT || FT.F.over || FT.spectating) return;
  if (FT.busy || FT.pre) {
    FT.bufferedAct = x;
    SFX.play('tick');
    updateBufferedFabUI();
    return;
  }
  if (!canUseFightAction(x)) {
    SFX.play('error');
    return;
  }
  if (FT.mode === 'mp' && FT.mpRoomId && typeof mpSubmitDragonDuelAction === 'function') {
    mpSubmitDragonDuelAction(x);
    return;
  }
  FT.busy = true;
  FT.bufferedAct = null;
  const pre = fsnap(FT.F);
  const evs = fightRound(FT.F, x);
  FT.pending = evs.map(evText);
  FT.cutNext = typeof fightCutPick === 'function' ? fightCutPick(evs, FT.F) : null;
  if (FT.F.over) finishFight();
  FT.pre = pre;
  fightModal(evs);
}
function finishFight() {
  const { F, d, opp } = FT;
  if (FT.mode === 'tour') return finishTourRound();
  if (FT.mode === 'mp' && typeof finishMpFight === 'function') return finishMpFight();
  if (FT.mode === 'kule' && typeof finishKuleFight === 'function') return finishKuleFight();
  if (FT.mode === 'spectate' && typeof finishSpectateFight === 'function') return finishSpectateFight();
  const { won, lines } = fightOutcome(d, F, FT.tier, opp);
  FT.result = lines;
  if (!won && !F.surrender && FT.lethal) {
    const r = rollDeath(d, TIERS[FT.tier].olum);
    if (r.anka) FT.result.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümün eşiğinden döndü. Tılsım yandı.');
    else if (r.died) { FT.died = true; FT.result.push(`<b class="bad">${esc(d.name)} ayağa kalkmadı.</b>`); }
    else FT.result.push(`Ölüm zarı (%${r.risk}) tuttu; ${esc(d.name)} yaralı ama hayatta.`);
  }
  if (won && FT.bet) { S.gold += FT.bet; FT.result.push(`Bahis kâğıdı kazandı: <b class="good">+${FT.bet} altın</b>.`); }
  S.arena[FT.tier].splice(FT.idx, 1);
  d.task = { t: 'done', what: (won ? 'Kazandığı' : 'Kaybettiği') + ' bir dövüşe çıktı' };
  if (won) setTimeout(() => FX.coins(innerWidth / 2, innerHeight / 2), 900);
}
function fightDone() {
  if (!FT) return;
  if (FT.mode === 'spectate') { if (FT.specTimer) clearTimeout(FT.specTimer); FT = null; closeModal(); return; }
  if (FT.mode === 'mp' && typeof doneMpFight === 'function') return doneMpFight();
  if (FT.mode === 'kule' && typeof doneKuleFight === 'function') return doneKuleFight();
  const d = FT.d, died = FT.died, mode = FT.mode, tier = FT.tier, opp = FT.opp, won = FT.F.winner === 'p';
  if (mode === 'tour' && !FT.tourOver) { FT = null; nextTourRound(); return; }
  FT = null;
  if (died) {
    killDragon(d, tier === 'cukur' ? 'Yeraltı Çukuru\'nda öldü' : 'turnuvada öldü'); afterAction(true); deathModal(d, tier === 'cukur' ? 'Yeraltı Çukuru' : 'Turnuva');
    if (mode === 'tour' && S.tour.id === 'tac') { S.over = true; S.ending = 'tac-kayip'; saveGame(); pushModal(endingModal); }
    return;
  }
  if (mode === 'tour' && S.tour.id === 'tac') {
    S.over = true;
    S.ending = S.tour.won ? 'taj' : 'tac-kayip';
    afterAction(true);
    pushModal(endingModal);
    closeModal();
    return;
  }
  const asr = mode !== 'tour' && typeof arenaStoryNext === 'function' ? arenaStoryNext(d, tier, opp, won) : null;
  if (asr) {
    arenaStoryShow(asr);
  } else if (mode !== 'tour' && chance(45) && S.dragons.includes(d)) {
    const pp = pickFightPost(d, opp, won);
    if (pp) pushModal(() => postFightModal(pp));
  }
  afterAction(true);
  closeModal();
}
function startTour(d) { const T = S.tour; d.tourW = d.tourW || {}; if (d.tourW[T.id] == null) d.tourW[T.id] = 0; if (typeof careerCheck === 'function') careerCheck(false); T.dragon = d.id; T.round = 0; T.hp = null; d.task = { t: 'done', what: `${ek(T.ad, 'loc')} dövüştü` }; nextTourRound(); }
function nextTourRound() {
  const T = S.tour, d = byId(T.dragon);
  const opp = genOpp(null, T.rounds[T.round], T.gear);
  if (T.id === 'tac' && T.round === 2) { const rv = rivals()[0], L = Math.round((T.rounds[2] + rv.power) / 2); Object.assign(opp, genOpp(null, L, T.gear), { id: opp.id }); }
  if (T.id === 'tac' && T.round === 2) Object.assign(opp, { name: (typeof rivals === 'function' && rivals()[0].champ.name) || 'Karabela', trainer: 'Demirhan', el: 'golge', eye: 'A', horn: 't', pat: 'd', arch: 'Saf kanlı şampiyon', traits: ['demir'] });
  if (T.id === 'tac' && T.round === 2 && S.flags.demHelped) Object.assign(opp, { traits: [], arch: 'Saf kanlı şampiyon · borcunu ödüyor' }); // Demirhan zırhını çıkarır
  if (T.id === 'tac' && T.round === 2 && S.flags.demRefused) { for (const k of STATS) opp.st[k] = Math.round(opp.st[k] * 0.92); opp.arch = 'Saf kanlı şampiyon · yarası tam kapanmadı'; }
  if (T.id === 'kupa' && T.round === 2) Object.assign(opp, { trainer: 'Demirhan', name: 'Kuzgun' });
  const pf = fighterFromDragon(d), F = newFight(pf, fighterFromOpp(opp));
  if (T.hp != null) F.p.hp = Math.round(T.hp + (pf.maxHp - T.hp) * 0.5);
  FT = { F, d, opp, log: [], mode: 'tour', lethal: true, risk: deathRisk(d, 10), title: `${T.ad} · ${['İlk tur', 'Yarı final', 'Final'][T.round]} · ${opp.trainer}` };
  { const sb = scoutBuff(d, F.p); if (sb) FT.log.push({ t: sb, c: 'mute' }); }
  if (T.round > 0) FT.log.push({ t: `Turlar arası yaraların yarısı sarıldı. ${esc(d.name)} ${F.p.hp}/${F.p.maxHp} canla çıkıyor.`, c: 'mute' });
  fightModal(); SFX.play('roar');
}
function finishTourRound() {
  const T = S.tour, { F, d } = FT, won = F.winner === 'p';
  FT.result = []; d.fat = clamp(d.fat + 12, 0, 100);
  if (won) {
    const g = T.odul[T.round], u = T.un[T.round];
    S.gold += g; S.un += u; d.w++; S.st.wins++; addBond(d, 3); nudge(d, 'ces', 3);
    d.tourW = d.tourW || {}; d.tourW[T.id] = Math.max(d.tourW[T.id] || 0, T.round + 1);
    FT.result.push(`<b class="good">${['İlk turu', 'Yarı finali', 'Finali'][T.round]} kazandın!</b> +${g} altın, +${u} ün.`);
    if (typeof awardChibiStones === 'function') {
      const roundStones = awardChibiStones({ stones: { kor_t2: ri(1, 2) } });
      if (roundStones.length) FT.result.push(`Turnuva Turu Ödülü: <b>${roundStones.join(', ')}</b>.`);
    }
    T.hp = F.p.hp; T.round++; if (F.p.saves) d.saved = (d.saved || 0) + F.p.saves;
    if (T.round === 3 && T.id === 'kupa') rivalBeaten('demirhan', 6);
    if (T.round >= 3) {
      d.champ = T.id;
      if (T.id === 'tac') {
        S.flags = S.flags || {}; S.flags.champ = true; S.flags.kizilTac = true; S.st.kupa = (S.st.kupa || 0) + 1;
      }
      if (typeof awardChibiStones === 'function') {
        const champDrops = T.id === 'tac' ? { anka_koruma: 1, kor_t3: 2 } : { anka_koruma: 1, kor_t2: 2 };
        const gotChamp = awardChibiStones({ stones: champDrops });
        if (gotChamp.length) FT.result.push(`<b class="good">Şampiyonluk Hazinesi:</b> ${gotChamp.join(', ')}!`);
      }
      titleCheck(d); snapAlbum('tour', T.ad, `${d.name} ${ek(T.ad, 'acc')} kazandı!`, d); T.done = true; T.won = true; FT.tourOver = true; T.summary = `${d.name} şampiyon oldu!`; chron(`${d.name} ${ek(T.ad, 'acc')} kazandı!`); FT.result.push(`<b>${T.ad} senin!</b>`);
    }
  } else {
    d.l++; S.st.losses++; T.done = true; T.won = false; FT.tourOver = true;
    const where = ['ilk turda', 'yarı finalde', 'finalde'][T.round];
    T.summary = `${d.name} ${where} elendi.`; chron(`${d.name} ${ek(T.ad, 'loc')} ${where} elendi.`);
    FT.result.push(F.surrender ? 'Teslim oldun ve turnuvadan çekildin.' : `<span class="bad">${where[0].toUpperCase() + where.slice(1)} elendin.</span>`);
    if (!F.surrender) {
      if (chance(hasMark(d, 'Temkinli') ? 25 : 50)) d.inj = ri(1, 2);
      const r = rollDeath(d, 10);
      if (r.anka) FT.result.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümden döndü.');
      else if (r.died) { FT.died = true; FT.result.push(`<b class="bad">${esc(d.name)} ayağa kalkmadı.</b>`); }
    }
    addMood(d, -1, true);
  }
}

/* ================= SEFER AKIŞI ================= */
let EX = null;
function startSefer(r, e) {
  const R = REGIONS[r]; S.gold -= seferCost(r); S.st.seferler++;
  e.task = { t: 'done', what: `${R.ad} seferine çıktı` }; e.dirt = clamp((e.dirt || 0) + 25, 0, 100);
  EX = { r, e, cards: seferCards(r), i: 0, wild: null, res: null };
  exCard();
}
function exFrame(inner, wildArt) {
  const R = REGIONS[EX.r];
  showModal(`<div class="expm"><div class="exbg">${sceneOr(EX.r, sceneRegion(EX.r))}<div class="exdr">${dragonSVG(EX.e)}</div>${wildArt ? `<div class="exwild">${wildArt}</div>` : ''}<div class="exttl"><p class="kicker">${R.ad}</p></div></div><div class="excard">${inner}</div></div>`, 'exwrap');
  FX.setMode({ kul: 'ash', buzul: 'snow', kayalik: 'rain', orman: 'fireflies', bataklik: 'spores', col: 'dust', mercan: 'fireflies', bulut: 'rain', obsidiyen: 'embers' }[EX.r]);
}
function exCard() {
  if (EX.i >= EX.cards.length) return exWild();
  const C = EX.cards[EX.i];
  const opts = C.o.map((o, i) => { const why = o.req ? o.req() : null; return `<button class="vopt" data-a="exopt" data-i="${i}" ${why ? 'disabled' : ''}>${o.t}${why ? `<small>${why}</small>` : ''}</button>`; }).join('');
  exFrame(`<p class="step">Karşılaşma ${EX.i + 1} / 3</p><p class="vntext">${C.t}</p>${EX.res ? `<p class="result">${EX.res}</p><div class="mbtns"><button class="btn primary" data-a="exnext">Yola devam</button></div>` : `<div class="vnopts">${opts}</div>`}`);
}
function exWild() {
  if (!EX.wild) EX.wild = genWild(EX.r);
  const w = EX.wild, e = EX.e;
  if (EX.res) { exFrame(`<p class="step">Karşılaşma 3 / 3</p><p class="result">${EX.res}</p><div class="mbtns"><button class="btn primary" data-a="exend">Ocağa dön</button></div>`, EX.caught ? '' : `<div class="fled">${dragonSVG(w, { flip: true })}</div>`); if (EX.caught) setTimeout(() => FX.hearts(innerWidth / 2, innerHeight * 0.35), 100); return; }
  const full = freeSlots() < 1;
  const foods = Object.keys(FOODS).filter(f => S.food[f] > 0);
  exFrame(`<p class="step">Karşılaşma 3 / 3</p><h3>Bir yaban ejderhası!</h3>
    <p><b>${esc(w.name)}</b> ${sexIc(w.sex)} ${elChip(w.el)} <span class="mute sm">${STAGE_AD[w.stage]}</span> ${w.traits.map(t => `<span class="trait sm" title="${TRAITS[t].d}"><b>${TRAITS[t].ad}</b></span>`).join('')}</p>
    <div class="pstats">${STATS.map(k => { const s = w.genes.pot[k][0] + w.genes.pot[k][1]; return `<span>${ST_KISA[k]}<b>${w.st[k]}</b><i class="g${Math.floor(s / 2)}">${potLetter(s)}</i></span>`; }).join('')}</div>
    ${full ? '<p class="warn">İnlerde yer yok. Yakalasan bile götüremezsin; önce bir İn kur.</p>' : ''}
    <div class="vnopts">${foods.map(f => `<button class="vopt" data-a="catch" data-m="yem" data-f="${f}" ${full ? 'disabled' : ''}>${foodIcon(f)} ${FOODS[f].ad} bırak <small>%${foodOdds(w, f)} · elinde ${S.food[f]}</small></button>`).join('')}
      <button class="vopt" data-a="catch" data-m="sakin" ${full ? 'disabled' : ''}>${esc(e.name)} ile sakince yaklaş <small>%${catchOdds(e, w, 'sakin')} · zekâ ve bağ</small></button>
      <button class="vopt" data-a="catch" data-m="guc" ${full ? 'disabled' : ''}>${esc(e.name)} onu bastırsın <small>%${catchOdds(e, w, 'guc')} · eskort yorulur, yaralanabilir</small></button>
      <button class="vopt ghost" data-a="catch" data-m="birak">Bırak gitsin</button></div>`, dragonSVG(w, { flip: true }));
}
function doCatch(m, f) {
  const w = EX.wild, e = EX.e;
  const stoneNote = (typeof awardChibiStones === 'function')
    ? ` <b class="good">(${awardChibiStones({ stones: { kor_t1: ri(1, 3) } }).join(', ')})</b>`
    : '';
  if (m === 'birak') { EX.res = `${w.name} sisin içinde kayboldu.${stoneNote}`; return exWild(); }
  let p; if (m === 'yem') { p = foodOdds(w, f); S.food[f]--; } else p = catchOdds(e, w, m) + (perk('selin', 50) ? 10 : 0);
  if (m === 'guc') { e.fat = clamp(e.fat + 20, 0, 100); if (chance(35)) e.inj = Math.max(e.inj, ri(1, 2)); SFX.play('roar'); }
  if (chance(p)) {
    w.id = S.nid++; w.bond = m === 'sakin' ? 25 : m === 'yem' ? 20 : 8;
    if (m === 'yem' && f === w.fav) { w.favKnown = true; S.st.fav++; }
    S.dragons.push(w); snapAlbum('catch', 'Yaban ejderhası', `${w.name}, ${ek(REGIONS[EX.r].ad, 'loc')} yakalandı.`, w); S.st.acq++; S.st.catches++; EX.caught = true; addBond(e, 3); chron(`${w.name}, ${ek(REGIONS[EX.r].ad, 'loc')} yakalandı.`);
    EX.res = `<b class="good">${w.name} artık senin!</b> ${m === 'sakin' ? 'Sana güvenerek geldi.' : m === 'yem' ? 'Yemin peşinden heybene kadar geldi.' : 'Boyun eğdi ama sana kırgın.'}${m === 'guc' && e.inj ? ` ${e.name} hafif yaralandı.` : ''}${stoneNote}`;
    SFX.play('win');
  } else { EX.res = `<span class="bad">${w.name} kanatlarını açıp kaçtı.</span>${m === 'guc' && e.inj ? ` ${e.name} boğuşmada yaralandı.` : ''}${stoneNote}`; SFX.play('miss'); }
  exWild();
}

/* ================= SON ================= */
function endingModal(again) {
  BGM.mood(S.ending === 'taj' ? null : 'veda');
  UI.modalRedraw = () => endingModal(true);
  if (!again && S.ending === 'iflas') clearSave(); else if (!again) saveGame();
  const E = {
    taj: ['Kızıl Taç senin', 'Dedenin harabe ocağı yirmi haftada diyarın en ünlü ocağı oldu. Demirhan tribünde ayağa kalkıp seni alkışladı. O gece Kor\'un kuyruğu kuluçka ocağının taşlarına dolanmış uyudu.'],
    'tac-kayip': ['Taç bu yıl başkasının', 'Kızıl Taç\'a kadar geldin ama son adım tutmadı. Yine de meydanda senin ocağının adı konuşuluyor. Bahar yeniden gelecek.'],
    sezon: ['Sezon kapandı', S.un >= 45 ? 'Kızıl Taç davetiyen vardı ama arenaya çıkmadın. Ocak ayakta ve soyun büyüyor.' : 'Kızıl Taç davetiyesi için ünün yetmedi. Ocak ayakta; ejderhaların gelecek sezonu bekliyor.'],
    iflas: ['Ocak satıldı', 'Alacaklılar ocağın anahtarını aldı. Ejderhalar başka sahiplere dağıldı. Kor giderken dönüp sana uzun uzun baktı.'],
  }[S.ending] || ['Son', ''];
  const best = topD();
  const gens = Math.max(1, ...S.dragons.map(d => d.gen), ...S.dead.map(d => d.gen));
  const score = S.gold + S.un * 20 + S.dragons.reduce((a, d) => a + value(d), 0) + (S.ending === 'taj' ? 3000 : 0) + gens * 200;
  const canGo = S.ending !== 'iflas' && (S.dragons.some(d => !d.dead && !d.old) || S.eggs.length);
  const past = (S.seasons || []).map(x => `<span>${x.n}. sezon: ${x.champ ? 'Kızıl Taç' : x.star ? esc(x.star) : '—'}</span>`).join('');
  showModal(`<div class="endm ${S.ending}"><p class="kicker">${seasonNo()}. sezon · ${S.ending === 'iflas' ? 'son' : 'kapanış'}</p><h2 class="big">${E[0]}</h2><p class="vntext">${E[1]}</p>
    <div class="endstats"><span><b>${S.st.wins}</b>zafer</span><span><b>${S.un}</b>ün</span><span><b>${S.gold}</b>altın</span><span><b>${gens}</b>nesil</span><span><b>${S.st.hatch}</b>yumurta</span><span><b>${S.st.deaths}</b>kayıp</span></div>
    <div class="endgal">${pager('endgal', [...S.dragons, ...S.dead], PER(6, 3), d => d.diedW ? `<div class="gone">${dragonSVG({ ...d, dead: true }, { still: true })}<b>${esc(d.name)}</b><small>anısına</small></div>` : `<div>${dragonSVG(d, { still: true })}<b>${esc(d.name)}</b><small>${d.gen}. nesil · ${d.w}G</small></div>`)}</div>
    ${best ? `<p class="mute">Ocağın yıldızı: <b>${esc(best.name)}</b> (${best.w} zafer)</p>` : ''}<p>Miras puanı <b class="score">${score}</b></p>
    ${past ? `<p class="pastsea mute sm">${past}</p>` : ''}<div class="mbtns center">${(S.album || []).length ? '<button class="btn ghost big" data-a="endalbum">Albümü aç</button>' : ''}${canGo ? '<button class="btn primary big" data-a="season-open">Soyu sürdür: yeni sezon</button>' : ''}<button class="btn ${canGo ? 'ghost' : 'primary'} big" data-a="newgame">Baştan başla</button></div></div>`, 'endwrap');
  if (!again) SFX.play(S.ending === 'taj' ? 'win' : 'bell');
}

/* ================= EYLEMLER ================= */
function legacyModal() {
  UI.modalRedraw = legacyModal; UI.legacy = UI.legacy || [];
  const pickc = d => `<button class="lcard ${UI.legacy.includes(d.id) ? 'on' : ''}" data-a="legacy-pick" data-id="${d.id}">${dragonSVG(d, { still: true })}<b>${esc(d.name)} ${sexIc(d.sex)}</b><small>${elChip(d.el)} ${STAGE_AD[d.stage]} · ${d.w} zafer · ${d.gen}. nesil</small></button>`;
  showModal(`<div class="parch legm"><p class="kicker">Miras · ${(S.seasonNo || 1) + 1}. sezon</p><h2>Kimler yeni sezona gelsin?</h2>
    <p>En fazla iki ejderha seç. Ünün beşte biri, öğrendiğin Ejder Dili, ilişkilerin, albüm ve soy kayıtları da seninle gelir. Kor ve dedenin yumurtası yine seni bekler.</p>
    ${pager('legacy', S.dragons, PER(4, 2), pickc)}
    <div class="mbtns"><button class="btn ghost" data-a="mclose">Vazgeç</button><button class="btn primary" data-a="legacy-go">${UI.legacy.length ? `${UI.legacy.length} ejderhayla başla` : 'Ejderhasız başla'}</button></div></div>`, 'paper wide');
}
function legacyStart() {
  const keep = UI.legacy.map(id => byId(id)).filter(Boolean).map(d => JSON.parse(JSON.stringify(d)));
  const carry = { un: Math.floor(S.un / 5), lineage: S.lineage, album: S.album, lang: S.lang, rel: S.rel, partner: S.partner, seasonNo: (S.seasonNo || 1) + 1, relSeen: S.relSeen };
  const maxId = Math.max(S.nid || 1, ...Object.keys(S.lineage || {}).map(Number).filter(n => !isNaN(n))) + 1;
  newGame(maxId);
  Object.assign(S, { lineage: { ...(carry.lineage || {}), ...(S.lineage || {}) }, album: carry.album || [], lang: carry.lang, rel: carry.rel, partner: carry.partner, seasonNo: carry.seasonNo, relSeen: carry.relSeen });
  S.un += carry.un;
  if (keep.some(d => d.origin === 'Dedenden kaldı')) S.dragons = S.dragons.filter(d => d.origin !== 'Dedenden kaldı');
  for (const d of keep) {
    const nd = { ...d, id: S.nid++, task: null, fat: 0, inj: 0, mood: 3, talked: false, fed: false, wish: null, care: null, dirt: 0, equip: { bas: null, govde: null, pence: null, tilsim: null } };
    nd.pids = d.pids; S.dragons.push(nd); linReg(nd);
  }
  while (capacity() < S.dragons.length) { const i = S.grid.findIndex(t => t.open && !t.b); if (i < 0) break; S.grid[i].b = 'in'; }
  snapAlbum('legacy', `${S.seasonNo}. sezon`, keep.length ? `${keep.map(d => d.name).join(' ve ')} yeni sezona taşındı.` : 'Yeni bir sezon başladı.', keep[0] ? S.dragons.find(x => x.name === keep[0].name) : null);
  chron(`${S.seasonNo}. sezon başladı.${keep.length ? ` ${keep.map(d => d.name).join(' ve ')} seninle.` : ''} Mirastan +${carry.un} ün.`);
  UI.legacy = []; UI.view = 'ocak'; UI.sel = S.dragons[0].id; UI.tile = null; UI.drawer = null;
  $('#modal-root').innerHTML = ''; MQ.length = 0; modalOn = false; saveGame(); SFX.play('bell'); render();
}
const ACT = {
  newgame() { $('#modal-root').innerHTML = ''; MQ.length = 0; modalOn = false; newGame(); if (typeof xApplyToState === 'function') xApplyToState(); UI.view = 'ocak'; UI.sel = S.dragons[0].id; UI.tile = null; UI.drawer = null; saveGame(); SFX.play('bell'); render(); pushModal(introModal); },
  continue() { const s = loadGame(); if (!s) return; S = s; if (typeof xApplyToState === 'function') xApplyToState(); if (typeof careerRepair === 'function') careerRepair(); if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms(); UI.view = 'ocak'; UI.sel = S.dragons[0]?.id; SFX.play('click'); render(); if (S.over) pushModal(endingModal); },
  sound() { SFX.toggle(); render(); },
  help() { pushModal(helpModal); },
  chron() { pushModal(chronModal); },
  go(el) { const v = el.dataset.v; const changed = v !== UI.view; UI.view = v; UI.drawer = null; UI.tile = null; UI.stall = null; UI.vsay = null; UI.sellArm = null; SFX.play('tab'); if (modalOn) closeModal(); else render(); if (changed) flashPlace(v); },
  goals() { UI.goalsOpen = !UI.goalsOpen; render(); },
  tile(el) { const i = +el.dataset.i; UI.tile = UI.tile === i ? null : i; SFX.play('click'); render(); },
  btab(el) { UI.buildTab = +el.dataset.k; render(); },
  'close-drawer'() { UI.tile = null; UI.drawer = null; UI.stall = null; UI.sellArm = null; render(); },
  build(el) { const k = el.dataset.k, B = BUILD[k]; if (S.gold < B.fiyat) return; S.gold -= B.fiyat; S.grid[UI.tile].b = k; chron(`${B.ad} kuruldu.`); if (k === 'kulucka') { for (const e of S.eggs) if (!e.inK && kuluckaFree() > 0) e.inK = true; toast('Bekleyen yumurtalar kuluçkaya yerleştirildi.'); } UI.tile = null; SFX.play('build'); afterAction(); },
  clear() { const c = clearCost(); if (S.gold < c) return; S.gold -= c; S.grid[UI.tile].open = true; S.cleared++; UI.tile = null; SFX.play('build'); afterAction(); },
  demolish() { if (UI.arm !== 'demolish') { UI.arm = 'demolish'; SFX.play('click'); return render(); } UI.arm = null; const t = S.grid[UI.tile]; S.gold += Math.floor(BUILD[t.b].fiyat / 2); t.b = null; UI.tile = null; SFX.play('build'); afterAction(); },
  sel(el) { const id = +el.dataset.id; const dir = S.dragons.findIndex(d => d.id === id) > S.dragons.findIndex(d => d.id === UI.sel) ? 'r' : 'l'; UI.sel = id; UI.drawer = null; if (UI.view !== 'ahir') UI.view = 'ahir'; const sd = S.dragons.find(d => d.id === id); SFX.play(sd && sd.stage === 'yavru' && !sd.dead ? 'chirp' : 'click'); render(); const h = $('#hero'); if (h) h.classList.add('enter-' + dir); },
  drawer(el) { const k = el.dataset.k; UI.drawer = UI.drawer === k ? null : k; render(); },
  'drawer-train'() { UI.drawer = UI.drawer === 'train' ? null : 'train'; render(); },
  'drawer-walk'() { UI.drawer = UI.drawer === 'walk' ? null : 'walk'; render(); },
  'drawer-feed'() { UI.drawer = UI.drawer === 'feed' ? null : 'feed'; render(); },
  'drawer-gear'() { UI.drawer = UI.drawer === 'gear' ? null : 'gear'; render(); },
  'rename-start'() { UI.drawer = 'info'; render(); setTimeout(() => $('#rename')?.focus(), 30); },
  train(el) { const d = byId(UI.sel), k = el.dataset.k; if (d.task && d.task.t === 'train' && d.task.k === k) d.task = null; else { clearPartner(d); d.task = { t: 'train', k }; UI.drawer = null; } SFX.play('click'); afterAction(); },
  rest() { const d = byId(UI.sel); if (d.task && d.task.t === 'rest') d.task = null; else { clearPartner(d); d.task = { t: 'rest' }; poseFlash(d, 'P15', `${esc(d.name)} kıvrılıp uykuya daldı.`, 'bg-ahir'); } SFX.play('click'); afterAction(); },
  'auto-assign-idle'() {
    const G = typeof S !== 'undefined' && S ? S : (typeof window.G !== 'undefined' ? window.G : null);
    if (!G || !Array.isArray(G.dragons)) return;
    const idles = G.dragons.filter(d => needsOrder(d));
    if (!idles.length) {
      toast('<b>Seyisbaşı:</b> Tüm ejderhaların bu haftaki nöbeti zaten belli.');
      return;
    }
    const statList = typeof STATS !== 'undefined' && Array.isArray(STATS) ? STATS : ['gu', 'ce', 'da', 'ze'];
    let trainCnt = 0, restCnt = 0;
    for (const d of idles) {
      clearPartner(d);
      if (d.fat >= 55 || (d.hunger != null && d.hunger < 35)) {
        d.task = { t: 'rest' };
        restCnt++;
      } else {
        let bestSt = null, bestGain = -1, bestRoom = -1;
        for (const st of statList) {
          const c = typeof trainCalc === 'function' ? trainCalc(d, st) : { capped: false, gain: 1 };
          if (c && !c.capped) {
            const room = typeof capOf === 'function' && d.st ? (capOf(d, st) - (d.st[st] || 0)) : 0;
            if (c.gain > bestGain || (c.gain === bestGain && room > bestRoom)) {
              bestGain = c.gain;
              bestRoom = room;
              bestSt = st;
            }
          }
        }
        if (bestSt) {
          d.task = { t: 'train', k: bestSt };
          trainCnt++;
        } else {
          d.task = { t: 'rest' };
          restCnt++;
        }
      }
    }
    if (typeof sfx === 'function') sfx('ok');
    else if (typeof SFX !== 'undefined' && SFX.play) SFX.play('click');
    if (typeof save === 'function') save(G);
    toast(`<b>Seyisbaşı Nöbeti Dağıttı:</b> <b>${idles.length}</b> ejderha görevlendirildi (${trainCnt} talim, ${restCnt} dinlenme).`);
    afterAction();
  },
  style(el) { byId(UI.sel).style = el.dataset.s; afterAction(); },
  walkwith(el) { const d = byId(UI.sel), p = +el.dataset.id; if (d.task && d.task.t === 'walk' && d.task.p === p) { clearPartner(d); d.task = null; afterAction(); } else { UI.drawer = null; pairTask(d.id, p, 'walk'); } },
  talk() { const d = byId(UI.sel); if (d.talked) return; pushModal(() => talkModal(d)); },
  talkopt(el) {
    const { d, ti } = CUR_TALK; const r = applyTalk(d, ti, +el.dataset.i);
    vn({ speaker: d.name, kicker: 'Sohbet', art: `<div class="vdr ${r.kind}">${dragonSVG(d)}</div>`, text: r.react, after: `<div class="fxchips">${r.fx.map(([t, c]) => `<span class="${c}">${t}</span>`).join('')}</div>${r.marks.map(m => `<p class="markline">${m}</p>`).join('')}`, opts: `<button class="vopt primary" data-a="mclose">Tamam</button>`, bg: sceneOr('ahir', sceneAhir(d.el)) });
    if (r.kind === 'love') { SFX.play('heart'); FX.hearts(innerWidth * 0.3, innerHeight * 0.45); } else if (r.kind === 'hate') SFX.play('roar');
    checkGoals(); saveGame();
  },
  feed(el) { const d = byId(UI.sel); const r = feedDragon(d, el.dataset.f); UI.drawer = null; if (r && (el.dataset.f === d.fav || el.dataset.f === 'ziyafet')) poseFlash(d, 'P14', el.dataset.f === 'ziyafet' ? `${esc(d.name)} ziyafete daldı!` : `${esc(d.name)} en sevdiği yemeği yiyor!`, 'bg-ahir', 'HAM!'); if (r) { toast(`<b>${esc(d.name)}</b> ${r.join(' ')}`); SFX.play('heart'); const h = $('#hero')?.getBoundingClientRect(); if (h) FX.hearts(h.x + h.width / 2, h.y + h.height / 3); } afterAction(); },
  equip(el) { const d = byId(UI.sel), s = el.dataset.s, uid = +el.dataset.uid; const o = equippedBy(uid); if (o && o !== d) for (const k in o.equip) if (o.equip[k] === uid) o.equip[k] = null; d.equip[s] = uid; SFX.play('build'); afterAction(); },
  unequip(el) { byId(UI.sel).equip[el.dataset.s] = null; afterAction(); },
  walkpair(el) { pairTask(+el.dataset.x, +el.dataset.y, 'walk'); },
  breedpair(el) { pairTask(+el.dataset.x, +el.dataset.y, 'breed'); },
  odds(el) { const A = byId(el.dataset.x), B = byId(el.dataset.y); pushModal(() => oddsModal(A, B)); },
  'egg-in'(el) { const e = S.eggs.find(x => x.id === el.dataset.id); if (e && kuluckaFree() > 0) e.inK = true; afterAction(); },
  'egg-out'(el) { const e = S.eggs.find(x => x.id === el.dataset.id); if (e) e.inK = false; afterAction(); },
  tier(el) { UI.arenaTier = el.dataset.k; SFX.play('tab'); render(); },
  fsel(el) { UI.arenaSel = +el.dataset.id; render(); },
  fight(el) { const i = +el.dataset.i, tk = UI.arenaTier, o = S.arena[tk][i], d = byId(UI.arenaSel); if (!o || !d) return; const T = TIERS[tk];
    if (T.olum && UI.arm !== 'fight:' + i) { UI.arm = 'fight:' + i; SFX.play('error'); return render(); } UI.arm = null;
    const fctx = { tier: tk, idx: i, lethal: !!T.olum, risk: deathRisk(d, T.olum), title: `${T.ad} · ${o.trainer}` };
    const pe = chance(55) ? pickFightPre(d, o, tk) : null;
    if (pe) { pushModal(() => preFightModal(pe, d, o, fctx)); return; } pushModal(() => startFight(d, o, { tier: tk, idx: i, lethal: !!T.olum, risk: deathRisk(d, T.olum), title: `${T.ad} · ${o.trainer}` })); },
  fact(el) { fightAction(el.dataset.x); },
  htab(el) { UI.helpTab = el.dataset.k || 'tumu'; SFX.play('tab'); helpModal(); },
  'sound-modal'() { SFX.toggle(); render(); helpModal(); toast(SFX.on ? 'Efekt sesleri açık.' : 'Efekt sesleri sessizde.'); },
  mustoggle() { const on = BGM.toggle(); helpModal(); toast(on ? 'Müzik açık.' : 'Müzik kapalı. Efektler ve ortam sesi sürüyor.'); },
  fxtoggle() { setCalm(!REDUCED); helpModal(); toast(REDUCED ? 'Efektler sade: animasyonlar kısıldı.' : 'Efektler tam.'); },
  'save-slot'(el) {
    const slot = +el.dataset.slot;
    if (typeof switchSaveSlot !== 'function') return;
    if (S && typeof saveGame === 'function') saveGame();
    const loaded = switchSaveSlot(slot);
    if (loaded) {
      S = loaded;
      if (typeof careerRepair === 'function') careerRepair();
      if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms();
      UI.view = 'ocak'; UI.sel = S.dragons[0]?.id; UI.tile = null; UI.drawer = null;
      UI._lastGold = S.gold; UI._lastUn = S.un;
      SFX.play('bell'); render(); helpModal();
      toast(`${slot}. Kayıt Yuvası yüklendi.`);
    } else {
      newGame();
      UI.view = 'ocak'; UI.sel = S.dragons[0]?.id; UI.tile = null; UI.drawer = null;
      UI._lastGold = S.gold; UI._lastUn = S.un;
      saveGame(); SFX.play('bell'); render(); helpModal();
      toast(`${slot}. Yuva boştu — yeni ocak başlatıldı.`);
    }
  },
  'save-export'() {
    if (typeof exportSaveString !== 'function') return;
    if (S && typeof saveGame === 'function') saveGame();
    const code = exportSaveString();
    if (!code) { toast('Aktarılacak aktif kayıt bulunamadı.'); return; }
    const box = $('#save-io-box');
    if (box) { box.value = code; box.focus(); box.select(); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => toast('Kayıt mührü panoya kopyalandı.')).catch(() => toast('Kayıt mührü kutuya yazıldı, kopyalayabilirsin.'));
    } else {
      toast('Kayıt kodu kutuya yazıldı, kopyalayabilirsin.');
    }
    SFX.play('coin');
  },
  'save-import'() {
    if (typeof importSaveString !== 'function') return;
    const box = $('#save-io-box');
    const raw = (box?.value || '').trim();
    if (!raw) { toast('Önce metin kutusuna yedek kayıt kodunu yapıştırın.'); SFX.play('error'); return; }
    const loaded = importSaveString(raw);
    if (!loaded) { toast('Geçersiz veya bozuk kayıt kodu!'); SFX.play('error'); return; }
    if (typeof loaded === 'object' && loaded) S = loaded;
    if (typeof careerRepair === 'function') careerRepair();
    if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms();
    UI.view = 'ocak'; UI.sel = S.dragons[0]?.id; UI.tile = null; UI.drawer = null;
    UI._lastGold = S.gold; UI._lastUn = S.un;
    SFX.play('win'); render(); helpModal();
    toast('Yedek kayıt başarıyla içe aktarıldı!');
  },
  fskip() { if (FT && FT.pre) { FT.skip = true; FT.playId++; endPlayback(); } },
  otab(el) { SFX.play('tab'); if (CUR_ODDS) oddsModal(CUR_ODDS.A, CUR_ODDS.B, el.dataset.k); },
  fcard(el) { fightAction('card:' + el.dataset.k); },
  'fight-done'() { fightDone(); },
  tour() { const d = byId(UI.arenaSel); if (!d) return; pushModal(() => startTour(d)); },
  region(el) { UI.seferR = el.dataset.r || null; SFX.play('page'); render(); },
  'mob-view-toggle'() { UI.mobShowMap = !UI.mobShowMap; SFX.play('tab'); render(); },
  esc(el) { UI.seferEsc = +el.dataset.id; render(); },
  sefer(el) { const e = byId(UI.seferEsc); if (!e) return; UI.seferR = null; pushModal(() => (typeof startNodeSefer === "function" ? startNodeSefer : startSefer)(el.dataset.r, e)); },
  exopt(el) { const C = EX.cards[EX.i]; EX.res = C.o[+el.dataset.i].fx(EX.e, EX.r); SFX.play('page'); exCard(); },
  exnext() { EX.i++; EX.res = null; exCard(); },
  catch(el) { doCatch(el.dataset.m, el.dataset.f); },
  exend() { EX = null; afterAction(true); closeModal(); },
  mclose() { closeModal(); },
  'close-modal'() { closeModal(); },
  legacy() { UI.legacy = S.dragons.slice().sort((a, b) => b.w - a.w).slice(0, 2).map(d => d.id); pushModal(legacyModal); },
  'legacy-pick'(el) { const id = +el.dataset.id, L = UI.legacy; if (L.includes(id)) UI.legacy = L.filter(x => x !== id); else if (L.length < 2) L.push(id); else { L.shift(); L.push(id); } SFX.play('click'); legacyModal(); },
  'legacy-go'() { legacyStart(); },
  rank() { pushModal(rankModal); },
  endalbum() { UI.chronTab = 'album'; pushModal(chronModal); },
  chtab(el) { UI.chronTab = el.dataset.k; SFX.play('page'); chronModal(); },
  page(el) { const k = el.dataset.k; UI.pg[k] = (UI.pg[k] || 0) + +el.dataset.d; SFX.play('page'); if (el.closest('#modal-root') && UI.modalRedraw) UI.modalRedraw(); else render(); },
  preopt(el) {
    const P = CUR_PRE, x = P.ev.opts[+el.dataset.i], res = x.fx(P.c);
    P.buff = res.b; P.bet = res.bet || 0; P.buffText = `${P.ev.title}: ${res.r}`;
    vn({ speaker: P.ev.title, kicker: 'Dövüşten önce', art: fightPair(P.d, P.o), text: res.r, opts: `<button class="vopt primary" data-a="pre-go">Arenaya çık</button>`, bg: arenaBg(P.ctx.tier) });
    afterAction(true);
  },
  'pre-go'() { const P = CUR_PRE; CUR_PRE = null; startFight(P.d, P.o, { ...P.ctx, buff: P.buff, bet: P.bet, buffText: P.buffText }); },
  postopt(el) {
    const P = CUR_POST, x = P.ev.opts[+el.dataset.i]; if (x.req && x.req(P.c)) return;
    const r = x.fx(P.c); CUR_POST = null;
    vn({ speaker: P.ev.title, kicker: P.c.won ? 'Zaferin ardından' : 'Dövüşten sonra', art: $('.vnart')?.innerHTML || '', text: r, opts: `<button class="vopt primary" data-a="mclose">Devam</button>`, bg: arenaBg(UI.arenaTier) });
    afterAction(true);
  },
  evopt(el) {
    const ev = CUR_EV, o = ev.opts[+el.dataset.i];
    const prevHtml = $('#modal-root')?.innerHTML;
    const res = o.fx(ev.ctx || {});
    if (res === null) {
      saveGame();
      if ($('#hud')) $('#hud').innerHTML = hud();
      if ($('#modal-root')?.innerHTML === prevHtml) {
        afterAction(true);
        closeModal();
      }
      return;
    }
    const cask = $('#modal-root .comicm .cask');
    if (cask) {
      cask.innerHTML = `<p>${esc(String(res || '').replace(/<[^>]+>/g, ''))}</p><div class="vnopts"><button class="vopt primary" data-a="mclose">Devam</button></div>`;
      saveGame();
      if ($('#hud')) $('#hud').innerHTML = hud();
      SFX.play('page');
      return;
    }
    const npc = EV_NPC[ev.id];
    vn({ speaker: npc ? NPCS[npc].ad : ev.title, kicker: ev.title, art: $('.vnart')?.innerHTML || (ev.ctx && ev.ctx.d && typeof angleVdr === 'function' ? angleVdr(ev.ctx.d, ['front']) : npc ? npcSVG(npc, 'big') : typeof comicStar === 'function' && comicStar() ? angleVdr(comicStar(), ['front']) : ''), text: String(res || '').replace(/<[^>]+>/g, ''), opts: `<button class="vopt primary" data-a="mclose">Devam</button>`, bg: evBgFor(ev) });
    afterAction(true);
  },
  'hatch-go'() { hatchReveal(); },
  'hatch-ok'() { const v = ($('#hatch-name')?.value || '').trim(); if (v && CUR_HATCH.d) CUR_HATCH.d.name = v.slice(0, 16); afterAction(true); closeModal(); },
  grave() { const spot = S.grid.findIndex(t => t.open && !t.b); if (spot >= 0) S.grid[spot].b = 'mezar'; afterAction(true); closeModal(); },
  endweek() {
    if (modalOn) return;
    // ENG-12: bilet yok; yerel hafta hiç bekletilmez. Bağlıyken sunucu week.end arka planda kuyruğa girer.
    if (S.dragons.some(d => needsOrder(d)) && UI.arm !== 'endweek') { UI.arm = 'endweek'; SFX.play('error'); return render(); }
    UI.arm = null;
    if (typeof ECO_LINK !== 'undefined') return void ECO_LINK.endWeek(localEndWeek);
    localEndWeek();
  },
};
// Mevcut yerel hafta sonu (değişmedi); ENG-10 ile yalnız ayrı fonksiyona alındı.
function localEndWeek() {
  PRE = snapshot();
  window.__grew = []; const R = endWeek();
  if (typeof ECO_SYNC !== 'undefined') ECO_SYNC.afterLocalWeek(); // ENG-12: kayıtlı hesapta yerel iflas yok (borç sunucuda)
  saveGame(); SFX.play('bell'); if (window.__grew.length) setTimeout(() => SFX.play('grow'), 1300);
  UI.tile = null; UI.drawer = null; UI.stall = null;
  $('#app').classList.add('dusk'); setTimeout(() => $('#app').classList.remove('dusk'), 1400);
  pushModal(() => reportModal(R));
  for (const id of window.__grew) { const g = byId(id); if (g && !g.dead) pushModal(() => growModal(g)); }
  for (const q of R.queue) {
    if (q.type === 'hatch') pushModal(() => hatchModal(q.egg));
    if (q.type === 'event') pushModal(() => eventModal(q.ev));
  }
  storyFlush();
  if (S.over) pushModal(endingModal);
}
Object.assign(ACT, PAZAR_ACT, CARE_ACT, SOC_ACT, WARD_ACT, RACE_ACT, AUC_ACT, BOND_ACT, STAR_ACT, CAREER_ACT, ORDER_ACT, SEASON_ACT, FSUP_ACT, COMIC_ACT, typeof LINEAGE_ACT !== 'undefined' ? LINEAGE_ACT : {}, typeof PAGEANT_ACT !== 'undefined' ? PAGEANT_ACT : {}, typeof HUB_ACT !== 'undefined' ? HUB_ACT : {}, typeof NET_ACT !== 'undefined' ? NET_ACT : {}, typeof ENDGAME_ACT !== 'undefined' ? ENDGAME_ACT : {});


ACT['gate-go-arena'] = () => { closeModal(); UI.view = 'arena'; SFX.play('tab'); render(); };
ACT['gate-go-nuri'] = () => { closeModal(); UI.view = 'pazar'; UI.stall = 'yem'; UI.stallTab = 'al'; UI.vsay = null; SFX.play('tab'); render(); };
ACT['gate-go-ahir'] = () => { closeModal(); const b = S && S.dragons ? S.dragons.find(d => d.stage === 'yavru') : null; if (b) UI.sel = b.id; UI.view = 'ahir'; SFX.play('tab'); render(); };
ACT['gate-drink-baby'] = (el) => {
  const id = +el.dataset.id;
  const d = byId(id) || (S && S.dragons ? S.dragons.find(x => x.stage === 'yavru') : null);
  if (!d) { toast('Ocağında henüz bir Yavru Ejderha yok!'); return; }
  const res = feedDragon(d, 'genclik');
  if (res) {
    toast(`<b>${esc(d.name)}</b>: ${res.join(' ')}`);
    SFX.play('goal');
    closeModal();
    afterAction();
  }
};

function requireZindanGate(cb) {
  if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
    SFX.play('error');
    showZindanGateModal();
    return;
  }
  cb();
}

ACT['zindan-tab'] = (el) => { UI.zindanTab = el.dataset.k || 'tumu'; render(); };
ACT['zindan-mode-select'] = () => requireZindanGate(() => { UI.view = 'zindan'; render(); }); // mode_select ara kapısı kaldırıldı
ACT['zindan-main-mode'] = (el) => { UI.zindanMainMode = (el.dataset.m === 'pvp') ? 'pvp' : 'pve'; render(); };
ACT['zindan-card-diff'] = (el) => {
  if (!UI.zindanDiffMap) UI.zindanDiffMap = {};
  const d = el.dataset.diff;
  if (el.dataset.raid && (d === 'normal' || d === 'zor' || d === 'ekstrem')) UI.zindanDiffMap[el.dataset.raid] = d;
  render();
};
ACT['zindan-open-raid-room'] = (el) => requireZindanGate(() => {
  const raidId = el.dataset.raid || 'sahmeran';
  const diff = (UI.zindanDiffMap && UI.zindanDiffMap[raidId]) || 'zor';
  if (typeof SHM !== 'undefined') SHM.raidPartySlots = [null, null]; // yeni sefer odası: yoldaş yuvaları boş
  if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId, difficulty: diff, screen: 'lobby' });
});
ACT['chibi-open-baby'] = () => { if (typeof CHIBI_ACT !== 'undefined' && CHIBI_ACT['chibi-open']) CHIBI_ACT['chibi-open'](); };
ACT['zindan-pve-gate'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', screen: 'lobby' }); });
ACT['zindan-sahmeran-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'normal', screen: 'lobby' }); });
ACT['zindan-komutan-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'normal', screen: 'lobby' }); });
ACT['zindan-abra-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'normal', screen: 'lobby' }); });
ACT['zindan-battle-sah-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'normal', screen: 'battle' }); } });
ACT['zindan-battle-kom-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'normal', screen: 'battle' }); } });
ACT['zindan-battle-abra-easy'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'normal', screen: 'battle' }); } });
ACT['zindan-battle-sah-norm'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'zor', screen: 'battle' }); } });
ACT['zindan-battle-kom-norm'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'zor', screen: 'battle' }); } });
ACT['zindan-battle-abra-norm'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'zor', screen: 'battle' }); } });

ACT['minigame-open'] = () => requireZindanGate(() => { UI.view = 'zindan'; render(); });
ACT['zindan-open'] = () => { UI.view = 'zindan'; render(); if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) showZindanGateModal(); };
ACT['zindan-sahmeran'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'zor', screen: 'lobby' }); });
ACT['zindan-sahmeran-ex'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'ekstrem', screen: 'lobby' }); });
ACT['zindan-komutan'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'zor', screen: 'lobby' }); });
ACT['zindan-komutan-ex'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'ekstrem', screen: 'lobby' }); });
ACT['zindan-abra'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'zor', screen: 'lobby' }); });
ACT['zindan-abra-ex'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'ekstrem', screen: 'lobby' }); });
ACT['zindan-battle-sah'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'sahmeran', difficulty: 'ekstrem', screen: 'battle' }); } });
ACT['zindan-battle-kom'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'komutan', difficulty: 'ekstrem', screen: 'battle' }); } });
ACT['zindan-battle-abra'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') { SHM.selectedStage = 1; openAnimTestRoom({ entryContext: 'pve_dungeon', gameMode: 'raid', raidId: 'abra', difficulty: 'ekstrem', screen: 'battle' }); } });
ACT['zindan-pvp-lobby'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pvp_arena', gameMode: 'pvp', screen: 'pvp_lobby' }); });
ACT['zindan-pvp-start'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ entryContext: 'pvp_arena', gameMode: 'pvp', screen: 'battle' }); });
ACT['zindan-comic-sah'] = () => requireZindanGate(() => { if (typeof comicModal === 'function' && typeof COMIC !== 'undefined' && COMIC.sahmeran_prolog) { comicModal({ id: 'sahmeran_prolog', title: 'Sırça Saray Destanı', opts: [{ t: 'Sırça Saray Seferine Gir', fx: () => { openAnimTestRoom({ raidId: 'sahmeran', difficulty: 'zor', screen: 'battle' }); return null; } }] }); } });
ACT['zindan-comic-kom'] = () => requireZindanGate(() => { if (typeof comicModal === 'function' && typeof COMIC !== 'undefined' && COMIC.komutan_prolog) { comicModal({ id: 'komutan_prolog', title: 'Başkomutan Kalgarot', opts: [{ t: 'Volkanik Kaldera Seferine Gir', fx: () => { openAnimTestRoom({ raidId: 'komutan', difficulty: 'zor', screen: 'battle' }); return null; } }] }); } });
ACT['zindan-comic-abra'] = () => requireZindanGate(() => { if (typeof comicModal === 'function' && typeof COMIC !== 'undefined' && COMIC.abra_prolog) { comicModal({ id: 'abra_prolog', title: 'Zindan III: Batık Donanma & Derya Yılanı ABRA', opts: [{ t: 'Batık Donanma Seferine Gir', fx: () => { openAnimTestRoom({ raidId: 'abra', difficulty: 'normal', screen: 'lobby' }); return null; } }] }); } });
ACT['zindan-studio'] = () => requireZindanGate(() => { if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ screen: 'studio' }); });
ACT['title-zindan-go'] = () => {
  if (!S) { S = newState(); saveGame(); }
  UI.view = 'zindan';
  render();
  if (typeof openAnimTestRoom === 'function') openAnimTestRoom({ raidId: 'komutan', difficulty: 'ekstrem', screen: 'lobby' });
};

ACT.orders = () => { UI.view = 'pazar'; UI.stall = 'ejder'; UI.stallTab = 'sip'; UI.vsay = null; UI.sellArm = null; SFX.play('tab'); render(); };
ACT['drawer-career'] = () => { const C = career(); if (!C) return; UI.view = 'ahir'; UI.sel = C.id; UI.drawer = 'career'; UI.tile = null; SFX.play('tab'); render(); };
ACT['mob-ahir-tab'] = el => {
  const tab = el.dataset.tab || 'actions';
  UI.mobAhirTab = tab;
  SFX.play('tab');
  render();
};
function mobHubModal() {
  if (!S) return;
  const idle = S.dragons.filter(d => needsOrder(d)).length;
  const chFc = typeof calcChibiStats === 'function' ? calcChibiStats().totalFc : 0;
  const places = [
    ['ocak', 'Ocak', 'İnşa & Parseller', ''],
    ['ahir', 'Ahır', 'Talim & Bakım', idle ? `${idle} boşta` : ''],
    ['yuva', 'Yuva', 'Kuluçka & Çiftler', S.eggs.length ? `${S.eggs.length} yumurta` : ''],
    ['arena', 'Arena', 'Dövüş, Yarış & Saray', S.tour && !S.tour.done ? 'Turnuva!' : ''],
    ['sefer', 'Sefer', 'Harita & Keşif', !S.flags.sefer ? 'Kilitli' : ''],
    ['pazar', 'Pazar', 'Çarşı, Mezat & Han', ''],
    ['meydan', 'Meydan', 'Canlı Kervansaray', ''],
    ['kasaba', 'Kasaba', 'Diyar & Şehir', ''],
    ['zindan', 'Zindan', 'Şahmeran & Kalgarot', '']
  ];
  showModal(`<div class="mob-cmd-sheet">
    <header class="mob-cmd-head">
      <div><small>KOMUTA MERKEZİ · TÜM ÖZELLİKLER</small><h3>Hafta ${S.week}/${SEASON} · ${seasonOf().ad}</h3></div>
      <button class="icb" data-a="mclose" aria-label="Kapat">${ui('x')}</button>
    </header>
    <div class="mob-cmd-res">
      <span>${ui('gold')} <b>${S.gold}</b> <small>(−${upkeepNow()}/hf)</small></span>
      <span>${ui('un')} <b>${S.un}</b> <small>Ün</small></span>
      <span>${ui('heart')} <b>${S.dragons.length}/${capacity()}</b> <small>İn</small></span>
    </div>
    <div class="mob-cmd-sec">Hızlı Komutlar & Karakter Sistemleri</div>
    <div class="mob-cmd-grid2">
      <button class="mob-cmd-card" data-open-sandik aria-label="Ocak Sandığı'nı aç: sunucu envanteri">
        <span class="mc-ic" aria-hidden="true">🧰</span>
        <div><b>Ocak Sandığı</b><small>Sunucu envanterin · Bedesten'de sat</small></div>
      </button>
      <button class="mob-cmd-card" data-a="eco-status" aria-label="Sunucu kesesi: hafta ve borç">
        <span class="mc-ic" aria-hidden="true">⚖</span>
        <div><b>Sunucu Kesesi</b><small>${typeof ECO_LINK !== 'undefined' && ECO_LINK.linked ? esc(ECO_LINK.badge() || 'Sunucu kesesi') : 'Sunucu kesesi · bağlı değil'}</small></div>
      </button>
      <button class="mob-cmd-card hi" data-a="mob-hub-act" data-act="chibi-open">
        <span class="mc-ic">${ui('anvil')}</span>
        <div><b>Terbiyeci & Kor Örsü</b><small>Kuşanma, +Basma · Kudret ${chFc}</small></div>
      </button>
      <button class="mob-cmd-card" data-a="mob-hub-act" data-act="bag-open">
        <span class="mc-ic">${ui('gold')}</span>
        <div><b>Sırt Çantası & Kiler</b><small>Eşyalar, İksirler & Yemler</small></div>
      </button>
      <button class="mob-cmd-card" data-a="mob-hub-act" data-act="social-drawer-open">
        <span class="mc-ic">${ui('crown')}</span>
        <div><b>Sosyal & Lonca</b><small>Oyuncular, Parti & Dostlar</small></div>
      </button>
      <button class="mob-cmd-card ${idle ? 'hi' : ''}" data-a="mob-hub-act" data-act="auto-assign-idle">
        <span class="mc-ic">${ui('train')}</span>
        <div><b>Seyisbaşı Oto-Nöbet</b><small>${idle ? `${idle} boşta ejderhaya görev ata` : 'Tüm ejderhalar görevde'}</small></div>
      </button>
      <button class="mob-cmd-card" data-a="mob-hub-act" data-act="mp-card">
        <span class="mc-ic">${ui('un')}</span>
        <div><b>Ocak Fermanı & Sancak</b><small>Soy Kütüğü & Terbiyeci Kartı</small></div>
      </button>
      <button class="mob-cmd-card" data-a="mob-hub-act" data-act="codex-open">
        <span class="mc-ic">${ui('book')}</span>
        <div><b>Keşif Albümü & Kütük</b><small>Elementler, Genler & Koleksiyon</small></div>
      </button>
    </div>
    <div class="mob-cmd-sec">9 Mekân & Diyar Geçişi</div>
    <div class="mob-cmd-places">
      ${places.map(([k, n, sub, b]) => `
        <button class="mob-cmd-place ${UI.view === k ? 'on' : ''}" data-a="go" data-v="${k}" ${k === 'sefer' && !S.flags.sefer ? 'disabled' : ''}>
          <span class="mcp-ic">${placeIcon(k)}</span>
          <div class="mcp-txt"><b>${n}</b><small>${sub}</small></div>
          ${b ? `<em class="mcp-badge">${b}</em>` : ''}
        </button>
      `).join('')}
    </div>
    <div class="mob-cmd-sec">Sistem, Defter & Ayarlar</div>
    <div class="mob-cmd-foot">
      <button class="btn ghost sm" data-a="mob-hub-act" data-act="chron">${ui('book')} Ocak Defteri</button>
      <button class="btn ghost sm" data-a="mob-hub-act" data-act="sound">${ui(SFX.on ? 'sound' : 'mute')} Ses: ${SFX.on ? 'Açık' : 'Kapalı'}</button>
      <button class="btn ghost sm" data-a="mob-hub-act" data-act="help">${ui('q')} Kayıt & Ayarlar</button>
    </div>
  </div>`, 'mob-cmd-modal');
}
ACT['mob-hub-menu'] = () => { SFX.play('tab'); mobHubModal(); };
ACT['mob-hub-act'] = el => {
  const act = el.dataset.act;
  if (act === 'sound') { SFX.toggle(); mobHubModal(); render(); return; }
  closeModal();
  if (ACT[act]) ACT[act](el);
};
ACT_IC.role = '<path d="M24 5 L29.5 18 L43.5 19 L32.8 28.2 L36.2 42 L24 34.6 L11.8 42 L15.2 28.2 L4.5 19 L18.5 18 Z" fill="#f4c24a" stroke="#6a4a14" stroke-width="2.5" stroke-linejoin="round"/>';
function clearPartner(d) { if (d.task && d.task.p) { const P = byId(d.task.p); if (P && P.task && P.task.p === d.id) P.task = null; } }
function pairTask(x, y, kind) {
  const A = byId(x), B = byId(y);
  if (A.task && A.task.p === B.id && A.task.t === kind) { A.task = null; B.task = null; afterAction(); return; }
  clearPartner(A); clearPartner(B);
  A.task = { t: kind, p: B.id }; B.task = { t: kind, p: A.id };
  toast(kind === 'walk' ? `${esc(A.name)} ve ${esc(B.name)} bu hafta birlikte gezecek.` : `${esc(A.name)} ve ${esc(B.name)} bu hafta yuva kuracak.`);
  SFX.play('heart'); afterAction();
}

document.addEventListener('click', e => {
  if (modalOn && e.target && e.target.classList && e.target.classList.contains('scrim') && $('#modal-root [data-a="mclose"], #modal-root [data-a="close-modal"]')) {
    closeModal();
    return;
  }
  const el = e.target.closest('[data-a]');
  if (!el && !modalOn && (UI.drawer || UI.tile != null || UI.seferR) && !e.target.closest('.drawer, .regcard, #hud, #dock')) {
    UI.drawer = null; UI.tile = null; UI.seferR = null; render(); return;
  }
  if (!el || el.disabled || el.getAttribute('disabled') != null) return;
  const key = el.dataset.a === 'fight' ? 'fight:' + el.dataset.i : el.dataset.a;
  if (UI.arm && UI.arm !== key && !['sell', 'sellI'].includes(el.dataset.a)) { UI.arm = null; if (!ACT[el.dataset.a]) render(); }
  const f = ACT[el.dataset.a]; if (f) f(el, e);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'rename') { const d = byId(UI.sel); const v = t.value.trim(); if (d && v) { d.name = v.slice(0, 16); afterAction(); } }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (!t || !t.dataset || !t.dataset.vol) return;
  const pct = Math.max(0, Math.min(100, +t.value || 0));
  const v = pct / 100;
  const ch = t.dataset.vol;
  const lbl = $(`#val-${ch}`) || $(`#vol-lbl-${ch}`);
  if (lbl) lbl.textContent = `%${pct}`;
  if (ch === 'sfx' && typeof SFX !== 'undefined' && typeof SFX.setVol === 'function') SFX.setVol(v);
  else if (ch === 'bgm' && typeof BGM !== 'undefined' && typeof BGM.setVol === 'function') BGM.setVol(v);
  else if (ch === 'amb' && typeof BGM !== 'undefined' && typeof BGM.setAmbVol === 'function') BGM.setAmbVol(v);
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  // 1-9 Mekan Geçiş Kısayolları (Ana Ekranda)
  if (!modalOn && S && PLACE_NAMES[UI.view] && /^[1-9]$/.test(e.key)) {
    const v = ['ocak', 'ahir', 'yuva', 'arena', 'sefer', 'pazar', 'meydan', 'kasaba', 'zindan'][+e.key - 1];
    if (v === 'sefer' && !S.flags.sefer) return;
    ACT.go({ dataset: { v } }); return;
  }
  // Arena Dövüş Kısayolları (1-4 Temel Hamleler, Q-W-E Yetenek Kartları, Girdi Tamponlu)
  if (modalOn && FT && !FT.spectating && FT.F && !FT.F.over && $('#modal-root .fwrap')) {
    const k = e.key.toLowerCase();
    const baseMap = { '1': 'pence', '2': 'nefes', '3': 'kukre', '4': 'savun' };
    if (baseMap[k]) {
      e.preventDefault();
      fightAction(baseMap[k]);
      return;
    }
    const cardIdx = { q: 0, w: 1, e: 2 }[k];
    if (cardIdx != null && FT.F.p && Array.isArray(FT.F.p.cards)) {
      const ck = FT.F.p.cards[cardIdx];
      if (ck) {
        e.preventDefault();
        fightAction('card:' + ck);
        return;
      }
    }
    if (e.key === ' ' && FT.busy && FT.pre) {
      e.preventDefault();
      ACT.fskip();
      return;
    }
  }
  // VN / Sefer / Dövüş Sonu Diyalog Kısayolları (1-4 Seçenek, Space Tek Buton İlerletme)
  if (modalOn && !(FT && !FT.spectating && FT.F && !FT.F.over && $('#modal-root .fwrap'))) {
    if (/^[1-4]$/.test(e.key)) {
      const opts = $$('#modal-root .vopt:not([disabled])');
      const target = opts[+e.key - 1];
      if (target) { e.preventDefault(); target.click(); return; }
    }
    if (e.key === ' ') {
      const single = $('#modal-root [data-a="exnext"], #modal-root [data-a="pre-go"], #modal-root [data-a="fight-done"], #modal-root [data-a="exend"]');
      if (single && !single.disabled) { e.preventDefault(); single.click(); return; }
      const opts = $$('#modal-root .vopt:not([disabled])');
      if (opts.length === 1) { e.preventDefault(); opts[0].click(); return; }
    }
  }
  if (e.key === 'Escape' && !modalOn && UI.stall) { ACT['stall-back'](); return; }
  if (e.key === 'Escape') { if (modalOn && $('#modal-root [data-a="mclose"], #modal-root [data-a="close-modal"]')) closeModal(); else if (UI.drawer || UI.tile != null || UI.stall) ACT['close-drawer'](); }
  if (!modalOn && UI.view === 'ahir' && S && S.dragons.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const i = S.dragons.findIndex(d => d.id === UI.sel), n = S.dragons.length;
    const j = e.key === 'ArrowLeft' ? (i - 1 + n) % n : (i + 1) % n; ACT.sel({ dataset: { id: S.dragons[j].id } });
  }
});
// üstüne gelme sesi
let HOV = null;
document.addEventListener('mouseover', e => { const h = e.target.closest('[data-hover], .place, .actb, .poster, .tcard, .vopt, .stall, .gcard, .pgb'); if (h && h !== HOV) { HOV = h; if (!h.disabled) SFX.play('tick'); } else if (!h) HOV = null; });
// kaydırma (galeri)
let TX = null;
document.addEventListener('touchstart', e => { if (UI.view === 'ahir' && e.target.closest('.showroom')) TX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  if (TX == null) return; const dx = e.changedTouches[0].clientX - TX; TX = null;
  if (Math.abs(dx) > 50 && S && S.dragons.length > 1) { const i = S.dragons.findIndex(d => d.id === UI.sel), n = S.dragons.length; const j = dx > 0 ? (i - 1 + n) % n : (i + 1) % n; ACT.sel({ dataset: { id: S.dragons[j].id } }); }
});
// Mobil dokunmatik ekranlarda basılı tutunca mavi metin seçimi / sağ tık menüsü çıkmasını engelle
document.addEventListener('selectstart', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.cancelable) e.preventDefault();
});
document.addEventListener('contextmenu', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches || e.target?.closest?.('.racem, .cstage, .fight, .saraym, canvas')) {
    if (e.cancelable) e.preventDefault();
  }
});

/* ---------- açılış ---------- */
function boot(data) {
  if (typeof registerAllHeirlooms === "function") registerAllHeirlooms();
  shell();
  const cv = document.createElement('canvas'); cv.id = 'fxc'; document.body.appendChild(cv); FX.init(cv);
  if (data && data.S) { S = data.S; UI.view = data.view || 'ocak'; UI.sel = data.sel; }
  render();
}
window.claude?.hot?.snapshot?.(() => ({ S, view: UI.view, sel: UI.sel }));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
