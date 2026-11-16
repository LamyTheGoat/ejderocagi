'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createReportLog } = require('../server/report_log');

const yeni = (now) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-sorun-')); return { dir, log: createReportLog(dir, now) }; };
const oku = log => fs.readFileSync(log.dosya, 'utf8').trim().split('\n').map(s => JSON.parse(s));

test('sorun bildirimi dosyaya satır olarak eklenir; alanlar kırpılır, bilinmeyen alan yazılmaz', () => {
  const { log } = yeni();
  log.add({ accountId: 'acct1', ip: '1.2.3.4', body: { metin: '  Ahırda düğme çalışmıyor  ', surum: '2.0.0', sahne: 'master', gizli: 'x', tarayici: 'a'.repeat(900),
    hatalar: [{ t: 5, tur: 'hata', mesaj: 'm'.repeat(999), yer: 'a.js:1' }, 'bozuk', null] } });
  const [k] = oku(log);
  assert.equal(k.metin, 'Ahırda düğme çalışmıyor'); assert.equal(k.hesap, 'acct1'); assert.equal(k.sahne, 'master');
  assert.equal(k.gizli, undefined); assert.equal(k.ip, undefined); assert.equal(k.tarayici.length, 300);
  assert.equal(k.hatalar.length, 1); assert.equal(k.hatalar[0].mesaj.length, 300);
});

test('çok kısa ya da metinsiz bildirim reddedilir ve dosyaya yazılmaz', () => {
  const { log } = yeni();
  assert.throws(() => log.add({ body: { metin: 'ab' } }), /report_too_short/);
  assert.throws(() => log.add({ body: null }), /report_too_short/);
  assert.equal(fs.existsSync(log.dosya), false);
});

test('aynı hesaptan on dakikada en çok beş bildirim; süre dolunca yeniden açılır; kimliksiz istek IP ile sayılır', () => {
  let t = 1_000_000; const { log } = yeni(() => t);
  for (let i = 0; i < 5; i++) log.add({ accountId: 'a', body: { metin: 'bildirim ' + i } });
  assert.throws(() => log.add({ accountId: 'a', body: { metin: 'altıncı bildirim' } }), e => e.status === 429);
  log.add({ accountId: 'b', body: { metin: 'başka hesap' } });
  log.add({ ip: '9.9.9.9', body: { metin: 'kimliksiz bildirim' } });
  t += 10 * 60 * 1000;
  log.add({ accountId: 'a', body: { metin: 'süre doldu' } });
  assert.equal(oku(log).length, 8);
});

test('otomatik hata bildirimi işaretlenir; işaret yalnız tam true ise geçer', () => {
  const { log } = yeni();
  log.add({ accountId: 'a', body: { otomatik: true, metin: '[otomatik] x is not defined @ game.js:12', hatalar: [{ t: 1, tur: 'hata', mesaj: 'x is not defined', yer: 'game.js:12' }] } });
  log.add({ accountId: 'a', body: { otomatik: 'evet', metin: 'oyuncu yazdı' } });
  const [k1, k2] = oku(log);
  assert.equal(k1.otomatik, true); assert.equal(k1.hatalar[0].yer, 'game.js:12'); assert.equal(k2.otomatik, false);
});
