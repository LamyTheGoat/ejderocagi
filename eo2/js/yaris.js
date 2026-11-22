/* Ejder Ocağı 2.0 · Gök Yarışı
   İlan sahnesi 2.0'dır: ejderhan uçuş pozunda, seçili pistin manzarası ekranı kaplar, rakipler madalyonlardır.
   Yarışın kendisi oyunun kendi uçuş motorudur (js/race.js: fizik, halkalar, rüzgâr koridoru, atılım, ezeli rakip, ödüller);
   eski çizim katmanı barındırıcısında (eski.js) çalışır. Giriş ücreti, ödül ve ün race.js'ten gelir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  let sel = 0;
  const arka = () => !!(EO2.yaris3 && EO2.yaris3.acik()), arkadan = () => arka() && EO2.yaris3.kamera() === 'arka';
  function basla(f, r, practice) { if (arkadan()) EO2.yaris3.basla(f, r, practice); else EO2.yaris25.basla(f, r, practice); }
  G.screen('yaris', { k: 'Kanat kanada', t: 'Gök Yarışı', cls: 'yr', bg: 'bg-kayalik', draw(body) { const scr = document.getElementById('scr'), R = races();
    const elig = S.dragons.filter(d => canRace(d)); if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null; if (!UI.arenaSel && elig.length) UI.arenaSel = elig[0].id; const f = elig.find(d => d.id === UI.arenaSel) || null;
    if (!(sel >= 0 && sel < R.list.length)) sel = 0; const r = R.list[sel], V = r ? RACE_VENUES[r.venue] : null;
    scr.style.setProperty('--sahne', 'url("' + G.url('img/' + (V ? V.bg : 'bg-kayalik') + '.webp') + '")');
    const my = f ? raceSpeed(f.st.ce, f.st.da) : 0, zor = x => { const top = Math.max(...x.rivals.map(v => raceSpeed(v.ce, v.da))), ratio = my ? top / my : 9; return ratio < .92 ? ['kolay', 'Rüzgâr arkanda'] : ratio < 1.04 ? ['denk', 'Kıyasıya'] : ['zor', 'Zorlu pist']; };
    const ucus = d => d ? G.poz(d, 'P16') : '';
    body.innerHTML = (f ? '<div class="yr-ben" style="--el:' + G.ELC[f.el] + '"><img alt="" src="' + ucus(f) + '"><div class="ar-ad"><span class="ust">Yetişkin · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>Çeviklik ' + f.st.ce + ' · Dayanıklılık ' + f.st.da + (f.raceW ? ' · ' + f.raceW + ' birincilik' : '') + '</small></div></div>' : '<div class="ar-kilit bos" style="left:28%"><p>Yalnız boşta, yetişkin ejderhalar yarışır.</p></div>') +
      (elig.length > 1 ? '<div class="ar-kadro">' + elig.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      (r ? '<div class="yr-bilgi"><span class="ust">Gök yarışı · ' + r.len + ' saniyelik pist</span><h2>' + r.ad + '</h2>' + (f ? '<span class="damga2 ' + zor(r)[0] + '">' + zor(r)[1] + '</span>' : '') +
          '<div class="yr-rakipler">' + r.rivals.map(x => '<div class="yr-rakip' + (x.nem ? ' nem' : '') + '" title="' + esc(x.trainer) + ' · ' + RACE_STYLE[x.style || 'istikrarli'].d + '"><img alt="" src="' + OLD + 'img/dr-' + x.el + '-yetiskin.webp" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.el] + ' 55%, #151a2c), #151a2c 80%)"><div><b>' + esc(x.name) + (x.nem ? '<em>ezeli rakip</em>' : '') + '</b><small>Çev ' + x.ce + ' · ' + RACE_STYLE[x.style || 'istikrarli'].ad + '</small></div></div>').join('') + '</div>' +
          (S.nemesis ? '<p class="yr-nem">Ezeli rakibin <b>' + esc(S.nemesis.name) + '</b> · sen ' + S.nemesis.l + ' – ' + S.nemesis.w + '</p>' : '') +
          '<p class="yr-nasil">' + (arkadan() ? 'Ejderhanı sırtından yönet: dört yöne sür, halkaların içinden geç. Öndekinin rüzgâr izine girersen hız biriktirirsin; hırs dolunca atıl.' : 'Basılı tut, yüksel. Halkalar hırs verir; öndekinin rüzgâr koridoruna girersen hız biriktirirsin; hırs dolunca atıl.') + '</p>' +
          '<div class="yr-odul"><span>Birinciye <b class="au">' + r.odul[0] + ' altın</b></span><span>+' + r.un + ' ün</span></div>' +
          '<button type="button" class="gbtn altin buyuk" data-yaris="' + sel + '" ' + (f && S.gold >= r.fee ? '' : 'disabled') + '>' + (!f ? 'Yarışçı yok' : 'Yarışa gir') + '<small>giriş ' + r.fee + ' altın' + (f && S.gold < r.fee ? ' · yetmiyor' : '') + '</small></button></div>'
        : '<div class="yr-bilgi"><span class="ust">Gök yarışı</span><h2>Bu haftanın yarışları bitti</h2><p class="yr-nasil">Haftaya yeni pistler ilan edilir.</p></div>') +
      '<div class="yr-alt"><div class="kadro">' + R.list.map((x, i) => '<button type="button" class="madalyon bolge-m" data-pist="' + i + '" aria-pressed="' + (i === sel) + '"><img alt="" src="' + G.url('img/' + RACE_VENUES[x.venue].bg + '.webp') + '"><span>' + x.ad + '</span></button>').join('') + '</div>' +
        (arka() ? '<button type="button" class="gbtn" data-kam="1">Kamera: ' + (arkadan() ? 'sırtından' : 'yandan') + '<small>değiştirmek için dokun</small></button><button type="button" class="gbtn" data-arka="1" ' + (f ? '' : 'disabled') + '>Deneme uçuşu<small>sırtından · ödülsüz</small></button>' : '') + '<button type="button" class="gbtn" data-prac="1" ' + (f && !R.practiced ? '' : 'disabled') + '>' + (R.practiced ? 'Bu hafta uçtun' : 'Antrenman uçuşu') + '<small>ödülsüz · bağ +2, çeviklik +1</small></button></div>';
    on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); }); on(body, '[data-pist]', b => { sel = +b.dataset.pist; render(); });
    on(body, '[data-yaris]', b => { const x = races().list[+b.dataset.yaris]; if (!canRace(f) || !x || S.gold < x.fee) return; S.gold -= x.fee; basla(f, x, false); });
    on(body, '[data-kam]', () => { EO2.yaris3.kamera(arkadan() ? 'yan' : 'arka'); render(); });
    on(body, '[data-arka]', () => { if (f && arka()) EO2.yaris3.basla(f, races().list[sel] || null, false, { deneme: true }); });
    on(body, '[data-prac]', () => { if (canRace(f) && !races().practiced) basla(f, null, true); });
  } });
  const NAV = [['arena', 'Arena'], ['yaris', 'Gök Yarışı']]; G.navOf = Object.assign(G.navOf || {}, { arena: NAV, yaris: NAV });
})();
