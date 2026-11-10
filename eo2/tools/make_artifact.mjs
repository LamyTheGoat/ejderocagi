// EO2 dilimi: Artifact için sayfa parçası üretir (doctype/html/head/body olmadan, CSS satır içi).
// Kullanım: node eo2/tools/make_artifact.mjs <çıktı klasörü>
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = process.argv[2];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), css = fs.readFileSync(path.join(root, 'css', 'ui2.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'css', 'ui2_extra.css'), 'utf8');
const cut = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b)).trim();
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), cut('<!--HEAD-->', '<!--/HEAD-->') + '\n<style>\n' + css + '</style>\n' + cut('<!--BODY-->', '<!--/BODY-->') + '\n');
console.log('yazıldı', path.join(out, 'index.html'));
