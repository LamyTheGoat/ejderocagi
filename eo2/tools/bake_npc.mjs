// EO2 · NPC chibilerini atlasa pişirir (2026-11-17, kullanıcı izni: "NPC'ler halen eklenmemiş, chibi üretimine bak").
// Kaynak: prototype/chibi_rig/gate7/social.html (salt okunur; chibi katman sisteminin kendi çizicisi ve NPC tanımları aynen kullanılır:
// kostüm seti, saç stili ve rengi, başlık, sakal). Oyundaki NPC'ler şimdiye dek oyuncu setlerini (avcı, muhafız…) giyiyordu.
// Çıktı: eo2/assets/npc/<ad>.webp ve eo2/assets/npc_atlas.js (kare ölçüleri + oyundaki NPC kimliği → çizim eşlemesi).
// Oyuncu atlasından farkı: yürüyüş yön başına 8 kare (16 anahtar aynı karelere eşlenir), böylece dosya yarıya iner; NPC atlası oyunda
// ilk görüldüğü sahnede yüklenir (js/game.js), açılışı ağırlaştırmaz.
// Kullanım: node eo2/tools/bake_npc.mjs        env: SC (ölçek, varsayılan 0.8), NPCS=kerim,ozan (yalnız bunlar)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const rigRoot = path.join(repo, 'prototype', 'chibi_rig'), out = path.join(repo, 'eo2', 'assets', 'npc'); fs.mkdirSync(out, { recursive: true });
// oyundaki NPC kimliği (js/scenes*.js, js/bolumler) → çizicideki NPC tanımı
const KIM = { kerim: 'kerim', ozan: 'ozan', tuccar: 'tuccar', yumurtaci: 'yumurtaci', muhtar: 'muhtar', cirak: 'cirak', hamal: 'hamal', bahcivan: 'bahcivan', kervanci: 'kervanci', tavlaci1: 'tavlaci', tavlaci2: 'tavlaci', talimci: 'talimci', hanci: 'hanci',
  bekci1: 'bekci', bekci2: 'bekci', devriye: 'bekci', arenabekci: 'bekci', rustem: 'bedesten', baharatci: 'baharatci' };
const SC = +(process.env.SC || 0.8), ISTENEN = process.env.NPCS ? process.env.NPCS.split(',') : [...new Set(Object.values(KIM))];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(rigRoot, u); if (!path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/gate7/social.html`); await p.waitForFunction('window.RIG_READY === true', { timeout: 120000 });
const hedefDosya = path.join(repo, 'eo2', 'assets', 'npc_atlas.js'); let meta = { sc: SC, hz: 1.3, sets: {}, kim: KIM };
if (process.env.NPCS && fs.existsSync(hedefDosya)) { const w = {}; new Function('window', fs.readFileSync(hedefDosya, 'utf8'))(w); meta = Object.assign(w.EO2_NPC_ATLAS, { kim: KIM }); }
for (const id of ISTENEN) {
  const res = await p.evaluate(async ({ id, SC }) => {
    const S = window.SOC, view = document.getElementById('view'), W = view.width, H = view.height, GX = 600, GY = 640, N = 8, cyc = 1 / 1.3;
    S.npc(id); if (S.st.set !== id && !window.SOCIAL_SETS[S.st.set]) return null; S.st.bare = true; S.st.bald = false; await new Promise(r => setTimeout(r, 60));
    const list = [];
    for (const dir of ['down', 'up', 'right']) { for (let i = 0; i < N; i++) list.push({ dir, moving: true, t: i * cyc / N, face: 'neutral', key: dir + '_walk_' + i * 2, es: dir + '_walk_' + (i * 2 + 1) });
      list.push({ dir, moving: false, t: 0, face: 'neutral', key: dir + '_idle' }); if (dir !== 'up') list.push({ dir, moving: false, t: 0, face: 'happy', key: dir + '_happy' }); }
    const grab = f => { S.st.face = f.face; S.film(f.dir, f.moving, [f.t]); return view.getContext('2d').getImageData(0, 0, W, H); };
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const f of list) { const d = grab(f).data; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(W, x1 + 8); y1 = Math.min(H, y1 + 8);
    const half = Math.max(GX - x0, x1 - GX); x0 = GX - half; x1 = GX + half;
    const cw = Math.ceil((x1 - x0) * SC), ch = Math.ceil((y1 - y0) * SC), cols = 8, rows = Math.ceil(list.length / cols);
    const atlas = document.createElement('canvas'); atlas.width = cols * cw; atlas.height = rows * ch; const ax = atlas.getContext('2d'); ax.imageSmoothingQuality = 'high';
    const frames = {};
    list.forEach((f, i) => { grab(f); ax.drawImage(view, x0, y0, x1 - x0, y1 - y0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); frames[f.key] = i; if (f.es) frames[f.es] = i; });
    const d = grab(list.find(f => f.key === 'down_idle')).data; let top = H;
    for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { top = y; break; }
    return { url: atlas.toDataURL('image/webp', 0.9), cw, ch, cols, rows, ax: (GX - x0) * SC, ay: (GY - y0) * SC, tall: (GY - top) * SC, frames, w: atlas.width, h: atlas.height };
  }, { id, SC });
  if (!res) { console.log(id + ': çizicide böyle bir NPC yok, atlandı'); continue; }
  const buf = Buffer.from(res.url.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, id + '.webp'), buf); delete res.url; meta.sets[id] = res;
  console.log(id + '.webp', res.w + 'x' + res.h, 'hücre', res.cw + 'x' + res.ch, 'boy', Math.round(res.tall), (buf.length / 1024 | 0) + ' KB');
}
await b.close(); srv.close();
fs.writeFileSync(hedefDosya, '// tools/bake_npc.mjs üretir; elle düzenleme. sets: NPC çizimlerinin kare ölçüleri · kim: oyundaki NPC kimliği → çizim\nwindow.EO2_NPC_ATLAS = ' + JSON.stringify(meta) + ';\n');
if (errors.length) { console.error('sayfa hataları:', errors.slice(0, 5)); process.exit(1); }
