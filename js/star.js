'use strict';
/* ============ EJDER OCAĞI — YILDIZ VE DESTEK ============
   Ocağın bir YILDIZI olur: elle eğittiğin, dövüştürdüğün, hikâyesini yaşadığın ejderha.
   Ötekilere bir kez DESTEK ROLÜ verirsin; rol her hafta kendiliğinden işler, haftalık iş beklemez.
   İstersen destekçilere yine elle iş verebilirsin (antrenman, dövüş, gezinti, yuva): o hafta rolü bekler.
   Destekçi yıldızla zaman geçirdikçe aralarındaki yakınlık da büyür. */

const ROLES = {
  es: { ad: 'Antrenman eşi', kisa: 'Eş', d: 'Yıldızla kapışır: yıldızın antrenmanı +1 (en çok iki eş). Kendisi de aynı değerden biraz kapar, yorulur.', ok: d => d.stage !== 'yavru' && !d.old },
  nese: { ad: 'Neşe kaynağı', kisa: 'Neşe', d: 'Yıldızın yanında oyun oynar: moralini yükseltir, yorgunluğunu alır.', ok: () => true },
  avci: { ad: 'Avcı', kisa: 'Avcı', d: 'Her hafta ava çıkar: yem ya da biraz altın getirir.', ok: d => d.stage !== 'yavru' && !d.old },
  gozcu: { ad: 'Gözcü', kisa: 'Gözcü', d: 'Arenada rakipleri izler: yıldız bu hafta dövüşürse daha isabetli ve çevik.', ok: d => d.stage === 'yetiskin' },
};
const ROLE_IC = { es: '', nese: '', avci: '', gozcu: '' };

function ensureStar() {
  if (!S || !S.dragons) return null;
  let st = S.star != null ? S.dragons.find(d => d.id === S.star && !d.dead) : null;
  if (!st) {
    const pool = S.dragons.filter(d => !d.dead && !d.old);
    st = pool.sort((a, b) => (b.stage === 'yetiskin') - (a.stage === 'yetiskin') || b.bond - a.bond)[0] || S.dragons[0] || null;
    const had = S.star != null;
    S.star = st ? st.id : null;
    if (st) { delete st.role; if (had && typeof chron === 'function') chron(`${st.name} ocağın yeni yıldızı oldu.`); }
  }
  return st;
}
const isStar = d => !!d && S && S.star === d.id;
const roleOf = d => (d && !isStar(d) && d.role && ROLES[d.role] && ROLES[d.role].ok(d)) ? d.role : null;
// bu hafta rolü gerçekten işleyen mi? (elle iş verilmemiş, yaralı değil)
const supporting = d => !!roleOf(d) && !d.task && !d.inj && !d.dead;
// "görev bekliyor" sayılır mı? Rolü olan destekçi beklemez.
const needsOrder = d => canAct(d) && !supporting(d);

function supportPlan() {
  const g = { es: [], nese: [], avci: [], gozcu: [] };
  for (const d of S.dragons) if (supporting(d)) g[d.role].push(d);
  return g;
}

/* ---------- Haftalık işleyiş (endWeek içinden) ---------- */
// Yıldızın antrenman kazancına eklenecek pay
function starTrainBonus(d, k, g) {
  if (!isStar(d) || g <= 0) return { add: 0, line: null };
  const es = supportPlan().es.slice(0, 2);
  if (!es.length) return { add: 0, line: null };
  return { add: es.length, line: `${es.map(x => esc(x.name)).join(' ve ')} ile kapıştı (+${es.length}).` };
}
// Rolü olan destekçinin haftası. rep: onun satırları, starRep: yıldıza yazılacak satırlar
function supportWeek(d, rep, starRep, star) {
  const R = d.role;
  if (!star) { rep.push('Destek verecek bir yıldız yok; dinlendi.'); d.fat = Math.max(0, d.fat - 15); return; }
  const sk = star.task && star.task.t === 'train' ? star.task.k : null;
  if (R === 'es') {
    if (sk) {
      const i = supportPlan().es.indexOf(d);
      if (i >= 2) { rep.push(`Antrenman sahası dolu; ${esc(star.name)} iki eşle çalıştı, bu hafta kenarda bekledi.`); d.fat = Math.max(0, d.fat - 10); return; }
      const gain = d.st[sk] < capOf(d, sk) ? 1 : 0; d.st[sk] += gain;
      d.fat = clamp(d.fat + 8, 0, 100); addAff(d.id, star.id, 3); addBond(d, 1);
      rep.push(`${esc(star.name)} ile ${ST_AD[sk].toLowerCase()} kapıştı${gain ? `: <b class="good">${ST_KISA[sk]} +1</b>` : ''}. Yakınlıkları arttı.`);
    } else { rep.push(`${esc(star.name)} bu hafta çalışmadı; antrenman eşi boş kaldı ve dinlendi.`); d.fat = Math.max(0, d.fat - 15); }
  } else if (R === 'nese') {
    addAff(d.id, star.id, 4); d.fat = Math.max(0, d.fat - 10); if (chance(50)) addMood(d, 1);
    rep.push(`${esc(star.name)} ile oynadı, onu güldürdü.`);
  } else if (R === 'avci') {
    d.fat = clamp(d.fat + 6, 0, 100);
    const r = Math.random();
    if (r < 0.55) { const f = chance(70) ? 'balik' : pick(['biber', 'kar', 'mantar', 'yumru', 'zambak']); S.food[f] = (S.food[f] || 0) + 1; rep.push(`Avdan <b>${FOODS[f].ad}</b> getirdi (kilere eklendi).`); }
    else if (r < 0.9) { const g = ri(12, 28); S.gold += g; rep.push(`Avdan dönerken bir kervanı korudu: <b class="good">+${g} altın</b>.`); }
    else { rep.push('Ava çıktı ama eli boş döndü.'); }
  } else if (R === 'gozcu') {
    S.scout = { w: S.week + 1, by: d.id };
    rep.push(`Arenada rakipleri izledi; ${esc(star.name)} gelecek hafta dövüşürse onun notlarıyla girecek.`);
    d.fat = Math.max(0, d.fat - 5);
  }
}
// Yıldızın haftalık payı: neşe kaynaklarının etkisi ve yıldızlığın kendisi
function starWeek(star, rep) {
  if (!star || star.dead) return;
  const P = supportPlan();
  if (P.nese.length) {
    const before = star.fat; star.fat = Math.max(0, star.fat - 8 * Math.min(2, P.nese.length));
    if (chance(45 + 20 * Math.min(2, P.nese.length))) addMood(star, 1);
    rep.push(`${P.nese.map(x => esc(x.name)).join(' ve ')} onu oyalayıp neşelendirdi (yorgunluk ${before} iken ${star.fat} oldu).`);
  }
  addBond(star, 1);
}
// Gözcü notu: yıldız bu hafta dövüşürse
function scoutBuff(d, f) {
  if (!S.scout || S.scout.w !== S.week || !isStar(d)) return null;
  f.crit += 5; f.dodge += 5;
  const sc = byId(S.scout.by);
  return sc ? `${esc(sc.name)} rakibi izlemişti: isabet ve çeviklik notları elinde (kritik +5, kaçınma +5).` : null;
}

/* ---------- Arayüz ---------- */
function starBadge(d) {
  if (d.dead) return '';
  if (isStar(d)) return `<button class="starb" data-a="drawer-role" title="Ocağın yıldızı · destekçileri gör">${ui('un')} Yıldız</button>`;
  const r = roleOf(d);
  return `<button class="roleb ${r ? '' : 'none'}" data-a="drawer-role" title="Destek rolü">${r ? ROLES[r].ad : '+ Destek rolü ver'}</button>`;
}
function roleSub(d) {
  if (isStar(d)) return 'ocağın yıldızı';
  const r = roleOf(d);
  if (!r) return 'destek rolü seç';
  return d.task ? `${ROLES[r].kisa} · bu hafta elle iş` : ROLES[r].ad;
}
function roleDrawer(d) {
  const star = ensureStar();
  if (isStar(d)) {
    const P = supportPlan(), n = Object.values(P).reduce((a, x) => a + x.length, 0);
    const list = Object.keys(ROLES).map(k => `<li><b>${ROLES[k].ad}:</b> ${P[k].length ? P[k].map(x => esc(x.name)).join(', ') : '<span class="mute">kimse</span>'}</li>`).join('');
    return drawer(`${esc(d.name)} · ocağın yıldızı`, `<p class="sm">Yıldızı sen eğitir, sen dövüştürürsün. Ötekiler ona destek olur; rolleri her hafta kendiliğinden işler.</p>
      ${typeof careerCard === 'function' ? careerCard() : ''}<ul class="rolelist">${list}</ul><p class="mute sm">${n ? `${n} ejderha destek veriyor.` : 'Henüz destekçi yok. Başka bir ejderhayı seçip ona rol ver.'} Yıldızlık her hafta bağ +1 verir; zaferlerinde ün +1.</p>`, 'wide');
  }
  const segs = Object.keys(ROLES).map(k => { const R = ROLES[k], ok = R.ok(d); return `<button class="seg rolebtn ${d.role === k ? 'on' : ''}" data-a="setrole" data-k="${k}" ${ok ? '' : 'disabled'}><b>${R.ad}</b><small>${ok ? R.d : (d.stage === 'yavru' ? 'Yavrular yalnızca neşe kaynağı olabilir.' : d.old ? 'Yaşlılar hoca; bu işe güçleri yetmez.' : 'Yetişkin olunca açılır.')}</small></button>`; }).join('');
  return drawer(`${esc(d.name)} · destek rolü`, `<div class="rolehead"><p class="sm">Yıldız: <b>${star ? esc(star.name) : '—'}</b>. Rol bir kez seçilir, her hafta kendiliğinden işler. Elle iş verdiğin hafta rol bekler.</p><button class="btn ghost sm" data-a="makestar" ${d.dead || d.old ? 'disabled' : ''} title="${d.old ? 'Hocalar yıldız olamaz' : 'Yıldızın kariyeri yeniden kurulur'}">${ui('un')} Yıldız yap</button></div>
    <div class="segs roles">${segs}<button class="seg rolebtn ${!d.role ? 'on' : ''}" data-a="setrole" data-k=""><b>Rol yok</b><small>Her hafta ne yapacağını sen seçersin.</small></button></div>`, 'wide');
}
const STAR_ACT = {
  'drawer-role'() { UI.drawer = 'role'; SFX.play('tab'); render(); },
  setrole(el) { const d = byId(UI.sel), k = el.dataset.k; if (k) d.role = k; else delete d.role; SFX.play(k ? 'heart' : 'tab'); saveGame(); render(); },
  makestar() {
    const d = byId(UI.sel), old = byId(S.star); if (!d || d.dead || isStar(d) || d.old) return;
    S.star = d.id; delete d.role;
    if (old && !old.dead) { old.role = old.role || (ROLES.nese.ok(old) ? 'nese' : null); if (!old.role) delete old.role; }
    chron(`${d.name} ocağın yıldızı oldu.`); toast(`<b>${esc(d.name)}</b> artık ocağın yıldızı.${old && !old.dead ? ` ${esc(old.name)} ona neşe kaynağı olarak destek veriyor.` : ''}`, 'goal');
    saveGame(); render();
  },
};
