# ENG-04 · P3 takas güvenlik denetimi

Tarih: 2026-11-06. Dal: `codex/eng-04-trade-audit`.
Denetim ve düzeltmeler yereldir; main, merge, push veya canlı dağıtım yapılmadı.
Bu kaydı içeren commit SHA'sı `git log -1 --format=%H` ile alınabilir.

## Temel ve kapsam

Yerel Git nesneleri ve ardışık commit zinciri doğrulandı:

- P1: `54a9e76d3a05c4a7b638b8340930703cbda203ae`.
- P2: `ac90aa92c9f45ac522429c43273b15eef5e09d2f`.
- P3: `0d261a37b03ec1ce970be556472036617d1fc6bb`.

Başlangıç dalı `codex/player-trade-p3`, HEAD P3, çalışma ağacı temizdi.
`P3_DELIVERY.md` P3 commitinde bulunuyor; 36 standart / 5 emülatör / 1 tarayıcı
testi kaydı tarihsel teslim kaydıdır. Bu denetimde testler yeniden çalıştırıldı.
P1→P2 ve P2→P3 farkları, mevcut HTTP/WS yolları, ortak takas motoru, iki veritabanı
adaptörü ve istemci durum yönetimi incelendi. P2→P3 farkı 24 dosya, +577/-7 satır.
GitHub'ın bu anda daha yeni bir commit içerip içermediği için fetch yapılmadı;
bu rapor kullanıcının belirttiği yerel commitler ve üzerlerindeki düzeltme içindir.

## Doğrulanan ve düzeltilen bulgular

**ENG04-01 — kilitli/yadigâr eşyanın doğrudan takasta aktarılması (yüksek).**
Bedesten `tradeLocked` ve `heirloomId` işaretlerini reddederken ortak takas motoru
eşyalarda yalnızca sahipliği ve takılı ekipmanı kontrol ediyordu. Sunucuda bu
işaretlerle bulunan eşya doğrudan takasa konabiliyordu. İki regresyon düzeltme
öncesinde `Missing expected exception` ile başarısız oldu. Motor artık hem teklif
kontrolünde hem aktarımda `item_unavailable` üretir; son onayda güncel sunucu
kaydı yeniden kontrol edilir. UI yadigâr eşyayı seçilemez gösterir.

SQLite testleri teklif reddini, tekliften sonra sunucuda kilit eklenmesini,
başarısız son onayda iki ekonominin ve ilk onayın korunmasını sınar. Firestore
regresyonu iki işaret için teklifin reddini ve hesaplar/takas kaydının değişmemesini
sınar. İşaretler güvenilir veritabanı fixture'ıyla konmuştur; istemcinin bu işaretleri
sunucuya yazabildiği veya mevcut sunucu komutlarının bunları ürettiği iddia edilmiyor.

**ENG04-02 — belirsiz yeni istekte eski başarı mesajı (orta).**
Tamamlanmış takastan sonra yeni davetin ağ yanıtı alınamazsa eski `.trade-result`
görünüyordu. Gerçek tarayıcı regresyonu düzeltme öncesinde beklenen 0 yerine 1
başarı öğesi buldu. Artık busy/pending/error varken terminal sonuç gösterilmez.
Bu bir yanıltıcı durum gösterimi hatasıydı; yeni bir ekonomik transfer yaratmıyordu.
Tarayıcı testi ayrıca sunucuda tamamlanan transferin HTTP yanıtını düşürür;
başarı mesajı gizli kalır, aynı requestId ile yeniden deneme sonrası doğru sonuç
gösterilir ve bakiyeler yalnızca bir kez 390/450 olur.

## Güvenlik kontrolleri ve kanıt sınırları

| Alan | İnceleme ve geçen testin gösterdiği |
|---|---|
| Sahte satın alma | HTTP ve WS Bedesten buy/offer `market_settlement_unavailable` döndürüyor; yerel eski eylemler ekonomi veya başarı üretmiyor. Bedesten entegrasyonu açılmadı. |
| Kimlik | HTTP cookie oturumu, WS doğrulanmış bağlantı kimliği; istemci accountId/seller göndermek yetki vermiyor. Origin, geçersiz cookie, katılımcı ve hesap değişikliği kontrolleri korunuyor. Oturum iptal gecikmesi aşağıdaki risklerde. |
| Mülkiyet | Varlıklar sunucu game state ve assetId üzerinden bulunuyor; başkasının varlığı/yetersiz bakiye reddediliyor. İstemci ekonomik snapshot'ı kabul edilmiyor. ENG04-01 eksik eşya kısıtını tamamladı. |
| Atomiklik — SQLite | BEGIN IMMEDIATE içinde iki hesap, takas, kilitler ve makbuz; ikinci hesap yazım hatası rollback. Bağımsız worker yarışında ikinci transfer yok. SQLite aynı yerel DB dosyasıyla doğrulandı; dağıtık SQLite iddiası yok. |
| Atomiklik — Firestore | runTransaction iki hesabı, rezervasyonları ve makbuzu birlikte okur/yazar. Bağımsız istemcilerle yarış ve ikinci update sırasında hata enjeksiyonu geçti. Bu emülatör kanıtıdır; üretim IAM/indeks/operasyon doğrulaması değildir. |
| Idempotency / double-spend | Hesap + requestId makbuzu ve komut hash'i, sürüm kontrolü, terminal takasın değişmezliği korunuyor. Farklı içerikle requestId tekrar kullanımı reddediliyor. Harcama/onay yarışı, kayıp yanıt tekrarları ve geç cancel testleri geçti. |
| Rezervasyon | Her executeCommand azaltıcısından sonra, yazımdan önce ortak guard çalışıyor. Altın/yiyecek bakiyesi, varlık değişimi/satışı ve ekipman takma kontrol ediliyor. Diğer takas engelleniyor; ret/iptal/süre aşımı iki kilidi atomik kaldırıyor. Eski temizlik yeni kilidi kaldıramıyor. |
| Çift onay | Teklif değişince iki onay temizlenir; revision çatışması reddedilir. P3 UI offerHash da gönderir. P2 uyumluluğunda hash isteğe bağlı olsa da revision sunucudaki değişmez içeriğe bağlıdır. |
| Yeniden bağlanma | Kalıcı trade/inbox/makbuz; eski WS sadece HTTP refresh tetikler, başarıyı doğrudan uygulamaz. Hesaba bağlı pending komut, eski stateVersion reddi, reload ve kayıp tamamlanma yanıtı testleri geçti. |

İncelenen yollar ve testlerde tek taraflı ekonomik commit veya doğrulanmamış yeni
transfer bulunmadı. Bu sonuç bütün olası hatalara ilişkin mutlak garanti değildir.

## Test sonuçları

Windows, Node v24.13.0; gerçek HTTP/WS sunucusunu kullanan iki bağımsız cookie
oturumuyla Microsoft Edge otomasyonu. İnsan katılımcı testi değildir.

| Komut / kontrol | Son sonuç |
|---|---|
| `npm test` | 38 geçti, 0 başarısız, 0 atlandı |
| `npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | 6 geçti, 0 başarısız, 0 atlandı |
| `npm run test:trade-ui` | 1 genişletilmiş senaryo geçti, 0 başarısız; 42.7 saniye |
| Değişen 5 JS dosyasında `node --check` | Geçti |
| `git diff --check` | Geçti |

İlk regresyon koşusunda iki eşya testi ve eski başarı mesajı tarayıcı kontrolü
başarısızdı; düzeltme sonrası hepsi geçti. Ara koşuda eşya testi hata mesajı yerine
`error.code` denetleyecek şekilde düzeltildi. Nihai başarısız test yok.
Firestore emülatöründe MetadataLookupWarning görüldü; test süreci 0 ile tamamlandı.
`scripts/audit_project.py` depoda olmadığı için becerideki genel görsel audit
çalıştırılamadı. Varlık/görsel dosyası değiştirilmedi.

Yerel, Git dışında tutulan kanıtlar `test-results/eng-04/` altında:

- `standard-tests.txt`, `firestore-tests.txt`, `browser-tests.txt`: tüm test adları ve sonuçları.
- `mobile-offer.png`, `mobile-lost-response.png`, `mobile-completed.png`: 390×844 Edge emülasyonu; görsel olarak incelendi.
- `uncertain-invitation.png`: masaüstünde yeni davetin belirsiz sonucu.
- `guest-reward-probe.txt`: izole bellekteki SQLite ile başlangıç altını istismarı kanıtı.

## Açıklar, blocker'lar ve ENG-05 devri

ENG-05 için ayrıntılı kabul testleri ve dosya eşlemesi `ENG05_RISKS.md` içindedir.
Yayın için özellikle şu işler açık:

- **Yüksek / politika blocker'ı:** Yeni misafir hesapların 420 başlangıç altını
  tek hesaba aktarılabiliyor. İzole denemede iki yeni hesapla alıcı 420→840→1260
  oldu. Aktarımlar çift onaylı ve atomik; sorun ücretsiz hesap üretimidir.
  Mevcut 20/dakika/IP/process sınırı bunu önlemez. Yeni ekonomi kuralı icat etmeme
  sınırı nedeniyle ödül bağlama veya takas uygunluğu kuralı bu pakette eklenmedi.
- Fiziksel telefon ve iOS/Safari testleri yapılmadı; Edge mobil emülasyonu yeterli
  gerçek cihaz kanıtı değildir.
- Çoklu sunucu oyuncu keşfi ve sunucular arası WS bildirim dağıtımı tamamlanmadı.
- Davet kabulünden önce hedef hesabın takasa kilitlenmesi taciz/DoS riski taşır;
  dağıtık hız sınırı ve reddetme sonrası koruma yok.
- Oturum önbelleği/WS periyodik kontrolü anlık iptal sağlamaz; üretim IAM/indeks,
  cleanup yükü ve makbuz saklama politikası doğrulanmayı bekler.

Bu blocker'lar varken yayın hazır onayı verilmedi. Yerel S migrasyonu ve Bedesten
satın alma entegrasyonu kapsam dışında kaldı.

## Değişen dosyalar

- `js/trade_engine.js`: eşyanın aktarılabilirlik kontrolü.
- `js/trade_ui.js`: belirsiz sonuçta başarıyı gizleme, yadigâr seçimini kapatma.
- `tests/trade_service.test.js`: iki SQLite güvenlik regresyonu.
- `tests/firestore_store.integration.js`: Firestore eşya kısıtı regresyonu.
- `tests/trade_ui.e2e.js`: kayıp tamamlanma yanıtı, belirsiz yeni davet ve tekrar deneme.
- `TRADE_SERVICE.md`, `P3_DELIVERY.md`: denetim sonrası davranış/kayıt bağlantıları.
- `ENG04_SECURITY_AUDIT.md`, `ENG05_RISKS.md`: teslim ve sonraki inceleme kaydı.

P1 market servisi, eski Bedesten eylemleri, HTTP/WS kimlik sınırı ve P2 veritabanı
transaction kodu değiştirilmedi. Ortak motorun eşya doğrulaması sıkılaştırıldı.
