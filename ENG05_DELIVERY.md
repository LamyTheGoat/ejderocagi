# ENG-05 · Başlangıç altını ve üretim güvenliği teslimi

Tarih: **2026-11-07** (Europe/Istanbul).
Dal: `codex/eng-05-economy-security`.
Temel: ENG-04 `d781efcd0a37e50b29affc4ab84db18cc43d1916`.
Teslim SHA'sı bu belgeyi içeren yerel commit'tir (`git log -1 --format=%H`).

Mevcut çalışma ağacındaki ENG-05 değişiklikleri korunarak test ve kapanış yapıldı.
Main, push, merge, canlı dağıtım, üretim IAM değişikliği veya ikinci gerçek sunucu
kurulumu yapılmadı. İki süreç testi yalnız localhost ve demo Firestore emülatörüdür.
ENG-06 çalışması başlatılmadı. Bu teslim üretime çıkış onayı değildir.

## Uygulanan ekonomi koruması

`server/economy_sources.js` yalnız sunucu kodunun kullandığı kaynak denetimidir.
`game.gold` toplam değeri korunur; `game.funds` içinde `schema:1`, `bound`,
`unknown`, `earned` bakiyeleri vardır. Toplamları gold ile eşleşmezse işlem reddedilir.

- Yeni hesapta mevcut **420** altın `bound` olur. Başlangıç ejderhası, yumurtası
  ve yiyecekleri de hesap bağlıdır; bunları satarak başlangıç paketini aklamak mümkün olmaz.
- Harcama sırası deterministiktir: **bound → unknown → earned**. Fiyatlar, tarifler,
  başlangıç miktarları ve ödül tutarları değiştirilmedi. Ödeme kaynakları komut
  makbuzunun `result.payment` alanında saklanır.
- Kısmen bile bağlı altınla alınan varlık bütünüyle bağlı kalır. Bilinmeyen kaynak
  katkısı varsa varlık unknown olur. Sadece kazanılmış kaynakla alınan varlık earned olur.
- Eşya, ejderha ve yumurta `funding` taşır. Yiyecek miktarları `foodSources` içinde
  kaynaklara ayrılır. Yumurtadan çıkan ejderha yumurtanın niteliğini devralır.
- NPC'ye satış geliri varlığın kaynak sınıfına döner. Satış veya aynı isteğin
  tekrarı bağlı bakiyeyi kazanılmış bakiyeye çeviremez. Alışveriş, kuluçka ve edinim
  gibi ekonomik hedef ödülleri de bağlı/unknown girdilerden earned üretemez.
- Takasın hem teklif kontrolü hem son aktarımı yalnız earned altın/yiyecek/varlık
  kabul eder. Rezervasyon guard'ı toplam altın yerine earned bakiyeyi korur.
  Oyuncu, earned altını rezerve edilmişken kendi bound bakiyesini harcayabilir.
- Bedesten bağlı ve unknown varlıkla ilan açmayı reddeder. Yapay yüksek fiyat
  bunu aşamaz. Bedesten buy/offer hâlâ kapalıdır; gerçek satın alma entegrasyonu eklenmedi.
- İstemci kaynak veya bakiye etiketi göndererek kazanılmış kaynak yaratamaz.
  UI toplam altını, takas edilebilir miktarı, bağlı ve inceleme bekleyen miktarı ayırır.

Takas iptal/ret/süre aşımı kaynak bakiyesine dokunmadan rezervasyonları kaldırır;
tamamlanan takas geri alınmaz. İşlem hatasında aynı transaction içindeki bakiye ve
kaynak değişiklikleri birlikte rollback olur. **Genel satın alma iade endpoint'i
mevcut değildir ve eklenmedi.** Gelecekteki bir iade, kalıcı ödeme makbuzunun her
kaynağına ayrı iade yapmalı ve kendi idempotency kaydını taşımalıdır; genel iade
API'sinin çalıştığı iddia edilmez. Şu an doğrulanan yollar iptal, rollback ve NPC satışıdır.

## Eski kayıt geçişi

1. `funds` olmayan eski kaydın bütün mevcut altını ve varlıkları unknown olarak
   ele alınır. Eski kayıtta rastlanan kaynak etiketi güvenilir sayılıp korunmaz.
   Eksik varlık/yiyecek kaynakları da unknown olur. Negatif veya bozuk toplamlı
   kayıt manuel inceleme gerektirir ve işlem reddedilir.
2. Okuma eski kaydın güvenli görünümünü üretir. Sonraki başarılı ekonomi komutu
   veya tamamlanan takas, kaynak alanlarını kendi atomik yazımı içinde kalıcılaştırır.
   Tekrar okumak/çalıştırmak aynı sonucu verir; toplu üretim migrasyonu çalıştırılmadı.
3. Unknown altın kişisel gelişimde harcanabilir; kendisi, aldığı varlık ve satış
   geliri takasa açılamaz. Eski bakiyenin otomatik olarak earned ilan edilmesi yoktur.
4. Eski, onaylanmış ama tamamlanmamış teklif son aktarımda yeni politika ile tekrar
   denetlenir. Uygun olmayan eski teklif iptal edilmeli veya süresi dolmalıdır.
5. Üretim geçişinden önce DB yedeği ve eski kayıt envanteri alınmalı. Kaynağı kanıtlı
   eski bakiyeyi açmak için ayrı, denetlenebilir mutabakat işlemi/onayı gerekir;
   bu teslim böyle bir yönetici grant API'si açmaz.
6. Eski ve yeni ekonomi sunucuları aynı DB'ye eşzamanlı yazmamalı. Eski kod kaynak
   alanlarını bilmediği için karışık sürümle rollout veya kontrolsüz kod rollback'i
   güvenli değildir. Geçiş/geri dönüş sırasında yazıcıların durdurulması ve snapshot
   uyumluluğu ayrıca onaylanmalıdır.

## Üretim güvenliği değişiklikleri

- **Ortak oyuncu keşfi:** Sunucu oturumundan üretilen presence kayıtları SQLite'ta
  `service_state`, Firestore'da `eo_service_state` altında tutulur. Her WS bağlantısı
  ayrı lease kimliği taşır; heartbeat 30 saniye, geçerlilik 90 saniyedir. Normal
  kapanış kaydı kaldırır; süreç kaybında lease süresi biter. İstemcinin handle/accountId
  beyanı presence kaynağı değildir. Liste en fazla 200 oyuncu döndürür.
- **Dağıtık sınırlar:** Firestore transaction'ları ve SQLite aynı DB transaction'ları
  ortak sayaçları korur. Hesap başına HTTP/WS ekonomik komut limiti 120/dakika,
  WS bağlantısı 20/dakika, misafir oluşturma IP başına 20/dakikadır. Başarılı davetler
  gönderen ve hedef başına 6/dakikayla sınırlıdır. Reddedilen gönderen-hedef çifti
  5 dakika tekrar davet gönderemez. Sayaçlar süreç yeniden başlatılmasıyla sıfırlanmaz.
- **Oturum iptali:** API kimliği ve WS ekonomik komutu güncel oturumu DB'den okur;
  60 saniyelik kimlik önbelleği ekonomik yetki vermez. DB erişimi başarısızsa işlem
  ilerlemez. İptalden önce yetkilendirilmiş, hâlen süren bir transaction'ı geriye
  alma garantisi yoktur. Boştaki WS'nin kapanışı heartbeat aralığına bağlıdır.
- **Makbuz saklama:** 30 günü geçen, terminal takasa ait yeni makbuzların büyük
  sonuç gövdeleri atomik olarak küçültülür. Hesap/requestId anahtarı, komut hash'i
  ve tradeId kalıcı tutulur. Aynı istek terminal kaydı tekrar okur; farklı içerik
  reddedilir. Anahtar silinip tekrar transfer yolu açılmaz. Eski, tarihi bilinmeyen
  makbuzlar silinmez. Bu mekanizma sınırsız arşiv büyümesini tamamen çözmez.
- **Temizlik:** Her turda en fazla 50 kayıt; Firestore temizliği silmeden önce kaydı
  transaction içinde tekrar okur. Yenilenmiş presence/rate kaydı yanlışlıkla silinmez.
- **Kapanış düzeltmesi:** HTTP, WS, presence ve cleanup işleri izlenir; DB istemcisi
  bu işler bitmeden sonlandırılmaz. Mevcut 8 saniyelik kapanış son süresi korunur.

## Firestore IAM, kurallar ve indeks denetimi

Depodaki `firestore.rules` istemci erişimini tüm belgelerde reddediyor; değiştirilmedi.
Emülatör testinde kimliksiz REST hesabı okuması **403** döndü. Sunucu için veri okuma,
yazma, sorgu, silme ve transaction yetkileri gerekir; `roles/datastore.user` veri
erişim rolüdür. Runtime kimliğinin Owner/Editor veya indeks yönetim yetkisine ihtiyacı
yoktur; kapsamı yalnız economy DB ile sınırlandırılmalıdır. Gerçek service account
bağlamaları okunmadı/değiştirilmedi. Bu öneri üretimde en az yetkinin kurulu olduğuna
kanıt değildir. [Firebase IAM belgesi](https://firebase.google.com/docs/firestore/security/iam).

Presence sorgusu için `eo_service_state` üzerinde `kind ASC, expiresAt ASC` bileşik
indeksi depoya eklendi. `expiresAt` ve makbuz `compactAfter` sorguları için tek alan
indeksleri gerekir; büyük JSON alanlarının mevcut indeks istisnaları korunur.
İndeks yönetimi ayrı dağıtım kimliğiyle yapılmalı (`roles/datastore.indexAdmin`).
Üretimde indeksin oluşturulduğu/Ready olduğu doğrulanmadı ve deploy yapılmadı.
[Firebase indeks belgesi](https://firebase.google.com/docs/firestore/query-data/indexing).

## Test sonuçları ve kanıtlar

Windows / Node v24.13.0 / Microsoft Edge. Tarayıcılar iki ayrı cookie bağlamıdır;
iki insan oyuncuyla saha testi değildir. Mobil görünüm 390×844 emülasyondur.

| Kontrol | Sonuç |
|---|---|
| `npm test` | **48 geçti, 0 başarısız, 0 atlandı** |
| Firestore emülatörü içinde `npm run test:firestore` | **7 geçti, 0 başarısız, 0 atlandı** |
| SQLite ile `npm run test:trade-ui` | **1 geçti**, 42.9 saniye; temiz kapanış |
| `ENG05_MULTI_SERVER=1` ve Firestore emülatörü ile `npm run test:trade-ui` | **1 geçti**, 22.9 saniye; iki localhost Node süreci, temiz kapanış |
| Değişen/yeni 20 JavaScript dosyasında `node --check` | Geçti |
| `git diff --check` | Geçti |

Emülatör komutu: `npx --yes --package firebase-tools firebase emulators:exec
--only firestore --project demo-ejder-ocagi "npm run test:firestore"`.
İki süreç koşusunda aynı komutun test bölümü `npm run test:trade-ui` ve ortam
değişkeni `ENG05_MULTI_SERVER=1` kullanıldı. Emülatör dışı Firestore testleri host
kontrolüyle engellenir; gerçek proje kullanılmadı.

Yeni/güncellenen regresyonlar:

- ENG-04'ün 420→840→1260 saldırısı SQLite ve Firestore'da reddedildi; alıcı **420** kaldı.
- Başlangıç varlıkları/yiyecek, bağlı altınla tüm NPC varlık alışverişleri, eşya satış
  geliri, yumurtadan çıkış, ekonomik hedef ödülü ve aşırı fiyatlı ilan üzerinden
  aklama engellendi. Sahte kaynak alanları reddedildi.
- Harcama sırası, karma ödeme, kaynakların geri konması, eski kaydın unknown olması,
  bozuk kaynak toplamının reddi doğrulandı.
- Normal earned ödülle takas, bound bakiye harcanırken earned rezervasyonunun
  korunması ve iptal sonrası bakiyelerin değişmemesi geçti.
- Aynı eşyanın iki SQLite worker'ında eşzamanlı satışı/teklifi birlikte başarılı
  olamadı; çift varlık oluşmadı. P2 altın harcama/onay yarışları ve iki backend'in
  hata enjeksiyonu/rollback testleri de geçti.
- Aynı requestId, bağlantı kaybı, makbuz küçültme sonrası tekrar, hash uyuşmazlığı,
  ortak rate sayacı, davet cooldown'u, presence süresi ve anlık oturum iptali geçti.
- İki sunuculu tarayıcı senaryosu ortak keşif, teklif değiştirme/onay sıfırlama,
  mobil reload, iki onay, tamamlanan işlemin yanıtını düşürme ve tekrar denemeyi
  kapsar. Son bakiyeler **390/450**; yeni belirsiz davette eski başarı gösterilmez.

P1/P2/P3/ENG-04 testleri kaldırılmadı. Eski takas fixture'larının 420 altını serbestçe
devrettiği varsayım, onaylanan politikayla çelişiyordu. Bu testlerde yalnız güvenilir
test kurulumu earned kaynak sağlar; `tests/helpers/earned_fixture.js` üretim koduna
veya API'ye bağlı değildir. Ayrı istismar testleri gerçek bound başlangıcı kullanır.
Kazanılmış oynanış ödülü testi doğrulanmış arena sonucunu server fixture'ıyla modeller;
uçtan uca gerçek arena ödül üreticisi testi olarak yorumlanmamalıdır.

Ara başarısızlıklar: ilk iki süreç koşusunda güncel karşı teklif okunmadan düzenleme
ve tamamlanmamış ağ kancasını kaldırma yarışları görüldü. Test artık kayıtlı teklifleri
ve yanıt düşürmenin bitmesini bekler. Kapanışta Firestore istemcisinin devam eden
işlerden önce sonlanması da düzeltildi; son iki süreç koşusu temiz çıkışı doğrular.
Önceki fixture/teardown uyumsuzlukları giderildi. Nihai sonuçlar yukarıdadır.
MetadataLookupWarning emülatör koşularında görüldü; başarılı süreçler 0 ile kapandı.

Yerel, Git dışında tutulan kanıtlar `test-results/eng-05/` altında:

- `standard-tests.txt`: tüm standart test adları ve sonuçları.
- `emulator-and-two-process-tests.txt`: 7 Firestore testi ve ilk başarısız tarayıcı koşusu.
- `two-process-browser-tests.txt`: son başarılı iki süreç koşusu.
- `browser-sqlite.txt`: son SQLite tarayıcı koşusu.
- `firestore-screenshots/`, `sqlite-screenshots/`: mobil teklif, kayıp yanıt ve sonuç.

## Kalan blocker'lar / tamamlanmayan doğrulamalar

1. **Üretim geçişi:** canlı IAM, indeks readiness, eski kayıt yedeği/mutabakatı ve
   tek sürüm yazıcı geçişi yapılmadı. Bunlar yayın öncesi blocker'dır.
2. **Gerçek cihaz ve ortam:** fiziksel telefon, iOS/Safari, gerçek iki sunucu,
   Cloud Run yönlendirmesi/failover ve uzun süreli yük testleri yapılmadı. İki yerel
   süreç testi üretim topolojisinin tüm garantilerini kanıtlamaz.
3. **Oynanış ödülü üreticileri:** mevcut sunucu komut listesi bütün normal oynanış
   ödüllerini üretmiyor. Kaynağı doğrulanmış earned bakiye ticareti çalışır; yeni
   ödül üreticileri `milestoneSources`/kaynak defterini sunucuda doldurmalıdır.
   Kaynağı olmayan eski veya henüz entegre edilmemiş ödül unknown kalır. Genel
   oynanış migrasyonu ve gerçek arena→ödül→takas E2E bu pakette tamamlanmadı.
4. **İade:** mevcut olmayan genel satın alma iade API'si için E2E test yoktur.
   Kaynak bazlı ödeme makbuzu hazırdır; yeni endpoint eklenmedi.
5. **Operasyonel sınırlar:** presence listesi sınırlıdır; 90 saniyeye kadar eski
   çevrimiçi kaydı görülebilir. Cross-instance WS fanout eklenmedi; mevcut 5 saniyelik
   HTTP yenilemesi senkronizasyonu sağlar. Dağıtık çok hesaplı taciz, güvenilir proxy/IP
   politikası, rate/heartbeat maliyeti ve yüksek eşzamanlılık ayrıca yük testi ister.
6. **Saklama:** kompakt idempotency kayıtları ve terminal takaslar kalıcıdır; eski
   tarihsiz makbuzlar korunur. Sınırsız büyüme ve nihai arşiv politikası açık kalır.
7. `scripts/audit_project.py` depoda yok; becerinin genel görsel audit'i çalıştırılamadı.
   Asset/sanat dosyası değişmedi. Bedesten satın alma ve yerel S migrasyonu kapsam dışı.

Bu maddeler yalnız sonraki inceleme bağımlılıklarıdır; ENG-06 uygulaması yapılmadı.

## Değişen dosyalar

- Ekonomi: `server/economy_sources.js` (yeni), `server/economy_commands.js`,
  `server/trade_service.js`, `server/market_service.js`.
- Veri ve güvenlik: `server/service_security.js` (yeni), `server/economy_store.js`,
  `server/firestore_store.js`, `server/guest_session.js`, `server.js`, `firestore.indexes.json`.
- Arayüz: `js/trade_ui.js`.
- Testler: `tests/economy_sources.test.js` (yeni), `tests/helpers/earned_fixture.js`
  (yeni), `tests/economy_commands.test.js`, `tests/market_security.test.js`,
  `tests/trade_service.test.js`, `tests/firestore_store.integration.js`,
  `tests/server_foundation.test.js`, `tests/session_cache.test.js`,
  `tests/trade_ui.e2e.js`, `tests/playwright.config.js`.
- Teslim: `ENG05_DELIVERY.md` (bu belge).

`firestore.rules`, paket bağımlılıkları, yerel oyun ekonomisi ve sanat standardı
değiştirilmedi. Kesin dosya listesi teslim commitinde `git show --name-only HEAD`
ile görülebilir.
