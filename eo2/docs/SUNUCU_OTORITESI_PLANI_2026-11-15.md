# Sunucu otoritesi planı · kalan yerel altın akışları (2.0)

> 2026-11-15 · yalnız plan, uygulama yok. Her adım ayrı onay ister.
> Temel alınan belgeler: `ENG06_04_PLAN.md` (P-A…P-G), `MULTIPLAYER_MIGRATION_ROADMAP.md` (F5 alt dilimleri 5a–5h), `ENG13_DELIVERY.md` (tek kese), `server/week_runtime.js` (`week.end`). Bu belge onların sırasını değiştirmez; 2.0'ın bugünkü durumuna göre hangi dilimin ne getirdiğini yazar. Çelişki görülürse o belgeler geçerlidir.

## 1. Bugünkü durum

| Akış | Durum |
|---|---|
| Arena kademe, turnuva, Gök Kulesi, bahis ödemesi, şampiyon maçı, "Çukurun Efsanesi" +100, çukur teslim cezası | **Sunucuda** (`arena.open` / `arena.settle` / `arena.story`, `server/arena_service.js`) |
| Er Meydanı (dostça düello) | Sunucuda çözülür, ödül yok |
| Kalan her şey (aşağıdaki tablo) | Yerel `S.gold` |

Gösterge = yerel kese + sunucudaki arena payı (`S.ag`). `gold.local` sunucuda hâlâ açık (eski oyunun tek kesesi kullanıyor); 2.0 onu yalnız eksi tutarla (sunucu payından harcama) gönderir.

## 2. Asıl engel: iki ayrı oyun durumu

Sunucunun doğrulayabildiği şey, **kendi bildiği** durumdur. 2.0'da ejderhalar, hafta, ün, binalar, yem, sipariş panosu ve pazar tezgâhı yerel kayıttadır; sunucunun `game.start` ile kurduğu ocak 2.0'da ilerlemez. Bu yüzden akışlar üç sınıfa ayrılır:

| Sınıf | Anlamı | Örnek |
|---|---|---|
| **A · Kendi içinde doğrulanır** | Sonuç yalnız girdiler + tohumdan çıkar; sunucu aynı kural koduyla yeniden oynatır ya da zarı kendisi atar. Yerel durumdan yalnız "iddia edilen girdi" alınır, aralığı denetlenir (arenada yapılan). | Arena, kule, yarış, kıraathane, müzayede salonu |
| **B · Sunucu durumuna bağlı** | Doğrulama için ejderhanın, haftanın, binanın, stokun sunucu defterinde olması gerekir. Defter 2.0'a bağlanmadan yapılacak her denetim göstermeliktir. | Hafta sonu, hedefler, pazar, sipariş, saray, teklif satışı |
| **C · Olay zinciri** | Ödül bir hikâye/olay seçiminden gelir; sunucu olayın yaşandığını ancak olayı **kendisi üretirse** bilir. | `content.js` olayları, sefer, kervan, köy olayları |

ROADMAP'teki karşılığı: A = 5d (V2: girdi + tohumla yeniden oynatma), B = 5a/5b/5c + 5h, C = 5a'daki "olay verildi kaydı" (B-13) genişletmesi.

## 3. Akış akış: sunucu neyi nasıl doğrular

İş büyüklüğü: K = 1–2 gün, O = 3–5 gün, B = 1–2 hafta (test ve tarayıcı doğrulaması dahil, kabaca).

| # | Akış (yerel yer) | Sınıf | Sunucunun yapacağı | Ön koşul | İş |
|---|---|---|---|---|---|
| 1 | **Yarış** (`js/race.js:596` ödül, giriş ücreti; `eo2/js/yaris.js`) | A | **Yeniden oynatma.** `race.open` tohum ve ücreti verir; istemci girdi dizisini (kanat/dalış zamanları) kaydeder; `race.settle` aynı sabit adımlı simülasyonu oynatıp sırayı ve `race.odul[rank-1]` tutarını yazar. Otomatik uçuş önce (girdi yok, yalnız tohum), elle uçuş sonra. | `race.js` simülasyonunun DOM'suz, sabit adımlı çekirdeğe ayrılması (ENG06_04 P-E'nin ön koşulu). 2.0'ın 2.5D yarışı (`yaris25.js`) aynı çekirdeği kullanmalı. | B |
| 2 | **Kıraathane bahsi** (`js/kiraathane.js:69`) | A | **Sunucuda zar.** `kiraathane.bet {oyun, tutar}`: bahis sunucu payından düşer, sonuç tohumlu RNG ile sunucuda atılır, kazanç `earned`. Mevcut oran ve tutar tablosu aynen. | Bahis tutarı sunucu kesesinden ödenebilmeli (bkz. §4 kese birleşmesi); yoksa yalnız kazanç tarafı taşınır. | K |
| 3 | **Müzayede** (`js/auction.js:118`, `eo2/js/muzayede.js`) | A + B | Salon zaten sunucuda oynatılabiliyor (`auction.sell`, `aucSimServer`: tohumlu teklifçiler). Eksik olan satılan ejderhanın **sunucu defterinde** olması: fiyat `value(d)`'den çıkar. Alım tarafı (başkasının ejderhasına teklif) için `auction.bid` + sunucuda üretilen lot. | Ejderha defteri (adım D). Defter yokken yalnız "iddia edilen ejderha + aralık" ile yapılabilir; bu arenadaki sınırla aynıdır ve satışta daha pahalıya patlar (fiyat doğrudan iddiadan çıkar). **Defterden önce önerilmez.** | O |
| 4 | **Sipariş** (`js/orders.js:101`, `eo2/js/siparis.js`) | B + C | `order.deliver` var (gen şartı sunucu ejderhasında, altın `orderGen` formülüyle). Eksikler: sipariş panosunun sunucuda üretilmesi (B-13: "olay verildi" kaydı) ve teslim edilen ejderhanın defterde olması. | Ejderha defteri + hafta sunucuda (pano haftalık yenilenir). | O |
| 5 | **Locadan teklif satışı** (`js/fightev.js:142`) | B | `offer.sell` var (value × 1.4). Teklif hakkı artık sunucuda üretilebilir: `arena.settle` zaferinde, oyunun kendi olasılığıyla (`pickFightPost`, %45 ve koşullar) sunucu zar atar ve `S.arenaHak.teklif = {assetId, price}` yazar. Fiyat için ejderha defterde olmalı. | Ejderha defteri. | K (defterden sonra) |
| 6 | **Pazar** (`js/pazar.js:312,321`, `eo2/js/pazar.js:24,38`: satış gelirleri; alımlar gider) | B | Komutlar hazır: `shop.*`, `dragon.sell`, `item.sell` (sunucu tezgâhı, sunucu fiyatı). 2.0 tezgâhı sunucudan okumalı (`refreshMarket` sunucu haftasında). | Hafta sunucuda + defter. ENG06_04 P-B. | O |
| 7 | **Hafta sonu geliri ve bakımı** (`js/week.js endWeek`: bakım, rol geliri, yumurta) | B | `week.end` hazır (`server/week_runtime.js`: `endWeek` VM'de aynen çalışır, her altın değişimi kovaya işlenir, borç D4). 2.0 "Haftayı Bitir" bu komutu çağırır, yerel haftayı sunucu sonucuyla eşitler. | **Kilit adım:** sunucu ocağı = oyuncunun gerçek ocağı olmalı (ejderha, bina, yem). Bu olmadan `week.end` başka bir ocağın bakımını keser. ENG06_04 P-C. | B |
| 8 | **Hedef ödülleri** (`js/week.js:283 checkGoals`, kariyer `js/career.js:97`) | B | `goal.reach` / `goals.claim` hazır; sunucu her komuttan sonra kendi durumuyla `checkGoals` çalıştırıyor (ödül `goalSource` ile bound). 2.0'da yerel ödül yazımı kapatılır, sunucununki gösterilir. Kariyer hedefleri (`goalGold`) için `career.js`'in VM'e yüklenmesi gerekir. | Koşulların sunucu durumunda doğru olması = adım 7 ve defter. Erken yapılırsa (ROADMAP 5a) koşul doğrulanamaz; yalnız "bir kez" garantisi gelir. | K (7'den sonra) |
| 9 | **Saray / güzellik podyumu** (`js/pageant.js:533,580`, `eo2/js/saray.js:23`) | A + B | Gösteri puanı ejderhanın görünüş genlerinden ve süslerinden hesaplanır: **yeniden hesaplama** (tohumlu jüri zarı sunucuda). Haftalık oy ve telif (`royalty`) için dönem kaydı. | Ejderha + süs defteri; hafta sunucuda. ENG06_04 P-F. | O |
| 10 | **Sefer ve kervan** (`js/hub.js` 14 yer, `eo2/js/sefer.js:40`, `diyar.js`) | C (+A) | Sefer sonucu tohumlu zardır: `sefer.start {assetId, bölge}` sunucuda zarı atar, dönüş haftasında `week.end` öder. Kervan baskını/eskortu oyuncular arasıdır: `WORLD.caravans` depoya taşınmalı (ROADMAP F2), ödül `settleGameplay` ile. Dünya patronu aynı. | F2 (dünya durumu depoda), hafta sunucuda. | B |
| 11 | **Olaylar** (`js/content.js` 13 yer, `fightev.js`, `arenastory.js`, `social.js`, `lineage.js`, `star.js:69`, `comic.js`) | C | **Olayı sunucu üretir.** Hafta sonunda `week.end` hangi olayın çıktığını tohumla seçer ve `S.olayHak[id]` yazar; istemci seçimini `event.choose {id, secenek}` ile yollar; sunucu o seçeneğin `fx`'ini VM'de çalıştırır. `content.js` zaten `weekRules` içinde yükleniyor; `fx` gövdelerinin DOM'suz olduğu tek tek doğrulanmalı. Arenadaki `arena.story` bunun küçük örneğidir. | Hafta sunucuda (adım 7). | B |
| 12 | **Giderler** (bina, arazi, yem, eşya, süs, Kor Örsü; `eo2/js/ocak25.js:162`, `sus.js`, `han.js`, `kutuk.js`) | B | Komutlar büyük ölçüde hazır (`building.buy`, `land.clear`, `shop.food`, `chibi.*`). Gider istemcinin kendi altınını azalttığı için istismar değeri düşük; son sıraya kalabilir. Süs ve han harcamaları için yeni dar komutlar. | Kese birleşmesi. | O |

## 4. Bağımlılık sırası

```
(bitti) Arena + kule + hikâye hakkı
   │
   ├─ S1  Kıraathane (sunucuda zar)                         [A, K]   bağımsız
   ├─ S2  Yarış: çekirdeği ayır → otomatik → elle           [A, B]   bağımsız (ROADMAP 5d, P-E)
   │
   D  Defter bağlama: 2.0'ın ocağı = sunucu ocağı           [B]      ← her B ve C akışının ön koşulu
   │     (ejderha, yumurta, bina, yem, ün; yerel kayıt önbellek olur; ROADMAP 5h, ENG06_04 "yerel/sunucu geçişi" kararı)
   │
   ├─ S3  Hafta sonu: week.end 2.0'a bağlanır               [B]      (P-C)
   │     ├─ S4  Hedefler ve kariyer                          [K]
   │     ├─ S5  Pazar tezgâhı + NPC alım/satım               [O]      (P-B)
   │     ├─ S6  Sipariş panosu + teslim, teklif satışı       [O]
   │     ├─ S7  Müzayede (satış ve alım)                     [O]
   │     ├─ S8  Olaylar: sunucu üretir, seçim komutu         [B]
   │     └─ S9  Saray                                        [O]      (P-F)
   ├─ S10 Sefer, kervan, dünya patronu                       [B]      (F2 gerekir)
   └─ S11 Giderler + kese birleşmesi; gold.local kapanır     [O]      (ROADMAP 5g)
```

S1 ve S2 bugün başlatılabilir (arena ile aynı kalıp: iddia edilen girdi + tohum + yeniden oynatma/zar). **D adımı en büyük ve en riskli iştir** ve kullanıcı kararı ister: yerel kayıt sunucuya nasıl taşınacak (ENG06_04 §9 "yerel geçmişin taşınması: otomatik earned aktarım yok" ve ENG-13'ün `gold.import` 2000 tavanı bugünkü kurallardır; 2.0 oyuncusunun birikmiş yerel ocağı için ayrı bir geçiş kararı gerekir).

D adımı için iki yol var; seçim kullanıcıya aittir:
- **D-a · Sunucu ocağı esas, yerel ocak sıfırlanır:** yeni sezonla birlikte herkes sunucu ocağından başlar. En temiz; birikmiş yerel ilerleme kaybolur.
- **D-b · Tek seferlik içe aktarma:** yerel ejderhalar ve binalar sunucuya bir kez, `bound` (takas edilemez) olarak alınır (D15 ile uyumlu), altın `gold.import` kuralıyla. İstemci beyanına bir kez güvenilir; sonrası sunucuda. ENG-13'ün `economy_sync.js` eşleme mantığı (assetId, `reconcile`) yeniden kullanılır.

## 5. `gold.local` ne zaman kapanır

| Aşama | `gold.local` |
|---|---|
| Bugün | Artı tutar: eski oyunun kayıtlı hesapları kullanıyor, 2.0 hiç göndermiyor. Eksi tutar: 2.0 sunucu payından harcama için kullanıyor. |
| S1–S2 sonrası | Değişmez. |
| D + S3 sonrası | **Artı tutar 2.0 hesapları için kapatılabilir** (komuta `kaynak: 'eo2'` ayrımı ya da hesap bayrağı): 2.0'da altın artıran bütün yollar ya sunucu komutu olmuştur ya da henüz taşınmamış ve yerel kesede duruyordur. |
| S4–S10 bittiğinde | Yerel kesede altın üreten akış kalmaz. Yerel kese dondurulur (yalnız harcanır) ya da D-b kuralıyla bir kez aktarılır. |
| S11 (kese birleşmesi, ROADMAP 5g) | **`gold.local` tümüyle kapanır** (artı ve eksi). Eski oyun (`/oyun/`) o tarihte ya kapatılır ya da aynı komutlara bağlanır; aksi hâlde eski istemci tek kesesini kaybeder. Bu, eski oyunun kaderi hakkında ayrı bir karardır. |

Kısa yol istenirse: `gold.local` artı tutarı **yalnız 2.0'dan gelen oturumlar için** bugün de kapatılabilir (2.0 göndermediği için oyuncu fark etmez); ama aynı çerezle `/oyun/` altındaki eski istemci de aynı hesabı kullandığından ayırt etmek için istemci sürüm başlığı (ROADMAP F4 `X-EO-Proto`) gerekir.

## 6. Her adımda korunacaklar

- Ödül, fiyat, olasılık değişmez; kural kodu sunucu VM'inde **aynen** çalışır (`economy_commands.js` `load` kalıbı), tablo kopyalanacaksa kaynak satırı yorumda yazılır.
- `economy_sources.js` politikası ve harcama sırası (bound → unknown → earned) değişmez. Sunucunun hesapladığı tekrarlanabilir oynanış geliri `earned`, hedef ve içe aktarma `bound`, ejderha çıkışı ejderhanın kaynağı (Y-1).
- İstemci tutar, kazanan ya da zar sonucu göndermez; şemada böyle alan olmaz (`validateCommand` sabit şema).
- Çevrimdışı: oyun oynanır, sunucuya bağlı ödül yazılmaz, ekranda söylenir (arena ile aynı karar).
- Hile koruması kararı (2026-11-09) yürürlükte: tavan ve sıra zorlaması eklenmez. Arenadaki açık sınırlar (oyuncunun kendi savaşçı değerleri, hafta, kule katı, Divan fermanı yerelden gelir) D adımıyla kendiliğinden kapanır.
- Her adım: birim testi (sahte istek reddi, tek ödeme, yeniden oynatma eşitliği) + tarayıcıda uçtan uca + Firestore emülatörü.

## 7. Açık kararlar (kullanıcı)

1. D-a mı D-b mi (yerel ocağın sunucuya geçişi).
2. Eski oyun (`/oyun/`) S11'de kapatılacak mı.
3. Misafir hesabı çereze bağlı: sunucudaki altın çerezle birlikte gidebilir. X ile bağlama (ROADMAP F4) S3'ten önce mi gelsin.
4. Divan fermanı çarpanları (gladyatör ×1.35 kulede bugün iddiaya dayanıyor): Divan oylaması sunucuya ne zaman taşınsın (ENG06_PD A-10).
