// Kat kataloğu denetimi (eo2/assets/kat/katalog.js, 2026-11-22). Yeni bir saç, göz ya da renk eklendiğinde burası yakalar:
// dosya yok, ölçü şablona uymuyor, hücre adı yanlış, katman sırada yok, rampa satırı yok.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const KOK = path.join(__dirname, '..', 'eo2', 'assets');
global.window = globalThis; require(path.join(KOK, 'kat', 'katalog.js')); const K = globalThis.EO2_KAT;
new Function('window', fs.readFileSync(path.join(KOK, 'gorunus_atlas.js'), 'utf8'))(globalThis); const GA = globalThis.EO2_GORUNUS;

/* resim ölçüsü: webp (VP8, VP8L, VP8X) ve png başlığından, kütüphanesiz */
function olcu(dosya) {
  const b = fs.readFileSync(dosya);
  if (b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  assert.strictEqual(b.toString('ascii', 0, 4), 'RIFF', dosya + ' webp değil'); const tur = b.toString('ascii', 12, 16);
  if (tur === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (tur === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  if (tur === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error(dosya + ': bilinmeyen webp türü ' + tur);
}
const yol = d => path.join(KOK, d);
const HUCRE_AD = /^(down|up|right)_(durus|yuru|sevinc)$/;

test('şablonlar: hücre adları geçerli, her yönün duruş hücresi var', () => {
  for (const [ad, s] of Object.entries(K.sablon)) {
    for (const h of s.hucre) assert.match(h, HUCRE_AD, ad + ': hücre adı ' + h);
    for (const y of ['down', 'up', 'right']) assert.ok(s.hucre.includes(y + '_durus'), ad + ': ' + y + '_durus yok');
    for (const k of ['cw', 'ch', 'ax', 'ay']) assert.ok(Number.isInteger(s[k]) && s[k] >= 0, ad + '.' + k);
  }
  for (const y of ['down', 'up', 'right']) assert.ok(Array.isArray(K.iz[y]) && K.iz[y].length === 2, 'iz.' + y);
});

test('saçlar: dosya var, ölçü şablona uyuyor, katmanlar sırada', () => {
  const s = K.sablon.sac;
  for (const [ad, o] of Object.entries(K.sac)) {
    assert.ok(o.ad, ad + ': görünen ad yok');
    const hucre = o.hucre || s.hucre; for (const h of hucre) assert.ok(s.hucre.includes(h) || HUCRE_AD.test(h), ad + ': hücre ' + h);
    assert.ok(hucre.some(h => h.endsWith('_durus')), ad + ': duruş hücresi yok');
    assert.ok(Array.isArray(o.parca) && o.parca.length, ad + ': parca yok');
    for (const p of o.parca) assert.ok(K.sira.includes(p), ad + ': ' + p + ' katman sırasında yok');
    for (const d of [o.dosya, o.ozgun].filter(Boolean)) {
      assert.ok(fs.existsSync(yol(d)), ad + ': ' + d + ' yok');
      const m = olcu(yol(d)); assert.deepStrictEqual(m, { w: s.cw * hucre.length, h: s.ch * o.parca.length }, ad + ': ' + d + ' ölçüsü');
    }
    for (const g of o.gizler || []) assert.ok(K.sira.includes(g), ad + ': gizler ' + g);
  }
});

test('saç renkleri: rampa satırı var, renk örneği var', () => {
  const r = olcu(yol(K.rampa.dosya)); assert.strictEqual(r.w, 256, 'rampa 256 ton olmalı');
  for (const [ad, o] of Object.entries(K.sacRenk)) {
    assert.ok(o.ad && /^#[0-9a-f]{6}$/i.test(o.ornek || ''), ad + ': ad ya da ornek');
    if (o.rampa === null) continue;
    const i = K.rampa.satir[o.rampa]; assert.ok(Number.isInteger(i) && i < r.h, ad + ': rampa satırı ' + o.rampa);
  }
  assert.ok(Object.values(K.sacRenk).some(o => o.rampa === null), '"Özgün" renk (rampa: null) olmalı');
});

test('gözler ve kulak: dosya var, her göz renginin satırı var', () => {
  const s = K.sablon.yuz, renkSay = Object.keys(K.gozRenk).length;
  for (const [ad, o] of Object.values(K.gozRenk).entries()) { assert.ok(Number.isInteger(o.satir) && o.satir < renkSay, 'gozRenk satır ' + ad); assert.ok(/^#[0-9a-f]{6}$/i.test(o.ornek || ''), 'gozRenk ornek ' + ad); }
  assert.strictEqual(new Set(Object.values(K.gozRenk).map(o => o.satir)).size, renkSay, 'göz renk satırları tekrar ediyor');
  for (const [ad, o] of Object.entries(K.goz)) {
    assert.ok(fs.existsSync(yol(o.dosya)), ad + ': ' + o.dosya + ' yok');
    assert.deepStrictEqual(olcu(yol(o.dosya)), { w: s.cw * (o.hucre || s.hucre).length, h: s.ch * renkSay }, ad + ': yüz ölçüsü');
  }
  assert.deepStrictEqual(olcu(yol(K.kulak.dosya)), { w: K.sablon.kulak.cw * K.sablon.kulak.hucre.length, h: K.sablon.kulak.ch }, 'kulak ölçüsü');
});

test('sıra: tekrar yok, gövde ve başa bağlı katmanlar var; gövdeler yerinde', () => {
  for (const s of [K.sira, ...Object.values(K.siraYon)]) { assert.strictEqual(new Set(s).size, s.length, 'sırada tekrar'); for (const k of ['govde', 'yuz', 'sacOn', 'kulak']) assert.ok(s.includes(k), k + ' sırada yok'); }
  for (const set of Object.keys(GA.govde)) assert.ok(fs.existsSync(yol(K.govde.dosya(set))), set + ' gövdesi yok');
});

test('kurucu: hücre seçimi (yürüyüş yoksa duruş + iz, sevinç yoksa duruş)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'eo2', 'js', 'kat.js'), 'utf8'), w = { EO2_KAT: K, EO2_GORUNUS: GA, EO2_ATLAS: { sets: {} } };
  new Function('window', 'document', 'Image', src)(w, {}, function () { });
  const h = w.EO2_KAT_KUR.hucre, S = K.sablon.yuz;
  assert.deepStrictEqual(h('down_walk_7', S), { i: S.hucre.indexOf('down_yuru'), dx: 0, dy: 0 });
  assert.deepStrictEqual(h('right_happy', S), { i: S.hucre.indexOf('right_sevinc'), dx: 0, dy: 0 });
  assert.deepStrictEqual(h('up_happy', S), { i: S.hucre.indexOf('up_durus'), dx: 0, dy: 0 });
  const uc = ['down_durus', 'up_durus', 'right_durus'];
  assert.deepStrictEqual(h('right_walk_3', S, uc), { i: 2, dx: K.iz.right[0], dy: K.iz.right[1] });
  assert.deepStrictEqual(h('down_happy', S, uc), { i: 0, dx: 0, dy: 0 });
});

test('başlıklar (Faz 3): dosya ve ölçü, tür kuralı, saç altı düzeni, renk çeşidi kaynağı', () => {
  const T = K.sablon.baslik, SA = K.sablon.sacAlti;
  assert.deepStrictEqual(SA.stiller.slice().sort(), Object.keys(K.sac).sort(), 'her saç stilinin başlık altı satırı olmalı (yeni saç: tools/kat_baslik_pisir.mjs yeniden koşulur)');
  for (const p of SA.parca) assert.ok(K.sira.includes(p), 'sacAlti parça ' + p);
  for (const [tur, o] of Object.entries(K.baslikTur)) { for (const g of o.gizler || []) assert.ok(K.sira.includes(g), tur + ' gizler ' + g); for (const [a, b] of Object.entries(o.tasi || {})) assert.ok(K.sira.includes(a) && K.sira.includes(b), tur + ' tasi ' + a + '>' + b); }
  for (const [id, B] of Object.entries(K.baslik)) {
    const kaynak = B.kaynak ? K.baslik[B.kaynak] : B; assert.ok(kaynak && !kaynak.kaynak, id + ': kaynak ' + B.kaynak);
    assert.ok(B.ad && K.baslikTur[kaynak.tur], id + ': ad ya da tür'); const parca = B.parca || kaynak.parca;
    for (const p of parca) assert.ok(K.sira.includes(p), id + ': ' + p + ' sırada yok');
    assert.ok(fs.existsSync(yol(B.dosya)), id + ': ' + B.dosya); assert.deepStrictEqual(olcu(yol(B.dosya)), { w: T.cw * T.hucre.length, h: T.ch * parca.length }, id + ': başlık ölçüsü');
    if (B.kaynak) continue;
    for (const d of [B.sacAlti, B.sacAltiOzgun]) { assert.ok(d && fs.existsSync(yol(d)), id + ': saç altı ' + d); assert.deepStrictEqual(olcu(yol(d)), { w: SA.cw * SA.hucre.length, h: SA.ch * SA.stiller.length * SA.parca.length }, id + ': saç altı ölçüsü'); }
  }
});

test('ekipman başlıkları Kat kataloğunda karşılığını bulur', () => {
  const w = {}; new Function('window', fs.readFileSync(path.join(__dirname, '..', 'eo2', 'js', 'ekipman_kural.js'), 'utf8'))(w);
  const bas = w.EO2_EKIPMAN.KATALOG.filter(k => k.slot === 'baslik'); assert.ok(bas.length);
  for (const k of bas) assert.ok(k.kat && K.baslik[k.kat], k.id + ': kat ' + k.kat);
});
