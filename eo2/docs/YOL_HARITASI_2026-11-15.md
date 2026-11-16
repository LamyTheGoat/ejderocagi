# Ejder Ocağı 2.0 · Çıkış yol haritası

> Yazan: cila ajanı, 2026-11-15. Dayanak: bu gecenin doğrulamaları, `EKSIK_OZELLIKLER_2026-11-15.md`,
> `SUNUCU_OTORITESI_PLANI_2026-11-15.md`. Kullanıcı onayı bekleyen maddeler "Karar" diye işaretli.
> Durum sözcükleri: **bitti** (doğrulandı ve gönderildi), **sürüyor** (alt ajanda, doğrulanmadı), **bekliyor**.

## 1. Bugünkü durum

| Alan | Durum | Not |
|---|---|---|
| Varsayılan harita master Merkez Meydan, kapı dönüşleri | bitti | Dönüş noktaları oyunda tek tek yürünerek denenmedi |
| Kısa eylem çubuğu + açılır tepsi, yeni madalyonlar | bitti | |
| İsim plakası çakışması, bildirim yeri, giriş ipucu | bitti | |
| Sağlamlık (sekme susma, hata yakalama, yeniden dene, favicon) | bitti | |
| Üretim sunucusu 2.0'ı `/eo2/` altında sunuyor | bitti | Sıkıştırma ve paketleme yok (bkz. 3.1) |
| Arena altını sunucuda (kademe, turnuva, bahis, kule, çukur cezası) | bitti | 197 birim testi; tarayıcıda 11 dövüşte sapma 0 |
| Er Meydanı (ejderha düellosu PvP, ödülsüz) | bitti | Bağlantı kopması tarayıcıda denenmedi |
| Bedesten ve Ocak Sandığı | bitti | Kuşam ve yumurta ilanı gerçek veriyle denenmedi |
| Kıraathane 2.0 ve bahis tepsisi | bitti | Yerel rakibe karşı; oyuncular arası masa yok |
| Topçu ve Zindan sahnesi, zindan çizgi romanları, Topçu PvP odaları | bitti | Volkanik Kaldera, Batık Donanma ve Ağır zorluk baştan sona oynatılmadı; ödüller yerel kayıtta |
| Ayarlar, kayıt aktarma, oyuncu adı, ilk hafta rehberi, müzik | bitti | Oyuncu adı sunucuya gitmiyor; parçalar dinlenerek denetlenmedi |
| Ocak sahnesi cilası | bitti | Yeni çizim üretilemedi (Midjourney bakiyesi); gece görünüşü doğrulanmadı |
| Ocağın sunucu defterine içe aktarılması, Bedesten köprüsü | bitti | Karar: içe aktar (2026-11-16). Aynalar istemci beyanı; altın içe aktarılmadı |
| Hesap tezgâhı: sunucu pazar stoğu Gece Çarşısı'nda (ejderha, yumurta) | bitti | Kazanılmış altınla alınan mal Bedesten'de satılabilir. Çift başlangıç kesesi bağlanınca sıfırlanır (karar 2026-11-16); tezgâh arena kazancıyla açılır. Kazanılmış alım tarayıcıda değil, birim testinde doğrulandı |
| Hedef ödülleri sunucuda (`goal.reach`, hesap başına bir kez) | bitti | Koşul yerel oyunda gerçekleşir (istemci beyanı). Aynı hesapta yeniden kurulan ocakta alınmış ödül yeniden yazılmaz. (kullanıcı kararı 2026-11-16: bir kez kalır) Kariyer hedefleri hâlâ yerelde |
| Sipariş teslimi ve müzayede satışı, kazanılmış ejderha için sunucuda (`order.deliver`, `auction.sell`) | bitti | Salon sunucunun teklif sırasını sahneler. Tarayıcıda yalnız sahte sunucu yanıtıyla denendi; gerçek kazanılmış ejderhayla uçtan uca denenmedi. Yerel kökenli ejderhada akış yerel kalır |
| Kor Örsü ve kuşam yükseltme | bekliyor | Bkz. 2.3 |
| Çok oyunculu zindan (ortak boss) | bekliyor | Bkz. 2.2 |

## 2. Sıradaki büyük işler (öncelik sırasıyla)

### 2.1 Ocağın sunucu defterine geçmesi · ilk adım bitti
> 2026-11-16: içe aktarma yapıldı; sunucu tezgâhı 2.0 pazarına bağlandı (`eo2/js/tezgah.js`, `tezgah.hafta`). Hedef ödülleri sunucuya taşındı (`eo2/js/hedef.js`). Hafta sonunun kendisinde hedef dışında altın geliri yok (yalnız bakım gideri); kalan gelirler olay, kariyer, sipariş ve sosyal akışlardır ve sunucunun olayı kendisinin üretmesini ister (plan S8).
> Karar (2026-11-16): 2.0'a bağlanan hesapta sunucunun bağlı başlangıç altını (yerel başlangıç kesesinin eşi) bir kez sıfırlanır (`S.ocak.kese`); gösterge değişmez. Açık kararlar: kazanılmış ejderhanın yerel antrenmanı satış kopyasına yansısın mı; misafir hesabının kurtarılması (X ile bağlama).

Hafta sonu geliri, hedef ödülleri, pazar, sipariş, müzayede, saray ve olay kazançlarının sunucuya taşınması tek ön koşula bağlı:
2.0'daki ejderha ve yumurtaların sunucu defterinde tutulması. Aynı adım şunları da çözer: Bedesten'den alınan ejderhanın Ahır'da
görünmesi, locadan teklif satışı, `gold.local` komutunun kapanması.
- **Karar:** yerel ocak bir kez içe aktarılsın mı, sıfırlansın mı. Öneri: içe aktarma (oyuncu kaybı olmaz); içe aktarılan varlık
  "hesaba bağlı" sayılır, satılamaz.
- Bu karardan bağımsız, şimdiden yapılabilecekler: Kıraathane ve yarış kazançları (arena ile aynı kalıp).
- İş büyüklüğü: büyük (günler). Ayrıntı: `SUNUCU_OTORITESI_PLANI_2026-11-15.md`.

### 2.2 Instance tabanlı PvE: zindanlar ve kervan
Bugün zindan tek oyunculu; eski oyundaki ortak oyun yalnız görseldi. Hedef (FF14 görev bulucu mantığı): parti kur ya da kuyruğa gir,
eşleşince örnek açılır, boss canı sunucuda ortak.
- **Altyapı kuruldu (2026-11-16), oynanış bekliyor:** örnek odaları, görev bulucu kuyruğu, davet, kopma ve sunucuda ortak durum `server/ortak_odalar.js` + `eo2/js/ortak.js` içinde; tür tanımı `ORTAK.kaydet` ile eklenir. Ayrıntı: `ORTAK_PVE_ALTYAPISI.md`. Kullanıcı kararı: uygulama beklesin.
- Sunucuda `pvp_rooms` oda modelini tür alanıyla genelleştir (topçu, düello, zindan).
- Zindan odasında boss canını ve sırayı sunucu tutsun; ödülü sunucu yazsın.
- Parti durumunu sunucuya al (bugün yalnız istemcide).
- İş büyüklüğü: büyük. Topçu sahnesi bitmeden başlanmaz.

### 2.3 Kor Örsü ve kuşam · **Karar**
Eski Kor Örsü'nün kuralları en eski chibi sisteminin dosyasında (`js/chibi.js`) ve 2.0'da yüklenmiyor. Kullanıcı kararı: o sistemden
bir şey kalmayacak, her şey yeni chibi sisteminde kurulacak; chibi çizimleri chibi ajanının işi.
- **Karar:** yeni kuşam yuvaları ve yükseltme kuralları eski sayılarla mı taşınsın (yükseltme olasılıkları, taş bedelleri), yoksa
  yeniden mi tasarlansın. Öneri: sayıları aynen taşı, yalnız görünümü ve yuvaları yeni sete uyarla.
- Bağımlılık: chibi ajanının set ve parça teslimi. Kıraathane taş ve cevher değerlerini şimdilik o dosyadan kopyaladı.

### 2.4 Sosyal katman
- Meydanda öteki oyuncuların görünmesi: **yapıldı (2026-11-16).** `server/meydan_presence.js` + `eo2/js/meydan_ag.js`: konum, yön, set, yol arkadaşı, jest; aynı kanal (en çok 30 oyuncu) ve aynı alandakiler birbirini görür; ad sunucuda süzgeçten geçer; sohbet taşınmaz. İki tarayıcılı denetim `tools/check_meydan.mjs` (duman testinde). Eksik: öteki oyuncunun gerçek kuşamı ve ejderhasının türü (şimdi set adı ve genel yol arkadaşı), oyuncuya dokununca profil.
- Sohbet: **açıldı (2026-11-16)**, şart koşulan dört önlemle: sunucuda küfür süzgeci ve bağlantı ayıklama (`temizSoz`), hız sınırı (iki söz arası 1,2 sn, otuz saniyede sekiz söz), istemcide engelleme (`eo2.engel`), şikâyet (`/api/report`, son sözlerle). Tek kanal: bulunduğun alan ve kanal. Sözler saklanmaz. Süzgeç listesi kısadır; yayından önce genişletilmeli. Parti ve fısıltı yok.
- Oyuncu kartı (2026-11-16): meydanda bir oyuncunun yanına gelince selam ver, Topçu düellosuna çağır (Er Meydanı odası kurulur, davet gider), engelle, şikâyet et.
- **Yapıldı (2026-11-16):** bire bir takas (`eo2/js/takas.js`, sunucu `trade_service.js`), dost listesi ve fısıltı (`server/social_service.js`, `eo2/js/dostlar.js`), oyuncu kartından ejderha ve Topçu düellosu daveti. Açık: parti penceresi, profil inceleme, çevrimdışı mesaj.
- Oyuncular arası Kıraathane masası ve takas (bağlantı noktaları hazır: `EO2.kiraathane.baglan`, `server/trade_service.js`).

## 3. Çıkıştan önce şart olan küçük ve orta işler

1. **İlk yük:** açılışta 500'den fazla istek, 70'ten fazla ayrı betik. Sıkıştırma eklendi (2026-11-16: betik ve stiller brotli/gzip ile 2973 KB'tan 897 KB'a iniyor). **Görseller (2026-11-16):** önceki 21 MB ölçümü eksikti (tarayıcı sayacı 250 istekte kesiyordu); açılışta gerçekte yaklaşık 50 MB görsel iniyordu. Artık yalnız başlangıç sahnesinin çizimleri iner (yaklaşık 20 MB: Merkez Meydan 10 MB, chibi kareleri 6,4 MB, zemin 1,6 MB); öteki sahnelerin çizimleri sahneye girilirken yüklenir (`EO2.sahneYukle`, perde yükleme bitene dek kapalı), bağlantı uygunsa boşta arka planda iner. Reddedilen boyalı meydan ve Pilot Meydan çizimleri oyuncuya hiç inmez. Kalan: Merkez Meydan'ın 10 MB'ı ve chibi kareleri (chibi ajanının alanı). Betikleri tek pakete topla, bölüm çizimlerini
   girilince yükle, sunucuda gzip/brotli ve uzun önbellek başlığı. Yükleme perdesine ilerleme çubuğu.
2. **Kayıt yedeği:** kayıt yalnız tarayıcıda. Misafir hesabına sunucu yedeği (2.1 ile birlikte çözülür); o zamana kadar dışa/içe aktarma.
3. **Ürün kimliği:** paylaşım görseli (og:image), sürüm numarası, künye, gizlilik ve kullanım koşulları sayfası, yazı tiplerinin kendi
   sunucudan verilmesi.
4. **Telefon:** yatay yön önerisi, tam ekran, uzun basma menüsünün kapatılması; gerçek telefonda ve iOS Safari'de deneme (hiç yapılmadı).
5. **Sorun bildir:** oyuncu için düğme, bizim için sunucuya düşen hata günlüğü (`EO2.hatalar` hazır).
6. **Denetim betikleri:** `check_oyun.mjs` ve `check_uc.mjs` yeni akışa (master açılış, ad sorma, yeni Kıraathane) uyarlanmalı; her
   commit'ten önce koşan tek bir "duman testi" olmalı.

### 3b. Bölüm 3'ün durumu (2026-11-16)

| Madde | Durum | Not |
|---|---|---|
| 1 İlk yük | büyük ölçüde bitti | Sıkıştırma, sahneye girişte yükleme ve sürüm damgası yapıldı (`server/eo2_page.js`: betik ve stil adresleri içerik özetiyle yazılır, bir yıl değişmez önbellek; ikinci açılışta 111 dosyanın tamamı önbellekten, sunucuya soru yok; yayın sonrası eski-yeni dosya karışmaz). **Karar:** betikler tek dosyada toplanmadı; damga ve sıkıştırma aynı kazancı daha az riskle veriyor, ilk açılıştaki 111 istek HTTP/2 üzerinde kabul edilebilir. Kalan: Merkez Meydan'ın 10 MB çizimi, chibi kareleri; görseller damgalı değil (7 gün önbellek: aynı adla değişen çizim bir hafta eski görünebilir) |
| 2 Kayıt yedeği ve hesap kurtarma | bitti | Yerel kayıt hesaba yedeklenir (`/api/save`, `eo2/js/hesap.js`); menüden kurtarma kodu alınır, giriş ekranında "Kurtarma kodum var" ile başka tarayıcıdan aynı hesaba ve ocağa dönülür. Başka cihazın yazdığı yedek sessizce ezilmez (oyuncu seçer). SQLite ve Firestore'da testli; iki tarayıcılı denetim `tools/check_hesap.mjs`. Sunucu yedeği okumaz, ekonomide kullanmaz |
| 3 Ürün kimliği | bitti, iki eksikle | Yazı tipleri kendi sunucudan (`tools/yazi_indir.mjs`), sürüm `EO2.surum`, giriş ekranında künye, `gizlilik.html` ve `kosullar.html` (**taslak**: iletişim adresi ve işletenin adı kullanıcıdan bekleniyor; hukukçu görmedi), paylaşım görseli (`tools/paylasim.mjs`) |
| 4 Telefon | kısmen | Uzun basma menüsü kapalı, dik tutuşta yatay öneri (`js/telefon.js`), tam ekran ayarlarda vardı. Gerçek telefonda ve iOS Safari'de deneme yapılmadı |
| 5 Sorun bildir | bitti | Menü → Sorun bildir; `/api/report` veri dizinindeki `sorunlar.jsonl` dosyasına yazar (`server/report_log.js`). Okumak için yönetici ekranı yok; dosyadan okunur |
| 6 Duman testi | bitti | `npm run duman`: birim testleri, tam tur, sahne gezisi, belge sayfaları. `check_uc.mjs` (derin akışlar: turnuva, ölüm, üreme, yaban yakalama, pazar, yarış, ocak, süs, kütük, kule, divan, diyar, kervan, Kıraathane) güncel akışa uyarlandı; on dört senaryo hatasız. Duman testine dahil değil (uzun sürer): `node eo2/tools/check_uc.mjs <klasör>` |

## 4. Cila isteyen görsel eksikler (gözle görülen)

- Kervan Tavlası tahtası (2026-11-16): kodla damarlı ahşap, orta ray ve kakma haneler çizildi; çizilmiş tahta görseli gelirse onunla değişir.
- Midjourney bakiyesi bitti. Bekleyen çizimler: Ocak için bostan, odunluk, yalak, korkuluk, ahşap çit, kapı direği, çim dokusu; Kıraathane için masa sahnesi ve tavla tahtası; Topçu sahnesinin büyütülmüş hâli (şimdiki 1536 piksel).
- Motor istekleri (Ocak ajanından): zemin kabartması çime uygulanmasın, mini haritada açılabilir kare katmanı, pano açıkken kamera kayması, zemin lekeleri için tek doku atlası (çizim çağrısı 296'dan yüzün altına iner).
- Tam tur denetiminde ara sıra (2026-11-16: on altı koşuda bir; ardışık on koşuda yinelenmedi) sunucudan bir 400 yanıtı düşüyor ve o koşuda tur sonu altını düşük çıkıyor; nedeni bulunamadı. `check_oyun.mjs` artık yanıtın yolunu, komut türünü ve hata kodunu yazıyor. 2026-11-16: sunucu, reddettiği dövüşün hangi denetimde hangi değerle kaldığını günlüğe yazıyor (`[komut reddi]`, `server/arena_service.js` `detail`); bir sonraki görülüşte nedeni günlükten okunur. Turnuva denetimindeki 400'ler denetim yapaylığıydı (senaryo rakipleri 1. seviyeye indiriyordu, sunucu doğru olarak reddediyordu); senaryo düzeltildi.
- Mini harita: master'daki gibi çizilmiş harita, pusula ve yakınlaştırma yok.
- Simge ailesi (2026-11-16): jestler, ses ve menü, antrenman ve bakım, Yuva, sefer, Bedesten süzgeçleri ve dövüş düğmeleri madalyon ailesine geçti (Midjourney sayfaları, `tools/madalyon.mjs` + `tools/madalyon_esle.mjs`; kaynak sayfa `docs/arayuz_simge_sayfalari_2026-11-16.jpg`). Yumurtalar elementine göre çizildi, para ve ün simgeleri yenilendi. Pazar ve Han'daki kişi portreleri portre olarak kaldı.
- Arena dövüşü (2026-11-16): ilk sürümün çizgi roman ara kareleri bağlandı (açılış, güçlü nefes, kritik, siper, sendeleme, zafer ve yenilgi; `css/kare.css` eski stilden `tools/kare_css.mjs` ile ayıklanır), nefes ışını, vuruşta beyaz parlama ve geri savrulma, hamle sesleri, ayrı renkli can çubukları, terbiyeci avatarları (yapay rakipte addan türetilen set). Hikâye çizgi romanı ekrana sığdırılıyor ve 2.0 düğmelerini kullanıyor. Eksik: Er Meydanı ejderha düellosunda öteki oyuncunun gerçek seti, durum rozetleri.
- Mavi-altın hat: ekranlar ayrı ayrı iyi, ama pencere çerçevesi, düğme ve sekme ölçüleri tek bir bileşen dosyasında toplanmadı
  (`cam.css` 1200 satır, üstüne altı ek dosya). Öneri: çıkıştan önce bir "bileşen sayfası" (düğme, sekme, pano, rozet, pencere)
  çıkarıp sapmaları tek geçişte gidermek.

## 4b. Kararlar (2026-11-16, kullanıcı karar yetkisini devretti: "kendin karar ver")

- **Kıraathane ve yarış sunucuya şimdi taşınmaz.** Bahis ve giriş ücreti yerel keseden konuyor; sunucu sonucu yeniden oynatsa bile ortaya konan mal istemci beyanı olur ve kazanç takas edilebilir altına dönüşür. İkisi de kese birleşmesiyle (plan S11) birlikte taşınır.
- **Kazanılmış ejderhanın yerel antrenmanı satış kopyasına yansımaz.** Alıcı, ejderhanın satıcıya geldiği andaki hâlini alır; aksi istemci beyanını satılan mala taşırdı.
- **Misafir hesabının kurtarılması çıkıştan önce yapılır.** Sunucuda artık kazanılmış altın ve varlık duruyor; çerez giderse erişim kalmıyor. **Yapıldı (2026-11-16), X yerine kurtarma koduyla:** X ile bağlama üretim anahtarı ve X uygulaması ister (kullanıcıda); kurtarma kodu dış hizmete bağlı değildir ve e-posta ya da kişisel veri istemez. Kod 120 bit, depoda yalnız özeti durur, deneme IP başına on dakikada on. X ile bağlama ileride eklenebilir; ikisi birbirini dışlamaz.
- **Kor Örsü eski sayılarla taşınır** (yükseltme olasılıkları, taş bedelleri); yalnız yuvalar ve görünüm yeni sete uyarlanır. Chibi ajanının set teslimini bekler.
- **Hedef ödülü hesap başına bir kez** (kullanıcı kararı).
- Karar verilemeyen: Midjourney bakiyesi (ödeme kullanıcıda).

## 5. Bilinen riskler

- **Yayın ortamı (2026-11-16, yayına almadan önce bakılacak):**
  - Meydandaki oyuncu yayını (`server/meydan_presence.js`) ve canlı kanalın öteki yayınları sunucu örneğinin belleğindedir. Birden çok örnek çalışırsa farklı örneklere düşen oyuncular birbirini görmez; tek örnekle ya da oturum yapışkanlığıyla çalıştırılmalı, ileride ortak bir yayın katmanı gerekir.
  - Sorun bildirimleri veri dizinindeki `sorunlar.jsonl` dosyasına yazılır; disk kalıcı değilse (Cloud Run) dosya örnekle birlikte gider. Bu yüzden her bildirimin özeti sunucu günlüğüne de düşer (`[sorun]`).
  - Kayıt yedeği ve kurtarma kodu Firestore'da `eo_saves`, `eo_recovery` koleksiyonlarını kullanır; yalnız emülatörde denendi, gerçek projede denenmedi.
  - Gizlilik ve kullanım koşulları sayfaları taslaktır: işletenin adı ve iletişim adresi yok, hukukçu görmedi.

- `gold.local` hâlâ açık: değiştirilmiş bir istemci altın bildirebilir (kullanıcı kararı: şimdilik hile koruması yok).
- İki kese: gösterge = yerel kese + sunucudaki arena payı. 2.1 bitene kadar geçici düzen.
- Yedek: çalışma GitHub'da `ejder-ocagi-2.0` dalında. `main`'e birleştirme ve yayına alma ayrı onay ister.
- Chibi çalışması (`prototype/chibi_rig`, 2 GB) hiçbir depoda değil; yalnız diskte ve yerel pakette (15 Kasım hâli).
- Disk: C: sürücüsünde yer dar; görsel üretim ve kayıt çıktıları hızla dolduruyor.
