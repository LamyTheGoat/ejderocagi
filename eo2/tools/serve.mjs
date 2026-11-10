// EO2 dikey dilim için küçük statik sunucu. Kullanım: node eo2/tools/serve.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), port = +(process.argv[2] || process.env.PORT || 3210);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]), p = path.resolve(root, '.' + (u.endsWith('/') ? u + 'index.html' : u));
  if (!p.startsWith(root)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end('yok'); return; } s.writeHead(200, { 'content-type': T[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); s.end(b); });
}).listen(port, () => console.log('EO2 dilimi: http://localhost:' + port));
