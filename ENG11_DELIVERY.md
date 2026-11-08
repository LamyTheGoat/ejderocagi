# ENG-11 · Takas girişleri ve takas ekranı sadeleştirmesi

Dal: `claude/eng11-trade-ux` (taban: yerel `main` @1129083). Yalnız yerel commit; push, merge ve deploy yok.

## Geri bildirim
1. "Sürekli takas işareti istemiyoruz; takas arkadaş listesinden veya oyuncu profilinden yapılacak."
2. "Takas arayüzü Excel tablosu gibi, anlaşılması zor."

## Yapılanlar

### A · Yüzen Takas düğmesi kaldırıldı (9dac5ab)
- `.trade-entry` (her ekranda sağ üstte duran "⇄ Takas") ve CSS kuralları silindi. Mobil Menü ve dock'ta kalıcı takas girişi yoktu.
- Yeni girişler, ikisi de `[data-trade-with="@mahlas"]` → `TRADE_UI.openWith(mahlas)`:
  - **Arkadaş listesi** (`js/bag_social.js`): her arkadaş satırında "⇄ Takas teklif et". NPC muhafızlarda gösterilmez, çünkü onlarla sunucu takası yok.
  - **Oyuncu profili** (`js/hub.js`, Meydan akran kartı): canlı oyuncuda "⇄ Takas teklif et".
- **Gelen davet bildirimi** (`.trade-pop`): yalnız sana gelen bir davet varken ya da pencere kapalıyken açık bir takasın kaldığında görünür. Kapatılabilir; kalıcı değildir.
- Mevcut `[data-open-trade]` (Bedesten "takas hesabını hazırla") ve Ocak Sandığı "Takasa ekle" girişleri çalışmaya devam eder (`TRADE_UI.open()`).

### B · Takas ekranı yeniden tasarlandı, yalnız görünüm (6992daf)
- Başlık "@oyuncu ile takas"; altında tek satır "Kesende N altın".
- Adımlar: **1 Seç → 2 İncele (Takas özeti: Veriyorsun / Alıyorsun) → 3 Onayla**.
- İki kart: "Sen veriyorsun" ve "@oyuncu veriyor". Mobilde alt alta, 720 px ve üstünde yan yana. Her kalemde ikon/görsel, Türkçe ad ve gerekirse ×adet rozeti var.
  - Ad ve ikon oyun kataloglarından gelir (`ITEMS`, `FOODS`, `EL_AD`, `SLOT_AD`, `dragonSVG`/`eggSVG`/`itemIcon`/`foodIcon`). Kendi varlıkların için Ocak Sandığı'nın saf `buildEntries` mantığı kullanılır; bu mantık 0 adetli yiyeceği zaten atar.
  - Karşı tarafın kalemleri sunucunun mevcut `labels` alanından çözülür (ejderha adı, eşya katalog kimliği → ad). Çözülemezse "Eşya", "Yumurta" ya da "Ejderha" yazılır; ham kimlik hiçbir yerde görünmez.
- "＋ Ekle" çekmecesi takasa uygun varlıkları seçilebilir satırlar olarak listeler; yiyecekte ± adet seçilir. Uygun olmayanlar "Takasa uygun olmayanlar (N)" altında soluk durur ve tek kelimelik nedenle işaretlenir (Hediye, İncelemede, Görevde, Kuluçkada, Kuşanmış, Takılı…). Uzun açıklama `title`/`aria-label` içindedir.
- Altın: −10 / sayı alanı / +10. Üst sınır kazanılmış altındır; bağlı altında "Başlangıç altını takas edilemez." yazar.
- Karşı taraf teklifini değiştirince sarı bant çıkar: "⚠ @x teklifini değiştirdi. Yeni hâline bak." "Gördüm" denmeden "Onayla" kapalı kalır.
- Durum ve hata metinleri sade Türkçe: "Karşı tarafın onayı bekleniyor", "Takas tamamlandı! Aldıkların Ocak Sandığı'nda.", "Takas iptal edildi", "Son işlemin sonucu henüz gelmedi" → "Sonucu kontrol et". Tanınmayan hata kodu ekrana çıkmaz; genel bir cümle gösterilir.
- Tamamlanan takasta "Aldın / Verdin" özeti var.
- Kaldırılanlar: uzun "Bu ekran sunucu hesabını kullanır…" uyarısı, ham varlık listesi, "Takas edilebilir · Başlangıç/bağlı · İnceleme bekleyen" satırı, "Çevrimiçi oyuncular" listesi, "Sunucudan yenile" alt düğmesi. Yerine başlıkta ⟳ simgesi (aria "Yenile") konuldu. Ayrıca 5 sn yoklama ve WS bildirimi aynen sürüyor.
- Mobil: ≤540 px'te tam ekran sayfa, ana eylem altta sabit çubukta, yatay taşma yok, tüm dokunma hedefleri ≥44 px (testle ölçülüyor). Klavye açılınca odaktaki alan görünür alana kaydırılır.
- Erişilebilirlik:
  - Açılışta odak başlıkta, kapanınca açan düğmeye döner.
  - Esc önce çekmeceyi, sonra pencereyi kapatır.
  - `aria-labelledby`, `aria-current="step"`, `aria-pressed` (seçim), `role="alert"` (bantlar).
  - Yeniden çizimde içerik aynıysa DOM'a dokunulmaz; odak, imleç ve kaydırma korunur.
- Görsel dil: Ocak Sandığı ile aynı koyu zemin, altın çerçeveli kartlar, Alegreya başlıklar ve `style.css` değişkenleri.

### C · Bedesten ve Ocak Sandığı kontrolü (c28b819)
- **Ocak Sandığı:** sorun yok. Ad ve ikon zaten çözülüyor, 0 adet zaten gizleniyor. Değişiklik yapılmadı.
- **Bedesten:** en küçük düzeltme yapıldı. Eşya ve yiyecek yedek adı artık ham anahtar değil, "Eşya" / "Yiyecek". "(earned)" ve "(earned/bağlı)" ifadeleri sade Türkçeye çevrildi.

## Kararlar (gerekçeli)
- **Sunucu, protokol, `trade_client.js`, `trade_engine.js` ve `server/economy_sources.js` değişmedi.** Komutlar (`invite/accept/reject/offer/confirm/cancel`), yükler, `requestId`, idempotency, revision ve offerHash aynı. Ödül, fiyat, olasılık ve bilet değerlerine dokunulmadı.
- Taslak yalnız istemcide tutulur. "Kaydet ve incele" mevcut `offer` komutunu gönderir, "Onayla" mevcut `confirm` komutunu gönderir.
- NPC muhafızlara (`@leydi_sureyya` vb.) takas düğmesi konmadı. Sunucu takası yalnız gerçek hesaplar arasında yapılabiliyor; çalışmayan bir düğme göstermek kafa karıştırırdı.
- Profilde yerel "Takas Masası" (NPC'lerle yerel 1:1 takas) olduğu gibi kaldı. Bu farklı ve yerel bir sistem; kapsam dışı.
- **Kapsam dışı ama gerekli küçük düzeltme** (`js/ui.js`, 1 satır): mobil Menü'deki "Sosyal & Lonca" kartı var olmayan bir eyleme (`soc-open`) bağlıydı ve HUD'daki Sosyal düğmesi mobilde gizli. Bu yüzden mobilde arkadaş listesi, dolayısıyla yeni takas girişi erişilemiyordu. Kart mevcut `social-drawer-open` eylemine bağlandı.
- `.trade-pop` z-index'i Sosyal çekmecesinin (9400) üstünde: davet bildirimi çekmece açıkken de tıklanabilir.

## Testler (bu dalda koşuldu)
| Komut | Sonuç |
|---|---|
| `npm test` | **136/136** geçti (azalmadı) |
| `npm run test:trade-ui` (SQLite) | 1/1 geçti (yeni akışa göre yeniden yazıldı) |
| `ENG05_MULTI_SERVER=1` + Firestore emülatörü, iki sunuculu `trade_ui` | 1/1 geçti |
| `npm run test:firestore` (emülatör) | 13/13 geçti |
| `npm run test:layout` | 2/2 geçti (yüzen düğme denetimi "yok" olarak güncellendi) |
| `npm run test:eng10` | 5/5 geçti |
| `npm run test:ocak-sandigi` | 1/1 geçti |
| `npm run test:eng11` (yeni) | 1/1 geçti |
| Tüm Playwright (`--config tests/playwright.config.js`) | 10/10 geçti |

Yeni `tests/eng11_trade.e2e.js` şunları denetler:
- Kalıcı düğme yok; pencere kendiliğinden açılmıyor.
- Profilden (1000 px) ve mobil Menü → Sosyal → arkadaş satırından (375 px) açılıyor; NPC satırında takas düğmesi yok.
- Davet bildirimi → "Gör" → "Kabul et" akışı çalışıyor.
- Çekmecede adlar görünüyor ve uygunsuzlar "Hediye" rozetiyle soluk duruyor.
- Görünür metinde `×0`, `e1`, `balik`, `til1`, `bound/earned/unknown`, `:item:` yok; "Sunucudan yenile" ve "Çevrimiçi oyuncular" yok.
- 375 / 768 / 1000 px'te yatay taşma yok ve tüm hedefler ≥44 px.
- Altın alanı odaktayken alt eylem çubuğu yerinde.
- Esc önce çekmeceyi kapatıyor.
- Karşı taraf değişince bant çıkıyor ve onay kilitleniyor.
- Takas tamamlanıyor; kese 420 → 400.

Koşulmayanlar: gerçek telefon/tablet cihazı ve gerçek ekran klavyesi (yalnız Playwright mobil emülasyonu), ekran okuyucu ile elle deneme, Safari/Firefox (testler Edge/Chromium).

## Ekran görüntüleri (göz kontrolü yapıldı)
`test-results/eng11/` (gitignore'da, `npm run test:eng11` ile yeniden üretilir):
- `375-01-baslat.png`: "@x ile takas", davet gönder
- `375-02-davet-bildirimi.png`: Sosyal çekmecesi açıkken gelen davet bildirimi
- `375-03-ekle-cekmecesi.png`: Ekle çekmecesi (uygun / uygun olmayanlar)
- `375-04-sec.png`: Seç adımı (altın stepper, kalemler, Kaydet ve incele)
- `375-05-incele.png`: Takas özeti
- `375-06-degisti-uyarisi.png`: Karşı taraf değişti bandı, Onayla kilitli
- `375-07-tamamlandi.png`: Takas tamamlandı + Aldın/Verdin
- `768-01-incele.png`
- `1000-00-profil-girisi.png`: Meydan profil kartında "Takas teklif et"
- `1000-01-ekle-cekmecesi.png`, `1000-02-sec.png` (yan yana kartlar), `1000-03-onay-bekleniyor.png`

Ayrıca `test-results/trade-ui/…/mobile-*.png` ve `uncertain-invitation.png` (trade_ui testi).

## Açık işler / riskler
- **Meydan akran listesi (önceden var olan durum):** yeni giren bir oyuncu, başka oyuncunun Meydan'ında ancak bağlantı tazelenince görünüyor. `/api/sync` yalnız WS açılışında, oyun durumu varsa gönderiliyor; `/api/state` akranları yalnız `S.hub` varken yazıyor. Bu yüzden profil girişi bazen geç beliriyor; arkadaş listesi girişi bundan etkilenmiyor. Test bağlantıyı açıkça tazeliyor. Kapsam dışı; ayrı iş önerilir.
- Karşı tarafın yumurtası yalnız "Yumurta" olarak görünüyor. Sunucu `labels` alanı yumurta için element bilgisi vermiyor ve sunucu yanıtı değiştirilmedi. İstenirse sunucu etiketine element eklemek küçük bir şema genişletmesi olur (onay gerekir).
- Tamamlanan takastaki "Verdin" adları, el değiştiren varlık bu oturumda görüldüyse adıyla, görülmediyse genel adla ("Eşya") yazılır.
- Profilde yerel "Takas Masası" ile sunucu "Takas teklif et" yan yana duruyor. Ad karışıklığı yaratabilir; yaratıcı yönetmen kararı bekliyor.
- `#stage` altındaki ENG-09 boşluğu (eski düğme için 56 px) bırakıldı. Artık yalnız davet bildirimi için gerekli; görsel regresyon riski olmasın diye dokunulmadı.

## 00'a kısa özet
Kalıcı Takas düğmesi kalktı. Takas artık arkadaş satırından, oyuncu profilinden ya da gelen davet bildiriminden açılıyor. Takas ekranı tabloya benzemiyor: "Sen veriyorsun / @x veriyor" kartları, adlı ve ikonlu kalemler, Ekle çekmecesi ve Seç → İncele → Onayla adımları var. Sunucu ve protokol değişmedi. Tüm testler geçti: 136/136 birim, 10/10 Playwright, iki sunuculu Firestore 1/1. Mobilde Sosyal'e erişimi kıran 1 satırlık hata da düzeltildi.
