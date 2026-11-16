'use strict';
// Arkadaş listesi ve özel mesaj (Ejder Ocağı 2.0, 2026-11-16).
// Ekonomiye dokunmaz. Her hesabın küçük bir sosyal kaydı vardır (depo: getSocial / putSocial):
//   { ad, dost: { <hesap>: { h, ad } }, gelen: { <hesap>: { h, ad, t } }, giden: { <hesap>: t } }
// Arkadaşlık karşılıklıdır: istek gider, karşı taraf kabul edince iki kayıtta da "dost" olur. İki taraf aynı anda istek
// yollamışsa ikinci istek kabul sayılır. Özel mesaj (fısıltı) yalnız arkadaşlar arasında, yalnız ikisi de çevrimiçiyken
// iletilir ve saklanmaz; metin alan sohbetiyle aynı süzgeçten geçer (server/meydan_presence.js temizSoz).
// Kimlik her zaman oturumdan gelir; gövdedeki kimlik alanları yok sayılır.
const { temizAd, temizSoz } = require('./meydan_presence');

const DOST_MAX = 100, BEKLEYEN_MAX = 30;
const hata = (code, status = 400) => Object.assign(new Error(code), { code, status });
const bos = () => ({ ad: '', dost: {}, gelen: {}, giden: {} });
const HESAP = /^[a-f0-9-]{36}$/i, AD = /^@[^\s]{2,40}$/;

function createSocial({ store, send, sockets, now = () => Date.now() }) {
  const oku = async id => { const k = await store.getSocial(id); return k && typeof k === 'object' ? Object.assign(bos(), k) : bos(); };
  const yaz = (id, k) => store.putSocial(id, k);
  const soketler = id => [...sockets()].filter(s => !s.destroyed && s.playerInfo && s.playerInfo.accountId === id);
  const durt = id => { for (const s of soketler(id)) send(s, { type: 'sosyal' }); };
  const cevrimici = id => soketler(id).length > 0;
  function gorunum(k) {
    const liste = (o, ek) => Object.entries(o).map(([id, v]) => Object.assign({ id, h: v.h || '', ad: v.ad || 'Gezgin' }, ek ? ek(id, v) : {}));
    return { ad: k.ad, dostlar: liste(k.dost, id => ({ cevrimici: cevrimici(id) })).sort((a, b) => (b.cevrimici - a.cevrimici) || a.ad.localeCompare(b.ad, 'tr')), gelen: liste(k.gelen), giden: Object.keys(k.giden).length };
  }
  async function komut(identity, body) {
    const ben = identity.accountId, b = body && typeof body === 'object' ? body : {}, k = await oku(ben);
    if (b.type === 'ad') { k.ad = temizAd(b.ad); await yaz(ben, k); return gorunum(k); }
    if (b.type === 'istek') {
      if (typeof b.to !== 'string' || !AD.test(b.to) || b.to === identity.handle) throw hata('social_invalid_target');
      const hedef = await store.findAccountByHandle(b.to); if (!hedef) throw hata('social_target_not_found', 404);
      if (k.dost[hedef]) throw hata('social_already_friends', 409);
      if (Object.keys(k.dost).length >= DOST_MAX) throw hata('social_friend_limit', 409);
      const o = await oku(hedef);
      if (k.gelen[hedef]) return kabul(ben, identity, k, hedef, o);   // o da bana istek yollamış: kabul say
      if (Object.keys(k.giden).length >= BEKLEYEN_MAX || Object.keys(o.gelen).length >= BEKLEYEN_MAX) throw hata('social_pending_limit', 409);
      k.giden[hedef] = now(); o.gelen[ben] = { h: identity.handle, ad: k.ad || temizAd(b.ad), t: now() };
      await yaz(ben, k); await yaz(hedef, o); durt(hedef); return gorunum(k);
    }
    if (!HESAP.test(String(b.id || ''))) throw hata('social_invalid_target');
    const o = await oku(b.id);
    if (b.type === 'kabul') { if (!k.gelen[b.id]) throw hata('social_no_request', 404); return kabul(ben, identity, k, b.id, o); }
    if (b.type === 'red') { delete k.gelen[b.id]; delete o.giden[ben]; await yaz(ben, k); await yaz(b.id, o); return gorunum(k); }
    if (b.type === 'sil') { delete k.dost[b.id]; delete o.dost[ben]; delete k.giden[b.id]; delete o.gelen[ben]; await yaz(ben, k); await yaz(b.id, o); durt(b.id); return gorunum(k); }
    throw hata('social_invalid_command');
  }
  async function kabul(ben, identity, k, hedef, o) {
    if (Object.keys(k.dost).length >= DOST_MAX || Object.keys(o.dost).length >= DOST_MAX) throw hata('social_friend_limit', 409);
    const g = k.gelen[hedef] || {}; delete k.gelen[hedef]; delete k.giden[hedef]; delete o.giden[ben]; delete o.gelen[ben];
    const oh = g.h || (soketler(hedef)[0] && soketler(hedef)[0].playerInfo.handle) || '';
    k.dost[hedef] = { h: oh, ad: g.ad || o.ad || 'Gezgin' }; o.dost[ben] = { h: identity.handle, ad: k.ad || 'Gezgin' };
    await yaz(ben, k); await yaz(hedef, o); durt(hedef); return gorunum(k);
  }
  async function durum(identity) { return gorunum(await oku(identity.accountId)); }
  /* özel mesaj: yalnız arkadaşa, ikisi de çevrimiçiyken; iki söz arası 1 sn, otuz saniyede on söz */
  async function onMessage(socket, msg) {
    if (!msg || msg.type !== 'ozel') return false;
    const ben = socket.playerInfo && socket.playerInfo.accountId; if (!ben) return true;
    const t = now(); socket.ozelZ = (socket.ozelZ || []).filter(z => t - z < 30000);
    if ((socket.ozelZ.length && t - socket.ozelZ[socket.ozelZ.length - 1] < 1000) || socket.ozelZ.length >= 10) { send(socket, { type: 'ozel_red', neden: 'hiz' }); return true; }
    const to = String(msg.to || ''), x = temizSoz(msg.x); if (!HESAP.test(to) || !x) return true;
    const k = await oku(ben); if (!k.dost[to]) { send(socket, { type: 'ozel_red', neden: 'dost_degil', to }); return true; }
    const hedefler = soketler(to); if (!hedefler.length) { send(socket, { type: 'ozel_red', neden: 'cevrimdisi', to }); return true; }
    socket.ozelZ.push(t);
    for (const s of hedefler) send(s, { type: 'ozel', from: ben, h: socket.playerInfo.handle, ad: k.ad || 'Gezgin', x });
    send(socket, { type: 'ozel', to, x, ben: true });
    return true;
  }
  return { komut, durum, onMessage };
}

module.exports = { createSocial, DOST_MAX, BEKLEYEN_MAX };
