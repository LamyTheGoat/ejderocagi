// Fragman görsellerini hazırlar: oyunun kendi görsellerini (img/) okur, gerekirse küçültüp kırpar, eo2/trailer/assets/ altına webp yazar.
// Kaynak dosyalara dokunmaz. Kullanım: node eo2/trailer/tools/prep.mjs
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..', '..'), out = path.resolve(here, '..', 'assets');
const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
fs.mkdirSync(out, { recursive: true });
// [çıktı adı, kaynak, en (px, 0 = olduğu gibi), kırpma: üstten ve alttan oran]
const LIST = [
  ['pl-harabe', 'img/bg-title.webp', 1920], ['pl-yanardag', 'img/bg-ocak.webp', 1920], ['pl-buzul', 'img/bg-buzul.webp', 1920, 0.04], ['pl-bulut', 'img/bg-bulut.webp', 1920],
  ['pl-orman', 'img/bg-orman.webp', 1920, 0.035], ['pl-obsidiyen', 'img/bg-obsidiyen.webp', 1920], ['pl-gunbatimi', 'img/bg-yuva.webp', 1920], ['pl-kayalik', 'img/bg-kayalik.webp', 1920],
  ['pl-sahmeran', 'img/sahmeran/sahmeran_throne_bg.webp', 1920], ['pl-komutan', 'img/bg-raid.webp', 1920],
  ['sahmeran', 'img/sahmeran/sahmeran_closeup.webp', 0],
  ['yavru-on', 'img/angle/ates-yavru-front.webp', 0], ['ates-yavru', 'img/dr-ates-yavru.webp', 0], ['ates-genc', 'img/dr-ates-genc.webp', 0], ['ates-yetiskin', 'img/dr-ates-yetiskin.webp', 0],
  ...['ates-P1', 'ates-P15', 'ates-P7', 'buz-P16', 'buz-P7', 'firtina-P7', 'toprak-P12', 'toprak-P7', 'golge-P9', 'golge-P7'].map(n => [n, 'img/pose/' + n + '.webp', 0]),
];
const b = await chromium.launch({ channel: 'msedge', headless: true }); const p = await b.newPage();
for (const [name, src, w, crop] of LIST) {
  const data = 'data:image/webp;base64,' + fs.readFileSync(path.join(repo, src)).toString('base64');
  if (!w) { fs.copyFileSync(path.join(repo, src), path.join(out, name + '.webp')); console.log(name, 'kopya'); continue; }
  const b64 = await p.evaluate(async ({ data, w, crop }) => { const im = new Image(); im.src = data; await im.decode(); const k = crop || 0, sh = im.naturalHeight * (1 - 2 * k), c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * sh / im.naturalWidth);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, im.naturalHeight * k, im.naturalWidth, sh, 0, 0, c.width, c.height); return c.toDataURL('image/webp', 0.86).split(',')[1]; }, { data, w, crop });
  fs.writeFileSync(path.join(out, name + '.webp'), Buffer.from(b64, 'base64')); console.log(name, Math.round(b64.length * 0.75 / 1024) + ' KB');
}
await b.close();
