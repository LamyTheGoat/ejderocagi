# ENG06-04-PREP — Gerçek Oynanış ve Sunucu Ekonomisi Entegrasyon Planı

Tarih: **2026-11-07** · Öncelik: **P0 analiz** · Durum: **Proje Merkezi değerlendirmesine hazır; uygulama yapılmadı.**

## 1. Kapsam, dayanak ve Git izolasyonu

Bu belge mevcut oyun eylemlerinin kalıcı sunucu ekonomisine bağlanmasını inceler. Yeni mekanik, üretim kodu, API veya veri şeması uygulanmamıştır. Aşağıda adı geçen yeni komutlar/dosyalar yalnız öneridir. Ekonomi miktarları, ENG-05 kaynak koruması ve ENG-06 Paket 1–2 hedef politikası değiştirilmeyecektir. Bedesten ve Ocak Sandığı yeniden tasarlanmayacaktır.

| Alan | Doğrulanan değer |
|---|---|
| İnceleme tabanı | `a36011d455cba08b68135d275ae2cea8244e9732` — ENG-06 Paket 2 |
| Planlama dalı | `codex/eng06-04-plan` |
| Ayrı worktree | `C:/Users/user/.codex/worktrees/eng06-04-plan/ejderocagi-yeni` |
| Teslim dosyası | `ENG06_04_PLAN.md` |
| Korunan çalışma alanları | Claude: `C:/Users/user/Documents/GitHub/ejderocagi-eng06`; QA: `C:/Users/user/.codex/worktrees/qa-eng06-review-01/ejderocagi-yeni`; kaynak checkout: `C:/Users/user/Documents/GitHub/ejderocagi-yeni` |
| Yasak işlemler | `main` değişikliği, branch reset, push, merge, canlı dağıtım |

Worktree belirtilen commit'ten oluşturuldu; başka çalışma ağacına dosya yazılmadı. Yeni dal oluşturulması dışında mevcut dallar değiştirilmedi. İnceleme için `ejder-ocagi-dev` becerisi okundu. Kod/asset değişmediğinden görsel varlık denetimi kapsam dışıdır.

**Numaralandırma ayrımı:** Tabanın `ENG06_DELIVERY.md` §6'sında “ENG06-04” okuma/presence/WS limitleri işi olarak geçiyor. Bu belge kullanıcının yeni **ENG06-04-PREP oynanış analizi** talebidir; eski güvenlik işini veya Claude'un ENG06-03 işini üstlenmez. Önerilen paketler karışmaması için aşağıda **P-A…P-G** olarak adlandırılmıştır.

Kanıtlar bu commit'teki aktif dosyalardır; `.backup_*` kopyaları çalışma kodu sayılmadı. `dosya:satır` referansları taban commit'e aittir; ileride taşınırsa fonksiyon adı esas alınmalıdır. Statik inceleme ve mevcut otomatik testler yapıldı; tarayıcıda gerçek oynanış, Firestore emülatörü ve fiziksel cihaz denemesi bu görevde çalıştırılmadı. Bu ayrım §8'de korunmuştur.

## 2. Karar özeti ve mevcut envanterdeki düzeltmeler

**İlk öneri: Yuva Bahçesi kur → sunucu 220 altın harcasın → mevcut tek seferlik `yuva` hedefi 40 bound altın ödesin → yenilemede aynı bina ve 240 altın görülsün.** Bu, mevcut eylem + mevcut doğrulama + mevcut kalıcı ödül zinciridir. Yeni earned üreticisi, savaş simülasyonu veya hafta komutu gerektirmez. §6'daki durum izolasyonu bu küçük dilimin zorunlu parçasıdır; yalnızca HTTP çağrısı eklemek yeterli değildir.

Claude'un tabandaki envanteri yararlı bir başlangıçtır ancak aşağıdaki noktalar kod üzerinden düzeltilmelidir:

1. **Ejderha Düellosu sadece aktarma sunucusu değildir; ödülsüz de değildir.** `js/duel_server.js:184 submitAction` sunucuda `DuelEngine.resolveRound` çağırır. Ödül `dragon_duel.js` içinde değil, `js/net.js:480 finishMpFight` içindedir. Gerçek odada taban zafer ödülü 85, beraberlik 35, yenilgi 20 altındır; hepsi yereldir. Savaşçının istatistikleri ise `/api/sync` ile istemciden gelir.
2. **Topçu için 120 altın giriş ücreti değildir.** `js/minigame/shm_ui.js:1646 spinSahmeranLootWheel` içindeki ek büyük çark çevriminin bedelidir. PvP zaferinde `completeSahmeranDungeonVictory` iki T1 ve bir T2 taş verir; altın çark akışında da üretilebilir. Zindan aşama/zafer ödülleri aynı UI dosyasında bulunur, PvP giriş ücretiyle karıştırılmamalıdır.
3. **GOALS günlük/haftalık görev listesi değildir.** `js/core.js:833` içindeki 13 hedef `S.goals` ile bir kez ödenir. Ayrı kariyer hedefleri, oyun haftasına bağlı bakım/hub hakları vardır. Aktif kodda takvim günü giriş ödülü veya genel günlük/haftalık claim servisi bulunmadı.
4. **Sunucuda komut bulunması ekranın bağlı olduğu anlamına gelmez.** `PAZAR_ACT`, `ACT.build`, bakım ve Örs eylemleri yerel `S` üzerinde çalışır. `createEconomyClient` örneği `js/net.js:82`'de oluşturulsa da aktif oyun eylemlerinde bu istemciye komut çağrısı bulunmadı. Takas ekranı kendi `createTradeClient` yolunu kullanır.
5. **Podyum HTTP rotası ile oynanış arasında bağlantı eksik.** `server.js:1151` rota vardır; aktif istemci JS/HTML dosyalarında `/api/pageant` çağrısı bulunmadı. Yerel `finishSarayShow` ve `saray-vote` yalnız yerel sonuç yazar. Ayrıca sunucu `pageant_update.pageant` gönderirken `js/net.js:260` `msg.entries` bekler.
6. **Sunucu `egg.hatch` hazır olsa da normal başlangıç yumurtası ilerleyemez.** `egg.w` artıran sunucu komutu yoktur. Testin `w=2` fixture'ı gerçek oyuncunun erişebildiği ilerleme değildir.

## 3. İstemci → sunucu veri akışı ve korunacak sınırlar

### 3.1 Bugünkü iki ayrı durum

```text
Oyun ekranı / ACT / PAZAR_ACT / RACE_ACT / PAGEANT_ACT
  → yerel S değişir (gold, dragon, food, week, flags...)
  → afterAction → yerel checkGoals / careerCheck → saveGame → localStorage
  → bazı sosyal bildirimler /api/sync veya WS → WORLD
  ✕ kalıcı ekonomi hesabına aktarım yok

Sunucu oturumu (cookie → accountId)
  → GET /api/economy : sunucu snapshot'ı + version
  → POST /api/economy/command : requestId, expectedVersion, type, args
  → validateCommand → store.executeCommand → reduceCommand
  → spend / credit / kaynak etiketleri + checkGoals
  → guardReservation → state + version + receipt tek transaction
  → economy snapshot + result.goals → istemci görünümü
```

- Yerel kayıt: `js/core.js:997 saveGame`, `:1018 loadGame`, `:1089 importSaveString`; UI sonrası yan etkiler: `js/ui.js:74 afterAction`.
- Ağ köprüsü: `js/economy_client.js:5 createEconomyClient`, `:16 refresh`, `:21 sendPending`, `:42 command`. Snapshot bilerek `S`'ye yazılmaz. 5xx/ağ hatasında aynı isteği tutar; 409'da yeniler ve satın almayı sessizce tekrarlamaz. Pending istek yalnız bellektedir; sayfa yenileme ve hesap değişimi dayanıklılığı ayrıca gereklidir.
- HTTP: `server.js:918`, `:925`; `economyReady:false` yanında `commandApiReady:true` vardır. Bu bayrak tam oyun entegrasyonu anlamına gelmez. Kimlik istemci argümanı değil oturumdan alınır. Mevcut `X-Trade-Account` kontrolü ekonomi rotasında da bulunur; genel ekonomi istemcisi bu başlığı henüz göndermiyor.
- Komut sınırı: `server/economy_commands.js:26 SHAPES`, `validateCommand`, `makeRuntime`, `reduceCommand`, `gameEconomy`. Fiyat, başarı, source, state veya ödül miktarı payload'dan alınmaz; alan şekli dar ve doğrulanmıştır. Runtime yalnız `data/core/week/social/chibi` dosyalarını yükler; `week.js` yüklenmesi `endWeek`'in sunucuda kullanılabilir olduğu anlamına gelmez.
- Kalıcılık: `server/economy_store.js:227 executeCommand` (SQLite `game_states`, `command_receipts`) ve `server/firestore_store.js:127 executeCommand` (`eo_accounts.gameJson`, hesap altı `commands`). Request hash ve version denetimi, aynı receipt ile replay, backend transaction'ı vardır. Firestore seed'i SDK transaction tekrarlarında sabittir.
- Rezervasyon: `server/trade_service.js:89 guardReservation`; earned altın/yem rezervlerini ve teklif edilen varlığın tüm kayıt değişimini korur. Besleme, yumurta çıkışı veya düello yorgunluğu da teklif edilen varlığı değiştirebilir; yeni üreticiler bu denetimi atlayamaz.
- Dünya verisi: `server.js:1057 /api/sync` açık ekonomi alanlarını reddeder; `star`, `duelFighter`, `un`, `wins`, `chibi` gibi gösterim alanlarını kabul eder. Bu değerler kalıcı ekonomi girdisi olamaz. `WORLD`/yayın ile hesap defteri aynı güven düzeyinde değildir.

### 3.2 Değiştirilmeyecek ekonomi kuralları

`server/economy_sources.js` korunacak sözleşmedir:

- Başlangıç 420 altın ve başlangıç varlıkları bound. Eski kaynağı kanıtlanmamış değer unknown.
- `gold = funds.bound + funds.unknown + funds.earned`; yemek sayısı ilgili kaynak kovalarının toplamına eşit.
- `spend` sırası bound → unknown → earned. Varlık kaynağı `sourceOf`/`combine` ile korunur; unknown baskın, sonra bound.
- `goalSource = combine([goalInputSource, 'bound'])`: 13 tek seferlik hedef hiçbir zaman earned olmaz; kanıtı unknown ise unknown kalır. `goals.claim` yeni başarı beyanı kabul etmez.
- `milestoneSources.gen2/mark` için doğrulanmış üretici yoktur. Eldeki veya ödünç alınmış ejderhaya bakarak earned üretmek yasaktır. Diğer hedef üreticileri de kendi sunucu işlemlerinin girdisini kaydetmelidir.
- Yalnız earned altın/varlık/yem takasa uygundur. İstemci bakiyesi, skor, localStorage, iki oyuncunun aynı sonucu bildirmesi veya WS mesajı earned kanıtı değildir.
- Yeni tekrarlanabilir ödülün sunucuda hesaplanması tek başına Sybil/işbirlikli maç çiftçiliğini çözmez. Başlangıç varlıklarıyla üretimin kaynak politikası ve tekrar sınırı ayrıca onaylanmadan `credit(..., 'earned')` açılmamalıdır.

## 4. Sistem bazında doğrulanmış envanter

| Sistem | İstemci olgunluğu | Sunucu karşılığı | Kalıcı ekonomiye bugünkü erişim |
|---|---|---|---|
| Ejderha Düellosu | Canlı tur UI + yerel/asenkron karşılaşma yolları | Gerçek oda, hamle ve tur çözümü var; savaşçı girdisi güvenilir değil | Sonuç/ödül kaydı yok |
| Topçu Arenası | 1v1/2v2, kuyruk, bot, fizik, çark var | PvP/co-op/çark mesaj aktarımı | Yok |
| Ejderha yarışları | Manuel ve otomatik uçuş, rakipler, sıralama, ücret/ödül | Yarış simülasyonu/oturumu yok | Yok |
| Güzellik podyumu | Üç aşamalı gösteri, otomatik sonuç, yerel oy | Ayrı, istemci beyanına dayalı WORLD skoru/oy rotası | Yok |
| Günlük/haftalık ödüller | Tek seferlik GOALS, kariyer, hafta hakları | GOALS claim ve otomatik check var | GOALS yalnız sunucuda bilinen başarılar için; diğerleri yok |
| Yumurta/kuluçka/üretim | Satın alma, yerleştirme, hafta, genetik ve çıkış var | Alım + incubate + hatch var | Hafta/üreme eksik; normal hatch ilerlemesi kapalı |
| Yemek/bakım | Yem alımı, besleme, yıkama, top oyunu, upkeep | Yem alımı var | Tüketim/bakım/hafta yok |
| Yükseltme/harcamalar | NPC alım/satım, inşa, Örs, dönüşüm | Birçok harcama komutu var | UI bağlı değil; gerçek `+` yükseltme komutu yok |

### 4.1 Ejderha Düellosu

**1 — Dosyalar/fonksiyonlar:** `js/dragon_duel.js` davet, `mpStartServerDragonDuel:90`, `mpSubmitDragonDuelAction:133`, `mpHandleDragonDuelState:144`, `mpApplyDragonDuelResult:172`; `js/net.js:452 startLiveDuelRoom`, `:480 finishMpFight`; `js/ui.js` dövüş ekranı ve `js/core.js:421 fighterFromDragon`. Sunucu `js/duel_server.js` ve `js/duel_engine.js` Node tarafından gerçekten kullanılır (`server.js:23`, `:430`, `:557`).

**2 — Sunucu:** `invite/reply/submitAction` üyelik, tur numarası, aynı turda tek hamle ve `isLegalAction` kontrolü yapar; `resolveRound:174` sonucu sunucuda üretir. Ancak `cleanFighter:24` yalnız sayıları sınırlar, sahiplik veya sunucu ejderhasından türetme yapmaz. `reply:150` savaşçıları `WORLD.players`'dan alır. Oda ve davetler process içi Map'tir; biten oda üç dakika sonra temizlenir. `finishByForfeit:82` 30 saniyelik kopma sonrası veya leave ile galip belirler. Kalıcı maç/ödül makbuzu ve çok instance oda sahipliği yoktur.

**3 — Ödül/maliyet:** `finishMpFight` zaferde `round((opts.rewardGold || 85) × worldEvent.raidMult × gladyatorMult) + varsa kazanılan bahis`, +3 ün, +2 bağ ve 2–4 T2 taş; beraberlikte +35, yenilgide +20 altın yazar. Gerçek oda `rewardGold:85, serverRoom:true` kullanır. Alternatif `startLiveDuelRoom` yerel `newFight` kullanır; hub'da 75/95/140 gibi başka mod değerleri vardır. Bunlar gerçek düello ödülüyle tek tabloymuş gibi birleştirilmemelidir. Klasik NPC arena ödülü ayrıca `js/week.js:289 fightOutcome` içindedir.

**4 — Manipülasyon:** DevTools ile yerel sonucu/ödülü, fighter istatistiklerini ve çarpanları değiştirmek mümkün. `mpResultApplied` yalnız geçici FT nesnesini korur. Sahte `duelFighter`, hızlı forfeit veya anlaşmalı rakipler gelecekte ödül çiftçiliğine dönüşebilir. Mevcut sunucu defterine bu yollardan ödeme yapılmıyor; bugün saptanan risk yerel ekonomi/maç bütünlüğü, entegrasyon sonrası ise para basımıdır.

**5 — API yeniden kullanımı:** WS hamle/oda iskeleti ve DuelEngine kullanılabilir; ekonomi transaction/kaynak/makbuz altyapısı kullanılabilir. Mevcut `duel.result` komutu yoktur ve reddedilir. İki istemcinin onayı doğrulanmış sonuç yerine geçmez. Sunucunun kendi tamamlanmış maçı ile çağrılan, kimliği ve tekilliği kanıtlanmış settlement gerekir.

**6 — Dosyalar:** `js/duel_server.js`, `js/duel_engine.js` (RNG bağımlılığı ve saf hesap ayrımı gerekirse), `js/dragon_duel.js`, `js/net.js`, `js/core.js` savaşçı türetimi; önerilen `server/gameplay_settlement.js`; `server.js`, iki store ve `server/economy_commands.js`; ilgili düello/ekonomi/E2E testleri. Kaynak politikası dosyası değiştirilmez. Yerel world event/Divan/ekipman/bahis girdileri sunucuda doğrulanmadan çarpan diye kabul edilemez.

**7 — Gerçek oynanış testi:** İki bağımsız tarayıcı hesabı, sunucuya ait ejderhalarla gerçek davet/kabul ve hamleler; zafer/beraberlik/yenilgi/leave/kopma senaryoları. Aynı bitiş yayını, aynı maç için yeni requestId, yeniden bağlanma ve server restart ikinci ödeme üretemez. Sahte fighter, başka account/asset, eski tur, takasta rezerve ejderha, iki instance'a bölünme ve iki hesap arasında ardışık forfeit test edilir. Sonuç callback'i çağırarak kazanmak başarı E2E'si sayılmaz.

**8 — Eksik:** Güvenilir savaşçı snapshot'ı, economic assetId üyeliği, aktif maç kilidi, kalıcı terminal maç kaydı, atomik ödül/receipt, oyuncu başına ekonomik sonuç, oturum iptalinin ekonomik bitişte taze kontrolü ve çok instance kurtarma. Sunucuda kazanmak, mevcut haliyle sunucuda para kazanmak değildir.

### 4.2 Topçu Arenası

**1 — Dosyalar:** `js/minigame/shm_pvp.js:55 pvpLaunchMatch`, `:86 pvpQueueTick` (90 sn sonra bot), `:581 initTopcuPvpStage`, `:1258 executePvpRivalTurn`, `:1373 onRemoteTopcuPvpSync`; `js/minigame.js:907 firePlayerVolley`, `:1080 updateProjectilesAndHazards`, `:1408 detonateProjectile`, `:1904 advanceTurnAfterVolley`; `js/minigame/pvp_maps/*`; `shm_ui.js` zafer/çark, `shm_data.js` dilim tabloları. Ebedi yavru önkoşulu `js/core.js:262 getEternalBabyDragon`, `:266 canEnterZindanOrTopcu` ve `js/week.js:75 feedDragon` ile ilişkilidir.

**2 — Sunucu:** `server.js:642 dungeon_coop_sync`, `:663 pvp_sync`, `:711 wheel_spin` yayınlar. `dmg/hp/enemyHp/wind/angle/power/mods/text` aktarımı fizik doğrulaması değildir; kalıcı maç veya çark hakkı yoktur.

**3 — Hesaplama:** `shm_ui.js:1546 completeSahmeranDungeonVictory`, PvP kolu `:1634` → 2 T1 + 1 T2. Ortak çark `:1646 spinSahmeranLootWheel`: ilk hak, büyük çarkın sonraki çevriminde 120 altın; küçük ara aşama çarkı aşama başına bir hak. Aynı dosyada `:1526 openStageClearBlessingModal` +150 ara aşama; zindan zaferi normal +250, diğer standart kol +500, extreme +950; kervan +180 ve +8 ün. Bunlar farklı modlardır. Çark dilimlerinin altın/malzeme/kalıp çıktısı `:1703` ve devamında, ağırlıkları `shm_data.js` içindedir; tutarlar ve ağırlıklar aynen taşınmalıdır.

**4 — Manipülasyon:** Yerel HP/hasar/zafer/çark sayısı ve `Math.random` değiştirilebilir. `forcedSliceIdx` seçilen dilimi doğrudan belirleyebilir. İstemci tarafından ilan edilen zafer, ücret ve ücretsiz hak kontrolü güvenlik sınırı değildir. Çarkın yayın mesajı ödül kanıtı olamaz.

Ek doğrulama: `js/minigame.js:1904 advanceTurnAfterVolley` PvP rakipleri bittiğinde gerçekten ortak zafer fonksiyonunu çağırır. `shm_data.js:413 getMajorWheelSlices` ve `shm_ui.js:1737` büyük çark altınını normalde **450**, extreme'de **900** hesaplar; `gold_350` eski anahtar adı ve yayın varsayılanındaki “350” güncel ödeme tutarı değildir. `shm_ui.js:1747 major_egg_1` ayrıca yerelde **gen=2**, parents=null yumurta üretir. Bu ödül, oyuncunun kendi ebeveynlerinden ürettiği soyun kanıtı sayılamaz; gelecekte gen2 hedefi/provenance testi bu yolu ayrıca kapsamalıdır.

**5 — API:** Ekonomi altyapısı harcama/kredi için uygun; PvP relay API'si sonuç doğrulamaya uygun değil. `arena.win` desteklenmez. Girişe 120 altınlık yeni bir ücret eklenmesi bu analizden çıkarılamaz.

**6 — Dosyalar:** Yukarıdaki fizik/PvP/UI/veri dosyaları, `server.js`, önerilen sunucu topçu oturum/fizik modülü, settlement ve iki store; `js/chibi.js` malzeme görünümü. Harita fizik verisi ile canvas çizimini ayırmak gerekir; yalnız final HP karşılaştırması yeterli değildir.

**7 — Test:** Önce mevcut bir haritada 1v1 gerçek atışlar; mermi/çarpışma/rüzgâr hesabı sunucuyla uyuşmalı. 2v2 ve bot düşüşü ayrı senaryo olmalı. Sahte hasar/HP, sırası olmayan atış, harita/mod değiştirme, tekrar zafer, ücretsiz hak replay, 120 altınlık ücretin yanıt kaybı, yetersiz bakiye ve zorlanmış çark indeksi denenir. Geçerli hakkı sunucu üretmeden çarkın başarılı ödeme testi yapılmaz. Aynı test ileride zindan/kervan modlarının ödüllerini birbirine karıştırmamalı.

**8 — Eksik:** Sunucu fizik/hamle otoritesi, güvenilir chibi/bebek/ekipman, kalıcı oda/seed/tur/zafer ve çark hakları. Yalnız çarkı sunucuya taşımak sahte zaferden hak üretme açığını kapatmaz. Ocak Sandığı tasarımına müdahale edilmez; burada incelenen zafer ganimeti akışıdır.

### 4.3 Ejderha yarışları

**1 — Dosyalar:** `js/race.js:32 genRaces`, `:75 raceStart`, `:181 raceStep`, `:376 raceTick`, `:563 raceAuto`, `:574 raceFinish`, `:588 raceResults`, `:641 RACE_ACT`; `js/racestory.js` özel yarış/hikâye; `js/core.js`, `js/career.js`, `js/week.js` ejderha/hafta/sonuç bağımlılıkları.

**2 — Sunucu:** Yarış başlatma, girdileri işleme, finish veya haftalık yarış listesi sunucuda yok. `makeRuntime` yarış dosyasını yüklemiyor; seed'li ekonomi runtime'ının varlığı hazır yarış simülatörü demek değildir.

**3 — Hesaplama:** Standart `genRaces` iki yarış üretir: giriş 15/40; ilk üçe 90/45/20 ve 220/110/50; birincilik ünü 1/3, ikincilikte `floor(un/2)`. `RACE_ACT.race:642` ücreti düşer. `raceResults` ödül, ün, çeviklik, yorgunluk, bağ, istatistik ve listeden silmeyi yapar. Antrenman altın vermez. `raceNemesis` ve `racestory.js` özel yarışları ayrıca korumak gerekir.

Özel durum: `js/racestory.js:58 duelRace` o haftanın büyük yarışını değiştirir; giriş **0**, ödüller **450/60**, birincilik ünü **8**, id=`duel`. Standart yarış fiyatı/ödülü bu karşılaşmaya uygulanmamalı; kalıcı tekillikte yalnız bu sabit id kullanılmamalıdır.

**4 — Manipülasyon:** `RC.myT`, rank, `race.odul`, statlar, yerel seed ve yarış listesi değiştirilebilir; `raceResults` doğrudan yeniden çağrılabilir. Ödeme ve başlangıç aynı kalıcı işlem zincirinde değildir. Yerel listeden silme ekonomik tekillik sağlamaz.

**5 — API:** Mevcut command endpoint ve transaction kullanılabilir; `race.finish` desteklenmez. Yeni yarış intent/oturum/hamle sözleşmesi önerilir. Otomatik uçuş mevcut mekaniktir ve ilk yarış alt dilimi olabilir; yeni “anında ödül” mekaniği olarak ele alınmamalıdır. Manuel uçuşun yerine geçirilmesi ürün onayı gerektirir.

**6 — Dosyalar:** `js/race.js` simülasyon/görsel ayrımı, `js/racestory.js`, ekonomi client/durum katmanı, `server/economy_commands.js`, önerilen `server/race_runtime.js`, store oturum kayıtları ve testler. `rnd/ri/Math.random`, dt ve input sırası kontrol altına alınmalı; görsel parçacık RNG'si oyun RNG'sini değiştirmemeli.

**7 — Test:** Sunucunun ürettiği yarışa gerçek UI'dan ücret ödeyerek giriş; mevcut “Otomatik uç” ile tamamlayıp sunucu sıralaması/ödülü ve yenileme kontrolü. Manuel uçuşta tuş/pointer girdileri ve sınırları; değiştirilmiş rank/finish zamanı/seed reddi, kopma, aynı yarışta yeni requestId, dolu görev/yanlış yaş/yabancı ejderha ve iki sekmede giriş yarışı. Başarı testinde yerel sonucu doğrudan yazmak yasak.

**8 — Eksik:** Sunucu haftası ve yarış üretimi, güvenilir statlar, başlangıç ücretiyle bağlı tek maç hakkı, saf deterministik çekirdek, sonuç tekilliği ve earned/Sybil kararı. `raceAuto` bile bugün birden çok yerel RNG/görsel bağımlılığı taşır; yalnız dosyayı VM'e eklemek yeterli olmaz.

### 4.4 Güzellik podyumu

**1 — Dosyalar:** `js/pageant.js:67 fullEleganceCalc`, `:123 ensurePageant`, `:189 startSarayShow`, `:416 sarayWalkHit`, `:447 sarayOrbHit`, `:460 sarayPosePick`, `:491 finishSarayShow`, `:545 PAGEANT_ACT`; `js/hub.js` sosyal görünüm, `js/net.js:260` yayın işleyici.

**2 — Sunucu:** `/api/pageant` `WORLD.pageant` üzerinde skor/oy kaydeder; hesap defterine yazmaz. Route istemci `body.handle/score` kullanır, oyuncu başına oy tekilliği kurmaz; oturum gerekliliği skorun doğru veya handle'ın oyuncuya ait olduğunu kanıtlamaz. Aktif yerel gösteriden bu route'a gönderim bağlantısı bulunmadı.

**3 — Hesaplama:** `finalScore = PG.base.total + PG.bonus`; yerel rakiplerle sıralama. Altın 240/140/80/40 × (`soy_bereketi` aktifse 2, değilse 1), ün 6/3/2/1; `gen >= 2` ise ek `gen × 18` soy telifi. `saray-vote:573` yerel ilk oy için +15 altın. Otomatik gösteri `PG.bonus = 48 + ri(6,16)` verir. `ensurePageant` oyun haftası değişince giriş/oy kaydını sıfırlar.

**4 — Manipülasyon:** Genetik/kozmetik/stat/taban skor, PG.bonus, rakipler, gen ve votedFor yereldir. HTTP rota sahte skor/başkasının handle'ı ve tekrarlı oy kabul edebilir. WORLD skoru üzerinde altın ödemek bu açıkları para basımına çevirir.

**5 — API:** Command altyapısı kullanılabilir; mevcut dünya rotası ödül kaynağı olamaz. Gösteri ödülü ve +15 oy teşviki ayrı işlemler/tekillik anahtarları olmalı. Lokal NPC merasimi ile küresel halk oylamasını aynı etkinlik saymak ürün kararıdır; otomatik varsayılmamalı.

**6 — Dosyalar:** `pageant.js`, `net.js`, gerekli `hub.js` bağları, `server.js`, önerilen `server/pageant_runtime.js`, ekonomi reducer/settlement, iki store ve E2E testleri. Soy telifi için doğrulanmış genetik üretim; çarpan için sunucu Divan durumu bağımlılığı vardır.

**7 — Test:** Gerçek UI'da yürüyüş/orküresi/poz veya mevcut otomatik gösteri; sunucunun taban skor ve bonus hesabı, sıralama, tutar/ün/telif. Aynı hafta tekrar gösteri/oy, başka hesap adına skor, negatif/sonsuz/aşırı skor, replay ve hafta sınırı denenir. Küresel yayın alan uyuşmazlığı da entegrasyon testinde yakalanır. Oy skorunu şişirmek veya aynı hedefe çok hesapla oy vermek ayrı istismar senaryosudur.

**8 — Eksik:** Oynanış-route bağlantısı, güvenilir skor girdileri, etkinlik kimliği, sunucu haftası, kalıcı katılım/oy tekilliği ve sonuç settlement. Sadece `score` üst sınırı koymak eksikleri kapatmaz.

### 4.5 Günlük/haftalık ödüller ve hedefler

**1 — Dosyalar:** `js/core.js:833 GOALS`, `js/week.js:281 checkGoals`, `js/ui.js:74 afterAction`; `js/career.js:15 careerBuild`, `:47 goalGold`, `:89 careerCheck`; `js/care.js:20 careWeekKey/careDone/careMark`; `js/hub.js:451 ensureHub` ve `weeklyUses` eylemleri. `js/orders.js:67 ordersWeek` haftalık sipariş yeniler; bunun genel giriş ödülüyle ilgisi yoktur.

**2 — Sunucu:** `goals.claim` ve her desteklenen mutasyonun sonunda `checkGoals` var. Reducer önce yerel yardımcı tarafından eklenen gold'u geri alır, sonra her hedefi `sources.credit(..., goalSource)` ile uygular. GOALS durumunu veya istemci istatistiklerini kabul etmez. Kariyer/hub/bakım resetleri ve takvim günlük ödül endpoint'i yoktur.

**3 — Hesaplama:** GOALS ödülleri sırasıyla kulucka 40, train 30, win1 50, talk 30, acq 60, fav 40, mark 60, yuva 40, aff 50, bred 80, un25 60, gen2 80, un45 100. Miktarlar değişmez. Kariyer `careerBuild` stat 50, wins 60, any 100, kupa 120, tac 200 değerlerini `careerCheck` ile yerelde verir; GOALS politikasının otomatik kapsamı değildir. Hub'da örneğin `spa-scrub-peer:1746` haftada iki kere, %60 olasılıkla 1–2 T2 taş, diğer kolda bir bölgesel cevher verir; `ensureHub` `S.week` değiştiğinde hakları sıfırlar. Bakımın bağ/moral ödülleri §4.7'dedir.

**4 — Manipülasyon:** Yerel S.week/goals/st/career/weeklyUses geri alınabilir. Sunucu GOALS aynı manipülasyonu almaz; yeni claim requestId'si önceden kazanılan hedefi yeniden ödememelidir. Kaydı veya yıldızı değiştirerek kariyer/hak yenileme, kalıcı sisteme taşınırken ayrı incelenmelidir.

**5 — API:** GOALS için mevcut `goals.claim` yeterli, yeni generic `reward.claim` gereksiz ve tehlikelidir. Başarı üreticisi sunucuda yoksa claim bunu yaratamaz. Günlük login ödülü için kullanılacak mevcut mekanik bulunmadığından bu görevde yeni mekanik önerilmiyor. Oyun haftası takvim haftasına çevrilmiyor.

**6 — Dosyalar:** `ui.js`, `week.js`, economy client ve durum adapter'ı; doğrulanmış üreticiler geldikçe `economy_commands.js` milestone kayıtları; kariyer/hub için ilgili mevcut dosyalar ve önerilen sunucu kural modülleri. `economy_sources.js` politikasını değiştirmek planın parçası değildir.

**7 — Test:** İlk bina kurulumu ile hedefin otomatik ödenmesi, sonra claim/refresh/reload ile tekrar ödenmemesi; yeni requestId ve iki sekme; 13 hedefte earned girdiye rağmen bound/unknown politikası. Haftalık hak için aynı sunucu dönemi tekrarının reddi, istemci saati/haftası değişiminin etkisizliği; kariyerde yalnız doğrulanmış ilerleme. Günlük claim için başarı testi yazmak şu an uygulanmamış mekanik üretmek olur.

**8 — Eksik:** Takvim günlük ödülü hiç yok; hafta resetleri sunucuda yok; train/win/talk/fav/aff/bred/gen2/mark gibi başarıların bir kısmının doğrulanmış üreticileri yok. Tek seferlik hedef, kariyer hedefi ve haftalık hak tek bir “ödül claim” akışı altında birleştirilmemelidir.

### 4.6 Yumurta, kuluçka ve ejderha üretimi

**1 — Dosyalar:** `js/pazar.js:290 buyEgg`, `js/ui.js:1946 egg-in/egg-out`, `:1296 hatchReveal`, `:2258 pairTask`; `js/week.js:36 makeEggs`, `:51 hatchEgg`, `:150 endWeek`; `js/core.js:102 inheritGenes`, `:124 inheritTraits`, `:344 breedChecks`, `:355 breedChance`; soy/kişilik yardımcıları. Satın alma/üreme dışında çark yumurtası üretimi `js/minigame/shm_ui.js:1747`'dedir (§4.2).

**2 — Sunucu:** `shop.egg`, `egg.incubate`, `egg.hatch`, `building.buy(kind:'kulucka')` var. Sahiplik assetId ile, kuluçka kapasitesi ve çıkış olgunluğu sunucuda kontrol edilir. `hatchEgg` sunucu VM'inde çalışır ve funding yumurtadan miras alınır; hatch/renown kaynak kayıtları korunur. `w` ilerletme, çift görev atama, yakınlık ve üreme komutları yoktur.

**3 — Hesaplama:** Kuluçka binası 160; hedef 40. Yumurta fiyatı `eggPrice`, satın alma reducer'ı tarafından belirlenir. Çıkış normalde 2 hafta, mevcut `yumurtaci` perk'iyle 1. Çıkışta parlak göz +2 ün, gölge +3, üstün potansiyel başına +1 (`hatchEgg`). Üreme ebeveyn genleri/özellikleri, yakınlık ve olasılık üzerinden 1 veya doğurganlıkla 2 yumurta üretir. Bunları bedelsiz olduğu gerekçesiyle kaynaksız earned saymak doğru değildir.

**4 — Manipülasyon:** Yerel w, ebeveyn stat/soy/traits/task/aff, RNG ve boş slot değiştirilebilir. Sunucudaki hatch bu yerel değişiklikleri görmez. Ödünç earned ebeveyn/ürünle tek seferlik hedef farming geçmiş riskidir; Paket 2 bound politikası aynen kalır.

**5 — API:** Satın alma/incubate/hatch yeniden kullanılabilir; başlangıç yumurtasını hazır hale getiren bir API bugün yok. Yeni doğrulanmış görev/hafta/üreme komutları önerilir; istemci `w`, genes veya sonuç yumurtası göndermemeli. `milestoneSources.gen2` hatch anında eldeki gen2 varlıktan türetilmemeli; bu hesabın doğrulanmış üretim zinciriyle ilişkilendirilmeli.

**6 — Dosyalar:** `core.js`, `week.js`, `ui.js`, `pazar.js`, economy client, `economy_commands.js`; hafta ayrıştırması için `star.js`, `bond.js`, `social.js`, `rival.js`, `content.js`, `career.js`, `orders.js`, `season.js` bağımlılık incelemesi; önerilen server hafta/üreme kural modülleri ve iki store testleri. Sadece VM expose'a `endWeek` eklemek yeterli değildir.

**7 — Test:** UI'da bina kur → yumurta yerleştir → gerçek sunucu hafta ilerlemesi → kabuğu arala → reload. İki slot dolu, in kapasitesi yok, yanlış hesap, ticarette kilitli yumurta, aynı anda çıkış/takas, ikinci hatch isteği, perk eşiği; iki uygun ebeveynle gerçek görev ve hafta, uygunsuz yaş/cinsiyet/yakınlık, ebeveyn satışı ve genetik RNG tekrarı. Fixture ile olgunlaştırılmış yumurta yalnız bileşen testi sayılır.

**8 — Eksik:** Güvenilir hafta/upkeep/yaş/ölüm/durum makinesi, ebeveyn görevi ve kaynak mirası, üretim tekilliği, gen2/mark/bred/aff üreticileri; takasla id remap edilen soy bağlantılarının doğrulanması. Server başlangıç yumurtasının çıkışını UI'da “çalışıyor” göstermek bu eksikleri gizlememeli.

### 4.7 Yemek ve bakım

**1 — Dosyalar:** `js/pazar.js:296 buyFood`; `js/ui.js:1940 feed`; `js/week.js:76 feedDragon`, `:150 endWeek`; `js/care.js:19–22` hafta anahtarı, `:175 washDone`, `:184 careFeed`, `:230 careThrow`; hub kaplıca/sofra eylemleri.

**2 — Sunucu:** `shop.food` miktar/fiyat/kiler koşulunu kontrol edip `sources.addFood` ile funding kovasını artırır. Besleme, yıkama, top oyunu ve upkeep komutları yoktur. Yemek miktarının sunucuda olması tüketimin sunucuda olduğu anlamına gelmez.

**3 — Hesaplama:** Yem fiyatları `js/data.js:55 FOODS` (ör. balık 12, biber 18, ziyafet 55, gençlik 140). `feedDragon` bir yem tüketir; normal +1 moral/+3 bağ; favori +2/+8 ve ilk keşif istatistiği; ziyafet +2/+5 ve -20 yorgunluk. Gençlik yalnız yavruya, bir kez; +2 moral/+10 bağ ve ebedi yavru bayrağı. Tok ejderhaya care ekranından ikinci lokma hâlâ bir yem tüketir, ödül vermez; düz `feedDragon` tokken dönüyor. Bu iki davranış aynen ayrıştırılmalı. `washDone` haftada bir +1 moral/+2 bağ; `careThrow` üç atıştaki isabet sayısı + tam seri bonusu kadar bağ, -5 yorgunluk, 3/3 ise +1 moral. `endWeek:234` upkeep ejderha başına 10, obur 15, kilerle toplamın %75'e yuvarlanmasıdır.

**4 — Manipülasyon:** food/fed/care/week/play isabetleri yereldir; ödül ve tüketim atlanabilir. Gelecekte yalnız yem toplamını azaltıp foodSources'u azaltmamak kova tutarsızlığı veya kaynağın aklanması doğurur. Bakımın bağ/stat etkileri savaşçı gücüne ve satış değerine dolaylı etki eder.

**5 — API:** Alım için mevcut komut; tüketim için önerilen `dragon.feed {assetId, foodKey, ...gerekirse mevcut lokma türü}`. Kaynak kovasından tüketim ve ejderha değişimi aynı transaction olmalı; consumeFood yardımcı önerisi sadece mevcut spend sırasını uygular, yeni kaynak politikası koymaz. Bakımda ham isabet/başarı sayısı sunucu sonucu olarak kabul edilmez.

**6 — Dosyalar:** `pazar.js`, `week.js`, `care.js`, `ui.js`, `hub.js`, `economy_commands.js`, önerilen tüketim/bakım server yardımcıları, iki backend ve rezervasyon regresyonları. Favori keşfi gibi yeni üretici kendi girdi kaydını yazmalı; GOALS politikası sabit kalmalı.

**7 — Test:** UI'dan yem al → sürükle/dokun → sunucuda bir tüketim ve tek etki → yenile. Aynı istek/replay/yeni requestId, iki sekme, tok lokma, favori keşfi, kiler kilidi, yetişkine gençlik ve iki kez iksir, rezerve yem/ejderha. Yıkama ve top oyunu başarı testleri pointer/tuşlarla oynanmalı; sahte tamamlandı mesajı ayrıca olumsuz testtir.

**8 — Eksik ve kritik bağımlılık:** Haftalık reset ve bakım doğrulaması yok. `endWeek` bakiyeyi negatife indirebilir, 3 borç haftasında iflas eder; ENG-05 kaynak kovaları ise negatif bakiye kabul etmez. Upkeep'i doğrudan `sources.spend` ile değiştirmek yetersiz bakiyede haftayı durdurup mevcut oyun davranışını değiştirir. Negatif borcu ayrı temsil etme veya ürün davranışı kararı **onay blocker'ıdır**; bu planda miktar/iflas kuralı değiştirilmez.

### 4.8 Yükseltme ve harcamalar

**1 — Dosyalar:** `js/ui.js:1876 build`, `:1877 clear`, `:1878 demolish`, ekipman takma/çıkarma; `js/pazar.js:281 PAZAR_ACT`; `js/chibi.js:378 getChibiEnhancementSpec`, `:434 getChibiItemCraftRecipe`, `:498 getChibiRepairCost`, `:1208 orsStrike`, `:1228 orsResolve`, `:1961 ch-smith-up`, onarım/aktarım/döküm/sentez/dönüşüm eylemleri.

**2 — Sunucu:** `building.buy`, `land.clear`, dört `shop.*`, `item.sell`, `dragon.sell`, `chibi.craft`, `chibi.repair`, `stone.synthesize`, `ore.convert`, `chibi.transfer` vardır. UI bunları kullanmaz. `chibi.transfer` bir ekipmanın yükseltme seviyesini diğerine taşır; oyuncular arası takas değildir. **Gerçek `+` basma/Örs başarı zarı, equip/unequip ve bina yıkımı komutları yoktur.**

**3 — Hesaplama:** Tarifler/fiyatlar yukarıdaki fonksiyonlarda; `ch-smith-up:1990` altın/taşı ritüelin başında tüketir; `orsStrike` zamanlama bonusu +5/+2, `orsResolve` başarı oranını/zarı, güvenli kademe/Anka koruma/seviye düşüşü/yanmayı yerelde uygular. Sunucu craft/repair aynı tarif yardımcılarını kullanır. Sentez 5 taş + 50/200/500 altın; cevher dönüşümü 5→1 +150; aktarım 3 T2 +500. İnşa `BUILD.fiyat`, arazi `clearCost`, satım `sellBack` veya `round(value(dragon)*0.6)`; yıkım yerelde bina bedelinin yarısını verir.

**4 — Manipülasyon:** Yerel tarif/malzeme/bonus/başarı zarı bypass edilebilir. Craft komutunun varlığı yükseltmeyi güvenli yapmaz. İstatistiği yerelden ithal edilmiş ejderhayı sunucu `value` ile satmak da güvenilir değer üretmez. Şu an sunucu bu ithalatı kabul etmez; korunmalıdır. Chibi malzemeleri için genel provenance kovası yok, oyuncular arası takasa açılması bu planın dışında.

**5 — API:** Yukarıdaki deterministik harcamaların çoğu mevcut endpoint ile bağlanabilir. Örs için önerilen başlangıç/hamle/sonuç sözleşmesi gerekir; başarı zarı sunucuda, ücret ve son durum tekrar korumalı olmalı. Yerel ritual kapanınca ücret kaybı/sonuç kurtarma davranışı mevcut mekanikle uyumlu biçimde kararlaştırılmalı. Eksik demolition/equip için yeni komut yalnız öneri.

**6 — Dosyalar:** `ui.js`, `pazar.js`, `chibi.js`, economy client/durum adapter'ı; gerektiğinde `economy_commands.js`, önerilen ritual runtime ve iki store. Harcama ekranı sunucu envanteri ve fiyatını okumalı. Bedesten/takas ekranlarının tasarımı değiştirilmez; yalnız mevcut hesap durumuyla tutarlılık testi yapılır.

**7 — Test:** UI'dan gerçek craft/repair/sentez/dönüşüm/aktarım; fiyat/malzeme koşulları, double click, yanıt kaybı, aynı versiyonla iki harcama, rezerve kaynaklar. Örs için gerçek zamanlama girdisi, başarı/koruma/düşüş/yanma, yeniden yükleme ve işlemi terk etme; client `success/rate/cost/source` alanları reddedilir. Sunucuda olmayan malzeme yerel envanterden tamamlanamaz.

**8 — Eksik:** Ekran bağları, güvenli profil sınırı, gerçek enhancement komutu, kalıcı ritüel, doğrulanmış malzeme üreticileri ve yükleme sonrası sonuç kurtarma. Yerel + seviyeyi yalnız `chibi` snapshot'ıyla göndermek entegrasyon değildir.

## 5. Riskler, bağımlılıklar ve öncelik sırası

Puanlar 1–5: risk/karmaşıklık/bağımlılıkta 5 yüksek; olgunluk/değerde 5 yüksek. Risk, **mevcut yerel durum kalıcı ekonomiye yanlış bağlanırsa** oluşacak istismar etkisini de içerir. Bugün tüm bu yerel açıkların sunucu altını bastığı iddia edilmiyor. Sıralama yalnız riskin büyüklüğüne değil güvenle teslim edilebilirliğe göre yapılmıştır.

| Sıra / dilim | Risk | Kod olgunluğu | Bağımlılık | Karmaşıklık | Oyuncu değeri | Gerekçe |
|---|---:|---:|---:|---:|---:|---|
| 1. Mevcut inşa/harcama + GOALS | 3 | 5 | 1 | 2 | 3 | Sunucu fiyatı/receipt/kaynak hazır; ilk uçtan uca kalıcılık |
| 2. Yem alımı/tüketimi; bakımın ilk parçası | 4 | 4 | 2 | 3 | 4 | Stok ve oyuncu etkisini birlikte sunucuya taşır; haftalık tekrar daha sonra |
| 3. Hafta + kuluçka; haftalık haklar | 4 | 3 | 5 | 5 | 5 | Üreme/yarış/bakımın açılmasını sağlar; borç ve yan etkiler blocker |
| 4. Gerçek düello | 5 | 4 | 4 | 4 | 5 | Sunucu tur motoru avantaj; fighter/ödül/kalıcılık ve Sybil eksik |
| 5. Yarış (önce mevcut otomatik yol) | 5 | 3 | 4 | 4 | 4 | Tek hesap simülasyonu; hafta ve saf motor gerekir |
| 6. Üreme + soy kaynakları | 5 | 3 | 5 | 4 | 5 | Hafta, besleme, yakınlık, yaş ve üretim zinciri gerekir |
| 7. Podyum + haftalık oy | 4 | 3 | 5 | 4 | 3 | Soy/kozmetik/çarpan ve güvenilir dönem gerekli |
| 8. Topçu + ganimet; gerçek Örs yükseltmesi | 5 | 3 | 5 | 5 | 5 | Fizik/ekipman/haklar ve sonuç tekilliği en geniş dönüşüm |
| Ayrı: takvim günlük giriş ödülü | — | 0 | — | — | — | Mevcut mekanik yok; uygulama planına eklenmez |

**Ortak kritik riskler:**

- Sadece `S.gold`'u snapshot ile güncelleyip yerel dragon/food/grid/week'i bırakmak iki farklı hesap durumu yaratır. Tersi, tüm `S = snapshot.game` yapmak yerel ilerlemeyi sessizce silebilir. Geçiş açık bir sunucu oyun bağlamı ve yerel kayıttan ayrım gerektirir.
- `afterAction` yerel GOALS yanında kariyer ödülü de verebilir. Sunucu başarısı sonrası bu fonksiyonu olduğu gibi çalıştırmak ikinci ödeme veya sahte başarı bildirimi yaratır.
- Genel ekonomi client pending isteği yenilemede kaybeder ve account'a bağlamaz. Hesap değişiminde eski response/retry yeni hesaba uygulanmamalı; aynı accountId + exact payload korunmalı. Trade client'ın bu korumaya sahip olması genel client'a otomatik taşınmaz.
- `requestId` tekilliği ile **oyun olayı tekilliği** farklıdır. Aynı maç/hafta/çark hakkı yeni requestId ile de yalnız bir kez sonuçlanmalı. Başarıyı yayınlamak commit'ten sonra olmalı; WS kaçırılırsa GET/receipt üzerinden geri alınmalı.
- Takas kilidi, maç kilidi ve haftalık görev aynı varlığı kullanabilir. Transaction öncesi kontrol edip sonra dışarıda ödül yazmak yarış koşulunu çözmez. Özellikle maç boyunca satılan/aktarılan ejderha ve kalıcı maç kapanışı aynı yetki zincirinde korunmalı.
- Çok instance'ta ekonomi Firestore üzerinde ortak olabilirken düello Map'leri ortak değildir. Kalıcı settlement, aktif oda routing/lease/recovery sorununu tek başına çözmez.
- `endWeek` `window.__grew`, yıldız/bond/ölüm, sosyal/rival, dilek/event, kariyer/sipariş, sezon bitişi ve pazar yenileme yan etkilerine bağlıdır. Sadece `week++/egg.w++` taşıyarak kalan mekanikleri sessizce atlamak mevcut davranışı değiştirir.
- ENG06-03 proxy/IP/misafir politikası ve eski ENG06_DELIVERY'deki read/presence/WS limitleri ayrı çalışma bağımlılığıdır. Bu rapor onların güncel çalışma alanını denetlemedi veya tamamlandığını varsaymadı. Üretim IAM/indeks/legacy mutabakatı da ayrıca doğrulanmalı.

## 6. İlk en küçük güvenli dikey dilim: P-A

### 6.1 Oyuncu akışı

Onaylanmış sunucu oyun bağlamında mevcut Ocak/inşa görünümü açılır; sunucu snapshot'ındaki boş kare seçilir; **Yuva Bahçesi kur** düğmesi kullanılır. Yerel kayıt bu profile kopyalanmaz. Oturumda henüz oyun yoksa mevcut `game.start` bir kez çalışır; yoksa `GET /api/economy` ile sürdürülür.

```text
Boş tile + Yuva Bahçesi seçimi
  → economyClient.command('building.buy', {kind:'yuva', tile})
  → oturum accountId + requestId + expectedVersion
  → sunucuda açık/boş tile, tek bina, ün, fiyat kontrolü
  → spend(220), tile.b='yuva', tile.funding=paidSource()
  → checkGoals → 'yuva' 40 → credit(goalSource) [bound/unknown]
  → reservation kontrolü + bina/bakiye/goals/receipt atomik commit
  → sonucu ekranda göster; GET/reload ile doğrula
```

**Somut doğrulama:** Taze hesapta 420 bound −220 bound +40 bound = **240 bound**, earned=0, unknown=0. Bu sonuç inceleme sırasında mevcut reducer ile bellekte doğrulandı. Sonraki `goals.claim` ödül vermez; aynı bina yeniden kurulamaz. Başlangıç aşamasında sunucuda olmayan hafta/üreme akışlarını açmak bu dilimin başarısı için gerekli değildir.

### 6.2 Sınır ve etkilenecek dosyalar

- `js/economy_client.js`: account'a bağlı istek/response, belirsiz isteği yenilemede kurtarma, `X-Trade-Account`, eski snapshot reddi; 409 otomatik satın alma tekrarı yapmaz.
- Önerilen yeni `js/gameplay_economy.js`: otorite/durum adapter'ı; server snapshot'ı salt görüntüleme kaynağı, desteklenen intent'ler ve açık desteklenmeyen akış kontrolü. Yerel oyun kaydı için var olan `saveGame` korunur; sunucu profili bu kayıt/import/reset yoluyla doldurulamaz.
- `js/ui.js`: mevcut tile/inşa eylemi ve hedef bildirimi server bağlamında adapter'a gider. `afterAction` yerine ekonomik yan etkisi olmayan render/notification yolu; maliyet/ödül optimistic olarak `S`'ye yazılmaz. Sunucu bağlamında diğer yerel mutasyon yolları, özellikle demolish/endWeek/yerel GOALS kapalı veya açıkça ayrı yerel profile yönlendirilmiş olmalıdır.
- `js/net.js`: tek kimlik/bootstrap ve account geçişinde adapter temizliği. Sunucu profilinden hesap/varlık referansı; yerel profili sessizce üzerine yazma yok.
- `index.html`: adapter script sırası; yalnız mevcut ekran bağlantısı için gerekiyorsa.
- Testler: `tests/economy_client.test.js`, `tests/economy_commands.test.js`, `tests/eng06_economy_acceptance.test.js`, `tests/firestore_store.integration.js`; önerilen `tests/gameplay_economy.e2e.js` + ayrı Playwright config veya mevcut config'in bilinçli kapsam genişletmesi.
- `server/economy_commands.js`, iki store, `economy_sources.js`, trade/market servisleri P-A için **beklenen üretim değişikliği değildir**; mevcut davranış yeniden kullanılır. Bir eksik bulunursa paket genişletilmeden raporlanır.

İlk sürümün sunucu profili yalnız bu küçük doğrulanmış akışı açması önerilir. Tüm mevcut oyunu server snapshot ile çalışıyormuş gibi göstermek güvenli değildir. Bu profil/görünüm tercihi §9'da onaya tabidir; Ocak Sandığı/Bedesten yeniden tasarımı gerektirmez.

### 6.3 P-A kabul kriterleri ve testleri

1. Gerçek UI tıklaması tam bir `building.buy` üretir; request yalnız mevcut şekildedir. Seçilen tile server grid'indedir. Yeni API/şema/ödül tablosu yoktur.
2. Başarılı işlem sonunda bina, `goals:['yuva']` ve 240 bound birlikte görülür; refresh, sayfa yeniden yükleme ve sunucu restart'ında korunur. İstemci 40'ı yeniden eklemez.
3. Yanıt, sunucuda commit olduktan sonra düşürülür; “başarılı” gösterilmeden aynı requestId ile sonuç kurtarılır. Yenileme sonrası da aynı account ve payload ile tek ödeme; yeni hesapta eski pending gönderilmez.
4. Double click/iki sekme/aynı expectedVersion yarışında tek harcama; stale response yeni snapshot'ın üzerine yazamaz. Dolu/kapalı/geçersiz tile, yetersiz bakiye ve sahte price/source/reward reddedilir; hata hiçbir kısmı değiştirmez.
5. Yerel `S.gold`, `S.grid`, localStorage veya import manipülasyonu sunucu binasını/bakiyesini değiştiremez. Bound ödül takasa konamaz. Earned ödünç finansman kullanılsa bile tek seferlik hedef bound kalır; unknown girdi unknown kalır.
6. Mevcut yerel kayıt bozulmaz; sunucu context'te yerel demolish/endWeek/career/checkGoals yolu ekonomik etki üretemez. Desteklenmeyen eylem istemci fallback'iyle “başarılı” olamaz.
7. SQLite + Firestore emulator paritesi, desktop + 390×844 UI, reload/bağlantı kesilmesi; mevcut 58 test ve takas regresyonu geçer. Bu kriterler sağlanmadan P-A tamamlandı sayılmaz.

P-A tekrarlanabilir earned kazanç sağlamaz. “İlk dilim mutlaka savaş kazanarak earned üretmeli” talebi gelirse bu P-A'nın küçük bir uzantısı değildir; P-D'nin güvenilir girdi/settlement/istismar kararları gerekir.

## 7. Sonraki önerilen uygulama paketleri

Her paket ayrıca onaylanmalı; aşağıdaki liste uygulama yetkisi değildir. Yeni API adları taslak intent adlarıdır, mevcut endpoint'ler olarak sunulmamaktadır. Paketler miktarları/olasılıkları aynen korur. `economy_sources.js` üzerinde kaynak politikası değişikliği kapsam dışıdır.

| Paket | İçerik / dosyalar | Bağımlılık | Kabul kriteri | Gerçek test planı |
|---|---|---|---|---|
| **P-B — Mevcut harcamalar + ilk besleme** | `pazar.js`, `ui.js`, `chibi.js` mevcut komut bağları; `week.js/care.js` beslemenin saf kural ayrımı; `economy_commands.js` için yeni feed intent; yeni tüketim yardımcıları ve client adapter | P-A durum sınırı; tok lokma ve girdi provenance sözleşmesi | Alım+tüketim ayrı doğrulanmış eylem, tüketimde foodSources toplamı korunur; stat/bağ ve milestone aynı transaction; rezerve yem/ejderha korunur; craft/repair gerçek + basma diye sunulmaz | UI'da biber al/besle/favori keşfet; tok lokma ve iksir sınırları; receipt/reload, takas yarışı; iki backend. Haftalık tekrar P-C olmadan tamamlandı sayılmaz |
| **P-C — Hafta, görev, kuluçka, dönem hakları** | `week.js/core.js/ui.js`; `star/bond/social/rival/content/career/orders/season` bağımlılıklarının saf kurallara ayrılması; önerilen `server/week_runtime.js`; `economy_commands.js`; gerekiyorsa iki store şeması | Borç/negatif bakiye ve sezon/reset kararı; P-B; hafta yan etkileri tam envanteri | Her sunucu dönemi bir kez kapanır; ücret/yaş/ölüm/tasks/pazar/egg.w aynı işlem; istemci week/w reddi; kuluçka→hatch erişilebilir; sosyal/kariyer/olay yan etkileri atlanmaz | UI görev ata→hafta bitir→rapor→hatch; aynı hafta farklı requestId, iki sekme, kopma; 1/2 hafta perk, kapasite, borç 1/2/3 ve sezon sınırı; DB rollback ve emulator retry |
| **P-D — Gerçek düello otoritesi + kalıcı settlement** | `duel_server.js/duel_engine.js/dragon_duel.js/net.js/core.js`, `server.js`, önerilen `server/gameplay_settlement.js`; store maç/receipt/lock desteği | Güvenilir server fighter; dünya/Divan/ekipman etkilerinin otoritesi; provenance, forfeit ve Sybil kararı; çok instance stratejisi | Sonucu yalnız sunucu maçı üretir; maç/account için yeni requestId de tek ödeme; tüm mevcut altın/ün/taş/bağ/yorgunluk yan etkileri korunur; published success yalnız commit sonrası; kaynak politikası değiştirilmez | İki tarayıcı gerçek maç, beraberlik/yenilgi/forfeit, kopma/restart/instance değişimi; sahte fighter ve ödül, transfer yarışı; çok hesaplı anlaşmalı kayıp/teselli farming testi |
| **P-E — Yarış** | `race.js/racestory.js`, önerilen `server/race_runtime.js`, command/oturum/adapter ve testler | P-C; saf RNG/fixed-step kararı; P-D'deki settlement ilkeleri (PvP motoruna bağımlı değil) | Önce mevcut otomatik uçuşun sunucu eşdeğeri; ücret/tek yarış hakkı ve ödül bağlı; manuel mod ayrıca doğrulanır; yarış id'si sezon/dönemle çakışmaz; yan kazanımlar korunur | Standart iki yarış, antrenman, özel nemesis; gerçek UI “otomatik uç”; manuel input replay; hileli rank/time, çift giriş, ağ kaybı ve deterministik tekrar |
| **P-F — Üreme + bakım/haftalık/kariyer tamamlayıcıları + podyum** | `core/week/care/hub/career/pageant/net/ui`; önerilen breeding/pageant/bakım server modülleri; command, store ve testler | P-B/P-C; güvenilir genetik/kozmetik/Divan; bakım zamanlama sözleşmesi; kariyer kaynak kararı | F1: ebeveyn kaynağı/tek üretim/gen2/mark kanıtı; F2: mevcut bakım/hub/kariyer hakları yalnız kendi dönem/üreticisiyle; F3: gösteri ve oy ayrı tekillik, telif gerçek soy üzerinden. Her alt paket ayrı kabul edilir | Gerçek çift görev→yumurta→hatch; yıkama/3 atış; hub tekrar sınırı; kariyer koşulu; podyum manuel/auto ve oy. Sahte gen, reset, yabancı handle, skor ve çoklu claim; iki backend |
| **P-G — Topçu ve Örs otoritesi** | `minigame.js`, `shm_pvp/ui/data`, haritalar; `chibi.js`; önerilen server fizik/ritüel modülleri, settlement, store ve testler | P-C; yavru/ekipman/malzeme otoritesi; maç/hak kalıcılığı; RNG/input zamanlama kararı | G1: tek mevcut haritada gerçek atış/sonuç; G2: doğrulanmış zafer hakkıyla mevcut çark, ek çevrim 120; G3: Örs maliyet/bonus/zar/sonuç kalıcı. Diğer modları tamamlanmış gibi göstermeme | 1v1→2v2→bot; hasar/HP spoof, yeniden bağlanma; çark forced index ve çift ücretsiz hak; Örs başarı/yanma/Anka ve yarım ritüel. Diğer mevcut raid/kervan çıktıları ayrı parite |

**Sıralama yorumu:** P-D, P-C'den önce yalnız başlangıç sunucu ejderhalarıyla teknik olarak prototiplenebilir; ancak eksik buff/ekipman/ödül kaynaklarını sessizce dışarıda bırakan bir ekonomik yayın yapılamaz. İlk tekrarlanabilir earned paketi için P-D önerilir çünkü tur çözümü zaten sunucudadır. P-E otomatik yarış alternatifi PvP işbirliğini azaltır fakat hafta ve yarış çekirdeği bağımlılığını ekler. Seçim Proje Merkezi'ne aittir.

### 7.1 Yeni API/veri için yalnız tasarım önerileri

- Mevcut `/api/economy/command` dar intent taşıyabilir: feed, görev atama, hafta kapatma; isimleri onay sonrası kesinleşir. `gold`, `reward`, `success`, `funding`, bütün `S` veya son statlar kabul edilmez.
- Etkileşimli maç/yarış/ritüel için sunucunun verdiği eventId, accountId üyeliği, assetId'ler, sunucu dönem ve kural sürümü, başlangıç snapshot/seed'i, hamle sırası, terminal durum ve settlement anahtarı gerekir. Bunların SQLite/Firestore yerleşimi henüz uygulanmamıştır.
- Event tekilliği için örnek mantıksal anahtar: `(eventId, accountId, rewardKind)`. `requestId` bunun yerine geçmez. Maç tamamlama ile ekonomik kredi arasında crash penceresi bırakılmamalı; aynı transaction veya kalıcı pending/outbox + idempotent settle tasarımı değerlendirilmelidir.
- Başlangıçta rezervasyona alınan varlık maç bitene kadar satılamamalı/takas edilememeli veya onaylı alternatif snapshot politikasına tabi olmalıdır. Aktif maç kilidi mevcut trade lock'un anlamını sessizce değiştirmemeli.
- Dönem anahtarı yalnız `S.week` olamaz: sezonlarda tekrar 1'e dönen hafta için sunucu season/cycle kimliği gerekir. Takvim günü ödülü bu tasarıma yeni mekanik olarak eklenmez.
- Bedesten ve Ocak Sandığı için yeni API/ürün tasarımı önerilmez. Takas API'si yalnız kazanılan şeyin devredilebilirliğini ve rezervasyon regresyonunu doğrulamak için kullanılır.

## 8. Test altyapısı, kanıt ve çalışma sınırı

### 8.1 Bu analizde gerçekten yapılanlar

| Kontrol | Sonuç |
|---|---|
| HEAD ve dal | Taban tam SHA doğrulandı; `codex/eng06-04-plan` ayrı worktree |
| Aktif dosya/çağrı incelemesi | Yukarıdaki 8 sistem ve client→route→reducer→store zinciri okundu |
| `node --version` | `v24.13.0` |
| `npm test` | **58 geçti, 0 başarısız, 0 atlandı**; mevcut SQLite/birim/HTTP-WS testleri |
| P-A reducer deneyi | Bellekte fresh `game.start` + `building.buy yuva`: 420→240, payment.bound=220, goals=[yuva:40:bound], tile.funding=bound |
| Firestore emulator | Bu görevde koşulmadı; taban teslim belgesindeki 8/8 sonucu bu görevin kanıtı sayılmadı |
| Browser/gerçek cihaz oynanışı | Bu görevde koşulmadı; aşağıdaki testler gelecek paketler içindir |
| Üretim kodu/test dosyası/konfigürasyon değişimi | Yok; tek teslim plan belgesi |

Mevcut `tests/duel_server.test.js` oda/hamle simülasyonunu doğrular; gerçek browser oynanışı veya ekonomik settlement testi değildir. `tests/eng06_economy_acceptance.test.js:36` sahte arena/duel/race/pageant/reward/week komutlarını reddeder; gerçek zaferden ödeme olduğunu kanıtlamaz. `tests/economy_commands.test.js` olgun yumurtayı güvenilir fixture ile kurar. `tests/helpers/earned_fixture.js` ile earned tohumlamak takas testi içindir, gerçek earned üreticisi değildir.

### 8.2 Gelecek paketlerde ortak test düzeni

1. **İzole yerel sunucu:** `tests/trade_ui.e2e.js` desenini kullan: geçici DATA_DIR/LOCAL_ECONOMY_DIR, `NODE_ENV=test`, localhost rastgele port, SQLite. Asıl oyun/Claude/QA verisi ve üretim kimlik bilgisi kullanılmaz.
2. **Gerçek UI:** Desktop 1280×800 ve mobil 390×844 bağımsız browser context'leri, guest cookie'leri ayrı; gerçek düğme/pointer/tuşlar. P-A sıfırdan doğal başlangıçla yürür. Geç mekanikler için trusted server fixture yalnız başlangıç önkoşulunu hazırlar; sonuç/ödül yine gerçek eylemden gelmelidir ve fixture kullanımı raporda belirtilir.
3. **Üçlü kanıt:** Görünüm/screenshot + HTTP/WS komut/sonuç kaydı + sunucu GET/DB receipt/version/source kontrolü. Token/cookie loglanmaz. Başarılı label tek başına kanıt değildir. `page.evaluate` ile `S.gold`, winner, rank veya completion callback'i ayarlamak başarı testi sayılmaz; yalnız saldırı testi olabilir.
4. **Hata matrisi:** Ağ yanıtı commit sonrası kaybı, 409 version, 401/iptal hesap, 5xx, double click, yeni requestId ile aynı olay, hesap değişimi, iki sekme, process restart, rezerve asset ve paralel takas; her başarısız işlemde tüm ilgili durumun değişmediğini doğrula.
5. **Firestore paritesi:** Yerel emulator + `demo-ejder-ocagi`, açık `FIRESTORE_EMULATOR_HOST`, database `economy`; `npm run test:firestore`. İki Node instance aynı emülatöre bağlanır; yarış koşulları, transaction retry ve kopma testleri çalışır. Üretim credentials veya gerçek Firestore kullanılmaz.
6. **Çalıştırma kapsamı:** `npm test`; emulator için mevcut `firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"`; UI için mevcut `npm run test:trade-ui` yalnız `trade_ui.e2e.js` çalıştırır. Yeni oynanış E2E'si için önerilen ayrı config/komut açıkça eklenmeli; dosya adını ekleyip trade-only config altında çalıştığını varsayma.
7. **Gerçek cihaz kabulü:** Dokunma gerektiren besleme, podyum, yarış ve topçu için Android ve iPhone/Safari'de input, arka plan, ağ değişimi ve reload. Edge mobil viewport gerçek cihaz kanıtı değildir. Sonuç/cihaz/sürüm paketin tesliminde kaydedilir.
8. **Sınır regresyonu:** ENG-05 starter/unknown/earned testleri ve Paket 1–2 hedef testleri aynen geçmeli; yeni ödül testi eski test beklentisini earned olacak şekilde değiştirmemeli. P-A için ekstra earned fixture gerekmez. Toplam kova eşitliği, replay'de altın/malzeme artmaması ve bound teklifin reddi her pakette korunmalı.

## 9. Kullanıcı / Proje Merkezi onayı gerektiren kararlar

Bu kararlar çözülmeden ilgili uygulama başlatılmamalı; bu salt okunur analiz için ek onay istenmemiştir.

| Karar | Öneri | Etkilediği paket |
|---|---|---|
| İlk teslim dilimi | P-A Yuva Bahçesi + mevcut 40 bound GOALS ödülü | P-A |
| Yerel/sunucu oyun geçişi | Mevcut yerel kaydı koru; açık sunucu oyun bağlamı, yalnız desteklenen eylemler. Snapshot ithalatı/migrasyonu ayrı tasarım; bu pakette yok | Tümü |
| Yeni API/şema | §7.1 dar intent ve kalıcı event/receipt/lock tasarımını paket bazında değerlendirme | P-B ve sonrası |
| Negatif upkeep/iflas | ENG-05'i bozmadan borcun ayrı temsili veya davranış kararı; mevcut tutar ve üç hafta kuralını kendiliğinden değiştirme | P-C, dolaylı diğerleri |
| Hafta/sezon ve reset | Oyun haftası olarak kalması, sezonlar arası tekillik; daily login icat edilmemesi | P-C/F |
| İlk tekrarlanabilir ekonomik oynanış | P-D gerçek düello; alternatif P-E mevcut otomatik yarış. Kazanımın kaynak mirası, starter etkisi ve Sybil uygunluğu ayrıca onaylanmalı | P-D/E/G |
| Forfeit/beraberlik/yenilgi ve tekrar sınırı | Var olan 85 taban/35/20 miktarlarını değiştirme; hangi tamamlanmış olayın hangi kaynaktan hak doğurduğunu, hesap/rakip tekrar ve kopma politikasını onaylat | P-D |
| Mevcut buff/Divan/dünya/soy etkileri | Sunucuda doğrulanmış eşdeğeri olmadan istemci çarpanını kabul etme veya sessizce kaldırma | P-D/E/F/G |
| Üretim ve kariyer provenance | Ebeveyn/girdi kaynak mirası ve hesabın kendi üretim kanıtı; 13 GOALS için mevcut bound/unknown politikası sabit | P-B/C/F |
| Manuel mini oyun doğrulaması | Girdi sırası/zaman toleransı, otomatik modun kapsamı, bot/insan ayrımı; oynanışın yerine yeni mekanik koymama | P-E/F/G |
| Maç kaybı/çok instance/kurtarma | Kalıcı settlement ve oda sahipliği stratejisi; WS iptal ve TTL davranışı | P-D/G |
| Yerel geçmişin taşınması | Otomatik earned aktarım yok; ayrı mutabakat/migrasyon onayı olmadan içe aktarma yok | Tümü |

Bu belge hazırlanarak görev tamamlanır. **Uygulamaya geçilmeyecek; Proje Merkezi'nin değerlendirmesi beklenecek.**
