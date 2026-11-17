// EO2 · mezar taşı yer tutucusu: savaş motorundaki kodla çizilen mezar taşının aynısını eo2/assets/topcu/mezar.webp olarak yazar.
// Asıl çizim Midjourney ile üretildi ve bu dosyanın yerine kondu (2026-11-18); bu araç yalnız çizim kaybolursa yer tutucuyu yeniden yazmak içindir: ÇALIŞTIRIRSAN ASIL ÇİZİMİN ÜZERİNE YAZAR.
// Kullanım: node eo2/tools/mezar_ciz.mjs
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
const url = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 320; const x = c.getContext('2d'), sc = 190, w = 0.95 * sc, h = 1.25 * sc; x.translate(150, 300); x.lineJoin = 'round'; x.lineWidth = 0.07 * sc; x.strokeStyle = '#1b2140';
  x.fillStyle = '#8f98b4'; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-w / 2, -h + w / 2); x.arc(0, -h + w / 2, w / 2, Math.PI, 0); x.lineTo(w / 2, 0); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#b9c1d8'; x.beginPath(); x.moveTo(-w / 2 + 0.1 * sc, -0.06 * sc); x.lineTo(-w / 2 + 0.1 * sc, -h + w / 2); x.arc(0, -h + w / 2, w / 2 - 0.1 * sc, Math.PI, Math.PI * 1.55); x.lineTo(-0.02 * sc, -0.06 * sc); x.closePath(); x.fill();
  x.fillStyle = '#5a6388'; x.beginPath(); x.arc(0, -h * 0.62, 0.17 * sc, 0, 6.3); x.fill(); x.fillRect(-0.2 * sc, -h * 0.4, 0.4 * sc, 0.05 * sc); x.fillRect(-0.14 * sc, -h * 0.29, 0.28 * sc, 0.05 * sc);
  x.fillStyle = '#4fae5e'; x.lineWidth = 0.04 * sc; for (const g of [-0.52, -0.36, 0.34, 0.5]) { x.beginPath(); x.moveTo((g - 0.09) * sc, 0.02 * sc); x.lineTo(g * sc, -0.24 * sc); x.lineTo((g + 0.09) * sc, 0.02 * sc); x.closePath(); x.fill(); x.stroke(); }
  return c.toDataURL('image/webp', 0.95); });
const hedef = path.join(repo, 'eo2', 'assets', 'topcu'); fs.mkdirSync(hedef, { recursive: true }); fs.writeFileSync(path.join(hedef, 'mezar.webp'), Buffer.from(url.split(',')[1], 'base64')); await b.close(); console.log('mezar.webp yazıldı');
