// EO2 · arayüz bindirme denetimi: iki tarayıcı parti kurar (parti çerçevesi görünsün diye); dünya görünümünde ekrandaki sabit arayüz
// parçalarının (üst şerit, hedefler, hafta düğmesi, parti çerçevesi, sohbet, jest çubuğu, eylem çubuğu, harita, bildirim tepsisi,
// rehber ipucu) kutuları ölçülür; birbirine binen çiftler raporlanır. Birkaç ekran boyunda, hedefler açık ve küçültülmüş hâlde koşar.
// Kullanım: node eo2/tools/check_binme.mjs   (EKRAN=<klasör> ile her boyun ekran görüntüsü; DOK=1 ile ölçülen kutular da yazılır)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '';
if (ekran) fs.mkdirSync(ekran, { recursive: true });
const BOYLAR = [[1280, 720], [1366, 768], [1100, 700], [1024, 640], [1600, 900], [1920, 1080], [844, 390], [740, 360], [390, 844], [360, 740]];
// ölçülen parçalar: [ad, seçici]. Bir parçanın içindeki öteki parça (ör. hedeflerin içindeki hafta düğmesi) ayrı ölçülür.
const PARCA = [['logo', '#hud .tl .logo'], ['profil', '#profile'], ['kese', '#hud .tc .chip'], ['ustsag', '#hud .tr .row > .rb, #hud .tr .row > button'], ['harita', '#hud .minimap'], ['hedefler', '.quests'], ['hafta', '#btnWeek'], ['parti', '#partiCerceve'], ['sohbet', '#chat, #chat > *'],
  ['jest', '#emotes'], ['eylem', '#actions'], ['bildirim', '.bildirimler .bildirim'], ['ipucu', '.rehber'], ['dokun', '#btnE'], ['kol', '#joy']];
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], binme = [], dok = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.parti && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const olc = p => p.evaluate(PARCA => { const out = []; for (const [ad, sec] of PARCA) { let k = 0; for (const el of document.querySelectorAll(sec)) { const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (el.id === 'chat' && (cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor))) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || r.width < 4 || r.height < 4 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;
      out.push({ ad: ad + (k++ ? k : ''), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), ic: [...document.querySelectorAll(sec)].some(o => o !== el && o.contains(el)) }); } }
    const tasan = out.filter(o => !/^logo/.test(o.ad) && (o.x < -1 || o.y < -1 || o.x + o.w > innerWidth + 1 || o.y + o.h > innerHeight + 1)).map(o => o.ad); return { out: out.filter(o => !o.ic), tasan }; }, PARCA);
// iç içe sayılan çiftler (biri ötekinin parçası ya da bilerek üstünde)
const SERBEST = new Set(['hedefler|hafta']);
function cakisan(L) { const c = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], q = L[j], ad = [a.ad.replace(/\d+$/, ''), q.ad.replace(/\d+$/, '')]; if (ad[0] === ad[1] || SERBEST.has(ad.join('|')) || SERBEST.has(ad.reverse().join('|'))) continue;
    const w = Math.min(a.x + a.w, q.x + q.w) - Math.max(a.x, q.x), h = Math.min(a.y + a.h, q.y + q.h) - Math.max(a.y, q.y); if (w > 3 && h > 3) c.push(a.ad + ' × ' + q.ad + ' (' + w + '×' + h + ')'); } return c; }
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  await A.waitForFunction('EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle', null, { timeout: 15000 });
  await A.evaluate(() => { const c = [...EO2.meydanAg.kisiler.values()][0]; EO2.parti.davet(c.handle, c.name); });
  await B.waitForSelector('.pen:has-text("partisine çağırıyor")', { timeout: 12000 }); await B.locator('.pen .gbtn:has-text("Partiye katıl")').click();
  await A.waitForFunction('document.querySelectorAll("#partiCerceve .pt-uye").length === 2', null, { timeout: 12000 });
  await A.evaluate(() => { EO2.hooks.sohbet('/p merhaba', 'genel'); EO2.game.toast('Deneme bildirimi: arayüz ölçülüyor.'); });
  for (const [w, h] of BOYLAR) for (const kucuk of [false, true]) { await A.setViewportSize({ width: w, height: h }); await A.waitForTimeout(900);
    await A.evaluate(k => { const q = document.querySelector('.quests'); if (q && q.classList.contains('kucuk') !== k) { const hh = q.querySelector('h3'); if (hh) hh.click(); } EO2.game.toast('Deneme bildirimi: arayüz ölçülüyor.'); }, kucuk); await A.waitForTimeout(500);
    const ad = w + 'x' + h + (kucuk ? '_kucuk' : ''), r = await olc(A); dok[ad] = r.out; for (const c of cakisan(r.out)) binme.push(ad + ': ' + c); for (const t of r.tasan) binme.push(ad + ': ' + t + ' ekrandan taşıyor');
    if (ekran) await A.screenshot({ path: path.join(ekran, 'binme_' + ad + '.png') }); }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && !binme.length;
console.log(JSON.stringify(Object.assign({ ok, binme, hata: hata.slice(0, 10) }, process.env.DOK ? { dok } : {}), null, 1));
process.exit(ok ? 0 : 1);
