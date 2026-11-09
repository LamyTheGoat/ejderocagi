/* ═══════════════════════════════════════════════════════════════════════
   ÇANTA / ENVANTER MODALI  +  SOSYAL & PARTİ SİSTEMİ
   (hud() içindeki hudBagSocialHtml / partyBarHtml, net.js içindeki socialOnNet,
    shm_ui / shm_pvp lobi eşitlemeleri ve hub.js meydan kartı bu dosyaya bağlanır)
   ═══════════════════════════════════════════════════════════════════════ */

/* ───────────────────────── ORTAK YARDIMCILAR ───────────────────────── */
const SOC_MAX_PARTY = 4;
const SOC_MAX_FRIENDS = 30;
const SOC_UI = { open: false, tab: 'friends', dmWith: null, vsFor: null, pick: null, draft: { add: '', dm: '' } };

function socMe() { return (typeof S !== 'undefined' && S && S.handle) || '@ejder_ocagi'; }
function socHash(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
function socEsc(s) { return typeof esc === 'function' ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s); }

function ensureSocial() {
  if (typeof S === 'undefined' || !S) return null;
  if (!S.social || typeof S.social !== 'object') S.social = {};
  const s = S.social;
  if (!Array.isArray(s.friends)) s.friends = [{ handle: '@leydi_sureyya', ts: 0 }, { handle: '@kuzey_ruzgari', ts: 0 }];
  if (!s.dms || typeof s.dms !== 'object') s.dms = {};
  if (!s.unread || typeof s.unread !== 'object') s.unread = {};
  if (!Array.isArray(s.invites)) s.invites = [];
  if (s.party && (!Array.isArray(s.party.members) || !s.party.members.length)) s.party = null;
  if (!s.party) s.party = null;
  if (typeof s.partyVer !== 'number') s.partyVer = 0;
  return s;
}

function socFindPeer(h) {
  if (typeof ensureHub !== 'function') return null;
  const H = ensureHub();
  const i = (H.peers || []).findIndex(p => p.handle === h);
  return i >= 0 ? { peer: H.peers[i], idx: i } : null;
}

function socDragonFc(d) {
  if (!d || !d.st) return 0;
  return Math.round(((d.st.gu || 0) + (d.st.ce || 0) + (d.st.da || 0) + (d.st.ze || 0)) * 4.5 + (d.w || 0) * 35 + (d.bond || 0) * 3);
}

/** Bir kullanıcı için (arkadaş / parti üyesi) görüntü bilgisi üretir. */
function socInfo(h, member) {
  const me = socMe();
  if (h === me) {
    const star = (typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]) || null;
    const C = typeof ensureChibi === 'function' ? ensureChibi() : null;
    return {
      handle: h, self: true, live: true, real: false,
      guild: S.guild || 'Kızıl Ocak Birliği', chibi: C, dragon: star ? star.name : 'Ejder', el: star ? star.el : 'ates',
      fc: typeof calcChibiStats === 'function' ? calcChibiStats().totalFc : 0, peer: null, idx: 0,
    };
  }
  const f = socFindPeer(h);
  const peer = f && f.peer;
  const idx = f ? f.idx : socHash(h) % 5;
  let chibi = (member && member.chibi) || (peer && peer.chibi) || null;
  if (!chibi && typeof peerChibiConfig === 'function') chibi = peerChibiConfig({ handle: h, name: h }, idx);
  let fc = member && member.fc ? member.fc : 0;
  if (!fc && chibi && typeof calcChibiStats === 'function') {
    try { fc = calcChibiStats(chibi).eqFc + socDragonFc(peer && peer.d); } catch (e) { fc = 0; }
  }
  return {
    handle: h, self: false, live: !!(peer && peer.isLive), real: !!(peer && peer.isLive),
    guild: (peer && peer.guild) || (member && member.guild) || 'Gezgin Ocak', chibi,
    dragon: (peer && peer.d && peer.d.name) || (member && member.dragon) || 'Ejder',
    el: (peer && peer.d && peer.d.el) || 'ates', fc: fc || 0, peer, idx,
  };
}

function socStatus(h) {
  const info = socInfo(h);
  if (info.live) return { k: 'meydan', t: '🟢 Meydanda' };
  if (typeof KIR !== 'undefined' && KIR && KIR.oppHandle === h && typeof UI !== 'undefined' && UI.view === 'meydan') return { k: 'kir', t: '🎲 Kıraathanede' };
  const pool = [
    { k: 'meydan', t: '🟢 Meydanda' }, { k: 'zindan', t: '⚔️ Zindan Lobisinde' },
    { k: 'topcu', t: '🎯 Topçu Meydanında' }, { k: 'kir', t: '🎲 Kıraathanede' },
  ];
  return pool[socHash(h + ':' + ((S && S.week) || 1)) % pool.length];
}

function socHead(info) {
  const doll = typeof renderChibiDoll === 'function' && info.chibi ? renderChibiDoll(info.chibi, { cls: 'soc-doll', hideAura: true }) : '';
  return `<span class="soc-head">${doll}</span>`;
}

function socSend(obj) {
  if (typeof mpSendWs === 'function') mpSendWs(Object.assign({ from: socMe() }, obj));
}

function socNotifyCount() {
  const s = ensureSocial();
  if (!s) return 0;
  return Object.values(s.unread).reduce((a, b) => a + (b || 0), 0) + s.invites.length;
}

function socPartyOthers() {
  const s = ensureSocial();
  if (!s || !s.party) return [];
  const me = socMe();
  return s.party.members.filter(m => m.handle !== me);
}

function socRefresh() {
  socRender();
  if (typeof render === 'function' && typeof UI !== 'undefined' && !(typeof SHM !== 'undefined' && SHM.open)) render();
}

/* ───────────────────────── HUD: ÇANTA + SOSYAL + MİNİ PARTİ ÇUBUĞU ───────────────────────── */
function hudBagSocialHtml() {
  const n = typeof S !== 'undefined' && S ? socNotifyCount() : 0;
  return `<button class="hud-bag-btn" data-a="bag-open" title="Çanta / Envanter" aria-label="Çanta">🎒 <b>Çanta</b></button>`
    + `<button class="hud-soc-btn" data-a="social-drawer-open" title="Arkadaşlar, Parti ve Mesajlar" aria-label="Sosyal">👥 <b>Sosyal</b>${n ? ' <i class="soc-dot" title="Okunmamış mesaj / davet">🔴</i>' : ''}</button>`;
}

function partyBarHtml() {
  const s = typeof S !== 'undefined' && S ? ensureSocial() : null;
  if (!s || !s.party) return '';
  const me = socMe();
  const isLeader = s.party.leader === me;
  const chips = s.party.members.map(m => {
    const info = socInfo(m.handle, m);
    return `<div class="soc-pchip ${info.self ? 'self' : ''}" title="${socEsc(info.guild)}">
      ${socHead(info)}
      <span class="soc-pchip-txt"><b>${socEsc(m.handle)}${m.handle === s.party.leader ? ' 👑' : ''}</b><small>🐉 ${socEsc(info.dragon)} · ⚔️ ${info.fc}</small></span>
      ${isLeader && !info.self ? `<button class="soc-x" data-a="soc-party-kick" data-h="${socEsc(m.handle)}" title="Partiden Çıkar">✕</button>` : ''}
    </div>`;
  }).join('');
  return `<div class="soc-partybar">
    <span class="soc-pb-title">🛡️ Parti (${s.party.members.length}/${SOC_MAX_PARTY})</span>
    ${chips}
    ${isLeader
      ? `<button class="btn xs ghost" data-a="soc-party-disband">Partiyi Dağıt</button>`
      : `<button class="btn xs ghost" data-a="soc-party-leave">Partiden Ayrıl</button>`}
  </div>`;
}

/* ───────────────────────── 🎒 ÇANTA / ENVANTER MODALI ───────────────────────── */
function bagModal() {
  UI.modalRedraw = bagModal;
  const C = ensureChibi();
  const food = S.food || {};
  const stones = C.stones || {};
  const ores = C.ores || {};
  const shards = C.shards || {};
  const ess = C.essences || {};

  const cell = (ic, name, cnt, extra) => `
    <div class="bag-cell ${cnt > 0 ? '' : 'zero'}" ${extra ? `title="${socEsc(extra)}"` : ''}>
      ${ic ? `<img src="${ic}" alt="">` : '<span class="bag-ic">📦</span>'}
      <span class="bag-nm">${socEsc(name)}</span>
      <b class="bag-cnt">${cnt}</b>
    </div>`;

  const forge = [
    cell(CHIBI_STONES.kor_t1.ic, 'Kıvılcım Kor Taşı (T1)', stones.kor_t1 || 0, CHIBI_STONES.kor_t1.d),
    cell(CHIBI_STONES.kor_t2.ic, 'Harlı Kor Taşı (T2)', stones.kor_t2 || 0, CHIBI_STONES.kor_t2.d),
    cell(CHIBI_STONES.kor_t3.ic, 'Kadim Magma Taşı (T3)', stones.kor_t3 || 0, CHIBI_STONES.kor_t3.d),
    cell(CHIBI_STONES.anka_koruma.ic, 'Anka Mühür Taşı', stones.anka_koruma || 0, CHIBI_STONES.anka_koruma.d),
    cell(CHIBI_ESSENCES.kiyamet_ozu.ic, 'Kıyamet Özü', ess.kiyamet_ozu || 0, CHIBI_ESSENCES.kiyamet_ozu.d),
  ].join('');

  const foundry = [
    cell(CHIBI_ORES.obsidiyen.ic, 'Obsidiyen', ores.obsidiyen || 0, CHIBI_ORES.obsidiyen.d),
    cell(CHIBI_ORES.kehribar.ic, 'Donmuş Kehribar', ores.kehribar || 0, CHIBI_ORES.kehribar.d),
    cell(CHIBI_ORES.mercan.ic, 'Derin Mercan', ores.mercan || 0, CHIBI_ORES.mercan.d),
    cell(CHIBI_ORES.yildirim.ic, 'Yıldırım Kuvarsı', ores.yildirim || 0, CHIBI_ORES.yildirim.d),
    cell(CHIBI_SHARDS.sahmeran_kalip.ic, `Şahmeran Sırça Kalıbı (${shards.sahmeran_kalip || 0} adet)`, shards.sahmeran_kalip || 0),
    cell(CHIBI_SHARDS.kalgarot_kalip.ic, `Kalgarot Kor Kalıbı (${shards.kalgarot_kalip || 0} adet)`, shards.kalgarot_kalip || 0),
    cell(CHIBI_SHARDS.abra_kalip.ic, `Abra Derya Kalıbı (${shards.abra_kalip || 0} adet)`, shards.abra_kalip || 0),
  ].join('');

  const foodKeys = ['balik', 'biber', 'kar', 'mantar', 'yumru', 'zambak', 'ziyafet', 'genclik'];
  const pantry = foodKeys.map(k => {
    const F = (typeof FOODS !== 'undefined' && FOODS[k]) || { ad: k };
    const nm = k === 'genclik' ? 'Ebedi Gençlik İksiri' : F.ad;
    return cell(null, nm, food[k] || 0, F.d || '');
  }).join('');

  const inv = Array.isArray(S.inv) ? S.inv : [];
  const gearHtml = inv.length ? inv.map(i => {
    const it = (typeof ITEMS !== 'undefined' && ITEMS[i.id]) || { ad: i.id, slot: '?' };
    const owner = (S.dragons || []).find(d => d.equip && Object.values(d.equip).includes(i.uid));
    return `<div class="bag-gear"><b>${socEsc(it.ad)}</b><small>${socEsc(it.slot || '')} · ${owner ? '🐉 ' + socEsc(owner.name) + ' kuşandı' : 'Sandıkta (boşta)'}</small></div>`;
  }).join('') : '<p class="mute sm">Koşum sandığın boş. Çarşıdan ejderha ekipmanı alabilirsin.</p>';

  const eggs = Array.isArray(S.eggs) ? S.eggs : [];
  const eggHtml = eggs.length ? eggs.map(e => {
    const el = (e.genes && e.genes.el && e.genes.el[0]) || e.el || 'ates';
    const elName = (typeof EL_AD !== 'undefined' && EL_AD[el]) || el;
    return `<div class="bag-gear egg"><b>🥚 ${socEsc(elName)} Yumurtası</b><small>${e.sex === 'M' ? '♂' : '♀'} · ${e.inK ? 'Kuluçkada' : 'Bekliyor'}${e.origin ? ' · ' + socEsc(e.origin) : ''}</small></div>`;
  }).join('') : '<p class="mute sm">Bekleyen yumurta yok.</p>';

  showModal(`
    <div class="mhead">
      <div><span class="kicker">Ocak Envanteri</span><h2>🎒 Çanta</h2></div>
      <button class="btn sm primary bag-sandik-link" data-open-sandik aria-label="Ocak Sandığı'nı aç: sunucu envanteri">🧰 Ocak Sandığı'nı aç</button>
      <button class="btn sm ghost bag-eco-link" data-a="eco-status" aria-label="Sunucu kesesi: hafta ve borç">⚖ ${(typeof ECO_SYNC !== 'undefined' && ECO_SYNC.purseName ? ECO_SYNC.purseName() : 'Ocak Kesesi')}</button>
      <button class="mclose" data-a="mclose" aria-label="Kapat">${typeof ui === 'function' ? ui('x') : '×'}</button>
    </div>
    <div class="bag-grid">
      <section class="bag-sec">
        <div class="bag-sec-head"><h3>🔥 Demirci & Kor Taşları</h3><button class="btn sm primary" data-a="go-usta-kerim" data-tab="ors">🔨 Kor Örsüne Git</button></div>
        <div class="bag-cells">${forge}</div>
      </section>
      <section class="bag-sec">
        <div class="bag-sec-head"><h3>💎 Kervan Cevherleri & Zindan Kalıpları</h3><button class="btn sm primary" data-a="go-usta-kerim" data-tab="dokum">⚒️ Dökümhaneye Git</button></div>
        <div class="bag-cells">${foundry}</div>
      </section>
      <section class="bag-sec">
        <div class="bag-sec-head"><h3>🍖 Kiler & İksirler</h3><button class="btn sm primary" data-a="bag-go-ahir">🐉 Ahırda İkram Et</button></div>
        <div class="bag-cells">${pantry}</div>
      </section>
      <section class="bag-sec">
        <div class="bag-sec-head"><h3>🛡️ Ejderha Koşum Sandığı & Yumurtalar</h3></div>
        <div class="bag-gears">${gearHtml}</div>
        <div class="bag-gears">${eggHtml}</div>
      </section>
    </div>
  `, 'paper wide bag-modal');
}

/* ───────────────────────── SOSYAL ÇEKMECE (Drawer) ───────────────────────── */
function socRoot() {
  let r = document.getElementById('soc-root');
  if (!r) { r = document.createElement('div'); r.id = 'soc-root'; document.body.appendChild(r); }
  return r;
}

// ENG-11: oyuncular arası takas yalnız buradan ve oyuncu profilinden başlar (NPC muhafızlarla sunucu takası yok).
function socCanTrade(h) { return typeof TRADE_UI !== 'undefined' && TRADE_UI.isTradeable(h) && h !== socMe(); }

function socFriendRow(f) {
  const info = socInfo(f.handle);
  const st = socStatus(f.handle);
  const un = ensureSocial().unread[f.handle] || 0;
  const hh = socEsc(f.handle);
  return `
    <div class="soc-frow">
      ${socHead(info)}
      <div class="soc-fmain">
        <b>${hh}</b><small>${socEsc(info.guild)}</small>
        <small class="soc-st ${st.k}">${st.t}</small>
        <small>⚔️ Kudret <b>${info.fc}</b> · 🐉 ${socEsc(info.dragon)}</small>
      </div>
      <div class="soc-fbtns">
        <button class="btn xs primary" data-a="soc-dm-open" data-h="${hh}">💬 Mesaj${un ? ` (${un})` : ''}</button>
        <button class="btn xs" data-a="soc-party-invite" data-h="${hh}">🛡️ Partiye Çağır</button>
        <button class="btn xs" data-a="soc-table-invite" data-h="${hh}">🎲 Masaya Çağır</button>
        ${socCanTrade(f.handle) ? `<button class="btn xs" data-trade-with="${hh}" aria-label="${hh} ile takas teklif et">⇄ Takas teklif et</button>` : ''}
        <button class="btn xs danger" data-a="soc-vs-menu" data-h="${hh}">⚔️ VS Çağır</button>
        <button class="soc-x" data-a="soc-friend-del" data-h="${hh}" title="Arkadaşlıktan çıkar">✕</button>
      </div>
      ${SOC_UI.vsFor === f.handle ? `
        <div class="soc-vsmenu">
          <button class="btn sm primary" data-a="soc-vs-topcu" data-h="${hh}">🎯 1v1 Ejder Topçusu Düellosu</button>
          <button class="btn sm primary" data-a="soc-vs-duel" data-h="${hh}">🐉 1v1 Er Meydanı Ejderha Düellosu</button>
          ${socRankedDuelBtn(hh)}
        </div>` : ''}
    </div>`;
}

function socPeerSuggestions() {
  const s = ensureSocial();
  const H = typeof ensureHub === 'function' ? ensureHub() : { peers: [] };
  const known = new Set(s.friends.map(f => f.handle));
  return (H.peers || []).filter(p => p.handle !== socMe() && !known.has(p.handle));
}

function socFriendsTab() {
  const s = ensureSocial();
  const sug = socPeerSuggestions();
  return `
    <div class="soc-addbox">
      <input id="soc-add-in" placeholder="@mahlas yaz…" maxlength="24" value="${socEsc(SOC_UI.draft.add)}">
      <button class="btn sm primary" data-a="soc-add-friend">➕ Arkadaş Ekle</button>
    </div>
    <div class="soc-list">
      ${s.friends.length ? s.friends.map(socFriendRow).join('') : '<p class="mute sm">Henüz arkadaşın yok. Mahlas yazarak veya Meydan\'daki oyunculardan ekleyebilirsin.</p>'}
    </div>
    ${sug.length ? `
      <h4 class="soc-sub">Meydandaki Oyuncular</h4>
      <div class="soc-list">
        ${sug.map(p => {
          const info = socInfo(p.handle);
          return `<div class="soc-frow slim">${socHead(info)}<div class="soc-fmain"><b>${socEsc(p.handle)}</b><small>${socEsc(p.guild || '')} · ⚔️ ${info.fc}${p.isLive ? ' · 🟢 Canlı' : ''}</small></div>
            <button class="btn xs primary" data-a="soc-add-peer" data-h="${socEsc(p.handle)}">➕ Arkadaş Ekle</button></div>`;
        }).join('')}
      </div>` : ''}`;
}

function socPartyTab() {
  const s = ensureSocial();
  if (!s.party) return `<div class="soc-empty"><p>🛡️ Henüz bir partin yok.</p><p class="mute sm">Arkadaş listesinden <b>🛡️ Partiye Çağır</b> diyerek en fazla ${SOC_MAX_PARTY} kişilik parti kur. Parti üyeleri Zindan, Kervan ve Topçu lobilerine otomatik yerleşir.</p></div>`;
  const me = socMe();
  const isLeader = s.party.leader === me;
  return `<div class="soc-list">${s.party.members.map(m => {
    const info = socInfo(m.handle, m);
    return `<div class="soc-frow">${socHead(info)}
      <div class="soc-fmain"><b>${socEsc(m.handle)}${m.handle === s.party.leader ? ' 👑' : ''}${info.self ? ' (Sen)' : ''}</b><small>${socEsc(info.guild)}</small><small>🐉 ${socEsc(info.dragon)} · ⚔️ ${info.fc}</small></div>
      ${isLeader && !info.self ? `<button class="btn xs danger" data-a="soc-party-kick" data-h="${socEsc(m.handle)}">Partiden Çıkar</button>` : ''}
    </div>`;
  }).join('')}</div>
  <div class="soc-addbox">${isLeader ? '<button class="btn sm danger" data-a="soc-party-disband">Partiyi Dağıt</button>' : '<button class="btn sm ghost" data-a="soc-party-leave">Partiden Ayrıl</button>'}</div>`;
}

function socDmTab() {
  const s = ensureSocial();
  if (!SOC_UI.dmWith) {
    const convs = s.friends.map(f => ({ f, log: s.dms[f.handle] || [] })).sort((a, b) => ((b.log[b.log.length - 1] || {}).ts || 0) - ((a.log[a.log.length - 1] || {}).ts || 0));
    return `<div class="soc-list">${convs.map(({ f, log }) => {
      const info = socInfo(f.handle);
      const last = log[log.length - 1];
      const un = s.unread[f.handle] || 0;
      return `<div class="soc-frow slim" data-a="soc-dm-open" data-h="${socEsc(f.handle)}" style="cursor:pointer">${socHead(info)}
        <div class="soc-fmain"><b>${socEsc(f.handle)}${un ? ` <em class="soc-badge">${un}</em>` : ''}</b><small>${last ? socEsc((last.from === socMe() ? 'Sen: ' : '') + last.text).slice(0, 60) : 'Henüz mesaj yok'}</small></div></div>`;
    }).join('') || '<p class="mute sm">Önce arkadaş ekle.</p>'}</div>`;
  }
  const h = SOC_UI.dmWith;
  const info = socInfo(h);
  const log = s.dms[h] || [];
  const hh = socEsc(h);
  return `
    <div class="soc-chathead">
      <button class="btn xs ghost" data-a="soc-dm-back">◀</button>
      ${socHead(info)}<div class="soc-fmain"><b>${hh}</b><small class="soc-st ${socStatus(h).k}">${socStatus(h).t}</small></div>
    </div>
    <div class="soc-chatquick">
      <button class="btn xs" data-a="soc-party-invite" data-h="${hh}">🛡️ Partiye Davet Et</button>
      <button class="btn xs" data-a="soc-table-invite" data-h="${hh}">🎲 Masaya Çağır</button>
      <button class="btn xs danger" data-a="soc-vs-menu" data-h="${hh}">⚔️ VS Düelloya Çağır</button>
    </div>
    ${SOC_UI.vsFor === h ? `<div class="soc-vsmenu">
      <button class="btn sm primary" data-a="soc-vs-topcu" data-h="${hh}">🎯 1v1 Ejder Topçusu Düellosu</button>
      <button class="btn sm primary" data-a="soc-vs-duel" data-h="${hh}">🐉 1v1 Er Meydanı Ejderha Düellosu</button>
      ${socRankedDuelBtn(hh)}</div>` : ''}
    <div class="soc-chatlog" id="soc-chatlog">
      ${log.length ? log.map(m => `<div class="soc-msg ${m.from === socMe() ? 'me' : 'them'}"><span>${socEsc(m.text)}</span></div>`).join('') : '<p class="mute sm">Fısıltı başlat: "selam", "zindan", "vs", "tavla", "kervan", "takas" yazabilirsin.</p>'}
    </div>
    <div class="soc-addbox"><input id="soc-dm-in" placeholder="Mesaj yaz…" maxlength="160" value="${socEsc(SOC_UI.draft.dm)}"><button class="btn sm primary" data-a="soc-dm-send">Gönder</button></div>`;
}

function socInvitesHtml() {
  const s = ensureSocial();
  if (!s || !s.invites.length) return '';
  return `<div class="soc-invites">${s.invites.map(inv => {
    const label = inv.kind === 'party' ? `🛡️ Parti Daveti: <b>${socEsc(inv.from)}</b> seni partisine çağırıyor!`
      : inv.kind === 'table' ? `🎲 Masa Daveti: <b>${socEsc(inv.from)}</b> seni Kervansaray Kıraathanesi'ne çağırıyor!`
      : inv.kind === 'vs_topcu' ? `🎯 VS Daveti: <b>${socEsc(inv.from)}</b> seni 1v1 Ejder Topçusu Düellosuna çağırıyor!`
      : inv.ranked ? `🏆 Ödüllü Düello Daveti: <b>${socEsc(inv.from)}</b> seni ödüllü düelloya çağırıyor. Sunucu ejderhanla girersin; ödül sunucuda belirlenir.`
      : `🐉 VS Daveti: <b>${socEsc(inv.from)}</b> seni Er Meydanı Ejderha Düellosuna çağırıyor!`;
    return `<div class="soc-invite"><span>${label}</span><div><button class="btn xs primary" data-a="soc-invite-accept" data-id="${socEsc(inv.id)}">Kabul Et</button><button class="btn xs ghost" data-a="soc-invite-reject" data-id="${socEsc(inv.id)}">Reddet</button></div></div>`;
  }).join('')}</div>`;
}

function socPickerHtml() {
  if (!SOC_UI.pick) return '';
  const s = ensureSocial();
  const title = SOC_UI.pick.startsWith('table') ? 'Masaya kimi çağıralım?' : 'Lobiye kimi çağıralım?';
  return `<div class="soc-pick-scrim"><div class="soc-pick">
    <div class="soc-pick-head"><b>📩 ${title}</b><button class="soc-x" data-a="soc-pick-cancel">✕</button></div>
    <div class="soc-list">${s.friends.length ? s.friends.map(f => {
      const info = socInfo(f.handle);
      return `<div class="soc-frow slim">${socHead(info)}<div class="soc-fmain"><b>${socEsc(f.handle)}</b><small>${socStatus(f.handle).t} · ⚔️ ${info.fc}</small></div><button class="btn xs primary" data-a="soc-pick-choose" data-h="${socEsc(f.handle)}">Seç</button></div>`;
    }).join('') : '<p class="mute sm">Arkadaş listen boş.</p>'}</div>
  </div></div>`;
}

function socRender() {
  if (typeof document === 'undefined' || !document.body || typeof S === 'undefined' || !S) return;
  const root = socRoot();
  const addIn = document.getElementById('soc-add-in');
  const dmIn = document.getElementById('soc-dm-in');
  if (addIn) SOC_UI.draft.add = addIn.value;
  if (dmIn) SOC_UI.draft.dm = dmIn.value;
  const s = ensureSocial();
  const tabs = [['friends', `Arkadaşlar (${s.friends.length})`], ['party', `Parti${s.party ? ` (${s.party.members.length}/${SOC_MAX_PARTY})` : ''}`], ['dm', `Mesajlar${Object.values(s.unread).reduce((a, b) => a + (b || 0), 0) ? ' 🔴' : ''}`]];
  const body = SOC_UI.tab === 'party' ? socPartyTab() : SOC_UI.tab === 'dm' ? socDmTab() : socFriendsTab();
  root.innerHTML = `
    ${socInvitesHtml()}
    ${SOC_UI.open ? `
      <aside class="soc-drawer">
        <div class="soc-dhead"><h3>👥 Sosyal & Parti</h3><button class="soc-x big" data-a="social-drawer-close" aria-label="Kapat">✕</button></div>
        <div class="soc-tabs">${tabs.map(([k, l]) => `<button class="soc-tab ${SOC_UI.tab === k ? 'on' : ''}" data-a="soc-tab" data-t="${k}">${l}</button>`).join('')}</div>
        <div class="soc-dbody">${body}</div>
      </aside>` : ''}
    ${socPickerHtml()}`;
  const log = document.getElementById('soc-chatlog');
  if (log) log.scrollTop = log.scrollHeight;
}

/* ───────────────────────── EYLEMLER: arkadaş / DM / parti ───────────────────────── */
function socAddFriend(handle) {
  const s = ensureSocial();
  if (!handle || handle === socMe()) { toast('Kendini arkadaş ekleyemezsin.'); return false; }
  if (s.friends.some(f => f.handle === handle)) { toast(`${socEsc(handle)} zaten arkadaş listende.`); return false; }
  if (s.friends.length >= SOC_MAX_FRIENDS) { toast(`En fazla ${SOC_MAX_FRIENDS} arkadaş ekleyebilirsin.`); return false; }
  s.friends.push({ handle, ts: Date.now() });
  if (typeof SFX !== 'undefined') SFX.play('coin');
  toast(`<b>➕ ${socEsc(handle)}</b> arkadaş listene eklendi!`);
  if (typeof saveGame === 'function') saveGame();
  return true;
}

const SOC_STYLES = {
  '@leydi_sureyya': {
    selam: 'Selam, sevgili terbiyeci! Meydan bugün ne kadar şen.', zindan: 'Zindanda şifacı lazımsa Şahmeran hazır, sancağını bekliyorum.', vs: 'Düello mu? Zarafetle kaybetmeye hazır ol!',
    tavla: 'Kıraathanede bir tavla? Düşeşi bana saklarım.', kervan: 'Kervan yolunda ipekler benden, korumak senden.', takas: 'Takas için Bedesten\'e uğra, güzel şeylerim var.', parti: 'Partiye girerim, bir çay içeriz sonra.', def: 'Hmm, ince bir söz bu. Biraz daha anlat bakalım.',
  },
  '@kuzey_ruzgari': {
    selam: 'Selam.', zindan: 'Zindan. Tamam. Buz hazır.', vs: 'VS. Bora susmaz, sen de hazırlan.', tavla: 'Tavla. Zar atarım, konuşmam.',
    kervan: 'Kervan Buzul Geçidi\'nden geçerse haber ver.', takas: 'Cevher varsa takas. Fazla laf yok.', parti: 'Partiye gelirim.', def: 'Anlaşıldı.',
  },
  '@altin_kervan': {
    selam: 'Selam dostum! Altın akıyor, kervan yürüyor!', zindan: 'Zindandan çıkan kalıplara iyi fiyat veririm!', vs: 'VS mi? Bahsi artırırsak hay hay!', tavla: 'Tavla mı? Bahis 50 altın, kabul mü?',
    kervan: 'Kervan dediysen ben buradayım, cevher bol!', takas: 'Takas benim işim! Önce sen göster.', parti: 'Parti kurulursa kervanı da getiririm!', def: 'Her söz bir pazarlıktır dostum.',
  },
  '@firtina_beyi': {
    selam: 'Selam, rüzgâr seni getirdi!', zindan: 'Zindanda yıldırım nişancısı lazım mı? Geliyorum!', vs: 'VS! Gökbörü hazır, rüzgâr bizden yana!', tavla: 'Tavla? Zarlar rüzgâr gibi uçar!',
    kervan: 'Fırtına Boğazı\'nda kervan koruruz!', takas: 'Takas olur, ama hızlı olsun!', parti: 'Partiye uçarım!', def: 'Rüzgâr ne fısıldadı, anlamadım ama güzeldi!',
  },
  default: {
    selam: 'Selam! Hoş geldin.', zindan: 'Zindan mı? Gelirim, sancağını bekle.', vs: 'VS için hazırım!', tavla: 'Tavla olur, Kıraathane\'de buluşalım.',
    kervan: 'Kervan seferine varım.', takas: 'Takas için Meydan\'da buluşalım.', parti: 'Partiye katılırım!', def: 'Anladım dostum, bir ara konuşalım.',
  },
};

function socSimReply(handle, text) {
  const st = SOC_STYLES[handle] || SOC_STYLES.default;
  const t = String(text || '').toLowerCase();
  let k = 'def';
  if (/zindan|baskın|boss|abra|kalgarot/.test(t)) k = 'zindan';
  else if (/selam|merhaba|naber|slm/.test(t)) k = 'selam';
  else if (/\bvs\b|düello|duello|dövüş|kapış/.test(t)) k = 'vs';
  else if (/tavla|masa|kıraathane|poker|blackjack|kor 21|zar/.test(t)) k = 'tavla';
  else if (/kervan|cevher|yol/.test(t)) k = 'kervan';
  else if (/takas|bedesten|alım|satım|sat/.test(t)) k = 'takas';
  else if (/parti|davet|ekip/.test(t)) k = 'parti';
  return st[k] || st.def;
}

function socPushDm(peerHandle, from, text, unread) {
  const s = ensureSocial();
  s.dms[peerHandle] = s.dms[peerHandle] || [];
  s.dms[peerHandle].push({ from, text: String(text).slice(0, 240), ts: Date.now() });
  if (s.dms[peerHandle].length > 80) s.dms[peerHandle].shift();
  if (unread && !(SOC_UI.open && SOC_UI.tab === 'dm' && SOC_UI.dmWith === peerHandle)) {
    s.unread[peerHandle] = (s.unread[peerHandle] || 0) + 1;
  }
}

function socSendDm(handle, text) {
  text = String(text || '').trim().slice(0, 160);
  if (!text) return;
  const info = socInfo(handle);
  socPushDm(handle, socMe(), text, false);
  socSend({ type: 'dm_msg', to: handle, text });
  if (!info.real) {
    setTimeout(() => {
      socPushDm(handle, handle, socSimReply(handle, text), true);
      if (SOC_UI.open && SOC_UI.tab === 'dm' && SOC_UI.dmWith === handle) ensureSocial().unread[handle] = 0;
      else toast(`💬 <b>${socEsc(handle)}:</b> ${socEsc(socSimReply(handle, text))}`);
      if (typeof saveGame === 'function') saveGame();
      socRefresh();
    }, 1000);
  }
  if (typeof saveGame === 'function') saveGame();
  socRender();
}

function socEnsureParty() {
  const s = ensureSocial();
  if (!s.party) s.party = { leader: socMe(), members: [{ handle: socMe() }] };
  return s.party;
}

function socAddPartyMember(m) {
  const s = ensureSocial();
  const party = socEnsureParty();
  if (party.members.some(x => x.handle === m.handle)) return false;
  if (party.members.length >= SOC_MAX_PARTY) { toast('Parti dolu (en fazla 4 kişi).'); return false; }
  party.members.push(m);
  s.partyVer++;
  if (typeof saveGame === 'function') saveGame();
  return true;
}

function socPartyInvite(handle) {
  const s = ensureSocial();
  if (handle === socMe()) return;
  const party = socEnsureParty();
  if (party.leader !== socMe()) { toast('Sadece parti lideri davet gönderebilir.'); return; }
  if (party.members.some(m => m.handle === handle)) { toast(`${socEsc(handle)} zaten partinde.`); return; }
  if (party.members.length >= SOC_MAX_PARTY) { toast('Parti dolu (en fazla 4 kişi).'); return; }
  const info = socInfo(handle);
  if (info.real) {
    const me = socInfo(socMe());
    socSend({ type: 'party_invite', to: handle, guild: me.guild, fc: me.fc, dragon: me.dragon, chibi: me.chibi });
    toast(`🛡️ <b>${socEsc(handle)}</b> kullanıcısına parti daveti gönderildi.`);
  } else {
    toast(`🛡️ <b>${socEsc(handle)}</b> partiye davet edildi…`);
    setTimeout(() => {
      if (socAddPartyMember({ handle, guild: info.guild, fc: info.fc, dragon: info.dragon })) {
        toast(`<b>${socEsc(handle)}:</b> "Sancağının yanındayım dostum!"`, 'goal');
        if (typeof SFX !== 'undefined') SFX.play('bell');
        socRefresh();
      }
    }, 600);
  }
  socRefresh();
}

function socDisbandOrLeave() {
  const s = ensureSocial();
  s.party = null;
  s.partyVer++;
  if (typeof saveGame === 'function') saveGame();
  socRefresh();
}

/** Ağdan gelen sosyal mesajlar (net.js → socialOnNet). */
function socialOnNet(msg) {
  if (typeof S === 'undefined' || !S) return;
  const me = socMe();
  if (!msg || msg.from === me) return;
  if (msg.to && msg.to !== me) return;
  const s = ensureSocial();
  const from = msg.from;
  if (!from) return;
  if (msg.type === 'dm_msg') {
    if (!msg.to) return;
    socPushDm(from, from, msg.text || '', true);
    if (!(SOC_UI.open && SOC_UI.tab === 'dm' && SOC_UI.dmWith === from)) toast(`💬 <b>${socEsc(from)}</b> fısıldadı: ${socEsc(msg.text || '')}`);
    socRefresh();
  } else if (msg.type === 'party_invite') {
    if (!msg.to) return;
    s.invites = s.invites.filter(i => !(i.kind === 'party' && i.from === from));
    s.invites.push({ id: 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 999), kind: 'party', from, guild: msg.guild, fc: msg.fc, dragon: msg.dragon, chibi: msg.chibi || null });
    if (typeof SFX !== 'undefined') SFX.play('bell');
    toast(`🛡️ Parti Daveti: <b>${socEsc(from)}</b> seni partisine çağırıyor!`, 'goal');
    socRefresh();
  } else if (msg.type === 'party_reply') {
    if (msg.accept) {
      if (socAddPartyMember({ handle: from, guild: msg.guild, fc: msg.fc, dragon: msg.dragon, chibi: msg.chibi || null })) {
        toast(`<b>${socEsc(from)}</b> partine katıldı!`, 'goal');
      }
    } else {
      toast(`${socEsc(from)} parti davetini reddetti.`);
    }
    socRefresh();
  } else if (msg.type === 'social_invite') {
    if (!msg.to) return;
    const kind = msg.kind === 'table' ? 'table' : msg.kind === 'vs_duel' ? 'vs_duel' : 'vs_topcu';
    s.invites.push({ id: 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 999), kind, from, chibi: msg.chibi || null });
    if (typeof SFX !== 'undefined') SFX.play('bell');
    toast(`📨 <b>${socEsc(from)}</b> sana ${kind === 'table' ? 'masa' : 'VS'} daveti gönderdi!`, 'goal');
    socRefresh();
  }
}

/* ───────────────────────── Masa / VS yönlendirmeleri ───────────────────────── */
function socGoTable(handle) {
  if (typeof ensureHub !== 'function') return;
  const H = ensureHub();
  H.tab = 'kiraathane';
  if (typeof KIR !== 'undefined' && KIR) {
    KIR.oppHandle = handle || null;
    if (typeof kirResetGame === 'function') kirResetGame();
  }
  UI.view = 'meydan';
  SOC_UI.open = false;
  if (typeof closeModal === 'function' && typeof modalOn !== 'undefined' && modalOn) closeModal();
  socRender();
  if (typeof render === 'function') render();
}

function socStartVsTopcu(handle) {
  // ENG-14: VS Topçu artık gerçek oda daveti: Topçu PvP lobisi açılır, oda kurulur, arkadaşa davet gider.
  if (typeof pvprInvite === 'function' && typeof openAnimTestRoom === 'function') {
    SOC_UI.open = false;
    socRender();
    openAnimTestRoom({ screen: 'pvp_lobby', forceUnlock: true });
    pvprInvite(handle);
    return;
  }
  const info = socInfo(handle);
  const friendObj = { handle, name: handle, chibi: info.chibi, fc: info.fc, dragon: info.dragon, el: info.el };
  if (typeof MP !== 'undefined') {
    const np = {};
    np[handle] = { from: handle, chibi: info.chibi };
    Object.keys(MP.pvpPeers || {}).forEach(k => { if (k !== handle) np[k] = MP.pvpPeers[k]; });
    MP.pvpPeers = np;
  }
  if (info.real) socSend({ type: 'social_invite', to: handle, kind: 'vs_topcu', chibi: socInfo(socMe()).chibi });
  SOC_UI.open = false;
  socRender();
  if (typeof openAnimTestRoom === 'function') {
    openAnimTestRoom({ gameMode: 'pvp', pvpFriend: friendObj, screen: 'battle' });
  } else toast('Topçu Er Meydanı henüz yüklenmedi.');
}

// ENG-10: ödüllü düello yalnız sunucu kesesine bağlıyken görünür; vitrin düellosu her zaman kalır.
function socRankedDuelBtn(hh) {
  if (typeof ECO_LINK === 'undefined' || !ECO_LINK.linked) return '';
  const reg = typeof mpRegistered === 'function' && mpRegistered();
  return `<button class="btn sm ghost" data-a="soc-vs-duel-ranked" data-h="${hh}" aria-label="Ödüllü düello: ödül sunucuda belirlenir${reg ? '' : '; kayıtlı hesap gerekir'}">🏆 Ödüllü Düello <small>(${reg ? 'sunucu ejderhan' : 'hesap gerekir'})</small></button>`;
}
function socStartVsDuel(handle, ranked) {
  const star = (typeof byId === 'function' && byId(S.star)) || (S.dragons && S.dragons[0]);
  if (!star) { toast('Düello için bir ejderhan olmalı.'); return; }
  if (typeof mpSendDragonDuelInvite !== 'function') { toast('Gerçek Er Meydanı modülü yüklenemedi.'); return; }
  SOC_UI.open = false;
  socRender();
  if (typeof closeModal === 'function' && typeof modalOn !== 'undefined' && modalOn) closeModal();
  mpSendDragonDuelInvite(handle, ranked ? { ranked: true } : undefined);
}

/* ───────────────────────── Lobi Eşitlemeleri (parti → zindan / PvP / konvoy) ───────────────────────── */
function socMemberToLobbySlot(m) {
  const info = socInfo(m.handle, m);
  return { kind: 'peer', handle: m.handle, name: m.handle, fc: info.fc, chibi: info.chibi, dragonName: info.dragon, fromParty: true };
}

function socSyncRaidParty() {
  if (typeof SHM === 'undefined') return;
  if (!Array.isArray(SHM.raidPartySlots)) SHM.raidPartySlots = [null, null];
  const others = socPartyOthers();
  for (let i = 0; i < 2; i++) {
    const cur = SHM.raidPartySlots[i];
    if (others[i]) {
      if (!cur || cur.fromParty) SHM.raidPartySlots[i] = socMemberToLobbySlot(others[i]);
    } else if (cur && cur.fromParty) {
      SHM.raidPartySlots[i] = null;
    }
  }
  if (typeof syncRaidSoloMode === 'function') syncRaidSoloMode();
}

function socSyncConvoy() {
  if (typeof ensureHub !== 'function') return;
  const others = socPartyOthers();
  const H = ensureHub();
  H.caravanConvoy = H.caravanConvoy || { route: 'kizil_vadi', slot2: null, slot3: null };
  ['slot2', 'slot3'].forEach((k, i) => {
    const cur = H.caravanConvoy[k];
    const m = others[i];
    if (m) {
      if (!cur || cur.fromParty) {
        const info = socInfo(m.handle, m);
        H.caravanConvoy[k] = { mode: 'coop', peerIdx: info.idx || 0, handle: m.handle, dName: info.dragon, el: info.el || 'ates', fromParty: true };
      }
    } else if (cur && cur.fromParty) {
      H.caravanConvoy[k] = null;
    }
  });
}

function socInstallWrappers() {
  if (window.__socWrapped) return;
  window.__socWrapped = true;

  if (typeof renderSahmeranApp === 'function') {
    const orig = renderSahmeranApp;
    window.renderSahmeranApp = function () {
      try {
        if (typeof SHM !== 'undefined' && SHM.open) {
          const s = ensureSocial();
          const key = (SHM.screen || '') + ':' + (s ? s.partyVer : 0);
          if (SHM.screen === 'lobby' && SHM._socKey !== key) {
            SHM._socKey = key;
            socSyncRaidParty();
          } else if (SHM.screen !== 'lobby') {
            SHM._socKey = null;
          }
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  if (typeof pvpBuildSlots === 'function') {
    const origSlots = pvpBuildSlots;
    window.pvpBuildSlots = function (mode, hostHandle, prevSlots) {
      const slots = origSlots.apply(this, arguments);
      try {
        if (mode === '2v2' && !Array.isArray(prevSlots)) {
          const ally = socPartyOthers()[0];
          const sl = slots.find(x => x.team === 'blue' && x.kind === 'empty');
          if (ally && sl) {
            const info = socInfo(ally.handle, ally);
            Object.assign(sl, { kind: 'peer', handle: ally.handle, name: ally.handle, el: info.el, sub: 'Parti Müttefiki', ready: true, chibi: info.chibi });
          }
        }
      } catch (e) {}
      return slots;
    };
  }

  if (typeof meydanView === 'function') {
    const origMv = meydanView;
    window.meydanView = function () {
      try { socSyncConvoy(); } catch (e) {}
      return origMv.apply(this, arguments);
    };
  }
}

/* ───────────────────────── Lobi "Arkadaşını Çağır" butonları (delegasyon) ───────────────────────── */
document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('[data-soc-lobby]') : null;
  if (!b) return;
  e.preventDefault();
  SOC_UI.pick = b.getAttribute('data-soc-lobby');
  socRender();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target) return;
  if (e.target.id === 'soc-add-in') { ACT['soc-add-friend'](); }
  else if (e.target.id === 'soc-dm-in') { ACT['soc-dm-send'](); }
});

/* ───────────────────────── ACT (tıklama) kanalları ───────────────────────── */
Object.assign(ACT, {
  'bag-open'() {
    if (typeof modalOn !== 'undefined' && modalOn) bagModal();
    else { pushModal(bagModal); }
  },
  'bag-go-ahir'() {
    if (typeof closeModal === 'function') closeModal();
    ACT.go({ dataset: { v: 'ahir' } });
  },
  'social-drawer-open'() {
    ensureSocial();
    SOC_UI.open = true;
    socRender();
  },
  'social-drawer-close'() { SOC_UI.open = false; SOC_UI.vsFor = null; socRender(); },
  'soc-tab'(el) { SOC_UI.tab = el.dataset.t || 'friends'; SOC_UI.vsFor = null; socRender(); },
  'soc-add-friend'() {
    const inp = document.getElementById('soc-add-in');
    let v = ((inp && inp.value) || SOC_UI.draft.add || '').trim();
    if (!v) return;
    if (v[0] !== '@') v = '@' + v;
    v = v.toLowerCase();
    if (!/^@[a-z0-9_çğıöşü]{2,24}$/.test(v)) { toast('Geçersiz mahlas. Örnek: <b>@kervan_ustasi</b>'); return; }
    SOC_UI.draft.add = '';
    if (socAddFriend(v)) socRefresh(); else socRender();
  },
  'soc-add-peer'(el) { if (socAddFriend(el.dataset.h)) socRefresh(); },
  'soc-friend-del'(el) {
    const s = ensureSocial();
    s.friends = s.friends.filter(f => f.handle !== el.dataset.h);
    if (typeof saveGame === 'function') saveGame();
    socRender();
  },
  'soc-dm-open'(el) {
    const h = el.dataset.h;
    SOC_UI.open = true; SOC_UI.tab = 'dm'; SOC_UI.dmWith = h; SOC_UI.vsFor = null;
    ensureSocial().unread[h] = 0;
    socRefresh();
  },
  'soc-dm-back'() { SOC_UI.dmWith = null; socRender(); },
  'soc-dm-send'() {
    const inp = document.getElementById('soc-dm-in');
    const v = ((inp && inp.value) || SOC_UI.draft.dm || '').trim();
    if (!v || !SOC_UI.dmWith) return;
    SOC_UI.draft.dm = '';
    socSendDm(SOC_UI.dmWith, v);
  },
  'soc-party-invite'(el) { socPartyInvite(el.dataset.h); },
  'soc-party-kick'(el) {
    const s = ensureSocial();
    if (!s.party || s.party.leader !== socMe()) return;
    s.party.members = s.party.members.filter(m => m.handle !== el.dataset.h);
    s.partyVer++;
    if (s.party.members.length <= 1) s.party = null;
    if (typeof saveGame === 'function') saveGame();
    socRefresh();
  },
  'soc-party-leave'() { socDisbandOrLeave(); },
  'soc-party-disband'() { socDisbandOrLeave(); },
  'soc-table-invite'(el) {
    const h = el.dataset.h;
    if (socInfo(h).real) socSend({ type: 'social_invite', to: h, kind: 'table', chibi: socInfo(socMe()).chibi });
    socGoTable(h);
    toast(`🎲 <b>${socEsc(h)}</b> Kervansaray Kıraathanesi'ne çağrıldı.`);
  },
  'soc-vs-menu'(el) { SOC_UI.vsFor = SOC_UI.vsFor === el.dataset.h ? null : el.dataset.h; socRender(); },
  'soc-vs-topcu'(el) { socStartVsTopcu(el.dataset.h); },
  'soc-vs-duel'(el) { socStartVsDuel(el.dataset.h); },
  'soc-vs-duel-ranked'(el) { socStartVsDuel(el.dataset.h, true); },
  'soc-invite-accept'(el) {
    const s = ensureSocial();
    const inv = s.invites.find(i => i.id === el.dataset.id);
    if (!inv) return;
    s.invites = s.invites.filter(i => i.id !== inv.id);
    if (inv.kind === 'party') {
      const members = [{ handle: inv.from, guild: inv.guild, fc: inv.fc, dragon: inv.dragon, chibi: inv.chibi || null }, { handle: socMe() }];
      s.party = { leader: inv.from, members };
      s.partyVer++;
      const me = socInfo(socMe());
      socSend({ type: 'party_reply', to: inv.from, accept: true, guild: me.guild, fc: me.fc, dragon: me.dragon, chibi: me.chibi });
      toast(`🛡️ <b>${socEsc(inv.from)}</b> partisine katıldın!`, 'goal');
    } else if (inv.kind === 'table') {
      socGoTable(inv.from);
    } else if (inv.kind === 'vs_topcu') {
      socStartVsTopcu(inv.from);
    } else if (inv.kind === 'vs_duel') {
      // Ödüllü davette sunucu ejderhası yoksa davet açık kalır (geri eklenir), kullanıcı mesajı görür.
      if (!mpReplyDragonDuelInvite(inv.id, true, { ranked: !!inv.ranked }) && inv.ranked) s.invites.push(inv);
    }
    if (typeof saveGame === 'function') saveGame();
    socRefresh();
  },
  'soc-invite-reject'(el) {
    const s = ensureSocial();
    const inv = s.invites.find(i => i.id === el.dataset.id);
    s.invites = s.invites.filter(i => i.id !== el.dataset.id);
    if (inv && inv.kind === 'party') socSend({ type: 'party_reply', to: inv.from, accept: false });
    else if (inv && inv.kind === 'vs_duel') mpReplyDragonDuelInvite(inv.id, false);
    socRefresh();
  },
  'soc-pick-cancel'() { SOC_UI.pick = null; socRender(); },
  'soc-pick-choose'(el) {
    const h = el.dataset.h;
    const target = SOC_UI.pick || '';
    SOC_UI.pick = null;
    const [kind, idxStr] = target.split(':');
    const info = socInfo(h);
    if (kind === 'raid' && typeof SHM !== 'undefined') {
      const i = Math.max(0, Math.min(1, (parseInt(idxStr, 10) || 1) - 1));
      if (!Array.isArray(SHM.raidPartySlots)) SHM.raidPartySlots = [null, null];
      SHM.raidPartySlots[i] = { kind: 'peer', handle: h, name: h, fc: info.fc, chibi: info.chibi, dragonName: info.dragon };
      if (typeof syncRaidSoloMode === 'function') syncRaidSoloMode();
      if (info.real) socSend({ type: 'pvp_sync', action: 'invite', raidId: SHM.raidId, to: h, slot: i + 1 });
      toast(`📩 <b>${socEsc(h)}</b> Zindan lobisine katıldı!`, 'goal');
      if (typeof renderSahmeranApp === 'function') renderSahmeranApp();
    } else if (kind === 'pvp' && typeof pvprInvite === 'function') {
      // ENG-14: PvP daveti sunucu odasından yalnız hedefe gider; oyuncu kabul edince yuvaya oturur.
      pvprInvite(h);
    } else if (kind === 'table') {
      if (info.real) socSend({ type: 'social_invite', to: h, kind: 'table', chibi: socInfo(socMe()).chibi });
      socGoTable(h);
      return;
    }
    socRender();
  },
});

/* ───────────────────────── Başlatma ───────────────────────── */
(function socBoot() {
  socInstallWrappers();
  if (typeof S !== 'undefined' && S) {
    ensureSocial();
    socRender();
    if (typeof render === 'function') { try { render(); } catch (e) {} }
  }
})();
