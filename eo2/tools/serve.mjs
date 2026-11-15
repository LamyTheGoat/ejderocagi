// Ejder Ocağı 2.0 geliştirme sunucusu.
// Kullanım: node eo2/tools/serve.mjs [port] [--statik]
//   Varsayılan: 2.0 sayfasını sunar ve arka planda oyun sunucusunu (server.js, port+1, geçici veri dizini) açıp
//   /api/* ve /ws isteklerini ona iletir; böylece 2.0 istemcisi sunucuyla aynı kökten konuşur.
//   --statik: yalnız dosya sunar (çevrimdışı deneme).
import http from 'node:http'; import net from 'node:net'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), repo = path.resolve(root, '..');
const args = process.argv.slice(2), statik = args.includes('--statik'), port = +(args.find(a => /^\d+$/.test(a)) || process.env.PORT || 3210), apiPort = +(process.env.API_PORT || port + 1);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json', '.woff2': 'font/woff2' };

let api = null, veri = null;
function temizle() { if (api) { try { api.kill(); } catch (_) { } api = null; } if (veri) { try { fs.rmSync(veri, { recursive: true, force: true }); } catch (_) { } veri = null; } }
process.on('exit', temizle); process.on('SIGINT', () => { temizle(); process.exit(0); }); process.on('SIGTERM', () => { temizle(); process.exit(0); });
if (!statik && fs.existsSync(path.join(repo, 'server.js'))) {
  veri = fs.mkdtempSync(path.join(os.tmpdir(), 'eo2-veri-'));
  api = spawn(process.execPath, [path.join(repo, 'server.js')], { cwd: repo, stdio: ['ignore', 'inherit', 'inherit'],
    env: Object.assign({}, process.env, { PORT: String(apiPort), PUBLIC_URL: process.env.PUBLIC_URL || 'http://localhost:' + port, DATA_DIR: veri, LOCAL_ECONOMY_DIR: path.join(veri, 'ekonomi') }) });
  api.on('error', () => { api = null; });
}
const sunucuya = u => u.startsWith('/api/') || u === '/api' || u.startsWith('/share/') || u.startsWith('/auth/');

const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (sunucuya(u)) {
    if (!api) { s.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); s.end(JSON.stringify({ ok: false, error: 'offline_static_mode' })); return; }
    const pr = http.request({ hostname: '127.0.0.1', port: apiPort, path: q.url, method: q.method, headers: q.headers }, r => { s.writeHead(r.statusCode || 502, r.headers); r.pipe(s); });
    pr.on('error', () => { if (!s.headersSent) s.writeHead(503, { 'content-type': 'application/json; charset=utf-8' }); s.end(JSON.stringify({ ok: false, error: 'backend_unreachable' })); });
    q.pipe(pr); return;
  }
  const old = u.startsWith('/oyun/js/') || u.startsWith('/oyun/img/') || u.startsWith('/oyun/sfx/') || u.startsWith('/oyun/assets/') || u === '/oyun/style.css' || u === '/oyun/style_mobile.css';
  const kok = !old && (u.startsWith('/img/') || u.startsWith('/sfx/'));      // eski kural dosyalarının göreli adresleri
  const base = old || kok ? repo : root;
  const p = path.resolve(base, '.' + (old ? u.slice(5) : u.endsWith('/') ? u + 'index.html' : u));
  if (!p.startsWith(base)) { s.writeHead(403); s.end(); return; }
  fs.stat(p, (e, st) => { if (e || !st.isFile()) { s.writeHead(404); s.end('yok'); return; } const type = T[path.extname(p).toLowerCase()] || 'application/octet-stream', m = /^bytes=(\d*)-(\d*)$/.exec(q.headers.range || '');
    if (m) { const a = m[1] ? +m[1] : 0, z = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;      // video için parça isteği (ileri sarma)
      s.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': 'bytes ' + a + '-' + z + '/' + st.size, 'content-length': z - a + 1, 'cache-control': 'no-store' }); fs.createReadStream(p, { start: a, end: z }).pipe(s); return; }
    s.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size, 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(s); });
});
// WebSocket: ham soketi oyun sunucusuna bağla
srv.on('upgrade', (q, soket, bas) => {
  if (!api) { soket.destroy(); return; }
  const hedef = net.connect(apiPort, '127.0.0.1', () => {
    hedef.write(q.method + ' ' + q.url + ' HTTP/1.1\r\n' + Object.entries(q.headers).map(([k, v]) => k + ': ' + v).join('\r\n') + '\r\n\r\n');
    if (bas && bas.length) hedef.write(bas); soket.pipe(hedef); hedef.pipe(soket);
  });
  hedef.on('error', () => soket.destroy()); soket.on('error', () => hedef.destroy());
});
srv.listen(port, () => console.log('Ejder Ocağı 2.0: http://localhost:' + port + (api ? ' (oyun sunucusu ' + apiPort + ')' : ' (statik)')));
