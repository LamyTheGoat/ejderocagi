'use strict';
/* ============ EJDER OCAĞI — RAKİP OCAKLAR ve TAKTİK YAPAY ZEKÂ PROFİLLERİ ============
   Demirhan'ın Kara Kanat Ocağı, Leyla Hatun'un Sedef Ocağı, Kuzey'in Kuzey Rüzgârı Ocağı ve Baron Vasıf'ın Altın Ahırları
   her hafta güçlenir, ün toplar, oyuncunun yükselişine göre adaptif ölçeklenir ve kendilerine özgü Utility AI
   taktik profilleriyle (agresif, cevik, taktik, kale) dövüşürler. */

const RIVAL_AI_PROFILES = {
  agresif: {
    id: 'agresif',
    ad: 'Acımasız Taarruz',
    desc: 'Ağır nefes baskısı ve kesintisiz pençe taarruzu kurar; rakip sarsıldığında bitirici hamleye yüklenir.',
    utilityWeights: { nefes: 1.35, pence: 1.22, kukre: 1.15, savun: 0.55, card: 1.42 },
    statBias: { gu: 1.16, ce: 1.0, da: 1.05, ze: 0.96 },
    hysteresis: 0.06,
    adaptRate: 0.35,
  },
  cevik: {
    id: 'cevik',
    ad: 'Akıcı Kanat & Sıyrılma',
    desc: 'Çeviklik üstünlüğü, kaçınma ve zamanında savunma/kalkan ile rakibi yorar; açık bulduğunda seri pençe indirir.',
    utilityWeights: { nefes: 1.02, pence: 1.28, kukre: 0.88, savun: 1.26, card: 1.28 },
    statBias: { gu: 0.95, ce: 1.22, da: 0.98, ze: 1.08 },
    hysteresis: 0.08,
    adaptRate: 0.25,
  },
  taktik: {
    id: 'taktik',
    ad: 'Soğukkanlı Taktik & Analiz',
    desc: 'Element üstünlüğünü, nefes dengesini ve sarsma fırsatlarını hesaplayarak en yüksek faydalı hamleyi seçer.',
    utilityWeights: { nefes: 1.28, pence: 1.06, kukre: 1.34, savun: 1.18, card: 1.38 },
    statBias: { gu: 0.96, ce: 1.12, da: 1.02, ze: 1.22 },
    hysteresis: 0.1,
    adaptRate: 0.3,
  },
  kale: {
    id: 'kale',
    ad: 'Zırhlı Tahkimat',
    desc: 'Yüksek zırh ve dayanıklılıkla darbeleri emer, nefes biriktirip sarsıcı karşı saldırıya geçer.',
    utilityWeights: { nefes: 1.15, pence: 1.1, kukre: 0.96, savun: 1.34, card: 1.18 },
    statBias: { gu: 1.08, ce: 0.9, da: 1.24, ze: 0.95 },
    hysteresis: 0.09,
    adaptRate: 0.22,
  },
};

const RIVALS0 = [
  {
    id: 'demirhan', ad: 'Kara Kanat Ocağı', sahip: 'Demirhan', npc: 'demirhan', un: 10, power: 68, grow: [1.4, 2.3],
    aiProfile: 'agresif', utilityWeights: { ...RIVAL_AI_PROFILES.agresif.utilityWeights }, adaptLv: 0,
    champ: { name: 'Karabela', el: 'golge', traits: ['demir', 'kor'], card: 'golge_adim' },
  },
  {
    id: 'leyla', ad: 'Sedef Ocağı', sahip: 'Leyla Hatun', un: 5, power: 52, grow: [1, 1.9],
    aiProfile: 'cevik', utilityWeights: { ...RIVAL_AI_PROFILES.cevik.utilityWeights }, adaptLv: 0,
    champ: { name: 'Sedef', el: 'buz', traits: ['kartal'], card: 'buz_zirh' },
  },
  {
    id: 'kuzey', ad: 'Kuzey Rüzgârı Ocağı', sahip: 'Kuzey Bey', un: 6, power: 56, grow: [1.05, 2.0],
    aiProfile: 'taktik', utilityWeights: { ...RIVAL_AI_PROFILES.taktik.utilityWeights }, adaptLv: 0,
    champ: { name: 'Bora', el: 'firtina', traits: ['kartal', 'sabirli'], card: 'yildirim' },
  },
  {
    id: 'baron', ad: 'Altın Ahırlar', sahip: 'Baron Vasıf', un: 7, power: 58, grow: [0.8, 1.7],
    aiProfile: 'kale', utilityWeights: { ...RIVAL_AI_PROFILES.kale.utilityWeights }, adaptLv: 0,
    champ: { name: 'Altınkanat', el: 'ates', traits: ['demir'], card: 'alev_yagmuru' },
  },
];

/* ---------- Utility AI Yanıt Eğrileri (0..1 Normalize) ---------- */
const RIVAL_CURVES = {
  clamp01: x => Math.max(0, Math.min(1, x)),
  linear01: (v, min, max) => Math.max(0, Math.min(1, (v - min) / ((max - min) || 1))),
  quad01: (x, exp = 2) => Math.pow(Math.max(0, Math.min(1, x)), exp),
  sigmoid01: (x, k = 8, mid = 0.5) => 1 / (1 + Math.exp(-k * (x - mid))),
  // Çarpımsal telafi: birden fazla 0..1 faktör çarpıldığında puanın aşırı küçülmesini dengeler
  compensate: (score, count) => {
    const s = Math.max(0, Math.min(1, score));
    if (count <= 1 || s <= 0 || s >= 1) return s;
    const mod = 1 - 1 / count;
    return s + (1 - s) * mod * s;
  },
};

function rivalProfileOf(refOrTrainer) {
  if (!refOrTrainer) return RIVAL_AI_PROFILES.taktik;
  if (typeof refOrTrainer === 'string') {
    if (RIVAL_AI_PROFILES[refOrTrainer]) return RIVAL_AI_PROFILES[refOrTrainer];
    const low = refOrTrainer.toLocaleLowerCase('tr');
    if (low.includes('demirhan') || low.includes('çukur') || low.includes('rüstem')) return RIVAL_AI_PROFILES.agresif;
    if (low.includes('leyla') || low.includes('süreyya') || low.includes('esma')) return RIVAL_AI_PROFILES.cevik;
    if (low.includes('kuzey') || low.includes('rıza') || low.includes('cemal')) return RIVAL_AI_PROFILES.taktik;
    if (low.includes('baron') || low.includes('halil') || low.includes('recep')) return RIVAL_AI_PROFILES.kale;
    return RIVAL_AI_PROFILES.taktik;
  }
  if (refOrTrainer.aiProfile && RIVAL_AI_PROFILES[refOrTrainer.aiProfile]) return RIVAL_AI_PROFILES[refOrTrainer.aiProfile];
  if (refOrTrainer.trainer) return rivalProfileOf(refOrTrainer.trainer);
  if (refOrTrainer.arch) {
    const a = refOrTrainer.arch.toLocaleLowerCase('tr');
    if (a.includes('kaba') || a.includes('canavar') || a.includes('şampiyon')) return RIVAL_AI_PROFILES.agresif;
    if (a.includes('çevik')) return RIVAL_AI_PROFILES.cevik;
    if (a.includes('kale')) return RIVAL_AI_PROFILES.kale;
  }
  return RIVAL_AI_PROFILES.taktik;
}

/* ---------- Hibrit BT + Utility AI Karar Değerlendirici ---------- */
function rivalUtilityChoose(me, foe) {
  const prof = rivalProfileOf(me.aiProfile || me.ref || me.name);
  const W = (me.ref && me.ref.utilityWeights) || prof.utilityWeights || RIVAL_AI_PROFILES.taktik.utilityWeights;
  const hp01 = RIVAL_CURVES.clamp01(me.hp / Math.max(1, me.maxHp));
  const foeHp01 = RIVAL_CURVES.clamp01(foe.hp / Math.max(1, foe.maxHp));
  const sta01 = RIVAL_CURVES.clamp01(me.sta / 100);
  const adv = typeof elMult === 'function' ? elMult(me.el, foe.el) : 1;
  const availCards = (me.cards || []).filter(c => !(me.used || []).includes(c));

  // 1. BT Öncelikli Kök Dalı: Acil Hayatta Kalma / Bitirici Kart Kontrolü
  for (const k of availCards) {
    if (k === 'son_nefes' && hp01 <= 0.38) return 'card:' + k;
    if ((k === 'kanat_kalkan' || k === 'buz_zirh' || k === 'golge_adim') && hp01 <= 0.52 && (foe.fury || foe.sta >= 40)) {
      const defUrgency = RIVAL_CURVES.sigmoid01(1 - hp01, 9, 0.48) * (W.card || 1.2);
      if (defUrgency >= 0.62) return 'card:' + k;
    }
    if ((k === 'alev_yagmuru' || k === 'yildirim' || k === 'celik_pence' || k === 'sarsinti' || k === 'kukreyen_yurek') && foeHp01 <= 0.85) {
      const offScore = RIVAL_CURVES.compensate(
        RIVAL_CURVES.linear01(1 - foeHp01, 0, 0.75) * (foe.guard ? 0.45 : 0.92),
        2
      ) * (W.card || 1.2);
      if (offScore >= 0.68) return 'card:' + k;
    }
  }

  // 2. Utility AI Eylem Puanlama Boru Hattı (core.js scoreCombatActions + Rakip Taktik Profil Ağırlıkları)
  const baseScores = typeof scoreCombatActions === 'function' ? scoreCombatActions(me, foe, 0.02) : {};
  const scores = {};

  // Pençe: güvenilir, nefes harcamaz, rakip savunmasız/düşük candayken yüksek fayda
  const finisher01 = RIVAL_CURVES.sigmoid01(1 - foeHp01, 6, 0.35);
  const speedEdge01 = RIVAL_CURVES.linear01((me.ce || 30) - (foe.ce || 30), -25, 25);
  const rPence = (0.48 + 0.22 * finisher01 + 0.14 * speedEdge01) * (W.pence || 1.0);
  scores.pence = baseScores.pence != null ? (baseScores.pence * 0.55 + rPence * 0.45) : rPence;

  // Nefes: 40 nefes ister; element üstünlüğü ve yüksek nefes oranında parlar
  if (me.sta >= NEFES_COST) {
    const elScore01 = RIVAL_CURVES.clamp01((adv - 0.55) / 0.9);
    const staAbund01 = RIVAL_CURVES.linear01(sta01, 0.38, 0.95);
    const notShielded01 = foe.shield || foe.guard ? 0.5 : 1.0;
    const rNefes = RIVAL_CURVES.compensate(elScore01 * staAbund01 * notShielded01, 3) * 0.82 * (W.nefes || 1.0);
    scores.nefes = baseScores.nefes != null && baseScores.nefes >= 0 ? (baseScores.nefes * 0.55 + rNefes * 0.45) : rNefes;
  } else {
    scores.nefes = -1;
  }

  // Kükre: 15 nefes ister; rakip henüz sarsılmamışsa ve dövüşün başı/ortasıysa değerli
  if (me.sta >= 15 && !foe.weak && foeHp01 > 0.28) {
    const intEdge01 = RIVAL_CURVES.linear01((me.ze || 30) - (foe.ze || 30), -25, 25);
    const foeHealthy01 = RIVAL_CURVES.linear01(foeHp01, 0.25, 0.9);
    const rKukre = RIVAL_CURVES.compensate((0.45 + 0.4 * intEdge01) * foeHealthy01, 2) * 0.66 * (W.kukre || 1.0);
    scores.kukre = baseScores.kukre != null && baseScores.kukre >= 0 ? (baseScores.kukre * 0.55 + rKukre * 0.45) : rKukre;
  } else {
    scores.kukre = -1;
  }

  // Savun: can azaldığında, nefes tükendiğinde veya rakip öfkeliyken yükselir
  const lowHpNeed01 = RIVAL_CURVES.quad01(1 - hp01, 1.6);
  const lowStaNeed01 = RIVAL_CURVES.quad01(1 - sta01, 1.8);
  const threat01 = foe.fury || foe.roar ? 0.88 : foe.sta >= 40 ? 0.62 : 0.35;
  const rSavun = RIVAL_CURVES.compensate(Math.max(lowHpNeed01, lowStaNeed01 * 0.85) * threat01, 2) * 0.78 * (W.savun || 1.0);
  scores.savun = baseScores.savun != null ? (baseScores.savun * 0.55 + rSavun * 0.45) : rSavun;

  // Kartları da Utility havuzuna dahil et (core.js hasar/bitirici hesabı + rakip kart ağırlığı)
  for (const k of availCards) {
    const ck = 'card:' + k;
    if (baseScores[ck] != null && baseScores[ck] >= 0.48) {
      scores[ck] = baseScores[ck] * (0.85 + 0.15 * (W.card || 1.0));
    }
  }

  // Histerezis: yakın puanlarda kararsız dalgalanmayı önler, ancak art arda iki savunmayı engeller
  if (me._lastAct && scores[me._lastAct] != null && scores[me._lastAct] > 0) {
    if (me._lastAct === 'savun') scores.savun *= 0.55;
    else scores[me._lastAct] += (prof.hysteresis || 0.06);
  }

  let bestAct = 'pence', bestScore = -1;
  for (const act of Object.keys(scores)) {
    const sc = scores[act] + (Math.random() - 0.5) * 0.06;
    if (sc > bestScore) { bestScore = sc; bestAct = act; }
  }
  me._lastAct = bestAct;
  return bestAct;
}

// Dövüş motoruna taktik profilleri bağla
if (typeof fighterFromOpp === 'function' && !fighterFromOpp._rivalWrapped) {
  const _fighterFromOppBase = fighterFromOpp;
  fighterFromOpp = function (o) {
    const f = _fighterFromOppBase(o);
    const prof = rivalProfileOf(o);
    f.aiProfile = prof.id;
    if (o && o.trainer) {
      const rv = typeof rivals === 'function' ? rivals().find(r => r.sahip === o.trainer || r.id === o.rivalId) : null;
      if (rv) {
        f.aiProfile = rv.aiProfile || prof.id;
        const adaptBonus = Math.min(0.18, (rv.adaptLv || 0) * 0.03);
        if (adaptBonus > 0) {
          f.gu = Math.round(f.gu * (1 + adaptBonus * (prof.statBias.gu || 1)));
          f.ce = Math.round(f.ce * (1 + adaptBonus * (prof.statBias.ce || 1)));
          f.ze = Math.round(f.ze * (1 + adaptBonus * (prof.statBias.ze || 1)));
        }
      }
    }
    return f;
  };
  fighterFromOpp._rivalWrapped = true;
}

if (typeof aiChoose === 'function' && !aiChoose._rivalWrapped) {
  aiChoose = function (me, foe) {
    return rivalUtilityChoose(me, foe);
  };
  aiChoose._rivalWrapped = true;
}

const RIVAL_NEWS = [
  r => `${r.champ.name}, ${r.ad} adına Şehir Arenası'nda üç rakip devirdi.`,
  r => `${ek(r.sahip, 'gen')} ocağında ikiz yumurta çatladı; çarşı bunu konuşuyor.`,
  r => `${r.sahip} pazardan pahalı bir damızlık aldı. ${r.ad} büyüyor.`,
  r => `${r.champ.name} antrenmanda bir kayayı ikiye böldü. Bahisçiler oranları düşürdü.`,
  r => `${r.ad} kötü bir hafta geçirdi: ejderhalarından biri sakatlandı.`,
  r => `${r.sahip}, ${r.champ.name} ile "${(RIVAL_AI_PROFILES[r.aiProfile] || RIVAL_AI_PROFILES.taktik).ad}" üzerine özel talim yaptı.`,
];

function rivals() {
  if (!S) return RIVALS0.map(r => ({ ...r, champ: { ...r.champ } }));
  if (!S.rivals) {
    S.rivals = RIVALS0.map(r => ({
      ...r,
      utilityWeights: { ...(r.utilityWeights || RIVAL_AI_PROFILES[r.aiProfile || 'taktik'].utilityWeights) },
      champ: { ...r.champ },
    }));
  } else {
    // Mevcut kayıtları yeni taktik profillerle ve eksik rakiplerle zenginleştir
    for (const def of RIVALS0) {
      const ex = S.rivals.find(x => x.id === def.id);
      if (!ex) {
        S.rivals.push({ ...def, utilityWeights: { ...def.utilityWeights }, champ: { ...def.champ } });
      } else {
        if (!ex.aiProfile) ex.aiProfile = def.aiProfile;
        if (!ex.utilityWeights) ex.utilityWeights = { ...(def.utilityWeights || RIVAL_AI_PROFILES[ex.aiProfile].utilityWeights) };
        if (ex.adaptLv == null) ex.adaptLv = 0;
        if (ex.champ && !ex.champ.card && def.champ.card) ex.champ.card = def.champ.card;
      }
    }
  }
  return S.rivals;
}

function rivalWeek(gen) {
  const myTopPower = S.dragons && S.dragons.length ? Math.round(Math.max(...S.dragons.map(d => sum(STATS.map(k => d.st[k])) / 4))) : 35;
  for (const r of rivals()) {
    const prof = RIVAL_AI_PROFILES[r.aiProfile] || RIVAL_AI_PROFILES.taktik;
    const bad = chance(12);
    // Adaptif ölçekleme: oyuncu güç veya ünde öne geçerse rakip ocak temposunu artırır
    const powerGap = myTopPower - r.power;
    const adaptBoost = powerGap > 6 ? Math.min(0.9, (powerGap / 18) * (prof.adaptRate || 0.25)) : 0;
    if (powerGap > 8) r.adaptLv = Math.min(6, (r.adaptLv || 0) + 1);
    const delta = bad ? -1 : rnd(r.grow[0], r.grow[1]) + adaptBoost;
    r.power = Math.round((r.power + delta) * 10) / 10;
    r.un += bad ? 0 : ri(0, r.id === 'demirhan' ? 3 : 2);
    if (chance(r.id === 'demirhan' ? 35 : 18)) {
      const newsFn = bad ? RIVAL_NEWS[4] : (adaptBoost > 0.25 && chance(45) ? RIVAL_NEWS[5] : pick(RIVAL_NEWS.slice(0, 4)));
      gen.push(`<span class="news">Haber</span> ${newsFn(r)}`);
    }
  }
  const d = rivals()[0];
  if (S.un > d.un && !S.flags.rivalPassed) {
    S.flags.rivalPassed = 1;
    gen.push(`<span class="news">Haber</span> Çarşıda senin ocağın ${ek(d.ad, 'acc')} geçtiği konuşuluyor. Demirhan'ın keyfi kaçmış.`);
    d.grow = [d.grow[0] + 0.3, d.grow[1] + 0.3];
    d.adaptLv = Math.min(6, (d.adaptLv || 0) + 1);
  }
}

function rivalBeaten(id, amt = 5) {
  const r = rivals().find(x => x.id === id);
  if (r) {
    r.power -= amt;
    r.un = Math.max(0, r.un - 2);
    r.adaptLv = Math.min(6, (r.adaptLv || 0) + 1);
  }
}

function rankList() {
  const me = { me: true, ad: 'Senin ocağın', sahip: 'Sen', un: S.un, power: S.dragons.length ? Math.round(Math.max(...S.dragons.map(d => sum(STATS.map(k => d.st[k])) / 4))) : 0 };
  return [me, ...rivals()].sort((a, b) => b.un - a.un);
}

function rankModal() {
  const L = rankList();
  showModal(`<div class="parch rankm"><p class="kicker">Ocaklar sıralaması · Hafta ${S.week}</p><h2>Ün Tablosu</h2>
    <table class="rtab"><tr><th>#</th><th>Ocak</th><th>Taktik Üslup</th><th>Ün</th><th>Şampiyon gücü</th></tr>${L.map((r, i) => {
      const prof = r.aiProfile && RIVAL_AI_PROFILES[r.aiProfile];
      return `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td><b>${esc(r.ad)}</b><small>${esc(r.sahip)}${r.champ ? ` · ${esc(r.champ.name)} (${EL_AD[r.champ.el]})` : ''}</small></td><td><small>${r.me ? 'Senin Komutanlığın' : esc(prof ? prof.ad : 'Dengeli')}</small></td><td>${r.un}</td><td>~${Math.round(r.power)}</td></tr>`;
    }).join('')}</table>
    <p class="mute sm">Şampiyon gücü, ocağın en iyi ejderhasının dört değerinin ortalamasıdır. Rakip terbiyeciler kendilerine özgü taktik yapay zekâ profilleriyle dövüşür ve ocağının yükselişine göre antrenman temposunu artırır.</p>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div></div>`, 'paper');
}
