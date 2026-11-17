// EO2 · savaş ekranında karakter görünüşü denetimi (iki tarayıcı).
// Ölçülenler: özgün görünüşte savaş topçusu eski sayfayla çizilir (ek yük yok); saç ve göz seçilince talim savaşında topçu kurulan sayfayı giyer ve
// kurulan sayfa doludur (her karede resim var; saçın rengi gerçekten değişmiş); her seçenek birleşimi için katmanlar yerindedir (eksik dosya yok);
// Topçu düellosunda rakip de seçtiği görünüşle görünür.
// Kullanım: node eo2/tools/check_savas_gorunus.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160))); p.on('response', r => { if (r.status() >= 400 && /gorunus_savas/.test(r.url())) hata.push('eksik dosya: ' + r.url().split('/').pop()); });
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.gorunum && EO2.topcu && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000); await bekle(p, 'EO2.ag.cevrimici()'); return p; };
/* kurulan savaş sayfasının ölçümü: dolu kare sayısı ve saç bölgesinin ortalama rengi (bekleme karesinin üst üçte biri) */
const olc = p => p.evaluate(() => { const M = EO2.battle.state(), a = M.ben, m = window.EO2_BATTLE.sets[a.set]; return { set: a.set, var: !!m, kare: m ? Object.keys(m.frames).length : 0 }; });
try {
  const A = await gir('Aylin'), B = await gir('Bora');
  // 1) özgün görünüş: eski sayfa
  await A.evaluate(() => { EO2.topcu.baslat('talim'); }); log.talim = await bekle(A, 'EO2.battle.active() && EO2.battle.state().faz === "nisan"', 40000); await A.waitForTimeout(1500);
  log.ozgun = (await olc(A)).set === 'temel'; if (ekran) await A.screenshot({ path: path.join(ekran, 'savas_gorunus_1_ozgun.png') });
  await A.evaluate(() => { EO2.battle.kapat(true); }); await A.waitForTimeout(800);
  // 2) seçilmiş görünüş: kurulan sayfa giyilir
  await A.evaluate(() => { S.gorunus = { sac: 'ikiz', sacRenk: 'blue', goz: 'iri', gozRenk: 'green' }; saveGame(); EO2.topcu.baslat('talim'); });
  log.giydi = await bekle(A, 'EO2.battle.active() && /^g_temel_ikiz_blue_iri_green$/.test(EO2.battle.state().ben.set)', 40000); log.olcum = await olc(A);
  await bekle(A, 'EO2.battle.state().faz === "nisan"', 30000); await A.waitForTimeout(800); if (ekran) await A.screenshot({ path: path.join(ekran, 'savas_gorunus_2_secilmis.png') });
  // kurulan sayfa: her karede resim var; saç mavi (bekleme karesinin üst kısmında mavi baskın piksel çok)
  log.sayfa = await A.evaluate(async () => { const r = await EO2.gorunum.savas('temel', 'ikiz.blue.iri.green'), m = window.EO2_BATTLE.sets[r.ad], x = r.cv.getContext('2d'); let bos = 0, mavi = 0;
    for (const k in m.frames) { const i = m.frames[k], d = x.getImageData((i % m.cols) * m.cw, Math.floor(i / m.cols) * m.ch, m.cw, m.ch).data; let n = 0; for (let j = 3; j < d.length; j += 16) if (d[j] > 40) n++; if (n < 400) bos++;
      if (k === 'idle') for (let j = 0; j < m.cw * Math.round(m.ch * 0.45) * 4; j += 4) if (d[j + 3] > 200 && d[j + 2] > 150 && d[j + 2] > d[j] + 50) mavi++; }
    return { bos, mavi, namlu: Object.keys(m.muzzle).length }; });
  // 3) bütün seçenekler: her saç × her renk ve her göz × her renk için katman dosyaları kayıtta ve diskte (kurmadan; kurmak her birleşim için büyük bir tuval ayırır)
  { const w = {}; new Function('window', fs.readFileSync(path.join(repo, 'eo2', 'assets', 'savas_gorunus_atlas.js'), 'utf8'))(w); const SG = w.EO2_SAVAS_GORUNUS, ad = await A.evaluate(() => EO2.gorunum.secenekler()), yok = []; let n = 0;
    const var_ = k => SG.var[k] && fs.existsSync(path.join(repo, 'eo2', 'assets', 'gorunus_savas', k + '.webp'));
    for (const set of ['temel', 'muhafiz']) { for (const k of [1, 2, 3]) if (!var_('govde_' + set + '_' + k)) yok.push('govde_' + set + '_' + k); if (!SG.set[set] || !SG.set[set].don.yuz || !SG.set[set].don.sacOn || Object.keys(SG.set[set].muzzle || {}).length !== 17) yok.push(set + ': dönüşüm ya da namlu'); }
    for (const sb of ['a', 'b']) { if (!var_('kulak_' + sb)) yok.push('kulak_' + sb); for (const g of Object.keys(ad.goz)) for (const r of Object.keys(ad.gozRenk)) { n++; if (!var_('yuz_' + g + '_' + r + '_' + sb)) yok.push('yuz_' + g + '_' + r + '_' + sb); } }
    for (const st of Object.keys(ad.sac)) for (const r of Object.keys(ad.sacRenk)) { n++; if (!var_('sac_' + st + '_' + r + '_o')) yok.push('sac_' + st + '_' + r + '_o'); }
    for (const k of Object.keys(SG.var)) if (!var_(k)) yok.push('diskte yok: ' + k);
    log.hepsi = { n, yok: yok.slice(0, 6) }; }
  await A.evaluate(() => { EO2.battle.kapat(true); }); await A.waitForTimeout(800);
  // 4) düelloda rakip de görünüşüyle görünür (B, A'yı meydanda görmüş olmalı: görünüş kodu oradan gelir)
  log.meydandaGordu = await bekle(B, '[...EO2.meydanAg.kisiler.values()].some(c => c.name === "Aylin" && /ikiz\\.blue\\.iri\\.green$/.test(c.gorKod || ""))', 40000);
  for (const p of [A, B]) { await p.evaluate(() => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_queue_join', mode: '1v1', el: o.el, chibi: { set: o.set, ad: o.ad } }); }); await p.waitForTimeout(500); }
  log.duello = await bekle(B, 'EO2.battle.active() && EO2.battle.state().cfg.kip === "pvp" && !!EO2.battle.state().rakip', 60000);
  log.rakipGiydi = await bekle(B, '/^g_temel_ikiz_blue_iri_green$/.test(EO2.battle.state().rakip.set)', 30000); await B.waitForTimeout(2500);
  if (ekran) await B.screenshot({ path: path.join(ekran, 'savas_gorunus_3_rakip.png') });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.talim && log.ozgun && log.giydi && log.olcum && log.olcum.var && log.olcum.kare === 70 && log.sayfa && log.sayfa.bos === 0 && log.sayfa.mavi > 300 && log.sayfa.namlu === 17 && log.hepsi && log.hepsi.n > 100 && !log.hepsi.yok.length && log.meydandaGordu && log.duello && log.rakipGiydi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
