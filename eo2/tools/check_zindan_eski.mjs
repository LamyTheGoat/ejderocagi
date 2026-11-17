// EO2 · Volkanik Kaldera ve Batık Donanma'nın ortak sistemde baştan sona oynandığının denetimi (tek tarayıcı, tek kişilik sefer = içinde tek kişi olan ortak zindan).
// Bu iki zindanın arenaları çizimsizdir (arena.json içinde "eski"): zemin, arka plan, deniz ve özel kurallar eski aşamadan gelir; sıra, can ve akış sunucudadır.
// Ölçülenler (her zindanın dört aşaması için): sefer ortak odada kurulur; savaş açılır ve sıra oyuncuya gelir; arka plan ve zemin eski aşamanınkidir (denizli aşamada deniz var);
// düşmanlar arena kaydındaki sırayla ve sunucunun canıyla ekrandadır; düşmanlar inince çark açılır; son aşamadan sonra sefer tamamlanır. Sayfa hatası olmamalı.
// Kullanım: node eo2/tools/check_zindan_eski.mjs   (EKRAN=<klasör> ile ekran görüntüsü · YALNIZ=komutan|abra)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const ARENA = require(path.join(repo, 'eo2', 'js', 'arena_veri.js')), TARIF = require(path.join(repo, 'eo2', 'js', 'zindan_tarif.js'));
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const cark = async (p, buyuk) => { await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(500);
  if (buyuk) await p.locator('.pen [data-tamam]').click(); else await p.locator('.pen .pen-f .gbtn').first().click(); };
for (const odul of (process.env.YALNIZ ? [process.env.YALNIZ] : ['komutan', 'abra'])) { const L = log[odul] = { asama: [] };
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(odul + ': ' + String(e.message).slice(0, 200)));
  const bekle = (ifade, ms = 40000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
  try {
    await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1200);
    await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
    await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000);
    L.cevrimici = await bekle('EO2.ag.cevrimici()'); await p.evaluate(() => { window.__fastFx = true; });
    const zk = Object.keys(TARIF).find(k => TARIF[k].odul === odul), adlar = TARIF[zk].asama;
    L.basladi = await p.evaluate(o => EO2.zindan.tekVar(o) && EO2.zindan.tekBasla(o, 'normal'), odul);
    L.kamp = await bekle('EO2.ortak.durum().ortak && EO2.api.scene() === "kamp"');
    L.anahtar = await p.evaluate(() => EO2.ortak.durum().oda.anahtar);
    for (let i = 0; i < adlar.length; i++) { const R = ARENA[adlar[i]], beklenen = R.dusman.map(q => q.ad).concat(R.boss ? [R.boss.ad] : []), A = { ad: adlar[i] };
      await bekle('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "bekleme" && EO2.ortak.durum().ortak.asama === ' + i + ' && EO2.api.scene() === "kamp" && !document.querySelector(".pen")', 30000); await p.waitForTimeout(900);
      await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
      A.savas = await bekle('EO2.battle.active() && EO2.battle.state().faz === "nisan" && EO2.battle.state().aktif === EO2.battle.state().ben && EO2.ortak.durum().ortak.faz === "savas"', 60000);
      const d = await p.evaluate(() => { const M = EO2.battle.state(), o = EO2.ortak.durum().ortak, dus = M.act.filter(a => a.takim === 1); return { ortak: !!M.cfg.ortak, bg: !!M.cfg.bg, sahne: !!M.cfg.sahne, deniz: M.deniz != null, ozel: !!M.cfg.ozel, baslik: M.cfg.baslik, adlar: dus.map(a => a.ad), ekran: dus.map(a => Math.round(a.max)), sunucu: o.dusman.map(q => q.max), benYerde: Number.isFinite(M.ben.y) && M.ben.y > 2, kalkan: dus.map(a => a.kalkan | 0) }; });
      A.durum = d; A.dogru = A.savas && d.ortak && d.bg && !d.sahne && d.baslik === R.ad && JSON.stringify(d.adlar) === JSON.stringify(beklenen) && JSON.stringify(d.ekran) === JSON.stringify(d.sunucu) && JSON.stringify(d.sunucu) === JSON.stringify(R.dusman.map(q => Math.round(q.hp * 0.75)).concat(R.boss ? [Math.round(R.boss.hp * 0.75)] : [])) && d.benYerde && (odul !== 'abra' || (d.deniz && d.ozel));
      if (ekran) { await p.waitForTimeout(700); await p.screenshot({ path: path.join(ekran, 'eski_' + odul + '_' + (i + 1) + '.png') }); }
      // bir atış: gerçek hasar sunucuya gider (ilk düşmanın canı düşer), sonra hepsi indirilir
      await p.evaluate(() => { const M = EO2.battle.state(), a = M.act.find(x => x.takim === 1 && !x.dead); EO2.battle.api[a.tur === 'boss' ? 'hasarBoss' : 'hasarMob'](a, 120); }); await p.waitForTimeout(900);
      A.hasarGitti = await p.evaluate(() => { const o = EO2.ortak.durum().ortak; return o.dusman.some(q => q.hp < q.max); });
      await p.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.takim === 1 && !a.dead) EO2.battle.api[a.tur === 'boss' ? 'hasarBoss' : 'hasarMob'](a, 99999); });
      A.cark = await bekle('EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "cark"', 40000) || await bekle('!EO2.ortak.durum().ortak', 3000);
      await cark(p, i === adlar.length - 1).catch(e => hata.push(odul + ' çark ' + (i + 1) + ': ' + String(e.message).slice(0, 120)));
      L.asama.push(A); if (!A.savas) break; }
    L.bitti = await p.waitForSelector('.pen:has-text("Sefer tamamlandı")', { timeout: 30000 }).then(() => true, () => false);
  } catch (e) { hata.push(odul + ' denetim: ' + String(e.message).slice(0, 300)); }
  await p.context().close(); }
await b.close();
const ok = !hata.length && Object.values(log).every(L => L.cevrimici && L.basladi && L.kamp && L.asama.length === 4 && L.asama.every(A => A.dogru && A.hasarGitti && A.cark) && L.bitti);
console.log(JSON.stringify({ ok, hata: hata.slice(0, 10), log }, null, 1));
process.exit(ok ? 0 : 1);
