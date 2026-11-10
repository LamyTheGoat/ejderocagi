// Mobil UX (U0): 390×844'te ekran taraması. Dokunma hedefi < 44 px ve yazı < 12 px SAYISI baz çizgiyi (tests/mobile_ux_baseline.json)
// AŞAMAZ (ratchet; yeni ekran için 0). Ayrıca 5 sekmeli gezinme, alt sekme çubuğu, "Haftayı bitir" görünürlüğü ve ?mux=0 kapatması.
// Yalnız ölçüm; tek sunucu, SQLite, geçici dizin. Oyun durumuna yalnız UI.view atar (yerel test).
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, 'mobile_ux_baseline.json'), 'utf8'));
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-mux-'));
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
async function enter(page, query = '') {
  await page.goto(url + query);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
}
const settle = page => page.waitForTimeout(500); // mux_fix.js requestAnimationFrame ile çalışır
const audit = (page, sel) => page.evaluate(selector => {
  const root = document.querySelector(selector) || document.body;
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.right > 0 && r.left < innerWidth; };
  const nm = e => (e.dataset && e.dataset.a || e.className || e.tagName).toString().slice(0, 30);
  const small = [...root.querySelectorAll('button,a[href],[data-a],input,select,textarea,[role=button],[role=tab]')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map(nm);
  const txt = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement; if (!p || !vis(p)) continue; if (parseFloat(getComputedStyle(p).fontSize) < 11.95) txt.push(nm(p) + ':' + n.textContent.trim().slice(0, 12)); }
  return { small, txt, docScroll: document.documentElement.scrollWidth, vw: innerWidth };
}, sel);

const VIEWS = ['ocak', 'ahir', 'yuva', 'arena', 'sefer', 'pazar', 'meydan', 'kasaba', 'zindan'];

test('U0 · ekranlar: 44 px ve 12 px sayıları baz çizgiyi aşmaz, yatay taşma yok', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  await expect(page.locator('html.mux')).toHaveCount(1);
  for (const target of [['#hud', 'hud'], ['#dock', 'dock']]) {
    await settle(page);
    const r = await audit(page, target[0]);
    expect(r.small.length, `${target[1]} 44px: ${r.small}`).toBeLessThanOrEqual(BASE[target[1]].small);
    expect(r.txt.length, `${target[1]} 12px: ${r.txt}`).toBeLessThanOrEqual(BASE[target[1]].txt);
  }
  for (const v of VIEWS) {
    await page.evaluate(view => { UI.view = view; render(); }, v);
    await settle(page);
    const r = await audit(page, '#stage');
    const b = BASE[v] || { small: 0, txt: 0 };
    expect(r.small.length, `${v} 44px: ${r.small}`).toBeLessThanOrEqual(b.small);
    expect(r.txt.length, `${v} 12px: ${r.txt}`).toBeLessThanOrEqual(b.txt);
    expect(r.docScroll, `${v} taşma`).toBe(r.vw);
  }
  // Modaller
  for (const [name, open, sel] of [['bag', () => bagModal(), '.modal'], ['chibi', () => ACT['chibi-open'](), '.modal']]) {
    await page.evaluate(`(${open.toString()})()`);
    await settle(page);
    const r = await audit(page, sel);
    const b = BASE[name] || { small: 0, txt: 0 };
    expect(r.small.length, `${name} 44px: ${r.small}`).toBeLessThanOrEqual(b.small);
    expect(r.txt.length, `${name} 12px: ${r.txt}`).toBeLessThanOrEqual(b.txt);
    await page.evaluate(() => closeModal());
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test('U3 · 5 sekmeli gezinme, alt sekmeler ve Haftayı bitir görünürlüğü', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  const tabs = page.locator('#dock .mux-tab');
  await expect(tabs).toHaveCount(5);
  expect(await tabs.allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('Ocak'), expect.stringContaining('Ejderhalar'), expect.stringContaining('Sefer'), expect.stringContaining('Pazar'), expect.stringContaining('Meydan')]));
  for (let i = 0; i < 5; i++) { const b = await tabs.nth(i).boundingBox(); expect(b.height, `sekme ${i}`).toBeGreaterThanOrEqual(48); expect(b.width).toBeGreaterThanOrEqual(44); }
  // UI.view anahtarları değişmedi
  const keys = await page.evaluate(() => Object.keys(VIEWS).sort());
  for (const k of ['ocak', 'ahir', 'yuva', 'arena', 'sefer', 'pazar', 'meydan', 'kasaba', 'zindan']) expect(keys).toContain(k);
  // Ejderhalar → Ahır/Yuva alt sekmeleri
  await tabs.nth(1).click();
  expect(await page.evaluate(() => UI.view)).toBe('ahir');
  await expect(page.locator('#stage .mux-sub .mux-seg')).toHaveCount(2);
  await page.locator('#stage .mux-sub .mux-seg', { hasText: 'Yuva' }).click();
  expect(await page.evaluate(() => UI.view)).toBe('yuva');
  // Haftayı bitir yalnız Ocak/Ahır/Yuva'da görünür
  await expect(page.locator('#dock .endweek')).toBeVisible();
  await page.evaluate(() => { UI.view = 'pazar'; render(); });
  await expect(page.locator('#dock .endweek')).toBeHidden();
  await page.evaluate(() => { UI.view = 'ocak'; render(); });
  await expect(page.locator('#dock .endweek')).toBeVisible();
  // Meydan grubunda Sosyal sekmesi bulunur
  await tabs.nth(4).click();
  await expect(page.locator('#stage .mux-sub .mux-seg', { hasText: 'Sosyal' })).toHaveCount(1);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('U1 · ?mux=0 eski görünümü korur (html.mux yok, 5 sekmeli gezinme gizli)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await enter(page, '?mux=0');
  await expect(page.locator('html.mux')).toHaveCount(0);
  await expect(page.locator('#dock .mux-tab').first()).toBeHidden();
  await expect(page.locator('#stage .mux-sub')).toHaveCount(0);
  await ctx.close();
});

test('U1 · masaüstü (1280 px) değişmez: html.mux yok', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await enter(page);
  await expect(page.locator('html.mux')).toHaveCount(0);
  await expect(page.locator('#dock .mux-tab').first()).toBeHidden();
  await ctx.close();
});

test('Kusurlar: süs çubuğu HUD altına binmez, modal perdesi opak, Bedesten sekmeleri kesilmez, bildirimler altta', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  await settle(page);
  // K1: .scroll-card relative; ::before üst çubuğu kartın kendi üstünde (sayfa başında değil)
  const k1 = await page.evaluate(() => {
    const g = document.querySelector('.scroll-card.goals'); if (!g) return null;
    const b = g.getBoundingClientRect(), pb = getComputedStyle(g, '::before');
    return { pos: getComputedStyle(g).position, beforeTop: parseFloat(pb.top), cardTop: b.top, hudBottom: document.getElementById('hud').getBoundingClientRect().bottom };
  });
  expect(k1.pos).toBe('relative');
  // K2: modal perdesi neredeyse opak
  await page.evaluate(() => bagModal()); await settle(page);
  const alpha = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.scrim')).backgroundColor.split(',')[3]));
  expect(alpha).toBeGreaterThanOrEqual(0.9);
  await page.evaluate(() => closeModal());
  // K3: Bedesten sekmeleri sığar (yatay kesilme yok)
  await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'bedesten'; UI.vendor = 'bedesten'; UI.bedTab = 'vitrini'; render(); }); await settle(page);
  const k3 = await page.evaluate(() => { const t = document.querySelector('.v-bedesten .vtabs'); return t ? { sw: t.scrollWidth, cw: t.clientWidth } : null; });
  expect(k3.sw).toBeLessThanOrEqual(k3.cw + 1);
  // K4: bildirimler altta
  const k4 = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('toasts')).top));
  expect(k4).toBeGreaterThan(400); // üstte (70 px) değil, alt gezinmenin üstünde
  expect(errors).toEqual([]);
  await ctx.close();
});

test('Yapısal ekranlar: Yuva boş durum, Ocak özeti, Pazar/Bedesten, Çanta sıfırlar, Sosyal ⋯, çizgi roman Atla, Meydan tek gezinme', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  const go = async v => { await page.evaluate(view => { UI.view = view; UI.stall = null; render(); }, v); await settle(page); };
  // Yuva: kuluçka yok
  await go('yuva');
  await expect(page.locator('.mux-cta button')).toContainText('160 altın');
  await expect(page.locator('.mux-checks li')).toHaveCount(3);
  expect(await page.locator('.bslot .why').first().textContent()).toMatch(/Kuluçka Ocağı kur/);
  await page.locator('.mux-cta button').click(); // Ocak'ta boş arsa seçili açılır
  expect(await page.evaluate(() => UI.view)).toBe('ocak');
  expect(await page.evaluate(() => UI.tile)).not.toBeNull();
  // Ocak: boş arsa kartları tek özet satır
  await go('ocak');
  await expect(page.locator('.mob-bldg-grid .mux-only', { hasText: 'boş arsa' })).toBeVisible();
  expect(await page.locator('.mob-bldg-grid .mux-hide:visible').count()).toBe(0);
  // Pazar: Bedesten ilk
  await go('pazar');
  expect(await page.evaluate(() => { const c = [...document.querySelectorAll('.mob-list-cards .mob-dir-card')]; const top = c.map(e => [e, e.getBoundingClientRect().top]).sort((a, b) => a[1] - b[1])[0][0]; return top.className; })).toMatch(/s-bedesten/);
  // Meydan: tekrarlayan çip şeridi gizli
  await go('meydan');
  await expect(page.locator('.city-sub-bar.avlu-quick-tabs')).toBeHidden();
  // Çanta: sıfırlar gizli, düğmeyle açılır
  await go('ocak');
  await page.evaluate(() => bagModal()); await settle(page);
  expect(await page.locator('.bag-cell.zero:visible').count()).toBe(0);
  await page.locator('[data-a="mux-bag-zeros"]').click(); await settle(page);
  expect(await page.locator('.bag-cell.zero:visible').count()).toBeGreaterThan(0);
  await page.evaluate(() => closeModal());
  // Sosyal: satırda Mesaj + ⋯; ⋯ ile diğerleri
  await page.evaluate(() => (ACT['soc-open'] || ACT['social-drawer-open'])({ dataset: {} })); await settle(page);
  const row = page.locator('.soc-frow').first();
  expect(await row.locator('.soc-fbtns > *:visible').count()).toBe(2);
  await row.locator('[data-a="mux-soc-more"]').click();
  expect(await row.locator('.soc-fbtns > *:visible').count()).toBeGreaterThan(3);
  await page.evaluate(() => { SOC_UI.open = false; document.querySelectorAll('.soc-drawer,.soc-scrim,.soc-wrap').forEach(e => e.remove()); });
  // Çizgi roman: Atla son sayfaya götürür, seçenekler korunur
  await page.evaluate(() => comicModal({ id: 'demirhan', title: 'D', opts: [{ t: 'Devam et', fx: () => null }] }, 0)); await settle(page);
  await expect(page.locator('[data-a="comic-skip"]')).toBeVisible();
  await page.locator('[data-a="comic-skip"]').click();
  expect(await page.evaluate(() => CUR_COMIC.pg === CUR_COMIC.pages.length - 1)).toBe(true);
  await expect(page.locator('.vopt')).toHaveCount(1);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('Yapısal ekranlar masaüstünde görünmez (.mux-only gizli, kartlar eski)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await enter(page);
  await page.evaluate(() => { UI.view = 'yuva'; render(); });
  await expect(page.locator('.mux-cta')).toBeHidden();
  await expect(page.locator('.mux-checks')).toBeHidden();
  await page.evaluate(() => { UI.view = 'ocak'; render(); });
  await expect(page.locator('.mob-bldg-grid .mux-only').first()).toBeHidden();
  await ctx.close();
});

test('Ahır: 3 temel eylem + Daha; Daha diğer dördünü açar', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  await page.evaluate(() => { UI.view = 'ahir'; render(); }); await settle(page);
  const vis = () => page.locator('.st-ahir aside.actions > *:visible').count();
  expect(await vis()).toBe(4); // Antrenman, Dinlen, İkram, Daha
  await page.locator('[data-a="mux-acts-more"]').click();
  expect(await vis()).toBe(8); // 7 eylem + Daha
  expect(errors).toEqual([]);
  await ctx.close();
});

test('Eklenenler: Sefer kilitli grup, Çanta araması, üst barda "Hafta" etiketi', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  await expect(page.locator('#hud .wk')).toContainText('Hafta');
  await page.evaluate(() => { UI.view = 'sefer'; render(); }); await settle(page);
  const closed = await page.locator('.sefer-reg-row.closed').count();
  expect(closed).toBeGreaterThan(0);
  expect(await page.locator('.sefer-reg-row.closed:visible').count()).toBe(0);
  await expect(page.locator('.mux-locked-toggle')).toContainText(`Kilitli bölgeler (${closed})`);
  await page.locator('.mux-locked-toggle').click();
  expect(await page.locator('.sefer-reg-row.closed:visible').count()).toBe(closed);
  // Çanta araması
  await page.evaluate(() => bagModal()); await settle(page);
  await page.locator('[data-a="mux-bag-zeros"]').click(); await settle(page);
  const total = await page.locator('.bag-cell:visible').count();
  await page.locator('#bag-search').fill('taze');
  const hit = await page.locator('.bag-cell:visible').count();
  expect(hit).toBeGreaterThan(0); expect(hit).toBeLessThan(total);
  await page.locator('#bag-search').fill('');
  expect(await page.locator('.bag-cell:visible').count()).toBe(total);
  expect(errors).toEqual([]);
  await ctx.close();
});
