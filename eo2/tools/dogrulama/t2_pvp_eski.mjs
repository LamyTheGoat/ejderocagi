// Eski oyun (kök index.html, ayrı server.js :3243) · iki misafir oturumu · Topçu PvP odası + Ejderha düellosu
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const out = process.cwd(); const { chromium } = createRequire('C:/Users/user/Documents/GitHub/ejderocagi-eng06/package.json')('playwright-core');
const url = process.env.URL || 'http://localhost:3243';
const log = { hatalar: [] };
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctxA = await b.newContext({ viewport: { width: 1280, height: 800 } }), ctxB = await b.newContext({ viewport: { width: 1280, height: 800 } });
const A = await ctxA.newPage(), B = await ctxB.newPage();
for (const [n, p] of [['A', A], ['B', B]]) p.on('pageerror', e => log.hatalar.push(n + ' ' + e.message));
const shot = (p, ad) => p.screenshot({ path: path.join(out, ad + '.png') });
const poll = async (fn, ms = 20000, ad = '') => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('zaman aşımı: ' + ad); await new Promise(r => setTimeout(r, 250)); } };
async function newGame(p) { await p.goto(url); await p.getByRole('button', { name: /Yeni ocak kur/ }).click(); await p.getByRole('button', { name: 'Ocağa gir', exact: true }).click();
  await poll(() => p.evaluate(() => !!(typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1 && MP.authHandle)), 25000, 'ws bağlantısı'); }
const live = p => p.evaluate(() => { const L = SHM.pvpLive; return L && { matchId: L.matchId, me: L.me, rival: L.rival, firstTurn: L.firstTurn, turnNo: L.turnNo, map: SHM.pvpMap, wind: SHM.wind, turn: SHM.turn, screen: SHM.screen, hp: SHM.player && Math.round(SHM.player.hp), rivalHp: SHM.pvpRival && Math.round(SHM.pvpRival.hp), ended: L.ended }; });
try {
  await newGame(A); await newGame(B);
  const hA = await A.evaluate(() => MP.authHandle), hB = await B.evaluate(() => MP.authHandle);
  log.oturum = { hA, hB, xA: await A.evaluate(() => MP.xVerified), xB: await B.evaluate(() => MP.xVerified) };

  /* ================= TOPÇU PvP ODASI ================= */
  // Lobiye gerçek arayüz yolu: ACT['zindan-pvp-lobby'] requireZindanGate kapısının arkasında. Kapı durumu kaydedilir; lobi testteki gibi forceUnlock ile açılır.
  log.topcuKapi = await A.evaluate(() => ({ kapi: typeof canEnterZindanOrTopcu === 'function' ? !!canEnterZindanOrTopcu() : null, dugmeVar: /zindan-pvp-lobby/.test(document.documentElement.innerHTML) }));
  for (const p of [A, B]) await p.evaluate(() => { window.__fastFx = true; for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; openAnimTestRoom({ screen: 'pvp_lobby', forceUnlock: true }); SHM.fastSim = true; });
  await A.waitForTimeout(800); await shot(B, 'p1_topcu_lobi_bos_B');
  await A.locator('[data-pvpr-act="create"]').click();
  const code = await poll(async () => { const t = await A.locator('#pvprRoomCode').textContent().catch(() => ''); return /^EJD-/.test(t || '') ? t : null; }, 10000, 'oda kodu');
  log.topcu = { odaKodu: code }; await shot(A, 'p2_topcu_bekleme_A');
  await poll(() => B.locator('.pvpr-room', { hasText: code }).count(), 10000, 'B listede oda');
  await shot(B, 'p3_topcu_lobi_liste_B');
  await B.locator('.pvpr-room', { hasText: code }).getByRole('button', { name: 'Katıl' }).click();
  await poll(async () => (await B.locator('#pvprRoomCode').textContent().catch(() => '')) === code, 10000, 'B odada');
  await B.getByRole('button', { name: 'Hazırım' }).click();
  await poll(() => A.locator('[data-pvpr-act="start"]:not([disabled])').count(), 10000, 'başlat açık');
  await shot(A, 'p4_topcu_hazir_A');
  await A.locator('[data-pvpr-act="start"]').click();
  await poll(async () => { const a = await live(A), x = await live(B); return !!(a && x && a.screen === 'battle' && x.screen === 'battle'); }, 20000, 'maç başı');
  let a = await live(A), x = await live(B); log.topcu.macBasi = { a, b: x, ayniMac: a.matchId === x.matchId, ruzgarAyna: a.wind === -x.wind };
  await A.waitForTimeout(1500); await shot(A, 'p5_topcu_mac_A'); await shot(B, 'p5_topcu_mac_B');
  // GERÇEK ATIŞ: sırası gelen taraf oyunun kendi ateş işlevini çağırır (firePlayerVolley), mermi uçar
  const [S1, R1] = a.turn === 'player' ? [A, B] : [B, A];
  const once = await live(R1);
  log.topcu.gercekAtis = await S1.evaluate(() => { const n0 = SHM.projectiles.length; firePlayerVolley(70); return { mermi: SHM.projectiles.length - n0 }; });
  await S1.waitForTimeout(700); await shot(S1, 'p6_topcu_atis_ucus');
  await poll(async () => (await live(R1)).turn === 'player', 25000, 'sıra devri (gerçek atış)').catch(e => { log.topcu.gercekAtisDevir = String(e.message); });
  let s = await live(S1), r = await live(R1); log.topcu.gercekAtisSonra = { atan: s, karsi: r, karsiCanOnce: once.hp };
  // Garantili isabetler: testteki gibi gerçek patlama kodu rakibin üstünde (detonateProjectile) — DURUM ZORLAMA
  const shoot = (p, dmg) => p.evaluate(d => { const rv = SHM.pvpRival; detonateProjectile({ owner: 'player', x: rv.x, y: rv.y - 46, vx: 1, vy: 0, dmg: d, blastRadius: 54, trail: [] }); advanceTurnAfterVolley(); }, dmg);
  let [T, U] = (await live(A)).turn === 'player' ? [A, B] : [B, A];
  const uOnce = (await live(U)).hp; await shoot(T, 300); await poll(async () => (await live(U)).turn === 'player', 15000, 'devir 2');
  s = await live(T); r = await live(U); log.topcu.isabet = { hedefCanOnce: uOnce, hedefCan: r.hp, atanGorduguRakipCan: s.rivalHp, esit: s.rivalHp === r.hp };
  await shot(U, 'p7_topcu_isabet_sonrasi');
  // öldürücü atış
  await T.evaluate(() => { SHM.player.revivesLeft = 0; }); await shoot(U, 99999);
  await poll(async () => (await A.evaluate(() => SHM.screen)) === 'pvp_result' && (await B.evaluate(() => SHM.screen)) === 'pvp_result', 20000, 'sonuç ekranı');
  log.topcu.sonuc = { A: await A.evaluate(() => ({ win: SHM.pvpResult.win, winner: SHM.pvpResult.winner, reason: SHM.pvpResult.reason, baslik: (document.querySelector('.pvpr-result-title') || {}).textContent })), B: await B.evaluate(() => ({ win: SHM.pvpResult.win, winner: SHM.pvpResult.winner, reason: SHM.pvpResult.reason, baslik: (document.querySelector('.pvpr-result-title') || {}).textContent })) };
  await A.waitForTimeout(600); await shot(A, 'p8_topcu_sonuc_A'); await shot(B, 'p8_topcu_sonuc_B');
  for (const p of [A, B]) await p.evaluate(() => { const bt = [...document.querySelectorAll('.pvpr-screen button, .shm-screen button, button')].find(z => /Lobiye dön/.test(z.textContent)); if (bt) bt.click(); });
  await A.waitForTimeout(500);
  for (const p of [A, B]) await p.evaluate(() => { for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; });
} catch (e) { log.topcuHata = String(e && e.stack || e).slice(0, 600); await shot(A, 'p_hata_A').catch(() => {}); await shot(B, 'p_hata_B').catch(() => {}); }

/* ================= EJDERHA-EJDERHA DÜELLOSU (Gerçek Er Meydanı, sunucu hakemli) ================= */
try {
  const hA = log.oturum.hA, hB = log.oturum.hB;
  for (const p of [A, B]) await p.evaluate(() => { window.__fastFx = true; for (let i = 0; i < 20 && modalOn; i++) closeModal(); MQ.length = 0; FT = null; });
  log.duello = { yildizA: await A.evaluate(() => { const d = byId(S.star) || S.dragons[0]; return d && d.name + ':' + d.stage; }) };
  // A, sosyal paneldeki "1v1 Er Meydanı Ejderha Düellosu" düğmesinin işleyicisini çağırır (ACT['soc-vs-duel'])
  log.duello.dugmeIsleyici = await A.evaluate(h => { const f = (typeof SOC_ACT !== 'undefined' && SOC_ACT['soc-vs-duel']) || (typeof ACT !== 'undefined' && ACT['soc-vs-duel']); if (f) { f({ dataset: { h } }); return 'ACT'; } mpSendDragonDuelInvite(h); return 'dogrudan mpSendDragonDuelInvite'; }, hB);
  const inv = await poll(() => B.evaluate(() => { const i = (ensureSocial().invites || []).find(z => z.kind === 'vs_duel'); return i ? { id: i.id, from: i.from } : null; }), 10000, 'B daveti aldı');
  log.duello.davet = inv; await B.waitForTimeout(400); await shot(B, 'd1_duello_davet_B');
  await B.evaluate(id => { const f = (typeof SOC_ACT !== 'undefined' && SOC_ACT['soc-invite-accept']) || (typeof ACT !== 'undefined' && ACT['soc-invite-accept']); if (f) f({ dataset: { id } }); else mpReplyDragonDuelInvite(id, true); }, inv.id);
  await poll(async () => (await A.evaluate(() => !!(FT && FT.mode === 'mp' && FT.mpRoomId))) && (await B.evaluate(() => !!(FT && FT.mode === 'mp' && FT.mpRoomId))), 15000, 'düello odası iki tarafta');
  log.duello.oda = { A: await A.evaluate(() => ({ oda: FT.mpRoomId, rol: FT.mpRole, baslik: FT.title, hp: [FT.F.p.hp, FT.F.e.hp] })), B: await B.evaluate(() => ({ oda: FT.mpRoomId, rol: FT.mpRole, baslik: FT.title, hp: [FT.F.p.hp, FT.F.e.hp] })) };
  await A.waitForTimeout(1200); await shot(A, 'd2_duello_basi_A'); await shot(B, 'd2_duello_basi_B');
  // turlar: iki taraf da gerçek "Pençe" düğmesine basar (data-a="fact" data-x="pence")
  let tur = 0; const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    const st = await Promise.all([A, B].map(p => p.evaluate(() => FT ? { over: !!FT.F.over, wait: !!FT.waitingForOpponent, busy: !!FT.busy, pre: !!FT.pre, round: FT.F.round } : null)));
    if (!st[0] || !st[1] || (st[0].over && st[1].over)) break;
    for (const [i, p] of [[0, A], [1, B]]) if (st[i] && !st[i].over && !st[i].wait && !st[i].busy && !st[i].pre) { const ok = await p.evaluate(() => { const bt = document.querySelector('[data-a="fact"][data-x="pence"]:not([disabled])'); if (bt) { bt.click(); return 'dugme'; } return mpSubmitDragonDuelAction('pence') ? 'islev' : 'yok'; }); if (i === 0) log.duello.sonEylemYolu = ok; }
    tur = Math.max(tur, st[0].round || 0); if (tur === 2 && !log.duello.araGoruntu) { log.duello.araGoruntu = true; await shot(A, 'd3_duello_tur2_A'); }
    await new Promise(r => setTimeout(r, 350));
  }
  await A.waitForTimeout(2500);
  log.duello.son = { A: await A.evaluate(() => FT ? ({ over: !!FT.F.over, winner: FT.F.winner, round: FT.F.round, hp: [FT.F.p.hp, FT.F.e.hp], sonuc: (FT.result || []).map(z => String(z).replace(/<[^>]+>/g, '').slice(0, 120)) }) : 'FT yok'), B: await B.evaluate(() => FT ? ({ over: !!FT.F.over, winner: FT.F.winner, round: FT.F.round, hp: [FT.F.p.hp, FT.F.e.hp], sonuc: (FT.result || []).map(z => String(z).replace(/<[^>]+>/g, '').slice(0, 120)) }) : 'FT yok') };
  await shot(A, 'd4_duello_son_A'); await shot(B, 'd4_duello_son_B');
} catch (e) { log.duelloHata = String(e && e.stack || e).slice(0, 600); await shot(A, 'd_hata_A').catch(() => {}); await shot(B, 'd_hata_B').catch(() => {}); }
fs.writeFileSync(path.join(out, 't2_pvp_eski.json'), JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close();
