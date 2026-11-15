// Fragman oynatıcısını Artifact için hazırlar: sayfa parçası (doctype/html/head/body olmadan) + yanında yayımlanacak dosya listesi.
// Yollar eo2 köküne göre yeniden yazılır (assets/…, js/…, trailer/…). Kullanım: node eo2/trailer/tools/make_artifact.mjs <çıktı klasörü>
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const tr = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), root = path.resolve(tr, '..'), out = process.argv[2];
const html = fs.readFileSync(path.join(tr, 'index.html'), 'utf8'), cut = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b)).trim();
let body = cut('<!--BODY-->', '<!--/BODY-->').replace("window.EO2_PATH || { game: '../', tr: '' }", "{ game: '', tr: 'trailer/' }").replace(/src="\.\.\//g, 'src="').replace(/src="(engine|fx|score|film|shots|player)\.js"/g, 'src="trailer/$1.js"');
const page = '<title>Ejder Ocağı Fragmanı</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@700;800&family=Alegreya+Sans:wght@400;500;700&display=swap">\n' + cut('<!--HEAD-->', '<!--/HEAD-->') + '\n' + body + '\n';
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'ejder-ocagi-fragmani.html'), page);
const files = [...[...page.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]), ...fs.readdirSync(path.join(tr, 'assets')).map(f => 'trailer/assets/' + f), ...['dragon', 'logo'].map(f => 'assets/' + f + '.webp'),
  ...fs.readdirSync(path.join(root, 'assets')).filter(f => /^(chibi|battle)_.*\.webp$/.test(f)).map(f => 'assets/' + f), ...['dr-ates-yetiskin', 'dr-buz-genc', 'dr-toprak-yavru', 'pvp_prop_wagon', 'ates-P4'].map(f => 'assets/ext/' + f + '.webp')];
const miss = files.filter(f => !fs.existsSync(path.join(root, f))), mb = files.reduce((s, f) => s + (fs.existsSync(path.join(root, f)) ? fs.statSync(path.join(root, f)).size : 0), 0) / 1048576;
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files)); console.log(JSON.stringify({ sayfa: path.join(out, 'ejder-ocagi-fragmani.html'), dosya: files.length, MB: +mb.toFixed(1), eksik: miss }));
