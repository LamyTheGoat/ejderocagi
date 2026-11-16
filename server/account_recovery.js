'use strict';
// Misafir hesabının kurtarılması ve kayıt yedeği (2026-11-16).
// Kurtarma kodu: hesaba bağlı, 120 bit rastgele, okunaklı 24 karakter (karışan harf ve rakamlar yok). Depoda yalnız özeti durur;
// kod oyuncuya bir kez gösterilir. Kodu bilen kişi o hesap için yeni oturum açar (başka tarayıcı, silinmiş çerez).
// Yeni kod üretilince eskisi geçersiz olur. Kod tahmin edilemez; yine de deneme sayısı sunucuda hız sınırına bağlıdır.
// Kayıt yedeği: istemcinin yerel kaydı (ocak, ejderhalar) olduğu gibi saklanan bir metindir. Sunucu onu OKUMAZ ve ekonomi için
// asla kullanmaz; yalnız sahibine geri verir.
const crypto = require('node:crypto');

const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 32 simge: I, O, 0, 1 yok
const UZUNLUK = 24, SAVE_MAX = 400_000;

function makeCode() { const b = crypto.randomBytes(UZUNLUK); let s = ''; for (let i = 0; i < UZUNLUK; i++) s += ALFABE[b[i] & 31]; return s; }
function formatCode(code) { return code.match(/.{4}/g).join('-'); }
// oyuncunun yazdığı kod: boşluk, tire ve küçük harf hoş görülür; biçime uymayan girdi null döner
function normalizeCode(input) {
  if (typeof input !== 'string' || input.length > 80) return null;
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === UZUNLUK && [...s].every(c => ALFABE.includes(c)) ? s : null;
}
const hashCode = code => crypto.createHash('sha256').update('eo-recovery:' + code).digest('hex');
function checkSave(text) {
  if (typeof text !== 'string' || text.length < 2 || text.length > SAVE_MAX) throw Object.assign(new Error('save_invalid'), { code: 'save_invalid', status: 400 });
  return text;
}

// expected verilmişse (sayı ya da null) depodaki yedeğin zamanı onunla aynı olmalıdır: başka cihazın yazdığı yedek sessizce ezilmez
function checkExpected(expected, current) {
  if (expected === undefined) return;
  if (expected !== null && !Number.isSafeInteger(expected)) throw Object.assign(new Error('save_invalid'), { code: 'save_invalid', status: 400 });
  if ((current == null ? null : current) !== expected) throw Object.assign(new Error('save_conflict'), { code: 'save_conflict', status: 409 });
}

module.exports = { checkExpected, makeCode, formatCode, normalizeCode, hashCode, checkSave, SAVE_MAX };
