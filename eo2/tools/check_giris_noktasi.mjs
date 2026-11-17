// EO2 · giriş noktası denetimi: her sahneye, o sahneye açılan her komşudan girilir; oyuncu yerleştiğinde bir nesnenin ya da sınırın
// içinde kalmamalı (2026-11-17: bahçeden Merkez Meydan'a dönünce oyuncu bir nesnenin içine düşüyor, yürüyemiyordu).
// Ayrıca hatalı tanımlı giriş noktaları (nesnenin içine düşenler) uyarı olarak listelenir; oyun bunları en yakın boş yere kaydırır.
// Kullanım: node eo2/tools/check_giris_noktasi.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', hata = [];
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
let r = { sikisan: [], uyari: [], gecis: 0 };
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000);
  r = await p.evaluate(async () => { const A = EO2.api, out = { sikisan: [], uyari: [], gecis: 0 }, PR = 0.3, adlar = Object.keys(EO2.sceneDefs).filter(i => !['pilot', 'deneme', 'pist', 'kamp'].includes(i));
    const dolu = (L, x, y) => x < L.bounds[0] || x > L.bounds[1] || y < L.bounds[2] || y > L.bounds[3] || L.rects.some(q => x > q[0] - PR && x < q[1] + PR && y > q[2] - PR && y < q[3] + PR) || L.circles.some(c => (x - c[0]) ** 2 + (y - c[1]) ** 2 < (c[2] + PR) ** 2);
    const git = async ad => { A.go(ad); for (let i = 0; i < 80 && (A.scene() !== ad || document.getElementById('iris').classList.contains('on')); i++) await new Promise(q => setTimeout(q, 100)); return A.scene() === ad; };
    for (const hedef of adlar) { if (!(await git(hedef))) continue; const L = A.sceneState().L; if (dolu(L, L.start.x, L.start.y)) out.uyari.push(hedef + ': başlangıç noktası dolu');
      for (const kaynak of Object.keys(L.entry || {})) { if (dolu(L, L.entry[kaynak].x, L.entry[kaynak].y)) out.uyari.push(hedef + ' ← ' + kaynak + ': giriş noktası dolu');
        if (!adlar.includes(kaynak) || !(await git(kaynak)) || !(await git(hedef))) continue; out.gecis++; const pl = A.player, L2 = A.sceneState().L; if (dolu(L2, pl.x, pl.y)) out.sikisan.push(hedef + ' ← ' + kaynak); } }
    return out; });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && !r.sikisan.length && r.gecis > 0;
console.log(JSON.stringify({ ok, gecis: r.gecis, sikisan: r.sikisan, uyari: r.uyari, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
