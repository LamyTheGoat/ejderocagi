# Ejder Ocağı 2.0 · Sabah raporu (2026-11-11)

> **Güncelleme (aynı gün, öğleden sonra):** Bu rapordaki "boyalı dünya" ve Ocak/yarış çizimleri kullanıcı tarafından reddedildi
> (emanet duruş, perspektif, yarı saydam kesim). Yerine geçen yöntem ve güncel durum: `docs/CIZIM_DUNYASI.md`.
> Bu rapordan sonra ayrıca kuruldu: Kül Yutan, Damızlık, Sancaklar, Kervan, Kıraathane (eski çizim konağında), seferde düğümlü yol.

Gece oturumunun sonucu. Açmak için: `node eo2/tools/serve.mjs 3210` → `http://localhost:3210`.
Hiçbir şey commit edilmedi, push edilmedi; `main` ve Codex worktree'lerine dokunulmadı.

## Yapılanlar
1. **Ocak yeniden kuruldu (2.5D).** Pencere değil, yürünen sahne: orman açıklığı, uzakta dağlar, çiçekli ağaçlar, fenerler.
   19 yapının hepsi 2.5D kameraya göre Midjourney'de çizildi; her birinin kendi boyu ve ışığı var. Ev, ocak kulesi, kiler ve
   laboratuvar Anadolu üslubunda (cumbalı ev, çinili külah, düz damlı taş kiler, kubbeli kule).
2. **Gök Yarışı yeniden kuruldu (2.5D pist).** Dört pistin kendi zemini (çim, kar, kül, kaya) ve boyalı dekoru (çam, ulu ağaç,
   buz, kaya, lav kayası, fırtına bulutu, uçan kaya, sancak) var; ufuk pusu, yumuşak hız izi. Fizik ve ödüller `race.js`.
3. **Boyalı dünya.** Merkez Meydan, Han içi, Pazar içi, Ejder Bahçesi, Kuzey Yolu ve Arena avlusu aynı yerleşimle, K2'ye uygun
   boyalı çizimlerle giydirildi (cumbalı han, kubbeli bedesten, külahlı burçlu Kuzey Kapısı, Selçuklu arena kapısı, zindan
   kapıları, tezgâhlar, çeşme heykeli, selviler). **Menü → Dünya çizimi** eski düz çizime döndürür.
4. **Ejderhanın gerçek görünüşü.** 2.0 ejderhaları düz resimle gösteriyordu; pul ve süs rengi, pigment, desen, parıltı, göz
   rengi, yaşlılık hiç görünmüyordu. Artık bütün ekranlarda, ocakta gezerken ve yarışta oyunun kendi çizimiyle görünüyor.
5. **Süs Dolabı** (yeni ekran): beş yuva, süsü satın almadan deneme, satın alma, başka ejderhaya takma. Fiyatlar aynı.
6. **Gök Kulesi, Kraliyet Divanı, Efsuncu Zekai, Ata Yadigârı** (son saatte eklendi, az denendi): kule Arena sekmelerinde,
   Divan Saray ekranındaki düğmede, Efsuncu Pazar'ın beşinci tezgâhında. Kurallar `endgame.js` ile aynı.
6b. **Soy Kütüğü** (yeni ekran): ilk keşif kayıtları ve çift kan uyanışı. Koşul, bedel ve kazanım `lineage.js` ile aynı.
7. **Sadelik geçişi:** neon ve nabız atan ışıltılar kalktı; ana düğmeler mat parşömen, seçim ince altın kenar.
8. Çizim araçları: `tools/kes.mjs` (zemin kestirimi yenilendi, pus ayıklama) ve `tools/kirp.mjs`.

## Eksikler
- Kurulmadı: Kıraathane, Bedesten ve takas, Topçu ve zindanlar, Kor Örsü, dünya boss'u ve kervan. Çoğu oyun sunucusu ya da bekleyen kararlar ister.
- Saray podyum gösterisi hâlâ eski çizimle çalışıyor (ilan sahnesi 2.0).
- 2.0 yalnız yerel kayıtla çalışıyor; sunucu ekonomisi bağlı değil.
- `css/cam.css` içinde artık kullanılmayan eski kurallar duruyor; temizlik yapılmadı.
- Süsler pozlu çizimlerde görünmez (oyunun kendi çizimi de pozda süs koymuyor).

## Kararlar ve onay bekleyenler
| Konu | Durum |
|---|---|
| Boyalı dünya çizimleri | Yerleşim onaylıydı, çizim yer tutucuydu. Yeni görünüş senin onayını bekliyor; menüden geri alınır. |
| K2 mimari | İlk Ocak yapıları Avrupa köyü gibiydi; dördü Anadolu üslubuyla yenilendi. Meydan hanı ikinci denemede Osmanlı konağı oldu. |
| K8 yazı tipi | Arayüz Noto Sans (ana referansa uysun diye); Alegreya yalnız kâğıt yüzeylerde. K8 ile çelişiyor, karar senin. |
| "Üretim" düğmesi | Kor Örsü kurulana kadar Pazar'ı açıyor. |
| ChatGPT | Yeni görsel üretilmedi. Hazır mockup istemleri: `docs/MOCKUP_ISTEMLERI.md`. |

## Testler
Son tam tur (06:26, boyalı dünya ve iç mekânlar dahil), hepsi geçti:
- `check_oyun.mjs` masaüstü: hata yok. `check_oyun.mjs --mobil`: hata yok.
- `check_uc.mjs` dokuz senaryo (turnuva, olum, ureme, yakala, pazar, yaris, ocak25, sus, kutuk): 9/9.
- `npm test`: 182/182.
- Boyalı meydanda kare hızı: 60 (başsız Edge, 1920×1080). Düz çizime dönüş denendi, çalışıyor.

**Bu turdan SONRA eklenen ve tam turla yeniden denenmeyenler:** Gök Kulesi, Kraliyet Divanı, Efsuncu Zekai tezgâhı, Ata Yadigârı
(`js/kule.js`, `arena.js`, `pazar.js`, `saray.js` değişiklikleri, `endgame` modülünün yüklenmesi), Saray podyumunun tam ekran
ayarı ve Soy Kütüğü'nün telefon düzeni. Kule için yalnız tek bir duman denemesi yapıldı: 1. kat otomatik dövüşle geçildi,
kat 2'ye çıkıldı, ödül yazıldı, sayfa hatası yok. Divan oyu, Efsuncu alışverişi, yadigâr dövme ve lütuf seçimi **denenmedi**.

Koşulmayanlar: Firestore emülatör testleri, Playwright takas arayüzü testi, gerçek telefon, eski kayıtların 2.0'da açılması,
eski `tools/check.mjs`, `check_scenes.mjs`, `check_battle.mjs` (giriş ekranı yüzünden güncel değil).

## Dosyalar
Commit yok. Dal `ejder-ocagi-2.0`, son commit `c5d11f0`; bütün iş çalışma klasöründe.
- Yeni: `eo2/js/ocak25.js`, `yaris25.js`, `yaris.js`, `gorunus.js`, `sus.js`, `kutuk.js`, `meydan25.js`, `eo2/css/ejder.css`,
  `eo2/tools/kirp.mjs`, `eo2/docs/MOCKUP_ISTEMLERI.md`, bu rapor.
- Değişen: `eo2/js/world.js`, `scenes.js`, `scenes2.js`, `game.js`, `gl.js`, `oyun.js`, `ahir.js`, `arena.js`, `defter.js`,
  `eo2/tools/kes.mjs`, `check_uc.mjs`, `eo2/index.html`, `eo2/css/susleme.css`, `eo2/README.md`, `eo2/docs/KARARLAR.md`.
- Çizimler: `eo2/assets/dunya/` (71 dosya), `eo2/assets/bg/` (ocak-ufuk, sus, arsiv ve öncekiler).

## Riskler
- Oturum kullanım sınırına takılarak bitti (12:00'den önce). Son eklenen dört sistem tam testten geçmedi; ilk iş `check_oyun.mjs` ve `check_uc.mjs` turunu yeniden koşmak.
- `endgame` modülü artık yükleniyor: Divan'da yürürlükteki ferman Saray ödülünü ve kule altınını oyunun kendi kuralıyla etkiler.
- Boyalı çizimler Midjourney çıktısıdır; 03 Art Direction ve 04 Asset Studio onayından geçmedi.
- Dünya çizimlerinden biri yüklenemezse dünya kendiliğinden düz çizime döner (bilerek); eksik dosya sessizce düz dünyaya yol açar.
- Ejderha görünüşü SVG resmine çevriliyor; çok kalabalık ocakta ilk açılışta kısa bir gecikme olabilir, ölçülmedi.
- Kare hızı yalnız başsız Edge'de gözle izlendi; ölçüm yapılmadı.

## Sonraki adım
1. Boyalı dünyaya ve K8 yazı tipine karar ver.
2. Saray podyum gösterisini 2.0 sahnesine taşımak.
3. Sunucu isteyen sistemler için sıra ve mimari kararı (Bedesten, takas, Topçu, zindan, Kıraathane).

## 00 Proje Merkezi'ne kısa özet
2.0'da Ocak ve Gök Yarışı 2.5D sahne olarak yeniden kuruldu; altı yürünen alan K2'ye uygun boyalı çizimlerle giydirildi
(menüden geri alınır). Ejderhalar artık gen renkleriyle görünüyor; Süs Dolabı ve Soy Kütüğü eklendi. Kurallar, fiyatlar ve
ödüller değişmedi. Commit yok. Onay bekleyen: boyalı dünya görünüşü, K8 yazı tipi.
