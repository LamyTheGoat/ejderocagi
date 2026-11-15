# Ejder Ocağı 2.0 · Söylenmemiş ama olması gereken özellikler

> 2026-11-15. Yalnız inceleme ve karar belgesi; oyun dosyalarına dokunulmadı. Kanıtlar koddan (dosya:satır).
> Oyun çalıştırılmadı, test koşulmadı; bulgular kod okumasıdır. Referans oyun bilgileri genel bilgidir, internetten ayrıca doğrulanmadı; emin olunmayan yerde "doğrulanmadı" yazıyor.
> Kararlar öneridir; son söz kullanıcıda. Onaylı kararlarla çelişenler "ÇELİŞKİ" diye işaretli.

## Çıkıştan önce şart (öncelik sırasıyla)
1. **İlk yük ve yayın:** açılışta 500+ istek, 76 ayrı betik, sıkıştırma yok; üretim sunucusu `eo2/` klasörünü hiç sunmuyor. Paketle, tembel yükle, önbellek başlığı ver.
2. **Kayıt güvenliği:** kayıt yalnız tarayıcıda. Sunucu yedeği (misafir oturumu hazır, 2.0'a bağlı değil), menüde dışa/içe aktarma, kota hatası uyarısı, iki sekme koruması.
3. **Hata güvenliği:** küresel hata yakalayıcı yok; yükleme hatasında "Yeniden dene" yok; WebGL bağlam kaybı ele alınmıyor.
4. **Ayarlar ekranı:** müzik, efekt, ortam için ayrı düzey ve kalıcılık; grafik kalitesi; arayüz ölçeği; hareket azaltma anahtarı. Şu an tek ses aç/kapa var, o da kaydedilmiyor.
5. **Sekme arka plandayken susma ve duraklama:** `visibilitychange` hiç yok; ortam sesi ve saz arka planda çalmaya devam ediyor.
6. **Müzik:** 2.0'da müzik yok (eski oyunun BGM'si `shim.js` içinde susturulmuş); yalnız kodla üretilen ortam ve saz var.
7. **İlk 10 dakika:** mektuptan sonra tek satır yürüme ipucu var. Adım adım ilk hafta yönlendirmesi ve tıklanınca götüren hedef izleyici gerek.
8. **Oyuncu adı:** herkes "Terbiyeci". Ad seçimi çok oyunculunun ön şartı.
9. **Yer tutucuları temizle:** zil ("Bildirim yok."), "Yerel" çipi, sahte Genel/Bölge/Parti sohbeti, Pazar'ı açan "Üretim", Kamera ve Işık menü maddeleri.
10. **Sohbet açılacaksa güvenlik:** küfür süzgeci, engelle, şikâyet, hız sınırı, sunucuda ad sahteciliğinin kapatılması. Bunlar olmadan sohbet açılmaz.
11. **Ağ durumu (çok oyunculu açılınca):** kopma bandı, kendiliğinden yeniden bağlanma, gecikme göstergesi, maçtan düşene geri dönüş.
12. **Ürün kimliği:** favicon boş, paylaşım kartı (og:image) yok, sayfa adı K14'e uymuyor, sürüm numarası ve künye yok.
13. **Yasal:** gizlilik (KVKK) ve kullanım koşulları sayfası; Google Fonts'un kendi sunucudan verilmesi.
14. **Telefon:** yatay yön uyarısı, tam ekran düğmesi, uzun basma menüsünün kapatılması, kilitli düğme nedeninin dokunmatikte görünmesi.
15. **Hata bildirme ve çökme kaydı:** oyuncu için "Sorun bildir", bizim için kendi sunucuya düşen hata günlüğü.

Dosya: `C:\Users\user\Documents\GitHub\ejderocagi-eng06\eo2\docs\EKSIK_OZELLIKLER_2026-11-15.md`

---

## Okuma kılavuzu
Her madde: **durum** (VAR / KISMEN / YOK) ve kanıt · neden · referans · **KARAR** · iş (küçük: saatler, orta: bir gün, büyük: günler) ve dosyalar.

---

## 1. İlk açılış

**Yükleme ekranı ve ilerleme · KISMEN.** Çubuk ve metin var (`eo2/index.html:112-116`, `eo2/js/game.js:20-30`). Ama çubuk yalnız kişi kareleriyle doluyor; dünya çizimleri (`doku.js:59`, `meydan25.js:16`, `ocak25.js:29`, `yaris25.js:20`) betik yüklenirken kendi başına iniyor, çubukta görünmüyor.
- Neden: yavaş bağlantıda çubuk %100 olur, sahne eksik çizimle açılır.
- Referans: Genshin yükleme ekranında ilerleme çizgisi ve ipucu metni birlikte durur.
- KARAR: **çıkıştan önce şart** (madde 8.1 ile birlikte yapılır). Yükleme ekranına dönüşümlü oyun ipucu satırı ekle.
- İş: orta. `game.js` (boot), `doku.js`, `index.html`.

**Hata durumunda geri dönüş · KISMEN.** `boot().catch` yalnız "Yüklenemedi: …" yazıyor (`game.js:454`). Düğme yok, küresel `error` / `unhandledrejection` dinleyicisi yok (aramada sonuç çıkmadı).
- Neden: tek bir kişi sayfası inmezse oyuncu donmuş logoya bakar; oyun sırasında fırlayan hata sessizce arayüzü kilitler (`G.busy` açık kalır).
- KARAR: **şart.** "Yeniden dene" düğmesi; küresel yakalayıcı: kaydı yaz, insan diliyle pencere göster ("Bir şey ters gitti. Kaydın güvende."), sayfayı yenile seçeneği.
- İş: küçük. `game.js`, `oyun.js`.

**WebGL yoksa mesaj · KISMEN.** "Bu tarayıcı WebGL2 desteklemiyor." yazıyor (`game.js:23`). Ne yapılacağı yazmıyor. `webglcontextlost` ele alınmıyor (aramada yok).
- Neden: telefonda sekme arka plana gidip dönünce bağlam kaybolabilir; ekran kararır, çıkış yolu yok.
- KARAR: **şart.** Mesaja çözüm ekle (tarayıcıyı güncelle, donanım hızlandırmayı aç); bağlam kaybında sahneyi yeniden kur ya da "Yenile" göster.
- İş: küçük (mesaj), orta (yeniden kurma). `gl.js`, `game.js`.

**Ses için ilk dokunuş · VAR.** `audio.js:74` ilk dokunuş ya da tuşla başlatıyor. Giriş ekranındaki düğme bu işi görüyor. İş yok.

**Tam ekran · YOK** (aramada `requestFullscreen` yok).
- Neden: telefonda adres çubuğu sahnenin beşte birini yiyor; K9 dünya yatay diyor.
- Referans: tarayıcı oyunlarında yaygın; MapleStory ve FF14 istemci oyunu, pencere kipi ayarı var.
- KARAR: **şart (telefon), iyi olur (masaüstü).** Menüde ve telefonda girişte "Tam ekran" düğmesi. iOS Safari'de sayfa tam ekranı yok: orada "Ana ekrana ekle" yönlendirmesi (madde 10).
- İş: küçük. `defter.js` (menü), `oyun.js`.

**Yön uyarısı · YOK** (CSS ve JS'de `orientation` yok).
- KARAR: **şart.** Dikey tutulan telefonda dünya için "Telefonu yan çevir" katmanı; paneller iki yönde kalır (K9 ile uyumlu).
- İş: küçük. `cila_mobil.css`, `oyun.js`.

**Tarayıcı desteği uyarısı · YOK.**
- KARAR: **iyi olur.** WebGL2 denetimi zaten kapı görevi görüyor; yalnız `color-mix`, `backdrop-filter` gibi yeni CSS'i desteklemeyen eski tarayıcıya tek satır uyarı.
- İş: küçük.

---

## 2. Ayarlar

Bugün "Menü" var (`defter.js:46-54`): ses aç/kapa, kamera, ışık, arayüzü gizle, nasıl oynanır, ana ekran. Gerçek bir ayarlar ekranı yok.

**Ses düzeyleri · YOK.** Tek anahtar (`audio.js:51` `toggle`); düzey sabit `vol = 0.7` (`audio.js:7`); tercih kaydedilmiyor (ses dosyasında `localStorage` yok). Sayfa yenilenince ses yine açık.
- Neden: oyuncu müziği kısıp efektleri duymak ister; sesi kapatan oyuncu her açılışta yeniden kapatmak zorunda kalır.
- Referans: FF14 ses ayarında ana, müzik, efekt, ses, sistem, ortam için ayrı sürgü ve ayrı susturma var.
- KARAR: **şart.** Ana, müzik, efekt, ortam sürgüleri; kalıcı.
- İş: orta. `audio.js` (kanal başına kazanç düğümü), `defter.js`.

**Grafik kalitesi · YOK.** Çözünürlük çarpanı 2'de sabit (`game.js:435`), `powerPreference: 'high-performance'` (`gl.js:183`).
- KARAR: **şart.** Üç kademe: Yüksek (bugünkü), Dengeli (çarpan 1,5, efekt yarı), Pil (çarpan 1, 30 kare, parçacık kapalı). Ayrıntı madde 11.
- İş: orta. `game.js`, `gl.js`, `efekt.js`.

**Dil · YOK.** Yalnız Türkçe; metinler koda gömülü.
- KARAR: **çıkış sonrası.** Çıkış Türkçe. Şimdi yapılacak tek şey: yeni yazılan metinleri tek yerde toplama alışkanlığı. Çeviri altyapısı büyük iş; şimdi yapma.

**Tuş atamaları · YOK.** Tuşlar koda gömülü (`game.js:59-71`).
- Referans: MapleStory'nin tuş atama penceresi türün ölçütüdür; FF14'te de tam atama var.
- KARAR: **iyi olur**, sade hâliyle: menüde tuş listesi (salt okunur) çıkıştan önce; yeniden atama çıkış sonrası. Q klavye dışı düzenlerde WASD yanında oklar zaten çalışıyor.
- İş: küçük (liste), orta (atama).

**Arayüz ölçeği · KISMEN.** Yazı boyu ekrana göre kendiliğinden (`ui2.css:19` `clamp(11px, …, 19px)`). Oyuncu ayarı yok.
- Referans: FF14 HUD düzeninde öğe başına ölçek var.
- KARAR: **şart**, tek sürgüyle (%85 – %130): kök yazı boyunu çarpar. Hem büyük ekran hem zayıf göz için.
- İş: küçük. `ui2.css` (değişken), `defter.js`.

**Erişilebilirlik · KISMEN.**
- Hareket azaltma VAR: `ui2.css:159`, `cam.css:236`, `game.js:8`, `efekt.js:7` sistem tercihini okuyor. Oyun içi anahtar yok. KARAR: **şart**, ayarlara "Hareketi azalt" anahtarı (sistem tercihini bilmeyen oyuncu için). Küçük.
- Renk körlüğü YOK. Element renkleri yalnız renkle ayrılıyor (`oyun.js:12` `G.ELC`). KARAR: **iyi olur**: renk süzgeci değil, element simgesinin her renkli yerde yanında durması (FF14 de renk süzgeci ayarını sonradan ekledi; sürüm bilgisi doğrulanmadı). Orta.
- Yazı boyu: arayüz ölçeği sürgüsü karşılar.
- Ekran okuyucu: düğmelerde `aria-label` var, pencerelerde `role="dialog"` var (`oyun.js:28`); tuval oyunu için yeterli. **Yapma** (daha fazlası).

**Titreşim · YOK** (`navigator.vibrate` yok).
- KARAR: **çıkış sonrası.** iOS Safari desteklemiyor; kazanç küçük.

---

## 3. Kayıt

**Hesap / misafir · 2.0'da YOK, sunucuda VAR.** Sunucuda misafir oturumu (`server.js:890`, `server/guest_session.js`), X ile giriş (`server.js:957-1053`), durum ve eşitleme (`/api/state` `server.js:1059`, `/api/sync` `server.js:1078`) var. 2.0 hiçbirini çağırmıyor; giriş ekranı "Kayıt bu tarayıcıda durur" diyor (`oyun.js:136`).
- Neden: tarayıcı verisini temizleyen, telefon değiştiren ya da Safari'nin 7 günlük temizliğine takılan oyuncu 20 haftalık ocağını kaybeder. Ücretli his veren bir oyunda affedilmez.
- Referans: FF14 ve Genshin'de ilerleme sunucudadır; cihaz değişince kaybolmaz.
- KARAR: **şart.** Sessiz misafir oturumu + her hafta sonunda sunucuya yedek. Hesap bağlama (X ya da e-posta) çıkıştan önce **iyi olur**; çoklu cihaz ancak hesapla mümkün.
- ÇELİŞKİ: K17 "dış API bağlantıları kaldırıldı" ve KARARLAR.md'deki açık soru ("oyunun kendi sunucusu da kapsamda mı?"). Bu öneri oyunun kendi sunucusunu kullanır, dış servis değil; yine de açık soru kullanıcıda.
- İş: büyük. `shim.js` (`__onSave` kancası hazır: `js/core.js:1011`), `oyun.js`, `server/public_files.js`.

**Dışa / içe aktarma · KISMEN.** İşlevler hazır (`js/core.js:1072` `exportSaveString`, `:1089` `importSaveString`); 2.0 menüsünde düğmesi yok (yalnız eski arayüzde: `js/ui.js:2038-2056`).
- KARAR: **şart.** Sunucu yedeği gelene kadar oyuncunun tek sigortası. Menüye "Kaydı dışa aktar / içe aktar".
- İş: küçük. `defter.js`.

**Kayıt yuvaları · KISMEN.** Çekirdekte üç yuva var (`js/core.js:853-865`), 2.0 yalnız etkin yuvayı kullanıyor; "Yeni ocak kur" üzerine yazıyor (`oyun.js:139`, onay penceresiyle).
- KARAR: **iyi olur.** Giriş ekranında üç yuva; yeni ocak kurmak için eski kaydı silmek gerekmesin.
- İş: orta. `oyun.js`.

**Bozulmaya karşı koruma · KISMEN.** Yedek anahtar var ama `saveGame` önce eski kaydı yedeğe, sonra yeni kaydı hem ana anahtara hem yedeğe yazıyor (`js/core.js:1004-1010`); yani yedek her zaman güncel kayıtla aynı, "bir önceki sağlam hâl" tutulmuyor. `saveGame` başarısız olunca `false` dönüyor, 2.0 bunu denetlemiyor (kota dolu ya da gizli pencere: oyuncu kaydedildi sanır).
- KARAR: **şart**: kayıt yazılamazsa kalıcı uyarı ("Kayıt yazılamadı; dışa aktar"). Yedeğin gerçekten bir önceki haftayı tutması: **iyi olur** (kural dosyası `js/core.js` değişir; kullanıcı onayı ister, fiyat/ödül değil ama ortak dosya).
- İş: küçük. `shim.js` (`afterAction`), `oyun.js`.

**İki sekme · YOK** (`storage` olayı ya da `BroadcastChannel` yok).
- Neden: iki sekmede açık oyun birbirinin kaydını ezer; altın ve ejderha kaybolur.
- KARAR: **şart.** İkinci sekme açılınca "Oyun başka sekmede açık" katmanı.
- İş: küçük. `oyun.js`.

**Sürüm geçişi · VAR.** `migrateSave` ve `SCHEMA_VERSION = 2` (`js/core.js:850`, `:950`), onarım işlevleri var. İş yok; yalnız 2.0'a özgü yeni alan eklenirse aynı yoldan geçsin.

---

## 4. Öğretici ve yönlendirme

**İlk 10 dakika · KISMEN.** Dedenin mektubu (`oyun.js:143`), üç saniye sonra tek yürüme ipucu (`game.js:454`), üç hedef (`oyun.js:77-78`). Oyuncuya ilk emri verdiren, ilk haftayı bitirten bir akış yok.
- Neden: oyuncu meydanda kalır; "Kuluçka Ocağı kur" hedefinin hangi kapının ardında olduğunu bilmez. Ejderha yetiştirme döngüsü (emir → Haftayı Bitir) görünmezse oyun yürüme benzetimi sanılır.
- Referans: FF14 ilk saatlerde ana görev zinciriyle elinden tutar, "Active Help" pencereleri yeni dizgeyi ilk karşılaşmada açıklar; Genshin ilk görevlerde her tuşu bir kez yaptırır.
- KARAR: **şart.** Yeni mekanik değil, sıralı gösterim: (1) Ahıra git, (2) Kor'a emir ver, (3) Kuluçka kur ve yumurtayı koy, (4) Haftayı Bitir. Her adımda dünyada hedef oku ve tek cümle.
- İş: büyük. Yeni `eo2/js/rehber.js`, `oyun.js`, `game.js` (dünya işareti).

**"Şimdi ne yapmalıyım" · KISMEN.** Hedef listesi var ama tıklanmıyor; hedef nereye gideceğini söylemiyor. Hafta sonunda görevsiz ejderha uyarısı iyi (`oyun.js:122-123`).
- Referans: FF14 görev izleyicisinde göreve tıklayınca harita hedefi gösterir; "Recommendations" penceresi yapılabilecekleri listeler.
- KARAR: **şart.** Hedefe tıklayınca ilgili ekran açılsın ya da dünyada kapı işaretlensin.
- İş: orta. `oyun.js` (hud), hedef kimliği → ekran eşlemesi.

**Bağlamsal ipuçları · YOK.** Her ekran ilk açılışta açıklamasız.
- KARAR: **iyi olur.** Ekran başına bir kez görünen tek cümle (Yuva, Arena, Sefer, Müzayede, Kütük); `S.flags` içinde görüldü işareti.
- İş: orta.

**Sözlük / yardım · KISMEN.** "Nasıl oynanır" altı paragraf (`defter.js:52`). Terim sözlüğü yok (potansiyel harfi, bağ, moral, çift kan, yadigâr).
- Referans: Genshin öğretici kartlarını arşivler; sonradan yeniden okunur.
- KARAR: **iyi olur.** Deftere "Kılavuz" sayfası: görülen ipuçları burada birikir.
- İş: orta. `defter.js`.

**Kilitli içeriğin nedeni · KISMEN.** Neden metni var ama çoğu yerde `title` özniteliğinde (`oyun.js:31`, `:46`); dokunmatikte `title` görünmez. Hikâye seçeneklerinde alt yazı olarak da basılıyor (`oyun.js:89`), o iyi.
- KARAR: **şart.** Kilitli düğmeye dokununca neden bildirim olarak çıksın; neden her zaman görünür alt yazı olsun.
- İş: küçük. `oyun.js` (`G.pen`), ekran dosyalarındaki `off` kullanımları.

---

## 5. Geri bildirim

**Onay pencereleri · VAR.** Yıkma, satış, teslim, yeni ocak, ölüm riskli dövüş, kule sıfırlama onaylı (`ekranlar.js:70`, `ocak25.js:162`, `pazar.js:23`, `:37`, `siparis.js:10`, `arena.js:145`, `kule.js:34`, `muzayede.js:38`, `oyun.js:139`). Eksik denetlenmeli: çiftleştirme ve ejderha salma; kod okumasında özel onay görmedim (doğrulanmadı).

**Geri al · YOK.**
- KARAR: **yapma** genel geri alma. Yalnız hafta içi emir değişikliği serbest kalsın (zaten öyle). Kayıt her eylemde yazıldığı için geri alma ekonomi açığı doğurur.

**Boş durumlar · VAR.** Defter, albüm, envanter boş metinli ve yönlendirmeli (`defter.js:17`, `:21-22`, `:41`). Zil düğmesi "Bildirim yok." yer tutucu (`game.js:347`).
- KARAR: **şart**: zili ya gerçek bildirim geçmişine bağla (son 20 bildirim) ya kaldır. Küçük. `game.js`, `oyun.js` (`G.toast` geçmişi).

**Hata mesajları · KISMEN.** Oyun içi nedenler insan diliyle. Teknik hatalar ham ("Yüklenemedi: assets/… yüklenemedi"). Sunucu hata kodları (`guest_session_required`, `rate_limited`) için Türkçe karşılık yalnız `pvp_rooms.js:26` çevresinde var.
- KARAR: **şart** (sunucu bağlanınca): hata kodu → Türkçe cümle tablosu tek yerde.
- İş: küçük.

**Yükleniyor durumları · KISMEN.** Ekran sahne resmi inene kadar boş koyu zemin; resim inince birden beliriyor.
- KARAR: **iyi olur.** Sahne resmi için yumuşak belirme ve düşük çözünürlüklü ön görüntü.
- İş: orta. `oyun.js`, `cam.css`.

**Ağ kopması ve yeniden bağlanma · YOK** (2.0 ağa bağlı değil; `online/offline` dinleyicisi yok).
- Referans: FF14 bağlantı koptuğunda oyuncuyu bildirir, görev içindeyken geri dönmeye izin verir.
- KARAR: **şart**, sunucu bağlandığı gün: üstte "Bağlantı koptu, yeniden deneniyor" bandı; artan aralıkla yeniden bağlanma; tek oyunculu döngü çevrimdışı sürer, sıradaki yedek bağlantı gelince gider.
- İş: orta. Yeni ağ katmanı (eski `js/net.js` yüklenmiyor).

---

## 6. Sosyal

Bugünkü durum: 2.0'da sosyal hiçbir şey gerçek değil. Sohbet kutusu yerel (`game.js:357-362`; yazılan yalnız kendi ekranına düşer), "Parti" sekmesi "Partide kimse yok." diyor, canlı çipi "Yerel" yazıyor (`index.html:43`). Sunucuda sohbet, özel mesaj, parti daveti, oda daveti iletileri var (`server.js:621`, ileti türleri `dm_msg`, `party_invite`, `social_invite`).

**Sahte sosyal arayüz · ŞART (karar).** Çıkışta ya gerçek ya yok. Çalışmayan Parti sekmesi ve "Yerel" çipi ücretli oyun hissini bozar. Sunucu bağlanmadan çıkılacaksa sohbet kutusu yalnız NPC konuşma günlüğü olarak adlandırılsın ("Meydan"), Parti sekmesi kalksın. Küçük. `index.html`, `game.js`.

**Oyuncu adı · YOK.** Ad sabit "Terbiyeci" (`game.js:42`, `oyun.js:76`).
- KARAR: **şart.** Yeni ocak kurarken ad sorulur (uzunluk ve karakter sınırı, küfür süzgecinden geçer). İsim plakası K5'e uygun kalır (seviye yok).
- İş: küçük (yerel), orta (sunucuda tekillik).

**Sohbet süzgeci, hız sınırı, ad doğrulama · YOK.** Sunucu sohbeti metni yalnız 120 karaktere kesiyor; süzgeç ve sohbete özel hız sınırı görünmüyor; gönderen adı istemciden alınıyor (`server.js:622-623` `msg.handle || socket.playerInfo.handle`), yani başkasının adıyla yazılabilir.
- Referans: FF14'te küfür süzgeci ayarı, kara liste ve oyun içi şikâyet var. MapleStory'de sohbet süzgeci var (ayrıntısı doğrulanmadı).
- KARAR: **şart**, sohbet açılacaksa: sunucuda Türkçe küfür listesi, saniyede ileti sınırı, adın oturumdan alınması. Ad sahteciliği hile koruması değil, taciz önlemi sayılmalı.
- İş: orta. `server.js`.

**Engelle ve şikâyet · YOK.**
- KARAR: **şart**, sohbet açılacaksa. Engelle (istemcide liste, sunucuda özel mesaj reddi), Şikâyet (sunucuya kayıt: kim, ne, son 10 ileti). Yaş ve yasal yükümlülük nedeniyle sohbetli çıkışın asgarisi.
- İş: orta.

**Arkadaş listesi · KISMEN (sunucu).** Liste istemciden gönderiliyor (`pvp_rooms.js:464`), sunucuda saklanmıyor.
- KARAR: **iyi olur**: sunucuda saklanan liste, çevrimiçi göstergesi, odaya davet. PvP odaları açılacaksa şart sayılır.
- İş: orta.

**Fısıltı · KISMEN (sunucu `dm_msg`).** KARAR: **iyi olur**, arkadaş listesiyle birlikte.

**Parti · KISMEN (yalnız istemci, PROJE_HARITASI §7).** KARAR: **çıkış sonrası**, zindanlarla birlikte. O güne kadar Parti sekmesi kalkar.

**Lonca · YOK.** K6: ilk sürümde yok. KARAR: **yapma** (K6 ile uyumlu).

**Profil inceleme · YOK.**
- Referans: FF14'te "Examine" ile başka oyuncunun kuşamı ve bilgisi görülür.
- KARAR: **iyi olur**, canlı oda açıldığında: oyuncuya dokun → kart (ad, unvan/Kudret, yıldız ejderha, kuşam). Gösteriş, ejderha oyununun sosyal yakıtıdır.
- İş: orta.

**İfadeler · VAR.** Altı jest, 1–6 tuşları (`index.html:84-87`, `game.js:71`). Oturma jesti çizim bekliyor (hafıza notu). İş yok.

---

## 7. Çok oyunculu altyapı

2.0'da çok oyunculu yok (PROJE_HARITASI §7). Sunucu tarafı hazır parçalar: oda, kuyruk, hazır denetimi, yeniden bağlanma süresi, rövanş, bot (`server/pvp_rooms.js`).

**Eşleştirme · sunucuda VAR** (`pvp_queue_join`, `pvp_queue_ready`). 2.0 arayüzü yok. KARAR: PvP çıkış kapsamındaysa **şart**: oda listesi + hızlı eşleşme + hazır onayı (onaylı PvP oda mockup'ı temel). Büyük.
- Referans: FF14 Duty Finder eşleşince hazır onayı ister; onaylamayan kuyruktan düşer.

**Yeniden bağlanma · sunucuda VAR** (`pvp_rooms.js:505-514`, `pvp_resume_ack`). 2.0'da karşılığı yok. KARAR: PvP ile birlikte **şart**: "Rakip koptu, bekleniyor (sn)" ve düşen oyuncuya "Maça dön".

**AFK / terk cezası · KISMEN.** Terk hükmen yenilgi sayılıyor (`pvp_rooms.js:156`, `duel_service.js:143-151`). Bekleme cezası yok.
- Referans: FF14'te görevden ayrılan oyuncu 30 dakika eşleşme kuyruğuna giremez.
- KARAR: **çıkış sonrası.** Ödül yokken (onaylı: önce 1v1, ödül yok) hükmen yenilgi yeter. Sıra süresi dolunca otomatik pas ise **şart** (karşı taraf kilitlenmesin).

**Gecikme göstergesi · YOK.** Sunucuda `ping/pong` var (`server.js:663-665`).
- KARAR: **şart**, PvP ile birlikte: maç ekranında üç kademeli bağlantı simgesi. Küçük.

**Hile / suistimal sınırları · NOT.** Kullanıcı şimdilik hile koruması istemiyor; tavan ve kısıt eklenmeyecek. Yalnız kayıt: dostça düello altını yerelde yazılıyor (`js/net.js` `finishMpFight`, PROJE_HARITASI §7), tek oyunculu kayıt tarayıcıda düzenlenebilir. Oyuncular arası pazar açıldığı gün bu ikisi ekonomi sorunu olur; karar o gün yeniden sorulmalı.

---

## 8. İlerleme ve kalıcılık

**Hedefler · VAR.** `activeGoals` (HUD ve defter), yıldız kariyeri (`defter.js:15-18`).

**Günlük / haftalık hedef · YOK.**
- Referans: FF14 "Challenge Log" haftalık küçük hedefler verir; günlük rulet ödülü var.
- KARAR: **yapma** (şimdilik). Oyunun saati gerçek zaman değil, "Haftayı Bitir" (K3). Gerçek zamana bağlı günlük ödül K3'ün zaman modeliyle ve "yeni mekanik icat etme" kuralıyla çelişir; yeni ödül kaynağı da ister. 01 Game Design'ın ayrı kararı.

**Başarımlar · YOK** (albüm ve "ilk keşifler" var: `defter.js:22`, `kutuk.js`).
- Referans: FF14 ve Genshin'de başarım defteri var; Genshin'de küçük ödül verir.
- KARAR: **iyi olur**, ödülsüz: mevcut sayılardan (`S.st`: zafer, yakalama, çatlayan yumurta) türeyen mühürler. Ödül eklemek kural değişikliğidir; ödülsüz hâli değildir.
- İş: orta. `defter.js`.

**Koleksiyon / defter · VAR.** Albüm, günce, sayılar, Soy Kütüğü. Eksik: element × evre × desen için "gördüklerim" ızgarası. KARAR: **iyi olur.** Orta. `kutuk.js`.

**Sezon sonu ve yeni sezon · VAR.** `son.js`, varis seçimi, `S.seasonNo`. Denetlenmeli: yeni sezona neyin taşındığı oyuncuya sezon bitmeden söyleniyor mu (doğrulanmadı). KARAR: **iyi olur**: 18. haftada "sezon bitince ne kalır" bilgisi.

**Uzun vadeli hedef · KISMEN.** Kızıl Taç tek sezonun hedefi; sonrası Ün Tablosu, Gök Kulesi, yadigâr. Topçu ve zindanlar (ekonominin çekirdeği) 2.0'da kurulmadı (README). KARAR: içerik işi; bu belgenin kapsamı dışında, yalnız not.

**Oyuncu seviyesi · YOK.** K5: yok. **Yapma.**

---

## 9. Ekonomi

**İki ekonomi · AÇIK (bilinen).** Haftalık döngü yerel `S`; sunucu ekonomisi 2.0'a bağlı değil (PROJE_HARITASI §8). Oyuncular arası pazar açılmadan önce tek otorite **şart**; bu belge yeni bir şey eklemiyor.

**Para çıkışları · KISMEN.** Tek oyunculu çıkışlar var: yapı, yem, kuşam, süs, müzayede %10 komisyon (`muzayede.js:38`). Oyuncular arası pazarda kesinti 0 ve bilerek kilitli: `MARKET_FEE_BPS !== 0` açılışta reddediliyor, "D7 onay bekliyor" (`server/market_service.js:12-14`).
- Referans: FF14 pazar tahtasında satıştan vergi kesilir; onarım, ışınlanma ve konut büyük çıkışlardır. MapleStory'de güçlendirme denemeleri ana çıkıştır (oranlar doğrulanmadı).
- KARAR: **çıkıştan önce karar şart, uygulama onaydan sonra.** Kesintisiz oyuncu pazarı enflasyon üretir. ÇELİŞKİ: fiyat, ödül ve oran değiştirmek yasak; D7 kullanıcı onayı bekliyor. Öneri kararın yerine geçmez.

**Enflasyon izleme · YOK.** KARAR: **iyi olur**, pazar açılınca: sunucuda günlük toplam altın, üretilen ve yakılan altın kaydı (yalnız ölçüm, kısıt değil; hile koruması değildir).

**Takas güvenliği · denetlenmedi.** `server/trade_service.js` ve testleri var; iki taraflı onay akışını bu turda okumadım. 2.0'da takas arayüzü yok.
- Referans: FF14 takas penceresinde iki taraf da içeriği görüp ayrı ayrı onaylar; içerik değişince onay düşer.
- KARAR: takas açılacaksa **şart**: iki taraflı onay, değişiklikte onayın sıfırlanması, son özet ekranı.

**Posta / teslimat · YOK.**
- Referans: FF14'te Moogle postası; Genshin'de ödül ve telafi posta kutusuna gelir.
- KARAR: **iyi olur**, sunucu bağlanınca: çevrimdışıyken satılan malın altını, müzayede sonucu ve bakım telafisi için sunucu posta kutusu. Oyuncudan oyuncuya posta **çıkış sonrası**.
- İş: büyük.

**Elmas / ücretli para · YOK.** K4: karar verilmeden HUD'a girmez. **Yapma** (karar bekliyor).

---

## 10. Ürün

**Favicon · YOK.** `eo2/index.html:9` boş veri adresi. KARAR: **şart.** Küçük.

**Sayfa adı · ÇELİŞKİ.** `<title>Ejder Ocağı</title>` (`index.html:7`); K14 oyuncuya görünen adı "Ejder Ocağı 2" diyor. Eski sayfa "Ejder Ocağı Online" kullanıyor (`index.html` kök, satır 4-11). KARAR: **şart**: tek ad seç (kullanıcı), her yerde aynı.

**SEO ve paylaşım kartı · 2.0'da YOK, eski sayfada VAR.** Kök `index.html:3-12` açıklama, `og:*`, `twitter:card` taşıyor; `eo2/index.html` taşımıyor. Sunucuda ejderha paylaşım kartı var (`server.js:1270-1279`).
- KARAR: **şart.** Açıklama, og:title, og:image (1200×630 anahtar görsel), theme-color. Küçük + bir görsel.

**Sürüm numarası · YOK.** `package.json` 23.0.0; oyunda görünmüyor. KARAR: **şart**: menünün altında sürüm ve derleme tarihi (hata bildiriminin ön şartı). Küçük.

**Künye / emeği geçenler · YOK.** KARAR: **şart**: menüde "Künye". Yapay zekâ ile üretilen görsel ve kullanılan araçların beyanı da burada durur (mağaza ve platform kuralları bunu isteyebilir; doğrulanmadı). Küçük.

**Gizlilik, çerez, kullanım koşulları · YOK.**
- Neden: misafir oturumu, sohbet ve X ile giriş kişisel veri işler; Türkiye'de KVKK aydınlatma metni gerekir. Google Fonts doğrudan Google'dan çekiliyor (`index.html:10-12`): oyuncunun IP adresi üçüncü tarafa gider ve açılışı o sunucuya bağlar.
- KARAR: **şart.** Gizlilik ve koşullar sayfası (iki bağlantı: giriş ekranı ve menü); yazı tiplerini kendi sunucudan ver (K17 ile de uyumlu: dış bağlantı yok). Yalnız zorunlu yerel depolama kullanılıyorsa çerez bandı gerekmez; analitik eklenirse gerekir. Hukuki metin için uzman görüşü alınmalı.
- İş: küçük (yazı tipi), orta (metinler).

**Yaş · YOK.** KARAR: **şart**, sohbet açılacaksa: koşullarda asgari yaş beyanı. Yaş kapısı ekranı **yapma** (sohbetsiz çıkışta gereksiz).

**Hata bildirme · YOK.** KARAR: **şart.** Menüde "Sorun bildir": sürüm, tarayıcı, ekran boyu, son hata iletileri panoya kopyalanır ya da kendi sunucuya gönderilir. Küçük.

**Analitik / çökme kaydı · YOK.**
- KARAR: **şart**, en sade hâliyle ve kendi sunucuya: yakalanan hatalar ve birkaç huni olayı (yükleme bitti, ilk hafta bitti, ilk dövüş). Üçüncü taraf analitik **yapma** (K17 ve gizlilik). Çıkıştan sonra nerede oyuncu kaybedildiğini bilmeden cila yapılamaz.
- İş: orta. `server.js` (tek uç), `oyun.js`.

**PWA / ana ekrana ekle · YOK** (manifest ve service worker yok).
- KARAR: manifest ve simgeler **iyi olur** (iOS'ta tam ekranın tek yolu); service worker ile çevrimdışı önbellek **çıkış sonrası** (yanlış önbellek, güncellemeyi oyuncuya ulaştırmama riski taşır).
- İş: küçük (manifest).

**Çevrimdışı davranış · KISMEN.** Tek oyunculu döngü yerel çalışır; yazı tipleri ve ilk yük ağ ister. Sunucu bağlanınca §5'teki bant gerekir.

**Yayın yolu · AÇIK.** Üretim sunucusu `eo2/` klasörünü sunmuyor (`server/public_files.js` izin listesi; README "bağlama F2/F3 işidir"), K13 `?ui=2` bayrağı diyor. Geliştirme sunucusu her şeyi `no-store` veriyor (`eo2/tools/serve.mjs`). KARAR: **şart**; aşağıdaki performans maddesiyle tek iş.

---

## 11. Performans

**İlk yük · SORUNLU.**
- 45 betik `eo2/js` + 31 eski kural dosyası `document.write` ile (`index.html:119-164`), 8 stil dosyası (`cam.css` tek başına 253 KB), beş Google yazı ailesi.
- Açılışta beş kişi sayfasının hepsi iniyor (`game.js:26`; toplam yaklaşık 6,5 MB), oysa oyuncu tek set giyiyor.
- Dünya çizimleri betik yüklenirken topluca isteniyor: `doku.js:59` (bütün `OLCU` listesi), `meydan25.js:16`, `ocak25.js:29-30`, `yaris25.js:20`. `assets/dunya` 433 dosya, 41 MB.
- Üretim sunucusunda sıkıştırma yok (`server.js` içinde gzip ya da brotli geçmiyor); ETag ve Cache-Control var (`server.js:1323-1346`).
- Referans: MapleStory benzeri oyunlar haritayı girilince yükler; Genshin bölge verisini girişte parça parça indirir.
- KARAR: **şart.**
  1. Betik ve stilleri tek pakete topla, küçült, sürüm damgalı adla sun (uzun önbellek).
  2. Sıkıştırma (brotli ya da gzip) aç.
  3. Açılışta yalnız giriş ekranı + ilk sahne + giyilen set; Ocak, yarış, öteki bölümler ilk girişte yüklensin (iris geçişinin arkasında).
  4. Küçük dünya parçalarını bölüm başına tek atlasa topla (istek sayısını onlara indirir).
- İş: büyük. Yeni derleme betiği `eo2/tools/`, `index.html`, `game.js`, `doku.js`, `meydan25.js`, `ocak25.js`, `yaris25.js`, `server/public_files.js`, `server.js`. Kişi atlasına dokunulmaz (chibi ajanının işi); yalnız hangi setin ne zaman indiği değişir.

**Tembel yükleme · YOK** (yukarıdaki 3. adım).

**Önbellek · KISMEN.** Üretimde ETag var; 2.0 dosyaları o yoldan sunulmuyor. Paketlemeyle çözülür.

**Düşük donanım kipi · YOK.** Çözünürlük çarpanı sabit 2, kare sınırı yok, kare hızına göre kendiliğinden düşürme yok. Ölçüm yalnız RTX 4060 Ti'de yapılmış; gerçek telefon denenmemiş (README "Yapılmadı").
- KARAR: **şart.** Ayarlardaki üç kademe + kare hızı 40'ın altına düşerse kendiliğinden bir kademe indirme. Çıkıştan önce en az bir orta sınıf Android ve bir iPhone'da ölçüm.
- İş: orta + ölçüm.

**Telefon ısınması ve pil · RİSK.** `powerPreference: 'high-performance'` (`gl.js:183`), sürekli 60 kare, cam arayüzde yoğun `backdrop-filter`. Ekran (tam ekran pencere) açıkken arkadaki dünya çizilmeye devam ediyor mu, doğrulanmadı.
- KARAR: **şart**: tam ekran pencere açıkken dünya çizimini durdur; telefonda varsayılan "Dengeli". **İyi olur**: Pil kipinde bulanıklığı düz yarı saydam zemine çevir.
- İş: orta. `game.js`, `oyun.js`, `cila_mobil.css`.

---

## 12. Ses

**Müzik · YOK.** 2.0 sesi tamamen kodla üretiliyor (`audio.js`): çeşme, hava, ateş, kuş, adım, arayüz, Ozan'ın sazı. Eski oyunun `BGM` ve `FX` nesneleri boş vekile çevrilmiş (`shim.js:13-14`); eski müzikler çalmıyor.
- Neden: sahne ekranları (Ahır, Arena, gece, doğum) sessiz ya da yalnız "bip" ile geçiyor; 30 dolarlık his için en ucuz ve en büyük eksik.
- Referans: Genshin ve FF14'te her bölgenin ve her dövüş türünün kendi müziği vardır.
- KARAR: **şart.** Asgari: meydan, iç mekân, arena dövüşü, gece/hafta sonu, zafer için beş parça; sahneye göre yumuşak geçiş. Kaynak (eski oyunun `sfx/` klasörü, yeni beste, üretim aracı) kullanıcı kararı.
- İş: büyük (içerik), orta (kod). `audio.js`, `shim.js` (BGM vekili).

**Ortam · VAR.** Sahneye göre (`audio.js` `scene`), çeşmeye uzaklıkla.

**Arayüz sesleri · KISMEN.** Üç dört sentez sesi her şeye yetiyor (`oyun.js:24`: çoğu olay `chime` ya da `ui`). KARAR: **iyi olur**: altın, hata, onay, sayfa, kilit için ayrı sesler.

**Kanal yönetimi · YOK.** Tek ana kazanç (`audio.js:43`). Ayarlar maddesiyle birlikte yapılır.

**Sekme arka plandayken susma · YOK.** `visibilitychange` yok; `setInterval` ile çalan saz, kuş ve ateş arka planda sürüyor (`audio.js:47`).
- Referans: FF14'te "pencere etkin değilken sesi çal" ayrı ayardır.
- KARAR: **şart.** Sekme gizlenince ana kazancı kıs ve `AudioContext`'i askıya al; dönünce aç. Aynı olayda kaydı yaz.
- İş: küçük. `audio.js`, `game.js`.

---

## 13. Cila

**Geçiş animasyonları · VAR.** İris, başlık kartı, pencere ve sahne geçişleri (`game.js:430`, `cam.css`).

**İmleç · YOK.** Varsayılan sistem imleci. Referans: MapleStory ve Genshin kendi imlecini kullanır. KARAR: **iyi olur.** Küçük + bir çizim (Midjourney, arayüz ailesinden).

**Odak halkası · VAR** (`ui2.css:21`). İş yok.

**Klavye ile gezinme · KISMEN.** Pencere açılınca ilk düğme odaklanıyor (`oyun.js:33`); Esc ekranı kapatıyor (`oyun.js:69`) ama pencereyi (`G.pen`) kapatmıyor; odak pencere dışına Tab ile kaçabiliyor.
- KARAR: **iyi olur.** Esc = "Vazgeç" düğmesi; odak tuzağı. Küçük. `oyun.js`.

**Sağ tık / uzun basma · YOK** (`contextmenu` dinleyicisi yok).
- Neden: telefonda ejderha resmine uzun basınca tarayıcının "Resmi kaydet" menüsü açılır; masaüstünde sağ tık tarayıcı menüsünü açar.
- KARAR: **şart**: oyun alanında tarayıcı menüsünü kapat, resimlerde `-webkit-touch-callout: none` ve sürüklemeyi kapat. Sağ tık ya da uzun basmayla bilgi kartı **iyi olur**.
- İş: küçük. `game.js`, `cam.css`.

**Kaydırma davranışı · VAR.** `overscroll-behavior: contain` (`cam.css:61`), `touch-action` ayarlı. Denetlenecek: iOS'ta sayfanın lastik gibi çekilmesi (gerçek cihazda doğrulanmadı).

**Metin taşmaları · KISMEN.** Bazı yerlerde üç nokta ve satır sınırı var (`cam.css:57`, `:1054`, `cila_mobil.css`). 16 karakterlik ejderha adı ve uzun olay başlıkları için sistemli denetim yok.
- KARAR: **şart**: en uzun ad ve en uzun başlıkla bütün ekranların ekran görüntüsü denetimi (`check_oyun.mjs` ile). Orta.

**Tutarlı simge ailesi · KISMEN.** `icons.js` yer tutucu SVG (README), yanında Midjourney madalyonları (`assets/ik/mdl-*`), eski oyundan `ic-*.webp`. Üç aile bir arada.
- KARAR: **şart**: HUD ve eylem çubuğu tek aileden (madalyon tarifi hazır); `icons.js` yalnız küçük işaretlerde kalsın. Orta + çizim.

**Geliştirici kalıntıları · KISMEN.** Geliştirici menü maddeleri gizli (`cila.css:19-24`), iyi. Ama "Kamera" ve "Işık" maddeleri ile `C`, `L` tuşları oyuncuya açık (`defter.js:47`, `game.js:70`).
- ÇELİŞKİ: K23 tek kamera diyor; iki açılı kamera düğmesi oyuncuya açık. KARAR: **şart**: kamera seçeneğini oyuncudan gizle (K23'e uy). Işık (gündüz/akşam) K1'de ikinci ışık durumu; oyuncu düğmesi olarak kalıp kalmayacağı kullanıcı kararı.
- "Üretim" düğmesi Pazar'ı açıyor (`oyun.js:149`; KARARLAR.md'de kayıtlı). KARAR: **şart**: Kor Örsü kurulana kadar düğmeyi kaldır ya da "Demirci" diye adlandır.
- HUD'daki "Dikey dilim · yerel, sunucusuz" notu gizli (`cam.css:24`); HTML'den de silinmeli. Küçük.

---

## Onaylı kararlarla çelişen ya da karar bekleyen öneriler (toplu)
- **K17 ve açık soru:** sunucu yedeği, hata günlüğü ve sosyal özellikler oyunun kendi sunucusunu ister. Dış servis önerilmiyor.
- **K14:** sayfa adı uymuyor.
- **K23:** kamera düğmesi ve `C` tuşu açık.
- **K3 ve "yeni mekanik yok":** günlük/haftalık gerçek zamanlı hedef önerilmedi ("yapma").
- **K6, K5, K4:** lonca, seviye, elmas önerilmedi.
- **Fiyat/oran yasağı ve D7:** pazar kesintisi yalnız karar gündemine alındı.
- **Hile koruması istenmiyor:** hiçbir tavan ya da kısıt önerilmedi. Sohbette ad sahteciliğinin kapatılması taciz önlemi olarak ayrı tutuldu; kullanıcı bunu da hile koruması sayarsa ertelenir.
- **`js/core.js` ortak kural dosyası:** yedek anahtarın düzeltilmesi o dosyaya dokunur; ayrı onay ister.

## Bu turda yapılmayanlar
- Oyun çalıştırılmadı, test koşulmadı, gerçek telefonda denenmedi.
- Referans oyun bilgileri internetten doğrulanmadı.
- `server/trade_service.js` onay akışı, `son.js` sezon devri ve çiftleştirme/salma onayları satır satır okunmadı.
- "500+ istek" sayısı görev tanımından alındı; kodda nedenleri bulundu, tarayıcıda yeniden sayılmadı.
