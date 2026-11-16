/* Ejder Ocağı 2.0 · Dostlar: arkadaş listesi ve fısıltı (EO2.dostlar)
   Sunucu tarafı: server/social_service.js (/api/social; canlı kanalda 'sosyal' dürtmesi ve 'ozel' mesajı).
   Arkadaşlık karşılıklıdır: istek yollanır, karşı taraf kabul eder. Fısıltı yalnız arkadaşlar arasında ve ikisi de çevrimiçiyken
   iletilir; sunucuda saklanmaz, bu tarayıcıda da yalnız oturum boyunca durur. Arkadaş kartından düello ve takas da çağrılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  const D = { veri: null, hata: '', mesgul: false, yazisma: new Map(), okunmamis: new Map(), acik: null, adGitti: '' };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HATA = { social_target_not_found: 'O terbiyeci bulunamadı.', social_already_friends: 'Zaten dostsunuz.', social_friend_limit: 'Dost listesi dolu.', social_pending_limit: 'Bekleyen çok istek var.', social_invalid_target: 'Bu terbiyeciye istek yollanamaz.', rate_limited: 'Çok hızlı gidiyorsun; biraz bekle.' };
  const hataYaz = e => HATA[e && e.code] || (e && e.status ? 'İşlem yapılamadı.' : 'Bağlantı yok.');
  const rozet = () => { const n = (D.veri ? D.veri.gelen.length : 0) + [...D.okunmamis.values()].reduce((a, b) => a + b, 0), b = document.querySelector('#actions button[data-panel="dostlar"]'), dh = document.getElementById('actionsDaha');
    for (const x of [b, dh]) if (x) { x.classList.toggle('yeni-var', n > 0); if (n > 0) x.dataset.say = n > 9 ? '9+' : n; else delete x.dataset.say; } };

  async function cek() { if (!AG.cevrimici()) return; try { D.veri = (await AG.istek('/api/social')).sosyal; D.hata = '';
      const ad = G.ad ? G.ad() : ''; if (ad && D.veri.ad !== ad && D.adGitti !== ad) { D.adGitti = ad; D.veri = (await AG.istek('/api/social', { method: 'POST', body: { type: 'ad', ad } })).sosyal; } }
    catch (e) { D.hata = hataYaz(e); } rozet(); ciz(); }
  async function komut(body, tamam) { if (D.mesgul) return false; D.mesgul = true;
    try { D.veri = (await AG.istek('/api/social', { method: 'POST', body })).sosyal; D.hata = ''; if (tamam) G.toast(tamam); return true; }
    catch (e) { D.hata = hataYaz(e); G.toast(D.hata, 'kotu'); return false; } finally { D.mesgul = false; rozet(); ciz(); } }
  const dostMu = h => !!(D.veri && D.veri.dostlar.some(d => d.h === h));
  const ekle = (h, ad) => komut({ type: 'istek', to: h, ad: G.ad ? G.ad() : '' }, 'Dostluk isteğin ' + esc_(ad || 'terbiyeciye') + ' gitti.');

  /* ---------- fısıltı ---------- */
  const dostOf = id => D.veri && D.veri.dostlar.find(d => d.id === id);
  function yaz(id, kim, x) { const L = D.yazisma.get(id) || []; L.push({ kim, x, t: Date.now() }); if (L.length > 60) L.shift(); D.yazisma.set(id, L); }
  AG.dinle('ozel', m => { if (!m || typeof m.x !== 'string') return;
    if (m.ben) { yaz(m.to, 'ben', m.x); fisCiz(); return; }
    const d = dostOf(m.from), ad = (d && d.ad) || m.ad || 'Dost'; yaz(m.from, 'o', m.x);
    if (D.acik === m.from) fisCiz(); else { D.okunmamis.set(m.from, (D.okunmamis.get(m.from) || 0) + 1); rozet(); G.toast('<b>' + esc_(ad) + '</b> fısıldadı: ' + esc_(m.x.slice(0, 60))); if (EO2.api) EO2.api.chatAdd('genel', ad + ' (fısıltı)', m.x); if (EO2.audio && EO2.audio.pop) EO2.audio.pop(); ciz(); } });
  AG.dinle('ozel_red', m => { const N = { hiz: 'Çok hızlı yazıyorsun; biraz bekle.', cevrimdisi: 'Dostun şu an çevrimdışı; fısıltı ulaşmadı.', dost_degil: 'Fısıltı yalnız dostlara gider.' }; const d = document.querySelector('.ds-fis-durum'); if (d) d.textContent = N[m && m.neden] || 'Fısıltı gitmedi.'; else G.toast(N[m && m.neden] || 'Fısıltı gitmedi.'); });
  AG.dinle('sosyal', () => cek());
  function fisCiz() { const kutu = document.querySelector('.ds-fis-akis'); if (!kutu || !D.acik) return; const L = D.yazisma.get(D.acik) || [];
    kutu.innerHTML = L.length ? L.map(z => '<p class="' + z.kim + '"><span>' + esc_(z.x) + '</span></p>').join('') : '<p class="bos">Henüz bir şey yazılmadı. Fısıltılar saklanmaz; yalnız bu oturumda görünür.</p>'; kutu.scrollTop = kutu.scrollHeight; }
  async function fisilda(id) { const d = dostOf(id); if (!d) return; D.acik = id; D.okunmamis.delete(id); rozet();
    await G.pen({ k: 'Fısıltı', t: esc_(d.ad), body: '<div class="ds-fis"><div class="ds-fis-akis kay"></div><form class="ds-fis-form"><input class="ds-fis-gir" maxlength="120" placeholder="' + (d.cevrimici ? 'Fısılda…' : 'Dostun çevrimdışı') + '" autocomplete="off" aria-label="Fısıltı"><button type="submit" class="gbtn kucuk altin">Gönder</button></form><p class="ds-fis-durum" role="status" aria-live="polite"></p></div>',
      on(p) { fisCiz(); const f = p.querySelector('.ds-fis-form'), g = p.querySelector('.ds-fis-gir'); for (const ad of ['keydown', 'keyup', 'keypress']) g.addEventListener(ad, e => e.stopPropagation()); setTimeout(() => g.focus(), 60);
        f.addEventListener('submit', e => { e.preventDefault(); const x = g.value.trim(); if (!x) return; p.querySelector('.ds-fis-durum').textContent = ''; if (AG.gonder({ type: 'ozel', to: id, x: x.slice(0, 120) })) g.value = ''; else p.querySelector('.ds-fis-durum').textContent = 'Bağlantı yok.'; }); },
      btns: [{ t: 'Kapat', v: true }] });
    D.acik = null; ciz(); }

  /* ---------- ekran ---------- */
  G.screen('dostlar', { k: 'Terbiyeciler', t: 'Dostlar', cls: 'ds', bg: 'bg-meydan', enter() { cek(); }, draw(body) {
    const v = D.veri, cevrim = AG.cevrimici();
    if (!cevrim) { body.innerHTML = '<div class="ar-kilit bos"><p>Dost listesi çevrimiçi çalışır. Sunucuya ulaşılınca burada görünür.</p></div>'; return; }
    if (!v) { body.innerHTML = '<div class="ar-kilit bos"><p>Dostların çağrılıyor…</p></div>'; return; }
    const dost = d => { const n = D.okunmamis.get(d.id) || 0; return '<article class="ds-kart' + (d.cevrimici ? ' acik' : '') + '"><span class="ds-yuz"><img alt="" src="assets/ik/mdl-sosyal.webp"><i class="ds-isik" title="' + (d.cevrimici ? 'Çevrimiçi' : 'Çevrimdışı') + '"></i></span><div class="ds-ad"><b>' + esc_(d.ad) + '</b><small>' + (d.cevrimici ? 'Çevrimiçi' : 'Çevrimdışı') + '</small></div>' +
      '<div class="ds-eylem"><button type="button" class="gbtn kucuk' + (n ? ' altin' : '') + '" data-d="fis" data-id="' + d.id + '">Fısılda' + (n ? ' · ' + n : '') + '</button><button type="button" class="gbtn kucuk" data-d="ejder" data-id="' + d.id + '" ' + (d.cevrimici ? '' : 'disabled') + '>Ejderha düellosu</button><button type="button" class="gbtn kucuk" data-d="topcu" data-id="' + d.id + '" ' + (d.cevrimici ? '' : 'disabled') + '>Topçu düellosu</button><button type="button" class="gbtn kucuk" data-d="takas" data-id="' + d.id + '" ' + (d.cevrimici ? '' : 'disabled') + '>Takas</button><button type="button" class="ds-sil" data-d="sil" data-id="' + d.id + '" aria-label="' + esc_(d.ad) + ' dostluktan çıkar">Çıkar</button></div></article>'; };
    body.innerHTML = '<div class="ds-sol">' + (v.gelen.length ? '<section class="ds-istek"><h3>Dostluk istekleri</h3>' + v.gelen.map(g => '<div class="ds-ist"><b>' + esc_(g.ad) + '</b><span><button type="button" class="gbtn kucuk altin" data-d="kabul" data-id="' + g.id + '">Kabul et</button><button type="button" class="gbtn kucuk" data-d="red" data-id="' + g.id + '">Geri çevir</button></span></div>').join('') + '</section>' : '') +
      '<section class="ds-bilgi"><h3>Nasıl dost olunur?</h3><p>Meydanda bir terbiyecinin yanına gel, kartından <b>Dost ekle</b> de. Kabul ederse burada görünür; fısıldaşır, düelloya ve takasa çağırırsınız.</p>' + (v.giden ? '<p class="soluk">' + v.giden + ' isteğin yanıt bekliyor.</p>' : '') + (D.hata ? '<p class="kotu">' + esc_(D.hata) + '</p>' : '') + '</section></div>' +
      '<div class="ds-liste kay">' + (v.dostlar.length ? v.dostlar.map(dost).join('') : '<p class="ds-bos">Henüz dostun yok. Meydan kalabalıklaşınca birine selam ver.</p>') + '</div>';
    body.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', async () => { if (EO2.audio) EO2.audio.ui(); const id = b.dataset.id, k = b.dataset.d, d = dostOf(id);
      if (k === 'kabul') komut({ type: 'kabul', id }, 'Artık dostsunuz.'); else if (k === 'red') komut({ type: 'red', id });
      else if (k === 'fis') fisilda(id);
      else if (k === 'ejder' && d && EO2.arena) EO2.arena.erCagir(d.h, d.ad);
      else if (k === 'topcu' && d && EO2.topcuPvp) EO2.topcuPvp.davet(d.h, d.ad);
      else if (k === 'takas' && d && EO2.takas) EO2.takas.teklif(d.h, d.ad);
      else if (k === 'sil' && d) { const v2 = await G.pen({ k: 'Dostlar', t: esc_(d.ad) + ' dostluktan çıkarılsın mı?', body: '<p>İkinizin listesinden de çıkar. Yeniden dost olmak için yeni bir istek gerekir.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Çıkar', cls: 'kor', v: true }] }); if (v2) komut({ type: 'sil', id }); } }));
  } });
  function ciz() { if (G.ekran() === 'dostlar') G.redraw(); }
  AG.dinle('durum', d => { if (d === 'cevrimici') setTimeout(cek, 1500); });
  setInterval(() => { if (G.ekran() === 'dostlar') cek(); }, 30000);
  setTimeout(cek, 3500);
  EO2.dostlar = { ekle, dostMu, fisilda, tazele: cek, durum: () => D };
})();
