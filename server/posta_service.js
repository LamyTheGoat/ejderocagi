'use strict';
// Ocak Postası (2026-11-20, eo2/docs/GERI_CAGIRMA_KARARI.md): oyuncu yokken başka oyuncuların yaptıkları.
// YALNIZ OKUR. Satış altını Bedesten'de satış anında aktarılmıştır (market_service.marketTransition); posta ödül vermez,
// hiçbir sayıyı değiştirmez, yeni yazma yolu açmaz. Okundu bilgisi istemcide tutulur.
// Kaynaklar: satıcının kendi ilanları (store.listMarketRaw(actor, { open: false }).mine) ve sosyal kayıttaki gelen istekler.
// Kimlik yalnız oturumdan gelir; başka hesabın postası istenemez.
const GUN_MS = 24 * 60 * 60 * 1000;
const POSTA = Object.freeze({ gun: 14, enCok: 30 });
const sayi = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
const yazi = (s, n) => String(s == null ? '' : s).slice(0, n);

// Saf: ham ilanlar + sosyal kayıt → posta satırları (yeniden eskiye).
function postaKur({ mine, sosyal, now }) {
  const sinir = now - POSTA.gun * GUN_MS, satirlar = [];
  for (const l of Array.isArray(mine) ? mine : []) {
    if (!l || !Array.isArray(l.sales)) continue;
    for (const s of l.sales) {
      if (!s || typeof s.id !== 'string' || !(s.at >= sinir) || s.at > now + 60000) continue;
      satirlar.push({ id: 'satis:' + s.id, tur: 'satis', t: s.at, ne: yazi(l.title, 100), cins: l.kind, yem: l.kind === 'food' ? yazi(l.foodKey, 30) : null,
        adet: sayi(s.quantity), altin: sayi(s.total), alici: s.buyer ? yazi(s.buyer, 42) : null, bitti: l.status === 'sold' && l.sales[0] === s });
    }
  }
  const gelen = sosyal && sosyal.gelen && typeof sosyal.gelen === 'object' ? sosyal.gelen : {};
  for (const v of Object.values(gelen)) {
    if (!v || typeof v !== 'object') continue;
    const t = Number.isSafeInteger(v.t) ? v.t : 0;
    if (t && t < sinir) continue;
    satirlar.push({ id: 'dost:' + yazi(v.h, 42) + ':' + t, tur: 'dost', t, h: yazi(v.h, 42), ad: yazi(v.ad || 'Gezgin', 40) });
  }
  satirlar.sort((a, b) => b.t - a.t || (a.id < b.id ? -1 : 1));
  return satirlar.slice(0, POSTA.enCok);
}

function createPosta({ store, now = () => Date.now() }) {
  async function durum(identity) {
    if (!identity?.accountId) throw Object.assign(new Error('guest_session_required'), { code: 'guest_session_required', status: 401 });
    const id = identity.accountId;
    const [raw, sosyal] = await Promise.all([store.listMarketRaw(id, { open: false }), store.getSocial(id)]);
    const t = now();
    return { satirlar: postaKur({ mine: raw && raw.mine, sosyal, now: t }), serverNow: t };
  }
  return { durum };
}

module.exports = { createPosta, postaKur, POSTA };
