// Eski oyun · PvE çok oyunculuk: parti, zindan "co-op" eşitlemesi, dünya boss'u ortak canı (üç misafir oturumu)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const out = process.cwd(); const { chromium } = createRequire('C:/Users/user/Documents/GitHub/ejderocagi-eng06/package.json')('playwright-core');
const url = 'http://localhost:3243'; const log = { hatalar: [], cerceve: { A: [], B: [], C: [] } };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const P = {}; for (const n of ['A', 'B', 'C']) { const p = P[n] = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => log.hatalar.push(n + ' ' + e.message));
  p.on('websocket', ws => ws.on('framereceived', f => { try { const m = JSON.parse(f.payload); if (/^(dungeon_coop_sync|party_|boss_state)/.test(m.type)) log.cerceve[n].push(m.type + (m.action ? ':' + m.action : '') + (m.from ? ' from ' + m.from : '') + (m.to ? ' to ' + m.to : '')); } catch (_) {} })); }
const { A, B, C } = P; const shot = (p, ad) => p.screenshot({ path: path.join(out, ad + '.png') });
const poll = async (fn, ms = 20000, ad = '') => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('zaman aşımı: ' + ad); await new Promise(r => setTimeout(r, 250)); } };
async function newGame(p) { await p.goto(url); await p.getByRole('button', { name: /Yeni ocak kur/ }).click(); await p.getByRole('button', { name: 'Ocağa gir', exact: true }).click(); await poll(() => p.evaluate(() => !!(typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1 && MP.authHandle)), 25000, 'ws'); await p.evaluate(() => { window.__fastFx = true; for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; }); }
try {
  for (const p of [A, B, C]) await newGame(p); const h = {}; for (const n of ['A', 'B', 'C']) h[n] = await P[n].evaluate(() => MP.authHandle); log.h = h;
  /* 1. Parti: A, B'yi partiye çağırır (sosyal panel işleyicisi), B kabul eder */
  await A.evaluate(hb => { ensureSocial().friends.push({ handle: hb, ts: Date.now() }); const f = (typeof SOC_ACT !== 'undefined' && SOC_ACT['soc-party-invite']) || (typeof ACT !== 'undefined' && ACT['soc-party-invite']); if (f) f({ dataset: { h: hb } }); else socSend({ type: 'party_invite', to: hb }); }, h.B);
  const inv = await poll(() => B.evaluate(() => { const i = (ensureSocial().invites || []).find(z => z.kind === 'party'); return i ? { id: i.id, from: i.from } : null; }), 8000, 'parti daveti').catch(e => null);
  log.parti = { davetB: inv };
  if (inv) { await B.evaluate(id => { const f = (typeof SOC_ACT !== 'undefined' && SOC_ACT['soc-invite-accept']) || ACT['soc-invite-accept']; f({ dataset: { id } }); }, inv.id); await A.waitForTimeout(1200);
    log.parti.A = await A.evaluate(() => { const s = ensureSocial(); return s.party && { lider: s.party.leader, uyeler: s.party.members.map(m => m.handle) }; }); log.parti.B = await B.evaluate(() => { const s = ensureSocial(); return s.party && { lider: s.party.leader, uyeler: s.party.members.map(m => m.handle) }; });
    log.parti.sunucudaPartiDurumu = 'yok (server.js yalnız party_invite/party_reply aktarır; bkz. server.js:705)'; }
  /* 2. Zindan: A ve B aynı anda Şahmeran 1. aşamayı açar (kapı forceUnlock ile aşıldı — DURUM ZORLAMA); C zindanda değil */
  const ac = p => p.evaluate(() => { for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; if (typeof socSyncRaidParty === 'function') socSyncRaidParty(); openAnimTestRoom({ raidId: 'sahmeran', screen: 'battle', forceUnlock: true }); SHM.fastSim = true; return { screen: SHM.screen, mode: SHM.gameMode, solo: SHM.soloMode, slots: (SHM.raidPartySlots || []).map(s => s && (s.kind + ':' + s.handle)), coop: (SHM.coopUnits || []).map(u => u.handle + (u.isLivePlayer ? ':canli' : ':yerel')) }; });
  log.zindan = { A: await ac(A), B: await ac(B) }; await A.waitForTimeout(1500);
  const durum = p => p.evaluate(() => ({ screen: SHM.screen, stage: SHM.selectedStage, turn: SHM.turn, bossHp: SHM.boss ? Math.round(SHM.boss.hp) : null, dusman: (SHM.enemies || []).filter(e => !e.dead).map(e => Math.round(e.hp)), coop: (SHM.coopUnits || []).map(u => u.handle + (u.isLivePlayer ? ':canli' : ':yerel')), wind: SHM.wind }));
  log.zindan.once = { A: await durum(A), B: await durum(B) }; await shot(A, 'e1_zindan_A'); await shot(B, 'e1_zindan_B');
  // A, düşmanın üstünde gerçek patlama kodunu çalıştırır ve gerçek bir atış yapar
  await A.evaluate(() => { const t = (SHM.boss && !SHM.boss.dead) ? SHM.boss : SHM.enemies.find(e => !e.dead); if (t) detonateProjectile({ owner: 'player', x: t.x, y: t.y - 40, vx: 1, vy: 0, dmg: 400, blastRadius: 60, trail: [] }); firePlayerVolley(70); });
  await A.waitForTimeout(3500);
  log.zindan.sonra = { A: await durum(A), B: await durum(B) }; await shot(B, 'e2_zindan_B_A_atisindan_sonra');
  log.zindan.coopCerceve = { B: log.cerceve.B.filter(x => /dungeon/.test(x)), C_zindandaDegil: log.cerceve.C.filter(x => /dungeon/.test(x)) };
  /* 3. Dünya boss'u: A vurur; B ve C'de ortak can düşer mi */
  for (const p of [A, B, C]) await p.evaluate(() => { if (typeof SHM !== 'undefined' && SHM.open && typeof closeAnimTestRoom === 'function') closeAnimTestRoom(); for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
  const boss = p => p.evaluate(() => { const B = ensureWorldBoss(); return { kaynak: (typeof MP !== 'undefined' && MP.worldBoss) ? 'sunucu' : 'yerel', hp: B.hp, faz: B.phase, katki: Object.keys(B.contributors).length }; });
  log.boss = { once: { A: await boss(A), B: await boss(B), C: await boss(C) } };
  log.boss.vurus = await A.evaluate(() => { const g0 = S.gold; const f = HUB_ACT['hub-boss-atk']; f(); return { altinFarki: S.gold - g0 }; });
  await A.waitForTimeout(2000); log.boss.sonra = { A: await boss(A), B: await boss(B), C: await boss(C) }; log.boss.cerceveB = log.cerceve.B.filter(x => /boss/.test(x));
} catch (e) { log.hata = String(e && e.stack || e).slice(0, 500); }
fs.writeFileSync(path.join(out, 't3_pve.json'), JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close();
