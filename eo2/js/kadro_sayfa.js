/* Ejder Ocağı 2.0 · ejderha listelerinde sayfa düğmeleri (2026-11-21 oyuncu geri bildirimi)
   Kalabalık ocakta ejderha listesi ekrana sığmıyordu: arenada liste ekrandan taşıyor, kaydırılamıyordu; oyuncu yıldızını
   seçebilmek için ejderha satıyordu. Artık bütün ejderha seçim listeleri (ahır, yuva, arena, kule, yarış, saray, sefer,
   süs dolabı, diyar) aynı davranır:
   - Yıldız ejderha her zaman listenin başındadır ve her sayfada orada sabit durur.
   - Liste sığmazsa kaydırma yerine yukarı ve aşağı (dik telefonda sola ve sağa) ok düğmeleri çıkar; liste sayfa sayfa gezilir.
   - Sayfa, aynı ekranda yeniden çizimde (bir ejderha seçince) yerinde kalır; ekran ilk açılınca seçili ejderhanın sayfası açılır.
   Yalnız gösterim: hangi ejderhanın seçili olduğu ve seçim kuralları ekranların kendisindedir. */
(function () {
  'use strict';
  const EO2 = window.EO2;
  const SEC = '.ah-kadro, .ar-kadro, .sf-kadro, .sd-kadro, .yu-kadro';
  const SAYFA = {};                                   // ekran + liste → açık sayfa
  const kimlik = b => { const d = b.dataset; return +(d.id || d.sel || d.esc || d.b || d.d || 0); };
  const yildizId = () => { try { const s = typeof ensureStar === 'function' ? ensureStar() : null; return s ? s.id : (window.S && S.star) || null; } catch (e) { return null; } };
  /* öğenin kutu içindeki yeri (dönüşümler sayılmaz: ekran açılırken oynayan ölçek animasyonu ölçüyü bozmasın) */
  const ust = (e, kok) => { let y = 0, x = 0; for (let n = e; n && n !== kok; n = n.offsetParent) { y += n.offsetTop; x += n.offsetLeft; } return { y, x }; };
  const OK = yon => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ({ yukari: 'M6 15l6-6 6 6', asagi: 'M6 9l6 6 6-6', sol: 'M15 6l-6 6 6 6', sag: 'M9 6l6 6-6 6' })[yon] + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function sayfala(govde, ekran, ilk) {
    const yid = yildizId();
    govde.querySelectorAll(SEC).forEach((k, ki) => {
      const ogeler = [...k.children].filter(b => b.classList.contains('madalyon'));
      if (!ogeler.length) return;
      /* 1. yıldız başa */
      const yb = yid != null ? ogeler.find(b => kimlik(b) === yid) : null;
      if (yb && ogeler[0] !== yb) { k.insertBefore(yb, ogeler[0]); ogeler.splice(ogeler.indexOf(yb), 1); ogeler.unshift(yb); }
      if (yb) { yb.classList.add('kadro-yildiz'); if (!yb.querySelector('.yildiz')) yb.insertAdjacentHTML('beforeend', '<i class="yildiz" aria-hidden="true">★</i>'); }   // her listede yıldız işareti
      if (ogeler.length < 3) return;
      /* 2. sığıyor mu? yön ve adım, ilk iki öğenin yerinden */
      const a = ust(ogeler[0], govde), b = ust(ogeler[1], govde), yatay = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
      const adim = yatay ? b.x - a.x : b.y - a.y; if (adim <= 4) return;
      const kb = ust(k, govde), boy = yatay ? ogeler[0].offsetWidth : ogeler[0].offsetHeight;
      const tasar = yatay ? k.scrollWidth > k.clientWidth + 2 : k.scrollHeight > k.clientHeight + 2;
      /* kutunun kendi boyu varsa (kaydırmalı liste) o; yoksa ekranın dibine (ya da sağına) kadar, alttaki düğmelere pay bırakılarak */
      const pay = parseFloat(getComputedStyle(govde).fontSize) || 16;
      const yer = tasar ? (yatay ? k.clientWidth : k.clientHeight) : (yatay ? govde.clientWidth - kb.x - pay : govde.clientHeight - kb.y - pay);
      const ilkKonum = (yatay ? a.x : a.y) - (yatay ? kb.x : kb.y);
      const sigan = Math.floor((yer - ilkKonum - boy) / adim) + 1;
      if (sigan >= ogeler.length && !tasar) return;
      /* 3. şerit ve oklar kurulur, sonra gerçek ölçüleriyle bir sayfaya kaç ejderha sığdığı hesaplanır.
         Sıra: ok (geri) · yıldız · sayfanın ejderhaları · ok (ileri). Yıldız her sayfada başta kalır. */
      const alan = tasar ? (yatay ? k.clientWidth : k.clientHeight) : yer - ilkKonum;   // şerit sınıfı eklenmeden önce ölçülür (şerit içeriği kadar uzar)
      k.classList.add('kadro-sayfali', yatay ? 'kadro-yatay' : 'kadro-dik'); k.scrollTop = 0; k.scrollLeft = 0;
      const geri = document.createElement('button'), ileri = document.createElement('button');
      geri.type = ileri.type = 'button'; geri.className = 'kadro-ok geri'; ileri.className = 'kadro-ok ileri';
      geri.innerHTML = OK(yatay ? 'sol' : 'yukari') + '<small></small>'; ileri.innerHTML = OK(yatay ? 'sag' : 'asagi') + '<small></small>';
      geri.setAttribute('aria-label', 'Önceki ejderhalar'); ileri.setAttribute('aria-label', 'Sonraki ejderhalar');
      k.insertBefore(geri, k.firstChild); k.appendChild(ileri);
      const cs = getComputedStyle(k), dolgu = yatay ? parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const okBoy = (yatay ? geri.offsetWidth : geri.offsetHeight) + Math.max(0, adim - boy);
      const n = Math.max(2, Math.floor((alan - dolgu - 2 * okBoy - boy) / adim) + 1);
      const sabit = yb ? 1 : 0, diger = ogeler.slice(sabit), sayfaBas = Math.max(1, n - sabit), toplam = Math.ceil(diger.length / sayfaBas);
      if (toplam <= 1) { geri.remove(); ileri.remove(); k.classList.remove('kadro-sayfali', 'kadro-yatay', 'kadro-dik'); return; }
      const an = ekran + ':' + k.className.split(' ')[0] + ':' + ki;
      let s = SAYFA[an] || 0;
      if (ilk || SAYFA[an] == null) { const sec = diger.findIndex(b => b.getAttribute('aria-pressed') === 'true'); if (sec >= 0) s = Math.floor(sec / sayfaBas); }
      s = Math.max(0, Math.min(toplam - 1, s)); SAYFA[an] = s;
      const goster = () => { const s = SAYFA[an], ilk0 = s * sayfaBas, son = ilk0 + sayfaBas;
        diger.forEach((b, i) => b.classList.toggle('kadro-gizli', i < ilk0 || i >= son));
        const once = ilk0, sonra = Math.max(0, diger.length - son);
        geri.disabled = s <= 0; ileri.disabled = s >= toplam - 1;
        geri.querySelector('small').textContent = once ? '+' + once : ''; ileri.querySelector('small').textContent = sonra ? '+' + sonra : '';
        geri.title = once ? once + ' ejderha daha (sayfa ' + (s + 1) + ' / ' + toplam + ')' : ''; ileri.title = sonra ? sonra + ' ejderha daha (sayfa ' + (s + 1) + ' / ' + toplam + ')' : ''; };
      const git = d => { const y = Math.max(0, Math.min(toplam - 1, SAYFA[an] + d)); if (y === SAYFA[an]) return; SAYFA[an] = y; goster(); if (EO2.audio && EO2.audio.ui) try { EO2.audio.ui(); } catch (e) { } };
      geri.addEventListener('click', e => { e.stopPropagation(); git(-1); }); ileri.addEventListener('click', e => { e.stopPropagation(); git(1); });
      let tek = 0; k.addEventListener('wheel', e => { e.preventDefault(); const t = Date.now(); if (Math.abs(e.deltaY) < 8 || t - tek < 350) return; tek = t; git(e.deltaY > 0 ? 1 : -1); }, { passive: false });   // fare tekerleği de sayfa çevirir
      goster();
    });
  }
  EO2.kadroSayfa = sayfala;
})();
