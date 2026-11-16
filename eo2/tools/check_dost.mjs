// EO2 · dostlar denetimi: iki ayrı tarayıcı. A meydanda B'nin kartından dost ekler; B Dostlar ekranında kabul eder; iki listede de
// karşı taraf çevrimiçi görünür; A fısıldar (süzgeçten geçer), B alır ve yanıtlar; A dostluktan çıkarınca iki liste de boşalır.
// Kullanım: node eo2/tools/check_dost.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.dostlar && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 12000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  await bekle(A, 'EO2.dostlar.durum().veri && EO2.dostlar.durum().veri.ad === "Aylin"'); await bekle(B, 'EO2.dostlar.durum().veri && EO2.dostlar.durum().veri.ad === "Bora"');
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Dost ekle")').click();
  log.istekGeldi = await bekle(B, 'EO2.dostlar.durum().veri && EO2.dostlar.durum().veri.gelen.length === 1');
  await B.evaluate(() => EO2.game.open('dostlar')); await B.waitForTimeout(700);
  log.istekAdi = await B.locator('.ds-ist b').first().textContent().catch(() => '');
  await B.locator('[data-d="kabul"]').first().click();
  log.dostB = await bekle(B, 'EO2.dostlar.durum().veri.dostlar.length === 1 && EO2.dostlar.durum().veri.dostlar[0].cevrimici');
  log.dostA = await bekle(A, 'EO2.dostlar.durum().veri.dostlar.length === 1 && EO2.dostlar.durum().veri.dostlar[0].ad === "Bora" && EO2.dostlar.durum().veri.dostlar[0].cevrimici');
  // fısıltı: A → B (süzgeç), B → A
  await A.evaluate(() => { EO2.game.open('dostlar'); }); await A.waitForTimeout(700); await A.locator('[data-d="fis"]').first().click(); await A.waitForTimeout(400);
  await A.locator('.ds-fis-gir').fill('gizli selam orospu'); await A.locator('.ds-fis-form button').click();
  log.fisB = await bekle(B, '[...EO2.dostlar.durum().yazisma.values()].some(L => L.some(z => z.kim === "o" && /^gizli selam •+$/.test(z.x)))');
  log.fisBen = await bekle(A, '/gizli selam •+/.test((document.querySelector(".ds-fis-akis") || {}).textContent || "")');
  await B.locator('[data-d="fis"]').first().click(); await B.waitForTimeout(400); await B.locator('.ds-fis-gir').fill('aldım'); await B.locator('.ds-fis-form button').click();
  log.fisA = await bekle(A, '/aldım/.test((document.querySelector(".ds-fis-akis") || {}).textContent || "")');
  // dostluktan çıkarma
  await A.locator('.pen .gbtn:has-text("Kapat")').click(); await A.waitForTimeout(400);
  await A.locator('[data-d="sil"]').first().click(); await A.locator('.pen .gbtn:has-text("Çıkar")').click();
  log.cikti = await bekle(A, 'EO2.dostlar.durum().veri.dostlar.length === 0') && await bekle(B, 'EO2.dostlar.durum().veri.dostlar.length === 0');
  // dost koduyla ekleme: A, B'nin kodunu (başında @ olmadan) Dostlar ekranına yazar; B'ye istek düşer
  const kodB = await B.evaluate(() => EO2.ag.kimlik().handle); log.kodGorunur = await B.evaluate(k => (document.querySelector('.ds-kodum b') || {}).textContent === k, kodB);
  await A.locator('#dsKod').fill(kodB.slice(1)); await A.locator('.ds-ara button').click();
  log.kodlaIstek = await bekle(B, 'EO2.dostlar.durum().veri.gelen.length === 1');
  await A.locator('#dsKod').fill('boyle_biri_yok_123'); await A.locator('.ds-ara button').click();
  log.kodYok = await bekle(A, '[...document.querySelectorAll(".bildirim")].some(e => /bulunamadı/.test(e.textContent))');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.istekGeldi && /Aylin/.test(log.istekAdi) && log.dostA && log.dostB && log.fisB && log.fisBen && log.fisA && log.cikti && log.kodGorunur && log.kodlaIstek && log.kodYok;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
