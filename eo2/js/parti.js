/* Ejder Ocağı 2.0 · Parti (EO2.parti)
   Sunucu tarafı: server/parti_service.js. En çok dört terbiyeci. Parti çerçevesi ekranın solunda durur: her üyenin yüzü, adı,
   bulunduğu yer; lider taçlıdır, çevrimdışı üye soluktur. Parti sohbeti her yerden duyulur: sohbet kutusunda "Parti" sekmesi
   (yalnız partideyken görünür) ya da sözün başına /p yazarak. Oynanışa ve ekonomiye dokunmaz. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, app = document.getElementById('app');
  if (!G || !AG || !app) return;
  const P = { parti: null, pen: false };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HATA = { cevrimdisi: 'O terbiyeci çevrimiçi değil.', kendin: 'Kendini çağıramazsın.', lider_degil: 'Partiye yalnız lider çağırır ve çıkarır.', dolu: 'Parti dolu (en çok dört kişi).', zaten_partide: 'O terbiyeci zaten partinde.', davet_yok: 'Davetin süresi dolmuş.', uye_degil: 'O terbiyeci partinde değil.', parti_yok: 'Bir partide değilsin.', hiz: 'Çok hızlı yazıyorsun; biraz bekle.' };
  const ben = () => (AG.kimlik() || {}).handle, ad = () => (G.ad ? G.ad() : 'Gezgin');
  const yerAd = a => { if (!a) return ''; const d = EO2.sceneDefs && EO2.sceneDefs[a]; return a === 'ocak' ? 'Ocağında' : (d && d.L && d.L.name) || 'Yolda'; };
  const kutu = document.createElement('div'); kutu.id = 'partiCerceve'; kutu.hidden = true; kutu.setAttribute('aria-label', 'Parti'); app.appendChild(kutu);

  function ciz() { const p = P.parti; app.classList.toggle('partide', !!p); if (!p) { kutu.hidden = true; kutu.textContent = ''; const t = document.querySelector('#chatTabs [data-tab="genel"]'); if (t && document.querySelector('#chatTabs [data-tab="parti"][aria-selected="true"]')) t.click(); return; }
    kutu.hidden = false; const imza = JSON.stringify(p);
    if (kutu.dataset.imza === imza) return; kutu.dataset.imza = imza;
    kutu.innerHTML = p.uyeler.map((u, i) => '<button type="button" class="pt-uye' + (u.cevrimici ? '' : ' kopuk') + (u.h === ben() ? ' ben' : '') + '" data-uye="' + i + '"><canvas width="96" height="96" aria-hidden="true"></canvas><span><b>' + esc_(u.h === ben() ? 'Sen' : u.ad) + (u.h === p.lider ? '<i class="pt-tac" title="Lider"></i>' : '') + '</b><small>' + (u.cevrimici ? esc_(yerAd(u.alan)) || 'Çevrimiçi' : 'Bağlantısı koptu') + '</small></span></button>').join('');
    kutu.querySelectorAll('.pt-uye').forEach(b => { const u = p.uyeler[+b.dataset.uye]; try { EO2.api.drawPortrait(b.querySelector('canvas'), u.h === ben() ? EO2.api.player.set : u.set, 0.66, u.h === ben() ? true : u.h); } catch (_) { } b.addEventListener('click', () => uye(u)); }); }
  async function uye(u) { if (P.pen || !P.parti) return; P.pen = true; const benim = u.h === ben(), lider = P.parti.lider === ben(), dost = !benim && EO2.dostlar && EO2.dostlar.dostMu(u.h);
    const v = await G.pen({ k: 'Parti', t: esc_(benim ? ad() : u.ad), dikey: true, body: '<p>' + (u.cevrimici ? esc_(yerAd(u.alan)) || 'Çevrimiçi' : 'Bağlantısı koptu; üç dakika içinde dönmezse partiden düşer.') + (u.h === P.parti.lider ? ' · Parti lideri' : '') + '</p>',
      btns: [...(EO2.profil ? [{ t: 'Künyesine bak', v: 'profil' }] : []), ...(dost ? [{ t: 'Fısılda', v: 'fis' }] : []), ...(!benim && lider ? [{ t: 'Partiden çıkar', cls: 'kor', v: 'at' }] : []), ...(benim ? [{ t: 'Partiden ayrıl', cls: 'kor', v: 'cik' }] : []), { t: 'Kapat', v: false }] }); P.pen = false;
    if (v === 'profil') EO2.profil.ac(u.h, u.ad); else if (v === 'at') AG.gonder({ type: 'parti_at', to: u.h }); else if (v === 'cik') AG.gonder({ type: 'parti_cik' });
    else if (v === 'fis') { const d = EO2.dostlar.durum().veri.dostlar.find(x => x.h === u.h); if (d) EO2.dostlar.fisilda(d.id); } }

  AG.dinle('parti', m => { const vardi = !!P.parti; P.parti = m && m.parti ? m.parti : null; if (!vardi && P.parti && EO2.api) EO2.api.chatAdd('sistem', '', 'Partiye katıldın. Parti sekmesinden ya da /p yazarak konuşursun.'); if (vardi && !P.parti && EO2.api) EO2.api.chatAdd('sistem', '', 'Parti dağıldı.'); ciz(); });
  AG.dinle('parti_davet', async m => { if (!G.live || P.pen || !m || typeof m.h !== 'string') return; P.pen = true;
    const v = await G.pen({ k: 'Parti daveti', t: esc_(m.ad) + ' seni partisine çağırıyor', body: '<p>Partide birbirinizin nerede olduğunu görür, her yerden parti sohbetinde konuşursunuz. En çok dört kişi.</p>', btns: [{ t: 'Şimdi değil', v: false }, { t: 'Partiye katıl', cls: 'altin', v: true }] }); P.pen = false;
    if (v) AG.gonder({ type: 'parti_kabul', lider: m.h, ad: ad() }); });
  AG.dinle('parti_davet_gitti', () => G.toast('Parti davetin gitti.'));
  AG.dinle('parti_atildi', () => G.toast('Partiden çıkarıldın.'));
  AG.dinle('parti_soz', m => { if (!EO2.api || !m || typeof m.x !== 'string') return; EO2.api.chatAdd('parti', m.ben ? 'Sen' : String(m.ad).slice(0, 16), m.x.slice(0, 120)); if (!m.ben && EO2.audio && EO2.audio.pop) EO2.audio.pop(); });
  AG.dinle('parti_hata', m => G.toast(HATA[m && m.kod] || 'İşlem yapılamadı.'));
  AG.dinle('durum', d => { if (d === 'cevrimici') setTimeout(() => AG.gonder({ type: 'parti_durum', ad: ad() }), 700); else { P.parti = null; ciz(); } });
  setInterval(() => { if (P.parti && AG.cevrimici()) AG.gonder({ type: 'parti_durum', ad: ad() }); kutu.classList.toggle('gizli', !G.live || !!(G.ekran && G.ekran())); }, 4000);
  setInterval(() => kutu.classList.toggle('gizli', !G.live || !!(G.ekran && G.ekran())), 400);

  EO2.parti = { durum: () => P, uyeMi: h => !!(P.parti && P.parti.uyeler.some(u => u.h === h)),
    davet(h, kimAd) { if (!AG.cevrimici()) return G.toast('Sunucuya ulaşılamıyor.'); AG.gonder({ type: 'parti_davet', to: h, ad: ad() }); },
    cik() { AG.gonder({ type: 'parti_cik' }); },
    /* sohbet kutusundan: Parti sekmesi açıksa ya da söz /p ile başlıyorsa parti sohbetine gider. Dönen true ise söz işlendi. */
    soz(x, sekme) { const m = /^\/p\s+(.+)/i.exec(x); if (!m && sekme !== 'parti') return false; if (!P.parti) { if (EO2.api) EO2.api.chatAdd('sistem', '', 'Bir partide değilsin.'); return true; } AG.gonder({ type: 'parti_soz', x: (m ? m[1] : x).slice(0, 120) }); return true; } };
})();
