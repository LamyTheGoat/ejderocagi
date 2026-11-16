// EO2 · ekran föyü: bütün ekranların küçük görüntülerini birkaç sayfada toplar (gözle denetim için).
// Kullanım: node eo2/tools/ekran_foyu.mjs <çıktı klasörü> [--mobil] [--dik]
//   Varsayılan 1280×720; --mobil yatay telefon (844×390, dokunmatik); --dik dik telefon (390×844).
// Çıktı: foy_<kip>_<n>.jpg (her sayfada dört ya da altı ekran, sol üstte ekranın kimliği) ve sayfa hataları.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const out = process.argv[2] || 'eo2_foy', mobil = process.argv.includes('--mobil'), dik = process.argv.includes('--dik'), url = process.env.URL || 'http://localhost:3210/'; fs.mkdirSync(out, { recursive: true });
const kip = dik ? 'dik' : mobil ? 'mobil' : 'masa', vp = dik ? { width: 390, height: 844 } : mobil ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(mobil || dik ? { viewport: vp, hasTouch: true, isMobile: true } : { viewport: vp }), p = await ctx.newPage(), hata = [];
p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1500);
const kareler = [], cek = async ad => { kareler.push({ ad, veri: (await p.screenshot({ type: 'jpeg', quality: 80 })).toString('base64') }); };
await cek('giris');
await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400); if (await p.locator('.pen:has-text("silinsin")').count()) { await p.locator('.pen .gbtn:has-text("Yeni ocak kur")').click(); await p.waitForTimeout(400); }
await cek('mektup'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500);
await p.evaluate(() => { const y = document.querySelector('.yatay-oneri .yo-hayir'); if (y) y.click(); });
await cek('meydan');
const ekranlar = (process.env.EKRANLAR || 'ejderhalar arena pazar bedesten han kiraathane siralama defter canta sandik sefer yuva saray kule divan kutuk muzayede siparis sus topcu yaris damizlik sancak kervan boss ayarlar menu').split(/\s+/);
for (const id of ekranlar) {
  const acildi = await p.evaluate(id => { try { EO2.game.open(id); return EO2.game.ekran() === id; } catch (e) { return String(e.message); } }, id);
  await p.waitForTimeout(900); await cek(id + (acildi === true ? '' : ' (açılmadı: ' + acildi + ')'));
  await p.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(w => w.remove()); try { EO2.game.close(); } catch (_) { } }); await p.waitForTimeout(250);
}
// föy sayfaları
const sutun = dik ? 4 : 2, satir = dik ? 1 : mobil ? 3 : 2, adet = sutun * satir, en = Math.floor(1280 / sutun), boy = Math.round(en * vp.height / vp.width);
const f = await (await b.newContext({ viewport: { width: 1280, height: boy * satir } })).newPage(); let n = 0;
for (let i = 0; i < kareler.length; i += adet) {
  await f.setContent('<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(' + sutun + ',' + en + 'px)">' + kareler.slice(i, i + adet).map(k => '<div style="position:relative;width:' + en + 'px;height:' + boy + 'px"><img style="width:100%;height:100%;display:block" src="data:image/jpeg;base64,' + k.veri + '"><b style="position:absolute;left:0;top:0;padding:2px 8px;font:700 13px sans-serif;color:#fff;background:#c0392b">' + k.ad + '</b></div>').join('') + '</body>');
  await f.waitForTimeout(200); await f.screenshot({ path: path.join(out, 'foy_' + kip + '_' + (++n) + '.jpg'), type: 'jpeg', quality: 82 });
}
await b.close(); console.log(JSON.stringify({ kip, ekran: kareler.length, sayfa: n, hata: hata.slice(0, 10) }));
