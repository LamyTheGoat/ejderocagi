// Çizgi roman doğrulaması: arena öncesi/sonrası + gök yarışı
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const out = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const req = createRequire('C:/Users/user/Documents/GitHub/ejderocagi-eng06/package.json');
const { chromium } = req('playwright-core');
const URL0 = 'http://localhost:3240/';
const log = { hatalar: [] };
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', e => log.hatalar.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') log.hatalar.push('CONSOLE ' + m.text().slice(0, 200)); });
const shot = async ad => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, ad + '.png') }); };
const cizgiDurum = () => p.evaluate(() => { const c = document.querySelector('.cizgi'); if (!c || !c.shadowRoot) return null; const sh = c.shadowRoot;
  const imgs = [...sh.querySelectorAll('img')]; return { baslik: (sh.querySelector('.kicker') || {}).textContent, sayfa: (sh.querySelector('.cpgn') || {}).textContent, kare: sh.querySelectorAll('.cpage > *').length,
    resim: imgs.length, kirikResim: imgs.filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')), secenek: [...sh.querySelectorAll('.vopt')].map(b => b.textContent.slice(0, 60)), stilUzunluk: (sh.querySelector('style') || { textContent: '' }).textContent.length,
    cpageBoy: (() => { const r = sh.querySelector('.cpage'); if (!r) return null; const b = r.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })() }; });
async function cizgiOku(on) { const sayfalar = []; for (let i = 0; i < 12; i++) { await p.waitForTimeout(700); const d = await cizgiDurum(); if (!d) break; sayfalar.push(d); await shot(on + '_s' + (i + 1));
    const r = await p.evaluate(() => { const sh = document.querySelector('.cizgi').shadowRoot; const n = sh.querySelector('[data-next]'); if (n) { n.click(); return 'next'; } const o = sh.querySelector('.vopt:not([disabled])'); if (o) { o.click(); return 'opt:' + o.textContent.slice(0, 40); } return 'yok'; });
    if (r === 'yok') break; if (r.startsWith('opt')) { await p.waitForTimeout(500); const d2 = await cizgiDurum(); if (d2) { await shot(on + '_sonuc'); await p.evaluate(() => { const b = document.querySelector('.cizgi').shadowRoot.querySelector('[data-ok]'); if (b) b.click(); }); } break; } }
  return sayfalar; }

await p.goto(URL0, { waitUntil: 'domcontentloaded' });
await p.waitForFunction('window.EO2 && EO2.api && EO2.game && window.PROTO && document.querySelector(".giris")', null, { timeout: 45000 });
await p.locator('.giris .gbtn:has-text("Yeni ocak kur")').first().evaluate(b => b.click()); await p.waitForTimeout(400);
if (await p.locator('.pen:has-text("silinsin")').count()) await p.locator('.pen .gbtn:has-text("Yeni ocak kur")').first().evaluate(b => b.click());
await p.waitForTimeout(400); await p.locator('.pen .gbtn:has-text("Ocağa gir")').first().evaluate(b => b.click()); await p.waitForTimeout(1500);

log.baslangic = await p.evaluate(() => ({ ejder: S.dragons.map(d => d.name + ':' + d.stage), un: S.un, hafta: S.week, comicSayisi: Object.keys(COMIC).length, hasComicFn: typeof EO2.game.comic, arenaKatlari: Object.keys(TIERS) }));

/* DURUM ZORLAMA: yıldız ejder yetişkin + güçlü, ün yüksek (Şehir Arenası kapısı), görev yok */
await p.evaluate(() => { const d = S.dragons[0]; d.stage = 'yetiskin'; d.age = Math.max(d.age || 0, 20); d.task = null; d.inj = 0; d.fat = 0; for (const k of STATS) d.st[k] = 95; S.un = 400; S.gold = 5000; if (typeof genArena === 'function') genArena(); UI.arenaSel = d.id; });

/* ---- 1a. ARENA ÖNCESİ sahne (js/fightev.js pickFightPre, %55) ---- */
await p.evaluate(() => { EO2.game.open('arena'); UI.arenaTier = 'sehir'; EO2.game.redraw(); });
await p.waitForTimeout(500); await shot('a1_arena_ekran');
log.arena = await p.evaluate(() => ({ kat: UI.arenaTier, rakip: (S.arena.sehir || []).length, dugme: !!document.querySelector('[data-fight]:not([disabled])'), kilit: (document.querySelector('.ar-kilit') || {}).textContent || null }));
// şans zorlaması: yalnız tıklama anında chance()=true
await p.evaluate(() => { window.__eskiChance = window.chance; window.chance = () => true; window.__noPre = 0; window.__fastFx = 0; document.querySelector('[data-fight]').click(); });
await p.waitForTimeout(600);
// şehir arenası ölüm riski penceresi olabilir
if (await p.locator('.pen .gbtn.kor').count()) { await shot('a1b_olum_uyarisi'); await p.locator('.pen .gbtn.kor').first().evaluate(b => b.click()); await p.waitForTimeout(600); }
await p.evaluate(() => { window.chance = window.__eskiChance; });
await p.waitForTimeout(900);
log.arenaOncesi = await p.evaluate(() => { const v = document.querySelector('.vn'); return { vnVar: !!v, cizgiVar: !!document.querySelector('.cizgi'), ad: v ? v.querySelector('.vn-ad').textContent : null, metin: v ? v.querySelector('.vn-metin').textContent.slice(0, 160) : null, secenek: v ? [...v.querySelectorAll('.vn-opt')].map(b => b.textContent.slice(0, 50)) : [] }; });
await shot('a2_arena_oncesi_sahne');
for (let i = 0; i < 4 && await p.locator('.vn').count(); i++) { await p.evaluate(() => { const v = document.querySelector('.vn'); v.click(); const b = v.querySelector('.vn-opt:not([disabled])'); if (b) b.click(); }); await p.waitForTimeout(700); if (i === 0) await shot('a3_arena_oncesi_sonuc'); }
await p.waitForTimeout(600);
log.dovusAcildi = await p.evaluate(() => !!document.getElementById('dov'));
await shot('a4_dovus');
/* ---- dövüş: otomatik, hızlı ---- */
await p.evaluate(() => { window.__fastFx = 1; const b = document.querySelector('#dovAct [data-auto]'); if (b) b.click(); });
await p.waitForFunction(() => !!document.querySelector('.pen .gbtn'), null, { timeout: 40000 });
log.dovusSonuc = await p.evaluate(() => ({ baslik: document.querySelector('.pen h2').textContent, satir: [...document.querySelectorAll('.pen .rap span')].map(s => s.textContent.slice(0, 90)) }));
await shot('a5_dovus_sonuc');
await p.evaluate(() => { window.__fastFx = 0; document.querySelector('.pen .gbtn').click(); });
await p.waitForTimeout(1500);
/* ---- 1b. ARENA SONRASI: arenaStoryNext -> as_toz çizgi romanı (ilk Şehir zaferi; şans yok) ---- */
log.arenaSonrasi = { cizgiVar: await p.evaluate(() => !!document.querySelector('.cizgi')), vnVar: await p.evaluate(() => !!document.querySelector('.vn')), as: await p.evaluate(() => JSON.stringify(S.as || null)) };
log.arenaSonrasi.sayfalar = await cizgiOku('a6_arena_cizgi');
await p.waitForTimeout(600);
log.arenaSonrasi.kapandi = await p.evaluate(() => !document.querySelector('.cizgi'));

/* ---- 1b2. dövüş sonrası sahne (fightev pickFightPost, %45) doğrudan: köy arenası, şans zorlanır ---- */
await p.evaluate(() => { const d = S.dragons[0]; d.task = null; d.fat = 0; d.inj = 0; EO2.game.open('arena'); UI.arenaTier = 'koy'; EO2.game.redraw(); window.__noPre = 1; window.__fastFx = 1; });
await p.waitForTimeout(400);
if (await p.locator('[data-fight]:not([disabled])').count()) {
  await p.evaluate(() => document.querySelector('[data-fight]').click()); await p.waitForTimeout(500);
  await p.evaluate(() => { const b = document.querySelector('#dovAct [data-auto]'); if (b) b.click(); });
  await p.waitForFunction(() => !!document.querySelector('.pen .gbtn'), null, { timeout: 40000 });
  await p.evaluate(() => { window.__fastFx = 0; window.__eskiChance = window.chance; window.chance = () => true; document.querySelector('.pen .gbtn').click(); });
  await p.waitForTimeout(1300); await p.evaluate(() => { window.chance = window.__eskiChance; });
  log.dovusSonrasiSahne = await p.evaluate(() => { const v = document.querySelector('.vn'); return { vnVar: !!v, cizgiVar: !!document.querySelector('.cizgi'), ad: v ? v.querySelector('.vn-ad').textContent : null, metin: v ? v.querySelector('.vn-metin').textContent.slice(0, 160) : null }; });
  await shot('a7_dovus_sonrasi_sahne');
  for (let i = 0; i < 4 && await p.locator('.vn').count(); i++) { await p.evaluate(() => { const v = document.querySelector('.vn'); v.click(); const b = v.querySelector('.vn-opt:not([disabled])'); if (b) b.click(); }); await p.waitForTimeout(700); }
  if (await p.locator('.cizgi').count()) log.dovusSonrasiSahne.cizgi = await cizgiOku('a7b_cizgi');
} else log.dovusSonrasiSahne = 'köy arenasında dövüş düğmesi yok';

/* ---- 2. GÖK YARIŞI: ezeli rakip zorlanır (S.nemesis), yarış otomatik bitirilir ---- */
await p.evaluate(() => { const d = S.dragons[0]; d.task = null; d.fat = 0; d.inj = 0; window.__fastFx = 0; EO2.game.close(); });
await p.waitForTimeout(400);
log.yarisOnce = await p.evaluate(() => { EO2.game.open('yaris'); const R = races(); return { pist: R.list.map(r => r.id + ':' + r.venue + ':' + r.fee), nemesis: S.nemesis || null, rs: S.rs || null }; });
await shot('y1_yaris_ilan');
/* DURUM ZORLAMA: ezeli rakip normalde kıl payı biten yarışta doğar; burada elle atanır */
await p.evaluate(() => { const r = races().list[0].rivals[0]; S.nemesis = { name: r.name, trainer: r.trainer, el: r.el, style: r.style, gx: r.gx, hue: r.hue, w: 1, l: 0 }; S.rs = {}; });
await p.locator('[data-yaris]').first().evaluate(b => b.click()); await p.waitForTimeout(5200);
log.yarisSahne = await p.evaluate(() => ({ sahne: EO2.api.scene(), racem: !!document.getElementById('racem'), t: RC ? +RC.t.toFixed(1) : null }));
await shot('y2_yaris_ucus');
await p.evaluate(() => { if (RC && !RC.done) raceAuto(); }); await p.waitForTimeout(1800); await shot('y3_yaris_sonuc');
log.yarisBitti = await p.evaluate(() => ({ bitti: !!(RC && RC.done), dugme: !!document.querySelector('#racem [data-a="race-done"]') }));
await p.locator('#racem [data-a="race-done"]').first().evaluate(b => b.click());
await p.waitForTimeout(600);
log.yarisSonrasi = { hemen: await p.evaluate(() => ({ cizgiVar: !!document.querySelector('.cizgi'), vnVar: !!document.querySelector('.vn'), rs: JSON.stringify(S.rs), sahne: EO2.api.scene() })) };
await shot('y4_yaris_sonrasi_0_6sn');
await p.waitForTimeout(2600);
log.yarisSonrasi.sonra = await p.evaluate(() => ({ cizgiVar: !!document.querySelector('.cizgi'), sahne: EO2.api.scene(), ekranAcik: document.getElementById('scr').classList.contains('acik'), mesgul: !!EO2.game.mesgul }));
await shot('y5_yaris_sonrasi_3sn');
log.yarisSonrasi.sayfalar = await cizgiOku('y6_yaris_cizgi');
await p.waitForTimeout(800);
log.yarisSonrasi.son = await p.evaluate(() => ({ cizgiVar: !!document.querySelector('.cizgi'), sahne: EO2.api.scene(), ekranAcik: document.getElementById('scr').classList.contains('acik'), bet: S.rs && S.rs.bet }));
await shot('y7_yaris_son');

fs.writeFileSync(path.join(out, 't1_cizgi.json'), JSON.stringify(log, null, 1));
console.log(JSON.stringify(log, null, 1));
await browser.close();
