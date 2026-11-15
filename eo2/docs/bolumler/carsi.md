# Pazar (odalı çarşı) · bölüm tasarım notu

> Yazan: bölüm ajanı, 2026-11-12. Bölüm verisi: `eo2/js/bolumler/carsi.js` (kimlik `carsi`). Giriş: Merkez Meydan → tezgâhların önü ("Çarşıya gir").
> Anahtar kare (hedef görsel): `kaynak/kv_pazar_v1.png`. Eski Pazar sahnesi (`js/scenes2.js`, kimlik `pazar`) duruyor; eski meydandan hâlâ oraya gidilir.

## Kaynak fikir (kullanıcı, 2026-11-12)
"Şimdiki pazarı beğeniyorum ama içeriye birkaç oda daha ve içlerine demirci, yumurta satıcısı, baharatçı, ejderha satıcısı, bedesten, açık artırma evi vs. koyulabilir… oyuncular demircinin etrafında kümelenir diye düşünüyorum ama test etmeden bir şey diyemem."
Sonra: "Zaten bir taraf satıcı NPC'leri chibi asset olarak üretiyor."

## Tasarım kararı
- **Odalar ayrı sahne değil, tek salona açılan beş kemerli göz.** Ayrı sahne oyuncuları böler; açık gözlerde herkes birbirini görür. Hangi dükkânın önünün kalabalıklaşacağı gerçek oyuncuyla ölçülmeli (sunucu işi); yerleşim buna göre değişebilir.
- **Sıra (soldan sağa):** Demirci · Yumurtacı · Baharatçı · Ejder Satıcısı · Müzayede (Bedesten).
- **Satıcılar duvar çiziminde yok** (`pz-duvar-v2`). Oyunun kişi sistemiyle dükkânların önünde dururlar; chibi satıcı çizimleri gelince yerlerine oturur. İlk duvar çiziminde (`pz-duvar-v1`) satıcılar çizimin içindeydi; dosyası ve editör paletindeki yeri duruyor.
- **Yeni mekanik yok.** Demirci → Üretim ekranı; Ejder Satıcısı ve Müzayede → Pazar ekranı; Yumurtacı ve Baharatçı yalnız kayıtlı repliklerini söyler. Kişiler, portreler ve replikler eski sahnelerden aynen (Usta Kerim, Yumurtacı, Baharatçı, Tüccar, Rüstem Ağa, Hamal).

## Kamera
"Yakın" kip (kullanıcı, 2026-11-12); eski Pazar sahnesinin kamerasının bölüm motorundaki eşdeğeri. Ayrıntı `han-ici.md`.

## Nasıl kuruldu
- **Arka duvar:** tek geniş çizim (en 22 birim, yükseklik 6,6). Yanına kopyası dizilmez.
- **Yan duvarlar** (`pz-yan-duvar`: üç kör kemer, çömlek rafları, asılı halılar, halı ruloları, çuvallar, duvar fenerleri; kişisiz): arka duvarın iki ucundan kameraya doğru açılarak uzanır (sol (-8, 20) → (-12,5, 1,5); sağı aynası). Çarpışma: `engeller.cizgi`.
- **Tonoz** (`pz-tavan`: taş kemer kaburgaları, mavi-altın ve mor kumaşlar, flamalar, püsküller): üç sıra, y 17 / 12,8 / 8,6. Dünyaya bağlıdır; püsküller z 5'in üstünde.
- **Tonoz boşluğu** (`pz-bosluk`): arka duvarın ardında koyu düz yüzey. `indoor: true`, uzak pus kapalı.
- **Zemin:** desenli taş doku (`pz-zemin`, tepeden, 6 birimlik karolar); üstünde iki yuvarlak ejder arması (anahtar karedeki madalyonlar) ve girişte uzun kırmızı yolluk (`pz-hali`).
- **Asılı mozaik fenerler** (`pz-fener-0…3`): üç sıra, kemer sıralarının hemen önünde.
- **Öbekler:** yan duvarların dibinde sandık ve fıçılar; her dükkânın önünde işini anlatan küçük bir eşya (odun, çiçek kovası, devrilmiş sepet), sandıkların üstünde kedi, doğu ucunda tavla.
- **Işık:** sıcak ton ve kenar karartması katmanları; dükkân önlerinde ışık havuzları. İç mekânda zemine bağlama (`bagla`) kullanılmaz: dipte ot çıkıyordu.

## Doğrulama (2026-11-12, yakın kamera)
Görüntü: `carsi_tur2_yakin_kamera_2026-11-12.png`. Yan duvarlar oyuncuyu duvara yarım birim kala durduruyor. Çıkış Meydan'a dönüyor; üç dükkân etkileşimi sahneden çıkmadan tetikleniyor (açılan ekran görüntüyle denetlenmedi); Hamal yürüyor; konsol hatası yok.

## Eksikler
1. Satıcılar tezgâhın arkasında değil, önünde duruyor (dik çizimde arkasına kişi konamıyor).
2. Tonoz düz bir yüzey değil, üç kemer sırası; oyuncu arka duvara yaklaşınca ekranın üstünde koyu boşluk kalıyor.
3. Salon geniş ve ortası boş; müşteri kalabalığı yok (kişi çeşitliliği karakter hattını bekliyor).
4. Bedesten'in oyuncu ilanları ve müzayede aynı Pazar ekranına açılıyor; ayrı ekranlara bağlamak sistem ajanının işi.
5. İki yan duvar birbirinin aynası (aynı çömlekler, aynı halılar).
