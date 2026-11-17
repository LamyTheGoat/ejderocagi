// EO2 · Volkanik Kaldera ve Batık Donanma'nın grupla (iki tarayıcı) denetimi.
// Ölçülenler: A zindanı seçip sefer kurar, B davetle katılır; aşama savaşı iki ekranda aynı arka plan, aynı düşman ve aynı canla açılır (denizli aşamada iki ekranda da deniz var);
// A'nın gerçek atışı zemini iki ekranda aynı yerden oyar (zemin haritası iki ekranda aynı kalır); sıra B'ye, sonra düşmana geçer; bir tur dönünce
// düşmanların yeri ve iki terbiyecinin canı iki ekranda aynıdır; düşmanlar inince ikisine de çark açılır ve ikinci aşama da aynı biçimde açılır.
// Kullanım: node eo2/tools/check_zindan_eski_grup.mjs   (EKRAN=<klasör> · YALNIZ=kaldera|donanma)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const ARENA = require(path.join(repo, 'eo2', 'js', 'arena_veri.js')), TARIF = require(path.join(repo, 'eo2', 'js', 'zindan_tarif.js'));
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const cark = async p => { await p.waitForSelector('.pen .tp-cark', { timeout: 30000 }); await p.locator('.pen .pen-f .gbtn').first().click(); await p.waitForTimeout(500); await p.locator('.pen .pen-f .gbtn').first().click(); };
const savasta = 'EO2.battle.active() && EO2.battle.state() && EO2.battle.state().act.length > 1 && EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "savas"';
const sirada = ad => 'EO2.battle.active() && EO2.battle.state().aktif && EO2.battle.state().faz === "nisan" && (' + (ad === 'ben' ? 'EO2.battle.state().aktif === EO2.battle.state().ben' : 'EO2.battle.state().aktif.yoldas && EO2.battle.state().aktif.ad === "' + ad + '"') + ')';
/* iki ekranı karşılaştırmak için savaşın özeti: zemin haritasının özeti, düşmanlar, deniz, terbiyecilerin canı (ada göre) */
const ozet = benAd => { const M = EO2.battle.state(), m = M.T.mask; let h = 2166136261, dolu = 0; for (let i = 0; i < m.length; i += 3) { h = Math.imul(h ^ m[i], 16777619); if (m[i]) dolu++; }
  const can = {}; can[benAd] = Math.round(M.ben.hp); for (const y of Object.values(M.yoldas || {})) can[y.ad] = Math.round(y.hp);
  return { zemin: h >>> 0, dolu, baslik: M.cfg.baslik, bg: !!M.cfg.bg, deniz: M.deniz != null ? Math.round(M.deniz * 10) / 10 : null, dusman: M.act.filter(a => a.takim === 1).map(a => a.ad + ':' + Math.round(a.max) + ':' + Math.round(a.hp)), yer: M.act.filter(a => a.takim === 1).map(a => Math.round(a.x * 10) / 10), can, tur: M.tur, ruzgar: M.wind }; };
for (const zk of (process.env.YALNIZ ? [process.env.YALNIZ] : ['kaldera', 'donanma'])) { const L = log[zk] = { asama: [] }, P = [];
  try {
    for (const ad of ['Aylin', 'Bora']) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(zk + ' ' + ad + ': ' + String(e.message).slice(0, 200))); P.push(p);
      await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && EO2.zindan && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(800);
      await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
      await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
      await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); await p.evaluate(() => { window.__fastFx = true; window.canEnterZindanOrTopcu = () => true; }); }
    const [A, B] = P;
    L.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1 && [...EO2.meydanAg.kisiler.values()][0].handle');
    await A.evaluate(() => EO2.game.open('zindan')); await A.locator('[data-zin="' + zk + '"]').click(); await A.waitForTimeout(300); await A.locator('[data-zn="kur"]').click();
    await bekle(A, 'document.querySelector(".zn-toplan .ms-kodluk b")');
    L.anahtar = await A.evaluate(() => EO2.ortak.durum().oda.anahtar);
    await A.evaluate(() => { const c = [...EO2.meydanAg.kisiler.values()][0]; EO2.zindan.cagir(c.handle, c.name); });
    L.davet = await B.waitForSelector('.pen:has-text("Sefer daveti")', { timeout: 12000 }).then(() => true, () => false);
    L.davetAdi = L.davet && await B.evaluate(() => document.querySelector('.pen').textContent.slice(0, 200));
    if (L.davet) await B.locator('.pen .gbtn:has-text("Sefere katıl")').click();
    await B.locator('[data-zn="hazir"]').click();
    await bekle(A, 'document.querySelector("[data-zn=baslat]") && !document.querySelector("[data-zn=baslat]").disabled'); await A.locator('[data-zn="baslat"]').click();
    L.kamp = await bekle(A, 'EO2.api.scene() === "kamp"', 40000) && await bekle(B, 'EO2.api.scene() === "kamp"', 40000);
    const adlar = TARIF[zk].asama;
    for (let i = 0; i < 2; i++) { const R = ARENA[adlar[i]], S = { ad: adlar[i] };
      for (const p of P) await bekle(p, 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "bekleme" && EO2.ortak.durum().ortak.asama === ' + i + ' && EO2.api.scene() === "kamp" && !document.querySelector(".pen") && !EO2.battle.active()', 40000);
      await A.waitForTimeout(900); for (const p of P) await p.evaluate(() => EO2.api.runAct('zindan:hazir'));
      S.savas = await bekle(A, savasta, 60000) && await bekle(B, savasta, 60000);
      S.sira = await bekle(A, sirada('ben'), 30000) && await bekle(B, sirada('Aylin'), 30000); await A.waitForTimeout(1200);
      const o0 = [await A.evaluate(ozet, 'Aylin'), await B.evaluate(ozet, 'Bora')]; S.ilk = o0;
      S.ayniAcilis = o0[0].zemin === o0[1].zemin && o0[0].baslik === R.ad && o0[1].baslik === R.ad && o0[0].bg && o0[1].bg && o0[0].deniz === o0[1].deniz && JSON.stringify(o0[0].dusman) === JSON.stringify(o0[1].dusman) && o0[0].ruzgar === o0[1].ruzgar && o0[0].dusman.length === R.dusman.length + (R.boss ? 1 : 0);
      S.denizVar = zk !== 'donanma' || o0[0].deniz != null;
      if (ekran) { await A.screenshot({ path: path.join(ekran, 'grup_' + zk + '_' + (i + 1) + '_a.png') }); await B.screenshot({ path: path.join(ekran, 'grup_' + zk + '_' + (i + 1) + '_b.png') }); }
      // A'nın gerçek atışı: yakına, yere (dik açı, kısa güç); zemin iki ekranda aynı yerden oyulur
      await A.evaluate(() => { const M = EO2.battle.state(); M.ben.angle = 60; }); await A.bringToFront(); await A.keyboard.down('Space'); await A.waitForTimeout(260); await A.keyboard.up('Space');
      S.siraB = await bekle(B, sirada('ben'), 40000) && await bekle(A, sirada('Bora'), 20000); await bekle(B, '!(EO2.battle.state().hayalet || []).length', 15000); await A.waitForTimeout(900);
      const o1 = [await A.evaluate(ozet, 'Aylin'), await B.evaluate(ozet, 'Bora')]; S.atisSonra = o1.map(q => ({ zemin: q.zemin, dolu: q.dolu }));
      S.zeminOyuldu = o1[0].dolu < o0[0].dolu || (await A.evaluate(() => !!EO2.battle.state().cfg.kirilmaz)); S.zeminAyni = o1[0].zemin === o1[1].zemin;
      // B geçer; düşman sırası; tur dönünce yerler ve canlar iki ekranda aynı
      await B.evaluate(() => { EO2.battle.pas(); });
      S.turDondu = await bekle(A, sirada('ben') + ' && EO2.battle.state().tur >= 2', 150000) && await bekle(B, sirada('Aylin') + ' && EO2.battle.state().tur >= 2', 40000); await A.waitForTimeout(1500);
      const o2 = [await A.evaluate(ozet, 'Aylin'), await B.evaluate(ozet, 'Bora')]; S.tur = o2.map(q => ({ yer: q.yer, can: q.can, zemin: q.zemin, dusman: q.dusman }));
      S.yerAyni = JSON.stringify(o2[0].yer) === JSON.stringify(o2[1].yer); S.canAyni = Math.abs(o2[0].can.Aylin - o2[1].can.Aylin) <= 1 && Math.abs(o2[0].can.Bora - o2[1].can.Bora) <= 1; S.zeminAyni2 = o2[0].zemin === o2[1].zemin; S.dusmanCanAyni = JSON.stringify(o2[0].dusman) === JSON.stringify(o2[1].dusman);
      if (ekran) await B.screenshot({ path: path.join(ekran, 'grup_' + zk + '_' + (i + 1) + '_tur.png') });
      await A.evaluate(() => { const M = EO2.battle.state(); for (const a of M.act) if (a.takim === 1 && !a.dead) EO2.battle.api[a.tur === 'boss' ? 'hasarBoss' : 'hasarMob'](a, 99999); });
      S.cark = await bekle(A, 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "cark"', 40000) && await bekle(B, 'EO2.ortak.durum().ortak && EO2.ortak.durum().ortak.faz === "cark"', 40000);
      await cark(A); await cark(B); L.asama.push(S); if (!S.savas) break; }
  } catch (e) { hata.push(zk + ' denetim: ' + String(e.message).slice(0, 300)); }
  for (const p of P) await p.context().close().catch(() => { }); }
await b.close();
const ok = !hata.length && Object.values(log).every(L => L.gordu && L.davet && L.kamp && L.asama.length === 2 && L.asama.every(S => S.savas && S.sira && S.ayniAcilis && S.denizVar && S.siraB && S.zeminOyuldu && S.zeminAyni && S.turDondu && S.yerAyni && S.canAyni && S.zeminAyni2 && S.dusmanCanAyni && S.cark));
console.log(JSON.stringify({ ok, hata: hata.slice(0, 10), log }, null, 1));
process.exit(ok ? 0 : 1);
