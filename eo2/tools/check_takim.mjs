// EO2 · Takım Meydanı 2v2 denetimi (dört tarayıcı): dört oyuncu herkese açık sıraya girer, maç kendiliğinden başlar.
// Ölçülenler: takımlar ve yerler; sıra ve rüzgâr dört ekranda aynı; karşı takımın topçuları görünür; isabet canı sunucuda düşürür ve
// dört ekranda aynı görünür; düşen oyuncu meydanda kalır, sırası atlanır; bir takım bitince dört ekranda doğru sonuç çıkar.
// Kullanım: node eo2/tools/check_takim.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), P = [];
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const hepsi = async (ifade, ms) => (await Promise.all(P.map(p => bekle(p, ifade, ms)))).every(Boolean);
try {
  for (const ad of ['Aylin', 'Bora', 'Cem', 'Deniz']) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160))); P.push(p);
    await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.takim && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
    await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
    await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500); await bekle(p, 'EO2.ag.cevrimici()'); }
  // herkese açık sıra: dört kişi olunca oda açılır ve maç başlar
  for (const p of P) { await p.evaluate(() => EO2.game.open('takim')); await p.waitForTimeout(500); await p.evaluate(() => EO2.ortak.kuyruk('takim', '2v2')); await p.waitForTimeout(400); }   // yeni ocakta meydan mühürlüdür (omuz ejderi gerek); denetim sıraya doğrudan girer
  log.basladi = await hepsi('EO2.battle.active() && EO2.takim.macta() && EO2.battle.state().adim >= 1 && EO2.battle.state().aktif', 60000);
  const bilgi = () => { const d = EO2.ortak.durum(), M = EO2.battle.state(), me = d.ortak.uye[d.ben]; return { ben: d.ben, takim: me.takim, sira: d.ortak.sav.kim, ruzgar: M.wind, benimSira: M.aktif === M.ben, x: Math.round(M.ben.x), rakip: M.act.filter(a => a.takim === 1 && a.yoldas).length, dost: M.act.filter(a => a.takim === 0 && a.yoldas).length, sirali: d.ortak.sira }; };
  const B0 = await Promise.all(P.map(p => p.evaluate(bilgi))); log.takimlar = B0.map(q => q.takim).join(''); log.yerler = B0.map(q => q.x);
  log.gorunum = B0.every(q => q.rakip === 2 && q.dost === 1); log.ayniSira = B0.every(q => q.sira === B0[0].sira && q.ruzgar === B0[0].ruzgar); log.tekSira = B0.filter(q => q.benimSira).length === 1;
  const sira = B0[0].sirali, kim = id => P[B0.findIndex(q => q.ben === id)], takimOf = id => B0.find(q => q.ben === id).takim;
  if (ekran) await P[0].screenshot({ path: path.join(ekran, 'takim_1_basla.png') });
  // sırası gelen, karşı takımın ilk oyuncusuna isabet bildirir: can sunucuda düşer, dört ekranda aynı
  const atan = sira[0], hedef = sira[1], hedef2 = sira[3];
  await kim(atan).evaluate(id => EO2.ortak.eylem({ t: 'isabet', kime: id, h: 400, bas: false, it: 1 }), hedef);
  log.canAyni = await hepsi('EO2.ortak.durum().ortak.uye["' + hedef + '"].hp > 0 && EO2.ortak.durum().ortak.uye["' + hedef + '"].hp === EO2.ortak.durum().ortak.uye["' + hedef + '"].max - 400', 15000);
  log.ekrandaCan = await kim(hedef).evaluate(() => { const M = EO2.battle.state(); return Math.round(M.ben.max - M.ben.hp); });
  log.dostAtesiYok = await kim(atan).evaluate(async id => { EO2.ortak.eylem({ t: 'isabet', kime: id, h: 400 }); await new Promise(r => setTimeout(r, 900)); const u = EO2.ortak.durum().ortak.uye[id]; return u.hp === u.max || u.max === 0; }, sira[2]);
  log.siraDisiSayilmaz = await kim(sira[2]).evaluate(async id => { EO2.ortak.eylem({ t: 'isabet', kime: id, h: 400 }); await new Promise(r => setTimeout(r, 900)); const u = EO2.ortak.durum().ortak.uye[id]; return u.max - u.hp === 400; }, hedef);
  // hedef düşer: meydanda kalır, sırası atlanır (sıra doğrudan üçüncü oyuncuya geçer)
  await kim(atan).evaluate(id => EO2.ortak.eylem({ t: 'isabet', kime: id, h: 99999 }), hedef);
  log.dustuKaldi = await bekle(kim(hedef), 'EO2.battle.active() && EO2.battle.state().ben.dustuKesin === true && !EO2.battle.state().over', 15000);
  await kim(atan).evaluate(() => EO2.battle.pas());
  log.dusenAtlandi = await hepsi('EO2.ortak.durum().ortak.sav.kim === "' + sira[2] + '"', 30000);
  if (ekran) await kim(hedef).screenshot({ path: path.join(ekran, 'takim_2_dusen_izliyor.png') });
  // üçüncü oyuncu karşı takımın kalanını indirir: maç biter, dört ekranda doğru sonuç
  await bekle(kim(sira[2]), 'EO2.battle.state().aktif === EO2.battle.state().ben && EO2.battle.state().faz === "nisan"', 30000);
  // GERÇEK ATIŞ: üçüncü oyuncu rakibinin dibine alınır ve topunu gerçekten ateşler (boşluk tuşu). Gülle isabet eder, motor isabeti kendisi bildirir,
  // sunucu canı düşürür ve dört ekranda aynı can görünür. (Öteki adımlar isabeti doğrudan bildirir; bu adım motorun kendi yolunu ölçer.)
  { const atanP = kim(sira[2]);
    await atanP.evaluate(id => { const M = EO2.battle.state(), e = M.yoldas[id], yon = Math.sign(e.x - M.ben.x) || 1; M.ben.x = e.x - 1.7 * yon; M.ben.y = EO2.battle.api.yerY(M.ben.x); M.ben.face = yon; M.ben.angle = 5; }, hedef2);
    await atanP.bringToFront(); await atanP.keyboard.down('Space'); await atanP.waitForTimeout(240); await atanP.keyboard.up('Space');
    log.gercekAtis = await hepsi('(() => { const u = EO2.ortak.durum().ortak.uye["' + hedef2 + '"]; return u.max > 0 && u.hp < u.max; })()', 25000);
    log.gercekHasar = await P[0].evaluate(id => { const u = EO2.ortak.durum().ortak.uye[id]; return u.max - u.hp; }, hedef2);
    await P[0].waitForTimeout(1200);
    log.ekranlardaAyni = (await Promise.all(P.map(p => p.evaluate(id => { const M = EO2.battle.state(), d = EO2.ortak.durum(), u = d.ortak.uye[id], a = id === d.ben ? M.ben : M.yoldas[id]; return Math.round(a.hp) === u.hp; }, hedef2)))).every(Boolean);
    if (ekran) await atanP.screenshot({ path: path.join(ekran, 'takim_2b_gercek_atis.png') });
    // atıştan sonra sıra dördüncü oyuncuya geçer; o geçer, sıra ilk oyuncuya gelir ve maçı o bitirir
    log.siraDorduncude = await hepsi('EO2.ortak.durum().ortak.sav.kim === "' + sira[3] + '"', 40000);
    await bekle(kim(sira[3]), 'EO2.battle.state().aktif === EO2.battle.state().ben && EO2.battle.state().faz === "nisan"', 30000); await kim(sira[3]).evaluate(() => EO2.battle.pas());
    await bekle(kim(sira[0]), 'EO2.battle.state().aktif === EO2.battle.state().ben && EO2.battle.state().faz === "nisan"', 40000);
    await kim(sira[0]).evaluate(id => EO2.ortak.eylem({ t: 'isabet', kime: id, h: 99999 }), hedef2); }
  const sonuclar = await Promise.all(P.map(p => p.waitForSelector('.pen:has-text("Takımın")', { timeout: 30000 }).then(async () => (await p.locator('.pen h2, .pen h3, .pen .pen-t').first().textContent().catch(() => '')) || await p.evaluate(() => document.querySelector('.pen').textContent.slice(0, 60)), () => 'yok')));
  log.sonuclar = sonuclar.map((s, i) => takimOf(B0[i].ben) + ':' + (/kazandı/.test(s) ? 'kazandı' : /yenildi/.test(s) ? 'yenildi' : s.slice(0, 20)));
  if (ekran) await P[0].screenshot({ path: path.join(ekran, 'takim_3_sonuc.png') });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const kazanan = log.takimlar ? log.takimlar[0] : '';
const ok = !hata.length && log.basladi && log.takimlar === 'ABAB' && log.gorunum && log.ayniSira && log.tekSira && log.canAyni && log.ekrandaCan === 400 && log.dostAtesiYok && log.siraDisiSayilmaz && log.dustuKaldi && log.dusenAtlandi && log.gercekAtis && log.gercekHasar > 0 && log.ekranlardaAyni && log.siraDorduncude && Array.isArray(log.sonuclar) && log.sonuclar.every(s => s === (s[0] === kazanan ? kazanan + ':kazandı' : s[0] + ':yenildi'));
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
