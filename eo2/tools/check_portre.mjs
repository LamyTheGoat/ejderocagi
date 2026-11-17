// EO2 · portre denetimi (iki tarayıcı).
// Ölçülenler: oyuncu saç ve göz seçince sol üstteki portresi değişir; savaş ekranındaki kendi portresi de seçilen görünüştedir;
// öteki oyuncunun portresi (düelloda rakip) onun görünüşüyle çizilir, bakanın kendi görünüşüyle değil; aynı seti giyen NPC portresi oyuncunun saçını almaz.
// Kullanım: node eo2/tools/check_portre.mjs   (EKRAN=<klasör> ile ekran görüntüsü)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', ekran = process.env.EKRAN || '', hata = [], log = {}; if (ekran) fs.mkdirSync(ekran, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const bekle = (p, ifade, ms = 30000) => p.waitForFunction(ifade, null, { timeout: ms }).then(() => true, () => false);
const gir = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.gorunum && EO2.topcu && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(1000);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(400);
  await p.locator('.pen input').first().fill(ad).catch(() => { }); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click(); await p.waitForTimeout(3000); await bekle(p, 'EO2.ag.cevrimici()'); return p; };
/* bir portre tuvalinin özeti; "duz" = aynı setin görünüşsüz (özgün) portresi, aynı ölçüde */
const ozet = (p, id) => p.evaluate(id => { const cv = document.getElementById(id), d = cv.toDataURL(), c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; EO2.api.drawPortrait(c2, (cv._p && cv._p[0]) || 'temel', (cv._p && cv._p[1]) || 0); return { ayni: d === c2.toDataURL(), dolu: d.length > 2000 }; }, id);
try {
  const A = await gir('Aylin'), B = await gir('Bora');
  log.ilk = await ozet(A, 'portrait');                                   // özgün görünüş: portre setin özgün yüzü
  await A.evaluate(() => { EO2.gorunum.sec('sac', 'ikiz'); EO2.gorunum.sec('sacRenk', 'blue'); EO2.gorunum.sec('goz', 'iri'); EO2.gorunum.sec('gozRenk', 'green'); });
  log.dunyaDegisti = await bekle(A, '(() => { const cv = document.getElementById("portrait"), c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = cv.height; EO2.api.drawPortrait(c2, EO2.api.player.set, 0); return cv.toDataURL() !== c2.toDataURL(); })()', 20000);
  if (ekran) await A.screenshot({ path: path.join(ekran, 'portre_1_dunya.png') });
  // NPC portresi (aynı set, kim belirtilmemiş) oyuncunun saçını almaz
  log.npcOzgun = await A.evaluate(() => { const a = document.createElement('canvas'), c = document.createElement('canvas'); a.width = c.width = 96; a.height = c.height = 96; EO2.api.drawPortrait(a, EO2.api.player.set, 0.66); EO2.api.drawPortrait(c, EO2.api.player.set, 0.66, true); return a.toDataURL() !== c.toDataURL(); });
  // savaşta kendi portresi
  await A.evaluate(() => { EO2.topcu.baslat('talim'); }); await bekle(A, 'EO2.battle.active() && EO2.battle.state().faz === "nisan"', 40000); await A.waitForTimeout(1200);
  log.savas = await ozet(A, 'tpYuz'); if (ekran) await A.screenshot({ path: path.join(ekran, 'portre_2_savas.png') });
  await A.evaluate(() => { EO2.battle.kapat(true); }); await A.waitForTimeout(800);
  // düelloda rakibin portresi rakibin görünüşüyle; bakanın (özgün görünüşlü Bora) kendi portresi özgün
  await bekle(B, '[...EO2.meydanAg.kisiler.values()].some(c => c.name === "Aylin" && /ikiz\\.blue\\.iri\\.green$/.test(c.gorKod || ""))', 40000);
  for (const p of [A, B]) { await p.evaluate(() => { const o = EO2.topcu.oyuncuDeger(false); EO2.ag.gonder({ type: 'pvp_queue_join', mode: '1v1', el: o.el, chibi: { set: o.set, ad: o.ad } }); }); await p.waitForTimeout(500); }
  log.duello = await bekle(B, 'EO2.battle.active() && EO2.battle.state().cfg.kip === "pvp" && !!EO2.battle.state().rakip && !!EO2.battle.state().rakip.gorKod', 60000); await B.waitForTimeout(3000);
  await B.evaluate(() => { const M = EO2.battle.state(); M.hedef = M.rakip; EO2.battle.hedefTazele && EO2.battle.hedefTazele(); }); await B.waitForTimeout(1500);
  log.rakip = await ozet(B, 'tpHYuz'); log.bakan = await ozet(B, 'tpYuz'); log.aRakip = await ozet(A, 'tpHYuz');
  if (ekran) await B.screenshot({ path: path.join(ekran, 'portre_3_rakip.png') });
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.ilk && log.ilk.ayni && log.ilk.dolu && log.dunyaDegisti && log.npcOzgun && log.savas && !log.savas.ayni && log.savas.dolu && log.duello && log.rakip && !log.rakip.ayni && log.rakip.dolu && log.bakan && log.bakan.ayni;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
