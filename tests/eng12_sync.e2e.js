// ENG-12 · Kayıtlı (X oturumlu) hesap: NPC'den ejderha sahiplen + yumurta al → Ocak Sandığı ve Bedesten
// "Pazara İlan Ver" listesinde görünür; tek altın (sunucu); bilet göstergesi yok; sunucu kapanınca oyun eskisi gibi.
// Tek sunucu, SQLite, geçici dizin. Kazanılmış altın güvenilir test kurulumuyla (doğrudan DB) verilir.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
const shots = path.join(__dirname, '../test-results/eng12');
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng12-')); fs.mkdirSync(shots, { recursive: true });
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
// Güvenilir test kurulumu: sunucu kesesine kazanılmış altın (oyunda düello ödülüyle kazanılmış gibi).
function seedEarnedGold(accountId, gold) {
  const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(path.join(dir, 'economy', 'economy.sqlite'));
  try {
    const g = JSON.parse(db.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(accountId).game_json);
    g.gold = gold; g.funds = { schema: 1, bound: 0, unknown: 0, earned: gold };
    db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), accountId);
  } finally { db.close(); }
}
const closeModals = page => page.evaluate(() => { for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
const serverEco = page => page.evaluate(async () => (await (await fetch('/api/economy', { credentials: 'same-origin' })).json()));
const idle = page => page.evaluate(() => ECO_LINK.whenIdle());

test('ENG-12 kayıtlı hesap: NPC ejderha + yumurta sunucuda alınır, Sandık ve Bedesten\'de görünür; sunucu kapanınca yerel oyun sürer', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url + '/api/auth/x/login');
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => !!(MP.xVerified && ECO_LINK.linked && ECO_SYNC.active())), { timeout: 20000 }).toBe(true);
  const accountId = await page.evaluate(() => MP.accountId);

  // Kazanılmış altın → tek kese sunucu kesesidir (HUD'daki altın = sunucu altını).
  seedEarnedGold(accountId, 3000);
  await page.evaluate(() => ECO_LINK.boot(true)); await idle(page);
  await expect.poll(() => page.evaluate(() => S.gold)).toBe(3000);
  await closeModals(page); await page.evaluate(() => render());
  await expect(page.locator('#hud')).toContainText('3000');
  // Bilet göstergesi yok.
  await expect(page.locator('.endweek')).not.toContainText('🎟');
  expect(await page.locator('.endweek .eco-week').isHidden()).toBe(true);

  // 1) Rüstem: sunucu tezgâhındaki ejderhayı sahiplen. Arayüzde ANINDA görünür (iyimser), komut arka planda.
  await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'ejder'; UI.stallTab = 'al'; UI.vsay = null; render(); });
  const srvMarket = (await serverEco(page)).economy.game.market;
  const pick = await page.evaluate(() => ({ name: S.market.dragons[0].name, price: S.market.dragons[0].price, n: S.dragons.length }));
  expect(pick.name).toBe(srvMarket.dragons[0].name); // tezgâh sunucu pazarı
  await page.locator('[data-a="buyD"][data-i="0"]').click();
  expect(await page.evaluate(() => S.dragons.length)).toBe(pick.n + 1); // sunucuyu beklemeden
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(shots, 'rustem-alim.png') });
  await idle(page);
  const bought = await page.evaluate(n => { const d = S.dragons.find(x => x.name === n); return d && { assetId: d.assetId, funding: d.funding }; }, pick.name);
  expect(bought.assetId).toMatch(new RegExp(`^${accountId}:dragon:`)); expect(bought.funding).toBe('earned');

  // İlk ejderha hedefi +60 altını hesaba bağlı (bound) öder ve harcama önce bağlı altından düşer (kaynak politikası,
  // değişmedi): o altınla alınan yumurta bağlı olurdu. Satılabilir yumurtayı göstermek için kese yeniden kazanılmış yapılır.
  seedEarnedGold(accountId, (await serverEco(page)).economy.gold);
  await page.evaluate(() => ECO_LINK.boot(true)); await idle(page);
  // 2) Hatice: yumurta al.
  await page.evaluate(() => { UI.stall = 'yumurta'; UI.vsay = null; render(); });
  const eggsBefore = await page.evaluate(() => S.eggs.length);
  await page.locator('[data-a="buyEgg"]').click();
  expect(await page.evaluate(() => S.eggs.length)).toBe(eggsBefore + 1);
  await idle(page);
  expect(await page.evaluate(() => S.eggs.filter(e => e.assetId).length)).toBe(1);

  // 3) Nuri: yem.
  await page.evaluate(() => { UI.stall = 'yem'; UI.vsay = null; render(); });
  await page.locator('[data-a="buyFood"][data-f="balik"]').click(); await idle(page);

  // Sunucu kesesi: altın düştü, varlıklar kazanılmış, yerel ve sunucu altını aynı.
  const eco = (await serverEco(page)).economy;
  expect(eco.dragons.find(r => r.assetId === bought.assetId).data.funding).toBe('earned');
  expect(eco.eggs.filter(r => r.data.funding === 'earned').length).toBe(1);
  expect(eco.game.foodSources.balik.earned).toBe(1);
  expect(await page.evaluate(() => S.gold)).toBe(eco.gold);
  expect(eco.gold).toBeLessThan(3000);

  // 4) Kesin ret: sunucuda olmayan tezgâh kaydı → yerel iyimser alım geri alınır, altın sunucudan, mesaj çıkar.
  const fake = await page.evaluate(() => {
    const e = JSON.parse(JSON.stringify(S.eggs.find(x => x.assetId))); delete e.assetId; delete e.funding; e.id = 'e-yok'; e.price = 1; e.origin = 'Hayalet';
    S.market.egg = e; UI.stall = 'yumurta'; UI.vsay = null; render(); return { eggs: S.eggs.length, gold: S.gold };
  });
  await page.locator('[data-a="buyEgg"]').click();
  expect(await page.evaluate(() => S.eggs.length)).toBe(fake.eggs + 1); // iyimser
  await idle(page);
  expect(await page.evaluate(() => S.eggs.some(e => e.origin === 'Hayalet'))).toBe(false);
  expect(await page.evaluate(() => S.gold)).toBe(fake.gold);
  await expect(page.locator('#toasts')).toContainText('Tezgâh yenilendi');

  // 5) Ocak Sandığı: yeni ejderha ve yumurta görünür.
  await closeModals(page);
  await page.evaluate(() => SANDIK_UI.open());
  const dlg = page.locator('dialog.sandik');
  await expect(dlg.locator('.sandik-card', { hasText: pick.name })).toBeVisible();
  await expect(dlg.locator('.sandik-card', { hasText: 'Yumurtası' }).first()).toBeVisible();
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(shots, 'sandik.png') });
  await dlg.locator('.sandik-card', { hasText: pick.name }).click();
  await expect(dlg.getByRole('button', { name: /Bedesten'de satışa çıkar/ })).toBeVisible();
  await page.evaluate(() => SANDIK_UI.close());

  // 6) Bedesten "Pazara İlan Ver": ejderha ve yumurta listede, satışa konabilir.
  await page.evaluate(() => { ACT['bedesten-open'](); UI.bedTab = 'ilanver'; UI.bedSellCat = 'dragon'; render(); });
  const card = page.locator('.v-bedesten .gcard', { hasText: pick.name });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-a="bed-post-dragon"]')).toHaveText('İlana Koy');
  await expect(card.locator('[data-a="bed-post-dragon"]')).toBeEnabled();
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(shots, 'bedesten-sat.png') });
  await page.evaluate(() => { UI.bedSellCat = 'egg'; render(); });
  await expect(page.locator('.v-bedesten .gcard [data-a="bed-post-egg"]', { hasText: 'İlana Koy' })).toHaveCount(1);

  // 7) Hafta: bilet yok, art arda haftalar beklemeden; sunucu haftası da ilerler; yerel/sunucu altın eşit.
  await page.evaluate(() => { UI.stall = null; UI.view = 'ocak'; render(); });
  const w0 = (await serverEco(page)).week.week;
  for (let i = 0; i < 3; i++) { await closeModals(page); await page.evaluate(() => { UI.arm = 'endweek'; ACT.endweek(); }); }
  await idle(page); await page.evaluate(() => ECO_LINK.boot(true)); await idle(page);
  const after = await serverEco(page);
  expect(after.week.week).toBe(w0 + 3);
  await expect.poll(() => page.evaluate(() => S.gold)).toBe(after.economy.gold);
  await expect(page.locator('#toasts')).not.toContainText('bekleniyor');

  // 8) Sunucu kapandı (ekonomi uçları erişilemez): oyun eskisi gibi yerel çalışır, sunucuya istek gitmez.
  await closeModals(page);
  await page.route('**/api/economy**', route => route.abort());
  await page.evaluate(() => ECO_LINK.boot(true));
  expect(await page.evaluate(() => ECO_SYNC.active())).toBe(false);
  const posts = []; page.on('request', r => { if (r.url().includes('/api/economy/command')) posts.push(r.url()); });
  const local = await page.evaluate(() => {
    const before = { week: S.week, eggs: S.eggs.length, food: S.food.balik || 0, gold: S.gold };
    UI.view = 'pazar'; UI.stall = 'yem'; render();
    document.querySelector('[data-a="buyFood"][data-f="balik"]').click();
    return before;
  });
  expect(await page.evaluate(() => S.food.balik || 0)).toBe(local.food + 1);
  await closeModals(page); await page.evaluate(() => { UI.arm = 'endweek'; ACT.endweek(); });
  expect(await page.evaluate(() => S.week)).toBe(local.week + 1);
  expect(posts).toEqual([]);
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(shots, 'cevrimdisi.png') });
  expect(errors).toEqual([]);
  await ctx.close();
});

test('ENG-12 kayıtlı hesap: bina, kuluçka ve Rüstem\'e satış sunucu komutuyla; yerel-only ejderha satışı sunucu altını yazmaz', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url + '/api/auth/x/login');
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!(MP.xVerified && ECO_LINK.linked && ECO_SYNC.active())), { timeout: 20000 }).toBe(true);
  seedEarnedGold(await page.evaluate(() => MP.accountId), 3000);
  await page.evaluate(() => ECO_LINK.boot(true)); await idle(page);
  await closeModals(page);
  // Bina: Kuluçka Ocağı (yerelde hemen, sunucuda building.buy; sunucu yumurtaları da kuluçkaya girer).
  await page.evaluate(() => { const tile = S.grid.findIndex(t => t.open && !t.b); UI.view = 'ocak'; UI.tile = tile; ACT.build({ dataset: { k: 'kulucka' } }); });
  await idle(page);
  let eco = (await serverEco(page)).economy;
  expect(eco.game.grid.some(t => t.b === 'kulucka')).toBe(true);
  expect(await page.evaluate(() => S.grid.some(t => t.b === 'kulucka'))).toBe(true);
  expect(await page.evaluate(() => S.gold)).toBe(eco.gold);
  // Yumurta al, kuluçkadan çıkar → egg.incubate.
  await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'yumurta'; render(); });
  await page.locator('[data-a="buyEgg"]').click(); await idle(page);
  const eggId = await page.evaluate(() => S.eggs.find(e => e.assetId).id);
  await page.evaluate(id => ACT['egg-out']({ dataset: { id } }), eggId); await idle(page);
  eco = (await serverEco(page)).economy;
  const egg = await page.evaluate(id => S.eggs.find(e => e.id === id).assetId, eggId);
  expect(eco.eggs.find(r => r.assetId === egg).data.inK).toBe(false);
  // Rüstem: sahiplen, sonra sat → dragon.sell; sunucudan ve yerelden çıkar, altın sunucudan.
  await page.evaluate(() => { UI.stall = 'ejder'; UI.stallTab = 'al'; render(); });
  await page.locator('[data-a="buyD"][data-i="0"]').click(); await idle(page);
  const d = await page.evaluate(() => { const x = S.dragons.find(y => y.assetId); return { id: x.id, assetId: x.assetId }; });
  await page.evaluate(() => { UI.stallTab = 'sat'; render(); });
  await page.evaluate(id => { ACT.sell({ dataset: { id: String(id) } }); ACT.sell({ dataset: { id: String(id) } }); }, d.id);
  expect(await page.evaluate(id => S.dragons.some(x => x.id === id), d.id)).toBe(false);
  await idle(page);
  eco = (await serverEco(page)).economy;
  expect(eco.dragons.some(r => r.assetId === d.assetId)).toBe(false);
  expect(await page.evaluate(() => S.gold)).toBe(eco.gold);
  // Yerel-only ejderha (sunucuda yok): satış engellenir, net mesaj; sunucu altını değişmez.
  const localOnly = await page.evaluate(() => S.dragons.find(x => !x.assetId).id);
  const goldBefore = eco.gold;
  await page.evaluate(id => { ACT.sell({ dataset: { id: String(id) } }); ACT.sell({ dataset: { id: String(id) } }); }, localOnly);
  expect(await page.evaluate(id => S.dragons.some(x => x.id === id), localOnly)).toBe(true);
  await expect(page.locator('#toasts')).toContainText('yalnız yerel ocağında');
  await idle(page);
  expect((await serverEco(page)).economy.gold).toBe(goldBefore);
  expect(errors).toEqual([]);
  await ctx.close();
});
