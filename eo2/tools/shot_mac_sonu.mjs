// EO2 · maç sonu, mezar taşı, çark ve sefer sonu ekranlarının görüntüleri (tek tarayıcı; gerçek süreler: window.__gercekAkis).
// Denetim değil, görüntü aracıdır: zafer ve yenilgi katmanı, düşen topçunun mezar taşı, Öncü Ganimet Çarkı, Ulu Kader Çarkı ve "Sefer tamamlandı".
// Kullanım: node eo2/tools/shot_mac_sonu.mjs <çıktı klasörü>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', out = process.argv[2] || 'eo2_mac_sonu', hata = []; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (ifade, ms = 40000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const cek = ad => p.screenshot({ path: path.join(out, ad + '.png') });
const SIRA = 'EO2.battle.active() && EO2.battle.state().faz === "nisan" && EO2.battle.state().aktif === EO2.battle.state().ben';
const devam = async () => { await bekle('document.getElementById("tpBitisDevam") && !document.getElementById("tpBitisDevam").disabled && !document.getElementById("tpBitis").hidden', 15000); await p.locator('#tpBitisDevam').click(); };
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500);
  await bekle('EO2.ag.cevrimici()'); await p.evaluate(() => { window.__gercekAkis = true; });
  // 1) talim: zafer
  await p.evaluate(() => { EO2.topcu.baslat('talim'); }); await bekle(SIRA); await p.waitForTimeout(800);
  await p.evaluate(() => { const M = EO2.battle.state(); M.ist.hasar = 1350; M.ist.kritik = 2; M.ist.enKombo = 3; M.ist.tur = 5; EO2.battle.sonlandir(true); });
  await p.waitForTimeout(1900); await cek('1_zafer'); await devam(); await p.waitForTimeout(900); await cek('2_zafer_sonuc');
  await p.locator('.pen .gbtn').last().click().catch(() => { }); await p.waitForTimeout(600); await p.evaluate(() => { if (EO2.battle.active()) EO2.battle.kapat(true); document.querySelectorAll('.pen .gbtn').forEach(b => { if (/Kapat|Ayrıl|Bitir|Tamam/.test(b.textContent)) b.click(); }); }); await p.waitForTimeout(800);
  // 2) talim: yenilgi ve mezar taşı
  await p.evaluate(() => { if (!EO2.battle.active()) EO2.topcu.baslat('talim'); }); await bekle(SIRA); await p.waitForTimeout(800);
  await p.evaluate(() => { const M = EO2.battle.state(); M.ben.hp = 0; M.ben.dead = true; M.ben.revive = 0; M.ist.hasar = 420; M.ist.tur = 4; EO2.battle.sonlandir(false); });
  await p.waitForTimeout(900); await cek('3_mezar_tasi'); await p.waitForTimeout(1300); await cek('4_yenilgi'); await devam(); await p.waitForTimeout(800);
  await p.evaluate(() => { if (EO2.battle.active()) EO2.battle.kapat(true); }); await p.waitForTimeout(500); await p.evaluate(() => { document.querySelectorAll('.pen .gbtn').forEach(b => { if (/Ayrıl|Kapat|Bırak|Meydan/.test(b.textContent)) b.click(); }); }); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.pen-perde, .pen').forEach(e => e.remove()); if (EO2.game.ekran()) EO2.game.close(); });
  // 3) Zümrüt Saray: köprü biter → Öncü Ganimet Çarkı
  await p.evaluate(() => EO2.zindan.tekBasla('sahmeran', 'normal')); await bekle('EO2.ortak.durum().ortak && EO2.api.scene() === "kamp"');
  await bekle('EO2.ortak.durum().ortak.faz === "bekleme" && !document.querySelector(".pen")'); await p.waitForTimeout(900); await p.evaluate(() => EO2.api.runAct('zindan:hazir')); await bekle(SIRA, 60000);
  for (let d = 1; d <= 3; d++) { await bekle('EO2.battle.state() && EO2.battle.state().dalgaNo === ' + d + ' && EO2.battle.state().act.some(a => a.takim === 1 && !a.dead)', 20000); await p.waitForTimeout(700); await p.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.takim === 1 && !a.dead) EO2.battle.api.hasarMob(a, 9999); }); }
  await bekle('!document.getElementById("tpBitis").hidden', 20000); await p.waitForTimeout(1900); await cek('5_asama_zafer'); await devam();
  await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.waitForTimeout(900); await cek('6_cark_once');
  await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(1600); await cek('7_cark_donuyor'); await p.waitForTimeout(4500); await cek('8_cark_sonuc');
  await p.locator('.pen .pen-f .gbtn').first().click().catch(() => { });
  // 4) defile: Şahmeran düşer → Ulu Kader Çarkı ve sefer sonu
  await bekle('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "bekleme" && EO2.ortak.durum().ortak.asama === 1 && EO2.api.scene() === "kamp" && !document.querySelector(".pen") && !EO2.battle.active()', 40000); await p.waitForTimeout(900);
  await p.evaluate(() => EO2.api.runAct('zindan:hazir')); await bekle(SIRA + ' && !!EO2.battle.state().boss', 60000); await p.waitForTimeout(600);
  await p.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.tur === 'mob' && !a.dead) EO2.battle.api.hasarMob(a, 9999); }); for (let i = 0; i < 6; i++) { await p.evaluate(() => { const M = EO2.battle.state(); if (M && M.boss && !M.boss.dead) EO2.battle.api.hasarBoss(M.boss, 2000, true); }); await p.waitForTimeout(250); }
  await bekle('!document.getElementById("tpBitis").hidden', 20000); await p.waitForTimeout(1900); await cek('9_boss_zafer'); await devam();
  await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.waitForTimeout(900); await cek('10_buyuk_cark_once');
  await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(6500); await cek('11_buyuk_cark_sonuc');
  await p.locator('.pen [data-tamam]').click().catch(() => { }); await p.waitForSelector('.pen:has-text("Sefer tamamlandı")', { timeout: 20000 }).catch(() => { }); await p.waitForTimeout(900); await cek('12_sefer_sonu');
} catch (e) { hata.push('görüntü: ' + String(e.message).slice(0, 300)); }
await b.close(); console.log(JSON.stringify({ dosyalar: fs.readdirSync(out).filter(f => f.endsWith('.png')), hata }, null, 1));
