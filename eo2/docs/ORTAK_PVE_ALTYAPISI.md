# Ortak PvE altyapısı (2026-11-16)

Durum: **altyapı kuruldu, oynanış bağlanmadı.** Zindan, kervan ve boss'un ortak oynanışını uygulayan sistem bu belgedeki
arayüzü kullanır. Kullanıcı kararı: altyapı kurulsun, uygulama beklesin (başka sistemler üzerinde çalışılıyor).

## Ne var

| Parça | Dosya | İş |
|---|---|---|
| Örnek odaları, görev bulucu kuyruğu, ortak durum | `server/ortak_odalar.js` | oda kur, kodla katıl, davet, hazır, başlat, kuyruk, eylem, kopma, bitiş |
| Sunucu bağlantısı | `server.js` (`ORTAK`) | canlı kanal mesajları, kopma ve bağlanma, 15 saniyede bir süpürme |
| İstemci ucu | `eo2/js/ortak.js` (`EO2.ortak`) | mesaj gönderme, durum tutma, olay dinleme; ekran yok |
| Testler | `tests/ortak_odalar.test.js` | oda akışı, kuyruk, davet, kopma, kuruculuk devri |

Bellekte durur, tek sunucu örneği varsayar (Topçu PvP odalarıyla aynı kısıt). Ekonomiye dokunmaz.

## Bir tür nasıl eklenir

Sunucuda, `server.js` içinde `ORTAK` kurulduktan sonra:

```js
ORTAK.kaydet('zindan', {
  enAz: 1, enCok: 4,
  anahtarGecerli: k => ['sirca', 'volkanik', 'batik'].includes(k),
  baslat(oda, tohum) { return { asama: 0, can: 1200, enCan: 1200 }; },      // ortak durum: sunucuda durur
  eylem(durum, uye, eylem, oda) {                                           // oyuncunun eylemi: DOĞRULAMA BURADA
    // eylemi sına, durumu yerinde değiştir
    return { olaylar: [{ t: 'vurdu', kim: uye.id, hasar: 40 }], bitti: durum.can <= 0 ? { kazanan: true } : null };
  },
  bitir(oda, sonuc, durum) { /* ödülü sunucu komutlarıyla yaz: istemci beyanına güvenme */ },
});
```

- `eylem` hata fırlatırsa (`Object.assign(new Error('x'), { kod: 'eylem_gecersiz' })`) yalnız gönderene `ortak_hata` gider.
- `bitir` örnek başına bir kez çağrılır. Ödül burada yazılır; ekonomi kuralı (`server/economy_sources.js`) değişmez.
- Tür kaydedilmeden `ortak_kur` isteği `tur_bilinmiyor` döner; bugün kayıtlı tür yoktur.

## Mesajlar

İstemci → sunucu: `ortak_kur { tur, anahtar, ozel, ad }`, `ortak_katil { kod, ad }`, `ortak_cik`, `ortak_hazir { hazir }`,
`ortak_baslat`, `ortak_davet { to: hesap adı }`, `ortak_kuyruk { tur, anahtar, ad }`, `ortak_kuyruk_cik`,
`ortak_eylem { eylem }`, `ortak_durum`.

Sunucu → istemci: `ortak_oda { oda, sen }`, `ortak_ayrildi { neden }`, `ortak_basladi { oda, durum, tohum }`,
`ortak_olay { olaylar, durum, kim }`, `ortak_bitti { sonuc, oda }`, `ortak_kuyruk { durum }`,
`ortak_davet { kod, tur, anahtar, from, ad }`, `ortak_hata { kod }`.

Hata kodları: `tur_bilinmiyor`, `anahtar_gecersiz`, `zaten_odada`, `oda_yok`, `oda_mesgul`, `oda_dolu`, `odada_degil`,
`yalniz_kurucu`, `oyuncu_eksik`, `hazir_degil`, `cevrimdisi`, `oyunda_degil`, `komut_bilinmiyor`, türün kendi kodları.

## Kurallar

- **Özel oda ve eşleşme birlikte:** `ortak_kur` özel oda açar (kodla ya da davetle girilir); `ortak_kuyruk` görev bulucudur.
  Kuyruk, türün `enCok` sayısı dolunca ya da en az iki kişi yirmi saniye bekleyince odayı açıp başlatır.
- **Kopma:** üye 45 saniye içinde dönerse (`ortak_durum`) kaldığı yerden sürer; dönmezse odadan düşer. Örnekte kalan oyuncu
  sayısı `enAz`'ın altına inerse örnek kaybedilmiş sayılır.
- **Hız:** soket başına saniyede on iki mesaj; aşan mesaj atılır.
- **Davet:** oyuncu kartına ve Dostlar ekranına bağlanmadı; tür uygulanınca `EO2.ortak.davet(hesapAdi)` ile bağlanır.

## İstemci

`EO2.ortak.kur / katil / cik / hazir / baslat / davet / kuyruk / kuyrukCik / eylem / dinle / durum`. Ayrıntı dosyanın başında.

## İlk kullanan tür: Kıraathane masası (2026-11-16)
`server/kiraathane_pvp.js` bu altyapının `kiraathane` türüdür (PvE değil, iki oyunculu masa) ve çalışan örnek olarak okunabilir. Onun için altyapıya eklenenler:
- `eylem` kancası Promise döndürebilir; oda başına eylemler sıraya girer, biri bitmeden öteki işlenmez.
- `tik(durum, oda)` kancası: süpürme turunda (15 sn) çağrılır; süreye bağlı işler (hamle süresi dolan oyuncu adına oynamak) burada yapılır.
- Oyuncu sayısı `enAz` altına düşünce `bitir` sonucu `ayrilan` alanını taşır.
- Örnek bitince herkesin hazır durumu sıfırlanır ve aynı odada yeniden hazır olunup başlatılabilir (rövanş).

## İlk PvE türü: zindan (Zümrüt Saray, 2026-11-16)
`server/zindan_ortak.js` + `eo2/js/zindan_ortak.js`. Anahtar `<zindan>-<zorluk>` (ör. `zumrut-normal`). Ortak durum: `{ zindan, zorluk, asama, n, faz: bekleme | savas | cark | bitti, tur, deneme, dusman: [{ hp, max, boss }], uye: { <hesap>: { hazir, hayatta, hasar, cark, hp, max } } }`.
Eylemler: `hazir`, `hasar { i, h }`, `can { hp, max }`, `dustu`, `cark`. Olaylar: `asama_basla`, `hasar`, `can`, `dustu`, `asama_bitti { zafer, son }`, `kampa_don`, `hazir`, `cark`.
Yeni zindan eklemek: sunucuda `ZINDANLAR` tablosuna aşamaların düşman canlarını, istemcide `ASAMA` tablosuna aynı sırayla çizim, arazi ve düşman türlerini yaz. Düşman sırası iki yanda aynı olmalıdır (önce sıradan düşmanlar, sonra boss).
Altyapıya eklenenler: üye ayrılınca ya da kopunca `tik` hemen çalışır (kalanlar boşuna beklemez); `odaKimligi(hesap)` (meydan varlığı `kamp` alanını odaya göre öbekler: her grubun kampı kendine özeldir).
