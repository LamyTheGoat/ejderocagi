# Ocak Bedesteni: Takas Çekirdeği (ilk teknik aşama)

Bu paket, oyundaki doğrudan oyuncu takasının **varlık transfer çekirdeğini** içerir.

## İçerik

- `js/trade_engine.js`: Bağımsız ve sunucu tarafında kullanılmak üzere tasarlanmış takas doğrulama/transfer motoru.
- `tests/trade_engine.test.js`: Node.js yerleşik `assert` modülüyle çalışan testler.
- `INTEGRATION_NOTES.md`: Mevcut oyuna bağlamadan önce çözülmesi gereken veri otoritesi ve entegrasyon işleri.

## Test

Proje kökünde:

```bash
node tests/trade_engine.test.js
```

Beklenen çıktı:

```text
PASS: atomic two-sided transfer, gold, items, dragons, eggs, food, ownership, equipment and incubation guards.
```

## Önemli: Bu henüz oyuna bağlanmış bir takas sistemi değil

Bu aşamada `server.js`, `net.js` veya `bag_social.js` değiştirilmedi. Motor yalnızca sunucunun zaten otorite kabul ettiği iki hesabın verisini güvenli biçimde değiştirir.

Mevcut oyunda altın, yiyecek, eşya, ejderha ve yumurta değişikliklerinin önemli bir bölümü tarayıcıdaki `S` nesnesinde ve `localStorage` kayıtlarında gerçekleşiyor. Bu kaynaklardan gelen ilk envanter aktarımı oyuncu tarafından değiştirilebildiğinden, tek başına güvenilir sahiplik kanıtı değildir.

Motoru doğrudan WebSocket'e bağlamak, istemcinin sahte varlık üretmesini engellemez. Tam güvenlik için aşağıdaki entegrasyon aşamaları tamamlanmalıdır:

1. Kalıcı, sunucu tarafından imzalanan oyuncu kimliği (misafir ve X hesabı).
2. İlk kayıt aktarımı için açık bir politika. Mevcut yerel kayıtların gerçekliğini geriye dönük kanıtlamak mümkün değildir.
3. Oyun ekonomisinin sunucu otoritesine taşınması veya güvenilir sunucu olaylarıyla güncellenmesi. Özellikle ödül, satın alma, satış, üretim, yumurtlama, kuluçka, ejderha yakalama ve kayıp akışları.
4. Hesapların sunucu tarafında kalıcı saklanması ve takas tamamlanırken senkron/durable commit.
5. Kimliği doğrulanmış WebSocket üzerinden davet, teklif, onay, iptal ve yeniden bağlanma protokolü.
6. İki oyunculu uçtan uca test.

## Tasarım kararları

- Teklif değiştiğinde iki tarafın da onayı sıfırlanmalı.
- Aynı oyuncu aynı anda yalnızca bir takasta bulunmalı.
- İstemci varlık sahipliğini veya fiyatı belirleyemez.
- Takas sırasında tüm teklif yeniden doğrulanmalı.
- Bir tarafın varlıklarından biri bile geçersizse iki tarafın hesabı da değişmemeli.
- Üzerinde ekipman bulunan ejderhalar ilk sürümde takas edilemez. Ekipman ayrı teklif olarak aktarılabilir.
- Kuluçkadaki yumurtalar ve meşgul/ölü/yaşlı ejderhalar takas edilemez.
- Sunucu kalıcı yazımı tamamlamadan istemcilere başarı mesajı gönderilmemeli.

Bu çekirdek Node.js yerleşik API'leri dışında bağımlılık kullanmaz.
