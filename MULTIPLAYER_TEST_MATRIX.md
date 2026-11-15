# MULTIPLAYER_TEST_MATRIX · Test matrisi

02 Engineering (Claude) · 2026-11-09 · Plan belgesi. **Yeni test yazılmadı.** Mevcut durum `7f8d60c` üzerinde `node --test tests/*.test.js` ile 158/158 doğrulandı; diğer her satırın "Mevcut" sütunu **dosya adı ve teslim belgesi iddiasına** dayanır, ayrıca koşulmadı.

Durum: ✅ var (dosya adı + teslim belgesi iddiası; senaryo içeriği satır satır doğrulanmadı) · ◐ kısmi · ❌ yok · 🔒 koşulmadı (e2e/emülatör/gerçek ortam).
Seviye: **U** birim (SQLite) · **I** entegrasyon (Firestore emülatörü) · **E** e2e (Playwright, çok bağlam) · **C** kaos/dayanıklılık (süreç öldürme, ağ kesme) · **M** manuel gerçek cihaz/oyuncu.

## 1. Mevcut test envanteri (özet)

| Grup | Dosyalar | Not |
|---|---|---|
| Ekonomi çekirdek | `economy_commands`, `economy_sources`, `economy_store`, `economy_client`, `eng06_economy_acceptance`, `eng06_pc_week`, `eng10_rebuild`, `eng13_income` | komut, kaynak, borç, hafta, tek kese gelirleri |
| Takas | `trade_engine`, `trade_service`, `trade_client`, `trade_ui.e2e` (🔒), `eng11_trade.e2e` (🔒) | |
| Bedesten | `eng07_market`, `market_security`, `eng10_market_preview`, `eng09_read_limits`, `ocak_sandigi`, `ocak_sandigi.e2e` (🔒) | |
| Düello | `duel_server`, `duel_settlement`, Firestore P-D, `eng10_economy.e2e` (🔒) | |
| Kimlik/oturum | `server_foundation`, `session_cache`, `session_secret`, `net_identity` | |
| İstemci eşitleme | `eng10_economy_link`, `eng12_sync`, `eng12_sync.e2e` (🔒) | |
| Firestore | `firestore_store.integration.js` (🔒 emülatör) | teslim belgesi: 13/13 (ENG-12) |
| Düzen | `eng09_layout.e2e` (🔒) | |

## 2. Dayanıklılık ve doğruluk senaryoları

### 2.1 Tekrar gönderilen / çift işlem (idempotency)

| ID | Senaryo | Seviye | Mevcut | Hedef faz |
|---|---|---|---|---|
| T-IDEM-01 | Aynı `requestId`+aynı gövde ekonomi komutu → aynı sonuç, `replayed:true`, ikinci etki yok | U | ✅ `economy_store`, `economy_commands` | — |
| T-IDEM-02 | Aynı `requestId`+farklı gövde → `request_id_reused` | U | ✅ | — |
| T-IDEM-03 | Her komut türü (`SHAPES` listesi) için tekrar gönderim tablosu testi (tür başına) | U | ◐ bazı türler | F5 şablon |
| T-IDEM-04 | Takas/Bedesten tekrar gönderimi | U/I | ✅ `trade_service`, `eng07_market`, Firestore | — |
| T-IDEM-05 | Düello settlement iki kez çağrılır → tek ödeme | U/I | ✅ `duel_settlement` | — |
| T-IDEM-06 | WS `chat`/`dm`/davet tekrar gönderimi (istek kimliği yok → çift) | U | ❌ | F1/F2 |
| T-IDEM-07 | Dünya POST (`boss`, `pageant`, `raid-ocak`, `caravans`) aynı istek iki kez | U | ❌ | F2 |
| T-IDEM-08 | Makbuz TTL sonrası aynı `requestId` ile eski istek (yeniden oynatma penceresi) | U | ❌ | F1 |

### 2.2 Eşzamanlılık ve çift harcama

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-CONC-01 | İki sekme/cihaz aynı `expectedVersion` ile komut → biri `version_conflict` | U/I | ✅ | — |
| T-CONC-02 | İki alıcı aynı Bedesten ilanını eşzamanlı alır → biri başarılı | U/I | ✅ (`eng07_market`, Firestore:270) | — |
| T-CONC-03 | Aynı ejderha eşzamanlı: satış + Bedesten ilanı + takas teklifi + düello | U | ◐ kilit testleri ayrı ayrı | F5 |
| T-CONC-04 | Takas onayı sırasında teklif sahibi `week.end` / `dragon.sell` yapar | U | ✅ (reservation guard testi) | — |
| T-CONC-05 | İki **sunucu örneği** aynı hesaba eşzamanlı komut (Firestore) | I/E | ◐ takas için iki sunuculu e2e 🔒; komut için yok | F3 |
| T-CONC-06 | 50 paralel komut/hesap yük testi, çakışma oranı ölçümü | C | ❌ | F6 |
| T-CONC-07 | Aynı X ile iki tarayıcı iki hesapta ödüllü düello (Sybil) | E | ❌ | F4 |

### 2.3 Ağ kopması, yeniden bağlanma, yeniden başlatma

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-NET-01 | Komut 12 sn zaman aşımı → belirsiz → aynı gövde yeniden gönderilir | U | ✅ `economy_client` | — |
| T-NET-02 | Sayfa yenileme: askıdaki gövde `localStorage`'dan aynen gönderilir | U | ✅ | — |
| T-NET-03 | Gerçek ağ kesintisinde askıdaki alımın yenilemeden sonra eşleşmesi | E | 🔒 "koşulmadı" (ENG-12 belgesi) | F4 |
| T-NET-04 | WS kopar, 30 sn sonra bağlanır: kaçırılan takas/düello/dm olayları gelir | E | ❌ | F3 |
| T-NET-05 | Düello ortasında WS kopar <30 sn → `resume`; >30 sn → terk hükmü | U/E | ◐ unit ✅, tarayıcıda ◐ | F3 |
| T-NET-06 | Sunucu süreci düello ortasında öldürülür → maç `void`, kilit serbest, iki taraf bilgilendirilir | C | ❌ **(B-06)** | F3 |
| T-NET-07 | `finalizeMatch` başarılı, `settleGameplay` 3 kez hata → süpürücü sonra öder | U/C | ❌ **(B-06)** | F3 |
| T-NET-08 | Firestore geçici hata: komut 503, durum bozulmaz, yeniden deneme çalışır | I | ◐ | F1 |
| T-NET-09 | Sunucu yeniden başlatma: takas süreleri, ilanlar, rezervasyonlar sürer | I | ◐ (`expireTrades` testleri) | F3 |
| T-NET-10 | Mobil ağ değişimi (Wi-Fi↔4G) ve uyku/uyanma | M | 🔒 | F3 |

### 2.4 Çok örnek, çoklu cihaz

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-MULTI-01 | İki örnek: A örnek1'de, B örnek2'de sohbet eder | E | ❌ **(B-05)** | F2/F3 |
| T-MULTI-02 | İki örnek: A↔B ödüllü düello başlar | E | ❌ | F3 |
| T-MULTI-03 | İki örnek: boss/podyum/codex tutarlı | E | ❌ | F2 |
| T-MULTI-04 | İki örnek: Bedesten alım/iptal | E | ◐ yalnız depo düzeyi | F2 |
| T-MULTI-05 | Telefon+masaüstü aynı hesap (X ile) | M/E | ❌ | F4 |
| T-MULTI-06 | Örnek yeniden başlatma/dağıtımda `SESSION_SECRET` aynı → X çerezi geçerli | U | ✅ `session_secret` (mantık) · gerçek Cloud Run 🔒 | F0 |

### 2.5 Ekonomi bütünlüğü

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-ECO-01 | `funds` toplamı `gold`'a eşit (her komut sonrası, tüm türler) | U | ✅ | — |
| T-ECO-02 | İstemci `gold/inv/dragons` içeren `/api/sync` reddedilir | U | ✅ | — |
| T-ECO-03 | Borç varken harcama/takas kapalı | U | ✅ | — |
| T-ECO-04 | `unknown`/`bound` varlık takas/Bedesten'e giremez | U | ✅ | — |
| T-ECO-05 | `gold.local` günlük tavanı, tür tavanı, gider yalnız düşer | U | ✅ `eng13_income` | — |
| T-ECO-06 | `goal.reach` hedef koşulu sağlanmadan çağrı | U | ❌ **şu an geçer = hata (B-02)** | F5a |
| T-ECO-07 | `topcu.clear` ile geçiş yaşanmadan günlük tavana kadar altın | U | ❌ **(B-02)** | F5e |
| T-ECO-08 | `order.deliver` ile siparişi hiç verilmemiş en kârlı `spec` | U | ❌ | F5a |
| T-ECO-09 | **B-13:** NPC'den ejderha al → `offer.sell` → kâr; günde 4 kez; hafta döngüsüyle tezgâh yenilenir | U | ❌ **(önce doğrula)** | F0 |
| T-ECO-10 | `topcu.spin` tohumlu RNG ile aynı tohum aynı dilim | U | ❌ (şu an Math.random) | F5a |
| T-ECO-11 | Komut makbuz tablosu büyüme/TTL | U | ❌ | F1 |
| T-ECO-12 | Defter denetim işi bozuk hesabı yakalar (sentetik) | U | ❌ | F6 |
| T-ECO-13 | Eski kayıt (`funds` yok) göçü: bütün altın `unknown` | U | ✅ | — |
| T-ECO-14 | `schemaVersion` göç zinciri v1→v2, geri yönde eski kod | U | ❌ | F4 |

### 2.6 Güvenlik

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-SEC-01 | WS flood (1000 msg/sn) tek bağlantıyı düşürür, süreç ayakta | C | ❌ **(B-14)** | F1 |
| T-SEC-02 | Dünya POST hesap başına hız sınırı | U | ❌ | F1 |
| T-SEC-03 | Aşırı büyük `star/chibi/codex` JSON'u reddedilir | U | ◐ (2 MB gövde sınırı var, alan sınırı yok) | F1 |
| T-SEC-04 | `dm_msg` yalnız alıcıya gider | E | ❌ **(B-04)** | F3 |
| T-SEC-05 | Gönderen kimliği gövde/mesajdan değil oturumdan | U | ✅ `net_identity`, `market_security` | — |
| T-SEC-06 | Origin kuralları (cross-site, yok, farklı) | U | ✅ `server_foundation` · `Origin` yok kararı ENG06-03 | F1 |
| T-SEC-07 | Misafir oluşturma IP limiti proxy arkasında | U | ❌ (ENG06-03) | F1 |
| T-SEC-08 | Oturum iptali anında etkili (WS dahil) | U/E | ◐ (WS `fresh:true` kontrolü var; iptal yolu yok) | F4 |
| T-SEC-09 | Sohbet/`hub_update` içinde HTML/script → istemci kaçışlıyor | E | ◐ `esc()` genel kullanım; sistematik test yok | F1 |
| T-SEC-10 | Aşırı sayıda eşzamanlı WS tek hesapta | U | ❌ | F1 |

### 2.7 Düello ve gerçek zamanlı

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-DUEL-01 | Tohum+günlükten yeniden oynatma kazananı belirler | U | ✅ | — |
| T-DUEL-02 | Günlük sınırlar (çift 3, hesap 10) | U | ✅ | — |
| T-DUEL-03 | Terk/erken teslim ödül kuralları | U | ✅ | — |
| T-DUEL-04 | Misafir ödüllü düelloya giremez (davet+kabul) | U/E | ✅ | — |
| T-DUEL-05 | Oda meta deposundan kurtarma | C | ❌ | F3 |
| T-DUEL-06 | Süpürücü: final-unsettled | U | ❌ | F3 |
| T-DUEL-07 | Süpürücü: expired-active → void+bildirim | U | ❌ | F3 |
| T-DUEL-08 | Ödüllü yol (`paid`) tarayıcıda uçtan uca | E | 🔒 "koşulmadı" (ENG-10) | F3 |
| T-DUEL-09 | Aynı X iki hesap: Sybil kapatıldı | E | ❌ | F4 |
| T-RT-xx | `RealtimeBus`, olay kutusu `seq`, `lastSeq` boşluk doldurma, üstel geri çekilme, hedefli teslim | U/E | ❌ | F3 |

### 2.8 Dünya durumu

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-WORLD-01…08 | Sohbet, boss, kervan, podyum, codex, bayrak, baskın, vitrin: kalıcılık, idempotency, hız sınırı, iki örnek, göç, geri dönüş bayrağı | U/I/E | ❌ | F2 |

### 2.9 Göç ve geriye uyumluluk

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-MIG-01 | Mevcut gerçek oyuncu verisi yeni kodla okunur (fixture: ENG-05 öncesi, ENG-10, ENG-13 biçimleri) | U | ◐ | her faz |
| T-MIG-02 | Yeni kodla yazılmış hesap eski kodla okunur (geri alma) | U | ❌ **(ENG09: test edilmedi)** | F4 |
| T-MIG-03 | `world.json` → koleksiyon göçü, çift yazım doğrulaması | U/I | ❌ | F2 |
| T-MIG-04 | Eski istemci (eski JS paketi) yeni sunucuya karşı | E | ❌ | F3/F4 |
| T-MIG-05 | Gölge mod sapma raporu 0 olmadan devreye alınmaz | U | ❌ | F5 |

### 2.10 Yönetim ve gözlem

| ID | Senaryo | Seviye | Mevcut | Faz |
|---|---|---|---|---|
| T-OPS-01…06 | Denetim işi, kill-switch, yedekten geri yükleme provası, günlük alanları, metrikler, yönetici işlemi denetim kaydı | U/M | ❌ | F6 |

### 2.11 Yük ve cihaz

| ID | Senaryo | Seviye | Faz |
|---|---|---|---|
| T-LOAD-01 | 200 eşzamanlı WS + 20 komut/sn: gecikme p95, `version_conflict`, VM bağlam süresi | C | F1/F6 |
| T-LOAD-02 | Presence 200 bağlantı, Firestore yazma maliyeti | C | F1 |
| T-DEV-01 | iOS Safari, Android Chrome gerçek cihaz (düzen, WS, `localStorage` engeli, gizli sekme) | M | F3 |

## 3. Önceliklendirilmiş eksikler (ilk yazılacak 10)

1. **T-ECO-09** B-13 arbitraj doğrulaması (F0, kod yok).
2. **T-NET-06 / 07** düello kurtarma (B-06) — gerçek para kaybı yolu.
3. **T-SEC-01 / 02** WS ve dünya POST hız sınırı.
4. **T-MULTI-01 / 02** iki örnek sohbet ve düello (B-05).
5. **T-ECO-06 / 07 / 08** istemci beyanlı ödüller (B-02).
6. **T-SEC-04** DM kapsamı (B-04).
7. **T-CONC-07 / T-DUEL-09** Sybil (B-07).
8. **T-MIG-02** geri alma uyumluluğu.
9. **T-NET-04** kaçırılan olay kurtarma.
10. **T-IDEM-06 / 07** WS ve dünya tekrar gönderimi.

## 4. Çalıştırma komutları (mevcut; yeni değil)

```
npm ci
npm test                                     # SQLite+birim (bu oturumda 158/158, node_modules olmadan scratchpad'de)
npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"
npm run test:trade-ui                        # Playwright; ENG05_MULTI_SERVER=1 + emülatör = iki sunuculu
npm run test:eng10 | test:eng11 | test:eng12 | test:ocak-sandigi | test:layout
```
Yalnız emülatör; gerçek Firebase projesi kullanılmaz. Koşulmayan komutlar "geçti" diye raporlanmaz.

## 5. İki gerçek oyunculu doğrulama protokolü (her faz sonunda, kullanıcı çalıştırır)

Ortam: yerel sunucu (`NODE_ENV=test`, SQLite ya da emülatör), iki ayrı tarayıcı profili (ya da biri telefon), her ikisi X simülasyon girişiyle (yalnız yerel). **Gerçek proje, gerçek hesap, üretim verisi yok.**

| Adım | A | B | Beklenen |
|---|---|---|---|
| 1 | Giriş, sunucu ocağı | Giriş, sunucu ocağı | İki ayrı hesap; presence'ta birbirini görürler |
| 2 | Sohbet yazar | — | B yalnız bir kez alır; DM üçüncü profile gitmez |
| 3 | Bedesten'e ilan koyar | Satın alır | Altın/varlık tam bir kez el değiştirir; sürüm +1 |
| 4 | Aynı anda iki sekmeden aynı ilanı iptal + B alım | | Tek kazanan; çift işlem yok |
| 5 | Takas: davet, teklif, değiştir, onay | Onay | İki onay sıfırlanır, atomik takas |
| 6 | Ödüllü düello başlatır | Kabul | Maç oynanır; ödül bir kez; günlük sınır görünür |
| 7 | Düello ortasında ağı keser (30 sn altı) | | `resume` |
| 8 | Düello ortasında **sunucuyu öldür/aç** (F3 sonrası) | | Maç `void`, kilitler serbest, iki taraf bilgilendirilir |
| 9 | Çevrimdışı olur | B ilanını satın alır | A'nın altını sonradan görünür (olay kutusu) |
| 10 | Aynı hesaba ikinci cihazdan giriş (F4 sonrası) | | Aynı ocak, tutarlı sürüm |
| 11 | İki örnek (emülatör+`ENG05_MULTI_SERVER=1`) | | Aynı dünya ve sohbet (F2/F3 sonrası) |

Sonuç ekran görüntüleri yalnız yerelde; commit'e girmez.

## 6. Koşulmayanlar (bu oturumda)

Firestore emülatörü, Playwright e2e (tüm paket), iki sunuculu koşu, gerçek telefon/iOS, gerçek Cloud Run, X OAuth, yük/kaos testleri. Bu oturumda doğrulanan tek şey `node --test tests/*.test.js` setinin **toplamıdır** (158/158). "Mevcut" sütunundaki ✅ işaretleri dosya adlarına ve teslim belgelerine dayanır; her senaryonun testte gerçekten bulunduğu tek tek açılıp doğrulanmadı. Uygulama fazına geçmeden önce ✅ satırları testlerle eşleştirilecek. 🔒 satırları belge iddiasıdır.
