# MULTIPLAYER_ARCHITECTURE · Hedef mimari (öneri, onay bekliyor)

02 Engineering (Claude) · 2026-11-09 · **Aşama 2: yalnız tasarım. Kod yok.** Bulgu numaraları (B-xx) `MULTIPLAYER_SYSTEM_INVENTORY.md`'ye atıf yapar.
Bu belge **öneridir**. Onaylı bir kararı değiştirmez; çelişen yerler §9'da "karar gerekir" diye ayrılmıştır.

## 1. İlkeler

1. **Sunucu otoritesi**: kalıcı ve ortak her durum (altın, varlık, sahiplik, ilerleme, ödül, sıralama, savaş sonucu) yalnız sunucu komutuyla değişir. İstemci **niyet** gönderir (komut), sunucu **sonuç** üretir.
2. **İstemci görsel kalır**: animasyon, önizleme, fizik tahmini, ses, kamera istemcide kalır. Sunucuya yalnız sonucu etkileyen girdi taşınır.
3. **Mevcut mimariyi yeniden kullan**: yeni oyun sunucusu yazılmaz. Komut zarfı, makbuz, sürüm CAS, depo transaction'ı, kaynak modeli, kilit ailesi, settlement tablosu, tohumlu yeniden oynatma **zaten var** ve genişletilecek.
4. **Her yazma idempotent**: istek kimliği + içerik özeti; aynı kimlik aynı sonucu döner, farklı içerik reddedilir.
5. **Çift harcama yok**: tek transaction'da koşul+yazma (CAS ya da kilit). Bellek içi "kontrol" yazma yerine geçmez.
6. **Belirsizlik gizlenmez**: ağ/5xx → "belirsiz"; başarı gösterilmez, kimlikle sorgulanabilir.
7. **Bozulmaz geçiş**: yeni yol, eski yolun yanında doğar; veri taşıma geri alınabilir; onaylı mekanik sessizce değişmez.

## 2. Hedef durum bölgeleri

Bugün üç bölge var (yerel `S`, sunucu defteri, `WORLD`). Hedef dört, her birinin sahibi ve yazma yolu net:

| Bölge | Ne tutar | Sahip | Yazma yolu | Kalıcılık | Bugünkü karşılığı |
|---|---|---|---|---|---|
| **L · Hesap defteri (ledger)** | altın kovaları, varlıklar, hedefler, hafta/sezon, ejderha durumu, bakım/besleme, envanter | sunucu | `POST /api/economy/command` (mevcut zarf) | Firestore `eo_accounts` | sunucu defteri ("Ocak Kesesi") |
| **W · Dünya durumu** | sohbet, boss, kervan, podyum, bayrak, codex, baskın, vitrin | sunucu | dünya komutları (L ile aynı zarf, ayrı etki alanı) | Firestore koleksiyonları (yeni) | `WORLD` + `world.json` |
| **R · Anlık oturum (gerçek zamanlı)** | presence, odalar, hareket, davetler, tribün | sunucu süreci (geçici) + depoda kira | WS mesajları (şemalı) | bellek + kira kaydı; kritik oda meta verisi depoda | WS, `duel_server`, `LIVE_ROOMS` |
| **C · İstemci önbelleği/tahmin** | görsel durum, iyimser kopya, askıdaki komut | istemci | yok (yalnız okur) | `localStorage` | `S` (bugün sahip!) |

Hedef: **`S` sahip olmaktan çıkar, L'nin önbelleği/tahmini olur.** Bu geçiş kademelidir (§7, MULTIPLAYER_MIGRATION_ROADMAP). Aradaki dönemde iki kese (karar K-1, 00) korunur; bkz. §9 D-M1.

## 3. Komut ve olay protokolü

### 3.1 Komut zarfı (mevcut, genişler)

```
POST /api/economy/command
{ requestId: uuid, expectedVersion: n, type: "alan.eylem", args: {...} }
→ { ok, replayed, appliedVersion, result, economy }
```
- **Reddedilen/kabul edilen** durumlar aynen: `version_conflict`, `request_id_reused`, `rate_limited`, alan hataları.
- **Eklenecekler** (hepsi geriye uyumlu):
  1. `GET /api/economy/receipt/:requestId` → "bu istek uygulandı mı?" (belirsizlik çözümü; bugün yalnız aynı gövdeyi yeniden gönderme var).
  2. İstemci/protokol sürümü başlığı (`X-EO-Proto`), uyumsuzlukta `client_outdated` (kapatma/yükseltme için).
  3. Komut türü bazında **kill-switch** (ortam/depo yapılandırması): kapalı komut `command_disabled` döner.
  4. `gameJson.schemaVersion` + sürümlü göç zinciri (§6).

### 3.2 Komut aileleri

| Etki alanı | Örnek tür | Not |
|---|---|---|
| `economy.*` | `shop.*`, `building.buy`, `egg.*`, `week.end` | mevcut |
| `care.*` (yeni) | `feed`, `clean`, `train`, `rest` | bugün yerel; sunucu VM'inde mevcut kurallarla |
| `breed.*` (yeni) | `breed.pair`, `breed.collect` | üreme/gen yalnız sunucuda |
| `progress.*` (yeni) | `goal.*`, `quest.*`, `season.*` | koşul doğrulamalı |
| `activity.*` (yeni) | `activity.start` / `activity.claim` | **zamanlı eylem bileti** (§5.3) |
| `world.*` (yeni) | `chat.say`, `boss.hit`, `pageant.vote`, `codex.claim` | dünya durumu W'yi yazar |
| `party.*` (yeni) | `party.create/invite/accept/leave` | gelecekteki co-op için temel |

`gold.local` ve benzeri **istemci beyanlı** türler geçici köprüdür; her biri ilgili `activity.*`/doğrulamalı komut gelince emekliye ayrılır (§5.2).

### 3.3 Sunucu → istemci olayları

Bugün sunucu itmesi iki türdür: `market_update` (yalnız "yenile") ve WS oda mesajları. Hedef: **hesap başına olay kutusu (outbox)**.
- Her hesap için sıra numaralı küçük bir olay akışı: `{seq, type, payload, at}`; türler: `trade_state`, `duel_settlement`, `market_sold`, `dm`, `party_invite`, `season_event`.
- `GET /api/events?after=seq` ile kaçırılan olaylar alınır; WS aynı olayları gerçek zamanlı iter. WS düşerse veri **kaybolmaz**.
- Retansiyon: sınırlı (örn. son 200 ya da 7 gün); eski olaylar için istemci tam durumu `GET /api/economy`'den yeniden okur.
- Yeniden bağlanma: istemci `lastSeq` ile bağlanır; sunucu boşluğu doldurur (§4.3).

## 4. Gerçek zamanlı katman

### 4.1 Mevcut durum ve hedef

WS bugün saf Node (`RFC 6455` elle yazılmış), örnek belleğinde `WS_CLIENTS`. Kullanımı: sohbet, presence, düello, takas bildirimi, Topçu senkronu. **Önerilen: aynı WS motoru korunur**, üzerine üç yapı eklenir:

1. **Mesaj şeması ve bütçe**: her mesaj türü için JSON şema, boyut, hız (token bucket), toplam bağlantı başına kota. Şema dışı mesaj bağlantıyı kapatır. (B-04, B-14)
2. **Hedefli teslim**: `to` ile süzme istemciye bırakılmaz. Sunucu mesajı yalnız hedef hesap(lar)a / odaya yollar. `wsBroadcast` yalnız gerçekten genel olaylar için (online sayısı, dünya olayı) kalır.
3. **Konular/odalar**: soyut `Topic` kavramı: `world`, `zone:<id>`, `room:<id>`, `account:<id>`, `party:<id>`. Abonelik sunucu tarafında kimlik denetimiyle.

### 4.2 Çok örnek stratejisi (B-05)

Üç seçenek, **önerilen sıra**:
- **A (başlangıç): tek örnek + oturum sahipliği.** `max-instances=1` (Cloud Run) ya da bilinçli üst sınır; WS `min-instances≥1`. Yeni altyapı yok. Düello ve oda mantığı olduğu gibi çalışır. Ölçek tavanı bellidir (yaklaşık yüzlerce eşzamanlı). **ENG06-03 topolojisi doğrulanana kadar bu varsayım belirsizdir.**
- **B (gerektiğinde): Firestore üzerinden `RealtimeBus`.** `bus.publish(topic, msg)` Firestore'a kısa ömürlü olay yazar; her örnek `onSnapshot` ile dinler. Yeni sistem yok, ama okuma/yazma maliyeti ve gecikme (yüzlerce ms) artar. Düello gibi sıkı gecikmeli akışlar için oda **tek örneğe sabitlenir** (§4.4).
- **C (ancak B yetmezse): Redis/Pub-Sub.** Yeni altyapı. Varsayılan seçilmez.

`RealtimeBus` arayüzü baştan tanımlanır (A'da yerel gerçeklemeyle): sonra B'ye geçiş istemciyi/oyun kodunu değiştirmez.

### 4.3 Bağlantı, yeniden bağlanma, presence

- **Bağlantı sınırları**: hesap başına eşzamanlı WS ≤ 3; IP başına sınır; üstü eskisini kapatır (M-4).
- **Yeniden bağlanma**: üstel geri çekilme (bugün sabit 8 sn); `lastSeq` ile olay boşluğu doldurma; oda varsa `room_resume`.
- **Presence**: hesap başına **tek** doküman (`presence:<accountId>`), son bağlantı ve örnek kimliği; kira 90 sn; yazma yalnız değişimde ya da 30 sn'de (M-1). "Çevrimiçi sayısı" tahminî ve önbellekli.
- **Sıra**: oda içi mesajlara oda-yerel monoton `tick`/`seq`; istemci eski olayı atar.

### 4.4 Odalar (oyun örnekleri)

`Room` soyutlaması: `{id, kind, ownerInstance, participants, state, tick, ttl}`.
- **Meta veri depoda** (`eo_rooms`): sahip örnek, katılımcılar, durum özeti, TTL. Süreç ölürse başka örnek (ya da yeniden başlayan aynı örnek) `room_recover` ile ya **temiz bitirir** (void/forfeit kuralıyla) ya da sürdürür (tohum+günlükten yeniden oynatılabiliyorsa).
- Düello bu kalıbın ilk uygulamasıdır; `finalizeMatch`/`settleGameplay` süpürücüsü (§5.4) odanın cenaze işleyicisi olur. (B-06)
- Tur tabanlı odalar (düello, takas) olay günlüğünden yeniden oynatılabilir; gerçek zamanlı fizik odaları (Topçu PvP) **sunucu simülasyonu** gerektirir ve ayrı bir tasarım konusudur (ENG06_05 §4).

## 5. Sunucu otoritesi: nasıl doğrulanır

### 5.1 Doğrulama sınıfları (her faucet/etki bir sınıfa girer)

| Sınıf | Tanım | Örnek | Altın sınıfı |
|---|---|---|---|
| **V0 Sunucu hesaplar** | Girdi sunucu durumudur, istemci yalnız niyet bildirir | `shop.*`, `week.end`, `dragon.sell` | kaynaktan türer |
| **V1 Sunucu simüle eder** | Sunucu tohumla/yeniden oynatır | ödüllü düello, çark, müzayede | earned olabilir |
| **V2 Kanıtlı bildirim** | İstemci olay+girdi gönderir, sunucu **yeniden üretir ve karşılaştırır** | deterministik PvE (kayıtlı hamle/tohum) | earned olabilir (onayla) |
| **V3 Tavanlı bildirim** | İstemci beyanı, sunucu üst sınır koyar | `gold.local`, `topcu.clear` | **unknown**, takas edilemez |
| **V4 Yalnız görsel** | Sonuca etkisi yok | animasyon, ses | — |

Kural: **V3'ten gelen değer asla earned/takas edilebilir olmaz.** Mevcut ENG-13 köprüsü V3'tür; hedef onu V0–V2'ye çekmektir.

### 5.2 `gold.local` ve benzerlerinin emekliliği

Her yerel gelir türü için bir yol seçilir ve sırayla bağlanır:
- Deterministik, kısa, tekrar oynatılabilir (yarış, kıraathane, podyum): **V2** (girdi+tohum kaydı, sunucuda yeniden oynatma).
- Fizik/gerçek zamanlı (Topçu): önce **V3 + sıkı tavan**, sonra sunucu simülasyonu (V1) ayrı karar (ENG06_05).
- Hikâye/olay seçimleri: **V0** (olay sunucuda üretilir, seçim komut olur): sunucu "şu olay verildi" kaydını tutar → `order.deliver`, `offer.sell`, `auction.sell` artık "verilmemiş olayı beyan etmek" olmaz. (B-02, B-13)
- `goal.reach`: sunucu `checkGoals` ile zaten hesaplıyor; istemci komutu **ya kaldırılır ya koşulu doğrular**.

Emeklilik tavan/oran sınırlarını gevşetmez; yeni yol hazır olmadan eskisi kapatılmaz (§7 geriye uyumluluk).

### 5.3 Zamanlı eylem bileti (`ActionTicket`) — gelecek özellikler için temel

Genel kalıp (balıkçılık, yaşam becerileri, gezilebilir pazar işleri, bekleyen görevler için):
```
activity.start {kind, params}  → sunucu: seed, startedAt (sunucu saati), minDuration, state kaydı
activity.claim {ticketId}      → sunucu: süre doldu mu, seed ile sonucu üret, ödülü settlement olarak yaz
```
- Zaman yalnız sunucu saatinden; istemci "geçti" diyemez.
- Sonuç tohumdan türer (yeniden oynatılabilir); ödül `gameplay_settlements`'e kind ile yazılır (tek seferlik).
- Bu özellikler **şimdi geliştirilmez**; ama `game.activities[]` alanı ve `settlement kind` kaydı sözleşmeye şimdi eklenir (boş).

### 5.4 Settlement ve kurtarma süpürücüsü (B-06)

- `gameplay_settlements(event_id, account_id, kind)` zaten genel. Yeni: **süpürücü** her örnekte periyodik çalışır:
  - `final` ama settlement'ı olmayan maçlar → `settleGameplay` yeniden dener.
  - `active` ama TTL'i dolmuş maçlar → `void` yapar (ödülsüz, bildirimli).
- Sonuç olay kutusuna (§3.3) yazılır; istemci WS'e bağlı olmasa da öğrenir.

### 5.5 Rastgelelik

Sunucu RNG'si tohumlu ve kayıtlıdır: `crypto.createHmac(seed, counter)` kalıbı (düello, VM). `topcu.spin`'in çarkı da bu kalıba alınır (B-16); tohum makbuza yazılır.

## 6. Veri modeli ve sürümleme

- **Hesap dokümanı** bugün tüm oyunu tutuyor (≤700 KB). Önerilen: **bölme değerlendirmesi**, karar değil:
  - `ledger` (altın, kaynaklar, varlıklar, sürüm) ve `progress` (hedef, sezon, bakım, etkinlik) ayrı dokümanlar olur; Bedesten/takas yalnız `ledger`'a dokunur → çekişme düşer, 1 MiB tavanı uzar.
  - Karar ölçüme bağlı: önce `game_size_limit` ve çakışma oranı metriği (§8).
- **Şema sürümü**: `gameJson.schemaVersion`; `migrate(v → v+1)` zinciri; okuma-yazmada tembel göç; eski sürüm istemci `client_outdated`.
- **Komut sözleşmesi sürümü**: tür adları değişmez; yeni alan opsiyonel; kaldırma iki sürüm uyarıyla.
- **Dünya koleksiyonları** (W): `eo_world_chat`, `eo_world_boss`, `eo_world_caravans`, `eo_world_pageant`, `eo_world_codex`, `eo_world_raids`, `eo_players` (vitrin). Her biri küçük, sınırlı, TTL'li ve işlem içinde güncellenir. `world.json` emekli olur.
- **Makbuz temizliği**: komut ve Bedesten makbuzları TTL ile küçülür (takas için olan mekanizma genelleştirilir).

## 7. Kimlik ve oturum hedefi

- **Hesap = sunucu kaydı**, çerez yalnız taşıyıcı. X girişi hesapla **kalıcı** bağlanır (`account.xHandle`, benzersiz); aynı X başka hesaba bağlanamaz. (B-07, A-5)
- **Cihazlar arası**: X ile giriş yapan yeni cihaz mevcut hesabın oturumunu alır (hesap kurtarma yolu); misafir hesap X'e "yükseltilir".
- **Oturum listesi ve iptal**: `GET/DELETE /api/sessions`; mevcut `revokeSession`'ı bağla. (B-08)
- **Doğrulama düzeyleri**: `guest` (takas/ödüllü düello yok ya da düşük sınır) → `x_verified` (tam). Mevcut "kayıtlı = X çerezi" mantığı hesapla kalıcı hâle gelir.
- **Origin kuralı**: `Origin` yokluğu kararı (ENG06-03 D4) ve proxy zinciri (K1–K10) onaylanınca.

## 8. Yönetim, kurtarma ve gözlem

- **Salt okunur hesap denetçisi** (CLI/iç uç): `funds` toplamı, varlık tekliği, kilit/hold uyumu, borç değişmezi. Periyodik **defter denetim işi** tüm hesapları örnekleyerek tarar.
- **Yedek**: Firestore zamanlanmış dışa aktarma + PITR (altyapı doğrulanmadı); geri yükleme provası belgelenir.
- **Yönetici işlemleri** (ileri aşama, kullanıcı onayı): hesap dondurma, ilan iptali, sohbet temizleme, ödül düzeltme **yalnız denetim kaydıyla** (`eo_admin_log`), asla ham veri düzenleme.
- **Kill-switch** (§3.1).
- **Gözlem**: yapılandırılmış günlük (`requestId`, `accountId`, `type`, `ms`, `code`); metrik: komut gecikmesi, `version_conflict` oranı, `replayed` oranı, VM bağlam süresi, WS bağlantı sayısı, olay gecikmesi; uyarı: settlement bekleyen, void maç oranı.
- **Hız sınırı**: tüm POST ve WS mesaj türleri hesap başına; kovalar paylaşımlı depo istenirse (maliyet notu: ENG-09 Y-1) ya da örnek başına + üst sınır.

## 9. Gelecek özellikler için genişletilebilirlik noktaları (şimdi geliştirilmez)

| Gelecek özellik | Hazırlık noktası | Şimdi yapılacak |
|---|---|---|
| **Gezilebilir pazarlar / başkent** | `Topic zone:<id>`, bölge başına oyuncu sınırı, hareket mesajı hız sınırı, ilgi alanı (yalnız yakındakilere yayın) | `Topic` ve hedefli teslim (§4.1); `hub_update` şeması |
| **Yaşam becerileri, balıkçılık** | `ActionTicket` + settlement kind | `activity.start/claim` sözleşmesi ve `game.activities[]` boş alanı |
| **Co-op seferler, zindanlar** | `Room`+`Party`, çok katılımcılı settlement (her üye için tek seferlik), sunucu simülasyonu | `party.*` komutları, `Room` meta deposu, `settlement kind` kaydı |
| **Gerçek zamanlı küresel sezon/etkinlik** | `season` sunucu saatiyle, `world.event` | `eo_world_*` koleksiyon şemaları, sunucu saati tek kaynak |
| **Mobil/native istemci** | olay kutusu+`GET /api/events` (WS'siz de çalışır), `X-EO-Proto` | §3.3 ve §3.1 |
| **Moderasyon/admin** | `eo_admin_log`, kill-switch | §8 |

## 10. Karar gerektirenler (onaylı kararı değiştirebilecek noktalar)

| # | Karar | Seçenekler | Etki |
|---|---|---|---|
| **D-M1** | **İki kese mi tek otorite mi?** ENG-12'de 00 "iki kese" dedi (yerel altın yerelde). Multiplayer-first hedefi tek otorite ister | (a) iki kese kalıcı; (b) faucet'ler doğrulanabilir komutlara taşındıkça yerel kese **birleşsin**, yerel altın yalnız önbellek olsun; (c) hiç birleştirme, yalnız takas dünyası sunucuda | Yol haritasının Faz 5'ini belirler. Önerim (b) |
| D-M2 | Doğrulanamayan oyunlar (Topçu fizik) için ödül politikası | V3 kalıcı; V1 sunucu simülasyonu; ödülsüz | Erişim/maliyet |
| D-M3 | Tek örnek ile mi başlanır (§4.2 A)? | A / B | Ölçek tavanı, topoloji doğrulaması |
| D-M4 | Misafir hesabın hakları (takas, ödüllü düello) | kısıtlı / serbest | Sybil, onboarding |
| D-M5 | Hesap dokümanı bölünmesi | şimdi / ölçüme göre | Göç maliyeti |
| D-M6 | `goal.reach`: kaldır mı, koşul mu doğrulansın? | — | 01 |
| D-M7 | Yönetici işlemleri kapsamı | — | Operasyon |

## 11. Yapılmayacaklar

Yeni oyun sunucusu, yeni veritabanı motoru, yeni mekanik, ödül/fiyat/olasılık değişikliği, `economy_sources.js` politikası değişikliği, istemci animasyonunun sunucuya taşınması, gelecek özelliklerin gerçek geliştirilmesi.

## Düzeltme notu (2026-11-10, K9)
Bu belgedeki `gold.local` anlatımı (V3, tavanlı, `unknown`, takas edilemez) **eng13 ucu `d062da7` ve eng14 `7779904` kodunu yansıtmıyor.** `server/local_income.js` (ENG-13 8, kullanıcı kararı 2026-11-09): gelir tavanı yok, sunucunun hesapladığı bütün gelirler `earned` (takas edilebilir); yalnız geçerlilik denetimi (tür, tam sayı, tek istek ≤ 1.000.000). Bu nedenle D-M1 fiilen "tek kese" yönünde ilerlemiştir. Eski metin silinmedi; güncel kod esastır. Ayrıntı: `claude-context/UX_OZELLIK_SPEC.md` §1 V-1, §2.2 K9.
