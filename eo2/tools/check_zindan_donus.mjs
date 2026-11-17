// EO2 · sefere geri dönüş denetimi: tek kişilik sefer (aynı sistem, içinde tek kişi) açılır, savaşta bir düşmana hasar verilir,
// sayfa yenilenir. Beklenen: ocağa girilince oyuncu savaşa geri döner, düşman canları kaldığı yerden gelir, sıra sürer.
// (2026-11-17: yenilemeden sonra oyuncu kampta kalıyor, sefer öylece bekliyordu.)
// Kullanım: node eo2/tools/check_zindan_donus.mjs
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', hata = [], log = {};
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const durum = () => p.evaluate(() => { const d = EO2.ortak.durum(), M = EO2.battle.state(); return { faz: d.ortak ? d.ortak.faz : null, hp: d.ortak ? d.ortak.dusman.map(q => q.hp) : null, ekran: M && M.act ? M.act.filter(a => a.takim === 1).map(a => Math.round(a.hp)) : null, uye: d.oda ? d.oda.uyeler.length : 0, tekArena: !!(M && M.cfg.ortak && M.cfg.sahne) }; });
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000);
  log.cevrimici = await bekle('EO2.ag.cevrimici()');
  log.tekBasladi = await p.evaluate(() => EO2.zindan.tekVar('sahmeran') && EO2.zindan.tekBasla('sahmeran', 'normal'));
  log.kamp = await bekle('EO2.ortak.durum().ortak && EO2.api.scene() === "kamp"'); await p.waitForTimeout(1200); await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
  log.savas = await bekle('EO2.battle.active() && EO2.battle.state().faz === "nisan" && EO2.battle.state().aktif === EO2.battle.state().ben && EO2.ortak.durum().ortak', 40000);
  log.once = await durum();
  await p.evaluate(() => { const M = EO2.battle.state(); EO2.battle.api.hasarMob(M.act[2], 300); }); await p.waitForTimeout(900);
  await p.reload(); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.locator('.giris .gbtn').first().click();
  log.dondu = await bekle('EO2.battle.active() && EO2.battle.state().faz === "nisan" && EO2.battle.state().aktif === EO2.battle.state().ben', 60000);
  log.sonra = await durum();
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.cevrimici && log.tekBasladi && log.kamp && log.savas && log.once && log.once.uye === 1 && log.once.tekArena && log.dondu && log.sonra && log.sonra.faz === 'savas' && log.sonra.hp[1] === log.once.hp[1] - 300 && JSON.stringify(log.sonra.ekran) === JSON.stringify(log.sonra.hp);
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
