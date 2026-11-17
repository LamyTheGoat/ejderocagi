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

`eo2/arenalar/<ad>/` (ad: küçük harf, rakam, tire). İçinde:

| Dosya | Ne |
|---|---|
| Numaralı katman resimleri | Krita katmanlarının dışa aktarımı. Dosya adı katman numarasıyla başlar. |
| `blok.png` | İşaret katmanı: oyuncu, düşman ve boss kutuları, kamera çerçevesi. |
| `arena.json` | Yazılar ve düşman listesi. |

Sonra `node eo2/tools/arena_derle.mjs` çalıştırılır: bütün klasörleri okur, `eo2/js/arena_veri.js` dosyasını üretir. Oyun ve sunucu yalnız o dosyayı okur. **Yeni arena için kod yazılmaz.** Bir şey eksik ya da tutarsızsa araç, çizen kişinin anlayacağı bir hatayla durur.

### Katmanlar (KARAR, 2026-11-17)

- Katman adı **numarayla başlar**: `-2 gokyuzu.png`, `-1 arka duvar.png`, `0 kirilmaz zemin.png`, `1 on perde.png`.
- **Oyuncu hep 0'dadır.** 0 ve altı oyuncunun arkasında çizilir (küçük numara daha arkada); 1 ve üstü oyuncunun önünde. Aynı numaralılar ada göre sıralanır.
- Adında **"kirilir"** geçen katman kırılabilir zemin, **"kirilmaz"** geçen kırılamaz zemindir. O katmana çizdiğin yer zemin olur; gülle kırılabilir katmanın resmini gerçekten oyar ve arkadaki katmanlar görünür.
- Yarıdan saydam yerler zemin sayılmaz (yumuşak fırçada çarpışma çizgisi, görünen kenarın biraz içindedir). Çarpışmaması gereken süs (sarkan çim, gölge) zemin katmanına değil başka bir katmana çizilir.
- Bütün katmanlar tuvalin tamamı olarak, **aynı boyda** dışa aktarılır (katman içeriğine göre kırpma kapalı). Zemin katmanları PNG olmalı; ötekiler PNG ya da WebP olabilir.
- Krita'dan: Araçlar → Betikler → Katmanları Dışa Aktar (Export Layers); "katman içeriğine göre boyut ayarla" kapalı. Dosya adlarının başına ek bir şey koyuyorsa adları numarayla başlayacak biçimde düzelt.
- Eski tek resimli biçim geçerli: `sahne.webp` = −1 numaralı katman (Zümrüt Saray böyle).
- SEÇİM: Krita dosyasını (.kra) doğrudan okumak yerine numaralı dışa aktarım seçildi; kullanıcının önerdiği iki yoldan sağlam olanı. Klasördeki .kra dosyası yok sayılır.

### Blok harita renkleri (KARAR)

Palet: `eo2/docs/blok_harita_paleti.png` (görsel) ve `eo2/docs/blok_harita_paleti.gpl` (Krita paleti).

| Renk | Hex | Anlam |
|---|---|---|
| Kırmızı | `#FF0000` | Görünmez kırılabilir zemin (yalnız resmi olmayan zemin için; olağan yol zemin katmanı) |
| Koyu gri | `#404040` | Görünmez kırılamaz zemin (aynı) |
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
- **Düello arenası (SEÇİM):** `"tur": "pvp"` yazılır; düşman ve boss olmaz, en az iki mavi kutu gerekir (en soldaki ve en sağdaki iki oyuncunun yeridir). Düello meydanının klasör adı `er-meydani`.
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

- Kurulu: klasör + numaralı katmanlar + işaret katmanı + derleyici; Zümrüt Saray'ın iki arenası bu yolla çalışıyor (tek kişi ve grup). İki arenanın blok haritası kodla çizildi (`eo2/tools/zumrut_blok.mjs`), Krita'da elle çizilmiş bir harita henüz denenmedi.
- Katmanlı arena ve kırılabilir zemin katmanı kodla üretilmiş bir deneme arenasında doğrulandı (gülle zemin resmini oyuyor, kırılmaz katman duruyor, ön katman oyuncunun önünde). Oyunda duran iki arena tek resimli ve kırılmaz; Krita'dan çıkmış gerçek bir katman takımı henüz denenmedi.
- Katmanlar PNG olarak oyuncuya gider; büyük arenalarda dosya boyu için ayrı bir küçültme adımı gerekebilir.
- Uçan düşman yerinden kıpırdamaz (eski kural); "hayalet" ayarı okunuyor ama zeminin içinden geçen bir hareket henüz yok.
- Üç zindan da ortak sistemdedir (2026-11-17): Zümrüt Saray çizimli arenalarla; Volkanik Kaldera ve Batık Donanma **çizimsiz arenalarla** (aşağıda). Eski tek kişilik yol yalnız sunucuya ulaşılamadığında kullanılır.
- Düello (PvP) ve talim aynı yükleyiciye bağlı: `eo2/arenalar/er-meydani` klasörü gelince meydan oradan kurulur (geçici bir deneme meydanıyla doğrulandı). Klasör henüz yok; o gelene dek eski talim meydanı kullanılır.
- Sunucuya ulaşılamazsa tek kişilik giriş eski yola düşer.
- Ödül oyuncunun kendi ekranında yazılır; ortak oda servisi sunucunun belleğindedir.
- Sefer Kampı tektir ve her zindanda aynıdır.
- Bağlantı ve yenileme (2026-11-17): sayfa yenilenince ya da bağlantı kopup gelince oyuncu savaşa geri döner (düşman canları ve sıra sunucudaki hâlden sürer). Çark sırasında yenilenirse o aşamanın çarkı geçilir (ödül iki kez yazılmasın diye yeniden açılmaz); grup bekletilmez. Ayrılan ya da kopan yoldaşın topçusu öteki ekranlarda yere serilir, sırası atlanır.
- Yoldaşın ateş topundan kalan lav havuzu öteki ekranlarda da görünür (hasarını havuzun sahibi verir).

### Çok oyunculu parçalar (2026-11-17 sonu)

| Parça | Nerede | Denetim |
|---|---|---|
| Ortak zindan (1–4 kişi; tek kişi de aynı sistem) | `server/zindan_ortak.js`, `eo2/js/zindan_ortak.js` | `check_zindan.mjs`, `check_zindan_donus.mjs` |
| Takım Meydanı 2v2 (ejder topçusu; sıra ve can sunucuda, ödül yok) | `server/takim_ortak.js`, `eo2/js/takim.js` | `check_takim.mjs` (dört tarayıcı, gerçek atış dahil) |
| Er Meydanı (ejderha dövüşü: eşleşme sırası, sancak, meydan okuma) | `server/duel_service.js`, `eo2/js/arena.js` | `check_er_meydani.mjs` (sıra, sancak ve meydan okuma daveti) |
| Topçu düellosu 1v1 (eski oda sistemi) | `server/pvp_rooms.js`, `eo2/js/topcu_pvp.js` | `check_topcu_duello.mjs` (eşleşme, sıra, gerçek atış, sonuç) |
| Karakter görünüşü (saç, göz; öteki oyuncuya gider) | `eo2/js/gorunum.js`, `eo2/tools/bake_gorunus.mjs` | `check_gorunus.mjs` |

Takım Meydanı ortak zindanla aynı oda altyapısını kullanır; 1v1 topçu düellosu hâlâ eski oda sistemindedir (iki ayrı yol). İleride 1v1 de Takım Meydanı'nın yoluna alınabilir.
Savaş ekranındaki topçu karakter görünüşünü taşır (2026-11-17): oyuncunun, yoldaşın ve rakibin saçı ve gözü savaşta da görünür. Katmanlar `eo2/tools/bake_savas_gorunus.mjs` ile pişirilir (`eo2/assets/gorunus_savas/`, 6,7 MB): gövde 70 kare; yüz, saç ve kulak az hücreli olup her kareye çizicinin dönüşümüyle yerleştirilir. Denetim: `check_savas_gorunus.mjs`. Savaş ekranının sol üstündeki küçük portre hâlâ özgün görünüştedir.

## 7. Açık sorular (kullanıcı kararı)

1. Hayalet düşman zeminin içindeyken atışlardan etkilenir mi?
2. Fiziğe uyan düşmanın altındaki kırmızı zemin kırılırsa aşağı düşer mi? (Motor bugün düşürüyor.)
3. Uçan düşmanın hız ve yükseklik sınırı.
4. Dik telefon için kamera oranı (bugün: eski yakınlaştırma).
5. Arena genişliği sınırı büyütülsün mü (bugün en çok 37 oyuncu boyu)?
6. Saldırı öncesi çizgi roman panelleri olacak mı?

### Kor Örsü ve yasak düşman (2026-11-17)

- **Uçan engerek hiçbir zaman olmayacak (KARAR).** Zümrüt Saray'da yalnız yer yılanları vardır; köprüdeki iki uçan engerek küçük yer yılanıyla (Sırça Engerek) değiştirildi. Uçan yılan çizimi istenmez.
- **Kor Örsü** (`eo2/js/ors_kural.js` kurallar, `eo2/js/ors.js` ekran): terbiyecinin Ejder Topu +0'dan +12'ye dövülür; her kademe topçunun hasarını ve canını yüzde 2 artırır (çatlak topta artış yok). Bedel peşin ödenir (kor taşı + altın; sayılar eski oyunun birinci kademe tablosu). Üç çekiç darbeli tav oyunu şansı değiştirir; "Körüğe yüklen" kumarı; +4'ten sonra tutmayan deneme kademe düşürür, +7'den sonra topu çatlatır; Anka Mührü korur; üç altın darbe + tutan deneme iki kademe verir. Giriş: Gece Çarşısı'nda Usta Kerim'in tezgâhı ve Usta Kerim'le konuşma. Denetim: `tests/ors_kural.test.js`, `eo2/tools/check_ors.mjs` (duman testinde).
- Örs kaydı ve taşlar oyuncunun kendi kaydındadır (tezgâh alışverişiyle aynı yol); sunucu örs denemesini doğrulamaz.

### Çizimsiz arena (2026-11-17)

Kendi çizimi henüz gelmemiş aşamalar için: klasörde yalnız `arena.json` durur ve içinde `"eski": { "zindan": "komutan", "asama": 0 }` yazar. Böyle bir arenanın zemini, arka planı, denizi ve özel kuralları eski seferin o aşamasından alınır (`eo2/js/topcu_veri.js` ZINDAN); düşmanların sırası ve canları `arena.json`'dadır ve sunucu canları oradan okur (birim testi, canların eski veriyle aynı olduğunu denetler). Sıra, can ve akış öteki arenalarla aynıdır: tek kişi de grup da aynı sistemde oynar.

- Sekiz çizimsiz arena var: `kaldera-yol`, `kaldera-kopru`, `kaldera-ors`, `kaldera-mabet`, `donanma-kiyi`, `donanma-bogaz`, `donanma-tersane`, `donanma-kadirga`.
- Çizimi gelince: `"eski"` silinir, klasöre blok harita ve katmanlar konur, `arena.json` öteki arenalar gibi doldurulur. Tarifte (`zindan_tarif.js`) değişiklik gerekmez.
- Denetim: `check_zindan_eski.mjs` iki zindanı tek kişilik seferle baştan sona oynatır (sekiz aşama). **Grupla (iki tarayıcı) denenmedi**: kırılan zeminin ve deniz olaylarının bütün ekranlarda aynı kaldığı ölçülmedi.
- Kaldera köprüsündeki uçan wyvern eski kuralla yerinde durur. Uçan engerek hiçbir yerde yoktur: sunucuya ulaşılamadığında açılan eski Sırça Saray'daki uçan engerek de yer yılanına çevrildi.

### Zemin her ekranda aynı kalır (2026-11-17 gece)

Ortak savaşta (yoldaş varken) zemini yalnız **adımın sahibi** oyar ve oyuğun yerini yayınlar (`oyuk` olayı: x, y, yarıçap; yüzde bire yuvarlanmış). Öteki ekranlar aynı yerden oyar (`B.yoldasOyuk`). Adımın sahibi: sırası gelen oyuncu; düşman sırasında düşmanın hedefi. Yoldaşın ekranda uçan güllesi yalnız görüntüdür, zemini oymaz. Sunucu olayı yalnız aktarır (`server/zindan_ortak.js`, `server/takim_ortak.js`).

| Parça | Nerede | Denetim |
|---|---|---|
| Kaldera ve Donanma grupla (zemin, düşman, can iki ekranda aynı) | `eo2/js/battle.js` (`carve`, `yoldasOyuk`) | `check_zindan_eski_grup.mjs` |
| Portrelerde saç ve göz (oyuncu, rakip, parti, künye) | `eo2/js/game.js` (`drawPortrait`, `portreTazele`) | `check_portre.mjs` |
| Oyuncu masasında ikinci oyun: Kor 21 | `server/kiraathane_pvp.js`, `eo2/js/masa.js` | `check_masa_kor21.mjs`, `tests/kiraathane_pvp.test.js` |

Portre kuralı: `drawPortrait(tuval, set, oran, kim)`. `kim` doğruysa oyuncunun kendi görünüşü; metinse öteki oyuncunun adresi ya da görünüş kodu; boşsa setin özgün yüzü (NPC). NPC portresi oyuncunun saçını almaz.

Zindan adı tek yerden gelir: haritadaki künye ortak seferin adını taşır (`zindan_tarif.js`). Eski veri "Sırça Saray" diyordu; oyunda artık her yerde "Zümrüt Saray".
