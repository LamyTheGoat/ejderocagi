# ENG06-03 · Salt okunur topoloji doğrulaması

| Alan | Değer |
|---|---|
| Durum | Salt okunur kontrol. Güvenlik kodu uygulanmadı, hiçbir servis veya ayar değiştirilmedi. |
| Branch / worktree | `claude/eng-06-economy` · `C:/Users/user/Documents/GitHub/ejderocagi-eng06` |
| Taban commit | `4eb7932` (ENG06-03 tasarım revizyonu 2) |
| Tarih | 2026-11-07 |

## 0. Özet

- **Cloud Run servis adı, bölge, `PUBLIC_URL` ve dış alan adı hiçbir erişilebilir kaynakta bulunamadı.**
- Claude'un bu makinede Google Cloud CLI (`gcloud`), Firebase oturumu veya GitHub CLI erişimi yok. Hiçbir üretim kaynağı sorgulanamadı.
- Kod, Cloud Run'da çalışmaya **hazırlanmış**, ama bir Cloud Run servisinin var olduğuna dair kanıt yok.
- **`TRUSTED_PROXY_HOPS` için kanıtlanmış bir değer yok. Öneri: tanımsız bırakılması** (bugünkü soket adresi davranışı) ve aşağıdaki komutlar çalıştırılana kadar hiçbir değer seçilmemesi.
- Yeni bulgu: `SESSION_SECRET` tanımsızsa her instance kendi rastgele sırrını üretiyor (`server.js:802-803`). Tasarımdaki HMAC anahtarı bu durumda instance'lar arasında farklı olur ve dağıtık IP limiti instance başına bölünür (§4).

## 1. Kontrol edilen kaynaklar ve sonuçları

Bu bölümdeki her satır doğrudan gözlemdir.

| # | Kaynak | Yöntem | Sonuç |
|---|---|---|---|
| R1 | Worktree dosyaları | `ls -a`, `grep` (run.app, onrender.com, web.app, firebaseapp.com, `--region`, bölge adları, `PUBLIC_URL=`) | Eşleşen tek yer Claude'un kendi tasarım belgeleri. Servis adı, bölge, URL yok. |
| R2 | Dağıtım tanımları | `Dockerfile`, `render.yaml`, `firebase.json`, `.dockerignore` | Cloud Run servis YAML'ı, `cloudbuild.yaml`, `.firebaserc`, `.github/` iş akışı, LB/Cloud Armor tanımı **yok** |
| R3 | Git geçmişi (tüm dallar) | `git log --all -S "run.app"`, `-S "onrender"`, silinmiş YAML/workflow dosyaları | Yalnız Claude'un ENG06-03 belgeleri. Silinmiş dağıtım dosyası yok. |
| R4 | Diğer yerel kopyalar | `C:/Users/user/Documents/GitHub/ejderocagi/ejderocagi` (aynı GitHub remote'u, eski sürüm) | Aynı `Dockerfile` ve `render.yaml`. Servis adı veya URL yok. |
| R5 | GitHub (kimliksiz, yalnız GET) | `api.github.com/repos/LamyTheGoat/ejderocagi`, `/deployments`, `/environments` | Depo herkese açık; `homepage: null`; 0 deployment; 0 environment |
| R6 | Google Cloud CLI | `which gcloud`, `gcloud config list`, `gcloud auth list` | **Kurulu değil.** Cloud SDK dizini yok. |
| R7 | Firebase CLI oturumu | `~/.config/configstore/firebase-tools.json` (yalnız anahtar adları okundu) | Oturum yok (`user` yok, `activeProjects` boş). Önbellekteki `firebase-tools` yalnız yerel emülatör için kullanıldı. |
| R8 | GitHub CLI | `which gh` | Kurulu değil |
| R9 | DNS / HTTP başlıkları | — | **Yapılamadı:** sorgulanacak bir alan adı bulunamadı. Tahmini bir alan adı denenmedi. |

## 2. Koddan çıkan yapılandırma yüzeyi (kanıt: kod)

Sunucunun okuduğu ortam değişkenleri (`server.js`, `server/*.js`):

| Değişken | Kod yeri | Topolojiye etkisi |
|---|---|---|
| `K_SERVICE` | `server/store_factory.js:4` | Cloud Run'ın otomatik koyduğu değişken. Varsa Firestore zorunlu. **Kodun Cloud Run'ı hedeflediğini gösterir, servisin var olduğunu göstermez.** |
| `NODE_ENV` | `server.js:44`, `store_factory.js:4` | `production` → Firestore zorunlu, `__Host-` güvenli çerez |
| `PUBLIC_URL` | `server.js:39` | Origin kontrolünün tek referansı. Varsayılan `http://localhost:<PORT>`. Üretim değeri bilinmiyor. |
| `PORT` | `server.js:36`, `Dockerfile` (`8080`) | Cloud Run varsayılanıyla uyumlu |
| `SESSION_SECRET` | `server.js:802-803` | Tanımsızsa instance başına rastgele (§4) |
| `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` | `store_factory.js:9` | Firestore proje kimliği. Değer bilinmiyor. |
| `FIRESTORE_DATABASE_ID` | `store_factory.js:10` | Varsayılan `economy` (`firebase.json` ile uyumlu) |
| `DATA_DIR` | `server.js:41` | Dünya verisi dizini. `store_factory.js:13` yorumu bunun "GCS world volume" olabileceğini söylüyor. |
| `ECONOMY_BACKEND`, `LOCAL_ECONOMY_DIR`, `FIRESTORE_EMULATOR_HOST` | `store_factory.js` | Yerel ve test |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | `server.js` | X OAuth; topolojiyle ilgisiz |

Proxy başlığı okuyan hiçbir değişken veya kod yok. `TRUSTED_PROXY_HOPS` henüz koda eklenmedi.

## 3. Erişim yolları: bilinen, bilinmeyen

| Yol | Durum | Kanıt |
|---|---|---|
| Cloud Run doğrudan (`*.run.app`) | **Bilinmiyor** | Servis adı ve bölge yok. Kod Cloud Run'ı hedefliyor (§2). Bir Cloud Run servisi varsa varsayılan `*.run.app` URL'si de vardır; ingress ayarıyla kapatılmış olabilir. |
| Cloud Run domain mapping | **Bilinmiyor** | Alan adı yok |
| Harici HTTPS LB + serverless NEG | **Bilinmiyor** | Depoda tanım yok. Bu, LB olmadığını kanıtlamaz; konsoldan kurulmuş olabilir. |
| Cloud Armor | **Bilinmiyor** | Depoda tanım yok |
| Firebase Hosting → Cloud Run rewrite | **Depoda yok** | `firebase.json` yalnız Firestore ve emülatör içeriyor. Başka bir hosting projesi olup olmadığı bilinmiyor. |
| Render (`render.yaml`) | **Bilinmiyor; dosya mevcut kodla çelişkili görünüyor** | Aşağıya bakın |
| Başka CDN veya proxy (ör. Cloudflare) | **Bilinmiyor** | Alan adı olmadan DNS'ten anlaşılamaz |

**`render.yaml` notu (kod okumasından çıkarım, çalıştırılarak doğrulanmadı):**
- `render.yaml` `NODE_ENV=production` koyuyor ve SQLite için kalıcı disk bağlıyor.
- Ama `store_factory.js:4-6`, `NODE_ENV=production` iken SQLite'ı reddediyor ve Firestore istiyor.
- `render.yaml` Firestore proje kimliği veya kimlik bilgisi tanımlamıyor.
- Bu yüzden dosya, mevcut kodla olduğu gibi çalışır bir üretim yapılandırması gibi görünmüyor. Muhtemelen eski bir yapılandırma.
- Ancak Render panelinde ek ortam değişkenleri tanımlanmış olabilir. Render servisinin aktif olup olmadığı bilinmiyor (§5, K10).

## 4. Yeni bulgu: `SESSION_SECRET` ve dağıtık HMAC anahtarı

- `server.js:802-803`: `SESSION_SECRET` tanımsızsa her süreç başlangıçta `crypto.randomBytes(32)` ile kendi sırrını üretiyor.
- ENG06-03 tasarımı (§4b) rate anahtarlarını `HMAC(SESSION_SECRET, ip)` ile türetmeyi öneriyor.
- Birden fazla Cloud Run instance'ı varken ve `SESSION_SECRET` tanımsızken:
  - Aynı IP her instance'ta **farklı bir anahtar** üretir.
  - IP başına limit instance sayısı kadar çarpılır.
  - Ayrıca her yeniden başlatmada anahtarlar sıfırlanır.
- Mevcut kodda bu sır yalnız X ile girişin `eo_sess` çerezini imzalıyor (`server.js:825-841`). Misafir oturumu bundan etkilenmiyor; o oturumlar DB'de, token özetiyle tutuluyor.
- Yan bulgu: aynı nedenle, `SESSION_SECRET` tanımsız ve birden fazla instance varken bir instance'ın imzaladığı `eo_sess` çerezi diğer instance'ta geçersiz olur. Ayrıca her yeniden başlatmada geçersizleşir. `server.js:802`'deki yorum bunu yeniden başlatma için zaten söylüyor.
- **Tasarıma etkisi:** HMAC anahtarı için ya `SESSION_SECRET` üretimde zorunlu olmalı (yoksa başlangıç hatası), ya da ayrı ve zorunlu bir `RATE_KEY_SECRET` kullanılmalı. Bu, ENG06-03 tasarımındaki karar 7'yi "isteğe bağlı" olmaktan çıkarıyor. Kullanıcı kararı.
- Üretimde `SESSION_SECRET`'ın tanımlı olup olmadığı bilinmiyor (K2 ile değerin kendisi değil, yalnız adının varlığı kontrol edilmeli).

## 5. `TRUSTED_PROXY_HOPS` önerisi

**Kanıtlanmış yapılandırma yok. Bu yüzden önerilen değer: tanımsız.**
- Bugünkü davranış sürer: soket adresi ve global limit (H-2 açık kalır).
- Başlıklara güvenilmez.

Tahminle `1` veya `2` seçmenin riskleri:
- Gerçek hop sayısından **fazla** bir değer: istemcinin yazdığı bir giriş "güvenilir" sayılır, IP sahteciliği mümkün olur. Saldırgan her istekte yeni bir sahte IP ile limiti tamamen aşar. H-2'den daha kötü.
- **Eksik** değer: anahtar bir proxy adresi olur ve limit yine global kalır. H-2 sürer.
- Birden fazla giriş yolu (örneğin `*.run.app` ve LB aynı anda) açıksa: hiçbir tek değer iki yolda birden doğru değildir.

Değer, ancak aşağıdaki K1–K10 sonuçları Proje Merkezi'ne iletildikten sonra, ENG06-03 tasarımı §6'daki karar tablosuyla seçilmeli. Tercihen staging'de ampirik doğrulamayla birlikte.

## 6. Kullanıcının çalıştırabileceği salt okunur komutlar

Kurallar:
- Tüm komutlar yalnız `list`, `describe`, `read`, DNS sorgusu veya HTTP `HEAD`/`GET` yapar; hiçbir kaynağı değiştirmez.
- `<PROJE>`, `<BÖLGE>`, `<SERVIS>`, `<ALAN_ADI>` yerlerine gerçek değerler yazılır.
- Çıktıyı paylaşmadan önce **gizli değerleri maskeleyin**: `SESSION_SECRET`, `X_CLIENT_SECRET` ve token gibi env değerleri. Yalnız değişkenin var olup olmadığı yeterli.
- Ön koşul: Google Cloud SDK kurulu ve `gcloud auth login` ile yetkili bir hesap. En az `roles/run.viewer`, `roles/compute.viewer`, `roles/logging.viewer` yeterli.

**K1 — Proje ve servisleri bul**
```bash
gcloud projects list --format="table(projectId,name)"
```
```bash
gcloud run services list --project <PROJE> --format="table(metadata.name,region,status.url)"
```

**K2 — Servis yapılandırması (ingress, ölçekleme, env adları)**
```bash
gcloud run services describe <SERVIS> --project <PROJE> --region <BÖLGE> --format="yaml(metadata.annotations,spec.template.metadata.annotations,spec.template.spec.containerConcurrency,status.url,status.address)"
```
```bash
gcloud run services describe <SERVIS> --project <PROJE> --region <BÖLGE> --format="value(spec.template.spec.containers[0].env[].name)"
```
- Bakılacaklar:
  - `run.googleapis.com/ingress` (`all` / `internal` / `internal-and-cloud-load-balancing`),
  - `autoscaling.knative.dev/maxScale` (çok instance),
  - `run.googleapis.com/sessionAffinity`,
  - env adlarında `PUBLIC_URL`, `NODE_ENV`, `SESSION_SECRET`.
- İkinci komut yalnız **adları** listeler; değerleri göstermez.
- `PUBLIC_URL` değeri gizli değildir; ayrıca şöyle okunabilir:
```bash
gcloud run services describe <SERVIS> --project <PROJE> --region <BÖLGE> --format=json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const e=JSON.parse(s).spec.template.spec.containers[0].env||[];for(const v of e)if(['PUBLIC_URL','NODE_ENV'].includes(v.name))console.log(v.name+'='+v.value)})"
```

**K3 — Domain mapping**
```bash
gcloud beta run domain-mappings list --project <PROJE> --region <BÖLGE>
```

**K4 — Yük dengeleyici zinciri**
```bash
gcloud compute network-endpoint-groups list --project <PROJE> --filter="networkEndpointType=SERVERLESS"
```
```bash
gcloud compute backend-services list --project <PROJE>
```
```bash
gcloud compute url-maps list --project <PROJE>
```
```bash
gcloud compute target-https-proxies list --project <PROJE>
```
```bash
gcloud compute forwarding-rules list --project <PROJE> --global
```
- Serverless NEG ve ona bağlı bir backend service varsa, Cloud Run önünde harici HTTPS LB var demektir.

**K5 — Cloud Armor**
```bash
gcloud compute security-policies list --project <PROJE>
```

**K6 — Firebase Hosting**
```bash
npx firebase-tools hosting:sites:list --project <PROJE>
```
- Hosting sitesi varsa, onu dağıtan projedeki `firebase.json` içinde Cloud Run'a giden `rewrites` var mı kontrol edilir.

**K7 — DNS (alan adı biliniyorsa)**
```bash
nslookup -type=A <ALAN_ADI>
```
```bash
nslookup -type=AAAA <ALAN_ADI>
```
```bash
nslookup -type=CNAME <ALAN_ADI>
```
- Adresin Google domain mapping, LB statik IP'si veya başka bir CDN'e (ör. Cloudflare) ait olup olmadığına bakılır.

**K8 — Yanıt başlıkları (her iki hostname için)**
```bash
curl -sI https://<ALAN_ADI>/
```
```bash
curl -sI <K1'deki status.url>/
```
- `server`, `via` ve CDN'e özgü başlıklar karşılaştırılır.
- `*.run.app` 200 dönüyorsa ve oyuncular custom domain kullanıyorsa, iki giriş yolu açık demektir.
- Ayrıca §5 bulgu 4 (tasarım): `PUBLIC_URL` dışı hostname'den kayıt 403 alır.

**K9 — Platformun gördüğü istemci IP'si**
```bash
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"<SERVIS>\" AND httpRequest.requestUrl:\"/api/session\"" --project <PROJE> --limit=5 --freshness=7d --format="json(timestamp,httpRequest.remoteIp,httpRequest.requestUrl)"
```
- Kendi bilinen IP'nizle bir kayıt yapıp (`https://<ALAN_ADI>` üzerinden oyunu açarak) bu komutla aynı IP'nin görünüp görünmediğine bakın.
- Bu, platformun istemci IP'sini doğru gördüğünü kanıtlar. Uygulamanın XFF'teki konumunu ise kanıtlamaz; o, staging tanı uç noktası gerektirir (ayrı onay).
- `remoteIp` kişisel veri sayılabilir; paylaşmadan önce son okteti maskeleyin.

**K10 — Render**
- Render panelinde `ejder-ocagi-online` servisinin durumu (aktif / askıda) ve bağlı custom domain.
- Panelde ek env değişkenleri (`GOOGLE_CLOUD_PROJECT` vb.) olup olmadığı.
- Alan adı Render'a gidiyorsa (K7), topoloji Cloud Run değil Render'dır ve ayrı değerlendirilir.

## 7. Sonuçlar gelince nasıl karar verilecek

| K sonuçları | `TRUSTED_PROXY_HOPS` adayı | Kesinleştirme koşulu |
|---|---|---|
| Tek giriş: custom domain → domain mapping → Cloud Run; ingress `all`; `*.run.app` kullanılmıyor | `1` (aday) | Staging tanı uç noktasında sağdaki girişin K9 IP'siyle eşleşmesi |
| Tek giriş: harici HTTPS LB → serverless NEG; ingress `internal-and-cloud-load-balancing` | `2` (aday) | Aynı; ayrıca `*.run.app`'in 404/403 döndüğünün K8 ile görülmesi |
| LB var ama ingress `all` (LB atlanabilir) | **Değer seçilmez** | Önce ingress kısıtlanmalı (altyapı kararı, dağıtım sahibi) |
| Firebase Hosting veya başka CDN önde | **Belirsiz** | CDN'in XFF davranışı ayrıca belgelenip ampirik doğrulanmalı |
| Render | **Ayrı analiz** | Render'ın XFF davranışı ve hop sayısı ampirik doğrulanmalı |
| Servis bulunamadı / üretim yok | **Tanımsız** | Konu, ilk dağıtımın topolojisi seçilirken ele alınır |

## 8. Yapılmayanlar

- Google Cloud, Firebase ve Render yapılandırması okunamadı (yetki ve CLI yok) ve hiçbiri değiştirilmedi.
- GitHub'dan yalnız herkese açık depo meta verisi kimliksiz GET ile okundu (R5); hiçbir ayar değiştirilmedi.
- Tahmini alan adı veya `*.run.app` URL'si denenmedi.
- Güvenlik kodu, yeni servis, push, merge veya dağıtım yok.
- Bu belge dışında hiçbir dosya değişmedi.

Proje Merkezi değerlendirmesi için burada duruldu.
