/* Ejder Ocağı 2.0 · Takım Meydanı (EO2.takim): ejder topçusu 2v2 (2026-11-17)
   Sunucu: server/takim_ortak.js (ortak oda altyapısının "takim" türü). Ortak zindanla aynı kurallar: tek arena, sıra ve can sunucuda,
   aksiyon bütün ekranlarda aynı, düşen oyuncu arenada kalıp izler. Ödül yok.
   Girişler: Topçu ekranındaki Er Meydanı künyesinde "Takım Meydanı 2v2" düğmesi → sıraya gir (herkese açık eşleşme), oda kur (kod), kodla katıl.
   Odaya giriş sırası takımı belirler: 1. ve 3. Mavi (solda), 2. ve 4. Kızıl (sağda).
   Meydan: eo2/arenalar/er-meydani varsa oradan (tek arena yükleyicisi), yoksa talim meydanı. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, OR = EO2 && EO2.ortak, B = EO2 && EO2.battle, T = EO2 && EO2.topcu, V = EO2 && EO2.topcuVeri;
  if (!G || !AG || !OR || !B || !T || !V) return;
  const Z = { hata: '', savas: false, sonuc: null, konumT: 0 };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HATA = { zaten_odada: 'Zaten bir odada, seferde ya da masadasın.', oda_yok: 'Bu kodla bir oda yok.', oda_mesgul: 'O odada maç sürüyor.', oda_dolu: 'Oda dolu (dört kişi).', yalniz_kurucu: 'Maçı odayı kuran başlatır.', hazir_degil: 'Herkes hazır değil.', yetersiz: 'Takım Meydanı dört kişiyle oynanır.', baglanti_yok: 'Sunucuya ulaşılamıyor.' };
  const D = () => OR.durum(), oda = () => D().oda, od = () => D().ortak, ben = () => D().ben, benim = () => !!(oda() && oda().tur === 'takim'), macta = () => benim() && oda().durum === 'oyunda' && !!od() && od().faz === 'savas';
  const TAKIM = { A: 'Mavi takım', B: 'Kızıl takım' }, YER = { A: [1010, 760], B: [2390, 2640] };   // meydandaki yerler (oyun pikseli): takım ve yuvaya göre
  const ses = k => { const a = EO2.audio; if (a && a[k]) a[k](); };
  const setOf = u => { const c = EO2.meydanAg && [...EO2.meydanAg.kisiler.values()].find(x => x.handle === u.h); return (c && c.set) || 'temel'; };
  function yerX(q) { const A = B.arenaCfg('er-meydani'), PX = B.api.PX; if (A && A.oyuncu.length >= 4) { const K = A.oyuncu, n = K.length; return (q.takim === 'A' ? K[q.yuva ? 1 : 0] : K[q.yuva ? n - 2 : n - 1]).x * PX; } return YER[q.takim][q.yuva ? 1 : 0]; }
  function cfgKur() { const d = od(), me = d.uye[ben()], o = T.oyuncuDeger(false), A = B.arenaCfg('er-meydani');
    const cfg = { kimlik: 'takim-' + oda().id, kip: 'takim', baslik: 'Takım Meydanı', alt: '2v2 · ' + TAKIM[me.takim], arazi: V.talimArazi(), ortam: 'yaprak', x0: yerX(me), yon: me.takim === 'B' ? -1 : 1, oyuncu: Object.assign({}, o, { revive: 0 }), zorluk: { hp: 1, dmg: 1 }, ortak: true, takimSavasi: true, cikis: ayril };
    if (A) Object.assign(cfg, { arazi: { tema: A.tema, aile: 'talim', maske: A.maske }, sahne: A.sahne, arenaEn: A.en, kameraBoy: A.kameraBoy, ortam: A.ortam }); return cfg; }
  async function ayril() { const M = B.state(); if (!M || M.over || M.dur) return; M.dur = true;
    const v = await G.pen({ k: 'Takım Meydanı', t: 'Maçtan ayrılacak mısın?', body: '<p>Ayrılırsan takımın sensiz sürdürür; bu maça geri dönemezsin.</p>', btns: [{ t: 'Maça dön', v: false }, { t: 'Ayrıl', cls: 'kor', v: true }] });
    if (M !== B.state()) return; M.dur = false; if (v) { Z.savas = false; B.kapat(); OR.cik(); } }
  function oyuncuKur(deneme) { const M = B.state(); if (!Z.savas || !macta()) return; if (!M || !M.on || !M.ben) { if ((deneme || 0) < 40) setTimeout(() => oyuncuKur((deneme || 0) + 1), 150); return; }
    const d = od(), me = d.uye[ben()]; for (const u of oda().uyeler) { if (u.id === ben()) continue; const q = d.uye[u.id]; if (!q) continue;
      B.yoldasKoy(u.id, Object.assign({ ad: u.ad, set: setOf(u), takim: q.takim === me.takim ? 0 : 1, x: yerX(q) / B.api.PX, yon: q.takim === 'B' ? -1 : 1 }, q.max ? { hp: q.hp, max: q.max } : {}, q.hayatta === false || !u.bagli ? { dustu: true } : {})); }
    if (me.max) B.benCan(me.hp, me.max, 0); if (me.hayatta === false) B.benDus(); }
  const kimden = id => (id === ben() ? 'ben' : id);
  function siraUygula(s) { if (Z.savas && s && s.adim) B.ortakSira({ adim: s.adim, tur: s.tur, kim: kimden(s.kim), ruzgar: s.ruzgar }); }
  async function macBaslat() { if (!macta() || Z.savas || !G.live) return; Z.savas = true; Z.sonuc = null; if (G.ekran()) G.close(); document.querySelectorAll('.pen-perde').forEach(w => w.remove());
    const bek = B.ac(cfgKur()); oyuncuKur();
    setTimeout(() => { const M = B.state(); if (M && Z.savas && macta()) { OR.eylem({ t: 'can', hp: Math.round(M.ben.max), max: Math.round(M.ben.max) }); OR.eylem({ t: 'konum', x: M.ben.x, y: M.ben.y, aci: Math.round(M.ben.angle), yon: M.ben.face }); } }, 700);
    const r = await bek; Z.savas = false; if (r.terk && !Z.sonuc) { if (benim()) OR.cik(); return; } sonuc(); }
  async function sonuc() { const s = Z.sonuc; if (!s) return; Z.sonuc = null; const benimTakim = s.takim && s.takim[ben()], zafer = !!s.kazananTakim && s.kazananTakim === benimTakim; ses(zafer ? 'win' : 'pop');
    await G.pen({ k: 'Takım Meydanı · 2v2', t: !s.kazananTakim ? 'Maç bitti' : zafer ? 'Takımın kazandı' : 'Takımın yenildi', body: '<p>' + (s.kazananTakim ? '<b>' + TAKIM[s.kazananTakim] + '</b> meydanı aldı.' : 'Meydanda kimse kalmadı.') + '</p><p class="soluk">Takım Meydanı dostça oynanır: ödül ve sıralama yok.</p>', btns: [{ t: 'Tamam', cls: 'altin' }] });
    if (benim()) OR.cik(); G.open('takim'); }
  B.dinle((olay, v) => { if (!Z.savas || !macta()) return;
    if (olay === 'adim_bitti') { const s = od().sav; if (s && v.adim < s.adim) siraUygula(s); else OR.eylem({ t: 'tur_bitti', adim: v.adim, x: v.x, y: v.y }); }
    else if (olay === 'ates' && v.kim === 0) { const M = B.state(); OR.eylem({ t: 'ates', x: v.x, y: v.y, aci: v.aci, guc: v.guc, yon: v.yon, ruz: M ? M.wind : 0, mod: v.mod || {}, el: v.el }); }
    else if (olay === 'konum') { const t = Date.now(); if (t - Z.konumT > 240) { Z.konumT = t; OR.eylem({ t: 'konum', x: v.x, y: v.y, aci: v.aci, yon: v.yon }); } }
    else if (olay === 'isabet' && v.yid && v.hasar > 0) OR.eylem({ t: 'isabet', kime: v.yid, h: Math.round(v.hasar), bas: !!v.bas, it: v.it }); });
  OR.dinle((olay, v) => {
    if (olay === 'hata') { if (benim() || G.ekran() === 'takim') { Z.hata = HATA[v.kod] || 'İşlem yapılamadı.'; if (G.ekran() === 'takim') G.redraw(); else G.toast(Z.hata); } return; }
    if (olay === 'ayrildi') { if (Z.savas && B.active()) { Z.savas = false; B.kapat(); } if (G.ekran() === 'takim') G.redraw(); return; }
    if (!benim()) return;
    if (olay === 'basladi') { Z.hata = ''; ses('chime'); setTimeout(macBaslat, 600); }
    /* öteki oyuncuların topçuları oyuncuKur ile (takımı ve adıyla) kurulur; ondan önce gelen konum ya da can olayı topçu KURMAZ (yanlış takımda, adsız kurulurdu) */
    const var_ = id => { const M = B.state(); return !!(M && M.yoldas && M.yoldas[id]); };
    if (olay === 'olay' && Z.savas) for (const o of v.olaylar) {
      if (o.t === 'sira') siraUygula(o);
      else if (o.kim && o.kim !== ben() && !var_(o.kim)) continue;
      else if (o.t === 'konum' && o.kim !== ben()) B.yoldasKoy(o.kim, o);
      else if (o.t === 'ates' && o.kim !== ben()) B.yoldasAtes(o.kim, o);
      else if (o.t === 'can') { if (o.kim === ben()) B.benCan(o.hp, o.max, o.h || 0, o.bas); else B.yoldasKoy(o.kim, { hp: o.hp, max: o.max }); }
      else if (o.t === 'dustu') { if (o.kim === ben()) B.benDus(); else B.yoldasKoy(o.kim, { dustu: true }); const u = oda().uyeler.find(x => x.id === o.kim); G.toast(esc_(o.kim === ben() ? 'Düştün. Takımını izliyorsun.' : (u ? u.ad : 'Bir oyuncu') + ' düştü.')); }
      else if (o.t === 'tur_bitti' && o.kim !== ben()) { B.yoldasKoy(o.kim, { x: o.x, y: o.y }); if (od().sav && od().sav.kim === o.kim && od().sav.adim === o.adim) B.ortakPas(o.kim); } }
    if (olay === 'oda' && Z.savas) { const M = B.state(); if (M && M.yoldas) for (const id in M.yoldas) { const u = oda().uyeler.find(x => x.id === id); if ((!u || !u.bagli) && !M.yoldas[id].dustuKesin) B.yoldasKoy(id, { dustu: true }); } }
    if (olay === 'bitti') { Z.sonuc = v.sonuc || {}; if (Z.savas && B.active()) { const s = Z.sonuc; B.sonlandir(!!s.kazananTakim && s.takim && s.kazananTakim === s.takim[ben()]); } else sonuc(); }
    if (G.ekran() === 'takim') G.redraw(); });
  /* sayfa yenilendi ya da bağlantı kopup geldi: maç sürüyorsa meydana geri dönülür */
  setInterval(() => { if (macta() && !Z.savas && !B.active() && G.live && Date.now() - (Z.donusT || 0) > 4000) { Z.donusT = Date.now(); macBaslat(); } }, 700);

  /* ---------- ekran ---------- */
  function lobi() { const k = D().kuyruk, kil = T.kilitli();
    return '<div class="zn-lobi"><div class="zn-kart"><small>Ejder topçusu · dört terbiyeci</small><h2>Takım Meydanı 2v2</h2><p>İki takım, ikişer topçu. Sıra herkes için aynıdır: Mavi, Kızıl, Mavi, Kızıl. Canı biten meydanda kalır ve takımını izler; bir takımda ayakta kimse kalmayınca maç biter.</p><p class="soluk">Dostça oynanır: ödül ve sıralama yok.</p></div>' +
      '<div class="zn-secenek">' + (kil ? '<p class="zn-muhur">Mühürlü: meydana yalnız omuz ejderi olan çıkar.</p>' :
        (k ? '<button type="button" class="gbtn altin buyuk" data-tk="kuyruk-cik">Aramayı bırak<small>üç terbiyeci daha aranıyor…</small></button>' : '<button type="button" class="gbtn altin buyuk" data-tk="kuyruk">Maç ara<small>herkese açık: dört kişi olunca başlar</small></button>') +
        '<button type="button" class="gbtn buyuk" data-tk="kur">Oda kur<small>kodu dostlarına ver</small></button>' +
        '<form class="ms-kod" data-tk-form="1"><label for="tkKod">Oda kodu</label><div><input id="tkKod" name="kod" maxlength="8" placeholder="ORT-ABCD" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>') + '</div></div>'; }
  function toplanma(o) { const kurucu = o.kurucu === ben(), bn = o.uyeler.find(u => u.id === ben()) || {}, hazirlar = o.uyeler.length === 4 && o.uyeler.every(u => u.id === o.kurucu || u.hazir);
    return '<div class="zn-toplan"><div class="ms-kodluk"><small>Oda kodu · Takım Meydanı 2v2</small><b>' + esc_(o.kod) + '</b></div><div class="zn-koltuklar">' + [0, 2, 1, 3].map(i => { const u = o.uyeler[i], tk = i % 2 ? 'B' : 'A';
        return '<div class="zn-koltuk tk-' + tk + (u ? (u.hazir || u.id === o.kurucu ? ' hazir' : '') : ' bos') + '"><canvas width="96" height="96" aria-hidden="true" data-yuz="' + (u ? i : '') + '"></canvas><b>' + (u ? esc_(u.id === ben() ? 'Sen' : u.ad) : 'Boş yer') + '</b><em>' + TAKIM[tk] + ' · ' + (!u ? 'bekleniyor' : u.id === o.kurucu ? 'odayı kurdu' : u.hazir ? 'hazır' : 'hazır değil') + '</em></div>'; }).join('') + '</div>' +
      '<div class="ms-eylem"><button type="button" class="gbtn" data-tk="cik">Odadan ayrıl</button>' + (kurucu ? '<button type="button" class="gbtn altin buyuk" data-tk="baslat" ' + (hazirlar ? '' : 'disabled') + '>Maçı başlat<small>' + (o.uyeler.length < 4 ? (4 - o.uyeler.length) + ' kişi daha gerek' : hazirlar ? 'dört terbiyeci hazır' : 'herkes hazır olmalı') + '</small></button>' : '<button type="button" class="gbtn altin buyuk" data-tk="hazir">' + (bn.hazir ? 'Hazır değilim' : 'Hazırım') + '</button>') + '</div></div>'; }
  G.screen('takim', { k: 'Ejder topçusu', t: 'Takım Meydanı', cls: 'zn', bg: 'a:tp-kapilar', enter() { Z.hata = ''; if (AG.cevrimici()) AG.gonder({ type: 'ortak_durum' }); }, draw(body) {
    if (!AG.cevrimici()) { body.innerHTML = '<div class="ar-kilit bos"><p>Takım Meydanı çevrimiçi oynanır. Sunucuya ulaşılınca açılır.</p></div>'; return; }
    const o = benim() ? oda() : null;
    body.innerHTML = '<div class="zn-kok">' + (o && o.durum === 'bekliyor' ? toplanma(o) : o ? '<div class="ar-kilit bos"><p>Maç sürüyor.</p></div>' : oda() ? '<div class="ar-kilit bos"><p>Önce bulunduğun seferden ya da masadan ayrıl.</p></div>' : lobi()) + (Z.hata ? '<p class="ms-hata" role="alert">' + esc_(Z.hata) + '</p>' : '') + '</div>';
    if (o) body.querySelectorAll('[data-yuz]').forEach(cv => { const u = o.uyeler[+cv.dataset.yuz]; if (!cv.dataset.yuz || !u) return; try { EO2.api.drawPortrait(cv, u.id === ben() ? EO2.api.player.set : setOf(u), 0.66); } catch (_) { } });
    const fk = body.querySelector('[data-tk-form]'); if (fk) { const gir = fk.elements.kod; for (const ad of ['keydown', 'keyup', 'keypress']) gir.addEventListener(ad, e => e.stopPropagation()); fk.addEventListener('submit', e => { e.preventDefault(); const kod = (gir.value || '').trim(); Z.hata = kod ? '' : 'Oda kodunu yaz.'; if (kod) OR.katil(kod); G.redraw(); }); }
    body.querySelectorAll('[data-tk]').forEach(b => b.addEventListener('click', () => { ses('ui'); const k = b.dataset.tk; Z.hata = '';
      if (k === 'kur') OR.kur('takim', '2v2', { ozel: true }); else if (k === 'kuyruk') OR.kuyruk('takim', '2v2'); else if (k === 'kuyruk-cik') OR.kuyrukCik();
      else if (k === 'hazir') { const u = oda().uyeler.find(x => x.id === ben()); OR.hazir(!(u && u.hazir)); } else if (k === 'baslat') OR.baslat(); else if (k === 'cik') OR.cik();
      G.redraw(); }));
  } });
  /* Topçu ekranındaki Er Meydanı künyesine giriş düğmesi */
  setInterval(() => { const alt = document.querySelector('#scrB.tp .tp-k-alt'); if (!alt || T.secili() !== 'pvp' || alt.querySelector('[data-takim-meydani]')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'gbtn'; b.dataset.takimMeydani = '1'; b.innerHTML = 'Takım Meydanı<small>2v2 · dört terbiyeci</small>'; b.addEventListener('click', () => { ses('ui'); G.open('takim'); }); alt.appendChild(b); }, 500);
  EO2.takim = { durum: () => Z, macta };
})();
