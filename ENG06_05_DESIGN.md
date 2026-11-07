# ENG06-05 · Arena sunucu otoritesi tasarımı (Ejderha Düellosu + Topçu Arenası)

Tarih: 2026-11-08 · Dal: `claude/eng-06-economy` (taban `139523b`) · Durum: **yalnız tasarım, onay bekliyor.**
Kod, test, ödül, fiyat, olasılık ve `server/economy_sources.js` politikası değişmedi. Test koşulmadı.
Satır numaraları bu dalın `139523b` anına aittir; kayarsa fonksiyon adını esas alın.

---

## 1. Özet ve kapsam

**Soru:** İki arenanın sonucu ve ödülü bugün kimin elinde? Sunucu otoritesine nasıl taşınır?

**Kısa cevap:**
- **Ejderha Düellosu:** Tur çözümü gerçekten sunucuda (`js/duel_server.js:184 submitAction` → `DuelEngine.resolveRound`). Ancak savaşçı istatistikleri istemciden geliyor. Ödül yalnız istemcide yazılıyor (`js/net.js:480 finishMpFight`). Kalıcı maç kaydı ve settlement yok.
- **Topçu Arenası:** Bütün fizik, HP, zafer ve ganimet istemcide çalışıyor. Sunucu yalnız mesaj aktarıyor (`server.js:642`, `:663`, `:711`). Sunucuda doğrulanabilir hiçbir şey yok.
- **Ortak:** Sunucu defterine (`/api/economy/command`) bu yollardan bugün **hiç** altın ya da varlık yazılmıyor. `arena.win`, `duel.result`, `race.finish`, `pageant.score`, `reward.claim` ve `week.end` reddediliyor (`server/economy_commands.js:39`; test: `tests/eng06_economy_acceptance.test.js:37-38`). Bugünkü risk yerel oyun bütünlüğü ve dünya vitrini. Entegrasyondan sonra risk **para basımı** olur.

**Kapsam:**
- İki arenanın mevcut durumu.
- Önerilen mimari, istismar senaryoları, test planı ve uygulama dilimleri.

**Kapsam dışı:**
- Yarış (P-E), podyum ve hafta (P-C).
- Bedesten satın alma ve oyuncu müzayedesi.
- Denge sayıları.

**İki arena ayrı sistemdir** (onaylı karar). Ejderha Düellosu kart/hamle tabanlı ve tur çözümlüdür. Topçu Arenası canvas üzerinde balistik fizikle oynanır. Bu belge yalnız **ortak ödül/settlement altyapısını** paylaştırır; oyun mekaniklerini birleştirmez.

---

## 2. Kararlar

### 2.1 Onaylı (kullanıcı, 2026-11-08). Bu belge bunları değiştirmez
| # | Karar |
|---|---|
| K-1 | Monetizasyon yok; kumar ve loot box kaygısı yok. |
| K-2 | Her şey takas edilebilir: ejderha, yumurta, ekipman, kozmetik, malzeme. **İstisna:** başlangıç varlıkları ve tek seferlik hedef ödülleri **bound** kalır (çoklu hesap koruması). |
| K-3 | Köken kaydı (provenance) tutulmayacak. |
| K-4 | Bedesten'de serbest fiyat. Oyuncu müzayedesi ve teklif şimdilik kapsam dışı. |
| K-5 | Endgame = Topçu düelloları + büyük zindanlar. Nadir üretimin parasal karşılığı olmalı. |
| K-6 | Ejderha Düellosu ve Topçu Arenası ayrı oyun sistemleridir. Mekanikleri birleştirilmez. |

> **Not (K-3):** Bu belgedeki "maç kaydı" ve "settlement kaydı" çifte ödemeyi önleyen **işlem kayıtlarıdır**. Varlığın üzerinde "kim düşürdü" izi taşımazlar; provenance değildirler. Varlığa yeni alan eklenmez. Mevcut `funding` alanı (bound/unknown/earned) ENG-05 kaynak kovasıdır, ona da dokunulmaz.

### 2.2 Açık kararlar (onay bekliyor; burada **karar gibi** uygulanmaz)
| # | Konu | Seçenekler | Bu belgenin önerisi | Bloklar |
|---|---|---|---|---|
| A-1 | **Gerçek oynanış altını earned mı?** | (a) earned; (b) bound; (c) girdiye göre: bound ejderhayla kazanılan bound olur | (a) Kaynak politikası bunu öngörüyor: `economy_sources.js:64` *"Repeatable verified gameplay rewards may be earned."* Ancak starter ejderhasıyla kazanılan ödül, K-2 istisnasının Sybil gerekçesiyle çatışır. **Karar kullanıcının.** | D-3, G-2 |
| A-2 | İlk earned kaynağı: düello mu, yarış mı (D3/C10) | P-D düello / P-E yarış | P-D (tur çözümü zaten sunucuda) | Bütün dilimler |
| A-3 | **Sybil politikası** | Aynı çift için günlük ödül sınırı, azalan getiri, hesap yaşı/ün eşiği, aynı IP/cihaz sinyali | Karar verilmeden earned ödül açılmamalı | D-4 |
| A-4 | **Forfeit politikası** | `teslim`, `duel_leave` ve 30 sn kopma için ödül var mı; en az kaç tur oynanmalı | Karar verilmeden forfeit zaferi earned üretmemeli | D-4 |
| A-5 | Hafta bileti / giriş hakkı (D2/D9) | Gerçek süreye bağlı hak; zindan/çark için haftalık hak | Topçu PvE ödülünün **ön koşulu** olarak öneriliyor | G-1 |
| A-6 | Topçu doğrulaması (D12) | A: ganimeti sunucu zarlar · B: deterministik tekrar · C: tam simülasyon | Önce A (PvE), sonra B (§4.6) | G-1…G-4 |
| A-7 | PvP adaleti (D13) | Kudret bandı / normalleştirilmiş mod | Ödül açılmadan önce karar | D-4, G-3 |
| A-8 | Ekipman/kozmetik instance modeli (D18) | Bugün chibi ekipmanı sayaç ve bayrak (`C.unlockedItems`, `C.itemPlus`); takas için instance gerekir | Örs ve ganimet ekipmanı takası bu karara bağlı | G-4 |
| A-9 | Çok instance oda sahipliği | Sticky yönlendirme / depoda oda kirası / tek instance | §3.4 | D-5 |
| A-10 | Dünya/Divan/bahis çarpanları | Sunucuda eşdeğeri yazılır / settlement'ta yok sayılır | Yok saymak ödülü değiştirir, bu yüzden **onay gerekir** | D-3 |
| A-11 | Örs zamanlama bonusu (`R.bonus`) | İstemci beyanını sınırla / yok say | Yok saymak olasılığı değiştirir, bu yüzden **onay gerekir** | G-4 |

---

## 3. Ejderha Düellosu

### 3.1 Mevcut durum (koddan doğrulandı)
| Soru | Cevap | Kanıt |
|---|---|---|
| Maç nasıl başlıyor? | WS `duel_invite` → sunucu daveti (30 sn TTL) → `duel_invite_reply` kabul → oda oluşur. | `js/duel_server.js:118 invite`, `:150 reply`, `:171-181` |
| Rakip nasıl belirleniyor? | Oyuncu handle yazar. Sunucu yalnız şunları kontrol eder: biçim, kendine davet, ikisinin de çevrimiçi olması, ikisinin de aktif odada olmaması. Eşleştirme veya kademe yok. | `duel_server.js:122-131` |
| Sonuç nerede hesaplanıyor? | Sunucuda. Her tur iki hamle toplanır, `DuelEngine.resolveRound` çağrılır. Zar `Math.random` ile atılır, tohumsuz. | `duel_server.js:200-204`; `js/duel_engine.js:15-16`, `:174` |
| Sunucu neye tanıklık ediyor? | Davet, kabul, tur numarası, hamlenin yasallığı (`isLegalAction`), tur başına tek hamle, terk, kopma. | `duel_server.js:190-195`, `:207`, `:90` |
| Sunucu neye tanıklık **etmiyor**? | Savaşçının gerçek istatistikleri, ejderhanın sahipliği ve ödül. | aşağıda |
| Savaşçı verisi nereden? | İstemci `/api/sync` ile `duelFighter` ve `star` gönderir. `cleanFighter` yalnız aralık sınırlar: `gu/ce/da/ze/atk/def ≤ 500`, `crit ≤ 100`, `dodge ≤ 90`, `maxHp ≤ 5000`, `cards` serbest metin (3 adet). | `js/net.js:318`; `server.js:1057-1083`; `duel_server.js:24-47` |
| İstemci sonucu/ödülü değiştirebilir mi? | **Sonucu:** tur sonucunu değiştiremez. Ama istatistiğini sınırın tepesine (500/100/90/5000) çekerek sonucu fiilen belirler. **Ödülü:** tamamen. `finishMpFight` yerelde `S.gold += totalGold` (taban 85, beraberlik 35, yenilgi 20), +3 ün ve 2–4 T2 taş yazar. Çarpanlar (`raidMult`, `gladyator`, `FT.bet`) yerel. | `js/net.js:490-497`, `:505-507`, `:515`; `js/dragon_duel.js:118` (`rewardGold: 85`) |
| Kimlik | WS gönderen kimliği oturumdan gelir. Mesajdaki `from/handle/accountId` alanları ezilir. Misafir oturumu da `authenticated:true` sayılır. | `server.js:480`, `:548-549` |
| Ejderha sahipliği | **Doğrulanmıyor.** `star` istemci nesnesidir; sunucu defterindeki `game.dragons[].assetId` ile bağı yoktur. Takasta rezerve edilmiş ya da satılmış ejderha da düelloya girebilir. | `server.js:1077-1078`; `duel_server.js:127-129` |
| Aynı maç iki kez ödüllendirilebilir mi? | Sunucuda ödül yok. İstemcide yalnız geçici `FT.mpResultApplied` bayrağı korur, kalıcı değildir. | `dragon_duel.js:172-177` |
| Bağlantı koparsa | 30 sn ek süre. Yeniden bağlanırsa `duel_room_resume`, bağlanmazsa forfeit (karşı taraf kazanır). `duel_leave` anında forfeit sayılır. `teslim` yasal bir hamledir. Biten oda 3 dk sonra silinir. | `duel_server.js:9-11`, `:82-116`, `:207-214`; `duel_engine.js:163`, `:177` |
| Sunucu yeniden başlarsa | Odalar ve davetler süreç içi `Map`'te tutulur, hepsi kaybolur. | `duel_server.js:7-8` |
| İki instance | `socketFor` yalnız yerel `WS_CLIENTS`'e bakar. Farklı instance'taki oyuncular birbirini "çevrimiçi değil" görür. | `duel_server.js:21`, `:125-126` |
| Testler | `tests/duel_server.test.js`: misafir reddi, davet, tur ve hamle simülasyonu. Settlement testi yok. | — |

**Aynı aileden yerel varyantlar** (sunucu odası yok, sonucu yerel `newFight` hesaplar):
- `startLiveDuelRoom` (`js/net.js:452`).
- Hub modları: canlı 85, rövanş 95, ödül avı 140, Ocak Baskını 75 (`js/hub.js:2200`, `:2209`, `:2228`, `:2307`), X kodu 95 (`net.js:870`).
- Sonuç, istemci beyanıyla `/api/raid-ocak`'a yazılır (`net.js:518`).

Bu yolların hiçbiri gerçek düello sayılmamalı ve settlement'a bağlanmamalı.

### 3.2 Bugünkü veri akışı
```
İstemci S (localStorage) ──/api/sync {star, duelFighter}──► WORLD.players[handle]   (güvenilmez)
WS duel_invite ─► invites Map ─► reply ─► rooms Map {fight=createFight(f1,f2)}
WS duel_action ×2 ─► resolveRound (sunucu) ─► duel_room_state ─► her iki istemci
fight.over ─► istemci finishMpFight: S.gold += …   (yerel, sunucu defteri değişmez)
```

### 3.3 Önerilen mimari
1. **Maç kimliği ve kalıcı kayıt.**
   - Oda açılırken depoya `match` kaydı yazılır: `matchId`, `kind:'dragon_duel'`, `ruleVersion`, iki `accountId`, iki `dragonAssetId`, sunucu savaşçı snapshot'ı, `seed`, `status:'active'`, `createdAt`.
   - Bitişte `status:'final'`, `winner` ve tur günlüğü (hamle listesi) yazılır.
   - Kayıt **değiştirilemez**: `final` olan kayıt yeniden yazılamaz.
2. **Katılım ve sahiplik.**
   - Davet ve kabulde sunucu, ejderhayı **sunucu defterinden** okur: `readEconomy(accountId).dragons` içinde `assetId` olmalı.
   - Ejderha `dead`, `task`, `tradeLocked` ya da aktif takas rezervasyonunda olmamalı. Kontrol `market_service.js:28` ve `economy_commands.js:136` ile aynı ölçütlerle yapılır.
   - **Aktif maç kilidi:** maç süresince ejderha satılamaz ve takasa konamaz. Mevcut `tradeLocked` anlamı değiştirilmez; ayrı bir kilit alanı ya da match kaydı üzerinden kontrol yapılır (açık karar A-9 ile birlikte).
3. **Savaşçıyı sunucu türetir.**
   - `cleanFighter(raw)` yerine, sunucu VM'inde zaten yüklü olan `core.js:421 fighterFromDragon` kullanılır (`economy_commands.js:10`, `rules` içinde `core`). Bunun için `expose` listesine eklenmesi gerekir.
   - İstemcinin `duelFighter` alanı yalnız **görsel** kalır.
   - Çarpanlar: `seasonMult` (`data.js:223`) sunucuda hesaplanabilir. `calcOcakDefenseBonus` `hub.js:122`'dedir ve VM'de yok. Dünya olayı, Divan ve bahis için bkz. A-10.
   - `fighterFromDragon`'un bütün bağımlılıklarının VM'de saf çalıştığı **doğrulanmadı**.
4. **Sonuç otoritesi.**
   - Bugün `resolveRound` zaten otoriterdir; bu korunur.
   - Öneri: maç başına `seed` ile tohumlanmış RNG. Böylece kayıt + hamle günlüğü ile sonuç **yeniden üretilebilir** (denetim ve itiraz için). Ekonomi VM'indeki HMAC deseni örnek alınabilir (`economy_commands.js:53-56`).
   - Bu değişiklik `duel_engine.js`'e RNG enjeksiyonu demektir; olasılıklar değişmez.
5. **Kesinleştirme ve atomik tek ödeme (settlement).**
   - Settlement **istemci komutu değildir**. `/api/economy/command` şeklinde `duel.result` açılmaz; `unsupported_command` korunur.
   - Yeni dahili depo yöntemi: `settleGameplay(accountId, {matchId, kind, outcome})`. Aynı transaction içinde şunları yapar:
     1. `gameplay_settlements(matchId, accountId)` birincil anahtarını kontrol eder; varsa önceki sonucu döndürür (idempotent).
     2. Match kaydının `final` olduğunu doğrular.
     3. Ödülü mevcut tutarlarla `sources.credit(S, amount, <A-1 kaynağı>)` üzerinden yazar.
     4. Settlement satırını, `game_states` sürümünü ve makbuzu birlikte yazar.
   - **Neden mevcut `command_receipts`/`requestId` yeterli değil:**
     - `validateCommand` hash'i `expectedVersion`'ı da içerir (`economy_commands.js:49-50`). Yeniden denenen bir settlement farklı sürümle `request_id_reused` hatası verir (`economy_store.js:236`, `firestore_store.js:137`).
     - Tekillik anahtarı `requestId` değil, **(matchId, accountId)** olmalıdır.
     - Mevcut altyapıdan yeniden kullanılacaklar: `atomic()` / `runTransaction`, `guardReservation`, `sources.credit` ve sürüm artışı.
   - **İki hesap:** Her hesap kendi idempotent settlement'ını alır (ayrı transaction). Biri başarısız olursa outbox yeniden dener. Alternatif: tek transaction'da iki hesap (`trade_service` deseni). Her ikisi de çifte ödemeyi engeller.
   - **Yayın sırası:** İstemciye "ödül alındı" bilgisi yalnız commit'ten sonra gider (ENG06_04_PLAN §7 ilkesiyle aynı). İstemci `finishMpFight` içinde `S.gold +=` yazmaz; sunucu economy snapshot'ını gösterir.
6. **Kaynak bilgisi.**
   - Ödülün kovası A-1'e bağlıdır.
   - Bound ödül hiçbir koşulda earned'e dönüşmez (`economy_sources.js:65 goalSource` deseni).
   - Tek seferlik hedefler (GOALS) bound kalır (K-2). `checkGoals` settlement'tan sonra mevcut kuralla çalışır (`economy_commands.js:193-196`).
7. **Kopma ve yeniden bağlanma.**
   - 30 sn ek süre korunur.
   - Sunucu yeniden başlarsa veya oda kaybolursa: kayıt `active` kalır. TTL'den sonra `void` yapılır ve **ödül yazılmaz** (fail-closed).
   - Forfeit zaferinin ödülü A-4'e bağlıdır.
8. **Çok instance (A-9).** Seçenekler:
   - (a) Oda sahipliği depoda kira (lease) ile tutulur, WS mesajları sahip instance'a yönlendirilir.
   - (b) Düello trafiği için sticky oturum.
   - (c) Tek instance.

   Karar ENG06-03 topoloji sonucuna (K1–K10) bağlıdır.

---

## 4. Topçu Arenası

### 4.1 Ortak gerçek: istemci tek otorite
- `js/minigame.js` 4.539 satırdır, canvas ve fizik tek dosyadadır. **47 adet `Math.random`** içerir, `module.exports` yoktur. `shm_pvp.js`'te 12, `shm_ui.js`'te 19 `Math.random` daha var.
- Sunucu VM'i yalnız `data/core/week/social/chibi` dosyalarını yükler (`economy_commands.js:10-11`). Topçu kodu sunucuda hiç çalışmaz.
- Giriş kapısı `canEnterZindanOrTopcu` (`js/core.js:266`: Kızıl Taç + Ebedi Gençlik yavrusu) yalnız istemcide kontrol edilir.
- `tests/` altında Topçu testi yok.
- Ganimet yazımları:
  - `awardChibiStones` (`js/chibi.js:312`) doğrudan `C.stones/ores/shards/essences` artırır.
  - `S.gold` yazımları `shm_ui.js`'te 8 yerde.
  - `minigame.js`'te doğrudan `S.gold` yazımı yok; zaferi `shm_ui.js`'e devreder (`minigame.js:1894`, `:1912`).

**Doğrulamanın neden zor olduğu:**
1. Tohumsuz RNG fizikle iç içe.
2. Fizik, kare hızına bağlı `requestAnimationFrame` döngüsünde çalışıyor (`minigame.js:4360`). Sabit adım (fixed-step) olduğu doğrulanmadı.
3. Fizik ile çizim aynı dosyada.
4. Harita yükseklik verisi (`SHM.heightMap`) çalışma anında değişiyor (krater, su yükselmesi `minigame.js:1935`).
5. 2v2 müttefik ve bot davranışı yerelde hesaplanıyor.

### 4.2 Zindan / raid (PvE)
| Soru | Cevap | Kanıt |
|---|---|---|
| Başlangıç | İstemci kapısı (`core.js:266`), ardından yerel savaş. Sunucuda koşu kaydı yok. | — |
| Rakip | Kampanya bossları, yerel. Co-op ortağı `dungeon_coop_sync` ile aktarılır (`bossHp`, `dmg` alanları dahil). | `server.js:642-661`; `minigame.js:1055` |
| Sonuç | Yerel: boss HP ≤ 0 → ara aşamada `openStageClearBlessingModal` (+150), finalde `completeSahmeranDungeonVictory`. | `minigame.js:1883-1896`; `shm_ui.js:1526-1536`, `:1546` |
| Ödül | Normal +250, extreme +950, diğer kol +500. Kalıp, taş, Anka ve öz miktarları yerel `Math.random` ile atılır. | `shm_ui.js:1609-1631` |
| İstemci değiştirebilir mi | Evet: HP, zafer, zar ve miktar. | aynı |
| Kimlik/sahiplik | Silah ejderhası ve chibi ekipmanı yerel `S`'ten gelir. | `core.js:262` |
| Çift ödül | Engel yok. Fonksiyon tekrar çağrılabilir. | — |
| Kopma | Etkisiz; oyun yerelde sürer. | — |

### 4.3 Topçu PvP (1v1 / 2v2)
| Soru | Cevap | Kanıt |
|---|---|---|
| Başlangıç | Kuyruk tamamen istemcide. Oyuncular `pvp_sync` ile `queue_join` yayınlar. **Alfabetik olarak en küçük handle** maçı kurar. 90 sn içinde eşleşme olmazsa **bot** maçı başlar. | `shm_pvp.js:29`, `:86-104`, `:111-122` |
| Rakip | Kuyrukta görünen handle'lar. Sunucu eşleştirme yapmaz, oda kaydı tutmaz. `pvp_sync` hedefe değil **herkese** yayınlanır; süzme istemcide yapılır. | `server.js:663-690` (`wsBroadcast(…, socket)`) |
| Sonuç | Her istemci kendi simülasyonunu yürütür. Rakibin atışı `fire` mesajındaki `angle/power/dmg` ile yerelde yeniden oluşturulur. `hit` mesajı rakip HP'sini **doğrudan** ayarlar. Rakiplerin hepsi ölünce `completeSahmeranDungeonVictory` çağrılır. | `shm_pvp.js:1441-1471`; `minigame.js:1904-1914` |
| Ödül | PvP kolu: 2 T1 + 1 T2 taş, ardından büyük çark. | `shm_ui.js:1634-1636` |
| İstemci değiştirebilir mi | Evet. `dmg` (varsayılan 260), `rivalHp`, rüzgâr ve zafer istemci verisi. 2v2 müttefik desteği yerelde sabit 165 hasar verir. | `shm_pvp.js:1466`; `minigame.js:1921-1925` |
| Kimlik | `from` alanı oturumdan ezilir (`server.js:549`). Ancak `to`, `roomId` ve içerik alanları serbesttir. | — |
| Çift ödül / kopma | Engel yok. Rakip koparsa yerel zaman aşımı bota benzer davranır (`_liveRivalTimeout`). | `shm_pvp.js:1445-1448` |

### 4.4 Kervan
İki ayrı akış var; ikisi de istemci otoriteli:
1. **Hub eskortu** (`js/hub.js` `hub-caravan-*`):
   - Yerel `awardChibiStones` ve altın.
   - `mpSendCaravan('escort', {star, cargo, route})` (`hub.js:2157`).
   - Baskın: `mpSendCaravan('raid')` (`hub.js:2177`), ardından Topçu `gameMode:'caravan'`.
2. **Topçu kervan zaferi:** +180 altın, +8 ün, rota cevheri ve şansa bağlı kalıp (`shm_ui.js:1565-1599`).

**Sunucu (`/api/caravans`, `server.js:1119-1149`):**
- HTTP gövdesindeki `body.handle` ve `body.attacker` **oturumdan ezilmiyor**. Kervan kimliği `'cv_'+body.handle` ile türetiliyor. Bir oturum başka bir oyuncunun kervan kaydının üzerine yazabilir.
- `cargo` ve `star.st` de istemci verisi. Bu bir **vitrin/kimlik bütünlüğü** açığıdır; ekonomi açığı değildir.

### 4.5 Ganimet çarkı
| Konu | Durum | Kanıt |
|---|---|---|
| Hak | Küçük çark aşama başına 1. Büyük çarkın ilk çevrimi ücretsiz, sonrakiler **120 altın** (yerel `S.gold -= 120`). Hak sayacı `SHM.wheelSpinsCount` yerel. | `shm_ui.js:1646-1661` |
| Dilim seçimi | Yerel ağırlıklı `Math.random`. **`forcedSliceIdx` parametresi dilimi doğrudan seçer.** | `shm_ui.js:1665-1669`; ağırlıklar `shm_data.js:402-` |
| Ödül | Altın 120/220/450 (extreme 900), taş, cevher, kalıp, Anka+öz, gen=2 yumurta. Hepsi yerel. | `shm_ui.js:1704-1786` |
| `wheel_spin` | İstemci sonucu yayınlar. Sunucu `rewardTitle/prize/badge` metnini olduğu gibi aktarır. Gönderen oturumdan gelir, içerik gelmez. Sahte "jackpot" ilanı mümkün; ekonomi etkisi yok. | `shm_ui.js:1797-1808`; `server.js:711-723`; alıcı `net.js:195` |

### 4.6 Doğrulama seçenekleri (A-6, D12)
| | Nasıl | Artı | Eksi | Bu kodda maliyet |
|---|---|---|---|---|
| **A · Ganimeti sunucu zarlar** | Sunucu bir **koşu bileti** verir (`runId`, mod, zorluk, `seed`, son kullanma). İstemci "bitirdim" der. Sunucu süre ve tur makullüğünü kontrol eder, hakkı tüketir, ganimeti ve çarkı **mevcut tablo ve ağırlıklarla** kendisi zarlar. | Hızlı. Mevcut komut/makbuz altyapısıyla uyumlu. Miktar ve zar hilesini, çift ödülü ve `forcedSliceIdx`'i kapatır. | Sahte "zafer" beyanı hâlâ mümkün. Sınır yalnız giriş hakkı (A-5) ve makullük kontrolüdür. | Orta. Çark tabloları (`shm_data.js`) ve ödül kolları (`shm_ui.js:1546-1636`, `:1646-1790`) sunucu modülüne taşınır. Fizik taşınmaz. |
| **B · Atış günlüğü + deterministik tekrar** | Sunucu `seed` ve harita sürümünü verir. İstemci her atışı `(tur, açı, güç, silah)` olarak gönderir. Sunucu aynı fiziği Node'da yeniden oynatıp sonucu çıkarır. | Gerçek doğrulama; PvP'de iki tarafı da bağlar. | `minigame.js`'ten saf fizik modülünü ayırmak, RNG enjeksiyonu, sabit adım, harita deformasyonu ve bot/müttefik AI'sinin determinizmi gerekir. Kayan nokta farkı riski var. | Yüksek: büyük refaktör ve yeni test altyapısı. |
| **C · Tam sunucu simülasyonu** | Bütün savaş sunucuda yürür, istemci yalnız girdi gönderip çizim yapar. | En güvenli. | Gecikme ve sunucu maliyeti. Mobilde etkileşim hissi bozulabilir. Netcode baştan yazılır. | Çok yüksek. |

**Öneri:**
- **PvE (zindan, kervan, çark): A.** Hak sistemi (A-5) olmadan earned ganimet açılmaz.
- **PvP:** Kısa vadede ödül yalnız şu koşullarla:
  - iki tarafın bağımsız sonuç beyanı uyuşmalı;
  - maç sunucu kayıtlı olmalı;
  - bot maçında PvP ödülü olmamalı.

  Bu da sahte rakip ve anlaşmalı maça karşı zayıftır. Bu yüzden **Topçu PvP'de earned ödül için B önerilir**; B gelene kadar PvP ödülü bound ya da kapalı kalabilir (karar A-1/A-6).
- **C** şimdilik önerilmez.
- Dünya bossu ve kervan hub akışı Topçu fiziği kullanmaz (`hub.js:1897-1923` formüllü hasar). Bunlar A ile, hatta **tam sunucu hesabıyla** (formül saf) çözülebilir.

### 4.7 Önerilen mimari (Topçu, A yolu)
1. **Koşu/maç kimliği:** `POST` dahili komut `topcu.run.start {mode, raidId, difficulty}` (öneri ad).
   - Sunucu kapıyı (`canEnterZindanOrTopcu` eşdeğeri, sunucu defterinden) ve hakkı (A-5) kontrol eder.
   - `run` kaydı yazar: `runId`, `accountId`, `dragonAssetId`, mod, `seed`, `issuedAt`, `expiresAt`, `status`.
2. **Bitiş:** `topcu.run.finish {runId, outcome, durationMs, turns}`.
   - `outcome` yalnız `win|loss|abandon` olabilir.
   - `gold`, `reward`, `slice`, `drops` alanları **şema düzeyinde reddedilir** (`validateCommand` dar SHAPES deseni, `economy_commands.js:24-48`).
3. **Ganimet:** Sunucu `seed` ile mevcut ödül kollarını ve çark ağırlıklarını aynen uygular. Altın `sources.credit` ile, malzeme sunucu `C.stones/...` alanlarına yazılır (`chibi.js:312 awardChibiStones` VM'de zaten var).
4. **Çark:** `topcu.wheel.spin {runId}`.
   - Hakkı sunucu sayar. İlk çevrim ücretsizdir; sonraki çevrim `sources.spend(S, 120)` ile ödenir (mevcut tutar).
   - Dilimi sunucu seçer. `forcedSliceIdx` istemci girdisi olarak kabul edilmez.
   - `wheel_spin` yayını yalnız commit'ten sonra, **sunucu sonucundan** üretilir.
5. **Tek ödeme:** `(runId, accountId, rewardKind)` tekilliği, §3.3-5 ile aynı settlement yolu.
6. **Kopma:** Bilet süresi dolarsa koşu `expired` olur; ödül yazılmaz, hak iadesi A-5'e bağlıdır.
7. **Örs (G-4):**
   - Sunucuda `chibi.craft/repair/transfer`, `stone.synthesize` ve `ore.convert` zaten var (`economy_commands.js:159-187`).
   - **`+` basma komutu yok.** İstemci `ch-smith-up` (`chibi.js:1961`) ile ödemeyi yerelde yapıyor (`chibi.js:1990`), `orsResolve` ile `chance(effRate)` zarlıyor (`chibi.js:1228-1239`).
   - Zamanlama bonusu `R.bonus` istemci girdisidir (A-11).
   - Takas edilebilir ekipman için A-8 gerekir.

---

## 5. Ortak ödül ve kaynak kuralları
1. **İstemci hiçbir yerde miktar söylemez.** Ödül tutarı sunucu tablosundan gelir. Tablolar mevcut değerlerin birebir taşınmasıdır (85/35/20, 150/250/500/950, 180, 120, çark dilimleri).
2. **Settlement yalnız sunucunun `final` kaydından** tetiklenir; dışarıya açık komut yoktur.
3. **Tekillik:** `(eventId, accountId, rewardKind)` birincil anahtarı ile settlement ve state aynı transaction'da yazılır. `requestId` yalnız istemci komutlarının (start/finish/spin) tekrarına karşı kullanılır.
4. **Kova:** Earned, bound ya da girdiye bağlı seçimi A-1'dedir. Uygulama `sources.credit`/`spend` dışına çıkmaz. Harcama sırası (bound → unknown → earned, `economy_sources.js:36-41`) ve takas kuralı (`tradable`, `:49-56`) değişmez.
5. **Tek seferlik hedefler bound kalır** (K-2, `goalSource` `:65`).
6. **Fail-closed:** Belirsiz durumda (oda kaybı, süre aşımı, sonuç uyuşmazlığı) ödül yazılmaz.
7. **Dünya rotaları ekonomi kanıtı değildir:** `/api/sync`, `/api/boss`, `/api/caravans`, `/api/raid-ocak`, `/api/pageant`, `wheel_spin` ve `boss_hit` settlement girdisi olamaz.

---

## 6. API ve veri modeli değişiklikleri (yalnız öneri; ad ve şema onayla kesinleşir)
| Öğe | Öneri |
|---|---|
| Depo: `matches` | `matchId` PK; `kind`; `ruleVersion`; `participants[{accountId, dragonAssetId, fighterSnapshot}]`; `seed`; `status: active/final/void`; `winner`; `log`; zaman damgaları. SQLite tablosu ve Firestore `eo_matches/{id}`. |
| Depo: `gameplay_settlements` | PK `(eventId, accountId, rewardKind)`; `resultJson`; `appliedVersion`; `createdAt`. SQLite tablosu ve Firestore `eo_accounts/{id}/settlements/{eventId:kind}`. |
| Depo: `topcu_runs` | `runId`; `accountId`; `mode`; `seed`; `issuedAt/expiresAt`; `status`; `wheelSpins`. |
| Depo yöntemi | `settleGameplay(accountId, settlement)`: dahili, `executeCommand` ile aynı atomiklik ve `guardReservation`. |
| Komut (istemci) | `topcu.run.start`, `topcu.run.finish`, `topcu.wheel.spin` (dar şema). `duel.result` ve `arena.win` **açılmaz**. |
| WS düello | `duel_invite` → `{to, dragonAssetId}`; sunucu sahipliği doğrular. `duel_room_state` sonuna `settlement:{status, economyVersion}`. |
| `/api/sync` | `duelFighter` savaşa girdi olmaktan çıkar (yalnız vitrin). |
| Dünya HTTP rotaları | `body.handle/attacker` yerine `req.identity.handle` kullanılır (`server.js:1120-1139`, `:1184`, `:1211`). Güvenlik düzeltmesi; ekonomi değişikliği değil. |
| VM `expose` | `fighterFromDragon`, `seasonMult` ve Topçu ödül tablolarının sunucu modülü. |

---

## 7. İstismar senaryoları ve kontroller
| # | Senaryo | Bugün | Kontrol önerisi |
|---|---|---|---|
| X-1 | **Sahte maç** (hiç oynanmamış zafer) | Düello: sunucu odası olmadan zafer yok, ama yerel varyantlar (`net.js:452`) serbest. Topçu: `completeSahmeranDungeonVictory` doğrudan çağrılabilir. | Settlement yalnız sunucu `final` kaydından yapılır. Topçu'da bilet + hak (A). |
| X-2 | **Şişirilmiş savaşçı** | `duelFighter` 500/100/90/5000 tavanına çekilebilir (`duel_server.js:34-40`). | Sunucu `fighterFromDragon(ledgerDragon)` kullanır (§3.3-3). |
| X-3 | **Başkasının/satılmış ejderhası** | `star` istemci nesnesi. | `dragonAssetId` ledger üyeliği + aktif maç kilidi. |
| X-4 | **Anlaşmalı maç / bot çiftçiliği** | İki hesap sırayla `teslim` atabilir (`duel_engine.js:177`). Topçu'da 90 sn bot maçı. | A-3/A-4: çift başına sınır, en az tur, forfeit ödülü yok, bot maçında PvP ödülü yok. |
| X-5 | **Çoklu hesap (Sybil)** | Misafir hesabı ucuz. ENG06-03 oluşturma limiti tasarımda, uygulanmadı. | ENG06-03 + A-3 + K-2 (starter bound). Ödül kovası kararı A-1. |
| X-6 | **Forfeit/terk** | `duel_leave` anında, kopma 30 sn sonra rakibe zafer verir. | A-4. Sunucu restart → `void`, ödül yok. |
| X-7 | **Eşzamanlı ödül talebi** | Yok (ödül yerel). | `(eventId, accountId, kind)` PK + transaction. Firestore `tx.create` çakışmada hata verir. |
| X-8 | **Tekrar istek / replay** | `requestId` makbuzu var; settlement'a uygun değil (§3.3-5). | Settlement anahtarı. Aynı `matchId` ile ikinci çağrı önceki sonucu döndürür. |
| X-9 | **İstemci `winner/reward/gold` alanı** | `validateCommand` bilinmeyen alanı reddediyor (`economy_commands.js:36`, `:42`). | Yeni komutlarda da dar şema; `outcome` enum. Testle kanıt. |
| X-10 | **`wheel_spin` sahte yayın** | İçerik metni serbest (`server.js:711-723`). | Yayını sunucu settlement sonucundan üret; istemci `wheel_spin`'i yok say. |
| X-11 | **`S.gold +=` yazımları** | `shm_ui.js` 8, `hub.js` 14, `net.js` 5 yerde (grep). Sunucu defterini değiştirmez. | Entegre edilen her akışta yerel yazım kaldırılır, sunucu snapshot'ı gösterilir. Kalanlar "yerel/vitrin" diye etiketlenir. |
| X-12 | **`forcedSliceIdx`** | Dilimi doğrudan seçer (`shm_ui.js:1665`). | Sunucu dilimi seçer. |
| X-13 | **`/api/boss` hasar ve kimlik** | `dmg` 10–3500 istemci beyanı. `body.handle` oturumdan ezilmiyor (`server.js:1184`). WS `boss_hit` de istemci hasarı (`server.js:607-622`). | Kimlik oturumdan. Hasarı sunucu formülüyle hesapla (`hub.js:1904` formülü ledger ejderhasıyla). Yerel ödül (`hub.js:1911-1916`) settlement'a taşınana kadar vitrin. |
| X-14 | **`/api/caravans` üzerine yazma** | `cv_<body.handle>` başka oyuncunun kaydını ezer (`server.js:1121-1137`). | Kimlik oturumdan. `cargo/guardPower` sunucu hesaplar. |
| X-15 | **`/api/raid-ocak` sahte kayıt** | `won`, `goldStolen`, `attacker` ve `target` istemci verisi (`server.js:1203-1225`). | Kimlik oturumdan. Ödülsüz vitrin olarak kalır. Gerçek düello settlement'ından türetilebilir. |
| X-16 | **`pvp_sync` herkese yayın** | Oda izolasyonu yok, `to` süzmesi istemcide (`server.js:663`). | Sunucu oda üyeliği (G-3). Mesajı yalnız üyelere ilet. |
| X-17 | **Maç sırasında takas/satış** | Kilit yok. | Aktif maç kilidi + `guardReservation` testleri. |

---

## 8. Test planı
| Katman | Kapsam | Dosya (mevcut → önerilen) |
|---|---|---|
| Birim | Tohumlu `resolveRound` determinizmi. `fighterFromDragon` VM'de. Ödül tablolarının mevcut değerlerle eşitliği (golden). Topçu çark ağırlıklarının taşınması (dağılım değil, tablo eşitliği). | `tests/duel_server.test.js` → `tests/duel_settlement.test.js`, `tests/topcu_loot.test.js` |
| SQLite | Settlement idempotensi, eşzamanlı iki settle, restart sonrası `void`, `guardReservation` ile kilit, kova (A-1 kararına göre). | `tests/economy_store.test.js`, `tests/eng06_economy_acceptance.test.js` desenleri |
| Firestore emülatörü | Aynı senaryolar: `tx.create` çakışması, `maxAttempts` yeniden denemesi, seed sabitliği (`firestore_store.js:129`). | `tests/firestore_store.integration.js` (`emulators:exec`, yalnız demo proje) |
| İki sunucu | Farklı instance'taki iki oyuncu, oda sahipliği (A-9), instance kapanınca `void`, çift settlement yok. | `ENG05_MULTI_SERVER=1` deseni (`tests/trade_ui.e2e.js`) |
| Playwright | İki tarayıcı bağlamında gerçek davet → hamleler → zafer/beraberlik/yenilgi/terk/kopma. Ekonomi snapshot'ı sunucudan güncellenir. Callback çağırarak kazanmak başarı sayılmaz. | `tests/trade_ui.e2e.js` → `tests/duel_ui.e2e.js` |
| İstismar | X-1…X-17'nin her biri için negatif test: `gold/winner/reward` alanı reddi, sahte `dragonAssetId`, satılmış ejderha, aynı `matchId` iki kez, `forcedSliceIdx`, hak tükenmiş çark, 120 altın yetersiz bakiye, süresi dolmuş bilet, dünya rotalarında başka handle. | `tests/market_security.test.js`, `tests/net_identity.test.js` desenleri |
| Regresyon | Mevcut 58 + 8 test; `unsupported_command` listesi korunur. | `npm test`, `npm run test:firestore` |

Bu belge için **hiçbir test koşulmadı** (`node_modules` bu worktree'de yok).

---

## 9. Uygulama dilimleri (sıralı; her biri ayrı onay)
**Codex hizası:** D-* ≈ Codex **P-D** (ENG06_04_PLAN §7), G-* ≈ Codex **P-G**. Codex planı P-G için P-C'yi ön koşul sayıyor; bu belge G-1'i hak sistemi (A-5) ile bağlıyor. P-C hafta bileti çözülürse ikisi aynı ön koşul olur.

| Dilim | İçerik | Bağımlılık | Kabul ölçütü |
|---|---|---|---|
| **S-0** | Karar paketi A-1…A-11 | — | Kullanıcı onayı yazılı |
| **W-1** | Dünya HTTP rotalarında kimlik oturumdan (X-13/14/15). Ödül yok. | ENG06-03 ile çakışmaz; `server.js` | Başka handle ile yazma 403/ezilir; mevcut testler yeşil |
| **D-1** | Sunucu savaşçısı: ledger `dragonAssetId` + `fighterFromDragon` (VM) | P-A birleşmiş olmalı (`economy_commands.js` çakışması), A-10 | Sahte `duelFighter` sonucu etkilemez; satılmış/rezerve ejderha reddedilir |
| **D-2** | Kalıcı `matches` kaydı, tohumlu RNG, aktif maç kilidi | D-1 | Tur günlüğü + seed ile sonuç yeniden üretilir; maç sırasında takas reddedilir |
| **D-3** | `settleGameplay` + `gameplay_settlements`; istemci `S.gold +=` kaldırılır | D-2, A-1, A-2 | Aynı maç ikinci kez ödenmez (SQLite + Firestore); tutarlar 85/35/20 aynen |
| **D-4** | Sybil/forfeit kontrolleri | A-3, A-4, A-7 | Anlaşmalı `teslim` döngüsü ödül üretmez |
| **D-5** | Çok instance / restart | A-9, ENG06-03 topoloji | İki sunucu testinde çift ödeme yok, kayıp oda `void` |
| **G-1** | Topçu PvE bileti + sunucu ganimeti (A yolu): zindan, raid | D-3 (settlement), A-5, A-6 | `forcedSliceIdx`/miktar hilesi etkisiz; ödül tabloları birebir |
| **G-2** | Çark sunucuda (hak, 120 bedel, dilim) + kervan | G-1 | Hak replay'i yok; yayın sunucu sonucundan |
| **G-3** | Topçu PvP: sunucu oda üyeliği, bot maçı ayrımı, ödül politikası | G-1, A-6, A-7 | Bot maçında PvP ödülü yok; `pvp_sync` yalnız üyelere |
| **G-4** | Örs `+` basma komutu | A-8, A-11, P-B | Ödeme ve zar sunucuda; oranlar değişmez |
| **G-5** | B: saf fizik modülü + deterministik tekrar | G-3; büyük refaktör kararı | Aynı atış günlüğü Node'da aynı sonucu verir |

**Çakışan dosyalar (Codex ile aynı anda yazılmamalı):**
- `server/economy_commands.js`, `server/economy_store.js`, `server/firestore_store.js`, `server.js`: Codex P-A worktree'sinde 14 commitsiz dosya var; hangileri olduğu **doğrulanmadı** (worktree'ye dokunulmadı).
- `js/duel_server.js`, `js/duel_engine.js`, `js/dragon_duel.js`, `js/net.js`, `js/core.js`: P-D.
- `js/minigame.js`, `js/minigame/shm_*.js`, `js/chibi.js`, `js/hub.js`: P-G.

Öneri: D-1'den önce P-A birleştirme sırası (C5) netleşmeli.

---

## 10. Bağımlılıklar ve riskler
| Risk | Etki | Hafifletme |
|---|---|---|
| Earned ödül Sybil kararından önce açılır | Para basımı, takas enflasyonu | A-1/A-3 olmadan D-3 kovası earned yapılmaz |
| `fighterFromDragon` VM'de saf çalışmaz (UI/hub bağımlılığı) | D-1 gecikir | Önce bağımlılık taraması (doğrulanmadı) |
| Ödül çarpanlarının (Divan, dünya, bahis) düşmesi ödülü değiştirir | Onaysız denge değişikliği | A-10: onay gerekir |
| Topçu A yolu sahte zafere açık | PvE ganimet çiftliği | Hak sınırı (A-5), makullük kontrolü, PvP için B |
| B yolunda kayan nokta/kare hızı farkı | Yanlış red | Sabit adım + tamsayı fizik; tolerans testleri |
| Çok instance oda kaybı | Ödülsüz biten maç (fail-closed) | A-9; kullanıcıya "maç geçersiz" mesajı |
| Codex P-A ile dosya çakışması | Birleştirme hatası | Sıra: P-A birleşir → D-1 |
| Yerel `S` ile sunucu defteri ayrışması | Oyuncu iki farklı altın görür | Entegre akışta yerel yazım kaldırılır; `economyReady:false` geçişi (C5) |
| Mobil Topçu kontrolü | Endgame erişimi | Gerçek telefon testi (yapılmadı) |

---

## 11. Doğrulanamayanlar ve yapılmayanlar
- **Test koşulmadı.** Oyun oynanmadı; düello, Topçu, çark ve Örs canlı denenmedi.
- `minigame.js` fiziğinin sabit adımlı olup olmadığı ve harita deformasyonunun determinizmi **doğrulanmadı**.
- `fighterFromDragon`'un VM'de bütün bağımlılıklarıyla çalıştığı **doğrulanmadı**.
- Codex P-A worktree'sindeki 14 dosyanın içeriği **okunmadı** (yasak).
- Canlı Cloud Run topolojisi ve instance sayısı **doğrulanmadı** (ENG06-03 K1–K10 bekliyor).
- `S.gold` yazım sayıları `grep "S.gold +=\|S.gold = (S.gold"` ile sayıldı; `-=` ve dolaylı yazımlar bu sayıya dahil değil.
- Önceki belgelerdeki iki ifade düzeltildi (asıl belgeler değiştirilmedi):
  1. `ENDGAME_LOOP_DESIGN.md` §7'deki `S.gold += 120` yazımı `minigame.js`'te değil, `shm_ui.js:1704`'te (küçük çark 120 dilimi).
  2. 120 altın, büyük çarkın ek çevrim bedelidir (`shm_ui.js:1660`). Codex C7 düzeltmesiyle uyumlu.
- Kod, test, ödül, fiyat, olasılık ve kaynak politikası **değiştirilmedi**. Yeni mekanik eklenmedi. Önerilen tüm adlar ve şemalar taslaktır.
