// EO2 · Kıraathane oyuncu masası, ikinci oyun: Kor 21 (iki tarayıcı).
// Ölçülenler: masa ekranında oyun seçilir (Ejder Pokeri / Kor 21); A Kor 21 masası kurar, B kodla oturur; bahis kilitlenince ikişer kart dağıtılır;
// oyun sürerken rakibin kartları kapalıdır, kendi elin ve değerin görünür; A durur, B kart çeker; ikisi de durunca (ya da yanınca) sonuç iki ekranda aynıdır
// ve kartlar açılır; yeni hesapta bahis boştur (çayına), altın değişmez. Gerçek aktarım tests/kiraathane_pvp.test.js içinde sınanır.
// Kullanım: node eo2/tools/check_masa_kor21.mjs   (EKRAN=<klasör> verilirse ekran görüntüleri yazılır · VP=390x844 ile telefon boyutu: taşma da ölçülür)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || ''; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {}, VP = (process.env.VP || '1280x720').split('x').map(Number), dar = VP[0] < 900 || VP[1] < 500;
/* ekrandan taşan ya da birbirine binen parça var mı (oyun kutusunun içindeki eller ve düğmeler) */
const tasma = () => { const W = innerWidth, H = innerHeight, out = []; for (const e of document.querySelectorAll('.ms-oyun .ms-el, .ms-oyun .ms-eylem .gbtn, .ms-oyun .kr-kart, .ms-oyun .kr-sayi, .ms-oyun .ms-orta')) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) out.push(e.className + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom)); }
  const L = [...document.querySelectorAll('.ms-oyun .ms-el, .ms-oyun .ms-eylem, .ms-oyun .ms-orta')].map(e => e.getBoundingClientRect()); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4) out.push('biniyor ' + i + '/' + j); } return out; };
const oyuncu = async ad => { const p = await (await b.newContext(dar ? { viewport: { width: VP[0], height: VP[1] }, hasTouch: true, isMobile: true } : { viewport: { width: VP[0], height: VP[1] } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.takas && EO2.masa && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const bekle = (p, kosul, sure = 15000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const faz = 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz';
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora'), altin0 = [await A.evaluate(() => S.gold), await B.evaluate(() => S.gold)];
  await A.evaluate(() => EO2.game.open('masa')); await A.waitForSelector('[data-oyun="kor21"]', { timeout: 10000 });
  log.ikiOyun = await A.evaluate(() => document.querySelectorAll('[data-oyun]').length >= 2 && /Ejder Pokeri/.test(document.querySelector('.ms-kart h2').textContent));
  await A.locator('[data-oyun="kor21"]').click(); log.secildi = await A.evaluate(() => /Kor 21/.test(document.querySelector('.ms-kart h2').textContent) && document.querySelector('[data-oyun="kor21"]').getAttribute('aria-pressed') === 'true'); await cek(A, 'kor21_1_secim');
  await A.locator('[data-ms="kur"]').click(); log.kod = await bekle(A, 'document.querySelector(".ms-kodluk b") && /Kor 21/.test(document.querySelector(".ms-kodluk small").textContent)');
  const kod = await A.evaluate(() => document.querySelector('.ms-kodluk b').textContent.trim());
  await B.evaluate(() => EO2.game.open('masa')); await B.locator('#msKod').fill(kod); await B.locator('.ms-kod button[type=submit]').click();
  log.oturdu = await bekle(B, 'document.querySelector("[data-ms=hazir]")'); await B.locator('[data-ms="hazir"]').click();
  await bekle(A, 'document.querySelector("[data-ms=baslat]") && !document.querySelector("[data-ms=baslat]").disabled'); await A.locator('[data-ms="baslat"]').click();
  log.tepsiler = await bekle(A, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000) && await bekle(B, 'document.querySelector(".ms-bahis .tk-tepsi.ben")', 20000);
  await A.locator('[data-ms="kilit"]').click(); await bekle(B, 'document.querySelector(".tk-tepsi.o.onayli")'); await B.locator('[data-ms="kilit"]').click();
  log.oyun = await bekle(A, '(' + faz + ' === "oyun" || ' + faz + ' === "bitti") && document.querySelector(".ms-21")') && await bekle(B, '(' + faz + ' === "oyun" || ' + faz + ' === "bitti") && document.querySelector(".ms-21")');
  const gor = () => { const d = EO2.ortak.durum().ortak, me = EO2.ortak.durum().ben; return { faz: d.faz, benim: d.oyuncu[me].el.length, acik: d.oyuncu[me].acik, benKart: document.querySelectorAll('.ms-el.ben .kr-kart:not(.arka)').length, rakipKapali: document.querySelectorAll('.ms-el.rakip .kr-kart.arka').length, rakipAcik: document.querySelectorAll('.ms-el.rakip .kr-kart:not(.arka)').length, sayi: document.querySelector('.ms-el.ben .kr-sayi').textContent, rakipSayi: document.querySelector('.ms-el.rakip .kr-sayi').textContent }; };
  log.ilk = [await A.evaluate(gor), await B.evaluate(gor)]; await cek(A, 'kor21_2_oyun'); log.tasma = await A.evaluate(tasma);
  log.gizli = log.ilk.every(q => q.faz === 'bitti' || (q.benim === 2 && q.benKart === 2 && q.rakipKapali === 2 && q.rakipAcik === 0 && q.rakipSayi === '?' && +q.sayi >= 4));
  // A durur; B eli kapanana dek çeker (21 ya da yanma)
  if (!(await A.evaluate(gor)).acik && (await A.evaluate(gor)).faz === 'oyun') await A.locator('[data-ms="dur"]').click();
  for (let i = 0; i < 9; i++) { const q = await B.evaluate(gor); if (q.faz !== 'oyun' || q.acik) break; await B.locator('[data-ms="cek"]').click(); await B.waitForTimeout(450); }
  log.bitti = await bekle(A, faz + ' === "bitti" && document.querySelector(".ms-sonuc")', 20000) && await bekle(B, faz + ' === "bitti" && document.querySelector(".ms-sonuc")', 20000);
  const son = () => { const d = EO2.ortak.durum().ortak, me = EO2.ortak.durum().ben; return { kazanan: d.son.kazanan, ben: me, eller: d.son.eller, yazi: document.querySelector('.ms-sonuc b').textContent, rakipAcik: document.querySelectorAll('.ms-el.rakip .kr-kart:not(.arka)').length, rakipKapali: document.querySelectorAll('.ms-el.rakip .kr-kart.arka').length }; };
  const s = [await A.evaluate(son), await B.evaluate(son)]; log.son = s.map(q => ({ yazi: q.yazi, rakipAcik: q.rakipAcik })); await cek(A, 'kor21_3_sonuc'); await cek(B, 'kor21_3_sonuc_b'); log.tasmaSon = [...await A.evaluate(tasma), ...await B.evaluate(tasma)];
  const bek = q => q.kazanan == null ? 'Berabere' : q.kazanan === q.ben ? 'Kazandın' : 'Kaybettin';
  log.sonucTutarli = s[0].kazanan === s[1].kazanan && s.every(q => q.yazi === bek(q) && q.rakipKapali === 0 && q.rakipAcik >= 2);
  const ea = s[0].eller[s[0].ben], eb = s[0].eller[s[1].ben], pa = ea.yandi ? 0 : ea.deger, pb = eb.yandi ? 0 : eb.deger; log.eller = [ea, eb];
  log.kuralDogru = s[0].kazanan === (pa > pb ? s[0].ben : pb > pa ? s[1].ben : null);
  await A.waitForTimeout(1500); log.altinAyni = (await A.evaluate(() => S.gold)) === altin0[0] && (await B.evaluate(() => S.gold)) === altin0[1];
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.ikiOyun && log.secildi && log.kod && log.oturdu && log.tepsiler && log.oyun && log.gizli && log.bitti && log.sonucTutarli && log.kuralDogru && log.altinAyni && !log.tasma.length && !log.tasmaSon.length;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
