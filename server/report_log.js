'use strict';
// Sorun bildirimleri (Ejder Ocağı 2.0 menüsü → "Sorun bildir").
// Oyuncunun yazdığı metin ve istemcinin bellekteki hata günlüğü (EO2.hatalar) satır satır JSON olarak
// <veri dizini>/sorunlar.jsonl dosyasına eklenir. Ekonomiye dokunmaz; kimlik şart değildir (oturum açılamadığında da bildirilebilsin).
// `otomatik: true`: oyuncu yazmadı; istemci ilk hatasını kendiliğinden bildirdi (eo2/js/saglam.js, sayfa başına bir kez).
// Koruma: gövde alanları kırpılır, anahtar başına on dakikada beş bildirim, dosya 20 MB'ı geçince bir kez döndürülür (.1).
// Saklama: gizlilik sayfası "en çok bir yıl" der. Günde bir kez (ilk bildirimde ve açılışta) 365 günden eski satırlar silinir;
// döndürülmüş .1 dosyasının son yazımı bir yıldan eskiyse dosya tümden silinir.
const fs = require('node:fs');
const path = require('node:path');

const LIMIT = 5, PENCERE = 10 * 60 * 1000, TAVAN = 20 * 1024 * 1024, OKUMA_BAYT = 4 * 1024 * 1024;
const GUN = 24 * 60 * 60 * 1000, SAKLAMA = 365 * GUN;
const kes = (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
const hata = (code, status) => Object.assign(new Error(code), { code, status });

function createReportLog(dir, now = () => Date.now()) {
  const dosya = path.join(dir, 'sorunlar.jsonl'), sayac = new Map();
  let sonBudama = -Infinity;
  // 365 günden eski kayıtları siler. Yeni satırlar hep sona eklendiği için ilk satır yeterince yeniyse dosyaya dokunulmaz.
  // Hata olursa (disk, izin) yalnız günlüğe yazılır; bildirim almak budamadan önemlidir.
  function buda() {
    const t = now(); if (t - sonBudama < GUN) return; sonBudama = t;
    const sinir = new Date(t - SAKLAMA).toISOString();
    try { if (fs.statSync(dosya + '.1').mtimeMs < t - SAKLAMA) fs.unlinkSync(dosya + '.1'); } catch (e) { if (e.code !== 'ENOENT') console.error('[sorun-budama]', e.message); }
    try {
      const metin = fs.readFileSync(dosya, 'utf8');
      const ilk = metin.slice(0, metin.indexOf('\n') + 1 || undefined);
      let ilkZaman = ''; try { ilkZaman = JSON.parse(ilk).zaman || ''; } catch (_) { /* bozuk ilk satır: aşağıda elenir */ }
      if (ilkZaman >= sinir) return;
      const kalan = metin.split('\n').filter(l => { if (!l) return false; try { const z = JSON.parse(l).zaman; return typeof z === 'string' && z >= sinir; } catch (_) { return false; } });
      const gecici = dosya + '.tmp';
      fs.writeFileSync(gecici, kalan.length ? kalan.join('\n') + '\n' : '');
      fs.renameSync(gecici, dosya);
    } catch (e) { if (e.code !== 'ENOENT') console.error('[sorun-budama]', e.message); }
  }
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
    buda();
    try { if (fs.statSync(dosya).size > TAVAN) fs.renameSync(dosya, dosya + '.1'); } catch (_) { /* dosya henüz yok */ }
    const satir = { zaman: new Date(now()).toISOString(), hesap: accountId || null, ...kayit };
    fs.appendFileSync(dosya, JSON.stringify(satir) + '\n');
    return { ok: true };
  }
  // Yönetici okuması (server/sorun_paneli.js): dosyanın sonundan en çok `adet` kayıt, yeniden eskiye.
  // Dosyanın tamamı değil, yalnız son OKUMA_BAYT okunur; bozuk ya da yarım satır atlanır.
  function son(adet = 300) {
    const n = Math.max(1, Math.min(1000, Math.floor(Number(adet)) || 300));
    let fd; try { fd = fs.openSync(dosya, 'r'); } catch (_) { return []; }
    try {
      const boy = fs.fstatSync(fd).size, bas = Math.max(0, boy - OKUMA_BAYT), buf = Buffer.alloc(boy - bas);
      fs.readSync(fd, buf, 0, buf.length, bas);
      const satirlar = buf.toString('utf8').split('\n'); if (bas > 0) satirlar.shift();   // ilk satır yarım olabilir
      const out = [];
      for (let i = satirlar.length - 1; i >= 0 && out.length < n; i--) { if (!satirlar[i]) continue; try { out.push(JSON.parse(satirlar[i])); } catch (_) { /* yarım satır */ } }
      return out;
    } finally { fs.closeSync(fd); }
  }
  buda();
  return { add, son, buda, dosya };
}

module.exports = { createReportLog };
