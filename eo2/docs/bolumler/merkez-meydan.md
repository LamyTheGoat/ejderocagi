# Merkez Meydan · bölüm tasarım notu

> Yazan: bölüm ajanı, 2026-11-11. Bölüm verisi: `eo2/js/bolumler/merkez-meydan.js` (kimlik `master`). Master: `02_UI_MOCKUP/ANA_REFERANS_MERKEZ_MEYDAN_YAKIN_KAMERA.png`.
> Kullanıcı onayı: "Evet, Meydan'la başla" (2026-11-11, birinci tur raporundan sonra).

## Amaç
Oyuncu her oturumda buraya düşer. Meydanın işi: nereye gidileceğini tek bakışta seçtirmek ve öteki oyuncuları göstermek.
Yeni sistem ya da mekanik taşımaz; var olan kapılara yer açar.

## Akış
- **Giriş:** oyuncu meydanın ortasında, çeşmenin solunda, kuzeye bakar (master pikseli 815, 705).
- **Odak:** mavi ejderli çeşme. Sıcak sahnedeki tek soğuk renk; sağ üçte birde.
- **İkincil:** Han (solda sıcak ışık kütlesi), Kuzey Kapısı (derinliğin ucu).
- **Yollar:** ana eksen oyuncu → kapı; han yayı masa → han kapısı; pazar köşesi çeşmenin arkasından tezgâhlara.
- **Duraklar:** han önü masası, kapı önü bankı, çeşme kenarı, öndeki bank, tezgâh önü.
- **Sakin boşluk:** oyuncunun çevresi ve kapı koridoru boş kalır; buraya eşya konmaz.
- **Güney çıkışları (Arena, Bahçe):** master'da görünmüyor. Öneri: alt sol ve alt sağ köşe. **Kullanıcı kararı bekliyor; kurulmadı.**

## Öbekler
| Öbek | Master x aralığı | İçerik | Durum |
|---|---|---|---|
| Han önü | 60–720 | Han, masa ve sandalyeler, fıçı öbeği, han dibinde çiçek kütlesi, ön plan yaprağı | Tur 1'de düzenlendi |
| Çeşme çevresi | 950–1600 | Çeşme (kendi tarhlarıyla), sancağın arkasındaki tarh, iki sancak | Tur 1'de düzenlendi |
| Kapı yolu | 830–1280 | Kapı, kapı önü bankı, çalılar, iki bekçi | Dokunulmadı; yeni çizim bekliyor |
| Pazar köşesi | 1280–1672 | İki tezgâh, erguvan, çalılar, iki kişi | Dokunulmadı |
| Ön bank | 270–620 | Bank (açı ailesi), fener | Dokunulmadı |

## Tur 1 (2026-11-11): yalnız veri, yeni üretim yok
Ölçüt: master ile benzerlik ve "sticker" hissinden kurtulmak. Önce kısık göz kıyası ve ölçüm, sonra değişiklik.

| Ölçü (1672 × 941, arayüzsüz) | Master | Önce | Sonra |
|---|---|---|---|
| Sol kenar parlaklığı (x 0–120, y 300–700) | 70 | 129 | 71 |
| Sağ alt köşe parlaklığı | 59 | 72 | 47 |
| Zemin, oyuncunun solu (rgb) | 203, 161, 159 | 192, 145, 158 | 192, 153, 158 |
| Surun arkasındaki ağaç, sol (parlaklık) | 113 | 123 | 117 |

Master'ın sol kenar ve bütün kare ölçüsünde koyu arayüz panelleri de vardır; sayılar yaklaşık kıyastır.

Yapılanlar:
1. **Arka ağaçlar koyulaştı.** `ms-agac` ve `ms-cam` çizimlerinin koyu, soğuk tonlu **yeni kopyaları** üretildi (`mm-agac`, `mm-cam`; kaynaklar değişmedi). Limon yeşili ağaç odağı çalıyordu.
2. **Ön plan çerçevesi.** Sol kenarda ve sağ altta koyu, az bulanık yaprak; önlerinde çiçek. Hanın solundaki parlak ağaç kaldırıldı; orası master'daki gibi ön plan yaprağıyla kapalı.
3. **Han önü.** İki üçlü fıçı öbeği teke indi (han çiziminin kendi fıçısıyla birlikte master'daki ikili görünüşe yakın). Top gibi duran iki çalı yerine han duvarına yaslanan tek çiçek kütlesi ve yanında ortanca.
4. **Çeşme.** Havuz master ölçüsüne büyütüldü (en çarpanı 1,08 → 1,1; yer 1295 → 1310). Önüne konmuş iki kutu tarh kaldırıldı: `mg-a02` çiziminin iki yanında havuzu saran kendi tarhları var.
5. **Zemin.** Tuğla tonları biraz daha sıcak ve gri; komşu taş farkı kısıldı (`yumusat` 0,42 → 0,5).
7. **Döşeme halkaları çeşmede** (kullanıcı kararı, 2026-11-11: "Evet, taşı"). Halkaların merkezi han önünden (600, 605) çeşme havuzunun yerdeki ortasına (1340, 612) alındı; çeşme meydanın göbeği olarak okunuyor. Bu master'la da uyumlu: sistem ajanının master zeminini dünya düzlemine açtığı denemede (`docs/zemin_deneme_acilmis_master_2026-11-11.png`) halkalar çeşmenin çevresinde gerçek daire çıkıyor. Eski merkez (han önü) yanlış okunmuştu.
6. **Hanın sol yanı.** Ön plan yaprağı ekrana sabit olduğu için oyuncu sola yürüyünce hanın yanı çıplak zemin kalıyordu. Oraya dünyaya bağlı koyu ağaçlar ve bir çalı kondu (master çerçevesinin dışı; eksi x pikselleri).

Görüntüler: `merkez-meydan_tur0_2026-11-11.png` (önce), `merkez-meydan_tur1_2026-11-11.png` (sonra), `merkez-meydan_tur1_kiyas_2026-11-11.png` (master ile yan yana, arayüzle), `merkez-meydan_tur1_han_solu_2026-11-11.png` (oyuncu hanın solunda).

Bu turda görülen yeni sorunlar:
- Han yakından bakınca oyuncuya göre küçük (kapısı oyuncunun boyunda) ve 1920 genişlikte yumuşak; "oyuncak ev" hissinin asıl kaynağı bu.
- Hanın solundaki ağaçlar taş döşemenin üstünde duruyor; orada çim ya da toprak zemin gerekir (motor).
- Kapının solundaki erguvanın dibinde ince gri bir çubuk görünüyor (`mg-c00` çiziminde sayfadan kalan kırıntı); temiz kopyası yeni dosya olarak çıkarılmalı.
- Telefon ölçüsünde (844 × 390) ön plan yaprakları ekranın iki yanında geniş yer tutuyor; okunurluğu bozmuyor ama kullanıcı gözüyle bakılmalı.

## Tur 2 (2026-11-12): yeni han ve kapı (ChatGPT, alt ajanla)
Kullanıcı izni: "bir alt ajan oluşturup istediğin assetleri chatgptden isteyebilirsin." İki istek, iki çıktı; yeniden üretim yok.
Ham çıktılar `kaynak/m1_han_v1.png` (1293 × 1217, gerçek saydam) ve `kaynak/m1_kapi_v1.png` (1536 × 1024; saydam gelmedi, beyaz damalı zemin `tools/anahtar.mjs` ile temizlendi).
Her istekte master ve ilgili kırpması referans verildi.

| Çizim | Oyundaki adı | Yer ve ölçü | Not |
|---|---|---|---|
| Han | `mm-han` (1203 × 1170) | taban ortası (410, 558), en 640 | Açık sundurma, yatak simgeli tabela, iri fenerler. Master ölçüsü 520 verir; master'daki han daha yüksek olduğu için 640 tutuldu. |
| Kuzey Kapısı | `mm-kapi` (1519 × 992) | taban ortası (1045, 402), en 590, sıra kayması 12 | Kemer, sancaklar, basamaklar, çiçekli istinat duvarları tek çizim. Bekçiler basamağın üstünde görünür. |

- Kapı önündeki çalı kalktı (kapının kendi çiçekleri var); bank basamağın sol önüne alındı.
- Eski eşler (`mg-a00`, `mg-c01`) silinmedi; `setler.esle` satırındaki yorumda duruyor.
- Kullanıcı (2026-11-12): "hiç fena da durmamış". Aynı gün: "kapıyı modüler şekilde merdivenden bağımsız yapabiliriz"; kapı, merdiven ve düz sur ayrı parçalar olarak istendi (`m2_*`), sonuç bekleniyor.

Görüntüler: `merkez-meydan_tur2_2026-11-12.png`, `…_kiyas_…`, `…_kapi_…`, `…_han_…`.

Bu turda görülenler:
- Han çizimi master'dan daha yukarıdan bakıyor (sundurma zemini ve çatı üstleri geniş) ve daha bodur. Oyunda rahatsız etmiyor ama master'daki kütle yok.
- Kapı çiziminin taşı master'dan daha mor; oyundaki zeminle uyuşuyor.
- Birleşik kapı çizimi basamağın dibinde durduğu için yan duvarları arkadaki surla aynı derinlikte değil; modüler parçalar bunu çözmek için istendi.
- Basamak görseldir: oyuncu basamağın dibinde durur, üstüne çıkamaz (motor düz zemin biliyor).

## Tur 3 (2026-11-12): modüler kapı, merdiven ve sur
Kullanıcı: "kapıyı modüler şekilde merdivenden bağımsız yapabiliriz"; sonra: "büyük binalarda düsturun bu olsun" (büyük yapı ayrı parçalardan dizilir; küçük nesnede yapılmaz).
Üç istek, üç çıktı; üçü de saydam gelmedi (beyaz damalı zemin), `tools/anahtar.mjs` ile temizlendi. Üçünde de referans ilk kapı çizimi (`m1_kapi_v1`).

| Parça | Ham çıktı | Oyundaki adı | Yer ve ölçü |
|---|---|---|---|
| Merdivensiz kapı | `kaynak/m2_kapi_duz_v1.png` | `mm-kapi2` (1762 × 806) | taban (1045, 262), en 480, yükseklik 0,2: surla aynı derinlikte, tabanı sahanlığa oturur |
| Merdiven | `kaynak/m2_merdiven_v1.png` | `mm-merdiven` (1771 × 648) | taban (1045, 402), en 560, sıra kayması 12 |
| Düz sur modülü | `kaynak/m2_sur_duz_v1.png` | `mm-sur` (1500 × 367) | taban y 262, en 470; kapının iki yanında ikişer modül (570, 100, 1520, 1990) |

Görüntüler: `merkez-meydan_tur3_moduler_2026-11-12.png`, `…_moduler_kapi_…`, `…_tur3_kiyas_…`.

Bu turda görülenler:
- Başlangıç görünüşünde kapı, merdiven ve sur tek yapı gibi okunuyor; sur artık kapıya kesintisiz bağlı.
- **Yakından:** oyuncu kapıya yürüyünce merdivenle kapı arasında düz zemin açılıyor (aralarında 14 birim derinlik var). Teras gibi okunuyor, ama iki yanda zemin aynı seviyede sürüyor. Tek parça kapıda (`mm-kapi`) bu yoktu. Gerçek çözüm motorda yükseltilmiş zemin ister.
- Sur modülü kapıdan biraz açık ve pembe; taş blokları kapınınkinden iri. Uçları mazgal dişiyle bittiği için ek yerinde çift diş oluşuyor.
- Kapının iki yanındaki eski fenerler artık görünüyor.

Hanın ikinci sürümü (`m1_han_v2`: daha yüksek, daha alçak kamera) istendi; istek üç dakikada görsel döndürmedi, yeniden gönderilmedi. Yerine modüler yol: eldeki han ön blok olur, arkasına yüksek ana gövde (`m3_han_arka_v1`) ve yanına alçak kanat (`m3_han_kanat_v1`) istenir.

## Tur 4 (2026-11-12): yerde kapı, üç parçalı han
- **Kapı yerde** (kullanıcı: "merdivene takılmayalım, direkt yerde olsun kapı"). Merdiven sahneden kalktı; çizimi (`mm-merdiven`) ve tek parça kapı (`mm-kapi`) editör paletinde duruyor. Kapı surla aynı derinlikte (taban y 262). Oyuncu kemerin eşiğine kadar yürüyebiliyor; sur çarpışması kapının iki yanına taşındı. Bank master'daki yerine döndü (905, 418).
- **Han üç parça** (kullanıcı: "büyük binalarda düsturun bu olsun"). İki istek, iki çıktı, ikisi de gerçek saydam; referans ilk han çizimi ve master kırpması.

| Parça | Ham çıktı | Oyundaki adı | Yer ve ölçü |
|---|---|---|---|
| Arka gövde: üç kat ve çatı katı, balkon, sancak | `kaynak/m3_han_arka_v1.png` | `mm-han-arka` (1076 × 1433) | taban (300, 505), en 520, sıra kayması 3 |
| Yan kanat: tek kat ve çatı | `kaynak/m3_han_kanat_v1.png` | `mm-han-kanat` (1422 × 968) | taban (60, 545), en 420, sıra kayması 2,6 |
| Ön blok: sundurmalı giriş (ilk han) | `kaynak/m1_han_v1.png` | `mm-han` | taban (430, 558), en 640 → 600, sıra kayması 2,5 |

- Hanın solundaki ağaçlardan biri kalktı (yerinde kanat duruyor); çarpışma çizgileri üç parçaya göre yeniden yazıldı.
- Kullanıcı notu: gerektiğinde bir parça aynalanabilir (`ayna`); bu turda kullanılmadı.

Görüntüler: `merkez-meydan_tur4_2026-11-12.png`, `…_han_…`, `…_kapi_…`, `…_kiyas_…`.

Bu turda görülenler:
- Arka gövde ön bloğun alçak sol çatısının üstünden yükseliyor ve kadrajdan taşıyor; han artık tek küçük ev değil, katmanlı bir yapı.
- Başlangıç görünüşünde arka gövdenin ve kanadın çoğu sol kenardaki ön plan yaprağının ve arayüzün arkasında kalıyor; kütle en iyi oyuncu biraz geri ve sola gidince görünüyor.
- Kanat öteki iki parçadan daha cepheden çizilmiş (taban çizgisi yataya yakın). Geriden bakınca göze batmıyor; yakından denenmedi.
- Kapı yerde durunca merdiven boşluğu sorunu kalmadı; master'daki basamaklı üst set artık yok (bilerek).

## Tur 5 (2026-11-12 gece): hub şehri
Kullanıcı: "kararları sen ver, kalite kontrolü sen yap… gerçek bir 2D MMORPG'nin hub şehri gibi görünsün." Ayrıca: "meydan yüksek bir yerde ve korkuluklarla çevrili gibi olsun… oyuncu güneye gelince platformu görsün, ileride şehir devam ediyormuş gibi."

Master kadrajının dışı yürününce boş taştı (yürüme alanı 24 × 33 birim; master bunun küçük bir köşesini gösterir). Kural: yürüme hatları boş, eşya kenarlarda öbek öbek.

| Öbek | Yer (dünya) | İçerik |
|---|---|---|
| A · Kapı yolu | x 2–7,6 · y 25–34 | Dört fener, iki sancak, iki saksı; eksen kapıya götürür |
| B · Kuzeybatı bahçesi | x −9…−1 · y 21–34 | Ağaçlar, iki bank, kuyu, çalılar, bahçıvan. **Yürünmez**, seyirlik |
| C · Pazar köşesi | x 9–15 · y 18–32 | Üçüncü tezgâh, araba, sandık ve fıçı öbekleri, tabela; Baharatçı, Usta Kerim, Hamal |
| D · Doğu kenarı | x 13–19 · y 4–24 | Fenerler, bank, saksı; arkasında çalı ve ağaç sırası, taş babalar |
| E · Batı ve güneybatı | x −13…−6 · y 3–10 | Ağaç, çalı, fener, saksı, taş babalar |
| F · Teras kenarı (güney) | y 2,6 | Korkuluk sırası, iki açıklık (Arena ve Bahçe inişleri) fenerli babalarla; altında zeminin altına inen duvar yüzü; aşağıda ağaç tepeleri ve çatılar |
| Orta | çeşmenin önü | Yer mührü (zemine serili, tepeden çizim); ilan panosu çeşme ile pazar arasında; yön tabelası güneydoğuda |

Yeni çizimler (ChatGPT, beş istek, beş çıktı, hepsi gerçek saydam): `mm-muhur`, `mm-araba`, `mm-pano`, `mm-kuyu`, `mm-tabela` (ham: `kaynak/m4_*`).
Koddan türetilen yeni dosyalar: `mm-duvar` (surun mazgalsız alt bölümü), `mm-sur-k` (surun kapıya yakın tonu), `mm-kenar` ve `mm-sicak` (atmosfer katmanları).

Kararlar ve gerekçeleri:
- **Hanın arkası yürünmez.** Oyuncu yüksek hanın kuzeyine geçince han kameraya daha yakın kalıp ekranı kaplıyordu (motor öndeki nesneyi saydamlaştırmıyor). Sınır x −0,9 hattındaki saksı sırasıyla görünür kılındı.
- **Teras kenarı.** Döşeme korkulukta biter; duvar yüzü ve aşağı kot, yerden yüksekliği eksi verilmiş çizimlerdir. Aşağıdaki ağaç tepeleri yürüme hattında teras seviyesini en çok 0,8 birim geçer (oyuncuyu örtmesin), iki uçta daha yüksektir.
- **Yan kenarlar.** Dik çizimle kuzey-güney korkuluk kurulamıyor; taş baba sırası, arkasında çalı ve ağaç kullanıldı.
- **Atmosfer.** Motorun ortam ışığı yalnız kişileri etkiliyor (çizimler ışığını içinde taşıyor); denendi, kişiler sahneden koyu kaldı, vazgeçildi. Yerine ekrana sabit iki katman: sıcak ton (soft-light, %14) ve mor kenar karartması (multiply). Arayüzlü kare parlaklığı master 108, oyun 108.
- **Kapılar çalışır.** Han, Kuzey Kapısı, çarşı, Arena ve Bahçe inişleri var olan alanlara açılır. O alanların çıkışı hâlâ eski meydana döner (sistem ajanının dosyaları).
- **Kişiler.** Eski meydanın kayıtlı kişileri (Ozan, Baharatçı, Usta Kerim, Yumurtacı, Muhtar) ad, portre ve replikleriyle; ayrıca Hamal, devriye Bekçi, Bahçıvan. Muhtar, Hamal ve devriye yürür. Yeni mekanik yok.
- **Telefon.** Ön plan yaprakları ekran yüksekliğine göre boyutlanır; 844 × 390'da kaplamıyor.

Doğrulama: beş kapı tek tek denendi (hepsi doğru alana geçti), yürüyen üç kişi yer değiştirdi, sınırlar tutuyor (güney 5,0 · han arkası −1,1 · kapı eşiği), sahne konsol hatasız.
Görüntüler: `merkez-meydan_tur5_2026-11-12.png`, `…_kiyas_…`, `…_gezinti_…` (altı konum), `…_telefon_…`.

## Tur 6 (2026-11-12 gece): yaşanan meydan
Kullanıcı: "Meydan güzel evet ama tam anlamıyla yaşanıyor hissettirmemiz de gerekiyor… Hiçbir şey ama hiçbir şey sticker gibi durmamalı." ve "korkulukları bir tık daha yuvarlak tut, geniş yapabilirsin."

- **Yuvarlak teras.** Güney düz koşu x −5,5…10,55; iki köşede 5,13 birim yarıçaplı çeyrek yay, dörder kirişle. Kiriş = dik çizim + çapraz derinlik (`yon`); eğik duran parça ekranda enine kısaldığı için korkuluğun ve duvarın enine daraltılmış kopyaları kullanılır (`mm-kork-83/56/20`, `mm-terasp-100/83/56/20`). Döşeme yayın içinde basamak basamak biter (aynı tohumla, desen sürer). Köşe korkuluklarında çarpışma var: oyuncu dibine giremez.
- **Teras duvarı** kendi çizimiyle (`mm-teras`, kornişli, sarmaşıklı); altında derinlik için `mm-duvar`.
- **Zemine bağlama.** Dünya ölçüsüyle yazılmış 52 nesnede `bagla` açıldı: keskin elips gölge, dipte çakıl ve ot. Master pikseliyle yazılmış nesnelerde `bagla` verilemiyor (motorda yalnız dünya biçiminde okunuyor).
- **Banklar** master'daki gibi kaba ahşap (`mm-bank`); demir kollu açı ailesi editör paletinde duruyor.
- **Hikâye izleri** (`mm-h-*`, tek sayfadan ayrıldı): bankın yanında taburede kitaplar ve uyuyan kedi; mührün ve çeşmenin yanında güvercinler; Gezgin ile Usta'nın arasında tavla ve çay; devrilmiş elma sepeti; Baharatçı'nın çiçek kovaları; Usta Kerim'in odun yığını; hanın köşesinde süpürge; sandıkların üstünde ikinci kedi.
- **Yer izleri** (`mm-iz-*`, zemine serili, 19 adet): çeşmenin sıçrattığı su, tavla sandığının altında hasır, güvercin yemi, arabanın teker izleri, erguvanların altında dökülmüş yapraklar, sur ve korkuluk diplerinde yosun, tebeşirle çizilmiş seksek. İlk sayfa (`m6_yer_izleri_v1`) taş döşemeyle birlikte geldi ve ayıklanamadı; taşsız ikinci sürüm kullanıldı.
- **Hanın arkası yeniden yürünür.** Sistem ajanı, oyuncuyu örten öndeki yüksek yapıyı solduran özelliği motora ekledi; yalnız hanın oturduğu yer kapalı. Kuyuya bakılabiliyor.
- **Gökte ejder** süzülüyor (motorun var olan özelliği); çiçek öbeklerinde kelebek.
- **Kuzey Kapısı** artık yeni Kuzey Yolu bölümüne açılıyor (`go:kuzeyyolu`).

Doğrulama: beş kapı, yürüyen üç kişi ve sınırlar yeniden denendi; masaüstü, mobil ve 14 uç senaryo hatasız.

## Güncel durum: kalan eksikler (tur 6 sonu)
1. **Öndeki yüksek nesne saydamlaşmıyor** (motor). Bu yüzden hanın arkası kapalı; doğu ve güney ağaçları oyuncu kuzeydeyken ekranın altından girebiliyor.
2. **Kişiler aynı yüzde ve ayakta** (karakter hattı, motor). Master'daki oturanlar yok.
3. **Gerçek gölge ve ışık yok**; akşam havası ekran katmanıyla taklit ediliyor.
4. **Kot gerçek değil**: teras kenarı görsel; Arena ve Bahçe "iniş"lerinde basamak çizimi yok, geçiş korkuluk açıklığından.
5. **Yan kenarlarda korkuluk yok** (taş baba sırası var).
6. **Kuzey suru** modüllerinin ek yerinde çift mazgal dişi oluşuyor; kapıdan hâlâ bir ton açık.
7. **Teras duvarı** surdan kırpılmış bir parça; kendi çizimi (kornişli, sarmaşıklı) daha iyi olur.
8. **Ön bank** demir kollu; master'da kaba ahşap.
9. Han kanadı öteki iki parçadan daha cepheden çizilmiş.
10. Alanların çıkışı eski meydana dönüyor; yeni meydan oyunun açılış sahnesi değil (Menü → Master Meydan).

## Kalan farklar (tur 1 sonundaki liste; güncel liste yukarıda)
1. **Han:** master'da ekrandan taşan, sundurması açık, içinde oturanlar olan dev kütle. Bizde aynı çizim (`mg-a00`, 576 piksel); değişmedi. Yeni büyük çizim gerekir (sayfa M1).
2. **Kapı:** master'da basamaklı üst set, istinat duvarı, kesintisiz sur. Bizde düz zeminde iki kuleli kapı; değişmedi (sayfa M1, M2).
3. **Işık:** master akşamüstü; gölgeler mor, fenerler baskın. Bizde gündüz düzlüğü sürüyor. Zemine ve nesnelere bölgesel gölge motor ister.
4. **Kişiler:** master'da on kişi, beşi oturuyor. Bizde beş kişi ayakta, aynı yüz. Karakter hattı ve motor ister.
5. **Ejder heykeli** çeşme büyüyünce arkadaki tezgâhın önüne daha çok biniyor; master'da heykel havuza göre daha küçük.
6. **Ön bank** hâlâ siyah demir kollu; master'da kaba ahşap (sayfa M4).
7. Yer mührü, yön okları ve hanın tabela yazısı yok.
8. Yatay nesnelerde (masa tablası, fıçı üstü, tarh) açı gözle yüksek; ölçülmedi.

## İstenecek çizim sayfaları
| Sayfa | İçerik |
|---|---|
| M1 · Büyük yapılar (2 parça, her biri en az 1400 piksel) | Han (master'daki 3/4 görünüş, açık sundurma, iri tabela ve fenerler); Kuzey Kapısı (kemer, basamak, iki yanında sur) |
| M2 · Sur ve kot (8) | Düz sur, sancaklı sur, sarmaşıklı sur, köşe kulesi, geniş basamak, istinat duvarı, korkuluk, korkuluk babası |
| M3 · Arka ve ön plan (8) | İki koyu yeşil ağaç, çam, büyük erguvan, uzak ağaç şeridi, koyu ön plan yaprağı, ön plan çiçeği, sarkan dal |
| M4 · Yatay nesneler, göz hizasından (8) | Havuzu saran iki yay tarh, havuz basamak halkası, kaba ahşap bank (ön, çapraz, arka), masa ve sandalye, fıçı grubu |

Her parça için istek kalıbı: rol · konu · görünüş (göz hizasının biraz üstü, yatay yüzey ince şerit) · üslup (master) · oyun ölçeğinde okunuş · teknik (saydam zemin, en az piksel) · kilit (master'daki biçim) · hariç (yazı, zemin, yer gölgesi, izometrik).

## Sistem ajanından istekler (bu bölümü engelleyenler)
1. Bölgesel gölge kütleleri ve akşam ışığı (kalan fark 3).
2. Zemine işlenen çizim: yer mührü (kalan fark 7).
3. Bölüm motorunda yön okları (kalan fark 7).
4. Oturan poz ve kişi başına farklı saç ve yüz (kalan fark 4).
5. Bir çizim kaynağından büyük çiziliyorsa editörde uyarı.

## Notlar
- Tarayıcıda editörden "Kaydet" ile saklanmış bir düzen varsa o düzen bu dosyanın önüne geçer; değişiklikler görünmezse editörde "Varsayılana dön".
- Çalışma klasörü: `ejderocagi-eng06` (sistem ajanıyla aynı). Ayrı worktree sorusu açık; bu turda yalnız bölüm ajanının yazabildiği dosyalara dokunuldu.
