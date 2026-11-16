// Ejder Ocağı 2.0 · duman testi: commit'ten önce koşan tek komut.
// Kullanım: node eo2/tools/duman.mjs   (ya da: npm run duman)
// Sırayla: 1) birim testleri  2) kendi geliştirme sunucusunu açar (3290, API 3291; geçici veri dizini)
//          3) tam tur denetimi (check_oyun.mjs: yeni ocak → hafta 2 → kayıt)  4) sahne gezisi: her sahneye girilir, sayfa hatası olmamalı
//          5) belge sayfaları ve yazı tipleri sunuluyor mu.
// Biri başarısızsa çıkış kodu 1'dir. Tarayıcı: Edge (playwright-core, check_oyun ile aynı).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json'));
const PORT = +(process.env.DUMAN_PORT || 3290), URL0 = 'http://localhost:' + PORT + '/';
const sonuc = []; const yaz = (ad, ok, not) => { sonuc.push({ ad, ok }); console.log((ok ? '  GEÇTİ  ' : '  KALDI  ') + ad + (not ? ' · ' + not : '')); };
const al = u => new Promise(res => { http.get(u, r => { let n = 0; r.on('data', c => n += c.length); r.on('end', () => res({ kod: r.statusCode, boy: n, tur: r.headers['content-type'] || '' })); }).on('error', () => res({ kod: 0, boy: 0, tur: '' })); });

// 1) birim testleri
{ const dosyalar = fs.readdirSync(path.join(repo, 'tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('tests', f));
  const r = spawnSync(process.execPath, ['--test', ...dosyalar], { cwd: repo, encoding: 'utf8' }), m = /ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(r.stdout || '');
  yaz('birim testleri', r.status === 0, m ? m[1] + ' geçti, ' + m[2] + ' kaldı' : 'çıktı okunamadı'); if (r.status !== 0) console.log((r.stdout || '').split('\n').filter(l => /^not ok|✖/.test(l)).slice(0, 20).join('\n')); }

// 2) sunucu
const sunucu = spawn(process.execPath, [path.join(repo, 'eo2', 'tools', 'serve.mjs'), String(PORT)], { cwd: repo, stdio: 'ignore' });
const kapat = () => { try { sunucu.kill(); } catch (_) { } };
process.on('exit', kapat);
let acik = false; for (let i = 0; i < 60 && !acik; i++) { await new Promise(r => setTimeout(r, 500)); acik = (await al(URL0)).kod === 200 && (await al(URL0 + 'api/session')).kod !== 0 && (await al(URL0 + 'api/session')).kod !== 503; }
yaz('geliştirme sunucusu', acik, URL0);

if (acik) {
  // 3) tam tur
  { const cikti = fs.mkdtempSync(path.join(os.tmpdir(), 'eo2-duman-'));
    const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_oyun.mjs'), cikti], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 300000 });
    let j = null; try { j = JSON.parse((r.stdout || '').slice((r.stdout || '').indexOf('{\n "log"'))); } catch (_) { }
    const ok = !!j && j.hata.length === 0 && j.log.sonra && j.log.sonra.hafta === 2 && j.log.sonra.kayit === true;
    yaz('tam tur (yeni ocak → hafta 2 → kayıt)', ok, j ? (j.hata.length ? j.hata.slice(0, 3).join(' | ') : 'hafta ' + (j.log.sonra && j.log.sonra.hafta)) : 'denetim çıktısı okunamadı: ' + String(r.stderr || '').slice(0, 300));
    try { fs.rmSync(cikti, { recursive: true, force: true }); } catch (_) { } }

  // 4) sahne gezisi
  { const { chromium } = require('playwright-core');
    const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
    const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), hata = [];
    p.on('pageerror', e => hata.push(String(e.message).slice(0, 160)));
    let not = '';
    try {
      await p.goto(URL0); await p.waitForFunction('window.EO2 && EO2.api && EO2.game && document.querySelector(".giris")', null, { timeout: 60000 });
      const gezi = await p.evaluate(async () => {
        const A = EO2.api, out = [], ids = Object.keys(EO2.sceneDefs).filter(i => !['pilot', 'deneme', 'pist'].includes(i));
        for (const id of [...ids, 'meydan']) { const hedef = id === 'meydan' ? 'master' : id; if (A.scene() === hedef) continue; A.go(id); let ok = false;
          for (let i = 0; i < 200 && !ok; i++) { await new Promise(r => setTimeout(r, 100)); ok = A.scene() === hedef && !document.getElementById('iris').classList.contains('on'); }
          await new Promise(r => setTimeout(r, 300)); out.push([id, ok]); }
        return out; });
      const kalan = gezi.filter(g => !g[1]).map(g => g[0]); not = gezi.length + ' sahne' + (kalan.length ? ', girilemeyen: ' + kalan.join(', ') : '') + (hata.length ? ', sayfa hatası: ' + hata.slice(0, 3).join(' | ') : '');
      yaz('sahne gezisi', !kalan.length && !hata.length, not);
    } catch (e) { yaz('sahne gezisi', false, String(e.message).slice(0, 200)); }
    await b.close(); }

  // 4b) hesap kurtarma: iki ayrı tarayıcı, kod, geri yükleme, çakışma
  { const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_hesap.mjs')], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 240000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (_) { }
    yaz('hesap kurtarma (kod, geri yükleme, çakışma)', r.status === 0 && !!j && j.ok, j ? (j.hata.length ? j.hata.slice(0, 2).join(' | ') : '') : String(r.stderr || '').slice(0, 200)); }

  // 4c) meydan: iki oyuncu birbirini görür, alan değişimi, jest, ayrılma
  { const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_meydan.mjs')], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 240000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (_) { }
    yaz('meydanda öteki oyuncular (iki tarayıcı)', r.status === 0 && !!j && j.ok, j ? (j.hata.length ? j.hata.slice(0, 2).join(' | ') : j.ok ? '' : JSON.stringify(j.log).slice(0, 240)) : String(r.stderr || '').slice(0, 200)); }

  // 4d) bire bir takas: teklif, masa, onay, vazgeçme (iki tarayıcı)
  { const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_takas.mjs')], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 240000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (_) { }
    yaz('bire bir takas (iki tarayıcı)', r.status === 0 && !!j && j.ok, j ? (j.hata.length ? j.hata.slice(0, 2).join(' | ') : j.ok ? '' : JSON.stringify(j.log).slice(0, 300)) : String(r.stderr || '').slice(0, 200)); }

  // 4e) dostlar: istek, kabul, fısıltı, çıkarma (iki tarayıcı)
  { const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_dost.mjs')], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 240000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (_) { }
    yaz('dostlar ve fısıltı (iki tarayıcı)', r.status === 0 && !!j && j.ok, j ? (j.hata.length ? j.hata.slice(0, 2).join(' | ') : j.ok ? '' : JSON.stringify(j.log).slice(0, 300)) : String(r.stderr || '').slice(0, 200)); }

  // 4f) Kıraathane oyuncu masası: davet, bahis tepsileri, kilit, zarlar, sonuç, rövanş, kalkan kaybeder (iki tarayıcı)
  { const r = spawnSync(process.execPath, [path.join(repo, 'eo2', 'tools', 'check_masa.mjs')], { cwd: repo, encoding: 'utf8', env: Object.assign({}, process.env, { URL: URL0 }), timeout: 240000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (_) { }
    yaz('Kıraathane oyuncu masası (iki tarayıcı)', r.status === 0 && !!j && j.ok, j ? (j.hata.length ? j.hata.slice(0, 2).join(' | ') : j.ok ? '' : JSON.stringify(j.log).slice(0, 300)) : String(r.stderr || '').slice(0, 200)); }

  // 5) belge sayfaları ve yazı tipleri
  { const g = await al(URL0 + 'gizlilik.html'), k = await al(URL0 + 'kosullar.html'), y = await al(URL0 + 'css/yazi.css'), pay = await al(URL0 + 'assets/paylasim.jpg');
    const adlar = (fs.readFileSync(path.join(repo, 'eo2', 'css', 'yazi.css'), 'utf8').match(/assets\/yazi\/[a-z0-9-]+\.woff2/g) || []), eksik = adlar.filter(a => !fs.existsSync(path.join(repo, 'eo2', a)));
    yaz('belge sayfaları, yazı tipleri, paylaşım görseli', g.kod === 200 && k.kod === 200 && y.kod === 200 && pay.kod === 200 && adlar.length > 0 && !eksik.length, eksik.length ? 'eksik: ' + eksik.join(', ') : adlar.length + ' yazı dosyası'); }
}
kapat();
const kaldi = sonuc.filter(s => !s.ok);
console.log(kaldi.length ? '\nDUMAN TESTİ KALDI: ' + kaldi.map(s => s.ad).join(', ') : '\nDuman testi geçti (' + sonuc.length + ' adım).');
process.exit(kaldi.length ? 1 : 0);
