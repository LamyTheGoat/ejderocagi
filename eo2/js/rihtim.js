/* Ejder Ocağı 2.0 · Rıhtım: kısa eylem çubuğu + açılır tepsi
   Çubukta yalnız en sık kullanılan dört yer durur (Ocak, Ejderhalar, Arena, Görevler); gerisi "Daha" düğmesinin
   açtığı tepside toplanır. Tepsi dışarı tıklanınca, Esc'te ya da bir yer seçilince kapanır.
   Örnek alınan düzen: FF14 ana menüsü ve Genshin'in tek düğmeyle açılan menü tepsisi. */
(function () {
  'use strict';
  const EO2 = window.EO2, bar = document.getElementById('actions'); if (!EO2 || !bar) return;
  /* dünya kurulup kendi düğmelerini bağladıktan sonra kurulur (EO2.api o zaman oluşur) */
  (function bekle() { if (EO2.api) kur(); else setTimeout(bekle, 120); })();
  function kur() {
  const ICON = EO2.icons || {};
  /* [panel kimliği, ad, yer tutucu simge, açılacak ekran (yoksa panel yönlendirmesi)] */
  const KISA = ['ocak', 'ejderhalar', 'arena', 'gorevler'];
  const TEPSI = [['topcu', 'Topçu', 'triple', 'topcu'], ['pazar', 'Çarşı', 'pin', 'pazar'], ['envanter', 'Envanter', 'bag'], ['kusam', 'Kuşam', 'people', 'gorunus'], ['harita', 'Harita', 'pin', 'harita'], ['sosyal', 'Han', 'people'], ['dostlar', 'Dostlar', 'people', 'dostlar'], ['menu', 'Menü', 'gear']];
  const YENI = { arena: ['Arena', 'swords', 'arena'] };

  function ac(id, ekran) {
    const G = EO2.game, A = EO2.api;
    if (!ekran && EO2.rehber && EO2.rehber.kilitEngel && EO2.rehber.kilitEngel(id)) return;   // ilk hafta kilidi: ekranlar G.open'da, paneller burada sorulur
    if (ekran && G && G.live && G.open) { if (A && A.closePanel) A.closePanel(); G.open(ekran); return; }
    if (EO2.hooks && EO2.hooks.panel && EO2.hooks.panel(id)) return;
    if (A && A.openPanel) A.openPanel(id);
  }
  function dugme(id, ad, simge, ekran) {
    let b = bar.querySelector('button[data-panel="' + id + '"]');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.dataset.panel = id; b.dataset.yeni = '1'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="ic">' + (ICON[simge] || '') + '</span><span>' + ad + '</span>'; b.addEventListener('click', () => ac(id, ekran)); }
    else if (ad) b.lastElementChild.textContent = ad;
    return b;
  }

  const tepsi = document.createElement('div'); tepsi.id = 'actionsMore'; tepsi.setAttribute('role', 'menu'); tepsi.setAttribute('aria-label', 'Öteki yerler'); tepsi.hidden = true;
  for (const [id, ad, simge, ekran] of TEPSI) { const b = dugme(id, ad, simge, ekran); b.setAttribute('role', 'menuitem'); tepsi.appendChild(b); }
  const kisa = KISA.map(id => YENI[id] ? dugme(id, ...YENI[id]) : dugme(id));
  const daha = document.createElement('button'); daha.type = 'button'; daha.id = 'actionsDaha'; daha.setAttribute('aria-haspopup', 'menu'); daha.setAttribute('aria-expanded', 'false'); daha.setAttribute('aria-controls', 'actionsMore');
  daha.innerHTML = '<span class="ic">' + (ICON.grid || '') + '</span><span>Daha</span>';
  /* Üretim (Kor Örsü) 2.0'da henüz kurulmadı: yer tutucu düğme gösterilmez */
  /* dar ekranda dünyada Haftayı Bitir düğmesi yok: tepsiye eklenir (yalnız telefonda görünür, bkz. cila.css) */
  const hafta = document.createElement('button'); hafta.type = 'button'; hafta.id = 'actionsHafta'; hafta.setAttribute('role', 'menuitem');
  hafta.innerHTML = '<span class="ic">' + (ICON.moon || '') + '</span><span>Haftayı Bitir</span>'; hafta.addEventListener('click', () => { if (EO2.game && EO2.game.endWeek) EO2.game.endWeek(); }); tepsi.appendChild(hafta);
  bar.replaceChildren(...kisa, daha, tepsi); bar.classList.add('kisa');

  function kapat() { if (tepsi.hidden) return; bar.classList.remove('acik'); daha.setAttribute('aria-expanded', 'false'); setTimeout(() => { if (!bar.classList.contains('acik')) tepsi.hidden = true; }, 180); }
  function acTepsi() { tepsi.hidden = false; void tepsi.offsetWidth; bar.classList.add('acik'); daha.setAttribute('aria-expanded', 'true'); }
  daha.addEventListener('click', e => { e.stopPropagation(); bar.classList.contains('acik') ? kapat() : acTepsi(); });
  tepsi.addEventListener('click', e => { if (e.target.closest('button')) kapat(); });
  document.addEventListener('pointerdown', e => { if (!bar.contains(e.target)) kapat(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') kapat(); });
  /* Çarşı ekranları tek sekme takımında: NPC tezgâhları, oyuncular arası Bedesten, müzayede, sipariş ve sandık */
  if (EO2.game) { const CARSI = [['pazar', 'Gece Çarşısı'], ['bedesten', 'Bedesten'], ['muzayede', 'Mermer Salon'], ['siparis', 'Sipariş Panosu'], ['sandik', 'Ocak Sandığı']];
    EO2.game.navOf = Object.assign(EO2.game.navOf || {}, { pazar: CARSI, bedesten: CARSI, muzayede: CARSI, siparis: CARSI, sandik: CARSI }); }
  EO2.rihtim = { ac: acTepsi, kapat };
  }
})();
