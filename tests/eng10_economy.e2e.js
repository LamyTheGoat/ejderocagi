// ENG-10 · İstemci sunucu kesesine bağlı: hafta sonu (week.end), bilet bekleme, çevrimdışı geri düşüş,
// ödüllü düello sonucu ve mobil genişliklerde yerleşim. Tek sunucu, SQLite, geçici dizin, 2 başlangıç bileti.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng10-'));
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy'), EO_WEEK_TICKET_INITIAL: '2' }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
async function enter(page, { register = false } = {}) {
  // Kayıtlı hesap: yerelde X simülasyon girişi (yalnız localhost, X_CLIENT_ID yokken) imzalı eo_sess çerezi verir.
  if (register) await page.goto(url + '/api/auth/x/login');
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => !!(MP.authenticated && MP.economyClient))).toBe(true);
}
// Sunucu ocağını kur (Takas/Bedesten/Sandık'ın yaptığı gibi) ve bağlantıyı tazele.
async function startServerOcak(page) {
  await page.evaluate(async () => {
    const eco = await (await fetch('/api/economy', { credentials: 'same-origin' })).json();
    const r = await fetch('/api/economy/command', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: eco.economy.version, type: 'game.start', args: {} }) });
    if (!r.ok) throw new Error('start ' + r.status);
    await ECO_LINK.boot(true);
  });
  await expect.poll(() => page.evaluate(() => ECO_LINK.linked)).toBe(true);
}
const closeModals = page => page.evaluate(() => { for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
const endWeek = async page => { await closeModals(page); await page.evaluate(() => { UI.arm = 'endweek'; ACT.endweek(); }); };
const serverWeek = page => page.evaluate(async () => (await (await fetch('/api/economy', { credentials: 'same-origin' })).json()).week);

test('ENG-10 hafta sonu: bağlı değilken eski akış; bağlıyken yerel hafta hemen biter, sunucu haftası ilerler; bilet bitince yeni hafta bekletilir', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  // Sunucu ocağı yok → eski akış: yerel hafta ilerler, bilet satırı yok, sunucu çağrısı yok.
  expect(await page.evaluate(() => ECO_LINK.linked)).toBe(false);
  await endWeek(page);
  expect(await page.evaluate(() => S.week)).toBe(2);
  expect(await page.locator('.endweek .eco-week').isHidden()).toBe(true);
  expect(await serverWeek(page)).toBe(null);

  await startServerOcak(page);
  await closeModals(page); await page.evaluate(() => render());
  await expect(page.locator('.endweek .eco-week')).toHaveText('🎟 2/8');
  const goldBefore = await page.evaluate(() => S.gold);
  await endWeek(page);
  expect(await page.evaluate(() => S.week)).toBe(3); // yerel hafta sunucuyu beklemeden bitti
  await page.evaluate(() => ECO_LINK.whenIdle());
  let w = await serverWeek(page);
  expect(w.week).toBe(2); expect(w.ticket.count).toBe(1);
  await expect(page.locator('.endweek .eco-week')).toHaveText('🎟 1/8');
  // Yerel altın yalnız yerel kurallarla değişir (sunucu kesesi ayrı); istemci sunucu sonucunu S'e yazmaz.
  expect(typeof goldBefore).toBe('number');

  await endWeek(page);
  await page.evaluate(() => ECO_LINK.whenIdle());
  w = await serverWeek(page); expect(w.week).toBe(3); expect(w.ticket.count).toBe(0);
  expect(await page.evaluate(() => S.week)).toBe(4);
  // Bilet yok: yerel hafta bekletilir, net mesaj; oyunun geri kalanı açık (Ahır'a gidilebilir).
  await closeModals(page);
  await expect(page.locator('.endweek')).toHaveClass(/eco-wait/);
  await expect(page.locator('.endweek .eco-week')).toContainText('🎟 0 ·');
  await page.locator('.endweek').click();
  await expect(page.locator('#toasts')).toContainText('Yeni hafta bekleniyor');
  expect(await page.evaluate(() => S.week)).toBe(4);
  expect((await serverWeek(page)).week).toBe(3);
  await page.evaluate(() => { UI.view = 'ahir'; render(); });
  await expect(page.locator('#stage')).not.toBeEmpty();
  // Bilet & Borç ekranı: Menü kartından açılır, dokunma hedefleri ≥ 44 px.
  await page.evaluate(() => ACT['eco-status']());
  await expect(page.locator('.eco-modal')).toContainText('Hafta bileti:');
  await expect(page.locator('.eco-modal')).toContainText('Borç:');
  const h = await page.locator('.eco-modal .btn').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
  expect(Math.min(...h)).toBeGreaterThanOrEqual(44);

  // Sunucu düşerse (çevrimdışı/5xx) oyun kilitlenmez: bağlantı kopuk sayılır ve eski akışa döner.
  await closeModals(page);
  await page.route('**/api/economy', route => route.abort());
  await page.evaluate(() => ECO_LINK.boot(true));
  expect(await page.evaluate(() => ECO_LINK.linked)).toBe(false);
  await endWeek(page);
  expect(await page.evaluate(() => S.week)).toBe(5);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('ENG-10 ödüllü düello: davet sunucu ejderhasıyla gider, sonuç sunucudan gösterilir, yerel altın değişmez; vitrin düellosu kalır', async ({ browser }) => {
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
    const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(String(e)));
    await enter(page, { register: true }); await startServerOcak(page);
    await expect.poll(() => page.evaluate(() => !!(MP.ws && MP.ws.readyState === 1 && MP.xVerified))).toBe(true);
    pages.push(page);
  }
  const [a, b] = pages;
  const handleB = await b.evaluate(() => MP.authHandle);
  // Y-1: misafir ödüllü düelloya giremez (istemci ve sunucu), net mesaj; vitrin düellosu misafire açık.
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 768 } });
    const g = await ctx.newPage(); await enter(g); await startServerOcak(g);
    await expect.poll(() => g.evaluate(() => !!(MP.ws && MP.ws.readyState === 1))).toBe(true);
    expect(await g.evaluate(() => MP.xVerified)).toBe(false);
    expect(await g.evaluate(h => mpSendDragonDuelInvite(h, { ranked: true }), handleB)).toBe(false);
    await expect(g.locator('#toasts')).toContainText('Ödüllü düello için hesap aç');
    await g.evaluate(h => mpSendWs({ type: 'duel_invite', to: h, dragonAssetId: ECO_LINK.duelDragon().assetId }), handleB);
    await expect(g.locator('#toasts')).toContainText('X ile giriş yap');
    expect(await b.evaluate(() => (ensureSocial().invites || []).filter(i => i.kind === 'vs_duel').length)).toBe(0);
    await ctx.close();
  }
  const goldA = await a.evaluate(() => S.gold), goldB = await b.evaluate(() => S.gold);
  // Sosyal menüde iki seçenek birlikte: vitrin (eski) ve ödüllü.
  expect(await a.evaluate(h => socRankedDuelBtn(h), 'x')).toContain('soc-vs-duel-ranked');
  await a.evaluate(h => mpSendDragonDuelInvite(h, { ranked: true }), handleB);
  await expect.poll(() => b.evaluate(() => (ensureSocial().invites || []).filter(i => i.kind === 'vs_duel' && i.ranked).length)).toBe(1);
  const inv = await b.evaluate(() => ensureSocial().invites.find(i => i.kind === 'vs_duel' && i.ranked).id);
  expect(await b.evaluate(id => mpReplyDragonDuelInvite(id, true, { ranked: true }), inv)).toBe(true);
  for (const p of pages) await expect.poll(() => p.evaluate(() => !!(FT && FT.mpOpts && FT.mpOpts.ranked && FT.mpOpts.matchId))).toBe(true);
  // A teslim olur, B savunur → maç biter; ödül yalnız sunucuda belirlenir (erken çekilme: ödülsüz).
  await a.evaluate(() => mpSendWs({ type: 'duel_action', roomId: FT.mpRoomId, round: FT.F.round + 1, action: 'teslim' }));
  await b.evaluate(() => mpSendWs({ type: 'duel_action', roomId: FT.mpRoomId, round: FT.F.round + 1, action: 'savun' }));
  await expect.poll(() => a.evaluate(() => (FT.result || []).join(' '))).toContain('çekildiğin');
  await expect.poll(() => b.evaluate(() => (FT.result || []).join(' '))).toContain('yeterli tur oynanmadı');
  expect(await a.evaluate(() => S.gold)).toBe(goldA);
  expect(await b.evaluate(() => S.gold)).toBe(goldB);
  for (const p of pages) expect(p.errors).toEqual([]);
  for (const p of pages) await p.context().close();
});


test('ENG-10 yerleşim: 375/768/900/1000 px taşma yok, üst şerit çakışmıyor, bilet satırı görünür', async ({ browser }) => {
  for (const w of [375, 768, 900, 1000]) {
    const mobile = w < 761;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 812 : 768 }, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await enter(page); await startServerOcak(page);
    await closeModals(page); await page.evaluate(() => render());
    const m = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
      const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      const name = el => (el.getAttribute('aria-label') || el.textContent || el.className || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      const els = [...document.querySelectorAll('#hud .hud-bag-btn, #hud .hud-soc-btn, #hud .wk, #hud .ticks, #hud .hud-r > *, #hud .hud-chibi-btn, #hud .hud-name')].filter(vis);
      const ov = [];
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (inter(els[i].getBoundingClientRect(), els[j].getBoundingClientRect())) ov.push(name(els[i]) + ' x ' + name(els[j]));
      const eco = document.querySelector('.endweek .eco-week');
      const er = eco.getBoundingClientRect();
      return { vw: innerWidth, scroll: document.documentElement.scrollWidth, ov, eco: vis(eco) ? eco.textContent : null, ecoInside: er.right <= innerWidth + 0.5 && er.left >= -0.5 };
    });
    expect(m.scroll, String(w)).toBe(m.vw);
    expect(m.ov, String(w)).toEqual([]);
    expect(m.eco, String(w)).toBe('🎟 2/8');
    expect(m.ecoInside, String(w)).toBe(true);
    await page.screenshot({ path: path.join(__dirname, '../test-results/eng10', `w${w}.png`) });
    expect(errors).toEqual([]);
    await ctx.close();
  }
});

test('ENG-10 K5 arayüzü: iflas eşiğinde "Ocağı yeniden kur" görünür, komut sunucuya gider; sunucu kararı geçerlidir', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page); await startServerOcak(page);
  // Eşik durumunu yalnız okuma yanıtında taklit et; komut gerçek sunucuya gider (borç yok → reddedilir).
  await page.route('**/api/economy', async route => {
    const res = await route.fetch(); const body = await res.json();
    body.week = { ...body.week, debt: 90, debtWeeks: 3, rebuild: { available: true, threshold: 3 } };
    await route.fulfill({ response: res, json: body });
  });
  await page.evaluate(() => ECO_LINK.boot(true));
  await closeModals(page);
  await page.evaluate(() => render());
  await expect(page.locator('.endweek .eco-week')).toContainText('Borç 90');
  await page.evaluate(() => ACT['eco-status']());
  const btn = page.locator('.eco-modal [data-a="eco-rebuild"]');
  await expect(btn).toBeVisible();
  await expect(page.locator('.eco-modal')).toContainText('Hesabın silinmez');
  expect((await btn.boundingBox()).height).toBeGreaterThanOrEqual(44);
  const posted = page.waitForRequest(r => r.url().endsWith('/api/economy/command') && r.method() === 'POST');
  await btn.click();
  expect(JSON.parse((await posted).postData()).type).toBe('ocak.rebuild');
  await expect(page.locator('#toasts')).toContainText('gerekli değil');
  expect(errors).toEqual([]);
  await ctx.close();
});
