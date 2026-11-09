/* ============================================================================
   ENG-14 · TOPÇU PVP ODALARI: LOBİ, BEKLEME ODASI, HIZLI SAVAŞ, DAVET, MAÇ SONU
   (js/minigame/shm_pvp_rooms.js)
   Sunucu: server/pvp_rooms.js. Odalar ve kuyruk sunucudadır; bu dosya yalnız gösterir ve komut yollar.
   Ödül/altın/ün/sıralama YOK. İlk sürüm yalnız 1v1 (2v2 "Yakında").
   ============================================================================ */

const PVPR = {
  lobby: { rooms: [], online: [] },
  room: null,          // sunucunun yolladığı oda (publicRoom)
  you: null,
  queue: null,         // { status, since, slow, found: { matchKey, opponent, mapId, deadline, readySent, peerReady } }
  invites: [],         // gelen davetler
  subscribed: false,
  newMap: "steppe_canyon",
  codeDraft: "",
  inviteDraft: "",
  inviteOpen: false,
  ticker: null
};

function pvprEsc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function pvprMe() { return PVPR.you || (typeof S !== "undefined" && S && S.handle) || "@ejder_ocagi"; }
function pvprMapName(id, short) {
  const m = (typeof PVP_ARENA_MAPS !== "undefined" && PVP_ARENA_MAPS[id]) || null;
  return m ? (short ? (m.shortName || m.name) : m.name) : id;
}
function pvprSend(type, payload = {}) {
  if (typeof mpSendWs !== "function") return false;
  if (typeof MP !== "undefined" && !(MP.ws && MP.ws.readyState === 1)) {
    if (typeof toast === "function") toast("Sunucu bağlantısı yok. Birkaç saniye sonra tekrar dene.", "bad");
    return false;
  }
  mpSendWs(Object.assign({ type }, payload));
  return true;
}
function pvprMyLook() {
  const baby = (typeof getEternalBabyDragon === "function" && getEternalBabyDragon()) || null;
  let chibi = null;
  try { chibi = typeof ensureChibi === "function" ? ensureChibi() : null; } catch (e) { chibi = null; }
  return { chibi, el: (baby && baby.el) || "ates" };
}
function pvprFriends() {
  try { return (typeof ensureSocial === "function" ? ensureSocial().friends : []).map(f => f.handle).slice(0, 100); } catch (e) { return []; }
}
function pvprSubscribe(force) {
  if (PVPR.subscribed && !force) return;
  if (typeof MP === "undefined" || !(MP.ws && MP.ws.readyState === 1)) return;
  PVPR.subscribed = true;
  mpSendWs({ type: "pvp_lobby_sub", friends: pvprFriends() });
}
function pvprUnsubscribe() {
  if (!PVPR.subscribed) return;
  PVPR.subscribed = false;
  if (typeof MP !== "undefined" && MP.ws && MP.ws.readyState === 1) mpSendWs({ type: "pvp_lobby_unsub" });
}

// Yeniden çizim: odaklı metin kutusunun değerini ve imleci korur (lobi güncellemesi yazmayı bozmasın).
function pvprRerender(screens) {
  if (typeof SHM === "undefined" || !SHM.open) return;
  if (screens && !screens.includes(SHM.screen)) return;
  const ae = typeof document !== "undefined" ? document.activeElement : null;
  const id = ae && ae.id && ae.tagName === "INPUT" ? ae.id : null;
  const pos = id ? ae.selectionStart : null;
  renderSahmeranApp();
  if (id) {
    const el = document.getElementById(id);
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} }
  }
}

/* ---------------- ağ mesajları (net.js → onPvpNetMessage) ---------------- */
function onPvpNetMessage(msg) {
  if (!msg || typeof msg.type !== "string") return;
  switch (msg.type) {
    case "pvp_lobby":
      PVPR.lobby = { rooms: Array.isArray(msg.rooms) ? msg.rooms : [], online: Array.isArray(msg.online) ? msg.online : [] };
      pvprRerender(["pvp_lobby"]);
      break;
    case "pvp_room": {
      const prev = PVPR.room;
      PVPR.room = msg.room || null;
      PVPR.you = msg.you || PVPR.you;
      if (msg.created && typeof toast === "function") toast(`Oda kuruldu: <b>${pvprEsc(msg.room.code)}</b>. Kodu arkadaşına ver ya da davet et.`, "goal");
      if (msg.notice && msg.notice.handle !== pvprMe() && typeof toast === "function") {
        toast(msg.notice.kind === "joined" ? `<b>${pvprEsc(msg.notice.handle)}</b> odaya katıldı.` : `<b>${pvprEsc(msg.notice.handle)}</b> odadan ayrıldı.`, msg.notice.kind === "joined" ? "goal" : "bad");
      }
      if (SHM.pvpResult && SHM.pvpResult.live && msg.notice && msg.notice.kind === "left") { SHM.pvpResult.peerGone = true; SHM.pvpResult.rematchFrom = null; }
      if (!prev && PVPR.room && SHM.open && SHM.screen !== "battle") { SHM.screen = "pvp_lobby"; SHM.gameMode = "pvp"; SHM.entryContext = "pvp_arena"; }
      pvprRerender(["pvp_lobby", "pvp_result"]);
      break;
    }
    case "pvp_room_left":
    case "pvp_room_closed":
      if (!PVPR.room || !msg.roomId || PVPR.room.id === msg.roomId) PVPR.room = null;
      PVPR.inviteOpen = false;
      if (typeof toast === "function") {
        if (msg.reason === "kicked") toast("Oda kurucusu seni odadan çıkardı.", "bad");
        else if (msg.reason === "idle") toast("Oda uzun süre boş kaldığı için kapandı.", "bad");
      }
      pvprRerender(["pvp_lobby"]);
      break;
    case "pvp_error":
      if (typeof toast === "function") toast(pvprEsc(msg.message || "İşlem yapılamadı."), "bad");
      break;
    case "pvp_invite":
      PVPR.invites = PVPR.invites.filter(i => i.roomId !== msg.roomId).concat([{ roomId: msg.roomId, code: msg.code, from: msg.from, mapId: msg.mapId, mode: msg.mode, ts: Date.now() }]).slice(-3);
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("bell");
      pvprRenderInviteCard();
      break;
    case "pvp_invite_sent":
      if (typeof toast === "function") toast(`Davet gönderildi: <b>${pvprEsc(msg.to)}</b>`, "goal");
      break;
    case "pvp_invite_declined":
      if (typeof toast === "function") toast(`<b>${pvprEsc(msg.from)}</b> daveti reddetti.`, "bad");
      break;
    case "pvp_queue_state":
      if (msg.status === "idle") PVPR.queue = null;
      else if (msg.status === "dropped") {
        PVPR.queue = null;
        if (typeof toast === "function") toast("Eşleşme onaylanmadı, arama durdu. Tekrar \"Rakip bul\" diyebilirsin.", "bad");
      } else {
        PVPR.queue = { status: "searching", since: (PVPR.queue && PVPR.queue.since) || Date.now(), mode: msg.mode || "1v1", slow: !!msg.slow || !!(PVPR.queue && PVPR.queue.slow), found: null };
        if (msg.requeued && typeof toast === "function") toast("Rakip onaylamadı. Aramaya devam ediliyor.", "goal");
      }
      pvprRerender(["pvp_lobby"]);
      break;
    case "pvp_queue_found":
      PVPR.queue = Object.assign({}, PVPR.queue || { status: "searching", since: Date.now(), mode: "1v1" }, {
        found: { matchKey: msg.matchKey, opponent: msg.opponent, mapId: msg.mapId, deadline: Date.now() + (msg.readyMs || 5000), readySent: false, peerReady: false }
      });
      if (typeof SFX !== "undefined" && SFX.play) SFX.play("bell");
      pvprRerender(["pvp_lobby"]);
      break;
    case "pvp_queue_peer_ready":
      if (PVPR.queue && PVPR.queue.found && PVPR.queue.found.matchKey === msg.matchKey) PVPR.queue.found.peerReady = true;
      pvprRerender(["pvp_lobby"]);
      break;
    case "pvp_match_start":
      pvprOnMatchStart(msg);
      break;
    case "pvp_match_end":
      pvprHidePeerOverlay();
      if (typeof pvpOnMatchEnd === "function") pvpOnMatchEnd(msg);
      break;
    case "pvp_peer_left":
      if (typeof pvpOnPeerLeft === "function") pvpOnPeerLeft(msg);
      break;
    case "pvp_peer_back":
      if (typeof pvpOnPeerBack === "function") pvpOnPeerBack(msg);
      break;
    case "pvp_match_resume": {
      PVPR.room = msg.room || PVPR.room;
      const L = SHM.pvpLive;
      if (msg.state === "playing" && !(L && L.matchId === msg.matchId && !L.ended && SHM.screen === "battle")) {
        // Sayfa yenilendi, maç durumu kayboldu: dürüst çıkış (hükmen), rakip beklemesin.
        pvprSend("pvp_room_leave");
        if (typeof toast === "function") toast("Bağlantı koptuğu için maç devam ettirilemedi; maçtan çıkıldı.", "bad");
      }
      break;
    }
    case "pvp_rematch_pending":
      if (SHM.pvpResult && SHM.pvpResult.live) {
        if (msg.self) SHM.pvpResult.rematchSent = true;
        else { SHM.pvpResult.rematchFrom = msg.from; if (typeof toast === "function") toast(`<b>${pvprEsc(msg.from)}</b> rövanş istiyor.`, "goal"); }
        pvprRerender(["pvp_result"]);
      }
      break;
    default: break;
  }
}

function pvprOnMatchStart(msg) {
  PVPR.queue = null;
  PVPR.inviteOpen = false;
  if (msg.room) PVPR.room = msg.room;
  if (typeof SHM === "undefined") return;
  if (!SHM.open && typeof openAnimTestRoom === "function") openAnimTestRoom({ screen: "pvp_lobby", forceUnlock: true });
  if (msg.practice) {
    const bot = (msg.slots || []).find(s => s.kind === "bot") || {};
    pvpLaunchMatch(msg.mapId, "1v1", { practice: { rival: { handle: bot.handle, name: bot.name, el: bot.el } } });
    return;
  }
  pvpLaunchMatch(msg.mapId, "1v1", { live: pvpLiveFromStart(msg) });
}

function pvprOnReconnect() {
  // WS yeniden bağlandı: lobi aboneliği yenilenir.
  if (typeof SHM !== "undefined" && SHM.open && (SHM.screen === "pvp_lobby" || SHM.screen === "pvp_result")) pvprSubscribe(true);
  else PVPR.subscribed = false;
}

/* ---------------- komutlar ---------------- */
const PVPR_ACTS = {
  "quick"() {
    if (PVPR.room) { if (typeof toast === "function") toast("Önce odadan çık, sonra hızlı savaşa gir.", "bad"); return; }
    const look = pvprMyLook();
    if (pvprSend("pvp_queue_join", { mode: "1v1", chibi: look.chibi, el: look.el })) {
      PVPR.queue = { status: "searching", since: Date.now(), mode: "1v1", slow: false, found: null };
      pvprRerender();
    }
  },
  "quick-2v2"() { if (typeof toast === "function") toast("2v2 yakında. Şimdilik 1v1 oynayabilirsin.", "goal"); },
  "queue-cancel"() { pvprSend("pvp_queue_leave"); PVPR.queue = null; pvprRerender(); },
  "queue-ready"() {
    const f = PVPR.queue && PVPR.queue.found;
    if (!f || f.readySent) return;
    f.readySent = true;
    pvprSend("pvp_queue_ready", { matchKey: f.matchKey });
    pvprRerender();
  },
  "create"() {
    const look = pvprMyLook();
    pvprSend("pvp_room_create", { mode: "1v1", mapId: PVPR.newMap, chibi: look.chibi, el: look.el });
  },
  "new-map"(el) { PVPR.newMap = el.getAttribute("data-map") || "steppe_canyon"; pvprRerender(); },
  "join"(el) {
    const look = pvprMyLook();
    pvprSend("pvp_room_join", { roomId: el.getAttribute("data-room"), chibi: look.chibi, el: look.el });
  },
  "join-code"() {
    const inp = document.getElementById("pvprCodeInput");
    const code = ((inp && inp.value) || PVPR.codeDraft || "").trim();
    if (!code) { if (typeof toast === "function") toast("Oda kodunu yaz (ör. EJD-7KX).", "bad"); return; }
    const look = pvprMyLook();
    pvprSend("pvp_room_join", { code, chibi: look.chibi, el: look.el });
  },
  "leave"() {
    pvprSend("pvp_room_leave");
    PVPR.room = null; PVPR.inviteOpen = false;
    if (SHM.pvpLive) SHM.pvpLive = null;
    SHM.pvpResult = null;
    SHM.screen = "pvp_lobby";
    pvprRerender();
  },
  "ready"() {
    const me = pvprMySlot();
    pvprSend("pvp_room_ready", { ready: !(me && me.ready) });
  },
  "start"() { pvprSend("pvp_room_start"); },
  "room-map"(el) { pvprSend("pvp_room_map", { mapId: el.getAttribute("data-map") }); },
  "bot-add"() { pvprSend("pvp_room_bot", { add: true }); },
  "bot-remove"() { pvprSend("pvp_room_bot", { add: false }); },
  "kick"(el) { pvprSend("pvp_room_kick", { slot: Number(el.getAttribute("data-slot")) }); },
  "copy-code"() {
    const code = PVPR.room && PVPR.room.code;
    if (!code) return;
    const done = () => { if (typeof toast === "function") toast(`Kod kopyalandı: <b>${pvprEsc(code)}</b>`, "goal"); };
    try { navigator.clipboard.writeText(code).then(done, done); } catch (e) { done(); }
  },
  "invite-toggle"() { PVPR.inviteOpen = !PVPR.inviteOpen; pvprRerender(); },
  "invite"(el) { pvprInvite(el.getAttribute("data-h")); },
  "invite-typed"() {
    const inp = document.getElementById("pvprInviteInput");
    let h = ((inp && inp.value) || PVPR.inviteDraft || "").trim();
    if (!h) return;
    if (h[0] !== "@") h = "@" + h;
    PVPR.inviteDraft = "";
    pvprInvite(h.toLowerCase());
  },
  "friend-invite"(el) {
    // Lobiden arkadaşa dokun: oda yoksa önce oda kurulur, sonra davet gider.
    const h = el.getAttribute("data-h");
    if (PVPR.room) { pvprInvite(h); return; }
    PVPR.pendingInviteTo = h;
    PVPR_ACTS.create();
  },
  "invite-accept"(el) {
    const id = el.getAttribute("data-room");
    const inv = PVPR.invites.find(i => i.roomId === id);
    PVPR.invites = PVPR.invites.filter(i => i.roomId !== id);
    pvprRenderInviteCard();
    if (!inv) return;
    if (typeof SHM !== "undefined" && SHM.open && SHM.screen === "battle" && pvpIsLive()) {
      if (typeof toast === "function") toast("Maç sürerken başka odaya geçilemez.", "bad");
      return;
    }
    if (PVPR.queue) { pvprSend("pvp_queue_leave"); PVPR.queue = null; }
    if (typeof SHM !== "undefined") {
      if (!SHM.open && typeof openAnimTestRoom === "function") openAnimTestRoom({ screen: "pvp_lobby", forceUnlock: true });
      SHM.screen = "pvp_lobby"; SHM.gameMode = "pvp"; SHM.entryContext = "pvp_arena";
    }
    const look = pvprMyLook();
    pvprSend("pvp_room_join", { roomId: inv.roomId, chibi: look.chibi, el: look.el });
  },
  "invite-decline"(el) {
    const id = el.getAttribute("data-room");
    PVPR.invites = PVPR.invites.filter(i => i.roomId !== id);
    pvprSend("pvp_invite_reply", { roomId: id, accept: false });
    pvprRenderInviteCard();
  },
  "invite-close"(el) {
    const id = el.getAttribute("data-room");
    PVPR.invites = PVPR.invites.filter(i => i.roomId !== id);
    pvprRenderInviteCard();
  },
  "rematch"() { if (pvprSend("pvp_rematch") && SHM.pvpResult) { SHM.pvpResult.rematchSent = true; pvprRerender(); } },
  "again-quick"() {
    pvprSend("pvp_room_leave");
    PVPR.room = null; SHM.pvpLive = null; SHM.pvpResult = null;
    SHM.screen = "pvp_lobby";
    PVPR_ACTS.quick();
    pvprRerender();
  },
  "back-room"() { SHM.pvpResult = null; SHM.pvpPractice = null; SHM.screen = "pvp_lobby"; pvprRerender(); },
  "leave-now"() {
    // Rakip koptu, kalan oyuncu beklemeden çıkar: sunucu kalan oyuncuyu hükmen kazanan yazar.
    pvprSend("pvp_room_leave");
  },
  "forfeit"() { pvprSend("pvp_room_leave"); }
};

function pvprInvite(h) {
  if (!h) return;
  if (!PVPR.room) { PVPR.pendingInviteTo = h; PVPR_ACTS.create(); return; }
  pvprSend("pvp_room_invite", { to: h });
}
if (typeof window !== "undefined") window.pvprInvite = pvprInvite;

function pvprMySlot() {
  const r = PVPR.room;
  return r ? r.slots.find(s => s.handle === pvprMe() && s.kind === "player") || null : null;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", e => {
    const b = e.target && e.target.closest ? e.target.closest("[data-pvpr-act]") : null;
    if (!b || b.disabled) return;
    const fn = PVPR_ACTS[b.getAttribute("data-pvpr-act")];
    if (!fn) return;
    e.preventDefault();
    e.stopPropagation();
    fn(b);
  }, true);
  document.addEventListener("input", e => {
    if (!e.target) return;
    if (e.target.id === "pvprCodeInput") PVPR.codeDraft = e.target.value;
    if (e.target.id === "pvprInviteInput") PVPR.inviteDraft = e.target.value;
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" || !e.target) return;
    if (e.target.id === "pvprCodeInput") PVPR_ACTS["join-code"]();
    if (e.target.id === "pvprInviteInput") PVPR_ACTS["invite-typed"]();
  });
}

/* ---------------- sayaçlar (arama süresi, hazır kartı, kopma) ---------------- */
function pvprTick() {
  if (typeof document === "undefined") return;
  if (PVPR.pendingInviteTo && PVPR.room && PVPR.room.state === "waiting") {
    const h = PVPR.pendingInviteTo; PVPR.pendingInviteTo = null;
    pvprSend("pvp_room_invite", { to: h });
  }
  const q = PVPR.queue;
  const tEl = document.getElementById("pvprQueueTimer");
  if (q && tEl) tEl.textContent = pvprFmt((Date.now() - q.since) / 1000);
  const rEl = document.getElementById("pvprReadyCount");
  if (q && q.found && rEl) rEl.textContent = String(Math.max(0, Math.ceil((q.found.deadline - Date.now()) / 1000)));
  pvprShowPeerOverlay();
}
function pvprFmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
if (typeof window !== "undefined" && !PVPR.ticker) PVPR.ticker = setInterval(pvprTick, 250);

/* ---------------- gelen davet kartı (oyunun her yerinde, üstte) ---------------- */
function pvprRenderInviteCard() {
  if (typeof document === "undefined") return;
  let host = document.getElementById("pvprInviteStack");
  if (!PVPR.invites.length) { if (host) host.remove(); return; }
  if (!host) { host = document.createElement("div"); host.id = "pvprInviteStack"; host.className = "pvpr-invite-stack"; document.body.appendChild(host); }
  host.innerHTML = PVPR.invites.map(i => `
    <div class="pvpr-invite-card" role="alertdialog" aria-label="Topçu daveti">
      <button class="pvpr-x" data-pvpr-act="invite-close" data-room="${pvprEsc(i.roomId)}" aria-label="Kapat">✕</button>
      <div class="pvpr-invite-txt">
        <b class="pvpr-ellipsis">${pvprEsc(i.from)}</b>
        <span>seni Topçu düellosuna çağırıyor</span>
        <small>${pvprEsc(pvprMapName(i.mapId))} · 1v1 · ${pvprEsc(i.code)}</small>
      </div>
      <div class="pvpr-row">
        <button class="pvpr-btn ghost" data-pvpr-act="invite-decline" data-room="${pvprEsc(i.roomId)}">Reddet</button>
        <button class="pvpr-btn primary" data-pvpr-act="invite-accept" data-room="${pvprEsc(i.roomId)}">Kabul et</button>
      </div>
    </div>`).join("");
}

/* ---------------- kopma katmanı (savaş ekranında) ---------------- */
function pvprShowPeerOverlay() {
  if (typeof document === "undefined" || typeof SHM === "undefined") return;
  const L = SHM.pvpLive;
  const want = !!(L && !L.ended && !L.peerConnected && SHM.open && SHM.screen === "battle");
  let el = document.getElementById("pvprPeerOverlay");
  if (!want) { if (el) el.remove(); return; }
  const left = Math.max(0, Math.ceil((L.peerLeftAt + L.graceMs - Date.now()) / 1000));
  if (!el) {
    const root = document.querySelector(".shm-root") || document.body;
    el = document.createElement("div");
    el.id = "pvprPeerOverlay";
    el.className = "pvpr-overlay";
    el.innerHTML = `
      <div class="pvpr-card pvpr-peer-card">
        <div class="pvpr-kicker">Bağlantı koptu</div>
        <h3 class="pvpr-title pvpr-ellipsis">${pvprEsc(L.rival)}</h3>
        <p>Rakibin dönmesi bekleniyor. Dönmezse <b>hükmen sen kazanırsın</b>.</p>
        <div class="pvpr-big" id="pvprPeerCount">${left}</div>
        <button class="pvpr-btn ghost" data-pvpr-act="leave-now">Beklemeden çık (hükmen kazan)</button>
      </div>`;
    root.appendChild(el);
  } else {
    const c = document.getElementById("pvprPeerCount");
    if (c) c.textContent = String(left);
  }
}
function pvprHidePeerOverlay() { const el = typeof document !== "undefined" && document.getElementById("pvprPeerOverlay"); if (el) el.remove(); }
if (typeof window !== "undefined") window.pvprShowPeerOverlay = pvprShowPeerOverlay;

/* ---------------- çizim yardımcıları ---------------- */
function pvprDoll(slot, flip) {
  if (typeof renderChibiDoll !== "function") return "";
  let cfg = slot.chibi || null;
  if (slot.handle === pvprMe() && slot.kind === "player") { try { cfg = ensureChibi(); } catch (e) {} }
  if (!cfg && typeof peerChibiConfig === "function") cfg = peerChibiConfig({ handle: slot.handle, name: slot.name }, slot.idx || 0);
  try { return renderChibiDoll(cfg, { battle: true, hideAura: true, flip: !!flip, el: slot.el || "ates" }); } catch (e) { return ""; }
}
function pvprMapPills(act, cur) {
  return PVP_PRIMARY_MAP_IDS.map(id => `
    <button class="pvpr-pill ${cur === id ? "on" : ""}" data-pvpr-act="${act}" data-map="${id}" aria-pressed="${cur === id}">${pvprEsc(pvprMapName(id, true))}</button>`).join("");
}
function pvprConn() { return typeof MP !== "undefined" && MP.ws && MP.ws.readyState === 1; }

/* ---------------- LOBİ ---------------- */
function renderPvpLobbyScreen() {
  pvprSubscribe();
  const curMap = PVPR.room ? PVPR.room.mapId : PVPR.newMap;
  const mapObj = (typeof PVP_ARENA_MAPS !== "undefined" && (PVP_ARENA_MAPS[curMap] || PVP_ARENA_MAPS.steppe_canyon)) || {};
  const body = PVPR.room && PVPR.room.state !== "playing" ? pvpFormationHtml() : pvprLobbyHtml();
  return `
    <div class="shm-screen-body pvpr-screen" style="background-image:url('${mapObj.bgUrl || ""}')">
      <div class="shm-screen-backdrop"></div>
      ${body}
    </div>`;
}

function pvprLobbyHtml() {
  const q = PVPR.queue;
  const conn = pvprConn();
  let quick;
  if (q && q.found) {
    const f = q.found;
    quick = `
      <div class="pvpr-found" role="alertdialog" aria-label="Rakip bulundu">
        <div class="pvpr-kicker">Rakip bulundu</div>
        <b class="pvpr-ellipsis">${pvprEsc(f.opponent)}</b>
        <small>${pvprEsc(pvprMapName(f.mapId))} · 1v1</small>
        <div class="pvpr-big" id="pvprReadyCount">${Math.max(0, Math.ceil((f.deadline - Date.now()) / 1000))}</div>
        ${f.readySent
          ? `<p class="pvpr-muted">${f.peerReady ? "İkiniz de hazırsınız, maç açılıyor…" : "Rakibin onayı bekleniyor…"}</p>`
          : `<button class="pvpr-btn primary wide" data-pvpr-act="queue-ready">Hazırım</button>`}
        <button class="pvpr-btn ghost" data-pvpr-act="queue-cancel">Vazgeç</button>
      </div>`;
  } else if (q) {
    quick = `
      <div class="pvpr-search">
        <div class="pvpr-spinner" aria-hidden="true"></div>
        <b>Rakip aranıyor… <span id="pvprQueueTimer">${pvprFmt((Date.now() - q.since) / 1000)}</span></b>
        <small>1v1 · harita rastgele</small>
        ${q.slow ? `<div class="pvpr-hint">Rakip bulmak uzun sürüyor. Oda kurup arkadaşını davet edebilirsin.
          <button class="pvpr-btn ghost" data-pvpr-act="queue-cancel">Aramayı bırak</button></div>` : ""}
        <button class="pvpr-btn ghost" data-pvpr-act="queue-cancel">İptal</button>
      </div>`;
  } else {
    quick = `
      <div class="pvpr-tabs" role="tablist">
        <button class="pvpr-tab on" role="tab" aria-selected="true">1v1</button>
        <button class="pvpr-tab" role="tab" aria-selected="false" data-pvpr-act="quick-2v2">2v2 <small>Yakında</small></button>
      </div>
      <p class="pvpr-muted">Harita rastgele seçilir. Rakip bulununca iki tarafa 5 saniyelik "Hazırım" kartı gelir.</p>
      <button class="pvpr-btn primary wide" data-pvpr-act="quick" ${conn ? "" : "disabled"}>Rakip bul</button>`;
  }

  const rooms = PVPR.lobby.rooms || [];
  const roomsHtml = rooms.length ? rooms.map(r => {
    const full = r.players >= r.max || r.state !== "waiting";
    return `
      <li class="pvpr-room">
        <div class="pvpr-room-main">
          <b class="pvpr-ellipsis">${pvprEsc(r.host)}</b>
          <small class="pvpr-ellipsis">${pvprEsc(pvprMapName(r.mapId))} · ${pvprEsc(String(r.mode).toUpperCase())} · ${pvprEsc(r.code)}</small>
        </div>
        <span class="pvpr-count ${full ? "full" : ""}">${r.players}/${r.max}</span>
        ${full ? `<button class="pvpr-btn ghost sm" disabled>${r.state === "playing" ? "Maçta" : "Dolu"}</button>`
               : `<button class="pvpr-btn primary sm" data-pvpr-act="join" data-room="${pvprEsc(r.id)}">Katıl</button>`}
      </li>`;
  }).join("") : `<li class="pvpr-empty">Henüz açık oda yok.<br><b>İlk odayı sen kurabilirsin.</b></li>`;

  const friends = PVPR.lobby.online || [];
  const friendsHtml = friends.length ? friends.map(h => `
      <li><button class="pvpr-friend" data-pvpr-act="friend-invite" data-h="${pvprEsc(h)}"><span class="pvpr-dot"></span><span class="pvpr-ellipsis">${pvprEsc(h)}</span><small>Davet et</small></button></li>`).join("")
    : `<li class="pvpr-empty sm">Çevrimiçi arkadaşın yok. Kodla davet edebilirsin.</li>`;

  return `
    <div class="pvpr-lobby">
      ${conn ? "" : `<div class="pvpr-banner bad">Sunucuya bağlanılıyor… Bağlantı gelince odalar görünür.</div>`}
      <section class="pvpr-card pvpr-area-quick">
        <div class="pvpr-kicker">Hızlı savaş</div>
        <h3 class="pvpr-title">Rakip bul</h3>
        ${quick}
      </section>
      <section class="pvpr-card pvpr-area-create">
        <div class="pvpr-kicker">Oda kur</div>
        <h3 class="pvpr-title">Kendi odanı aç</h3>
        <div class="pvpr-pills">${pvprMapPills("new-map", PVPR.newMap)}</div>
        <button class="pvpr-btn primary wide" data-pvpr-act="create" ${conn && !q ? "" : "disabled"}>Oda kur</button>
        <div class="pvpr-sep"></div>
        <div class="pvpr-kicker">Kodla katıl</div>
        <div class="pvpr-row">
          <input id="pvprCodeInput" class="pvpr-input" inputmode="text" autocomplete="off" maxlength="8" placeholder="EJD-7KX" aria-label="Oda kodu" value="${pvprEsc(PVPR.codeDraft)}">
          <button class="pvpr-btn primary" data-pvpr-act="join-code" ${conn && !q ? "" : "disabled"}>Katıl</button>
        </div>
      </section>
      <section class="pvpr-card pvpr-area-rooms">
        <div class="pvpr-kicker">Açık odalar</div>
        <h3 class="pvpr-title">Odalar <small>(${rooms.length})</small></h3>
        <ul class="pvpr-list" id="pvprRoomList">${roomsHtml}</ul>
      </section>
      <section class="pvpr-card pvpr-area-friends">
        <div class="pvpr-kicker">Çevrimiçi arkadaşlar</div>
        <ul class="pvpr-list">${friendsHtml}</ul>
        <p class="pvpr-muted sm">Bu maçlar ödülsüzdür: altın, ün ya da sıralama değişmez.</p>
      </section>
    </div>`;
}

/* ---------------- BEKLEME ODASI ---------------- */
function pvpFormationHtml() {
  const r = PVPR.room;
  if (!r) return pvprLobbyHtml();
  const me = pvprMe();
  const isHost = r.host === me;
  const red = r.slots[1] || { kind: "empty" };
  const allReady = r.slots.every(s => s.kind !== "empty" && s.ready);

  const slotHtml = (s, side) => {
    if (!s || s.kind === "empty") {
      return `
        <div class="pvpr-slot ${side} empty">
          <span class="pvpr-badge ${side}">${side === "blue" ? "Mavi" : "Kırmızı"}</span>
          <div class="pvpr-avatar empty">?</div>
          <b>Rakip bekleniyor</b>
          ${isHost ? `<div class="pvpr-col">
            <button class="pvpr-btn primary" data-pvpr-act="invite-toggle">Arkadaş davet et</button>
            <button class="pvpr-btn ghost" data-pvpr-act="bot-add">Bot ekle (prova)</button>
          </div>` : ""}
        </div>`;
    }
    const tags = [s.host ? "Kurucu" : "", s.handle === me && s.kind === "player" ? "Sen" : "", s.kind === "bot" ? "Bot" : ""].filter(Boolean).join(" · ");
    const status = s.kind === "bot" ? "Prova botu" : !s.connected ? "Bağlantı yok" : s.ready ? "Hazır" : "Bekliyor";
    return `
      <div class="pvpr-slot ${side} ${s.ready ? "ready" : ""}">
        <span class="pvpr-badge ${side}">${side === "blue" ? "Mavi" : "Kırmızı"}${tags ? " · " + pvprEsc(tags) : ""}</span>
        <div class="pvpr-avatar"><div class="pvpr-doll">${pvprDoll(s, side === "red")}</div></div>
        <b class="pvpr-ellipsis" title="${pvprEsc(s.handle)}">${pvprEsc(s.name || s.handle)}</b>
        <small class="pvpr-status ${s.ready ? "ok" : ""}">${status}</small>
        ${isHost && side === "red" ? (s.kind === "bot"
          ? `<button class="pvpr-btn ghost sm" data-pvpr-act="bot-remove">Botu çıkar</button>`
          : `<button class="pvpr-btn ghost sm" data-pvpr-act="kick" data-slot="1">Odadan çıkar</button>`) : ""}
      </div>`;
  };

  const friends = (PVPR.lobby.online || []).filter(h => !r.slots.some(s => s.handle === h));
  const invitePanel = PVPR.inviteOpen && isHost ? `
    <div class="pvpr-card pvpr-invite-panel">
      <div class="pvpr-kicker">Arkadaş davet et</div>
      <ul class="pvpr-list">${friends.length ? friends.map(h => `
        <li><button class="pvpr-friend" data-pvpr-act="invite" data-h="${pvprEsc(h)}"><span class="pvpr-dot"></span><span class="pvpr-ellipsis">${pvprEsc(h)}</span><small>Davet et</small></button></li>`).join("")
        : `<li class="pvpr-empty sm">Çevrimiçi arkadaş yok. Mahlas yaz ya da kodu paylaş.</li>`}</ul>
      <div class="pvpr-row">
        <input id="pvprInviteInput" class="pvpr-input" autocomplete="off" maxlength="40" placeholder="@mahlas" aria-label="Davet edilecek mahlas" value="${pvprEsc(PVPR.inviteDraft)}">
        <button class="pvpr-btn primary" data-pvpr-act="invite-typed">Davet</button>
      </div>
    </div>` : "";

  const mySlot = pvprMySlot();
  return `
    <div class="pvpr-wait">
      <section class="pvpr-card pvpr-wait-head">
        <div>
          <div class="pvpr-kicker">Bekleme odası · 1v1</div>
          <h3 class="pvpr-title pvpr-ellipsis">${pvprEsc(pvprMapName(r.mapId))}</h3>
        </div>
        <div class="pvpr-code">
          <span>Oda kodu</span>
          <b id="pvprRoomCode">${pvprEsc(r.code)}</b>
          <button class="pvpr-btn ghost sm" data-pvpr-act="copy-code">Kopyala</button>
        </div>
      </section>
      ${isHost ? `<div class="pvpr-pills pvpr-wait-maps" aria-label="Harita">${pvprMapPills("room-map", r.mapId)}</div>` : `<p class="pvpr-muted center">Haritayı ve başlamayı oda kurucusu seçer.</p>`}
      <div class="pvpr-teams">
        ${slotHtml(r.slots[0], "blue")}
        <div class="pvpr-vs">VS</div>
        ${slotHtml(red, "red")}
      </div>
      ${invitePanel}
      <div class="pvpr-actions">
        ${isHost
          ? `<button class="pvpr-btn primary wide" data-pvpr-act="start" ${allReady ? "" : "disabled"}>Savaşı başlat</button>`
          : `<button class="pvpr-btn ${mySlot && mySlot.ready ? "ghost" : "primary"} wide" data-pvpr-act="ready">${mySlot && mySlot.ready ? "Hazır değilim" : "Hazırım"}</button>`}
        <button class="pvpr-btn ghost" data-pvpr-act="leave">Odadan çık</button>
      </div>
      <p class="pvpr-muted center sm">${isHost ? (allReady ? "Herkes hazır. Savaşı başlatabilirsin." : "Rakip hazır olunca savaş başlatılabilir.") : "Hazır ol; savaşı kurucu başlatır."} Bu maç ödülsüzdür.</p>
    </div>`;
}

/* ---------------- MAÇ SONU ---------------- */
function renderPvpResultScreen() {
  const R = SHM.pvpResult || { win: false, stats: {} };
  const mapObj = (typeof PVP_ARENA_MAPS !== "undefined" && (PVP_ARENA_MAPS[R.mapId] || PVP_ARENA_MAPS.steppe_canyon)) || {};
  const reasonTxt = {
    ko: R.win ? "Rakibin canı bitti." : "Canın bitti.",
    forfeit: R.win ? "Rakip maçtan ayrıldı. Hükmen kazandın." : "Maçtan ayrıldın. Hükmen yenildin.",
    disconnect: R.win ? "Rakibin bağlantısı koptu. Hükmen kazandın." : "Bağlantın koptu. Hükmen yenildin.",
  }[R.reason] || (R.practice ? "Prova maçı (bot)." : "");
  const st = R.stats || {};
  const roomPeerHere = PVPR.room && PVPR.room.slots.filter(s => s.kind === "player").length === 2;
  let buttons;
  if (R.live) {
    const canRematch = !R.peerGone && roomPeerHere;
    buttons = `
      ${canRematch ? (R.rematchSent
        ? `<button class="pvpr-btn ghost wide" disabled>Rövanş istendi, rakip bekleniyor…</button>`
        : `<button class="pvpr-btn primary wide" data-pvpr-act="rematch">${R.rematchFrom ? "Rövanşı kabul et" : "Rövanş iste"}</button>`)
        : `<p class="pvpr-muted center">Rakip odadan ayrıldı.</p>`}
      ${R.rematchFrom && !R.rematchSent && canRematch ? `<p class="pvpr-muted center"><b>${pvprEsc(R.rematchFrom)}</b> rövanş istiyor.</p>` : ""}
      ${R.quick ? `<button class="pvpr-btn ghost wide" data-pvpr-act="again-quick">Tekrar hızlı savaş</button>` : ""}
      <button class="pvpr-btn ghost wide" data-pvpr-act="leave">Lobiye dön</button>`;
  } else {
    buttons = `
      ${PVPR.room ? `<button class="pvpr-btn primary wide" data-pvpr-act="back-room">Bekleme odasına dön</button>` : ""}
      <button class="pvpr-btn ghost wide" data-pvpr-act="leave">Lobiye dön</button>`;
  }
  return `
    <div class="shm-screen-body pvpr-screen" style="background-image:url('${mapObj.bgUrl || ""}')">
      <div class="shm-screen-backdrop"></div>
      <div class="pvpr-result ${R.win ? "win" : "lose"}" data-pvpr-result="${R.win ? "win" : "lose"}">
        <section class="pvpr-card">
          <div class="pvpr-kicker">${R.practice ? "Prova sonucu" : "Maç sonu"}</div>
          <h2 class="pvpr-result-title">${R.win ? "Zafer" : "Yenilgi"}</h2>
          <p class="pvpr-muted center">${pvprEsc(reasonTxt)}</p>
          <div class="pvpr-vsline"><b class="pvpr-ellipsis">${pvprEsc(pvprMe())}</b><span>VS</span><b class="pvpr-ellipsis">${pvprEsc(R.rival || "")}</b></div>
          <small class="pvpr-muted center">${pvprEsc(pvprMapName(R.mapId))}</small>
          ${R.live ? `<dl class="pvpr-stats">
            <div><dt>Tur</dt><dd>${st.turns || 0}</dd></div>
            <div><dt>Verdiğin hasar</dt><dd>${st.dmgDealt || 0}</dd></div>
            <div><dt>Aldığın hasar</dt><dd>${st.dmgTaken || 0}</dd></div>
            <div><dt>İsabet</dt><dd>${st.hits || 0}/${Math.max(st.shots || 0, st.hits || 0)}</dd></div>
          </dl>` : ""}
          <p class="pvpr-muted center sm">Ödülsüz maç: altın, ün ya da sıralama değişmez.</p>
          <div class="pvpr-col">${buttons}</div>
        </section>
      </div>
    </div>`;
}

/* ---------------- Topçu kapanınca ---------------- */
function pvprOnAppClose() {
  if (PVPR.queue) { pvprSend("pvp_queue_leave"); PVPR.queue = null; }
  if (PVPR.room) { pvprSend("pvp_room_leave"); PVPR.room = null; }
  if (typeof SHM !== "undefined") { SHM.pvpLive = null; SHM.pvpResult = null; SHM.pvpPractice = null; }
  pvprHidePeerOverlay();
  pvprUnsubscribe();
}

if (typeof window !== "undefined") {
  window.PVPR = PVPR;
  window.onPvpNetMessage = onPvpNetMessage;
  window.pvprOnReconnect = pvprOnReconnect;
  window.renderPvpLobbyScreen = renderPvpLobbyScreen;
  window.renderPvpResultScreen = renderPvpResultScreen;
  window.pvpFormationHtml = pvpFormationHtml;
  window.pvprOnAppClose = pvprOnAppClose;
}
