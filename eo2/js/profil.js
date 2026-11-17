/* Ejder Ocağı 2.0 · Oyuncu profili (EO2.profil)
   Sunucu tarafı: server/profil_service.js. Oyuncu kendi künyesini (ad, kuşam, hafta, ün, ejderha sayısı, yıldız ejderha, sayaçlar)
   bildirir; başka bir terbiyecinin kartı sorulunca sunucudaki son künye gelir. Yalnız gösterimdir: oyun kuralına girmez.
   Giriş: meydandaki oyuncu kartı, Dostlar kartı, parti çerçevesi; kendi künyen için Dostlar ekranındaki "Künyem". */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cins = s => s === 'F' ? '♀' : '♂', EVRE = { yavru: 'Yavru', genc: 'Genç', yetiskin: 'Yetişkin' }, elAd = e => (typeof EL_AD !== 'undefined' && EL_AD[e]) || e;
  let son = '', acik = false; const bekleyen = new Map();
  function benim() { if (typeof S === 'undefined' || !S || !S.dragons) return null; const canli = S.dragons.filter(d => !d.dead), y = (typeof byId === 'function' && S.star != null && byId(S.star)) || canli[0] || null, st = S.st || {};
    return { ad: G.ad ? G.ad() : 'Gezgin', set: (EO2.api && EO2.api.player && EO2.api.player.set) || 'temel', gor: EO2.gorunum ? EO2.gorunum.kod() : '', hafta: S.week || 1, un: Math.floor(S.un || 0), ejder: canli.length,
      yildiz: y && !y.dead ? { name: y.name, el: y.el, stage: y.stage, sex: y.sex } : null, st: { wins: st.wins || 0, losses: st.losses || 0, kupa: st.kupa || 0, bred: st.bred || 0, hatch: st.hatch || 0, seferler: st.seferler || 0, raceWins: st.raceWins || 0 } }; }
  function bildir() { if (!G.live || !AG.cevrimici()) return; const p = benim(); if (!p) return; const j = JSON.stringify(p); if (j === son) return; if (AG.gonder({ type: 'profil', p })) son = j; }
  setInterval(bildir, 5000); AG.dinle('durum', d => { if (d === 'cevrimici') { son = ''; setTimeout(bildir, 800); } });
  AG.dinle('profil_kart', m => { const f = m && bekleyen.get(m.h); if (f) { bekleyen.delete(m.h); f(m); } });
  const sor = h => new Promise(res => { bekleyen.set(h, res); if (!AG.gonder({ type: 'profil_iste', h })) { bekleyen.delete(h); return res(null); } setTimeout(() => { if (bekleyen.get(h) === res) { bekleyen.delete(h); res(null); } }, 4000); });

  const rozet = (ik, n, ad) => '<span class="pf-rozet"><img alt="" src="assets/ik/' + ik + '.webp"><b>' + n + '</b><small>' + ad + '</small></span>';
  function govde(p, durum) { const y = p.yildiz;
    return '<div class="pf-kart"><div class="pf-ust"><canvas class="pf-yuz" width="168" height="168" aria-hidden="true"></canvas><div class="pf-kim"><small>Terbiyeci</small><b>' + esc_(p.ad) + '</b><span>' + p.hafta + '. hafta · ' + p.ejder + ' ejderha</span><span class="pf-un"><img alt="" src="assets/ik/un.webp">' + p.un + ' ün</span>' + (durum ? '<em class="pf-durum' + (durum === 'Çevrimiçi' ? ' acik' : '') + '">' + durum + '</em>' : '') + '</div></div>' +
      (y ? '<div class="pf-yildiz" style="--el:' + ((G.ELC && G.ELC[y.el]) || '#f6d98a') + '"><img alt="" src="' + G.img(y) + '"><div><small>Yıldız ejderhası</small><b>' + esc_(y.name) + ' ' + cins(y.sex) + '</b><span>' + elAd(y.el) + ' · ' + EVRE[y.stage] + '</span></div></div>' : '') +
      '<div class="pf-rozetler">' + rozet('mdl-arena', p.st.wins, 'zafer') + rozet('mdl-kupa', p.st.kupa, 'kupa') + rozet('mdl-yumurta', p.st.bred + p.st.hatch, 'yumurta') + rozet('mdl-sefer', p.st.seferler, 'sefer') + rozet('mdl-ejder', p.st.raceWins, 'yarış') + '</div></div>'; }
  async function ac(h, ad) { if (acik) return; const kendim = !h || (AG.kimlik() && AG.kimlik().handle === h); let p = null, durum = '';
    if (kendim) p = benim(); else { const m = await sor(h); p = m && m.p; durum = m ? (m.cevrimici ? 'Çevrimiçi' : 'Çevrimdışı') : ''; }
    if (!p) { G.toast(esc_(ad || 'Bu terbiyeci') + ' için künye bulunamadı; çevrimiçi olunca görünür.'); return; }
    const dost = !kendim && EO2.dostlar && EO2.dostlar.dostMu(h), parti = !kendim && EO2.parti && durum === 'Çevrimiçi' && !EO2.parti.uyeMi(h);
    acik = true; const v = await G.pen({ k: kendim ? 'Künyen' : 'Künye', t: esc_(p.ad), body: govde(p, durum),
      on(el) { el.classList.add('pf-pen'); const cv = el.querySelector('.pf-yuz'); try { EO2.api.drawPortrait(cv, p.set, 0.66, kendim ? true : (p.gor || h)); } catch (_) { cv.hidden = true; } },
      btns: [{ t: 'Kapat', v: false }, ...(!kendim && EO2.dostlar && !dost ? [{ t: 'Dost ekle', v: 'dost' }] : []), ...(parti ? [{ t: 'Partiye çağır', cls: 'altin', v: 'parti' }] : [])] }); acik = false;
    if (v === 'dost') EO2.dostlar.ekle(h, p.ad); else if (v === 'parti') EO2.parti.davet(h, p.ad); }
  EO2.profil = { ac, benim, bildir };
})();
