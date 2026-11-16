# Arena ve zindan yöntemi

Son güncelleme: 2026-11-17. Tek belge budur; sürdüren: cila oturumu (ArtLab oturumu yalnız çizim üretir).
Kullanıcı onayı: "o dediğin yöntem çok mantıklıydı öyle kuralım" · "bir kerede doğru dürüst kur, sonra o yöntemle çalışalım".
Kapsam: PvE zindan aşamaları ve PvP arenaları aynı yöntemle kurulur. "KARAR" = kullanıcının sözü; "SEÇİM" = bana bırakılan yerde verdiğim karar (değiştirilebilir).

## 1. Değişmeyen kurallar (KARAR)

1. **Tek arena, tek savaş.** Gruptaki herkes aynı arenadadır; sıra, rüzgâr, düşmanın yeri, hedefi ve hamlesi bütün ekranlarda aynıdır.
2. **Tek kişilik ile çok kişilik arasında fark yoktur.** Tek kişilik sefer, içinde tek kişi olan aynı zindandır: aynı arena, aynı kurallar, aynı akış.
3. **Sıraya sunucu karar verir.** Her turda önce ayaktaki oyuncular sırayla oynar, sonra yaşayan düşmanlar sırayla saldırır.
4. **Kimse oturumdan düşürülmez.** Canı biten oyuncu arenada kalır ve izler; yalnız sırası atlanır. Herkes düşerse grup kampa döner, aynı aşamayı yeniden dener.
5. **Bossa laf atma yok** (hiçbir yerde). Boss yalnız konuşur ve saldırır. Saldırı öncesi çizgi roman paneli: "belki"; yapılmadı.
6. Ödül miktarı, fiyat ve olasılıklar bu yöntemle değişmez; zindan yalnız hangi seferin ödül tablosunu kullanacağını söyler.

Örnek alınan oyunlar (SEÇİM): GunBound ve DDTank (tek oda, sıra göstergesi, ortak rüzgâr, düşen oyuncu odada izler); zindan akışı FF14.

## 2. Bir arena = bir klasör

`eo2/arenalar/<ad>/` (ad: küçük harf, rakam, tire). İçinde üç dosya:

| Dosya | Ne |
|---|---|
| `sahne.webp` | Arenanın çizimi, tek resim (modüller önceden bir araçla dizilir; örnek `eo2/tools/zumrut_sahne.mjs`). Boss, düşman ve oyuncu gömülmez. |
| `blok.png` | Krita'da çizimin üstüne, çizimle **aynı boyutta** çizilen blok harita. 8 bit PNG, kenar yumuşatma kapalı. |
| `arena.json` | Haritadan okunamayanlar: yazılar ve düşman listesi. |

Sonra `node eo2/tools/arena_derle.mjs` çalıştırılır: bütün klasörleri okur, `eo2/js/arena_veri.js` dosyasını üretir. Oyun ve sunucu yalnız o dosyayı okur. **Yeni arena için kod yazılmaz.** Bir şey eksik ya da tutarsızsa araç, çizen kişinin anlayacağı bir hatayla durur.

### Blok harita renkleri (KARAR)

Palet: `eo2/docs/blok_harita_paleti.png` (görsel) ve `eo2/docs/blok_harita_paleti.gpl` (Krita paleti).

| Renk | Hex | Anlam |
|---|---|---|
| Kırmızı | `#FF0000` | Kırılabilir zemin |
| Koyu gri | `#404040` | Kırılamaz zemin |
| Mavi | `#0000FF` | Oyuncu doğuş kutusu (dolu) |
| Sarı | `#FFFF00` | Düşman kutusu (dolu) |
| Macenta | `#FF00FF` | Boss kutusu (dolu) |
| Yeşil | `#00FF00` | Kamera alanı (içi boş dikdörtgen) |
| Saydam | alfa 0 | Boş |

Okuma: alfa 128'in altı boş; kanal başına ±32 hoşgörü.

- **Ölçek (KARAR):** mavi kutu tam bir oyuncu boyundadır; arenanın ölçeği bu kutunun **yüksekliğinden** çıkar.
- **Düşman ve boss kutuları (KARAR):** o karakterin boyunda çizilir; oyun boyu kutudan okur.
- Kutuların alt kenarı ayağın bastığı çizgi, yatay ortası konumdur (SEÇİM). Havada duran sarı kutu uçan düşmandır.
- Sarı kutular soldan sağa, `arena.json` içindeki düşman sırasıyla eşleşir (SEÇİM). Sayılar tutmazsa araç durur.
- Mavi kutu en çok dört tane olabilir: gruptaki sıraya göre dağıtılır; tek kutu varsa grup onun çevresine dizilir (SEÇİM).
- **Kamera (KARAR):** varsayılan kamera yüksekliği 6 oyuncu boyu (yatay ekran). Yeşil dikdörtgen çizilmişse onun yüksekliği geçerlidir; `arena.json` içinde `kameraBoy` ile de değiştirilebilir.
- Blok boyutu (SEÇİM): serbest. Zemin oyunda oyuncu boyunun yaklaşık on dörtte biri inceliğinde okunur; daha ince ayrıntı kaybolur.
- Sınır (SEÇİM, motorun bugünkü dünyası): arena genişliği en çok 37 oyuncu boyu, yüksekliği zeminden yukarı yaklaşık 11 oyuncu boyu. Aşılırsa araç söyler.

### arena.json alanları (SEÇİM)

```json
{
  "ad": "Şahmeran'ın Defilesi", "alt": "Yılan Kraliçe yükseltide bekliyor", "ipucu": "Savaş başında çıkan ipucu",
  "tema": "sirca", "ortam": "spor", "ust": "#0d3327", "altRenk": "#0a2a20",
  "dusman": [ { "tip": "zs_agir", "ad": "Sırça Taht Muhafızı", "hp": 640 } ],
  "boss": { "tip": "sahmeran_v3", "ad": "Yılan Kraliçe Şahmeran", "unvan": "Zümrüt Saray'ın ebedi hükümdarı", "hp": 3600 }
}
```

- `ust`, `altRenk`: çizimin üstünde ve altında kalan boşluğun rengi. `tema`: çukur ve parçacık renkleri. `ortam`: havada uçuşan parçacık.
- `tip`: düşman ya da boss türü (`eo2/js/topcu_veri.js` MOB / BOSS). `hp`: tek oyuncu için can; sunucu zorluk ve grup çarpanını uygular (1 + 0,5 × (kişi − 1)).
- **Düşman hareket ayarı (KARAR):** `"fizik": false` uçan düşman (zeminin içinden geçemez); buna `"hayalet": true` eklenirse zeminin içinden de geçer. Yazılmazsa düşman fiziğe uyar: altındaki zemine düşer.

## 3. Bir zindan = arenaların sırası

`eo2/js/zindan_tarif.js`: ad, tanıtım yazısı, ödül tablosunun alınacağı sefer (`odul`) ve arena adları. Yeni zindan buraya bir satır ekler.

Denetim: `node --test tests/zindan_tarif.test.js` · `node eo2/tools/check_zindan.mjs` (iki tarayıcıyla baştan sona sefer) · `npm run duman`.

## 4. Düşman ve boss davranışı (KARAR: yön; ayrıntı açık)

1. Sıradan düşman: hazır davranış kalıbı + sayılar. 2. Boss: can eşiğine göre faz tablosu + ağırlıklı hamle havuzu. 3. Boss'a özel küçük kod parçası, tabloyla anlatılamayan davranış için. Hamle adı = animasyon klibi adı.
Bugün: düşman ve boss türleri `eo2/js/topcu_veri.js` içinde tanımlı (eski oyunun kuralları); yeni tür oraya eklenir, arena onu adıyla çağırır.

## 5. Çizim teslimi

- **Sahne:** düz yandan görünüş; yürüme hattının üstünde en az 7, altında en az 3 oyuncu boyu resim. Köprü ya da podyumun üst yüzeyi görünmez (düz kenar çizgisi).
- **Düşman:** sola bakar, saydam zemin, alt kenar = yer. Varsa saldırı ve vuruluş karesi aynı boyda, aynı ayak noktasıyla.
- **Boss:** sola bakar; kare sayfası (eşit ızgara ya da atlas + JSON); klipler: bekleme, saldırı (hazırlık, vuruş, toparlanma), vuruluş, varsa ölüm. Zayıf noktanın ve merminin çıktığı yerin karedeki konumu söylenir.

## 6. Bugünkü durum ve bilinen eksikler

- Kurulu: klasör + blok harita + derleyici; Zümrüt Saray'ın iki arenası bu yolla çalışıyor (tek kişi ve grup). İki arenanın blok haritası kodla çizildi (`eo2/tools/zumrut_blok.mjs`), Krita'da elle çizilmiş bir harita henüz denenmedi.
- Kırılabilir (kırmızı) zeminde çukur, çizimin üstünde koyu oyuk olarak görünür; canlı bir arenada denenmedi (eldeki iki arena kırılmaz).
- Uçan düşman yerinden kıpırdamaz (eski kural); "hayalet" ayarı okunuyor ama zeminin içinden geçen bir hareket henüz yok.
- Eski üç zindanın (Sırça Saray'ın dört aşamalı hâli, Volkanik Kaldera, Batık Donanma) tek kişilik seferleri eski yolla duruyor. Zümrüt Saray'ı olan Sırça Saray girişi yeni sisteme gider; öteki ikisi arenaları çizilince taşınacak.
- PvP arenaları henüz bu yükleyiciye bağlanmadı.
- Sunucuya ulaşılamazsa tek kişilik giriş eski yola düşer.
- Ödül oyuncunun kendi ekranında yazılır; ortak oda servisi sunucunun belleğindedir.
- Sefer Kampı tektir ve her zindanda aynıdır.

## 7. Açık sorular (kullanıcı kararı)

1. Hayalet düşman zeminin içindeyken atışlardan etkilenir mi?
2. Fiziğe uyan düşmanın altındaki kırmızı zemin kırılırsa aşağı düşer mi? (Motor bugün düşürüyor.)
3. Uçan düşmanın hız ve yükseklik sınırı.
4. Dik telefon için kamera oranı (bugün: eski yakınlaştırma).
5. Arena genişliği sınırı büyütülsün mü (bugün en çok 37 oyuncu boyu)?
6. Saldırı öncesi çizgi roman panelleri olacak mı?
