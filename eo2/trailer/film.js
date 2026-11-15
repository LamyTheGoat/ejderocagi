/* Ejder Ocağı fragmanı · film çekirdeği
   Yükleme, oyun alanlarını sinema kamerasıyla çizme, zaman çizelgesi, oynatma ve kayıt.
   Fragman zamanın saf işlevidir: T.render(t) her çağrıda aynı kareyi verir; sahneler trailer/shots.js içindedir. */
(function () {
  'use strict';
  const EO2 = window.EO2, FX = EO2.fx, A = window.EO2_ATLAS, BT = window.EO2_BATTLE, { clamp, lerp, ss } = FX;
  const PATH = Object.assign({ game: '../', tr: '' }, window.EO2_PATH || {});
  const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4, B = (n, beat = 0) => n * BAR + beat * BEAT;
  /* Ölçüler: 0–3 açılış · 4–5 yumurta · 6–7 büyüme · 8–12 elementler · 13–17 dünya · 18–21 düello · 22–23 zindan · 24–25 final · 26–27 mühür */
  const CUE = { BPM, dur: B(28), hatch: B(4), cracks: [7.45, 8.05, 8.5, 8.85, 9.1, 9.3, 9.45], grow: [B(6, 2.5), B(7, 1.5)], el: [8, 9, 10, 11, 12].map(n => B(n)), thunder: [0.25, 1.25], world: B(13), duel: B(18), fire: B(20), boom: B(21), dungeon: B(22), finale: B(24),
    wings: [B(24, 2.3), B(24, 3.5), B(25, 0.7), B(25, 2.1), B(25, 3.92)], logo: B(26) };
  const T = EO2.tr = { CUE, BAR, BEAT, B, PATH, shots: [], texts: [], tx: {}, sets: {}, bsets: {}, time: 0, playing: false, ready: false };
  const F = T.F = { amb: [1, 1, 1], night: 0, time: 0, dt: 1 / 60, camX: 0, camY: 0, camH: 3, D: 7, py: -1e3, horizonNDC: 0, coverTest: () => false };
  let R, W, tEmb, curL = null;

  /* ---------- yükleme ---------- */
  T.boot = async function (canvas, onStep) {
    const step = (k, s) => onStep && onStep(k, s), load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Yüklenemedi: ' + src)); i.src = src; });
    // müzik arka planda bestelenir; iş parçacığı açılamazsa yükleme sonunda ana iş parçacığında üretilir
    const scoreJob = new Promise(res => { try { const w = new Worker(PATH.tr + 'score.js'); w.onmessage = e => { res(e.data); w.terminate(); }; w.onerror = () => res(null); w.postMessage(CUE); } catch (e) { res(null); } });
    step(0.03, 'Yazı tipleri');
    try { await Promise.race([Promise.all([document.fonts.load('800 100px "Alegreya SC"'), document.fonts.load('700 100px "Alegreya SC"'), document.fonts.load('500 60px "Alegreya Sans"')]), new Promise(r => setTimeout(r, 4000))]); } catch (e) {}
    const G = PATH.game + 'assets/', TA = PATH.tr + 'assets/', want = {};
    for (const n of Object.keys(A.sets)) want['chibi_' + n] = G + 'chibi_' + n + '.webp';
    for (const n of Object.keys(BT.sets)) want['battle_' + n] = G + 'battle_' + n + '.webp';
    want.dragon = G + 'dragon.webp'; want.logo = G + 'logo.webp';
    for (const [k, f] of Object.entries({ kor: 'dr-ates-yetiskin', buz: 'dr-buz-genc', toprak: 'dr-toprak-yavru', wagon: 'pvp_prop_wagon', fly: 'ates-P4' })) want['ext_' + k] = G + 'ext/' + f + '.webp';
    for (const n of T.assets) want[n] = TA + n + '.webp';
    const imgs = T.imgs = {}, keys = Object.keys(want); let done = 0;
    await Promise.all(keys.map(k => load(want[k]).then(i => { imgs[k] = i; step(0.05 + 0.45 * (++done / keys.length), 'Görseller'); })));
    EO2.ext = {}; for (const k of ['kor', 'buz', 'toprak', 'wagon', 'fly']) EO2.ext[k] = imgs['ext_' + k];
    step(0.52, 'Sahneler kuruluyor'); await new Promise(r => setTimeout(r, 20));
    R = T.R = EO2.createCine(canvas); if (!R) throw new Error('Bu tarayıcı WebGL2 desteklemiyor.');
    R.resize(canvas.width, canvas.height, 1); FX.init(R);
    W = T.W = EO2.buildWorld(R, A, imgs.dragon); tEmb = R.texture(W.E.emblem);
    for (const n of Object.keys(A.sets)) T.sets[n] = { tex: R.texture(imgs['chibi_' + n]), m: A.sets[n] };
    for (const n of Object.keys(BT.sets)) T.bsets[n] = { tex: R.texture(imgs['battle_' + n]), m: BT.sets[n] };
    T.tDragon = R.texture(imgs.dragon); T.tx.logo = R.texture(imgs.logo);
    for (const n of T.assets) T.tx[n] = R.texture(imgs[n]);
    T.setup(T);                                  // shots.js: dekorlar, yazılar, sahne listesi
    step(0.6, 'Sahneler ısınıyor'); await new Promise(r => setTimeout(r, 20)); for (const q of T.shots) { T.render(q.t0 + 0.01); T.render((q.t0 + q.t1) / 2); } R.gl.finish();
    step(0.7, 'Müzik besteleniyor'); await new Promise(r => setTimeout(r, 30));
    T.scoreData = (await scoreJob) || EO2.score(CUE);
    step(1, 'Hazır'); T.ready = true; T.render(0);
  };

  /* ---------- oyun alanları: js/world.js ve js/scenes*.js çizim listeleri, sinema kamerasıyla ---------- */
  const lightAt = (L, x, y) => { let s = 0; for (const l of (L.lights || [])) { const a = clamp(1 - Math.hypot(x - l[0], y - l[1]) / l[2], 0, 1); s += a * a * l[3]; } return Math.min(1.3, s); };
  F.lit = (x, y, a = 1) => { const k = F.night * (curL ? lightAt(curL, x, y) : 0) * 0.8; return [Math.min(1.08, F.amb[0] + k), Math.min(1.08, F.amb[1] + k * 0.72), Math.min(1.08, F.amb[2] + k * 0.38), a]; };
  function buildMap(L) { const shadows = [...(L.shadows || [])];
    for (const t of (L.trees || [])) shadows.push(t[0] === 'cinar' ? [t[1] - 0.8, t[2] + 0.5, 3.6, 2.2, 0.75] : t[0] === 'selvi' ? [t[1] - 0.3, t[2] + 0.2, 1.0, 0.7, 0.6] : [t[1] - 0.5, t[2] + 0.3, 2.3, 1.4, 0.65]);
    for (const l of (L.lamps || [])) shadows.push([l[0], l[1], 0.5, 0.3, 0.6]); for (const b of (L.benches || [])) shadows.push([b[0], b[1] + 0.1, 1.3, 0.5, 0.6]); for (const p of (L.planters || [])) shadows.push([p[0], p[1] + 0.1, 1.1, 0.5, 0.6]);
    for (const s of (L.stalls || [])) shadows.push([s[0], s[1] + 0.4, 1.9, 1.1, 0.7]); if (L.fount) shadows.push([L.fount.x, L.fount.y, 3.1, 3.0, 0.5]);
    return R.texture(EO2.art.groundMap({ mapRect: L.mapRect, paved: L.paved || [], shadows }), { raw: true }); }
  function buildFx(L) { const fx = [], FXT = W.T.fx, uv = n => W.T.fxMap[n];
    for (const l of (L.lamps || [])) fx.push({ key: l[1] - 0.02, draw(R, F) { if (F.night < 0.02) return; const u = uv('glow'), k = F.night * (0.9 + Math.sin(F.time * 7 + l[0] * 3) * 0.05 + Math.sin(F.time * 13 + l[1]) * 0.04), s = 1.7; R.sprite(FXT, [l[0], l[1] - 0.02, 2.97], s * 2, s * 2, u, [k, 0.66 * k, 0.28 * k, 1], true, 0); } });
    for (const b of (L.braziers || [])) fx.push({ key: b[1] - 0.03, draw(R, F) { const t = F.time, g = uv('glow'), k = 0.35 + F.night * 0.65, s = 3 + Math.sin(t * 9 + b[0]) * 0.16; R.sprite(FXT, [b[0], b[1] - 0.03, 1.2], s, s, g, [k, 0.5 * k, 0.16 * k, 1], true, 0);
      for (let i = 0; i < 3; i++) { const u = uv('flame' + ((Math.floor(t * 10) + i) % 3)), w = 0.3 + i * 0.05 + Math.sin(t * 11 + i * 2) * 0.03, h = 0.75 + Math.sin(t * 8 + i) * 0.1, ox = (i - 1) * 0.13; R.sprite(FXT, [b[0] + ox, b[1] - 0.03, 0.95], w * 2, h, u, [1, 1, 1, 0.95], false, 0, 0, 0.5, 0); } } });
    if (L.chimney) fx.push({ key: 19.35, draw(R, F) { const u = uv('smoke'); for (let i = 0; i < 7; i++) { const p = (F.time * 0.11 + i / 7) % 1, s = 0.35 + p * 1.0; R.sprite(FXT, [-7.47 + p * 1.5 + Math.sin(p * 6 + i) * 0.15, 19.36, 9.1 + p * 3.6], s * 2, s * 2, u, [F.amb[0], F.amb[1], F.amb[2], (1 - p) * 0.55 * Math.min(1, p * 8)]); } } });
    return fx; }
  T.area = function (id) { const sc = id === 'meydan' ? (T._meydan || (T._meydan = { id, L: EO2.layout, statics: W.statics })) : W.scene(id); if (!sc) throw new Error('Alan yok: ' + id); if (!sc.mapTex) { sc.mapTex = buildMap(sc.L); sc.fx = buildFx(sc.L); } return sc; };
  function horizon() { const f = R.fwd, l = Math.hypot(f[0], f[1]) || 1e-6, p = R.project(R.eye[0] + f[0] / l * 1e4, R.eye[1] + f[1] / l * 1e4, R.eye[2]); return p ? 1 - 2 * p[1] / R.h : (f[2] < 0 ? 2 : -2); }
  const list = [];
  /* o: night, time, amb, fog, fogR, clear, items [{ key, draw(R, F) }], pre(R) (zeminden ve her şeyden önce), far (zeminin uzak kenarı) */
  T.drawArea = function (sc, o) {
    const L = sc.L, LT = L.light || {}, n = LT.night !== undefined ? LT.night : (o.night || 0), fogC = o.fog || [lerp(0.80, 0.33, n), lerp(0.89, 0.25, n), lerp(0.97, 0.44, n), LT.fog === undefined ? 0.86 : LT.fog];
    curL = L; R.setFog(fogC, o.fogR || [30, 105]); F.amb = o.amb || LT.amb || [lerp(1, 0.50, n), lerp(1, 0.49, n), lerp(1, 0.74, n)]; F.night = n; F.time = o.time; F.camX = R.eye[0]; F.camY = R.eye[1] - 400; F.camH = R.eye[2]; F.horizonNDC = horizon();
    R.begin(o.clear || LT.clear || fogC); if (o.pre) o.pre(R, F);
    list.length = 0; for (const s of sc.statics) list.push(s); for (const s of sc.fx) list.push(s); for (const s of (o.items || [])) list.push(s); list.sort((a, b) => b.key - a.key);
    let groundDone = false; const ground = () => { groundDone = true; R.ground(sc.mapTex, [-90, R.eye[1] - 60, 90, o.far || 170], { map: L.mapRect, amb: F.amb, night: n, time: o.time, fount: L.fount ? [L.fount.x, L.fount.y, L.fount.ringIn, L.fount.ringOut] : [0, 0, 0, 0], emb: L.emb ? [L.emb.x, L.emb.y, L.emb.r, 0] : [0, 0, -1, 0], lights: L.lights || [], mode: L.floor === 'wood' ? 1 : L.floor === 'sand' ? 2 : 0, road: L.road });
      if (L.emb) { const e = L.emb, s = 0.62, hh = s * W.E.emblem.height / W.E.emblem.width; R.quad(tEmb, [e.x - s, e.y - hh, 0.01], [e.x + s, e.y - hh, 0.01], [e.x + s, e.y + hh, 0.01], [e.x - s, e.y + hh, 0.01], 0, 0, 1, 1, [F.amb[0], F.amb[1], F.amb[2], 0.95]); } };
    for (const d of list) { if (!groundDone && d.key < 1000) ground(); d.draw(R, F); } if (!groundDone) ground();
    R.flush();
  };
  /* chibi: kameraya dönük dik pano (yalnız düşey eksende döner), ayak gölgesiyle */
  const rvec = () => { const r = R.right, l = Math.hypot(r[0], r[1]) || 1; return [r[0] / l, r[1] / l]; };
  T.chibi = function (c) { const st = T.sets[c.set] || T.sets.temel, m = st.m, k = 1.7 / m.tall * (c.sc || 1), vdir = c.dir === 'left' ? 'right' : c.dir, key = c.moving ? vdir + '_walk_' + ((Math.floor(c.ph * 16) % 16) + 16) % 16 : (c.happy && vdir !== 'up' ? vdir + '_happy' : vdir + '_idle');
    const i = m.frames[key], col = i % m.cols, row = Math.floor(i / m.cols); let u0 = (col * m.cw + 0.5) / m.w, u1 = ((col + 1) * m.cw - 0.5) / m.w; const v0 = (row * m.ch + 0.5) / m.h, v1 = ((row + 1) * m.ch - 0.5) / m.h; if (c.dir === 'left') { const t = u0; u0 = u1; u1 = t; }
    const rv = rvec(), w = m.cw * k, h = m.ch * k, l0 = -m.ax * k, zb = -(m.ch - m.ay) * k + (c.z || 0), sh = W.T.fxMap.shadow, br = c.moving ? 1 : 1 + Math.sin(F.time * 2.1 + (c.seed || 0)) * 0.006;
    R.quad(W.T.fx, [c.x - 0.52, c.y - 0.2, 0.012], [c.x + 0.52, c.y - 0.2, 0.012], [c.x + 0.52, c.y + 0.2, 0.012], [c.x - 0.52, c.y + 0.2, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.8]);
    R.quad(st.tex, [c.x + rv[0] * l0, c.y + rv[1] * l0, zb], [c.x + rv[0] * (l0 + w), c.y + rv[1] * (l0 + w), zb], [c.x + rv[0] * (l0 + w), c.y + rv[1] * (l0 + w), zb + h * br], [c.x + rv[0] * l0, c.y + rv[1] * l0, zb + h * br], u0, v0, u1, v1, F.lit(c.x, c.y)); };
  T.chibiItem = c => ({ key: c.y, draw() { T.chibi(c); } });
  /* yoldaş yavru: oyundaki dört parçalı kukla (gövde, baş, kanat, kuyruk) */
  const DK = 0.0034, DG = A.dragon;
  T.pet = function (pet) { const t = F.time, dir = pet.face || 1, hopZ = pet.moving ? Math.abs(Math.sin(pet.hop * Math.PI)) * 0.16 : (pet.cheer ? Math.abs(Math.sin(t * 9)) * 0.14 : 0), col = F.lit(pet.x, pet.y), sh = W.T.fxMap.shadow, ss2 = 1 - hopZ * 1.6, rv = rvec();
    R.quad(W.T.fx, [pet.x - 0.42 * ss2, pet.y - 0.16 * ss2, 0.012], [pet.x + 0.42 * ss2, pet.y - 0.16 * ss2, 0.012], [pet.x + 0.42 * ss2, pet.y + 0.16 * ss2, 0.012], [pet.x - 0.42 * ss2, pet.y + 0.16 * ss2, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75]);
    const b = DG.body, bs = b.scale, an = n => [(b[n][0] - b.pivot[0]) * bs, (b[n][1] - b.pivot[1]) * bs];
    const part = (name, at, rot) => { const r = DG.rects[name], d = DG[name], s = d.scale, cs = Math.cos(rot), sn = Math.sin(rot), P = (px, py) => { const lx = (px - d.pivot[0]) * s, ly = (py - d.pivot[1]) * s, rx = (lx * cs - ly * sn + at[0]) * dir * DK, ry = lx * sn + ly * cs + at[1]; return [pet.x + rv[0] * rx, pet.y + rv[1] * rx, -ry * DK + hopZ + 0.02]; };
      R.quad(T.tDragon, P(0, r[3]), P(r[2], r[3]), P(r[2], 0), P(0, 0), r[0] / DG.w, r[1] / DG.h, (r[0] + r[2]) / DG.w, (r[1] + r[3]) / DG.h, col); };
    const flap = pet.moving ? Math.sin(t * 13) * 0.3 : Math.sin(t * 1.7) * 0.07 + (pet.cheer ? Math.sin(t * 22) * 0.35 : 0);
    part('tail', an('tail'), Math.sin(t * 2.2) * 0.13); part('wing', an('wing'), DG.wing.rest * Math.PI / 180 + flap); part('body', [0, 0], 0); part('head', an('neck'), Math.sin(t * 1.4) * 0.05 + (pet.moving ? Math.sin(pet.hop * Math.PI * 2) * 0.05 : 0)); };
  T.petItem = p => ({ key: p.y + 0.001, draw() { T.pet(p); } });
  T.npcItems = (L, skip) => (L.npcs || []).filter(n => !(skip && skip.includes(n.id))).map(n => T.chibiItem({ x: n.x, y: n.y, dir: n.dir || 'down', set: T.sets[n.set] ? n.set : 'temel', seed: n.x * 3 }));

  /* ---------- zaman çizelgesi ---------- */
  T.shot = (t0, t1, fn) => T.shots.push({ t0, t1, fn });
  // kesmede kısa parlama; kararma ve parlama aynı katmanı paylaşır, güçlü olan kazanır
  T.flash = (f, lt, dur = 0.22, col = [1, 1, 1], a = 0.9) => { if (lt < dur) { const k = a * Math.pow(1 - lt / dur, 1.6); if (k > f.fade[3]) f.fade = [col[0], col[1], col[2], k]; } };
  T.dip = (f, k, col = [0, 0, 0]) => { if (k > f.fade[3]) f.fade = [col[0], col[1], col[2], clamp(k, 0, 1)]; };
  /* yazı: o.y (NDC), o.h (boy), o.al (-1 sol | 0 orta), o.x, biçim seçenekleri FX.text'e geçer */
  T.say = function (str, t0, t1, o = {}) { const tex = FX.text(R, str, o); T.texts.push({ t0, t1, draw(lt, d) { const a = ss(0, o.fin || 0.4, lt) * (1 - ss(d - (o.fout || 0.45), d, lt)), sc = 1 + 0.05 * (1 - FX.out(lt / 0.7)) + 0.025 * lt / d; FX.label(R, tex, o.x || 0, o.y === undefined ? -0.5 : o.y, o.h || 0.09, a * (o.a || 1), sc, o.al || 0); } }); };
  T.render = function (t) {
    t = clamp(t, 0, CUE.dur - 1e-3); T.time = t; let s = T.shots[T.shots.length - 1]; for (const q of T.shots) if (t >= q.t0 && t < q.t1) { s = q; break; }
    const f = T.film = { bloom: 0.5, bloom2: 0.65, thr: 0.74, sat: 1.1, con: 1.07, expo: 1, vig: 0.55, tint: [1, 1, 1], fade: [0, 0, 0, 0], bar: 0.128, ca: 0.018, time: t };
    s.fn(t - s.t0, (t - s.t0) / (s.t1 - s.t0), f, t);
    for (const x of T.texts) if (t >= x.t0 && t < x.t1) x.draw(t - x.t0, x.t1 - x.t0);
    if (t > CUE.dur - 1.1) T.dip(f, (t - (CUE.dur - 1.1)) / 1.0);
    R.end(f);
  };

  /* ---------- oynatma: saat sesten alınır, görüntü sese uyar ---------- */
  let ac = null, src = null, gain = null, recDest = null, t0 = 0, offset = 0, raf = 0, onTick = null;
  T.audio = function () { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: T.scoreData.sr }); gain = ac.createGain(); gain.connect(ac.destination); T.buffer = EO2.scoreBuffer(ac, T.scoreData); } return ac; };
  T.mute = v => { T.muted = v; if (gain) gain.gain.value = v ? 0 : 1; };
  function frame() { if (!T.playing) return; const t = ac.currentTime - t0; if (t >= CUE.dur) { T.pause(); offset = 0; T.render(CUE.dur); if (T.onEnd) T.onEnd(); if (onTick) onTick(CUE.dur); return; } T.render(t); if (onTick) onTick(t); raf = requestAnimationFrame(frame); }
  T.play = async function (from) { T.audio(); if (ac.state !== 'running') await ac.resume(); if (T.playing) T.pause(); if (from !== undefined) offset = from; if (offset >= CUE.dur - 0.05) offset = 0;
    src = ac.createBufferSource(); src.buffer = T.buffer; src.connect(gain); if (recDest) src.connect(recDest); const at = ac.currentTime + 0.06; src.start(at, offset); t0 = at - offset; T.playing = true; raf = requestAnimationFrame(frame); };
  T.pause = function () { if (!T.playing) return; T.playing = false; cancelAnimationFrame(raf); offset = clamp(ac.currentTime - t0, 0, CUE.dur); try { src.stop(); } catch (e) {} src = null; };
  T.seek = function (t) { const was = T.playing; if (was) T.pause(); offset = clamp(t, 0, CUE.dur); T.render(offset); if (onTick) onTick(offset); if (was) T.play(); };
  T.onTick = fn => { onTick = fn; };
  T.resize = (w, h) => { R.resize(w, h, 1); if (!T.playing && T.ready) T.render(T.time); };

  /* ---------- kayıt: tuval akışı + ses → MediaRecorder (araç: trailer/tools/record.mjs) ---------- */
  T.record = function (o = {}) { return new Promise((resolve, reject) => { T.audio(); recDest = ac.createMediaStreamDestination(); const cv = R.gl.canvas, vs = cv.captureStream(o.fps || 60), stream = new MediaStream([...vs.getVideoTracks(), ...recDest.stream.getAudioTracks()]);
    const types = ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.42E028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'], type = types.find(m => MediaRecorder.isTypeSupported(m)); if (!type) return reject(new Error('Kayıt biçimi yok'));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: o.vbps || 9e6, audioBitsPerSecond: 192000 }), chunks = [], dts = []; let last = 0; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { recDest = null; resolve({ blob: new Blob(chunks, { type }), type, frames: dts.length, slow: dts.filter(d => d > 0.025).length, worst: Math.max(...dts) }); }; rec.onerror = e => reject(e.error || new Error('Kayıt hatası'));
    const prevTick = onTick; onTick = t => { if (last) dts.push(t - last); last = t; if (prevTick) prevTick(t); }; T.onEnd = () => { onTick = prevTick; T.onEnd = null; setTimeout(() => rec.stop(), 350); };
    rec.start(1000); T.play(0); }); };
})();
