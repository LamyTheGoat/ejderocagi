// EO2 · hesap kurtarma denetimi: iki ayrı tarayıcı (iki ayrı çerez kabı).
// A: yeni ocak kurar, hesaba yedekler, menüden kurtarma kodu alır.  B: giriş ekranında "Kurtarma kodum var" ile kodu yazar.
// Beklenen: B aynı hesaba girer, A'nın ocağı B'ye yüklenir; B'nin sonraki yedeği çakışmaz; A'nın eski yedeği B'ninkini ezmez.
// Kullanım: node eo2/tools/check_hesap.mjs   (URL ortam değişkeni; varsayılan http://localhost:3210/)
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const sayfa = async () => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.hesap && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(800); return p; };
const tikla = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(350); };
const cevrimici = p => p.waitForFunction('EO2.ag.cevrimici() && EO2.ag.kese() && EO2.ag.kese().accountId', null, { timeout: 30000 });
try {
  // ---- A: yeni ocak, yedek, kod
  const A = await sayfa();
  await tikla(A, '.giris .gbtn:has-text("Yeni ocak kur")'); if (await A.locator('.pen:has-text("silinsin")').count()) await tikla(A, '.pen .gbtn:has-text("Yeni ocak kur")');
  await tikla(A, '.pen .gbtn:has-text("Ocağa gir")'); await A.waitForTimeout(1200); await cevrimici(A);
  await A.waitForFunction('typeof S !== "undefined" && S && S.ocakId && S.ocakEs && S.ocakEs.acct', null, { timeout: 30000 });   // ocak hesaba bağlandı: kimliği kayıtta
  await A.evaluate(() => { S.terbiyeci = 'Kurtarma Denemesi'; saveGame(); });
  log.yedekA = await A.evaluate(() => EO2.hesap.yedekle(false));
  log.a = await A.evaluate(() => ({ hesap: EO2.ag.kese().accountId, ocak: S.ocakId, hafta: S.week, ad: S.terbiyeci, ejder: S.dragons.length }));
  await A.evaluate(() => EO2.game.open('menu')); await A.waitForTimeout(500);
  log.menuA = await A.locator('.mk-hesap .hs-yazi').textContent();
  await tikla(A, '.mk-hesap [data-h="kod"]'); await tikla(A, '.pen .gbtn:has-text("Kod oluştur")'); await A.waitForSelector('.hs-kod', { timeout: 15000 });
  const kod = (await A.locator('.hs-kod').textContent()).trim(); log.kodBicim = /^([A-HJ-NP-Z2-9]{4}-){5}[A-HJ-NP-Z2-9]{4}$/.test(kod);
  await tikla(A, '.pen .gbtn:has-text("Yazdım, kapat")');
  // ---- B: boş tarayıcı, yanlış kod, sonra doğru kod
  const B = await sayfa();
  log.bOnce = await B.evaluate(() => ({ kayit: !!localStorage.getItem('ejder-ocagi-v1') }));
  await tikla(B, '.giris [data-kurtar]');
  await B.locator('.hs-kutu').fill('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA'); await tikla(B, '.pen .gbtn:has-text("Gir")'); await B.waitForTimeout(1200);
  log.yanlisKod = await B.locator('.hs-durum').textContent();
  await B.locator('.hs-kutu').fill(kod.toLowerCase().replace(/-/g, ' ')); await tikla(B, '.pen .gbtn:has-text("Gir")');
  await B.waitForSelector('.pen:has-text("Ocağın geri geldi")', { timeout: 20000 });
  await Promise.all([B.waitForNavigation({ timeout: 30000 }), tikla(B, '.pen .gbtn:has-text("Tamam")')]);
  await B.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.hesap && document.querySelector(".giris")', null, { timeout: 60000 }); await B.waitForTimeout(800);
  log.bGiris = await B.locator('.giris .gbtn').first().textContent();
  await tikla(B, '.giris .gbtn:has-text("Ocağa dön")'); await B.waitForTimeout(1200); await cevrimici(B);
  log.b = await B.evaluate(() => ({ hesap: EO2.ag.kese().accountId, ocak: S.ocakId, hafta: S.week, ad: S.terbiyeci, ejder: S.dragons.length }));
  // ---- B oynar ve yedekler (çakışma olmamalı); A'nın bayat yedeği reddedilmeli
  await B.evaluate(() => { S.terbiyeci = 'Kurtarma Denemesi B'; saveGame(); });
  log.yedekB = await B.evaluate(() => EO2.hesap.yedekle(false)); log.durumB = await B.evaluate(() => EO2.hesap.durum().durum);
  await A.evaluate(() => { S.terbiyeci = 'Bayat A'; saveGame(); });
  log.yedekA2 = await A.evaluate(() => EO2.hesap.yedekle(false)); log.durumA2 = await A.evaluate(() => EO2.hesap.durum().durum);
  log.sunucudaki = await B.evaluate(async () => { const j = await (await fetch('/api/save', { credentials: 'same-origin' })).json(); return JSON.parse(j.save).terbiyeci; });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.yedekA === true && log.kodBicim && log.bOnce && log.bOnce.kayit === false && /tanınmadı/.test(log.yanlisKod || '') && log.b && log.a && log.b.hesap === log.a.hesap && log.b.ocak === log.a.ocak && log.b.ad === 'Kurtarma Denemesi' && log.b.ejder === log.a.ejder
  && log.yedekB === true && log.durumB === 'tamam' && log.yedekA2 === false && log.durumA2 === 'cakisma' && log.sunucudaki === 'Kurtarma Denemesi B';
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
