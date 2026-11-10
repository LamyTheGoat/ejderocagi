/* EO2 dikey dilim · canlı meydan
   Yayın sayfasının "room" yeteneğiyle bu sayfayı o an açık tutan herkes birbirini görür: konum, yön, set, yol
   arkadaşı, jest ve sohbet. Hiçbir şey kalıcı değildir ve oyun sunucusuna gitmez; F4'teki gerçek odanın provasıdır.
   Gelen her veri güvenilmezdir: sayılar sınırlanır, metin yalnız textContent ile yazılır, adlar "user" yeteneğinden çözülür. */
(function () {
  'use strict';
  const EO2 = window.EO2, SETS = Object.keys(window.EO2_ATLAS.sets), DIRS = ['up', 'down', 'left', 'right'], EM = ['smile', 'wave', 'heart', 'spark', 'think', 'note'];
  const AREAS = { meydan: 'Merkez Meydan', han: 'Han', bahce: 'Ejder Bahçesi', yol: 'Kuzey Yolu', pazar: 'Pazar', arena: 'Topçu Arenası' };
  const SETNAME = { bare: 'Çıplak', temel: 'Temel', muhafiz: 'Muhafız', avci: 'Avcı', madenci: 'Madenci' };
  const whenApi = () => new Promise(r => { const t = setInterval(() => { if (EO2.api) { clearInterval(t); r(EO2.api); } }, 60); });
  const first = n => String(n || '').trim().split(/\s+/)[0].slice(0, 18);
  const chip = () => document.getElementById('liveChip');
  const status = (live, n) => { const c = chip(); if (!c) return; c.classList.toggle('on', !!live); c.querySelector('span').textContent = live ? (n > 1 ? 'Canlı · ' + n + ' kişi' : 'Canlı · yalnızsın') : 'Yerel'; c.title = live ? 'Bu sayfayı açan herkes meydanda görünür' : 'Bu görünümde canlı oda yok'; };

  (async () => {
    const api = await whenApi(), C = window.claude;
    status(false);
    if (!C || !C.use) return;
    const [room, user] = await Promise.all([C.use('room'), C.use('user')]);
    let myName = '';
    if (user) { try { const me = await user.me(); if (me && me.name) { myName = first(me.name); api.player.name = myName; api.setPlate(api.player); const b = document.querySelector('#profile b'); if (b) b.textContent = myName; } } catch (e) { /* ad yoksa "Terbiyeci" kalır */ } }
    if (!room) return;
    const peers = new Map(), my = { e: null, c: null };
    let lastJson = '';
    const push = force => { const p = api.player, s = { v: 1, a: api.scene(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), d: p.dir, s: p.set, p: api.S.companion ? 1 : 0, e: my.e, c: my.c };
      const j = JSON.stringify(s); if (j === lastJson && !force) return; lastJson = j; room.presence(s).catch(() => {}); };
    EO2.hooks.emote = k => { my.e = { k, t: Date.now() }; push(true); };
    EO2.hooks.chat = text => { my.c = { x: String(text).slice(0, 120), t: Date.now() }; push(true); };
    EO2.hooks.scene = () => { push(true); refresh(); };
    setInterval(() => push(false), 100);

    const num = (v, a, b) => (typeof v === 'number' && isFinite(v)) ? Math.max(a, Math.min(b, v)) : null;
    async function nameOf(p) {
      if (p.isMe) return (myName || 'Sen') + ' · diğer cihazın';
      if (user && p.by) { try { const ps = await user.profiles([p.by]); const n = ps && ps[p.by] && ps[p.by].name; if (n) return first(n); } catch (e) { /* çözülemedi */ } }
      return p.guest ? 'Misafir' : 'Gezgin';
    }
    function upsert(p) {
      if (p.sameTab || p.kind !== 'viewer') return;
      const s = p.presence || {}, x = num(s.x, -40, 40), y = num(s.y, -10, 80), area = AREAS[s.a] ? s.a : 'meydan'; if (x === null || y === null) return;
      const set = SETS.includes(s.s) ? s.s : 'temel', dir = DIRS.includes(s.d) ? s.d : 'down';
      let c = peers.get(p.peer);
      if (!c) {
        c = api.mkChar({ remote: true, name: 'Gezgin', x, y, tx: x, ty: y, set, dir, rdir: dir, crumbs: [[x, y]], peer: p.peer, lastE: s.e && s.e.t, lastC: s.c && s.c.t });
        peers.set(p.peer, c); api.remotes.push(c);
        nameOf(p).then(n => { c.name = n; api.setPlate(c); api.chatAdd('sistem', '', n + ' meydana geldi.'); if (EO2.audio) EO2.audio.chime(); refresh(); });
      }
      if (c.area !== area) { c.area = area; c.x = x; c.y = y; c.crumbs = [[x, y]]; if (c.pet) { c.pet.x = x + 0.8; c.pet.y = y - 0.2; } }
      c.tx = x; c.ty = y; c.set = set; c.rdir = dir;
      if (s.p && !c.pet) c.pet = { x: c.x + 0.8, y: c.y - 0.2, face: 1, hop: 0, moving: false, cheer: 0 }; else if (!s.p && c.pet) { if (c.pet.bub) c.pet.bub.remove(); c.pet = null; }
      if (s.e && typeof s.e.t === 'number' && s.e.t !== c.lastE) { c.lastE = s.e.t; if (EM.includes(s.e.k)) { api.say(c, s.e.k, 2.4, true); c.happy = 2.4; if (c.pet && s.e.k === 'heart') c.pet.cheer = 1.4; } }
      if (s.c && typeof s.c.t === 'number' && s.c.t !== c.lastC) { c.lastC = s.c.t; const text = String(s.c.x || '').slice(0, 120); if (text) { api.say(c, text.slice(0, 80), 4.5); api.chatAdd('genel', c.name, text); } }
    }
    function drop(id) { const c = peers.get(id); if (!c) return; peers.delete(id); const i = api.remotes.indexOf(c); if (i >= 0) api.remotes.splice(i, 1); api.dropChar(c); api.chatAdd('sistem', '', c.name + ' ayrıldı.'); }
    function refresh() { status(true, peers.size + 1); const el = document.getElementById('roomList'); if (el) EO2.net.renderList(el); }
    EO2.net = { peers,
      renderList(el) { el.textContent = ''; const ul = document.createElement('ul'); ul.className = 'rows';
        const row = (name, sub, tag) => { const li = document.createElement('li'), d = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span'), t = document.createElement('em'); b.textContent = name; s.textContent = sub; t.className = 'tg ' + (tag === 'sen' ? 'au' : 'yeni'); t.textContent = tag; d.append(b, s); li.append(d, t); ul.appendChild(li); };
        row(api.player.name, AREAS[api.scene()] + ' · ' + SETNAME[api.player.set], 'sen'); for (const c of peers.values()) row(c.name, AREAS[c.area || 'meydan'] + ' · ' + SETNAME[c.set], 'canlı');
        el.appendChild(ul); if (!peers.size) { const p = document.createElement('p'); p.className = 'foot'; p.textContent = 'Şu an meydanda yalnızsın. Sayfayı telefonunda da aç ya da biriyle paylaş: karakterler birbirini anında görür.'; el.appendChild(p); } } };
    room.onPeers(ch => { for (const p of ch.left) drop(p.peer); for (const p of ch.joined) upsert(p); for (const p of ch.updated) upsert(p); refresh(); }, () => {});
    if (room.onConnection) room.onConnection(ok => { if (ok) { refresh(); push(true); } else status(false); }, () => {});
    refresh(); push(true);
  })();
})();
