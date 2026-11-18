/* Ejder Ocağı 2.0 · Hızlı seyahat (EO2.harita) · 2026-11-17
   Kasabanın boyalı haritası: bir yere dokununca terbiyeci oraya gider. Yürümek hâlâ serbesttir; harita yalnız kestirmedir.
   - Mini haritaya, yer adına ya da "Daha → Harita" düğmesine dokununca açılır. Klavye: G (H arayüzü gizler).
   - Seferdeyken (kamp, zindan savaşı), dövüşte ya da başka bir ocakta misafirken kapalıdır; nedenini söyler.
   - Yeni yer eklemek: YERLER'e bir satır (sahne kimliği, ad, açıklama, haritadaki yeri yüzde olarak). Sahne tanımı (EO2.sceneDefs) yoksa satır gösterilmez.
   Kural, ödül ya da bedel yoktur: seyahat ücretsizdir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, app = document.getElementById('app'); if (!G || !app) return;
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* [sahne, ad, açıklama, x %, y %] : yerler haritadaki çizimin üstüne oturur (eo2/assets/bg/harita.webp) */
  const YERLER = [
    ['ocak', 'Ocağın', 'Kuluçka, ahır, kendi arazin', 53, 70],
    ['meydan', 'Merkez Meydan', 'Çeşme, hedefler, öteki terbiyeciler', 50, 33],
    ['han', 'Han', 'Kıraathane, masa oyunları', 20, 17],
    ['pazar', 'Çarşı', 'Tezgâhlar, Bedesten, Kor Örsü', 79, 19],
    ['bahce', 'Ejder Bahçesi', 'Ejderhaların gezindiği bahçe', 15, 53],
    ['arena', 'Topçu Arenası', 'Talim, düello, zindan kapıları', 84, 47],
    ['yol', 'Kuzey Yolu', 'Kervan kampı, sefer yolu', 49, 7],
  ];
  /* Han, Çarşı ve Kuzey Yolu'nun yeni çizilmiş bölümleri varsa harita oraya götürür (meydandaki kapılar da oraya açılır); yoksa eski sahneye. */
  const YENI = { han: 'hanici', pazar: 'carsi', yol: 'kuzeyyolu' }, hedef = id => (YENI[id] && (EO2.sceneDefs || {})[YENI[id]]) ? YENI[id] : id;
  const var_ = id => id === 'ocak' ? !!(EO2.ocak && EO2.ocak.git) : id === 'meydan' || !!(EO2.sceneDefs || {})[hedef(id)];
  const yerler = () => YERLER.filter(y => var_(y[0]));
  const sahne = () => (EO2.api && EO2.api.scene && EO2.api.scene()) || '';
  const burada = id => { const s = sahne(); return s === id || s === hedef(id) || (id === 'meydan' && s === 'master'); };
  /* seyahat kapalıysa nedeni (açıksa boş) */
  function engel() { if (!G.live) return 'Oyun açık değil.'; if (EO2.battle && EO2.battle.active()) return 'Savaş sürerken seyahat edilmez.';
    const o = EO2.ortak && EO2.ortak.durum().oda; if (sahne() === 'kamp' || (o && o.tur === 'zindan' && o.durum === 'oyunda')) return 'Seferdesin. Önce seferi bitir ya da seferden ayrıl.';
    if (o && o.durum === 'oyunda') return 'Oyun sürerken seyahat edilmez.';
    if (EO2.ziyaret && EO2.ziyaret.evSahibi && EO2.ziyaret.evSahibi()) return 'Başka bir ocakta misafirsin. Kapıdan çıkınca seyahat edebilirsin.'; return ''; }
  async function git(id) { const e = engel(); if (e) { G.toast(esc_(e)); return false; } if (!var_(id)) return false; if (G.ekran && G.ekran()) G.close(); if (burada(id)) return true;
    if (EO2.audio && EO2.audio.whoosh) EO2.audio.whoosh();
    if (id === 'ocak') { await EO2.ocak.git(); return true; } if (EO2.api.go) EO2.api.go(hedef(id)); else EO2.api.runAct('go:' + hedef(id)); return true; }
  function ac() { const e = engel(); if (e) { G.toast(esc_(e)); return; } G.open('harita'); }

  G.screen('harita', { k: 'Hızlı seyahat', t: 'Harita', cls: 'hr', bg: 'a:harita', draw(body) {
    body.innerHTML = '<div class="hr-kok"><div class="hr-pano"><img class="hr-resim" alt="" src="' + G.bgUrl('a:harita') + '">' + yerler().map(y => '<button type="button" class="hr-yer' + (burada(y[0]) ? ' burada' : '') + '" data-git="' + y[0] + '" style="left:' + y[3] + '%;top:' + y[4] + '%" aria-label="' + esc_(y[1]) + (burada(y[0]) ? ' (buradasın)' : '') + '"><i aria-hidden="true"></i><b>' + esc_(y[1]) + '</b><small>' + (burada(y[0]) ? 'Buradasın' : esc_(y[2])) + '</small></button>').join('') + '</div>' +
      '<p class="hr-not">Bir yere dokun: oraya gidersin. Seyahat ücretsizdir; yürümek de serbest.</p></div>';
    body.querySelectorAll('[data-git]').forEach(b => b.addEventListener('click', () => { if (EO2.audio && EO2.audio.ui) EO2.audio.ui(); git(b.dataset.git); }));
  } });

  /* girişler: mini harita, yer adı, H tuşu */
  for (const sec of ['#mini', '.minimap .loc']) { const el = document.querySelector(sec); if (el) { el.style.cursor = 'pointer'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('title', 'Harita: hızlı seyahat (G)'); el.addEventListener('click', () => { if (G.live) ac(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (G.live) ac(); } }); } }
  addEventListener('keydown', e => { if (!G.live || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'g' && e.key !== 'G')) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; if (EO2.battle && EO2.battle.active()) return;
    if (G.ekran && G.ekran() === 'harita') G.close(); else if (!(G.ekran && G.ekran()) && !document.querySelector('.pen')) ac(); });
  EO2.harita = { ac, git, yerler: () => yerler().map(y => ({ id: y[0], ad: y[1] })), engel };
})();
