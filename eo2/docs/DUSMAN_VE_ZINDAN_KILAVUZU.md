# Düşman ve zindan yapım kılavuzu

Son güncelleme: 2026-11-17. Bu belge yeni bir düşman, yeni bir boss ve yeni bir zindan eklemek için adım adım yoldur.
Kuralların tamamı `eo2/docs/ZINDAN_YONTEMI.md` içindedir; burası "nasıl yapılır" kısmıdır.

## Kısa özet

| Ne eklemek istiyorsun | Nereye yazarsın | Sonra ne koşarsın |
|---|---|---|
| Yeni düşman türü | `eo2/js/topcu_veri.js` içindeki `B.MOB` | `node eo2/tools/check_eksik_dosya.mjs` |
| Yeni boss | `eo2/js/topcu_veri.js` içindeki `B.BOSS` | `node eo2/tools/check_sahmeran_ok.mjs` örnek alınır |
| Yeni arena (bir savaş sahnesi) | `eo2/arenalar/<ad>/` klasörü | `node eo2/tools/arena_derle.mjs` |
| Yeni zindan (arenaların sırası) | `eo2/js/zindan_tarif.js` | `node --test tests/zindan_tarif.test.js`, sonra sunucuyu yeniden başlat |

Sunucu hiçbir zindanı elle bilmez: `zindan_tarif.js` ve derlenmiş `arena_veri.js` dosyalarını okur. Yeni zindan için sunucu koduna dokunulmaz.

## 1. Düşman davranış sayfası (MOB)

Her düşman türü tek satırlık bir kayıttır:

```js
B.MOB.cobra = { spr: { idle: '…bekleme.webp', atk: '…saldiri.webp', hit: '…vurulus.webp' }, h: 2.4, yon: 1, el: 'venom' };
```

| Alan | Anlamı |
|---|---|
| `spr.idle`, `spr.atk`, `spr.hit` | Bekleme, saldırı ve vuruluş resimleri (tek kare). Yalnız `idle` zorunlu. |
| `sayfa` | Kareli canlandırma: `{ src, cw, ch, sutun, px, py, kare(a, t), ceset }`. `kare` o anki kare numarasını verir; `ceset: true` ölen düşmanı yerde bırakır. Örnek: `yilan(...)` fonksiyonu. |
| `h` | Boy (dünya birimi; terbiyeci 1,7 birimdir). |
| `yon` | Çizimin baktığı yön: `1` sağa, `-1` sola. |
| `el` | Element (`venom`, `magma`, `ates`, `buz`…): mermi ve parçacık rengi. |
| `ucan` | `true` ise uçar; yere düşmez. **Uçan engerek hiçbir zaman eklenmez.** |
| `sabit` | `true` ise sırası gelince yürümez. |
| `soz` | Saldırırken bazen söylediği söz. |
| `atis` | Mermisine eklenecek alanlar (örnek: `{ ok: true }` ok biçimli mermi). |

Düşmanın sırası (motor, `battle.js` → `mobSira`): hedefe döner, bir adım yürür, nişan alıp tek atış yapar (135 hasar × zorluk). Bu sıra bütün düşmanlarda aynıdır; farkı çizim, boy, element ve aşağıdaki uyku ayarları yapar.

### Uyuyan düşmanlar (2026-11-17)

İki ayrı uyku vardır; ikisi de arena kaydına (`arena.json`) düşman başına yazılır:

| Alan | Davranış |
|---|---|
| `"dalga": 2` (3, 4…) | **Dalga kontrolü.** Düşman sırası gelene dek sahnede yoktur: çizilmez, vurulmaz, sıra almaz. Önceki dalgaların hepsi inince toz bulutuyla belirir ve ekrana "Dalga 2 / 3" yazılır. Yazılmazsa birinci dalgadır. |
| `"uyan": 300` | **Mesafeyle uyanma.** Düşman sahnededir ama uyur (üstünde "Zz"); sıra almaz. Bir terbiyeci bu mesafeye (eski piksel ölçüsü; 100 piksel yaklaşık 1,7 birim) girince ya da ona vurunca uyanır. |

Sunucu bekleyen dalgaya sıra vermez (`server/zindan_ortak.js`); dalga geçişi düşmanların canından okunduğu için her ekranda aynı anda olur.

Örnek (Zümrüt Saray Köprüsü, üç dalga, her dalgada iki yandan birer yılan):

```json
"dusman": [
  { "tip": "zs_agir",   "ad": "Sırça Taht Muhafızı",    "hp": 640, "dalga": 3 },
  { "tip": "zs_kucuk",  "ad": "Sırça Engerek",          "hp": 800, "dalga": 2 },
  { "tip": "zs_vurucu", "ad": "Bronz Engerek Muhafızı", "hp": 760 },
  { "tip": "zs_vurucu", "ad": "Bronz Engerek Muhafızı", "hp": 760 },
  { "tip": "zs_kucuk",  "ad": "Sırça Engerek",          "hp": 800, "dalga": 2 },
  { "tip": "zs_agir",   "ad": "Sırça Taht Muhafızı",    "hp": 640, "dalga": 3 }
]
```

Düşmanlar blok haritadaki sarı kutularla **soldan sağa** eşleşir: listedeki ilk düşman en soldaki kutudur.

## 2. Boss davranış sayfası (BOSS)

Boss kaydı düşmanınkinin genişidir. Örnek: `B.BOSS.sahmeran_v3`.

| Alan | Anlamı |
|---|---|
| `h`, `el`, `yon`, `spr` / `sayfa` | Düşmandaki gibi. |
| `giris`, `veda`, `laflar` | Savaşa girerken, düşerken ve arada söyledikleri. |
| `fazlar` | Can eşikleri: `{ faz: 2, oran: 0.62, kalkan: 300, ad, soz }`. Can bu orana inince faz değişir. |
| `hamle(b)` | Bu tur hangi hamleyi yapacağını seçer (adını döndürür). Genelde faza göre üçlü bir sıra. |
| `hamleler` | Hamlelerin adı ve sözü: `{ ok: { ad: 'Çifte Ok', soz: '…' } }`. |
| `uygula(b, p, hamle, dm)` | Hamleyi oynatır: mermileri atar. `p` hedef terbiyeci, `dm` zorluk çarpanı. |
| `bolge` | Her tur oyuncunun durduğu yere düşen vuruşun hasarı. Oyuncu yerinden çekilirse ıskalar. |
| `agiz` | Merminin çıktığı nokta (çizimde, piksel). |
| `vurus`, `zayif` | Zayıf nokta (taç, kalp): oraya isabet kritik sayılır. |
| `isaretGizli` | `true` ise zayıf nokta ve tehlike bölgesi çizilmez (kural yine işler). |

Mermi atmak için hazır araçlar (`A` = motorun yardımcıları):

- `A.nisanliAt(b, sx, sy, tx, ty, hasar, element, patlama, ek)`: bir noktadan bir hedefe nişanlı atış. `ek` içine `{ ok: true }` yazılırsa mermi **ok** olarak çizilir; `{ cazibe: true }` büyü taşır.
- `A.meteor(b, p, adet, hasar, element, patlama, ek)`: gökten düşen atışlar.
- `A.halka`, `A.toz`, `A.yazi`, `A.sars`: görsel etkiler.

### Şahmeran örneği (Zümrüt Saray tasarımı)

Şahmeran yayıyla savaşır; hamlelerinin hepsi oktur.

| Hamle | Ne yapar | Hasar |
|---|---|---|
| Çifte Ok | Hedefe iki ok | 2 × 185 |
| Zehirli Ok Yaylımı | Geniş açıyla iki ok | 2 × 175 |
| Gökten Ok Yağmuru | Gökten iki ok, yaydan bir ok | 2 × 185 + 190 |
| Cazibe Oku | Pembe tek ok. İsabet ederse terbiyeci **büyülenir** | 175 |

Sıra: birinci fazda Çifte Ok → Yaylım → Ok Yağmuru. İkinci fazdan (canın yüzde 62'si) sonra Cazibe Oku sıraya girer.

**Büyülenme:** büyülenen terbiyeci sırası gelince ateş edemez, yürüyemez; kendiliğinden Şahmeran'a doğru yürür ve sırası geçer. Kalkanı olan terbiyeciyi büyü tutmaz ("Kalkan büyüyü kırdı"). Ortak seferde büyü yalnız vurulan oyuncunun ekranında hesaplanır; ötekiler onun yürüdüğünü görür.

## 3. Arena: bir savaş sahnesi

Bir arena bir klasördür: `eo2/arenalar/<ad>/`.

| Dosya | Ne |
|---|---|
| `arena.json` | Yazılar, tema, düşman listesi, boss. |
| `blok.png` | İşaret haritası: zemin, oyuncu kutuları (mavi), düşman kutuları (sarı), boss kutusu (macenta), kamera (yeşil çerçeve). Renkler `ZINDAN_YONTEMI.md` içinde. |
| Numaralı katman resimleri ya da `sahne.webp` | Sahnenin çizimi. |

Çizimi henüz olmayan sahne için **çizimsiz arena** da kurulabilir: `arena.json` içine `"eski": { "zindan": "komutan", "asama": 1 }` yazılır; zemin ve arka plan eski aşamadan gelir (Volkanik Kaldera ve Batık Donanma böyle çalışıyor).

Adımlar:

1. Klasörü aç, `arena.json` yaz (örnek: `eo2/arenalar/zumrut-defile/arena.json`).
2. `blok.png` çiz. Elle çizmek yerine koddan üretmek istersen `eo2/tools/zumrut_blok.mjs` örnektir.
3. Derle: `node eo2/tools/arena_derle.mjs`. Hata varsa hangi alanın eksik olduğunu söyler (örnek: "arena.json 6 düşman sayıyor, blok haritada 4 sarı kutu var").
4. Derleme `eo2/js/arena_veri.js` dosyasını yeniler. Bu dosyayı elle düzenleme.

## 4. Zindan: arenaların sırası

`eo2/js/zindan_tarif.js` içine bir satır:

```js
zumrut: { ad: 'Zümrüt Saray', odul: 'sahmeran', tanitim: 'Şahmeran\'ın sarayına girilir. İki aşama var: …', asama: ['zumrut-kopru', 'zumrut-defile'] },
```

- `ad`: oyunda her yerde görünen ad (harita, sefer ekranı, davet).
- `odul`: ganimet çarkının hangi tabloyu kullanacağı (`topcu_veri.js` içindeki zindan anahtarı). Ödül miktarları burada değişmez.
- `asama`: arena klasörlerinin adları, oynanış sırasıyla. Son arenada boss olur.

Zindan 1 ile 4 terbiyeci için aynı sistemdir; tek kişi de içinde tek kişi olan aynı seferi oynar. Düşman canı kişi sayısıyla artar: 1 + 0,5 × (kişi − 1).

## 5. Denetle

Yeni bir şey ekledikten sonra sırayla:

```
node eo2/tools/arena_derle.mjs
node --test tests/zindan_tarif.test.js tests/zindan_ortak.test.js
```

Sunucuyu yeniden başlat (tarif ve arena kaydını açılışta okur), sonra:

```
node eo2/tools/check_zindan.mjs          (iki oyuncu: kamp, dalgalar, boss, çark)
node eo2/tools/check_zindan_uc.mjs       (üç oyuncu; N=4 ile dört)
node eo2/tools/check_sahmeran_ok.mjs     (oklar, Cazibe Oku, uyuyan düşman)
node eo2/tools/check_zindan_eski.mjs     (çizimsiz arenalar, tek kişi)
```

Hepsine `EKRAN=<klasör>` verirsen ekran görüntülerini de yazar. Göndermeden önce `npm run duman` koşulur.

## 6. Sık yapılan hatalar

- Düşman sayısı ile sarı kutu sayısı tutmuyor: derleyici durur, sayıları söyler.
- Düşman yanlış yerde çıkıyor: liste soldan sağa okunur; sırayı kutulara göre düzelt.
- Yeni düşman görünmüyor: resim yolu yanlış. `node eo2/tools/check_eksik_dosya.mjs` eksik dosyayı gösterir.
- Sunucu eski zindanı oynatıyor: sunucu yeniden başlatılmadı.
- Dalga hiç gelmiyor: birinci dalgada (`dalga` yazılmamış) en az bir düşman olmalı.
- Uçan engerek: eklenmez. Köprüdeki yılanların hepsi yerdedir.
