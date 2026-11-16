// EO2 · meydan denetimi: iki ayrı tarayıcı aynı meydanda birbirini görüyor mu.
// A ve B yeni ocak kurar. Beklenen: A, B'yi adıyla görür; B yürüyünce A'daki karakter hedefini günceller; B Han'a girince
// A'da kaybolur, dönünce yeniden görünür; B jest yapınca A'da balon çıkar; B'nin sayfası kapanınca A'da kaybolur.
// Kullanım: node eo2/tools/check_meydan.mjs   (URL ortam değişkeni; varsayılan http://localhost:3210/)
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const hata = [], log = {};
const oyuncu = async ad => { const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => hata.push(ad + ': ' + String(e.message).slice(0, 160)));
  await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && EO2.meydanAg && document.querySelector(".giris")', null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().click(); await p.waitForTimeout(350);
  await p.locator('.pen input').first().fill(ad); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().click();
  await p.waitForFunction('EO2.ag.cevrimici() && EO2.game.live', null, { timeout: 30000 }); return p; };
const gorulen = p => p.evaluate(() => [...EO2.meydanAg.kisiler.values()].map(c => ({ ad: c.name, alan: c.area, tx: c.tx, ty: c.ty, set: c.set, pet: !!c.pet, mutlu: (c.happy || 0) > 0, sahnede: EO2.api.remotes.includes(c) })));
const bekle = (p, kosul, sure = 8000) => p.waitForFunction(kosul, null, { timeout: sure }).then(() => true, () => false);
try {
  const A = await oyuncu('Aylin'), B = await oyuncu('Bora');
  log.gordu = await bekle(A, 'EO2.meydanAg.sayi() === 1') && await bekle(B, 'EO2.meydanAg.sayi() === 1');
  log.adGeldi = await bekle(A, '[...EO2.meydanAg.kisiler.values()][0].name === "Bora"') && await bekle(B, '[...EO2.meydanAg.kisiler.values()][0].name === "Aylin"');   // ilk bildirim ad yazılmadan gidebilir; ad sonraki bildirimle güncellenir
  log.aGoruyor = await gorulen(A); log.bGoruyor = await gorulen(B);
  await B.evaluate(() => { const p = EO2.api.player; p.x += 2.5; p.y += 1.5; });
  const hedef = await B.evaluate(() => [+EO2.api.player.x.toFixed(2), +EO2.api.player.y.toFixed(2)]);
  log.yurudu = await bekle(A, 'Math.abs([...EO2.meydanAg.kisiler.values()][0].tx - ' + hedef[0] + ') < 0.05 && Math.abs([...EO2.meydanAg.kisiler.values()][0].ty - ' + hedef[1] + ') < 0.05');
  await B.evaluate(() => { const d = [...document.querySelectorAll('#emotes button, .emote, [data-emote]')][2]; if (d) d.click(); else EO2.hooks.emote('heart'); });
  log.jest = await bekle(A, '([...EO2.meydanAg.kisiler.values()][0].happy || 0) > 0');
  // düello daveti: A, B'nin yanına gelir ve çağırır; B kabul eder; ikisi de aynı odada, Er Meydanı künyesinde olmalı
  log.etkilesim = await A.evaluate(() => { const c = [...EO2.meydanAg.kisiler.values()][0]; return !!(c.handle && c.etk && EO2.api.sceneState().L.interact.includes(c.etk)); });
  await A.evaluate(() => { const id = [...EO2.meydanAg.kisiler.keys()][0]; EO2.api.runAct('oyuncu:' + id); }); await A.waitForTimeout(500);
  await A.locator('.pen .gbtn:has-text("Çağır")').click();
  log.davetGeldi = await B.waitForSelector('.pen:has-text("Düello daveti")', { timeout: 10000 }).then(() => true, () => false);
  log.davetEden = log.davetGeldi ? await B.locator('.pen').first().textContent() : '';
  if (log.davetGeldi) await B.locator('.pen .gbtn:has-text("Kabul et")').click();
  log.oda = await bekle(A, 'EO2.topcuPvp.durum().oda && EO2.topcuPvp.durum().oda.slots.filter(s => s.kind !== "empty").length === 2') && await bekle(B, 'EO2.topcuPvp.durum().oda && EO2.topcuPvp.durum().oda.slots.filter(s => s.kind !== "empty").length === 2');
  log.kunye = await A.evaluate(() => EO2.game.ekran() === 'topcu' && EO2.topcu.secili() === 'meydan') && await B.evaluate(() => EO2.game.ekran() === 'topcu' && EO2.topcu.secili() === 'meydan');
  for (const p of [B, A]) { await p.evaluate(() => { const c = document.querySelector('[data-pvp="cik"]'); if (c) c.click(); }); await p.waitForTimeout(400); await p.evaluate(() => EO2.game.close()); }
  await B.evaluate(() => EO2.api.go('han'));
  log.hanaGitti = await bekle(A, 'EO2.meydanAg.sayi() === 0') && await bekle(B, 'EO2.api.scene() === "han" && EO2.meydanAg.sayi() === 0');
  await B.evaluate(() => EO2.api.go('meydan'));
  log.dondu = await bekle(A, 'EO2.meydanAg.sayi() === 1') && await bekle(B, 'EO2.api.scene() === "master" && EO2.meydanAg.sayi() === 1');
  await B.close();
  log.ayrildi = await bekle(A, 'EO2.meydanAg.sayi() === 0 && EO2.api.remotes.length === 0');
} catch (e) { hata.push('denetim: ' + String(e.message).slice(0, 300)); }
await b.close();
const ok = !hata.length && log.gordu && log.adGeldi && log.aGoruyor && log.aGoruyor[0].ad === 'Bora' && log.aGoruyor[0].alan === 'master' && log.aGoruyor[0].sahnede && log.bGoruyor[0].ad === 'Aylin' && log.yurudu && log.jest && log.etkilesim && log.davetGeldi && /Aylin/.test(log.davetEden) && log.oda && log.kunye && log.hanaGitti && log.dondu && log.ayrildi;
console.log(JSON.stringify({ ok, log, hata: hata.slice(0, 10) }, null, 1));
process.exit(ok ? 0 : 1);
