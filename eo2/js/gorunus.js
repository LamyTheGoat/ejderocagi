/* Ejder Ocağı 2.0 · Ejderhanın gerçek görünüşü
   Oyunun yetiştirme tarafı renk genleri üstüne kuruludur: pul ve süs rengi, pigment (ak, kara), desen, parıltı, göz rengi,
   ton, yaşlılık ve takılan süsler. Bunları oyunun kendi çizimi üretir (js/art.js: dragonSVG, js/pose.js: poseSVG).
   2.0 sahneleri ejderhayı resim olarak koyar; bu dosya o çizimi tek bir resme çevirir: çizimin kullandığı görseller bir kez
   okunur, SVG'nin içine gömülür ve resim adresi olarak verilir. Böylece ahır, yuva, arena, pazar, madalyonlar, hikâye
   sahneleri hiçbir yerleşim değişmeden ejderhayı kendi renkleriyle gösterir.
   Görünüşü türünün sıradan çiziminden farklı olmayan ejderha için düz görsel kullanılır (hızlı yol). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD, ham = G.img;
  const veri = new Map(), bekleyen = new Map(), hazir = new Map(); let sonAcilis = 0, zaman = 0;
  const oku = url => { if (veri.has(url)) return Promise.resolve(veri.get(url)); if (bekleyen.has(url)) return bekleyen.get(url);
    const p = fetch(url).then(r => r.ok ? r.blob() : Promise.reject(new Error('yok'))).then(b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(b); }))
      .then(v => { veri.set(url, v); bekleyen.delete(url); return v; }).catch(() => { veri.set(url, null); bekleyen.delete(url); return null; });
    bekleyen.set(url, p); return p; };
  /* türünün sıradan çiziminden farklı mı? */
  const ozel = d => { try { if (!d || !d.genes) return false; if (d.dead || (d.old && !d.retired) || d.hue || d.eye === 'A') return true; if (d.cos && Object.values(d.cos).some(Boolean)) return true;
      if (pigOf(d) !== 'N' || parOf(d) || !pulOf(d).native || !susOf(d).native) return true; if (d.pat && d.pat !== 'd') return true; return eyeColor(d) !== EL_EYE[d.el]; } catch (e) { return false; } };
  const anahtar = (d, p) => { try { const P = pulOf(d), X = susOf(d); return [d.el, d.stage, p || '', d.hue || 0, d.dead ? 1 : 0, d.old && !d.retired ? 1 : 0, pigOf(d), parOf(d) ? 1 : 0, P.native ? '' : P.k, X.native ? '' : X.k, d.pat || '', eyeColor(d), d.eye || '', d.cos ? JSON.stringify(d.cos) : ''].join('|'); } catch (e) { return null; } };
  const planla = () => { clearTimeout(zaman); zaman = setTimeout(() => { if (G.live && G.sakin && G.sakin() && performance.now() - sonAcilis < 4000) G.redraw(); }, 70); };
  function kur(d, p) { const k = anahtar(d, p); if (!k) return null; if (hazir.has(k)) return hazir.get(k);
    let svg; try { svg = p ? poseSVG(d, p, { still: true }) : dragonSVG(d, { still: true, noShadow: true }); } catch (e) { hazir.set(k, null); return null; }
    const adres = [...new Set([...svg.matchAll(/href="([^"]+)"/g)].map(m => m[1]))], eksik = adres.filter(u => !veri.has(u));
    if (eksik.length) { Promise.all(eksik.map(oku)).then(planla); return null; }
    if (adres.some(u => !veri.get(u))) { hazir.set(k, null); return null; }                       // okunamayan parça varsa düz çizim kalır
    for (const u of adres) svg = svg.split('href="' + u + '"').join('href="' + veri.get(u) + '"');
    let ek = '';
    if (p) { const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); if (m) ek = ' width="' + m[1] + '" height="' + m[2] + '"'; }
    else { /* çerçeve düz görselle aynı: çizim kutusu; süs takılıysa taç, aura ve taban sığsın diye biraz pay */
      const m = svg.match(/<image href="[^"]+" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" preserveAspectRatio="xMidYMax meet"/);
      if (m) { const x = +m[1], y = +m[2], w = +m[3], h = +m[4], sus = d.cos && Object.values(d.cos).some(Boolean), mx = sus ? w * 0.07 : 0, mt = sus ? h * 0.12 : 0, mb = sus ? h * 0.07 : 0, W = w + mx * 2, H = h + mt + mb, olcek = 980 / W;
        svg = svg.replace(/viewBox="[^"]+"/, 'viewBox="' + (x - mx).toFixed(2) + ' ' + (y - mt).toFixed(2) + ' ' + W.toFixed(2) + ' ' + H.toFixed(2) + '"'); ek = ' width="' + Math.round(W * olcek) + '" height="' + Math.round(H * olcek) + '"'; } }
    svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' + ek + ' ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); hazir.set(k, url); return url; }
  G.img = d => (ozel(d) && kur(d, null)) || ham(d);
  /* poz çizimi (ahır, yarış ilanı, dövüş): poz yoksa temel çizim */
  G.poz = (d, p) => { if (!p || typeof hasPose !== 'function' || !hasPose(d, p)) return G.img(d); return (ozel(d) && kur(d, p)) || OLD + 'img/pose/' + d.el + '-' + p + '.webp'; };
  G.ozelMi = ozel;
  /* 2.5D sahneler (ocak, pist) dokuyu resimden kurar: görünüş hazırsa yüklenmiş resmi, değilse null verir (sahne düz çizimi kullanır) */
  const resim = new Map(); G.gorunusIm = (d, p) => { if (!ozel(d)) return null; const u = p ? G.poz(d, p) : G.img(d); if (!u || u.slice(0, 5) !== 'blob:') return null; let im = resim.get(u); if (!im) { im = new Image(); im.src = u; resim.set(u, im); } return im.complete && im.naturalWidth ? im : null; };
  /* görünüş hazır olana kadar (en çok 1,5 sn) bekler; yarış gibi tek seferlik sahne kurulumları için */
  G.gorunusBekle = async (d, p) => { for (let i = 0; i < 30; i++) { const im = G.gorunusIm(d, p); if (im || !ozel(d) || hazir.get(anahtar(d, p)) === null) return im; await new Promise(r => setTimeout(r, 50)); } return null; };
  /* ısıt: ocaktaki ejderhaların çizim parçaları önceden okunur; ekran açılırken hazır olur */
  G.isit = () => { try { if (typeof S !== 'undefined' && S && S.dragons) for (const d of S.dragons) if (ozel(d)) kur(d, null); } catch (e) { /* kayıt yokken sessiz */ } };
  const ac = G.open; G.open = function () { sonAcilis = performance.now(); G.isit(); return ac.apply(this, arguments); };
  const hud = G.hud; if (hud) G.hud = function () { G.isit(); return hud.apply(this, arguments); };
})();
