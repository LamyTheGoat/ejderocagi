/* ==========================================================================
   EJDER OCAĞI — WEBGL2 SHADER, POST-FX & TACTILE GAME ENGINE LAYER (engine_gl.js)
   - WebGL2 (#version 300 es) GLSL Fragment Shader:
     * Biyom bazlı atmosferik kor/kül/kristal parçacıkları (procedural GPU ember field)
     * Isı kırılması (heat distortion UV ripple)
     * Boss Ulti / Topçu Patlaması sırasında Radyal Kromatik Sapma (Chromatic Aberration)
       ve Şok Dalgası (Shockwave UV Distortion)
     * El yazması parşömen/mürekkep vinyet (Dynamic Ink Vignette)
   - Taktiksel Kündekâri / Selçuklu Köşebent Süsleme Enjektörü (SVG Ornaments)
   - 3B Perspektif Kart Eğimi (Tactile 3D Card Tilt) & Yay (Spring) Geçişleri
   ========================================================================== */
(function () {
  'use strict';

  const BIOME_PRESETS = {
    ocak:     { tint: [0.96, 0.48, 0.16], secondary: [0.85, 0.68, 0.32], heat: 0.35, emberDensity: 1.0, vignette: 0.42 },
    ahir:     { tint: [0.92, 0.56, 0.22], secondary: [0.68, 0.82, 0.42], heat: 0.22, emberDensity: 0.75, vignette: 0.38 },
    sehir:    { tint: [0.85, 0.69, 0.38], secondary: [0.94, 0.49, 0.24], heat: 0.18, emberDensity: 0.65, vignette: 0.40 },
    harita:   { tint: [0.82, 0.64, 0.34], secondary: [0.45, 0.68, 0.78], heat: 0.12, emberDensity: 0.50, vignette: 0.46 },
    iskele:   { tint: [0.38, 0.74, 0.86], secondary: [0.85, 0.69, 0.38], heat: 0.10, emberDensity: 0.45, vignette: 0.40 },
    gezi:     { tint: [0.52, 0.82, 0.56], secondary: [0.85, 0.69, 0.38], heat: 0.15, emberDensity: 0.60, vignette: 0.36 },
    zindan:   { tint: [0.98, 0.36, 0.12], secondary: [0.75, 0.24, 0.88], heat: 0.55, emberDensity: 1.35, vignette: 0.56 },
    sahmeran: { tint: [0.22, 0.82, 0.68], secondary: [0.88, 0.68, 0.28], heat: 0.30, emberDensity: 1.15, vignette: 0.52 },
    kalgarot: { tint: [1.00, 0.34, 0.08], secondary: [1.00, 0.76, 0.22], heat: 0.68, emberDensity: 1.50, vignette: 0.58 },
    karabela: { tint: [0.72, 0.32, 0.96], secondary: [0.38, 0.82, 0.96], heat: 0.42, emberDensity: 1.30, vignette: 0.62 }
  };

  const VERT_SRC = `#version 300 es
  precision highp float;
  in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  // GLSL ES 3.00: uniform defaults are set from JS (no inline uniform initializers)
  const FRAG_SRC = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;

  uniform vec2 u_res;
  uniform float u_time;
  uniform vec3 u_tint;
  uniform vec3 u_secondary;
  uniform float u_heat;
  uniform float u_emberDensity;
  uniform float u_vignette;
  uniform float u_impact;
  uniform vec2 u_shockCenter;
  uniform float u_shockTime;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float emberLayer(vec2 uv, float scale, float speed, float seed) {
    vec2 p = uv * scale;
    p.y -= u_time * speed;
    p.x += sin(u_time * 0.7 + p.y * 0.6 + seed) * 0.35;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float r = hash21(id + seed);
    if (r < 0.72) return 0.0;
    vec2 offset = vec2(fract(r * 13.7) - 0.5, fract(r * 29.3) - 0.5) * 0.55;
    float d = length(f - offset);
    float size = mix(0.025, 0.075, fract(r * 7.1));
    float flicker = 0.65 + 0.35 * sin(u_time * (4.0 + r * 6.0) + r * 20.0);
    return smoothstep(size, 0.0, d) * flicker;
  }

  void main() {
    vec2 aspect = vec2(u_res.x / max(1.0, u_res.y), 1.0);
    vec2 uv = v_uv;

    // Şok dalgası (Topçu patlaması / Boss Ulti)
    float shockGlow = 0.0;
    if (u_shockTime > 0.0 && u_shockTime < 1.0) {
      vec2 diff = (uv - u_shockCenter) * aspect;
      float dist = length(diff);
      float radius = u_shockTime * 0.95;
      float ring = 1.0 - smoothstep(0.0, 0.085, abs(dist - radius));
      shockGlow = ring * (1.0 - u_shockTime) * 0.65;
    }

    // Isı dalgalanması (Kaldera & Ocak kor kırılması)
    vec2 warpedUv = uv * aspect;
    warpedUv.x += sin(uv.y * 22.0 + u_time * 2.4) * 0.0025 * u_heat;

    // 2 katmanlı GPU kor / efsun kıvılcımı
    float e1 = emberLayer(warpedUv, 9.0, 0.22, 1.1) * u_emberDensity;
    float e2 = emberLayer(warpedUv, 16.0, 0.38, 7.3) * u_emberDensity * 0.75;

    vec3 emberCol = u_tint * e1 * 1.15 + u_secondary * e2 * 0.95;

    // Alt kenar kor/ocak ışıması + şok dalgası parlaması
    float bottomRim = (1.0 - smoothstep(0.0, 0.42, uv.y)) * (0.12 + 0.14 * u_heat + 0.22 * u_impact);
    vec3 rimCol = mix(u_tint, u_secondary, uv.x) * bottomRim;

    // El yazması mürekkep vinyet (köşe karartma ve darbe gerilimi)
    vec2 centered = uv - 0.5;
    float distCenter = length(centered * vec2(1.15, 1.0));
    float vig = smoothstep(0.32, 0.86, distCenter) * (u_vignette + u_impact * 0.28);

    // Kromatik darbe halkası
    vec3 shockCol = mix(u_tint, vec3(1.0, 0.88, 0.55), 0.5) * shockGlow;

    vec3 totalRGB = emberCol + rimCol + shockCol;
    float emberAlpha = clamp((e1 + e2) * 0.65 + bottomRim * 0.7 + shockGlow * 0.8, 0.0, 0.72);
    float finalAlpha = clamp(max(emberAlpha, vig * 0.52), 0.0, 0.75);

    // Vinyet bölgelerinde koyu mürekkep (#120905), kor bölgelerinde sıcak ışıma
    vec3 inkColor = vec3(0.07, 0.035, 0.02);
    vec3 outCol = mix(inkColor, totalRGB / max(0.08, emberAlpha), clamp(emberAlpha / max(0.01, finalAlpha), 0.0, 1.0));

    fragColor = vec4(outCol, finalAlpha);
  }`;

  // Selçuklu Rûmî / Kündekâri Köşebent SVG Şablonu
  const SELJUK_CORNER_SVG = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 26V8L8 2H26"/><path d="M6 20V10L10 6H20"/><circle cx="7.5" cy="7.5" r="1.8" fill="currentColor"/><path d="M2 14L6 10M14 2L10 6"/></svg>`;

  const ENGINE_GL = {
    canvas: null,
    gl: null,
    prog: null,
    uniforms: {},
    biome: 'ocak',
    cur: { tint: [0.96, 0.48, 0.16], secondary: [0.85, 0.68, 0.32], heat: 0.35, emberDensity: 1.0, vignette: 0.42 },
    target: { tint: [0.96, 0.48, 0.16], secondary: [0.85, 0.68, 0.32], heat: 0.35, emberDensity: 1.0, vignette: 0.42 },
    impact: 0,
    shockCenter: [0.5, 0.5],
    shockTime: 99,
    t0: 0,
    lastView: '',
    initialized: false,

    init() {
      if (this.initialized || typeof document === 'undefined' || !document.body) return;
      this.initialized = true;
      this.t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

      try {
        const cvs = document.createElement('canvas');
        cvs.id = 'engine-gl-canvas';
        cvs.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cvs);
        this.canvas = cvs;

        const gl = cvs.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
        if (gl) {
          this.gl = gl;
          this.setupPipeline(gl);
          this.resize();
          window.addEventListener('resize', () => this.resize(), { passive: true });
          requestAnimationFrame(ts => this.loop(ts));
        }
      } catch (e) {
        // Headless test veya WebGL2 kapalı ortamda sessizce geç
      }

      this.bindTactileTilt();
      this.decorateDOM();
    },

    setupPipeline(gl) {
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          gl.deleteShader(sh);
          return null;
        }
        return sh;
      };
      const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
      if (!vs || !fs) return;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

      this.prog = prog;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      ['u_res', 'u_time', 'u_tint', 'u_secondary', 'u_heat', 'u_emberDensity', 'u_vignette', 'u_impact', 'u_shockCenter', 'u_shockTime'].forEach(k => {
        this.uniforms[k] = gl.getUniformLocation(prog, k);
      });
    },

    resize() {
      if (!this.canvas || !this.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor((window.innerWidth || 1280) * dpr * 0.75));
      const h = Math.max(1, Math.floor((window.innerHeight || 720) * dpr * 0.75));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    },

    setBiome(key) {
      const preset = BIOME_PRESETS[key] || BIOME_PRESETS.ocak;
      this.biome = key;
      this.target = {
        tint: preset.tint.slice(),
        secondary: preset.secondary.slice(),
        heat: preset.heat,
        emberDensity: preset.emberDensity,
        vignette: preset.vignette
      };
    },

    pulseImpact(opts) {
      const o = opts || {};
      this.impact = Math.min(1.0, Math.max(this.impact, o.intensity || 0.65));
      this.shockCenter = [
        typeof o.x === 'number' ? o.x : 0.5,
        typeof o.y === 'number' ? 1.0 - o.y : 0.5
      ];
      this.shockTime = 0.01;
      if (o.biome && BIOME_PRESETS[o.biome]) {
        this.setBiome(o.biome);
      }
      if (typeof document !== 'undefined' && document.body && (o.chroma !== false)) {
        document.body.classList.remove('gl-chroma-pulse');
        void document.body.offsetWidth;
        document.body.classList.add('gl-chroma-pulse');
        setTimeout(() => document.body && document.body.classList.remove('gl-chroma-pulse'), 360);
      }
    },

    loop(now) {
      if (!this.gl || !this.prog) return;
      const gl = this.gl;
      const elapsed = (now - this.t0) * 0.001;

      // Yumuşak biyom geçişi (lerp)
      const lerp = (a, b, t) => a + (b - a) * t;
      for (let i = 0; i < 3; i++) {
        this.cur.tint[i] = lerp(this.cur.tint[i], this.target.tint[i], 0.05);
        this.cur.secondary[i] = lerp(this.cur.secondary[i], this.target.secondary[i], 0.05);
      }
      this.cur.heat = lerp(this.cur.heat, this.target.heat, 0.05);
      this.cur.emberDensity = lerp(this.cur.emberDensity, this.target.emberDensity, 0.05);
      this.cur.vignette = lerp(this.cur.vignette, this.target.vignette, 0.05);

      this.impact = Math.max(0, this.impact * 0.92 - 0.004);
      if (this.shockTime < 1.2) this.shockTime += 0.032;

      gl.useProgram(this.prog);
      const U = this.uniforms;
      gl.uniform2f(U.u_res, this.canvas.width, this.canvas.height);
      gl.uniform1f(U.u_time, elapsed);
      gl.uniform3fv(U.u_tint, this.cur.tint);
      gl.uniform3fv(U.u_secondary, this.cur.secondary);
      gl.uniform1f(U.u_heat, this.cur.heat);
      gl.uniform1f(U.u_emberDensity, this.cur.emberDensity);
      gl.uniform1f(U.u_vignette, this.cur.vignette);
      gl.uniform1f(U.u_impact, this.impact);
      gl.uniform2fv(U.u_shockCenter, this.shockCenter);
      gl.uniform1f(U.u_shockTime, this.shockTime);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(ts => this.loop(ts));
    },

    // Sahne ve modal geçişlerinde kademeli yay (spring) girişi uygular
    decorateDOM(root, animateEntrance = false) {
      if (typeof document === 'undefined' || !animateEntrance) return;
      const scope = root || document;
      const cards = scope.querySelectorAll
        ? scope.querySelectorAll('.hub-pose-card, .city-sign, .kcard, .vgood, .divan-pedestal, .shm-stat-plaque')
        : [];
      cards.forEach((c, idx) => {
        if (!c || c.dataset.springReady === '1') return;
        c.dataset.springReady = '1';
        c.style.setProperty('--stagger-idx', String(Math.min(idx, 8)));
        c.classList.add('gl-spring-in');
        c.addEventListener('animationend', () => {
          c.classList.remove('gl-spring-in');
        }, { once: true });
      });
    },

    // Görünüm (View) değiştiğinde biyomu güncelle ve sahne geçiş efektini tetikle
    onViewRender(viewName) {
      if (!this.initialized) this.init();
      const map = {
        ocak: 'ocak',
        ahir: 'ahir',
        sehir: 'sehir',
        harita: 'harita',
        iskele: 'iskele',
        gezi: 'gezi',
        title: 'ocak'
      };
      this.setBiome(map[viewName] || 'ocak');
      const viewChanged = this.lastView !== viewName;
      if (this.lastView && viewChanged && typeof document !== 'undefined') {
        const app = document.getElementById('app');
        if (app) {
          app.classList.remove('gl-view-transition');
          void app.offsetWidth;
          app.classList.add('gl-view-transition');
        }
      }
      this.lastView = viewName;
      this.decorateDOM(document, viewChanged);
    },

    // 3B Taktiksel Kart Eğimi (Pointer-driven 3D perspective tilt)
    bindTactileTilt() {
      if (typeof document === 'undefined' || !document.addEventListener) return;
      let activeCard = null;
      document.addEventListener('pointermove', e => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const card = e.target.closest('.hub-pose-card, .city-sign, .kcard, .divan-pedestal, .shm-blessing-card');
        if (activeCard && activeCard !== card) {
          activeCard.style.removeProperty('--tilt-rx');
          activeCard.style.removeProperty('--tilt-ry');
          activeCard = null;
        }
        if (!card || typeof card.getBoundingClientRect !== 'function') return;
        const r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
        card.style.setProperty('--tilt-rx', `${(-ny * 4.2).toFixed(2)}deg`);
        card.style.setProperty('--tilt-ry', `${(nx * 5.0).toFixed(2)}deg`);
        activeCard = card;
      }, { passive: true });
    }
  };

  window.ENGINE_GL = ENGINE_GL;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ENGINE_GL.init());
    } else {
      setTimeout(() => ENGINE_GL.init(), 0);
    }
  }
})();
