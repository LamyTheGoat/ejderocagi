/* Ejder Ocağı 2.0 · Pilot Meydan: deneme haritası
   Amaç: referans görseldeki kadrajı (solda han ve önü, ortada taş meydan, sağda ejder çeşmesi, arkada basamaklı kapı) küçük bir
   haritada kurup görünüş seçeneklerini yan yana denemek. Oyunun kurallarına dokunmaz; kayıt, altın ya da ilerleme değiştirmez.
   Menü → Pilot Meydan ile girilir. Ekrandaki deneme panelinden seçenekler tek tıkla açılıp kapanır; seçim tarayıcıda saklanır:
     Işık (düz / altın saat / akşam) · Kabartma (kapalı / açık / güçlü) · Derinlik kayması · Katmanlı cephe · Ön plan çerçevesi ·
     Dip örtüsü (tarh, masa, fıçı) · Han çizimi (temiz / tombul / boyalı).
   Burada seçilen yol beğenilirse diğer alanlara uygulanır. Yöntem: docs/CIZIM_DUNYASI.md. */
(function () {
  'use strict';
  const EO2 = window.EO2, D = EO2.sceneDefs = EO2.sceneDefs || {}, app = document.getElementById('app');
  const s = { isik: 2, kab: 1, kay: 1, kat: 1, on: 1, dip: 1, han: 3, h3: 2, cs: 0, zm: 3, km: 0 }; try { Object.assign(s, JSON.parse(localStorage.getItem('eo2.pilot2') || '{}')); } catch (e) { /* gizli pencere */ }
  const SEC = [['isik', 'Işık', ['Düz', 'Altın saat', 'Akşam']], ['kab', 'Kabartma', ['Kapalı', 'Açık', 'Güçlü']], ['kay', 'Derinlik kayması', ['Kapalı', 'Açık']], ['kat', 'Katmanlı cephe', ['Kapalı', 'Açık']],
    ['on', 'Ön plan', ['Kapalı', 'Açık']], ['dip', 'Dip örtüsü', ['Kapalı', 'Açık']], ['h3', 'Nesneler', ['Düz', 'Hacimli', 'Açılı']], ['cs', 'Çeşme çizimi', ['Ejder', 'Halka', 'Bölmeli', 'Dört tarh']], ['zm', 'Zemin', ['Pembe', 'Lila', 'Gri', 'Koyu lila']], ['km', 'Kamera', ['Yakın', 'Orta', 'Uzak']], ['han', 'Han çizimi', ['Temiz', 'Tombul', 'Boyalı', 'Karma']]];

  /* ---------- seçeneklerin uygulanması ---------- */
  function uygula() { const R = EO2.api && EO2.api.R;
    EO2.isikAyar = [{ ik: 0, sicak: 0 }, { ik: 0.24, sicak: 1 }, { ik: 0.55, sicak: 0.45 }][s.isik];   // akşam: ortam serin-mor, sıcaklık yalnız ışıkların çevresinde (referanstaki gibi)
    const sz = document.getElementById('isikSuzgeci'); if (sz) { sz.style.opacity = s.isik ? '1' : '0'; sz.classList.toggle('aksam', s.isik === 2); }
    if (R) { R.kabartma = [0, 0.7, 1.35][s.kab]; R.kayma = s.kay ? 1 : 0; }
    EO2.katmanKapali = !s.kat; if (D.pilot) D.pilot.L.zemin[0] = ['tas2', 'tas3', 'tas4', 'tas5'][s.zm] || 'tas3';
    if (EO2.CAM && EO2.CAM.pilot) Object.assign(EO2.CAM.pilot, [{ H: 6.6, D: 11.9, feet: 0.66, kisi: 0.2 }, { H: 7.6, D: 13.6, feet: 0.65, kisi: 0.165 }, { H: 8.4, D: 15.2, feet: 0.64, kisi: 0.138 }][s.km] || {});   // Yakın: ana referanstaki gibi (karakter ekranın beşte biri); Uzak: genel görünüş
    try { localStorage.setItem('eo2.pilot2', JSON.stringify(s)); } catch (e) { /* gizli pencere */ } }
  EO2.pilot = { s, uygula };

  /* ---------- sahne ----------
     Referans kadrajı: solda ÇAPRAZ duran han (cephesi sağ-aşağıya bakar, önünde masalar), üst ortada basamaklı kapı, sağ ortada ejder çeşmesi
     ve çevresinde tarhlar, sağ üstte tezgâhlar ve çapraz bir konak, yerde sıcak renkli küçük taşlar ve ejder mührü.
     Çapraz duvar: dörtgenin köşeleri dünyada verildiği için duvar x ya da y eksenine paralel olmak zorunda değildir (duvar()). */
  const FN = { x: 3.4, y: 8.8 }, A0 = [-10.9, 5.2], KX = 2.0, /* KX: kapının x kayması (referansta kapı ortanın sağında) */ U = [0.545, 0.838], NV = [0.838, -0.545], P = (sv, d) => [A0[0] + U[0] * sv + NV[0] * d, A0[1] + U[1] * sv + NV[1] * d];   // han cephesi boyunca sv, cepheden dışarı d
  const B0 = P(11.9, 0), C0 = [A0[0] - NV[0] * 6.1, A0[1] - NV[1] * 6.1], lamps = [P(-0.4, 1.9), P(11.4, 2.2), [10.9, 7.0], [-3.9, 4.4], [KX - 4.3, 21.6], [KX + 4.3, 21.6]];
  const masa = [P(3.4, 2.5), P(8.3, 2.6)], tarhYer = [[FN.x - 2.9, FN.y - 2.7], [FN.x + 2.9, FN.y - 2.7], [-3.0, 14.6], [10.6, 11.6], [-12.2, 9.4], [-9.6, 18.6]];
  const L = { id: 'pilot', name: 'Pilot Meydan', sub: 'Deneme haritası', zemin: ['tas2', 'cim', 2.3, 7], sadeHalka: true, flyer: true, petals: true,
    bounds: [-14.4, 14.4, 0.8, 24.2], mapRect: [-24, -8, 48, 48], paved: [[-18, -6, 18, 28]], start: { x: -0.8, y: 6.2, dir: 'down' }, entry: {},
    fount: { x: FN.x, y: FN.y, R: 2.7, ringIn: 3.0, ringOut: 6.6 }, emb: { x: 5.6, y: 3.2, r: 1.5 },
    signs: [{ id: 'han', label: 'Han', x: P(6, 0.4)[0], y: P(6, 0.4)[1], z: 7.4 }, { id: 'kapi', label: 'Kuzey Kapısı', x: KX, y: 25, z: 6.6 }],
    interact: [{ id: 'cikis', x: 0, y: 1.2, r: 1.6, z: 2.4, label: 'Meydana dön', sub: 'Pilot haritadan çık', act: 'go:meydan' },
      { id: 'cesme', x: FN.x, y: FN.y - 3.5, r: 2.2, z: 2.4, label: 'Etkileşime geç', sub: 'Çeşme', act: 'toast:Su, ejderin ağzından serin serin akıyor.' },
      { id: 'han', x: P(6.2, 1.3)[0], y: P(6.2, 1.3)[1], r: 2.0, z: 2.8, label: 'Hana bak', sub: 'Han', act: 'toast:Pilot haritada içeri girilmez. Hanın içi Merkez Meydan üzerinden açılır.' }],
    lamps, braziers: [], trees: [], benches: [[-8.4, 3.6], [0.4, 18.4]], planters: [], stalls: [],
    rects: [[-16, KX - 2.05, 24.5, 27], [KX + 2.05, 16, 24.5, 27], [KX - 6, KX - 2.05, 22.9, 24.5], [KX + 2.05, KX + 6, 22.9, 24.5], [7.2, 9.9, 19.6, 20.2], [10.9, 13.6, 17.3, 17.9], [-9.35, -7.45, 3.48, 3.9], [-0.55, 1.35, 18.28, 18.7], ...tarhYer.slice(2).map(q => [q[0] - 1.5, q[0] + 1.5, q[1] - 0.15, q[1] + 1.0])],
    circles: [[FN.x, FN.y, 2.8], [FN.x - 3.0, FN.y - 2.5, 0.25], [FN.x + 3.0, FN.y - 2.5, 0.25], ...lamps.map(l => [l[0], l[1], 0.2]), ...masa.map(m => [m[0], m[1], 1.3]),
      ...Array.from({ length: 12 }, (_, i) => { const q = P(i * 1.05 + 0.2, -0.75); return [q[0], q[1], 0.95]; }), ...Array.from({ length: 6 }, (_, i) => [A0[0] - NV[0] * (i + 0.5) + U[0] * 0.8, A0[1] - NV[1] * (i + 0.5) + U[1] * 0.8, 0.95]),
      ...Array.from({ length: 6 }, (_, i) => [14.2 - i * 0.6 + 0.6, 15.0 + i * 1.02 + 0.3, 0.9]), [KX - 6.4, 23.4, 0.4], [KX + 6.4, 23.4, 0.4], [13.6, 6.4, 0.4], [-7.6, 17.6, 0.6], [-11.6, 18.4, 0.4], [-4.9, 21.4, 0.3], [-12.4, 22.6, 0.4]],
    lights: [...lamps.map(l => [l[0], l[1], 5.6, 1]), [P(6, 1.5)[0], P(6, 1.5)[1], 7.5, 1.25], [P(2, 1.2)[0], P(2, 1.2)[1], 5, 0.9], [8.6, 19.2, 4.6, 0.9], [12.2, 17.0, 4.2, 0.8], [0, 23.8, 4.5, 0.7]], embers: [],
    shadows: [[P(6, 1.6)[0], P(6, 1.6)[1], 7.2, 2.6, 0.8], [FN.x + 0.9, FN.y - 1.0, 3.8, 1.7, 0.7], [0.6, 24.2, 11, 1.2, 0.65], [8.9, 19.1, 2.0, 0.8, 0.6], [12.5, 16.9, 2.0, 0.8, 0.6], [13.0, 16.4, 2.4, 3.6, 0.5], [14.3, 6, 1.0, 9, 0.5], [-14.5, 4, 1.0, 6, 0.5], [13.9, 6.0, 2.6, 1.4, 0.55], [-6.4, 23.0, 2.4, 1.2, 0.5], [6.4, 23.0, 2.4, 1.2, 0.5]],
    mini: { paved: [[-15, 0, 15, 25]], blocks: [], bg: '#cdb49a' },
    npcs: [
      { id: 'pl-hanci', name: 'Hancı', role: 'Han', set: 'temel', x: P(6.0, 1.3)[0], y: P(6.0, 1.3)[1], dir: 'down', lines: ['Çay demlendi, masalar hazır.', 'Akşama saz var, kalsana.'] },
      { id: 'pl-m1', name: 'Gezgin', role: 'Han önü', set: 'avci', x: masa[0][0] - 1.85, y: masa[0][1] + 0.1, dir: 'right', lines: ['Kuzeyden yeni geldim. Yollar çamur.'] },
      { id: 'pl-m2', name: 'Usta', role: 'Han önü', set: 'madenci', x: masa[0][0] + 1.85, y: masa[0][1] + 0.1, dir: 'left', lines: ['Bir el tavla atar mıyız?'] },
      { id: 'pl-m3', name: 'Çırak', role: 'Han önü', set: 'bare', x: masa[1][0] + 1.85, y: masa[1][1] + 0.1, dir: 'left', lines: ['Usta beni çaya yolladı.'] },
      { id: 'pl-okur', name: 'Kâtip', role: 'Meydan', set: 'temel', x: -8.4, y: 3.1, dir: 'down', lines: ['Şurada iki satır okuyayım dedim.'] },
      { id: 'pl-bekci1', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', x: KX - 2.5, y: 22.0, dir: 'down', lines: ['Kapı gün batımında kapanır.'] },
      { id: 'pl-bekci2', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', x: KX + 2.5, y: 22.0, dir: 'down', lines: ['Kervanlar bu kapıdan geçer.'] },
      { id: 'pl-baharat', name: 'Baharatçı', role: 'Pazar', set: 'temel', x: 8.6, y: 18.6, dir: 'down', lines: ['Taze geldi, kokusundan belli.'] },
      { id: 'pl-alici1', name: 'Yolcu', role: 'Pazar', set: 'avci', x: 10.6, y: 15.9, dir: 'up', lines: ['Şu testiye kaç istiyorlar acaba?'] },
      { id: 'pl-alici2', name: 'Komşu', role: 'Pazar', set: 'madenci', x: 11.7, y: 15.7, dir: 'left', lines: ['Pazar bugün bereketli.'] },
      { id: 'pl-ozan', name: 'Ozan', role: 'Çeşme başı', set: 'avci', x: -1.5, y: 9.6, dir: 'down', notes: true, lines: ['Çeşmenin sesi sazla iyi gider.'] },
      { id: 'pl-gezen', name: 'Muhtar', role: 'Meydan', set: 'avci', x: -1, y: 19, dir: 'right', path: [[-1.0, 20.4], [1.4, 22.0], [3.4, 19.4], [1.0, 16.6], [-1.6, 16.4], [-2.2, 18.6]], lines: ['Meydan bugün kalabalık.'] },
    ] };

  for (const sv of [1.0, 2.0, 3.0, 8.8, 9.8, 10.8]) { const q = P(sv, 0.6); L.circles.push([q[0], q[1], 0.6]); }
  L.circles.push([11.4, 4.6, 1.2], [-5.4, 19.8, 1.0]);   // araba ve kuyu   // han dibindeki tarhlar geçilmez
  D.pilot = { L, build(h) { h.addSky(); const art = h.art, tx = h.tx;
    const sartli = (it, f) => { const d0 = it.draw; it.draw = (R, F) => { if (f()) d0(R, F); }; return it; }, dip = it => sartli(it, () => !!s.dip), duz = it => sartli(it, () => !s.h3), hacK = ok => (key, draw, dipli) => h.push({ key, draw(R, F) { if (ok() && (!dipli || s.dip)) draw(R, F); } }), hac = hacK(() => s.h3 === 1), aci = hacK(() => s.h3 === 2), hac12 = hacK(() => s.h3 >= 1);   // duz: yalnız "Düz"; hac: yalnız "Hacimli"; aci: yalnız "Açılı"; hac12: ikisinde de
    const hb = (...a) => sartli(h.billboard(...a), () => s.h3 !== 2);   // eski (düz cepheden çizilmiş) nesneler: "Açılı" seçiliyken hiçbiri çizilmez
    /* çapraz duvar: a ekranda soldaki uç, b sağdaki uç; boy verilmezse resmin oranından */
    const duvar = (t, a, b, hh, o) => { o = o || {}; const len = Math.hypot(b[0] - a[0], b[1] - a[1]), yk = hh || len * t.hm / t.wm, it = { key: Math.max(a[1], b[1]) + 0.002 + (o.key || 0), draw(R, F) { const c = h.amb(F);
      R.quad(t, [a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], yk], [a[0], a[1], yk], 0, 0, 1, 1, c, false, 1); if (t.glow && F.night > 0.02) { const k = F.night * (t.glowK || 1); R.quad(t.glow, [a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], yk], [a[0], a[1], yk], 0, 0, 1, 1, [k, k, k, 1], true, 0); } } }; h.push(it); return sartli(it, () => s.h3 !== 2); };
    /* han: çapraz, cephesi sağ-aşağıya bakar; sol yüzü yan duvar. Üç çizim aynı yerde, panelden seçilen çizilir */
    const tHan = [h.D('han#pl', () => art.han(h.E)), h.D('pl-han-b', () => art.han(h.E)), h.D('pl-han-c', () => art.han(h.E)), h.D('pl-han-d', () => art.han(h.E))];   // 3: Türk-Avrupa karması (revaklı taş zemin kat, cumba, çini kuşağı, ahşap çatkı)
    tHan.forEach((t, i) => sartli(duvar(t, A0, B0), () => s.han === i));
    sartli(duvar(h.D('han-yan#pl', () => art.sideWall(6.6, { seed: 22, wins: 2 })), C0, A0, 8.6), () => s.han !== 3); sartli(duvar(h.D('pl-han-d-yan', () => art.sideWall(6.6, { seed: 22, wins: 2 })), C0, A0), () => s.han === 3);
    dip(hb(h.D('pl-tabela', () => art.planter(24)), P(6.3, 0.7)[0], P(6.3, 0.7)[1], { z0: 3.1, occl: false, fade: false }));   // kapının üstünde asılı tabela
    h.side(h.D('sur-b#plb', () => art.boundary(22.4, 190)), -15.2, -3, 6.6, 'E'); h.side(h.D('sur-b#plk', () => art.boundary(22.4, 190)), -15.2, 15.6, 25, 'E'); h.side(h.D('sur-d#pld', () => art.boundary(24.5, 195)), 15.2, -3, 14.6, 'W');
    /* sağ üstte çapraz konak (cephesi sol-aşağıya bakar), önünde tezgâhlar */
    duvar(h.D('ev-b#pl', () => art.house(8, '#c9603f', 4.1)), [11.2, 20.1], [14.2, 15.0]);
    hb(h.D('tezgah0', () => art.stall(0)), 8.55, 19.8); hb(h.D('tezgah1', () => art.stall(1)), 12.25, 17.5); dip(hb(tx.crates, 10.4, 20.3)); dip(hb(tx.barrel, 13.9, 17.9));
    /* üst ortada kapı (küçültülmüş), basamaklar, iki yanında sancak ve erguvan */
    hb(h.D('kapi', () => art.northGate(h.E)), KX - 10.5, 25, { ax: 0, w: 21, fade: false, occl: false });
    hb(h.D('pl-basamak', () => art.lowWall(5.4, 77)), KX, 24.2, { w: 6.4, occl: false, fade: false });
    const tDir = h.D('pl-sancak2', () => art.bannerPole(h.E, '#213270')); for (const q of [[KX - 3.3, 23.6], [KX + 3.3, 23.6]]) hb(tDir, q[0], q[1], { sway: 0.02, w: 1.5 }); for (const q of [[FN.x - 3.0, FN.y - 2.5], [FN.x + 3.0, FN.y - 2.5]]) hb(tDir, q[0], q[1], { sway: 0.02, w: 1.25 });   // lacivert-bakır ejder sancağı
    hb(tx.erguvan[0], KX + 6.4, 23.4, { sway: 0.06 }); hb(tx.erguvan[1], KX - 6.4, 23.4, { sway: 0.06 }); hb(tx.bahce[1], -12.4, 22.6, { sway: 0.05 }); hb(tx.cinar, -7.6, 17.6, { sway: 0.06 }); hb(tx.erguvan[3], -11.6, 18.4, { sway: 0.06 }); hb(tx.selvi, -4.9, 21.4, { sway: 0.05 }); hb(tx.bahce[0], 13.6, 6.4, { sway: 0.05 }); hb(tx.erguvan[2], 12.8, 23.8, { sway: 0.06 });
    /* sağ ortada ejder çeşmesi; yerdeki halka döşeme L.fount ile gelir */
    duz(hb(h.D('pl-cesme', () => art.pedestal()), FN.x, FN.y, { occl: false, fade: false }));
    for (const l of lamps) hb(tx.lamp, l[0], l[1], { glowK: 1.3 }); for (const b of L.benches) duz(hb(tx.bench, b[0], b[1]));
    /* dip örtüsü: han cephesinin dibinde çapraz tarhlar, önünde masalar ve fıçılar; çeşmenin çevresinde tarh ve saksılar */
    const tTarh = h.D('pl-tarh', () => art.planter(20)), tMasa = h.D('ic-masa#pl', () => art.planter(21));
    dip(duz(duvar(tTarh, P(0.4, 0.3), P(3.6, 0.3), 0, { key: 0.01 }))); dip(duz(duvar(tTarh, P(8.2, 0.3), P(11.4, 0.3), 0, { key: 0.01 })));   // hacimli hali aşağıda
    for (const m of masa) dip(duz(hb(tMasa, m[0], m[1], { occl: false })));
    for (const q of [P(11.3, 1.2), P(11.9, 1.7), P(-0.3, 0.9)]) dip(hb(tx.barrel, q[0], q[1]));
    for (const q of tarhYer) dip(duz(hb(tTarh, q[0], q[1], { occl: false })));
    [[-0.3, 11.2, 0], [8.4, 11.4, 1], [1.5, 13.4, 2], [6.6, 13.5, 3], [KX - 2.9, 23.9, 1], [KX + 2.9, 23.9, 2], [-4.6, 6.6, 3], [11.6, 10.2, 0]].forEach((q, i) => { const it = dip(hb(tx.planter[q[2]], q[0], q[1])); sartli(it, () => s.h3 !== 2); });   // çeşmenin çevresindekiler açılı çizimde halkanın içinde kalır
    /* ---------- hacimli nesneler ----------
       Dik duran tek resim yerine birkaç yüzeyden kurulur; kamera yürüdükçe yüzeyler birbirine göre kayar, nesne yere oturur:
       masa = yatay tabla + ayak + ayrı tabureler; tarh = önde ve arkada taş kenar, üstte çiçek örtüsü, arka arkaya üç sıra çiçek;
       çeşme = gerçek halka havuz (dış yüz dilimleri), yatay su, ortada heykel, akan damlalar. */
    const R0 = h.R, K = EO2.doku, cvs = (w, hh, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; fn(c.getContext('2d'), w, hh); return c; };
    const imT = (ad, yedek) => R0.texture(K.im[ad] || yedek());
    const parca = (ad, x0, y0, x1, y1) => { const im = K.im[ad]; if (!im) return null; const w = Math.round((x1 - x0) * im.naturalWidth), hh = Math.round((y1 - y0) * im.naturalHeight), t = R0.texture(cvs(w, hh, x => x.drawImage(im, x0 * im.naturalWidth, y0 * im.naturalHeight, w, hh, 0, 0, w, hh))); t.asp = hh / w; return t; };
    const isik = (F, x, y) => F.lit ? F.lit(x, y, 1) : h.amb(F), golge = h.uv('shadow'), halka = h.uv('ring'), damla = h.uv('drop');
    const yatay = (R, F, t, x, y, rx, ry, z) => R.quad(t, [x - rx, y - ry, z], [x + rx, y - ry, z], [x + rx, y + ry, z], [x - rx, y + ry, z], 0, 0, 1, 1, isik(F, x, y), false, 1);
    const dik = (R, F, t, x, y, w, z0, z1, m, sw) => R.quad(t, [x - w / 2, y, z0], [x + w / 2, y, z0], [x + w / 2 + (sw || 0), y, z1], [x - w / 2 + (sw || 0), y, z1], m ? 1 : 0, 0, m ? 0 : 1, 1, isik(F, x, y), false, 1);
    const yerGolge = (R, x, y, rx, ry, a) => R.quad(h.T.fx, [x - rx, y - ry, 0.012], [x + rx, y - ry, 0.012], [x + rx, y + ry, 0.012], [x - rx, y + ry, 0.012], golge[0], golge[1], golge[2], golge[3], [1, 1, 1, a]);
    /* masa ve tabureler */
    const tUst = imT('pl-masa-ust', () => cvs(128, 128, x => { x.fillStyle = '#8a5a34'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.lineWidth = 5; x.strokeStyle = '#3a2530'; x.stroke(); }));
    const tTab = imT('pl-tabure-ust', () => cvs(64, 64, x => { x.fillStyle = '#a03a34'; x.beginPath(); x.arc(32, 32, 28, 0, 7); x.fill(); x.lineWidth = 4; x.strokeStyle = '#3a2530'; x.stroke(); }));
    const tAyak = R0.texture(cvs(96, 96, (x, w, hh) => { x.fillStyle = '#6a4630'; x.strokeStyle = '#3a2530'; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath(); x.moveTo(w * 0.38, 2); x.lineTo(w * 0.62, 2); x.lineTo(w * 0.66, hh * 0.72); x.lineTo(w * 0.92, hh - 3); x.lineTo(w * 0.08, hh - 3); x.lineTo(w * 0.34, hh * 0.72); x.closePath(); x.fill(); x.stroke(); }));
    const tBacak = R0.texture(cvs(64, 64, (x, w, hh) => { x.strokeStyle = '#3a2530'; x.fillStyle = '#6a4630'; x.lineWidth = 3; for (const px of [0.2, 0.8]) { x.beginPath(); x.rect(w * px - 5, 2, 10, hh - 4); x.fill(); x.stroke(); } x.beginPath(); x.rect(w * 0.2, hh * 0.5, w * 0.6, 7); x.fill(); x.stroke(); }));
    for (const m of masa) { const mx = m[0], my = m[1];
      hac(my + 0.02, (R, F) => { yerGolge(R, mx, my, 1.15, 0.72, 0.7); dik(R, F, tAyak, mx, my, 1.0, 0, 0.78); }, true);
      hac(my, (R, F) => yatay(R, F, tUst, mx, my, 0.88, 0.88, 0.78), true);
      for (const q of [[-1.3, 0.15], [1.3, 0.1], [0.1, -1.15]]) { const sx = mx + q[0], sy = my + q[1]; hac(sy + 0.02, (R, F) => { yerGolge(R, sx, sy, 0.42, 0.26, 0.6); dik(R, F, tBacak, sx, sy, 0.5, 0, 0.46); }, true); hac(sy, (R, F) => yatay(R, F, tTab, sx, sy, 0.3, 0.3, 0.46), true); } }
    /* tarh: her doğrultuda kurulur. a, b ön kenarın uçları (ekranda soldan sağa), n arkaya doğru birim yön, dp derinlik.
       Parçalar ayrı çizimlerdir ve yan yana döşenir (oran bozulmaz): önde ve arkada taş kenar, üstte çiçek örtüsü,
       arkada uzun sıra (lale, lavanta), ortada gül, önde alçak sıra (papatya). Çizimi olmayan parça eski tarh resminden kesilir. */
    const serit = (ad, yedek) => { const im = K.im[ad]; if (!im) return yedek; const t = R0.texture(im, { repeat: true }); t.asp = im.naturalHeight / im.naturalWidth; t.doser = 1; return t; };
    const tTas = parca('pl-tarh', 0, 0.62, 1, 1), tCic = parca('pl-tarh', 0, 0, 1, 0.7), tCicUst = K.im['pl-cicek-ust'] ? R0.texture(K.im['pl-cicek-ust']) : null;
    const tKenar = serit('pl-kenar', tTas), tSira = [serit('pl-cicek-b', tCic), serit('pl-cicek-a', tCic), serit('pl-cicek-c', tCic)];   // arka, orta, ön
    const cQ = (R, F, t, a, b, z0, z1, m, sw, u1) => { const u = u1 || 1; R.quad(t, [a[0], a[1], z0], [b[0], b[1], z0], [b[0] + (sw || 0), b[1], z1], [a[0] + (sw || 0), a[1], z1], m ? u : 0, 0, m ? 0 : u, 1, isik(F, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2), false, 1); };
    const tarh = (a, b, n, dp, it) => { if (!tKenar || !tSira[0]) return; const len = Math.hypot(b[0] - a[0], b[1] - a[1]), kay = d => [[a[0] + n[0] * d, a[1] + n[1] * d], [b[0] + n[0] * d, b[1] + n[1] * d]], hk = 0.36, uK = tKenar.doser ? Math.max(1, Math.round(len / (hk / tKenar.asp))) : 1;
      const sira = (R, F, t, d, hh, m, faz) => { const q = kay(d), u = t.doser ? Math.max(1, Math.round(len / (hh / t.asp))) : 1; cQ(R, F, t, q[0], q[1], hk * 0.6, hk * 0.6 + hh, m, Math.sin(F.time * 1.2 + faz) * 0.03, u); };
      const orta = [(a[0] + b[0]) / 2 + n[0] * dp / 2, (a[1] + b[1]) / 2 + n[1] * dp / 2];
      (it || hac)(Math.max(a[1], b[1], a[1] + n[1] * dp, b[1] + n[1] * dp) + 0.011, (R, F) => { yerGolge(R, orta[0], orta[1], len * 0.56, dp * 0.95, 0.6);
        const qa = kay(dp), qo = kay(0); cQ(R, F, tKenar, qa[0], qa[1], 0, hk, 1, 0, uK);
        sira(R, F, tSira[0], dp - 0.06, 0.95, 1, a[0]);
        if (tCicUst) { const c = isik(F, orta[0], orta[1]), p0 = kay(0.06), p1 = kay(dp - 0.06), z = hk * 0.88; R.quad(tCicUst, [p0[0][0], p0[0][1], z], [p0[1][0], p0[1][1], z], [p1[1][0], p1[1][1], z], [p1[0][0], p1[0][1], z], 0, 0, 1, 1, c, false, 1); }
        sira(R, F, tSira[1], dp * 0.5, 0.72, 0, a[0] + 1);
        cQ(R, F, tKenar, qo[0], qo[1], 0, hk, 0, 0, uK); sira(R, F, tSira[2], 0.05, 0.42, 1, a[0] + 2); }, true); };
    for (const q of tarhYer) tarh([q[0] - 1.6, q[1]], [q[0] + 1.6, q[1]], [0, 1], 0.9);
    for (const q of [[0.4, 3.6], [8.2, 11.4]]) tarh(P(q[0], 1.0), P(q[1], 1.0), [-NV[0], -NV[1]], 0.75);   // han dibindeki çapraz tarhlar açılı çizimde de yüzeylerden kurulur (çizim o doğrultuya uymaz)
    /* saksı, çalı ve bank: iki ya da üç katmandan kurulur. Saksıda çiçekler arkada ve önde iki katman, saksılar ortada;
       çalıda arkada koyu ikinci katman; bankta sırtlık arkada dik, oturak yatay, ayaklar önde. */
    const saksiYer = [P(4.6, 0.55), P(7.3, 0.55), [KX - 4.4, 23.3], [KX + 4.4, 23.3], [-7.2, 3.7], [10.2, 6.2], [12.6, 14.2], [-2.6, 9.4], [8.9, 21.0]], tSk = [h.D('pl-saksilar2', () => art.planter(25)), h.D('pl-saksilar3', () => art.planter(26))];
    saksiYer.forEach((q, i) => dip(duz(hb(tSk[i % 2], q[0], q[1], { occl: false }))));
    const dikV = (R, F, t, x, y, w, z0, z1, v0, v1, m, sw, kk) => { const c = isik(F, x, y); if (kk) { c[0] *= kk; c[1] *= kk; c[2] *= kk; } R.quad(t, [x - w / 2, y, z0], [x + w / 2, y, z0], [x + w / 2 + (sw || 0), y, z1], [x - w / 2 + (sw || 0), y, z1], m ? 1 : 0, v0, m ? 0 : 1, v1, c, false, 1); };
    const saksi3 = (t, x, y, fr) => { const w = t.wm, hh = t.hm, zf = hh * (1 - fr);
      hac(y + 0.2, (R, F) => { yerGolge(R, x, y + 0.05, w * 0.55, 0.42, 0.6); dikV(R, F, t, x + 0.12, y + 0.2, w * 0.96, zf * 0.9, zf * 0.9 + hh * fr * 1.08, 0, fr, 1, Math.sin(F.time * 1.1 + x) * 0.02, 0.84); }, true);
      hac(y, (R, F) => { dikV(R, F, t, x, y, w, 0, zf, fr, 1, 0); dikV(R, F, t, x, y - 0.02, w, zf * 0.96, zf * 0.96 + hh * fr, 0, fr, 0, Math.sin(F.time * 1.4 + x + 1) * 0.02); }, true); };
    saksiYer.forEach((q, i) => saksi3(tSk[i % 2], q[0], q[1], 0.52));
    const cali3 = (t, x, y) => { const w = t.wm, hh = t.hm; hac(y + 0.3, (R, F) => { yerGolge(R, x, y + 0.1, w * 0.6, 0.5, 0.6); dikV(R, F, t, x + 0.16, y + 0.3, w * 0.9, 0, hh * 0.93, 0, 1, 1, Math.sin(F.time + x) * 0.02, 0.8); }, true); hac(y, (R, F) => dikV(R, F, t, x, y, w, 0, hh, 0, 1, 0, Math.sin(F.time * 1.3 + x) * 0.025), true); };
    const tOrt = [0, 1, 2].map(i => h.D('pl-ortanca' + i, () => art.planter(27 + i)));
    [[-4.6, 6.9], [11.7, 10.4], [KX - 5.4, 22.3], [KX + 5.4, 22.3], [13.2, 12.4], P(-1.3, 0.6), [-12.6, 2.4], [9.2, 23.2]].forEach((q, i) => { dip(duz(hb(tOrt[i % 3], q[0], q[1], { occl: false }))); cali3(tOrt[i % 3], q[0], q[1]); });
    const tOtur = R0.texture(cvs(128, 48, (x, w, hh) => { for (let i = 0; i < 3; i++) { x.fillStyle = i % 2 ? '#b98a5e' : '#c79a6c'; x.fillRect(0, i * 16, w, 16); x.strokeStyle = '#4a3040'; x.lineWidth = 2; x.strokeRect(1, i * 16 + 1, w - 2, 14); } }));
    for (const b of L.benches) { const bx = b[0], by = b[1], t = tx.bench, w = t.wm, hh = t.hm, fs = 0.52;
      hac(by + 0.46, (R, F) => { yerGolge(R, bx, by + 0.2, w * 0.56, 0.5, 0.6); dikV(R, F, t, bx, by + 0.45, w, 0.44, 0.44 + hh * fs * 1.05, 0, fs, 0); }, false);
      hac(by, (R, F) => { const c = isik(F, bx, by); R.quad(tOtur, [bx - w * 0.44, by, 0.46], [bx + w * 0.44, by, 0.46], [bx + w * 0.44, by + 0.44, 0.46], [bx - w * 0.44, by + 0.44, 0.46], 0, 0, 1, 1, c, false, 1); dikV(R, F, t, bx, by, w, 0, hh * (1 - fs), fs, 1, 0); }, false); }
    /* çeşit: çiçek arabası, kuyu, bayrak ipleri, fener direklerinde askı sepetler */
    dip(hb(h.D('pl-araba', () => art.crates()), 11.4, 4.4, { occl: false })); dip(hb(h.D('pl-kuyu', () => art.pedestal()), -5.4, 19.6));
    const tBay = h.D('pl-bayrak', () => art.lowWall(7, 91)); [[-1.6, 21.9, 8.2, 4.5], [10.4, 18.7, 6.6, 3.9], [FN.x, FN.y - 0.78, 7.9, 3.6]].forEach((q, i) => { const it = dip(hb(tBay, q[0], q[1], { w: q[2], z0: q[3], occl: false, fade: false, sway: 0.02 })); if (i === 2) sartli(it, () => s.h3 !== 2); });
    const tAski = h.D('pl-aski', () => art.planter(30)); [lamps[0], lamps[2], lamps[3]].forEach(l => dip(hb(tAski, l[0] + 0.42, l[1] - 0.02, { z0: 1.9, occl: false, sway: 0.02 })));
    /* çeşme */
    const fimAd = K.im['pl-cesme2'] ? 'pl-cesme2' : 'pl-cesme', FK = K.olcu[fimAd] || {}, hk = FK.heykel || [0.18, 0, 0.82, 0.6], tHey = parca(fimAd, hk[0], hk[1], hk[2], hk[3]), surIm = K.im['sur-b'];
    const dvIm = K.im['pl-havuz-duvar'], tSerit = dvIm ? R0.texture(dvIm, { repeat: true }) : surIm ? R0.texture(cvs(512, 128, (x, w, hh) => x.drawImage(surIm, surIm.naturalWidth * 0.1, surIm.naturalHeight * 0.42, surIm.naturalWidth * 0.5, surIm.naturalHeight * 0.52, 0, 0, w, hh)), { repeat: true }) : null;
    /* su: üstten çizilmiş doku daireye kırpılır; iki katman ters yönde ağır ağır döner (akıyormuş gibi), üstünde halkalar ve damlalar */
    const suIm = K.im['pl-su'], tSu = suIm ? R0.texture(cvs(512, 512, x => { x.beginPath(); x.arc(256, 256, 254, 0, 6.3); x.clip(); x.drawImage(suIm, 0, 0, 512, 512); })) : tx.water;
    const donQ = (R, t, cx, cy, r, z, ang, col) => { const q = [0, 1, 2, 3].map(i => { const a = ang + Math.PI * 1.25 + i * Math.PI / 2, rr = r * 1.4142; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]; }); R.quad(t, q[0], q[1], q[2], q[3], 0, 0, 1, 1, col); };
    const tasIm = K.zemin && K.zemin.tas; const tAgiz = R0.texture(cvs(256, 256, x => { x.beginPath(); x.arc(128, 128, 126, 0, 6.3); x.arc(128, 128, 104, 0, 6.3, true); if (tasIm) { x.save(); x.clip('evenodd'); x.drawImage(tasIm, 0, 0, 256, 256); x.fillStyle = 'rgba(214, 210, 214, .45)'; x.fillRect(0, 0, 256, 256); x.restore(); x.beginPath(); } else { x.fillStyle = '#eadcc8'; x.fill('evenodd'); } x.lineWidth = 4; x.strokeStyle = '#4a3040'; x.beginPath(); x.arc(128, 128, 125, 0, 6.3); x.stroke(); x.beginPath(); x.arc(128, 128, 105, 0, 6.3); x.stroke(); }));
    const fr = L.fount.R, NS = 26, seg = []; for (let i = 0; i < NS; i++) { const a0 = i / NS * 6.2832, a1 = (i + 1) / NS * 6.2832; seg.push({ a: [FN.x + Math.cos(a0) * fr, FN.y + Math.sin(a0) * fr], b: [FN.x + Math.cos(a1) * fr, FN.y + Math.sin(a1) * fr], n: [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2)], u0: i * 0.16, u1: (i + 1) * 0.16 }); }
    if (tSerit && tHey) hac(FN.y, (R, F) => { const c = isik(F, FN.x, FN.y - 2.4), zr = 0.85, zw = 0.66, fx = FN.x, fy = FN.y;
      yerGolge(R, fx + 0.5, fy - 0.6, fr * 1.3, fr * 0.95, 0.7);
      for (const q of seg.filter(q => (F.camX - q.a[0]) * q.n[0] + (F.camY - q.a[1]) * q.n[1] > 0).sort((p1, p2) => (p2.a[1] + p2.b[1]) - (p1.a[1] + p1.b[1]))) { const sh = 0.78 + 0.22 * Math.max(0, -q.n[1] * 0.8 + q.n[0] * 0.3); R.quad(tSerit, [q.b[0], q.b[1], 0], [q.a[0], q.a[1], 0], [q.a[0], q.a[1], zr], [q.b[0], q.b[1], zr], q.u0, 0, q.u1, 1, [c[0] * sh, c[1] * sh, c[2] * sh, 1]); }
      const rr = fr + 0.08; R.quad(tAgiz, [fx - rr, fy - rr, zr], [fx + rr, fy - rr, zr], [fx + rr, fy + rr, zr], [fx - rr, fy + rr, zr], 0, 0, 1, 1, c);
      const wr = fr * 0.88; donQ(R, tSu, fx, fy, wr, zw, F.time * 0.05, c); donQ(R, tSu, fx, fy, wr * 0.97, zw + 0.004, 1.3 - F.time * 0.04, [c[0], c[1], c[2], 0.45]);
      for (let i = 0; i < 4; i++) { const pp = ((F.time * 0.42 + i * 0.25) % 1), r2 = 0.25 + pp * 1.5, a2 = (1 - pp) * 0.5, ox = i % 2 ? 0.9 : -0.8, oy = i > 1 ? 0.3 : -0.5; R.quad(h.T.fx, [fx + ox - r2, fy + oy - r2, zw + 0.01], [fx + ox + r2, fy + oy - r2, zw + 0.01], [fx + ox + r2, fy + oy + r2, zw + 0.01], [fx + ox - r2, fy + oy + r2, zw + 0.01], halka[0], halka[1], halka[2], halka[3], [c[0], c[1], c[2], a2]); }
      const hw = FK.hw || 3.3, hh2 = hw * tHey.asp; R.quad(tHey, [fx - hw / 2, fy - 0.02, zw - 0.06], [fx + hw / 2, fy - 0.02, zw - 0.06], [fx + hw / 2, fy - 0.02, zw - 0.06 + hh2], [fx - hw / 2, fy - 0.02, zw - 0.06 + hh2], 0, 0, 1, 1, c);
      for (const j of [[fx + 0.55, 1.7, 0.95, 1.1, 8], [fx - 0.55, 1.7, -0.95, 1.1, 8]]) for (let i = 0; i < j[4]; i++) { const pp = ((F.time * 0.9 + i / j[4]) % 1), t2 = pp * 0.7, px = j[0] + j[2] * t2, pz = j[1] + j[3] * t2 - 4.9 * t2 * t2; if (pz < zw) continue; const sz = 0.06 + pp * 0.06; R.quad(h.T.fx, [px - sz, fy - 0.03, pz - sz * 1.5], [px + sz, fy - 0.03, pz - sz * 1.5], [px + sz, fy - 0.03, pz + sz * 1.5], [px - sz, fy - 0.03, pz + sz * 1.5], damla[0], damla[1], damla[2], damla[3], [c[0], c[1], c[2], 0.9 - pp * 0.3]); } }, false);

    /* ---------- açılı nesneler ----------
       Resim, referans kamerasının açısıyla (yukarıdan 3/4) tek parça çizilmiştir: çeşmede çiçekler havuzu çepeçevre sarar, masanın
       tablası elips görünür, bankın oturağı seçilir. Resim dik durmaz; ön-alt kenarı yerde, üst kenarı nesnenin arka-üstünde olan EĞİK
       bir yüzeye gerilir. Eğik yüzeyin ekrandaki boyu (taban derinliği × sin açı + yükseklik × cos açı) gerçek bir nesneninkiyle aynı
       değişir; kamera yaklaşıp uzaklaştıkça resim zeminle birlikte kısalır, yere yapışık kalır. */
    const t3 = ad => K.im[ad] ? R0.texture(K.im[ad]) : null;
    const egik = (key, t, x, y, w, dOn, dArka, zUst, o) => { o = o || {}; if (!t) return; aci(key, (R, F) => { if (o.kosul && !o.kosul()) return; const c = isik(F, x, y), x0 = x - w / 2, x1 = x + w / 2;
      if (o.golge) yerGolge(R, x, y, w * 0.55, (dOn + dArka) * 0.62, o.golge);
      R.quad(t, [x0, y - dOn, 0], [x1, y - dOn, 0], [x1, y + dArka, zUst], [x0, y + dArka, zUst], o.ayna ? 1 : 0, 0, o.ayna ? 0 : 1, 1, c, false, 1); }, o.dipli); };
    /* çeşme: iki çizim (halka tarh / bölmeli tarh), panelden seçilir */
    [['pl3-cesme-c', 5.5, 2.75, 3.8], ['pl3-cesme', 6.1, 3.05, 3.15], ['pl3-cesme-b', 6.3, 3.15, 3.0], ['pl3-cesme-d', 5.2, 2.6, 4.7]].forEach((q, i) => egik(FN.y, t3(q[0]), FN.x, FN.y, q[1], q[2], 0, q[3], { golge: 0.5, kosul: () => s.cs === i }));
    /* su canlı dursun: havuzun yüzünde genişleyip sönen halkalar ve göz kırpan parıltılar (resmin üstüne, gerçek su düzleminde) */
    const parilti = h.uv('glow');
    aci(FN.y - 0.01, (R, F) => { const c = isik(F, FN.x, FN.y), zw = 0.5;
      for (let i = 0; i < 3; i++) { const pp = ((F.time * 0.35 + i / 3) % 1), r2 = 0.2 + pp * 0.75, ox = [-0.75, 0.8, 0.05][i], oy = [-0.55, -0.5, -1.0][i]; R.quad(h.T.fx, [FN.x + ox - r2, FN.y + oy - r2, zw], [FN.x + ox + r2, FN.y + oy - r2, zw], [FN.x + ox + r2, FN.y + oy + r2, zw], [FN.x + ox - r2, FN.y + oy + r2, zw], halka[0], halka[1], halka[2], halka[3], [c[0], c[1], c[2], (1 - pp) * 0.55]); }
      for (let i = 0; i < 7; i++) { const a = i * 2.39996, rr = 0.55 + (i % 3) * 0.33, px = FN.x + Math.cos(a) * rr * 1.25, py = FN.y - 0.55 + Math.sin(a) * rr * 0.6, k = Math.max(0, Math.sin(F.time * (1.6 + i * 0.23) + i * 1.7)), sz = 0.07 + k * 0.07; if (k < 0.05) continue;
        R.quad(h.T.fx, [px - sz, py, zw + 0.05 - sz], [px + sz, py, zw + 0.05 - sz], [px + sz, py, zw + 0.05 + sz], [px - sz, py, zw + 0.05 + sz], parilti[0], parilti[1], parilti[2], parilti[3], [1, 1, 1, k * 0.8], true); } }, false);
    /* ---------- açılı dünya: tek üslup set (pa-*) ----------
       Bütün yapılar ve nesneler aynı üslup çapasına bağlı çizildi (mor arduvaz çatı, krem-ahşap cephe, gri-lila taş, altın fener ışığı),
       hepsi yukarıdan 3/4 açıyla. Boyutlar karakter boyuna (1,7) göre referanstaki oranlardan: fener ve sancak 1,7 kat, bank 1,3 kat,
       masa tablası 1 kat, tezgâh 2,3 kat. nesne(ad, x, y, en, ön, arka, boy, o): x, y nesnenin yerdeki ortası. */
    const nesne = (ad, x, y, w, dOn, dArka, zUst, o) => egik((o && o.key) || y, t3(ad), x, y, w, dOn, dArka, zUst, o);
    nesne('pa-han', -10.6, 9.6, 13.4, 4.9, 3.4, 10.6, { key: 16.2 });                 // sol: han, sundurması sağ-aşağıya bakar
    nesne(K.im['pa-kapi2'] ? 'pa-kapi2' : 'pa-kapi', KX, 25.0, 12.2, 2.5, 1.5, 7.7, { key: 25.4 });   // üst orta: kapı (tam karşıdan, basamaklar meydana iner)
    nesne('pa-sur', KX - 12.2, 26.0, 13.5, 0.7, 0.5, 3.0, { key: 26.4 }); nesne('pa-sur', KX + 12.2, 26.0, 13.5, 0.7, 0.5, 3.0, { key: 26.4, ayna: true });
    nesne('pa-tez0', 8.3, 21.3, 4.3, 1.7, 1.4, 2.9); nesne('pa-tez1', 12.5, 19.0, 4.0, 1.8, 1.5, 3.2);
    nesne('pa-ev', 15.6, 13.6, 6.6, 2.4, 1.8, 6.6, { key: 16 });                       // sağ: konak
    lamps.forEach(l => nesne('pa-fener', l[0], l[1], 0.9, 0.32, 0.02, 3.05));
    [[FN.x - 3.0, FN.y - 2.5], [FN.x + 3.0, FN.y - 2.5], [KX - 6.0, 21.8], [KX + 6.0, 21.8]].forEach(q => nesne('pa-sancak', q[0], q[1], 0.74, 0.26, 0.02, 2.62));
    L.benches.forEach((b, i) => nesne('pa-bank', b[0], b[1], 2.15, 1.0, 0.9, 1.75, { ayna: i % 2 === 1 }));
    masa.forEach((m, i) => nesne(K.im['pa-masa'] ? 'pa-masa' : 'pl3-masa' + i, m[0], m[1], 2.25, 1.0, 0.4, 1.18, { ayna: i % 2 === 1, dipli: true }));
    [[13.0, 8.4, 5.2], [-2.6, 21.6, 4.6], [KX + 8.6, 23.6, 4.8]].forEach(q => nesne('pa-erguvan', q[0], q[1], q[2], 1.2, 0.6, q[2] * 1.05, { golge: 0.5 }));
    [[-13.0, 22.4, 5.0], [13.6, 3.4, 4.6]].forEach(q => nesne('pa-agac', q[0], q[1], q[2], 1.2, 0.6, q[2] * 1.05, { golge: 0.5 }));
    [P(11.6, 1.5), [10.3, 22.6], [-12.6, 3.2]].forEach((q, i) => nesne('pa-fici', q[0], q[1], 1.9, 0.8, 0.6, 1.5, { ayna: i % 2 === 1, dipli: true }));
    tarhYer.slice(2).forEach((q, i) => nesne(K.im['pa-tarh'] ? 'pa-tarh' : 'pl3-tarh' + (i % 2), q[0], q[1] + 0.4, 3.4, 0.75, 0.6, 0.95, { ayna: i % 2 === 1, dipli: true }));
    [[10.6, 6.6], [-0.8, 12.8], [KX - 5.2, 23.0], [11.4, 14.6]].forEach((q, i) => nesne('pa-kutu', q[0], q[1], 1.5, 0.75, 0.6, 1.25, { ayna: i % 2 === 1, dipli: true }));
    [[5.6, 1.5, false], [-5.6, 1.5, true], [12.6, 11.2, false]].forEach(q => nesne('pa-korkuluk', q[0], q[1], 4.2, 1.3, 1.1, 1.55, { ayna: q[2] }));   // alçak taş korkuluklar: meydanın alt girişini çerçeveler
    /* uzak manzara: surun arkasında tepede kale, şelaleler, çam ormanı (tek resim, çok uzakta dik durur; sis hafifçe soldurur) */
    const tUzak = t3('pa-uzak'); if (tUzak) aci(900, (R, F) => { const c = h.amb(F), ox = F.camX * 0.55 + KX, x0 = ox - 36, x1 = ox + 36, yy = 36, z0 = -2.5, z1 = z0 + 72 * 0.282; R.quad(tUzak, [x0, yy, z0], [x1, yy, z0], [x1, yy, z1], [x0, yy, z1], 0, 0.085, 1, 0.925, c, false, 0.35); }, false);
    [[-13.5, 29.6, 5.6, 'pa-agac'], [-7.2, 30.4, 5.0, 'pa-erguvan'], [-2.4, 29.4, 5.2, 'pa-agac'], [8.4, 29.6, 5.4, 'pa-agac'], [13.6, 30.6, 5.2, 'pa-erguvan'], [19.0, 29.4, 5.8, 'pa-agac']].forEach((q, i) => nesne(q[3], q[0], q[1], q[2], 1.0, 0.6, q[2] * 1.02, { ayna: i % 2 === 1 }));   // surun arkasındaki ağaç sırası
    /* fener ışığı: fanusta göz kırpan sıcak parıltı (resmin üstüne, toplamalı) */
    aci(-50, (R, F) => { for (const l of lamps) { const k = 0.1 + 0.03 * Math.sin(F.time * 3.1 + l[0]) + 0.12 * F.night, sz = 0.7; R.quad(h.T.fx, [l[0] - sz, l[1] - 0.05, 2.5 - sz], [l[0] + sz, l[1] - 0.05, 2.5 - sz], [l[0] + sz, l[1] - 0.05, 2.5 + sz], [l[0] - sz, l[1] - 0.05, 2.5 + sz], parilti[0], parilti[1], parilti[2], parilti[3], [1 * k, 0.72 * k, 0.36 * k, 1], true); } }, false);

    /* çeşit: sepetler, çuvallar, saksı öbekleri (yapı diplerinde ve tezgâh önlerinde; boşluğu değil kullanım yerini doldurur) */
    const tSepet = [h.D('pl-sepet0', () => art.crates()), h.D('pl-sepet1', () => art.crates())];
    [[[9.9, 18.9], 0], [[13.4, 16.7], 1], [P(9.9, 0.9), 1], [P(1.6, 0.8), 0]].forEach(q => dip(hb(tSepet[q[1]], q[0][0], q[0][1], { occl: false })));

    const tCali = [h.D('pl-onplan0', () => art.planter(22)), h.D('pl-onplan1', () => art.planter(23))];
    [[P(-1.2, 0.5), 3.0, 0], [P(12.6, 0.4), 2.8, 0], [[-13.6, 1.6], 3.6, 1], [[13.4, 2.4], 3.4, 1], [[12.9, 12.6], 3.0, 0], [[-2.2, 19.8], 2.6, 0], [[9.4, 22.6], 3.2, 1], [[-9.9, 21.0], 3.2, 1]].forEach(q => dip(hb(tCali[q[2]], q[0][0], q[0][1], { w: q[1], occl: false })));
    return {};
  } };

  /* ---------- ön plan çerçevesi ve deneme paneli (yalnız pilot haritada görünür) ---------- */
  function kur() { if (document.getElementById('pilotPanel')) return;
    const on = document.createElement('div'); on.id = 'onPlan'; on.setAttribute('aria-hidden', 'true'); on.innerHTML = '<img class="ust" alt="" src="assets/dunya/an/pl-dal.webp"><img class="sol" alt="" src="assets/dunya/an/pl-onplan0.webp"><img class="sag" alt="" src="assets/dunya/an/pl-onplan0.webp">';
    const cv = document.getElementById('isikSuzgeci') || document.getElementById('world'); cv.insertAdjacentElement('afterend', on);
    const p = document.createElement('div'); p.id = 'pilotPanel'; app.appendChild(p);
    const ciz = () => { p.innerHTML = '<b class="pp-bas">Deneme paneli</b>' + SEC.map(q => '<div class="pp-sat"><span>' + q[1] + '</span><div class="pp-sec">' + q[2].map((ad, i) => '<button type="button" data-k="' + q[0] + '" data-v="' + i + '" aria-pressed="' + (s[q[0]] === i) + '">' + ad + '</button>').join('') + '</div></div>').join('');
      p.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { s[b.dataset.k] = +b.dataset.v; uygula(); ciz(); if (EO2.audio) EO2.audio.ui(); })); };
    ciz(); }
  if (EO2.CAM) EO2.CAM.pilot = { th: 17 * Math.PI / 180, H: 8.4, D: 15.2, feet: 0.64, kisi: 0.138 };   // kisi: referansta karakter ekran boyunun sekizde biri kadar   // referans kadrajı: yüksek ve geniş açı
  let oncekiKam = null;
  EO2.frameHooks.push(() => { if (!EO2.api) return; const acik = EO2.api.scene() === 'pilot', AS = EO2.api.S; if (acik) kur();
    if (acik && oncekiKam === null && AS) { oncekiKam = AS.camMode || 'yakin'; AS.camMode = 'pilot'; } else if (!acik && oncekiKam !== null && AS) { if (AS.camMode === 'pilot') AS.camMode = oncekiKam; oncekiKam = null; } const p = document.getElementById('pilotPanel'), on = document.getElementById('onPlan');
    const dn = document.getElementById('world'); if (dn) dn.classList.toggle('pilot-tek', acik && s.h3 === 2); if (p) p.style.display = acik ? '' : 'none'; if (on) { on.style.display = acik && s.on ? '' : 'none'; if (acik) on.style.setProperty('--kx', (-(EO2.api.player.x || 0) * 5).toFixed(1)); } });
  (function bekle() { if (!EO2.api || !EO2.doku || !EO2.doku.yuklendi) return setTimeout(bekle, 120); EO2.doku.yuklendi.then(uygula); })();
})();
