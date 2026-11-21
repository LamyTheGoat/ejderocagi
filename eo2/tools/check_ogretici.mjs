// EO2 · öğretici bölümleri denetimi (gerçek akış, 2026-11-21): yedi bölüm sırayla açılır, sırası gelmemiş ekran kapalıdır,
// adımın istediği kaynak verilir, Pazar'da ücretsiz damızlık çıkar ve çiftin yakınlığı yüksek tutulur, Ayaz NPC'si meydandadır.
// Hızlı olsun diye bazı adımlar durumdan tamamlanır (hafta bitirme gerçek akıştır). Kullanım: node eo2/tools/check_ogretici.mjs  (EKRAN=<klasör>)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json'));
let pw; try { pw = require('playwright'); } catch (_) { pw = require('playwright-core'); }
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await pw.chromium.launch(process.env.KANAL ? { channel: process.env.KANAL } : process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const [vw, vh] = (process.env.VP || '1280x720').split('x').map(Number), tel = vw < 900;
const ctx = await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: tel, isMobile: tel, deviceScaleFactor: 1 }); await ctx.addInitScript(() => { window.__gercekAkis = true; });
const p = await ctx.newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (f, ms = 30000) => p.waitForFunction(f, null, { timeout: ms }).then(() => true, () => false), dur = ms => p.waitForTimeout(ms), cek = async ad => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const aktif = () => p.evaluate(() => { const a = EO2.rehber.aktif(); return a ? a.id : null; });
const acilir = id => p.evaluate(e => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.open(e); const ok = EO2.game.ekran() === e; if (ok) EO2.game.close(); return ok; }, id);
const kartKapat = async () => { for (let i = 0; i < 4; i++) { const v = await p.evaluate(() => { const x = [...document.querySelectorAll('.pen .gbtn')].find(b => /Başla/.test(b.textContent)); if (x) { x.click(); return true; } return false; }); if (!v) break; await dur(400); } };
async function haftaBitir() { const h = await p.evaluate(() => S.week); await p.evaluate(() => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.endWeek(); });
  for (let i = 0; i < 20 && !(await p.evaluate(h => S.week > h && !EO2.game.busy, h)); i++) { await p.evaluate(() => { const L = [...document.querySelectorAll('.gece button, .pen button, .sabah button, .vn button, .cizgi button, .comic button, .vopt, #modal-root button')].filter(b => b.getClientRects().length && !b.disabled); const d = L[L.length - 1]; if (d) d.click(); }); const v = p.locator('.vopt:visible, .cnav [data-next]:visible'); if (await v.count()) await v.last().click({ timeout: 2000 }).catch(() => { }); await dur(700); } }
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.rehber && document.querySelector(".giris")', null, { timeout: 60000 }); await dur(900);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await dur(400); await p.locator('.pen input').first().fill('Aylin'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await bekle('EO2.game.ekran() === "gorunus" && document.querySelector("[data-gr-hazir]")'); await dur(700); await p.locator('[data-gr-hazir]').click();
  await bekle('EO2.api.scene() === "ocak" && !EO2.game.ekran()', 40000); await dur(1500);
  log.b1 = await aktif(); log.v2 = await p.evaluate(() => !!EO2.rehber.gorulen().v2);
  // 1. bölüm: durumdan (kuluçka + emir), hafta gerçek akışla biter
  await p.evaluate(() => { const i = S.grid.findIndex(q => q.open && !q.b); S.gold -= BUILD.kulucka.fiyat; S.grid[i].b = 'kulucka'; for (const e of S.eggs) e.inK = true; S.st.train++; S.dragons[0].task = { t: 'train', k: 'gu' }; });
  await dur(1200); log.b1son = await aktif(); await haftaBitir(); await dur(1500);
  // 2. bölüm: Topçu açık, arena ve pazar kapalı; bölüm kartı çıkar
  log.hafta = await p.evaluate(() => S.week); log.b2 = await aktif(); log.kart2 = (await bekle('[...document.querySelectorAll(".pen")].some(x => /Topçu/.test(x.textContent) && /Yeni bölüm/.test(x.textContent))', 8000)) || (await p.evaluate(() => EO2.rehber.gorulen().bolum >= 2));
  await cek('1_kart_topcu'); await kartKapat(); await dur(600); await cek('2_serit_topcu');
  log.kartDurum = await p.evaluate(() => ({ mesgul: EO2.game.mesgul, busy: EO2.game.busy, pen: document.querySelectorAll('.pen').length, sakin: EO2.game.sakin(), ekran: EO2.game.ekran(), fight: document.getElementById('app').classList.contains('fight'), perde: [...document.querySelectorAll('.pen-perde, .gece, .sabah, .vn, .dogum-s')].map(e => e.className), bolum: EO2.rehber.gorulen().bolum }));
  log.topcuAcik = await acilir('topcu'); log.arenaKapali = !(await acilir('arena')); log.pazarKapali = !(await acilir('pazar'));
  log.seritKilit = await p.evaluate(() => { const s = document.querySelector('.rehber'); return !!s && !s.hidden && s.classList.contains('kilit') && /Topçu/.test(s.textContent); });
  await p.evaluate(() => EO2.game.open('topcu')); await dur(1200); log.topcuYonerge = await p.evaluate(() => { const s = document.querySelector('.rehber'); return !!s && !s.hidden && /Talim/.test(s.textContent); }); await cek('3_topcu_yonerge'); await p.evaluate(() => EO2.game.close());
  await p.evaluate(() => EO2.rehber.olay('talim')); await dur(1500); log.b3 = await aktif(); await kartKapat();
  log.arenaAcik3 = await acilir('arena'); log.pazarKapali3 = !(await acilir('pazar'));
  // 3. bölüm: kuşam adımında altın yoksa öğretici verir
  await p.evaluate(() => { EO2.rehber.olay('x'); S.st.talk = 1; S.st.feed = 1; const g = EO2.rehber.gorulen(); }); await p.evaluate(() => EO2.game.open('harita')); await dur(300); await p.evaluate(() => EO2.game.close()); await dur(1500);
  log.b3b = await aktif(); await p.evaluate(() => { S.gold = 10; }); await dur(1600); log.kusamAltin = await p.evaluate(() => S.gold);
  await p.evaluate(() => { EO2.gorunum.satinAl('temel'); S.st.fights = 1; }); await dur(1600);
  // 4. bölüm: Yuva Bahçesi için altın, ücretsiz damızlık, yakınlık
  log.b4 = await aktif(); await kartKapat(); await p.evaluate(() => { S.gold = 0; }); await dur(1600); log.yuvaAltin = await p.evaluate(() => S.gold >= BUILD.yuva.fiyat);
  await p.evaluate(() => { const i = S.grid.findIndex(q => q.open && !q.b); S.gold -= BUILD.yuva.fiyat; S.grid[i].b = 'yuva'; }); await dur(1600); log.b4b = await aktif();
  if (log.b4b === 'u-in') { await p.evaluate(() => { const i = S.grid.findIndex(q => q.open && !q.b); S.gold -= BUILD.in.fiyat; S.grid[i].b = 'in'; }); await dur(1600); }
  log.b4c = await aktif(); log.armagan = await p.evaluate(() => { const d = (S.market.dragons || [])[0]; return d ? { ogretici: !!d.ogretici, price: d.price, sex: d.sex, stage: d.stage } : null; });
  await p.evaluate(() => EO2.game.open('pazar')); await dur(1200); await cek('4_pazar_armagan'); await p.evaluate(() => document.querySelector('#pzAl').click()); await dur(1500);
  log.b4engel = await aktif(); await p.evaluate(() => { const i = S.grid.findIndex(q => q.open && !q.b); S.grid[i].b = 'in'; }); await dur(1300);
  log.b4d = await aktif(); log.yakinlik = await p.evaluate(() => { const y = S.dragons.find(d => d.ogretici), k = S.dragons.find(d => d !== y && d.stage === 'yetiskin' && d.sex !== y.sex); return y && k ? S.aff[affKey(y.id, k.id)] : -1; });
  log.ciftHazir = await p.evaluate(() => { const y = S.dragons.find(d => d.ogretici), k = S.dragons.find(d => d !== y && d.stage === 'yetiskin' && d.sex !== y.sex); return breedChecks(y, k).every(c => c[1]); });
  await p.evaluate(() => EO2.game.close()); await dur(400);
  // Defter'deki Öğretici sayfası
  await p.evaluate(() => { EO2.game.open('defter'); }); await dur(800); await p.evaluate(() => { const x = document.querySelector('[data-sayfa="ogretici"]'); if (x) x.click(); }); await dur(800);
  log.defter = await p.evaluate(() => document.querySelectorAll('.defter .sayfa.sag .kariyer li').length); await cek('5_defter_ogretici'); await p.evaluate(() => EO2.game.close());
  // 7. bölüm: Ayaz meydanda
  await p.evaluate(() => { S.st.bred = 1; S.food.genclik = 0; }); await dur(1200); log.b5 = await aktif(); await kartKapat();
  // engeller: yavru gereken adımda inler dolu ve yumurta çatlamak üzere → İn kur; boş kare yoksa → çalılık temizle
  log.engel = await p.evaluate(async () => { const o = {}, bek = ms => new Promise(r => setTimeout(r, ms)); S.food.genclik = 1; S.dragons = S.dragons.filter(d => d.stage !== 'yavru');
    S.eggs = [{ id: 'e' + S.uid++, genes: randomGenes({ q: 0.1 }), sex: 'F', traits: [], w: 1, inK: true, gen: 1, parents: null, origin: 'deneme' }];
    while (freeSlots() > 0) { const d = mkDragon({ name: 'Dolgu', sex: 'M', genes: randomGenes({ q: 0.1 }), stage: 'yetiskin', age: 5, traits: [], bond: 20, mood: 3 }); S.dragons.push(d); }
    await bek(1300); o.adim = EO2.rehber.aktif() && EO2.rehber.aktif().id; S.gold = 0; await bek(1300); o.inAltin = S.gold >= BUILD.in.fiyat;
    o.serit = (document.querySelector('.rehber p') || {}).textContent || '';
    const bos = S.grid.filter(t => t.open && !t.b); for (const t of bos) t.b = 'fener'; await bek(1300); o.adim2 = EO2.rehber.aktif() && EO2.rehber.aktif().id; o.temizAltin = S.gold >= clearCost();
    for (const t of bos) t.b = null; const i = S.grid.findIndex(t => t.open && !t.b); S.grid[i].b = 'in'; await bek(1300); o.adim3 = EO2.rehber.aktif() && EO2.rehber.aktif().id;
    S.eggs = []; S.dragons = S.dragons.filter(d => d.name !== 'Dolgu'); return o; });
  await cek('8_engel');
  await p.evaluate(() => { const y = mkDragon({ name: 'Minik', sex: 'M', genes: randomGenes({ q: 0.1 }), stage: 'yavru', age: 0, traits: [], bond: 40, mood: 3 }); y.eternalYouth = true; S.dragons.push(y); EO2.rehber.olay('zindan'); EO2.rehber.ekran('bedesten'); S.ors = { kademe: 1, deneme: 1 }; }); await dur(1600);
  log.b7 = await aktif(); await kartKapat(); log.hanAcik = await acilir('han');
  await p.evaluate(() => EO2.api.go('master')); await bekle('EO2.api.scene() === "master"', 15000); await dur(2500);
  log.ayaz = await p.evaluate(() => EO2.api.remotes.some(c => c.name === 'Ayaz') && EO2.api.sceneState().L.interact.some(i => i.act === 'rehber:ayaz')); await cek('6_ayaz');
  await p.evaluate(() => EO2.api.runAct('rehber:ayaz')); await dur(800); await cek('7_ayaz_pen'); await p.evaluate(() => { const x = [...document.querySelectorAll('.pen .gbtn')].find(b => /Dost ol/.test(b.textContent)); if (x) x.click(); }); await dur(1200);
  log.dost = await p.evaluate(() => !!EO2.rehber.gorulen()['o-dost']); log.b7b = await aktif();
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.v2 && log.b1 === 'a-kulucka' && log.b2 === 't-talim' && log.kart2 && log.topcuAcik && log.arenaKapali && log.pazarKapali && log.seritKilit && log.topcuYonerge && log.b3 === 'k-harita' && log.arenaAcik3 && log.pazarKapali3 &&
  log.b3b === 'k-kusam' && log.kusamAltin >= 120 && log.b4 === 'u-yuva' && log.yuvaAltin && log.b4c === 'u-damizlik' && log.armagan && log.armagan.ogretici && log.armagan.price === 0 && (log.b4engel === 'e-in' || log.b4engel === 'u-ciftles') && log.b4d === 'u-ciftles' && log.yakinlik >= 60 && log.ciftHazir && log.defter === 7 && log.engel && log.engel.adim === 'e-in' && log.engel.inAltin && log.engel.adim2 === 'e-arazi' && log.engel.temizAltin && log.engel.adim3 === 'z-yavru' && log.ayaz && log.dost && log.b7b === 'b-masa';
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 8) }, null, 1)); process.exit(ok ? 0 : 1);
