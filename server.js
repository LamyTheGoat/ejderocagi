'use strict';
/**
 * EJDER OCAĞI ONLINE — ÇOK OYUNCULU SUNUCU v2.5 (HTTP REST + RFC 6455 WEBSOCKET + X OAUTH 2.0 PKCE)
 * Firestore SDK kurulumu: `npm ci`; geliştirme: `node server.js`.
 *
 * Özellikler:
 * 1. Statik Oyun Sunucusu (index.html, js/, img/, sfx/, style.css)
 * 2. Resmi X (Twitter) OAuth 2.0 PKCE Akışı (/api/auth/x/login, /api/auth/x/callback, /api/auth/x/mock)
 * 3. Dinamik SVG Twitter Card (OpenGraph) Görsel Üretici (/share/card/:handle.svg & /share/:handle)
 * 4. Oyuncu & X (@handle) Kimlik ve Bulut Kayıt Senkronizasyonu (/api/sync)
 * 5. Canlı Kervansaray Meydanı & Eşzamanlı (Turn-Based) PvP Düello Odası + Canlı Tribün Bahis/Tezahürat (WebSocket)
 * 6. Küresel İlk Keşif Ansiklopedisi (World First Codex) (/api/codex)
 * 7. Saray Zarafet Merasimi Küresel Podyumu & Halk Oylaması (/api/pageant)
 * 8. Lonca Kervan Savaşları (Syndicate Caravan Escort & Ambush) + Asenkron Ocak Baskını Rövanş Defteri (/api/caravans, /api/raid-ocak)
 * 9. Haftalık Küresel Felaket: "Kül Yutan" Dünya Boss'u (Canlı Co-op Raid) (/api/boss)
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createDragonDuelServer } = require('./js/duel_server.js');
const { createEconomyStore } = require('./server/store_factory');
const { createMarketService, publicListing } = require('./server/market_service');
const { createMarketReadCache } = require('./server/market_read_cache');
const { consume } = require('./server/service_security');
const { COMMAND_TYPES } = require('./server/economy_commands');
const { weekStatus } = require('./server/week_runtime');
const { createGuestSessions } = require('./server/guest_session');
const { createPublicFiles } = require('./server/public_files');
const { resolveSessionSecret } = require('./server/session_secret');

const inFlight = new Set();
function track(promise) {
  inFlight.add(promise);
  promise.then(() => inFlight.delete(promise), () => inFlight.delete(promise));
  return promise;
}
const PORT = process.env.PORT || 3000;
const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const DB_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'world.json');
const ECONOMY = createEconomyStore();
const GUEST_SESSIONS = createGuestSessions(ECONOMY, PUBLIC_URL, process.env.NODE_ENV === 'production');
const publicFile = createPublicFiles(__dirname, [DB_DIR]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.mp3': 'audio/mpeg',
};

let saveTimer = null;
const OAUTH_STATES = new Map(); // state -> { verifier, createdAt }
const LIVE_ROOMS = new Map();   // roomId -> { id, p1, p2, turn, round, log, spectators, over, winner }

function createDefaultWorld() {
  return {
    version: 2.5,
    createdAt: new Date().toISOString(),
    players: {
      '@kuzey_ruzgari': {
        handle: '@kuzey_ruzgari',
        verified: true,
        guild: 'Ayaz Muhafızları',
        title: 'Rüzgârın Oğlu',
        un: 64,
        wins: 18,
        defenseBonus: 18,
        updatedAt: Date.now(),
        star: {
          id: 9001, name: 'Bora', sex: 'M', stage: 'yetiskin', el: 'buz', hybrid: 'buz+firtina',
          gen: 2, w: 14, l: 2, bond: 82, dirt: 0,
          st: { gu: 68, ce: 84, da: 72, ze: 64 },
          genes: {
            pot: { gu: [4, 4], ce: [5, 4], da: [4, 4], ze: [4, 3] },
            el: ['buz', 'firtina'], pat: ['C', 'd'], eye: ['A', 'A'], eyec: ['mavi', 'altin'],
            horn: ['t', 'k'], pul: ['gok', 'inci'], sus: ['altin', 'altin'], pig: ['a', 'a'], par: ['P', 'p'], boy: ['i', 'o'],
          },
          traits: ['kartal', 'asil'],
          cards: ['dondurucu_bora', 'buz_zirh', 'yildirim'],
          cos: { aura: 'kar', bas: 'altintac' },
          aiPreset: { opener: 'kukre', lowHpPct: 40, lowHpAct: 'card' },
          studFee: 95,
        },
      },
      '@leydi_sureyya': {
        handle: '@leydi_sureyya',
        verified: true,
        guild: 'İnci Hanedanı',
        title: 'Saray İncisi',
        un: 82,
        wins: 22,
        defenseBonus: 24,
        updatedAt: Date.now(),
        star: {
          id: 9002, name: 'Şahmeran', sex: 'F', stage: 'yetiskin', el: 'golge', hybrid: 'ates+golge',
          gen: 3, w: 19, l: 1, bond: 92, dirt: 0,
          st: { gu: 74, ce: 76, da: 70, ze: 88 },
          genes: {
            pot: { gu: [4, 4], ce: [4, 5], da: [4, 4], ze: [5, 5] },
            el: ['golge', 'ates'], pat: ['C', 'B'], eye: ['A', 'A'], eyec: ['kizil', 'kizil'],
            horn: ['t', 't'], pul: ['mor', 'gul'], sus: ['altin', 'kizil'], pig: ['m', 'm'], par: ['P', 'p'], boy: ['o', 'o'],
          },
          traits: ['asil', 'kor'],
          cards: ['kara_alev', 'golge_adim', 'son_nefes'],
          cos: { aura: 'yildiz', taban: 'kaide', boyun: 'nazar' },
          aiPreset: { opener: 'nefes', lowHpPct: 40, lowHpAct: 'card' },
          studFee: 130,
        },
      },
      '@altin_kervan': {
        handle: '@altin_kervan',
        verified: true,
        guild: 'Tuz Tacirleri',
        title: 'Tuz Taciri',
        un: 52,
        wins: 15,
        defenseBonus: 20,
        updatedAt: Date.now(),
        star: {
          id: 9003, name: 'Kızılhan', sex: 'M', stage: 'yetiskin', el: 'ates', hybrid: 'ates+toprak',
          gen: 2, w: 15, l: 4, bond: 76, dirt: 0,
          st: { gu: 86, ce: 62, da: 84, ze: 58 },
          genes: {
            pot: { gu: [5, 4], ce: [3, 4], da: [5, 4], ze: [3, 3] },
            el: ['ates', 'toprak'], pat: ['B', 'd'], eye: ['N', 'A'], eyec: ['altin', 'kehribar'],
            horn: ['k', 'k'], pul: ['altin', 'kizil'], sus: ['zumrut', 'altin'], pig: ['N', 'N'], par: ['p', 'p'], boy: ['i', 'i'],
          },
          traits: ['demir', 'kor'],
          cards: ['magma_zirh', 'alev_yagmuru', 'celik_pence'],
          cos: { aura: 'kivilcim', kuyruk: 'halka' },
          aiPreset: { opener: 'kukre', lowHpPct: 40, lowHpAct: 'savun' },
          studFee: 85,
        },
      },
    },
    codex: {
      'ates:saf:N:p:kizil:altin:C:kehribar:1': { hash: 'ates:saf:N:p:kizil:altin:C:kehribar:1', title: 'Kızıl Pullu Altın Süslü Ateş', by: '@demirhan_ocagi', dName: 'Demirpençe', w: 1, rarity: 48 },
      'buz:buz+firtina:a:P:gok+inci:altin:C:mavi:1': { hash: 'buz:buz+firtina:a:P:gok+inci:altin:C:mavi:1', title: 'Ak Parıltılı Gök-inci Pullu Tipi Kanat', by: '@kuzey_ruzgari', dName: 'Bora', w: 1, rarity: 96 },
      'golge:ates+golge:m:P:gul+mor:altin+kizil:CB:kizil:0': { hash: 'golge:ates+golge:m:P:gul+mor:altin+kizil:CB:kizil:0', title: 'Kara Parıltılı Gül-mor Pullu Kara Alev', by: '@leydi_sureyya', dName: 'Şahmeran', w: 1, rarity: 124 },
    },
    pageant: [
      { handle: '@leydi_sureyya', trainer: 'Leydi Süreyya', dName: 'Şahmeran', score: 194, votes: 24, title: 'Kara Parıltılı Gül-mor Pullu Kara Alev', el: 'golge' },
      { handle: '@kuzey_ruzgari', trainer: 'Kuzeyli Bora', dName: 'Bora', score: 176, votes: 19, title: 'Ak Parıltılı Gök-inci Pullu Tipi Kanat', el: 'buz' },
      { handle: '@altin_kervan', trainer: 'Tuz Taciri', dName: 'Kızılhan', score: 152, votes: 14, title: 'Altın-kızıl Pullu Magma Yüreği', el: 'ates' },
    ],
    banners: {
      kul: { owner: '@altin_kervan', guild: 'Tuz Tacirleri', count: 3 },
      buzul: { owner: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', count: 4 },
      kayalik: { owner: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', count: 2 },
      orman: { owner: '@yesil_vadi', guild: 'Kök Kardeşliği', count: 2 },
      bataklik: { owner: '@leydi_sureyya', guild: 'İnci Hanedanı', count: 3 },
      col: { owner: '@altin_kervan', guild: 'Tuz Tacirleri', count: 4 },
      mercan: { owner: '@leydi_sureyya', guild: 'İnci Hanedanı', count: 3 },
      bulut: { owner: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', count: 2 },
      obsidiyen: { owner: '@leydi_sureyya', guild: 'İnci Hanedanı', count: 3 },
    },
    caravans: [
      {
        id: 'cv_tuz', guild: 'Tuz Tacirleri', owner: '@altin_kervan', route: 'Serap Tuz Çölü → Gece Çarşısı',
        cargo: 160, foodReward: 'biber', guardName: 'Kızılhan', guardEl: 'ates', guardPower: 76, raidedBy: [],
      },
      {
        id: 'cv_inci', guild: 'İnci Hanedanı', owner: '@leydi_sureyya', route: 'Batık Mercan Uçurumu → Saray Bahçesi',
        cargo: 195, foodReward: 'zambak', guardName: 'Şahmeran', guardEl: 'golge', guardPower: 82, raidedBy: [],
      },
      {
        id: 'cv_ayaz', guild: 'Ayaz Muhafızları', owner: '@kuzey_ruzgari', route: 'Buzul Sırtı → Yıldırım Kuleleri',
        cargo: 145, foodReward: 'kar', guardName: 'Bora', guardEl: 'buz', guardPower: 74, raidedBy: [],
      },
    ],
    worldBoss: {
      name: 'Kül Yutan (Kadim Felaket)',
      title: 'Yedi Volkanın Efendisi',
      maxHp: 25000,
      hp: 18420,
      phase: 2,
      contributors: {
        '@leydi_sureyya': { handle: '@leydi_sureyya', guild: 'İnci Hanedanı', dName: 'Şahmeran', dmg: 2680 },
        '@kuzey_ruzgari': { handle: '@kuzey_ruzgari', guild: 'Ayaz Muhafızları', dName: 'Bora', dmg: 2150 },
        '@altin_kervan': { handle: '@altin_kervan', guild: 'Tuz Tacirleri', dName: 'Kızılhan', dmg: 1750 },
      },
    },
    raidLog: [
      {
        id: 'rd_seed_1', attacker: '@altin_kervan', attackerDragon: 'Kızılhan',
        target: '@ejder_ocagi', targetDragon: 'Kor', won: true, goldStolen: 35, revenged: false, ts: Date.now() - 360000,
      },
    ],
    chatLog: [
      { handle: '@leydi_sureyya', text: 'Saray Zarafet Merasimi podyumu bu hafta çok çekişmeli!', ts: Date.now() - 180000 },
      { handle: '@kuzey_ruzgari', text: 'Kül Yutan\'ın canı %75\'in altına indi, herkes ejderhasıyla saldırıya katılsın!', ts: Date.now() - 90000 },
      { handle: '@altin_kervan', text: 'Tuz Çölü kervanımız yola çıktı, muhafızlarımız nöbette!', ts: Date.now() - 40000 },
    ],
    marketListings: [
      {
        id: 'mk_seed_1',
        seller: '@leydi_sureyya',
        guild: 'İnci Hanedanı',
        cat: 'dragon',
        title: 'Zümrüt (Asil Gölge)',
        sub: 'Gölge · Genç · Güç 54 / Çev 62 · Asil Kan',
        price: 340,
        el: 'golge',
        dragonData: {
          name: 'Zümrüt', sex: 'F', stage: 'genc', age: 3, el: 'golge', eye: 'A', horn: 't', pat: 'B',
          st: { gu: 54, ce: 62, da: 48, ze: 58 },
          genes: { pot: { gu: [4, 4], ce: [5, 4], da: [3, 4], ze: [4, 4] }, el: ['golge', 'buz'], pat: ['B', 'd'], eye: ['A', 'A'], horn: ['t', 'k'] },
          traits: ['asil', 'cevik'],
        },
        ts: Date.now() - 320000,
      },
      {
        id: 'mk_seed_2',
        seller: '@kuzey_ruzgari',
        guild: 'Ayaz Muhafızları',
        cat: 'egg',
        title: 'Mühürlü Tipi Yumurtası',
        sub: 'Buz × Fırtına Melez Adayı · 3. Nesil Soy',
        price: 165,
        el: 'buz',
        eggData: {
          sex: 'M', traits: ['firtina', 'hizli'], w: 1, inK: false, gen: 3,
          parents: ['Bora', 'Şimşek'], origin: '@kuzey_ruzgari ocağından alındı',
          genes: { pot: { gu: [4, 3], ce: [5, 4], da: [4, 4], ze: [3, 4] }, el: ['buz', 'firtina'], pat: ['C', 'B'], eye: ['M', 'A'], horn: ['t', 'd'] },
        },
        ts: Date.now() - 240000,
      },
      {
        id: 'mk_seed_3',
        seller: '@demirhan_ocagi',
        guild: 'Demir Pençe Loncası',
        cat: 'item',
        title: 'Mithril Göğüslük',
        sub: 'Gövde Zırhı · Efsanevi · Zırh +34',
        price: 360,
        itemId: 'zirh3',
        ts: Date.now() - 180000,
      },
      {
        id: 'mk_seed_4',
        seller: '@altin_kervan',
        guild: 'Tuz Tacirleri',
        cat: 'food',
        title: 'Sonsuz Gençlik İksiri',
        sub: 'Yalnızca Yavrular İçebilir · Topçu Silahı Mührü',
        price: 125,
        foodKey: 'genclik',
        qty: 1,
        ts: Date.now() - 120000,
      },
      {
        id: 'mk_seed_5',
        seller: '@altin_kervan',
        guild: 'Tuz Tacirleri',
        cat: 'item',
        title: 'Ejderdişi Kını',
        sub: 'Pençe Silahı · Efsanevi · Saldırı +22',
        price: 330,
        itemId: 'kin3',
        ts: Date.now() - 95000,
      },
      {
        id: 'mk_seed_6',
        seller: '@leydi_sureyya',
        guild: 'İnci Hanedanı',
        cat: 'food',
        title: 'Ejder Ziyafeti (×2 Paket)',
        sub: 'Moral +2, Bağ +5, Yorgunluk -20 · İkili Paket',
        price: 90,
        foodKey: 'ziyafet',
        qty: 2,
        ts: Date.now() - 60000,
      },
    ],
    marketSales: [],
  };
}

function loadWorld() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const def = createDefaultWorld();
      const merged = Object.assign(def, parsed);
      if (!Array.isArray(merged.marketListings) || !merged.marketListings.length) {
        merged.marketListings = def.marketListings;
      }
      if (!Array.isArray(merged.marketSales)) merged.marketSales = [];
      return merged;
    }
  } catch (e) {
    console.error('Veritabanı okuma hatası, varsayılan dünya yükleniyor:', e.message);
  }
  const w = createDefaultWorld();
  saveWorld(w);
  return w;
}

let WORLD = loadWorld();
// ENG-07: Bedesten artık ekonomi deposunda (SQLite/Firestore). WORLD.marketListings eski tohum
// verisidir; hiçbir yanıtta gösterilmez (sahte "canlı ilan" yok).
const MARKET = createMarketService({ store: ECONOMY });
// ENG-09 Y-1: okuma uçları için cömert limit (dakikada; ortamdan ayarlanır) ve kısa ömürlü Bedesten önbelleği.
// Normal istemci: Bedesten 10 sn'de /api/market + /api/economy (12/dk), Takas 5 sn'de state + peers (24/dk).
// Hesap başına 300/dk, iki ekran açık 8 sekmeyi (288/dk) karşılar. Oturumsuz okuma normal istemcide yoktur
// (istemci önce /api/session alır); IP başına 120/dk yalnız oturumsuz çağrıları sınırlar.
// Kova, POST limitinin kullandığı consume() kuralıyla süreç belleğindedir (örnek başına), depoda DEĞİL:
// Firestore'da her GET bir işlem (okuma + yazma) ekler ve aynı hesabın paralel GET'leri (market + economy,
// state + peers) aynı belgede çekişir (emülatörde ~3 sn). Bu, Y-1'in amacı olan okuma maliyetini büyütürdü.
const envInt = (value, fallback, min) => { const n = Number(value); return Number.isInteger(n) && n >= min ? n : fallback; };
const READ_RATE = Object.freeze({
  account: envInt(process.env.READ_RATE_PER_ACCOUNT, 300, 1),
  ip: envInt(process.env.READ_RATE_PER_IP, 120, 1),
  windowMs: 60000,
  maxKeys: 20000,
});
const readWindows = new Map();
function consumeReadRate(key, limit) {
  const now = Date.now();
  if (readWindows.size >= READ_RATE.maxKeys) {
    for (const [k, w] of readWindows) if (w.until <= now) readWindows.delete(k);
    // Bellek sınırı: hâlâ doluysa en eski pencereler bırakılır (o anahtarlar için sınır sıfırlanır, istek reddedilmez).
    for (const k of readWindows.keys()) { if (readWindows.size < READ_RATE.maxKeys) break; readWindows.delete(k); }
  }
  const next = consume(readWindows.get(key), limit, READ_RATE.windowMs, now); // aşımda 429 rate_limited fırlatır
  readWindows.delete(key); readWindows.set(key, next);
}
const READ_RATE_PATHS = new Set(['/api/market', '/api/economy', '/api/trade/state', '/api/trade/peers']);
const MARKET_READS = createMarketReadCache({ store: ECONOMY, publicListing, ttlMs: envInt(process.env.MARKET_CACHE_TTL_MS, 2500, 0) });
// Yayın yalnız "yenile" sinyalidir: ilan listesi, satış veya altın taşımaz (eski istemci yerel altın yazmasın).
const marketChanged = listingId => { MARKET_READS.invalidate(); wsBroadcast({ type: 'market_update', listingId }); };

function prunePlayers(w = WORLD) {
  const pKeys = Object.keys(w.players || {});
  if (pKeys.length > 250) {
    const sorted = pKeys.sort((a, b) => (w.players[b].updatedAt || 0) - (w.players[a].updatedAt || 0));
    for (const oldK of sorted.slice(250)) delete w.players[oldK];
  }
}

function flushWorldSync(w = WORLD) {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    prunePlayers(w);
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(w, null, 2), 'utf8');
  } catch (e) {
    console.error('Veritabanı senkron yazma hatası:', e.message);
  }
}

function saveWorld(w = WORLD) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      prunePlayers(w);
      await fs.promises.mkdir(DB_DIR, { recursive: true });
      await fs.promises.writeFile(DB_FILE, JSON.stringify(w, null, 2), 'utf8');
    } catch (e) {
      console.error('Veritabanı yazma hatası:', e.message);
    }
  }, 150);
}

/* ============ RFC 6455 SAF WEBSOCKET MOTORU ============ */
const WS_CLIENTS = new Set();

function encodeWsFrame(dataObj) {
  const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const isMasked = (byte2 & 0x80) !== 0;
    let payloadLen = byte2 & 0x7f;
    let headerLen = 2;

    if (opcode === 0x8) return { close: true, messages, consumed: buffer.length };
    if (!(byte1 & 0x80) || (byte1 & 0x70) || !isMasked || ![0x1, 0x9, 0xa].includes(opcode)) return { close: true, messages: [], consumed: buffer.length };
    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    if (!Number.isSafeInteger(payloadLen) || payloadLen > 128 * 1024 || (opcode >= 0x8 && payloadLen > 125)) return { close: true, messages: [], consumed: buffer.length };
    const maskLen = isMasked ? 4 : 0;
    if (offset + headerLen + maskLen + payloadLen > buffer.length) break;

    const payload = Buffer.alloc(payloadLen);
    if (isMasked) {
      const mask = buffer.slice(offset + headerLen, offset + headerLen + 4);
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[offset + headerLen + 4 + i] ^ mask[i % 4];
      }
    } else {
      buffer.copy(payload, 0, offset + headerLen, offset + headerLen + payloadLen);
    }

    if (opcode === 0x1) {
      try {
        messages.push(JSON.parse(payload.toString('utf8')));
      } catch (e) {}
    }
    offset += headerLen + maskLen + payloadLen;
  }
  return { close: false, messages, consumed: offset };
}

function wsBroadcast(obj, excludeSocket = null) {
  const frame = encodeWsFrame(obj);
  for (const client of WS_CLIENTS) {
    if (client !== excludeSocket && !client.destroyed) {
      try { client.write(frame); } catch (e) {}
    }
  }
}

const DUEL_SERVER = createDragonDuelServer({ crypto, WS_CLIENTS, WORLD, encodeWsFrame, store: ECONOMY }); // ENG06 P-D: ödüllü oda yalnız sunucu deposuyla

const NPC_HANDLES = new Set(['@kuzey_ruzgari', '@leydi_sureyya', '@altin_kervan']);

function getActiveHubPeers() {
  return Object.values(WORLD.players).slice(0, 10).map((p, idx) => ({
    handle: p.handle,
    npc: NPC_HANDLES.has(p.handle),
    verified: !!p.verified,
    guild: p.guild || 'Kızıl Ocak Birliği',
    title: p.title || 'Ocak Ustası',
    defenseBonus: p.defenseBonus || 12,
    x: p.hubX || [24, 52, 78, 38, 64, 30][idx % 6],
    y: p.hubY || [58, 52, 60, 68, 64, 50][idx % 6],
    pose: p.hubPose || 'P1',
    chat: p.hubChat || `${p.star ? p.star.name : 'Ejderham'} ile meydandayım!`,
    studFee: (p.star && p.star.studFee) || 95,
    d: p.star,
    chibi: p.chibi || null,
  })).filter(x => x.d);
}

async function handleWsUpgrade(req, socket, head) {
  if (!GUEST_SESSIONS.allowedOrigin(req) || !req.headers.origin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
  }
  const identity = await GUEST_SESSIONS.resolve(req, {fresh:true});
  if (socket.destroyed) return;
  if (!identity) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  await ECONOMY.consumeRate('ws-connect:'+identity.accountId,20,60000);
  const key = req.headers['sec-websocket-key'];
  if (req.headers['sec-websocket-version'] !== '13' || req.headers.upgrade?.toLowerCase() !== 'websocket' || typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key)) { socket.destroy(); return; }
  if (!key) { socket.destroy(); return; }
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n',
  ].join('\r\n');

  socket.write(headers);
  socket.playerInfo = { accountId: identity.accountId, handle: identity.handle, authenticated: true, xVerified: !!getSessionHandle(req), x: 35, y: 60, pose: 'P1', chat: 'Meydana katıldı!' };
  socket.authRequest = req; socket.presenceId = crypto.randomUUID();
  await ECONOMY.publishPresence(socket.presenceId, identity);
  if(socket.destroyed){await ECONOMY.publishPresence(socket.presenceId,null);return;}
  WS_CLIENTS.add(socket);

  socket.write(encodeWsFrame({
    type: 'welcome',
    handle: socket.playerInfo.handle,
    authenticated: socket.playerInfo.authenticated,
    accountId: identity.accountId,
    xVerified: socket.playerInfo.xVerified,
    onlineCount: WS_CLIENTS.size,
    worldBoss: WORLD.worldBoss,
    banners: WORLD.banners,
    caravans: WORLD.caravans,
    chatLog: WORLD.chatLog.slice(-15),
    peers: getActiveHubPeers(),
    marketListings: [],
  }));

  wsBroadcast({ type: 'online_count', count: WS_CLIENTS.size });
  DUEL_SERVER.onConnect(socket);

  const authTimer = setInterval(() => {
    track(GUEST_SESSIONS.resolve(req, {fresh:true}).then(async session => { if (!session) socket.destroy(); else if(!socket.destroyed) await ECONOMY.publishPresence(socket.presenceId,session); })).catch(() => socket.destroy());
  }, 30000);
  authTimer.unref();
  socket.once('close', () => { clearInterval(authTimer); track(Promise.resolve().then(()=>ECONOMY.publishPresence(socket.presenceId,null))).catch(()=>{}); });
  let pending = Buffer.alloc(0);
  const onData = chunk => {
    if (shuttingDown || identity.expiresAt <= Date.now()) { socket.destroy(); return; }
    if (pending.length + chunk.length > 256 * 1024) { socket.destroy(); return; }
    pending = Buffer.concat([pending, chunk]);
    const { close, messages, consumed } = decodeWsFrames(pending);
    pending = pending.subarray(consumed);
    if (close) {
      WS_CLIENTS.delete(socket);
      socket.end();
      wsBroadcast({ type: 'online_count', count: WS_CLIENTS.size });
      return;
    }
    for (const msg of messages) {
      track(handleWsMessage(socket, msg)).catch(()=>socket.destroy());
    }
  };
  socket.on('data', onData);
  if (head && head.length) onData(head);

  socket.on('close', () => {
    WS_CLIENTS.delete(socket);
    DUEL_SERVER.onDisconnect(socket);
    wsBroadcast({ type: 'online_count', count: WS_CLIENTS.size });
  });
  socket.on('error', () => {
    WS_CLIENTS.delete(socket);
    DUEL_SERVER.onDisconnect(socket);
  });
}

async function handleWsMessage(socket, msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || !msg.type) return;
  if (['trade_command','market_op'].includes(msg.type)) {
    const live = await GUEST_SESSIONS.resolve(socket.authRequest,{fresh:true});
    if(!live||live.accountId!==socket.playerInfo.accountId){socket.destroy();return;}
    try { await ECONOMY.consumeRate('economy:'+live.accountId,120,60000); }
    catch(error){if(!socket.destroyed)socket.write(encodeWsFrame({type:msg.type==='trade_command'?'trade_error':'market_error',error:error.code||'service_unavailable',ok:false}));return;}
  }
  // Sender identity always comes from the live session, never the message.
  msg = { ...msg, accountId: socket.playerInfo.accountId, handle: socket.playerInfo.handle, from: socket.playerInfo.handle, buyer: socket.playerInfo.handle, attacker: socket.playerInfo.handle };
  if (msg.listing && typeof msg.listing === 'object') msg.listing = { ...msg.listing, seller: socket.playerInfo.handle };
  if (msg.type === 'trade_command') {
    await Promise.resolve().then(() => ECONOMY.executeTrade(socket.playerInfo.accountId, msg.command)).then(result => {
      for (const peer of WS_CLIENTS) if (result.trade.participants.includes(peer.playerInfo?.accountId) && !peer.destroyed) peer.write(encodeWsFrame({ type: 'trade_state', ...result }));
    }).catch(error => { if (!socket.destroyed) socket.write(encodeWsFrame({ type: 'trade_error', requestId: msg.command?.requestId, error: error.code || 'trade_unavailable' })); });
    return;
  }
  if (DUEL_SERVER.onMessage(socket, msg)) return;

  if (msg.type === 'hub_update' || msg.type === 'hub_actor') {
    const h = socket.playerInfo.handle;
    socket.playerInfo.handle = h;
    if (WORLD.players[h]) {
      if (msg.x != null) WORLD.players[h].hubX = msg.x;
      if (msg.y != null) WORLD.players[h].hubY = msg.y;
      if (msg.pose) WORLD.players[h].hubPose = msg.pose;
      if (msg.chat) WORLD.players[h].hubChat = String(msg.chat).slice(0, 90);
      if (msg.chibi) WORLD.players[h].chibi = msg.chibi;
      saveWorld();
    }
    wsBroadcast({
      type: 'hub_actor',
      handle: h,
      x: msg.x,
      y: msg.y,
      pose: msg.pose,
      chat: msg.chat,
      d: msg.d || (WORLD.players[h] && WORLD.players[h].star),
      chibi: msg.chibi || (WORLD.players[h] && WORLD.players[h].chibi) || null,
    });
  }

  if (msg.type === 'chat') {
    const entry = {
      handle: String(msg.handle || socket.playerInfo.handle).slice(0, 24),
      text: String(msg.text || '').slice(0, 120),
      ts: Date.now(),
    };
    if (!entry.text) return;
    WORLD.chatLog.push(entry);
    if (WORLD.chatLog.length > 40) WORLD.chatLog.shift();
    saveWorld();
    wsBroadcast({ type: 'chat', entry });
  }

  // Canlı Eşzamanlı Düello Odası & Seyirci Tribünü Olayları
  if (msg.type === 'duel_cheer') {
    wsBroadcast({
      type: 'duel_cheer',
      roomId: msg.roomId || 'main',
      from: msg.from || socket.playerInfo.handle,
      kind: msg.kind || 'cheer', // 'cheer' | 'boo' | 'bet'
      targetSide: msg.targetSide || 'p',
      amount: msg.amount || 20,
    });
  }

  if (msg.type === 'boss_hit') {
    const dmg = Math.max(10, Math.min(2500, Number(msg.dmg) || 100));
    const h = String(msg.handle || '@ejder_ocagi');
    const B = WORLD.worldBoss;
    B.hp = Math.max(0, B.hp - dmg);
    if (B.hp === 0) {
      B.phase = (B.phase || 1) + 1;
      B.maxHp = Math.round(B.maxHp * 1.25);
      B.hp = B.maxHp;
    }
    B.contributors[h] = B.contributors[h] || { handle: h, guild: msg.guild || 'Ocak Birliği', dName: msg.dName || 'Kor', dmg: 0 };
    B.contributors[h].dmg += dmg;
    B.contributors[h].dName = msg.dName || B.contributors[h].dName;
    saveWorld();
    wsBroadcast({ type: 'boss_state', worldBoss: B, lastHit: { handle: h, dName: msg.dName, dmg } });
  }

  if (msg.type === 'ping') {
    if (!socket.destroyed) {
      try { socket.write(encodeWsFrame({ type: 'pong', ts: Date.now() })); } catch (e) {}
    }
    return;
  }

  // Both transports share the same ownership and settlement boundary.
  // ENG-07: Bedesten mutasyonları yalnız POST /api/market (makbuzlu, yeniden denenebilir). WS yolu kapalı.
  if (msg.type === 'market_op') {
    if (!socket.destroyed) socket.write(encodeWsFrame({ type: 'market_error', ok: false, error: 'market_http_only' }));
    return;
  }

  // Canlı 3 Oyunculu Zindan Co-op Senkronizasyonu
  if (msg.type === 'dungeon_coop_sync') {
    wsBroadcast({
      type: 'dungeon_coop_sync',
      from: msg.from || msg.handle || socket.playerInfo.handle,
      raidId: msg.raidId,
      stage: msg.stage,
      action: msg.action,
      x: msg.x,
      y: msg.y,
      angle: msg.angle,
      power: msg.power,
      el: msg.el,
      chibi: msg.chibi || null,
      bossHp: msg.bossHp,
      dmg: msg.dmg,
      text: msg.text,
      ts: Date.now(),
    }, socket);
  }

  // Canlı Ejder Topçusu 1v1 PvP Senkronizasyonu
  if (msg.type === 'pvp_sync') {
    wsBroadcast({
      type: 'pvp_sync',
      from: msg.from || msg.handle || socket.playerInfo.handle,
      to: msg.to || null,
      roomId: msg.roomId || 'pvp_main',
      slot: msg.slot,
      raidId: msg.raidId,
      mapId: msg.mapId || 'skybridge',
      action: msg.action, // 'join_map' | 'invite' | 'accept_invite' | 'move_aim' | 'fire' | 'hit' | 'turn_handoff' | 'taunt'
      x: msg.x,
      y: msg.y,
      relX: msg.relX,
      facing: msg.facing,
      angle: msg.angle,
      power: msg.power,
      dmg: msg.dmg,
      el: msg.el,
      chibi: msg.chibi || null,
      mods: msg.mods,
      hp: msg.hp,
      enemyHp: msg.enemyHp,
      rivalHp: msg.rivalHp ?? msg.enemyHp,
      wind: msg.wind,
      text: msg.text,
      ts: Date.now(),
    }, socket);
  }

  // Sosyal sistem: özel mesaj (fısıltı), parti ve masa/VS davetleri (hedefe yönelik, istemci 'to' ile süzer)
  if (msg.type === 'dm_msg' || msg.type === 'party_invite' || msg.type === 'party_reply' || msg.type === 'social_invite') {
    const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
    wsBroadcast({
      type: msg.type,
      from: clip(msg.from || msg.handle || socket.playerInfo.handle, 40),
      to: clip(msg.to, 40) || null,
      text: clip(msg.text, 240),
      kind: clip(msg.kind, 24),
      accept: !!msg.accept,
      guild: clip(msg.guild, 40),
      fc: Number(msg.fc) || 0,
      chibi: msg.chibi || null,
      dragon: msg.dragon || null,
      ts: Date.now(),
    }, socket);
  }

  // Canlı Kader Çarkı (Loot Wheel) Çevirme Senkronizasyonu
  if (msg.type === 'wheel_spin') {
    wsBroadcast({
      type: 'wheel_spin',
      from: msg.from || msg.handle || socket.playerInfo.handle,
      sliceIdx: msg.sliceIdx,
      rewardTitle: msg.rewardTitle || msg.prize || '+350 Altın Kesesi',
      rewardKind: msg.rewardKind || msg.badge || 'ALTIN',
      prize: msg.prize || msg.rewardTitle || '+350 Altın Kesesi',
      badge: msg.badge || msg.rewardKind || 'ALTIN',
      mode: msg.mode || 'raid',
      ts: Date.now(),
    }, socket);
  }
}

/* ============ DINAMIK SVG TWITTER / OPENGRAPH KART ÜRETİCİ ============ */
function buildDynamicCardSvg(handle) {
  const p = WORLD.players[handle] || Object.values(WORLD.players)[0];
  const d = (p && p.star) || { name: 'Kor', el: 'ates', stage: 'yetiskin', gen: 1, w: 10, st: { gu: 65, ce: 55, da: 60, ze: 50 } };
  const guild = (p && p.guild) || 'Kızıl Ocak Birliği';
  const elColors = { ates: '#e25822', buz: '#4aa8d8', firtina: '#9a6ad4', toprak: '#6aa844', golge: '#7a44a8' };
  const c = elColors[d.el] || '#e25822';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#180f0a"/>
        <stop offset="55%" stop-color="#2c1a12"/>
        <stop offset="100%" stop-color="#100806"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="50%" r="45%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="28" y="28" width="1144" height="574" rx="22" fill="none" stroke="#d49a42" stroke-width="4"/>
    <text x="70" y="95" fill="#ffd25e" font-family="Georgia, serif" font-size="28" font-weight="bold">EJDER OCAĞI ONLINE · MEYDAN OKUMA KARTI</text>
    <text x="70" y="165" fill="#ffffff" font-family="Georgia, serif" font-size="56" font-weight="bold">${escHtml(handle)}</text>
    <text x="70" y="210" fill="#d8c4a0" font-family="Georgia, serif" font-size="26">Lonca: ${escHtml(guild)} · Unvan: ${escHtml((p && p.title) || 'Ocak Ustası')}</text>
    <rect x="70" y="250" width="620" height="220" rx="16" fill="#0d0806" fill-opacity="0.65" stroke="#6a4828" stroke-width="2"/>
    <text x="100" y="305" fill="#ffd25e" font-family="Georgia, serif" font-size="40" font-weight="bold">Muhafız: ${escHtml(d.name)} (${escHtml(d.gen || 1)}. Kuşak)</text>
    <text x="100" y="355" fill="#f0e2c8" font-family="sans-serif" font-size="26">GÜÇ: ${escHtml(d.st.gu)}   |   ÇEV: ${escHtml(d.st.ce)}   |   DAY: ${escHtml(d.st.da)}   |   ZEK: ${escHtml(d.st.ze)}</text>
    <text x="100" y="405" fill="#8af084" font-family="sans-serif" font-size="24">★ ${escHtml(d.w || 12)} Arena Zaferi · Hibrit Kan: ${escHtml(d.hybrid || 'Safkan')}</text>
    <text x="70" y="545" fill="#ffb067" font-family="Georgia, serif" font-size="30" font-weight="bold">🔥 Tıkla, Ocağı Ziyaret Et ve Kendi Ejderhanla Kapış!</text>
    <circle cx="930" cy="315" r="175" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="4"/>
    <path d="M830,380 Q910,200 1010,250 Q970,330 1040,390 Q930,360 830,380 Z" fill="${c}" stroke="#ffd25e" stroke-width="4"/>
  </svg>`;
}

/* ============ HTTP REST API VE STATİK DOSYA SUNUCUSU ============ */
function readJsonBody(req, senderFields = true, limit = 2e6) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limit) { reject(Object.assign(new Error('body_too_large'), { status: 413 })); req.resume(); return; }
      body += chunk;
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('request_aborted')));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        if (senderFields && req.identity) {
          const { handle, accountId } = req.identity;
          Object.assign(parsed, { handle, accountId, from: handle, attacker: handle, buyer: handle });
          if (parsed.listing && typeof parsed.listing === 'object') parsed.listing = { ...parsed.listing, seller: handle };
        }
        resolve(parsed);
      } catch (_) { reject(Object.assign(new Error('invalid_json'), { status: 400 })); }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

/* ============ X OAUTH OTURUM YARDIMCILARI ============ */
const OAUTH_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Üretimde SESSION_SECRET zorunlu, yoksa açılış reddedilir; yerelde rastgele sır + uyarı (K2 / Y-3)
const SESSION_SECRET = resolveSessionSecret(process.env);
const IS_HTTPS = PUBLIC_URL.startsWith('https://');

function normalizeHandle(raw) {
  const h = String(raw || '').trim().replace(/[^@\w]/g, '').slice(0, 20);
  return h.startsWith('@') ? h : '@' + h;
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pruneOauthStates() {
  const now = Date.now();
  for (const [k, v] of OAUTH_STATES) if (now - v.createdAt > OAUTH_TTL_MS) OAUTH_STATES.delete(k);
}

function isLocalRequest(req) {
  const host = String(req.headers.host || '').split(':')[0];
  return process.env.NODE_ENV !== 'production' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]');
}

function signSession(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function makeSessionCookie(handle, clear = false) {
  const flags = `Path=/; HttpOnly; SameSite=Lax${IS_HTTPS ? '; Secure' : ''}`;
  if (clear || !handle) return `eo_sess=; Max-Age=0; ${flags}`;
  const payload = Buffer.from(JSON.stringify({ h: handle, e: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `eo_sess=${payload}.${signSession(payload)}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; ${flags}`;
}

function getSessionHandle(req) {
  const m = /(?:^|;\s*)eo_sess=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const expected = signSession(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || !data.h || data.e < Date.now()) return null;
    return data.h;
  } catch (e) { return null; }
}

// Bound unauthenticated account creation; proxy headers are not trusted.
const guestCreationWindows = new Map();
function allowGuestCreation(req) {
  const now = Date.now();
  for (const [ip, window] of guestCreationWindows) if (window.until <= now) guestCreationWindows.delete(ip);
  const ip = req.socket.remoteAddress;
  let window = guestCreationWindows.get(ip);
  if (!window) {
    if (guestCreationWindows.size >= 2000) return false;
    window = { until: now + 60000, count: 0 };
    guestCreationWindows.set(ip, window);
  }
  return ++window.count <= 20;
}

async function handleHttp(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  if (pathname.startsWith('/api/')) {
    if (!GUEST_SESSIONS.allowedOrigin(req)) return sendJson(res, 403, { ok: false, error: 'origin_not_allowed' });
    req.identity = await GUEST_SESSIONS.resolve(req, {fresh:true});
  }

  // Explicit bootstrap, shared by all save slots. No client account or assets accepted.
  if (pathname === '/api/session' && req.method === 'POST') {
    req.resume();
    let identity = req.identity;
    if (!identity) {
      if (GUEST_SESSIONS.tokenFrom(req) !== null) return sendJson(res, 401, { ok: false, error: 'invalid_guest_session' });
      if (!allowGuestCreation(req)) return sendJson(res, 429, { ok: false, error: 'guest_creation_rate_limited' });
      await ECONOMY.consumeRate('guest-ip:'+req.socket.remoteAddress,20,60000);
      identity = await ECONOMY.createGuest();
      res.setHeader('Set-Cookie', GUEST_SESSIONS.cookie(identity.token, identity.expiresAt));
    }
    return sendJson(res, 200, { ok: true, accountId: identity.accountId, handle: identity.handle, expiresAt: identity.expiresAt, economyReady: true });
  }
  if(req.identity && req.method==='POST' && ['/api/trade','/api/economy/command','/api/market'].includes(pathname)) await ECONOMY.consumeRate('economy:'+req.identity.accountId,120,60000);
  // ENG-09 Y-1: okuma limiti POST kovasından ayrı ('read:'); aşımda aynı 429 { error: 'rate_limited' }.
  if(req.method==='GET' && READ_RATE_PATHS.has(pathname)) {
    if(req.identity) consumeReadRate('read:'+req.identity.accountId,READ_RATE.account);
    else consumeReadRate('read-ip:'+req.socket.remoteAddress,READ_RATE.ip);
  }
  if (pathname.startsWith('/api/trade') && req.headers['x-trade-account'] && req.headers['x-trade-account'] !== req.identity?.accountId) return sendJson(res,409,{ok:false,error:'trade_account_changed'});
  if (pathname === '/api/trade/state' && req.method === 'GET') {
    if(!req.identity)return sendJson(res,401,{ok:false,error:'guest_session_required'});
    const trade=await ECONOMY.currentTrade(req.identity.accountId);
    const economy=await ECONOMY.readEconomy(req.identity.accountId);
    const labels={};
    if(trade) for(const p of trade.participants) {
      const snapshot=p===req.identity.accountId?economy:await ECONOMY.readEconomy(p);
      for(const kind of ['items','dragons','eggs']) for(const asset of snapshot?.[kind] || []) {
        if(trade.offers[p][kind].includes(asset.assetId)) labels[asset.assetId]=String(asset.data.name || asset.data.id || kind).slice(0,100);
      }
    }
    return sendJson(res,200,{ok:true,accountId:req.identity.accountId,trade,economy,labels,serverNow:Date.now()});
  }
  if (pathname === '/api/trade/peers' && req.method === 'GET') {
    if(!req.identity)return sendJson(res,401,{ok:false,error:'guest_session_required'});
    return sendJson(res,200,{ok:true,peers:await ECONOMY.listPeers(req.identity.accountId)});
  }
  if (pathname === '/api/trade' && req.method === 'POST') {
    if (!req.identity) return sendJson(res, 401, { ok: false, error: 'guest_session_required' });
    const command = await readJsonBody(req, false, 16384);
    try {
      const result = await ECONOMY.executeTrade(req.identity.accountId, command);
      for (const peer of WS_CLIENTS) if (result.trade.participants.includes(peer.playerInfo?.accountId) && !peer.destroyed) peer.write(encodeWsFrame({ type: 'trade_state', ...result }));
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) { return sendJson(res, error.status || (error.code ? 409 : 503), { ok: false, error: error.code || 'trade_unavailable' }); }
  }
  if (pathname === '/api/economy/command' && req.method === 'POST') {
    if(req.headers['x-trade-account'] && req.headers['x-trade-account'] !== req.identity?.accountId)return sendJson(res,409,{ok:false,error:'trade_account_changed'});
    if (!req.identity) return sendJson(res, 401, { ok: false, error: 'guest_session_required' });
    const command = await readJsonBody(req, false, 8192);
    const applied = await ECONOMY.executeCommand(req.identity.accountId, command);
    // ENG-10 (O-7): ilan önizlemesi değiştiyse okuma önbelleği bırakılır ve açık Bedesten ekranları yenilenir.
    if (applied.listingsRefreshed) marketChanged(null);
    return sendJson(res, 200, { ok: true, ...applied });
  }
  if (pathname === '/api/economy') {
    if (!req.identity) return sendJson(res, 401, { ok: false, error: 'guest_session_required' });
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'economy_read_only' });
    // ENG-10: istemci sunucu kesesine bağlı (economyReady). `week` salt okunur hafta/borç görünümüdür (ENG-12: bilet yok).
    const economy = await ECONOMY.readEconomy(req.identity.accountId);
    return sendJson(res, 200, { ok: true, economyReady: true, commandApiReady: true, commands: COMMAND_TYPES, economy, week: weekStatus(economy && economy.game, Date.now()) });
  }
  if (pathname.startsWith('/api/') && req.method === 'POST' && !pathname.startsWith('/api/auth/') && !req.identity) {
    return sendJson(res, 401, { ok: false, error: 'guest_session_required' });
  }


  // 1. Resmi X (Twitter) OAuth 2.0 PKCE Giriş Başlatma (/api/auth/x/login)
  if (pathname === '/api/auth/x/login' && req.method === 'GET') {
    pruneOauthStates();
    const state = crypto.randomBytes(16).toString('hex');
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    OAUTH_STATES.set(state, { verifier, createdAt: Date.now() });

    if (!X_CLIENT_ID) {
      // Simülasyon girişi yalnızca yerel geliştirmede (localhost) açıktır
      if (!isLocalRequest(req)) {
        res.writeHead(302, { Location: '/?x_error=not_configured' });
        return res.end();
      }
      res.writeHead(302, { Location: `/api/auth/x/callback?state=${state}&mock=1` });
      return res.end();
    }

    const redirectUri = `${PUBLIC_URL}/api/auth/x/callback`;
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(X_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('tweet.read users.read')}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  // 2. X OAuth 2.0 Callback (/api/auth/x/callback) — kod/token değişimi + gerçek handle doğrulaması
  if (pathname === '/api/auth/x/callback' && req.method === 'GET') {
    const state = parsedUrl.searchParams.get('state') || '';
    const isMock = parsedUrl.searchParams.get('mock') === '1';
    const stored = OAUTH_STATES.get(state);
    OAUTH_STATES.delete(state);
    const fail = (code) => { res.writeHead(302, { Location: `/?x_error=${code}` }); return res.end(); };

    if (!stored || Date.now() - stored.createdAt > OAUTH_TTL_MS) return fail('bad_state');

    // Simülasyon: yalnızca X_CLIENT_ID yokken VE yerel istekte geçerli
    if (isMock) {
      if (X_CLIENT_ID || !isLocalRequest(req)) return fail('mock_disabled');
      const raw = parsedUrl.searchParams.get('handle') || '@ejder_ustasi';
      const mockHandle = normalizeHandle(raw);
      res.writeHead(302, {
        'Set-Cookie': makeSessionCookie(mockHandle),
        Location: `/?x_verified=1&x_handle=${encodeURIComponent(mockHandle)}`,
      });
      return res.end();
    }

    if (!X_CLIENT_ID || !X_CLIENT_SECRET) return fail('not_configured');
    const code = parsedUrl.searchParams.get('code');
    if (parsedUrl.searchParams.get('error') || !code) return fail('denied');

    try {
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${PUBLIC_URL}/api/auth/x/callback`,
          code_verifier: stored.verifier,
          client_id: X_CLIENT_ID,
        }).toString(),
      });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenJson.access_token) {
        console.error('X token hatası:', tokenRes.status, tokenJson.error || '');
        return fail('token');
      }
      const meRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const meJson = await meRes.json().catch(() => ({}));
      const username = meJson && meJson.data && meJson.data.username;
      if (!meRes.ok || !username) {
        console.error('X users/me hatası:', meRes.status);
        return fail('profile');
      }
      const handle = normalizeHandle(username);
      res.writeHead(302, {
        'Set-Cookie': makeSessionCookie(handle),
        Location: `/?x_verified=1&x_handle=${encodeURIComponent(handle)}`,
      });
      return res.end();
    } catch (e) {
      console.error('X OAuth hatası:', e.message);
      return fail('network');
    }
  }

  // 2b. GET /api/auth/me — oturum çerezindeki doğrulanmış handle
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, handle: getSessionHandle(req), enabled: !!X_CLIENT_ID || isLocalRequest(req) });
  }

  // 2c. POST /api/auth/logout — oturumu kapat
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', makeSessionCookie('', true));
    return sendJson(res, 200, { ok: true });
  }

  // 3. GET /api/state — Küresel sunucu durumunu getir
  if (pathname === '/api/state' && req.method === 'GET') {
    const handle = req.identity ? req.identity.handle : null;
    const myRaids = WORLD.raidLog.filter(r => r.target === handle || r.attacker === handle).slice(-12);
    return sendJson(res, 200, {
      ok: true,
      onlineCount: Math.max(1, WS_CLIENTS.size),
      oauthConfigured: !!X_CLIENT_ID,
      peers: getActiveHubPeers(),
      codex: WORLD.codex,
      pageant: WORLD.pageant,
      banners: WORLD.banners,
      caravans: WORLD.caravans,
      worldBoss: WORLD.worldBoss,
      chatLog: WORLD.chatLog.slice(-15),
      myRaids,
    });
  }

  // 4. POST /api/sync — Oyuncunun ocağını, savunma bonusunu, yıldız ejderhasını ve sancağını senkronize et
  if (pathname === '/api/sync' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (['gold', 'inv', 'inventory', 'dragons', 'eggs', 'assets', 'balances'].some(key => Object.hasOwn(body, key))) {
      return sendJson(res, 400, { ok: false, error: 'economy_snapshot_not_accepted' });
    }
    const handle = req.identity.handle;
    const existing = WORLD.players[handle] || {};
    const ownsHandle = existing.accountId === req.identity.accountId;
    // X ile doğrulanmış (veya tohum) bir handle'ı yalnızca oturum sahibi güncelleyebilir
    if (existing.verified && !ownsHandle) {
      return sendJson(res, 403, { ok: false, error: 'handle_verified_owner_only' });
    }
    WORLD.players[handle] = {
      ...existing,
      handle,
      accountId: req.identity.accountId,
      verified: !!getSessionHandle(req),
      guild: body.guild || existing.guild || 'Kızıl Ocak Birliği',
      title: body.title || existing.title || 'Ocak Ustası',
      un: Number(body.un) || existing.un || 0,
      wins: Number(body.wins) || existing.wins || 0,
      defenseBonus: Number(body.defenseBonus) || existing.defenseBonus || 12,
      star: body.star || existing.star || null,
      duelFighter: DUEL_SERVER.cleanFighter(body.duelFighter, body.star || existing.star) || existing.duelFighter || null,
      chibi: body.chibi || existing.chibi || null,
      hubChat: body.hubChat || existing.hubChat || null,
      hubPose: body.hubPose || existing.hubPose || 'P1',
      updatedAt: Date.now(),
    };

    if (body.codex && typeof body.codex === 'object') {
      for (const hk of Object.keys(body.codex)) {
        if (!WORLD.codex[hk]) {
          WORLD.codex[hk] = body.codex[hk];
          wsBroadcast({ type: 'codex_new', item: body.codex[hk] });
        }
      }
    }

    if (body.regionCount && typeof body.regionCount === 'object') {
      for (const rk of Object.keys(body.regionCount)) {
        const cnt = Number(body.regionCount[rk]) || 0;
        const cur = WORLD.banners[rk] || { count: 1 };
        if (cnt >= (cur.count || 2)) {
          WORLD.banners[rk] = { owner: handle, guild: WORLD.players[handle].guild, count: cnt };
        }
      }
    }

    saveWorld();
    return sendJson(res, 200, {
      ok: true,
      handle,
      peers: getActiveHubPeers(),
      codex: WORLD.codex,
      banners: WORLD.banners,
      caravans: WORLD.caravans,
      worldBoss: WORLD.worldBoss,
    });
  }

  // 5. POST /api/caravans — Lonca Kervanı Başlat veya Rakip Kervana Baskın Kaydet
  if (pathname === '/api/caravans' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body.action === 'escort' && body.handle && body.star) {
      const cvId = 'cv_' + body.handle.replace(/[^a-z0-9]/gi, '');
      const existingIdx = WORLD.caravans.findIndex(c => c.id === cvId);
      const newCv = {
        id: cvId,
        guild: body.guild || 'Kızıl Ocak Birliği',
        owner: body.handle,
        route: body.route || 'Kül Vadisi → Kervansaray Meydanı',
        cargo: Number(body.cargo) || 175,
        foodReward: body.foodReward || 'ziyafet',
        guardName: body.star.name || 'Kor',
        guardEl: body.star.el || 'ates',
        guardPower: Math.round(((body.star.st.gu || 50) + (body.star.st.da || 50) + (body.star.st.ce || 50)) / 3),
        raidedBy: [],
      };
      if (existingIdx >= 0) WORLD.caravans[existingIdx] = newCv;
      else WORLD.caravans.unshift(newCv);
      WORLD.caravans = WORLD.caravans.slice(0, 8);
    } else if (body.action === 'raid' && body.caravanId && body.attacker) {
      const cv = WORLD.caravans.find(c => c.id === body.caravanId);
      if (cv && !cv.raidedBy.includes(body.attacker)) {
        cv.raidedBy.push(body.attacker);
      }
    }
    saveWorld();
    wsBroadcast({ type: 'caravans_update', caravans: WORLD.caravans });
    return sendJson(res, 200, { ok: true, caravans: WORLD.caravans });
  }

  // 6. POST /api/pageant — Saray Zarafet Merasimi skoru gönder veya oy ver
  if (pathname === '/api/pageant' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body.action === 'vote' && body.targetHandle) {
      const row = WORLD.pageant.find(p => p.handle === body.targetHandle);
      if (row) row.votes = (row.votes || 0) + 1;
    } else if (body.handle && body.score) {
      const idx = WORLD.pageant.findIndex(p => p.handle === body.handle);
      const entry = {
        handle: body.handle,
        trainer: body.guild || 'Ocak Ustası',
        dName: body.dName || 'Kor',
        score: Number(body.score) || 100,
        votes: idx >= 0 ? WORLD.pageant[idx].votes + 1 : 5,
        title: body.title || 'Asil Ejderha',
        el: body.el || 'ates',
      };
      if (idx >= 0) {
        if (entry.score >= WORLD.pageant[idx].score) WORLD.pageant[idx] = entry;
      } else {
        WORLD.pageant.push(entry);
      }
      WORLD.pageant.sort((a, b) => b.score - a.score);
      WORLD.pageant = WORLD.pageant.slice(0, 12);
    }
    saveWorld();
    wsBroadcast({ type: 'pageant_update', pageant: WORLD.pageant });
    return sendJson(res, 200, { ok: true, pageant: WORLD.pageant });
  }

  // 7. POST /api/boss — Kül Yutan Dünya Boss'una saldırı kaydı
  if (pathname === '/api/boss' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const dmg = Math.max(10, Math.min(3500, Number(body.dmg) || 120));
    const h = String(body.handle || '@ejder_ocagi');
    const B = WORLD.worldBoss;
    B.hp = Math.max(0, B.hp - dmg);
    let defeated = false;
    if (B.hp === 0) {
      defeated = true;
      B.phase = (B.phase || 1) + 1;
      B.maxHp = Math.round(B.maxHp * 1.25);
      B.hp = B.maxHp;
    }
    B.contributors[h] = B.contributors[h] || { handle: h, guild: body.guild || 'Kızıl Ocak Birliği', dName: body.dName || 'Kor', dmg: 0 };
    B.contributors[h].dmg += dmg;
    B.contributors[h].dName = body.dName || B.contributors[h].dName;
    saveWorld();
    wsBroadcast({ type: 'boss_state', worldBoss: B, lastHit: { handle: h, dName: body.dName, dmg, defeated } });
    return sendJson(res, 200, { ok: true, worldBoss: B, defeated });
  }

  // 8. POST /api/raid-ocak — Asenkron Ocak Baskını & Rövanş Sonucu Kaydet
  if (pathname === '/api/raid-ocak' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body.revengeId) {
      const orig = WORLD.raidLog.find(r => r.id === body.revengeId);
      if (orig) orig.revenged = true;
    }
    const logItem = {
      id: 'rd_' + Date.now(),
      attacker: body.attacker || '@ejder_ocagi',
      attackerDragon: body.attackerDragon || 'Kor',
      target: body.target || '@kuzey_ruzgari',
      targetDragon: body.targetDragon || 'Bora',
      won: !!body.won,
      goldStolen: Number(body.goldStolen) || 45,
      revenged: false,
      ts: Date.now(),
    };
    WORLD.raidLog.push(logItem);
    if (WORLD.raidLog.length > 60) WORLD.raidLog.shift();
    saveWorld();
    wsBroadcast({ type: 'raid_event', logItem });
    return sendJson(res, 200, { ok: true, logItem, raidLog: WORLD.raidLog.slice(-12) });
  }

  // 8b. GET & POST /api/market — Canlı Oyuncu Bedesteni (Marketplace)
  if (pathname === '/api/market' && req.method === 'GET') {
    try {
      const view = await MARKET_READS.view(req.identity?.accountId || null);
      return sendJson(res, 200, { ok: true, settlementReady: true, ...view, serverNow: Date.now() });
    } catch (_) { return sendJson(res, 503, { ok: false, error: 'market_unavailable' }); }
  }
  if (pathname === '/api/market' && req.method === 'POST') {
    // Kimlik yalnız oturumdan; gövdeye satıcı/alıcı alanı enjekte edilmez (katı şema).
    try {
      const body = await readJsonBody(req, false, 4096);
      const result = await MARKET.execute(req.identity, body);
      marketChanged(result.listing?.id);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      // Kodsuz hata (depo/ağ) belirsizdir: 503 → istemci aynı gövdeyle yeniden dener, başarı göstermez.
      const known = Number.isInteger(error.status);
      return sendJson(res, known ? error.status : 503, { ok: false, error: known ? (error.code || error.message) : 'market_unavailable' });
    }
  }

  // 9. GET /share/card/:handle.svg — Dinamik SVG Görsel Kartı
  if (pathname.startsWith('/share/card/') && pathname.endsWith('.svg')) {
    const raw = decodeURIComponent(pathname.replace('/share/card/', '').replace('.svg', ''));
    const handle = raw.startsWith('@') ? raw : '@' + raw;
    const svg = buildDynamicCardSvg(handle);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(svg);
  }

  // 10. GET /share/:handle — X (Twitter) OpenGraph Önizleme Kartı Sayfası
  if (pathname.startsWith('/share/')) {
    const h = decodeURIComponent(pathname.replace('/share/', ''));
    const handle = normalizeHandle(h);
    const p = WORLD.players[handle] || Object.values(WORLD.players)[0];
    const dName = escHtml(p && p.star ? p.star.name : 'Kor');
    const guild = escHtml(p ? p.guild : 'Kızıl Ocak Birliği');
    const eHandle = escHtml(handle);
    // X kartları SVG göstermez; bu yüzden WebP/PNG/JPG bir kapak görseli kullanılır
    const ogImage = `${PUBLIC_URL}/img/bg-arena.webp`;
    const ogTitle = `${eHandle} (${guild}) seni Ejder Ocağı'nda düelloya çağırıyor!`;
    const ogDesc = `Muhafız Ejderha: ${dName} · Ocağı ziyaret et, soy kütüğünü incele veya kendi ejderhanla meydan oku!`;
    const html = `<!doctype html><html lang="tr"><head>
      <meta charset="utf-8">
      <title>${eHandle} · ${dName} — Ejder Ocağı Online</title>
      <meta property="og:site_name" content="Ejder Ocağı Online">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${PUBLIC_URL}/share/${encodeURIComponent(handle)}">
      <meta property="og:title" content="${ogTitle}">
      <meta property="og:description" content="${ogDesc}">
      <meta property="og:image" content="${ogImage}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${ogTitle}">
      <meta name="twitter:description" content="${ogDesc}">
      <meta name="twitter:image" content="${ogImage}">
      <meta http-equiv="refresh" content="0;url=/?challenge=${encodeURIComponent(handle)}">
    </head><body style="background:#120c08;color:#f5e7d0;font-family:serif;text-align:center;padding:40px">
      <h2>${eHandle} Ocağına Yönlendiriliyorsun...</h2>
    </body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // 10b. Ana sayfa: OpenGraph etiketlerindeki mutlak adres için PUBLIC_URL yerleştirilir
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const raw = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').split('__PUBLIC_URL__').join(PUBLIC_URL);
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'], 'Cache-Control': 'no-cache' });
      return res.end(raw);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Bulunamadı');
    }
  }

  // 11. Statik Dosya Sunucusu (Cache-Control + ETag ile %95 Trafik Tasarrufu)
  const fullPath = publicFile(pathname);

  if (fullPath) {
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
      const isMedia = ext === '.webp' || ext === '.png' || ext === '.jpg' || ext === '.svg' || ext === '.mp3';
      const cacheControl = isMedia
        ? 'public, max-age=604800'
        : (ext === '.js' || ext === '.css')
          ? 'public, max-age=3600'
          : 'no-cache';

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { 'Cache-Control': cacheControl, 'ETag': etag });
        return res.end();
      }

      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': cacheControl,
        'ETag': etag,
      });
      return fs.createReadStream(fullPath).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Bulunamadı');
}

const server = http.createServer((req, res) => {
  if(shuttingDown)return sendJson(res,503,{ok:false,error:'server_shutting_down'});
  track(handleHttp(req, res)).catch(error => {
    if (!res.headersSent) sendJson(res, error.status || 500, { ok: false, error: error.status ? error.message : 'internal_error' });
    else res.end();
  });
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    if(shuttingDown){socket.destroy();return;}
    track(handleWsUpgrade(req, socket, head)).catch(() => socket.destroy());
  } else {
    socket.destroy();
  }
});

let shuttingDown = false;
let cleaningTrades = false, tradeMigrationCursor = null, tradeMigrationDone = !ECONOMY.migrateTradeExpiry;
async function cleanExpiredTrades() {
  if(cleaningTrades || shuttingDown)return;
  cleaningTrades=true;
  try {
    if(!tradeMigrationDone) { tradeMigrationCursor=await ECONOMY.migrateTradeExpiry(tradeMigrationCursor);tradeMigrationDone=tradeMigrationCursor===null; }
    await ECONOMY.expireTrades(50);
    await ECONOMY.compactTradeReceipts(50);
    await ECONOMY.pruneServiceState(50);
  } catch(error) { console.error('Trade cleanup failed:',error.message); }
  finally { cleaningTrades=false; }
}
const tradeCleanupTimer=setInterval(()=>track(cleanExpiredTrades()),15000);tradeCleanupTimer.unref();
track(cleanExpiredTrades());
async function handleGracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(tradeCleanupTimer);
  for (const socket of WS_CLIENTS) socket.destroy();
  console.log(`[${signal}] Alındı — world.json diske kaydediliyor ve sunucu kapatılıyor...`);
  flushWorldSync(WORLD);
  const deadline = setTimeout(() => process.exit(1), 8000);
  deadline.unref();
  const closed = new Promise(resolve => server.close(resolve));
  try {
    await closed;
    // Drain HTTP, WS, presence and cleanup tasks before terminating the DB client.
    while(inFlight.size) await Promise.allSettled([...inFlight]);
    await ECONOMY.close(); process.exit(0);
  } catch (_) { process.exit(1); }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🔥 EJDER OCAĞI ONLINE v2.5 SUNUCUSU ÇALIŞIYOR!`);
    console.log(`🌐 Oyun Adresi : http://localhost:${PORT}`);
    console.log(`⚡ WebSocket   : ws://localhost:${PORT}/ws`);
    console.log(`🐦 X OAuth 2.0 : http://localhost:${PORT}/api/auth/x/login`);
    console.log(`====================================================`);
  });
}

module.exports = { server, WORLD, buildDynamicCardSvg };
