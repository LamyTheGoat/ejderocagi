# ENG-13 · Tek kese ve ejderha yaşam döngüsü (yerel ↔ sunucu senkronu)

02 Engineering · 2026-11-08 · dal `claude/eng13-gold-sync` (taban yerel `main` @ `360f860`). Yerel commit; push, merge, dağıtım yok.

Değişmeyenler: `server/economy_sources.js` (kaynak politikası, harcama sırası bound → unknown → earned), mevcut fiyat,
ödül ve olasılıklar, D4 borç kuralları, hafta atlama (sınırsız, dokunulmadı), misafir/çevrimdışı yerel akış.

## 0. Son durum (bağımsız QA + kullanıcı kararı, 2026-11-09) · bu bölüm aşağıdakilerden önce gelir
**Kullanıcı kararı (kesin):** "hile koruması yapma; tavan/kısıt ekleme; altınla alınan ejderha da pazara konsun; sadece multiplayer modüller düzgün çalışsın". Bu yüzden §1b'deki tür tavanları, §4 K13-2'deki günlük earned tavanı ve §5'teki tavan tablosu **geçersizdir** (tarihsel kayıt olarak duruyor).
- **Gelir sınıfları (yalnız `local_income.js` komut → sınıf eşlemesi):**
  - `topcu.clear`, `topcu.spin`, `gold.local` → `earned`, tavansız.
  - `auction.sell`, `order.deliver`, `offer.sell` → ejderhanın kendi kaynağı (`dragon.funding`, `dragon.sell` ile aynı; Y-1).
  - `gold.import` ve hedef ödülü (`goal.reach`, `goalSource`) → `bound` (D15).
  - `unknown` yalnız eski veride kalır.
  - `economy_sources.js`, bound + unknown + earned == gold ve harcama sırası (bound → unknown → earned) değişmedi.
- **Kalan denetimler yalnız geçerlilik içindir:** komut şeması, tür listesi, tam sayı, sıfır olmayan, tek istekte |tutar| ≤ 1.000.000 (NaN/ondalık/negatif aktarım reddi).
  - Yerel oyun kuralları korunur: müzayedede haftada bir kendi ejderhan, aşama başına bir çark hakkı, siparişte ejderhanın gen şartları. Bunlar hile önlemi değildir.
  - Kaldırılanlar: `EO_EARNED_DAILY_CAP`, `EO_LOCAL_INCOME_DAILY_CAP`, `EO_TOPCU_DAILY_GOLD`, `EO_ORDERS_*`, `EO_OFFERS_*` ve "canlı ejderha yoksa Topçu ödülü yok" şartı.
  - Kalan tek yapılandırma: `EO_LOCAL_IMPORT_CAP` (2000). Bu bir gelir tavanı değildir; kayıt öncesi altın aktarımının ilk talimattaki tek seferlik tavanıdır.
- **Sonuç:** yerel kazanç, Topçu ve earned altınla alınan ejderha Bedesten'e ve takasa konur (testli). Başlangıç/bound altınla alınan varlık D15 gereği konamaz.
- **K-1 (QA KRİTİK, düzeltildi):** takastaki/ilandaki/kilitli ejderha yerelde ölünce `dragon.die` kesin retten sonra anında yeniden deneniyordu (15 sn'de 9802 istek, 429 kilidi, yenilemede yeniden başlıyordu).
  - Artık ejderha başına üstel geri çekilme var (2 sn → 4 → … en çok 60 sn), kayıtta saklanıyor.
  - Sunucu sürümü değişince bir kez erken denenir.
  - `rate_limited` tüm arka plan gönderimlerini bekletir.
  - Defter kaydı oran sınırı ya da belirsiz yanıtta kaybolmaz, geri konur.
  - Sandık sade durum gösterir: "Ocakta öldü. Takas bitince sunucudan kaldırılacak."
  - e2e: 15 sn'de ≤ 6 istek, 429 yok; yenileme döngü başlatmaz; takas iptal edilince ölüm uygulanır.
- **O-1 (düzeltildi):** ardışık yerel kazançlar birleşince tek bildirim tavanında kırpılıyordu (5 × 200 → 300). Tavan kalktığı için birleşme artık kayıpsız; tek istek sınırını (1.000.000) aşan birikim parçalanır. Birim testi ve e2e (5 × 200 = 1000).
- **Bilinen, kullanıcı kararıyla ertelenen (hile bulguları, dokunulmadı):**
  - K-2: misafir/istemci `topcu.clear` vb. komutlarla savaş oynamadan ödül alabilir.
  - `gold.local` istemcinin bildirdiği tutarı tavansız ve takas edilebilir yazar.
  - Topçu geçişi, sipariş ve teklif olayının gerçekten yaşandığı sunucuda doğrulanmaz.
  - Ücretli çarkın beklenen değeri pozitiftir.
  - Hafta atlama sınırsızdır.
  - Gider reddinde yerel harcama bedava kalabilir.
  - Bunlar bilinçli olarak açık bırakıldı.
## 1. Envanter: yerel altın ve varlık değişim noktaları

Sütunlar: **yer** · **ne değişir** · **ENG-12'de sunucu** · **ENG-13 kararı** · **doğrulama**.
"Tavanlı defter" = `gold.local {reason, amount}`: yerel tutar kabul edilir ama tür başına tek bildirim tavanı ve UTC günü
toplam tavanıyla (`EO_LOCAL_INCOME_DAILY_CAP`, varsayılan 15000) sınırlanır ve `unknown` (takas edilemez) girer.
Gider (`amount < 0`) yalnız düşer; istemci kendi altınını azaltabilir, artıramaz.

### 1a. Sunucunun hesapladığı (istemci miktar göndermez)
| Yer | Değişim | ENG-12 | ENG-13 komutu | Doğrulama / sınır |
|---|---|---|---|---|
| `pazar.js` Rüstem/Hatice/Nuri alım | −altın, +ejderha/yumurta/yem | `shop.*` | aynen | sunucu pazarı, sunucu fiyatı |
| `pazar.js` Rüstem'e satış, Kerim'e eşya satışı | +altın, −varlık | `dragon.sell`, `item.sell` | aynen | value × 0.6 / sellBack, sunucu varlığı |
| `ui.js` bina, arazi | −altın | `building.buy`, `land.clear` | aynen | sunucu fiyatı |
| `week.js endWeek` bakım, rol geliri, yumurta haftası | ±altın | `week.end` | **yerel hafta altını yok sayılır**, sunucu `week.end` esas | sunucu VM'inde aynı `endWeek` |
| `week.js checkGoals` hedef ödülü (13 hedef, toplam 720) | +altın | sunucu kendi durumuyla öder; yerel ayrıca öder (**DÜŞÜK-1: iki kez**) | `goal.reach {id}` | tutar sunucu `GOALS`'tan, hesap başına bir kez, `goalSource` (bound/unknown) |
| `week.js killDragon` (turnuva/çukur ölümü) | −ejderha | yok (A-7: sunucuda yaşıyordu) | `dragon.die {assetId}` | sahiplik, kilit, ilan/takas rezervasyonu (net ret) |
| `auction.js` kendi ejderhanı müzayedeye çıkarma | +altın %90, −ejderha | engelliydi (bağlı) | `auction.sell {assetId}` | sunucu teklifçileri tohumlu RNG ile oynar (aynı formül), haftada bir, `unknown` |
| `orders.js orderGive` sipariş teslimi | +altın, +ün, (+yumurta), −ejderha | engelliydi (bağlı) | `order.deliver {assetId, spec}` | gen şartları sunucu ejderhasında, altın orderGen formülüyle, haftada 3 / günde 10, `unknown` |
| `fightev.js` "Locadan Bir Teklif" satışı | +value×1.4, −ejderha | engelliydi (bağlı) | `offer.sell {assetId}` | sunucu value × 1.4, haftada 1 / günde 4, `unknown` |
| `shm_ui.js` Topçu aşama/zindan/kervan geçişi (150/180/250/500/950) | +altın | yok | `topcu.clear {mode}` | sabit tablo, canlı sunucu ejderhası şart, Topçu günlük tavanı (`EO_TOPCU_DAILY_GOLD` 12000), `unknown`; çark hakkı verir |
| `shm_ui.js` ganimet çarkı (120/220/450/900, ücretli çark −120) | ±altın | yok | `topcu.spin {wheel}` | dilim sunucuda tohumlu RNG (aynı ağırlıklar); hak yoksa ret; ücretli çark yalnız büyük çark açıkken |
| Kayıt öncesi yerel altın | — | yerelde kalıyordu | `gold.import {amount}` | bir kez, tavan `EO_LOCAL_IMPORT_CAP` (2000), `bound`, kalan atılır |

### 1b. Tavanlı defter (`gold.local`, doğrulanamayan yerel olay)
| Yer | Değişim | Tür (tek bildirim tavanı) |
|---|---|---|
| `week.js fightOutcome`, `ui.js` arena zaferi, bahis, çukur teslim cezası | ±altın | `arena` (800) |
| `race.js` giriş ücreti, ödül | ±altın | `race` (300) |
| `pageant.js` güzellik yarışması | +altın | `pageant` (800) |
| `kiraathane.js` kıraathane bahsi | ±altın | `kiraathane` (1000) |
| `endgame.js` zindan/Divan katları, iksir alımı | ±altın | `dungeon` (2500) |
| `hub.js` sefer, kervan, dünya patronu, damızlık ücreti, köy olayları | ±altın | `hub` (1500) |
| `net.js` dostluk baskını (ödülsüz oda) | +altın | `raid` (1000) |
| `content.js`, `fightev.js`, `arenastory.js`, `comic.js`, `star.js`, `social.js`, `lineage.js`, `cosmetic.js` olay/ders/süs/hibrit | ±altın | `event` (300) |
| `chibi.js` Kor Örsü, taş sentezi, cevher, aktarım (yalnız gider) | −altın | `event` gider |
| `ui.js` sefer gideri, bina yıkım iadesi, atfedilemeyen | ±altın | `other` (300) |
| Ödüllü (ranked) düello | — | zaten yalnız sunucuda (`duel_settlement`), yerel yazmaz |

### 1c. Yerelde kalan varlıklar (altın dışı; bu dilimde sunucuya taşınmadı)
| Yer | Durum |
|---|---|
| `awardChibiStones` (Topçu, arena, kervan taşları/cevherleri/kalıpları) | yerel; sunucu `chibi.stones` ayrı (R-8) |
| Topçu çarkı yem/yumurta/kalıp dilimleri, sipariş teşekkür yumurtası, olay "Sahiplen" ejderhaları | yerel-only varlık |
| Ün (`S.un`), ejderha istatistikleri, yara, görev | yerel (R-2) |
| Besleme | yerel; sunucu yemi azalmaz (R-4) |

## 2. Commit'ler
| # | SHA | Konu |
|---|---|---|
| 0 | `664efd5` | Topçu maç sonu hatası: `shm_ui.js:1502` kapanmayan banner yorumu kapatıldı (ilk commit, koordinatör isteği) |
| 1 | `921c584` | Envanter (bu belge §1) |
| 2-3 | `7f8d60c` | Sunucu: `dragon.die`, `auction.sell`, `offer.sell`, `order.deliver`, `topcu.clear`, `topcu.spin`, `goal.reach`, `gold.local`, `gold.import` + birim testleri |
| 3 | `c8544be` | Sunucu: Topçu garantili düşüşleri ve çark tohumlu VM RNG'sinde; `order`/`sale` defter türleri; Firestore emülatör testi |
| 4 | `f067fd3` | İstemci: tek kese, A-7 akışları, Topçu sunucu akışı, etiketler; e2e (`eng13_sync`), `eng12_sync` güncellendi |
| 5 | `5756568` | Belge |
| 6 | `48d25cc` | K13-2: sunucu hesaplı gelir günlük tavanla `earned` (sonra §0 ile geçersiz) |
| 7 | `7ce9c75` | QA K-1 + O-1: `dragon.die` geri çekilme, oran sınırında bekleme, kayıpsız defter, Sandık durumu |
| 8 | `805f8ea` | Kullanıcı kararı + Y-1: tavanlar kaldırıldı, sunucu gelirleri earned, ejderha çıkışı kaynak korur |
| 9 | (bu commit) | Belge (§0) |

## 3. Topçu maç sonu hatası (koordinatör eki)
- **Bulgu:** `js/minigame/shm_ui.js:1502`'de açılan `/* ====` banner'ı 1645'teki `*/`'a kadar kapanmıyordu. `openStageDefeatRetryModal`, `openStageClearBlessingModal`, `completeSahmeranDungeonVictory` hiç tanımlanmıyordu. Dosya `6df80ec`'te bu hâliyle eklenmiş (`git show 6df80ec`: tek seferde 2939 satır; başka banner'lar iki satırlı `/* ==== … ==== */` biçiminde). Çağıranlar: `minigame.js:1892/1894/1912/1928/1961/1964/2023/2026/2477` ve `shm_ui.js` dışa aktarım bloğu; yani bu fonksiyonların yaşaması gerekir.
- **Düzeltme:** yalnız banner kapatıldı (2 satır). Fonksiyon gövdeleri değişmedi.
- **Açığa çıkan yan etkiler:** aşama geçişi +150, kervan +180, zindan +250/500/950 yerel altın; `awardChibiStones` ile taş/cevher/kalıp; çark ödülleri. **Kayıtlı hesapta** bunlar ENG-13 sunucu akışına bağlandı: altın ve garantili düşüşler `topcu.clear` ile sunucuda (yerel altın ve yerel taş yazılmaz, sunucu düşüşü yerelde aynen gösterilir), çark `topcu.spin` ile sunucuda zarlanır. **Misafirde** eski davranış (e2e ile doğrulandı).
- **Regresyon testi:** `tests/eng13_sync.e2e.js` 1. test: tarayıcıda gerçek oyun akışıyla (`initSahmeranBattleStage` → düşmanlar yenilir → `advanceTurnAfterVolley`) aşama 1 geçişi (zafer ekranı, küçük çark), çark çevirme, aşama 4 final zaferi (büyük çark, garanti ganimet), yenilgi ekranı ("GERİ ÇEKİLME"); `pageerror` yok. Düşmanlara vurma kısmı test kısayoludur (canlar sıfırlanır); tur akışı ve ekranlar gerçektir.

## 4. Kararlar
- **K13-1 Tek kese:** kayıtlı (X oturumlu ve bağlı) hesapta HUD altını sunucu kesesidir. `S.gold` bir erişimciyle izlenir; yerel kod değişmeden her yazım görülür. Komutu olan akış kendi komutunu gönderir (yerel değişim iyimser görünür, deftere yazılmaz); kalan her yerel değişim tavanlı deftere (`gold.local`) gider. Komut kuyruğu boşalınca HUD sunucu değerine eşitlenir. Oyun beklemez.
- **K13-2 Gelir sınıfı (00 kararı, 2026-11-09; ilk teslimdeki "hepsi unknown" geri alındı):**
  - Sunucunun KENDİ hesapladığı gelirler `topcu.clear`, `topcu.spin`, `auction.sell`, `order.deliver`, `offer.sell` **`earned`** girer. Sınır: hesap başına UTC günü toplam `EO_EARNED_DAILY_CAP` (varsayılan **3000**); aşan kısım `unknown` girer. Sayaç `S.srvDaily.earned` (sunucu saati).
  - `gold.local` (istemcinin bildirdiği tavanlı defter) `unknown`, `gold.import` `bound` kalır.
  - `economy_sources.js` değişmedi: yalnız komutun hangi mevcut sınıfa yazdığı `local_income.js`'te seçilir (`earnedIncome`); her parça `debt.receive → sources.credit` ile girer, bound + unknown + earned == gold korunur. Harcama sırası (bound → unknown → earned) değişmedi.
  - **Çelişki (rapor, uygulanmadı):** 00 talimatı `goal.reach`'i de earned listesinde sayıyor. Bu, onaylı ENG-06-02 politika A ile çelişir (`a36011d`, `goalSource`: her hedef ödülü hesap başına bir kez, taze hesap yeniden alabildiği için bound, asla takas edilemez). Politika değişmesin diye `goal.reach` mevcut `goalSource` ile (bound/unknown) bırakıldı. 00 açıkça isterse tek satırlık değişikliktir; ancak çoklu hesapla en çok 720 earned/hesap çiftliği açar.
  - Sonuç: tavan altında Topçu/müzayede/sipariş kazancı ve onunla NPC'den alınan varlık Bedesten'de ve takasta verilebilir (testli). Kalan istismar: doğrulanamayan Topçu geçişi ve sipariş iddiası günde en çok 3000 takas edilebilir altın üretebilir (§5).
- **K13-3 Aktarım:** ilk etkinleşmede kayıt öncesi yerel altın bir kez `gold.import` ile `bound` aktarılır; tavan `EO_LOCAL_IMPORT_CAP` (2000). Yerel yeni oyunun 420 başlangıcı sunucu başlangıcıyla aynı olduğu için düşülür (iki kez sayılmaz); 0 ise komut gitmez. Açıklama bir kez gösterilir ("Tek kese …", aktarılmayan miktar dahil). ENG-12 iki kese hesabı olan kayıtlar da bu yolla bir kez geçer.
- **K13-4 Hafta:** bağlıyken yerel hafta altını (bakım, rol geliri) yok sayılır; sunucu `week.end` esastır. Çevrimdışı haftanın altını deftere (`other`) gider.
- **K13-5 Hedefler (DÜŞÜK-1):** yerel hedef ödülü yerelde yazılmaz; `goal.reach` eylemin kendi komutundan SONRA gider; sunucu kendi durumuyla zaten ödediyse `already`. Hesap başına bir kez, toplam en çok 720.
- **K13-6 A-7:** yerel ölüm engellenmez; `dragon.die` kuyruğa girer (kayıtta saklanır, çevrimdışıysa bağlanınca gider). İlandaysa sunucu reddeder (`market_reserved_asset`), istemci ilanı geri çekip yeniden dener; takastaysa takas bitince yeniden dener. Müzayede, sipariş ve teklif artık sunucuda: ilandaki/takastaki/kilitli ejderha için net ret, yerel değişiklik geri alınır, ejderha ocakta kalır. ENG-12 engelleri kaldırıldı. Çevrimdışıyken bağlı ejderha verilemez/satılamaz (açık mesaj).
- **K13-7 Müzayede:** salon hemen açılır; teklifçiler sunucunun tohumlu sonucunu (`auction.sell` günlüğü) sırayla oynar; yanıt gecikirse bekler. Gösterilen fiyat = sunucu fiyatı.
- **K13-8 Topçu:** `topcu.clear {tür[:alt]}` sabit geçiş altını + garantili düşüş (aynı formüller); canlı sunucu ejderhası şart; çark hakkı verir. `topcu.spin {çark}` hak tüketir; ek büyük çark 120 ücretli. Kervan ortaklığı ve üçlü sancak bonusları istemci durumudur, sunucuda uygulanmaz. Çarkın cevher ve kalıp parçası dilimleri yerel ganimet listesine bağlı olduğundan yerel kalır; sabit taş dilimleri iki tarafta da yazılır.
- **K13-9 Etiket:** kayıtlı hesapta "Ocak Kesesi" adı ve iki kese ipucu yok ("Kese"/"Kesende"). Misafirin sunucu hesabı (Bedesten) yerel altından ayrı olduğu için misafirde eski etiket kalır.

## 5. Tavanlar ve "kolayca sömürülür" kalanlar (dürüst liste)
Hepsi sunucu yapılandırması. `gold.local` `unknown` girer (oyuncular arası ekonomiye sızmaz). Sunucu hesaplı gelirler (Topçu, müzayede, sipariş, teklif) K13-2 gereği günlük 3000'e kadar `earned` girer: bu satırlardaki doğrulanamayan iddialar hesap başına günde en çok 3000 takas edilebilir altına çevrilebilir.
| Konu | Sınır | Kalan istismar |
|---|---|---|
| `gold.local` (yerel olay, arena, yarış…) | tür başına tek bildirim tavanı (§1b), günde 15000 | Hile yapan istemci her gün 15000 `unknown` altın bildirebilir. Tutar doğrulanamaz. |
| `topcu.clear` | sabit tablo, canlı ejderha, günde 12000 (çarkla ortak) | Savaş sunucuda oynanmadığı için geçiş iddiası doğrulanamaz; güç kontrolü yok. |
| `topcu.spin` ücretli çark | yalnız büyük çark açıkken, günlük Topçu tavanı | Yerel kuralın beklenen değeri pozitif (120 → ≈126/252); tavanla sınırlı. |
| `order.deliver` | gen şartları sunucu ejderhasında; haftada 3, günde 10; `wk` 1–20 | Siparişin panoda gerçekten olduğu doğrulanamaz; `stat`/`stage` doğrulanmaz (R-2). Hafta atlama sınırsız olduğundan haftalık sınır gevşektir (günlük sınır kalır). |
| `offer.sell` | haftada 1, günde 4 | Teklif olayı doğrulanamaz; value × 1.4 (Rüstem 0.6). |
| `auction.sell` | sunucu haftasında bir satış | Hafta atlama sınırsız; satılmazsa yeniden denenebilir (yerel kuralla aynı). |
| `gold.import` | bir kez, 2000, bound | — |
| Gider reddi | `insufficient_gold` | Çok sekmede yarışta yerel harcama sunucuda reddedilirse bedava kalır (kese sunucuya döner). |
| Defter yenileme penceresi | — | Kayıt kuyruğa devredildiği an ile komutun saklanması arasında sayfa kapanırsa o kayıt kaybolur (komut zinciri doluysa pencere uzar). |

## 6. Bilinen riskler (ENG-12 R-2…R-5 ve yeniler)
- **R-1 (A-7): kapandı.** Ölen/satılan/verilen bağlı ejderha sunucudan, Sandık'tan ve Bedesten listesinden kalkar.
- **R-2 sürüyor:** yerel ve sunucu ejderhası ayrı evrilir (antrenman, yara, ün). Müzayede ve teklif fiyatı sunucu ejderhasının `value`'sundan; sipariş `stat` şartı doğrulanmaz. Sunucu haftası sunucu ejderhalarına bakım yazar; kayıt öncesi yerel-only ejderhaların bakımı ve rol geliri tek kesede yok.
- **R-3 sürüyor:** yerelde çatlayan bağlı yumurta, sunucu çatlayana dek Sandık'ta yumurta görünür.
- **R-4 sürüyor:** yerel besleme sunucu yemini azaltmaz; Kerim'den (yerel) eşya ve Kor Örsü/taş/cevher işlemleri yalnız altın tarafında tek kesededir (gider defteri), taş ve eşya yerel kalır (**R-8**, A-3).
- **R-5 sürüyor (talimat gereği dokunulmadı):** sınırsız hafta; NPC tezgâhı yenileme ve haftalık sınırlar hafta atlamayla gevşer.
- **R-9:** arena, kervan, düello taşları (`awardChibiStones`, Topçu dışı) yerel kalır.
- **R-10:** iyimser HUD kısa süre sunucudan farklı görünebilir (yerel hedef ödülü, çark animasyonu); kuyruk boşalınca eşitlenir.

## 7. Codex ile ortak dosyalar (küçük tutuldu)
- `server/economy_commands.js`: +14/−2 (yeni şemalar, `amount` doğrulaması, `auction` kural dosyası, `local_income` devri). Mantık yeni dosyada: `server/local_income.js`.
- `js/pazar.js`: 4 satır (etiket ve ret metni). `economy_store.js`, `firestore_store.js`, `net.js`, `server.js`: **değişmedi**.

## 8. Testler (2026-11-09, Windows, Node 24, msedge headless)
| Komut | Sonuç |
|---|---|
| `npm test` | **164/164** (taban 146; `tests/eng13_income.test.js` 18: kullanıcı kararı, O-1, K-1 geri çekilme, Y-1 dahil) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **14/14** (ENG13: ilandaki ejderha ölemez, iki örnekte Topçu tek kez ve earned, tavansız yerel defter earned, invariant) |
| `npx playwright test` (tüm e2e) | **17/17**: layout 2, eng10 5, eng11 1, eng12 3, eng13 4 (K-1 döngü testi dahil), ocak-sandigi 1, trade-ui 1 |
| `ENG05_MULTI_SERVER=1` + emülatör + `test:trade-ui` (iki sunucu) | **1/1** |

Yeni e2e (`npm run test:eng13`): (1) misafir Topçu regresyonu; (2) kayıtlı: aktarım 9999 → 420 + 2000 (7579 atıldı, mesaj), HUD = kese, yerel +200/−120 ve tavan (5000 → 300) sunucuda, NPC tezgâhı aynı keseden, Topçu geçişi +150, çark (sunucu dilimi), final +250 ve sunucu taş düşüşü, yenilemeden sonra aynı altın; (3) kayıtlı: ölüm → sunucu/Sandık/Bedesten'den kalkar ve `dead`'e geçer; ilandayken ölüm → ilan geri çekilir, ölüm uygulanır; müzayede (sunucu senaryosu, fiyat × 0.9); sipariş (formül altını); teklif; çevrimdışı ölüm kuyruğu bağlanınca uygulanır, çevrimdışı verme reddi; yenilemede dirilme yok.
Ekran görüntüleri (yerel): `test-results/eng13/*.png` (misafir aşama geçişi/final/yenilgi, tek kese HUD, kayıtlı Topçu zaferi, müzayede, Sandık, yenileme).

**Koşulmayanlar:** gerçek telefon/iOS Safari, Cloud Run, gerçek X OAuth (yerel simülasyon), yük testi; tam elle oynanmış Topçu savaşı (düşman canları test kısayoluyla sıfırlandı); kervan ve PvP Topçu kipinin kayıtlı hesapta uçtan uca akışı (yalnız birim); `topcu.spin` ücretli çark ve günlük tavan tarayıcıda (birimde var); `gold.local` gün dönümü tarayıcıda; çok sekme yarışı; ağ kesintisinde sayfa kapanması.

## 9. Sonraki adımlar
1. §0 kullanıcı kararı uygulandı; hile bulguları bilinçli olarak ertelendi.
2. A-3: Kor Örsü/taş/cevher (`chibi.*`) ve Kerim eşya alımı sunucuya (taş tek kaynağa iner).
3. A-4: besleme/yem.
4. Hafta atlama için ileride çözüm (kullanıcı notu): haftalık sınırlar gerçek zamana bağlanabilir.

## 10. 00'a kısa özet
Kayıtlı hesapta artık tek kese var: HUD sunucu altınıdır, yerel kazanç/harcama sunucuda kalıcıdır (komutlu akışlar sunucuda hesaplanır, kalan tavanlı `unknown` defter). Ölen/satılan/verilen bağlı ejderha sunucudan ve Bedesten'den kalkar. Topçu'nun maç sonu donması (açık yorum) düzeltildi; kayıtlı hesapta Topçu ödülü sunucuda. K13-2 uygulandı: sunucu hesaplı gelir günde 3000'e kadar earned. Çelişki: goal.reach onaylı politika gereği bound/unknown bırakıldı.
