# Oyuncular arası takas servisi · P2

P1 temelinden geliştirilmiştir. Bedesten satın alma/teklif yolları kapalı kalır.
Bu servis bağımsız doğrudan takastır; mevcut oyun UI'sine bir takas ekranı eklemez.

## Mimari ve garantilerin sınırı

`server/trade_service.js` komut doğrulamasını, durum makinesini ve rezervasyon
kontrolünü paylaşır. `js/trade_engine.js` altın, yiyecek ve varlık aktarım kurallarını
uygulamaya devam eder. Uyarlama katmanı katılımcıları accountId, varlıkları assetId
ile eşler; alıcıda yerel uid/id değerlerini yeniden ayırır, yıldız ejderha referansını
ve taşınan soy ağacı referanslarını düzeltir. İstemci envanter snapshot'ı kabul edilmez.

SQLite: game_states, trade_records, trade_locks ve trade_receipts aynı veritabanında
BEGIN IMMEDIATE/COMMIT kapsamındadır. Başarısız yazma tamamını rollback eder.
Firestore: eo_accounts, eo_trades, eo_trade_locks ve eo_trade_receipts aynı SDK
transaction'ında okunup yazılır. Tüm okumalar yazmalardan önce yapılır. Transaction
retry içinde ağ bildirimi, rastgele ödül veya başka dış yan etki bulunmaz.

İkinci onayda iki ekonomi sürümü birlikte artar. Böylece eski expectedVersion ile
bekleyen ekonomi komutları da çatışır. Her ekonomi komutu reducer sonrasında,
kalıcı yazımdan önce aynı transaction içinde rezervasyonu denetler. Altın/yiyecek
rezervinin altına düşme ve rezerve varlığı satma, tüketme, değiştirme veya kuşanma
reddedilir. Eski transaction() API'si oyun başlamış hesaplarda zaten kapalıdır.

Her hesap aynı anda tek açık takasta bulunur. Davet dahil toplam süre sunucu
saatine göre 5 dakikadır; teklif değiştirerek süre uzatılamaz. Süre aşımı mantıksal
olarak expiresAt anında geçerlidir. Fiziksel durum/rezervasyon temizliği sonraki
get/komutta transaction içinde yapılır (lazy expiration); arka plan zamanlayıcısı
yoktur. Süresi dolan eski takas, daha yeni takasın rezervasyonunu silemez.
Ret, iptal ve tamamlama iki rezervasyonu aynı transaction'da kaldırır.

## HTTP / WebSocket sözleşmesi

Kimlik yalnızca mevcut HttpOnly sunucu oturumundan gelir. Origin ve oturum
kontrolleri geçerlidir. HTTP: POST /api/trade, JSON body aşağıdaki komutlardan biri.
WS: {"type":"trade_command","command":<aynı komut>}.
Bütün komutlar UUID requestId ister. Katılımcı kimlikleri sunucu accountId UUID'leridir.

| type | requestId dışında alanlar | Davranış |
|---|---|---|
| invite | targetId | Takas kimliği requestId olur; iki hesapta açık takas kilidi oluşturur. |
| accept | tradeId | Yalnızca davet edilen oyuncu; invited → active. |
| reject | tradeId | Yalnızca davet edilen oyuncu; invited → rejected. |
| offer | tradeId, revision, offer | Kendi teklifini değiştirir; revision artar, iki onay sıfırlanır. |
| confirm | tradeId, revision | Güncel teklif sürümünü onaylar; ikinci onayda atomik transfer. |
| cancel | tradeId | Katılımcı açık takası iptal eder. |
| get | tradeId | Katılımcıya güncel kalıcı durum; gerekirse süre aşımını işler. |

Offer: {gold, items:[assetId], dragons:[assetId], eggs:[assetId], food:{key:quantity}}.
Eksik teklif alanları sıfır/boş kabul edilir. Teklifler sunucudaki mevcut sahiplik ve
bakiyeyle doğrulanır. Miktar ve varlık sınırları mevcut trade_engine kurallarındandır.

Başarı: {ok:true,trade,replayed} (HTTP); WS sonucu trade_state tipindedir ve yalnızca
aynı sunucudaki katılımcı bağlantılarına gönderilir. trade içinde id, participants,
status, revision, offers, approvals, expiresAt ve tamamlandıysa completedAt bulunur.
Hatalar HTTP'de ok:false/error; WS'de trade_error/error/requestId döner.
Örnek hata kodları: trade_busy, trade_revision_conflict, trade_not_found,
request_id_reused, trade_reserved_gold, trade_reserved_food, trade_reserved_asset.

Aynı requestId ve içerik yeniden geldiğinde kayıtlı işlem sonucu döner; farklı
komut içeriğiyle kimliğin tekrar kullanılması reddedilir. get için her defasında yeni
requestId kullanılmalıdır. Makbuz geçmiş sonucu döndürdüğünden güncel durum için
get çağrılır. Terminal duruma gelen takasa geç onay/iptal transfer yapmaz, terminal
durumu döndürür. Bağlantı kopması onay veya transferi geri almaz. İstemci requestId,
komut ve tradeId'yi saklayıp yanıt kaybında aynı komutu tekrar göndermelidir.

## Test çalıştırma ve operasyonel sınırlar

npm ci
npm test
npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"

Entegrasyon test dosyası yalnızca 127.0.0.1 Firestore emülatörüyle çalışır. Üretim
IAM/dağıtım ayarları bu testlerle doğrulanmış sayılmaz. SQLite bağımsız worker
bağlantılarıyla yarış ve ikinci hesap UPDATE hatasıyla rollback test edilir.
Firestore bağımsız istemcilerle concurrency/replay ve transaction abort test edilir.

WS bildirimleri kalıcı mesaj kuyruğu değildir; farklı sunucu örneklerindeki oyuncu
get ile durumu okuyabilir. Sunucu yeniden başlatma ve ağ kopması kalıcı takası
silmez. Aktif takas keşif listesi ve oyuncu takas UI'si bu pakette yoktur; istemci
tradeId'yi saklamalıdır. Makbuz/arşiv temizleme ve takas isteğine özel dağıtık hız
sınırlaması henüz yoktur. İlan verileri ve Bedesten ekonomik transferi bu servise
bağlanmamıştır. Ani süreç/işletim sistemi kaybı dünya JSON'unu etkileyebilir; takas
kalıcılığı WORLD/world.json'a dayanmaz.

## Bu geliştirmede çalıştırılan doğrulama

- Node v24.13.0, Windows: `npm test` → 33 geçti, 0 başarısız.
- Firebase CLI 15.35.0 / Firestore emulator 1.22.0: yukarıdaki emulators:exec
  komutuyla 4 entegrasyon testi geçti, 0 başarısız. Demo proje dışında işlem yapılmadı.
- Değişen sunucu JavaScript dosyalarında node --check ve git diff --check geçti.
- İlk Firestore denemesi eksik @google-cloud/firestore bağımlılığı nedeniyle
  başlayamadı; mevcut package-lock ile npm ci sonrası tüm emülatör testleri geçti.
- İlk HTTP/WS P2 denemesinde SQLite'ın senkron sonucuna .then uygulanması hatası
  bulundu; ortak Promise sınırıyla düzeltildi ve test yeniden geçerek doğrulandı.
- Beceri yönergesindeki scripts/audit_project.py depoda bulunmadığından çalışmadı.
  Görsel/asset değişikliği yapılmadı; üretim ortamında test veya dağıtım yapılmadı.

## P3 · Oyun içi entegrasyon

Oyunda sağdaki **Takas** düğmesi ve sosyal paneldeki takas eylemi, oyun dışına
çıkmadan sunucu envanteri ekranını açar. `js/trade_client.js` oturum, tekrar istek,
kalıcı bekleyen komut ve durum senkronizasyonunu; `js/trade_ui.js` davet/teklif/onay
arayüzünü yönetir. Sunucu hesabı yoksa mevcut idempotent game.start komutu kullanılır.
Yerel S, kayıt yuvaları ve altın/envanter değerleri okunup sunucuya aktarılmaz veya
sunucu sonucuyla üzerine yazılmaz. Ekranda bu ayrım açıkça yazılıdır.

Yeni oturum bootstrap işlemi mevcut net.js ile aynı Web Locks anahtarını kullanır.
Komutlar X-Trade-Account başlığı taşır; cookie hesabıyla uyuşmazsa sunucu reddeder.
Bu kontrol sunucu hesabı başlatma komutunda da uygulanır. Bekleyen komut hesap bazında
localStorage'da saklanır; hesap değişince başka hesaba tekrar gönderilmez.

GET /api/trade/peers: doğrulanmış bağlı WebSocket oturumlarından accountId/handle
listesi. NPC veya istemci isLive değeri bu listeye kaynak değildir.
GET /api/trade/state: oturum sahibinin açık/son takası, kendi sunucu ekonomisi,
yalnızca teklif edilen varlıkların görünüm etiketleri ve serverNow döner.
Her iki endpoint oturum gerektirir. Last-trade inbox davette kalıcı kaydedilir.
P2'den kalmış açık takaslar mevcut rezervasyon üzerinden bulunabilir; eski, bitmiş
ve inbox kaydı olmayan takas için bilinen tradeId ile P2 get komutu kullanılabilir.

stateVersion her kalıcı durum değişiminde artar; teklif revision'ından ayrıdır.
Onay arayüzü revision ile beraber sunucunun offerHash özetini gönderir. Sunucu
uyuşmazlığı reddeder. P2 istemcileri için hash alanı isteğe bağlıdır; onların onayı
da yalnızca değişmez teklif revision'ına bağlıdır. Yeni UI hash olmadan onay göndermez.

WebSocket trade_state/trade_error yalnızca güncel durumu okumayı tetikler; bildirim
veya eski makbuz doğrudan başarı ekranı üretmez. Sunucu state+economy yanıtı okunmadan
başarı gösterilmez. Aynı takasta daha düşük stateVersion uygulanmaz. Bağlantı kaybında
bekleyen sonuç doğrulanmamış olarak gösterilir, aynı requestId ile yeniden denenir.
Açık ekranda 5 saniyelik durum yenilemesi bildirim kaybını da telafi eder.

## P3 · Süre aşımı temizliği

Sunucu açılışında ve 15 saniyede bir, en fazla 50 kayıtlık cleanup çalışır; aynı
process içinde üst üste binmez. Her takas, P2 transition ve aynı veritabanı transaction'ı
ile expired yapılır ve iki rezervasyon birlikte kaldırılır. Tekrar çalıştırmak güvenlidir;
terminal takası veya daha yeni takasın kilidini değiştirmez. Mevcut işlem anı kontrolü
korunur, dolayısıyla cleanup gecikse de süresi geçmiş teklif tamamlanamaz.

SQLite trade_due zaman indeksi ve trade_inbox tabloları eklenir; P2 aktif kayıtlar
başlangıçta indekse alınır. Firestore eo_trades.expiresAt sayısal alanı kullanılır;
terminal kayıtta null olur. P2 kayıtları 50'lik sayfalarda, güncel durumu yeniden okuyan
transaction ile arka planda dönüştürülür. Firestore'un varsayılan tek alan expiresAt
indeksi gerekir; JSON alanlarının gereksiz indeksleri firestore.indexes.json ile
kapatılmıştır. Bu çalışma canlıya indeks/rule dağıtımı yapmaz.

## P3 testleri ve kalan sınırlar

- npm test: istemci sıralama/hesap ayrımı, içerik bağlı onay, inbox ve SQLite cleanup
  testleri dahil çalıştırılır; P1/P2 testleri korunmuştur.
- npm run test:firestore: yerel emülatörde P2 geçişi ve iki bağımsız cleanup çağrısı
  dahil çalıştırılır.
- npm run test:trade-ui: Playwright, kurulu Microsoft Edge kanalında masaüstü
  1280×800 ve mobil emülasyon 390×844 için iki bağımsız cookie oturumu açar.
  Oyunun gerçek HTTP/WS sunucusunda UI üzerinden başlatma, davet, kabul, değişen
  teklifle onay sıfırlama, sayfa yenileme, çift onay ve iki sunucu bakiyesi doğrulanır.
  Ekran görüntüleri test-results/trade-ui altında üretilir; Git'e eklenmez.

Fiziksel telefon/iOS Safari ve gamepad testi yapılmadı; mobil test Edge emülasyonudur.
Çevrimiçi oyuncu keşfi hâlen aynı sunucunun WS bağlantılarıyla sınırlıdır; çok instance
arasında presence dizini ayrıca gerekir. Açılmış takasların Firestore kalıcılığı ve
HTTP durum sorgusu instance'dan bağımsızdır. Dağıtık hız sınırlaması ve makbuz arşiv
temizliği P2'deki gibi henüz yoktur. Bedesten satın alma ve genel yerel ekonomi
migrasyonu kapalı/kapsam dışıdır. Üretim IAM, indeks dağıtımı ve gerçek cihazlar
ayrı yayın doğrulaması gerektirir.

## ENG-04 · Güvenlik denetimi sonrası

Ortak takas motoru artık `tradeLocked` veya `heirloomId` taşıyan eşyayı teklif
doğrulamasında ve son aktarımda `item_unavailable` ile reddeder. UI yadigâr eşyayı
seçime kapatır. Bekleyen komut, ağ hatası veya devam eden işlem varken önceki
terminal takasın başarı mesajı gösterilmez. Tamamlanan transferin yanıtı kaybolursa
aynı requestId ile tekrar ve sunucu durum okuması gerekir.

2026-11-06: 38 standart, 6 Firestore emülatör ve 1 genişletilmiş iki oturumlu
Edge testi geçti. Kanıt sınırları ve yeniden üretilen bulgular
`ENG04_SECURITY_AUDIT.md`, açık yayın riskleri `ENG05_RISKS.md` içindedir.
Özellikle başlangıç altınının yeni misafir hesaplardan biriktirilmesi için politika
kararı gerekir; gerçek cihaz/Safari ve çoklu sunucu keşfi doğrulanmadı.
