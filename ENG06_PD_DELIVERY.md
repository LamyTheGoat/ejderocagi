# ENG06 P-D dilim 1 · Ejderha Düellosu: sunucu savaşçısı, maç kaydı, tek seferlik earned ödül

Dal: `claude/eng06-pd-duel` (taban `claude/eng-09-fixes` @ `d8fe012`). Yerel commit; push, merge ve dağıtım yok.
Uygulanan kararlar (kullanıcı adına, OVERNIGHT_DECISIONS): **K7** (oynanış altını earned), **K8** (ilk earned kaynağı düello), **K9** (Sybil, yer tutucu), **K10** (forfeit, yer tutucu). Kapsam: ENG06_05_DESIGN §9 **D-1 + D-2 + D-3**. D-4'ün ek sezgileri ve D-5 kapsam dışı.

## 1. Kapsam
| Yapıldı | Yapılmadı |
|---|---|
| Ödüllü (ranked) oda: savaşçı sunucu defterindeki ejderhadan, VM'de `fighterFromDragon` + `seasonMult` (istemcinin `js/net.js:318` formülüyle aynı) | İstemci bağlantısı (`js/net.js`, `js/dragon_duel.js` değişmedi) |
| Sahiplik ve uygunluk: defterde yok / ölü / görevde / `tradeLocked` / takas teklifinde / Bedesten ilanında / başka aktif düelloda → ret | D-4 anlaşmalı teslim ek sezgileri (hesap yaşı, IP, azalan getiri) |
| Kalıcı `matches` kaydı: iki hesap, ejderha varlığı, savaşçı fotoğrafı, `seed`, tur günlüğü, durum `active/final/void` | D-5 çok instance / oda kalıcılığı (tek instance varsayılır) |
| Tohumlu RNG (HMAC, ekonomi VM deseni); kazanan kesinleşmede seed + günlükten **yeniden oynatılarak** depoda belirlenir | Ün +3, T2 taş, bağ, yorgunluk, galibiyet sayacı (yalnız altın taşındı) |
| Aktif maç kilidi: kilitli ejderha satılamaz, takas teklifine konamaz, ilan edilemez, ikinci maça giremez | Dünya/Divan/bahis çarpanları (A-10) |
| `settleGameplay` + `gameplay_settlements`: `(eventId, accountId, kind)` tekil, tek transaction (altın + borç mahsubu + earned kova + günlük sayaç + kayıt) | Otomatik settlement yeniden deneme kuyruğu (outbox) |
| K9 çift/hesap günlük limiti, aynı hesap reddi; K10 terk/teslim kuralı | Topçu, yarış, ödül miktarı değişikliği |

## 2. İki oda türü (geriye dönük uyum)
- **Vitrin (eski) oda:** `duel_invite` içinde `dragonAssetId` **yoksa**. Davranış birebir eskisi gibi: savaşçı `/api/sync` `duelFighter`, kayıt yok, **ödül yok**, settlement yok. Bugünkü istemci bu yolu kullanır; bozulmadı (`tests/duel_server.test.js` ve yeni test).
- **Ödüllü oda:** davet ve kabul `dragonAssetId` taşır. Her iki soketin de oturum hesabı (`playerInfo.accountId`) olmalı ve farklı olmalı. `duelFighter` tamamen yok sayılır.
- Bot/yerel maçlar (`startLiveDuelRoom`, hub modları, X kodu, Ocak Baskını) sunucu odası açmaz; settlement'a hiçbir yoldan ulaşamaz. Sunucuda bot düellosu yoktur.
- **Bulgu:** Vitrin odasında sahte `duelFighter` hâlâ sonucu belirler (X-2), ama o oda hiçbir zaman ödeme yapmaz. İstemci bağlanınca vitrin yolu kapatılabilir (açık karar A-12 önerisi).

## 3. Veri modeli
| Öğe | SQLite | Firestore |
|---|---|---|
| Maç | `matches(id PK, status, created_at, json)` | `eo_matches/{matchId}` `{json,status,createdAt,expiresAt}` |
| Aktif maç kilidi | `duel_locks(id=accountId, json)` `{matchId,dragonAssetId,expiresAt}` | `eo_duel_locks/{accountId}` |
| Günlük sayaç | `gameplay_daily(id='gameplay-daily:<acc>:<YYYY-MM-DD>', json)` `{total,pairs{opp:n}}` | `eo_gameplay_daily/{acc}:{day}` |
| Settlement | `gameplay_settlements(event_id, account_id, kind, applied_version, created_at, result_json)` PK `(event_id, account_id, kind)` | `eo_accounts/{acc}/settlements/{eventId}:{kind}` (`tx.create`) |

Maç: `{schema:1, id:'dragon_<20hex>', kind:'dragon_duel', ruleVersion:'dragon_duel/1', seed:<64hex>, status, createdAt, expiresAt, finalAt, participants:[{accountId, handle, dragonAssetId, fighter}], result:{log:[{round, actions:[p1,p2]}], winner, endReason: ko|timeout|surrender|draw_surrender|leave|disconnect, forfeitBy[], rounds, playedRounds, finalHp[]}}`. `final`/`void` kayıt yeniden yazılamaz (`match_closed`). Varlığa yeni alan eklenmedi (K-3); `game_json` şeması değişmedi.

## 4. Sözleşme (sunucu içi; istemci komutu yok)
Depo yöntemleri (iki depoda aynı, yalnız `js/duel_server.js` çağırır): `checkDuelEntry(acc, dragonAssetId)`, `openMatch({matchId, seed, participants})`, `finalizeMatch(matchId, {log, forfeit})`, `settleGameplay(acc, {eventId, kind:'duel.reward'})`, `readMatch(id)`. `/api/economy/command` `duel.result`/`arena.win` hâlâ `unsupported_command`.

WS (ek alanlar; eski istemci yok sayar):
- `duel_invite {to, dragonAssetId}` → rakibe `duel_invite {id, from, dragon(defter), ranked:true}`
- `duel_invite_reply {inviteId, accept, dragonAssetId}` → `duel_room_start {..., ranked:true, matchId}`
- Bitişte, commit'ten **sonra**, her oyuncuya: `duel_settlement {roomId, matchId, status:'paid'|'no_reward'|'pending', outcome, reason, amount, source:'earned', paidDebt, credited, economyVersion, matchStatus}`
- Hata: `duel_error {message, code}`; kodlar: `dragon_not_owned, dragon_busy, dragon_trade_reserved, dragon_market_listed, duel_busy, same_account, game_not_started, invalid_dragon_asset, account_required`. Kilit ihlali diğer komutlarda: `duel_locked_asset` (409).
- `duel_action` içindeki `winner/gold` gibi alanlar okunmaz; kesinleşmede de istemci alanı kabul edilmez.

## 5. Ödül kuralları ve yer tutucular
- Tutarlar mevcut kodla aynı, sabit: **zafer 85, beraberlik 35, yenilgi 20** (`server/duel_config.js DUEL_REWARDS`, env ile değişmez). Kaynak: `debt.receive(game, amount, 'earned')`.
- **Neden yeni kaynak türü yok:** `economy_sources.js` değişmedi; mevcut `earned` kovası ve politikadaki "Repeatable verified gameplay rewards may be earned" cümlesi kullanıldı (en muhafazakâr yol).
- **K10:** terk eden (`duel_leave`, 30 sn kopma, `teslim`) 0 alır; kazanan yalnız `playedRounds ≥ N` ise 85 alır (`playedRounds` = teslim içermeyen çözülmüş tur). İki taraf da teslimse ikisi de terk eden sayılır. Teslimle yenilen 20 teselli almaz.
- **K9:** ödüllü maç = tutarı > 0 settlement (yenilgi 20 de sayılır). Hesap kendi gözünden sayar: aynı rakiple günde ≤ 3, toplam günde ≤ 10. Gün = maçın `finalAt` **UTC** günü (yeniden denemede kaymaz). Aynı hesap: maç açılmaz ve settlement `same_account`.
- **D4:** borçlu hesap ödül alır; önce borç düşer, kalan earned girer; `debt>0 ⇒ gold=0` korunur.
- Fail-closed: `expiresAt` sonrası kesinleşen maç `void`, ödül yok; kesinleşmemiş maç için settlement `match_not_final`.
- Env (yer tutucu): `EO_DUEL_PAIR_DAILY_LIMIT=3`, `EO_DUEL_ACCOUNT_DAILY_LIMIT=10`, `EO_DUEL_FORFEIT_MIN_ROUNDS=3`, `EO_DUEL_MATCH_TTL_MS=3600000`. Geçersiz değer açılışta hata.

## 6. Testler (gerçek sonuçlar, 2026-11-08, Node v24.13.0, bu worktree'de `npm ci`)
| Komut | Sonuç |
|---|---|
| `npm test` | **116/116 geçti** (önceki 102 + 14 yeni, `tests/duel_settlement.test.js`) |
| `npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | **12/12 geçti** (önceki 11 + 1 yeni). Yalnız emülatör, port 8089 |
| `npm run test:trade-ui` | **1/1 geçti** (tek sunucu; `ENG05_MULTI_SERVER=1` iki sunuculu koşu **koşulmadı**) |
| `npm run test:ocak-sandigi` | **1/1 geçti** |
| `npm run test:layout` | **2/2 geçti** |

Kapsanan: sahte `duelFighter` etkisiz; başkasının/sahte/satılmış/takas teklifindeki/ilandaki ejderha reddi (davet ve kabul); maç kaydı, seed, tekrar üretim ve determinizm; aynı maç ikinci kez ve eşzamanlı (SQLite 3 paralel, Firestore iki örnek) tek ödeme; K9 çift limiti ve UTC gün sıfırlaması, hesap limiti 10; vitrin odası ve aynı hesap/hesapsız soket ödülsüz; K10 1 turda terk, ilk turda teslim, 3 turdan sonra terk; borç mahsubu; earned ve `funds` toplamı = `gold`, `tradable` sınırı; aktif maçta satış/takas teklifi/ilan/ikinci maç reddi (SQLite ve Firestore çapraz örnek); süre aşımında `void`; bozuk günlük (yasa dışı hamle, yanlış tur, 31 tur) reddi; config varsayılan/env/geçersiz.

**Koşulmayan / doğrulanmayan:** iki sunuculu Playwright; gerçek tarayıcıda ödüllü düello (istemci bağlı değil); 30 sn kopma zamanlayıcısı gerçek süreyle (kesinleşme yolu saf testle); gerçek Cloud Run çok instance.

## 7. Açık kararlar
- **A-9 çok instance:** odalar süreç içi `Map`. Farklı instance'taki oyuncular eşleşemez; restart'ta oda kaybolur, kayıt `active` kalır, TTL sonrası kesinleşirse `void`. TTL dolmadan kesinleşmemiş kayıt temizleyicisi yok (kilit TTL'de kendiliğinden düşer). D-5'e bırakıldı.
- **A-10 Divan/dünya/bahis çarpanları:** sunucu yalnız taban tutarı öder (çarpanlar ≥ 1 olduğundan istemciden fazla değil, ama eksik olabilir). Onay gerekir.
- **A-12 (yeni öneri):** istemci bağlanınca vitrin odası kapatılsın mı?
- Yenilgi tesellisi (20) earned ve K9 sayacına giriyor; kasıtlı yenilgi çiftliği hesap limiti ile sınırlı. D-4'te gözden geçirilmeli.
- Kilitli ejderhalı hesapta `week.end` engellenmez (içerik değişebilir, savaşçı fotoğraflanmıştır).
- Settlement başarısız olursa 3 deneme; sonra `status:'pending'` (para yok, fail-closed). Kalıcı outbox sonraki dilim.
- Yarış (P-E) sonraki earned kaynağı; bu altyapı (`settleGameplay`, `kind`) genişletilebilir.

## 8. Çakışma riski
- **Codex P-A (`codex/eng06-04-p1`, dokunulmadı):** `server/economy_store.js` (+62 satır, 3 satır guard + yeni bölüm), `server/firestore_store.js` (+73, `getAll` listeleri genişledi), `server.js` (1 satır). `economy_commands.js` **değişmedi** (savaşçı VM'i ayrı modülde: `server/duel_service.js`). Birleştirmede `executeCommand/executeTrade/executeMarket` içindeki `guardDuelLock` satırları korunmalı.
- **P-C:** `economy_debt.receive` aynen kullanıldı. **ENG-07:** `executeMarket` içine yalnız kilit kontrolü eklendi. **ENG-09:** etkisiz.
- `js/duel_server.js` ve `js/duel_engine.js` yalnız sunucuda yüklenir (`index.html` yalnız `dragon_duel.js` yükler).

## 9. İstemci bağlama sözleşmesi (sonraki dilim)
1. Davet: `mpSendDragonDuelInvite` meydan ejderhasının sunucu `assetId`'sini (`/api/economy` snapshot `dragons[].assetId`) `dragonAssetId` olarak göndermeli; kabulde aynı alan.
2. `duel_room_start.ranked === true` ise `mpOpts.serverRoom` odasında `finishMpFight` **altın yazmamalı** (`S.gold += 85/35/20` yerine) ve yerel ün/taş/bağ ödülü de ranked'te gösterilmemeli ya da "yerel" diye etiketlenmeli.
3. `duel_settlement` gelince ödül metnini bu mesajdan göster; `economyVersion` ile ekonomi snapshot'ını yenile. `status:'pending'` → "Ödül işleniyor"; `no_reward` → `reason` metni (`daily_pair_limit`, `daily_account_limit`, `forfeit_too_short`, `forfeit_leaver`, `match_expired`).
4. Rakip görseli `players[i].dragon` (defter ejderhası) kullanılmalı.
5. `duel_error.code` → kullanıcı metni; özellikle `dragon_trade_reserved`, `dragon_market_listed`, `duel_busy`.
6. `economyReady:false` kaldırılmadan ranked yol UI'da açılmamalı.

## 10. Dosyalar
`server/duel_config.js` (yeni), `server/duel_service.js` (yeni), `js/duel_server.js` (ranked yol; vitrin yolu korundu), `js/duel_engine.js` (isteğe bağlı RNG), `server/economy_store.js`, `server/firestore_store.js`, `server.js` (1 satır), `tests/duel_settlement.test.js` (yeni), `tests/firestore_store.integration.js` (+1 test).
