// Zindan/Topçu giriş kapısı: Kızıl Taç şartı kaldırıldı; yalnız Ebedi Gençlik İksirli yavru gerekir.
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
test('Zindan kapısı: Kızıl Taç gerekmez; iksirli yavru yeterli, yoksa kapalı ve metinde Kızıl Taç yok', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  const st0 = await page.evaluate(() => ({ champ: hasKizilTacChamp(), baby: !!getEternalBabyDragon(), can: canEnterZindanOrTopcu() }));
  expect(st0).toEqual({ champ: false, baby: false, can: false });
  // Kapalı ekran: Kızıl Taç şartı/düğmesi yok
  await page.evaluate(() => { UI.view = 'zindan'; render(); });
  const txt = await page.locator('#stage').innerText();
  expect(txt).not.toMatch(/Kızıl Taç/);
  expect(txt).toMatch(/Sonsuz Gençlik İksiri/);
  await expect(page.locator('#stage [data-a="gate-go-arena"]')).toHaveCount(0);
  // Kapı penceresi tek şart
  await page.evaluate(() => showZindanGateModal());
  const modal = await page.locator('.gate-modal').innerText();
  expect(modal).not.toMatch(/Kızıl Taç/);
  expect(await page.locator('.gate-modal .gate-cond-grid > div').count()).toBe(1);
  await page.evaluate(() => closeModal());
  // İksirli yavru var, şampiyonluk yok → açık
  await page.evaluate(() => { const d = S.dragons[0]; d.stage = 'yavru'; d.eternalYouth = true; });
  const st1 = await page.evaluate(() => ({ champ: hasKizilTacChamp(), baby: !!getEternalBabyDragon(), can: canEnterZindanOrTopcu() }));
  expect(st1).toEqual({ champ: false, baby: true, can: true });
  await page.evaluate(() => { UI.view = 'zindan'; render(); });
  expect(await page.locator('#stage').innerText()).not.toMatch(/MÜHÜRLÜ/);
  expect(errors).toEqual([]);
  await ctx.close();
});
