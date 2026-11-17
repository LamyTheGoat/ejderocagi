// EO2 · Topçu düellosu 1v1 denetimi (iki tarayıcı; Er Meydanı'nın herkese açık eşleşmesi, server/pvp_rooms.js).
// Ölçülenler: iki oyuncu sıraya girince maç kendiliğinden başlar; sıra tek kişidedir ve rüzgâr iki ekranda aynıdır; rakip topçu ekranda görünür;
// gerçek atış rakibin canını düşürür ve iki ekranda aynı can görünür; atıştan sonra sıra rakibe geçer; canı biten kaybeder ve iki ekranda doğru sonuç çıkar.
// Ödül yoktur: maçtan sonra iki oyuncunun altını değişmez.
// Kullanım: node eo2/tools/check_topcu_duello.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), P = [];
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const iki = async (ifade, ms) => (await Promise.all(P.map(p => bekle(p, ifade, ms)))).every(Boolean);
const SIRA_BENDE = 'EO2.battle.active() && EO2.battle.state().aktif === EO2.battle.state().ben && EO2.battle.state().faz === "nisan"';
try {
  for (const ad of ['Aylin', 'Bora']) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160))); P.push(p);
    await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.topcuPvp && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
    await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
    await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(2500); await bekle(p, 'EO2.ag.cevrimici()'); }
  const altin0 = await Promise.all(P.map(p => p.evaluate(() => S.gold)));
  // herkese açık sıra (yeni ocakta meydan mühürlüdür; denetim sıraya doğrudan girer, oyunun gönderdiği iletinin aynısıyla)
  for (const p of P) { await p.evaluate(() => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_queue_join', mode: '1v1', el: o.el, chibi: { set: o.set, ad: o.ad } }); }); await p.waitForTimeout(500); }
  log.basladi = await iki('EO2.battle.active() && EO2.battle.state().cfg.kip === "pvp" && !!EO2.battle.state().rakip && EO2.battle.state().aktif', 60000); await P[0].waitForTimeout(2500);
  const bilgi = () => { const M = EO2.battle.state(); return { benim: M.aktif === M.ben, ruzgar: M.wind, rakipAd: M.rakip.ad, x: Math.round(M.ben.x), rx: Math.round(M.rakip.x), can: Math.round(M.ben.hp), rcan: Math.round(M.rakip.hp) }; };
  await Promise.race(P.map(p => bekle(p, SIRA_BENDE, 40000)));
  const B0 = await Promise.all(P.map(p => p.evaluate(bilgi))); log.ilk = B0;
  log.tekSira = B0.filter(q => q.benim).length === 1; log.ayniRuzgar = B0[0].ruzgar === B0[1].ruzgar; log.rakipGorunur = B0[0].rakipAd === 'Bora' && B0[1].rakipAd === 'Aylin' && B0[0].rx === B0[1].x && B0[1].rx === B0[0].x;
  if (ekran) await P[0].screenshot({ path: path.join(ekran, 'duello_1_basla.png') });
  const ai = B0[0].benim ? 0 : 1, atan = P[ai], hedef = P[1 - ai];
  const gercekAtis = async () => { await atan.evaluate(() => { const M = EO2.battle.state(), e = M.rakip, Y = EO2.battle.api.yerY, yon = Y(e.x - 1.7) <= Y(e.x + 1.7) ? 1 : -1;   /* yamaçta alçak yandan: gülle rakibin üstünden aşmasın */
      M.ben.x = e.x - 1.7 * yon; M.ben.y = Y(M.ben.x); M.ben.face = yon; M.ben.angle = Math.max(0, Math.min(60, Math.round(Math.atan2(e.y - M.ben.y, 1.7) * 180 / Math.PI) + 4)); });
    await atan.waitForTimeout(400); await atan.bringToFront(); await atan.keyboard.down('Space'); await atan.waitForTimeout(240); await atan.keyboard.up('Space'); };
  // gerçek atış: hasarı alan uç kendi canına yazar ve bildirir; iki ekranda aynı can
  await gercekAtis();
  log.isabet = await bekle(hedef, 'EO2.battle.state().ben.hp < EO2.battle.state().ben.max', 25000); await atan.waitForTimeout(1500);
  const c1 = await Promise.all([hedef.evaluate(() => Math.round(EO2.battle.state().ben.hp)), atan.evaluate(() => Math.round(EO2.battle.state().rakip.hp))]); log.canlar = c1; log.canAyni = c1[0] === c1[1] && c1[0] > 0;
  if (ekran) await atan.screenshot({ path: path.join(ekran, 'duello_2_isabet.png') });
  // sıra rakibe geçer; rakip geçer; sıra yine atana gelir
  log.siraGecti = await bekle(hedef, SIRA_BENDE, 40000); await hedef.waitForTimeout(600); await hedef.evaluate(() => EO2.battle.pas());
  log.siraDondu = await bekle(atan, SIRA_BENDE, 40000);
  // rakibin canı tek vuruşluk kalır (kendi ucunda), gerçek atış maçı bitirir
  await hedef.evaluate(() => { const M = EO2.battle.state(); M.ben.hp = 5; M.ben.revive = 0; }); await gercekAtis();
  log.bitti = await iki('!!EO2.topcuPvp.durum().sonuc && !!document.querySelector(".pen")', 40000);
  log.sonuclar = [await atan.evaluate(() => EO2.topcuPvp.durum().sonuc), await hedef.evaluate(() => EO2.topcuPvp.durum().sonuc)];
  if (ekran) { await atan.waitForTimeout(800); await atan.screenshot({ path: path.join(ekran, 'duello_3_sonuc.png') }); }
  const altin1 = await Promise.all(P.map(p => p.evaluate(() => S.gold))); log.odulYok = altin0[0] === altin1[0] && altin0[1] === altin1[1];
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.basladi && log.tekSira && log.ayniRuzgar && log.rakipGorunur && log.isabet && log.canAyni && log.siraGecti && log.siraDondu && log.bitti && Array.isArray(log.sonuclar) && /Kazand/.test(log.sonuclar[0]) && /Kaybett/.test(log.sonuclar[1]) && log.odulYok;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
