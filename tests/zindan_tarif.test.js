'use strict';
// Ortak zindan tarifleri (eo2/js/zindan_tarif.js): biçim denetimi ve sunucunun tariften kurulması.
// Yeni zindan eklendiğinde bu test, eksik ya da tutarsız alanı yakalar (eo2/docs/ZINDAN_YONTEMI.md).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const TARIF = require('../eo2/js/zindan_tarif.js');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createZindanOrtak, ZINDANLAR } = require('../server/zindan_ortak');
const kok = path.join(__dirname, '..', 'eo2');
const oku = f => fs.readFileSync(path.join(kok, 'js', f), 'utf8');

const ARENA = require('../eo2/js/arena_veri.js');
test('her zindan tarifi tam: yazılar, ödül kaynağı, arenalar; her arenanın çizimi, düşman türleri ve canları yerinde', () => {
  const veri = oku('topcu_veri.js');
  assert.ok(Object.keys(TARIF).length >= 1);
  for (const [k, Z] of Object.entries(TARIF)) {
    assert.match(k, /^[a-z0-9]+$/, k + ': anahtar küçük harf ve rakam olmalı (oda anahtarı "zindan-zorluk" biçimindedir)');
    for (const alan of ['ad', 'odul', 'tanitim']) assert.ok(typeof Z[alan] === 'string' && Z[alan], k + '.' + alan);
    assert.ok(new RegExp('\\b' + Z.odul + ': \\{ ad:').test(veri), k + ': odul "' + Z.odul + '" js/topcu_veri.js ZINDAN içinde yok');
    assert.ok(Array.isArray(Z.asama) && Z.asama.length >= 1, k + ': en az bir aşama');
    Z.asama.forEach((ad, i) => { const A = ARENA[ad]; assert.ok(A, k + ': "' + ad + '" arenası derlenmemiş (eo2/arenalar/' + ad + ' ve node eo2/tools/arena_derle.mjs)');
      if (A.eski) { const dus = A.dusman.concat(A.boss ? [A.boss] : []); assert.ok(dus.length >= 1); assert.ok(new RegExp('\\b' + A.eski.zindan + ': \\{ ad:').test(veri), ad + ': eski zindan yok');
        for (const q of dus) { assert.ok(veri.includes("tip: '" + q.tip + "'"), ad + ': "' + q.tip + '" eski veride yok'); assert.ok(veri.includes('Math.round(' + q.hp + ' * d)'), ad + ': ' + q.ad + ' canı (' + q.hp + ') eski veriyle aynı değil'); }
        assert.deepEqual(ZINDANLAR[k].asama[i].dusman.map(q => q.hp), dus.map(q => q.hp), ad + ': sunucu canları arenadan alır'); return; }
      assert.ok(A.katman.length >= 1); for (const k of A.katman) assert.ok(fs.existsSync(path.join(kok, decodeURIComponent(k.src))), ad + ': katman resmi yok: ' + k.src); assert.ok(A.en <= 64 && A.taban + A.boy <= 30 && A.ppu > 0, ad + ': ölçü');
      assert.ok(A.oyuncu.length >= 1 && Math.abs(A.oyuncu[0].h - 1.7) < 0.02, ad + ': mavi kutu oyuncu boyunda');
      const dus = A.dusman.concat(A.boss ? [A.boss] : []); assert.ok(dus.length >= 1);
      for (const q of dus) { assert.ok(q.x > 0 && q.x < A.en && q.h > 0.5, ad + ': ' + q.ad + ' yeri ve boyu'); assert.ok(veri.includes(q.tip + ':') || veri.includes('.' + q.tip + ' ='), ad + ': "' + q.tip + '" js/topcu_veri.js içinde tanımlı değil'); }
      assert.deepEqual(ZINDANLAR[k].asama[i].dusman.map(q => q.hp), A.dusman.map(q => q.hp).concat(A.boss ? [A.boss.hp] : []), ad + ': sunucu canları arenadan alır'); });
    assert.equal(ZINDANLAR[k].asama.length, Z.asama.length);
  }
});

test('derlenmiş arena dosyası klasörlerle aynı (blok harita ya da arena.json değişince yeniden derlenmeli)', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(kok, 'tools', 'arena_derle.mjs'), '--denet'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('blok harita okuyucu: ölçek mavi kutudan, zemin kırılır ve kırılmaz, kutular soldan sağa; eksikleri anlaşılır hatayla söyler', async () => {
  const { blokOku, arenaKur, RENK } = await import('../eo2/tools/arena_derle.mjs'), { pngYaz, pngOku } = await import('../eo2/tools/png.mjs');
  const w = 640, h = 200, d = Buffer.alloc(w * h * 4), dolu = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } };
  dolu(0, 150, 320, 200, RENK.kirilir); dolu(320, 150, 640, 200, RENK.kirilmaz); dolu(40, 133, 50, 150, RENK.oyuncu); dolu(500, 126, 520, 150, RENK.dusman); dolu(300, 50, 320, 74, RENK.dusman); dolu(560, 82, 600, 150, RENK.boss);
  const b = blokOku(pngOku(pngYaz(w, h, d)), 'deneme');
  assert.equal(b.ppu, 10); assert.equal(b.en, 64); assert.equal(b.boy, 20); assert.equal(b.taban, 6); assert.deepEqual(b.oyuncu, [{ x: 4.5, y: 11, h: 1.7, w: 1 }], 'oyuncunun bastığı zemin dünyada 11 birim yükseğe oturur');
  assert.deepEqual(b.dusman.map(q => [q.x, q.y, q.h]), [[31, 18.6, 2.4], [51, 11, 2.4]], 'sarı kutular soldan sağa; uçanın yüksekliği kutunun altından'); assert.deepEqual([b.boss.x, b.boss.y, b.boss.h], [58, 11, 6.8]); assert.equal(b.kamera, null);
  const m = new Uint8Array(512 * 240); let p = 0; for (let i = 0; i < b.maske.length; i += 2) { m.fill(b.maske[i], p, p + b.maske[i + 1]); p += b.maske[i + 1]; } assert.equal(p, 512 * 240);
  const hucre = (x, y) => m[Math.floor(y * 8) * 512 + Math.floor(x * 8)]; assert.equal(hucre(10, 10.9), 1); assert.equal(hucre(40, 10.9), 2); assert.equal(hucre(10, 11.1), 0); assert.equal(hucre(40, 6.1), 2); assert.equal(hucre(40, 5.9), 0);
  const json = { ad: 'A', alt: 'B', ipucu: 'C', tema: 'sirca', ortam: 'spor', ust: '#000', altRenk: '#000', dusman: [{ tip: 'viper', ad: 'Uçan', hp: 10, fizik: false, hayalet: true }, { tip: 'cobra', ad: 'Yerde', hp: 20 }], boss: { tip: 'sahmeran', ad: 'Boss', unvan: 'U', hp: 30 } };
  const A = arenaKur('deneme', json, b, [{ src: 'x', z: -1 }]); assert.deepEqual(A.dusman.map(q => [q.fizik, q.hayalet, q.hp]), [[false, true, 10], [true, false, 20]]); assert.equal(A.kameraBoy, 6); assert.equal(A.boss.h, 6.8);
  assert.throws(() => arenaKur('deneme', Object.assign({}, json, { dusman: json.dusman.slice(1) }), b), /1 düşman sayıyor, blok haritada 2 sarı kutu/);
  assert.throws(() => arenaKur('deneme', Object.assign({}, json, { boss: null }), b), /macenta|boss/);
  // düello arenası: düşmansız, iki mavi kutu
  const pv = Object.assign({}, json, { tur: 'pvp', dusman: [], boss: null }), bp = Object.assign({}, b, { dusman: [], boss: null });
  assert.throws(() => arenaKur('duello', pv, bp), /en az iki mavi kutu/); assert.equal(arenaKur('duello', pv, Object.assign({}, bp, { oyuncu: [b.oyuncu[0], Object.assign({}, b.oyuncu[0], { x: 50 })] })).tur, 'pvp');
  assert.throws(() => arenaKur('duello', Object.assign({}, pv, { dusman: json.dusman }), Object.assign({}, b, { boss: null })), /düşman ya da boss olmaz/);
  const bos = Buffer.alloc(w * h * 4); assert.throws(() => blokOku({ w, h, rgba: bos }, 'bos'), /mavi oyuncu kutusu yok/);
  dolu(40, 133, 50, 150, [0, 0, 0]); dolu(40, 140, 50, 150, RENK.oyuncu); assert.throws(() => blokOku({ w, h, rgba: d }, 'buyuk'), /çok büyük/);
});

test('katman dosyaları: numara çizim sırasını, addaki "kirilir" ve "kirilmaz" zemini söyler; zemin katmanı haritaya işlenir', async () => {
  const { katmanlariBul, blokOku, RENK } = await import('../eo2/tools/arena_derle.mjs');
  const K = katmanlariBul(['1 ön perde.webp', 'blok.png', '0 Kırılmaz kaya.png', '-2_gokyuzu.png', 'arena.json', '0 kirilir zemin.png', 'calisma.kra', '-1 duvar.png'], 'd');
  assert.deepEqual(K.map(k => [k.z, k.zemin, k.dosya]), [[-2, null, '-2_gokyuzu.png'], [-1, null, '-1 duvar.png'], [0, 'kirilmaz', '0 Kırılmaz kaya.png'], [0, 'kirilir', '0 kirilir zemin.png'], [1, null, '1 ön perde.webp']]);
  assert.deepEqual(katmanlariBul(['sahne.webp', 'blok.png'], 'd').map(k => k.z), [-1], 'eski tek resimli biçim: sahne = −1');
  assert.throws(() => katmanlariBul(['arka plan.png'], 'd'), /numarasıyla başlamalı/); assert.throws(() => katmanlariBul(['0 kirilir zemin.webp'], 'd'), /PNG olmalı/); assert.throws(() => katmanlariBul(['blok.png'], 'd'), /hiç katman/);
  const w = 640, h = 200, bos = () => Buffer.alloc(w * h * 4), dolu = (d, x0, y0, x1, y1, c, a = 255) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; } };
  const blok = bos(), zemin = bos(), kaya = bos(); dolu(blok, 40, 133, 50, 150, RENK.oyuncu); dolu(blok, 500, 126, 520, 150, RENK.dusman);
  dolu(zemin, 0, 150, 640, 200, [120, 80, 50]); dolu(zemin, 0, 140, 640, 150, [60, 150, 60], 90); dolu(kaya, 320, 150, 640, 200, [90, 90, 100]);
  const b = blokOku({ w, h, rgba: blok }, 'd', [{ tip: 'kirilir', rgba: zemin }, { tip: 'kirilmaz', rgba: kaya }]);
  const m = new Uint8Array(512 * 240); let p = 0; for (let i = 0; i < b.maske.length; i += 2) { m.fill(b.maske[i], p, p + b.maske[i + 1]); p += b.maske[i + 1]; }
  const hucre = (x, y) => m[Math.floor(y * 8) * 512 + Math.floor(x * 8)];
  assert.equal(hucre(10, 10.9), 1, 'çizilen yer kırılabilir zemin'); assert.equal(hucre(40, 10.9), 2, 'kırılmaz katman kırılırın üstüne yazar'); assert.equal(hucre(10, 11.5), 0, 'yarıdan saydam çizim (çim ucu) zemin sayılmaz');
});

test('oyun tarif dosyasını zindan kodundan önce yükler', () => {
  const html = fs.readFileSync(path.join(kok, 'index.html'), 'utf8');
  assert.ok(html.indexOf('js/zindan_tarif.js') > 0 && html.indexOf('js/zindan_tarif.js') < html.indexOf('js/zindan_ortak.js'));
});

test('yeni bir tarif sunucuda kod değişmeden çalışır; düşen oyuncu seferde kalır, yalnız sırası atlanır', async () => {
  const bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
  const tarif = { deneme: { ad: 'Deneme', asama: ['tek-oda'] } }, arena = { 'tek-oda': { ad: 'Tek oda', dusman: [{ hp: 100 }], boss: { hp: 400 } } };
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman });
  O.kaydet('zindan', createZindanOrtak({ now: () => zaman, tarif, arena }).tanim);
  const baglan = id => { const s = { k: { accountId: id, handle: '@' + id } }; soketler.add(s); return s; };
  const son = (s, tip) => (kutu.get(s) || []).filter(m => m.type === tip).pop();
  const olay = (s, t) => { for (const m of (kutu.get(s) || []).slice().reverse()) if (m.type === 'ortak_olay') for (const o of m.olaylar.slice().reverse()) if (o.t === t) return o; };
  const eylem = async (s, e) => { O.onMessage(s, { type: 'ortak_eylem', eylem: e }); await bekle(); };
  const a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); assert.equal(son(a, 'ortak_oda'), undefined, 'verilen tarifte olmayan zindan kurulamaz');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'deneme-zor' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' });
  let d = son(a, 'ortak_olay').durum; assert.equal(d.zindan, 'deneme'); assert.deepEqual(d.dusman.map(q => q.max), [150, 600], 'can = tarif × zorluk (1,0) × grup çarpanı (1,5)');
  await eylem(a, { t: 'tur_bitti', adim: 0 }); await eylem(b, { t: 'tur_bitti', adim: 0 }); assert.equal(olay(a, 'sira').kim, 'a');
  // a düşer: seferde ve odada kalır; sıra hemen b'ye geçer, sonraki turlarda a hiç çağrılmaz
  await eylem(a, { t: 'dustu' }); assert.equal(olay(b, 'sira').kim, 'b');
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.equal(d.uye.a.hayatta, false); assert.equal(son(a, 'ortak_oda').oda.uyeler.length, 2, 'düşen oyuncu odadan çıkarılmaz');
  for (let k = 0; k < 6; k++) { const s = son(b, 'ortak_olay').durum.sav; assert.notEqual(s.kim, 'a'); if (s.tip === 'dusman') assert.equal(s.hedef, 'b'); await eylem(b, { t: 'tur_bitti', adim: s.adim }); }
  // b boss'u indirir: aşama biter, düşen a da çarkını çevirir ve sefer herkes için tamamlanır
  await eylem(b, { t: 'hasar', i: 1, h: 600 }); assert.equal(olay(a, 'asama_bitti').zafer, true);
  await eylem(a, { t: 'cark' }); await eylem(b, { t: 'cark' }); assert.equal(son(a, 'ortak_bitti').sonuc.kazanan, true);
});
