// EO2 · ekran içi bindirme denetimi: her ekran (Ahır, Arena, Pazar...) açılır; görünen düğmeler, girişler ve sekmeler ölçülür.
// Raporlananlar: (1) birbirine binen iki etkileşimli öğe (biri ötekinin içinde değilse), (2) ekrandan taşan etkileşimli öğe
// (kaydırılabilir bir kabın içinde değilse), (3) ekranın üstüne çıkan sabit HUD parçası (hedefler, parti, sohbet, jest, eylem çubuğu).
// Kullanım: node eo2/tools/check_binme_ekran.mjs [--mobil] [--dik]   (EKRANLAR="arena pazar" ile daraltılır; EKRAN=<klasör> ile sorunlu ekranın görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const mobil = process.argv.includes('--mobil'), dik = process.argv.includes('--dik'), url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || ''; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const kip = dik ? 'dik' : mobil ? 'mobil' : 'masa', vp = process.env.VP ? { width: +process.env.VP.split('x')[0], height: +process.env.VP.split('x')[1] } : dik ? { width: 390, height: 844 } : mobil ? { width: 844, height: 390 } : { width: 1280, height: 720 };   /* VP=1920x1080 ile başka masaüstü boyu */
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(mobil || dik ? { viewport: vp, hasTouch: true, isMobile: true } : { viewport: vp }), p = await ctx.newPage(), hata = [], sorun = [], uyari = new Set();
p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500);
  await p.evaluate(() => { const y = document.querySelector('.yatay-oneri .yo-hayir'); if (y) y.click(); });
  const ekranlar = (process.env.EKRANLAR || 'ejderhalar arena pazar bedesten han kiraathane masa dostlar siralama defter canta sandik sefer yuva saray kule divan kutuk muzayede siparis sus topcu yaris damizlik sancak kervan boss ayarlar menu gorunus takim ors harita ermeydani zindan').split(/\s+/);
  for (const id of ekranlar) {
    const acildi = await p.evaluate(id => { try { EO2.game.open(id); return EO2.game.ekran() === id; } catch (e) { return String(e.message); } }, id);
    if (acildi !== true) { await p.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(w => w.remove()); try { EO2.game.close(); } catch (_) { } }); continue; }
    await p.waitForTimeout(900); await p.evaluate(() => EO2.game.toast('Deneme bildirimi: ekran ölçülüyor.')); await p.waitForTimeout(450);
    const r = await p.evaluate(() => { const gorunur = el => { const cs = getComputedStyle(el), q = el.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || cs.pointerEvents === 'none' || q.width < 6 || q.height < 6) return null;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return null; } return q; };
      const kok = document.querySelector('.scr, #scr, .ekran') || document.getElementById('app'), ad = el => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (el.textContent ? ' "' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 22) + '"' : '');
      const kayar = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(s.overflowX + s.overflowY)) return a; } return null; };
      // kaydırılabilir kabın görünen kutusuna kırpılmış dikdörtgen
      const kirp = (el, q) => { let x0 = q.left, y0 = q.top, x1 = q.right, y1 = q.bottom; for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(s.overflowX + s.overflowY)) { const k = a.getBoundingClientRect(); x0 = Math.max(x0, k.left); y0 = Math.max(y0, k.top); x1 = Math.min(x1, k.right); y1 = Math.min(y1, k.bottom); } } return x1 - x0 > 4 && y1 - y0 > 4 ? { x0, y0, x1, y1 } : null; };
      const L = []; for (const el of document.querySelectorAll('#app button, #app input, #app select, #app [role="button"], #app [role="tab"], #app a[href]')) { if (el.closest('#world, #anchors, #loading')) continue; const q = gorunur(el); if (!q) continue; const k = kirp(el, q); if (!k) continue; L.push({ el, q, k, hud: !!el.closest('#hud, .quests, #chat, #emotes, #actions, #partiCerceve, #joy, #btnE') }); }
      for (const el of document.querySelectorAll('.bildirimler .bildirim')) { const q = el.getBoundingClientRect(); if (q.width > 6 && q.height > 6) L.push({ el, q, k: { x0: q.left, y0: q.top, x1: q.right, y1: q.bottom }, hud: false, bildirim: true }); }
      const out = [], ust = (el, x, y) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t) || t.contains(el)); };
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], c = L[j]; if (a.el.contains(c.el) || c.el.contains(a.el)) continue; if ((a.hud && c.hud) || (a.bildirim && c.bildirim)) continue;
        const w = Math.min(a.k.x1, c.k.x1) - Math.max(a.k.x0, c.k.x0), h = Math.min(a.k.y1, c.k.y1) - Math.max(a.k.y0, c.k.y0); if (w <= 4 || h <= 4) continue;
        // ikisi de gerçekten o noktada üstte olabiliyorsa (biri ötekini tümüyle örtmüyorsa) bindirme sayılır
        const mx = Math.max(a.k.x0, c.k.x0) + w / 2, my = Math.max(a.k.y0, c.k.y0) + h / 2; if (!ust(a.el, mx, my) && !ust(c.el, mx, my)) continue;
        out.push('biniyor: ' + ad(a.el) + ' × ' + ad(c.el) + ' (' + Math.round(w) + '×' + Math.round(h) + ')'); }
      for (const a of L) { if (a.hud) continue; const q = a.q; if ((q.left < -2 || q.top < -2 || q.right > innerWidth + 2 || q.bottom > innerHeight + 2) && !kayar(a.el)) out.push('taşıyor: ' + ad(a.el)); }
      // (4) kesilen öğe: kaydırılamayan bir kabın kenarında yarım kalan düğme, giriş ya da yazı kutusu (2026-11-17: Dostlar ekranında sol kutular böyle kesiliyordu)
      const kesen = (el, q) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a), k = a.getBoundingClientRect();
          const yatay = /(auto|scroll|hidden|clip)/.test(s.overflowX) && (q.left < k.left - 3 || q.right > k.right + 3) && !(/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 2);
          const dikey = /(auto|scroll|hidden|clip)/.test(s.overflowY) && (q.top < k.top - 3 || q.bottom > k.bottom + 3) && !(/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 2);
          if (yatay || dikey) return a;
          // kaydırılabilen bir kabın dışına taşan öğe kaydırarak görülür: yukarıdaki kaplara bakılmaz
          if ((/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 2 && (q.left < k.left - 3 || q.right > k.right + 3)) || (/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 2 && (q.top < k.top - 3 || q.bottom > k.bottom + 3))) return null; } return null; };
      for (const el of document.querySelectorAll('#app button, #app input, #app select, #app [role="tab"], #app section, #app article, #app h1, #app h2, #app h3')) { if (el.closest('#world, #anchors, #loading, #hud, .quests, #chat, #emotes, #actions, #partiCerceve, #joy, .bildirimler, [aria-hidden="true"]')) continue; const q = gorunur(el); if (!q) continue;
        const k = kesen(el, q); if (k) out.push('kesiliyor: ' + ad(el) + ' ⊂ ' + ad(k).slice(0, 40)); }
      return [...new Set(out)].slice(0, 14); });
    const sert = r.filter(s => kip === 'masa' || !/\.bildirim/.test(s)); for (const s of r) if (!sert.includes(s)) uyari.add(id + ' · bildirim bir düğmeye değiyor (boş yer yok)');
    if (sert.length) { for (const s of sert) sorun.push(id + ' · ' + s); if (ekran) await p.screenshot({ path: path.join(ekran, 'ekran_' + kip + '_' + id + '.png') }); }
    await p.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(w => w.remove()); try { EO2.game.close(); } catch (_) { } }); await p.waitForTimeout(250);
  }
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && !sorun.length;
console.log(JSON.stringify({ ok, kip, sorun, uyari: [...uyari], hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
