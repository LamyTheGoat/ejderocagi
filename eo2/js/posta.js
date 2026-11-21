/* Ejder Ocağı 2.0 · Ocak Postası ve zil (EO2.posta)
   Sen yokken olanlar: Bedesten'de satılan ilanlar ve bekleyen dostluk istekleri (server/posta_service.js, GET /api/posta).
   Posta yalnız haber verir: satış altını satış anında keseye girmiştir; burada "al" düğmesi yoktur.
   Okundu bilgisi bu tarayıcıda, hesaba göre tutulur (eo2/docs/GERI_CAGIRMA_KARARI.md). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  const P = { satirlar: [], hata: '', cekildi: 0, girisDuyuru: false };
  const ARA_MS = 5 * 60 * 1000;
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const anahtar = () => 'eo2-posta-okundu:' + ((AG.kimlik() || {}).accountId || '');
  const okundu = () => { try { return +localStorage.getItem(anahtar()) || 0; } catch (_) { return 0; } };
  const okunduYaz = t => { try { localStorage.setItem(anahtar(), String(t)); } catch (_) { } };
  const yeniler = () => { const o = okundu(); return P.satirlar.filter(s => s.t > o); };
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');
  const iki = n => String(n).padStart(2, '0');
  function zaman(t) { if (!t) return ''; const dk = Math.round((Date.now() - t) / 60000); if (dk < 1) return 'az önce'; if (dk < 60) return dk + ' dk önce'; if (dk < 1440) return Math.round(dk / 60) + ' saat önce';
    const g = Math.round(dk / 1440); if (g < 7) return g + ' gün önce'; const d = new Date(t); return iki(d.getDate()) + '.' + iki(d.getMonth() + 1); }
  function neAd(s) { if (s.cins === 'food') { const f = typeof FOODS !== 'undefined' && FOODS[s.yem]; return (f && f.ad) || 'Yem'; } return s.ne || 'Mal'; }

  function rozet() { const b = document.getElementById('btnBell'); if (!b) return; const n = yeniler().length;
    b.classList.add('posta-hazir'); b.classList.toggle('yeni-var', n > 0); if (n > 0) b.dataset.say = n > 9 ? '9+' : n; else delete b.dataset.say;
    b.setAttribute('aria-label', n ? 'Posta, ' + n + ' yeni haber' : 'Posta'); }

  function duyur() { if (P.girisDuyuru) return; P.girisDuyuru = true; const s = yeniler().filter(x => x.tur === 'satis'); if (!s.length) return;
    const altin = s.reduce((a, x) => a + x.altin, 0); G.toast('<b>Sen yokken ' + s.length + ' satış</b>: ' + sayi(altin) + ' altın keseye girdi. Zile bak.'); }

  async function cek(zorla) { if (!AG.cevrimici()) return; if (!zorla && Date.now() - P.cekildi < 30000) return; P.cekildi = Date.now();
    try { P.satirlar = (await AG.istek('/api/posta')).satirlar || []; P.hata = ''; } catch (e) { P.hata = e && e.status === 429 ? 'Biraz bekle.' : 'Posta şu an okunamadı.'; }
    rozet(); duyur(); }

  function satirHtml(s, yeni) {
    const c = yeni ? ' yeni' : '';
    if (s.tur === 'satis') return '<li class="po-satir' + c + '"><i class="po-ik altin"></i><div><b>' + esc_(neAd(s)) + (s.adet > 1 ? ' × ' + sayi(s.adet) : '') + ' satıldı</b><span>' + (s.alici ? esc_(s.alici) + ' aldı · ' : '') + '+' + sayi(s.altin) + ' altın keseye girdi' + (s.bitti ? ' · ilan kapandı' : '') + '</span></div><small>' + zaman(s.t) + '</small></li>';
    return '<li class="po-satir' + c + '"><i class="po-ik dost"></i><div><b>' + esc_(s.ad) + ' dostluk istedi</b><span>' + esc_(s.h) + '</span></div><small>' + zaman(s.t) + '</small><button type="button" class="gbtn kucuk" data-po="dostlar">Bak</button></li>';
  }
  async function ac() {
    await cek(true);
    const o = okundu(), L = P.satirlar, enSon = L.reduce((a, s) => Math.max(a, s.t || 0), o);
    const govde = '<div class="posta">' + (P.hata ? '<p class="po-hata">' + esc_(P.hata) + '</p>' : '') +
      (L.length ? '<ul class="po-liste kay">' + L.map(s => satirHtml(s, s.t > o)).join('') + '</ul>'
        : '<p class="bos">Posta boş. Bedesten\'e bir ilan koy; sen yokken satılırsa haberi buraya gelir.</p>') +
      '<p class="dip">Son 14 gün. Satış altını satış anında keseye girer; burada alınacak bir şey yok.</p></div>';
    okunduYaz(enSon); rozet();
    await G.pen({ k: 'Sen yokken', t: 'Ocak Postası', body: govde,
      on(p, done) { p.querySelectorAll('[data-po]').forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); done(true); G.open(b.dataset.po); })); } });
  }

  AG.dinle('durum', d => { if (d === 'cevrimici') cek(true); });
  AG.dinle('sosyal', () => cek(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cek(); });
  setInterval(() => { if (document.visibilityState === 'visible') cek(true); }, ARA_MS);
  if (AG.cevrimici()) cek(true);
  EO2.posta = { ac, cek, yeniSayisi: () => yeniler().length };
})();
