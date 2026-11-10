'use strict';
/* ============ EJDER OCAĞI — KERVANSARAY SOSYAL MEYDANI, DAMIZLIK, DÜNYA BOSS'U, KERVAN SAVAŞLARI & YENİ HARİTALAR ============ */

// 1. Yeni Bölgeleri REGIONS, MAP_POS ve SEFER_LOCAL tablolarına ekle
Object.assign(REGIONS, {
  col: {
    ad: 'Serap Tuz Çölü', el: 'ates', fiyat: 45, unReq: 10,
    d: 'Kavurucu güneş altında parlayan altın tuz kristalleri ve serap vahası. Altın ve Kehribar genlerinin vatanı.',
  },
  mercan: {
    ad: 'Batık Mercan Uçurumu', el: 'buz', fiyat: 50, unReq: 15,
    d: 'Fosforlu mercan kayalıkları ve sisli antik tapınak kıyıları. Gül, Gök ve İnci süs genleri burada bulunur.',
  },
  bulut: {
    ad: 'Yıldırım Kuleleri', el: 'firtina', fiyat: 65, unReq: 25,
    d: 'Bulutların üstünde süzülen kadim şimşek dikilitaşları. Parıltılı (P) gen ve efsanevi rüzgâr yavruları barındırır.',
  },
  obsidiyen: {
    ad: 'Obsidiyen Mağaraları', el: 'golge', fiyat: 80, unReq: 35,
    d: 'Yerin yedi kat altında kızıl rünlerle parlayan volkanik cam mağaralar. Ak/Kara pigment ve Kızıl Gözlü ejderhaların ini.',
  },
});

Object.assign(MAP_POS, {
  col: [580, 720],
  mercan: [1380, 690],
  bulut: [1220, 185],
  obsidiyen: [195, 420],
});

if (typeof SEFER_LOCAL !== 'undefined') {
  Object.assign(SEFER_LOCAL, {
    col: {
      t: 'Tuz kristallerinin arasında parıldayan bir serap göleti ve altın kum yuvası.',
      o: [
        { t: 'Altın kristalleri topla', fx: () => { S.gold += 75; S.food.biber += 2; return '+75 altın ve +2 Ateş Biberi buldun.'; } },
        { t: 'Kumun altındaki sıcak yuvayı kaz', fx: e => {
          if (chance(55)) {
            const g = randomGenes({ q: 0.42, el: chance(60) ? 'ates' : 'toprak' });
            g.pul = ['altin', pick(['altin', 'kizil', 'zumrut'])];
            g.eyec = ['altin', 'kehribar'];
            S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: ['kor'], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Serap Tuz Çölü\'nde bulundu' });
            return 'Altın hareli sıcak bir çöl yumurtası buldun!';
          }
          e.fat = clamp(e.fat + 12, 0, 100);
          return 'Kum fırtınası izleri örttü ama +35 altın değerinde kehribar buldun.';
        } },
      ],
    },
    mercan: {
      t: 'Gelgit çekildiğinde ortaya çıkan fosforlu mercan kemeri ve dev inci istiridyeleri.',
      o: [
        { t: 'İnci kabuklarını ve balıkları topla', fx: () => { S.gold += 65; S.food.balik += 3; S.food.kar += 2; return '+65 altın, +3 Taze Balık ve +2 Kar Meyvesi.'; } },
        { t: 'Batık tapınak sunağındaki yumurtaya uzan', fx: () => {
          if (chance(55)) {
            const g = randomGenes({ q: 0.45, el: chance(65) ? 'buz' : 'firtina' });
            g.pul = ['gok', 'zumrut'];
            g.sus = ['inci', 'gul'];
            S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: ['sabirli'], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Batık Mercan Uçurumu\'nda bulundu' });
            return 'Turkuaz ve inci parıltılı nadir bir mercan yumurtası!';
          }
          S.gold += 45;
          return 'Sunakta yumurta yoktu ama eski bir gümüş kadeh buldun (+45 altın).';
        } },
      ],
    },
    bulut: {
      t: 'Bulutların üstündeki dikilitaşta yıldırım çakıyor; rüzgâr akımı çok sert.',
      o: [
        { t: 'Yıldırım kristallerini süzülerek topla (ÇEV testi)', fx: e => {
          if (e.st.ce >= 45 || chance(50)) { S.gold += 95; S.un += 3; S.food.mantar += 3; return `${e.name} rüzgârı yarıp geçti! +95 altın, +3 ün ve +3 Yıldırım Mantarı.`; }
          e.fat = clamp(e.fat + 15, 0, 100);
          return 'Akım çok sertti, geri döndünüz.';
        } },
        { t: 'Kule tepesindeki parıltılı yuvaya çık', fx: () => {
          const g = randomGenes({ q: 0.5, el: 'firtina' });
          g.par = ['P', 'p'];
          g.pul = ['mor', 'altin'];
          S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: ['kartal'], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Yıldırım Kuleleri\'nde bulundu' });
          return 'Kabuğu yıldız tozu gibi parıldayan (Parıltı Genli) bir yumurta buldun!';
        } },
      ],
    },
    obsidiyen: {
      t: 'Karanlık obsidiyen sütunların arasında kadim ejderha rünleri kor gibi yanıyor.',
      o: [
        { t: 'Kadim rünlerden Anka Külü ve Gölge cevheri çıkar', fx: () => {
          S.gold += 110; S.food.zambak += 3;
          if (chance(45)) { S.inv.push({ uid: S.uid++, id: 'til4' }); return '+110 altın, +3 Gece Zambağı ve efsanevi bir Anka Külü Tılsımı buldun!'; }
          return '+110 altın ve +3 Gece Zambağı topladın.';
        } },
        { t: 'Obsidiyen mahzendeki mühürlü yumurtayı al', fx: () => {
          const g = randomGenes({ q: 0.55, el: 'golge' });
          g.pig = chance(50) ? ['a', 'a'] : ['m', 'm'];
          g.eyec = ['kizil', 'kizil'];
          S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: ['asil', 'kor'], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Obsidiyen Mağaraları\'nda bulundu' });
          return 'Kızıl hareli, saf Ak/Kara pigmentli efsanevi bir Obsidiyen Yumurtası!';
        } },
      ],
    },
  });
}

/* ---------- HAFTALIK KÜRESEL DÜNYA KIRILMALARI (TEKRARA DÜŞMEYİ ÖNLEYEN DEĞİŞKENLER) ---------- */
const WORLD_EVENTS = [
  { k: 'kanli_ay', ad: 'Kanlı Ay Tutulması', icon: '', d: 'Gölge ve Ateş ejderhalarının hasarı +%15 artar; Çukur ve Ocak Baskını ganimetleri +%25 yükselir.', el: 'golge', raidMult: 1.25 },
  { k: 'yildiz_kaymasi', ad: 'Yıldız Kayması Gecesi', icon: '', d: 'Yuva çiftleştirmelerinde Parıltılı (P) ve Melez Renk mutasyon şansı 2 katına çıkar; Kuluçka hızlanır.', el: 'firtina', mutMult: 2 },
  { k: 'kraliyet_affi', ad: 'Kraliyet Merasim Haftası', icon: '', d: 'Saray Zarafet Merasimi ödülleri ve Soy Telifi +%30 artar; çarşıda yem fiyatları ucuzlar.', el: 'buz', sarayMult: 1.3 },
  { k: 'kervan_akini', ad: 'Altın İpek Kervanları', icon: '', d: 'Lonca Kervanlarının taşıdığı altın yükü +%35 artar; Sefer patikalarında fazladan hazine çıkar.', el: 'toprak', caravanMult: 1.35 },
  { k: 'firtina_cephesi', ad: 'Yıldırım Cephesi', icon: '', d: 'Gök Yarışlarında rüzgâr koridorları güçlenir; Çeviklik ve Dayanıklılık antrenmanları +%25 verimli geçer.', el: 'firtina', trainBonus: 1.25 },
  { k: 'volkanik_uyanıs', ad: 'Kül Yutan\'ın Öfkesi', icon: '', d: 'Dünya Boss\'u Kül Yutan\'a yapılan taarruzlarda altın ödülü +%40 artar; Ateş nefesleri güçlenir.', el: 'ates', bossMult: 1.4 },
  { k: 'zumrut_cig', ad: 'Zümrüt Çiğ Bereketi', icon: '', d: 'Ortak Kaplıcalar ve Dinlenme tüm yorgunluğu sıfırlar; seferlerde nadir yumurta bulma şansı artar.', el: 'toprak', eggBonus: 15 },
  { k: 'buzul_pariltisi', ad: 'Kutup Aurora Gecesi', icon: '', d: 'Buz ve Fırtına melezlerinin kritiği artar; Gece Çarşısı müzayedesine ekstra nadir lotlar düşer.', el: 'buz', critBonus: 10 },
];

function currentWorldEvent(w) {
  const wk = (w || (S && S.week) || 1) - 1;
  return WORLD_EVENTS[wk % WORLD_EVENTS.length];
}

// İzometrik Ocaktaki Binalardan Gelen Savunma & Muhafız Bonusu Hesaplayıcı
function calcOcakDefenseBonus() {
  if (!S || !S.grid) return { total: 10, items: [] };
  const star = byId(S.star) || S.dragons[0];
  let bonus = 10;
  const items = [];
  let fenerCnt = 0, heykelCnt = 0, elShrineCnt = 0;
  for (const cell of S.grid) {
    if (!cell.b) continue;
    if (cell.b === 'fener') fenerCnt++;
    if (cell.b === 'heykel') heykelCnt++;
    if (star && BUILD[cell.b] && BUILD[cell.b].el === star.el) elShrineCnt++;
    if (cell.b === 'sifa') { bonus += 6; items.push('Şifahane (+%6 Can)'); }
    if (cell.b === 'talim') { bonus += 5; items.push('Talim Meydanı (+%5 Hasar)'); }
  }
  if (fenerCnt) { const b = Math.min(12, fenerCnt * 3); bonus += b; items.push(`${fenerCnt}× Fener (+%${b} İsabet)`); }
  if (heykelCnt) { const b = Math.min(18, heykelCnt * 6); bonus += b; items.push(`${heykelCnt}× Ejder Heykeli (+%${b} Moral/Zırh)`); }
  if (elShrineCnt && star) { const b = Math.min(24, elShrineCnt * 8); bonus += b; items.push(`${elShrineCnt}× ${EL_AD[star.el]} Sunağı (+%${b} Element Gücü)`); }
  return { total: bonus, items };
}

// Bölge Sancakları (Hangi lonca/oyuncu hangi bölgenin hakimi)
const REGION_BANNERS = {
  kul: { owner: '@altin_kervan', guild: 'Tuz Tacirleri', tax: 5 },
  buzul: { owner: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', tax: 5 },
  kayalik: { owner: '@selin_harita', guild: 'Gökyüzü Kaşifleri', tax: 5 },
  orman: { owner: '@yesil_vadi', guild: 'Kök Kardeşliği', tax: 5 },
  bataklik: { owner: '@gece_bekcisi', guild: 'Alacakaranlık', tax: 5 },
  col: { owner: '@altin_kervan', guild: 'Tuz Tacirleri', tax: 5 },
  mercan: { owner: '@leydi_sureyya', guild: 'İnci Hanedanı', tax: 5 },
  bulut: { owner: '@firtina_beyi', guild: 'Bulut Binicileri', tax: 5 },
  obsidiyen: { owner: '@cukur_agasi', guild: 'Kara Elmas', tax: 5 },
};

function getRegionBanner(r) {
  if (!S) return REGION_BANNERS[r];
  S.banners = S.banners || {};
  if (S.banners[r]) return S.banners[r];
  return REGION_BANNERS[r] || { owner: '@gezgin', guild: 'Bağımsız', tax: 0 };
}

/* ---------- DÜĞÜM TABANLI (NODE-BASED) SEFER HARİTASI ---------- */
let NODE_EX = null;

function buildSeferNodes(r) {
  const R = REGIONS[r];
  const ban = getRegionBanner(r);
  const campOwner = ban ? ban.owner : '@gezgin_ocak';
  return [
    {
      step: 0, kind: 'start', title: `${R.ad} Girişi`,
      desc: `Bölge Sancağı: ${ban.guild} (${ban.owner}). Patika ikiye ayrılıyor; hangi rotadan ilerleyeceksin?`,
      choices: [
        { next: 1, label: 'Üst Patika: Kayalık Geçit (Yüksek Ödül & Nitelik Testi)', tag: 'Tehlikeli Rota' },
        { next: 2, label: 'Alt Patika: Gezginlerin Kamp İzi (Sosyal Kamp & Yem)', tag: 'Güvenli Rota' },
      ],
    },
    {
      step: 1, kind: 'hazard', title: 'Sarp Geçit ve Element Akımı',
      desc: `${R.ad} derinliklerinde doğa güçleri yolunu kesiyor. Eskort ejderhanın gücü ve çevikliği sınanacak.`,
      Resolve(e) {
        const score = e.st.gu + e.st.ce + (e.el === R.el ? 25 : 0) + (e.hybrid ? 20 : 0);
        const stoneDrops = { kor_t1: ri(1, 2) };
        if (chance(20)) stoneDrops.kor_t2 = 1;
        const stoneTxt = typeof awardChibiStones === 'function' ? awardChibiStones(stoneDrops) : '';
        if (score >= 70 || chance(65)) {
          const g = 55 + ri(10, 35);
          S.gold += g; S.un += 2;
          return { ok: true, msg: `<b class="good">Geçidi ustalıkla aştın!</b> Kayalıkların arasındaki zuladan <b>+${g} altın</b>, <b>+2 ün</b>${stoneTxt ? ` ve <b>${stoneTxt}</b>` : ''} kazandın.` };
        }
        e.fat = clamp(e.fat + 14, 0, 100);
        S.gold += 25;
        return { ok: false, msg: `Sert rüzgâr ${esc(e.name)} için yorucu oldu (+14 yorgunluk) ama yine de <b>+25 altın</b>${stoneTxt ? ` ve <b>${stoneTxt}</b>` : ''} buldun.` };
      },
      next: 3,
    },
    {
      step: 2, kind: 'camp', title: `Sönmemiş Kamp Ateşi (${campOwner})`,
      desc: `Az önce buradan geçen <b>${campOwner}</b> ocağının kamp ateşi hâlâ tütüyor. Yanında erzak sepeti ve köz bırakmışlar.`,
      Resolve(e) {
        e.fat = clamp(e.fat - 18, 0, 100);
        addMood(e, 1);
        const fk = EL_FOOD[R.el] || 'balik';
        S.food[fk] = (S.food[fk] || 0) + 2;
        const stoneDrops = { kor_t1: 1 };
        if (chance(20)) stoneDrops.kor_t2 = 1;
        const stoneTxt = typeof awardChibiStones === 'function' ? awardChibiStones(stoneDrops) : '';
        return { ok: true, msg: `<b class="good">Kamp ateşinde dinlendin!</b> ${esc(e.name)} yorgunluğunu attı (-18 yorgunluk, +1 moral), heybesine <b>+2 ${FOODS[fk].ad}</b>${stoneTxt ? ` ve <b>${stoneTxt}</b>` : ''} eklendi.` };
      },
      next: 3,
    },
    {
      step: 3, kind: 'local', title: `${R.ad} Kalbi — Nadir Keşif`,
      desc: (SEFER_LOCAL[r] && SEFER_LOCAL[r].t) || 'Bölgenin en derin noktasında kadim bir iz belirdi.',
      localOpts: (SEFER_LOCAL[r] && SEFER_LOCAL[r].o) || [],
      next: 4,
    },
    {
      step: 4, kind: 'wild', title: 'Yaban Ejderhası & Bölge Sancağı',
      desc: 'Patikanın sonunda bölgenin vahşi hakimiyle karşılaştın!',
    },
  ];
}

function startNodeSefer(r, e) {
  if (S && S.coopPartner) {
    toast(`<b>Ortak Sefer Başladı</b><br>${esc(S.coopPartner.handle)} (${esc(S.coopPartner.dName)}) keşifte sana eşlik ediyor (+20 altın keşif payı).`);
    S.gold += 20;
    S.coopPartner = null;
  }
  const R = REGIONS[r];
  S.gold -= seferCost(r);
  S.st.seferler++;
  S.regionCount = S.regionCount || {};
  S.regionCount[r] = (S.regionCount[r] || 0) + 1;
  if (S.regionCount[r] >= 2) {
    S.banners = S.banners || {};
    S.banners[r] = { owner: S.handle || '@ejder_ocagi', guild: (S.guild || 'Kızıl Ocak Birliği'), tax: 5, mine: true };
    if (typeof mpSyncState === 'function') mpSyncState();
  }
  e.task = { t: 'done', what: `${R.ad} seferine çıktı` };
  e.dirt = clamp((e.dirt || 0) + 20, 0, 100);
  EX = { r, e, cards: seferCards(r), i: 0, wild: null, res: null };
  NODE_EX = { r, e, nodes: buildSeferNodes(r), cur: 0, res: null, visited: [0] };
  renderNodeSefer();
}

function renderNodeSefer() {
  if (!NODE_EX) return;
  const { r, e, nodes, cur, res, visited } = NODE_EX;
  const R = REGIONS[r];
  const N = nodes[cur];
  if (N.kind === 'wild') {
    if (S.regionCount && S.regionCount[r] === 2) {
      toast(`<b>${R.ad} Sancağı</b> artık senin ocağının elinde! Her hafta bu bölgeden +25 altın vergi alacaksın.`, 'goal');
    }
    return exWild();
  }

  const mapSvg = `
    <div class="node-trail">
      <span class="nt-node ${visited.includes(0) ? 'done' : ''} ${cur === 0 ? 'cur' : ''}">Giriş</span>
      <i>───</i>
      <div class="nt-branch">
        <span class="nt-node ${visited.includes(1) ? 'done' : ''} ${cur === 1 ? 'cur' : ''}">Sarp Geçit</span>
        <span class="nt-node ${visited.includes(2) ? 'done' : ''} ${cur === 2 ? 'cur' : ''}">Kamp Ateşi</span>
      </div>
      <i>───</i>
      <span class="nt-node ${visited.includes(3) ? 'done' : ''} ${cur === 3 ? 'cur' : ''}">Nadir Keşif</span>
      <i>───</i>
      <span class="nt-node ${cur === 4 ? 'cur' : ''}">Yaban Yuvası</span>
    </div>
  `;

  let bodyHtml = '';
  if (res) {
    bodyHtml = `<p class="result">${res}</p><div class="mbtns"><button class="btn primary" data-a="node-next">Patikada İlerle ›</button></div>`;
  } else if (N.kind === 'start') {
    bodyHtml = `<div class="vnopts">${N.choices.map(c => `<button class="vopt" data-a="node-pick" data-next="${c.next}"><b>${c.label}</b><small>${c.tag}</small></button>`).join('')}</div>`;
  } else if (N.kind === 'hazard' || N.kind === 'camp') {
    bodyHtml = `<div class="vnopts"><button class="vopt primary" data-a="node-resolve">${N.kind === 'hazard' ? `${esc(e.name)} ile Geçidi Aş` : 'Kamp Ateşinde Soluklan ve Erzağı Al'}</button></div>`;
  } else if (N.kind === 'local') {
    bodyHtml = `<div class="vnopts">${N.localOpts.map((o, idx) => `<button class="vopt" data-a="node-local" data-i="${idx}">${o.t}</button>`).join('')}</div>`;
  }

  const bgArt = asset('bg-' + r) ? `<img src="${asset('bg-' + r)}" class="scene-img" alt="">` : sceneOr(r, sceneRegion(r));
  showModal(`<div class="expm"><div class="exbg">${bgArt}<div class="exdr">${dragonSVG(e)}</div><div class="exttl"><p class="kicker">${R.ad} · Keşif Patikası</p></div></div><div class="excard">${mapSvg}<h3>${N.title}</h3><p class="vntext">${N.desc}</p>${bodyHtml}</div></div>`, 'exwrap');
}

/* ---------- KERVANSARAY SOSYAL MEYDANI (CANLI HUB) ---------- */
/* B5-0: sabit NPC akranlar. Gerçek oyuncu mahlası bunlarla çakışırsa canlı akran (`isLive`) NPC sayılmaz. */
const HUB_NPC_HANDLES = ['@kuzey_ruzgari', '@leydi_sureyya', '@altin_kervan', '@firtina_beyi'];
function isNpcHandle(h) { return HUB_NPC_HANDLES.includes(h); }
function isNpcPeer(p) { return !!p && !p.isLive && (!!p.npc || isNpcHandle(p.handle)); }
function genHubPeers() {
  const peers = [
    {
      handle: '@kuzey_ruzgari', npc: true, verified: false, title: 'Rüzgârın Oğlu', guild: 'Ayaz Muhafızları', defenseBonus: 18,
      x: 24, y: 58, pose: 'P1', chat: 'Buzul Sırtı\'nda parıltılı yumurta arıyorum, ortak sefere gelecek var mı?',
      studFee: 95,
      d: (() => {
        const d = marketDragon(0.45);
        d.name = 'Bora'; d.sex = 'M'; d.stage = 'yetiskin'; d.el = 'buz';
        d.genes.el = ['buz', 'firtina']; d.genes.pig = ['a', 'a']; d.genes.par = ['P', 'p'];
        d.genes.pul = ['gok', 'inci']; d.genes.sus = ['altin', 'altin'];
        d.hybrid = 'buz+firtina'; d.w = 14; d.bond = 82;
        d.cos = { aura: 'kar', bas: 'altintac' };
        d.aiPreset = { opener: 'kukre', lowHpPct: 40, lowHpAct: 'card' };
        return d;
      })(),
    },
    {
      handle: '@leydi_sureyya', npc: true, verified: false, title: 'Saray İncisi', guild: 'İnci Hanedanı', defenseBonus: 24,
      x: 52, y: 52, pose: 'P2', chat: 'Şahmeran bu hafta da Saray Zarafet Merasimi\'nin favorisi! Damızlık tekliflerine açığım.',
      studFee: 130,
      d: (() => {
        const d = marketDragon(0.5);
        d.name = 'Şahmeran'; d.sex = 'F'; d.stage = 'yetiskin'; d.el = 'golge';
        d.genes.el = ['golge', 'ates']; d.genes.pig = ['m', 'm']; d.genes.par = ['P', 'p'];
        d.genes.pul = ['mor', 'gul']; d.genes.sus = ['altin', 'kizil']; d.genes.eyec = ['kizil', 'kizil'];
        d.pat = 'CB'; d.genes.pat = ['C', 'B'];
        d.hybrid = 'ates+golge'; d.w = 19; d.bond = 90;
        d.cos = { aura: 'yildiz', taban: 'kaide', boyun: 'nazar' };
        d.aiPreset = { opener: 'nefes', lowHpPct: 40, lowHpAct: 'card' };
        return d;
      })(),
    },
    {
      handle: '@altin_kervan', npc: true, verified: false, title: 'Tuz Taciri', guild: 'Tuz Tacirleri', defenseBonus: 20,
      x: 78, y: 60, pose: 'P6', chat: 'Serap Tuz Çölü\'nden taze Altın Pul genli ejderha getirdim, kapışmaya hazır!',
      studFee: 85,
      d: (() => {
        const d = marketDragon(0.4);
        d.name = 'Kızılhan'; d.sex = 'M'; d.stage = 'yetiskin'; d.el = 'ates';
        d.genes.el = ['ates', 'toprak']; d.genes.pul = ['altin', 'kizil']; d.genes.sus = ['zumrut', 'altin'];
        d.hybrid = 'ates+toprak'; d.w = 11; d.bond = 74;
        d.cos = { aura: 'kivilcim', kuyruk: 'halka' };
        d.aiPreset = { opener: 'kukre', lowHpPct: 40, lowHpAct: 'savun' };
        return d;
      })(),
    },
    {
      handle: '@firtina_beyi', npc: true, verified: false, title: 'Bulut Binicisi', guild: 'Bulut Binicileri', defenseBonus: 15,
      x: 38, y: 68, pose: 'P1', chat: 'Kaplıcalara şifalı Yıldırım Mantarı bıraktım, yorgun ejderhası olan dinlendirsin!',
      studFee: 90,
      d: (() => {
        const d = marketDragon(0.42);
        d.name = 'Gökbörü'; d.sex = 'F'; d.stage = 'yetiskin'; d.el = 'firtina';
        d.genes.el = ['firtina', 'toprak']; d.genes.par = ['P', 'p']; d.genes.pul = ['zumrut', 'gok'];
        d.hybrid = 'firtina+toprak'; d.w = 16; d.bond = 79;
        return d;
      })(),
    },
  ];
  return peers;
}

const CARAVAN_ROUTES = {
  kizil_vadi: {
    id: 'kizil_vadi',
    ad: 'Kızıl Vadi Rotası',
    ore: 'obsidiyen',
    oreAd: 'Obsidiyen Cevheri',
    oreIcon: 'img/ui/items/ore_obsidiyen.webp',
    el: 'ates',
    cargo: 150,
    food: 'biber',
    desc: 'Volkanik kanyonlardan geçen sıcak kervan hattı. Bol Obsidiyen Cevheri ve Harlı Kor Taşı çıkar.',
  },
  buzul_gecidi: {
    id: 'buzul_gecidi',
    ad: 'Buzul Geçidi Rotası',
    ore: 'kehribar',
    oreAd: 'Donmuş Kehribar',
    oreIcon: 'img/ui/items/ore_kehribar.webp',
    el: 'buz',
    cargo: 155,
    food: 'kar',
    desc: 'Ayaz sırtlarından geçen kristal kervan hattı. Donmuş Kehribar ve Harlı Kor Taşı sağlar.',
  },
  mercan_kiyisi: {
    id: 'mercan_kiyisi',
    ad: 'Mercan Kıyısı Rotası',
    ore: 'mercan',
    oreAd: 'Derin Mercan Taşı',
    oreIcon: 'img/ui/items/ore_mercan.webp',
    el: 'toprak',
    cargo: 160,
    food: 'balik',
    desc: 'Batık tapınak kıyılarından geçen ticaret hattı. Derin Mercan Taşı ve Harlı Kor Taşı sağlar.',
  },
  firtina_bogazi: {
    id: 'firtina_bogazi',
    ad: 'Fırtına Boğazı Rotası',
    ore: 'yildirim',
    oreAd: 'Yıldırım Kuvarsı',
    oreIcon: 'img/ui/items/ore_yildirim.webp',
    el: 'firtina',
    cargo: 165,
    food: 'mantar',
    desc: 'Yıldırım kuleleri arasından süzülen yüksek hat. Yıldırım Kuvarsı ve Kadim Magma Taşı şansı sunar.',
  },
};
window.CARAVAN_ROUTES = CARAVAN_ROUTES;

function ensureCaravans() {
  if (typeof MP !== 'undefined' && MP.caravans && MP.caravans.length) return MP.caravans;
  S.caravans = S.caravans || [
    {
      id: 'cv_tuz', guild: 'Tuz Tacirleri', owner: '@altin_kervan', route: 'Kızıl Vadi Rotası', routeKey: 'kizil_vadi',
      ore: 'obsidiyen', cargo: 160, foodReward: 'biber', guardName: 'Kızılhan', guardEl: 'ates', guardPower: 76,
      slots: [
        { handle: '@altin_kervan', dName: 'Kızılhan', el: 'ates', mode: 'leader' },
        { handle: '@kuzey_ruzgari', dName: 'Bora', el: 'buz', mode: 'coop' },
        null,
      ],
      raidedBy: [],
    },
    {
      id: 'cv_inci', guild: 'İnci Hanedanı', owner: '@leydi_sureyya', route: 'Mercan Kıyısı Rotası', routeKey: 'mercan_kiyisi',
      ore: 'mercan', cargo: 195, foodReward: 'zambak', guardName: 'Şahmeran', guardEl: 'golge', guardPower: 82,
      slots: [
        { handle: '@leydi_sureyya', dName: 'Şahmeran', el: 'golge', mode: 'leader' },
        { handle: '@firtina_beyi', dName: 'Gökbörü', el: 'firtina', mode: 'coop' },
        { handle: '@altin_kervan', dName: 'Kızılhan', el: 'ates', mode: 'coop' },
      ],
      raidedBy: [],
    },
    {
      id: 'cv_ayaz', guild: 'Ayaz Muhafızları', owner: '@kuzey_ruzgari', route: 'Buzul Geçidi Rotası', routeKey: 'buzul_gecidi',
      ore: 'kehribar', cargo: 145, foodReward: 'kar', guardName: 'Bora', guardEl: 'buz', guardPower: 74,
      slots: [
        { handle: '@kuzey_ruzgari', dName: 'Bora', el: 'buz', mode: 'leader' },
        null,
        null,
      ],
      raidedBy: [],
    },
  ];
  return S.caravans;
}

function ensureRaidLog() {
  if (typeof MP !== 'undefined' && MP.myRaids && MP.myRaids.length) return MP.myRaids;
  S.raidLog = S.raidLog || [
    {
      id: 'rd_seed_1', attacker: '@altin_kervan', attackerDragon: 'Kızılhan',
      target: S.handle || '@ejder_ocagi', targetDragon: (S.dragons[0] && S.dragons[0].name) || 'Kor',
      won: true, goldStolen: 35, revenged: false, ts: Date.now() - 360000,
    },
  ];
  return S.raidLog;
}

function ensureHub() {
  if (!S.hub || S.hub.w !== S.week) {
    S.hub = {
      w: S.week,
      tab: 'avlu', // 'avlu' | 'damizlik' | 'boss' | 'kaplica' | 'lonca'
      peers: genHubPeers(),
      selPeer: 0,
      myPose: 'P1',
      myX: 18,
      myY: 66,
      myChat: 'Ocağımın yıldızıyla meydandayım!',
      visitedOcak: {},
      tradedPeer: {},
      walkedPeer: {},
      treatUsed: false,
      spaUsed: false,
      bossHit: false,
      myCaravanSent: false,
      raidedCaravans: {},
      giftSent: {},
      weeklyUses: {},
      cauldronCount: 1,
      cauldronFeastDone: false,
      diceBetType: 'gold',
      caravanConvoy: {
        route: 'kizil_vadi',
        slot2: null,
        slot3: null,
      },
    };
  }
  S.hub.weeklyUses = S.hub.weeklyUses || {};
  if (S.hub.tab === 'sofra' || S.hub.tab === 'kaplica') S.hub.tab = 'kiraathane';
  if (typeof S.hub.cauldronCount !== 'number') S.hub.cauldronCount = 1;
  if (!S.hub.diceBetType) S.hub.diceBetType = 'gold';
  if (!S.hub.caravanConvoy) {
    S.hub.caravanConvoy = { route: 'kizil_vadi', slot2: null, slot3: null };
  }
  return S.hub;
}

function ensureWorldBoss() {
  if (typeof MP !== 'undefined' && MP.worldBoss) return MP.worldBoss;
  S.worldBoss = S.worldBoss || {
    name: 'Kül Yutan',
    title: 'Yedi Volkanın Efendisi',
    maxHp: 25000,
    hp: 18420,
    phase: 2,
    contributors: {
      '@leydi_sureyya': { handle: '@leydi_sureyya', guild: 'İnci Hanedanı', dName: 'Şahmeran', dmg: 2680 },
      '@kuzey_ruzgari': { handle: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', dName: 'Bora', dmg: 2150 },
      '@altin_kervan': { handle: '@altin_kervan', guild: 'Tuz Tacirleri', dName: 'Kızılhan', dmg: 1750 },
    },
  };
  return S.worldBoss;
}


/* ---------- İZOMETRİK KERVANSARAY ŞEHİR HARİTASI BİNALARI & ZIPLAMA FİZİĞİ ---------- */
const CITY_BLDGS = [
  { k: 'kiraathane', ad: 'Kervansaray Kıraathanesi', sub: 'Tavla, Kor 21 Blackjack & Ejder Pokeri', x: 24, y: 34, gx: 1, gy: 1 },
  { k: 'boss',     ad: 'Kül Yutan Kulesi',   sub: 'Ortak Dünya Boss akını',             x: 50, y: 22, gx: 3, gy: 0 },
  { k: 'tribun',   ad: 'Canlı Tribün',       sub: 'Canlı dövüş izle & bahis tut',       x: 14, y: 56, gx: 0, gy: 3 },
  { k: 'damizlik', ad: 'Damızlık Köşkü',     sub: 'Melez çiftleştirme & soy bağı',      x: 86, y: 56, gx: 6, gy: 3 },
  { k: 'lonca',    ad: 'Kervan Kapısı',      sub: 'İpek kervanı çıkar & baskın yap',    x: 26, y: 82, gx: 1, gy: 5 },
  { k: 'sancak',   ad: 'Sancak Kasrı',       sub: 'Bölge vergileri & hakimiyet',        x: 74, y: 82, gx: 5, gy: 5 },
];

function cityBldgSVG(k) {
  const imgKey = k === 'kiraathane' ? 'sofra' : k; // Kıraathane eski han görselini devralır
  return `<img src="img/iso/bldg-${imgKey}.webp" class="cb-img" alt="">`;
}

// 60 FPS Zıplayarak Yürüme Motoru (Ocaktaki roam.js gibi hafif zıplama, eğilme, yumuşak dönüş ve derinlik sırası)
const CITY_ROAM = {};
let CITY_ROAM_T = 0;

function ensureCityRoam(H) {
  if (!CITY_ROAM.me) {
    CITY_ROAM.me = { x: H.myX || 44, y: H.myY || 62, tx: H.myX || 44, ty: H.myY || 62, v: 0, ph: 0, f: 1, ff: 1, wait: 0, onArrive: null };
  }
  (H.peers || []).forEach((p, idx) => {
    const k = 'peer_' + idx;
    if (!CITY_ROAM[k]) {
      CITY_ROAM[k] = { x: p.x, y: p.y, tx: p.x, ty: p.y, v: 0, ph: Math.random() * 6, f: p.x > 50 ? -1 : 1, ff: p.x > 50 ? -1 : 1, wait: 1 + idx * 1.4 };
    }
  });
}

function cityRoamTick(now) {
  requestAnimationFrame(cityRoamTick);
  const canvas = document.getElementById('hub-canvas') || document.getElementById('sofra-canvas') || document.getElementById('spa-canvas');
  if (!canvas || typeof S === 'undefined' || !S || UI.view !== 'meydan') {
    CITY_ROAM_T = now;
    return;
  }
  const dt = Math.min(0.05, (now - (CITY_ROAM_T || now)) / 1000);
  CITY_ROAM_T = now;
  const H = ensureHub();
  ensureCityRoam(H);

  const updateActor = (R, el, isPeer, idx) => {
    if (!el || !R) return;
    const vmax = isPeer ? 11 : 22; // yüzde/sn hız
    const stride = isPeer ? 2.4 : 2.8;
    const dx = R.tx - R.x, dy = R.ty - R.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.45) {
      R.x = R.tx; R.y = R.ty;
      R.v = Math.max(0, R.v - 45 * dt);
      if (!isPeer && R.onArrive) {
        const fn = R.onArrive;
        R.onArrive = null;
        fn();
      }
      if (isPeer && !(H.peers[idx] && H.peers[idx].isLive)) {
        R.wait = (R.wait || 0) - dt;
        if (R.wait <= 0) {
          // Akranlar meydandaki sosyal noktalar arasında gezinir
          const spots = [[32, 48], [46, 54], [62, 46], [38, 66], [58, 66], [50, 42], [28, 58], [70, 56]];
          const sp = spots[Math.floor(Math.random() * spots.length)];
          R.tx = sp[0] + (Math.random() * 8 - 4);
          R.ty = sp[1] + (Math.random() * 6 - 3);
          R.wait = 3.5 + Math.random() * 4.5;
        }
      }
    } else {
      const want = Math.min(vmax, dist * 2.2 + 3);
      R.v += Math.sign(want - R.v) * Math.min(Math.abs(want - R.v), 36 * dt);
      const stepDist = Math.min(dist, R.v * dt);
      R.x += (dx / dist) * stepDist;
      R.y += (dy / dist) * stepDist;
      if (Math.abs(dx) > 0.4) R.f = dx > 0 ? 1 : -1;
      if (!isPeer) { H.myX = Math.round(R.x); H.myY = Math.round(R.y); }
      else if (H.peers[idx]) { H.peers[idx].x = Math.round(R.x); H.peers[idx].y = Math.round(R.y); }
    }

    R.ff += Math.sign(R.f - R.ff) * Math.min(Math.abs(R.f - R.ff), 8 * dt);
    R.ph += (R.v / stride) * Math.PI * dt;
    const step = Math.abs(Math.sin(R.ph));
    const moving = R.v > 0.6;
    const k = moving ? Math.min(1, R.v / vmax) : 0;
    const lift = step * k * 13; // Adımda hafif zıplama (px)
    const land = Math.pow(1 - step, 5) * k; // Yere inince hafif esneme
    const tilt = moving ? Math.sin(R.ph) * 2.4 * k : 0;
    const sx = (Math.abs(R.ff) < 0.15 ? 0.15 * Math.sign(R.ff || 1) : R.ff) * (1 + 0.03 * land);
    const sy = 1 - 0.045 * land;

    el.style.left = R.x.toFixed(2) + '%';
    el.style.top = R.y.toFixed(2) + '%';
    el.style.zIndex = String(Math.round(R.y * 10));

    const duo = el.querySelector('.hub-duo');
    if (duo) {
      duo.style.transform = `translateY(${(-lift).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    }
    const sh = el.querySelector('.hub-shadow');
    if (sh) {
      const shScale = Math.max(0.65, 1 - lift * 0.018);
      sh.style.transform = `translateX(-50%) scale(${shScale.toFixed(3)})`;
    }
  };

  updateActor(CITY_ROAM.me, document.getElementById('hub-me-actor'), false, -1);
  if (canvas.id !== 'sofra-canvas') {
    const peerEls = canvas.querySelectorAll('.hub-actor.peer');
    peerEls.forEach(pe => {
      const idx = +pe.dataset.i;
      updateActor(CITY_ROAM['peer_' + idx], pe, true, idx);
    });
  }
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cityRoamTick);

function meydanView() {
  const H = ensureHub();
  ensureStar();
  const star = byId(S.star) || S.dragons[0];
  const wEv = currentWorldEvent();
  const B = ensureWorldBoss();
  const onlineBadge = typeof MP !== 'undefined' && MP.connected
    ? `<span class="mp-pill on" title="Canlı Sunucuya Bağlı">Canlı Sunucu (${MP.onlineCount || 1} Ocak)</span>`
    : `<span class="mp-pill off" data-a="mp-reconnect" title="Yerel Mod (Sunucu için node server.js)">Yerel Mod</span>`;

  const tabDefs = [
    ['avlu', 'Çınar Avlusu', false, 'ic-meydan'],
    ['kiraathane', 'Kıraathane', false, 'ic-sofra'],
    ['tribun', 'Canlı Tribün', false, 'ic-arena'],
    ['damizlik', 'Damızlık Hanı', false, 'ic-yuva'],
    ['boss', 'Kül Yutan', !H.bossHit && B.hp > 0, 'ui-skull'],
    ['lonca', 'Kervan Yolu', !H.myCaravanSent, 'ic-kervan'],
    ['sancak', 'Bölge Sancakları', false, 'ic-sancak'],
  ];
  const tabOppMap = Object.fromEntries(tabDefs.map(([k, , badge]) => [k, !!badge]));
  const remOpps = tabDefs.filter(([, , badge]) => badge).map(([, lbl]) => lbl);
  const dotHtml = `<i class="hub-tab-dot" title="Bu hafta kullanılabilir hakkın var"></i>`;
  const oppSummaryBadge = remOpps.length > 0
    ? `<span class="mp-pill on hub-opp-pill" title="Açık meydan hakları: ${esc(remOpps.join(', '))}"><b>${remOpps.length} Meydan Hakkı Açık</b> <small>(${esc(remOpps.join(' · '))})</small></span>`
    : `<span class="mp-pill hub-opp-pill done">Meydan Nöbeti Tamam</span>`;

  const tabs = tabDefs.map(([k, lbl, badge, ic]) => {
    const icUrl = ic && asset(ic);
    const icHtml = icUrl ? `<img src="${icUrl}" class="ui-ic ui-ic-img hub-tab-ic" alt="" aria-hidden="true">` : '';
    return `<button class="plaque ${H.tab === k ? 'on' : ''} ${k === 'boss' ? 'pit' : ''} ${badge ? 'has-opp' : ''}" data-a="hub-tab" data-k="${k}">${icHtml}<span>${lbl}</span>${badge ? dotHtml : ''}</button>`;
  }).join('');

  let body = '';
  if (H.tab === 'avlu') {
    const peer = H.peers[H.selPeer] || H.peers[0];
    const myArt = star ? (star.stage === 'yetiskin' && hasPose(star, H.myPose) ? poseSVG(star, H.myPose, { face: 'r' }) : dragonSVG(star)) : '';
    ensureCityRoam(H);
    const bldgNodes = CITY_BLDGS.map(b => `
      <button class="city-bldg cb-${b.k} ${tabOppMap[b.k] ? 'has-opp' : ''}" style="left:${b.x}%;top:${b.y}%;z-index:${Math.round(b.y * 10 - 5)}" data-a="city-bldg-go" data-k="${b.k}" data-x="${b.x}" data-y="${b.y + 6}" data-hover>
        <span class="stip"><b>${b.ad}</b><small>${b.sub}${tabOppMap[b.k] ? ' · Bu Hafta Açık' : ''}</small></span>
        ${cityBldgSVG(b.k)}
        <span class="plank">${b.ad}${tabOppMap[b.k] ? dotHtml : ''}</span>
      </button>
    `).join('');

    const peerSprites = H.peers.map((p, idx) => {
      const R = CITY_ROAM['peer_' + idx] || p;
      return `
      <div class="hub-actor peer ${H.selPeer === idx ? 'sel' : ''}" style="left:${R.x}%;top:${R.y}%;z-index:${Math.round(R.y * 10)}" data-a="hub-peer" data-i="${idx}">
        <div class="hub-bubble">${esc(p.chat)}</div>
        <div class="hub-shadow"></div>
        <div class="hub-duo">
          <div class="hub-chibi-wrap">${typeof renderChibiDoll === "function" ? renderChibiDoll(peerChibiConfig(p, idx), { cls: "hub-doll", hideAura: false }) : ""}</div>
          <div class="hub-dr">${p.d.stage === 'yetiskin' && hasPose(p.d, p.pose) ? poseSVG(p.d, p.pose, { face: 'r' }) : dragonSVG(p.d)}</div>
        </div>
        <div class="hub-tag"><b>${esc(p.handle)}</b>${isNpcPeer(p) ? ' <em style="font-size:10px;opacity:.75;font-style:normal">[Muhafız NPC]</em>' : ''}<small>${esc(p.d.name)} · “${esc(p.title || 'Ocak Ustası')}”</small></div>
      </div>
    `}).join('');

    const Rme = CITY_ROAM.me || { x: H.myX || 44, y: H.myY || 62 };
    const mySprite = star ? `
      <div class="hub-actor me" id="hub-me-actor" style="left:${Rme.x}%;top:${Rme.y}%;z-index:${Math.round(Rme.y * 10)}">
        <div class="hub-bubble me-bub">${esc(H.myChat)}</div>
        <div class="hub-shadow"></div>
        <div class="hub-duo">
          <div class="hub-chibi-wrap" data-a="chibi-open" title="Terbiyeci Vitrini & Kuşanma">${typeof renderChibiDoll === "function" ? renderChibiDoll(null, { cls: "hub-doll" }) : ""}</div>
          <div class="hub-dr">${myArt}</div>
        </div>
        <div class="hub-tag me-tag"><b>${esc(S.handle || '@ejder_ocagi')}</b><small>Kudret ${typeof calcChibiStats === "function" ? calcChibiStats().totalFc : 850} · ${esc(star.name)}</small></div>
      </div>
    ` : '';

    const chatList = ((typeof MP !== 'undefined' && MP.chatLog && MP.chatLog.length) ? MP.chatLog : [
      { handle: '@leydi_sureyya', text: 'Saray Zarafet Merasimi podyumu bu hafta çok çekişmeli!' },
      { handle: '@kuzey_ruzgari', text: 'Kül Yutan uyandı, eli silah tutan her ocak yardıma gelsin!' },
    ]).slice(-2).map(c => `<div class="chat-line"><b>${esc(c.handle)}:</b> <span>${esc(c.text)}</span></div>`).join('');

    const showMapOnMob = !!(UI && UI.mobShowMap);
    const avluPortraitList = `
      <div class="mob-portrait-list avlu-portrait-list">
        <div class="mob-list-hero" style="background-image:url('${asset('bg-meydan') || 'img/bg-meydan.webp'}')">
          <div class="mob-list-hero-ov">
            <div class="mob-list-hero-top">
              <div>
                <span class="kicker">Kervansaray Meydanı · Çınar Avlusu</span>
                <h2>Meydan Rehberi & Akranlar</h2>
              </div>
              <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Canlı Avlu Haritası</button>
            </div>
            <div class="mob-list-pills">
              <span class="mp-pill wev" title="${esc(wEv.d)}">${esc(wEv.ad)}</span>
              ${onlineBadge}
            </div>
          </div>
        </div>
        <div class="mob-sec-title">Meydan Yapıları</div>
        <div class="mob-bldg-grid">
          ${CITY_BLDGS.map(b => `
            <button class="mob-dir-card compact ${tabOppMap[b.k] ? 'ready' : ''}" data-a="hub-tab" data-k="${b.k}">
              <div class="mob-dir-ic">${cityBldgSVG(b.k)}</div>
              <div class="mob-dir-info">
                <b>${esc(b.ad)}${tabOppMap[b.k] ? dotHtml : ''}</b>
                <small>${esc(b.sub)}</small>
              </div>
            </button>
          `).join('')}
        </div>
        <div class="mob-sec-title">Meydandaki Akran Ocaklar (Etkileşim İçin Seç)</div>
        <div class="mob-peer-strip">
          ${H.peers.map((p, idx) => `
            <button class="mob-peer-card ${H.selPeer === idx ? 'on' : ''}" data-a="hub-peer" data-i="${idx}">
              <div class="mob-peer-art">${dragonSVG(p.d, { still: true })}</div>
              <div class="mob-peer-txt">
                <b>${esc(p.handle)}${isNpcPeer(p) ? ' <em style="font-size:12px;opacity:.8;font-style:normal">NPC</em>' : ''}</b>
                <small>${esc(p.d.name)} · ${esc(p.title || 'Ocak Ustası')}</small>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    body = `
      <div class="hub-stage-wrap ${showMapOnMob ? 'mob-force-map' : ''}">
        ${avluPortraitList}
        <div class="hub-canvas iso-city-canvas" id="hub-canvas" data-a="hub-canvas-walk" title="İzometrik meydanda istediğin karoya veya binaya dokunarak zıplaya zıplaya yürü!">
          <img src="${asset('bg-meydan') || 'img/bg-meydan.webp'}" class="iso-bg-img" alt="">
          
          <div class="hub-topbar">
            <span class="mp-pill wev" title="${esc(wEv.d)}">${esc(wEv.ad)}</span>
            ${onlineBadge}
            <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Rehber Listesi</button>
          </div>
          <div id="city-walk-ring" class="city-walk-ring"></div>
          ${bldgNodes}
          ${peerSprites}
          ${mySprite}
        </div>
        <aside class="hub-side">
          <div class="hub-mybar">
            <h4>Senin Yıldızın: ${star ? esc(star.name) : 'Yok'}</h4>
            <div class="hub-poses">
              <button class="btn primary sm" data-a="chibi-open">Terbiyeci Vitrini</button>
              <button class="btn ghost sm" data-a="mp-card">Ocak Künyesi</button>
              <button class="btn ghost sm" data-a="divan-open">Kraliyet Divanı</button>
            </div>
            <div class="hub-pose-strip">
              <span class="mute sm">Duruş:</span>
              <button class="btn ghost xs" data-a="hub-pose" data-p="P16" data-msg="Göğe şahlanıp kanat açtı!">Şahlan</button>
              <button class="btn ghost xs" data-a="hub-pose" data-p="P12" data-msg="Havaya görkemli bir nefes üfledi!">Nefes Üfle</button>
              <button class="btn ghost xs" data-a="hub-pose" data-p="P15" data-msg="Çınarın gölgesinde kıvrıldı.">Dinlen</button>
            </div>
            <div class="hub-chatbox">
              <div class="chat-feed">${chatList}</div>
              <div class="chat-input-row">
                <input id="hub-chat-in" placeholder="Meydana seslen..." maxlength="90">
                <button class="btn sm primary" data-a="hub-chat-send">Gönder</button>
              </div>
            </div>
          </div>
          ${peer ? `
            <div class="hub-peercard">
              <span class="kicker">${isNpcPeer(peer) ? 'NPC · ' : ''}${esc(peer.guild || 'Ocak Birliği')} · Ocak Savunması +%${peer.defenseBonus || 15}</span>
              <h3>${esc(peer.handle)} · ${esc(peer.d.name)} ${sexIc(peer.d.sex)}</h3>
              <p class="sm">${elChip(peer.d.el)} ${peer.d.hybrid && HYBRID_MAP[peer.d.hybrid] ? `<span class="trait sm"><b>${HYBRID_MAP[peer.d.hybrid].ad}</b></span>` : ''} · Zarafet <b>${fullEleganceCalc(peer.d).total}</b> · ${peer.d.w || 10} Zafer</p>
              <p class="mute sm">${phenoTitle(peer.d)}</p>
              <div class="pstats">${STATS.map(k => `<span>${ST_KISA[k]}<b>${peer.d.st[k]}</b></span>`).join('')}</div>
              <p class="sm">Akran Dostluğu: <b class="good">${getPeerAff(peer.handle)}/100</b> <small class="mute">(${peerAffLabel(getPeerAff(peer.handle))})</small></p>
              <div class="hub-peer-btns">
                <button class="btn primary sm" data-a="hub-social-walk" data-i="${H.selPeer}" ${!star ? 'disabled' : ''}>Ejderhaları Tanıştır</button>
                <button class="btn primary sm" data-a="hub-visit-ocak" data-i="${H.selPeer}">Ocağını Ziyaret Et</button>
                <button class="btn ghost sm" data-a="hub-trade-open" data-i="${H.selPeer}">Takas Masası</button>
                ${typeof TRADE_UI !== 'undefined' && TRADE_UI.isTradeable(peer.handle) && !peer.npc ? `<button class="btn primary sm" data-trade-with="${esc(peer.handle)}" aria-label="${esc(peer.handle)} ile takas teklif et">⇄ Takas teklif et</button>` : ''}
                <button class="btn sm love" data-a="hub-go-stud" data-i="${H.selPeer}">Damızlık (${Math.round((peer.studFee || 95) * (getPeerAff(peer.handle) >= 30 ? 0.65 : 1))} Altın)</button>
                <button class="btn ghost sm" data-a="hub-live-duel" data-i="${H.selPeer}" ${!star ? 'disabled' : ''}>Er Meydanına Çağır</button>
                <button class="btn ghost sm" data-a="hub-coop" data-i="${H.selPeer}">${S.coopPartner && S.coopPartner.handle === peer.handle ? 'Ortak Sefer Eskortu (Seçili)' : 'Ortak Sefer Eskortu'}</button>
                ${typeof ensureSocial === 'function' && !ensureSocial().friends.some(f => f.handle === peer.handle) ? `<button class="btn primary sm" data-a="soc-add-peer" data-h="${esc(peer.handle)}">➕ Arkadaş Ekle</button>` : ''}
                <button class="btn ghost sm" data-a="soc-party-invite" data-h="${esc(peer.handle)}">🛡️ Partiye Çağır</button>
              </div>
            </div>
          ` : ''}
        </aside>
      </div>
    `;
  } else if (H.tab === 'tribun') {
    const matches = typeof ensureLiveMatches === 'function' ? ensureLiveMatches() : [];
    const cards = matches.map((m, idx) => `
      <div class="poster ${idx === 0 ? 'special' : ''}" style="--rot:${idx ? 1 : -1}deg"><i class="nail"></i>
        <span class="stamp ${idx === 0 ? 'hard' : 'even'}">${m.spectators} İzleyici</span>
        <div class="ph">CANLI ER MEYDANI</div>
        <div class="pdr pdr-duel">
          <div class="pdr-side">${dragonSVG(m.pPeer.d, { still: true })}</div>
          <b class="pdr-vs">VS</b>
          <div class="pdr-side">${dragonSVG(m.ePeer.d, { still: true, flip: true })}</div>
        </div>
        <b class="pname">${esc(m.pPeer.d.name)} × ${esc(m.ePeer.d.name)}</b>
        <small>${esc(m.pPeer.handle)} · ${esc(m.ePeer.handle)}</small>
        <div class="pmeta">${elChip(m.pPeer.d.el)} ${elChip(m.ePeer.d.el)}</div>
        <div class="pfoot"><span class="mute sm">Tezahürat et, yuhala ya da bahis tut</span></div>
        <button class="btn primary sm wide" data-a="spec-watch" data-i="${idx}">Maçı Canlı İzle</button>
      </div>
    `).join('');
    const bountyPeer = H.peers[0];
    const bountyCard = bountyPeer ? `
      <div class="poster" style="--rot:0.8deg"><i class="nail"></i>
        <span class="stamp deadly">Ödül Avı</span>
        <div class="ph">ARANAN MUHAFIZ</div>
        <div class="pdr">${dragonSVG(bountyPeer.d, { still: true, flip: true })}</div>
        <b class="pname">${esc(bountyPeer.d.name)}</b>
        <small>${esc(bountyPeer.handle)} · Yenilmezlik Serisi: 4</small>
        <div class="pmeta">${elChip(bountyPeer.d.el)} <span class="good">+140 Altın Kontrat</span></div>
        <div class="pfoot"><span class="mute sm">Serisini bozan ocak ödül kesesini alır</span></div>
        <button class="btn danger sm wide" data-a="hub-bounty" data-i="0" ${!star ? 'disabled' : ''}>Ödül Avına Çık</button>
      </div>
    ` : '';
    body = `<section class="board hub-spectate-board">
      <p class="tierd">Meydanda devam eden canlı karşılaşmaları tribünden izleyip müdahale edebilir ya da başı ödüllü muhafızların serisini bozabilirsin.</p>
      <div class="posters">${cards}${bountyCard}</div>
    </section>`;
  } else if (H.tab === 'damizlik') {
    const peer = H.peers[H.selPeer] || H.peers[0];
    const myAdults = S.dragons.filter(d => d.stage !== 'yavru' && d.sex !== peer.d.sex);
    const myD = myAdults.find(d => d.id === UI.sel) || myAdults[0] || star;
    const compatSex = myD && myD.sex !== peer.d.sex && myD.stage !== 'yavru';
    const O = myD ? offspringOdds(myD, peer.d, 75) : null;

    body = `
      <div class="hub-stud-box">
        <div class="stud-peers">
          <h4>Meydandaki Damızlık Ejderhalar</h4>
          <div class="stud-list">
            ${H.peers.map((p, idx) => `
              <button class="stud-item ${H.selPeer === idx ? 'on' : ''}" data-a="hub-peer" data-i="${idx}">
                <div class="stud-art">${dragonSVG(p.d, { still: true })}</div>
                <div>
                  <b>${esc(p.d.name)} ${sexIc(p.d.sex)}</b> <small>(${esc(p.handle)})</small><br>
                  <small>${phenoTitle(p.d)} · Bedel: <b>${p.studFee || 95} altın</b></small>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="stud-match">
          <h4>Ortak Kuluçka ve Soy Kehaneti</h4>
          ${myD ? `
            <div class="cpl stud-cpl">
              <div>${dragonSVG(myD, { still: true })}<b>${esc(myD.name)} ${sexIc(myD.sex)}</b><small>Senin Adayın</small></div>
              <div class="bigheart" style="--f:85%"><img src="${asset('ui-heart') || 'img/ui/ui-heart.webp'}" class="bigheart-img" alt=""><span>×</span></div>
              <div>${dragonSVG(peer.d, { still: true, flip: true })}<b>${esc(peer.d.name)} ${sexIc(peer.d.sex)}</b><small>${esc(peer.handle)}</small></div>
            </div>
            ${myAdults.length > 1 ? `<div class="fpick">${myAdults.map(d => `<button class="fp ${myD.id === d.id ? 'on' : ''}" data-a="hub-mybreed" data-id="${d.id}">${dragonSVG(d, { still: true })}<span>${esc(d.name)}</span></button>`).join('')}</div>` : ''}
            ${!compatSex ? `<p class="warn">Eşleşme için ${peer.d.sex === 'M' ? 'dişi' : 'erkek'} bir genç veya yetişkin ejderhan olmalı.</p>` : ''}
            ${O ? `<div class="stud-odds">
              <span>Olası Elementler: ${Object.entries(O.el).map(([e, p]) => `<b>${EL_AD[e]} %${p}</b>`).join(' · ')}</span>
              <span>Parıltı İhtimali: <b>%${O.par.P || 0}</b> · Nadir Soy Mirası: <b>Yüksek</b></span>
            </div>` : ''}
            <button class="btn primary wide" data-a="hub-breed-do" data-i="${H.selPeer}" data-my="${myD.id}" ${!compatSex || S.gold < (peer.studFee || 95) ? 'disabled' : ''}>Damızlık Eşleştir (${goldTxt(peer.studFee || 95)}) — Yumurta Ocağına Gelir</button>
          ` : '<p class="mute">Eşleştirecek ejderhan yok.</p>'}
        </div>
      </div>
    `;
  } else if (H.tab === 'boss') {
    const B = ensureWorldBoss();
    const pct = Math.round((B.hp / B.maxHp) * 100);
    const contribs = Object.values(B.contributors || {}).sort((a, b) => b.dmg - a.dmg);
    const bgRaid = asset('bg-raid') || asset('bg-pit') || '';
    const canAttack = star && !H.bossHit;

    body = `
      <div class="boss-raid-box boss-panoramic">
        <div class="boss-art-banner" style="background-image:url('${bgRaid}')">
          <div class="boss-board boss-floating-board">
            <h4>En Çok Hasar Vuran Ocaklar</h4>
            <div class="saray-ranks">
              ${contribs.map((c, i) => `
                <div class="saray-rankrow ${c.handle === (S.handle || '@ejder_ocagi') ? 'me' : ''}">
                  <span><b>${i + 1}.</b> ${esc(c.handle)} <small class="mute">(${esc(c.dName)})</small></span>
                  <b class="gold">${c.dmg.toLocaleString('tr-TR')}</b>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="boss-overlay boss-bottom-hud">
            <div class="boss-hud-left">
              <span class="kicker">Yedi Volkanın Felaketi · Safha ${B.phase || 1}</span>
              <h2>${esc(B.name)}</h2>
              <p class="sm">Diyardaki tüm ocaklar ortaklaşa karşı koyar. Her akın <b>2–3× Kadim Magma Taşı (Tier 3)</b>, <b>%35 Kıyamet Özü</b>, altın ve ün kazandırır.</p>
            </div>
            <div class="boss-hud-center">
              <div class="boss-hpbar">
                <div class="boss-hpfill" style="width:${pct}%"></div>
                <span><b>${B.hp.toLocaleString('tr-TR')}</b> / ${B.maxHp.toLocaleString('tr-TR')} CAN (%${pct})</span>
              </div>
            </div>
            <div class="boss-act-row">
              <button class="btn ghost sm" data-a="hub-boss-comic" title="Kül Yutan Destan Sahnesi">Destan Sahnesi</button>
              <button class="btn danger big" data-a="hub-boss-atk" ${canAttack ? '' : 'disabled'}>
                ${H.bossHit ? 'Bu hafta akın ettin (Yeni hafta tekrar saldır)' : star ? `${esc(star.name)} ile Kül Yutan'a Akın Et` : 'Ejderha Seç'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (H.tab === 'kiraathane') {
    body = typeof kiraathaneView === 'function' ? kiraathaneView() : '<div class="vempty">Kıraathane yükleniyor…</div>';
  } else if (H.tab === 'lonca') {
    const defInfo = calcOcakDefenseBonus();
    const caravans = ensureCaravans();
    const raids = ensureRaidLog();
    const bgKervan = asset('bg-kervan') || asset('bg-harita') || '';
    const isUnlocked = typeof canEnterZindanOrTopcu === 'function' ? canEnterZindanOrTopcu() : true;
    const conv = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    const routeObj = CARAVAN_ROUTES[conv.route] || CARAVAN_ROUTES.kizil_vadi;

    const slot1El = star ? star.el : null;
    const slot2El = conv.slot2 ? conv.slot2.el : null;
    const slot3El = conv.slot3 ? conv.slot3.el : null;
    const all3Filled = !!(slot1El && slot2El && slot3El);
    const distinctEls = new Set([slot1El, slot2El, slot3El].filter(Boolean));
    const triElementActive = all3Filled && distinctEls.size === 3;
    const coopCount = [conv.slot2, conv.slot3].filter(s => s && s.mode === 'coop').length;

    const lockBannerHtml = !isUnlocked ? `
      <div style="background:linear-gradient(135deg,rgba(95,22,22,0.92),rgba(38,14,14,0.96));border:2px solid #e05246;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;box-shadow:0 8px 24px rgba(0,0,0,0.45);">
        <div>
          <b style="color:#ffd470;font-size:15px;">🔒 Kervan Yolu Şampiyonluk Mührü</b>
          <p class="sm" style="color:#f5d5ce;margin:4px 0 0;">Kervan Yolu'na çıkmak için önce <b>Kızıl Taç Turnuvası Şampiyonu</b> olmalı ve yıldız ejderhanızı <b>Ebedi Gençlik İksiri</b> ile kutsamalısınız!</p>
        </div>
        <button class="btn sm ghost" data-a="go" data-v="arena">Arenaya Git</button>
      </div>
    ` : '';

    const routeCardsHtml = Object.values(CARAVAN_ROUTES).map(rt => {
      const sel = conv.route === rt.id;
      return `
        <button class="banner-card ${sel ? 'mine' : ''}" style="text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;" data-a="lonca-route" data-r="${rt.id}" ${!isUnlocked ? 'disabled' : ''}>
          <img src="${rt.oreIcon}" alt="${esc(rt.oreAd)}" style="width:40px;height:40px;object-fit:contain;border-radius:8px;background:rgba(0,0,0,0.35);padding:3px;">
          <div style="flex:1;">
            <b>${esc(rt.ad)}</b> ${elChip(rt.el)}<br>
            <small class="mute">Cevher: <b>${esc(rt.oreAd)}</b> · Baz Yük: <b>${rt.cargo} Altın</b></small>
          </div>
          <span class="tag ${sel ? 'good' : ''}">${sel ? 'SEÇİLİ ROTA' : 'Seç'}</span>
        </button>
      `;
    }).join('');

    const renderGuardSlot = (slotNum, slotData) => {
      if (slotNum === 1) {
        return `
          <div class="banner-card mine" style="flex:1;min-width:210px;">
            <div>
              <span class="kicker">1. Muhafız (Başbuğ — Sen)</span><br>
              <b>${star ? esc(star.name) : 'Yıldız Ejderha Yok'}</b> ${star ? elChip(star.el) : ''}<br>
              <small class="mute">Kervan Lideri · ${esc(S.handle || '@ejder_ocagi')}</small>
            </div>
          </div>
        `;
      }
      if (!slotData) {
        const peerCandidate = H.peers[(slotNum - 2) % H.peers.length];
        return `
          <div class="banner-card" style="flex:1;min-width:210px;border-style:dashed;">
            <div>
              <span class="kicker">${slotNum}. Muhafız Slotu (Boş)</span><br>
              <b>Eskort Bekleniyor</b><br>
              <small class="mute">Co-op Akran (+%25 Cevher, 0 Yorgunluk) veya Solo Sürü (+20 Yorgunluk)</small>
            </div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              ${peerCandidate ? `<button class="btn xs primary" data-a="lonca-slot-coop" data-slot="${slotNum}" data-i="${(slotNum - 2) % H.peers.length}" ${!isUnlocked ? 'disabled' : ''}>🤝 ${esc(peerCandidate.handle)} (${EL_AD[peerCandidate.d.el]})</button>` : ''}
            </div>
          </div>
        `;
      }
      return `
        <div class="banner-card ${slotData.mode === 'coop' ? 'mine' : ''}" style="flex:1;min-width:210px;">
          <div>
            <span class="kicker">${slotNum}. Muhafız (${slotData.mode === 'coop' ? '🤝 Co-op Akran · +%25 Cevher' : '🐉 Kendi Sürün · +20 Yorgunluk'})</span><br>
            <b>${esc(slotData.dName)}</b> ${elChip(slotData.el)}<br>
            <small class="mute">${esc(slotData.handle || (S.handle || '@ejder_ocagi'))}</small>
          </div>
          <button class="btn xs ghost" data-a="lonca-slot-clear" data-slot="${slotNum}" ${!isUnlocked ? 'disabled' : ''}>Çıkar</button>
        </div>
      `;
    };

    const caravanCards = caravans.slice(0, 4).map((cv, idx) => {
      const isMine = cv.owner === (S.handle || '@ejder_ocagi');
      const alreadyRaided = H.raidedCaravans && H.raidedCaravans[cv.id];
      const rt = CARAVAN_ROUTES[cv.routeKey] || CARAVAN_ROUTES.kizil_vadi;
      return `
        <div class="banner-card ${isMine ? 'mine' : ''}">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${rt.oreIcon}" alt="" style="width:34px;height:34px;object-fit:contain;">
            <div>
              <b>${esc(cv.guild)} Kervanı</b> <small class="mute">(${esc(cv.owner)})</small><br>
              <small>${esc(cv.route)} · Muhafız: <b>${esc(cv.guardName)}</b> (${EL_AD[cv.guardEl || 'ates']}, Güç ${cv.guardPower})</small>
            </div>
          </div>
          <div class="banner-right" style="display:flex;gap:6px;align-items:center;">
            <span>Yük: <b>${goldTxt(cv.cargo)} + ${esc(rt.oreAd)}</b></span>
            ${isMine
              ? `<span class="tag good">KERVANIN YOLDA</span>`
              : `
                <button class="btn xs primary" data-a="lonca-join" data-i="${idx}" ${!isUnlocked || !star ? 'disabled' : ''}>🤝 Eskort Katıl</button>
                <button class="btn xs ${alreadyRaided ? 'ghost' : 'danger'}" data-a="hub-caravan-raid" data-i="${idx}" ${!isUnlocked || alreadyRaided || !star ? 'disabled' : ''}>${alreadyRaided ? 'Yağmalandı' : '⚔️ Topçu Baskını'}</button>
              `}
          </div>
        </div>
      `;
    }).join('');

    const revengeRows = raids.slice(0, 3).map((rd, idx) => {
      const incoming = rd.target === (S.handle || '@ejder_ocagi');
      return `
        <div class="saray-rankrow ${incoming && !rd.revenged ? 'me' : ''}">
          <span>
            ${incoming ? `<b>${esc(rd.attacker)}</b> (${esc(rd.attackerDragon)}) ocağına baskın yaptı.` : `<b>${esc(rd.target)}</b> ocağına baskın yaptın.`}
            <small class="mute">${rd.won ? `(${rd.goldStolen} altın ganimet)` : '(Muhafız püskürttü)'}</small>
          </span>
          ${incoming && !rd.revenged
            ? `<button class="btn sm danger" data-a="hub-revenge" data-i="${idx}" ${!isUnlocked ? 'disabled' : ''}>Rövanşa Çık (+95 Altın)</button>`
            : `<span class="mute sm">${rd.revenged ? 'Rövanş Alındı' : 'Tamamlandı'}</span>`}
        </div>
      `;
    }).join('');

    body = `
      <div class="hub-lonca">
        ${lockBannerHtml}
        <div class="kervan-hero" style="background-image:url('${bgKervan}')">
          <div class="kervan-overlay" style="flex-direction:column;align-items:stretch;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
              <div>
                <span class="kicker">İpek Geçidi · 3 Muhafızlı Kervan Konvoyu & Bölge Cevheri Seferi</span>
                <h3>${esc(S.guild || 'Kızıl Ocak Birliği')} — ${esc(routeObj.ad)}</h3>
                <p class="sm">${esc(routeObj.desc)}</p>
                <p class="sm mute">Ocak Savunma Gücün: <b class="good">+%${defInfo.total}</b> · Co-op Bonusu: <b class="good">+%${coopCount * 25} Cevher</b> ${triElementActive ? '· <b style="color:#ffd86b;">✨ ÜÇLÜ ELEMENT SANCAĞI AKTİF (2× Cevher + Ekstra Harlı Kor Taşı + %35 Kalıp)!</b>' : '· <small>(3 farklı element muhafız dizerek Üçlü Element Sancağını yak!)</small>'}</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn ghost sm" data-a="lonca-fill-own" ${!isUnlocked || H.myCaravanSent ? 'disabled' : ''}>🐉 Kendi Süründen Tamamla (+20 Yorgunluk)</button>
                <button class="btn primary sm" data-a="hub-caravan-send" ${!isUnlocked || H.myCaravanSent || !star ? 'disabled' : ''}>
                  ${H.myCaravanSent ? 'Kervanın Yola Çıktı' : `📦 Konvoyu Yola Çıkar (+${routeObj.oreAd})`}
                </button>
                <button class="btn danger sm" data-a="lonca-battle" ${!isUnlocked || !star ? 'disabled' : ''}>
                  🎯 Topçu Kervan Savunması (1 Aşama)
                </button>
              </div>
            </div>

            <!-- 3 Muhafız Slotu -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${renderGuardSlot(1, null)}
              ${renderGuardSlot(2, conv.slot2)}
              ${renderGuardSlot(3, conv.slot3)}
            </div>
          </div>
        </div>

        <!-- 4 Bölgesel Kervan Rotası -->
        <div style="margin:12px 0;">
          <h4>Bölgesel Kervan Rotaları (Tier 4 Cevher Kaynakları)</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-top:6px;">
            ${routeCardsHtml}
          </div>
        </div>

        <div class="lonca-cols">
          <div>
            <h4>Yoldaki Kervanlar (Eskort Katıl veya Topçu Baskını Yap)</h4>
            <div class="saray-ranks">${caravanCards}</div>
          </div>
          <div>
            <h4>Baskın ve Husumet Defteri</h4>
            <div class="saray-ranks">${revengeRows || '<p class="mute sm">Henüz baskın kaydı yok.</p>'}</div>
          </div>
        </div>
      </div>
    `;
  } else if (H.tab === 'sancak') {
    const rkeys = Object.keys(REGIONS);
    const grid = pager('sancak', rkeys, 4, rk => {
      const R = REGIONS[rk], ban = getRegionBanner(rk);
      const cnt = (S.regionCount && S.regionCount[rk]) || 0;
      return `<div class="banner-card ${ban.mine ? 'mine' : ''}">
        <div>
          <b>${R.ad}</b> ${elChip(R.el)}<br>
          <small>Sancak: <b>${esc(ban.guild)}</b> (${esc(ban.owner)})</small>
        </div>
        <div class="banner-right">
          <span>Seferin: <b>${cnt}/2</b></span>
          <small class="${ban.mine ? 'good' : 'mute'}">${ban.mine ? 'Senin Sancağın (+25/hf)' : '2 seferde sancak dikilir'}</small>
        </div>
      </div>`;
    });
    body = `
      <div class="hub-lonca">
        <div class="lonca-head">
          <div>
            <span class="kicker">Diyar Haritası Sancakları</span>
            <h3>Bölge Hakimiyeti ve Haftalık Vergi</h3>
            <p class="sm mute">Bir bölgeye 2 kez sefer düzenleyen ocak kendi birliğinin sancağını diker ve her hafta +25 altın vergi toplar.</p>
          </div>
          <button class="btn ghost sm" data-a="mp-card">Ocak Künyesini Düzenle</button>
        </div>
        ${grid}
      </div>
    `;
  }

  const topNav = H.tab === 'avlu'
    ? `<div class="signs city-signs">
         <button class="aucsign" data-a="chibi-open" data-hover><img src="${asset('ic-konak') || 'img/ui/ic-konak.webp'}" class="aucsign-ic" alt=""><span><b>Terbiyeci & Kuşanma Dolabı</b><small>Gardırop, Sima ve Duruş</small></span></button>
         <button class="aucsign" data-a="go" data-v="pazar" data-hover><img src="${asset('ic-pazar') || 'img/ui/ic-pazar.webp'}" class="aucsign-ic" alt=""><span><b>Gece Çarşısı & Demirci Usta Kerim</b><small>Kor Örsü, Dökümhane ve Bedesten</small></span></button>
         <button class="aucsign" data-a="divan-open" data-hover><img src="${asset('ic-divan') || 'img/ui/ic-divan.webp'}" class="aucsign-ic" alt=""><span><b>Şöhret Kürsüsü & Divan</b><small>Şöhret Anıtları ve Fermanlar</small></span></button>
       </div>
       <div class="city-sub-bar avlu-quick-tabs">
         <div class="plaques hub-tabs">${tabs}</div>
         ${oppSummaryBadge}
       </div>`
    : `<div class="city-sub-bar">
         <button class="backbtn city-back" data-a="hub-tab" data-k="avlu">${ui('left')} Şehir Haritasına Dön</button>
         <div class="plaques hub-tabs">${tabs}</div>
         ${oppSummaryBadge}
       </div>`;

  return `<div class="meydan-view">
    ${topNav}
    ${body}
  </div>`;
}


function getPeerAff(handle) {
  if (!S) return 15;
  S.peerAff = S.peerAff || { '@leydi_sureyya': 25, '@kuzey_ruzgari': 20, '@altin_kervan': 15, '@firtina_beyi': 15 };
  return S.peerAff[handle] || 15;
}

function addPeerAff(handle, delta) {
  if (!S) return 15;
  const cur = getPeerAff(handle);
  S.peerAff[handle] = clamp(cur + delta, 0, 100);
  return S.peerAff[handle];
}

function peerAffLabel(v) {
  if (v >= 90) return 'Kan Kardeşi';
  if (v >= 60) return 'Sancak Yoldaşı';
  if (v >= 30) return 'Ocak Dostu';
  return 'Tanışık';
}

function visitOcakModal(peerIdx) {
  UI.modalRedraw = () => visitOcakModal(peerIdx);
  const H = ensureHub();
  const peer = H.peers[peerIdx] || H.peers[0];
  if (!peer) return;
  H.visitedOcak = H.visitedOcak || {};
  const vState = H.visitedOcak[peer.handle] || { warmed: false, petted: false, notes: [
    { by: '@leydi_sureyya', text: 'Kuluçka ocağınız hep sıcak kalsın, soyunuz parlasın!' },
    { by: '@kuzey_ruzgari', text: 'Muhafız ejderhanız gerçekten heybetli duruyor.' },
  ] };
  H.visitedOcak[peer.handle] = vState;
  const aff = getPeerAff(peer.handle);
  const eggMock = { id: 'pegg', genes: peer.d.genes || randomGenes({ el: peer.d.el }) };

  showModal(`<div class="parch">
    <p class="kicker">Komşu Ocağı Ziyareti · ${esc(peer.guild || 'Ocak Birliği')}</p>
    <h2>${esc(peer.handle)} Ocağı — “${esc(peer.title || 'Ocak Ustası')}”</h2>
    <p class="mute sm">Dostluk Derecesi: <b>${aff}/100 (${peerAffLabel(aff)})</b> · Ocak Savunması: <b>+%${peer.defenseBonus || 15}</b> · Kurulu Yapılar: <b>Kuluçka Ocağı, Gen Laboratuvarı, Şifahane, Ejder Heykeli</b></p>

    <div class="mp-grid hub-visit-grid">
      <div class="mp-card-preview">
        <div class="mp-card-head">
          <span>Yıldız Ejderhası</span>
          <span>${EL_AD[peer.d.el]}</span>
        </div>
        <div class="mp-card-art">${dragonSVG(peer.d)}</div>
        <h3>${esc(peer.d.name)} ${sexIc(peer.d.sex)}</h3>
        <p class="sm mute">${phenoTitle(peer.d)}</p>
        <div class="hub-visit-btns">
          <button class="btn primary sm" data-a="visit-pet" data-i="${peerIdx}" ${vState.petted ? 'disabled' : ''}>${vState.petted ? 'Ejderhası Sevildi' : `${esc(peer.d.name)}'i Sev & Tımar Et (+10 Dostluk)`}</button>
          <button class="btn ghost sm" data-a="visit-warm" data-i="${peerIdx}" ${vState.warmed ? 'disabled' : ''}>${vState.warmed ? 'Kuluçkası Isıtıldı' : 'Kuluçka Yumurtasını Isıt (+20 Altın & +10 Dostluk)'}</button>
        </div>
      </div>

      <div class="mp-controls">
        <h4>Kuluçka Yuvası ve Sürü</h4>
        <div class="hub-parch-card">
          <div class="hub-parch-egg">${eggSVG(eggMock, 0.5, { glow: true })}</div>
          <div>
            <b>${esc(peer.handle)} Kuluçka Yuvası</b>
            <p class="sm hub-parch-desc">Yuvada ${EL_AD[peer.d.el]} soyundan nadir bir yumurta ısınıyor. Komşu ocaklar ateşe köz attıkça yumurta daha güçlü doğar.</p>
          </div>
        </div>

        <h4>Ocak Misafir Defteri</h4>
        <div class="saray-ranks hub-guestbook-list">
          ${vState.notes.map(n => `<div class="saray-rankrow hub-parch-row"><span><b>${esc(n.by)}:</b> “${esc(n.text)}”</span></div>`).join('')}
        </div>
        <div class="mp-import">
          <input id="visit-note-in" placeholder="Komşu ocağın defterine bir not yaz..." maxlength="80">
          <button class="btn primary sm" data-a="visit-note" data-i="${peerIdx}">Deftere Yaz (+5 Dostluk)</button>
        </div>
      </div>
    </div>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Meydana Dön</button></div>
  </div>`, 'paper wide');
}

function tradePeerModal(peerIdx) {
  UI.modalRedraw = () => tradePeerModal(peerIdx);
  const H = ensureHub();
  const peer = H.peers[peerIdx] || H.peers[0];
  if (!peer) return;
  const aff = getPeerAff(peer.handle);
  const myFoods = Object.keys(FOODS).filter(k => (S.food[k] || 0) > 0);
  const C = typeof ensureChibi === 'function' ? ensureChibi() : null;

  const offers = [
    { k: 'zambak_paketi', giveLabel: '2× Herhangi Yem veya 45 Altın', getLabel: '2× Gece Zambağı + 1× Kar Meyvesi', costGold: 45, reqAff: 0 },
    { k: 'ziyafet_takasi', giveLabel: '65 Altın (Dost İndirimli)', getLabel: '2× Ejder Ziyafeti (Moral & Bağ Şöleni)', costGold: 65, reqAff: 20 },
    { k: 'soy_yumurtasi', giveLabel: '110 Altın + Dostluk Sözü', getLabel: `${esc(peer.d.name)} Soyundan Mühürlü Yumurta`, costGold: 110, reqAff: 30 },
  ];

  const rows = offers.map(o => {
    const locked = aff < o.reqAff;
    return `<div class="saray-rankrow hub-parch-row hub-trade-row">
      <div>
        <b class="hub-trade-title">${o.getLabel}</b><br>
        <small>Karşılığında: <b>${o.giveLabel}</b> ${o.reqAff ? `· Gereken Dostluk: ${o.reqAff}` : ''}</small>
      </div>
      <button class="btn sm primary" data-a="trade-exec" data-i="${peerIdx}" data-k="${o.k}" ${locked || S.gold < o.costGold ? 'disabled' : ''}>${locked ? `${o.reqAff} Dostluk Gerekir` : 'Takası Onayla'}</button>
    </div>`;
  }).join('');

  const shSah = (C && C.shards && (C.shards.sahmeran_kalip || C.shards.sahmeran)) || 0;
  const shKal = (C && C.shards && (C.shards.kalgarot_kalip || C.shards.kalgarot)) || 0;
  const oreObs = (C && C.ores && C.ores.obsidiyen) || 0;
  const oreKeh = (C && C.ores && C.ores.kehribar) || 0;
  const oreMer = (C && C.ores && C.ores.mercan) || 0;
  const oreYil = (C && C.ores && C.ores.yildirim) || 0;

  const matTrades = [
    { giveCat: 'shards', giveKey: 'sahmeran_kalip', giveAd: `1× Şahmeran Sırça Kalıbı (Eldeki: ${shSah})`, getCat: 'shards', getKey: 'kalgarot_kalip', getAd: '1× Kalgarot Kor Kalıbı', can: shSah >= 1 },
    { giveCat: 'shards', giveKey: 'kalgarot_kalip', giveAd: `1× Kalgarot Kor Kalıbı (Eldeki: ${shKal})`, getCat: 'shards', getKey: 'sahmeran_kalip', getAd: '1× Şahmeran Sırça Kalıbı', can: shKal >= 1 },
    { giveCat: 'ores', giveKey: 'obsidiyen', giveAd: `1× Obsidiyen Cevheri (Eldeki: ${oreObs})`, getCat: 'ores', getKey: 'kehribar', getAd: '1× Donmuş Kehribar', can: oreObs >= 1 },
    { giveCat: 'ores', giveKey: 'kehribar', giveAd: `1× Donmuş Kehribar (Eldeki: ${oreKeh})`, getCat: 'ores', getKey: 'mercan', getAd: '1× Derin Mercan Taşı', can: oreKeh >= 1 },
    { giveCat: 'ores', giveKey: 'mercan', giveAd: `1× Derin Mercan Taşı (Eldeki: ${oreMer})`, getCat: 'ores', getKey: 'yildirim', getAd: '1× Yıldırım Kuvarsı', can: oreMer >= 1 },
    { giveCat: 'ores', giveKey: 'yildirim', giveAd: `1× Yıldırım Kuvarsı (Eldeki: ${oreYil})`, getCat: 'ores', getKey: 'obsidiyen', getAd: '1× Obsidiyen Cevheri', can: oreYil >= 1 },
  ];

  const matRows = matTrades.map(mt => `
    <div class="saray-rankrow hub-parch-row hub-trade-row">
      <div>
        <b class="hub-trade-title">🔄 1:1 Takas — ${mt.getAd}</b><br>
        <small>Verilecek: <b>${mt.giveAd}</b> · Komisyonsuz Akran Takası</small>
      </div>
      <button class="btn sm primary" data-a="hub-trade-mat" data-i="${peerIdx}" data-gcat="${mt.giveCat}" data-gkey="${mt.giveKey}" data-rcat="${mt.getCat}" data-rkey="${mt.getKey}" ${!mt.can ? 'disabled' : ''}>1:1 Takas Et</button>
    </div>
  `).join('');

  showModal(`<div class="parch">
    <p class="kicker">Kervansaray Takas Tezgâhı · ${esc(peer.handle)}</p>
    <h2>${esc(peer.handle)} ile Doğrudan Takas (1:1 Kalıp & Cevher Takası)</h2>
    <p class="mute sm">Dostluk derecen: <b>${aff}/100 (${peerAffLabel(aff)})</b> · Kesende <b>${S.gold} altın</b> ve kilerinde <b>${myFoods.length ? myFoods.map(f => FOODS[f].ad + ' ×' + S.food[f]).join(', ') : 'yem yok'}</b>.</p>
    <h4>Kalıp Parçası & Kervan Cevheri 1:1 Takası</h4>
    <div class="saray-ranks hub-trade-list" style="margin-bottom:12px;">${matRows}</div>
    <h4>Kiler & Soy Yumurtası Takası</h4>
    <div class="saray-ranks hub-trade-list">${rows}</div>
    <div class="mbtns"><button class="btn primary" data-a="mclose">Kapat</button></div>
  </div>`, 'paper wide');
}

const HUB_ACT = {
  'hub-canvas-walk'(el, ev) {
    if (!ev || ev.target.closest('.hub-actor') || ev.target.closest('.city-bldg') || ev.target.closest('.hub-topbar')) return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = clamp(((ev.clientX - box.left) / box.width) * 100, 14, 86);
    const y = clamp(((ev.clientY - box.top) / box.height) * 100, 26, 84);
    const H = ensureHub();
    ensureCityRoam(H);
    CITY_ROAM.me.tx = x;
    CITY_ROAM.me.ty = y;
    CITY_ROAM.me.onArrive = null;
    if (typeof mpSendWs === 'function') {
      mpSendWs({ type: 'hub_update', handle: (S && S.handle) || '@ejder_ocagi', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    }

    // Hedef halkası göster
    const ring = document.getElementById('city-walk-ring');
    if (ring) {
      ring.style.left = x.toFixed(1) + '%';
      ring.style.top = y.toFixed(1) + '%';
      ring.classList.remove('on');
      void ring.offsetWidth;
      ring.classList.add('on');
    }
    SFX.play('tick');

    // Yakınlık kontrolü: varış noktasında bir akran varsa varınca selamlaş!
    let nearIdx = -1;
    H.peers.forEach((p, idx) => {
      const rp = CITY_ROAM['peer_' + idx] || p;
      if (Math.hypot(rp.x - x, rp.y - y) < 16) nearIdx = idx;
    });
    if (nearIdx >= 0) {
      CITY_ROAM.me.onArrive = () => {
        H.selPeer = nearIdx;
        const np = H.peers[nearIdx];
        H.myChat = `${np.d.name} ile selamlaştı!`;
        const meBub = document.querySelector('#hub-me-actor .me-bub');
        if (meBub) meBub.textContent = H.myChat;
        addPeerAff(np.handle, 2);
        SFX.play('heart');
        FX.hearts(ev.clientX, ev.clientY);
      };
    }
  },
  'city-bldg-go'(el) {
    const H = ensureHub();
    ensureCityRoam(H);
    const k = el.dataset.k;
    const bx = parseFloat(el.dataset.x) || 50;
    const by = parseFloat(el.dataset.y) || 50;
    CITY_ROAM.me.tx = clamp(bx, 18, 82);
    CITY_ROAM.me.ty = clamp(by, 28, 82);
    SFX.play('tab');
    // Karakter binaya doğru zıplayarak yürür, 380ms sonra bina ekranı açılır!
    setTimeout(() => {
      H.tab = k;
      render();
    }, 380);
  },
  'hub-social-walk'(el) {
    const H = ensureHub(), idx = +el.dataset.i || H.selPeer || 0;
    const peer = H.peers[idx] || H.peers[0];
    const star = byId(S.star) || S.dragons[0];
    if (!peer || !star) return;
    const art = `<div class="vdr">${dragonSVG(star)}</div><div class="vdr second">${dragonSVG(peer.d, { flip: true })}</div>`;
    const opts = [
      `<button class="vopt" data-a="hub-walk-opt" data-i="${idx}" data-m="ziyafet"><b>Av ve İkram Paylaş</b><small>${esc(star.name)} ile ${esc(peer.d.name)} aynı kaptan beslenir (+15 Dostluk, Moral +1)</small></button>`,
      `<button class="vopt" data-a="hub-walk-opt" data-i="${idx}" data-m="ucus"><b>Çınar Üstünde Kanat Kanada Uçuş</b><small>Avlunun üstünde birlikte süzülürler (+15 Dostluk, Bağ +3)</small></button>`,
      `<button class="vopt" data-a="hub-walk-opt" data-i="${idx}" data-m="oyun"><b>Dostça Omuz Güreşi</b><small>Pençelerini saklayarak şakalaşırlar (+15 Dostluk, Cesaret izi)</small></button>`,
    ].join('');
    vn({
      speaker: `${star.name} & ${peer.d.name}`,
      kicker: `Ejderha Tanışması · ${peer.handle}`,
      art,
      text: `${peer.handle} ejderhası ${peer.d.name}'i senin ${star.name}'in yanına getirdi. İki ejderha burunlarını uzatıp birbirini kokluyor; nasıl vakit geçirsinler?`,
      opts,
      bg: sceneOr('meydan', scenePazar()),
    });
  },
  'hub-walk-opt'(el) {
    const H = ensureHub(), idx = +el.dataset.i || 0, m = el.dataset.m;
    const peer = H.peers[idx] || H.peers[0];
    const star = byId(S.star) || S.dragons[0];
    if (!peer || !star) return;
    const newAff = addPeerAff(peer.handle, 15);
    addBond(star, 3);
    addMood(star, 1, true);
    if (m === 'oyun') nudge(star, 'ces', 4);
    else nudge(star, 'sic', 4);
    SFX.play('heart');
    FX.hearts(innerWidth / 2, innerHeight * 0.4);
    chron(`${star.name} ile ${peer.handle}'in ${peer.d.name} ejderhası kaynaştı (Dostluk: ${newAff}/100).`);
    closeModal();
    toast(`<b>Ejderhalar Kaynaştı!</b><br>${esc(peer.handle)} ile dostluğun <b>${newAff}/100 (${peerAffLabel(newAff)})</b> oldu; ${esc(star.name)} moral ve bağ kazandı.`, 'goal');
    saveGame();
    render();
  },
  'hub-visit-ocak'(el) {
    const idx = +el.dataset.i || ensureHub().selPeer || 0;
    pushModal(() => visitOcakModal(idx));
  },
  'visit-pet'(el) {
    const idx = +el.dataset.i || 0, H = ensureHub(), peer = H.peers[idx] || H.peers[0];
    const vState = H.visitedOcak[peer.handle];
    if (!vState || vState.petted) return;
    vState.petted = true;
    const aff = addPeerAff(peer.handle, 10);
    const star = byId(S.star) || S.dragons[0];
    if (star) addMood(star, 1, true);
    SFX.play('heart');
    FX.hearts(innerWidth * 0.35, innerHeight * 0.45);
    toast(`<b>${esc(peer.d.name)} Keyifle Mırıldandı!</b><br>${esc(peer.handle)} ile dostluğun <b>${aff}/100</b> oldu.`);
    saveGame();
    visitOcakModal(idx);
  },
  'visit-warm'(el) {
    const idx = +el.dataset.i || 0, H = ensureHub(), peer = H.peers[idx] || H.peers[0];
    const vState = H.visitedOcak[peer.handle];
    if (!vState || vState.warmed) return;
    vState.warmed = true;
    S.gold += 20;
    S.un += 1;
    const aff = addPeerAff(peer.handle, 10);
    SFX.play('coin');
    toast(`<b>Komşu Kuluçkası Isıtıldı!</b><br>Yardımın karşılığında <b>+20 altın, +1 ün ve +10 dostluk (${aff}/100)</b> kazandın.`);
    saveGame();
    visitOcakModal(idx);
  },
  'visit-note'(el) {
    const idx = +el.dataset.i || 0, H = ensureHub(), peer = H.peers[idx] || H.peers[0];
    const inp = $('#visit-note-in');
    const txt = (inp?.value || '').trim();
    if (!txt) return;
    const vState = H.visitedOcak[peer.handle];
    vState.notes.unshift({ by: S.handle || '@ejder_ocagi', text: txt });
    addPeerAff(peer.handle, 5);
    if (typeof mpSendWs === 'function') mpSendWs({ type: 'chat', handle: S.handle || '@ejder_ocagi', text: `[${peer.handle} Ocağına Not]: ${txt}` });
    SFX.play('page');
    toast('Notun komşu ocağın defterine işlendi (+5 Dostluk).');
    saveGame();
    visitOcakModal(idx);
  },
  'hub-trade-open'(el) {
    const idx = +el.dataset.i || ensureHub().selPeer || 0;
    pushModal(() => tradePeerModal(idx));
  },
  'trade-exec'(el) {
    const idx = +el.dataset.i || 0, k = el.dataset.k, H = ensureHub(), peer = H.peers[idx] || H.peers[0];
    if (!peer) return;
    if (k === 'zambak_paketi' && S.gold >= 45) {
      S.gold -= 45;
      S.food.zambak = (S.food.zambak || 0) + 2;
      S.food.kar = (S.food.kar || 0) + 1;
      addPeerAff(peer.handle, 8);
      SFX.play('coin');
      toast(`<b>Takas Tamamlandı!</b><br>+2 Gece Zambağı ve +1 Kar Meyvesi kilerine eklendi.`);
    } else if (k === 'ziyafet_takasi' && S.gold >= 65) {
      S.gold -= 65;
      S.food.ziyafet = (S.food.ziyafet || 0) + 2;
      addPeerAff(peer.handle, 10);
      SFX.play('coin');
      toast(`<b>Takas Tamamlandı!</b><br>+2 Ejder Ziyafeti kilerine eklendi.`);
    } else if (k === 'soy_yumurtasi' && S.gold >= 110) {
      S.gold -= 110;
      if (typeof linReg === 'function') linReg(peer.d);
      const egg = {
        id: 'e' + S.uid++,
        genes: JSON.parse(JSON.stringify(peer.d.genes || randomGenes({ el: peer.d.el }))),
        sex: pick(['F', 'M']),
        traits: [...(peer.d.traits || ['asil'])],
        w: 0,
        inK: kuluckaFree() > 0,
        gen: (peer.d.gen || 1) + 1,
        parents: [peer.d.name, `${peer.handle} Ocağı`],
        pids: [peer.d.id, null],
        origin: `${peer.handle} ile takas edilen soy yumurtası`,
      };
      S.eggs.push(egg);
      addPeerAff(peer.handle, 15);
      SFX.play('win');
      toast(`<b>Soy Yumurtası Takas Edildi!</b><br>${esc(peer.d.name)} soyundan yumurta yuvana kondu.`, 'goal');
    }
    saveGame();
    tradePeerModal(idx);
  },
  'hub-trade-mat'(el) {
    const idx = +el.dataset.i || 0, H = ensureHub(), peer = H.peers[idx] || H.peers[0];
    const gcat = el.dataset.gcat, gkey = el.dataset.gkey;
    const rcat = el.dataset.rcat, rkey = el.dataset.rkey;
    const C = typeof ensureChibi === 'function' ? ensureChibi() : null;
    if (!C || !C[gcat] || (C[gcat][gkey] || 0) < 1) {
      toast('Takas için yeterli materyalin yok.');
      return;
    }
    C[gcat][gkey]--;
    C[rcat] = C[rcat] || {};
    C[rcat][rkey] = (C[rcat][rkey] || 0) + 1;
    if (peer) addPeerAff(peer.handle, 5);
    SFX.play('coin');
    toast(`<b>1:1 Kalıp/Cevher Takası Tamamlandı!</b><br>${peer ? esc(peer.handle) : 'Akranın'} ile birebir materyal takası yaptın (+5 Dostluk).`, 'goal');
    saveGame();
    tradePeerModal(idx);
  },
  'han-treat'() {
    const H = ensureHub();
    if (H.treatUsed || S.gold < 25) return;
    H.treatUsed = true;
    S.gold -= 25;
    for (const p of H.peers) addPeerAff(p.handle, 12);
    for (const d of S.dragons) addMood(d, 1, true);
    SFX.play('cheer');
    FX.hearts(innerWidth / 2, innerHeight * 0.45);
    toast(`<b>Han Sofrasına Ziyafet Çekildi!</b><br>Masadaki tüm ocaklarla dostluğun <b>+12 arttı</b> ve ejderhalarının morali yükseldi!`, 'goal');
    saveGame();
    render();
  },
  'sofra-seat-go'(el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const H = ensureHub();
    const idx = +el.dataset.i || 0;
    H.selPeer = idx;
    ensureCityRoam(H);
    if (CITY_ROAM.me) {
      CITY_ROAM.me.tx = clamp(+el.dataset.x || 50, 12, 88);
      CITY_ROAM.me.ty = clamp(+el.dataset.y || 68, 35, 86);
    }
    SFX.play('tab');
    render();
  },
  'han-serve-food'(el) {
    const H = ensureHub();
    H.weeklyUses = H.weeklyUses || {};
    if (H.weeklyUses.hanFood) {
      toast('Bu hafta sofraya zaten erzak ikram ettin (Haftada 1 kez).');
      return;
    }
    const fk = el.dataset.f;
    const F = FOODS[fk];
    if (!F || !S.food || (S.food[fk] || 0) < 1) return;
    H.weeklyUses.hanFood = true;
    const peer = H.peers[H.selPeer] || H.peers[0];
    S.food[fk]--;
    const bonus = F.el === peer.d.el ? 16 : 10;
    addPeerAff(peer.handle, bonus);
    let stoneTxt = '';
    if (F.el === peer.d.el && typeof awardChibiStones === 'function') {
      stoneTxt = awardChibiStones({ kor_t1: 1 });
    }
    peer.chat = F.el === peer.d.el
      ? `“En sevdiğim ${F.ad}! Karşılığında sana ocağımın Kıvılcım Kor Taşı'ndan bir parça veriyorum dostum.”`
      : `“Sofran dert görmesin, ${F.ad} pek lezzetliymiş!”`;
    H.lastDice = {
      dice: (H.lastDice && H.lastDice.dice) || ['Çi', 'Alçı', 'Taw', 'Bök'],
      win: 0, canDouble: false, pot: 0,
      text: `${peer.handle} ikram ettiğin ${F.ad} tabağından tattı (+${bonus} Dostluk${stoneTxt ? ' ve ' + stoneTxt : ''}).`,
    };
    SFX.play('eat');
    saveGame();
    render();
  },
  'han-cauldron-add'(el) {
    const H = ensureHub();
    const fk = el.dataset.f;
    const F = FOODS[fk];
    if (!F || !S.food || (S.food[fk] || 0) < 1) return;
    if ((H.cauldronCount || 0) >= 3) {
      toast('Ortak Sefer Kazanı zaten 3/3 malzemeyle kaynıyor! Ziyafeti başlatabilirsin.');
      return;
    }
    S.food[fk]--;
    H.cauldronCount = clamp((H.cauldronCount || 0) + 1, 0, 3);
    const peer = H.peers[H.selPeer] || H.peers[0];
    if (H.cauldronCount < 3 && peer && chance(65)) {
      H.cauldronCount = clamp(H.cauldronCount + 1, 0, 3);
      peer.chat = `“Sen ${F.ad} attın, ben de heybeden baharat ekledim! Kazan fokurduyor!”`;
    }
    SFX.play('eat');
    if (H.cauldronCount >= 3) {
      S.sofraBuff = { week: S.week, dmgBonus: 0.15, staBonus: 25, dropBonus: 0.20 };
      H.cauldronFeastDone = true;
      for (const p of H.peers) addPeerAff(p.handle, 8);
      SFX.play('cheer');
      toast(`<b>🍲 Ortak Sefer Kazanı Kaynadı — Ziyafet Ruhu Aktif!</b><br>Bu hafta <b>+%15 Zindan/Kervan Hasarı</b>, <b>+25 Başlangıç Nefesi</b> ve <b>+%20 Taş/Cevher Düşürme Şansı</b> kazandın!`, 'goal');
    } else {
      toast(`<b>Ortak Sefer Kazanına ${esc(F.ad)} Eklendi (${H.cauldronCount}/3)</b><br>3 malzemeye ulaştığında tüm sofraya 1 haftalık Ziyafet Ruhu verir.`);
    }
    saveGame();
    render();
  },
  'han-cauldron-feast'() {
    const H = ensureHub();
    if ((H.cauldronCount || 0) < 3) {
      toast('Kazanda henüz 3 malzeme yok. Kilerinden erzak atarak kazanı doldur!');
      return;
    }
    S.sofraBuff = { week: S.week, dmgBonus: 0.15, staBonus: 25, dropBonus: 0.20 };
    H.cauldronFeastDone = true;
    for (const p of H.peers) addPeerAff(p.handle, 8);
    SFX.play('cheer');
    toast(`<b>🍲 Ortak Sefer Ziyafeti Başladı!</b><br>1 Haftalık <b>+%15 Zindan/Kervan Hasarı, +25 Nefes ve +%20 Taş/Cevher Şansı</b> aktif!`, 'goal');
    saveGame();
    render();
  },
  'han-dice-bet'(el) {
    const H = ensureHub();
    H.diceBetType = el.dataset.bet || 'gold';
    SFX.play('click');
    render();
  },
  'han-dice'(el) {
    const H = ensureHub(), peer = H.peers[+el.dataset.i || H.selPeer || 0];
    if (!peer) return;
    const betType = H.diceBetType || 'gold';
    const C = typeof ensureChibi === 'function' ? ensureChibi() : null;
    let oreKey = 'obsidiyen';
    if (betType === 'ore') {
      const avail = C && C.ores ? Object.keys(C.ores).filter(k => (C.ores[k] || 0) > 0) : [];
      if (!avail.length) return toast('Bahis için en az 1 Kervan Cevherin olmalı!');
      oreKey = avail[0];
    } else if (betType === 'stone') {
      if (!C || !C.stones || (C.stones.kor_t1 || 0) < 2) return toast('Bahis için en az 2× Kıvılcım Kor Taşın olmalı!');
    } else {
      if (S.gold < 25) return toast('Bahis için en az 25 Altının olmalı!');
    }

    const myRoll = ri(2, 6) + ri(2, 6);
    const peerRoll = ri(1, 6) + ri(1, 6);
    const faces = ['Çi', 'Alçı', 'Taw', 'Bök'];
    const rolledFaces = [pick(faces), myRoll >= peerRoll ? 'Alçı' : 'Bök', pick(faces), myRoll >= peerRoll ? 'Taw' : 'Çi'];
    addPeerAff(peer.handle, 6);

    if (myRoll >= peerRoll) {
      let potLabel = '35 Altın';
      if (betType === 'ore') {
        C.ores[oreKey] = (C.ores[oreKey] || 0) + 1;
        const oreAd = (typeof CHIBI_ORES !== 'undefined' && CHIBI_ORES[oreKey] && CHIBI_ORES[oreKey].ad) || oreKey;
        potLabel = `2× ${oreAd}`;
      } else if (betType === 'stone') {
        C.stones.kor_t1 = (C.stones.kor_t1 || 0) + 2;
        if (typeof syncChibiLegacyKor === 'function') syncChibiLegacyKor(C);
        potLabel = '4× Kıvılcım Kor Taşı';
      } else {
        S.gold += 35;
      }
      H.lastDice = {
        dice: rolledFaces,
        win: 35,
        canDouble: true,
        pot: 35,
        potLabel,
        betType,
        oreKey,
        text: `Kazandın (${myRoll} vs ${peerRoll})! İstersen "Elini Büyüt" ile masadaki ödülü ikiye katla!`,
      };
      SFX.play('win');
      FX.coins(innerWidth / 2, innerHeight / 2);
      toast(`<b>Kemik Aşık Zarı: Kazandın! (${myRoll} vs ${peerRoll})</b><br>${esc(peer.handle)} ile zar attın; <b>${potLabel}</b> kazandın! Şimdi "Elini Büyüt" ile ikiye katlayabilirsin.`, 'goal');
    } else {
      if (betType === 'ore') {
        C.ores[oreKey] = Math.max(0, (C.ores[oreKey] || 0) - 1);
      } else if (betType === 'stone') {
        C.stones.kor_t1 = Math.max(0, (C.stones.kor_t1 || 0) - 2);
        if (typeof syncChibiLegacyKor === 'function') syncChibiLegacyKor(C);
      } else {
        S.gold = Math.max(0, S.gold - 15);
      }
      H.lastDice = {
        dice: rolledFaces,
        win: 0,
        canDouble: false,
        pot: 0,
        text: `${peer.handle} kazandı (${peerRoll} vs ${myRoll}). Dostluğunuz +6 arttı!`,
      };
      SFX.play('page');
      toast(`<b>Kemik Aşık Zarı: ${esc(peer.handle)} Kazandı (${peerRoll} vs ${myRoll})</b><br>Bahsi bıraktın ama keyifli sohbetle dostluğunuz +6 arttı!`);
    }
    saveGame();
    render();
  },
  'han-dice-double'(el) {
    const H = ensureHub();
    const dSt = H.lastDice;
    if (!dSt || !dSt.canDouble || !dSt.pot) return;
    const C = typeof ensureChibi === 'function' ? ensureChibi() : null;
    if (chance(58)) {
      if (dSt.betType === 'ore' && C && C.ores) {
        const ok = dSt.oreKey || 'obsidiyen';
        C.ores[ok] = (C.ores[ok] || 0) + 1;
        if (C.stones) C.stones.kor_t2 = (C.stones.kor_t2 || 0) + 1;
        dSt.text = `Zarlar bir kez daha Alçı geldi! Cevher kazancını ikiye katladın ve +1 Harlı Kor Taşı kazandın!`;
      } else if (dSt.betType === 'stone' && C && C.stones) {
        C.stones.kor_t1 = (C.stones.kor_t1 || 0) + 2;
        C.stones.kor_t2 = (C.stones.kor_t2 || 0) + 1;
        if (typeof syncChibiLegacyKor === 'function') syncChibiLegacyKor(C);
        dSt.text = `Zarlar Alçı geldi! +2× Kıvılcım Kor Taşı ve +1× Harlı Kor Taşı daha kazandın!`;
      } else {
        const extra = dSt.pot;
        S.gold += extra;
        dSt.pot *= 2;
        dSt.text = `Zarlar bir kez daha Alçı geldi! Masadaki keseyi ikiye katladın (+${dSt.pot} Altın toplam kazanç, +2 Ün)!`;
      }
      S.un += 2;
      dSt.canDouble = false;
      SFX.play('win');
    } else {
      if (dSt.betType === 'ore' && C && C.ores) {
        const ok = dSt.oreKey || 'obsidiyen';
        C.ores[ok] = Math.max(0, (C.ores[ok] || 0) - 1);
      } else if (dSt.betType === 'stone' && C && C.stones) {
        C.stones.kor_t1 = Math.max(0, (C.stones.kor_t1 || 0) - 2);
        if (typeof syncChibiLegacyKor === 'function') syncChibiLegacyKor(C);
      } else {
        const lost = Math.round(dSt.pot * 0.5);
        S.gold = Math.max(0, S.gold - lost);
      }
      dSt.canDouble = false;
      dSt.text = `Son zar Bök döndü; kazancın yarısı masada kaldı ama dostluk pekişti.`;
      SFX.play('page');
    }
    saveGame();
    render();
  },
  'spa-scrub-dragon'(el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const H = ensureHub();
    H.scrubbedDragons = H.scrubbedDragons || {};
    const id = +el.dataset.id;
    const d = byId(id);
    if (!d) return;
    if (H.scrubbedDragons[d.id]) {
      toast(`${esc(d.name)} zaten tertemiz keselendi, ılık suda keyif yapıyor.`);
      return;
    }
    H.scrubbedDragons[d.id] = true;
    d.fat = Math.max(0, (d.fat || 0) - 18);
    d.dirt = 0;
    d.mood = 4;
    d.bond = clamp((d.bond || 50) + 5, 0, 100);
    SFX.play('care');
    toast(`<b>${esc(d.name)}</b> şifalı köpük ve keseyle yıkandı: Yorgunluk <b>-18</b>, Bağ <b>+5</b>, Moral <b>Harika</b>!`);
    saveGame();
    render();
  },
  'spa-scrub-peer'(el) {
    const H = ensureHub();
    H.weeklyUses = H.weeklyUses || {};
    const usedCnt = H.weeklyUses.spaScrubPeer || 0;
    if (usedCnt >= 2) {
      toast('Bu hafta İmece Keseleme hakkını doldurdun (Haftada 2 kez).');
      return;
    }
    H.weeklyUses.spaScrubPeer = usedCnt + 1;
    const peer = H.peers[+el.dataset.i || H.selPeer || 0] || H.peers[0];
    const star = byId(S.star) || S.dragons[0];
    if (star) {
      star.fat = Math.max(0, (star.fat || 0) - 20);
      star.dirt = 0;
      star.mood = 4;
    }
    if (peer) addPeerAff(peer.handle, 8);
    S.spaBuff = { week: S.week, hazardResist: 0.25 };

    let giftLabel = '';
    if (chance(60) && typeof awardChibiStones === 'function') {
      giftLabel = awardChibiStones({ kor_t2: ri(1, 2) });
    } else {
      const oreKey = pick(['obsidiyen', 'kehribar', 'mercan', 'yildirim']);
      if (typeof awardChibiStones === 'function') {
        giftLabel = awardChibiStones({ [oreKey]: 1 });
      }
    }
    SFX.play('wash');
    FX.hearts(innerWidth / 2, innerHeight * 0.45);
    toast(`<b>🧼 İmece Keseleme & Buhar Kesesi! (${H.weeklyUses.spaScrubPeer}/2)</b><br>${peer ? esc(peer.handle) : 'Akranın'} ile ejderhaları tımar ettiniz: Yorgunluk <b>-20</b>, Buhar Kesesi ödülü: <b>${giftLabel || '1× Harlı Kor Taşı'}</b> ve <b>🛡️ Termal Pul Zırhı (%25 Lav/Asit Direnci)</b> aktif!`, 'goal');
    saveGame();
    render();
  },
  'han-cheer'(el) {
    const H = ensureHub();
    const peer = H.peers[H.selPeer] || H.peers[0];
    SFX.play('coin');
    const cheers = [
      '“Ocaklarımızın ateşi hiç sönmesin!”',
      '“Ejderhalarımızın kanatları göğü fethetsin!”',
      '“Birlik ve zafer şerefine kadeh kaldırıyoruz!”',
      '“Kervan yollarınız daima açık olsun dostlar!”'
    ];
    peer.chat = pick(cheers);
    H.lastDice = { dice: H.lastDice?.dice || ['Çi', 'Alçı', 'Taw', 'Bök'], win: 0, text: `${peer.handle} kadeh kaldırdı: ${peer.chat}` };
    toast(`${esc(peer.handle)} ile kadehler tokuşturuldu!`);
    render();
  },
  'spa-stone'() {
    const H = ensureHub();
    H.weeklyUses = H.weeklyUses || {};
    if (H.weeklyUses.spaStone) {
      toast('Bu hafta sıcak göbek taşında zaten dinlenildi (Haftada 1 kez).');
      return;
    }
    H.weeklyUses.spaStone = true;
    S.dragons.forEach(d => { d.mood = 4; d.fat = Math.max(0, (d.fat || 0) - 10); });
    toast('Sıcak göbek taşında dinlenildi; ejderhaların neşesi yerine geldi (-10 Yorgunluk, 1/Hafta).');
    SFX.play('rest');
    saveGame();
    render();
  },
  'spa-mud'() {
    const H = ensureHub();
    if (H.spaMudUsed) return toast('Bu hafta şifalı kil zaten sürüldü.');
    H.spaMudUsed = true;
    S.dragons.forEach(d => {
      d.fat = Math.max(0, d.fat - 15);
      if (d.st) { d.st.gu = (d.st.gu || 30) + 2; d.st.da = (d.st.da || 30) + 2; }
    });
    toast('Volkanik şifalı kil tüm ejderhaların pullarına sürüldü (+2 Güç, +2 Dayanıklılık).');
    SFX.play('build');
    saveGame();
    render();
  },
  'spa-tea'() {
    const H = ensureHub();
    H.weeklyUses = H.weeklyUses || {};
    if (H.weeklyUses.spaTea) {
      toast('Bu hafta şifalı çay zaten ikram edildi (Haftada 1 kez).');
      return;
    }
    H.weeklyUses.spaTea = true;
    H.peers.forEach(p => {
      const cur = getPeerAff(p.handle);
      if (S.peerAff) S.peerAff[p.handle] = Math.min(100, cur + 6);
    });
    toast('Masadaki tüm terbiyecilere sıcak kekik & ıhlamur çayı ikram edildi (+6 Dostluk, 1/Hafta).');
    SFX.play('coin');
    saveGame();
    render();
  },
  'han-ballad'(el) {
    const H = ensureHub(), peer = H.peers[+el.dataset.i || H.selPeer || 0];
    H.weeklyUses = H.weeklyUses || {};
    if (H.weeklyUses.hanBallad) {
      toast('Ozan bu hafta zaten dostluk destanı söyledi (Haftada 1 kez).');
      return;
    }
    const star = byId(S.star) || S.dragons[0];
    if (!peer || !star || S.gold < 20) return;
    H.weeklyUses.hanBallad = true;
    S.gold -= 20;
    S.un += 2;
    const aff = addPeerAff(peer.handle, 15);
    const line = `Ozan Çınar sazına vurdu: "${star.name} ile ${peer.d.name} göklerde kardeş, iki ocağın sancağı sönmez bir ateş!"`;
    if (typeof MP !== 'undefined') {
      MP.chatLog = MP.chatLog || [];
      MP.chatLog.push({ handle: '@ozan_cinar', text: line, ts: Date.now() });
    }
    SFX.play('win');
    toast(`<b>Ozan Dostluk Türküsü Yaktı!</b><br>+2 Ün ve ${esc(peer.handle)} ile +15 Dostluk (${aff}/100) kazandın!`, 'goal');
    saveGame();
    render();
  },
  'hub-tab'(el) {
    ensureHub().tab = el.dataset.k;
    SFX.play('tab');
    render();
  },
  'hub-peer'(el) {
    ensureHub().selPeer = +el.dataset.i;
    SFX.play('click');
    render();
  },
  'hub-pose'(el) {
    const H = ensureHub();
    H.myPose = el.dataset.p;
    H.myChat = el.dataset.msg;
    SFX.play('roar');
    if (typeof mpSendWs === 'function') {
      const star = byId(S.star) || S.dragons[0];
      mpSendWs({ type: 'hub_update', handle: S.handle || '@ejder_ocagi', pose: H.myPose, chat: H.myChat, d: star });
    }
    render();
  },
  'hub-chat-send'() {
    const inp = $('#hub-chat-in');
    const txt = (inp?.value || '').trim();
    if (!txt) return;
    const H = ensureHub();
    H.myChat = txt;
    if (typeof MP !== 'undefined') {
      MP.chatLog = MP.chatLog || [];
      MP.chatLog.push({ handle: S.handle || '@ejder_ocagi', text: txt, ts: Date.now() });
      if (typeof mpSendWs === 'function') mpSendWs({ type: 'chat', handle: S.handle || '@ejder_ocagi', text: txt });
    }
    SFX.play('click');
    render();
  },
  'hub-boss-atk'() {
    const H = ensureHub();
    const star = byId(S.star) || S.dragons[0];
    if (!star || H.bossHit) return;
    H.bossHit = true;
    const wEv = currentWorldEvent();
    const evMult = wEv.bossMult || 1;
    const dmg = Math.round((star.st.gu * 4.2 + star.st.ce * 2.5 + star.st.da * 2.2 + star.st.ze * 2.8) * (star.hybrid ? 1.35 : 1) + ri(80, 180));
    const B = ensureWorldBoss();
    B.hp = Math.max(0, B.hp - dmg);
    const h = S.handle || '@ejder_ocagi';
    B.contributors[h] = B.contributors[h] || { handle: h, guild: S.guild || 'Kızıl Ocak Birliği', dName: star.name, dmg: 0 };
    B.contributors[h].dmg += dmg;
    const goldReward = Math.round(Math.min(320, dmg * 0.14) * evMult);
    S.gold += goldReward;
    S.un += 4;
    S.food.ziyafet = (S.food.ziyafet || 0) + 1;
    const bossDropMap = { kor_t3: ri(2, 3) };
    if (chance(35)) bossDropMap.kiyamet_ozu = 1;
    const stoneDropTxt = typeof awardChibiStones === 'function' ? awardChibiStones(bossDropMap) : '';
    SFX.play('roar');
    SFX.play('win');
    FX.burst(innerWidth / 2, innerHeight * 0.4, '#ff7a3a', 42);
    chron(`${star.name}, Kadim Felaket Kül Yutan'a ${dmg} hasar vurdu! (+${goldReward} altın, +4 ün, +1 Ejder Ziyafeti${stoneDropTxt ? ', ' + stoneDropTxt : ''})`);
    toast(`<b>KÜL YUTAN TAARRUZU!</b><br>${esc(star.name)} <b>${dmg} hasar</b> indirdi! Ödül: <b>+${goldReward} altın, +4 ün, +1 Ejder Ziyafeti${stoneDropTxt ? ' · ' + stoneDropTxt : ''}</b>!`, 'goal');
    if (typeof mpRecordBossHit === 'function') mpRecordBossHit(star, dmg);
    saveGame();
    render();

    if (typeof document !== 'undefined' && document.body) {
      const cutImg = asset('cut-kulyutan-cataclysm') || asset('bg-raid') || asset('bg-pit') || 'img/cut-kulyutan-cataclysm.webp';
      const starArt = star.stage === 'yetiskin' && typeof hasPose === 'function' && hasPose(star, 'P2') ? poseSVG(star, 'P2', { face: 'r', still: true }) : dragonSVG(star, { still: true });
      const auraHtml = typeof cutAura === 'function' ? cutAura(star.el || 'ates') : '';
      const debsHtml = typeof cutDebris === 'function' ? cutDebris('62% 42%') : '';
      const hpPct = Math.max(0, Math.round((B.hp / B.maxHp) * 100));
      const el = document.createElement('div');
      el.className = 'rcut fcut nefes';
      el.style.position = 'fixed';
      el.style.zIndex = '95';
      el.style.pointerEvents = 'auto';
      el.innerHTML = `
        <div class="rcp" style="--vp:62% 42%">
          <div class="rcbg own" style="background-image:url('${cutImg}')"></div>
          <div class="rclines"></div>
          <div class="rcrad"></div>
          <div class="rctone"></div>
          ${debsHtml}
          <i class="fbreath" style="--c:#ef7f3e"></i>
          <div class="rcd fsA mine" style="left:4%;top:8%;width:48%;height:86%">${starArt}${auraHtml}<span class="rcn">${esc(star.name)}</span></div>
          <div class="rccap">${esc(star.name)} alevlerin içinden yarıp geçerek Kül Yutan'a ${dmg.toLocaleString('tr-TR')} hasar indirdi!</div>
          <b class="rcono">KÜL TUFANI!</b>
        </div>
      `;
      document.body.appendChild(el);
      let closed = false;
      const finishCutIn = () => {
        if (closed) return;
        closed = true;
        el.classList.add('out');
        setTimeout(() => {
          try { el.remove(); } catch (e) {}
          const reportHtml = `
            <div class="mhead">
              <h3>Kül Yutan — Taarruz Raporu</h3>
              <button class="icb xbtn" data-a="mclose" aria-label="Kapat">${ui('x')}</button>
            </div>
            <div class="mbody">
              <p class="lead"><b>${esc(star.name)}</b>, Kadim Felaket <b>${esc(B.name || 'Kül Yutan')}</b>’ın Kıyamet Külleri tufanına göğüs gererek cepheyi yardı!</p>
              <div class="boss-rewards">
                <span>Verilen Hasar: <b>${dmg.toLocaleString('tr-TR')}</b></span>
                <span>Kalan Boss Canı: <b>${B.hp.toLocaleString('tr-TR')} / ${B.maxHp.toLocaleString('tr-TR')} (%${hpPct})</b></span>
                <span>Ganimet: <b>+${goldReward} Altın · +4 Ün · +1 Ejder Ziyafeti${stoneDropTxt ? ' · ' + stoneDropTxt : ''}</b></span>
              </div>
              <div class="mact">
                <button class="btn primary" data-a="mclose">Sancakla Dön</button>
              </div>
            </div>
          `;
          if (typeof showModal === 'function') showModal(reportHtml, 'raid-report-modal');
          else if (typeof openModal === 'function') openModal(reportHtml, 'raid-report-modal');
        }, 380);
      };
      el.addEventListener('click', finishCutIn, { once: true });
      setTimeout(finishCutIn, 1650);
    }
  },
  'hub-boss-comic'() {
    if (typeof comicModal === 'function' && typeof COMIC !== 'undefined' && COMIC.kul_yutan_prolog) {
      comicModal({
        id: 'kul_yutan_prolog',
        title: 'Yedi Volkanın Felaketi: Kül Yutan',
        opts: [
          { t: 'Meydan Okumayı Kabul Et (+2 Ün)', fx: () => { S.un += 2; return 'Kül Yutan’ın kükremesine karşı sancağını kaldırdın (+2 Ün)!'; } },
          { t: 'Yanık Kaldera (Kalgarot) Baskınına Gir', fx: () => { if (typeof openAnimTestRoom === 'function') setTimeout(() => openAnimTestRoom({ raidId: 'komutan', screen: 'battle' }), 60); return 'Kaldera cephesine doğru harekete geçtin!'; } },
        ]
      });
    }
  },
  'lonca-route'(el) {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    H.caravanConvoy = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    H.caravanConvoy.route = el.dataset.r || 'kizil_vadi';
    SFX.play('tab');
    render();
  },
  'lonca-slot-coop'(el) {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    const slotNum = +el.dataset.slot || 2;
    const peerIdx = +el.dataset.i || 0;
    const peer = H.peers[peerIdx] || H.peers[0];
    if (!peer) return;
    H.caravanConvoy = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    const slotObj = { mode: 'coop', peerIdx, handle: peer.handle, dName: peer.d.name, el: peer.d.el };
    if (slotNum === 3) H.caravanConvoy.slot3 = slotObj;
    else H.caravanConvoy.slot2 = slotObj;
    SFX.play('bell');
    toast(`<b>🤝 Co-op Muhafız Katıldı!</b><br>${esc(peer.handle)} (${esc(peer.d.name)} · ${EL_AD[peer.d.el]}) ${slotNum}. muhafız slotuna yerleşti (+%25 Cevher Bonusu, 0 Yorgunluk).`);
    saveGame();
    render();
  },
  'lonca-slot-clear'(el) {
    const H = ensureHub();
    const slotNum = +el.dataset.slot || 2;
    if (H.caravanConvoy) {
      if (slotNum === 3) H.caravanConvoy.slot3 = null;
      else H.caravanConvoy.slot2 = null;
    }
    SFX.play('click');
    render();
  },
  'lonca-fill-own'() {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    const star = byId(S.star) || S.dragons[0];
    const others = S.dragons.filter(d => !star || d.id !== star.id);
    H.caravanConvoy = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    if (!H.caravanConvoy.slot2) {
      const d2 = others[0] || star;
      if (d2) H.caravanConvoy.slot2 = { mode: 'own', dragonId: d2.id, handle: S.handle || '@ejder_ocagi', dName: d2.name, el: d2.el };
    }
    if (!H.caravanConvoy.slot3) {
      const d3 = others[1] || others[0] || star;
      if (d3) H.caravanConvoy.slot3 = { mode: 'own', dragonId: d3.id, handle: S.handle || '@ejder_ocagi', dName: d3.name, el: d3.el };
    }
    SFX.play('click');
    toast('<b>🐉 Solo Sürü Muhafızları Dizildi</b><br>Boş kervan slotları kendi süründen tamamlandı (Yola çıkarken +20 Yorgunluk alırlar).');
    saveGame();
    render();
  },
  'lonca-battle'() {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    const star = byId(S.star) || S.dragons[0];
    if (!star) return;
    const conv = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    const distinctEls = new Set([star.el, conv.slot2 && conv.slot2.el, conv.slot3 && conv.slot3.el].filter(Boolean));
    const triEl = !!(conv.slot2 && conv.slot3 && distinctEls.size === 3);
    const coopCnt = [conv.slot2, conv.slot3].filter(s => s && s.mode === 'coop').length;
    if (typeof openAnimTestRoom === 'function') {
      openAnimTestRoom({
        raidId: 'caravan',
        gameMode: 'caravan',
        caravanRoute: conv.route || 'kizil_vadi',
        caravanMode: 'escort',
        caravanCoopCount: coopCnt,
        caravanTriElement: triEl,
        screen: 'battle',
      });
    }
  },
  'lonca-join'(el) {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const cvs = ensureCaravans();
    const cv = cvs[+el.dataset.i] || cvs[0];
    if (!cv) return;
    if (typeof openAnimTestRoom === 'function') {
      openAnimTestRoom({
        raidId: 'caravan',
        gameMode: 'caravan',
        caravanRoute: cv.routeKey || 'kizil_vadi',
        caravanMode: 'escort',
        caravanCoopCount: 2,
        caravanTriElement: true,
        screen: 'battle',
      });
    }
  },
  'hub-caravan-send'() {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    const star = byId(S.star) || S.dragons[0];
    if (!star || H.myCaravanSent) return;
    const conv = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
    const rt = CARAVAN_ROUTES[conv.route] || CARAVAN_ROUTES.kizil_vadi;

    // Solo sürü yorgunluğu (+20)
    [conv.slot2, conv.slot3].forEach(sl => {
      if (sl && sl.mode === 'own' && sl.dragonId) {
        const d = byId(sl.dragonId);
        if (d) d.fat = clamp((d.fat || 0) + 20, 0, 100);
      }
    });

    const coopCnt = [conv.slot2, conv.slot3].filter(s => s && s.mode === 'coop').length;
    const distinctEls = new Set([star.el, conv.slot2 && conv.slot2.el, conv.slot3 && conv.slot3.el].filter(Boolean));
    const triEl = !!(conv.slot2 && conv.slot3 && distinctEls.size === 3);

    H.myCaravanSent = true;
    const wEv = currentWorldEvent();
    const goldEarned = Math.round(rt.cargo * (wEv.caravanMult || 1) * (1 + coopCnt * 0.25));
    S.gold += goldEarned;
    S.un += 3;
    S.food.ziyafet = (S.food.ziyafet || 0) + 1;

    let oreAmt = ri(1, 2) + (coopCnt > 0 ? 1 : 0);
    if (triEl) oreAmt *= 2;
    const dropObj = { [rt.ore]: oreAmt, kor_t2: triEl ? 2 : 1 };
    if (chance(25)) dropObj.kor_t3 = 1;
    if (triEl && chance(35)) {
      const shKey = chance(50) ? 'sahmeran' : 'kalgarot';
      dropObj[shKey] = 1;
    }
    const rewardTxt = typeof awardChibiStones === 'function' ? awardChibiStones(dropObj) : '';

    const cvs = ensureCaravans();
    const myCv = {
      id: 'cv_me',
      guild: S.guild || 'Kızıl Ocak Birliği',
      owner: S.handle || '@ejder_ocagi',
      route: rt.ad,
      routeKey: rt.id,
      ore: rt.ore,
      cargo: goldEarned,
      foodReward: rt.food || 'ziyafet',
      guardName: star.name,
      guardEl: star.el,
      guardPower: Math.round((star.st.gu + star.st.da + star.st.ce) / 3),
      raidedBy: [],
    };
    cvs.unshift(myCv);
    if (typeof mpSendCaravan === 'function') mpSendCaravan('escort', { star, cargo: goldEarned, route: rt.id });
    SFX.play('coin');
    SFX.play('win');
    chron(`${star.name} eskortluğunda ${rt.ad} kervanı yola çıktı (+${goldEarned} altın, ${rewardTxt}).`);
    toast(`<b>📦 ${esc(rt.ad)} Konvoyu Yola Çıktı!</b><br>Ödül: <b>+${goldEarned} Altın, +3 Ün, +1 Ejder Ziyafeti${rewardTxt ? ' · ' + rewardTxt : ''}</b>${triEl ? '<br><b style="color:#ffd86b;">✨ Üçlü Element Sancağı Bonusu (2× Cevher) Uygulandı!</b>' : ''}`, 'goal');
    saveGame();
    render();
  },
  'hub-caravan-raid'(el) {
    if (typeof canEnterZindanOrTopcu === 'function' && !canEnterZindanOrTopcu()) {
      toast('🔒 Kervan Yolu\'na çıkmak için önce Kızıl Taç Turnuvası Şampiyonu olmalı ve yıldız ejderhanızı Ebedi Gençlik İksiri ile kutsamalısınız!');
      return;
    }
    const H = ensureHub();
    const cvs = ensureCaravans();
    const cv = cvs[+el.dataset.i];
    const star = byId(S.star) || S.dragons[0];
    if (!cv || !star) return;
    H.raidedCaravans = H.raidedCaravans || {};
    H.raidedCaravans[cv.id] = true;
    if (typeof mpSendCaravan === 'function') mpSendCaravan('raid', { caravanId: cv.id });
    if (typeof openAnimTestRoom === 'function') {
      openAnimTestRoom({
        raidId: 'caravan',
        gameMode: 'caravan',
        caravanRoute: cv.routeKey || 'kizil_vadi',
        caravanMode: 'raid',
        caravanTargetOwner: cv.owner,
        caravanCoopCount: 1,
        caravanTriElement: false,
        screen: 'battle',
      });
    }
  },
  'hub-revenge'(el) {
    const raids = ensureRaidLog();
    const rd = raids[+el.dataset.i];
    const star = byId(S.star) || S.dragons[0];
    if (!rd || !star) return;
    rd.revenged = true;
    const H = ensureHub();
    const peer = H.peers.find(p => p.handle === rd.attacker) || H.peers[0];
    if (typeof startLiveDuelRoom === 'function') {
      pushModal(() => startLiveDuelRoom(star, peer, { mode: 'revenge', revengeId: rd.id, rewardGold: 95 }));
    }
  },
  'hub-bounty'(el) {
    const H = ensureHub();
    const peer = H.peers[+el.dataset.i || 0];
    const star = byId(S.star) || S.dragons[0];
    if (!peer || !star) return;
    if (typeof startLiveDuelRoom === 'function') {
      pushModal(() => startLiveDuelRoom(star, peer, { mode: 'bounty', label: 'Ödül Avı Kontratı', rewardGold: 140 }));
    }
  },
  'hub-coop'(el) {
    const H = ensureHub();
    const peer = H.peers[+el.dataset.i || 0];
    if (!peer) return;
    S.coopPartner = { handle: peer.handle, dName: peer.d.name, el: peer.d.el, gu: peer.d.st.gu, ze: peer.d.st.ze };
    SFX.play('bell');
    toast(`<b>Ortak Sefer Anlaşması Kuruldu</b><br>Bir sonraki seferinde <b>${esc(peer.handle)} (${esc(peer.d.name)})</b> sana eşlik edecek (+15 nitelik desteği).`);
    saveGame();
    render();
  },
  'hub-live-duel'(el) {
    const H = ensureHub();
    const peer = H.peers[+el.dataset.i];
    const star = byId(S.star) || S.dragons[0];
    if (!peer || !star) return;
    if (typeof startLiveDuelRoom === 'function') {
      pushModal(() => startLiveDuelRoom(star, peer, { mode: 'live', rewardGold: 85 }));
    }
  },
  'hub-gift'(el) {
    const H = ensureHub(), idx = +el.dataset.i, p = H.peers[idx];
    if (!p || H.giftSent[idx]) return;
    H.giftSent[idx] = true;
    S.gold += 15;
    SFX.play('coin');
    toast(`<b>${esc(p.handle)}</b> ocağının kuluçka ateşine köz attın! Karşılığında sana <b>+15 altın</b> teşekkür hediyesi gönderdi.`);
    saveGame();
    render();
  },
  'hub-go-stud'(el) {
    const H = ensureHub();
    H.selPeer = +el.dataset.i;
    H.tab = 'damizlik';
    SFX.play('page');
    render();
  },
  'hub-mybreed'(el) {
    UI.sel = +el.dataset.id;
    SFX.play('click');
    render();
  },
  'hub-breed-do'(el) {
    const H = ensureHub(), idx = +el.dataset.i, p = H.peers[idx];
    const myD = byId(+el.dataset.my);
    const fee = Math.round(((p && p.studFee) || 95) * (getPeerAff(p.handle) >= 30 ? 0.65 : 1));
    if (!p || !myD || S.gold < fee) return;
    S.gold -= fee;
    if (typeof linReg === "function") linReg(p.d);
    const { genes, muts } = inheritGenes(myD, p.d);
    const { traits, mut } = inheritTraits(myD, p.d, 80);
    const egg = {
      id: 'e' + S.uid++,
      genes,
      sex: pick(['F', 'M']),
      traits,
      traitMut: mut,
      muts,
      w: 0,
      inK: kuluckaFree() > 0,
      gen: Math.max(myD.gen || 1, p.d.gen || 1) + 1,
      parents: [myD.name, `${p.d.name} (${p.handle})`],
      pids: [myD.id, p.d.id],
      origin: `${p.handle} ile ortak damızlık yumurtası`,
    };
    S.eggs.push(egg);
    S.st.bred++;
    SFX.play('win');
    FX.hearts(innerWidth / 2, innerHeight / 2);
    chron(`${myD.name} ile ${p.handle}'in ${p.d.name} ejderhası eşleşti; yeni bir asil yumurta alındı!`);
    toast(`<b>Ortak Yumurta Alındı!</b> ${egg.inK ? 'Kuluçka Ocağı\'na yerleştirildi.' : 'Yuva sepetine kondu.'}`, 'goal');
    saveGame();
    UI.view = 'yuva';
    render();
  },
  'hub-spa-use'() {
    const H = ensureHub();
    if (H.spaUsed) return;
    H.spaUsed = true;
    for (const d of S.dragons) {
      d.fat = clamp(d.fat - 35, 0, 100);
      d.dirt = 0;
      if (d.inj > 0) d.inj = Math.max(0, d.inj - 1);
      addMood(d, 1, true);
    }
    SFX.play('wash');
    FX.hearts(innerWidth / 2, innerHeight * 0.4);
    toast('Tüm ejderhaların Ortak Kaplıca\'da yıkandı, dinlendi (-35 yorgunluk) ve neşelendi!');
    saveGame();
    render();
  },
  'hub-duel'(el) {
    const H = ensureHub(), p = H.peers[+el.dataset.i];
    const star = byId(S.star) || S.dragons[0];
    if (!p || !star) return;
    if (typeof startLiveDuelRoom === 'function') {
      pushModal(() => startLiveDuelRoom(star, p, { mode: 'raid', label: 'Ocak Baskını', rewardGold: 75 }));
    }
  },
  'node-pick'(el) {
    if (!NODE_EX) return;
    const next = +el.dataset.next;
    NODE_EX.cur = next;
    NODE_EX.visited.push(next);
    SFX.play('page');
    renderNodeSefer();
  },
  'node-resolve'() {
    if (!NODE_EX) return;
    const N = NODE_EX.nodes[NODE_EX.cur];
    const r = N.Resolve(NODE_EX.e);
    NODE_EX.res = r.msg;
    SFX.play(r.ok ? 'coin' : 'miss');
    renderNodeSefer();
  },
  'node-local'(el) {
    if (!NODE_EX) return;
    const N = NODE_EX.nodes[NODE_EX.cur];
    const o = N.localOpts[+el.dataset.i];
    if (!o) return;
    NODE_EX.res = o.fx(NODE_EX.e, NODE_EX.r);
    SFX.play('win');
    renderNodeSefer();
  },
  'node-next'() {
    if (!NODE_EX) return;
    const N = NODE_EX.nodes[NODE_EX.cur];
    NODE_EX.res = null;
    NODE_EX.cur = N.next;
    NODE_EX.visited.push(N.next);
    SFX.play('page');
    renderNodeSefer();
  },
};


/* ---------- PANORAMİK İZOMETRİK KASABA HARİTASI (MENÜ GÖRÜNÜMÜ) ---------- */
function kasabaView() {
  ensureStar();
  const idle = S.dragons.filter(d => needsOrder(d)).length;
  const wEv = currentWorldEvent();
  const chFc = typeof calcChibiStats === "function" ? calcChibiStats().totalFc : 850;

  const nodes = [
    // Sol Yeşil Yamaç: Ev & Ocak Kümesi (Ocak, Ahır ve Yuva birbirine yakın konuşlanmış)
    {
      k: "ocak", ad: "Dedenin Ocağı", grp: "Ev & Ocak Kümesi",
      sub: "Köz ocağı, dinlenme odası, kiler ve dedenin yadigârları",
      x: 11.5, y: 57.5, sz: 155, act: "go", v: "ocak", badge: "",
    },
    {
      k: "ahir", ad: "Taş Ahır", grp: "Ev & Ocak Kümesi",
      sub: `${S.dragons.length}/${capacity()} Ejderha · ${idle ? idle + " ejderha görev bekliyor!" : "Sürü hazır"}`,
      x: 18.5, y: 50.0, sz: 148, act: "go", v: "ahir", badge: idle || "",
    },
    {
      k: "yuva", ad: "Yuva Bahçesi", grp: "Ev & Ocak Kümesi",
      sub: S.eggs.length ? `Kuluçkada ${S.eggs.length} yumurta ısınıyor` : "Çiftleştirme ve kuluçka bahçesi",
      x: 27.0, y: 57.0, sz: 145, act: "go", v: "yuva", badge: S.eggs.length || "",
    },
    // Kuzey Dağ Kalesi & Kanyon Geçidi: Sefer
    {
      k: "sefer", ad: "Sefer & Keşif Kapısı", grp: "Kuzey Kalesi",
      sub: S.flags.sefer ? "8 Biyom · Keşif patikaları, Zindanlar ve Er Meydanı" : "2. haftada açılır",
      x: 41.5, y: 16.0, sz: 152, act: "go", v: "sefer", lock: !S.flags.sefer, badge: "",
    },
    // Merkez Şehir Meydanı & Çarşı: Pazar ve Kervansaray
    {
      k: "pazar", ad: "Gece Çarşısı (Pazar)", grp: "Merkez Meydan",
      sub: "Demirci Usta Kerim (Kor Örsü & Dökümhane), Bedesten ve Tüccarlar",
      x: 58.5, y: 54.0, sz: 168, act: "go", v: "pazar", badge: "",
    },
    {
      k: "meydan", ad: "Kervansaray Meydanı", grp: "Sosyal Avlu",
      sub: "Sosyal avlu, Han Sofrası, Buharlı Ilıca, Kervan Yolu ve Kül Yutan",
      x: 57.0, y: 45.0, sz: 162, act: "go", v: "meydan", badge: "",
    },
    // Sağ Üst Kraliyet Akropolü: Arena & Saray
    {
      k: "arena", ad: "Arena & Saray", grp: "Kraliyet Tepesi",
      sub: S.tour && !S.tour.done ? `${S.tour.ad} Turnuvası Başladı!` : "Dövüş ligleri (Kor Taşı Kaynağı), Gök Yarışı, Saray Zarafeti ve Kule",
      x: 83.5, y: 21.0, sz: 178, act: "go", v: "arena", badge: S.tour && !S.tour.done ? "!" : "",
    },
    // Sağ Alt Savunma Kulesi: Terbiyeci Konağı (Gardırop & Sima)
    {
      k: "konak", ad: "Terbiyeci Konağı", grp: "Kuşanma & Gardırop",
      sub: `Terbiyeci Kuşanma Dolabı ve Sima Özelleştirme · Kudret ${chFc}`,
      x: 88.5, y: 72.0, sz: 150, act: "chibi-open", v: "", badge: "",
    },
  ];

  // Bağlantı yolları (Ocak-Ahır-Yuva üçgeni ve ana kasaba patikaları)
  const trailsSvg = `<svg class="kasaba-trails" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
    <!-- Ocak - Ahır - Yuva Ev Kümesi Üçgeni -->
    <path d="M135,414 Q200,385 268,348 M135,414 Q142,320 152,228 M152,228 Q210,285 268,348" stroke="#ffd875" stroke-width="3" stroke-dasharray="7 6" fill="none" opacity=".68"/>
    <!-- Ev Kümesinden Orta Meydana (Pazar & Kervansaray) -->
    <path d="M268,348 Q375,380 485,378 Q550,340 615,294" stroke="#f2ba58" stroke-width="2.6" stroke-dasharray="6 7" fill="none" opacity=".52"/>
    <!-- Orta Meydandan Sefer, Arena ve Terbiyeci Konağına -->
    <path d="M485,378 Q455,270 432,162 M615,294 Q700,230 782,168 M615,294 Q740,365 860,432" stroke="#f2ba58" stroke-width="2.4" stroke-dasharray="6 7" fill="none" opacity=".48"/>
  </svg>`;

  const nodesHtml = nodes.map(n => `
    <button class="town-node tn-${n.k} ${n.grp === "Ev & Ocak Kümesi" ? "home-cluster" : ""}" style="left:${n.x}%;top:${n.y}%;--tsz:${n.sz}px;z-index:${Math.round(n.y * 10)}" data-a="${n.act}" ${n.v ? `data-v="${n.v}"` : ""} ${n.lock ? `disabled title="Henüz yolu bilmiyorsun"` : ""} data-hover>
      <span class="stip">
        <em class="stip-grp">${n.grp}</em>
        <b>${n.ad}</b>
        <small>${n.sub}</small>
      </span>
      <div class="tn-glow"></div>
      <div class="tn-arch-halo"></div>
      <span class="plank tn-plank">${n.ad}${n.badge ? `<i class="tn-badge">${n.badge}</i>` : ""}</span>
    </button>
  `).join("");

  const bgKasaba = asset("bg-kasaba") || "img/bg-kasaba.webp";
  const showMapOnMob = !!(UI && UI.mobShowMap);
  const kasabaPortraitList = `
    <div class="mob-portrait-list kasaba-portrait-list">
      <div class="mob-list-hero" style="background-image:url('${bgKasaba}')">
        <div class="mob-list-hero-ov">
          <div class="mob-list-hero-top">
            <div>
              <span class="kicker">Diyar & Şehir Panoraması</span>
              <h2>Ejder Kasabası Rehberi</h2>
            </div>
            <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Harita Görünümü</button>
          </div>
          <div class="mob-list-pills">
            <span class="mp-pill on">Sol Yamaç: Ocak · Ahır · Yuva</span>
            <span class="mp-pill wev" title="${esc(wEv.d)}">${esc(wEv.ad)}</span>
          </div>
        </div>
      </div>
      <div class="mob-list-cards">
        ${nodes.map(n => {
          const icHtml = n.k === 'konak'
            ? `<img src="${asset('ic-konak') || 'img/ui/ic-konak.webp'}" class="pic pic-img" alt="">`
            : placeIcon(n.k);
          return `
            <button class="mob-dir-card ${n.badge ? 'ready' : ''} ${n.lock ? 'closed' : ''}" data-a="${n.act}" ${n.v ? `data-v="${n.v}"` : ''} ${n.lock ? 'disabled' : ''}>
              <div class="mob-dir-ic">
                ${icHtml}
                ${n.badge ? `<i class="tn-badge">${n.badge}</i>` : ''}
              </div>
              <div class="mob-dir-info">
                <span class="kicker">${esc(n.grp)}</span>
                <b>${esc(n.ad)}</b>
                <small>${esc(n.sub)}</small>
              </div>
              <span class="mob-dir-go">${ui('right')}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  return `<div class="kasaba-view ${showMapOnMob ? 'mob-force-map' : ''}">
    ${kasabaPortraitList}
    <div class="kasaba-map" style="background-image:url('${bgKasaba}')">
      <img src="${bgKasaba}" class="iso-bg-img" alt="">
      <div class="kasaba-top-hud">
        <div class="kt-title">
          <span class="kicker">Diyar & Şehir Panoraması</span>
          <h2>Ejder Kasabası</h2>
        </div>
        <div class="kt-cluster-legend">
          <span class="mp-pill on">Sol Yamaç: Ocak · Ahır · Yuva</span>
          <span class="mp-pill wev" title="${esc(wEv.d)}">${esc(wEv.ad)}</span>
          <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Liste Görünümü</button>
        </div>
      </div>
      ${trailsSvg}
      <div class="homestead-halo" style="left:5%;top:42%;width:28%;height:26%;border-radius:45%;" title="Ocak, Ahır ve Yuva Ev Kümesi"></div>
      ${nodesHtml}
      <div class="hint-pill kasaba-hint">Bir mekânın üzerine gelerek durumunu gör, dokunarak doğrudan içine gir.</div>
    </div>
  </div>`;
}
