/* Ejder Ocağı 2.0 · Ejderha kartı (EO2.kart) · EKSIK_OZELLIKLER §6 (2026-11-20)
   Ahır → Bilgi → "Kartını çıkar": ejderhanın kendi çizimiyle (gen renkleri, süsler; G.img) parşömen kart. PNG indir ya da paylaş.
   Kart tarayıcıda tuvale çizilir: sunucu yok, maliyet yok. Yalnız gösterimdir; oyun kuralına, kayda ve ekonomiye dokunmaz.
   Paylaşım bağlantısı oyunun adresine ?kunye=<terbiyeci> ekler; bağlantıyla gelen oyuncu girişten sonra o terbiyecinin künyesini görür (js/profil.js). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game;
  if (!G) return;
  const OLD = window.EO2_OLD || '../';
  const W = 1080, H = 1350;
  const EVRE = { yavru: 'Yavru', genc: 'Genç', yetiskin: 'Yetişkin' };
  const has = f => typeof window[f] === 'function';
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const elAd = e => (typeof EL_AD !== 'undefined' && EL_AD[e]) || e;
  const renk = e => (G.ELC && G.ELC[e]) || '#c9a24a';
  const handle = () => { try { const k = EO2.ag && EO2.ag.kimlik && EO2.ag.kimlik(); if (k && k.handle) return k.handle; } catch (_) { } return (typeof S !== 'undefined' && S && S.handle) || ''; };

  /* kartın yazıları: hepsi oyunun kendi fonksiyonlarından (js/lineage.js, js/bond.js); yoksa o satır çıkmaz */
  function bilgi(d) {
    const hy = has('hybridInfo') ? hybridInfo(d) : null, sat = [];
    const soy = d.parents && d.parents.length ? 'Annesi ' + d.parents[0] + (d.parents[1] ? ' · Babası ' + d.parents[1] : '') : (d.origin || 'Ocakta doğdu');
    let gorunus = ''; try { if (has('phenoTitle') && d.genes) gorunus = phenoTitle(d); if (gorunus === elAd(d.el)) gorunus = '';   /* sade soyda başlık yalnız element adıdır: tekrar yazılmaz */ } catch (_) { }
    let unvan = ''; try { if (has('titleOf')) unvan = titleOf(d) || ''; } catch (_) { }
    let nadir = 0; try { if (has('eleganceGenScore') && d.genes) nadir = eleganceGenScore(d).total || 0; } catch (_) { }
    const huy = (d.traits || []).map(t => (typeof TRAITS !== 'undefined' && TRAITS[t] ? TRAITS[t].ad : t));
    if (typeof S !== 'undefined' && S && S.star === d.id) sat.push('★ Ocağın yıldızı');
    if (d.worldFirst) sat.push('İlk keşif');
    if (d.hybrid && hy) sat.push('Çift kan uyandı');
    return { ad: d.name, ust: [EVRE[d.stage] || '', d.hybrid && hy ? hy.ad || hy.name || elAd(d.el) : elAd(d.el), (d.gen || 1) + '. nesil', d.sex === 'F' ? 'Dişi' : 'Erkek'].filter(Boolean).join(' · '),
      gorunus, soy, unvan, huy, rozet: sat, nadir, kayit: (d.w || 0) + ' galibiyet · ' + (d.l || 0) + ' mağlubiyet',
      terbiyeci: (G.ad ? G.ad() : '') || 'Bir terbiyeci', hafta: (typeof S !== 'undefined' && S && S.week) || 1 };
  }
  const yukle = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  async function cizim(d) { let im = null; try { if (G.gorunusBekle) im = await G.gorunusBekle(d); } catch (_) { }
    if (!im) im = await yukle(G.img(d)); if (!im) im = await yukle(OLD + 'img/dr-' + d.el + '-' + d.stage + '.webp'); return im; }
  function sar(x, metin, en) { const k = String(metin).split(/\s+/), s = []; let a = ''; for (const w of k) { const t = a ? a + ' ' + w : w; if (x.measureText(t).width > en && a) { s.push(a); a = w; } else a = t; } if (a) s.push(a); return s; }
  function cerceve(x, r, k) { x.beginPath(); x.moveTo(r.x + k, r.y); x.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, k); x.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, k); x.arcTo(r.x, r.y + r.h, r.x, r.y, k); x.arcTo(r.x, r.y, r.x + r.w, r.y, k); x.closePath(); }

  /* 1080×1350 (4:5): sosyal ağda kırpılmadan görünür */
  async function ciz(d) {
    const B = bilgi(d), c = renk(d.el), im = await cizim(d), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    try { if (document.fonts && document.fonts.load) await Promise.all(['600 34px "Alegreya"', 'italic 400 30px "Alegreya"', '700 28px "Alegreya Sans"'].map(f => document.fonts.load(f))); } catch (_) { }
    const TALE = '"Alegreya", Georgia, serif', SANS = '"Alegreya Sans", "Segoe UI", sans-serif';
    // parşömen zemin ve element renginde çift çerçeve
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f5e7c6'); g.addColorStop(0.55, '#ead5a6'); g.addColorStop(1, '#d9bd84'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { const px = (i * 7919) % W, py = (i * 104729) % H; x.fillStyle = 'rgba(120,80,30,' + (0.02 + (i % 5) * 0.006) + ')'; x.fillRect(px, py, 2 + (i % 3), 2); }
    x.lineWidth = 14; x.strokeStyle = '#5a3a1a'; cerceve(x, { x: 22, y: 22, w: W - 44, h: H - 44 }, 38); x.stroke();
    x.lineWidth = 5; x.strokeStyle = c; cerceve(x, { x: 44, y: 44, w: W - 88, h: H - 88 }, 26); x.stroke();
    // üst şerit
    x.fillStyle = '#5a3a1a'; x.font = '700 30px ' + SANS; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('EJDER OCAĞI', W / 2, 104); x.fillStyle = 'rgba(90,58,26,.55)'; x.fillRect(W / 2 - 220, 120, 440, 2);
    // ejderha: element renginde hale, gölge
    const cy = 470, hale = x.createRadialGradient(W / 2, cy, 40, W / 2, cy, 360); hale.addColorStop(0, c); hale.addColorStop(0.55, c + '55'); hale.addColorStop(1, 'rgba(245,231,198,0)');
    x.fillStyle = hale; x.beginPath(); x.arc(W / 2, cy, 360, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(60,36,14,.22)'; x.beginPath(); x.ellipse(W / 2, cy + 280, 250, 34, 0, 0, 6.3); x.fill();
    if (im) { const k = Math.min(620 / im.naturalWidth, 560 / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; x.drawImage(im, W / 2 - w / 2, cy + 300 - h, w, h); }
    // ad ve künye
    let y = 860; x.fillStyle = '#2e1a0a'; x.font = '600 96px ' + TALE; let fs = 96; while (x.measureText(B.ad).width > W - 180 && fs > 50) { fs -= 4; x.font = '600 ' + fs + 'px ' + TALE; }   /* küçük büyük harfli yazı (SC) i'yi noktasız çizer: ad ve terbiyeci düz yazıyla */ x.fillText(B.ad, W / 2, y);
    y += 56; x.fillStyle = c; x.font = '700 34px ' + SANS; x.fillText(B.ust.toLocaleUpperCase('tr'), W / 2, y);
    if (B.gorunus) { y += 58; x.fillStyle = '#4a2e14'; x.font = 'italic 400 38px ' + TALE; for (const s of sar(x, '“' + B.gorunus + '”', W - 220).slice(0, 2)) { x.fillText(s, W / 2, y); y += 46; } y -= 46; }
    y += 54; x.fillStyle = '#5a3a1a'; x.font = '600 32px ' + TALE; x.fillText(sar(x, B.soy, W - 200)[0], W / 2, y);
    // huylar ve rozetler: çipler
    const cip = [...B.rozet.map(t => ({ t, a: true })), ...(B.unvan ? [{ t: B.unvan, a: true }] : []), ...B.huy.map(t => ({ t }))].slice(0, 6);
    if (cip.length) { y += 52; x.font = '700 28px ' + SANS; const pad = 22, ara = 14, en = cip.map(q => x.measureText(q.t).width + pad * 2); let sat = [], s = [], top = 0;
      for (let i = 0; i < cip.length; i++) { if (top + en[i] > W - 180 && s.length) { sat.push(s); s = []; top = 0; } s.push(i); top += en[i] + ara; } if (s.length) sat.push(s);
      for (const r of sat.slice(0, 2)) { const tw = r.reduce((a, i) => a + en[i] + ara, -ara); let px = W / 2 - tw / 2;
        for (const i of r) { const q = cip[i]; x.fillStyle = q.a ? c : 'rgba(90,58,26,.14)'; cerceve(x, { x: px, y: y - 34, w: en[i], h: 48 }, 24); x.fill(); x.fillStyle = q.a ? '#fff' : '#3a2412'; x.textAlign = 'left'; x.fillText(q.t, px + pad, y); x.textAlign = 'center'; px += en[i] + ara; }
        y += 62; } y -= 62; }
    // alt: kayıt ve terbiyeci
    x.fillStyle = 'rgba(90,58,26,.55)'; x.fillRect(W / 2 - 300, H - 178, 600, 2);
    x.fillStyle = '#5a3a1a'; x.font = '600 30px ' + SANS; x.fillText(B.kayit + (B.nadir ? ' · zarafet ' + Math.round(B.nadir) : ''), W / 2, H - 130);
    x.fillStyle = '#2e1a0a'; x.font = '600 32px ' + TALE; x.fillText('Ocak: ' + B.terbiyeci + ' · ' + B.hafta + '. hafta', W / 2, H - 82);
    return cv;
  }

  const adres = () => { const h = handle(), u = new URL(location.href); u.search = ''; u.hash = ''; if (h) u.searchParams.set('kunye', h); return u.toString(); };
  const dosyaAdi = d => 'ejder-' + String(d.name || 'kart').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '-').replace(/^-|-$/g, '') + '.png';
  const blobAl = cv => new Promise(res => { try { cv.toBlob(b => res(b), 'image/png'); } catch (_) { res(null); } });
  function indir(blob, ad) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = ad; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  async function kopyala(metin) { try { await navigator.clipboard.writeText(metin); return true; } catch (_) { return false; } }

  let acik = false;
  async function ac(d) {
    if (!d || acik) return; acik = true;
    try {
      const cv = await ciz(d), blob = await blobAl(cv), ad = dosyaAdi(d), url = adres();
      if (!blob) { G.toast('Kart çizilemedi. Görünüş yüklenince yeniden dene.'); return; }
      const onizleme = URL.createObjectURL(blob), dosya = typeof File === 'function' ? new File([blob], ad, { type: 'image/png' }) : null;
      const dosyaPaylas = !!(dosya && navigator.canShare && navigator.canShare({ files: [dosya] }));
      const metin = d.name + ', ' + (G.ad ? G.ad() : 'bir terbiyeci') + ' ocağından. Ejder Ocağı\'nda künyeme uğra:';
      const v = await G.pen({ k: 'Ejderha kartı', t: esc_(d.name), wide: true,
        body: '<div class="ek-kart"><img alt="' + esc_(d.name) + ' kartı" src="' + onizleme + '"><p class="soluk">Kart senin tarayıcında çizildi. İndirip istediğin yerde paylaşabilirsin; bağlantı künyene götürür.</p></div>',
        btns: [{ t: 'Kapat', v: false }, { t: 'PNG indir', v: 'indir' }, { t: 'Paylaş', cls: 'altin', v: 'paylas' }] });
      if (v === 'indir') { indir(blob, ad); G.toast('Kart indirildi: <b>' + esc_(ad) + '</b>'); }
      else if (v === 'paylas') {
        if (navigator.share) { try { await navigator.share(Object.assign({ title: 'Ejder Ocağı · ' + d.name, text: metin, url }, dosyaPaylas ? { files: [dosya] } : {})); } catch (e) { if (e && e.name === 'AbortError') { /* vazgeçti */ } else { indir(blob, ad); } } }
        else { indir(blob, ad); G.toast((await kopyala(metin + ' ' + url)) ? 'Kart indirildi; künye bağlantın panoya kopyalandı.' : 'Kart indirildi.'); }
      }
      setTimeout(() => URL.revokeObjectURL(onizleme), 1000);
    } finally { acik = false; }
  }

  /* ?kunye=<terbiyeci>: paylaşılan karttan gelen oyuncu girişten sonra o künyeyi görür. Bir kez açılır; adres temizlenir. */
  (function gelen() { let h = null; try { h = new URLSearchParams(location.search).get('kunye'); } catch (_) { } if (!h || !/^@?[\wÀ-ɏ.-]{2,32}$/.test(h)) return;
    let n = 0; const t = setInterval(() => { n++; const ag = EO2.ag, hazir = G.live && ag && ag.cevrimici && ag.cevrimici() && EO2.profil;
      if (hazir || n > 240) { clearInterval(t); if (hazir) { try { const u = new URL(location.href); u.searchParams.delete('kunye'); history.replaceState(null, '', u.toString()); } catch (_) { } EO2.profil.ac(h); } } }, 1000); })();

  EO2.kart = { ac, ciz, bilgi, adres };
})();
