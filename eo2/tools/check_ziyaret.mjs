// EO2 · ocak ziyareti ve birlikte çiftleştirme denetimi: iki ayrı tarayıcı. A meydanda B'nin kartından ocağına çağırır; B gider ve
// A'nın arazisini görür; A da ocağına girince birbirlerini görürler; B bir ejderhasını sunar, A kendi ejderhasıyla eşleştirir:
// bedel A'dan düşer, yumurta A'nın ocağına gelir (Damızlık kuralı), B'ye haber gider. B çıkınca ziyaret biter.
// Yeni hesapta eşleşecek yaşta çift olmadığından denetim iki ejderhanın evresini ve cinsiyetini, A'nın altınını elle ayarlar.
// Kullanım: node eo2/tools/check_ziyaret.mjs   (EKRAN=<klasör> verilirse ekran görüntüleri yazılır)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '';
if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.ziyaret && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 15000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  // A arazisinde bir kare daha açar ki B'nin gördüğü tablo A'nınkiyle karşılaştırılabilsin
  log.aAcik = await A.evaluate(() => { const i = S.grid.findIndex((t, k) => !t.open && canClear(k)); if (i >= 0) S.grid[i].open = true; const d = S.dragons.find(x => !x.dead); d.stage = 'genc'; d.sex = 'F'; S.gold = 500; return S.grid.filter(t => t.open).length; });
  await B.evaluate(() => { const d = S.dragons.find(x => !x.dead); d.stage = 'genc'; d.sex = 'M'; });
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Ocağına çağır")').click();
  log.davet = await B.waitForSelector('.pen:has-text("seni ocağına çağırıyor")', { timeout: 12000 }).then(() => true, () => false);
  log.davetMetni = log.davet ? await B.locator('.pen').first().textContent() : '';
  if (log.davet) await B.locator('.pen .gbtn:has-text("Ocağına git")').click();
  log.vardi = await bekle(B, 'EO2.ziyaret.evSahibi() && EO2.api.scene() === "ocak" && EO2.ziyaret.tablo()', 30000);
  log.bAcik = await B.evaluate(() => EO2.ziyaret.tablo().grid.filter(t => t.open).length);
  log.bKendiAcik = await B.evaluate(() => S.grid.filter(t => t.open).length);
  log.geldi = await bekle(A, 'EO2.ziyaret.misafirler().size === 1');
  await A.evaluate(() => EO2.ocak.git()); await bekle(A, 'EO2.api.scene() === "ocak"', 30000);
  log.birbirini = await bekle(A, 'EO2.meydanAg.sayi() === 1', 20000) && await bekle(B, 'EO2.meydanAg.sayi() === 1', 20000);
  await B.waitForTimeout(1200); await cek(B, 'ziyaret_1_misafir'); await cek(A, 'ziyaret_1_ev_sahibi');
  // misafir hiçbir şeyi değiştiremez: kare panosu açılmaz
  log.panoKapali = await B.evaluate(() => { EO2.api.runAct('kare:0'); return !document.getElementById('ocTepsi'); });
  const once = await A.evaluate(() => ({ yum: S.eggs.length, altin: S.gold }));
  await B.evaluate(() => { EO2.ziyaret.sun(false); }); await B.waitForSelector('.pen:has-text("Hangi ejderhanı sunarsın")', { timeout: 8000 }); await cek(B, 'ziyaret_2_sun');
  await B.locator('.pen .gbtn').first().click();
  log.teklif = await A.waitForSelector('.pen:has-text("bir ejderha sundu")', { timeout: 12000 }).then(() => true, () => false); await cek(A, 'ziyaret_3_teklif');
  if (log.teklif) await A.locator('.pen .gbtn:has-text("ile eşleştir")').first().click();
  await A.waitForTimeout(800);
  const sonra = await A.evaluate(() => ({ yum: S.eggs.length, altin: S.gold, koken: (S.eggs[S.eggs.length - 1] || {}).origin }));
  log.yumurta = sonra.yum === once.yum + 1; log.bedel = once.altin - sonra.altin; log.koken = sonra.koken;
  log.bHaber = await bekle(B, '[...document.querySelectorAll(".bildirim")].some(e => /eşleşti/.test(e.textContent))');
  log.bYumurtaAlmadi = await B.evaluate(() => !S.eggs.some(e => /ortak damızlık/.test(e.origin || '')));
  await cek(A, 'ziyaret_4_sonra');
  await B.evaluate(() => EO2.api.runAct('go:meydan'));
  log.cikti = await bekle(B, '!EO2.ziyaret.evSahibi() && !EO2.ziyaret.tablo() && EO2.api.scene() !== "ocak"', 30000) && await bekle(A, 'EO2.ziyaret.misafirler().size === 0');
  log.yalniz = await bekle(A, 'EO2.meydanAg.sayi() === 0', 20000);
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.davet && /Aylin/.test(log.davetMetni) && log.vardi && log.bAcik === log.aAcik && log.bAcik !== log.bKendiAcik && log.geldi && log.birbirini && log.panoKapali && log.teklif && log.yumurta && (log.bedel === 95 || log.bedel === 15) /* 15: oyunun "ilk yumurta" hedefi aynı anda 80 altın verir */ && /Bora/.test(log.koken || '') && log.bHaber && log.bYumurtaAlmadi && log.cikti && log.yalniz;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
