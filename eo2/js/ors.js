/* Ejder Ocağı 2.0 · Kor Örsü (EO2.ors) · 2026-11-17
   Usta Kerim'in örsünde terbiyecinin Ejder Topu dövülür. Kurallar ve sayılar js/ors_kural.js'tedir (EO2_ORS); bu dosya ekranı ve çekiç oyununu kurar.
   AKIŞ: bedel peşin ödenir (kor taşı + altın) → TAV: ibre kor çubuğunda gidip gelir, üç çekiç darbesi indirilir (düğme ya da boşluk tuşu) →
     örs kararını verir (davul sesi, kıvılcım) → sonuç damgası: tuttu / usta işi (+2) / kayıpsız / kademe düştü / TOP ÇATLADI / Anka korudu.
   Kumar: "Körüğe yüklen" ibreyi hızlandırır; altın kor daha çok kazandırır, soğuk darbe daha çok götürür.
   Kayıt: S.ors = { kademe, catlak, deneme, zirve }. Kor taşları Topçu ganimetindedir (S.topcu.ganimet); altın S.gold'dan düşer
   (tezgâh alışverişiyle aynı yol: js/ag.js keseyi sunucuyla eşitler). Topçunun hasarı ve canı kademeye göre artar (js/topcu.js oyuncuDeger).
   Girişler: Gece Çarşısı → Usta Kerim'in tezgâhı → "Kor Örsü" · Usta Kerim'le konuşunca "Örse bak". */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, K = window.EO2_ORS;
  if (!EO2 || !G || !K) return;
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TAS_AD = { kor_t1: 'Kıvılcım Kor Taşı', kor_t2: 'Harlı Kor Taşı', kor_t3: 'Kadim Magma Taşı', anka_koruma: 'Anka Mühür Taşı' };
  const BOLGE = { guvenli: ['Güvenli kademe', 'Tutmazsa kayıp yok.'], harli: ['Harlı kademe', 'Tutmazsa bir kademe düşer.'], cehennem: ['Cehennem kademesi', 'Tutmazsa top çatlar!'] };
  const D = () => { S.ors = S.ors && typeof S.ors === 'object' ? S.ors : {}; const d = S.ors; d.kademe = Math.max(0, Math.min(K.EN_COK, d.kademe | 0)); d.catlak = !!d.catlak; d.deneme = d.deneme | 0; d.zirve = Math.max(d.zirve | 0, d.kademe); return d; };
  const heybe = () => { S.topcu = S.topcu || {}; S.topcu.ganimet = S.topcu.ganimet || {}; return S.topcu.ganimet; };
  const var_ = k => Math.max(0, heybe()[k] | 0), ses = (k, v) => { const a = EO2.audio; try { if (a && a[k]) a[k](v); } catch (_) { } };
  const kaydet = () => { if (typeof saveGame === 'function') saveGame(); if (G.hud) G.hud(); };
  const yuzde = k => Math.round(k * K.ARTIS * 100);
  const U = { faz: 'bos', vuruslar: [], koruk: false, anka: false, t0: 0, raf: 0, son: null, kademe0: 0 };   // ekranın geçici durumu

  /* ---------- kurallar: bedel, deneme, onarım ---------- */
  const yeter = s => !!s && var_(s.tas) >= s.adet && S.gold >= s.altin;
  const ankaGerek = s => !!s && s.bolge !== 'guvenli';
  function ode(s, anka) { heybe()[s.tas] = var_(s.tas) - s.adet; S.gold -= s.altin; if (anka) heybe().anka_koruma = var_('anka_koruma') - 1; D().deneme++; kaydet(); }
  function uygula(r) { const d = D(); d.kademe = r.kademe; d.catlak = r.catlak; d.zirve = Math.max(d.zirve, d.kademe); kaydet(); }
  /* denemeyi oyunsuz, verilen darbe ve zarla işler (denetim betikleri ve hızlı kip için) */
  function dene(o) { o = o || {}; const d = D(), s = K.sira(d.kademe); if (d.catlak || !s || !yeter(s)) return null; const anka = !!o.anka && ankaGerek(s) && var_('anka_koruma') > 0;
    ode(s, anka); const r = K.sonuc(d.kademe, { vuruslar: o.vuruslar || [], koruk: !!o.koruk, anka, zar: typeof o.zar === 'number' ? o.zar : Math.random() * 100 }); uygula(r); return r; }
  function onar() { const d = D(), O = K.ONARIM; if (!d.catlak || var_(O.tas) < O.adet || S.gold < O.altin) return false; heybe()[O.tas] = var_(O.tas) - O.adet; S.gold -= O.altin; d.kademe = K.onarilmis(d.kademe); d.catlak = false; kaydet(); return true; }

  /* ---------- ekran ---------- */
  const ibre = () => { const tur = K.TAV[U.koruk ? 'koruk' : 'olagan'].tur, f = ((performance.now() - U.t0) / tur) % 2; return 1 - Math.abs(f - 1); };
  const resim = k => G.url('img/ui/items/stone_' + k + '.webp');
  const SONUC = { tuttu: ['Tuttu!', 'iyi'], usta: ['Usta işi!', 'usta'], kayipsiz: ['Tutmadı', 'soluk'], dustu: ['Kademe düştü', 'kotu'], catladi: ['Top çatladı!', 'felaket'], anka: ['Anka korudu', 'anka'] };
  function ekran() { const d = D(), s = K.sira(d.kademe), h = heybe(), sans0 = s ? K.sans(d.kademe, U.faz === 'tav' ? U.vuruslar : [], U.koruk) : 0, b = s && BOLGE[s.bolge];
    const taslar = K.TAS.map(k => '<span class="or-tas' + (s && s.tas === k ? ' gerek' + (var_(k) >= s.adet ? '' : ' eksik') : '') + '" title="' + TAS_AD[k] + '"><img alt="" src="' + resim(k) + '"><b>' + var_(k) + '</b><small>' + TAS_AD[k] + '</small></span>').join('');
    const darbeler = [0, 1, 2].map(i => '<i class="or-darbe ' + (U.vuruslar[i] || '') + '"></i>').join('');
    let eylem = '';
    if (U.faz === 'tav') eylem = '<button type="button" class="gbtn altin buyuk or-vur" data-or="vur">Çekici indir<small>' + (3 - U.vuruslar.length) + ' darbe kaldı · boşluk tuşu</small></button>';
    else if (U.faz === 'karar') eylem = '<p class="or-bekle">Örs kararını veriyor…</p>';
    else if (U.faz === 'sonuc') eylem = '<button type="button" class="gbtn altin buyuk" data-or="tamam">Devam</button>';
    else if (d.catlak) { const O = K.ONARIM, ok = var_(O.tas) >= O.adet && S.gold >= O.altin; eylem = '<p class="or-uyari">Top çatlak: kademesi işlemiyor. Onarılınca <b>+' + K.onarilmis(d.kademe) + '</b> kademede döner.</p><button type="button" class="gbtn altin buyuk" data-or="onar" ' + (ok ? '' : 'disabled') + '>Topu onar<small>' + O.altin + ' altın · ' + O.adet + ' ' + TAS_AD[O.tas] + (ok ? '' : ' · yetmiyor') + '</small></button>'; }
    else if (!s) eylem = '<p class="or-zirve">Zirve kademesi. Bu top artık dövülmez; yalnız parlar.</p>';
    else eylem = '<div class="or-ayar"><label class="or-sec' + (U.koruk ? ' acik' : '') + '"><input type="checkbox" data-or-sec="koruk" ' + (U.koruk ? 'checked' : '') + '><span><b>Körüğe yüklen</b><small>İbre hızlanır. Altın kor +' + K.TAV.koruk.altin + ', soğuk darbe ' + K.TAV.koruk.soguk + '.</small></span></label>' +
        (ankaGerek(s) ? '<label class="or-sec' + (U.anka ? ' acik' : '') + (var_('anka_koruma') ? '' : ' yok') + '"><input type="checkbox" data-or-sec="anka" ' + (U.anka ? 'checked' : '') + ' ' + (var_('anka_koruma') ? '' : 'disabled') + '><span><b>Anka Mührü bas</b><small>' + (var_('anka_koruma') ? 'Bir mühür harcanır. Tutmazsa kademe düşmez, top çatlamaz.' : 'Mührün yok. Zindan çarklarından düşer.') + '</small></span></label>' : '') + '</div>' +
      '<button type="button" class="gbtn altin buyuk" data-or="basla" ' + (yeter(s) ? '' : 'disabled') + '>Dövmeye başla<small>' + s.adet + ' ' + TAS_AD[s.tas] + ' · ' + s.altin + ' altın' + (yeter(s) ? '' : ' · yetmiyor') + '</small></button>';
    const sn = U.son && SONUC[U.son.olay];
    return '<div class="or-kok faz-' + U.faz + (d.catlak ? ' catlak' : '') + (s ? ' b-' + s.bolge : ' zirve') + '">' +
      '<div class="or-sol"><div class="or-top k' + (d.kademe >= 12 ? 3 : d.kademe >= 7 ? 2 : d.kademe >= 4 ? 1 : 0) + '" id="orTop"><img alt="" src="assets/ik/ejder-topu.webp"><b>+' + d.kademe + '</b>' + (d.catlak ? '<em>ÇATLAK</em>' : '') + '</div>' +
        '<h2>' + esc_(K.AD(d.kademe)) + '</h2><p class="or-etki">' + (d.catlak ? 'Çatlak: artış işlemiyor' : d.kademe ? 'Topçu hasarı ve canı <b>+%' + yuzde(d.kademe) + '</b>' : 'Henüz dövülmedi') + '</p>' +
        '<div class="or-taslar">' + taslar + '</div><p class="or-kaynak">Kor taşları ve Anka Mührü zindan ganimetinden çıkar.</p></div>' +
      '<div class="or-sag">' + (s && !d.catlak ? '<div class="or-hedef"><small>Sıradaki kademe</small><b>+' + d.kademe + ' <i>➔</i> +' + (d.kademe + 1) + '</b><span>Hasar ve can +%' + yuzde(d.kademe + 1) + '</span></div>' +
          '<div class="or-risk"><b>' + b[0] + '</b><span>' + b[1] + '</span></div>' +
          '<div class="or-sans"><small>Tutma şansı</small><b id="orSans">%' + sans0 + '</b><div class="or-cubuk"><i style="width:' + sans0 + '%"></i></div></div>' : '') +
        '<div class="or-tav" id="orTav"><div class="or-kor"><i class="sicak"></i><i class="altin"></i><u id="orIbre"></u></div><div class="or-darbeler">' + darbeler + '</div></div>' +
        '<div class="or-eylem">' + eylem + '</div></div>' +
      (U.faz === 'sonuc' && sn ? '<div class="or-damga ' + sn[1] + '"><b>' + sn[0] + '</b><span>' + sonucYazi(U.son) + '</span></div>' : '') + '</div>'; }
  const sonucYazi = r => r.olay === 'usta' ? 'Üç darbe de altın kora indi: top iki kademe birden yükseldi, +' + r.kademe + '.' : r.olay === 'tuttu' ? 'Top +' + r.kademe + ' kademeye yükseldi.' : r.olay === 'kayipsiz' ? 'Metal tutmadı. Güvenli kademede kayıp yok; taş ve altın gitti.' : r.olay === 'dustu' ? 'Metal çatırdadı: top +' + r.kademe + ' kademeye geriledi.' : r.olay === 'anka' ? 'Metal tutmadı ama Anka Mührü topu korudu: +' + r.kademe + ' kademede kaldı.' : 'Örs acımadı. Top çatladı: onarılana dek kademesi işlemez.';
  function basla() { const d = D(), s = K.sira(d.kademe); if (U.faz !== 'bos' || d.catlak || !yeter(s)) return; U.anka = U.anka && ankaGerek(s) && var_('anka_koruma') > 0; U.kademe0 = d.kademe;
    ode(s, U.anka); U.faz = 'tav'; U.vuruslar = []; U.t0 = performance.now(); U.son = null; ses('charge', 0.6); G.redraw(); dongu(); }
  function dongu() { cancelAnimationFrame(U.raf); const adim = () => { const el = document.getElementById('orIbre'); if (!el || U.faz !== 'tav') return; el.style.left = (ibre() * 100) + '%'; U.raf = requestAnimationFrame(adim); }; U.raf = requestAnimationFrame(adim); }
  function vur() { if (U.faz !== 'tav' || U.vuruslar.length >= 3) return; const v = K.vurus(ibre()); U.vuruslar.push(v); ses(v === 'altin' ? 'chime' : v === 'sicak' ? 'hit' : 'pop');
    const top = document.getElementById('orTop'), fx = G.fx; if (fx && top) { fx.burst(top, v === 'altin' ? '#ffe08a' : v === 'sicak' ? '#ff9a4a' : '#9aa0b8', v === 'altin' ? 26 : v === 'sicak' ? 14 : 6); if (v !== 'soguk') fx.shake(document.querySelector('.or-kok'), v === 'altin'); }
    if (U.vuruslar.length < 3) { U.t0 = performance.now() - Math.random() * 400; G.redraw(); dongu(); return; }
    U.faz = 'karar'; G.redraw(); ses('whoosh'); setTimeout(karar, window.__fastFx ? 60 : 1100); }
  function karar() { if (U.faz !== 'karar') return; const zar = typeof window.__orsZar === 'number' ? window.__orsZar : Math.random() * 100;
    const r = K.sonuc(U.kademe0, { vuruslar: U.vuruslar, koruk: U.koruk, anka: U.anka, zar }); uygula(r); U.son = r; U.faz = 'sonuc'; G.redraw();
    const fx = G.fx, top = document.getElementById('orTop');
    if (r.tuttu) { ses('win', true); if (fx && top) { fx.burst(top, '#ffe08a', r.usta ? 70 : 40); fx.flash(r.usta ? 'rgba(255,224,138,.5)' : 'rgba(255,240,200,.3)'); if (r.usta) fx.shake(document.querySelector('.or-kok'), true); } if (typeof chron === 'function' && (r.kademe === 7 || r.kademe === 10 || r.kademe === 12)) chron('Ejder Topu +' + r.kademe + ' kademeye dövüldü.'); }
    else if (r.olay === 'catladi') { ses('boom', 0.9); ses('win', false); if (fx && top) { fx.burst(top, '#ff5a3a', 60); fx.flash('rgba(255,70,40,.4)'); fx.shake(document.querySelector('.or-kok'), true); } }
    else if (r.olay === 'anka') { ses('chime'); if (fx && top) { fx.burst(top, '#ffb3cc', 36); fx.flash('rgba(255,200,220,.3)'); } }
    else ses('pop'); }
  function tamam() { U.faz = 'bos'; U.vuruslar = []; U.son = null; U.anka = false; G.redraw(); }
  addEventListener('keydown', e => { if (G.ekran && G.ekran() === 'ors' && (e.code === 'Space' || e.key === ' ') && U.faz === 'tav') { e.preventDefault(); e.stopPropagation(); vur(); } }, true);

  G.screen('ors', { k: 'Usta Kerim', t: 'Kor Örsü', cls: 'or', bg: 'bg-pazar', enter() { if (U.faz !== 'tav' && U.faz !== 'karar') { U.faz = 'bos'; U.vuruslar = []; U.son = null; } }, draw(body) {
    body.innerHTML = ekran();
    body.querySelectorAll('[data-or]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.or; if (k === 'basla') basla(); else if (k === 'vur') vur(); else if (k === 'tamam') { ses('ui'); tamam(); } else if (k === 'onar') { if (onar()) { ses('chime'); G.toast('Top onarıldı: +' + D().kademe + ' kademe.'); } G.redraw(); } }));
    body.querySelectorAll('[data-or-sec]').forEach(c => c.addEventListener('change', () => { ses('ui'); U[c.dataset.orSec] = c.checked; G.redraw(); }));
    if (U.faz === 'tav') dongu();
  } });
  /* Usta Kerim'le konuşunca çıkan "Örse bak" ve dünyadaki üretim eylemi örsü açar */
  (function bagla() { if (!EO2.hooks || !EO2.hooks.act) return setTimeout(bagla, 150); const a0 = EO2.hooks.act; EO2.hooks.act = act => { if (act === 'panel:uretim' || act === 'ors') { G.open('ors'); return true; } return a0 ? a0(act) : false; }; })();
  EO2.ors = { durum: D, dene, onar, carpan: () => K.carpan(typeof S !== 'undefined' && S ? D() : null), ekranDurumu: () => U };
})();
