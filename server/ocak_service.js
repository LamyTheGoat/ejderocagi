'use strict';
// Ocak defteri · 2.0'ın yerel ocağı ile hesabın sunucu defteri arasındaki bağ (2026-11-15, kullanıcı kararı:
// yerel ocak SIFIRLANMAZ, sunucu defterine İÇE AKTARILIR).
//
// Tek komut: ocak.sync { body }   (/api/economy/command; makbuzlu, sürüm denetimli, tek transaction)
//   body = { ocak, ej:[{id,d}], yu:[{id,d}], ejIds:[…], yuIds:[…], birak:[assetId…], yem:{anahtar:adet} }
//
// İKİ TÜR VARLIK
//   AYNA (yerel kökenli): oyuncunun yerel ocağında doğan, alınan, yakalanan ejderha ve yumurtalar. Sunucu bunları
//     istemcinin BEYANIYLA tutar; doğrulayamaz. Bu yüzden her ayna `funding: 'bound'` (hesaba bağlı) ve `yerel` damgalıdır:
//     Bedesten'e konamaz, takas edilemez, sunucu komutlarıyla altına çevrilemez, ödüllü düelloya giremez. Kimlik
//     (ocak kimliği + yerel kimlik) üzerinden güncellenir: aynı ejderha kaç kez, kaç sekmeden, hangi eski kayıttan
//     gönderilirse gönderilsin TEK satırdır (çoğalmaz). Yerelde ölen/satılan ejderha `ejIds` listesinden düşer, ayna silinir.
//   SUNUCU KÖKENLİ (kazanılmış): Bedesten'den ya da takasla gelen varlıklar. Gerçeği sunucudadır; istemci verisiyle
//     GÜNCELLENMEZ (yerel antrenman satılan kopyaya yansımaz). İstemci yalnız "ocaktan çıktı" diyebilir (`birak`):
//     varlık defterden silinir, karşılığında sunucu altın YAZMAZ. Yem tek yönlü teslim alınır (`yem`): yalnız kazanılmış
//     kovadan düşer, yerel kilere girer; geri konamaz.
//   TABAN: bağlanma anında defterde zaten duran varlıklar (sunucunun başlangıç armağanı, eski oyunun defteri). Dokunulmaz,
//     yerel ocağa kopyalanmaz.
//
// Kaynak politikası (economy_sources.js) değişmedi; bu dosya altın yazmaz ve altın düşmez.
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const clone = v => JSON.parse(JSON.stringify(v));
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const TYPES = new Set(['ocak.sync']);
const LIMIT = Object.freeze({ dragons: 80, eggs: 60, dragonJson: 9000, eggJson: 5000, release: 200 });
const STAGES = ['yavru', 'genc', 'yetiskin'];
const STATS = ['gu', 'ce', 'da', 'ze'];

const num = (v, lo, hi, def) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
// Ayna satırı: istemcinin gönderdiği ejderha, sunucu kural kodunun okuyabileceği asgari biçime getirilir. Yerel kimliklere
// bağlı alanlar (kuşam, görev, ebeveyn kimliği) aynaya taşınmaz.
function mirrorDragon(d, api) {
  if (!plain(d) || !plain(d.st) || !plain(d.genes) || JSON.stringify(d).length > LIMIT.dragonJson) fail('ocak_dragon_invalid', 400);
  if (typeof d.name !== 'string' || !d.name || d.name.length > 40 || !Object.hasOwn(api.EL_AD, d.el) || !STAGES.includes(d.stage)) fail('ocak_dragon_invalid', 400);
  const row = clone(d);
  for (const k of ['id', 'assetId', 'funding', 'srv', 'pids', 'task', 'tradeLocked', 'busy', 'role', 'yerel', 'yerelId']) delete row[k];
  for (const k of STATS) row.st[k] = num(d.st[k], 0, 5000, 10);
  Object.assign(row, { equip: { bas: null, govde: null, pence: null, tilsim: null }, task: null, dead: false,
    traits: Array.isArray(d.traits) ? d.traits.filter(t => typeof t === 'string').slice(0, 12) : [],
    cards: Array.isArray(d.cards) ? d.cards.filter(t => typeof t === 'string').slice(0, 3) : [],
    pers: plain(d.pers) ? { ces: num(d.pers.ces, -100, 100, 0), sic: num(d.pers.sic, -100, 100, 0), dis: num(d.pers.dis, -100, 100, 0) } : { ces: 0, sic: 0, dis: 0 },
    bond: num(d.bond, 0, 100, 0), mood: num(d.mood, 0, 4, 2), fat: num(d.fat, 0, 100, 0), inj: num(d.inj, 0, 99, 0), age: num(d.age, 0, 9999, 0),
    w: num(d.w, 0, 1e6, 0), l: num(d.l, 0, 1e6, 0), gen: num(d.gen, 1, 9999, 1) });
  return row;
}
function mirrorEgg(e) {
  if (!plain(e) || JSON.stringify(e).length > LIMIT.eggJson) fail('ocak_egg_invalid', 400);
  const row = clone(e);
  for (const k of ['id', 'assetId', 'funding', 'srv', 'yerel', 'yerelId', 'price']) delete row[k];
  Object.assign(row, { inK: false, w: num(e.w, 0, 999, 0), traits: Array.isArray(e.traits) ? e.traits.filter(t => typeof t === 'string').slice(0, 12) : [] });
  return row;
}
const localId = v => (Number.isSafeInteger(v) && v >= 0) || (typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v));

function sync(S, a, { api, now }) {
  let b;
  try { b = JSON.parse(a.body); } catch (_) { fail('ocak_body_invalid', 400); }
  if (!plain(b)) fail('ocak_body_invalid', 400);
  const allowed = ['ocak', 'ej', 'yu', 'ejIds', 'yuIds', 'birak', 'yem'];
  for (const k of Object.keys(b)) if (!allowed.includes(k)) fail('ocak_body_invalid', 400); // altın, kaynak, fiyat gibi alan yok
  if (typeof b.ocak !== 'string' || !/^[a-z0-9-]{8,40}$/.test(b.ocak)) fail('ocak_body_invalid', 400);
  const list = (v, max) => { if (v == null) return []; if (!Array.isArray(v) || v.length > max) fail('ocak_body_invalid', 400); return v; };
  const ej = list(b.ej, LIMIT.dragons), yu = list(b.yu, LIMIT.eggs), ejIds = list(b.ejIds, LIMIT.dragons), yuIds = list(b.yuIds, LIMIT.eggs), birak = list(b.birak, LIMIT.release);
  if ([...ejIds, ...yuIds].some(x => !localId(x)) || [...ej, ...yu].some(x => !plain(x) || !localId(x.id)) || birak.some(x => typeof x !== 'string' || !x || x.length > 200)) fail('ocak_body_invalid', 400);
  if (new Set(ejIds.map(String)).size !== ejIds.length || new Set(yuIds.map(String)).size !== yuIds.length) fail('ocak_body_invalid', 400);

  const out = { id: b.ocak, ilk: false, degisti: false, birakildi: [], yem: {} };
  if (!S.ocak || typeof S.ocak !== 'object') {
    // İlk bağlanma: o an defterde duran her şey tabandır.
    S.ocak = { id: b.ocak, at: Number.isSafeInteger(now) ? now : null, taban: [...S.dragons, ...S.eggs, ...S.inv].map(r => r.assetId).filter(Boolean) };
    out.ilk = true;
  } else if (S.ocak.id !== b.ocak) {
    // Başka bir yerel ocak (yeni oyun ya da bağlanmadan önceki eski kayıt): eski ocağın aynaları kalkar, yenisininki kurulur.
    S.dragons = S.dragons.filter(d => !d.yerel); S.eggs = S.eggs.filter(e => !e.yerel);
    S.ocak.id = b.ocak; out.degisti = true;
  }
  const taban = new Set(Array.isArray(S.ocak.taban) ? S.ocak.taban : []);
  const key = v => String(v);

  // Aynalar: ekle ya da güncelle (kimlik: yerel kimlik), sonra listede olmayanları kaldır.
  for (const [rows, sent, ids, make, kind] of [[S.dragons, ej, ejIds, d => mirrorDragon(d, api), 'dragon'], [S.eggs, yu, yuIds, mirrorEgg, 'egg']]) {
    const want = new Set(ids.map(key));
    for (const x of sent) {
      if (!want.has(key(x.id))) fail('ocak_body_invalid', 400);
      const row = make(x.d), old = rows.find(r => r.yerel && key(r.yerelId) === key(x.id));
      if (old) { const keep = { id: old.id, assetId: old.assetId, funding: 'bound', yerel: true, yerelId: old.yerelId }; for (const k of Object.keys(old)) delete old[k]; Object.assign(old, row, keep); }
      else rows.push(Object.assign(row, { id: kind === 'dragon' ? S.nid++ : 'e' + S.uid++, funding: 'bound', yerel: true, yerelId: x.id }));
    }
  }
  const dropMirrors = (rows, ids) => { const want = new Set(ids.map(key)); return rows.filter(r => !r.yerel || want.has(key(r.yerelId))); };
  S.dragons = dropMirrors(S.dragons, ejIds); S.eggs = dropMirrors(S.eggs, yuIds);
  if (S.dragons.filter(d => d.yerel).length > LIMIT.dragons || S.eggs.filter(e => e.yerel).length > LIMIT.eggs) fail('ocak_limit', 409);
  // Gönderilmeyen ama listede sayılan ayna yoksa istemci eksik göndermiştir: defter ile yerel ocak ayrışmasın.
  const have = rows => new Set(rows.filter(r => r.yerel).map(r => key(r.yerelId)));
  const hd = have(S.dragons), he = have(S.eggs);
  out.eksik = { ej: ejIds.filter(x => !hd.has(key(x))), yu: yuIds.filter(x => !he.has(key(x))) };

  // Sunucu kökenli varlık yerel ocaktan çıktı (öldü, yerelde satıldı, çatladı): defterden silinir, altın yazılmaz.
  for (const assetId of birak) {
    if (taban.has(assetId)) continue;
    for (const field of ['dragons', 'eggs', 'inv']) {
      const row = S[field].find(r => r.assetId === assetId && !r.yerel);
      if (!row) continue;
      if (row.tradeLocked) fail('dragon_busy', 409);
      if (field === 'inv') for (const d of S.dragons) for (const slot of Object.keys(d.equip || {})) if (d.equip[slot] === row.uid) d.equip[slot] = null;
      S[field] = S[field].filter(r => r !== row); out.birakildi.push(assetId);
    }
  }
  if (S.star != null && !S.dragons.some(d => d.id === S.star)) S.star = (S.dragons.find(d => !d.dead && !d.old) || {}).id ?? null;

  // Yem teslimi: yalnız kazanılmış kovadan, tek yönlü (sunucudan yerel kilere).
  if (b.yem != null) {
    if (!plain(b.yem) || Object.keys(b.yem).length > 40) fail('ocak_body_invalid', 400);
    for (const [k, n] of Object.entries(b.yem)) {
      if (!Number.isSafeInteger(n) || n < 1 || n > 100000 || !Object.hasOwn(S.food, k)) fail('ocak_food_invalid', 400);
      const src = S.foodSources && S.foodSources[k];
      if (!src || (src.earned || 0) < n || (S.food[k] || 0) < n) fail('ocak_food_unavailable', 409);
      src.earned -= n; S.food[k] -= n; out.yem[k] = n;
    }
  }
  out.ayna = { ej: S.dragons.filter(d => d.yerel).length, yu: S.eggs.filter(e => e.yerel).length };
  return { ocak: out };
}

function reduce(type, S, a, ctx) { return type === 'ocak.sync' ? sync(S, a, ctx) : null; }
module.exports = { TYPES, reduce, LIMIT };
