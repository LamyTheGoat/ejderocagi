'use strict';
// EO2 · ekran arka planları: koddaki her 'a:<ad>' başvurusunun eo2/assets/bg/<ad>.webp dosyası olmalı
// (2026-11-17: ortak sefer ekranı var olmayan 'a:topcu' resmini istiyordu, ekran düz arka planla açılıyordu).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const kok = path.join(__dirname, '..', 'eo2');
test('koddaki her arka plan başvurusunun dosyası var', () => {
  const eksik = [];
  for (const f of fs.readdirSync(path.join(kok, 'js')).filter(f => f.endsWith('.js'))) { const s = fs.readFileSync(path.join(kok, 'js', f), 'utf8');
    for (const m of s.matchAll(/['"]a:([a-z0-9-]+)['"]/g)) if (m[1] !== 'ad' && !fs.existsSync(path.join(kok, 'assets', 'bg', m[1] + '.webp'))) eksik.push(f + ': a:' + m[1]); }
  assert.deepEqual(eksik, []);
});
