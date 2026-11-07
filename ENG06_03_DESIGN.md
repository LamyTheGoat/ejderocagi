# ENG06-03 · Proxy güven sınırı ve misafir hesap koruması (tasarım)

| Alan | Değer |
|---|---|
| Durum | Tasarım. **Uygulama izni yok.** Üretim kodu yazılmadı. |
| Branch / worktree | `claude/eng-06-economy` · `C:/Users/user/Documents/GitHub/ejderocagi-eng06` |
| Taban commit | `a36011d` (ENG06-02). Paket 1 ve 2 kodu değişmedi. |
| Kaynak bulgu | REVIEW-001 H-2: misafir oluşturma limiti proxy arkasında global oluyor |

---

## 1. Mevcut sistem (kod üzerinden doğrulandı)

### 1a. Misafir oluşturma akışı
`POST /api/session` (`server.js:878-889`):
1. `/api/*` için önce `allowedOrigin(req)` (`server/guest_session.js:19`).
   - `Sec-Fetch-Site: cross-site` reddediliyor.
   - **`Origin` başlığı hiç yoksa istek kabul ediliyor.** Tarayıcı dışı bir betik (curl) Origin göndermediği için engellenmiyor.
2. Geçerli çerez varsa mevcut hesap dönüyor, yeni hesap açılmıyor.
3. Çerez var ama geçersizse `401 invalid_guest_session`.
4. Çerez yoksa iki limit sırayla uygulanıyor:
   - **Süreç içi:** `allowGuestCreation(req)` (`server.js:853-865`).
     - Anahtar `req.socket.remoteAddress`, 60 saniyede 20.
     - `Map` 2000 farklı anahtara ulaşırsa **her yeni anahtar reddediliyor** (fail-closed).
   - **Dağıtık:** `ECONOMY.consumeRate('guest-ip:'+req.socket.remoteAddress, 20, 60000)` (`server.js:884`).
     - SQLite'ta `service_state` satırı (`server/economy_store.js:66-69`); Firestore'da tek doküman transaction'ı (`server/firestore_store.js:40-43`).
     - Anahtar `sha256(key)` ile saklanıyor (tuzsuz).
     - Aşımda `consume` `rate_limited` (429) fırlatıyor (`server/service_security.js:4-8`); `server.js:1333` bunu 429'a çeviriyor.
5. `createGuest()` yeni UUID hesabı, 365 günlük oturum ve `HttpOnly; SameSite=Strict` çerez üretiyor (`server/economy_store.js:189-199`, `guest_session.js:41-44`).
6. Hesap ilk `game.start` komutunda 420 **bound** başlangıç altını alıyor.

### 1b. İstemci IP'si nasıl belirleniyor
- Kodun tamamında istemci IP'si için yalnız `req.socket.remoteAddress` kullanılıyor (`server.js:822, 857, 884`).
- `X-Forwarded-For`, `X-Real-IP`, `Forwarded` hiçbir yerde okunmuyor. `server.js:852` yorumu bunu bilinçli bir karar olarak belirtiyor.
- `server.js:822` yerel geliştirici kontrolü de `remoteAddress` kullanıyor ve üretimde zaten kapalı.

### 1c. Dağıtım ortamı
- `server/store_factory.js:4`: `K_SERVICE` varsa (Cloud Run) veya `NODE_ENV=production` ise Firestore zorunlu.
- `Dockerfile`: `PORT=8080`, düz HTTP. TLS'yi platform sonlandırıyor.
- `render.yaml` da hâlâ duruyor (Render, tek disk, SQLite). İki platformun proxy davranışı farklı (bkz. §6).
- Depoda Cloud Run servis tanımı, yük dengeleyici veya Cloud Armor yapılandırması **yok**. Gerçek topoloji koddan doğrulanamıyor; §9 karar 1.

### 1d. Diğer ilgili limitler (değişmeyecek)
- `economy:<accountId>` 120/dk (POST), `ws-connect:<accountId>` 20/dk, davet 6/dk, ret cooldown 5 dk. Hepsi **hesap** anahtarlı.
  Yeni hesap yeni kova demek; bu yüzden misafir oluşturma limiti Sybil hesap üretimine karşı tek ön kapı.

### 1e. Mevcut test kapsamı
- `tests/server_foundation.test.js:150-152`: yerel soket IP'siyle 20/dk sınırı ve çerezli devamın 429 almadığı test ediliyor.
- Proxy başlığı, IPv6 ve çok süreçli tutarlılık testi yok.

## 2. H-2 kök nedeni

1. **Yanlış güven sınırı.** Cloud Run'da TCP bağlantısını container'a Google Front End (GFE) açıyor.
   `req.socket.remoteAddress` istemcinin değil, platformun iç adresidir.
   Tüm oyuncular aynı (veya çok az sayıda) anahtara düşüyor.
2. **Sonuç: limit global oluyor.**
   - Tüm dünyada dakikada 20 yeni misafir hesabı açılabiliyor.
   - Tek bir saldırgan bu 20 hakkı her dakika tüketerek **tüm yeni oyuncuları kilitleyebilir** (hizmet reddi).
   - Aynı anda Sybil koruması da kalmıyor; saldırganın hesap açma hızı sadece meşru oyuncularla yarışmasıyla sınırlı.
3. **Süreç içi `Map` ikinci bir global kilit.** 2000 farklı anahtar dolarsa yeni anahtarlar reddediliyor.
   IP doğru çözülmeye başladığında bu, çok IP'li bir saldırganın herkesi kilitlemesine izin verir.
4. **Origin'siz isteklerin kabulü.** Tarayıcı dışı otomasyon için ek bir sürtünme yok. Bu tek başına bir açık değil (CSRF koruması için tasarlanmış), ama Sybil maliyetini düşürüyor.

**Bugünkü ekonomik etki (ENG-05 + ENG06-02 sonrası):**
- Yeni hesabın 420 başlangıç altını ve tüm tek seferlik hedef ödülleri bound; devredilemez. Doğrudan altın basımı kapalı.
- Kalan Sybil değeri:
  - (a) gelecekteki tekrarlanabilir earned ödüller (ENG06-07),
  - (b) davet, presence ve takas taciz yüzeyi (M-1, M-3),
  - (c) liderlik tabloları ve dünya rotaları (ENG06-09),
  - (d) depolama ve maliyet büyümesi (terk edilmiş hesaplar hiç silinmiyor).
- **En acil etki hizmet reddi**, ekonomi değil.

## 3. Çözüm alternatifleri

### Alternatif A — Güvenilir proxy ile istemci IP çözümleme + katmanlı dağıtık limit (yalnız sunucu)
- Yeni modül `server/client_ip.js`:
  - `TRUSTED_PROXY_HOPS` (sayı) yapılandırmasına göre `X-Forwarded-For`'u **sağdan** okur.
  - Sağdaki N giriş güvenilir altyapının eklediği girişlerdir. Ondan hemen önceki giriş istemci IP'sidir.
  - Soldaki (istemcinin kendi gönderdiği) girişlere asla bakılmaz.
  - `net.isIP` ile doğrular; `::ffff:a.b.c.d` → IPv4.
  - **IPv6 /64 önekine** indirger (tek abonelik genelde bir /64 alır).
  - Ayrıştırma başarısızsa veya başlık beklenen hop sayısından kısaysa anahtar `unresolved` olur ve sıkı ayrı bir limite düşer.
- Katmanlar (hepsi mevcut `consumeRate` üzerinden, yeni şema yok):

  | Anahtar | Önerilen değer | Amaç |
  |---|---|---|
  | `guest-ip:<ip>` | 10 / 10 dk | Patlama |
  | `guest-ip-day:<ip>` | 50 / 24 saat | Yavaş Sybil |
  | `guest-global:<shard>` | Toplam ~300/dk, 10 shard | Devre kesici; tek IP'nin değil, dağıtık saldırının sınırı |
  | `guest-unresolved` | 5 / dk | Yapılandırma hatası veya beklenmeyen topoloji |

- Süreç içi `Map`:
  - Ucuz ön filtre olarak kalır.
  - Dolunca **reddetmek yerine** atlanır; doğruluk kaynağı dağıtık limittir.
  - Ya da tamamen kaldırılır.
- `TRUSTED_PROXY_HOPS` üretimde tanımlı değilse:
  - Sunucu başlangıçta uyarı loglar ve bugünkü davranışa döner (soket adresi).
  - Global devre kesici yine çalışır.
  - **Sessizce başlığa güvenmez.**
- Anahtar gizliliği: `sha256` yerine `HMAC(SESSION_SECRET, ip)`.
  IPv4 uzayı küçük olduğundan tuzsuz özet tersine çevrilebilir (KVKK).

**Artı:** Altyapı bağımlılığı yok, şema yok, oyuncuya görünmez. Çoklu süreçte tutarlı (mevcut transaction'lı `consumeRate`). Hızla test edilebilir.
**Eksi:** Doğruluğu gerçek hop sayısına bağlı. Yanlış yapılandırma ya spoofing'e (fazla hop) ya da tekrar global limite (eksik hop) yol açar; §7'deki dağıtım doğrulaması şart. Çok IP'li (botnet, mobil proxy havuzu) saldırgana karşı yalnız global kesici koruyor.

### Alternatif B — A + sunucu imzalı, görünmez proof-of-work bootstrap
- `GET /api/session/challenge`, HMAC imzalı ve kısa ömürlü bir nonce ile zorluk değeri döner.
- İstemci `POST /api/session`'da hashcash çözümünü gönderir. Orta cihazda yaklaşık 0,5–1 sn, tek seferlik.
- Zorluk yük altında dinamik artabilir; global kesici dolmaya yaklaştıkça yükselir.
- Nonce tek kullanımlık. Tekrar kullanım `consumeRate('pow:'+nonce,1,…)` ile engellenir; yeni şema yok.

**Artı:** IP'den bağımsız maliyet; botnet ve CGNAT durumlarında adil. Üçüncü taraf ve çerez bannerı yok. Hesap açmanın maliyetini lineer büyütür.
**Eksi:** İstemci değişikliği gerekir (`js/` bootstrap). Düşük güçlü cihazlarda gecikme. Kararlı saldırgan GPU ile çözer; tek başına yeterli değil, A'nın tamamlayıcısı.

### Alternatif C — Kenar (edge) koruması: Cloud Armor oran kuralları ve/veya Turnstile / reCAPTCHA Enterprise
- Harici HTTPS yük dengeleyici + Cloud Armor `rate_based_ban` kuralı `/api/session` için.
- Ya da bootstrap'ta CAPTCHA token doğrulaması.

**Artı:** Gerçek istemci IP'sini platform çözer; bot sinyalleri; uygulama dışında ölçeklenir.
**Eksi:** Yeni altyapı ve maliyet. Gerçek Cloud Run ayarlarına dokunmayı gerektirir; bu görevde yasak. Üçüncü taraf veri paylaşımı ve gizlilik metni. CAPTCHA oyuncuya görünür sürtünmedir.

### Alternatif D — Hesap ve işlem temelli korumalar (A/B/C'yi tamamlar)
Bunlar oyun davranışını etkileyebildiği için her biri ayrı onay ister:
1. **Takas ve davet için hesap yaşı/oynanış eşiği.**
   - Örneğin hesap en az 10 dk eski ve en az 1 sunucu komutu işlenmiş olmadan `invite` atamaz.
   - Taciz ve takas Sybil'ini doğrudan keser.
2. **Gelecekteki tekrarlanabilir earned ödüllerde hesap başına günlük tavan.**
   - ENG06-07 ile birlikte; earned üretici gelmeden anlamsız.
3. **Terk edilmiş misafir hesap saklama politikası.**
   - Örneğin 90 gün hiç komut çalıştırmamış ve varlık taşımayan hesapların silinmesi. Depolama maliyetini sınırlar.
   - Kalıcı veri silme olduğundan onay ister.
4. **Origin'siz `POST /api/session` reddi.**
   - Tarayıcılar same-origin `POST`'ta `Origin` gönderir; otomasyonun maliyetini çok az artırır, gerçek oyuncuyu etkilemez.
   - Mevcut testler `origin` göndermeyen çağrılar yapıyor olabilir; test uyarlaması gerekir.

## 4. Önerilen çözüm

**ENG06-03 = Alternatif A + D4.**
B, kesici gerçekten dolarsa açılacak ikinci aşama olarak tasarlanır ama şimdi uygulanmaz.
C ve D1–D3 ayrı kararlar olarak Proje Merkezi'ne sunulur.

Gerekçe:
- H-2'nin kök nedeni güven sınırı; A doğrudan onu düzeltiyor.
- A yeni şema, yeni bağımlılık ve oyun değişikliği getirmiyor. Mevcut `consumeRate` iki backend'de transaction'lı ve test edilmiş.
- Global devre kesici, A'nın en zayıf noktasını (yanlış hop, çok IP) sınırlı tutuyor.
  Kesici dolsa bile mevcut oyuncular etkilenmiyor; çerezli devam hiçbir limite takılmıyor.
- Ekonomi tarafında ENG-05/ENG06-02 sayesinde Sybil hesabın altın değeri zaten sıfıra yakın. Bu yüzden oyuncuya görünür sürtünme (CAPTCHA) şu an orantısız.
- Kalıcı IP yasağı yok; tüm limitler pencereli ve kendiliğinden sona eriyor.

Firestore notu:
- Tek bir global sayaç dokümanı, doküman başına yaklaşık 1 yazma/sn sürdürülebilir sınırına takılır.
- Global kesici bu yüzden 10 shard'a bölünür: `guest-global:<0-9>`, istek rastgele bir shard'a yazılır, her shard limit/10.
- Shard seçimi rastgele olduğundan toplam limit yaklaşık uygulanır. Bir devre kesici için yeterli.
- Ek bir koruma olarak, kesici dolduğunda `consumeRate` çağrısı yapılmadan önce süreç içi kısa bir "kesici açık" önbelleği (5 sn) Firestore yazma maliyetini düşürür.

## 5. Yanlış pozitif ve saldırı senaryoları

| Senaryo | Bugün | A sonrası | Not |
|---|---|---|---|
| Okul, internet kafe, şirket NAT'ı (aynı IPv4) | Herkes global 20/dk'yı paylaşıyor | IP başına 10/10 dk, 50/gün | Yalnız **yeni hesap açma** etkilenir; çerezli oyuncu hiç etkilenmez. Sınıf başına 50/gün yeterli varsayıldı (karar 3). |
| Mobil operatör CGNAT (binlerce kişi tek IPv4) | Global | Aynı IPv4 için 50/gün yetmeyebilir | Pik saatte yanlış pozitif riski en yüksek senaryo. 429 yanıtı "bir dakika sonra tekrar dene" mesajı verir. Gerekirse B devreye alınır. |
| IPv6 kullanıcısı her bağlantıda farklı adres (privacy extensions) | — | /64 önekine indirgenir, tek kullanıcı | — |
| Aynı ev, birden çok cihaz | Global | Rahat | — |
| VPN kullanıcısı | Global | VPN çıkış IP'sini paylaşanlarla aynı kova | Saldırgan VPN rotasyonu yapabilir → global kesici ve günlük tavan. |
| Değişken mobil IP | — | Her yeni IP yeni kova | Meşru kullanıcı için zararsız; saldırgan için IP havuzu maliyeti. |
| **Saldırı:** `X-Forwarded-For: 1.2.3.4` sahteciliği | Başlık okunmuyor | Sağdan N hop okunur; istemcinin yazdığı sol girişler yok sayılır | Test edilir (§8). |
| **Saldırı:** çok uzun veya bozuk XFF | — | 1 KB üstü ya da ayrıştırılamayan → `unresolved` kovası | — |
| **Saldırı:** doğrudan `*.run.app` URL'sine gidip yük dengeleyiciyi atlama | — | Hop sayısı topolojiye bağlı | LB kullanılırsa Cloud Run ingress "internal + LB" yapılmalı (karar 1, altyapı). |
| **Saldırı:** botnet / konut proxy havuzu | Global | IP başına limit aşılmaz; global kesici (300/dk) sınırlar | Kesici dolunca yeni oyuncular da bekler. Kalıcı çözüm B veya C. |
| **Saldırı:** global kesiciyi doldurarak yeni oyuncuları kilitleme | 20/dk ile çok kolay | 300/dk için yaklaşık 30+ IP gerekir (10/IP/10dk) | Risk azalıyor ama sıfır değil; B ile kesici dolarken PoW zorluğu artar. |
| **Saldırı:** süreç içi `Map`'i doldurma | 2000 anahtarda herkes reddedilir | Doluysa atlanır | — |
| **Saldırı:** çerezi silip tekrar açma | Yeni hesap | Aynı IP kovası | — |

## 6. Etkilenecek dosyalar ve bağımlılıklar

| Dosya | Değişiklik |
|---|---|
| `server/client_ip.js` (yeni) | `clientKey(req, {trustedHops})` → `{key, kind:'v4'|'v6/64'|'unresolved'}`; saf fonksiyon, birim test edilebilir |
| `server.js:852-889` | `allowGuestCreation`'ı yeni anahtarla kullanmak; dolu `Map`'te atlama; katmanlı `consumeRate` çağrıları; Origin'siz bootstrap reddi (D4) |
| `server/service_security.js` | Limit sabitleri (`GUEST_LIMITS`) ve `hmacKey` yardımcısı |
| `server/economy_store.js`, `server/firestore_store.js` | **Değişiklik yok** beklenir (`consumeRate` aynı). HMAC'li anahtar çağırandan gelir. |
| `tests/client_ip.test.js` (yeni), `tests/server_foundation.test.js` | §8 |
| `render.yaml`, Cloud Run servis tanımı | **Dokunulmaz.** Yalnız `TRUSTED_PROXY_HOPS` env değişkeni belgelenir; değerini ayarlamak dağıtım sahibinin işi. |

- Yeni npm bağımlılığı yok (`node:net`, `node:crypto`).
- Yeni Firestore koleksiyonu veya indeksi yok: rate dokümanları mevcut güvenlik koleksiyonunda, `expiresAt` ile mevcut `pruneServiceState` temizliyor.
- Yeni SQLite tablosu yok.

Platform hop varsayımları (**dağıtımda doğrulanmalı, koddan doğrulanamaz**):
- Cloud Run doğrudan `*.run.app` veya domain mapping: GFE istemci IP'sini XFF'in sonuna ekler → `TRUSTED_PROXY_HOPS=1`.
- Cloud Run önünde Google harici HTTPS LB: LB `<istemci>, <LB IP>` ekler → istemci sağdan ikinci; `TRUSTED_PROXY_HOPS=2`.
- Render: istemci IP'sini XFF'e ekler; hop sayısı Render belgesi ve deneme ile doğrulanmalı.

## 7. Kabul kriterleri

1. Sahte `X-Forwarded-For` sol girişleri, `TRUSTED_PROXY_HOPS` hangi değerde olursa olsun anahtarı değiştirmez.
2. `TRUSTED_PROXY_HOPS=1` ile farklı gerçek istemci IP'leri (simüle) ayrı kovalara düşer. Bir IP'nin limiti dolunca diğer IP 200 alır.
3. `TRUSTED_PROXY_HOPS` tanımsızken davranış bugünküyle aynı (soket adresi). Başlangıçta üretim uyarısı loglanır.
4. IPv6 adresleri /64'e, `::ffff:` IPv4'e normalize edilir. Aynı /64'teki iki adres aynı kova.
5. Ayrıştırılamayan, beklenenden kısa veya 1 KB üstü XFF `unresolved` kovasına düşer; sunucu çökmez.
6. Global kesici dolduğunda yeni misafir 429 alır, **çerezli mevcut oturum 200 almaya devam eder**.
7. Süreç içi `Map` dolu olsa bile dağıtık limitin izin verdiği yeni IP kabul edilir.
8. İki ayrı süreç (SQLite worker ve Firestore emülatörü üzerinde iki store) aynı IP için toplam limitten fazla hesap açamaz.
9. Saklanan rate anahtarları ham IP'den HMAC ile türetilir; ham IP ve tuzsuz SHA-256 hiçbir yerde saklanmaz.
10. Origin'siz `POST /api/session` 403 alır (D4 onaylanırsa). Same-origin tarayıcı akışı etkilenmez.
11. ENG-05 ve ENG-06 testlerinin tamamı (58 SQLite, 8 Firestore) değişmeden geçer. Altın kaynağı mantığına dokunulmaz.

## 8. Test planı

**Birim (`tests/client_ip.test.js`, saf fonksiyon):**
- Hop 0/1/2 × XFF yok / tek / çoklu / sahte sol girişler.
- IPv4, IPv6, `::ffff:` eşlemeli, /64 indirgeme, köşeli parantezli ve portlu biçimler.
- Boş, virgül fazlası, 1 KB üstü, geçersiz karakterli başlıklar → `unresolved`.
- Birden çok `X-Forwarded-For` başlığı (Node bunları virgülle birleştirir) → yine sağdan okuma.

**Sunucu (`tests/server_foundation.test.js`, mevcut test sunucusu yardımcısıyla):**
- Hop 1 ile iki farklı simüle IP'nin ayrı limitleri; biri 429 iken diğeri 200.
- Sahte sol XFF ile limit aşma denemesi → 429.
- Global kesici doluyken çerezli devam 200, yeni misafir 429.
- `Map` dolu senaryosu (2000 sahte anahtar) → dağıtık limit kararı geçerli.
- Mevcut `:150-152` testi korunur (hop 0 = bugünkü davranış).
- D4: Origin'siz bootstrap 403; Origin'li 200.

**Dağıtık (`tests/firestore_store.integration.js` ve SQLite worker):**
- İki store örneği aynı `guest-ip:<hmac>` anahtarına paralel `consumeRate` → toplam limit aşılmaz (Firestore'da mevcut rate yarış testinin genişletmesi).
- 10 shard'lı global kesici: paralel 2× limit istekte kabul sayısı limitin ±%20 içinde.

**Regresyon:** `npm test`, Firestore emülatörü ile `npm run test:firestore`, mümkünse `npm run test:trade-ui`.

**Dağıtım doğrulaması (uygulama sonrası, staging'de, kullanıcı onayıyla; bu görevde yapılmaz):**
- Yalnız staging'de açık, geçici bir tanı uç noktası ham XFF'i ve çözülen anahtarı döndürür.
- Bilinen bir istemci IP'siyle hop sayısı doğrulanır, sonra uç nokta kaldırılır.

## 9. Kullanıcı onayı gerektiren kararlar

1. **Üretim topolojisi:** Cloud Run'a doğrudan mı (`*.run.app` / domain mapping), yoksa harici HTTPS LB arkasından mı erişiliyor? `render.yaml` hâlâ geçerli mi, yoksa kaldırılacak mı?
   Bu, `TRUSTED_PROXY_HOPS` değerini ve ingress ayarını belirler. Ayarı dağıtım sahibi yapar; bu görevde dokunulmaz.
2. **Önerilen çözüm:** ENG06-03'ün Alternatif A + D4 olarak uygulanması.
3. **Limit değerleri:** IP başına 10/10 dk ve 50/gün, global yaklaşık 300/dk, `unresolved` 5/dk. Bu değerler oyuncu deneyimini (okul, CGNAT) etkiler.
4. **D4:** Origin'siz `POST /api/session` reddi (oyun davranışı değil, ama API sözleşmesi değişikliği).
5. **Ertelenen / ayrı kararlar:**
   - B (proof-of-work) hazırda bekletilsin mi?
   - C (Cloud Armor / CAPTCHA): yeni altyapı ve maliyet.
   - D1: takas ve davet için hesap yaşı eşiği (oyun davranışı).
   - D2: tekrarlanabilir earned ödüllerde günlük tavan (ENG06-07 ile).
   - D3: terk edilmiş misafir hesapların silinmesi (kalıcı veri).
6. **Rate anahtarlarının HMAC'e geçişi:** eski `sha256` anahtarlı rate dokümanları en fazla 24 saat içinde kendiliğinden sona erer; migrasyon gerekmez. Yine de anahtar biçimi değiştiği için onay listesinde.

Uygulama onayı için burada duruldu.
