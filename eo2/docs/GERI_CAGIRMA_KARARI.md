# Oyuncuyu geri çağıran sebepler · karar belgesi

Sürüm 1.0 · 2026-11-20 · Araştırma listesi madde 4.
Uyduğu belgeler: `TASARIM_ILKELERI.md` (§5 ekonomi önce gelir), `KARARLAR.md` K3 (oyunun saati "Haftayı Bitir"), `EKSIK_OZELLIKLER_2026-11-15.md`.

## Sorun

Oyuncu oturumu kapatınca ertesi gün dönmesi için hiçbir sebep yok. Oyunun saati gerçek zaman değil (K3): oyuncu yokken ocakta hiçbir şey olmaz. Zil düğmesi bile yer tutucu ("Bildirim yok.") olduğu için çıkışta gizli.

Ama oyuncu yokken **başka oyuncular** bir şey yapar: Bedesten'deki ilanını alırlar, dostluk isteği yollarlar. Bugün bunların hiçbiri oyuncuya söylenmiyor. Satış altını sessizce keseye düşüyor.

## Adaylar ve karar

| Aday | Geri çağırır mı? | Ekonomi (§5) | K3 zaman modeli | Karar |
|---|---|---|---|---|
| **Ocak Postası**: sen yokken olanlar (satışlar, dostluk istekleri) | Evet: "ilanım satıldı mı?" merakı gerçek bir sebep, oyuncular arası pazarla büyür | Yeni kaynak yok; satış altını zaten aktarılmış, posta yalnız haber verir | Uyar: olaylar gerçek oyunculardan gelir, zamanlayıcı yok | **YAP (1.)** |
| **Mühürler**: ödülsüz başarı mühürleri (`S.st` sayılarından) | Kısmen: "bir mühür daha" isteği oturumu uzatır, yarın dönmeyi az etkiler | Ödülsüz: kural değişikliği değil (EKSIK §başarımlar: "iyi olur, ödülsüz") | Uyar | **YAP (2.)** |
| **Haftalık sefer**: gerçek haftaya bağlı ortak görev | Evet ama | Yeni ödül tablosu ister (§5.2: ayrı ekonomi kararı) | Çelişir: gerçek zamana bağlı hedef K3'e aykırı, EKSIK'te "yapma" | **ŞİMDİ YAPMA** |
| Günlük giriş ödülü | Evet | Yeni kaynak (faucet), sink'i yok | Çelişir | **YAPMA** |
| Tarayıcı/telefon anlık bildirimi (web push) | En güçlüsü | Nötr | Uyar | **SONRA**: iOS'ta yalnız ana ekrana eklenmiş uygulamada çalışır; Posta'nın üstüne kurulur |

Neden bu sıra: Posta tek başına "yarın bakayım" sebebi üretir ve hiçbir sayıya dokunmaz. Mühürler bedava bir hedef katmanı ekler. Haftalık sefer ancak Mehmet bir ödül tablosu onaylarsa ve K3 değişirse gelir.

## Ocak Postası (1.)

- **Ne gösterir:** son 14 günde Bedesten'de satılan ilanların (ne, kaç adet, kime, kaç altın) ve bekleyen dostluk istekleri. En çok 30 satır.
- **Ne yapmaz:** "al" düğmesi yok. Altın satış anında aktarılmıştır; posta ödül vermez, ikinci kez yazmaz.
- **Okundu bilgisi:** cihazda tutulur (tarayıcı deposu). Sunucuya yeni yazma yolu yok; okundu bilgisi ekonomi ya da sosyal kayıtla yarışmaz. Bedeli: ikinci cihazda aynı haber bir kez daha "yeni" görünür.
- **Sunucu:** `GET /api/posta` yalnız okur (`listMarketRaw` satıcının ilanları + `getSocial`). Kimlik oturumdan gelir; başka hesabın postası istenemez. Okuma hız sınırı öteki okuma yollarıyla aynı.
- **Arayüz:** zil artık görünür. Okunmamış haber varsa üstünde sayı. Oyuna girişte okunmamış satış varsa tek bildirim: "Sen yokken 2 satış: 340 altın."
- **Yük:** girişte, sekme öne gelince ve en sık 5 dakikada bir okuma. Tek Cloud Run örneğinde ek yük önemsiz.

## Mühürler (2.)

- Defter'de "Mühürler" ayracı. Her mühür bir `S.st` sayısına ve eşiğe bağlı (ilk zafer, 10 zafer, ilk yumurta, ilk yakalanan yaban, ilk kupa…).
- Ödül yok, altın yok, ün yok. Kazanıldığında bir bildirim.
- Hangi mühürlerin "duyurulduğu" tarayıcıda tutulur; kayda (`S`) yeni alan eklenmez, sunucu hafta VM'i etkilenmez.

## Başarı ölçüsü

Huni ölçümü (`/huni`, ayrı dalda) `geri1` ve `geri7` adımlarını sayıyor. Posta yayına girdikten iki hafta sonra:
- Bedesten'e ilan koyan oyuncularda `geri1` oranı, koymayanlardan yüksek olmalı (hedef: en az 10 puan fark).
- Zil açılma sayısı ayrıca ölçülmez (yeni izleme eklemiyoruz); gerekirse huniye `posta` adımı eklenir.

## Açık sorular (engel değil)

1. Web push için ana ekrana ekleme (PWA) istiyor muyuz? Posta'dan sonra ayrı iş.
2. Haftalık sefer için ödül tablosu: ekonomi dengesi raporu (madde 7) çıkınca yeniden bakılır.
