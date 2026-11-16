// Yazı tiplerini Google Fonts'tan bir kez indirir ve kendi sunucumuzdan verilecek hâle getirir.
// Kullanım: node eo2/tools/yazi_indir.mjs
// Çıktı: eo2/assets/yazi/*.woff2 ve eo2/css/yazi.css (yalnız latin ve latin-ext alt kümeleri; Türkçe için ikisi de gerekir).
// Aileler SIL Open Font License ile dağıtılır: Alegreya, Alegreya Sans, Alegreya SC, Grenze Gotisch, Noto Sans.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADRES = 'https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@700;800&family=Alegreya+Sans:wght@400;500;700;800&family=Alegreya:ital,wght@0,400;0,600;1,400&family=Grenze+Gotisch:wght@500;600&family=Noto+Sans:wght@500;600;700;800&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const css = await (await fetch(ADRES, { headers: { 'User-Agent': UA } })).text();
const klasor = path.join(kok, 'assets', 'yazi'); fs.mkdirSync(klasor, { recursive: true });
const bloklar = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face \{[^}]+\})/g)].filter(m => m[1] === 'latin' || m[1] === 'latin-ext');
const inen = new Map(); let cikti = '/* Ejder Ocağı 2.0 · yazı tipleri kendi sunucumuzdan (tools/yazi_indir.mjs üretir; elle düzenleme) */\n';
for (const [, alt, blok] of bloklar) {
  const url = /url\((https:[^)]+\.woff2)\)/.exec(blok)[1], aile = /font-family: '([^']+)'/.exec(blok)[1], stil = /font-style: (\w+)/.exec(blok)[1], kalin = /font-weight: ([\d ]+)/.exec(blok)[1].trim();
  if (!inen.has(url)) {
    const ad = (aile.replace(/\s+/g, '') + '-' + (stil === 'italic' ? 'i' : 'n') + '-' + alt + '-' + String(inen.size).padStart(2, '0')).toLowerCase() + '.woff2';
    const veri = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
    if (veri.length < 1000 || veri.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error('woff2 değil: ' + url);
    fs.writeFileSync(path.join(klasor, ad), veri); inen.set(url, ad);
  }
  cikti += blok.replace(url, '../assets/yazi/' + inen.get(url)).replace(/\s*\n\s*/g, ' ') + '   /* ' + aile + ' ' + kalin + ' ' + alt + ' */\n';
}
fs.writeFileSync(path.join(kok, 'css', 'yazi.css'), cikti);
const boyut = [...inen.values()].reduce((a, ad) => a + fs.statSync(path.join(klasor, ad)).size, 0);
console.log(bloklar.length + ' kural, ' + inen.size + ' dosya, ' + Math.round(boyut / 1024) + ' KB');
