// ENG-08 · Ocak Sandığı uçtan uca (tek hesap, tek sunucu, SQLite). Gerçek sunucu envanteri; sahte veri yok.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events'); const crypto = require('node:crypto');
const children = []; let dir, url;
async function startServer(label) {
  const child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], { env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, label), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  children.push(child); child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); return 'http://127.0.0.1:' + info.port;
}
// Güvenilir test kurulumu: başlangıç hesabını karışık kaynaklı hale getirir (Kor ve biber bağlı kalır).
function seedMixed(filename, accountId) {
  const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(filename);
  try {
    const row = db.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(accountId);
    const g = JSON.parse(row.game_json);
    g.eggs[0].funding = 'earned';
    const uid = g.uid++; g.inv.push({ uid, id: 'til1', funding: 'earned', assetId: `${accountId}:item:${uid}` });
    g.foodSources.balik = { bound: 1, unknown: 0, earned: 1 };
    db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), accountId);
    return { egg: g.eggs[0].assetId, item: `${accountId}:item:${uid}`, kor: g.dragons[0].assetId };
  } finally { db.close(); }
}
test.beforeAll(async () => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-sandik-')); url = await startServer('world'); });
test.afterAll(async () => { for (const child of children) if (child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); } if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

async function layout(page) {
  return page.evaluate(() => {
    const d = document.querySelector('dialog.sandik'), r = d.getBoundingClientRect();
    const small = [...d.querySelectorAll('button,select,input')].filter(el => el.offsetParent !== null).map(el => { const b = el.getBoundingClientRect(); return { t: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30), w: b.width, h: b.height }; }).filter(b => b.w < 44 || b.h < 44);
    const h2 = d.querySelector('#sandik-title').getBoundingClientRect(), head = d.querySelector('.sandik-head').getBoundingClientRect();
    const content = d.querySelector('.sandik-body, .sandik-empty'); const c = content ? content.getBoundingClientRect() : { top: head.bottom };
    const te = document.querySelector('.trade-entry'), tb = te.getBoundingClientRect();
    const hit = document.elementFromPoint(tb.left + tb.width / 2, tb.top + tb.height / 2);
    const tabs = d.querySelector('.sandik-tabs');
    return { left: r.left, right: r.right, width: r.width, vw: innerWidth, dScroll: d.scrollWidth, dClient: d.clientWidth, docScroll: document.documentElement.scrollWidth,
      small, titleInsideHead: h2.bottom <= head.bottom + 1, headAboveContent: head.bottom <= c.top + 1,
      tradeEntryCovered: !!(hit && hit.closest('dialog.sandik')),
      tabs: tabs ? { scroll: tabs.scrollWidth, client: tabs.clientWidth, overflowX: getComputedStyle(tabs).overflowX, more: tabs.parentElement.classList.contains('more-r') } : null };
  });
}
function expectClean(l, w) {
  expect(l.width).toBeLessThanOrEqual(w);
  expect(l.left).toBeGreaterThanOrEqual(0); expect(l.right).toBeLessThanOrEqual(l.vw);
  expect(l.dScroll).toBeLessThanOrEqual(l.dClient + 1);
  expect(l.docScroll).toBeLessThanOrEqual(l.vw + 1);
  expect(l.small).toEqual([]);
  expect(l.titleInsideHead).toBe(true);
  expect(l.headAboveContent).toBe(true);
  expect(l.tradeEntryCovered).toBe(true);
}

test('Ocak Sandığı: sunucu envanteri, filtre/arama, detay, Bedestende Sat ön seçimi, mobil ve masaüstü', async ({ browser }, testInfo) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();

  // 1) Sunucu hesabı yokken açık boş durum; yerel S (Kor, yumurta) sandıkta görünmez.
  await page.locator('.mob-hub-btn').click();
  await page.getByRole('button', { name: /Ocak Sandığı'nı aç/ }).click();
  const dlg = page.locator('dialog.sandik');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('heading', { name: 'Ocak Sandığı' })).toBeVisible();
  await expect(dlg.locator('.sandik-empty')).toContainText('Sunucu envanterin henüz oluşturulmadı');
  await expect(dlg.locator('.sandik-card')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('mobile-empty.png') });
  await dlg.getByRole('button', { name: "Ocak Sandığı'nı kapat" }).click();
  await expect(dlg).toBeHidden();

  // 2) Sunucu hesabını hazırla (mevcut game.start komutu) ve test kaynağı ver.
  const eco = await (await page.request.get(url + '/api/economy')).json();
  const start = await page.request.post(url + '/api/economy/command', { data: { requestId: crypto.randomUUID(), expectedVersion: eco.economy ? eco.economy.version : 0, type: 'game.start', args: {} } });
  expect(start.ok()).toBeTruthy();
  const accountId = (await (await page.request.get(url + '/api/economy')).json()).economy.accountId;
  const ids = seedMixed(path.join(dir, 'economy', 'economy.sqlite'), accountId);

  await page.locator('.mob-hub-btn').click();
  await page.getByRole('button', { name: /Ocak Sandığı'nı aç/ }).click();
  await expect(dlg.locator('.sandik-card')).toHaveCount(5); // Kor, yumurta, muska, taze balık, ateş biberi
  await expect(dlg.locator('.sandik-tab')).toHaveText([/Tümü\s*5/, /Ejderhalar\s*1/, /Yumurtalar\s*1/, /Eşyalar\s*1/, /Yem & İksir\s*2/]);
  await page.waitForTimeout(300);
  let l = await layout(page);
  await page.screenshot({ path: testInfo.outputPath('mobile-list.png') });
  expectClean(l, 390);
  expect(l.tabs.overflowX).toBe('auto');
  if (l.tabs.scroll > l.tabs.client) expect(l.tabs.more).toBe(true); // taşıyorsa görünür belirteç
  testInfo.annotations.push({ type: 'mobile-layout', description: JSON.stringify(l) });
  console.log('mobile-layout', JSON.stringify(l));

  // 3) Filtre + arama + sıralama
  await dlg.getByRole('tab', { name: /Ejderhalar/ }).click();
  await expect(dlg.locator('.sandik-card')).toHaveCount(1);
  await expect(dlg.locator('.sandik-card')).toContainText('Kor');
  await dlg.getByRole('tab', { name: /Tümü/ }).click();
  await dlg.locator('#sandik-q').fill('muska');
  await expect(dlg.locator('.sandik-card')).toHaveCount(1);
  await expect(dlg.locator('.sandik-card')).toContainText('Bereket Muskası');
  await dlg.locator('#sandik-q').fill('');
  await dlg.locator('#sandik-sort').selectOption('ad');
  await expect(dlg.locator('.sandik-name').first()).toHaveText('Ateş Biberi');
  const names = await dlg.locator('.sandik-name').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'tr')));

  // 4) Bound kalem: kısayol yok, açıklama var.
  await dlg.locator('.sandik-card', { hasText: 'Kor' }).click();
  await expect(dlg.locator('.sandik-detail h3')).toHaveText('Kor');
  await expect(dlg.locator('.sandik-detail')).toContainText('Hesaba bağlı · takas edilemez');
  await expect(dlg.getByRole('button', { name: /Bedesten'de satışa çıkar/ })).toHaveCount(0);
  await expect(dlg.locator('.sandik-status')).toContainText('satış ve takas kapalı');
  await expect(dlg.locator('.sandik-list')).toBeHidden(); // mobilde detay listenin yerini alır
  l = await layout(page); expectClean(l, 390);
  await page.screenshot({ path: testInfo.outputPath('mobile-detail-bound.png') });
  await dlg.getByRole('button', { name: 'Listeye dön' }).click();

  // 5) Yem: kısmen kazanılmış; 1 adet satılabilir.
  await dlg.locator('.sandik-card', { hasText: 'Taze Balık' }).click();
  await expect(dlg.locator('.sandik-detail')).toContainText('Kısmen takas edilebilir');
  await expect(dlg.locator('.sandik-status')).toContainText('1 adet satışa ya da takasa hazır');
  await dlg.getByRole('button', { name: 'Listeye dön' }).click();

  // 6) Rezerve kalem: gerçek Bedesten ilanı (POST /api/market) → kısayol kalkar.
  const listed = await page.request.post(url + '/api/market', { data: { op: 'list', requestId: crypto.randomUUID(), kind: 'item', assetId: ids.item, quantity: 1, unitPrice: 50 } });
  expect(listed.ok()).toBeTruthy();
  await dlg.getByRole('button', { name: 'Sunucudan yenile' }).click();
  await dlg.locator('.sandik-card', { hasText: 'Bereket Muskası' }).click();
  await expect(dlg.locator('.sandik-status')).toContainText("Bedesten'de ilanda");
  await expect(dlg.getByRole('button', { name: /Bedesten'de satışa çıkar/ })).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Listeye dön' }).click();

  // 7) Earned yumurta → "Bedestende Sat" → Bedesten "Satışa Çıkar" formu bu kalem seçili açılır.
  await dlg.locator('.sandik-card', { hasText: 'Yumurtası' }).click();
  await expect(dlg.locator('.sandik-detail')).toContainText('Kazanılmış · takas edilebilir');
  await expect(dlg.getByRole('button', { name: 'Takas ekranını aç' })).toBeVisible();
  l = await layout(page); expectClean(l, 390);
  await page.screenshot({ path: testInfo.outputPath('mobile-detail-earned.png') });
  await dlg.getByRole('button', { name: /Bedesten'de satışa çıkar/ }).click();
  await expect(dlg).toBeHidden();
  await expect(page.locator('.v-bedesten')).toBeVisible();
  await expect(page.locator('.v-bedesten .vtab.on')).toContainText('Satışa Çıkar');
  const picked = page.locator('.v-bedesten .gcard.bed-pick');
  await expect(picked).toHaveCount(1);
  await expect(picked.locator(`[data-bed="price:egg:${ids.egg}"]`)).toBeFocused();
  await expect(picked.locator('[data-a="bed-post-egg"]')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('mobile-bedesten-preselect.png') });

  // 8) Masaüstü 1024×768: Çanta → Ocak Sandığı, liste + detay yan yana, taşma yok.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: 'Çarşıya dön' }).click();
  await page.locator('.hud-bag-btn').click();
  await page.getByRole('button', { name: /Ocak Sandığı'nı aç/ }).click();
  await expect(dlg.locator('.sandik-card')).toHaveCount(5);
  await dlg.locator('.sandik-card', { hasText: 'Yumurtası' }).click();
  await expect(dlg.locator('.sandik-list')).toBeVisible();
  await expect(dlg.locator('.sandik-detail')).toBeVisible();
  await page.waitForTimeout(300);
  l = await layout(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-list-detail.png') });
  expectClean(l, 1024);
  // "Takasa ekle" mevcut takas ekranına gider.
  await dlg.getByRole('button', { name: 'Takas ekranını aç' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.locator('.trade-panel')).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});
