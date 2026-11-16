// Ejder Ocağı 2.0 · dövüş ve yarış karelerinin (çizgi roman ara kareleri) stilini eski style.css'ten ayıklar.
// Eski oyunun kareleri (js/fsupport.js fightCut, js/race.js raceCut) .rcut ailesi sınıflarıyla çizilir; 2.0 eski stil
// dosyasını yüklemez. Bu araç yalnız o aileye ait kuralları ve kullandıkları @keyframes'i eo2/css/kare.css'e yazar.
// Kullanım: node eo2/tools/kare_css.mjs   (style.css değişirse yeniden koş)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), css = fs.readFileSync(path.join(repo, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// üst düzey blokları ayır (iç içe süslü parantez: @media, @keyframes)
const bloklar = []; { let i = 0, bas = 0, derin = 0; for (; i < css.length; i++) { const c = css[i]; if (c === '{') derin++; else if (c === '}') { derin--; if (derin === 0) { bloklar.push(css.slice(bas, i + 1).trim()); bas = i + 1; } } } }
const AILE = /\.(rcut|fcut|rcp|rcbg|rcd|rccap|rcono|rctone|rclines|rcrad|rcn|rcdeb|rcaura|rcgl|fbreath|pflash|suptag|fs[ABC]\b|zz\b)/;
const secici = b => b.slice(0, b.indexOf('{'));
const kurallar = [], kareAd = new Set(); let kok = '';
for (const b of bloklar) {
  const s = secici(b);
  if (/^:root\b/.test(s.trim()) && !kok) { kok = b.slice(b.indexOf('{') + 1, -1); continue; }
  if (s.startsWith('@keyframes') || s.startsWith('@font-face') || s.startsWith('@import')) continue;
  if (s.startsWith('@media') || s.startsWith('@supports')) {   // içindeki aile kurallarını al
    const ic = b.slice(b.indexOf('{') + 1, -1), alt = []; let j = 0, bs = 0, d = 0; for (; j < ic.length; j++) { if (ic[j] === '{') d++; else if (ic[j] === '}') { d--; if (d === 0) { alt.push(ic.slice(bs, j + 1).trim()); bs = j + 1; } } }
    const sec = alt.filter(a => AILE.test(secici(a)) && secici(a).split(',').every(x => AILE.test(x)));
    if (sec.length) kurallar.push(s.trim() + ' { ' + sec.join(' ') + ' }'); continue;
  }
  // yalnız bütün seçicileri aileden olan kurallar: karışık seçicili kurallar 2.0 arayüzüne sızmasın
  const parcalar = s.split(',').map(x => x.trim()).filter(Boolean), aile = parcalar.filter(x => AILE.test(x));
  if (!aile.length) continue;
  kurallar.push(aile.join(', ') + ' ' + b.slice(b.indexOf('{')));
}
for (const k of kurallar) for (const m of k.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) for (const ad of m[1].split(/[\s,]+/)) if (/^[a-zA-Z_][\w-]*$/.test(ad) && !/^(infinite|linear|ease|ease-in|ease-out|ease-in-out|both|forwards|backwards|alternate|normal|reverse|none|running|paused|steps)$/.test(ad)) kareAd.add(ad);
const kareler = bloklar.filter(b => b.startsWith('@keyframes') && kareAd.has(b.slice(10, b.indexOf('{')).trim()));
// eski :root değişkenleri yalnız karelerin içinde tanımlanır; görsel adresleri eski oyunun köküne çevrilir (kare.css eo2/css altındadır)
const degisken = kok.split(';').map(x => x.trim()).filter(x => x.startsWith('--')).join('; ');
let cikti = '/* Ejder Ocağı 2.0 · dövüş ve yarış kareleri (çizgi roman ara kareleri)\n   tools/kare_css.mjs eski style.css\'ten ayıklar; elle düzenleme. 2.0\'a özgü ayarlar cila.css\'tedir. */\n' +
  '.rcut { ' + degisken + '; }\n' + kurallar.join('\n') + '\n' + kareler.map(k => k.replace(/^@keyframes\s+/, '@keyframes ')).join('\n') + '\n';
cikti = cikti.replace(/url\(\s*(['"]?)(img|assets|sfx)\//g, (m, t, k) => 'url(' + t + '../../' + k + '/');
fs.writeFileSync(path.join(repo, 'eo2', 'css', 'kare.css'), cikti);
console.log(kurallar.length + ' kural, ' + kareler.length + ' animasyon, ' + Math.round(cikti.length / 1024) + ' KB; eksik animasyon: ' + [...kareAd].filter(a => !kareler.some(k => k.slice(10, k.indexOf('{')).trim() === a)).join(', '));
