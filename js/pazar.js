'use strict';
/* ============ EJDER OCAĞI — GECE ÇARŞISI ============
   Sokakta dört tezgâh; üstüne gelince parlayıp öne çıkar.
   Tıklayınca satıcı ekranı açılır: solda büyük portre ve konuşan satıcı, sağda tezgâh. */

const VENDORS = {
  ejder: {
    npc: 'tuccar', ad: 'Rüstem', unvan: 'Kervanların ejderha tüccarı', tabela: 'Ejderha Tüccarı',
    greet: ['Hoş geldin! Bu hafta kervan sağlam mallar getirdi. Bir bak hele.', 'Gözlerin ışıldıyor; iyi bir ejderha arıyorsun belli.', 'Kanatlarına bak, dişlerine bak. Sonra fiyatı konuşuruz.'],
    empty: ['Bu hafta tezgâhım boş kaldı. Ama satacak bir ejderhan varsa iyi para veririm.'],
    buy: ['Hayırlı olsun! Onu iyi besle, sana sadık olur.', 'Ah, iyi bir seçim. Bunu kaçıracak kadar akılsız değilmişsin.', 'Pazarlıksız aldın, Rüstem bunu unutmaz.'],
    poor: ['Kesen biraz hafif görünüyor dostum. Arenada bir iki zafer, sonra gel.', 'O fiyatın yarısını bile görmüyorum avucunda.'],
    full: ['İnlerinde yer kalmamış! Önce ocağına bir in daha kazdır.'],
    sell: ['Anlaştık. Ona iyi bir yuva bulacağım, söz.', 'Eh, gönlünü yaptım. Kesene bak.'],
  },
  yumurta: {
    npc: 'yumurtaci', ad: 'Hatice', unvan: 'Yumurtacı', tabela: 'Yumurtacı Hatice',
    greet: ['Gel evladım, kabuğa dokun da gör; ılık mı, değil mi?', 'Bu yumurta bütün gece kıpırdadı. İçinde inatçı bir can var.'],
    empty: ['Yumurtaları sattım evladım. Haftaya yine gel, yenileri gelecek.'],
    buy: ['Sıcak tut onu. Kuluçka ocağında iki haftada kabuğunu kırar.', 'Kısmetin açık olsun. İçinden ne çıkarsa bana da haber ver.'],
    poor: ['Ah evladım, o kadar altın yok sende. Yumurta da kaçmaz, bekler.'],
  },
  yem: {
    npc: 'baharatci', ad: 'Nuri', unvan: 'Baharatçı', tabela: 'Baharatçı Nuri',
    greet: ['Her ejderhanın bir zaafı vardır. Biberi seven de var, zambağı seven de.', 'Koklayın, koklayın! Yıldırım mantarı bu sabah toplandı.'],
    buy: ['Afiyet olsun ejderhana!', 'Bunu yiyen ejderha bir hafta kuyruğunu sallar.', 'Bir tane daha ister misin? Gözüm tuttu seni.'],
    poor: ['Çarşının en ucuz tezgâhı bende, ama o kadarı bile yok galiba.'],
    lock: ['Ziyafet mi? Önce bir kilerin olsun, sonra konuşuruz.'],
  },
  demir: {
    npc: 'kerim', ad: 'Usta Kerim', unvan: 'Başdemirci & Kor Örsü Ustası', tabela: 'Demirci Usta Kerim',
    greet: ['Örsüm kor, çekicim ağır! Terbiyeci pusatlarını +12\'ye döver, Zindan kalıplarını ve Kervan cevherlerini birleştiririm.', 'Anka Mührü olmadan +8 üstüne çekiç vurma evlat; pusatın çatlar, hurdaya döner!'],
    buy: ['Taşıyacak ejderhaya selam söyle. Bu iş onu korur.', 'Elinden çıkan her işin bir adı olur. Bunun adını sen koy.'],
    poor: ['Çelik ucuz değil evlat. Biraz daha kazan, gel.'],
    sell: ['Hmm, ustaca bir iş değil ama eritir kullanırım.'],
  },
};
const stallOpen = k => true;
function vSay(k, kind) { const V = VENDORS[k], arr = V[kind] || V.greet; UI.vsay = pick(arr); UI.vsayNew = true; UI.vnod = (UI.vnod || 0) + 1; }
function stallTeaser(k) {
  if (k === 'ejder') return S.market.dragons.length ? `${S.market.dragons.length} ejderha satışta` : 'Ejderha da alır';
  if (k === 'yumurta') return S.market.egg ? 'Gizemli bir yumurta' : 'Bu hafta tükendi';
  if (k === 'yem') return '7 çeşit yem ve ikram';
  if (k === 'demir') return '🔥 Kor Örsü (+1..+12) · Kalıp Dökümhanesi · Ejder Zırhı';
}
const PER = (desk, mob) => (typeof innerWidth === 'number' && (innerWidth <= 1024 || (typeof innerHeight === 'number' && innerHeight <= 660))) ? mob : desk;

function pazarView() {
  if (UI.stall === 'han') return hanView();
  if (UI.stall === 'muz') return aucView();
  if (UI.stall === 'bedesten') return bedestenView();
  if (UI.stall === 'kan' && typeof kanVendorView === 'function') return kanVendorView();
  if (UI.stall) return vendorView(UI.stall);

  const A = auction(), openLots = A.lots.filter(L => !L.done).length;
  const nO = orders().list.length, fitO = orders().list.filter(o => S.dragons.some(d => orderFits(o, d))).length;
  const smithOpen = stallOpen('demir');
  const bedListings = getBedestenListings();

  const stalls = [
    {
      k: 'yumurta', grp: 'Kuzey Kemeri · Kuluçka',
      ad: VENDORS.yumurta.tabela, sub: stallTeaser('yumurta'),
      x: 41.0, y: 29.0, sz: 156, act: 'stall', dk: 'yumurta',
      open: true, badge: S.market.egg ? '1' : '',
    },
    {
      k: 'yem', grp: 'Kuzey Kemeri · Erzak',
      ad: VENDORS.yem.tabela, sub: stallTeaser('yem'),
      x: 59.5, y: 29.0, sz: 156, act: 'stall', dk: 'yem',
      open: true, badge: '',
    },
    {
      k: 'ejder', grp: 'Batı Avlusu · Canlı Kervan',
      ad: VENDORS.ejder.tabela, sub: stallTeaser('ejder'),
      x: 22.5, y: 46.5, sz: 176, act: 'stall', dk: 'ejder',
      open: true, badge: S.market.dragons.length ? String(S.market.dragons.length) : '',
      pen: S.market.dragons.length ? `<div class="pazar-iso-pen">${S.market.dragons.slice(0, 3).map(d => `<span class="pend">${dragonSVG(d, { still: true })}</span>`).join('')}</div>` : '',
    },
    {
      k: 'bedesten', grp: 'Merkez Kubbe · Canlı Oyuncu Pazarı (P2P)',
      ad: 'Oyuncu Bedesteni', sub: `${bedListings.length} canlı oyuncu ilanı · Al & Sat`,
      x: 50.0, y: 49.5, sz: 186, act: 'bedesten-open', dk: '',
      open: true, badge: String(bedListings.length),
      ready: true,
    },
    {
      k: 'demir', grp: 'Doğu Avlusu · Kor Örsü & Dökümhane',
      ad: VENDORS.demir.tabela, sub: stallTeaser('demir'),
      x: 78.0, y: 46.0, sz: 172, act: 'stall', dk: 'demir',
      open: smithOpen, badge: smithOpen && S.smith.length ? String(S.smith.length) : '🔥',
    },
    {
      k: 'han', grp: 'Güneybatı Köşesi · Söylenti & İkram',
      ad: 'Gece Çayhanesi (Söylenti & İkram)', sub: S.evening === S.week ? 'Bu akşam çaylar içildi' : 'Sıcak çay, söylenti ve ikram',
      x: 22.0, y: 64.5, sz: 176, act: 'han', dk: '',
      open: true, badge: S.evening === S.week ? '' : '1',
    },
    {
      k: 'kan', grp: 'Güneydoğu Köşesi · Karaborsa',
      ad: 'Kan Tüccarı', sub: 'Yasaklı gen ve simya iksirleri',
      x: 78.0, y: 64.0, sz: 172, act: 'kan-open', dk: '',
      open: true, badge: '',
    },
    {
      k: 'orders', grp: 'Güney Meydanı · Kontratlar',
      ad: 'Sipariş Panosu', sub: nO ? `${nO} sipariş${fitO ? ` · ${fitO} uygun ejderhan var` : ''}` : 'Pano boş',
      x: 41.5, y: 79.0, sz: 160, act: 'orders', dk: '',
      open: true, badge: fitO ? String(fitO) : (nO ? String(nO) : ''),
      ready: fitO > 0,
    },
    {
      k: 'muz', grp: 'Güney Meydanı · Nadir Lotlar',
      ad: 'Müzayede Köşkü', sub: openLots ? `${openLots} nadir lot bekliyor` : 'Bu haftanın lotları bitti',
      x: 59.0, y: 79.0, sz: 164, act: 'muz', dk: '',
      open: true, badge: openLots ? String(openLots) : '',
    },
  ];

  const nodesHtml = stalls.map(s => `
    <button class="town-node pazar-node stall s-${s.k} ${s.open ? '' : 'closed'} ${s.ready ? 'ready' : ''}" style="left:${s.x}%;top:${s.y}%;--tsz:${s.sz}px;z-index:${Math.round(s.y * 10)}" data-a="${s.act}" ${s.dk ? `data-k="${s.dk}"` : ''} ${s.open ? '' : 'disabled'} data-hover>
      <span class="stip">
        <em class="stip-grp">${s.grp}</em>
        <b>${s.ad}</b>
        <small>${s.sub}</small>
      </span>
      <div class="tn-glow"></div>
      <img src="${asset('pazar-' + s.k) || (`img/iso/pazar-${s.k}.webp`)}" class="tn-img stall-img" alt="">
      ${s.pen || ''}
      <span class="plank tn-plank">${s.ad}${s.badge ? `<i class="tn-badge ${s.ready ? 'good' : ''}">${s.badge}</i>` : ''}</span>
    </button>
  `).join('');

  const bgPazarIso = asset('bg-pazar-iso') || 'img/bg-pazar-iso.webp';
  const showMapOnMob = !!(UI && UI.mobShowMap);
  const portraitListHtml = `
    <div class="mob-portrait-list pazar-portrait-list">
      <div class="mob-list-hero" style="background-image:url('${bgPazarIso}')">
        <div class="mob-list-hero-ov">
          <div class="mob-list-hero-top">
            <div>
              <span class="kicker">Gece Çarşısı · 9 Tezgâh & Oyuncu Bedesteni</span>
              <h2>Pazaryeri Rehberi</h2>
            </div>
            <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Harita Görünümü</button>
          </div>
          <div class="mob-list-pills">
            <span class="mp-pill on">Oyuncu Bedesteni: ${bedListings.length} İlan</span>
            <span class="mp-pill wev">Müzayede: ${openLots} Lot · Sipariş: ${nO}</span>
          </div>
        </div>
      </div>
      <div class="mob-list-cards">
        ${stalls.map(s => `
          <button class="mob-dir-card ${s.ready ? 'ready' : ''} ${s.open ? '' : 'closed'}" data-a="${s.act}" ${s.dk ? `data-k="${s.dk}"` : ''} ${s.open ? '' : 'disabled'}>
            <div class="mob-dir-ic">
              <img src="${asset('pazar-' + s.k) || (`img/iso/pazar-${s.k}.webp`)}" alt="${esc(s.ad)}">
              ${s.badge ? `<i class="tn-badge ${s.ready ? 'good' : ''}">${s.badge}</i>` : ''}
            </div>
            <div class="mob-dir-info">
              <span class="kicker">${esc(s.grp)}</span>
              <b>${esc(s.ad)}</b>
              <small>${esc(s.sub)}</small>
            </div>
            <span class="mob-dir-go">${ui('right')}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  return `<div class="pazar pazar-iso-view ${showMapOnMob ? 'mob-force-map' : ''}">
    ${portraitListHtml}
    <div class="kasaba-map pazar-iso-map" style="background-image:url('${bgPazarIso}')">
      <img src="${bgPazarIso}" class="iso-bg-img" alt="">
      <div class="kasaba-top-hud">
        <div class="kt-title">
          <span class="kicker">İzometrik Gece Çarşısı · 9 Tezgâh & Oyuncu Bedesteni</span>
          <h2>Pazaryeri Meydanı</h2>
        </div>
        <div class="kt-cluster-legend">
          <span class="mp-pill on">Oyuncu Bedesteni: ${bedListings.length} İlan</span>
          <span class="mp-pill wev">Müzayede: ${openLots} Lot · Sipariş: ${nO}</span>
          <button class="btn ghost xs mob-view-toggle" data-a="mob-view-toggle">Liste Görünümü</button>
        </div>
      </div>
      ${nodesHtml}
      <div class="hint-pill kasaba-hint">Bir tezgâhın veya Oyuncu Bedesteni'nin üzerine gelerek malları gör, tıklayarak ticarete başla.</div>
    </div>
  </div>`;
}

function gcard(o) {
  // o: {cls, art, title, sub, body, price, btn, act, data, can, stamp}
  return `<div class="gcard ${o.cls || ''}" data-hover>
    <div class="gart">${o.art}</div>
    <div class="gtxt"><b>${o.title}</b>${o.sub ? `<small>${o.sub}</small>` : ''}${o.body || ''}</div>
    <div class="gbuy">${o.price != null ? `<span class="tag">${goldTxt(o.price)}</span>` : ''}<button class="btn ${o.btnCls || 'primary'} sm" data-a="${o.act}" ${o.data || ''}>${o.btn}</button></div>
  </div>`;
}

function vendorView(k) {
  if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms();
  const V = VENDORS[k];
  if (!UI.vsay) vSay(k, k === 'ejder' && !S.market.dragons.length ? 'empty' : k === 'yumurta' && !S.market.egg ? 'empty' : 'greet');
  let tabs = '', goods = '';
  if (k === 'ejder') {
    tabs = `<div class="vtabs"><button class="vtab ${UI.stallTab === 'al' ? 'on' : ''}" data-a="stab" data-k="al">Satılık ejderhalar</button><button class="vtab ${UI.stallTab === 'sat' ? 'on' : ''}" data-a="stab" data-k="sat">Ejderhanı sat</button><button class="vtab ${UI.stallTab === 'sip' ? 'on' : ''}" data-a="stab" data-k="sip">Sipariş panosu (${orders().list.length})</button></div>`;
    if (UI.stallTab === 'sip') goods = ordersTab();
    else if (UI.stallTab === 'al') {
      goods = S.market.dragons.length ? pager('v-ejder', S.market.dragons.map((d, i) => [d, i]), PER(3, 1), ([d, i]) => gcard({
        cls: 'dr ' + (potSum(d) >= 28 ? 't3' : potSum(d) >= 22 ? 't2' : 't1'), art: hasAngle(d, '34') ? angleSVG(d, '34', { face: 'r' }) : dragonSVG(d),
        title: `${esc(d.name)} ${sexIc(d.sex)}`, sub: `${elChip(d.el)} ${STAGE_AD[d.stage]}`,
        body: `<div class="potline">${STATS.map(s => { const g = d.genes.pot[s][0] + d.genes.pot[s][1]; return `<span>${ST_KISA[s]}<b>${d.st[s]}</b><i class="g${Math.floor(g / 2)}">${potLetter(g)}</i></span>`; }).join('')}</div>
          <div class="traits">${d.traits.map(t => `<span class="trait sm" title="${TRAITS[t].d}"><b>${TRAITS[t].ad}</b></span>`).join('')}</div>`,
        price: d.price, btn: 'Satın al', act: 'buyD', data: `data-i="${i}"`,
      })) : `<div class="vempty">Tezgâh boş. Yeni kervan haftaya gelir.</div>`;
    } else {
      goods = S.dragons.length ? pager('v-sell', S.dragons, PER(4, 2), d => gcard({
        cls: 'dr sell', art: dragonSVG(d, { still: true }), title: esc(d.name), sub: `${EL_AD[d.el]} · ${STAGE_AD[d.stage]} · ${d.w} zafer`,
        price: Math.round(value(d) * 0.6), btn: UI.sellArm === d.id ? 'Sat, geri alınamaz' : 'Teklifi kabul et', btnCls: UI.sellArm === d.id ? 'danger' : 'ghost', act: 'sell', data: `data-id="${d.id}"`,
      })) : `<div class="vempty">Satacak ejderhan yok.</div>`;
    }
  }
  if (k === 'yumurta') {
    const E = S.market.egg;
    goods = E ? `<div class="eggstage"><div class="cushion">${eggSVG(E, 0, { glow: true, cls: 'wobble' })}</div>
      <div class="eggtxt"><b>Gizemli yumurta</b><p>Kabuğu ${EL_AD[expEl(E.genes.el)].toLowerCase()} renginde. İçinden ne çıkacağını kimse bilmez; belki gizli bir gen, belki altın gözler.</p>
      <div class="gbuy"><span class="tag">${goldTxt(eggPrice(E))}</span><button class="btn primary" data-a="buyEgg">Satın al</button></div></div></div>` : `<div class="vempty">Sepet boş. Hatice haftaya yeni yumurtalar getirecek.</div>`;
  }
  if (k === 'yem') {
    goods = pager('v-yem', Object.keys(FOODS), PER(4, 2), f => {
      const F = FOODS[f], lock = F.kiler && !hasB('kiler');
      const subTxt = F.onlyBaby ? 'Sadece Yavrular İçebilir · Topçu Silahı' : F.el ? `${EL_AD[F.el]} ejderhaları sever` : (f === 'ziyafet' ? 'Kiler gerekir' : 'Herkes sever');
      return gcard({ cls: 'food' + (lock ? ' locked' : '') + (F.onlyBaby ? ' t3' : ''), art: foodIcon(f), title: F.ad, sub: subTxt,
        body: `<small class="have">Kilerde ×${S.food[f] || 0}</small>${F.onlyBaby ? '<small class="idesc">Zindan ve Ejder Topçusu savaşları için yavru ejderhaya içirilir.</small>' : ''}`, price: F.fiyat, btn: lock ? 'Kiler gerekir' : 'Al', btnCls: lock ? 'ghost' : 'primary', act: 'buyFood', data: `data-f="${f}"` });
    });
  }
  if (k === 'demir') {
    if (!['ors', 'dokum', 'sentez', 'al', 'sat'].includes(UI.stallTab)) UI.stallTab = 'ors';
    tabs = `<div class="vtabs">
      <button class="vtab ${UI.stallTab === 'ors' ? 'on' : ''}" data-a="stab" data-k="ors">🔥 Kor Örsü (+Basma & Onarım)</button>
      <button class="vtab ${UI.stallTab === 'dokum' ? 'on' : ''}" data-a="stab" data-k="dokum">⚒️ Kalıp & Uyanış Dökümhanesi</button>
      <button class="vtab ${UI.stallTab === 'sentez' ? 'on' : ''}" data-a="stab" data-k="sentez">♻️ Eritme & Taş Sentezi</button>
      <button class="vtab ${UI.stallTab === 'al' || UI.stallTab === 'sat' ? 'on' : ''}" data-a="stab" data-k="al">🐉 Ejderha Koşum & Zırhları</button>
    </div>`;
    if (UI.stallTab === 'ors' && typeof renderUstaKerimOrsTab === 'function') {
      goods = renderUstaKerimOrsTab();
    } else if (UI.stallTab === 'dokum' && typeof renderUstaKerimDokumTab === 'function') {
      goods = renderUstaKerimDokumTab();
    } else if (UI.stallTab === 'sentez' && typeof renderUstaKerimSentezTab === 'function') {
      goods = renderUstaKerimSentezTab();
    } else {
      const subToggle = `<div style="display:flex;gap:6px;margin-bottom:8px;">
        <button class="btn sm ${UI.stallTab === 'al' ? 'primary' : 'ghost'}" data-a="stab" data-k="al">Ejder Tezgâhı (${S.smith.length})</button>
        <button class="btn sm ${UI.stallTab === 'sat' ? 'primary' : 'ghost'}" data-a="stab" data-k="sat">Sandığın (${S.inv.length})</button>
      </div>`;
      if (UI.stallTab === 'al') {
        goods = subToggle + (S.smith.length ? pager('v-demir', S.smith, PER(4, 2), id => { const it = ITEMS[id]; return gcard({ cls: 'item t' + it.tier, art: itemIcon(id), title: it.ad, sub: `${SLOT_AD[it.slot]} · ${['', 'Sıradan', 'Usta işi', 'Efsanevi'][it.tier]}`, body: `<small class="idesc">${itemDesc(it)}</small>`, price: smithPrice(id), btn: 'Satın al', act: 'buyI', data: `data-k="${id}"` }); }) : `<div class="vempty">Bugün ejderha koşum tezgâhı boş. Kerim yeni işler dövüyor.</div>`);
      } else {
        goods = subToggle + (S.inv.length ? pager('v-inv', S.inv, PER(4, 2), i => { const it = ITEMS[i.id], w = equippedBy(i.uid); return gcard({ cls: 'item own t' + it.tier, art: itemIcon(i.id), title: it.ad, sub: w ? `${esc(w.name)} kuşanıyor` : 'Sandıkta', body: `<small class="idesc">${itemDesc(it)}</small>`, price: sellBack(i.id), btn: w && UI.sellArm === 'i' + i.uid ? `${esc(w.name)} çıkarsın, sat` : 'Kerim\'e sat', btnCls: w && UI.sellArm === 'i' + i.uid ? 'danger' : 'ghost', act: 'sellI', data: `data-uid="${i.uid}"` }); }) : `<div class="vempty">Sandığın boş. Tezgâhtan aldığın ejderha ekipmanı burada durur; istersen yarı fiyatına Kerim'e geri satarsın.</div>`);
      }
    }
  }
  const portrait = asset('npc-' + V.npc) ? `<img src="${asset('npc-' + V.npc)}" alt="">` : npcSVG(V.npc);
  return `<div class="vendor v-${k}">
    <button class="backbtn" data-a="stall-back">${ui('left')} Çarşıya dön</button>
    <div class="vportrait nod${(UI.vnod || 0) % 2}">${portrait}<div class="vname"><b>${V.ad}</b><small>${V.unvan}</small></div></div>
    <div class="vright">
      <div class="vspeech"><p id="vsay">${esc(UI.vsay)}</p></div>
      <div class="vcounter">${tabs}<div class="vgoods">${goods}</div>
        <div class="vfoot"><span>${ui('gold')} ${typeof ECO_SYNC !== 'undefined' && ECO_SYNC.active() ? `Ocak Kesesi <b>${ECO_SYNC.purse()}</b> altın` : `Kesende <b>${S.gold}</b> altın`}</span>${k === 'ejder' ? `<span>İnlerde boş yer: <b>${freeSlots()}</b></span>` : ''}</div></div>
    </div>
  </div>`;
}

/* --- eylemler (ACT'e eklenir) --- */
function coinsFrom(el) { const r = el?.getBoundingClientRect?.(); if (r) FX.coins(r.x + r.width / 2, r.y + r.height / 2); }
const PAZAR_ACT = {
  stall(el) { const k = el.dataset.k; if (!stallOpen(k)) return; UI.stall = k; UI.stallTab = k === 'demir' ? 'ors' : 'al'; UI.vsay = null; UI.sellArm = null; SFX.play('tab'); render(); },
  'stall-back'() { UI.stall = null; UI.vsay = null; UI.sellArm = null; UI.bedPick = null; SFX.play('tab'); render(); },
  stab(el) { UI.stallTab = el.dataset.k; UI.sellArm = null; SFX.play('page'); render(); },
  buyD(el) {
    const i = +el.dataset.i, d = S.market.dragons[i]; if (!d) return;
    if (S.gold < d.price) { vSay('ejder', 'poor'); SFX.play('error'); return render(); }
    if (freeSlots() < 1) { vSay('ejder', 'full'); SFX.play('error'); return render(); }
    coinsFrom(el); S.gold -= d.price; d.id = S.nid++; delete d.price; S.dragons.push(d); S.market.dragons.splice(i, 1); S.st.acq++;
    chron(`${d.name} pazardan alındı.`); toast(`<b>${esc(d.name)}</b> ocağa katıldı.`); vSay('ejder', 'buy'); SFX.play('coin'); SFX.play('win'); afterAction();
  },
  buyEgg(el) {
    const e = S.market.egg; if (!e) return;
    if (S.gold < eggPrice(e)) { vSay('yumurta', 'poor'); SFX.play('error'); return render(); }
    coinsFrom(el); S.gold -= eggPrice(e); delete e.price; e.inK = kuluckaFree() > 0; S.eggs.push(e); S.market.egg = null;
    toast(e.inK ? 'Yumurta kuluçkaya yerleşti.' : 'Yumurta sepete kondu. Kuluçka Ocağı gerekiyor.'); vSay('yumurta', 'buy'); SFX.play('coin'); afterAction();
  },
  buyFood(el) {
    const f = el.dataset.f, F = FOODS[f];
    if (F.kiler && !hasB('kiler')) { vSay('yem', 'lock'); SFX.play('error'); return render(); }
    if (S.gold < F.fiyat) { vSay('yem', 'poor'); SFX.play('error'); return render(); }
    coinsFrom(el); S.gold -= F.fiyat; S.food[f] = (S.food[f] || 0) + 1;
    if (f === 'genclik') toast('<b>Sonsuz Gençlik İksiri</b> alındı! Ahır\'da veya Bakım ekranında bir <b>Yavru Ejderhaya</b> içirerek onu Zindan & Topçu silahın yapabilirsin.');
    vSay('yem', 'buy'); SFX.play('coin'); afterAction();
  },
  buyI(el) {
    const k = el.dataset.k, it = ITEMS[k];
    if (S.gold < smithPrice(k)) { vSay('demir', 'poor'); SFX.play('error'); return render(); }
    coinsFrom(el); S.gold -= smithPrice(k); S.inv.push({ uid: S.uid++, id: k }); S.smith.splice(S.smith.indexOf(k), 1);
    toast(`${it.ad} sandığa kondu. Ahır'da "Kuşan" ile tak.`); vSay('demir', 'buy'); SFX.play('coin'); SFX.play('build'); afterAction();
  },
  sell(el) {
    const id = +el.dataset.id; if (UI.sellArm !== id) { UI.sellArm = id; SFX.play('click'); render(); return; }
    const d = byId(id), v = Math.round(value(d) * 0.6); coinsFrom(el); S.gold += v; for (const s in d.equip) d.equip[s] = null;
    linReg(d); S.dragons = S.dragons.filter(x => x !== d); UI.sellArm = null; chron(`${d.name} ${v} altına satıldı.`); toast(`${esc(d.name)} satıldı: +${v} altın`); vSay('ejder', 'sell'); SFX.play('coin'); afterAction();
  },
  sellI(el) {
    const uid = +el.dataset.uid, w = equippedBy(uid);
    const itCheck = S.inv.find(i => i.uid === uid);
    if (itCheck && (itCheck.heirloomId || (ITEMS[itCheck.id] && ITEMS[itCheck.id].heirloom))) { SFX.play('error'); toast('Ata Yadigârı aile mirasıdır, eritilip satılamaz!'); return; }
    if (w && UI.sellArm !== 'i' + uid) { UI.sellArm = 'i' + uid; SFX.play('click'); return render(); }
    UI.sellArm = null; if (w) for (const s in w.equip) if (w.equip[s] === uid) w.equip[s] = null;
    const it = S.inv.find(i => i.uid === uid); coinsFrom(el); S.gold += sellBack(it.id); S.inv = S.inv.filter(i => i.uid !== uid); vSay('demir', 'sell'); SFX.play('coin'); afterAction();
  },
  'bedesten-open'() {
    UI.view = 'pazar';
    UI.stall = 'bedesten';
    UI.bedTab = UI.bedTab || 'vitrini';
    UI.bedCat = UI.bedCat || 'tumu';
    UI.bedSellCat = UI.bedSellCat || 'dragon';
    UI.bedArm = null;
    SFX.play('tab');
    const M = bedMarket();
    if (M) M.refresh();
    render();
  },
  'bed-tab'(el) {
    UI.bedTab = el.dataset.k || 'vitrini';
    UI.pg['bed-list'] = 0;
    UI.pg['bed-sell'] = 0;
    UI.pg['bed-mine'] = 0;
    UI.bedArm = null;
    UI.bedPick = null;
    SFX.play('tab');
    render();
  },
  'bed-cat'(el) {
    UI.bedCat = el.dataset.k || 'tumu';
    UI.pg['bed-list'] = 0;
    SFX.play('page');
    render();
  },
  'bed-sell-cat'(el) {
    UI.bedSellCat = el.dataset.k || 'dragon';
    UI.pg['bed-sell'] = 0;
    UI.bedPick = null;
    SFX.play('page');
    render();
  },
  'bed-refresh'() {
    SFX.play('page');
    const M = bedMarket();
    if (M) M.refresh();
  },
  'bed-retry'() {
    const M = bedMarket();
    if (M) M.retry();
  },
  // ENG-07: tüm mutasyonlar sunucuda (POST /api/market). Yerel S'e altın/varlık yazılmaz.
  'bed-buy'(el) {
    bedSend('buy', el);
  },
  'bed-cancel'(el) {
    bedSend('cancel', el);
  },
  'bed-post-dragon'(el) {
    bedSend('list', el, 'dragon');
  },
  'bed-post-egg'(el) {
    bedSend('list', el, 'egg');
  },
  'bed-post-item'(el) {
    bedSend('list', el, 'item');
  },
  'bed-post-food'(el) {
    bedSend('list', el, 'food');
  },
  'bed-post-mat'(el) {
    toast('Cevher, kalıp, taş ve özlerin sunucuda kaynak kaydı yok; Bedesten\'e konması kapalı.');
  },
  'bed-sim-sale'(el) {
    toast('Anında satış simülasyonu kapalı. Gerçek alıcı satın aldığında satış sunucuda kendiliğinden yazılır.');
  },
  'bed-offer'(el) {
    toast('Pazarlık teklifi kapalı; yalnız ilan fiyatından satın alınabilir.');
  }
};

/* --- ENG-07 · Gerçek oyunculu Bedesten (sunucu otoriteli, serbest fiyat) ---
   İlanlar, rezervasyon ve satın alma sunucudadır (js/market_client.js → /api/market).
   Sahte/tohum ilan yoktur: sunucuda ilan yoksa boş durum gösterilir. */
function bedMarket() { return typeof MARKET_CLIENT !== 'undefined' ? MARKET_CLIENT : null; }
const BED_KIND_CAT = { dragon: 'dragon', egg: 'egg', item: 'equip', food: 'food' };
// ENG-10 (O-7): sunucunun ilan üzerinde işaretlediği "şu an alınamaz" nedeni (önizleme güncel tutulur).
const BED_UNAVAILABLE = { asset_unavailable: 'görevde, kuluçkada, kilitli ya da yaşlı', asset_equipped: 'ekipmanlı ya da kuşanılmış' };
const BED_MSG = {
  gold_not_transferable: 'Yalnız kazanılmış (earned) altınla başka oyuncudan alınabilir.',
  insufficient_gold: 'Ocak Kesesi\'nde yeterli altın yok.',
  asset_not_transferable: 'Bu varlık hesaba bağlı (başlangıç/bilinmeyen kaynak); satışa konamaz.',
  food_not_transferable: 'Bu yemin kazanılmış miktarı yetmiyor; bağlı yem satışa konamaz.',
  food_reserved: 'Bu yemin bir kısmı zaten ilanda veya takasta.',
  insufficient_food: 'Kilerinde bu kadar yem yok.',
  asset_unavailable: 'Bu varlık şu anda aktarılamaz (görevde, kuluçkada, kilitli veya yadigâr).',
  asset_equipped: 'Kuşanılmış eşya ya da ekipmanlı ejderha satışa konamaz.',
  asset_already_listed: 'Bu varlık zaten ilanda.',
  asset_reserved: 'Bu varlık açık bir takasta rezerve.',
  asset_not_owned: 'Bu varlık sunucu hesabında yok.',
  market_listing_limit: 'Açık ilan sınırına ulaştın.',
  debt_outstanding: 'Borcun varken Bedesten\'de alım ve ilan kapalı.',
  seller_unavailable: 'Satıcının hesabı şu anda satış yapamıyor.',
  own_listing: 'Kendi ilanını satın alamazsın.',
  listing_closed: 'Bu ilan kapandı (satıldı veya geri çekildi).',
  listing_not_found: 'İlan bulunamadı.',
  listing_not_owned: 'Bu ilan senin değil.',
  listing_quantity_unavailable: 'İlanda bu kadar miktar kalmadı.',
  listing_price_mismatch: 'İlan fiyatı beklenenden farklı; listeyi yenile.',
  listing_changed: 'İlan sen bakarken değişti (yaş, evre ya da durum). Güncel hâli gösterildi; yeniden kontrol edip onayla.',
  invalid_price: 'Fiyat 1 ile 2.000.000.000 arasında tam sayı olmalı.',
  invalid_quantity: 'Miktar geçersiz.',
  invalid_total: 'Toplam tutar sınırı aşıyor.',
  game_not_started: 'Sunucu hesabın henüz hazır değil.',
  trade_reserved_gold: 'Altının açık bir takasta rezerve.',
  trade_reserved_asset: 'Varlık açık bir takasta rezerve.',
  rate_limited: 'Çok sık istek gönderdin. Biraz sonra yeniden dene.',
  market_pending_retry: 'Önce bekleyen işlemin sonucunu doğrula.',
  market_busy: 'Sunucudan yanıt bekleniyor.',
  market_unverified: 'Sunucuya ulaşılamadı. Sonuç henüz doğrulanmadı; "Sonucu doğrula" ile aynı işlemi yeniden gönder.',
  market_unavailable: 'Bedesten sunucusuna ulaşılamadı.',
};
const bedErr = code => esc(BED_MSG[code] || ('İşlem doğrulanamadı: ' + code));
function bedDraft(k) { return (UI.bedDraft && UI.bedDraft[k]) || ''; }
// ENG-08: Ocak Sandığı "Bedestende Sat" ön seçimi. UI.bedPick = {kind, id, jump}; jump bir kez sayfayı kaleme götürür.
function bedPicked(kind, id) { return !!(UI.bedPick && UI.bedPick.kind === kind && UI.bedPick.id === id); }
function bedPickJump(ids, kind) {
  if (!UI.bedPick || !UI.bedPick.jump || UI.bedPick.kind !== kind) return;
  const i = ids.indexOf(UI.bedPick.id); UI.bedPick.jump = false;
  if (i >= 0) UI.pg['bed-sell'] = Math.floor(i / PER(4, 2));
}
function bedNum(k) { const n = Number(bedDraft(k)); return Number.isSafeInteger(n) && n > 0 ? n : null; }
if (typeof document !== 'undefined') document.addEventListener('input', e => {
  const k = e.target && e.target.dataset && e.target.dataset.bed;
  if (k) { UI.bedDraft = UI.bedDraft || {}; UI.bedDraft[k] = e.target.value; }
});
function bedInput(k, label, max) {
  return `<label class="mute sm" style="display:inline-flex;align-items:center;gap:4px;margin-top:4px">${label} <input type="number" inputmode="numeric" min="1" step="1" ${max ? `max="${max}"` : ''} data-bed="${esc(k)}" value="${esc(bedDraft(k))}" style="width:84px;max-width:40vw"></label>`;
}
function bedTitle(L) {
  if (L.kind === 'food' && typeof FOODS !== 'undefined' && FOODS[L.foodKey]) return FOODS[L.foodKey].ad;
  if (L.kind === 'item' && L.preview && typeof ITEMS !== 'undefined' && ITEMS[L.preview.itemId]) return ITEMS[L.preview.itemId].ad;
  if (L.kind === 'egg') return `Mühürlü ${(L.preview && EL_AD[L.preview.el]) || ''} Yumurtası`;
  return L.title;
}
async function bedSend(op, el, kind) {
  const M = bedMarket();
  if (!M) { toast('Bedesten sunucusuna bağlanılamadı; işlemler kapalı.'); return; }
  const id = el && el.dataset ? el.dataset.id : null;
  try {
    if (op === 'buy') {
      const L = M.state.listings.find(x => x.id === id);
      if (!L) { toast(bedErr('listing_not_found')); return; }
      const q = L.kind === 'food' ? (bedNum('buyq:' + L.id) || 1) : 1;
      if (q > L.remaining) { toast(bedErr('listing_quantity_unavailable')); return; }
      // İki adımlı onay: ilk tık tutarı gösterir, ikinci tık sunucuya gönderir.
      if (UI.bedArm !== 'b' + L.id + ':' + q) { UI.bedArm = 'b' + L.id + ':' + q; SFX.play('click'); render(); return; }
      UI.bedArm = null;
      const r = await M.buy(L, q);
      SFX.play('coin');
      toast(`<b>${esc(bedTitle(L))}</b> × ${r.sale.quantity} sunucuda satın alındı: <b>${r.sale.total}</b> altın.`, 'goal');
    } else if (op === 'cancel') {
      if (UI.bedArm !== 'c' + id) { UI.bedArm = 'c' + id; SFX.play('click'); render(); return; }
      UI.bedArm = null;
      await M.cancel(id);
      toast('İlan geri çekildi; varlık hesabında serbest.');
    } else {
      const unitPrice = bedNum('price:' + kind + ':' + id);
      const quantity = kind === 'food' ? bedNum('qty:food:' + id) : 1;
      if (!unitPrice) { toast(bedErr('invalid_price')); return; }
      if (!quantity) { toast(bedErr('invalid_quantity')); return; }
      await M.list(kind, id, quantity, unitPrice);
      if (UI.bedDraft) { delete UI.bedDraft['price:' + kind + ':' + id]; delete UI.bedDraft['qty:food:' + id]; }
      if (bedPicked(kind, id)) UI.bedPick = null;
      SFX.play('coin');
      toast('İlan sunucuya kaydedildi. Sen çevrimdışıyken de satılabilir.');
    }
  } catch (e) {
    SFX.play('error');
    toast(bedErr(e.message));
  }
  render();
}

function getBedestenListings() {
  const M = bedMarket();
  if (!M) return [];
  if (!M.state.loaded && !UI.bedAsked) { UI.bedAsked = true; M.refresh(); }
  return M.state.listings.filter(L => L.status === 'open');
}

function bedestenArtFor(L) {
  const p = L.preview || {};
  if (L.kind === 'dragon') {
    const elKey = p.el || 'golge';
    const mock = { id: 999, name: p.name || L.title || 'Ejderha', el: elKey, sex: p.sex || 'F', stage: p.stage || 'yetiskin',
      eye: p.eye || 'A', horn: p.horn || 't', pat: p.pat || 'B', genes: p.genes || { el: [elKey, elKey] }, equip: {} };
    try { return dragonSVG(mock, { still: true }); } catch (_) { /* eksik görünüm alanı: simgeye düş */ }
  }
  if (L.kind === 'egg') {
    try { return eggSVG({ id: 998, genes: p.genes || { el: [p.el || 'buz', p.el || 'buz'] } }, 0.6, { glow: true }); } catch (_) {}
  }
  if (L.kind === 'item' && p.itemId && typeof ITEMS !== 'undefined' && ITEMS[p.itemId]) return itemIcon(p.itemId);
  if (L.kind === 'food' && typeof FOODS !== 'undefined' && FOODS[L.foodKey]) return foodIcon(L.foodKey);
  return `<img src="${asset('ic-bedesten') || 'img/ui/ic-bedesten.webp'}" alt="" style="width:64px;height:64px;object-fit:contain">`;
}

function bedestenSellerAvatar(handle) {
  const map = {
    '@kuzey_ruzgari': 'img/npc-selin.webp',
    '@leydi_sureyya': 'img/npc-ozan.webp',
    '@altin_kervan': 'img/npc-tuccar.webp',
    '@demirhan_ocagi': 'img/npc-demirhan.webp',
    '@demir_ocak': 'img/npc-demirhan.webp',
    '@firtina_beyi': 'img/npc-cukur.webp',
    '@kul_avcisi': 'img/npc-kantuccari.webp',
    '@zumrut_avci': 'img/npc-selin.webp',
  };
  const src = map[handle] || asset('npc-bedesten') || 'img/npc-bedesten.webp';
  return `<img src="${src}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;border:1px solid rgba(224,160,64,.65)">`;
}

function bedestenView() {
  const tab = UI.bedTab || 'vitrini';
  const cat = UI.bedCat || 'tumu';
  const sellCat = UI.bedSellCat || 'dragon';
  const M = bedMarket();
  const st = M ? M.state : { listings: [], mine: [], economy: null, loaded: false, busy: false, error: '', pending: null, notice: '' };
  const eco = st.economy;
  const allListings = getBedestenListings();
  const myOpen = st.mine.filter(L => L.status === 'open');
  const netLive = typeof MP !== 'undefined' && (MP.connected || MP.wsConnected);
  const locked = st.busy || !!st.pending;

  const tabsHtml = `<div class="vtabs">
    <button class="vtab ${tab === 'vitrini' ? 'on' : ''}" data-a="bed-tab" data-k="vitrini">Canlı Oyuncu İlanları (${allListings.length})</button>
    <button class="vtab ${tab === 'ilanver' ? 'on' : ''}" data-a="bed-tab" data-k="ilanver">Pazara İlan Ver (Satışa Çıkar)</button>
    <button class="vtab ${tab === 'ilanlarim' ? 'on' : ''}" data-a="bed-tab" data-k="ilanlarim">Tezgâhım & Kayıtlar (${myOpen.length})</button>
    <button class="vtab" data-a="bed-refresh">Ağı Yenile</button>
  </div>`;

  const status = !M ? 'Bedesten sunucusuna bağlanılamadı; işlemler kapalı.'
    : st.busy ? 'Sunucudan yanıt bekleniyor…'
    : st.error ? bedErr(st.error)
    : st.notice ? esc(st.notice)
    : !st.loaded ? 'Bedesten defteri sunucudan okunuyor…'
    : 'Bedesten Ocak Kesesi\'ni (sunucu hesabın) kullanır; yerel kesendeki altın ayrıdır.';
  const statusHtml = `<p role="status" aria-live="polite" class="mute sm" style="margin:0 0 6px">${status}${st.pending ? ' <button class="btn ghost sm" data-a="bed-retry">Sonucu doğrula / yeniden dene</button>' : ''}</p>`;

  let bodyHtml = '';
  if (tab === 'vitrini') {
    const count = c => allListings.filter(x => BED_KIND_CAT[x.kind] === c).length;
    const filtered = cat === 'tumu' ? allListings : allListings.filter(x => BED_KIND_CAT[x.kind] === cat);
    const catBar = `<div class="plaques" style="margin-bottom:4px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="plaque ${cat === 'tumu' ? 'amber on' : ''}" data-a="bed-cat" data-k="tumu">Tümü (${allListings.length})</button>
      <button class="plaque ${cat === 'dragon' ? 'amber on' : ''}" data-a="bed-cat" data-k="dragon">Ejderhalar (${count('dragon')})</button>
      <button class="plaque ${cat === 'egg' ? 'amber on' : ''}" data-a="bed-cat" data-k="egg">Yumurtalar (${count('egg')})</button>
      <button class="plaque ${cat === 'equip' ? 'amber on' : ''}" data-a="bed-cat" data-k="equip">Zırh & Pusat (${count('equip')})</button>
      <button class="plaque ${cat === 'food' ? 'amber on' : ''}" data-a="bed-cat" data-k="food">İksir & Erzak (${count('food')})</button>
    </div>`;
    const cards = filtered.length
      ? pager('bed-list', filtered, PER(4, 2), L => {
          const q = L.kind === 'food' ? Math.min(L.remaining, bedNum('buyq:' + L.id) || 1) : 1;
          const armed = UI.bedArm === 'b' + L.id + ':' + q || UI.bedArm === 'c' + L.id;
          const qtyHtml = L.kind === 'food' && !L.mine ? bedInput('buyq:' + L.id, 'Adet', L.remaining) : '';
          return gcard({
            cls: 'item t3',
            art: bedestenArtFor(L),
            title: esc(bedTitle(L)) + (L.kind === 'food' ? ` <small>(Kalan: ${L.remaining})</small>` : ''),
            sub: `<span class="tag">${bedestenSellerAvatar(L.seller)}${esc(L.seller || 'Oyuncu')}</span>${L.mine ? ' · <b>Senin ilanın</b>' : ''}`,
            body: `<small class="idesc">${L.kind === 'food' ? 'Birim fiyat' : 'Fiyat'}: ${L.unitPrice} altın · Satıcı belirledi</small>${L.unavailable ? `<small class="idesc bad">⌛ ${L.mine ? 'Bu ilan' : 'Bu varlık'} şu an satın alınamaz (${esc(BED_UNAVAILABLE[L.unavailable] || 'kullanımda')}).</small>` : ''}${qtyHtml}`,
            price: L.unitPrice * q,
            btn: L.mine ? (armed ? 'Geri çekmeyi onayla' : 'Geri Çek') : (armed ? `Onayla: ${L.unitPrice * q} altın` : 'Satın Al'),
            btnCls: L.mine ? 'ghost' : 'primary',
            act: L.mine ? 'bed-cancel' : 'bed-buy',
            data: `data-id="${esc(L.id)}" ${locked || (L.unavailable && !L.mine) ? 'disabled' : ''}`
          });
        })
      : `<div class="vempty">${st.loaded ? 'Şu anda bu kategoride gerçek oyuncu ilanı yok. "Pazara İlan Ver" sekmesinden kendi kazandığın malı satışa çıkarabilirsin.' : 'İlanlar sunucudan okunuyor…'}</div>`;
    bodyHtml = catBar + cards;
  } else if (tab === 'ilanver') {
    const sellBar = `<div class="plaques" style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="plaque ${sellCat === 'dragon' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="dragon">Ejderhalarım</button>
        <button class="plaque ${sellCat === 'egg' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="egg">Yumurtalarım</button>
        <button class="plaque ${sellCat === 'equip' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="equip">Sandığım</button>
        <button class="plaque ${sellCat === 'mat' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="mat">Cevher, Kalıp & Taş</button>
        <button class="plaque ${sellCat === 'food' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="food">İksir & Kiler</button>
      </div><p class="mute sm" style="margin:0 0 6px">Fiyatı sen belirlersin. Yalnız oyunda kazandığın varlıklar satılabilir; ilan süresince varlık hesabında rezerve kalır.</p>`;
    let sellCards = '';
    if (!eco || !eco.game) {
      sellCards = `<div class="vempty">${st.loaded ? 'Sunucu hesabın henüz hazır değil. <button class="btn ghost sm" data-open-trade>⇄ Takas ekranından hazırla</button>' : 'Sunucu envanterin okunuyor…'}</div>`;
    } else if (sellCat === 'mat') {
      sellCards = `<div class="vempty">Cevher, kalıp, Kor taşı ve özlerin sunucuda kaynak kaydı yok; bu yüzden Bedesten'e konamaz.</div>`;
    } else if (sellCat === 'food') {
      const held = {};
      for (const L of myOpen) if (L.kind === 'food') held[L.foodKey] = (held[L.foodKey] || 0) + L.remaining;
      const keys = Object.keys(eco.game.foodSources || {}).filter(k => (eco.game.foodSources[k].earned || 0) > 0);
      bedPickJump(keys, 'food');
      sellCards = keys.length
        ? pager('bed-sell', keys, PER(4, 2), fk => {
            const F = (typeof FOODS !== 'undefined' && FOODS[fk]) || { ad: 'Yiyecek' }; // ENG-11: ham anahtar gösterilmez
            const free = Math.max(0, (eco.game.foodSources[fk].earned || 0) - (held[fk] || 0));
            return gcard({
              cls: 'food own' + (bedPicked('food', fk) ? ' bed-pick' : ''),
              art: typeof FOODS !== 'undefined' && FOODS[fk] ? foodIcon(fk) : '',
              title: `${esc(F.ad)} (Satılabilir: ${free})`,
              sub: held[fk] ? `İlanda: ${held[fk]}` : 'Kiler Erzağı & İksir',
              body: bedInput('qty:food:' + fk, 'Adet', free) + bedInput('price:food:' + fk, 'Birim fiyat'),
              btn: 'İlana Koy',
              act: 'bed-post-food',
              data: `data-id="${esc(fk)}" ${locked || !free ? 'disabled' : ''}`
            });
          })
        : `<div class="vempty">Kilerinde satılabilecek kazanılmış yem veya iksir yok.</div>`;
    } else {
      const kind = sellCat === 'equip' ? 'item' : sellCat;
      const key = { dragon: 'dragons', egg: 'eggs', item: 'items' }[kind];
      const listed = new Set(myOpen.map(L => L.assetId));
      const rows = eco[key] || [];
      const why = a => {
        const d = a.data;
        if (listed.has(a.assetId)) return 'İlanda';
        if (d.funding !== 'earned') return 'Hesaba bağlı';
        if (d.tradeLocked || d.heirloomId || d.dead || d.old || d.busy || d.task || d.inK || d.hatching) return 'Şu anda aktarılamaz';
        if (kind === 'dragon' && Object.values(d.equip || {}).some(v => v != null)) return 'Ekipmanlı';
        if (kind === 'item' && eco.dragons.some(dr => Object.values(dr.data.equip || {}).some(v => v != null && String(v) === String(d.uid)))) return 'Kuşanılmış';
        return '';
      };
      bedPickJump(rows.map(a => a.assetId), kind);
      sellCards = rows.length
        ? pager('bed-sell', rows, PER(4, 2), a => {
            const d = a.data, blocked = why(a);
            let art = '', title = esc(d.name || { dragon: 'Ejderha', egg: 'Yumurta', item: 'Eşya' }[kind]), sub = '';
            try {
              if (kind === 'dragon') { art = dragonSVG(d, { still: true }); title = `${esc(d.name)} ${sexIc(d.sex)}`; sub = `${elChip(d.el)} ${STAGE_AD[d.stage] || ''}`; }
              else if (kind === 'egg') { const elKey = (d.genes && d.genes.el && d.genes.el[0]) || 'ates'; art = eggSVG(d, 0.6, { glow: true }); title = `Mühürlü ${EL_AD[elKey] || ''} Yumurtası`; sub = d.inK ? 'Kuluçkada' : 'Sepette'; }
              else { const it = ITEMS[d.id]; art = it ? itemIcon(d.id) : ''; title = esc(it ? it.ad : 'Eşya'); sub = it ? SLOT_AD[it.slot] : ''; }
            } catch (_) { /* görünüm alanı eksik: metinle göster */ }
            return gcard({
              cls: (kind === 'dragon' ? 'dr' : kind === 'egg' ? 'egg' : 'item') + ' own' + (bedPicked(kind, a.assetId) ? ' bed-pick' : ''),
              art, title, sub: sub + (blocked ? ` · <b>${esc(blocked)}</b>` : ''),
              body: blocked ? '' : bedInput('price:' + kind + ':' + a.assetId, 'Fiyat'),
              btn: blocked || 'İlana Koy',
              btnCls: blocked ? 'ghost' : 'primary',
              act: 'bed-post-' + kind,
              data: `data-id="${esc(a.assetId)}" ${locked || blocked ? 'disabled' : ''}`
            });
          })
        : `<div class="vempty">Sunucu hesabında bu türden varlık yok.</div>`;
    }
    bodyHtml = sellBar + sellCards;
  } else {
    const label = { open: 'Açık', sold: 'Satıldı', cancelled: 'Geri çekildi' };
    const mineCards = st.mine.length
      ? pager('bed-mine', st.mine, PER(4, 2), L => {
          const sales = (L.sales || []).slice(0, 3).map(s => `${esc(s.buyer || 'Oyuncu')} · ${s.quantity} adet · ${s.total} altın`).join('<br>');
          const armed = UI.bedArm === 'c' + L.id;
          return gcard({
            cls: 'item own t3',
            art: bedestenArtFor(L),
            title: esc(bedTitle(L)),
            sub: `${label[L.status] || esc(L.status)} · ${L.kind === 'food' ? 'Birim ' : ''}${L.unitPrice} altın · Satılan: ${L.sold}/${L.quantity}`,
            body: sales ? `<small class="idesc">${sales}</small>` : '<small class="idesc">Henüz satış yok. Sen çevrimdışıyken de satılabilir.</small>',
            btn: L.status === 'open' ? (armed ? 'Geri çekmeyi onayla' : 'İlanı Geri Çek') : 'Kapandı',
            btnCls: 'ghost',
            act: 'bed-cancel',
            data: `data-id="${esc(L.id)}" ${locked || L.status !== 'open' ? 'disabled' : ''}`
          });
        })
      : `<div class="vempty">Henüz bir ilanın yok. "Pazara İlan Ver" sekmesinden kazandığın ejderha, yumurta, zırh veya yemi satışa çıkarabilirsin.</div>`;
    bodyHtml = mineCards;
  }

  const npcBed = asset('npc-bedesten') || 'img/npc-bedesten.webp';
  const bannerBed = asset('bedesten-banner') || 'img/ui/bedesten-banner.webp';
  return `<div class="vendor v-bedesten">
    <button class="backbtn" data-a="stall-back">${ui('left')} Çarşıya dön</button>
    <div class="vportrait nod${(UI.vnod || 0) % 2}">
      <img src="${npcBed}" alt="Başmünadi Rüstem Ağa">
      <div class="vname">
        <b>Başmünadi Rüstem Ağa</b>
        <small>${netLive ? 'Canlı Oyuncu Bedesteni (WebSocket Aktif)' : 'Kervansaray Bedesten & Müzayede Nazırı'}</small>
      </div>
    </div>
    <div class="vright">
      <div class="vspeech" style="display:flex;align-items:center;gap:10px">
        <img src="${bannerBed}" alt="Bedesten Arması" style="width:42px;height:42px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))">
        <p id="vsay" style="margin:0">${esc(UI.vsay || 'Kervansaray Bedesteni\'nde ocaklar kendi kazandıkları ejderhaları, yumurtaları, zırhları ve yemleri diledikleri fiyattan doğrudan diğer oyunculara satar. Defteri ben tutarım; satıcı çarşıda olmasa da alışveriş yazılır.')}</p>
      </div>
      <div class="vcounter">
        ${statusHtml}
        ${tabsHtml}
        <div class="vgoods">${bodyHtml}</div>
        <div class="vfoot">
          <span>${ui('gold')} Ocak Kesesi <b>${eco ? eco.gold : '—'}</b> altın${eco && eco.funds ? ` (alışverişe açık: <b>${eco.funds.earned}</b>)` : ''}</span>
          <span>Aktif İlan: <b>${allListings.length}</b> · Senin İlanın: <b>${myOpen.length}</b></span>
        </div>
      </div>
    </div>
  </div>`;
}

function hanSVG() {
  return `<svg viewBox="0 0 320 300" class="stall-svg" aria-hidden="true">${SVG_DEFS_SMALL}
    <ellipse cx="160" cy="286" rx="150" ry="14" fill="#000" opacity=".4"/>
    <rect x="34" y="96" width="252" height="184" fill="#5a3e30" stroke="#1a100a" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M34,${112 + i * 28} h252" stroke="#3e2a20" stroke-width="2"/>`).join('')}
    <path d="M20,100 L160,40 L300,100 Z" fill="#7a3a2a" stroke="#1a100a" stroke-width="2"/><path d="M40,92 L160,48 L280,92" stroke="#a8543a" stroke-width="3" fill="none"/>
    <path d="M118,280 V196 a42,42 0 0 1 84,0 V280 Z" fill="#2a1408" stroke="#1a100a" stroke-width="2"/>
    <path d="M124,280 V198 a36,36 0 0 1 72,0 V280 Z" fill="#ffb347" opacity=".75" class="flick"/>
    <rect x="58" y="130" width="40" height="44" rx="4" fill="#ffcf7a" class="flick" stroke="#1a100a" stroke-width="2"/><rect x="222" y="130" width="40" height="44" rx="4" fill="#ffcf7a" class="flick" stroke="#1a100a" stroke-width="2"/>
    <path d="M78,130 v44 M58,152 h40 M242,130 v44 M222,152 h40" stroke="#5a3a20" stroke-width="2"/>
    <rect x="44" y="184" width="64" height="16" fill="#8a2a22"/><path d="M48,188 l8,4 l-8,4 M60,188 l8,4 l-8,4 M72,188 l8,4 l-8,4 M84,188 l8,4 l-8,4 M96,188 l8,4 l-8,4" stroke="#e0a040" stroke-width="2" fill="none"/>
    <line x1="246" y1="200" x2="246" y2="226" stroke="#2a1a10" stroke-width="2"/><ellipse cx="246" cy="234" rx="9" ry="12" fill="#ffb347" class="flick"/><circle cx="246" cy="234" r="26" fill="#ffb347" fill-opacity=".25" filter="url(#blur8)" class="flick"/>
  </svg>`;
}
