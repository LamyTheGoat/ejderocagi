/* Ejder Ocağı 2.0 · Gök Yarışı: sırtından uçuş (arkadan kamera)
   Ejderha ve binici arkadan görünür; kamera onları izler. Gerçek 3B yoktur: her şey 2D dörtgendir, derinliğe göre
   küçülür. İzdüşümü (ve ufkun yatışını) bu dosya kendisi hesaplar, çizimi oyunun çizicisine ekran koordinatında verir;
   gl.js ve zemin çizimi değişmez (sahnenin tek çizim kalemi 1000'in üstünde anahtarla durur, zemin hiç çizilmez).
   Bütün görseller kodla boyanır (tuval): gökyüzü, bulutlar, yüzen adalar, halkalar, engeller, ejderhalar, biniciler.
   Yarışın kuralları oyunun kendisidir (js/race.js, değişmez): hız, halka, engel, hırs, atılım, rüzgâr koridoru, rakip huyları,
   sıralama, ezeli rakip ve ödüller oradan gelir. Bu dosya race.js'in çizim işlevini kendi göstergeleriyle değiştirir ve
   adım ile çarpışma işlevlerini sarar: dikey eksen çubuktan gelir, üstüne bir yanal eksen eklenir (halka, engel ve rüzgâr
   koridoru için yanal hiza da aranır). Uçuş bitince her şey eski haline döner; yandan görünen yarış aynen durur.
   Açmak için: localStorage eo2.yarisArka = 1 (ya da adreste ?yarisArka). Kapalıyken oyunda hiçbir şey değişmez. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, D = EO2.sceneDefs = EO2.sceneDefs || {}, app = document.getElementById('app');
  const acik = () => { try { return localStorage.getItem('eo2.yarisArka') === '1' || /[?&]yarisArka\b/.test(location.search); } catch (_) { return false; } };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, yak = (dt, hiz) => 1 - Math.exp(-hiz * dt);
  const hs = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- ölçüler ----------
     race.js birimleri: ilerleme "pos" (saniyede yaklaşık 1,4 birim), yükseklik y (0 üst, 1 alt). Sahne metreyle çizilir. */
  const M = 19.3, ZS = 30, XM = 17, VX = 15, VY = 0.37, HALKA_R = 2.9, HALKA_X = 2.7, ENGEL_X = 3, KOR_X = 3.4, DENIZ = -58;
  const Zm = y => (0.5 - y) * ZS;                                                   // y → metre (yukarı artı)
  const yolX = (p, F) => 8 * Math.sin(p * 0.21 + F[0]) + 3.5 * Math.sin(p * 0.45 + F[1]);
  const yolY = (p, F) => 0.5 - (6.4 * Math.sin(p * 0.17 + F[2]) + 2.8 * Math.sin(p * 0.37 + F[3])) / ZS;

  /* ---------- kodla boyanan görseller ---------- */
  function tuval(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  const hsl = (h, s, l, a) => 'hsla(' + ((h % 360 + 360) % 360).toFixed(0) + ',' + clamp(s, 0, 100).toFixed(0) + '%,' + clamp(l, 0, 100).toFixed(0) + '%,' + (a === undefined ? 1 : a) + ')';
  /* düz renkli gölge kopyası: uzaktaki nesnenin üstüne pus rengiyle bindirilir (ekran kipinde sis yoktur) */
  const golgeKop = c => tuval(c.width >> 1, c.height >> 1, (x, w, h) => { x.drawImage(c, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); });

  const gokTuval = () => tuval(8, 1024, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h);
    [[0, '#1d4fae'], [0.2, '#2f7fd6'], [0.36, '#63b2ee'], [0.455, '#a9daf6'], [0.492, '#f2e9dc'], [0.5, '#ffe8cf'], [0.508, '#e7e4ee'], [0.54, '#b9cdea'], [0.62, '#8fb1de'], [0.8, '#6f93cc'], [1, '#5a7fbc']].forEach(s => g.addColorStop(s[0], s[1]));
    x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const isikTuval = () => tuval(256, 256, (x, w, h) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.62)'); g.addColorStop(0.5, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const cizgiTuval = () => tuval(256, 16, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2, h / 2.6, 0, 0, 7); x.fill(); });

  /* kümülüs: üstü güneşli, altı eflatun gölgeli; kenarı ince çizgili (oyunun çizgi üslubu) */
  function bulutTuval(tohum, yassi) { return tuval(640, 320, (x, w, h) => { let s = tohum; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const top = []; const n = yassi ? 9 : 7; for (let i = 0; i < n; i++) { const t = i / (n - 1), px = 90 + t * (w - 180), tepe = Math.sin(t * Math.PI); top.push([px + (rn() - 0.5) * 30, h * 0.66 - tepe * (yassi ? 60 : 120) * (0.6 + rn() * 0.5), (yassi ? 46 : 62) * (0.55 + tepe * 0.6 + rn() * 0.25)]); }
    for (let i = 0; i < 6; i++) top.push([70 + rn() * (w - 140), h * 0.7 + rn() * 14, 40 + rn() * 26]);
    const sek = () => { x.beginPath(); for (const q of top) { x.moveTo(q[0] + q[2], q[1]); x.arc(q[0], q[1], q[2], 0, 7); } };
    x.save(); x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 18; x.fillStyle = '#fff'; sek(); x.fill(); x.restore();
    x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, h * 0.2, 0, h * 0.86); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#f6f9ff'); g.addColorStop(0.66, '#d3def8'); g.addColorStop(0.86, '#aebbec'); g.addColorStop(1, '#8f9cdc'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    /* topakların alt yüzleri: her topağın altına yumuşak gölge hilali */
    for (const q of top) { const gg = x.createRadialGradient(q[0] - q[2] * 0.25, q[1] - q[2] * 0.45, q[2] * 0.35, q[0], q[1], q[2] * 1.05); gg.addColorStop(0, 'rgba(255,255,255,.5)'); gg.addColorStop(0.78, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(150,160,222,.13)'); x.fillStyle = gg; x.beginPath(); x.arc(q[0], q[1], q[2], 0, 7); x.fill(); }
    const s2 = x.createLinearGradient(0, 0, w, 0); s2.addColorStop(0, 'rgba(255,214,170,0)'); s2.addColorStop(1, 'rgba(255,214,170,.22)'); x.fillStyle = s2; x.fillRect(0, 0, w, h * 0.6);
    /* alt kenar pusla erir */
    x.globalCompositeOperation = 'destination-out'; const e = x.createLinearGradient(0, h * 0.8, 0, h * 0.94); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = e; x.fillRect(0, h * 0.8, w, h * 0.2);
    x.globalCompositeOperation = 'source-over'; }); }

  /* yüzen ada: çimenli tabla, aşağı sivrilen katmanlı kaya, şelale, çiçekli ağaçlar, tür: 0 kemer · 1 kule · 2 sütunlar */
  function adaTuval(tohum, tur) { return tuval(640, 640, (x, w, h) => { let s = tohum; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const cx = w / 2, ty = 300, rx = 250, ry = 46, cizgi = '#3a2a4a';
    /* kaya gövdesi */
    const alt = []; const n = 9; for (let i = 0; i <= n; i++) { const t = i / n, px = cx - rx + t * rx * 2, der = Math.pow(Math.sin(t * Math.PI), 0.7) * (190 + rn() * 90) + (i % 2 ? 46 : 0) * rn(); alt.push([px + (rn() - 0.5) * 20, ty + 18 + der]); }
    const kaya = () => { x.beginPath(); x.moveTo(cx - rx, ty); for (const q of alt) x.lineTo(q[0], q[1]); x.lineTo(cx + rx, ty); x.closePath(); };
    const g = x.createLinearGradient(0, ty, 0, ty + 300); g.addColorStop(0, '#c9a57e'); g.addColorStop(0.3, '#a67c68'); g.addColorStop(0.7, '#7a566a'); g.addColorStop(1, '#4e3b63'); x.fillStyle = g; kaya(); x.fill();
    x.save(); kaya(); x.clip();
    /* katman çizgileri ve yüzler */
    for (let i = 0; i < 7; i++) { const yy = ty + 26 + i * 34 + rn() * 10; x.strokeStyle = 'rgba(58,36,70,' + (0.22 + rn() * 0.16) + ')'; x.lineWidth = 3 + rn() * 3; x.beginPath(); x.moveTo(cx - rx, yy); for (let px = cx - rx; px <= cx + rx; px += 40) x.lineTo(px, yy + (rn() - 0.5) * 14); x.stroke(); }
    for (let i = 0; i < 8; i++) { const px = cx - rx + rn() * rx * 2, yy = ty + rn() * 60; x.strokeStyle = 'rgba(58,36,70,.25)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px, yy); x.lineTo(px + (rn() - 0.5) * 30, yy + 80 + rn() * 120); x.stroke(); }
    const isik = x.createLinearGradient(cx - rx, 0, cx + rx, 0); isik.addColorStop(0, 'rgba(48,30,80,.42)'); isik.addColorStop(0.45, 'rgba(48,30,80,0)'); isik.addColorStop(0.8, 'rgba(255,226,180,.26)'); isik.addColorStop(1, 'rgba(255,226,180,.05)'); x.fillStyle = isik; x.fillRect(0, ty, w, h);
    x.restore(); x.strokeStyle = cizgi; x.lineWidth = 3.5; x.lineJoin = 'round'; kaya(); x.stroke();
    /* şelale */
    const sx = cx + (rn() - 0.5) * 220, sw = 16 + rn() * 12; const sg = x.createLinearGradient(0, ty, 0, ty + 300); sg.addColorStop(0, 'rgba(236,250,255,.98)'); sg.addColorStop(0.6, 'rgba(206,236,255,.7)'); sg.addColorStop(1, 'rgba(206,236,255,0)'); x.fillStyle = sg; x.beginPath(); x.moveTo(sx - sw / 2, ty + 6); x.lineTo(sx + sw / 2, ty + 6); x.lineTo(sx + sw * 0.9, ty + 300); x.lineTo(sx - sw * 0.9, ty + 300); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(120,180,230,.55)'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { const o = (i - 1) * sw * 0.28; x.beginPath(); x.moveTo(sx + o, ty + 10); x.lineTo(sx + o * 1.6, ty + 240); x.stroke(); }
    /* çimenli tabla: alt dudağı koyu, üstü güneşli */
    x.fillStyle = '#3f7a3c'; x.beginPath(); x.ellipse(cx, ty + 9, rx + 3, ry + 4, 0, 0, 7); x.fill();
    const cg = x.createLinearGradient(0, ty - ry, 0, ty + ry); cg.addColorStop(0, '#b7e06a'); cg.addColorStop(0.6, '#7cc455'); cg.addColorStop(1, '#58a548'); x.fillStyle = cg; x.beginPath(); x.ellipse(cx, ty, rx, ry, 0, 0, 7); x.fill(); x.strokeStyle = '#2f5a34'; x.lineWidth = 3; x.stroke();
    /* sarkan çim püskülleri */
    x.fillStyle = '#58a548'; for (let i = 0; i < 26; i++) { const a = Math.PI * (0.04 + 0.92 * rn()), px = cx + Math.cos(a) * rx, py = ty + Math.sin(a) * ry; x.beginPath(); x.moveTo(px - 7, py - 2); x.quadraticCurveTo(px, py + 16 + rn() * 16, px + 7, py - 2); x.fill(); }
    /* taş yol lekesi */
    x.fillStyle = 'rgba(226,206,160,.75)'; x.beginPath(); x.ellipse(cx + 10, ty + 4, rx * 0.34, ry * 0.36, 0, 0, 7); x.fill();
    const tas = (px, py, tw, th, renk) => { const tg = x.createLinearGradient(px, 0, px + tw, 0); tg.addColorStop(0, '#8f8497'); tg.addColorStop(0.55, renk || '#d9cdbd'); tg.addColorStop(1, '#f0e6d2'); x.fillStyle = tg; x.strokeStyle = cizgi; x.lineWidth = 3; x.beginPath(); x.rect(px, py, tw, th); x.fill(); x.stroke(); };
    const agac = (px, py, r, pembe) => { x.strokeStyle = '#4a3040'; x.lineWidth = r * 0.16; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r * 0.1, py - r * 0.7, px - r * 0.05, py - r * 1.0); x.stroke();
      const renk = pembe ? ['#f7b4c6', '#ee8fae', '#d96a94', '#7c3a5c'] : ['#a5db6a', '#74bf55', '#4f9c48', '#2f5a34'];
      const top = []; for (let i = 0; i < 7; i++) top.push([px + (rn() - 0.5) * r * 1.5, py - r * 1.25 - rn() * r * 0.8, r * (0.42 + rn() * 0.3)]); top.sort((a, b) => a[1] - b[1]);
      x.fillStyle = renk[3]; x.beginPath(); for (const q of top) { x.moveTo(q[0] + q[2] + 3, q[1]); x.arc(q[0], q[1], q[2] + 3, 0, 7); } x.fill();
      for (const q of top) { const tg = x.createRadialGradient(q[0] - q[2] * 0.3, q[1] - q[2] * 0.4, q[2] * 0.1, q[0], q[1], q[2]); tg.addColorStop(0, renk[0]); tg.addColorStop(0.6, renk[1]); tg.addColorStop(1, renk[2]); x.fillStyle = tg; x.beginPath(); x.arc(q[0], q[1], q[2], 0, 7); x.fill(); } };
    /* yapılar */
    if (tur === 0) { /* yıkık çifte kemer */ const bx = cx - 120, by = ty - 6, aw = 96, ah = 150;
      for (let k = 0; k < 2; k++) { const ox = bx + k * (aw + 26); x.fillStyle = '#b9ab9c'; x.strokeStyle = cizgi; x.lineWidth = 3.5; x.beginPath(); x.moveTo(ox, by); x.lineTo(ox, by - ah + 40); x.quadraticCurveTo(ox, by - ah - 6, ox + aw / 2 + 13, by - ah - 8); x.quadraticCurveTo(ox + aw + 26, by - ah - 6, ox + aw + 26, by - ah + 40); x.lineTo(ox + aw + 26, by); x.lineTo(ox + aw, by); x.lineTo(ox + aw, by - ah + 52); x.quadraticCurveTo(ox + aw / 2 + 13, by - ah + 4, ox + 26, by - ah + 52); x.lineTo(ox + 26, by); x.closePath();
        const tg = x.createLinearGradient(ox, 0, ox + aw + 26, 0); tg.addColorStop(0, '#8d8296'); tg.addColorStop(0.6, '#d6c9b6'); tg.addColorStop(1, '#efe4cf'); x.fillStyle = tg; x.fill(); x.stroke();
        x.strokeStyle = 'rgba(58,42,74,.35)'; x.lineWidth = 2; for (let j = 1; j < 5; j++) { x.beginPath(); x.moveTo(ox + 2, by - j * 24); x.lineTo(ox + 24, by - j * 24); x.moveTo(ox + aw + 2, by - j * 24); x.lineTo(ox + aw + 24, by - j * 24); x.stroke(); } }
      agac(cx + 170, ty + 2, 64, true); agac(cx - 196, ty + 4, 50, false); }
    else if (tur === 1) { /* gözlem kulesi ve duvar kalıntısı */ const kx = cx - 30, kw = 92, kh = 190; tas(kx - 120, ty - 70, 110, 66); tas(kx + kw + 6, ty - 46, 80, 42);
      tas(kx, ty - kh, kw, kh - 4); for (let i = 0; i < 4; i++) tas(kx - 6 + i * 27, ty - kh - 22, 19, 24); x.fillStyle = '#3a2a4a'; x.beginPath(); x.moveTo(kx + kw / 2 - 14, ty - 6); x.lineTo(kx + kw / 2 - 14, ty - 46); x.arc(kx + kw / 2, ty - 46, 14, Math.PI, 0); x.lineTo(kx + kw / 2 + 14, ty - 6); x.fill();
      x.fillStyle = '#4a3a5c'; x.fillRect(kx + kw / 2 - 7, ty - 130, 14, 26); x.strokeStyle = 'rgba(58,42,74,.35)'; x.lineWidth = 2; for (let j = 1; j < 7; j++) { x.beginPath(); x.moveTo(kx + 3, ty - j * 26); x.lineTo(kx + kw - 3, ty - j * 26); x.stroke(); }
      agac(cx + 190, ty + 2, 58, true); agac(cx - 210, ty, 44, true); agac(cx + 120, ty + 6, 40, false); }
    else { /* sütunlar ve büyük ağaç */ for (let i = 0; i < 4; i++) { const px = cx - 190 + i * 62, ph = 120 - i * 22 + rn() * 20; tas(px, ty - ph, 26, ph - 2); tas(px - 6, ty - ph - 12, 38, 14); }
      agac(cx + 110, ty + 4, 96, true); agac(cx + 210, ty + 2, 46, false); agac(cx - 226, ty + 2, 40, false); }
    /* çalılar */
    for (let i = 0; i < 6; i++) { const a = Math.PI * rn(), px = cx + Math.cos(a) * rx * 0.9, py = ty + Math.sin(a) * ry * 0.7; x.fillStyle = i % 2 ? '#4f9c48' : '#74bf55'; x.strokeStyle = '#2f5a34'; x.lineWidth = 2; x.beginPath(); x.arc(px, py - 6, 12 + rn() * 9, Math.PI, 0); x.closePath(); x.fill(); x.stroke(); }
  }); }

  /* uzak ufuk şeridi: pus içinde yüzen ada siluetleri ve bulut sırtları (yan yana döşenir) */
  const ufukTuval = () => tuval(2048, 256, (x, w, h) => { let s = 77; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let kat = 0; kat < 2; kat++) { const renk = kat ? 'rgba(126,150,206,.9)' : 'rgba(156,180,226,.7)'; for (let i = 0; i < 7; i++) { const px = (i + rn() * 0.6) * w / 7, py = 120 + kat * 26 + rn() * 30, rw = 60 + rn() * 90; x.fillStyle = renk; x.beginPath(); x.moveTo(px - rw, py); x.lineTo(px - rw * 0.86, py - 8); x.lineTo(px + rw * 0.9, py - 9); x.lineTo(px + rw, py); x.quadraticCurveTo(px + rw * 0.3, py + rw * 0.5, px + rw * 0.05, py + rw * (0.7 + rn() * 0.5)); x.quadraticCurveTo(px - rw * 0.4, py + rw * 0.4, px - rw, py); x.fill();
        if (rn() > 0.6) { const kx = px - rw * 0.3 + rn() * rw * 0.5; x.fillRect(kx, py - 8 - 22 - rn() * 30, 9 + rn() * 8, 40); x.fillRect(kx + 24, py - 26, 20, 20); } } }
    x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 14; for (let i = 0; i < 40; i++) { const px = rn() * w, py = 176 + rn() * 46, r = 26 + rn() * 44; x.fillStyle = 'rgba(' + (236 + rn() * 19 | 0) + ',' + (240 + rn() * 15 | 0) + ',255,.95)'; x.beginPath(); x.arc(px, py, r, 0, 7); x.arc(px - w, py, r, 0, 7); x.arc(px + w, py, r, 0, 7); x.fill(); }
    x.shadowBlur = 0; const g = x.createLinearGradient(0, 190, 0, h); g.addColorStop(0, 'rgba(232,238,252,0)'); g.addColorStop(1, 'rgba(214,224,246,1)'); x.fillStyle = g; x.fillRect(0, 190, w, h - 190); });

  /* altın halka: üstte güneş vurgusu, altta gölge; dört yanında mavi taş */
  const halkaTuval = () => tuval(384, 384, (x, w, h) => { const c = w / 2, r = 150;
    x.lineWidth = 40; x.strokeStyle = '#6a3d0a'; x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke();
    const g = x.createLinearGradient(0, c - r, 0, c + r); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.3, '#ffd04f'); g.addColorStop(0.65, '#e79a1f'); g.addColorStop(1, '#a8600e'); x.lineWidth = 31; x.strokeStyle = g; x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke();
    x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,236,.9)'; x.beginPath(); x.arc(c, c, r + 8, Math.PI * 1.08, Math.PI * 1.9); x.stroke(); x.strokeStyle = 'rgba(120,60,6,.55)'; x.lineWidth = 5; x.beginPath(); x.arc(c, c, r - 9, Math.PI * 0.1, Math.PI * 0.9); x.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; x.fillStyle = '#6a3d0a'; x.beginPath(); x.arc(px, py, 22, 0, 7); x.fill(); const tg = x.createRadialGradient(px - 5, py - 6, 2, px, py, 16); tg.addColorStop(0, '#e9fbff'); tg.addColorStop(0.5, '#59c6ff'); tg.addColorStop(1, '#1c62c8'); x.fillStyle = tg; x.beginPath(); x.arc(px, py, 15, 0, 7); x.fill(); }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; x.fillStyle = 'rgba(120,60,6,.7)'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill(); } });

  /* bitiş kapısı: iki taş kule, arada damalı flama */
  const kapiTuval = () => tuval(768, 512, (x, w, h) => { const cizgi = '#3a2a4a';
    const kule = px => { const g = x.createLinearGradient(px, 0, px + 90, 0); g.addColorStop(0, '#8d8296'); g.addColorStop(0.6, '#d6c9b6'); g.addColorStop(1, '#efe4cf'); x.fillStyle = g; x.strokeStyle = cizgi; x.lineWidth = 4; x.beginPath(); x.rect(px, 120, 90, 392); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(58,42,74,.32)'; x.lineWidth = 2.5; for (let j = 1; j < 12; j++) { x.beginPath(); x.moveTo(px + 3, 120 + j * 32); x.lineTo(px + 87, 120 + j * 32); x.stroke(); }
      x.fillStyle = '#c53b34'; x.strokeStyle = cizgi; x.lineWidth = 4; x.beginPath(); x.moveTo(px - 14, 124); x.lineTo(px + 45, 30); x.lineTo(px + 104, 124); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#ffd04f'; x.beginPath(); x.arc(px + 45, 28, 12, 0, 7); x.fill(); x.stroke(); };
    kule(20); kule(658);
    x.save(); x.beginPath(); x.moveTo(110, 150); x.quadraticCurveTo(384, 200, 658, 150); x.lineTo(658, 230); x.quadraticCurveTo(384, 280, 110, 230); x.closePath(); x.clip();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 22; i++) { x.fillStyle = (i + j) % 2 ? '#fff6dc' : '#26304a'; x.fillRect(110 + i * 25, 140 + j * 36, 25, 36); } x.restore();
    x.strokeStyle = cizgi; x.lineWidth = 4; x.beginPath(); x.moveTo(110, 150); x.quadraticCurveTo(384, 200, 658, 150); x.moveTo(110, 230); x.quadraticCurveTo(384, 280, 658, 230); x.stroke(); });
  /* ---- ejderha, arkadan (tür rengi pul geninden gelir) ---- */
  /* renkler genlerden gelir: pul → gövde, süs → kanat zarı ve ışık izi, pigment → açıklık (a: albino, m: kömür, am: alaca);
     element → yele, boynuz ve tutam biçimi */
  const TUR = { ates: { yele: ['#fff3b0', '#ff7a2a'], boynuz: '#ffe2a0', sivri: 1.5, bx: 1, by: 1 }, buz: { yele: ['#ffffff', '#9fdcff'], boynuz: '#dff6ff', kristal: 1, bx: 0.95, by: 1 }, firtina: { yele: ['#ffffff', null], boynuz: '#fff4d8', sivri: 1, bx: 1, by: 1 },
    toprak: { yele: ['#dcf2a0', '#5fa544'], boynuz: '#b89468', sivri: 0.85, bx: 0.8, by: 0.45 }, golge: { yele: ['#cdb8ff', '#4a2f8a'], boynuz: '#2b2140', sivri: 1.25, bx: 1.25, by: 1 } };
  function palet(ton, doy, o) { o = o || {}; const pig = o.pig || 'N', dk = pig === 'a' ? 0.3 : pig === 'm' ? 0.7 : 1, d = clamp(doy * dk, pig === 'a' ? 6 : 18, 92), dl = pig === 'a' ? 7 : pig === 'm' ? -27 : 0, zl = pig === 'am' ? -24 : dl * 0.8;
    const st = o.sus ? o.sus[0] : ton, sd = o.sus ? clamp(o.sus[1] * dk, 14, 92) : d, T0 = TUR[o.el] || TUR.firtina, zar1 = hsl(st - 6, sd, 84 + zl, 0.96);
    return { ton, acik: hsl(ton, d * 0.75, 91 + dl * 0.6), govde: hsl(ton, d * 0.8, 78 + dl), orta: hsl(ton, d, 64 + dl), koyu: hsl(ton + 8, d * 0.9, 46 + dl * 0.7), cizgi: hsl(ton + 14, d * 0.7, pig === 'm' ? 12 : 24), zar1, zar2: hsl(st + 4, sd, 68 + zl, 0.96), zar3: hsl(st + 22, sd * 0.9, 58 + zl, 0.96), sus: hsl(st - 14, sd * 0.6, 96),
      yele: [T0.yele[0], T0.yele[1] || zar1], boynuz: T0.boynuz, sivri: T0.sivri || 1, kristal: !!T0.kristal, bx: T0.bx, by: T0.by, par: !!o.par, boy: o.boy || 0,
      iz: [0.5 + 0.5 * Math.cos(st * Math.PI / 180), 0.5 + 0.5 * Math.cos((st - 120) * Math.PI / 180), 0.5 + 0.5 * Math.cos((st - 240) * Math.PI / 180)] }; }
  /* parıltı geni: zar ve gövde üstünde dört köşeli yıldızlar */
  function yildizlar(x, n, x0, y0, w, h, tohum) { x.save(); x.fillStyle = 'rgba(255,255,255,.92)'; for (let i = 0; i < n; i++) { const px = x0 + hs(tohum + i * 3.3) * w, py = y0 + hs(tohum + i * 5.9) * h, r = 5 + hs(tohum + i) * 9; x.beginPath(); x.moveTo(px, py - r); x.quadraticCurveTo(px, py, px + r, py); x.quadraticCurveTo(px, py, px, py + r); x.quadraticCurveTo(px, py, px - r, py); x.quadraticCurveTo(px, py, px, py - r); x.fill(); } x.restore(); }

  /* sol kanat (sağ kanat aynasıdır); omuz mafsalı tuvalin sağ alt bölgesindedir: KANAT_M */
  const KANAT_W = 720, KANAT_H = 460, KANAT_M = [668, 318];
  function kanatTuval(P) { return tuval(KANAT_W, KANAT_H, (x, w, h) => { const S = KANAT_M, E = [520, 196], B = [356, 84], uc = [[36, 96], [70, 250], [214, 372], [404, 430]], govde = [650, 420];
    const zar = () => { x.beginPath(); x.moveTo(S[0], S[1]); x.quadraticCurveTo(600, 230, E[0], E[1]); x.quadraticCurveTo(440, 120, B[0], B[1]); x.quadraticCurveTo(190, 40, uc[0][0], uc[0][1]);
      x.quadraticCurveTo(120, 170, uc[1][0], uc[1][1]); x.quadraticCurveTo(190, 262, uc[2][0], uc[2][1]); x.quadraticCurveTo(330, 344, uc[3][0], uc[3][1]); x.quadraticCurveTo(540, 372, govde[0], govde[1]); x.closePath(); };
    const g = x.createRadialGradient(B[0] + 60, B[1] + 40, 30, B[0] + 30, B[1] + 120, 470); g.addColorStop(0, P.zar1); g.addColorStop(0.55, P.zar2); g.addColorStop(1, P.zar3); x.fillStyle = g; zar(); x.fill();
    x.save(); zar(); x.clip();
    /* parmak aralarında açık kuşaklar ve zar damarları */
    for (let i = 0; i < 4; i++) { const u = uc[i], yn = i < 3 ? uc[i + 1] : govde; x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.moveTo(B[0], B[1]); x.quadraticCurveTo((B[0] + u[0]) / 2 + 26, (B[1] + u[1]) / 2 + 30, (u[0] + yn[0]) / 2, (u[1] + yn[1]) / 2 - 18); x.quadraticCurveTo((B[0] + yn[0]) / 2 - 10, (B[1] + yn[1]) / 2, B[0], B[1]); x.fill(); }
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2.2; for (let i = 0; i < 26; i++) { const t = hs(i * 3.1), k = Math.floor(hs(i * 7.7) * 4), u = uc[k], yn = k < 3 ? uc[k + 1] : govde, ax = lerp(B[0], u[0], 0.3 + t * 0.6), ay = lerp(B[1], u[1], 0.3 + t * 0.6), bx = lerp(B[0], yn[0], 0.3 + t * 0.6), by = lerp(B[1], yn[1], 0.3 + t * 0.6); x.globalAlpha = 0.25 + hs(i) * 0.3; x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo((ax + bx) / 2 - 12, (ay + by) / 2 + 12, bx, by); x.stroke(); }
    x.globalAlpha = 1;
    /* bulut kıvrımı süsleri (referanstaki gibi) */
    x.strokeStyle = P.sus; x.lineCap = 'round'; x.lineWidth = 7; const kivrim = (px, py, r, yon) => { x.beginPath(); for (let a = 0; a < 3.9 * Math.PI; a += 0.2) { const rr = r * (1 - a / (4.2 * Math.PI)); const qx = px + Math.cos(a * yon + 1.2) * rr, qy = py + Math.sin(a * yon + 1.2) * rr * 0.86; a === 0 ? x.moveTo(qx, qy) : x.lineTo(qx, qy); } x.stroke(); };
    x.globalAlpha = 0.6; kivrim(250, 232, 44, 1); kivrim(420, 300, 36, -1); kivrim(140, 150, 26, 1); kivrim(540, 330, 24, 1); x.globalAlpha = 1;
    /* arka kenar gölgesi */
    const e = x.createLinearGradient(0, 180, 0, h); e.addColorStop(0, 'rgba(40,40,120,0)'); e.addColorStop(1, 'rgba(40,40,120,.3)'); x.fillStyle = e; x.fillRect(0, 0, w, h);
    x.restore(); x.strokeStyle = P.cizgi; x.lineWidth = 5; x.lineJoin = 'round'; zar(); x.stroke();
    /* kemikler: koyu çizgi üstüne açık dolgu */
    const kemik = (yolFn, en) => { x.lineCap = 'round'; x.strokeStyle = P.cizgi; x.lineWidth = en + 7; yolFn(); x.stroke(); x.strokeStyle = P.acik; x.lineWidth = en; yolFn(); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = en * 0.3; x.save(); x.translate(-1.5, -2.5); yolFn(); x.stroke(); x.restore(); };
    uc.forEach((u, i) => kemik(() => { x.beginPath(); x.moveTo(B[0], B[1]); x.quadraticCurveTo((B[0] + u[0]) / 2 + (i ? 18 : 0), (B[1] + u[1]) / 2 - (i ? 6 : 34), u[0], u[1]); }, 9 - i));
    kemik(() => { x.beginPath(); x.moveTo(S[0], S[1]); x.quadraticCurveTo(600, 230, E[0], E[1]); x.quadraticCurveTo(440, 120, B[0], B[1]); }, 20);
    /* bilek pençesi: altın */
    x.fillStyle = '#ffd35a'; x.strokeStyle = '#7a4a08'; x.lineWidth = 4; x.beginPath(); x.moveTo(B[0] - 16, B[1] + 4); x.quadraticCurveTo(B[0] - 30, B[1] - 48, B[0] + 18, B[1] - 70); x.quadraticCurveTo(B[0] + 4, B[1] - 34, B[0] + 20, B[1] - 4); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = P.acik; x.strokeStyle = P.cizgi; x.lineWidth = 4; x.beginPath(); x.arc(E[0], E[1], 15, 0, 7); x.fill(); x.stroke();
    if (P.par) { x.save(); zar(); x.clip(); yildizlar(x, 16, 60, 90, 520, 300, 7); x.restore(); }
  }); }

  /* gövde: baş (iki boynuz, yan yelpazeler) üstte ve uzakta, sırt ortada, budlar altta; sırt boyunca tüy yelesi */
  const GOVDE_W = 420, GOVDE_H = 640;
  function govdeTuval(P) { return tuval(GOVDE_W, GOVDE_H, (x, w, h) => { const c = w / 2; x.lineJoin = 'round'; x.lineCap = 'round';
    const dol = (fn, renk, en) => { fn(); x.fillStyle = renk; x.fill(); x.strokeStyle = P.cizgi; x.lineWidth = en || 5; x.stroke(); };
    const gr = (x0, y0, r0, x1, y1, r1, a, b, d) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); g.addColorStop(0, a); g.addColorStop(0.6, b); g.addColorStop(1, d); return g; };
    /* arka ayaklar (budların altından sarkar) */
    for (const k of [-1, 1]) { dol(() => { x.beginPath(); x.ellipse(c + k * 122, 556, 30, 44, k * 0.25, 0, 7); }, P.orta); x.fillStyle = '#fff4d8'; x.strokeStyle = P.cizgi; x.lineWidth = 3; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(c + k * 122 + i * 15 - 6, 590); x.lineTo(c + k * 122 + i * 15, 614); x.lineTo(c + k * 122 + i * 15 + 6, 590); x.closePath(); x.fill(); x.stroke(); } }
    /* budlar */
    for (const k of [-1, 1]) dol(() => { x.beginPath(); x.ellipse(c + k * 104, 470, 62, 92, k * 0.2, 0, 7); }, gr(c + k * 90, 430, 10, c + k * 104, 470, 96, P.govde, P.orta, P.koyu));
    /* sırt */
    dol(() => { x.beginPath(); x.moveTo(c - 52, 200); x.bezierCurveTo(c - 150, 250, c - 150, 470, c - 74, 590); x.quadraticCurveTo(c, 626, c + 74, 590); x.bezierCurveTo(c + 150, 470, c + 150, 250, c + 52, 200); x.closePath(); }, gr(c + 26, 320, 20, c, 400, 230, P.acik, P.govde, P.orta));
    /* pul sıraları */
    x.strokeStyle = hsl(P.ton, 50, 60, 0.4); x.lineWidth = 2.5; for (let j = 0; j < 9; j++) { const yy = 262 + j * 36, gen = 118 - Math.abs(j - 4) * 9; for (let i = -3; i <= 3; i++) { if (Math.abs(i) < 1) continue; const px = c + i * gen / 3.4 + (j % 2 ? 9 : -9); x.beginPath(); x.arc(px, yy, 15, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); } }
    /* boyun */
    dol(() => { x.beginPath(); x.moveTo(c - 40, 110); x.quadraticCurveTo(c - 50, 170, c - 62, 232); x.lineTo(c + 62, 232); x.quadraticCurveTo(c + 50, 170, c + 40, 110); x.closePath(); }, gr(c + 12, 150, 8, c, 180, 90, P.acik, P.govde, P.orta));
    /* boynuzlar */
    for (const k of [-1, 1]) dol(() => { x.beginPath(); const tx = c + k * 84 * P.bx, ty = 4 + (1 - P.by) * 44; x.moveTo(c + k * 22, 66); if (P.kristal) { x.lineTo(c + k * 40, 30); x.lineTo(tx, ty); x.lineTo(c + k * 70, 52); } else { x.quadraticCurveTo(c + k * 44, 30, tx, ty); x.quadraticCurveTo(c + k * 68, 50, c + k * 50, 82); } x.lineTo(c + k * 50, 82); x.closePath(); }, P.boynuz, 4);
    /* yan yelpazeler (kulak) */
    for (const k of [-1, 1]) dol(() => { x.beginPath(); x.moveTo(c + k * 44, 84); x.lineTo(c + k * 112, 62); x.lineTo(c + k * 92, 92); x.lineTo(c + k * 118, 108); x.lineTo(c + k * 84, 116); x.lineTo(c + k * 96, 140); x.lineTo(c + k * 44, 122); x.closePath(); }, P.zar2, 4);
    /* baş */
    dol(() => { x.beginPath(); x.ellipse(c, 92, 56, 50, 0, 0, 7); }, gr(c + 14, 76, 6, c, 92, 60, P.acik, P.govde, P.orta));
    /* sırt yelesi: baştan kuyruğa uzanan tüy tutamları */
    const tutam = (px, py, r, a) => { x.save(); x.translate(px, py); x.rotate(a); const u2 = r * 1.25 * P.sivri; x.beginPath(); x.moveTo(0, -u2); if (P.kristal) { x.lineTo(r * 0.62, -r * 0.1); x.lineTo(r * 0.3, r * 0.8); x.lineTo(-r * 0.3, r * 0.8); x.lineTo(-r * 0.62, -r * 0.1); } else { x.quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.46, r * 0.8); x.quadraticCurveTo(0, r * 0.45, -r * 0.46, r * 0.8); x.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -u2); } x.closePath(); const g = x.createLinearGradient(0, -u2, 0, r); g.addColorStop(0, P.yele[0]); g.addColorStop(1, P.yele[1]); x.fillStyle = g; x.fill(); x.strokeStyle = P.cizgi; x.lineWidth = 3.5; x.stroke(); x.restore(); };
    for (let i = 14; i >= 0; i--) { const t = i / 14, py = 74 + t * 500, r = 20 + Math.sin(t * Math.PI) * 17; tutam(c + Math.sin(i * 1.7) * 5, py, r, Math.sin(i * 2.3) * 0.16); }
    /* eyer: kahverengi örtü, altın kenar, gök mühür */
    dol(() => { x.beginPath(); x.moveTo(c - 92, 300); x.quadraticCurveTo(c, 268, c + 92, 300); x.quadraticCurveTo(c + 106, 372, c + 82, 428); x.quadraticCurveTo(c, 452, c - 82, 428); x.quadraticCurveTo(c - 106, 372, c - 92, 300); x.closePath(); }, gr(c + 20, 330, 10, c, 360, 120, '#b0704a', '#8a4f33', '#5e3324'));
    x.strokeStyle = '#ffd35a'; x.lineWidth = 5; x.beginPath(); x.moveTo(c - 80, 312); x.quadraticCurveTo(c, 284, c + 80, 312); x.moveTo(c - 72, 420); x.quadraticCurveTo(c, 440, c + 72, 420); x.stroke();
    x.strokeStyle = '#5e3324'; x.lineWidth = 12; x.beginPath(); x.moveTo(c - 96, 340); x.lineTo(c - 134, 392); x.moveTo(c + 96, 340); x.lineTo(c + 134, 392); x.stroke();
    dol(() => { x.beginPath(); x.ellipse(c, 430, 34, 24, 0, 0, 7); }, '#ffd35a', 4); x.fillStyle = '#eaf7ff'; x.beginPath(); x.ellipse(c, 430, 24, 16, 0, 0, 7); x.fill(); x.strokeStyle = '#59a8e6'; x.lineWidth = 3.5; x.beginPath(); x.arc(c - 6, 432, 7, Math.PI, 0.3); x.arc(c + 7, 430, 8, Math.PI * 1.1, 0.4); x.stroke();
    if (P.par) { yildizlar(x, 5, c - 130, 440, 80, 130, 31); yildizlar(x, 5, c + 50, 440, 80, 130, 47); }
  }); }

  /* kuyruk: kök üstte (gövdeye bağlanır), uç altta ve kameraya en yakın; üstünde tüy yelesi, ucunda yelpaze */
  const KUYRUK_W = 260, KUYRUK_H = 560;
  function kuyrukTuval(P) { return tuval(KUYRUK_W, KUYRUK_H, (x, w, h) => { const c = w / 2; x.lineJoin = 'round';
    const orta = t => c + Math.sin(t * 2.6) * 26 * t, en = t => 58 * Math.pow(1 - t, 0.85) + 7;
    x.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; x.lineTo(orta(t) - en(t), 16 + t * 470); } for (let i = 24; i >= 0; i--) { const t = i / 24; x.lineTo(orta(t) + en(t), 16 + t * 470); } x.closePath();
    const g = x.createLinearGradient(c - 60, 0, c + 60, 0); g.addColorStop(0, P.orta); g.addColorStop(0.5, P.acik); g.addColorStop(1, P.orta); x.fillStyle = g; x.fill(); x.strokeStyle = P.cizgi; x.lineWidth = 5; x.stroke();
    /* uç yelpazesi */
    const ux = orta(1), uy = 486; x.beginPath(); x.moveTo(ux, uy - 16); x.quadraticCurveTo(ux - 70, uy + 6, ux - 44, uy + 62); x.lineTo(ux - 16, uy + 38); x.lineTo(ux, uy + 70); x.lineTo(ux + 16, uy + 38); x.lineTo(ux + 44, uy + 62); x.quadraticCurveTo(ux + 70, uy + 6, ux, uy - 16); x.closePath(); x.fillStyle = P.zar2; x.fill(); x.stroke();
    for (let i = 11; i >= 0; i--) { const t = i / 12, r = 9 + (1 - t) * 20, px = orta(t), py = 22 + t * 440; x.beginPath(); x.moveTo(px, py - r * 1.2); x.quadraticCurveTo(px + r, py - r * 0.1, px + r * 0.45, py + r * 0.8); x.quadraticCurveTo(px, py + r * 0.4, px - r * 0.45, py + r * 0.8); x.quadraticCurveTo(px - r, py - r * 0.1, px, py - r * 1.2); x.closePath(); const tg = x.createLinearGradient(0, py - r, 0, py + r); tg.addColorStop(0, P.yele[0]); tg.addColorStop(1, P.yele[1]); x.fillStyle = tg; x.fill(); x.lineWidth = 3.2; x.stroke(); }
  }); }

  /* binici, arkadan: dağınık kahverengi saç, beyaz gömlek, çapraz kayışlar, kırmızı atkı düğümü */
  function biniciTuval() { return tuval(260, 300, (x, w, h) => { const c = w / 2, cz = '#3a2530'; x.lineJoin = 'round'; x.lineCap = 'round';
    const dol = (fn, renk, en) => { fn(); x.fillStyle = renk; x.fill(); x.strokeStyle = cz; x.lineWidth = en || 4.5; x.stroke(); };
    /* bacaklar eyerin iki yanına iner */
    for (const k of [-1, 1]) { dol(() => { x.beginPath(); x.moveTo(c + k * 26, 214); x.quadraticCurveTo(c + k * 80, 222, c + k * 92, 276); x.lineTo(c + k * 62, 284); x.quadraticCurveTo(c + k * 52, 250, c + k * 18, 250); x.closePath(); }, '#5a4a40'); dol(() => { x.beginPath(); x.ellipse(c + k * 80, 284, 20, 12, k * 0.3, 0, 7); }, '#6a3f28'); }
    /* gövde */
    const g = x.createLinearGradient(c - 50, 0, c + 50, 0); g.addColorStop(0, '#d8dcea'); g.addColorStop(0.55, '#ffffff'); g.addColorStop(1, '#f2f0e8');
    dol(() => { x.beginPath(); x.moveTo(c - 44, 150); x.quadraticCurveTo(c - 58, 200, c - 46, 246); x.quadraticCurveTo(c, 260, c + 46, 246); x.quadraticCurveTo(c + 58, 200, c + 44, 150); x.quadraticCurveTo(c, 136, c - 44, 150); x.closePath(); }, g);
    /* kollar öne, dizginlere uzanır */
    for (const k of [-1, 1]) { dol(() => { x.beginPath(); x.moveTo(c + k * 40, 154); x.quadraticCurveTo(c + k * 82, 176, c + k * 70, 226); x.lineTo(c + k * 50, 222); x.quadraticCurveTo(c + k * 56, 190, c + k * 34, 180); x.closePath(); }, g); dol(() => { x.beginPath(); x.arc(c + k * 60, 228, 11, 0, 7); }, '#6a3f28', 4); }
    /* kayışlar ve kemer */
    x.strokeStyle = cz; x.lineWidth = 15; x.beginPath(); x.moveTo(c - 40, 158); x.lineTo(c + 40, 238); x.moveTo(c + 40, 158); x.lineTo(c - 40, 238); x.stroke(); x.strokeStyle = '#8a5a34'; x.lineWidth = 9; x.beginPath(); x.moveTo(c - 40, 158); x.lineTo(c + 40, 238); x.moveTo(c + 40, 158); x.lineTo(c - 40, 238); x.stroke();
    dol(() => { x.beginPath(); x.rect(c - 48, 232, 96, 16); }, '#6a3f28', 4); dol(() => { x.beginPath(); x.arc(c, 198, 9, 0, 7); }, '#ffd35a', 3.5);
    /* atkı: boyunda düğüm */
    dol(() => { x.beginPath(); x.moveTo(c - 50, 132); x.quadraticCurveTo(c, 118, c + 50, 132); x.quadraticCurveTo(c + 54, 152, c + 40, 164); x.quadraticCurveTo(c, 150, c - 40, 164); x.quadraticCurveTo(c - 54, 152, c - 50, 132); x.closePath(); }, '#d6342c');
    x.strokeStyle = '#8f1c1a'; x.lineWidth = 3; x.beginPath(); x.moveTo(c - 30, 140); x.quadraticCurveTo(c, 134, c + 30, 140); x.stroke();
    /* baş ve saç */
    dol(() => { x.beginPath(); x.ellipse(c - 62, 96, 11, 14, 0, 0, 7); x.moveTo(c + 73, 96); x.ellipse(c + 62, 96, 11, 14, 0, 0, 7); }, '#f3c9a4', 4);
    const sg = x.createRadialGradient(c + 14, 54, 8, c, 84, 84); sg.addColorStop(0, '#a56a3e'); sg.addColorStop(0.6, '#7a4628'); sg.addColorStop(1, '#55301f');
    dol(() => { x.beginPath(); x.moveTo(c - 66, 96); x.quadraticCurveTo(c - 84, 54, c - 54, 30); x.lineTo(c - 62, 8); x.lineTo(c - 30, 20); x.lineTo(c - 22, -2 + 6); x.lineTo(c + 2, 16); x.lineTo(c + 26, 2); x.lineTo(c + 34, 22); x.lineTo(c + 66, 12); x.lineTo(c + 58, 36); x.quadraticCurveTo(c + 84, 58, c + 66, 96);
      x.lineTo(c + 74, 122); x.lineTo(c + 46, 116); x.lineTo(c + 38, 138); x.lineTo(c + 14, 122); x.lineTo(c, 142); x.lineTo(c - 16, 122); x.lineTo(c - 40, 138); x.lineTo(c - 46, 116); x.lineTo(c - 76, 124); x.closePath(); }, sg);
    x.strokeStyle = 'rgba(255,214,160,.5)'; x.lineWidth = 4; x.beginPath(); x.moveTo(c - 6, 30); x.quadraticCurveTo(c + 20, 44, c + 30, 80); x.moveTo(c - 34, 44); x.quadraticCurveTo(c - 26, 70, c - 30, 100); x.stroke();
    /* gözlük kayışı */
    x.strokeStyle = cz; x.lineWidth = 11; x.beginPath(); x.moveTo(c - 66, 74); x.quadraticCurveTo(c, 60, c + 66, 74); x.stroke(); x.strokeStyle = '#c9a35a'; x.lineWidth = 6; x.beginPath(); x.moveTo(c - 66, 74); x.quadraticCurveTo(c, 60, c + 66, 74); x.stroke();
  }); }
  /* atkının uçuşan ucu: düğüm sağda (mafsal), kumaş sola dalgalanır */
  const atkiTuval = () => tuval(240, 110, (x, w, h) => { x.lineJoin = 'round'; x.beginPath(); x.moveTo(232, 40); x.quadraticCurveTo(170, 6, 110, 30); x.quadraticCurveTo(60, 48, 8, 20); x.lineTo(30, 54); x.lineTo(4, 84); x.quadraticCurveTo(70, 104, 124, 78); x.quadraticCurveTo(180, 56, 232, 74); x.closePath();
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#f0564a'); g.addColorStop(1, '#c42a26'); x.fillStyle = g; x.fill(); x.strokeStyle = '#3a2530'; x.lineWidth = 4.5; x.stroke();
    x.strokeStyle = '#ffd35a'; x.lineWidth = 3.5; x.beginPath(); x.arc(70, 56, 12, 0, 7); x.moveTo(70, 44); x.lineTo(70, 68); x.stroke(); x.strokeStyle = 'rgba(120,20,20,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(214, 52); x.quadraticCurveTo(160, 30, 110, 52); x.stroke(); });

  /* engeller: fırtına bulutu (içinde şimşek) ve yüzen kaya parçası */
  const firtinaTuval = () => tuval(640, 320, (x, w, h) => { x.drawImage(bulutTuval(37 * 977, 0), 0, 0); x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, h * 0.15, 0, h * 0.9); g.addColorStop(0, 'rgba(128,118,176,.93)'); g.addColorStop(0.5, 'rgba(84,76,130,.95)'); g.addColorStop(1, 'rgba(40,34,72,.97)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = x.createRadialGradient(w * 0.5, h * 0.56, 10, w * 0.5, h * 0.56, 190); r.addColorStop(0, 'rgba(190,170,255,.5)'); r.addColorStop(1, 'rgba(190,170,255,0)'); x.fillStyle = r; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over'; x.lineJoin = 'round';
    const simsek = (px, py, s) => { x.beginPath(); x.moveTo(px + 14 * s, py); x.lineTo(px - 22 * s, py + 52 * s); x.lineTo(px + 2 * s, py + 52 * s); x.lineTo(px - 20 * s, py + 104 * s); x.lineTo(px + 34 * s, py + 40 * s); x.lineTo(px + 8 * s, py + 40 * s); x.lineTo(px + 30 * s, py); x.closePath(); x.fillStyle = '#ffe66a'; x.strokeStyle = '#4a2a06'; x.lineWidth = 4; x.fill(); x.stroke(); };
    simsek(w * 0.5, h * 0.42, 1.25); simsek(w * 0.3, h * 0.5, 0.8); simsek(w * 0.71, h * 0.48, 0.9); });
  const kayaTuval = tohum => tuval(360, 360, (x, w, h) => { let s = tohum; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647; const c = w / 2, n = 11, nok = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 118 + rn() * 46 - (i % 3 === 0 ? 26 : 0); nok.push([c + Math.cos(a) * r * 1.05, c + Math.sin(a) * r * 0.86]); }
    const sek = () => { x.beginPath(); nok.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); };
    const g = x.createLinearGradient(c - 130, c - 120, c + 110, c + 130); g.addColorStop(0, '#cdb69c'); g.addColorStop(0.45, '#9a7c78'); g.addColorStop(1, '#4e3b63'); x.fillStyle = g; sek(); x.fill();
    x.save(); sek(); x.clip(); x.strokeStyle = 'rgba(58,36,70,.4)'; x.lineWidth = 4; for (let i = 0; i < 7; i++) { const px = c - 150 + rn() * 300, py = c - 130 + rn() * 120; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rn() - 0.5) * 70, py + 60 + rn() * 90); x.lineTo(px + (rn() - 0.5) * 90, py + 150 + rn() * 60); x.stroke(); }
    x.fillStyle = 'rgba(255,236,200,.28)'; x.beginPath(); x.moveTo(c - 150, c - 150); x.lineTo(c + 40, c - 150); x.lineTo(c - 40, c - 10); x.lineTo(c - 160, c + 10); x.fill();
    x.fillStyle = 'rgba(40,24,66,.34)'; x.beginPath(); x.moveTo(c + 170, c - 20); x.lineTo(c + 20, c + 60); x.lineTo(c - 30, c + 170); x.lineTo(c + 170, c + 170); x.fill(); x.restore();
    x.strokeStyle = '#3a2a4a'; x.lineWidth = 6; x.lineJoin = 'round'; sek(); x.stroke();
    /* üstünde yosun */
    x.fillStyle = '#74bf55'; x.strokeStyle = '#2f5a34'; x.lineWidth = 4; x.beginPath(); x.moveTo(c - 96, c - 96); x.quadraticCurveTo(c - 30, c - 150, c + 70, c - 108); x.quadraticCurveTo(c + 40, c - 84, c + 10, c - 92); x.quadraticCurveTo(c - 20, c - 70, c - 50, c - 90); x.quadraticCurveTo(c - 70, c - 76, c - 96, c - 96); x.closePath(); x.fill(); x.stroke(); });

  /* ---------- dokular: uçuşa girerken kurulur, çıkarken bırakılır ----------
     Dünya nesneleri tek atlasta durur: uzaktan yakına sıralı çizimde doku değişmez, çizim çağrısı sayısı düşük kalır.
     Her yarışçının üç parçası (kanat, gövde, kuyruk) kendi tek dokusundadır; rakiplerinki yarı çözünürlüktedir. */
  let T = null;
  function atlas(liste) { const W = 2048, bos = 8, yer = {}; liste.sort((a, b) => b.h - a.h); let x = bos, y = bos, satir = 0;
    for (const q of liste) { if (x + q.w + bos > W) { x = bos; y += satir + bos; satir = 0; } q.x = x; q.y = y; x += q.w + bos; satir = Math.max(satir, q.h); }
    const H = y + satir + bos, c = tuval(W, H, k => { for (const q of liste) k.drawImage(q.c, q.x, q.y, q.w, q.h); });
    for (const q of liste) yer[q.ad] = [(q.x + 0.5) / W, (q.y + 0.5) / H, (q.x + q.w - 0.5) / W, (q.y + q.h - 0.5) / H]; return { c, yer }; }
  function ejderDoku(R, P, s) { const b = 8, kw = KANAT_W * s | 0, kh = KANAT_H * s | 0, qw = KUYRUK_W * s | 0, qh = KUYRUK_H * s | 0, gw = GOVDE_W * s | 0, gh = GOVDE_H * s | 0, W = kw + qw + b * 3, y2 = Math.max(kh, qh) + b * 2, H = y2 + gh + b;
    const c = tuval(W, H, x => { x.drawImage(kanatTuval(P), b, b, kw, kh); x.drawImage(kuyrukTuval(P), kw + b * 2, b, qw, qh); x.drawImage(govdeTuval(P), b, y2, gw, gh); });
    const uv = (x, y, w, h) => [(x + 0.5) / W, (y + 0.5) / H, (x + w - 0.5) / W, (y + h - 0.5) / H], o = { tx: R.texture(c), kanat: uv(b, b, kw, kh), kuyruk: uv(kw + b * 2, b, qw, qh), govde: uv(b, y2, gw, gh), P }; c.width = c.height = 0; return o; }
  /* ---------- gerçek çizim: arkadan uçuş pozu (assets/yaris3/<el>-arka.webp) ----------
     Çizim tek resimdir; burada kanatlar, gövde ve kuyruk olarak ayrılır ki kanat çırpsın, kuyruk salınsın.
     Maske (aynı ad, -m): kırmızı kanal pul, yeşil kanal süs. Gen renkleri yerli renkten farklıysa o bölgelerin tonu kaydırılır.
     Çizimi olmayan element kodla çizilen ejderhayı kullanır. Ölçüler kaynağın 1672x941 karesine göredir. */
  const POZ = { ates: {} }, POZ_W = 1672, POZ_H = 941, POZ_PM = 140, POZ_X = 836, POZ_Y = 420, POZ_Y0 = -0.43, RES = {};
  const POZ_P = { kanatL: { k: [0, 60, 800, 450], y: [[0, 0], [700, 0], [700, 190], [800, 190], [800, 345], [690, 345], [690, 941], [0, 941]], m: [772, 245] },
    kanatR: { k: [872, 60, 1672, 450], y: [[1672, 0], [972, 0], [972, 190], [872, 190], [872, 345], [982, 345], [982, 941], [1672, 941]], m: [900, 245] },
    govde: { k: [690, 0, 985, 580], y: [[700, 0], [972, 0], [972, 190], [900, 190], [900, 345], [985, 345], [985, 580], [690, 580], [690, 345], [772, 345], [772, 190], [700, 190]], m: [836, 330] },
    kuyruk: { k: [690, 545, 985, 941], y: [[792, 545], [884, 545], [884, 580], [985, 580], [985, 941], [690, 941], [690, 580], [792, 580]], m: [836, 562] } };
  const cizimAcik = () => { try { return localStorage.getItem('eo2.yarisCizim') !== 'kod'; } catch (_) { return true; } };
  function resimYukle(el) { if (!POZ[el] || !cizimAcik()) return Promise.resolve(null); if (RES[el] !== undefined) return Promise.resolve(RES[el]);
    const y = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
    return RES[el + '_'] || (RES[el + '_'] = Promise.all([y('assets/yaris3/' + el + '-arka.webp'), y('assets/yaris3/' + el + '-arka-m.webp')]).then(a => (RES[el] = a[0] ? { im: a[0], mk: a[1] } : null))); }
  /* gen renklerinin yerli renkten farkı: pul ve süs için ton kayması, doygunluk çarpanı; pigment için açıklık */
  function renkFarki(x) { const o = { dp: 0, ds: 0, kp: 1, ks: 1, l: 0 };
    try { const d = x && !x.genes && x.gx ? Object.assign({ genes: x.gx }, x) : x, n = NATIVE[d.el], p = pulOf(d), s2 = susOf(d), pig = pigOf(d);
      if (!p.native) { o.dp = p.h - n.pul.h; o.kp = clamp(p.s / (n.pul.s || 1), 0.2, 1.3); } if (!s2.native) { o.ds = s2.h - n.sus.h; o.ks = clamp(s2.s / (n.sus.s || 1), 0.2, 1.3); }
      if (pig === 'a') { o.kp *= 0.3; o.ks *= 0.3; o.l = 0.1; } else if (pig === 'm') { o.kp *= 0.7; o.ks *= 0.7; o.l = -0.2; } } catch (_) { }
    o.dp += (x && x.hue || 0) * 2; o.dp = Math.round(o.dp / 10) * 10; o.ds = Math.round(o.ds / 10) * 10; o.kp = Math.round(o.kp * 8) / 8; o.ks = Math.round(o.ks * 8) / 8; return o; }
  function boya(c, mk, f) { const w = c.width, h = c.height, x = c.getContext('2d'), I = x.getImageData(0, 0, w, h), q = I.data, M = tuval(w, h, k => k.drawImage(mk, 0, 0, w, h)).getContext('2d').getImageData(0, 0, w, h).data;
    const ton = (p, q2, t) => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q2 - p) * 6 * t : t < 0.5 ? q2 : t < 2 / 3 ? p + (q2 - p) * (2 / 3 - t) * 6 : p; };
    for (let i = 0; i < q.length; i += 4) { if (!q[i + 3]) continue; const a = M[i] / 255, b = M[i + 1] / 255; if (a + b < 0.04) continue;
      const r = q[i] / 255, g = q[i + 1] / 255, bl = q[i + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn; let hh = 0, l = (mx + mn) / 2, s = d ? (l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)) : 0;
      if (d) hh = (mx === r ? ((g - bl) / d + (g < bl ? 6 : 0)) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4) / 6;
      const k = Math.min(1, a + b); hh += (a * f.dp + b * f.ds) / 360; s = clamp(s * (1 + (a * (f.kp - 1) + b * (f.ks - 1))), 0, 1); l = clamp(l + f.l * k * (f.l > 0 ? 1 - l : l) * 2.2, 0, 1);
      const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q2; q[i] = ton(p, q2, hh + 1 / 3) * 255; q[i + 1] = ton(p, q2, hh) * 255; q[i + 2] = ton(p, q2, hh - 1 / 3) * 255; }
    x.putImageData(I, 0, 0); }
  function resimDoku(R, el, x, P, s) { const res = RES[el]; if (!res) return null; const PP = Object.assign({}, POZ_P, POZ[el].p || {}), o = 1280 / POZ_W * s, f = renkFarki(x), b = 8, ad = Object.keys(PP), yer = {};
    const c0 = tuval(Math.round(POZ_W * o), Math.round(POZ_H * o), k => { k.imageSmoothingQuality = 'high'; k.drawImage(res.im, 0, 0, Math.round(POZ_W * o), Math.round(POZ_H * o)); });
    if (res.mk && (f.dp || f.ds || f.kp !== 1 || f.ks !== 1 || f.l)) boya(c0, res.mk, f);
    let px = b, py = b, satir = 0, W = 0; const en = q => Math.ceil((q.k[2] - q.k[0]) * o), boy = q => Math.ceil((q.k[3] - q.k[1]) * o), sinir = Math.ceil(1620 * o);
    for (const a of ad) { const q = PP[a]; if (px + en(q) + b > sinir && px > b) { px = b; py += satir + b; satir = 0; } yer[a] = [px, py]; px += en(q) + b; W = Math.max(W, px); satir = Math.max(satir, boy(q)); }
    const H = py + satir + b, c = tuval(W, H, k => { for (const a of ad) { const q = PP[a], t = yer[a]; k.save(); k.translate(t[0] - q.k[0] * o, t[1] - q.k[1] * o); k.beginPath(); q.y.forEach((n, i) => i ? k.lineTo(n[0] * o, n[1] * o) : k.moveTo(n[0] * o, n[1] * o)); k.closePath(); k.clip(); k.drawImage(c0, 0, 0); k.restore(); } });
    const d = { tx: R.texture(c), resim: true, P, par: {}, pp: PP }; for (const a of ad) { const q = PP[a], t = yer[a]; d.par[a] = [(t[0] + 0.5) / W, (t[1] + 0.5) / H, (t[0] + en(q) - 0.5) / W, (t[1] + boy(q) - 0.5) / H]; }
    c0.width = c0.height = c.width = c.height = 0; return d; }
  const dokuSec = (R, x, g, s) => (x && RES[x.el] && resimDoku(R, x.el, x, paletOf(g), s)) || ejderDoku(R, paletOf(g), s);
  const onaltili = hex => { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: h * 60, s: mx ? d / mx : 0 }; };
  /* bir ejderhanın görünüş genleri (oyunun kendi okuyucularıyla); okunamazsa element rengi */
  function gorunus(x) { const el = x && x.el, q = onaltili((G.ELC && G.ELC[el]) || '#6fd0ff'), o = { ton: q.h, doy: q.s * 100, el, sus: null, pig: 'N', par: false, boy: 0 }, d = x && !x.genes && x.gx ? Object.assign({ genes: x.gx }, x) : x;
    try { const p = pulOf(d); if (p && isFinite(p.h) && isFinite(p.s)) { o.ton = p.h; o.doy = p.s * 100; } const s2 = susOf(d); if (s2 && isFinite(s2.h) && isFinite(s2.s)) o.sus = [s2.h, s2.s * 100]; o.pig = pigOf(d); o.par = !!parOf(d); o.boy = boyOf(d) || 0; } catch (_) { }
    o.ton += (x && x.hue || 0) * 2; return o; }
  const paletOf = g => palet(g.ton, g.doy, g);
  function kur(R, d, rakipler) { const t = {}, L0 = [], koy = (ad, c, w, h, golge) => { L0.push({ ad, c, w, h }); if (golge) L0.push({ ad: ad + 'G', c: golgeKop(c), w: w >> 1, h: h >> 1 }); };
    koy('isik', isikTuval(), 128, 128); koy('cizgi', cizgiTuval(), 256, 16); koy('halka', halkaTuval(), 256, 256);
    [[11, 0], [29, 0], [53, 1], [71, 1]].forEach((q, i) => koy('bulut' + i, bulutTuval(q[0] * 977, q[1]), 496, 248, true));
    [[5, 0], [17, 1], [23, 2], [41, 1], [59, 0]].forEach((q, i) => koy('ada' + i, adaTuval(q[0] * 1301, q[1]), 496, 496, true));
    koy('kapi', kapiTuval(), 600, 400, true); koy('firtina', firtinaTuval(), 496, 248); koy('kaya0', kayaTuval(4421), 256, 256); koy('kaya1', kayaTuval(9173), 256, 256);
    koy('binici', biniciTuval(), 260, 300); koy('atki', atkiTuval(), 240, 110);
    const A = atlas(L0); t.at = R.texture(A.c); t.uv = A.yer; A.c.width = A.c.height = 0;
    t.gok = R.texture(gokTuval(), { mips: false }); t.ufuk = R.texture(ufukTuval(), { mips: false });
    t.ben = dokuSec(R, d, gorunus(d), 1); t.rakip = {}; t.an = {};
    for (const x of rakipler || []) { const g = gorunus(x); g.ton = Math.round(g.ton / 10) * 10; g.doy = Math.round(g.doy / 15) * 15; if (g.sus) g.sus = [Math.round(g.sus[0] / 10) * 10, Math.round(g.sus[1] / 15) * 15]; const an = JSON.stringify(g) + (RES[x.el] ? JSON.stringify(renkFarki(x)) : ''); t.an[x.name] = an; if (!t.rakip[an]) t.rakip[an] = dokuSec(R, x, g, 0.5); }
    return t; }
  function birak(R) { if (!T) return; const sil = o => { if (o && o.t !== undefined && R.sil) R.sil(o); }; sil(T.at); sil(T.gok); sil(T.ufuk); sil(T.ben.tx); for (const k of Object.keys(T.rakip)) sil(T.rakip[k].tx); T = null; }

  /* ---------- durum ----------
     Y: race.js'in yarış nesnesi (RC). Kurallar, hızlar, rakipler, hırs, atılım, rüzgâr koridoru, sıralama ve ödül oradadır.
     U: bu dosyanın eklediği yanal eksen ve görsel durum. */
  let U = null, Y = null, onceki = 'meydan', kam = 'yakin', eski = null, secim = null;
  const giris = { x: 0, y: 0, tus: new Set(), cubuk: null }, BOS = { pos: 0, t: -3, sp: 1.4, L: 60, curV: 1.2, v: 1.2, rings: [], obs: [], riv: [], hirs: 0 };
  const yeni = () => ({ F: [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6], x: 0, vx: 0, y: 0.5, vy: 0, yatis: 0, yunus: 0, kanat: 0, sars: 0, kx: 0, kz: 2.35, kd: 6.6, kf: 1.5, t: 0, son: 0, parca: [], et: [], ben: null, oto: false });

  /* pisti arkadan uçuşa uyarlar: halkalar akıcı bir çizgiye dizilir, her şeye yanal konum verilir (race.js'te yanal eksen yoktur) */
  function pistKur() { const u = U, F = u.F;
    /* her halka çizgide durmaz: kimi yana açılır, hepsini toplamak olmaz (yandan yarışta da her halkaya yetişilmez) */
    Y.rings.forEach((r, i) => { const k = i * 7.31 + F[0], ac = i > 1 && hs(k) < 0.3; r.x3 = clamp(yolX(r.x, F) + (ac ? (hs(k + 1) > 0.5 ? 1 : -1) * (8.5 + hs(k + 2) * 3) : 0), -XM, XM); r.y = clamp(yolY(r.x, F) + (ac ? (hs(k + 3) - 0.5) * 0.24 : 0), 0.14, 0.86); });
    for (const o of Y.obs) { const k = o.x * 13.7, orta = hs(k) < 0.42; o.x3 = yolX(o.x, F) + (orta ? (hs(k + 1) - 0.5) * 3 : (hs(k + 2) > 0.5 ? 1 : -1) * (5 + hs(k + 3) * 7)); o.x3 = clamp(o.x3, -XM, XM); o.tur = hs(k + 4) > 0.5 ? 1 : 0;
      for (const r of Y.rings) if (Math.abs(r.x - o.x) < 0.42 && Math.abs(r.x3 - o.x3) < HALKA_X + ENGEL_X && Math.abs(r.y - o.y) < 0.2) o.y = clamp(r.y + (o.y >= r.y ? 0.24 : -0.24), 0.12, 0.88); }
    Y.riv.forEach((r, i) => { r.serit = [-6.5, 6.5, 0][i % 3]; r.x3 = r.serit; r.vx3 = 0; r.faz3 = hs(i + 3) * 6; }); }

  /* race.js adımının sarmalı: dikey eksen ve yanal eksen çubuktan gelir; rüzgâr koridoru ve yol kesme için yanal hiza da aranır
     (yanal olarak uzaktaki rakip, adım süresince dikeyde de uzak gösterilir; adım bitince kendi dikey hareketi yeniden hesaplanır) */
  function adimSar(dt, auto) { const u = U; if (!u || !Y || RC !== Y || auto) return eski.step(dt, auto);
    let ix = giris.x + (giris.tus.has('sag') ? 1 : 0) - (giris.tus.has('sol') ? 1 : 0), iy = giris.y + (giris.tus.has('yukari') ? 1 : 0) - (giris.tus.has('asagi') ? 1 : 0);
    if (u.oto) { const h = Y.rings.find(r => !r.hit && r.x > Y.pos + 0.05), e = Y.obs.find(o => !o.hit && o.x > Y.pos && o.x < Y.pos + 1.1 && Math.abs(o.x3 - u.x) < ENGEL_X + 1 && Math.abs(o.y - u.y) < 0.14); ix = h ? (h.x3 - u.x) / 2.5 : 0; iy = h ? (u.y - h.y) / 0.07 : 0; if (e) ix += (u.x >= e.x3 ? 1 : -1) * 1.4; }
    ix = clamp(ix, -1, 1); iy = clamp(iy, -1, 1);
    u.vx += (ix * VX - u.vx) * yak(dt, 7.5); u.vy += (-iy * VY - u.vy) * yak(dt, 7.5); u.vy += (Y.gustTurb || 0) * dt * 0.5;
    u.x += u.vx * dt; u.y += u.vy * dt; if (Math.abs(u.x) > XM) { u.x = clamp(u.x, -XM, XM); u.vx *= 0.3; } if (u.y < 0.06 || u.y > 0.94) { u.y = clamp(u.y, 0.06, 0.94); u.vy *= 0.3; }
    const sakli = [];
    for (const r of Y.riv) { const g = r.pos - Y.pos; let hedef = yolX(r.pos, u.F) + r.serit + 2.4 * Math.sin(Y.t * 0.5 + r.faz3); if (r.style === 'kurnaz' && g > 0 && g < 1.3) hedef = u.x;
      r.vx3 += (clamp((hedef - r.x3) * 1.6, -8, 8) - r.vx3) * yak(dt, 4); r.x3 = clamp(r.x3 + r.vx3 * dt, -XM, XM);
      if (Math.abs(r.x3 - u.x) > KOR_X) { sakli.push(r, r.y); r.y += 5; } }
    Y.y = u.y; Y.vy = u.vy; eski.step(dt, false);
    for (let i = 0; i < sakli.length; i += 2) { const r = sakli[i], y0 = sakli[i + 1]; r.vy = clamp((r.ty - y0) * 2.1, -0.42, 0.42); r.y = clamp(y0 + r.vy * dt, 0.1, 0.9); }
    Y.y = u.y; Y.vy = u.vy; }
  /* halka ve engel: race.js yalnız ilerleme ve yüksekliğe bakar; yanal olarak ıskalananlar o an için sayılmaz */
  function carpSar(quiet) { const u = U; if (!u || !Y || RC !== Y) return eski.hits(quiet); const gec = [];
    for (const r of Y.rings) if (!r.hit && Math.abs(r.x - Y.pos) < 0.3 && Math.abs(r.x3 - u.x) > HALKA_X) { r.hit = true; gec.push(r); }
    for (const o of Y.obs) if (!o.hit && Math.abs(o.x - Y.pos) < 0.3 && Math.abs(o.x3 - u.x) > ENGEL_X) { o.hit = true; gec.push(o); }
    const h0 = Y.got, c0 = Y.hits; eski.hits(quiet); for (const q of gec) q.hit = false;
    if (Y.got > h0) { const r = Y.rings.find(q => q.hit && q.t3 === undefined); if (r) { r.t3 = u.t; kivilcim(r, 14); } u.sars = Math.max(u.sars, 0.25); }
    for (const o of Y.obs) if (!o.hit && !o.gec3 && o.x < Y.pos - 0.15) { o.gec3 = 1; if (!quiet && Math.abs(o.x3 - u.x) < ENGEL_X * 1.7 && Math.abs(o.y - u.y) < 0.17 && typeof raceFx === 'function') { raceFx('KIL PAYI!', 'good'); u.sars = Math.max(u.sars, 0.3); } }
    if (Y.hits > c0) { const o = Y.obs.find(q => q.hit && q.t3 === undefined); if (o) { o.t3 = u.t; u.vx += (u.x >= o.x3 ? 1 : -1) * 7; } u.sars = 1; } }
  function kivilcim(h, n) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; U.parca.push({ x: h.x3 + Math.cos(a) * HALKA_R, z: Zm(h.y) + Math.sin(a) * HALKA_R, y: h.x * M, vx: Math.cos(a) * (3 + hs(i) * 5), vz: Math.sin(a) * (3 + hs(i + 9) * 5), t: 0, om: 0.5 + hs(i * 3) * 0.4 }); } }

  /* ---------- çizim: kendi izdüşümü, oyunun çizicisi (ekran koordinatı) ---------- */
  const liste = [];
  function ciz(R, F) { if (!U || !T) return; const u = U, y = Y || BOS, dt = Math.min(0.05, F.dt || 0.016); u.t += dt;
    const sp = y.sp, hiz = y.done ? (y.v || sp) * 0.72 : y.t < 0 ? sp * 0.55 : (y.curV || sp), oran = hiz / sp; if (y.done) u.son += hiz * dt;
    const ofs = (y.t < 0 ? y.t * 0.55 * sp : 0) + u.son, pv = (y.pos + ofs) * M, bz0 = Zm(u.y), ucusta = y.t >= 0 && !y.done;
    const atil = y.dashT > 0, hizli = atil || y.boost > 0.15 || y.slipSurgeT > 0, yavas = y.gustPenalty > 0.08 || y.blockT > 0;
    /* görsel durum: yatış, yunuslama, kanat temposu, kamera */
    u.yatis += (-u.vx / VX * 0.44 - u.yatis) * yak(dt, 9); u.yunus += (-u.vy / VY - u.yunus) * yak(dt, 6);
    const kn0 = Math.sin(u.kanat); u.kanat += dt * (2.4 + Math.max(0, -u.vy / VY) * 6 + (atil ? 7 : 0) + (y.t < 0 ? 2 : 0));
    { const a = EO2.audio; if (a && a.ruzgar) { u.sesT = (u.sesT || 0) - dt; if (u.sesT <= 0) { u.sesT = 0.12; a.ruzgar(Y && !secimBitti() ? 0.35 + clamp(oran - 0.5, 0, 1.2) * 0.9 : 0.25); } if (kn0 > 0.2 && Math.sin(u.kanat) <= 0.2 && a.ucus) a.ucus('cirp'); } }
    u.kx += (u.x * 0.88 - u.kx) * yak(dt, 6); u.kz += (bz0 * 0.95 + 2.2 - u.kz) * yak(dt, 6);
    u.kd += (6.6 + clamp(oran - 1, -0.12, 1) * 3.2 - u.kd) * yak(dt, 3); u.kf += (1.5 - clamp(oran - 1, 0, 1) * 0.42 - u.kf) * yak(dt, 4); u.sars = Math.max(0, u.sars - dt * 1.6);
    for (const p of u.parca) { p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt; } if (u.parca.length) u.parca = u.parca.filter(p => p.t < p.om);

    const en = R.w / R.h, sal = u.sars * 0.012, kx = u.kx + Math.sin(u.t * 71) * sal * 6, kz = u.kz + Math.cos(u.t * 83) * sal * 6, ky = pv - u.kd, f = u.kf * clamp(en / 1.45, 0.32, 1);
    const dn = u.yatis * 0.3, cs = Math.cos(dn), sn = Math.sin(dn), ufuk = 0.12 - u.yunus * 0.05;
    const P4 = (px, py) => [(px * cs - py * sn) / en, px * sn + py * cs, 0];
    /* dörtgen: merkez (ekran birimi, yatıştan önce), yarı en ve boy, kendi dönüşü */
    const TAM = [0, 0, 1, 1], UV = T.uv, AT = T.at;
    const kare = (tex, uv, px, py, hw, hh, don, renk, ekle, ayna) => { const c = Math.cos(don || 0), s = Math.sin(don || 0), k = (dx, dy) => P4(px + dx * c - dy * s, py + dx * s + dy * c);
      R.quad(tex, k(-hw, -hh), k(hw, -hh), k(hw, hh), k(-hw, hh), ayna ? uv[2] : uv[0], uv[1], ayna ? uv[0] : uv[2], uv[3], renk, !!ekle, 0, true); };
    const isik = (px, py, r, renk) => kare(AT, UV.isik, px, py, r, r, 0, renk, true);
    const iz = (X, Z, Yw) => { const d = Yw - ky; if (d < 0.6) return null; const s = f / d; return [(X - kx) * s, (Z - kz) * s + ufuk, s, d]; };
    const pus = [0.8, 0.87, 0.98], pusK = d => clamp((d - 140) / 620, 0, 0.86);

    /* 1) gök: yatışla döner, yunuslamayla kayar */
    kare(T.gok, TAM, 0, ufuk, 4.2, 3.4, 0, [1, 1, 1, 1]);
    const gx = 1.02 - u.kx * 0.004, gy = ufuk + 0.56; isik(gx, gy, 1.2, [0.36, 0.3, 0.18, 1]); isik(gx, gy, 0.27, [0.6, 0.54, 0.4, 1]); isik(gx, gy, 0.1, [1, 0.98, 0.9, 1]);
    /* uzak ufuk şeridi: iki kat, yana kayarak (ıraklık açısı) */
    for (let k = 0; k < 2; k++) { const gen = k ? 5.2 : 3.6, kay = ((u.kx * (k ? 0.006 : 0.003) + k * 0.37) % 1 + 1) % 1, yy = ufuk + (k ? -0.07 : 0.02), hh = gen / 8 * 0.5;
      for (let i = -1; i <= 1; i++) kare(T.ufuk, TAM, (i - kay + 0.5) * gen, yy, gen / 2, hh, 0, k ? [1, 1, 1, 0.96] : [0.94, 0.96, 1, 0.7]); }

    /* 2) dünya nesneleri: uzaktan yakına */
    liste.length = 0; const koy = (d, fn) => liste.push({ d, fn });
    const nesne = (tex, texG, X, Z, Yw, w, h, o) => { const p = iz(X, Z, Yw); if (!p) return; const hw = w * p[2] / 2, hh = h * p[2] / 2; if (Math.abs(p[0]) - hw > en * 1.25 || Math.abs(p[1]) - hh > 1.6) return;
      const a = (o && o.a !== undefined ? o.a : 1) * clamp((o && o.uzak ? o.uzak : 900) - p[3], 0, 120) / 120 * clamp((p[3] - 1.5) / (o && o.yakin || 6), 0, 1); if (a < 0.01) return;
      koy(p[3], () => { kare(AT, UV[tex], p[0], p[1], hw, hh, o && o.don || 0, [1, 1, 1, a], false, o && o.ayna); const k = pusK(p[3]) * (o && o.pus !== undefined ? o.pus : 1); if (texG && k > 0.02) kare(AT, UV[tex + 'G'], p[0], p[1], hw, hh, 0, [pus[0], pus[1], pus[2], a * k], false, o && o.ayna); }); };
    /* bulut denizi: altta, ızgara gözlerinde; her gözün yeri tohumdan gelir (akarken titremez) */
    const G1 = 92, j0 = Math.floor((ky + 10) / G1), i0 = Math.round(kx / G1);
    for (let j = j0; j < j0 + 11; j++) { const yay = 3 + Math.floor((j - j0) * 0.7); for (let i = i0 - yay; i <= i0 + yay; i++) { const k = i * 131 + j * 71, tur = Math.floor(hs(k) * 4), w = 120 + hs(k + 1) * 90;
        nesne('bulut' + tur, true, i * G1 + (hs(k + 2) - 0.5) * G1 * 0.8, DENIZ + hs(k + 3) * 14, j * G1 + hs(k + 4) * G1, w, w * 0.5, { ayna: hs(k + 5) > 0.5, uzak: 1000, yakin: 30, pus: 0.75 }); } }
    /* adalar: pistin iki yanında, değişen irtifada */
    const G2 = 118, a0 = Math.floor((ky - 40) / G2);
    for (let j = a0; j < a0 + 9; j++) for (let yan = -1; yan <= 1; yan += 2) { const k = j * 37 + yan * 11, tur = Math.floor(hs(k) * 5), w = 46 + hs(k + 1) * 44; if (hs(k + 6) < 0.18) continue;
      nesne('ada' + tur, true, yan * (34 + hs(k + 2) * 60), -22 + hs(k + 3) * 22 + Math.sin(u.t * 0.5 + k) * 0.5, j * G2 + hs(k + 4) * 70, w, w, { ayna: hs(k + 5) > 0.5, uzak: 980, yakin: 14 }); }
    /* çok uzakta, yüksekte büyük adalar (yön duygusu) */
    for (let j = 0; j < 3; j++) { const k = 900 + j * 13, Yw = ky + 620 + j * 130; nesne('ada' + (j % 5), true, (hs(k) - 0.5) * 520, 40 + hs(k + 1) * 90, Yw, 150, 150, { uzak: 2000, pus: 1.05 }); }
    /* yakın bulut tutamları: hız duygusu */
    const G3 = 34, b0 = Math.floor(ky / G3);
    for (let j = b0; j < b0 + 9; j++) { const k = j * 53, yan = hs(k) > 0.5 ? 1 : -1, tur = 2 + Math.floor(hs(k + 1) * 2), w = 20 + hs(k + 2) * 18;
      nesne('bulut' + tur, false, yan * (20 + hs(k + 3) * 32), -16 + hs(k + 4) * 32, j * G3 + hs(k + 5) * G3, w, w * 0.5, { a: 0.5, uzak: 320, yakin: 16, ayna: hs(k + 6) > 0.5 }); }
    /* halkalar */
    const siradaki = ucusta ? y.rings.find(h => !h.hit && h.x > y.pos - 0.1) : y.rings.find(h => !h.hit);
    for (const h of y.rings) { const p = iz(h.x3, Zm(h.y), h.x * M); if (!p || p[3] > 760) continue; const r = HALKA_R * 1.2 * p[2], bu = h === siradaki, nb = bu ? 1 + Math.sin(u.t * 6) * 0.06 : 1, a = clamp((760 - p[3]) / 140, 0, 1), gecti = !h.hit && h.x < y.pos - 0.13;
      koy(p[3], () => { if (h.hit) { const k = clamp(1 - (u.t - (h.t3 || 0)) * 3, 0, 1); if (k > 0) isik(p[0], p[1], r * (2 + (1 - k) * 2), [1 * k, 0.86 * k, 0.4 * k, 1]); return; }
        const s = gecti ? 0.45 : 1; isik(p[0], p[1], r * 1.9, [0.5 * a * s, 0.36 * a * s, 0.12 * a * s, 1]); if (bu) isik(p[0], p[1], r * 2.7 * nb, [0.42, 0.34, 0.16, 1]);
        kare(AT, UV.halka, p[0], p[1], r * nb, r * nb, u.t * 0.25 + h.x, [s, s, s, a * (gecti ? 0.5 : 1)]); }); }
    /* yol ışıkları: sıradaki halkaya giden çizgi */
    if (siradaki && ucusta) for (let i = 1; i <= 6; i++) { const q = lerp(y.pos + 0.26, siradaki.x, i / 7), k4 = Math.min(1, i / 4), p = iz(lerp(u.x, yolX(q, u.F), k4), lerp(bz0, Zm(yolY(q, u.F)), k4), (q + ofs) * M); if (!p) continue; const r = 0.5 * p[2], k = 0.55 + 0.45 * Math.sin(u.t * 7 - i * 0.9); koy(p[3], () => isik(p[0], p[1], r, [1 * k, 0.9 * k, 0.55 * k, 1])); }
    /* engeller: fırtına bulutu çakar, kaya ağır ağır döner; çarpılan söner */
    for (const o of y.obs) { const d = o.x * M - ky; if (d < 1 || d > 620) continue; const a = o.hit && o.t3 !== undefined ? clamp(1 - (u.t - o.t3) * 2.5, 0, 1) * 0.8 : 1; if (a < 0.02) continue; const z = Zm(o.y) + Math.sin(u.t * 1.3 + o.x * 2) * 0.3;
      /* çarpışma yolundaki engel kızıl parlar */
      if (ucusta && !o.hit && d < 34 && d > u.kd && Math.abs(o.x3 - u.x) < ENGEL_X && Math.abs(o.y - u.y) < 0.1) { const p = iz(o.x3, z, o.x * M); if (p) { const k = 0.5 + 0.5 * Math.sin(u.t * 16); koy(p[3] + 0.02, () => isik(p[0], p[1], 7 * p[2], [0.9 * k, 0.16 * k, 0.1 * k, 1])); } }
      if (o.k === 'bulut') { nesne('firtina', false, o.x3, z, o.x * M, 9.4, 4.7, { a, uzak: 640, yakin: 3, ayna: o.tur > 0 }); if (Math.sin(u.t * 9 + o.x * 3) > 0.8) { const p = iz(o.x3, z, o.x * M); if (p) koy(p[3] - 0.01, () => isik(p[0], p[1], 5.5 * p[2], [0.42 * a, 0.4 * a, 0.75 * a, 1])); } }
      else nesne('kaya' + o.tur, false, o.x3, z, o.x * M, 6.4, 6.4, { a, uzak: 640, yakin: 3, don: Math.sin(u.t * 0.4 + o.x) * 0.25 }); }
    /* bitiş kapısı */
    nesne('kapi', true, yolX(y.L, u.F) * 0.5, 4, y.L * M, 66, 44, { uzak: 900, yakin: 2, pus: 0.8 });
    for (const q of u.parca) { const p = iz(q.x, q.z, q.y); if (!p) continue; const k = 1 - q.t / q.om, r = 0.34 * p[2]; koy(p[3], () => isik(p[0], p[1], r, [1 * k, 0.85 * k, 0.4 * k, 1])); }
    /* rakipler: arkalarında rüzgâr koridoru izi; koridora girince iz parlar */
    u.et.length = 0;
    for (const r of y.riv) { const rz = Zm(r.y), rY = (r.pos + ofs) * M, p = iz(r.x3, rz, rY), g = r.pos - y.pos; u.et[r.i] = null; if (!p || p[3] > 560) continue;
      const a = clamp((p[3] - u.kd + 2.4) / 2.4, 0, 1) * clamp((560 - p[3]) / 120, 0, 1); /* arkamızda kalan rakip görüşü kapatmasın: solar */ if (a < 0.02) continue; const dk = T.rakip[T.an[r.name]] || T.ben, hz = (r.bA > 0 || r.slipSurgeT > 0) ? 0.7 : 0;
      koy(p[3], () => ejder(p, dk, clamp(-r.vx3 / VX * 0.5, -0.5, 0.5), u.t * (3 + r.i * 0.23) + r.faz3, clamp(-(r.vy || 0) * 1.6, -0.6, 0.6), a, hz, 0, [0.9, 0.93, 1]));
      if (ucusta && g > 0.05 && g < 1.9) { const bu = y.draft === r; for (let k = 1; k <= 6; k++) { const q = iz(r.x3 + Math.sin(u.t * 3 + k) * 0.25, rz - 0.2, rY - k * 3.6); if (!q) continue; const rr = (2.3 - k * 0.14) * q[2], s = (bu ? 0.3 : 0.11) * (1 - k / 8) * (0.75 + 0.25 * Math.sin(u.t * 8 - k * 1.2)); koy(q[3], () => isik(q[0], q[1], rr, bu ? [0.55 * s, 1 * s, 0.7 * s, 1] : [0.7 * s, 0.9 * s, 1 * s, 1])); } }
      const e = iz(r.x3, rz + 2.6, rY); if (e) { const q = P4(e[0], e[1]); u.et[r.i] = [q[0] * 0.5 + 0.5, 0.5 - q[1] * 0.5, p[3]]; } }
    /* oyuncu */
    const bz = iz(u.x, bz0, pv); koy(bz[3], () => ejder(bz, T.ben, u.yatis, u.kanat, u.yunus, 1, atil ? 1 : hizli ? 0.5 : 0, yavas ? 1 : 0, null, true));
    { const e = iz(u.x, bz0 + 3.4, pv), q = e && P4(e[0], e[1]); u.ben = q ? [q[0] * 0.5 + 0.5, 0.5 - q[1] * 0.5] : null; }
    liste.sort((a, b) => b.d - a.d); for (const it of liste) it.fn();

    /* 3) ekran üstü: hız çizgileri */
    const hizK = clamp((oran - 1.05) / 0.5, 0, 1); if (hizK > 0.02) for (let i = 0; i < 22; i++) { const a = hs(i * 5.3) * Math.PI * 2, t = (u.t * (1.6 + hs(i) * 1.4) + hs(i * 9)) % 1, r = 0.75 + t * 1.4, px = Math.cos(a) * r * en * 0.8, py = Math.sin(a) * r * 0.8 + ufuk * 0.3, boy = 0.1 + t * 0.3; kare(AT, UV.cizgi, px, py, boy, 0.004 + t * 0.007, Math.atan2(Math.sin(a) * 0.8, Math.cos(a) * en * 0.8), [hizK * t * 0.55, hizK * t * 0.55, hizK * t * 0.55, 1], true); }

    /* ejderha: kanatlar omuzdan döner (tek resim, ayna), kuyruk salınır, binici ve atkı üstte */
    function ejder(p, dk, yatis, faz, yunus, a, parla, sarsik, ton, ben) { const s = p[2] * (1 + (dk.P.boy || 0) * 0.04), ox = p[0], oy = p[1], c = Math.cos(yatis), sn2 = Math.sin(yatis), kz2 = sarsik ? 0.82 : 1, renk = [1, kz2, kz2, a], tex = dk.tx;
      const E = (dx, dy) => P4(ox + (dx * c - dy * sn2) * s, oy + (dx * sn2 + dy * c) * s);
      /* parça: mafsal (ejderha uzayı, m), mafsalın dokudaki yeri (0–1, soldan ve üstten), en ve boy (m), dönüş, ayna */
      const parca = (tx, uv, mx, my, ax, ay, w, h, don, ayna, rk) => { const cc = Math.cos(don), ss = Math.sin(don), k = (qx, qy) => { const lx = (qx - ax) * w * (ayna ? -1 : 1), ly = (ay - qy) * h; return E(mx + lx * cc - ly * ss, my + lx * ss + ly * cc); };
        R.quad(tx, k(0, 1), k(1, 1), k(1, 0), k(0, 0), uv[0], uv[1], uv[2], uv[3], rk || renk, false, 0, true); };
      if (parla > 0) { const k = parla * a, cc = dk.P.iz, I = UV.isik; for (const yan of [-1, 1]) R.quad(AT, E(yan * 3.3 - 1.6, -2.6), E(yan * 3.3 + 1.6, -2.6), E(yan * 3.3 + 1.1, 1.0), E(yan * 3.3 - 1.1, 1.0), I[0], I[1], I[2], I[3], [cc[0] * k * 0.4, cc[1] * k * 0.4, cc[2] * k * 0.4, 1], true, 0, true); isik(ox, oy - 0.9 * s, 2.4 * s, [cc[0] * k * 0.2, cc[1] * k * 0.2, cc[2] * k * 0.2, 1]); }
      if (dk.resim) { /* gerçek çizim: kanat omuz çizgisinden eğilir (kök yerinde kalır, uç iner kalkar), kuyruk kökünden salınır */
        const cirp = Math.sin(faz), W = (x, y) => [(x - POZ_X) / POZ_PM, (POZ_Y - y) / POZ_PM + POZ_Y0], dort = (ad, f) => { const q = dk.pp[ad], k = q.k, uv = dk.par[ad], n = (x, y) => { const v = f(x - q.m[0], q.m[1] - y), w = W(q.m[0], q.m[1]); return E(w[0] + v[0] / POZ_PM, w[1] + v[1] / POZ_PM); };
          R.quad(tex, n(k[0], k[3]), n(k[2], k[3]), n(k[2], k[1]), n(k[0], k[1]), uv[0], uv[1], uv[2], uv[3], renk, false, 0, true); };
        for (const yan of [-1, 1]) { const ac = cirp * 0.34 + 0.04 + yunus * 0.1 + yan * yatis * 0.12, cc = Math.cos(ac), ss = Math.sin(ac); dort(yan < 0 ? 'kanatL' : 'kanatR', (lx, ly) => [lx * cc, ly + lx * yan * ss]); }
        const kd = Math.sin(faz * 0.5 + 1) * 0.1 - yatis * 0.4, kc = Math.cos(kd), ks = Math.sin(kd); dort('kuyruk', (lx, ly) => [lx * kc - ly * ks, lx * ks + ly * kc]); dort('govde', (lx, ly) => [lx, ly]);
      } else {
      const cirp = Math.sin(faz), acik = -0.2 + cirp * 0.3 + yunus * 0.1, kis = 1 - Math.abs(cirp) * 0.07, kw = 6.0 * kis, kh = kw * KANAT_H / KANAT_W;
      parca(tex, dk.kanat, -0.42, 0.62, KANAT_M[0] / KANAT_W, KANAT_M[1] / KANAT_H, kw, kh, -acik, false);
      parca(tex, dk.kanat, 0.42, 0.62, KANAT_M[0] / KANAT_W, KANAT_M[1] / KANAT_H, kw, kh, acik, true);
      const gh = 4.3, gw = gh * GOVDE_W / GOVDE_H * 1.08; parca(tex, dk.govde, 0, 0.1, 0.5, 0.5, gw, gh, 0, false);
      const kyh = 2.5, kyw = kyh * KUYRUK_W / KUYRUK_H; parca(tex, dk.kuyruk, 0, -1.7, 0.5, 0.03, kyw, kyh, Math.sin(faz * 0.5 + 1) * 0.16 - yatis * 0.5, false); }
      const rk = ton ? [ton[0], ton[1], ton[2], a] : renk, dalga = Math.sin(u.t * 9 + faz) * 0.16 + Math.sin(u.t * 14.3) * 0.07;
      parca(AT, UV.atki, -0.1, 0.48, 0.97, 0.5, 1.3 + (ben ? (oran - 1) * 0.4 : 0), 0.5, 0.12 + dalga - yatis * 0.6, false, rk); parca(AT, UV.binici, 0, -0.14, 0.5, 0.82, 1.42, 1.64, -yatis * 0.25, false, rk); }
  }

  /* ---------- sahne tanımı: zemin çizilmez (tek kalemin anahtarı 1000'in üstünde) ---------- */
  const L = { id: 'gok3', name: 'Gök Yarışı', sub: 'Sırtından uçuş', gx: 40, gy: 60, flyer: false, petals: false, floor: 0, light: { amb: [1, 1, 1], night: 0, fog: 0, clear: [0.39, 0.7, 0.93, 1] },
    bounds: [-2, 2, 10, 10], mapRect: [-8, 0, 16, 20], paved: [], start: { x: 0, y: 10, dir: 'up' }, entry: {}, signs: [], interact: [], lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [], npcs: [], rects: [], circles: [], lights: [], embers: [], shadows: [], mini: { paved: [], blocks: [], bg: '#6fb4ee' } };
  D.gok3 = { L, build(h) { h.push({ key: 5000, draw: ciz }); return {}; } };

  /* ---------- göstergeler ve kumanda ----------
     Kimlikler race.js'in beklediği kimliklerdir (racem, rdr, rcom, rcount, rhint, rhirs, rdash, rrank, rrv…): sayaç, yorum,
     rakip sözleri, hırs ve sonuç kartını race.js kendisi doldurur. */
  const Q = id => document.getElementById(id), esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bicim = '#app[data-scene="gok3"] .rehber{display:none!important}.y3{cursor:default}.y3 .y3-cubuk{position:absolute;width:8.4em;height:8.4em;margin:-4.2em 0 0 -4.2em;border-radius:50%;background:radial-gradient(circle,rgba(20,26,46,.28),rgba(20,26,46,.5));box-shadow:inset 0 0 0 2px rgba(214,206,184,.75),0 0 0 1.5px rgba(8,10,20,.6);pointer-events:none;opacity:.5;transition:opacity .2s}' +
    '.y3 .y3-cubuk.tut{opacity:1}.y3 .y3-cubuk i{position:absolute;left:50%;top:50%;width:3.6em;height:3.6em;margin:-1.8em 0 0 -1.8em;border-radius:50%;background:radial-gradient(circle at 50% 30%,#f4ecd8,#b9a777);box-shadow:inset 0 0 0 2px #fffaf0,0 0 0 1.5px rgba(8,10,20,.85),0 .25em .6em rgba(4,6,16,.5)}' +
    '.y3 .y3-ark{position:absolute;left:0;bottom:.5em;width:2.8em;height:1.7em;margin-left:-1.4em;opacity:0;pointer-events:none;background:var(--c);clip-path:polygon(50% 0,100% 100%,50% 68%,0 100%);filter:drop-shadow(0 0 .2em rgba(8,10,20,.9));transition:opacity .15s}' +
    '.y3.final::after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 6em rgba(255,200,90,.38);animation:y3son 1.1s ease-in-out infinite alternate}@keyframes y3son{from{opacity:.35}to{opacity:1}}' +
    '.y3 .y-atil{left:auto;right:1.6em;width:7em;height:7em}.y3 .y-hirs{left:50%;transform:translateX(-50%)}.y3 .y-fx{will-change:transform}.y3 .y-konus{transition:opacity .2s}.y3 .y-yorum{bottom:max(5.6em,env(safe-area-inset-bottom,0px))}' +
        '@media (max-aspect-ratio:1/1){.y3 .y-ust{grid-template-columns:1fr auto auto}.y3 .y-ipucu{top:13.4em}.y3 .y-hirs{bottom:10.4em;width:13em}.y3 .y-yorum{bottom:13.4em}}@media (max-height:560px){.y3 .y-fark{top:5.6em}.y3 .y-atil{width:5.4em;height:5.4em;right:1em}.y3 .y3-cubuk{font-size:.8em}.y3 .y-yorum{bottom:4.6em;font-size:.9em}}';
  function govde() { const d = Y.d, race = Y.race, solo = !Y.riv.length, OLD = G.OLD, dn = secim && secim.deneme;
    return '<style>' + bicim + '</style><header class="y-ust"><div class="y-ad">' + '<small>' + (dn ? 'Deneme · ödülsüz' : race ? 'Gök yarışı' : 'Antrenman uçuşu') + '</small>' + '<b>' + esc2(race && !dn ? race.ad : Y.V.ad) + '</b></div>' +
      '<div class="y-pist" id="rtrack"><i class="cizgi"></i>' + Y.riv.map(x => '<span class="rmk riv' + (x.nem ? ' nem' : '') + '" id="rv' + x.i + '" style="--c:' + (G.ELC[x.el] || '#fff') + '"><img alt="" src="' + OLD + 'img/dr-' + x.el + '-yetiskin.webp"></span>').join('') + '<span class="rmk me" id="rme" style="--c:#a6e0ff"><img alt="" src="' + G.img(d) + '"></span><i class="bayrak"></i></div>' +
      (solo ? '' : '<div class="y-sira" id="rrank"><b>' + (Y.riv.length + 1) + '</b><small>/ ' + (Y.riv.length + 1) + '</small></div>') + (dn ? '<button type="button" class="gbtn kucuk" id="y3cik">Çık</button>' : '<button type="button" class="gbtn kucuk" data-a="race-auto">Otomatik uç</button>') + '</header>' +
      (solo ? '' : '<div class="y-fark"><span id="rgapA"></span><span id="rgapB"></span></div>') + '<div class="y-fx" id="rdr"></div>' +
      Y.riv.map(x => '<div class="y-konus' + (x.nem ? ' nem' : '') + '" id="rrv' + x.i + '"><b>' + (x.nem ? '<em>Ezeli rakip</em>' : '') + esc2(x.name) + '</b><span class="rsay"></span></div>').join('') +
      Y.riv.map(x => '<i class="y3-ark" id="y3a' + x.i + '" style="--c:' + (G.ELC[x.el] || '#fff') + '"></i>').join('') + '<div class="y3-cubuk" id="y3cubuk" style="left:7.4em;top:calc(100% - 7.4em)"><i></i></div>' +
      '<div class="y-hirs" id="rhirs"><b>Hırs</b><span><i id="rhirsf"></i><s></s></span></div>' +
      '<button type="button" class="y-atil" id="rdash"><b>Atıl</b>' + (matchMedia('(pointer: coarse)').matches ? '' : '<small>Boşluk</small>') + '</button>' +
      '<div class="y-yorum" id="rcom"></div><div class="y-say" id="rcount">3</div><p class="y-ipucu" id="rhint">Sürükle ya da ok tuşları: <b>yönlendir</b> · <b>halkaların içinden</b> geç · öndekinin <b>rüzgâr izine</b> gir · hırs dolunca <b>atıl</b></p>'; }
  /* race.js her karede bunu çağırır (raceDraw yerine): göstergeler ve rakip etiketleri */
  let sonHud = '';
  function hud() { const y = Y, u = U, w = Q('racem'); if (!y || !u || !w) return; const tw = v => (clamp(v, 0, 1) * 100).toFixed(1) + '%', W = w.clientWidth, H = w.clientHeight;
    for (const r of y.riv) { const e = Q('rrv' + r.i), p = u.et[r.i]; if (!e) continue; if (!p || p[2] > 260 || p[0] < -0.1 || p[0] > 1.1) { e.style.opacity = 0; continue; } e.style.opacity = 1; e.style.transform = 'translate(' + (p[0] * W).toFixed(1) + 'px,' + Math.max(p[1] * H, H * 0.1 + 64).toFixed(1) + 'px) translate(-50%,-100%) scale(' + clamp(26 / p[2], 0.62, 1).toFixed(2) + ')'; }
    /* arkadan yaklaşan rakip: alt kenarda, geldiği yanda bir ok */
    for (const r of y.riv) { const e = Q('y3a' + r.i), g = r.pos - y.pos; if (!e) continue; const a = g < 0 && g > -1.1 && !y.done ? 1 - (-g) / 1.1 : 0; e.style.opacity = a.toFixed(2); if (a > 0) e.style.left = clamp(50 + (r.x3 - u.x) / XM * 38, 4, 96).toFixed(1) + '%'; }
    const fx = Q('rdr'); if (fx && u.ben) fx.style.transform = 'translate(' + (u.ben[0] * W).toFixed(1) + 'px,' + (u.ben[1] * H).toFixed(1) + 'px)';
    const cost = typeof dashCost === 'function' ? dashCost() : 50, sira = y.riv.length ? (y.rank || raceRank()) : 0, sec = g => (Math.abs(g) / y.sp).toFixed(1).replace('.', ',');
    const on = y.riv.filter(r => r.pos > y.pos).sort((a, b) => a.pos - b.pos)[0], ar = y.riv.filter(r => r.pos <= y.pos).sort((a, b) => b.pos - a.pos)[0];
    const durum = [tw(y.pos / y.L), y.riv.map(r => tw(r.pos / y.L)).join(), Math.round(y.hirs), y.dashT > 0 ? 1 : 0, sira, on ? on.i + sec(on.pos - y.pos) : '', ar ? ar.i + sec(y.pos - ar.pos) : '', y.slipSurgeT > 0 ? 's' : y.draft ? Math.round((y.draftCharge || 0) * 20) : ''].join('|'); if (durum === sonHud) return; sonHud = durum;
    const me = Q('rme'); if (!me) return; me.style.left = tw(y.pos / y.L); y.riv.forEach(x => { const e = Q('rv' + x.i); if (e) e.style.left = tw(x.pos / y.L); });
    const hf = Q('rhirsf'); if (hf) { hf.style.width = y.hirs + '%'; Q('rhirs').classList.toggle('ready', y.hirs >= cost); Q('rdash').classList.toggle('ready', y.hirs >= cost && y.dashT <= 0); }
    if (y.riv.length) { const rk = w.querySelector('#rrank b'); if (rk) rk.textContent = sira; const A = Q('rgapA'), B = Q('rgapB');
      const slip = y.slipSurgeT > 0 ? ' · <b class="iyi">Koridor ivmesi!</b>' : y.draft ? ' · <b class="iyi">Rüzgâr koridoru %' + Math.round((y.draftCharge || 0) * 100) + '</b>' : '';
      if (A) { A.innerHTML = (on ? 'Önde: <b>' + esc2(on.name) + '</b> (' + sec(on.pos - y.pos) + ' sn)' : '<b class="iyi">Öndesin!</b>') + slip; A.className = (on && on.pos - y.pos < 0.5) || y.draft || y.slipSurgeT > 0 ? 'sicak' : ''; }
      if (B) { B.innerHTML = ar ? 'Geride: <b>' + esc2(ar.name) + '</b> (' + sec(y.pos - ar.pos) + ' sn)' : ''; B.className = ar && y.pos - ar.pos < 0.5 ? 'sicak' : ''; } } }

  const TUS = { ArrowLeft: 'sol', KeyA: 'sol', ArrowRight: 'sag', KeyD: 'sag', ArrowUp: 'yukari', KeyW: 'yukari', ArrowDown: 'asagi', KeyS: 'asagi' };
  function tus(e) { if (!U) return; const k = TUS[e.code]; if (k) { e.type === 'keydown' ? giris.tus.add(k) : giris.tus.delete(k); e.preventDefault(); e.stopPropagation(); return; }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (e.type === 'keydown' && !e.repeat && typeof raceDash === 'function') raceDash(); e.preventDefault(); e.stopPropagation(); }
    else if (e.type === 'keydown' && e.code === 'Escape' && secim && secim.deneme) cik(); }
  function bagla(w) { const cb = Q('y3cubuk'), top = cb.firstElementChild, yari = () => cb.offsetWidth * 0.5;
    const birak2 = e => { if (!giris.cubuk || (e && e.pointerId !== giris.cubuk.id)) return; giris.cubuk = null; giris.x = 0; giris.y = 0; cb.classList.remove('tut'); top.style.transform = ''; cb.style.left = '7.4em'; cb.style.top = 'calc(100% - 7.4em)'; };
    w.addEventListener('pointerdown', e => { if (e.target.closest('button') || e.target.closest('.rend') || giris.cubuk) return; const r = w.getBoundingClientRect(); giris.cubuk = { id: e.pointerId, x: e.clientX, y: e.clientY }; cb.style.left = (e.clientX - r.left) + 'px'; cb.style.top = (e.clientY - r.top) + 'px'; cb.classList.add('tut'); try { w.setPointerCapture(e.pointerId); } catch (_) { } });
    w.addEventListener('pointermove', e => { const c = giris.cubuk; if (!c || e.pointerId !== c.id) return; const R0 = yari(); let dx = (e.clientX - c.x) / R0, dy = (e.clientY - c.y) / R0; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      /* küçük ölü bölge, sonra eğri: ince ayar kolay, tam itiş hızlı */ const g = v => Math.abs(v) < 0.08 ? 0 : Math.sign(v) * Math.pow((Math.abs(v) - 0.08) / 0.92, 0.8); giris.x = g(dx); giris.y = -g(dy); top.style.transform = 'translate(' + (dx * R0 * 0.62).toFixed(1) + 'px,' + (dy * R0 * 0.62).toFixed(1) + 'px)'; });
    w.addEventListener('pointerup', birak2); w.addEventListener('pointercancel', birak2); w.addEventListener('contextmenu', e => e.preventDefault());
    w.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && typeof RACE_ACT !== 'undefined' && RACE_ACT[el.dataset.a]) { if (EO2.audio) EO2.audio.ui(); RACE_ACT[el.dataset.a](el); } });
    const c = Q('y3cik'); if (c) c.addEventListener('click', cik); }
  function domKur() { let w = Q('racem'); if (w) w.remove(); Y = RC; w = document.createElement('div'); w.id = 'racem'; w.className = 'yr25 y3'; w.innerHTML = govde(); app.appendChild(w); bagla(w); sonHud = ''; }

  /* deneme uçuşunun sonucu: sıralama gösterilir, hiçbir şey kaydedilmez (race.js'in ödül veren raceResults'ı çağrılmaz) */
  function denemeSonuc(order, rank) { const w = Q('racem'), y = Y; if (!w || !y) return; const fmt = v => v.toFixed(2).replace('.', ','), t0 = order[0].fin, k = document.createElement('div'); k.className = 'rend' + (rank === 1 ? ' win' : '');
    k.innerHTML = '<h3>' + (order.length > 1 ? (rank === 1 ? 'Birinci!' : rank + '. sıra') : 'Güzel uçuş') + '</h3>' + (order.length > 1 ? '<ol class="rres">' + order.map((o, i) => '<li class="' + (o.me ? 'me' : '') + '"><b>' + (i + 1) + '.</b><span>' + esc2(o.name) + '</span><i>' + (i ? '+' + fmt(o.fin - t0) : fmt(o.fin) + ' sn') + '</i></li>').join('') + '</ol>' : '') +
      '<ul><li>' + y.got + ' / ' + y.rings.length + ' halka' + (y.hits ? ', ' + y.hits + ' çarpma' : ', hiç çarpmadan') + (y.dashes ? ', ' + y.dashes + ' atılım' : '') + (y.slipSurges ? ', ' + y.slipSurges + ' koridor ivmesi' : '') + '.</li><li>Deneme uçuşu: altın, ün ve istatistik verilmez.</li></ul>' +
      '<div style="display:flex;gap:.8em;flex-wrap:wrap;justify-content:center"><button type="button" class="btn" id="y3yine">Yeniden uç</button><button type="button" class="btn" id="y3bitir">Çık</button></div>';
    w.appendChild(k); Q('y3yine').addEventListener('click', () => { birakYaris(); kos(); }); Q('y3bitir').addEventListener('click', cik); }
  const secimBitti = () => !Y || (Y.done && U && U.son > Y.sp * 2.5);
  function birakYaris() { if (typeof RC !== 'undefined' && RC && RC === Y) { RC.done = true; if (typeof raceUnbind === 'function') raceUnbind(); RC = null; } }
  function cik() { birakYaris(); kapat(); }

  /* yarışı race.js başlatır; pist ve rakipler arkadan uçuşa uyarlanır */
  function kos() { const s = secim; giris.x = giris.y = 0; giris.tus.clear(); giris.cubuk = null; U = yeni(); raceStart(s.d, s.race, s.practice); Y = RC; if (!Y) return kapat(); pistKur(); hud(); }
  const denemeYarisi = (d, r) => { if (r && r.rivals && r.rivals.length) return Object.assign({}, r, { id: 'deneme' });
    const lv = Math.round(((d.st.ce || 50) + (d.st.da || 50)) / 2), adlar = RACE_NAMES.slice().sort(() => Math.random() - 0.5), huy = Object.keys(RACE_STYLE);
    return { id: 'deneme', venue: Object.keys(RACE_VENUES)[0], ad: 'Deneme pisti', fee: 0, odul: [0, 0, 0], un: 0, len: 34, rivals: [0, 1, 2].map(i => ({ name: adlar[i], trainer: TRAINERS[i % TRAINERS.length], el: rEl(), style: huy[i % huy.length], gx: randLook(), hue: 0, ce: Math.round(lv * (0.9 + Math.random() * 0.2)), da: Math.round(lv * (0.85 + Math.random() * 0.2)) })) }; };
  let aciliyor = false;
  async function basla(d, race, practice, o) { if (U || T || aciliyor) return; const A = EO2.api; if (!d && typeof S !== 'undefined' && S.dragons) d = S.dragons.find(x => typeof canRace === 'function' ? canRace(x) : x.stage === 'yetiskin') || null; if (!d) return;
    const deneme = !!(o && o.deneme); if (deneme) { race = denemeYarisi(d, race); practice = false; } aciliyor = true; try { await Promise.all([d].concat(race && race.rivals || []).map(x => resimYukle(x.el))); } catch (_) { } aciliyor = false; secim = { d, race: race || null, practice: !!practice, deneme };
    onceki = A.scene() === 'gok3' ? 'meydan' : A.scene(); kam = A.S.camMode; if (G.close) G.close(); G.mesgul = true; EO2.gizli = true; app.classList.add('yarista');
    T = kur(A.R, d, race ? race.rivals : []); U = yeni(); Y = null;
    A.go('gok3'); await new Promise(r => setTimeout(r, 620));
    eski = { sfx: typeof EO2_BUS !== 'undefined' ? EO2_BUS.sfx : null, draw: window.raceDraw, cut: window.raceCut, step: window.raceStep, hits: window.raceHits, res: window.raceResults, noCuts: window.__noCuts };
    window.raceDraw = hud; window.raceCut = (t, a, b, r, then) => { if (typeof then === 'function') then(); }; window.__noCuts = 1; window.raceStep = adimSar; window.raceHits = carpSar; if (deneme) window.raceResults = denemeSonuc;
    window.EO2_MODAL = () => domKur(); window.EO2_MODAL_KAPAT = kapat;
    /* yarış sesleri: race.js'in ses anahtarları uçuş boyunca sentez seslerine bağlanır */
    if (typeof EO2_BUS !== 'undefined') { const onceki2 = eski.sfx; EO2_BUS.sfx = k => { const a = EO2.audio; if (a && a.ucus && a.ucus(k)) return; if (onceki2) onceki2(k); }; }
    window.addEventListener('keydown', tus, true); window.addEventListener('keyup', tus, true); kos(); }
  function kapat() { if (!eski) return; const A = EO2.api, w = Q('racem'); if (w) w.remove(); window.removeEventListener('keydown', tus, true); window.removeEventListener('keyup', tus, true);
    if (typeof EO2_BUS !== 'undefined') EO2_BUS.sfx = eski.sfx; if (EO2.audio && EO2.audio.ruzgar) EO2.audio.ruzgar(0); window.raceDraw = eski.draw; window.raceCut = eski.cut; window.raceStep = eski.step; window.raceHits = eski.hits; window.raceResults = eski.res; window.__noCuts = eski.noCuts || 0; eski = null; window.EO2_MODAL = null; window.EO2_MODAL_KAPAT = null;
    Y = null; U = null; secim = null; app.classList.remove('yarista'); EO2.gizli = false; G.mesgul = false; A.S.camMode = kam; A.go(onceki);
    setTimeout(() => { birak(A.R); if (G.redraw) G.redraw(); if (G.open) G.open('yaris'); }, 950); }

  /* kamera tercihi: ilan ekranındaki düğme değiştirir (yalnız bayrak açıkken görünür) */
  const kamera = v => { try { if (v) localStorage.setItem('eo2.yarisKam', v); return localStorage.getItem('eo2.yarisKam') === 'yan' ? 'yan' : 'arka'; } catch (_) { return 'arka'; } };
  /* ileri: denetim betikleri için hızlı sarma (race.js'in kendi adımlarıyla); oto: halkaları izleyen deneme pilotu */
  EO2.yaris3 = { acik, basla, kamera, cik, durum: () => ({ U, Y }), oto(v) { if (U) U.oto = !!v; },
    ileri(sn) { for (let t = 0; U && Y && RC === Y && !Y.done && t < sn; t += 1 / 60) { if (Y.t < 0) { Y.t = Math.min(0, Y.t + 1 / 60); continue; } Y.t += 1 / 60; raceStep(1 / 60, false); raceHits(true); if (Y.pos >= Y.L) { Y.myT = Y.t - (Y.pos - Y.L) / Y.v; raceFinish(Y.myT); } } } };
})();
