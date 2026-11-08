# ENG-09 düzeltmeleri · Y-1 (okuma limiti + Bedesten önbelleği) ve O-3…O-6 (yerleşim)

02 Engineering · 2026-11-08 · dal `claude/eng-09-fixes` (taban `claude/eng-09-release-qa` @ `d3d9ef4`)
Kapsam yalnız `ENG09_RELEASE_READINESS.md` içindeki Y-1, O-3, O-4, O-5 ve O-6. Bulgular önce kod ve ölçümle yeniden doğrulandı.

## Commit'ler

| # | Konu | Dosyalar |
|---|---|---|
| 1 | Y-1: GET okuma limiti + `GET /api/market` kısa ömürlü önbellek | `server.js`, `server/market_read_cache.js` (yeni), `server/economy_store.js`, `server/firestore_store.js`, `tests/eng09_read_limits.test.js` (yeni), `tests/firestore_store.integration.js` (+1 test) |
| 2 | O-3…O-6: yalnız CSS + yeni Playwright yerleşim testi + bu belge | `style.css` (sona yorumlu blok), `tests/eng09_layout.e2e.js` (yeni), `tests/playwright.config.js` (testMatch'e dosya adı), `package.json` (`test:layout`) |

## 1. Y-1 · Okuma uçları

**Doğrulama (önce):** `server.js` `handleHttp` içinde hız limiti yalnız POST için vardı (`'economy:'` kovası). `GET /api/market` oturumsuz çalışıyordu ve her çağrıda `listMarket` iki sorgu yapıyordu (açık ilanlar en çok 100, satıcının kendi ilanları en çok 30). İstemci Bedesten açıkken 10 sn'de bir `/api/market` + `/api/economy` çağırıyor (`js/market_client.js:93`), Takas açıkken 5 sn'de bir `/api/trade/state` + `/api/trade/peers` (`js/trade_ui.js:60`). WS `market_update` yalnız yeniden çizdiriyor, GET tetiklemiyor (`js/net.js:179`).

**Düzeltme:**
- **Limit:** `GET /api/market`, `/api/economy`, `/api/trade/state`, `/api/trade/peers` ortak bir okuma kovasından düşer. Oturum varsa anahtar hesap (`read:<accountId>`), yoksa IP (`read-ip:<remoteAddress>`). Aşımda mevcut biçim: `429 { ok:false, error:'rate_limited' }` (ENG-05 ile aynı kod ve aynı `consume()` kuralı). POST kovası (`economy:`, 120/dk) ayrı ve değişmedi.
- **Varsayılanlar (ortamdan ayarlanır):** `READ_RATE_PER_ACCOUNT=300`/dk, `READ_RATE_PER_IP=120`/dk, pencere 60 sn. Gerekçe: bir sekmede Bedesten 12/dk, Takas 24/dk okuma yapar. 300/dk, iki ekranın birlikte açık olduğu 8 sekmeyi (288/dk) karşılar. Normal istemci önce `/api/session` aldığı için oturumsuz okuma yapmaz, IP kovası yalnız oturumsuz çağrıları sınırlar.
- **Önbellek:** `server/market_read_cache.js`. Yalnız hesaptan bağımsız "açık ilanlar" sayfasının ham kaydı `MARKET_CACHE_TTL_MS` (varsayılan 2500 ms, `0` kapatır) boyunca paylaşılır. Eşzamanlı ıskalamalar tek okumada birleşir. Hesaba özgü alanlar (`mine`, `assetId`, `sales`) her istekte `publicListing(…, actor)` ile üretilir, "benim ilanlarım" sorgusu hiç önbelleğe alınmaz. Ham kayıt (`sellerId` dahil) yalnız sunucu belleğinde kalır. `marketChanged` (başarılı list/cancel/buy) önbelleği geçersiz kılar. Nesil sayacı sayesinde geçersiz kılmadan önce başlamış bir okuma sonradan önbelleğe yazılamaz.
- Depolara yalnız `listMarketRaw(actor, {open})` eklendi; `listMarket` aynı sonucu bunun üzerinden döndürür (davranış değişmedi).

**Talimattan bilinçli sapma: kova depoda değil, bellekte.** İlk sürüm limiti `ECONOMY.consumeRate` ile Firestore'da tutuyordu. Ölçüm sonucu:
- Emülatörde aynı belgeye sıralı `consumeRate` 30–40 ms sürdü. 2 paralel çağrı 2,8–3,6 sn, 4 paralel çağrı 3,4 sn sürdü (betik scratchpad `fix/contention.js`).
- İstemci her yenilemede iki GET'i paralel atar. Bu yüzden `ENG05_MULTI_SERVER=1` takas e2e testi zaman aşımına düştü. Bellekteki kovaya geçince geçti.
- Depo kovası ayrıca her GET'e bir Firestore işlemi (okuma + yazma) ekliyordu, reddedilen istekler de okuma harcıyordu. Bu, Y-1'in amacına (okuma maliyeti) ters.

Bu yüzden aynı `consume()` kuralı (`server/service_security.js`) süreç belleğinde, örnek başına uygulanıyor. Bellek 20 000 anahtarla sınırlı; dolarsa önce süresi geçenler, sonra en eski pencereler bırakılır. **Sonuç:** N örnekte etkin üst sınır N × limit olur. Maliyet koruması için yeterli, kesin küresel kota değildir.

**Testler:** `tests/eng09_read_limits.test.js` (SQLite, gerçek HTTP sunucusu):
1. Normal kullanım: 4 sekme Bedesten + 4 sekme Takas, bir dakikalık 144 GET'in hepsi 200 döndü.
2. Limit (5/3 ile): hesap ve IP 429 aldı. Başka hesap etkilenmedi. POST uçları okuma kovasından düşmedi.
3. Önbellek (TTL 60 sn ile, tazeliği yalnız geçersiz kılma sağlayabilir): ilan, satış ve iptal hemen göründü. Alıcı ve oturumsuz görünümde `assetId`, `sales` ve `sellerId` yok, satıcı kendi alanlarını görüyor.
4. Modül: TTL, tek uçuş, nesil koruması, `ttl=0`.

Firestore: `ENG09 Firestore: market read cache` (emülatör, iki örnek). **Mutasyon denetimi:** `marketChanged` içindeki `invalidate()` çıkarılınca 3. test düştü.

## 2. O-3…O-6 · Yerleşim (yalnız CSS)

Ölçüm betiği: scratchpad `fix/probe.js` (msedge headless, 390×844 mobil/dokunmatik ve 1024×768). Ham sonuç `fix/probe-before.json` ve `fix/probe-after.json`, ekran görüntüleri `fix/shots-before/` ve `fix/shots-after/` altında.

| # | Önce (ölçüldü) | Kök neden | Düzeltme | Sonra |
|---|---|---|---|---|
| O-3 | `body` margin 8px. 390: `scrollWidth` 398. 1024: 1032, taşan `#modal-root` sağ=1032 | Tarayıcının varsayılan `body` kenar boşluğu ≤1024'teki `body{width:100vw}` ile birleşiyor | `body { margin: 0; }` | 390: 390, 1024: 1024 (Ocak, Pazar, Bedesten ×3) |
| O-4 | Takas düğmesi (332,72,60×44) Ocak'ta "Harita Görünümü"nü, Bedesten'de NPC metnini örtüyordu | `top:72px` sabit konumu içeriğin üst denetim satırına denk geliyor | ≤540 px: düğme alt gezintinin hemen üstüne (`bottom: var(--mob-dock-h)+10px`). `#stage` alt boşluğu 18 → 74 px, böylece kaydırılan son içerik düğmenin altından çıkar | Üst denetimler, HUD, dock ve Bedesten metin/düğmeleri örtülmüyor. Kaydırma sonunda 8 mobil ekranda çakışma yok. Düğme aynı diyaloğu açıyor |
| O-5 | 390'da Bedesten sekmeleri 31 px, plakalar 29 px, "Çarşıya dön" 37 px, "Takas ekranından hazırla" 34 px | Küçük padding | ≤760 px: `.v-bedesten` içindeki düğme, sekme ve plakalara `min-height:44px` | 3 sekmede 44 px altında hedef 0. Sekme satırı 504/340 ile `overflow-x:auto`, kaydırılabilir |
| O-6 | 1024'te `.wk` (184 px, `nowrap`) Çanta, Sosyal ve kaynaklarla çakışıyordu. `.hud-c`'ye yaklaşık 32 px kalıyordu | Tek satırlık şerit 761–1279 px'te sığmıyor (gereken yaklaşık 1277 px) | 761–1279 px: `.hud-name` (marka yazısı, arma kalır) ve `.ticks` gizlenir, `#hud` boşluğu 18 → 10 px, hafta yazısı küçültülür | 1000–1366 px'te çakışma 0 (900–1366 taraması) |

**Gözle inceleme (sonra):**
- 390 Ocak: üst satırdaki "Nöbet Dağıt" ve "Harita Görünümü" açık. Takas düğmesi sağ altta, dock'un üstünde.
- 390 Bedesten (3 sekme): NPC metni tam okunuyor, sekme ve plakalar belirgin biçimde daha yüksek, sağdaki sekme kesilip kaydırma ipucu veriyor. Takas düğmesi panelin altındaki boş sahne görselinin üstünde.
- 1024 Ocak: şerit "Terbiyeci · Çanta · Sosyal · Hafta 1/20 · İLKBAHAR · 420 · 0 · 1/2 · Kaydedildi" diye ayrık okunuyor.

**Diğer ekranlar:** Ahır, Yuva, Arena, Pazar, Meydan, Kasaba ve Zindan'da (390) sahne çocuklarının yükseklikleri değişmedi. Yalnız kaydırma sonu 56 px uzadı (`fix/views.js`). Masaüstündeki Takas konumu (>540 px) değişmedi.

**Yeni test:** `npm run test:layout` (`tests/eng09_layout.e2e.js`) şunları denetler:
- 390×844: `body` margin 0, `scrollWidth === innerWidth`, Takas düğmesinin HUD, dock, "Harita Görünümü"/"Nöbet Dağıt" ve Bedesten metni/düğmeleriyle çakışmaması, kaydırma sonunda çakışma olmaması, Bedesten hedeflerinin ≥ 44 px olması, sekme satırının `overflow-x:auto` kalması, düğmenin diyaloğu açması.
- 1024×768: taşma yok, HUD çakışması yok.

**Mutasyon denetimi:** taban `style.css` ile test 2/2 düştü (8px ≠ 0px, 1032 ≠ 1024). Mevcut testler değiştirilmedi.

## 3. Test sonuçları (bu oturumda, son kod üzerinde koşuldu)

| Komut | Sonuç |
|---|---|
| `npm test` | **99/99** (önceki 95 + 4 yeni) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **11/11** (önceki 10 + 1 yeni) |
| `ENG05_MULTI_SERVER=1` + emülatör + `npm run test:trade-ui` | **1/1** |
| `npm run test:trade-ui` (SQLite) | **1/1** |
| `npm run test:ocak-sandigi` | **1/1**; `tradeEntryCovered:true` korunuyor, `docScroll` 398 → 390 |
| `npm run test:layout` (yeni) | **2/2** |

Emülatör depo `firebase.json`'ıyla 8089'da koştu, port boştu. Eski java.exe (PID 20252) sürecine dokunulmadı. Geçici sunucular ve tarayıcılar kapatıldı.

## 4. Doğrulanamayanlar ve kalan riskler

- **O-6 kısmi:** 761–~990 px'te (768/820 tablet, 900) "Sosyal × Hafta" ve "Hafta × kaynak" çakışması sürüyor. Kapatmak için mevsim rozeti, "+10/hf" gelir yazısı ya da Terbiyeci alt yazısı gibi bilgi öğeleri gizlenmeli veya şerit iki satıra bölünmeli (sahne üst boşluğu değişir). Bu bir UX kararı, 05'e bırakıldı. Denenen ek gizleme 820'ye kadar düzeltti ama bilgi kaybettirdiği için geri alındı.
- **O-4 tasarım sonucu:** düğme mobilde yüzen (FAB) düğme oldu. Kaydırılan listelerde (Ocak arsa kartları, Pazar tezgâhları) kaydırma sırasında geçici olarak bir kartın köşesinin üstünde durabiliyor. Kaydırma sonu boşluğu her içeriğin düğmeden kurtarılabilmesini sağlıyor. Kalıcı olarak örtülen denetim yok.
- **1024'te Pazar:** Takas düğmesi (masaüstü konumu, değişmedi) "Müzayede: 3 Lot · Sipariş" etiketinin üstünde. QA kapsamı dışında, bilgi için.
- **1024 Bedesten plakaları** 26 px'te kaldı. O-5 yalnız 390 içindi, masaüstü fare hedefi.
- **Pazar sahne katmanı** (`.bg-layer`) 390'da 406 px, 1024'te 1065 px. `overflow` gizli, kaydırma yok. Değiştirilmedi.
- Gerçek telefon, iOS Safari ve Android Chrome'da denenmedi. Ölçümler msedge mobil öykünmesiyle yapıldı.
- **Y-1 IP kovası** `req.socket.remoteAddress` kullanır. Cloud Run arkasında bu ön uç adresidir (Y-2 / ENG06-03, kapsam dışı). Oturumsuz okumalar orada tek kovayı paylaşır. Normal istemci oturumlu olduğu için etkilenmez.
- **Önbellek çok örnekte:** başka örnekteki ilan değişikliği en çok TTL (2,5 sn) gecikmeyle görünür. Aynı örnekte hemen görünür.
- **Hata davranışı:** okuma limiti artık depoya gitmediği için depo arızası 429 yolunu etkilemez. `GET /api/market` depo hatasında eskisi gibi 503 `market_unavailable` döner.

## 5. Kapsam dışı bırakılanlar (dokunulmadı)

Y-2 (proxy/IP, ENG06-03), Y-3 (`SESSION_SECRET`), Y-4 (`render.yaml`), O-1, O-2, O-7, D-1…D-6. `economy_sources.js`, ödül ve fiyatlar, POST limitleri, kimlik doğrulama, ENG-05 davranışı, JS mantığı ve HTML yapısı değişmedi.

## 6. Codex ile çakışma riski

Codex worktree'lerine bakılmadı ve dokunulmadı. ENG06-04-P1'in commitsiz içeriği bilinmiyor.
- `server.js` ve `server/firestore_store.js` / `economy_store.js` ortak sıcak dosyalar. Değişiklikler küçük ve yerel: `handleHttp` POST limit satırının altı, `marketChanged` ve `listMarket` bölgesi. Rebase'de metinsel çakışma olasılığı orta, anlamsal risk düşük.
- `style.css` değişikliği yalnız dosya sonuna eklenmiş bir blok, çakışma olasılığı düşük.
- `package.json` scripts ve `tests/playwright.config.js` `testMatch` satırları Codex de test eklerse çakışabilir. Tek satır, elle birleştirilir.
