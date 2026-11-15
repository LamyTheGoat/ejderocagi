# MULTIPLAYER_MIGRATION_ROADMAP · Kademeli geçiş planı (öneri, onay bekliyor)

02 Engineering (Claude) · 2026-11-09 · **Aşama 3: yalnız plan. Hiçbir faz başlamadı.** Her faz ayrı onay, ayrı dal, ayrı worktree ister. `main`'e merge/push/deploy yoktur.
Bulgular: `MULTIPLAYER_SYSTEM_INVENTORY.md` (B-xx). Hedef: `MULTIPLAYER_ARCHITECTURE.md`. Testler: `MULTIPLAYER_TEST_MATRIX.md` (T-xxx).

## 0. Bağımlılık sırası

```
F0 Taban ve kararlar ─┬─> F1 Güvenlik ağı ──┬─> F2 Dünya durumu depoya ──> F3 Gerçek zamanlı katman
                      │                     │                                   │
                      │                     └─> F4 Kimlik/protokol ─────────────┤
                      │                                                         v
                      └───────────────────────────────────────────> F5 Defter yakınsaması (sistem sistem)
                                                                                │
                                              F6 Yönetim/kurtarma/gözlem (F1'den itibaren paralel başlayabilir)
                                                                                v
                                                              F7 Genişletilebilirlik iskeleleri (isteğe bağlı)
```
F1 ve F6'nın ilk yarısı bağımsızdır. F2, F3'ün önkoşuludur. F4, F5'in önkoşuludur (kimlik ve sürümleme oturmadan sistem taşımak pahalıdır). F5 uzun ve paralel alt dilimlere bölünür.

## F0 · Taban, doğrulama ve kararlar (kod yok)

| | |
|---|---|
| **Kapsam** | (1) Tek bir "gerçek taban dal" belirle: `claude/eng13-gold-sync` zinciri; yerel `main` (`360f860`) ve `origin/main` (`17fb90a`) arasındaki 35 commitlik fark için birleştirme sırası kararı (C5). (2) Üretimde gerçek veri var mı (C2). (3) ENG06-03 K1–K10 topoloji komutlarını kullanıcı çalıştırır (örnek sayısı, `SESSION_SECRET`, proxy). (4) Kararlar: D-M1…D-M7 (ARCHITECTURE §10), C8, A-7/A-8. (5) Codex P-A (`eng06-04-p1`, 14 commitsiz dosya) durumunun Codex'ten alınması. (6) B-13 arbitrajının test ile doğrulanması (yalnız test, kod yok) |
| **Etkilenen dosyalar** | yok (belge) |
| **Altyapı kullanımı** | ENG06-03 K1–K10, ENG09 yayın listesi |
| **Veri geçişi** | yok |
| **Kabul** | Taban SHA'sı yazılı; C2/C3/C4 kapalı; D-M1 ve D-M3 cevaplanmış; Codex P-A ile çakışma planı yazılı |
| **Testler** | `npm test` 158/158 baz çizgisi tekrar; B-13 sınama testi (T-ECO-09) |
| **İki oyunculu doğrulama** | Gerekmez |
| **Geri alma** | Gerekmez |
| **Risk** | Düşük. Gecikme riski: karar ve topoloji kullanıcıya bağlı |

## F1 · Güvenlik ağı ve hız sınırı (küçük, düşük riskli)

| | |
|---|---|
| **Kapsam** | B-04 (hedefli teslim yerine önce **şema+boyut+hız**), B-14 (tüm POST ve WS mesajları hesap başına hız sınırı), M-1/M-2/M-4 (presence tek kayıt, eşzamanlı WS sınırı), ENG06-03 (proxy/IP, misafir koruması) uygulaması (onay şartlı), WS mesaj türü beyaz listesi, `/api/sync` alan sınırı ve `star/chibi/codex` doğrulama (boyut, enum), makbuz TTL (komut+Bedesten), ölü kod `.backup_gercek_er_meydani/` temizliği (ayrı onay) |
| **Etkilenen dosyalar** | `server.js` (`handleWsMessage`, `handleHttp`), `server/service_security.js`, `server/firestore_store.js`/`economy_store.js` (presence, TTL), yeni `server/ws_schema.js`, `ENG06_03_DESIGN.md` |
| **Altyapı kullanımı** | `consume()` hız kovası, ENG-09 okuma limiti kalıbı, `pruneServiceState` |
| **Veri geçişi / uyumluluk** | Şema dışı mesajlar eski istemcide kapanma yapabilir: önce **yalnız günlüğe yaz (gözlem)**, sonra uygula. Eski istemci mesaj alanlarını yok say. `dm_msg` hâlâ herkese gider (F3'e kadar); yalnız boyutu/hızı sınırlanır |
| **Kabul** | Hiçbir POST/WS türü sınırsız değil; 1000 mesaj/sn flood tek bağlantıyı düşürür, süreci düşürmez; `world.json` yazımı sınırlı; mevcut 158 test geçer; presence yazısı bağlantı başına ≤2/dk |
| **Otomatik test** | T-SEC-01…06, T-WS-01…04 |
| **İki oyunculu doğrulama** | A flood eder, B sohbet/takas/düello akışı kesintisiz sürer |
| **Geri alma** | Her sınır ortam değişkeniyle ayarlı ve "yalnız günlük" moduna alınabilir |
| **Risk** | Düşük–orta (yanlış sınır meşru oyuncuyu keser → önce gözlem modu) |

## F2 · Dünya durumunu depoya taşı (B-03)

| | |
|---|---|
| **Kapsam** | `WORLD`'ün sohbet, boss, kervan, podyum, codex, bayrak, baskın, oyuncu vitrini parçalarını Firestore/SQLite koleksiyonlarına taşı; `world.*` komutları (idempotent, hız sınırlı); boss hasarı ve podyum skoru için **tavan ve doğrulama sınıfı** (V3, "kanıtsız bildirim" etiketi ile); `world.json` yalnız göç kaynağı olarak okunur sonra emekli. Mekanik/değer değişmez |
| **Etkilenen dosyalar** | `server.js` (WORLD blokları), yeni `server/world_service.js`, store arayüzü (`economy_store.js`, `firestore_store.js`), `firestore.rules`/`indexes.json`, `js/net.js` (yalnız okuma) |
| **Altyapı kullanımı** | Aynı transaction kalıbı, `requestId` makbuzu, `service_state`, ENG-07 Bedesten desen kopyası |
| **Veri geçişi / uyumluluk** | Tek seferlik `world.json` → koleksiyon göçü (tohum verileri gerçek değil: göçülmez, yalnız şema). Eski istemci aynı uç adreslerini çağırır; uçlar arkada yeni servise bağlanır (yanıt şekli aynı). İki örnekli dönemde "tek yazıcı" kuralı (yalnız bir sürüm WORLD yazar) |
| **Kabul** | İki örnek aynı sohbeti/boss'u görür; yeniden başlatma sonrası dünya korunur; hiçbir dünya POST'u hesap başına sınırsız değil; istemci beyanı etiketi görünür (sunucu doğruladığı değil, sınırladığı); mevcut testler geçer |
| **Otomatik test** | T-WORLD-01…08, Firestore emülatörü iki örnek |
| **İki oyunculu doğrulama** | A boss'a vurur, B (farklı örnek) aynı HP'yi görür; her iki tarafın sohbeti yeniden başlatmada kalır |
| **Geri alma** | Bayrakla eski `world.json` yoluna dön (göç sırasında çift yazım, doğrulama sonrası kapat) |
| **Risk** | Orta (çok örnek+Firestore maliyeti, göç) |

## F3 · Gerçek zamanlı katman, olay kutusu, düello kurtarma (B-04, B-05, B-06, B-09)

| | |
|---|---|
| **Kapsam** | `Topic`+hedefli teslim (DM/parti/davet yalnız hedefe); `RealtimeBus` arayüzü (tek örnek gerçeklemesi); hesap başı olay kutusu `GET /api/events?after=seq`; yeniden bağlanmada `lastSeq`; üstel geri çekilme; oda meta verisi depoda (`eo_rooms`); **settlement süpürücüsü** (final-unsettled yeniden dene, expired-active void); düello sonucu olay kutusuna; Cloud Run örnek stratejisi (D-M3) uygulanır |
| **Etkilenen dosyalar** | `server.js` (WS), `js/duel_server.js`, `js/net.js` (yeniden bağlanma, olay işleme), `server/duel_service.js`, store arayüzü, yeni `server/realtime_bus.js`, `server/event_outbox.js` |
| **Altyapı kullanımı** | `gameplay_settlements` genel tablo, `replayMatch`, `duel_locks`, `trade_inbox` benzeri kutu deseni |
| **Veri geçişi / uyumluluk** | Eski istemci WS olaylarını eskisi gibi alır (iki yönlü uyumluluk: olay hem eski mesaj biçiminde hem kutuda). Eski odalar bellekte kalır, yeni odalar depoda; geçiş tek dağıtımda |
| **Kabul** | Süreç öldürülünce aktif ödüllü maç: kimseye ödül yok **ve** her iki oyuncu bilgilendirilir, kilitler serbest; `pending` settlement başka örnek/yeniden başlatmadan sonra tamamlanır; DM yalnız alıcıya ulaşır; WS düşüp 30 sn sonra bağlanan oyuncu kaçırdığı takas/düello sonucunu görür |
| **Otomatik test** | T-RT-01…10, T-DUEL-05…09 |
| **İki oyunculu doğrulama** | Düello ortasında sunucuyu öldür, geri aç; ağ kes/aç; üçüncü oyuncu DM'i duymaz |
| **Geri alma** | Süpürücü ve olay kutusu ayrı bayraklar; eski WS yolu korunur |
| **Risk** | Yüksek (en çok hareketli parça). Örnek stratejisi doğrulanmadan başlanmaz |

## F4 · Kimlik, oturum ve protokol sertleştirme (B-07, B-08, B-12)

| | |
|---|---|
| **Kapsam** | X↔hesap kalıcı bağlama (benzersiz); X ile cihazlar arası giriş/hesap kurtarma; oturum listesi/iptal; misafir hakları (D-M4); `gameJson.schemaVersion`+göç zinciri; `X-EO-Proto`/`client_outdated`; kill-switch; `GET /api/economy/receipt/:id`; ENG06-03 D4 (Origin) kararı |
| **Etkilenen dosyalar** | `server.js` (auth), `server/guest_session.js`, store'lar (hesap şeması: `xHandle` benzersiz dizin), `server/economy_commands.js` (göç, kill-switch), `js/net.js` (giriş akışı), `js/economy_client.js` (makbuz sorgusu) |
| **Altyapı kullanımı** | `revokeSession` (hazır), `request_id_reused` mantığı, `economy.ensure` göç kalıbı |
| **Veri geçişi / uyumluluk** | Mevcut hesaplar `schemaVersion=1` kabul edilir (alan yoksa); eski oyuncuların X bağlaması isteğe bağlı ve idempotent. **Mevcut oyuncu verisi korunur**; birleştirme (iki hesabı X'te toplama) **yapılmaz**, yalnız "bu cihazda giriş" |
| **Kabul** | Aynı X ikinci bir hesapla ödüllü düello yapamaz; telefon+masaüstü aynı hesapla çalışır; çerez silinen oyuncu X ile geri döner; oturum iptali anında etkili; eski sürüm istemci anlamlı hata alır |
| **Otomatik test** | T-ID-01…08, T-MIG-01…05 |
| **İki oyunculu doğrulama** | Aynı X ile iki tarayıcı: ikisi aynı hesaba girer; ayrı iki X hesabı düello yapar |
| **Geri alma** | `xHandle` bağlaması alan düzeyinde geri alınabilir; göç tembel olduğundan eski kod çalışmaya devam eder (iki sürüm yan yana test edilecek) |
| **Risk** | Orta–yüksek (hesap sahipliği hassas; Sybil politikası ürün kararı) |

## F5 · Defter yakınsaması: sistem sistem sunucu otoritesi (B-01, B-02, B-13, B-16)

Uzun faz, **her alt dilim ayrı onay**. Codex P-A…P-G planı (ENG06_04_PLAN) burada birleşir; bu plan onunla çakışırsa Codex planı korunur, bu belge sıralama önerir.

| Alt | Kapsam | Sınıf | Ön koşul |
|---|---|---|---|
| **5a** | `goal.reach` koşul doğrulaması (D-M6); `topcu.spin` tohumlu RNG (B-16); B-13 çözümü (olay verildi kaydı: `offer`, `order`, `auction` sunucuda üretilir) | V0 | F0 kararı |
| **5b** | Bakım/besleme/eğitim (A-4): `care.*` komutları, yem kaynak kovalarıyla azalır | V0 | F4 |
| **5c** | Yumurta/üreme/gen (`breed.*`), `ms.gen2/mark` üreticileri, Codex P-F | V0 | 5b |
| **5d** | Yarış, kıraathane, podyum: girdi+tohum kaydıyla yeniden oynatma (Codex P-E) | V2 | F3 |
| **5e** | Topçu PvE (zindan/kervan): `V3 sıkı tavan` → karar D-M2'ye göre V1 | V1/V3 | ENG06_05 |
| **5f** | Topçu PvP / co-op: sunucu simülasyonu (ayrı tasarım) | V1 | F3, 5e |
| **5g** | **Kese birleştirme** (D-M1 b onaylanırsa): yerel `S.gold` önbellek olur, `gold.local` kapanır | — | 5a–5f hepsi |
| **5h** | Ejderha ayrışmasının sonu: yerel ejderha doğrudan sunucudan; `reconcile` kaldırılır | — | 5b, 5c, 5g |

Her alt dilim için ortak şablon:

| | |
|---|---|
| **Etkilenen dosyalar** | `server/economy_commands.js` (SHAPES+reduce), yeni `server/<alan>.js`, ilgili `js/<alan>.js` (yalnız komut çağrısı), `js/economy_sync.js`, testler |
| **Altyapı kullanımı** | `reduceCommand` VM'i (kurallar aynı dosyadan), `sources.credit`/`debt.receive`, `gameplay_settlements`, `guard*` kilitleri |
| **Veri geçişi / uyumluluk** | Eski komut türü yeni yol hazır olana kadar çalışır; sunucu önce **gölge modda** (hesaplar, karşılaştırır, yazmaz), sapma raporu çıkar, sonra devreye girer. Mevcut `game_json` korunur |
| **Kabul** | İlgili yerel altın/varlık yazımı kalmaz (`grep` ile kanıtlı); istemci ödül tutarı göndermez; ödül/fiyat/olasılık değişmedi (test) |
| **Otomatik test** | Alan başına T-ECO/T-GAME seti + gölge mod sapma testi |
| **İki oyunculu doğrulama** | Alan başına: A eylem yapar, B değişimi (Bedesten/takas/liderlik) görür; aynı eylemi iki cihazdan eşzamanlı dene |
| **Geri alma** | Komut türü kill-switch ile kapanır, eski yerel akış açılır (5g'den önce) |
| **Risk** | 5a düşük · 5b–5d orta · 5e–5f yüksek · 5g yüksek (ürün hissi, iki kese birleşir) |

## F6 · Yönetim, denetim ve gözlem (B-11) — F1'den sonra paralel

| | |
|---|---|
| **Kapsam** | Salt okunur hesap denetçisi+periyodik defter denetim işi; yapılandırılmış günlük+metrikler; yedek/geri yükleme provası (Firestore dışa aktarma+PITR doğrulaması); `eo_admin_log` ve kısıtlı yönetici işlemleri (ayrı onay); komut makbuz TTL (F1'de yoksa) |
| **Etkilenen dosyalar** | yeni `tools/audit_ledger.js`, `server/logger.js`, `server/metrics.js`, belgeler |
| **Altyapı kullanımı** | `economy_sources.check`, `debtOf` değişmezleri |
| **Veri geçişi** | Yok (okuma). Yönetici işlemi eklenirse yalnız kayıtlı komutlarla |
| **Kabul** | Denetim işi sentetik bozulmuş hesabı yakalar; yedekten geri yükleme sentetik veriyle yapılmış; metrikler panelde |
| **Otomatik test** | T-OPS-01…06 |
| **İki oyunculu doğrulama** | Gerekmez (operasyon) |
| **Geri alma** | Salt okunur araçlar: gerekmez |
| **Risk** | Düşük |

## F7 · Genişletilebilirlik iskeleleri (isteğe bağlı, özellikler değil)

| | |
|---|---|
| **Kapsam** | `ActionTicket` sözleşmesi ve boş `game.activities[]`; `Room`/`Party` meta şeması; `Topic zone:<id>`; `settlement kind` kayıt defteri. **Hiçbir oyun özelliği eklenmez.** Gezilebilir pazar, balıkçılık, başkent, co-op, zindan kullanıcı onayıyla ayrı iş olur |
| **Etkilenen dosyalar** | `server/economy_commands.js`, `server/duel_service.js`→genel `settlement_registry`, `server/realtime_bus.js` |
| **Geri alma / Risk** | Alanlar boş ve opsiyonel; düşük |

## 1. Önerilen uygulama sırası (özet)

1. **F0** (kod yok, hemen): taban SHA, C2/C3/C4, D-M1/D-M3, Codex P-A durumu, B-13 testi.
2. **F1** (küçük, güvenli, hemen değer): hız sınırı+şema+presence+ENG06-03.
3. **F6a** paralel: denetçi+günlük+makbuz TTL.
4. **F2**: dünya depoya (çok örnek hazırlığı).
5. **F3**: gerçek zamanlı katman+kurtarma.
6. **F4**: kimlik/protokol (A-5, çok cihaz, şema sürümü).
7. **F5a → 5b → 5c → 5d → 5e → 5f → 5g → 5h**.
8. **F7**: yalnız bir özellik kararı verilince.

Neden bu sıra: F1/F6a geri dönüşü kolay ve ekonomiyi hemen korur; F2–F3, "gerçek çok oyunculu" olmanın altyapısı (bugün çok örnekte bozuk); F4, taşınacak her sistemin kimlik/sürüm sözleşmesine ihtiyacı olduğu için F5'ten önce; F5 en uzun ve en çok ürün kararı gerektiren kısım.

## 2. Her faz için ortak kurallar

- Ayrı dal+worktree (`claude/mp-fN-<ad>`), ayrı onay. Codex worktree'lerine dokunulmaz.
- Önce test (kırmızı), sonra kod; mevcut 158 test kırılmaz.
- Gölge mod / bayrak / kill-switch olmadan canlı davranış değişmez.
- Ödül/fiyat/olasılık/`economy_sources.js` politikası değişmez.
- Her fazın sonunda: iki gerçek oyunculu doğrulama protokolü (TEST_MATRIX §5) kullanıcı tarafından çalıştırılır; "koşulmadı" açıkça yazılır.
- Yayın engelleri (ENG09 §5): üretim IAM, indeks dağıtımı, eski kayıt mutabakatı (C2), tek sürüm yazıcı geçişi, yazılı geri alma planı. Bu yol haritası bunları **tamamlamaz**; F0 ve F6 bunları kapatma planını içerir.

## Ek not (2026-11-10, K10)
ENG-14 (`claude/eng14-pvp-rooms`) bellek içi, tek örnek Topçu PvP odalarını (`server/pvp_rooms.js`) ekledi; bu yol haritası onu anmıyor. F3 `Room`/`Topic` tasarımı bununla birleştirilmeli. Ayrıca Kıraathane masa oyunları (5d) V2 değil **V1** gerektirir ve 5d, 5d-1 (yarış/podyum, V2) ile 5d-2 (masa oyunları, V1) olarak bölünmelidir. Ayrıntı: `UX_OZELLIK_SPEC.md` §2.1 K2/K4.
