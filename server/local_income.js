'use strict';
// ENG-13 · Tek kese: yerel oyun akışlarının altın ve ejderha sonuçları SUNUCUDA hesaplanır.
// İLKELER (kullanıcı talimatı):
//  - İstemci yalnız kimlik/olay bildirir (assetId, sipariş tanımı, Topçu kipi, çark adı). Altın miktarını, fiyatı ve
//    ganimeti sunucu hesaplar: sunucu durumundan, mevcut yerel formüllerle, tohumlu RNG ile (economy_commands seed).
//  - Yeni mekanik yok: formüller js/auction.js, js/orders.js, js/fightev.js, js/minigame/shm_*.js ve js/core.js GOALS
//    ile birebir aynıdır. `economy_sources.js` kaynak politikası DEĞİŞMEDİ; yeni gelirler `sources.credit` üzerinden
//    (debt.receive) mevcut sınıflarla girer.
//  - KULLANICI KARARI (2026-11-09, K13-2'nin yerine geçer): hile koruması ve gelir tavanı YOK. Sunucunun hesapladığı
//    bütün gelirler (topcu.clear/spin, gold.local) `earned` (takas edilebilir) girer; ejderha çıkışları (auction/order/
//    offer.sell) ejderhanın kaynağını korur (Y-1, dragon.sell gibi). gold.import ve hedef ödülü `bound` (D15).
//    `unknown` yalnız eski veriler içindir. Yalnız geçerlilik denetimi kalır (tür, şema, tam sayı, tek istek ≤ 1.000.000).
//    Haftada bir müzayede, çark hakkı ve siparişin ejderhaya uyması yerel OYUN KURALLARIDIR (hile önlemi değil).
const vm = require('node:vm');
const debt = require('./economy_debt');
const sources = require('./economy_sources');
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const count = n => Number.isSafeInteger(n) && n >= 0;

function envInt(env, name, def, max = 10_000_000) {
  const raw = env[name];
  if (raw === undefined || raw === '') return def;
  if (!/^\d+$/.test(String(raw)) || Number(raw) > max) throw new Error('invalid_' + name);
  return Number(raw);
}
function readCaps(env = process.env) {
  return Object.freeze({
    // Kayıt öncesi yerel altının tek seferlik aktarım tavanı (bound). Gelir tavanı DEĞİL (kullanıcının ilk ENG-13 talimatı).
    importCap: envInt(env, 'EO_LOCAL_IMPORT_CAP', 2000),
  });
}
const CAPS = readCaps();

// Yerel gelir/gider türleri (yalnız geçerli tür listesi; tutar tavanı YOK). Kaynak dosyalar parantezde.
const LOCAL_REASONS = Object.freeze(Object.fromEntries(['arena', 'race', 'pageant', 'kiraathane', 'dungeon', 'hub', 'raid', 'event', 'order', 'sale', 'other'].map(k => [k, true])));
// Topçu geçiş ödülleri (js/minigame/shm_ui.js: openStageClearBlessingModal, completeSahmeranDungeonVictory).
const TOPCU_CLEAR = Object.freeze({ stage: 150, caravan: 180, raid_normal: 250, raid_hard: 500, raid_extreme: 950, pvp: 0 });
const TOPCU_SPIN_FEE = 120; // shm_ui.js spinSahmeranLootWheel: ücretli ek büyük çark
const TOPCU_TOKEN_MAX = 3;
// Çarkın sabit taş dilimleri (shm_ui.js finalizeSpin); cevher/kalıp parçası dilimleri yerel ganimet listesine bağlıdır (yerel kalır).
const SPIN_DROPS = Object.freeze({ minor_kort1_2: { kor_t1: 2 }, minor_kort1_3: { kor_t1: 3 }, minor_kort2_1: { kor_t2: 1 },
  major_kort2_2: { kor_t2: 2 }, major_kort2_3: { kor_t2: 3 }, major_kort3_1: { kor_t3: 1 }, major_jackpot: { anka_koruma: 1, kiyamet_ozu: 1 } });
// Çark dilimleri (js/minigame/shm_data.js getMinorWheelSlices / getMajorWheelSlices ile aynı ağırlıklar).
function wheel(name) {
  if (/^minor[123]$/.test(name)) {
    const s3 = name === 'minor3';
    return [['minor_gold_120', 25, 120], ['minor_food_2', 22, 0], ['minor_kort1_2', 20, 0], ['minor_gold_220', 12, 220],
      ['minor_feast_1', 9, 0], ['minor_kort1_3', 6, 0], ['minor_ore_1', 4, 0], ['minor_kort2_1', s3 ? 4 : 2, 0]];
  }
  const m = /^major_(normal|hard|extreme)$/.exec(name);
  if (!m) return null;
  const mult = m[1] === 'extreme' ? 1.8 : m[1] === 'hard' ? 1.35 : 1, gold = m[1] === 'extreme' ? 900 : 450;
  return [['major_gold', 28, gold], ['major_kort2_2', 24, 0], ['major_kort2_3', 16, 0], ['major_kort3_1', 12, 0], ['major_egg_1', 8, 0],
    ['major_shard_armor', Number((6 * mult).toFixed(2)), 0], ['major_shard_wpn', Number((4 * mult).toFixed(2)), 0], ['major_jackpot', Number((2 * mult).toFixed(2)), 0]];
}

// Sipariş tanımı (js/orders.js REQ ile aynı ağırlıklar). Gen kaynaklı şartlar sunucu ejderhasında doğrulanır;
// `stat` (yerel antrenman) ve `stage` (yerel büyüme) sunucuda bilinemez (R-2) ve doğrulanmaz.
const REQ_W = Object.freeze({ el: 1, stage: 0, sex: 0.5, pot: 2, stat: 1.5, pig: 4, eye: 3, pat: 1, par: 4 });
const RARE = ['pig', 'eye', 'pat', 'par'];
const STATS = ['gu', 'ce', 'da', 'ze'];
function parseOrder(spec, elements) {
  const out = { lv: null, wk: null, reqs: [] };
  const seen = new Set();
  for (const part of String(spec).split(';')) {
    const m = /^([a-z]{2,5})=([A-Za-z0-9]{1,12})$/.exec(part);
    if (!m || seen.has(m[1])) fail('invalid_order', 400);
    seen.add(m[1]);
    const [, k, v] = m;
    if (k === 'lv') { if (!/^[012]$/.test(v)) fail('invalid_order', 400); out.lv = +v; continue; }
    if (k === 'wk') { if (!/^\d{1,2}$/.test(v) || +v < 1 || +v > 20) fail('invalid_order', 400); out.wk = +v; continue; }
    if (!Object.hasOwn(REQ_W, k)) fail('invalid_order', 400);
    let val = v;
    if (k === 'el' && !elements.includes(v)) fail('invalid_order', 400);
    if (k === 'stage' && !['genc', 'yetiskin'].includes(v)) fail('invalid_order', 400);
    if (k === 'sex' && !['F', 'M'].includes(v)) fail('invalid_order', 400);
    if (k === 'pig' && !['a', 'm'].includes(v)) fail('invalid_order', 400);
    if (k === 'eye' && v !== 'A') fail('invalid_order', 400);
    if (k === 'pat' && !['C', 'B'].includes(v)) fail('invalid_order', 400);
    if (k === 'par' && v !== 'P') fail('invalid_order', 400);
    if (k === 'pot' || k === 'stat') {
      const s = /^(gu|ce|da|ze)(\d{1,3})$/.exec(v);
      if (!s) fail('invalid_order', 400);
      val = [s[1], +s[2]];
      if (k === 'pot' && (val[1] < 3 || val[1] > 4)) fail('invalid_order', 400);
      if (k === 'stat' && val[1] > 400) fail('invalid_order', 400);
    }
    out.reqs.push([k, val]);
  }
  // orders.js orderGen yapısı: her seviye bu şart kümesini üretir; başka bileşim kabul edilmez.
  const keys = out.reqs.map(r => r[0]);
  const n = k => keys.filter(x => x === k).length;
  if (out.lv == null || out.wk == null || n('el') !== 1 || n('stage') !== 1) fail('invalid_order', 400);
  const growth = n('pot') + n('stat'), rare = keys.filter(k => RARE.includes(k)).length;
  if (out.lv === 0 && keys.length !== 2) fail('invalid_order', 400);
  if (out.lv >= 1 && growth !== 1) fail('invalid_order', 400);
  if (out.lv === 1 && rare !== 0) fail('invalid_order', 400);
  if (out.lv === 2 && rare !== 1) fail('invalid_order', 400);
  if (out.lv === 2 && n('pot') && out.reqs.find(r => r[0] === 'pot')[1][1] !== 4) fail('invalid_order', 400);
  if (out.lv === 1 && n('pot') && out.reqs.find(r => r[0] === 'pot')[1][1] !== 3) fail('invalid_order', 400);
  if (keys.length > (out.lv === 0 ? 2 : out.lv === 1 ? 4 : 5)) fail('invalid_order', 400);
  return out;
}

// Sunucu VM'inde (tohumlu Math.random) çalışan yardımcılar. Yalnız depoya ait kural dosyalarındaki adları kullanır.
const vmExpose = new vm.Script(`({
  GOALS, EL_AD,
  rand() { return Math.random(); }, // tohumlu (economy_commands makeRuntime)
  award(drops) { return awardChibiStones(drops); },
  // js/minigame/shm_ui.js completeSahmeranDungeonVictory garantili düşüşleri (aynı formül; kervan ortaklığı/üçlü sancak
  // istemci durumudur, sunucuda bilinmez ve uygulanmaz).
  topcuDrops(kind, sub) {
    const sofra = !!(S.sofraBuff && S.sofraBuff.week === S.week), r = () => Math.random();
    if (kind === 'caravan') {
      const ore = { kizil_vadi: 'obsidiyen', buzul_gecidi: 'kehribar', mercan_kiyisi: 'mercan', firtina_bogazi: 'yildirim' }[sub] || 'obsidiyen';
      const oreAmt = 1 + (r() < 0.45 ? 1 : 0); let t2 = 1 + (r() < 0.45 ? 1 : 0); if (sofra && r() < 0.20) t2 += 1;
      const t3 = r() < 0.25 ? 1 : 0, shardWin = r() < 0.35, shardKey = r() < 0.5 ? 'sahmeran_kalip' : 'kalgarot_kalip';
      const rw = { [ore]: oreAmt, kor_t2: t2 }; if (t3) rw.kor_t3 = t3; if (shardWin) rw[shardKey] = 1; return rw;
    }
    const shard = sub === 'abra' ? 'abra_kalip' : sub === 'komutan' ? 'kalgarot_kalip' : 'sahmeran_kalip';
    if (kind === 'raid_normal') return { [shard]: 1, kor_t2: 2 + (sofra && r() < 0.20 ? 1 : 0) };
    if (kind === 'raid_extreme') { const rw = { [shard]: 3 + (r() < 0.5 ? 1 : 0), kor_t3: 2 + (r() < 0.5 ? 1 : 0) + (sofra && r() < 0.20 ? 1 : 0), kiyamet_ozu: 1 }; if (r() < 0.25) rw.anka_koruma = 1; return rw; }
    if (kind === 'raid_hard') { const rw = { [shard]: 2, kor_t2: 2 + (sofra && r() < 0.20 ? 1 : 0) }; if (r() < 0.50) rw.kor_t3 = 1; return rw; }
    if (kind === 'pvp') return { kor_t1: 2, kor_t2: 1 };
    return {};
  },
  // js/auction.js aucOpen + aucNpcTurn (oyuncunun kendi ejderhasını satışa çıkarması): aynı formül, zamanlayıcısız.
  aucSimServer(d) {
    const v = value(d), rare = rareScore(d);
    const bidders = shuffle(BIDDERS.slice()).slice(0, 3).map(B => ({ id: B.id, eager: B.eager,
      max: Math.round(v * B.hirs * B.like.dragon * rnd(.85, 1.2) * (1 + rare * (B.id === 'bilge' ? .12 : .05))), out: false }));
    let price = Math.round(v * .4 / 5) * 5, leader = null;
    const step = Math.max(10, Math.round(v * .09 / 5) * 5), log = [];
    for (let guard = 0; guard < 400; guard++) {
      const next = price + step;
      const cands = bidders.filter(B => !B.out && leader !== B.id);
      for (const B of cands) if (B.max < next) B.out = true;
      const able = cands.filter(B => !B.out);
      if (!able.length) break;
      const B = able.sort((a, b) => (b.eager + Math.random() * .3) - (a.eager + Math.random() * .3))[0];
      const jump = B.id === 'rustem' && chance(30) ? step * 2 : step;
      price = Math.min(B.max, price + jump); leader = B.id; log.push([B.id, price]);
    }
    return { v: Math.round(v), price, step, leader, log, bidders: bidders.map(B => ({ id: B.id, max: B.max })) };
  },
  // js/orders.js REQ.ok (yalnız gen kaynaklı şartlar).
  orderGeneOk(d, k, v) {
    if (k === 'el') return d.el === v;
    if (k === 'sex') return d.sex === v;
    if (k === 'pot') return !!(d.genes && d.genes.pot && d.genes.pot[v[0]]) && Math.floor((d.genes.pot[v[0]][0] + d.genes.pot[v[0]][1]) / 2) >= v[1];
    if (k === 'pig') return pigOf(d) === v;
    if (k === 'eye') return d.eye === 'A';
    if (k === 'pat') return typeof d.pat === 'string' && d.pat.includes(v);
    if (k === 'par') return parOf(d);
    return true;
  },
})`, { filename: 'server_eng13_expose.js' });

const absWeek = S => ((Number.isSafeInteger(S.seasonNo) && S.seasonNo > 0 ? S.seasonNo : 1) - 1) * 20 + (Number.isSafeInteger(S.week) ? S.week : 1);
// Oyun kuralı (yerel auction.js ile aynı): haftada bir kendi ejderhanı müzayedeye çıkarırsın. Hile önlemi değildir.
function weekly(S, key) {
  const w = absWeek(S);
  S.srvWeekly = S.srvWeekly && typeof S.srvWeekly === 'object' && S.srvWeekly.week === w ? S.srvWeekly : { week: w };
  if (!count(S.srvWeekly[key])) S.srvWeekly[key] = 0;
  return S.srvWeekly;
}
// Ejderha sunucu ocağından çıkar (yerel removeLocal ile aynı: eşya çıkar, soy kaydı, yıldız devri).
function removeDragon(S, api, d) {
  for (const slot of Object.keys(d.equip || {})) d.equip[slot] = null;
  api.linReg(d); S.dragons = S.dragons.filter(x => x !== d);
  if (S.star === d.id) S.star = (S.dragons.find(x => !x.dead && !x.old) || {}).id ?? null;
}
// Ölen/verilen ejderha: ilan, takas ve kilit denetimi depo katmanında (guardMarketHold / guardReservation) yapılır:
// ilandaki ya da takastaki ejderha için komut `market_reserved_asset` / `trade_reserved_asset` ile reddedilir.
function exitable(d) { if (d.task || d.dead || d.tradeLocked || d.busy) fail('dragon_busy', 409); return d; }
const income = (S, amount, source) => (amount > 0 ? debt.receive(S, amount, source) : { paidDebt: 0, credited: 0 });
// Y-1 (D15): ejderhanın çıkışından gelen bedel ejderhanın kaynağını korur (dragon.sell ile aynı); başlangıç/bound
// ejderha satılınca gelir bound girer.
const dragonSource = d => (['bound', 'unknown', 'earned'].includes(d.funding) ? d.funding : 'unknown');

const TYPES = new Set(['dragon.die', 'auction.sell', 'offer.sell', 'order.deliver', 'topcu.clear', 'topcu.spin', 'goal.reach', 'gold.local', 'gold.import']);
// Komutları uygular. `ctx`: { api, now, owned, spend, caps }. Döner: result nesnesi.
function reduce(type, S, a, ctx) {
  const { api, now, owned, spend } = ctx, caps = ctx.caps || CAPS;
  switch (type) {
    case 'dragon.die': {
      const d = owned(S.dragons, a.assetId);
      if (d.tradeLocked) fail('dragon_busy', 409);
      d.dead = true; d.cause = 'yerel ocakta öldü'; d.diedW = S.week; d.task = null;
      removeDragon(S, api, d);
      S.dead = Array.isArray(S.dead) ? S.dead : []; S.dead.push(d);
      S.st.deaths = (S.st.deaths || 0) + 1;
      return { died: d.assetId };
    }
    case 'auction.sell': {
      const d = exitable(owned(S.dragons, a.assetId));
      const W = weekly(S, 'auction');
      if (W.auction >= 1) fail('auction_weekly_limit', 409); // auction.js oyun kuralı: haftada bir
      const sim = JSON.parse(JSON.stringify(api.aucSimServer(d))); // VM nesnesi → düz veri
      if (!sim.leader) return { auction: sim, sold: false, got: 0 };
      W.auction++;
      const got = Math.round(sim.price * 0.9), source = dragonSource(d); // %10 komisyon
      const credit = income(S, got, source);
      removeDragon(S, api, d);
      return { auction: sim, sold: true, got, source, credit };
    }
    case 'offer.sell': {
      const d = exitable(owned(S.dragons, a.assetId));
      const price = Math.round(api.value(d) * 1.4), source = dragonSource(d); // fightev.js teklif: value × 1.4
      const credit = income(S, price, source);
      removeDragon(S, api, d);
      return { price, source, credit };
    }
    case 'order.deliver': {
      const d = exitable(owned(S.dragons, a.assetId));
      if (d.old || d.inj) fail('order_unfit', 409);
      const o = parseOrder(a.spec, Object.keys(api.EL_AD));
      for (const [k, v] of o.reqs) if (!api.orderGeneOk(d, k, v)) fail('order_unfit', 409); // oyun kuralı: ejderha siparişi tutmalı
      const wsum = o.reqs.reduce((t, [k]) => t + REQ_W[k], 0), adult = o.reqs.find(r => r[0] === 'stage')[1] === 'yetiskin';
      const gold = Math.round((140 + wsum * 120 + o.wk * 12) * (adult ? 1.2 : 1) / 10) * 10; // orders.js orderGen
      const source = dragonSource(d), credit = income(S, gold, source);
      removeDragon(S, api, d);
      S.st.orders = (S.st.orders || 0) + 1;
      return { gold, source, credit };
    }
    case 'topcu.clear': {
      // mode = tür[:alt] (alt: zindan kimliği ya da kervan yolu; yalnız düşüş tablosunu seçer).
      const [kind, sub = ''] = String(a.mode).split(':');
      if (!Object.hasOwn(TOPCU_CLEAR, kind) || !/^[a-z_]{0,24}$/.test(sub)) fail('unknown_topcu_mode', 400);
      const T = S.topcu = S.topcu && typeof S.topcu === 'object' ? S.topcu : { minor: 0, major: 0, open: false };
      const fam = kind === 'stage' ? 'minor' : 'major'; // oyun kuralı: her geçiş bir çark hakkı verir
      T[fam] = Math.min(TOPCU_TOKEN_MAX, (count(T[fam]) ? T[fam] : 0) + 1); T.open = false;
      const gold = TOPCU_CLEAR[kind];
      const drops = JSON.parse(JSON.stringify(api.topcuDrops(kind, sub)));
      if (Object.keys(drops).length) api.award(drops);
      return { mode: kind, gold, drops, credit: income(S, gold, 'earned') };
    }
    case 'topcu.spin': {
      const slices = wheel(a.wheel);
      if (!slices) fail('unknown_wheel', 400);
      const T = S.topcu = S.topcu && typeof S.topcu === 'object' ? S.topcu : { minor: 0, major: 0, open: false };
      const fam = a.wheel.startsWith('minor') ? 'minor' : 'major';
      let paid = false;
      if (count(T[fam]) && T[fam] > 0) { T[fam]--; if (fam === 'major') T.open = true; }
      else if (fam === 'major' && T.open) { spend(TOPCU_SPIN_FEE); paid = true; }
      else fail('topcu_spin_unavailable', 409);
      const total = slices.reduce((t, s) => t + s[1], 0);
      let r = api.rand() * total, idx = 0;
      for (let i = 0; i < slices.length; i++) { r -= slices[i][1]; if (r <= 0) { idx = i; break; } }
      const [id, , gold] = slices[idx];
      const drops = SPIN_DROPS[id] ? { ...SPIN_DROPS[id] } : {};
      if (Object.keys(drops).length) api.award(drops);
      return { drops, wheel: a.wheel, idx, id, gold, paid, fee: paid ? TOPCU_SPIN_FEE : 0, credit: income(S, gold, 'earned') };
    }
    case 'goal.reach': {
      const g = api.GOALS.find(x => x.id === a.id);
      if (!g) fail('unknown_goal', 400);
      S.goals = Array.isArray(S.goals) ? S.goals : [];
      if (S.goals.includes(g.id)) return { goal: g.id, already: true, gold: 0 }; // hesap başına bir kez (DÜŞÜK-1)
      S.goals.push(g.id);
      const source = sources.goalSource(S, g.id); // D15: hedef ödülü bound (mevcut politika)
      return { goal: g.id, gold: g.r, source, credit: income(S, g.r, source) };
    }
    case 'gold.local': {
      if (!Object.hasOwn(LOCAL_REASONS, a.reason)) fail('unknown_reason', 400);
      if (a.amount < 0) { spend(-a.amount); return { reason: a.reason, spent: -a.amount }; }
      return { reason: a.reason, credited: a.amount, credit: income(S, a.amount, 'earned') };
    }
    case 'gold.import': {
      if (S.localImport) return { already: true, credited: 0 };
      if (a.amount < 0) fail('invalid_arguments', 400);
      const credited = Math.min(a.amount, caps.importCap);
      S.localImport = { at: Number.isSafeInteger(now) ? now : null, asked: a.amount, credited, cap: caps.importCap };
      return { credited, dropped: a.amount - credited, cap: caps.importCap, credit: income(S, credited, 'bound') };
    }
    default: return null;
  }
}
module.exports = { TYPES, reduce, vmExpose, readCaps, CAPS, LOCAL_REASONS, TOPCU_CLEAR, TOPCU_SPIN_FEE, parseOrder, wheel };