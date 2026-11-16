/* Ejder Ocağı 2.0 · Hesap yedeği ve kurtarma (EO2.hesap)
   Sunucu tarafı: server/account_recovery.js, /api/save, /api/session/recovery, /api/session/recover.
   Oyun kuralı içermez. Sunucu yedeği okumaz ve ekonomi için kullanmaz; yalnız sahibine geri verir.

   NE YAPAR
   1) Yedek: yerel kayıt her yazıldığında (saveGame) kısa bir süre sonra hesaba yedeklenir. Başka bir cihaz aynı hesaba daha yeni
      bir yedek yazmışsa sessizce ezilmez; oyuncu menüden hangisinin kalacağını seçer.
   2) Kurtarma kodu: menüden alınır, bir kez gösterilir. Kodu bilen, başka tarayıcıda aynı hesaba girer.
   3) Kodla geri yükleme: giriş ekranından ya da menüden. Hesaba bağlanır, hesaptaki ocağı bu tarayıcıya yazar ve sayfayı yeniler.
      Bu tarayıcıdaki ocak önce yedek yuvasına alınır (menü → "Önceki ocağı geri al"). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, K = EO2 && EO2.kayit;
  if (!G || !AG || !K) return;
  const BILINEN = 'eo2.yedekAt', ARA = 45000, GECIKME = 12000;
  const depo = { al(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const soyle = (html, tur) => { if (typeof toast === 'function') toast(html, tur); };
  let mesgul = false, sonMetin = '', sonZaman = 0, zamanlayici = 0, durum = 'bekliyor', uyarildi = false;   // durum: bekliyor | tamam | cakisma | hata

  async function istek(yol, govde, method) {
    let r, j = null;
    try { r = await fetch(yol, { method: method || (govde ? 'POST' : 'GET'), credentials: 'same-origin', headers: govde ? { 'Content-Type': 'application/json' } : undefined, body: govde ? JSON.stringify(govde) : undefined }); try { j = await r.json(); } catch (_) { j = null; } }
    catch (_) { throw Object.assign(new Error('baglanti_yok'), { code: 'baglanti_yok', status: 0 }); }
    if (!r.ok || !j || j.ok === false) throw Object.assign(new Error((j && j.error) || 'sunucu_hatasi'), { code: (j && j.error) || 'sunucu_hatasi', status: r.status });
    return j;
  }
  const hesap = () => { const e = AG.kese(); return e && e.accountId ? e.accountId : null; };
  function bilinen() { try { const b = JSON.parse(depo.al(BILINEN) || 'null'), a = hesap(); return b && a && b.acct === a && Number.isSafeInteger(b.at) ? b.at : null; } catch (_) { return null; } }
  const bilinenYaz = at => { const a = hesap(); if (a) depo.yaz(BILINEN, JSON.stringify({ acct: a, at })); };

  /* ---------- yedek ---------- */
  async function yedekle(zorla) {
    if (mesgul || !AG.cevrimici() || !hesap()) return false;
    if (durum === 'cakisma' && !zorla) return false;
    if (G.live && typeof S !== 'undefined' && S && !S.ocakId) return false;   // ocak henüz hesaba bağlanmadı: kimliksiz kayıt yedeklenmez (başka cihazda ayrı ocak sayılırdı)
    const metin = K.ham(); if (!metin) return false;
    if (!zorla && metin === sonMetin) return true;
    mesgul = true;
    try {
      const govde = { save: metin }; if (!zorla) govde.expected = bilinen();
      const j = await istek('/api/save', govde);
      bilinenYaz(j.savedAt); sonMetin = metin; sonZaman = Date.now(); durum = 'tamam'; return true;
    } catch (e) {
      if (e.code === 'save_conflict') { durum = 'cakisma'; if (!uyarildi && G.live) { uyarildi = true; soyle('Hesabındaki yedek başka bir cihazda güncellenmiş. Menüden hangisinin kalacağını seç.'); } }
      else durum = 'hata';
      return false;
    } finally { mesgul = false; }
  }
  function planla() { if (zamanlayici) return; zamanlayici = setTimeout(() => { zamanlayici = 0; yedekle(false); }, Math.max(GECIKME, ARA - (Date.now() - sonZaman))); }
  if (typeof window.saveGame === 'function') { const kaydet0 = window.saveGame; window.saveGame = function () { const r = kaydet0.apply(this, arguments); if (G.live) planla(); return r; }; }   // eslint-disable-line no-global-assign
  AG.dinle('durum', d => { if (d === 'cevrimici' && G.live) planla(); });

  /* ---------- hesaptaki ocağı bu tarayıcıya yaz ---------- */
  async function hesaptanYukle() {
    const j = await istek('/api/save');
    if (!j.save) return { yok: true };
    const c = K.coz(j.save); if (c.hata) return { bozuk: true };
    if (G.live && typeof saveGame === 'function') { try { saveGame(); } catch (_) { } }
    K.yedekle('hesaptan yükleme');
    if (!depo.yaz(K.anahtar(), JSON.stringify(c.kayit))) return { yazilamadi: true };
    return { ok: true, savedAt: j.savedAt };   // bilinen yedek zamanını çağıran yazar (kurtarmada hesap değişmiştir)
  }
  const yenile = () => { G.live = false; setTimeout(() => location.reload(), 900); };

  /* ---------- kurtarma kodu ---------- */
  async function kodAl() {
    if (!AG.cevrimici() || !hesap()) { await G.pen({ k: 'Hesap', t: 'Bağlantı gerekiyor', body: '<p>Kurtarma kodu sunucudan alınır. Bağlantı gelince yeniden dene.</p>', btns: [{ t: 'Tamam', cls: 'altin' }] }); return; }
    const v = await G.pen({ k: 'Hesap', t: 'Kurtarma kodu', body: '<p>Kurtarma kodu, ocağına başka bir tarayıcıdan ya da çerezlerin silindikten sonra yeniden girmeni sağlar.</p><p><b>Kodu bilen herkes ocağına girebilir.</b> Yeni kod alırsan önceki kod geçersiz olur.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Kod oluştur', cls: 'altin', v: true }] });
    if (!v) return;
    if (durum !== 'cakisma') await yedekle(false);
    let kod; try { kod = (await istek('/api/session/recovery', {})).code; }
    catch (e) { await G.pen({ k: 'Hesap', t: 'Kod alınamadı', body: '<p>' + (e.status === 429 ? 'Kısa sürede çok kod istedin. Bir saat sonra yeniden dene.' : e.status ? 'Sunucu kodu veremedi. Biraz sonra yeniden dene.' : 'Bağlantı yok.') + '</p>', btns: [{ t: 'Tamam', cls: 'altin' }] }); return; }
    await G.pen({ k: 'Hesap', t: 'Kurtarma kodun', body: '<div class="hs-kod" aria-label="Kurtarma kodu">' + esc(kod) + '</div><p>Bu kodu güvenli bir yere yaz. <b>Bir daha gösterilmez.</b> Başka bir tarayıcıda giriş ekranındaki <b>Kurtarma kodum var</b> bağlantısına yaz.</p><p class="hs-durum" role="status" aria-live="polite"></p>',
      btns: [{ t: 'Kopyala', fn(p) { const d = p.querySelector('.hs-durum'); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(kod) : Promise.reject()).then(() => { d.textContent = 'Kod panoya kopyalandı.'; }, () => { d.textContent = 'Kopyalanamadı; kodu elle yaz.'; }); return false; } }, { t: 'Yazdım, kapat', cls: 'altin', v: true }] });
  }

  /* ---------- kodla geri yükleme ---------- */
  async function geriYukle() {
    const yerelVar = !!K.ham();
    let girilen = null;
    const v = await G.pen({ k: 'Hesap', t: 'Kurtarma kodunla gir', body: '<div class="hs-gir"><p>Kurtarma kodunu yaz. ' + (yerelVar ? '<b>Bu tarayıcıdaki ocağın yerini hesabındaki ocak alır</b>; buradaki ocak yedeklenir ve menüden bir kez geri alınabilir.' : 'Hesabındaki ocak bu tarayıcıya yüklenir.') + '</p>' +
      '<input class="hs-kutu" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" aria-label="Kurtarma kodu"><p class="hs-durum" role="status" aria-live="polite"></p></div>',
      on(p) { const k = p.querySelector('.hs-kutu'); setTimeout(() => k.focus(), 60); for (const ad of ['keydown', 'keyup', 'keypress']) k.addEventListener(ad, e => e.stopPropagation()); },
      btns: [{ t: 'Vazgeç', v: false }, { t: 'Gir', cls: 'altin', fn(p, done) {
        const k = p.querySelector('.hs-kutu'), d = p.querySelector('.hs-durum'), kod = k.value.trim();
        if (kod.replace(/[^A-Za-z0-9]/g, '').length !== 24) { d.textContent = 'Kod 24 karakterdir; eksik ya da fazla yazılmış.'; k.focus(); return false; }
        if (mesgul) return false; mesgul = true; d.textContent = 'Denetleniyor…';
        istek('/api/session/recover', { code: kod }).then(j => { girilen = j; done(true); }, e => { d.textContent = e.status === 404 ? 'Bu kod tanınmadı. Yazımı denetle; yeni kod alındıysa eskisi geçmez.' : e.status === 429 ? 'Çok deneme yapıldı. On dakika sonra yeniden dene.' : e.status ? 'Sunucu yanıt vermedi. Biraz sonra yeniden dene.' : 'Bağlantı yok.'; }).finally(() => { mesgul = false; });
        return false; } }] });
    if (!v || !girilen) return;
    // oturum artık kurtarılan hesabın; hesaptaki ocak yazılır ve sayfa yenilenir (bellekteki eski hesap durumu kalmasın)
    let s; try { s = await hesaptanYukle(); } catch (_) { s = { hata: true }; }
    if (s && s.ok) depo.yaz(BILINEN, JSON.stringify({ acct: girilen.accountId, at: s.savedAt })); else { try { localStorage.removeItem(BILINEN); } catch (_) { } }
    await G.pen({ k: 'Hesap', t: s && s.ok ? 'Ocağın geri geldi' : 'Hesaba girildi', body: '<p>' + (s && s.ok ? 'Hesabındaki ocak bu tarayıcıya yüklendi. Oyun şimdi yeniden açılacak.' : s && s.yok ? 'Hesaba girildi, ama bu hesapta yedeklenmiş bir ocak yok. Altının ve hesap malların yerinde; oyun yeniden açılacak.' : 'Hesaba girildi, ama ocağın yedeği okunamadı. Oyun yeniden açılacak; menüden yeniden deneyebilirsin.') + '</p>', btns: [{ t: 'Tamam', cls: 'altin' }] });
    yenile();
  }

  /* ---------- çakışma: hangisi kalsın ---------- */
  async function cakismaCoz() {
    const v = await G.pen({ k: 'Hesap', t: 'İki ayrı ocak var', dikey: true, body: '<p>Hesabındaki yedek başka bir cihazda güncellenmiş; bu tarayıcıdaki ocak ondan farklı. Hangisi kalsın?</p>',
      btns: [{ t: 'Hesaptaki ocağı yükle', cls: 'altin', sub: 'Buradaki ocak yedek yuvasına alınır', v: 'hesap' }, { t: 'Buradaki ocağı yedekle', sub: 'Hesaptaki yedeğin yerini alır', v: 'burasi' }, { t: 'Şimdi değil', v: false }] });
    if (v === 'burasi') { const ok = await yedekle(true); uyarildi = false; soyle(ok ? 'Buradaki ocak hesabına yedeklendi.' : 'Yedeklenemedi; bağlantını denetle.'); G.redraw(); }
    else if (v === 'hesap') { let s; try { s = await hesaptanYukle(); } catch (_) { s = null; } if (s && s.ok) { bilinenYaz(s.savedAt); soyle('Hesaptaki ocak yüklendi; oyun yeniden açılıyor.'); yenile(); } else soyle('Hesaptaki ocak okunamadı.'); }
  }

  /* ---------- menü satırı (defter.js çağırır) ---------- */
  function zamanYazi(t) { const dk = Math.round((Date.now() - t) / 60000); return dk < 1 ? 'az önce' : dk < 60 ? dk + ' dakika önce' : dk < 1440 ? Math.round(dk / 60) + ' saat önce' : Math.round(dk / 1440) + ' gün önce'; }
  function menu() {
    const cevrim = AG.cevrimici() && !!hesap(), at = bilinen();
    const yazi = !cevrim ? 'Hesap yedeği: bağlantı yok' : durum === 'cakisma' ? 'Hesaptaki yedek başka cihazda güncellenmiş' : at ? 'Hesaba yedeklendi · ' + zamanYazi(at) : 'Hesap yedeği: ilk kayıtta alınır';
    return '<div class="mk-hesap"><span class="hs-yazi' + (durum === 'cakisma' ? ' uyari' : '') + '">' + yazi + '</span><div class="mk-islem">' +
      (durum === 'cakisma' && cevrim ? '<button type="button" class="gbtn kucuk altin" data-h="cakisma">Hangisi kalsın?</button>' : '<button type="button" class="gbtn kucuk" data-h="kod"' + (cevrim ? '' : ' disabled') + '>Kurtarma kodu</button>') +
      '<button type="button" class="gbtn kucuk" data-h="gir">Kodla gir</button></div></div>';
  }
  function tikla(k) { if (k === 'kod') return kodAl(); if (k === 'gir') return geriYukle(); if (k === 'cakisma') return cakismaCoz(); }

  EO2.hesap = { yedekle, kodAl, geriYukle, menu, tikla, durum: () => ({ durum, bilinen: bilinen(), hesap: hesap() }) };
})();
