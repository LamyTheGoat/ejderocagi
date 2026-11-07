# QA-ENG06-01 — Bağımsız güvenlik denetimi

Tarih: 2026-11-07 (Europe/Istanbul). Rol: bağımsız QA / güvenlik denetçisi.

## Karar

**ENG-06 Paket 1+2: PASS; ENG06-03 planlamasına geçiş önerilir.** Bu görev ENG06-03'ü başlatmaz. Üretim yayını onayı verilmez. Güncel komut yüzeyinde yeni kritik/yüksek güvenlik açığı doğrulanmadı. Orta düzey bir tarihsel bakiye mutabakat sınırı ve düşük düzey bir test kapsamı/adlandırma bulgusu aşağıdadır.

13 tek seferlik hedefin tamamı gerçek `goals.claim` ödeme yolunda earned girdilerle bile bound, unknown girdilerle unknown ödendi. Toplam ödül 720 altın. Başka oyuncudan gelen gen2/işaretli ejderha hedef koşulunu hâlâ sağlayabilir, ancak ürettiği 140 unknown altın devredilemez. Bu, “kendi soyundan” uygunluk iddiasını doğrulamaz; bu paketin kapattığı iddia aktarılabilir altın üretimidir.

## Git izolasyonu ve sürüm

- ENG-05 temel: `bf267349ce97400e6999cca934f22400796e91ec`.
- Paket 1: `3471ca2124eceb4993f48cae4cbdba7f1715c94f`.
- Paket 2 / incelenen uç: `a36011d455cba08b68135d275ae2cea8244e9732`.
- Üç commit yerel depoda mevcut; aralık yalnız bu iki Claude commit'ini içeriyor.
- Başlangıçta `C:/Users/user/Documents/GitHub/ejderocagi-yeni` (`codex/eng-05-economy-security`) ve `C:/Users/user/Documents/GitHub/ejderocagi-eng06` (`claude/eng-06-economy`) temizdi.
- App `create_worktree` ile son Claude SHA'sından temiz, detached worktree oluşturuldu; ardından `qa/eng06-review-01` dalı açıldı.
- QA yolu: `C:/Users/user/.codex/worktrees/qa-eng06-review-01/ejderocagi-yeni`.
- Git sahiplik kontrolü komut bazlı `-c safe.directory=...` ile çözüldü; global Git ayarı değiştirilmedi.
- Üretim kaynakları ve mevcut iki worktree değiştirilmedi. Yalnız yeni QA testi, bu rapor ve test kanıtları eklendi. Push/merge/reset/dağıtım yapılmadı.
- Bu raporu içeren QA commit SHA'sı teslim mesajında verilir; dalda `git log -1 --format=%H` ile doğrulanabilir.

## İncelenen dosyalar

Değişiklik aralığının bütün dosyaları:

| Dosya | İnceleme |
|---|---|
| `server/economy_sources.js` | `known`, `goalInputSource`, bütün hedeflere bound sarmalayıcı |
| `server/economy_commands.js` | Eski renown için unknown başlangıç; ortak ödül ödeme yolu |
| `tests/economy_sources.test.js` | Earned fixture değişikliği; ENG-05 kaynak/takas regresyonları |
| `tests/firestore_store.integration.js` | Earned fixture değişikliği; ödünç ejderha parite testi |
| `tests/eng06_economy_acceptance.test.js` | 10 kabul testi; gerçek komutlar ve fixture sınırları |
| `ENG06_DELIVERY.md` | Güvenlik iddiaları ve açıkça belirtilen kapsam dışları |

Bağımlı güvenlik yolları da okundu: `js/core.js:833` GOALS tablosu, `js/week.js:281` checkGoals; `server/economy_commands.js:27` komut şekilleri ve `:194` ödeme; `server/economy_store.js:227` SQLite komut transaction'ı; `server/firestore_store.js:127` Firestore transaction'ı; `server/trade_service.js:39` son transfer ve `:90` rezervasyon koruması; `server/market_service.js:27` ilan kaynak denetimi. ENG-05 teslim/risk belgeleri, iki oyunculu test ve Playwright yapılandırması karşılaştırıldı.

## Test kanıtları

Ortam: Windows, Node v24.13.0, npm 11.6.2, Java 22, Microsoft Edge headless. Mevcut ana checkout bağımlılıkları yalnız okunarak kullanıldı (`NODE_PATH`); bağımlılık kurulumu/lockfile değişikliği yok. Emülatör demo proje `demo-ejder-ocagi`, economy DB, localhost 127.0.0.1:8089; gerçek Firestore'a erişilmedi.

| Kontrol | Sonuç | Kanıt (`qa-evidence/`) |
|---|---|---|
| Claude ucundaki standart Node/SQLite paketi | PASS — 58/58 | `standard.txt` |
| Nihai standart paket + 7 bağımsız QA testi | PASS — 65/65, sıfır atlanan | `standard-with-qa.txt` |
| ENG-05 kaynak/takas, başlangıç paketi, satış/teklif yarışı | PASS — standart pakete dahil | Aynı logdaki ENG05 test adları |
| Firestore emülatör entegrasyonu | PASS — 8/8 | `firestore.txt` |
| SQLite Playwright, iki cookie bağlamı, mobil/reload/kayıp yanıt | PASS — 1/1 | `browser-sqlite.txt` |
| İki gerçek yerel Node süreci + ortak Firestore + iki oyunculu Playwright | PASS — 1/1, 22.1 s | `browser-two-server-emulator.txt`, PNG'ler |
| Önceki sürüm karşısında QA negatif kontrolü | PASS — beklenen 3 test FAIL / 2 PASS | `eng05-negative-control.txt` |
| Yeni QA test dosyası sözdizimi / QA diff whitespace | PASS | `node --check`, `git diff --check` |
| Fiziksel mobil cihaz, gerçek iki uzak sunucu, uzun yük testi | NOT RUN | Yerel emülasyon bunları kanıtlamaz |
| Arena/üreme/hafta ilerlemesi → gerçek earned üretici E2E | NOT RUN | Bu üreticiler mevcut komut yüzeyinde yok |
| Canlı IAM/indeks/yedek/mutabakat ve karma sürüm rollout | NOT RUN | Salt okunur yerel denetim kapsamı dışında |
| Beceri genel `scripts/audit_project.py` denetimi | NOT RUN | Dosya depoda yok; görsel/asset değişikliği yok |

Negatif kontrol, test dosyasının ilk 5 senaryolu sürümünü `QA_RULES_ROOT` ile değiştirilmeyen ENG-05 checkout'una yönlendirdi: earned girdili hedef ödemesi, legacy hedefin kaynak davranışı ve eşzamanlı ödemenin earned kalması yakalandı. ENG-06 üzerinde aynı 5 senaryo geçti. Son sürüm ayrıca unknown dönüşüm zinciri ve tarihsel bakiye sınırını test eder.

Ara koşular: İlk iki sunucu denemesinde kısa ömürlü entegrasyon emülatörü kapanınca ECONNREFUSED oluştu. Kalan QA Node süreçleri sonraki denemede presence listesine karıştı; `tests/trade_ui.e2e.js:80` locator'ı 3 düğmeye eşleşti. Bunlar `browser-two-server.txt` ve `browser-two-server-contaminated.txt` içinde saklandı. Yalnız bu QA'ya ait süreçler kapatıldı; temiz emülatörde, test veya assertion değiştirmeden son koşu geçti. Bu ara sonuçlar paket açığı olarak sınıflandırılmadı. QA testinin ilk yazımında toplam ödül yanlışlıkla 780 hesaplandı; GOALS tablosundaki 720 toplamına düzeltildi. Üretim tutarları değiştirilmedi. İlk 5 QA testinin başarılı ara çıktısı `independent.txt`; nihai otorite 65 testlik logdur.

### Yeniden çalıştırma

QA kökünde PowerShell:

```powershell
$env:NODE_PATH='C:/Users/user/Documents/GitHub/ejderocagi-yeni/node_modules'
node --test tests/*.test.js
npx.cmd --offline --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "node --test tests/firestore_store.integration.js"
node C:/Users/user/Documents/GitHub/ejderocagi-yeni/node_modules/@playwright/test/cli.js test --config tests/playwright.config.js
$env:ENG05_MULTI_SERVER='1'
npx.cmd --offline --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "node C:/Users/user/Documents/GitHub/ejderocagi-yeni/node_modules/@playwright/test/cli.js test --config tests/playwright.config.js"
```

Tarayıcı koşuları seri ve temiz emülatörle çalıştırılmalı. `ENG05_MULTI_SERVER` SQLite koşusunda ayarlanmamalı. Testlerin başındaki localhost emülatör koruması korunmuştur.

## Güvenlik iddialarının sonucu

| İddia | Sonuç ve dayanak |
|---|---|
| 13 hedef devredilemez | PASS. Bağımsız test 13 gerçek ödeme ve 3 kaynak sınıfını, toplam 720'yi doğrular. `goalSource:65` her girişe bound ekler; unknown önceliklidir. |
| acq/yuva/kulucka ile earned basımı | PASS. Kabul testi başlangıcı tüketir, ödünç earned ile gerçek alım yapar; ödüller 60/40/40 bound, hesaplar arası earned toplamı yalnız ödeme kadar azalır. |
| Ödünç gen2/mark | PASS (aktarılabilir ödül bakımından). SQLite ve Firestore takası sonrası 60+80 unknown; altın teklifinin reddi SQLite'ta doğrulanır. Sahip olunmayan assetId ile satış/kuluçka reddedilir. |
| Unknown → earned dönüşümü | PASS (mevcut komutlar). Bağımsız test item/dragon/egg alımı, hatch, NPC satışı ve son gold teklif reddini kapsar. Kaynak taşınması kod incelemesiyle de doğrulandı. |
| Başlangıç altını/varlık aklama | PASS. 420→840→1260 saldırısı, varlık/yiyecek teklifi, NPC alım/satımı, aşırı fiyatlı ilan, yumurta→ejderha ve sahte kaynak alanları ENG-05 regresyonlarında reddediliyor. |
| Tekrar talep | PASS. Bütün hedeflerden sonra yeni claim boş; aynı requestId makbuzdan döner. Hash uyuşmazlığı reddedilir. |
| Eşzamanlılık | PASS. Bağımsız iki SQLite worker'ı aynı version ile 13 ödül talep etti: bir commit, bir conflict, tek 720 ödeme, replay'de artış yok. Firestore harcama/onay, aynı request, rollback ve asset rezervasyon yarışları da geçti. Her olası program sıralaması için matematiksel kanıt iddia edilmez. |
| Eski kayıt | PASS (kaynağı eksik kayıt). funds yoksa etiketlere güvenilmiyor, earned sıfır; renown=24 + earned hatch eski ünü unknown tutuyor. Önceden geçerli earned yazılmış kayıt için M-01 sınırı geçerli. |
| ENG-05 koruması | PASS. Kaynak sırası, offer ve settlement denetimleri, earned rezervasyonu ve rollback korunmuş; üretimde bu yollar değiştirilmemiş. |

İşlem bütünlüğü: SQLite state ve command_receipts aynı atomik yazımda (`economy_store.js:240-245`); Firestore account sürümü/state ve receipt aynı transaction'da (`firestore_store.js:140-145`). `checkGoals` tamamlanan hedefi kalıcı state'e ekler. Son transferde kaynak yeniden denetlenir (`trade_service.js:40`); yalnız teklif anına güvenilmez.

## Bulgular

### Kritik / yüksek

Bu iki paketin mevcut ekonomi komutlarında doğrulanmış yeni kritik/yüksek bulgu yok. Bu ifade bütün projenin veya üretim topolojisinin güvenlik sertifikası değildir. Teslimde anılan proxy/IP, presence/read limit ve WS konuları bu dar denetimde yeniden açık kanıtıyla doğrulanmadı; kapatılmış sayılmamalı.

### M-01 — Tarihsel earned hedef ödemeleri otomatik karantinaya alınmıyor (orta, operasyonel/geçiş sınırı)

- Konum: `server/economy_sources.js:10-25` (`ensure` yalnız funds olmayan kaydı karantinaya alır), `server/economy_commands.js:194-196` (yalnız yeni ödülleri sınıflar), `server/trade_service.js:40`.
- Yeniden üretim: Geçerli kaynak defteri bulunan bir kayda, önceki sürümden kalmış 60 earned hedef geliri ve tamamlanmış hedef listesiyle başla. `goals.claim` çağır. Yeni ödül gelmez, eski 60 earned kalır ve `tradable` bunu kabul eder. Bağımsız test `historical earned goal credits...` bu davranışı doğrular.
- Etki: Eski sürümde aklanmış bir bakiye gerçekten mevcutsa yeni kod onu düzeltmez. Herhangi bir canlı hesabın istismar edildiğine dair kanıt yok; fixture tarihsel durumu modeller. ENG06 teslimi bu geriye uyumluluk sınırını zaten belirtir; yeni API bypass değildir.
- Gerekli işlem: Üretimde eski yazıcılar çalıştıysa yayın öncesi kayıt/işlem envanteri ve onaylı mutabakat kararı. Toplam bakiyeden geçmiş hedef kaynağı güvenle çıkarılamaz; otomatik kesinti veya şema değişikliği bu denetimde yapılmadı. ENG06-03 planlamasını engellemez; koşul gerçekleşmişse üretim geçişi blocker'ıdır.

### L-01 — Earned fixture testinin adı üretici doğrulaması izlenimi veriyor (düşük, test açıklığı)

- Konum: `tests/economy_sources.test.js:61-66`, `tests/firestore_store.integration.js:169-170`.
- Yeniden üretim: Test diff'ini oku: `win1` stat/source + `goals.claim` çıkarılmış, yerine `gold+=50; funds.earned+=50` konmuş. Test çalışınca gerçek earned ödül üreticisi çağrılmaz.
- Değerlendirme: Bu iki değişiklik sadece kurulumda ve açıklamada; eski assertion'lar silinmemiş/gevşetilmemiş. Bununla birlikte bir komutun kurulumdan çıkarılması kapsamı da değiştirir: eski hedef→ödeme yolu bu iki testte artık yoktur. Takas/rezervasyon/iptal güvenlik iddiaları korunur. Önceki win1 fixture'ı da gerçek arena simülasyonu değildi.
- Etki: `verified gameplay reward` adı yanlışlıkla arena→earned→takas E2E kanıtı sanılabilir. Doğrudan kredi tek başına kaynak üretim açığını yakalayamaz.
- Gerekli düzeltme: Sonraki test bakımında adı `seeded earned balance...` olarak netleştir; gerçek üretici eklendiğinde ayrı E2E yaz. Mevcut testler bu QA'da değiştirilmedi.
- Kapatıcı kanıt: Claude'un bound-policy testine ek olarak bağımsız QA bütün 13 hedefi gerçek reducer ödeme yolundan geçirir. ENG-05 negatif kontrolünde 3 beklenen hata, yeni testlerin eski earned davranışını gizlemediğini gösterir. Bu paket için fixture değişikliği bir güvenlik açığını örtüyor kanıtı bulunmadı.

## Teslim ve sınırlar

Yeni QA kaynağı: `tests/qa_eng06_independent.test.js` (7 test). Kanıtlar ve başarılı son iki sunucu mobil PNG'leri `qa-evidence/` altında yerel QA commit'ine dahildir. Üretim dosyalarında QA diff'i yoktur.

Öneri: Paket 1 ve 2'nin devredilebilir hedef ödülü açığını kapattığı kabul edilebilir; Proje Merkezi ENG06-03 için ayrı görev kararı verebilir. Canlı earned üreticileri, geçmiş bakiye mutabakatı ve operasyonel rollout kontrolleri ayrıca ele alınmalıdır. ENG06-03 otomatik başlatılmadı.

Kanıt metinlerinde yalnız satır sonu boşlukları temizlendi; hata ve sonuç içerikleri korunmuştur.
