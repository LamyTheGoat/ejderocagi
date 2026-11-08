# ENG-08 · Ocak Sandığı (sunucu envanteri, ikonlu)

Dal: `claude/eng-08-ocak-sandigi` (taban `claude/eng-07-bedesten` @ `00d0a89`). Yerel commit; push, merge, dağıtım yok.
Sunucu kodu, `economy_sources.js`, ödül/fiyat/olasılık değişmedi. Yeni mekanik yok.

## 1. Kapsam
| Yapıldı | Yapılmadı / kapsam dışı |
|---|---|
| Bedesten'den ayrı, kart tabanlı "Ocak Sandığı" ekranı (`<dialog>`, mobilde tam ekran) | Fiyat, tahmini değer, öneri fiyat (`value()` kullanılmadı) |
| İçerik yalnız `GET /api/economy`: ejderha, yumurta, eşya, yem (adet > 0) | Cevher/kalıp/taş/öz: sunucuda kaynak kaydı yok → gösterilmez, ekranda not var |
| Sekmeler yalnız sunucuda olan türler için (Tümü/Ejderhalar/Yumurtalar/Eşyalar/Yem & İksir), arama (Türkçe harf duyarsız), sıralama (en yeni, ada göre) | Kozmetik, ekipman örnek modeli (sunucuda yok) |
| Detay: büyük çizim, ad, tür, adet, kaynak rozeti (simge + metin), rezerve durumu, kısa açıklama | Takas ekranında kalemi önceden seçme (takas UI'sinde API yok; yalnız ekranı açar) |
| **Bedestende Sat**: yalnız earned + rezerve değil + aktarılabilir kalemde; Bedesten "Satışa Çıkar" sekmesini o kalem seçili, fiyat alanı odakta açar | Sandıktan doğrudan ilan/satış (yazma yalnız Bedesten formunda) |
| **⇄ Takasa ekle**: aynı koşulda; mevcut takas ekranını açar | |
| Sunucu yok / hesap yok / okunamadı / boş sandık / arama sonuçsuz için açık boş durumlar; yerel `S` hiçbir durumda gösterilmez | |

## 2. Ekranlar ve giriş noktaları
- **Mobil (≤ 760 px):** Komuta Merkezi (`Menü`) → "Ocak Sandığı" kartı. Liste 3 sütun kart; detay listenin yerini alır, "‹ Sandık" ile dönülür.
- **Masaüstü:** HUD "🎒 Çanta" → başlıktaki "🧰 Ocak Sandığı'nı aç". Liste + 340 px detay paneli yan yana.
- Başlık normal akışta (üst üste binme yok). Yüzen "⇄ Takas" düğmesi sandık açıkken modal arka planın altında kalır, içeriği örtmez (testte `elementFromPoint` ile doğrulandı).
- Sekme satırı yatay kaydırılır; taşınca kenarda ‹ › belirteci ve ince kaydırma çubuğu görünür. Ok tuşlarıyla sekmeler arası geçiş.
- Kaynak rozetleri (renk tek başına değil, simge + metin):
  - ✦ "Kazanılmış · takas edilebilir" (earned)
  - ⛓ "Hesaba bağlı · takas edilemez" (bound: başlangıç hediyesi ya da tek seferlik hedef ödülü)
  - ? "Kaynağı doğrulanmadı · takas edilemez" (unknown)
  - ◐ "Kısmen takas edilebilir" (yalnız yem: kazanılmış + bağlı karışık; adetler ayrı yazılır)
- Durum satırı: ⏳ Bedesten'de ilanda / takas teklifinde (rezerve), ⌛ şu an aktarılamaz (görevde, kuluçkada, ekipmanlı, kuşanılmış, yadigâr, kilitli, ölü/yaşlı), ⛓ bağlı.
- Erişilebilirlik: tüm düğmelerde `aria-label`, `:focus-visible` halkası, ≥ 44 px dokunma hedefi (testte ölçüldü), `role=tablist/tab`, `aria-live` durum, kapatınca odak açan düğmeye döner, Esc kapatır.

## 3. Kullanılan uç noktalar (yalnız okuma)
| Uç nokta | Amaç |
|---|---|
| `POST /api/session`, `GET /api/economy`, `GET /api/market` | `MARKET_CLIENT.refresh()` üzerinden (ENG-07 istemcisi; ikinci istemci yok) |
| `GET /api/trade/state` | Açık takas teklifindeki varlık/yem rezervasyonu. Okunamazsa ekranda not; sunucu satışta yine denetler |

Yazma yok. Satış Bedesten'in mevcut `POST /api/market` akışıyla (ENG-07 §5 sözleşmesi) yapılır.

## 4. Dosyalar
| Dosya | Değişiklik |
|---|---|
| `js/ocak_sandigi.js` | Yeni. Saf mantık (`buildEntries`, `categories`, `filterEntries`, `sortEntries`, `sourceBadge`, `entryStatus`, `bedestenTarget`) + tarayıcı arayüzü (`window.SANDIK_UI`) |
| `style.css` | Sona `ENG-08` bloğu (`.sandik*`, `.gcard.bed-pick`); mevcut kurallar değişmedi |
| `js/pazar.js` | Küçük kanca: `UI.bedPick` ön seçimi (sayfayı kaleme götürür, kartı vurgular); sekme/kategori/çarşıya dönüş/başarılı ilanda temizlenir |
| `js/bag_social.js` | Çanta başlığına tek düğme (`data-open-sandik`) |
| `js/ui.js` | Mobil Komuta Merkezi'ne tek kart (`data-open-sandik`) |
| `index.html` | Tek satır: `js/ocak_sandigi.js` (en sonda) |
| `tests/ocak_sandigi.test.js` | Yeni, 10 birim test (DOM'suz) |
| `tests/ocak_sandigi.e2e.js` | Yeni Playwright testi (tek hesap) |
| `tests/playwright.config.js`, `package.json` | `testMatch` iki e2e dosyasını kapsar; `test:trade-ui` yalnız takas testini koşar (davranış aynı), yeni `test:ocak-sandigi` |

## 5. Testler (gerçek sonuçlar, 2026-11-08, Node v24, Windows, msedge headless)
| Komut | Sonuç |
|---|---|
| `npm ci` | Kuruldu |
| `npm test` | **95/95 geçti** (önceki 85 + 10 yeni) |
| `npx --yes --package firebase-tools firebase emulators:exec --only firestore --project demo-ejder-ocagi "npm run test:firestore"` | **10/10 geçti** |
| `npm run test:trade-ui` | **1/1 geçti** |
| `npm run test:ocak-sandigi` | **1/1 geçti** |
| `npx playwright test --config tests/playwright.config.js` (ikisi birlikte) | **2/2 geçti** |
| `ENG05_MULTI_SERVER=1` Playwright | **Koşulmadı** (sandık testi tek sunuculu SQLite) |

E2E senaryosu (390×844 mobil, sonra 1024×768): sunucu hesabı yokken boş durum ve 0 kart (yerel Kor/yumurta görünmez) → `game.start` + güvenilir test kaynağı (Kor ve biber bağlı; yumurta, muska earned; balık 1 earned + 1 bağlı) → 5 kart, sekme sayıları → filtre, arama ("muska"), ada göre sıralama → bağlı Kor'da kısayol yok + açıklama → balıkta "1 adet satışa hazır" → gerçek `POST /api/market` ilanı sonrası muska "Bedesten'de ilanda", kısayol yok → yumurtada "Bedestende Sat" → Bedesten "Satışa Çıkar" sekmesi açık, kart `bed-pick`, fiyat alanı odakta, "İlana Koy" etkin → masaüstünde Çanta → sandık, liste+detay yan yana → "Takasa ekle" takas ekranını açar. Her görünümde: diyalog genişliği ≤ viewport, yatay taşma yok, < 44 px etkileşimli öğe yok, başlık içerikle çakışmıyor, Takas düğmesi örtülü. Sayfa hatası yok.

Ekran görüntülerinde (test-results, commitlenmedi) gördüklerim: mobil liste 3 sütun, ikonlar ortada, rozetler okunur; "Eşyalar" sekmesi kesik ve sağda › belirteci görünür; detayda büyük çizim, rozet, durum kutusu, tek turuncu ana düğme ve altında "⇄ Takasa ekle" bağlantısı; masaüstünde seçili kart altın çerçeveli. Bedesten'de seçili kart "Ocak Sandığı'ndan seçildi" etiketiyle vurgulu.

## 6. Bulgular (sandık dışı, değiştirilmedi)
- **Mobil yerleşim genişliği 398 px:** 390 px öykünmede `innerWidth` 398 (sandık açılmadan önce ölçüldü). ENG-07'nin "scrollWidth 398" notuyla aynı; kaynak oyun kabuğu, sandık değil. Sandık bu genişliğe sığıyor.
- **Bedesten mobilde:** yüzen "⇄ Takas" düğmesi Rüstem Ağa'nın konuşma balonunun sağ üstünü örtüyor; sekme satırı ("Tezgâhım…") kesik ve belirteçsiz. Bedesten kartında görsel üstten kırpılıyor. (ENG-07 alanı.)
- Takas ekranı varlığı önceden seçme API'si sunmuyor; "Takasa ekle" yalnız ekranı açar.

## 7. Açık kararlar
- **K-1:** "En yeni" sıralaması sunucu dizisindeki sırayı kullanır (zaman damgası yok). Gerçek "edinme zamanı" isteniyorsa sunucu alanı gerekir (§8).
- **K-2:** Karışık kaynaklı yem tek kart (◐) olarak gösteriliyor; ayrı "kazanılmış/bağlı" kartlar istenirse değişir.
- **K-3:** Giriş noktaları Çanta + mobil Komuta Merkezi. Dock'a ayrı madalyon eklenmedi (en az müdahale). Onaylanırsa eklenebilir.
- **K-4:** Görevdeki/kuluçkadaki earned kalemde de kısayol gizli (Bedesten zaten reddeder); yalnız neden yazılır.

## 8. ENG-08 için sunucu gereksinimleri (yapılmadı, onay ister)
1. **Taş/cevher/kalıp/öz kaynak kaydı:** `chibi.stones/ores/shards/essences` için earned/bound/unknown kovası yok → sandıkta ve Bedesten'de kapalı.
2. **Kozmetik:** sunucu ekonomisinde kozmetik envanteri yok.
3. **Ekipman örnek modeli:** eşyalar yalnız `{uid, id, funding}`; kalite/+basma/örnek kimliği yok (chibi eşyaları `unlockedItems` bayrağı, varlık değil).
4. **Edinme zamanı:** varlıklarda `acquiredAt` yok; "en yeni" sıralaması yaklaşık.
5. **Rezervasyon özeti:** takas rezervasyonu için ayrı `/api/trade/state` çağrısı gerekiyor; `GET /api/economy` yanıtında hesap hold özeti (ilan + takas) tek yerde olsa istemci aynası gerekmez.

## 9. Çakışma riskleri
- **Codex ENG06-04 P1 (`codex/eng06-04-p1`, dokunulmadı):** dalda commitli yalnız plan belgesi; çalışma ağacındaki iş `index.html`, `js/net.js`, `js/economy_client.js` dosyalarını değiştiriyor (görev notu). Bu dal `net.js`/`economy_client.js`'e dokunmadı; `index.html`'de yalnız en sona bir `<script>` satırı → düşük risk, elle birleştirme kolay.
- **ENG-07 (`js/pazar.js`):** Bedesten bölümüne `UI.bedPick` kancası (≈15 satır). ENG-07 üzerinde değişiklik olursa aynı bölge.
- `js/ui.js` (mobil menü kartı) ve `js/bag_social.js` (Çanta düğmesi) birer küçük ekleme.
- Sandık `MARKET_CLIENT`'ın `state` alanlarına dayanır (`economy`, `mine`, `accountId`, `loaded`, `error`); ENG-07 istemcisi değişirse etkilenir.

## 10. Doğrulanamayanlar
- Gerçek cihaz (iOS Safari/Android Chrome) ve gerçek Cloud Run; yalnız msedge headless öykünme.
- Firestore arka uçla sandık e2e (`ENG05_MULTI_SERVER=1`).
- Ekran okuyucu ile manuel deneme yapılmadı; yalnız rol/etiket yapısı.
- Makinede başka bir oturumdan kalma (7 Kasım tarihli) Firestore emülatörü `java.exe` süreci çalışıyor; bu oturuma ait değil, dokunulmadı.
