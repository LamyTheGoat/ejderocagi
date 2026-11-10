/* EO2 dikey dilim · çizici (WebGL2)
   Kamera, onaylı perspektif denemesindeki modelin aynısıdır:
     d = (Y − oyuncuY) + D,  s = D / d,  ekranX = merkez + (X − kameraX)·ppm·s,  ekranY = ufuk + (H − Z)·ppm·s
   Burada aynı iğne deliği kamera genel yazılır (eğim θ eklenebilir); θ = 0 iken yukarıdaki formüle birebir iner.
   Çizim 2D dörtgenlerdir; izdüşüm matematiği 3B'dir. Derinlik tamponu yok: ressam sırası (uzaktan yakına). */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};

  const VS = `#version 300 es
  in vec3 a_pos; in vec2 a_uv; in vec4 a_col; in float a_fog;
  uniform vec4 u_cam;    // camX, camY, camH, F (odak, css px)
  uniform vec4 u_view;   // cosθ, sinθ, asal nokta y (css px, üstten), 0
  uniform vec2 u_res;    // css px
  uniform float u_screen;
  out vec2 v_uv; out vec4 v_col; out float v_fog; out vec2 v_w;
  void main() {
    v_uv = a_uv; v_col = a_col; v_w = a_pos.xy;
    if (u_screen > 0.5) { gl_Position = vec4(a_pos.xy, 0.0, 1.0); v_fog = 0.0; return; }
    float rx = a_pos.x - u_cam.x, yd = a_pos.y - u_cam.y, zd = a_pos.z - u_cam.z;
    float depth = yd * u_view.x - zd * u_view.y;
    float upc = yd * u_view.y + zd * u_view.x;
    gl_Position = vec4(u_cam.w * rx * 2.0 / u_res.x, (1.0 - 2.0 * u_view.z / u_res.y) * depth + 2.0 * u_cam.w * upc / u_res.y, 0.0, depth);
    v_fog = a_fog * depth;
  }`;

  const FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; in vec4 v_col; in float v_fog; in vec2 v_w;
  uniform sampler2D u_tex; uniform vec4 u_fogCol; uniform vec2 u_fogR;
  out vec4 o;
  void main() {
    vec4 t = texture(u_tex, v_uv);
    vec4 c = vec4(t.rgb * v_col.rgb * v_col.a, t.a * v_col.a);
    float f = clamp((v_fog - u_fogR.x) / (u_fogR.y - u_fogR.x), 0.0, 1.0) * u_fogCol.a * step(0.0001, v_fog);
    c.rgb = mix(c.rgb, u_fogCol.rgb * c.a, f);
    o = c;
  }`;

  /* Zemin: taş döşeme dokudan değil, dünya koordinatından hesaplanır; her çözünürlükte keskin kalır.
     u_map: r = çim, g = yosun/kir lekesi, b = gölge (düşük çözünürlüklü boyama). */
  const FS_GROUND = `#version 300 es
  precision highp float;
  in vec2 v_uv; in vec4 v_col; in float v_fog; in vec2 v_w;
  uniform sampler2D u_tex; uniform vec4 u_fogCol; uniform vec2 u_fogR;
  uniform vec4 u_mapRect;          // x0, y0, 1/w, 1/h
  uniform vec3 u_amb; uniform float u_night; uniform float u_time;
  uniform vec4 u_fount;            // cx, cy, iç yarıçap, dış halka yarıçapı
  uniform vec4 u_emb;              // madalyon: cx, cy, r, 0
  uniform float u_mode;            // 0 taş döşeme, 1 ahşap döşeme (iç mekân), 2 kum (arena avlusu)
  uniform vec2 u_road;             // yol: yarı genişlik, başlangıç y
  uniform vec4 u_lights[16]; uniform int u_nl;
  out vec4 o;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float sdBox(vec2 p, float s) { vec2 d = abs(p) - s; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  // Taş: hücre içi konum f (0..1), hücre ölçüsü (m), piksel başına metre aa → rengi ve derzi karıştırır.
  vec3 paver(vec2 id, vec2 f, vec2 size, float aa, vec3 base, vec3 jointCol) {
    float h = hash(id), h2 = hash(id + 17.7);
    vec3 c = base * (0.88 + 0.20 * h) + vec3(0.045, 0.0, -0.035) * (h2 - 0.5) * 2.0;
    vec2 d = min(f, 1.0 - f) * size; float e = min(d.x, d.y);
    float vis = clamp(min(size.x, size.y) / (aa * 5.0), 0.0, 1.0);          // uzakta desen ortalamaya döner
    float j = 1.0 - smoothstep(0.020 - aa * 0.6, 0.020 + aa * 0.9, e);
    float bevel = smoothstep(0.10, 0.0, e) * 0.07;                           // kenara doğru hafif kararma
    float hi = smoothstep(0.07, 0.0, (1.0 - f.y) * size.y) * 0.05;           // kuzey kenarda ışık çizgisi
    c = c * (1.0 - bevel * vis) + hi * vis;
    return mix(c, jointCol, j * 0.8 * vis + (1.0 - vis) * 0.10);
  }
  void main() {
    vec2 p = v_w; float aa = max(fwidth(p.x), fwidth(p.y));
    vec3 m = texture(u_tex, (p - u_mapRect.xy) * u_mapRect.zw).rgb;
    vec3 JOINT = vec3(0.46, 0.36, 0.40);
    vec3 col;
    // 1) genel döşeme: şaşırtmalı örgü
    { float row = floor(p.y / 0.5); float off = mod(row, 2.0) * 0.43 + hash(vec2(row, 3.0)) * 0.16;
      vec2 q = vec2((p.x + off) / 0.86, p.y / 0.5);
      col = paver(floor(q), fract(q), vec2(0.86, 0.5), aa, vec3(0.845, 0.755, 0.675), JOINT); }
    // 2) kuzey yolu: daha iri, daha açık levhalar
    float road = (1.0 - smoothstep(u_road.x - aa, u_road.x + aa, abs(p.x))) * smoothstep(u_road.y - aa, u_road.y + aa, p.y);
    if (road > 0.0) { float row = floor(p.y / 0.9); vec2 q = vec2((p.x + mod(row, 2.0) * 0.7) / 1.4, p.y / 0.9);
      vec3 r = paver(floor(q) + 91.0, fract(q), vec2(1.4, 0.9), aa, vec3(0.90, 0.83, 0.74), JOINT);
      float edge = smoothstep(u_road.x - 0.18 - aa, u_road.x - 0.18 + aa, abs(p.x));
      r = mix(r, vec3(0.60, 0.52, 0.54) * (0.94 + 0.12 * hash(vec2(floor(p.y / 0.45), 5.0))), edge);
      col = mix(col, r, road); }
    if (u_mode > 0.5 && u_mode < 1.5) {   // ahşap döşeme: uzun tahtalar, şaşırtmalı ek yerleri, hafif damar
      float pw = 0.26, ci = floor(p.x / pw), off = hash(vec2(ci, 1.0)) * 2.4; vec2 q = vec2(p.x / pw, (p.y + off) / 2.4), f = fract(q);
      vec3 wood = vec3(0.60, 0.39, 0.24) * (0.80 + 0.32 * hash(floor(q) + 40.0)); wood *= 0.93 + 0.12 * vnoise(vec2(p.x * 46.0, p.y * 2.2));
      vec2 d = min(f, 1.0 - f) * vec2(pw, 2.4); float e = min(d.x, d.y), vis = clamp(pw / (aa * 5.0), 0.0, 1.0), j = 1.0 - smoothstep(0.006 - aa * 0.6, 0.006 + aa * 0.9, e);
      col = mix(wood, vec3(0.20, 0.11, 0.08), j * 0.85 * vis + (1.0 - vis) * 0.08);
    }
    // 3) çeşme çevresi: halka halka döşeme, iki çini mavisi kuşak
    vec2 fd = p - u_fount.xy; float r = length(fd);
    if (r < u_fount.w) {
      float rw = 0.72, t = (r - u_fount.z) / rw, ri = floor(t), rmid = u_fount.z + (ri + 0.5) * rw;
      float nseg = max(6.0, floor(6.2832 * rmid / 1.05));
      float ang = atan(fd.y, fd.x) / 6.2832 + 0.5 + ri * 0.37;
      vec2 f = vec2(fract(ang * nseg), fract(t)), size = vec2(6.2832 * rmid / nseg, rw);
      float last = floor((u_fount.w - u_fount.z) / rw) - 1.0;
      vec3 base = vec3(0.86, 0.78, 0.70);
      if (ri == 1.0 || ri == last) base = vec3(0.47, 0.61, 0.80);            // çini kuşağı
      else if (mod(ri, 2.0) < 0.5) base = vec3(0.80, 0.70, 0.64);
      vec3 ring = paver(vec2(floor(ang * nseg), ri) + 300.0, f, size, aa, base, JOINT);
      col = mix(col, ring, smoothstep(u_fount.w, u_fount.w - 0.05 - aa, r));
    }
    // 4) meydan madalyonu: sekiz köşeli Selçuklu yıldızı, lacivert ve altın kakma
    vec2 ed = p - u_emb.xy; float er = length(ed), embK = 0.0;
    if (er < u_emb.z + 0.2) {
      float R = u_emb.z; vec2 e45 = vec2(ed.x + ed.y, ed.y - ed.x) * 0.70711;
      float star = min(sdBox(ed, R * 0.56), sdBox(e45, R * 0.56));
      float w = aa * 1.2 + 0.004;
      vec3 c = col;
      c = mix(c, vec3(0.80, 0.63, 0.30), smoothstep(R + w, R - w, er) * 0.95);                   // altın bilezik
      c = mix(c, vec3(0.90, 0.85, 0.76), smoothstep(R - 0.16 + w, R - 0.16 - w, er));            // krem zemin
      c = mix(c, vec3(0.80, 0.63, 0.30), smoothstep(w, -w, star - 0.07));                        // yıldızın altın kenarı
      c = mix(c, vec3(0.16, 0.24, 0.48), smoothstep(w, -w, star));                               // lacivert yıldız
      c = mix(c, vec3(0.80, 0.63, 0.30), smoothstep(w, -w, abs(er - R * 0.40) - 0.035));         // iç halka
      c *= 0.94 + 0.10 * vnoise(p * 9.0);
      col = c; embK = smoothstep(u_emb.z + w, u_emb.z - w, er);
    }
    // 5) leke, çim, gölge
    col = mix(col, col * vec3(0.86, 0.93, 0.80), m.g * 0.55);
    float n = vnoise(p * 2.3) * 0.6 + vnoise(p * 7.0) * 0.4;
    vec3 grass = mix(vec3(0.36, 0.60, 0.30), vec3(0.52, 0.74, 0.36), n);
    grass += (hash(floor(p * 34.0)) - 0.5) * 0.05 * clamp(0.03 / aa, 0.0, 1.0);
    if (u_mode > 1.5) { float rp = sin(p.y * 7.0 + vnoise(p * 0.9) * 7.0) * 0.5 + 0.5; grass = mix(vec3(0.84, 0.72, 0.52), vec3(0.93, 0.83, 0.64), n) * (0.95 + 0.07 * rp * clamp(0.14 / aa, 0.0, 1.0)); grass += (hash(floor(p * 40.0)) - 0.5) * 0.04 * clamp(0.025 / aa, 0.0, 1.0); }
    col = mix(col, grass, smoothstep(0.35, 0.65, m.r + (n - 0.5) * 0.25) * (1.0 - embK));   // madalyon çimin ve kumun üstünde kalır
    col *= mix(vec3(1.0), vec3(0.60, 0.56, 0.76), m.b);
    // 6) ışık: gündüz ambiyansı; akşam fener havuzları
    vec3 lit = col * u_amb;
    for (int i = 0; i < 16; i++) { if (i >= u_nl) break; vec4 L = u_lights[i];
      float a = clamp(1.0 - length(p - L.xy) / L.z, 0.0, 1.0); a = a * a * L.w;
      lit += col * vec3(1.25, 0.74, 0.34) * a * u_night; }
    float f = clamp((v_fog - u_fogR.x) / (u_fogR.y - u_fogR.x), 0.0, 1.0) * u_fogCol.a;
    o = vec4(mix(lit, u_fogCol.rgb, f), 1.0);
  }`;

  EO2.createRenderer = function (canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const program = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      ['a_pos', 'a_uv', 'a_col', 'a_fog'].forEach((n, i) => gl.bindAttribLocation(p, i, n)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
      return { p, u }; };
    const prog = program(VS, FS), progG = program(VS, FS_GROUND);

    const STRIDE = 10, MAXQ = 4096, buf = new Float32Array(MAXQ * 4 * STRIDE);
    const vbo = gl.createBuffer(), ibo = gl.createBuffer(), vao = gl.createVertexArray();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    const idx = new Uint16Array(MAXQ * 6); for (let i = 0; i < MAXQ; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const F = 4 * STRIDE;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, F, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, F, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, F, 20);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, F, 36);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const R = { gl, maxTex, quads: 0, flushes: 0, w: 1, h: 1, dpr: 1 };
    let n = 0, curTex = null, curAdd = false, curScreen = false;
    const cam = { x: 0, y: 0, h: 3.57, F: 500, cos: 1, sin: 0, ppy: 200 };
    const fog = { col: [0.8, 0.86, 0.9, 0.8], r: [30, 120] };

    /* Doku: tuval ya da görsel. Küçültme zinciri + (varsa) anizotropik süzme: eğik yüzeyde keskin kalır. */
    R.texture = function (src, opt = {}) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, opt.raw ? false : true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      const rep = opt.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rep); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rep);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (opt.mips === false) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      else { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
      return { t, w: src.width || src.naturalWidth, h: src.height || src.naturalHeight };
    };

    R.resize = function (w, h, dpr) {
      R.w = w; R.h = h; R.dpr = dpr; const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      gl.viewport(0, 0, pw, ph);
    };
    R.setCamera = function (c) { Object.assign(cam, c); };
    R.setFog = function (col, r) { fog.col = col; fog.r = r; };
    R.cam = cam;

    /* Dünya → ekran (css px). Kamera arkasındaki nokta için null. */
    R.project = function (X, Y, Z) {
      const rx = X - cam.x, yd = Y - cam.y, zd = Z - cam.h, d = yd * cam.cos - zd * cam.sin;
      if (d < 0.2) return null;
      const up = yd * cam.sin + zd * cam.cos;
      return [R.w / 2 + cam.F * rx / d, cam.ppy - cam.F * up / d, d];
    };
    /* Ekran → zemin (Z = 0). Ufkun üstünde ya da çok uzaktaysa null. */
    R.unproject = function (sx, sy) {
      // a = up/depth;  yd·sin + zd·cos = a·(yd·cos − zd·sin)  →  yd = zd·(cos + a·sin) / (a·cos − sin)
      const a = (cam.ppy - sy) / cam.F, den = a * cam.cos - cam.sin; if (Math.abs(den) < 1e-6) return null;
      const zd = -cam.h, yd = zd * (cam.cos + a * cam.sin) / den;
      const depth = yd * cam.cos - zd * cam.sin; if (depth < 0.3 || depth > 90) return null;
      return [cam.x + (sx - R.w / 2) * depth / cam.F, cam.y + yd];
    };

    function setUniforms(pr) {
      gl.uniform4f(pr.u.u_cam, cam.x, cam.y, cam.h, cam.F);
      gl.uniform4f(pr.u.u_view, cam.cos, cam.sin, cam.ppy, 0);
      gl.uniform2f(pr.u.u_res, R.w, R.h);
      gl.uniform4fv(pr.u.u_fogCol, fog.col); gl.uniform2fv(pr.u.u_fogR, fog.r);
      gl.uniform1i(pr.u.u_tex, 0);
    }
    function flush() {
      if (!n) return;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, n * 4 * STRIDE));
      gl.bindTexture(gl.TEXTURE_2D, curTex.t);
      gl.blendFunc(gl.ONE, curAdd ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(prog.u.u_screen, curScreen ? 1 : 0);
      gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
      R.quads += n; R.flushes++; n = 0;
    }
    R.begin = function (clear) {
      R.quads = 0; R.flushes = 0; n = 0; curTex = null;
      gl.clearColor(clear[0], clear[1], clear[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(prog.p); setUniforms(prog);
    };
    /* Dörtgen: dört dünya köşesi (sol alt, sağ alt, sağ üst, sol üst), uv dikdörtgeni, renk çarpanı.
       add: toplamalı ışık; fogK: sis çarpanı (0 = sis yok); screen: köşeler doğrudan NDC. */
    R.quad = function (tex, p0, p1, p2, p3, u0, v0, u1, v1, col, add, fogK, screen) {
      add = !!add; screen = !!screen;
      if (tex !== curTex || add !== curAdd || screen !== curScreen || n >= MAXQ) { flush(); curTex = tex; curAdd = add; curScreen = screen; }
      const c = col || WHITE, fk = fogK === undefined ? 1 : fogK; let o = n * 4 * STRIDE;
      const put = (p, u, v) => { buf[o++] = p[0]; buf[o++] = p[1]; buf[o++] = p[2]; buf[o++] = u; buf[o++] = v; buf[o++] = c[0]; buf[o++] = c[1]; buf[o++] = c[2]; buf[o++] = c[3]; buf[o++] = fk; };
      put(p0, u0, v1); put(p1, u1, v1); put(p2, u1, v0); put(p3, u0, v0); n++;
    };
    const WHITE = [1, 1, 1, 1];
    R.flush = flush;

    /* Zemin: tek büyük dörtgen, kendi programıyla. */
    R.ground = function (mapTex, rect, g) {
      flush(); gl.useProgram(progG.p); setUniforms(progG);
      gl.uniform1f(progG.u.u_screen, 0);
      gl.uniform4f(progG.u.u_mapRect, g.map[0], g.map[1], 1 / g.map[2], 1 / g.map[3]);
      gl.uniform3fv(progG.u.u_amb, g.amb); gl.uniform1f(progG.u.u_night, g.night); gl.uniform1f(progG.u.u_time, g.time);
      gl.uniform4fv(progG.u.u_fount, g.fount); gl.uniform4fv(progG.u.u_emb, g.emb); gl.uniform1f(progG.u.u_mode, g.mode || 0); gl.uniform2fv(progG.u.u_road, g.road || [0, 1e6]);
      const L = new Float32Array(64); g.lights.slice(0, 16).forEach((l, i) => L.set(l, i * 4));
      gl.uniform4fv(progG.u.u_lights, L); gl.uniform1i(progG.u.u_nl, Math.min(16, g.lights.length));
      gl.bindTexture(gl.TEXTURE_2D, mapTex.t); gl.blendFunc(gl.ONE, gl.ZERO);
      const [x0, y0, x1, y1] = rect, c = WHITE; let o = 0;
      const put = (x, y) => { buf[o++] = x; buf[o++] = y; buf[o++] = 0; buf[o++] = 0; buf[o++] = 0; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; };
      put(x0, y0); put(x1, y0); put(x1, y1); put(x0, y1);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, 4 * STRIDE));
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); R.quads++; R.flushes++;
      gl.useProgram(prog.p); setUniforms(prog); curTex = null;
    };
    return R;
  };
})();
