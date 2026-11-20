'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createReportLog } = require('../server/report_log');
const { createSorunPaneli, sayfa, bicimle } = require('../server/sorun_paneli');

const ANAHTAR = 'dogru-anahtar-12345';
const kur = () => { let t = Date.UTC(2026, 10, 20, 9); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-panel-'));
  const log = createReportLog(dir, () => (t += 1000)); return { log, panel: createSorunPaneli({ reports: log, anahtar: ANAHTAR }) }; };
const sikayet = (handle, ad, sozler) => ({ metin: '[şikâyet] ' + handle + ' (' + ad + ') · ' + sozler, sahne: 'master' });

test('okuma izni: anahtar tanımlı değilse ya da kısaysa kapalı; yanlış anahtar ve biçimsiz başlık reddedilir', () => {
  const req = h => ({ headers: { authorization: h } });
  assert.equal(createSorunPaneli({ reports: {} }).okumaIzni(req('Bearer ')), false);
  assert.equal(createSorunPaneli({ reports: {}, anahtar: 'kisa' }).okumaIzni(req('Bearer kisa')), false);
  const { panel } = kur();
  assert.equal(panel.okumaIzni(req('Bearer ' + ANAHTAR)), true);
  assert.equal(panel.okumaIzni(req('Bearer yanlis-anahtar-1234')), false);
  assert.equal(panel.okumaIzni(req(ANAHTAR)), false);
  assert.equal(panel.okumaIzni({ headers: {} }), false);
});

test('panel son kayıtları yeniden eskiye verir; türleri ayırır; şikâyet edilenleri ayrı bildirene göre sıralar', () => {
  const { log, panel } = kur();
  log.add({ accountId: 'a1', body: sikayet('@gezgin_kotu', 'Kötü', 'söz bir | söz iki') });
  log.add({ accountId: 'a1', body: sikayet('@gezgin_kotu', 'Kötü', 'söz yok') });
  log.add({ accountId: 'a2', body: sikayet('@gezgin_baska', 'Başka', 'x') });
  log.add({ accountId: 'a3', body: sikayet('@gezgin_baska', 'Başka', 'y') });
  log.add({ accountId: 'a4', body: { metin: 'Ahırda düğme çalışmıyor' } });
  log.add({ accountId: 'a4', body: { otomatik: true, metin: '[otomatik] x is not defined', hatalar: [{ t: 1, tur: 'hata', mesaj: 'x is not defined', yer: 'a.js:1' }] } });
  const o = panel.oku(100);
  assert.deepEqual(o.sayac, { sikayet: 4, oyuncu: 1, otomatik: 1 });
  assert.equal(o.kayitlar[0].tur, 'otomatik', 'en yeni başta');
  assert.equal(o.kayitlar.at(-1).hedef.sozler, 'söz bir | söz iki');
  assert.equal(o.kayitlar.at(-2).hedef.sozler, '', '"söz yok" boş gösterilir');
  assert.deepEqual(o.sikayetEdilen.map(s => [s.handle, s.sayi, s.bildiren]), [['@gezgin_baska', 2, 2], ['@gezgin_kotu', 2, 1]]);
  assert.equal(panel.oku(2).kayitlar.length, 2);
});

test('dosya yoksa boş liste; yarım ya da bozuk satır atlanır', () => {
  const { log, panel } = kur();
  assert.deepEqual(panel.oku().kayitlar, []);
  log.add({ body: { metin: 'ilk bildirim' } });
  fs.appendFileSync(log.dosya, '{bozuk\n');
  assert.equal(panel.oku().kayitlar.length, 1);
});

test('oyuncunun "[şikâyet]" diye başlayan biçimsiz metni hedef uydurmaz; sayfa nonce taşır ve metni HTML olarak basmaz', () => {
  assert.equal(bicimle({ metin: '[şikâyet] <img src=x onerror=alert(1)>' }).hedef, undefined);
  const h = sayfa('NONCE123');
  assert.match(h, /<script nonce="NONCE123">/); assert.match(h, /<style nonce="NONCE123">/);
  assert.doesNotMatch(h, /innerHTML/, 'oyuncu metni yalnız textContent ile basılır');
});
