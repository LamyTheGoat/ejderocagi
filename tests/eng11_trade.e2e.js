// ENG-11 · Takas girişleri ve yeni takas ekranı (tek sunucu, SQLite, geçici dizin; gerçek sunucu komutları).
// Denetlenen: kalıcı Takas düğmesi yok; takas arkadaş listesinden ve oyuncu profilinden açılır; sıfır adet ve ham kimlik
// görünmez; 375/768/1000 px yatay taşma yok; dokunma hedefleri ≥ 44 px; Esc önce çekmeceyi, sonra pencereyi kapatır.
const { test, expect } = require('@playwright/test');
const { fork } = require('node:child_process'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { once } = require('node:events');
const SHOTS = path.join(__dirname, '..', 'test-results', 'eng11');
let child, dir, url;
test.use({ actionTimeout: 15000 });
test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng11-')); fs.mkdirSync(SHOTS, { recursive: true });
  child = fork('-e', [`const http=require('node:http');const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>{process.env.PUBLIC_URL='http://127.0.0.1:'+port;const {server}=require(${JSON.stringify(require.resolve('../server'))});process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});server.listen(port,'127.0.0.1',()=>process.send({port}));});});`], {
    env: { ...process.env, NODE_ENV: 'test', ECONOMY_BACKEND: 'sqlite', DATA_DIR: path.join(dir, 'world'), LOCAL_ECONOMY_DIR: path.join(dir, 'economy') }, silent: true });
  child.stdout.resume(); child.stderr.on('data', d => process.stderr.write(d));
  const [info] = await once(child, 'message'); url = 'http://127.0.0.1:' + info.port;
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.send('stop'); const [code] = await exited; expect(code).toBe(0); }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});
async function enterGame(page) {
  await page.goto(url);
  await page.getByRole('button', { name: /Yeni ocak kur/ }).click();
  await page.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await expect(page.locator('#hud')).not.toBeEmpty();
}
// Oturum kurulumu oyunla aynı Web Lock altında okunur (eşzamanlı ikinci misafir yaratılmasın).
const handleOf=async page=>{await page.waitForFunction(()=>typeof MP!=='undefined'&&MP.connected);return page.evaluate(()=>navigator.locks.request('eo-guest-bootstrap',()=>fetch('/api/session',{method:'POST',credentials:'same-origin'}).then(r=>r.json())).then(d=>d.handle));};
// Güvenilir test kurulumu: bir hesabı karışık kaynaklı yapar (Kor bağlı kalır; yumurta, eşya, balık kazanılmış; altın kazanılmış).
function seed(accountId) {
  const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(path.join(dir, 'economy', 'economy.sqlite'));
  try {
    const row = db.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(accountId);
    const g = JSON.parse(row.game_json);
    g.funds = { schema: 1, bound: 0, unknown: 0, earned: g.gold };
    for (const e of g.eggs) e.funding = 'earned';
    for (const id of ['til1', 'kin1']) { const uid = g.uid++; g.inv.push({ uid, id, funding: 'earned', assetId: `${accountId}:item:${uid}` }); }
    g.foodSources = Object.fromEntries(Object.entries(g.food).map(([k, n]) => [k, { bound: k === 'balik' ? 0 : n, unknown: 0, earned: k === 'balik' ? n : 0 }]));
    db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), accountId);
    return g;
  } finally { db.close(); }
}
const accountOf = page => page.evaluate(() => fetch('/api/trade/state', { credentials: 'same-origin' }).then(r => r.json()).then(d => d.accountId));
// 0 adetli satır, ham varlık kimliği ya da ham yiyecek anahtarı görünür metinde olmamalı.
async function noRawText(page) {
  const text = await page.locator('.trade-panel').innerText();
  expect(text).not.toMatch(/×\s*0\b/);
  expect(text).not.toMatch(/\b(e\d+|balik|biber|kar|mantar|yumru|zambak|ziyafet|genclik|til1|kin1|bound|earned|unknown)\b/);
  expect(text).not.toMatch(/:item:|:dragon:|:egg:/);
  expect(text).not.toContain('Sunucudan yenile');
  expect(text).not.toContain('Çevrimiçi oyuncular');
  return text;
}
async function layout(page) {
  return page.evaluate(() => {
    const d = document.querySelector('dialog.trade-panel'), r = d.getBoundingClientRect();
    const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const small = [...d.querySelectorAll('button,input,summary')].filter(vis).map(el => { const b = el.getBoundingClientRect(); return { t: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(b => b.w < 44 || b.h < 44);
    const over = [...d.querySelectorAll('*')].filter(vis).filter(el => { const b = el.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).map(el => el.className || el.tagName).slice(0, 5);
    const foot = d.querySelector('.tr-foot'), fb = foot && foot.getBoundingClientRect();
    return { vw: innerWidth, left: r.left, right: r.right, dScroll: d.scrollWidth, dClient: d.clientWidth, docScroll: document.documentElement.scrollWidth, small, over,
      footAtBottom: fb ? Math.abs(fb.bottom - r.bottom) < 2 : null };
  });
}
function expectClean(l) {
  expect(l.left).toBeGreaterThanOrEqual(0); expect(l.right).toBeLessThanOrEqual(l.vw + 0.5);
  expect(l.dScroll).toBeLessThanOrEqual(l.dClient + 1);
  expect(l.docScroll).toBeLessThanOrEqual(l.vw + 1);
  expect(l.over).toEqual([]);
  expect(l.small).toEqual([]);
}

test('ENG-11: girişler arkadaş listesi ve profil; sade takas ekranı; 375/768/1000 taşma yok', async ({ browser }) => {
  const ca = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const cb = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const a = await ca.newPage(), b = await cb.newPage();
  const errors = []; for (const p of [a, b]) p.on('pageerror', e => errors.push(String(e)));
  // Meydan akran listesi /api/sync + /api/state ile dolar; yeni ocak bunu ancak bağlantı tazelenince gönderir
  // (ENG-11 öncesi davranış, bkz. ENG11_DELIVERY açık işler). Test, iki tarafta bağlantıyı tazeler.
  await enterGame(b); await enterGame(a);
  const hbEarly = await handleOf(b);
  await b.evaluate(() => mpConnect());
  await expect.poll(() => b.evaluate(h => fetch('/api/state').then(r => r.json()).then(d => (d.peers || []).some(p => p.handle === h)), hbEarly)).toBe(true);

  // 1) Kalıcı yüzen Takas düğmesi yok; takas penceresi kendiliğinden açık değil.
  for (const p of [a, b]) { await expect(p.locator('.trade-entry')).toHaveCount(0); await expect(p.locator('dialog.trade-panel')).not.toBeVisible(); await expect(p.locator('.trade-pop')).toBeHidden(); }
  const [ha, hb] = [await handleOf(a), await handleOf(b)];

  // 2) Oyuncu profili (Meydan akran kartı): B'yi seç → "Takas teklif et".
  await a.evaluate(() => ACT.go({ dataset: { v: 'meydan' } }));
  await a.evaluate(() => mpConnect());
  const peer = a.locator('[data-a="hub-peer"]:visible', { hasText: hb }).first();
  await expect(peer).toBeVisible({ timeout: 20000 });
  await peer.click();
  const profileBtn = a.locator('.hub-peercard').getByRole('button', { name: hb + ' ile takas teklif et', exact: true });
  await expect(profileBtn).toBeVisible();
  await profileBtn.scrollIntoViewIfNeeded(); await a.screenshot({ path: path.join(SHOTS, '1000-00-profil-girisi.png') });
  // NPC muhafızların profilinde/arkadaş satırında sunucu takası yok.
  await profileBtn.click();
  await expect(a.locator('.trade-panel #trade-title')).toHaveText(hb + ' ile takas');
  await a.getByRole('button', { name: 'Takas hesabımı hazırla', exact: true }).click();
  await expect(a.getByTestId('server-gold')).toHaveText('420 altın');
  await a.keyboard.press('Escape'); await expect(a.locator('dialog.trade-panel')).not.toBeVisible();

  // 3) Arkadaş listesi (mobil): A'yı ekle → satırda "Takas teklif et". NPC arkadaş satırlarında yok.
  // Mobilde Sosyal'e Menü (Komuta Merkezi) → "Sosyal & Lonca" ile girilir (HUD düğmesi mobilde gizli).
  await b.locator('.mob-hub-btn').click();
  await b.getByRole('button', { name: /Sosyal & Lonca/ }).click();
  await expect(b.locator('.soc-drawer')).toBeVisible();
  await expect(b.locator('.soc-frow', { hasText: '@leydi_sureyya' }).locator('[data-trade-with]')).toHaveCount(0);
  await b.locator('#soc-add-in').fill(ha); await b.getByRole('button', { name: '➕ Arkadaş Ekle', exact: true }).first().click();
  await b.getByRole('button', { name: ha + ' ile takas teklif et', exact: true }).click();
  await expect(b.locator('.trade-panel #trade-title')).toHaveText(ha + ' ile takas');
  await b.getByRole('button', { name: 'Takas hesabımı hazırla', exact: true }).click();
  await expect(b.getByTestId('server-gold')).toHaveText('420 altın');
  await b.screenshot({ path: path.join(SHOTS, '375-01-baslat.png') });
  expectClean(await layout(b));

  // Kaynakları karıştır (test kurulumu), sonra davet → B kapalı penceredeyken bildirim → Gör → Kabul.
  const accA = await accountOf(a); const accB = await accountOf(b); seed(accA); seed(accB);
  await b.keyboard.press('Escape'); await expect(b.locator('dialog.trade-panel')).not.toBeVisible();
  await a.locator('.hub-peercard').getByRole('button', { name: hb + ' ile takas teklif et', exact: true }).click();
  await a.getByRole('button', { name: 'Takas daveti gönder', exact: true }).click();
  await expect(a.locator('.trade-panel')).toContainText('Davet gönderildi');
  await expect(b.locator('.trade-pop')).toContainText(ha + ' sana takas teklif ediyor');
  await b.screenshot({ path: path.join(SHOTS, '375-02-davet-bildirimi.png') });
  await b.locator('.trade-pop').getByRole('button', { name: 'Gör', exact: true }).click();
  await b.getByRole('button', { name: 'Kabul et', exact: true }).click();
  await expect(b.locator('#trade-gold')).toBeVisible();
  await expect(b.getByTestId('trade-mine')).toContainText('Henüz bir şey eklemedin');

  // 4) "Ekle" çekmecesi: uygunlar adla/ikonla, uygunsuzlar soluk + tek kelime neden; ham kimlik/0 adet yok.
  await b.getByRole('button', { name: '＋ Ekle', exact: true }).click();
  const drawer = b.locator('.tr-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.tr-pick[data-trade="toggle"]', { hasText: 'Bereket Muskası' })).toBeVisible();
  await expect(drawer.locator('.tr-pick[data-trade="toggle"]', { hasText: 'Yumurtası' })).toBeVisible();
  await expect(drawer).toContainText('Taze Balık');
  await drawer.locator('summary').click();
  await expect(drawer.locator('.tr-pick.off', { hasText: 'Kor' }).locator('.tr-why')).toHaveText('Hediye');
  await noRawText(b);
  await b.screenshot({ path: path.join(SHOTS, '375-03-ekle-cekmecesi.png') });
  expectClean(await layout(b));
  const picks = drawer.locator('.tr-pick[data-trade="toggle"]');
  const pickCount = await picks.count(); expect(pickCount).toBeGreaterThanOrEqual(3); // yumurta + 2 eşya
  await picks.nth(0).click(); await expect(picks.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await picks.nth(1).click();
  await drawer.getByRole('button', { name: 'Taze Balık bir artır', exact: true }).click();
  // Esc önce çekmeceyi kapatır, takas penceresi açık kalır.
  await b.keyboard.press('Escape'); await expect(drawer).toHaveCount(0); await expect(b.locator('dialog.trade-panel')).toBeVisible();
  await b.getByRole('button', { name: '10 altın artır', exact: true }).click();
  await b.getByRole('button', { name: '10 altın artır', exact: true }).click();
  await expect(b.locator('#trade-gold')).toHaveValue('20');
  await expect(b.getByTestId('trade-mine')).toContainText('Değişikliklerin henüz gönderilmedi');
  await expect(b.getByTestId('trade-mine').locator('.tr-chip')).toHaveCount(3);
  await noRawText(b);
  await b.screenshot({ path: path.join(SHOTS, '375-04-sec.png') });
  expectClean(await layout(b));
  // Klavye: altın alanı odaklanınca ana eylem hâlâ erişilebilir (altta sabit).
  await b.locator('#trade-gold').focus();
  expect((await layout(b)).footAtBottom).toBe(true);
  await b.getByRole('button', { name: 'Kaydet ve incele', exact: true }).click();
  await expect(b.getByTestId('trade-give')).toContainText('20 altın');
  await expect(b.getByTestId('trade-give')).toContainText('Taze Balık');
  await expect(b.getByTestId('trade-get')).toContainText('Hiçbir şey');
  await b.screenshot({ path: path.join(SHOTS, '375-05-incele.png') });
  expectClean(await layout(b));

  // 5) A (1000 px): karşı teklif adlarla görünür, ham kimlik yok; A da bir şey ekler → B'de uyarı bandı.
  await expect(a.getByTestId('trade-theirs')).toContainText('20 altın');
  await expect(a.getByTestId('trade-theirs')).toContainText('Taze Balık');
  await expect(a.getByTestId('trade-theirs')).toContainText('Yumurta');
  await noRawText(a);
  await a.getByRole('button', { name: '＋ Ekle', exact: true }).click();
  await a.locator('.tr-drawer .tr-pick[data-trade="toggle"]').first().click();
  await a.screenshot({ path: path.join(SHOTS, '1000-01-ekle-cekmecesi.png') });
  expectClean(await layout(a));
  await a.getByRole('button', { name: 'Tamam', exact: true }).click();
  await a.screenshot({ path: path.join(SHOTS, '1000-02-sec.png') });
  expectClean(await layout(a));
  await a.getByRole('button', { name: 'Kaydet ve incele', exact: true }).click();
  await a.getByRole('button', { name: 'Onayla', exact: true }).click();
  await expect(a.getByTestId('trade-state')).toContainText('Karşı tarafın onayı bekleniyor');
  await a.screenshot({ path: path.join(SHOTS, '1000-03-onay-bekleniyor.png') });
  await b.getByRole('button', { name: 'Yenile', exact: true }).click();
  await expect(b.locator('.tr-band')).toContainText('teklifini değiştirdi');
  await expect(b.getByRole('button', { name: 'Onayla', exact: true })).toBeDisabled();
  await b.screenshot({ path: path.join(SHOTS, '375-06-degisti-uyarisi.png') });
  await b.getByRole('button', { name: 'Gördüm', exact: true }).click();
  await noRawText(b);

  // 6) 768 px ara genişlik.
  await b.setViewportSize({ width: 768, height: 1024 });
  await expect(b.getByTestId('trade-get')).not.toContainText('Hiçbir şey');
  await b.screenshot({ path: path.join(SHOTS, '768-01-incele.png') });
  expectClean(await layout(b));
  await b.setViewportSize({ width: 375, height: 812 });
  await b.getByRole('button', { name: 'Onayla', exact: true }).click();
  await expect(b.locator('.trade-result')).toContainText('Takas tamamlandı');
  await b.screenshot({ path: path.join(SHOTS, '375-07-tamamlandi.png') });
  await b.getByRole('button', { name: 'Yenile', exact: true }).click();
  await expect(b.getByTestId('server-gold')).toHaveText('400 altın'); // B 20 altın verdi, A altın vermedi
  await ca.close(); await cb.close();
  expect(errors).toEqual([]);
});
