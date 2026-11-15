# Ejder Topçusu ve Zindan · durum (2026-11-15)

`G.open('topcu')` ile açılır. Dosyalar: `eo2/js/battle.js` (savaş motoru), `topcu_veri.js` (zindan, düşman, boss verisi),
`topcu.js` (sahne, akış, ödül), `topcu_pvp.js` (Er Meydanı odaları), `eo2/css/topcu.css`, `eo2/assets/bg/tp-kapilar.webp`.

## Çalışan (başsız Edge ile baştan sona oynatıldı; sayfa ve konsol hatası 0)
- **Sahne:** üç zindan kapısı, talim alanı, kervan arabası, Er Meydanı çardağı tek çizimin üstünde dokunma yerleri. Künye
  yanda (dikey telefonda altta) açılır. İksirli yavru yoksa zindanlar ve kervan mühürlü görünür; talim ve Er Meydanı açık.
- **Talim:** Talimci'ye karşı ödülsüz düello; zafer ve yenilgi.
- **Zindanlar:** Sırça Saray, Volkanik Kaldera, Batık Donanma; dörder aşama, Normal ve Ağır. Sırça Saray Normal baştan sona
  oynatıldı (yenilgi, yeniden deneme, üç ara çark, boss, zafer çizgi romanı, Ulu Kader Çarkı, özet). Öteki iki zindanın her
  aşaması açılıp birkaç tur oynatıldı, sonuna kadar oynatılmadı.
- **Kervan Baskını:** tek aşama, zafer ve ödül.
- **Çizgi roman:** prolog ilk girişte ve künyedeki "Destanı oku" ile; zafer çizgi romanı boss yenilince.
- **Er Meydanı (PvP, dostça, ödülsüz):** oda kur, kodla katıl, hazır, başlat, hızlı eşleş, rövanş, maçtan ayrılma. İki
  misafirle oda kurulup maç sonuna kadar oynatıldı; iki uçta rüzgâr, tur ve can aynı kaldı.
- **Telefon:** 390×844 ve 844×390; 44 pikselden küçük hedef yok (ölçüldü).

## Ödül
Tek fonksiyon: `EO2.topcu.odulYaz(tur, veri)` (`topcu.js`). Yerel kayda (`S`) yazar: altın, ün, yem, yumurta doğrudan;
kor taşı, cevher, kalıp ve öz `S.topcu.ganimet` defterine (chibi sistemi 2.0'da yüklü değil; yüklenirse `awardChibiStones`
çağrılır). Miktar ve olasılıklar `js/minigame/shm_ui.js` ile aynı.

## Yarım ya da eksik
- Cehennem zorluğu (9 ve 12 aşama, beş fazlı boss) yok.
- Eski oyundaki koridor (kitabe, ateşgede), yoldaşlar, sarkıt, totem, küp gibi sahne eşyaları yok.
- Abra'nın tsunami itmesi, kuyruk yeri ve boyun vuruş kutusu eski koddan okunmadan yaklaşık kuruldu.
- Kervan baskınında eski kipteki yoldaş yok; ödül formülündeki yoldaş payı (+1 cevher) korunuyor.
- `S.topcu.ganimet` defterindeki taşları harcayan ekran (Kor Örsü) 2.0'da yok.
- PvP: yeniden bağlanma (`pvp_match_resume`, `pvp_resync`), davet ve prova botu bağlanmadı; harita seçimi yok (hep talim adası).
- Sahne çizimi 1536×768; 1600 piksel genişlikte biraz yumuşak (büyütme isteği Midjourney bakiyesi bittiği için yapılamadı).
- `eo2/tools/check_battle.mjs` eski gösterim düellosunun kimliklerine bakar; yeni motorla çalışmaz.
