'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildEo2Page, createEo2Page } = require('../server/eo2_page');
const { createPublicFiles } = require('../server/public_files');

const kok = path.resolve(__dirname, '..');

test('2.0 sayfası: her yerel betik ve stil damgalanır, damgalı adresler izin listesinden geçer, dış adres ve görsel damgalanmaz', () => {
  const { html, v } = buildEo2Page(kok, 'https://ornek.test');
  assert.match(v, /^[0-9a-f]{10}$/);
  assert.ok(html.includes('window.EO2_V="' + v + '"'));
  assert.equal(html.includes('__PUBLIC_URL__'), false);
  const betik = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]).filter(a => !a.includes("'")), stil =[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(betik.length > 50 && stil.length > 10);
  const dosya = createPublicFiles(kok, []);
  for (const adres of [...betik, ...stil]) {
    assert.match(adres, /\?v=[0-9a-f]{10}$/, adres + ' damgasız');
    const yol = adres.split('?')[0], istek = yol.startsWith('../') ? '/' + yol.slice(3) : '/eo2/' + yol;
    assert.ok(dosya(istek), istek + ' sunulmuyor');
  }
  assert.equal(/\.(webp|jpg|png)\?v=/.test(html), false);
});

test('2.0 sayfası: dosya içeriği değişince yalnız o dosyanın ve ortak damganın değeri değişir; önbellek aralığı içinde yeniden kurulmaz', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-sayfa-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'eo2', 'js', 'bolumler'), { recursive: true }); fs.mkdirSync(path.join(dir, 'eo2', 'css')); fs.mkdirSync(path.join(dir, 'js'));
  fs.writeFileSync(path.join(dir, 'eo2', 'index.html'), '<head><link rel="stylesheet" href="css/a.css">\n<link rel="stylesheet" href="https://dis.test/x.css">\n<!--/HEAD--></head><script src="js/a.js"></script><script src="js/b.js"></script><script src="js/yok.js"></script>' +
    "<script>document.write(['core'].map(f => f))</script><meta content=\"__PUBLIC_URL__/eo2/\">");
  for (const [ad, ic] of [['eo2/css/a.css', 'a{}'], ['eo2/js/a.js', '1'], ['eo2/js/b.js', '2'], ['eo2/js/bolumler/x.js', '3'], ['js/core.js', '4']]) fs.writeFileSync(path.join(dir, ad), ic);
  const ilk = buildEo2Page(dir, 'http://x');
  const damga = (h, ad) => new RegExp(ad.replace('.', '\\.') + '\\?v=([0-9a-f]{10})').exec(h)[1];
  assert.ok(ilk.html.includes('src="js/yok.js"'), 'olmayan dosya olduğu gibi kalır');
  assert.ok(ilk.html.includes('href="https://dis.test/x.css"'));
  assert.ok(ilk.html.includes('content="http://x/eo2/"'));
  fs.writeFileSync(path.join(dir, 'eo2', 'js', 'b.js'), '2b');
  const iki = buildEo2Page(dir, 'http://x');
  assert.equal(damga(iki.html, 'js/a.js'), damga(ilk.html, 'js/a.js'));
  assert.notEqual(damga(iki.html, 'js/b.js'), damga(ilk.html, 'js/b.js'));
  assert.notEqual(iki.v, ilk.v);
  // betikle yüklenen dosyalar ortak damgayı değiştirir
  fs.writeFileSync(path.join(dir, 'js', 'core.js'), '4b'); const uc = buildEo2Page(dir, 'http://x'); assert.notEqual(uc.v, iki.v);
  fs.writeFileSync(path.join(dir, 'eo2', 'js', 'bolumler', 'x.js'), '3b'); assert.notEqual(buildEo2Page(dir, 'http://x').v, uc.v);
  let t0 = 1000; const sayfa = createEo2Page(dir, 'http://x', 5000, () => t0), a = sayfa();
  fs.writeFileSync(path.join(dir, 'eo2', 'js', 'a.js'), '1b'); assert.equal(sayfa(), a); t0 += 5000; assert.notEqual(sayfa().v, a.v);
});
