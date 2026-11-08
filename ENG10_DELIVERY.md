# ENG-10 · İstemciyi sunucu ekonomisine bağlama, O-2/O-6/O-7, iflas (K5)

02 Engineering · 2026-11-08 · dal `claude/eng10-client-wiring` (taban `claude/eng06-pd-duel` @ `4d473e9`). Yerel commit; push, merge ve dağıtım yok.
Değişmeyenler: `server/economy_sources.js`, ödül tutarları (85/35/20), fiyatlar, olasılıklar, bilet parametreleri (yer tutucu), komisyon (0), D4 borç kuralları.

## Commit'ler
| # | SHA | Konu |
|---|---|---|
| 1 | `c9aa28e` | İstemci ↔ sunucu kesesi: `week.end`, bilet/borç göstergesi, ödüllü düello, `economyReady` |
| 2 | `3963f5f` | O-2 (20. hafta), O-6 (761–999 px üst şerit), O-7 (bayat Bedesten önizlemesi) |
| 3 | `1839829` | K5 iflas: hesap silinmez, `ocak.rebuild` |
| 4 | (bu belge) | Teslim belgesi + `js/duel_server.js` eski yorum düzeltmesi |

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

## 4. Testler (bu oturumda koşuldu, 2026-11-08, Windows, Node 24, msedge headless)
| Komut | Sonuç |
|---|---|
| `npm ci` | tamam |
| `npm test` | **130/130 geçti** (taban 116, +14 yeni: `eng10_economy_link` 8, `eng10_market_preview` 3, `eng10_rebuild` 2, `eng06_pc_week` +1; 20. hafta testi yeni davranışa göre yeniden yazıldı) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **13/13 geçti** (12 + 1 yeni; 20. hafta adımı yeni davranışa göre güncellendi) |
| `npx playwright test --config tests/playwright.config.js` (trade-ui, ocak-sandığı, layout ×2, eng10 ×4) | **8/8 geçti** |
| `ENG05_MULTI_SERVER=1` + emülatör + `npm run test:trade-ui` | **1/1 geçti** |

Yeni e2e (`npm run test:eng10`):
- **Hafta sonu:** Bağlı değilken eski akış çalışır. Bağlıyken yerel hafta hemen biter ve sunucu haftası ilerler. Bilet bitince yerel hafta bekletilir, mesaj net olur, Ahır açık kalır. Bilet & Borç ekranındaki düğmeler ≥ 44 px. `/api/economy` kesilince oyun eski akışa döner.
- **Ödüllü düello:** İki ayrı hesap gerçek WS ile oynar. Teslim sonrası iki tarafta da sunucudan gelen ödülsüz metin görünür, yerel altın değişmez.
- **Yerleşim:** 375/768/900/1000 px'te `scrollWidth = innerWidth`, HUD çakışması 0, bilet satırı görünür.
- **K5 arayüzü:** "Ocağı yeniden kur" düğmesi görünür (≥ 44 px), gerçek `ocak.rebuild` komutu gider, sunucu reddi gösterilir.

Ekran görüntüleri yalnız yerelde: `test-results/eng10/w*.png` (commit'e girmedi).

Koşulmayanlar: gerçek telefon, iOS Safari (WebKit), gerçek Cloud Run, yük testi. Ödülü ödenen (`paid`) ödüllü düello tarayıcıda uçtan uca koşulmadı. Bu yol sunucu testlerinde (`duel_settlement`, Firestore) ve birim metin testinde var. Bilet dolum zamanlayıcısı gerçek süreyle beklenmedi (hesap birim testli).

## 5. Kararlar (gerekçeli, onaya açık)
- **K-A Yerel hafta bilete bağlı:** Bağlıyken bilet kesin yoksa yerel hafta da bekletilir (kullanıcı talimatı: "yeni hafta bekletilir"). Bağlı değilken hiçbir kısıt yok. Belirsiz durumda (görünüm yok, sunucu hatası) yerel hafta engellenmez.
- **K-B Yerel ve sunucu haftası ayrı sayaçlardır.** Yerel `S.week` ile sunucu kesesinin haftası farklı olabilir. Ekranda "Sunucu haftası" ayrıca yazar. Birleştirme ENG06-04 kapsamında.
- **K-C Sunucu yıldızı otomatik seçilir** (O-2). İstenirse ileride `season.next {dragonAssetId}` komutu eklenebilir; bu, yeni komut ve onay ister.
- **K-D İflas eşiği 3 hafta** (istemcinin eski sayısı). Yeniden kurmanın bedeli yoktur (talimat: "varlık kaybı yok ya da en az"). Tek "bedel", eşiğe kadar takas ve harcamanın kapalı olmasıdır.
- **K-E Ödüllü düelloda yerel ödül yok.** Vitrin düellosu eskisi gibi yerel ödül verir.

## 6. Riskler
- `economyReady:true` artık her yanıtta dönüyor. Eski istemci bu alanı kullanmıyordu (grep).
- Sunucu ocağı kurulmuş oyuncuda yerel hafta artık bilete bağlıdır. Yer tutucu bilet değerleriyle (3 sa / 8 / 6) yavaşlık hissi oluşabilir (K6, D2c).
- Bekleyen belirsiz `week.end` yalnız bellekte tutulur. Sayfa yenilenirse yeni `requestId` ile istek gider. En kötü durumda bir bilet ilk istekle zaten harcanmıştır (çift hafta olmaz, yalnız sayaç kayar).
- Ödüllü odada `fighterFromDragon` sunucu ejderhasıyla çağrılır. Ekipman yerel envanterden çözülür (yalnız görsel, savaş değerleri sunucudan gelir).
- O-7 tazelemesi her satıcı komutunda en çok 20 ilan okur (Firestore'da ek okuma; yalnız ilanı olan hesapta).
- Codex ENG06-04-P1 ile ortak dosyalar: `server/economy_store.js`, `server/firestore_store.js` (`executeCommand` içine birkaç satır), `server/economy_commands.js`, `js/net.js`, `js/pazar.js`, `server.js`. Bu dala dokunulmadı.

## 7. Açık işler
- **A-1:** Sunucu ocağının otomatik kurulması (`game.start`) yapılmadı. Bugün Takas, Bedesten ya da Sandık açılınca kuruluyor. Herkes için açılış anında kurulsun mu? Ürün kararı gerekir.
- **A-2:** Bilet değerleri (D2c), Divan/dünya çarpanları (A-10) ve çok örnekli düello odaları (A-9) açık.
- **A-3:** Bekleyen hafta isteğinin `localStorage`'da kalıcı tutulması (Bedesten'deki gibi) sonraki dilim.
- **A-4:** Mobil dock'taki "Haftayı Bitir" yüksekliği 32–36 px (ENG-09'dan kalan). Bu dilimde değiştirilmedi. 768 px'te "Meydan" etiketi kesik (ENG-10 öncesinde de vardı).
