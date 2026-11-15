# Han içi · bölüm tasarım notu

> Yazan: bölüm ajanı, 2026-11-12. Bölüm verisi: `eo2/js/bolumler/han-ici.js` (kimlik `hanici`). Giriş: Merkez Meydan → han sundurması ("Hana gir").
> Anahtar kare (hedef görsel): `kaynak/kv_han_ici_v1.png`. Eski Han sahnesi (`js/scenes.js`, kimlik `han`) duruyor; eski meydandan hâlâ oraya gidilir.

## Amaç
Oturma, sohbet ve masa oyunlarının yeri. Sıcak, kalabalık, ateş başı hissi.

## Yerleşim
| Yer | İçerik | Etkileşim |
|---|---|---|
| Arka duvar (tek çizim) | Solda tezgâh, fıçılar, kupa rafları; ortada yanan şömine ve sancak; sağda yukarı çıkan merdiven | Şömine → "Isın" (bir satır yazı) |
| Şöminenin önü | Boş bırakıldı (ısınma yeri); kilim, odun yığını, uyuyan kedi | — |
| Sol ve sağ | Dört sandalyeli masa, ikisinin altında kilim; iki Tavlacı'nın arasında tavlalı masa; girişin solunda yemekli masa ve tabureler; taburede kitaplar | İki masa → Han ekranı (Tavla, Kor 21) |
| Giriş | Büyük kilim | Çıkış → Meydan |

Kişiler eski sahneden aynen: Hancı (tezgâhın önünde), iki Tavlacı (tavla sandığının iki yanında). Yeni mekanik yok.

## Kamera
"Yakın" kip (kullanıcı, 2026-11-12: "merkez hariç yeni bölümler yakın kamera açısı"; teyit: "evet aynen öyle. duvarlar için ve tavan için ayrı asset isteyebilirsin"). Eski Han sahnesinin kamerasının bölüm motorundaki eşdeğeri: `referans: { ufuk: 282, hp: 3.572, odak: 775, oyuncu: [836, 677], kisiBoy: 188 }`.

## Nasıl kuruldu
- **Arka duvar:** tek geniş çizim (en 22, yükseklik 6,8 birim). Yanına kopyası dizilmez.
- **Yan duvarlar** (`hn-yan-duvar`: ahşap karkas, sıva, üç pencere, sedir, askılık, raf; kişisiz): arka duvarın iki ucundan kameraya doğru açılarak uzanır (sol (-8, 19) → (-12,5, 1,5); sağı aynası). Çizim enine daraltılıp çapraz derinlikle (`yon`) gerçek boyuna açılır. Çarpışma: `engeller.cizgi`.
- **Tavan** (`hn-tavan`: kirişler, payandalar, mumlu avize, fenerler, kurutulmuş ot demetleri): üç çatı makası, y 16,2 / 11,8 / 7,8. Dünyaya bağlıdır, oyuncu yürüdükçe üstten geçer. Sarkan uçlar z 5,3'ün üstünde: kişilerin önüne düşmez. Dikey ekranda kamera yükseldiği için parça oyuncuyu örtebilir; motorun örtme solması açık.
- **Tavan boşluğu** (`hn-bosluk`): arka duvarın ardında koyu düz yüzey; motorun göğünü ve salon dışını örter. `indoor: true`, uzak pus kapalı.
- Asılı çarşı fenerleri kaldırıldı (ışık artık makaslardaki avize ve fenerlerden).
- **Zemin:** tahta döşeme dokusu (`hn-zemin`, tepeden, 5 birimlik karolar); kilimler (`hn-kilim`) üstüne serili.
- **Işık:** şöminenin önünde geniş sıcak ışık havuzu; sıcak ton ve kenar karartması katmanları.
- İç mekânda zemine bağlama (`bagla`) kullanılmaz.

## Doğrulama (2026-11-12, yakın kamera)
- Görüntüler: `han-ici_tur2_yakin_kamera_2026-11-12.png`, dikey telefon `han-ici_tur2_dikey_telefon_2026-11-12.png`.
- Çıkış Meydan'a dönüyor; iki masa ve şömine etkileşimi tetikleniyor; konsol hatası yok.
- Yan duvarlar oyuncuyu duvara yarım birim kala durduruyor (altı noktadan denendi; fıçı öbeğinin olduğu yerde oyuncu öbeğe takılıyor).

## Eksikler
1. Hancı tezgâhın arkasında değil, önünde duruyor. Duvar kişisiz (`hn-duvar-v2`); ilk sürümde (`hn-duvar-v1`) hancı çizimin içindeydi, dosyası duruyor.
2. Oturan konuk yok; anahtar karedeki kalabalık karakter hattını bekliyor.
3. Tavan düz bir yüzey değil, üç makas; aralarında koyu boşluk görünür. Gerçek tavan düzlemi motor işi (sistem ajanından istendi).
4. Dikey telefonda makas oyuncuyu örtünce soluyor ama görünmeye devam ediyor; kamera yüksekken tavanı hiç çizmemek motor işi.
5. Yan duvarın sediri çizimin içinde: oturulamıyor, öne çıkmıyor.
6. Merdiven görsel; üst kat yok.
