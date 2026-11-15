'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Only scripts actually included by the game are public. New server modules,
// databases, dotfiles and source-control metadata never enter this allowlist.
function createPublicFiles(root, privateDirs = []) {
  root = fs.realpathSync(root);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = new Set([...html.matchAll(/<script\s+src="([^"?]+\.js)"/g)].map(m => m[1]));
  // Ejder Ocağı 2.0 (eo2/): yalnız 2.0 sayfasının yüklediği betikler, eo2/css ve eo2/assets altındaki medya açıktır.
  // tools/, docs/, trailer/ ve sayfada geçmeyen betikler asla sunulmaz.
  const eo2Scripts = new Set();
  try {
    const eo2Html = fs.readFileSync(path.join(root, 'eo2', 'index.html'), 'utf8');
    for (const m of eo2Html.matchAll(/<script\s+src="([^"?]+\.js)"/g)) { if (m[1].startsWith('../')) scripts.add(m[1].slice(3)); else eo2Scripts.add('eo2/' + m[1]); }
    // eski kural dosyaları sayfada bir ad listesinden yazdırılır: document.write(['data', 'core', ...])
    const liste = /document\.write\(\[([^\]]+)\]/.exec(eo2Html);
    if (liste) for (const m of liste[1].matchAll(/'([a-z0-9_\/]+)'/gi)) scripts.add('js/' + m[1] + '.js');
  } catch (_) { /* 2.0 klasörü yoksa yalnız eski oyun sunulur */ }
  const within = (file, dir) => file === dir || file.startsWith(dir + path.sep);
  return function resolvePublicFile(urlPath) {
    let relative;
    try { relative = decodeURIComponent(urlPath).replace(/^\//, ''); } catch (_) { return null; }
    if (!relative || relative.includes('\\') || relative.includes('\0') || relative.split('/').some(p => p.startsWith('.') || !p)) return null;
    const media = /^(img|assets|sfx)\/.+\.(webp|png|jpg|jpeg|gif|svg|mp3|ogg|wav|woff2?|json)$/i.test(relative);
    // bölüm dosyaları sayfada etiketle değil, js/bolumler/liste.js tarafından yüklenir
    const eo2Ok = eo2Scripts.has(relative) || /^eo2\/js\/bolumler\/[a-z0-9_-]+\.js$/i.test(relative) ||/^eo2\/css\/[a-z0-9_]+\.css$/i.test(relative) || /^eo2\/assets\/.+\.(webp|png|jpg|jpeg|gif|svg|mp3|ogg|wav|woff2?|json)$/i.test(relative);
    if (relative !== 'style.css' && relative !== 'style_mobile.css' && !scripts.has(relative) && !media && !eo2Ok) return null;
    try {
      const candidate = fs.realpathSync(path.join(root, relative));
      if (!within(candidate, root)) return null;
      // Reject symlink aliases even when their destination is inside the root.
      if (candidate !== path.join(root, relative)) return null;
      if (privateDirs.some(dir => within(candidate, fs.realpathSync(dir)))) return null;
      return fs.statSync(candidate).isFile() ? candidate : null;
    } catch (_) { return null; }
  };
}
module.exports = { createPublicFiles };
