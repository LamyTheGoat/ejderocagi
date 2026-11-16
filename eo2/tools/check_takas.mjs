// EO2 · takas denetimi: iki ayrı tarayıcı. A meydanda B'nin kartından takas teklif eder; B masaya oturur; iki ekranda takas
// masası açılır; A arenada altın kazanmışsa tepsiye altın koyar; ikisi de onaylar; takas tamamlanır ve masalar kapanır.
// Kazanılmış mal yoksa (yeni hesap) boş takasla akışın kendisi sınanır. Kullanım: node eo2/tools/check_takas.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.takas && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 10000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Takas teklif et")').click();
  log.davet = await B.waitForSelector('.pen:has-text("Takas teklifi")', { timeout: 12000 }).then(() => true, () => false);
  log.davetMetni = log.davet ? await B.locator('.pen').first().textContent() : '';
  if (log.davet) await B.locator('.pen .gbtn:has-text("Masaya otur")').click();
  log.masa = await bekle(A, 'EO2.game.ekran() === "takas" && document.querySelector(".tk-tepsi.ben")') && await bekle(B, 'EO2.game.ekran() === "takas" && document.querySelector(".tk-tepsi.ben")');
  log.adlar = [await A.locator('.tk-tepsi.o h3').textContent(), await B.locator('.tk-tepsi.o h3').textContent()];
  log.kazan = await A.evaluate(() => (EO2.takas.durum().eko.funds || {}).earned || 0);
  if (log.kazan > 0) { await A.locator('#tkAltin').fill(String(Math.min(5, log.kazan))); await A.locator('.tk-altin button').click();
    log.altinGorundu = await bekle(B, '/altın/.test(document.querySelector(".tk-tepsi.o").textContent)'); }
  await A.locator('[data-tk="onay"]').click();
  log.onayGorundu = await bekle(B, 'document.querySelector(".tk-tepsi.o.onayli")');
  await B.locator('[data-tk="onay"]').click();
  log.bitti = await bekle(A, 'EO2.takas.durum().trade && EO2.takas.durum().trade.status === "completed" && EO2.game.ekran() !== "takas"') && await bekle(B, 'EO2.takas.durum().trade && EO2.takas.durum().trade.status === "completed" && EO2.game.ekran() !== "takas"');
  // vazgeçme: ikinci takas açılır, B masadan kalkar
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Takas teklif et")').click();
  if (await B.waitForSelector('.pen:has-text("Takas teklifi")', { timeout: 12000 }).then(() => true, () => false)) await B.locator('.pen .gbtn:has-text("Masaya otur")').click();
  await bekle(B, 'EO2.game.ekran() === "takas" && document.querySelector("[data-tk=vazgec]")');
  await B.locator('[data-tk="vazgec"]').click(); await B.locator('.pen .gbtn:has-text("Vazgeç")').click();
  log.vazgecti = await bekle(A, 'EO2.takas.durum().trade.status === "cancelled" && EO2.game.ekran() !== "takas"');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.davet && /Aylin/.test(log.davetMetni) && log.masa && /Bora/.test(log.adlar[0]) && /Aylin/.test(log.adlar[1]) && log.onayGorundu && log.bitti && log.vazgecti && (log.kazan > 0 ? log.altinGorundu : true);
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
