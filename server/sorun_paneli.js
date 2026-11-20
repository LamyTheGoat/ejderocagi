'use strict';
// Şikâyet ve sorun bildirimi okuma paneli (2026-11-20). Yalnız Mehmet için, salt okunur.
//   GET /sorunlar        : sayfa. Gizli bilgi taşımaz; anahtar girilince veriyi aşağıdaki uçtan okur.
//   GET /api/sorunlar    : son bildirimler ve şikâyet özeti. "Authorization: Bearer <YONETIM_ANAHTAR>" ister.
// YONETIM_ANAHTAR ortam değişkeni en az 16 karakter değilse okuma tamamen kapalıdır; yanlış anahtar 404 alır (uç yokmuş gibi).
// Veri server/report_log.js'nin yazdığı sorunlar.jsonl dosyasıdır. Oyuncunun yazdığı her alan güvenilmezdir:
// sayfa metni yalnız textContent ile basar, HTML olarak yorumlanmaz; sayfanın betiği nonce'lu CSP ile çalışır.
const crypto = require('node:crypto');

const SIKAYET = /^\[şikâyet\] (\S{1,60}) \((.{0,40}?)\) · ([\s\S]*)$/;

/* Kaydın türü: oyuncunun şikâyeti, oyuncunun yazdığı sorun bildirimi ya da oyunun kendiliğinden gönderdiği hata. */
function tur(k) {
  if (k.otomatik === true) return 'otomatik';
  return typeof k.metin === 'string' && k.metin.startsWith('[şikâyet] ') ? 'sikayet' : 'oyuncu';
}

/* Bir kaydı panelin göstereceği biçime çevirir. Şikâyetlerde hedef oyuncu ve son sözleri ayrıştırılır. */
function bicimle(k) {
  const t = tur(k), out = { zaman: String(k.zaman || ''), tur: t, hesap: k.hesap || null, metin: String(k.metin || ''), surum: k.surum || '', sahne: k.sahne || '', ekran: k.ekran || '', tarayici: k.tarayici || '', hatalar: Array.isArray(k.hatalar) ? k.hatalar : [] };
  if (t === 'sikayet') { const m = SIKAYET.exec(out.metin); if (m) out.hedef = { handle: m[1], ad: m[2], sozler: m[3] === 'söz yok' ? '' : m[3] }; }
  return out;
}

/* Şikâyet edilen oyuncular: şikâyet sayısı ve kaç ayrı hesaptan geldiği (tek kişinin seri şikâyeti ile çok kişinin şikâyeti ayrılsın). */
function sikayetOzeti(kayitlar) {
  const m = new Map();
  for (const k of kayitlar) {
    if (!k.hedef) continue;
    const h = k.hedef.handle, o = m.get(h) || { handle: h, ad: k.hedef.ad, sayi: 0, bildiren: new Set(), son: k.zaman };
    o.sayi++; o.bildiren.add(k.hesap || 'kimliksiz'); if (k.zaman > o.son) o.son = k.zaman; m.set(h, o);
  }
  return [...m.values()].map(o => ({ handle: o.handle, ad: o.ad, sayi: o.sayi, bildiren: o.bildiren.size, son: o.son }))
    .sort((a, b) => b.bildiren - a.bildiren || b.sayi - a.sayi || (b.son > a.son ? 1 : -1)).slice(0, 50);
}

function createSorunPaneli({ reports, anahtar = '' }) {
  const ANAHTAR = typeof anahtar === 'string' && anahtar.length >= 16 ? anahtar : '';
  function okumaIzni(req) {
    if (!ANAHTAR) return false;
    const m = /^Bearer (.+)$/.exec(String((req.headers && req.headers.authorization) || ''));
    if (!m) return false;
    const a = crypto.createHash('sha256').update(m[1]).digest(), b = crypto.createHash('sha256').update(ANAHTAR).digest();
    return crypto.timingSafeEqual(a, b);
  }
  function oku(adet) {
    const kayitlar = reports.son(adet).map(bicimle);
    const sayac = { sikayet: 0, oyuncu: 0, otomatik: 0 }; for (const k of kayitlar) sayac[k.tur]++;
    return { ok: true, sayac, sikayetEdilen: sikayetOzeti(kayitlar), kayitlar };
  }
  return { okumaIzni, oku, acik: () => !!ANAHTAR };
}

/* Sayfa: nonce her istekte yeni üretilir; CSP başlığı server.js'de aynı nonce ile yazılır. */
function sayfa(nonce) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Şikâyetler · Ejder Ocağı</title><style nonce="${nonce}">
:root{--z:#14110f;--y:#f3ead9;--s:#a89a86;--c:#2a231d;--a:#e0a84a;--k:#d9694a;--m:#7fb2e0}
body{margin:0;background:var(--z);color:var(--y);font:15px/1.45 system-ui,sans-serif;padding:16px}
main{max-width:980px;margin:auto}h1{font-size:22px;margin:.2em 0}h2{font-size:17px;margin:1.2em 0 .5em}p.s{color:var(--s);margin:.2em 0 1em}
form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}input,button{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #4a3f35;background:var(--c);color:var(--y)}
input{flex:1 1 220px;min-width:0}button{background:var(--a);color:#1b140c;border:0;font-weight:600;cursor:pointer}
.sek{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}.sek button{background:var(--c);color:var(--y);border:1px solid #4a3f35;font-weight:500}.sek button[aria-pressed=true]{background:var(--a);color:#1b140c}
.kutu{background:var(--c);border-radius:12px;padding:10px 14px;margin-bottom:10px;overflow-wrap:anywhere}
.ust{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;color:var(--s);font-size:13px}.ust b{color:var(--y);font-size:14px}
.e{display:inline-block;border-radius:6px;padding:0 7px;font-size:12px;font-weight:600;color:#1b140c}.e.sikayet{background:var(--k)}.e.oyuncu{background:var(--a)}.e.otomatik{background:var(--m)}
.metin{margin:.35em 0 .2em;white-space:pre-wrap}.soluk{color:var(--s);font-size:13px}details{margin-top:4px;font-size:13px;color:var(--s)}details pre{white-space:pre-wrap;margin:.3em 0}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #3a3029}th{color:var(--s);font-weight:500}td.n{text-align:right}
.h{color:var(--k)}.tablo{overflow-x:auto}</style></head><body><main>
<h1>Şikâyetler ve sorun bildirimleri</h1><p class="s">Son bildirimler yeniden eskiye. Saatler Türkiye saatidir. Bu sayfa salt okunur; oyuncuya bir şey yazmaz.</p>
<form id="f"><input id="k" type="password" placeholder="YONETIM_ANAHTAR" autocomplete="current-password" required><button>Göster</button></form>
<div id="o"></div>
<p class="soluk">Bildirimler sunucunun veri dizinindeki sorunlar.jsonl dosyasından okunur. Disk kalıcı değilse sunucu yeniden başlayınca eski kayıtlar burada görünmez; özetleri Cloud Run günlüklerinde "[sorun]" satırlarındadır.</p>
<script nonce="${nonce}">
const $=i=>document.getElementById(i),o=$('o');
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const saat=z=>{const d=new Date(z);return isNaN(d)?String(z):d.toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'})};
const AD={sikayet:'Şikâyet',oyuncu:'Oyuncu bildirimi',otomatik:'Otomatik hata'};
let veri=null,secili='hepsi';
try{$('k').value=sessionStorage.getItem('yonetimAnahtar')||''}catch(_){}
function ciz(){o.replaceChildren();if(!veri)return;const j=veri;
 const sek=el('div','sek');for(const [id,ad] of [['hepsi','Hepsi ('+j.kayitlar.length+')'],['sikayet','Şikâyet ('+j.sayac.sikayet+')'],['oyuncu','Oyuncu bildirimi ('+j.sayac.oyuncu+')'],['otomatik','Otomatik hata ('+j.sayac.otomatik+')']]){const b=el('button',null,ad);b.type='button';b.setAttribute('aria-pressed',String(secili===id));b.onclick=()=>{secili=id;ciz()};sek.append(b)}
 o.append(sek);
 if((secili==='hepsi'||secili==='sikayet')&&j.sikayetEdilen.length){o.append(el('h2',null,'En çok şikâyet edilenler'));const w=el('div','kutu tablo'),t=el('table');const hr=el('tr');for(const h of ['Oyuncu','Ad','Sayı','Bildiren','Son'])hr.append(el('th',null,h));t.append(hr);
  for(const s of j.sikayetEdilen){const r=el('tr');r.append(el('td',null,s.handle),el('td',null,s.ad),el('td','n',String(s.sayi)),el('td','n',String(s.bildiren)),el('td',null,saat(s.son)));t.append(r)}w.append(t);o.append(w)}
 const liste=j.kayitlar.filter(k=>secili==='hepsi'||k.tur===secili);o.append(el('h2',null,secili==='hepsi'?'Son bildirimler':AD[secili]));
 if(!liste.length)o.append(el('p','soluk','Kayıt yok.'));
 for(const k of liste){const b=el('div','kutu'),u=el('div','ust');u.append(el('span','e '+k.tur,AD[k.tur]),el('b',null,saat(k.zaman)),el('span',null,k.hesap?'hesap '+k.hesap:'kimliksiz'));if(k.sahne)u.append(el('span',null,'sahne '+k.sahne));if(k.surum)u.append(el('span',null,'sürüm '+k.surum));b.append(u);
  if(k.hedef){b.append(el('div','metin','Şikâyet edilen: '+k.hedef.handle+' ('+k.hedef.ad+')'));b.append(el('div','soluk',k.hedef.sozler?'Son sözleri: '+k.hedef.sozler:'Son sözü yok (ad için şikâyet olabilir).'))}
  else b.append(el('div','metin',k.metin));
  if(k.hatalar.length||k.tarayici){const d=el('details');d.append(el('summary',null,'Ayrıntı'+(k.hatalar.length?' · '+k.hatalar.length+' hata':'')));if(k.tarayici)d.append(el('div',null,'Tarayıcı: '+k.tarayici+(k.ekran?' · ekran '+k.ekran:'')));if(k.hatalar.length)d.append(el('pre',null,k.hatalar.map(h=>'['+h.tur+'] '+h.mesaj+(h.yer?' @ '+h.yer:'')).join('\\n')));b.append(d)}
  o.append(b)}}
async function goster(){const k=$('k').value.trim();if(!k)return;try{sessionStorage.setItem('yonetimAnahtar',k)}catch(_){}
 o.textContent='Okunuyor…';let r,j;try{r=await fetch('/api/sorunlar?adet=500',{headers:{Authorization:'Bearer '+k},cache:'no-store'});j=await r.json()}catch(_){o.replaceChildren(el('p','h','Sunucuya ulaşılamadı.'));return}
 if(!r.ok){o.replaceChildren(el('p','h',r.status===404?'Anahtar yanlış ya da panel kapalı (YONETIM_ANAHTAR tanımlı değil).':r.status===429?'Çok deneme yapıldı. On dakika sonra yeniden dene.':'Okunamadı ('+String(j&&j.error||r.status)+').'));return}
 veri=j;ciz()}
$('f').addEventListener('submit',e=>{e.preventDefault();goster()});if($('k').value)goster();
</script></main></body></html>`;
}

module.exports = { createSorunPaneli, sayfa, bicimle, sikayetOzeti, tur };
