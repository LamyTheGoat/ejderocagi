/* EO2 dikey dilim · ses (tamamı kodla üretilir, dosya yok)
   Çeşme uğultusu, kuşlar ve cırcır böcekleri, adım sesi, arayüz tıkları, Ozan'ın sazı (Karplus-Strong tel modeli,
   9/8 aksak ölçü, hüseyni dizisine yakın perdeler). Tarayıcı kuralı gereği ilk dokunuş ya da tuştan sonra başlar. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};
  let ctx = null, master = null, on = true, vol = 0.7, nightV = 0, started = false;
  const nodes = {}, st = { fx: 99, fy: 99, ox: 99, oy: 99, sazBoost: 0, battle: false, indoor: false, area: 'meydan' };
  const now = () => ctx.currentTime;
  function noiseBuf(sec, pink) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = pink ? l * 0.97 + w * 0.03 : w; d[i] = pink ? l * 6 : w; } return b; }
  function loop(buf, filt, gain) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const f = ctx.createBiquadFilter(); Object.assign(f, { type: filt[0] }); f.frequency.value = filt[1]; f.Q.value = filt[2] || 0.7; const g = ctx.createGain(); g.gain.value = gain; s.connect(f); f.connect(g); g.connect(master); s.start(); return g; }
  /* Tel: Karplus-Strong. Kısa gürültü patlaması, gecikme hattında süzülerek söner. */
  const pluckCache = {};
  function pluck(freq) { const key = Math.round(freq * 10); if (pluckCache[key]) return pluckCache[key];
    const sr = ctx.sampleRate, n = Math.floor(sr * 1.3), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), N = Math.round(sr / freq), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (1 - i / N * 0.3);
    let p = 0; for (let i = 0; i < n; i++) { const a = ring[p], c = ring[(p + 1) % N]; d[i] = a; ring[p] = (a + c) * 0.4975; p = (p + 1) % N; }
    return pluckCache[key] = b; }
  function playBuf(buf, t, gain, pan, rate) { const s = ctx.createBufferSource(); s.buffer = buf; if (rate) s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = gain; let out = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); out = p; } s.connect(g); out.connect(master); s.start(t); return s; }
  function tone(type, f0, f1, t, dur, gain, pan) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); let out = g;
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; } o.connect(g); out.connect(master); o.start(t); o.stop(t + dur + 0.05); }
  function burst(t, dur, freq, q, gain, type) { const s = ctx.createBufferSource(); s.buffer = nodes.white; const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5, dur + 0.05); }

  // Saz: la kararlı hüseyni dizisine yakın perdeler (si ve fa diyez çeyrek ses pes), 9/8 = 2+2+2+3
  const A = 220, SC = [A, A * 1.0905, A * 1.189, A * 1.335, A * 1.498, A * 1.652, A * 1.782, A * 2];
  const RIFFS = [[0, 2, 1, 0, 3, 2, 1, 2, 0], [4, 3, 2, 3, 4, 5, 4, 3, 2], [0, 1, 2, 3, 2, 1, 0, 1, 0], [4, 5, 6, 7, 6, 5, 4, 3, 4], [2, 3, 4, 3, 2, 1, 0, 1, 0]];
  let sazT = 0, riffI = 0;
  function sazTick() { if (!ctx || !on || st.battle) return; const d = Math.hypot(st.ox, st.oy), g = Math.max(0, 1 - d / 13); if (g <= 0.02 && st.sazBoost <= 0) { sazT = 0; return; }
    const t = now(); if (sazT < t + 0.1) sazT = t + 0.15; const beat = st.sazBoost > 0 ? 0.2 : 0.27;
    while (sazT < t + 1.2) { const r = RIFFS[riffI++ % RIFFS.length], k = (0.16 + st.sazBoost * 0.12) * (0.25 + g * 0.75), pan = Math.max(-0.8, Math.min(0.8, st.ox / 8));
      for (let i = 0; i < 9; i++) { const acc = i === 0 || i === 2 || i === 4 || i === 6; playBuf(pluck(SC[r[i]]), sazT + i * beat, k * (acc ? 1 : 0.6), pan); if (acc) playBuf(pluck(A / 2), sazT + i * beat, k * 0.5, pan); }
      sazT += 9 * beat; } }
  function applyScene() { if (!ctx) return; const t = now(); nodes.fire.gain.setTargetAtTime(st.indoor ? 0.2 : 0, t, 0.3); nodes.air.gain.setTargetAtTime(st.indoor ? 0.01 : st.area === 'yol' ? 0.07 : 0.035, t, 0.3); }
  function birdTick() { if (!ctx || !on || st.indoor) return; const t = now();
    if (nightV < 0.5) { if (Math.random() < 0.5) { const f = 2400 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4), pan = Math.random() * 1.6 - 0.8; for (let i = 0; i < n; i++) tone('sine', f * (1 + i * 0.04), f * (1.25 + Math.random() * 0.3), t + i * 0.11, 0.08, 0.035, pan); } }
    else if (Math.random() < 0.8) { const pan = Math.random() * 1.6 - 0.8; for (let i = 0; i < 6; i++) tone('sine', 4300, 4350, t + i * 0.055, 0.035, 0.012, pan); } }

  function start() { if (started) return; started = true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = on ? vol : 0; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    nodes.white = noiseBuf(2, false); nodes.pink = noiseBuf(3, true);
    nodes.fount = loop(nodes.white, ['bandpass', 2600, 0.6], 0); nodes.fountLow = loop(nodes.pink, ['lowpass', 420, 0.5], 0); nodes.air = loop(nodes.pink, ['lowpass', 900, 0.4], 0.035);
    nodes.fire = loop(nodes.pink, ['bandpass', 520, 0.6], 0); applyScene();
    setInterval(sazTick, 300); setInterval(birdTick, 1700); setInterval(() => { if (ctx && on && st.indoor && !st.battle && Math.random() < 0.55) burst(now(), 0.03 + Math.random() * 0.03, 1800 + Math.random() * 2600, 2.5, 0.05 + Math.random() * 0.05); }, 170); }
  const ok = () => ctx && on;
  EO2.audio = {
    start, isOn: () => on,
    toggle() { on = !on; if (master) master.gain.setTargetAtTime(on ? vol : 0, now(), 0.08); return on; },
    night(v) { nightV = v; if (!ok()) return; const t = now(); if (v) { tone('sine', 220, 110, t, 1.2, 0.07); [660, 880, 990, 1320].forEach((f, i) => tone('triangle', f, f, t + 0.25 + i * 0.13, 0.5, 0.035, i / 2 - 0.75)); } else [523, 659, 784].forEach((f, i) => tone('triangle', f, f, t + i * 0.09, 0.4, 0.04)); },
    step() { if (!ok() || st.battle) return; const t = now(); burst(t, 0.05, 900 + Math.random() * 500, 1.2, 0.05); burst(t, 0.03, 180, 0.8, 0.07, 'lowpass'); },
    ui() { if (ok()) { const t = now(); tone('triangle', 880, 1320, t, 0.09, 0.045); } },
    pop() { if (ok()) { const t = now(); tone('sine', 520, 1040, t, 0.12, 0.06); tone('sine', 1040, 1560, t + 0.06, 0.1, 0.035); } },
    chime() { if (ok()) { const t = now(); tone('triangle', 659, 659, t, 0.35, 0.05); tone('triangle', 988, 988, t + 0.09, 0.45, 0.045); } },
    splash() { if (ok()) { const t = now(); burst(t, 0.5, 3200, 0.5, 0.16); burst(t + 0.05, 0.35, 900, 0.7, 0.1); } },
    chirp() { if (ok()) { const t = now(); tone('sawtooth', 700, 1500, t, 0.1, 0.03); tone('sawtooth', 900, 1900, t + 0.1, 0.12, 0.03); } },
    scene(L) { st.indoor = !!L.indoor; st.area = L.id; applyScene(); },
    whoosh() { if (ok()) { const t = now(); burst(t, 2.6, 380, 0.7, 0.11, 'lowpass'); tone('sine', 140, 70, t + 0.2, 1.8, 0.05); } },
    sing(sec) { st.sazBoost = 1; setTimeout(() => { st.sazBoost = 0; }, (sec || 9) * 1000); },
    // düello sesleri
    battle(v) { st.battle = v; },
    charge(p) { if (ok()) tone('sine', 180 + p * 520, 190 + p * 540, now(), 0.06, 0.018); },
    fire() { if (ok()) { const t = now(); tone('sine', 150, 38, t, 0.5, 0.5); burst(t, 0.3, 500, 0.5, 0.4, 'lowpass'); burst(t, 0.12, 2400, 0.6, 0.18); } },
    boom(k) { if (ok()) { const t = now(), g = 0.35 + (k || 0.5) * 0.4; tone('sine', 110, 30, t, 0.7, g); burst(t, 0.6, 320, 0.4, g, 'lowpass'); burst(t + 0.02, 0.25, 1800, 0.5, g * 0.4); } },
    hit() { if (ok()) { const t = now(); tone('square', 320, 90, t, 0.18, 0.09); } },
    turn() { if (ok()) { const t = now(); tone('triangle', 587, 587, t, 0.22, 0.05); tone('triangle', 880, 880, t + 0.12, 0.3, 0.05); } },
    win(w) { if (ok()) { const t = now(), s = w ? [523, 659, 784, 1047, 1319] : [440, 392, 349, 294]; s.forEach((f, i) => { tone('triangle', f, f, t + i * 0.14, 0.5, 0.07); playBuf(pluck(f / 2), t + i * 0.14, 0.2, 0); }); } },
    /* Her karede: dinleyicinin (oyuncunun) çeşmeye ve Ozan'a uzaklığı */
    update(px, py, f, oz) { st.fx = f.x - px; st.fy = f.y - py; if (oz) { st.ox = oz.x - px; st.oy = oz.y - py; } if (!ok()) return;
      const d = Math.hypot(st.fx, st.fy), g = st.battle ? 0 : Math.max(0, 1 - d / 16); nodes.fount.gain.setTargetAtTime(g * g * 0.12, now(), 0.15); nodes.fountLow.gain.setTargetAtTime(g * g * 0.22, now(), 0.15); },
  };
  const kick = () => { start(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
  addEventListener('pointerdown', kick, { passive: true }); addEventListener('keydown', kick);
})();
