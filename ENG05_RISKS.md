# ENG-05 · ENG-04'ten açık risk ve doğrulama devri

Tarih: 2026-11-06. Kaynak: `ENG04_SECURITY_AUDIT.md` ve yerel ENG-04 commit'i.
Bu belge iş listesidir; aşağıdaki uygulamalar veya yayın işlemleri yapılmış değildir.

| Öncelik / konu | Kanıt ve etki | ENG-05 kapanış koşulu | İlgili dosyalar |
|---|---|---|---|
| Yüksek — misafir başlangıç ödülü biriktirme | Her yeni misafir game.start ile 420 altın alır; çift onaylı takasla ana hesaba aktarabilir. İzole SQLite denemesinde 420→840→1260. Bir hesapta game.start idempotency'si yeni hesapları engellemez. | Ürün sahibinin onayladığı ödül/takas uygunluğu politikası; HTTP üzerinden çok hesaplı istismar testi ve iki backend regresyonu. Politika kararı olmadan yeni ekonomi kuralı ekleme. Yayın blocker'ı. | server.js, server/economy_commands.js, server/trade_service.js, iki store adaptörü |
| Yüksek — fiziksel telefon / Safari doğrulaması eksik | Yalnız Edge 390×844 ve masaüstü otomasyonu geçti. Gerçek iOS/Safari test edilmedi. | Gerçek iPhone Safari + Android cihazda iki hesapla teklif/onay; klavye ve modal kaydırma, arka plana alma, ağ değişimi, tekrar deneme ve hesap değişimi. Cihaz/OS/sürüm ve ekran kanıtı kaydet. | js/trade_ui.js, js/trade_client.js, js/net.js, style.css, tests/trade_ui.e2e.js |
| Yüksek — çoklu sunucu keşfi tamamlanmadı | /api/trade/peers yalnız o process'in WS_CLIENTS listesinden üretilir; bildirimler yereldir. Farklı instance'daki oyuncular UI'da birbirini bulamayabilir. | Ortak presence tasarımı onayı; iki ayrı Node örneğine sabitlenmiş iki tarayıcıyla keşif, davet, durum yenileme, bağlantı taşıma ve sunucu kaybı. Paylaşılan Firestore kalıcılığını keşif tamamlandı diye raporlama. | server.js, js/net.js, js/trade_client.js, yeni çoklu instance E2E altyapısı |
| Orta — davet tacizi / işlem yükü | Davet anında hedefin kilidi de alınır; hedef kabul etmeden başka takası engellenebilir. Reddetmek kilidi kaldırır fakat yeniden davet mümkündür. Takasa özel dağıtık hız limiti yok. | Kabul öncesi davet ve koruma politikası kararı; çok saldırganlı davet/ret ve HTTP/WS ortak limit testleri. | server/trade_service.js, server.js, iki store adaptörü |
| Orta — oturum iptal gecikmesi | guest_session 60 saniye önbellek kullanır; WS 60 saniyede bir yeniden kontrol edilir. İptal anında devam eden bağlantı hemen kapanmaz; zamanlamaya göre önbellek + kontrol aralığı yaklaşık 120 saniyeye yaklaşabilir. Süresi dolmuş cookie ayrı olarak paket anında reddedilir. | Ekonomik komutlarda istenen iptal SLA'sını belirle; HTTP/WS ve birden fazla instance'da iptal sonrası yetki kullanımını zaman kontrollü test et. Kod incelemesi bulgusu; bu gecikmenin uçtan uca testi ENG-04'te yapılmadı. | server/guest_session.js, server.js, tests/session_cache.test.js, tests/server_foundation.test.js |
| Orta — üretim altyapısı / cleanup yükü | Emülatör testleri geçti; üretim IAM, indeks ve operasyon doğrulanmadı. Cleanup 15 saniyede 50 kayıt; arşiv/makbuz saklama sınırı yok. | Yetkisiz istemci DB erişiminin reddi, service account en az yetki, indeks doğrulama; çok kayıt ve kesintiyle cleanup yük testi. Arşiv kararı idempotency penceresini bozmamalı. Dağıtım ayrıca kullanıcı onayına bağlı. | firestore.indexes.json, server/firestore_store.js, server/economy_store.js, server.js |

Mevcut güvenlik sınırı korunmalı: sadece sunucu envanteri, güncel revision ve teklif
içeriğine bağlı iki onay, iki hesabın aynı transaction'ı, aynı requestId ile tekrar,
atomik rezervasyon kaldırma ve belirsiz yanıtta başarı göstermeme.

ENG-04 tarayıcı kanıtı iki bağımsız otomasyon oturumudur; iki insan oyuncuyla saha
testi değildir. Altın transferini kapsar; diğer varlıklar servis testlerinde
doğrulanır. Gerçek cihaz veya çoklu sunucu keşfi tamamlanmış olarak işaretlenmemeli.

Bu devir yerel depo belgesidir; başka bir sohbet, mesajlaşma servisi veya issue'ya
gönderilmedi. Bedesten satın alma ve genel yerel ekonomi migrasyonu kapsam dışıdır.
