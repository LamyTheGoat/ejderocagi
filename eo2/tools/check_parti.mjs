// EO2 · oyuncu künyesi ve parti denetimi: iki ayrı tarayıcı. A meydanda B'nin kartından künyesine bakar, künyeden partiye çağırır;
// B katılır; iki ekranda parti çerçevesi görünür (lider taçlı); parti sohbeti /p ile gider; B ocağına gidince A'nın çerçevesinde
// yeri güncellenir; B ayrılınca parti dağılır. Kullanım: node eo2/tools/check_parti.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '';
if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.profil && EO2.parti && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 15000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  await B.evaluate(() => EO2.profil.bildir()); await B.waitForTimeout(400);
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Künyesine bak")').click();
  log.kunye = await A.waitForSelector('.pen .pf-kart', { timeout: 10000 }).then(() => true, () => false);
  log.kunyeMetni = log.kunye ? await A.locator('.pen .pf-kart').textContent() : ''; await A.waitForTimeout(500); await cek(A, 'parti_1_kunye');
  await A.locator('.pen .gbtn:has-text("Partiye çağır")').click();
  log.davet = await B.waitForSelector('.pen:has-text("partisine çağırıyor")', { timeout: 12000 }).then(() => true, () => false);
  if (log.davet) await B.locator('.pen .gbtn:has-text("Partiye katıl")').click();
  const iki = 'document.querySelectorAll("#partiCerceve .pt-uye").length === 2 && !document.getElementById("partiCerceve").hidden';
  log.cerceve = await bekle(A, iki) && await bekle(B, iki);
  log.tac = await A.evaluate(() => !!document.querySelector('#partiCerceve .pt-uye.ben .pt-tac')) && await B.evaluate(() => !document.querySelector('#partiCerceve .pt-uye.ben .pt-tac') && !!document.querySelector('#partiCerceve .pt-tac'));
  log.sekme = await B.evaluate(() => getComputedStyle(document.getElementById('chatTabs')).display !== 'none');
  await A.evaluate(() => EO2.hooks.sohbet('/p merhaba parti', 'genel'));
  log.soz = await bekle(B, '/Aylin: merhaba parti/.test(document.getElementById("chatLog").textContent)') && await bekle(A, '/Sen: merhaba parti/.test(document.getElementById("chatLog").textContent)');
  await cek(A, 'parti_2_cerceve');
  await B.evaluate(() => EO2.ocak.git());
  log.yer = await bekle(A, '/Ocağında/.test(document.getElementById("partiCerceve").textContent)', 20000);
  log.sozUzaktan = await (async () => { await B.waitForFunction('EO2.api.scene() === "ocak"', null, { timeout: 30000 }); await B.evaluate(() => EO2.hooks.sohbet('ocaktan selam', 'parti')); return bekle(A, '/Bora: ocaktan selam/.test(document.getElementById("chatLog").textContent)'); })();
  await B.evaluate(() => { EO2.profil.ac(null); }); log.kunyem = await B.waitForSelector('.pen .pf-kart', { timeout: 8000 }).then(() => true, () => false); await B.waitForTimeout(400); await cek(B, 'parti_3_kunyem');
  if (log.kunyem) await B.locator('.pen .gbtn:has-text("Kapat")').click();
  await B.evaluate(() => EO2.parti.cik());
  log.dagildi = await bekle(A, 'document.getElementById("partiCerceve").hidden && !EO2.parti.durum().parti') && await bekle(B, 'document.getElementById("partiCerceve").hidden');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.kunye && /Bora/.test(log.kunyeMetni) && /1\. hafta/.test(log.kunyeMetni) && log.davet && log.cerceve && log.tac && log.sekme && log.soz && log.yer && log.sozUzaktan && log.kunyem && log.dagildi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
