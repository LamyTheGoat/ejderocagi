/* EO2 dikey dilim · Pazar (Bedesten içi) ve Topçu Arenası avlusu. scenes.js ile aynı düzen. */
(function () {
  'use strict';
  const EO2 = window.EO2, D = EO2.sceneDefs;
  const rectOf = (x, y, w, d) => [x - w / 2, x + w / 2, y - d * 0.4, y + d * 0.6];

  /* ================= PAZAR ================= */
  {
    const LAMPS = [[0, 3.2, '#ffb04a', [1, 0.62, 0.24]], [0, 7.0, '#4fd0c8', [0.3, 0.9, 0.85]], [0, 10.8, '#ff6a7a', [1, 0.35, 0.42]], [0, 14.6, '#b98aff', [0.7, 0.5, 1]],
      [-3.1, 5.1, '#6fb0ff', [0.4, 0.65, 1]], [3.1, 5.1, '#ffb04a', [1, 0.62, 0.24]], [-3.1, 8.9, '#ff6a7a', [1, 0.35, 0.42]], [3.1, 8.9, '#4fd0c8', [0.3, 0.9, 0.85]], [-3.1, 12.7, '#ffb04a', [1, 0.62, 0.24]], [3.1, 12.7, '#b98aff', [0.7, 0.5, 1]], [-3.1, 16.5, '#4fd0c8', [0.3, 0.9, 0.85]], [3.1, 16.5, '#6fb0ff', [0.4, 0.65, 1]]];
    const goods = [[-5.0, 3.4, 0], [5.0, 4.6, 1], [-5.0, 7.6, 2], [5.0, 8.6, 3], [-5.0, 11.6, 1], [5.0, 12.6, 0], [-5.0, 15.4, 3], [5.0, 16.2, 2]];
    const L = { id: 'pazar', name: 'Pazar', sub: 'Bedesten', indoor: true,
      light: { amb: [0.78, 0.70, 0.66], night: 1, fog: 0, clear: [0.07, 0.05, 0.07] },
      bounds: [-5.7, 5.7, 0.5, 18.3], mapRect: [-12, -6, 24, 30], paved: [[-13, -7, 13, 25]], start: { x: 0, y: 1.7, dir: 'up' }, entry: {}, signs: [],
      interact: [
        { id: 'cikis', x: 0, y: 0.7, r: 1.5, z: 2.4, label: 'Meydana çık', sub: 'Çarşı kapısı', act: 'go:meydan' },
        { id: 'pano', x: 0, y: 18.4, r: 2.0, z: 4.2, label: 'İlanlara bak', sub: 'Bedesten panosu', act: 'panel:pazar' },
      ],
      lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [],
      rects: [...goods.map(q => rectOf(q[0], q[1], 1.5, 0.8)), rectOf(0, 17.2, 3.0, 0.9)], circles: [],
      lights: [...LAMPS.map(l => [l[0], l[1], 4.2, 0.62]), [0, 17.6, 4.5, 0.6], [-6.2, 9, 3.6, 0.45], [6.2, 9, 3.6, 0.45]].slice(0, 16), embers: [],
      shadows: [...goods.map(q => [q[0], q[1] + 0.1, 1.2, 0.5, 0.7]), [0, 17.3, 2.2, 0.8, 0.7], [0, 19, 7, 0.9, 0.6], [-6.3, 9, 0.9, 10, 0.55], [6.3, 9, 0.9, 10, 0.55]],
      mini: { paved: [[-6.2, 0, 6.2, 19]], blocks: [...goods.map(q => [q[0] - 0.7, q[1] - 0.3, q[0] + 0.7, q[1] + 0.5]), [-1.5, 16.8, 1.5, 17.7]], bg: '#3a2530', floor: '#d9c7ae' },
      npcs: [
        { id: 'rustem', name: 'Rüstem Ağa', role: 'Bedesten', portrait: 'npc-bedesten', set: 'temel', x: 0, y: 16.4, dir: 'down', act: 'panel:pazar', lines: ['Bedesten\'e hoş geldin. İlanlar panoda.', 'Malını getir, fiyatını sen koy.'] },
        { id: 'tuccar', name: 'Tüccar', role: 'Gece Çarşısı', portrait: 'npc-tuccar', set: 'avci', x: -3.9, y: 9.6, dir: 'right', act: 'panel:pazar', lines: ['Tezgâhım açık, terbiyeci.', 'İyi mal kendini belli eder.'] },
        { id: 'hamal', name: 'Hamal', role: 'NPC', set: 'bare', x: 1.6, y: 5, dir: 'up', path: [[1.6, 5], [1.6, 14.4], [-1.6, 14.4], [-1.6, 5]], lines: ['Yol ver terbiyeci, yük ağır.'] },
      ] };
    D.pazar = { L, build(h) {
      const art = h.art, tBack = h.tex(art.bazaarBack()), tW = h.tex(art.bazaarSide(19.2, 3)), tE = h.tex(art.bazaarSide(19.2, 6));
      tW.glowK = tE.glowK = 0.42;
      const tCeil = h.R.texture(art.vaultTile(), { repeat: true });
      h.push({ key: 950, draw(R, F) { if (F.camH > 6.6) return; const c = h.amb(F, 0.85); R.quad(tCeil, [-6.4, F.camY + 0.5, 7.2], [6.4, F.camY + 0.5, 7.2], [6.4, 19.2, 7.2], [-6.4, 19.2, 7.2], 0, 0, 4, (19.2 - F.camY) / 3.2, c, false, 0); } });
      const tRun = h.R.texture(art.kilim(21, true)); h.flat(tRun, -1.0, 0.9, 1.0, 8.6); h.flat(tRun, -1.0, 8.8, 1.0, 16.2, { key: 899 });
      h.billboard(tBack, -6.4, 19.2, { ax: 0, fade: false, occl: false, fog: 0, glowK: 0.45 }); h.side(tW, -6.35, 0, 19.2, 'E'); h.side(tE, 6.35, 0, 19.2, 'W');
      const tG = [0, 1, 2, 3].map(k => h.tex(art.goods(k))); for (const q of goods) h.billboard(tG[q[2]], q[0], q[1], { occl: false });
      h.billboard(h.tex(art.counter()), 0, 17.2, { occl: false }); h.billboard(h.tx.crates, 4.6, 17.6); h.billboard(h.tx.barrel, -4.6, 17.7);
      // mozaik fenerler: her biri kendi renginde ışır
      const cache = {}, g = h.uv('glow');
      for (const l of LAMPS) { const t = cache[l[2]] || (cache[l[2]] = h.tex(art.mosaicLamp(l[2]))); h.billboard(t, l[0], l[1], { z0: 4.3, occl: false, fade: true, glowK: 0.5 });
        h.push({ key: l[1] - 0.02, draw(R, F) { const a = h.nearFade(F, l[1]) * (0.85 + Math.sin(F.time * 5 + l[0] * 2 + l[1]) * 0.07), s = 1.45, c = l[3]; if (a < 0.02) return; R.quad(h.T.fx, [l[0] - s, l[1] - 0.02, 4.92 - s], [l[0] + s, l[1] - 0.02, 4.92 - s], [l[0] + s, l[1] - 0.02, 4.92 + s], [l[0] - s, l[1] - 0.02, 4.92 + s], g[0], g[1], g[2], g[3], [c[0] * a * 0.8, c[1] * a * 0.8, c[2] * a * 0.8, 1], true, 0); } }); }
    } };
  }

  /* ================= TOPÇU ARENASI ================= */
  {
    const braz = [[-4.4, 6.2], [4.4, 6.2], [-4.4, 14.6], [4.4, 14.6], [-2.6, 21.0], [2.6, 21.0]], targets = [[-8.6, 9.0], [-8.6, 13.0], [8.6, 11.0]], racks = [[8.4, 5.4], [-8.2, 17.4]], poles = [[-6.6, 2.6], [6.6, 2.6]];
    const L = { id: 'arena', name: 'Topçu Arenası', sub: 'Talim avlusu', floor: 'sand', flyer: true, petals: false,
      bounds: [-11.3, 11.3, 0.5, 21.6], mapRect: [-22, -8, 44, 44], paved: [[-1.6, -4, 1.6, 4.2]], start: { x: 0, y: 1.8, dir: 'up' }, entry: {},
      emb: { x: 0, y: 10.4, r: 2.6 },
      signs: [{ id: 'duello', label: 'Düello Kapısı', x: 0, y: 22.5, z: 7.6 }, { id: 'zindan', label: 'Zindanlar', x: -7.85, y: 22.5, z: 4.6 }, { id: 'tribun', label: 'Canlı Tribün', x: 9.5, y: 22.5, z: 4.9 }],
      interact: [
        { id: 'cikis', x: 0, y: 0.7, r: 1.5, z: 2.4, label: 'Meydana dön', sub: 'Arena kapısı', act: 'go:meydan' },
        { id: 'duello', x: 0, y: 21.4, r: 2.0, z: 3.6, label: 'Düelloya gir', sub: 'Gösterim düellosu', act: 'duel' },
        { id: 'zindan', x: -7.85, y: 21.4, r: 2.6, z: 3.0, label: 'Kapılara bak', sub: 'Şahmeran · Komutan', act: 'panel:arena' },
        { id: 'abra', x: 6.3, y: 21.4, r: 1.5, z: 3.0, label: 'Kapıya bak', sub: 'Abra', act: 'panel:arena' },
        { id: 'tribun', x: 9.6, y: 21.2, r: 1.4, z: 3.0, label: 'Tribüne çık', sub: 'Canlı Tribün', act: 'panel:arena' },
        { id: 'hedef', x: -8.6, y: 10.2, r: 1.6, z: 2.2, label: 'Hedefe bak', sub: 'Talim hedefi', act: 'toast:Hedef tahtası top izleriyle dolu.' },
      ],
      lamps: [], braziers: braz, trees: [], benches: [], planters: [], stalls: [],
      rects: [...targets.map(t => rectOf(t[0], t[1], 1.2, 0.6)), ...racks.map(t => rectOf(t[0], t[1], 2.6, 0.7))], circles: [...braz.map(b => [b[0], b[1], 0.4]), ...poles.map(p => [p[0], p[1], 0.24])],
      lights: [...braz.map(b => [b[0], b[1], 5.2, 1.1]), [0, 21.6, 4.5, 0.8]],
      shadows: [...targets.map(t => [t[0], t[1] + 0.1, 1.0, 0.45, 0.6]), ...racks.map(t => [t[0], t[1] + 0.1, 1.8, 0.6, 0.65]), [0, 22.2, 13, 1.0, 0.6], [-11.8, 11, 1.0, 12, 0.5], [11.8, 11, 1.0, 12, 0.5]],
      mini: { paved: [[-1.6, 0, 1.6, 4.2]], rings: [[0, 10.4, 2.6], [0, 10.4, 6.2]], blocks: [[-12, 22, 12, 23], ...racks.map(t => [t[0] - 1.3, t[1] - 0.3, t[0] + 1.3, t[1] + 0.4])], bg: '#dcc79c' },
      npcs: [
        { id: 'talimci', name: 'Talimci', role: 'Topçu Arenası', set: 'muhafiz', x: 1.9, y: 19.4, dir: 'down', act: 'duel', lines: ['Hazırsan kapı açık, terbiyeci.', 'Rüzgârı oku, sonra tetiğe dokun.'] },
        { id: 'arenabekci', name: 'Bekçi', role: 'Topçu Arenası', set: 'muhafiz', x: -2.4, y: 3.4, dir: 'down', lines: ['Avluda koşmak serbest, kavga yasak. Kavga kapının ardında.'] },
        { id: 'cirak', name: 'Çırak', role: 'NPC', set: 'madenci', x: -6.6, y: 10.6, dir: 'left', lines: ['Bir gün ben de o kapıdan gireceğim.', 'Hedefi yine ıskaladım.'] },
      ] };
    D.arena = { L, build(h) {
      const art = h.art; h.addSky();
      h.billboard(h.tex(art.arenaBack(h.E)), -12.5, 22.6, { ax: 0, fade: false, occl: false, glowK: 1.1 });
      h.side(h.tex(art.arenaSide(22.6, 41)), -12.0, 0, 22.6, 'E'); h.side(h.tex(art.arenaSide(22.6, 47)), 12.0, 0, 22.6, 'W');
      const tT = h.tex(art.target()), tR = h.tex(art.cannonRack()), tPole = h.tex(art.bannerPole(h.E, '#bb362f'));
      for (const t of targets) h.billboard(tT, t[0], t[1], { occl: false }); for (const t of racks) h.billboard(tR, t[0], t[1], { occl: false, glowK: 1.2 });
      for (const p of poles) h.billboard(tPole, p[0], p[1], { ax: 0.2, sway: 0.03 }); for (const b of braz) h.billboard(h.tx.braz, b[0], b[1], { glowK: 1.4 });
      h.billboard(h.tx.crates, 9.6, 3.2); h.billboard(h.tx.barrel, -9.8, 3.0); h.billboard(h.tx.barrel, -9.2, 2.5);
      // avlu çemberi: kumda iki halka
      const ring = h.uv('ring');
      h.push({ key: 891, draw(R, F) { const c = h.amb(F), e = L.emb; for (const [rr, a] of [[6.2, 0.55], [6.6, 0.3]]) R.quad(h.T.fx, [e.x - rr, e.y - rr, 0.011], [e.x + rr, e.y - rr, 0.011], [e.x + rr, e.y + rr, 0.011], [e.x - rr, e.y + rr, 0.011], ring[0], ring[1], ring[2], ring[3], [c[0] * 0.75, c[1] * 0.6, c[2] * 0.5, a]); } });
    } };
  }
})();
