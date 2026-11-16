/* Ejder Ocağı 2.0 · Ortak zindan tarifleri (2026-11-17)
   YENİ ZİNDAN BURAYA EKLENİR. Hem sunucu (server/zindan_ortak.js) hem oyun (js/zindan_ortak.js) bu tek dosyayı okur:
   sunucu düşman canlarını ve aşama sayısını, oyun sahneyi, zemini, düşmanların yerini ve yazıları buradan alır.
   Yöntemin tamamı: eo2/docs/ZINDAN_YONTEMI.md. Dosya yalnız veridir (fonksiyon yok); tests/zindan_tarif.test.js biçimi denetler.

   Bir zindan:
     ad        oyuncunun gördüğü ad
     odul      ödül ve çark kuralları hangi seferden alınır (js/topcu_veri.js ZINDAN anahtarı). Ödül miktarı burada YAZILMAZ.
     tema      zemin dokusu (sahne resmi olmayan aşamalarda görünür) · ortam: havada uçuşan parçacık
     tanitim   sefer kurma ekranındaki tek paragraf
     asama[]   sırayla oynanan aşamalar

   Bir aşama:
     ad, alt, ipucu     başlık, alt başlık, savaş başındaki ipucu
     sahne              dünyaya kilitli sahne resmi: { src, yer, y, ust, alt }
                          src  resim (dünyanın tamamını kaplar: 3400 oyun pikseli genişlik)
                          yer  resimde yürüme hattının üstten uzaklığı (resim pikseli)
                          y    oyunda o hattın yüksekliği (oyun pikseli; zemin ile aynı olmalı)
                          ust, alt  resmin üstünde ve altında kalan boşluğun rengi
     zemin              yürünen zemin, soldan sağa noktalar [[x, y], ...] (oyun pikseli; x 0–3400, y küçüldükçe yükselir)
     kirilmaz           true: gülle çukur açmaz (sahne resimli aşamalarda hep true)
     x0                 oyuncuların başladığı yer (grup bunun çevresine dizilir)
     mobSinir           yerdeki düşmanların yürüyebildiği aralık [sol, sağ]
     dusman[]           { tip, ad, x, hp, yuk? }  tip: js/topcu_veri.js MOB anahtarı · yuk: uçan düşmanın yüksekliği
     boss               { tip, ad, unvan, x, hp }  tip: js/topcu_veri.js BOSS anahtarı (kurallar, hamleler ve konuşmalar orada)
   Can sayıları tek oyuncu içindir; sunucu zorluk ve grup çarpanını uygular. Sıra: dusman[] sonra boss (sunucudaki numara budur). */
(function (kok) {
  'use strict';
  const TARIF = {
    zumrut: {
      ad: 'Zümrüt Saray', odul: 'sahmeran', tema: 'sirca', ortam: 'spor',
      tanitim: 'Şahmeran\'ın sarayına grupça girilir. İki aşama var: Zümrüt Saray Köprüsü ve Şahmeran\'ın Defilesi.',
      asama: [
        { ad: 'Zümrüt Saray Köprüsü', alt: 'Yılanlar iki yandan geliyor', ipucu: 'Yılanlar iki yandan gelir. Fareyi çevirdiğin yana döner, o yana ateş edersin. Önce yaklaşanı vur.',
          sahne: { src: 'assets/zumrut/kopru.webp', yer: 563, y: 1000, ust: '#6fafFd', alt: '#e8f2fb' }, zemin: [[0, 1000], [3400, 1000]], kirilmaz: true, x0: 1700, mobSinir: [260, 3140],
          dusman: [{ tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', x: 760, hp: 760 }, { tip: 'viper', ad: 'Uçan Sırça Engereği', x: 380, yuk: 590, hp: 800 }, { tip: 'zs_vurucu', ad: 'Bronz Engerek Muhafızı', x: 2640, hp: 760 }, { tip: 'viper', ad: 'Uçan Sırça Engereği', x: 3020, yuk: 590, hp: 800 }] },
        { ad: 'Şahmeran\'ın Defilesi', alt: 'Yılan Kraliçe yükseltide bekliyor', ipucu: 'Zemin kırılmaz. Altın tacı zayıf noktasıdır. Her tur yerdeki halkadan çık, sonra ateş et.',
          sahne: { src: 'assets/zumrut/defile.webp', yer: 683, y: 1010, ust: '#0d3327', alt: '#0a2a20' }, zemin: [[0, 1010], [2400, 1010], [2520, 905], [3400, 905]], kirilmaz: true, x0: 460,
          dusman: [{ tip: 'zs_agir', ad: 'Sırça Taht Muhafızı', x: 1560, hp: 640 }, { tip: 'zs_agir', ad: 'Sırça Taht Muhafızı', x: 2080, hp: 640 }],
          boss: { tip: 'sahmeran_v3', ad: 'Yılan Kraliçe Şahmeran', unvan: 'Zümrüt Saray\'ın ebedi hükümdarı', x: 2760, hp: 3600 } },
      ],
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TARIF; else kok.EO2_ZINDAN = TARIF;
})(typeof window !== 'undefined' ? window : this);
