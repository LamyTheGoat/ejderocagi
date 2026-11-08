# ENG-10 · İstemciyi sunucu ekonomisine bağlama, O-2/O-6/O-7, iflas (K5)

02 Engineering · 2026-11-08 · dal `claude/eng10-client-wiring` (taban `claude/eng06-pd-duel` @ `4d473e9`). Yerel commit; push, merge ve dağıtım yok.
Değişmeyenler: `server/economy_sources.js`, ödül tutarları (85/35/20), fiyatlar, olasılıklar, bilet parametreleri (yer tutucu), komisyon (0), D4 borç kuralları.

## Commit'ler
| # | SHA | Konu |
|---|---|---|
| 1 | `c9aa28e` | İstemci ↔ sunucu kesesi: `week.end`, bilet/borç göstergesi, ödüllü düello, `economyReady` |
| 2 | `3963f5f` | O-2 (20. hafta), O-6 (761–999 px üst şerit), O-7 (bayat Bedesten önizlemesi) |
| 3 | `1839829` | K5 iflas: hesap silinmez, `ocak.rebuild` |
| 4 | `d724524` | Teslim belgesi + `js/duel_server.js` eski yorum düzeltmesi |
| 5 | `ef13409` | QA Y-1: ödüllü düello yalnız kayıtlı hesaplara (davet + kabul, iki taraf) |
| 6 | `938bebb` | QA O-1: ekonomi isteklerinde 12 sn zaman aşımı (belirsiz), `boot()` ≤ 5 sn |
| 7 | `b915d7d` | QA O-2: hafta kuyruğu; askıdaki komut önce, hafta kaybolmaz |
| 8 | `e386f6c` | QA O-3: askıdaki gövde ve hafta kuyruğu `localStorage`'da |
| 9 | `8054af2` | QA Y-2: `ocak.rebuild` sıklık sınırı (8 hafta) |
| 10 | `e0b9155` | QA (6): kayıtlı oturumda sunucu ocağını otomatik kur, mobil hafta düğmesi 44 px, ödüllü odada `rewardGold` yok |
| 11 | (bu güncelleme) | Belge: QA düzeltmeleri, yayın notu |

## 1. İstemci bağlantısı (O-1)

**İlke (kullanıcı):** oyun yavaşlamaz, yerel oynanış bozulmaz. Bakım, üretme, Topçu ve diğer yerel akışlar yerel `S` üzerinde aynen çalışır. Sunucu yalnız takas edilen ve kazanılan şeye (sunucu kesesi) bakar. Yeni kod yerel `S`'e altın ya da varlık yazmaz.

**Bağlı sayılma (`ECO_LINK.linked`):** oturum var + `/api/economy` okunabildi + sunucu `economyReady:true` + sunucu ocağı kurulmuş (`economy.game` var). Bunlardan biri yoksa (çevrimdışı, statik sunucu, oturum yok, ağ/5xx, sunucu ocağı kurulmamış) eski akış çalışır, hata kullanıcıyı kilitlemez. Sunucu ocağı otomatik kurulmaz. Takas, Bedesten ya da Sandık açılınca mevcut akışla kurulur (bkz. Açık işler A-1).

**Hafta sonu (`js/economy_link.js`, `js/ui.js`):**
- Bağlıyken "Haftayı Bitir" yerel haftayı **hemen** bitirir. Sunucu `week.end` arka planda gider, oyun sunucu yanıtını beklemez.
- Bilet **kesin** yoksa (önbellekteki görünüm 0 ve sonraki dolum zamanı gelmemiş) yalnız yeni hafta bekletilir. Düğme sönükleşir. Tıklanınca "Yeni hafta bekleniyor… sonraki bilet N dk içinde" mesajı çıkar. Ahır, eğitim, Topçu, Pazar ve diğer her şey açık kalır. Dolum zamanı gelince bilet görünümü kendiliğinden yenilenir.
- İdempotency: `economy_client` her komut için tek `requestId` kullanır. Ağ/5xx (belirsiz) yanıtta gövde saklanır. Sonraki hafta sonunda önce **aynı gövde aynen** gönderilir, sonra yeni istek gider. Bekleyen istek bir bilet sayılır. `version_conflict` (başka sekme) durumunda durum yenilenir ve bir kez yeniden istenir. 4xx kesin rettir, kısa Türkçe mesajla gösterilir.
- Gösterim: "Haftayı Bitir" düğmesinde kısa satır `🎟 4/8 · Borç 120` (mobilde de görünür, "yine de bitir" uyarısı önceliklidir). Ayrıntı ekranı "Bilet & Borç" şunları gösterir: sunucu haftası, bilet, sonraki bilet, borç, borçlu hafta sayısı ve gerekirse "Ocağı yeniden kur". Ekrana mobilde Menü → "Hafta Bileti & Borç" kartından, masaüstünde Çanta başlığındaki düğmeden ulaşılır. Tüm yeni dokunma hedefleri ≥ 44 px (e2e'de ölçüldü).
- Sunucu: `GET /api/economy` artık `economyReady:true` ve salt okunur `week {week, seasonNo, season, ticket{count,cap,nextAt}, debt, debtWeeks, rebuild{available,threshold}, serverNow}` döndürür. Dolum bir kopya üzerinde hesaplanır, kayıt değişmez (testli). `POST /api/session` → `economyReady:true`.

**Ödüllü düello (isteğe bağlı):** Sosyal → VS menüsünde, bağlıyken **🏆 Ödüllü Düello** düğmesi eski "🐉 Er Meydanı" (vitrin, dostça) düğmesinin yanında çıkar. **Vitrin düellosu kalıcıdır, kapatılmadı** (A-12 revize).
- Davet ve kabul, sunucu defterindeki ejderhanın `dragonAssetId`'sini taşır. Varsayılan ejderha sunucu yıldızıdır, uygun değilse ilk uygun ejderhadır. Sunucu yine `checkDuelEntry` ile denetler.
- Ödüllü davet etiketi ayrıdır ("🏆 Ödüllü Düello Daveti"). Kabul edenin uygun sunucu ejderhası yoksa davet açık kalır ve mesaj çıkar.
- Ödüllü odada savaşçı görseli sunucu defterinden gelir. `finishMpFight` yerel altın, ün, taş, bağ ya da yorgunluk **yazmaz**. Sonuç metni yalnız `duel_settlement` mesajından üretilir: "+85 altın kazanılmış…", borç mahsubu, `pending` → "Ödül işleniyor". Ödülsüz sonuçların nedeni de gösterilir: rakip limiti (`daily_pair_limit`), günlük limit (`daily_account_limit`), erken çekilme, çekilen taraf, süresi dolan maç. Tutarlar sunucuda (değişmedi).
- `net.js` `duel_settlement` mesajını iletir. ENG-09 D-1 kapatıldı: `market_update` yerel `S.gold`'a hiçbir koşulda yazmaz, açık Bedesten'i yalnız yeniler.

## 2. Küçük sorunlar
- **O-2 (20. hafta çıkmaz sokağı):** Son haftada `week.end` önce `endWeek`'i çalıştırır (istemcideki gibi `over/ending='sezon'`). Ardından aynı komutta `js/season.js` `seasonStart`'ın **veri kısmını** uygular: `seasonNo+1`, hafta 1, ünün yarısı taşınır, eski yıldız hocalığa çekilir (`old/retired/legend`, ekipmanı çıkarılır), bayraklar ve hikâye kayıtları season.js'teki gibi düzenlenir, pazar/arena/demirci yenilenir. **Varlık silinmez.** Tek bilet harcanır. Makbuzda `season{from,to,star,retired,carryUn}` alanı yer alır. Yıldız seçimi istemci etkileşimi olduğu için sunucu season.js'teki aday sırasının ilkini seçer (önce yıldızın yavruları, yoksa diğerleri, aday yoksa yıldızsız). Sunucuda olmayanlar: kariyer kurulumu, rakip ocak güçlenmesi, albüm.
- **O-6 (761–999 px üst şerit):** Yalnız CSS ve iki `aria-label`. 761–999 aralığında terbiyeci adı/kudret yazısı ve "−N/hf" notu gizlenir (avatar ve altın kalır, gider altının `title`'ında). 761–899 aralığında Çanta ve Sosyal yalnız simge olur (`aria-label` ve `title` korunur). 761–819 aralığında geçici "Kaydedildi" rozeti ve mevsim adı da gizlenir (mevsim hafta bloğunun `title`'ında). Ölçülen çakışma 761…1000 aralığında 0 (761, 768, 790, 800, 819, 820, 850, 899, 900, 990, 1000).
- **O-7 (bayat Bedesten önizlemesi):** Satıcının ilanlı varlığını değiştiren her komut (`week.end`, kuluçka vb.) aynı transaction'da ilan önizlemesini ve "şu an alınamaz" nedenini (`unavailable`) tazeler, `stateVersion` +1 olur. Değişiklik yoksa yazma yapılmaz. Bedesten kartı nedeni gösterir ve "Satın Al"ı kapatır. Alım isteğe bağlı olarak `stateVersion`'ı bağlar, ilan o arada değiştiyse `listing_changed` döner. İstemci bunu gönderir, eski gövde şekli de çalışır. Komut ilanı tazelediyse okuma önbelleği bırakılır ve `market_update` yayınlanır.

## 3. İflas (K5)
- Eşik: borç **art arda 3 hafta** (`debtWeeks ≥ 3`). Bu, istemcideki eski "3 hafta eksi → iflas" sayısıdır, yeni eşik icat edilmedi.
- `ocak.rebuild` (argümansız, makbuzlu, idempotent): borç ve `debtWeeks` sıfırlanır, `rebuilds` sayacı artar. **Hesap silinmez, oyun bitmez.** Ejderha, yumurta, eşya, yem, kaynak kovaları ve binalar olduğu gibi kalır. Yeni altın üretilmez, bakiye 0 kalır. Eşik altında ya da borçsuz istek `rebuild_unavailable` (409) alır.
- D4 değişmedi: gider yine borç yazar, mahsup ve harcama/takas kapısı aynı. Sonraki eşikte yeniden kurulabilir.

## 4. Testler (QA düzeltmelerinden sonra yeniden koşuldu, 2026-11-08, Windows, Node 24, msedge headless)
| Komut | Sonuç |
|---|---|
| `npm test` | **136/136 geçti** (taban 116; ENG-10 ilk teslim 130; QA düzeltmeleri +6) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **13/13 geçti** |
| `npm run test:trade-ui` | **1/1** |
| `npm run test:layout` | **2/2** |
| `npm run test:eng10` | **5/5** |
| `npm run test:ocak-sandigi` | **1/1** |
| `ENG05_MULTI_SERVER=1` + emülatör + `npm run test:trade-ui` (iki sunucu) | **1/1** |

Yeni e2e (`npm run test:eng10`):
- **Hafta sonu:** Bağlı değilken eski akış çalışır. Bağlıyken yerel hafta hemen biter ve sunucu haftası ilerler. Bilet bitince yerel hafta bekletilir, mesaj net olur, Ahır açık kalır. Bilet & Borç düğmeleri ≥ 44 px. `/api/economy` kesilince oyun eski akışa döner.
- **Ödüllü düello:** İki kayıtlı hesap gerçek WS ile oynar. Misafir hem istemcide hem sunucuda "hesap aç" mesajı alır. Teslim sonrası sunucudan gelen ödülsüz metin görünür, yerel altın değişmez.
- **Yerleşim:** 375/768/900/1000 px'te taşma yok, HUD çakışması yok, bilet satırı görünür, "Haftayı Bitir" ≥ 44 px ve ekranın içinde.
- **K5 arayüzü:** Yeniden kurma düğmesi görünür ve gerçek komut sunucuya gider.
- **Otomatik kurulum:** Kayıtlı oturumda sunucu ocağı tek bir `game.start` ile kurulur, yerel durum değişmez. Misafirde kurulmaz.

Birim (ek): zaman aşımı → belirsiz askı ve aynı gövde; `boot` sınırı; askıda başka komut varken hafta kuyruğu; depo kalıcılığı ve depo hatası; `autoStart`; Y-1 sunucu (davet, kabul, vitrin açık); Y-2 bekleme (sezon devri dahil).

Ekran görüntüleri yalnız yerelde: `test-results/eng10/w*.png` (commit'e girmedi).

Koşulmayanlar: gerçek telefon, iOS Safari (WebKit), gerçek Cloud Run, yük testi, gerçek X OAuth. Kayıtlı hesap testleri yerel X simülasyon girişiyle yapıldı. Ödülü ödenen (`paid`) ödüllü düello tarayıcıda uçtan uca koşulmadı; bu yol sunucu testlerinde var. 12 sn zaman aşımı ve bilet dolumu gerçek süreyle beklenmedi; kısa sürelerle birim testi yapıldı.

## 4b. QA düzeltmeleri (bağımsız QA sonrası)
- **Y-1 (K9):** Ödüllü düelloya yalnız kayıtlı hesaplar girer. Sunucu davet ve kabulde iki tarafı da denetler. **Kayıtlı**, WS bağlantısında geçerli ve imzalı X oturumu (`eo_sess`, `server.js getSessionHandle` → `playerInfo.xVerified`) demektir. Kodda ayrı bir "kayıtlı hesap" kaydı yok, bu en küçük güvenli ayrımdır. Misafire "Ödüllü düello için hesap aç (X ile giriş yap)" mesajı gider. Vitrin düellosu misafire açık. **Kalan risk:** X oturumu ekonomi hesabına kalıcı olarak bağlanmıyor. Aynı X hesabı farklı tarayıcılarda farklı misafir hesaplarıyla kullanılabilir, Sybil maliyeti bir X hesabıdır. Kalıcı bağlama ayrı iş (açık iş A-5).
- **O-1:** Her ekonomi isteği (`GET /api/economy`, komut) en çok 12 sn bekler ve `AbortController` ile iptal edilir. Zaman aşımı belirsiz sayılır: askıdaki komut aynı `requestId` ile korunur ve yeniden denenir. `ECO_LINK.boot()` en geç 5 sn'de döner, iş arka planda sürer.
- **O-2:** Bağlı her yerel hafta sonu kuyruğa girer. Kuyruk boşaltılırken önce askıdaki her komut (hafta ya da başka) aynı gövdeyle yeniden denenir, sonra haftalar gönderilir. `command_pending_retry_required` haftayı kaybettirmez. Kuyruktaki haftalar bilet sayısından düşülür.
- **O-3:** Askıdaki komut gövdesi (`requestId` dahil) `localStorage['eo-economy-pending:<hesap>']`, gönderilmemiş hafta sayısı `localStorage['eo-week-queue:<hesap>']` içinde saklanır. Gövde göndermeden önce yazılır. Sayfa yenilenince açılışta aynı gövde aynen gönderilir. Depo yoksa ya da hata verirse yalnız bellek kullanılır.
- **Y-2:** `ocak.rebuild` sonrası en az **8 sunucu haftası** geçmeden tekrar yapılamaz (`rebuild_cooldown`, 409). Sayaç sezonlar arası tekdüzedir (`(seasonNo−1)·20 + week`, `lastRebuildWeek`). Varsayılan 8, sunucuda `EO_REBUILD_COOLDOWN_WEEKS` (0–1000) ile ayarlanabilir; geçersiz değer açılışta hata verir. Varlık bedeli yok. Ekran kalan haftayı söyler.
- **(6) Otomatik kurulum:** Kayıtlı oturumda sunucu ocağı yoksa arka planda bir kez `game.start` gönderilir. Hata olursa sessizce eski akış sürer, oyun beklemez. **Yorum (onaya açık):** "mevcut yerel durumu aynen taşır" ifadesini "yerel `S` aynen kalır, hiç değişmez" diye uyguladım. Yerel durum sunucuya **taşınmadı**, çünkü bu istemci verisine güvenmek olur (değişmez kural). Sunucu ocağı başlangıç varlıklarıyla (bound) açılır.
- **(6) Diğer:** Mobil "Haftayı Bitir" ≥ 44 px ve ekran içinde. Ödüllü odada istemci tarafı ödül tutarı (`rewardGold`) yok.

## 4c. Yayın notu (K4 / ENG-09 Y-3)
- **`SESSION_SECRET` üretimde ZORUNLU tanımlanmalı.** `server/session_secret.js` üretimde (`NODE_ENV=production` ya da Cloud Run `K_SERVICE`) tanımsız sırla açılışı reddeder. Test ortamında geçici rastgele sır kullanılır ve uyarı basılır. Çok örnekli Cloud Run'da tüm örnekler aynı sırrı kullanmalı. Aksi halde X oturum çerezleri (`eo_sess`) örnekler arasında ve yeniden başlatmada geçersiz olur. Bu durumda Y-1 gereği ödüllü düello da kapanır, çünkü kayıtlı oturum X çerezine bağlı.
- `render.yaml`'a dokunulmadı (K4).

## 5. Kararlar (gerekçeli, onaya açık)
- **K-A Yerel hafta bilete bağlı:** Bağlıyken bilet kesin yoksa yerel hafta da bekletilir (kullanıcı talimatı: "yeni hafta bekletilir"). Bağlı değilken hiçbir kısıt yok. Belirsiz durumda (görünüm yok, sunucu hatası) yerel hafta engellenmez.
- **K-B Yerel ve sunucu haftası ayrı sayaçlardır.** Yerel `S.week` ile sunucu kesesinin haftası farklı olabilir. Ekranda "Sunucu haftası" ayrıca yazar. Birleştirme ENG06-04 kapsamında.
- **K-C Sunucu yıldızı otomatik seçilir** (O-2). İstenirse ileride `season.next {dragonAssetId}` komutu eklenebilir; bu, yeni komut ve onay ister.
- **K-D İflas eşiği 3 hafta** (istemcinin eski sayısı). Yeniden kurmanın bedeli yoktur (talimat: "varlık kaybı yok ya da en az"). Tek "bedel", eşiğe kadar takas ve harcamanın kapalı olmasıdır.
- **K-E Ödüllü düelloda yerel ödül yok.** Vitrin düellosu eskisi gibi yerel ödül verir.

## 6. Riskler
- `economyReady:true` artık her yanıtta dönüyor. Eski istemci bu alanı kullanmıyordu (grep).
- Sunucu ocağı kurulmuş oyuncuda yerel hafta artık bilete bağlıdır. Yer tutucu bilet değerleriyle (3 sa / 8 / 6) yavaşlık hissi oluşabilir (K6, D2c).
- Bekleyen belirsiz `week.end` artık `localStorage`'da (QA O-3). Gizli sekmede ya da depo engellendiğinde yine yalnız bellek kullanılır; o durumda yenilemede eski risk sürer.
- Ödüllü düellonun "kayıtlı hesap" tanımı X oturumuna dayanır, ekonomi hesabına kalıcı bağlanmaz (bkz. §4b Y-1).
- Ödüllü odada `fighterFromDragon` sunucu ejderhasıyla çağrılır. Ekipman yerel envanterden çözülür (yalnız görsel, savaş değerleri sunucudan gelir).
- O-7 tazelemesi her satıcı komutunda en çok 20 ilan okur (Firestore'da ek okuma; yalnız ilanı olan hesapta).
- Codex ENG06-04-P1 ile ortak dosyalar: `server/economy_store.js`, `server/firestore_store.js` (`executeCommand` içine birkaç satır), `server/economy_commands.js`, `js/net.js`, `js/pazar.js`, `server.js`. Bu dala dokunulmadı.

## 7. Açık işler
- **A-1:** Sunucu ocağı kayıtlı oturumda artık otomatik kuruluyor (QA 6). Misafirde hâlâ Takas, Bedesten ya da Sandık açılınca kuruluyor. Misafir için de otomatik kurulsun mu? Ürün kararı gerekir.
- **A-2:** Bilet değerleri (D2c), Divan/dünya çarpanları (A-10) ve çok örnekli düello odaları (A-9) açık.
- **A-3:** Bekleyen hafta isteğinin kalıcı tutulması QA O-3 ile yapıldı.
- **A-5:** X kimliğinin ekonomi hesabına kalıcı bağlanması (Y-1 Sybil sertleştirmesi).
- **A-4:** Mobil "Haftayı Bitir" artık ≥ 44 px (QA 6). Dock'taki diğer yer düğmeleri hâlâ 32 px. 768 px'te "Meydan" etiketi kesik (ENG-10 öncesinde de vardı). İkisi de bu dilimde değiştirilmedi.
