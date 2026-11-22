/* Ejder Ocağı 2.0 · Gök Yarışı: sırtından uçuş (deneme kipi, A aşaması)
   Ejderha ve binici arkadan görünür; kamera onları izler. Gerçek 3B yoktur: her şey 2D dörtgendir, derinliğe göre
   küçülür. İzdüşümü (ve ufkun yatışını) bu dosya kendisi hesaplar, çizimi oyunun çizicisine ekran koordinatında verir;
   gl.js ve zemin çizimi değişmez (sahnenin tek çizim kalemi 1000'in üstünde anahtarla durur, zemin hiç çizilmez).
   Bütün görseller kodla boyanır (tuval): gökyüzü, bulutlar, yüzen adalar, halkalar, ejderha, binici. Görsel dosyası yoktur.
   Bu aşama ödülsüzdür: js/race.js'e, keseye, üne, istatistiklere ve sunucuya dokunmaz. Hız ve halka formülleri
   race.js'tekilerle aynıdır (raceSpeed, halka hızı zekâdan, hırs 50'de atılım) ki his oradaki yarışla tutarlı olsun.
   Açmak için: localStorage eo2.yarisArka = 1 (ya da adreste ?yarisArka). Kapalıyken oyunda hiçbir şey değişmez. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, D = EO2.sceneDefs = EO2.sceneDefs || {}, app = document.getElementById('app');
  const acik = () => { try { return localStorage.getItem('eo2.yarisArka') === '1' || /[?&]yarisArka\b/.test(location.search); } catch (_) { return false; } };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, yak = (dt, hiz) => 1 - Math.exp(-hiz * dt);
  const hs = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- ölçüler (metre, saniye) ---------- */
  const HIZ = 27, SURE = 34, HALKA_R = 3.3, XM = 17, ZM = 10.5, VX = 15, VZ = 11, DENIZ = -58;
  const HIRS_ATIL = 50, ATIL_T = 1.1, ATIL_V = 0.5, IVME = 4.6, FREN = 2.7;       // race.js: DASH_COST, DASH_T, DASH_V, RACE_ACCEL, RACE_DRAG
  const yol = (y, F) => [9 * Math.sin(y * 0.011 + F[0]) + 4 * Math.sin(y * 0.023 + F[1]), 5.2 * Math.sin(y * 0.009 + F[2]) + 2.4 * Math.sin(y * 0.019 + F[3])];

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
  function palet(ton, doy) { const d = clamp(doy, 18, 92); return { ton, acik: hsl(ton, d * 0.75, 91), govde: hsl(ton, d * 0.8, 78), orta: hsl(ton, d, 64), koyu: hsl(ton + 8, d * 0.9, 46), cizgi: hsl(ton + 14, d * 0.7, 24), zar1: hsl(ton - 6, d, 84, 0.96), zar2: hsl(ton + 4, d, 68, 0.96), zar3: hsl(ton + 22, d * 0.9, 58, 0.96), sus: hsl(ton - 14, d * 0.6, 96), iz: [0.5 + 0.5 * Math.cos(ton * Math.PI / 180), 0.5 + 0.5 * Math.cos((ton - 120) * Math.PI / 180), 0.5 + 0.5 * Math.cos((ton - 240) * Math.PI / 180)] }; }

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
    for (const k of [-1, 1]) dol(() => { x.beginPath(); x.moveTo(c + k * 22, 66); x.quadraticCurveTo(c + k * 44, 30, c + k * 84, 4); x.quadraticCurveTo(c + k * 68, 50, c + k * 50, 82); x.closePath(); }, '#fff4d8', 4);
    /* yan yelpazeler (kulak) */
    for (const k of [-1, 1]) dol(() => { x.beginPath(); x.moveTo(c + k * 44, 84); x.lineTo(c + k * 112, 62); x.lineTo(c + k * 92, 92); x.lineTo(c + k * 118, 108); x.lineTo(c + k * 84, 116); x.lineTo(c + k * 96, 140); x.lineTo(c + k * 44, 122); x.closePath(); }, P.zar2, 4);
    /* baş */
    dol(() => { x.beginPath(); x.ellipse(c, 92, 56, 50, 0, 0, 7); }, gr(c + 14, 76, 6, c, 92, 60, P.acik, P.govde, P.orta));
    /* sırt yelesi: baştan kuyruğa uzanan tüy tutamları */
    const tutam = (px, py, r, a) => { x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.moveTo(0, -r * 1.25); x.quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.46, r * 0.8); x.quadraticCurveTo(0, r * 0.45, -r * 0.46, r * 0.8); x.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -r * 1.25); x.closePath(); const g = x.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, P.zar1); x.fillStyle = g; x.fill(); x.strokeStyle = P.cizgi; x.lineWidth = 3.5; x.stroke(); x.restore(); };
    for (let i = 14; i >= 0; i--) { const t = i / 14, py = 74 + t * 500, r = 20 + Math.sin(t * Math.PI) * 17; tutam(c + Math.sin(i * 1.7) * 5, py, r, Math.sin(i * 2.3) * 0.16); }
    /* eyer: kahverengi örtü, altın kenar, gök mühür */
    dol(() => { x.beginPath(); x.moveTo(c - 92, 300); x.quadraticCurveTo(c, 268, c + 92, 300); x.quadraticCurveTo(c + 106, 372, c + 82, 428); x.quadraticCurveTo(c, 452, c - 82, 428); x.quadraticCurveTo(c - 106, 372, c - 92, 300); x.closePath(); }, gr(c + 20, 330, 10, c, 360, 120, '#b0704a', '#8a4f33', '#5e3324'));
    x.strokeStyle = '#ffd35a'; x.lineWidth = 5; x.beginPath(); x.moveTo(c - 80, 312); x.quadraticCurveTo(c, 284, c + 80, 312); x.moveTo(c - 72, 420); x.quadraticCurveTo(c, 440, c + 72, 420); x.stroke();
    x.strokeStyle = '#5e3324'; x.lineWidth = 12; x.beginPath(); x.moveTo(c - 96, 340); x.lineTo(c - 134, 392); x.moveTo(c + 96, 340); x.lineTo(c + 134, 392); x.stroke();
    dol(() => { x.beginPath(); x.ellipse(c, 430, 34, 24, 0, 0, 7); }, '#ffd35a', 4); x.fillStyle = '#eaf7ff'; x.beginPath(); x.ellipse(c, 430, 24, 16, 0, 0, 7); x.fill(); x.strokeStyle = '#59a8e6'; x.lineWidth = 3.5; x.beginPath(); x.arc(c - 6, 432, 7, Math.PI, 0.3); x.arc(c + 7, 430, 8, Math.PI * 1.1, 0.4); x.stroke();
  }); }

  /* kuyruk: kök üstte (gövdeye bağlanır), uç altta ve kameraya en yakın; üstünde tüy yelesi, ucunda yelpaze */
  const KUYRUK_W = 260, KUYRUK_H = 560;
  function kuyrukTuval(P) { return tuval(KUYRUK_W, KUYRUK_H, (x, w, h) => { const c = w / 2; x.lineJoin = 'round';
    const orta = t => c + Math.sin(t * 2.6) * 26 * t, en = t => 58 * Math.pow(1 - t, 0.85) + 7;
    x.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; x.lineTo(orta(t) - en(t), 16 + t * 470); } for (let i = 24; i >= 0; i--) { const t = i / 24; x.lineTo(orta(t) + en(t), 16 + t * 470); } x.closePath();
    const g = x.createLinearGradient(c - 60, 0, c + 60, 0); g.addColorStop(0, P.orta); g.addColorStop(0.5, P.acik); g.addColorStop(1, P.orta); x.fillStyle = g; x.fill(); x.strokeStyle = P.cizgi; x.lineWidth = 5; x.stroke();
    /* uç yelpazesi */
    const ux = orta(1), uy = 486; x.beginPath(); x.moveTo(ux, uy - 16); x.quadraticCurveTo(ux - 70, uy + 6, ux - 44, uy + 62); x.lineTo(ux - 16, uy + 38); x.lineTo(ux, uy + 70); x.lineTo(ux + 16, uy + 38); x.lineTo(ux + 44, uy + 62); x.quadraticCurveTo(ux + 70, uy + 6, ux, uy - 16); x.closePath(); x.fillStyle = P.zar2; x.fill(); x.stroke();
    for (let i = 11; i >= 0; i--) { const t = i / 12, r = 9 + (1 - t) * 20, px = orta(t), py = 22 + t * 440; x.beginPath(); x.moveTo(px, py - r * 1.2); x.quadraticCurveTo(px + r, py - r * 0.1, px + r * 0.45, py + r * 0.8); x.quadraticCurveTo(px, py + r * 0.4, px - r * 0.45, py + r * 0.8); x.quadraticCurveTo(px - r, py - r * 0.1, px, py - r * 1.2); x.closePath(); const tg = x.createLinearGradient(0, py - r, 0, py + r); tg.addColorStop(0, '#fff'); tg.addColorStop(1, P.zar1); x.fillStyle = tg; x.fill(); x.lineWidth = 3.2; x.stroke(); }
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

  /* ---------- dokular: uçuşa girerken kurulur, çıkarken bırakılır ----------
     Dünya nesneleri tek atlasta durur: uzaktan yakına sıralı çizimde doku değişmez, çizim çağrısı sayısı düşük kalır. */
  let T = null;
  function atlas(liste) { const W = 2048, bos = 8, yer = {}; liste.sort((a, b) => b.h - a.h); let x = bos, y = bos, satir = 0;
    for (const q of liste) { if (x + q.w + bos > W) { x = bos; y += satir + bos; satir = 0; } q.x = x; q.y = y; x += q.w + bos; satir = Math.max(satir, q.h); }
    const H = y + satir + bos, c = tuval(W, H, k => { for (const q of liste) k.drawImage(q.c, q.x, q.y, q.w, q.h); });
    for (const q of liste) yer[q.ad] = [(q.x + 0.5) / W, (q.y + 0.5) / H, (q.x + q.w - 0.5) / W, (q.y + q.h - 0.5) / H]; return { c, yer }; }
  function kur(R, d) { const t = {}, L0 = [], koy = (ad, c, w, h, golge) => { L0.push({ ad, c, w, h }); if (golge) L0.push({ ad: ad + 'G', c: golgeKop(c), w: w >> 1, h: h >> 1 }); };
    koy('isik', isikTuval(), 128, 128); koy('cizgi', cizgiTuval(), 256, 16); koy('halka', halkaTuval(), 256, 256);
    [[11, 0], [29, 0], [53, 1], [71, 1]].forEach((q, i) => koy('bulut' + i, bulutTuval(q[0] * 977, q[1]), 496, 248, true));
    [[5, 0], [17, 1], [23, 2], [41, 1], [59, 0]].forEach((q, i) => koy('ada' + i, adaTuval(q[0] * 1301, q[1]), 496, 496, true));
    koy('kapi', kapiTuval(), 600, 400, true);
    const A = atlas(L0); t.at = R.texture(A.c); t.uv = A.yer; A.c.width = A.c.height = 0;
    t.gok = R.texture(gokTuval(), { mips: false }); t.ufuk = R.texture(ufukTuval(), { mips: false });
    let ton = 205, doy = 78; try { if (d && typeof pulOf === 'function') { const p = pulOf(d); ton = p.h; doy = p.s * 100; } } catch (_) { }
    const P = palet(ton, doy), P2 = palet(ton + 150, 62);
    t.kanat = R.texture(kanatTuval(P)); t.govde = R.texture(govdeTuval(P)); t.kuyruk = R.texture(kuyrukTuval(P)); t.binici = R.texture(biniciTuval()); t.atki = R.texture(atkiTuval());
    t.kanat2 = R.texture(kanatTuval(P2)); t.govde2 = R.texture(govdeTuval(P2)); t.kuyruk2 = R.texture(kuyrukTuval(P2));
    t.renk = [P, P2]; return t; }
  function birak(R) { if (!T) return; for (const k of Object.keys(T)) { const o = T[k]; if (o && o.t !== undefined && R.sil) R.sil(o); } T = null; }

  /* ---------- durum ---------- */
  let U = null, onceki = 'meydan', kam = 'yakin';
  const giris = { x: 0, y: 0, tus: new Set(), cubuk: null };
  function yeni(d) { const st = (d && d.st) || { ce: 60, da: 60, ze: 60 }, sp = typeof raceSpeed === 'function' ? raceSpeed(st.ce, st.da) : 1.4, taban = HIZ * Math.sqrt(sp / 1.4), L = taban * SURE;
    const F = [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6], halkalar = [];
    for (let y = 70; y < L - 40; y += 46 + hs(y) * 10) { const p = yol(y, F); halkalar.push({ y, x: p[0], z: p[1], durum: 0, t: 0 }); }
    return { d, st, taban, L, F, halkalar, evre: 'say', say: 3.2, t: 0, pos: -taban * 0.55 * 3.2, x: 0, z: 0, vx: 0, vz: 0, v: taban * 0.55, hizli: 0, hizliT: 0, hirs: 15, atilT: 0, atilim: 0, alinan: 0,
      yatis: 0, yunus: 0, kanat: 0, sars: 0, kx: 0, kz: 2.35, kd: 6.6, kf: 1.5, bitT: 0, sure: 0, hayalet: 34, hayaletBitis: null, parca: [], yazi: [] }; }

  function adim(dt) { const u = U; u.t += dt;
    /* kumanda: klavye ve dokunmatik çubuk toplanır */
    const T2 = giris.tus; let ix = giris.x + (T2.has('sag') ? 1 : 0) - (T2.has('sol') ? 1 : 0), iy = giris.y + (T2.has('yukari') ? 1 : 0) - (T2.has('asagi') ? 1 : 0); ix = clamp(ix, -1, 1); iy = clamp(iy, -1, 1);
    if (u.evre === 'say') { u.say -= dt; if (u.say <= 0) { u.evre = 'uc'; u.t = 0; ses('roar'); yaz('UÇ!', 'good'); } }
    if (u.evre === 'bitti') { ix = 0; iy = 0; u.bitT += dt; }
    /* yanal ve dikey hız: girdiye hızla yaklaşır (ilk tepki bir kare içinde), kenarda yumuşak yastık */
    u.vx += (ix * VX - u.vx) * yak(dt, 7.5); u.vz += (iy * VZ - u.vz) * yak(dt, 7.5);
    u.x += u.vx * dt; u.z += u.vz * dt;
    if (Math.abs(u.x) > XM) { u.x = clamp(u.x, -XM, XM); u.vx *= 0.3; } if (Math.abs(u.z) > ZM) { u.z = clamp(u.z, -ZM, ZM); u.vz *= 0.3; }
    /* ileri hız: race.js ile aynı çarpan mantığı (halka hızı + atılım), aynı ivme ve fren eğrisi */
    u.hizliT = Math.max(0, u.hizliT - dt); if (!u.hizliT) u.hizli = 0; u.atilT = Math.max(0, u.atilT - dt);
    const carp = u.evre === 'say' ? 0.55 : u.evre === 'bitti' ? 0.7 : 1 + u.hizli + (u.atilT > 0 ? ATIL_V : 0), hedef = u.taban * carp;
    u.v += (hedef - u.v) * yak(dt, hedef > u.v ? (u.atilT > 0 ? IVME * 1.65 : IVME) : FREN);
    const once = u.pos; u.pos += u.v * dt; if (u.evre === 'uc') u.sure += dt;
    /* halkalar: düzlemi geçildiği anda bakılır; pay cömert (yarıçapın tamamı) */
    for (const h of u.halkalar) { if (h.durum) { h.t += dt; continue; } if (once < h.y && u.pos >= h.y) { const uzak = Math.hypot(u.x - h.x, u.z - h.z);
        if (uzak < HALKA_R * 1.02) { h.durum = 1; u.alinan++; u.hizli = 0.33 + (u.st.ze || 60) / 580; u.hizliT = 1.15; u.hirs = Math.min(100, u.hirs + 20); u.sars = Math.max(u.sars, 0.25); ses('ring'); yaz(uzak < HALKA_R * 0.4 ? 'TAM ORTASI!' : '+HIZ', 'good'); kivilcim(h, 14); }
        else { h.durum = 2; if (uzak < HALKA_R * 1.9) yaz('KIL PAYI', 'bad'); } } }
    /* hayalet rakip: çizgiyi kusursuz izler, sabit tempoda uçar */
    if (u.evre !== 'say') u.hayalet += u.taban * 1.12 * dt; else u.hayalet += u.taban * 0.55 * dt; if (u.hayaletBitis === null && u.hayalet >= u.L) u.hayaletBitis = u.sure;
    if (u.evre === 'uc' && u.pos >= u.L) { u.evre = 'bitti'; u.sure -= (u.pos - u.L) / u.v; ses('cheer'); yaz('BİTİŞ!', 'good'); setTimeout(sonuc, 1500); }
    /* görsel durum: yatış, yunuslama, kanat temposu, kamera */
    u.yatis += (-u.vx / VX * 0.44 - u.yatis) * yak(dt, 9); u.yunus += (u.vz / VZ - u.yunus) * yak(dt, 6);
    const oran = u.v / u.taban; u.kanat += dt * (2.4 + Math.max(0, u.vz / VZ) * 6 + (u.atilT > 0 ? 7 : 0) + (u.evre === 'say' ? 2 : 0));
    u.kx += (u.x * 0.88 - u.kx) * yak(dt, 6); u.kz += (u.z * 0.86 + 2.35 - u.kz) * yak(dt, 6);
    u.kd += (6.6 + clamp(oran - 1, -0.12, 1) * 3.2 - u.kd) * yak(dt, 3); u.kf += (1.5 - clamp(oran - 1, 0, 1) * 0.42 - u.kf) * yak(dt, 4); u.sars = Math.max(0, u.sars - dt * 1.6);
    for (const p of u.parca) { p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt; } u.parca = u.parca.filter(p => p.t < p.om);
  }
  function atil() { const u = U; if (!u || u.evre !== 'uc' || u.atilT > 0) return; if (u.hirs < HIRS_ATIL) { const e = document.getElementById('y3hirs'); if (e) { e.classList.add('no'); setTimeout(() => e.classList.remove('no'), 300); } return; }
    u.hirs -= HIRS_ATIL; u.atilT = ATIL_T; u.atilim++; u.sars = 0.6; ses('wing'); ses('roar'); yaz('ATILIM!', 'good'); }
  function kivilcim(h, n) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; U.parca.push({ x: h.x + Math.cos(a) * HALKA_R, z: h.z + Math.sin(a) * HALKA_R, y: h.y, vx: Math.cos(a) * (3 + hs(i) * 5), vz: Math.sin(a) * (3 + hs(i + 9) * 5), t: 0, om: 0.5 + hs(i * 3) * 0.4 }); } }
  const ses = k => { try { if (typeof SFX !== 'undefined' && SFX.play) SFX.play(k); } catch (_) { } };

  /* ---------- çizim: kendi izdüşümü, oyunun çizicisi (ekran koordinatı) ---------- */
  const liste = [];
  function ciz(R, F) { if (!U || !T) return; const u = U, dt = Math.min(0.05, F.dt || 0.016); adim(dt);
    const en = R.w / R.h, sal = u.sars * 0.012, kx = u.kx + Math.sin(u.t * 71) * sal * 6, kz = u.kz + Math.cos(u.t * 83) * sal * 6, ky = u.pos - u.kd, f = u.kf * clamp(en / 1.45, 0.32, 1);
    const dn = u.yatis * 0.3, cs = Math.cos(dn), sn = Math.sin(dn), ufuk = 0.12 - u.yunus * 0.05;
    const P4 = (px, py) => [(px * cs - py * sn) / en, px * sn + py * cs, 0];
    /* dörtgen: merkez (ekran birimi, yatıştan önce), yarı en ve boy, kendi dönüşü */
    const TAM = [0, 0, 1, 1], UV = T.uv, AT = T.at;
    const kare = (tex, uv, px, py, hw, hh, don, renk, ekle, ayna) => { const c = Math.cos(don || 0), s = Math.sin(don || 0), k = (dx, dy) => P4(px + dx * c - dy * s, py + dx * s + dy * c);
      R.quad(tex, k(-hw, -hh), k(hw, -hh), k(hw, hh), k(-hw, hh), ayna ? uv[2] : uv[0], uv[1], ayna ? uv[0] : uv[2], uv[3], renk, !!ekle, 0, true); };
    const isik = (px, py, r, renk) => kare(AT, UV.isik, px, py, r, r, 0, renk, true);
    const iz = (X, Z, Y) => { const d = Y - ky; if (d < 0.6) return null; const s = f / d; return [(X - kx) * s, (Z - kz) * s + ufuk, s, d]; };
    const pus = [0.8, 0.87, 0.98], pusK = d => clamp((d - 140) / 620, 0, 0.86);

    /* 1) gök: yatışla döner, yunuslamayla kayar */
    kare(T.gok, TAM, 0, ufuk, 4.2, 3.4, 0, [1, 1, 1, 1]);
    /* güneş */
    const gx = 1.02 - u.kx * 0.004, gy = ufuk + 0.56; isik(gx, gy, 1.2, [0.36, 0.3, 0.18, 1]); isik(gx, gy, 0.27, [0.6, 0.54, 0.4, 1]); isik(gx, gy, 0.1, [1, 0.98, 0.9, 1]);
    /* uzak ufuk şeridi: iki kat, yana kayarak (ıraklık açısı) */
    for (let k = 0; k < 2; k++) { const gen = k ? 5.2 : 3.6, kay = ((u.kx * (k ? 0.006 : 0.003) + k * 0.37) % 1 + 1) % 1, yy = ufuk + (k ? -0.07 : 0.02), hh = gen / 8 * 0.5;
      for (let i = -1; i <= 1; i++) kare(T.ufuk, TAM, (i - kay + 0.5) * gen, yy, gen / 2, hh, 0, k ? [1, 1, 1, 0.96] : [0.94, 0.96, 1, 0.7]); }

    /* 2) dünya nesneleri: uzaktan yakına */
    liste.length = 0; const koy = (d, fn) => liste.push({ d, fn });
    const nesne = (tex, texG, X, Z, Y, w, h, o) => { const p = iz(X, Z, Y); if (!p) return; const hw = w * p[2] / 2, hh = h * p[2] / 2; if (Math.abs(p[0]) - hw > en * 1.25 || Math.abs(p[1]) - hh > 1.6) return;
      const a = (o && o.a !== undefined ? o.a : 1) * clamp((o && o.uzak ? o.uzak : 900) - p[3], 0, 120) / 120 * clamp((p[3] - 1.5) / (o && o.yakin || 6), 0, 1); if (a < 0.01) return;
      koy(p[3], () => { kare(AT, UV[tex], p[0], p[1], hw, hh, 0, [1, 1, 1, a], false, o && o.ayna); const k = pusK(p[3]) * (o && o.pus !== undefined ? o.pus : 1); if (texG && k > 0.02) kare(AT, UV[tex + 'G'], p[0], p[1], hw, hh, 0, [pus[0], pus[1], pus[2], a * k], false, o && o.ayna); }); };
    /* bulut denizi: altta, ızgara gözlerinde; her gözün yeri tohumdan gelir (akarken titremez) */
    const G1 = 92, j0 = Math.floor((ky + 10) / G1), i0 = Math.round(kx / G1);
    for (let j = j0; j < j0 + 11; j++) { const yay = 3 + Math.floor((j - j0) * 0.7); for (let i = i0 - yay; i <= i0 + yay; i++) { const k = i * 131 + j * 71, tur = Math.floor(hs(k) * 4), w = 120 + hs(k + 1) * 90;
        nesne('bulut' + tur, true, i * G1 + (hs(k + 2) - 0.5) * G1 * 0.8, DENIZ + hs(k + 3) * 14, j * G1 + hs(k + 4) * G1, w, w * 0.5, { ayna: hs(k + 5) > 0.5, uzak: 1000, yakin: 30, pus: 0.75 }); } }
    /* adalar: pistin iki yanında, değişen irtifada */
    const G2 = 118, a0 = Math.floor((ky - 40) / G2);
    for (let j = a0; j < a0 + 9; j++) for (let yan = -1; yan <= 1; yan += 2) { const k = j * 37 + yan * 11, tur = Math.floor(hs(k) * 5), w = 46 + hs(k + 1) * 44; if (hs(k + 6) < 0.18) continue;
      nesne('ada' + tur, true, yan * (30 + hs(k + 2) * 62), -20 + hs(k + 3) * 22 + Math.sin(u.t * 0.5 + k) * 0.5, j * G2 + hs(k + 4) * 70, w, w, { ayna: hs(k + 5) > 0.5, uzak: 980, yakin: 14 }); }
    /* çok uzakta, yüksekte iki büyük ada (yön duygusu) */
    for (let j = 0; j < 3; j++) { const k = 900 + j * 13, Y = ky + 620 + j * 130; nesne('ada' + (j % 5), true, (hs(k) - 0.5) * 520, 40 + hs(k + 1) * 90, Y, 150, 150, { uzak: 2000, pus: 1.05 }); }
    /* yakın bulut tutamları: hız duygusu */
    const G3 = 34, b0 = Math.floor(ky / G3);
    for (let j = b0; j < b0 + 9; j++) { const k = j * 53, yan = hs(k) > 0.5 ? 1 : -1, tur = 2 + Math.floor(hs(k + 1) * 2), w = 20 + hs(k + 2) * 18;
      nesne('bulut' + tur, false, yan * (15 + hs(k + 3) * 34), -14 + hs(k + 4) * 30, j * G3 + hs(k + 5) * G3, w, w * 0.5, { a: 0.5, uzak: 320, yakin: 16, ayna: hs(k + 6) > 0.5 }); }
    /* halkalar, yol ışıkları, bitiş kapısı */
    const siradaki = u.halkalar.find(h => !h.durum);
    for (const h of u.halkalar) { const p = iz(h.x, h.z, h.y); if (!p || p[3] > 760) continue; const r = HALKA_R * 1.2 * p[2], bu = h === siradaki, nb = bu ? 1 + Math.sin(u.t * 6) * 0.06 : 1, a = clamp((760 - p[3]) / 140, 0, 1);
      koy(p[3], () => { if (h.durum === 1) { const k = clamp(1 - h.t * 3, 0, 1); if (k > 0) isik(p[0], p[1], r * (2 + h.t * 6), [1 * k, 0.86 * k, 0.4 * k, 1]); return; }
        const s = h.durum === 2 ? 0.45 : 1; isik(p[0], p[1], r * 1.9, [0.5 * a * s, 0.36 * a * s, 0.12 * a * s, 1]); if (bu) isik(p[0], p[1], r * 2.7 * nb, [0.42, 0.34, 0.16, 1]);
        kare(AT, UV.halka, p[0], p[1], r * nb, r * nb, u.t * 0.25 + h.y, [s, s, s, a * (h.durum === 2 ? 0.5 : 1)]); }); }
    if (siradaki) for (let i = 1; i <= 6; i++) { const Y = lerp(u.pos + 5, siradaki.y, i / 7), q = yol(Y, u.F), p = iz(lerp(u.x, q[0], Math.min(1, i / 4)), lerp(u.z, q[1], Math.min(1, i / 4)), Y); if (!p) continue; const r = 0.5 * p[2], k = 0.55 + 0.45 * Math.sin(u.t * 7 - i * 0.9); koy(p[3], () => isik(p[0], p[1], r, [1 * k, 0.9 * k, 0.55 * k, 1])); }
    nesne('kapi', true, 0, 4, u.L, 62, 41, { uzak: 900, yakin: 2, pus: 0.8 });
    for (const q of u.parca) { const p = iz(q.x, q.z, q.y); if (!p) continue; const k = 1 - q.t / q.om, r = 0.34 * p[2]; koy(p[3], () => isik(p[0], p[1], r, [1 * k, 0.85 * k, 0.4 * k, 1])); }
    /* hayalet rakip ve oyuncu */
    const hp = yol(u.hayalet, u.F), hz = iz(hp[0], hp[1], u.hayalet), hq = yol(u.hayalet + 6, u.F);
    if (hz && hz[3] < 500) koy(hz[3], () => ejder(hz, 1, clamp((hp[0] - hq[0]) * 0.12, -0.5, 0.5), u.t * 3.1 + 2, 0.3, clamp((500 - hz[3]) / 120, 0, 1) * 0.9, false));
    const bz = iz(u.x, u.z, u.pos); koy(bz[3], () => ejder(bz, 0, u.yatis, u.kanat, u.yunus, 1, true));
    liste.sort((a, b) => b.d - a.d); for (const it of liste) it.fn();

    /* 3) ekran üstü: hız çizgileri */
    const hizK = clamp((u.v / u.taban - 1.05) / 0.5, 0, 1); if (hizK > 0.02) for (let i = 0; i < 22; i++) { const a = hs(i * 5.3) * Math.PI * 2, t = (u.t * (1.6 + hs(i) * 1.4) + hs(i * 9)) % 1, r = 0.75 + t * 1.4, px = Math.cos(a) * r * en * 0.8, py = Math.sin(a) * r * 0.8 + ufuk * 0.3, boy = 0.1 + t * 0.3; kare(AT, UV.cizgi, px, py, boy, 0.004 + t * 0.007, Math.atan2(Math.sin(a) * 0.8, Math.cos(a) * en * 0.8), [hizK * t * 0.55, hizK * t * 0.55, hizK * t * 0.55, 1], true); }

    /* ejderha: kanatlar omuzdan döner (tek resim, ayna), kuyruk salınır, binici ve atkı üstte */
    function ejder(p, tur, yatis, faz, yunus, a, binicili) { const s = p[2], ox = p[0], oy = p[1], c = Math.cos(yatis), sn2 = Math.sin(yatis), renk = [1, 1, 1, a];
      const E = (dx, dy) => P4(ox + (dx * c - dy * sn2) * s, oy + (dx * sn2 + dy * c) * s);
      /* parça: mafsal (ejderha uzayı, m), mafsalın dokudaki yeri (0–1, soldan ve üstten), en ve boy (m), dönüş, ayna */
      const parca = (tex, mx, my, ax, ay, w, h, don, ayna) => { const cc = Math.cos(don), ss = Math.sin(don), k = (qx, qy) => { const lx = (qx - ax) * w * (ayna ? -1 : 1), ly = (ay - qy) * h; return E(mx + lx * cc - ly * ss, my + lx * ss + ly * cc); };
        R.quad(tex, k(0, 1), k(1, 1), k(1, 0), k(0, 0), 0, 0, 1, 1, renk, false, 0, true); };
      if (binicili && (u.atilT > 0 || u.hizli > 0.15)) { const k = u.atilT > 0 ? 1 : 0.5, cc = T.renk[0].iz; for (const yan of [-1, 1]) { const q = E(yan * 3.3, 0.5 - Math.abs(yatis)); R.quad(AT, E(yan * 3.3 - 1.6, -2.6), E(yan * 3.3 + 1.6, -2.6), E(yan * 3.3 + 1.1, 1.0), E(yan * 3.3 - 1.1, 1.0), UV.isik[0], UV.isik[1], UV.isik[2], UV.isik[3], [cc[0] * k * 0.6, cc[1] * k * 0.6, cc[2] * k * 0.6, 1], true, 0, true); void q; } isik(ox, oy - 0.9 * s, 2.6 * s, [cc[0] * k * 0.35, cc[1] * k * 0.35, cc[2] * k * 0.35, 1]); }
      const cirp = Math.sin(faz), acik = -0.2 + cirp * 0.3 + yunus * 0.1, kis = 1 - Math.abs(cirp) * 0.07;
      const kw = 6.0 * kis, kh = kw * KANAT_H / KANAT_W, kT = tur ? T.kanat2 : T.kanat;
      parca(kT, -0.42, 0.62, KANAT_M[0] / KANAT_W, KANAT_M[1] / KANAT_H, kw, kh, -acik, false);
      parca(kT, 0.42, 0.62, KANAT_M[0] / KANAT_W, KANAT_M[1] / KANAT_H, kw, kh, acik, true);
      const gh = 4.3, gw = gh * GOVDE_W / GOVDE_H * 1.08; parca(tur ? T.govde2 : T.govde, 0, 0.1, 0.5, 0.5, gw, gh, 0, false);
      const kyh = 2.5, kyw = kyh * KUYRUK_W / KUYRUK_H; parca(tur ? T.kuyruk2 : T.kuyruk, 0, -1.7, 0.5, 0.03, kyw, kyh, Math.sin(faz * 0.5 + 1) * 0.16 - yatis * 0.5, false);
      if (binicili) { const dalga = Math.sin(u.t * 9) * 0.16 + Math.sin(u.t * 14.3) * 0.07; parca(T.atki, -0.1, 0.48, 0.97, 0.5, 1.3 + (u.v / u.taban - 1) * 0.4, 0.5, 0.12 + dalga - yatis * 0.6, false);
        parca(T.binici, 0, -0.14, 0.5, 0.82, 1.42, 1.64, -yatis * 0.25, false); } }
    hud();
  }

  /* ---------- sahne tanımı: zemin çizilmez (tek kalemin anahtarı 1000'in üstünde) ---------- */
  const L = { id: 'gok3', name: 'Gök Yarışı', sub: 'Sırtından uçuş', gx: 40, gy: 60, flyer: false, petals: false, floor: 0, light: { amb: [1, 1, 1], night: 0, fog: 0, clear: [0.39, 0.7, 0.93, 1] },
    bounds: [-2, 2, 10, 10], mapRect: [-8, 0, 16, 20], paved: [], start: { x: 0, y: 10, dir: 'up' }, entry: {}, signs: [], interact: [], lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [], npcs: [], rects: [], circles: [], lights: [], embers: [], shadows: [], mini: { paved: [], blocks: [], bg: '#6fb4ee' } };
  D.gok3 = { L, build(h) { h.push({ key: 5000, draw: ciz }); return {}; } };

  /* ---------- göstergeler ve kumanda ---------- */
  const Q = id => document.getElementById(id);
  const bicim = '#app[data-scene="gok3"] .rehber{display:none!important}#y3{cursor:default}#y3 .y3-cubuk{position:absolute;width:8.4em;height:8.4em;margin:-4.2em 0 0 -4.2em;border-radius:50%;background:radial-gradient(circle,rgba(20,26,46,.28),rgba(20,26,46,.5));box-shadow:inset 0 0 0 2px rgba(214,206,184,.75),0 0 0 1.5px rgba(8,10,20,.6);pointer-events:none;opacity:.5;transition:opacity .2s}' +
    '#y3 .y3-cubuk.tut{opacity:1}#y3 .y3-cubuk i{position:absolute;left:50%;top:50%;width:3.6em;height:3.6em;margin:-1.8em 0 0 -1.8em;border-radius:50%;background:radial-gradient(circle at 50% 30%,#f4ecd8,#b9a777);box-shadow:inset 0 0 0 2px #fffaf0,0 0 0 1.5px rgba(8,10,20,.85),0 .25em .6em rgba(4,6,16,.5)}' +
    '#y3 .y-atil{left:auto;right:1.6em;width:7em;height:7em}#y3 .y3-cik{position:absolute;right:1em;top:max(.8em,env(safe-area-inset-top,0px));z-index:3}#y3 .y3-bilgi{display:flex;gap:.6em;align-items:center;margin-right:4.6em}#y3 .y3-bilgi span{padding:.2em 1em;border-radius:1.2em;background:rgba(16,20,34,.82);box-shadow:inset 0 0 0 1px rgba(143,137,123,.6);font-weight:700;white-space:nowrap}#y3 .y3-bilgi b{color:#ffe9a8}' +
    '#y3 .y3-etiket{font:700 .72em var(--f-ui);letter-spacing:.14em;text-transform:uppercase;color:#ffe9a8;opacity:.9}#y3 .y-fx{left:50%;top:34%}#y3 .rmk.hay{box-shadow:0 0 0 2px #ffb070,0 0 0 3.5px rgba(8,10,20,.85)}' +
    '@media (max-aspect-ratio:1/1){#y3 .y-ipucu{top:11.6em}#y3 .y-hirs{bottom:10.4em;width:13em}#y3 .y3-bilgi{margin-right:4.2em}}@media (max-height:560px){#y3 .y-atil{width:5.4em;height:5.4em;right:1em}#y3 .y3-cubuk{font-size:.8em}}';
  function govde() { const u = U, ad = u.d ? esc2(u.d.name) : 'Ejderha', P = T.renk;
    return '<style>' + bicim + '</style><header class="y-ust"><div class="y-ad"><span class="y3-etiket">Deneme · ödülsüz</span><br><b>Sırtından uçuş</b></div>' +
      '<div class="y-pist" id="y3pist"><i class="cizgi"></i><span class="rmk hay" id="y3hay" style="--c:' + P[1].orta + '"></span><span class="rmk me" id="y3ben" style="--c:' + P[0].orta + '"></span><i class="bayrak"></i></div>' +
      '<div class="y3-bilgi"><span>Halka <b id="y3halka">0</b> / ' + u.halkalar.length + '</span><span><b id="y3sure">0,0</b> sn</span></div></header>' +
      '<button type="button" class="gbtn kucuk y3-cik" id="y3cik">Çık</button><div class="y-fx" id="y3fx"></div>' +
      '<div class="y3-cubuk" id="y3cubuk" style="left:7.4em;top:calc(100% - 7.4em)"><i></i></div>' +
      '<div class="y-hirs" id="y3hirs" style="left:50%;transform:translateX(-50%)"><b>Hırs</b><span><i id="y3hirsf"></i><s></s></span></div>' +
      '<button type="button" class="y-atil" id="y3atil"><b>Atıl</b>' + (matchMedia('(pointer: coarse)').matches ? '' : '<small>Boşluk</small>') + '</button>' +
      '<div class="y-say" id="y3say">3</div><p class="y-ipucu" id="y3ipucu">Sürükle ya da ok tuşları: <b>yönlendir</b> · <b>halkaların içinden</b> geç · hırs dolunca <b>atıl</b></p>'; }
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function yaz(t, c) { const el = Q('y3fx'); if (!el) return; const s = document.createElement('span'); s.className = 'rfx ' + c; s.textContent = t; el.appendChild(s); setTimeout(() => s.remove(), 800); }
  let sonHud = '';
  function hud() { const u = U, w = Q('y3'); if (!w) return; const tw = v => (clamp(v, 0, 1) * 100).toFixed(1) + '%';
    const durum = [tw(u.pos / u.L), tw(u.hayalet / u.L), u.alinan, u.sure.toFixed(1), Math.round(u.hirs), u.atilT > 0 ? 1 : 0, Math.ceil(u.say), u.evre].join('|'); if (durum === sonHud) return; sonHud = durum;
    Q('y3ben').style.left = tw(u.pos / u.L); Q('y3hay').style.left = tw(u.hayalet / u.L); Q('y3halka').textContent = u.alinan; Q('y3sure').textContent = u.sure.toFixed(1).replace('.', ',');
    Q('y3hirsf').style.width = u.hirs + '%'; Q('y3hirs').classList.toggle('ready', u.hirs >= HIRS_ATIL); Q('y3atil').classList.toggle('ready', u.hirs >= HIRS_ATIL && u.atilT <= 0 && u.evre === 'uc');
    const s = Q('y3say'); if (s) { if (u.evre === 'say') s.textContent = Math.max(1, Math.ceil(u.say)); else { s.remove(); setTimeout(() => { const i = Q('y3ipucu'); if (i) i.classList.add('fade'); }, 2400); } } }
  function sonuc() { const u = U, w = Q('y3'); if (!u || !w || w.querySelector('.rend')) return; const fmt = v => v.toFixed(2).replace('.', ','), once = u.hayaletBitis === null || u.sure <= u.hayaletBitis, hepsi = u.alinan === u.halkalar.length;
    const k = document.createElement('div'); k.className = 'rend' + (once ? ' win' : '');
    k.innerHTML = '<h3>' + (once ? 'Hayaleti geçtin!' : 'Güzel uçuş') + '</h3><ul><li>Süre: <b>' + fmt(u.sure) + ' sn</b>' + (u.hayaletBitis !== null ? ' · hayalet ' + fmt(u.hayaletBitis) + ' sn' : '') + '</li><li class="' + (hepsi ? 'good' : '') + '">' + u.alinan + ' / ' + u.halkalar.length + ' halka' + (u.atilim ? ' · ' + u.atilim + ' atılım' : '') + '</li><li>Deneme uçuşu: altın, ün ve istatistik verilmez.</li></ul>' +
      '<div style="display:flex;gap:.8em;flex-wrap:wrap;justify-content:center"><button type="button" class="btn" id="y3yine">Yeniden uç</button><button type="button" class="btn" id="y3bitir">Çık</button></div>';
    w.appendChild(k); Q('y3yine').addEventListener('click', () => { k.remove(); U = yeni(u.d); sonHud = ''; const ust = w.querySelector('.y-ust'); if (ust) { w.innerHTML = govde(); bagla(w); } }); Q('y3bitir').addEventListener('click', bitir); }

  const TUS = { ArrowLeft: 'sol', KeyA: 'sol', ArrowRight: 'sag', KeyD: 'sag', ArrowUp: 'yukari', KeyW: 'yukari', ArrowDown: 'asagi', KeyS: 'asagi' };
  function tus(e) { if (!U) return; const k = TUS[e.code]; if (k) { e.type === 'keydown' ? giris.tus.add(k) : giris.tus.delete(k); e.preventDefault(); e.stopPropagation(); return; }
    if (e.type === 'keydown' && !e.repeat && (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight')) { atil(); e.preventDefault(); e.stopPropagation(); } else if (e.type === 'keydown' && e.code === 'Escape') bitir(); }
  function bagla(w) { const cb = Q('y3cubuk'), top = cb.firstElementChild, yari = () => cb.offsetWidth * 0.5;
    const birak2 = e => { if (!giris.cubuk || (e && e.pointerId !== giris.cubuk.id)) return; giris.cubuk = null; giris.x = 0; giris.y = 0; cb.classList.remove('tut'); top.style.transform = ''; cb.style.left = '7.4em'; cb.style.top = 'calc(100% - 7.4em)'; };
    w.addEventListener('pointerdown', e => { if (e.target.closest('button') || e.target.closest('.rend') || giris.cubuk) return; const r = w.getBoundingClientRect(); giris.cubuk = { id: e.pointerId, x: e.clientX, y: e.clientY }; cb.style.left = (e.clientX - r.left) + 'px'; cb.style.top = (e.clientY - r.top) + 'px'; cb.classList.add('tut'); try { w.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
    w.addEventListener('pointermove', e => { const c = giris.cubuk; if (!c || e.pointerId !== c.id) return; const R0 = yari(); let dx = (e.clientX - c.x) / R0, dy = (e.clientY - c.y) / R0; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      /* küçük ölü bölge, sonra eğri: ince ayar kolay, tam itiş hızlı */ const g = v => Math.abs(v) < 0.08 ? 0 : Math.sign(v) * Math.pow((Math.abs(v) - 0.08) / 0.92, 0.8); giris.x = g(dx); giris.y = -g(dy); top.style.transform = 'translate(' + (dx * R0 * 0.62).toFixed(1) + 'px,' + (dy * R0 * 0.62).toFixed(1) + 'px)'; });
    w.addEventListener('pointerup', birak2); w.addEventListener('pointercancel', birak2); w.addEventListener('contextmenu', e => e.preventDefault());
    Q('y3atil').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); atil(); }); Q('y3cik').addEventListener('click', bitir); }

  async function basla(d) { if (U) return; const A = EO2.api; if (!d && typeof S !== 'undefined' && S.dragons) d = S.dragons.find(x => typeof canRace === 'function' ? canRace(x) : x.stage === 'yetiskin') || S.dragons[0] || null;
    onceki = A.scene() === 'gok3' ? 'meydan' : A.scene(); kam = A.S.camMode; if (G.close) G.close(); G.mesgul = true; EO2.gizli = true; app.classList.add('yarista');
    T = kur(A.R, d); U = yeni(d); sonHud = ''; giris.x = giris.y = 0; giris.tus.clear(); giris.cubuk = null;
    A.go('gok3'); await new Promise(r => setTimeout(r, 620));
    let w = Q('y3'); if (w) w.remove(); w = document.createElement('div'); w.id = 'y3'; w.className = 'yr25'; w.innerHTML = govde(); app.appendChild(w); bagla(w);
    window.addEventListener('keydown', tus, true); window.addEventListener('keyup', tus, true); }
  function bitir() { if (!U) return; const A = EO2.api, w = Q('y3'); if (w) w.remove(); window.removeEventListener('keydown', tus, true); window.removeEventListener('keyup', tus, true);
    U = null; app.classList.remove('yarista'); EO2.gizli = false; G.mesgul = false; A.S.camMode = kam; A.go(onceki);
    setTimeout(() => { birak(A.R); if (G.redraw) G.redraw(); if (G.open) G.open('yaris'); }, 950); }

  EO2.yaris3 = { acik, basla, bitir, durum: () => U, ileri(sn) { for (let t = 0; U && t < sn; t += 1 / 60) adim(1 / 60); } };   // ileri: denetim betikleri için hızlı sarma
})();
