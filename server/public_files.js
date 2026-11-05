'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Only scripts actually included by the game are public. New server modules,
// databases, dotfiles and source-control metadata never enter this allowlist.
function createPublicFiles(root, privateDirs = []) {
  root = fs.realpathSync(root);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = new Set([...html.matchAll(/<script\s+src="([^"?]+\.js)"/g)].map(m => m[1]));
  const within = (file, dir) => file === dir || file.startsWith(dir + path.sep);
  return function resolvePublicFile(urlPath) {
    let relative;
    try { relative = decodeURIComponent(urlPath).replace(/^\//, ''); } catch (_) { return null; }
    if (!relative || relative.includes('\\') || relative.includes('\0') || relative.split('/').some(p => p.startsWith('.') || !p)) return null;
    const media = /^(img|assets|sfx)\/.+\.(webp|png|jpg|jpeg|gif|svg|mp3|ogg|wav|woff2?|json)$/i.test(relative);
    if (relative !== 'style.css' && !scripts.has(relative) && !media) return null;
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
