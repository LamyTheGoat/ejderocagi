// EO2 · Zümrüt Saray yer yılanlarının canlandırma sayfaları (ArtLab, Rigby2D çıktısı; kullanıcı pilotu görüp "devam et" dedi, 2026-11-17).
// Kaynak: eo2/docs/bolumler/kaynak/zumrut-saray/dusman_yilan_anim/snake_<tur>/ (klip başına paketli atlas + JSON).
// Her yılan için beş klip (bekleme, ilerleme, saldırı, vuruluş, ölüm) tek bir eşit ızgaralı sayfaya dizilir; kareler seyreltilir,
// ortak ayak noktasına hizalanır. Savaş motoru (js/battle.js D.sayfa) bu sayfayı okur. Çizim değişmez.
// Çıktı: eo2/assets/zumrut/yilan_<ad>_anim.webp ve eo2/js/zumrut_yilan_veri.js (hücre ölçüleri, klip dizini, ağız noktası).
// Kullanım: node eo2/tools/zumrut_yilan.mjs   (geliştirme sunucusu 3210'da açık olmalı)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const kaynak = path.join(repo, 'eo2', 'docs', 'bolumler', 'kaynak', 'zumrut-saray', 'dusman_yilan_anim');
const YILAN = [['vurucu', 'snake_striker', [299, 151]], ['agir', 'snake_heavy', [375, 199]], ['kucuk', 'snake_basic', [207, 128]]];   // [oyundaki ad, kaynak klasör, ağzın ayak noktasına göre yeri (sola, yukarı)]
const KLIP = [['idle', 4], ['move', 3], ['attack', 2], ['hit', 2], ['death', 2]], SUTUN = 8;   // [klip, kaçta bir kare alınır]
const veri = {};
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
await p.route('**/__yilan/**', r => r.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(kaynak, decodeURIComponent(new URL(r.request().url()).pathname.split('/__yilan/')[1]))) }));
await p.goto((process.env.URL || 'http://localhost:3210/') + 'gizlilik.html');
for (const [ad, klasor, agiz] of YILAN) {
  const klipler = KLIP.map(([k, adim]) => { const j = JSON.parse(fs.readFileSync(path.join(kaynak, klasor, klasor + '_' + k + '.json'), 'utf8')), adlar = Object.keys(j.frames).sort();
    return { k, dosya: klasor + '/' + klasor + '_' + k + '.png', kareler: adlar.filter((_, i) => i % adim === 0 || i === adlar.length - 1 && k === 'death').map(a => { const q = j.frames[a]; return { f: q.frame, s: q.spriteSourceSize, px: q.pivot.x * q.sourceSize.w, py: q.pivot.y * q.sourceSize.h, w: q.sourceSize.w, h: q.sourceSize.h }; }) }; });
  const hepsi = klipler.flatMap(K => K.kareler), SOL = Math.ceil(Math.max(...hepsi.map(q => q.px))), SAG = Math.ceil(Math.max(...hepsi.map(q => q.w - q.px))), UST = Math.ceil(Math.max(...hepsi.map(q => q.py))), ALT = Math.ceil(Math.max(...hepsi.map(q => q.h - q.py)));
  const r = await p.evaluate(async ({ klipler, SOL, SAG, UST, ALT, SUTUN }) => { const cw = SOL + SAG, ch = UST + ALT, n = klipler.reduce((t, K) => t + K.kareler.length, 0), c = document.createElement('canvas'); c.width = cw * SUTUN; c.height = ch * Math.ceil(n / SUTUN); const x = c.getContext('2d'); let i = 0; const dizin = {};
    for (const K of klipler) { const im = new Image(); im.src = '/__yilan/' + K.dosya; await im.decode(); dizin[K.k] = [i, K.kareler.length];
      for (const q of K.kareler) { const ox = (i % SUTUN) * cw + SOL, oy = Math.floor(i / SUTUN) * ch + UST; x.drawImage(im, q.f.x, q.f.y, q.f.w, q.f.h, ox + q.s.x - q.px, oy + q.s.y - q.py, q.f.w, q.f.h); i++; } }
    return { cw, ch, n, dizin, d: c.toDataURL('image/webp', 0.9) }; }, { klipler, SOL, SAG, UST, ALT, SUTUN });
  const hedef = path.join(repo, 'eo2', 'assets', 'zumrut', 'yilan_' + ad + '_anim.webp'); fs.writeFileSync(hedef, Buffer.from(r.d.split(',')[1], 'base64'));
  veri[ad] = { src: 'assets/zumrut/yilan_' + ad + '_anim.webp', cw: r.cw, ch: r.ch, sutun: SUTUN, px: SOL, py: UST, dizin: r.dizin, agiz };
  console.log(ad + ': ' + r.n + ' kare · hücre ' + r.cw + '×' + r.ch + ' · ' + fs.statSync(hedef).size + ' bayt');
}
await b.close();
fs.writeFileSync(path.join(repo, 'eo2', 'js', 'zumrut_yilan_veri.js'), '/* ÜRETİLMİŞ DOSYA: elle değiştirme. Üreten: node eo2/tools/zumrut_yilan.mjs · Zümrüt Saray yer yılanlarının canlandırma sayfası ölçüleri\n   dizin: klip → [ilk kare, kare sayısı] · px, py: hücrede ayak noktası · agiz: ağzın ayak noktasına göre yeri (sola, yukarı; kaynak piksel) */\nwindow.EO2_YILAN = ' + JSON.stringify(veri) + ';\n');
