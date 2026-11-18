// EO2 · görüntü aracı: yeni oyuncunun ilk haftası (Ejderhalar ekranı, alt düğmelerin her biri, emir verme, Haftayı Bitir ve hafta sonu özeti).
// Emir ve hafta sonu akışının yeni başlayana ne kadar anlaşılır olduğunu gözle denetlemek içindir; bir şey ölçmez.
// Kullanım: node eo2/tools/shot_ilk_hafta.mjs <klasör>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const out = process.argv[2] || 'ilk_hafta'; fs.mkdirSync(out, { recursive: true }); let n = 0;
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => console.log('hata:', e.message));
const cek = async ad => { n++; await p.screenshot({ path: path.join(out, String(n).padStart(2, '0') + '_' + ad + '.png') }); }, dur = ms => p.waitForTimeout(ms);
const adim = async (ad, f) => { try { await f(); await cek(ad); } catch (e) { console.log(ad + ': ' + String(e.message).slice(0, 200)); } };
await p.goto(process.env.URL || 'http://localhost:3210/'); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await dur(1000);
await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await dur(400); await p.locator('.pen input').first().fill('Aylin'); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
await p.waitForFunction('EO2.game.live', null, { timeout: 30000 }); await dur(2500);
await adim('ejderhalar', async () => { await p.evaluate(() => EO2.game.open('ejderhalar')); await dur(1500); await p.evaluate(() => document.querySelectorAll('.rehber .rh-kapat').forEach(k => k.click())); await dur(300); });
const alt = await p.evaluate(() => [...document.querySelectorAll('#scrB button')].map(b => b.textContent.trim()).filter(Boolean)); console.log('düğmeler:', alt.join(' | '));
for (const ad of ['Emir', 'Besle', 'Bakım', 'Kuşam', 'Rol', 'Bilgi']) await adim('ej_' + ad, async () => { await p.evaluate(() => { document.querySelectorAll('.pen-perde .pen-kapat, .pen [data-v="false"]').forEach(k => k.click()); }); await dur(300); await p.locator('#scrB button:has-text("' + ad + '")').first().click({ timeout: 4000 }); await dur(1100); });
await adim('emir_secildi', async () => { await p.locator('#scrB button:has-text("Emir")').first().click({ timeout: 4000 }).catch(() => { }); await dur(700); await p.locator('[data-train="gu"]').first().click({ timeout: 4000 }); await dur(1200); });
await adim('hafta_bitir_1', async () => { await p.evaluate(() => { EO2.game.endWeek(); }); await dur(2200); });
for (let i = 2; i <= 7; i++) await adim('hafta_bitir_' + i, async () => { const ad = await p.evaluate(() => { const L = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 4 && t && (t === b || b.contains(t)) && !b.closest('#hud, #scr, #chat, .rehber'); }); const b = L[L.length - 1]; if (!b) return ''; const t = b.textContent.trim(); b.click(); return t; }); console.log('basıldı:', ad || '(düğme yok)'); await dur(2200); });
await b.close(); console.log('yazıldı:', out, n);
