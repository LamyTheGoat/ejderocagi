/* EO2 dikey dilim · diğer alanlar: Han içi, Ejder Bahçesi, Kuzey Yolu.
   Her alan bir yerleşim (L) ve bir kurucu (build) verir. Kurucu, world.js'in yardımcılarıyla (h) statik çizim listesini doldurur.
   Mekanik eklenmez: kapılar mevcut sistemlerin paneline ya da komşu alana açılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, D = EO2.sceneDefs = {};
  const rectOf = (x, y, w, d) => [x - w / 2, x + w / 2, y - d * 0.4, y + d * 0.6];

  /* ================= HAN ================= */
  {
    const tables = [[-3.2, 6.6, 0], [3.4, 5.0, 1], [0.2, 9.4, 1]], hang = [[-4.2, 8.2], [4.2, 8.2], [0, 4.6], [-4.6, 3.0], [4.6, 3.0]];
    const L = { id: 'han', name: 'Han', sub: 'Kervansaray Kıraathanesi', indoor: true, floor: 'wood',
      light: { amb: [0.80, 0.66, 0.56], night: 1, fog: 0, clear: [0.07, 0.045, 0.05] },
      bounds: [-7.3, 7.3, 0.5, 12.3], mapRect: [-12, -6, 24, 24], paved: [[-13, -7, 13, 19]], start: { x: 0, y: 1.7, dir: 'up' }, entry: {}, signs: [],
      interact: [
        { id: 'cikis', x: 0, y: 0.7, r: 1.5, z: 2.4, label: 'Meydana çık', sub: 'Kapı', act: 'go:meydan' },
        { id: 'masa1', x: -3.2, y: 6.0, r: 1.5, z: 1.9, label: 'Masaya bak', sub: 'Tavla', act: 'panel:han' },
        { id: 'masa2', x: 3.4, y: 4.4, r: 1.5, z: 1.9, label: 'Masaya bak', sub: 'Kor 21', act: 'panel:han' },
        { id: 'ocak', x: 0, y: 12.0, r: 2.3, z: 3.4, label: 'Isın', sub: 'Ocak', act: 'toast:Ocağın koru yüzünü ısıttı.' },
      ],
      lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [],
      rects: [rectOf(-5.5, 9.4, 3.6, 1.0), ...tables.map(t => rectOf(t[0], t[1], 2.0, 0.8))], circles: [[-6.6, 2.2, 0.45], [-6.0, 1.7, 0.45], [6.5, 11.2, 0.5]],
      lights: [[0, 11.4, 8.5, 1.4], ...hang.map(l => [l[0], l[1], 4.6, 0.8]), [-5.5, 9.6, 3.5, 0.5]], embers: [[0, 12.4, 0.9], [-0.6, 12.4, 0.8], [0.6, 12.4, 0.8]],
      shadows: [...tables.map(t => [t[0], t[1] + 0.1, 1.6, 0.7, 0.75]), [-5.5, 9.5, 2.4, 0.9, 0.7], [0, 12.4, 8, 0.8, 0.6], [-7.6, 6, 0.8, 7, 0.5], [7.6, 6, 0.8, 7, 0.5]],
      mini: { paved: [[-7.6, 0, 7.6, 12.8]], blocks: [[-7.3, 8.9, -3.7, 10.0], ...tables.map(t => [t[0] - 0.9, t[1] - 0.4, t[0] + 0.9, t[1] + 0.4]), [-1.9, 12.3, 1.9, 12.9]], bg: '#3a2530', floor: '#b98253' },
      npcs: [
        { id: 'hanci', name: 'Hancı', role: 'Han', set: 'madenci', x: -5.5, y: 10.3, dir: 'down', lines: ['Hoş geldin terbiyeci. Ocak yanıyor, masa boş.', 'Bugün tavlada zar kimseye gülmüyor.'] },
        { id: 'tavlaci1', name: 'Tavlacı', role: 'NPC', set: 'avci', x: -4.75, y: 6.6, dir: 'right', lines: ['Şeş beş! Gördün mü?', 'Zar tutmuyorum, yemin ederim.'] },
        { id: 'tavlaci2', name: 'Tavlacı', role: 'NPC', set: 'temel', x: -1.65, y: 6.6, dir: 'left', lines: ['Yine mars olacağım galiba.', 'Bir el daha, bu sefer benim.'] },
      ] };
    D.han = { L, build(h) {
      const art = h.art, tBack = h.tex(art.hanBack()), tSideW = h.tex(art.hanSide(12.9, 3)), tSideE = h.tex(art.hanSide(12.9, 4));
      const tCeil = h.R.texture(art.ceilingTile(), { repeat: true });
      h.push({ key: 950, draw(R, F) { if (F.camH > 6.6) return; const c = h.amb(F, 0.8); R.quad(tCeil, [-8, F.camY + 0.5, 7.2], [8, F.camY + 0.5, 7.2], [8, 12.9, 7.2], [-8, 12.9, 7.2], 0, 0, 8, (12.9 - F.camY) / 2, c, false, 0); } });
      const tRun = h.R.texture(art.kilim(5, true)), tRug = h.R.texture(art.kilim(12, false));
      h.flat(tRun, -1.15, 0.9, 1.15, 10.6); h.flat(tRug, -5.4, 4.6, -1.0, 8.4, { key: 899 }); h.flat(tRug, 1.2, 3.2, 5.6, 6.8, { key: 898 });
      h.billboard(tBack, -8, 12.9, { ax: 0, fade: false, occl: false, fog: 0, glowK: 0.55 }); h.side(tSideW, -7.95, 0, 12.9, 'E'); h.side(tSideE, 7.95, 0, 12.9, 'W');
      const tT = [h.tex(art.tableSet(0)), h.tex(art.tableSet(1))]; for (const t of tables) h.billboard(tT[t[2]], t[0], t[1], { occl: false });
      h.billboard(h.tex(art.counter()), -5.5, 9.4, { occl: false }); h.billboard(h.tx.barrel, -6.6, 2.2); h.billboard(h.tx.barrel, -6.0, 1.7); h.billboard(h.tx.crates, 6.5, 11.2);
      const tH = h.tex(art.hangLantern()); for (const l of hang) h.billboard(tH, l[0], l[1], { z0: 4.3, occl: false, fade: true, glowK: 1.3 });
      // asılı fener haleleri ve ocak ateşi
      const g = h.uv('glow');
      for (const l of hang) h.push({ key: l[1] - 0.02, draw(R, F) { const k = 0.9 + Math.sin(F.time * 6 + l[0] * 3) * 0.06, s = 1.5; R.quad(h.T.fx, [l[0] - s, l[1] - 0.02, 4.95 - s], [l[0] + s, l[1] - 0.02, 4.95 - s], [l[0] + s, l[1] - 0.02, 4.95 + s], [l[0] - s, l[1] - 0.02, 4.95 + s], g[0], g[1], g[2], g[3], [0.95 * k, 0.6 * k, 0.24 * k, 1], true, 0); } });
      h.push({ key: 12.85, draw(R, F) { const t = F.time, s = 3.0 + Math.sin(t * 8) * 0.12; R.quad(h.T.fx, [-s, 12.85, 1.0 - s], [s, 12.85, 1.0 - s], [s, 12.85, 1.0 + s], [-s, 12.85, 1.0 + s], g[0], g[1], g[2], g[3], [1.0, 0.5, 0.16, 1], true, 0);
        for (let i = 0; i < 5; i++) { const u = h.uv('flame' + ((Math.floor(t * 10) + i) % 3)), w = 0.42 + (i % 2) * 0.12 + Math.sin(t * 11 + i * 2) * 0.04, hh = 1.0 + Math.sin(t * 8 + i) * 0.16 + (i === 2 ? 0.35 : 0), ox = (i - 2) * 0.36;
          R.quad(h.T.fx, [ox - w, 12.86, 0.2], [ox + w, 12.86, 0.2], [ox + w, 12.86, 0.2 + hh * 1.35], [ox - w, 12.86, 0.2 + hh * 1.35], u[0], u[1], u[2], u[3], [1, 1, 1, 1], false, 0); R.quad(h.T.fx, [ox - w, 12.861, 0.2], [ox + w, 12.861, 0.2], [ox + w, 12.861, 0.2 + hh * 1.35], [ox - w, 12.861, 0.2 + hh * 1.35], u[0], u[1], u[2], u[3], [0.5, 0.3, 0.1, 1], true, 0); } } });
    } };
  }

  /* ================= EJDER BAHÇESİ ================= */
  {
    const pond = { x: 7.0, y: 15.6, r: 3.5 };
    const drg = [
      { id: 'kor', name: 'Kor', sub: 'Ateş · yetişkin · senin ejderin', ext: 'kor', x: -6.4, y: 15.2, w: 6.2, face: 1, line: 'Kor homurdandı, sonra başını eline dayadı.' },
      { id: 'ayaz', name: 'Ayaz', sub: 'Buz · genç · bahçe sakini', ext: 'buz', x: 6.2, y: 6.2, w: 3.9, face: -1, line: 'Ayaz serin bir nefes verdi.' },
      { id: 'tozan', name: 'Tozan', sub: 'Toprak · yavru · bahçe sakini', ext: 'toprak', x: -8.4, y: 5.6, w: 2.1, face: 1, line: 'Tozan kuyruğunu salladı.' },
    ];
    const trees = [['erguvan', -11.6, 21.4, 1], ['erguvan', 11.8, 21.8, 2], ['bahce', -11.8, 10.8, 5], ['bahce', 12.0, 11.6, 6], ['erguvan', -12.0, 2.6, 3], ['erguvan', 12.2, 2.4, 4], ['selvi', -3.6, 22.6], ['selvi', 3.8, 22.8], ['bahce', 0.6, 22.2, 5]];
    const lamps = [[-2.4, 3.0], [2.4, 3.0], [-2.4, 12.6], [2.4, 12.6]], planters = [[-4.0, 9.6, 0], [4.0, 9.6, 1], [-2.8, 17.6, 2], [3.2, 19.6, 3], [-9.6, 9.4, 1], [10.0, 9.6, 2]];
    const L = { id: 'bahce', name: 'Ejder Bahçesi', sub: 'Bakım ve kuluçka', flyer: true, petals: true,
      bounds: [-13.2, 13.2, 0.5, 23.2], mapRect: [-22, -8, 44, 44], paved: [[-1.5, -4, 1.5, 21], [-10.6, 9.0, 10.6, 11.4]], start: { x: 0, y: 1.8, dir: 'up' }, entry: {},
      signs: drg.map(d => ({ id: d.id, label: d.name, x: d.x, y: d.y, z: d.w * 0.82 })),
      interact: [
        { id: 'cikis', x: 0, y: 0.7, r: 1.5, z: 2.4, label: 'Meydana dön', sub: 'Bahçe kapısı', act: 'go:meydan' },
        ...drg.map(d => ({ id: d.id, x: d.x, y: d.y - 0.5, r: Math.max(2.0, d.w * 0.48), z: d.w * 0.7, label: 'Sev', sub: d.name, act: 'pet:' + d.id })),
        { id: 'yuva', x: -2.6, y: 19.4, r: 1.9, z: 2.0, label: 'Yuvaya bak', sub: 'Kuluçka', act: 'panel:bahce' },
        { id: 'golet', x: pond.x, y: pond.y - 3.4, r: 1.6, z: 1.6, label: 'Gölete bak', sub: 'Gölet', act: 'toast:Göletin suyu durgun. Nilüferler açmış.' },
      ],
      lamps, braziers: [], trees, benches: [[-4.4, 12.4], [4.6, 12.4]], planters, stalls: [],
      rects: [...drg.map(d => [d.x - d.w * 0.34, d.x + d.w * 0.34, d.y - 0.5, d.y + 0.7]), rectOf(-2.6, 19.9, 2.0, 0.9), [-5.35, -3.45, 12.28, 12.7], [3.65, 5.55, 12.28, 12.7], ...planters.map(p => [p[0] - 0.7, p[0] + 0.7, p[1] - 0.12, p[1] + 0.3])],
      circles: [[pond.x, pond.y, pond.r - 0.1], ...lamps.map(l => [l[0], l[1], 0.2]), ...trees.map(t => [t[1], t[2], 0.32])],
      lights: [...lamps.map(l => [l[0], l[1], 5.6, 1]), [-2.6, 19.6, 3.6, 0.8]], embers: [[-2.6, 19.9, 0.7]],
      shadows: [...drg.map(d => [d.x, d.y + 0.2, d.w * 0.45, d.w * 0.16, 0.8]), [pond.x, pond.y, pond.r + 0.5, pond.r + 0.4, 0.45], [0, 23.6, 14, 0.9, 0.6], [-13.6, 12, 0.9, 12, 0.5], [13.6, 12, 0.9, 12, 0.5]],
      mini: { paved: [[-1.5, 0, 1.5, 21], [-10.6, 9.0, 10.6, 11.4]], water: [[pond.x, pond.y, pond.r]], blocks: drg.map(d => [d.x - d.w * 0.3, d.y - 0.4, d.x + d.w * 0.3, d.y + 0.6]), bg: '#6fb85e' },
      npcs: [{ id: 'bahcivan', name: 'Bahçıvan', role: 'Ejder Bahçesi', set: 'bare', x: 3.0, y: 8.2, dir: 'down', lines: ['Kor bugün keyifli, güneşe yattı.', 'Yavrulara yaklaşırken acele etme, terbiyeci.'] }] };
    D.bahce = { L, build(h) {
      const art = h.art; h.addSky();
      const tWall = h.tex(art.boundary(28, 501)), tWS = h.tex(art.boundary(24, 502)), tWE = h.tex(art.boundary(24, 503));
      h.billboard(tWall, -14, 24, { ax: 0, fade: false, occl: false }); h.side(tWS, -14, 0, 24, 'E'); h.side(tWE, 14, 0, 24, 'W');
      let ei = 0, bi = 0; for (const t of trees) { if (t[0] === 'erguvan') h.billboard(h.tx.erguvan[ei++ % h.tx.erguvan.length], t[1], t[2], { sway: 0.06 }); else if (t[0] === 'bahce') h.billboard(h.tx.bahce[bi++ % 2], t[1], t[2], { sway: 0.05 }); else h.billboard(h.tx.selvi, t[1], t[2], { sway: 0.05 }); }
      for (const l of lamps) h.billboard(h.tx.lamp, l[0], l[1], { glowK: 1.2 }); for (const b of L.benches) h.billboard(h.tx.bench, b[0], b[1]); for (const p of planters) h.billboard(h.tx.planter[p[2]], p[0], p[1]);
      h.billboard(h.tex(art.nest()), -2.6, 19.9, { occl: false, glowK: 1.5 });
      // gölet: su, taş bilezik, nilüferler, pırıltı
      const tW = h.tx.water, tRim = h.R.texture(art.pondRim()), tL0 = h.R.texture(art.lily(false)), tL1 = h.R.texture(art.lily(true)), p = pond, rr = p.r + 0.35;
      h.flat(tW, p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r, { key: 897 }); h.flat(tRim, p.x - rr, p.y - rr, p.x + rr, p.y + rr, { key: 896, z: 0.02 });
      [[-1.6, -0.9, 0.5, 1], [0.9, -1.5, 0.42, 0], [1.7, 0.6, 0.55, 1], [-0.6, 1.5, 0.4, 0], [0.2, -0.2, 0.36, 1], [-2.0, 0.8, 0.34, 0]].forEach((q, i) => h.flat(q[3] ? tL1 : tL0, p.x + q[0] - q[2], p.y + q[1] - q[2], p.x + q[0] + q[2], p.y + q[1] + q[2], { key: 895 - i * 0.01, z: 0.025 }));
      h.push({ key: 894, draw(R, F) { const d = h.uv('dot'), ring = h.uv('ring'), c = h.amb(F);
        for (let i = 0; i < 3; i++) { const q = (F.time * 0.3 + i / 3) % 1, r = 0.3 + q * 1.5, ox = [-0.8, 1.2, 0.1][i], oy = [0.6, -0.4, -1.4][i]; R.quad(h.T.fx, [p.x + ox - r, p.y + oy - r, 0.03], [p.x + ox + r, p.y + oy - r, 0.03], [p.x + ox + r, p.y + oy + r, 0.03], [p.x + ox - r, p.y + oy + r, 0.03], ring[0], ring[1], ring[2], ring[3], [c[0], c[1], c[2], (1 - q) * 0.45]); }
        for (let i = 0; i < 10; i++) { const tw = Math.max(0, Math.sin(F.time * (2 + i * 0.4) + i * 2.1)), a = tw * tw * tw * 0.9 * (1 - F.night * 0.5), ang = i * 2.4, r2 = 0.6 + (i % 5) * 0.55, sx = p.x + Math.cos(ang) * r2, sy = p.y + Math.sin(ang) * r2, s = 0.08; if (a > 0.02) R.quad(h.T.fx, [sx - s, sy - s, 0.035], [sx + s, sy - s, 0.035], [sx + s, sy + s, 0.035], [sx - s, sy + s, 0.035], d[0], d[1], d[2], d[3], [a, a, a, 1], true, 0); } } });
      // ejderhalar: oyunun mevcut görselleri, gerçek boylarında; nefes alır, sevilince kıpırdar
      const pets = {};
      for (const d of drg) { const e = h.ext(d.ext); if (!e) continue; const hh = d.w * e.h / e.w, o = pets[d.id] = { id: d.id, x: d.x, y: d.y, z: hh * 0.92, cheer: 0, name: d.name, line: d.line }, sh = h.uv('shadow');
        h.push({ key: d.y, draw(R, F) { if (o.cheer > 0) o.cheer -= F.dt; const br = 1 + Math.sin(F.time * 1.3 + d.x) * 0.012, hop = o.cheer > 0 ? Math.abs(Math.sin(o.cheer * 8)) * 0.12 * d.w / 4 : 0, a = h.nearFade(F, d.y), c = F.lit(d.x, d.y, a), x0 = d.x - d.w / 2 * d.face, x1 = d.x + d.w / 2 * d.face;
          R.quad(h.T.fx, [d.x - d.w * 0.42, d.y - d.w * 0.09, 0.012], [d.x + d.w * 0.42, d.y - d.w * 0.09, 0.012], [d.x + d.w * 0.42, d.y + d.w * 0.09, 0.012], [d.x - d.w * 0.42, d.y + d.w * 0.09, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75 * a]);
          R.quad(e.t, [x0, d.y, hop], [x1, d.y, hop], [x1, d.y, hop + hh * br], [x0, d.y, hop + hh * br], 0, 0, 1, 1, c); } }); }
      return { pets };
    } };
  }

  /* ================= KUZEY YOLU ================= */
  {
    const trees = [['selvi', -5.2, 4.2], ['selvi', 5.4, 5.0], ['erguvan', -6.4, 10.5, 1], ['cinar', 6.6, 14.5], ['selvi', -5.6, 17.0], ['erguvan', 6.2, 22.0, 2], ['selvi', -6.2, 23.5], ['selvi', 5.6, 34.0], ['erguvan', -6.6, 36.5, 3], ['selvi', -5.4, 42.0], ['erguvan', 6.6, 43.0, 4], ['selvi', -6.8, 55.5], ['selvi', 6.8, 55.8], ['bahce', -9.5, 30], ['bahce', 10, 12], ['selvi', -11, 46], ['selvi', 11.5, 26], ['erguvan', 12, 50, 1]];
    const lamps = [[-3.3, 46.4], [3.3, 46.4]], camp = [[0.2, 51.3]];
    const rocks = [[4.6, 8.6, 1], [-4.8, 14.0, 2], [5.2, 26.2, 3], [-5.0, 32.6, 4], [4.4, 39.5, 5]], patches = [[-4.4, 6.2, 1], [4.3, 11.4, 2], [-4.2, 20.2, 3], [4.6, 18.2, 4], [-4.4, 38.6, 5], [4.2, 44.6, 6], [-4.6, 25.0, 7], [4.4, 33.0, 8]];
    const L = { id: 'yol', name: 'Kuzey Yolu', sub: 'Dış bölge', flyer: true, petals: false, road: [2.8, -100],
      bounds: [-7.4, 7.4, 0.6, 54.6], mapRect: [-24, -6, 48, 72], paved: [[-2.95, -8, 2.95, 70]], start: { x: 0, y: 2.0, dir: 'up' }, entry: {},
      signs: [{ id: 'kamp', label: 'Kervan Kampı', x: 0, y: 51.5, z: 4.6 }],
      interact: [
        { id: 'cikis', x: 0, y: 0.8, r: 1.5, z: 2.4, label: 'Meydana dön', sub: 'Kuzey Kapısı', act: 'go:meydan' },
        { id: 'tabela', x: 3.5, y: 6.3, r: 1.6, z: 2.9, label: 'Tabelayı oku', sub: 'Yol tabelası', act: 'panel:kuzey' },
        { id: 'kamp', x: -1.6, y: 51.6, r: 2.2, z: 2.6, label: 'Sefere çık', sub: 'Kervan Kampı', act: 'panel:kuzey' },
        { id: 'dere', x: 0, y: 28.4, r: 1.5, z: 1.6, label: 'Dereye bak', sub: 'Taş köprü', act: 'toast:Derenin suyu Ejder Bahçesi\'ndeki gölete iniyor.' },
      ],
      lamps, braziers: camp, trees, benches: [], planters: patches.map(p => [p[0], p[1], 0]), stalls: [],
      rects: [[-3.85, -3.55, 2, 26.2], [3.55, 3.85, 2, 26.2], [-3.85, -3.55, 30.8, 46], [3.55, 3.85, 30.8, 46], [-40, -3.05, 26.4, 30.6], [3.05, 40, 26.4, 30.6], [3.0, 3.9, 6.2, 6.7], rectOf(-4.7, 50.4, 2.4, 1.4), rectOf(4.0, 52.0, 3.4, 1.6)],
      circles: [...lamps.map(l => [l[0], l[1], 0.2]), [camp[0][0], camp[0][1], 0.4], ...trees.filter(t => Math.abs(t[1]) < 7.5).map(t => [t[1], t[2], 0.32]), ...rocks.map(r => [r[0], r[1], 0.6])],
      lights: [...lamps.map(l => [l[0], l[1], 5.6, 1]), [camp[0][0], camp[0][1], 6, 1.2], [4.0, 51.6, 3.5, 0.6]],
      shadows: [[0, 28.5, 3.4, 2.6, 0.35], [-4.7, 50.6, 1.7, 0.8, 0.7], [4.0, 52.2, 2.4, 1.0, 0.7], ...rocks.map(r => [r[0], r[1] + 0.1, 1.0, 0.45, 0.6])],
      mini: { paved: [[-2.9, 0, 2.9, 55]], strips: [[-9, 27, 9, 30]], blocks: [[-5.9, 49.8, -3.5, 51.2], [2.3, 51.2, 5.7, 52.8]], bg: '#6fb85e' },
      npcs: [
        { id: 'kervanci', name: 'Kervancı', role: 'Kervan Kampı', set: 'avci', x: 1.9, y: 50.2, dir: 'down', act: 'panel:kuzey', lines: ['Kervan şafakta yola çıkar.', 'Seferden dönen terbiyeciler burada soluklanır.'] },
        { id: 'devriye', name: 'Bekçi', role: 'Kuzey Yolu', set: 'muhafiz', x: -1.6, y: 12, dir: 'up', path: [[-1.6, 12], [-1.6, 23], [1.6, 23], [1.6, 12]], lines: ['Yol açık. Dereyi köprüden geç.'] },
      ] };
    D.yol = { L, build(h) {
      const art = h.art; h.addSky();
      let ei = 0, bi = 0; for (const t of trees) { if (t[0] === 'erguvan') h.billboard(h.tx.erguvan[ei++ % h.tx.erguvan.length], t[1], t[2], { sway: 0.06 }); else if (t[0] === 'bahce') h.billboard(h.tx.bahce[bi++ % 2], t[1], t[2], { sway: 0.05 }); else if (t[0] === 'cinar') h.billboard(h.tx.cinar, t[1], t[2], { sway: 0.07 }); else h.billboard(h.tx.selvi, t[1], t[2], { sway: 0.05 }); }
      const tF1 = h.tex(art.fence(24.2)), tF2 = h.tex(art.fence(15.2));
      h.side(tF1, -3.7, 2, 26.2, 'E'); h.side(tF1, 3.7, 2, 26.2, 'W'); h.side(tF2, -3.7, 30.8, 46, 'E'); h.side(tF2, 3.7, 30.8, 46, 'W');
      const tPar = h.tex(art.lowWall(4.2, 601)); h.side(tPar, -3.0, 26.4, 30.6, 'E'); h.side(tPar, 3.0, 26.4, 30.6, 'W');
      // dere: yolun iki yanında akan su şeritleri (köprünün altı yolun kendisi)
      const tWs = h.R.texture(art.waterStrip(), { repeat: true });
      for (const [a, b] of [[-60, -3.0], [3.0, 60]]) h.push({ key: 893, draw(R, F) { const c = h.amb(F), du = (F.time * 0.06) % 1, u = (b - a) / 8; R.quad(tWs, [a, 27.0, 0.011], [b, 27.0, 0.011], [b, 30.0, 0.011], [a, 30.0, 0.011], du, 0, du + u, 1, c, false, 1); } });
      h.billboard(h.tex(art.signpost()), 3.5, 6.5, { occl: false });
      rocks.forEach(r => h.billboard(h.tex(art.rock(r[2] * 13)), r[0], r[1], { occl: false })); const tP = [1, 2, 3].map(s => h.tex(art.flowerPatch(s * 7))); patches.forEach((p, i) => h.billboard(tP[i % 3], p[0], p[1], { occl: false }));
      for (const l of lamps) h.billboard(h.tx.lamp, l[0], l[1], { glowK: 1.2 }); h.billboard(h.tx.braz, camp[0][0], camp[0][1], { glowK: 1.4 });
      h.billboard(h.tex(art.tent()), 4.0, 52.0, { occl: false, glowK: 1.3 }); const wg = h.ext('wagon'); if (wg) h.billboard(wg.t, -4.7, 50.4, { w: 3.0, h: 3.0 * wg.h / wg.w, occl: false });
      h.billboard(h.tx.crates, -2.6, 52.6); h.billboard(h.tx.barrel, 1.6, 53.0);
      // yol okları: referanstaki gibi ileriyi gösteren ışıklı işaretler
      const ch = h.uv('chev');
      h.push({ key: 892, draw(R, F) { for (let i = 0; i < 5; i++) { const y = F.py + 3.2 + i * 1.5; if (y > 46 || (y > 26 && y < 31)) continue; const k = 0.5 + 0.5 * Math.sin(F.time * 4 - i * 0.9), a = (0.3 + 0.55 * k) * (1 - i * 0.15); R.quad(h.T.fx, [-0.7, y + 0.55, 0.014], [0.7, y + 0.55, 0.014], [0.7, y - 0.55, 0.014], [-0.7, y - 0.55, 0.014], ch[0], ch[1], ch[2], ch[3], [0.25, 0.62, 1.0, a], false, 0); } } });
    } };
  }
})();
