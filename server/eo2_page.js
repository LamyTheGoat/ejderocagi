'use strict';
// Ejder Ocağı 2.0 sayfasının sürüm damgalı hâli (2026-11-16).
// Sorun: betik ve stiller bir saat önbellekte kalıyordu; yayından sonra tarayıcıda eski ve yeni dosyalar karışabiliyor,
// her açılışta yüzden fazla dosya için sunucuya soruluyordu.
// Çözüm: sayfa (önbelleğe alınmaz) her betik ve stil adresine içeriğinin özetini ekler (js/x.js?v=1a2b3c4d). Damgalı adres
// bir yıl, değişmez olarak önbelleğe alınır; dosya değişince adresi de değişir. Sayfada etiketle değil betikle yüklenen
// dosyalar (eski kural dosyaları, bölüm dosyaları) ortak damgayı kullanır: window.EO2_V.
// Görseller damgalanmaz (her yayında 20 MB yeniden inmesin); onların önbellek süresi sunucudaki kuralda kalır.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ozet = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

function buildEo2Page(root, publicUrl) {
  const eo2 = path.join(root, 'eo2');
  let html = fs.readFileSync(path.join(eo2, 'index.html'), 'utf8');
  const hepsi = crypto.createHash('sha1');
  const damga = adres => {
    const dosya = path.resolve(eo2, adres);
    if (!dosya.startsWith(root + path.sep)) return null;
    try { const o = ozet(fs.readFileSync(dosya)); hepsi.update(adres + ':' + o + ';'); return o; } catch (_) { return null; }
  };
  html = html.replace(/(<script\s+src=")([^"?]+\.js)(")/g, (tam, a, adres, b) => { const o = damga(adres); return o ? a + adres + '?v=' + o + b : tam; });
  html = html.replace(/(<link\s+rel="stylesheet"\s+href=")([^"?:]+\.css)(")/g, (tam, a, adres, b) => { const o = damga(adres); return o ? a + adres + '?v=' + o + b : tam; });
  // betikle yüklenen dosyalar ortak damgaya girer: eski kural dosyaları (document.write listesi) ve bölüm dosyaları
  const liste = /document\.write\(\[([^\]]+)\]/.exec(html);
  if (liste) for (const m of liste[1].matchAll(/'([a-z0-9_\/]+)'/gi)) damga('../js/' + m[1] + '.js');
  try { for (const ad of fs.readdirSync(path.join(eo2, 'js', 'bolumler')).sort()) if (ad.endsWith('.js')) damga('js/bolumler/' + ad); } catch (_) { /* bölüm klasörü yok */ }
  const v = hepsi.digest('hex').slice(0, 10);
  html = html.replace('<!--/HEAD-->', '<script>window.EO2_V="' + v + '"</script>\n<!--/HEAD-->');
  return { html: html.split('__PUBLIC_URL__').join(publicUrl), v };
}

// en çok `araMs` aralıkla yeniden kurulur: yayında dosyalar değişmez, geliştirmede birkaç saniyede güncellenir
function createEo2Page(root, publicUrl, araMs = 5000, now = () => Date.now()) {
  let son = null, zaman = 0;
  return () => { const t = now(); if (!son || t - zaman >= araMs) { son = buildEo2Page(root, publicUrl); zaman = t; } return son; };
}

module.exports = { buildEo2Page, createEo2Page };
