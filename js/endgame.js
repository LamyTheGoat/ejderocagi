'use strict';
/* ============ EJDER OCAĞI — GÖK KULESİ, ATA YADİGÂRI, KAN TÜCCARI VE KRALİYET DİVANI ============ */

/* ---------- 1. KUŞAKLAR ARASI ATA YADİGÂRI ---------- */
function ensureHeirloomItem(h) {
  if (!h) return;
  const lv = h.lv || 1;
  const id = 'yadigar_' + h.id;
  ITEMS[id] = {
    ad: `${ek(h.ancestorName, 'gen')} Ata Yadigârı (Sv.${lv})`,
    slot: 'tilsim',
    atk: 4 + lv * 5,
    def: 4 + lv * 5,
    hp: 10 + lv * 10,
    crit: lv * 3,
    nefes: lv * 8,
    fiyat: 300 + lv * 150,
    tier: 3,
    heirloom: true,
  };
  return id;
}

function registerAllHeirlooms() {
  if (!S || !S.heirlooms) return;
  for (const h of S.heirlooms) ensureHeirloomItem(h);
}

function canForgeHeirloom(d) {
  if (!d || d.dead || d.forgedHeirloom) return false;
  return d.stage === 'yetiskin' && (d.w >= 3 || d.gen >= 2 || d.old || (d.pageantW || 0) >= 1);
}

function forgeHeirloom(d) {
  if (!S) return null;
  S.heirlooms = S.heirlooms || [];
  const h = {
    id: (S.uid = (S.uid || 10) + 1),
    ancestorId: d.id,
    ancestorName: d.name,
    el: d.el,
    lv: 1,
    xp: 0,
    maxLv: 5,
  };
  S.heirlooms.push(h);
  d.forgedHeirloom = true;
  const itemId = ensureHeirloomItem(h);
  const invItem = { uid: (S.uid = (S.uid || 10) + 1), id: itemId, heirloomId: h.id };
  S.inv.push(invItem);
  d.equip = d.equip || {};
  if (!d.equip.tilsim) d.equip.tilsim = invItem.uid;
  chron(`${d.name} kendi pullarından ve nefesinden "${ITEMS[itemId].ad}" soy yadigârını dövdü.`);
  return { h, itemId };
}

function addHeirloomXp(d, amount = 1) {
  if (!S || !S.heirlooms || !d || !d.equip || !d.equip.tilsim) return null;
  const invItem = S.inv.find(i => i.uid === d.equip.tilsim);
  if (!invItem || !invItem.heirloomId) return null;
  const h = S.heirlooms.find(x => x.id === invItem.heirloomId);
  if (!h || h.lv >= 5) return null;
  h.xp = (h.xp || 0) + amount;
  const need = h.lv * 2;
  if (h.xp >= need) {
    h.xp = 0;
    h.lv++;
    ensureHeirloomItem(h);
    chron(`Ata Yadigârı güçlendi: "${ek(h.ancestorName, 'gen')} Ata Yadigârı" Seviye ${h.lv} oldu.`);
    return h;
  }
  return null;
}

/* ---------- 2. GEZGİN SİMYACI: EFSUNCU ZEKAİ (KAN TÜCCARI) ---------- */
const BLACK_ELIXIRS = [
  {
    k: 'alacakaranlik', ad: 'Alacakaranlık Özü', cost: 165,
    sub: 'Saf Ak veya Kara pul dönüşümü',
    d: 'Ejderhanın pigment genlerini saf Ak ya da Kara forma dönüştürür; zarafet ve sezgi kazandırır.',
    apply(d) {
      const target = pigOf(d) === 'a' ? 'm' : 'a';
      d.genes.pig = [target, target];
      if (typeof codexCheck === 'function') codexCheck(d);
      return `${esc(d.name)} pulları <b>${PIG_AD[target]}</b> forma büründü.`;
    },
  },
  {
    k: 'yildiz_tozu', ad: 'Yıldız Tozu İksiri', cost: 150,
    sub: 'Kalıcı pul parıltısı',
    d: 'Ejderhanın pullarına kalıcı Parıltı işler. Saray merasiminde göz kamaştırır ve yavrulara geçer.',
    apply(d) {
      d.genes.par = ['P', 'P'];
      if (typeof codexCheck === 'function') codexCheck(d);
      return `${esc(d.name)} artık <b>Parıltılı</b> pullara sahip.`;
    },
  },
  {
    k: 'prizma_kani', ad: 'Hürmüz İksiri', cost: 135,
    sub: 'Çift renkli pul ve kızıl göz',
    d: 'Pul ve süs genlerine nadir ara renkler (Zümrüt-Gök / Gül-Mor) ve çekinik Kızıl Göz işler.',
    apply(d) {
      d.genes.pul = pick([['zumrut', 'gok'], ['gul', 'mor'], ['kizil', 'mor']]);
      d.genes.sus = ['altin', 'inci'];
      d.genes.eyec = ['kizil', 'kizil'];
      if (typeof codexCheck === 'function') codexCheck(d);
      return `${esc(d.name)} nadir melez pullara ve kızıl gözlere kavuştu.`;
    },
  },
  {
    k: 'ebedi_kor', ad: 'Ebedi Kor Özü', cost: 180,
    sub: 'Genetik sınır artışı ve dinçlik',
    d: 'Tüm nitelik potansiyellerini bir kademe yükseltir, yorgunluğu siler ve yaşlanmayı geciktirir.',
    apply(d) {
      for (const k of STATS) {
        d.genes.pot[k] = d.genes.pot[k].map(v => Math.min(5, v + 1));
        d.st[k] = Math.min(capOf(d, k), d.st[k] + 6);
      }
      d.fat = 0; d.inj = 0; d.old = false;
      if (d.age > 4) d.age -= 2;
      return `${esc(d.name)} dinçleşti; genetik sınırları ve nitelikleri yükseldi.`;
    },
  },
];

if (typeof VENDORS !== 'undefined') {
  VENDORS.kan = {
    npc: 'kantuccari', ad: 'Efsuncu Zekai', unvan: 'Gezgin simyacı', tabela: 'Simyacı Zekai',
    greet: ['Şşşt... Feneri yaklaştırma. Saray yasakladı diye doğanın sırlarını satmayacak mıyız?', 'Altın ve biraz cesaret... Ejderhanın kanındaki gizli mühürleri açabilirim.'],
    buy: ['İksiri içir ve pullarının nasıl değiştiğini izle... Kimseye benden aldığını söyleme.', 'Akıllıca bir alışveriş. Bu soy nesiller boyu konuşulacak.'],
    poor: ['Kesende yeterince altın yok. Gece tezgâhında veresiye geçmez.'],
  };
}

function kanVendorView() {
  const V = VENDORS.kan;
  ensureStar();
  const d = byId(UI.sel) || byId(S.star) || S.dragons[0];
  if (!UI.vsay) UI.vsay = pick(V.greet);
  const portrait = asset('npc-kantuccari') ? `<img src="${asset('npc-kantuccari')}" alt="">` : npcSVG('kantuccari');

  const tabs = S.dragons.length ? `<div class="vtabs">${S.dragons.map(x => `<button class="vtab ${d && d.id === x.id ? 'on' : ''}" data-a="kan-sel" data-id="${x.id}">${esc(x.name)} (${EL_AD[x.el]})</button>`).join('')}</div>` : '';

  const goods = pager('v-kan', BLACK_ELIXIRS, PER(4, 2), elx => gcard({
    cls: 'item t3',
    art: itemIcon('til4'),
    title: elx.ad,
    sub: d ? `${esc(d.name)} · ${elx.sub}` : elx.sub,
    body: `<small class="idesc">${elx.d}</small>`,
    price: elx.cost,
    btn: 'İçir',
    act: 'buy-elixir',
    data: `data-k="${elx.k}"`,
  }));

  return `<div class="vendor v-kan">
    <button class="backbtn" data-a="stall-back">${ui('left')} Çarşıya dön</button>
    <div class="vportrait nod${(UI.vnod || 0) % 2}">${portrait}<div class="vname"><b>${V.ad}</b><small>${V.unvan}</small></div></div>
    <div class="vright">
      <div class="vspeech"><p id="vsay">${esc(UI.vsay)}</p></div>
      <div class="vcounter">${tabs}<div class="vgoods">${goods}</div>
        <div class="vfoot"><span>${ui('gold')} Kesende <b>${S.gold}</b> altın</span><span>Seçili ejderha: <b>${d ? esc(d.name) : 'Yok'}</b></span></div>
      </div>
    </div>
  </div>`;
}

/* ---------- 3. KRALİYET DİVANI (HAFTALIK FERMAN OYLAMASI) ---------- */
const DIVAN_LAWS = [
  {
    k: 'gladyator', ad: 'Er Meydanı ve Kule Fermanı',
    d: 'Arena, Gök Kulesi ve baskın altın ödülleri +%35 artar; dövüş sonrası yorgunluk azalır.',
    votes: 18,
  },
  {
    k: 'tuccar', ad: 'Gece Çarşısı ve Kervan Fermanı',
    d: 'Kervan gelirleri ve bölge sancağı vergileri +%40 artar; simya iksirleri ucuzlar.',
    votes: 14,
  },
  {
    k: 'soy_bereketi', ad: 'Soy ve Zarafet Fermanı',
    d: 'Saray Zarafet Merasimi ödülleri ve Ata Yadigârı gelişim hızı iki katına çıkar.',
    votes: 16,
  },
];

function ensureDivan() {
  if (!S) return { laws: DIVAN_LAWS, active: 'gladyator', voted: null };
  if (!S.divan || S.divan.w !== S.week) {
    S.divan = {
      w: S.week,
      laws: DIVAN_LAWS.map(l => ({ ...l, votes: l.votes + ri(1, 6) })),
      voted: null,
    };
  }
  const sorted = [...S.divan.laws].sort((a, b) => b.votes - a.votes);
  S.divan.active = sorted[0].k;
  return S.divan;
}

function divanModal() {
  UI.modalRedraw = divanModal;
  const D = ensureDivan();
  const activeLaw = D.laws.find(x => x.k === D.active) || D.laws[0];
  const rows = D.laws.map(l => `
    <div class="saray-rankrow ${l.k === D.active ? 'me' : ''}" style="padding:12px 16px">
      <div style="flex:1;min-width:0">
        <b style="font-size:18px;font-family:var(--f-disp)">${esc(l.ad)}</b>
        ${l.k === D.active ? '<span class="tag" style="margin-left:8px;font-size:11px">YÜRÜRLÜKTE</span>' : ''}
        <p class="sm" style="margin:4px 0 0;opacity:.88">${esc(l.d)}</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex:none">
        <span class="sm"><b>${l.votes}</b> Mühür</span>
        <button class="btn sm ${D.voted === l.k ? 'ghost' : 'primary'}" data-a="divan-vote" data-k="${l.k}" ${D.voted ? 'disabled' : ''}>${D.voted === l.k ? 'Mühür Vuruldu' : 'Mühür Bas'}</button>
      </div>
    </div>
  `).join('');

  const myFc = typeof calcChibiStats === "function" ? calcChibiStats().totalFc : 1850;
  const podium = [
    { rank: 2, handle: "@kuzey_ruzgari", title: "Kuzey Sancaktarı", fc: 6420, ch: typeof peerChibiConfig === "function" ? peerChibiConfig(null, 0) : null },
    { rank: 1, handle: S.handle || "@ejder_ocagi", title: "Ulu Ocak Beyi (Sen)", fc: Math.max(6850, myFc), ch: typeof ensureChibi === "function" ? ensureChibi() : null, me: true },
    { rank: 3, handle: "@leydi_sureyya", title: "Saray İncisi", fc: 5980, ch: typeof peerChibiConfig === "function" ? peerChibiConfig(null, 1) : null },
  ];
  const podiumHtml = typeof renderChibiDoll === "function" ? `
    <div class="divan-podium-row">
      ${podium.map(p => `
        <div class="divan-pedestal r${p.rank} ${p.me ? "me" : ""}">
          <span class="dp-crown">${p.rank === 1 ? `${ui('crown')} 1. ŞÖHRET KÜRSÜSÜ` : p.rank + ". Kürsü"}</span>
          <div class="dp-doll">${renderChibiDoll(p.ch, { cls: "podium-doll" })}</div>
          <b>${esc(p.handle)}</b>
          <small>${esc(p.title)} · ${ui('sword')} ${p.fc.toLocaleString("tr-TR")} Kudret</small>
        </div>
      `).join("")}
    </div>
  ` : "";

  showModal(`<div class="parch">
    <p class="kicker">Şöhret Divanı & Ocak Beyleri Meclisi</p>
    <h2>Şöhret Kürsüsü ve Kraliyet Divanı</h2>
    ${podiumHtml}
    <p class="mute sm">Ocakların oylarıyla bu haftanın yürürlükteki fermanı belirlenir. Şu an geçerli ferman: <b>${esc(activeLaw.ad)}</b></p>
    <div class="saray-ranks" style="margin:14px 0">${rows}</div>
    <div class="mbtns"><button class="btn ghost" data-a="chibi-open">${ui('shield')} Terbiyeci Vitrini</button><button class="btn primary" data-a="mclose">Kapat</button></div>
  </div>`, 'paper wide');
}

/* ---------- 4. KADİM GÖK KULESİ (ORİJİNAL DÖVÜŞ MOTORUYLA ENTEGRE) ---------- */
const TOWER_MUTATORS = [
  { k: 'kizil_firtina', ad: 'Kızıl Fırtına Katı', d: 'Bu katta iki tarafın da Element Nefesi +%25 daha yıkıcı vurur.', nefesBoost: 6 },
  { k: 'dikenli_zemin', ad: 'Korlu Zemin Katı', d: 'Zemindeki korlar savunmayı zorlar; saldırı gücü +%20 artar.', atkBoost: 6 },
  { k: 'zirh_kiran', ad: 'Ağır Hava Katı', d: 'Yoğun basınç altında zırhların etkisi azalır; darbeler daha derine işler.', defPen: 8 },
  { k: 'nefes_pinari', ad: 'Eter Pınarı Katı', d: 'Dövüşe +35 dolu Nefes ile başlanır.', startSta: 35 },
  { k: 'kan_ritueli', ad: 'Keskin Göz Katı', d: 'Kritik vuruş şansı +%18 artar.', critBoost: 18 },
];

const TOWER_BOONS = [
  { k: 'vampir_disi', ad: 'Can Özü Lütfu', d: 'Her kule zaferinden sonra fazladan +%35 can yenilenir ve saldırı +6 artar.' },
  { k: 'firtina_kanadi', ad: 'Yıldırım Kanadı', d: 'Çeviklik +%25 artar ve her dövüşe +35 dolu Nefes ile başlarsın.' },
  { k: 'ejder_kalbi', ad: 'Kadim Taş Yürek', d: 'Maksimum Can +%25 artar ve mevcut yaraların yarısı hemen sarılır.' },
  { k: 'kor_runu', ad: 'Kızıl Kor Mührü', d: 'Saldırı gücü +10 ve kritik vuruş şansı +%15 artar.' },
  { k: 'anka_tozu', ad: 'Buzul Kalkanı Lütfu', d: 'Her katın başında 2 tur boyunca hasarı sönümleyen zırh kazanırsın.' },
];

function ensureTowerState() {
  if (!S) return {};
  S.tower = S.tower || {
    curFloor: 1,
    bestFloor: 1,
    totalCleared: 0,
    boons: [],
    curHp: null,
    leaderboard: [
      { handle: '@leydi_sureyya', dName: 'Şahmeran', floor: 14, guild: 'İnci Hanedanı' },
      { handle: '@kuzey_ruzgari', dName: 'Bora', floor: 11, guild: 'Ayaz Muhafızları' },
      { handle: '@altin_kervan', dName: 'Kızılhan', floor: 9, guild: 'Tuz Tacirleri' },
    ],
  };
  if (!S.tower.curFloor) S.tower.curFloor = 1;
  if (!S.tower.boons) S.tower.boons = [];
  return S.tower;
}

function genTowerOpp(floor) {
  const el = ELS[(floor - 1) % ELS.length];
  const L = Math.round(28 + floor * 5.5);
  const opp = genOpp(el, L, Math.min(3, Math.floor(floor / 3)));
  opp.name = `${floor}. Kat Muhafızı`;
  opp.trainer = 'Kadim Kule';
  opp.arch = TOWER_MUTATORS[(floor - 1) % TOWER_MUTATORS.length].ad;
  return opp;
}

function kuleBoard(f) {
  registerAllHeirlooms();
  const T = ensureTowerState();
  const floor = T.curFloor || 1;
  const mut = TOWER_MUTATORS[(floor - 1) % TOWER_MUTATORS.length];
  const opp = genTowerOpp(floor);
  const canClimb = f && !f.dead && f.stage !== 'yavru' && !f.old;
  const canForge = f && canForgeHeirloom(f);
  const goldReward = Math.round((35 + floor * 18) * (ensureDivan().active === 'gladyator' ? 1.35 : 1));

  const pw = Math.round(sum(STATS.map(k => opp.st[k])) / 4);
  const mine = f ? Math.round(sum(STATS.map(k => f.st[k])) / 4) : 0;
  const adv = f ? elMult(f.el, opp.el) : 1, dadv = f ? elMult(opp.el, f.el) : 1;
  const ratio = mine ? (pw * dadv) / (mine * adv) : 9;
  const [stc, stt] = ratio < 0.85 ? ['easy', 'Hazırsın'] : ratio < 1.08 ? ['even', 'Denk kat'] : ['hard', 'Zorlu kat'];

  const boonNames = (T.boons || []).map(bk => TOWER_BOONS.find(x => x.k === bk)?.ad).filter(Boolean);

  const ranks = [...T.leaderboard];
  const myH = S.handle || '@ejder_ocagi';
  const ex = ranks.find(r => r.handle === myH);
  if (ex) ex.floor = Math.max(ex.floor, T.bestFloor || 1);
  else ranks.push({ handle: myH, dName: f ? f.name : 'Kor', floor: T.bestFloor || 1, guild: S.guild || 'Kızıl Ocak Birliği' });
  ranks.sort((a, b) => b.floor - a.floor);

  const p1 = `<div class="poster special" style="--rot:-1.2deg"><i class="nail"></i>${f && canClimb ? `<span class="stamp ${stc}">${stt}</span>` : ''}
    <div class="ph">KAT ${floor} · ${esc(mut.ad.toUpperCase())}</div>
    <div class="pdr">${dragonSVG(opp, { still: true, flip: true })}</div>
    <b class="pname">${esc(opp.name)}</b><small>${esc(mut.d)}</small>
    <div class="pmeta">${elChip(opp.el)}${adv > 1 ? '<span class="good">üstünsün</span>' : dadv > 1 ? '<span class="bad">dezavantaj</span>' : ''}</div>
    <div class="pstats">${STATS.map(k => `<span>${ST_KISA[k]}<b>${opp.st[k]}</b></span>`).join('')}</div>
    ${f ? `<div class="vsb ${stc}"><span>Sen <b>${mine}</b></span><i><em style="width:${clamp(mine / (mine + pw) * 100, 8, 92)}%"></em></i><span><b>${pw}</b> Muhafız</span></div>` : ''}
    <div class="pfoot">${goldTxt(goldReward)} <span class="mute sm">+2 ün · Yadigâr gelişimi</span></div>
    <button class="btn primary sm wide" data-a="tower-start" ${canClimb ? '' : 'disabled'}>${!f ? 'Dövüşçü seç' : f.stage === 'yavru' ? 'Yavrular çıkamaz' : `${floor}. Kata Çık`}</button>
  </div>`;

  const p2 = `<div class="poster" style="--rot:1deg"><i class="nail"></i>
    <div class="ph">KULE LÜTUFLARI & SOY YADİGÂRI</div>
    <b class="pname">Tırmanış Durumu</b><small>Şu anki kat: <b>${floor}</b> · En yüksek rekorun: <b>Kat ${T.bestFloor || 1}</b></small>
    <div class="traits" style="margin:8px 0">${boonNames.length ? boonNames.map(n => `<span class="trait sm"><b>${esc(n)}</b></span>`).join('') : '<span class="mute sm">Henüz kule lütfu seçilmedi. Kat kazandıkça eklenir.</span>'}</div>
    <p class="sm" style="margin:6px 0">Yetişkin ve en az 3 zaferli ejderhalar ömürlerinde bir kez kuşaktan kuşağa geçen <b>Ata Yadigârı</b> dövebilir.</p>
    <div class="pfoot">
      ${canForge ? `<button class="btn primary sm wide" data-a="forge-heirloom" data-id="${f.id}">${esc(f.name)} İçin Ata Yadigârı Döv</button>` : `<span class="mute sm">${f && f.forgedHeirloom ? `${esc(f.name)} yadigârını dövdü` : 'Yadigâr için yetişkin ve 3+ zafer gerekir'}</span>`}
    </div>
    ${floor > 1 ? `<button class="btn ghost sm wide" data-a="tower-reset" style="margin-top:4px">1. Kattan Yeniden Başla</button>` : ''}
  </div>`;

  const p3 = `<div class="poster" style="--rot:-0.8deg"><i class="nail"></i>
    <div class="ph">GÖK KULESİ DEFTERİ</div>
    <b class="pname">En Yüksek Katlar</b><small>Diyarın en yüksek kata ulaşan ocakları</small>
    <div class="saray-ranks" style="width:100%;margin-top:8px">
      ${ranks.slice(0, 5).map((r, i) => `
        <div class="saray-rankrow ${r.handle === myH ? 'me' : ''}" style="padding:5px 10px;font-size:12.5px">
          <span><b>${i + 1}.</b> ${esc(r.handle)} <small class="mute">(${esc(r.dName)})</small></span>
          <b>Kat ${r.floor}</b>
        </div>
      `).join('')}
    </div>
  </div>`;

  return p1 + p2 + p3;
}

function startKuleFloor(d) {
  registerAllHeirlooms();
  const T = ensureTowerState();
  const floor = T.curFloor || 1;
  const mut = TOWER_MUTATORS[(floor - 1) % TOWER_MUTATORS.length];
  const opp = genTowerOpp(floor);
  const pf = fighterFromDragon(d);
  const ef = fighterFromOpp(opp);

  const hasBoon = k => (T.boons || []).includes(k);
  if (hasBoon('ejder_kalbi')) {
    pf.maxHp = Math.round(pf.maxHp * 1.25);
    pf.hp = pf.maxHp;
  }
  if (T.curHp != null && T.curHp > 0) {
    pf.hp = Math.min(pf.maxHp, Math.max(Math.round(pf.maxHp * 0.45), T.curHp));
  }
  if (hasBoon('firtina_kanadi')) {
    pf.ce = Math.round(pf.ce * 1.25);
    pf.sta = Math.min(100, pf.sta + 35);
  }
  if (hasBoon('kor_runu')) {
    pf.atk = (pf.atk || 0) + 10;
    pf.crit = (pf.crit || 0) + 15;
  }
  if (hasBoon('anka_tozu')) {
    pf.shield = 2;
  }

  if (mut.atkBoost) { pf.atk = (pf.atk || 0) + mut.atkBoost; ef.atk = (ef.atk || 0) + mut.atkBoost; }
  if (mut.defPen) { pf.def = Math.max(0, (pf.def || 0) - mut.defPen); ef.def = Math.max(0, (ef.def || 0) - mut.defPen); }
  if (mut.startSta) { pf.sta = Math.min(100, pf.sta + mut.startSta); ef.sta = Math.min(100, ef.sta + mut.startSta); }
  if (mut.critBoost) { pf.crit = (pf.crit || 0) + mut.critBoost; ef.crit = (ef.crit || 0) + mut.critBoost; }

  const F = newFight(pf, ef);
  FT = {
    F,
    d,
    opp,
    log: [{ t: `<b>Kat ${floor} — ${esc(mut.ad)}:</b> ${esc(mut.d)}`, c: 'mute' }],
    mode: 'kule',
    tier: 'cukur',
    floor,
    mut,
    lethal: false,
    title: `Kadim Gök Kulesi · Kat ${floor} · ${mut.ad}`,
  };
  if (typeof pipReset === 'function') pipReset();
  fightModal();
  SFX.play('roar');
}

function finishKuleFight() {
  const { F, d, floor } = FT;
  const T = ensureTowerState();
  const won = F.winner === 'p';
  FT.result = [];
  d.fat = clamp(d.fat + 8, 0, 100);

  if (won) {
    const divanLaw = ensureDivan().active;
    const goldWon = Math.round((35 + floor * 18) * (divanLaw === 'gladyator' ? 1.35 : 1));
    S.gold += goldWon;
    S.un += 2;
    d.w++;
    S.st.wins++;
    T.totalCleared = (T.totalCleared || 0) + 1;
    if (floor >= (T.bestFloor || 1)) {
      T.bestFloor = floor;
      const myH = S.handle || '@ejder_ocagi';
      const row = T.leaderboard.find(x => x.handle === myH);
      if (row) row.floor = Math.max(row.floor, floor);
      else T.leaderboard.push({ handle: myH, dName: d.name, floor, guild: S.guild || 'Kızıl Ocak Birliği' });
      T.leaderboard.sort((a, b) => b.floor - a.floor);
    }
    const healRatio = (T.boons || []).includes('vampir_disi') ? 0.45 : 0.25;
    T.curHp = Math.min(F.p.maxHp, F.p.hp + Math.round(F.p.maxHp * healRatio));
    T.curFloor = floor + 1;

    const evolved = addHeirloomXp(d, divanLaw === 'soy_bereketi' ? 2 : 1);
    FT.result.push(`<b class="good">${floor}. Kat Muhafızı devrildi!</b> +${goldWon} altın, +2 ün kazandın.`);
    if (typeof awardChibiStones === 'function') {
      const kuleStones = { kor_t3: ri(2, 3) };
      if (floor % 3 === 0 || floor >= 10) kuleStones.anka_koruma = 1;
      const gotKule = awardChibiStones({ stones: kuleStones });
      if (gotKule.length) FT.result.push(`<b class="good">Kule Kor Hazinesi:</b> ${gotKule.join(', ')}!`);
    }
    if (evolved) FT.result.push(`<b class="good">Ata Yadigârı güçlendi: Seviye ${evolved.lv} oldu!</b>`);
    FT.result.push(`Sonraki kata geçmeden önce bir <b>Kule Lütfu</b> seçebilirsin.`);
    setTimeout(() => FX.coins(innerWidth / 2, innerHeight / 2), 700);
  } else {
    d.l++;
    S.st.losses++;
    T.curFloor = 1;
    T.boons = [];
    T.curHp = null;
    FT.result.push(F.surrender ? 'Kuleden kendi isteğinle çekildin. Kazandığın ganimetler sende kaldı.' : `<span class="bad">${floor}. katta yorgun düştün. Tırmanış 1. kata sıfırlandı.</span>`);
  }
  saveGame();
}

function doneKuleFight() {
  const { F, d, floor } = FT;
  const won = F.winner === 'p';
  FT = null;
  if (won) {
    pushModal(() => kuleBoonModal(d, floor));
  }
  afterAction(true);
  closeModal();
}

function kuleBoonModal(d, clearedFloor) {
  const T = ensureTowerState();
  const choices = shuffle([...TOWER_BOONS]).slice(0, 3);
  const opts = choices.map(b => `<button class="vopt" data-a="tower-boon" data-k="${b.k}" data-id="${d.id}"><b>${esc(b.ad)}</b><small>${esc(b.d)}</small></button>`).join('') +
    `<button class="vopt ghost" data-a="mclose">Ganimetle Kuleden Ayrıl (Sonraki Kat: ${T.curFloor})</button>`;
  vn({
    speaker: 'Kadim Kule Sunağı',
    kicker: `${clearedFloor}. Kat Tamamlandı · Sıradaki: Kat ${T.curFloor}`,
    art: `<div class="vdr">${dragonSVG(d)}</div>`,
    text: `${d.name} kulenin ${clearedFloor}. katını aştı. Mermer sunaktaki üç kadim mühürden birini seçip ${T.curFloor}. kata tırmanabilir ya da dinlenmek için ocağa dönebilirsin.`,
    opts,
    bg: sceneOr('kule', scenePit()),
  });
}

const ENDGAME_ACT = {
  'forge-heirloom'(el) {
    const d = byId(+el.dataset.id || UI.sel || UI.arenaSel);
    if (!d || !canForgeHeirloom(d)) return;
    const res = forgeHeirloom(d);
    if (!res) return;
    SFX.play('build');
    SFX.play('win');
    FX.burst(innerWidth / 2, innerHeight / 2, '#ffd25e', 40);
    toast(`<b>ATA YADİGÂRI DÖVÜLDÜ!</b><br><b>${esc(ITEMS[res.itemId].ad)}</b> kuşanıldı. Kule ve Arena zaferleriyle Seviye 5'e kadar gelişir.`, 'goal');
    saveGame();
    render();
  },
  'kan-open'() {
    UI.stall = 'kan';
    UI.vsay = null;
    SFX.play('tab');
    render();
  },
  'kan-sel'(el) {
    UI.sel = +el.dataset.id;
    SFX.play('click');
    render();
  },
  'buy-elixir'(el) {
    const elx = BLACK_ELIXIRS.find(x => x.k === el.dataset.k);
    const d = byId(UI.sel) || byId(S.star) || S.dragons[0];
    if (!elx || !d) return;
    const divanLaw = ensureDivan().active;
    const finalCost = divanLaw === 'tuccar' ? Math.round(elx.cost * 0.85) : elx.cost;
    if (S.gold < finalCost) {
      UI.vsay = pick(VENDORS.kan.poor);
      UI.vsayNew = true;
      SFX.play('error');
      render();
      return;
    }
    S.gold -= finalCost;
    const msg = elx.apply(d);
    UI.vsay = pick(VENDORS.kan.buy);
    UI.vsayNew = true;
    UI.vnod = (UI.vnod || 0) + 1;
    SFX.play('coin');
    SFX.play('win');
    FX.burst(innerWidth / 2, innerHeight / 2, '#d4a056', 36);
    chron(`${d.name} üzerinde "${elx.ad}" uygulandı.`);
    toast(`<b>Simya Tamamlandı</b><br>${msg}`, 'goal');
    saveGame();
    render();
  },
  'tower-start'() {
    const d = byId(UI.arenaSel) || byId(S.star) || S.dragons[0];
    if (!d || d.dead || d.stage === 'yavru') return;
    SFX.play('horn');
    pushModal(() => startKuleFloor(d));
  },
  'tower-reset'() {
    const T = ensureTowerState();
    T.curFloor = 1;
    T.boons = [];
    T.curHp = null;
    SFX.play('click');
    saveGame();
    render();
  },
  'tower-boon'(el) {
    const T = ensureTowerState();
    const bk = el.dataset.k;
    const d = byId(+el.dataset.id || UI.arenaSel) || S.dragons[0];
    if (bk && !T.boons.includes(bk)) T.boons.push(bk);
    SFX.play('bell');
    if (d && !d.dead) {
      pushModal(() => startKuleFloor(d));
    }
    closeModal();
  },
  'divan-open'() {
    pushModal(divanModal);
  },
  'divan-vote'(el) {
    const D = ensureDivan();
    if (D.voted) return;
    const k = el.dataset.k;
    const law = D.laws.find(x => x.k === k);
    if (!law) return;
    law.votes += 3;
    D.voted = k;
    const sorted = [...D.laws].sort((a, b) => b.votes - a.votes);
    D.active = sorted[0].k;
    SFX.play('coin');
    toast(`<b>Oyun Kraliyet Divanı'na İşlendi</b><br>Yürürlükteki ferman: <b>${esc(sorted[0].ad)}</b>`);
    saveGame();
    divanModal();
  },
};
