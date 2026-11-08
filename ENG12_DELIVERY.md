# ENG-12 · Bilet sisteminin kaldırılması ve kayıtlı hesapta sunucu ekonomisi

02 Engineering · 2026-11-08 · dal `claude/eng12-server-sync` (taban yerel `main` @ `7e22956`). Yerel commit; push, merge ve dağıtım yok.
Değişmeyenler: `server/economy_sources.js` (kaynak politikası), fiyatlar, ödüller (85/35/20), olasılıklar, komisyon, D4 borç kuralları, `ocak.rebuild` (3 hafta eşik, 8 hafta bekleme), sunucu komut şeması (yeni komut ya da argüman yok).

## Commit'ler
| # | SHA | Konu |
|---|---|---|
| A | `d407a0a` | Hafta biletini kaldır (sunucu + istemci + testler) |
| B | `4229720` | Kayıtlı hesapta NPC tezgâhı ekonomisi sunucuda (`js/economy_sync.js`) |
| C | (bu commit) | Ek e2e (bina, kuluçka, satış) ve bu belge |

## 1. Bilet sisteminin kaldırılması (Görev 1)

**Gerekçe.** Hafta bileti (D2), hızlı hafta çevirerek kazanç çiftliği kurulmasını engellemek için konmuştu. Bugün sunucuda tek kazanılmış (earned) altın kaynağı, günlük sınırlı ödüllü düellodur. Hafta çevirmek altın üretmez, tersine bakım gideri çıkarır (gelir `unknown`, takas edilemez). Yani bilet bugün hiçbir şeyi korumuyor, yalnız oyunu yavaşlatıyordu.

**Yapılanlar**
- `week.end` sınırsız. `server/week_config.js` (bilet env'leri `EO_WEEK_TICKET_*`) silindi. `syncTickets/takeTicket/ticketView` kaldırıldı. Makbuzda ve `GET /api/economy` `week` görünümünde `ticket` alanı yok.
- Eski kayıt: `weekTickets` alanı (bitmiş ya da bozuk olsa bile) hiçbir şeyi kısıtlamaz. Hesabın gördüğü ilk komutta sessizce silinir (`dropLegacyTickets`). Okuma kaydı değiştirmez, alanı yok sayar.
- İstemci: yerel hafta artık hiç bekletilmez. Silinenler: "🎟 6/8" göstergesi, "Yeni hafta bekleniyor" mesajı, dolum zamanlayıcısı, `eco-wait` stili. Kalan tek gösterge kısa borç rozetidir (`Borç 120`, yalnız borç varsa). "Hafta Bileti & Borç" kartı/düğmesi "Sunucu Kesesi" oldu.
- Korunanlar: borç (D4), iflas eşiği ve `ocak.rebuild` (8 hafta bekleme), `week.end` idempotency (`requestId` + gövde hash'i), sürüm çakışması kuralı, 20. hafta nesil devri, hafta kuyruğu ve aynı gövdeyle yeniden deneme (`localStorage`).

**Alternatif yön (yalnız belge, uygulanmadı).** İleride sunucu faucet'i artarsa (ör. Topçu/zindan ganimeti sunucuya taşınırsa) iki seçenek var:
1. Kazanca bağlı tavan: hafta sayısı yerine kazanılmış altına günlük ya da haftalık tavan. Düello limitinin benzeri.
2. Gerçek zamanlı küresel sezon takvimi (D1b): sunucu haftası duvar saatine bağlanır, oyuncu haftası onu geçemez.

İkisi de 01 Game Design kararı ister.

## 2. Kayıtlı hesapta sunucu ekonomisi (Görev 2)

**Etkin olduğu durum.** X oturumlu (`MP.xVerified`) **ve** sunucuya bağlı (`ECO_LINK.linked`: oturum var, `/api/economy` okunuyor, sunucu ocağı var). Misafir, çevrimdışı, statik sunucu ya da sunucu hatasında `js/economy_sync.js` hiçbir şey yapmaz, eski yerel akış çalışır (e2e ile doğrulandı).

**Akış (oyunu yavaşlatmaz).** Yerel eylem eskisi gibi hemen uygulanır (iyimser). Sunucu komutu `ECO_LINK.exec` ile arka planda `requestId` taşıyarak gider. Bu, hafta kuyruğuyla aynı zincirdir: tek askı kuralı korunur, askıdaki komut önce aynı gövdeyle yeniden denenir, `version_conflict` bir kez yeniden denenir. Yanıt gelince sunucu durumu esas alınır (`reconcile`):
- **Tek altın:** HUD ve tüm ekranlar sunucu altınını gösterir (`S.gold` = sunucu kesesi). İlk etkinleşmede bir kez açıklama mesajı çıkar. Eski yerel kese `S.srvSync.localGold` içinde kayıtlı kalır.
- **Tezgâh:** Rüstem ve Hatice sunucu pazarını gösterir, alım sunucu pazar kimliğiyle yapılır.
- **Varlıklar** `assetId` ile eşlenir. İyimser yerel kopya, yanıttaki yeni sunucu kaydına bağlanır: önce ad/gen anahtarıyla, yoksa ilk bağlanmamış kayıtla. Çift kayıt oluşmaz.
- **Sunucuda sonradan beliren varlık** yerel ocağa da gelir: Bedesten alımı, takas, başka cihazdan alım ya da sunucuda çatlama. Gelen varlığa yeni yerel kimlik verilir, ekipmanı boş başlar.
- **Sunucudan giden bağlı varlık** yerelden de çıkar (Bedesten'de satıldı, takasla gitti).
- **Kesin ret (4xx):** yerel iyimser değişiklik geri alınır, kısa Türkçe mesaj çıkar. Altın sunucudan yeniden yazılır.
- **Belirsiz yanıt (ağ/5xx/zaman aşımı):** komut askıda kalır, sonra aynen gönderilir. Yerel değişiklik durur ve yanıt gelince eşlenir.
- **Kayıtlı hesapta yerel iflas yok:** `S.neg` sıfırlanır, yerel "iflas" sonu geri alınır. Borç ve yeniden kurma sunucudadır (D4/K5).

**Yerel durum sunucuya taşınmaz.** Sunucuya giden tek şey komut adı ve sunucunun zaten bildiği kimliklerdir: pazar kimliği, `assetId`, yem anahtarı, bina türü, arsa.

### Yönlendirilen işlemler (sunucu komutu var, istemci bağlandı)
| Yerel eylem | Sunucu komutu | Ret davranışı | Test |
|---|---|---|---|
| Rüstem'den ejderha sahiplenme (`buyD`) | `shop.dragon {id}` | geri al | e2e + birim |
| Hatice'den yumurta (`buyEgg`) | `shop.egg {id}` | geri al | e2e (ret yolu dahil) + birim |
| Nuri'den yem (`buyFood`) | `shop.food {key}` | geri al | e2e |
| Rüstem'e ejderha satışı (`sell`, bağlı ejderha) | `dragon.sell {assetId}` | geri koy | e2e |
| Kerim'e eşya satışı (`sellI`, bağlı eşya) | `item.sell {assetId}` | geri koy | **e2e yok**, aynı kalıp |
| Bina kurma (`build`) | `building.buy {kind, tile}` (sunucu arsası ayrıca seçilir) | binayı kaldır | e2e (kuluçka) |
| Arazi açma (`clear`) | `land.clear {tile}` (sunucuda açılabilir arsa) | araziyi kapat | **e2e yok**, aynı kalıp |
| Kuluçkaya koy/çıkar (`egg-in/out`, bağlı yumurta) | `egg.incubate {assetId, enabled}` | yumuşak (yerel kuluçka sürer) | e2e (çıkar) |
| Sunucu haftasında hazır yumurta | `week.end` → `hatchReady` → `egg.hatch {assetId}` | yumuşak | birim (bağlama), **e2e yok** |
| Hafta sonu | `week.end` (ENG-10) | — | e2e |

Yerel-only ejderha ya da eşyayı (sunucuda karşılığı olmayan) Rüstem'e veya Kerim'e satmak kayıtlı hesapta **engellenir** ve açık mesaj çıkar. Satış altını sunucu kesesine yazılamaz. Engellenmeseydi oyuncu satıp altını kaybederdi.

### Yönlendirilmeyen işlemler (yerel kalır)
| İşlem | Neden |
|---|---|
| Müzayede (NPC açık artırma) alım/satım | Sunucu komutu yok. Fiyat istemcideki NPC artırmasıyla belirleniyor; istemci verisine güvenilemez. Yeni komut ve kural kararı gerekir |
| Olay "Sahiplen" (kapıda bulunan yavru), sefer/hub yumurtaları, çiftleşme yumurtası | Sunucu komutu yok (yeni faucet olur, onay gerekir) |
| Kerim'den eşya alma (`buyI`, `shop.item`) | Sunucuda demirci bayrağı (`flags.smith`) yerel hikâyeyle açılıyor, sunucuda kapalı. Bağlanırsa her alım reddedilirdi |
| Kor Örsü, kalıp, taş sentezi, cevher dönüşümü, eşya aktarma (`chibi.*`, `stone.synthesize`, `ore.convert`) | Sunucu komutu var, ancak terbiyeci/örs durumu yerelde ayrı ilerliyor. Ayrı dilim gerekir |
| Eğitim, görev, bakım/besleme, Topçu ve zindan ganimeti, arena/yarış ödülleri, olay seçimleri, hedef ödülleri, Kan Tüccarı, Çayhane, siparişler | Sunucu komutu yok |

## 3. Kararlar (gerekçeli, onaya açık)
- **K-1 Tek altın = sunucu kesesi.** Kayıtlı hesapta iki ayrı sayaç kullanıcıyı karıştırıyordu, bu yüzden yerel altın sunucu altınına eşitlenir. Bunun sonucu: yönlendirilmeyen yerel altın değişimleri (olay ödülü, Topçu ganimeti, müzayede teklifi, örs, Kan Tüccarı vb.) bir sonraki eşitlemede silinir. Bu "altın yalnız sunucu komutuyla değişir" ilkesiyle tutarlı, ama bkz. R-1.
- **K-2 Sunucu taban varlıkları yerele kopyalanmaz.** İlk etkinleşmede sunucudaki mevcut varlıklar (başlangıç ejderhası Kor, yumurta) yalnız Ocak Sandığı'nda kalır. Aksi halde Ahır'da ikinci bir başlangıç ejderhası çıkardı. Bundan sonra sunucuda beliren her şey yerele de gelir.
- **K-3 Yerel varlıklar silinmez.** Kayıt öncesi ya da yönlendirilmeyen yollarla edinilen ejderha/yumurta/eşya yerelde kalır, Sandık'ta görünmez. Satışı engellenir (bkz. §2).
- **K-4 Kaynak politikası değişmedi.** Başlangıç altını ve tek seferlik hedef ödülü `bound`. Harcama önce bağlı altından düşer. Bu altınla alınan ejderha ve yumurta da `bound` olur: Sandık'ta ve Bedesten "Pazara İlan Ver" listesinde görünür ama "Hesaba bağlı" yazar, satılamaz. Kazanılmış altınla (düello) alınan varlık satılabilir. e2e iki durumu da gösterir.
- **K-5 Sunucu arsası.** Yerel ve sunucu ızgarası kayıt öncesi ilerlemeye göre farklı olabilir. Bina, aynı arsa sunucuda uygunsa oraya, değilse sunucuda uygun ilk arsaya kurulur. Arsa yalnız görünüm, ekonomi etkisi yok.
- **K-6 Kuluçka komutu yumuşak.** Sunucuda kuluçka yoksa `egg.incubate` reddedilir, ama yerel kuluçka sürer (yerel oynanış kilitlenmez).
- **K-7 Sunucuda değişiklik yok** (bilet kaldırma dışında). Komut şeması aynı. Codex ENG06-04 dosyalarından yalnız `server/economy_commands.js` (bilet satırları) değişti. `economy_store.js`, `firestore_store.js`, `net.js`, `pazar.js` bu işte değişmedi. `server.js` yalnız bir yorum satırı.

## 4. Testler (2026-11-08, Windows, Node 24, msedge headless)
| Komut | Sonuç |
|---|---|
| `npm test` | **143/143 geçti** (taban 136; bilet testleri yerine ENG-12 testleri, +7 senkron birim testi) |
| `firebase emulators:exec --only firestore … "npm run test:firestore"` | **13/13 geçti** (P-C testi: bilet yok, eski bitmiş bilet alanı yok sayılır ve silinir, saat geri alma önemsiz) |
| `npm run test:trade-ui` | **1/1** (tam Playwright koşusunda) |
| `ENG05_MULTI_SERVER=1` + emülatör + `npm run test:trade-ui` | **1/1** |
| `npm run test:layout` | **2/2** |
| `npm run test:eng10` | **5/5** (bilet beklemesi yerine "10 hafta art arda, bekleme yok"; yerleşimde borç rozeti) |
| `npm run test:eng11` | **1/1** |
| `npm run test:ocak-sandigi` | **1/1** |
| `npm run test:eng12` (yeni) | **2/2** |
| Tüm Playwright (`playwright test --config tests/playwright.config.js`) | **12/12** |

Yeni e2e (`tests/eng12_sync.e2e.js`):
1. Kayıtlı hesap (yerel X simülasyon girişi) sunucuya bağlanır. HUD sunucu altınını gösterir, bilet göstergesi yok.
2. Rüstem'den ejderha alınır: yerelde anında görünür, sunucuda `earned` kaydına bağlanır. Hatice'den yumurta ve Nuri'den yem de aynı yolla.
3. Sunucuda olmayan tezgâh kaydı denenir: iyimser alım geri alınır, altın sunucudan yazılır, mesaj çıkar.
4. Yeni ejderha ve yumurta Ocak Sandığı'nda görünür ("Bedestende Sat" kısayolu var). Bedesten "Pazara İlan Ver" listesinde de görünür, "İlana Koy" açık.
5. Üç hafta art arda beklemeden biter, sunucu haftası da ilerler.
6. Ekonomi uçları kapatılınca senkron devre dışı kalır. Yerel alım ve hafta eskisi gibi çalışır, sunucuya istek gitmez.
7. İkinci test: Kuluçka Ocağı `building.buy` ile kurulur. `egg.incubate` çalışır. Rüstem'e satış `dragon.sell` ile gider. Yerel-only ejderha satışı engellenir, sunucu altını değişmez.

Ekran görüntüleri yalnız yerelde, commit'e girmedi: `test-results/eng12/rustem-alim.png`, `sandik.png`, `bedesten-sat.png`, `cevrimdisi.png`.

**Koşulmayanlar:** gerçek telefon, iOS Safari (WebKit), gerçek Cloud Run, gerçek X OAuth (yerel simülasyon girişiyle denendi), yük testi. Tarayıcıda uçtan uca **koşulmayan** yönlendirmeler: `item.sell`, `land.clear`, sunucu haftası sonrası `egg.hatch` (bağlama mantığının birim testi var). Askıda kalan (belirsiz) bir alımın sayfa yenilemesinden sonra eşlenmesi gerçek ağ kesintisiyle denenmedi (ad/gen eşleşmesi birim testli).

## 5. Riskler
- **R-1 (önemli):** Kayıtlı hesapta yönlendirilmeyen yerel altın değişimleri kalıcı değildir (K-1). Olay, Topçu ve müzayede kazançları sonraki eşitlemede kaybolur. Bu yollarla yapılan harcamalar da (müzayede teklifi, örs, Kan Tüccarı) fiilen ücretsiz kalır. Sunucu ekonomisine zarar yok: bu yollarla edinilen varlık yereldir, satılamaz. Ama oyuncu bunu tuhaf bulabilir. Kalıcı çözüm, bu akışlar için sunucu komutlarıdır (A-1, A-2).
- **R-2:** Yerel ve sunucu ejderhası ayrı evrilir. Eğitim, görev, yara ve ölüm yereldir. Sunucu kaydı (Bedesten önizlemesi) yerel istatistikleri bilmez. Yerelde ölen bağlı ejderha sunucuda yaşar.
- **R-3:** Yerelde çatlayan bağlı yumurta, sunucu yumurtası hazır olana dek Sandık'ta yumurta olarak durur. Sunucuda kuluçka yoksa hiç çatlamayabilir. Doğan sunucu ejderhası yerel yavruya bağlanır, ama adı farklı olabilir (sunucuda yeniden adlandırma komutu yok).
- **R-4:** Yerel yem tüketimi (besleme) sunucuya yansımaz. Sunucu yemi yalnız alım ve satışla değişir. Yerel yiyen oyuncu aynı yemi Bedesten'de satabilir. Sunucu ekonomisinde yem üretilmez ama yerel "bedava besleme" olur.
- **R-5:** Tek kese geçişi: kayıt öncesi yerel altın (ör. 2000) ilk etkinleşmede sunucu kesesiyle (ör. 420) değişir. Mesaj bir kez gösterilir, eski değer `S.srvSync.localGold` içinde saklanır.
- **R-6:** Aynı hesapla iki farklı yerel kayıt yuvası kullanılırsa her yuva kendi tabanını tutar. Sunucu varlıkları her yuvada ayrı eşlenir.
- **R-7:** Codex ENG06-04 ile ortak dosya `server/economy_commands.js` (bilet satırları, küçük). Birleştirme sırası netleşmeden iki dal birlikte birleştirilmemeli. `js/ui.js` değişikliği iki satır kanca, `js/economy_link.js` yeni `exec` ve `onWeek`.

## 6. Açık işler
- **A-1:** Müzayede ve olay sahiplenmesi için sunucu komutu (fiyat ve olasılık sunucuda). Yeni mekanik/kural kararı gerekir (01 + kullanıcı).
- **A-2:** Topçu/zindan ganimeti ve diğer yerel kazançlar için sunucu faucet'i (01 kararı). Faucet artarsa §1'deki tavan seçenekleri gündeme gelir.
- **A-3:** Demirci (`shop.item`) ve Kor Örsü (`chibi.*`, taş/cevher): sunucu demirci bayrağı ve terbiyeci durumu için ayrı dilim.
- **A-4:** Yerel besleme ve yem tüketiminin sunucuya bağlanması (P-B besleme komutu).
- **A-5:** Tarayıcıda `item.sell`, `land.clear` ve `egg.hatch` için e2e. Gerçek ağ kesintisinde askıdaki alımın yenileme sonrası eşlenmesi.
- **A-6:** Eski belgeler (ENG06_PC, ENG10) bilet parametrelerinden söz ediyor. Tarihsel kayıt olarak bırakıldı, bu belge onların yerine geçer.
