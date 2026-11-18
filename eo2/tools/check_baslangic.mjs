// EO2 · oyunun gerçek başlangıcı ve kuşam (tek tarayıcı; otomatik denetimlerin kısa yolu kapalı: window.__gercekAkis).
// Ölçülenler: yeni ocakta mektuptan sonra saç ve göz seçimi açılır; "Hazırım" ile oyun OCAKTA başlar; terbiyeci çıplak settedir;
// portreye dokununca Kuşam ve görünüş açılır; alınmamış set aynada denenir, "Satın al" altını düşer ve seti giydirir; sahip olunan set tek dokunuşla giyilir;
// sayfa yenilenince giyili set ve sahip olunanlar kayıttan gelir ve oyun yine ocakta açılır; hızlı seyahat haritası yerler arasında götürür; öğretici sıradaki adımı gösterir.
// Kullanım: node eo2/tools/check_baslangic.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { window.__gercekAkis = true; });
const p = await ctx.newPage(); p.on('pageerror', e => hata.push(String(e.message).slice(0, 200)));
const bekle = (ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const cek = async ad => { if (ekran) await p.screenshot({ path: path.join(ekran, ad + '.png') }); };
try {
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.gorunum && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill('Aylin').catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  // 1) başta görünüş seçimi
  log.secimAcildi = await bekle('EO2.game.ekran() === "gorunus" && document.querySelector("[data-gr-hazir]") && !document.querySelector(".gr-setler")'); await p.waitForTimeout(900);
  await p.locator('[data-alan="sac"][data-v="ikiz"]').click(); await p.waitForTimeout(300); await p.locator('[data-alan="sacRenk"][data-v="blue"]').click(); await p.waitForTimeout(700); await cek('baslangic_1_secim');
  await p.locator('[data-gr-hazir]').click();
  // 2) oyun ocakta başlar; terbiyeci çıplak
  log.ocakta = await bekle('EO2.api.scene() === "ocak" && !EO2.game.ekran()', 40000); await p.waitForTimeout(1500);
  log.ciplak = await p.evaluate(() => EO2.api.player.set === 'bare' && S.kusam.giyili === 'bare' && S.kusam.sahip.length === 1 && S.gorunus.sac === 'ikiz'); await cek('baslangic_2_ocak');
  log.ogretici = await p.evaluate(() => { const s = EO2.rehber.simdi(); return s ? s.metin.replace(/<[^>]+>/g, '') : ''; });
  // ilk hafta kilidi: yalnız öğreticinin adımı yapılabilir. Başka ekran açılmaz, ocaktan çıkılmaz, hafta erken bitmez; şerit kapatılamaz ama "Öğreticiyi geç" vardır.
  log.kilit = await p.evaluate(async () => { const R = EO2.rehber, o = {}; o.adim = R.kilit(); EO2.game.open('arena'); o.arenaKapali = !EO2.game.ekran(); EO2.game.open('harita'); o.haritaKapali = !EO2.game.ekran();
    EO2.api.go('meydan'); await new Promise(r => setTimeout(r, 1500)); o.ocakta = EO2.api.scene() === 'ocak'; const h = S.week; EO2.game.endWeek(); await new Promise(r => setTimeout(r, 600)); o.haftaBitmedi = S.week === h && !document.querySelector('.gece, .pen-perde');
    EO2.game.open('menu'); o.menuAcik = EO2.game.ekran() === 'menu'; EO2.game.close(); await new Promise(r => setTimeout(r, 700)); const s = document.querySelector('.rehber'); o.gecVar = !!s && !s.hidden && !s.querySelector('.rh-gec').hidden && s.querySelector('.rh-kapat').hidden; return o; });
  await cek('baslangic_2a_kilit');
  await p.locator('.rehber .rh-gec').click(); await p.waitForTimeout(400); await p.locator('.pen .gbtn:has-text("Geç")').last().click(); await p.waitForTimeout(600);
  log.kilitAcildi = await p.evaluate(() => { const o = EO2.rehber.kilit() === null; EO2.game.open('arena'); const a = EO2.game.ekran() === 'arena'; EO2.game.close(); return o && a; }); await p.waitForTimeout(500);
  // öğretici zinciri: sahne ipucundan sonra ilk adım numarasıyla gelir; ikinci haftada harita adımı "Harita" düğmesiyle haritayı açar
  await p.evaluate(() => { const s = EO2.rehber.simdi(); if (s && s.tur !== 'adim') document.querySelector('.rehber .rh-kapat').click(); }); log.adim1 = await bekle('EO2.rehber.simdi() && EO2.rehber.simdi().tur === "adim" && EO2.rehber.simdi().metin.includes(">1 / 7<")', 15000); await cek('baslangic_2b_ogretici');
  log.adimHarita = await p.evaluate(async () => { const w = S.week, g = S.goals.slice(); S.week = 2; S.goals.push('kulucka'); EO2.rehber.tazele(); const s = EO2.rehber.simdi(), ok = !!s && s.metin.includes('>4 / 7<'); if (ok) document.querySelector('.rehber .rh-git').click(); await new Promise(r => setTimeout(r, 500)); const acildi = EO2.game.ekran() === 'harita'; EO2.game.close(); S.week = w; S.goals = g; EO2.rehber.tazele(); return ok && acildi; });
  // 3) portre → Kuşam ve görünüş; set dene, satın al
  const altin0 = await p.evaluate(() => S.gold);
  await p.locator('#profile').click(); log.kusamAcildi = await bekle('EO2.game.ekran() === "gorunus" && document.querySelector(".gr-setler")');
  await p.locator('[data-set="temel"]').click(); log.deneme = await bekle('document.querySelector("[data-gr-al=temel]")') && await p.evaluate(() => EO2.api.player.set === 'bare'); await p.waitForTimeout(900); await cek('baslangic_3_deneme');
  await p.locator('[data-gr-al="temel"]').click(); await p.waitForTimeout(600);
  log.alindi = await p.evaluate(a => S.gold === a - 120 && S.kusam.giyili === 'temel' && S.kusam.sahip.includes('temel') && EO2.api.player.set === 'temel', altin0);
  log.pahali = await p.evaluate(() => { const b = document.querySelector('[data-set="muhafiz"]'); b.click(); const al = document.querySelector('[data-gr-al="muhafiz"]'); return !!al && al.disabled && !EO2.gorunum.satinAl('muhafiz'); });
  // üretim emeğe bağlı: altın yetse de malzeme olmadan Avcı seti dövülmez; Kıvılcım Kor Taşı gelince dövülür ve taşlar harcanır
  log.grind = await p.evaluate(() => { const g0 = S.gold, K = EO2.gorunum.kusam().setler.find(q => q.set === 'avci'); S.gold = 5000; S.topcu = S.topcu || {}; S.topcu.ganimet = S.topcu.ganimet || {}; S.topcu.ganimet.kor_t1 = 0; const malzemesiz = EO2.gorunum.satinAl('avci');
    S.topcu.ganimet.kor_t1 = 5; const oldu = EO2.gorunum.satinAl('avci'), kalan = S.topcu.ganimet.kor_t1, odenen = 5000 - S.gold; S.gold = g0; EO2.gorunum.giy('temel'); return K.malzeme.kor_t1 === 4 && !malzemesiz && oldu && kalan === 1 && odenen === K.fiyat && EO2.gorunum.kusam().sahip.includes('avci'); });
  await p.locator('[data-set="bare"]').click(); await p.waitForTimeout(400); log.giyBare = await p.evaluate(() => EO2.api.player.set === 'bare'); await p.locator('[data-set="temel"]').click(); await p.waitForTimeout(700);
  log.giyTemel = await p.evaluate(() => EO2.api.player.set === 'temel' && !!EO2.api.player.gor); await cek('baslangic_4_kusam'); await p.evaluate(() => EO2.game.close());
  // 4) hızlı seyahat
  log.haritaVar = await p.evaluate(() => !!(EO2.harita && EO2.harita.yerler().length >= 4));
  if (log.haritaVar) { await p.evaluate(() => EO2.harita.ac()); log.haritaAcildi = await bekle('EO2.game.ekran() === "harita" && document.querySelectorAll("[data-git]").length >= 4'); await p.waitForTimeout(700); await cek('baslangic_5_harita');
    await p.locator('[data-git="meydan"]').click(); log.meydanaGitti = await bekle('["meydan", "master"].includes(EO2.api.scene()) && !EO2.game.ekran()', 30000); await p.waitForTimeout(800);
    await p.evaluate(() => EO2.harita.ac()); await p.locator('[data-git="ocak"]').click(); log.ocagaDondu = await bekle('EO2.api.scene() === "ocak" && !EO2.game.ekran()', 30000); }
  // 5) kayıt: yenilenince set, sahiplik ve görünüş durur; oyun yine ocakta açılır
  await p.evaluate(() => saveGame()); await p.reload(); await p.waitForFunction('window.EO2 && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Ocağa dön")').first().click();
  log.yenidenOcakta = await bekle('EO2.api.scene() === "ocak"', 40000); await p.waitForTimeout(1500);
  log.kayitli = await p.evaluate(() => EO2.api.player.set === 'temel' && S.kusam.sahip.join(',') === 'bare,temel,avci' && S.gorunus.sac === 'ikiz' && !EO2.game.ekran());
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const K = log.kilit || {};
const ok = !hata.length && K.adim === 'a-kulucka' && K.arenaKapali && K.haritaKapali && K.ocakta && K.haftaBitmedi && K.menuAcik && K.gecVar && log.kilitAcildi && log.secimAcildi && log.ocakta && log.ciplak && !!log.ogretici && log.adim1 && log.adimHarita && log.kusamAcildi && log.deneme && log.alindi && log.pahali && log.grind && log.giyBare && log.giyTemel && log.haritaVar && log.haritaAcildi && log.meydanaGitti && log.ocagaDondu && log.yenidenOcakta && log.kayitli;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
