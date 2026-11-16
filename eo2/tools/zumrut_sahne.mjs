// EO2 · Zümrüt Saray sahneleri (kullanıcı onayı 2026-11-17: konsept çizimler geçici olarak oyuna konur; nihai değil).
// ArtLab'den gelen konsept parçalar (eo2/docs/bolumler/kaynak/zumrut-saray) oyunun kendi arena ölçüsüne göre dizilir:
//   kopru.webp   köprü konsepti, kemer ortalarından aynalanarak dünya boyuna uzatılır (iki uçta perdeli özgün kenarlar)
//   defile.webp  defile salonu modüllerinden dizilir; boss yükseltisi oyundaki yere ve yüksekliğe oturur (önizleme görseli kullanılmaz)
//   yilan_*.webp yılan düşmanlar (tek duruş)
// Sahne resimleri arena klasörlerine yazılır (eo2/arenalar/zumrut-kopru, zumrut-defile); blok haritalar: tools/zumrut_blok.mjs; sonra tools/arena_derle.mjs.
// Kullanım: node eo2/tools/zumrut_sahne.mjs   (geliştirme sunucusu 3210'da açık olmalı)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const kaynak = path.join(repo, 'eo2', 'docs', 'bolumler', 'kaynak', 'zumrut-saray'), hedef = path.join(repo, 'eo2', 'assets', 'zumrut');
fs.mkdirSync(hedef, { recursive: true });
const url = process.env.URL || 'http://localhost:3210/', b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage();
await p.route('**/__zs/**', r => { const yol = decodeURIComponent(new URL(r.request().url()).pathname.split('/__zs/')[1]); if (/ONIZLEME/.test(yol)) return r.abort(); r.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(kaynak, yol)) }); });
await p.goto(url + 'gizlilik.html');
const veri = await p.evaluate(async () => {
  const al = async yol => { const im = new Image(); im.src = '/__zs/' + yol; await im.decode(); return im; };
  const tuval = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; return [c, x]; };
  const ayna = (x, im, sx, sw, dx, dw, dy, dh, ters) => { const ih = im.naturalHeight || im.height; if (!ters) return x.drawImage(im, sx, 0, sw, ih, dx, dy, dw, dh); x.save(); x.translate(dx + dw, dy); x.scale(-1, 1); x.drawImage(im, sx, 0, sw, ih, 0, 0, dw, dh); x.restore(); };
  let t = 7; const r = () => { t = (t * 1103515245 + 12345) & 0x7fffffff; return t / 0x7fffffff; };
  const cik = {};

  /* ---- köprü: [0..1308] · ayna[327..1308] · [327..1308] · ... · [327..1672]; 327 ve 1308 kemer ayaklarının ortasıdır ---- */
  { const im = await al('arka_plan/kopru_konsept_v1.png'), H = im.naturalHeight, A = 327, B = 1308, parca = [[0, B, 0], [A, B, 1], [A, B, 0], [A, B, 1], [A, B, 0], [A, B, 1], [A, im.naturalWidth, 0]];
    // sıra: sol kenar B'de biter; aynalı parça B'den A'ya; düz parça A'dan B'ye; son düz parçanın yerine sağ kenar (A'dan sona)
    const dizi = [parca[0], parca[1], parca[2], parca[3], parca[6]], W = dizi.reduce((s, q) => s + q[1] - q[0], 0), PAY = 350, [c, x] = tuval(W, H + PAY); let dx = 0; x.translate(0, PAY);
    const [tc, tx] = tuval(im.naturalWidth, H); tx.drawImage(im, 0, 0); tx.drawImage(im, 800, 0, 1, 48, A, 0, 130, 48); tx.drawImage(im, 800, 0, 1, 100, 1205, 0, B - 1205, 100);   // ara parçalarda köşe çiçeklerinin kesik uçları gökyüzüyle kapatılır
    dizi.forEach(([a, bb, ters], i) => { ayna(x, tc, a, bb - a, dx, bb - a, 0, H, ters); dx += bb - a; });
    const g = x.createLinearGradient(0, H - 90, 0, H); g.addColorStop(0, 'rgba(232,242,251,0)'); g.addColorStop(1, 'rgba(232,242,251,1)'); x.fillStyle = g; x.fillRect(0, H - 90, W, 90);   // alt kenar sise karışır
    x.drawImage(tc, 800, 0, 1, 3, 0, -PAY, W, PAY + 1);   // üst pay: çizimin en üst satırındaki gökyüzü rengi
    const ust = x.getImageData(W >> 1, PAY + 2, 1, 1).data; cik['zumrut-kopru'] = { d: c.toDataURL('image/webp', 0.86), w: W, h: H + PAY, yer: 563 + PAY, ust: [ust[0], ust[1], ust[2]] }; }

  /* ---- defile: 4459×941, yürüme hattı 683; 1 eski oyun pikseli = 4459/3400 tuval pikseli ---- */
  { const W = 4459, H = 941, L = 683, K = W / 3400, S = 0.445, [c, x] = tuval(W, H), M = 'defile_modul/';
    const [dis, bay, fon, giris, paye, koltuk, kork, dais, yuz, sandalye] = await Promise.all(['exterior_view', 'backwall_bay_v2', 'stage_backdrop', 'end_entrance', 'end_proscenium', 'balcony_seats', 'balustrade_rail_only', 'boss_dais', 'catwalk_face', 'front_chairs'].map(a => al(M + a + '.png')));
    const rampa0 = Math.round(2400 * K), rampa1 = Math.round(2520 * K), ustY = L - Math.round(105 * K);   // oyundaki yükselti: 2400–2520 arası 105 piksel
    const payeW = Math.round(977 * S), payeX = rampa0 - Math.round(702 * S), d0 = Math.round(975 * S), bayN = 6, bayW = (payeX - d0) / bayN;
    x.fillStyle = '#0d3327'; x.fillRect(0, 0, W, H);
    for (let i = 0, dx = d0; dx < payeX; i++, dx += 836) ayna(x, dis, 0, dis.naturalWidth, dx, 836, 30, 470, i % 2);   // pencerelerin ardındaki manzara
    x.drawImage(giris, 0, 0, d0, L);
    for (let i = 0; i < bayN; i++) x.drawImage(bay, d0 + i * bayW, 0, bayW + 1, L);
    // duvar dibi dekorları (alt kenar = zemin)
    const dekor = [['mannequin_cream', 640], ['mirror_console', 880], ['fabric_rack', 1130], ['mannequin_purple', 1330], ['candelabra', 1560], ['mannequin_cocktail', 1700], ['perfume_table', 1930], ['sign_easel', 2130], ['flower_urn', 2360], ['mannequin_cream', 2580]];
    for (const [ad, dx] of dekor) { const im = await al(M + 'prop_' + ad + '.png'), w = im.naturalWidth * S, h = im.naturalHeight * S; x.drawImage(im, dx - w / 2, L - h, w, h); }
    // balkon: koltuklar, seyirciler, önlerinde korkuluk
    const kY = 415, sS = 0.42, koS = 0.45;
    for (let dx = d0; dx < payeX; dx += koltuk.naturalWidth * koS) x.drawImage(koltuk, 0, 0, Math.min(koltuk.naturalWidth, (payeX - dx) / koS), koltuk.naturalHeight, dx, kY - 38 - koltuk.naturalHeight * koS, Math.min(koltuk.naturalWidth * koS, payeX - dx), koltuk.naturalHeight * koS);
    const onler = []; for (let i = 1; i <= 6; i++) { onler.push(await al('seyirci/human_front_' + i + '.png')); onler.push(await al('seyirci/snake_front_' + i + '.png')); }
    for (let i = 0; i < bayN; i++) for (let j = 0; j < 4; j++) { const im = onler[Math.floor(r() * onler.length)], w = im.naturalWidth * sS, h = im.naturalHeight * sS, dx = d0 + i * bayW + bayW * (0.2 + j * 0.2); x.drawImage(im, dx - w / 2, kY - 30 - h, w, h); }
    const koW = kork.naturalWidth * 0.56, koH = kork.naturalHeight * 0.56; for (let dx = d0; dx < payeX; dx += koW) x.drawImage(kork, 0, 0, Math.min(kork.naturalWidth, (payeX - dx) / 0.56), kork.naturalHeight, dx, kY - koH, Math.min(koW, payeX - dx), koH);
    // sahne: fon, sahne ağzı payesi, boss platformu (üst yüzeyi oyundaki yükseltiye oturur; merdiven rampanın yerinde)
    const fonX = payeX + 150, fonW = W - fonX, fonH = 760; x.drawImage(fon, fonX, -70, fonW, fonH);
    x.drawImage(paye, payeX, 0, payeW, L);
    x.drawImage(dais, rampa1 - 380, ustY - 82);
    // podyum cephesi (üst kenarı yürüme hattı), önünde ön sıra seyirciler ve sandalyeler
    const yS = 0.34, yW = yuz.naturalWidth * yS, yH = yuz.naturalHeight * yS; x.fillStyle = '#0a2a20'; x.fillRect(0, L + yH - 2, W, H);
    for (let dx = 0; dx < W; dx += yW) x.drawImage(yuz, dx, L, yW + 1, yH);
    const arkalar = []; for (let i = 1; i <= 8; i++) arkalar.push(await al('seyirci/back_' + i + '.png'));
    for (let dx = 70, i = 0; dx < W - 60; dx += 139, i++) { const im = arkalar[Math.floor(r() * 8)]; x.drawImage(im, dx - 48, H - 62 - 125, 96, 125); }
    for (let dx = 0; dx < W; dx += 836) x.drawImage(sandalye, dx, H - 150, 836, 150);
    cik['zumrut-defile'] = { d: c.toDataURL('image/webp', 0.86), w: W, h: H, yer: L, rampa: [rampa0, rampa1, ustY] }; }

  /* ---- yılanlar ---- */
  for (const [ad, yol] of [['yilan_vurucu', 'snake_striker'], ['yilan_agir', 'snake_heavy'], ['yilan_kucuk', 'snake_basic']]) { const im = await al('dusman_yilan/' + yol + '.png'), [c, x] = tuval(im.naturalWidth, im.naturalHeight); x.drawImage(im, 0, 0); cik[ad] = { d: c.toDataURL('image/webp', 0.92), w: c.width, h: c.height }; }
  return cik;
});
await b.close();
const ozet = {}; for (const ad in veri) { const v = veri[ad], arena = /^zumrut-/.test(ad), h = arena ? path.join(repo, 'eo2', 'arenalar', ad, 'sahne.webp') : path.join(hedef, ad + '.webp'); if (arena) fs.mkdirSync(path.dirname(h), { recursive: true }); fs.writeFileSync(h, Buffer.from(v.d.split(',')[1], 'base64')); delete v.d; v.bayt = fs.statSync(h).size; ozet[ad] = v; }
console.log(JSON.stringify(ozet));
