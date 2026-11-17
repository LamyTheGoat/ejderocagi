/* Ejder Ocağı 2.0 · Zindan tarifleri (2026-11-17)
   YENİ ZİNDAN BURAYA EKLENİR. Bir zindan, sırayla oynanan ARENALARDAN oluşur; arenanın kendisi (çizim, zemin, düşmanların yeri ve canı)
   eo2/arenalar/<ad>/ klasöründedir ve js/arena_veri.js'e derlenir (tools/arena_derle.mjs). Sunucu da oyun da bu iki dosyayı okur.
   Tek kişi de grup da aynı zindanı aynı kurallarla oynar. Yöntem: eo2/docs/ZINDAN_YONTEMI.md. Dosya yalnız veridir.
     ad        oyuncunun gördüğü ad
     odul      ödül ve çark kuralları hangi seferden alınır (js/topcu_veri.js ZINDAN anahtarı). Ödül miktarı burada YAZILMAZ.
     tanitim   sefer kurma ekranındaki tek paragraf
     asama[]   arena adları (eo2/arenalar altındaki klasör adları), oynanış sırasıyla */
(function (kok) {
  'use strict';
  const TARIF = {
    zumrut: { ad: 'Zümrüt Saray', odul: 'sahmeran', tanitim: 'Şahmeran\'ın sarayına girilir. İki aşama var: Zümrüt Saray Köprüsü ve Şahmeran\'ın Defilesi.', asama: ['zumrut-kopru', 'zumrut-defile'] },
    /* Çizimi henüz arena klasörü olarak gelmemiş iki zindan: aşamaları eski seferin aşamalarıdır (arena.json içinde "eski"); kurallar ve akış aynı ortak sistemdir. */
    kaldera: { ad: 'Volkanik Kaldera', odul: 'komutan', tanitim: 'Kül Yutan\'ın kalesine çıkılır. Dört aşama var: Yanık Bazalt Yolu, Bazalt Köprü, Yıkık Ejderha Örsü ve Başkomutan Kalgarot.', asama: ['kaldera-yol', 'kaldera-kopru', 'kaldera-ors', 'kaldera-mabet'] },
    donanma: { ad: 'Batık Donanma', odul: 'abra', tanitim: 'Batık donanmanın sularına inilir. Dört aşama var: Mercan Kıyısı, Girdap Boğazı, Batık Tersane ve Derya Yılanı Abra.', asama: ['donanma-kiyi', 'donanma-bogaz', 'donanma-tersane', 'donanma-kadirga'] },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TARIF; else kok.EO2_ZINDAN = TARIF;
})(typeof window !== 'undefined' ? window : this);
