// Ejder Ocağı 2.0 · yuvarlak simge sayfasını tek tek madalyonlara ayırır (2026-11-11)
// Kullanım: node eo2/tools/madalyon.mjs <sayfa.webp|png> <çıktı klasörü> <sütun>x<satır> ad1,ad2,... [boy=256]
// Sayfa: düz renkli zemin üstünde, ızgara hâlinde yuvarlak rozetler (koyu disk + altın çerçeve). Her hücrede rozetin dairesi
// bulunur (koyu disk ve altın çerçeve piksellerinin kutusu), daire dışı saydam bırakılır: zemin rengi ve gölge hiç taşınmaz.
// ALTIN=1 ortam değişkeni: sayfanın zemini de koyuysa daire yalnız altın çerçeveden bulunur.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const [sayfa, cikti, izgara, adlarS, boyS] = process.argv.slice(2);
if (!sayfa || !cikti || !izgara || !adlarS) { console.error('Kullanım: node eo2/tools/madalyon.mjs <sayfa> <klasör> <sütun>x<satır> ad1,ad2,... [boy]'); process.exit(1); }
const [SUT, SAT] = izgara.split('x').map(Number), adlar = adlarS.split(','), BOY = +(boyS || 256);
fs.mkdirSync(cikti, { recursive: true });
const tur = sayfa.endsWith('.png') ? 'png' : 'webp', veri = 'data:image/' + tur + ';base64,' + fs.readFileSync(sayfa).toString('base64');
const br = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch()), pg = await br.newPage();
const sonuc = await pg.evaluate(async ({ veri, SUT, SAT, BOY, ALTIN }) => {
  const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = veri; }), W = im.naturalWidth, H = im.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, W, H).data, out = [];
  for (let s = 0; s < SAT; s++) for (let k = 0; k < SUT; k++) { const x0 = Math.round(k * W / SUT), x1 = Math.round((k + 1) * W / SUT), y0 = Math.round(s * H / SAT), y1 = Math.round((s + 1) * H / SAT); let a = x1, b = y1, e = x0, f = y0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 4, r = d[i], g = d[i + 1], bl = d[i + 2];
      if ((!ALTIN && r < 45 && g < 45 && bl < 95) || (r > 150 && g > 95 && bl < 140 && r - bl > 60)) { if (xx < a) a = xx; if (xx > e) e = xx; if (yy < b) b = yy; if (yy > f) f = yy; } }
    const cx = (a + e) / 2, cy = (b + f) / 2, rad = Math.min(e - a, f - b) / 2 + 1;   // gölge alta taşar: dar olan ölçü dairenin kendisidir
    const o = document.createElement('canvas'); o.width = o.height = BOY; const ox = o.getContext('2d'), R = BOY / 2 - 1; ox.imageSmoothingQuality = 'high';
    ox.beginPath(); ox.arc(BOY / 2, BOY / 2, R, 0, Math.PI * 2); ox.clip(); const olcek = R / rad; ox.drawImage(im, cx - BOY / 2 / olcek, cy - BOY / 2 / olcek, BOY / olcek, BOY / olcek, 0, 0, BOY, BOY);
    out.push({ veri: o.toDataURL('image/webp', 0.94), cx: Math.round(cx), cy: Math.round(cy), rad: Math.round(rad) }); }
  return out;
}, { veri, SUT, SAT, BOY, ALTIN: process.env.ALTIN === '1' });
sonuc.forEach((q, i) => { if (!adlar[i] || adlar[i] === '-') return; fs.writeFileSync(path.join(cikti, adlar[i] + '.webp'), Buffer.from(q.veri.split(',')[1], 'base64')); console.log(adlar[i], q.cx, q.cy, q.rad); });
await br.close();
