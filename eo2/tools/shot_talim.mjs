// EO2 · görüntü aracı: Er Meydanı (talim) savaş sahnesinin ekran görüntüsünü alır. Zemin ve arka plan uyumunu gözle denetlemek içindir.
// Kullanım: node eo2/tools/shot_talim.mjs <çıktı.png>   (VP=1920x1080 ile boyut)
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const cikti = process.argv[2] || 'talim.png', [w, h] = (process.env.VP || '1280x720').split('x').map(Number);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => console.log('hata:', e.message));
await p.goto(process.env.URL || 'http://localhost:3210/'); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.topcu && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(700);
await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350); await p.locator('.pen input').first().fill('Deneme'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
await p.waitForFunction('EO2.game.live', null, { timeout: 30000 }); await p.evaluate(() => { EO2.topcu.baslat('talim'); });
await p.waitForFunction('EO2.battle.active() && EO2.battle.state().faz === "nisan"', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
await p.screenshot({ path: cikti }); if (process.env.ATIS) { await p.keyboard.down('Space'); await p.waitForTimeout(900); await p.keyboard.up('Space'); await p.waitForTimeout(4500); await p.screenshot({ path: cikti.replace(/\.png$/, '_atis.png') }); }
await b.close(); console.log('yazıldı:', cikti);
