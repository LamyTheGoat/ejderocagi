# Bölüm sözleşmesi

> Bölüm ajanı ile sistem ajanı arasındaki arayüz. Yazan: sistem ajanı, 2026-11-11.
> Motor: `eo2/js/bolum.js` (sistem ajanının). Bölümler: `eo2/js/bolumler/` (bölüm ajanının).
> Çalışan örnekler: `js/bolumler/merkez-meydan.js` (gerçek bölüm), `js/bolumler/ornek-deneme.js` (sistem ajanının deneme alanı).

## Yeni bölüm eklemek

1. `eo2/js/bolumler/<ad>.js` dosyasını yaz; içinde tek çağrı: `EO2.bolum.tanimla({ … })`.
2. Dosya adını `eo2/js/bolumler/liste.js` içindeki `EO2.bolumListe` dizisine ekle.
3. Çizimleri `eo2/assets/dunya/an/` altına koy (saydam zeminli `.webp`). Başka klasör istersen bölümde `klasor` ver.

Başka hiçbir dosyaya dokunmak gerekmez. Motor bölümün çizimlerini kendisi yükler, sahneyi kaydeder, kamerasını ve editörünü kurar.
Bölüme gitmek: başka bir bölümün etkileşiminde `act: 'go:<kimlik>'`, ya da konsoldan `EO2.api.go('<kimlik>')`.

## Bölüm verisi

Piksel değerlerinin hepsi **referans görselin pikselidir** (verilmezse master: 1672 × 941). Dünya birimi: karakter 1,7 birim boyundadır.

| Alan | Zorunlu | Anlamı |
|---|---|---|
| `id` | evet | Sahne kimliği. Kayıtlı düzenler ve ayarlar bu adla saklanır; sonradan değiştirme. |
| `ad`, `altAd` | hayır | Ekranda görünen ad ve alt yazı. |
| `referans` | hayır | Kamera ölçüsü: `{ en, boy, ufuk, hp, odak, oyuncu: [x, y], kisiBoy }`. Verilmezse master'ın kamerası (eğim 14,2°). Farklı bir kamera gerekiyorsa sistem ajanıyla konuş. |
| `nesneler` | evet | Sahnedeki nesneler; iki yazım biçimi var (aşağıda). |
| `setler` | hayır | İkinci çizim takımı: `{ ad, ilkAd, esle: { nesneAdı: [çizim, enÇarpanı] } }`. Çizim `null` ise nesne o sette çizilmez. Varsayılan olarak ikinci set açıktır. |
| `aileler` | hayır | Açı ailesi: `{ nesneAdı: { onek, acilar: [0, 30, …], varsayilan, bagla } }`. Çizim adı `onek + üç haneli açı` (ör. `mb-bank-045`). Eksi açılarda çizim aynalanır. Aile ışıksız çizilir. |
| `isiksiz` | hayır | Işıksız eş: `{ nesneAdı: çizim }`. Editörden açılır; motor ışık, ışıma ve yumuşak gölge ekler. |
| `cizimler` | hayır | Sahnede kullanılmayan ama editör paletinde görünmesi istenen çizim adları. |
| `golgesiz` | hayır | Zemine gölge lekesi düşürmeyen çizim adları (sur gibi). |
| `isiklar` | hayır | `[x, y, yarıçap (birim), şiddet]`. Zemine sıcak ışık havuzu işlenir, kişiler aydınlanır. |
| `noktalar` | hayır | Kılavuz ölçü noktaları: `[x, y, piksel boyu, ad]`. Editörde "Kılavuz" ile görünür. |
| `zemin` | hayır | `{ merkez: [x, y], tugla: [[renk, ağırlık]…], derz, en, boy, ara, yumusat, alanlar }`. Verilmeyenler master'ın döşemesi. `alanlar`: boyanacak dünya dikdörtgenleri `[x0, y0, x1, y1, piksel/birim, tohum]`. `resimler`: zemine serilen çizimler `[çizim, x0, y0, x1, y1]` (dünya dikdörtgeni; çizimin altı yakın, üstü uzak kenar; tepeden bakışla çizilmiş olmalı). Döşemeyle birlikte boyanır; nesnelerin gölge lekeleri ve ışık havuzları üstüne düşer. Zemin arması, halı, su birikintisi gibi şeyler için. Çözünürlüğü boyanan alanın piksel/birim değeriyle sınırlıdır (yakın alanda 88). |
| `engeller` | hayır | `{ cizgi: [[ax, ay, bx, by, adet, xKayma, yKayma, yarıçap]] }`: iki piksel arasına dizilen çarpışma daireleri (uzun cephe için). |
| `onPlan` | hayır | Ekrana sabit ön plan çizimleri: `[[çizim, css]]`. `--kx` değişkeni oyuncuyla kayar. `css` olduğu gibi resmin stiline yazılır: `vh`/`vw` ile boyut ve `mix-blend-mode` (soft-light, multiply) kullanılabilir; ekrana sabit hava katmanı böyle kurulur. Arayüzün altında, dünyanın üstünde durur; tıklamayı engellemez. |
| `isik` | hayır | Ortam ışığı: `{ ik, sicak, ton }`. Varsayılan `{ ik: 0.18, sicak: 1 }`. `ik`: fenerlerin ve pencerelerin ne kadar yandığı (0–1). `ton`: `[r, g, b]` çarpanı; verilirse zemine, kişilere ve **bütün nesnelere** uygulanır (akşam için, ör. `[0.86, 0.8, 0.95]`). Işık havuzları tonun üstünde kalır; fenerin yanındaki kişi ve nesne yeniden ısınır. Ton verilen bölümde gece-gündüz düğmesi ortam rengini değiştirmez. |
| `golgeler` | hayır | Zemine düşen geniş gölge kütleleri: `[x, y, rx, ry, şiddet, açı]`. Merkez referans pikseli, yarıçaplar birim, şiddet 0–1 (varsayılan 1), açı derece (saat yönünün tersine). Zemine mor olarak işlenir; içine giren kişi ve nesne koyulaşır. Eni 5 birimden büyük yapılar etkilenmez. |
| `tavan` | hayır | İç mekân tavanı, yatay düzlem: `{ ad, z, x0, x1, y0, y1, karo, isik }`. `ad` döşenecek doku (kenarları birbirine uyan, tepeden bakışla çizilmiş kare), `z` yükseklik, `x0…y1` dünya dikdörtgeni, `karo` dokunun bir tekrarının dünya eni (varsayılan 4), `isik` parlaklık çarpanı (varsayılan 0,85). Doku dünyaya bağlıdır, yürürken kaymaz. Kamera tavana yaklaşınca ya da üstüne çıkınca (dikey ekran) çizilmez. Duvarın tepesinden alçak tut; yoksa arada boşluk görünür. |
| `oklar` | hayır | Yön okları: `[x0, y0, x1, y1, boy çarpanı, aralık]`. İki referans pikseli arasında, ilk noktadan ikinciye doğru akan mavi işaretler. Aralık birim (varsayılan 1,5). |
| `oyuncuY` | hayır | Oyuncunun başlangıç derinliği (dünya). Varsayılan 10. |
| `klasor` | hayır | Çizim klasörü. Varsayılan `assets/dunya/an/`. |
| `yer(P)` | hayır | Oyun tarafı; bir nesne döndürür: `bounds` (yürüme sınırı `[x0, x1, y0, y1]`), `signs`, `interact`, `rects` (duvar), `npcs`, `start`, `mini`, `planters` (`[[x, y]]`: motor o noktaların çevresinde kelebek uçurur ve küçük bir gölge lekesi düşürür). `indoor: true` verilirse gök, uzak arka plan ve bulut çizilmez; boş kalan yer `light.clear` rengidir (duvarın ardını örtmek için ayrı nesne gerekmez, ama boyanan zeminin dışındaki eski zemin yine görünür). `P.PX(x, y)` pikseli dünyaya çevirir, `P.kisi(x, y)` `{ x, y }` verir, `P.OLC(y)` o derinlikte piksel/birimdir. |

### Nesnenin iki yazım biçimi

**Referans pikseliyle** (referansta karşılığı olan her şey için bunu kullan; göz kararı ölçü yazma):

```js
['çizim', tabanOrtasıX, tabanY, görseldekiPikselEni, { ayna, key, carp, cy, z, yon, aci }]
```

**Dünya ölçüsüyle** (referansta olmayan nesneler için):

```js
{ ad: 'çizim', x, y, w, ayna, key, carp, cy, z, yon, aci, bagla }
```

| Seçenek | Anlamı |
|---|---|
| `ayna` | Çizimi yatay çevir. |
| `key` | Sıra kayması (birim). Büyük yapılar için: nesne, tabanından daha geride sıralanır. |
| `carp`, `cy` | Çarpışma dairesinin yarıçapı ve derinlik kayması. 0 ise içinden geçilir. |
| `z` | Yerden yükseklik (asılı tabela gibi). Gölge düşürmez, mini haritaya girmez. Eksi değer de geçerlidir: nesne zeminin altından başlar (aşağı kottaki ağaç, teras duvarı). |
| `ort` | Öndeki yapı saydamlığı. Tepesi 2,2 birimden yüksek bir nesnenin tabanı oyuncudan güneyde (kameraya yakın) kalıyor ve nesne oyuncuyu ekranda örtüyorsa nesne kendiliğinden %20'ye solar, oyuncu çıkınca geri gelir. `ort: false` bunu o nesnede kapatır. Asılı nesnede (`z` > 0) örtme, nesnenin alt kenarından ölçülür: altından geçen oyuncu için solmaz. `key` verilen yapıda oyuncu, tabanın `key` birim kuzeyine kadar yapının önünde çizilir; saydamlık ondan sonra başlar. Editör açıkken çalışmaz. |
| `yon` | Çapraz derinlik: çizimin sağ ucu sol ucundan bu kadar birim geridedir. Çizim dilimlenir, oyuncu iki ucun arasından doğru sırayla geçer. |
| `aci` | Açı ailesindeki nesnenin dönüşü (derece). |
| `tavan` | `tavan: true`: tavana asılı parça (kiriş, avize, makas). Kamera parçanın alt kenarından (`z`) yükseğe çıkınca çizilmez; dikey ekranda oyuncunun önüne düşmez. Öndeki yapı saydamlığına girmez. |
| `bagla` | Nesneyi zemine bağla: altında keskin elips gölge, ayakların yere bastığı noktalarda çakıl ve ot. |

## Düzen ve editör

- Düzenin öncelik sırası: tarayıcıda kayıtlı düzen (editörde "Kaydet") → dışa aktarılmış düzen → `nesneler`den hesaplanan varsayılan.
- Editör: Menü → Sahne editörü (bulunulan bölümde açılır). "Dışa aktar" `<kimlik>.duzen.js` dosyasını indirir. O dosya `js/bolumler/` altına konur ve `liste.js` içinde bölüm dosyasından **önce** yazılır; düzen herkes için varsayılan olur.
- Bulanıklık uyarısı: bir nesne seçilince, 1920 genişlikte oyuncu yanındayken kaynak pikselinin 1,15 katından büyük çiziliyorsa editör bunu yazar; editör açılırken hepsinin listesi konsola düşer.
- Editörün değiştirmediği şeyler: kişiler, ışıklar, zemin deseni, etkileşimler. Bunlar bölüm dosyasında yazılır.
- Merkez Meydan'ın kimliği `master`dır; eski `js/master_duzen.js` de hâlâ okunur.

## Konsol

```js
EO2.bolum.al('master')        // bölümün arayüzü
EO2.bolum.aktif()             // bulunulan bölüm (bölüm değilse null)
b.editor(true)                // editörü aç
b.kilavuz(1)                  // ölçü noktaları ve 5 birimlik ızgara
b.set(0)  b.deneme(1)         // çizim seti, ışıksız çizim
b.duzen()                     // sahnedeki nesneler (dünya ölçüsüyle)
b.PX(x, y)                    // referans pikseli → dünya
b.cizimler()                  // bölümün yüklediği çizim adları
b.zeminSer(ad, x0, y0, x1, y1) // deneme: çalışırken zemine çizim ser · b.zeminResim(0) hepsini gizler
b.bulaniklik(1920)            // ekranda kaynak pikselinden büyük çizilen çizimler: yakin (oyuncu yanındayken), bas (başlangıç yerinden)
```

## Kurallar

- Her nesne tek bir 2D çizimdir ve dik durur. Yüzeylerden kurulmuş nesne yoktur.
- Çizim, kameranın açısıyla çizilmiş olmalıdır: göz hizasının biraz üstünden, neredeyse cepheden. Yatay yüzeyler ince şerit görünür.
- Bölüm dosyası veri taşır; motorun işini yapan kod yazılmaz. Motorda eksik bir şey varsa sistem ajanından istenir.
- Sistem ajanının `ornek-deneme.js` dosyasına bölüm ajanı dokunmaz; bölüm ajanının dosyalarına sistem ajanı dokunmaz. `liste.js` ortaktır: herkes yalnız kendi satırını ekler.

## Bilinen sınırlar

- Zemin tek türdür (bir merkezin çevresinde halka halka tuğla). Çim, toprak yol, ahşap döşeme gibi zeminler henüz yok.
- Gölge kütlesi ve ortam tonu yalnız boyanan zemin alanında görünür; alanın dışındaki eski zemin etkilenmez.
- Bir nesnenin ışığı tek noktadan (tabanından) ölçülür; yarısı gölgede yarısı ışıkta duran nesne bütünüyle bir tarafa düşer.
- Zemine bağlama (ton kuşakları) yalnız açı ailelerinde tam çalışır; `bagla` verilen tek çizimde elips ve dip süsü gelir, ton gelmez.
- Çizimler bölüm açıldıktan sonra yüklenirse ilk karelerde eksik görünebilir; yüklenince kendiliğinden gelir.
- Boyanan zemin alanının dışında motorun eski düz zemini görünür; `zemin.alanlar` ile genişletilir (büyük alan bellek tüketir).
- Öndeki yapı saydamlığı nesne nesne ölçülür: üç parçalı bir yapıda (ön blok, arka gövde, kanat) oyuncuyu örtmeyen parça solmaz. Solan yapının arkasındaki parçalar üst üste görünür.
- Kameraya çok yaklaşan nesneyi solduran eski kural (`nearFade`) bölümlerde yoktur; ön plandaki nesne bilerek durur.
