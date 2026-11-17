// EO2 · açık oda listesi denetimi (iki tarayıcı): A bir oda kurar, B aynı lobide odayı listede görür ve "Katıl" ile girer.
// Dört lobi ölçülür: ortak sefer, Kıraathane oyuncu masası, Takım Meydanı ve topçu düellosu (Er Meydanı). Kapanan oda listeden düşer.
// Kullanım: node eo2/tools/check_oda_listesi.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 15000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.ortak && EO2.masa && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(700);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350); await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); await p.evaluate(() => { window.canEnterZindanOrTopcu = () => true; if (window.__denetimHazir) window.__denetimHazir(); }); return p; };
try {
  const A = await gir('Aylin'), B = await gir('Bora');
  // ortak odalar: sefer, masa, takım
  for (const [ad, ekranAd, kur, cik] of [['sefer', 'zindan', '[data-zn="kur"]', '[data-zn="cik"]'], ['masa', 'masa', '[data-ms="kur"]', '[data-ms="cik"]'], ['takim', 'takim', '[data-tk="kur"]', '[data-tk="cik"]']]) { const L = log[ad] = {};
    await B.evaluate(e => EO2.game.open(e), ekranAd); L.bosYazi = await bekle(B, 'document.querySelector("[data-or-liste]") && !document.querySelector("[data-or-liste] li")');
    await A.evaluate(e => EO2.game.open(e), ekranAd); await A.locator(kur).click(); L.kuruldu = await bekle(A, 'EO2.ortak.durum().oda && EO2.ortak.durum().oda.durum === "bekliyor"');
    L.listede = await bekle(B, 'document.querySelectorAll("[data-or-liste] li").length === 1 && /Aylin/.test(document.querySelector("[data-or-liste] li").textContent)', 12000);
    L.satir = await B.evaluate(() => { const li = document.querySelector('[data-or-liste] li'); return li ? li.textContent.replace(/\s+/g, ' ').trim() : ''; });
    if (ekran) await B.screenshot({ path: path.join(ekran, 'liste_' + ad + '.png') });
    await B.locator('[data-or-liste] [data-oda-kod]').first().click(); L.katildi = await bekle(B, 'EO2.ortak.durum().oda && EO2.ortak.durum().oda.uyeler.length === 2') && await bekle(A, 'EO2.ortak.durum().oda && EO2.ortak.durum().oda.uyeler.length === 2');
    await B.locator(cik).click(); await bekle(B, '!EO2.ortak.durum().oda'); await A.locator(cik).click(); L.kapandi = await bekle(A, '!EO2.ortak.durum().oda');
    L.listedenDustu = await bekle(B, 'document.querySelector("[data-or-liste]") && !document.querySelector("[data-or-liste] li")', 12000);
    for (const p of [A, B]) await p.evaluate(() => EO2.game.close()); await A.waitForTimeout(400); }
  // topçu düellosu: Er Meydanı künyesi
  { const L = log.duello = {}, ac = p => p.evaluate(() => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.open('ermeydani'); });
    await ac(B); L.kunye = await bekle(B, 'EO2.game.ekran() === "ermeydani" && document.querySelector("[data-em-liste]") && !document.querySelector(".em-sancak")');
    await ac(A); await A.locator('[data-pvp="kur"]').click(); L.kuruldu = await bekle(A, 'document.querySelector(".tp-oda b") && document.querySelectorAll(".tp-yuva.bos").length === 1');
    L.listede = await bekle(B, 'document.querySelectorAll(".em-sancak").length === 1 && /Aylin/.test(document.querySelector(".em-sancak").textContent)', 12000);
    L.kartCizildi = await bekle(B, '(() => { const cv = document.querySelector(".em-sancak canvas"); if (!cv || cv.width < 50) return false; const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++; return n > 300; })()', 10000);
    if (ekran) await B.screenshot({ path: path.join(ekran, 'liste_duello.png') });
    await B.locator('[data-pvp-oda]').first().click(); L.katildi = await bekle(B, 'document.querySelector(".tp-oda b")') && await bekle(A, 'document.querySelectorAll(".tp-yuva:not(.bos)").length === 2');
    await B.locator('[data-pvp="hazir"]').click(); L.hazir = await bekle(A, 'document.querySelector("[data-pvp=baslat]") && !document.querySelector("[data-pvp=baslat]").disabled && document.querySelectorAll(".em-lamba:not(.bekle)").length === 2'); await A.waitForTimeout(900);
    if (ekran) { await A.screenshot({ path: path.join(ekran, 'oda_bekleme_kurucu.png') }); await B.screenshot({ path: path.join(ekran, 'oda_bekleme_katilan.png') }); }
    await B.locator('[data-pvp="cik"]').click(); await A.locator('[data-pvp="cik"]').click(); L.listedenDustu = await bekle(B, 'document.querySelector("[data-em-liste]") && !document.querySelector(".em-sancak")', 12000); }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && ['sefer', 'masa', 'takim'].every(k => log[k] && log[k].bosYazi && log[k].kuruldu && log[k].listede && log[k].katildi && log[k].kapandi && log[k].listedenDustu) && log.duello && log.duello.kunye && log.duello.kuruldu && log.duello.listede && log.duello.kartCizildi && log.duello.katildi && log.duello.hazir && log.duello.listedenDustu;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
