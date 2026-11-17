// EO2 · Zümrüt Saray'ın iki arenası için blok harita ve arena.json üretir (eo2/arenalar/zumrut-kopru, zumrut-defile).
// Olağan yol: blok haritayı Krita'da çizimin üstüne elle çizmek. Bu iki arena yöntemden önce kurulduğu için haritaları
// eldeki ölçülerden kodla çizilir; aynı zamanda "doğru çizilmiş blok harita nasıl olur" örneğidir.
// Sahne resimleri: node eo2/tools/zumrut_sahne.mjs · sonra: node eo2/tools/arena_derle.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { pngYaz } from './png.mjs'; import { RENK } from './arena_derle.mjs';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'arenalar');
function harita(w, h) { const d = Buffer.alloc(w * h * 4);
  const dolu = (x0, y0, x1, y1, c) => { for (let y = Math.max(0, Math.round(y0)); y < Math.min(h, Math.round(y1)); y++) for (let x = Math.max(0, Math.round(x0)); x < Math.min(w, Math.round(x1)); x++) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } };
  return { dolu, kutu: (cx, alt, en, boy, c) => dolu(cx - en / 2, alt - boy, cx + en / 2, alt, c), png: () => pngYaz(w, h, d) }; }
const yaz = (ad, H, json) => { const d = path.join(kok, ad); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'blok.png'), H.png()); fs.writeFileSync(path.join(d, 'arena.json'), JSON.stringify(json, null, 2) + '\n'); console.log(ad + ' yazıldı'); };

/* köprü: 5596 × 1291 (üstte 350 piksel gökyüzü payı), yürüme hattı 913; oyuncu boyu 149 piksel */
{ const W = 5596, Hh = 1291, L = 913, B = 149, k = B / 1.7, H = harita(W, Hh);
  H.dolu(0, L, W, Hh, RENK.kirilmaz);
  for (const dx of [0, -247, 247, -494]) H.kutu(2798 + dx, L, 90, B, RENK.oyuncu);
  const ucan = L - Math.round(7.72 * k), yb = Math.round(2.7 * k), mb = Math.round(2.4 * k);
  H.kutu(625, ucan, 230, yb, RENK.dusman); H.kutu(1251, L, 320, mb, RENK.dusman); H.kutu(4345, L, 320, mb, RENK.dusman); H.kutu(4971, ucan, 230, yb, RENK.dusman);
  yaz('zumrut-kopru', H, { ad: 'Zümrüt Saray Köprüsü', alt: 'Yılanlar iki yandan geliyor', ipucu: 'Yılanlar iki yandan gelir. Fareyi çevirdiğin yana döner, o yana ateş edersin. Önce yaklaşanı vur.', tema: 'sirca', ortam: 'spor', ust: '#6fafFd', altRenk: '#e8f2fb',
    dusman: [{ tip: 'viper', ad: 'Uçan Sırça Engereği', hp: 800, fizik: false }, { tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', hp: 760 }, { tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', hp: 760 }, { tip: 'viper', ad: 'Uçan Sırça Engereği', hp: 800, fizik: false }] }); }

/* defile: 4459 × 1241 (üstte 300 piksel tavan payı), yürüme hattı 983; sağda boss yükseltisi (rampa 3148–3305, üst yüzey 845); oyuncu boyu 119 piksel */
{ const W = 4459, Hh = 1241, L = 983, U = 845, R0 = 3148, R1 = 3305, B = 119, k = B / 1.7, H = harita(W, Hh);
  H.dolu(0, L, W, Hh, RENK.kirilmaz); H.dolu(R1, U, W, L, RENK.kirilmaz);
  for (let x = R0; x < R1; x++) H.dolu(x, L - (x - R0) / (R1 - R0) * (L - U), x + 1, L, RENK.kirilmaz);
  for (const dx of [0, -197, 197, -393]) H.kutu(603 + dx, L, 72, B, RENK.oyuncu);
  const mb = Math.round(2.4 * k); H.kutu(2046, L, 260, mb, RENK.dusman); H.kutu(2728, L, 260, mb, RENK.dusman);
  H.kutu(3620, U, 420, Math.round(6.8 * k), RENK.boss);
  yaz('zumrut-defile', H, { ad: 'Şahmeran\'ın Defilesi', alt: 'Yılan Kraliçe yükseltide bekliyor', ipucu: 'Zemin kırılmaz. Altın tacı zayıf noktasıdır. Her tur yerdeki halkadan çık, sonra ateş et.', tema: 'sirca', ortam: 'spor', ust: '#07201a', altRenk: '#0a2a20',
    dusman: [{ tip: 'zs_agir', ad: 'Sırça Taht Muhafızı', hp: 640 }, { tip: 'zs_agir', ad: 'Sırça Taht Muhafızı', hp: 640 }],
    boss: { tip: 'sahmeran_v3', ad: 'Yılan Kraliçe Şahmeran', unvan: 'Zümrüt Saray\'ın ebedi hükümdarı', hp: 3600 } }); }
