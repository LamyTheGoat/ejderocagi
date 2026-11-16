// EO2 · küçük PNG okuyucu ve yazıcı (yalnız Node zlib; ek paket yok). Blok haritalar için (eo2/tools/arena_derle.mjs).
// Okur: 8 bit RGBA, RGB, gri, gri+alfa ve paletli PNG (geçmeli/interlaced olmayan). Yazar: 8 bit RGBA.
import zlib from 'node:zlib';
const IMZA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function pngOku(buf) {
  if (!buf.subarray(0, 8).equals(IMZA)) throw new Error('PNG değil');
  let p = 8, w = 0, h = 0, bit = 0, tip = 0, gecmeli = 0, palet = null, trns = null; const parca = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p), ad = buf.toString('latin1', p + 4, p + 8), v = buf.subarray(p + 8, p + 8 + n); p += 12 + n;
    if (ad === 'IHDR') { w = v.readUInt32BE(0); h = v.readUInt32BE(4); bit = v[8]; tip = v[9]; gecmeli = v[12]; } else if (ad === 'PLTE') palet = v; else if (ad === 'tRNS') trns = v; else if (ad === 'IDAT') parca.push(v); else if (ad === 'IEND') break; }
  if (bit !== 8) throw new Error('PNG kanal başına 8 bit olmalı (bu dosya ' + bit + ' bit). Krita: Görüntü → Renk uzayını dönüştür → 8 bit tamsayı.');
  if (gecmeli) throw new Error('Geçmeli (interlaced) PNG okunmaz; dışa aktarırken "interlacing" kapalı olsun.');
  const kanal = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tip]; if (!kanal) throw new Error('PNG renk türü desteklenmiyor: ' + tip);
  const ham = zlib.inflateSync(Buffer.concat(parca)), sat = w * kanal, d = Buffer.alloc(h * sat);
  for (let y = 0; y < h; y++) { const f = ham[y * (sat + 1)], s0 = y * (sat + 1) + 1, o = y * sat;
    for (let x = 0; x < sat; x++) { const a = x >= kanal ? d[o + x - kanal] : 0, b = y ? d[o + x - sat] : 0, c = x >= kanal && y ? d[o + x - sat - kanal] : 0; let v = ham[s0 + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      d[o + x] = v & 255; } }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { let r, g, b, a = 255; const q = i * kanal;
    if (tip === 6) { r = d[q]; g = d[q + 1]; b = d[q + 2]; a = d[q + 3]; } else if (tip === 2) { r = d[q]; g = d[q + 1]; b = d[q + 2]; } else if (tip === 0) r = g = b = d[q]; else if (tip === 4) { r = g = b = d[q]; a = d[q + 1]; }
    else { const k = d[q]; r = palet[k * 3]; g = palet[k * 3 + 1]; b = palet[k * 3 + 2]; a = trns && k < trns.length ? trns[k] : 255; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a; }
  return { w, h, rgba };
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const parcaYaz = (ad, v) => { const b = Buffer.alloc(12 + v.length); b.writeUInt32BE(v.length, 0); b.write(ad, 4, 'latin1'); v.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + v.length)), 8 + v.length); return b; };
export function pngYaz(w, h, rgba) {
  const ham = Buffer.alloc(h * (w * 4 + 1)); for (let y = 0; y < h; y++) rgba.copy(ham, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([IMZA, parcaYaz('IHDR', ih), parcaYaz('IDAT', zlib.deflateSync(ham, { level: 9 })), parcaYaz('IEND', Buffer.alloc(0))]);
}
/* yalnız boyut: PNG başlığı ya da WebP (VP8X, VP8L, VP8) başlığı */
export function boyutOku(buf) {
  if (buf.subarray(0, 8).equals(IMZA)) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') { const t = buf.toString('latin1', 12, 16);
    if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }; }
    if (t === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }; }
  throw new Error('boyutu okunamayan resim (PNG ya da WebP olmalı)');
}
