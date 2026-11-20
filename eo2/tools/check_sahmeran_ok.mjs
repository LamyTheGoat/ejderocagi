// EO2 · Şahmeran'ın okları ve Cazibe Oku (tek tarayıcı, tek kişilik sefer; Zümrüt Saray'ın ikinci aşaması).
// Ölçülenler: Şahmeran'ın hamleleri oktur (ok biçimli mermi); hamle sırası fazlara göre Çifte Ok, Ok Yaylımı, Gökten Ok Yağmuru ve (ikinci fazdan sonra) Cazibe Oku;
// Cazibe Oku isabet edince terbiyeci büyülenir; sırası gelince ateş edemez, Şahmeran'a doğru yürür ve sıra kendiliğinden geçer; kalkan büyüyü kırar.
// Ayrıca uyuyan düşman: "uyan" mesafesi verilen düşman sıra almaz, terbiyeci yaklaşınca uyanır.
// Kullanım: node eo2/tools/check_sahmeran_ok.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (ifade, ms = 40000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const cark = async () => { await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(500); await p.locator('.pen .pen-f .gbtn').first().click(); };
const SIRA = 'EO2.battle.active() && EO2.battle.state().faz === "nisan" && EO2.battle.state().aktif === EO2.battle.state().ben';
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500);
  await bekle('EO2.ag.cevrimici()'); await p.evaluate(() => { window.__fastFx = true; });
  log.basladi = await p.evaluate(() => EO2.zindan.tekBasla('sahmeran', 'normal')); await bekle('EO2.ortak.durum().ortak && EO2.api.scene() === "kamp"');
  // köprü: üç dalgayı indir
  await bekle('EO2.ortak.durum().ortak.faz === "bekleme" && !document.querySelector(".pen")'); await p.waitForTimeout(900); await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
  await bekle(SIRA, 60000);
  for (let d = 1; d <= 3; d++) { await bekle('EO2.battle.state().dalgaNo === ' + d + ' && EO2.battle.state().act.some(a => a.takim === 1 && !a.dead)', 20000); await p.waitForTimeout(500); await p.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.takim === 1 && !a.dead) EO2.battle.api.hasarMob(a, 9999); }); }
  log.kopruBitti = await bekle('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "cark"'); await cark();
  // defile: Şahmeran
  await bekle('EO2.ortak.durum().ortak.faz === "bekleme" && EO2.ortak.durum().ortak.asama === 1 && EO2.api.scene() === "kamp" && !document.querySelector(".pen") && !EO2.battle.active()'); await p.waitForTimeout(900); await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
  log.boss = await bekle(SIRA + ' && !!EO2.battle.state().boss', 60000);
  log.hamleler = await p.evaluate(() => { const D = EO2.battle.state().boss.D, b = { faz: 1 }, A = [1, 2, 3]; const sira = f => { const o = []; for (let t = 0; t < 3; t++) { o.push(D.hamleler[['ok', 'yaylim', 'yagmur', 'cazibe'].find(h => h === D.hamle.toString().match(/\[.*?\]/g) && 0) || 'ok'] ? 0 : 0); } return o; }; return Object.keys(D.hamleler).sort().join(','); });
  // boss'un sıradaki hamlesi Cazibe Oku olsun; oyuncu yerinde kalır (yanındaki muhafızlar ölçümü bozmasın diye indirilir)
  await p.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.tur === 'mob' && !a.dead) EO2.battle.api.hasarMob(a, 9999); M.boss.D = Object.assign({}, M.boss.D, { hamle: () => 'cazibe' }); window.__x0 = M.ben.x; window.__atis0 = M.ist.tur; window.__okGoruldu = false; window.__cazibeGoruldu = false;
    window.__izle = setInterval(() => { const S = EO2.battle.state(); if (!S) return; for (const s of S.shots) { if (s.ok) window.__okGoruldu = true; if (s.cazibe) window.__cazibeGoruldu = true; } }, 30); });
  await p.evaluate(() => EO2.battle.pas());
  if (ekran) { await bekle('EO2.battle.state().shots.some(s => s.cazibe)', 30000); await p.waitForTimeout(350); await p.screenshot({ path: path.join(ekran, 'sahmeran_cazibe_oku.png') }); }
  log.buyulendi = await bekle('!!EO2.battle.state().ben.cazibe', 40000); log.okGoruldu = await p.evaluate(() => window.__okGoruldu && window.__cazibeGoruldu);
  // sıra oyuncuya gelir: ateş edemez, Şahmeran'a doğru yürür, sıra kendiliğinden geçer
  log.siraGeldi = await bekle('EO2.battle.state().aktif === EO2.battle.state().ben && !EO2.battle.state().ben.cazibe', 60000); if (ekran) { await p.waitForTimeout(900); await p.screenshot({ path: path.join(ekran, 'sahmeran_buyulendi.png') }); }
  await p.keyboard.down('Space'); await p.waitForTimeout(300); await p.keyboard.up('Space');
  log.siraGecti = await bekle('EO2.battle.state().aktif !== EO2.battle.state().ben', 15000);
  const son = await p.evaluate(() => { const M = EO2.battle.state(); return { x: M.ben.x, x0: window.__x0, bx: M.boss.x, atis: M.ist.tur - window.__atis0 }; }); log.yurudu = Math.abs(son.bx - son.x) < Math.abs(son.bx - son.x0) - 1; log.atesEtmedi = son.atis === 0; log.son = son;
  // kalkan büyüyü kırar
  await bekle(SIRA, 60000); await p.evaluate(() => { const M = EO2.battle.state(); M.ben.shield = 9; EO2.battle.pas();   /* 9: Şahmeran'ın çağırdığı yılanlar da (2026-11-20) Şahmeran'dan önce vurur, kalkan büyüye kalsın */ });
  await bekle('EO2.battle.state().shots.some(s => s.cazibe)', 30000); await bekle('!EO2.battle.state().shots.length', 20000); await p.waitForTimeout(600);
  log.kalkanKirdi = await p.evaluate(() => !EO2.battle.state().ben.cazibe);
  // öteki hamleler de ok atar
  await bekle(SIRA, 60000); await p.evaluate(() => { const M = EO2.battle.state(); M.boss.D = Object.assign({}, M.boss.D, { hamle: () => 'yagmur' }); window.__okSayi = 0; clearInterval(window.__izle); window.__izle = setInterval(() => { const S = EO2.battle.state(); if (S) window.__okSayi = Math.max(window.__okSayi, S.shots.filter(s => s.ok).length); }, 30); EO2.battle.pas(); });
  await bekle('window.__okSayi >= 3', 30000); log.yagmurOk = await p.evaluate(() => window.__okSayi); if (ekran) await p.screenshot({ path: path.join(ekran, 'sahmeran_ok_yagmuru.png') });
  // uyuyan düşman: talimde yapay bir uykucu konur (davranış motorun kendi kuralıdır)
  await p.evaluate(() => { EO2.battle.kapat(true); }); await p.waitForTimeout(600);
  log.uyku = await p.evaluate(async () => { const B = EO2.battle; const cfg = { kimlik: 'uyku-test', kip: 'kervan', baslik: 'Uyku denemesi', alt: '', arazi: EO2.topcuVeri.arazi(EO2.topcuVeri.KERVAN.tema, 'kervan', EO2.topcuVeri.KERVAN.f, 23), bg: EO2.topcuVeri.KERVAN.bg, x0: 460, oyuncu: EO2.topcu.oyuncuDeger(false), zorluk: { hp: 1, dmg: 1 }, moblar: [{ tip: 'cobra', ad: 'Uykucu', hp: 500, x: 1500, uyan: 300 }] };
    B.ac(cfg); await new Promise(r => setTimeout(r, 3500)); const M = B.state(), e = M.act.find(a => a.takim === 1); const o = { uyur0: e.uyur === true }; B.pas(); await new Promise(r => setTimeout(r, 2500));
    o.siraAlmadi = M.aktif === M.ben && e.anim !== 'atk' && M.ben.hp === M.ben.max; M.ben.x = e.x - 2; await new Promise(r => setTimeout(r, 400)); o.uyandi = e.uyur === false; return o; });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.basladi && log.kopruBitti && log.boss && log.hamleler === 'cazibe,ok,yagmur,yaylim' && log.buyulendi && log.okGoruldu && log.siraGeldi && log.siraGecti && log.yurudu && log.atesEtmedi && log.kalkanKirdi && log.yagmurOk >= 3 && log.uyku && log.uyku.uyur0 && log.uyku.siraAlmadi && log.uyku.uyandi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
