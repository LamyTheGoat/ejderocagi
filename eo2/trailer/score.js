/* Ejder Ocağı fragmanı · müzik ve ses
   Hiç ses dosyası yok: her nota ve her efekt burada, örnek örnek hesaplanır (44,1 kHz, stereo).
   Makam rengi: Re Hicaz (Re Mib Fa# Sol La Sib Do). Ölçü 4/4, vurgular 3+3+2 (aksak his). Tempo ve vuruş anları film.js ile ortaktır. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : self, EO2 = G.EO2 = G.EO2 || {};   // sayfada da, arka plan iş parçacığında da çalışır
  EO2.score = function (C) {
    const sr = 44100, BEAT = 60 / C.BPM, BAR = BEAT * 4, N = Math.ceil((C.dur + 0.5) * sr), L = new Float32Array(N), Rr = new Float32Array(N), SL = new Float32Array(N), SR = new Float32Array(N), TAU = Math.PI * 2;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12), bar = (b, beat = 0) => b * BAR + beat * BEAT, TN = 8192, TBL = new Float32Array(TN), TK = TN / TAU; for (let i = 0; i < TN; i++) TBL[i] = Math.sin(i / TN * TAU); const sn = ph => TBL[(ph * TK) & (TN - 1)];
    let seed = 20261111 | 0; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const mix = (buf, t, g, pan = 0, send = 0.18) => { const s = Math.round(t * sr), a = (pan + 1) * Math.PI / 4, gl = g * Math.cos(a) * 1.414, gr = g * Math.sin(a) * 1.414; for (let i = Math.max(0, -s); i < buf.length && s + i < N; i++) { const v = buf[i]; L[s + i] += v * gl; Rr[s + i] += v * gr; SL[s + i] += v * gl * send; SR[s + i] += v * gr * send; } };
    const edge = (o, a = 0.004, r = 0.03) => { const na = Math.floor(a * sr), nr = Math.floor(r * sr), n = o.length; for (let i = 0; i < na && i < n; i++) o[i] *= i / na; for (let i = 0; i < nr && i < n; i++) o[n - 1 - i] *= i / nr; return o; };
    /* --- çalgılar --- */
    // saz teli (Karplus-Strong): gürültüyle dolu bir gecikme hattı, her turda biraz yumuşar
    function pluck(f, dur, bright = 0.55, damp = 0.9965) { const n = Math.floor(dur * sr), o = new Float32Array(n), P = Math.max(2, Math.round(sr / f)), d = new Float32Array(P); let lp = 0; for (let i = 0; i < P; i++) { lp += (rnd() - lp) * (0.2 + bright * 0.75); d[i] = lp; }
      let k = 0, prev = 0; for (let i = 0; i < n; i++) { const cur = d[k]; d[k] = (cur + prev) * 0.5 * damp; prev = cur; o[i] = cur; k = (k + 1) % P; } return edge(o, 0.002, 0.04); }
    const saz = (m, t, g, pan = 0, dur = 0.9, bright = 0.55, send = 0.2) => { mix(pluck(hz(m), dur, bright), t, g, pan - 0.08, send); mix(pluck(hz(m) * 1.006, dur, bright * 0.9), t + 0.004, g * 0.7, pan + 0.08, send); };
    // davul: perdesi hızla düşen sinüs + tokmak tıkırtısı
    function drum(f1, f0, dur, click = 0.5, drop = 28) { const n = Math.floor(dur * sr), o = new Float32Array(n), kd = Math.exp(-drop / sr), ke = Math.exp(-5.5 / dur / sr), kc = Math.exp(-120 / sr), nc = Math.min(n, Math.floor(0.06 * sr)); let ph = 0, lp = 0, df = f1 - f0, env = 1, ce = click; for (let i = 0; i < n; i++) { ph += TAU * (f0 + df) / sr; df *= kd; let v = TBL[(ph * TK) & (TN - 1)] * env; env *= ke; if (i < nc) { lp += (rnd() - lp) * 0.5; v += lp * ce; ce *= kc; } o[i] = v; } return edge(o, 0.001, 0.02); }
    // gürültü: fn(t, k) → [kesim Hz, genlik, (alt kesim Hz)]
    function nz(dur, fn) { const n = Math.floor(dur * sr), o = new Float32Array(n); let a = 0, b = 0, h = 0, ca = 0, ch = 0, amp = 0, amp1 = 0, da = 0; for (let i = 0; i < n; i++) { if (!(i & 31)) { const p = fn(i / sr, i / n); ca = 1 - Math.exp(-TAU * p[0] / sr); ch = p[2] ? 1 - Math.exp(-TAU * p[2] / sr) : 0; amp1 = p[1]; da = (amp1 - amp) / 32; } amp += da; const w = rnd(); a += (w - a) * ca; b += (a - b) * ca; let v = b; if (ch) { h += (v - h) * ch; v -= h; } o[i] = v * amp; } return edge(o, 0.003, 0.03); }
    // yaylı yastık: her nota iki hafif akortsuz ses, beş armonik
    function pad(notes, dur, att, rel, bright = 1, trem = 0) { const n = Math.floor(dur * sr), o = new Float32Array(n); for (const m of notes) for (const det of [0.9972, 1.0031]) { const f = hz(m) * det, ph0 = Math.abs(rnd()) * TAU; for (let hmn = 1; hmn <= 5; hmn++) { const amp = Math.pow(hmn, -1.2 - (1 - bright) * 1.2) * (hmn % 2 ? 1 : 0.7), w = TAU * f * hmn / sr * TK, p0 = ph0 * hmn * TK; if (f * hmn > 9000) continue; for (let i = 0; i < n; i++) o[i] += TBL[(p0 + w * i) & (TN - 1)] * amp; } }
      const g = 0.5 / Math.sqrt(notes.length * 2); for (let i = 0; i < n; i++) { const t = i / sr, e = Math.min(1, t / att) * Math.min(1, (dur - t) / rel); o[i] *= g * e * e * (1 - trem * (0.5 + 0.5 * Math.sin(TAU * 5.2 * t))); } return o; }
    // ney: sinüs ağırlıklı, nefesli, gecikmeli titreme. zurna = 1 ise armonikler artar (parlak, genizden)
    function ney(m, dur, zurna = 0, bend = 0) { const n = Math.floor(dur * sr), o = new Float32Array(n), f0 = hz(m); let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, vib = Math.min(1, Math.max(0, (t - 0.18) / 0.4)), f = f0 * (1 + 0.0065 * vib * sn(TAU * 5.4 * t)) * (bend ? 1 - bend * Math.exp(-t * 16) : 1); ph += TAU * f / sr;
        let v = sn(ph) + 0.32 * sn(2 * ph) + 0.1 * sn(3 * ph); if (zurna) for (let h = 2; h <= 7; h++) v += zurna * sn(h * ph) / h * 1.5; lp += (rnd() - lp) * 0.35; v += lp * 0.22 * (t < 0.3 ? 1 + 2 * Math.exp(-t * 20) : 1);
        o[i] = v * Math.min(1, t / 0.06) * Math.min(1, (dur - t) / 0.14) * 0.5; } return o; }
    function tone(f1, f0, dur, shape = 6) { const n = Math.floor(dur * sr), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const k = i / n, f = f1 + (f0 - f1) * k; ph += TAU * f / sr; o[i] = Math.sin(ph) * Math.sin(Math.PI * Math.pow(k, 0.6)) * Math.exp(-k * shape * 0.2); } return o; }
    /* --- hazır sesler --- */
    const dum = (t, g = 1) => { mix(drum(150, 50, 0.6, 0.6), t, 0.56 * g, 0, 0.14); }, tek = (t, g = 1, pan = 0.2) => { mix(drum(900, 380, 0.09, 1.2, 60), t, 0.2 * g, pan, 0.22); mix(nz(0.07, (x, k) => [6000, (1 - k) * 0.5, 1800]), t, 0.22 * g, pan, 0.2); };
    const impact = (t, g = 1) => { mix(drum(120, 27, 2.6, 1.4, 10), t, 0.95 * g, 0, 0.3); mix(nz(1.6, (x, k) => [2600 * Math.pow(1 - k, 2) + 90, Math.pow(1 - k, 2.2)]), t, 0.8 * g, 0, 0.5); mix(nz(2.2, (x, k) => [9000, Math.pow(1 - k, 3) * 0.35, 3500]), t, 0.5 * g, 0, 0.6); };
    const riser = (t, dur, g = 1) => { mix(nz(dur, (x, k) => [300 + 7000 * k * k * k, k * k * 0.9, 150 + 1500 * k]), t, 0.5 * g, 0, 0.3); const n = Math.floor(dur * sr), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const k = i / n; ph += TAU * (110 * Math.pow(2, k * 2.5)) / sr; o[i] = (Math.sin(ph) + 0.4 * Math.sin(ph * 1.5)) * k * k * 0.5; } mix(edge(o, 0.01, 0.01), t, 0.3 * g, 0, 0.3); };
    const whoosh = (t, dur = 0.7, g = 1, pan = 0, hi = 2400) => mix(nz(dur, (x, k) => [200 + hi * Math.sin(Math.PI * k), Math.pow(Math.sin(Math.PI * k), 2), 120]), t, 0.55 * g, pan, 0.25);
    const wing = (t, g = 1, pan = 0) => mix(nz(0.55, (x, k) => [140 + 700 * Math.sin(Math.PI * Math.pow(k, 0.6)), Math.pow(Math.sin(Math.PI * Math.pow(k, 0.5)), 3)]), t, 0.9 * g, pan, 0.25);
    const thunder = (t, g = 1) => { mix(nz(0.09, (x, k) => [9000, 1 - k, 900]), t, 0.8 * g, -0.3, 0.5); mix(nz(2.6, (x, k) => [900 * Math.pow(1 - k, 1.5) + 70, Math.pow(1 - k, 1.6) * (0.55 + 0.45 * Math.sin(k * 31) * Math.sin(k * 13))]), t + 0.03, 1.4 * g, 0.1, 0.5); };
    const roar = (t, dur, g = 1, base = 90) => { const n = Math.floor(dur * sr), o = new Float32Array(n); let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const k = i / n, f = base * (1 + 0.5 * Math.sin(Math.PI * Math.pow(k, 0.5))) * (1 + 0.03 * Math.sin(k * 190)); ph += TAU * f / sr; let v = 0; for (let h = 1; h <= 9; h++) v += sn(ph * h + h) / h; lp += (rnd() - lp) * 0.12; o[i] = (v * 0.5 + lp * 2.4) * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.45)), 1.5) * (0.75 + 0.25 * Math.sin(k * 75)); } mix(o, t, 0.36 * g, 0, 0.45); };
    const chime = (t, notes, g = 1) => notes.forEach((m, i) => saz(m, t + i * 0.07, 0.2 * g, (i % 2 ? 0.4 : -0.4), 1.6, 0.9, 0.5));
    const OST_A = [62, 57, 62, 63, 57, 62, 66, 63], OST_B = [62, 57, 62, 63, 57, 62, 67, 66];
    const ost = (b, g = 1, tr = 0, pat) => (pat || (b % 2 ? OST_B : OST_A)).forEach((m, e) => saz(m + tr, bar(b, e * 0.5), (e === 0 || e === 3 || e === 6 ? 0.3 : 0.2) * g, e % 2 ? 0.25 : -0.25, 0.7, 0.5));
    const davul = (b, lv) => { dum(bar(b, 0), lv > 2 ? 1.15 : 0.9); dum(bar(b, 1.5), 0.75); tek(bar(b, 3), 1); if (lv > 1) { tek(bar(b, 1), 0.5, -0.3); tek(bar(b, 2.5), 0.5, 0.4); } if (lv > 2) { dum(bar(b, 2), 0.6); tek(bar(b, 3.5), 0.7, -0.2); mix(drum(95, 34, 1.1, 0.3, 14), bar(b, 0), 0.5, 0, 0.2); } };
    const bass = (m, t, dur, g = 1) => { const n = Math.floor(dur * sr), o = new Float32Array(n), w = TAU * hz(m) / sr * TK, ke = Math.exp(-1.1 / sr), na = Math.floor(0.02 * sr); let env = 1; for (let i = 0; i < n; i++) { o[i] = (TBL[(w * i) & (TN - 1)] + 0.35 * TBL[(2 * w * i) & (TN - 1)] + 0.12 * TBL[(3 * w * i) & (TN - 1)]) * (i < na ? i / na : 1) * env; env *= ke; } mix(edge(o), t, 0.35 * g, 0, 0.08); };
    const mel = (b, list, g = 1, oct = 0, z = 0) => list.forEach(([beat, d, m]) => mix(ney(m + oct, d * BEAT * 0.98, z, 0.02), bar(b, beat), 0.2 * g, -0.1, 0.4));

    /* ================= düzenleme ================= */
    const q = C.cues || C;
    // 0–3: soğuk açılış — ateş çıtırtısı, alçak dem, tek başına ney, yürek atışı
    { const n = Math.floor(10.6 * sr), o = new Float32Array(n); for (let k = 0; k < 420; k++) { const s = Math.floor(Math.abs(rnd()) * (n - 400)), a = Math.pow(Math.abs(rnd()), 3) * 0.9, len = 40 + Math.floor(Math.abs(rnd()) * 200); for (let i = 0; i < len; i++) o[s + i] += rnd() * a * Math.exp(-i / (len * 0.25)); } let lp = 0; for (let i = 0; i < n; i++) { lp += (o[i] - lp) * 0.45; o[i] = lp * Math.min(1, i / (2 * sr)) * Math.min(1, (n - i) / (1.2 * sr)); } mix(o, 0, 0.55, 0.15, 0.1); }
    mix(nz(10.4, (t, k) => [220 + 80 * Math.sin(t * 0.7), 0.5 * Math.min(1, t / 3) * Math.min(1, (10.4 - t) / 1)]), 0, 0.55, 0, 0.2);   // rüzgâr
    mix(pad([38, 45, 50], 10.2, 3.5, 1.2, 0.35), 0, 0.5, 0, 0.3);
    mel(0, [[1.5, 2.4, 74]], 0.9); mel(1, [[0.5, 0.9, 75], [1.4, 2.2, 74]], 0.9); mel(2, [[0.5, 1.4, 78], [1.9, 0.5, 75], [2.4, 1.6, 74]], 0.95); mel(3, [[0.5, 3.2, 69]], 0.8);
    for (let b = 1; b < 3; b++) for (const o of [0, 0.3]) mix(drum(64, 38, 0.4, 0.1, 30), bar(b, 2) + o, 0.4, 0, 0.1);
    for (let i = 0, t = bar(3); t < q.hatch - 0.05; i++) { mix(drum(66, 38, 0.36, 0.1, 30), t, 0.42 + i * 0.045, 0, 0.1); mix(drum(66, 38, 0.3, 0.1, 30), t + 0.16, 0.3 + i * 0.04, 0, 0.1); t += Math.max(0.22, 0.6 - i * 0.07); }
    for (const t of q.cracks) { mix(nz(0.12, (x, k) => [7000, Math.pow(1 - k, 2), 1400]), t, 0.5, (rnd()) * 0.5, 0.35); mix(drum(1900, 700, 0.05, 1, 80), t, 0.2, 0, 0.3); }
    riser(q.hatch - 1.5, 1.5, 0.8);
    // 4–5: yumurta çatlar — vuruş, ışıltı, yavrunun ilk sesi; saz girer
    impact(q.hatch, 0.9); chime(q.hatch + 0.05, [74, 81, 86, 90, 93], 1.1); mix(pad([50, 57, 62, 66], 5.2, 0.5, 1.6, 0.8), q.hatch, 0.5, 0, 0.4);
    for (const [dt, f] of [[1.15, 1500], [1.42, 1750], [3.3, 1600]]) mix(tone(f, f * 1.45, 0.13, 2), q.hatch + dt, 0.16, 0.1, 0.4);
    ost(5, 0.8); bass(38, bar(5), 2.2, 0.8); mel(5, [[0, 1.5, 74], [1.5, 0.5, 75], [2, 2, 78]], 0.8);
    // 6–7: büyüme — davul girer, her evrede ışıltı; yükseliş
    for (const b of [6, 7]) { ost(b, 0.95); davul(b, 2); bass(38, bar(b), 1.3); bass(38, bar(b, 1.5), 1.1, 0.7); } mix(pad([50, 57, 62], 4.9, 0.4, 0.5, 0.7), bar(6), 0.4);
    q.grow.forEach((t, i) => { chime(t, [78 + i * 2, 81 + i * 2, 86 + i * 2], 0.9); mix(drum(110, 40, 0.9, 0.5, 16), t, 0.5, 0, 0.3); whoosh(t - 0.25, 0.5, 0.6, 0, 3200); });
    mel(6, [[0, 1, 74], [1, 1, 78], [2, 2, 79]], 0.8); mel(7, [[0, 1.5, 81], [1.5, 0.5, 79], [2, 2, 78]], 0.85); riser(bar(8) - 1.6, 1.6, 0.9);
    // 8–12: beş element — tam kadro; her ölçü başında vuruş. Akor: Re · Mib · Sol minör · Mib · Re
    const CH = [[50, 57, 62, 66], [51, 58, 63, 67], [55, 62, 67, 70], [51, 58, 63, 67], [50, 57, 62, 66]], BS = [38, 39, 43, 39, 38];
    const TH = [[[0, 1.5, 74], [1.5, 0.5, 75], [2, 1, 78], [3, 1, 79]], [[0, 2, 81], [2, 1, 79], [3, 0.5, 78], [3.5, 0.5, 75]], [[0, 1.5, 79], [1.5, 0.5, 81], [2, 2, 82]], [[0, 1, 79], [1, 1, 78], [2, 1, 75], [3, 1, 74]], [[0, 2.5, 74], [2.5, 0.5, 75], [3, 1, 78]]];
    for (let i = 0; i < 5; i++) { const b = 8 + i; impact(bar(b), 0.62); whoosh(bar(b) - 0.22, 0.45, 0.8, 0, 3600); mix(pad(CH[i], BAR + 0.3, 0.12, 0.35, 0.9), bar(b), 0.42, 0, 0.3); ost(b, 1, BS[i] - 38); davul(b, 3); bass(BS[i], bar(b), 1.3, 1.1); bass(BS[i], bar(b, 1.5), 1, 0.8); bass(BS[i] + 7, bar(b, 3), 0.6, 0.7); mel(b, TH[i], 1, 0, 0.5); mel(b, TH[i], 0.45, 12); }
    mix(nz(1.8, (t, k) => [500 + 2600 * Math.sin(Math.PI * k), Math.pow(Math.sin(Math.PI * k), 1.5) * (0.7 + 0.3 * Math.sin(t * 40))]), q.el[0] + 0.5, 0.7, 0.2, 0.3); roar(q.el[0] + 0.35, 1.5, 0.9, 85);        // ateş nefesi
    for (let k = 0; k < 14; k++) saz(86 + [0, 3, 7, 8, 12][k % 5], q.el[1] + 0.25 + k * 0.14 + Math.abs(rnd()) * 0.05, 0.1, rnd() * 0.8, 1.2, 1, 0.6);                                                     // buz çıngırağı
    for (const dt of q.thunder) thunder(q.el[2] + dt, 0.8);
    mix(nz(2.2, (t, k) => [110 + 60 * Math.sin(t * 9), Math.sin(Math.PI * k) * 1.2]), q.el[3] + 0.1, 0.9, 0, 0.2); for (const dt of [0.5, 0.95, 1.3, 1.75]) mix(drum(90, 36, 0.5, 0.9, 20), q.el[3] + dt, 0.5, rnd() * 0.5, 0.2); roar(q.el[3] + 0.3, 1.3, 0.7, 70);
    mix(nz(2.3, (t, k) => [5000, Math.pow(Math.sin(Math.PI * k), 2) * (0.5 + 0.5 * Math.sin(t * 23)) * 0.6, 2400]), q.el[4], 0.5, 0, 0.6); mix(pad([62, 63, 68], 2.3, 0.8, 0.5, 0.5, 0.5), q.el[4], 0.3, 0, 0.5);
    // 13–17: dünya — ferah, aydınlık. Sol · Re · Mi minör · Do · Re; saz arpej, ney ezgi, hafif vurmalı
    const WC = [[55, 59, 62], [50, 57, 66], [52, 59, 64], [48, 55, 64], [50, 57, 66]], WA = [[67, 71, 74, 71, 67, 71, 74, 79], [66, 69, 74, 69, 66, 69, 74, 78], [64, 67, 71, 67, 64, 67, 71, 76], [64, 67, 72, 67, 64, 67, 72, 76], [66, 69, 74, 69, 78, 74, 69, 66]], WB = [43, 38, 40, 36, 38];
    const WM = [[[0, 2, 83], [2, 2, 86]], [[0, 2, 81], [2, 1, 86], [3, 1, 90]], [[0, 3, 91], [3, 1, 88]], [[0, 2, 88], [2, 1, 91], [3, 1, 88]], [[0, 3.6, 90]]];
    whoosh(bar(13) - 0.3, 0.6, 0.8); chime(bar(13), [79, 83, 86, 91], 1);
    for (let i = 0; i < 5; i++) { const b = 13 + i; mix(pad(WC[i], BAR + 0.3, 0.25, 0.4, 0.75), bar(b), 0.4, 0, 0.35); ost(b, 1.05, 0, WA[i]); bass(WB[i], bar(b), 1.5, 0.9); bass(WB[i] + 7, bar(b, 2.5), 0.9, 0.6); mel(b, WM[i], 0.95, -12);
      dum(bar(b), 0.55); tek(bar(b, 1.5), 0.6); tek(bar(b, 3), 0.7, -0.2); tek(bar(b, 2.5), 0.35, 0.4); if (i) whoosh(bar(b) - 0.18, 0.36, 0.5, i % 2 ? 0.4 : -0.4, 3000); }
    // 18–21: düello — gerilim, nişan, atış, havada asılı an, patlama
    impact(bar(18), 0.75); mix(pad([38, 45, 50, 51], BAR * 2, 0.3, 0.4, 0.55), bar(18), 0.42, 0, 0.3);
    for (let b = 18; b < 20; b++) { for (let s = 0; s < 16; s++) saz(s % 4 === 3 ? 51 : 50, bar(b, s * 0.25), (s % 4 ? 0.13 : 0.24) * (b === 19 ? 1 + s * 0.035 : 1), s % 2 ? 0.3 : -0.3, 0.22, 0.3, 0.1); bass(38, bar(b), 1.2, 1); bass(38, bar(b, 2), 1.2, 0.9); dum(bar(b), 0.95); dum(bar(b, 2), 0.8); tek(bar(b, 1), 0.6); tek(bar(b, 3), 0.7); }
    for (let s = 0; s < 8; s++) dum(bar(19, 2 + s * 0.25), 0.45 + s * 0.09); riser(q.fire - 2.2, 2.2, 1); mix(tone(300, 1500, 1.3, 1), q.fire - 1.3, 0.08, 0, 0.3);                       // güç doluyor
    mix(drum(170, 30, 1.6, 2.5, 14), q.fire, 1.1, -0.2, 0.35); mix(nz(1.1, (t, k) => [5000 * Math.pow(1 - k, 2) + 120, Math.pow(1 - k, 1.6)]), q.fire, 1.3, -0.2, 0.45);                  // top atışı
    mix(pad([74, 75, 81], q.boom - q.fire, 0.5, 0.2, 0.5, 0.7), q.fire + 0.15, 0.2, 0, 0.5); { const d = q.boom - q.fire - 0.15, n = Math.floor(d * sr), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const k = i / n; ph += TAU * (1500 - 800 * k * k) / sr; o[i] = Math.sin(ph) * Math.pow(k, 1.5) * 0.5; } mix(edge(o, 0.05, 0.01), q.fire + 0.15, 0.2, 0.3, 0.3); }
    mix(drum(140, 24, 3.0, 3, 9), q.boom, 1.25, 0.2, 0.4); mix(nz(2.4, (t, k) => [6500 * Math.pow(1 - k, 2.5) + 100, Math.pow(1 - k, 1.5) * 1.2]), q.boom, 1.5, 0.2, 0.5); for (let k = 0; k < 16; k++) mix(drum(240 + rnd() * 90, 80, 0.12, 1.5, 50), q.boom + 0.35 + Math.abs(rnd()) * 1.3, 0.16, rnd(), 0.3);
    ost(21, 0.8); davul(21, 2); bass(38, bar(21, 2), 1, 0.8); riser(bar(22) - 1.0, 1.0, 0.6);
    // 22–23: zindanlar — karanlık; üç ton aralığı, tıslama, kükreme
    impact(bar(22), 0.85); mix(pad([38, 44, 50, 51], BAR * 2 + 0.2, 0.2, 0.5, 0.45, 0.3), bar(22), 0.55, 0, 0.5); mix(nz(2.2, (t, k) => [8000, Math.pow(Math.sin(Math.PI * k), 2) * (0.6 + 0.4 * Math.sin(t * 60)) * 0.7, 3600]), bar(22) + 0.15, 0.5, -0.3, 0.5);
    for (const [beat, m] of [[0, 62], [1, 63], [2, 62], [3, 56]]) saz(m - 12, bar(22, beat), 0.3, 0, 1.2, 0.4, 0.4); dum(bar(22, 2), 0.9); dum(bar(22, 3.5), 0.7);
    impact(bar(23), 1); roar(bar(23) + 0.15, 1.9, 1.5, 62); for (let s = 0; s < 8; s++) dum(bar(23, s * 0.5), 0.6 + s * 0.06); for (const [beat, m] of [[0, 50], [1, 51], [2, 54], [3, 56]]) saz(m, bar(23, beat), 0.3, 0, 1.2, 0.4, 0.4); riser(bar(24) - 1.8, 1.8, 1.1);
    // 24–25: final — ana ezgi bir oktav yukarıda, kanat sesleri
    for (let i = 0; i < 2; i++) { const b = 24 + i; impact(bar(b), i ? 0.6 : 1); mix(pad(CH[i], BAR + 0.3, 0.1, 0.35, 1), bar(b), 0.5, 0, 0.35); ost(b, 1.1, BS[i] - 38); davul(b, 3); bass(BS[i], bar(b), 1.3, 1.2); bass(BS[i], bar(b, 1.5), 1, 0.9); bass(BS[i] + 7, bar(b, 3), 0.6, 0.8); mel(b, TH[i], 1.1, 0, 0.6); mel(b, TH[i], 0.7, 12, 0.2); }
    q.wings.forEach((t, i) => wing(t, 0.9, i % 2 ? 0.5 : -0.5)); roar(q.finale + 3.0, 1.7, 1.3, 95); riser(q.logo - 1.2, 1.2, 1);
    // 26–27: mühür — büyük vuruş, Re majör, son saz cümlesi
    impact(q.logo, 1.25); mix(drum(90, 22, 3.6, 0.5, 6), q.logo, 0.9, 0, 0.4); mix(pad([38, 50, 57, 62, 66, 74], C.dur - q.logo, 0.05, 2.8, 1), q.logo, 0.62, 0, 0.5); chime(q.logo + 0.02, [74, 78, 81, 86, 90, 93, 98], 1.2);
    [[1.2, 62], [1.8, 69], [2.4, 74], [3.0, 78]].forEach(([dt, m]) => saz(m, q.logo + dt, 0.34, 0, 2.6, 0.7, 0.5)); mel(26, [[2, 3.4, 74]], 0.8);

    /* ================= yankı (dört tarak + iki tümgeçiren) ve çıkış ================= */
    const rev = (src, dst, off) => { const tmp = new Float32Array(N); for (const dms of [29.7, 37.1, 41.1, 43.7]) { const D = Math.round((dms + off) * sr / 1000), d = new Float32Array(D); let k = 0, lp = 0; for (let i = 0; i < N; i++) { const y = d[k]; lp += (y - lp) * 0.45; d[k] = src[i] + lp * 0.84; tmp[i] += y; k = (k + 1) % D; } }
      for (const dms of [5.0, 1.7]) { const D = Math.round((dms + off * 0.3) * sr / 1000), d = new Float32Array(D); let k = 0; for (let i = 0; i < N; i++) { const b = d[k], x = tmp[i] + b * 0.7; d[k] = x; tmp[i] = b - x * 0.7; k = (k + 1) % D; } }
      for (let i = 0; i < N; i++) dst[i] += tmp[i] * 0.24; };
    rev(SL, L, 0); rev(SR, Rr, 1.3);
    let peak = 0; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 0.62); Rr[i] = Math.tanh(Rr[i] * 0.62); peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i])); }
    const g = 0.93 / (peak || 1), f0 = Math.floor((C.dur - 1.3) * sr); for (let i = 0; i < N; i++) { const fd = i > f0 ? Math.max(0, 1 - (i - f0) / (1.3 * sr)) : 1; L[i] *= g * fd; Rr[i] *= g * fd; }
    return { L, R: Rr, sr, N };
  };
  if (typeof window === 'undefined') self.onmessage = e => { const s = EO2.score(e.data); self.postMessage({ L: s.L, R: s.R, sr: s.sr, N: s.N }, [s.L.buffer, s.R.buffer]); };
  EO2.scoreBuffer = function (ctx, s) { const b = ctx.createBuffer(2, s.N, s.sr); b.copyToChannel(s.L, 0); b.copyToChannel(s.R, 1); return b; };
})();
