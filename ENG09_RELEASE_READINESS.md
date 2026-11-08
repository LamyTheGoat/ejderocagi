# ENG-09 · Zincirleme dal denetimi ve sürüm adayı hazırlık raporu

06 QA & Release · 2026-11-08 · dal `claude/eng-09-release-qa` (taban `98b897d`)
Bağımsız denetim: teslim belgelerindeki iddialar kod, test ve Git üzerinden yeniden doğrulandı. Kod değiştirilmedi.

## Karar

**SÜRÜM ADAYI (canlı yayın): HAYIR.** Kod zinciri test olarak sağlam ve `main`'e çakışmasız ileri sarılabilir. Ancak canlı yayının 7 engeli var (§5): istemci sunucu ekonomisine bağlı değil (`economyReady:false`, `week.end` çağrılmıyor), hafta 20 sunucuda çıkmaz sokak, `render.yaml` çelişkili, `SESSION_SECRET` zorunlu değil, Cloud Run arkasında misafir limiti IP'ye bağlı (ENG06-03), GET uçlarında hesap limiti yok (M-2) ve üretim IAM ile indeks hazırlığı doğrulanmadı.
**Dal entegrasyonu (`main` ← `claude/eng-08-ocak-sandigi`): ŞARTLI EVET.** Şart: 00 ve kullanıcı onayı. Birleştirme yayın anlamına gelmemeli.

## 1. Testler (bu oturumda sıfırdan koşuldu)

| Komut | Sonuç | Not |
|---|---|---|
| `npm ci` | tamam | 0 güvenlik açığı |
| `npm test` | **95/95** | SQLite ve birim testleri. CLAUDE.local'daki "58/58" eski |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **10/10** | Port 8089 boştu; depo `firebase.json` değişmeden kullanıldı. Eski java.exe (PID 20252) sürecine dokunulmadı |
| `npm run test:trade-ui` (SQLite) | **1/1** | msedge, headless |
| `npm run test:ocak-sandigi` | **1/1** | |
| `ENG05_MULTI_SERVER=1` + emülatör + `test:trade-ui` | **1/1** | İki sunucu örneği, Firestore. Yalnız **takas**ı kapsar; Bedesten için iki sunuculu tarayıcı testi yok. Bedesten iki örnek eşzamanlılığı yalnız `firestore_store.integration.js:270` içinde |
| QA duman betiği (scratchpad, Playwright) | sayfa hatası 0 | 390×844 ve 1024×768'de Ocak, Pazar, Bedesten (3 sekme), Ocak Sandığı (§3) |

Koşulmayanlar: gerçek telefon, iOS Safari (WebKit), Android Chrome, gerçek Cloud Run, yük testi.

## 2. Bulgular (önem sırasıyla)

### Yüksek

| # | Bulgu | Kanıt | Sahip |
|---|---|---|---|
| Y-1 | **GET uçlarında hesap ve IP limiti yok (M-2 açık), Bedesten okuma maliyetini büyütüyor.** Hız limiti yalnız POST istekleri için var. `GET /api/market` her çağrıda iki Firestore sorgusu çalıştırır (en çok 100+30 doküman) ve oturum gerektirmez. İstemci Bedesten açıkken 10 sn'de bir yeniler. Her başarılı ilan veya satış tüm WS istemcilerine `market_update` yayınlar, açık ekranlar yeniden çizilir. Maliyet DoS'u riski var | `server.js:888`, `server/firestore_store.js:164-170`, `js/market_client.js:93`, `server.js` `marketChanged` | 02 (sahipsiz M-1/M-2/M-4 → C6) |
| Y-2 | **Misafir oluşturma limiti `req.socket.remoteAddress` kullanıyor (ENG06-03 ertelendi).** Cloud Run arkasında bu adres ön uç adresidir. Sonuç: dakikada 20 sınırı fiilen herkes için ortak olur ya da hiç etkili olmaz | `server.js:850-863`, `server.js:882` | 02 / ENG06-03 |
| Y-3 | **`SESSION_SECRET` zorunlu değil.** Tanımsızsa her örnek kendi rastgele anahtarını üretir. Çok örnekli Cloud Run'da ve yeniden başlatmada X oturum çerezleri geçersiz olur (misafir oturumları depoda, onlar etkilenmez) | `server.js:801` | 02 |
| Y-4 | **`render.yaml` çelişkili.** `NODE_ENV=production` ayarı `store_factory`'yi Firestore'a zorlar. Ancak dosyada proje ya da kimlik bilgisi yok. SQLite diski hiç kullanılmaz. Yerelde denendi: depo hatasız oluşuyor (`created firestore`), dolayısıyla hata ilk ekonomi isteğinde çıkar (Render'da koşulmadı) | `render.yaml:12-18`, `server/store_factory.js:4-10` | 02 / 06 |

### Orta

| # | Bulgu | Kanıt | Sahip |
|---|---|---|---|
| O-1 | **İstemci sunucu ekonomisine bağlı değil.** "Haftayı Bitir" hâlâ yerel `endWeek`'i çalıştırıyor. `js/` içinde `week.end` geçmiyor. `/api/session` ve `/api/economy` `economyReady:false` döndürüyor. Oyuncu iki ayrı ekonomi görüyor (yerel altın/varlık ile sunucu kesesi). Sandık bunu "Yerel oyundaki varlıklar ayrıdır" diye açıkça söylüyor | `server.js:885`, `server.js:927`, ENG06_PC_DELIVERY K-7 | 02 + 05 |
| O-2 | **Hafta 20 sunucuda çıkmaz sokak.** `week.end` `season_end_unsupported` döndürüyor ve sezon sonu ya da nesil yolu yok. İstemci bağlandığında her hesap 20. haftada kalır | `server/economy_commands.js:213`, `server/week_runtime.js:44` | 01 karar, 02 |
| O-3 | **Sayfa 8 px yatay taşıyor.** 390'da `scrollWidth` 398, 1024'te 1032 ölçüldü. Kök neden: `body`'de `margin:0` sıfırlaması yok, varsayılan 8 px kenar boşluğu kalıyor (`#modal-root` sol=8, sağ=398). Hata `initial` commit'inden beri var | `style.css:44`; ölçüm `smoke.json` | 05 |
| O-4 | **Yüzen "⇄ Takas" düğmesi içeriği örtüyor.** Mobil Ocak'ta "Harita Görünümü" düğmesinin, Bedesten'de NPC konuşma metninin üstüne biniyor (ekran görüntüsü). ENG-08 e2e yalnız Sandık diyaloğunun düğmeyi örttüğünü denetliyor | `style.css:13795`, `style.css:13810`, `js/trade_ui.js:5` | 05 |
| O-5 | **390 px'te dokunma hedefleri 44 px'in altında.** Bedesten sekmeleri 31 px, kategori plakaları 29 px, "Ağı Yenile" 68×31, alt gezinti 74×32, HUD profil 36×30. Bedesten sekme satırı 504/340 px taşıyor (`overflow:auto`, belirteç yok). Ocak Sandığı diyaloğu kendi e2e'sinde 44 px şartını geçiyor | `js/pazar.js:547-550`, ölçüm | 05 |
| O-6 | **1024×768'de HUD metinleri çakışıyor.** "Çanta", "Sosyal", "Hafta 1/20" ve "İLKBAHAR" üst üste biniyor | ekran görüntüsü `d1024-1-ocak.png` | 05 |
| O-7 | **Bedesten önizlemesi ilan anının fotoğrafı.** İlan açıkken içerik değişebiliyor (yaş, evre). Alım yalnız `unitPrice`'ı eşleştiriyor; varlık durumu ya da sürüm bağlanmıyor. Alıcı eski önizlemeye bakarak yaşlanmış veya değişmiş ejderhaya ödeme yapabilir. Kuluçkaya alınan yumurta ya da meşgul ejderha alınamaz ama ilan "açık" görünür (ENG07 K-6) | `server/market_service.js:85-107`, `:200-235` | 01 karar, 02 |

### Düşük

| # | Bulgu | Kanıt |
|---|---|---|
| D-1 | Eski `market_update` işleyicisi hâlâ `S.gold += msg.sale.price` yazıyor. Sunucu artık yalnız `{type, listingId}` yayınladığı için bu kod etkisiz. Ama sunucu bir gün `sale` alanı gönderirse yerel altın yolu yeniden açılır | `js/net.js:179-190` |
| D-2 | Bedesten başlığı "WebSocket Aktif" diyor. Oysa mutasyonlar yalnız HTTP üzerinden yapılıyor (WS yolu kapalı). Yanıltıcı | `js/pazar.js:694` |
| D-3 | `eo_market_receipts`, satılmış ve iptal ilanlar için TTL veya temizlik yok. Veri sınırsız büyür | `server/firestore_store.js:136-157` |
| D-4 | `Dockerfile` root kullanıcıyla çalışıyor. `VOLUME /app/data` (WORLD: sohbet, kervan, podyum) Cloud Run'da her örneğe ayrı ve geçici | `Dockerfile` |
| D-5 | Önizleme alanları (`el`, `eye`, `pat`, `genes`) enum doğrulaması olmadan `dragonSVG`'ye gidiyor. Kaynak sunucu kaydı, bugün saldırgan denetiminde değil. Derinlemesine savunma eksik | `server/market_service.js:90-92`, `js/pazar.js:504-510` |
| D-6 | Test değişiklikleri: güvenlik iddiası zayıflatılmamış, ama HTTP üzerinden "iptal 200 → tekrar iptal" adımı `server_foundation`'dan çıkmış (depo düzeyinde `eng07_market.test.js:45` ve Firestore 270 kapsıyor). `week.skip` hiç var olmamış bir tür, o satırın test değeri düşük | `git diff 05bdcf6..98b897d -- tests/` |

### Doğrulanan ve sorunsuz bulunan noktalar (kodla)

- **`week.end`:** bilet tembel dolumla ve yalnız sunucu saatiyle hesaplanıyor. Saat geri alınırsa dolum olmuyor, çapa geri gitmiyor (`week_runtime.js:24`). Bilet `endWeek`'ten önce düşüyor. Hata olursa saf klon nedeniyle hiçbir şey yazılmıyor. Makbuz ile tekrar aynı sonucu veriyor; eşzamanlı istekte biri `version_conflict` alıyor. Bilet takas veya Bedesten şekillerine giremiyor: katı `SHAPES` (`market_service.js:36-63`) ve `normalizeOffer` engelliyor. Testler: `eng06_pc_week:165,187,205`, Firestore 219.
- **Borç:** `DEBT_BLOCKED` ve her `spend` çağrısı kapıdan geçiyor (`economy_commands.js:103`). `transfer` iki tarafı da denetliyor (`trade_service.js:42`), bu da takas teklifini, onayı ve Bedesten alımını kapsıyor. İlan açma (`market_service.js:157`) ve borçlu satıcıdan alım (`:210`) engelli. Mahsup önce borcu düşüyor, kalan kendi sınıfıyla giriyor (`economy_debt.js:174-180`); sınıf yükseltme yok. İptal borçluyken de açık: yalnız rezervasyonu bırakıyor, kabul edilebilir.
- **Bedesten:** kendi ilanını alma (`:202`), fiyat uyuşmazlığı (`:205`), miktar ve taşma (`:53-55`, `:212`) engelli. Yalnız tamsayı kabul ediliyor, yuvarlama yok. `offer` 503 dönüyor (`:46`). WS kapalı (`server.js:634-637`). Makbuz hash'i sürüm içermiyor (`:41-62`). Bound ya da unknown varlık listelenemiyor (`:173`, `sources.tradable`). Rezervasyon komut, takas ve alımda korunuyor. İki alıcı testi var: SQLite iki iş parçacığı ve Firestore iki örnek.
- **Ocak Sandığı:** yalnız sunucu ekonomisinden kuruluyor, yerel `S` kullanılmıyor. Tüm metinler `h()` ile kaçışlanıyor (`ocak_sandigi.js:145`). "Bedestende Sat" yalnız earned ve rezerve olmayan kalemde görünüyor. Sunucuya fiyat ya da sahiplik gönderilmiyor, yalnız Bedesten formunu ön seçiyor.
- **ENG-05:** POST hız limiti hesap başına. `economy_sources` toplamı altına eşit kalıyor (borç `funds` dışında). `/api/sync` ekonomi alanlarını reddediyor. Testler geçiyor.

## 3. Mobil ve UX duman denetimi

Yöntem: sunucu geçici olarak scratchpad'den başlatıldı (`NODE_ENV=test`, SQLite, `LOCAL_ECONOMY_DIR` scratchpad'de). Hesap `game.start` ve Sandık e2e'sindeki karışık kaynak tohumuyla hazırlandı. Kapatıldı; artık süreç yok.

| Ekran | 390×844 | 1024×768 |
|---|---|---|
| Ocak | `scrollWidth` 398 (O-3); Takas düğmesi "Harita Görünümü"nün üstünde (O-4); "Haftayı Bitir" etiketi kesiliyor | 1032 (O-3); HUD çakışması (O-6) |
| Pazar | sahne katmanı 406 px | sahne 1065 px (`overflow` gizli, kaydırma yok) |
| Bedesten (3 sekme) | sekme satırı 504/340 taşıyor; 31 px sekmeler (O-5); Takas düğmesi metni örtüyor | temiz; tek sorun 1032 genişlik |
| Ocak Sandığı | diyalog temiz; sekme satırı kaydırılabilir ve belirteç var | temiz |

Ekran görüntüleri yerel ve commit'e girmedi: `C:\Users\user\AppData\Local\Temp\claude\6ae3121632197f2b\d4a70fd0-67d5-407c-8f89-d8ecc014bded\scratchpad\shots\`

## 4. Dal zinciri ve birleştirme analizi (salt okunur `git merge-tree --write-tree`)

| Çift | İlişki | Sonuç |
|---|---|---|
| `claude/eng-08-ocak-sandigi` + `main` (`17fb90a` = `origin/main`) | `main` atası; 15 commit önde, 0 geride | Çakışma yok; ileri sarma mümkün (ağaç `448f839`) |
| aynı dal + `codex/eng-05-economy-security` (`bf26734`) | ata; 9 önde | Birleştirilecek bir şey yok |
| aynı dal + `codex/eng06-04-p1` (`a021720`, yalnız commit'li içerik) | `a36011d`'den ayrılmış; 1 commit (`ENG06_04_PLAN.md`) | Çakışma yok (ağaç `a991905`), ortak dosya yok. **Anlamsal risk:** plan P-C, ENG-07 ve ENG-08'den önce yazıldı. Codex'in commitsiz P1 işine bakılmadı; çakışma durumu bilinmiyor |

Grafik: `0e5a37b → 4eb7932 → 139523b → 05bdcf6 → 57d3210 → 00d0a89 → 98b897d` doğrusal ve `a36011d` üzerinde. `a021720` (Codex planı) ile `9d0d67e` (`qa/eng06-review-01`) `a36011d`'den ayrılan yan dallar.

**Önerilen sıra (öneri, uygulanmadı):** (1) 00 ve kullanıcı zinciri onaylar. (2) `main` → `98b897d` ileri sarılır (yayın değil). (3) Codex P1, yeni `main` üzerine rebase edilip yeniden test edilir; eski tabandan birleştirme yapılmaz. (4) Y-1…Y-4, O-1, O-2 ayrı dallarda kapatılır. (5) `qa/eng06-review-01` ile bu rapor belge olarak eklenir.

## 5. Yayın hazırlığı kontrol listesi

| Madde | Durum | Kanıt | Sınıf |
|---|---|---|---|
| İstemcinin sunucu ekonomisine bağlanması (`economyReady:false`, `week.end` bağlı değil) | Hazır değil | O-1 | **Engel** |
| Hafta 20 / sezon sonu sunucu yolu | Hazır değil | O-2 | **Engel** (O-1 ile birlikte) |
| Üretim IAM (yalnız sunucu SA'sı, kurallar her şeyi reddediyor) | Kural dosyası hazır (`firestore.rules`); IAM doğrulanmadı | rules: `allow … if false` | **Engel** (doğrulama) |
| Firestore indeksleri | Dosya hazır: `eo_market_listings` için (status, createdAt desc) ve (sellerId, createdAt desc), `json` muafiyetleri. Yeni sorgular bunlara uyuyor. Dağıtım doğrulanmadı | `firestore.indexes.json:17-31`, `firestore_store.js:164-170` | **Engel** (dağıtım) |
| Eski kayıt yedeği ve mutabakatı (QA M-01, C2) | Açık; canlıda hesap olup olmadığı teyit edilmedi | DECISION_CONFLICTS C2 | **Engel**: C2 "canlı veri var" çıkarsa; yoksa düşer |
| Tek sürüm yazıcı geçişi | Planı ya da kodu yok | CURRENT_PROJECT_STATUS:48 | **Engel** |
| `SESSION_SECRET` zorunluluğu | Yok | Y-3 | **Engel** (X girişi açıksa) |
| ENG06-03 proxy/IP ve misafir limiti | Ertelenmiş | Y-2 | **Engel** (genel yayın) |
| M-2 okuma limiti (M-1, M-4 dahil) | Sahipsiz | Y-1 | **Engel** (M-2); M-1/M-4 yayın sonrası olabilir |
| M-3 davet kilidi, L-4 `transaction()` kaldırma | Açık | CURRENT_PROJECT_STATUS:46-47 | Yayın sonrası |
| `render.yaml` | Çelişkili | Y-4 | Render hedefse engel, değilse dosya kaldırılsın veya eski olarak işaretlensin |
| `Dockerfile` | Çalışır görünüyor (Cloud Run'da `K_SERVICE` Firestore'u zorlar); root, geçici WORLD | D-4 | Yayın sonrası |
| Geri alma planı | Belgede yok. Firestore şeması ileriye uyumlu (`weekTickets`, `debt` alanları eski kodda yok sayılır mı, test edilmedi) | — | **Engel** (yazılı plan) |
| Yerel kayıt migrasyonu | Bilinçli olarak yok (INTEGRATION_NOTES:3-4) | — | Karar gerektirir; C2'ye bağlı |
| UX: 8 px taşma, Takas düğmesi, 44 px, HUD çakışması | Hazır değil | O-3…O-6 | Yayın sonrası olabilir (O-3 ve O-4 önerilir) |
| Komisyon D7, bilet değerleri D2c | Yer tutucu | `market_service.js:13`, `week_config.js:128` | 01 kararı; O-1'den önce |

## 6. Kullanıcının çalıştıracağı testler (QA çalıştırmadı)

**A. Gerçek telefon, yerel ağ (yalnız test verisi):**
1. Bilgisayarda (PowerShell, depo kökü): `$env:NODE_ENV='test'; $env:PUBLIC_URL='http://<LAN-IP>:3000'; $env:LOCAL_ECONOMY_DIR="$env:TEMP\eo-phone"; $env:DATA_DIR="$env:TEMP\eo-phone-world"; node server.js`
2. Telefonda `http://<LAN-IP>:3000` adresini aç. Önce iOS Safari, sonra Android Chrome.
3. Kontrol et: yatay kaydırma var mı (O-3), Takas düğmesi neyi örtüyor (O-4), Bedesten sekmelerine parmakla basılabiliyor mu (O-5), Ocak Sandığı açılıp kapanıyor mu, "Bedestende Sat" formu ön seçimli açılıyor mu, ekran döndürme, klavye açıkken fiyat alanı, geri tuşu.
4. Bitince `Ctrl+C` ile durdur ve iki geçici klasörü sil.

**B. İki cihaz arası Bedesten:** A adımındaki sunucuyla iki ayrı telefon ya da tarayıcı kullan. Biri ilan açar, diğeri satın alır, ardından ikisi aynı anda aynı ilanı almayı dener. Beklenen: yalnız biri başarılı olur, diğeri `listing_closed` alır. Ağ kesilip geri gelince aynı istek yeniden gönderilmeli ve başarı mesajı tek kez görünmeli.

**C. Cloud Run çok örnek (yalnız ayrı bir staging projesinde, demo verisiyle; üretime dokunma):**
1. Salt okunur ön kontroller:
   - `gcloud run services describe <servis> --region <bölge> --format=yaml`: `SESSION_SECRET`, `minInstances`, `concurrency`
   - `gcloud firestore indexes composite list --database=economy`: iki `eo_market_listings` indeksi `READY` olmalı
   - `gcloud projects get-iam-policy <proje> --format=json`: Firestore yetkisi yalnız servis hesabında olmalı
2. `--min-instances=2` ile iki örnek aç. B senaryosunu iki ayrı istemciyle tekrarla. Örnekler arası `week.end` tekrarını (aynı `requestId`) ve iki sekme çakışmasını dene.
3. Okuma maliyeti (Y-1): 50 açık Bedesten sekmesi 10 dakika açık kalsın; Firestore okuma sayısını konsoldan not et.
4. Misafir limiti (Y-2): farklı ağlardan iki cihazla ard arda oturum aç. 20/dk sınırının ortak mı işlediğini gözle.

## 7. Doğrulanamayanlar

Gerçek Cloud Run topolojisi ve IP davranışı; üretim IAM ve indeks dağıtımı; canlı hesap varlığı (C2); iOS WebKit ve gerçek dokunmatik davranışı; yük ve maliyet; Codex'in commitsiz ENG06-04-P1 işi (bilinçli olarak bakılmadı); REVIEW-001 kaynak belgesi (C12).

## 8. Bu commit

Yalnız bu dosya eklendi. Üretim kodu, test ve teslim belgeleri değişmedi. Test yan ürünleri (`test-results/`, `firestore-debug.log`) `.gitignore` kapsamında ve commit'e girmedi.
