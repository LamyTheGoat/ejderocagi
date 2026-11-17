// EO2 · eksik dosya ve konsol hatası denetimi: yeni ocak kurulur, bütün ekranlar ve sahneler gezilir;
// yüklenemeyen her dosya (resim, ses, betik, yazı tipi: 404 ya da ağ hatası) ve her konsol hatası raporlanır.
// Kullanım: node eo2/tools/check_eksik_dosya.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', eksik = new Map(), konsol = new Set(), hata = [];
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
let yer = 'açılış';
p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(url)) eksik.set(r.url().slice(url.length).split('?')[0], r.status() + ' · ' + yer); });
p.on('requestfailed', r => { if (r.url().startsWith(url) && !/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) eksik.set(r.url().slice(url.length).split('?')[0], 'ağ · ' + yer); });
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) konsol.add(yer + ' · ' + m.text().slice(0, 160)); });
p.on('pageerror', e => hata.push(yer + ' · ' + String(e.message).slice(0, 160)));
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000);
  const ekranlar = 'ejderhalar arena pazar bedesten han kiraathane masa dostlar siralama defter canta sandik sefer yuva saray kule divan kutuk muzayede siparis sus topcu yaris damizlik sancak kervan boss ayarlar menu zindan gorunus takim ors harita ermeydani'.split(' ');
  for (const id of ekranlar) { yer = 'ekran ' + id; const ok = await p.evaluate(id => { try { EO2.game.open(id); return EO2.game.ekran() === id; } catch (e) { return false; } }, id); await p.waitForTimeout(ok ? 900 : 100);
    await p.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(w => w.remove()); try { EO2.game.close(); } catch (_) { } }); await p.waitForTimeout(150); }
  const sahneler = await p.evaluate(() => Object.keys((EO2.bolumler || EO2.api.scenes && EO2.api.scenes()) || {}));
  for (const s of sahneler) { yer = 'sahne ' + s; await p.evaluate(s => { try { EO2.api.go(s); } catch (_) { } }, s); await p.waitForTimeout(1400); }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 200)); }
await b.close();
const ok = !eksik.size && !konsol.size && !hata.length;
console.log(JSON.stringify({ ok, eksik: [...eksik].map(([k, v]) => k + ' (' + v + ')'), konsol: [...konsol].slice(0, 15), hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
