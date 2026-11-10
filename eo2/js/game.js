/* EO2 dikey dilim · oyun döngüsü, karakterler, arayüz mantığı
   Sunucu yok: her şey yerel. Oyun kodu (js/, server/) kullanılmaz ve değiştirilmez. */
(function () {
  'use strict';
  const EO2 = window.EO2, A = window.EO2_ATLAS, $ = id => document.getElementById(id);
  let L = EO2.layout;                       // etkin alanın yerleşimi
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, coarse = matchMedia('(pointer: coarse)').matches;
  const CHAR_H = 1.7;
  // Adım kilidi: yan yürüyüş karesi başına ilerleme (chibi verisi) → döngü başına metre. Ayak kaymasın diye hız buradan gelir.
  const M_PER_CYCLE = 28.19 * 16 * 0.42 / (362 / 0.8) * CHAR_H, HZ_WALK = 1.9, HZ_BRISK = 2.6;

  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src + ' yüklenemedi')); i.src = src; });
  EO2.hooks = {}; EO2.frameHooks = [];
  const S = EO2.state = { focusK: 0, night: 0, nightT: 0, camMode: 'yakin', hud: true, fps: false, companion: true, panel: null, time: 0, intro: reduce ? 1 : 0 };
  const CAM = { yakin: { th: 0, H: 3.57, D: 7, feet: 0.72 }, yuksek: { th: 16 * Math.PI / 180, H: 5.4, D: 8.6, feet: 0.69 } };
  const cam = { ...CAM.yakin, x: L.start.x, y: L.start.y };

  /* ---------- Yükleme ---------- */
  const setLoad = (p, t) => { $('loadbar').style.width = Math.round(p * 100) + '%'; if (t) $('loadtxt').textContent = t; };
  async function boot() {
    const canvas = $('world'), R = EO2.createRenderer(canvas);
    if (!R) { $('loadtxt').textContent = 'Bu tarayıcı WebGL2 desteklemiyor.'; return; }
    setLoad(0.08, 'Karakter kareleri yükleniyor');
    const names = Object.keys(A.sets), imgs = {}, NL = names.length + 1;
    let done = 0; await Promise.all([...names.map(n => load('assets/chibi_' + n + '.webp').then(i => { imgs[n] = i; setLoad(0.08 + 0.5 * (++done / NL)); })), load('assets/dragon.webp').then(i => { imgs.dragon = i; setLoad(0.08 + 0.5 * (++done / NL)); })]);
    setLoad(0.62, 'Meydan çiziliyor'); await new Promise(r => setTimeout(r, 30));
    const EXT = { kor: 'dr-ates-yetiskin', buz: 'dr-buz-genc', toprak: 'dr-toprak-yavru', wagon: 'pvp_prop_wagon', fly: 'ates-P4' }; EO2.ext = {};
    await Promise.all(Object.entries(EXT).map(([k, f]) => load('assets/ext/' + f + '.webp').then(i => { EO2.ext[k] = i; }).catch(() => {})));
    const W = EO2.buildWorld(R, A, imgs.dragon);
    setLoad(0.9, 'Işıklar yakılıyor'); await new Promise(r => setTimeout(r, 30));
    const sets = {}; for (const n of names) sets[n] = { tex: R.texture(imgs[n]), m: A.sets[n], img: imgs[n] };
    const tDragon = R.texture(imgs.dragon);
    start(R, W, sets, tDragon, imgs);
    setLoad(1); setTimeout(() => $('loading').classList.add('gone'), 250);
  }

  function start(R, W, sets, tDragon, imgs) {
    const canvas = $('world'), app = $('app'), FX = W.T.fx, uv = n => W.T.fxMap[n];
    /* ---------- Varlıklar ---------- */
    const mkChar = o => Object.assign({ x: 0, y: 0, dir: 'down', moving: false, ph: 0, set: 'temel', seed: Math.random() * 9, happy: 0, bubble: null, cover: 1 }, o);
    const player = mkChar({ x: L.start.x, y: L.start.y, dir: 'up', set: 'temel', name: 'Terbiyeci', isPlayer: true, brisk: false });
    let npcs = [], parts = [], fxStatics = [], mapTex = null, signEls = [], SC = null, flyer = null, flyT = 16;
    const mkNpcs = Ls => (Ls.npcs || []).map(n => mkChar({ ...n, set: sets[n.set] ? n.set : 'temel', wp: 0, wait: 0, say: 2 + Math.random() * 8 }));
    const remotes = EO2.remotes = [];       // odadaki gerçek oyuncular (js/net.js doldurur)
    const pet = { x: player.x + 0.9, y: player.y - 0.2, face: 1, hop: 0, moving: false, cheer: 0 };
    const crumbs = [[player.x, player.y]];
    const petalCount = reduce ? 14 : 54;
    function newPetal(anywhere) { return { k: 'petal', x: L.bounds[0] - 1.5 + Math.random() * (L.bounds[1] - L.bounds[0] + 3), y: L.bounds[2] + Math.random() * (L.bounds[3] - L.bounds[2]), z: anywhere ? Math.random() * 6 : 4.5 + Math.random() * 3, vx: 0.25 + Math.random() * 0.4, vz: -(0.35 + Math.random() * 0.35), ph: Math.random() * 6.3, rest: 0, s: 0.045 + Math.random() * 0.035 }; }
    let target = null, noteT = 0, emberT = 0; const look = { x: 0, y: 0 };
    // alanın başlangıç parçacıkları: taç yaprakları (açık havada) ve çiçeklerin çevresinde kelebekler
    function seedParts(Ls) { const out = [], keep = L; L = Ls; if (Ls.petals) for (let i = 0; i < petalCount; i++) out.push(newPetal(true)); L = keep;
      const flowers = (Ls.planters || []).filter((_, i) => i % 2 === 0); if (flowers.length && !Ls.indoor) for (let i = 0; i < (reduce ? 2 : 7); i++) { const f = flowers[i % flowers.length]; out.push({ k: 'bfly', hx: f[0], hy: f[1] - 0.05, x: f[0], y: f[1], z: 1.2, a: Math.random() * 6.3, r: 0.5 + Math.random() * 0.9, sp: 0.5 + Math.random() * 0.5, col: [[1, 0.78, 0.25], [0.55, 0.8, 1], [1, 0.6, 0.8], [1, 1, 1]][i % 4], life: 1e9, vx: 0, vz: 0 }); }
      return out; }

    /* ---------- Girdi ---------- */
    const keys = new Set(), joy = { x: 0, y: 0, on: false };
    const typing = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
    addEventListener('keydown', e => {
      if (typing()) { if (e.key === 'Escape') { document.activeElement.blur(); if (EO2.dialog && EO2.dialog.isOpen()) EO2.dialog.close(); } return; }
      if (EO2.dialog && EO2.dialog.isOpen() && e.key === 'Escape') { EO2.dialog.close(); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) { keys.add(k); target = null; if (k.startsWith('Arrow')) e.preventDefault(); return; }
      if (e.repeat) return;
      if (EO2.battle && EO2.battle.active()) return;
      if (k === 'e') doInteract(); else if (k === 'Enter') { e.preventDefault(); (EO2.dialog && EO2.dialog.isOpen() ? $('dlgInput') : $('chatInput')).focus(); }
      else if (k === 'i') togglePanel('envanter'); else if (k === 'j') togglePanel('gorevler'); else if (k === 'm') togglePanel('menu'); else if (k === 'Escape') togglePanel(S.panel ? S.panel : 'menu');
      else if (k === 'l') setNight(S.nightT ? 0 : 1); else if (k === 'c') setCam(S.camMode === 'yakin' ? 'yuksek' : 'yakin'); else if (k === 'h') setHud(!S.hud);
      else if (k >= '1' && k <= '6') emote(+k - 1);
    });
    addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.delete(k); });
    addEventListener('blur', () => keys.clear());
    canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(), p = R.unproject(e.clientX - r.left, e.clientY - r.top); if (!p) return;
      target = { x: clamp(p[0], L.bounds[0], L.bounds[1]), y: clamp(p[1], L.bounds[2], L.bounds[3]), t: 0, stuck: 0 }; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    // dokunmatik yön çubuğu
    const joyEl = $('joy'), knob = $('joyKnob');
    const joyMove = e => { const r = joyEl.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width / 2, d = Math.hypot(dx, dy), k = d > m ? m / d : 1;
      joy.x = dx * k / m; joy.y = -dy * k / m; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; };
    joyEl.addEventListener('pointerdown', e => { joy.on = true; target = null; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
    joyEl.addEventListener('pointermove', e => { if (joy.on) joyMove(e); });
    const joyEnd = () => { joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; };
    joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
    $('btnE').addEventListener('click', doInteract);

    /* ---------- Çarpışma ---------- */
    const PR = 0.3;
    function blocked(x, y, self) {
      if (x < L.bounds[0] || x > L.bounds[1] || y < L.bounds[2] || y > L.bounds[3]) return true;
      for (const r of L.rects) if (x > r[0] - PR && x < r[1] + PR && y > r[2] - PR && y < r[3] + PR) return true;
      for (const c of L.circles) { const dx = x - c[0], dy = y - c[1], rr = c[2] + PR; if (dx * dx + dy * dy < rr * rr) return true; }
      for (const n of npcs) if (n !== self && !n.path) { const dx = x - n.x, dy = y - n.y; if (dx * dx + dy * dy < 0.36) return true; }
      return false;
    }
    function moveChar(c, ix, iy, speed, dt) {
      const len = Math.hypot(ix, iy); if (len < 0.01) { c.moving = false; return 0; }
      const vx = ix / len * speed * dt, vy = iy / len * speed * dt, ox = c.x, oy = c.y;
      if (!blocked(c.x + vx, c.y, c)) c.x += vx; if (!blocked(c.x, c.y + vy, c)) c.y += vy;
      const moved = Math.hypot(c.x - ox, c.y - oy);
      c.dir = Math.abs(ix) > Math.abs(iy) * 0.8 ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'up' : 'down');
      c.moving = moved > speed * dt * 0.2; return moved;
    }

    function followPet(pt, o, cr, hz, dt) {
      const lc = cr[cr.length - 1]; if (Math.hypot(o.x - lc[0], o.y - lc[1]) > 0.12) { cr.push([o.x, o.y]); if (cr.length > 40) cr.shift(); }
      let aim = cr[0], acc = 0; for (let i = cr.length - 1; i > 0; i--) { acc += Math.hypot(cr[i][0] - cr[i - 1][0], cr[i][1] - cr[i - 1][1]); if (acc > 1.15) { aim = cr[i - 1]; break; } }
      const dx = aim[0] - pt.x, dy = aim[1] - pt.y, d = Math.hypot(dx, dy), gap = Math.hypot(o.x - pt.x, o.y - pt.y);
      if (gap > 8) { pt.x = o.x + 0.8; pt.y = o.y - 0.2; }
      else if (d > 0.08 && gap > 0.95) { const sp = Math.min(d / dt, M_PER_CYCLE * hz * (gap > 2.4 ? 1.5 : 1.08)), st = sp * dt; pt.x += dx / d * st; pt.y += dy / d * st; pt.hop += st / 0.42; pt.moving = true; if (Math.abs(dx) > 0.02) pt.face = dx > 0 ? 1 : -1; }
      else { pt.moving = false; pt.hop = Math.round(pt.hop); if (gap > 0.3) pt.face = o.x > pt.x ? 1 : -1; }
      if (pt.cheer > 0) pt.cheer -= dt;
    }
    /* ---------- Güncelleme ---------- */
    function update(dt) {
      S.time += dt; S.night += (S.nightT - S.night) * Math.min(1, dt * 1.6); if (Math.abs(S.nightT - S.night) < 0.002) S.night = S.nightT;
      if (S.intro < 1) S.intro = Math.min(1, S.intro + dt / 2.6);
      // oyuncu
      let ix = 0, iy = 0;
      const frozen = EO2.battle && EO2.battle.active();
      if (!typing() && !frozen) { if (keys.has('a') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('d') || keys.has('ArrowRight')) ix += 1; if (keys.has('w') || keys.has('ArrowUp')) iy += 1; if (keys.has('s') || keys.has('ArrowDown')) iy -= 1; }
      if (joy.on && !frozen && Math.hypot(joy.x, joy.y) > 0.18) { ix = joy.x; iy = joy.y; }
      if ((ix || iy) && EO2.dialog && EO2.dialog.isOpen() && Math.hypot(ix, iy) > 0.5 && !typing()) EO2.dialog.close();
      player.brisk = keys.has('Shift') || (joy.on && Math.hypot(joy.x, joy.y) > 0.85);
      if (!ix && !iy && target) { const dx = target.x - player.x, dy = target.y - player.y, d = Math.hypot(dx, dy); if (d < 0.12) target = null; else { ix = dx; iy = dy; player.brisk = d > 6; } }
      const hz = player.brisk ? HZ_BRISK : HZ_WALK, moved = moveChar(player, ix, iy, M_PER_CYCLE * hz, dt);
      if (player.moving) player.ph += moved / M_PER_CYCLE; else player.ph = 0;
      const stepN = Math.floor(player.ph * 2); if (player.moving && stepN !== player.stepN) { player.stepN = stepN; if (EO2.audio) EO2.audio.step();
        if (!reduce) parts.push({ k: 'dust', x: player.x + (Math.random() - 0.5) * 0.2, y: player.y - 0.01, z: 0.06, vx: (Math.random() - 0.5) * 0.3, vz: 0.22, life: 0.55, max: 0.55, s: 0.1 }); }
      look.x += ((player.moving ? (player.dir === 'right' ? 1 : player.dir === 'left' ? -1 : 0) : 0) * 0.9 - look.x) * Math.min(1, dt * 1.6); look.y += ((player.moving && player.dir === 'up' ? 0.7 : 0) - look.y) * Math.min(1, dt * 1.6);
      S.focusK += ((EO2.dialog && EO2.dialog.isOpen() ? 1 : 0) - S.focusK) * Math.min(1, dt * 3.5);
      if (target) { target.t += dt; if ((ix || iy) && moved < 0.002) { target.stuck += dt; if (target.stuck > 0.35) target = null; } else if (target) target.stuck = 0; }
      if (player.happy > 0) player.happy -= dt;
      // yol arkadaşı ejder: oyuncunun izinden gelir
      if (S.companion) followPet(pet, player, crumbs, hz, dt);
      for (const r of remotes) {       // uzak oyuncu: gelen konuma doğru yürür
        const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
        if (d > 7) { r.x = r.tx; r.y = r.ty; r.moving = false; }
        else if (d > 0.05) { const sp = Math.min(d / dt, M_PER_CYCLE * (d > 1.4 ? HZ_BRISK * 1.4 : HZ_WALK * 1.1)), stp = sp * dt; r.x += dx / d * stp; r.y += dy / d * stp; r.ph += stp / M_PER_CYCLE; r.moving = true; r.dir = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down'); }
        else { r.moving = false; r.ph = 0; if (r.rdir) r.dir = r.rdir; }
        if (r.happy > 0) r.happy -= dt; if (r.pet) followPet(r.pet, r, r.crumbs, HZ_WALK, dt);
      }
      // NPC'ler
      for (const n of npcs) {
        if (n.path) { if (n.wait > 0) { n.wait -= dt; n.moving = false; n.ph = 0; }
          else { const p = n.path[n.wp], dx = p[0] - n.x, dy = p[1] - n.y, d = Math.hypot(dx, dy); if (d < 0.15) { n.wp = (n.wp + 1) % n.path.length; n.wait = 1.5 + Math.random() * 3.5; }
            else { const m = moveChar(n, dx, dy, M_PER_CYCLE * 1.6, dt); n.ph += m / M_PER_CYCLE; if (m < 0.001) { n.wp = (n.wp + 1) % n.path.length; } } } }
        else if (Math.hypot(player.x - n.x, player.y - n.y) < 2.2) { const dx = player.x - n.x, dy = player.y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down'); }
        else n.dir = n.home || (n.home = n.dir);
        if (n.happy > 0) n.happy -= dt;
        n.say -= dt; if (n.say < 0) { n.say = 14 + Math.random() * 22; if (Math.hypot(player.x - n.x, player.y - n.y) < 11 && !n.bubble) { const line = n.lines[Math.floor(Math.random() * n.lines.length)]; say(n, line, 4.2); chatAdd('bolge', n.name, line); } }
      }
      // parçacıklar
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i];
        if (p.k === 'petal') { if (p.rest > 0) { p.rest -= dt; if (p.rest <= 0) parts[i] = newPetal(false); } else { p.ph += dt * 2.4; p.x += (p.vx + Math.sin(p.ph) * 0.35) * dt; p.z += p.vz * dt; if (p.x > L.bounds[1] + 2) p.x = L.bounds[0] - 2; if (p.z <= 0.02) { p.z = 0.02; p.rest = 5 + Math.random() * 7; } } }
        else if (p.k === 'bfly') { p.a += dt * p.sp; p.x = p.hx + Math.cos(p.a) * p.r + Math.sin(p.a * 2.7) * 0.25; p.y = p.hy + Math.sin(p.a * 1.3) * 0.25 - 0.3; p.z = 1.15 + Math.sin(p.a * 3.1) * 0.35; }
        else { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; if (p.life <= 0) parts.splice(i, 1); } }
      noteT -= dt; const oz = npcs.find(n => n.notes); if (noteT < 0 && oz) { noteT = 1.5; parts.push({ k: 'note', x: oz.x + 0.35 + Math.random() * 0.2, y: oz.y - 0.02, z: 1.5, vx: 0.12, vz: 0.42, life: 2.2, max: 2.2, s: 0.16 }); }
      emberT -= dt; if (nightNow() > 0.3 && emberT < 0 && SC.embers.length) { emberT = 0.09; const src = SC.embers[Math.floor(Math.random() * SC.embers.length)];
        parts.push({ k: 'ember', x: src[0] + (Math.random() - 0.5) * 0.4, y: src[1] - 0.03, z: src[2], vx: (Math.random() - 0.3) * 0.3, vz: 0.5 + Math.random() * 0.6, life: 1.6 + Math.random() * 1.4, max: 3, s: 0.035 + Math.random() * 0.03 }); }
      // gökte süzülen ejder: açık alanlarda arada bir geçer
      if (L.flyer && EO2.ext.fly && !reduce) { flyT -= dt; if (!flyer && flyT < 0) { const dir = Math.random() < 0.5 ? 1 : -1; flyer = { x: cam.x - dir * 48, y: player.y + 19 + Math.random() * 9, z: 12 + Math.random() * 5, dir, t: 0 }; if (EO2.audio && EO2.audio.whoosh) EO2.audio.whoosh(); }
        if (flyer) { flyer.t += dt; flyer.x += flyer.dir * 9.5 * dt; if (Math.abs(flyer.x - cam.x) > 62) { flyer = null; flyT = 34 + Math.random() * 30; } } }
      // kamera
      const T = CAM[S.camMode], k = Math.min(1, dt * 3.2); cam.th = lerp(cam.th, T.th, k); cam.H = lerp(cam.H, T.H, k); cam.D = lerp(cam.D, T.D, k); cam.feet = lerp(cam.feet, T.feet, k);
      const fn = EO2.dialog && EO2.dialog.npc && EO2.dialog.npc(), fx = fn ? (fn.x - player.x) * 0.5 : 0;
      cam.x = lerp(cam.x, clamp(player.x + look.x + fx * S.focusK, Math.min(0, L.bounds[0] + 4.1), Math.max(0, L.bounds[1] - 4.1)), Math.min(1, dt * 4)); cam.y = lerp(cam.y, player.y + look.y * 0, Math.min(1, dt * 7));
      updateInteract();
    }

    /* ---------- Etkileşim ---------- */
    let near = null;
    function updateInteract() {
      let best = null, bd = 1e9;
      for (const n of npcs) { const d = Math.hypot(player.x - n.x, player.y - n.y); if (d < 1.7 && d < bd) { bd = d; best = { npc: n, x: n.x, y: n.y, z: 2.25, label: 'Konuş', sub: n.name }; } }
      if (!best) for (const it of L.interact) { const d = Math.hypot(player.x - it.x, player.y - it.y); if (d < it.r && d < bd) { bd = d; best = it; } }
      near = best;
    }
    function doInteract() {
      if (!near) return;
      if (near.npc) { const n = near.npc, line = n.lines[Math.floor(Math.random() * n.lines.length)]; n.happy = 2; if (EO2.audio) EO2.audio.chime();
        if (EO2.dialog) { EO2.dialog.open(n, line); return; }
        say(n, line, 4.5); chatAdd('bolge', n.name, line); if (n.act) runAct(n.act); return; }
      runAct(near.act);
    }
    function runAct(act) {
      if (act.startsWith('panel:')) { if (EO2.audio) EO2.audio.chime(); openPanel(act.slice(6)); }
      else if (act.startsWith('go:')) goScene(act.slice(3));
      else if (act === 'duel') { if (EO2.battle) EO2.battle.start(); }
      else if (act.startsWith('toast:')) { if (EO2.audio) EO2.audio.chime(); toast(act.slice(6)); }
      else if (act.startsWith('pet:')) { const o = SC.w.pets && SC.w.pets[act.slice(4)]; if (o) { o.cheer = 1.6; say(o, 'heart', 2.2, true); toast(o.line); if (EO2.audio) EO2.audio.chirp(); pet.cheer = 1.2; player.happy = 2; } }
      else if (act === 'cesme') { SC.w.fountain.splash = 1; if (EO2.audio) EO2.audio.splash(); toast('Çeşmenin suyu serin. Yavru da bir yudum aldı.'); pet.cheer = 1.6; say(pet, 'heart', 1.8, true); }
    }

    /* ---------- Çizim ---------- */
    const lightAt = (x, y) => { let s = 0; for (const l of L.lights) { const d = Math.hypot(x - l[0], y - l[1]); if (d < l[2]) { const a = 1 - d / l[2]; s += a * a * l[3]; } } return Math.min(1, s); };
    const litCol = (F, x, y, a = 1) => { const k = F.night * lightAt(x, y) * 0.8; return [Math.min(1.08, F.amb[0] + k), Math.min(1.08, F.amb[1] + k * 0.72), Math.min(1.08, F.amb[2] + k * 0.38), a]; };
    function drawChibi(R, F, c) {
      const st = sets[c.set], m = st.m, k = CHAR_H / m.tall, vdir = c.dir === 'left' ? 'right' : c.dir;
      const key = c.moving ? vdir + '_walk_' + (Math.floor(c.ph * 16) % 16 + 16) % 16 : (c.happy > 0 && vdir !== 'up' ? vdir + '_happy' : vdir + '_idle');
      const i = m.frames[key], col = i % m.cols, row = Math.floor(i / m.cols);
      let u0 = (col * m.cw + 0.5) / m.w, u1 = ((col + 1) * m.cw - 0.5) / m.w; const v0 = (row * m.ch + 0.5) / m.h, v1 = ((row + 1) * m.ch - 0.5) / m.h;
      if (c.dir === 'left') { const t = u0; u0 = u1; u1 = t; }
      const w = m.cw * k, h = m.ch * k, x0 = c.x - m.ax * k, zb = -(m.ch - m.ay) * k, br = c.moving ? 1 : 1 + Math.sin(F.time * 2.1 + c.seed) * 0.006;
      const a = c.isPlayer ? 1 : W.nearFade(F, c.y), sh = uv('shadow'), col4 = litCol(F, c.x, c.y, a);
      R.quad(FX, [c.x - 0.52, c.y - 0.2, 0.012], [c.x + 0.52, c.y - 0.2, 0.012], [c.x + 0.52, c.y + 0.2, 0.012], [c.x - 0.52, c.y + 0.2, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.8 * a]);
      R.quad(st.tex, [x0, c.y, zb], [x0 + w, c.y, zb], [x0 + w, c.y, zb + h * br], [x0, c.y, zb + h * br], u0, v0, u1, v1, col4);
    }
    const DK = 0.0034, DG = A.dragon;
    function drawPet(R, F, pet) {
      const hopZ = pet.moving ? Math.abs(Math.sin(pet.hop * Math.PI)) * 0.16 : (pet.cheer > 0 ? Math.abs(Math.sin(pet.cheer * 9)) * 0.14 : 0), t = F.time, dir = pet.face;
      const col = litCol(F, pet.x, pet.y), sh = uv('shadow'), ss = 1 - hopZ * 1.6;
      R.quad(FX, [pet.x - 0.42 * ss, pet.y - 0.16 * ss, 0.012], [pet.x + 0.42 * ss, pet.y - 0.16 * ss, 0.012], [pet.x + 0.42 * ss, pet.y + 0.16 * ss, 0.012], [pet.x - 0.42 * ss, pet.y + 0.16 * ss, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75]);
      const b = DG.body, bs = b.scale, an = n => [(b[n][0] - b.pivot[0]) * bs, (b[n][1] - b.pivot[1]) * bs];
      const part = (name, at, rot) => { const r = DG.rects[name], d = DG[name], s = d.scale, cs = Math.cos(rot), sn = Math.sin(rot);
        const P = (px, py) => { const lx = (px - d.pivot[0]) * s, ly = (py - d.pivot[1]) * s, rx = lx * cs - ly * sn + at[0], ry = lx * sn + ly * cs + at[1]; return [pet.x + dir * rx * DK, pet.y, -ry * DK + hopZ + 0.02]; };
        R.quad(tDragon, P(0, r[3]), P(r[2], r[3]), P(r[2], 0), P(0, 0), r[0] / DG.w, r[1] / DG.h, (r[0] + r[2]) / DG.w, (r[1] + r[3]) / DG.h, col); };
      const flap = pet.moving ? Math.sin(t * 13) * 0.3 : Math.sin(t * 1.7) * 0.07 + (pet.cheer > 0 ? Math.sin(t * 22) * 0.35 : 0);
      part('tail', an('tail'), Math.sin(t * 2.2) * 0.13);
      part('wing', an('wing'), DG.wing.rest * Math.PI / 180 + flap);
      part('body', [0, 0], 0);
      part('head', an('neck'), Math.sin(t * 1.4) * 0.05 + (pet.moving ? Math.sin(pet.hop * Math.PI * 2) * 0.05 : 0));
    }
    function drawPart(R, F, p) {
      if (p.k === 'petal') { const u = uv('petal'), s = p.s, c = [F.amb[0], F.amb[1], F.amb[2], p.rest > 0 ? Math.min(1, p.rest) * 0.9 : 0.95];
        if (p.rest > 0) R.quad(FX, [p.x - s, p.y - s * 0.7, 0.014], [p.x + s, p.y - s * 0.7, 0.014], [p.x + s, p.y + s * 0.7, 0.014], [p.x - s, p.y + s * 0.7, 0.014], u[0], u[1], u[2], u[3], c);
        else { const a = p.ph, cs = Math.cos(a) * s, sn = Math.sin(a) * s; R.quad(FX, [p.x - cs + sn, p.y, p.z - sn - cs], [p.x + cs + sn, p.y, p.z + sn - cs], [p.x + cs - sn, p.y, p.z + sn + cs], [p.x - cs - sn, p.y, p.z - sn + cs], u[0], u[1], u[2], u[3], c); } }
      else if (p.k === 'dust') { const u = uv('smoke'), s = p.s + (p.max - p.life) * 0.5, a = p.life / p.max * 0.5; R.quad(FX, [p.x - s, p.y, p.z - s * 0.6], [p.x + s, p.y, p.z - s * 0.6], [p.x + s, p.y, p.z + s * 0.6], [p.x - s, p.y, p.z + s * 0.6], u[0], u[1], u[2], u[3], [F.amb[0], F.amb[1], F.amb[2], a]); }
      else if (p.k === 'bfly') { const u = uv('petal'), fl = Math.abs(Math.sin(F.time * 14 + p.a * 5)), w = 0.09 * (0.25 + fl * 0.75), hh = 0.075, c = [p.col[0] * F.amb[0], p.col[1] * F.amb[1], p.col[2] * F.amb[2], 0.95];
        R.quad(FX, [p.x - w, p.y, p.z - hh], [p.x, p.y, p.z - hh], [p.x, p.y, p.z + hh], [p.x - w, p.y, p.z + hh * 1.4], u[0], u[1], u[2], u[3], c); R.quad(FX, [p.x + w, p.y, p.z - hh], [p.x, p.y, p.z - hh], [p.x, p.y, p.z + hh], [p.x + w, p.y, p.z + hh * 1.4], u[0], u[1], u[2], u[3], c); }
      else if (p.k === 'ember') { const u = uv('dot'), s = p.s, a = Math.min(1, p.life) * F.night; R.quad(FX, [p.x - s, p.y, p.z - s], [p.x + s, p.y, p.z - s], [p.x + s, p.y, p.z + s], [p.x - s, p.y, p.z + s], u[0], u[1], u[2], u[3], [1.0 * a, 0.55 * a, 0.18 * a, 1], true, 0); }
      else { const u = uv('note'), s = p.s, a = Math.min(1, p.life / 0.6) * Math.min(1, (p.max - p.life) / 0.3), sx = Math.sin(p.life * 4) * 0.06; R.quad(FX, [p.x - s + sx, p.y, p.z - s], [p.x + s + sx, p.y, p.z - s], [p.x + s + sx, p.y, p.z + s], [p.x - s + sx, p.y, p.z + s], u[0], u[1], u[2], u[3], [0.13, 0.2, 0.45, a]); }
    }
    // ışık saçan sabitler: fener haleleri, mangal alevi, baca dumanı
    function buildFx(L) { const fxStatics = [];
    for (const l of (L.lamps || [])) fxStatics.push({ key: l[1] - 0.02, draw(R, F) { if (F.night < 0.02) return; const u = uv('glow'), fl = 0.9 + Math.sin(F.time * 7 + l[0] * 3) * 0.05 + Math.sin(F.time * 13 + l[1]) * 0.04, k = F.night * fl, s = 1.7;
      R.quad(FX, [l[0] - s, l[1] - 0.02, 2.97 - s], [l[0] + s, l[1] - 0.02, 2.97 - s], [l[0] + s, l[1] - 0.02, 2.97 + s], [l[0] - s, l[1] - 0.02, 2.97 + s], u[0], u[1], u[2], u[3], [1.0 * k, 0.66 * k, 0.28 * k, 1], true, 0); } });
    for (const b of (L.braziers || [])) fxStatics.push({ key: b[1] - 0.03, draw(R, F) { const t = F.time, g = uv('glow'), k = 0.35 + F.night * 0.65, s = 1.5 + Math.sin(t * 9 + b[0]) * 0.08;
      R.quad(FX, [b[0] - s, b[1] - 0.03, 1.2 - s], [b[0] + s, b[1] - 0.03, 1.2 - s], [b[0] + s, b[1] - 0.03, 1.2 + s], [b[0] - s, b[1] - 0.03, 1.2 + s], g[0], g[1], g[2], g[3], [1.0 * k, 0.5 * k, 0.16 * k, 1], true, 0);
      for (let i = 0; i < 3; i++) { const u = uv('flame' + ((Math.floor(t * 10) + i) % 3)), w = 0.3 + i * 0.05 + Math.sin(t * 11 + i * 2) * 0.03, h = 0.75 + Math.sin(t * 8 + i) * 0.1, ox = (i - 1) * 0.13;
        R.quad(FX, [b[0] + ox - w, b[1] - 0.03, 0.95], [b[0] + ox + w, b[1] - 0.03, 0.95], [b[0] + ox + w, b[1] - 0.03, 0.95 + h], [b[0] + ox - w, b[1] - 0.03, 0.95 + h], u[0], u[1], u[2], u[3], [1, 1, 1, 0.95], false, 0); } } });
    if (L.chimney) fxStatics.push({ key: 19.35, draw(R, F) { const u = uv('smoke'); for (let i = 0; i < 7; i++) { const p = (F.time * 0.11 + i / 7) % 1, s = 0.35 + p * 1.0, x = -7.47 + p * 1.5 + Math.sin(p * 6 + i) * 0.15, z = 9.1 + p * 3.6, c = [F.amb[0], F.amb[1], F.amb[2], (1 - p) * 0.55 * Math.min(1, p * 8)];
      R.quad(FX, [x - s, 19.36, z - s], [x + s, 19.36, z - s], [x + s, 19.36, z + s], [x - s, 19.36, z + s], u[0], u[1], u[2], u[3], c); } } });
    if (!L.indoor) fxStatics.push({ key: 2e5, draw(R, F) {      // güneş hâlesi ve ay: ekran uzayı
      const g = uv('glow'), a = (1 - F.night) * 0.55, asp = R.h / R.w, hy = F.horizonNDC; if (hy > 0.99) return;
      const cy = lerp(hy, 1, 0.55); R.quad(FX, [0.55 - 0.6 * asp, cy - 0.6, 0], [0.55 + 0.6 * asp, cy - 0.6, 0], [0.55 + 0.6 * asp, cy + 0.6, 0], [0.55 - 0.6 * asp, cy + 0.6, 0], g[0], g[1], g[2], g[3], [1.0 * a, 0.93 * a, 0.72 * a, 1], true, 0, true);
      if (F.night > 0.05) { const d = uv('dot'), n = F.night, r = 0.07; R.quad(FX, [-0.5 - 0.5 * asp, cy - 0.5, 0], [-0.5 + 0.5 * asp, cy - 0.5, 0], [-0.5 + 0.5 * asp, cy + 0.5, 0], [-0.5 - 0.5 * asp, cy + 0.5, 0], g[0], g[1], g[2], g[3], [0.5 * n, 0.55 * n, 0.8 * n, 1], true, 0, true);
        R.quad(FX, [-0.5 - r * asp, cy - r, 0], [-0.5 + r * asp, cy - r, 0], [-0.5 + r * asp, cy + r, 0], [-0.5 - r * asp, cy + r, 0], d[0], d[1], d[2], d[3], [0.96, 0.95, 0.88, n], false, 0, true); } } });

    for (const it of (L.interact || [])) fxStatics.push({ key: it.y - 0.05, draw(R, F) { const d = Math.hypot(player.x - it.x, player.y - it.y); if (d > 24 || (EO2.battle && EO2.battle.active())) return; const wv = uv('white'), g = uv('glow'), nearK = clamp(1 - (d - it.r) / 3, 0, 1), far = clamp((d - it.r) / 2, 0, 1);
      const z = it.z + 0.55 + Math.sin(F.time * 2.2 + it.x) * 0.12, s = 0.17 * (0.8 + far * 0.2), a = (0.35 + far * 0.6) * W.nearFade(F, it.y); if (a < 0.02) return;
      if (it.id !== 'cesme') { R.quad(FX, [it.x - s * 3, it.y - 0.05, z - s * 3], [it.x + s * 3, it.y - 0.05, z - s * 3], [it.x + s * 3, it.y - 0.05, z + s * 3], [it.x - s * 3, it.y - 0.05, z + s * 3], g[0], g[1], g[2], g[3], [0.9 * a, 0.65 * a, 0.2 * a, 1], true, 0);
        R.quad(FX, [it.x - s, it.y - 0.05, z], [it.x, it.y - 0.05, z - s * 1.5], [it.x + s, it.y - 0.05, z], [it.x, it.y - 0.05, z + s * 1.5], wv[0], wv[1], wv[2], wv[3], [1, 0.84, 0.36, a], false, 0);
        R.quad(FX, [it.x - s * 0.5, it.y - 0.051, z], [it.x, it.y - 0.051, z - s * 0.75], [it.x + s * 0.5, it.y - 0.051, z], [it.x, it.y - 0.051, z + s * 0.75], wv[0], wv[1], wv[2], wv[3], [1, 0.97, 0.8, a], false, 0); }
      if (near === it || nearK > 0.05) { const ru = uv('ring'), rr = Math.min(it.r, 1.5) * (0.9 + Math.sin(F.time * 3) * 0.04), ak = (near === it ? 0.7 : 0.25) * nearK, cx = it.id === 'cesme' ? player.x : it.x, cy = it.id === 'cesme' ? player.y : Math.min(it.y - 0.6, player.y + 0.01);
        if (it.id !== 'cesme') R.quad(FX, [cx - rr, cy - rr * 0.8, 0.013], [cx + rr, cy - rr * 0.8, 0.013], [cx + rr, cy + rr * 0.8, 0.013], [cx - rr, cy + rr * 0.8, 0.013], ru[0], ru[1], ru[2], ru[3], [1 * ak, 0.8 * ak, 0.35 * ak, 1], true, 0); } } });
      return fxStatics; }
    const list = [];
    const F = { amb: [1, 1, 1], night: 0, time: 0, dt: 0, camX: 0, camY: 0, D: 7, horizonNDC: 0, coverTest: null };
    F.lit = (x, y, a) => litCol(F, x, y, a);
    const flyerDraw = { key: 0, draw(R, F) { const e = W.ext('fly'), f = flyer; if (!e || !f) return; const w = 9, hh = w * e.h / e.w, bob = Math.sin(f.t * 1.6) * 0.6, x0 = f.x - w / 2 * f.dir, x1 = f.x + w / 2 * f.dir, sh = uv('shadow');
      R.quad(FX, [f.x - 4.2, f.y - 3.4, 0.013], [f.x + 4.2, f.y - 3.4, 0.013], [f.x + 4.2, f.y - 0.6, 0.013], [f.x - 4.2, f.y - 0.6, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.42]);
      R.quad(e.t, [x0, f.y, f.z + bob], [x1, f.y, f.z + bob], [x1, f.y, f.z + bob + hh], [x0, f.y, f.z + bob + hh], 0, 0, 1, 1, [F.amb[0], F.amb[1], F.amb[2], 1], false, 0.5); } };
    let playerScreen = null;
    F.coverTest = it => { if (!playerScreen || it.y > player.y - 0.15) return false; const a = R.project(it.x - it.w * 0.5, it.y, it.h), b = R.project(it.x + it.w * 0.5, it.y, 0.6); if (!a || !b) return false;
      return playerScreen[0] > a[0] + 6 && playerScreen[0] < b[0] - 6 && playerScreen[1] > a[1] && playerScreen[1] < b[1] + 30; };

    function render(dt) {
      const w = R.w, h = R.h, pk = clamp((0.95 - w / h) / 0.35, 0, 1), base = lerp(Math.min(h, w * 0.62), w * 0.95, pk), n = nightNow(), LT = L.light || {};   // pk: dikey ekran payı
      // giriş süzülüşü: kamera uzaktan ve yüksekten iner
      const it = 1 - ease(S.intro), D = lerp(cam.D, 10.5, pk) * (1 - 0.2 * S.focusK) + it * 9, H = lerp(cam.H, 10.5, pk) + it * 3.2, th = lerp(cam.th, 0.56, pk) + it * 0.16, cos = Math.cos(th), sin = Math.sin(th), feet = lerp(cam.feet, 0.6, pk);
      const df = D * cos + H * sin, uf = D * sin - H * cos, dh = D * cos + (H - CHAR_H) * sin, uh = D * sin - (H - CHAR_H) * cos;
      const Fc = 0.2 * base / (uh / dh - uf / df), ppy = feet * h + Fc * uf / df;
      R.setCamera({ x: cam.x, y: cam.y - D, h: H, F: Fc, cos, sin, ppy });
      const fogC = [lerp(0.80, 0.33, n), lerp(0.89, 0.25, n), lerp(0.97, 0.44, n), LT.fog === undefined ? 0.86 : LT.fog];
      R.setFog(fogC, [30, 105]);
      F.amb = LT.amb || [lerp(1, 0.50, n), lerp(1, 0.49, n), lerp(1, 0.74, n)]; F.camH = H; F.py = player.y; F.night = n; F.time = S.time; F.dt = dt; F.camX = cam.x; F.camY = cam.y - D; F.D = D;
      F.horizonNDC = 1 - 2 * (ppy - Fc * sin / cos) / h;
      playerScreen = R.project(player.x, player.y, 0.9);
      R.begin(LT.clear || fogC);
      // gök ve uzak plan zeminden önce
      list.length = 0; for (const s of SC.w.statics) list.push(s); for (const s of fxStatics) list.push(s); if (flyer) { flyerDraw.key = flyer.y; list.push(flyerDraw); }
      for (const c of npcs) list.push({ key: c.y, c }); list.push({ key: player.y, c: player }); if (S.companion) list.push({ key: pet.y + 0.001, pet });
      for (const c of remotes) { if ((c.area || 'meydan') !== SC.id) continue; list.push({ key: c.y, c }); if (c.pet) list.push({ key: c.pet.y + 0.001, pet: c.pet }); }
      for (const p of parts) list.push({ key: p.y, p });
      list.sort((a, b) => b.key - a.key);
      let groundDone = false;
      const ground = () => { groundDone = true; R.ground(mapTex, [-90, cam.y - D + 0.3, 90, 170], { map: L.mapRect, amb: F.amb, night: n, time: S.time, fount: L.fount ? [L.fount.x, L.fount.y, L.fount.ringIn, L.fount.ringOut] : [0, 0, 0, 0], emb: L.emb ? [L.emb.x, L.emb.y, L.emb.r, 0] : [0, 0, -1, 0], lights: L.lights || [], mode: L.floor === 'wood' ? 1 : L.floor === 'sand' ? 2 : 0, road: L.road });
        // madalyonun ortasındaki altın ejder mührü ve tıklama hedefi
        const e = L.emb || { x: 0, y: -999 }, s = 0.62, hh = s * W.E.emblem.height / W.E.emblem.width; if (L.emb) R.quad(tEmb, [e.x - s, e.y - hh, 0.01], [e.x + s, e.y - hh, 0.01], [e.x + s, e.y + hh, 0.01], [e.x - s, e.y + hh, 0.01], 0, 0, 1, 1, [F.amb[0], F.amb[1], F.amb[2], 0.95]);
        if (target) { const u = uv('ring'), r = 0.34 + Math.sin(target.t * 7) * 0.05; R.quad(FX, [target.x - r, target.y - r, 0.015], [target.x + r, target.y - r, 0.015], [target.x + r, target.y + r, 0.015], [target.x - r, target.y + r, 0.015], u[0], u[1], u[2], u[3], [1.0, 0.85, 0.45, 0.95]); } };
      for (const d of list) {
        if (!groundDone && d.key < 1000) ground();
        if (d.draw) d.draw(R, F); else if (d.c) drawChibi(R, F, d.c); else if (d.pet) drawPet(R, F, d.pet); else drawPart(R, F, d.p);
      }
      R.flush();
    }
    // zemin boyaması (çim, leke, gölge) alan başına; mühür dokusu ortak
    function buildMap(L) { const shadows = [...(L.shadows || [])];
      for (const t of (L.trees || [])) shadows.push(t[0] === 'cinar' ? [t[1] - 0.8, t[2] + 0.5, 3.6, 2.2, 0.75] : t[0] === 'selvi' ? [t[1] - 0.3, t[2] + 0.2, 1.0, 0.7, 0.6] : [t[1] - 0.5, t[2] + 0.3, 2.3, 1.4, 0.65]);
      for (const l of (L.lamps || [])) shadows.push([l[0], l[1], 0.5, 0.3, 0.6]); for (const b of (L.benches || [])) shadows.push([b[0], b[1] + 0.1, 1.3, 0.5, 0.6]); for (const p of (L.planters || [])) shadows.push([p[0], p[1] + 0.1, 1.1, 0.5, 0.6]);
      for (const s of (L.stalls || [])) shadows.push([s[0], s[1] + 0.4, 1.9, 1.1, 0.7]); if (L.fount) shadows.push([L.fount.x, L.fount.y, 3.1, 3.0, 0.5]);
      return R.texture(EO2.art.groundMap({ mapRect: L.mapRect, paved: L.paved, shadows }), { raw: true }); }
    const tEmb = R.texture(W.E.emblem);

    /* ---------- Dünyaya bağlı arayüz: tabela, isim, balon, istem ---------- */
    const anchors = $('anchors'), mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.hidden = true; anchors.appendChild(d); return d; };
    const rebuildSigns = () => { for (const o of signEls) o.el.remove(); signEls = (L.signs || []).map(s => { const el = mk('sign', '<span></span>'); el.firstChild.textContent = s.label; return { s, el }; }); };
    const setPlate = c => { if (!c.plate) return; const b = c.plate.firstChild, i = c.plate.lastChild; b.textContent = c.name; i.textContent = c.isPlayer ? 'Kudret 1558' : c.remote ? 'oyuncu' : (c.role && c.role !== 'NPC' ? c.role : ''); i.hidden = !i.textContent; };
    const plateOf = c => { if (!c.plate) { c.plate = mk('plate' + (c.isPlayer ? ' me' : c.remote ? ' real' : ''), '<b></b><i></i>'); setPlate(c); } return c.plate; };
    const dropChar = c => { for (const k of ['plate', 'bub']) if (c[k]) { c[k].remove(); c[k] = null; } if (c.pet && c.pet.bub) c.pet.bub.remove(); };
    const bubbleOf = c => c.bub || (c.bub = mk('bubble', ''));
    const promptEl = mk('prompt', '');
    const ICON = EO2.icons;
    function say(c, text, secs, icon) { c.bubble = { t: secs }; const b = bubbleOf(c); b.className = 'bubble' + (icon ? ' ico' : ''); b.innerHTML = icon ? ICON[text] : ''; if (!icon) b.textContent = text; }
    const place = (el, p, dx = 0, dy = 0) => { if (!p || p[0] < -80 || p[0] > R.w + 80 || p[1] < -60 || p[1] > R.h + 40) { el.hidden = true; return false; } el.hidden = false; el.style.transform = `translate3d(${(p[0] + dx).toFixed(1)}px,${(p[1] + dy).toFixed(1)}px,0) translate(-50%,-100%)`; return true; };
    function updateAnchors(dt) {
      for (const { s, el } of signEls) { const p = R.project(s.x, s.y, s.z); if (!p || p[2] > 46) { el.hidden = true; continue; } const q = [p[0], Math.max(p[1], R.h * 0.12 + 34), p[2]]; if (place(el, q)) el.style.setProperty('--k', clamp(1.25 - p[2] / 40, 0.72, 1.05).toFixed(2)); }
      for (const c of remotes) if ((c.area || 'meydan') !== SC.id) { if (c.plate) c.plate.hidden = true; if (c.bub) c.bub.hidden = true; }
      const chars = [player, ...npcs, ...remotes.filter(c => (c.area || 'meydan') === SC.id)];
      for (const c of chars) { const top = R.project(c.x, c.y, 2.02), far = top && top[2] > 26; if (c.isPlayer ? !top : (!top || far || W.nearFade(F, c.y) < 0.5)) { plateOf(c).hidden = true; if (c.bub) c.bub.hidden = true; continue; }
        place(plateOf(c), top); if (c.bubble) { c.bubble.t -= dt; if (c.bubble.t <= 0) { c.bubble = null; c.bub.hidden = true; } else place(c.bub, top, 0, -plateOf(c).offsetHeight - 6); } else if (c.bub) c.bub.hidden = true; }
      if (pet.bubble) { pet.bubble.t -= dt; const p = R.project(pet.x, pet.y, 1.0); if (pet.bubble.t <= 0 || !S.companion) { pet.bubble = null; pet.bub.hidden = true; } else place(pet.bub, p); }
      if (SC.w.pets) for (const o of Object.values(SC.w.pets)) if (o.bubble) { o.bubble.t -= dt; if (o.bubble.t <= 0) { o.bubble = null; o.bub.hidden = true; } else place(o.bub, R.project(o.x, o.y, o.z)); }
      if (near && !S.panel) { const p = R.project(near.x, near.y, near.z); promptEl.innerHTML = '<kbd>E</kbd><span><b>' + near.label + '</b><i>' + near.sub + '</i></span>'; if (p) place(promptEl, [clamp(p[0], 90, R.w - 90), clamp(p[1] - (near.npc ? R.h * 0.045 : 0), R.h * 0.2, R.h * 0.8), 1]); $('btnE').classList.add('on'); $('btnE').querySelector('span').textContent = near.label; }
      else { promptEl.hidden = true; $('btnE').classList.remove('on'); }
    }

    /* ---------- HUD ---------- */
    function drawPortrait(cv, set, k) { const st = sets[set] || sets.temel, m = st.m, i = m.frames.down_idle, x = cv.getContext('2d'), sx = (i % m.cols) * m.cw, sy = Math.floor(i / m.cols) * m.ch, top = m.ay - m.tall, s = m.tall * (k || 0.50);
      x.clearRect(0, 0, cv.width, cv.height); x.drawImage(st.img, sx + m.ax - s / 2, sy + top - s * 0.02, s, s, 0, 0, cv.width, cv.height); }
    function drawFull(cv, set) { const st = sets[set], m = st.m, i = m.frames.down_idle, x = cv.getContext('2d'), sx = (i % m.cols) * m.cw, sy = Math.floor(i / m.cols) * m.ch, k = cv.height / m.ch; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(st.img, sx, sy, m.cw, m.ch, (cv.width - m.cw * k) / 2, 0, m.cw * k, cv.height); }
    drawPortrait($('portrait'), player.set);
    function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200); }
    function setNight(v) { S.nightT = v; if (EO2.audio) EO2.audio.night(v); $('btnLight').setAttribute('aria-pressed', String(!!v)); $('btnLight').innerHTML = ICON[v ? 'moon' : 'sun']; app.classList.toggle('night', !!v); toast(v ? 'Akşam: fenerler ve mangallar yandı.' : 'Gündüz'); syncMenu(); }
    function setCam(m) { S.camMode = m; toast(m === 'yakin' ? 'Kamera: yakın (onaylı his)' : 'Kamera: yüksek (ana referans açısı)'); syncMenu(); }
    function setHud(v) { S.hud = v; app.classList.toggle('nohud', !v); if (!v) toast('Arayüz gizli. Geri getirmek için H.'); }
    $('btnLight').addEventListener('click', () => setNight(S.nightT ? 0 : 1)); $('btnCam').addEventListener('click', () => setCam(S.camMode === 'yakin' ? 'yuksek' : 'yakin'));
    $('btnBell').addEventListener('click', () => toast('Bildirim yok.'));
    $('btnSound').innerHTML = ICON.sound; $('btnSound').addEventListener('click', () => { const on = EO2.audio.toggle(); $('btnSound').innerHTML = ICON[on ? 'sound' : 'mute']; $('btnSound').setAttribute('aria-pressed', String(on)); });
    $('liveChip').addEventListener('click', () => togglePanel('sosyal'));
    EO2.frameHooks.push(() => { if (EO2.audio) EO2.audio.update(player.x, player.y, L.fount || FAR, npcs.find(n => n.notes) || FAR); });
    const titleCard = (name, sub) => { const el = $('titlecard'); el.querySelector('b').textContent = name; el.querySelector('span').textContent = sub; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
    setTimeout(() => { if (!(EO2.battle && EO2.battle.active())) titleCard(L.name, L.sub); }, 900); $('btnGear').addEventListener('click', () => togglePanel('menu')); $('profile').addEventListener('click', () => togglePanel('envanter'));

    // sohbet
    const chat = { tab: 'genel', log: [] };
    function chatAdd(ch, who, text) { chat.log.push({ ch, who, text }); if (chat.log.length > 60) chat.log.shift(); chatRender(); }
    function chatRender() { const box = $('chatLog'); box.textContent = ''; const rows = chat.log.filter(m => chat.tab === 'genel' ? m.ch !== 'parti' : m.ch === chat.tab || m.ch === 'sistem');
      if (!rows.length) { const p = document.createElement('p'); p.className = 'sys'; p.textContent = chat.tab === 'parti' ? 'Partide kimse yok.' : 'Henüz mesaj yok.'; box.appendChild(p); }
      for (const m of rows.slice(-30)) { const p = document.createElement('p'); if (m.ch === 'sistem') { p.className = 'sys'; p.textContent = m.text; } else { const t = document.createElement('span'); t.className = 'ch ' + m.ch; t.textContent = '[' + ({ genel: 'Genel', bolge: 'Bölge', parti: 'Parti' })[m.ch] + '] '; const b = document.createElement('b'); b.textContent = m.who + ': '; p.append(t, b, m.text); } box.appendChild(p); }
      box.scrollTop = box.scrollHeight; }
    for (const b of $('chatTabs').querySelectorAll('button')) b.addEventListener('click', () => { chat.tab = b.dataset.tab; for (const o of $('chatTabs').querySelectorAll('button')) o.setAttribute('aria-selected', String(o === b)); chatRender(); });
    $('chatForm').addEventListener('submit', e => { e.preventDefault(); const v = $('chatInput').value.trim(); if (!v) { $('chatInput').blur(); return; } const ch = chat.tab === 'parti' ? 'parti' : chat.tab; chatAdd(ch, 'Sen', v.slice(0, 120)); say(player, v.slice(0, 80), 4.5); if (EO2.hooks.chat) EO2.hooks.chat(v.slice(0, 120)); $('chatInput').value = ''; $('chatInput').blur(); });
    $('chatToggle').addEventListener('click', () => $('chat').classList.toggle('open'));
    chatAdd('sistem', '', 'Dikey dilim: sohbet yereldir, sunucuya gitmez. Meydandakiler NPC\'dir.');

    // emote
    const EM = ['smile', 'wave', 'heart', 'spark', 'think', 'note'];
    function emote(i) { const k = EM[i]; if (!k) return; say(player, k, 2.4, true); player.happy = 2.4; if (EO2.audio) EO2.audio.pop(); if (EO2.hooks.emote) EO2.hooks.emote(k); if (k === 'heart' || k === 'smile') { pet.cheer = 1.4; if (EO2.audio) EO2.audio.chirp(); } }
    $('emotes').querySelectorAll('button').forEach((b, i) => { b.innerHTML = ICON[EM[i]]; b.addEventListener('click', () => emote(i)); });
    $('actions').querySelectorAll('button').forEach(b => { b.querySelector('.ic').innerHTML = ICON[b.dataset.icon]; b.addEventListener('click', () => togglePanel(b.dataset.panel)); });
    $('btnBell').innerHTML = ICON.bell; $('btnGear').innerHTML = ICON.gear; $('btnLight').innerHTML = ICON.sun; $('btnCam').innerHTML = ICON.cam; $('chatToggle').innerHTML = ICON.chat;
    document.querySelectorAll('[data-ic]').forEach(e => { e.innerHTML = ICON[e.dataset.ic]; });

    // paneller
    const tagVar = '<em class="tg var">mevcut sistem</em>', tagYeni = '<em class="tg yeni">yeni sahne</em>';
    const rows = a => '<ul class="rows">' + a.map(r => '<li><div><b>' + r[0] + '</b>' + (r[1] ? '<span>' + r[1] + '</span>' : '') + '</div>' + (r[2] || tagVar) + '</li>').join('') + '</ul>';
    const foot = t => '<p class="foot">' + t + '</p>';
    const PANELS = {
      han: { k: 'Sosyal ve dinlenme', t: 'Han', b: () => '<p>Kervansaray Kıraathanesi bu kapının ardında açılır.</p>' + rows([['Masa oyunları', 'Tavla, Kor 21 ve diğer masalar'], ['Salon', 'Oturma, sohbet, emote', tagYeni]]) + foot('Han\'ın içi gezilebilir. Masa oyunları F3\'te bağlanır; kural ve ödül değişmez.') },
      pazar: { k: 'Ticaret', t: 'Pazar', b: () => '<p>Tezgâhlar meydanda, Bedesten kubbelerin altında. Çarşının içi gezilebilir.</p>' + rows([['Bedesten', 'Rüstem Ağa · oyuncu ilanları, serbest fiyat'], ['Gece Çarşısı', 'NPC tezgâhları'], ['Kor Örsü ve Dökümhane', 'Usta Kerim'], ['Müzayede', '']]) + foot('Fiyat ve olasılık değerleri bu dilimde gösterilmez; mevcut ekranlar F3\'te buraya bağlanır.') },
      kuzey: { k: 'Dış bölge', t: 'Kuzey Yolu', b: () => '<p>Kapının ötesi seferlere ve kervanlara açılır.</p>' + rows([['Sefer', '8 biyom'], ['Kervan Yolu', ''], ['Bölge Sancakları', ''], ['Kül Yutan', 'Dünya boss\'u']]) + foot('Kuzey Yolu kervan kampına kadar gezilebilir. Sefer ekranı F3\'te bağlanır.') },
      arena: { k: 'Savaş', t: 'Topçu Arenası', b: () => '<p>Endgame\'in kapısı: topçu düelloları ve büyük zindanlar.</p>' + rows([['Topçu PvP odaları', 'Lobi, hızlı savaş, bekleme odası'], ['Zindanlar', 'Şahmeran, Komutan, Abra'], ['Ejderha Arenası', 'Düello ve kariyer'], ['Canlı Tribün', '']]) + '<button class="primary" id="btnDuel">Gösterim düellosuna gir</button>' + foot('Arena avlusu gezilebilir; düello kuzeydeki kapıdan da açılır. Gösterim düellosu Topçu\'nun sade hâlidir, ödül yok; rakip yerel bir NPC. Zindanlar ve Canlı Tribün F3\'te bağlanır.'), on: () => { $('btnDuel').addEventListener('click', () => { closePanel(); if (EO2.battle) EO2.battle.start(); }); } },
      bahce: { k: 'Bakım', t: 'Ejder Bahçesi', b: () => '<p>Ejderhalar burada gerçek boylarında dolaşır.</p>' + rows([['Ahır', 'Bakım, besleme, antrenman'], ['Yuva ve kuluçka', ''], ['Ocak', 'Kendi arazin: özel alan (K11)']]) + foot('Bahçe gezilebilir. Bahçedeki ejderhalar oyunun mevcut görselleridir; bakım ekranları F3\'te bağlanır.') },
      ejderhalar: { k: 'Yol arkadaşı', t: 'Ejderhalar', b: () => '<div class="card pet"><canvas id="petThumb" width="220" height="170"></canvas><div><b>Ateş yavrusu</b><span>Yol arkadaşı · örnek</span><label class="sw"><input type="checkbox" id="chkPet"' + (S.companion ? ' checked' : '') + '><i></i>Meydanda yanımda yürüsün</label></div></div>' + foot('Ejder, chibi hattının çizdiği parçalardan kurulur: gövde, baş, kanat, kuyruk. Çeşmedeki mavi heykel de aynı parçaların taş rengine çekilmiş hâli. Ahır listesi F3\'te buraya bağlanır.'),
        on: () => { const c = EO2.art.composeDragon(imgs.dragon, A, {}).c, cv = $('petThumb'), x = cv.getContext('2d'); x.drawImage(c, 20, 60, 480, 360, 0, 0, 220, 165); $('chkPet').addEventListener('change', e => { S.companion = e.target.checked; }); } },
      envanter: { k: 'Kuşanma', t: 'Envanter', b: () => '<p>Seti değiştir; karakter meydanda anında kuşanır.</p><div class="sets">' + [['bare', 'Çıplak'], ['temel', 'Temel'], ['muhafiz', 'Muhafız'], ['avci', 'Avcı'], ['madenci', 'Madenci']].filter(s => sets[s[0]]).map(s => '<button data-set="' + s[0] + '" aria-pressed="' + (player.set === s[0]) + '"><canvas width="150" height="180"></canvas><b>' + s[1] + '</b></button>').join('') + '</div>' + foot('Setlerin hepsi chibi hattının gerçek çizimi: ön, arka ve yan yürüyüş 16 kare. Çanta ve Ocak Sandığı F3\'te buraya bağlanır.'),
        on: () => { $('panelBody').querySelectorAll('.sets button').forEach(b => { drawFull(b.querySelector('canvas'), b.dataset.set); b.addEventListener('click', () => { player.set = b.dataset.set; drawPortrait($('portrait'), player.set); $('panelBody').querySelectorAll('.sets button').forEach(o => o.setAttribute('aria-pressed', String(o === b))); player.happy = 1.5; }); }); } },
      uretim: { k: 'Zanaat', t: 'Üretim', b: () => rows([['Kor Örsü', 'Dövme ve +basma'], ['Dökümhane', '']]) + foot('Tezgâh Pazar\'da, Usta Kerim\'in yanında. Bu düğme her yerden kısayoldur.') },
      gorevler: { k: 'Hafta 1 / 20 · İlkbahar', t: 'Görevler', b: () => '<h4>Hedefler</h4><ul class="rows q"><li><div><b>Kuluçka Ocağı kur</b><span>Dedenin yumurtasını içine yerleştir</span></div><em class="tg au">40 altın</em></li><li><div><b>Kor\'a bir antrenman ver</b><span>Sonra haftayı bitir</span></div><em class="tg au">30 altın</em></li><li><div><b>Köy Arenası\'nda ilk zaferini kazan</b></div><em class="tg au">50 altın</em></li></ul><h4>Kariyer</h4>' + rows([['Kor · Kariyer 1/4', 'Hafta 5\'e kadar arenada 2 zafer', '<em class="tg">0 / 2</em>']]) + '<button class="primary" disabled>Haftayı Bitir</button>' + foot('Hedefler yeni oyunun ilk hedefleridir. Hafta mekaniği 2.0\'da aynen kalır (K3); düğme bu dilimde çalışmaz.') },
      sosyal: { k: 'Meydandakiler', t: 'Sosyal', b: () => '<div id="roomList"></div>' + rows([['Arkadaşlar', ''], ['Parti', ''], ['Takas', 'Yüzen Takas düğmesi buraya taşınır']]) + foot('Bu sayfayı aynı anda açan herkes meydanda birbirini görür: konum, set, jest ve sohbet canlı gider. Kalıcı değildir; oyun sunucusuna bağlı gerçek oda F4 işidir.'),
        on: () => { if (EO2.net) EO2.net.renderList($('roomList')); else $('roomList').textContent = 'Bu görünümde canlı oda yok; meydanda yalnız NPC var.'; } },
      menu: { k: 'Ayarlar', t: 'Menü', b: () => '<h4>Kamera <kbd>C</kbd></h4><div class="seg" id="segCam"><button data-v="yakin">Yakın<small>onaylı his</small></button><button data-v="yuksek">Yüksek<small>ana referans açısı</small></button></div><h4>Işık <kbd>L</kbd></h4><div class="seg" id="segLight"><button data-v="0">Gündüz<small>EO2 ana tonu</small></button><button data-v="1">Akşam<small>kor ve fener ışığı</small></button></div><h4>Görünüm</h4><label class="sw"><input type="checkbox" id="chkFps"' + (S.fps ? ' checked' : '') + '><i></i>Kare hızını göster</label><button class="ghost" id="btnHide">Arayüzü gizle <kbd>H</kbd></button><h4>Bu dilim hakkında</h4>' + foot('Karakter ve ejder gerçek çizimdir. Binalar, ağaçlar ve zemin kodla çizilmiş yer tutucudur; nihai sanat 03 ve 04\'ten gelir. Altın, ün ve Kudret değerleri yeni oyunun başlangıç değerleridir.'),
        on: () => { $('segCam').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setCam(b.dataset.v))); $('segLight').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setNight(+b.dataset.v))); $('chkFps').addEventListener('change', e => { S.fps = e.target.checked; $('fps').hidden = !S.fps; }); $('btnHide').addEventListener('click', () => { closePanel(); setHud(false); }); syncMenu(); } },
    };
    function syncMenu() { if (S.panel !== 'menu') return; $('segCam').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.camMode))); $('segLight').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S.nightT))); }
    function openPanel(id) { const p = PANELS[id]; if (!p) return; S.panel = id; if (EO2.audio) EO2.audio.ui(); $('panelKicker').textContent = p.k; $('panelTitle').textContent = p.t; $('panelBody').innerHTML = p.b(); if (p.on) p.on(); $('panel').classList.add('open'); $('panel').setAttribute('aria-hidden', 'false');
      $('actions').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.panel === id))); }
    function closePanel() { S.panel = null; $('panel').classList.remove('open'); $('panel').setAttribute('aria-hidden', 'true'); $('actions').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')); }
    function togglePanel(id) { if (S.panel === id) closePanel(); else openPanel(id); }
    $('panelClose').addEventListener('click', closePanel);

    // mini harita
    const mini = $('mini'), mx = mini.getContext('2d');
    function drawMini() {
      const s = mini.width, M = L.mini || {}, b = L.bounds, full = Math.max(b[1] - b[0], b[3] - b[2]) + 5, span = Math.min(full, 38), k = s / span;
      const cx = (b[1] - b[0] + 5 > span) ? clamp(player.x, b[0] + span / 2 - 2.5, b[1] - span / 2 + 2.5) : (b[0] + b[1]) / 2, cy = (b[3] - b[2] + 5 > span) ? clamp(player.y, b[2] + span / 2 - 2.5, b[3] - span / 2 + 2.5) : (b[2] + b[3]) / 2;
      const X = x => (x - cx) * k + s / 2, Y = y => s / 2 - (y - cy) * k, box = (r, col) => { mx.fillStyle = col; mx.fillRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * k, (r[3] - r[1]) * k); };
      mx.clearRect(0, 0, s, s); mx.fillStyle = M.bg || '#7fb866'; mx.fillRect(0, 0, s, s);
      for (const r of (M.paved || [])) box(r, M.floor || '#e6d4bd'); for (const r of (M.green || [])) box(r, '#8fc47a'); for (const r of (M.strips || [])) box(r, '#4fb4ee');
      mx.strokeStyle = '#9db4d6'; mx.lineWidth = 2; for (const c of (M.rings || [])) { mx.beginPath(); mx.arc(X(c[0]), Y(c[1]), c[2] * k, 0, 6.3); mx.stroke(); }
      for (const r of (M.blocks || [])) box(r, L.indoor ? '#6a4630' : '#b9a58f'); mx.fillStyle = '#4fb4ee'; for (const c of (M.water || [])) { mx.beginPath(); mx.arc(X(c[0]), Y(c[1]), c[2] * k, 0, 6.3); mx.fill(); }
      for (const g of (L.interact || [])) { if (g.id === 'cesme' || g.act.startsWith('toast:')) continue; const go = g.act.startsWith('go:'); mx.save(); mx.translate(X(g.x), Y(g.y)); mx.rotate(Math.PI / 4); mx.fillStyle = '#213270'; mx.fillRect(-4.2, -4.2, 8.4, 8.4); mx.fillStyle = go ? '#5fe0ff' : '#eab94f'; mx.fillRect(-2.4, -2.4, 4.8, 4.8); mx.restore(); }
      mx.fillStyle = '#fff'; for (const n of npcs) { mx.beginPath(); mx.arc(X(n.x), Y(n.y), 2, 0, 6.3); mx.fill(); }
      mx.fillStyle = '#35e0ff'; mx.strokeStyle = '#0f1a40'; mx.lineWidth = 1; for (const n of remotes) { if ((n.area || 'meydan') !== SC.id) continue; mx.beginPath(); mx.arc(X(n.x), Y(n.y), 3.4, 0, 6.3); mx.fill(); mx.stroke(); }
      mx.save(); mx.translate(X(player.x), Y(player.y)); mx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[player.dir]); mx.fillStyle = '#ffd64a'; mx.strokeStyle = '#3a2530'; mx.lineWidth = 1.5; mx.beginPath(); mx.moveTo(0, -7); mx.lineTo(5, 5); mx.lineTo(0, 2.5); mx.lineTo(-5, 5); mx.closePath(); mx.fill(); mx.stroke(); mx.restore();
    }

    /* ---------- Alanlar: her alan ilk girişte kurulur, sonra saklanır ---------- */
    const scenes = {}, FAR = { x: 999, y: 999 };
    function nightNow() { return (L.light && L.light.night !== undefined) ? L.light.night : S.night; }
    function sceneOf(id) { if (scenes[id]) return scenes[id]; const w = W.scene(id); if (!w) return null; const Ls = w.L;
      return scenes[id] = { id, w, L: Ls, npcs: mkNpcs(Ls), parts: seedParts(Ls), fx: buildFx(Ls), mapTex: buildMap(Ls), embers: [...(Ls.braziers || []).map(q => [q[0], q[1], 1.1]), ...(Ls.lamps || []).map(q => [q[0], q[1], 3.0]), ...(Ls.embers || [])] }; }
    function enter(id, from) { const s = sceneOf(id); if (!s) return false;
      for (const c of npcs) { if (c.plate) c.plate.hidden = true; if (c.bub) c.bub.hidden = true; } if (SC && SC.w.pets) for (const o of Object.values(SC.w.pets)) if (o.bub) o.bub.hidden = true;
      SC = s; L = s.L; npcs = s.npcs; parts = s.parts; fxStatics = s.fx; mapTex = s.mapTex;
      const sp = (from && L.entry && L.entry[from]) || L.start; player.x = sp.x; player.y = sp.y; player.dir = sp.dir || 'up'; player.moving = false; pet.x = player.x + 0.8; pet.y = player.y - 0.3; crumbs.length = 0; crumbs.push([player.x, player.y]);
      cam.x = clamp(player.x, Math.min(0, L.bounds[0] + 4.1), Math.max(0, L.bounds[1] - 4.1)); cam.y = player.y; target = null; near = null; flyer = null; flyT = 10 + Math.random() * 10; keys.clear();
      rebuildSigns(); $('locName').textContent = L.name; app.dataset.scene = id; app.classList.toggle('indoor', !!L.indoor); if (EO2.audio && EO2.audio.scene) EO2.audio.scene(L);
      if (from) { titleCard(L.name, L.sub); chatAdd('sistem', '', L.name + ': ' + L.sub + '.'); } if (EO2.hooks.scene) EO2.hooks.scene(id); return true; }
    EO2.iris = fn => { const el = $('iris'); el.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => el.classList.remove('on'), 180); }, 430); };
    let switching = false;
    function goScene(id) { if (switching || !SC || id === SC.id || !(id === 'meydan' || (EO2.sceneDefs || {})[id])) return; switching = true; const from = SC.id; if (EO2.dialog) EO2.dialog.close(); closePanel(); if (EO2.audio) EO2.audio.chime(); EO2.iris(() => { enter(id, from); switching = false; }); }

    /* ---------- Döngü ---------- */
    function fit() { const r = app.getBoundingClientRect(); if (r.width && r.height) R.resize(r.width, r.height, Math.min(devicePixelRatio || 1, 2)); }
    new ResizeObserver(fit).observe(app); fit();
    let last = performance.now(), acc = 0, frames = 0, tick = 0;
    const stats = EO2.stats = { fps: 0, quads: 0, flushes: 0, ms: 0 };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t0 = performance.now(); update(dt); render(dt); updateAnchors(dt); stats.ms = performance.now() - t0;
      for (const h of EO2.frameHooks) h(dt);
      if (tick++ % 4 === 0) drawMini();
      acc += dt; frames++; if (acc >= 0.5) { stats.fps = Math.round(frames / acc); stats.quads = R.quads; stats.flushes = R.flushes; if (S.fps) $('fps').textContent = stats.fps + ' fps · ' + R.quads + ' dörtgen · ' + R.flushes + ' çizim'; acc = 0; frames = 0; }
      requestAnimationFrame(frame);
    }
    enter('meydan', null);
    EO2.api = { W, titleCard, player, pet, remotes, go: goScene, scene: () => SC.id, sceneState: () => SC, cam, setNight, setCam, setHud, openPanel, closePanel, emote, R, S, sets, mkChar, setPlate, dropChar, say, chatAdd, toast, runAct, drawPortrait, PANELS, ICON, step(dt) { update(dt); render(dt); updateAnchors(dt); } };
    Object.defineProperty(EO2.api, 'npcs', { get: () => npcs }); Object.defineProperty(EO2.api, 'L', { get: () => L });
    requestAnimationFrame(t => { last = t; frame(t); });
    if (coarse) app.classList.add('touch');
    setTimeout(() => toast(coarse ? 'Yön çubuğuyla ya da dokunarak yürü · E ile etkileşim' : 'WASD ya da tıklayarak yürü · Shift hızlan · E etkileşim · L ışık · C kamera'), 3000);
  }
  boot().catch(e => { console.error(e); const t = $('loadtxt'); if (t) t.textContent = 'Yüklenemedi: ' + e.message; });
})();
