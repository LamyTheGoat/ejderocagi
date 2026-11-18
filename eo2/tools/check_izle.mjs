// EO2 · maç izleme denetimi (üç tarayıcı): A oda kurar, B listeden katılır, maç başlar; C Er Meydanı listesinde süren maçı görür ve "İzle" der.
// Ölçülenler: süren maç listede gri kartla ve "İzle" düğmesiyle görünür; izleme ekranında iki terbiyecinin adı, canı ve tur yazısı vardır;
// A ateş edince izleyicinin ekranında olay yazısı değişir; maç bitince (B ayrılır) izleyici kazananı görür; izleyici maça karışamaz (oda üyesi değildir).
// Kullanım: node eo2/tools/check_izle.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 20000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.topcuPvp && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(700);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350); await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const ac = p => p.evaluate(() => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.open('ermeydani'); });
try {
  const A = await gir('Aylin'), B = await gir('Bora'), C = await gir('Ceren');
  await ac(A); await A.locator('[data-pvp="kur"]').click(); await bekle(A, 'document.querySelector(".tp-oda b")');
  await ac(B); await bekle(B, 'document.querySelector("[data-pvp-oda]")', 15000); await B.locator('[data-pvp-oda]').first().click(); await bekle(B, 'document.querySelector("[data-pvp=hazir]")'); await B.locator('[data-pvp="hazir"]').click();
  await bekle(A, 'document.querySelector("[data-pvp=baslat]") && !document.querySelector("[data-pvp=baslat]").disabled'); await A.locator('[data-pvp="baslat"]').click();
  log.mac = await bekle(A, 'EO2.battle.active() && EO2.battle.state().rakip', 60000) && await bekle(B, 'EO2.battle.active() && EO2.battle.state().rakip', 60000);
  // C: listede süren maç ve İzle
  await ac(C); log.listede = await bekle(C, 'document.querySelector(".em-sancak.dolu [data-pvp=izle]") && /Aylin/.test(document.querySelector(".em-sancak.dolu").textContent) && /Bora/.test(document.querySelector(".em-sancak.dolu").textContent)', 15000);
  if (ekran) await C.screenshot({ path: path.join(ekran, 'izle_1_liste.png') });
  await C.locator('.em-sancak.dolu [data-pvp="izle"]').click();
  log.izliyor = await bekle(C, 'document.querySelector(".em-kok.izle") && document.querySelectorAll(".em-kok.izle .em-plaka b").length === 2 && /Tur 1/.test(document.querySelector(".em-kok.izle .em-kod2").textContent)');
  log.adlar = await C.evaluate(() => [...document.querySelectorAll('.em-kok.izle .em-plaka b')].map(e => e.textContent).join(','));
  log.uyeDegil = await C.evaluate(() => !EO2.topcuPvp.durum().oda && !EO2.battle.active());
  // sırası gelen ateş eder: izleyicide olay yazısı değişir
  const SIRA = 'EO2.battle.active() && EO2.battle.state().aktif === EO2.battle.state().ben && EO2.battle.state().faz === "nisan"';
  await Promise.race([bekle(A, SIRA, 40000), bekle(B, SIRA, 40000)]); const atan = (await A.evaluate(() => { const M = EO2.battle.state(); return M.aktif === M.ben && M.faz === 'nisan'; })) ? A : B;
  await atan.bringToFront(); await atan.keyboard.down('Space'); await atan.waitForTimeout(240); await atan.keyboard.up('Space');
  log.atisGoruldu = await bekle(C, '/ateş etti|isabet aldı/.test(document.querySelector(".em-kok.izle .em-kural").textContent)', 20000); await C.waitForTimeout(600);
  log.canVar = await C.evaluate(() => { const z = EO2.topcuPvp.durum().izle; return Object.keys(z.hp).length >= 1 && document.querySelectorAll('.em-can i').length === 2; });
  if (ekran) await C.screenshot({ path: path.join(ekran, 'izle_2_canli.png') });
  // maç biter: B maçtan çıkar (hükmen kaybeder); izleyici kazananı görür
  await B.evaluate(() => { EO2.battle.kapat(); });
  log.bitti = await bekle(C, 'EO2.topcuPvp.durum().izle && EO2.topcuPvp.durum().izle.son && /kazandı/.test(document.querySelector(".em-kok.izle .em-kural").textContent)', 30000);
  log.kazanan = await C.evaluate(() => document.querySelector('.em-kok.izle .em-kural').textContent); if (ekran) await C.screenshot({ path: path.join(ekran, 'izle_3_son.png') });
  await C.locator('[data-pvp="izle-cik"]').click(); log.listeyeDondu = await bekle(C, '!EO2.topcuPvp.durum().izle && document.querySelector("[data-em-liste]")');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.mac && log.listede && log.izliyor && /Aylin/.test(log.adlar) && /Bora/.test(log.adlar) && log.uyeDegil && log.atisGoruldu && log.canVar && log.bitti && /Aylin kazandı/.test(log.kazanan) && log.listeyeDondu;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
