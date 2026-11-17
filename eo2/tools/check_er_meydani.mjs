// EO2 · Er Meydanı denetimi (iki tarayıcı): ejderha dövüşünde herkese açık eşleşme.
// İki oyuncu Arena → Er Meydanı'na girer, birbirini meydanda görür, ikisi de "Eşleşme ara" der; rakip bulununca onaylar, dövüş iki ekranda açılır,
// hamleler sırayla oynanır ve iki ekranda tutarlı sonuç çıkar (biri zafer, öteki yenilgi; ya da ikisi berabere). Dostça düello: altın yazılmaz.
// Kullanım: node eo2/tools/check_er_meydani.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000); await bekle(p, 'EO2.ag.cevrimici()');
  await p.evaluate(() => { window.__fastFx = true; EO2.game.open('arena'); }); await p.waitForTimeout(800);
  await p.locator('#scr button:has-text("Er Meydanı")').first().click(); await p.waitForTimeout(1200); return p; };
try {
  const A = await gir('Aylin'), B = await gir('Bora'), altin0 = [await A.evaluate(() => S.gold), await B.evaluate(() => S.gold)];
  log.meydanda = await bekle(A, 'document.querySelectorAll("[data-ersec]").length >= 1', 30000) && await bekle(B, 'document.querySelectorAll("[data-ersec]").length >= 1', 30000);
  if (ekran) await A.screenshot({ path: path.join(ekran, 'er_1_meydan.png') });
  // ikisi de sıraya girer
  await A.locator('[data-er="queue"]').click(); await A.waitForTimeout(500); await B.locator('[data-er="queue"]').click();
  // rakip bulundu onayı (varsa) ve dövüşün açılması
  const onayla = async p => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!document.getElementById('dov'))) return true; const d = p.locator('.pen .gbtn.altin, .pen .gbtn:has-text("Hazır"), .pen .gbtn:has-text("Kabul")').first(); if (await d.count()) await d.click().catch(() => { }); await p.waitForTimeout(500); } return false; };
  const [da, db] = await Promise.all([onayla(A), onayla(B)]); log.dovusAcildi = da && db;
  if (ekran) await A.screenshot({ path: path.join(ekran, 'er_2_dovus.png') });
  // hamleler: iki taraf da oynar, dövüş bitene dek
  const oyna = async p => { for (let i = 0; i < 160; i++) { const s = await p.evaluate(() => ({ dov: !!document.getElementById('dov'), sonuc: [...document.querySelectorAll('.pen')].map(x => x.textContent).join(' ') }));
      if (/Zafer|Yenilgi|Berabere|Teslim/.test(s.sonuc)) return /Zafer/.test(s.sonuc) ? 'zafer' : /Berabere/.test(s.sonuc) ? 'berabere' : 'yenilgi'; if (!s.dov) return 'kapandi';
      const d = p.locator('#dov [data-x="pence"]:not([disabled]), #dov [data-x]:not([disabled]):not([data-x="teslim"])').first(); if (await d.count()) await d.click().catch(() => { }); await p.waitForTimeout(350); } return 'bitmedi'; };
  const [sa, sb] = await Promise.all([oyna(A), oyna(B)]); log.sonuc = [sa, sb];
  if (ekran) await A.screenshot({ path: path.join(ekran, 'er_3_sonuc.png') });
  log.tutarli = (sa === 'zafer' && sb === 'yenilgi') || (sa === 'yenilgi' && sb === 'zafer') || (sa === 'berabere' && sb === 'berabere');
  log.altinYazilmadi = (await A.evaluate(() => S.gold)) === altin0[0] && (await B.evaluate(() => S.gold)) === altin0[1];
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.meydanda && log.dovusAcildi && log.tutarli && log.altinYazilmadi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
