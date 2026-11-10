# Ejder Ocağı 2.0 · oynanır dilim

Yürünen altı alan (Merkez Meydan, Han, Pazar, Ejder Bahçesi, Kuzey Yolu, Topçu Arenası avlusu), canlı oda, konuşan NPC'ler ve Topçu Arenası gösterim düellosu.
Oyun kodundan bağımsızdır: `js/`, `server/`, `style.css` kullanılmaz ve değiştirilmedi.
Dal: `ejder-ocagi-2.0`. Commit yok.

## Çalıştırma
```
node eo2/tools/serve.mjs 3210
```
Sonra `http://localhost:3210`. Canlı oda, Claude'lu NPC ve seslendirme yalnız yayınlanan Artifact sayfasında çalışır; yerelde `?mock=1` taklit yetenekleri yükler (yalnız deneme).
Oyun sunucusu `eo2/` klasörünü sunmaz (`server/public_files.js` izin listesi); bağlama F2/F3 işidir.

## Kontroller
Meydan: WASD ya da oklar yürü · Shift hızlan · tıkla/dokun oraya yürü · E etkileşim · Enter sohbet ya da soru · 1–6 jest ·
I kuşanma · J görevler · M ya da Esc menü · L gündüz/akşam · C kamera · H arayüzü gizle
Düello: A/D adım · W/S açı · Space basılı tut ve bırak (güç) · 1 atış · 2 Üçlü Seri · Esc meydana dön

## Ne var
| Parça | Durum |
|---|---|
| Merkez Meydan | Han, Bedesten, Kuzey Kapısı, Topçu Arenası kapısı, Ejder Bahçesi kapısı, çeşme; gündüz ve akşam; iki kamera açısı |
| Han (iç mekân) | Ocak, kilimler, tavla masaları, tezgâh, asılı fenerler; her zaman kor ışığında (K1). Han kapısında E |
| Ejder Bahçesi | Kor gerçek boyunda, iki bahçe ejderi, gölet, kuluçka yuvası; ejderhalar sevilebilir. Bahçe kapısında E |
| Kuzey Yolu | Çitli yol, taş köprü ve dere, yol tabelası, kervan kampı. Kuzey Kapısı'nda E |
| Pazar (Bedesten içi) | Dükkân nişleri, mozaik fenerler, ilan panosu; Rüstem Ağa ve Tüccar içeride. Bedesten kapısında E |
| Topçu Arenası avlusu | Kum avlu, talim hedefleri, top askısı, mühürlü zindan kapıları, tribün merdiveni. Düello kuzeydeki kapıdan ya da Talimci'den açılır. Arena kapısında E |
| Gökte süzülen ejder | Açık alanlarda arada bir geçer, gölgesi yere düşer |
| Karakter | Beş set (çıplak, Temel, Muhafız, Avcı, Madenci), ön/arka/yan 16 kare yürüme; adım kilidi |
| Yol arkadaşı ejder | Oyuncuyu izler; jestlere tepki verir |
| Canlı oda (`js/net.js`) | Sayfayı aynı anda açan herkes meydanda görünür: konum, set, ejder, jest, sohbet. Kalıcı değil; F4'teki gerçek odanın provası |
| Konuşan NPC (`js/npcai.js`) | E ile konuşma kutusu; soruya Claude karakterinde cevap verir, istenirse seslendirir. **Deneme, onaylı kapsam dışı** |
| Ses (`js/audio.js`) | Tamamı kodla: çeşme, kuş, cırcır, adım, arayüz, Ozan'ın sazı (9/8), düello sesleri |
| Topçu düellosu (`js/battle.js`) | Yerel NPC'ye karşı sıra tabanlı atış: açı, güç, rüzgâr, oyulan arazi, Üçlü Seri. **Gösterim: ödül yok, değerler oyunu bağlamaz** |
| Arayüz | Lacivert-altın HUD, mekân panelleri, başlık kartı, iris geçişi, dövüş HUD'u, dokunmatik kontroller |

## Ne gerçek, ne yer tutucu
| Parça | Kaynak |
|---|---|
| Karakter (meydan) | Gerçek çizim. `prototype/chibi_rig/gate7/social.html` çizicisinden `tools/bake.mjs` ile pişirildi |
| Karakter (düello), top ve üstündeki ejder | Gerçek çizim. `gate7/index.html` çizicisinden `tools/bake_battle.mjs` ile 17 nişan açısında pişirildi |
| Yol arkadaşı ejder, çeşme heykeli, sancak arması | Gerçek çizim: `prototype/chibi_rig/dragon_module` parçaları |
| Logo | EO2 görsel kimlik paketindeki PNG, küçültülmüş |
| Bahçedeki ejderhalar, gökte süzülen ejder, kamptaki araba, konuşma portreleri (Ozan, Rüstem Ağa, Usta Kerim, Muhtar, Yumurtacı, Tüccar, Baharatçı) | Oyunun mevcut görselleri (`img/dr-*`, `img/pose/`, `img/npc-*`, `assets/minigame/`), `assets/ext/` altına kopyalandı. 2.0 ejder hattından gelenlerle değişecek |
| Binalar, ağaçlar, eşyalar, arazi, gök, uzak plan | Kodla çizilen yer tutucu (`js/art.js`, `js/battle.js`). Nihai sanat 03/04'ten gelir |
| Zemin döşemesi | Parça gölgelendiricisinde hesaplanır (`js/gl.js`) |
| İkonlar | Yer tutucu SVG (`js/icons.js`) |
| NPC'ler | Var olan adlar (Ozan, Muhtar, Rüstem Ağa, Usta Kerim, Yumurtacı) + rol adları (Bekçi, Hancı, Tavlacı, Bahçıvan, Kervancı, Talimci, Hamal, Çırak). Rüstem Ağa çarşının içine alındı; meydandaki tezgâhta Baharatçı duruyor. Sahnede chibi setleri giyerler |
| Bahçe ejderlerinin adları | Kor oyundan; Ayaz ve Tozan yer tutucu adlardır |
| HUD değerleri | Yeni oyunun başlangıcı: 420 altın, 0 ün, Kudret 1558, ilk üç hedef |

## Onay isteyen denemeler
- **Claude'lu NPC sohbeti ve seslendirme:** yeni bir özellik fikridir; oyuna girip girmeyeceği, içerik kuralları ve maliyeti ayrı karar ister. Kural olarak fiyat, ödül, olasılık ve sayı söylemez.
- **Düello değerleri:** can 100, hasar, menzil, rüzgâr, 25 sn sıra süresi ve Üçlü Seri'nin tek kullanımı yalnız bu gösterim içindir. Oyundaki Topçu'nun kuralları değişmedi.
- **Canlı oda:** yayın sayfasının oda yeteneğiyle çalışır; oyun sunucusunun presence sistemine bağlı değildir.

## Kamera
Onaylı perspektif denemesinin modeli: `s = D / (Y − oyuncuY + D)`. "Yakın" o denemenin değerleri (D = 7 m, H = 3,57 m, ufuk %30).
"Yüksek" aynı kameraya 16° eğim ekler. Dikey ekranda kamera kendiliğinden yükselir. Konuşmada kamera yaklaşır.

## Araçlar
- `tools/bake.mjs`, `tools/bake_battle.mjs`: chibi karelerini pişirir (chibi klasörünü yalnız okur). Chibi verisi değişince yeniden çalıştır.
- `tools/shot.mjs <klasör> [adlar]`: başsız Edge ile ekran görüntüsü.
- `tools/check.mjs`: meydan işlev ve kare hızı denetimi. `tools/check_scenes.mjs`: alan geçişleri. `tools/check_battle.mjs`: düello baştan sona. `tools/check_room.mjs`: iki sekmeyle canlı oda (taklit).
- `tools/make_artifact.mjs <klasör>`: Artifact için sayfa parçası. `tools/mock_claude.js`: yerel taklit yetenekler.

## Ölçüm (2026-11-10, başsız Edge, RTX 4060 Ti, D3D11, 1920×1080)
Altı alanın hepsi 60 fps. Alan geçişleri (gir, yürü, etkileş, doğru kapıya dön) geçti. Düello baştan sona hatasız oynandı; canlı oda taklitle iki sekmede doğrulandı.

## Yapılmadı
- Gerçek telefonda deneme, mobil kare hızı, iOS Safari.
- Oyun sunucusuna ve mevcut ekranlara bağlama (F2/F3).
- Seferin biyom sahneleri, zindanların içi, Canlı Tribün.
- Alanların mevcut ekranlara bağlanması: masalar, bakım, sefer hâlâ panel açar.
- Oturma, sosyal koşu ve etkileşim animasyonları (çizim yok).
- Sanatın 03/04 onayı: binalar ve arazi yer tutucudur. Görsel üretim aracı karakter işi bitene kadar kullanılmadı.
