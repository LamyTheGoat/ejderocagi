'use strict';
// Kıraathane · oyuncuya karşı masa (Ejder Ocağı 2.0, 2026-11-16). Ortak oda altyapısına (server/ortak_odalar.js) "kiraathane"
// türü olarak kaydolur. İlk oyun: Ejder Pokeri (beş zar, üç atış; el sıralaması js/kiraathane.js pkEval / pkCompare ile AYNI).
//
// BAHİS (kullanıcı kararı, 2026-11-16): yalnız KAZANILMIŞ mal ve altın, sunucu emanetinde. Bahis, takas hizmetinin kendisidir
// (server/trade_service.js): iki oyuncu masada bir takas açar ve tepsilerine bahislerini koyar. "Bahsi kilitle" denince sunucu
// takası doğrular ve kilitler: oyun sürerken oyuncular o takasa komut gönderemez (vazgeçemez, tepsiyi değiştiremez).
// Oyun bitince sunucu takası KENDİSİ sonuçlandırır: kazananın tepsisi boşaltılır (malı kendisinde kalır), kaybedenin tepsisi
// kazanana geçer. Berabere ya da hata olursa takas iptal edilir, herkes malını geri alır. İstemci hiçbir sonucu bildirmez:
// zarları sunucu atar, eli sunucu sayar, aktarımı sunucu yapar. Bahissiz (çayına) oyunda takas açılmaz.
// "Ejderha Eli iki kat" kuralı oyuncuya karşı masada uygulanmaz: ortadaki bahis emanetteki kadardır.
//
// ORTAK DURUM  { faz: 'bahis' | 'oyun' | 'bitti', kilit: { <hesap>: takasId | '' }, takas: { id, bitis } | null,
//               oyuncu: { <hesap>: { zar: [5], atis, acik, son } }, son: { kazanan, eller } | null }
// EYLEMLER     { t: 'kilit', takas: <takasId> | '' }   bahsi kilitle (ikisi de aynı takası gösterince oyun başlar)
//              { t: 'coz' }                            kilit isteğini geri al (yalnız bahis fazında)
//              { t: 'at', tut: [5 × bool] }            zar at; tutulan zarlar kalır (ilk atışta hepsi atılır). En çok üç atış.
//              { t: 'ac' }                             elini aç (en az bir atıştan sonra)
// Hamle süresi: oyuncu 45 saniye hamle yapmazsa sunucu onun adına elini açar (hiç atmadıysa bir kez atar).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');

const HAMLE_MS = 45000, EN_AZ_KALAN_MS = 150000;
const hata = kod => Object.assign(new Error(kod), { kod });
const bosTeklif = () => ({ gold: 0, items: [], dragons: [], eggs: [], food: {} });

// el sıralaması oyunun kendi dosyasından alınır: kural kopyalanmaz, aynı kod çalışır
function elKurallari() {
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'js', 'kiraathane.js'), 'utf8');
  const a = kaynak.indexOf('const PK_NAMES'), b = kaynak.indexOf('function pkAiHold');
  if (a < 0 || b < a) throw new Error('kiraathane_kurallari_bulunamadi');
  const kutu = {}; vm.runInNewContext(kaynak.slice(a, b).replace('function pkNew()', 'function pkNew_()') + '\nthis.pkEval = pkEval; this.pkCompare = pkCompare;', kutu);
  return { pkEval: kutu.pkEval, pkCompare: kutu.pkCompare };
}

function createKiraathanePvp({ store, send, sockets, kimlik, kilitli = new Set(), now = () => Date.now(), zar = () => nodeCrypto.randomInt(1, 7), crypto = nodeCrypto }) {
  const { pkEval, pkCompare } = elKurallari();
  const soketler = id => [...sockets()].filter(s => !s.destroyed && kimlik(s) && kimlik(s).accountId === id);
  const durt = (id, m) => { for (const s of soketler(id)) send(s, m); };
  const komut = (kim, type, ek) => store.executeTrade(kim, Object.assign({ type, requestId: crypto.randomUUID() }, ek));

  /* bahsin sonuçlandırılması: kazanan (ya da berabere için null) belli olunca emanetteki takas kapatılır */
  async function ode(takas, uyeler, kazanan) {
    if (!takas) return { bahis: false };
    const [a, b] = uyeler;
    try {
      let t = (await komut(a, 'get', { tradeId: takas.id })).trade;
      if (!t || t.status !== 'active') return { bahis: true, odendi: false, neden: 'takas_kapali' };
      const bos = o => !o || (!(o.gold > 0) && !['items', 'dragons', 'eggs'].some(k => (o[k] || []).length) && !Object.values(o.food || {}).some(n => n > 0));
      if (bos((t.offers || {})[a]) && bos((t.offers || {})[b])) { await komut(a, 'cancel', { tradeId: takas.id }); return { bahis: false }; }   // tepsiler boş: çayına oynandı
      if (!kazanan) { await komut(a, 'cancel', { tradeId: takas.id }); return { bahis: true, odendi: false, neden: 'berabere' }; }
      const kaybeden = kazanan === a ? b : a;
      t = (await komut(kazanan, 'offer', { tradeId: t.id, revision: t.revision, offer: bosTeklif() })).trade;   // kazananın malı kendisinde kalır
      t = (await komut(kazanan, 'confirm', { tradeId: t.id, revision: t.revision })).trade;
      t = (await komut(kaybeden, 'confirm', { tradeId: t.id, revision: t.revision })).trade;
      return { bahis: true, odendi: t.status === 'completed' };
    } catch (e) {
      console.error('[kiraathane] ödeme', e.code || e.message);
      try { await komut(a, 'cancel', { tradeId: takas.id }); } catch (_) { /* takas zaten kapalı olabilir */ }
      return { bahis: true, odendi: false, neden: 'odeme_hatasi' };
    } finally { kilitli.delete(takas.id); for (const u of uyeler) durt(u, { type: 'trade_state', masa: true }); }
  }
  function sonucla(d, oda) {
    const [a, b] = oda.uyeler.map(u => u.id), ea = pkEval(d.oyuncu[a].zar), eb = pkEval(d.oyuncu[b].zar), k = pkCompare(ea, eb);
    d.faz = 'bitti'; d.son = { kazanan: k > 0 ? a : k < 0 ? b : null, eller: { [a]: { rank: ea.rank, key: ea.key }, [b]: { rank: eb.rank, key: eb.key } } };
    return { olaylar: [{ t: 'sonuc', kazanan: d.son.kazanan }], bitti: { kazanan: true, kazananId: d.son.kazanan } };
  }
  const herkesAcik = (d, oda) => oda.uyeler.every(u => d.oyuncu[u.id] && d.oyuncu[u.id].acik);
  function at(d, id, tut) { const o = d.oyuncu[id]; o.zar = o.zar.map((v, i) => (o.atis > 0 && tut && tut[i] === true && v ? v : zar())); o.atis++; o.son = now(); if (o.atis >= 3) o.acik = true; }

  const tanim = {
    enAz: 2, enCok: 2, anahtarGecerli: k => k === 'poker',
    baslat(oda) { return { faz: 'bahis', kilit: {}, takas: null, oyuncu: Object.fromEntries(oda.uyeler.map(u => [u.id, { zar: [0, 0, 0, 0, 0], atis: 0, acik: false, son: now() }])), son: null }; },
    async eylem(d, uye, e, oda) {
      if (!e || typeof e !== 'object') throw hata('eylem_gecersiz');
      const ids = oda.uyeler.map(u => u.id), ben = uye.id, o = d.oyuncu[ben];
      if (e.t === 'kilit' || e.t === 'coz') {
        if (d.faz !== 'bahis') throw hata('faz_uygun_degil');
        if (e.t === 'coz') { delete d.kilit[ben]; return { olaylar: [{ t: 'cozdu', kim: ben }] }; }
        const id = e.takas === '' || e.takas == null ? '' : String(e.takas); if (id && !/^[a-f0-9-]{36}$/i.test(id)) throw hata('takas_gecersiz');
        d.kilit[ben] = id;
        if (!ids.every(x => d.kilit[x] !== undefined)) return { olaylar: [{ t: 'kilitledi', kim: ben }] };
        if (ids.some(x => d.kilit[x] !== d.kilit[ids[0]])) { d.kilit = {}; throw hata('bahis_uyusmuyor'); }
        if (id) {   // bahisli: takas doğrulanır ve kilitlenir
          const t = (await komut(ben, 'get', { tradeId: id })).trade;
          if (!t || t.status !== 'active' || t.participants.length !== 2 || !ids.every(x => t.participants.includes(x))) { d.kilit = {}; throw hata('takas_uygun_degil'); }
          if (t.expiresAt - now() < EN_AZ_KALAN_MS) { d.kilit = {}; throw hata('takas_suresi_az'); }
          kilitli.add(id); d.takas = { id, bitis: t.expiresAt };
        }
        d.faz = 'oyun'; for (const x of ids) d.oyuncu[x].son = now();
        return { olaylar: [{ t: 'basladi', bahisli: !!id }] };
      }
      if (d.faz !== 'oyun') throw hata('faz_uygun_degil');
      if (o.acik) throw hata('elin_acik');
      if (e.t === 'at') { if (e.tut != null && (!Array.isArray(e.tut) || e.tut.length !== 5)) throw hata('eylem_gecersiz'); at(d, ben, e.tut); }
      else if (e.t === 'ac') { if (o.atis < 1) throw hata('once_zar_at'); o.acik = true; o.son = now(); }
      else throw hata('eylem_gecersiz');
      return herkesAcik(d, oda) ? sonucla(d, oda) : { olaylar: [{ t: e.t === 'at' ? 'atti' : 'acti', kim: ben }] };
    },
    /* hamle süresi: oyalanan oyuncu adına karar (bahsi düşürmek için beklemek işe yaramaz) */
    tik(d, oda) { if (d.faz !== 'oyun') return null; let oldu = false;
      for (const u of oda.uyeler) { const o = d.oyuncu[u.id]; if (!o.acik && now() - o.son >= HAMLE_MS) { if (o.atis < 1) at(d, u.id, null); o.acik = true; oldu = true; } }
      if (!oldu) return null; return herkesAcik(d, oda) ? sonucla(d, oda) : { olaylar: [{ t: 'sure' }] }; },
    bitir(oda, sonuc, d) {
      if (!d) return; const ids = Object.keys(d.oyuncu);
      // oyun sürerken ayrılan (ya da kopup dönmeyen) oyuncu kaybeder; bahis fazında ayrılma takası oyuncuların kendi eline bırakır
      const kazanan = sonuc.neden === 'oyuncu_kalmadi' ? (d.faz === 'oyun' ? ids.find(x => x !== sonuc.ayrilan) || null : undefined) : sonuc.kazananId;
      if (kazanan === undefined) return;
      const takas = d.takas; d.takas = null;
      ode(takas, ids, kazanan).then(r => { for (const u of ids) durt(u, Object.assign({ type: 'masa_odeme', kazanan }, r)); });
    },
  };
  return { tanim, ode, kilitli };
}

module.exports = { createKiraathanePvp, HAMLE_MS };
