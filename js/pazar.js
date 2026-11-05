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
        <div class="vfoot"><span>${ui('gold')} Kesende <b>${S.gold}</b> altın</span>${k === 'ejder' ? `<span>İnlerde boş yer: <b>${freeSlots()}</b></span>` : ''}</div></div>
    </div>
  </div>`;
}

/* --- eylemler (ACT'e eklenir) --- */
function coinsFrom(el) { const r = el?.getBoundingClientRect?.(); if (r) FX.coins(r.x + r.width / 2, r.y + r.height / 2); }
const PAZAR_ACT = {
  stall(el) { const k = el.dataset.k; if (!stallOpen(k)) return; UI.stall = k; UI.stallTab = k === 'demir' ? 'ors' : 'al'; UI.vsay = null; UI.sellArm = null; SFX.play('tab'); render(); },
  'stall-back'() { UI.stall = null; UI.vsay = null; UI.sellArm = null; SFX.play('tab'); render(); },
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
    UI.bedMult = UI.bedMult || 120;
    SFX.play('tab');
    syncBedestenFromServer();
    render();
  },
  'bed-tab'(el) {
    UI.bedTab = el.dataset.k || 'vitrini';
    UI.pg['bed-list'] = 0;
    UI.pg['bed-sell'] = 0;
    UI.pg['bed-mine'] = 0;
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
    SFX.play('page');
    render();
  },
  'bed-mult'(el) {
    UI.bedMult = +el.dataset.m || 120;
    SFX.play('tick');
    render();
  },
  'bed-refresh'() {
    SFX.play('page');
    syncBedestenFromServer(true);
  },
  'bed-buy'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-cancel'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-post-dragon'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-post-egg'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-post-item'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-post-food'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-post-mat'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-sim-sale'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  },
  'bed-offer'(el) {
    toast('Bedesten işlemleri, güvenli sunucu aktarımı tamamlanana kadar kapalı.');
  }
};

const DEFAULT_BEDESTEN_SEED = [
  { id: 'mk_seed_1', seller: '@kuzey_ruzgari', guild: 'Bozkır Pençesi', cat: 'dragon', title: 'Bora Pençesi (Fırtına · Yetişkin)', desc: 'Safkan Fırtına Soyu · Güç 94 · Hız +18', price: 320, payload: { dragon: { name: 'Bora Pençesi', el: 'firtina', sex: 'M', stage: 'yetiskin', genes: { el: ['firtina', 'firtina'], pat: ['C', 'K'], eye: ['A', 'N'], horn: ['k', 't'], pot: { gu: [4, 4], ce: [5, 4], da: [4, 3], ze: [4, 4] } } } } },
  { id: 'mk_seed_2', seller: '@leydi_sureyya', guild: 'Kızıl Ocak', cat: 'egg', title: 'Mühürlü Ayaz Kristal Yumurtası', desc: 'Çift Çekinik Kristal Gen · Yüksek Mutasyon Şansı', price: 185, payload: { egg: { el: 'buz', tier: 3 } } },
  { id: 'mk_seed_3', seller: '@altin_kervan', guild: 'Altın Kervan', cat: 'food', title: 'Sonsuz Gençlik İksiri (Mühürlü)', desc: 'Sadece yavru ejderhalara içirilir; ebediyen yavru tutar ve Zindan/Topçu silahı yapar.', price: 135, payload: { foodKey: 'genclik', qty: 1 } },
  { id: 'mk_seed_4', seller: '@firtina_beyi', guild: 'Gök Gürültüsü', cat: 'equip', title: 'Ejder Dişi Miğfer', desc: 'Kafa Zırhı · +16 Savunma, +8 Hız', price: 210, payload: { itemId: 'ejder_migfer' } },
  { id: 'mk_seed_5', seller: '@demir_ocak', guild: 'Demir Örs', cat: 'mat', title: '1× Şahmeran Sırça Kalıbı', desc: 'Sırça Saray Zindanı kadim ekipman şeması parçası · Dökümhane materyali.', price: 460, payload: { matKind: 'shard', matKey: 'sahmeran_kalip', ic: 'img/ui/items/shard_sahmeran.webp', qty: 1 } },
  { id: 'mk_seed_6', seller: '@kul_avcisi', guild: 'Kızıl Ocak', cat: 'mat', title: '2× Obsidiyen Cevheri', desc: 'Kızıl Vadi Kervan Yolu volkanik cevheri · Silah ve miğfer dökümü.', price: 210, payload: { matKind: 'ore', matKey: 'obsidiyen', ic: 'img/ui/items/ore_obsidiyen.webp', qty: 2 } },
  { id: 'mk_seed_7', seller: '@demirhan_ocagi', guild: 'Demir Örs', cat: 'mat', title: '1× Anka Mühür Taşı', desc: '+5..+12 dövmede seviye düşmesini ve eşyanın yanıp hurdaya dönmesini %100 önler!', price: 920, payload: { matKind: 'stone', matKey: 'anka_koruma', ic: 'img/ui/items/stone_anka_koruma.webp', qty: 1 } },
];

function getBedestenListings() {
  if (typeof MP !== 'undefined' && Array.isArray(MP.marketListings) && MP.marketListings.length > 0) {
    return MP.marketListings;
  }
  if (!S.bedestenListings || !Array.isArray(S.bedestenListings) || !S.bedestenListings.length) {
    S.bedestenListings = JSON.parse(JSON.stringify(DEFAULT_BEDESTEN_SEED));
  }
  if (typeof MP !== 'undefined') MP.marketListings = S.bedestenListings;
  return S.bedestenListings;
}

function syncBedestenFromServer(showToast) {
  fetch('/api/market')
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d && Array.isArray(d.listings)) {
        if (typeof MP !== 'undefined') {
          MP.marketListings = d.listings;
          MP.marketSales = d.sales || [];
        }
        if (S) S.bedestenListings = d.listings;
        if (showToast) toast(`Oyuncu Bedesteni güncellendi: <b>${d.listings.length} aktif ilan</b>.`);
        if (UI.view === 'pazar' && UI.stall === 'bedesten') render();
      }
    })
    .catch(() => {
      if (showToast) toast('Yerel Bedesten defteri kullanılıyor.');
    });
}

function postBedestenListing(listing) {
  const list = getBedestenListings();
  list.unshift(listing);
  if (S) S.bedestenListings = list;
  if (typeof mpSendWs === 'function') {
    mpSendWs({ type: 'market_op', op: 'list', action: 'list', listing });
  }
  fetch('/api/market', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'list', action: 'list', listing })
  }).catch(() => {});
}

function removeBedestenListing(id, buyer, price, title, seller) {
  let list = getBedestenListings().filter(x => x.id !== id);
  if (typeof MP !== 'undefined') {
    MP.marketListings = list;
    if (buyer) {
      MP.marketSales = MP.marketSales || [];
      MP.marketSales.unshift({ id: 'ms_' + Date.now(), title, seller, buyer, price, ts: Date.now() });
    }
  }
  if (S) S.bedestenListings = list;
  const opType = buyer ? 'buy' : 'cancel';
  if (typeof mpSendWs === 'function') {
    mpSendWs({ type: 'market_op', op: opType, action: opType, id, buyer: buyer || (S && S.handle) || '@ejder_ocagi' });
  }
  fetch('/api/market', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: opType, action: opType, id, buyer: buyer || (S && S.handle) || '@ejder_ocagi' })
  }).catch(() => {});
}

function bedestenArtFor(L) {
  if (L.cat === 'dragon') {
    const raw = L.dragonData || (L.payload && L.payload.dragon) || {};
    const elKey = raw.el || L.el || 'golge';
    const mock = {
      id: 999,
      name: raw.name || L.title || 'Ejderha',
      el: elKey,
      sex: raw.sex || 'F',
      stage: raw.stage || 'yetiskin',
      eye: raw.eye || 'A',
      horn: raw.horn || 't',
      pat: raw.pat || 'B',
      genes: raw.genes || randomGenes({ el: elKey }),
      equip: {}
    };
    return dragonSVG(mock, { still: true });
  }
  if (L.cat === 'egg') {
    const rawEgg = L.eggData || (L.payload && L.payload.egg) || {};
    const elKey = L.el || rawEgg.el || 'buz';
    return eggSVG({ id: 998, genes: rawEgg.genes || randomGenes({ el: elKey }) }, 0.6, { glow: true });
  }
  if (L.cat === 'equip' || L.cat === 'item') {
    const rawId = L.itemId || (L.payload && L.payload.itemId);
    const itemId = (rawId && ITEMS[rawId]) ? rawId : Object.keys(ITEMS)[0];
    return itemIcon(itemId);
  }
  if (L.cat === 'food') {
    const fk = L.foodKey || (L.payload && L.payload.foodKey) || 'genclik';
    return foodIcon(fk);
  }
  if (L.cat === 'mat') {
    const ic = (L.payload && L.payload.ic) || 'img/ui/items/stone_kor_t2.webp';
    return `<img src="${ic}" alt="" style="width:64px;height:64px;object-fit:contain">`;
  }
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
  const mult = UI.bedMult || 120;
  const myHandle = (S && S.handle) || '@ejder_ocagi';
  const allListings = getBedestenListings();
  const myListings = allListings.filter(x => x.seller === myHandle);
  const netLive = typeof MP !== 'undefined' && (MP.connected || MP.wsConnected);
  const isEquipCat = x => x.cat === 'equip' || x.cat === 'item';

  const tabsHtml = `<div class="vtabs">
    <button class="vtab ${tab === 'vitrini' ? 'on' : ''}" data-a="bed-tab" data-k="vitrini">Canlı Oyuncu İlanları (${allListings.length})</button>
    <button class="vtab ${tab === 'ilanver' ? 'on' : ''}" data-a="bed-tab" data-k="ilanver">Pazara İlan Ver (Satışa Çıkar)</button>
    <button class="vtab ${tab === 'ilanlarim' ? 'on' : ''}" data-a="bed-tab" data-k="ilanlarim">Tezgâhım & Kayıtlar (${myListings.length})</button>
    <button class="vtab" data-a="bed-refresh">Ağı Yenile</button>
  </div>`;

  let bodyHtml = '';

  if (tab === 'vitrini') {
    const filtered = cat === 'tumu' ? allListings : (cat === 'equip' ? allListings.filter(isEquipCat) : allListings.filter(x => x.cat === cat));
    const catBar = `<div class="plaques" style="margin-bottom:4px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="plaque ${cat === 'tumu' ? 'amber on' : ''}" data-a="bed-cat" data-k="tumu">Tümü (${allListings.length})</button>
      <button class="plaque ${cat === 'dragon' ? 'amber on' : ''}" data-a="bed-cat" data-k="dragon">Ejderhalar (${allListings.filter(x => x.cat === 'dragon').length})</button>
      <button class="plaque ${cat === 'egg' ? 'amber on' : ''}" data-a="bed-cat" data-k="egg">Yumurtalar (${allListings.filter(x => x.cat === 'egg').length})</button>
      <button class="plaque ${cat === 'equip' ? 'amber on' : ''}" data-a="bed-cat" data-k="equip">Zırh & Pusat (${allListings.filter(isEquipCat).length})</button>
      <button class="plaque ${cat === 'mat' ? 'amber on' : ''}" data-a="bed-cat" data-k="mat">Cevher, Kalıp & Kor Taşı (${allListings.filter(x => x.cat === 'mat').length})</button>
      <button class="plaque ${cat === 'food' ? 'amber on' : ''}" data-a="bed-cat" data-k="food">İksir & Erzak (${allListings.filter(x => x.cat === 'food').length})</button>
    </div>`;

    const cards = filtered.length
      ? pager('bed-list', filtered, PER(4, 2), L => {
          const isMine = L.seller === myHandle;
          const offerP = Math.max(15, Math.round(L.price * 0.85));
          const offerHtml = L.lastOffer
            ? `<div style="margin-top:3px"><span class="mp-pill wev" style="font-size:10px;padding:1px 6px">Son Teklif: ${esc(L.lastOffer.buyer)} (${L.lastOffer.price}A)</span></div>`
            : (!isMine ? `<div style="margin-top:3px"><button class="btn ghost sm" style="padding:2px 7px;font-size:10.5px" data-a="bed-offer" data-id="${esc(L.id)}">Teklif Ver (%85 · ${offerP}A)</button></div>` : '');
          return gcard({
            cls: 'item t3',
            art: bedestenArtFor(L),
            title: esc(L.title),
            sub: `<span class="tag">${bedestenSellerAvatar(L.seller)}${esc(L.seller)}</span> · <small>${esc(L.guild || 'Bağımsız Ocak')}</small>`,
            body: `<small class="idesc">${esc(L.desc || L.sub || '')}</small>${offerHtml}`,
            price: L.price,
            btn: isMine ? 'Geri Çek' : 'Satın Al',
            btnCls: isMine ? 'ghost' : 'primary',
            act: isMine ? 'bed-cancel' : 'bed-buy',
            data: `data-id="${esc(L.id)}"`
          });
        })
      : `<div class="vempty">Bu kategoride aktif oyuncu ilanı yok. "Pazara İlan Ver" sekmesinden kendi malını satışa çıkarabilirsin.</div>`;

    bodyHtml = catBar + cards;
  } else if (tab === 'ilanver') {
    const sellBar = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <div class="plaques" style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="plaque ${sellCat === 'dragon' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="dragon">Ejderhalarım (${S.dragons.length})</button>
        <button class="plaque ${sellCat === 'egg' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="egg">Yumurtalarım (${S.eggs.length})</button>
        <button class="plaque ${sellCat === 'equip' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="equip">Sandığım (${S.inv.length})</button>
        <button class="plaque ${sellCat === 'mat' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="mat">Cevher, Kalıp & Taş</button>
        <button class="plaque ${sellCat === 'food' ? 'amber' : ''}" data-a="bed-sell-cat" data-k="food">İksir & Kiler</button>
      </div>
      <div class="plaques" style="display:flex;gap:4px;align-items:center">
        <small class="mute">İlan Fiyat Çarpanı:</small>
        <button class="plaque ${mult === 90 ? 'emerald' : ''}" data-a="bed-mult" data-m="90">Hızlı (%90)</button>
        <button class="plaque ${mult === 120 ? 'amber' : ''}" data-a="bed-mult" data-m="120">Piyasa (%120)</button>
        <button class="plaque ${mult === 160 ? 'royal' : ''}" data-a="bed-mult" data-m="160">Nadir (%160)</button>
      </div>
    </div>`;

    let sellCards = '';
    if (sellCat === 'dragon') {
      sellCards = S.dragons.length
        ? pager('bed-sell', S.dragons, PER(4, 2), d => {
            const p = Math.max(80, Math.round(value(d) * (mult / 100)));
            return gcard({
              cls: 'dr own',
              art: dragonSVG(d, { still: true }),
              title: `${esc(d.name)} ${sexIc(d.sex)}`,
              sub: `${elChip(d.el)} ${STAGE_AD[d.stage]}${d.eternalYouth ? ' · <b>Ebedi Yavru</b>' : ''}`,
              body: `<small class="idesc">Güç ${sum(STATS.map(k => (d.st && d.st[k]) || 20))} · Değer ${value(d)} altın</small>`,
              price: p,
              btn: S.dragons.length <= 1 ? 'Son Ejderha' : 'İlana Koy',
              btnCls: S.dragons.length <= 1 ? 'ghost' : 'primary',
              act: 'bed-post-dragon',
              data: `data-id="${d.id}" ${S.dragons.length <= 1 ? 'disabled' : ''}`
            });
          })
        : `<div class="vempty">Ocağında satılabilecek ejderha yok.</div>`;
    } else if (sellCat === 'egg') {
      sellCards = S.eggs.length
        ? pager('bed-sell', S.eggs.map((e, i) => [e, i]), PER(4, 2), ([e, i]) => {
            const p = Math.max(70, Math.round(eggPrice(e) * (mult / 100)));
            const elKey = (e.genes && e.genes.el && e.genes.el[0]) || 'ates';
            return gcard({
              cls: 'egg own',
              art: eggSVG(e, 0.6, { glow: true }),
              title: `Mühürlü ${EL_AD[elKey]} Yumurtası`,
              sub: `${e.inK ? 'Kuluçkada' : 'Sepette'} · ${Math.max(1, 2 - (e.w || 0))} hf`,
              body: `<small class="idesc">Diğer oyunculara satılmak üzere Bedesten vitrinine konur.</small>`,
              price: p,
              btn: 'İlana Koy',
              act: 'bed-post-egg',
              data: `data-i="${i}"`
            });
          })
        : `<div class="vempty">Sepetinde veya kuluçkada satılık yumurta yok.</div>`;
    } else if (sellCat === 'equip') {
      sellCards = S.inv.length
        ? pager('bed-sell', S.inv, PER(4, 2), invIt => {
            const it = ITEMS[invIt.id];
            if (!it) return '';
            const p = Math.max(45, Math.round(smithPrice(invIt.id) * (mult / 100)));
            const w = equippedBy(invIt.uid);
            return gcard({
              cls: 'item own t' + (it.tier || 1),
              art: itemIcon(invIt.id),
              title: esc(it.ad),
              sub: w ? `${esc(w.name)} kuşanıyor` : SLOT_AD[it.slot],
              body: `<small class="idesc">${itemDesc(it)}</small>`,
              price: p,
              btn: 'İlana Koy',
              act: 'bed-post-item',
              data: `data-uid="${invIt.uid}"`
            });
          })
        : `<div class="vempty">Sandığında satılık ekipman yok.</div>`;
    } else if (sellCat === 'mat') {
      const C = typeof ensureChibi === 'function' ? ensureChibi() : null;
      const matEntries = [];
      if (C) {
        if (window.CHIBI_SHARDS && C.shards) {
          for (const [k, meta] of Object.entries(window.CHIBI_SHARDS)) {
            if ((C.shards[k] || 0) > 0) matEntries.push({ kind: 'shard', k, qty: C.shards[k], meta });
          }
        }
        if (window.CHIBI_ORES && C.ores) {
          for (const [k, meta] of Object.entries(window.CHIBI_ORES)) {
            if ((C.ores[k] || 0) > 0) matEntries.push({ kind: 'ore', k, qty: C.ores[k], meta });
          }
        }
        if (window.CHIBI_STONES && C.stones) {
          for (const [k, meta] of Object.entries(window.CHIBI_STONES)) {
            if ((C.stones[k] || 0) > 0) matEntries.push({ kind: 'stone', k, qty: C.stones[k], meta });
          }
        }
        if (window.CHIBI_ESSENCES && C.essences) {
          for (const [k, meta] of Object.entries(window.CHIBI_ESSENCES)) {
            if ((C.essences[k] || 0) > 0) matEntries.push({ kind: 'essence', k, qty: C.essences[k], meta });
          }
        }
      }
      sellCards = matEntries.length
        ? pager('bed-sell', matEntries, PER(4, 2), m => {
            const p = Math.max(25, Math.round((m.meta.basePrice || 100) * (mult / 100)));
            return gcard({
              cls: 'item own t3',
              art: `<img src="${m.meta.ic}" alt="" style="width:64px;height:64px;object-fit:contain">`,
              title: `${esc(m.meta.ad)} (Stok: ${m.qty})`,
              sub: 'Dökümhane & Kor Örsü Materyali',
              body: `<small class="idesc">${esc(m.meta.d || '')}</small>`,
              price: p,
              btn: '1 Adet İlana Koy',
              act: 'bed-post-mat',
              data: `data-kind="${m.kind}" data-k="${m.k}"`
            });
          })
        : `<div class="vempty">Çantanda satılabilecek Kalıp Parçası, Kervan Cevheri veya Kor Taşı yok.</div>`;
    } else {
      const foodKeys = Object.keys(FOODS).filter(fk => (S.food[fk] || 0) > 0);
      sellCards = foodKeys.length
        ? pager('bed-sell', foodKeys, PER(4, 2), fk => {
            const F = FOODS[fk];
            const p = Math.max(20, Math.round(F.fiyat * (mult / 100)));
            return gcard({
              cls: 'food own',
              art: foodIcon(fk),
              title: `${esc(F.ad)} (Stok: ${S.food[fk]})`,
              sub: 'Kiler Erzağı & İksir',
              body: `<small class="idesc">${esc(F.acik || (F.onlyBaby ? 'Sadece Yavrular İçebilir · Topçu Silahı' : `Açlık -${F.ac || 25}${F.bag ? ` · Bağ +${F.bag}` : ''}`))}</small>`,
              price: p,
              btn: 'İlana Koy',
              act: 'bed-post-food',
              data: `data-f="${fk}"`
            });
          })
        : `<div class="vempty">Kilerinde satılabilecek yem veya iksir yok.</div>`;
    }

    bodyHtml = sellBar + sellCards;
  } else {
    const sales = (typeof MP !== 'undefined' && Array.isArray(MP.marketSales)) ? MP.marketSales.slice(0, 3) : [];
    const salesSummary = sales.length
      ? `<div class="plaques" style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap">${sales.map(s => `<span class="mp-pill on">${esc(s.buyer)} → ${esc(s.title)} (${s.price} Altın)</span>`).join('')}</div>`
      : `<div class="plaques" style="margin-bottom:8px"><span class="mp-pill wev">Canlı Bedesten: İlanların bağlı tüm oyuncuların ekranında anında görünür.</span></div>`;

    const mineCards = myListings.length
      ? pager('bed-mine', myListings, PER(4, 2), L => gcard({
          cls: 'item own t3',
          art: bedestenArtFor(L),
          title: esc(L.title),
          sub: L.lastOffer ? `Canlı Teklif: <b>${esc(L.lastOffer.buyer)}</b> (${L.lastOffer.price} Altın)` : `Senin İlanın · Fiyat: ${L.price} Altın`,
          body: `<small class="idesc">${esc(L.desc || '')}</small><div style="margin-top:4px"><button class="btn ghost sm" data-a="bed-cancel" data-id="${esc(L.id)}">İlanı Geri Çek</button></div>`,
          price: L.lastOffer ? L.lastOffer.price : L.price,
          btn: L.lastOffer ? 'Teklifi Kabul' : 'Anında Sat',
          btnCls: 'primary',
          act: 'bed-sim-sale',
          data: `data-id="${esc(L.id)}"`
        }))
      : `<div class="vempty">Henüz aktif bir ilanın yok. "Pazara İlan Ver" sekmesinden ejderha, yumurta, zırh veya iksir satışa çıkarabilirsin.</div>`;

    bodyHtml = salesSummary + mineCards;
  }

  const npcBed = asset('npc-bedesten') || 'img/npc-bedesten.webp';
  const bannerBed = asset('bedesten-banner') || 'img/ui/bedesten-banner.webp';
  return `<div class="vendor v-bedesten">
    <p role="status">Bedesten alım, satım ve ilan işlemleri güvenli sunucu aktarımı tamamlanana kadar kapalı.</p>
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
        <p id="vsay" style="margin:0">${esc(UI.vsay || 'Kervansaray Bedesteni\'nde tüm ocaklar kendi yetiştirdiği ejderhaları, mühürlü yumurtaları, dövdüğü zırhları ve gençlik iksirlerini doğrudan diğer oyunculara satar veya canlı pazarlık teklifi gönderir!')}</p>
      </div>
      <div class="vcounter">
        ${tabsHtml}
        <div class="vgoods">${bodyHtml}</div>
        <div class="vfoot">
          <span>${ui('gold')} Kesende <b>${S.gold}</b> altın</span>
          <span>Aktif İlan: <b>${allListings.length}</b> · Senin İlanın: <b>${myListings.length}</b></span>
          <span>İnlerde Boş Yer: <b>${freeSlots()}</b></span>
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
