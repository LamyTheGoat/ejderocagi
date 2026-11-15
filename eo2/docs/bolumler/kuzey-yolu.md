# Kuzey Yolu · bölüm tasarım notu

> Yazan: bölüm ajanı, 2026-11-12. Bölüm verisi: `eo2/js/bolumler/kuzey-yolu.js` (kimlik `kuzeyyolu`). Giriş: Merkez Meydan → Kuzey Kapısı ("Yola çık").
> Anahtar kare (hedef görsel, oyun görüntüsü değil): `kaynak/kv_kuzey_yolu_v1.png`. Kullanıcı talimatı: "Meydan bittikten sonra kuzey kapısının dışında kalan alan… hiçbir şey sticker gibi durmamalı."
> Eski Kuzey Yolu sahnesi (`js/scenes.js`, kimlik `yol`) duruyor; eski meydandan hâlâ oraya gidilir.

## Amaç
Kasabadan çıkışın ilk adımı: oyuncu burada sefere çıkar (var olan Sefer ekranı). Yer, "yola çıkma" hissini verir: arkada kasaba, önde köprü, ufukta tepeler ve şato.

## Akış (güneyden kuzeye)
| Durak | Yer | İçerik | Etkileşim |
|---|---|---|---|
| Yol ağzı | y 6–14, solda | Büyük ağaç, altında bank ve unutulmuş kitaplar, yön tabelası | Tabela → Sefer ekranı |
| Kervan kampı | y 21–31, sağda | İki çadır, üstü örtülü araba, kamp ateşi, sandık ve fıçılar, tavla sandığı, kedi | Kamp ve Kervancı → Sefer ekranı |
| Taş köprü | y 34–39 | Dört fenerli, sancaklı ayak; altından dere akar | Dere → bir satır yazı |
| Kuzey çayırı | y 40–57 | Çitli yol, çalılar; orman kenarı ve ufuk | — |

Yol alanın ekseni; eşya iki yanda öbeklenir. Kamp yola açıktır (çit kampın önünde biter).

## Nasıl kuruldu
- **Zemin:** çim dokusu (`ky-cim`, tepeden, 6 birimlik karolar) bütün alana; üstüne yol (`ky-yol`) uç uca; dere (`ky-dere`) yoldan önce serilir, yol üstünden geçer ve köprünün tabliyesi olur. Motorun tuğla döşemesi altta kalır.
- **Çit:** dik çizimle kuzey-güney çit kurulamıyor. Çit parçaları çapraz derinlikle sağa sola kırılarak kuzeye gider (yılankavi çit; `ky-cit-22`, çitin enine daraltılmış kopyası).
- **Kamera:** "yakın" kip (kullanıcı, 2026-11-12); ufuk ekranın üst üçte birinde, görüş geniş. Ayrıntı `han-ici.md`.
- **Ufuk:** `ky-ufuk` çok uzakta (y 260) ve çok büyük (en 820 birim) durur; boyanan çimden hemen önce çizilir. Şato ve gün batımı ekranın üst üçte birini doldurur. Uzak pus 0,86'dan 0,34'e indirildi (`light.fog`); eski değer ufku beyaza boğuyordu. Çayırın kuzey ucundaki ağaç sırası görüş genişliğine göre uzatıldı (12 → 28 ağaç).
- **Zemine bağlama:** bütün nesnelerde keskin gölge ve dipte çakıl, ot. Yer izleri: teker izleri, su birikintisi, dökülmüş yapraklar, kampta hasır.
- **Kişiler ve etkileşimler:** eski sahneden aynen (Kervancı, yolda devriye gezen Bekçi; tabela, kamp, dere, çıkış). Yeni mekanik yok.

## Çizimler (ChatGPT, alt ajanla; referans anahtar kare)
`ky-cim`, `ky-yol`, `ky-dere`, `ky-cit` (+ `ky-cit-22`), `ky-cadir`, `ky-araba`, `ky-ates`, `ky-kopru`, `ky-ufuk`. Ham dosyalar `kaynak/ky_*`. Dokuz istek, dokuz çıktı.
Meydan'dan ortak kullanılanlar: ağaçlar, çalılar, bank, yön tabelası, sancak, sandık ve fıçılar, hikâye eşyaları.

## Doğrulama (2026-11-12)
- Yakın kamerayla dört konumdan görüntü: `kuzey-yolu_tur2_yakin_kamera_2026-11-12.png` (ilk tur, 14 derece: `kuzey-yolu_tur1_gezinti_2026-11-12.png`). Konsol hatası yok.
- Çıkış Meydan'a dönüyor; kamp etkileşimi Sefer ekranını (Harita Odası) açıyor; Bekçi yürüyor.

## Anahtar kareyle kalan farklar
1. **Çit** anahtar karede yol boyunca düz; bizde yılankavi ve parçalar seyrek duruyor.
2. **Köprü** anahtar karede kemerli ve korkuluklu tek yapı; bizde dört ayak ve dere. Yol köprüde yükselmiyor (motor düz zemin biliyor).
3. **Yol** düz; anahtar karede kıvrılıyor.
4. **Ufuk** çözüldü (şato ve gün batımı okunuyor). Görsel 1,3 kat büyütülerek gösteriliyor; hafif yumuşak. Çok geniş ekranda (21:9 üstü) kenarı denenmedi.
5. **Kasaba tarafı** (oyuncunun arkası) çizilmedi; ekranın altından yalnız ağaç tepeleri giriyor.
6. **Kamp kalabalığı** yok: tek Kervancı. Kişi çeşitliliği karakter hattını bekliyor.
7. Çim karolarının ve yol parçalarının ek yerleri yakından bakınca seçilebilir; ölçülmedi.
