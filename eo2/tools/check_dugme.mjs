// EO2 · düğme denetimi (tek tarayıcı): her ekrandaki her düğmenin yazısı düğmenin içinde ortada mı, kenarlara taşıyor ya da kesiliyor mu.
// Ölçülenler (yalnız .gbtn düğmeleri): yazının yatay ortası düğmenin ortasından 3 pikselden fazla kaçıksa "ortada değil";
// yazı düğmenin dışına taşıyorsa "taşıyor"; düğme 16:9 ekranın dışına çıkıyorsa "ekran dışı".
// Kullanım: node eo2/tools/check_dugme.mjs   (VP=1920x1080 · EKRANLAR="arena pazar")
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', VP = (process.env.VP || '1280x720').split('x').map(Number);
const EKRANLAR = (process.env.EKRANLAR || 'ejderhalar arena pazar bedesten han kiraathane siralama defter canta sandik sefer yuva saray kule divan kutuk muzayede siparis sus topcu yaris damizlik sancak kervan boss ayarlar menu gorunus harita masa takim zindan ors dostlar ermeydani').split(/\s+/);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: VP[0], height: VP[1] } })).newPage(), hata = [], sorun = [];
p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
const olc = () => { const out = [], W = innerWidth, H = innerHeight; for (const e of document.querySelectorAll('#app button.gbtn, #app .gbtn[role="button"]')) { const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05 || e.closest('[hidden]')) continue;
    const ust = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2))); if (!ust || !(ust === e || e.contains(ust))) continue;   // görünmeyen (üstü örtülü, kaydırılmış) düğme ölçülmez
    const ad = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28) || e.className; if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push('ekran dışı: "' + ad + '"');
    const rg = document.createRange(); rg.selectNodeContents(e); const kutular = [...rg.getClientRects()].filter(q => q.width > 1 && q.height > 1); if (!kutular.length) continue;
    const sol = Math.min(...kutular.map(q => q.left)), sag = Math.max(...kutular.map(q => q.right)), ustY = Math.min(...kutular.map(q => q.top)), altY = Math.max(...kutular.map(q => q.bottom));
    if (sol < r.left - 1 || sag > r.right + 1 || ustY < r.top - 2 || altY > r.bottom + 2) out.push('taşıyor: "' + ad + '" (' + Math.round(Math.max(r.left - sol, sag - r.right, r.top - ustY, altY - r.bottom)) + 'px)');
    const kacik = (sol + sag) / 2 - (r.left + r.width / 2); if (Math.abs(kacik) > 3 && !e.querySelector('img, svg, canvas, i') && e.id !== 'btnWeek')   /* btnWeek: solunda taç, sağında hafta yazan satır düzeni (bilinçli) */ out.push('ortada değil: "' + ad + '" (' + Math.round(kacik) + 'px)'); } return out; };
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  for (const s of await p.evaluate(olc)) sorun.push('giris · ' + s);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(600); for (const s of await p.evaluate(olc)) sorun.push('mektup · ' + s);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForFunction('EO2.game.live', null, { timeout: 30000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { S.gold = 5000; window.canEnterZindanOrTopcu = () => true; }); for (const s of await p.evaluate(olc)) sorun.push('meydan · ' + s);
  for (const id of EKRANLAR) { const acildi = await p.evaluate(e => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.open(e); return EO2.game.ekran() === e; }, id); if (!acildi) continue; await p.waitForTimeout(1300);
    for (const s of new Set(await p.evaluate(olc))) sorun.push(id + ' · ' + s); }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
console.log(JSON.stringify({ ok: !hata.length && !sorun.length, boy: VP.join('x'), sorun, hata: hata.slice(0, 8) }, null, 1));
process.exit(!hata.length && !sorun.length ? 0 : 1);
