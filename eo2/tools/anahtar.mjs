// EO2 · renk anahtarı: düz renkli zeminde (macenta, camgöbeği…) çizilmiş çizimi keser.
// Kullanım: node eo2/tools/anahtar.mjs <girdi> <çıktı.webp> [enPx=1024] [mod=dolgu|tum] [boyPx] [seçenekler]
//   dolgu : yalnız kenara bağlı zemin saydam olur. Yapı, fıçı, sandık gibi içinde boşluk olmayan parçalar için.
//   tum   : nesnenin içinde kalan düz zemin adaları da saydam olur (ağaç tacının, bank demirinin, sacayağının boşlukları).
// Seçenekler (sırasız; oranlar 0..1, kes= uygulanmış kaynağa göre):
//   kes=x0,y0,x1,y1      : kesmeden önce kaynağın bu bölümünü al (kırpılan kenarda zemin aranmaz)
//   tohum=x,y;x,y        : içeride kalan zemin adasına elle tohum (ör. açık kemerin içi)
//   ic=koyu              : kesilmeyen zemin rengi adaları koyu erik rengine boyanır (kapı içi karanlığı)
//   kemer=cx,ust,en,alt  : kemer biçimli bölge saydam olur (içine manzara çizilmiş kapı boşluğunu açmak için)
//   sil=x0,y0,x1,y1;…    : bu dikdörtgenler saydam olur (zeminde kalan gölge parçası)
//   sonsil=x0,y0,x1,y1;… : kırpılmış ÇIKTIDA bu dikdörtgenler silinir (oranlar çıktıya göre)
//   golge=1              : zemin tonundaki her piksel (zemine düşmüş koyu gölge dahil) saydam olur; kırmızı/pembe içeren parçada kullanma
//   ayna=1               : çıktıyı yatay çevir
//   zemin=alt            : zemin rengini yalnız alt köşelerden al (yukarıdan sarkan dal gibi üst kenarı dolu görsel)
//   duz=1                : hiç kesme, yalnız kes= bölümünü küçült (duvar dokusu); filtre=saturate(0.7)_brightness(1.05) ile renk ayarı
//   govde=1              : kestikten sonra yatayda yalnız gövdeyi bırak (tabanı dolu sütunlar); yan duvar dokusunda saçak taşması kalmasın
// Yöntem: zemin rengi köşelerden kestirilir. Zemin, tohumlardan (kenar, düz iç adalar, elle verilenler) YUMUŞAK GEÇİŞLE büyütülür:
// komşudan komşuya renk sıçraması küçükse yayılır. Kenar çizgisi keskin bir sıçramadır, yayılmayı durdurur; bu yüzden zemine
// yakın renkli çatı gölgesi ya da ahşap, arada çizgi olduğu sürece kesilmez. Zemindeki yumuşak gölge zeminle birlikte gider.
// Çıktı nesnenin sınır kutusuna kırpılır (alt kenar = taban). Yarı saydam piksel oranı yazılır: temiz kesimde %6'nın altındadır.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const hepsi = process.argv.slice(2), ek = Object.fromEntries(hepsi.filter(v => /^[a-z]+=/.test(v)).map(v => [v.slice(0, v.indexOf('=')), v.slice(v.indexOf('=') + 1)])), [src, out, en = '1024', mod = 'dolgu', boy = '0'] = hepsi.filter(v => !/^[a-z]+=/.test(v));
if (!src || !out) { console.log('kullanım: anahtar.mjs <girdi> <çıktı.webp> [enPx] [dolgu|tum] [boyPx] [kes= tohum= ic= kemer= ayna= duz=]'); process.exit(1); }
const ext = path.extname(src).slice(1).toLowerCase(), data = 'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + fs.readFileSync(src).toString('base64');
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
const res = await p.evaluate(async ({ data, en, mod, boy, ek }) => {
  const im = new Image(); im.src = data; await im.decode(); const kk = (ek.kes || '0,0,1,1').split(',').map(Number), sx = Math.round(kk[0] * im.naturalWidth), sy = Math.round(kk[1] * im.naturalHeight), W = Math.round((kk[2] - kk[0]) * im.naturalWidth), H = Math.round((kk[3] - kk[1]) * im.naturalHeight);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, sx, sy, W, H, 0, 0, W, H);
  const bitir = (bx, by, bw, bh, ekstra) => { const k = Math.min(1, boy > 0 ? Math.min(en / bw, boy / bh) : en / bw), o = document.createElement('canvas'); o.width = Math.round(bw * k); o.height = Math.round(bh * k); const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; if (ek.ayna) { ox.translate(o.width, 0); ox.scale(-1, 1); } ox.drawImage(c, bx, by, bw, bh, 0, 0, o.width, o.height); ox.setTransform(1, 0, 0, 1, 0, 0); for (const r of (ek.sonsil || '').split(';').filter(Boolean)) { const [a0, b0, a1, b1] = r.split(',').map(Number); ox.clearRect(a0 * o.width, b0 * o.height, (a1 - a0) * o.width, (b1 - b0) * o.height); } return Object.assign({ url: o.toDataURL('image/webp', 0.93), w: o.width, h: o.height }, ekstra); };
  if (ek.duz) { if (ek.filtre) { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const x2 = c2.getContext('2d'); x2.filter = ek.filtre.replace(/_/g, ' '); x2.drawImage(c, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(c2, 0, 0); } return bitir(0, 0, W, H, { yari: 0, zemin: '-' }); }
  const id = x.getImageData(0, 0, W, H), d = id.data, N = W * H;
  /* zemin modeli: köşe şeritlerinin ortanca rengi, dört köşe arası çift doğrusal (kenar karartması zemin sayılır). kes= ile kırpılan kenar zemin olmayabilir: köşeler birbirine benzemiyorsa en çok tekrar eden köşe rengi alınır */
  const ort = (x0, y0, x1, y1) => { const r = [], g = [], bl = []; for (let y = y0; y < y1; y += 2) for (let X = x0; X < x1; X += 2) { const o = (y * W + X) * 4; r.push(d[o]); g.push(d[o + 1]); bl.push(d[o + 2]); } const m = a => a.sort((p, q) => p - q)[a.length >> 1]; return [m(r), m(g), m(bl)]; };
  const kw = Math.round(W * 0.12), kh = Math.round(H * 0.12), s = 10, C = [ort(2, 2, kw, s), ort(W - kw, 2, W - 2, s), ort(2, H - s, kw, H - 2), ort(W - kw, H - s, W - 2, H - 2)];
  if (ek.zemin === 'alt') { C[0] = C[2].slice(); C[1] = C[3].slice(); }   // zemin=alt: zemin rengi yalnız alt köşelerden (üstü nesneyle dolu görselde)
  { const uz = (a, bb) => Math.hypot(a[0] - bb[0], a[1] - bb[1], a[2] - bb[2]), oy = C.map(a => C.filter(bb => uz(a, bb) < 46).length), en2 = Math.max(...oy), iyi = C[oy.indexOf(en2)]; for (let i = 0; i < 4; i++) if (uz(C[i], iyi) >= 46) C[i] = iyi.slice(); }
  const bgAt = (X, y, k) => { const u = X / (W - 1), v = y / (H - 1); return (C[0][k] * (1 - u) + C[1][k] * u) * (1 - v) + (C[2][k] * (1 - u) + C[3][k] * u) * v; };
  const ss = (a, bb, t) => { const k = Math.max(0, Math.min(1, (t - a) / (bb - a))); return k * k * (3 - 2 * k); }, bgn = new Float32Array(N), dist = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const i = y * W + X, o = i * 4, B = [bgAt(X, y, 0), bgAt(X, y, 1), bgAt(X, y, 2)], mp = (d[o] + d[o + 1] + d[o + 2]) / 3, mb = (B[0] + B[1] + B[2]) / 3;
    let dot = 0, np = 0, nb = 0, e = 0; for (let k = 0; k < 3; k++) { const cp = d[o + k] - mp, cb = B[k] - mb; dot += cp * cb; np += cp * cp; nb += cb * cb; e += (d[o + k] - B[k]) * (d[o + k] - B[k]); } np = Math.sqrt(np); nb = Math.sqrt(nb) || 1;
    dist[i] = Math.sqrt(e); bgn[i] = np < 1 ? 0 : ss(0.9, 0.975, dot / (np * nb)) * ss(0.22, 0.5, np / nb); }
  const aday = i => dist[i] < 30 || bgn[i] > 0.5, fark = (i, j) => Math.max(Math.abs(d[i * 4] - d[j * 4]), Math.abs(d[i * 4 + 1] - d[j * 4 + 1]), Math.abs(d[i * 4 + 2] - d[j * 4 + 2]));
  const duzMu = i => { const X = i % W, y = (i / W) | 0; if (X < 3 || y < 3 || X > W - 4 || y > H - 4) return false; return fark(i, i - 3) < 6 && fark(i, i + 3) < 6 && fark(i, i - 3 * W) < 6 && fark(i, i + 3 * W) < 6; };
  /* yumuşak geçişli büyütme: etiket 1 = kenardan ya da elle tohumdan, 2+ = iç adalar (tum modu) */
  const lab = new Int32Array(N), q = new Int32Array(N), ESIK = 11; const buyut = (tohumlar, etiket) => { let qh = 0, qt = 0; for (const i of tohumlar) if (i >= 0 && i < N && !lab[i] && aday(i)) { lab[i] = etiket; q[qt++] = i; }
    while (qh < qt) { const i = q[qh++], X = i % W; for (const j of [X > 0 ? i - 1 : -1, X < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !lab[j] && aday(j) && fark(i, j) < ESIK) { lab[j] = etiket; q[qt++] = j; } } return qt; };
  const kenar = []; const kr = k => !ek.kes || Math.abs(kk[k] - (k < 2 ? 0 : 1)) < 1e-6;       // kes= ile kırpılan kenardan tohum atılmaz
  if (kr(1)) for (let X = 0; X < W; X++) kenar.push(X); if (kr(3)) for (let X = 0; X < W; X++) kenar.push((H - 1) * W + X); if (kr(0)) for (let y = 0; y < H; y++) kenar.push(y * W); if (kr(2)) for (let y = 0; y < H; y++) kenar.push(y * W + W - 1);
  for (const t of (ek.tohum || '').split(';').filter(Boolean)) { const [tx, ty] = t.split(',').map(Number), X0 = Math.round(tx * W), Y0 = Math.round(ty * H); for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) kenar.push((Y0 + j) * W + X0 + i); }
  buyut(kenar, 1);
  if (mod === 'tum') { let et = 2; const enAz = Math.max(40, Math.round(N / 5200)); for (let i = 0; i < N; i++) { if (lab[i] || !(dist[i] < 16 || bgn[i] > 0.9) || !duzMu(i)) continue; const bas = q.length; const n = buyut([i], et); if (n < enAz) { for (let k = 0; k < n; k++) lab[q[k]] = -1; } et++; } for (let i = 0; i < N; i++) if (lab[i] < 0) lab[i] = 0; }
  if (ek.ic === 'koyu') for (let i = 0; i < N; i++) if (!lab[i] && (dist[i] < 34 || bgn[i] > 0.6)) { const o = i * 4, k = Math.max(bgn[i], 1 - dist[i] / 34), y = (i / W) | 0, kr2 = [30 + 26 * y / H, 20 + 14 * y / H, 34 + 12 * y / H]; for (let j = 0; j < 3; j++) d[o + j] = d[o + j] * (1 - k) + kr2[j] * k; }
  /* alfa: zemin 0, nesne 1; zemine değen kenar pikseli zemine uzaklığıyla yumuşar ve zemin rengi ayıklanır */
  const A = new Float32Array(N); for (let i = 0; i < N; i++) A[i] = lab[i] ? 0 : 1;
  for (let y = 1; y < H - 1; y++) for (let X = 1; X < W - 1; X++) { const i = y * W + X; if (lab[i]) continue; if (lab[i - 1] || lab[i + 1] || lab[i - W] || lab[i + W]) { const a = Math.max(0.35, Math.min(1, dist[i] / 95)); A[i] = a; if (a < 0.98) { const o = i * 4; for (let k = 0; k < 3; k++) { const B = bgAt(X, y, k); d[o + k] = Math.max(0, Math.min(255, B + (d[o + k] - B) / a)); } } } }
  if (ek.kemer) { const [cx, ust, enK, alt] = ek.kemer.split(',').map(Number), CX = cx * W, R = enK * W / 2, YT = ust * H, YB = alt * H, YC = YT + R; for (let y = Math.floor(YT); y < Math.min(H, YB); y++) for (let X = Math.floor(CX - R); X <= CX + R; X++) { const dx = X - CX, ic = y >= YC ? Math.abs(dx) <= R : dx * dx + (y - YC) * (y - YC) <= R * R; if (ic && X >= 0 && X < W) A[y * W + X] = 0; } }
  for (const r of (ek.sil || '').split(';').filter(Boolean)) { const [a0, b0, a1, b1] = r.split(',').map(Number); for (let y = Math.round(b0 * H); y < Math.round(b1 * H); y++) for (let X = Math.round(a0 * W); X < Math.round(a1 * W); X++) A[y * W + X] = 0; }
  if (ek.golge) for (let i = 0; i < N; i++) if (bgn[i] > 0.55) A[i] = 0;
  for (let i = 0; i < N; i++) d[i * 4 + 3] = Math.round(A[i] * 255);
  /* küçük kopuk adacıkları at (zemin lekesi): en büyük bileşenin %0.4'ünden küçük olanlar */
  { const l2 = new Int32Array(N), boyut = [0]; let n = 0; for (let i0 = 0; i0 < N; i0++) { if (l2[i0] || d[i0 * 4 + 3] < 60) continue; n++; let qh = 0, qt = 0; q[qt++] = i0; l2[i0] = n; while (qh < qt) { const i = q[qh++], X = i % W; for (const j of [X > 0 ? i - 1 : -1, X < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !l2[j] && d[j * 4 + 3] >= 60) { l2[j] = n; q[qt++] = j; } } boyut.push(qt); }
    const mx = Math.max(...boyut); for (let i = 0; i < N; i++) if (d[i * 4 + 3] > 0 && (!l2[i] || boyut[l2[i]] < mx * 0.004)) d[i * 4 + 3] = 0; }
  let x0 = W, y0 = H, x1 = 0, y1 = 0, dolu = 0, yari = 0; for (let i = 0; i < N; i++) { const a = d[i * 4 + 3]; if (a > 8) { dolu++; if (a < 215) yari++; } if (a > 40) { const X = i % W, y = (i / W) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (ek.govde) { const yb = Math.round(y1 - (y1 - y0) * 0.1); let gx0 = x1, gx1 = x0; for (let X = x0; X <= x1; X++) { let n = 0, m = 0; for (let y = yb; y <= y1; y++) { m++; if (d[(y * W + X) * 4 + 3] > 200) n++; } if (n / m > 0.6) { if (X < gx0) gx0 = X; if (X > gx1) gx1 = X; } } if (gx1 > gx0) { x0 = gx0 + 2; x1 = gx1 - 2; } }
  x.putImageData(id, 0, 0); return bitir(x0, y0, x1 - x0 + 1, y1 - y0 + 1, { yari: Math.round(yari / Math.max(1, dolu) * 1000) / 10, zemin: C[0].map(Math.round).join(',') });
}, { data, en: +en, mod, boy: +boy, ek });
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64')); await b.close();
console.log('ok', path.basename(out), res.w + 'x' + res.h, 'yarı saydam %' + res.yari, 'zemin rgb ' + res.zemin, fs.statSync(out).size + ' bayt');
