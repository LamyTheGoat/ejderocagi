# Entegrasyon durumu

Oyun yayınlanmadığı ve korunacak oyuncu hesabı olmadığı için localStorage
kayıtlarını sunucuya taşıyan bir migrasyon sistemi geliştirilmeyecek.

İlk aşama uygulandı: `server/economy_store.js`, `server/guest_session.js` ve
`server/public_files.js`; server.js HTTP/WS ve net.js kimlik bağlantıları.
Çalışma sözleşmesi, kurulum ve sınırlamalar [SERVER_FOUNDATION.md](SERVER_FOUNDATION.md)
içindedir. `npm test` tüm otomatik testleri çalıştırır.

## Sıradaki küçük aşamalar

1. **Oyun başlangıcı:** Başlangıçtaki 420 altın, Kor ve ilk yumurtayı gerçek oyun
   kurallarından sunucuda üret. Hesap/kayıt yuvası ve yeni oyun sıfırlama
   sözleşmesini belirle; başlangıç ödüllerinin yeniden oluşturularak takasa
   sokulmasını engelle.
2. **Ekonomi komutları:** Ödül/harcama, eşya edinimi/kullanımı, ejderha ve yumurta
   yaşam döngülerini sırayla sunucuya taşı. Sunucu miktarı, rastgele sonucu ve
   sahipliği belirlesin. Yerel ekonomik snapshot kabul etme.
3. **Varlık kuralları:** Global assetId ile yerel görünüm referanslarını bağla;
   ekipman, soy ağacı, görev, kapasite, negatif altın/borç davranışını modelle.
4. **Takas servisi:** Mevcut trade_engine çekirdeğini gerçek hesap şemasına uyarla.
   İki katılımcı, tek aktif takas, rezervasyon, teklif revision, iki taraflı onay,
   idempotency ve atomik işlem günlüğünü oluştur.
5. **Ağ akışı:** Davet/ret/teklif/onay/iptal, teklif değişince iki onayın sıfırlanması,
   kopma/süre aşımı ve commit sonrası cevap kaybı kurtarmasını test et.
6. **Arayüz:** Sosyal oyuncu kartından doğrudan takas; sunucunun gönderdiği
   sürümlü durumla görüntüle. BroadcastChannel sonucuyla ekonomi değiştirme.

Sunucu kalıcı commit tamamlamadan başarı bildirmemeli. Fiziksel pazar/tezgâh
özelliği eklenmeyecek. Eski pazar ve diğer oyun mutasyonları SQLite'a bağlanmadan
önce aynı ekonomi servisinin yetki ve rezervasyon kontrollerine alınmalı.

## P1 güvenlik düzeltmesi

Ortak Bedesten doğrulayıcısı ve sunucu oturumundan satıcı kimliği tamamlandı.
Sunucuda sahipliği olmayan varlık ilanı reddedilir. Güvenli transfer bağlı olmadığı
için satın alma ve teklifler hata verir; eski UI ekonomik mutasyonları kapalıdır.
Windows test kapanışı IPC ile doğrulanır. Bir sonraki onaylı aşama, accountId/assetId
üzerinden iki hesaplı transaction ve rezervasyon/onay durum makinesidir;
bu pakette takas entegrasyonuna başlanmamıştır.
