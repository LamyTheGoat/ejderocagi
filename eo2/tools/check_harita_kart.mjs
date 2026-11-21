// EO2 · Er Meydanı harita seçimi ve ejderha kartı denetimi (iki tarayıcı, gerçek oyun sunucusu).
// Ölçülenler: kurucu bekleme odasında haritayı seçer, misafir aynı haritayı görür; maç iki uçta aynı arenada açılır (sahne resmi, kırılmaz zemin),
// iki terbiyeci ayna konumdadır; "Rastgele" iki uçta aynı haritaya çözülür. Ahır → Bilgi → "Kartını çıkar" kart penceresini açar, kart 1080×1350 PNG'dir.
// Kullanım: URL=http://localhost:3210/ node eo2/tools/check_harita_kart.mjs   (EKRAN=<klasör> ile ekran görüntüsü; KANAL=msedge Windows'ta)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json'));
let pw; try { pw = require('playwright-core'); } catch (_) { pw = createRequire(process.env.PW_YOL || '/opt/node-tools/node_modules/')('playwright'); }
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await pw.chromium.launch(Object.assign({ headless: true }, process.env.KANAL ? { channel: process.env.KANAL } : {})), P = [];
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const iki = async (ifade, ms) => (await Promise.all(P.map(p => bekle(p, ifade, ms)))).every(Boolean);
const goruntu = async (p, ad) => { if (ekran) await p.screenshot({ path: path.join(ekran, ad) }); };
try {
  for (const ad of ['Aylin', 'Bora']) { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160))); P.push(p);
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.topcuPvp && document.querySelector(".giris")', null, { timeout: 180000 }); await p.waitForTimeout(800);
    await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click({ force: true }); await p.waitForTimeout(400);
    await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click({ force: true }); await p.waitForTimeout(2500); await bekle(p, 'EO2.ag.cevrimici()', 40000);
    await p.evaluate(() => { window.__fastFx = true; document.querySelectorAll('.pen-perde').forEach(x => x.remove()); }); }
  const [A, Bp] = P;
  // 1) oda: kurucu Er Meydanı'nı açar, oda kurar, Zümrüt Köprü'yü seçer
  await A.evaluate(() => EO2.game.open('ermeydani')); await A.waitForTimeout(800);
  await A.locator('[data-pvp="kur"]').first().click(); log.odaKuruldu = await bekle(A, '!!EO2.topcuPvp.durum().oda');
  log.haritaKartlari = await A.locator('.em-hkart[data-harita]').count();
  await A.locator('.em-hkart[data-harita="zumrut-kopru"]').click(); log.kurucuSecti = await bekle(A, 'EO2.topcuPvp.durum().oda.mapId === "zumrut-kopru"');
  const kod = await A.evaluate(() => EO2.topcuPvp.durum().oda.code);
  await Bp.evaluate(() => EO2.game.open('ermeydani')); await Bp.waitForTimeout(500);
  await Bp.evaluate(k => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_room_join', code: k, el: o.el, chibi: { set: o.set, ad: o.ad } }); }, kod);
  log.misafirGordu = await bekle(Bp, '!!document.querySelector(".em-haritalar.tek") && /Zümrüt Saray Köprüsü/.test(document.querySelector(".em-haritalar.tek").textContent)');
  await goruntu(A, 'harita_1_kurucu.png'); await goruntu(Bp, 'harita_2_misafir.png');
  // 2) maç: iki uçta aynı arena, ayna konum
  await Bp.locator('[data-pvp="hazir"]').first().click(); await A.waitForTimeout(500); await A.locator('[data-pvp="baslat"]').first().click();
  log.basladi = await iki('EO2.battle.active() && EO2.battle.state().cfg.kip === "pvp" && !!EO2.battle.state().rakip', 60000); await A.waitForTimeout(2500);
  const bilgi = () => { const M = EO2.battle.state(); return { harita: M.cfg.harita, sahne: !!M.cfg.sahne, en: M.cfg.arenaEn, x: Math.round(M.ben.x * 10) / 10, rx: Math.round(M.rakip.x * 10) / 10, y: Math.round(M.ben.y * 10) / 10, ry: Math.round(M.rakip.y * 10) / 10, alt: M.cfg.alt }; };
  const B0 = await Promise.all(P.map(p => p.evaluate(bilgi))); log.mac = B0;
  log.ayniHarita = B0.every(q => q.harita === 'zumrut-kopru' && q.sahne);
  log.aynaKonum = B0[0].x === B0[1].rx && B0[1].x === B0[0].rx && B0[0].y === B0[0].ry;
  await goruntu(A, 'harita_3_mac_kopru.png');
  // 3) rastgele: maçtan ayrılıp yeni oda → rastgele → iki uç aynı haritada
  for (const p of P) await p.evaluate(() => { EO2.battle.kapat(); }); await A.waitForTimeout(1500);
  for (const p of P) await p.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(x => x.remove()); EO2.ag.gonder({ type: 'pvp_room_leave' }); }); await A.waitForTimeout(800);
  await A.evaluate(() => EO2.game.open('ermeydani')); await A.waitForTimeout(600);
  await A.evaluate(() => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_room_create', mode: '1v1', mapId: 'rastgele', el: o.el, chibi: { set: o.set, ad: o.ad } }); });
  log.rastgeleOda = await bekle(A, 'EO2.topcuPvp.durum().oda && EO2.topcuPvp.durum().oda.mapId === "rastgele"');
  const kod2 = await A.evaluate(() => EO2.topcuPvp.durum().oda.code);
  await Bp.evaluate(k => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_room_join', code: k, el: o.el, chibi: { set: o.set, ad: o.ad } }); EO2.ag.gonder({ type: 'pvp_room_ready', ready: true }); }, kod2);
  await A.waitForTimeout(800); await A.evaluate(() => EO2.ag.gonder({ type: 'pvp_room_start' }));
  log.rastgeleBasladi = await iki('EO2.battle.active() && EO2.battle.state().cfg.kip === "pvp"', 60000); await A.waitForTimeout(1500);
  const B1 = await Promise.all(P.map(p => p.evaluate(() => EO2.battle.state().cfg.harita || 'er-meydani'))); log.rastgele = B1; log.rastgeleAyni = B1[0] === B1[1];
  await goruntu(A, 'harita_4_mac_rastgele.png');
  for (const p of P) await p.evaluate(() => { EO2.battle.kapat(); }); await A.waitForTimeout(1200);
  await A.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(x => x.remove()); EO2.ag.gonder({ type: 'pvp_room_leave' }); });
  // 4) ejderha kartı: Ahır → Bilgi → Kartını çıkar
  await A.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(x => x.remove()); EO2.game.open('ejderhalar'); }); await A.waitForTimeout(1200);
  await A.locator('[data-mod="bilgi"]').first().click(); await A.waitForTimeout(500);
  log.kartDugmesi = await A.locator('[data-kart]').count();
  await A.locator('[data-kart]').first().click();
  log.kartPenceresi = await bekle(A, '!!document.querySelector(".ek-kart img") && document.querySelector(".ek-kart img").naturalWidth > 0', 20000);
  log.kartOlcu = await A.evaluate(() => { const i = document.querySelector('.ek-kart img'); return i ? [i.naturalWidth, i.naturalHeight] : null; });
  await goruntu(A, 'kart_1_pencere.png');
  if (ekran) { const veri = await A.evaluate(async () => { const S0 = S.dragons.find(d => !d.dead), cv = await EO2.kart.ciz(S0); return cv.toDataURL('image/png'); }); fs.writeFileSync(path.join(ekran, 'kart_2_png.png'), Buffer.from(veri.split(',')[1], 'base64')); }
  log.adres = await A.evaluate(() => EO2.kart.adres());
  // telefon: bekleme odası dikey
  const tel = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage(); tel.on('pageerror', e => hata.push('tel: ' + String(e.message).slice(0, 160)));
  await tel.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await tel.waitForFunction('window.EO2 && EO2.topcuPvp && document.querySelector(".giris")', null, { timeout: 180000 }); await tel.waitForTimeout(600);
  await tel.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click({ force: true }); await tel.waitForTimeout(400); await tel.locator('.pen input').first().fill('Cem').catch(() => { }); await tel.locator('.pen .gbtn:has-text("Ocağa gir")').first().click({ force: true }); await tel.waitForTimeout(2500); await bekle(tel, 'EO2.ag.cevrimici()', 40000);
  await tel.evaluate(() => { document.querySelectorAll('.pen-perde').forEach(x => x.remove()); EO2.game.open('ermeydani'); }); await tel.waitForTimeout(600); await tel.locator('[data-pvp="kur"]').first().click(); await bekle(tel, '!!EO2.topcuPvp.durum().oda'); await tel.waitForTimeout(500);
  log.telKartlar = await tel.evaluate(() => [...document.querySelectorAll('.em-hkart[data-harita]')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.right <= innerWidth + 1]; }));
  log.telTasma = await tel.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await goruntu(tel, 'harita_5_telefon.png');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.odaKuruldu && log.haritaKartlari === 4 && log.kurucuSecti && log.misafirGordu && log.basladi && log.ayniHarita && log.aynaKonum && log.rastgeleBasladi && log.rastgeleAyni && log.kartDugmesi === 1 && log.kartPenceresi && log.kartOlcu && log.kartOlcu[0] === 1080 && log.kartOlcu[1] === 1350 && !log.telTasma && (log.telKartlar || []).every(k => k[1] >= 44 && k[2]);
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
