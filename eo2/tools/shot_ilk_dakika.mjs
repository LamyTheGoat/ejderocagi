// EO2 · görüntü aracı: yeni bir oyuncunun ilk dakikaları (gerçek akış: görünüş seçimi, ocak, öğretici, ejderhalar, hafta sonu, arena, ilk talim atışı).
// Oyunun yeni başlayana ne kadar anlaşılır göründüğünü gözle denetlemek içindir; bir şey ölçmez.
// Kullanım: node eo2/tools/shot_ilk_dakika.mjs <klasör>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const out = process.argv[2] || 'ilk_dakika'; fs.mkdirSync(out, { recursive: true }); let n = 0;
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { window.__gercekAkis = true; });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('hata:', e.message));
const cek = async ad => { n++; await p.screenshot({ path: path.join(out, String(n).padStart(2, '0') + '_' + ad + '.png') }); }, bekle = (f, ms = 30000) => p.waitForFunction(f, null, { timeout: ms }).then(() => true, () => false), dur = ms => p.waitForTimeout(ms);
const adim = async (ad, f) => { try { await f(); await cek(ad); } catch (e) { console.log(ad + ': ' + String(e.message).slice(0, 160)); } };
await p.goto(process.env.URL || 'http://localhost:3210/'); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await dur(1200); await cek('giris');
await adim('ad', async () => { await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await dur(500); });
await adim('gorunus_secimi', async () => { await p.locator('.pen input').first().fill('Aylin'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await bekle('EO2.game.ekran() === "gorunus"'); await dur(1200); });
await adim('ocak_ilk_an', async () => { await p.locator('[data-gr-hazir]').click(); await bekle('EO2.api.scene() === "ocak" && !EO2.game.ekran()', 40000); await dur(2500); });
await adim('ocak_5sn', async () => { await dur(5000); });
await adim('kilit_geri_cevirir', async () => { await p.evaluate(() => { EO2.game.open('arena'); }); await dur(700); });
await adim('kilit_gecildi', async () => { await p.evaluate(() => { EO2.rehber.kilitGec(); }); await dur(900); });
await adim('ogretici_adim', async () => { await p.evaluate(() => { const k = document.querySelector('.rehber .rh-kapat'); if (k) k.click(); }); await dur(2500); });
for (const e of ['ejderhalar', 'ocak', 'hafta', 'defter', 'harita', 'topcu', 'ermeydani', 'arena', 'gorunus', 'menu']) await adim('ekran_' + e, async () => { await p.evaluate(id => { if (EO2.game.ekran()) EO2.game.close(); try { EO2.game.open(id); } catch (_) { } }, e); await dur(1500); });
await adim('talim_ilk_tur', async () => { await p.evaluate(() => { if (EO2.game.ekran()) EO2.game.close(); EO2.topcu.baslat('talim'); }); await bekle('EO2.battle.active() && EO2.battle.state().faz === "nisan"', 60000); await dur(2500); });
await adim('talim_guc', async () => { await p.keyboard.down('Space'); await dur(700); });
await adim('talim_ucus', async () => { await p.keyboard.up('Space'); await dur(1800); });
await adim('talim_rakip', async () => { await dur(4500); });
await b.close(); console.log('yazıldı:', out, n);
