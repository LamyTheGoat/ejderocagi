# Ejder Ocağı 2.0 · Çizim dünyası (2026-11-11)

Bu belge, 2026-11-11 öğleden sonra kurulan yeni görünüş hattını anlatır. Sabah raporundaki "boyalı dünya" denemesinin yerine geçer.

## Neden değişti
Kullanıcı boyalı denemeyi reddetti: çizimler "emanet" duruyordu, perspektif tutmuyordu, kötü kesim yüzünden ağaçlar yarı saydamdı.
Ölçüm doğruladı: eski çizimlerde yarı saydam piksel oranı %15–40 idi (temiz kesimde %6'nın altında olmalı).
Kullanıcının tarifi: "çizerek yaptığın şeyi daha detaylı, güzel ve anime tarzında, bu sefer assetlerle yap".

## Yöntem
1. **Geometri çizgi dünyanındır.** Yerleşim, ölçü ve perspektif kodla çizilmiş dünyadakiyle aynıdır. Çizim yalnız dokudur:
   cephe dik bir dörtgene, yan duvar yan dörtgene giydirilir; perspektifi motor verir (`js/world.js` içinde `yerlestir(D)`).
2. **Her çizim tam karşıdan (ortografik) çizdirilir.** 3/4 açılı, kendi ışığı ve gölgesi olan çizim kullanılmaz.
3. **Midjourney tarifi** (profil YOK; `--profile bijptot` perspektifli ve loş çizim veriyor):
   - Yapı: `orthographic straight front elevation of <yapı>, game building asset, …, anime JRPG town background art, crisp clean dark plum outlines of even weight, detailed two tone cel shading, warm saturated colors, flat even daylight, no cast shadows, no perspective, no ground, isolated on a plain solid magenta background, no text --niji 7 --stylize 100 --sref <ilk han çiziminin cdn adresi>`
   - Eşya ve ağaç: `game asset of <nesne>, straight front view at eye level, …` aynı kuyruk. Pembe ya da kızıl nesnede zemin `teal blue` istenir ve `--sref` konmaz.
   - Zemin: `top-down game ground texture filling the whole frame edge to edge, <zemin>, …, orthographic view straight from above`. `--tile` bu hesapta iş üretmiyor; motor dokuyu aynalı döşer.
   - `--sref` bütün parçaların çizgi ve renk dilini aynı tutar. Kuyruk en çok 10–12 iş alır; fazlası istem kutusunda birikir.
4. **Kesim:** `node eo2/tools/anahtar.mjs <girdi> <çıktı.webp> [en] [dolgu|tum] [seçenekler]`. Zemin, tohumlardan yumuşak geçişle
   büyütülür; kenar çizgisi yayılmayı durdurur, böylece zemine yakın renkli çatı gölgesi ya da ahşap kesilmez. Araç yarı saydam
   piksel oranını yazar. Kesimi parlak yeşil zeminde gözle denetle.
5. **Yerleştirme:** `assets/dunya/an/<ad>.webp`; en, kayma ve gece ışığı `js/doku.js` içindeki `OLCU` tablosunda.
   Zemin dokuları `assets/zemin/` (taş, çim, ahşap, kum, toprak); sahne `L.zemin = [döşeme, yer, karo1, karo2]` verebilir.

## Kurulanlar
- **Merkez Meydan:** han, bedesten, Kuzey Kapısı, arena kapısı, iki konak, bahçe kapısı, yan duvarlar, surlar; çınar, erguvan, selvi,
  bahçe ağacı; fener, bank, saksı, üç tezgâh, fıçı, sandık, sancak, mangal. Taş döşeme ve çim çizilmiş dokudan.
- **Ejder Bahçesi ve Kuzey Yolu:** aynı ağaç, fener, bank, saksı ve duvar çizimleri (`h.tx`, `h.D`).
- **Ocak:** 19 yapının tamamı, dedenin evi, ocak kulesi, çalılık, korkuluk yeni çizim; zemin çim ve toprak yol; uzak plan meydanla aynı gök.
  İşlev: ejderha haftalık emrine göre ilgili yapının başına gider (yalnız gösterim); yapı künyesinde o haftaki durum ve ilgili ekrana kısayol.
- **İç mekânlar:** Han, Pazar ve Arena'nın duvarları, eşyaları, halıları ve zeminleri çizilmiş; duvarlarda kabartma ve derinlik kayması var.

## Pilot Meydan (deneme haritası)
Kullanıcının ölçütü (2026-11-11): **başarı = pilot ekranının referans görsele benzerliği**
(`02_UI_MOCKUP/ANA_REFERANS_MERKEZ_MEYDAN_YAKIN_KAMERA.png`). Her turda ikisi yan yana konur (`docs/pilot_kiyas_2026-11-11.png`).

- Giriş: Menü → Pilot Meydan. Kod: `js/pilot.js`. Oyunun kurallarına ve kaydına dokunmaz.
- Deneme paneli (seçim tarayıcıda saklanır): Işık (düz / altın saat / akşam), Kabartma, Derinlik kayması, Katmanlı cephe,
  Ön plan, Dip örtüsü, Nesneler (düz / hacimli), Han çizimi (temiz / tombul / boyalı / karma).
- **Üslup kararı (kullanıcı, 2026-11-11):** Türk-Avrupa karması. Karma han: revaklı taş zemin kat, cumba, çini kuşağı, kalın ahşap çatkı,
  kiremit çatı (`pl-han-d`). Yeni yapılar bu dille çizdirilir; K2'nin "yalnız Anadolu" hükmü bu kararla genişledi (KARARLAR.md'ye işlenmeli).
- Bu turda denenen ve işe yarayan yöntemler:
  - **Çapraz duvar:** dörtgenin köşeleri dünyada serbest verilir; han cephesi sağ-aşağıya bakacak biçimde çapraz durur (`duvar()`).
  - **Hacimli nesne:** masa = yatay tabla + ayak + ayrı tabureler; tarh = taş kenar + çiçek örtüsü + üç sıra çiçek;
    çeşme = gerçek halka havuz + yatay su + ortada heykel + akan damlalar.
  - **Kabartma (normal map):** resmin çizgi ve derzlerinden üretilir (`doku.js` `kabartmaOf`), yapı türüne göre dozlanır (`relK`);
    şömine gibi ışık noktası duvarı aydınlatır (`lp`). Zeminde taşlar fener ışığına göre kabarır (`gl.js` `dokuN`).
  - **Derinlik kayması (parallax):** çukur yerler bakışa göre kayar (`derin`).
  - **Katmanlı cephe:** çatı arkaya eğik yüzey, üst kat ya da sundurma öne çıkık (`kat`).
  - **Işık:** akşamda ortam serin-mor, sıcaklık yalnız ışıkların çevresinde; kenar karartması (`#isikSuzgeci`).
  - **Pilot kamerası:** `EO2.CAM.pilot` (referans kadrajı); haritadan çıkınca eski kip döner.
- Sonradan eklenenler: karma han ve yan yüzü, asılı tabela, sepet ve çuval öbekleri, saksı öbekleri, üstten sarkan dal, çapraz doğrultuda
  hacimli tarh, mavi ejderli alçak havuz, mavi-altın sancak, küçültülmüş taşlar, yumuşatılmış zemin kabartması.
- 7. tur (çiçekler ve çeşit): tarh artık ayrı parçalardan kurulur ve her doğrultuda çalışır (`tarh(a, b, n, dp)`): önde ve arkada taş
  kenar (`pl-kenar`), üstte çiçek örtüsü, arkada lale-lavanta (`pl-cicek-b`), ortada gül (`pl-cicek-a`), önde papatya (`pl-cicek-c`);
  parçalar yan yana döşenir, oran bozulmaz. Saksı (çiçek arkada ve önde iki katman), ortanca çalısı (iki katman) ve bank (sırtlık dik,
  oturak yatay, ayaklar önde) de hacimli. Çeşme suyu çizilmiş doku (`pl-su`), iki katman ters yönde döner; havuz duvarı taş blok
  (`pl-havuz-duvar`). Yeni çeşitler: çiçek arabası, kuyu, bayrak ipleri, askı sepet, desenli saksılar.
  Çiçek çiziminde işe yarayan tarif: "one single long row of … seen straight from the front, fills the frame from left edge to right edge",
  iri ve tombul çiçek ("large chunky blossoms"), pembe çiçekte camgöbeği zemin.
- 8. tur (açılı dünya, tek üslup; kullanıcı talimatı 2026-11-11): kullanıcı "çiçekler havuzun çevresini dönmeli, her şey yapıştırma gibi"
  ve "birçok şey dünyaya ait değilmiş gibi duruyor; gerekirse her şeyi aynı açı, aynı renk, aynı ışıkla tek tek yapalım" dedi.
  Bu, yukarıdaki "geometri motordan, çizim düz cepheden" yönteminin pilottaki karşı seçeneğidir; ikisi panelden karşılaştırılır
  (Nesneler: Düz / Hacimli / Açılı). Açılı seçenekte eski düz çizimlerin hiçbiri çizilmez.
  - Üslup çapası: önce referansların paletinde tek bir sahne görseli üretildi (mor arduvaz çatı, krem-ahşap cephe, gri-lila taş,
    altın fener ışığı). Bütün `pa-*` çizimleri bu görsele `--sref <çapa> --sw 70` ile bağlandı; renk ve ışık böyle tek elden çıkıyor.
    Çapa: `https://cdn.midjourney.com/0dd5321e-d2fe-45a3-9eed-f30047fcf6b3/0_3.webp`.
  - Tarif: `game asset of <nesne>, isometric three-quarter view from above, <cephe yönü: the front faces the lower right/left>, …,
    chibi JRPG town game asset, crisp clean dark plum outlines, detailed cel shading, warm golden evening light, no cast shadow on the
    ground, whole object visible with margin, isolated on a plain solid teal blue background, no text --niji 7 --stylize 100 --sref … --sw 70`.
    Macenta zemin bu çapayla tutmuyor (koyu zemine dönüyor); camgöbeği kullan.
  - Eğik yüzey: açılı çizim dik durmaz. Ön-alt kenarı yerde, üst kenarı nesnenin arka-üstünde olan eğik bir dörtgene gerilir
    (`egik`, `nesne(ad, x, y, en, ön, arka, boy)`). Eğik yüzeyin ekrandaki boyu (taban derinliği × sin açı + yükseklik × cos açı)
    gerçek nesneninkiyle aynı değişir; kamera yürüdükçe çizim zemine yapışık kalır. Büyük yapılarda sıralama anahtarı elle verilir.
  - Kesim: `anahtar.mjs … dolgu golge=1` (aralıklı nesnede `tum`). İçeride kalan zemin cepleri için ada merkezini bulup `tohum=` ver
    (çeşmede kanat araları). Işıklı nesnelerin çevresinde kalan zemin renkli hale `tools/hale.mjs <dosya> <zemin r,g,b> 17` ile
    temizlenir; eşik 26'yı geçerse taşları da yer.
  - Boyut: karakter boyu 1,7. Fener ve sancak 1,6-1,8 kat, bank 1,3 kat, masa tablası 1 kat, çeşme tabanı 3,2 kat, tezgâh 2,4 kat.
  - Kamera: karakterin ekrandaki boyu artık ön ayardan gelir (`CAM.<ad>.kisi`, varsayılan 0,2). Panelde Yakın (ana referans),
    Orta, Uzak (genel görünüş referansları). Zemin: Koyu lila (`tas5`). `#world.pilot-tek` süzgeci doygunluğu ve karşıtlığı artırır.
  - Derinlik: surun arkasında ağaç sırası ve uzak manzara (`pa-uzak`: tepede kale, şelale, çam), altta taş korkuluklar.
  - Bilinen eksikler: çeşme (`pl3-cesme-c`) çapadan önce çizildi, taşı diğerlerinden soğuk; han çizimi 857 piksel, yakın kamerada
    hafif yumuşak (büyütülmüş sürümü alınmadı); kapı tam karşıdan yeniden çizildi (`pa-kapi2`), sağ dibinde koyu bir gölge parçası
    kaldı; `sonsil=` ile gölge silinen çizim `tools/kirp.mjs` ile yeniden kırpılmalı, yoksa nesne havada durur; kişiler oturmuyor; çarpışma alanları yeni
    çizimlere göre yeniden ölçülmedi; eski haritanın kenar surları (`sur-b`, `sur-d`) hâlâ eski çizim.
- Referansla kalan farklar: oturan/okuyan kişiler yok (chibi motoru kullanıcıdan gelecek), kapıda yön okları yok, çeşmenin havuz taşı
  referanstaki gibi iri gri blok değil, çizim dili referanstan daha keskin, ışık çevresindeki sıcak parlama referanstakinden zayıf.

## Master Meydan (sıfırdan kurulum, 2026-11-11 akşam)

Kullanıcı talimatı: "Blank slate başlayalım, tamamen master reften gidelim. Sanat stilimiz oyuncu karakterininkiyle aynı olsun.
Kamera perspektifi, görünüşler ve assetler için her zaman başvurulacak yer master referans. Piksel piksel titizlik bekliyorum."
Gerekçesi: 8. turdaki `pa-*` seti yukarıdan (izometrik) çizilmişti; master'da kamera alçak olduğu için çizimler "sakat" durdu.
Üretici: Midjourney (kullanıcı ChatGPT/Codex yolunu istemedi).

Sahne `js/master.js` (Menü → Master Meydan). Pilot haritadan hiçbir çizim ya da ölçü taşınmadı.

- **Master**: `02_UI_MOCKUP/ANA_REFERANS_MERKEZ_MEYDAN_YAKIN_KAMERA.png` (1672 × 941). Dosya depoya kopyalanmaz, değiştirilmez.
- **Kamera master'dan ölçüldü**: oyuncu 215 piksel, ayak y = 705; ufuk y ≈ 20, odak ≈ 1780 piksel → eğim 14,2°, yükseklik 5,25,
  oyuncuya uzaklık 13,2, dikey görüş açısı ≈ 30°. Alçak ve uzak kamera: nesneler tepeden değil, göz hizasının biraz üstünden görünür.
  Motor ön ayarı `CAM.master` (`kisi`: karakterin ekran boyu oranı). Bindirmede bizim karakter master'daki karakterle üst üste gelir.
- **Yerleşim master pikselinden**: `PX(x, y)` master'daki zemin pikselini dünyaya çevirir. `NESNE` tablosunda her nesne taban ortası x,
  taban y ve master'daki piksel eniyle yazılır; dünya konumu ve boyu bundan hesaplanır. Elle dünya ölçüsü yazılmaz.
- **Çizimler dik durur**: 14 derecelik kamerada dik levha boyunu korur; eğik yüzey yöntemi burada gerekmez.
- **Çizim tarifi (`ms-*`)**: `game asset of <master'daki görünüşüyle nesne>, side view at eye level / front elevation, camera only slightly
  above eye level so the top is a thin flat ellipse, anime chibi JRPG town art, thick clean dark brown outlines, cel shading with soft
  gradients, saturated warm colors, golden evening light, no cast shadow, whole object visible with margin, isolated on a plain solid
  teal blue background, no text --niji 7 --stylize 100 --no isometric, aerial view, top-down, high angle --sref <çapa> --sw 30`.
  Çapa yalnız renk ve çizgi içindir (`https://cdn.midjourney.com/27d9c8e4-950d-4745-8309-3e43714f5c3c/0_3.webp`); Midjourney kasaba
  sahnesini hep tepeden kurduğu için açıyı çapa değil, nesne tarifindeki "eye level / side view / edge-on" sözleri tutturur.
  "three-quarter view from above" ya da "isometric" yazma: kamera hemen yükselir.
- **Zemin kodla boyanır**: han önündeki merkezin çevresinde eğri sıralı kare tuğla; tonlar master'dan örneklendi, ortalamaya yüzde 42
  yaklaştırıldı (yoksa dama gibi duruyor). Nesne gölgeleri ve fener ışık havuzları aynı resme pişirilir. Yakın alan 88, kapı yolu 30
  piksel/birim.
- **Ön plan**: alt köşelerde ve sol üstte bulanık çiçek ve yaprak (`#masterOn`, ekrana sabit, oyuncuyla hafifçe kayar).
- **Kıyas araçları** (scratch): `bak.mjs --boyut=1672x941`, `ustune.mjs <master> <bizim> <çıktı> yari|bol|fark`, `izgara.mjs` (ölçüm
  ızgarası), `renkal.mjs` (renk örnekleme). `EO2.master.kilavuz(1)` ölçü noktalarını ve 5 birimlik ızgarayı gösterir.
- **Master Midjourney'e yüklendi (kullanıcı onayı, 2026-11-11 gece)**: yerleşik tarayıcı dosya yükleyemediği için yükleme Chrome
  eklentisiyle yapıldı; master ve sekiz kırpması (han, çeşme, kapı, tezgâh, masa, sancak, fener, zemin) hesabın yüklemelerinde durur.
  Master adresi: `https://cdn.midjourney.com/u/b1aa4711-64bd-4c57-9bed-59a72b2cc613/3224f40d36c499b460b60cbd4f5977ba3648f6ed9bb2be4f53934ec193858727.png`.
  - Çalışan kullanım: master **üslup referansı** olarak, `--sref <master> --sw 300`, üstüne yukarıdaki göz hizası tarifi. Nesne tek başına
    ve master'ın boyama diliyle çıkar (dokulu ahşap ve taş, parlayan fener, lacivert-altın sancak). `ms-*` setinin tamamı böyle yeniden üretildi.
  - Çalışmayan kullanım: kırpmayı **görsel istem** olarak vermek (`<kırpma adresi> … --iw 2`). Midjourney sahneyi kişiler ve arayüzle
    birlikte yeniden çizer; ayrı nesne çıkmaz.
  - Arka planı düz renk istenince çoğu kez geçişli ve parıltılı gelir; `anahtar.mjs` çoğunu temizler, kemer içi gibi kapalı cepler için
    `tohum=` ya da `sonsil=` gerekir. Çizime sızan anlamsız küçük yazı scratch `boya.mjs` ile kapatıldı (tabela).
- **Sahne editörü**: Menü → Sahne editörü (ya da `EO2.master.editor(true)`). Nesneye tıkla: seç; sürükle: taşı; tekerlek: boyut
  (Shift ile yükseklik); oklar: ince kaydır; F: çevir; Ctrl+D: çoğalt; Delete: sil; Alt+tık: arkadaki nesne; WASD: yürü.
  Panelde ölçü alanları, çizim paleti (ekle), Kaydet (tarayıcıya), Dışa aktar (`master_duzen.js` indirir), Zemini yenile (gölgeleri
  yeniden boyar), Varsayılana dön, Kılavuz, Referans bindir (yerel bir görseli saydam olarak üste koyar; master'la hizalamak için).
  Düzen önceliği: tarayıcıdaki kayıt → `js/master_duzen.js` → `NESNE` tablosu. Dışa aktarılan dosya `eo2/js/master_duzen.js` yerine
  konunca düzen herkes için varsayılan olur. Editör şimdilik yalnız Master Meydan'da çalışır; kişiler, ışıklar ve zemin deseni
  editörden değişmez.
- **Deneme: ışıksız çizim + motor ışığı (2026-11-11 gece, kullanıcı önerisi; üç nesnede: bank, han, çeşme)**. Editörde
  "Işıksız çizim" düğmesi ya da `EO2.master.deneme(1)`; varsayılan kapalı. Çizimler `mn-*`.
  - Tarife eklenenler: `matte flat even lighting from the front, no glow, no bloom, no sparkles, no cast shadow, no ground, clean hard
    silhouette`, `--no … shadow, glow, sparkles`, `--sw 250`. Işıyan yerler için: `lantern glass and window panes are a flat warm amber
    color without any glow or light rays`.
  - İşe yarayan: kesim. Bank ve han tek geçişte, gölge ve hale temizliği gerekmeden temiz çıktı; ışıklı çeşmede su çevresinde kalan mor
    saçak ışıksızda yok. Çapraz derinlik (`yon`): çizim 8 dikey dilime bölünür, her dilim kendi derinliğinde durur; bank yere çapraz
    basar, oyuncu uzak ucun arkasından ve yakın ucun önünden doğru sırayla geçer. Editörde "Çapraz derinlik" alanı var.
  - İşe yaramayan / zayıf kalan: motor ışığı (ortam rengi + parıltı lekeleri) çizimin içine boyanmış ışığın sıcaklığını vermiyor; han
    sönük duruyor. Silüetten yer gölgesi alçak kamerada ince kalıyor; kameraya doğru düşürülünce görünür ama keskin kenarlı.
    Kullanıcının değerlendirmesi: "Umut vaat ediyor ama çok iyi değil. Asset üreterek deneyelim bir de."
  - Denenip yapılamayan: Midjourney düzenleyicisinde ışıksız çizimi biçimi bozmadan ışıklıya çevirmek. "Edit from URL" bu tarayıcıda
    açılmayan bir iletişim kutusu istiyor.
- **Deneme 2 (aynı yöntem, daha iyi çizimlerle; kullanıcı talimatı)**: han ve çeşme için ikişer tarifle sekizer aday üretildi, en
  iyileri seçildi (`mn-han`, `mn-cesme`). Tarife eklenen: `rich saturated colors, detailed textures, soft ambient shading for volume`
  ve ışıyan yerler için `painted as bright flat amber without any glow halo`. Motor tarafında:
  - Işıma artık elle nokta yazılarak değil, çizimin kendisinden çıkar: çok parlak kehribar (fener camı, pencere) ve çok parlak camgöbeği
    (su) pikselleri ayrılır, bulanıklaştırılır, toplamalı çizilir (`ekDoku(ad, 'p')`). Kiremit turuncusu eşiğin altında kalır
    (yeşil bileşeni 186'dan küçük); eşik gevşetilirse bütün çatı parlar.
  - Yer gölgesi bulanık silüetten (`ekDoku(ad, 'g')`); kenarı yumuşak.
- **Kurulu nesne: bank (kullanıcının sorusu: "banklar neden bir türlü iyi olmuyor?")**. Sebep çizim kalitesi değil, açıdır. Bank neredeyse
  bütünüyle düz yüzeylerden oluşur (yatay oturak, dik sırtlık); yatay bir yüzeyin basıklığı kamera açısını ele verir. Midjourney bankı
  her seferinde oturağı görünsün diye 35-45 derece yukarıdan çizer; sahnenin kamerası 14 derecededir, oturak zemine uymaz ve bank
  "yapıştırma" durur. Çalı, ağaç, ejder gibi yuvarlak ve organik nesnelerde aynı hata göze batmaz.
  Çözüm: bankı çizdirmek yerine kurmak. Üç DÜZ çizim istenir (`orthographic straight front elevation … no perspective at all`,
  `orthographic straight side elevation … seen exactly from its end`, `top-down … seat planks`) ve bunlardan beş yüzey kurulur:
  yatay oturak, dik sırtlık ve arka ayaklar, ön yüz, iki yan yüz (`mk-bank-on`, `mk-bank-yan`, `mk-bank-ust`; `bankCiz`).
  Perspektifi kamera verir; bank `aci` (derece) ile her yöne döner, arkadan da doğru görünür. Yüzeyler ayrı tonlanır (oturak açık, ön
  koyu). Boy boyunca dört parça ayrı sıralanır. Editörde "Dönüş (derece)" alanı ve Q / E tuşları.
  Aynı yol düz yüzeyli öteki nesnelere uygulanabilir: masa (yatay tabla), tezgâh (tabla + tente), tarh (kutu), basamak, sandık.
- **Kurulu nesne denemesi REDDEDİLDİ (kullanıcı, 2026-11-11 gece)**: bank üç düz çizimden beş yüzey olarak kuruldu. Kullanıcı:
  "Kurulmuş bank da çirkin, hem bizim 3D nesne olmama kuralımıza ters." Kod ve çizimler kaldırıldı. Kural: sahnedeki her nesne tek bir
  2D çizimdir; yüzeylerden kurulmaz.
- **Çok açılı bank (kullanıcı talimatı)**: aynı bankın göz hizasından, ışıksız ve yer gölgesiz görünüşleri; ışığı ve gölgeyi motor verir.
  Dokuz çizim (`mb-bank-000 … 180`: 0, 30, 45, 60, 90, 120, 135, 150, 180), eksi açılarda ayna: 16 yön. Bank nesnesinin `aci` alanı
  (editörde "Dönüş") en yakın çizimi seçer; bütün görünüşler aynı ölçektedir. Önizleme: `docs/master_bank_acilar_2026-11-11.png`.
  - Çalışan tarif: `game asset turnaround sheet, the same … bench … shown six times in a grid of three columns and two rows: front view,
    front three-quarter view …, exact side view, back three-quarter view, exact back view, every view from the same low eye level camera
    only slightly above so the seat top is just a thin strip, identical bench design, size and colors in every view, matte flat even
    lighting, unlit, no glow, no cast shadow, no ground, clean hard silhouettes … plain solid magenta background --ar 3:2 --niji 7
    --sref <master> <karakter> --sw 300`. Tek sayfadaki görünüşler aynı bankı tutar ve göz hizasından gelir.
  - Sınırlar: bir sayfa en çok beş altı farklı açı verir (ön, ~30°, tam yan, arka; bazen arka çapraz). "Sırayla dönen beş görünüş" ya da
    belirli derece istekleri tutmaz. Eksik açılar için ilk sayfa görsel istem yapılır (`<iş adresi>/0_2.png … --iw 2`; `--iw` bu modelde
    en çok 2); gelen bank aynı aileden ama birebir aynı değildir. Şimdiki dokuz çizim dört ayrı sayfadan: 0, 30, 90, 180 ilk sayfadan
    (birebir aynı bank); 45 ve 60 üçüncü sayfadan (kamera biraz yüksek); 120 ve 135 ikinci sayfadan (kolçaklar siyah demir); 150
    dördüncü sayfadan. Açı etiketleri göz kararıdır.
  - Dünyaya bağlama (kullanıcı önerisi; "birebir aynı bank olmasına gerek yok, ama dünyaya daha iyi entegre edelim"): bank koyu
    tonla ve zemine doğru üç kuşakta kararan renkle çizilir (`BANK_TON`), altında yumuşak eliptik temas gölgesi vardır, ayak diplerinde
    kodla çizilen çakıl ve ot tutamları durur. Çakıl ve otun yeri sabit oran değildir: `ayakOf` her çizimde ayakların yere bastığı
    pikselleri bulur (her sütunun en alttaki dolu pikseli; tabana inen öbekler ayaktır) ve süs tam oraya, ayağın dibini hafifçe örterek
    konur. İlk denemede sabit oranla konmuştu; kullanıcı "tam yere temas ettiği yere koyamadın" dedi.
  - Araçlar (scratch): `ayir.mjs` (kesilmiş sayfayı ölçeği koruyarak çizimlere ayırır), `bankSayfa2.mjs` (ölçekleri eşitler, zeminden
    kalan kırmızıyı siler, çizimleri ve sayfayı yazar). Aralıklardan görünen zemin `anahtar.mjs` ile gitmez; ton süzgeciyle silinir.
- **Master sayfaları seti (`mg-*`, 2026-11-11 gece; kullanıcı sağladı)**: kullanıcı ChatGPT'den doğrudan master görselin asset
  sayfalarını istedi ve üç sayfa gönderdi (han, tezgâhlar, çeşme, kapı, bank, fener, sancak, fıçılar, tarhlar, çalılar, tabela, masa,
  korkuluk, erguvan vb.). Sayfalar saydam zeminli geldi; scratch `ayir2.mjs` ile 56 çizime ayrıldı (kenarlarda kalan saf kırmızı ve
  saf sarı saçak pikselleri silinir; masa ve sandalyeler tek parça olarak ayrıca kırpıldı). Sahnede ikinci çizim seti olarak bağlı:
  `SET2` tablosu sahnedeki nesneyi bu setteki çizime ve en çarpanına eşler; editörde "Çizim seti" düğmesi (varsayılan: master
  sayfaları). Bu çizimler master'ın ışığını taşıdığı için motor ışığı uygulanmaz. Eşi olmayanlar (yeşil ağaç, çam, sur) ve çok açılı
  bank eski çizimleriyle kalır. Bütün `mg-*` çizimleri editör paletinden sahneye eklenebilir.
  Not: bu, üreticinin Midjourney olması kararının istisnasıdır; sayfaları kullanıcı kendisi üretti.
- Bankın altındaki gölge kullanıcı isteğiyle yumuşak lekeden keskin kenarlı, belirgin elipse çevrildi (`ic.elips`).
- **Master ile kalan farklar**: han master'da sağa dönük ve eğik görünür, tabelası ve iri fenerleri daha baskın; bizimki cepheden.
  Çeşme artık master'daki gibi geniş, oymalı taş havuzlu ve kanatlı mavi ejderli; ejderin tonu master'dakinden koyu. Kapı yolunda mavi yön okları,
  yerdeki ejder mührü, oturan kişiler, saksı çiçekleri ve master'daki kişi çeşitliliği yok. Master görsel Midjourney'e
  üslup referansı olarak kullanılıyor; nesneler yine metin tarifinden üretildiği için biçimleri master'dakilerle birebir aynı değil.

## Bölüm motoru (2026-11-11 gece)

Görev dağılımı değişti (kullanıcı): bölümleri ayrı bir ajan tasarlar; sistem ajanı arayüz, sistemler, perspektif ve araştırmaya bakar.
Bunun için Master Meydan'ın kodu ikiye ayrıldı: `js/bolum.js` (motor: kamera, zemin, nesne çizimi, setler, açı aileleri, zemine
bağlama, ışıksız eşler, editör) ve `js/bolumler/merkez-meydan.js` (yalnız veri). Eski `js/master.js` kaldırıldı; sahne birebir aynı
görünür. Sözleşme `docs/BOLUM_SOZLESMESI.md`, bölüm ajanının istemi `docs/BOLUM_AJANI_ISTEMI.md`. Bölümün çizimleri artık
`doku.js` listesinden değil, bölüm dosyasından yüklenir (`EO2.doku.ekle`). `js/bolumler/ornek-deneme.js`: motoru ve perspektifi
sınayan küçük alan (Menü → Deneme alanı). Yukarıdaki "Master Meydan" bölümünde `master.js` diye geçen yerler artık bu iki dosyadır.

## Kalanlar
- İç mekân tavanları ve asılı fenerler hâlâ çizgi.
- Gök Yarışı dekoru hâlâ eski (reddedilen) çizimlerle; yarı saydam ağaçlar orada duruyor.
- Çeşme gövdesi ve kaidesi çizgi; ejder heykeli oyunun kendi çizimi.
- Eski boyalı deneme (`js/meydan25.js`, `assets/dunya/my-*`, `yapi-*`, `ys-*`) menüden kaldırıldı ama dosyalar silinmedi.
- Arayüz düğmeleri için çizim desteği (kullanıcı izin verdi) başlanmadı.
- 03 Art Direction ve 04 Asset Studio onayı yok; görünüş kullanıcı onayı bekliyor.
