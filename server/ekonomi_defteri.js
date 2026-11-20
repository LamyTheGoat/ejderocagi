'use strict';
// Ekonomi defteri (2026-11-20, ekonomi raporu EKONOMI_DENGESI_2026-11-20 §6-1): sunucu her gün hangi komutla ne kadar
// altın yazıldığını (giriş) ve düşüldüğünü (çıkış) sayar. YALNIZ SAYAÇTIR: hiçbir kurala, ödüle, tavana girdi olmaz.
// Hesap kimliği, ad ya da miktar dökümü tutulmaz; gün (Türkiye saati) × kalem başına toplamlar tutulur.
//
// Kalem: komut türü (ör. `arena.settle`, `week.end`, `topcu.clear`), `gold.local` için `gold.local.<neden>`.
// Bedesten: alış ve satış oyuncular arası aktarımdır (toplam altını değiştirmez); `bedesten.ciro` yalnız hacim sayar,
// `bedesten.kesinti` çıkış (yakılan altın) sayar.
// Sayılmayanlar: doğrudan takas ve düello (oyuncular arası aktarım), haftanın ödenmemiş bakımı (borç olarak kalır).
// Tekrar: komut makbuzu olan yeniden deneme sayılmaz; sayaç komutla AYNI işlemde yazılır (yarım sayım olmaz).
const { gunNo, gunYazi } = require('./huni_service');

const KALEM = /^[a-z][a-z0-9_.]{0,47}$/;
const tam = n => (Number.isSafeInteger(n) ? n : 0);

/* Hesap komutunun altın farkından bir satır. Fark yoksa boş liste. */
function komutKalemleri(type, args, onceAltin, sonraAltin) {
  const fark = tam(sonraAltin) - tam(onceAltin);
  if (!fark) return [];
  let kalem = String(type || 'bilinmeyen');
  if (kalem === 'gold.local' && args && typeof args.reason === 'string') kalem += '.' + args.reason;
  if (!KALEM.test(kalem)) kalem = 'bilinmeyen';
  return [{ kalem, giris: Math.max(0, fark), cikis: Math.max(0, -fark), hacim: 0 }];
}

/* Bedesten satın alma sonucu (market_service sale) için satırlar. */
function pazarKalemleri(sale) {
  if (!sale || !Number.isSafeInteger(sale.total)) return [];
  const satir = [{ kalem: 'bedesten.ciro', giris: 0, cikis: 0, hacim: sale.total }];
  if (Number.isSafeInteger(sale.fee) && sale.fee > 0) satir.push({ kalem: 'bedesten.kesinti', giris: 0, cikis: sale.fee, hacim: 0 });
  return satir;
}

/* Okuma özeti. satirlar: [{ gun, kalem, giris, cikis, n, hacim }] */
function ozet(satirlar, bugun) {
  const gunler = new Map(), kalemler = new Map();
  for (const s of satirlar) {
    if (!Number.isSafeInteger(s.gun) || typeof s.kalem !== 'string') continue;
    const r = { kalem: s.kalem, giris: tam(s.giris), cikis: tam(s.cikis), n: tam(s.n), hacim: tam(s.hacim) };
    if (!gunler.has(s.gun)) gunler.set(s.gun, { gun: gunYazi(s.gun), giris: 0, cikis: 0, kalemler: [] });
    const g = gunler.get(s.gun); g.giris += r.giris; g.cikis += r.cikis; g.kalemler.push(r);
    const k = kalemler.get(r.kalem) || { kalem: r.kalem, giris: 0, cikis: 0, n: 0, hacim: 0 };
    for (const a of ['giris', 'cikis', 'n', 'hacim']) k[a] += r[a];
    kalemler.set(r.kalem, k);
  }
  const gun = [...gunler.entries()].sort((a, b) => b[0] - a[0]).map(([, g]) => ({ ...g, net: g.giris - g.cikis, kalemler: g.kalemler.sort((a, b) => (b.giris + b.cikis) - (a.giris + a.cikis)) }));
  const toplam = [...kalemler.values()].sort((a, b) => (b.giris + b.cikis) - (a.giris + a.cikis));
  const giris = toplam.reduce((t, k) => t + k.giris, 0), cikis = toplam.reduce((t, k) => t + k.cikis, 0);
  return { bugun: gunYazi(bugun), giris, cikis, net: giris - cikis, oran: giris ? Math.round(cikis / giris * 100) : null, kalemler: toplam, gunler: gun };
}

function createDefter({ store, huni, now = () => Date.now() }) {
  async function oku(gunSayisi) {
    const n = Math.max(1, Math.min(120, Math.floor(Number(gunSayisi)) || 30)), bugun = gunNo(now());
    return { ok: true, ...ozet(await store.readLedger(bugun - n + 1, bugun), bugun) };
  }
  // Okuma izni hunininkiyle aynı anahtardır (HUNI_ANAHTAR).
  return { oku, okumaIzni: req => huni.okumaIzni(req), acik: () => huni.acik() };
}

const DEFTER_SAYFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Ekonomi defteri · Ejder Ocağı</title><style>
:root{--z:#14110f;--y:#f3ead9;--s:#a89a86;--c:#2a231d;--a:#e0a84a;--k:#d9694a;--e:#8fbf7a}
body{margin:0;background:var(--z);color:var(--y);font:15px/1.45 system-ui,sans-serif;padding:16px}
main{max-width:980px;margin:auto}h1{font-size:22px;margin:.2em 0}h2{font-size:16px;margin:.2em 0 .5em}p.s{color:var(--s);margin:.2em 0 1em}
form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}input,select,button{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #4a3f35;background:var(--c);color:var(--y)}
button{background:var(--a);color:#1b140c;border:0;font-weight:600;cursor:pointer}
.kutu{background:var(--c);border-radius:12px;padding:12px 14px;margin-bottom:16px;overflow-x:auto}
.ozet{display:flex;gap:24px;flex-wrap:wrap}.ozet b{display:block;font-size:22px}.ozet small{color:var(--s)}
table{border-collapse:collapse;width:100%;font-size:13px;white-space:nowrap}th,td{padding:5px 8px;text-align:right;border-bottom:1px solid #3a3029}th:first-child,td:first-child{text-align:left}
th{color:var(--s);font-weight:500}.g{color:var(--e)}.c{color:var(--k)}.not{color:var(--s);font-size:13px}</style></head><body><main>
<h1>Ekonomi defteri</h1><p class="s">Sunucunun yazdığı (giriş) ve düştüğü (çıkış) altın, kaleme göre. Günler Türkiye saatidir.</p>
<form id="f"><input id="k" type="password" placeholder="HUNI_ANAHTAR" autocomplete="current-password" required><select id="g"><option value="7">Son 7 gün</option><option value="30" selected>Son 30 gün</option><option value="90">Son 90 gün</option></select><button>Göster</button></form>
<div id="o"></div><p class="not">Takas ve düello oyuncular arası aktarımdır, sayılmaz. Bedesten cirosu yalnız hacimdir; kesinti yakılan altındır. Ödenmemiş bakım borç olarak kalır, çıkışa girmez.</p>
<script>
const $=i=>document.getElementById(i),o=$('o'),f=n=>Number(n||0).toLocaleString('tr-TR'),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
try{$('k').value=sessionStorage.getItem('huniAnahtar')||''}catch(_){}
async function goster(){const k=$('k').value.trim();if(!k)return;try{sessionStorage.setItem('huniAnahtar',k)}catch(_){}
o.textContent='Okunuyor…';let r,j;try{r=await fetch('/api/ekonomi?gun='+$('g').value,{headers:{Authorization:'Bearer '+k}});j=await r.json()}catch(_){o.innerHTML='<p class="c">Sunucuya ulaşılamadı.</p>';return}
if(!r.ok){o.innerHTML='<p class="c">'+(r.status===404?'Anahtar yanlış ya da okuma kapalı.':r.status===429?'Çok deneme yapıldı. On dakika sonra yeniden dene.':'Okunamadı ('+esc(j&&j.error||r.status)+').')+'</p>';return}
let h='<div class="kutu ozet"><span><small>Giriş</small><b class="g">'+f(j.giris)+'</b></span><span><small>Çıkış</small><b class="c">'+f(j.cikis)+'</b></span><span><small>Net (birikim)</small><b>'+f(j.net)+'</b></span><span><small>Çıkış / giriş</small><b>'+(j.oran==null?'–':j.oran+'%')+'</b></span></div>';
h+='<div class="kutu"><h2>Kalemler</h2><table><tr><th>Kalem</th><th>Giriş</th><th>Çıkış</th><th>Komut</th><th>Hacim</th></tr>'+j.kalemler.map(x=>'<tr><td>'+esc(x.kalem)+'</td><td class="g">'+f(x.giris)+'</td><td class="c">'+f(x.cikis)+'</td><td>'+f(x.n)+'</td><td>'+(x.hacim?f(x.hacim):'')+'</td></tr>').join('')+'</table></div>';
h+='<div class="kutu"><h2>Günler</h2><table><tr><th>Gün</th><th>Giriş</th><th>Çıkış</th><th>Net</th></tr>'+j.gunler.map(g=>'<tr><td>'+g.gun+'</td><td class="g">'+f(g.giris)+'</td><td class="c">'+f(g.cikis)+'</td><td>'+f(g.net)+'</td></tr>').join('')+'</table></div>';
o.innerHTML=j.kalemler.length?h:'<p class="s">Bu aralıkta kayıt yok.</p>'}
$('f').addEventListener('submit',e=>{e.preventDefault();goster()});if($('k').value)goster();
</script></main></body></html>`;

module.exports = { komutKalemleri, pazarKalemleri, ozet, createDefter, DEFTER_SAYFA, KALEM };
