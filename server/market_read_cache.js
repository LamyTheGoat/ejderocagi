'use strict';
// ENG-09 Y-1 · GET /api/market okuma önbelleği.
// Yalnız herkese açık "open" ilan sayfası (hesaptan bağımsız sorgu) kısa süre paylaşılır.
// Hesaba özgü alanlar (mine, assetId, sales) her istekte publicListing(…, actor) ile ayrıca üretilir;
// "mine" sorgusu hiç önbelleğe alınmaz. Ham kayıt (sellerId dahil) yalnız sunucu belleğinde kalır.
// Geçersiz kılma: invalidate() nesli artırır; uçuştaki eski okuma sonucu önbelleğe yazılmaz.
// Çok örnekte başka örneğin değişikliği en çok ttlMs kadar gecikmeyle görünür.
function createMarketReadCache({ store, publicListing, ttlMs = 2500, now = Date.now }) {
  let entry = null, inflight = null, generation = 0;
  const stats = { hits: 0, misses: 0 };
  function readOpen() {
    if (ttlMs > 0 && entry && entry.generation === generation && now() < entry.expiresAt) { stats.hits++; return Promise.resolve(entry.open); }
    if (ttlMs > 0 && inflight && inflight.generation === generation) { stats.hits++; return inflight.promise; }
    stats.misses++;
    const gen = generation;
    const promise = Promise.resolve(store.listMarketRaw(null)).then(raw => {
      if (ttlMs > 0 && gen === generation) entry = { open: raw.open, generation: gen, expiresAt: now() + ttlMs };
      return raw.open;
    }).finally(() => { if (inflight && inflight.promise === promise) inflight = null; });
    if (ttlMs > 0) inflight = { generation: gen, promise };
    return promise;
  }
  async function view(actor) {
    const [open, mine] = await Promise.all([
      readOpen(),
      actor ? Promise.resolve(store.listMarketRaw(actor, { open: false })).then(raw => raw.mine) : [],
    ]);
    return { listings: open.map(l => publicListing(l, actor)), mine: mine.map(l => publicListing(l, actor)) };
  }
  function invalidate() { generation++; entry = null; inflight = null; }
  return { view, invalidate, stats };
}
module.exports = { createMarketReadCache };
