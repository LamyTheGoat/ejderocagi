// EO2 · ilk hafta kilidi denetimi (gerçek akış): yeni oyuncu ilk haftada yalnız öğreticinin üç adımını yapabilir.
// Ölçülenler: kuluçka adımında başka yapı kurulamaz (altın harcanmaz), arazi açılamaz, kuşam alınamaz, başka ekran açılmaz, ocaktan çıkılmaz;
// Kuluçka Ocağı kurulabilir ve yumurta yerleşir; emir adımında Ejderhalar açılır ama yalnız Emir ve Bilgi çalışır, yapı kurulamaz, kuluçka yıkılamaz;
// emir verilince hafta bitirilebilir; ikinci haftada kilit kalkar ve her yer açılır.
// Kullanım: node eo2/tools/check_kilit.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { window.__gercekAkis = true; });
const p = await ctx.newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (f, ms = 30000) => p.waitForFunction(f, null, { timeout: ms }).then(() => true, () => false), dur = ms => p.waitForTimeout(ms), cek = async ad => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const kareAc = tur => p.evaluate(t => { const i = S.grid.findIndex(q => t === 'bos' ? q.open && !q.b : t === 'cali' ? !q.open : q.b === t); if (i < 0) return -1; EO2.api.runAct('kare:' + i); return i; }, tur);
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.rehber && document.querySelector(".giris")', null, { timeout: 60000 }); await dur(900);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await dur(400); await p.locator('.pen input').first().fill('Aylin'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await bekle('EO2.game.ekran() === "gorunus" && document.querySelector("[data-gr-hazir]")'); await dur(700); await p.locator('[data-gr-hazir]').click();
  await bekle('EO2.api.scene() === "ocak" && !EO2.game.ekran()', 40000); await dur(1500);
  // 1) kuluçka adımı
  log.adim1 = await p.evaluate(() => EO2.rehber.kilit()); const altin0 = await p.evaluate(() => S.gold), yapi0 = await p.evaluate(() => S.grid.filter(q => q.b).length);
  log.bosKare = await kareAc('bos'); await bekle('document.querySelector("#ocTepsi .ocp-yapi")', 8000); await dur(500);
  log.vitrin = await p.evaluate(() => { const L = [...document.querySelectorAll('#ocTepsi .ocp-yapi')], k = L.find(b => b.dataset.build === 'kulucka'); return { kuluckaVar: !!k, kuluckaSecili: !!k && k.classList.contains('sec'), kuluckaAcik: !!k && !k.classList.contains('kilitli'), otekilerSoluk: L.filter(b => b.dataset.build !== 'kulucka').every(b => b.classList.contains('kilitli')), sayi: L.length }; }); await cek('kilit_1_vitrin');
  // başka bir yapıya basılır → kurulmaz, altın gitmez
  const baska = await p.evaluate(() => { const b = [...document.querySelectorAll('#ocTepsi .ocp-yapi')].find(x => x.dataset.build !== 'kulucka' && BUILD[x.dataset.build].fiyat <= S.gold); return b ? b.dataset.build : null; });
  if (baska) { await p.locator('#ocTepsi .ocp-yapi[data-build="' + baska + '"]').click(); await dur(500); }   /* kilitli yapıya basmak kurmaz; seçim Kuluçka'da kalır (Kur düğmesi Kuluçka'yı kurar, o aşağıda ölçülür) */
  log.baskaKurulmadi = await p.evaluate(([a, n]) => S.gold === a && S.grid.filter(q => q.b).length === n, [altin0, yapi0]); log.baska = baska;
  await p.evaluate(() => { const x = document.querySelector('#ocTepsi [data-kapat]'); if (x) x.click(); }); await dur(300);
  // arazi açma kapalı (boş kare varken)
  log.cali = await kareAc('cali'); await dur(600); log.araziKapali = await p.evaluate(a => { const d = document.querySelector('#ocTepsi [data-clear]'), n = S.cleared; if (d && !d.disabled) d.click(); const ok = S.gold === a && S.cleared === n; const x = document.querySelector('#ocTepsi [data-kapat]'); if (x) x.click(); return ok; }, altin0); await dur(300);
  // kuşam alınamaz, başka ekran ve yer kapalı
  log.kusamKapali = await p.evaluate(a => EO2.gorunum.satinAl('temel') === false && S.gold === a, altin0);
  log.ekranKapali = await p.evaluate(async () => { for (const e of ['arena', 'pazar', 'topcu', 'harita', 'ermeydani', 'ejderhalar']) { EO2.game.open(e); if (EO2.game.ekran()) return e; } EO2.api.go('meydan'); await new Promise(r => setTimeout(r, 1400)); return EO2.api.scene() === 'ocak' ? '' : 'yer'; });
  // Kuluçka Ocağı kurulur, yumurta yerleşir
  await kareAc('bos'); await bekle('document.querySelector("#ocTepsi .ocp-yapi[data-build=kulucka]")', 8000); await dur(400); await p.locator('#ocTepsi [data-kur]').click(); await dur(900);
  log.kuluckaKuruldu = await p.evaluate(([a, n]) => S.grid.some(q => q.b === 'kulucka') && S.grid.filter(q => q.b).length === n + 1 && S.gold >= a - BUILD.kulucka.fiyat && S.gold < a && S.eggs.some(e => e.inK), [altin0, yapi0]); await dur(900);
  // 2) emir adımı
  log.adim2 = await p.evaluate(() => EO2.rehber.kilit()); const altin1 = await p.evaluate(() => S.gold);
  await kareAc('bos'); await dur(700); if (await p.locator('#ocTepsi [data-kur]').count()) await p.locator('#ocTepsi [data-kur]').click().catch(() => { }); await dur(400);
  log.yapiKapali2 = await p.evaluate(([a, n]) => { const ok = S.gold === a && S.grid.filter(q => q.b).length === n + 1; const x = document.querySelector('#ocTepsi [data-kapat]'); if (x) x.click(); return ok; }, [altin1, yapi0]); await dur(300);
  await kareAc('kulucka'); await dur(700); log.yikKapali = await p.evaluate(async () => { const d = document.querySelector('#ocTepsi [data-demolish]'); if (d) d.click(); await new Promise(r => setTimeout(r, 400)); const pen = !!document.querySelector('.pen-perde'), ok = !pen && S.grid.some(q => q.b === 'kulucka'); const x = document.querySelector('#ocTepsi [data-kapat]'); if (x) x.click(); return ok; }); await dur(300);
  log.haftaErken = await p.evaluate(async () => { const h = S.week; EO2.game.endWeek(); await new Promise(r => setTimeout(r, 500)); return S.week === h && !document.querySelector('.gece, .pen-perde'); });
  await p.evaluate(() => EO2.game.open('ejderhalar')); log.ejderhalarAcik = await bekle('EO2.game.ekran() === "ejderhalar" && document.querySelector("[data-mod=antrenman]")', 8000); await dur(900);
  await p.locator('[data-mod="besle"]').click(); await dur(400); log.besleKapali = await p.evaluate(() => document.querySelector('[data-mod="besle"]').getAttribute('aria-pressed') !== 'true');
  log.sekmeKapali = await p.evaluate(() => { EO2.game.open('yuva'); return EO2.game.ekran() === 'ejderhalar'; });
  await p.locator('[data-mod="antrenman"]').click(); await bekle('document.querySelector("[data-train=gu]")', 6000); await dur(400); await cek('kilit_2_emir'); await p.locator('[data-train="gu"]').click(); await dur(900);
  // 3) hafta adımı
  log.adim3 = await p.evaluate(() => EO2.rehber.kilit());
  await p.evaluate(() => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.endWeek(); }); log.geceGeldi = await bekle('document.querySelector(".gece")', 15000);
  for (let i = 0; i < 12 && !(await p.evaluate(() => S.week >= 2 && !EO2.game.busy)); i++) { await p.evaluate(() => { const L = [...document.querySelectorAll('.gece button, .pen button, .sabah button, .vn button, .cizgi button, #modal-root button')].filter(b => b.offsetParent !== null); const d = L[L.length - 1]; if (d) d.click(); }); await dur(1800); }
  log.hafta2 = await p.evaluate(() => S.week);
  log.kilitKalkti = await p.evaluate(() => { const k = EO2.rehber.kilit() === null; if (EO2.game.ekran()) EO2.game.close(); EO2.game.open('arena'); const a = EO2.game.ekran() === 'arena'; EO2.game.close(); return k && a; }); await cek('kilit_3_hafta2');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const V = log.vitrin || {};
const ok = !hata.length && log.adim1 === 'a-kulucka' && log.bosKare >= 0 && V.kuluckaVar && V.kuluckaSecili && V.kuluckaAcik && V.otekilerSoluk && !!log.baska && log.baskaKurulmadi && log.araziKapali && log.kusamKapali && log.ekranKapali === '' && log.kuluckaKuruldu &&
  log.adim2 === 'a-emir' && log.yapiKapali2 && log.yikKapali && log.haftaErken && log.ejderhalarAcik && log.besleKapali && log.sekmeKapali && log.adim3 === 'a-hafta' && log.geceGeldi && log.hafta2 >= 2 && log.kilitKalkti;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 8) }, null, 1)); process.exit(ok ? 0 : 1);
