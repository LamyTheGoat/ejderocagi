// Kesilmiş çizimin kenarında kalan zemin renkli haleyi temizler (ışıklı fener, parlayan pencere çevresi).
// Kullanım: node tools/hale.mjs <kesilmiş.webp> <r,g,b zemin rengi> [eşik=46]
// Yöntem: saydam bölgeden başlayıp içeri doğru yürür; rengi "zemin ↔ sıcak ışık" doğrusuna yakın olan pikseller hale sayılır.
// Zemine yakın olan tamamen silinir, ışığa yakın olan sıcak renge çevrilip saydamlaştırılır (gerçek sahnenin üstünde yumuşak parıltı olur).
// Zemin rengini anahtar.mjs çıktısındaki "zemin rgb" satırı verir.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const [dosya, zemin, esik] = process.argv.slice(2); if (!dosya || !zemin) { console.log('kullanım: hale.mjs <kesilmiş.webp> <r,g,b> [eşik]'); process.exit(1); }
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
const veri = 'data:image/webp;base64,' + fs.readFileSync(dosya).toString('base64');
const out = await p.evaluate(async ({ veri, zemin, esik }) => {
  const im = new Image(); im.src = veri; await im.decode(); const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const id = x.getImageData(0, 0, W, H), d = id.data, B = zemin.split(',').map(Number), G = [255, 214, 150], E = +esik || 46, N = W * H;
  const L = [G[0] - B[0], G[1] - B[1], G[2] - B[2]], LL = L[0] * L[0] + L[1] * L[1] + L[2] * L[2];
  /* t: zeminden ışığa 0..1; uz: doğruya uzaklık. Koyu zemin tonlarını da (gölgeli köşe) yakalamak için zemin rengi parlaklığa göre ölçeklenir. */
  const olc = i => { const r = d[i * 4], g = d[i * 4 + 1], bb = d[i * 4 + 2]; let en = 1e9, et = 0; for (const k of [1, 0.75, 0.55]) { const b0 = B[0] * k, b1 = B[1] * k, b2 = B[2] * k, l0 = G[0] - b0, l1 = G[1] - b1, l2 = G[2] - b2, ll = l0 * l0 + l1 * l1 + l2 * l2; let t = ((r - b0) * l0 + (g - b1) * l1 + (bb - b2) * l2) / ll; t = Math.max(0, Math.min(1, t)); const u = Math.hypot(r - b0 - l0 * t, g - b1 - l1 * t, bb - b2 - l2 * t); if (u < en) { en = u; et = t; } } return [et, en]; };
  const q = new Int32Array(N), gor = new Uint8Array(N); let qh = 0, qt = 0, sil = 0;
  for (let i = 0; i < N; i++) if (d[i * 4 + 3] < 8) { gor[i] = 1; q[qt++] = i; }
  while (qh < qt) { const i = q[qh++], px = i % W; for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= N || gor[j]) continue; if (Math.abs((j % W) - px) > 1) continue; const [t, u] = olc(j); if (u > E || t > 0.86) continue; gor[j] = 1; q[qt++] = j; sil++;
    const a = t < 0.22 ? 0 : Math.pow((t - 0.22) / 0.64, 1.6) * 0.75; d[j * 4] = G[0]; d[j * 4 + 1] = G[1]; d[j * 4 + 2] = G[2]; d[j * 4 + 3] = Math.round(Math.min(d[j * 4 + 3], a * 255)); } }
  x.putImageData(id, 0, 0); return { url: c.toDataURL('image/webp', 0.92), sil, N };
}, { veri, zemin, esik });
fs.writeFileSync(dosya, Buffer.from(out.url.split(',')[1], 'base64')); await b.close(); console.log('ok', path.basename(dosya), 'hale pikseli %' + (out.sil / out.N * 100).toFixed(1));
