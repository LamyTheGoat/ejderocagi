// EO2 · saydam kenar kırpma: kesilmiş çizimin çevresindeki boş payı atar; çizim dosyanın alt kenarına oturur.
// Kullanım: node eo2/tools/kirp.mjs <dosya.webp> [dosya...]   (dosyalar yerinde güncellenir)
// Neden: 2.5D sahnede çizim yere dik bir levhadır; altında boş pay kalırsa nesne havada durur.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const files = process.argv.slice(2); if (!files.length) { console.log('kullanım: kirp.mjs <dosya.webp> [dosya...]'); process.exit(1); }
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
for (const f of files) {
  const ext = path.extname(f).slice(1).toLowerCase(), data = 'data:image/' + ext + ';base64,' + fs.readFileSync(f).toString('base64');
  const res = await p.evaluate(async data => {
    const im = new Image(); im.src = data; await im.decode(); const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) if (d[(y * W + X) * 4 + 3] > 24) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null; x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 1); const bw = x1 - x0 + 1, bh = y1 - y0 + 1; if (bw > W - 6 && bh > H - 6) return { same: 1, bw: W, bh: H };
    const o = document.createElement('canvas'); o.width = bw; o.height = bh; o.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh); return { url: o.toDataURL('image/webp', 0.95), bw, bh };
  }, data);
  if (!res) { console.log('boş', f); continue; } if (res.same) { console.log('aynı', path.basename(f), res.bw + 'x' + res.bh); continue; }
  fs.writeFileSync(f, Buffer.from(res.url.split(',')[1], 'base64')); console.log('ok', path.basename(f), res.bw + 'x' + res.bh);
}
await b.close();
