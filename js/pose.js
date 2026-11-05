'use strict';
/* ============ EJDER OCAĞI — POZLAR ============
   Yarış ve dövüş anları için dramatik ejderha pozları (Nano Banana 2 ile çizildi: P1 ElevenLabs üzerinden; P2–P11 Gemini API ile ejderha çizimi + poz örneği referansıyla).
   Renk genleri aynı yolla uygulanır: pul ve süs maskeleri, desen, parıltı, pigment, ton.
   P1 yandan uçuş (sağa bakar) · P2 atılış (sola) · P3 göz ucuyla bakış, yakın plan (sola) · P4 keskin yatışla viraj (sağa; fırtına sola) · P5 yaralı çöküş (sağa) · P6 burun uzatma, bağ anı (sağa) · P7 kameraya kükreme · P8 pençe (sağa) · P9 darbe alıp sendeleme (sola) · P10 son sürat, kameraya doğru alçak hücum (sola) · P11 başa baş: ileri atılan baş, yakın plan (sola)
   Ek pozlar (sağa): P12 nefes saldırısı · P13 kanatlarla siper · P14 yemek · P15 kıvrılıp uyuma · P16 havalanma */

const POSE_META = {"ates-P1":[900,447],"ates-P10":[900,465],"ates-P11":[900,519,"br"],"ates-P12":[900,497],"ates-P13":[900,461],"ates-P14":[900,441],"ates-P15":[900,436],"ates-P16":[900,700],"ates-P2":[900,473],"ates-P3":[900,655,"br"],"ates-P4":[900,578],"ates-P5":[900,295],"ates-P6":[900,577,"b"],"ates-P7":[900,476],"ates-P8":[900,593],"ates-P9":[900,556],"buz-P1":[900,461],"buz-P10":[900,496],"buz-P11":[900,530,"br"],"buz-P12":[900,475],"buz-P13":[900,517],"buz-P14":[900,430],"buz-P15":[900,453],"buz-P16":[805,703],"buz-P2":[900,478],"buz-P3":[900,634,"br"],"buz-P4":[900,689],"buz-P5":[900,378],"buz-P6":[900,548,"b"],"buz-P7":[900,493],"buz-P8":[900,549],"buz-P9":[900,668],"firtina-P1":[900,454],"firtina-P10":[900,506],"firtina-P11":[900,543,"br"],"firtina-P12":[900,452],"firtina-P13":[900,485],"firtina-P14":[900,469],"firtina-P15":[900,421],"firtina-P16":[900,569],"firtina-P2":[900,568],"firtina-P3":[900,551,"br"],"firtina-P4":[900,533],"firtina-P5":[900,382],"firtina-P6":[900,737],"firtina-P7":[900,503],"firtina-P8":[900,613],"firtina-P9":[900,613],"golge-P1":[900,484],"golge-P10":[900,516],"golge-P11":[900,546,"br"],"golge-P12":[900,502],"golge-P13":[900,519],"golge-P14":[900,499],"golge-P15":[900,485],"golge-P16":[900,639],"golge-P2":[900,499],"golge-P3":[900,622,"br"],"golge-P4":[900,704],"golge-P5":[900,353],"golge-P6":[900,555,"b"],"golge-P7":[900,501],"golge-P8":[900,592],"golge-P9":[900,702],"toprak-P1":[900,489],"toprak-P10":[900,502],"toprak-P11":[900,502,"tr"],"toprak-P12":[900,584],"toprak-P13":[900,500],"toprak-P14":[900,437],"toprak-P15":[900,463],"toprak-P16":[863,729],"toprak-P2":[900,488],"toprak-P3":[900,622,"br"],"toprak-P4":[900,559],"toprak-P5":[900,337],"toprak-P6":[900,485,"bl"],"toprak-P7":[900,471],"toprak-P8":[900,610],"toprak-P9":[900,601]};
const POSE_FACE = { P1: 'r', P2: 'l', P3: 'l', P4: 'r', P5: 'r', P6: 'r', P7: 'r', P8: 'r', P9: 'l', P10: 'l', P11: 'l', P12: 'r', P13: 'r', P14: 'r', P15: 'r', P16: 'r' }; // P7 kameraya bakar
const POSE_FACE_K = { 'firtina-P4': 'l' }; // tek tek farklı bakan çizimler
const poseFace = (d, p) => POSE_FACE_K[d.el + '-' + p] || POSE_FACE[p];
for (const k in POSE_META) { ASSETS['pose-' + k] = `img/pose/${k}.webp`; ASSETS['pose-m-' + k] = `img/pose/m-${k}.webp`; }

const hasPose = (d, p) => !!(d && POSE_META[d.el + '-' + p]);
/* Kesik kenar kuralı: çizimi görsel sınırında kesilmiş pozlar (ör. P3 baş yakın planı) asla ortada "yarım" görünmez.
   Kesik kenar(lar) hangi yöndeyse o yöndeki çerçeve kenarına, çerçevenin biraz dışına yaslanır.
   Üst ve alt birlikte kesikse çizim çerçeve yüksekliğini aşacak boyda verilir. Ayna çevrilince sağ/sol yer değiştirir. */
function poseEdgeStyle(d, p, face) {
  const M = POSE_META[d.el + '-' + p]; let c = (M && M[2]) || '';
  if (!c) return '';
  if (face && face !== poseFace(d, p)) c = c.replace(/[lr]/g, x => x === 'l' ? 'r' : 'l');
  if (!/[lr]/.test(c)) return ''; // yalnız üstten/alttan kesikse yatayda serbest: poseVCut ile kutuya sığdırılır
  const st = ['width:auto', 'height:' + (c.includes('t') && c.includes('b') ? 114 : 99) + '%'];
  st.push(c.includes('t') && !c.includes('b') ? 'top:-5%;bottom:auto' : 'bottom:-5%;top:auto');
  st.push(c.includes('l') ? 'left:-4%;right:auto' : 'right:-4%;left:auto');
  return st.join(';');
}
// Yalnız üstten ve/veya alttan kesik pozlar: kutuya sığdırılır, kesik kenar çerçevenin %5 dışına taşar
function poseVCut(d, p) { const M = POSE_META[d.el + '-' + p], c = (M && M[2]) || ''; return /[lr]/.test(c) ? '' : c; }
function poseBox(d, p, box) { // box: "sol,üst,en,boy,hiza"; dikey kesikte üst/alt kenar dışarı uzatılır
  const v = poseVCut(d, p); if (!v) return box;
  let [l, t, w, h, al] = box.split(','); l = +l; t = +t; w = +w; h = +h;
  if (v.includes('b')) { h = 105 - t; } if (v.includes('t')) { h = h + t + 5; t = -5; }
  return [l, t, w, h, al || 'c', v.includes('b') ? 'b' : v.includes('t') ? 't' : ''].join(',');
}
// o.face: 'r' | 'l' — ejderhanın bakacağı yön; o.cls: ek sınıf
function poseSVG(d, p, o = {}) {
  const key = d.el + '-' + p, M = POSE_META[key];
  if (!M) return dragonSVG(d, { still: true, cls: o.cls });
  const [W, H] = M, u = 'q' + (++SVGUID);
  const pig = !d.dead ? pigOf(d) : 'N';
  const pigF = { N: '', a: ` url(#${u}alb) brightness(1.08)`, m: ' brightness(.5) saturate(.85) contrast(1.2)', am: ' saturate(.45) brightness(.82)' }[pig];
  const albF = pig === 'a' ? `<filter id="${u}alb" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".07"/><feComponentTransfer><feFuncR type="gamma" exponent=".42" amplitude="1.02"/><feFuncG type="gamma" exponent=".44" amplitude="1"/><feFuncB type="gamma" exponent=".5" amplitude=".97"/></feComponentTransfer></filter>` : '';
  const f = d.dead ? 'grayscale(1) brightness(.55)' : ((d.hue ? `hue-rotate(${d.hue * 1.4}deg)` : '') + pigF + (d.old && !d.retired ? ' saturate(.55) sepia(.18) brightness(1.04)' : '')).trim() || 'none';
  const flip = o.face && o.face !== poseFace(d, p) ? `transform="translate(${W},0) scale(-1,1)"` : '';
  const look = d.dead ? '' : lookLayers(d, 0, 0, W, H, u, pig, { still: o.still, mk: asset('pose-m-' + key), mr: `x="0" y="0" width="${W}" height="${H}"` });
  return `<svg viewBox="0 0 ${W} ${H}" class="pose ${o.cls || ''}" role="img" aria-label="${esc(d.name || 'ejderha')}">${albF ? `<defs>${albF}</defs>` : ''}
    <g ${flip}><g style="filter:${f};isolation:isolate"><image href="${asset('pose-' + key)}" x="0" y="0" width="${W}" height="${H}"/>${look}</g></g></svg>`;
}
// Rakipler için genli sahte ejderha (görünüş genleri yarış kaydında saklanır, her seferinde aynı görünür)
function poseDragon(x, id) {
  if (!x.gx) x.gx = randLook();
  if (x.hue == null) x.hue = ri(-9, 9);
  return { id, name: x.name, el: x.el, stage: 'yetiskin', st: { gu: 60, ce: x.ce || 60, da: x.da || 60, ze: 60 }, hue: x.hue, gx: x.gx, pat: x.pat || 'd' };
}
