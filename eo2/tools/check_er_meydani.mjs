// EO2 · Er Meydanı denetimi (iki tarayıcı): ejderha dövüşünde herkese açık eşleşme.
// İki oyuncu Arena → Er Meydanı'na girer, birbirini meydanda görür, ikisi de "Eşleşme ara" der; rakip bulununca onaylar, dövüş iki ekranda açılır,
// hamleler sırayla oynanır ve iki ekranda tutarlı sonuç çıkar (biri zafer, öteki yenilgi; ya da ikisi berabere). Dostça düello: altın yazılmaz.
// Üç yol da ölçülür: eşleşme sırası, sancak (oda) ve meydan okuma daveti.
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
  await p.locator('#scr button:has-text("Dost Dövüşü")').first().click(); await p.waitForTimeout(1200); return p; };
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
  // ikinci yol: sancak. İkisi meydana döner; A sancağını diker, B onu seçip sancağına katılır; dövüş açılır, A teslim olur
  for (const p of [A, B]) { await p.locator('.pen .gbtn:has-text("Dost Dövüşü")').first().click().catch(() => { }); await p.waitForTimeout(900); }
  log.meydanaDondu = await bekle(A, 'document.querySelector("[data-er=\\"room_open\\"]") && !document.getElementById("dov")', 30000) && await bekle(B, 'document.querySelectorAll("[data-ersec]").length >= 1 && !document.getElementById("dov")', 30000);
  await A.locator('[data-er="room_open"]').click();
  log.sancakGorundu = await bekle(B, 'document.querySelector("[data-ersec].er-room")', 30000);
  await B.locator('[data-ersec]').first().click(); await B.waitForTimeout(500); await B.locator('[data-er="join"]').click();
  log.sancakDovusu = await bekle(A, '!!document.getElementById("dov")', 40000) && await bekle(B, '!!document.getElementById("dov")', 40000);
  if (ekran) await B.screenshot({ path: path.join(ekran, 'er_4_sancak_dovusu.png') });
  await bekle(A, 'document.querySelector("#dov [data-x=\\"teslim\\"]:not([disabled])")', 30000); await A.locator('#dov [data-x="teslim"]').click(); await A.waitForTimeout(600);
  // teslim de bir hamledir: tur, iki taraf hamlesini yollayınca çözülür (B pençe atar)
  await bekle(B, 'document.querySelector("#dov [data-x=\\"pence\\"]:not([disabled])")', 30000); await B.locator('#dov [data-x="pence"]').click();
  const son = async p => { for (let i = 0; i < 60; i++) { const t = await p.evaluate(() => [...document.querySelectorAll('.pen')].map(x => x.textContent).join(' ')); if (/Zafer|Yenilgi|Teslim/.test(t) && !/teslim olacak|Teslim olursan/i.test(t)) return /Zafer/.test(t) ? 'zafer' : 'yenilgi'; await p.waitForTimeout(500); } return 'bitmedi'; };
  log.sancakSonuc = await Promise.all([son(A), son(B)]);
  // üçüncü yol: meydan okuma daveti. İkisi meydana döner; B, A'yı seçip "Meydan oku" der; A'ya davet penceresi gelir, kabul eder; dövüş açılır, B teslim olur
  for (const p of [A, B]) { await p.locator('.pen .gbtn:has-text("Dost Dövüşü")').first().click().catch(() => { }); await p.waitForTimeout(900); }
  log.davetMeydan = await bekle(B, 'document.querySelectorAll("[data-ersec]").length >= 1 && !document.getElementById("dov") && !document.querySelector(".pen")', 30000) && await bekle(A, '!document.getElementById("dov") && !document.querySelector(".pen")', 30000);
  await B.locator('[data-ersec]').first().click(); await B.waitForTimeout(500);
  log.davetDugmesi = await B.locator('[data-er="invite"]').count() === 1; if (log.davetDugmesi) await B.locator('[data-er="invite"]').click();
  log.davetGeldi = await A.waitForSelector('.pen:has-text("meydan okuyor")', { timeout: 30000 }).then(() => true, () => false);
  if (ekran) await A.screenshot({ path: path.join(ekran, 'er_5_davet.png') });
  await A.locator('.pen .gbtn:has-text("Kabul et")').click().catch(() => { });
  log.davetDovusu = await bekle(A, '!!document.getElementById("dov")', 40000) && await bekle(B, '!!document.getElementById("dov")', 40000);
  await bekle(B, 'document.querySelector("#dov [data-x=\\"teslim\\"]:not([disabled])")', 30000); await B.locator('#dov [data-x="teslim"]').click().catch(() => { }); await B.waitForTimeout(600);
  await bekle(A, 'document.querySelector("#dov [data-x=\\"pence\\"]:not([disabled])")', 30000); await A.locator('#dov [data-x="pence"]').click().catch(() => { });
  log.davetSonuc = await Promise.all([son(A), son(B)]);
  log.altinYazilmadi = (await A.evaluate(() => S.gold)) === altin0[0] && (await B.evaluate(() => S.gold)) === altin0[1];
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.meydanda && log.dovusAcildi && log.tutarli && log.meydanaDondu && log.sancakGorundu && log.sancakDovusu && log.sancakSonuc[0] === 'yenilgi' && log.sancakSonuc[1] === 'zafer' && log.davetMeydan && log.davetDugmesi && log.davetGeldi && log.davetDovusu && log.davetSonuc[0] === 'zafer' && log.davetSonuc[1] === 'yenilgi' && log.altinYazilmadi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
