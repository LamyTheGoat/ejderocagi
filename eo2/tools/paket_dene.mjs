// EO2 · yayın paketi denemesi: Dockerfile'daki COPY satırlarını okur, yalnız Git'te kayıtlı dosyaları aynı düzenle geçici bir klasöre kopyalar,
// `npm ci --omit=dev` ile kurar ve sunucuyu oradan başlatır. Böylece "pakette eksik dosya var mı, sunucu açılıyor mu" yayından önce görülür.
// Docker gerekmez. Sunucu geliştirme kipinde açılır: yayın kipi (NODE_ENV=production) ayrıca SESSION_SECRET ve bulut veritabanı ister; onlar yayın ortamının işidir. Sunucu açık kalır; Ctrl+C ile ya da süreci sonlandırarak kapatılır.
// Kullanım: node eo2/tools/paket_dene.mjs [port]      (varsayılan 3299)   ·   YALNIZ_KUR=1 ile sunucu başlatılmaz
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url'; import { execFileSync, spawn } from 'node:child_process';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), port = process.argv[2] || '3299';
const hedef = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-paket-')), kayitli = new Set(execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean));
let dosya = 0, bayt = 0; const eksik = [];
const kopyala = (kaynak, hedefYol) => { const tam = path.join(repo, kaynak); if (!fs.existsSync(tam)) { eksik.push(kaynak); return; }
  if (fs.statSync(tam).isDirectory()) { for (const f of kayitli) if (f.startsWith(kaynak + '/')) { const h = path.join(hedef, hedefYol, f.slice(kaynak.length + 1)); fs.mkdirSync(path.dirname(h), { recursive: true }); fs.copyFileSync(path.join(repo, f), h); dosya++; bayt += fs.statSync(h).size; } }
  else { if (!kayitli.has(kaynak)) { eksik.push(kaynak + ' (Git\'te kayıtlı değil)'); return; } const h = hedefYol.endsWith('/') ? path.join(hedef, hedefYol, path.basename(kaynak)) : path.join(hedef, hedefYol); fs.mkdirSync(path.dirname(h), { recursive: true }); fs.copyFileSync(tam, h); dosya++; bayt += fs.statSync(h).size; } };
for (const satir of fs.readFileSync(path.join(repo, 'Dockerfile'), 'utf8').split(/\r?\n/)) { const m = /^COPY\s+(.+)$/.exec(satir.trim()); if (!m) continue; const p = m[1].split(/\s+/), h = p.pop().replace(/^\.\//, '');
  for (const k of p) kopyala(k.replace(/^\.\//, ''), p.length > 1 || h === '' || h.endsWith('/') ? (h === '' ? './' : h.endsWith('/') ? h : h + '/') : h); }
console.log('paket: ' + dosya + ' dosya, ' + (bayt / 1048576).toFixed(1) + ' MB → ' + hedef); if (eksik.length) { console.log('EKSİK: ' + eksik.join(', ')); process.exit(1); }
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], { cwd: hedef, stdio: 'inherit', shell: process.platform === 'win32' });
if (process.env.YALNIZ_KUR) process.exit(0);
const veri = path.join(hedef, 'data'); fs.mkdirSync(veri, { recursive: true });
const s = spawn(process.execPath, ['server.js'], { cwd: hedef, stdio: 'inherit', env: Object.assign({}, process.env, { PORT: port, DATA_DIR: veri, PUBLIC_URL: 'http://localhost:' + port }) });
s.on('exit', k => { console.log('sunucu kapandı: ' + k); process.exit(k || 0); }); console.log('paket sunucusu: http://localhost:' + port + '/');
