'use strict';
// Oyuncu hunisi (2026-11-20): oyuncuyu nerede kaybettiğimizi görmek için kendi sunucumuza yazılan, hafif ilerleme işaretleri.
// Üçüncü taraf analiz aracı yoktur. Hesap başına yalnız "hangi adımı hangi gün ilk kez geçti" tutulur: IP, ad, metin, cihaz bilgisi yok.
//
// Adımlar (ADIMLAR sırasıyla huni):
//   sayfa      sayfa açıldı, oyunun betikleri çalıştı          (istemci)
//   yuklendi   sayfa ve görseller yüklendi (tarayıcı 'load')     (istemci)
//   yeni_ocak  "Yeni ocak kur" ile oyuna başladı                (istemci)
//   ad         dedenin mektubunda adını seçti                    (istemci)
//   hafta1     ilk haftayı bitirdi                               (istemci)
//   dovus      ilk dövüşünü bitirdi (Arena ya da Topçu)          (istemci)
//   hafta5 / hafta10 / sezon   5. ve 10. haftayı, sezonu bitirdi (istemci)
//   geri1      ilk geldiği günün ertesi günü yeniden geldi       (SUNUCU: sunucu saatiyle hesaplanır, istemci gönderemez)
//   geri7      ilk geldiği günden en az 7 gün sonra yeniden geldi (SUNUCU)
//
// Kohort: hesabın ilk işaretinin günü (Türkiye saati, UTC+3). Her adım hesabın kohort gününün sayacına bir kez eklenir.
// Böylece "20 Kasım'da gelenlerin kaçı ertesi gün döndü" doğrudan okunur.
// Tekrar: aynı adım ikinci kez gelirse hiçbir şey yazılmaz (idempotent); istemci yeniden denese de sayı şişmez.
// Sınırlar: istemci kandırabilir (adım uydurabilir); sayılar ekonomiye, ödüle ya da sıralamaya hiçbir zaman girdi olmaz, yalnız bakılır.
// Bilinen boşluk: misafir hesabı cihaza bağlıdır; çerezini silen ya da başka cihazdan gelen oyuncu yeni hesap ve yeni kohort sayılır.

const ADIMLAR = ['sayfa', 'yuklendi', 'yeni_ocak', 'ad', 'hafta1', 'dovus', 'hafta5', 'hafta10', 'sezon', 'geri1', 'geri7'];
const SUNUCU_ADIMI = new Set(['geri1', 'geri7']);
const ISTEMCI_ADIMI = new Set(ADIMLAR.filter(a => !SUNUCU_ADIMI.has(a)));
const ADIM_AD = { sayfa: 'Sayfayı açtı', yuklendi: 'Yükleme bitti', yeni_ocak: 'Yeni ocak kurdu', ad: 'Adını seçti', hafta1: '1. haftayı bitirdi', dovus: 'İlk dövüşü bitirdi',
  hafta5: '5. haftayı bitirdi', hafta10: '10. haftayı bitirdi', sezon: 'Sezonu bitirdi', geri1: 'Ertesi gün döndü', geri7: '7+ gün sonra döndü' };
const GUN_MS = 86400000, TR_MS = 3 * 3600000, EN_COK_GUN = 120;
const gunNo = t => Math.floor((t + TR_MS) / GUN_MS);                      // Türkiye takvim günü (sayı)
const gunYazi = g => new Date(g * GUN_MS).toISOString().slice(0, 10);    // 2026-11-20
const hata = (code, status) => Object.assign(new Error(code), { code, status });

/* İstemci gövdesi: { adimlar: ['sayfa', 'ad'] }. Bilinmeyen ya da sunucuya ait adım sessizce atılır; hiç geçerli adım yoksa 400. */
function temizAdimlar(body) {
  const ham = body && Array.isArray(body.adimlar) ? body.adimlar.slice(0, 12) : [];
  const out = [...new Set(ham.filter(a => typeof a === 'string' && ISTEMCI_ADIMI.has(a)))];
  if (!out.length) throw hata('funnel_step_invalid', 400);
  return out;
}

/* Saf kural (iki depo da kullanır). kayit: { ilk: gün, a: { adım: gün } } ya da null. Dönen `yeni` boşsa hiçbir şey yazılmaz. */
function planla(kayit, adimlar, gun) {
  const k = kayit && Number.isSafeInteger(kayit.ilk) ? { ilk: kayit.ilk, a: Object.assign({}, kayit.a) } : { ilk: gun, a: {} };
  const yeni = [];
  const ekle = ad => { if (!(ad in k.a)) { k.a[ad] = gun; yeni.push(ad); } };
  for (const ad of adimlar) ekle(ad);
  const fark = gun - k.ilk;
  if (fark === 1) ekle('geri1');
  if (fark >= 7) ekle('geri7');
  return { kayit: k, yeni, kohort: k.ilk };
}

/* Okuma: gün gün kohort sayaçlarından özet. satirlar: [{ gun, sayac: { adım: n } }] */
function ozet(satirlar, bugun) {
  const gunler = satirlar.filter(s => Number.isSafeInteger(s.gun)).sort((a, b) => b.gun - a.gun).map(s => {
    const sayac = {}; for (const a of ADIMLAR) sayac[a] = Math.max(0, Math.floor(Number(s.sayac && s.sayac[a]) || 0));
    return { gun: gunYazi(s.gun), yas: bugun - s.gun, sayac };
  });
  const toplam = {}; for (const a of ADIMLAR) toplam[a] = gunler.reduce((t, g) => t + g.sayac[a], 0);
  // geri1 ve geri7 oranları yalnız o süreyi doldurmuş kohortlardan hesaplanır (bugün gelenin "ertesi günü" henüz olmadı)
  const olgun = n => { const s = gunler.filter(g => g.yas >= n); return { taban: s.reduce((t, g) => t + g.sayac.sayfa, 0), donen: s.reduce((t, g) => t + g.sayac[n === 1 ? 'geri1' : 'geri7'], 0) }; };
  return { adimlar: ADIMLAR.map(a => ({ id: a, ad: ADIM_AD[a] })), bugun: gunYazi(bugun), gunler, toplam, geri1: olgun(1), geri7: olgun(7) };
}

function createHuni({ store, anahtar = '', now = () => Date.now() }) {
  const ANAHTAR = typeof anahtar === 'string' && anahtar.length >= 16 ? anahtar : '';
  async function kaydet(identity, body) {
    if (!identity) throw hata('guest_session_required', 401);
    const adimlar = temizAdimlar(body);
    const yeni = await store.recordFunnel(identity.accountId, adimlar, gunNo(now()));
    return { ok: true, yeni };
  }
  async function oku(gunSayisi) {
    const n = Math.max(1, Math.min(EN_COK_GUN, Math.floor(Number(gunSayisi)) || 30)), bugun = gunNo(now());
    return { ok: true, ...ozet(await store.readFunnel(bugun - n + 1, bugun), bugun) };
  }
  // Okuma izni: HUNI_ANAHTAR (en az 16 karakter) "Authorization: Bearer <anahtar>" başlığıyla gelir. Anahtar yoksa okuma kapalıdır.
  function okumaIzni(req) {
    if (!ANAHTAR) return false;
    const m = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''));
    if (!m) return false;
    const crypto = require('node:crypto');
    const a = crypto.createHash('sha256').update(m[1]).digest(), b = crypto.createHash('sha256').update(ANAHTAR).digest();
    return crypto.timingSafeEqual(a, b);
  }
  return { kaydet, oku, okumaIzni, acik: () => !!ANAHTAR };
}

/* Mehmet'in okuma sayfası (/huni). Sayfada gizli bilgi yok; anahtar girilince /api/huni'den okur. Anahtar yalnız bu sekmede (sessionStorage) durur. */
const HUNI_SAYFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Oyuncu hunisi · Ejder Ocağı</title><style>
:root{--z:#14110f;--y:#f3ead9;--s:#a89a86;--c:#2a231d;--a:#e0a84a;--k:#d9694a}
body{margin:0;background:var(--z);color:var(--y);font:15px/1.45 system-ui,sans-serif;padding:16px}
main{max-width:980px;margin:auto}h1{font-size:22px;margin:.2em 0}p.s{color:var(--s);margin:.2em 0 1em}
form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}input,select,button{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #4a3f35;background:var(--c);color:var(--y)}
button{background:var(--a);color:#1b140c;border:0;font-weight:600;cursor:pointer}
.kutu{background:var(--c);border-radius:12px;padding:12px 14px;margin-bottom:16px;overflow-x:auto}
.bar{display:grid;grid-template-columns:minmax(140px,190px) 1fr 110px;gap:8px;align-items:center;margin:5px 0}
.bar i{display:block;height:14px;border-radius:7px;background:var(--a)}.bar small{color:var(--s)}
table{border-collapse:collapse;width:100%;font-size:13px;white-space:nowrap}th,td{padding:5px 8px;text-align:right;border-bottom:1px solid #3a3029}th:first-child,td:first-child{text-align:left}
th{color:var(--s);font-weight:500}.h{color:var(--k)}.not{color:var(--s);font-size:13px}</style></head><body><main>
<h1>Oyuncu hunisi</h1><p class="s">Her satır o gün ilk kez gelen oyuncuları (kohort) gösterir. Saatler Türkiye saatidir.</p>
<form id="f"><input id="k" type="password" placeholder="HUNI_ANAHTAR" autocomplete="current-password" required><select id="g"><option value="7">Son 7 gün</option><option value="30" selected>Son 30 gün</option><option value="90">Son 90 gün</option></select><button>Göster</button></form>
<div id="o"></div><p class="not">Ertesi gün dönüş oranı yalnız en az bir gün önce gelenlerden, 7+ gün dönüş oranı en az yedi gün önce gelenlerden hesaplanır. Çerezini silen ya da başka cihazdan gelen oyuncu yeni oyuncu sayılır.</p>
<script>
const $=i=>document.getElementById(i),o=$('o'),yuz=(a,b)=>b?Math.round(a/b*100)+'%':'–',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
try{$('k').value=sessionStorage.getItem('huniAnahtar')||''}catch(_){}
async function goster(){const k=$('k').value.trim();if(!k)return;try{sessionStorage.setItem('huniAnahtar',k)}catch(_){}
o.textContent='Okunuyor…';let r,j;try{r=await fetch('/api/huni?gun='+$('g').value,{headers:{Authorization:'Bearer '+k}});j=await r.json()}catch(_){o.innerHTML='<p class="h">Sunucuya ulaşılamadı.</p>';return}
if(!r.ok){o.innerHTML='<p class="h">'+(r.status===404?'Anahtar yanlış ya da huni okuması kapalı.':r.status===429?'Çok deneme yapıldı. On dakika sonra yeniden dene.':'Okunamadı ('+esc(j&&j.error||r.status)+').')+'</p>';return}
const A=j.adimlar,T=j.toplam,taban=T.sayfa||0,en=Math.max(1,...A.map(a=>T[a.id]));
let h='<div class="kutu"><b>Toplam huni</b> · '+taban+' yeni oyuncu<br><br>';
for(const a of A){const n=a.id==='geri1'?j.geri1.donen:a.id==='geri7'?j.geri7.donen:T[a.id],b=a.id==='geri1'?j.geri1.taban:a.id==='geri7'?j.geri7.taban:taban;
h+='<div class="bar"><span>'+esc(a.ad)+'</span><i style="width:'+Math.max(1,Math.round(n/en*100))+'%"></i><small>'+n+' · '+yuz(n,b)+'</small></div>'}
h+='</div><div class="kutu"><table><tr><th>Gün</th>'+A.map(a=>'<th>'+esc(a.ad)+'</th>').join('')+'</tr>';
for(const g of j.gunler){h+='<tr><td>'+g.gun+'</td>'+A.map(a=>{const n=g.sayac[a.id],bekle=(a.id==='geri1'&&g.yas<1)||(a.id==='geri7'&&g.yas<7);return '<td>'+(bekle?'<small class="not">bekliyor</small>':n+(a.id!=='sayfa'&&g.sayac.sayfa?' <small class="not">'+yuz(n,g.sayac.sayfa)+'</small>':''))+'</td>'}).join('')+'</tr>'}
if(!j.gunler.length)h+='<tr><td colspan="'+(A.length+1)+'">Bu aralıkta kayıt yok.</td></tr>';
o.innerHTML=h+'</table></div>'}
$('f').addEventListener('submit',e=>{e.preventDefault();goster()});if($('k').value)goster();
</script></main></body></html>`;

module.exports = { createHuni, planla, ozet, temizAdimlar, gunNo, gunYazi, ADIMLAR, HUNI_SAYFA };
