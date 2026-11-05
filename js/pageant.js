'use strict';
/* ============ EJDER OCAĞI — SARAY ZARAFET VE SOY MERASİMİ (ETKİLEŞİMLİ PODYUM MİNİ OYUNU) ============ */

const SARAY_DECREES = [
  {
    k: 'gece_incisi', ad: 'Gece ve İnci Fermanı',
    d: 'Başhakem bu hafta Gölge veya Buz elementli, Kara/Ak pullu ya da İnci, Mor ve Gök rengi taşıyan ejderhaları onurlandırıyor.',
    bonus(d) {
      let b = 0;
      if (d.el === 'golge' || d.el === 'buz') b += 20;
      if (pigOf(d) !== 'N') b += 25;
      const p = pulOf(d), s = susOf(d);
      if (['inci', 'mor', 'gok'].some(c => p.k.includes(c) || s.k.includes(c))) b += 20;
      return b;
    },
  },
  {
    k: 'altin_saltanat', ad: 'Altın Saltanat Fermanı',
    d: 'Bu hafta Altın, Kızıl veya Zümrüt pullu, Parıltılı ya da Altın/Kızıl gözlü ejderhalar jüriyi büyülüyor.',
    bonus(d) {
      let b = 0;
      if (parOf(d)) b += 25;
      const ec = eyeColor(d);
      if (ec === 'altin' || ec === 'kizil' || d.eye === 'A') b += 20;
      const p = pulOf(d), s = susOf(d);
      if (['altin', 'kizil', 'zumrut'].some(c => p.k.includes(c) || s.k.includes(c))) b += 20;
      return b;
    },
  },
  {
    k: 'melez_ahengi', ad: 'Çift Kan ve Desen Fermanı',
    d: 'Saray bu hafta ikinci elementini uyandırmış, ara renk karışımlı ya da Çizgili-Benekli Kaplan desenli ejderhaları ödüllendiriyor.',
    bonus(d) {
      let b = 0;
      if (d.hybrid) b += 28;
      if (pulOf(d).mix || susOf(d).mix) b += 25;
      if ((d.pat || expPat(d.genes.pat)) === 'CB') b += 20;
      return b;
    },
  },
  {
    k: 'asil_hanedan', ad: 'Asil Hanedan ve Süs Fermanı',
    d: 'Kendi ocağında yetişmiş (2. kuşak ve üstü), Asil Kanlı veya en az 2 süs kuşanmış ejderhalar öne çıkıyor.',
    bonus(d) {
      let b = 0;
      if (d.gen >= 2) b += d.gen * 12;
      if (d.traits && d.traits.includes('asil')) b += 22;
      const cosCount = Object.keys(d.cos || {}).length;
      if (cosCount >= 2) b += cosCount * 8;
      return b;
    },
  },
];

const SARAY_JUDGES = [
  { k: 'sureyya', ad: 'Leydi Süreyya', role: 'Soy Hakemi', praise: ['Asil bir kan!', 'Kusursuz endam!', 'Gözlerimi alamıyorum!'] },
  { k: 'vasif', ad: 'Başhakem Vasıf', role: 'Nizam Ustası', praise: ['Tam yerinde adım!', 'Heybetli duruş!', 'Saray terbiyesi budur!'] },
  { k: 'cinar', ad: 'Ozan Çınar', role: 'Destan Şairi', praise: ['Şiir gibi süzüldü!', 'Pulları yıldız gibi!', 'Destanlara layık!'] },
  { k: 'mujgan', ad: 'Terzi Müjgan', role: 'Renk ve Süs', praise: ['Renk uyumu şahane!', 'Ne parlak pullar!', 'Işıltısı göz alıyor!'] },
];

function currentDecree() {
  const idx = ((S ? S.week : 1) - 1) % SARAY_DECREES.length;
  return SARAY_DECREES[idx];
}

function fullEleganceCalc(d) {
  if (!d) return { total: 0, gen: 0, careMult: 1, cos: 0, mind: 0, decree: 0, details: [] };
  const gInfo = eleganceGenScore(d);
  const gen = gInfo.total;
  const dirt = d.dirt || 0;
  const careMult = dirt === 0 ? 1.2 : dirt < 20 ? 1.05 : dirt < 45 ? 0.9 : 0.72;
  const cosCount = Object.keys(d.cos || {}).length;
  const cos = cosCount * 14 + (cosCount >= 4 ? 15 : 0);
  const mind = Math.round((d.st.ze * 0.55 + d.bond * 0.65) * careMult);
  const dec = currentDecree().bonus(d);
  const total = Math.round(gen + cos + mind + dec);
  return { total, gen, careMult, cos, mind, decree: dec, details: gInfo.items };
}

function genPageantRivals() {
  const rivals = [
    {
      owner: '@leydi_sureyya', trainer: 'Leydi Süreyya',
      d: (() => {
        const d = marketDragon(0.45);
        d.name = 'Şahmeran'; d.stage = 'yetiskin';
        d.genes.pig = ['a', 'a']; d.genes.par = ['P', 'p']; d.genes.pul = ['gul', 'altin']; d.genes.sus = ['inci', 'inci'];
        d.pat = 'CB'; d.genes.pat = ['C', 'B']; d.st.ze = 62 + S.week * 2; d.bond = 75; d.dirt = 0;
        d.cos = { bas: 'altintac', aura: 'yildiz', taban: 'kaide' };
        return d;
      })(),
      votes: 14 + ri(2, 9),
    },
    {
      owner: '@baron_vasif', trainer: 'Baron Vasıf',
      d: (() => {
        const d = marketDragon(0.38);
        d.name = 'Zümrüdüanka'; d.stage = 'yetiskin';
        d.genes.pul = ['zumrut', 'gok']; d.genes.sus = ['altin', 'altin']; d.genes.eyec = ['kizil', 'altin'];
        d.st.ze = 54 + S.week * 2; d.bond = 64; d.dirt = 0;
        d.cos = { boyun: 'nazar', kuyruk: 'halka', taban: 'run' };
        return d;
      })(),
      votes: 11 + ri(1, 7),
    },
    {
      owner: '@kuzey_ocagi', trainer: 'Kuzeyli Bora',
      d: (() => {
        const d = marketDragon(0.32);
        d.name = 'Karaca'; d.stage = 'genc';
        d.genes.pig = ['m', 'm']; d.genes.pul = ['mor', 'gok']; d.st.ze = 46 + S.week * 2; d.bond = 58; d.dirt = 5;
        d.cos = { aura: 'kar', bas: 'cicektac' };
        return d;
      })(),
      votes: 8 + ri(1, 5),
    },
  ];
  for (const r of rivals) r.score = fullEleganceCalc(r.d).total + ri(18, 42);
  return rivals.sort((a, b) => b.score - a.score);
}

function ensurePageant() {
  if (!S.pageant || S.pageant.w !== S.week) {
    S.pageant = {
      w: S.week,
      rivals: genPageantRivals(),
      entered: false,
      myRank: null,
      myScore: null,
      votedFor: null,
    };
  }
  return S.pageant;
}

function sarayBoard(f) {
  const P = ensurePageant();
  const dec = currentDecree();
  const myCalc = f ? fullEleganceCalc(f) : null;
  const canEnter = f && !P.entered && canAct(f);

  const myCard = `<div class="poster special" style="--rot:-1deg"><i class="nail"></i>
    <div class="ph">KRALİYET FERMANI · ${esc(dec.ad.toUpperCase())}</div>
    <b class="pname">${f ? esc(f.name) : 'Aday Seç'}</b>
    <small>${esc(dec.d)}</small>
    ${myCalc ? `
      <div class="pstats" style="margin:6px 0">
        <span>SOY<b>+${myCalc.gen}</b></span>
        <span>ZEKÂ<b>+${myCalc.mind}</b></span>
        <span>SÜS<b>+${myCalc.cos}</b></span>
        <span>FERMAN<b>+${myCalc.decree}</b></span>
      </div>
      <div class="traits" style="margin:4px 0">${myCalc.details.slice(0, 3).map(([lbl, pt]) => `<span class="trait sm"><b>${esc(lbl)}</b> <small>+${pt}</small></span>`).join('') || '<span class="mute sm">Ahırda süsleyip yıkayarak puanını artırabilirsin</span>'}</div>
    ` : '<p class="mute sm">Soldan merasime çıkacak ejderhanı seç.</p>'}
    <div class="pfoot">Birinciye ${goldTxt(240)} <span class="mute sm">+6 ün · Saray İncisi</span></div>
    <button class="btn primary sm wide" data-a="saray-start" ${canEnter ? '' : 'disabled'}>${P.entered ? 'Bu hafta podyuma çıktın' : !f ? 'Ejderha seç' : !canAct(f) ? 'Ejderha meşgul' : 'Podyum Gösterisine Çık'}</button>
    <button class="btn ghost sm wide" data-a="codex-open" style="margin-top:4px">Soy Kütüğü & İlk Keşifler</button>
  </div>`;

  const rivalCards = P.rivals.slice(0, 2).map((r, i) => `
    <div class="poster" style="--rot:${i === 0 ? 1.2 : -0.8}deg">
      <i class="nail"></i>
      <span class="stamp ${i === 0 ? 'hard' : 'even'}">${i + 1}. Aday</span>
      <div class="ph">${esc(r.owner)}</div>
      <div class="pdr">${dragonSVG(r.d, { still: true, flip: true })}</div>
      <b class="pname">${esc(r.d.name)}</b>
      <small>${esc(r.trainer)} · ${phenoTitle(r.d)}</small>
      <div class="pmeta">${elChip(r.d.el)} <span class="good">Zarafet ${r.score}</span></div>
      <div class="pfoot">
        <span><b>${r.votes}</b> Beğeni</span>
        <button class="btn ghost sm" data-a="saray-vote" data-i="${i}" ${P.votedFor != null ? 'disabled' : ''}>${P.votedFor === i ? 'Çiçek Verildi' : 'Çiçek At (+15 Altın)'}</button>
      </div>
    </div>
  `).join('');

  return myCard + rivalCards;
}

/* ============ TAM EKRAN ETKİLEŞİMLİ PODYUM & IŞIK MİNİ OYUNU ============ */
let PG = null;

const SARAY_THEMES = [
  { k: 'heybet', cue: 'Jüri "Heybet ve Kanat İhtişamı" görmek istiyor!', bestPose: 'P16', label: 'Göğe Şahlan' },
  { k: 'isilti', cue: 'Jüri "Pul Işıltısı ve Kıvrak Endam" bekliyor!', bestPose: 'P9', label: 'Pulları Dalgalandır' },
  { k: 'asalet', cue: 'Jüri "Kraliyet Selamı ve Asil Bakış" istiyor!', bestPose: 'P3', label: 'Kraliyet Selamı' },
];

function startSarayShow(d) {
  const base = fullEleganceCalc(d);
  const theme = pick(SARAY_THEMES);
  PG = {
    d,
    base,
    phase: 1, // 1: Podyum Yürüyüşü (3 ritim adımı), 2: Yıldız Küreleri & Poz, 3: Büyük Final Nefesi (Basılı tut & bırak), 4: Jüri Sonuç
    bonus: 0,
    hype: 25,
    pose: 'P1',
    walkStep: 0,
    walkHits: 0,
    t0: performance.now(),
    period: 1350,
    theme,
    orbs: Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 24 + i * 13 + ri(-3, 3),
      y: 26 + (i % 2 ? 18 : 4) + ri(-4, 4),
      caught: false,
    })),
    posePicked: false,
    hold: false,
    charge: 0,
    chargeDir: 1,
    finished: false,
    judgeSay: ['Podyum ışıkları yandı!', 'Adımlarını ışığa uydur!', 'Bakalım soyu nasıl parlayacak?', 'Kumaş ve pul uyumuna bakalım!'],
    raf: null,
    keyFn: null,
    upFn: null,
  };
  if (typeof codexCheck === 'function') codexCheck(d);
  renderSarayMinigame();
  bindSarayLoop();
}

function sarayDragonArt(d, pose) {
  if (d.stage === 'yetiskin' && typeof hasPose === 'function' && hasPose(d, pose)) {
    return poseSVG(d, pose, { face: 'r' });
  }
  return dragonSVG(d);
}

function renderSarayMinigame() {
  if (!PG) return;
  const { d, base, phase, bonus, hype, pose, walkStep, theme, orbs, judgeSay, finished } = PG;
  const P = ensurePageant();
  const bgUrl = asset('bg-saray') || asset('bg-arena') || '';
  const totalNow = base.total + bonus;
  const walkX = phase === 1 ? (24 + walkStep * 13) : 50;

  const judgesHtml = SARAY_JUDGES.map((j, idx) => `
    <div class="s-judge">
      <div class="s-jhead"><b>${j.ad}</b><small>${j.role}</small></div>
      <div class="s-jbub" id="sjb-${idx}">${esc(judgeSay[idx] || '')}</div>
    </div>
  `).join('');

  const orbsHtml = phase === 2 ? orbs.map(o => o.caught ? '' : `
    <button class="s-orb" data-a="saray-orb" data-i="${o.id}" style="left:${o.x}%;top:${o.y}%" title="Işıltıyı Yakala! (+6 Puan)">Işık</button>
  `).join('') : '';

  let controlsHtml = '';
  if (phase === 1) {
    controlsHtml = `
      <div class="s-ctrl">
        <p class="chint"><b>1. Sahne — Podyum Yürüyüşü (${walkStep + 1}/3):</b> Işık halkası altın merkeze geldiğinde <b>Adım At</b> düğmesine (veya Boşluk tuşuna) bas!</p>
        <div class="pbar s-pbar"><i class="zone wide"></i><i class="zone gold"></i><b id="smark"></b></div>
        <div class="pbtns">
          <button class="btn primary big" data-a="saray-walk-hit">Adım At & Kanat Aç! (Boşluk)</button>
        </div>
      </div>
    `;
  } else if (phase === 2) {
    const leftOrbs = orbs.filter(o => !o.caught).length;
    controlsHtml = `
      <div class="s-ctrl">
        <p class="chint"><b>2. Sahne — Işıltı ve Endam:</b> ${esc(theme.cue)} Ekrandaki <b>parlayan yıldızlara dokun</b> (${5 - leftOrbs}/5) ve jüriye uygun pozu seç!</p>
        <div class="pbtns">
          <button class="btn primary" data-a="saray-pose-pick" data-p="P16">Göğe Şahlan & Kanat Aç</button>
          <button class="btn primary" data-a="saray-pose-pick" data-p="P9">Pulları Işıkta Dalgalandır</button>
          <button class="btn primary" data-a="saray-pose-pick" data-p="P3">Kraliyet Selamı Ver</button>
        </div>
      </div>
    `;
  } else if (phase === 3) {
    controlsHtml = `
      <div class="s-ctrl">
        <p class="chint"><b>3. Sahne — Büyük Final Halesi:</b> Düğmeye (veya Boşluk tuşuna) <b>basılı tutarak</b> ihtişam barını altın taç bölgesine (<b>%72–%92</b>) doldur ve bırak!</p>
        <div class="pbar s-pbar charge"><i class="zone crown" style="left:72%;width:20%"></i><em id="scharge" style="width:0%"></em></div>
        <div class="pbtns">
          <button class="btn primary big" id="s-hold-btn" type="button">Basılı Tut & Taç Bölgesinde Bırak!</button>
        </div>
      </div>
    `;
  } else if (finished) {
    const all = [...P.rivals.map(r => ({ name: r.d.name, owner: r.owner, score: r.score, me: false })), { name: d.name, owner: S.handle || '@sen', score: P.myScore, me: true }].sort((a, b) => b.score - a.score);
    const boardRows = all.map((r, idx) => `<div class="saray-rankrow ${r.me ? 'me' : ''}"><span><b>${idx + 1}.</b> ${esc(r.name)} <small class="mute">(${esc(r.owner)})</small></span><b>${r.score} puan</b></div>`).join('');
    controlsHtml = `
      <div class="s-ctrl s-final-box">
        <h3>${PG.resultMsg}</h3>
        <p class="sm">${PG.rewardLine}</p>
        <div class="saray-ranks" style="max-width:620px;margin:8px auto">${boardRows}</div>
        <div class="pbtns"><button class="btn primary big" data-a="saray-finish">Saraydan Ayrıl</button></div>
      </div>
    `;
  }

  showModal(`<div class="carem saraym" id="saraym">
    <div class="cbg" style="background:url('${bgUrl}') center/cover no-repeat"></div>
    <div class="s-beam b1"></div><div class="s-beam b2"></div>
    <header class="chead s-head">
      <div><small>Saray Zarafet Merasimi · ${esc(currentDecree().ad)}</small><b>${esc(d.name)} · Zarafet Puanı: <span id="s-score">${totalNow}</span></b></div>
      <div class="cstat">
        <span>Alkış: <b id="s-hype">%${Math.min(100, hype)}</b></span>
        <span>Taban: <b>${base.total}</b> + Gösteri: <b class="good" id="s-bonus">+${bonus}</b></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${!finished ? `<button class="btn sm ghost" data-a="saray-auto">Otomatik Gösteri</button>` : ''}
        <button class="icb" data-a="saray-finish" aria-label="Kapat">${ui('x')}</button>
      </div>
    </header>
    <div class="s-judges">${judgesHtml}</div>
    <div class="cstage s-stage" id="sstage">
      <div class="s-runway"></div>
      <div class="s-rivals">
        ${P.rivals.slice(0, 2).map((r, idx) => `<div class="s-riv r${idx}">${dragonSVG(r.d, { still: true, flip: idx === 1 })}<span>${esc(r.d.name)} (${r.score})</span></div>`).join('')}
      </div>
      <div class="cdr s-hero" id="sdr" style="left:${walkX}%">${sarayDragonArt(d, pose)}</div>
      ${orbsHtml}
    </div>
    <footer class="cfoot s-foot">${controlsHtml}</footer>
  </div>`, 'carewrap');

  bindSarayEvents();
}

function sarayPos() {
  if (!PG) return 0.5;
  const ph = ((performance.now() - PG.t0) % PG.period) / PG.period;
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
}

function bindSarayLoop() {
  if (!PG) return;
  if (PG.raf) cancelAnimationFrame(PG.raf);
  let last = performance.now();
  const tick = now => {
    if (!PG || PG.finished) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (PG.phase === 1) {
      const mk = $('#smark');
      if (mk) mk.style.left = (sarayPos() * 100) + '%';
    } else if (PG.phase === 3 && PG.hold) {
      PG.charge += PG.chargeDir * dt * 88;
      if (PG.charge >= 100) { PG.charge = 100; PG.chargeDir = -1; }
      if (PG.charge <= 0) { PG.charge = 0; PG.chargeDir = 1; }
      const bar = $('#scharge');
      if (bar) bar.style.width = Math.round(PG.charge) + '%';
    }
    PG.raf = requestAnimationFrame(tick);
  };
  PG.raf = requestAnimationFrame(tick);
}

function bindSarayEvents() {
  if (!PG) return;
  if (PG.keyFn) window.removeEventListener('keydown', PG.keyFn);
  if (PG.upFn) window.removeEventListener('keyup', PG.upFn);

  const holdBtn = $('#s-hold-btn');
  if (holdBtn && PG.phase === 3) {
    const releaseHold = () => {
      window.removeEventListener('pointerup', releaseHold);
      window.removeEventListener('pointercancel', releaseHold);
      if (PG && PG.phase === 3 && PG.hold) {
        PG.hold = false;
        resolveSarayPhase3();
      }
    };
    holdBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      PG.hold = true;
      SFX.play('wing');
      window.addEventListener('pointerup', releaseHold);
      window.addEventListener('pointercancel', releaseHold);
    });
  }

  PG.keyFn = e => {
    if (!PG || PG.finished) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (PG.phase === 1 && !e.repeat) sarayWalkHit();
      else if (PG.phase === 3) PG.hold = true;
    }
  };
  PG.upFn = e => {
    if (!PG || PG.finished) return;
    if (e.code === 'Space' && PG.phase === 3 && PG.hold) {
      e.preventDefault();
      PG.hold = false;
      resolveSarayPhase3();
    }
  };
  window.addEventListener('keydown', PG.keyFn);
  window.addEventListener('keyup', PG.upFn);
}

function cleanupSarayListeners() {
  if (!PG) return;
  if (PG.raf) cancelAnimationFrame(PG.raf);
  if (PG.keyFn) window.removeEventListener('keydown', PG.keyFn);
  if (PG.upFn) window.removeEventListener('keyup', PG.upFn);
}

function popStageBanner(txt, cls = 'good') {
  const st = $('#sstage');
  if (!st) return;
  const b = document.createElement('div');
  b.className = 's-pop ' + cls;
  b.innerHTML = txt;
  st.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}

function sarayWalkHit() {
  if (!PG || PG.phase !== 1) return;
  const x = sarayPos();
  const dist = Math.abs(x - 0.5);
  let pts = 5, lbl = 'İYİ ADIM (+5)', cls = '';
  if (dist <= 0.11) {
    pts = 14; lbl = 'KUSURSUZ ADIM! (+14)'; cls = 'good';
    SFX.play('cheer');
  } else if (dist <= 0.24) {
    pts = 9; lbl = 'ZARİF ADIM! (+9)'; cls = 'good';
    SFX.play('bell');
  } else {
    SFX.play('click');
  }
  PG.bonus += pts;
  PG.hype = Math.min(100, PG.hype + (dist <= 0.11 ? 20 : 10));
  PG.walkStep++;
  PG.pose = ['P16', 'P2', 'P6'][PG.walkStep - 1] || 'P16';
  PG.period = Math.max(850, PG.period - 180);
  PG.judgeSay = SARAY_JUDGES.map(j => pick(j.praise));

  const dr = $('#sdr')?.getBoundingClientRect();
  if (dr) FX.burst(dr.x + dr.width / 2, dr.y + dr.height / 2, '#ffd25e', dist <= 0.11 ? 36 : 18);

  if (PG.walkStep >= 3) {
    PG.phase = 2;
  }
  renderSarayMinigame();
  popStageBanner(lbl, cls);
}

function sarayOrbHit(id) {
  if (!PG || PG.phase !== 2) return;
  const orb = PG.orbs.find(o => o.id === id);
  if (!orb || orb.caught) return;
  orb.caught = true;
  PG.bonus += 6;
  PG.hype = Math.min(100, PG.hype + 8);
  SFX.play('heart');
  const dr = $('#sdr')?.getBoundingClientRect();
  if (dr) FX.hearts(dr.x + dr.width / 2, dr.y + dr.height * 0.35);
  renderSarayMinigame();
}

function sarayPosePick(poseKey) {
  if (!PG || PG.phase !== 2) return;
  PG.pose = poseKey;
  const match = poseKey === PG.theme.bestPose;
  const pts = match ? 18 : 10;
  PG.bonus += pts;
  PG.hype = Math.min(100, PG.hype + (match ? 22 : 12));
  PG.judgeSay = SARAY_JUDGES.map((j, i) => match && i === 0 ? 'Tam istediğimiz duruş! +18!' : pick(j.praise));
  SFX.play(match ? 'win' : 'bell');
  PG.phase = 3;
  renderSarayMinigame();
  popStageBanner(match ? 'JÜRİ BÜYÜLENDİ! (+18)' : 'GÜZEL DURUŞ (+10)', 'good');
}

function resolveSarayPhase3() {
  if (!PG || PG.phase !== 3) return;
  const c = PG.charge;
  const inZone = c >= 70 && c <= 94;
  const pts = inZone ? 22 : c >= 45 ? 12 : 6;
  PG.bonus += pts;
  PG.hype = Math.min(100, PG.hype + (inZone ? 25 : 10));
  PG.pose = 'P12';
  const dr = $('#sdr')?.getBoundingClientRect();
  if (dr) {
    FX.burst(dr.x + dr.width / 2, dr.y + dr.height * 0.3, PG.d.el, 55, 1.4);
    FX.hearts(dr.x + dr.width / 2, dr.y + dr.height * 0.25);
  }
  SFX.play(inZone ? 'win' : 'roar');
  finishSarayShow();
}

function finishSarayShow() {
  if (!PG || PG.finished) return;
  PG.finished = true;
  PG.phase = 4;
  cleanupSarayListeners();

  const d = PG.d;
  const finalScore = PG.base.total + PG.bonus;
  const P = ensurePageant();
  P.entered = true;
  P.myScore = finalScore;
  d.task = { t: 'done', what: 'Saray Zarafet Merasimi\'ne çıktı' };
  d.fat = clamp(d.fat + 14, 0, 100);

  const all = [...P.rivals.map(r => ({ name: r.d.name, owner: r.owner, score: r.score, me: false })), { name: d.name, owner: S.handle || '@sen', score: finalScore, me: true }].sort((a, b) => b.score - a.score);
  const rank = all.findIndex(x => x.me) + 1;
  P.myRank = rank;

  const divanMult = (typeof ensureDivan === 'function' && ensureDivan().active === 'soy_bereketi') ? 2 : 1;
  let goldWon = 40 * divanMult, unWon = 1, msg = '';
  if (rank === 1) {
    goldWon = 240 * divanMult; unWon = 6;
    d.pageantW = (d.pageantW || 0) + 1;
    titleCheck(d);
    snapAlbum('saray', 'Saray Merasimi Şampiyonu', `${d.name} Saray Zarafet Merasimi'nde 1. seçilerek "Saray İncisi" oldu!`, d);
    msg = `<span class="good">1. OLDUN — SARAY İNCİSİ!</span> Jüri ayağa kalkıp ${esc(d.name)} için altın yapraklar serpti!`;
    SFX.play('win');
    setTimeout(() => FX.coins(innerWidth / 2, innerHeight / 2), 300);
  } else if (rank === 2) {
    goldWon = 140 * divanMult; unWon = 3;
    msg = `<span class="good">2. Oldun (Gümüş Broş)!</span> ${esc(d.name)} zarafetiyle sarayda hayranlık uyandırdı.`;
    SFX.play('cheer');
  } else if (rank === 3) {
    goldWon = 80 * divanMult; unWon = 2;
    msg = `3. Oldun (Bronz Kurdele)! Podyumda başarılı bir gösteri sundun.`;
    SFX.play('bell');
  } else {
    msg = `4. sırada tamamladın. Katılım ödülü kazandın.`;
    SFX.play('page');
  }

  const royalty = d.gen >= 2 ? d.gen * 18 : 0;
  S.gold += goldWon + royalty;
  S.un += unWon;
  addBond(d, 4);
  addMood(d, 1);
  PG.resultMsg = msg;
  PG.rewardLine = `Toplam Puan: <b>${finalScore}</b> (Taban ${PG.base.total} + Gösteri +${PG.bonus}) · Ödül: <b>+${goldWon} altın</b>, <b>+${unWon} ün</b>${royalty ? ` · <span class="good">+${royalty} altın Soy Telifi (${d.gen}. kuşak)</span>` : ''}`;
  PG.judgeSay = ['10 / 10!', 'Muazzam!', 'Unutulmaz bir an!', 'Saray İncisi!'];
  chron(`${d.name} Saray Zarafet Merasimi'nde ${finalScore} puanla ${rank}. oldu (+${goldWon + royalty} altın, +${unWon} ün).`);
  saveGame();
  renderSarayMinigame();
}

const PAGEANT_ACT = {
  'saray-start'() {
    const f = byId(UI.arenaSel);
    if (!f || !canAct(f)) return;
    SFX.play('horn');
    pushModal(() => startSarayShow(f));
  },
  'saray-walk-hit'() {
    sarayWalkHit();
  },
  'saray-orb'(el) {
    sarayOrbHit(+el.dataset.i);
  },
  'saray-pose-pick'(el) {
    sarayPosePick(el.dataset.p);
  },
  'saray-auto'() {
    if (!PG || PG.finished) return;
    PG.bonus = 48 + ri(6, 16);
    PG.hype = 95;
    finishSarayShow();
  },
  'saray-finish'() {
    cleanupSarayListeners();
    PG = null;
    afterAction(true);
    closeModal();
  },
  'saray-vote'(el) {
    const P = ensurePageant();
    if (P.votedFor != null) return;
    const i = +el.dataset.i;
    if (!P.rivals[i]) return;
    P.votedFor = i;
    P.rivals[i].votes++;
    S.gold += 15;
    SFX.play('coin');
    SFX.play('heart');
    toast(`<b>${esc(P.rivals[i].d.name)}</b> adlı adaya çiçek attın! Zarafet teşviki olarak <b>+15 altın</b> kazandın.`);
    saveGame();
    render();
  },
};
