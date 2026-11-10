// EO2: Topçu savaş karelerini atlasa pişirir (top ve üstündeki yavru ejderle birlikte).
// Kaynak: prototype/chibi_rig/gate7/index.html (salt okunur). Sayfanın kendi çizicisi kullanılır; yalnız arka plan
// ve yer gölgesi çizimi atlanır ki kareler şeffaf zeminli çıksın.
// Kullanım: node eo2/tools/bake_battle.mjs      env: SETS=temel,muhafiz  TALL=270
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..');
const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const rigRoot = path.join(repo, 'prototype', 'chibi_rig'), out = path.join(repo, 'eo2', 'assets');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = path.join(rigRoot, decodeURIComponent(q.url.split('?')[0])); if (!path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': T[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1400, height: 1100 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/gate7/index.html`);
await p.waitForFunction('window.RIG_READY === true', { timeout: 180000 });
const SETS = (process.env.SETS || 'temel,muhafiz').split(','), TALL = +(process.env.TALL || 270), meta = { sets: {} };
const ANGLES = []; for (let a = -10; a <= 70; a += 5) ANGLES.push(a);
// Arka planı ve yer gölgesini atla; kamera noktasını yakala.
await p.evaluate(() => { const c = window.TRIAL.view.getContext('2d'), fr = c.fillRect.bind(c), fl = c.fill.bind(c); window.__cam = {};
  const ident = () => { const m = c.getTransform(); return m.a === 1 && m.d === 1 && m.e === 0 && m.f === 0; };
  c.fillRect = (x, y, w, h) => { if (ident()) { if (x === 0 && w === c.canvas.width && h < 20) window.__cam.gy = y; return; } fr(x, y, w, h); };
  c.fill = (...a) => { if (c.fillStyle instanceof CanvasGradient) { if (window.__cam.x === undefined) window.__cam.x = c.getTransform().e; return; } fl(...a); };
  const rg = c.createRadialGradient.bind(c); c.createRadialGradient = (x0, y0, r0, x1, y1, r1) => { const m = c.getTransform(); if (m.b !== 0 || m.c !== 0 || Math.abs(m.a - m.d) < 1e-6) { const q = m.transformPoint(new DOMPoint(x0, y0)); window.__cam.muzzle = [q.x, q.y]; } return rg(x0, y0, r0, x1, y1, r1); }; });
for (const set of SETS) {
  await p.evaluate(s => { const nm = (window.SET_NAMES || {})[s] || s, bt = [...document.querySelectorAll('#slotSet button')].find(x => x.textContent === nm); if (!bt) throw new Error('set yok: ' + s); bt.click(); }, set);
  await p.waitForTimeout(2500);
  const res = await p.evaluate(async ({ ANGLES, TALL }) => {
    const TR = window.TRIAL, view = TR.view, c = view.getContext('2d'), W = view.width, H = view.height, cyc = 1 / 1.3;
    const list = [{ key: 'idle', clip: 'idle', t: 0.01 }, { key: 'hurt_0', clip: 'hurt', t: 0.12 }, { key: 'hurt_1', clip: 'hurt', t: 0.34 }];
    for (let i = 0; i < 16; i++) list.push({ key: 'walk_' + i, clip: 'walk', t: i * cyc / 16 + 0.001 });
    // Nişan duruşu: ateş klibinin yatışmış sonu (sayfadaki 'aim' klibi açıyı kendi kendine süpürüyor), yüz ciddi.
    for (const a of ANGLES) { list.push({ key: 'aim_' + a, clip: 'fire', t: 0.78, o: { aim: a, face: 'neutral' } }); list.push({ key: 'fire0_' + a, clip: 'fire', t: 0.05, o: { aim: a, face: 'auto' } }); list.push({ key: 'fire1_' + a, clip: 'fire', t: 0.19, o: { aim: a, face: 'auto' }, aim: a }); }
    const grab = f => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.restore(); window.__cam.muzzle = null; TR.film(f.clip, [f.t], Object.assign({ aim: 8, face: 'auto' }, f.o || {})); return c.getImageData(0, 0, W, H); };
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const f of list) { const d = grab(f).data; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    const GX = window.__cam.x, GY = window.__cam.gy; if (!(GX > 0) || !(GY > 0)) throw new Error('kamera noktası yakalanamadı');
    x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(W, x1 + 8); y1 = Math.min(H, y1 + 8);
    // boy: bekleme karesinde dolu en üst satır
    let d = grab(list[0]).data, top = H; for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { top = y; break; }
    const SC = TALL / (GY - top), cw = Math.ceil((x1 - x0) * SC), ch = Math.ceil((y1 - y0) * SC), cols = 10, rows = Math.ceil(list.length / cols);
    const atlas = document.createElement('canvas'); atlas.width = cols * cw; atlas.height = rows * ch; const ax = atlas.getContext('2d'); ax.imageSmoothingQuality = 'high';
    const frames = {}, muzzle = {};
    list.forEach((f, i) => { const im = grab(f); ax.drawImage(view, x0, y0, x1 - x0, y1 - y0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); frames[f.key] = i;
      if (f.aim !== undefined && window.__cam.muzzle) muzzle[f.aim] = [+((window.__cam.muzzle[0] - GX) * SC).toFixed(1), +((GY - window.__cam.muzzle[1]) * SC).toFixed(1)]; });
    return { url: atlas.toDataURL('image/webp', 0.92), cw, ch, cols, rows, ax: +((GX - x0) * SC).toFixed(1), ay: +((GY - y0) * SC).toFixed(1), tall: TALL, frames, muzzle, w: atlas.width, h: atlas.height };
  }, { ANGLES, TALL });
  const buf = Buffer.from(res.url.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, `battle_${set}.webp`), buf); delete res.url; meta.sets[set] = res;
  console.log(`battle_${set}.webp`, res.w + 'x' + res.h, 'hücre', res.cw + 'x' + res.ch, (buf.length / 1024 | 0) + ' KB', 'namlu(0°)', res.muzzle[0], 'namlu(45°)', res.muzzle[45]);
}
meta.angles = ANGLES;
fs.writeFileSync(path.join(out, 'battle.js'), '// tools/bake_battle.mjs üretir; elle düzenleme.\nwindow.EO2_BATTLE = ' + JSON.stringify(meta) + ';\n');
console.log(JSON.stringify({ errors })); await b.close(); srv.close();
