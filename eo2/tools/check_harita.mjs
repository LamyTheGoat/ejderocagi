// EO2 · hızlı seyahat denetimi: haritadaki her yer doğru sahneye götürür.
// Han, Çarşı ve Kuzey Yolu'nun yeni çizilmiş bölümleri (hanici, carsi, kuzeyyolu) varken harita eski sahnelere (han, pazar, yol) götürmemelidir;
// meydandaki kapılar hangi bölüme açılıyorsa harita da oraya götürür. Varılan yerde harita o yeri "buradasın" diye işaretler.
// Kullanım: node eo2/tools/check_harita.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', hata = [], log = {};
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.harita && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(700);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350); await p.locator('.pen input').first().fill('Aylin'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.game.live', null, { timeout: 30000 }); await p.waitForTimeout(2000);
  const BEKLENEN = { han: 'hanici', pazar: 'carsi', yol: 'kuzeyyolu', arena: 'arena', bahce: 'bahce' };
  log.kapilar = await p.evaluate(() => { const D = EO2.sceneDefs || {}; return ['hanici', 'carsi', 'kuzeyyolu'].filter(k => D[k]); });
  for (const [yer, sahne] of Object.entries(BEKLENEN)) { if (!(await p.evaluate(y => EO2.harita.yerler().some(q => q.id === y), yer))) { log[yer] = 'haritada yok'; continue; }
    await p.evaluate(() => { EO2.harita.ac(); }); await p.waitForTimeout(500); await p.locator('[data-git="' + yer + '"]').click();
    const vardi = await p.waitForFunction(s => EO2.api.scene() === s && !EO2.game.ekran(), sahne, { timeout: 25000 }).then(() => true, () => false); await p.waitForTimeout(1200);
    const isaret = await p.evaluate(y => { EO2.harita.ac(); const el = document.querySelector('[data-git="' + y + '"]'), ok = !!el && el.classList.contains('burada'); EO2.game.close(); return ok; }, yer); await p.waitForTimeout(300);
    log[yer] = vardi ? (isaret ? sahne : sahne + ' (işaret yok)') : 'varamadı: ' + await p.evaluate(() => EO2.api.scene()); }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.kapilar && log.kapilar.length === 3 && log.han === 'hanici' && log.pazar === 'carsi' && log.yol === 'kuzeyyolu' && log.arena === 'arena' && log.bahce === 'bahce';
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 8) }, null, 1)); process.exit(ok ? 0 : 1);
