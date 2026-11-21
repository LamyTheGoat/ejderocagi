/* Ejder Ocağı 2.0 · Mühürler (EO2.muhur): ödülsüz başarı mühürleri (eo2/docs/GERI_CAGIRMA_KARARI.md).
   Her mühür oyunun kendi sayısına (S.st) ve bir eşiğe bağlıdır. ÖDÜL YOK: altın, ün, eşya vermez; kayda (S) yeni alan eklemez.
   Hangi mühürlerin duyurulduğu yalnız bu tarayıcıda, kayıt yuvasına göre tutulur. Defter'in "Mühürler" ayracında görünür. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game;
  const MUHURLER = [
    ['zafer1', 'İlk zafer', 'Bir dövüş kazan.', 'wins', 1],
    ['zafer10', 'Arena tozu', '10 dövüş kazan.', 'wins', 10],
    ['zafer50', 'Arenanın yükü', '50 dövüş kazan.', 'wins', 50],
    ['kupa1', 'Kupa sahibi', 'Bir turnuvanın kupasını al.', 'kupa', 1],
    ['yumurta1', 'İlk çatlak', 'Bir yumurtayı çatlat.', 'hatch', 1],
    ['yumurta10', 'Kuluçka ustası', '10 yumurta çatlat.', 'hatch', 10],
    ['cift1', 'İlk yuva', 'İki ejderhayı çiftleştir.', 'bred', 1],
    ['cift10', 'Soy kurucu', '10 kez çiftleştir.', 'bred', 10],
    ['yaban1', 'Kement', 'Seferde bir yaban ejderha yakala.', 'catches', 1],
    ['yaban5', 'Yaban dostu', '5 yaban ejderha yakala.', 'catches', 5],
    ['sefer10', 'Yol eskisi', '10 sefere çık.', 'seferler', 10],
    ['yem3', 'Damak bilen', '3 ejderhanın sevdiği yemi bul.', 'fav', 3],
    ['sohbet25', 'Hasbihal', 'Ejderhalarınla 25 kez konuş.', 'talk', 25],
    ['siparis5', 'Sözünün eri', '5 siparişi teslim et.', 'orders', 5],
    ['yaris1', 'Gök birincisi', 'Bir gök yarışı kazan.', 'raceWins', 1],
  ].map(([id, ad, t, st, esik]) => ({ id, ad, t, st, esik }));
  const st = () => (typeof S !== 'undefined' && S && S.st) || {};
  function liste() { const s = st(); return MUHURLER.map(m => { const n = Math.max(0, +s[m.st] || 0); return Object.assign({ n: Math.min(n, m.esik), tamam: n >= m.esik }, m); }); }
  const anahtar = () => 'eo2-muhur-duyuru:' + (typeof saveKeyForSlot === 'function' ? saveKeyForSlot() : 'ejder-ocagi-v1');
  function duyurulan() { try { const v = JSON.parse(localStorage.getItem(anahtar()) || 'null'); return Array.isArray(v) ? new Set(v) : null; } catch (_) { return null; } }
  function yaz(set) { try { localStorage.setItem(anahtar(), JSON.stringify([...set])); } catch (_) { } }
  /* yeni kazanılanları bir kez duyurur. İlk çalışmada (eski kayıt) var olanlar sessizce yazılır; yoksa açılışta bir yığın bildirim çıkardı. */
  function denetle() { if (!G || !G.live || typeof S === 'undefined' || !S || !S.st) return [];
    const L = liste().filter(m => m.tamam), d = duyurulan();
    if (!d) { yaz(new Set(L.map(m => m.id))); return []; }
    const yeni = L.filter(m => !d.has(m.id)); if (!yeni.length) return [];
    for (const m of yeni) d.add(m.id); yaz(d);
    for (const m of yeni.slice(0, 2)) G.toast('<b>Mühür kazandın: ' + m.ad + '</b> ' + m.t + ' Defter\'de.');
    return yeni; }
  if (G) setInterval(denetle, 6000);
  EO2.muhur = { liste, denetle, MUHURLER };
})();
