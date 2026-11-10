// EO2 dilimi: başsız Edge ile ekran görüntüsü. Kullanım: node eo2/tools/shot.mjs <çıktı klasörü> [adlar...]
// Her çekim: { ad, w, h, js } — js sayfada koşar (EO2.api ile oyuncuyu taşır, ışığı ya da kamerayı değiştirir).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const out = process.argv[2] || 'eo2_shots', only = process.argv.slice(3), url = process.env.URL || 'http://localhost:3210/';
const at = (x, y, dir = 'up') => `EO2.api.player.x=${x};EO2.api.player.y=${y};EO2.api.player.dir='${dir}';EO2.api.cam.x=${x};EO2.api.cam.y=${y};EO2.api.pet.x=${x}+0.9;EO2.api.pet.y=${y}-0.25;`;
const SHOTS = [
  { ad: 'baslangic', w: 1920, h: 1080, js: at(-1.6, 6.6) },
  { ad: 'cesme', w: 1920, h: 1080, js: at(1.2, 8.6) },
  { ad: 'han', w: 1920, h: 1080, js: at(-9.2, 14.6) },
  { ad: 'pazar', w: 1920, h: 1080, js: at(9.0, 15.2) },
  { ad: 'kapi', w: 1920, h: 1080, js: at(0, 22.5) },
  { ad: 'arena', w: 1920, h: 1080, js: at(-10.5, 3.2) },
  { ad: 'bahce', w: 1920, h: 1080, js: at(11.2, 2.8) },
  { ad: 'aksam', w: 1920, h: 1080, js: at(-1.6, 6.6) + 'EO2.api.setNight(1);EO2.state.night=1;' },
  { ad: 'aksam_han', w: 1920, h: 1080, js: at(-9.2, 14.6) + 'EO2.api.setNight(1);EO2.state.night=1;' },
  { ad: 'yuksek', w: 1920, h: 1080, js: at(-1.6, 6.6) + "EO2.api.setCam('yuksek');Object.assign(EO2.api.cam,{th:16*Math.PI/180,H:5.4,D:8.6,feet:0.69});" },
  { ad: 'panel', w: 1920, h: 1080, js: at(1.2, 8.6, 'down') + "EO2.api.openPanel('envanter');" },
  { ad: 'konusma', w: 1920, h: 1080, q: '?mock=1', js: at(0.3, 11.0, 'down') + "EO2.dialog.open(EO2.api.npcs[0], EO2.api.npcs[0].lines[0]);", wait: 2400 },
  { ad: 'duello', w: 1920, h: 1080, js: 'EO2.battle.start();setTimeout(()=>{for(let i=0;i<70;i++)EO2.frameHooks.forEach(h=>h(0.05));},3200);', wait: 5200 },
  { ad: 'duello_aksam', w: 1920, h: 1080, js: 'EO2.api.setNight(1);EO2.state.night=1;EO2.battle.start();setTimeout(()=>{const B=EO2.battle.state();for(let i=0;i<60;i++)EO2.frameHooks.forEach(h=>h(0.05));B.keys.fire=true;for(let i=0;i<22;i++)EO2.frameHooks.forEach(h=>h(0.05));B.keys.fire=false;for(let i=0;i<30;i++)EO2.frameHooks.forEach(h=>h(0.05));},3200);', wait: 5600 },
  { ad: 'duello_atis', w: 1920, h: 1080, js: 'EO2.battle.start();setTimeout(()=>{const B=EO2.battle.state();for(let i=0;i<60;i++)EO2.frameHooks.forEach(h=>h(0.05));B.keys.fire=true;for(let i=0;i<20;i++)EO2.frameHooks.forEach(h=>h(0.05));B.keys.fire=false;for(let i=0;i<34;i++)EO2.frameHooks.forEach(h=>h(0.05));},3200);', wait: 5600 },
  { ad: 'duello_mobil', w: 844, h: 390, js: 'EO2.battle.start();setTimeout(()=>{for(let i=0;i<70;i++)EO2.frameHooks.forEach(h=>h(0.05));},3200);', wait: 5200, touch: true },
  { ad: 'han_ici', w: 1920, h: 1080, js: "EO2.api.go('han');setTimeout(()=>{" + at(0.4, 4.2) + "},1300);", wait: 3600 },
  { ad: 'han_ocak', w: 1920, h: 1080, js: "EO2.api.go('han');setTimeout(()=>{" + at(2.4, 8.6) + "},1300);", wait: 3600 },
  { ad: 'bahce', w: 1920, h: 1080, js: "EO2.api.go('bahce');setTimeout(()=>{" + at(0, 8.4) + "},1300);", wait: 3600 },
  { ad: 'bahce_kor', w: 1920, h: 1080, js: "EO2.api.go('bahce');setTimeout(()=>{" + at(-3.4, 12.4) + "},1300);", wait: 3600 },
  { ad: 'bahce_aksam', w: 1920, h: 1080, js: "EO2.api.setNight(1);EO2.state.night=1;EO2.api.go('bahce');setTimeout(()=>{" + at(2.6, 11.6) + "},1300);", wait: 3600 },
  { ad: 'yol', w: 1920, h: 1080, js: "EO2.api.go('yol');setTimeout(()=>{" + at(0, 9) + "},1300);", wait: 3600 },
  { ad: 'yol_kopru', w: 1920, h: 1080, js: "EO2.api.go('yol');setTimeout(()=>{" + at(0.4, 22.6) + "},1300);", wait: 3600 },
  { ad: 'yol_kamp', w: 1920, h: 1080, js: "EO2.api.go('yol');setTimeout(()=>{" + at(0, 45.5) + "},1300);", wait: 3600 },
  { ad: 'pazar_ici', w: 1920, h: 1080, js: "EO2.api.go('pazar');setTimeout(()=>{" + at(0.3, 4.6) + "},1300);", wait: 3600 },
  { ad: 'pazar_pano', w: 1920, h: 1080, js: "EO2.api.go('pazar');setTimeout(()=>{" + at(-1.4, 12.6) + "},1300);", wait: 3600 },
  { ad: 'arena_avlu', w: 1920, h: 1080, js: "EO2.api.go('arena');setTimeout(()=>{" + at(0, 5.2) + "},1300);", wait: 3600 },
  { ad: 'arena_kapi', w: 1920, h: 1080, js: "EO2.api.go('arena');setTimeout(()=>{" + at(-0.6, 15.4) + "},1300);", wait: 3600 },
  { ad: 'arena_aksam', w: 1920, h: 1080, js: "EO2.api.setNight(1);EO2.state.night=1;EO2.api.go('arena');setTimeout(()=>{" + at(2.2, 9.2) + "},1300);", wait: 3600 },
  { ad: 'pazar_mobil', w: 844, h: 390, js: "EO2.api.go('pazar');setTimeout(()=>{" + at(0.3, 4.6) + "},1300);", wait: 3600, touch: true },
  { ad: 'han_mobil', w: 844, h: 390, js: "EO2.api.go('han');setTimeout(()=>{" + at(0.4, 4.2) + "},1300);", wait: 3600, touch: true },
  { ad: 'mobil', w: 844, h: 390, js: at(1.2, 8.6), touch: true },
  { ad: 'dikey', w: 390, h: 844, js: at(1.2, 8.6), touch: true },
];
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const s of SHOTS) {
  if (only.length && !only.includes(s.ad)) continue;
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, hasTouch: !!s.touch, isMobile: !!s.touch, deviceScaleFactor: s.touch ? 2 : 1 }), p = await ctx.newPage();
  p.on('pageerror', e => errors.push(s.ad + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(s.ad + ': ' + m.text()); });
  await p.goto(url + (s.q || '')); await p.waitForFunction('window.EO2 && EO2.api', { timeout: 60000 });
  await p.evaluate(js => { EO2.state.intro = 1; (0, eval)(js); }, s.js);
  await p.waitForTimeout(s.wait || 1600);
  await p.screenshot({ path: path.join(out, s.ad + '.png') }); console.log(s.ad);
  await ctx.close();
}
console.log(JSON.stringify({ errors })); await b.close();
