/* Ejder Ocağı 2.0 · sezon sonu ve nesil geçişi
   Sezon bitince oyun bitmez: kapanış sahnesi sezonu özetler, sonra yeni sezonun yıldızı seçilir ve soy sürer.
   Kurallar oyunun kendisidir: bitiş metinleri ve miras puanı eski endingModal ile aynıdır; aday listesi ve yeni sezona
   geçiş js/season.js'tir (seasonCandidates, seasonStart: yıldız hocalığa çekilir, ünün yarısı taşınır, rakipler güçlenir). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, app = document.getElementById('app'), OLD = G.OLD;
  /* seasonStart eski pencere kökünü temizler; 2.0'da böyle bir kök yok, boş bir yer tutucu yeterli */
  if (!document.getElementById('modal-root')) { const m = document.createElement('div'); m.id = 'modal-root'; m.hidden = true; app.appendChild(m); }
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const metin = () => ({
    taj: ['Kızıl Taç senin', 'Dedenin harabe ocağı yirmi haftada diyarın en ünlü ocağı oldu. Demirhan tribünde ayağa kalkıp seni alkışladı. O gece Kor\'un kuyruğu kuluçka ocağının taşlarına dolanmış uyudu.'],
    'tac-kayip': ['Taç bu yıl başkasının', 'Kızıl Taç\'a kadar geldin ama son adım tutmadı. Yine de meydanda senin ocağının adı konuşuluyor. Bahar yeniden gelecek.'],
    sezon: ['Sezon kapandı', S.un >= 45 ? 'Kızıl Taç davetiyen vardı ama arenaya çıkmadın. Ocak ayakta ve soyun büyüyor.' : 'Kızıl Taç davetiyesi için ünün yetmedi. Ocak ayakta; ejderhaların gelecek sezonu bekliyor.'],
    iflas: ['Ocak satıldı', 'Alacaklılar ocağın anahtarını aldı. Ejderhalar başka sahiplere dağıldı. Kor giderken dönüp sana uzun uzun baktı.'],
  }[S.ending] || ['Sezon bitti', 'Ocağın hikâyesi bu sezonluk burada kapanıyor.']);

  function varis(w, geri) { const st = byId(S.star), C = seasonCandidates(), eggs = S.eggs.filter(e => e.pids && st && e.pids.includes(st.id)).length; if (C.list.length === 1 && !UI.nextStar) UI.nextStar = C.list[0].id; if (UI.nextStar && !C.list.find(d => d.id === UI.nextStar)) UI.nextStar = null;
    const intro = st ? (C.kids ? '<b>' + esc(st.name) + '</b> bu sezonun sonunda hocalığa çekiliyor. Yeni sezonun yıldızı onun yavrularından biri olacak.' : '<b>' + esc(st.name) + '</b> hocalığa çekiliyor ama ondan bir yavru yok. Ocaktan bir aday seç; bir dahaki sefere soyunu sürdürmeyi unutma.') : 'Yeni sezonun yıldızını seç.';
    w.className = 'son varis'; w.innerHTML = '<div class="son-bas"><small>Nesil geçişi · ' + (seasonNo() + 1) + '. sezon</small><h1>Yeni sezonun yıldızı</h1><p>' + intro + (eggs ? ' Kuluçkada ondan ' + eggs + ' yumurta daha var.' : '') + '</p></div>' +
      (C.list.length ? '<div class="adaylar">' + C.list.map((d, i) => '<button type="button" class="aday" style="--el:' + G.ELC[d.el] + ';animation-delay:' + (i * 0.08) + 's" data-aday="' + d.id + '" aria-pressed="' + (UI.nextStar === d.id) + '"><img alt="" src="' + G.img(d) + '"><b>' + esc(d.name) + ' ' + (d.sex === 'F' ? '♀' : '♂') + '</b><small>' + EL_AD[d.el] + ' · ' + STAGE_AD[d.stage] + ' · ' + d.gen + '. nesil</small><span>' + STATS.map(k => ST_KISA[k] + ' <i class="harf g' + Math.floor((d.genes.pot[k][0] + d.genes.pot[k][1]) / 2) + '">' + potLetter(d.genes.pot[k][0] + d.genes.pot[k][1]) + '</i>').join(' ') + '</span></button>').join('') + '</div>'
        : '<p class="ah-not" style="justify-self:center">' + (S.eggs.length ? 'Ocakta yıldız olabilecek bir ejderha yok; yumurtalardan çıkan ilk yavru yıldız olur.' : 'Soyu sürdürecek ejderha ya da yumurta yok.') + '</p>') +
      '<div class="son-alt"><p class="son-not">Ocak, binalar, ejderhalar, yumurtalar ve soy kayıtları kalır. Ünün yarısı yeni sezona taşınır. Rakipler de güçlenerek yeni sezona geçer.</p><div><button type="button" class="gbtn" data-geri="1">Geri</button><button type="button" class="gbtn altin buyuk" data-git="1" ' + (C.list.length ? (UI.nextStar ? '' : 'disabled') : (S.eggs.length ? '' : 'disabled')) + '>' + (C.list.length ? (UI.nextStar ? esc(byId(UI.nextStar).name) + ' ile yeni sezona başla' : 'Bir aday seç') : 'Yeni sezona başla') + '</button></div></div>';
    on(w, '[data-aday]', b => { UI.nextStar = +b.dataset.aday; varis(w, geri); }); on(w, '[data-geri]', geri);
    on(w, '[data-git]', () => { const C2 = seasonCandidates(); if (C2.list.length && !UI.nextStar) return; const id = C2.list.length ? UI.nextStar : null; w.remove(); G.mesgul = false; G.live = true; seasonStart(id); if (G.fx) { G.fx.flash('rgba(255,240,180,.5)'); } if (EO2.api) EO2.api.titleCard(S.seasonNo + '. Sezon', 'Ejder Ocağı'); G.redraw(); }); }

  G.son = function () { return new Promise(res => { let w = document.getElementById('son'); if (w) w.remove(); w = document.createElement('div'); w.id = 'son'; app.appendChild(w); G.mesgul = true; G.close();
    if (S.ending === 'iflas') clearSave(); else saveGame();
    const ozet = () => { const E = metin(), gens = Math.max(1, ...S.dragons.map(d => d.gen), ...(S.dead || []).map(d => d.gen)), score = S.gold + S.un * 20 + S.dragons.reduce((a, d) => a + value(d), 0) + (S.ending === 'taj' ? 3000 : 0) + gens * 200;
      const best = S.dragons.slice().sort((a, b) => b.w - a.w)[0], canGo = S.ending !== 'iflas' && (S.dragons.some(d => !d.dead && !d.old) || S.eggs.length), past = (S.seasons || []).map(x => '<span>' + x.n + '. sezon: ' + (x.champ ? 'Kızıl Taç' : x.star ? esc(x.star) : '—') + '</span>').join('');
      const sayi = [[S.st.wins, 'zafer'], [S.un, 'ün'], [S.gold, 'altın'], [gens, 'nesil'], [S.st.hatch, 'yumurta'], [S.st.deaths, 'kayıp']];
      w.className = 'son ' + S.ending; w.style.setProperty('--sahne', 'url("' + (S.ending === 'taj' ? G.bgUrl('a:sabah') : S.ending === 'iflas' ? G.bgUrl('bg-ocak') : G.bgUrl('a:gece')) + '")');
      w.innerHTML = '<div class="son-bas"><small>' + seasonNo() + '. sezon · ' + (S.ending === 'iflas' ? 'son' : 'kapanış') + '</small><h1>' + E[0] + '</h1><p>' + E[1] + '</p></div>' +
        '<div class="son-orta"><div class="son-sayi">' + sayi.map((x, i) => '<span style="animation-delay:' + (0.5 + i * 0.12) + 's"><b data-say="' + x[0] + '">0</b>' + x[1] + '</span>').join('') + '</div>' +
          '<div class="son-galeri">' + [...S.dragons, ...(S.dead || [])].map((d, i) => '<div class="' + (d.diedW || d.dead ? 'gitti' : '') + '" style="animation-delay:' + (0.9 + i * 0.07) + 's"><img alt="" src="' + OLD + 'img/dr-' + d.el + '-' + d.stage + '.webp" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><b>' + esc(d.name) + '</b><small>' + (d.diedW || d.dead ? 'anısına' : d.gen + '. nesil · ' + d.w + ' G') + '</small></div>').join('') + '</div>' +
          '<div class="son-puan"><small>Miras puanı</small><b data-say="' + Math.round(score) + '">0</b>' + (best ? '<span>Ocağın yıldızı: ' + esc(best.name) + ' (' + best.w + ' zafer)</span>' : '') + '</div>' + (past ? '<div class="son-gecmis">' + past + '</div>' : '') + '</div>' +
        '<div class="son-alt"><div>' + (canGo ? '<button type="button" class="gbtn altin buyuk" data-surdur="1">Soyu sürdür<small>yeni sezon</small></button>' : '') + '<button type="button" class="gbtn" data-bas="1">Ana ekrana dön</button></div></div>';
      setTimeout(() => w.querySelectorAll('[data-say]').forEach(e => { if (G.fx) G.fx.count(e, 0, +e.dataset.say, 1100); else e.textContent = e.dataset.say; }), window.__fastFx ? 0 : 700);
      if (S.ending === 'taj' && G.fx) setTimeout(() => { G.fx.stars([app.clientWidth / 2, app.clientHeight * 0.3], 40); G.fx.flash('rgba(255,230,150,.45)'); }, 500);
      on(w, '[data-surdur]', () => { UI.nextStar = null; varis(w, ozet); });
      on(w, '[data-bas]', () => { w.remove(); G.mesgul = false; G.title(); res(); }); };
    ozet(); if (EO2.audio) EO2.audio.chime(); }); };
})();
