# Ejder Ocağı 2.0 · Onaylı kararlar

Kullanıcı 2026-11-10'da ön çalışmadaki önerilerin hepsini onayladı ("Önerileri onaylıyorum").
Ön çalışma: https://claude.ai/artifact/FCYziL6gnXAYQcMdu6DaXy
Bu belge dalda durur, henüz commit edilmedi. 00 Proje Merkezi'nin `DECISIONS.md` dosyasına işlenmedi.

| No | Konu | Karar |
|---|---|---|
| K1 | Işık ve ton | EO2 gündüz tonu ana ton. Gece ve kor ışığı ikinci ışık durumu: akşam meydanı, Han içi, zindanlar. Art Bible 2.0 eki 03'ten bekleniyor. |
| K2 | Mimari kimlik | Aynı parlak üslup, Anadolu mimarisi: kervansaray kapısı, han, kubbeli çarşı, kümbet, çini. Avrupa masal şatosu değil. |
| K3 | Zaman modeli | 2.0 arayüz aşamalarında 20 haftalık sezon ve "Haftayı Bitir" aynen kalır. Zaman modeli değişikliği 01 Game Design'ın ayrı kararı. |
| K4 | Para birimleri | HUD'da yalnız mevcut birimler. Elmas monetizasyon kararına bağlı; karar verilmeden HUD'a girmez. |
| K5 | Oyuncu seviyesi | Seviye sistemi yok. İsim plakasında Kudret ya da unvan. |
| K6 | Lonca | İlk sürümde yok; ayrı tasarım işi. |
| K7 | Setler ve yuvalar | Onaylı liste geçerli: Temel, Avcı, Muhafız, Madenci, Büyücü; 6 yuva + `neck`. Konsept panosu atmosfer referansı. |
| K8 | Başlık yazısı | Alegreya SC başlık, Alegreya Sans metin. |
| K9 | Platform | Tasarım 1920×1080'de yapılır, mobil eşit desteklenir. Dünya ve Topçu yatay; paneller iki yönde. |
| K10 | Kamera açısı | F1'de iki açı yan yana denenir; seçim kullanıcıda. (Dilimde `C` tuşu.) |
| K11 | Ocak'ın yeri | Ocak oyuncunun özel alanı; Ejder Bahçesi herkese açık bakım ve gösteri alanı. |
| K12 | Yol arkadaşı ejder | Seçili ejderha oyuncunun peşinden gelir; yürürken genç boyu sınırı, Bahçe'de gerçek boy. |
| K13 | Geçiş yolu | Aynı repo ve sunucu, `?ui=2` bayrağı. Yeni kod ayrı klasörde (`eo2/`). |
| K14 | Ad | Oyuncuya görünen ad "Ejder Ocağı 2", iç proje adı "2.0". |

## Değişmeyenler
- Mekanik, fiyat, ödül ve olasılık değerleri 2.0 arayüz işinde değişmez.
- `main`'e yazma, push, merge, deploy ayrı onay ister.
- Çalışma dalı: `ejder-ocagi-2.0` (kullanıcı talimatı, 2026-11-10).

## Onay bekleyen denemeler (2026-11-10, dilimde var)
| Deneme | Not |
|---|---|
| Claude'lu NPC sohbeti ve seslendirme | Yeni özellik fikri; içerik kuralı, maliyet ve oyuna girişi ayrı karar ister |
| Topçu gösterim düellosu | Can, hasar, rüzgâr, sıra süresi yalnız gösterim içindir; oyun dengesini bağlamaz, ödül yok |
| Canlı oda | Yayın sayfasının oda yeteneğiyle; oyun sunucusuna bağlı gerçek oda F4 işidir |
| Diğer alanlar (Han, Ejder Bahçesi, Kuzey Yolu) | Yerleşim, sanat ve NPC rolleri sanatsal özgürlükle kuruldu (kullanıcı izni, 2026-11-10). Bahçe ejderleri oyunun mevcut görselleri; Ayaz ve Tozan adları yer tutucu |
| Pazar ve Topçu Arenası avlusu | Aynı izinle kuruldu (2026-11-11). Rüstem Ağa çarşının içine alındı, meydan tezgâhına Baharatçı kondu; zindan kapılarının simgeleri (yılan, miğfer, dalga) yer tutucu |

## 2026-11-11 · kullanıcı talimatları (yeniden kurulum)
| No | Konu | Karar |
|---|---|---|
| K15 | Kapsam | 2.0 basit bir yama değil, gerçek bir oyun: eski sistemler 2.0 arayüzünde tek tek yeniden kurulur. |
| K16 | Görünüm | Camsı arayüz (saydam gövde, ince parlak kenar, köşede ışık kırılması, parlak düğmeler). Örnek alınan oyun Genshin Impact: yalnız arayüz değil, döngü ve kalite için de. Hedef: en az 30 dolarlık ücretli bir oyun hissi. |
| K17 | Bağlantılar | Claude cevapları ve dış API bağlantıları kaldırıldı. NPC'ler hazır repliklerle konuşur. |
| K18 | Kurallar | Mekanik, fiyat, ödül ve olasılık değişmez: 2.0, oyunun kendi mantık dosyalarını yükler; kayıtlar ortaktır. |

Açık soru: "bütün API bağlantıları" ifadesi oyunun kendi sunucusunu (ekonomi senkronu, sosyal, PvP) da kapsıyor mu? Şimdilik yalnız Claude ve yayın sayfası yetenekleri kaldırıldı; oyun sunucusu sosyal özellikler için sırada tutuluyor.

## 2026-11-11 gecesi · kullanıcı talimatları (sahne ve çizim)
| No | Konu | Karar |
|---|---|---|
| K19 | Sahne önce | Maviye boyanmış panel ve tablo yok. Her ekran gerçek bir sahne deneyimidir; Genshin işçiliği, referans görseller ayarında. |
| K20 | Sadelik | Yapay zekâ kokan arayüz yok: doğal, profesyonel, sanat tasarımına uygun. Neon ve nabız atan ışıltılar kaldırıldı; ana düğmeler mat parşömen. |
| K21 | 2.5D | 2.5D perspektif her yerde sonuna kadar kullanılır. Ocak ve yarış 2.5D sahne olarak yeniden kuruldu. Açıya uygun çizimi ürettirmek de mühendisliğin işidir. |
| K22 | Çizim üretimi | Midjourney ile çalışılır. ChatGPT'de şimdilik yeni görsel üretilmez; var olan görseller yalnız referanstır. |
| K23 | Tek kamera açısı | Dünyada tek kamera açısı kullanılır: master referanstan ölçülen yaklaşık 14 derece eğim (kullanıcı, 2026-11-11 gece: "tek bir kamera açısı kullanalım 14 derece"). Bütün dünya çizimleri bu açıya göre çizilir. K10'daki "iki açı yan yana denenir" maddesini kapatır. Ölçünün ayrıntısı `docs/BOLUM_SOZLESMESI.md`. **Kapsam (kullanıcı, 2026-11-12):** gezilen Han içi, Pazar içi ve Ejder Bahçesi şimdilik eski düz kamerayla kalır ("şimdilik eski kamera iyi"). Master kamerası onlarda denendi: tavan ve asılı fenerler kadraj dışına çıkıyor, Bahçe'de gökyüzü kayboluyor (`docs/kamera_ic_mekan_kiyas_2026-11-12.png`). |

## Onay bekleyen çelişkiler (2026-11-11)
| Konu | Mevcut karar | Yapılan | Öneri |
|---|---|---|---|
| Arayüz yazısı | K8: Alegreya SC başlık, Alegreya Sans metin | Ana referans görseline uyması için arayüz Noto Sans; Alegreya yalnız kâğıt yüzeylerde (defter, kütük, ferman) | Ya K8 güncellenir ya arayüz Alegreya'ya döner |
| Ocak yapıları | K2: Anadolu mimarisi, Avrupa masal şatosu değil | İlk üretilen Ocak yapılarının bir kısmı Avrupa köyü gibi okunuyordu; ev, ocak kulesi, kiler ve laboratuvar Anadolu üslubuyla yeniden çizdirildi | Kalan yapılar (şifahane çadırı, yuva, kaynak, in) üslupça nötr; istenirse onlar da yenilenir |
| Meydan ve diğer alanlar | Yerleşim onaylı (K2, K10–K12); yapı ve arazi çizimi yer tutucu | Gece denenen boyalı çizimler kullanıcı tarafından reddedildi (2026-11-11). Yerine: çizgi dünyanın geometrisine oturan anime dokular (`docs/CIZIM_DUNYASI.md`); Meydan, Bahçe, Yol ve Ocak kuruldu, iç mekân duvarları ve yarış dekoru bekliyor | Kullanıcı yönü verdi; son görünüş onayı bekliyor |
| Mimari üslup (K2) | K2: mimari Anadolu olmalı | Kullanıcı 2026-11-11'de Pilot Meydan için "Türk-Avrupa karması bir stil" dedi; karma han bu dille çizildi (`docs/CIZIM_DUNYASI.md`) | K2'nin metni güncellenmedi; kullanıcı onayıyla işlenecek |
| "Üretim" düğmesi | Ayrı üretim ekranı | Pazar'ı (demirci) açıyor | Kor Örsü kurulunca oraya bağlanır |
| Çizim üreticisi (K22) | K22: Midjourney ile çalışılır, ChatGPT'de yeni görsel üretilmez | Kullanıcı 2026-11-12'de bölüm sayfalarının ChatGPT'den istenmesine izin verdi; Merkez Meydan'ın yeni han, kapı, sur ve dekor çizimleri oradan geldi (bölüm ajanının bildirimi). Arayüz simgeleri ve kişiler Midjourney'de kalıyor | K22'nin metni güncellenmedi; kullanıcı onayıyla "dünya çizimleri ChatGPT, arayüz ve kişiler Midjourney" diye işlenir |
| Bölüm kameraları (K23) | K23: dünyada tek kamera, 14 derece; kapsam notu: Han içi, Pazar içi, Bahçe şimdilik eski kamera | Bölüm ajanının aktardığına göre kullanıcı 2026-11-12'de "yeni bölümlerin merkez hariç açıları yakın kamera açısı olacak" dedi; Kuzey Yolu, Çarşı ve Han içi bölümleri yakın kameranın eşdeğeriyle kuruldu, Merkez Meydan 14 derecede kaldı. Bu söz sistem ajanına doğrudan söylenmedi | K23 şöyle güncellenir: "Merkez Meydan master'ın 14 derecesinde; öteki bölümler yakın kamerada". Kullanıcı teyidiyle işlenir |
| Açılış sahnesi ve dönüş yönü | Han, Pazar, Yol, Arena ve Bahçe'nin çıkışı eski Meydan'a döner; oyun eski Meydan'da açılır | Yeni Merkez Meydan (kimlik `master`) beş kapıyı ileri yönde bağladı; dönüş yönü ve açılış değişmedi | Karar kullanıcının: yeni Meydan açılış sahnesi olursa çıkışlar ona bağlanır |

