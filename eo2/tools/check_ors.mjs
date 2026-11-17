// EO2 · Kor Örsü denetimi (tek tarayıcı).
// Ölçülenler: taş yokken dövme düğmesi kapalıdır; bedel peşin düşer; üç çekiç darbesi (düğme ve boşluk tuşu) denemeyi bitirir; tutan deneme kademeyi yükseltir;
// harlı kademede tutmayan deneme bir kademe düşürür, Anka Mührü korur ve harcanır; cehennem kademesinde top çatlar ve artış durur; onarım dört kademe geri getirir;
// topçunun hasarı ve canı kademeyle artar; çarşıda Usta Kerim'in tezgâhındaki düğme örsü açar; kayıt sayfa yenilenince durur.
// Kullanım: node eo2/tools/check_ors.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const cek = (p, ad) => ekran ? p.screenshot({ path: path.join(ekran, ad + '.png') }) : null;
try {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.ors && EO2.topcu && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Demirci').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000);
  await p.evaluate(() => { window.__fastFx = true; });
  const durum = () => p.evaluate(() => { const d = EO2.ors.durum(), h = S.topcu.ganimet; return { k: d.kademe, c: d.catlak, altin: S.gold, t1: h.kor_t1 | 0, t2: h.kor_t2 | 0, t3: h.kor_t3 | 0, anka: h.anka_koruma | 0, faz: EO2.ors.ekranDurumu().faz, carpan: EO2.ors.carpan() }; });
  // 1) taş yokken düğme kapalı
  await p.evaluate(() => { S.topcu = S.topcu || {}; S.topcu.ganimet = {}; S.ors = { kademe: 0 }; EO2.game.open('ors'); }); await p.waitForTimeout(500);
  log.tassizKapali = await p.locator('[data-or="basla"]').isDisabled();
  const deger0 = await p.evaluate(() => { const v = EO2.topcu.oyuncuDeger(true); return { hp: v.hp, dmg: v.dmg }; });
  // 2) taş ve altınla: bedel peşin düşer, üç darbe (iki düğme, bir boşluk tuşu), tutar
  await p.evaluate(() => { S.gold = 50000; S.topcu.ganimet = { kor_t1: 200, kor_t2: 200, kor_t3: 200, anka_koruma: 2 }; window.__orsZar = 0; EO2.game.redraw(); }); await p.waitForTimeout(300);
  await cek(p, 'ors_1_bos');
  const once = await durum(); await p.locator('[data-or="basla"]').click(); await p.waitForTimeout(250); const tav = await durum();
  log.bedelPesin = tav.faz === 'tav' && tav.altin === once.altin - 40 && tav.t1 === once.t1 - 3;
  log.ibreOynuyor = await p.evaluate(async () => { const el = document.getElementById('orIbre'), a = el.style.left; await new Promise(r => setTimeout(r, 180)); return el.style.left !== a; });
  await cek(p, 'ors_2_tav');
  await p.locator('[data-or="vur"]').click({ force: true }); await p.waitForTimeout(150); await p.locator('[data-or="vur"]').click({ force: true }); await p.waitForTimeout(150); await p.keyboard.press('Space');
  await p.waitForFunction('EO2.ors.ekranDurumu().faz === "sonuc"', null, { timeout: 8000 }).catch(() => { });
  const s1 = await durum(); log.tuttu = s1.faz === 'sonuc' && s1.k >= 1 && !!(await p.locator('.or-damga').count());
  await cek(p, 'ors_3_tuttu'); await p.locator('[data-or="tamam"]').click(); await p.waitForTimeout(250);
  // 3) usta işi: üç altın darbe iki kademe verir (oyunsuz yol)
  log.usta = await p.evaluate(() => { S.ors.kademe = 2; const r = EO2.ors.dene({ vuruslar: ['altin', 'altin', 'altin'], zar: 0 }); return r && r.olay === 'usta' && EO2.ors.durum().kademe === 4; });
  // 4) harlı kademe: tutmazsa bir düşer; Anka korur ve harcanır
  log.harliDustu = await p.evaluate(() => { S.ors.kademe = 5; const r = EO2.ors.dene({ vuruslar: ['soguk', 'soguk', 'soguk'], zar: 99.9 }); return r.olay === 'dustu' && EO2.ors.durum().kademe === 4; });
  log.ankaKorudu = await p.evaluate(() => { S.ors.kademe = 5; const a0 = S.topcu.ganimet.anka_koruma, r = EO2.ors.dene({ vuruslar: [], zar: 99.9, anka: true }); return r.olay === 'anka' && EO2.ors.durum().kademe === 5 && S.topcu.ganimet.anka_koruma === a0 - 1; });
  // 5) cehennem: ekranda oynanır, tutmaz, top çatlar; artış durur; onarım
  await p.evaluate(() => { S.ors.kademe = 9; S.ors.catlak = false; window.__orsZar = 99.9; EO2.game.redraw(); }); await p.waitForTimeout(300);
  log.riskYazisi = (await p.locator('.or-risk').innerText()).includes('çatlar'); log.ankaSecenegi = await p.locator('[data-or-sec="anka"]').count() === 1;
  const c9 = (await durum()).carpan; await cek(p, 'ors_4_cehennem');
  await p.locator('[data-or="basla"]').click(); await p.waitForTimeout(200); for (let i = 0; i < 3; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(120); }
  await p.waitForFunction('EO2.ors.ekranDurumu().faz === "sonuc"', null, { timeout: 8000 }).catch(() => { });
  const s5 = await durum(); log.catladi = s5.c === true && s5.k === 9 && s5.carpan === 1 && Math.abs(c9 - 1.18) < 1e-9; await cek(p, 'ors_5_catladi');
  await p.locator('[data-or="tamam"]').click(); await p.waitForTimeout(250);
  log.catlakkenDovulmez = await p.locator('[data-or="basla"]').count() === 0 && await p.locator('[data-or="onar"]').count() === 1; await cek(p, 'ors_6_catlak');
  const o0 = await durum(); await p.locator('[data-or="onar"]').click(); await p.waitForTimeout(300); const o1 = await durum();
  log.onarildi = o1.c === false && o1.k === 5 && o1.altin === o0.altin - 600 && o1.t1 === o0.t1 - 12 && Math.abs(o1.carpan - 1.1) < 1e-9;
  // 6) topçunun değerleri kademeyle artar
  const deger5 = await p.evaluate(() => { const v = EO2.topcu.oyuncuDeger(true); return { hp: v.hp, dmg: v.dmg }; });
  log.topcuArtti = deger5.hp === Math.round(deger0.hp * 1.1) && deger5.dmg === Math.round(deger0.dmg * 1.1); log.deger = [deger0, deger5];
  // 7) zirve
  log.zirve = await p.evaluate(() => { S.ors.kademe = 12; EO2.game.redraw(); return !!document.querySelector('.or-zirve') && !document.querySelector('[data-or="basla"]') && EO2.ors.dene({ zar: 0 }) === null; });
  await cek(p, 'ors_7_zirve');
  // 8) çarşıdaki giriş
  await p.evaluate(() => { S.ors.kademe = 5; EO2.game.close(); EO2.game.open('pazar'); }); await p.waitForTimeout(500);
  await p.locator('[data-stall="demir"]').first().click().catch(() => { }); await p.waitForTimeout(400); await cek(p, 'ors_8_carsi');
  log.carsiDugmesi = await p.locator('[data-ors]').count() === 1; if (log.carsiDugmesi) { await p.locator('[data-ors]').click(); await p.waitForTimeout(400); }
  log.carsidanAcildi = await p.evaluate(() => EO2.game.ekran() === 'ors');
  // 9) dar ekran ve kayıt
  await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(500); await cek(p, 'ors_9_telefon'); await p.setViewportSize({ width: 1280, height: 720 });
  await p.evaluate(() => { saveGame(); }); await p.reload(); await p.waitForFunction('window.EO2 && EO2.game && EO2.ors && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200); await p.locator('.giris .gbtn').first().click(); await p.waitForTimeout(2500);
  log.kayitta = await p.evaluate(() => EO2.game.live && EO2.ors.durum().kademe === 5);
} catch (e) { hata.push('betik: ' + String(e.message).slice(0, 300)); }
await b.close();
const beklenen = ['tassizKapali', 'bedelPesin', 'ibreOynuyor', 'tuttu', 'usta', 'harliDustu', 'ankaKorudu', 'riskYazisi', 'ankaSecenegi', 'catladi', 'catlakkenDovulmez', 'onarildi', 'topcuArtti', 'zirve', 'carsiDugmesi', 'carsidanAcildi', 'kayitta'];
const ok = !hata.length && beklenen.every(k => log[k] === true);
console.log(JSON.stringify({ ok, hata, eksik: beklenen.filter(k => log[k] !== true), log }));
process.exit(ok ? 0 : 1);
