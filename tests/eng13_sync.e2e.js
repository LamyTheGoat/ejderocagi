// ENG-13 · Tek kese ve ejderha yaşam döngüsü (tarayıcıda, tek sunucu, SQLite, geçici dizin).
//  1) Misafir Topçu regresyonu: shm_ui.js açık yorum hatası (ReferenceError) yok; aşama geçişi, final zafer ve yenilgi ekranı gelir.
//  2) Kayıtlı hesap: kayıt öncesi altın bir kez tavanla aktarılır; HUD = sunucu kesesi; yerel gelir/gider sunucuda kalıcı;
//     Topçu geçişi ve çarkı sunucuda; yenilemeden sonra aynı altın.
//  3) Kayıtlı hesap: bağlı ejderha ölünce/ilandayken ölünce/müzayedede satılınca/siparişe ve teklife verilince sunucudan,
//     Sandık'tan ve Bedesten listesinden kalkar; çevrimdışı ölüm bağlanınca uygulanır.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
const shots = path.join(__dirname, '../test-results/eng13');
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng13-')); fs.mkdirSync(shots, { recursive: true });
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
function seedEarnedGold(accountId, gold) {
  const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(path.join(dir, 'economy', 'economy.sqlite'));
  try {
    const g = JSON.parse(db.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(accountId).game_json);
    g.gold = gold; g.funds = { schema: 1, bound: 0, unknown: 0, earned: gold };
    db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), accountId);
  } finally { db.close(); }
}
const closeModals = page => page.evaluate(() => { for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
const serverEco = page => page.evaluate(async () => (await (await fetch('/api/economy', { credentials: 'same-origin' })).json()).economy);
// Senkron sakin: komut zinciri boş, defter boş, HUD altını sunucu kesesine eşit.
async function settled(page) {
  await expect.poll(async () => page.evaluate(async () => {
    await ECO_LINK.whenIdle();
    const p = ECO_SYNC.pending, c = MP.economyClient;
    if (p.inflight || p.ledger.length || c.hasPending) return 'busy';
    await c.refresh(); ECO_SYNC.apply();
    return S.gold === c.state.gold ? 'ok' : `gold ${S.gold} != ${c.state.gold}`;
  }), { timeout: 20000 }).toBe('ok');
}
async function newGame(page) {
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
}
const linked = page => expect.poll(() => page.evaluate(() => !!(MP.xVerified && ECO_LINK.linked && ECO_SYNC.active() && ECO_SYNC.one())), { timeout: 20000 }).toBe(true);
// Topçu: gerçek oyun akışı (initSahmeranBattleStage → düşmanlar yenilir → advanceTurnAfterVolley).
const TOPCU = {
  open: page => page.evaluate(() => { window.__fastFx = true; for (let i = 0; i < 20 && modalOn; i++) closeModal(); openAnimTestRoom({ forceUnlock: true }); SHM.fastSim = true; }),
  win: (page, stage, difficulty = 'normal') => page.evaluate(async ([stg, diff]) => {
    SHM.difficulty = diff; SHM.gameMode = 'raid'; SHM.selectedStage = stg; SHM.instanceStage = stg; SHM.screen = 'battle'; initSahmeranBattleStage(stg); renderSahmeranApp();
    await new Promise(r => setTimeout(r, 1500));
    for (const e of SHM.enemies) e.dead = true; if (SHM.boss) { SHM.boss.hp = 0; SHM.boss.dead = true; }
    advanceTurnAfterVolley();
    for (let i = 0; i < 50 && SHM.screen === 'battle'; i++) await new Promise(r => setTimeout(r, 100));
    return { screen: SHM.screen, wheel: SHM.wheelMode, drops: SHM.stats.guaranteedDropsText };
  }, [stage, difficulty]),
  spin: page => page.evaluate(async () => {
    spinSahmeranLootWheel();
    for (let i = 0; i < 60 && !SHM.wheelWonSlice; i++) await new Promise(r => setTimeout(r, 100));
    return SHM.wheelWonSlice ? SHM.wheelWonSlice.id : null;
  }),
};

test('ENG-13 misafir Topçu: aşama geçişi, final zafer, çark ve yenilgi ekranı (ReferenceError yok, eski yerel ödül)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await newGame(page);
  expect(await page.evaluate(() => [typeof openStageClearBlessingModal, typeof completeSahmeranDungeonVictory, typeof openStageDefeatRetryModal])).toEqual(['function', 'function', 'function']);
  const g0 = await page.evaluate(() => S.gold);
  await TOPCU.open(page);
  const s1 = await TOPCU.win(page, 1);
  expect(s1.screen).toBe('victory'); expect(s1.wheel).toBe('minor');
  expect(await page.evaluate(() => S.gold)).toBe(g0 + 150); // misafir: eski yerel ödül
  await page.screenshot({ path: path.join(shots, 'misafir-asama-gecisi.png') });
  expect(await TOPCU.spin(page)).toMatch(/^minor_/);
  const s4 = await TOPCU.win(page, 4);
  expect(s4.screen).toBe('victory'); expect(s4.wheel).toBe('major'); expect(s4.drops).toContain('Harlı Kor');
  await page.screenshot({ path: path.join(shots, 'misafir-final-zafer.png') });
  const defeat = await page.evaluate(async () => {
    SHM.selectedStage = 1; SHM.screen = 'battle'; initSahmeranBattleStage(1); renderSahmeranApp(); await new Promise(r => setTimeout(r, 800));
    SHM.player.hp = 0; SHM.player.revivesLeft = 0; startNewPlayerTurn(); await new Promise(r => setTimeout(r, 300));
    return document.getElementById('shmStageClearMount').textContent;
  });
  expect(defeat).toContain('GERİ ÇEKİLME');
  await page.screenshot({ path: path.join(shots, 'misafir-yenilgi.png') });
  // Misafirde sunucuya ekonomi komutu gitmez.
  expect(await page.evaluate(() => ECO_SYNC.one())).toBe(false);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('ENG-13 kayıtlı hesap: tek kese, kayıt öncesi altın aktarımı, yerel gelir/gider ve Topçu sunucuda kalıcı', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await newGame(page);
  await page.evaluate(() => { S.gold = 9999; saveGame(); }); // kayıt öncesi yerel kese
  await page.goto(url + '/api/auth/x/login');
  await page.locator('[data-a="continue"]').click();
  await linked(page); await settled(page);
  let eco = await serverEco(page);
  expect(eco.gold).toBe(420 + 2000); // sunucu başlangıcı (bound) + tavanlı aktarım (bound)
  expect(eco.funds.bound).toBe(2420);
  expect(await page.evaluate(() => S.gold)).toBe(2420);
  await expect(page.locator('#toasts')).toContainText('Tek kese');
  await expect(page.locator('#toasts')).toContainText('7579 altın aktarılmadı');
  await closeModals(page); await page.evaluate(() => render());
  await expect(page.locator('#hud .res').first()).toContainText('2420');
  await page.screenshot({ path: path.join(shots, 'tek-kese-hud.png') });
  // İkinci etkinleşmede aktarım tekrarlanmaz.
  await page.evaluate(() => ECO_LINK.boot(true)); await settled(page);
  expect((await serverEco(page)).gold).toBe(2420);

  // Yerel gelir ve gider (atfedilemeyen → 'other', tavan 300): sunucuya yazılır, eşitlemede kaybolmaz.
  await page.evaluate(() => { S.gold += 200; });
  await settled(page);
  eco = await serverEco(page); expect(eco.gold).toBe(2620); expect(eco.funds.unknown).toBe(200);
  await page.evaluate(() => { S.gold -= 120; });
  await settled(page);
  expect((await serverEco(page)).gold).toBe(2500);
  // Tavan: tek bildirim 300'ü aşan kısım yazılmaz.
  await page.evaluate(() => { S.gold += 5000; }); await settled(page);
  expect((await serverEco(page)).gold).toBe(2800);

  // NPC tezgâhı aynı keseden öder (ayrı "Ocak Kesesi" yok).
  await closeModals(page);
  await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'yem'; UI.vsay = null; render(); });
  await expect(page.locator('.vfoot')).toContainText('Kesende');
  await expect(page.locator('.vfoot')).not.toContainText('Ocak Kesesi');
  await page.locator('[data-a="buyFood"][data-f="balik"]').click();
  await settled(page);
  expect((await serverEco(page)).gold).toBeLessThan(2800);
  await page.evaluate(() => { UI.view = 'ocak'; UI.stall = null; render(); });

  // Topçu: aşama geçişi +150 ve çark sunucuda; final zafer +250 ve taş düşüşü sunucu chibi kesesinde.
  const before = await serverEco(page);
  await TOPCU.open(page);
  const s1 = await TOPCU.win(page, 1);
  expect(s1.screen).toBe('victory');
  await settled(page);
  let after = await serverEco(page);
  expect(after.gold).toBe(before.gold + 150);
  const slice = await TOPCU.spin(page);
  expect(slice).toMatch(/^minor_/);
  await settled(page);
  const spun = await serverEco(page);
  expect(spun.gold - after.gold).toBe({ minor_gold_120: 120, minor_gold_220: 220 }[slice] || 0);
  const t2 = spun.chibi.stones.kor_t2;
  const s4 = await TOPCU.win(page, 4);
  expect(s4.screen).toBe('victory');
  await settled(page);
  after = await serverEco(page);
  expect(after.gold).toBe(spun.gold + 250);
  expect(after.chibi.stones.kor_t2).toBeGreaterThanOrEqual(t2 + 2); // raid_normal: +2 Harlı Kor (sunucu RNG)
  expect(await page.evaluate(() => SHM.stats.guaranteedDropsText)).toContain('+250 Altın');
  await page.screenshot({ path: path.join(shots, 'kayitli-topcu-zafer.png') });
  await page.evaluate(() => closeSahmeranApp());

  // Yenileme: aynı altın (yerel kayıt değil sunucu esas).
  const g = (await serverEco(page)).gold;
  await page.reload();
  await page.locator('[data-a="continue"]').click();
  await linked(page); await settled(page);
  expect(await page.evaluate(() => S.gold)).toBe(g);
  expect((await serverEco(page)).gold).toBe(g);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('ENG-13 kayıtlı hesap: ölen, ilandayken ölen, müzayedede satılan, siparişe ve teklife verilen ejderha sunucudan kalkar', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url + '/api/auth/x/login');
  await newGame(page);
  await linked(page); await settled(page);
  seedEarnedGold(await page.evaluate(() => MP.accountId), 20000);
  await page.evaluate(() => ECO_LINK.boot(true)); await settled(page);
  // Rüstem'den bağlı ejderha (yoksa sunucu haftası tezgâhı yeniler).
  async function buyLinked(filter = '') {
    for (let tries = 0; tries < 8; tries++) {
      await closeModals(page);
      const i = await page.evaluate(f => { const ok = d => !f || ['genc', 'yetiskin'].includes(d.stage); return freeSlots() > 0 ? S.market.dragons.findIndex(ok) : -2; }, filter);
      if (i >= 0) {
        await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'ejder'; UI.stallTab = 'al'; UI.vsay = null; render(); });
        const n = await page.evaluate(ix => S.market.dragons[ix].name, i);
        await page.locator(`[data-a="buyD"][data-i="${i}"]`).click();
        await settled(page);
        const d = await page.evaluate(nm => { const x = S.dragons.find(y => y.name === nm && y.assetId); return x && { id: x.id, assetId: x.assetId, name: x.name, el: x.el, stage: x.stage }; }, n);
        if (d) return d;
      }
      if (i === -2) { // in yok: yerel-only bir ejderhayı yerel sat
        await page.evaluate(() => { const x = S.dragons.find(y => !y.assetId && y.id !== S.star) || S.dragons.find(y => !y.assetId); ACT.sell({ dataset: { id: String(x.id) } }); ACT.sell({ dataset: { id: String(x.id) } }); });
      } else await page.evaluate(() => { UI.view = 'ocak'; UI.stall = null; UI.arm = 'endweek'; ACT.endweek(); });
      await settled(page);
    }
    throw new Error('no linked dragon');
  }
  const onServer = async a => (await serverEco(page)).dragons.some(r => r.assetId === a);

  // 1) Ölüm (turnuva/çukur kuralı): sunucudan, Sandık'tan ve Bedesten listesinden kalkar; yenilemede dirilmez.
  const d1 = await buyLinked();
  expect(await onServer(d1.assetId)).toBe(true);
  await page.evaluate(id => killDragon(byId(id), 'turnuvada öldü'), d1.id);
  await settled(page);
  expect(await onServer(d1.assetId)).toBe(false);
  const ecoDead = await serverEco(page);
  expect(ecoDead.game.dead.some(x => x.assetId === d1.assetId)).toBe(true);
  await closeModals(page);
  await page.evaluate(() => SANDIK_UI.open());
  await expect(page.locator('dialog.sandik')).toBeVisible();
  await expect(page.locator('dialog.sandik .sandik-card', { hasText: d1.name })).toHaveCount(0);
  await page.screenshot({ path: path.join(shots, 'sandik-olu-yok.png') });
  await page.evaluate(() => SANDIK_UI.close());
  await page.evaluate(() => { ACT['bedesten-open'](); UI.bedTab = 'ilanver'; UI.bedSellCat = 'dragon'; render(); });
  await expect(page.locator('.v-bedesten .gcard', { hasText: d1.name })).toHaveCount(0);
  await closeModals(page); await page.evaluate(() => { UI.view = 'ocak'; UI.stall = null; render(); });

  // 2) İlandayken ölüm: sunucu ölümü reddeder (market_reserved_asset); istemci ilanı geri çeker ve ölümü uygular.
  // İlan için kazanılmış altınla alınmış ejderha gerekir (hedef ödülü bound/unknown önce harcanır: kaynak politikası).
  seedEarnedGold(await page.evaluate(() => MP.accountId), 20000); await page.evaluate(() => ECO_LINK.boot(true)); await settled(page);
  const d2 = await buyLinked();
  await page.evaluate(a => MARKET_CLIENT.list('dragon', a, 1, 150), d2.assetId);
  await expect.poll(() => page.evaluate(a => MARKET_CLIENT.refresh().then(() => MARKET_CLIENT.state.mine.some(l => l.assetId === a && l.status === 'open')), d2.assetId)).toBe(true);
  await page.evaluate(id => killDragon(byId(id), 'çukurda öldü'), d2.id);
  await expect.poll(() => onServer(d2.assetId), { timeout: 20000 }).toBe(false);
  expect(await page.evaluate(a => MARKET_CLIENT.refresh().then(() => MARKET_CLIENT.state.mine.some(l => l.assetId === a && l.status === 'open')), d2.assetId)).toBe(false);
  await settled(page);

  // 3) Müzayede: sunucu teklifçileri oynar; salon sunucu sonucunu gösterir; satıldıysa ejderha sunucudan kalkar.
  const d3 = await buyLinked();
  const g3 = (await serverEco(page)).gold;
  await closeModals(page);
  await page.evaluate(id => { window.__fastFx = true; S.auc = null; ACT['auc-sell']({ dataset: { id: String(id) } }); }, d3.id);
  await expect.poll(() => page.evaluate(() => !!(typeof AUC !== 'undefined' && AUC && AUC.over)), { timeout: 20000 }).toBe(true);
  const auc = await page.evaluate(() => ({ sold: !!(AUC.srv && AUC.srv.sold), price: AUC.price, leader: AUC.leader }));
  await page.screenshot({ path: path.join(shots, 'muzayede-sunucu.png') });
  await page.evaluate(() => ACT['auc-done']());
  await settled(page);
  expect(await onServer(d3.assetId)).toBe(!auc.sold);
  expect(await page.evaluate(a => S.dragons.some(d => d.assetId === a), d3.assetId)).toBe(!auc.sold);
  if (auc.sold) expect((await serverEco(page)).gold).toBe(g3 + Math.round(auc.price * 0.9));

  // 4) Sipariş: gen şartı sunucu ejderhasında, altın sunucuda orders.js formülüyle.
  const d4 = await buyLinked('grown');
  const g4 = (await serverEco(page)).gold;
  const ord = await page.evaluate(([id, el, st]) => {
    const O = orders(); O.list = O.list.filter(o => o.id !== 't4');
    O.list.push({ id: 't4', who: 'Test', d: 'test', s: 'test', lv: 0, by: S.week + 4, reqs: [['el', el], ['stage', st]], gold: 1, un: 1, egg: false });
    UI.view = 'pazar'; UI.stall = null;
    ACT.orderGive({ dataset: { o: 't4', id: String(id) } }); ACT.orderGive({ dataset: { o: 't4', id: String(id) } });
    return { week: S.week, gone: !S.dragons.some(d => d.id === id) };
  }, [d4.id, d4.el, d4.stage]);
  expect(ord.gone).toBe(true);
  await settled(page);
  expect(await onServer(d4.assetId)).toBe(false);
  const srvWeek = (await serverEco(page)).game.week;
  void srvWeek;
  const expGold = Math.round((140 + 120 + Math.min(20, ord.week) * 12) * (d4.stage === 'yetiskin' ? 1.2 : 1) / 10) * 10;
  expect((await serverEco(page)).gold).toBe(g4 + expGold);

  // 5) Arena "Locadan Bir Teklif": fiyat sunucuda value × 1.4.
  const d5 = await buyLinked();
  const g5 = (await serverEco(page)).gold;
  await page.evaluate(id => FIGHT_POST.find(e => e.id === 'teklif').opts[0].fx({ d: byId(id), price: 1 }), d5.id);
  await settled(page);
  expect(await onServer(d5.assetId)).toBe(false);
  expect((await serverEco(page)).gold).toBeGreaterThan(g5);

  // 6) Çevrimdışı ölüm: kuyrukta bekler, bağlanınca sunucuda uygulanır. Çevrimdışıyken bağlı ejderha verilemez.
  const d6 = await buyLinked();
  await page.route('**/api/economy**', route => route.abort());
  await page.evaluate(() => ECO_LINK.boot(true));
  expect(await page.evaluate(() => ECO_SYNC.active())).toBe(false);
  await page.evaluate(id => { const O = orders(); UI.sellArm = null; ACT['auc-sell']({ dataset: { id: String(id) } }); }, d6.id);
  await expect(page.locator('#toasts')).toContainText('sunucuya bağlı olmalısın');
  await page.evaluate(id => killDragon(byId(id), 'turnuvada öldü'), d6.id);
  expect(await page.evaluate(a => S.srvSync.die.includes(a), d6.assetId)).toBe(true);
  await page.unroute('**/api/economy**');
  await page.evaluate(() => ECO_LINK.boot(true));
  await expect.poll(() => onServer(d6.assetId), { timeout: 20000 }).toBe(false);
  await settled(page);

  // Yenileme: ölüler dirilmez, kese aynı.
  const g = (await serverEco(page)).gold;
  await page.reload();
  await page.locator('[data-a="continue"]').click();
  await linked(page); await settled(page);
  expect(await page.evaluate(ids => S.dragons.some(d => ids.includes(d.assetId)), [d1.assetId, d2.assetId, d4.assetId, d5.assetId, d6.assetId])).toBe(false);
  expect(await page.evaluate(() => S.gold)).toBe(g);
  await page.screenshot({ path: path.join(shots, 'yenileme-sonrasi.png') });
  expect(errors).toEqual([]);
  await ctx.close();
});
