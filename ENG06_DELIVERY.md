# ENG-06 · Sunucu otoriteli ekonomi: envanter ve ilk uygulama paketi

Tarih: **2026-11-07**. Sorumlu: Claude. Bağımsız denetçi: Codex.

## Başlangıç, branch ve worktree

| Alan | Değer |
|---|---|
| Başlangıç commit'i (ENG-05) | `bf267349ce97400e6999cca934f22400796e91ec` (yerelde doğrulandı) |
| Branch | `claude/eng-06-economy` (yeni; önceden yoktu) |
| Worktree | `C:/Users/user/Documents/GitHub/ejderocagi-eng06` (Codex'ten ayrı) |
| Codex çalışma ağacı | `ejderocagi-yeni` @ `codex/eng-05-economy-security`, dokunulmadı |
| Bitiş commit'i | Bu belgeyi içeren yerel commit (`git log -1 --format=%H claude/eng-06-economy`) |

Başlangıçta worktree temizdi ve `npm test` sonucu 48/48 idi.
`main` değiştirilmedi. Push, merge, deploy yapılmadı; üretim Cloud Run ve Firestore ayarlarına dokunulmadı.

## 1. Ekonomi işlem envanteri

### 1a. Mimari gerçek: iki ayrı ekonomi var

1. **Sunucu defteri (otoriteli):** `game_states` (SQLite) ve `eo_accounts.gameJson` (Firestore).
   Yalnız `server/economy_commands.js` içindeki 17 komut, `server/trade_service.js` takası ve
   `server/market_service.js` ilanı bu deftere yazar. Takas edilebilir olan tek değer budur.
2. **İstemci yerel oyunu:** `S` nesnesi, localStorage'da tutulur. Düello, arena, yarış, podyum, hafta sonu,
   bakım ve yetiştirme mekaniklerinin neredeyse tamamı burada çalışır.
   Sunucu defterine **yazmaz** ve takasa giremez. Ancak istemci sınırsız değiştirebilir.

`server.js` içindeki dünya rotaları (`/api/sync`, `/api/pageant`, `/api/boss`, `/api/caravans`,
`/api/raid-ocak`, WS `wheel_spin`) istemcinin beyan ettiği sonucu `WORLD` (liderlik ve yayın) durumuna yazar.
`ECONOMY` çağrısı yapmazlar, yani sunucu defterine altın veya varlık aktarmazlar.

### 1b. Sistem bazında envanter

| # | Sistem | Dosya / fonksiyon | Kaynak / varlık | Mevcut yetki | Risk | Gerekli sunucu doğrulaması | Test ihtiyacı |
|---|---|---|---|---|---|---|---|
| 1 | Ejderha Düellosu | `js/dragon_duel.js`, `js/duel_engine.js`; `js/duel_server.js` yalnız eşleştirme ve aktarma yapar | Ödül yok (`S.gold` referansı yok) | İstemci | Düşük; ekonomik çıktı yok | Ödül eklenirse sunucuda simülasyon ya da iki taraflı imzalı sonuç | Sahte sonuç komutunun reddi ✔ (genel) |
| 2 | Topçu Arenası | `js/minigame/shm_ui.js:1660` (`S.gold -= 120`) | Altın harcaması (yerel) | İstemci | Orta (yerel); sunucuya bağlı değil | Sunucu komutu yok. Eklenecekse giriş ücreti `spend()` ile, ödül doğrulanmış sonuçla | Kapsam dışı |
| 3 | Ejderha yarışları | `js/race.js:596` (`S.gold += prize; S.un += un`), `:642` ücret | Altın, ün | İstemci | Yüksek: ödül tamamen istemcide; sunucuya taşınırsa sahte sonuç riski | Sunucu tarafı deterministik yarış (`makeRuntime` seed'li RNG ile) ve `milestoneSources` kaydı | Sahte yarış sonucu reddi |
| 4 | Güzellik podyumu | `js/pageant.js:533,580`; `/api/pageant` (`server.js:1151`) | Altın (yerel), liderlik skoru (WORLD) | İstemci; skor beyanı sunucuya | Orta: liderlik skoru sahtelenebilir; defter etkilenmez | Skor sunucuda hesaplanmalı; oy için hesap başına limit | Liderlik bütünlüğü (ayrı paket) |
| 5 | Günlük/haftalık hedefler | `js/core.js:833` `GOALS`; `js/week.js:281` `checkGoals`; sunucu `goals.claim` ve her komut sonrası `checkGoals` | Altın ödülü | **Sunucu** (ödül miktarı ve tekrar koruması); kaynak `goalSource` | **Yüksek**: REVIEW-001 H-1 | Kaynak yalnız kayıtlı girdilerden hesaplanır; boş liste `unknown` | **Bu pakette** ✔ |
| 6 | Eşya ve yükseltme | Sunucu: `shop.item`, `item.sell`, `chibi.craft/repair`, `stone.synthesize`, `ore.convert`, `chibi.transfer`. İstemci: `js/chibi.js` | Altın, taş, maden, eşya | **Sunucu** (fiyat ve tarif sunucuda) | Orta: chibi kaynakları (taş, maden) kaynak izlemesi taşımıyor, ama takas edilemiyor | Chibi kaynakları takasa açılacaksa kaynak kovası gerekir | Sahiplik ✔, yetersiz bakiye ✔ |
| 7 | Yumurtlama, kuluçka, yetiştirme | Sunucu: `egg.incubate`, `egg.hatch` (`w` sunucuda ilerlemez). İstemci: `js/week.js:36` `makeEggs`, `js/core.js:344` `breedChecks` | Yumurta, ejderha, ün | Kuluçka sunucuda; **üreme yalnız istemcide** | Yüksek (gelecek): üreme sunucuya geldiğinde gen2 hedefi ve kaynak mirası tanımlanmalı | `w` için doğrulanmış hafta komutu; üremede iki ebeveynin kaynağı birleştirilmeli | Hatch kaynağı ✔ |
| 8 | Yemek, bakım, tüketilebilir | Sunucu: `shop.food` (kaynak kovası `foodSources`). İstemci: `js/week.js:99` besleme, `:234` bakım gideri, `js/care.js` | Yemek, altın gideri | Alım sunucuda; tüketim yalnız istemcide | Orta: tüketim sunucuya gelirse `foodSources` doğru kovadan düşmeli | Tüketim sırası (bound→unknown→earned) ve kova-toplam eşitliği | Kapsam dışı (komut yok) |
| 9 | NPC alışverişi ve diğer ödüller | Sunucu: `shop.dragon/egg/food/item`, `building.buy`, `land.clear`, `dragon.sell`. İstemci: `js/pazar.js`, `js/auction.js:118` (müzayede), `js/orders.js:101` (sipariş ödülü), `js/kiraathane.js`, `js/career.js` vb. | Altın, varlık | Mağaza ve satış sunucuda; müzayede, sipariş, kıraathane istemcide | Orta | Sunucuya taşınacak her ödül `credit(source)` ve kayıtlı girdiyle | Bound alım ve satış ✔ (ENG-05) |

### 1c. Önceliklendirme
1. **P0 — Hedef ödülü kaynağı (H-1):** Mevcut, sunucuda, bağımsız test edilebilir. **Bu pakette yapıldı.**
2. **P0 — Tek seferlik hedeflerde ödünç earned girdi (acq/yuva/kulucka):** Mevcut, fakat çözüm bir **politika kararı** istiyor (bkz. §4).
3. **P1 — Misafir IP limiti ve proxy politikası (REVIEW H-2):** Mevcut; dağıtım politikası gerektiriyor.
4. **P1 — Okuma uç noktaları, presence ve eşzamanlı WS limitleri (REVIEW M-1, M-2, M-4).**
5. **P2 — Yarış, hafta, besleme, üreme ödüllerini sunucuya taşıma:** yeni sunucu komutları, yani oyun davranışı değişikliği, kullanıcı onayı gerekir.

## 2. İlk tamamlanan uygulama paketi: hedef ödülü kaynağı (REVIEW-001 H-1)

**Sorun:** `goalSource`, `gen2` ve `mark` için o an tutulan ejderhaların kaynağını kullanıyordu.
Yeni bir hesap başlangıç ejderhası Kor'u satıp takasla ödünç earned gen2/izli ejderha alınca 140 earned altın üretiyor,
ejderhayı ve altını geri veriyordu. Bu sınırsız sayıda hesapla tekrarlanabiliyordu.
Ayrıca boş girdi listesi `earned` sayılıyordu (`yuva`, `kulucka`).
Kaynak takibinden önceki ün (`renown`) ilk earned hatch ile `earned` oluyordu.

**Değişiklik (ödül miktarları aynı kaldı; yalnız kaynak niteliği değişti):**
- `server/economy_sources.js`
  - `known(list)`: boş liste → `unknown`.
  - `gen2` ve `mark` → yalnız `milestoneSources.gen2/mark` (şu an hiçbir sunucu komutu bunları yazmıyor, yani `unknown`).
    Bu, eğitim ve arena hedefleriyle aynı fail-closed kural.
  - `kulucka` → yalnız kayıtlı hatch varsa onu dahil ediyor (eskiden varsayılan `'earned'` idi).
  - `yuva` → bina yoksa `unknown`.
- `server/economy_commands.js` (`egg.hatch`): kayıt yokken mevcut ün `> 0` ise `renown` `unknown` ile başlıyor.

**Alternatifler ve gerekçe:**
- (a) Takasla gelen varlığa `acquiredVia` alanı eklemek. Yeni bir şema alanı ve kalıcı veri değişikliği olurdu, onay ister; seçilmedi.
- (b) gen2 ve mark için kaynağı hatch anında yumurtadan kaydetmek. Ödünç earned yumurtayla aynı istismara açık kalırdı
  (yumurta hatch edilir, ejderha geri verilir); seçilmedi.
- (c) **Seçilen:** üreticisi olmayan hedefleri fail-closed `unknown` yapmak. Şema değişmiyor, politika değişmiyor (ENG-05'in "kaynağı kanıtlanmayan devredilemez" ilkesi).
  Gelecekte bir üreme veya kişilik komutu kendi girdisinden `milestoneSources.gen2/mark` yazmalı.

**Geriye uyumluluk:** Kalıcı veri dönüştürülmedi. Yalnız gelecekte ödenecek ödüllerin kaynak etiketi değişiyor.
Önceden earned ödenmiş gen2/mark ödülleri geri alınmıyor; mutabakat ayrı bir karardır.
Normal akışlar aynı kaldı: bound kuluçka → bound ödül, earned hatch ünü → earned.

## 3. Değiştirilen dosyalar

- `server/economy_sources.js`: `known()`, fail-closed `goalSource`.
- `server/economy_commands.js`: `egg.hatch` renown başlangıç değeri (tek satır).
- `tests/eng06_economy_acceptance.test.js` (yeni): 8 kabul ve istismar testi.
- `tests/firestore_store.integration.js`: 1 Firestore parite testi eklendi. Mevcut testler değiştirilmedi.
- `ENG06_DELIVERY.md` (bu belge).

## 4. Testler

| Komut | Sonuç |
|---|---|
| `npm test` (SQLite ve birim; P1/P2/P3/ENG-04/ENG-05 dahil) | **56 geçti, 0 başarısız** (önce 48, yeni 8) |
| `firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | **8 geçti, 0 başarısız** (önce 7, yeni 1) |
| `npm run test:trade-ui` (Playwright) | **Koşulmadı.** Worktree'de `node_modules`/tarayıcı kurulu değil. Değişiklik UI'ye dokunmuyor. Codex incelemesinde koşulması önerilir. |

Firestore koşusu yerel emülatör ve demo projeyle yapıldı. npx önbelleğindeki `firebase-tools` kullanıldı.
`@google-cloud/firestore` için `NODE_PATH` Codex ağacının `node_modules` dizinini gösterdi (salt okuma; o ağaç değişmedi).

Kabul kriterlerinin kapsamı:
- **Sahte savaş sonucu ödül vermiyor:** `arena.win`, `duel.result`, `race.finish`, `pageant.score`, `reward.claim`, `week.end` → `unsupported_command`.
  `goals.claim` argüman kabul etmiyor. ✔
- **Aynı ödül iki kez alınmıyor:** aynı `requestId` tekrar oynatılıyor; sonraki claim boş dönüyor. ✔
- **Sahip olunmayan varlık kullanılamıyor:** başka hesabın ejderhası veya yumurtası → `asset_not_owned`. ✔
- **Yetersiz bakiye reddediliyor;** durum değişmiyor. ✔
- **Eşzamanlı harcama çoğaltmıyor:** iki worker aynı versiyonla → yalnız biri başarılı. ✔
- **Başlangıç altını koruması:** ENG-05 testleri geçiyor. Ödünç ejderhayla üretilen ödül `gold_not_transferable`. ✔ (SQLite ve Firestore)
- **Kayıt ve yeniden bağlanma:** mevcut ENG-05 ve Firestore replay testleri geçiyor. ✔
- **Yarış, podyum, besleme, üreme ödülleri:** sunucuda mekanik yok, test edilecek başarı üretilmedi (kapsam dışı).

PoC tekrar koşusu (worktree'ye karşı): mark+gen2 artık `unknown` ve devredilemiyor.
`acq` istismarı **hâlâ +60 earned üretiyor** (aşağıda blocker 1).

## 5. Güvenlik riskleri ve blocker'lar

1. **Kullanıcı kararı gerekiyor: tek seferlik hedeflerde ödünç earned girdi.**
   `acq` (60), `yuva` (40) ve `kulucka` (40) kaynakları, takasla gelmiş earned altınla yapılan harcamadan earned ödül üretiyor.
   Yeni hesap başlangıç altınını harcar, ödünç earned altınla pazar ejderhası alır, 60 earned kazanır, ejderhayla altını geri verir.
   PoC hesap başına +60 gösteriyor. Earned altının bugün meşru bir üreticisi olmadığından şu an gizil durumda.
   Seçenekler:
   - (A) Tek seferlik hedef ödüllerini her zaman `bound` saymak (başlangıç paketi gibi). En basit seçenek ama ödül politikası değişikliği.
   - (B) Earned kovasını "oynanışla kazanılmış" ve "takasla alınmış" olarak ayırmak. Yeni şema ve migrasyon gerekir.
   - (C) Hedef ödülünü yalnız hesabın kendi oynanışıyla kazanılmış earned girdilerle earned saymak. (B)'nin daha dar hâli, yine şema ister.
2. **REVIEW H-2:** misafir oluşturma limiti proxy arkasında global oluyor. Güvenilir proxy ve IP politikası kararı gerekiyor.
3. REVIEW M-1, M-2, M-3, M-4 açık (presence doldurma, limitsiz okuma ve yazma transaction'ı, davet kilidi, eşzamanlı WS).
4. ENG-05 üretim blocker'ları (IAM, indeks, eski kayıt mutabakatı, tek sürüm yazıcı) açık.

## 6. Kalan ENG-06 görevleri (öncelik sırası)

1. **ENG06-02:** Blocker 1 için kullanıcı kararı, ardından uygulama ve iki backend testleri.
2. **ENG06-03:** Proxy/IP politikası ve misafir limiti (H-2); global ve IP başına ayrı limit, testler.
3. **ENG06-04:** `get` yalnız değişiklikte yazsın; `/api/trade/state` ve `/peers` için hesap başına limit; presence hesap başına tek doküman; eşzamanlı WS sınırı (M-1, M-2, M-4).
4. **ENG06-05:** Faz-1 `transaction()` API'sinin kaldırılması veya devre dışı bırakılması (L-4); renown ve kuluçka kaynak testlerinin genişletilmesi.
5. **ENG06-06 (onay gerekir):** Hafta ilerlemesini (`w`, upkeep) sunucuya taşıma. Kuluçka ve besleme tüketimi buna bağlı.
6. **ENG06-07 (onay gerekir):** Yarış, arena ve düello ödüllerini sunucu simülasyonuyla doğrulama; `milestoneSources` üreticileri.
7. **ENG06-08 (onay gerekir):** Üremeyi sunucuya taşıma; gen2 ve mark üreticisi, ebeveyn kaynak mirası.
8. **ENG06-09:** Podyum ve dünya rotalarında skor bütünlüğü (defter dışı, ama hile yüzeyi).

## 7. Codex'e bağımsız inceleme

İncelenecek commit: `claude/eng-06-economy` dalındaki bu belgeyi içeren yerel commit (bitiş SHA'sı).
Önerilen odaklar: `goalSource` fail-closed davranışının meşru oynanışı bozmadığı;
renown başlangıç kuralı; Playwright trade-ui koşusu; §5 blocker 1 seçenekleri.

Proje Merkezi değerlendirmesi için burada duruldu.
