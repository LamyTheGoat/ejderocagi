// Fragmandan durağan kareler: başsız Edge + GPU. Kullanım: node eo2/trailer/tools/frames.mjs <çıktı klasörü> <saniye...> [--sheet] [--w=1280]
// --sheet: kareleri tek bir önizleme sayfasında birleştirir (sheet.png). Sunucu: node eo2/tools/serve.mjs 3210
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const args = process.argv.slice(2), out = args[0], times = args.slice(1).filter(a => !a.startsWith('--')).map(Number), sheet = args.includes('--sheet'), W = +(args.find(a => a.startsWith('--w=')) || '--w=1280').slice(4), H = Math.round(W * 9 / 16);
const url = process.env.URL || 'http://localhost:3210/trailer/'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await p.goto(url + '?t=0&res=' + W); await p.waitForFunction('window.__ready === true', null, { timeout: 90000 }).catch(() => errs.push('hazır olmadı: ' + url));
const shots = []; for (const t of times) { const ms = await p.evaluate(t => { const a = performance.now(); EO2.tr.render(t); EO2.tr.R.gl.finish(); return performance.now() - a; }, t).catch(e => { errs.push('t=' + t + ' ' + e.message); return -1; });
  const f = path.join(out, 't' + t.toFixed(2).padStart(6, '0') + '.png'); await p.locator('#film').screenshot({ path: f }); shots.push({ t, f, ms }); }
if (sheet && shots.length) { const cols = Math.min(4, shots.length), cw = 480, ch = 270, pg = await b.newPage({ viewport: { width: cols * cw, height: Math.ceil(shots.length / cols) * ch } });
  await pg.setContent('<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(' + cols + ',' + cw + 'px);font:13px sans-serif;color:#fff">' + shots.map(s => '<div style="position:relative;height:' + ch + 'px"><img style="width:100%;height:100%" src="data:image/png;base64,' + fs.readFileSync(s.f).toString('base64') + '"><span style="position:absolute;left:4px;top:3px;background:#000a;padding:1px 4px">' + s.t.toFixed(2) + ' s</span></div>').join('') + '</body>');
  await pg.waitForTimeout(400); await pg.screenshot({ path: path.join(out, 'sheet.png') }); }
await b.close(); console.log(JSON.stringify({ kare: shots.length, ms: shots.map(s => Math.round(s.ms)), hata: errs.slice(0, 8) }, null, 1));
