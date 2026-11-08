// ENG-09 · Yerleşim denetimi (O-3 yatay taşma, O-4 Takas düğmesi, O-5 Bedesten 44 px, O-6 üst şerit 1024).
// Yalnız ölçüm; tek sunucu, SQLite, geçici dizin.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
let child, dir, url;
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-layout-'));
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
async function enter(page) {
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
}
const measure = page => page.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; };
  const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.className || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const te = document.querySelector('.trade-entry'), tb = te.getBoundingClientRect();
  // Kaydırma başında: HUD, alt gezinti, Ocak'ın üst denetimleri (QA: "Harita Görünümü") ve Bedesten metni/düğmeleri
  // Takas düğmesinin altında kalmamalı. Kaydırılan listeler için aşağıdaki endHits denetimi geçerlidir.
  const top = [...document.querySelectorAll('#stage button')].filter(el => /Harita Görünümü|Nöbet Dağıt/.test(el.textContent));
  const fixedHits = [...document.querySelectorAll('#hud *, #dock *, .v-bedesten p, .v-bedesten button'), ...top]
    .filter(el => vis(el) && inter(tb, el.getBoundingClientRect())).map(name);
  const stage = document.getElementById('stage');
  stage.scrollTop = stage.scrollHeight;
  const endHits = [...stage.querySelectorAll('button,[data-a],p,small,h3')].filter(el => vis(el) && inter(tb, el.getBoundingClientRect())).map(name);
  stage.scrollTop = 0;
  const bed = document.querySelector('.v-bedesten');
  const small = bed ? [...bed.querySelectorAll('button,[role=tab]')].filter(vis).map(el => ({ t: name(el), h: Math.round(el.getBoundingClientRect().height) })).filter(b => b.h < 44) : [];
  const tabs = bed && bed.querySelector('.vtabs');
  const hudEls = [...document.querySelectorAll('#hud .hud-bag-btn, #hud .hud-soc-btn, #hud .wk, #hud .ticks, #hud .hud-r > *, #hud .hud-chibi-btn, #hud .hud-name')].filter(vis);
  const hudOverlap = [];
  for (let i = 0; i < hudEls.length; i++) for (let j = i + 1; j < hudEls.length; j++) if (inter(hudEls[i].getBoundingClientRect(), hudEls[j].getBoundingClientRect())) hudOverlap.push(name(hudEls[i]) + ' x ' + name(hudEls[j]));
  return { vw: innerWidth, docScroll: document.documentElement.scrollWidth, bodyMargin: getComputedStyle(document.body).marginLeft,
    fixedHits, endHits, small, tabs: tabs ? { scroll: tabs.scrollWidth, client: tabs.clientWidth, ox: getComputedStyle(tabs).overflowX } : null, hudOverlap };
});

test('ENG-09 yerleşim: 390×844 taşma yok, Takas düğmesi içeriği örtmüyor, Bedesten hedefleri ≥ 44 px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  const ocak = await measure(page);
  expect(ocak.bodyMargin).toBe('0px');
  expect(ocak.vw).toBe(390); expect(ocak.docScroll).toBe(ocak.vw);
  expect(ocak.fixedHits).toEqual([]);
  expect(await page.locator('#stage button', { hasText: 'Harita Görünümü' }).count()).toBeGreaterThan(0);
  expect(ocak.endHits).toEqual([]);
  for (const tab of ['vitrini', 'ilanver', 'ilanlarim']) {
    await page.evaluate(t => { UI.view = 'pazar'; UI.stall = 'bedesten'; UI.vendor = 'bedesten'; UI.bedTab = t; render(); }, tab);
    await expect(page.locator('.v-bedesten .vtabs')).toBeVisible();
    const bed = await measure(page);
    expect(bed.docScroll, tab).toBe(bed.vw);
    expect(bed.fixedHits, tab).toEqual([]);
    expect(bed.small, tab).toEqual([]);
    // Sekme satırı taşarsa yatay kaydırılabilir kalır (yalnız yükseklik değişti).
    expect(['auto', 'scroll']).toContain(bed.tabs.ox);
  }
  // Takas düğmesi yeni konumunda da aynı diyaloğu açar.
  await page.locator('.trade-entry').click();
  await expect(page.locator('dialog.trade-panel')).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('ENG-09 yerleşim: 1024×768 taşma yok, üst şerit öğeleri çakışmıyor', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  const m = await measure(page);
  expect(m.docScroll).toBe(1024);
  expect(m.hudOverlap).toEqual([]);
  await page.evaluate(() => { UI.view = 'pazar'; UI.stall = 'bedesten'; UI.vendor = 'bedesten'; UI.bedTab = 'vitrini'; render(); });
  await expect(page.locator('.v-bedesten .vtabs')).toBeVisible();
  expect((await measure(page)).docScroll).toBe(1024);
  expect(errors).toEqual([]);
  await ctx.close();
});
