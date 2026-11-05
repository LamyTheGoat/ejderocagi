'use strict';
/* ============ EJDER OCAĞI — DÖVÜŞTE DESTEK ve DÖVÜŞ KARELERİ ============
   Yıldız dövüşürken destekçileri maç başına bir kez çağrılabilir (tur harcamaz), Persona tarzı bir kareyle:
     Antrenman eşi araya girip rakibin bir sonraki darbesini karşılar.
     Neşe kaynağı moral verir: can ve nefes toplar, morali bir kademe yükselir.
     Gözcü rakibin bu turdaki hamlesini önceden gösterir; isabet ve kaçınma artar.
     Avcı pusudan vurur: rakibe küçük bir yara açar ve onu sarsar.
   Dövüşün kıyasıya anlarında çizgi roman kareleri araya girer (kritik darbe, ağır yara, zafer, yenilgi). */

const SUP_FX = {
  es: { ad: 'Araya gir', d: 'Rakibin bir sonraki darbesini karşılar', pz: 'P13', face: 'r',
    line: ['Bu darbe benim!', 'Önce beni geçmen lazım!', 'Arkamda kal!'],
    fx: (F, s) => { F.p.cover = s.name; return `${esc(s.name)} araya girdi: rakibin bir sonraki darbesini o karşılayacak.`; } },
  nese: { ad: 'Moral ver', d: 'Can ve nefes toplatır, moralini yükseltir', pz: 'P6', face: 'r',
    line: ['Hadi! Sen yaparsın!', 'Bütün ocak seni izliyor!', 'Kalk, daha bitmedi!'],
    fx: (F, s) => { const h = Math.round(F.p.maxHp * .14); F.p.hp = Math.min(F.p.maxHp, F.p.hp + h); F.p.sta = Math.min(100, F.p.sta + 30); F.p.mood = Math.min(4, (F.p.mood ?? 2) + 1); return `${esc(s.name)} kenardan bağırdı: can +${h}, nefes +30, moral yükseldi.`; } },
  gozcu: { ad: 'Hamleyi göster', d: 'Rakibin bu turki hamlesini gösterir', pz: 'P3', face: 'l',
    line: ['Dikkat, geliyor!', 'Gözünü dikti; şimdi saldıracak!', 'Ben gördüm, sen de gör!'],
    fx: (F, s) => { F.eNext = aiChoose(F.e, F.p); F.p.crit += 6; F.p.dodge += 6; return `${esc(s.name)} rakibi okudu: bu tur <b>${eActName(F.eNext, F.e)}</b> yapacak. (kritik ve kaçınma +6)`; } },
  avci: { ad: 'Pusudan vur', d: 'Rakibe küçük bir yara açar, onu sarsar', pz: 'P2', face: 'l',
    line: ['Şimdi!', 'Arkanı kolla!', 'Görmedin bile!'],
    fx: (F, s) => { const dm = Math.min(F.e.hp - 1, Math.round(F.e.maxHp * .08)); F.e.hp -= Math.max(0, dm); F.e.weak = Math.max(F.e.weak || 0, 1); return `${esc(s.name)} pusudan atıldı: rakibe ${Math.max(0, dm)} hasar, rakip sarsıldı.`; } },
};
const eActName = (a, f) => typeof a === 'string' && a.startsWith('card:') ? `“${CARDS[a.slice(5)].ad}” kartı` : ({ pence: 'pençe', nefes: `${EL_AD[f.el].toLowerCase()} nefesi`, savun: 'savunma', kukre: 'kükreme' }[a] || a);

function supInit(d) {
  if (!d || typeof isStar !== 'function' || !isStar(d)) return { used: true, list: [] };
  const list = S.dragons.filter(x => x.id !== d.id && !x.dead && !x.inj && roleOf(x) && SUP_FX[x.role]);
  return { used: false, list };
}
function supFab(play) {
  if (!FT) return '';
  if (FT.sup === undefined) FT.sup = supInit(FT.d);
  const S0 = FT.sup; if (!S0.list.length) return '';
  const dis = S0.used || play || FT.F.over;
  return `<button class="supbtn ${S0.used ? 'used' : ''}" data-a="fsup" ${dis ? 'disabled' : ''}><span class="sfaces">${S0.list.slice(0, 3).map(x => `<i>${dragonSVG(x, { still: true })}</i>`).join('')}</span><span><b>Destek çağır</b><small>${S0.used ? 'Bu dövüşte çağrıldı' : `${S0.list.length} destekçi · tur harcamaz`}</small></span></button>`;
}
function supChooser() {
  if (!FT || !FT.supOpen || !FT.sup) return '';
  const items = FT.sup.list.map(x => { const R = SUP_FX[x.role]; return `<button class="supopt" data-a="fsup-go" data-id="${x.id}"><span class="sdr">${dragonSVG(x, { still: true })}</span><span><b>${esc(x.name)} · ${ROLES[x.role].ad}</b><small>${R.ad}: ${R.d}</small></span></button>`; }).join('');
  return `<div class="supbox"><div class="suphead"><b>Kimi çağıralım?</b><button class="btn ghost sm" data-a="fsup-x">Vazgeç</button></div>${items}</div>`;
}

/* --- Dövüş kareleri (yarış kareleriyle aynı çizgi roman dili) --- */
const isAdultPose = (x, p) => x && (x.stage || 'yetiskin') === 'yetiskin' && hasPose(x, p);
function fightPanelArt(x, pz, face, cls, box) {
  if (!x) return '';
  if (!isAdultPose(x, pz)) {
    const isLeft = face === 'l';
    const posStyle = isLeft ? 'right:4%;bottom:4%;width:42%;height:82%' : 'left:4%;bottom:4%;width:42%;height:82%';
    return `<div class="rcd ${cls} ${x === (FT && FT.d) ? 'mine' : ''}" style="${posStyle}">${dragonSVG(x, { still: true, flip: isLeft })}${typeof cutAura === 'function' && x.el ? cutAura(x.el) : ''}<span class="rcn">${esc(x.name || 'Ejderha')}</span></div>`;
  }
  const es = poseEdgeStyle(x, pz, face), M = POSE_META[x.el + '-' + pz], ar = (M[1] / M[0]).toFixed(4);
  const bx = !es && box ? ` data-box="${poseBox(x, pz, box)}" data-ar="${ar}"` : '';
  return `<div class="rcd ${cls} ${es ? 'edge' : ''} ${x === (FT && FT.d) ? 'mine' : ''}" ${es ? `style="${es}"` : ''}${bx}>${poseSVG(x, pz, { face, still: true })}${typeof cutAura === 'function' ? cutAura(x.el) : ''}<span class="rcn">${esc(x.name)}</span></div>`;
}
function fightCut(type, ctx) {
  return new Promise(res => {
    const host = $('.fight'); if (!host || window.__fastFx || window.__noCuts) return res();
    const { d, opp } = FT; let inner = '', cap = '', ono = '', vp = '50% 45%', customBg = '';
    const od = opp && (opp.gx || opp.genes) ? opp : opp ? poseDragon(opp, 'op') : null;
    const isBossCut = type === 'boss_ult' || type === 'boss_darbe' || type === 'kalkis';
    if (type === 'kalkis') {
      inner = fightPanelArt(od, 'P8', 'l', 'fsB', '44,4,54,92,r') + fightPanelArt(d, 'P8', 'r', 'fsA', '2,4,54,92,l');
      cap = (ctx && ctx.cap) || `${d.name} ve ${opp ? opp.name : 'Rakip'} er meydanında karşı karşıya!`;
      ono = (ctx && ctx.ono) || 'ÇARPIŞMA!';
      vp = '50% 45%';
    }
    else if (type === 'darbe') { inner = fightPanelArt(od, 'P9', 'l', 'fsB', '58,10,38,84,r') + fightPanelArt(d, 'P8', 'r', 'fsA', '2,4,58,92,l'); cap = `${d.name} pençesini indirdi!`; ono = 'ÇAT!'; vp = '62% 45%'; }
    else if (type === 'sendele') { inner = fightPanelArt(od, 'P8', 'l', 'fsB', '44,4,54,92,r') + fightPanelArt(d, 'P9', 'r', 'fsA', '2,12,42,84,l'); cap = `${d.name} sendeledi ama düşmedi!`; ono = 'GÜM!'; vp = '35% 45%'; }
    else if (type === 'nefes') { inner = `<i class="fbreath" style="--c:${PAL[d.el].glow}"></i>` + fightPanelArt(od, 'P9', 'l', 'fsB', '62,14,34,80,r') + fightPanelArt(d, 'P12', 'r', 'fsA', '2,6,60,90,l'); cap = `${d.name} ${EL_AD[d.el].toLowerCase()} nefesini salıverdi!`; ono = { ates: 'FÜÜŞŞ!', buz: 'KRİİİK!', firtina: 'ÇATIRT!', toprak: 'GÜRÜM!', golge: 'VIIIŞŞ!' }[d.el] || 'FÜÜŞŞ!'; vp = '70% 40%'; }
    else if (type === 'siper') { inner = fightPanelArt(od, 'P8', 'l', 'fsB', '52,4,46,92,r') + fightPanelArt(d, 'P13', 'r', 'fsA', '2,10,56,86,l'); cap = `${d.name} kanatlarıyla siper aldı!`; ono = 'TANG!'; vp = '45% 45%'; }
    else if (type === 'boss_ult' && od) {
      const oEl = od.el || (opp && opp.el) || 'ates';
      const oName = (opp && opp.name) || od.name || 'Rakip Ejder';
      const tName = (opp && opp.trainer) || '';
      const isKulyutan = /Kül Yutan/i.test(oName);
      const isKarabela = /Karabela/i.test(oName);
      const isSahmeran = /Şahmeran|Sırça/i.test(oName);
      const isKalgarot = /Kalgarot/i.test(oName + ' ' + tName);
      customBg = isKulyutan ? asset('cut-kulyutan-cataclysm') : isKarabela ? asset('cut-karabela-eclipse') : isSahmeran ? asset('cut-sahmeran-tsunami') : isKalgarot ? asset('cut-kalgarot-supernova') : '';
      const glow = isKarabela ? '#c084fc' : isKulyutan ? '#f97316' : (PAL[oEl] && PAL[oEl].glow) || '#f97316';
      inner = `<i class="fbreath boss-breath" style="--c:${glow}"></i>` + fightPanelArt(d, 'P9', 'r', 'fsA', '2,12,38,82,l') + fightPanelArt(od, 'P12', 'l', 'fsB', '38,4,60,92,r');
      cap = `${tName ? tName + ' emretti: ' : ''}${oName} yıkıcı ${EL_AD[oEl].toLowerCase()} nefesini salıverdi!`;
      ono = isKulyutan ? 'KÜL TUFANI!' : isKarabela ? 'KARA ALEV!' : { ates: 'FÜÜŞŞ!', buz: 'KRİİİK!', firtina: 'ÇATIRT!', toprak: 'GÜRÜM!', golge: 'VIIIŞŞ!' }[oEl] || 'FÜÜŞŞ!';
      vp = '32% 42%';
    }
    else if (type === 'boss_darbe' && od) {
      const oName = (opp && opp.name) || od.name || 'Rakip Ejder';
      const tName = (opp && opp.trainer) || '';
      const isKulyutan = /Kül Yutan/i.test(oName);
      const isKarabela = /Karabela/i.test(oName);
      const isSahmeran = /Şahmeran|Sırça/i.test(oName);
      const isKalgarot = /Kalgarot/i.test(oName + ' ' + tName);
      customBg = isKulyutan ? asset('cut-kulyutan-cataclysm') : isKarabela ? asset('cut-karabela-eclipse') : isSahmeran ? asset('cut-sahmeran-tsunami') : isKalgarot ? asset('cut-kalgarot-meteor') : '';
      inner = fightPanelArt(d, 'P9', 'r', 'fsA', '2,14,40,80,l') + fightPanelArt(od, 'P8', 'l', 'fsB', '40,4,58,92,r');
      cap = `${oName} acımasız bir pençe darbesiyle saldırdı!`;
      ono = 'GÜÜÜM!';
      vp = '36% 45%';
    }
    else if (type === 'zafer') { inner = fightPanelArt(d, 'P7', 'r', 'fsC', '16,4,68,92,c'); cap = `${d.name} zaferini haykırıyor!`; ono = 'GRAAAH!'; }
    else if (type === 'yenik') { inner = fightPanelArt(d, 'P5', 'r', 'fsC', '10,24,80,70,c'); cap = `${d.name} yere yığıldı...`; }
    else if (type === 'sup') { const s = ctx.s, R = SUP_FX[s.role]; const pz = isAdultPose(s, R.pz) ? R.pz : null;
      inner = pz ? fightPanelArt(s, pz, R.face, 'fsC', '8,4,62,92,c') : `<div class="rcd fsC kid" style="left:18%;top:10%;width:46%">${dragonSVG(s, { still: true })}<span class="rcn">${esc(s.name)}</span></div>`;
      cap = `${s.name}: "${pick(R.line)}"`; ono = ''; }
    if (!inner) return res();
    const bgUrl = customBg || asset(FT.mode === 'kule' ? 'bg-kule' : FT.tier === 'cukur' ? 'bg-pit' : FT.tier === 'saray' ? 'bg-saray' : 'bg-arena') || '';
    const debs = typeof cutDebris === 'function' ? cutDebris(vp) : '';
    const el = document.createElement('div'); el.className = `rcut fcut ${type === 'boss_ult' ? 'nefes' : type === 'boss_darbe' ? 'darbe' : type === 'kalkis' ? 'basa' : type}`;
    el.innerHTML = `<div class="rcp" style="--vp:${vp}"><div class="rcbg own" style="background-image:url(${bgUrl})"></div><div class="rclines"></div><div class="rcrad"></div><div class="rctone"></div>${debs}${inner}<div class="rccap">${esc(cap)}</div>${ono ? `<b class="rcono">${ono}</b>` : ''}${type === 'sup' ? '<b class="suptag">DESTEK!</b>' : ''}</div>`;
    host.appendChild(el); if (typeof cutFit === 'function') cutFit(el.querySelector('.rcp'));
    if (typeof ENGINE_GL !== 'undefined') ENGINE_GL.pulseImpact({ intensity: isBossCut ? 0.9 : 0.65, chroma: isBossCut });
    SFX.play('page', { vol: .7 }); setTimeout(() => SFX.play(type === 'zafer' ? 'roar' : type === 'yenik' ? 'sad' : type === 'sup' ? 'cheer' : (type === 'nefes' || isBossCut) ? 'roar' : 'hit', { vol: .8 }), 140);
    const life = type === 'zafer' || type === 'yenik' ? 2100 : 1650;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add('out');
      setTimeout(() => { el.remove(); res(); }, 380);
    };
    el.style.pointerEvents = 'auto';
    el.addEventListener('click', finish, { once: true });
    setTimeout(finish, life);
  });
}
// Turun sonunda hangi kare gösterilsin? (dövüş başına en çok üç kare: hem boss hem oyuncu hamlesi görülebilsin)
function fightCutPick(evs, F) {
  if (!FT || window.__fastFx) return null;
  FT.cutN = FT.cutN || 0; FT.cutSeen = FT.cutSeen || {};
  const adult = isAdultPose(FT.d, 'P7');
  if (!adult) return null;
  if (F.over && !F.surrender && !F.timeout) return F.winner === 'p' ? 'zafer' : 'yenik'; // bitiş karesi her zaman
  if (FT.cutN >= 3) return null; // dövüş ortası en çok üç kare
  const eCardEv = evs.find(e => e.who === 'e' && e.act === 'card' && e.card);
  if (eCardEv) FT.lastEnemyCard = eCardEv.card;
  if (!FT.cutSeen.boss_ult && evs.some(e => e.who === 'e' && ((e.act === 'card' && (e.dmg || e.card === 'kukreyen_yurek' || e.card === 'sarsinti')) || (e.act === 'nefes' && e.dmg && (e.elm > 1 || e.crit || e.dmg >= F.p.maxHp * .14)))) && chance(85)) return 'boss_ult';
  if (!FT.cutSeen.nefes && evs.some(e => e.who === 'p' && e.act === 'nefes' && e.dmg && (e.elm > 1 || e.crit || e.dmg >= F.e.maxHp * .16)) && chance(70)) return 'nefes';
  if (!FT.cutSeen.siper && evs.some(e => e.who === 'p' && e.act === 'savun') && evs.some(e => e.who === 'e' && e.act !== 'savun' && (e.dmg || e.miss)) && chance(60)) return 'siper';
  if (!FT.cutSeen.darbe && evs.some(e => e.who === 'p' && e.crit && e.dmg) && chance(70)) return 'darbe';
  if (!FT.cutSeen.boss_darbe && evs.some(e => e.who === 'e' && e.crit && e.dmg) && chance(75)) return 'boss_darbe';
  if (!FT.cutSeen.sendele && evs.some(e => e.who === 'e' && e.dmg) && F.p.hp > 0 && F.p.hp < F.p.maxHp * .3 && chance(70)) return 'sendele';
  return null;
}
const FSUP_ACT = {
  fsup() { if (!FT || !FT.sup || FT.sup.used || FT.pre) return; FT.supOpen = true; SFX.play('tab'); fightModal(); },
  'fsup-x'() { if (FT) { FT.supOpen = false; fightModal(); } },
  async 'fsup-go'(el) {
    if (!FT || !FT.sup || FT.sup.used) return;
    const s = byId(el.dataset.id); if (!s || !SUP_FX[s.role]) return;
    FT.sup.used = true; FT.supOpen = false;
    const txt = SUP_FX[s.role].fx(FT.F, s);
    FT.log.push({ t: `<b class="supl">Destek!</b> ${txt}`, c: 'good' });
    addAff(s.id, FT.d.id, 3); addBond(s, 1);
    fightModal(); await fightCut('sup', { s }); if (FT) fightModal();
  },
};
