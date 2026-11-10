/* EO2 dikey dilim · Merkez Meydan yerleşimi
   Birim metre. X doğu, Y kuzey (kamera hep kuzeye bakar), Z yukarı. Oyuncu boyu 1,7 m.
   Yerleşim K2 kararını izler: Han (kervansaray hanı), kubbeli Bedesten, kümbet külahlı Kuzey Kapısı, çınar, erguvan, selvi. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};

  const L = EO2.layout = {
    id: 'meydan', name: 'Merkez Meydan', sub: 'Ejder Ocağı', chimney: true, flyer: true, petals: true, road: [2.8, 20],
    entry: { han: { x: -10.2, y: 18.2, dir: 'down' }, yol: { x: 0, y: 28.2, dir: 'down' }, bahce: { x: 11.6, y: 6.6, dir: 'down' }, pazar: { x: 10.2, y: 20.2, dir: 'down' }, arena: { x: -11.9, y: 7.4, dir: 'down' } },
    shadows: [[-10.2, 19.0, 6.2, 1.0, 0.7], [10.2, 21.1, 6.0, 1.0, 0.7], [-11.9, 8.3, 4.2, 0.9, 0.7], [-12.7, 13.9, 3.2, 0.8, 0.6], [12.7, 13.1, 3.2, 0.8, 0.6], [12.0, 7.5, 3.8, 0.7, 0.55], [0, 29.2, 16, 0.9, 0.6], [-15.2, 8, 0.9, 12, 0.5], [15.2, 9, 0.9, 13, 0.5]],
    mini: { paved: [[-15.3, -1.6, 15.3, 29.6], [-2.9, 29, 2.9, 34]], blocks: [[-15.4, 19.4, -5.4, 26], [5.4, 21.5, 15.2, 27], [-15.4, 8.6, -8.4, 12.2], [-15.4, 14.2, -10.3, 18.2], [10.3, 13.4, 15.4, 17.2], [-15.5, 29.4, -2.1, 30.4], [2.1, 29.4, 15.5, 30.4]], green: [[8.8, 7.8, 15.2, 12.2]], water: [[2.6, 13.2, 2.3]], rings: [[2.6, 13.2, 7.5]], bg: '#7fb866' },
    bounds: [-14.6, 14.6, 0.4, 30.3],
    mapRect: [-22, -8, 44, 50],
    paved: [[-15.3, -1.6, 15.3, 29.6], [-2.9, 29.0, 2.9, 44]],
    fount: { x: 2.6, y: 13.2, R: 2.3, ringIn: 2.5, ringOut: 7.54 },
    emb: { x: -1.6, y: 4.3, r: 1.9 },
    start: { x: -1.6, y: 6.6 },
    signs: [
      { id: 'han', label: 'Han', x: -10.2, y: 19.4, z: 7.1 },
      { id: 'pazar', label: 'Pazar', x: 10.2, y: 21.5, z: 5.7 },
      { id: 'kuzey', label: 'Kuzey Kapısı', x: 0, y: 29.5, z: 7.9 },
      { id: 'arena', label: 'Topçu Arenası', x: -11.9, y: 8.6, z: 7.3 },
      { id: 'bahce', label: 'Ejder Bahçesi', x: 12.0, y: 7.8, z: 4.9 },
    ],
    // Etkileşim noktaları: yakınına gelince "E" istemi çıkar.
    interact: [
      { id: 'cesme', x: 2.6, y: 13.2, r: 3.6, z: 2.4, label: 'Çeşmeye bak', sub: 'Ejder Çeşmesi', act: 'cesme' },
      { id: 'han', x: -10.2, y: 19.0, r: 2.3, z: 2.9, label: 'İçeri gir', sub: 'Han', act: 'go:han' },
      { id: 'pazar', x: 10.2, y: 21.0, r: 2.6, z: 3.6, label: 'Çarşıya gir', sub: 'Pazar', act: 'go:pazar' },
      { id: 'kuzey', x: 0, y: 29.6, r: 2.6, z: 4.4, label: 'Yola çık', sub: 'Kuzey Yolu', act: 'go:yol' },
      { id: 'arena', x: -11.9, y: 8.2, r: 2.4, z: 3.6, label: 'Arenaya gir', sub: 'Topçu Arenası', act: 'go:arena' },
      { id: 'bahce', x: 12.0, y: 7.4, r: 2.2, z: 3.2, label: 'Bahçeye gir', sub: 'Ejder Bahçesi', act: 'go:bahce' },
    ],
    lamps: [[-3.0, 9.3], [8.0, 16.9], [-3.4, 17.4], [7.9, 9.5], [-3.4, 26.9], [3.4, 26.9], [-6.2, 2.3], [5.8, 2.5], [-12.9, 18.5], [-7.5, 18.5]],
    braziers: [[-13.75, 8.05], [-10.05, 8.05]],
    benches: [[-3.1, 15.3], [6.6, 6.3], [-7.4, 6.2], [-6.9, 24.6]],
    planters: [[-5.5, 9.7, 0], [-1.0, 18.5, 1], [7.2, 14.6, 2], [-3.5, 28.7, 3], [3.5, 28.7, 1], [-13.7, 19.0, 2], [-6.5, 19.0, 0], [8.3, 7.3, 3], [-9.5, 8.1, 1], [-14.2, 8.1, 2], [1.6, 2.0, 0], [-4.4, 1.6, 3]],
    stalls: [[7.1, 18.6, 0], [13.4, 18.6, 1]],
    trees: [['cinar', -8.2, 13.3], ['erguvan', 13.4, 4.4, 1], ['erguvan', -13.2, 3.9, 2], ['erguvan', 4.1, 23.5, 3], ['erguvan', -3.9, 26.0, 4],
      ['bahce', 10.6, 10.6, 5], ['bahce', 13.7, 11.3, 6], ['erguvan', 12.2, 9.5, 7],
      ['selvi', -14.4, 1.2], ['selvi', 14.5, 1.0], ['selvi', -4.3, 33], ['selvi', 4.3, 33.6], ['selvi', -4.8, 38], ['selvi', 4.9, 39], ['selvi', -5.4, 45], ['selvi', 5.6, 47], ['selvi', -7, 54], ['selvi', 8, 60]],
    npcs: [
      { id: 'ozan', name: 'Ozan', role: 'NPC', portrait: 'npc-ozan', set: 'avci', x: 0.3, y: 9.6, dir: 'down', notes: true, lines: ['Çeşmenin sesi sazla iyi gider.', 'Bir türkü ister misin, terbiyeci?'] },
      { id: 'baharatci', name: 'Baharatçı', role: 'Pazar', portrait: 'npc-baharatci', set: 'temel', x: 8.2, y: 19.7, dir: 'down', lines: ['Taze geldi, kokusundan belli.', 'Ejderin iştahsızsa bana uğra.'] },
      { id: 'kerim', name: 'Usta Kerim', role: 'Demirci', portrait: 'npc-kerim', set: 'madenci', x: 4.9, y: 19.3, dir: 'down', act: 'panel:uretim', lines: ['Örs sıcak. Dövülecek bir şeyin varsa getir.'] },
      { id: 'bekci1', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', x: -3.0, y: 28.3, dir: 'down', lines: ['Kuzey Yolu seferlere çıkar. Hazırlıksız gitme.'] },
      { id: 'bekci2', name: 'Bekçi', role: 'Kuzey Kapısı', set: 'muhafiz', x: 3.0, y: 28.3, dir: 'down', lines: ['Kervanlar bu kapıdan geçer.'] },
      { id: 'yumurtaci', name: 'Yumurtacı', role: 'Ejder Bahçesi', portrait: 'npc-yumurtaci', set: 'bare', x: 9.6, y: 6.9, dir: 'down', lines: ['Bahçede yavrular güneşleniyor.'] },
      { id: 'muhtar', name: 'Muhtar', role: 'NPC', portrait: 'npc-muhtar', set: 'avci', x: -6, y: 17, dir: 'right', path: [[-6.5, 17.2], [-1.2, 20.8], [1.0, 26.0], [-1.4, 21.0], [-4.6, 12.0], [-8.8, 10.4], [-6.0, 14.6]], lines: ['Meydan bugün kalabalık, terbiyeci.'] },
    ],
  };
  // Çarpışma: dikdörtgenler [x0,x1,y0,y1] ve daireler [x,y,r].
  L.rects = [[-16, -5.3, 19.3, 31], [5.3, 16, 21.4, 31], [-16, -2.05, 29.2, 31], [2.05, 16, 29.2, 31], [-2.1, 2.1, 30.5, 32],
    [-16, -8.3, 8.5, 14.3], [-16, -10.2, 14.1, 19.4], [8.7, 16, 7.7, 13.5], [10.2, 16, 13.3, 17.3],
    ...L.stalls.map(s => [s[0] - 1.35, s[0] + 1.35, s[1] - 0.2, s[1] + 0.5]), ...L.benches.map(b => [b[0] - 0.95, b[0] + 0.95, b[1] - 0.12, b[1] + 0.3]),
    ...L.planters.map(p => [p[0] - 0.7, p[0] + 0.7, p[1] - 0.12, p[1] + 0.3])];
  L.circles = [[L.fount.x, L.fount.y, L.fount.R + 0.05], ...L.lamps.map(l => [l[0], l[1], 0.2]), ...L.braziers.map(l => [l[0], l[1], 0.38]),
    ...L.trees.filter(t => t[2] < 30).map(t => [t[1], t[2], t[0] === 'cinar' ? 0.55 : 0.3]), [-4.4, 20.6, 0.22], [4.4, 20.6, 0.22], [-6.0, 18.9, 0.42], [-5.5, 18.5, 0.42]];
  // Akşam ışıkları: x, y, yarıçap, şiddet (zemindeki ışık havuzu ve karakter aydınlatması)
  L.lights = [...L.lamps.map(l => [l[0], l[1], 5.6, 1]), ...L.braziers.map(l => [l[0], l[1], 5.0, 1.15]), [-10.2, 18.6, 4.6, 0.9], [10.2, 20.6, 4.2, 0.8], [0, 28.6, 4.5, 0.7], [2.6, 13.2, 4.2, 0.35]].slice(0, 16);

  /* Statik çizim listesi. Her öğe: { key (sıralama için Y), draw(R, F) }. F: kare durumu (amb, night, time, cam...). */
  EO2.buildWorld = function (R, A, dragonImg) {
    const art = EO2.art, E = { emblem: art.emblem(dragonImg, A) };
    let statics = []; const T = {};
    const tex = (g, opt) => { const t = R.texture(g.c || g, opt); t.wm = g.wm; t.hm = g.hm; if (g.lits && g.lits.length) t.glow = R.texture(art.glowOf(g)); return t; };
    const fx = art.fxAtlas(); T.fx = R.texture(fx.c); T.fxMap = fx.map;
    const amb = (F, k = 1) => [F.amb[0] * k, F.amb[1] * k, F.amb[2] * k, 1];

    /* Kameraya yaklaşan nesne solar: oyuncunun önünü kapatmasın. */
    const nearFade = (F, y) => { const d = y - F.camY; return Math.max(0, Math.min(1, (d - 2.4) / (F.D * 0.66 - 2.4))); };
    function billboard(t, x, y, o = {}) {
      const w = o.w || t.wm, h = o.h || t.hm, ax = o.ax === undefined ? 0.5 : o.ax, z0 = o.z0 || 0, it = { key: o.key === undefined ? y : o.key, x: x - w * ax + w / 2, y, w, h, tall: h > 2.2 && o.occl !== false, cover: 1,
        draw(R, F) {
          let a = o.fade === false ? 1 : nearFade(F, y); if (it.tall) { it.cover += ((F.coverTest(it) ? 0.28 : 1) - it.cover) * Math.min(1, F.dt * 8); a *= it.cover; }
          if (a < 0.01) return;
          const sw = o.sway ? Math.sin(F.time * 0.9 + x * 1.7) * o.sway + Math.sin(F.time * 2.3 + x) * o.sway * 0.3 : 0, x0 = x - w * ax, x1 = x0 + w, c = amb(F); c[3] = a;
          R.quad(t, [x0, y, z0], [x1, y, z0], [x1 + sw, y, z0 + h], [x0 + sw, y, z0 + h], 0, 0, 1, 1, c, false, o.fog === undefined ? 1 : o.fog);
          if (t.glow && F.night > 0.02) { const k = F.night * a * (o.glowK || 1); R.quad(t.glow, [x0, y, z0], [x1, y, z0], [x1 + sw, y, z0 + h], [x0 + sw, y, z0 + h], 0, 0, 1, 1, [k, k, k, 1], true, 0); }
        } };
      statics.push(it); return it;
    }
    // Yan cephe: X düzleminde, y0..y1 arası. face: 'E' doğuya bakar (kamera doğusundaysa görünür), 'W' batıya.
    function side(t, X, y0, y1, face, h) {
      statics.push({ key: y1 + 0.001, draw(R, F) {
        if (face === 'E' ? F.camX <= X : F.camX >= X) return; const ya = Math.max(y0, F.camY + 0.4); if (ya >= y1) return;
        const u0 = (ya - y0) / (y1 - y0), c = amb(F), hh = h || t.hm;
        if (face === 'E') R.quad(t, [X, ya, 0], [X, y1, 0], [X, y1, hh], [X, ya, hh], u0, 0, 1, 1, c);
        else R.quad(t, [X, y1, 0], [X, ya, 0], [X, ya, hh], [X, y1, hh], 0, 0, 1 - u0, 1, c);
        if (t.glow && F.night > 0.02) { const k = F.night * (t.glowK || 1); if (face === 'E') R.quad(t.glow, [X, ya, 0], [X, y1, 0], [X, y1, hh], [X, ya, hh], u0, 0, 1, 1, [k, k, k, 1], true, 0);
          else R.quad(t.glow, [X, y1, 0], [X, ya, 0], [X, ya, hh], [X, y1, hh], 0, 0, 1 - u0, 1, [k, k, k, 1], true, 0); }
      } });
    }

    // --- uzak plan ---
    const sky = art.skyTextures(); T.skyDay = R.texture(sky.day, { mips: false }); T.skyDusk = R.texture(sky.dusk, { mips: false });
    T.back = R.texture(art.backdrop()); T.cloud = R.texture(art.clouds());
    function addSky() {
    statics.push({ key: 1e6, draw(R, F) {     // gök: ekran uzayı, ufka kadar
      const hy = F.horizonNDC; if (hy < 0.999) { const b = Math.min(hy - 0.02, 0.98);
        R.quad(T.skyDay, [-1, b, 0], [1, b, 0], [1, 1, 0], [-1, 1, 0], 0, 0, 1, 1, [1, 1, 1, 1], false, 0, true);
        if (F.night > 0.01) R.quad(T.skyDusk, [-1, b, 0], [1, b, 0], [1, 1, 0], [-1, 1, 0], 0, 0, 1, 1, [1, 1, 1, F.night], false, 0, true); }
    } });
    statics.push({ key: 1e5, draw(R, F) { const c = amb(F, 1); R.quad(T.back, [F.camX * 0.9 - 190, 150, -6], [F.camX * 0.9 + 190, 150, -6], [F.camX * 0.9 + 190, 150, 89], [F.camX * 0.9 - 190, 150, 89], 0, 0, 1, 1, c, false, 0);
      for (let i = 0; i < 6; i++) { const px = ((i * 71 + F.time * (1.2 + i * 0.3)) % 360) - 180 + F.camX * 0.9, z = 48 + (i * 13) % 26, w = 46 + (i % 3) * 16, k = i % 3; const cc = amb(F, 1); cc[3] = 0.92;
        R.quad(T.cloud, [px, 149, z], [px + w, 149, z], [px + w, 149, z + w * 0.33], [px, 149, z + w * 0.33], k / 3, 0, (k + 1) / 3, 1, cc, false, 0); } } });
    }
    addSky();
    // Yere serili doku (kilim, su, bilezik): zeminden hemen sonra çizilir.
    function flat(t, x0, y0, x1, y1, o = {}) { const z = o.z || 0.011; statics.push({ key: o.key || 900, draw(R, F) { const c = amb(F); c[3] = o.a || 1; R.quad(t, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, 1, 1, c, false, 1); } }); }

    // --- yapılar ---
    const tHan = tex(art.han(E)), tHanS = tex(art.sideWall(6.6, { seed: 22, wins: 2 }));
    billboard(tHan, -15.4, 19.4, { ax: 0, fade: false, occl: false }); side(tHanS, -5.4, 19.4, 26, 'E');
    const tBed = tex(art.bedesten()), tBedS = tex(art.sideWall(5.5, { plaster: false, wallH: 4.9, roofH: 0, seed: 33, base: '#eddcc2', wins: 2 }));
    billboard(tBed, 5.2, 21.5, { ax: 0, fade: false, occl: false }); side(tBedS, 5.4, 21.5, 27, 'W');
    const tGate = tex(art.northGate(E)); billboard(tGate, -15.5, 29.5, { ax: 0, fade: false, occl: false });
    const tArena = tex(art.arenaGate(E)), tArenaS = tex(art.sideWall(3.6, { plaster: false, wallH: 7.6, roofH: 0, cren: true, base: '#d9c8b4', seed: 44, wins: 1 }));
    billboard(tArena, -15.4, 8.6, { ax: 0, fade: true, occl: false }); side(tArenaS, -8.4, 8.6, 12.2, 'E');
    const tHouseA = tex(art.house(7, '#2f7fc8', 1.3)), tHouseAS = tex(art.sideWall(4.0, { wallH: 5.6, stoneH: 2.9, roofH: 1.8, seed: 55, wins: 1 }));
    billboard(tHouseA, -15.4, 14.2, { ax: 0, fade: true, occl: false }); side(tHouseAS, -10.3, 14.2, 18.2, 'E');
    const tHouseB = tex(art.house(8, '#c9603f', 4.1)), tHouseBS = tex(art.sideWall(3.8, { wallH: 5.6, stoneH: 2.9, roofH: 1.8, seed: 56, wins: 1, shutter: '#c9603f' }));
    billboard(tHouseB, 10.0, 13.4, { ax: 0, fade: true, occl: false }); side(tHouseBS, 10.3, 13.4, 17.2, 'W');
    const tGarden = tex(art.gardenGate()), tLow = tex(art.lowWall(4.4, 181));
    billboard(tGarden, 8.8, 7.8, { ax: 0, fade: true, occl: false }); side(tLow, 8.8, 7.8, 12.2, 'W');
    const tBoundW = tex(art.boundary(22.4, 190)), tBoundE = tex(art.boundary(24.5, 195));
    side(tBoundW, -15.4, -3, 19.4, 'E'); side(tBoundE, 15.4, -3, 21.5, 'W');

    // --- ağaçlar ve eşyalar ---
    const tCinar = tex(art.cinar()), tErg = [1, 2, 3, 4, 7].map(s => tex(art.erguvan(s * 11))), tSelvi = tex(art.selvi()), tBahce = [tex(art.gardenTree(5)), tex(art.gardenTree(6))];
    let ei = 0, bi = 0;
    for (const t of L.trees) { const k = t[0]; if (k === 'cinar') billboard(tCinar, t[1], t[2], { sway: 0.07 }); else if (k === 'erguvan') billboard(tErg[ei++ % tErg.length], t[1], t[2], { sway: 0.06 });
      else if (k === 'bahce') billboard(tBahce[bi++ % 2], t[1], t[2], { sway: 0.05, occl: false }); else billboard(tSelvi, t[1], t[2], { sway: 0.05 }); }
    const tLamp = tex(art.lampPost()); for (const l of L.lamps) billboard(tLamp, l[0], l[1], { glowK: 1.2 });
    const tBench = tex(art.bench()); for (const b of L.benches) billboard(tBench, b[0], b[1]);
    const tPl = [0, 1, 2, 3].map(s => tex(art.planter(s + 20))); for (const p of L.planters) billboard(tPl[p[2]], p[0], p[1]);
    const tStall = [0, 1, 2].map(k => tex(art.stall(k))); for (const s of L.stalls) billboard(tStall[s[2]], s[0], s[1]);
    billboard(tStall[2], 4.9, 20.4, { w: 2.5, h: 2.67 });
    const tBarrel = tex(art.barrel()), tCrates = tex(art.crates()); billboard(tBarrel, -6.0, 18.9); billboard(tBarrel, -5.5, 18.5); billboard(tCrates, 9.9, 19.9); billboard(tCrates, -14.3, 13.9, { w: 1.2, h: 1.12 });
    const tPoleN = tex(art.bannerPole(E, '#213270')); billboard(tPoleN, -4.4, 20.6, { ax: 0.2, sway: 0.03 }); billboard(tPoleN, 4.4, 20.6, { ax: 0.2, sway: 0.03 });
    const tBraz = tex(art.brazier()); for (const b of L.braziers) billboard(tBraz, b[0], b[1], { glowK: 1.4 });

    // --- çeşme: gerçek çokgen gövde, yatay su yüzeyi, ejder heykeli, su jetleri ---
    const f = L.fount, tStrip = R.texture(art.basinStrip().c, { repeat: true }), tWater = R.texture(art.waterDisc()), tPed = tex(art.pedestal());
    const stC = art.statue(dragonImg, A), tStatue = R.texture(stC);
    const rimC = document.createElement('canvas'); rimC.width = rimC.height = 256; { const x = rimC.getContext('2d'); x.beginPath(); x.arc(128, 128, 126, 0, 6.3); x.arc(128, 128, 108, 0, 6.3, true); x.fillStyle = '#f6eddc'; x.fill('evenodd');
      x.lineWidth = 3; x.strokeStyle = '#3a2530'; x.beginPath(); x.arc(128, 128, 125, 0, 6.3); x.stroke(); x.beginPath(); x.arc(128, 128, 109, 0, 6.3); x.stroke(); x.lineWidth = 5; x.strokeStyle = 'rgba(74,52,110,.3)'; x.beginPath(); x.arc(128, 128, 112, 0, 6.3); x.stroke(); }
    const tRim = R.texture(rimC), N = 22, segs = [];
    for (let i = 0; i < N; i++) { const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832; segs.push({ a: [f.x + Math.cos(a0) * f.R, f.y + Math.sin(a0) * f.R], b: [f.x + Math.cos(a1) * f.R, f.y + Math.sin(a1) * f.R], n: [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2)], u0: i * 0.165, u1: (i + 1) * 0.165 }); }
    const uvOf = n => T.fxMap[n];
    const fountain = { key: f.y, splash: 0, draw(R, F) {
      const c = amb(F), zr = 0.72, zw = 0.56;
      const vis = segs.filter(s => (F.camX - s.a[0]) * s.n[0] + (F.camY - s.a[1]) * s.n[1] > 0).sort((p, q) => (q.a[1] + q.b[1]) - (p.a[1] + p.b[1]));
      for (const s of vis) { const sh = 0.82 + 0.18 * Math.max(0, -s.n[1] * 0.8 + s.n[0] * 0.3); R.quad(tStrip, [s.b[0], s.b[1], 0], [s.a[0], s.a[1], 0], [s.a[0], s.a[1], zr], [s.b[0], s.b[1], zr], s.u0, 0, s.u1, 1, [c[0] * sh, c[1] * sh, c[2] * sh, 1]); }
      const rr = f.R + 0.06; R.quad(tRim, [f.x - rr, f.y - rr, zr], [f.x + rr, f.y - rr, zr], [f.x + rr, f.y + rr, zr], [f.x - rr, f.y + rr, zr], 0, 0, 1, 1, c);
      const wr = f.R * 0.86; R.quad(tWater, [f.x - wr, f.y - wr, zw], [f.x + wr, f.y - wr, zw], [f.x + wr, f.y + wr, zw], [f.x - wr, f.y + wr, zw], 0, 0, 1, 1, c);
      const ring = uvOf('ring'); for (let i = 0; i < 4; i++) { const p = ((F.time * 0.42 + i * 0.25) % 1), r = 0.25 + p * 1.6, a = (1 - p) * 0.5, ox = i % 2 ? 1.0 : -0.75, oy = i > 1 ? 0.35 : -0.45;
        R.quad(T.fx, [f.x + ox - r, f.y + oy - r, zw + 0.01], [f.x + ox + r, f.y + oy - r, zw + 0.01], [f.x + ox + r, f.y + oy + r, zw + 0.01], [f.x + ox - r, f.y + oy + r, zw + 0.01], ring[0], ring[1], ring[2], ring[3], [c[0], c[1], c[2], a]); }
      R.quad(tPed, [f.x - 0.8, f.y, 0.3], [f.x + 0.8, f.y, 0.3], [f.x + 0.8, f.y, 1.8], [f.x - 0.8, f.y, 1.8], 0, 0, 1, 1, c);
      const sw = 2.9, sh2 = sw * stC.height / stC.width; R.quad(tStatue, [f.x - sw * 0.5, f.y - 0.01, 1.42], [f.x + sw * 0.5, f.y - 0.01, 1.42], [f.x + sw * 0.5, f.y - 0.01, 1.42 + sh2], [f.x - sw * 0.5, f.y - 0.01, 1.42 + sh2], 0, 0, 1, 1, c);
      // jetler: ejderin ağzından ve kaidenin iki yanından kavisli su
      const drop = uvOf('drop'), jets = [[f.x + 0.95, 3.02, 1.25, 1.6, 14], [f.x + 0.72, 1.55, 0.9, 1.2, 8], [f.x - 0.72, 1.55, -0.9, 1.2, 8]], boost = 1 + fountain.splash * 0.8;
      for (const j of jets) for (let i = 0; i < j[4]; i++) { const p = ((F.time * 0.9 + i / j[4]) % 1), t = p * 0.78, px = j[0] + j[2] * t * boost, pz = j[1] + j[3] * t * boost - 4.9 * t * t; if (pz < zw) continue;
        const s = 0.07 + p * 0.07; R.quad(T.fx, [px - s, f.y - 0.02, pz - s * 1.5], [px + s, f.y - 0.02, pz - s * 1.5], [px + s, f.y - 0.02, pz + s * 1.5], [px - s, f.y - 0.02, pz + s * 1.5], drop[0], drop[1], drop[2], drop[3], [c[0], c[1], c[2], 0.9 - p * 0.3]); }
      const dot = uvOf('dot'); for (let i = 0; i < 9; i++) { const tw = Math.max(0, Math.sin(F.time * (2.1 + i * 0.37) + i * 1.9)), a = tw * tw * tw * 0.9 * (1 - F.night * 0.5), ang = i * 2.4 + Math.floor(F.time * 0.5 + i) * 1.3, rr = 0.5 + (i % 4) * 0.36, sx = f.x + Math.cos(ang) * rr, sy = f.y + Math.sin(ang) * rr * 0.9, s = 0.07;
        if (a > 0.02) R.quad(T.fx, [sx - s, sy - s, zw + 0.02], [sx + s, sy - s, zw + 0.02], [sx + s, sy + s, zw + 0.02], [sx - s, sy + s, zw + 0.02], dot[0], dot[1], dot[2], dot[3], [a, a, a, 1], true, 0); }
      fountain.splash = Math.max(0, fountain.splash - F.dt * 0.5);
    } };
    statics.push(fountain);

    // --- diğer alanlar: js/scenes.js tanımlarından, ilk girişte kurulur ---
    const meydan = { id: 'meydan', L, statics, fountain }, cache = { meydan }, extTex = {};
    const tx = { lamp: tLamp, bench: tBench, planter: tPl, barrel: tBarrel, crates: tCrates, selvi: tSelvi, erguvan: tErg, bahce: tBahce, cinar: tCinar, braz: tBraz, water: tWater };
    const ext = n => { if (extTex[n] !== undefined) return extTex[n]; const im = (EO2.ext || {})[n]; return extTex[n] = im ? { t: R.texture(im), w: im.naturalWidth, h: im.naturalHeight } : null; };
    const h = { R, A, art, E, T, tx, tex, billboard, side, flat, amb, nearFade, addSky, ext, push: it => statics.push(it), uv: n => T.fxMap[n] };
    function scene(id) { if (cache[id]) return cache[id]; const def = (EO2.sceneDefs || {})[id]; if (!def) return null; statics = []; const extra = def.build(h) || {}; cache[id] = Object.assign({ id, L: def.L, statics }, extra); return cache[id]; }
    return { statics: meydan.statics, T, E, fountain, amb, nearFade, scene, ext };
  };
})();
