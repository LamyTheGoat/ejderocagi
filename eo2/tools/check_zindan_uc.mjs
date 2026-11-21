// EO2 · ortak zindanın üç (ya da dört) kişiyle denetimi: Volkanik Kaldera'nın ilk aşaması, N ayrı tarayıcı (varsayılan 3; N=4 ile dört).
// Ölçülenler: kurucu öteki oyuncuları çağırır, hepsi katılır; savaş her ekranda aynı düşmanla açılır; her ekranda öteki oyuncuların topçuları adlarıyla durur;
// sıra kurucudan başlayıp oyuncuları sırayla dolaşır ve her ekranda aynı kişidedir; gerçek atış zemini her ekranda aynı yerden oyar;
// düşman sırasından sonra düşmanların yeri, zemin ve herkesin canı her ekranda aynıdır; düşmanlar inince herkese çark açılır.
// Kullanım: node eo2/tools/check_zindan_uc.mjs   (EKRAN=<klasör> · N=4)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}, N = Math.max(3, Math.min(4, +process.env.N || 3)), ADLAR = ['Aylin', 'Bora', 'Ceren', 'Deniz'].slice(0, N); if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), P = [];
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const hepsi = async (ifade, ms) => (await Promise.all(P.map(p => bekle(p, ifade, ms)))).every(Boolean);
const cark = async p => { await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(500); await p.locator('.pen .pen-f .gbtn').first().click(); };
const savasta = 'EO2.battle.active() && EO2.battle.state() && EO2.battle.state().act.length > 1 && EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "savas"';
/* sıradaki kişinin adı (bu ekranın kendi oyuncusu için verilen ad) */
const siradaki = benAd => { const M = EO2.battle.active() && EO2.battle.state(); if (!M || !M.aktif || M.faz !== 'nisan') return ''; return M.aktif === M.ben ? benAd : M.aktif.yoldas ? M.aktif.ad : 'düşman'; };
const sirada = (i, kim) => bekle(P[i], '(' + siradaki.toString() + ')(' + JSON.stringify(ADLAR[i]) + ') === ' + JSON.stringify(kim), 60000);
const ozet = benAd => { const M = EO2.battle.state(), m = M.T.mask; let h = 2166136261, dolu = 0; for (let i = 0; i < m.length; i++) { h = Math.imul(h ^ m[i], 16777619); if (m[i]) dolu++; }
  const can = {}; can[benAd] = Math.round(M.ben.hp); for (const y of Object.values(M.yoldas || {})) can[y.ad] = Math.round(y.hp);
  return { zemin: h >>> 0, dolu, yoldas: Object.values(M.yoldas || {}).map(y => y.ad).sort(), dusman: M.act.filter(a => a.takim === 1).map(a => a.ad + ':' + Math.round(a.max) + ':' + Math.round(a.hp)), yer: M.act.filter(a => a.takim === 1).map(a => Math.round(a.x * 10) / 10), can: Object.keys(can).sort().map(k => k + ':' + can[k]), ruzgar: M.wind }; };
const ayni = (L, alan) => L.every(q => JSON.stringify(q[alan]) === JSON.stringify(L[0][alan]));
try {
  for (const ad of ADLAR) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 200))); P.push(p);
    await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(800);
    await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
    await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
    await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); await p.evaluate(() => { window.__fastFx = true; window.canEnterZindanOrTopcu = () => true; }); }
  const A = P[0];
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === ' + (N - 1) + ' && [...EO2.meydanAg.kisiler.values()].every(c => c.handle)');
  await A.evaluate(() => EO2.game.open('zindan')); await A.waitForTimeout(300);
  /* kırılan zemini ölçmek için Kaldera seçilir; Kaldera kapalıyken (2026-11-20) tek açık zindan Zümrüt Saray'dır ve zemini kırılmaz: oyuk ölçümü atlanır */
  const kirilir = await A.locator('[data-zin="kaldera"]').count() > 0; log.zindan = kirilir ? 'kaldera' : 'zumrut'; if (kirilir) { await A.locator('[data-zin="kaldera"]').click(); await A.waitForTimeout(300); } await A.locator('[data-zn="kur"]').click();
  await bekle(A, 'document.querySelector(".zn-toplan .ms-kodluk b")');
  for (let i = 1; i < N; i++) { await A.evaluate(ad => { const c = [...EO2.meydanAg.kisiler.values()].find(x => x.name === ad); EO2.zindan.cagir(c.handle, c.name); }, ADLAR[i]);
    const d = await P[i].waitForSelector('.pen:has-text("Sefer daveti")', { timeout: 15000 }).then(() => true, () => false); if (!d) hata.push(ADLAR[i] + ': davet gelmedi'); else await P[i].locator('.pen .gbtn:has-text("Sefere katıl")').click();
    await P[i].locator('[data-zn="hazir"]').click(); }
  log.toplandi = await bekle(A, 'EO2.ortak.durum().oda && EO2.ortak.durum().oda.uyeler.length === ' + N + ' && document.querySelector("[data-zn=baslat]") && !document.querySelector("[data-zn=baslat]").disabled'); if (ekran) await A.screenshot({ path: path.join(ekran, 'uc_1_toplanma.png') });
  await A.locator('[data-zn="baslat"]').click();
  log.kamp = await hepsi('EO2.api.scene() === "kamp"', 40000); log.kamptaGordu = await hepsi('EO2.meydanAg.sayi() === ' + (N - 1), 30000);
  await A.waitForTimeout(900); if (ekran) await A.screenshot({ path: path.join(ekran, 'uc_2_kamp.png') });
  for (const p of P) await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
  log.savas = await hepsi(savasta, 60000);
  // ilk sıra kurucuda; her ekranda aynı kişi
  log.sira1 = (await Promise.all(P.map((p, i) => sirada(i, ADLAR[0])))).every(Boolean); await A.waitForTimeout(1200);
  const o0 = await Promise.all(P.map((p, i) => p.evaluate(ozet, ADLAR[i]))); log.yoldaslar = o0.map(q => q.yoldas);
  log.yoldasDogru = o0.every((q, i) => JSON.stringify(q.yoldas) === JSON.stringify(ADLAR.filter((_, j) => j !== i).sort())); log.ayniAcilis = ayni(o0, 'zemin') && ayni(o0, 'dusman') && ayni(o0, 'ruzgar');
  if (ekran) await P[N - 1].screenshot({ path: path.join(ekran, 'uc_3_savas.png') });
  // kurucunun gerçek atışı: zemin her ekranda aynı yerden oyulur; sıra ikinci oyuncuya geçer
  await A.evaluate(() => { EO2.battle.state().ben.angle = 60; }); await A.bringToFront(); await A.keyboard.down('Space'); await A.waitForTimeout(260); await A.keyboard.up('Space');
  log.sira2 = (await Promise.all(P.map((p, i) => sirada(i, ADLAR[1])))).every(Boolean); await hepsi('!(EO2.battle.state().hayalet || []).length', 15000); await A.waitForTimeout(900);
  const o1 = await Promise.all(P.map((p, i) => p.evaluate(ozet, ADLAR[i]))); log.zeminOyuldu = kirilir ? o1[0].dolu < o0[0].dolu : true; log.zeminAyni = ayni(o1, 'zemin');
  // öteki oyuncular sırayla geçer: sıra her ekranda aynı kişide dolaşır
  log.siralar = []; for (let k = 1; k < N; k++) { if (k > 1) log.siralar.push((await Promise.all(P.map((p, i) => sirada(i, ADLAR[k])))).every(Boolean)); await P[k].waitForTimeout(500); await P[k].evaluate(() => { EO2.battle.pas(); }); }
  // düşman sırası ve tur dönüşü: yerler, zemin ve canlar her ekranda aynı
  log.turDondu = (await Promise.all(P.map((p, i) => bekle(p, '(' + siradaki.toString() + ')(' + JSON.stringify(ADLAR[i]) + ') === ' + JSON.stringify(ADLAR[0]) + ' && EO2.battle.state().tur >= 2', 180000)))).every(Boolean); await A.waitForTimeout(1500);
  /* can bildirimi ekranlara birkaç yüz milisaniyede ulaşır: ölçüm, ekranlar aynı olana dek (en çok altı saniye) yinelenir */
  const canEs = L => ADLAR.every(ad => { const v = L.map(q => +(q.can.find(s => s.startsWith(ad + ':')) || ':NaN').split(':')[1]); return v.every(n => Math.abs(n - v[0]) <= 1); });
  let o2 = await Promise.all(P.map((p, i) => p.evaluate(ozet, ADLAR[i]))); for (let k = 0; k < 12 && !canEs(o2); k++) { await A.waitForTimeout(500); o2 = await Promise.all(P.map((p, i) => p.evaluate(ozet, ADLAR[i]))); }
  log.tur = { yer: o2[0].yer, can: o2.map(q => q.can), zemin: o2.map(q => q.zemin) };
  log.yerAyni = ayni(o2, 'yer'); log.zeminAyni2 = ayni(o2, 'zemin'); log.dusmanAyni = ayni(o2, 'dusman');
  log.canAyni = canEs(o2);
  if (ekran) await P[1].screenshot({ path: path.join(ekran, 'uc_4_tur.png') });
  /* bütün dalgalar indirilir (Zümrüt köprüsü üç dalgalıdır; Kaldera'nın ilk aşamasında tek dalga vardı) */
  for (let k = 0; k < 4; k++) { await A.evaluate(() => { const M = EO2.battle.state(); if (M) for (const a of M.act) if (a.takim === 1 && !a.dead) EO2.battle.api[a.tur === 'boss' ? 'hasarBoss' : 'hasarMob'](a, 99999); }); await A.waitForTimeout(1500); }
  log.cark = await hepsi('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "cark"', 40000); for (const p of P) await cark(p);
  log.kampaDonus = await hepsi('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "bekleme" && EO2.ortak.durum().ortak.asama === 1 && EO2.api.scene() === "kamp" && !EO2.battle.active()', 40000);
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.toplandi && log.kamp && log.kamptaGordu && log.savas && log.sira1 && log.yoldasDogru && log.ayniAcilis && log.sira2 && log.zeminOyuldu && log.zeminAyni && log.siralar.every(Boolean) && log.turDondu && log.yerAyni && log.zeminAyni2 && log.dusmanAyni && log.canAyni && log.cark && log.kampaDonus;
console.log(JSON.stringify({ ok, n: N, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
