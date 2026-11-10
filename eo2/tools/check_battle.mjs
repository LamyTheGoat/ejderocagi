// EO2: düello duman testi. Düelloyu açar, her sırada ateş eder, bitene kadar zamanı ileri sarar.
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(process.env.URL || 'http://localhost:3210/'); await p.waitForFunction('window.EO2 && EO2.api && EO2.battle', { timeout: 60000 });
await p.evaluate(() => EO2.battle.start()); await p.waitForFunction('EO2.battle.state() && EO2.battle.state().T', { timeout: 30000 }); await p.waitForTimeout(600);
const res = await p.evaluate(() => { const B = EO2.battle.state(), step = n => { for (let i = 0; i < n; i++) EO2.frameHooks.forEach(h => h(0.033)); }, log = [];
  let guard = 0; while (!B.over && guard++ < 60) { if (B.phase === 'aim' && B.turn === 0) { B.act[0].angle = 38 + Math.random() * 14; B.keys.fire = true; step(18 + Math.floor(Math.random() * 16)); B.keys.fire = false; step(2); log.push('ben: güç ' + B.act[0].lastPower.toFixed(2)); } step(40); }
  step(60); return { over: B.over, rounds: B.round, hp: B.act.map(a => Math.round(a.hp)), dead: B.act.map(a => a.dead), guard, shots: log.length, result: document.getElementById('bResT').textContent, hudHp: [document.getElementById('bvL').textContent, document.getElementById('bvR').textContent] }; });
await p.waitForTimeout(1500); const shown = await p.evaluate(() => ({ resultVisible: !document.getElementById('bResult').hidden, title: document.getElementById('bResT').textContent }));
await p.evaluate(() => document.getElementById('bBack').click()); await p.waitForTimeout(1200);
const back = await p.evaluate(() => ({ active: EO2.battle.active(), fightClass: document.getElementById('app').classList.contains('fight') }));
console.log(JSON.stringify({ res, shown, back, errors }, null, 1)); await b.close();
