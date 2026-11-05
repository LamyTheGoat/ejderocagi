# Sunucu temeli — aşama 1

Bu aşama kalıcı misafir kimliğini ve ayrı bir SQLite ekonomi deposunu kurar.
Mevcut oyun fiyatları, ödülleri, envanteri ve localStorage akışları dönüştürülmedi.
Eski kayıt aktarımı/migrasyonu yoktur. Takas servisi ve arayüzü henüz bağlı değildir.

## Çalıştırma

Node 22.13+ (22 serisi) veya 23.4+ gerekir; harici npm paketi yoktur.
Docker ve Render Node 22 kullanır. `node:sqlite` bu sürümlerde deneysel uyarı verebilir.

```sh
npm test
npm start
```

`DATA_DIR` kalıcı, yalnızca sunucuya ait bir disk dizini olmalıdır. Varsayılan
`data/` HTTP üzerinden sunulmaz. `economy.sqlite` ve WAL/SHM yan dosyaları
aynı dizindedir. Açık veritabanının yalnızca ana dosyasını kopyalamak yedekleme
sayılmaz; ileride SQLite backup veya durdurulmuş sunucu yedeği kullanılmalıdır.
Bu temel tek Node sunucusu ve yerel kalıcı disk için hazırlanmıştır.

`PUBLIC_URL` tarayıcıda açılan tam dış adres olmalıdır (geliştirmede varsayılan
http://localhost:3000). Origin karşılaştırması bu adresle yapılır; Host ve
X-Forwarded-* başlıkları güvenilir adres kaynağı sayılmaz. Üretimde HTTPS gerekir;
misafir çerezi Secure ve __Host- öneki kullanır. Geliştirmede HTTP desteklenir.

## Kimlik ve API

- `POST /api/session`: İstek gövdesini kimlik/varlık kaynağı olarak kullanmaz.
  Geçerli çerez varsa aynı hesabı döndürür. Çerez yoksa sunucu UUID accountId,
  kalıcı @gezgin_ mahlası ve 256 bit rastgele oturum belirteci üretir.
- Çerez HttpOnly, SameSite=Strict ve bir yıl ömürlüdür. SQLite yalnızca SHA-256
  belirteç özetini saklar. Yeniden başlatma kimliği değiştirmez.
- Geçersiz, süresi dolmuş veya iptal edilmiş çerez 401 verir; sessiz hesap
  değiştirme yapılmaz. Çerez kaybı için kurtarma/cihazlar arası giriş henüz yoktur.
- Tüm kayıt yuvaları aynı misafir kimliğini paylaşır. Web Locks bulunan
  tarayıcılarda ilk oturum oluşturma sekmeler arasında sıraya alınır.
- Yeni hesap oluşturma doğrudan bağlantı IP'si başına dakikada 20 ile sınırlıdır.
  Reverse proxy arkasında bu sınır paylaşılabilir; dağıtık/trusted-proxy hız
  sınırlaması henüz yoktur.
- `GET /api/economy`: Yalnızca çerez sahibinin bakiyesini/varlıklarını döndürür.
  Query veya gövdedeki accountId başka hesaba erişim sağlamaz. Yazma API'si yoktur.
- HTTP gönderici alanları ve WebSocket göndericisi oturumdan türetilir.
  WS yükseltmesi geçerli oturum ve doğru Origin ister. Kimlik her veri paketinde
  yeniden doğrulanır. TCP'de bölünen çerçeveler tamponlanır, boyutlar sınırlıdır;
  continuation/fragmented WS mesajları bu aşamada desteklenmez, bağlantı kapanır.
- X girişi mevcut doğrulama rozetini sağlayabilir; ekonomi hesabını değiştirmez.
  X ile kalıcı hesap bağlama/birleştirme ve kurtarma bu aşamanın dışında kalır.

## Ekonomik güven sınırı

Yeni SQLite hesapları **0 altın ve boş varlık listesiyle** başlar;
`economyReady: false` döner. Bu değerler oyun ekranındaki `S` nesnesine yazılmaz.
Oyunun başlangıçtaki 420 altını, Kor'u ve yumurtası halen yerel oyun kaydındadır.
Sunucuda başlangıç paketini oluşturma, yeni oyun/yuva kuralları ve tüm kazanım/
harcama işlemleri sonraki aşamada taşınmalıdır. Her girişte başlangıç paketi
verilmez ve yerel veriden server envanteri oluşturulmaz.

`WORLD` sosyal dünya/profil simülasyonudur. `/api/sync` içindeki yıldız ejderha,
savaşçı, başarı veya diğer eski oyun mesajları sahiplik kanıtı sayılmaz ve
SQLite ekonomisini değiştiremez. `/api/sync` doğrudan ekonomik snapshot
alanlarını reddeder. Mevcut pazar/dövüş/ödül akışları güvenli ekonomi servisi
olarak kabul edilmemelidir; henüz yerel/simülasyon akışlarıdır.

## SQLite ve transaction sözleşmesi

`accounts`, `sessions`, `balances`, `assets` tabloları; STRICT türler,
foreign key, altın aralığı, tekil global varlık kimliği ve tek sahip ilişkisi.
Eşya/ejderha/yumurta verileri JSON payload olarak saklanır; payload oyun modeli
henüz bütün ayrıntılarıyla doğrulanmaz. `assetId` gerçek sunucu kimliğidir;
payload içindeki yerel id/uid/accountId sahiplik veya kimlik kanıtı değildir.

`economy_store.transaction(fn)` yalnızca güvenilir sunucu modüllerince çağrılır.
Callback senkron olmalıdır. BEGIN IMMEDIATE / COMMIT / ROLLBACK, WAL ve
synchronous=FULL kullanılır. Altın değişimi ve varlık aktarımı aynı işlemde
birlikte kalıcılaşır; hata veya süreç kesintisinde geri alınır. moveAsset mevcut
sahibi koşullu UPDATE ile denetler. Callback dışına taşan işlem tutamaçları
kapatılır. Bu altyapı henüz karşılıklı onay, rezervasyon veya tekrar istek
koruması olan bir takas servisi değildir.

Negatif bakiye bu depoda kabul edilmez. Yerel oyundaki haftalık borç davranışı,
kapasite, soy ağacı, ekipman ve görev kuralları ekonomiyi taşırken ayrıca
modellenmelidir; bu aşama bu mekanikleri değiştirmez.

## Dosya erişimi

Yalnızca index.html, style.css, index.html içindeki istemci scriptleri ve
img/assets/sfx altındaki izinli medya türleri sunulur. Sunucu modülleri, testler,
.git, .env, SQLite/WAL/SHM ve world.json sunulmaz. Path traversal ve symlink
aliasları reddedilir. SVG paylaşım kartındaki profil metinleri escape edilir.

## Sonraki aşama

1. Sunucu kaynaklı yeni oyun başlangıcı ve oyun/yuva modeli.
2. Ekonomi komutlarının küçük dilimlerle sunucuya taşınması ve domain doğrulaması.
3. Rezervasyonlar, işlem günlüğü/idempotency ve sürümlü takas durum makinesi.
4. Teklif değişince onay sıfırlama, kopma/iptal ve iki taraflı UI.
5. Misafir kurtarma, isteğe bağlı X bağlama, operasyonel yedekleme ve izleme.

Fiziksel pazar/tezgâh geliştirmesi yoktur.
