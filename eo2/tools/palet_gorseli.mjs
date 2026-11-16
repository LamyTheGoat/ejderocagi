// EO2 · blok harita paleti: Krita'da açılan palet dosyası (.gpl) ve okunaklı bir görsel (.png) üretir. Renkler tools/arena_derle.mjs'teki RENK ile aynıdır.
// Kullanım: node eo2/tools/palet_gorseli.mjs   (geliştirme sunucusu 3210'da açık olmalı)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url'; import { RENK } from './arena_derle.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core'), hedef = path.join(repo, 'eo2', 'docs');
const SATIR = [['kirilir', 'Kırmızı', 'Görünmez kırılabilir zemin', 'Yalnız resmi OLMAYAN zemin için. Olağan yol: adında "kirilir" geçen katmana zemini çiz.'], ['kirilmaz', 'Koyu gri', 'Görünmez kırılamaz zemin', 'Yalnız resmi OLMAYAN zemin için. Olağan yol: adında "kirilmaz" geçen katmana zemini çiz.'],
  ['oyuncu', 'Mavi', 'Oyuncu doğuş kutusu', 'Tam bir oyuncu boyunda dolu kutu. Arenanın ölçeği bu kutunun YÜKSEKLİĞİNDEN çıkar. En çok 4 kutu.'],
  ['dusman', 'Sarı', 'Düşman kutusu', 'O düşmanın boyunda dolu kutu. Soldan sağa, düşman listesindeki sırayla eşleşir.'], ['boss', 'Macenta', 'Boss kutusu', 'Boss\'un boyunda dolu kutu. Arenada en çok bir tane.'],
  ['kamera', 'Yeşil', 'Kamera alanı', 'İçi BOŞ dikdörtgen (yalnız çerçeve). Çizmezsen kamera yüksekliği 6 oyuncu boyudur.']];
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
fs.writeFileSync(path.join(hedef, 'blok_harita_paleti.gpl'), 'GIMP Palette\nName: Ejder Ocagi Blok Harita\nColumns: 6\n#\n' + SATIR.map(([k, ad, anlam]) => RENK[k].map(v => String(v).padStart(3)).join(' ') + '\t' + anlam + ' (' + ad + ' ' + hex(RENK[k]) + ')').join('\n') + '\n');
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto((process.env.URL || 'http://localhost:3210/') + 'gizlilik.html');
const veri = await p.evaluate(({ SATIR, RENK }) => { const W = 1400, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), hex = q => '#' + q.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(), rgb = q => 'rgb(' + q.join(',') + ')';
  x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, W, H); x.fillStyle = '#1b2140'; x.font = '700 40px "Segoe UI", Arial'; x.fillText('Ejder Ocağı · Blok harita paleti', 50, 70);
  x.font = '400 21px "Segoe UI", Arial'; x.fillStyle = '#3a4160'; x.fillText('İşaret katmanı ("blok"): kutular ve kamera. Zemin ise kendi katmanında resim olarak çizilir: "0 kirilir zemin", "0 kirilmaz zemin".', 50, 104);
  x.fillText('Katman adı numarayla başlar: 0 ve altı oyuncunun arkasında (−2 en arkada), 1 ve üstü oyuncunun önünde çizilir. Hepsi tuval boyunda PNG.', 50, 132);
  SATIR.forEach(([k, ad, anlam, not], i) => { const y = 160 + i * 90; x.fillStyle = rgb(RENK[k]); if (k === 'kamera') { x.lineWidth = 10; x.strokeStyle = rgb(RENK[k]); x.strokeRect(55, y + 5, 110, 62); } else x.fillRect(50, y, 120, 72);
    x.strokeStyle = '#1b2140'; x.lineWidth = 1; x.strokeRect(50, y, 120, 72); x.fillStyle = '#1b2140'; x.font = '700 27px "Segoe UI", Arial'; x.fillText(anlam, 195, y + 30); x.font = '700 22px Consolas, monospace'; x.fillText(hex(RENK[k]), 590, y + 30);
    x.font = '400 20px "Segoe UI", Arial'; x.fillStyle = '#3a4160'; x.fillText(ad + ' · RGB ' + RENK[k].join(', '), 710, y + 30); x.fillText(not, 195, y + 60); });
  // örnek
  const ox = 50, oy = 730, ow = 1300, oh = 220; x.fillStyle = '#dfe9f6'; x.fillRect(ox, oy, ow, oh); x.strokeStyle = '#1b2140'; x.strokeRect(ox, oy, ow, oh);
  x.fillStyle = rgb(RENK.kirilir); x.fillRect(ox, oy + 160, 640, 60); x.fillStyle = rgb(RENK.kirilmaz); x.fillRect(ox + 640, oy + 160, 660, 60); x.fillRect(ox + 1000, oy + 110, 300, 50);
  x.fillStyle = rgb(RENK.oyuncu); x.fillRect(ox + 110, oy + 110, 30, 50); x.fillRect(ox + 170, oy + 110, 30, 50); x.fillStyle = rgb(RENK.dusman); x.fillRect(ox + 560, oy + 90, 60, 70); x.fillRect(ox + 800, oy + 20, 50, 60);
  x.fillStyle = rgb(RENK.boss); x.fillRect(ox + 1090, oy + 10, 130, 100); x.strokeStyle = rgb(RENK.kamera); x.lineWidth = 6; x.strokeRect(ox + 40, oy + 12, 520, 196);
  x.fillStyle = '#1b2140'; x.font = '700 20px "Segoe UI", Arial'; x.fillText('Örnek', ox + 8, oy - 12); x.font = '400 17px "Segoe UI", Arial'; x.fillStyle = '#3a4160';
  x.fillText('Kutuların alt kenarı = ayağın bastığı çizgi · yatay ortası = konum · havadaki sarı kutu = uçan düşman · kenar yumuşatma KAPALI, yarı saydam piksel yok · 8 bit PNG', ox + 70, oy - 12);
  return c.toDataURL('image/png'); }, { SATIR, RENK });
await b.close(); fs.writeFileSync(path.join(hedef, 'blok_harita_paleti.png'), Buffer.from(veri.split(',')[1], 'base64')); console.log('yazıldı: eo2/docs/blok_harita_paleti.png, .gpl');
