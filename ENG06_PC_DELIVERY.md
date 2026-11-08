# ENG06 P-C ilk dilim · Sunucu hafta komutu, hafta bileti (D2), borç (D4)

Dal: `claude/eng06-pc-week` (taban `claude/eng-06-economy` @ `05bdcf6`). Yerel commit; push, merge ve dağıtım yok.
Onaylı kararlar: D2 (hafta bileti), D4 (borç). **D1a (iflas) onaylanmadı; uygulanmadı.**

## 1. Kapsam
| Yapıldı | Yapılmadı / kapsam dışı |
|---|---|
| `week.end` sunucu komutu; mevcut `endWeek` sunucu VM'inde aynen çalışır | İstemci bağlantısı (UI'dan `week.end` çağrısı). `js/` değişmedi |
| Hafta bileti: tembel dolum, tavan, başlangıç (yer tutucu parametreler) | Sezon sonu (hafta 20) ve nesil geçişi |
| Kuluçkadaki yumurtanın haftada ilerlemesi; başlangıç yumurtası artık sunucuda çatlayabilir | Otomatik çatlama. Çatlama yine `egg.hatch` ile yapılır; `week.end` hazır yumurtaları `hatchReady` olarak döndürür |
| Haftalık bakım gideri ENG-05 kovalarından; bakiye 0'da durur, kalanı `debt` | İflas, oyunun bitişi, hesap silme |
| Borç varken harcama ve takas reddi; kazançların önce borca mahsubu | Borçlu haftada moral cezası (istemcide `S.gold<0` ile vardı; sunucuda bakiye eksiye düşmediği için tetiklenmez, bkz. açık karar K-5) |
| `debtWeeks` sayacı | Rakip ocaklar (`rivalWeek`), siparişler (`ordersWeek`), kariyer (`careerCheck`), olay seçimleri |

`endWeek` içinden çalışan bölümler: ejderha haftası (görev/dinlenme/antrenman/eşleşme kodu dahil; sunucuda görev komutu olmadığı için pratikte "boş hafta"), yorgunluk, yara, konfor/moral, kir, **yaş ve evre**, yaşlanma (`ageCheck`), lakap (`titleCheck`), yıldız ve destek rolleri (`star.js`), aynı in yakınlığı, **bakım gideri**, heykel ünü, **yumurta `w` ilerlemesi**, dilekler (`social.js`), sosyal haftası, hafta artışı, **pazar ve demirci yenilemesi** (sunucuda `shop.dragon`, `shop.egg`, `shop.item` karşılığı var), arena yenilemesi (`core.js` sürümü), turnuva kaydı, mevsim, olay seçimi (`pickEvent`; yalnız olay kimliği ve `pre` kancası, seçenek etkileri istemci etkileşimidir).

Atlanan (sunucuda karşılığı yok): `rivalWeek` (sunucu boş dolgu), `ordersWeek` ve `careerCheck` (`orders.js`/`career.js` yüklenmez; `endWeek` bunları `typeof` ile zaten atlar), `seasonNo`/`STORY2` (`season.js` yüklenmez → 1. sezon kabul edilir), arena hikâyesi (`arenastory.js` yüklenmez; sunucu `S.arena`sı `game.start`taki gibi `core.js` sürümüdür, arena sunucu otoritesi değil). Makbuzda `skipped` alanı bunu listeler.

## 2. Tasarım
- **Ayrı çalışma zamanı:** `week.end` için VM'e `data, core, week, content, bond, star, social, chibi` yüklenir (index.html sırası). Diğer komutlar eski dosya kümesiyle çalışır; davranışları değişmez. Sunucu dolgusu: `esc` (ui.js'in birebir kopyası), boş `rivalWeek`, `window: {}` (`window.__grew` için).
- **Rastgelelik sunucuda:** mevcut HMAC tohumlu `Math.random`. Sonuç (durum + makbuz) depoya yazılır; tekrar istek yeniden zar atmaz.
- **Altın defteri:** `endWeek` çalışırken `S.gold` erişimcisi her değişimi sırasıyla kaydeder ve VM içinde 0'ın altına inmesine izin vermez (istemcinin `S.neg`/iflas yolu tetiklenmez). Sonra değişimler sırasıyla uygulanır: gider → `debt.charge` (normal harcama sırası bound→unknown→earned; ödenemeyen kısım `debt`), gelir → `debt.receive(…, 'unknown')`.
- **Hedefler:** `endWeek`'in kendi `checkGoals` çağrısı ödül yazmaz (geçici boş fonksiyon); hedefler `reduceCommand`daki mevcut kaynaklı yoldan ödenir (`goalSource`, bound).
- **Kaynağı doğrulanmamış haftalık çıktılar → `unknown`** (en muhafazakâr): rol geliri (avcı), artan yem, yeni varlık (`ensure` ile), artan ün (`milestoneSources.renown`). Yem azalması beklenmez → `week_food_unreconciled` (fail-closed).
- **Güvenlik ağı:** `endWeek` sonrası `S.over` veya `S.ending` oluşursa komut `week_end_state_invalid` ile tamamen geri alınır.
- **Sunucu saati:** her iki depo `reduceCommand`a `now: now()` geçirir. İstemci zaman, hafta veya bilet alanı gönderemez (`args` boş olmak zorunda; ek üst alan `unknown_command_field`).

## 3. Komut sözleşmesi
```
POST /api/economy/command
{ "requestId": "<uuid>", "expectedVersion": <n>, "type": "week.end", "args": {} }
```
Sıra: sürüm kontrolü → `S.over` → sezon kontrolü → bilet → `endWeek` → kovalar/borç → hedefler → `debtWeeks` → yazma.

Başarılı `result`:
`week{from,to}`, `ticket{count,cap,nextAt}`, `upkeep{charged,paid,unpaid,debit{bound,unknown,earned}}`, `income{amount,source:'unknown',paidDebt}`, `debt{before,after,weeks}`, `hatchReady[eggAssetId]`, `events[id]`, `report[{dragonAssetId,lines}]`, `gen[]`, `skipped[]`, `payment`, `goals[]`. Ekonomi anlık görüntüsüne `debt` eklendi.

Hata kodları (hepsi tam geri alma):
| Kod | Durum | Anlam |
|---|---|---|
| `week_ticket_unavailable` | 409 | Bilet yok |
| `season_end_unsupported` | 409 | Hafta ≥ 20; ilerletilmez, hesap ve oyun yerinde kalır, bilet harcanmaz |
| `server_time_unavailable` | 503 | Sunucu zamanı geçersiz |
| `week_ticket_state_invalid`, `debt_state_invalid`, `week_food_unreconciled`, `week_end_state_invalid` | 409 | Bozuk durum; fail-closed |
| `debt_outstanding` | 409 | Borç varken harcama/takas |
| `version_conflict`, `request_id_reused` | 409 | Mevcut makbuz/sürüm kuralları |

İdempotency: aynı `requestId` + aynı gövde → aynı makbuz (`replayed: true`), ikinci bilet harcanmaz. ENG06_05 bulgusu (hash `expectedVersion` içerir) korundu: aynı `requestId` farklı `expectedVersion` ile `request_id_reused` alır, hiçbir şey yazılmaz. Yeniden deneme aynı gövdeyle yapılmalıdır (istemci dilimi için not). Eşzamanlı iki `week.end` (farklı `requestId`, aynı sürüm): biri geçer, diğeri `version_conflict`; tek bilet.

## 4. Veri modeli (`game_json` / `gameJson` içinde; şema değişikliği yok)
| Alan | Tip | Eski kayıtta yoksa |
|---|---|---|
| `weekTickets` | `{schema:1, count, at}`; `at` = sonraki dolumun çapası (ms, sunucu saati) | İlk `week.end`'de `{count: initial, at: now}` (yeni hesapla aynı) |
| `debt` | tamsayı ≥ 0, ≤ 2e9 | 0 |
| `debtWeeks` | tamsayı ≥ 0; art arda borçla kapanan hafta | 0 |

Dolum: `count < cap` ve `now > at` ise `n = floor((now-at)/refillMs)`, `count = min(cap, count+n)`, `at += n*refillMs` (tavana ulaşınca `at = now`). Tavanda zaman birikmez. `now <= at` (saat geri alma) → dolum yok, çapa geri gitmez. Tavan düşürülürse fazlası kırpılır.

Değişmezler: `funds.bound+unknown+earned === gold` (borç funds'a dahil değil); `debt > 0 ⇒ gold === 0`; bilet `funds`, `foodSources`, `food`, envanter ve takas teklifi şeklinin (`gold/items/dragons/eggs/food`) dışında.

**Parametreler (YER TUTUCU, `server/week_config.js`):** 3 saatte 1 bilet, tavan 8, başlangıç 6 (K6: yavaşlık riski; ölçüm sonrası ayarlanacak). Ortam: `EO_WEEK_TICKET_REFILL_MS`, `EO_WEEK_TICKET_CAP`, `EO_WEEK_TICKET_INITIAL`. Geçersiz değer açılışta hata verir.

**Borç kuralları (`server/economy_debt.js`):**
- Tek kapı `assertNoDebt`: `building.buy, land.clear, shop.food/item/dragon/egg, chibi.craft/repair, stone.synthesize, ore.convert, chibi.transfer` komut başında reddedilir; ayrıca her `spend` aynı kapıdan geçer. Satış (`item.sell`, `dragon.sell`), `egg.*`, `goals.claim`, `week.end` açıktır.
- Mahsup (`receive`): borç varken gelen her kazanç, sınıfı ne olursa olsun önce borçtan düşer; düşen kısım hiçbir kovaya girmez, kalan kendi sınıfıyla girer. Sınıf yükseltme imkânsız (fail-closed). Örnek: borç 50, earned 30 gelir → borç 20, earned değişmez.

## 5. Dosyalar
| Dosya | Değişiklik |
|---|---|
| `server/week_config.js` | Yeni. Yer tutucu bilet parametreleri + ortam okuma |
| `server/week_runtime.js` | Yeni. Bilet (sync/take), `runWeek` defteri, makbuz biçimi, `closeDebtWeek` |
| `server/economy_debt.js` | Yeni. `debtOf`, `assertNoDebt`, `receive`, `charge` |
| `server/economy_commands.js` | `week.end` şekli ve dalı; hafta VM'i; borç kapısı; satış/hedef girişleri `receive` üzerinden; snapshot'a `debt` |
| `server/economy_store.js`, `server/firestore_store.js` | Tek satır: `reduceCommand`a `now: now()` |
| `server/trade_service.js` | Zorunlu küçük kontrol: `transfer` içinde iki taraf için `assertNoDebt` (teklif doğrulaması ve onay) |
| `tests/eng06_pc_week.test.js` | Yeni, 13 test |
| `tests/eng06_economy_acceptance.test.js` | `week.end` artık desteklenen komut; listeden çıkarıldı, yerine `week.skip` ve `week.end` argüman reddi |
| `tests/firestore_store.integration.js` | Yeni P-C emülatör testi |

Bedesten (`market_service.js`) değişmedi: `buy`/`offer` zaten `market_settlement_unavailable` ile kapalı. İlan (`list`) satın alma değil ve settlement yok; borç kontrolü eklenmedi (K-6).

## 6. Testler (gerçek sonuçlar, 2026-11-08, Node v24.13.0)
| Komut | Sonuç |
|---|---|
| `npm ci` (bu worktree) | 101 paket kuruldu |
| `npm test` | **71/71 geçti** (önceki 58 + 13 yeni) |
| `npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | **9/9 geçti** (önceki 8 + 1 yeni). Yalnız emülatör; Firestore istemcisinin GCP metadata uyarısı (`MetadataLookupWarning`) görüldü, test gerçek projeye bağlanmaz (koruma satırı mevcut) |
| `npm run test:trade-ui` (Playwright) | **Koşulmadı** |

Kapsanan senaryolar: yer tutucu varsayılanlar ve ortam/geçersiz yapılandırma; bilet başlangıç, tembel dolum, kısmi süre, tavan, tavanda birikmeme, saat geri alma, bozuk bilet durumu; biletsiz ret ve durumun değişmemesi; istemci `week/now/tickets/w` reddi; yaş/evre (yavru→genç), kuluçkasız `w` sabit, kuluçkada 1→2, başlangıç yumurtası `Gece` olarak çatlar; gider bound kovadan; 19→20 geçer, 20'de `season_end_unsupported`, oyun bitmez; borç 4 hafta: bakiye 0, borç birikir, `debtWeeks` 1..4, `neg` 0, `over` false; 8 harcama komutu `debt_outstanding`; satış önce borcu öder, earned artmaz; borç kapanınca `debtWeeks` 0 ve harcama açılır; mahsup sınıf yükseltmez; bilet takas şekillerinde yok (`unknown_offer_field`); borçlu hesap teklif veremez (iki yönde); takas biletlere dokunmaz; SQLite makbuz tekrarı, `request_id_reused`, iki sekme `version_conflict`; Firestore iki örnek eşzamanlı `week.end`, örnekler arası tekrar, bilet bitişi, saat geri alma, borç, takas reddi, hafta 20.

## 7. Açık kararlar
- **K-1 · D1a iflas:** onaylanmadı. Sunucu yalnız `debtWeeks` tutar. İstemcideki "3 hafta eksi → iflas" kuralı sunucuda çalışmaz. Karar gelince `closeDebtWeek` tek uygulama noktasıdır.
- **K-2 · D2c parametreler:** 3 saat / tavan 8 / başlangıç 6 yer tutucu (K6). 01 Game Design belirleyecek. Eski kayıtlara başlangıç bileti verilmesi de bu karara bağlıdır.
- **K-3 · Mahsup kaynak sınıfı:** önerilen ve uygulanan: sınıftan bağımsız önce borç, kalan kendi sınıfıyla (fail-closed). Alternatif (ör. önce bound gelirle mahsup) ürün kararıdır.
- **K-4 · Haftalık gelir/yem/ün sınıfı:** `unknown` seçildi (en muhafazakâr). Rol ataması sunucu komutu olmadığından bugün sunucuda pratikte oluşmaz.
- **K-5 · Borçlu haftada moral cezası:** istemcide `S.gold<0` ile tüm ejderhalara -1 moral vardı; sunucuda tetiklenmiyor. Uygulanıp uygulanmayacağı karar ister (yeni mekanik icat edilmedi).
- **K-6 · Bedesten ilanı borçluyken:** kapatılmadı (satın alma/settlement zaten yok). Settlement açılırken borç kontrolü eklenmeli.
- **K-7 · İstemci bağlantı dilimi:** UI `week.end` çağırmıyor; yerel `endWeek` hâlâ istemcide çalışıyor. Sonraki dilim: istemcinin haftayı sunucu sonucundan göstermesi, bilet sayacı, `hatchReady` → `egg.hatch`, aynı gövdeyle yeniden deneme.
- **K-8 · Takas rezervasyonu:** rezerve ejderha/altın varken `week.end` yaş/gider nedeniyle `trade_reserved_*` ile reddedilir (fail-closed). Ürün davranışı onaylanmalı.

## 8. Çakışma riskleri
- **Codex P-A** (`codex/eng06-04-p1`, dokunulmadı): `server/economy_commands.js`, `economy_store.js`, `firestore_store.js` ve muhtemelen `trade_service.js` ortak. P-A'nın 14 commitsiz dosyası doğrulanmadı. Birleştirme sırası (C5) netleşmeden iki dal birlikte birleştirilmemeli. Bu dalın store değişikliği tek satırdır.
- **Codex P-C planı:** `server/week_runtime.js` adı plandaki öneriyle aynı; içerik bu dalda. Plandaki görev/ölüm/kariyer/sipariş kapsamı bu dilimde yok.
- **P-B (besleme):** yem tüketimi eklendiğinde `week_food_unreconciled` kuralı (haftada yem azalmaz) gözden geçirilmeli.
- **ENG-07 Bedesten:** settlement açılırken `assertNoDebt` aynı kapıdan çağrılmalı (K-6).
- **P-D/P-G settlement:** ödül girişleri `sources.credit` yerine `debt.receive` kullanmalı; aksi halde borç değişmezi (`debt>0 ⇒ gold=0`) bozulur ve sonraki komut `debt_state_invalid` verir (fail-closed ama kullanıcıyı kilitler).
- **VM yükü:** `week.end` her denemede 8 kural dosyasını yeni bağlamda çalıştırır (1 sn zaman aşımı). Firestore yeniden denemelerinde maliyet artar; ölçülmedi.

## 9. Doğrulanamayanlar
- Playwright UI testi koşulmadı. Gerçek istemciyle uçtan uca akış yok (istemci bağlı değil).
- `endWeek`'in görev, eşleşme, rol ve dilek dalları sunucuda tetiklenemez (komut yok); yalnız boş hafta ve kuluçka yolları test edildi. Bu dalların VM'de hatasız çalıştığı kanıtlanmadı.
- Çok örnekli gerçek Cloud Run davranışı; yalnız emülatörde iki istemci örneği.
