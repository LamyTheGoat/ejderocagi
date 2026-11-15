# Arayüz denetimi

> Sistem ajanı, 2026-11-11 gece. Yalnız inceleme; hiçbir arayüz dosyası değişmedi.
> Kıyas: master referans (1672 × 941) ile oyunun aynı boydaki görüntüsü. Master'ın ölçüleri Canva katman ayırmasından.
> Görsel: `docs/arayuz_master_ve_oyun_2026-11-11.png` (sol master, sağ oyun).

## 1. Ana ekran (HUD): master ile ölçülü kıyas

| Parça | Master | Oyun | Fark |
|---|---|---|---|
| Logo | 160 × 99 | 138 × 92 | biraz küçük |
| Profil plakası | yaklaşık 310 × 65, portre 62 | 219 × 53, portre 46 | belirgin küçük |
| Para kutuları | 3 kutu, her biri yaklaşık 180 × 50, yazı 20, "+" düğmeli | 3 çip, 32 yüksek, yazı 17,6 | küçük ve alçak |
| Sağ üst düğmeler | 3 adet, yaklaşık 45, çerçevesiz simge, bildirim noktası | 3 adet, 43, halkalı | yakın |
| Mini harita | yaklaşık 215 çap, içi çizilmiş harita, pusula, + / − | 166 çap, **içi boş** | küçük ve boş |
| Görev paneli | yaklaşık 328 × 155, satırlar tek satır, yazı 17,6 | 296 × 225, satırlar 2–3 satıra kırılıyor, yazı 16 | dar ve uzun |
| Etkinlik şeridi | var (328 × 42) | yok; yerinde "Haftayı Bitir" | içerik farkı |
| Sohbet | 403 × 203, 4 sekme + kapat | 352 × 211, 3 sekme | dar |
| İfade çubuğu | 5 düğme, 60 | 6 düğme, 37 | belirgin küçük |
| Eylem çubuğu | 6 düğme, 80–100, yazı 20; zengin çizilmiş simgeler | 7 düğme, daha küçük, yazı yaklaşık 17; düz tek renk simgeler | küçük, simgeler sade |
| Yazılar | yarı kalın, 17,6–20,2 | Noto Sans, 16–17,6 | bir kademe küçük |

Genel sonuç: yerleşim ve dil master'a benziyor; **her şey master'dan bir kademe küçük** ve en büyük görsel fark **simgelerde** (master'da çizilmiş, bizde düz biçim) ve **boş mini haritada**.

Karardan gelen, hata olmayan farklar: seviye yazısı yok (K5), elmas yok (K4), lonca sekmesi yok (K6), hafta çipi ve "Haftayı Bitir" var (K3), "Ocak" düğmesi fazladan var (K11).

## 2. Görülen hatalar

1. Sohbet: günlüğün ilk satırı sekmelerin altında yarım kesiliyor.
2. Arena karşılaşma ekranı: soldaki "Yetişkin · Ateş" ve "Güç 34 · 0 G 0 M" yazıları açık duvarın üstünde okunmuyor.
3. Arena: "Hedef tamamlandı" bildirimi sekme satırının hemen altına, sahnenin ortasına biniyor.
4. Mobil (eski Meydan): sohbet düğmesi "Topçu Arenası" tabelasının yazısını örtüyor.
5. Mobil ve masaüstü: yer adı plakası mini haritanın üst kenarına biniyor.
6. Merkez Meydan: hanın üstünde yüzen "Han" etiketi, binanın kendi tabelasını tekrarlıyor (master'da yüzen etiket yok).

## 3. İyi durumda olanlar

- Ejderhalar (Ahır) ve Arena karşılaşma ekranları sahne olarak kurulmuş; panel ve tablo yok (K19'a uygun).
- Cam dili (koyu lacivert gövde, ince altın kenar, mavi seçili hap) ekranlar arasında tutarlı.
- Ahırdaki eylem simgeleri çizilmiş (kukla, et, torba, zırh, taç, dolap); ana ekranın eylem çubuğundakiler değil. İki çubuk aynı dili konuşmuyor.

## 4. Arena dövüşü: Ejder Ocağı 1 ile 2.0

Kullanıcı talimatı (2026-11-11): eski dövüş daha iyiydi; genel yapı korunur, arayüz yenilenir.

Koddan çıkan durum (Ejder Ocağı 1'i çalıştırıp bakmadım; 2.0'ın ekranına baktım):

| | Ejder Ocağı 1 (`js/ui.js` fightModal) | 2.0 (`eo2/js/arena.js`) |
|---|---|---|
| Dövüş mantığı | `core.js` newFight / fightRound | aynısı (ortak) |
| Maç öncesi ve sonrası sahneler | `fightev.js` | var (aynı olaylar) |
| Arena hikâyeleri, çizgi roman | `arenastory.js` + `comic.js` | var (`cizgi.js` üzerinden) |
| Sahne | arena zemini, iki yanda **terbiyeciler** ve canlandırmaları | yalnız iki ejderha |
| İsim plakaları | durum rozetleri (sarsıldı, öfkeli, buz zırh, gölgede, sersem), hayalet can çubuğu | ad, element, can ve nefes çubuğu |
| Eylemler | rıhtım, klavye kısayolları, kartlar Q/W/E, sıraya alma | 4 eylem + kart, otomatik, teslim |
| Tribün kipi | tezahürat, yuhalama, bahis | yok |
| Efektler | uçan yazı, şok dalgası, patlama, nefes, kalp, para, ekran sarsıntısı, geniş ses seti | sade vuruş canlandırması |

Yani mantık ve hikâye tarafı zaten ortak; eksilen şey **dövüş ekranının kendisi**: terbiyeciler, durum rozetleri, tribün, efektler.

Öneri: dövüş ekranını yeniden yazmak yerine Ejder Ocağı 1'in ekranını 2.0'ın içinde barındırmak ve cam diline giydirmek. Bunun için gereken barındırıcı zaten var (`eo2/js/eski.js`; gök yarışı ve Kıraathane böyle çalışıyor).

## 5. Önerilen sıra (karar değil)

1. Hatalar (bölüm 2): küçük ve risksiz.
2. Ana ekranı master ölçülerine büyütmek (bölüm 1): yalnız stil.
3. Eylem çubuğu, para ve görev simgelerini master üslubunda çizdirmek (Midjourney; önce tek simgede kanıt).
4. Mini haritanın içini çizmek.
5. Arena dövüş ekranını Ejder Ocağı 1'den taşıyıp giydirmek (önce eskisini çalıştırıp görüntüsünü almak).

## 6. Yapılanlar (aynı gece, kullanıcı onayıyla)

- **Ölçüler:** ana ekranın parçaları master ölçülerine getirildi (`css/olcu.css`, en son yüklenir; yalnız 3:2 ve daha geniş pencerede, telefon düzeni aynen). Profil, para kutuları, mini harita, görev paneli, sohbet, ifade ve eylem çubukları büyüdü; yer adı plakası haritanın üstüne çıktı, ifade çubuğu eylem çubuğunun soluna alındı. 1280 × 720, 1672 × 941 ve 1920 × 1080'de bakıldı.
- **Hatalar:** sohbetin yarım kesilen ilk satırı (üst kenar yumuşatıldı), arena yazılarının okunurluğu, plakanın haritaya binmesi düzeltildi. Düzeltilmeyenler: arenadaki bildirim konumu, mobilde sohbet düğmesinin dünya etiketini örtmesi (ikisi de rastlantısal örtüşme), hanın üstündeki "Han" etiketi (bölüm verisi; bölüm ajanının dosyası).
- **Düzeltme:** bölüm 1'de master'ın simgelerine "zengin çizilmiş" demiştim; büyütüp bakınca öyle değil. Master'ın simgeleri de lacivert madalyon üstünde krem-altın düz biçimler; farkları daha büyük, koyu çizgili ve daha karakterli olmaları.
- **Simgeler:** eylem çubuğunun yedi madalyonu Midjourney'de master'ın dilinde çizdirildi (ikinci denemede tuttu; sayfa `docs/arayuz_simge_sayfasi_2026-11-11.webp`), `tools/madalyon.mjs` ile kesildi (`assets/ik/mdl-*.webp`, 256 piksel). Sekizinci madalyon (para) kesildi ama kullanılmadı. Çalışan istem: "eight round badges in a 4x2 grid on plain flat magenta background; every badge is a solid very dark navy blue filled disc with a thin gold rim, and inside it one large monochrome pale cream gold pictogram silhouette with a thick dark outline…", `--ar 2:1 --sref <master> --sw 20`.
- **Dokunuş:** eylem, ifade, sohbet sekmesi ve gönder düğmelerine basılma hâli eklendi.
- **Mini harita:** bölümlerde büyük nesneler blok olarak çiziliyor (artık boş değil). Master'daki gibi çizilmiş harita, yer rozetleri, pusula ve yakınlaştırma düğmeleri **yok**; bunun için harita çizimi ve motor desteği gerekiyor.
- **Araştırma:** Genshin Impact'in ekranlarına Game UI Database üzerinden bakıldı. Çıkan ilkeler: tek bir simge ailesi (tek renk, tek çizgi kalınlığı), birincil düğme açık krem hap, ikincil koyu; pencerelerde ince köşe süsü ve ince ayraç; az sayıda yazı boyu; rozet ve "yeni" etiketi dışında renk yok. Bizim cam dilimiz bununla uyumlu; eksik kalan, ekranlar arasında simge ailesinin tek olması (ahır simgeleri renkli çizim, ana ekran tek renk).
- **Kalan simgeler (2026-11-12):** ifade simgeleri master'daki gibi krem-beyaz ve koyu dış çizgili oldu (çizimler aynı, renk ve çizgi `olcu.css`'ten). Ses, zil ve çark simgeleri düğmelerini daha çok dolduruyor; gönder düğmesi ve sohbet yazısı büyüdü. Para ve ün simgeleri master'a zaten yakındı, dokunulmadı. Ahırdaki renkli eylem simgelerini ana ekranın ailesine çekmek için yeni çizim gerekiyor; o gün Midjourney'ye ulaşılamadı (bağlı aracın kotası yok, yerleşik tarayıcıdaki oturum kapanmış).
- **Ahır simgeleri (2026-11-12):** ahırın altı eylem simgesi (Emir, Besle, Bakım, Kuşam, Rol, Bilgi) ana ekranla aynı madalyon ailesine geçti. Aynı istemle çizdirildi; dört sayfadan yalnız biri altı simgeyi de eksiksiz verdi (ötekilerde kitap eksik ya da başka simgeyle birleşmişti). O sayfanın zemini lacivert çıktığı için kesim `ALTIN=1` seçeneğiyle yapıldı. Bu takımın madalyonları ana ekrandakilerden biraz daha parlak (üstte ışık yansıması, çift çerçeve); aynı aile ama birebir aynı el değil. Sayfa: `docs/arayuz_simge_sayfasi_ahir_2026-11-12.webp`.
- **Öteki bileşenler (2026-11-12):** bütün ekranlar toplu gözden geçirildi (Ocak, Pazar, Han, Sefer, Yuva, Ahır kartları, Arena, Ün Tablosu, pencereler). Sekmeler, kartlar, bilgi kutuları ve krem birincil düğme ekranlar arasında tutarlı ve master'ın diliyle uyumlu bulundu; biçimleri değiştirilmedi. Yapılanlar:
  - Dünya üstü etiketler master ölçüsüne geldi: oyuncunun isim plakası, tabelalar, etkileşim baloncuğu ve konuşma balonları büyüdü. Öteki kişilerin plakaları oyuncununkinden küçük tutuldu.
  - Etkileşim baloncuğu oyuncunun isim plakasına biniyordu; artık plakanın üstüne çıkıyor (`js/game.js`).
  - Sekmelere üzerine gelme ve basılma hâli; geri düğmesi, kart, seçim satırı ve madalyonlara basılma hâli eklendi (`css/olcu.css`).
  - Kalan: yan yana duran iki kişinin konuşma balonları hâlâ üst üste binebiliyor. Öteki ekranlardaki yuvarlak resimler (tüccar ve Han portreleri, sefer bölgeleri, Ocak yapıları) simge değil içerik çizimi; madalyon ailesine çekilmedi. Ahırdaki antrenman kartlarının renkli taş simgeleri de olduğu gibi duruyor.
- **Yapılmayan:** arena dövüş ekranının Ejder Ocağı 1'den taşınması; para, görev, sohbet simgeleri; pencere çerçeveleri ve öteki düğmeler.

Bakılmayanlar: Pazar, Han içi, Sefer, Kule, Saray, Müzayede, Kütük, Defter ekranları tek tek incelenmedi; yalnız test turunun görüntülerinde hata vermedikleri görüldü.
