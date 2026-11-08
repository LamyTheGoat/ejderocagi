# ENG-13 · Tek kese ve ejderha yaşam döngüsü (yerel ↔ sunucu senkronu)

02 Engineering · 2026-11-08 · dal `claude/eng13-gold-sync` (taban yerel `main` @ `360f860`). Yerel commit; push, merge, dağıtım yok.

Değişmeyenler: `server/economy_sources.js` (kaynak politikası, harcama sırası bound → unknown → earned), mevcut fiyat,
ödül ve olasılıklar, D4 borç kuralları, hafta atlama (sınırsız, dokunulmadı), misafir/çevrimdışı yerel akış.

## 1. Envanter: yerel altın ve varlık değişim noktaları

Sütunlar: **yer** · **ne değişir** · **ENG-12'de sunucu** · **ENG-13 kararı** · **doğrulama**.
"Tavanlı defter" = `gold.local {reason, amount}`: yerel tutar kabul edilir ama tür başına tek bildirim tavanı ve UTC günü
toplam tavanıyla (`EO_LOCAL_INCOME_DAILY_CAP`, varsayılan 15000) sınırlanır ve `unknown` (takas edilemez) girer.
Gider (`amount < 0`) yalnız düşer; istemci kendi altınını azaltabilir, artıramaz.

### 1a. Sunucunun hesapladığı (istemci miktar göndermez)
| Yer | Değişim | ENG-12 | ENG-13 komutu | Doğrulama / sınır |
|---|---|---|---|---|
| `pazar.js` Rüstem/Hatice/Nuri alım | −altın, +ejderha/yumurta/yem | `shop.*` | aynen | sunucu pazarı, sunucu fiyatı |
| `pazar.js` Rüstem'e satış, Kerim'e eşya satışı | +altın, −varlık | `dragon.sell`, `item.sell` | aynen | value × 0.6 / sellBack, sunucu varlığı |
| `ui.js` bina, arazi | −altın | `building.buy`, `land.clear` | aynen | sunucu fiyatı |
| `week.js endWeek` bakım, rol geliri, yumurta haftası | ±altın | `week.end` | **yerel hafta altını yok sayılır**, sunucu `week.end` esas | sunucu VM'inde aynı `endWeek` |
| `week.js checkGoals` hedef ödülü (13 hedef, toplam 720) | +altın | sunucu kendi durumuyla öder; yerel ayrıca öder (**DÜŞÜK-1: iki kez**) | `goal.reach {id}` | tutar sunucu `GOALS`'tan, hesap başına bir kez, `goalSource` (bound/unknown) |
| `week.js killDragon` (turnuva/çukur ölümü) | −ejderha | yok (A-7: sunucuda yaşıyordu) | `dragon.die {assetId}` | sahiplik, kilit, ilan/takas rezervasyonu (net ret) |
| `auction.js` kendi ejderhanı müzayedeye çıkarma | +altın %90, −ejderha | engelliydi (bağlı) | `auction.sell {assetId}` | sunucu teklifçileri tohumlu RNG ile oynar (aynı formül), haftada bir, `unknown` |
| `orders.js orderGive` sipariş teslimi | +altın, +ün, (+yumurta), −ejderha | engelliydi (bağlı) | `order.deliver {assetId, spec}` | gen şartları sunucu ejderhasında, altın orderGen formülüyle, haftada 3 / günde 10, `unknown` |
| `fightev.js` "Locadan Bir Teklif" satışı | +value×1.4, −ejderha | engelliydi (bağlı) | `offer.sell {assetId}` | sunucu value × 1.4, haftada 1 / günde 4, `unknown` |
| `shm_ui.js` Topçu aşama/zindan/kervan geçişi (150/180/250/500/950) | +altın | yok | `topcu.clear {mode}` | sabit tablo, canlı sunucu ejderhası şart, Topçu günlük tavanı (`EO_TOPCU_DAILY_GOLD` 12000), `unknown`; çark hakkı verir |
| `shm_ui.js` ganimet çarkı (120/220/450/900, ücretli çark −120) | ±altın | yok | `topcu.spin {wheel}` | dilim sunucuda tohumlu RNG (aynı ağırlıklar); hak yoksa ret; ücretli çark yalnız büyük çark açıkken |
| Kayıt öncesi yerel altın | — | yerelde kalıyordu | `gold.import {amount}` | bir kez, tavan `EO_LOCAL_IMPORT_CAP` (2000), `bound`, kalan atılır |

### 1b. Tavanlı defter (`gold.local`, doğrulanamayan yerel olay)
| Yer | Değişim | Tür (tek bildirim tavanı) |
|---|---|---|
| `week.js fightOutcome`, `ui.js` arena zaferi, bahis, çukur teslim cezası | ±altın | `arena` (800) |
| `race.js` giriş ücreti, ödül | ±altın | `race` (300) |
| `pageant.js` güzellik yarışması | +altın | `pageant` (800) |
| `kiraathane.js` kıraathane bahsi | ±altın | `kiraathane` (1000) |
| `endgame.js` zindan/Divan katları, iksir alımı | ±altın | `dungeon` (2500) |
| `hub.js` sefer, kervan, dünya patronu, damızlık ücreti, köy olayları | ±altın | `hub` (1500) |
| `net.js` dostluk baskını (ödülsüz oda) | +altın | `raid` (1000) |
| `content.js`, `fightev.js`, `arenastory.js`, `comic.js`, `star.js`, `social.js`, `lineage.js`, `cosmetic.js` olay/ders/süs/hibrit | ±altın | `event` (300) |
| `chibi.js` Kor Örsü, taş sentezi, cevher, aktarım (yalnız gider) | −altın | `event` gider |
| `ui.js` sefer gideri, bina yıkım iadesi, atfedilemeyen | ±altın | `other` (300) |
| Ödüllü (ranked) düello | — | zaten yalnız sunucuda (`duel_settlement`), yerel yazmaz |

### 1c. Yerelde kalan varlıklar (altın dışı; bu dilimde sunucuya taşınmadı)
| Yer | Durum |
|---|---|
| `awardChibiStones` (Topçu, arena, kervan taşları/cevherleri/kalıpları) | yerel; sunucu `chibi.stones` ayrı (R-8) |
| Topçu çarkı yem/yumurta/kalıp dilimleri, sipariş teşekkür yumurtası, olay "Sahiplen" ejderhaları | yerel-only varlık |
| Ün (`S.un`), ejderha istatistikleri, yara, görev | yerel (R-2) |
| Besleme | yerel; sunucu yemi azalmaz (R-4) |

