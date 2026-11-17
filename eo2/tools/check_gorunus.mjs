// EO2 · karakter görünüşü denetimi (iki tarayıcı): A saçını ve gözünü değiştirir.
// Ölçülenler: görünüş ekranı açılır ve seçim uygulanır (A'nın karakteri kurulan atlası giyer); seçim kayıtta durur (sayfa yenilenince geri gelir);
// meydandaki B, A'yı yeni görünüşüyle görür; özgün görünüşe dönünce eski atlasa dönülür; bozuk görünüş kodu yok sayılır.
// Kullanım: node eo2/tools/check_gorunus.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url'; import { pngOku } from './png.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.gorunum && EO2.meydanAg && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000); await bekle(p, 'EO2.ag.cevrimici()'); return p; };
try {
  const A = await gir('Aylin'), B = await gir('Bora');
  log.gordu = await bekle(B, '[...EO2.meydanAg.kisiler.values()].some(c => c.name === "Aylin")', 40000);
  /* meydanda oyuncunun çizildiği yerdeki pembe (seçilecek saç rengi) piksel sayısı: isim plakasının altındaki kutu. Karakter çizilmezse sayı artmaz. */
  const pembe = async () => { const k = await A.evaluate(() => { const r = document.querySelector('.plate.me').getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left + r.width / 2 - 70)), y: Math.round(r.bottom), width: 140, height: 170 }; });
    const d = pngOku(await A.screenshot({ clip: k })).rgba; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 110 && d[i + 1] < 95 && d[i] > d[i + 1] * 1.8 && d[i + 2] > d[i + 1] * 1.25 && d[i + 2] > 60) n++; return n; };   /* koyu pembe-mor saç tonu */
  await A.waitForTimeout(1200); log.pembeOnce = await pembe();
  // A görünüş ekranını açar ve dört seçim yapar
  await A.evaluate(() => EO2.game.open('gorunus')); await A.waitForTimeout(600);
  for (const [alan, v] of [['sac', 'ikiz'], ['sacRenk', 'pink'], ['goz', 'dar'], ['gozRenk', 'gold']]) { await A.locator('[data-alan="' + alan + '"][data-v="' + v + '"]').click(); await A.waitForTimeout(350); }
  log.uygulandi = await bekle(A, 'EO2.api.player.gor === "g_bare_ikiz_pink_dar_gold" && !!EO2.setAl(EO2.api.player.gor)', 20000);
  log.onizleme = await A.evaluate(() => { const cv = document.querySelector('.gr-ayna canvas'); if (!cv) return false; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 30) n++; return n > 4000; });
  if (ekran) await A.screenshot({ path: path.join(ekran, 'gorunus_1_ekran.png') }); await A.evaluate(() => EO2.game.close());
  // meydanda oyuncu yeni saçıyla GERÇEKTEN çiziliyor (yalnız kayıt değil: ekrandaki pikseller)
  await A.waitForTimeout(1500); log.pembeSonra = await pembe(); log.sayfaOlcusu = await A.evaluate(() => { const m = EO2.setAl(EO2.api.player.gor).m; return m.w > 0 && m.h > 0; }); log.meydandaCizildi = log.sayfaOlcusu && log.pembeSonra > log.pembeOnce + 150; if (ekran) await A.screenshot({ path: path.join(ekran, 'gorunus_1b_meydan.png') });
  // B, A'yı yeni görünüşüyle görür
  log.uzakta = await bekle(B, '[...EO2.meydanAg.kisiler.values()].some(c => c.name === "Aylin" && c.gor === "g_bare_ikiz_pink_dar_gold")', 30000);
  if (ekran) { await B.evaluate(() => { const c = [...EO2.meydanAg.kisiler.values()].find(c => c.name === 'Aylin'), p = EO2.api.player; if (c) { p.x = c.x + 0.9; p.y = c.y; } }); await B.waitForTimeout(900); await B.screenshot({ path: path.join(ekran, 'gorunus_2_oteki_oyuncu.png') }); }
  // kayıtta durur: A sayfayı yeniler
  await A.reload(); await A.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await A.waitForTimeout(1200); await A.locator('.giris .gbtn').first().click();
  log.kayitta = await bekle(A, 'EO2.game.live && EO2.gorunum.kod() === "ikiz.pink.dar.gold" && EO2.api.player.gor === "g_bare_ikiz_pink_dar_gold"', 40000);
  // özgüne dönüş ve bozuk kod
  await A.evaluate(() => { EO2.game.open('gorunus'); }); await A.waitForTimeout(600); await A.locator('[data-gr-ozgun]').click();
  log.ozgun = await bekle(A, '!EO2.api.player.gor && EO2.gorunum.kod() === "orig.orig.orig.orig"', 15000) && await bekle(B, '[...EO2.meydanAg.kisiler.values()].some(c => c.name === "Aylin" && !c.gor)', 30000);
  log.bozukKod = await B.evaluate(() => { const c = { set: 'temel' }; EO2.gorunum.uzak(c, 'x.y'); EO2.gorunum.uzak(c, '<b>.a.b.c'); EO2.gorunum.uzak(c, 'yok.yok.yok.yok'); return !c.gor; });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.uygulandi && log.onizleme && log.meydandaCizildi && log.uzakta && log.kayitta && log.ozgun && log.bozukKod;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
