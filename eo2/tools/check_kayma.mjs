// EO2 · "basınca hiçbir şey kaymasın" denetimi (tek tarayıcı).
// Her ekran açılır ve iki şey ölçülür:
//   1) BASMA: görünen her düğmenin üstüne gelinir ve basılı tutulur (bırakma düğmenin dışında yapılır: tıklama sayılmaz). O sırada ekrandaki öteki
//      düğmelerin, yazı kutularının ve panellerin yeri değişiyorsa "kayma"dır (ör. basılınca kalınlaşan çerçeve komşuyu iter).
//   2) YENİDEN ÇİZİM: ekran yeniden çizilir (her dokunuşta olan şey); parçalar 60 ms sonra aynı yerde değilse giriş canlandırması yeniden oynuyor demektir.
// Kullanım: node eo2/tools/check_kayma.mjs [--mobil] [--dik]   (EKRANLAR="arena pazar" ile daraltılır · VP=1920x1080)
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const mobil = process.argv.includes('--mobil'), dik = process.argv.includes('--dik'), url = process.env.URL || 'http://localhost:3210/';
const VP = process.env.VP ? process.env.VP.split('x').map(Number) : dik ? [390, 844] : mobil ? [844, 390] : [1280, 720], vp = { width: VP[0], height: VP[1] };
const EKRANLAR = (process.env.EKRANLAR || 'ejderhalar arena pazar bedesten han kiraathane siralama defter canta sandik sefer yuva saray kule divan kutuk muzayede siparis sus topcu yaris damizlik sancak kervan boss ayarlar menu gorunus harita masa takim zindan ors dostlar').split(/\s+/);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext(mobil || dik ? { viewport: vp, hasTouch: true, isMobile: true } : { viewport: vp })).newPage(), hata = [], sorun = [];
p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
/* ölçülen parçalar: düğmeler, girişler, sekmeler ve ekran gövdesinin doğrudan iç kutuları */
const olc = () => { const out = []; let n = 0; for (const e of document.querySelectorAll('#scr button, #scr input, #scr [role="tab"], #scrB > *, #scrB > * > *, #hud .tc .chip')) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue; e.dataset.kay = String(n); out.push([n++, Math.round(r.left * 2) / 2, Math.round(r.top * 2) / 2, Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2, (e.id || (typeof e.className === 'string' && e.className) || e.tagName).toString().slice(0, 40)]); } return out; };
const fark = (a, c, haric) => { const o = []; const M = new Map(c.map(q => [q[0], q])); for (const q of a) { if (haric.has(q[0])) continue; const y = M.get(q[0]); if (!y) continue; const d = Math.max(Math.abs(q[1] - y[1]), Math.abs(q[2] - y[2]), Math.abs(q[3] - y[3]), Math.abs(q[4] - y[4])); if (d >= 1) o.push(q[5] + ' ' + d + 'px'); } return o; };
const fark0 = (a, c) => { const o = [], M = new Map(c.map(q => [q[0], q])); for (const q of a) { const y = M.get(q[0]); if (y && Math.max(Math.abs(q[1] - y[1]), Math.abs(q[2] - y[2]), Math.abs(q[3] - y[3]), Math.abs(q[4] - y[4])) >= 0.5) o.push(q[0]); } return o; };
const yenidenOlc = () => { const out = []; for (const e of document.querySelectorAll('[data-kay]')) { const r = e.getBoundingClientRect(); out.push([+e.dataset.kay, Math.round(r.left * 2) / 2, Math.round(r.top * 2) / 2, Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2, '']); } return out; };
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForFunction('EO2.game.live', null, { timeout: 30000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { S.gold = 5000; window.canEnterZindanOrTopcu = () => true; document.querySelectorAll('.rehber .rh-kapat').forEach(k => k.click()); });
  for (const id of EKRANLAR) { const acildi = await p.evaluate(e => { if (EO2.game.ekran()) EO2.game.close(); EO2.game.open(e); return EO2.game.ekran() === e; }, id); if (!acildi) continue; await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('.rehber .rh-kapat').forEach(k => k.click()); document.querySelectorAll('.bildirim').forEach(k => k.remove()); }); await p.waitForTimeout(250);
    // 1) basma
    /* kendi kendine oynayan parçalar (soluk alan ejderha, süzülen logo) ölçüm dışıdır: dokunulmadan iki ölçüm arasında yeri değişenler */
    const ilk = await p.evaluate(olc); await p.waitForTimeout(260); const oynak = new Set(fark0(ilk, await p.evaluate(yenidenOlc))); for (let k = 0; k < 5; k++) { await p.waitForTimeout(230); for (const n of fark0(ilk, await p.evaluate(yenidenOlc))) oynak.add(n); }
    const once = (await p.evaluate(olc)).filter(q => !oynak.has(q[0])), dugmeler = once.filter(q => /gbtn|BUTTON|button|tab|gr-|tp-yer|kr-|pz-|ar-/.test(q[5]) || true).slice(0, 400), denenen = new Set(); let say = 0;
    for (const q of dugmeler) { if (say >= 14) break; const [n, x, y, w, h] = q; const cx = x + w / 2, cy = y + h / 2; if (cx < 2 || cy < 2 || cx > vp.width - 2 || cy > vp.height - 2 || w > 420 || h > 160) continue;
      const tip = await p.evaluate(({ cx, cy, n }) => { const t = document.elementFromPoint(cx, cy), e = document.querySelector('[data-kay="' + n + '"]'); return e && t && (e === t || e.contains(t)) && e.matches('button, [role="tab"]') && !e.disabled ? (e.className || 'button').toString().slice(0, 30) : ''; }, { cx, cy, n }); if (!tip || denenen.has(tip + Math.round(w))) continue; denenen.add(tip + Math.round(w)); say++;
      const haric = new Set([n, ...await p.evaluate(n => [...document.querySelector('[data-kay="' + n + '"]').querySelectorAll('[data-kay]')].map(e => +e.dataset.kay), n)]);   /* düğmenin kendisi ve içindekiler basılınca küçülüp büyüyebilir; ölçülen, öteki parçaların yeridir */
      await p.mouse.move(cx, cy); await p.waitForTimeout(140); const uzerinde = fark(once, await p.evaluate(yenidenOlc), haric);
      await p.mouse.down(); await p.waitForTimeout(140); const basili = fark(once, await p.evaluate(yenidenOlc), haric); await p.mouse.move(2, 2); await p.mouse.up(); await p.waitForTimeout(120);
      if (uzerinde.length) sorun.push(id + ' · üstüne gelince kayıyor (' + tip + '): ' + uzerinde.slice(0, 3).join(', ')); if (basili.length) sorun.push(id + ' · basınca kayıyor (' + tip + '): ' + basili.slice(0, 3).join(', '));
      if ((await p.evaluate(() => EO2.game.ekran())) !== id) { await p.evaluate(e => { document.querySelectorAll('.pen-perde').forEach(x => x.remove()); EO2.game.open(e); }, id); await p.waitForTimeout(600); break; } }
    // 2) yeniden çizim
    const oynakAd = new Set(ilk.filter(q => oynak.has(q[0])).map(q => q[5])), sabit = L => L.filter(q => !oynakAd.has(q[5]));
    const a = sabit(await p.evaluate(olc)); await p.evaluate(() => EO2.game.redraw()); await p.waitForTimeout(60); const c1 = sabit(await p.evaluate(olc)); await p.waitForTimeout(700); const c2 = sabit(await p.evaluate(olc));
    const esle = (u, v) => { const o = []; const n = Math.min(u.length, v.length); if (u.length !== v.length) return o; for (let i = 0; i < n; i++) { const d = Math.max(Math.abs(u[i][1] - v[i][1]), Math.abs(u[i][2] - v[i][2]), Math.abs(u[i][3] - v[i][3]), Math.abs(u[i][4] - v[i][4])); if (d >= 1.5) o.push(u[i][5] + ' ' + d + 'px'); } return o; };
    const oynuyor = esle(c1, c2); if (oynuyor.length) sorun.push(id + ' · yeniden çizimde parçalar oynuyor: ' + oynuyor.slice(0, 4).join(', ')); const kaydi = esle(a, c2); if (kaydi.length) sorun.push(id + ' · yeniden çizimden sonra yer değişti: ' + kaydi.slice(0, 4).join(', '));
  }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
console.log(JSON.stringify({ ok: !hata.length && !sorun.length, boy: VP.join('x'), sorun, hata: hata.slice(0, 8) }, null, 1));
process.exit(!hata.length && !sorun.length ? 0 : 1);
