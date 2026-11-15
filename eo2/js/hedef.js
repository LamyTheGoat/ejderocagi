/* Ejder Ocağı 2.0 · Hedef ödülleri sunucuda (EO2.hedef)
   Sunucu tarafı: goal.reach (server/local_income.js). Bu dosya oyun kuralı içermez: hedefler, koşulları ve ödül
   tutarları oyunun kendisidir (js/core.js GOALS).

   NE DEĞİŞİR
   Hedefin koşulu yerel oyunda gerçekleşir; ödül altınını artık yerel oyun değil SUNUCU yazar, hesap başına bir kez.
   Ödül takas edilemeyen altındır (kaynak politikası: hedef ödülü hesaba bağlı); ag.js onu yerel keseye teslim alır,
   göstergede eskisi gibi görünür. Aynı hesapta yeniden kurulan ocakta daha önce alınmış hedef ödülü yeniden yazılmaz.

   Ocak bir hesaba bağlanmadıysa (hiç bağlantı kurulmadı, statik yayın) eski davranış aynen sürer: ödülü yerel oyun öder.
   Çevrimdışıyken ulaşılan hedef kuyrukta bekler (`S.hedefKuyruk`, kayıtla birlikte durur); bağlantı gelince yazılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, AG = EO2 && EO2.ag;
  if (!AG || typeof checkGoals !== 'function' || typeof GOALS === 'undefined') return;
  const yerel = checkGoals;
  let calisiyor = false, bekle = 0;
  const hesapli = () => typeof S !== 'undefined' && S && S.ocakEs && S.ocakEs.acct;        // ocak bir hesabın defterine bağlandı mı
  const soyle = (html, tur) => { if (typeof toast === 'function') toast(html, tur); };
  const kaydet = () => { try { saveGame(); } catch (_) { } };

  checkGoals = function () {                                                               // eslint-disable-line no-global-assign
    if (!hesapli()) return yerel();
    const K = S.hedefKuyruk = Array.isArray(S.hedefKuyruk) ? S.hedefKuyruk : [];
    let yeni = false;
    for (const g of GOALS) if (!S.goals.includes(g.id) && g.c()) { S.goals.push(g.id); K.push(g.id); yeni = true;
      if (!AG.cevrimici()) soyle('<b>Hedef tamamlandı</b> ' + g.t + '. Ödülü bağlantı gelince hesabına yazılır.', 'goal'); }
    if (yeni) setTimeout(gonder, 0);
    return [];                                                                             // ödül bildirimi sunucu yanıtıyla gösterilir
  };

  async function gonder() {
    if (calisiyor || Date.now() < bekle || !AG.cevrimici() || !hesapli() || !Array.isArray(S.hedefKuyruk) || !S.hedefKuyruk.length) return;
    calisiyor = true;
    try {
      for (const id of [...S.hedefKuyruk]) {
        const g = GOALS.find(x => x.id === id), cikar = () => { S.hedefKuyruk = S.hedefKuyruk.filter(x => x !== id); kaydet(); };
        if (!g) { cikar(); continue; }
        try {
          const r = (await AG.komut('goal.reach', { id })).result; cikar();
          if (r.already) soyle('<b>Hedef tamamlandı</b> ' + g.t + '. Ödülü bu hesapta daha önce alınmıştı.', 'goal');
          else soyle('<b>Hedef tamamlandı</b> ' + g.t + ' <b class="au">+' + r.gold + ' altın</b>', 'goal');
        } catch (e) {
          if (e && e.status && e.status < 500 && e.code !== 'version_conflict') { cikar(); soyle('Hedef ödülü yazılamadı: ' + g.t, 'kotu'); }
          else { bekle = Date.now() + 8000; break; }                                       // ağ ya da sunucu hatası: kuyrukta kalır
        }
      }
    } finally { calisiyor = false; }
  }
  AG.dinle('durum', d => { if (d === 'cevrimici') setTimeout(gonder, 800); });
  setInterval(gonder, 6000);
  EO2.hedef = { gonder, bekleyen: () => (typeof S !== 'undefined' && S && Array.isArray(S.hedefKuyruk) ? S.hedefKuyruk.length : 0) };
})();
