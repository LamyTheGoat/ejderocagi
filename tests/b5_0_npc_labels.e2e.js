// B5-0: NPC etiketleri ve "katıldı" yalanı yok (raid lobisi). Tek sunucu, SQLite, geçici dizin.
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
test('B5-0: NPC yoldaş etiketli; çevrimdışı arkadaş yuvayı doldurmaz; NPC arkadaş "NPC arkadaş"; hub akranları npc:true', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await enter(page);
  await page.evaluate(() => { window.canEnterZindanOrTopcu = () => true; openAnimTestRoom({ raidId: 'sahmeran', difficulty: 'zor', screen: 'lobby' }); });
  await expect(page.locator('[data-shm-raid-add-bot="1"]')).toContainText('NPC Yoldaş Ekle');
  await page.locator('[data-shm-raid-add-bot="1"]').click();
  await expect(page.locator('.shm-mm-slot-info b', { hasText: '(NPC yoldaş)' })).toHaveCount(1);
  const r = await page.evaluate(() => {
    const fn = (typeof ACT !== 'undefined' && ACT['soc-pick-choose']) || SOC_ACT['soc-pick-choose'];
    const toasts = []; const ot = window.toast; window.toast = m => toasts.push(String(m).replace(/<[^>]+>/g, ''));
    SHM.raidPartySlots = [null, null];
    SOC_UI.pick = 'raid:1'; fn({ dataset: { h: '@kimse_yok' } });
    const offline = SHM.raidPartySlots[0];
    SOC_UI.pick = 'raid:2'; fn({ dataset: { h: '@kuzey_ruzgari' } });
    const npc = SHM.raidPartySlots[1] && { kind: SHM.raidPartySlots[1].kind, npc: SHM.raidPartySlots[1].npc };
    window.toast = ot;
    const peers = genHubPeers().map(p => [p.handle, p.npc, p.verified]);
    return { offline, npc, toasts, peers, joined: toasts.some(t => /katıldı/.test(t)) };
  });
  expect(r.offline).toBeNull();
  expect(r.npc).toEqual({ kind: 'peer', npc: true });
  expect(r.joined).toBe(false);
  expect(r.toasts.some(t => /çevrimdışı/.test(t))).toBe(true);
  for (const [h, npc, verified] of r.peers) { expect(npc, h).toBe(true); expect(verified, h).toBe(false); }
  expect(errors).toEqual([]);
  await ctx.close();
});
