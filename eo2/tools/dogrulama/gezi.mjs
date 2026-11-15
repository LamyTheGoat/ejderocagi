// Telefon cilası gezisi: node gezi.mjs <etiket> [dikey,yatay,masa] [ekran,ekran]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const repo = 'C:/Users/user/Documents/GitHub/ejderocagi-gemini';
const scratch = 'C:/Users/user/AppData/Local/Temp/claude/d2a0e5db0cf7db74/e4f0967c-23cb-4af2-b6b5-f162286e8ae1/scratchpad';
let chromium;
for (const pkg of [repo + '/package.json', 'C:/Users/user/Documents/GitHub/ejderocagi-eng06/package.json']) {
  try { chromium = createRequire(pkg)('playwright-core').chromium; break; } catch (_) {}
}
const etiket = process.argv[2] || 'once';
const kipler = (process.argv[3] || 'dikey,yatay,masa').split(',');
const secim = process.argv[4] ? process.argv[4].split(',') : null;
const out = path.join(scratch, etiket);
fs.mkdirSync(out, { recursive: true });
const PORT = 3250;
setTimeout(() => { console.error('zaman aşımı'); process.exit(2); }, 280000).unref();

const srv = spawn(process.execPath, [repo + '/proto/tools/serve.mjs', String(PORT)], { cwd: repo, stdio: ['pipe', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('sunucu açılmadı')), 15000);
  srv.stdout.on('data', c => { if (c.toString().includes('Ejder Ocağı Prototip:')) { clearTimeout(t); setTimeout(res, 300); } });
});

const denetim = () => {
  const vw = innerWidth, vh = innerHeight;
  const gorunur = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    }
    return true;
  };
  const kisa = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/s+/).slice(0, 2).join('.') : ''));
  const ad = el => { const z = []; for (let e = el, i = 0; e && e.id !== 'app' && i < 4; e = e.parentElement || (e.getRootNode && e.getRootNode().host), i++) { z.unshift(kisa(e)); if (e.id) break; } return z.join('>'); };
  const kucukYazi = {}, kucukHedef = {}, tasan = {};
  const yuru = root => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let el = root;
    while (el) {
      if (el.shadowRoot) yuru(el.shadowRoot);
      if (el.nodeType === 1 && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        const kendiYazi = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
        if (kendiYazi && gorunur(el)) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 11.95) { const k = ad(el) + ' @' + fs.toFixed(1); kucukYazi[k] = (kucukYazi[k] || 0) + 1; }
        }
        if (el.matches('button,a,[role=button],[role=tab],input,select,summary') && gorunur(el)) {
          const r = el.getBoundingClientRect();
          if (r.width < 43.5 || r.height < 43.5) { const k = ad(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); kucukHedef[k] = (kucukHedef[k] || 0) + 1; }
        }
        if (el.matches('button,h1,h2,h3,p,li,.chip,.box,.kart,.gbtn') && gorunur(el)) {
          const r = el.getBoundingClientRect();
          if (r.right > vw + 2 || r.left < -2) { const k = ad(el) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']'; tasan[k] = (tasan[k] || 0) + 1; }
        }
      }
      el = w.nextNode();
    }
  };
  yuru(document.getElementById('app'));
  return { kucukYazi, kucukHedef, tasan, yatayKaydirma: document.documentElement.scrollWidth > vw + 1 };
};

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rapor = {};
const KIP = {
  dikey: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  yatay: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  masa: { viewport: { width: 1600, height: 900 } },
};
try {
  for (const kip of kipler) {
    const ctx = await browser.newContext(KIP[kip]);
    const p = await ctx.newPage();
    const hata = [];
    p.on('pageerror', e => hata.push(e.message.slice(0, 200)));
    rapor[kip] = { hata };
    const cek = async (ad, tam) => {
      if (secim && !secim.includes(ad)) return;
      if (process.env.HIDEB && ad > '04') await p.evaluate(() => document.querySelectorAll('.bildirimler').forEach(e => e.style.visibility = 'hidden'));
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(out, `${kip}_${ad}.png`) });
      try { rapor[kip][ad] = await p.evaluate(denetim); } catch (e) { rapor[kip][ad] = 'denetim hatası ' + e.message; }
    };
    const adim = async (ad, fn) => { try { await fn(); } catch (e) { rapor[kip]['HATA_' + ad] = e.message.slice(0, 300); } };
    const tik = async sel => {
      const l = p.locator(sel).first();
      await l.waitFor({ state: 'visible', timeout: 8000 });
      await l.evaluate(b => b.click());
      await p.waitForTimeout(350);
    };
    const kapat = async () => { await p.evaluate(() => { try { EO2.game.close(); } catch (_) {} }); await p.waitForTimeout(250); };

    await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction('window.EO2 && EO2.api && EO2.game && window.PROTO && document.querySelector(".giris")', null, { timeout: 45000 });
    await cek('00_giris');
    await tik('.giris .gbtn:has-text("Yeni ocak kur")');
    if (await p.locator('.pen:has-text("silinsin")').count()) await tik('.pen .gbtn:has-text("Yeni ocak kur")');
    await cek('01_mektup');
    await tik('.pen .gbtn:has-text("Ocağa gir")');
    await p.waitForTimeout(1500);
    await cek('02_meydan_ipucu');
    await p.waitForTimeout(process.env.QUICK ? 2500 : 6000);
    await cek('03_meydan');
    await adim('hudhal', async () => {
      await p.evaluate(() => { const t = document.getElementById('toast'); t.dataset.eski = t.innerHTML; t.textContent = 'Yürümek için sol alttaki çubuğu sürükle, konuşmak için E'; t.classList.add('on'); });
      await cek('03b_ipucu');
      await p.evaluate(() => { const t = document.getElementById('toast'); t.classList.remove('on'); });
      await p.evaluate(() => document.getElementById('questToggle').click()); await cek('03c_gorev_acik');
      await p.evaluate(() => document.getElementById('questToggle').click());
      await p.evaluate(() => document.getElementById('chatToggle').click()); await cek('03d_sohbet_acik');
      await p.evaluate(() => document.getElementById('chatToggle').click());
    });
    if (process.env.QUICK) { await ctx.close(); continue; }
    if (process.env.HUD) { fs.writeFileSync(path.join(out, `${kip}_hud.json`), JSON.stringify(await p.evaluate(() => {
      const q = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { s, cls: e.className, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), disp: c.display, pos: c.position, op: c.opacity, z: c.zIndex }; });
      return ['#hud .tl', '#hud .tl .logo', '#profile', '#hud .tc', '#hud .tc > *', '#hud .tr', '#hud .tr .row > *', '.minimap .loc', '.minimap .n', '#questLog', '#chat', '#chatToggle', '#emotes', '#actions', '#actions button', '#actions button span', '#toast', '#joy', '#btnE', '.bolumOn', '#anchors > *', '#titlecard', '#btnWeek', '#btnWeekMobil'].flatMap(q);
    }), null, 1)); }

    await adim('ahir', async () => { await tik('#actions button[data-panel="ejderhalar"]'); await cek('04_ahir'); await kapat(); });
    await adim('arena', async () => {
      await p.evaluate(() => { if (S.dragons[0]) S.dragons[0].task = null; window.__noPre = 1; });
      await tik('#actions button[data-panel="arena"]'); await cek('05_arena');
      await tik('[data-fight]'); await p.waitForTimeout(900); await cek('06_dovus');
      await p.evaluate(() => { window.__fastFx = 1; const b = document.querySelector('#dovAct [data-auto]'); if (b) b.click(); });
      await p.waitForFunction(() => !!document.querySelector('.pen .gbtn'), null, { timeout: 25000 });
      await cek('07_dovus_sonu');
      for (let k = 0; k < 6; k++) {
        const durum = await p.evaluate(() => {
          const cz = document.querySelector('.cizgi');
          if (cz && cz.shadowRoot) { const cb = cz.shadowRoot.querySelector('[data-next]') || cz.shadowRoot.querySelector('.vopt:not([disabled])'); if (cb) { cb.click(); return 1; } }
          const vn = document.querySelector('.vn'); if (vn) { vn.click(); const b = document.querySelector('.vn .vn-opt:not([disabled])'); if (b) b.click(); return 1; }
          const pb = document.querySelector('.pen .gbtn:not([disabled])'); if (pb) { pb.click(); return 1; }
          return 0;
        });
        if (!durum) break;
        await p.waitForTimeout(400);
      }
      await kapat();
    });
    await adim('uretim', async () => { await tik('#actions button[data-panel="uretim"]'); await cek('08_kor_orsu');
      if (await p.locator('[data-kr-sekme="kusanma"]').count()) { await tik('[data-kr-sekme="kusanma"]'); await cek('09_kusanma'); }
      await kapat(); });
    await adim('topcu', async () => { await tik('#actions button[data-panel="topcu"]'); await p.waitForTimeout(400); await cek('10_topcu');
      if (await p.locator('[data-tp-mod="sahmeran"]').count()) { await tik('[data-tp-mod="sahmeran"]'); await cek('11_topcu_zindan'); }
      await kapat(); });
    await adim('envanter', async () => { await tik('#actions button[data-panel="envanter"]'); await cek('12_envanter'); await kapat(); });
    await adim('bedesten', async () => { await p.evaluate(() => EO2.game.open('bedesten')); await p.waitForTimeout(1500); await cek('13_bedesten');
      await p.evaluate(() => EO2.game.open('sandik')); await p.waitForTimeout(700); await cek('14_sandik'); await kapat(); });
    await adim('defter', async () => { await tik('#actions button[data-panel="gorevler"]'); await cek('15_defter');
      if (await p.locator('[data-muhur-sekme]').count()) { await tik('[data-muhur-sekme]'); await cek('16_muhurler'); }
      await kapat(); });
    await adim('sosyal', async () => { await tik('#actions button[data-panel="sosyal"]'); await cek('17_sosyal'); await kapat(); });
    await adim('menu', async () => { await tik('#actions button[data-panel="menu"]'); await cek('18_menu'); await kapat(); });
    await adim('son', async () => { await p.waitForTimeout(300); await cek('19_meydan_son'); });
    await ctx.close();
  }
} finally {
  fs.writeFileSync(path.join(out, 'rapor_' + kipler.join('_') + '.json'), JSON.stringify(rapor, null, 1));
  await browser.close().catch(() => {});
  try { srv.stdin.end(); } catch (_) {}
  try { srv.kill(); } catch (_) {}
}
console.log('bitti', out);
process.exit(0);
