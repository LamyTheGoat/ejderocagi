# ENG-07 · Gerçek oyunculu Bedesten (sunucu otoriteli, serbest fiyat)

Dal: `claude/eng-07-bedesten` (taban `claude/eng06-pc-week` @ `57d3210`). Yerel commit; push, merge, dağıtım yok.
Onaylı kararlar: D-016 (serbest fiyat; teklif ve oyuncu müzayedesi kapsam dışı), D4 (borç), ENG-05 kaynak kuralı (`economy_sources.js`, değişmedi).

## 1. Kapsam
| Yapıldı | Yapılmadı / kapsam dışı |
|---|---|
| İlan aç / geri çek / satın al; sunucu otoriteli, iki depoda (SQLite, Firestore) aynı kural | Teklif (offer): `market_settlement_unavailable` (503) ile kapalı |
| Serbest fiyat (satıcı belirler); yalnız teknik sınır | Oyuncu müzayedesi, ilan süre aşımı, ilan düzenleme |
| Yem için miktar ve kısmi satış; ejderha/yumurta/eşya miktarı 1 | Cevher/kalıp/taş/öz ilanı (sunucuda kaynak kaydı yok → fail-closed, bkz. K-3) |
| Satıcı çevrimdışıyken satış; rezervasyon (hold) | Komisyon/harç (D7 onay bekliyor; tek yapılandırma noktası = 0) |
| Atomik satın alma + makbuz/idempotency | Kapanmış ilan/makbuz temizliği (retention) |
| `js/market_client.js` + `js/pazar.js` Bedesten görünümü sunucuya bağlandı; sahte ilan yok | WS üzerinden mutasyon (kapalı; yalnız HTTP) |

## 2. Mimari
- **Saf kurallar:** `server/market_service.js` → `validateMarket`, `marketTransition`, `guardMarketHold`, `guardTradeAgainstHolds`, `publicListing`. Depolar okur → saf geçiş → tek transaction'da yazar.
- **Aktarım çekirdeği takasla ortak:** satın alma `trade_service.transfer` ile yapılır (export eklendi). Böylece: yalnız **earned** altın ödenir (`gold_not_transferable`), satıcıya **earned** girer, varlığın `funding`'i (earned) korunur, yem earned→earned kovaya geçer, yerel id/soy/ekipman yeniden eşlenir, `assertNoDebt` iki tarafa uygulanır, oyun boyu sınırı denetlenir. `trade_engine` doğrulamaları (ölü/yaşlı/görevde/kuluçkada/kilitli/yadigâr/kuşanılmış) satın alma anında yeniden çalışır; `TradeError` 409'a çevrilir (belirsiz 503 değil).
- **Rezervasyon (hold):** hesap başına tek kayıt `{schema:1, listings[], items[], dragons[], eggs[], food{}}`. Guard her `executeCommand`'da (`guardReservation`'dan sonra) ve her `executeTrade`'de çalışır:
  - ilandaki varlık hesaptan çıkamaz (`dragon.sell`, `item.sell`, `egg.hatch`, takas → `market_reserved_asset`);
  - ilandaki yem miktarı kazanılmış kovanın altına düşemez (`market_reserved_food`);
  - takas teklifi ilandaki varlığı/yemi içeremez; ilan, açık takasta rezerve varlığı/yemi içeremez (`asset_reserved`, `food_reserved`); satın alma, alıcının takasta rezerve altınını kullanamaz (`trade_reserved_gold`).
  - **Takas modelinden fark:** içerik değişimi (yaş, evre, `week.end`) engellenmez; yalnız sahiplik korunur. Aksi halde ilandaki ejderha haftayı sonsuza dek kilitlerdi. Kullanılabilirlik satın almada yeniden denetlenir.
- **Atomiklik:** SQLite `BEGIN IMMEDIATE`; Firestore `runTransaction` (tüm okumalar önce). Satın almada tek transaction: alıcı altın −, satıcı altın +, varlık el değiştirir, ilan miktarı azalır, satıcı hold'u azalır, iki hesabın `version`'ı +1, alıcı makbuzu. Herhangi bir hata → hiçbir şey yazılmaz (testle doğrulandı).
- **İdempotency:** makbuz anahtarı `(actorId, requestId)`. Hash yalnız komutun anlamsal alanlarını (sıralı anahtarlar) kapsar; **sürüm, saat, sunucu durumu yok** (ENG06_05 bulgusu: `expectedVersion` içeren hash yeniden denemeyi bozar). Aynı gövde → aynı sonuç (`replayed:true`); farklı gövde → `request_id_reused`. İlan/satış kimlikleri `sha256(actor+requestId)`'den türetilir (Firestore yeniden denemesinde kararlı).
- **Kimlik:** yalnız oturum çerezinden. Gövde katı şema; `seller`, `accountId`, `buyer` vb. alan → `unknown_market_field`. `readJsonBody(..., false)` ile sunucu da alan enjekte etmez.
- **Sahte ilan yok:** `GET /api/market` yalnız depodaki gerçek açık ilanları döndürür. WS `welcome.marketListings` artık `[]`. `WORLD.marketListings` tohum verisi `server.js`'te duruyor ama hiçbir yanıtta kullanılmıyor.
- **WS:** `market_op` → `market_error: market_http_only`. Değişiklikten sonra yayın yalnız `{type:'market_update', listingId}`; ilan listesi, satış, altın taşımaz (eski `net.js` yerel `S.gold +=` dalı tetiklenmez).
- **Limitler:** ENG-05 `economy:<accountId>` 120/dk oranı `POST /api/market`'te aynen; hesap başı açık ilan 20 (teknik); birim fiyat 1…2e9 tamsayı; `birim × miktar ≤ 2e9`; yem miktarı ≤ 100000; gövde ≤ 4 KB; liste 100, "benim" 30, satış kaydı/ilan 20.

## 3. API ve veri modeli

### `GET /api/market` (oturum isteğe bağlı)
```json
{ "ok": true, "settlementReady": true, "serverNow": 1762600000000,
  "listings": [ { "id": "mk_<32hex>", "kind": "dragon|egg|item|food", "title": "Kor", "preview": {"name":"Kor","el":"ates","sex":"M","stage":"genc","gen":1,"eye":"A","horn":"t","pat":"B","genes":{}},
                  "seller": "@gezgin_ab12cd34ef56", "mine": false, "quantity": 1, "remaining": 1, "unitPrice": 100,
                  "sold": 0, "status": "open", "createdAt": 0, "updatedAt": 0, "stateVersion": 1, "foodKey": null } ],
  "mine": [ { "...": "aynı alanlar", "mine": true, "assetId": "…", "sales": [ {"id":"ms_…","at":0,"quantity":1,"total":100,"buyer":"@gezgin_…"} ] } ] }
```
Satıcının hesap kimliği ve başkasının `assetId`'si hiçbir zaman dönmez. `preview` oluşturma anının sunucu fotoğrafıdır.

### `POST /api/market` (oturum zorunlu)
| op | Gövde (tam bu alanlar) |
|---|---|
| `list` | `{op, requestId, kind:'dragon'|'egg'|'item', assetId, quantity:1, unitPrice}` veya `{op, requestId, kind:'food', foodKey, quantity, unitPrice}` |
| `cancel` | `{op, requestId, listingId}` |
| `buy` | `{op, requestId, listingId, quantity, unitPrice}` (`unitPrice` ilan fiyatına eşit olmalı) |

Yanıt: `list/cancel → {ok, listing, replayed}`; `buy → {ok, sale:{id, listingId, kind, quantity, unitPrice, total, fee:0, at, assetId|null, foodKey|null}, listing, replayed}`.

### Depolama
| | SQLite | Firestore |
|---|---|---|
| İlan | `market_listings(id, seller_id, status, created_at, json)` + 2 indeks | `eo_market_listings/{id}` `{json, status, sellerId, createdAt}` + 2 bileşik indeks (`firestore.indexes.json`) |
| Rezervasyon | `market_holds(id=accountId, json)` | `eo_market_holds/{accountId}` `{json}` |
| Makbuz | `market_receipts(id=actor:requestId, json)` | `eo_market_receipts/{actor:requestId}` `{hash, resultJson, createdAt}` |

Mevcut tablo/koleksiyon şeması değişmedi; yalnız ekleme (`CREATE TABLE IF NOT EXISTS`).

## 4. Hata kodları
| Kod | HTTP | Anlam |
|---|---|---|
| `guest_session_required` | 401 | Oturum yok |
| `invalid_market_operation`, `unsupported_market_operation`, `unknown_market_field`, `invalid_request_id`, `invalid_listing_kind`, `invalid_asset_id`, `invalid_food_key`, `invalid_listing_id`, `invalid_quantity`, `invalid_price`, `invalid_total`, `invalid_json` | 400 | Şema/teknik sınır |
| `asset_not_owned`, `listing_not_owned` | 403 | Sahiplik |
| `listing_not_found` | 404 | İlan yok |
| `asset_not_transferable`, `food_not_transferable`, `gold_not_transferable` | 409 | Bağlı/unknown kaynak (ENG-05) |
| `asset_unavailable`, `asset_equipped`, `dragon_unavailable`, `egg_unavailable`, `item_unavailable`, `item_equipped`, `dragon_has_equipment` | 409 | Varlık şu an aktarılamaz |
| `asset_already_listed`, `asset_reserved`, `food_reserved`, `insufficient_food`, `market_listing_limit` | 409 | İlan açılamaz |
| `listing_closed`, `listing_quantity_unavailable`, `listing_price_mismatch`, `own_listing`, `listing_unavailable`, `seller_unavailable` | 409 | Satın alınamaz |
| `insufficient_gold`, `gold_limit`, `game_size_limit`, `game_not_started` | 409 | Hesap durumu |
| `debt_outstanding` | 409 | D4 borç |
| `trade_reserved_gold`, `trade_reserved_asset`, `trade_reserved_food`, `market_reserved_asset`, `market_reserved_food` | 409 | Rezervasyon çakışması |
| `request_id_reused` | 409 | Aynı `requestId`, farklı gövde |
| `rate_limited` | 429 | ENG-05 oran sınırı |
| `market_settlement_unavailable` | 503 | `offer` (kapsam dışı) |
| `market_unavailable` | 503 | Belirsiz (depo/ağ). **Başarı gösterme; aynı gövdeyle yeniden dene.** |

Ekonomi komutları ve takas artık `market_reserved_asset` / `market_reserved_food` da döndürebilir.

## 5. ENG-08 (Ocak Sandığı) için istemci sözleşmesi
1. **Kimlik:** önce `POST /api/session` (çerez). Gövdede hesap/satıcı/alıcı alanı gönderme.
2. **Okuma:** `GET /api/market` (+ `GET /api/economy` sunucu envanteri için). Satılabilir varlık listesini **yerel `S`'ten değil** `economy.dragons/eggs/items` ve `economy.game.foodSources[k].earned`'den kur; `funding !== 'earned'` olanı pasif göster.
3. **Yazma:** `POST /api/market`, her işlem için yeni `requestId` (UUID v4). Gövdeyi **gönder­meden önce** kalıcı sakla (`js/market_client.js`: `localStorage['eo-market-pending:<accountId>']`).
4. **Sonuç kuralı:** 2xx → başarı. 4xx → kesin ret; saklananı sil, sunucudan yenile, kodu göster. Ağ hatası/5xx → **belirsiz**: başarı gösterme, saklanan gövdeyi **aynen** (aynı `requestId`, aynı alanlar) yeniden gönder; yanıt `replayed:true` olabilir. Yeni işlem, bekleyen sonuçlanmadan başlamaz (`market_pending_retry`).
5. **Yayın:** WS `market_update` yalnız "yenile" sinyalidir; veri taşımaz.
6. Hazır istemci: `createMarketClient({fetch, storage, uuid, onChange})` → `refresh()`, `list(kind, assetIdOrFoodKey, quantity, unitPrice)`, `cancel(listingId)`, `buy(listing, quantity)`, `retry()`, `state{accountId, handle, listings, mine, economy, pending, busy, error, notice, loaded}`. Tarayıcıda `window.MARKET_CLIENT`.

Örnek:
```http
POST /api/market
{"op":"list","requestId":"6f1c…","kind":"food","foodKey":"balik","quantity":4,"unitPrice":10}
→ 200 {"ok":true,"listing":{"id":"mk_…","remaining":4,"unitPrice":10,"mine":true,…},"replayed":false}

POST /api/market
{"op":"buy","requestId":"9a2e…","listingId":"mk_…","quantity":3,"unitPrice":10}
→ 200 {"ok":true,"sale":{"id":"ms_…","quantity":3,"total":30,"fee":0,…},"listing":{"remaining":1,…},"replayed":false}
→ 409 {"ok":false,"error":"gold_not_transferable"}
→ 409 {"ok":false,"error":"listing_closed"}
```

## 6. Dosyalar
| Dosya | Değişiklik |
|---|---|
| `server/market_service.js` | Yeniden yazıldı: doğrulama, saf geçiş, hold guard'ları, adaptör |
| `server/economy_store.js` | 3 tablo; `executeMarket`, `listMarket`; `executeCommand`/`executeTrade`'e birer guard satırı |
| `server/firestore_store.js` | 3 koleksiyon; `executeMarket`, `listMarket`; `executeCommand`/`executeTrade` hold okuması + guard |
| `server/trade_service.js` | Yalnız `transfer` export |
| `server.js` | `/api/market` GET/POST depoya bağlandı; WS `market_op` kapalı; welcome'da sahte ilan yok; yayın sinyal |
| `firestore.indexes.json` | 2 bileşik indeks, 3 field override |
| `js/market_client.js` | Yeni. Sunucu istemcisi (bekleyen gövde, yeniden deneme) |
| `js/pazar.js` | Bedesten eylemleri + görünüm sunucuya bağlandı; tohum ilanlar, `value()` çarpanı (%90/120/160), yerel ilan/satış simülasyonu kaldırıldı. Rüstem Ağa kimliği, sekmeler, kart düzeni korundu |
| `index.html` | Tek satır: `js/market_client.js` |
| `tests/eng07_market.test.js` | Yeni, 13 test |
| `tests/market_security.test.js` | Yeni API'ye göre yeniden yazıldı (3 test) |
| `tests/server_foundation.test.js` | Bedesten HTTP testi ENG-07 davranışına göre yeniden yazıldı |
| `tests/economy_sources.test.js` | İlan çağrısı yeni şemaya uyarlandı (beklenti aynı: `asset_not_transferable`) |
| `tests/firestore_store.integration.js` | Yeni ENG-07 emülatör testi |

## 7. Testler (gerçek sonuçlar, 2026-11-08, Node v24.13.0, Windows)
| Komut | Sonuç |
|---|---|
| `npm ci` | Kuruldu |
| `npm test` | **85/85 geçti** (önceki 71 + 14 yeni) |
| `npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | **10/10 geçti** (önceki 9 + 1 yeni) |
| `npm run test:trade-ui` (Playwright, msedge, tek sunucu SQLite) | **1/1 geçti** |
| `ENG05_MULTI_SERVER=1` Playwright | **Koşulmadı** |
| Bedesten mobil duman testi (390×844, geçici betik, commitlenmedi) | Boş durum metni, sunucu envanteri, konsol hatası yok. Sekme satırı yatay taşıyor (scrollWidth 398); aynı taşma çarşı ana görünümünde de var, ENG-07 öncesi tabanla karşılaştırılmadı |

Kapsanan senaryolar: ilan aç/iptal ve hold temizliği; kısmi + tam yem satışı; çevrimdışı satıcıdan ejderha/yumurta/eşya; yetersiz altın, yalnız bound altın, kendi ilanı, fiyat uyuşmazlığı, fazla miktar (hiçbir şey değişmez); aynı `requestId` tekrarı (araya sürüm değişikliği girse de), farklı gövde reddi, anahtar sırası bağımsız hash; aynı son birim için iki alıcı (sıralı, iki ayrı SQLite işçi iş parçacığı, iki Firestore örneği); bound/unknown varlık/yem reddi; hold'un NPC satışını, takas teklifini, yem aşımını engellemesi; `week.end`'in ilandaki ejderhayı yaşlandırabilmesi; satın almada yeniden doğrulama (kuluçkaya alınan yumurta); takas rezervasyonu ile ilan/satın alma çakışması; D4 borçlu alıcı/satıcı; transfer sonrası hata → tam geri alma; katı şema, eski istemci şekli, enjekte kimlik, teknik sınırlar, ilan sınırı; HTTP 401/403/400/409/503, WS kapalı, yayın içeriği; istemcide belirsiz yanıt → aynı gövdeyle yeniden deneme, başarı göstermeme.

## 8. Açık kararlar
- **K-1 · Komisyon (D7):** `MARKET_FEE_BPS = 0`, 0 dışı değer açılışta hata. Onay gelirse tek nokta burası; gider kovası/sink kararı gerekir.
- **K-2 · Teklif/pazarlık ve müzayede:** kapalı.
- **K-3 · Kaynak sınıfı:** takasla aynı (earned altın öder, earned girer, varlık `funding` korunur). Taş/cevher/kalıp/öz için sunucuda kaynak kaydı yok → ilan **kapalı** (fail-closed). Açmak için önce kaynak takibi kararı.
- **K-4 · Süre aşımı:** ilanlar satılana/geri çekilene dek açık. Süre ve otomatik iade karar ister.
- **K-5 · Borçlu satıcı:** ilan açamaz (en muhafazakâr). İlan açıkken borca düşerse satın alma `seller_unavailable` ile reddedilir; geri çekme serbesttir. Alternatif: satış geliri `debt.receive` ile önce borcu öder.
- **K-6 · Rezervasyon kapsamı:** hold sahipliği korur, içeriği değil. Yaşlanan/ölen ejderha: ölüm hesaptan çıkarma olduğu için `week.end` `market_reserved_asset` ile reddedilir (satıcı ilanı geri çekmeli). Kuluçka gibi durumlar ilanı satın alınamaz yapar ama açık bırakır.
- **K-7 · Alıcı in kapasitesi:** takas gibi Bedesten de alıcının boş in yerini denetlemez (mevcut takas davranışı; yeni kural icat edilmedi).
- **K-8 · Önizleme:** `preview` oluşturma anı fotoğrafıdır; ejderha sonradan yaşlanırsa ilan kartı eski görünebilir.
- **K-9 · Yerel ↔ sunucu:** Bedesten sunucu hesabını kullanır; yerel oyundaki varlıklar ayrıdır (takas ekranıyla aynı not). Yerel `S` migrasyonu ENG06-04 kapsamında.

## 9. Çakışma riskleri
- **Codex ENG06-04 P1 (`codex/eng06-04-p1`, dokunulmadı, içerik doğrulanmadı):** ortak dosyalar `server/economy_store.js`, `server/firestore_store.js`, `server/trade_service.js`, `server.js`, `js/pazar.js`, `index.html`. Store'lardaki değişiklik `executeCommand`/`executeTrade`'de birer satır guard + `getAll`'a bir belge; geri kalanı yeni fonksiyon. `js/pazar.js` Bedesten bölümü tamamen değişti — P1 aynı bölgeye dokunuyorsa elle birleştirme gerekir. `js/net.js` ve `js/economy_client.js` değişmedi.
- **P-C (`57d3210`):** üstüne kuruldu; `economy_debt.assertNoDebt`/`debtOf` kullanıldı, değiştirilmedi.
- **Ödül settlement (P-D/P-G):** yeni gelir girişleri `debt.receive` kullanmalı; Bedesten'in seller-in-debt reddi (K-5) bu kurala dayanır.
- `net.js`'te eski `market_update.sale → S.gold +=` dalı hâlâ duruyor; sunucu artık `sale` göndermiyor. Dosya Codex ile ortak olduğu için silinmedi.

## 10. Doğrulanamayanlar
- Çok örnekli gerçek Cloud Run; yalnız emülatörde iki istemci örneği. Firestore bileşik indeksleri yalnız dosyada; gerçek projede oluşturulmadı.
- `ENG05_MULTI_SERVER=1` Playwright ve Bedesten için uçtan uca tarayıcı testi (yalnız duman betiği).
- Mobil yatay taşmanın ENG-07 öncesi de var olduğu varsayımı tabanla ölçülmedi.
