// ENG-14 · Topçu PvP odaları (gerçek tarayıcı, tek sunucu, SQLite, geçici dizin; birden çok bağlam).
//  1) A (kayıtlı) oda kurar, B (misafir) listede görür ve katılır, hazır, başlat → iki tarafta aynı harita, rüzgâr, ilk tur.
//     Atışla can iki tarafta aynı; biri ölünce iki tarafta Zafer/Yenilgi; rövanş; kopma → hükmen.
//     Üçüncü bağlam C hiçbir oda/maç mesajı almaz.
//  2) Hızlı savaş: iki misafir "Rakip bul" → "Hazırım" kartı → aynı maç.
//  3) 375/768/1000 px: yatay taşma yok, dokunma hedefleri ≥44 px.
//  4) PvE Topçu regresyonu: aşama 1 zaferi.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
const shots = path.join(__dirname, '../test-results/eng14');
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng14-')); fs.mkdirSync(shots, { recursive: true });
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy'), PVP_DISCONNECT_GRACE_MS: '4000' }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

// Gelen WS çerçevelerini kaydeder (üçüncü bağlam denetimi ve hata ayıklama).
function recordFrames(page) {
  const frames = [];
  page.on('websocket', ws => ws.on('framereceived', f => { try { frames.push(JSON.parse(f.payload)); } catch (_) {} }));
  return frames;
}
async function newGame(page, registered) {
  if (registered) await page.goto(url + '/api/auth/x/login'); else await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => !!(MP.ws && MP.ws.readyState === 1 && MP.authHandle)), { timeout: 20000 }).toBe(true);
}
const openLobby = page => page.evaluate(() => {
  window.__fastFx = true;
  for (let i = 0; i < 20 && modalOn; i++) closeModal();
  MQ.length = 0;
  openAnimTestRoom({ screen: 'pvp_lobby', forceUnlock: true });
  SHM.fastSim = true;
});
const handle = page => page.evaluate(() => MP.authHandle);
const live = page => page.evaluate(() => {
  const L = SHM.pvpLive;
  return L && { matchId: L.matchId, me: L.me, rival: L.rival, firstTurn: L.firstTurn, turnNo: L.turnNo, map: SHM.pvpMap, wind: SHM.wind,
    turn: SHM.turn, screen: SHM.screen, hp: SHM.player && Math.round(SHM.player.hp), rivalHp: SHM.pvpRival && Math.round(SHM.pvpRival.hp), ended: L.ended };
});
// Atan taraf: gerçek patlama kodu (detonateProjectile) rakibin üzerinde çalışır → `hit`; sonra sıra devri.
const shoot = (page, dmg) => page.evaluate(d => {
  const rv = SHM.pvpRival;
  detonateProjectile({ owner: 'player', x: rv.x, y: rv.y - 46, vx: 1, vy: 0, dmg: d, blastRadius: 54, trail: [] });
  advanceTurnAfterVolley();
}, dmg);
async function noOverflow(page) {
  const r = await page.evaluate(() => {
    for (const an of document.getAnimations()) { try { an.finish(); } catch (_) {} } // giriş animasyonu (ölçek) ölçümü bozmasın
    const sc = document.querySelector('.pvpr-screen');
    const small = [...document.querySelectorAll('.pvpr-screen button, .pvpr-invite-card button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim());
    return { doc: document.documentElement.scrollWidth - window.innerWidth, sc: sc ? sc.scrollWidth - sc.clientWidth : 0, small };
  });
  expect(r.doc).toBeLessThanOrEqual(0); expect(r.sc).toBeLessThanOrEqual(0); expect(r.small).toEqual([]);
}

test('ENG-14 oda: kur → listede gör → katıl → hazır → başlat; can/tur/rüzgâr eşit; Zafer/Yenilgi; rövanş; kopma → hükmen; üçüncü bağlam sessiz', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const ctxB = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const ctxC = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage(), C = await ctxC.newPage();
  const errors = []; for (const p of [A, B, C]) p.on('pageerror', e => errors.push(String(e)));
  const framesC = recordFrames(C);
  await newGame(A, true); await newGame(B, false); await newGame(C, false);
  expect(await A.evaluate(() => MP.xVerified)).toBe(true);
  expect(await B.evaluate(() => MP.xVerified)).toBe(false);
  const [hA, hB] = [await handle(A), await handle(B)];
  expect(hA).not.toBe(hB);
  for (const p of [A, B, C]) await openLobby(p);

  // Sahte oda yok, boş durum metni.
  await expect(B.getByText('İlk odayı sen kurabilirsin.')).toBeVisible();
  await B.screenshot({ path: path.join(shots, 'lobi-bos-375.png') });
  await A.getByRole('button', { name: 'Glacier' }).or(A.locator('[data-pvpr-act="new-map"][data-map="glacier"]')).first().click();
  await A.locator('[data-pvpr-act="create"]').click();
  await expect(A.locator('#pvprRoomCode')).toHaveText(/^EJD-[A-Z2-9]{3}$/);
  const code = await A.locator('#pvprRoomCode').textContent();
  await A.screenshot({ path: path.join(shots, 'bekleme-odasi-kurucu-1000.png') });

  // B listede görür ve katılır; C de listeyi görür ama katılmaz.
  const rowB = B.locator('.pvpr-room', { hasText: code });
  await expect(rowB).toBeVisible();
  await expect(C.locator('.pvpr-room', { hasText: code })).toBeVisible();
  await C.screenshot({ path: path.join(shots, 'lobi-oda-listesi-768.png') });
  await rowB.getByRole('button', { name: 'Katıl' }).click();
  await expect(B.locator('#pvprRoomCode')).toHaveText(code);
  await expect(A.locator('.pvpr-slot.red')).toContainText(hB);
  await expect(A.locator('[data-pvpr-act="start"]')).toBeDisabled();
  await B.getByRole('button', { name: 'Hazırım' }).click();
  await expect(A.locator('[data-pvpr-act="start"]')).toBeEnabled();
  await B.screenshot({ path: path.join(shots, 'bekleme-odasi-misafir-375.png') });
  await noOverflow(B);
  // Kurucu harita değiştirir → misafire gider.
  await A.locator('[data-pvpr-act="room-map"][data-map="sandstorm"]').click();
  await expect(B.locator('.pvpr-wait-head .pvpr-title')).toContainText(await A.evaluate(() => PVP_ARENA_MAPS.sandstorm.name));
  await A.locator('[data-pvpr-act="start"]').click();

  await expect.poll(async () => { const a = await live(A), b = await live(B); return !!(a && b && a.screen === 'battle' && b.screen === 'battle'); }).toBe(true);
  let a = await live(A), b = await live(B);
  expect(a.matchId).toBe(b.matchId); expect(a.map).toBe('sandstorm'); expect(b.map).toBe('sandstorm');
  expect(a.firstTurn).toBe(b.firstTurn); expect(a.rival).toBe(hB); expect(b.rival).toBe(hA);
  expect(a.wind).toBe(-b.wind); // aynı rüzgâr, her taraf kendi bakışında (ayna)
  expect([a.turn, b.turn].sort()).toEqual(['enemy', 'player']);
  expect(a.turn === 'player').toBe(a.firstTurn === hA);
  // Başlangıç can eşitlemesi: her taraf rakibin gerçek canını görür.
  await expect.poll(async () => { a = await live(A); b = await live(B); return a.rivalHp === b.hp && b.rivalHp === a.hp; }).toBe(true);
  await A.screenshot({ path: path.join(shots, 'mac-basi-A-1000.png') });
  await B.screenshot({ path: path.join(shots, 'mac-basi-B-375.png') });

  // İlk atış sırası kimdeyse o atar; can iki tarafta aynı olur; sıra karşıya geçer, rüzgâr yine eşit.
  const [S1, R1] = a.turn === 'player' ? [A, B] : [B, A];
  const before = await live(R1);
  await shoot(S1, 300);
  await expect.poll(async () => (await live(R1)).turn).toBe('player');
  let s = await live(S1), r = await live(R1);
  expect(r.hp).toBeLessThan(before.hp);
  expect(s.rivalHp).toBe(r.hp);
  expect(s.turnNo).toBe(1); expect(r.turnNo).toBe(1); expect(s.wind).toBe(-r.wind); expect(s.turn).toBe('enemy');
  // Canlı rakip varken yerel bot ateş etmez: S1 rakibin sırasında 2,5 sn bekler, canı değişmez.
  const sHp = s.hp; await S1.waitForTimeout(2500); expect((await live(S1)).hp).toBe(sHp);
  // Karşı atış.
  await shoot(R1, 250);
  await expect.poll(async () => (await live(S1)).turn).toBe('player');
  s = await live(S1); r = await live(R1);
  expect(r.rivalHp).toBe(s.hp); expect(s.hp).toBeLessThan(sHp);

  // Öldürücü atış: R1'in dirilme hakkı yok sayılır (test kısayolu), can biter → iki tarafa tek sonuç.
  await R1.evaluate(() => { SHM.player.revivesLeft = 0; });
  await shoot(S1, 99999);
  await expect.poll(async () => [await S1.evaluate(() => SHM.screen), await R1.evaluate(() => SHM.screen)]).toEqual(['pvp_result', 'pvp_result']);
  await expect(S1.locator('[data-pvpr-result="win"] .pvpr-result-title')).toHaveText('Zafer');
  await expect(R1.locator('[data-pvpr-result="lose"] .pvpr-result-title')).toHaveText('Yenilgi');
  expect(await S1.evaluate(() => SHM.pvpResult.winner)).toBe(await R1.evaluate(() => SHM.pvpResult.winner));
  await A.screenshot({ path: path.join(shots, 'mac-sonu-A-1000.png') });
  await B.screenshot({ path: path.join(shots, 'mac-sonu-B-375.png') });
  await noOverflow(B);

  // Rövanş: biri ister, diğeri kabul eder → yeni maç, kaybeden başlar.
  const loserH = await R1.evaluate(() => MP.authHandle);
  await S1.getByRole('button', { name: 'Rövanş iste' }).click();
  await expect(R1.getByRole('button', { name: 'Rövanşı kabul et' })).toBeVisible();
  await R1.getByRole('button', { name: 'Rövanşı kabul et' }).click();
  await expect.poll(async () => { const x = await live(A), y = await live(B); return !!(x && y && x.screen === 'battle' && y.screen === 'battle' && x.matchId === y.matchId && x.matchId !== a.matchId); }).toBe(true);
  expect((await live(A)).firstTurn).toBe(loserH);

  // Kopma: B'nin bağlantısı kesilir → A'da bekleme katmanı; 4 sn (test ayarı) sonra A hükmen kazanır.
  await ctxB.close();
  await expect(A.locator('#pvprPeerOverlay')).toBeVisible();
  await A.screenshot({ path: path.join(shots, 'kopma-A-1000.png') });
  await expect.poll(() => A.evaluate(() => SHM.screen), { timeout: 15000 }).toBe('pvp_result');
  await expect(A.locator('[data-pvpr-result="win"] .pvpr-result-title')).toHaveText('Zafer');
  expect(await A.evaluate(() => SHM.pvpResult.reason)).toBe('disconnect');
  await A.getByRole('button', { name: 'Lobiye dön' }).click();
  await expect(A.locator('[data-pvpr-act="create"]')).toBeVisible();

  // Üçüncü bağlam: yalnız lobi listesi (pvp_lobby) aldı; hiçbir maç/oda/davet mesajı yok.
  const leaked = framesC.filter(f => typeof f.type === 'string' && f.type.startsWith('pvp_') && f.type !== 'pvp_lobby');
  expect(leaked).toEqual([]);
  expect(framesC.some(f => f.type === 'pvp_lobby')).toBe(true);
  expect(errors).toEqual([]);
  await ctxA.close(); await ctxC.close();
});

test('ENG-14 davet: kurucu çevrimiçi arkadaşı davet eder, kart üstte; kabul doğrudan bekleme odası; "Beklemeden çık" hükmen', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1000, height: 768 } }), ctxB = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const A = await ctxA.newPage(), B = await ctxB.newPage(); const errors = []; for (const p of [A, B]) p.on('pageerror', e => errors.push(String(e)));
  await newGame(A, false); await newGame(B, false);
  const hB = await handle(B), hA = await handle(A);
  await A.evaluate(h => { ensureSocial().friends.push({ handle: h, ts: Date.now() }); }, hB);
  await openLobby(A);
  // Lobide çevrimiçi arkadaş: dokununca oda kurulur ve davet gider.
  await expect(A.locator('[data-pvpr-act="friend-invite"]', { hasText: hB })).toBeVisible();
  await A.locator('[data-pvpr-act="friend-invite"]', { hasText: hB }).click();
  await expect(B.locator('.pvpr-invite-card')).toContainText(hA);
  await B.screenshot({ path: path.join(shots, 'davet-karti-375.png') });
  await noOverflow(B);
  await B.getByRole('button', { name: 'Kabul et' }).click();
  await expect(B.locator('#pvprRoomCode')).toHaveText(await A.locator('#pvprRoomCode').textContent());
  await B.getByRole('button', { name: 'Hazırım' }).click();
  await A.locator('[data-pvpr-act="start"]').click();
  await expect.poll(async () => { const a = await live(A), b = await live(B); return !!(a && b && a.screen === 'battle' && b.screen === 'battle'); }).toBe(true);
  // B ağdan düşer (sekme kapanır gibi): A "Beklemeden çık" → hükmen kazanır.
  await B.evaluate(() => { MP.staticServer = true; MP.ws.close(); });
  await expect(A.locator('#pvprPeerOverlay')).toBeVisible();
  await A.getByRole('button', { name: /Beklemeden çık/ }).click();
  await expect.poll(() => A.evaluate(() => SHM.pvpResult && SHM.pvpResult.win)).toBe(true);
  expect(errors).toEqual([]);
  await ctxA.close(); await ctxB.close();
});

test('ENG-14 hızlı savaş: iki misafir eşleşir, iki tarafa "Hazırım" kartı, aynı maç ve harita', async ({ browser }) => {
  const ctxD = await browser.newContext({ viewport: { width: 375, height: 812 } }), ctxE = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const D = await ctxD.newPage(), E = await ctxE.newPage(); const errors = []; for (const p of [D, E]) p.on('pageerror', e => errors.push(String(e)));
  await newGame(D, false); await newGame(E, false);
  await openLobby(D); await openLobby(E);
  await D.getByRole('button', { name: 'Rakip bul' }).click();
  await expect(D.getByText(/Rakip aranıyor/)).toBeVisible();
  await D.screenshot({ path: path.join(shots, 'hizli-savas-arama-375.png') });
  await E.getByRole('button', { name: 'Rakip bul' }).click();
  await expect(D.getByRole('button', { name: 'Hazırım' })).toBeVisible();
  await expect(E.getByRole('button', { name: 'Hazırım' })).toBeVisible();
  await D.screenshot({ path: path.join(shots, 'hizli-savas-hazirim-375.png') });
  await noOverflow(D);
  await D.getByRole('button', { name: 'Hazırım' }).click();
  await E.getByRole('button', { name: 'Hazırım' }).click();
  await expect.poll(async () => { const d = await live(D), e = await live(E); return !!(d && e && d.screen === 'battle' && e.screen === 'battle' && d.matchId === e.matchId && d.map === e.map); }).toBe(true);
  expect((await live(D)).firstTurn).toBe((await live(E)).firstTurn);
  // Maçtan ayrılan (← Lobi) hükmen kaybeder, karşı taraf Zafer görür.
  await D.evaluate(() => document.querySelector('[data-shm-nav="pvp_lobby"]').click());
  await expect.poll(() => E.evaluate(() => SHM.pvpResult && SHM.pvpResult.win)).toBe(true);
  await expect.poll(() => D.evaluate(() => SHM.pvpResult && SHM.pvpResult.win)).toBe(false);
  await expect(E.getByRole('button', { name: 'Tekrar hızlı savaş' })).toBeVisible();
  expect(errors).toEqual([]);
  await ctxD.close(); await ctxE.close();
});

test('ENG-14 yerleşim: lobi 375/768/1000 px taşmasız; bot provası ödülsüz; PvE Topçu aşama 1 zaferi bozulmadı', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await newGame(page, false);
  await openLobby(page);
  for (const [w, h] of [[375, 812], [768, 1024], [1000, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    await noOverflow(page);
    await page.screenshot({ path: path.join(shots, `lobi-${w}.png`) });
  }
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.pvpr-lobby')).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(3);
  // Bot provası: kurucu bot ekler, başlatır; ödül yok (altın değişmez), sonuç ekranı ödülsüz.
  const g0 = await page.evaluate(() => S.gold);
  await page.locator('[data-pvpr-act="create"]').click();
  await page.locator('[data-pvpr-act="bot-add"]').first().click();
  await expect(page.locator('.pvpr-slot.red')).toContainText('Bot');
  await page.locator('[data-pvpr-act="start"]').click();
  await expect.poll(() => page.evaluate(() => SHM.screen)).toBe('battle');
  expect(await page.evaluate(() => !!SHM.pvpPractice && !SHM.pvpLive)).toBe(true);
  await page.evaluate(() => { SHM.pvpRival.hp = 0; SHM.pvpRival.dead = true; advanceTurnAfterVolley(); });
  await expect.poll(() => page.evaluate(() => SHM.screen)).toBe('pvp_result');
  await expect(page.getByText('Prova sonucu')).toBeVisible();
  expect(await page.evaluate(() => S.gold)).toBe(g0);
  await page.getByRole('button', { name: 'Bekleme odasına dön' }).click();
  await expect(page.locator('#pvprRoomCode')).toBeVisible();
  // PvE: aşama 1 zaferi.
  const res = await page.evaluate(async () => {
    closeSahmeranApp();
    openAnimTestRoom({ forceUnlock: true }); SHM.fastSim = true;
    SHM.difficulty = 'normal'; SHM.gameMode = 'raid'; SHM.selectedStage = 1; SHM.instanceStage = 1; SHM.screen = 'battle'; initSahmeranBattleStage(1); renderSahmeranApp();
    await new Promise(r => setTimeout(r, 1500));
    for (const e of SHM.enemies) e.dead = true; if (SHM.boss) { SHM.boss.hp = 0; SHM.boss.dead = true; }
    advanceTurnAfterVolley();
    for (let i = 0; i < 50 && SHM.screen === 'battle'; i++) await new Promise(r => setTimeout(r, 100));
    return { screen: SHM.screen, wheel: SHM.wheelMode };
  });
  expect(res).toEqual({ screen: 'victory', wheel: 'minor' });
  await page.screenshot({ path: path.join(shots, 'pve-asama1-zafer.png') });
  expect(errors).toEqual([]);
  await ctx.close();
});
