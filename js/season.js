'use strict';
/* ============ EJDER OCAĞI — NESİL GEÇİŞİ ============
   Sezon bitince oyun bitmez. Ocağın yıldızı hocalığa çekilir; yeni sezonun yıldız adayları onun yavrularıdır
   (yavrusu yoksa ocaktaki herhangi bir ejderha). Binalar, ejderhalar, yumurtalar, sipariş panosu, ezeli rakip
   ve soy kayıtları kalır; ünün yarısı yeni sezona taşınır. Rakip ocaklar da yeni sezona geçer.
   Her sezonda arena, yarış ve turnuvalar biraz daha zorlaşır. Birkaç sezon sonra ocakta dedenin Kor'undan gelen bir soy olur. */

const seasonNo = () => (S && S.seasonNo) || 1;
const seasonBonus = () => (seasonNo() - 1) * 8; // her sezon rakiplere eklenen seviye

function starChildren(st) {
  if (!st) return [];
  return S.dragons.filter(d => !d.dead && !d.old && d.id !== st.id && d.pids && d.pids.includes(st.id));
}
function seasonCandidates() {
  const st = byId(S.star), kids = starChildren(st);
  if (kids.length) return { kids: true, list: kids };
  return { kids: false, list: S.dragons.filter(d => !d.dead && !d.old && d.id !== S.star) };
}
function seasonModal() {
  UI.modalRedraw = seasonModal;
  const st = byId(S.star), C = seasonCandidates(), eggs = S.eggs.filter(e => e.pids && st && e.pids.includes(st.id)).length;
  const card = d => { const pot = STATS.map(k => `${ST_KISA[k]} <b class="lg">${potLetter(d.genes.pot[k][0] + d.genes.pot[k][1])}</b>`).join(' · ');
    return `<button class="lcard ${UI.nextStar === d.id ? 'on' : ''}" data-a="season-pick" data-id="${d.id}">${dragonSVG(d, { still: true })}<b>${esc(d.name)} ${sexIc(d.sex)}</b><small>${elChip(d.el)} ${STAGE_AD[d.stage]} · ${d.gen}. nesil</small><small class="lpot">${pot}</small></button>`; };
  const intro = st ? (C.kids ? `<b>${esc(st.name)}</b> bu sezonun sonunda hocalığa çekiliyor. Yeni sezonun yıldızı onun yavrularından biri olacak.` : `<b>${esc(st.name)}</b> hocalığa çekiliyor ama ondan bir yavru yok. Ocaktan bir aday seç; bir dahaki sefere soyunu sürdürmeyi unutma.`) : 'Yeni sezonun yıldızını seç.';
  showModal(`<div class="parch legm seasonm"><p class="kicker">Nesil geçişi · ${seasonNo() + 1}. sezon</p><h2>Yeni sezonun yıldızı</h2>
    <p>${intro}${eggs ? ` Kuluçkada ondan ${eggs} yumurta daha var.` : ''}</p>
    <p class="mute sm">Ocak, binalar, ejderhalar, yumurtalar ve soy kayıtları kalır. Ünün yarısı yeni sezona taşınır. Rakipler de güçlenerek yeni sezona geçer.</p>
    ${C.list.length ? pager('season', C.list, PER(4, 2), card) : `<p class="vempty">${S.eggs.length ? 'Ocakta yıldız olabilecek bir ejderha yok; yumurtalardan çıkan ilk yavru yıldız olur.' : 'Soyu sürdürecek ejderha ya da yumurta yok.'}</p>`}
    <div class="mbtns"><button class="btn ghost" data-a="season-back">Geri</button><button class="btn primary" data-a="season-go" ${C.list.length ? (UI.nextStar ? '' : 'disabled') : (S.eggs.length ? '' : 'disabled')}>${C.list.length ? (UI.nextStar ? `${esc(byId(UI.nextStar).name)} ile yeni sezona başla` : 'Bir aday seç') : 'Yeni sezona başla'}</button></div></div>`, 'paper wide');
}
function seasonStart(nextId) {
  const prev = byId(S.star), n = seasonNo();
  S.seasons = S.seasons || [];
  S.seasons.push({ n, ending: S.ending, star: prev ? prev.name : null, un: S.un, wins: S.st.wins, champ: prev && prev.champ === 'tac' });
  if (prev && !prev.old) {
    prev.old = true; prev.retired = true; prev.legend = true; prev.role = null; for (const s in prev.equip) prev.equip[s] = null;
    chron(`${prev.name} ${n}. sezonun ardından hocalığa çekildi.`);
  }
  const carryUn = Math.floor(S.un / 2);
  // rastgele olaylar yeni sezonda yeniden çıkabilir; hikâyeler bir kez görülür
  delete S.flags.demHelped; delete S.flags.demRefused; delete S.flags.demHand; // Karabela hikâyesinin sonuçları o sezona aittir
  const storyIds = Object.values(STORY).map(x => x.id); S.seenEv = (S.seenEv || []).filter(id => storyIds.includes(id));
  Object.assign(S, { seasonNo: n + 1, week: 1, over: false, ending: null, tour: null, career: null, races: null, un: carryUn, neg: 0, star: nextId != null ? +nextId : null });
  for (const d of S.dragons) { d.task = null; d.fat = 0; d.talked = false; d.fed = false; if (d.id === S.star) delete d.role; }
  // rakip ocaklar da yeni sezona geçer
  if (typeof rivals === 'function') for (const r of rivals()) {
    r.un = Math.floor(r.un / 2); r.power = Math.round(r.power + 4 + Math.random() * 4);
    if (r.id === 'demirhan') { const nm = pick(['Kuzgun', 'Karasu', 'Gecekuşu', 'Kemik', 'Zifir']); r.champ = { ...r.champ, name: nm }; }
  }
  refreshMarket(); refreshArena(); refreshSmith();
  const st = S.star != null ? byId(S.star) : null;
  if (st) { delete st.role; career(); }
  snapAlbum('legacy', `${S.seasonNo}. sezon`, st ? `${st.name} ocağın yeni yıldızı${prev ? `; ${prev.name} hocalığa çekildi` : ''}.` : 'Yeni bir sezon başladı.', st || prev || null);
  chron(`${S.seasonNo}. sezon başladı.${st ? ` Yıldız: ${st.name}${prev && st.pids && st.pids.includes(prev.id) ? ` (${ek(prev.name, 'gen')} yavrusu)` : ''}.` : ''} Ünün yarısı taşındı (+${carryUn}).`);
  const dem = typeof rivals === 'function' ? rivals()[0] : null;
  UI.view = 'ocak'; UI.sel = st ? st.id : S.dragons[0]?.id; UI.tile = null; UI.drawer = null; UI.nextStar = null;
  $('#modal-root').innerHTML = ''; MQ.length = 0; modalOn = false; saveGame(); SFX.play('bell'); BGM.mood(null); render();
  setTimeout(() => toast(`<b>${S.seasonNo}. sezon başladı</b>${st ? `Yıldız: ${esc(st.name)}. Kariyer hedefleri kuruldu.` : ''}${dem ? ` Demirhan yeni şampiyonu ${esc(dem.champ.name)}'u tanıttı.` : ''}`, 'goal'), 400);
}
const SEASON_ACT = {
  'season-open'() { UI.nextStar = null; const C = seasonCandidates(); if (C.list.length === 1) UI.nextStar = C.list[0].id; SFX.play('page'); seasonModal(); },
  'season-pick'(el) { UI.nextStar = +el.dataset.id; SFX.play('click'); seasonModal(); },
  'season-back'() { endingModal(true); },
  'season-go'() { const C = seasonCandidates(); if (C.list.length && !UI.nextStar) return; seasonStart(C.list.length ? UI.nextStar : null); },
};
