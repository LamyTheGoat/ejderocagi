'use strict';
// Sorun bildirimleri (Ejder Ocağı 2.0 menüsü → "Sorun bildir").
// Oyuncunun yazdığı metin ve istemcinin bellekteki hata günlüğü (EO2.hatalar) satır satır JSON olarak
// <veri dizini>/sorunlar.jsonl dosyasına eklenir. Ekonomiye dokunmaz; kimlik şart değildir (oturum açılamadığında da bildirilebilsin).
// `otomatik: true`: oyuncu yazmadı; istemci ilk hatasını kendiliğinden bildirdi (eo2/js/saglam.js, sayfa başına bir kez).
// Koruma: gövde alanları kırpılır, anahtar başına on dakikada beş bildirim, dosya 20 MB'ı geçince bir kez döndürülür (.1).
const fs = require('node:fs');
const path = require('node:path');

const LIMIT = 5, PENCERE = 10 * 60 * 1000, TAVAN = 20 * 1024 * 1024;
const kes = (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
const hata = (code, status) => Object.assign(new Error(code), { code, status });

function createReportLog(dir, now = () => Date.now()) {
  const dosya = path.join(dir, 'sorunlar.jsonl'), sayac = new Map();
  function hiz(anahtar) {
    const t = now(), k = sayac.get(anahtar);
    if (!k || t - k.t >= PENCERE) { sayac.set(anahtar, { t, n: 1 }); if (sayac.size > 5000) for (const [a, v] of sayac) if (t - v.t >= PENCERE) sayac.delete(a); return; }
    if (k.n >= LIMIT) throw hata('rate_limited', 429);
    k.n++;
  }
  function temizle(body) {
    const b = body && typeof body === 'object' ? body : {};
    const metin = kes(b.metin, 2000).trim();
    if (metin.length < 5) throw hata('report_too_short', 400);
    const hatalar = (Array.isArray(b.hatalar) ? b.hatalar : []).slice(-30).map(h => h && typeof h === 'object'
      ? { t: Number.isSafeInteger(h.t) ? h.t : 0, tur: kes(h.tur, 20), mesaj: kes(h.mesaj, 300), yer: kes(h.yer, 80) } : null).filter(Boolean);
    return { metin, otomatik: b.otomatik === true, surum: kes(b.surum, 20), sahne: kes(b.sahne, 40), ekran: kes(b.ekran, 40), hafta: kes(b.hafta, 20), tarayici: kes(b.tarayici, 300), hatalar };
  }
  function add({ accountId, ip, body }) {
    const kayit = temizle(body);
    hiz((kayit.otomatik ? 'o:' : '') + (accountId ? 'h:' + accountId : 'ip:' + (ip || '?')));   // otomatik bildirimler ayrı sayılır: oyuncunun kendi bildirim hakkını tüketmez
    fs.mkdirSync(dir, { recursive: true });
    try { if (fs.statSync(dosya).size > TAVAN) fs.renameSync(dosya, dosya + '.1'); } catch (_) { /* dosya henüz yok */ }
    const satir = { zaman: new Date(now()).toISOString(), hesap: accountId || null, ...kayit };
    fs.appendFileSync(dosya, JSON.stringify(satir) + '\n');
    return { ok: true };
  }
  return { add, dosya };
}

module.exports = { createReportLog };
