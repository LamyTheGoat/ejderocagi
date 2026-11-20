# Ekonomi dengesi ölçümü (2026-11-20)

Yol haritası madde 7. Yalnız ölçüm: hiçbir sayı değişmedi, kod değişmedi.
Dayanak: `TASARIM_ILKELERI` §5 (ekonomi önce gelir; ödül, fiyat ve olasılık değişmez), PR 14 (tek kese).
Model: `ekonomi/model.js` (haftalık altın), `ekonomi/ors_mc.js` (Kor Örsü, gerçek kural dosyasıyla 20.000 deneme).

## Kısa sonuç

1. **Altın her oyuncu tipinde birikiyor.** Gelir gideri hafif oyuncuda 1,9 kat, orta oyuncuda 3,2 kat, yoğun oyuncuda 4,4 kat aşıyor. Kese sezon sonunda olduğu gibi yeni sezona geçiyor (ün yarıya iner, altın inmez). Yani birikim sezonlar boyunca sınırsız.
2. **En büyük kaynak Topçu zindanı.** Orta oyuncuda gelirin %56'sı, yoğun oyuncuda %68'i. Bir Zümrüt Saray seferi Normal'de ~580, Ağır'da ~830 altın; haftalık sınırı yok. Ejder arenası ise haftada her ejder için tek dövüşle sınırlı.
3. **En büyük gider Kor Örsü, ama kor taşıyla sınırlı.** Örs her harlı kor taşı başına ~50 altın yakar; bir sefer ~3 harlı kor verir. Yani Örs, zindanın verdiği altının yalnız dörtte birini geri alabiliyor. Öteki giderler (bakım, yem, yapı) bir kez ya da küçük.
4. **Ücretli ulu çark gider değil, kaynak.** 120 altın alıyor, ortalama 126 (Ağır'da 121) altın geri veriyor; üstüne kor taşı, kalıp ve %8 olasılıkla Mühürlü Soy Yumurtası. Sınırsız çevrilebiliyor.
5. **Pazar kesintisi önerim: Bedesten satışında %5, satıcıdan, yakılır.** Doğrudan takasta şimdilik kesinti yok. Gerekçe aşağıda (§4).

## 1. Yöntem ve sınırlar

- Canlı veri yok: sunucuda altın kaydı (kaynak ve gider dökümü) tutulmuyor, huni yalnız adımları sayıyor. Bu yüzden rakamlar **model**: miktarlar ve olasılıklar koddan (dosyalar aşağıda), oyuncunun haftada ne yaptığı varsayım.
- Üç oyuncu tipi, 20 haftalık bir sezon:
  - **Hafif:** 1–4 ejder, haftada 1–3 arena dövüşü, Topçu yok (gençlik iksiri almamış), arada bir sipariş.
  - **Orta:** 1–6 ejder, haftada 3 dövüş, 2 Zümrüt Saray Normal, 1 kervan baskını, iki haftada bir sipariş, Örs'te +7'ye çıkar.
  - **Yoğun:** 1–9 ejder, haftada 5 dövüş (12. haftadan sonra Çukur), 8 Zümrüt Saray Ağır (~2 saat), 4 kervan, Gök Kulesi'nde 3 kat, Örs'te taşı yettiğince.
- Modelde olmayanlar: rastgele olaylar (`content.js`, iki yönlü, küçük), Kıraathane ve düello bahisleri (oyuncular arası sıfır toplamlı), süs ve kuşam alımı (isteğe bağlı gider). Bunlar sonucu değiştirmez.
- Ana kaynak dosyalar: `js/data.js` (TIERS, BUILD, FOODS, ITEMS), `js/week.js` (bakım, hedefler), `js/core.js` (rakip ödülü, pazar fiyatı), `eo2/js/topcu.js` (`odulYaz`, çarklar), `server/local_income.js` (çark ağırlıkları), `server/arena_service.js` (`towerGold`), `js/orders.js`, `eo2/js/ors_kural.js`.

## 2. Haftalık altın (gelir / gider / kese)

| Hafta | Hafif | Orta | Yoğun |
|---|---|---|---|
| 1 | 543 / 203 / 761 | 2.350 / 420 / 2.350 | 8.981 / 640 / 8.761 |
| 2 | 200 / 204 / 757 | 1.761 / 561 / 3.550 | 8.286 / 814 / 16.233 |
| 5 | 304 / 222 / 915 | 1.883 / 771 / 7.406 | 8.707 / 2.582 / 37.768 |
| 10 | 338 / 244 / 1.246 | 2.139 / 829 / 12.597 | 9.445 / 2.685 / 68.842 |
| 15 | 374 / 123 / 2.428 | 2.224 / 590 / 20.663 | 10.494 / 2.323 / 107.754 |
| 20 | 408 / 127 / 3.768 | 2.304 / 598 / 29.038 | 10.964 / 2.367 / 149.807 |
| **Sezon toplamı** | **6.938 / 3.590** | **41.918 / 13.300** | **193.345 / 43.959** |

1. haftadaki sıçrama tek seferlik hedef ödülleridir (toplam 770 altın, bağlı).

### Kaynakların payı (sezon toplamı)

| Kaynak | Hafif | Orta | Yoğun | Haftalık sınır |
|---|---|---|---|---|
| Topçu zindanı | 0 | %56 | %68 | yok |
| Sipariş (ejder teslimi) | %54 | %18 | %8 | sipariş listesi |
| Ejder arenası | %41 | %14 | %8 | ejder başına 1 dövüş |
| Kervan baskını | 0 | %9 | %7 | haftada ~4 kervan |
| Gök Kulesi | 0 | 0 | %7 | kat sayısı |
| Yarış, hedefler | %5 | %4 | %1 | var |

### Giderlerin payı

| Gider | Hafif | Orta | Yoğun | Tekrar eder mi |
|---|---|---|---|---|
| Kor Örsü | 0 | %39 | %68 | evet, kor taşıyla sınırlı |
| Yapı ve arazi | %36 | %20 | %8 | bir kez |
| Yem alımı + bakım | %31 | %16 | %8 | evet, ejder başına küçük |
| Yumurta ve ejder alımı | %18 | %13 | %8 | isteğe bağlı |
| Sefer, yarış ücreti, demirci, iksir, Han dili | %15 | %14 | %8 | çoğu bir kez |

## 3. Bulgular

**B1 · Hafif oyuncu sıkışmıyor ama yavaş.** Haftada ~350 gelir, ~180 gider. Topçu kapısı (gençlik iksiri 140 altın + yavru) açılınca gelir 6 kat artıyor. Topçu'ya geçiş oyunun asıl ekonomik eşiği.

**B2 · Topçu saatte ~2.300–3.300 altın veriyor, arena haftada ~300–800.** Topçu sınırsız, arena sınırlı. Ödül miktarına dokunmak yasak (K18) ve yapay tavan da istenmiyor (§5.1-5); bu yüzden çözüm kaynağı kesmek değil, gider eklemek.

**B3 · Kor Örsü derin ama taşla kilitli.** Örs'te (orta tav, Anka taşı olmadan) beklenen bedel: +4 için 540 altın, +7 için ~5.200 altın, +10 için ~350.000 altın ve ~5.200 harlı kor. +12'ye Anka taşı olmadan pratikte çıkılmıyor. Altın yetse de taş yetmiyor: Örs, zindanın verdiği altının ~%25'ini geri alıyor.

**B4 · Ücretli ulu çark net kaynak.** 120 altına ortalama 126 altın (Ağır'da 121) + 0,96 harlı kor + 0,12 magma taşı + %8 soy yumurtası + kalıp. Her çevirişte oyuncu altın kaybetmeden taş ve yumurta kazanıyor. Gider sanılıyor, değil.

**B5 · Sezon geçişinde altın tam taşınıyor.** `js/season.js` ün'ü yarıya indiriyor, keseye dokunmuyor. Yoğun oyuncu ikinci sezona ~150.000 altınla başlar; NPC fiyatları (yem 12–55, yapı 30–280) onun için anlamsızlaşır.

**B6 · Takas edilen altın küçük bir havuz (PR 14 sonrası).** Tek kesede tarayıcının yazdığı altın bağlı (`bound`) giriyor; Topçu ödülü 2.0'da istemcide yazıldığı için bağlı. Takasa ve Bedesten'e giren kazanılmış altın yalnız sunucunun hesapladığı gelirler: arena, Gök Kulesi, düello ve kazanılmış malın satışı. Modelde bu, orta oyuncuda haftada ~300, yoğunda ~1.500 altın (toplam gelirin %15'i kadar). Bu iyi bir şey: oyuncu pazarındaki enflasyonu sınırlıyor. Ama oyuncunun gözünde "Topçu altınım neden satılmıyor?" sorusunu doğurabilir.

## 4. Pazar kesintisi (D7) önerisi

**Öneri: Bedesten satışında %5 kesinti; satıcının eline geçen tutardan düşer, hiçbir yere yazılmaz (yakılır). Doğrudan takasta şimdilik kesinti yok.**

- Neden kesinti: Bedesten açık ve serbest fiyatlı; kesintisiz pazarda altın hiç yanmaz, aynı mal elden ele geçerken değer üretilmiş gibi olur. Kesinti aynı zamanda kendi kendine al-sat ile sahte fiyat kurmayı pahalılaştırır.
- Neden %5, %10 değil: Müzayede %10 alıyor ama orada alıcı NPC, altın dışarıdan geliyor. Bedesten'de el değiştiren kazanılmış altın zaten dar bir havuz (B6). %10 satıcıyı takasa iter. %5 FF14 pazar tahtasıyla aynı düzeyde.
- Neden takasta yok: takas iki kişinin aynı anda onayladığı yüz yüze iş; çoğu dosta hediye. Bedesten'deki satışlar takasa kaymaya başlarsa (ölçümle görülür) takastaki altına da aynı %5 konur.
- Hesap: `kesinti = Math.floor(toplam × 500 / 10000)`; 20 altının altındaki satışlarda 0. Tek nokta hazır: `server/market_service.js` `MARKET_FEE_BPS` (bugün 0'a kilitli) ve satış makbuzunda `fee` alanı zaten var.
- Etki: yoğun oyuncu haftalık kazanılmış altınının tamamını Bedesten'de döndürse bile haftada ~75 altın yanar. Kesinti ana dengeyi düzeltmez (B2–B5); pazarı sağlıklı tutar.
- **Uygulandı (2026-11-20):** `MARKET_FEE_BPS = 500`; satış makbuzunda `fee` ve `net`; satıcı ekranında "eline … geçer". Kesinti ekonomi defterinde `bedesten.kesinti` kalemiyle sayılır.

## 5. Ortak Sefer boşlukları

| # | Boşluk | Etki | Öneri |
|---|---|---|---|
| O1 | Aynı zindan iki ödülde: çevrimiçi Zümrüt Saray (tek kişi ve grup) 2 aşama, çevrimdışı tek kişilik Sırça Saray 4 aşama | Çevrimdışı oynayan %70 fazla altın alır (Normal 995 / 582, Ağır 1.240 / 827). "Tek kişi = aynı zindan" ilkesine aykırı | **Uygulandı:** çevrimdışı sefer tarifteki aşama sayısı kadar oynar, son aşama boss (`eo2/js/topcu.js` `yolu`). Zümrüt: 1 ara aşama + Şahmeran; Kaldera ve Donanma değişmez |
| O2 | Ödül istemcide yazılıyor (`odulYaz`), sunucu seferi bildiği hâlde altını kendisi yazmıyor | PR 14 ile bağlı girer: hile açığı değil ama Topçu altını takas edilemez | Ortak sefer bitişinde sunucu `topcu.clear`/`topcu.spin` ile yazsın; altının takas edilip edilmeyeceği ayrı karar |
| O3 | Ücretli ulu çark net kaynak (B4) | Altın harcamadan taş ve yumurta basılır | Sayı değişmeden çözüm yok; karar: ya böyle kalsın (eğlence), ya ücretli çevirme sefer başına sınırlansın |
| O4 | Haftalık sınır yok, kişi sayısı ödülü bölmüyor | İlkeye uygun (§5.2). Grupta düşman canı ×2,5, süre benzer | Dokunma |
| O5 | Kaldera ve Donanma kapalı | Tek zindan, tek ödül tablosu; Örs için kalıp çeşidi tek | Tepegöz gelince ödül tablosu ekonomi karar belgesiyle (§5.2) |

## 6. Sayı değiştirmeden önerilen işler (öncelik sırasıyla)

1. **Ekonomi defteri (ölçüm). Uygulandı:** `server/ekonomi_defteri.js`; her komutun altın farkı gün × kalem başına, komutla aynı işlemde sayılır. Okuma: `/ekonomi` sayfası (HUNI_ANAHTAR ile). Takas ve düello sayılmaz (oyuncular arası aktarım).
2. **D7: Bedesten %5** (§4).
3. **O1: çevrimdışı Sırça Saray'ı 2 aşamaya hizala. Uygulandı.**
4. **Yeni gider:** §5.2 gereği her kaynağın bir çıkışı olmalı. Topçu altınının çıkışı bugün yalnız Örs. Ejdere dönen, tekrar eden bir altın gideri gerekiyor (örnek: ocak süsleri, kuşam boyası, soy defteri mührü). Ayrı tasarım kararı.
5. **Sezon geçişi (B5):** kesenin taşınması bilinçli bir karar mı, sorulmalı. Değiştirmek kural değişikliği olur; şimdilik yalnız not.

## 7. PR 14 (tek kese) bu raporu nasıl etkiliyor

- Toplam altın akışı değişmiyor: aynı kaynaklar, aynı giderler, tek kesede toplanıyor.
- Değişen sınıf: yerel akışın altını (Topçu dahil) bağlı giriyor. Bu, Bedesten'e giren altını küçültüyor; §4'teki %5 bu küçük havuza göre seçildi.
- Yeni ocak, tek keseli hesapta 420 başlangıç vermiyor: yeni ocak açarak altın basma kapanıyor (iyi).
