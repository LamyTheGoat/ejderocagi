// EO2 · arena derleyici (2026-11-17, kullanıcı onaylı yöntem: eo2/docs/ZINDAN_YONTEMI.md)
// Her arena bir klasördür: eo2/arenalar/<ad>/ içinde  numaralı katman resimleri · blok.png (işaret katmanı) · arena.json
// KATMANLAR (kullanıcı, 2026-11-17): Krita katmanları numarayla dışa aktarılır; dosya adı numarayla başlar: "-2 gokyuzu.png", "0 kirilmaz zemin.png", "1 on sandalyeler.png".
//   Oyuncu hep 0'dadır: 0 ve altı oyuncunun ARKASINDA (küçük numara daha arkada), 1 ve üstü oyuncunun ÖNÜNDE çizilir.
//   Adında "kirilir" geçen katman kırılabilir zemin, "kirilmaz" geçen kırılamaz zemindir: çizdiğin yer zemin olur (yarıdan saydam yer zemin sayılmaz),
//   gülle kırılabilir katmanın resmini gerçekten oyar. Zemin katmanları PNG olmalı; ötekiler PNG ya da WebP. Hepsi blok.png ile aynı boyda.
//   Eski biçim: "sahne.webp" = −1 numaralı katman.
// Bu araç bütün klasörleri okur ve eo2/js/arena_veri.js dosyasını üretir; oyun da sunucu da yalnız o dosyayı okur.
// Yeni arena = yeni klasör + bu aracı çalıştırmak. Kod değişmez.
// Kullanım: node eo2/tools/arena_derle.mjs          (üretir)
//           node eo2/tools/arena_derle.mjs --denet  (üretmez; eldeki dosya güncel değilse hata verir)
//
// BLOK HARİTA RENKLERİ (kenar yumuşatma kapalı; alfa < 128 boş; kanal başına ±32 hoşgörü)
//   kırmızı #FF0000  kırılabilir zemin        koyu gri #404040  kırılamaz zemin
//   mavi    #0000FF  oyuncu doğuş kutusu (tam bir oyuncu boyunda; arenanın ölçeği bu kutunun YÜKSEKLİĞİNDEN çıkar)
//   sarı    #FFFF00  düşman kutusu (o düşmanın boyunda)     macenta #FF00FF  boss kutusu (boss'un boyunda)
//   yeşil   #00FF00  kamera alanı (içi boş dikdörtgen; yoksa kamera yüksekliği = 6 oyuncu boyu)
//   Kutuların alt kenarı = ayağın bastığı çizgi, yatay ortası = konum. Sarı kutular soldan sağa arena.json'daki düşman sırasıyla eşleşir.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { pngOku, boyutOku } from './png.mjs';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), klasor = path.join(kok, 'arenalar'), hedef = path.join(kok, 'js', 'arena_veri.js');
export const RENK = { kirilir: [255, 0, 0], kirilmaz: [64, 64, 64], oyuncu: [0, 0, 255], dusman: [255, 255, 0], boss: [255, 0, 255], kamera: [0, 255, 0] };
export const OYUNCU_BOYU = 1.7, DUNYA = { en: 64, boy: 30, hucre: 8 }, KAMERA_BOY = 6, ZEMIN_Y = 11;   // ZEMIN_Y: oyuncunun bastığı zemin dünyada bu yüksekliğe oturtulur (motorun kamerası ve eski arenalar bu yüksekliğe göre ayarlı)   // dünya birimi: savaş motorunun ölçüleri (js/battle.js)
const SINIF = Object.keys(RENK), yuvarla = (v, n = 100) => Math.round(v * n) / n;

/* blok haritayı okur: ölçek, zemin maskesi, kutular. Hata metinleri çizen kişiye yöneliktir. */
export function blokOku(png, ad, zeminler) {
  const { w, h, rgba } = png, sinif = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { if (rgba[i * 4 + 3] < 128) continue; const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    for (let k = 0; k < SINIF.length; k++) { const c = RENK[SINIF[k]]; if (Math.abs(r - c[0]) <= 32 && Math.abs(g - c[1]) <= 32 && Math.abs(b - c[2]) <= 32) { sinif[i] = k + 1; break; } } }
  // zemin katmanları: alfası yarıdan fazla olan yer zemindir; kırılmaz, kırılırın üstüne yazar (blok haritadaki kırmızı ve gri de geçerli kalır)
  for (const tip of ['kirilir', 'kirilmaz']) for (const z of (zeminler || [])) { if (z.tip !== tip) continue; const no = tip === 'kirilir' ? 1 : 2; for (let i = 0; i < w * h; i++) if (z.rgba[i * 4 + 3] >= 128 && (sinif[i] === 0 || sinif[i] === 1)) sinif[i] = no; }
  // dolu kutular: bağlı bileşenlerin sınır kutuları
  const kutular = no => { const gor = new Uint8Array(w * h), out = [], yigin = new Int32Array(w * h);
    for (let i = 0; i < w * h; i++) { if (sinif[i] !== no || gor[i]) continue; let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0, say = 0; yigin[n++] = i; gor[i] = 1;
      while (n) { const q = yigin[--n], x = q % w, y = (q - x) / w; say++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && sinif[q - 1] === no && !gor[q - 1]) { gor[q - 1] = 1; yigin[n++] = q - 1; } if (x < w - 1 && sinif[q + 1] === no && !gor[q + 1]) { gor[q + 1] = 1; yigin[n++] = q + 1; }
        if (y > 0 && sinif[q - w] === no && !gor[q - w]) { gor[q - w] = 1; yigin[n++] = q - w; } if (y < h - 1 && sinif[q + w] === no && !gor[q + w]) { gor[q + w] = 1; yigin[n++] = q + w; } }
      if (say >= 16) out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1 }); }
    return out.sort((a, b) => a.x0 - b.x0); };
  const mavi = kutular(3), sari = kutular(4), mor = kutular(5), yesil = kutular(6);
  if (!mavi.length) throw new Error(ad + ': blok haritada mavi oyuncu kutusu yok (#0000FF, tam bir oyuncu boyunda).');
  if (mor.length > 1) throw new Error(ad + ': birden fazla macenta boss kutusu var.');
  const ppu = (mavi[0].y1 - mavi[0].y0) / OYUNCU_BOYU, en = w / ppu, boy = h / ppu;   // ölçek: mavi kutunun yüksekliği = oyuncu boyu
  if (en > DUNYA.en + 0.01 || boy > DUNYA.boy + 0.01) throw new Error(ad + ': arena oyuncuya göre çok büyük (' + yuvarla(en, 10) + ' × ' + yuvarla(boy, 10) + ' birim; en çok ' + DUNYA.en + ' × ' + DUNYA.boy + '). Mavi kutuyu büyüt ya da çizimi küçült: genişlik en çok ' + Math.floor(DUNYA.en / OYUNCU_BOYU) + ' oyuncu boyu olabilir.');
  // resmin alt kenarının dünyadaki yüksekliği: ilk mavi kutunun altı ZEMIN_Y'ye gelir (hücreye yuvarlanır)
  const taban = Math.max(0, Math.round((ZEMIN_Y - (h - mavi[0].y1) / ppu) * DUNYA.hucre) / DUNYA.hucre);
  if (taban + boy > DUNYA.boy + 0.01) throw new Error(ad + ': çizim oyuncunun üstünde çok yüksek (' + yuvarla(taban + boy, 10) + ' birim; en çok ' + DUNYA.boy + '). Üstten kırp ya da mavi kutuyu büyüt.');
  const kutu = q => ({ x: yuvarla((q.x0 + q.x1) / 2 / ppu), y: yuvarla((h - q.y1) / ppu + taban), h: yuvarla((q.y1 - q.y0) / ppu), w: yuvarla((q.x1 - q.x0) / ppu) });
  // zemin maskesi: dünya ızgarası (64×30 birim, birimde 8 hücre); 1 kırılır, 2 kırılmaz. Sıkıştırma: [değer, adet, değer, adet, …]
  const MW = DUNYA.en * DUNYA.hucre, MH = DUNYA.boy * DUNYA.hucre, rle = []; let son = -1, zemin = 0;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const px = Math.floor((i + 0.5) / DUNYA.hucre * ppu), py = Math.floor(h - ((j + 0.5) / DUNYA.hucre - taban) * ppu), s = px >= 0 && px < w && py >= 0 && py < h ? sinif[py * w + px] : 0, v = s === 1 ? 1 : s === 2 ? 2 : 0;
    if (v) zemin++; if (v === son) rle[rle.length - 1]++; else { rle.push(v, 1); son = v; } }
  if (!zemin) throw new Error(ad + ': zemin yok. Adında "kirilir" ya da "kirilmaz" geçen bir katman çiz (ya da blok haritaya kırmızı #FF0000 / koyu gri #404040 boya).');
  const kam = yesil.length ? yesil.reduce((a, q) => ({ x0: Math.min(a.x0, q.x0), y0: Math.min(a.y0, q.y0), x1: Math.max(a.x1, q.x1), y1: Math.max(a.y1, q.y1) })) : null;
  return { ppu: yuvarla(ppu, 1000), en: yuvarla(en), boy: yuvarla(boy), taban, px: [w, h], oyuncu: mavi.map(kutu), dusman: sari.map(kutu), boss: mor.length ? kutu(mor[0]) : null,
    kamera: kam ? { x: yuvarla((kam.x0 + kam.x1) / 2 / ppu), y: yuvarla((h - (kam.y0 + kam.y1) / 2) / ppu + taban), w: yuvarla((kam.x1 - kam.x0) / ppu), h: yuvarla((kam.y1 - kam.y0) / ppu) } : null, maske: rle };
}

/* bir klasörü tam arena kaydına çevirir (blok harita + arena.json) */
export function arenaKur(ad, json, blok, katman) {
  for (const alan of ['ad', 'alt', 'ipucu', 'tema', 'ortam', 'ust', 'altRenk']) if (typeof json[alan] !== 'string' || !json[alan]) throw new Error(ad + ': arena.json içinde "' + alan + '" eksik.');
  const dus = json.dusman || []; if (dus.length !== blok.dusman.length) throw new Error(ad + ': arena.json ' + dus.length + ' düşman sayıyor, blok haritada ' + blok.dusman.length + ' sarı kutu var.');
  if (!!json.boss !== !!blok.boss) throw new Error(ad + ': boss ' + (json.boss ? 'arena.json içinde var ama blok haritada macenta kutu yok.' : 'kutusu blok haritada var ama arena.json içinde boss yok.'));
  if (json.tur === 'pvp') { if (dus.length || json.boss) throw new Error(ad + ': düello arenasında ("tur": "pvp") düşman ya da boss olmaz.'); if (blok.oyuncu.length < 2) throw new Error(ad + ': düello arenasında en az iki mavi kutu olmalı (sol ve sağ uç).'); }
  else if (!dus.length && !json.boss) throw new Error(ad + ': en az bir düşman ya da boss olmalı (düello arenası için arena.json içine "tur": "pvp" yaz).');
  const can = (q, kim) => { if (!q.tip || !q.ad || !(Number.isInteger(q.hp) && q.hp > 0)) throw new Error(ad + ': ' + kim + ' için tip, ad ve hp (tam sayı) gerekli.'); };
  dus.forEach((q, i) => can(q, (i + 1) + '. düşman')); if (json.boss) { can(json.boss, 'boss'); if (!json.boss.unvan) throw new Error(ad + ': boss için unvan gerekli.'); }
  return { tur: json.tur === 'pvp' ? 'pvp' : 'pve', ad: json.ad, alt: json.alt, ipucu: json.ipucu, tema: json.tema, ortam: json.ortam, sahne: { ust: json.ust, alt: json.altRenk }, katman: katman || [],
    ppu: blok.ppu, en: blok.en, boy: blok.boy, taban: blok.taban, px: blok.px, kameraBoy: json.kameraBoy || KAMERA_BOY, kamera: blok.kamera, oyuncu: blok.oyuncu,
    // fizik: true = altındaki zemine düşer · false = uçar (hayalet: true ise zeminin içinden de geçer)
    // dalga: 2, 3… = önceki dalgalar inince belirir · uyan: mesafe = bir terbiyeci bu kadar yaklaşana (ya da vurana) dek uyur
    // hasar: düşmanın hasar oranı (1 = türün olağan hasarı) · cagri: boss çağırır (sahnede yılan kalmayan tur başında hepsi birden belirir)
    dusman: dus.map((q, i) => Object.assign({ tip: q.tip, ad: q.ad, hp: q.hp, fizik: q.fizik !== false, hayalet: !!q.hayalet }, q.dalga > 1 ? { dalga: Math.floor(q.dalga) } : {}, q.uyan > 0 ? { uyan: Math.round(q.uyan) } : {}, q.hasar > 0 ? { hasar: Math.round(q.hasar * 100) / 100 } : {}, q.cagri ? { cagri: true } : {}, blok.dusman[i])),
    boss: json.boss ? Object.assign({ tip: json.boss.tip, ad: json.boss.ad, unvan: json.boss.unvan, hp: json.boss.hp }, blok.boss) : null, maske: blok.maske };
}

/* ÇİZİMSİZ ARENA (2026-11-17): arena.json içinde "eski": { zindan, asama } varsa arena, eski tek kişilik seferin o aşamasıdır.
   Zemin biçimi, arka plan, deniz ve özel kurallar js/topcu_veri.js ZINDAN[zindan].asama[asama] içinden alınır (oyun kurar); burada yalnız
   sunucunun bilmesi gerekenler durur: düşmanlar ve canları (sıra: düşmanlar, sonra boss). Kendi çizimi gelince "eski" silinir, klasöre blok harita ve katmanlar konur. */
export function eskiKur(ad, json) {
  if (!json.eski.zindan || !Number.isInteger(json.eski.asama)) throw new Error(ad + ': "eski" için zindan ve asama (tam sayı) gerekli.');
  for (const alan of ['ad', 'alt']) if (typeof json[alan] !== 'string' || !json[alan]) throw new Error(ad + ': arena.json içinde "' + alan + '" eksik.');
  const dus = json.dusman || []; if (!dus.length && !json.boss) throw new Error(ad + ': en az bir düşman ya da boss olmalı.');
  const can = (q, kim) => { if (!q.tip || !q.ad || !(Number.isInteger(q.hp) && q.hp > 0)) throw new Error(ad + ': ' + kim + ' için tip, ad ve hp (tam sayı) gerekli.'); };
  dus.forEach((q, i) => can(q, (i + 1) + '. düşman')); if (json.boss) { can(json.boss, 'boss'); if (!json.boss.unvan) throw new Error(ad + ': boss için unvan gerekli.'); }
  return { tur: 'pve', eski: { zindan: json.eski.zindan, asama: json.eski.asama }, ad: json.ad, alt: json.alt, dusman: dus.map(q => ({ tip: q.tip, ad: q.ad, hp: q.hp })), boss: json.boss ? { tip: json.boss.tip, ad: json.boss.ad, unvan: json.boss.unvan, hp: json.boss.hp } : null };
}

const sade = s => s.toLowerCase().replace(/ı/g, 'i').replace(/İ/gi, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
/* klasördeki katman dosyalarını sıraya dizer: [{ dosya, z, zemin }] (z'ye, sonra ada göre) */
export function katmanlariBul(dosyalar, ad) { const out = [];
  for (const f of dosyalar) { if (f === 'blok.png' || f === 'arena.json' || /^[._]/.test(f) || /\.(kra|kra~|psd|txt|md)$/i.test(f)) continue;
    const m = /^(.*)\.(png|webp)$/i.exec(f); if (!m) throw new Error(ad + ': tanınmayan dosya "' + f + '" (katmanlar PNG ya da WebP olmalı).');
    const govde = m[1], n = /^(-?\d+)(?:[ _.-]+(.*))?$/.exec(govde), isim = sade(n ? (n[2] || '') : govde);
    if (!n && isim !== 'sahne') throw new Error(ad + ': "' + f + '" hangi sırada çizilecek? Dosya adı katman numarasıyla başlamalı, örnek: "-1 arka duvar.png", "0 kirilmaz zemin.png", "1 on perde.png".');
    const zemin = /kirilmaz/.test(isim) ? 'kirilmaz' : /kirilir|kirilabilir/.test(isim) ? 'kirilir' : null;
    if (zemin && !/\.png$/i.test(f)) throw new Error(ad + ': zemin katmanı "' + f + '" PNG olmalı (şekli okunabilsin).');
    out.push({ dosya: f, z: n ? +n[1] : -1, zemin }); }
  if (!out.length) throw new Error(ad + ': hiç katman resmi yok.');
  return out.sort((a, b) => a.z - b.z || (a.dosya < b.dosya ? -1 : 1)); }
export function hepsiniDerle() { const out = {};
  for (const ad of fs.readdirSync(klasor).sort()) { const d = path.join(klasor, ad); if (!fs.statSync(d).isDirectory()) continue;
    if (!/^[a-z0-9-]+$/.test(ad)) throw new Error(ad + ': klasör adı küçük harf, rakam ve tire olmalı.');
    if (!fs.existsSync(path.join(d, 'arena.json'))) throw new Error(ad + ': arena.json yok.');
    { const j = JSON.parse(fs.readFileSync(path.join(d, 'arena.json'), 'utf8')); if (j.eski) { out[ad] = eskiKur(ad, j); continue; } }
    if (!fs.existsSync(path.join(d, 'blok.png'))) throw new Error(ad + ': blok.png yok.');
    const png = pngOku(fs.readFileSync(path.join(d, 'blok.png'))), K = katmanlariBul(fs.readdirSync(d), ad), zeminler = [];
    for (const k of K) { const buf = fs.readFileSync(path.join(d, k.dosya)), q = boyutOku(buf);
      if (q.w !== png.w || q.h !== png.h) throw new Error(ad + ': "' + k.dosya + '" ' + q.w + '×' + q.h + ', blok.png ise ' + png.w + '×' + png.h + '. Bütün katmanlar tuvalin tamamı olarak aynı boyda dışa aktarılmalı (katman içeriğine göre kırpma kapalı).');
      if (k.zemin) zeminler.push({ tip: k.zemin, rgba: pngOku(buf).rgba }); }
    out[ad] = arenaKur(ad, JSON.parse(fs.readFileSync(path.join(d, 'arena.json'), 'utf8')), blokOku(png, ad, zeminler), K.map(k => Object.assign({ src: 'arenalar/' + ad + '/' + encodeURIComponent(k.dosya), z: k.z }, k.zemin ? { zemin: k.zemin } : {}))); }
  return out; }
export const dosyaMetni = A => '/* ÜRETİLMİŞ DOSYA: elle değiştirme. Kaynak: eo2/arenalar/<ad>/ (sahne.webp, blok.png, arena.json) · üreten: node eo2/tools/arena_derle.mjs\n   Oyun (js/zindan_ortak.js) ve sunucu (server/zindan_ortak.js) arenaları buradan okur. Yöntem: eo2/docs/ZINDAN_YONTEMI.md */\n' +
  '(function (kok) {\n  \'use strict\';\n  const ARENA = {\n' + Object.keys(A).map(k => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(A[k])).join(',\n') + '\n  };\n  if (typeof module !== \'undefined\' && module.exports) module.exports = ARENA; else kok.EO2_ARENA = ARENA;\n})(typeof window !== \'undefined\' ? window : this);\n';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const A = hepsiniDerle(), metin = dosyaMetni(A);
    if (process.argv.includes('--denet')) { if (!fs.existsSync(hedef) || fs.readFileSync(hedef, 'utf8').replace(/\r\n/g, '\n') !== metin) { console.error('arena_veri.js güncel değil: node eo2/tools/arena_derle.mjs'); process.exit(1); } console.log('arena_veri.js güncel (' + Object.keys(A).length + ' arena).'); }
    else { fs.writeFileSync(hedef, metin); for (const k in A) console.log(A[k].eski ? k + ': çizimsiz (eski ' + A[k].eski.zindan + ' aşama ' + (A[k].eski.asama + 1) + ') · ' + A[k].dusman.length + ' düşman' + (A[k].boss ? ' · boss' : '') : k + ': ' + A[k].en + ' × ' + A[k].boy + ' birim · ' + A[k].oyuncu.length + ' oyuncu kutusu · ' + A[k].dusman.length + ' düşman' + (A[k].boss ? ' · boss' : '') + (A[k].kamera ? ' · kamera çizili' : '')); }
  } catch (e) { console.error('HATA · ' + e.message); process.exit(1); }
}
