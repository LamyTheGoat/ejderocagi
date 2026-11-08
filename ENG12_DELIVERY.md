# ENG-12 · Bilet sisteminin kaldırılması ve kayıtlı hesapta sunucu ekonomisi

02 Engineering · 2026-11-08 · dal `claude/eng12-server-sync` (taban yerel `main` @ `7e22956`). Yerel commit; push, merge ve dağıtım yok.

Değişmeyenler:
- `server/economy_sources.js` (kaynak politikası)
- fiyatlar, ödüller (85/35/20), olasılıklar, komisyon
- D4 borç kuralları
- `ocak.rebuild` eşiği (3 borçlu hafta)
- sunucu komut şeması: yeni komut ya da argüman yok

Bağımsız QA ilk teslimi "bu haliyle birleştirilmesin" diye işaretledi. Ürün kararlarını 00 verdi ve D–G commit'leri bu kararları uygular (§3a).

## Commit'ler
| # | SHA | Konu |
|---|---|---|
| A | `d407a0a` | Hafta biletini kaldır (sunucu + istemci + testler) |
| B | `4229720` | Kayıtlı hesapta NPC tezgâhı ekonomisi sunucuda (`js/economy_sync.js`) |
| C | `7198534` | Ek e2e (bina, kuluçka, satış) ve ilk belge |
| — | `028b53d` | Belgeye SHA |
| D | `379f335` | QA YÜKSEK-1: iki kese (yerel altın + Ocak Kesesi), bilinen-varlık izi |
| E | `a610133` | QA YÜKSEK-2: bağlı ejderha müzayede, sipariş ve arena teklifiyle verilemez |
| F | `7334049` | QA ORTA-1: `ocak.rebuild` için 8 sunucu haftası VE 24 saat |
| G | `aa532d8` | QA e2e: iki kese, kayıt öncesi altın, bağlı ejderha çıkışları, ölüm |
| H | (bu commit) | Belge güncellemesi |

## 1. Bilet sisteminin kaldırılması (Görev 1)

**Gerekçe.** Hafta bileti (D2), hızlı hafta çevirerek kazanç çiftliği kurulmasını engellemek için konmuştu. Bugün sunucuda tek kazanılmış (earned) altın kaynağı, günlük sınırlı ödüllü düellodur. Hafta çevirmek altın üretmez; tersine bakım gideri çıkarır ve haftalık gelir `unknown` sınıfında olduğu için takas edilemez. Yani bilet bugün hiçbir şeyi korumuyor, yalnız oyunu yavaşlatıyordu.

**Yapılanlar**
- **Sunucu:**
  - `week.end` sınırsız.
  - `server/week_config.js` ve bilet ortam değişkenleri (`EO_WEEK_TICKET_*`) silindi.
  - Makbuzda ve `GET /api/economy` hafta görünümünde `ticket` alanı yok.
- **Eski kayıt:** `weekTickets` alanı, bitmiş ya da bozuk olsa bile, hiçbir şeyi kısıtlamaz. Hesabın gördüğü ilk komutta sessizce silinir. Okuma bu alanı yok sayar.
- **İstemci:** yerel hafta hiç bekletilmez. Silinenler:
  - "🎟" göstergesi
  - "Yeni hafta bekleniyor" mesajı
  - dolum zamanlayıcısı
  - `eco-wait` stili

  Yalnız borç varsa kısa bir borç rozeti kalır (`Borç 120`).
- **Korunanlar:** borç (D4), `ocak.rebuild`, `week.end` idempotency, sürüm çakışması kuralı, 20. hafta nesil devri, hafta kuyruğu ve aynı gövdeyle yeniden deneme.

**Alternatif yön (yalnız belge, uygulanmadı).** İleride sunucu faucet'i artarsa (örneğin Topçu/zindan ganimeti sunucuya taşınırsa) iki seçenek var:
1. Kazanca bağlı günlük ya da haftalık tavan.
2. Gerçek zamanlı küresel sezon takvimi (D1b).

**Sınırsız haftanın kalan riski: 01 kararı gerekir.** Sunucu haftası her ilerlediğinde NPC tezgâhı (Rüstem, Hatice, Kerim) yenilenir. Hızlı hafta çeviren oyuncu tezgâhı sınırsız yeniletip nadir gen avlayabilir. Bunu Ocak Kesesi altınıyla yapar; NPC alımı `earned` altın üretmez. Bu dilimde yeni tezgâh yenileme sınırı **eklenmedi** (yeni mekanik olurdu). Yalnız `ocak.rebuild` için gerçek zaman koruması kondu (§3a ORTA-1).

## 2. Kayıtlı hesapta sunucu ekonomisi (Görev 2)

**Etkin olduğu durum:** X oturumlu (`MP.xVerified`) **ve** sunucuya bağlı (`ECO_LINK.linked`). Misafir, çevrimdışı, statik sunucu ya da sunucu hatasında `js/economy_sync.js` hiçbir şey yapmaz; eski yerel akış çalışır (e2e ile doğrulandı).

**İki kese (QA YÜKSEK-1, 00 kararı).**
- **Yerel kese (`S.gold`, HUD'daki altın):** yerelde kalır, oyun hissi değişmez. Topçu, olay, müzayede, sipariş, arena ve hafta gelir/giderleri eskisi gibi çalışır. Eşitlemede silinmez, iade edilmez. Kayıt öncesi yerel altın da korunur.
- **Ocak Kesesi (sunucu bakiyesi):** sunucu ekranlarında bu adla görünür: Ocak Sandığı, Bedesten, Takas, NPC tezgâhı alt şeridi ve "Ocak Kesesi" durum kartı.
- **İpucu:** iki kesenin farkı ilk etkinleşmede bir kez tek cümleyle gösterilir.
- **Sunucuya yerelden hiçbir altın yazılmaz.**
- **Sarılmış NPC işlemleri** (alım, bina, arazi, bağlı varlık satışı):
  - Altın kontrolü ve ödeme Ocak Kesesi'nden yapılır.
  - Yerel eylemin iyimser altın düşümü aynı anda iade edilir; yerel kese bu işlemlerde değişmez.
  - Eylem sırasında tamamlanan yerel hedefin ödülü (yerel kural) yerel kesede kalır.
  - Ocak Kesesi yetmezse açık mesaj çıkar ("Ocak Kesesi'nde yeterli altın yok …") ve eylem yapılmaz.
  - Yanıtı beklenen harcamalar (`pendingSpend`) kesenin iki kez sayılmasını önler.

**Akış (oyunu yavaşlatmaz).**
- Yerel eylem hemen uygulanır (iyimser). Sunucu komutu arka planda `requestId` ile gider. `ECO_LINK.exec`, hafta kuyruğuyla aynı zinciri kullanır; tek askı kuralı ve aynı gövdeyle yeniden deneme korunur.
- Yanıt gelince sunucu durumu esas alınır (`reconcile`):
  - Tezgâh (Rüstem, Hatice) sunucu pazarını gösterir.
  - Bağlı varlıklar `assetId` ile eşlenir.
  - Sunucuda sonradan beliren varlık yerele gelir (Bedesten alımı, takas, sunucuda çatlama).
  - Sunucudan giden bağlı varlık yerelden çıkar.
- Kesin ret (4xx) olursa yerel iyimser değişiklik geri alınır.
- Belirsiz yanıtta komut askıda kalır, sonra aynen gönderilir.

**Bilinen-varlık izi (QA YÜKSEK-2).** Bir kez yerelde bağlanmış varlık yerelden çıkarsa, sunucuda dursa bile yeniden içe alınmaz. Bu durumlar şunlardır: yerel ölüm (`killDragon`), siparişe ya da müzayedeye verilme, yerelde çatlama, satış onayının beklenmesi. Böylece dirilme ve tekrar tekrar verme olmaz. Varlık sunucudan gidince iz temizlenir.

### Yönlendirilen işlemler (Ocak Kesesi)
| Yerel eylem | Sunucu komutu | Ret | Test |
|---|---|---|---|
| Rüstem'den ejderha (`buyD`) | `shop.dragon {id}` | geri al | e2e + birim |
| Hatice'den yumurta (`buyEgg`) | `shop.egg {id}` | geri al | e2e (ret yolu dahil) + birim |
| Nuri'den yem (`buyFood`) | `shop.food {key}` | geri al | e2e |
| Rüstem'e bağlı ejderha satışı (`sell`) | `dragon.sell {assetId}` (bedel Ocak Kesesi'ne) | geri koy | e2e |
| Kerim'e bağlı eşya satışı (`sellI`) | `item.sell {assetId}` | geri koy | **e2e yok**, aynı kalıp |
| Bina (`build`) | `building.buy {kind, tile}` | kaldır | e2e (kuluçka) |
| Arazi (`clear`) | `land.clear {tile}` | kapat | **e2e yok**, aynı kalıp |
| Kuluçka (`egg-in/out`, bağlı yumurta) | `egg.incubate` | yumuşak | e2e |
| Sunucuda hazır yumurta | `week.end` → `hatchReady` → `egg.hatch` | yumuşak | birim, **e2e yok** |
| Hafta sonu | `week.end` | — | e2e |

Yerel-only ejderha ve eşyanın Rüstem'e ya da Kerim'e satışı eski yerel satıştır; bedel yerel kesene girer. İlk teslimdeki engel, iki kese kararıyla kaldırıldı.

### Bağlı ejderha için kapatılan yerel çıkışlar (QA YÜKSEK-2)
| Yol | Davranış |
|---|---|
| Müzayedeye çıkarma (`auc-sell`, `aucOpen`) | Bağlı ejderha reddedilir, açık mesaj çıkar. Yerel-only serbest |
| Siparişe verme (`orderGive`) | Bağlı ejderha reddedilir, tekrar tekrar verme yok. Yerel-only serbest, bedel yerel kesene |
| Arena "Locadan Bir Teklif" (`FIGHT_POST.teklif` satış seçeneği) | Bağlı ejderhada seçenek kapalı ("Ocak Sandığı'ndaki ejderha burada satılamaz"), `fx` de korumalı. Yerel-only'de açık |
| Yerel ölüm (`killDragon`) | Engellenmez (oyun kuralı). Ejderha eşitlemede **dirilmez** (bilinen-varlık izi). Sunucuda ölüm komutu YOK, ayrı karar (A-7) |

### Yönlendirilmeyen işlemler (yerel kalır, yerel kese)
| İşlem | Neden |
|---|---|
| Müzayede alımı, olay "Sahiplen", sefer/hub/çiftleşme/sipariş yumurtaları | Sunucu komutu yok. Fiyat ve olasılık istemcide; yeni komut ve kural kararı gerekir |
| Kerim'den eşya alma (`shop.item`) | Sunucuda demirci bayrağı yerel hikâyeden ayrı ilerliyor |
| Kor Örsü, taş sentezi, cevher dönüşümü (`chibi.*`, `stone.*`, `ore.*`) | Terbiyeci/örs durumu yerelde ayrı; ayrı dilim gerekir |
| Eğitim, görev, besleme, Topçu/zindan ganimeti, arena/yarış ödülleri, olaylar, Kan Tüccarı, Çayhane, siparişler | Sunucu komutu yok |

## 3. Kararlar
- **K-1 (00 kararıyla değişti): iki kese.** İlk teslimdeki "tek altın = sunucu" kararı geri alındı. Gerekçe (QA): yerel kazançlar siliniyor, yerel harcamalar bedava oluyordu. Yerel kese yerelde kalır, Ocak Kesesi ayrıdır (§2).
- **K-2:** Sunucunun taban varlıkları (başlangıç ejderhası, yumurta) yerele kopyalanmaz, yalnız Sandık'ta kalır.
- **K-3:** Yerel varlıklar silinmez; yerel-only satış ve verme serbesttir.
- **K-4:** Kaynak politikası değişmedi. Başlangıç altını ve tek seferlik hedef ödülü `bound`; harcama önce bağlı altından düşer. Bağlı altınla alınan varlık Sandık'ta ve Bedesten listesinde "Hesaba bağlı" görünür.
- **K-5:** Bina için sunucu arsası ayrıca seçilir.
- **K-6:** Kuluçka komutu yumuşaktır; sunucu reddederse yerel kuluçka sürer.
- **K-7:** Sunucu değişiklikleri bilet kaldırma ve `ocak.rebuild` korumasıyla sınırlı. Komut şeması aynı.

### 3a. QA bulguları ve uygulanan kararlar
| Bulgu | Karar (00) | Uygulama |
|---|---|---|
| YÜKSEK-1 tek kese yerel altını siliyor/bedava yapıyor | İki kese | `379f335` |
| YÜKSEK-2 bağlı ejderha müzayede/sipariş/teklifle verilip yeniden içe alınıyor; ölü ejderha diriliyordu | Bu yollar engellenir; ölü dirilmez; sunucu ölüm komutu ayrı karar | `379f335` (iz) + `a610133` (engeller) |
| ORTA-1 sınırsız haftayla 8 haftalık bekleme dakikalara iniyor | 8 sunucu haftası **ve** 24 saat (sunucu saati) | `7334049` |
| ORTA-1 tezgâh yenileme sınırı | Yeni mekanik yok; "01 kararı gerekir" | §1 |

**ORTA-1 ayrıntı:**
- Yeni alan `lastRebuildAt`, yalnız sunucu saatini tutar.
- Sunucu saati yoksa istek `server_time_unavailable` (503) ile reddedilir.
- `lastRebuildAt` olmayan eski kayıtta yalnız hafta şartı aranır.
- Okuma görünümü `rebuild.waitMs` döner; durum kartı iki bekleme koşulunu birlikte söyler.

## 4. Testler (2026-11-08, Windows, Node 24, msedge headless; QA düzeltmelerinden sonra hepsi yeniden koşuldu)
| Komut | Sonuç |
|---|---|
| `npm test` | **146/146** (taban 136) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **13/13** |
| `npm run test:trade-ui` | **1/1** |
| `ENG05_MULTI_SERVER=1` + emülatör + `test:trade-ui` (iki sunucu) | **1/1** |
| `npm run test:layout` | **2/2** |
| `npm run test:eng10` | **5/5** |
| `npm run test:eng11` | **1/1** |
| `npm run test:ocak-sandigi` | **1/1** |
| `npm run test:eng12` | **3/3** |
| Tüm Playwright | **13/13** |

**Birim testleri (`tests/eng12_sync.test.js`, 9 test):**
- iki kese: yerel altın korunur
- iyimser kopyanın bağlanması ve art arda iki alım
- içe alma ve çıkarma
- askıdaki satış
- yerelde çatlayan yumurtanın bağlanması
- yerel kazanç ve harcamanın eşitlemede silinmemesi
- ölü ya da verilmiş bağlı ejderhanın dirilmemesi

**Birim testleri (`tests/eng10_rebuild.test.js`):**
- 8 hafta dolsa da 24 saat geçmeden kapalı
- 24 saat geçse de 8 hafta dolmadan kapalı
- sunucu saati yoksa ret
- eski kayıt yalnız hafta şartıyla

**Uçtan uca testler (`tests/eng12_sync.e2e.js`, 3 test):**
1. **NPC alımları:**
   - İpucu bir kez görünür.
   - HUD yerel altını gösterir, tezgâh alt şeridi "Ocak Kesesi 3000".
   - Ejderha, yumurta ve yem Ocak Kesesi'nden ödenir; yerel kese azalmaz.
   - Ret yolu çalışır.
   - Alınanlar Sandık'ta ve Bedesten "İlana Koy" listesinde görünür.
   - Haftalar beklemeden biter; eşitleme yerel altını değiştirmez.
   - Çevrimdışıyken eski yerel akış çalışır.
2. **Bina, kuluçka, satış:**
   - Kuluçka binasının bedelini Ocak Kesesi öder; yerel kesede yalnız yerel hedef ödülü (+40) var.
   - `egg.incubate` çalışır.
   - Bağlı ejderha satışı Ocak Kesesi'ne yazar, yerel kese değişmez.
   - Yerel-only satış yerel kesene yazar, Ocak Kesesi değişmez.
3. **QA senaryoları:**
   - Kayıt öncesi 9999 yerel altın kayıttan sonra korunur.
   - Yerel +777 ve −1000 eşitlemede silinmez, iade edilmez.
   - Bağlı ejderha: müzayede reddi, iki kez sipariş denemesi reddi (altın değişmez, kopya oluşmaz), arena teklif seçeneği kapalı.
   - Yerel-only ejderha: müzayede salonu açılır, sipariş verilir (+50 yerel).
   - Ölen bağlı ejderha eşitlemede dirilmez (sunucuda durur; belgelendi).

Ekran görüntüleri yalnız yerelde: `test-results/eng12/*.png`.

**Koşulmayanlar:**
- gerçek telefon, iOS Safari, Cloud Run, gerçek X OAuth (yerel simülasyon kullanıldı), yük testi
- tarayıcıda uçtan uca: `item.sell`, `land.clear`, sunucu haftası sonrası `egg.hatch`
- yerel-only müzayedenin sonuna kadar oynanması (yalnız salonun açıldığı doğrulandı)
- gerçek ağ kesintisinde askıdaki alımın sayfa yenilemesinden sonra eşlenmesi

## 5. Riskler
- **R-1:** Sunucuda ölüm komutu yok. Yerelde ölen bağlı ejderha Ocak Sandığı'nda yaşar görünür ve Bedesten'e konabilir. Yerelde dirilmez, ama sunucu kaydı ticari olarak canlıdır. Ayrı karar gerekir (A-7).
- **R-2:** Yerel ve sunucu ejderhası ayrı evrilir. Eğitim, yara ve görev yereldir; Bedesten önizlemesi yerel istatistikleri bilmez.
- **R-3:** Yerelde çatlayan bağlı yumurta, sunucu yumurtası çatlayana dek Sandık'ta yumurta olarak durur. Sunucu adı yerel addan farklı olabilir.
- **R-4:** Yerel besleme sunucu yemini azaltmaz.
- **R-5:** Sınırsız hafta ile NPC tezgâhı hızla yenilenebilir (§1). 01 kararı gerekir.
- **R-6:** Yerel hedef ödülleri, sarılmış NPC işlemi sırasında tamamlansa da yerel kesede kalır. Bu eski yerel kural; sunucunun kendi hedefleri ayrıca `bound` öder.
- **R-7:** Codex ENG06-04 ile ortak dosyalar: `server/economy_commands.js` (bilet satırları ve `now` parametresi) ve `js/pazar.js` (iki etiket satırı). Birleştirme sırası netleşmeden iki dal birlikte birleştirilmemeli.

## 6. Açık işler
- **A-1:** Müzayede ve olay sahiplenmesi için sunucu komutu (01 + kullanıcı).
- **A-2:** Topçu/zindan ganimeti için sunucu faucet'i (01).
- **A-3:** Demirci ve Kor Örsü dilimi.
- **A-4:** Besleme ve yem tüketiminin sunucuya bağlanması.
- **A-5:** `item.sell`, `land.clear` ve `egg.hatch` için e2e; ağ kesintisi senaryosu.
- **A-6:** Eski belgelerdeki (ENG06_PC, ENG10) bilet parametreleri tarihsel kayıttır; bu belge onların yerine geçer.
- **A-7:** Sunucu tarafında ejderha ölümü (yerel ölümün sunucu kaydına yansıması). Ürün kararı.
- **A-8:** NPC tezgâh yenileme sınırı ya da sezon takvimi (01).
