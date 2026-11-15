/* Ejder Ocağı 2.0 · çekirdek uyarlayıcı
   2.0 arayüzü oyunun KENDİ kurallarıyla çalışır: js/data.js, js/core.js, js/week.js ve diğer mantık dosyaları buraya
   olduğu gibi yüklenir (fiyat, ödül, olasılık ve kayıt biçimi değişmez; eski kayıtlar 2.0'da açılır).
   O dosyalar eski arayüzün birkaç küreselini bekler; bu dosya onları 2.0 karşılıklarıyla sağlar.
   Bilerek IIFE değildir: buradaki adlar mantık dosyalarının göreceği ortak küresel alanda durmalıdır. */
'use strict';
const UI = { view: 'ocak', sel: null, tile: null, drawer: null, arenaTier: 'koy', arm: null };
const ACT = {};
const EO2_BUS = { render: null, toast: null, sfx: null };          // js/oyun.js doldurur
function render() { if (EO2_BUS.render) EO2_BUS.render(); }
function toast(html, kind) { if (EO2_BUS.toast) EO2_BUS.toast(html, kind); }
const SFX = { on: true, play(k) { if (EO2_BUS.sfx) EO2_BUS.sfx(k); }, toggle() {}, setVol() {}, getVol: () => 1, preload() {}, setBase() {} };
const FX = new Proxy({}, { get: () => () => {} });
/* Müzik: 2.0'da parçaları eo2/js/audio.js çalar (sahneye göre). Eski kurallar yalnız geçici hava ister (bağ sahnesi, veda);
   o istek oraya iletilir, eski BGM'nin öteki çağrıları boş kalır. */
const BGM = new Proxy({ mood(m) { const a = window.EO2 && window.EO2.audio; if (a && a.hal) a.hal(m); } }, { get: (t, k) => t[k] || (() => {}) });
/* $ ve $$: eski çizim katmanı bir gölge kökte barındırılıyorsa (eski.js) önce orada aranır */
const $ = s => (window.EO2_GOLGE && window.EO2_GOLGE.querySelector(s)) || document.querySelector(s), $$ = s => window.EO2_GOLGE ? [...window.EO2_GOLGE.querySelectorAll(s)] : [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// ui() simge üreteci js/art.js içinden gelir (çizgi roman kareleri kullanır)
const goldTxt = n => '<b class="au">' + n + ' altın</b>';
let modalOn = false; const MQ = [];
function pushModal(fn) { if (window.EO2_ESKI && typeof fn === 'function') fn(); } function showModal(html, cls) { if (window.EO2_MODAL) return window.EO2_MODAL(html, cls || ''); if (window.EO2_ESKI) window.EO2_ESKI.show(html, cls || ''); } function closeModal() { if (window.EO2_MODAL_KAPAT) return window.EO2_MODAL_KAPAT(); if (window.EO2_ESKI) window.EO2_ESKI.close(); }
function shake(el, strong) { if (!el) return; el.classList.remove('shake', 'shake2'); void el.offsetWidth; el.classList.add(strong ? 'shake2' : 'shake'); } function nextModal() {} function vn() {}
function poseFlash() {} function flashPlace() {} function typeInto() {}
/* Her oyuncu eyleminden sonra: kariyer ve hikâye denetimi, hedef ödülleri, kayıt, ekran tazeleme (eski afterAction ile aynı sıra). */
function afterAction(keep) {
  if (typeof careerCheck === 'function' && S && !S.over) careerCheck(false);
  if (typeof storyFlush === 'function') storyFlush();
  const got = checkGoals();
  for (const g of got) toast('<b>Hedef tamamlandı</b> ' + g.t + ' <b class="au">+' + g.r + ' altın</b>', 'goal');
  saveGame();
  if (!keep) render();
}

function canAct(d) { return !d.inj && !d.task; }
function clearPartner(d) { if (d.task && d.task.p) { const P = byId(d.task.p); if (P && P.task && P.task.p === d.id) P.task = null; } }
