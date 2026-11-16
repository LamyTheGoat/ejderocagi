// EO2 · Şahmeran V3.1 savaş kareleri (kullanıcı onayı 2026-11-16): ArtLab'den gelen beş klibin paketli sayfaları
// (eo2/docs/bolumler/kaynak/zumrut-saray/sahmeran_v3_1/kareler) tek bir eşit ızgaralı sayfaya dizilir; savaş motoru (js/battle.js D.sayfa) bunu okur.
// Çizim değişmez: yalnız küçültülür, kareler seyreltilir ve ortak ayak noktasına hizalanır. Bekleme klibi kaynakta daha küçük ölçekte
// (352 piksel; ötekiler 486): ayak noktasından tepeye olan uzaklık oranıyla (458 / 330) eşitlenir.
// Çıktı: eo2/assets/sahmeran_v3.webp, eo2/assets/sahmeran_v3_yuz.webp ve ölçüler (konsola; js/topcu_veri.js içindeki SAYFA ile aynı olmalı).
// Kullanım: node eo2/tools/sahmeran_v3.mjs   (geliştirme sunucusu 3210'da açık olmalı)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const kaynak = path.join(repo, 'eo2', 'docs', 'bolumler', 'kaynak', 'zumrut-saray', 'sahmeran_v3_1', 'kareler'), on = 'EO_Sahmeran_Battle_V3_1_';
const KLIP = [['idle', 4], ['bow_draw', 2], ['bow_release', 1], ['bow_recover', 2], ['mar_react', 2]];   // [ad, kaçta bir kare alınır]
const OLCEK = 0.7, SOL = 282, SAG = 382, UST = 460, ALT = 24, SUTUN = 8;   // kaynak (486'lık) ölçüde ayak noktasının çevresi
const klipler = KLIP.map(([ad, adim]) => { const j = JSON.parse(fs.readFileSync(path.join(kaynak, on + ad + '.json'), 'utf8')), adlar = Object.keys(j.frames).sort(), k = ad === 'idle' ? 458 / 330 : 1;
  return { ad, k, kareler: adlar.filter((_, i) => i % adim === 0).map(a => { const q = j.frames[a]; return { f: q.frame, s: q.spriteSourceSize, px: q.pivot.x * q.sourceSize.w, py: q.pivot.y * q.sourceSize.h }; }) }; });
const url = process.env.URL || 'http://localhost:3210/', b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
await p.route('**/__sahmeran/*', r => r.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(kaynak, path.basename(new URL(r.request().url()).pathname))) }));
await p.goto(url + 'gizlilik.html');
const veri = await p.evaluate(async ({ klipler, on, OLCEK, SOL, SAG, UST, ALT, SUTUN }) => {
  const cw = Math.ceil((SOL + SAG) * OLCEK), ch = Math.ceil((UST + ALT) * OLCEK), n = klipler.reduce((t, k) => t + k.kareler.length, 0), c = document.createElement('canvas'); c.width = cw * SUTUN; c.height = ch * Math.ceil(n / SUTUN);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; let i = 0; const dizin = {}; let yuz = null;
  for (const K of klipler) { const im = new Image(); im.src = '/__sahmeran/' + on + K.ad + '.png'; await im.decode(); dizin[K.ad] = [i, K.kareler.length];
    for (const q of K.kareler) { const s = K.k * OLCEK, ox = (i % SUTUN) * cw + SOL * OLCEK, oy = Math.floor(i / SUTUN) * ch + UST * OLCEK;
      x.drawImage(im, q.f.x, q.f.y, q.f.w, q.f.h, ox + (q.s.x - q.px) * s, oy + (q.s.y - q.py) * s, q.f.w * s, q.f.h * s);
      if (K.ad === 'bow_draw' && !yuz) { const y = document.createElement('canvas'); y.width = y.height = 224; const g = y.getContext('2d'); g.imageSmoothingQuality = 'high'; const r = 150;   // yüz: ilk germe karesinden
        g.drawImage(im, q.f.x + 232 - q.s.x - r / 2, q.f.y + 112 - q.s.y - r / 2, r, r, 0, 0, 224, 224); yuz = y.toDataURL('image/webp', 0.9); }
      i++; } }
  return { cw, ch, n, en: c.width, boy: c.height, px: Math.round(SOL * OLCEK), py: Math.round(UST * OLCEK), dizin, d: c.toDataURL('image/webp', 0.9), yuz };
}, { klipler, on, OLCEK, SOL, SAG, UST, ALT, SUTUN });
await b.close();
const h1 = path.join(repo, 'eo2', 'assets', 'sahmeran_v3.webp'), h2 = path.join(repo, 'eo2', 'assets', 'sahmeran_v3_yuz.webp');
fs.writeFileSync(h1, Buffer.from(veri.d.split(',')[1], 'base64')); fs.writeFileSync(h2, Buffer.from(veri.yuz.split(',')[1], 'base64'));
console.log(JSON.stringify({ cw: veri.cw, ch: veri.ch, sutun: SUTUN, px: veri.px, py: veri.py, kare: veri.n, sayfa: [veri.en, veri.boy], dizin: veri.dizin, bayt: [fs.statSync(h1).size, fs.statSync(h2).size] }));
