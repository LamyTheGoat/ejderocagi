// Ejder Ocağı 2.0 · yeni kesilmiş madalyonları ailenin ortak çerçevesine oturtur (2026-11-16)
// Farklı üretimlerden gelen madalyonların altın çerçevesi ve disk tonu birbirini tutmaz. Bu araç her madalyonun yalnız
// iç resmini (simgeyi) alır ve örnek madalyonun (varsayılan mdl-daha) çerçevesi ile lacivert diskinin üstüne koyar.
// Kullanım: node eo2/tools/madalyon_esle.mjs <girdi klasörü> <çıktı klasörü> [örnek.webp] [iç yarıçap oranı=0.74]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const [girdi, cikti, ornekS, icS] = process.argv.slice(2);
if (!girdi || !cikti) { console.error('Kullanım: node eo2/tools/madalyon_esle.mjs <girdi> <çıktı> [örnek] [iç oran]'); process.exit(1); }
const ornek = ornekS || path.join(repo, 'eo2', 'assets', 'ik', 'mdl-daha.webp'), IC = +(icS || 0.74);
const uri = f => 'data:image/' + (f.endsWith('.png') ? 'png' : 'webp') + ';base64,' + fs.readFileSync(f).toString('base64');
const adlar = fs.readdirSync(girdi).filter(f => /\.(webp|png)$/.test(f)); fs.mkdirSync(cikti, { recursive: true });
const br = await chromium.launch({ channel: 'msedge', headless: true }), pg = await br.newPage();
const sonuc = await pg.evaluate(async ({ ornek, liste, IC }) => {
  const yukle = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const O = await yukle(ornek), B = O.naturalWidth, R = B / 2;
  // boş taban: örneğin çerçevesi + ortası örneğin kendi disk rengiyle boyanmış
  const taban = document.createElement('canvas'); taban.width = taban.height = B; const tx = taban.getContext('2d'); tx.drawImage(O, 0, 0);
  const d = tx.getImageData(0, 0, B, B).data, al = (x, y) => { const i = (Math.round(y) * B + Math.round(x)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  // disk rengi: merkezden 0.62R uzaklıkta, sekiz yönde en koyu örneklerin ortalaması (simgenin dışı)
  const or = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; or.push(al(R + Math.cos(a) * R * 0.66, R + Math.sin(a) * R * 0.66)); }
  or.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2])); const koyu = or.slice(0, 8), renk = [0, 1, 2].map(c => Math.round(koyu.reduce((s, p) => s + p[c], 0) / koyu.length));
  tx.fillStyle = 'rgb(' + renk.join(',') + ')'; tx.beginPath(); tx.arc(R, R, R * (IC + 0.07), 0, Math.PI * 2); tx.fill();
  const out = [];
  for (const [ad, u] of liste) { const im = await yukle(u), c = document.createElement('canvas'); c.width = c.height = B; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    // yeni madalyonun iç resmi: kenara doğru yumuşayan dairesel maske
    const m = document.createElement('canvas'); m.width = m.height = B; const mx = m.getContext('2d'); mx.imageSmoothingQuality = 'high'; mx.drawImage(im, 0, 0, B, B);
    const g = mx.createRadialGradient(R, R, R * (IC - 0.06), R, R, R * (IC + 0.05)); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mx.globalCompositeOperation = 'destination-in'; mx.fillStyle = g; mx.fillRect(0, 0, B, B);
    x.drawImage(taban, 0, 0); x.drawImage(m, 0, 0); out.push([ad, c.toDataURL('image/webp', 0.94)]); }
  return { renk, out };
}, { ornek: uri(ornek), liste: adlar.map(a => [a, uri(path.join(girdi, a))]), IC });
for (const [ad, veri] of sonuc.out) fs.writeFileSync(path.join(cikti, ad.replace(/\.png$/, '.webp')), Buffer.from(veri.split(',')[1], 'base64'));
await br.close(); console.log(adlar.length + ' madalyon, disk rengi rgb(' + sonuc.renk.join(',') + ')');
