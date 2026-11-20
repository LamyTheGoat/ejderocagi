'use strict';
// Kalıcı sunucu durumu (2026-11-20). Bellekte duran sosyal durumun (parti, ortak oda lobisi, künye, X giriş durumu) ve
// Kıraathane bahis kilidinin yeniden başlatmaya dayanıklı kopyası. Tek Cloud Run örneği varsayılır: bellek asıl kaynaktır,
// depo yalnız yeniden başlayınca geri yüklemek içindir. Depo: economy store'un putDurable/getDurable/listDurable uçları
// (Firestore'da eo_service_state, yerelde SQLite service_state). Süresi geçen kayıtları pruneServiceState siler.
//
//   put(tür, anahtar, değer, ömürMs)  · get(tür, anahtar) · list(tür) · del(tür, anahtar)
//   anlik(tür, üret, { ömürMs })      → anlık görüntü: yaz() yalnız değiştiyse yazar; tik(), sunucunun zamanlayıcısından çağrılır
//   hepsiniYaz()                      kapanışta (SIGTERM) bütün anlık görüntüleri ve bekleyen yazımları boşaltır
//
// Depoda bu uçlar yoksa (eski depo, test) her şey sessizce bellekte kalır: davranış bugünküyle aynıdır.
const TUR = /^[a-z_]{2,20}$/;

function createKalici({ store, now = Date.now, log = console } = {}) {
  const var_ = !!(store && typeof store.putDurable === 'function' && typeof store.getDurable === 'function' && typeof store.listDurable === 'function');
  const anliklar = [], bekleyen = new Set();
  const izle = p => { bekleyen.add(p); p.finally(() => bekleyen.delete(p)).catch(() => { }); return p; };
  const tur = k => { if (!TUR.test(k)) throw new Error('kalici_tur_gecersiz'); return k; };

  async function put(k, anahtar, deger, omurMs) { if (!var_) return; await izle(Promise.resolve().then(() => store.putDurable(tur(k), String(anahtar), deger, now() + omurMs))); }
  async function del(k, anahtar) { if (!var_) return; await izle(Promise.resolve().then(() => store.putDurable(tur(k), String(anahtar), null, 0))); }
  async function get(k, anahtar) { if (!var_) return null; return (await store.getDurable(tur(k), String(anahtar))) ?? null; }
  async function list(k, limit) { if (!var_) return []; return (await store.listDurable(tur(k), limit)) || []; }

  /* anlık görüntü: üret() JSON'a çevrilebilir bir değer döndürür; değişmediyse yazılmaz (yazım sayısı düşük kalır) */
  function anlik(k, uret, { omurMs = 24 * 3600000 } = {}) {
    tur(k); let son = null, yaziyor = null, tekrar = false;
    async function yaz() {
      if (!var_) return false;
      if (yaziyor) { tekrar = true; return yaziyor; }
      let deger, j; try { deger = uret(); j = JSON.stringify(deger); } catch (e) { log.error('[kalici] üretim', k, e.message); return false; }
      if (j === son) return false;
      if (j.length > 900000) { log.error('[kalici] çok büyük, yazılmadı', k, j.length); return false; }
      yaziyor = izle(Promise.resolve().then(() => store.putDurable(k, 'hepsi', deger, now() + omurMs))).then(() => { son = j; return true; },
        e => { log.error('[kalici] yazım', k, e.code || e.message); return false; }).finally(() => { yaziyor = null; if (tekrar) { tekrar = false; yaz(); } });
      return yaziyor;
    }
    const a = { yaz, oku: () => get(k, 'hepsi'), tik: () => { yaz(); } };
    anliklar.push(a); return a;
  }
  async function hepsiniYaz() { for (let i = 0; i < 2; i++) await Promise.allSettled(anliklar.map(a => a.yaz())); await Promise.allSettled([...bekleyen]); }
  return { put, get, list, del, anlik, hepsiniYaz, tikla: () => { for (const a of anliklar) a.tik(); }, etkin: var_ };
}

module.exports = { createKalici };
