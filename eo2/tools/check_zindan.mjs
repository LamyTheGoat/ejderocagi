// EO2 · ortak zindan denetimi (Zümrüt Saray): iki ayrı tarayıcı. A sefer kurar ve B'yi çağırır; B katılır ve hazır olur; A kampa çıkarır;
// ikisi kampta birbirini görür; ikisi de hazır olunca aşama savaşı iki ekranda başlar; A'nın vurduğu hasar B'nin ekranında da düşer;
// düşmanlar bitince çark çıkar; çarktan sonra kampa dönülür; ikinci aşamada Şahmeran düşünce büyük çark ve sefer sonu gelir.
// Denetim omuz ejderi şartını (iksir) atlar ve hasarı savaş motorunun kendi fonksiyonuyla verir; nişan alıp ateş etmez.
// Kullanım: node eo2/tools/check_zindan.mjs   (EKRAN=<klasör> ile ekran görüntüleri)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '';
if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 200)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 });
  await p.evaluate(() => { window.__fastFx = true; window.canEnterZindanOrTopcu = () => true; }); return p; };
const bekle = (p, kosul, sure = 20000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
const cek = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
const faz = f => 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "' + f + '"';
const savasta = 'EO2.battle.active() && EO2.battle.state() && EO2.battle.state().act.length > 1';
const cark = async (p, buyuk) => { await p.waitForSelector('.pen .tp-cark', { timeout: 20000 }); await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(500);
  if (buyuk) await p.locator('.pen [data-tamam]').click(); else await p.locator('.pen .pen-f .gbtn').first().click(); };
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
  const altin0 = await A.evaluate(() => S.gold);
  await A.evaluate(() => EO2.game.open('zindan')); await A.locator('[data-zn="kur"]').click();
  log.kod = await bekle(A, 'document.querySelector(".zn-toplan .ms-kodluk b")'); await cek(A, 'zindan_1_toplanma');
  await A.evaluate(() => { const c = [...EO2.meydanAg.kisiler.values()][0]; EO2.zindan.cagir(c.handle, c.name); });
  log.davet = await B.waitForSelector('.pen:has-text("Sefer daveti")', { timeout: 12000 }).then(() => true, () => false);
  if (log.davet) await B.locator('.pen .gbtn:has-text("Sefere katıl")').click();
  await B.locator('[data-zn="hazir"]').click();
  log.hazirGorundu = await bekle(A, 'document.querySelector("[data-zn=baslat]") && !document.querySelector("[data-zn=baslat]").disabled');
  await A.locator('[data-zn="baslat"]').click();
  log.kamp = await bekle(A, 'EO2.api.scene() === "kamp"', 40000) && await bekle(B, 'EO2.api.scene() === "kamp"', 40000);
  log.kamptaGordu = await bekle(A, 'EO2.meydanAg.sayi() === 1', 20000) && await bekle(B, 'EO2.meydanAg.sayi() === 1', 20000);
  log.serit = await bekle(A, '!document.getElementById("seferSerit").hidden && /Aşama 1 \\/ 2/.test(document.getElementById("seferSerit").textContent)');
  await A.waitForTimeout(1500); await cek(A, 'zindan_2_kamp'); await cek(B, 'zindan_2_kamp_b');
  // ikisi de hazır: A kapıdan, B şeritten
  await A.evaluate(() => EO2.api.runAct('zindan:hazir')); log.tekHazirBaslamadi = await A.evaluate(() => EO2.ortak.durum().ortak.faz === 'bekleme');
  await B.locator('#seferSerit [data-sf="hazir"]').click();
  log.savas = await bekle(A, savasta, 30000) && await bekle(B, savasta, 30000);
  log.dusman = await A.evaluate(() => EO2.battle.state().act.filter(a => a.takim === 1).map(a => a.max)); await A.waitForTimeout(1200); await cek(A, 'zindan_3_kopru');
  // ortak sıra: ilk sıra seferi kuranda; iki ekranda da aynı kişi oynuyor, rüzgâr aynı
  const sirada = ad => 'EO2.battle.state() && EO2.battle.state().aktif && EO2.battle.state().faz === "nisan" && (' + (ad === 'ben' ? 'EO2.battle.state().aktif === EO2.battle.state().ben' : 'EO2.battle.state().aktif.yoldas && EO2.battle.state().aktif.ad === "' + ad + '"') + ')';
  log.siraA = await bekle(A, sirada('ben'), 20000) && await bekle(B, sirada('Aylin'), 20000);
  log.ruzgar = [await A.evaluate(() => EO2.battle.state().wind), await B.evaluate(() => EO2.battle.state().wind)];
  log.kimYazisi = await B.evaluate(() => document.getElementById('tpKim').textContent);
  // yoldaşın topçusu iki ekranda da durur; A yürür ve ateş eder: B'nin ekranında A'nın topçusu yer değiştirir, mermisi uçar
  const yoldasVar = 'EO2.battle.state() && EO2.battle.state().act.filter(a => a.yoldas).length === 1';
  log.yoldasTopcu = await bekle(A, yoldasVar) && await bekle(B, yoldasVar);
  log.yoldasAd = await B.evaluate(() => EO2.battle.state().act.find(a => a.yoldas).ad);
  const ax = await A.evaluate(() => { const M = EO2.battle.state(); M.ben.x += 3; M.ben.angle = 55; return M.ben.x; });
  await A.evaluate(() => { const M = EO2.battle.state(); EO2.ortak.eylem({ t: 'ates', x: M.ben.x, y: M.ben.y, aci: 55, guc: 0.6, yon: 1, ruz: M.wind, mod: {} }); });
  log.yoldasAtes = await bekle(B, 'EO2.battle.state().hayalet && EO2.battle.state().hayalet.length > 0', 8000);
  log.yoldasYer = await B.evaluate(x => Math.abs(EO2.battle.state().act.find(a => a.yoldas).x - x) < 0.05, ax); await B.waitForTimeout(350); await cek(B, 'zindan_3b_yoldas_atis');
  log.atisSirayiUcusaGecirdi = await B.evaluate(() => ["ucus", "durul", "bekle"].includes(EO2.battle.state().faz));
  // A birinci düşmana vurur: B'nin ekranında da canı iner
  await A.evaluate(() => { const M = EO2.battle.state(); EO2.battle.api.hasarMob(M.act[1], 300); });
  log.ortakCan = await bekle(B, 'EO2.battle.state() && EO2.battle.state().act[1].hp <= EO2.battle.state().act[1].max - 300');
  log.yoldasCercevesi = await B.evaluate(() => !document.getElementById('seferYoldas').hidden && /Aylin/.test(document.getElementById('seferYoldas').textContent));
  // A sırasını geçer: sıra B'ye gelir (A'nın ekranında "Bora nişan alıyor"); B geçer: düşman sırası iki ekranda aynı düşmanla, aynı hedefe oynar
  await A.evaluate(() => { EO2.battle.pas(); });
  log.siraB = await bekle(B, sirada('ben'), 20000) && await bekle(A, sirada('Bora'), 20000);
  log.ruzgar2 = [await A.evaluate(() => EO2.battle.state().wind), await B.evaluate(() => EO2.battle.state().wind)];
  await B.evaluate(() => { EO2.battle.pas(); });
  const dusmanda = 'EO2.battle.state() && EO2.battle.state().aktif && EO2.battle.state().aktif.takim === 1';
  log.dusmanSirasi = await bekle(A, dusmanda, 20000) && await bekle(B, dusmanda, 20000);
  log.dusmanAyni = [await A.evaluate(() => { const M = EO2.battle.state(); return M.act.indexOf(M.aktif) + ':' + (M.hedefT === M.ben ? 'Aylin' : M.hedefT.ad); }), await B.evaluate(() => { const M = EO2.battle.state(); return M.act.indexOf(M.aktif) + ':' + (M.hedefT === M.ben ? 'Bora' : M.hedefT.ad); })];
  // bir tur dönsün: sıra yeniden A'ya gelince düşmanların yeri iki ekranda aynı olmalı
  log.turDondu = await bekle(A, sirada('ben') + ' && EO2.battle.state().tur === 2', 90000) && await bekle(B, sirada('Aylin') + ' && EO2.battle.state().tur === 2', 30000);
  const yerler = () => EO2.battle.state().act.filter(a => a.takim === 1).map(a => Math.round(a.x * 10) / 10);
  log.dusmanYer = [await A.evaluate(yerler), await B.evaluate(yerler)]; await cek(B, 'zindan_3c_ortak_sira');
  // ikisi sırayla bütün düşmanları indirir
  await A.evaluate(() => { const M = EO2.battle.state(); EO2.battle.api.hasarMob(M.act[1], 9999); EO2.battle.api.hasarMob(M.act[2], 9999); });
  await B.evaluate(() => { const M = EO2.battle.state(); EO2.battle.api.hasarMob(M.act[3], 9999); EO2.battle.api.hasarMob(M.act[4], 9999); });
  log.asama1 = await bekle(A, faz('cark')) && await bekle(B, faz('cark'));
  await cark(A, false); await cek(B, 'zindan_4_cark'); await cark(B, false);
  log.kampaDonus = await bekle(A, faz('bekleme') + ' && EO2.ortak.durum().ortak.asama === 1 && EO2.api.scene() === "kamp" && !EO2.battle.active()', 30000) && await bekle(B, faz('bekleme') + ' && EO2.api.scene() === "kamp" && !EO2.battle.active()', 30000);
  log.altinAsama = await A.evaluate(() => S.gold) - altin0;
  // ikinci aşama: Şahmeran
  await A.locator('#seferSerit [data-sf="hazir"]').click(); await B.evaluate(() => EO2.api.runAct('zindan:hazir'));
  log.savas2 = await bekle(A, savasta + ' && EO2.battle.state().boss', 30000) && await bekle(B, savasta + ' && EO2.battle.state().boss', 30000);
  log.kirilmaz = await A.evaluate(() => { const m = EO2.battle.state().T.mask; return m.includes(2) && !m.includes(1); });   // blok haritada zemin koyu gri: kırılmaz await A.waitForTimeout(1200); await cek(A, 'zindan_5_defile');
  // Şahmeran V3.1 çizimi yüklü mü; taç işareti ve saldırı karesi (ekran görüntüsü için)
  log.sahmeranCizim = await A.evaluate(() => { const b = EO2.battle.state().boss, im = EO2.battle.api.img(b.D.sayfa && b.D.sayfa.src); return !!(im && im.naturalWidth === 3720); });
  if (ekran) { await A.evaluate(() => { const b = EO2.battle.state().boss; b.acik = 0.35; b.anim = 'atk'; b.animT = 1.3; }); await A.waitForTimeout(120); await cek(A, 'zindan_5b_sahmeran'); await A.evaluate(() => { const b = EO2.battle.state().boss; b.acik = 0; }); }
  // A düşer (Anka külü yok): savaş ekranı kapanmaz, A arenada kalıp izler; sunucu A'nın sırasını atlar; bossa laf atma kutusu hiç çıkmaz
  log.siraA2 = await bekle(A, sirada('ben'), 30000);
  await A.evaluate(() => { const M = EO2.battle.state(); M.ben.hp = 0; M.ben.dead = true; M.ben.revive = 0; EO2.battle.pas(); });
  log.siraB2 = await bekle(B, sirada('ben'), 30000); await B.evaluate(() => { EO2.battle.pas(); });
  log.dustuArenada = await bekle(A, 'EO2.battle.active() && EO2.battle.state().ben.dustuKesin === true && EO2.ortak.durum().ortak.uye[EO2.ortak.durum().ben].hayatta === false && !EO2.battle.state().over', 120000);
  log.dusenAtlandi = await bekle(B, sirada('ben') + ' && EO2.battle.state().tur >= 3', 120000) && await A.evaluate(() => { const M = EO2.battle.state(); return M.aktif !== M.ben && document.getElementById('tpKim').textContent; });
  log.lafYok = await A.evaluate(() => document.getElementById('tpLaf').hidden) && await B.evaluate(() => document.getElementById('tpLaf').hidden); await cek(A, 'zindan_5c_dusen_izliyor');
  for (let i = 0; i < 6; i++) { await B.evaluate(() => { const M = EO2.battle.state(); if (M && M.boss && !M.boss.dead) EO2.battle.api.hasarBoss(M.boss, 2000, true); }); await B.waitForTimeout(250); }
  log.asama2 = await bekle(A, faz('cark')) && await bekle(B, faz('cark'));
  await cark(A, true); await cark(B, true);
  log.sonPen = await A.waitForSelector('.pen:has-text("Sefer tamamlandı")', { timeout: 20000 }).then(() => true, () => false) && await B.waitForSelector('.pen:has-text("Sefer tamamlandı")', { timeout: 20000 }).then(() => true, () => false);
  await cek(A, 'zindan_6_son'); await A.locator('.pen .gbtn:has-text("Meydana dön")').click(); await B.locator('.pen .gbtn:has-text("Meydana dön")').click();
  log.cikti = await bekle(A, '!EO2.ortak.durum().oda && EO2.api.scene() !== "kamp"', 40000) && await bekle(B, '!EO2.ortak.durum().oda && EO2.api.scene() !== "kamp"', 40000);
  log.altinToplam = await A.evaluate(() => S.gold) - altin0;
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.kod && log.davet && log.hazirGorundu && log.kamp && log.kamptaGordu && log.serit && log.tekHazirBaslamadi && log.savas && JSON.stringify(log.dusman) === '[900,855,855,900]' && log.yoldasTopcu && log.yoldasAd === 'Aylin' && log.yoldasAtes && log.yoldasYer && log.ortakCan && log.siraA && log.ruzgar[0] === log.ruzgar[1] && log.siraB && log.ruzgar2[0] === log.ruzgar2[1] && log.dusmanSirasi && log.dusmanAyni[0] === log.dusmanAyni[1] && log.turDondu && JSON.stringify(log.dusmanYer[0]) === JSON.stringify(log.dusmanYer[1]) && log.yoldasCercevesi
  && log.asama1 && log.kampaDonus && log.altinAsama >= 150 && log.savas2 && log.kirilmaz && log.sahmeranCizim && log.siraA2 && log.siraB2 && log.dustuArenada && !!log.dusenAtlandi && log.lafYok && log.asama2 && log.sonPen && log.cikti && log.altinToplam >= 400;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
