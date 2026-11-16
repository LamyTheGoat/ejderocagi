// EO2 · sefer kampının arka planı: Sırça Saray kapı çiziminin (img/sahmeran/sahmeran_gate_bg.webp) üst bölümü kesilir ve
// bölüm motorunun klasörüne (eo2/assets/dunya/an/zs-magara.webp) yazılır. Çizim değişmez; yalnız kırpılır.
// Kullanım: node eo2/tools/kamp_arka.mjs   (geliştirme sunucusu 3210'da açık olmalı)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
await p.goto(url + 'gizlilik.html');
const veri = await p.evaluate(async () => { const im = new Image(); im.src = '/oyun/img/sahmeran/sahmeran_gate_bg.webp'; await im.decode();
  const W = im.naturalWidth, H = Math.round(im.naturalHeight * 0.74), c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * H / W); const x = c.getContext('2d');
  x.drawImage(im, 0, 0, W, H, 0, 0, c.width, c.height);
  // alt kenar zemine karışsın: son %14 koyu taşa doğru kararır
  const g = x.createLinearGradient(0, c.height * 0.86, 0, c.height); g.addColorStop(0, 'rgba(20,16,14,0)'); g.addColorStop(1, 'rgba(20,16,14,.92)'); x.fillStyle = g; x.fillRect(0, c.height * 0.86, c.width, c.height * 0.14);
  return { en: c.width, boy: c.height, d: c.toDataURL('image/webp', 0.86) }; });
await b.close();
const hedef = path.join(repo, 'eo2', 'assets', 'dunya', 'an', 'zs-magara.webp'); fs.writeFileSync(hedef, Buffer.from(veri.d.split(',')[1], 'base64'));
console.log(JSON.stringify({ hedef, en: veri.en, boy: veri.boy, bayt: fs.statSync(hedef).size }));
