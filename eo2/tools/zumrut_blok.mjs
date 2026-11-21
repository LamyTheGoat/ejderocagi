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
  /* DALGA YÖNETİMİ (kullanıcı, 2026-11-20: "köprüdeki yılanları 24'e çıkar, her dalgada 8 yılan gelsin, canlarını ve hasarlarını düşür"):
     üç dalga, her dalgada iki yandan dörder yılan. Her yanda 12 yer var; dalgalar bu yerlere karışık dağılır (yakından uzağa 1, 2, 3, 1, 2, 3…),
     böylece her dalga köprünün bütün yanını kaplar. 1. dalga Bronz Engerek Muhafızı, 2. dalga Sırça Engerek, 3. dalga Sırça Taht Muhafızı.
     Kutular soldan sağa okunur; uçan engerek yok (kullanıcı, 2026-11-17). */
  const TUR = { 1: { tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', hp: 300, boy: 2.4 }, 2: { tip: 'zs_kucuk', ad: 'Sırça Engerek', hp: 340, boy: 2.0 }, 3: { tip: 'zs_agir', ad: 'Sırça Taht Muhafızı', hp: 360, boy: 2.4 } };
  const HASAR = 0.15;   // yılan başına hasar: tek yılanın eski hasarının yüzde 15'i (sekiz yılan birden saldırır; 0,25'te kusursuz nişancı bile Anka'sız düşüyordu)
  const sol = [], sag = []; for (let j = 0; j < 12; j++) { const d = 1 + (j % 3); sol.push({ x: 2150 - j * 180, d }); sag.push({ x: 3446 + j * 180, d }); }
  const yerler = sol.concat(sag).sort((a, b) => a.x - b.x);
  for (const y of yerler) H.kutu(y.x, L, 60, Math.round(TUR[y.d].boy * k), RENK.dusman);
  yaz('zumrut-kopru', H, { ad: 'Zümrüt Saray Köprüsü', alt: 'Yılanlar üç dalga hâlinde geliyor', ipucu: 'Yılanlar üç dalga hâlinde, iki yandan sekizer gelir. Bir dalga inince sıradaki belirir. Fareyi çevirdiğin yana döner, o yana ateş edersin; çoklu atış becerileri kalabalığı eritir.', tema: 'sirca', ortam: 'spor', ust: '#6fafFd', altRenk: '#e8f2fb',
    dusman: yerler.map(y => Object.assign({ tip: TUR[y.d].tip, ad: TUR[y.d].ad, hp: TUR[y.d].hp, hasar: HASAR }, y.d > 1 ? { dalga: y.d } : {})) }); }

/* defile: 4459 × 1241 (üstte 300 piksel tavan payı), yürüme hattı 983; sağda boss yükseltisi (rampa 3148–3305, üst yüzey 845); oyuncu boyu 119 piksel */
{ const W = 4459, Hh = 1241, L = 983, U = 845, R0 = 3148, R1 = 3305, B = 119, k = B / 1.7, H = harita(W, Hh);
  H.dolu(0, L, W, Hh, RENK.kirilmaz); H.dolu(R1, U, W, L, RENK.kirilmaz);
  for (let x = R0; x < R1; x++) H.dolu(x, L - (x - R0) / (R1 - R0) * (L - U), x + 1, L, RENK.kirilmaz);
  for (const dx of [0, -197, 197, -393]) H.kutu(603 + dx, L, 72, B, RENK.oyuncu);
  /* ŞAHMERAN'IN ÇAĞRISI (kullanıcı, 2026-11-20: "yılanların olmadığı turun başında Şahmeran 6 yılan spawn etsin; Şahmeran dövüşünün olayı dalga yönetimini anlatmak"):
     altı yılan "cagri" işaretlidir: savaş başında sahnede yoktur; sahnede ayakta yılan kalmadığı her turun başında Şahmeran altısını birden çağırır (sunucu karar verir). */
  const xs = [1300, 1600, 1900, 2200, 2500, 2800], tip = i => i % 3 === 1 ? { tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', boy: 2.4 } : { tip: 'zs_kucuk', ad: 'Sırça Engerek', boy: 2.0 };
  xs.forEach((x, i) => H.kutu(x, L, 60, Math.round(tip(i).boy * k), RENK.dusman));
  H.kutu(3620, U, 420, Math.round(6.8 * k), RENK.boss);
  yaz('zumrut-defile', H, { ad: 'Şahmeran\'ın Defilesi', alt: 'Yılan Kraliçe yükseltide bekliyor', ipucu: 'Yılan kalmayınca Şahmeran her tur başında altı yılan çağırır. Yılanları mı eritirsin, tacı mı vurursun: sen seç. Durduğun yere ok yağdırır, her tur yerini değiştir.', tema: 'sirca', ortam: 'spor', ust: '#07201a', altRenk: '#0a2a20',
    dusman: xs.map((x, i) => ({ tip: tip(i).tip, ad: tip(i).ad, hp: 240, hasar: 0.15, cagri: true })),
    boss: { tip: 'sahmeran_v3', ad: 'Yılan Kraliçe Şahmeran', unvan: 'Zümrüt Saray\'ın ebedi hükümdarı', hp: 2400 } }); }   // 3600'den indi (2026-11-20): yılan baskısıyla iyi nişancı bile Anka'yla ancak dayanıyordu
