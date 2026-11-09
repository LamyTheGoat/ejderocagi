# ENG-14 · Topçu PvP oda sistemi (1v1) — teslim notu

Dal: `claude/eng14-pvp-rooms` (taban `main` @d062da7). Yerel commit; push/merge/deploy yok.

## Yapılanlar
1. **Sunucu oda kaydı** (`server/pvp_rooms.js`, bellekte): oda kur / listele / kodla (`EJD-xxx`) katıl / ayrıl / hazır / harita / bot (prova) / çıkar / başlat; doluluk; boş oda anında, hareketsiz bekleme odası 10 dk, bitmiş oda 5 dk sonra temizlenir. Hızlı savaş kuyruğu: sunucu eşleştirir, iki tarafa 5 sn "Hazırım" kartı; karşılık yoksa yanıt vermeyen düşer, hazır diyen aramaya döner; 30 sn bulunamazsa istemciye bildirim (arama sürer, "oda kur ve davet et" önerisi). `server.js`'e bağlama 6 satır.
2. **Can ve tur eşitleme** (`shm_pvp.js`, `minigame.js`): tek yetkili model. Atan taraf `fire` + `hit {dmg}` yollar; alıcı hasarı **kendi** canına yazar (kendi kalkan/zırh kuralı) ve `hp_sync {hp,maxHp}` döner, atan taraf rakip canını buna eşitler (eski ters `rivalHp` hatası giderildi). Sıra sunucunun seçtiği `firstTurn` ile başlar, `turn_handoff {turnNo}` ile ilerler; rüzgâr sunucu tohumundan tur numarasıyla iki tarafta aynı (her taraf kendini solda gördüğü için kırmızı yuva işareti ters). Canı biten taraf `pvp_match_result {lose}` yollar, sunucu iki tarafa tek `pvp_match_end {winner}` yollar. Canlı rakip varken yerel bot ateş etmez.
3. **İstemci arayüzü** (`js/minigame/shm_pvp_rooms.js` yeni): lobi (Hızlı savaş "Rakip bul" + 2v2 "Yakında", Oda kur + harita, Kodla katıl, Açık odalar, boş durum "İlk odayı sen kurabilirsin", çevrimiçi arkadaşlar: dokun → oda kurulur, davet gider), bekleme odası (iki yuva, hazır, kodu kopyala, arkadaş davet, kurucu "Savaşı başlat" herkes hazırken, "Odadan çık", bot ekle/çıkar, oyuncuyu çıkar), üstte düşen davet kartı (Reddet/Kabul et/✕; kabul doğrudan bekleme odası, Topçu kapalıysa açılır), hızlı savaş arama + Hazırım kartı, kopma katmanı (geri sayım, "Beklemeden çık"), ortak maç sonu (Zafer/Yenilgi, tur/hasar/isabet, "Rövanş iste"/"Rövanşı kabul et", "Tekrar hızlı savaş", "Lobiye dön"). Sahte 6 oda, ölü `pvpFormationHtml`, istemci içi kuyruk/davet kodu silindi. Mobil önce: 375 px tek sütun, 700 px iki, 1000 px üç sütun; dokunma hedefleri ≥44 px; uzun mahlaslar kırpılır.
4. **Testler**: `tests/eng14_pvp_rooms.test.js` (9 birim), `tests/eng14_pvp.e2e.js` (4 senaryo, çok bağlamlı). `npm run test:eng14` eklendi.

## Protokol (istemci → sunucu)
`pvp_lobby_sub {friends}` · `pvp_lobby_unsub` · `pvp_room_create {mapId, chibi, el}` · `pvp_room_join {roomId|code}` · `pvp_room_leave` · `pvp_room_ready {ready}` · `pvp_room_map {mapId}` · `pvp_room_bot {add}` · `pvp_room_kick {slot}` · `pvp_room_start` · `pvp_room_invite {to}` · `pvp_invite_reply {roomId, accept:false}` · `pvp_queue_join {mode}` · `pvp_queue_leave` · `pvp_queue_ready {matchKey}` · `pvp_match_result {matchId, result:'lose'}` · `pvp_rematch` · `pvp_sync {action: move_aim|fire|hit|hp_sync|turn_handoff|taunt, turnNo, ...}`.

Sunucu → istemci (yalnız ilgili oyuncuya): `pvp_lobby {rooms, online}` (yalnız lobi abonelerine) · `pvp_room {room, you, notice?}` · `pvp_room_left` · `pvp_room_closed` · `pvp_error {code,message}` · `pvp_invite` (yalnız `to`) · `pvp_invite_sent` · `pvp_invite_declined` · `pvp_queue_state {searching|dropped|idle, slow?, requeued?}` · `pvp_queue_found {matchKey, opponent, mapId, readyMs}` · `pvp_queue_peer_ready` · `pvp_match_start {matchId, mapId, mode, seed, firstTurn, slots, rival, quick}` (tek mesaj) · `pvp_sync` (yalnız odadaki rakip) · `pvp_peer_left {graceMs}` · `pvp_peer_back` · `pvp_match_resume` · `pvp_match_end {winner, loser, reason: ko|forfeit|disconnect}` · `pvp_rematch_pending`.

## Kararlar (gerekçeli, kullanıcı onayı gerekmeyen uygulama kararları)
- Ödül/altın/ün/sıralama yok; bot provası da ödülsüz. PvP ve prova `completeSahmeranDungeonVictory`'ye (taş/altın) girmez, ayrı sonuç ekranına gider. `economy_sources.js` ve ekonomi komutlarına dokunulmadı.
- Hile koruması / yeni tavan / doğrulama yok (kullanıcı kararı). Sunucu yalnız yönlendirir; harita kimliği yalnız listedekiyle sınırlanır (veri düzeni, hile katmanı değil).
- Anka dirilişi (mevcut mekanik) PvP'de korundu ve eşitlendi: dirilen can `hp_sync` ile rakibe yazılır; ölüm kararını yalnız can sahibi verir.
- Maçta ayrılan hükmen kaybeder; rakip kopukken "Beklemeden çık" diyen kalan oyuncu hükmen kazanır. Bekleme odasında kopan oyuncu hemen odadan düşer; kurucu ayrılırsa kalan oyuncu kurucu olur.
- Rövanşta önceki maçı kaybeden ilk atışı yapar.
- Rakibin konumu ayna tahminidir (`3400 - x`); düşme/ölüm kararı rakibin kendi ekranında verilir, bu ekranda canlı rakip uçuruma düşürülmez.
- PvE sefer daveti (`pvp_sync` + `raidId`, PvP değil) eski yayın yolunda bırakıldı; PvP `pvp_sync` herkese yayından çıkarıldı.
- Sosyal paneldeki "VS Topçu" artık gerçek oda daveti (Topçu lobisi açılır, oda kurulur, davet gider).

## Testler
Koşulan (bu dalda, hepsi geçti):
- `npm test`: **173/173** (164 önceki + 9 yeni).
- Playwright tümü (`tests/playwright.config.js`): **21/21** — trade-ui, ocak-sandigi, layout (eng09), eng10, eng11, eng12, eng13, eng14 (4).
- Firestore emülatörü `npm run test:firestore`: **14/14**.
- İki sunuculu `ENG05_MULTI_SERVER=1` + emülatör `test:trade-ui`: **1/1**.
- E2E kapsamı: A (kayıtlı) oda kurar, B (misafir, 375 px) listede görür, katılır, hazır, başlat; aynı harita, aynı tohumdan aynı (ayna) rüzgâr, aynı ilk tur sahibi; atışla can iki tarafta aynı; rakip sırasında 2,5 sn bot ateşi yok; ölümde iki tarafta Zafer/Yenilgi ve aynı kazanan; rövanş (kaybeden başlar); kopma → katman → hükmen Zafer; üçüncü bağlam C yalnız `pvp_lobby` aldı (hiç maç/oda/davet mesajı yok); davet kartı + kabul + "Beklemeden çık"; hızlı savaş eşleşmesi ve Hazırım kartı; "← Lobi" ile ayrılan hükmen kaybeder; 375/768/1000 px yatay taşma yok, düğmeler ≥44 px, 1000 px'te 3 sütun; bot provası altını değiştirmez; PvE Topçu aşama 1 zaferi.
- Ekran görüntüleri: `test-results/eng14/` (16 adet).

Koşulmayan: gerçek cihazda (dokunmatik telefon) elle deneme; gerçek X OAuth (yalnız yerel mock); `verify_ui.js` (önceden var olan neon renk uyarıları veriyor, bu işle ilgisiz).

## Riskler / açıklar (dürüst)
- **Oda kaydı bellekte, tek sunucu örneği.** Cloud Run'da birden çok örnek açılırsa iki oyuncu farklı örneklere bağlanınca birbirinin odasını göremez; sunucu yeniden başlarsa odalar ve süren maçlar kaybolur. Çok örnekli dağıtım için yapışkan oturum ya da ortak kayıt (Firestore/Redis) gerekir (ayrı iş).
- Arazi iki tarafta birebir aynı değil: atış görseli rakip ekranında ayna konumdan çizilir, krater izleri farklılaşabilir. Can, sıra, rüzgâr ve sonuç eşit; görsel iz eşit değil.
- Sayfa yenilenirse maç sürdürülemez: yeniden bağlanan istemci maçtan dürüstçe çıkar (hükmen yenilgi). Yalnız WS kısa kopup geri gelirse (sayfa açıkken) maç sürer.
- Tur süresi yalnız sıra sahibinin ekranında sayar; sıra sahibinin sekmesi arka planda donarsa rakip kopma süresine kadar bekleyebilir (soket açıksa hükmen işlemez).
- Hile koruması yok (kullanıcı kararı): istemci `hit`/`result` bildirimine güvenilir. Ödül bağlanacaksa önce sunucu yetkili atış/çarpışma gerekir.
- "Verdiğin hasar" istatistiği öldürücü atışta can fazlasını da sayabilir (yalnız gösterim).
- 2v2 kapalı ("Yakında"); eski 2v2 savaş kodu bot provası dışında kullanılmıyor.

## Ortak dosya değişiklikleri (Codex için)
- `server.js`: `createPvpRooms` require + kurulum (test için `PVP_DISCONNECT_GRACE_MS`), `onConnect`/`onDisconnect`/`onMessage` bağlama, eski herkese `pvp_sync` yayını kaldırıldı (yalnız PvE `raidId` daveti kaldı).
- `js/net.js`: `pvp_*` mesajları `onPvpNetMessage`'a; `welcome`'da `pvprOnReconnect`; `pvp_*` BroadcastChannel'a yazılmaz; `MP.pvpPeers` artık doldurulmuyor.
- `js/bag_social.js`: PvP davet seçimi ve "VS Topçu" gerçek oda davetine bağlandı.
