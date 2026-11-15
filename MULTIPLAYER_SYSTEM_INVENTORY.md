# MULTIPLAYER_SYSTEM_INVENTORY · Sistem envanteri ve denetim bulguları

02 Engineering (Claude) · 2026-11-09 · **Aşama 1: yalnız denetim. Kod değişmedi, commit yok, push/merge/deploy yok.**
Dayanak: dal `claude/eng13-gold-sync` @ `7f8d60c` (en güncel uç). İnceleme, bu dalın `git archive` çıktısı üzerinde (scratchpad), depoya yazmadan yapıldı. Satır numaraları bu SHA'ya aittir; kayarsa fonksiyon adını esas alın.

## 0. Önce bilinmesi gerekenler

**0.1 Dal gerçeği (belgeler eskimiş).**
- `CURRENT_PROJECT_STATUS.md` "main = 17fb90a, hiçbiri birleşmedi" diyor. Bugünkü Git:
  - `origin/main` hâlâ `17fb90a`.
  - **Yerel `main` = `360f860`**, yani `origin/main`'in 35 commit ilerisinde (ENG-06…ENG-12 zinciri yerel `main`'e alınmış, push edilmemiş).
  - En güncel uç `claude/eng13-gold-sync` (`7f8d60c`, yerel `main` + 3 commit).
  - Bu worktree (`claude/eng-06-economy`, `05bdcf6`) zincirin **gerisinde**; ENG-07…ENG-13 kodunu içermez.
- Bu rapor `7f8d60c`'yi esas alır. Zincir: `eng06-pc-week → eng-07 → eng-08 → eng-09-fixes → eng06-pd-duel → eng10 → eng11 → eng12 (=yerel main) → eng13`.
- Codex'in `codex/eng06-04-p1` işi (14 dosya commitsiz) incelenmedi, dokunulmadı.

**0.2 Testler (bu oturumda gerçekten koşulan).**
| Komut | Sonuç | Not |
|---|---|---|
| `node --test tests/*.test.js` (Node 24.13, SQLite) | **158/158 geçti** | `7f8d60c` dışa aktarımında, scratchpad'de. CLAUDE.local'daki "58/58" eski |
| Firestore emülatörü, Playwright e2e, iki sunuculu koşu | **koşulmadı** | Teslim belgeleri ENG-12'de 13/13 e2e ve 13/13 Firestore diyor; ENG-13 sonrası yeniden doğrulamam yok |

**0.3 Okuma yöntemi.** Teslim belgeleri (ENG06…ENG13, ENG09 QA) yön gösterici olarak kullanıldı; her iddia mümkün olduğunca koddan teyit edildi. Teyit edilemeyen yer "doğrulanmadı" diye işaretli.

## 1. Mimarinin tek cümlelik özeti

Oyun **üç ayrı durum** taşıyor ve çoğu oynanış hâlâ sunucu dışında:

| Katman | Sahibi | Nerede | Kapsam |
|---|---|---|---|
| **Yerel oyun `S`** | **İstemci** | `localStorage` (3 slot, `js/core.js:851`) | Oynanışın büyük kısmı: bakım, besleme, eğitim, üreme/gen, Topçu, yarış, podyum, olaylar, kariyer |
| **Sunucu defteri ("Ocak Kesesi")** | Sunucu | Firestore `eo_accounts.gameJson` (SQLite: `game_states`) | Altın kovaları, sunucu varlıkları, takas, Bedesten, ödüllü düello, hafta, borç |
| **Dünya durumu `WORLD`** | **İstemci beyanı + sunucu süreç belleği** | `data/world.json` (yerel dosya) | Sohbet, dünya boss'u, kervan, podyum, bayrak, codex, baskın günlüğü, oyuncu vitrini |

ENG-12 kararıyla (00, "iki kese") yerel altın yerelde, sunucu altını ayrı kalıyor. ENG-13 bu iki dünyayı, doğrulanamayan olaylar için **tavanlı bildirim** (`gold.local`) ile köprülüyor.

## 2. Özet bulgu tablosu

Önem: **K** kritik (ilkeyi doğrudan çiğner) · **Y** yüksek · **O** orta · **D** düşük. Hepsi koddan okundu; çalıştırılarak kanıtlanmadı diye belirtilenler ayrıca işaretli.

| # | Bulgu | Önem | Bölüm |
|---|---|---|---|
| B-01 | Oynanışın çoğu istemci sahipli yerel `S`'te; "iki kese" mimarisi tek otorite hedefiyle çelişiyor | K | §3.2, §3.4 |
| B-02 | Sunucu komutlarının bir kısmı **istemci beyanını** ödüle çeviriyor: `gold.local`, `topcu.clear`, `topcu.spin`, `goal.reach`, `offer.sell`, `order.deliver`, `auction.sell` | Y | §3.4 |
| B-03 | `WORLD` (sohbet, boss, kervan, podyum, codex, baskın) istemci beyanıyla yazılıyor, yerel dosyada duruyor, çok örnekte ayrışıyor/kayboluyor | K | §3.7, §3.8 |
| B-04 | WS mesajlarının çoğu **tüm bağlı herkese** yayınlanıyor (DM, parti daveti, PvP/zindan senkronu); hız sınırı yok | Y | §3.7 |
| B-05 | WS bağlantıları, düello odaları ve davetler süreç belleğinde; çok örnekli Cloud Run'da çalışmaz. Örnek sayısı doğrulanmadı | K | §3.6, §3.7 |
| B-06 | Düello ödülü kurtarması yok: settlement yalnız oda bitişinden tetikleniyor; yeniden başlatmada aktif maç sessizce ödülsüz kalır; sonuç yalnız WS ile gider | Y | §3.6 |
| B-07 | X oturumu ekonomi hesabına bağlı değil → aynı kişi çok hesapla ödüllü düello yapabilir (Sybil) | Y | §3.1, §3.6 |
| B-08 | Hesap = tarayıcı çerezi. Cihazlar arası giriş, hesap kurtarma, oturum listesi yok; yerel kayıt cihaza bağlı | Y | §3.1, §3.10 |
| B-09 | Yeniden bağlanmada kaçırılan olay kurtarılmıyor (sabit 8 sn, sıra numarası yok); sohbet gönderiminde tekrar koruması yok | O | §3.7, §3.10 |
| B-10 | Tüm oyun tek doküman (≤700 KB sınırı, Firestore 1 MiB); sıcak hesaplarda çekişme; her istekte taze oturum okuması | O | §3.1 |
| B-11 | Yönetim, denetim işi, yedek/geri yükleme, kill-switch yok; geri alma planı yazılı değil | Y | §3.11 |
| B-12 | `gameJson` için şema sürümü yok (yalnız `funds.schema`); komut protokolünde sürüm yok | O | §3.1, §4 |
| B-13 | Sınırsız sunucu haftası + NPC tezgâhı yenileme + `offer.sell` (1,4×) kombinasyonu enflasyon/arbitraj yolu (kod okumasıyla, **çalıştırılmadı**) | Y | §3.4, §3.9 |
| B-14 | Dünya POST uçları (`/api/sync`, `/api/boss`, `/api/pageant`, `/api/caravans`, `/api/raid-ocak`) hesap başına hız sınırsız; her biri dünyayı diske yazdırıyor | Y | §3.7 |
| B-15 | Her ekonomi komutu 3 betik + VM bağlamını yeniden kuruyor (CPU maliyeti ölçülmedi) | O | §3.4 |
| B-16 | `topcu.spin` çarkı sunucuda tohumsuz `Math.random` kullanıyor (kod yorumu "tohumlu" diyor) | D | §3.4 |
| B-17 | Belge/yapılandırma tutarsızlığı: `render.yaml` çelişkili; `ENG04…ENG13` belgeleri farklı dal tabanlarına atıf yapıyor | D | §0.1 |

## 3. Sistem envanteri

Her sistemde aynı on soru: **(1)** nasıl çalışıyor / dosyalar · **(2)** veri sahibi · **(3)** sunucu doğruluyor mu · **(4)** çoklu cihaz/eşzamanlılık · **(5)** ağ kesilirse · **(6)** tekrar gönderilen komut · **(7)** kalıcılık/yeniden başlatma · **(8)** güvenlik/regresyon riski · **(9)** gerekli değişiklik · **(10)** testler. Simgeler: ✅ sağlam · ⚠ kısmi · ❌ yok/zayıf.

### 3.1 Hesap, kimlik, oturum, veri kalıcılığı

| Soru | Durum |
|---|---|
| (1) Çalışma | Misafir: `POST /api/session` → UUID hesap + `@gezgin_<hex>` handle, `__Host-eo_guest` çerezi (HttpOnly, SameSite=Strict, 365 gün), DB'de yalnız token özeti. X girişi: ayrı, HMAC imzalı `eo_sess` çerezi (30 gün), yalnız handle taşır. Dosyalar: `server/guest_session.js`, `server/session_secret.js`, `server.js` (`handleHttp`, X OAuth blokları), `server/economy_store.js`, `server/firestore_store.js`. Üretimde `SESSION_SECRET` zorunlu (açılış reddi) ✅ |
| (2) Sahip | Sunucu (hesap, oturum). Yerel kayıt: istemci |
| (3) Doğrulama | ✅ Gönderen kimliği her zaman oturumdan; istemcinin beyan ettiği `accountId`/`handle` ezilir (`readJsonBody`, WS `handleWsMessage`). ⚠ X handle'ı ekonomi hesabına **bağlı değil**: `eo_sess` çerezi herhangi bir misafir çerezle yan yana yaşar (B-07) |
| (4) Çoklu cihaz | ❌ Hesap tarayıcı çerezidir. Masaüstü ve telefon **ayrı hesaplar**. Çerez silinirse sunucu ekonomisi erişilmez. Yerel kayıt cihazda. Sekmeler arası: `navigator.locks` yalnız ilk oturum açılışında (`js/net.js:mpEnsureGuestSession`) |
| (5) Ağ kesintisi | Oturum çerezde; kesinti etkilemez. `POST /api/session` 12 sn zaman aşımı yok; açılış kendi zincirinde |
| (6) Tekrar | `POST /api/session` çerez varsa mevcut kimliği döner ✅. Çerezsiz çifte tıklama iki hesap yaratabilir (IP başına 20/dk; ENG06-03 proxy tasarımı uygulanmadı, `req.socket.remoteAddress` Cloud Run'da ön uç adresi olabilir, **doğrulanmadı**) |
| (7) Kalıcılık | Firestore (üretim, `K_SERVICE`/`NODE_ENV=production`'da zorunlu) / SQLite (yerel). `store_factory` üretimde emülatörü ve SQLite'ı reddeder ✅. Kimlik önbelleği 60 sn ama API ve WS her istekte `fresh:true` ile **DB'den okuyor** (maliyet, B-10) |
| (8) Risk | Hesap devri/oturum çalınması durumunda iptal yolu yok: `revokeSession` depoda var, **hiçbir HTTP/WS yoluna bağlı değil** (`grep`). `Origin` yoksa istek kabul (ENG06-03 D4 kararı açık). `render.yaml` `NODE_ENV=production`+SQLite ile çelişkili (ENG09 Y-4) |
| (9) Değişiklik | X↔hesap kalıcı bağlama (A-5); cihaz/oturum listesi ve iptal; hesap kurtarma (X ile geri alma); `gameJson.schemaVersion`; ENG06-03 uygulaması |
| (10) Test | Var: `server_foundation`, `session_cache`, `session_secret`, `net_identity`, Firestore entegrasyonu. Eksik: çoklu cihaz, oturum iptali, X↔hesap bağlama, proxy/IP |

### 3.2 Ejderha sahipliği, üretimi, genetik, büyüme

| Soru | Durum |
|---|---|
| (1) Çalışma | **İki kopya.** Yerel: `S.dragons`, gen/üreme/büyüme/eğitim istemci kuralları (`core.js`, `lineage.js`, `care.js`, `week.js`, `bond.js`, `career.js`). Sunucu: `game.dragons`, `assetId` = `${accountId}:dragon:${id}`; kaynaklar yalnız `shop.dragon`, `egg.hatch`, takas, Bedesten, başlangıç hediyesi. `js/economy_sync.js` sunucu varlığını yerel ocağa `assetId` ile eşler (`reconcile`) |
| (2) Sahip | Yerel dragon: **istemci**. Sunucu dragon: sunucu. Tek ortak anahtar `assetId` |
| (3) Doğrulama | Sunucu yalnız kendi kopyası için doğruluyor. Yerel dragonun gen/istatistiği sunucuya **hiç gitmiyor** (iyi: güvenilmez veri alınmıyor), dolayısıyla yerel yetişen ejderha **takas/Bedesten'e giremez** ✅ (ama oyuncu açısından "benim ejderhamı satamıyorum") |
| (4) Çoklu cihaz | ❌ Yerel dragon başka cihazda yok. Sunucu dragon her yerde görünür |
| (5)(6) | Sunucu komutları idempotent (§3.4). Yerel işlemler çevrimdışı çalışır, çakışma kavramı yok |
| (7) Kalıcılık | Sunucu ✅. Yerel: `localStorage` + `-bak` yedeği; tarayıcı verisi silinirse kayıp |
| (8) Risk | **Ayrışma (R-2):** aynı ejderhanın yerel ve sunucu hali farklı evrilir; Bedesten önizlemesi yerel istatistiği bilmez. Üreme/gen çaprazlama **sunucuda hiç yok**; `ms.gen2`/`ms.mark` üreticisi yok |
| (9) Değişiklik | Üreme, eğitim, yara, görev, evre ilerlemesi sunucu komutu olmalı (Codex P-F); tek kopya (yerel yalnız tahmin/önizleme) |
| (10) Test | Var: `eng12_sync`, `economy_commands`, `eng06_economy_acceptance`. Eksik: üreme/gen kuralları sunucuda, ayrışma senaryoları |

### 3.3 Yumurta, kuluçka, bakım, beslenme

| Soru | Durum |
|---|---|
| (1) Çalışma | Sunucu: `egg.incubate` (yumuşak), `egg.hatch` (`egg.w` yalnız `week.end` ile ilerler), kuluçka binası `building.buy`. Yerel: besleme, temizlik, ruh hali, bağ (`care.js`, `bond.js`) tamamen istemci |
| (2) Sahip | Yumurta: sunucu (sunucu kopyası), yerel kopya ayrı. Bakım/besleme: **istemci** |
| (3) Doğrulama | Sunucu `week.end` içinde `endWeek`'i kendi VM'inde çalıştırıyor ve **yem azalırsa komutu reddediyor** (`week_food_unreconciled`): yani sunucuda besleme yok, yem tüketimi yerelde (R-4, A-4) |
| (4)(5)(6)(7) | Komut idempotent, makbuzlu, sürümlü ✅. Başlangıç yumurtasının çatlaması `week.end` sonrası mümkün; e2e'de **yok** |
| (8) Risk | Yerel besleme sunucu yemini azaltmaz → yem "sonsuz" |
| (9) Değişiklik | Besleme/bakım komutları (`feed`, `care`) sunucuya; yem tüketimi kaynak kovalarıyla |
| (10) Test | Var: `eng12_sync` (kuluçka). Eksik: `egg.hatch` e2e, besleme |

### 3.4 Ekonomi, altın, envanter, ödül kaynakları

Sunucu altın modeli: `funds {bound, unknown, earned}`, toplam `gold`'a eşit olmak zorunda; harcama sırası bound → unknown → earned; takas/Bedesten yalnız `earned` ✅ (`server/economy_sources.js`, `economy_debt.js`).

**Tüm altın/varlık kaynakları (faucet) ve gerçek durumu**

| Kaynak | Komut / yer | Sınıf | Miktar belirleyen | Doğrulama | Not |
|---|---|---|---|---|---|
| Başlangıç altını/varlığı | `game.start` | bound | sunucu | ✅ | |
| Hedef ödülü (13, toplam 720) | `goals.claim` / `checkGoals` / **`goal.reach {id}`** | bound/unknown | sunucu tablosu | ⚠ `goal.reach` **hedef koşulunu doğrulamıyor** (hesap başına bir kez, tutar sunucu) | B-02 |
| Ödüllü düello | `duel_settlement` (WS) | **earned** | sunucu (85/35/20) | ✅ tohum+günlük yeniden oynatma, günlük sınırlar | Tek earned üretici |
| Haftalık rol geliri | `week.end` | unknown | sunucu VM | ✅ | |
| Hafta bakım gideri | `week.end` | borç | sunucu | ✅ | |
| Müzayede (kendi ejderhan) | `auction.sell` | unknown | sunucu simülasyonu (tohumlu) | ⚠ olayın var olduğu doğrulanmıyor; haftada 1 | |
| Sipariş teslimi | `order.deliver {assetId, spec}` | unknown | sunucu formülü | ⚠ `spec`'i **istemci seçiyor**; sunucu biçim ve gen şartını doğruluyor ama siparişin gerçekten verildiğini bilmiyor | |
| Locadan teklif | `offer.sell` | unknown | value × 1,4 | ⚠ olay istemci tetikli; haftada 1 / günde 4 | **B-13** |
| Topçu geçişi | `topcu.clear {mode}` | unknown | sabit tablo (150…950) | ❌ **geçişin gerçekleştiği doğrulanmıyor**; yalnız günlük tavan (12000) | B-02 |
| Topçu çarkı | `topcu.spin` | unknown | sunucu çarkı | ⚠ hak (`T.minor/major`) `topcu.clear` ile alınıyor, yani aynı doğrulanamaz tabana bağlı | B-16 |
| Yerel olaylar | `gold.local {reason, amount}` | unknown | **istemci beyanı**, tür başına tek tavan, günlük 15000 | ❌ | B-02 |
| Kayıt öncesi yerel altın | `gold.import` | bound | istemci beyanı, 2000 tavan, bir kez | ❌ (bilinçli, sınırlı) | |
| Yarış, podyum, kıraathane, arena, zindan, sefer, baskın | yerel `S.gold` | **yerel kese** | istemci | ❌ sunucuda yok | B-01 |

**Sızıntı analizi (neden "sınırlı"):** `unknown`/`bound` altınla alınan hiçbir şey takas veya Bedesten'e giremez (`tradable()`). Yani istemci beyanı **oyuncular arası ekonomiyi doğrudan kirletemez**; kirlettiği yer kendi Ocak Kesesi ve NPC alışverişi. Bu iyi bir sınır, ama (a) "istemci ödülü belirleyemez" ilkesine uymuyor, (b) Ocak Kesesi'ni şişiren oyuncu NPC'den sınırsız nadir ejderha/yumurta avlayabilir (`unknown` kaynaklı olsa da oyun içi güç), (c) tek earned kaynağı (düello) dışında takas edilebilir değer yok.

**B-13 ayrıntısı (çalıştırılmadı).** Rüstem'in ejderha fiyatı `value × rnd(1,05–1,25)` (`js/core.js:370`). `offer.sell` aynı ejderhayı `value × 1,4`'e alıyor. Net kâr ≈ 0,15–0,35 × value, günde 4 kez (UTC), ve haftalık sınır sunucu haftasına bağlı olduğundan (`week.end` sınırsız, ENG-12) pratikte yalnız günlük sınır geçerli. Tezgâh haftayla yenilendiği için döngü sürer. Kâr `unknown` sınıfında. Doğrulamak için gerçek bir test yazılmalı.

| Soru | Durum |
|---|---|
| (2) Sahip | Sunucu defteri: sunucu. Yerel kese: istemci |
| (4) Eşzamanlılık | ✅ Sürüm CAS (`expectedVersion`), tek transaction; iki cihazda `version_conflict` ve yeniden deneme. Firestore'da `runTransaction`, `maxAttempts:5` |
| (5) Ağ kesilirse | ✅ İstemci: 12 sn zaman aşımı → belirsiz → aynı gövde `localStorage`'da saklanır, yeniden gönderilir (`js/economy_client.js`, `economy_link.js`) |
| (6) Tekrar | ✅ Aynı `requestId`+aynı gövde = makbuz; aynı `requestId`+farklı gövde = `request_id_reused` |
| (7) Kalıcılık | ✅ Durum+sürüm+makbuz tek transaction |
| (8) Risk | B-02, B-13, B-15: her komut `vm` bağlamı kuruyor (6 betik + zaman aşımı 1 sn). Ölçülmedi. Makbuz sınırsız büyüyor (D-3 Bedesten için açık; komut makbuzu temizliği **yok**) |
| (9) Değişiklik | Her faucet için "doğrulanabilir olay" modeli (§MULTIPLAYER_ARCHITECTURE 5); `goal.reach` koşul doğrulaması; `gold.local` kademeli emekliliği; komut makbuzu TTL'i |
| (10) Test | Var: `economy_*`, `eng13_income`, `eng06_pc_week`, `eng10_rebuild`. Eksik: B-13 arbitraj, çok sunuculu komut yarışı, komut makbuz büyümesi, VM CPU yükü |

### 3.5 Bedesten, oyuncu takası, eşya transferi

| Soru | Durum |
|---|---|
| (1) Çalışma | Doğrudan takas (`server/trade_service.js`, `trade_*`): davet→teklif→iki onay→atomik takas, rezervasyon (`guardReservation`), süre aşımı temizliği. Bedesten (`server/market_service.js`): ilan/iptal/satın alma, serbest fiyat, komisyon 0 (D7 bekliyor). İstemci: `js/trade_ui.js`, `trade_client.js`, `pazar.js`, `market_client.js`, `ocak_sandigi.js` |
| (2)(3) | ✅ Sunucu: sahiplik, kaynak sınıfı (yalnız earned), borç kapısı, ilan bekletmesi (`market_holds`), düello kilidi |
| (4) Eşzamanlılık | ✅ Çok-hesaplı tek transaction; hesap sürümü yükselir. ⚠ Her iki hesabın tüm oyun dokümanına yazılıyor (satıcı çevrimdışıyken de) |
| (5)(6) | ✅ `requestId` makbuzu; belirsiz yanıtta başarı gösterilmez (ENG-04) |
| (7) | ✅ Süreler `trade_due` + temizlik döngüsü; her örnek aynı işi yapar, transaction güvenli |
| (8) Risk | Satıcı güncel ilanı (O-7) için stateVersion kuruldu ✅. `GET /api/market` okuma maliyeti: hesap başı 300/dk ve 2,5 sn önbellek (ENG-09) ✅. Okuma limiti süreç belleğinde (örnek başına). Makbuz TTL: Bedesten ✗ (D-3) |
| (9) Değişiklik | Bedesten makbuzu TTL'i; Bedesten için iki sunuculu e2e; ilan akışına olay (satıldı bildirimi, §3.7) |
| (10) Test | Var: `trade_*`, `market_security`, `eng07_market`, `eng09_read_limits`, `trade_ui.e2e`, `eng11_trade.e2e`, Firestore. Eksik: Bedesten iki örnek e2e, takas+yeniden başlatma |

### 3.6 Düello, eşleştirme, savaş, sonuç doğrulama

| Soru | Durum |
|---|---|
| (1) Çalışma | `js/duel_server.js` (WS odası), `server/duel_service.js`, `duel_config.js`, `js/duel_engine.js`. **İki tür:** vitrin (dostça, savaşçı `/api/sync`'ten) ve **ödüllü** (ENG06 P-D). Ödüllü: davet+kabul `dragonAssetId` taşır; savaşçı sunucu defterinden; maç kaydı+tohum+hamle günlüğü depoda; bitişte günlük yeniden oynatılıp kazanan türetiliyor; ödül hesap başı tek seferlik settlement |
| (2)(3) | ✅ Ödüllü maç: sunucu. İstemci savaşçı, kazanan, ödül, tur sayısı gönderemez |
| (4) | ✅ Hesap başı aktif maç kilidi, ejderha kilidi, takas/Bedesten ile çakışma korumaları. **Oda ve davet haritaları süreç belleğinde** (B-05): iki oyuncu farklı örneğe düşerse `socketFor` bulamaz, düello başlamaz |
| (5) Ağ kesintisi | ⚠ 30 sn zarif süre, sonra terk hükmü; yeniden bağlanınca `duel_room_resume` ✅. Ama 8 sn sabit yeniden bağlanma ve kaçırılan olay kurtarma yok |
| (6) Tekrar | ✅ `submitAction` tur numarası+tekil hamle; settlement `(eventId,accountId,kind)` PK ile tek seferlik |
| (7) Yeniden başlatma | ❌ **B-06.** Oda belleğte. Süreç ölürse aktif maç `active` kalır; kimse finalize etmez; kilit TTL'de (60 dk) biter; kimse ödül almaz, kimseye haber verilmez. Ayrıca `finalizeMatch` başarılı ama `settleGameplay` 3 denemede başarısız olursa (`pending`) **sonradan yeniden deneyen süpürücü yok**; ödül yalnız oda bitişinde denenir |
| (8) Risk | **Sybil (B-07):** "kayıtlı" = geçerli `eo_sess` çerezi; X handle'ı hesaba bağlı değil. Aynı X hesabı birden çok misafir hesabında oturum açıp birbirine karşı oynayabilir. Sınır: çift başı 3/gün, hesap başı 10/gün (`PLACEHOLDER_DEFAULTS`, onaylı denge değil). Her hesap günde en çok 10 × 85 = 850 earned. N hesapla ölçeklenir. İki tarafın aynı kişi olması ödülü sınırlıyor ama engellemiyor |
| (9) Değişiklik | Süpürücü (finalized-unsettled ve expired-active maçlar); oda durumunu depoda tutma/yeniden kurma; sonuç için `GET` ile okunabilir kayıt; X↔hesap bağlama; çok örnekte oda sahipliği |
| (10) Test | Var: `duel_server`, `duel_settlement`, Firestore P-D testleri, `eng10_economy.e2e` (iki hesap, gerçek WS). Eksik: süreç öldürme, settlement hatası+kurtarma, iki örnek, ödüllü yol (`paid`) tarayıcıda |

**Topçu arenası (Şahmeran/Kalgarot, PvE zindan, kervan, PvP 1v1/2v2):** fizik, HP, zafer, ganimet **tamamen istemcide**; sunucu `pvp_sync` ve `dungeon_coop_sync` mesajlarını herkese yayınlar (§3.7). Sunucuda doğrulanabilir hiçbir şey yok. Ayrıntılı tasarım zaten `ENG06_05_DESIGN.md`'de (§4); bu rapor onu tekrar etmez, yeniden kullanır.

### 3.7 Sohbet, han/kıraathane, odalar, oyuncu varlığı

| Soru | Durum |
|---|---|
| (1) Çalışma | WS (`server.js` `handleWsUpgrade`, `handleWsMessage`): `chat`, `hub_update/hub_actor`, `duel_cheer`, `boss_hit`, `dm_msg`, `party_invite/reply`, `social_invite`, `pvp_sync`, `dungeon_coop_sync`, `wheel_spin`, `ping`. Presence: bağlantı başı `presence:<uuid>` kaydı, kira 90 sn, yenileme 30 sn, `listPeers` ≤200. Kıraathane yerelde (`kiraathane.js`); yalnız emoji için WS `chat` çağırır |
| (2) Sahip | `WORLD` süreç belleği + `world.json`; presence: depo; odalar: süreç belleği |
| (3) Doğrulama | ✅ Gönderen (`from/handle`) oturumdan. ❌ İçerik: sohbet 120 karakter kesilir (kötüye kullanım/moderasyon/hız sınırı yok); `hub_update.d` ve `chibi` istemcinin keyfi JSON'u olarak herkese yayınlanır |
| (4) Eşzamanlılık | ❌ `WS_CLIENTS` örnek başına; çok örnekte sohbet/presence/boss herkes için ayrı bir dünya olur. `world.json` Cloud Run'da geçici ve örnek başına |
| (5) Ağ kesintisi | ⚠ İstemci 8 sn sabit; sunucu tarafında devam yok; kaçırılan sohbet/dm/davet kurtarılmaz. `BroadcastChannel` ile sekmeler arası yerel aktarım var (WS bağlıyken devre dışı) |
| (6) Tekrar | ❌ WS `chat`/`dm`/`davet`te istek kimliği yok |
| (7) Kalıcılık | Sohbet son 40 kayıt dosyada; DM kalıcı değil. Presence geçici (doğru) |
| (8) Risk | **B-04:** `dm_msg`, `party_invite`, `social_invite`, `pvp_sync`, `dungeon_coop_sync`, `wheel_spin` `wsBroadcast` ile **herkese** gider; istemci `to` ile süzer. Fısıltı üçüncü tarafın tarayıcısına ulaşır. Gizlilik+bant genişliği. **B-14:** `hub_update`, `chat`, `boss_hit` saveWorld() çağırır (tüm dünya JSON'u); hız sınırı yok. Presence yazma maliyeti N bağlantı × 2/dk (M-1, M-4 açık) |
| (9) Değişiklik | Hedefli teslim (hesap/oda bazlı); mesaj şeması+boyut+hız sınırı; `WORLD`'ün depoya taşınması; çok örnek için `RealtimeBus`; presence hesap başına tek kayıt |
| (10) Test | Var: `trade_ui.e2e` (WS takas), `eng10_economy.e2e`. Eksik: sohbet/DM yayın kapsamı, WS taşma/hız, çok örnek, kaçırılan mesaj |

### 3.8 Görevler, etkinlikler, çarklar, ilerleme, dünya sistemleri

| Sistem | Sahip / doğrulama | Not |
|---|---|---|
| Hedefler (`GOALS`, 13) | sunucuda `checkGoals` (kendi durumu) + `goal.reach` | `goal.reach` koşulsuz (B-02) |
| Ganimet çarkı (Topçu) | sunucu dilimi, hak istemci beyanlı | B-16 |
| Dünya Boss'u "Kül Yutan" | **istemci beyanı**: WS `boss_hit` ve `POST /api/boss` `dmg` (10–2500/3500) kabul, hesap başına hız/toplam sınırı yok (gönderen kimliği oturumdan, ama hasar miktarı istemcinin) | B-03/B-14 |
| Kervanlar / baskın | **istemci beyanı** (`/api/caravans`, `/api/raid-ocak`: `goldStolen`, `won`, `target`) | altın uygulanmıyor, sadece günlük; görüntü/sahte kayıt |
| Podyum | `/api/pageant` `score` istemci beyanı; oy sınırsız | liderlik tablosu kirlenir |
| Codex ("dünyada ilk") | `/api/sync` `codex` istemci beyanı; ilk yazan kazanır | sahte "ilk keşif" |
| Bayraklar (bölge) | `regionCount` istemci beyanı | |
| Sezon/hafta/kariyer/albüm | yerel; sunucuda yalnız `week.end` + nesil devri | |
| Yarış, podyum oyunu, kıraathane, Kan Tüccarı, çayhane | yerel | |
| Olaylar (`content.js` vb.) | yerel; seçimler istemci etkileşimi | sunucu `events` listesini yalnız bildirir |

### 3.9 Zamanlayıcılar, günlük/haftalık sıfırlama, çevrimdışı işlemler

- **Hafta tamamen oyuncu güdümlü**: `week.end` sınırsız (ENG-12 bileti kaldırdı). Bu yüzden "haftalık sıfırlama" gerçek zaman değil; haftalık sınırlar (`auction`, `orders`, `offers`) hızlı hafta çevirmeyle aşılabilir; sınırı **UTC günü** tutuyor.
- Sunucu saatine bağlı olanlar: `ocak.rebuild` (8 hafta **ve** 24 saat), günlük sayaçlar (`srvDaily`, UTC günü), düello günlüğü (UTC), maç TTL (60 dk), davet (30 sn), takas süresi, presence kirası (90 sn), oturum (365 gün).
- Çevrimdışı işlemler: Bedesten ilanı satıcı çevrimdışıyken satılır ✅; takas süresi dolunca otomatik iptal ✅ (`expireTrades` her örnekte 15 sn'de bir, transaction güvenli).
- **Eksik:** gerçek zamanlı küresel sezon takvimi (D1b), gerçek zamanlı yetişme/bekleme (örn. balıkçılık/yaşam becerisi için gerekli), sunucu zamanlı eylem bileti (`ActionTicket`) yok. Saat geri alınma/kayma koruması yalnız `ocak.rebuild` için.
- Risk: dünya boss'u/podyum/kervan dönemleri ve sıfırlamaları **yok**, `WORLD` kalıcı büyüyor (kısıtlı dilimlerle sınırlı: 40 sohbet, 60 baskın, 12 podyum, 8 kervan).

### 3.10 Mobil/masaüstü istemci durum senkronizasyonu

| Konu | Durum |
|---|---|
| Çift kaynaklı gerçek | Yerel `S` + sunucu defteri. Eşitleme `economy_sync.reconcile`: sunucu esas, bağlı varlıklar `assetId` ile |
| İyimser güncelleme | ✅ Yerel anında, sunucu arka planda; kesin ret = geri al; belirsiz = askıda, aynı gövde |
| Yenileme dayanıklılığı | ✅ Askıdaki gövde ve hafta kuyruğu `localStorage`'da; gizli sekmede yalnız bellek |
| Çoklu sekme | ✅ `version_conflict` → durum yenile, bir kez yeniden iste; ⚠ yerel `S` sekmeler arası paylaşım denetimi yok (iki sekme aynı slota yazar) |
| Çoklu cihaz | ❌ Yerel `S` cihaza bağlı; sunucu hesabı çerezle bağlı |
| WS yeniden bağlanma | ⚠ Sabit 8 sn, sıra/özet yok, kaçırılan olay kurtarılmıyor. Düello için `resume` var |
| Okuma yoklaması | Bedesten 10 sn, takas 5 sn; sunucudan itme yalnız "yenile" sinyali (`market_update`) |
| Mobil | Ekran düzeni düzeltmeleri yapıldı (ENG-09/10); gerçek telefon, iOS Safari **hiç test edilmedi** |

### 3.11 Yönetim işlemleri ve veri kurtarma

- **Yönetici arayüzü/rolü yok** (`grep admin` boş). Hesap inceleme, bakiye düzeltme, ban, sohbet temizleme, ilan iptali gibi işlemler yok.
- **Denetim işi yok:** `funds.bound+unknown+earned == gold` yalnız komut anında kontrol ediliyor. Tüm hesapları tarayan, çift harcama/varlık kopyası arayan bir iş yok.
- **Yedek/geri yükleme:** repo içinde Firestore dışa aktarma/PITR yapılandırması yok; üretim IAM ve indeks hazırlığı **doğrulanmadı** (ENG09 yayın listesi). Geri alma planı yazılı değil.
- **Kurtarma araçları:** `ocak.rebuild` (oyuncu borç sıfırlama), `legacy_balance_review_required` (eski kayıt kapısı). Eski kayıt mutabakatı (C2) açık karar.
- **Kill-switch:** komut türü bazında kapatma yok (yalnız `unsupported_command` kodu ve `market_settlement_unavailable` gibi sabit kapılar).
- **Gözlemlenebilirlik:** yapılandırılmış günlük, metrik, uyarı yok; hatalar `console.error`.

### 3.12 Depoda bulunan diğer oyun mekanikleri

| Mekanik | Dosya | Sunucu etkisi |
|---|---|---|
| Yarışlar | `race.js`, `racestory.js` | yok (`gold.local race`) |
| Güzellik podyumu | `pageant.js` | `/api/pageant` istemci beyanı |
| Kıraathane bahsi | `kiraathane.js` | yok (`gold.local`) |
| Kariyer/sezon | `career.js`, `season.js` | sezon devri sunucuda `seasonRollServer` (veri kısmı) |
| Rakip ocaklar | `rival.js` | sunucuda atlanır (`rivalWeek` boş) |
| Siparişler | `orders.js` | `order.deliver` |
| Müzayede | `auction.js` | `auction.sell` (yalnız kendi ejderhanı satış); alım yerel |
| Chibi/Kor Örsü/taş | `chibi.js` | sunucu `chibi.*`, `stone.synthesize`, `ore.convert`; Topçu taşları yerel (R-8) |
| Süs/kozmetik | `cosmetic.js` | yok |
| Soy/lineage, hibrit | `lineage.js` | yok |
| Sosyal (arkadaş, DM, parti) | `bag_social.js`, `social.js` | arkadaş listesi yerel; DM/parti WS yayın |
| Topçu PvP, zindan, raid (3 oyunculu) | `minigame.js`, `minigame/shm_*`, `minigame/raids/*` | yalnız mesaj aktarımı |
| Dünya patronu, kervan, baskın | `hub.js` + sunucu `WORLD` | B-03 |
| Hikâye/çizgi roman/etkinlik | `comic.js`, `content.js`, `arenastory.js` | yok |
| Eski yedek | `.backup_gercek_er_meydani/` | **repoda ölü kod** (ayrı temizlik) |

## 4. Sağlam bulunanlar (korunacak)

Bunlar bozulmamalı; yeni mimari bunların üstüne kurulur.
- Komut zarfı: `{requestId, expectedVersion, type, args}`; dar `SHAPES`; makbuz+sürüm+durum tek transaction (SQLite `IMMEDIATE`, Firestore `runTransaction`).
- Kaynak (provenance) modeli ve borç kapısı; yeni gelirler `sources.credit` / `debt.receive` ile girer.
- Kilit/rezervasyon ailesi: `guardReservation` (takas), `guardMarketHold` (ilan), `guardDuelLock` (maç). Yeni kilitler aynı kalıpla eklenir.
- Genel settlement tablosu `gameplay_settlements(event_id, account_id, kind)`: **düelloya özel değil, genel**; yeni oyun türleri aynı tabloyu kullanabilir.
- Maç kaydı+tohum+günlükten yeniden oynatma (`replayMatch`): sunucu otoritesinin en iyi kalıbı.
- İstemci: askıdaki komutu kalıcı saklama, aynı gövdeyle yeniden deneme, 12 sn zaman aşımı, `X-Trade-Account` hesap değişimi koruması.
- Oturum: token özeti, `__Host-` çerez, tek çerez zorunluluğu, `SESSION_SECRET` zorunlu.
- Hız sınırı ailesi (`consume`) ve okuma önbelleği.

## 5. Mevcut testler ve eksikler (özet; ayrıntı MULTIPLAYER_TEST_MATRIX.md)

Var (158 birim, koşuldu): `economy_commands/sources/store/client`, `eng06_*`, `eng07_market`, `eng09_read_limits`, `eng10_*`, `eng12_sync`, `eng13_income`, `duel_*`, `market_security`, `net_identity`, `server_foundation`, `session_*`, `trade_*`. E2E (Playwright, **bu oturumda koşulmadı**): `trade_ui`, `ocak_sandigi`, `eng09_layout`, `eng10_economy`, `eng11_trade`, `eng12_sync`.
Eksik başlıca: süreç öldürme/yeniden başlatma, çok örnek WS, iki cihaz, WS taşma/hız, dünya POST kötüye kullanımı, B-13 arbitraj, makbuz büyümesi, yük, gerçek telefon, gerçek Cloud Run.

## 6. Doğrulanamayanlar

- Cloud Run örnek sayısı, `maxScale`, proxy zinciri, `SESSION_SECRET` varlığı, Firestore IAM/indeks/yedek durumu (ENG06-03 K1–K10 hâlâ kullanıcı tarafından çalıştırılmadı).
- Üretimde gerçek hesap/veri var mı (C2).
- VM tabanlı komut yürütmenin yük altında maliyeti.
- Codex P-A (Yuva Bahçesi) commitsiz işi.
- B-13'ün gerçekten kârlı olup olmadığı (test yazılmadı).

## Düzeltme notu (2026-11-10, K9)
Bu belgedeki `gold.local` anlatımı (V3, tavanlı, `unknown`, takas edilemez) **eng13 ucu `d062da7` ve eng14 `7779904` kodunu yansıtmıyor.** `server/local_income.js` (ENG-13 8, kullanıcı kararı 2026-11-09): gelir tavanı yok, sunucunun hesapladığı bütün gelirler `earned` (takas edilebilir); yalnız geçerlilik denetimi (tür, tam sayı, tek istek ≤ 1.000.000). Bu nedenle D-M1 fiilen "tek kese" yönünde ilerlemiştir. Eski metin silinmedi; güncel kod esastır. Ayrıntı: `claude-context/UX_OZELLIK_SPEC.md` §1 V-1, §2.2 K9.
