// EO2 · Kıraathane oyuncu masası, üçüncü oyun: Kervan Tavlası (iki tarayıcı).
// Ölçülenler: masa ekranında üç oyun seçilir; A tavla masası kurar, B açık masalar listesinden oturur; bahis kilitlenince tahta açılır (altışar pul iki uçta);
// sıra kurucudadır; zar atılır, parlayan pul seçilir, hedef haneye oynanır; hamleler bitince sıra rakibe geçer; tahta iki ekranda aynıdır (bakanın yönüne göre çevrilmiş);
// sırası olmayan zar atamaz; oyun sürerken kalkan kaybeder. Kazanma ve bahis aktarımı tests/kiraathane_pvp.test.js içinde sınanır.
// Kullanım: node eo2/tools/check_masa_tavla.mjs   (EKRAN=<klasör> · VP=390x844 ile telefon boyutu)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || ''; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {}, VP = (process.env.VP || '1280x720').split('x').map(Number), dar = VP[0] < 900 || VP[1] < 500;
const oyuncu = async ad => { const p = await (await b.newContext(dar ? { viewport: { width: VP[0], height: VP[1] }, hasTouch: true, isMobile: true } : { viewport: { width: VP[0], height: VP[1] } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.takas && EO2.masa && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 15000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const faz = 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz';
const tasma = () => { const W = innerWidth, H = innerHeight, out = []; for (const e of document.querySelectorAll('.ms-tv .tv-hane, .ms-tv .ms-eylem .gbtn, .ms-tv .tv-kim, .ms-tv .kr-zar')) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) out.push(e.className + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom)); } return out; };
/* sırası gelen oyuncu ekrandan oynar: zar atar, sırası bitene dek parlayan pulu seçip ilk hedefe yollar */
const oyna = async p => { await p.locator('[data-ms="zar"]').click(); await p.waitForTimeout(500);
  for (let k = 0; k < 6; k++) { const d = await p.evaluate(() => { const o = EO2.ortak.durum(), T = o.ortak.T; return { benim: o.ortak.faz === 'oyun' && T.turn === o.ortak.yan[o.ben] && T.phase === 'move' }; }); if (!d.benim) break;
    const git0 = p.locator('[data-tv-git]').first(); if (!(await git0.count())) { const sec = p.locator('.tv-hane.oynar, [data-tv-sec="bar"]:not([disabled])').first(); if (!(await sec.count())) break; await sec.click({ force: true }); await p.waitForTimeout(250); }
    await p.locator('[data-tv-git]').first().click({ force: true }); await p.waitForTimeout(450); } };
const tahta = p => p.evaluate(() => { const T = EO2.ortak.durum().ortak.T; return JSON.stringify([T.pts.map(q => (q.o || '-') + q.n), T.bar, T.off, T.turn, T.phase]); });
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  await A.evaluate(() => EO2.game.open('masa')); await A.waitForSelector('[data-oyun="tavla"]', { timeout: 10000 });
  log.ucOyun = await A.evaluate(() => document.querySelectorAll('[data-oyun]').length === 3 && typeof tvAllMoves === 'function');
  await A.locator('[data-oyun="tavla"]').click(); await A.locator('[data-ms="kur"]').click(); log.kuruldu = await bekle(A, 'document.querySelector(".ms-kodluk b")');
  await B.evaluate(() => EO2.game.open('masa')); log.listede = await bekle(B, 'document.querySelector("[data-or-liste] li") && /Kervan Tavlası/.test(document.querySelector("[data-or-liste] li").textContent)', 12000);
  await B.locator('[data-or-liste] [data-oda-kod]').first().click(); log.oturdu = await bekle(B, 'document.querySelector("[data-ms=hazir]")'); await B.locator('[data-ms="hazir"]').click();
  await bekle(A, 'document.querySelector("[data-ms=baslat]") && !document.querySelector("[data-ms=baslat]").disabled'); await A.locator('[data-ms="baslat"]').click();
  await bekle(A, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000); await bekle(B, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000);
  await A.locator('[data-ms="kilit"]').click(); await bekle(B, 'document.querySelector(".tk-tepsi.o.onayli")'); await B.locator('[data-ms="kilit"]').click();
  log.tahta = await bekle(A, faz + ' === "oyun" && document.querySelectorAll(".tv-hane").length === 12') && await bekle(B, faz + ' === "oyun" && document.querySelectorAll(".tv-hane").length === 12');
  log.dizilis = await A.evaluate(() => { const T = EO2.ortak.durum().ortak.T; return T.pts[0].n === 6 && T.pts[11].n === 6 && T.turn === 'me' && T.phase === 'roll'; });
  // bakanın yönü: herkes kendi pullarını solda görür
  log.yon = await A.evaluate(() => document.querySelector('.tv-hane').querySelectorAll('i.ben').length === 6) && await B.evaluate(() => document.querySelector('.tv-hane').querySelectorAll('i.ben').length === 6);
  log.siraDisi = await B.evaluate(() => document.querySelector('[data-ms="zar"]').disabled); await cek(A, 'tavla_1_tahta');
  for (let tur = 0; tur < 3; tur++) { await oyna(A); await bekle(B, 'EO2.ortak.durum().ortak.T.turn === "opp" && EO2.ortak.durum().ortak.T.phase === "roll"', 10000); if (tur === 0) await cek(B, 'tavla_2_sira_bende'); await oyna(B); await bekle(A, 'EO2.ortak.durum().ortak.T.turn === "me" && EO2.ortak.durum().ortak.T.phase === "roll"', 10000); }
  const ta = await tahta(A), tb = await tahta(B); log.ayni = ta === tb; log.oynandi = await A.evaluate(() => { const T = EO2.ortak.durum().ortak.T; return T.pts[0].n < 6 || T.bar.me > 0; }) && await A.evaluate(() => { const T = EO2.ortak.durum().ortak.T; return T.pts[11].n < 6 || T.bar.opp > 0; });
  await A.locator('[data-ms="zar"]').click(); await A.waitForTimeout(600); await cek(A, 'tavla_3_hamle'); log.tasma = [...await A.evaluate(tasma), ...await B.evaluate(tasma)];
  // oyun sürerken kalkan kaybeder
  await B.locator('[data-ms="cik"]').click(); await B.locator('.pen .gbtn:has-text("Kalk")').click();
  log.kalkanKaybetti = await bekle(A, 'EO2.ortak.durum().oda && EO2.ortak.durum().oda.durum === "bitti" || !EO2.ortak.durum().oda', 15000);
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.ucOyun && log.kuruldu && log.listede && log.oturdu && log.tahta && log.dizilis && log.yon && log.siraDisi && log.ayni && log.oynandi && log.tasma && !log.tasma.length && log.kalkanKaybetti;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
