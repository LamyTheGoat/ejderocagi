// EO2 dikey dilim: chibi sosyal karelerini ve ejder parçalarını atlasa pişirir.
// Kaynak: prototype/chibi_rig/gate7/social.html (salt okunur; chibi sohbetinin çizicisi aynen kullanılır).
// Kullanım: node eo2/tools/bake.mjs        env: SC (ölçek, varsayılan 0.8), SETS=bare,temel,muhafiz
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..');
const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const rigRoot = path.join(repo, 'prototype', 'chibi_rig'), out = path.join(repo, 'eo2', 'assets');
const LOGO = 'C:/Users/user/Documents/artDirectionAndAssets/EJDER_OCAGI_2_GORSEL_KIMLIK_V1/EJDER_OCAGI_2_GORSEL_KIMLIK_V1/01_LOGO/EO2_LOGO_MAVI_EJDER_ALTIN_YAZI_RGBA.png';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = u === '/__logo.png' ? LOGO : path.join(rigRoot, u);
  if (u !== '/__logo.png' && !path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); s.end(b); });
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(base + '/gate7/social.html');
await p.waitForFunction('window.RIG_READY === true', { timeout: 120000 });
fs.mkdirSync(out, { recursive: true });
const SC = +(process.env.SC || 0.8), SETS = (process.env.SETS || 'bare,temel,muhafiz').split(',');
const save = (name, dataUrl) => { const buf = Buffer.from(dataUrl.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, name), buf); return buf.length; };
const meta = { sc: SC, hz: 1.3, sets: {} };

for (const set of SETS) {
  const res = await p.evaluate(async ({ set, SC }) => {
    const S = window.SOC, view = document.getElementById('view'), W = view.width, H = view.height, GX = 600, GY = 640, N = 16, cyc = 1 / 1.3;
    S.st.bare = true; S.st.set = set === 'bare' ? null : set; S.st.scar = true; S.st.bald = false;
    // Kare listesi: her yön için 16 yürüme + 1 bekleme; ön ve yan için ayrıca gülen yüzle bekleme (emote).
    const list = [];
    for (const dir of ['down', 'up', 'right']) {
      for (let i = 0; i < N; i++) list.push({ dir, moving: true, t: i * cyc / N, face: 'neutral', key: dir + '_walk_' + i });
      list.push({ dir, moving: false, t: 0, face: 'neutral', key: dir + '_idle' });
      if (dir !== 'up') list.push({ dir, moving: false, t: 0, face: 'happy', key: dir + '_happy' });
    }
    const grab = f => { S.st.face = f.face; S.film(f.dir, f.moving, [f.t]); return view.getContext('2d').getImageData(0, 0, W, H); };
    // 1. geçiş: bütün karelerin ortak sınır kutusu (ayak noktası sabit kalsın diye tek hücre ölçüsü).
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const f of list) { const d = grab(f).data; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(W, x1 + 8); y1 = Math.min(H, y1 + 8);
    // Ayak noktasına göre simetrik genişlik: aynalama (sola yürüyüş) aynı hücreyle çalışsın.
    const half = Math.max(GX - x0, x1 - GX); x0 = GX - half; x1 = GX + half;
    const cw = Math.ceil((x1 - x0) * SC), ch = Math.ceil((y1 - y0) * SC), cols = 9, rows = Math.ceil(list.length / cols);
    const atlas = document.createElement('canvas'); atlas.width = cols * cw; atlas.height = rows * ch;
    const ax = atlas.getContext('2d'); ax.imageSmoothingQuality = 'high';
    const frames = {};
    list.forEach((f, i) => { grab(f); const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch; ax.drawImage(view, x0, y0, x1 - x0, y1 - y0, cx, cy, cw, ch); frames[f.key] = i; });
    // Boy ölçümü: ön bekleme karesinde dolu en üst satır ile ayak noktası arası.
    const d = grab(list.find(f => f.key === 'down_idle')).data; let top = H;
    for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { top = y; break; }
    return { url: atlas.toDataURL('image/webp', 0.93), cw, ch, cols, rows, ax: (GX - x0) * SC, ay: (GY - y0) * SC, tall: (GY - top) * SC, frames, w: atlas.width, h: atlas.height };
  }, { set, SC });
  const bytes = save(`chibi_${set}.webp`, res.url); delete res.url;
  meta.sets[set] = res; console.log(`chibi_${set}.webp`, res.w + 'x' + res.h, 'hücre', res.cw + 'x' + res.ch, 'boy', Math.round(res.tall), (bytes / 1024 | 0) + ' KB');
}

// Ejder modülü: dört parça tek atlas (çalışma anında kanat, baş, kuyruk ayrı oynatılır).
const dr = await p.evaluate(async () => {
  const ld = s => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(s)); i.src = s; });
  const names = ['body', 'head', 'wing', 'tail'], ims = []; for (const n of names) ims.push(await ld('/dragon_module/' + n + '.png'));
  const pad = 4, W = ims.reduce((a, i) => a + i.naturalWidth + pad, pad), H = Math.max(...ims.map(i => i.naturalHeight)) + pad * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const rects = {}; let cx = pad;
  ims.forEach((im, k) => { x.drawImage(im, cx, pad); rects[names[k]] = [cx, pad, im.naturalWidth, im.naturalHeight]; cx += im.naturalWidth + pad; });
  const lg = await ld('/__logo.png'), L = document.createElement('canvas'); L.width = 720; L.height = Math.round(720 * lg.naturalHeight / lg.naturalWidth);
  const lx = L.getContext('2d'); lx.imageSmoothingQuality = 'high'; lx.drawImage(lg, 0, 0, L.width, L.height);
  return { url: c.toDataURL('image/webp', 0.95), rects, w: W, h: H, logo: L.toDataURL('image/webp', 0.9), lw: L.width, lh: L.height };
});
console.log('dragon.webp', dr.w + 'x' + dr.h, (save('dragon.webp', dr.url) / 1024 | 0) + ' KB');
console.log('logo.webp', dr.lw + 'x' + dr.lh, (save('logo.webp', dr.logo) / 1024 | 0) + ' KB');
meta.dragon = { rects: dr.rects, w: dr.w, h: dr.h,
  // prototype/chibi_rig/rig_data.js içindeki bağlantı noktaları (parça pikseli)
  body: { scale: 0.66, pivot: [156, 174], neck: [231, 34], tail: [34, 124], wing: [140, 50] }, head: { scale: 0.66, pivot: [71, 171] }, wing: { scale: 0.66, pivot: [363, 66], rest: 30 }, tail: { scale: 0.95, pivot: [173, 57] } };
fs.writeFileSync(path.join(out, 'atlas.js'), '// tools/bake.mjs üretir; elle düzenleme.\nwindow.EO2_ATLAS = ' + JSON.stringify(meta) + ';\n');
console.log(JSON.stringify({ errors }));
await b.close(); srv.close();
