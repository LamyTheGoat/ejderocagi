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
| Hedef ödülleri sunucuda (`goal.reach`, hesap başına bir kez) | bitti | Koşul yerel oyunda gerçekleşir (istemci beyanı). Aynı hesapta yeniden kurulan ocakta alınmış ödül yeniden yazılmaz. Kariyer hedefleri hâlâ yerelde |
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
- Meydanda öteki oyuncuların görünmesi (konum, set, ejder, jest): sunucuda presence var, 2.0'a bağlı değil.
- Sohbet: açılmadan önce küfür süzgeci, engelle, şikâyet, hız sınırı şart. O zamana kadar kutu günlük olarak duruyor.
- Arkadaş listesi, fısıltı, parti penceresi, profil inceleme.
- Oyuncular arası Kıraathane masası ve takas (bağlantı noktaları hazır: `EO2.kiraathane.baglan`, `server/trade_service.js`).

## 3. Çıkıştan önce şart olan küçük ve orta işler

1. **İlk yük:** açılışta 500'den fazla istek, 70'ten fazla ayrı betik, sıkıştırma yok. Betikleri tek pakete topla, bölüm çizimlerini
   girilince yükle, sunucuda gzip/brotli ve uzun önbellek başlığı. Yükleme perdesine ilerleme çubuğu.
2. **Kayıt yedeği:** kayıt yalnız tarayıcıda. Misafir hesabına sunucu yedeği (2.1 ile birlikte çözülür); o zamana kadar dışa/içe aktarma.
3. **Ürün kimliği:** paylaşım görseli (og:image), sürüm numarası, künye, gizlilik ve kullanım koşulları sayfası, yazı tiplerinin kendi
   sunucudan verilmesi.
4. **Telefon:** yatay yön önerisi, tam ekran, uzun basma menüsünün kapatılması; gerçek telefonda ve iOS Safari'de deneme (hiç yapılmadı).
5. **Sorun bildir:** oyuncu için düğme, bizim için sunucuya düşen hata günlüğü (`EO2.hatalar` hazır).
6. **Denetim betikleri:** `check_oyun.mjs` ve `check_uc.mjs` yeni akışa (master açılış, ad sorma, yeni Kıraathane) uyarlanmalı; her
   commit'ten önce koşan tek bir "duman testi" olmalı.

## 4. Cila isteyen görsel eksikler (gözle görülen)

- Kervan Tavlası tahtası düz kahverengi dikdörtgen; öteki masaların dokusuyla aynı ayarda değil.
- Midjourney bakiyesi bitti. Bekleyen çizimler: Ocak için bostan, odunluk, yalak, korkuluk, ahşap çit, kapı direği, çim dokusu; Kıraathane için masa sahnesi ve tavla tahtası; Topçu sahnesinin büyütülmüş hâli (şimdiki 1536 piksel).
- Motor istekleri (Ocak ajanından): zemin kabartması çime uygulanmasın, mini haritada açılabilir kare katmanı, pano açıkken kamera kayması, zemin lekeleri için tek doku atlası (çizim çağrısı 296'dan yüzün altına iner).
- Tam tur denetiminde ara sıra (2026-11-16: altı koşuda bir) sunucudan bir 400 yanıtı düşüyor ve o koşuda tur sonu altını düşük çıkıyor; nedeni bulunamadı. `check_oyun.mjs` artık yanıtın yolunu, komut türünü ve hata kodunu yazıyor.
- Eski "ocak" ızgara ekranı (`ekranlar.js`) kodda duruyor; erişilmiyor, silinmeli.
- Bildirimler ekranlarda sol altta; Kıraathane'de oyuncu panelinin üstüne biniyor.
- Mini harita: master'daki gibi çizilmiş harita, pusula ve yakınlaştırma yok.
- Simge ailesi: Ahır'daki antrenman taşları ve Pazar portreleri madalyon ailesinde değil.
- Arena dövüşünde terbiyeciler sahnede yok (eski oyunda vardı); durum rozetleri ve efektler sade.
- Mavi-altın hat: ekranlar ayrı ayrı iyi, ama pencere çerçevesi, düğme ve sekme ölçüleri tek bir bileşen dosyasında toplanmadı
  (`cam.css` 1200 satır, üstüne altı ek dosya). Öneri: çıkıştan önce bir "bileşen sayfası" (düğme, sekme, pano, rozet, pencere)
  çıkarıp sapmaları tek geçişte gidermek.

## 5. Bilinen riskler

- `gold.local` hâlâ açık: değiştirilmiş bir istemci altın bildirebilir (kullanıcı kararı: şimdilik hile koruması yok).
- İki kese: gösterge = yerel kese + sunucudaki arena payı. 2.1 bitene kadar geçici düzen.
- Yedek: çalışma GitHub'da `ejder-ocagi-2.0` dalında. `main`'e birleştirme ve yayına alma ayrı onay ister.
- Chibi çalışması (`prototype/chibi_rig`, 2 GB) hiçbir depoda değil; yalnız diskte ve yerel pakette (15 Kasım hâli).
- Disk: C: sürücüsünde yer dar; görsel üretim ve kayıt çıktıları hızla dolduruyor.
