# ENG06-03 · Proxy güven sınırı ve misafir hesap koruması (tasarım, revizyon 2)

| Alan | Değer |
|---|---|
| Durum | Tasarım revizyonu. **Uygulama izni yok.** Üretim kodu yazılmadı. |
| Branch / worktree | `claude/eng-06-economy` · `C:/Users/user/Documents/GitHub/ejderocagi-eng06` |
| Taban commit | `0e5a37b` (revizyon 1). Paket 1 ve 2 kodu değişmedi. |
| Kaynak bulgu | REVIEW-001 H-2: misafir oluşturma limiti proxy arkasında global oluyor |

## 0. Revizyon 2 özeti (Proje Merkezi kararları)

| # | Karar | Bu belgede |
|---|---|---|
| 1 | Güvenilir proxy IP çözümleme, IPv4/IPv6 normalizasyonu, HMAC anahtar, dolu `Map` kilidinin düzeltilmesi ilkesel olarak uygun | §4 |
| 2 | `TRUSTED_PROXY_HOPS` tahminle sabitlenmeyecek; önce salt okunur topoloji kontrolü | §6 (kontrol planı); değer **açık** |
| 3 | D4 tek başına bot koruması sayılmayacak; tarayıcı akışında Origin test edilecek | §5 (test sonuçları) |
| 4 | 10/10 dk, 50/gün, global 300/dk yalnız öneri; ortak IP ve yüksek trafik test planı | §9 |
| 5 | Global devre kesicinin hizmet reddi aracı olarak kullanımı ayrıca incelenecek | §7 |
| 6 | B, C, D1–D3 ertelendi; hesap silme, hesap yaşı kuralı, CAPTCHA yok | §3 |
| 7 | Onay gerektiren kararlar ayrı | §11 |

Revizyon 1'deki iki hata düzeltildi:
- "Global kesiciyi doldurmak için yaklaşık 30 IP yeter" ifadesi yalnız bir dakikalık patlama içindi. Sürekli kilit için gereken sayı §7'de yeniden hesaplandı.
- IPv6 /64 tek katmanı, /48 sahibi bir saldırgana karşı yetersiz (§7b).

---

## 1. Mevcut sistem (kod üzerinden doğrulandı)

### 1a. Misafir oluşturma akışı
`POST /api/session` (`server.js:878-889`):
1. `/api/*` için önce `allowedOrigin(req)` (`server/guest_session.js:19-22`):
   - `Sec-Fetch-Site: cross-site` → red.
   - `Origin` varsa ve `PUBLIC_URL` origin'ine eşit değilse → red.
   - **`Origin` hiç yoksa → kabul.**
2. Geçerli çerez varsa mevcut hesap döner; geçersiz çerez → `401 invalid_guest_session`.
3. Çerez yoksa iki limit sırayla:
   - **Süreç içi:** `allowGuestCreation(req)` (`server.js:853-865`).
     - Anahtar `req.socket.remoteAddress`, 60 sn'de 20.
     - `Map` 2000 anahtarda dolunca **her yeni anahtar reddediliyor**.
   - **Dağıtık:** `consumeRate('guest-ip:'+req.socket.remoteAddress, 20, 60000)` (`server.js:884`).
     - SQLite `service_state` (`server/economy_store.js:66-69`) ve Firestore transaction (`server/firestore_store.js:40-43`).
     - Anahtar tuzsuz `sha256`.
     - Aşımda 429 (`server/service_security.js:4-8`, `server.js:1333`).
     - Sayaç yalnız kabul edilen istekte artıyor; reddedilen istek sayacı tüketmiyor.
4. `createGuest()`: UUID hesap, 365 günlük oturum, `HttpOnly; SameSite=Strict` çerez. `game.start` 420 **bound** altın veriyor.

### 1b. İstemci tarafı
- İki istemci yolu var: `js/net.js:74-91` ve `js/trade_client.js:10-11`.
- İkisi de same-origin `fetch` POST yapıyor ve aynı `navigator.locks` kilidini (`eo-guest-bootstrap`) paylaşıyor.
- Sonuç: ilk ziyarette iki bootstrap çağrısı olsa da **tek hesap** açılıyor; ikinci çağrı oluşan çerezle devam ediyor (§5'te gözlendi).

### 1c. İstemci IP'si
- Yalnız `req.socket.remoteAddress` kullanılıyor (`server.js:822, 857, 884`); hiçbir proxy başlığı okunmuyor (`server.js:852`).

### 1d. Dağıtım yapılandırması (depoda bulunan)
- `server/store_factory.js:4`: `K_SERVICE` (Cloud Run) veya `NODE_ENV=production` → Firestore zorunlu.
- `Dockerfile`: `PORT=8080`, düz HTTP; TLS platformda sonlanıyor.
- `render.yaml`: Render servisi tanımı (tek disk, SQLite). Hâlâ kullanılıp kullanılmadığı bilinmiyor.
- `firebase.json`: yalnız Firestore ve emülatör. Firebase Hosting yönlendirmesi **yok**.
- Depoda `.github/`, Cloud Build, Cloud Run servis YAML'ı, yük dengeleyici veya Cloud Armor tanımı **yok**.
- **Sonuç:** Gerçek erişim topolojisi depodan doğrulanamıyor. §6'daki salt okunur kontrol gerekiyor.

### 1e. Yerel olarak yeniden üretildi (H-2)
- Scratchpad'deki bir harness, değiştirilmemiş `server.js`'i yerel portta çalıştırdı.
- 25 istek, her biri farklı bir sahte `X-Forwarded-For` (`10.0.0.1`…`10.0.0.25`) ile gönderildi.
- Hepsi **aynı kovaya** düştü: 15 tanesi 200, sonra hepsi 429.
- Proxy arkasında bütün oyuncuların başına gelecek olan budur.

## 2. H-2 kök nedeni

1. **Yanlış güven sınırı:** Cloud Run'da bağlantıyı container'a platformun ön ucu açıyor. `remoteAddress` oyuncunun değil, platformun adresi. Tüm oyuncular tek kovada.
2. **Global hizmet reddi:**
   - Dünya genelinde dakikada 20 yeni misafir hesabı açılabiliyor.
   - Tek saldırgan bu hakkı her dakika tüketip tüm yeni oyuncuları kilitleyebilir.
3. **Süreç içi `Map` ikinci global kilit:** 2000 farklı anahtar dolunca yeni anahtarlar reddediliyor. IP doğru çözülünce çok IP'li saldırganın kilit aracı olur.
4. **Ekonomik etki bugün düşük:**
   - ENG-05 ve ENG06-02 sonrası yeni hesabın tüm altını bound.
   - Kalan Sybil değeri: taciz (davet, presence), liderlik tabloları, depolama büyümesi ve gelecekteki tekrarlanabilir earned ödüller.
   - **En acil etki hizmet reddi.**

## 3. Alternatifler ve kapsam

| Alternatif | Durum (revizyon 2) |
|---|---|
| **A** Güvenilir proxy ile IP çözümleme + katmanlı dağıtık limit | **İlkesel olarak uygun.** Hop değeri ve limitler onay bekliyor. |
| **B** Sunucu imzalı proof-of-work bootstrap | **Ertelendi.** |
| **C** Cloud Armor / CAPTCHA | **Ertelendi.** CAPTCHA eklenmeyecek. |
| **D1** Takas/davet için hesap yaşı eşiği | **Ertelendi.** Hesap yaşı kuralı eklenmeyecek. |
| **D2** Tekrarlanabilir earned ödüllerde günlük tavan | **Ertelendi** (ENG06-07 ile ele alınacak). |
| **D3** Terk edilmiş misafir hesap silme | **Ertelendi.** Hesap silinmeyecek. |
| **D4** Origin'siz `POST /api/session` reddi | **Bot koruması değil.** Yalnız ek sertleştirme olarak sunuluyor; §5 ve §11. |

## 4. Önerilen çözüm (A, revizyon 2)

### 4a. İstemci IP çözümleme (`server/client_ip.js`, yeni, saf fonksiyon)
- `TRUSTED_PROXY_HOPS` **tanımsızsa**:
  - Bugünkü davranış (soket adresi) korunur.
  - Üretimde başlangıçta uyarı loglanır.
  - **Başlıklara asla güvenilmez.**
- Tanımlıysa (N ≥ 1):
  - `X-Forwarded-For` (birden çok başlık virgülle birleşik) **sağdan** okunur.
  - En sağdaki N−1 giriş güvenilir altyapının iç hop'larıdır. Ondan önceki giriş istemcidir.
  - İstemcinin yazdığı sol girişlere hiç bakılmaz.
- **Uzunluk değişikliği (revizyon 2):**
  - Başlık uzunluğu tek başına `unresolved` sebebi değildir; ayrıştırma sağdan, en fazla N giriş için yapılır.
  - Böylece saldırgan uzun başlık gönderip paylaşılan `unresolved` kovasına girip onu kirletemez.
  - Node, toplamı 16 KB üstü başlıkları zaten reddeder (`--max-http-header-size` varsayılanı).
- Yalnız güvenilir konumdaki giriş geçersizse (ya da başlık N'den kısaysa) anahtar `unresolved` olur. Bu bir yapılandırma hatasıdır ve loglanır.
- Normalizasyon:
  - `::ffff:a.b.c.d` → IPv4.
  - Köşeli parantez ve port atılır.
  - IPv6 küçük harf ve tam form.
- Önek anahtarları (§7b):
  - IPv4: `/32` ve `/24`.
  - IPv6: `/64`, `/56` ve `/48`.

### 4b. Anahtar gizliliği
- `HMAC-SHA256(SESSION_SECRET, "guest-ip:" + prefix)`. Ham IP ve tuzsuz özet saklanmaz.
- `SESSION_SECRET` yoksa üretimde başlangıç hatası mı, uyarı mı olacağı ayrı bir karar (§11).

### 4c. Süreç içi `Map`
- Yalnız ucuz ön filtre olarak kalır.
- Dolu olduğunda **reddetmez, atlanır**; karar dağıtık limite bırakılır.
- Alternatif: tamamen kaldırmak. Dağıtık limit zaten iki backend'de transaction'lı.

### 4d. Katmanlı limitler (değerler öneri; §9 testleri sonrası onaylanacak)

| Katman | Öneri | Amaç |
|---|---|---|
| `ip` (v4 /32, v6 /64) | 10 / 10 dk | Patlama |
| `ip-day` (v4 /32, v6 /64) | 50 / 24 saat | Yavaş Sybil |
| `v4/24`, `v6/56` | 30 / 10 dk | Komşu adres rotasyonu |
| `v6/48` | 60 / 10 dk | Ucuz IPv6 blok rotasyonu |
| `unresolved` | 5 / dk | Yalnız yapılandırma hatası |
| global | §7c'deki "sıkılaştırma modu" | Devre kesici, **tam blokaj değil** |

- Sıralama kuralı: dar katmanlar önce, global en son kontrol edilir.
- Bir katman reddederse sonraki katmanlar tüketilmez. Bugünkü `consume` reddedilen isteği zaten saymıyor, ama ardışık çağrılarda önceki katman sayılmış olur.
- Bu yüzden katmanlar **tek transaction'da** kontrol edilmeli: ya hepsi artar ya hiçbiri.
- Bunun için `consumeRates([...])` adında çoklu anahtarlı bir store fonksiyonu gerekir. Yeni bir şema değil, mevcut satır/doküman biçimiyle (§8).

## 5. D4 / Origin testi (revizyon 2, yerel ölçüm)

**Yöntem:**
- Değiştirilmemiş `server.js` scratchpad'deki bir harness içinde `http://localhost:3987` üzerinde çalıştırıldı.
- Harness yalnız `/api/session` ve `/ws` isteklerinin başlıklarını logladı.
- İstemci olarak yerleşik tarayıcı (Chromium) ve curl kullanıldı.
- Harness ve probe sayfaları scratchpad'de; depoya eklenmedi.

| Durum | Origin | Sec-Fetch-Site | Sonuç |
|---|---|---|---|
| Oyunun kendi kayıt akışı (ilk ziyaret, iki çağrı, tek hesap) | `http://localhost:3987` | `same-origin` (mode `cors`) | 200 |
| WebSocket upgrade | `http://localhost:3987` | yok | upgrade |
| `navigator.sendBeacon` | `http://localhost:3987` | `same-origin` (mode `no-cors`) | 200 |
| Düz HTML form POST | `http://localhost:3987` | `same-origin` (mode `navigate`) | 200 |
| Sandbox'lı iframe (`Origin: null` beklenir) | — | — | Tarayıcı isteği göndermedi (`Failed to fetch`); sunucuya ulaşmadı |
| curl, `Origin: null` | `null` | yok | **403** (zaten reddediliyor) |
| curl, başka host (`127.0.0.1` ↔ `localhost`) | farklı | yok | **403** |
| curl, `Sec-Fetch-Site: cross-site` | yok | `cross-site` | **403** |
| curl, `Sec-Fetch-Site: same-site` (Origin yok) | yok | `same-site` | 200 |
| curl, başlıksız | yok | yok | **200** |

**Bulgular:**
1. Chromium, oyunun gerçek kayıt akışında ve tüm same-origin POST biçimlerinde `Origin` gönderiyor. D4 bu akışı bozmaz.
2. `Origin: null` bugün zaten 403 alıyor. D4 bu durumu değiştirmez.
3. Eksik Origin yalnız tarayıcı dışı istemcilerde görüldü (curl ve testler). Bunlar başlığı tek satırla ekleyebilir. **D4 bot koruması sağlamaz**, yalnız kazara ve naif otomasyonu engeller.
4. **Yeni risk (kayıt kesintisi):**
   - Origin kontrolü `PUBLIC_URL` ile birebir eşleşiyor.
   - Oyuncular servise `PUBLIC_URL` dışında bir hostname ile ulaşırsa kayıt bugün de 403 alır. Örnek: custom domain yerine `*.run.app`, ya da `www` farkı.
   - Bu durum §6 kontrolünde doğrulanmalı.
5. Ölçülmeyenler:
   - Firefox ve Safari tarayıcıları.
   - Mobil WebView ve gizlilik eklentileri.
   - Kurumsal proxy'lerin başlık silmesi.
   - Bilinen tarayıcılar same-origin POST'ta Origin gönderir. Yine de bu bir varsayımdır ve §9'daki matriste test edilmeli.
6. `Sec-Fetch-Site: same-site` + Origin yok kombinasyonu kabul ediliyor. Gerçek tarayıcıda Origin'siz POST beklenmediğinden pratik etkisi yok, ama D4 bunu da kapatır.

**Öneri:** D4, dağıtım öncesi tarayıcı matrisi (§9d) geçerse ayrı ve küçük bir sertleştirme olarak alınabilir. Bot koruması olarak sayılmaz. Karar §11.

## 6. Salt okunur topoloji kontrol planı (revizyon 2)

Amaç: `TRUSTED_PROXY_HOPS` değerini tahmin değil, gözlem ile belirlemek.
- Tüm komutlar **yalnız okur** (`list`, `describe`, `read`, `GET`).
- Dağıtım sahibi kendi yetkisiyle çalıştırır. Claude bu görevde üretim hesaplarına erişmez.
- Çıktılardaki gizli değerler (env secret'ları) Proje Merkezi'ne paylaşılmadan önce maskelenmeli.

| # | Kontrol | Komut (salt okunur) | Neye bakılır |
|---|---|---|---|
| T1 | Hangi servis(ler) var | `gcloud run services list --format="table(metadata.name,region,status.url)"` | Servis adı, bölge, `*.run.app` URL'si |
| T2 | Servis yapılandırması | `gcloud run services describe <SERVIS> --region <BÖLGE> --format=yaml` | `run.googleapis.com/ingress` (`all` / `internal` / `internal-and-cloud-load-balancing`); `PUBLIC_URL`, `NODE_ENV`, `SESSION_SECRET` var mı (değer değil); `autoscaling.knative.dev/maxScale` (çok instance); `containerConcurrency`; `sessionAffinity` |
| T3 | Domain mapping | `gcloud beta run domain-mappings list --region <BÖLGE>` | Custom domain doğrudan Cloud Run'a mı bağlı |
| T4 | Yük dengeleyici zinciri | `gcloud compute network-endpoint-groups list --filter="networkEndpointType=SERVERLESS"`; `gcloud compute backend-services list`; `gcloud compute url-maps list`; `gcloud compute target-https-proxies list`; `gcloud compute forwarding-rules list --global` | Serverless NEG varsa harici HTTPS LB önde |
| T5 | Cloud Armor | `gcloud compute security-policies list` | Mevcut kenar politikası var mı |
| T6 | Firebase Hosting | `firebase hosting:sites:list` ve hosting projesinde `firebase.json` rewrites | Hosting → Cloud Run rewrite ek bir CDN hop'u ekler |
| T7 | DNS | `nslookup -type=A <domain>`; `nslookup -type=AAAA <domain>` | Domain mapping adresleri mi, LB statik IP'si mi, başka CDN mi |
| T8 | Yanıt başlıkları | `curl -sI https://<domain>/` ve `curl -sI https://<servis>.run.app/` | `server`, `via`, CDN başlıkları; iki hostname'in de erişilebilir olup olmadığı (§5 bulgu 4) |
| T9 | Platformun gördüğü IP | `gcloud logging read 'resource.type="cloud_run_revision" AND httpRequest.requestUrl:"/api/session"' --limit=5 --format="json(httpRequest.remoteIp,httpRequest.requestUrl,timestamp)"` | Platformun kaydettiği istemci IP'si; bilinen bir test IP'siyle karşılaştırılır |
| T10 | Render | Render panelinde `ejder-ocagi-online` servisi aktif mi; DNS ona mı gidiyor | Aktifse ikinci, farklı bir proxy topolojisi |

**Karar tablosu (T1–T10 sonrası, onayla seçilir):**

| Gözlenen topoloji | Beklenen XFF biçimi | Aday değer | Ek koşul |
|---|---|---|---|
| Doğrudan `*.run.app` veya domain mapping | `<istemci yazdıkları…>, <istemci>` | `1` | — |
| Harici HTTPS LB → serverless NEG → Cloud Run | `<…>, <istemci>, <LB>` | `2` | Ingress `internal-and-cloud-load-balancing` olmalı; aksi halde `*.run.app` üzerinden LB atlanır ve hop sayısı farklı olur |
| Firebase Hosting rewrite → Cloud Run | CDN'e bağlı | **Belirsiz** | Ayrı doğrulama gerekir |
| Birden fazla giriş yolu aynı anda açık | Yola göre değişir | **Tek değer güvenli değil** | Önce giriş yolu teke indirilmeli (altyapı kararı) |
| Render | Render'a özgü | Ayrı doğrulama | — |

**Ampirik doğrulama (uygulama sonrası, yalnız staging, ayrı onayla):**
- Geçici, yalnız staging'de açık ve `NODE_ENV!=production` koşullu bir tanı uç noktası, ham XFF'i ve çözülen anahtarı döndürür.
- Bilinen bir istemci IP'siyle T9 kaydı karşılaştırılır, sonra uç nokta kaldırılır.
- Üretimde çalıştırılmaz.

## 7. Global devre kesici: hizmet reddi analizi (revizyon 2)

### 7a. Revizyon 1 tasarımı (sert global red) saldırıya açık mı?
**Evet.** Kesici dolunca tüm yeni oyuncular reddediliyorsa, kesiciyi doldurmak saldırgan için bir hedefe dönüşür.

| Saldırgan kaynağı | Sert kesici 300/dk'yı dolduruyor mu | Gerekli kaynak |
|---|---|---|
| Tek IP | Hayır (IP başına 10/10 dk) | — |
| 30 IPv4 | Bir dakika için evet (30×10), sonra 9 dk bekler | Patlama |
| Sürekli kilit, IPv4 | Evet | ~300 IP (10/10 dk = 1/dk/IP); günlük 50 tavanıyla tüm gün için ~8 640 IP |
| Konut proxy havuzu | Evet | Ticari havuzlar milyonlarca IP sunuyor; maliyeti düşük |
| **Tek IPv6 /48** (birçok sağlayıcıda ücretsiz) | **Evet, kolayca** (yalnız /64 katmanı varsa) | 65 536 adet /64 → tek makineden |

Ayrıca bir yan etki: sert kesicide reddedilen istek kesiciyi tüketmez. Ama kabul edilen saldırgan istekleri hem hesap oluşturur hem kesiciyi doldurur, yani kesici ne kadar düşükse kilitlemek o kadar ucuz.

### 7b. Önek katmanları
- IPv6 `/56` ve `/48`, IPv4 `/24` agregat limitleri (§4d), /48 saldırısını 60/10 dk ile sınırlar.
- Saldırgan artık farklı /48 veya /24 bloklarına ihtiyaç duyar. Maliyeti gerçek IP çeşitliliğine bağlar.
- Yanlış pozitif riski: büyük kampüs veya CGNAT'ta /24 agregatı. §9'da ölçülecek.

### 7c. Önerilen kesici davranışı: "sıkılaştırma modu" (tam blokaj yok)
1. **Normal mod:** §4d katmanları.
2. **Sıkılaştırma modu:** son 1 dakikadaki toplam yeni misafir sayısı eşiği (öneri 300/dk) aşarsa, 10 dakika boyunca:
   - IP veya /64 başına **24 saatte 1 yeni hesap**.
   - `/24`, `/56` ve `/48` agregatları 1/3'e iner.
   - Bu IP'den bugün hiç hesap açılmamışsa kayıt **her zaman** kabul edilir. Saldırgan, başkasının ilk kaydını engelleyemez; yalnız kendi IP'lerini tüketir.
   - Yapısal uyarı logu (`guest_breaker_tripped`) yazılır; dağıtım sahibi alarm bağlayabilir.
3. **Maliyet tavanı:** çok yüksek bir sert tavan (öneri 3000/dk). Yalnız depolama ve maliyet patlamasına karşı. Aşılırsa red ve alarm.
   - Bu tavanın kendisi de bir hizmet reddi yüzeyidir, ama ~3000 IP/dk gerektirir.
   - Değeri ve var olup olmayacağı onay konusu.
4. Mevcut, çerezli oyuncular hiçbir modda etkilenmez.

**Kalan risk:**
- Çok büyük bir IP havuzu yeni oyuncuları maliyet tavanına kadar zorlayabilir. Bunun kalıcı çözümü ertelenen B veya C.
- Sıkılaştırma modunda CGNAT arkasındaki ikinci yeni oyuncu o gün 429 alır. 429 mesajı ve `Retry-After` başlığı açık olmalı.

### 7d. Firestore uygulama notu
- Tek sayaç dokümanı yaklaşık 1 yazma/sn sürdürülebilir sınırına takılır. Global sayaç 10 shard'a bölünür; okuma için 10 shard toplanır.
- Okuma maliyetini düşürmek için kesici durumu instance başına 5 sn önbelleklenir. Bu, kesicinin birkaç saniye geç açılmasına izin verir.
- Bir yeni misafir için tahmini maliyet: tek transaction'da 5–7 doküman okuma/yazma. SQLite'ta tek transaction.

## 8. Etkilenecek dosyalar ve bağımlılıklar (uygulama onayı sonrası)

| Dosya | Değişiklik |
|---|---|
| `server/client_ip.js` (yeni) | `clientKeys(req,{trustedHops})` → `{kind, keys:{ip, v4_24 | v6_56, v6_48}}` |
| `server/service_security.js` | `GUEST_LIMITS`, `hmacKey`, kesici mod hesapları (saf) |
| `server/economy_store.js`, `server/firestore_store.js` | `consumeRates(entries)`: çoklu anahtarı tek transaction'da hep-ya-hiç tüketir; mevcut satır/doküman biçimi, yeni tablo, koleksiyon veya indeks yok |
| `server.js:852-889` | Yeni anahtarlar; dolu `Map` atlaması; kesici modu; 429'da `Retry-After`; (D4 onaylanırsa) Origin zorunluluğu |
| `tests/client_ip.test.js` (yeni), `tests/guest_limits.test.js` (yeni), `tests/server_foundation.test.js`, `tests/firestore_store.integration.js` | §9 |
| `render.yaml`, Cloud Run | **Dokunulmaz.** `TRUSTED_PROXY_HOPS` yalnız belgelenir. |

- Yeni npm bağımlılığı yok.
- `consumeRates` mevcut store arayüzüne bir fonksiyon ekler; kalıcı veri biçimi değişmez.
- Eski `sha256` anahtarlı rate kayıtları pencere sonunda (en fazla 24 saat) `pruneServiceState` ile kendiliğinden temizlenir.

## 9. Test planı (revizyon 2)

### 9a. Birim (`tests/client_ip.test.js`)
- Hop 0/1/2 × XFF yok / tek / çoklu başlık / sahte sol girişler / 7 KB'lık sol çöp.
- Sahte sol girişler ve uzun başlık anahtarı **değiştirmemeli** ve `unresolved`'a **düşürmemeli**.
- IPv4, IPv6, `::ffff:`, köşeli parantez + port, büyük/küçük harf, sıkıştırılmış form.
- `/24`, `/64`, `/56`, `/48` önek üretimi.
- Güvenilir konumdaki girişin geçersiz olması → `unresolved`.

### 9b. Katman ve kesici mantığı (`tests/guest_limits.test.js`, sahte saat)
- Hep-ya-hiç: bir katman reddederse diğerlerinin sayacı artmaz.
- Normal → sıkılaştırma → normal geçişleri; eşik ve süre.
- Sıkılaştırma modunda "bugün ilk kez görülen IP" her zaman kabul.
- Maliyet tavanı.

### 9c. Ortak IP ve yüksek trafik senaryoları (yerel sunucu, `TRUSTED_PROXY_HOPS=1`, simüle XFF, sahte saat)

| # | Senaryo | Simülasyon | Beklenen (öneri değerlerle) | Ölçülecek |
|---|---|---|---|---|
| S1 | Sınıf: 30 öğrenci, tek IPv4, 5 dk | 30 yeni misafir, aynı IP | İlk 10 kabul, 20'si 10 dk bekler | **Yanlış pozitif oranı.** 10/10 dk sınıf için düşükse değer revize edilir. |
| S2 | İnternet kafe: 1 IP, gün boyu 80 yeni kişi | 80 yeni misafir / 24 saat dağınık | 50'de günlük tavan | Günlük tavanın uygunluğu |
| S3 | Mobil CGNAT: 1 IPv4, saatte 200 yeni oyuncu | 200 / saat | Büyük kısmı reddedilir | **En yüksek yanlış pozitif riski.** CGNAT'ın gerçek payı bilinmiyor; T9 loglarından tahmin edilmeli. |
| S4 | Kampüs: aynı /24'te 100 farklı IP, 10 dk | 100 IP × 1 | /24 agregatı 30'da keser | /24 değerinin uygunluğu |
| S5 | IPv6 mobil: aynı /64'te adres rotasyonu | 1 kullanıcı, 20 farklı adres | /64 tek kova: 10 | — |
| S6 | Lansman/etkinlik: 10 dk'da 5000 farklı IP | 500/dk | Sıkılaştırma moduna girer; ilk kez görülen IP'ler kabul | Meşru dalganın kesiciyi açması kabul edilebilir mi |
| S7 | Saldırgan: tek IP | 1000 istek | 10 kabul | — |
| S8 | Saldırgan: 300 IPv4 sürekli | 300 IP × 1/dk | Sıkılaştırma; meşru ilk kayıtlar kabul | **Kesici hizmet reddi** (§7) |
| S9 | Saldırgan: tek /48, 65 536 /64 | /64 rotasyonu | /48 agregatı 60/10 dk | — |
| S10 | Saldırgan: sahte ve uzun XFF | 1000 istek | Tek IP gibi davranır; `unresolved` kirlenmez | — |
| S11 | Çok instance tutarlılığı | 2 süreç (SQLite worker) ve 2 Firestore store, aynı IP'ye paralel | Toplam limit aşılmaz | — |
| S12 | Firestore kesici shard'ları | 2× eşik paralel | Geçiş eşiğin ±%20'si içinde | Shard sapması |
| S13 | Çerezli mevcut oyuncu | Kesici ve tavan doluyken devam | Her zaman 200 | — |
| S14 | Hop yapılandırılmamış (bugünkü durum) | `TRUSTED_PROXY_HOPS` yok | Bugünkü davranış ve uyarı logu | Geriye uyumluluk |

- S1–S14, test yardımcısıyla simüle XFF ve sahte saat kullanılarak yazılır; yeni bağımlılık (yük testi aracı) gerekmez.
- Gerçek yük testi (gerçek ağ, çok IP) staging'de ayrı onay ister.

### 9d. Tarayıcı matrisi (Origin, D4 öncesi)
- Chromium (masaüstü ve Android), Firefox, Safari (macOS ve iOS), Android WebView, iOS WKWebView (ana ekrana eklenmiş PWA dahil).
- Gizlilik eklentisi (uBlock vb.) açık Chromium.
- Her biri için ilk ziyaret → `/api/session` `Origin` ve `Sec-Fetch-Site` değerleri.
- §5'teki harness yöntemi kullanılır.

### 9e. Regresyon
- `npm test` (şu an 58), Firestore emülatörü (`npm run test:firestore`, şu an 8), `npm run test:trade-ui` (Playwright, worktree'de kurulum gerektirir).
- ENG-05 ve ENG-06 altın kaynağı testleri değişmeden geçmeli.

## 10. Kabul kriterleri (revizyon 2)

1. Sahte `X-Forwarded-For` sol girişleri ve uzun başlıklar, hop değeri ne olursa olsun anahtarı değiştirmez ve `unresolved` kovasına düşürmez.
2. Hop doğru yapılandırıldığında farklı istemci IP'leri ayrı kovalarda. Bir IP'nin limiti dolunca diğeri 200 alır.
3. `TRUSTED_PROXY_HOPS` tanımsızken davranış bugünküyle aynı; üretimde uyarı loglanır.
4. IPv4 `/24`, IPv6 `/64`, `/56`, `/48` önekleri doğru üretilir ve agregat limitler uygulanır.
5. Katmanlar hep-ya-hiç tüketilir.
6. Süreç içi `Map` dolu olsa bile karar dağıtık limite ait.
7. Kesici sıkılaştırma modunda, bugün ilk kez görülen bir IP'nin kaydı engellenmez.
8. Çerezli mevcut oyuncu hiçbir limit veya modda 429 almaz.
9. İki süreç ve iki Firestore store aynı anahtar için toplam limiti aşamaz.
10. Ham IP veya tuzsuz özet saklanmaz.
11. 429 yanıtları `Retry-After` içerir.
12. ENG-05 ve ENG-06 testleri (58 SQLite, 8 Firestore) değişmeden geçer.
13. (D4 onaylanırsa) §9d matrisindeki tüm tarayıcılar kayıt olabilir; Origin'siz POST 403 alır.

## 11. Onay gerektiren kararlar (ayrı ayrı)

**Uygulamadan önce zorunlu:**
1. **Topoloji (T1–T10 sonuçları):** `TRUSTED_PROXY_HOPS` değeri, §6 karar tablosuna göre. Birden fazla giriş yolu varsa önce tekleştirilmesi (altyapı, dağıtım sahibi).
2. **Kesici davranışı:** sert global red yerine §7c sıkılaştırma modu. Maliyet tavanı olup olmayacağı ve değeri (öneri 3000/dk).
3. **Limit değerleri (öneri):** IP 10/10 dk, IP 50/gün, `/24`–`/56` 30/10 dk, `/48` 60/10 dk, sıkılaştırma eşiği 300/dk. Kesinleşmesi §9c S1–S6 sonuçlarına bağlı.
4. **Store arayüzü:** `consumeRates` çoklu anahtar fonksiyonunun iki backend'e eklenmesi (kalıcı veri biçimi değişmiyor).

**Ayrı, isteğe bağlı:**
5. **D4:** Origin'siz `POST /api/session` reddi. Bot koruması değil; §9d matrisi geçerse.
6. **Hostname uyumu:** §5 bulgu 4. `PUBLIC_URL` dışı hostname'lerden kayıt bugün 403. T8 sonucuna göre ya tek hostname'e yönlendirme (altyapı) ya da izinli origin listesi (kod). Bu H-2'den bağımsız bir kullanılabilirlik riski.
7. **`SESSION_SECRET` yokluğu:** HMAC anahtarı için üretimde başlangıç hatası mı, uyarı mı?

**Ertelendi (bu pakette yapılmayacak):** B (proof-of-work), C (Cloud Armor / CAPTCHA), D1 (hesap yaşı), D2 (earned günlük tavan, ENG06-07), D3 (hesap silme).

Uygulama onayı için burada duruldu.
