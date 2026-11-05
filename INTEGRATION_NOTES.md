# Entegrasyon notları: mevcut Ejder Ocağı kod tabanı

İncelenen mevcut yapı:
- `server.js`: JSON tabanlı `WORLD` kaydı, HMAC imzalı X oturumu ve ham WebSocket.
- `js/net.js`: WebSocket bağlantısı ve `/api/sync`.
- `js/core.js`: `S` oyun kaydı `localStorage` içinde.
- `js/bag_social.js`: arkadaşlar/özel mesajlar/parti arayüzü.
- Ekonomi değişiklikleri: `js/hub.js`, `js/week.js`, `js/pazar.js`, `js/auction.js`, `js/endgame.js`, `js/kiraathane.js`, `js/orders.js`, `js/career.js`, `js/cosmetic.js`, `js/race.js`, `js/star.js`, `js/lineage.js` ve `js/ui.js` dahil farklı dosyalara dağılmış durumda.

## Neden tek seferde bağlamıyoruz?

Takas motoru sunucu tarafında otorite kabul edilen hesaplar arasında atomik transfer yapabilir. Fakat mevcut oyun ekonomisinin otoritesi istemci tarafında. Örneğin `hub.js` keşif ödülü olarak altın/yumurta verebiliyor; `pazar.js` oyuncunun altınını düşürüp ejderha veya eşya ekliyor; `week.js` haftalık ödüller ve kuluçka sonucu varlık üretiyor.

Bunlar sunucuya güvenilir olaylar olarak taşınmadan istemciden gelen envanter snapshot'ını kabul etmek, oyuncunun kendi kendine altın veya ejderha eklemesine kapı bırakır. İlk snapshot'ı bir kez kabul etmek bu açığı yalnızca ilk aktarım anına taşır; ortadan kaldırmaz.

## Sıradaki entegrasyon sırası

1. `WORLD.tradeAccounts` ve `WORLD.tradeHistory` kalıcı veri şemasını ekle.
2. Misafir oyuncular için X oturumundan ayrı, HMAC imzalı ve HttpOnly `eo_guest` çerezi oluştur. WebSocket kimliği yalnızca bu çerez veya X oturumundan türetilsin; `msg.handle` / `msg.from` kimlik olarak kabul edilmesin.
3. Hesap kayıt aktarımını tasarla. Mevcut yerel kayıtların doğrulanamayan geçmişini açıkça belirt; doğrulanmış hesaplar için hesap sahipliği kurallarını koru.
4. Ekonomi mutasyonlarını tek bir servis/API üzerinden sunucu otoritesine taşı. Her oyun eylemi için istemci yalnızca niyet/komut göndersin; ödül miktarını veya yeni varlığın içeriğini istemci belirlemesin.
5. `trade_invite`, `trade_reply`, `trade_offer`, `trade_ready`, `trade_cancel` WS olaylarını ekle.
6. `applyTrade()` sonucunu `flushWorldSync()` benzeri senkron/durable yazımla kalıcılaştır. Yazım başarısızsa eski hesapları koru ve başarı yayınlama.
7. UI: sosyal çekmeceye Takas sekmesi ve iki taraflı teklif paneli ekle.
8. İki gerçek hesapla tarayıcı uçtan uca testi yap.

## Test kapsamı

Çekirdek testleri:
- iki taraflı altın transferi
- eşya, ejderha, yumurta ve yiyecek transferi
- yetersiz altın/yiyecek
- sahip olunmayan varlık
- yinelenen UID/ID
- ekipmanlı ejderha
- ekipmanı takılı eşyanın tek başına takası
- kuluçkadaki yumurta
- geçersiz/ek alan içeren teklif
- hata durumunda kaynak hesapların değişmemesi
