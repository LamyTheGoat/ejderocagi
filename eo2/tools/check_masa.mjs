// EO2 · Kıraathane oyuncu masası denetimi: iki ayrı tarayıcı. A meydanda B'nin kartından masaya çağırır; B oturur ve hazır olur;
// A oyunu başlatır; bahis tepsileri kendiliğinden açılır; ikisi de bahsi kilitler; zar atıp ellerini açarlar; sonuç iki ekranda görünür.
// Yeni hesapta kazanılmış mal olmadığından bahis boştur; gerçek aktarım tests/kiraathane_pvp.test.js içinde sınanır.
// Kullanım: node eo2/tools/check_masa.mjs   (EKRAN=<klasör> verilirse ekran görüntüleri yazılır)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '';
if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.takas && EO2.masa && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 12000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const faz = 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz';
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Kıraathane masasına çağır")').click();
  log.davet = await B.waitForSelector('.pen:has-text("Masaya davet")', { timeout: 12000 }).then(() => true, () => false);
  log.davetMetni = log.davet ? await B.locator('.pen').first().textContent() : '';
  log.kod = await bekle(A, 'EO2.game.ekran() === "masa" && document.querySelector(".ms-kodluk b")'); await cek(A, 'masa_1_bekleme');
  if (log.davet) await B.locator('.pen .gbtn:has-text("Masaya otur")').click();
  log.oturdu = await bekle(B, 'EO2.game.ekran() === "masa" && document.querySelector("[data-ms=hazir]")');
  await B.locator('[data-ms="hazir"]').click();
  log.hazirGorundu = await bekle(A, 'document.querySelector("[data-ms=baslat]") && !document.querySelector("[data-ms=baslat]").disabled');
  await A.locator('[data-ms="baslat"]').click();
  log.tepsiler = await bekle(A, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000) && await bekle(B, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000);
  log.takasEkraniAcilmadi = await A.evaluate(() => EO2.game.ekran() === 'masa' && !document.querySelector('.pen')) && await B.evaluate(() => EO2.game.ekran() === 'masa' && !document.querySelector('.pen'));
  await cek(A, 'masa_2_bahis');
  await A.locator('[data-ms="kilit"]').click(); log.kilitGorundu = await bekle(B, 'document.querySelector(".tk-tepsi.o.onayli")');
  await B.locator('[data-ms="kilit"]').click();
  log.oyun = await bekle(A, faz + ' === "oyun"') && await bekle(B, faz + ' === "oyun"');
  // kilitli bahis takasına oyuncu komutu reddedilir
  log.kilitRed = await A.evaluate(async () => { const t = EO2.takas.durum().trade; const ok = await EO2.takas.komut('cancel', { tradeId: t.id }); return !ok; });
  await A.locator('[data-ms="at"]').click(); log.zarGorundu = await bekle(B, 'document.querySelectorAll(".ms-el.rakip .kr-zar s.d").length >= 5');
  await bekle(A, 'document.querySelector("[data-tut]")'); await A.locator('[data-tut="0"]').click(); await cek(A, 'masa_3_oyun');
  await A.locator('[data-ms="at"]').click(); await A.waitForTimeout(500); await A.locator('[data-ms="ac"]').click();
  await B.locator('[data-ms="at"]').click(); await bekle(B, 'document.querySelector("[data-ms=ac]") && !document.querySelector("[data-ms=ac]").disabled'); await B.locator('[data-ms="ac"]').click();
  log.bitti = await bekle(A, faz + ' === "bitti" && document.querySelector(".ms-sonuc")') && await bekle(B, faz + ' === "bitti" && document.querySelector(".ms-sonuc")');
  log.odeme = await bekle(A, 'EO2.masa.durum().odeme') ? await A.evaluate(() => EO2.masa.durum().odeme) : null;
  log.sonuc = [await A.locator('.ms-sonuc').textContent(), await B.locator('.ms-sonuc').textContent()]; await cek(A, 'masa_4_sonuc'); await cek(B, 'masa_4_sonuc_b');
  // rövanş: B hazır olur, A başlatır; bahissiz kilit; B oyun sürerken kalkar ve kaybeder
  await B.locator('[data-ms="hazir"]').click(); await bekle(A, 'document.querySelector("[data-ms=baslat]") && !document.querySelector("[data-ms=baslat]").disabled'); await A.locator('[data-ms="baslat"]').click();
  log.rovans = await bekle(A, faz + ' === "bahis"') && await bekle(B, faz + ' === "bahis"');
  await bekle(A, 'document.querySelector("[data-ms=kilit],[data-ms=kilit-bos]")', 20000); await bekle(B, 'document.querySelector("[data-ms=kilit],[data-ms=kilit-bos]")', 20000);
  await A.locator('[data-ms="kilit"],[data-ms="kilit-bos"]').first().click(); await B.locator('[data-ms="kilit"],[data-ms="kilit-bos"]').first().click();
  log.rovansOyun = await bekle(A, faz + ' === "oyun"');
  await B.locator('[data-ms="cik"]').click(); await B.locator('.pen .gbtn:has-text("Kalk")').click();
  log.kalkanKaybetti = await bekle(A, 'EO2.masa.durum().odeme && EO2.masa.durum().odeme.kazanan === EO2.ortak.durum().ben');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.davet && /Aylin/.test(log.davetMetni) && log.kod && log.oturdu && log.hazirGorundu && log.tepsiler && log.takasEkraniAcilmadi && log.kilitGorundu && log.oyun && log.kilitRed && log.zarGorundu && log.bitti && !!log.odeme && log.rovans && log.rovansOyun && log.kalkanKaybetti;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
