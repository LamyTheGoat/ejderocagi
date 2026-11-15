/* Ejder Ocağı fragmanı · sinematik çizici (WebGL2)
   Oyun dilimindeki çizicinin (js/gl.js) fragman için genişletilmiş hâli:
   - serbest 3B kamera (göz, hedef, görüş açısı) ve tam izdüşüm matrisi
   - sahne önce 4x çok örneklemeli bir tampona çizilir, sonra film katmanı uygulanır:
     parlama (bloom, iki kademe), renk düzeni, kenar kararması, hafif renk ayrışması, film greni, sinema şeridi, kararma
   R.quad ve R.ground imzaları gl.js ile aynıdır; böylece meydan ve diğer alanların çizim listeleri değişmeden kullanılır. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};
  const VS = `#version 300 es
  in vec3 a_pos; in vec2 a_uv; in vec4 a_col; in float a_fog;
  uniform mat4 u_vp; uniform float u_screen;
  out vec2 v_uv; out vec4 v_col; out float v_fog; out vec2 v_w;
  void main() { v_uv = a_uv; v_col = a_col; v_w = a_pos.xy;
    if (u_screen > 0.5) { gl_Position = vec4(a_pos.xy, 0.0, 1.0); v_fog = 0.0; return; }
    vec4 c = u_vp * vec4(a_pos, 1.0); v_fog = a_fog * c.w; c.z = 0.0; gl_Position = c; }`;
  const VS_POST = `#version 300 es
  out vec2 v_uv; void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS_BRIGHT = `#version 300 es
  precision highp float; in vec2 v_uv; uniform sampler2D u_tex; uniform float u_thr; out vec4 o;
  void main() { vec3 c = texture(u_tex, v_uv).rgb; float l = max(c.r, max(c.g, c.b)); o = vec4(c * smoothstep(u_thr, u_thr + 0.3, l), 1.0); }`;
  const FS_BLUR = `#version 300 es
  precision highp float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_dir; out vec4 o;
  void main() { vec3 c = texture(u_tex, v_uv).rgb * 0.227027; c += (texture(u_tex, v_uv + u_dir * 1.3846).rgb + texture(u_tex, v_uv - u_dir * 1.3846).rgb) * 0.316216;
    c += (texture(u_tex, v_uv + u_dir * 3.2308).rgb + texture(u_tex, v_uv - u_dir * 3.2308).rgb) * 0.070270; o = vec4(c, 1.0); }`;
  const FS_FILM = `#version 300 es
  precision highp float; in vec2 v_uv; out vec4 o;
  uniform sampler2D u_scene, u_b1, u_b2; uniform vec2 u_bloom; uniform vec4 u_grade;   // doygunluk, kontrast, pozlama, kenar kararması
  uniform vec3 u_tint; uniform vec4 u_fade; uniform float u_bar, u_time, u_ca;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  void main() {
    vec2 d = (v_uv - 0.5), off = d * dot(d, d) * u_ca;
    vec3 s = vec3(texture(u_scene, v_uv + off).r, texture(u_scene, v_uv).g, texture(u_scene, v_uv - off).b);
    vec3 c = s + texture(u_b1, v_uv).rgb * u_bloom.x + texture(u_b2, v_uv).rgb * u_bloom.y;
    c *= u_grade.z; float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, u_grade.x); c = (c - 0.5) * u_grade.y + 0.5; c *= u_tint;
    c = mix(c, c * vec3(0.92, 0.96, 1.08), smoothstep(0.5, 0.0, l) * 0.5);        // gölgeler serin
    c = c / (1.0 + max(0.0, max(c.r, max(c.g, c.b)) - 0.92) * 0.6);                  // yumuşak tavan
    c *= 1.0 - u_grade.w * smoothstep(0.42, 1.05, length(d * vec2(1.0, 0.86)) * 1.5);
    c += (hash(v_uv * 911.0 + u_time * 7.3) - 0.5) * 0.028;
    c = mix(c, u_fade.rgb, u_fade.a);
    if (abs(d.y) > 0.5 - u_bar) c = vec3(0.0);
    o = vec4(c, 1.0); }`;

  EO2.createCine = function (canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    if (!gl) return null;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const program = (vs, fs, attrs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); (attrs || []).forEach((n, i) => gl.bindAttribLocation(p, i, n)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); } return { p, u }; };
    const AT = ['a_pos', 'a_uv', 'a_col', 'a_fog'], G = EO2.GLSL;
    const prog = program(VS, G.FS, AT), progG = program(VS, G.FS_GROUND, AT), pBright = program(VS_POST, FS_BRIGHT), pBlur = program(VS_POST, FS_BLUR), pFilm = program(VS_POST, FS_FILM);
    const STRIDE = 10, MAXQ = 8192, buf = new Float32Array(MAXQ * 4 * STRIDE), vbo = gl.createBuffer(), ibo = gl.createBuffer(), vao = gl.createVertexArray(), vaoPost = gl.createVertexArray();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    const idx = new Uint16Array(MAXQ * 6); for (let i = 0; i < MAXQ; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const FB = 4 * STRIDE; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, FB, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, FB, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, FB, 20); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, FB, 36);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const R = { gl, quads: 0, flushes: 0, w: 1, h: 1, dpr: 1, eye: [0, -10, 4], right: [1, 0, 0], up: [0, 0, 1], fwd: [0, 1, 0] };
    const vp = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1]), fog = { col: [0.8, 0.86, 0.9, 0.8], r: [30, 120] };
    let n = 0, curTex = null, curAdd = false, curScreen = false, tgt = null;

    R.texture = function (src, opt = {}) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, opt.raw ? false : true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      const rep = opt.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rep); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rep); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (opt.mips === false) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); else { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
      return { t, w: src.width || src.naturalWidth, h: src.height || src.naturalHeight }; };
    R.updateTexture = function (tex, src) { gl.bindTexture(gl.TEXTURE_2D, tex.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D); curTex = null; };

    /* ---- hedef tamponlar ---- */
    const mkTarget = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
    function resizeTargets(pw, ph) {
      if (tgt && tgt.pw === pw && tgt.ph === ph) return; if (tgt) { for (const k of ['scene', 'a1', 'b1', 'a2', 'b2']) { gl.deleteTexture(tgt[k].t); gl.deleteFramebuffer(tgt[k].f); } gl.deleteRenderbuffer(tgt.rb); gl.deleteFramebuffer(tgt.ms); }
      const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES)), rb = gl.createRenderbuffer(), ms = gl.createFramebuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, pw, ph);
      gl.bindFramebuffer(gl.FRAMEBUFFER, ms); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
      const h1 = [Math.max(2, pw >> 1), Math.max(2, ph >> 1)], h2 = [Math.max(2, pw >> 3), Math.max(2, ph >> 3)];
      tgt = { pw, ph, rb, ms, scene: mkTarget(pw, ph), a1: mkTarget(h1[0], h1[1]), b1: mkTarget(h1[0], h1[1]), a2: mkTarget(h2[0], h2[1]), b2: mkTarget(h2[0], h2[1]) }; }
    R.resize = function (w, h, dpr) { R.w = w; R.h = h; R.dpr = dpr; const pw = Math.round(w * dpr), ph = Math.round(h * dpr); if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; } resizeTargets(pw, ph); };

    /* ---- kamera ---- */
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    R.setView = function (eye, target, fovDeg, roll) {
      const f = norm(sub(target, eye)); let r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
      if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s]; u = [u[0] * c - r[0] * s, u[1] * c - r[1] * s, u[2] * c - r[2] * s]; r = r2; }
      const t = 1 / Math.tan(fovDeg * Math.PI / 360), asp = R.w / R.h, ex = -dot(r, eye), ey = -dot(u, eye), ez = -dot(f, eye);
      // satır düzeni: klip.x = t/asp · (r·p), klip.y = t · (u·p), klip.w = f·p (bakış derinliği)
      vp.set([r[0] * t / asp, u[0] * t, 0, f[0], r[1] * t / asp, u[1] * t, 0, f[1], r[2] * t / asp, u[2] * t, 0, f[2], ex * t / asp, ey * t, 0, ez]);
      R.eye = eye; R.right = r; R.up = u; R.fwd = f; R.tan = 1 / t; flush(); gl.useProgram(prog.p); gl.uniformMatrix4fv(prog.u.u_vp, false, vp); };
    R.project = function (X, Y, Z) { const w = vp[3] * X + vp[7] * Y + vp[11] * Z + vp[15]; if (w < 0.05) return null; const x = (vp[0] * X + vp[4] * Y + vp[8] * Z + vp[12]) / w, y = (vp[1] * X + vp[5] * Y + vp[9] * Z + vp[13]) / w; return [(x * 0.5 + 0.5) * R.w, (0.5 - y * 0.5) * R.h, w]; };
    R.depth = (X, Y, Z) => vp[3] * X + vp[7] * Y + vp[11] * Z + vp[15];
    R.setFog = function (col, r) { fog.col = col; fog.r = r; };
    // gl.js uyumu: eski kamera çağrıları yok sayılır
    R.setCamera = function () {}; R.cam = {};

    function uniforms(pr) { gl.uniformMatrix4fv(pr.u.u_vp, false, vp); gl.uniform4fv(pr.u.u_fogCol, fog.col); gl.uniform2fv(pr.u.u_fogR, fog.r); gl.uniform1i(pr.u.u_tex, 0); }
    function flush() { if (!n) return; gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, n * 4 * STRIDE)); gl.bindTexture(gl.TEXTURE_2D, curTex.t); gl.blendFunc(gl.ONE, curAdd ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(prog.u.u_screen, curScreen ? 1 : 0); gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0); R.quads += n; R.flushes++; n = 0; }
    R.flush = flush;
    R.begin = function (clear) { R.quads = 0; R.flushes = 0; n = 0; curTex = null; gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.ms); gl.viewport(0, 0, tgt.pw, tgt.ph); gl.enable(gl.BLEND);
      gl.clearColor(clear[0], clear[1], clear[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.activeTexture(gl.TEXTURE0); gl.useProgram(prog.p); uniforms(prog); };
    const WHITE = [1, 1, 1, 1];
    R.quad = function (tex, p0, p1, p2, p3, u0, v0, u1, v1, col, add, fogK, screen) { add = !!add; screen = !!screen;
      if (tex !== curTex || add !== curAdd || screen !== curScreen || n >= MAXQ) { flush(); curTex = tex; curAdd = add; curScreen = screen; }
      const c = col || WHITE, fk = fogK === undefined ? 1 : fogK; let o = n * 4 * STRIDE;
      const put = (p, u, v) => { buf[o++] = p[0]; buf[o++] = p[1]; buf[o++] = p[2]; buf[o++] = u; buf[o++] = v; buf[o++] = c[0]; buf[o++] = c[1]; buf[o++] = c[2]; buf[o++] = c[3]; buf[o++] = fk; };
      put(p0, u0, v1); put(p1, u1, v1); put(p2, u1, v0); put(p3, u0, v0); n++; };
    /* Kameraya dönük dörtgen: parçacıklar ve ejder panoları için. rot radyan, ax/ay tutma noktası (0..1). */
    R.sprite = function (tex, pos, w, h, uv, col, add, fogK, rot, ax, ay) { const r = R.right, u = R.up; ax = ax === undefined ? 0.5 : ax; ay = ay === undefined ? 0.5 : ay;
      let rx = r, ux = u; if (rot) { const c = Math.cos(rot), s = Math.sin(rot); rx = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s]; ux = [u[0] * c - r[0] * s, u[1] * c - r[1] * s, u[2] * c - r[2] * s]; }
      const l = -w * ax, rr = w * (1 - ax), b = -h * ay, t = h * (1 - ay), P = (a, d) => [pos[0] + rx[0] * a + ux[0] * d, pos[1] + rx[1] * a + ux[1] * d, pos[2] + rx[2] * a + ux[2] * d];
      R.quad(tex, P(l, b), P(rr, b), P(rr, t), P(l, t), uv[0], uv[1], uv[2], uv[3], col, add, fogK); };
    R.ground = function (mapTex, rect, g) { flush(); gl.useProgram(progG.p); uniforms(progG); gl.uniform1f(progG.u.u_screen, 0);
      gl.uniform4f(progG.u.u_mapRect, g.map[0], g.map[1], 1 / g.map[2], 1 / g.map[3]); gl.uniform3fv(progG.u.u_amb, g.amb); gl.uniform1f(progG.u.u_night, g.night); gl.uniform1f(progG.u.u_time, g.time);
      gl.uniform4fv(progG.u.u_fount, g.fount); gl.uniform4fv(progG.u.u_emb, g.emb); gl.uniform1f(progG.u.u_mode, g.mode || 0); gl.uniform2fv(progG.u.u_road, g.road || [0, 1e6]);
      const Lg = new Float32Array(64); (g.lights || []).slice(0, 16).forEach((l, i) => Lg.set(l, i * 4)); gl.uniform4fv(progG.u.u_lights, Lg); gl.uniform1i(progG.u.u_nl, Math.min(16, (g.lights || []).length));
      gl.bindTexture(gl.TEXTURE_2D, mapTex.t); gl.blendFunc(gl.ONE, gl.ZERO); const [x0, y0, x1, y1] = rect; let o = 0;
      const put = (x, y) => { buf[o++] = x; buf[o++] = y; buf[o++] = 0; buf[o++] = 0; buf[o++] = 0; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; buf[o++] = 1; };
      put(x0, y0); put(x1, y0); put(x1, y1); put(x0, y1); gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, 4 * STRIDE)); gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); R.quads++; R.flushes++;
      gl.useProgram(prog.p); uniforms(prog); curTex = null; };

    /* ---- film katmanı ---- */
    const pass = (pr, dst, w, h) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst); gl.viewport(0, 0, w, h); gl.useProgram(pr.p); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const bind = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };
    R.end = function (f) { flush(); const T = tgt;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.scene.f); gl.blitFramebuffer(0, 0, T.pw, T.ph, 0, 0, T.pw, T.ph, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.disable(gl.BLEND); gl.bindVertexArray(vaoPost);
      gl.useProgram(pBright.p); bind(0, T.scene.t); gl.uniform1i(pBright.u.u_tex, 0); gl.uniform1f(pBright.u.u_thr, f.thr === undefined ? 0.72 : f.thr); pass(pBright, T.a1.f, T.a1.w, T.a1.h);
      gl.useProgram(pBlur.p); gl.uniform1i(pBlur.u.u_tex, 0);
      const blur = (src, tmp, dst, k) => { bind(0, src.t); gl.uniform2f(pBlur.u.u_dir, k / src.w, 0); pass(pBlur, tmp.f, tmp.w, tmp.h); bind(0, tmp.t); gl.uniform2f(pBlur.u.u_dir, 0, k / tmp.h); pass(pBlur, dst.f, dst.w, dst.h); };
      blur(T.a1, T.b1, T.a1, 1.0); blur(T.a1, T.b1, T.a1, 2.0);                 // dar parlama
      bind(0, T.a1.t); gl.uniform2f(pBlur.u.u_dir, 1.5 / T.a1.w, 0); pass(pBlur, T.a2.f, T.a2.w, T.a2.h); blur(T.a2, T.b2, T.a2, 1.0); blur(T.a2, T.b2, T.a2, 2.2);   // geniş parlama
      gl.useProgram(pFilm.p); bind(0, T.scene.t); bind(1, T.a1.t); bind(2, T.a2.t); gl.uniform1i(pFilm.u.u_scene, 0); gl.uniform1i(pFilm.u.u_b1, 1); gl.uniform1i(pFilm.u.u_b2, 2);
      gl.uniform2f(pFilm.u.u_bloom, f.bloom === undefined ? 0.55 : f.bloom, f.bloom2 === undefined ? 0.7 : f.bloom2); gl.uniform4f(pFilm.u.u_grade, f.sat === undefined ? 1.08 : f.sat, f.con === undefined ? 1.06 : f.con, f.expo === undefined ? 1 : f.expo, f.vig === undefined ? 0.55 : f.vig);
      gl.uniform3fv(pFilm.u.u_tint, f.tint || [1, 1, 1]); gl.uniform4fv(pFilm.u.u_fade, f.fade || [0, 0, 0, 0]); gl.uniform1f(pFilm.u.u_bar, f.bar === undefined ? 0.128 : f.bar); gl.uniform1f(pFilm.u.u_time, f.time || 0); gl.uniform1f(pFilm.u.u_ca, f.ca === undefined ? 0.05 : f.ca);
      pass(pFilm, null, T.pw, T.ph); gl.activeTexture(gl.TEXTURE0); };
    return R;
  };
})();
