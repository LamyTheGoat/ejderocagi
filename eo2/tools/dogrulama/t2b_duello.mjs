import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const out = process.cwd(); const { chromium } = createRequire('C:/Users/user/Documents/GitHub/ejderocagi-eng06/package.json')('playwright-core');
const url = 'http://localhost:3243'; const log = { hatalar: [], cerceveA: [], cerceveB: [] };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const A = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), B = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => log.hatalar.push(n + ' ' + e.message)); p.on('websocket', ws => ws.on('framereceived', f => { try { const m = JSON.parse(f.payload); if (/^duel_/.test(m.type)) log['cerceve' + n].push(m.type + (m.message ? ': ' + m.message : '') + (m.status ? ':' + m.status : '')); } catch (_) {} })); }
const shot = (p, ad) => p.screenshot({ path: path.join(out, ad + '.png') });
const poll = async (fn, ms = 20000, ad = '') => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('zaman aşımı: ' + ad); await new Promise(r => setTimeout(r, 250)); } };
async function newGame(p) { await p.goto(url); await p.getByRole('button', { name: /Yeni ocak kur/ }).click(); await p.getByRole('button', { name: 'Ocağa gir', exact: true }).click(); await poll(() => p.evaluate(() => !!(typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1 && MP.authHandle)), 25000, 'ws'); }
try {
  await newGame(A); await newGame(B); const hA = await A.evaluate(() => MP.authHandle), hB = await B.evaluate(() => MP.authHandle);
  for (const p of [A, B]) await p.evaluate(() => { window.__fastFx = true; for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
  const davet = () => A.evaluate(h => { const f = (typeof SOC_ACT !== 'undefined' && SOC_ACT['soc-vs-duel']) || ACT['soc-vs-duel']; f({ dataset: { h } }); }, hB);
  const bDavet = () => B.evaluate(() => { const i = (ensureSocial().invites || []).find(z => z.kind === 'vs_duel'); return i ? { id: i.id, from: i.from } : null; });
  // 1. deneme: hiçbir zorlama yok (B yeni girmiş, hiç eşitleme yapmamış)
  await davet(); await A.waitForTimeout(3000); log.deneme1 = { bDavet: await bDavet(), cerceveA: [...log.cerceveA] };
  let inv = log.deneme1.bDavet;
  if (!inv) { // 2. deneme: B elle eşitlenir (mpSyncState) — DURUM ZORLAMA
    await B.evaluate(() => mpSyncState()); await B.waitForTimeout(1500); await davet(); inv = await poll(bDavet, 10000, 'B daveti aldı (eşitlemeden sonra)'); log.deneme2 = { bDavet: inv }; }
  // B sosyal paneli açıp daveti görür
  await B.evaluate(() => { if (typeof SOC_UI !== 'undefined') { SOC_UI.open = true; socRender(); } }); await B.waitForTimeout(500); await shot(B, 'd1_duello_davet_B');
  log.davetDugmesi = await B.locator('[data-a="soc-invite-accept"]').count();
  if (log.davetDugmesi) await B.locator('[data-a="soc-invite-accept"]').first().click(); else await B.evaluate(id => mpReplyDragonDuelInvite(id, true), inv.id);
  await poll(async () => (await A.evaluate(() => !!(FT && FT.mode === 'mp' && FT.mpRoomId))) && (await B.evaluate(() => !!(FT && FT.mode === 'mp' && FT.mpRoomId))), 15000, 'düello odası');
  const ft = p => p.evaluate(() => FT ? ({ oda: FT.mpRoomId, rol: FT.mpRole, baslik: FT.title, over: !!FT.F.over, winner: FT.F.winner, round: FT.F.round, hp: [FT.F.p.hp, FT.F.e.hp], wait: !!FT.waitingForOpponent, busy: !!FT.busy, pre: !!FT.pre, sonuc: (FT.result || []).map(z => String(z).replace(/<[^>]+>/g, '').slice(0, 140)) }) : null);
  log.oda = { A: await ft(A), B: await ft(B) }; await A.waitForTimeout(1500); await shot(A, 'd2_duello_basi_A'); await shot(B, 'd2_duello_basi_B');
  log.eylemYolu = {}; const t0 = Date.now(); let ara = false;
  while (Date.now() - t0 < 200000) { const st = [await ft(A), await ft(B)]; if (!st[0] || !st[1] || (st[0].over && st[1].over)) break;
    for (const [i, p] of [[0, A], [1, B]]) if (!st[i].over && !st[i].wait && !st[i].busy && !st[i].pre) { const yol = await p.evaluate(() => { const bt = document.querySelector('[data-a="fact"][data-x="pence"]:not([disabled])'); if (bt) { bt.click(); return 'dugme'; } return 'dugme-yok'; }); log.eylemYolu[yol] = (log.eylemYolu[yol] || 0) + 1; }
    if (!ara && st[0].round >= 2) { ara = true; await shot(A, 'd3_duello_tur2_A'); await shot(B, 'd3_duello_tur2_B'); }
    await new Promise(r => setTimeout(r, 400)); }
  await A.waitForTimeout(3000); log.son = { A: await ft(A), B: await ft(B), altinA: await A.evaluate(() => S.gold), altinB: await B.evaluate(() => S.gold) };
  await shot(A, 'd4_duello_son_A'); await shot(B, 'd4_duello_son_B');
} catch (e) { log.hata = String(e && e.stack || e).slice(0, 500); await shot(A, 'd_hata_A').catch(() => {}); await shot(B, 'd_hata_B').catch(() => {}); }
fs.writeFileSync(path.join(out, 't2b_duello.json'), JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close();
