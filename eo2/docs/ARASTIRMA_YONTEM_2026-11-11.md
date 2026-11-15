# Yöntem araştırması: 2D çizimle 2.5D dünya

> Sistem ajanı, 2026-11-11. Soru: başkaları bu işi nasıl yapıyor, bizim için ne anlama geliyor?
> Bu bir araştırma notudur; içindeki öneriler karar değildir. Kanıtın zayıf olduğu yerler açıkça yazıldı.

## Kısa sonuç

1. Bizim yaşadığımız sorun bilinen bir sorun ve tek bir kuralı var: **çizimin kamerası oyunun kamerasıyla aynı değilse nesne sahnenin içinde değil üstünde durur.** Bunu teknik hile çözmüyor; çizim doğru açıyla gelmek zorunda.
2. Bu işi iyi yapan oyunlar (Cult of the Lamb, Castlebound) teknikle değil, **kısıtla** çözmüş: kamera neredeyse sabit, bütün çizimler o tek kameraya göre, ışık tek elden.
3. Master'dan parça çıkarmak için denemediğimiz iki yol var: **katman ayrıştırma modeli** ve **master'ı kameraya göre zemine geri yansıtmak**. İkisi de deneme gerektirir; sonuçlarını bilmiyorum.
4. Normal map ile ışıklandırma bizim çizim türünde az şey kazandırır; şimdilik yatırım önermiyorum.

## Bulgular

### 1. Kamera eşleşmesi her şeyin temeli
Ön-çizilmiş arka plan kullanan oyunların (eski Resident Evil, Final Fantasy VII türü) kuralı: oyun kamerası çizimin kamerasıyla ne kadar örtüşürse çizim o kadar oyunun parçası görünür; bu yüzden her sahnenin kamerası sabittir. Karakteri sahneye bağlayan şeyler: sahnedeki ışıkla aynı yönden ışık, yere düşen basit gölge, arkasından geçilebilen nesneler için derinlik bilgisi.

Bizdeki karşılığı: kamera sabit eğimle oyuncuyu izliyor, yani yalnız kayıyor. Kaymada düz bir çizim doğru kalır; derinliği olan büyük yapılarda (han) hata yana gittikçe büyür. Motordaki çapraz derinlik dilimleri (`yon`) bunun için var. Kamerayı döndürmek ya da eğimi değiştirmek her çizimi geçersiz kılar; bunu yapmamalıyız.

### 2. Boyanmış resmi basit geometriye yansıtmak
Lunarium ekibi (ve arama özetine göre Moon Reader'ın geliştiricisi; o yazıyı açıp okumadım) şöyle çalışıyor: oyun kamerasına hizalı çok basit bir geometri kurulur, elle boyanmış resim o geometriye kameradan yansıtılır. Sanatçı sahneye "neredeyse bir 2D resim gibi" davranır. Lunarium ayrıca sıradan 3D ışığın bu düzene uymadığını, kendi 2D ışık sistemini yazdığını söylüyor.

Bizdeki karşılığı: zemin zaten bir düzlem. Master'ın zemin bölgesi, elimizdeki kamera ölçüsüyle (aynı `PX` hesabı) dünya düzlemine geri açılabilir; böylece döşeme kodla boyanmak yerine master'ın kendisinden gelir. Engel: master'da zeminin büyük kısmı nesnelerin arkasında; o boşlukların doldurulması gerekir. Nesneler için bu yol **uygun değil**: geometri kurmak "her nesne tek 2D çizim, 3D nesne yok" kuralına aykırı (kurulmuş bank bu yüzden reddedildi).

### 3. Tek resmi katmanlara ayıran model
Qwen-Image-Layered (CVPR 2026, açık kaynak, Apache 2.0): tek bir resmi, her biri saydam zeminli ayrı katmanlara böler; bir katman yeniden bölünebilir. Photoshop dosyalarından öğrenmiş. Bunu sunan hazır siteler de var.

Bilmediklerim: arkada kalan kısımları ne kadar iyi tamamladığı (makale bunu açıkça yazmıyor), anime çizimde nasıl davrandığı, çıktının çözünürlüğü. Kaynakların çoğu satıcı sayfası; bağımsız ölçüm bulamadım. Master'ı ChatGPT'ye "asset sayfası çıkar" diye vermekten farkı: bu model resmi yeniden çizmez, **aynı pikselleri** ayırır; yani açı ve ışık master'ınkiyle birebir kalır. Dezavantajı da aynı yerden gelir: parçalar master'daki boyutta kalır (han dışında çoğu küçük).

### 4. Oyun içi ışık için normal map
Laigter (ücretsiz, açık kaynak) ve SpriteIlluminator (ücretli) çizimden normal map üretir. Kendi belgelerine göre otomatik üretim esas olarak **kenarlarda** kabartma verir; iç yüzeylerin gerçek biçimini bilmez, o elle boyanır. Bu, bizim ışıksız çizim denememizin sonucuyla ("umut vaat ediyor ama çok iyi değil") uyuşuyor. Düz cel boyalı çizimde otomatik normal map'in getirisi düşük, elle boyamanın maliyeti yüksek.

### 5. Kaç yön çizmek gerekir
Çok yönlü çizim pahalıdır: 8 yön, aynalamayla bile 5 ayrı çizim takımı demektir ve "son çare" sayılır. Yerinde duran nesneler için gereksizdir. Üreticiler de aynı şeyi söylüyor: yönler arasında kayma ana hata türüdür; hiçbir model görmediği yüzü birebir tutturamaz. Bizim 16 yönlü bank denememiz bunu doğruladı (yönler arasında aynı bank çıkmadı).

### 6. Düz çizimlerle kurulan oyunlar
Cult of the Lamb ekibi: dünya, 3D uzaya dizilmiş 2D çizimlerden kurulu; "kamerayı neredeyse sabit tutmak zorunda kaldık", önemli şeyler ekranın üstüne ve arkasına konur, ışık için özel çözüm yazıldı. Castlebound ekibi: bütün varlıklar düz PNG; 3D görünüm motor ayarından gelir. Kaynaklar röportaj düzeyinde; teknik ayrıntı (gölge, ışık) vermiyor. Çıkan ders teknik değil: tek kamera, tek ışık, kısıtlı yerleşim.

### 7. Zemine bağlama
3D motorlarda da düz çizimin gölgesi sorunludur (çizimin dönüşüne göre yanlış açıyla düşer). Yaygın çözüm temas gölgesi ya da yere basit koyu leke. Bizim keskin elips gölge ve ayak dibindeki çakıl/ot aynı çözümün 2D karşılığı.

## Öneriler (karar değil)

| # | Öneri | Kimin işi | Maliyet | Risk |
|---|---|---|---|---|
| 1 | Yönleri kıs: yerinde duran nesne için en çok 2–3 görünüş (cephe, yarım dönük, yan) ve aynası. 16 yön yalnız gerekirse. | Bölüm ajanı (kural olarak isteme eklenebilir) | Yok | Düşük |
| 2 | Kamera kilidi: bölümlerde eğim ve görüş açısı master'ınkiyle aynı kalsın; farklı kamera isteyen bölüm ayrı çizim takımı ister. | Sistem | Yok (bugünkü durum) | Düşük |
| 3 | Deneme: master'ın zeminini dünya düzlemine geri aç, kodla boyanan döşemeyle yan yana koy. | Sistem | Yarım gün | Orta: nesnelerin arkasındaki boşluklar |
| 4 | Deneme: master'ı katman ayrıştırma modelinden geçir, çıkan parçaları bugünkü `mg-*` setiyle kıyasla. | Sistem (deneme), sonuç bölüm ajanına | Bir deneme | Master'ı üçüncü bir siteye yüklemek ya da modeli yerelde çalıştırmak gerekir; **yükleme için onayın lazım** |
| 5 | Renk eşleme aracı: bir çizimin renklerini master'daki karşılığına ölçüyle yaklaştır (elle ayar yerine). | Sistem | Küçük | Düşük |
| 6 | Normal map'e şimdilik girme. | — | — | — |

Mevcut kararlarla çelişen bir öneri yok. 3 ve 4 yalnız denemedir; sonuç iyi çıkmazsa bir şey değişmez.

## Deneme sonuçları (2026-11-11 gece, kullanıcı onayıyla)

### Öneri 2 karara bağlandı
Kullanıcı: "tek bir kamera açısı kullanalım 14 derece". `KARARLAR.md` K23.

### Öneri 4: katman ayrıştırma
- **Qwen-Image-Layered denenemedi.** Üç açık demo da sonuç vermedi: resmî demo giriş yapmamış kullanıcıya izin verilenden uzun GPU süresi istiyor; öteki ikisi çalışırken hata verdi. Ayrıca resmî demo 640 piksellik çözünürlükte çalışıyor; master 1672 piksel. Bu model için ücretli bir hesap ya da yerel ekran kartı gerekir. Master bu üç demonun geçici klasörüne yüklendi; sonuç alınmadı.
- **Canva'nın katman ayırması çalıştı** (bağlı Canva hesabı, "Katman denemesi - sahne" tasarımı). Master'ı şunlara böldü: bir arka plan resmi, 48 parça resim, 29 düzenlenebilir yazı.
  - Arka plan: arayüz, karakterler, bank ve masa silinmiş, altları doldurulmuş **temiz bir meydan resmi**. Bu, master'ın arayüzsüz hâli; bugüne kadar elimizde yoktu.
  - Dünya parçaları (11 adet): oyuncu, yoldaki kişiler, çeşmenin ejder heykeli, sancak direği, bank ve masa. Pikseller master'ın kendisi; açı ve ışık birebir. Ama bank üstündeki cadıyla, masa iki kişi ve sandalyelerle **tek parça**; han, kapı, tezgâh, fener, tarh arka planda kaldı. Yani dekor parçası olarak yalnız sancak temiz; `mg-*` setinin yerini tutmaz.
  - Arayüz parçaları (37 resim, 29 yazı): her panelin, simgenin ve yazının master'daki yeri, boyu, yazı boyu ve rengi ölçülü olarak çıktı. Arayüzü master'a göre denetlemek için hazır cetvel.
  - Tam boy arka plan indirildi (kullanıcı onayıyla Canva'da bir kopya kaydedildi): `docs/master_arayuzsuz_2026-11-11.png`, 1672 × 941. Ölçüm: Canva resmi her yerde hafifçe yumuşatmış; hiçbir şeyin silinmediği yerlerde bile master'dan ortalama 7–16 ton farklı. Bu yüzden asıl kullanılacak sürüm **`docs/master_arayuzsuz_karma_2026-11-11.png`**: Canva'nın ayırdığı parçaların kutularında Canva'nın doldurduğu resim, kalan her yerde master'ın kendi pikseli.
  - Arka planda kalanlar: "Han" tabelası, kapı yolundaki mavi oklar, çeşmedeki etkileşim baloncuğu, kapıdaki iki nöbetçi, uzak bank. Çeşmenin ejder heykeli silindi (ayrı parça olarak çıktı).
  - Dünya parçalarının tam boyu ayrıca indirilmedi; gerekirse master ile bu arka planın farkından kesilebilir.

### Öneri 3: master zeminini dünya düzlemine açmak
Araç: geçici (`zemin_ac.mjs`, depoda değil). Görseller: `docs/zemin_deneme_*_2026-11-11.png`.
- **Geometri tuttu.** Açılan resimde çeşmenin çevresindeki tuğla halkaları gerçek daire, zemindeki arma yuvarlak çıktı. Bu, kamera ölçüsünün (eğim 14,2°) doğru olduğunun bağımsız kanıtı. Oyunda yerine serilince halkalar doğru yerde ve doğru eğimde duruyor.
- **Çözünürlük yetmiyor.** Master'da zemin, oyuncunun durduğu derinlikte birim başına yanlamasına 127, derinlemesine yalnız 47 piksel taşıyor; kapıya doğru 15 piksele düşüyor. Oyuncu ileri yürüyünce (kamera yaklaşınca) serilen zemin bulanıklaşıyor.
- **Zeminin çoğu kapalı.** Master'da çıplak görünen zemin yalnız ortadaki şerit; kalan yer yapıların, saksıların, çalıların arkasında. Dik nesneler açılınca yere uzun lekeler olarak yayılıyor, kullanılamıyor.
- **Kodla boyanan döşemeyle yan yana uyuşmuyor.** Master'ın tuğlaları gözle yaklaşık bir buçuk kat büyük, daha düzensiz ve renkçe daha oynak; ek yeri belli oluyor. (Bir buçuk kat göz kararıdır, ölçülmedi.)
- **Sonuç:** master zemini doğrudan doku olarak kullanılmaz. İki işe yarar: (1) kodla boyanan döşemeyi master'a göre ayarlamak için ölçü kaynağı (tuğla boyu, halka aralığı, renk oynaması, zemin arması); (2) tepeden bakışlı hâle geldiği için, bir üreticiye "bu döşemeyi aynı üslupla daha büyük ve keskin çiz" diye verilecek örnek.
- Motorda kalan: zemine çizim serme (`zemin.resimler`, `zeminSer`). Zemin arması gibi tepeden çizilmiş parçalar için kullanılabilir.

## Kaynaklar

- [An Adventure in Pre-Rendered Backgrounds](https://www.jmeiners.com/pre-rendered-backgrounds/)
- [How Lunarium blends hand-painted 2D art with 3D environments (80.lv)](https://80.lv/articles/how-lunarium-blends-hand-painted-2d-art-with-3d-environments)
- [Qwen-Image-Layered (arXiv 2512.15603)](https://arxiv.org/abs/2512.15603) · [kod](https://github.com/QwenLM/Qwen-Image-Layered) · [model](https://huggingface.co/Qwen/Qwen-Image-Layered)
- [Laigter belgeleri: normal map üretimi](https://laigter.readthedocs.io/en/latest/HowTo/normal-map-generation.html) · [SpriteIlluminator](https://www.codeandweb.com/spriteilluminator/documentation/effects)
- [How many sprites do different perspectives need](https://cxong.github.io/2022/03/how-many-sprites-do-different-perspectives-need)
- [Cult of the Lamb, Unity yazısı](https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb)
- [Castlebound, Creative Bloq](https://www.creativebloq.com/features/castlebound-devs-explain-a-unique-unity-technique-behind-its-paper-mario-like-visuals) (yalnız arama özeti okundu; sayfanın tamamı açılamadı)
- [Octopath türü gölge tartışması (Unity forumu)](https://discussions.unity.com/t/how-do-games-like-octopath-traveler-handle-the-angle-of-shadows-and-is-this-even-possible-in-unity-urp/246459)
- [Çok yönlü çizim üreticileri (satıcı sayfası)](https://spriteflow.io/direction-sprite-generator)
