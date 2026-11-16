# Ortak zindan yöntemi

Tarih: 2026-11-17. Kullanıcı talimatı: "çok oyunculu sistemi ve yeni zindanların nasıl yapılacağını bir kerede kur, sonra o yöntemle çalışalım."
Bu belge her yeni zindanda izlenecek tek yoldur. İlk örnek: Zümrüt Saray.

## Değişmeyen kurallar (her zindanda aynı)

1. **Tek arena, tek savaş.** Gruptaki herkes (1–4 kişi) aynı arenadadır. Sıra, rüzgâr, düşmanın yeri, hedefi ve hamlesi bütün ekranlarda aynıdır.
2. **Sıraya sunucu karar verir.** Her turda önce ayaktaki oyuncular sırayla oynar, sonra yaşayan düşmanlar sırayla saldırır. Sıra kimdeyse herkes onu izler.
3. **Kimse oturumdan düşürülmez.** Canı biten oyuncu arenada kalır ve savaşı izler; yalnız sırası atlanır. Aşama bitince ganimetten payını alır. Herkes düşerse grup kampa döner ve aynı aşamayı yeniden dener.
4. **Bossa laf atma yok.** Boss yalnız konuşur (giriş, faz geçişi, veda sözleri) ve saldırır. Saldırı öncesi çizgi roman paneli fikri açık (karar verilmedi, yapılmadı).
5. **Düşman canı sunucudadır**; bir oyuncunun hasarı herkesin ekranında düşer. Can = tarifteki can × zorluk × grup çarpanı (1 + 0,5 × (kişi − 1)).
6. **Ödül kuralları değişmez.** Aşama ödülü, çark ve zindan ödülü tek oyunculu seferin aynısıdır; tarif yalnız hangi seferin ödül tablosunun kullanılacağını söyler (`odul`).
7. Aşamalar arasında grup Sefer Kampı'nda toplanır; herkes "hazırım" deyince aşama başlar.

Örnek alınan oyunlar: sıra tabanlı topçu oyunları (GunBound, DDTank): tek oda, sıra göstergesi, rüzgâr herkese aynı, düşen oyuncu maç bitene dek odada izleyici.
Zindan akışı (grubun kendi kopyası, aşamalar arası toplanma alanı): FF14.

## Yeni zindan nasıl eklenir

**Kod yazılmaz.** Dört adım:

1. **Çizimler** (aşağıdaki teslim ölçülerine göre) `eo2/docs/bolumler/kaynak/<zindan>/` altına gelir.
2. **Sahne aracı** her aşama için tek bir geniş sahne resmi üretir (`eo2/assets/<zindan>/<asama>.webp`). Örnek: `eo2/tools/zumrut_sahne.mjs` (köprü: tek resmi uzatır; defile: modülleri dizer). Yeni zindan için bu araç kopyalanıp parça listesi değiştirilir.
3. **Tarif** `eo2/js/zindan_tarif.js` dosyasına eklenir: ad, tanıtım, aşamalar, her aşamanın sahnesi, zemini, düşmanları ve canları. Alanların açıklaması dosyanın başındadır. Sunucu da oyun da bu dosyayı okur; başka yerde değişiklik gerekmez.
4. **Denetim:** `node --test tests/zindan_tarif.test.js` (tarif eksiksiz mi), `node eo2/tools/check_zindan.mjs` (iki tarayıcıyla baştan sona sefer), `npm run duman`.

Yeni bir düşman ya da boss türü gerekiyorsa (yeni çizim, yeni hamle) o tür `eo2/js/topcu_veri.js` içindeki MOB / BOSS listesine eklenir; tarif onu adıyla çağırır. Yalnız çizimi değişen düşman, var olan türün kurallarını kopyalar (örnek: `zs_vurucu`, `sahmeran_v3`).

## Sanat teslim ölçüleri

Arena hep aynı boydadır: **3400 oyun pikseli genişlik** (ekrana bir seferde yaklaşık üçte biri sığar). Sahne aracı resmi bu genişliğe oturtur; çizimin kendi piksel boyu serbesttir.

**Sahne (arka plan)**
- Düz yandan görünüş; yürüme hattı dümdüz ve yatay. Basamak ya da yükselti varsa yeri ve yüksekliği tarifteki `zemin` noktalarıyla aynı olmalı.
- Ya tek parça geniş resim (kenarları tekrara uygun), ya da modüller: uç parçalar, tekrarlanan duvar bölmesi, yürüme hattının ön cephesi, dekorlar, varsa boss platformu, seyirciler.
- Her parça için söylenmesi gereken tek ölçü: **yürüme hattı parçanın neresinde** (alt kenar, üst kenar ya da pikselle).
- Yürüme hattının üstünde en az 7, altında en az 3 karakter boyu resim olmalı (ekran yüksekliği). Kalan boşluk tek renkle doldurulur (`sahne.ust`, `sahne.alt`).
- Boss, düşman ve oyuncu sahneye gömülmez. Seyirci gibi oynamayan figürler gömülebilir.
- Saydam parçalarda temiz kenar; renk anahtarından kalan saçak olmamalı.

**Düşman**
- Sola bakar, saydam zemin, alt kenar = yer. Tek duruş yeter; varsa saldırı ve vuruluş karesi ayrı dosya (aynı boy, aynı ayak noktası).

**Boss**
- Sola bakar. Kare sayfası: eşit hücreli ızgara ya da paketli atlas + JSON (her karenin yeri ve ayak noktası). Klipler: bekleme (döngü), saldırı (hazırlık, vuruş, toparlanma), vuruluş; varsa ölüm.
- Ayrıca söylenmeli: zayıf noktanın (taç, kalp…) ve merminin çıktığı yerin karedeki konumu.
- Yüz resmi (can çubuğunun yanındaki küçük portre) kareden kesilir; ayrı çizim gerekmez.

## Bilinen sınırlar (2026-11-17)

- Ödül, tek oyunculu seferdeki gibi oyuncunun kendi ekranında yazılır (sunucu yalnız "aşama temizlendi" der).
- Ortak oda servisi sunucunun belleğindedir: sunucu yeniden başlarsa süren seferler kapanır.
- Sefer Kampı tek ve her zindanda aynıdır (kapının adı "Zümrüt Kapı"). Zindana özel kamp gerekirse tarife `kamp` alanı eklenecek.
- Yoldaşın lav havuzu öteki ekranlarda görünmez.
- Zümrüt Saray'da uçan engereğin yeni çizimi yok (eski çizim duruyor); yılanların saldırı ve vuruluş karesi yok; Şahmeran'ın vuruluş ve ölüm klibi yok.
- Zümrüt Saray'ın köprüsü, defile salonu, seyircileri ve yılanları konsept çizimdir (geçici).
