'use strict';

// ENG-14 · Topçu PvP oda kaydı ve hızlı savaş kuyruğu (bellekte, tek sunucu örneği).
// - Ödül/altın/ün/sıralama YOK; ekonomiye dokunmaz. İki taraf dürüst varsayılır (hile koruması ayrı iş).
// - `pvp_sync` ve oda mesajları YALNIZ odadaki oyunculara gider; herkese yayın yok.
// - Davet yalnız `to` hedefinin soketlerine gider.
// - Başlangıçta sunucu üyelere TEK mesaj gönderir: harita, mod, slotlar, ilk tur sahibi, rüzgâr tohumu.
// - Kopma: rakibe `pvp_peer_left`; süre dolunca kalan oyuncu hükmen kazanır. Maç sonu iki tarafa tek `pvp_match_end`.
const PVP_MAP_IDS = ['steppe_canyon', 'sky_archipelago', 'sandstorm', 'seljuk_ruins', 'dragon_caldera', 'glacier'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOT_POOL = [
  { handle: '@bozkir_avcisi', name: 'Bozkır Avcısı', el: 'toprak' },
  { handle: '@kuzey_ruzgari', name: 'Kuzey Rüzgârı', el: 'firtina' },
  { handle: '@kara_golge', name: 'Kara Gölge', el: 'golge' },
];
const SYNC_FIELDS = ['action', 'x', 'y', 'relX', 'facing', 'angle', 'power', 'dmg', 'el', 'chibi', 'mods', 'hp', 'maxHp', 'wind', 'text', 'turnNo', 'kind', 'mapId'];
const ERRORS = {
  room_not_found: 'Oda bulunamadı. Kodu kontrol et.',
  room_full: 'Oda dolu.',
  room_busy: 'Bu odada maç sürüyor.',
  not_in_room: 'Bir odada değilsin.',
  host_only: 'Bunu yalnız oda kurucusu yapabilir.',
  not_ready: 'Herkes hazır olmadan savaş başlamaz.',
  slots_empty: 'Rakip yuvası boş. Bir oyuncu bekle ya da prova için bot ekle.',
  mode_soon: '2v2 yakında. Şimdilik yalnız 1v1 açık.',
  friend_offline: 'Bu oyuncu şu anda çevrimiçi değil.',
  invalid_target: 'Geçerli bir oyuncu seçilmedi.',
  match_not_found: 'Maç bulunamadı.',
};

function createPvpRooms(deps = {}) {
  const { crypto, WS_CLIENTS, encodeWsFrame, now = Date.now, random = Math.random, config = {} } = deps;
  const DISCONNECT_GRACE = config.disconnectGraceMs ?? 30000;
  const READY_MS = config.readyCardMs ?? 5000;
  const QUEUE_SLOW_MS = config.queueSlowMs ?? 30000;
  const IDLE_ROOM_MS = config.idleRoomMs ?? 10 * 60000;
  const ENDED_ROOM_MS = config.endedRoomMs ?? 5 * 60000;
  const SWEEP_MS = config.sweepMs ?? 15000;

  const rooms = new Map();        // roomId -> room
  const codes = new Map();        // code -> roomId
  const memberRoom = new Map();   // key -> roomId
  const lobbySubs = new Set();    // lobi listesini izleyen soketler
  const queue = [];               // hızlı savaş bekleyenleri
  const pending = new Map();      // eşleşme kartı (5 sn) -> { id, entries, ready, timer, mapId }

  const hex = n => crypto.randomBytes(n).toString('hex');
  const keyOf = s => (s && s.playerInfo && (s.playerInfo.accountId || (s.playerInfo.handle && 'h:' + s.playerInfo.handle))) || null;
  const handleOf = s => (s && s.playerInfo && s.playerInfo.handle) || null;
  const live = s => !!(s && !s.destroyed);
  const send = (s, payload) => { if (!live(s)) return; try { s.write(encodeWsFrame(payload)); } catch (_) {} };
  const error = (s, code, extra = {}) => send(s, { type: 'pvp_error', code, message: ERRORS[code] || 'İşlem yapılamadı.', ...extra });
  const pick = list => list[Math.floor(random() * list.length) % list.length];
  const validMap = id => (PVP_MAP_IDS.includes(id) ? id : null);
  const humanMembers = room => room.slots.filter(m => m && !m.bot);

  function newCode() {
    for (let i = 0; i < 50; i++) {
      let c = 'EJD-';
      for (let j = 0; j < 3; j++) c += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
      if (!codes.has(c)) return c;
    }
    return 'EJD-' + hex(3).toUpperCase();
  }
  function normCode(raw) {
    let c = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!c) return '';
    if (!c.startsWith('EJD-')) c = 'EJD-' + c.replace(/^EJD/, '').replace(/^-/, '');
    return c;
  }

  function memberFrom(socket, msg = {}) {
    return {
      key: keyOf(socket), handle: handleOf(socket), socket,
      chibi: msg.chibi && typeof msg.chibi === 'object' ? msg.chibi : null,
      el: typeof msg.el === 'string' ? msg.el.slice(0, 16) : null,
      ready: false, connected: true, bot: false,
    };
  }
  function socketOf(member) {
    if (!member || member.bot) return null;
    if (live(member.socket)) return member.socket;
    for (const s of WS_CLIENTS || []) if (live(s) && keyOf(s) === member.key) return s;
    return null;
  }
  function publicSlot(m, idx, room) {
    const team = idx === 0 ? 'blue' : 'red';
    if (!m) return { idx, team, kind: 'empty' };
    return { idx, team, kind: m.bot ? 'bot' : 'player', handle: m.handle, name: m.name || m.handle, el: m.el || null, chibi: m.chibi || null,
      ready: m.bot || idx === 0 ? true : !!m.ready, connected: m.bot ? true : !!m.connected, host: m.key === room.hostKey };
  }
  function publicRoom(room) {
    const slots = room.slots.map((m, i) => publicSlot(m, i, room));
    const host = room.slots.find(m => m && m.key === room.hostKey);
    return { id: room.id, code: room.code, mode: room.mode, mapId: room.mapId, state: room.state, quick: room.quick,
      host: host ? host.handle : null, players: slots.filter(s => s.kind !== 'empty').length, max: room.slots.length, slots,
      matchId: room.match ? room.match.id : null };
  }
  function lobbyRow(room) {
    const p = publicRoom(room);
    return { id: p.id, code: p.code, mode: p.mode, mapId: p.mapId, state: p.state, host: p.host, players: p.players, max: p.max };
  }

  function lobbyFor(socket) {
    const list = [...rooms.values()].filter(r => !r.quick && (r.state === 'waiting' || r.state === 'playing')).sort((a, b) => b.createdAt - a.createdAt).slice(0, 40).map(lobbyRow);
    const friends = Array.isArray(socket.pvpFriends) ? socket.pvpFriends : [];
    const onlineSet = new Set();
    for (const s of WS_CLIENTS || []) if (live(s) && handleOf(s)) onlineSet.add(handleOf(s));
    const me = handleOf(socket);
    return { type: 'pvp_lobby', rooms: list, online: friends.filter(h => h !== me && onlineSet.has(h)) };
  }
  function lobbyChanged() { for (const s of [...lobbySubs]) { if (!live(s)) { lobbySubs.delete(s); continue; } send(s, lobbyFor(s)); } }

  function roomOf(key) { const id = memberRoom.get(key); return id ? rooms.get(id) || null : null; }
  function memberOf(room, key) { return room ? room.slots.find(m => m && !m.bot && m.key === key) || null : null; }
  function sendRoom(room, extra = {}) {
    const pub = publicRoom(room);
    for (const m of humanMembers(room)) send(socketOf(m), { type: 'pvp_room', room: pub, you: m.handle, ...extra });
  }
  function touch(room) { room.touchedAt = now(); }

  function closeRoom(room, reason) {
    if (!rooms.has(room.id)) return;
    if (room.match && room.match.disconnectTimer) clearTimeout(room.match.disconnectTimer);
    for (const m of humanMembers(room)) {
      if (memberRoom.get(m.key) === room.id) memberRoom.delete(m.key);
      send(socketOf(m), { type: 'pvp_room_closed', roomId: room.id, reason });
    }
    rooms.delete(room.id); codes.delete(room.code);
    lobbyChanged();
  }

  function createRoom(hostMember, opts = {}) {
    const room = {
      id: 'pr_' + hex(8), code: newCode(), mode: '1v1', mapId: validMap(opts.mapId) || 'steppe_canyon',
      quick: !!opts.quick, state: 'waiting', hostKey: hostMember.key, slots: [hostMember, null],
      createdAt: now(), touchedAt: now(), match: null, rematch: new Set(), lastLoser: null,
    };
    hostMember.ready = true;
    rooms.set(room.id, room); codes.set(room.code, room.id); memberRoom.set(hostMember.key, room.id);
    return room;
  }

  // Oyuncuyu odadan çıkar. Maç sürüyorsa önce sonuç yazılır.
  function removeMember(room, key, reason = 'leave') {
    const idx = room.slots.findIndex(m => m && !m.bot && m.key === key);
    if (idx < 0) return;
    const leaver = room.slots[idx];
    if (room.state === 'playing' && room.match && !room.match.ended) {
      const other = humanMembers(room).find(m => m.key !== key);
      if (other) {
        // Rakip zaten kopuksa "Beklemeden çık" diyen kalan oyuncu hükmen kazanır; yoksa ayrılan hükmen kaybeder.
        const winner = other.connected ? other : leaver;
        endMatch(room, winner.key, other.connected ? (reason === 'disconnect' ? 'disconnect' : 'forfeit') : 'disconnect');
      } else endMatch(room, null, reason);
    }
    room.slots[idx] = null;
    if (memberRoom.get(key) === room.id) memberRoom.delete(key);
    room.rematch.delete(key);
    if (!humanMembers(room).length) { closeRoom(room, 'empty'); return leaver; }
    if (room.hostKey === key) {
      // Kurucu ayrıldı: kalan oyuncu kurucu olur ve mavi yuvaya geçer; bot yuvası boşalır.
      const next = humanMembers(room)[0];
      room.slots = [next, null];
      room.hostKey = next.key; next.ready = true;
    }
    if (room.state === 'ended' || room.quick) room.state = room.quick ? 'ended' : 'waiting';
    touch(room);
    sendRoom(room, { notice: { kind: 'left', handle: leaver.handle } });
    lobbyChanged();
    return leaver;
  }

  function leaveCurrent(socket, reason = 'leave') {
    const key = keyOf(socket);
    const room = roomOf(key);
    if (!room) return false;
    removeMember(room, key, reason);
    send(socket, { type: 'pvp_room_left', roomId: room.id, reason });
    return true;
  }

  function startMatch(room) {
    const humans = humanMembers(room);
    const order = room.slots.filter(Boolean);
    let first = pick(humans);
    if (room.lastLoser && humans.some(h => h.key === room.lastLoser)) first = humans.find(h => h.key === room.lastLoser); // rövanşta kaybeden başlar
    room.match = { id: 'pm_' + hex(8), seed: 1 + Math.floor(random() * 2147483646), firstTurn: first.handle, startedAt: now(), ended: false, disconnectTimer: null };
    room.state = 'playing'; room.rematch.clear();
    for (const m of humans) if (m.key !== room.hostKey) m.ready = false;
    touch(room);
    const pub = publicRoom(room);
    for (const m of humans) {
      send(socketOf(m), { type: 'pvp_match_start', roomId: room.id, matchId: room.match.id, mapId: room.mapId, mode: room.mode,
        seed: room.match.seed, firstTurn: room.match.firstTurn, slots: pub.slots, room: pub, you: m.handle,
        rival: (order.find(x => x.key !== m.key) || {}).handle || null, quick: room.quick });
    }
    lobbyChanged();
  }

  function endMatch(room, winnerKey, reason) {
    const match = room.match;
    if (!match || match.ended) return;
    match.ended = true;
    if (match.disconnectTimer) { clearTimeout(match.disconnectTimer); match.disconnectTimer = null; }
    const humans = humanMembers(room);
    const winner = humans.find(m => m.key === winnerKey) || null;
    const loser = humans.find(m => m.key !== winnerKey) || null;
    room.lastLoser = loser ? loser.key : null;
    room.state = 'ended'; room.endedAt = now(); touch(room);
    for (const m of humans) {
      send(socketOf(m), { type: 'pvp_match_end', roomId: room.id, matchId: match.id, winner: winner ? winner.handle : null, loser: loser ? loser.handle : null, reason, you: m.handle });
    }
    lobbyChanged();
  }

  /* ---------------- hızlı savaş kuyruğu ---------------- */
  function queueIndex(key) { return queue.findIndex(e => e.key === key); }
  function pendingOf(key) { for (const p of pending.values()) if (p.entries.some(e => e.key === key)) return p; return null; }
  function clearSlow(e) { if (e.slowTimer) { clearTimeout(e.slowTimer); e.slowTimer = null; } }
  function armSlow(e) {
    clearSlow(e);
    if (e.slowSent) return;
    const left = Math.max(0, QUEUE_SLOW_MS - (now() - e.since));
    e.slowTimer = setTimeout(() => {
      e.slowTimer = null;
      if (queueIndex(e.key) < 0) return;
      e.slowSent = true;
      send(e.socket, { type: 'pvp_queue_state', status: 'searching', slow: true, since: e.since, mode: e.mode });
    }, left);
    if (e.slowTimer.unref) e.slowTimer.unref();
  }
  function dequeue(key) { const i = queueIndex(key); if (i < 0) return null; const [e] = queue.splice(i, 1); clearSlow(e); return e; }

  function tryPair() {
    while (queue.length >= 2) {
      const a = queue[0];
      const bIdx = queue.findIndex((e, i) => i > 0 && e.key !== a.key && e.mode === a.mode);
      if (bIdx < 0) return;
      const b = queue[bIdx];
      dequeue(a.key); dequeue(b.key);
      if (!live(a.socket) || !live(b.socket)) { if (live(a.socket)) requeue(a, true); if (live(b.socket)) requeue(b, true); continue; }
      const p = { id: 'pq_' + hex(6), entries: [a, b], ready: new Set(), mapId: pick(PVP_MAP_IDS), mode: a.mode };
      p.timer = setTimeout(() => expirePending(p), READY_MS);
      if (p.timer.unref) p.timer.unref();
      pending.set(p.id, p);
      for (const e of p.entries) {
        const other = p.entries.find(x => x !== e);
        send(e.socket, { type: 'pvp_queue_found', matchKey: p.id, opponent: other.handle, mapId: p.mapId, mode: p.mode, readyMs: READY_MS });
      }
    }
  }
  function requeue(e, front) {
    if (queueIndex(e.key) >= 0) return;
    if (front) queue.unshift(e); else queue.push(e);
    armSlow(e);
    send(e.socket, { type: 'pvp_queue_state', status: 'searching', requeued: true, since: e.since, mode: e.mode, slow: !!e.slowSent });
  }
  function expirePending(p, decliner = null) {
    if (!pending.has(p.id)) return;
    pending.delete(p.id); clearTimeout(p.timer);
    for (const e of p.entries) {
      if (e.key === decliner) continue; // kendisi çıktı
      // Süre doldu: "Hazırım" diyen kuyruğa geri döner, demeyen düşer. Karşı taraf iptal ettiyse kalan aramaya devam eder.
      if ((decliner || p.ready.has(e.key)) && live(e.socket)) requeue(e, true);
      else send(e.socket, { type: 'pvp_queue_state', status: 'dropped', mode: e.mode });
    }
    tryPair();
  }
  function queueJoin(socket, msg) {
    const mode = msg.mode === '2v2' ? '2v2' : '1v1';
    if (mode !== '1v1') return error(socket, 'mode_soon');
    const key = keyOf(socket);
    if (roomOf(key)) leaveCurrent(socket, 'leave');
    const pend = pendingOf(key);
    if (pend) return; // zaten eşleşme kartında
    const old = dequeue(key);
    const e = { key, socket, handle: handleOf(socket), mode, since: old ? old.since : now(), slowSent: old ? old.slowSent : false,
      chibi: msg.chibi && typeof msg.chibi === 'object' ? msg.chibi : null, el: typeof msg.el === 'string' ? msg.el.slice(0, 16) : null };
    queue.push(e); armSlow(e);
    send(socket, { type: 'pvp_queue_state', status: 'searching', since: e.since, mode });
    tryPair();
  }
  function queueLeave(socket) {
    const key = keyOf(socket);
    dequeue(key);
    const p = pendingOf(key);
    if (p) expirePending(p, key);
    send(socket, { type: 'pvp_queue_state', status: 'idle' });
  }
  function queueReady(socket, msg) {
    const key = keyOf(socket);
    const p = pending.get(String(msg.matchKey || ''));
    if (!p || !p.entries.some(e => e.key === key)) return send(socket, { type: 'pvp_queue_state', status: 'dropped' });
    p.ready.add(key);
    // Kart hangi soketten geldiyse ona bağla (aynı hesap sekme değiştirmiş olabilir).
    p.entries.forEach(e => { if (e.key === key) e.socket = socket; });
    const other = p.entries.find(e => e.key !== key);
    send(other.socket, { type: 'pvp_queue_peer_ready', matchKey: p.id, handle: handleOf(socket) });
    if (p.ready.size < 2) return;
    pending.delete(p.id); clearTimeout(p.timer);
    const [a, b] = p.entries;
    const ma = memberFrom(a.socket, a), mb = memberFrom(b.socket, b);
    const room = createRoom(ma, { mapId: p.mapId, quick: true });
    room.slots[1] = mb; mb.ready = true; memberRoom.set(mb.key, room.id);
    startMatch(room);
  }

  /* ---------------- oda işlemleri ---------------- */
  function onCreate(socket, msg) {
    if (msg.mode === '2v2') return error(socket, 'mode_soon');
    const key = keyOf(socket);
    dequeue(key);
    if (roomOf(key)) leaveCurrent(socket, 'leave');
    const room = createRoom(memberFrom(socket, msg), { mapId: msg.mapId });
    sendRoom(room, { created: true });
    lobbyChanged();
  }
  function findRoom(msg) {
    if (msg.roomId && rooms.has(String(msg.roomId))) return rooms.get(String(msg.roomId));
    const c = normCode(msg.code);
    if (c && codes.has(c)) return rooms.get(codes.get(c)) || null;
    return null;
  }
  function onJoin(socket, msg) {
    const key = keyOf(socket);
    const room = findRoom(msg);
    if (!room) return error(socket, 'room_not_found');
    const mine = memberOf(room, key);
    if (mine) { mine.socket = socket; mine.connected = true; return sendRoom(room); }
    if (room.state !== 'waiting') return error(socket, 'room_busy');
    const free = room.slots.findIndex(s => !s);
    if (free < 0) return error(socket, 'room_full');
    dequeue(key);
    if (roomOf(key)) leaveCurrent(socket, 'leave');
    const m = memberFrom(socket, msg);
    room.slots[free] = m; memberRoom.set(key, room.id); touch(room);
    sendRoom(room, { notice: { kind: 'joined', handle: m.handle } });
    lobbyChanged();
  }
  function withRoom(socket, fn, { host = false, state = null, quiet = false } = {}) {
    const key = keyOf(socket);
    const room = roomOf(key);
    if (!room) return quiet ? null : error(socket, 'not_in_room');
    if (host && room.hostKey !== key) return error(socket, 'host_only');
    if (state && room.state !== state) return quiet ? null : error(socket, 'room_busy');
    return fn(room, memberOf(room, key));
  }
  function onReady(socket, msg) {
    withRoom(socket, (room, me) => { me.ready = me.key === room.hostKey ? true : !!msg.ready; touch(room); sendRoom(room); }, { state: 'waiting' });
  }
  function onMap(socket, msg) {
    withRoom(socket, room => { const id = validMap(msg.mapId); if (!id) return; room.mapId = id; touch(room); sendRoom(room); lobbyChanged(); }, { host: true, state: 'waiting' });
  }
  function onBot(socket, msg) {
    withRoom(socket, room => {
      if (msg.add === false) { if (room.slots[1] && room.slots[1].bot) room.slots[1] = null; }
      else if (!room.slots[1]) { const b = BOT_POOL[Math.floor(random() * BOT_POOL.length) % BOT_POOL.length]; room.slots[1] = { key: 'bot:' + b.handle, handle: b.handle, name: b.name, el: b.el, bot: true, ready: true, connected: true }; }
      touch(room); sendRoom(room); lobbyChanged();
    }, { host: true, state: 'waiting' });
  }
  function onKick(socket, msg) {
    withRoom(socket, room => {
      const idx = Number(msg.slot);
      const m = room.slots[idx];
      if (!m || idx === 0) return;
      if (m.bot) { room.slots[idx] = null; touch(room); sendRoom(room); lobbyChanged(); return; }
      const s = socketOf(m);
      removeMember(room, m.key, 'kicked');
      send(s, { type: 'pvp_room_left', roomId: room.id, reason: 'kicked' });
    }, { host: true, state: 'waiting' });
  }
  function onStart(socket) {
    withRoom(socket, room => {
      if (room.slots.some(s => !s)) return error(socket, 'slots_empty');
      if (room.slots.some((m, i) => i > 0 && !m.bot && !m.ready)) return error(socket, 'not_ready');
      if (room.slots.some(m => m.bot)) {
        // Prova: bot yalnız kurucunun ekranında oynar; oda bekleme durumunda kalır, sonuç ve ödül yok.
        const pub = publicRoom(room);
        send(socket, { type: 'pvp_match_start', roomId: room.id, matchId: null, practice: true, bot: true, mapId: room.mapId, mode: room.mode,
          seed: 1 + Math.floor(random() * 2147483646), firstTurn: handleOf(socket), slots: pub.slots, room: pub, you: handleOf(socket), rival: room.slots[1].handle });
        return;
      }
      startMatch(room);
    }, { host: true, state: 'waiting' });
  }
  function onInvite(socket, msg) {
    const to = String(msg.to || '').trim();
    const me = handleOf(socket);
    if (!/^@[^\s]{2,40}$/.test(to) || to === me) return error(socket, 'invalid_target');
    withRoom(socket, room => {
      const targets = [...(WS_CLIENTS || [])].filter(s => live(s) && handleOf(s) === to && keyOf(s) !== keyOf(socket));
      if (!targets.length) return error(socket, 'friend_offline', { to });
      for (const t of targets) send(t, { type: 'pvp_invite', roomId: room.id, code: room.code, from: me, mapId: room.mapId, mode: room.mode, ts: now() });
      send(socket, { type: 'pvp_invite_sent', to, roomId: room.id });
    }, { state: 'waiting' });
  }
  function onInviteReply(socket, msg) {
    const room = rooms.get(String(msg.roomId || ''));
    if (!room || msg.accept) return;
    const host = room.slots.find(m => m && m.key === room.hostKey);
    send(socketOf(host), { type: 'pvp_invite_declined', roomId: room.id, from: handleOf(socket) });
  }
  function onResult(socket, msg) {
    withRoom(socket, (room, me) => {
      if (!room.match || room.match.ended || (msg.matchId && msg.matchId !== room.match.id)) return error(socket, 'match_not_found');
      if (msg.result !== 'lose') return;
      const other = humanMembers(room).find(m => m.key !== me.key);
      endMatch(room, other ? other.key : null, 'ko');
    }, { state: 'playing', quiet: true });
  }
  function onRematch(socket) {
    withRoom(socket, (room, me) => {
      const humans = humanMembers(room);
      room.rematch.add(me.key); touch(room);
      if (humans.length === room.slots.length && humans.every(m => m.connected && room.rematch.has(m.key))) return startMatch(room);
      for (const m of humans) if (m.key !== me.key) send(socketOf(m), { type: 'pvp_rematch_pending', roomId: room.id, from: me.handle });
      send(socket, { type: 'pvp_rematch_pending', roomId: room.id, from: me.handle, self: true, peerPresent: humans.length === room.slots.length });
    }, { state: 'ended', quiet: true });
  }
  function onSync(socket, msg) {
    const key = keyOf(socket);
    const room = roomOf(key);
    if (!room || room.state !== 'playing' || !room.match || room.match.ended) return;
    const out = { type: 'pvp_sync', from: handleOf(socket), roomId: room.id, matchId: room.match.id, ts: now() };
    for (const f of SYNC_FIELDS) if (msg[f] !== undefined) out[f] = msg[f];
    for (const m of humanMembers(room)) if (m.key !== key && m.connected) send(socketOf(m), out);
  }

  function onMessage(socket, msg) {
    if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('pvp_')) return false;
    // ENG-14: PvE sefer daveti eski yoldan (server.js) gider; PvP ile ilgisi yok.
    if (msg.type === 'pvp_sync' && msg.action === 'invite' && msg.raidId && !msg.roomId) return false;
    if (!keyOf(socket)) return true;
    switch (msg.type) {
      case 'pvp_sync': onSync(socket, msg); break;
      case 'pvp_lobby_sub':
        socket.pvpFriends = Array.isArray(msg.friends) ? msg.friends.filter(h => typeof h === 'string').slice(0, 100) : [];
        lobbySubs.add(socket); send(socket, lobbyFor(socket));
        { const room = roomOf(keyOf(socket)); if (room) send(socket, { type: 'pvp_room', room: publicRoom(room), you: handleOf(socket) }); }
        break;
      case 'pvp_lobby_unsub': lobbySubs.delete(socket); break;
      case 'pvp_room_create': onCreate(socket, msg); break;
      case 'pvp_room_join': onJoin(socket, msg); break;
      case 'pvp_room_leave': if (!leaveCurrent(socket, 'leave')) send(socket, { type: 'pvp_room_left', roomId: null, reason: 'leave' }); break;
      case 'pvp_room_ready': onReady(socket, msg); break;
      case 'pvp_room_map': onMap(socket, msg); break;
      case 'pvp_room_bot': onBot(socket, msg); break;
      case 'pvp_room_kick': onKick(socket, msg); break;
      case 'pvp_room_start': onStart(socket); break;
      case 'pvp_room_invite': onInvite(socket, msg); break;
      case 'pvp_invite_reply': onInviteReply(socket, msg); break;
      case 'pvp_match_result': onResult(socket, msg); break;
      case 'pvp_rematch': onRematch(socket); break;
      case 'pvp_queue_join': queueJoin(socket, msg); break;
      case 'pvp_queue_leave': queueLeave(socket); break;
      case 'pvp_queue_ready': queueReady(socket, msg); break;
      default: break;
    }
    return true;
  }

  function onDisconnect(socket) {
    if (!socket || socket.__pvpGone) return;
    socket.__pvpGone = true;
    lobbySubs.delete(socket);
    const key = keyOf(socket);
    if (!key) return;
    const qe = queue.find(e => e.key === key);
    if (qe && qe.socket === socket) dequeue(key);
    const p = pendingOf(key);
    if (p && p.entries.find(e => e.key === key).socket === socket) expirePending(p, key);
    const room = roomOf(key);
    const m = memberOf(room, key);
    if (!m || (m.socket !== socket && live(socketOf(m)))) return;
    if (room.state === 'playing' && room.match && !room.match.ended) {
      m.connected = false;
      const grace = DISCONNECT_GRACE;
      for (const o of humanMembers(room)) if (o.key !== key) send(socketOf(o), { type: 'pvp_peer_left', roomId: room.id, matchId: room.match.id, handle: m.handle, graceMs: grace });
      if (room.match.disconnectTimer) clearTimeout(room.match.disconnectTimer);
      room.match.disconnectTimer = setTimeout(() => {
        room.match.disconnectTimer = null;
        if (m.connected || room.match.ended) return;
        const other = humanMembers(room).find(o => o.key !== key);
        endMatch(room, other ? other.key : null, 'disconnect');
        removeMember(room, key, 'disconnect');
      }, grace);
      if (room.match.disconnectTimer.unref) room.match.disconnectTimer.unref();
      touch(room);
      return;
    }
    removeMember(room, key, 'disconnect');
  }

  function onConnect(socket) {
    const key = keyOf(socket);
    const room = roomOf(key);
    const m = memberOf(room, key);
    if (!m || m.connected) return;
    m.socket = socket; m.connected = true; touch(room);
    if (room.match && room.match.disconnectTimer) { clearTimeout(room.match.disconnectTimer); room.match.disconnectTimer = null; }
    send(socket, { type: 'pvp_match_resume', roomId: room.id, matchId: room.match && room.match.id, room: publicRoom(room), you: m.handle, state: room.state });
    for (const o of humanMembers(room)) if (o.key !== key) send(socketOf(o), { type: 'pvp_peer_back', roomId: room.id, handle: m.handle });
  }

  function sweep() {
    const t = now();
    for (const room of [...rooms.values()]) {
      if (room.state === 'waiting' && t - room.touchedAt > IDLE_ROOM_MS) closeRoom(room, 'idle');
      else if (room.state === 'ended' && t - room.touchedAt > ENDED_ROOM_MS) closeRoom(room, 'idle');
    }
  }
  const sweeper = setInterval(sweep, SWEEP_MS);
  if (sweeper.unref) sweeper.unref();

  function stop() {
    clearInterval(sweeper);
    for (const room of rooms.values()) if (room.match && room.match.disconnectTimer) clearTimeout(room.match.disconnectTimer);
    for (const p of pending.values()) clearTimeout(p.timer);
    for (const e of queue) clearSlow(e);
  }

  return { onMessage, onConnect, onDisconnect, sweep, stop, _debug: { rooms, queue, pending, codes, memberRoom } };
}

module.exports = { createPvpRooms, PVP_MAP_IDS };
