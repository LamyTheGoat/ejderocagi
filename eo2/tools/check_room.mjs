// EO2: canlı oda denemesi. İki sekme, taklit oda (?mock=1); biri yürür, jest yapar, yazar; öbürü onu görmeli.
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const out = process.argv[2], url = (process.env.URL || 'http://localhost:3210/') + '?mock=1';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), errors = [];
const A = await ctx.newPage(), B = await ctx.newPage(); for (const p of [A, B]) { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); }
await A.goto(url); await A.waitForFunction('window.EO2 && EO2.api && EO2.net', { timeout: 60000 });
await B.goto(url); await B.waitForFunction('window.EO2 && EO2.api && EO2.net', { timeout: 60000 });
await A.bringToFront(); await A.evaluate(() => { EO2.state.intro = 1; const p = EO2.api.player; p.x = 1.5; p.y = 8.5; p.set = 'avci'; });
await B.evaluate(() => { EO2.state.intro = 1; const p = EO2.api.player; p.x = -0.5; p.y = 7.6; p.dir = 'up'; EO2.api.cam.x = -0.5; EO2.api.cam.y = 7.6; });
await A.waitForTimeout(800);
await A.evaluate(() => { EO2.api.emote(2); document.getElementById('chatInput').value = 'Selam, ben de geldim'; document.getElementById('chatForm').dispatchEvent(new Event('submit', { cancelable: true })); });
await A.waitForTimeout(500); await B.bringToFront(); await B.waitForTimeout(1500);
const res = await B.evaluate(() => ({ remotes: EO2.remotes.map(r => ({ name: r.name, set: r.set, x: +r.x.toFixed(1), y: +r.y.toFixed(1), pet: !!r.pet, bubble: r.bub && !r.bub.hidden ? r.bub.textContent : null })), chip: document.getElementById('liveChip').textContent, chat: document.getElementById('chatLog').textContent.slice(-90), myName: EO2.api.player.name }));
if (out) await B.screenshot({ path: path.join(out, 'oda.png') });
await A.close(); await B.waitForTimeout(600);
const after = await B.evaluate(() => ({ remotes: EO2.remotes.length, chip: document.getElementById('liveChip').textContent }));
console.log(JSON.stringify({ res, after, errors }, null, 1)); await b.close();
