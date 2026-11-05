'use strict';
/* ============ EJDER OCAĞI — SOY KÜTÜĞÜ, İLK KEŞİF (CODEX) VE HİBRİT UYANIŞ ============ */

const HYBRID_MAP = {
  'ates+buz': {
    k: 'ates+buz', ad: 'Kızıl Buhar', card: 'kizil_buhar',
    cardAd: 'Buhar Perdesi', cardK: 'nefes ×1.8 + rakip sarsılır',
    d: 'Ateş ve buzun çarpışmasıyla yoğun kızıl buhar püskürtür; rakibin görüşünü kapatıp isabetini kırar ve 2 tur sarsar.',
    bonus: 'Buzul ve Kül seferlerinde yorgunluk %25 azalır.',
  },
  'ates+toprak': {
    k: 'ates+toprak', ad: 'Magma Yüreği', card: 'magma_zirh',
    cardAd: 'Magma Zırhı', cardK: 'kalkan + nefes ×1.5',
    d: 'Erimiş kaya kabuğuyla 2 tur hasarı %60 azaltır ve rakibe yakıcı magma darbesi indirir.',
    bonus: 'Kül ve Tuz Çölü seferlerinde +25 altın ganimet.',
  },
  'ates+firtina': {
    k: 'ates+firtina', ad: 'Plazma Yıldırımı', card: 'plazma_akimi',
    cardAd: 'Plazma Akımı', cardK: 'kesin kritik nefes ×2.2',
    d: 'Gökyüzünü yaran elektrikli alev sütunu; zırhı deler ve kesin kritik hasar verir.',
    bonus: 'Yıldırım Kuleleri ve Fırtına Kayalıkları seferlerinde hız bonusu.',
  },
  'buz+firtina': {
    k: 'buz+firtina', ad: 'Tipi Kanat', card: 'dondurucu_bora',
    cardAd: 'Dondurucu Bora', cardK: 'nefes ×1.7 + 1 tur dondurur',
    d: 'Jilet gibi keskin buz fırtınası rakibi dondurarak 1 tur hamle yapmasını engeller.',
    bonus: 'Gök yarışlarında depar (atılım) daha az yorar.',
  },
  'buz+toprak': {
    k: 'buz+toprak', ad: 'Permafrost Kale', card: 'kadim_buzul',
    cardAd: 'Kadim Buzul', cardK: 'can +%25 + 2 tur zırh',
    d: 'Asırlık donmuş toprak zırhıyla canının %25\'ini yeniler ve 2 tur boyunca hasarı %60 sönümler.',
    bonus: 'Yaralanma ihtimalini yarıya indirir.',
  },
  'firtina+toprak': {
    k: 'firtina+toprak', ad: 'Manyetik Kum', card: 'kum_hortumu',
    cardAd: 'Manyetik Kum Hortumu', cardK: '2 sıyrılma + pençe ×1.6',
    d: 'Demir tozlu kum fırtınası kaldırarak 2 saldırıdan sıyrılır ve sert bir karşı darbe vurur.',
    bonus: 'Serap Tuz Çölü ve Fırtına Kayalıkları\'nda ekstra ganimet.',
  },
  'ates+golge': {
    k: 'ates+golge', ad: 'Kara Alev', card: 'kara_alev',
    cardAd: 'Kara Alev Sömürüsü', cardK: 'nefes ×2 + can çalma',
    d: 'Ruhu yakan siyah alevler; verdiği hasarın %40\'ı kadar kendi canını iyileştirir.',
    bonus: 'Obsidiyen Mağaraları ve Çukur dövüşlerinde +%15 hasar.',
  },
  'buz+golge': {
    k: 'buz+golge', ad: 'Ayaz Tayfı', card: 'ayaz_tayfi',
    cardAd: 'Ayaz Tayfı', cardK: '2 sıyrılma + 1 tur sersem',
    d: 'Sis ve gölgeye karışarak 2 darbeden sıyrılır ve rakibi soğuk korkuyla 1 tur dondurur.',
    bonus: 'Gölge Bataklığı ve Mercan Uçurumu\'nda gizlilik sağlar.',
  },
  'firtina+golge': {
    k: 'firtina+golge', ad: 'Gece Fırtınası', card: 'gece_yildirimi',
    cardAd: 'Gece Yıldırımı', cardK: '3 hızlı pençe + +30 nefes',
    d: 'Karanlığın içinden üç şimşek pençesi indirir ve nefes enerjisini doldurur.',
    bonus: 'Yarış ve seferlerde ilk hamle önceliği.',
  },
  'toprak+golge': {
    k: 'toprak+golge', ad: 'Obsidiyen Muhafız', card: 'obsidiyen_kalkan',
    cardAd: 'Obsidiyen Mühür', cardK: 'dokunulmazlık + karşı hasar',
    d: 'Bu tur hiçbir hasar almaz, nefesini doldurur ve rakibin saldırısını geri yansıtır.',
    bonus: 'Ocak Muhafızı iken savunma gücü +%20 artar.',
  },
};

// Hibrit kartları genel CARDS sözlüğüne kaydet
for (const hk in HYBRID_MAP) {
  const H = HYBRID_MAP[hk];
  CARDS[H.card] = { k: H.cardK, ad: H.cardAd, el: hk.split('+')[0], hybrid: true, d: H.d };
}

// doCard fonksiyonunu hibrit kartları destekleyecek şekilde genişlet
const _origDoCard = doCard;
doCard = function(F, a, t, k) {
  if (k === 'kizil_buhar') {
    a.sta += NEFES_COST;
    const e = attack(a, t, 'nefes', 1.85);
    t.weak = Math.max(t.weak || 0, 2);
    return { ...e, act: 'card', card: k };
  }
  if (k === 'magma_zirh') {
    a.shield = 2; a.sta += NEFES_COST;
    const e = attack(a, t, 'nefes', 1.5);
    return { ...e, act: 'card', card: k };
  }
  if (k === 'plazma_akimi') {
    a.sta += NEFES_COST; a.forceCrit = true;
    const e = attack(a, t, 'nefes', 2.2);
    a.forceCrit = false;
    return { ...e, act: 'card', card: k };
  }
  if (k === 'dondurucu_bora') {
    a.sta += NEFES_COST;
    const e = attack(a, t, 'nefes', 1.7);
    t.stun = 1;
    return { ...e, act: 'card', card: k };
  }
  if (k === 'kadim_buzul') {
    const h = Math.round(a.maxHp * 0.25);
    a.hp = Math.min(a.maxHp, a.hp + h);
    a.shield = 2;
    return { who: a.side, act: 'card', card: k, heal: h };
  }
  if (k === 'kum_hortumu') {
    a.evade = 2;
    const e = attack(a, t, 'pence', 1.6);
    return { ...e, act: 'card', card: k };
  }
  if (k === 'kara_alev') {
    a.sta += NEFES_COST;
    const e = attack(a, t, 'nefes', 2.0);
    const h = Math.round((e.dmg || 12) * 0.4);
    a.hp = Math.min(a.maxHp, a.hp + h);
    return { ...e, act: 'card', card: k, heal: h };
  }
  if (k === 'ayaz_tayfi') {
    a.evade = 2; t.stun = 1;
    return { who: a.side, act: 'card', card: k };
  }
  if (k === 'gece_yildirimi') {
    const e1 = attack(a, t, 'pence', 0.9);
    const e2 = t.hp > 0 ? attack(a, t, 'pence', 0.9) : { dmg: 0, miss: true };
    const e3 = t.hp > 0 ? attack(a, t, 'pence', 0.9) : { dmg: 0, miss: true };
    a.sta = Math.min(100, a.sta + 30);
    return {
      who: a.side, act: 'card', card: k,
      dmg: (e1.dmg || 0) + (e2.dmg || 0) + (e3.dmg || 0),
      crit: e1.crit || e2.crit || e3.crit,
      hits: [e1, e2, e3].filter(x => !x.miss).length,
    };
  }
  if (k === 'obsidiyen_kalkan') {
    a.immune = true; a.sta = Math.min(100, a.sta + 40);
    const e = attack(a, t, 'pence', 1.35);
    return { ...e, act: 'card', card: k };
  }
  return _origDoCard(F, a, t, k);
};

function hybridKeyOf(d) {
  if (!d || !d.genes || !d.genes.el) return null;
  const [e1, e2] = d.genes.el;
  if (!e1 || !e2 || e1 === e2) return null;
  const pair = [e1, e2].sort().join('+');
  return HYBRID_MAP[pair] ? pair : null;
}

function hybridInfo(d) {
  const k = d.hybrid || hybridKeyOf(d);
  return k ? HYBRID_MAP[k] : null;
}

function canAwakenHybrid(d) {
  if (!d || d.dead || d.hybrid) return false;
  if (d.stage !== 'yetiskin') return false;
  const hk = hybridKeyOf(d);
  if (!hk) return false;
  return d.bond >= 50 || hasB('lab');
}

function awakenCost(d) {
  return hasB('lab') ? 140 : 220;
}

function awakenHybrid(d) {
  const hk = hybridKeyOf(d);
  if (!hk) return null;
  const H = HYBRID_MAP[hk];
  d.hybrid = hk;
  d.cards = d.cards || [];
  if (!d.cards.includes(H.card)) {
    if (d.cards.length >= CARD_MAX) d.cards[CARD_MAX - 1] = H.card;
    else d.cards.push(H.card);
  }
  // Stat bonusu
  for (const k of STATS) d.st[k] = Math.min(capOf(d, k) + 8, d.st[k] + 5);
  S.un += 4;
  linReg(d);
  titleCheck(d);
  chron(`${d.name} içindeki çekinik kanı uyandırarak "${H.ad}" melezine dönüştü!`);
  snapAlbum('hybrid', H.ad, `${d.name} çift element rezonansına ulaştı: ${H.ad}!`, d);
  return H;
}

/* ---------- Küresel Soy Kütüğü & İlk Keşif (World First Codex) ---------- */
function phenoHash(d) {
  if (!d || !d.genes) return 'std';
  const p = pulOf(d), s = susOf(d), g = pigOf(d), pr = parOf(d) ? 'P' : 'p', b = boyOf(d);
  const ec = eyeColor(d), pt = d.pat || expPat(d.genes.pat);
  const hy = d.hybrid || 'saf';
  return `${d.el}:${hy}:${g}:${pr}:${p.k}:${s.k}:${pt}:${ec}:${b}`;
}

function phenoTitle(d) {
  const p = pulOf(d), s = susOf(d), g = pigOf(d), pr = parOf(d);
  const parts = [];
  if (g !== 'N') parts.push(PIG_AD[g]);
  if (pr) parts.push('Parıltılı');
  if (!p.native) parts.push(p.ad + ' Pullu');
  if (!s.native) parts.push(s.ad + ' Süslü');
  if (d.hybrid && HYBRID_MAP[d.hybrid]) parts.push(HYBRID_MAP[d.hybrid].ad);
  else parts.push(EL_AD[d.el]);
  return parts.join(' ');
}

// Sunucudaki diğer oyuncuların daha önce keşfettiği bazı ünlü soylar (Codex başlangıç verisi)
const SEED_CODEX = [
  { hash: 'ates:saf:N:p:kizil:altin:C:kehribar:1', title: 'Kızıl Pullu Altın Süslü Ateş', by: '@demirhan_ocagi', w: 1, rarity: 48 },
  { hash: 'buz:saf:a:P:n:inci:B:mavi:0', title: 'Ak Parıltılı İnci Süslü Buz', by: '@kuzey_rüzgari', w: 1, rarity: 92 },
  { hash: 'golge:ates+golge:m:P:mor:kizil:CB:kizil:1', title: 'Kara Parıltılı Mor Pullu Kara Alev', by: '@gece_bekcisi', w: 1, rarity: 115 },
  { hash: 'firtina:buz+firtina:N:P:gok+zumrut:altin:C:altin:0', title: 'Parıltılı Gök-zümrüt Pullu Tipi Kanat', by: '@selin_harita', w: 1, rarity: 88 },
];

function ensureCodex() {
  if (!S) return {};
  if (!S.codex) {
    S.codex = {};
    for (const c of SEED_CODEX) S.codex[c.hash] = { ...c };
  }
  if (!S.handle) S.handle = '@ejder_ocagi';
  return S.codex;
}

function codexCheck(d, silent = false) {
  if (!S || !d || !d.genes) return false;
  const C = ensureCodex();
  const h = phenoHash(d);
  d.phenoHash = h;
  if (!d.breeder) d.breeder = d.origin && d.origin.includes('@') ? d.origin.match(/@[\w_]+/)[0] : (S.handle || '@ejder_ocagi');
  const rScore = eleganceGenScore(d).total;
  if (rScore < 25) return false; // Sadece belirgin genetik kombinasyonlar Küresel Ansiklopedi'ye girer
  if (!C[h]) {
    const title = phenoTitle(d);
    C[h] = {
      hash: h,
      title,
      by: d.breeder || S.handle || '@ejder_ocagi',
      dName: d.name,
      w: S.week,
      rarity: rScore,
      snap: dSnap(d),
    };
    d.worldFirst = true;
    if (!silent) {
      S.un += 3;
      chron(`İLK KEŞİF! "${title}" soyu (${d.name}) küresel ansiklopediye senin adınla kazındı! (+3 Ün)`);
      if (typeof toast === 'function') setTimeout(() => toast(`<b>KÜRESEL İLK KEŞİF!</b><br>${esc(title)} soyunu dünyada ilk kez sen ürettin! (+3 Ün)`, 'goal'), 600);
    }
    return true;
  }
  return false;
}

// Zarafet ve Genetik Nadirlik Hesaplayıcı
function eleganceGenScore(d) {
  if (!d || !d.genes) return { total: 10, items: [] };
  const items = [];
  let score = 15;
  const g = pigOf(d), pr = parOf(d), p = pulOf(d), s = susOf(d), b = boyOf(d), ec = eyeColor(d);
  const pat = d.pat || expPat(d.genes.pat);

  if (g === 'am') { score += 55; items.push(['Dumanlı (Ak+Kara Çift Çekinik)', 55]); }
  else if (g === 'a') { score += 42; items.push(['Ak (Albino Pigment)', 42]); }
  else if (g === 'm') { score += 38; items.push(['Kara (Melanistik Pigment)', 38]); }

  if (pr) { score += 40; items.push(['Yıldız Parıltılı Pul (P)', 40]); }

  if (p.mix) { score += 28; items.push([`Melez Pul Rengi (${p.ad})`, 28]); }
  else if (!p.native) { score += 14; items.push([`Nadir Pul (${p.ad})`, 14]); }

  if (s.mix) { score += 26; items.push([`Melez Süs Rengi (${s.ad})`, 26]); }
  else if (!s.native) { score += 12; items.push([`Nadir Süs (${s.ad})`, 12]); }

  if (p.mix && s.mix) { score += 20; items.push(['Prizmatik Çift Karışım Uyumu', 20]); }
  else if (!p.native && p.k === s.k) { score += 18; items.push(['Monokrom Renk Uyumu', 18]); }

  if (pat === 'CB') { score += 22; items.push(['Çizgili-Benekli Kaplan Deseni', 22]); }
  else if (pat === 'C' || pat === 'B') { score += 8; items.push([PAT_AD[pat] + ' Desen', 8]); }

  if (ec === 'kizil') { score += 26; items.push(['Çekinik Kızıl Göz', 26]); }
  else if (ec === 'altin') { score += 16; items.push(['Altın Göz', 16]); }
  if (d.eye === 'A') { score += 15; items.push(['Parlak Altın Hare (AA)', 15]); }

  if (Math.abs(b) === 2) { score += 18; items.push([`${BOY_AD[b]} Boyut (${b > 0 ? '+2' : '-2'})`, 18]); }

  if (d.hybrid && HYBRID_MAP[d.hybrid]) {
    score += 32;
    items.push([`Çift Element Rezonansı (${HYBRID_MAP[d.hybrid].ad})`, 32]);
  }
  if (d.gen >= 2) {
    const gb = Math.min(25, (d.gen - 1) * 7);
    score += gb;
    items.push([`${d.gen}. Kuşak Asil Soy`, gb]);
  }
  return { total: score, items };
}

// Yeni unvanları TITLES listesine ekle
if (typeof TITLES !== 'undefined') {
  TITLES.unshift(
    { k: 'saray_incisi', ad: 'Saray İncisi', c: d => (d.pageantW || 0) >= 1 },
    { k: 'melez_efsaneleri', ad: d => d.hybrid && HYBRID_MAP[d.hybrid] ? HYBRID_MAP[d.hybrid].ad : 'Çift Kanlı', c: d => !!d.hybrid },
    { k: 'ilk_kesif', ad: 'İlk Keşif Soyu', c: d => !!d.worldFirst }
  );
}

const LINEAGE_ACT = {
  'awaken-hybrid'(el) {
    const d = byId(el.dataset.id || UI.sel);
    if (!d || !canAwakenHybrid(d)) return;
    const cost = awakenCost(d);
    if (S.gold < cost) { SFX.play('error'); toast('Hibrit uyanışı için altın yetersiz.'); return; }
    S.gold -= cost;
    const H = awakenHybrid(d);
    codexCheck(d);
    SFX.play('win');
    FX.burst(innerWidth / 2, innerHeight / 2, '#ffd25e', 36);
    toast(`<b>${esc(d.name)}</b> içindeki ikinci elementi uyandırdı: <b>${H.ad}</b>! Yeni yetenek: <b>${H.cardAd}</b>.`);
    afterAction();
  },
  'codex-open'() {
    pushModal(codexModal);
  },
};

function codexModal() {
  UI.modalRedraw = codexModal;
  const C = ensureCodex();
  if (S && S.dragons) S.dragons.forEach(d => codexCheck(d, true));
  const list = Object.values(C).sort((a, b) => b.rarity - a.rarity);
  const myCount = list.filter(x => x.by === (S.handle || '@ejder_ocagi')).length;
  const grid = pager('codex', list, PER(6, 2), item => `
    <div class="codex-card ${item.by === (S.handle || '@ejder_ocagi') ? 'mine' : ''}">
      <div class="codex-art">${item.snap ? dragonSVG(item.snap, { still: true }) : ''}</div>
      <div class="codex-info">
        <span class="codex-badge">${item.by === (S.handle || '@ejder_ocagi') ? 'SENİN KEŞFİN' : 'SOY KAYDI'} · Nadirlik ${item.rarity}</span>
        <b>${esc(item.title)}</b>
        <small>İlk Yetiştiren: <b>${esc(item.by)}</b> ${item.dName ? `(${esc(item.dName)})` : ''} · Hafta ${item.w}</small>
      </div>
    </div>
  `);
  showModal(`<div class="parch">
    <p class="kicker">Kraliyet Soy Kütüğü</p>
    <h2>Nadir Soylar ve İlk Keşifler Defteri</h2>
    <p class="mute sm">Diyarda daha önce görülmemiş nadir soy ve renk bileşimlerini ilk kez yetiştiren ocaklar buraya kaydedilir. Senin keşiflerin: <b>${myCount}</b> / ${list.length}</p>
    <div style="margin:12px 0">${grid}</div>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div>
  </div>`, 'paper wide');
}
