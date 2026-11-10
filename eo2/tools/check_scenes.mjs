// EO2: alan geçişleri denetimi. Meydandan Han'a, Bahçe'ye ve Kuzey Yolu'na girer; her birinde yürür, etkileşir, geri döner.
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] }), p = await b.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(process.env.URL || 'http://localhost:3210/'); await p.waitForFunction('window.EO2 && EO2.api', { timeout: 60000 });
const res = await p.evaluate(async () => { const A = EO2.api, wait = ms => new Promise(r => setTimeout(r, ms)), key = (t, k) => window.dispatchEvent(new KeyboardEvent(t, { key: k })), out = {};
  const fps = async ms => { let n = 0, on = true; const f = () => { if (on) { n++; requestAnimationFrame(f); } }; requestAnimationFrame(f); await wait(ms); on = false; return Math.round(n / (ms / 1000)); };
  EO2.state.intro = 1; await wait(500);
  for (const [id, door] of [['han', [-10.2, 18.3]], ['bahce', [12.0, 6.8]], ['yol', [0, 28.4]], ['pazar', [10.2, 20.2]], ['arena', [-11.9, 7.6]]]) { const o = out[id] = {};
    A.player.x = door[0]; A.player.y = door[1]; await wait(250); o.prompt = (document.querySelector('.prompt').textContent || '').slice(0, 40); key('keydown', 'e'); await wait(1300);
    o.scene = A.scene(); o.loc = document.getElementById('locName').textContent; o.npcs = A.npcs.length; o.statics = A.sceneState().w.statics.length;
    const y0 = A.player.y; key('keydown', 'w'); o.fps = await fps(2000); key('keyup', 'w'); o.walked = +(A.player.y - y0).toFixed(2); o.quads = EO2.stats.quads;
    if (id === 'bahce') { A.player.x = -6.4; A.player.y = 13.6; await wait(250); key('keydown', 'e'); await wait(300); o.pet = document.getElementById('toast').textContent; }
    if (id === 'han') { A.player.x = 0; A.player.y = 10.8; await wait(250); key('keydown', 'e'); await wait(300); o.ocak = document.getElementById('toast').textContent; }
    if (id === 'pazar') { A.player.x = 0; A.player.y = 17.9; await wait(250); o.pano = (document.querySelector('.prompt').textContent || '').slice(0, 40); }
    if (id === 'arena') { A.player.x = -0.8; A.player.y = 21.2; await wait(250); o.duel = (document.querySelector('.prompt').textContent || '').slice(0, 40); key('keydown', 'e'); await wait(2600); o.battle = EO2.battle.active(); EO2.battle.stop(); await wait(1200); o.afterBattle = [EO2.battle.active(), A.scene()]; }
    if (id === 'yol') { A.player.x = 0; A.player.y = 52; await wait(250); o.camp = (document.querySelector('.prompt').textContent || '').slice(0, 40); }
    A.player.x = A.L.start.x; A.player.y = 0.9; await wait(250); key('keydown', 'e'); await wait(1300); o.back = A.scene(); o.backPos = [+A.player.x.toFixed(1), +A.player.y.toFixed(1)]; }
  return out; });
console.log(JSON.stringify({ res, errors }, null, 1)); await b.close();
