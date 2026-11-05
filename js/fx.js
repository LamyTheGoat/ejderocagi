'use strict';
/* ============ EJDER OCAĞI — PARÇACIK, SES, EKRAN EFEKTLERİ ============ */

/* Efekt ayarı oyunun içinden seçilir (Yardım penceresi). Sistemin 'hareketi azalt' ayarı birçok masaüstünde
   varsayılan açık geldiği için ona bakılmaz; aksi hâlde dövüş efektleri hiç görünmüyordu. */
let REDUCED = (() => { try { return localStorage.getItem('ejder-fx') === 'sade'; } catch (e) { return false; } })();
function setCalm(on) { REDUCED = on; try { localStorage.setItem('ejder-fx', on ? 'sade' : 'tam'); } catch (e) { } document.body && document.body.classList.toggle('calm', on); }
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => document.body.classList.toggle('calm', REDUCED));

/* ---------- Parçacıklar (tek tuval, sahneye göre mod, nesne havuzlu) ---------- */
const FX = (() => {
  let cv = null, ctx = null, W = 0, H = 0, dpr = 1, parts = [], pool = [], mode = null, raf = null, last = 0, acc = 0;
  const MAX_POOL = 600;
  const R = (a, b) => a + Math.random() * (b - a);
  const P = a => a[Math.floor(Math.random() * a.length)];
  function allocPart(src) {
    const p = pool.length ? pool.pop() : {};
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
    p.r = 1; p.rEnd = 0; p.life = 1; p.max = 1; p.t = 0;
    p.c = '255,255,255'; p.glow = 0; p.wob = null; p.fade = 0;
    p.a = 1; p.line = 0; p.burst = 0; p.grav = 0; p.drag = 0;
    p.ring = 0; p.lw = 2; p.txt = null; p.col = null; p.sz = 18;
    if (src) {
      Object.assign(p, src);
      if (src.max == null) p.max = p.life;
    }
    return p;
  }
  function freePart(p) {
    p.txt = null;
    if (pool.length < MAX_POOL) pool.push(p);
  }
  const MODES = {
    embers: { rate: 22, make: () => ({ x: R(0, W), y: H + 8, vx: R(-12, 12), vy: R(-55, -20), r: R(0.8, 2.4), life: R(4, 9), c: P(['255,170,90', '255,120,60', '255,214,150']), glow: 1, wob: R(0, 6) }) },
    torch: { rate: 12, make: () => ({ x: P([0.294, 0.706]) * W + R(-8, 8), y: H * 0.47, vx: R(-8, 8), vy: R(-50, -25), r: R(0.8, 2), life: R(1.5, 3), c: P(['255,180,90', '255,130,60']), glow: 1, wob: R(0, 6) }) },
    lanterns: { rate: 6, make: () => ({ x: R(0, W), y: R(H * 0.1, H * 0.7), vx: R(-5, 5), vy: R(-6, 6), r: R(1, 2.2), life: R(3, 6), c: P(['255,200,120', '255,150,90', '255,230,170']), glow: 1, wob: R(0, 6), fade: 1 }) },
    fireflies: { rate: 8, make: () => ({ x: R(0, W), y: R(H * 0.35, H * 0.95), vx: R(-10, 10), vy: R(-10, 10), r: R(1.2, 2.4), life: R(3, 7), c: P(['220,255,140', '255,240,150']), glow: 1, wob: R(0, 6), fade: 1 }) },
    snow: { rate: 40, make: () => ({ x: R(-50, W), y: -8, vx: R(5, 25), vy: R(20, 55), r: R(0.8, 2.6), life: 30, c: '235,245,255', glow: 0, wob: R(0, 6) }) },
    ash: { rate: 30, make: () => ({ x: R(0, W), y: -8, vx: R(-10, 10), vy: R(15, 40), r: R(0.8, 2.2), life: 30, c: P(['120,110,100', '255,140,70']), glow: 0, wob: R(0, 6) }) },
    rain: { rate: 110, make: () => ({ x: R(-50, W + 50), y: -10, vx: -60, vy: R(520, 700), r: 1, life: 3, c: '170,190,230', line: 1 }) },
    spores: { rate: 10, make: () => ({ x: R(0, W), y: R(H * 0.4, H), vx: R(-6, 6), vy: R(-14, -4), r: R(1, 2.4), life: R(4, 8), c: P(['196,108,255', '150,120,220']), glow: 1, wob: R(0, 6), fade: 1 }) },
    dust: { rate: 10, make: () => ({ x: R(0, W), y: R(H * 0.6, H), vx: R(10, 30), vy: R(-6, 2), r: R(1, 3), life: R(3, 6), c: '230,200,150', glow: 0, wob: R(0, 6), fade: 1, a: 0.35 }) },
    stars: { rate: 3, make: () => ({ x: R(0, W), y: R(0, H * 0.45), vx: 0, vy: 0, r: R(0.6, 1.6), life: R(2, 4), c: '255,250,230', glow: 1, fade: 1 }) },
  };
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function init(el) {
    cv = el; ctx = cv.getContext('2d'); resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    start();
  }
  function start() { if (!raf && cv) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!parts[i].burst) {
        freePart(parts[i]);
        parts[i] = parts[parts.length - 1];
        parts.pop();
      }
    }
    acc = 0;
  }
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (cv.clientWidth !== W || cv.clientHeight !== H) resize();
    ctx.clearRect(0, 0, W, H);
    const M = MODES[mode];
    if (M && !REDUCED) {
      acc += M.rate * dt * Math.min(1.6, W / 1200 + 0.4);
      while (acc > 1) { acc--; parts.push(allocPart(M.make())); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.max || p.y < -30 || p.y > H + 40) {
        freePart(p);
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      if (p.t < 0) continue;
      if (p.wob != null) p.vx += Math.sin((p.t + p.wob) * 2) * 6 * dt;
      if (p.grav) p.vy += p.grav * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.t / p.max;
      let a = (p.a ?? 1) * (p.fade ? Math.sin(Math.PI * k) : 1 - k);
      if (p.txt) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const scale = k < 0.15 ? 0.7 + (k / 0.15) * 0.45 : k < 0.3 ? 1.15 - ((k - 0.15) / 0.15) * 0.15 : 1;
        const alpha = k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3);
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        if (scale !== 1) ctx.scale(scale, scale);
        ctx.font = `700 ${p.sz || 18}px "Cinzel", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(18, 12, 8, 0.92)';
        ctx.strokeText(p.txt, 0, 0);
        ctx.fillStyle = p.col || '#ffe39f';
        ctx.fillText(p.txt, 0, 0);
        ctx.restore();
        continue;
      }
      if (p.ring) {
        const ease = 1 - Math.pow(1 - k, 3);
        const rad = p.r + (p.rEnd - p.r) * ease;
        ctx.strokeStyle = `rgba(${p.c},${a * 0.85})`;
        ctx.lineWidth = Math.max(0.5, (p.lw || 3) * (1 - k * 0.65));
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.283); ctx.stroke();
        continue;
      }
      if (p.line) {
        ctx.strokeStyle = `rgba(${p.c},${0.35 * a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.03, p.y + p.vy * 0.03); ctx.stroke(); continue;
      }
      if (p.glow) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${p.c},${a})`); g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      } else { ctx.fillStyle = `rgba(${p.c},${a * 0.85})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(loop);
  }
  const EL_RGB = { ates: ['255,190,90', '255,110,50', '255,230,160'], buz: ['200,240,255', '120,200,240', '255,255,255'], firtina: ['250,240,140', '190,160,255', '255,255,220'], toprak: ['200,170,90', '130,160,70', '230,210,150'], golge: ['196,108,255', '120,70,200', '230,180,255'] };
  // nefes: from (x,y) to (x2,y2) ekran koordinatı
  function breath(x, y, x2, y2, el) {
    if (REDUCED || !cv) return;
    const cs = EL_RGB[el] || EL_RGB.ates;
    for (let i = 0; i < 70; i++) {
      const d = R(0.35, 0.6), sp = R(0.9, 1.15);
      parts.push(allocPart({ burst: 1, x: x + R(-6, 6), y: y + R(-6, 6), vx: (x2 - x) / d * sp + R(-40, 40), vy: (y2 - y) / d * sp + R(-60, 60), r: R(2, el === 'golge' ? 6 : 4.5), life: d, max: d, t: -i * 0.004, c: P(cs), glow: 1, drag: 0.4 }));
    }
  }
  function burst(x, y, el, n = 26, power = 1) {
    if (REDUCED || !cv) return;
    const cs = EL_RGB[el] || ['255,230,200', '255,200,140', '255,255,255'];
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.283), s = R(60, 260) * power;
      parts.push(allocPart({ burst: 1, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, r: R(1, 3), life: R(0.3, 0.8), max: 0.8, t: 0, c: P(cs), glow: 1, grav: 380, drag: 1.5 }));
    }
  }
  function shockwave(x, y, el) {
    if (REDUCED || !cv) return;
    const cs = EL_RGB[el] || EL_RGB.ates;
    parts.push(allocPart({ burst: 1, ring: 1, x, y, r: 6, rEnd: 96, lw: 3.5, life: 0.44, max: 0.44, t: 0, c: cs[0] }));
    parts.push(allocPart({ burst: 1, ring: 1, x, y, r: 4, rEnd: 62, lw: 2, life: 0.34, max: 0.34, t: 0, c: cs[2] || cs[1] || cs[0] }));
  }
  function floatText(x, y, text, color) {
    if (!cv || text == null) return;
    const col = (EL_RGB[color] ? `rgb(${EL_RGB[color][0]})` : color) || '#ffe39f';
    const str = String(text);
    parts.push(allocPart({ burst: 1, x: x + R(-8, 8), y: y - 6, vx: R(-12, 12), vy: -68, life: 1.05, max: 1.05, t: 0, drag: 1.8, txt: str, col, sz: str.length > 10 ? 15 : 18 }));
  }
  function hearts(x, y) {
    if (REDUCED || !cv) return;
    for (let i = 0; i < 14; i++) parts.push(allocPart({ burst: 1, x: x + R(-30, 30), y: y + R(-10, 10), vx: R(-20, 20), vy: R(-90, -40), r: R(2, 4), life: R(1, 1.8), max: 1.8, t: 0, c: '232,108,143', glow: 1, fade: 1 }));
  }
  function coins(x, y) {
    if (REDUCED || !cv) return;
    for (let i = 0; i < 18; i++) parts.push(allocPart({ burst: 1, x, y, vx: R(-120, 120), vy: R(-260, -120), r: R(2, 3.5), life: 1.2, max: 1.2, t: 0, c: '230,190,90', glow: 1, grav: 600 }));
  }
  return { init, setMode, breath, burst, shockwave, floatText, hearts, coins, resize };
})();

/* ---------- Ses: WebAudio ile üretilen kısa efektler ve SFX veri yolu ---------- */
const SFX = (() => {
  const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(+v) ? +v : 0));
  const curve = v => v <= 0 ? 0 : Math.pow(v, 1.6);
  let ac = null, master = null, on = true, sfxVol = 0.8;
  try {
    on = localStorage.getItem('ejder-ses') !== '0';
    const sv = localStorage.getItem('ejder-vol-sfx');
    if (sv !== null) sfxVol = clamp01(parseFloat(sv));
  } catch (e) { }
  function busGain() { return curve(sfxVol) * 0.65; }
  function getVol() { return sfxVol; }
  function setVol(v) {
    sfxVol = clamp01(v);
    try { localStorage.setItem('ejder-vol-sfx', String(sfxVol)); } catch (e) { }
    if (master && ac) {
      try { master.gain.setValueAtTime(busGain(), ac.currentTime); } catch (e) { master.gain.value = busGain(); }
    }
    return sfxVol;
  }
  function ensure() {
    if (!on) return false;
    try {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = busGain(); master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
      return true;
    } catch (e) { return false; }
  }
  function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(f, d, type = 'sine', v = 0.2, slide, delay = 0) {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    const det = 1 + (Math.random() * 2 - 1) * 0.05;
    const vVar = v * (1 + (Math.random() * 2 - 1) * 0.05);
    o.type = type; o.frequency.setValueAtTime(f * det, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide * det, t + d);
    env(g, t, 0.01, d, vVar); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  let nb = null;
  function noise(d, v = 0.3, freq = 1200, q = 1, type = 'bandpass', delay = 0, slide) {
    if (!nb) { nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    const fVar = 1 + (Math.random() * 2 - 1) * 0.055;
    const vVar = v * (1 + (Math.random() * 2 - 1) * 0.05);
    s.buffer = nb; s.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.045;
    f.type = type; f.frequency.setValueAtTime(freq * fVar, t); if (slide) f.frequency.exponentialRampToValueAtTime(slide * fVar, t + d); f.Q.value = q;
    const off = Math.random() * Math.max(0, 1.8 - Math.min(1.7, d));
    env(g, t, 0.01, d, vVar); s.connect(f); f.connect(g); g.connect(master); s.start(t, off); s.stop(t + d + 0.05);
  }
  const LIB = {
    click: () => { tone(520, 0.06, 'triangle', 0.06); },
    tick: () => { tone(1250, 0.025, 'triangle', 0.018); },
    tab: () => { noise(0.08, 0.08, 2400, 2); tone(300, 0.08, 'sine', 0.05); },
    coin: () => { tone(1320, 0.08, 'square', 0.04); tone(1760, 0.18, 'square', 0.04, null, 0.06); },
    build: () => { noise(0.12, 0.25, 300, 1, 'lowpass'); tone(140, 0.15, 'sine', 0.2, 90); noise(0.1, 0.15, 500, 1, 'lowpass', 0.14); },
    hit: () => { noise(0.14, 0.4, 900, 0.8, 'lowpass', 0, 200); tone(120, 0.12, 'sine', 0.25, 60); },
    crit: () => { noise(0.25, 0.5, 2000, 0.7, 'lowpass', 0, 200); tone(90, 0.25, 'sawtooth', 0.15, 40); },
    miss: () => { noise(0.2, 0.15, 3000, 3, 'bandpass', 0, 800); },
    roar: () => { noise(0.9, 0.45, 260, 2, 'bandpass', 0, 120); tone(85, 0.9, 'sawtooth', 0.12, 60); },
    breath: () => { noise(0.6, 0.35, 900, 0.6, 'bandpass', 0, 3000); },
    guard: () => { tone(220, 0.25, 'triangle', 0.12, 330); },
    heart: () => { tone(660, 0.12, 'sine', 0.08); tone(880, 0.2, 'sine', 0.08, null, 0.1); },
    page: () => { noise(0.18, 0.12, 4000, 1, 'highpass'); },
    wing: () => { noise(0.22, 0.22, 320, 0.9, 'bandpass', 0, 140); },
    bell: () => { [0, 0.02].forEach(d => { tone(392, 1.6, 'sine', 0.12, null, d); tone(784, 1.2, 'sine', 0.05, null, d); }); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, null, i * 0.12)); },
    lose: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.45, 'triangle', 0.1, null, i * 0.18)); },
    hatch: () => { noise(0.05, 0.3, 3000, 4, 'bandpass'); noise(0.05, 0.3, 2600, 4, 'bandpass', 0.18); noise(0.08, 0.35, 2200, 4, 'bandpass', 0.42); [660, 880, 1100].forEach((f, i) => tone(f, 0.3, 'sine', 0.06, null, 0.6 + i * 0.1)); },
    death: () => { tone(196, 2.2, 'sine', 0.12, 98); tone(147, 2.4, 'sine', 0.08, 73); },
    angle_tick: () => { tone(980, 0.02, 'triangle', 0.035, 1180); },
    charge_hum: () => { tone(320, 0.045, 'sawtooth', 0.03, 480); },
    cannon_launch: () => { noise(0.22, 0.48, 420, 0.85, 'lowpass', 0, 110); tone(150, 0.20, 'sine', 0.32, 48); },
    crater_boom: () => { noise(0.38, 0.55, 520, 0.7, 'lowpass', 0, 80); tone(95, 0.34, 'sawtooth', 0.26, 32); },
    crown_crit: () => { tone(880, 0.32, 'triangle', 0.18); tone(1320, 0.42, 'sine', 0.15, null, 0.04); noise(0.28, 0.5, 1800, 0.8, 'lowpass', 0, 180); },
    turn_switch: () => { tone(440, 0.11, 'triangle', 0.08); tone(660, 0.16, 'sine', 0.07, null, 0.05); },
    boss_telegraph: () => { tone(76, 0.65, 'sawtooth', 0.18, 52); noise(0.55, 0.36, 240, 2, 'bandpass', 0, 110); },
    step_stone: () => { noise(0.04, 0.08, 340, 1.4, 'lowpass'); },
    powerup_arm: () => {
      tone(523.25, 0.12, 'triangle', 0.14, 784);
      tone(784, 0.18, 'sine', 0.12, 1046.5, 0.06);
      noise(0.14, 0.10, 2600, 2.2, 'bandpass', 0.03);
    },
    powerup_discharge: () => {
      noise(0.32, 0.55, 680, 0.8, 'lowpass', 0, 140);
      tone(180, 0.28, 'sawtooth', 0.26, 52);
      tone(880, 0.22, 'triangle', 0.15, 440, 0.02);
    },
  };
  /* Kayıtlı sesler (ElevenLabs, sfx/ klasörü). Dosya varsa onu çalar, yoksa yukarıdaki sentez sesine düşer.
     Her anahtar: [dosyalar, ses düzeyi, perde oynaması]. Birden çok dosya varsa sırayla/rastgele çalınır ki tekrar etmesin. */
  const SMP = {
    click: [['ui-click'], .35, .06], tab: [['ui-tab'], .4, .05], page: [['ui-page'], .45, .05],
    coin: [['ui-coin'], .55, .04], build: [['ui-build'], .6, .03], bell: [['ui-bell'], .6, 0],
    goal: [['ui-goal'], .55, 0], error: [['ui-error'], .5, .03],
    hit: [['f-claw'], .8, .08], crit: [['f-crit'], .9, .04], miss: [['f-miss'], .55, .08], guard: [['f-guard'], .55, .04],
    roar: [['f-roar'], .8, .06], roarS: [['f-roar-small'], .75, .06], card: [['f-card'], .7, 0], ko: [['f-ko'], .9, 0], stun: [['f-stun'], .6, .04],
    win: [['f-win'], .7, 0], lose: [['f-lose'], .7, 0],
    'breath-ates': [['f-breath-ates'], .75, .05], 'breath-buz': [['f-breath-buz'], .75, .05], 'breath-firtina': [['f-breath-firtina'], .75, .05],
    'breath-toprak': [['f-breath-toprak'], .8, .05], 'breath-golge': [['f-breath-golge'], .75, .05],
    cheer: [['c-cheer'], .55, 0], boo: [['c-boo'], .55, 0], gasp: [['c-gasp'], .55, 0], drum: [['c-drum'], .55, 0], horn: [['c-horn'], .5, 0],
    heart: [['d-happy'], .6, .06], sad: [['d-sad'], .55, .04], chirp: [['d-chirp'], .5, .08], hatch: [['d-hatch'], .9, 0], grow: [['d-grow'], .5, 0],
    death: [['d-death'], .7, 0], wash: [['d-wash'], .7, .05], eat: [['d-eat'], .85, .06], ball: [['d-ball'], .8, .04], ring: [['d-ring'], .55, .06],
    wing: [['d-wing'], .35, 0], gavel: [['m-gavel'], .7, .03], sold: [['m-sold'], .65, 0], chatter: [['m-chatter'], .4, .05],
  };
  // Sentezde karşılığı olmayan yeni anahtarlar en yakın eski sese düşer.
  const ALIAS = { goal: 'bell', error: 'tick', roarS: 'roar', card: 'roar', ko: 'crit', stun: 'miss', cheer: 'win', boo: 'lose', gasp: 'miss', drum: 'build', horn: 'bell',
    sad: 'lose', chirp: 'heart', grow: 'win', wash: 'page', eat: 'heart', ball: 'coin', ring: 'coin', wing: 'page', gavel: 'tick', sold: 'win', chatter: 'page' };
  const BUF = {}, LOAD = {}; let base = 'sfx/', loaded = false;
  function fileUrl(f) { return base + f + '.mp3'; }
  function loadAll() {
    if (loaded) return; loaded = true;
    const all = window.SFX_HAVE || [], files = new Set();
    // f-claw, f-claw-2, f-claw-3... hepsi aynı sesin denemeleri: sırayla çalınır, tekrar azalır
    const takesOf = f => all.filter(h => h === f || (h.startsWith(f + '-') && /^\d+$/.test(h.slice(f.length + 1))));
    Object.values(SMP).forEach(s => { s[0] = [...new Set(s[0].flatMap(takesOf))]; s[0].forEach(f => files.add(f)); });
    files.forEach(f => {
      LOAD[f] = (location.protocol === 'file:' ? Promise.reject(0) : fetch(fileUrl(f))).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(buf => { BUF[f] = buf; })
        .catch(() => { // file:// gibi fetch'in yasak olduğu yerlerde <audio> ile dene
          if (location.protocol !== 'file:') { BUF[f] = null; return; }
          const a = new Audio(fileUrl(f)); a.preload = 'auto';
          a.addEventListener('canplaythrough', () => { BUF[f] = { el: a }; }, { once: true });
          a.addEventListener('error', () => { BUF[f] = null; }, { once: true });
        });
    });
  }
  const last = {}, lastAt = {};
  const MIN_REPEAT_MS = 28;
  function sample(n, opt) {
    const s = SMP[n]; if (!s) return false;
    const list = s[0].filter(f => BUF[f]); if (!list.length) return false;
    let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last[n]) i = (i + 1) % list.length; last[n] = i;
    const b = BUF[list[i]], vol = s[1] * (opt && opt.vol != null ? opt.vol : 1), det = s[2] ? 1 + (Math.random() * 2 - 1) * s[2] : 1;
    if (b.el) { const a = b.el.cloneNode(); a.volume = Math.min(1, vol * busGain() * 2); a.playbackRate = det; a.loop = !!(opt && opt.loop); a.play().catch(() => { }); return a.loop ? { stop: () => a.pause() } : true; }
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = b; src.playbackRate.value = det; src.loop = !!(opt && opt.loop); g.gain.value = vol;
    src.connect(g); g.connect(master); src.start();
    return src.loop ? { stop: (fade = .25) => { try { g.gain.setTargetAtTime(0.0001, ac.currentTime, fade / 3); src.stop(ac.currentTime + fade); } catch (e) { } } } : true;
  }
  function play(n, opt) {
    if (!ensure() || !n || sfxVol <= 0) return null; loadAll();
    const norm = String(n).replace(/^(f-|c-|d-|ui-|m-)/, '');
    const key = norm === 'claw' ? 'hit' : norm;
    const now = performance.now();
    if (!(opt && opt.loop) && lastAt[key] && (now - lastAt[key]) < MIN_REPEAT_MS) return null;
    lastAt[key] = now;
    if ((key === 'win' || key === 'lose' || key === 'death') && typeof BGM !== 'undefined') BGM.duck(key === 'death' ? 5000 : 3400);
    try {
      const r = sample(key, opt) || sample(n, opt); if (r) return r;
      if (opt && opt.loop) return null;
      const k = LIB[key] ? key : LIB[n] ? n : key.startsWith('breath') ? 'breath' : ALIAS[key];
      if (k && LIB[k]) LIB[k]();
    } catch (e) { }
    return null;
  }
  function toggle() { on = !on; try { localStorage.setItem('ejder-ses', on ? '1' : '0'); } catch (e) { } if (on) play('click'); return on; }
  return { play, toggle, getVol, setVol, preload() { if (ensure()) loadAll(); }, get on() { return on; }, get ready() { return Object.keys(BUF).filter(k => BUF[k]).length; }, setBase(b) { base = b; } };
})();

/* ---------- Müzik ve ortam sesi: sahneye göre yumuşak geçişli döngüler ----------
   Uzun dosyalar <audio> ile akıtılır (çözme beklemez, file:// altında da çalışır). Bir parçanın birden çok
   denemesi varsa (mus-ocak, mus-ocak-2...) biri bitince ötekine geçilir; böylece döngü tekrara düşmez. */
const BGM = (() => {
  const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(+v) ? +v : 0));
  const curve = v => v <= 0 ? 0 : Math.pow(v, 1.6);
  let musOn = true, started = false, duckT = 0, mood = null, musVol = 0.75, ambVol = 0.7;  // mood: hikâye (bag) ya da veda sahnesi açıkken
  try {
    musOn = localStorage.getItem('ejder-muzik') !== '0';
    const mv = localStorage.getItem('ejder-vol-mus');
    if (mv !== null) musVol = clamp01(parseFloat(mv));
    const av = localStorage.getItem('ejder-vol-amb');
    if (av !== null) ambVol = clamp01(parseFloat(av));
  } catch (e) { }
  const VOL = { mus: curve(musVol) * 0.46, amb: curve(ambVol) * 0.36 }, ch = { mus: { name: null, el: null, v: 0, tv: 0 }, amb: { name: null, el: null, v: 0, tv: 0 } }, dying = [];
  function getVol() { return musVol; }
  function setVol(v) {
    musVol = clamp01(v);
    VOL.mus = curve(musVol) * 0.46;
    try { localStorage.setItem('ejder-vol-mus', String(musVol)); } catch (e) { }
    if (started) tick();
    return musVol;
  }
  function getAmbVol() { return ambVol; }
  function setAmbVol(v) {
    ambVol = clamp01(v);
    VOL.amb = curve(ambVol) * 0.36;
    try { localStorage.setItem('ejder-vol-amb', String(ambVol)); } catch (e) { }
    if (started) tick();
    return ambVol;
  }
  const takes = n => (window.SFX_HAVE || []).filter(f => f === n || (f.startsWith(n + '-') && /^\d+$/.test(f.slice(n.length + 1))));
  function ensureEl(c) {
    const C = ch[c];
    if (!C.el) {
      const el = new Audio();
      el.preload = 'auto';
      el.volume = 0;
      el.addEventListener('ended', () => {
        if (!C.list || !C.list.length) return;
        if (C.list.length > 1) C.idx = (C.idx + 1 + Math.floor(Math.random() * (C.list.length - 1))) % C.list.length;
        el.src = 'sfx/' + C.list[C.idx] + '.mp3';
        el.play().catch(() => { });
      });
      C.el = el;
    }
    return C.el;
  }
  function start(c, n) {
    const C = ch[c], list = takes(n);
    if (!list.length) { C.name = n; if (C.el) { C.el.pause(); } return; }
    const el = ensureEl(c);
    C.list = list;
    C.idx = Math.floor(Math.random() * list.length);
    el.loop = list.length === 1;
    el.src = 'sfx/' + list[C.idx] + '.mp3';
    el.volume = Math.max(0, Math.min(1, C.v || 0.05));
    el.play().catch(() => { });
    C.name = n;
  }
  function set(c, n, tv) {
    const C = ch[c]; C.tv = n ? tv : 0;
    if (n === C.name) {
      if (n && C.el && C.el.paused && C.tv > 0) C.el.play().catch(() => { });
      return;
    }
    if (!n) {
      C.name = null;
      if (C.el) { C.el.pause(); C.v = 0; }
      return;
    }
    start(c, n);
  }
  function want() {
    const raidOpen = typeof SHM !== 'undefined' && SHM && SHM.open;
    if (raidOpen) {
      const has = n => takes(n).length > 0, first = (...l) => l.find(has) || l[l.length - 1];
      if (SHM.screen === 'battle') {
        const isBossStg = !!(SHM.boss && !SHM.boss.dead);
        return {
          mus: isBossStg ? first('mus-final', 'mus-cukur', 'mus-arena') : first('mus-cukur', 'mus-arena'),
          amb: 'amb-cukur',
          ambV: VOL.amb * 0.65
        };
      } else if (SHM.screen === 'victory') {
        return { mus: first('mus-arena', 'mus-sefer'), amb: 'amb-arena', ambV: VOL.amb * 0.45 };
      }
      return { mus: first('mus-sefer', 'mus-title'), amb: 'amb-cukur', ambV: VOL.amb * 0.45 };
    }
    const view = (typeof UI !== 'undefined' && UI && UI.view) || 'ocak';
    const fight = !!document.querySelector('.fight'), race = !!document.getElementById('racem');
    const pit = fight ? (typeof FT !== 'undefined' && FT && FT.tier === 'cukur') : ((view === 'arena' && typeof UI !== 'undefined' && UI.arenaTier === 'cukur') || view === 'zindan');
    const has = n => takes(n).length > 0, first = (...l) => l.find(has) || l[l.length - 1];
    const tour = fight && typeof FT !== 'undefined' && FT && FT.mode === 'tour' && typeof S !== 'undefined' && S && S.tour && (S.tour.id === 'tac' || S.tour.round === 2);
    const modal = typeof modalOn !== 'undefined' && modalOn;
    if (!modal) mood = null;
    let mus;
    if (mood === 'veda' || mood === 'bag') mus = first('mus-' + mood, fight ? 'mus-arena' : 'mus-ocak');
    else if (fight) mus = tour ? first('mus-final', 'mus-arena') : pit ? first('mus-cukur', 'mus-arena') : 'mus-arena';
    else if (race) mus = 'mus-arena';
    else if (view === 'title') mus = first('mus-title', 'mus-sefer');
    else if (view === 'sefer') mus = 'mus-sefer';
    else if (view === 'pazar' || view === 'meydan') mus = (typeof UI !== 'undefined' && UI.stall === 'han') ? first('mus-gece', 'mus-pazar', 'mus-ocak') : first('mus-pazar', 'mus-ocak');
    else if (view === 'zindan' || (view === 'arena' && pit)) mus = first('mus-cukur', 'mus-arena', 'mus-ocak');
    else if (view === 'kasaba') mus = first('mus-ocak-2', 'mus-ocak');
    else mus = 'mus-ocak';
    const amb = fight ? (pit ? 'amb-cukur' : 'amb-arena') : race ? 'amb-arena' : {
      ocak: 'amb-ocak',
      kasaba: 'amb-ocak',
      ahir: 'amb-ocak',
      yuva: 'amb-yuva',
      pazar: 'amb-pazar',
      meydan: 'amb-pazar',
      zindan: 'amb-cukur',
      arena: pit ? 'amb-cukur' : 'amb-arena'
    }[view] || null;
    return { mus, amb, ambV: mood ? VOL.amb * .35 : (fight || race) ? VOL.amb * .55 : VOL.amb };
  }
  function tick() {
    const on = SFX.on && started, w = want(), duck = performance.now() < duckT ? .25 : 1;
    set('mus', on && musOn ? w.mus : null, VOL.mus * duck);
    set('amb', on ? w.amb : null, w.ambV * (duck < 1 ? .6 : 1));
    for (const c of ['mus', 'amb']) { const C = ch[c]; if (!C.el) continue; C.v += (C.tv - C.v) * .18; C.el.volume = Math.max(0, Math.min(1, C.v)); }
    for (let i = dying.length - 1; i >= 0; i--) { const d = dying[i]; d.v *= .78; d.el.volume = Math.max(0, d.v); if (d.v < .01) { d.el.pause(); d.el.src = ''; dying.splice(i, 1); } }
  }
  function sync() {
    if (!started) begin();
    tick();
  }
  function begin() { if (started) return; started = true; ensureEl('mus'); ensureEl('amb'); tick(); setInterval(tick, 100); }
  function toggle() { musOn = !musOn; try { localStorage.setItem('ejder-muzik', musOn ? '1' : '0'); } catch (e) { } return musOn; }
  return { begin, sync, toggle, getVol, setVol, getAmbVol, setAmbVol, mood(m) { mood = m; }, duck(ms = 3200) { duckT = performance.now() + ms; }, get on() { return musOn; }, get state() { return { mus: ch.mus.name, amb: ch.amb.name, mv: +ch.mus.v.toFixed(2), av: +ch.amb.v.toFixed(2) }; } };
})();

document.addEventListener('pointerdown', () => { SFX.preload(); BGM.begin(); BGM.sync(); }, { passive: true, capture: true });
document.addEventListener('touchstart', () => { SFX.preload(); BGM.begin(); BGM.sync(); }, { passive: true, capture: true });

/* ---------- Ekran sarsıntısı, daktilo ---------- */
function shake(el, strong) { if (REDUCED || !el) return; el.classList.remove('shake', 'shake2'); void el.offsetWidth; el.classList.add(strong ? 'shake2' : 'shake'); }
function typeInto(el, html, speed = 16) {
  if (!el) return;
  const plain = html.replace(/<[^>]+>/g, '');
  if (REDUCED || plain.length > 600) { el.innerHTML = html; return; }
  let i = 0; el.textContent = ''; el.classList.add('typing');
  const done = () => { clearInterval(iv); el.innerHTML = html; el.classList.remove('typing'); el.onclick = null; };
  const iv = setInterval(() => { i += 2; el.textContent = plain.slice(0, i); if (i >= plain.length) done(); }, speed);
  el.onclick = done;
}
function countUp(el, to, dur = 700) {
  if (!el) return; if (REDUCED) { el.textContent = to; return; }
  const t0 = performance.now();
  const f = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
