# Ejder Ocağı — sunucu kimliği ve ekonomi temeli

Kalıcı misafir hesabı, transaction destekli SQLite deposu ve bağımsız doğrudan
takas çekirdeği içerir. X hesabı misafir oturumu için gerekli değildir.

## Çalıştırma ve test

Node 22.13+ (22 serisi) veya 23.4+ kullanın. Firestore SDK için önce `npm ci` çalıştırın.

```sh
npm start
npm test
```

Oyun varsayılan olarak http://localhost:3000 adresindedir. Farklı adres veya
portta `PUBLIC_URL` değerini tarayıcının kullandığı origin ile eşleştirin.
Üretimde HTTPS ve kalıcı `DATA_DIR` gerekir.

## Bu aşamada tamamlananlar

- Sunucu tarafından oluşturulan accountId ve kalıcı HttpOnly misafir oturumu.
- Altın, eşya, ejderha ve yumurta için ayrı SQLite sahiplik deposu.
- Transaction içinde birlikte commit/rollback; sahiplik ve bakiye kontrolleri.
- HTTP/WebSocket gönderen kimliğinin oturumdan alınması.
- Özel dosyaların genel statik sunucudan çıkarılması.
- Oturum, atomiklik, süreç kesintisi, erişim ve istemci uyumluluk testleri.

## Henüz bağlı olmayanlar

Mevcut oyun ekonomisi ağırlıklı olarak tarayıcıdaki `S` nesnesinde çalışır.
Yerel kayıtlar SQLite'a aktarılmaz. SQLite hesapları boş başlar ve API
`economyReady: false` döndürür; bu durum mevcut oyun bakiyesini değiştirmez.

`js/trade_engine.js` bağımsız transfer çekirdeğidir. Karşılıklı onaylı takas
servisi, rezervasyonlar, tekrar istek koruması ve takas arayüzü henüz yoktur.
Mevcut dünya/profil/pazar verileri güvenilir ekonomik sahiplik kanıtı değildir.
Fiziksel pazar ve tezgâh geliştirmesi kapsam dışındadır.

Ayrıntılı sözleşme ve sınırlar: [SERVER_FOUNDATION.md](SERVER_FOUNDATION.md).
Sıradaki işler: [INTEGRATION_NOTES.md](INTEGRATION_NOTES.md).

## Ticaret güvenliği P1

Bedesten satın alma ve teklifleri, iki hesaplı güvenli transfer bağlanana kadar
HTTP ve WebSocket üzerinde `market_settlement_unavailable` hatasıyla reddedilir.
Eski arayüzün yerel alım/satım/ilan mutasyonları kapalıdır; altın veya varlık değişmez.
İlan API'si yalnızca sunucu ekonomisinde oturuma ait `assetId` için bağlayıcı olmayan
ilan kabul eder. Takas çekirdeği henüz bu API'ye bağlı değildir. Ayrıntılar:
[SERVER_FOUNDATION.md](SERVER_FOUNDATION.md#ticaret-güvenliği-p1).
