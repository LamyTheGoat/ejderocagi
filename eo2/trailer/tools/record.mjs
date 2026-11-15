// Fragmanı videoya kaydeder: başsız Edge + GPU, gerçek zamanlı oynatım, tuval akışı + ses → MediaRecorder (MP4/H.264, yoksa WebM).
// Kullanım: node eo2/trailer/tools/record.mjs <çıktı dosyası (uzantısız)> [--w=1920] [--mbps=10]   Sunucu: node eo2/tools/serve.mjs 3210
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const args = process.argv.slice(2), out = args[0], opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1], W = +(opt('w') || 1920), H = Math.round(W * 9 / 16), mbps = +(opt('mbps') || 10), url = process.env.URL || 'http://localhost:3210/trailer/';
fs.mkdirSync(path.dirname(out), { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const parts = []; await p.exposeFunction('__chunk', b64 => { parts.push(Buffer.from(b64, 'base64')); });
await p.goto(url + '?res=' + W); await p.waitForFunction('window.__ready === true', null, { timeout: 90000 });
const info = await p.evaluate(async vbps => { const r = await EO2.tr.record({ vbps }), buf = new Uint8Array(await r.blob.arrayBuffer()), CH = 3 * 1024 * 1024;
  for (let i = 0; i < buf.length; i += CH) { let s = ''; const sub = buf.subarray(i, i + CH); for (let j = 0; j < sub.length; j += 0x8000) s += String.fromCharCode.apply(null, sub.subarray(j, j + 0x8000)); await window.__chunk(btoa(s)); }
  return { type: r.type, frames: r.frames, slow: r.slow, worst: +r.worst.toFixed(4), bytes: buf.length }; }, mbps * 1e6);
await b.close(); const ext = info.type.includes('mp4') ? '.mp4' : '.webm', file = out + ext; fs.writeFileSync(file, Buffer.concat(parts));
console.log(JSON.stringify({ file, ...info, MB: +(info.bytes / 1048576).toFixed(1), errs: errs.slice(0, 5) }));
