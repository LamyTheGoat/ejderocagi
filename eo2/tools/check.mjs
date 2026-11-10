// EO2 dilimi: işlev ve kare hızı denetimi (başsız Edge). Kullanım: node eo2/tools/check.mjs   (sunucu 3210'da açık olmalı)
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const require = createRequire(path.join(repo, 'package.json')); const { chromium } = require('playwright-core');
const url = process.env.URL || 'http://localhost:3210/', soft = process.env.SOFT === '1';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: soft ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(url); await p.waitForFunction('window.EO2 && EO2.api', { timeout: 60000 });
const res = await p.evaluate(async () => {
  const A = EO2.api, S = EO2.state, wait = ms => new Promise(r => setTimeout(r, ms)), key = (t, k) => window.dispatchEvent(new KeyboardEvent(t, { key: k })), out = {};
  const gl = A.R.gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); out.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'bilinmiyor';
  const fps = async ms => { let n = 0, on = true; const f = () => { if (on) { n++; requestAnimationFrame(f); } }; requestAnimationFrame(f); await wait(ms); on = false; return Math.round(n / (ms / 1000)); };
  S.intro = 1; await wait(600);
  // 1) yürüyüş: W ile kuzeye, hız adım kilidine uymalı
  const y0 = A.player.y; key('keydown', 'w'); out.fpsWalkDay = await fps(3000); key('keyup', 'w'); out.walkedN = +(A.player.y - y0).toFixed(2); out.dirN = A.player.dir;
  // 2) çarpışma: çeşmeye doğru yürü, içine giremesin
  A.player.x = 2.6; A.player.y = 9.2; key('keydown', 'w'); await wait(2500); key('keyup', 'w'); out.fountainStopY = +A.player.y.toFixed(2);
  // 3) yan yürüyüş ve yol arkadaşı
  const x0 = A.player.x; key('keydown', 'a'); await wait(1500); key('keyup', 'a'); out.walkedW = +(A.player.x - x0).toFixed(2); out.dirW = A.player.dir; await wait(1200);
  out.petGap = +Math.hypot(A.player.x - A.pet.x, A.player.y - A.pet.y).toFixed(2);
  // 4) akşam
  key('keydown', 'l'); await wait(3200); out.night = +S.night.toFixed(2); key('keydown', 'd'); out.fpsWalkNight = await fps(2500); key('keyup', 'd');
  // 5) yüksek kamera
  key('keydown', 'c'); await wait(1500); out.cam = S.camMode; out.fpsHighCam = await fps(2000); out.stats = { ...EO2.stats };
  // 6) panel: kapılar artık alanlara geçirir (check_scenes.mjs dener); burada kısayol tuşuyla panel açılır
  A.player.x = 12.6; A.player.y = 20.6; await wait(300); out.prompt = document.querySelector('.prompt').textContent; key('keydown', 'j'); await wait(300); out.panel = S.panel; out.panelTitle = document.getElementById('panelTitle').textContent;
  key('keydown', 'Escape'); await wait(200); out.panelClosed = S.panel === null;
  // 7) NPC ile konuşma ve sınır
  A.player.x = 0.3; A.player.y = 10.6; await wait(300); key('keydown', 'e'); await wait(200); out.npcBubble = [...document.querySelectorAll('.bubble')].filter(e => !e.hidden).map(e => e.textContent);
  A.player.x = 0; A.player.y = 29.5; key('keydown', 'w'); await wait(1500); key('keyup', 'w'); out.gateStopY = +A.player.y.toFixed(2);
  key('keydown', 'h'); await wait(200); out.hudHidden = document.getElementById('app').classList.contains('nohud'); key('keydown', 'h');
  return out;
});
console.log(JSON.stringify({ ...res, errors }, null, 1)); await b.close();
