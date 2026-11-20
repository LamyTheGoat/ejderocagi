# Ejder Ocağı · Oyun tasarım ilkeleri

Sürüm 0.4 · 2026-11-20 · Sürdüren: oyun tasarım threadi.
Bu belge her yeni içeriğin (zindan, düşman, boss, ödül, ekran) uyması gereken ilkeleri tek yerde toplar.
Zindan tasarım threadi şartnamelerini buna göre yazar; zindan üretim threadi şartnameyi bu ilkelere göre denetler.

İşaretler: **KARAR** = Mehmet'in sözü (kaynağı yanında). **SEÇİM** = tasarımcının verdiği, değiştirilebilir karar. **AÇIK** = Mehmet'in kararını bekliyor (§10).
Çelişki olursa sıra: Mehmet'in son sözü → bu belgedeki KARAR → `KARARLAR.md` / `ZINDAN_YONTEMI.md` → SEÇİM.

---

## 1. Oyunun özü (sütunlar)

1. **Ejderha yetiştirmek.** Gen, soy ve bakım oyunun kalbidir; her sistem bir yolla ejderhaya döner (ödül, kuşam, gösteri).
2. **Topçu savaşı.** Sıra tabanlı, rüzgârlı, 2D top düellosu (GunBound/DDTank çizgisi). Ustalık nişan, konum ve sırayla ölçülür; sayılarla değil.
3. **Oyuncu ekonomisi.** Her şey takas edilebilir olmalı. Değer, oyuncunun emeğinden ve oyuncular arası alışverişten doğar.
4. **Birlikte oynamak.** Meydan, parti, ortak sefer, masa oyunları. Tek kişi de aynı dünyada, aynı kurallarla oynar.
5. **Türk masalı.** Dünya, kişiler ve düşmanlar Anadolu ve Türk halk anlatısından gelir.

Kalite çıtası (KARAR, K16): en az 30 dolarlık ücretli bir oyun hissi; arayüz ve döngüde Genshin Impact işçiliği.

## 2. Ton ve kültür

- **Kaynak:** Türk ve Anadolu halk anlatısı: Şahmeran, Anka, Tepegöz, Al Karısı, Erlik, Umay, Dede Korkut, Keloğlan; kervansaray, han, çarşı, kümbet, çini (KARAR, K2).
- **Mimari:** Türk-Avrupa karması parlak üslup (KARAR, 2026-11-11, Pilot Meydan); Avrupa masal şatosu tek başına değil.
- **Işık:** gündüz ana ton; gece ve kor ışığı ikinci durum. Zindanlar ikinci ışıkta olabilir (KARAR, K1).
- **Dil:** oyuncuya görünen her yazı Türkçe, sade, masal ağzına yakın. Yabancı fantastik terim yok ("wyvern" değil "ejder yılanı" gibi; SEÇİM).
- **Boss sesi:** boss konuşur ve saldırır; oyuncuyla laf atışmaz (KARAR, ZINDAN_YONTEMI §1.5).
- **NPC'ler:** hazır repliklerle konuşur; dış yapay zekâ ya da API yok (KARAR, K17).
- **Saygı (SEÇİM):** dini figürler ve gerçek tarihî kişiler düşman olmaz; halk anlatısının yaratıkları olur.

## 3. Savaş ilkeleri (Topçu)

### 3.1 Değişmezler (KARAR, ZINDAN_YONTEMI §1)
1. Tek arena, tek savaş: gruptaki herkes aynı arenada; sıra, rüzgâr, düşmanın yeri ve hamlesi her ekranda aynı.
2. Tek kişilik sefer, içinde tek kişi olan aynı zindandır: aynı arena, kurallar, akış.
3. Sıraya sunucu karar verir: önce ayaktaki oyuncular, sonra yaşayan düşmanlar.
4. Kimse oturumdan düşürülmez. Canı biten izler; herkes düşerse grup kampa döner, aşamayı yeniden dener.
5. Uçan engerek hiçbir zaman yok (KARAR, 2026-11-17).

### 3.2 Okunabilirlik (SEÇİM)
- Oyuncu her tehlikeyi **bir tur önceden** görebilmeli: boss'un hamlesi, tehlike bölgesi ya da sözüyle ilan edilir. Görünmez anlık ölüm yok.
- Her boss'ta en az bir **zayıf nokta** (kritik) ve en az bir **kaçınılabilir** hamle (`bolge`: yerinden çekilen ıskalatır) olur.
- **Sabit düşman sınırı yok (KARAR, Mehmet 2026-11-20).** Sayıyı her zindanın şartnamesi kendi temasına göre koyar (örnek: bir zindanda toplam en çok 10 drake). İlke: güçlü düşman az olur, zayıf düşman çok olabilir; her düşman ekranda okunur kalmalı.
- Durum etkisi (büyülenme gibi) en çok **bir tur** sürer ve bir karşılığı olur (kalkan kırar).

### 3.3 Dalga yönetimi (SEÇİM; mekanik `dalga` ve `uyan` alanlarıyla var)
- Bir arenada **1–3 dalga**. Her dalga 1–3 düşman.
- Dalgalar artan baskıyla gelir: 1. dalga öğretir (tek tür), 2. dalga karıştırır, 3. dalga sınar (ağır tür ya da iki yandan).
- Birinci dalgada en az bir düşman olur (motor kuralı).
- **Nefes payı (KARAR, Mehmet 2026-11-20):** yeni dalga çıktığı tur saldırmaz; ilk saldırısı bir sonraki düşman sırasındadır. Motor bugün hemen sıra veriyor; kodlanacak.
- `uyan` (uyuyan düşman) gizli tehlike için değil, oyuncunun sırayı seçmesi için kullanılır: uyuyan düşmanın yeri görünür olmalı.

### 3.4 Boss yapısı (SEÇİM, ZINDAN_YONTEMI §4 ile uyumlu)
- 2 ya da 3 faz; faz eşiği can oranıyla (örnek: %62). Her faz yeni bir hamle ya da kural ekler, eskisini daha sert yapmaz yalnızca.
- Hamle havuzu faza göre üçlü sıra. Hamle adı = animasyon klibi adı.
- Boss'un kimliği tek cümleyle söylenebilmeli: "Şahmeran yayla uzaktan büyüler."

### 3.4b Her zindan bir şey öğretir (KARAR, Mehmet 2026-11-20)
FF14'teki gibi her zindanın öğrettiği tek bir ana beceri olur ve zindan bunun çevresinde kurulur. Örnek: Zümrüt Saray dalga kontrolünü, Kalgarot boss mekaniklerini (yayılma ve toplanma) öğretir. Şartname bu beceriyi ilk satırda yazar; merdivende (§4.2) sonraki zindan öğrenilmiş becerileri birleştirebilir.

Güçlü düşmanın ritmi şartnamede yazılır (örnek: drake iki turda bir ateş eder); her tur saldıran güçlü düşman az olur.

### 3.5 Hedef süreler (SEÇİM; ölçülüp düzeltilecek)
| Ne | Hedef |
|---|---|
| Bir oyuncu sırası | 20–30 sn |
| Bir arena (tek kişi) | 4–7 dk |
| Bir zindan (tek kişi) | 12–20 dk; 2–4 arena |
| Boss savaşı | 6–10 oyuncu turu |

## 4. Zorluk ve ölçekleme

### 4.1 Bugünkü kurallar (kodda; `server/zindan_ortak.js`)
- Zorluk çarpanı: **Normal 0,75**, **Ağır 1,0**. Düşman canı ve hasarı bununla çarpılır.
- Grup can çarpanı: **1 + 0,5 × (kişi − 1)** → 1 kişi ×1, 2 kişi ×1,5, 3 kişi ×2, 4 kişi ×2,5.
- Sıradan düşman atışı: 135 × zorluk.

### 4.2 Eğri ilkeleri
- **Zorluk merdiveni (KARAR, Mehmet 2026-11-20):** zindanlar bir sıra izler: her yeni zindanın Normal'i bir öncekinin Ağır'ından kolay ya da ona eşit olur. Böylece yeni gelen oyuncu takılmaz.
- Bir zindan içinde aşamalar artar: son arena (boss) zorluğun tepesidir; ilk arena öğretir.
- Yeni bir kural (rüzgâr değişimi, kırılan zemin, büyü) önce düşük baskıda tek başına gösterilir, sonra başka kuralla birleşir.
- Zorluk sayıyla değil, önce davranışla artar: daha çok can yerine daha akıllı hamle, daha zor konum.
- Ağır zorluk ödülü çark tablosundaki mevcut kuralı kullanır; yeni ödül sayısı uydurulmaz (§5).

### 4.3 Tek kişi ve grup (KARAR, Mehmet 2026-11-20: "olur 0.6 iyi")
- Tek kişi ile grup aynı zindandır: aynı arena, kurallar, akış.
- Grup çarpanı düşman canını artırır: 1 + 0,5 × (kişi − 1).
- **Tek kişide düşman ve boss hasarı ×0,6.** İki ve üstü kişide ×1. Zorluk çarpanıyla birlikte uygulanır (Normal tek kişi: 0,75 × 0,6).
- Şartnameler hasar sayısını grup için yazar; tek kişi indirimini sunucu uygular, ayrıca yazılmaz.

## 5. Ekonomi ilkeleri (önce gelir)

Ekonomi kuralları her tasarım kararının önündedir. Bir içerik bu bölümle çelişirse içerik değişir.

### 5.1 Değişmezler (KARAR)
1. Var olan ödül miktarı, fiyat ve olasılık değerleri değişmez (KARARLAR "Değişmeyenler", K18). Zindan yalnız hangi ödül tablosunu kullandığını söyler (`odul` anahtarı).
2. Altın ve varlık yalnız sunucu komutuyla değişir; istemci beyanına güvenilmez. `server/economy_sources.js` kaynak politikasına onaysız dokunulmaz.
3. **Kumar satışı yok:** gerçek parayla şans kutusu, şans çarkı, kutu satışı yok. Gelir doğrudan satıştır (LoL tarzı). Ödeme duvarı yok.
4. Elmas (ücretli para) karar verilmeden HUD'a girmez (K4). Seviye sistemi yok (K5), lonca ilk sürümde yok (K6).
5. Hile koruması şimdilik yok: yapay tavan ve kısıt eklenmez.
6. Hedef ödülü hesap başına bir kez (2026-11-16).

### 5.2 Yeni içerik için kurallar (SEÇİM)
- Yeni zindan **yeni para birimi** getirmez. Mevcut altın, yem, taş ve eşya tablolarını kullanır.
- Yeni ödül tablosu gerekiyorsa ayrı bir **ekonomi karar belgesi** yazılır ve Mehmet onaylar; şartname onu bekler.
- Her yeni kaynak (faucet) için bir çıkış (sink) adı verilir: bu ödül nerede harcanır?
- Ödül emeğe bağlıdır: süre ve zorlukla artar; kişi sayısı oyuncu başına ödülü düşürmez.
- Oyuncu arası takas edilebilirlik korunur: ödülü "bağlı" yapan yeni kural eklenmez.

### 5.3 Oyun içi şans (KARAR, Mehmet 2026-11-20)
"Kumar yok" yalnız **gerçek parayla** şans demektir. Oyun içi parayla ya da emekle oynanan şans serbesttir: ganimet çarkı, Kıraathane bahsi, Ejder Pokeri, Kor Örsü'nde "Körüğe yüklen" gibi şansa bağlı grind mekanikleri oyunun parçasıdır. Gerçek parayla alınan hiçbir şey bir şans sonucuna bağlanmaz.

## 6. Görsel üslup kilitleri

### 6.1 Genel (KARAR)
- Tek üslup, tek ışık yönü. Referans görsellerin üstüne yazılmaz; her değişiklik yeni sürüm ve yeni dosya adı.
- Dünya: Merkez Meydan 14 derece master kamera (K23); öteki bölümler yakın kamera (kullanıcı, 2026-11-12; K23 metni güncellenecek).
- Arayüz: camsı, sade, mat parşömen ana düğmeler; neon, nabız atan ışıltı, maviye boyalı panel ve tablo, "yapay zekâ kokan" görünüş yok (K16, K19, K20).
- Çizim üretimi: önce image-generation skill'iyle istem, sonra chatgpt-image-gen; çıktı önce scratchpad'e (proje talimatı).

### 6.2 Ejderha kilitleri
- **Bulut Ejderi v1 kilitli referanstır; Alev ikinci referanstır.** Yeni ejderha ve ejderha benzeri boss bu ikisinin çizgi, gölge ve oranına uyar.
- Ejderha her yerde oyunun kendi çizimiyle, gen renkleriyle (`G.img` / `G.poz`).
- Üretim hattı 7 aşama: Siluet, Anatomik Renk Kimliği, Çizgi, Düz Renk, Cel Gölge, Işık, Son Cila.
- Ejder hep topun üstündedir; uçup namlu ucuna çıkmaz.

### 6.3 Zindan ve düşman çizimi (KARAR, ZINDAN_YONTEMI §5)
- Sahne düz yandan; yürüme hattının üstünde en az 7, altında en az 3 oyuncu boyu.
- Düşman ve boss sola bakar, saydam zemin, alt kenar = yer; kareler aynı boy ve aynı ayak noktası.
- Boss klipleri: bekleme, saldırı (hazırlık, vuruş, toparlanma), vuruluş, varsa ölüm. Zayıf nokta ve mermi çıkış noktası işaretlenir.
- Kalite ölçütü: kesimde yarı saydam piksel %6'nın altında (CIZIM_DUNYASI).
- **Yeni karakter ve düşman çizimleri baştan, modüler ve riglenebilir üretilir (KARAR, Mehmet 2026-11-20):** parçalar (baş, gövde, kanat, kuyruk, uzuvlar) ayrı katman ya da ayrı çizim olarak gelir; tek parça kare sayfası yeni üretimde kullanılmaz.

## 7. Arayüz ve deneyim ilkeleri

- **Sahne önce** (K19): her ekran bir sahnedir; tablo ve kart ızgarası son çaredir.
- Masaüstü ve telefon eşit (K9); dünya ve Topçu yatay. Her yeni ekran 568×320 yatay ve 390×664 dikeyde denenir.
- Parmak hedefi en az 44 px. Dokunmatikte yanlış dokunuş iptal edilebilir (ATEŞ'te sürükleyip çıkınca iptal).
- İpucu oyunun önemli düğmesini örtmez; kendiliğinden kaybolur ya da kapatılabilir.
- Oyuncu ne olduğunu her an bilir: kimin sırası, rüzgâr, can, kalan dalga ("Dalga 2 / 3") ekranda.
- Yazı: Türkçe, kısa, eylem sözcüğüyle başlayan düğmeler. Başlık yazısı kararı (K8 ile Noto Sans) açık bir çelişki; yeni ekran mevcut arayüzün yazısını kullanır.
- Bağlantı koparsa oyuncu kaldığı yere döner; ödül iki kez yazılmaz.

## 8. Teknik sınırlar (tasarımı bağlar)

- Tek Cloud Run örneği; ücretli altyapı yok (proje talimatı). Bir zindan 1–4 kişidir.
- Yeni zindan için kod yazılmaz: arena klasörü + `arena.json` + `zindan_tarif.js` satırı yeter (ZINDAN_YONTEMI §2–3). Yeni davranış gerekiyorsa önce `topcu_veri.js` MOB/BOSS kaydı.
- Arena sınırı: genişlik en çok 37, yükseklik yaklaşık 11 oyuncu boyu; kamera varsayılanı 6 oyuncu boyu.
- İlk açılış ağır (~20 MB); zindan çizimleri yalnız zindana girerken yüklenir ve WebP olarak hafif tutulur (SEÇİM: arena başına en çok 3 MB).

## 9. Zindan şartnamesi kontrol listesi

Zindan tasarım threadi her şartnamede bunları yazar; üretim threadi bunlara bakarak başlar.

1. **Kimlik:** ad, tek cümlelik tema, hangi masaldan geldiği, ışık durumu.
2. **Sıra ve zorluk:** zindan sırasındaki yeri; Normal ve Ağır hedefi (§4.2).
3. **Aşamalar:** 2–4 arena; her biri için ad, alt yazı, ipucu, tema, ortam, dalga planı (dalga başına düşman türü, sayısı, can), sahnedeki yer (soldan sağa).
4. **Yeni düşman türleri:** ad, boy, element, davranış (`ucan`, `sabit`, `fizik`), söz; gereken kareler.
5. **Boss:** ad, unvan, fazlar ve eşikleri, hamle tablosu (ad, ne yapar, hasar; mevcut sayılara dayanarak), zayıf nokta, kaçınılabilir hamle, giriş ve veda sözü.
6. **Ödül:** hangi mevcut `odul` tablosu. Yeni tablo gerekiyorsa ekonomi karar belgesinin adı (§5.2).
7. **Çizim listesi:** her katman, düşman ve boss sayfası için istem taslağı ve referans (Bulut/Alev, master).
8. **Denetim:** hangi `check_*` betikleriyle doğrulanacağı; tek kişi ve en az iki kişilik grup.
9. **İlke uyumu:** bu belgenin hangi maddesinden sapıyorsa adı ve gerekçesi.

Onaylanan şartname üretim threadine dosya yoluyla iletilir; üretim şartnameyi değiştirmez, soru varsa tasarım threadine sorar.

## 10. Kapanan kararlar (Mehmet, 2026-11-20)

| # | Soru | Karar |
|---|---|---|
| A1 | Tek kişide düşman hasarı azalsın mı? | Evet, ×0,6 (§4.3) |
| A2 | "Kumar yok" neyi kapsar? | Yalnız gerçek parayla şans; oyun içi şans ve grind serbest (§5.3) |
| A3 | Yeni dalga çıktığı tur saldırsın mı? | Hayır, bir tur nefes payı (§3.3) |
| A4 | Zindanlar zorluk merdiveni mi? | Evet (§4.2) |
| A5 | Arenada en çok 4 düşman sınırı kalsın mı? | Hayır, kaldırıldı; sayı şartnamede (§3.2) |

Şu an açık karar yok. Yeni sorular buraya eklenir.

## Kaynaklar
`KARARLAR.md`, `ZINDAN_YONTEMI.md`, `DUSMAN_VE_ZINDAN_KILAVUZU.md`, `YOL_HARITASI_2026-11-15.md`, `EKSIK_OZELLIKLER_2026-11-15.md`, `GEMINI_PROTOTIP_ISTEMI.md` §5–6, `CIZIM_DUNYASI.md`, `server/zindan_ortak.js`.
Okunamayanlar (yalnız Mehmet'in bilgisayarında): `claude-context/*`, `ejder-ocagi-claude-handoff/BULUT_STYLE_LOCK.md`, `ART_BIBLE.md`. Bulut/Alev kilidinin ayrıntısı oradan doğrulanmalı.
