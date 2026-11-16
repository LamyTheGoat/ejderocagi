// Paylaşım görseli (og:image): giriş ekranının 1200×630 görüntüsü, düğmeler ve arayüz gizli; yalnız meydan ve logo.
// Kullanım: node eo2/tools/paylasim.mjs   (geliştirme sunucusu açık olmalı: node eo2/tools/serve.mjs 3210)
// Çıktı: eo2/assets/paylasim.jpg
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 });
await p.waitForTimeout(6000);   // meydan çizimleri insin
await p.addStyleTag({ content: '#app > *:not(#world):not(#isikSuzgeci):not(.giris), .giris .dugmeler, .giris .not, .giris .kunye, .giris p { visibility: hidden !important; } .giris, .giris::before, .giris::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: radial-gradient(60% 70% at 50% 46%, rgba(10,16,40,.5), rgba(10,16,40,.08)) !important; } .giris-ic { background: none !important; box-shadow: none !important; border: 0 !important; backdrop-filter: none !important; } .giris-ic::before, .giris-ic::after { display: none !important; } .giris-ic img { width: min(50vw, 600px) !important; height: auto !important; filter: drop-shadow(0 10px 28px rgba(5,8,30,.75)); }' });
await p.waitForTimeout(600);
await p.screenshot({ path: path.join(repo, 'eo2', 'assets', 'paylasim.jpg'), type: 'jpeg', quality: 86 });
await b.close(); console.log('eo2/assets/paylasim.jpg yazıldı');
