/* Ejder Ocağı 2.0 · Bölüm motoru
   Bir bölüm (mekân) veridir: js/bolumler/<ad>.js dosyası EO2.bolum.tanimla({ … }) çağırır; motor sahneyi, kamerayı, zemini, nesneleri,
   ışığı, çarpışmayı ve sahne editörünü kurar. Bölüm dosyası motor koduna dokunmaz; motor da bölümün içeriğine karışmaz.
   Sözleşme ve alan alan açıklama: docs/BOLUM_SOZLESMESI.md. Çalışan örnek: js/bolumler/merkez-meydan.js.
   Yükleme: js/bolumler/liste.js içindeki EO2.bolumListe sırayla yüklenir (bu dosyanın sonu).

   KAMERA
   Her bölümün kamerası bir referans görselden ölçülen sayılarla tanımlanır (V.referans; verilmezse master'ın ölçüsü):
     en, boy: referans görselin pikseli · ufuk: ufuk çizgisinin y'si · hp: H / cos θ · odak: odak uzaklığı (piksel) ·
     oyuncu: oyuncunun ayak pikseli · kisiBoy: oyuncunun piksel boyu (karakter dünyada 1,7 birimdir).
   Master'da: ufuk 20, hp 5,41, odak 1780 → eğim 14,2°, yükseklik 5,25, oyuncuya uzaklık 13,2, dikey görüş açısı ≈ 30°.
   Alçak ve uzak kamera: dik yüzeyler boylarının %97'si, yatay yüzeyler derinliklerinin %24'ü kadar görünür.
   PX(x, y): referans görseldeki bir zemin pikselini dünya konumuna çevirir. OLC(y): o tabanda piksel / birim.

   NESNE
   Her nesne tek bir 2D çizimdir ve dik durur. Sıra anahtarı ve ölçüler her karede düzenden okunur; editör bir şeyi değiştirince hemen görünür.
   - çizim seti (V.setler): aynı düzeni başka bir çizim takımıyla gösterir (nesne adı → [çizim, en çarpanı]; çizim null ise nesne çizilmez).
   - açı ailesi (V.aileler): aynı nesnenin birkaç yönden çizimi; nesnenin aci alanı en yakın çizimi seçer, eksi açılarda çizim aynalanır.
     Aile ışıksız çizilir; ışığı motor verir. bagla açıksa nesne zemine bağlanır: koyu ve zemine doğru kararan ton, altında keskin elips
     gölge, ayakların yere bastığı noktalarda çakıl ve ot (yerleri çizimin kendisinden bulunur).
   - ışıksız eş (V.isiksiz): ışığı içine boyanmış çizimin ışıksız karşılığı; editörden açılır. Motor ortam ışığı, çizimden çıkarılan ışıma
     katmanı ve silüetten yumuşak yer gölgesi ekler.
   - çapraz derinlik (yon): çizim dikey dilimlere bölünür, her dilim kendi derinliğinde durur; uzak ucu gerçekten uzaktadır.

   ZEMİN
   Bir merkezin çevresinde eğri sıralar hâlinde tuğla döşeme kodla boyanır (V.zemin: merkez, tuğla tonları, derz, ölçüler). Nesne gölgeleri
   ve ışık havuzları aynı resme işlenir ve yere yatay serilir. */
(function () {
  'use strict';
  const EO2 = window.EO2, D = EO2.sceneDefs = EO2.sceneDefs || {}, B = EO2.bolum = { hepsi: {} };
  const REF0 = { en: 1672, boy: 941, ufuk: 20, hp: 5.41, odak: 1780, oyuncu: [815, 705], kisiBoy: 215 };
  const ZEMIN0 = { merkez: [600, 605], tugla: [['#f6c8ae', 13], ['#f3cdc4', 10], ['#eeb89c', 8], ['#e6b0b4', 15], ['#dba6a8', 13], ['#cf9fb0', 12], ['#b98aa2', 10], ['#b094b8', 9], ['#9c84a6', 5], ['#c88570', 3], ['#e0a07e', 4]],
    derz: '#5f4a70', en: 0.37, boy: 0.39, ara: 0.03, yumusat: 0.42, alanlar: [[-16, 2, 20, 26, 88, 11], [-30, 26, 34, 58, 30, 23]] };   // alan: x0, y0, x1, y1 (dünya), piksel/birim, tohum
  const r3 = v => Math.round(v * 1000) / 1000, RADYAN = Math.PI / 180, BIRR = [1, 1, 1, 1], PAY = 0.14, DILIM = 8;
  const GOLGE = [-0.42, -1.0, 0.9, 2.0];   // silüet gölgesinin yönü (x, y), boy oranı ve en çok boyu (birim). Kamera alçak olduğu için gölge kameraya doğru uzamazsa yerde ince bir çizgi kalır.
  const TON0 = [[0, 0.14, 0.66], [0.14, 0.34, 0.76], [0.34, 1, 0.86]];   // bağlı nesnenin ton kuşakları: [alt, üst (boy oranı), ton]
  const rng = t => () => { t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const koyu = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
  const pad3 = a => String(a).padStart(3, '0');

  /* çakıl ve ot çizimleri (bağlı nesnelerin dibi): koyu erik çizgili, iki tonlu */
  function dipDokular(R0) { const yap = (w, h, ciz) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineJoin = 'round'; x.lineCap = 'round'; ciz(x, w, h); return { t: R0.texture(c), oran: h / w }; };
    const tas = (x, cx, cy, rx, ry, renk) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 6.3); x.fillStyle = renk; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3d2c44'; x.stroke(); x.beginPath(); x.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.45, ry * 0.3, 0, 0, 6.3); x.fillStyle = 'rgba(255,245,235,.35)'; x.fill(); };
    const ot = (x, cx, by, boy, egim, renk) => { x.beginPath(); x.moveTo(cx - 5, by); x.quadraticCurveTo(cx + egim * 0.5, by - boy * 0.6, cx + egim, by - boy); x.quadraticCurveTo(cx + egim * 0.4 + 4, by - boy * 0.5, cx + 5, by); x.closePath(); x.fillStyle = renk; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#2f3d2a'; x.stroke(); };
    return [
      yap(120, 56, (x, w, h) => { tas(x, 34, h - 16, 26, 13, '#b79aa6'); tas(x, 78, h - 13, 20, 10, '#cdb0ad'); tas(x, 100, h - 9, 12, 6, '#a58a9c'); }),
      yap(110, 84, (x, w, h) => { ot(x, 30, h - 2, 52, -14, '#5f9a44'); ot(x, 48, h - 2, 74, 4, '#7dbb52'); ot(x, 66, h - 2, 58, 16, '#5f9a44'); ot(x, 82, h - 2, 40, 22, '#86c25a'); ot(x, 16, h - 2, 34, -16, '#86c25a'); }),
      yap(130, 70, (x, w, h) => { ot(x, 88, h - 4, 50, 10, '#6aa64a'); ot(x, 104, h - 4, 36, 18, '#86c25a'); ot(x, 74, h - 4, 40, -8, '#5f9a44'); tas(x, 36, h - 14, 24, 12, '#c2a5ab'); tas(x, 66, h - 9, 13, 7, '#a58a9c'); }),
    ]; }

  let stilVar = false;
  function editorStili() { if (stilVar) return; stilVar = true; const st = document.createElement('style');
    st.textContent = '.mEd{position:absolute;inset:0;z-index:40;cursor:crosshair;touch-action:none}.mEdCer{position:absolute;border:2px solid #ffd76a;box-shadow:0 0 0 1px #2a1c3a,0 0 14px rgba(255,215,106,.6);border-radius:4px;pointer-events:none}' +
      '.mEdPanel{position:absolute;right:12px;top:64px;bottom:12px;width:268px;z-index:41;overflow:auto;padding:12px;border-radius:14px;background:rgba(22,18,40,.92);border:1px solid rgba(232,196,120,.5);color:#f3e9d8;font:13px/1.35 system-ui,sans-serif}' +
      '.mEdPanel .me-bas{display:block;font-size:15px;color:#ffd98a;margin-bottom:8px}.mEdPanel .me-alt{display:block;margin:12px 0 6px;color:#ffd98a}.mEdPanel i{display:block;font-style:normal;color:#9fd8ff;margin-bottom:6px}.mEdPanel .me-bos{margin:0;color:#cfc3dc}' +
      '.mEdPanel label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0}.mEdPanel input[type=number],.mEdPanel select{width:118px;padding:5px 6px;border-radius:7px;border:1px solid #6b5a86;background:#231b3c;color:#fff;font:inherit}' +
      '.mEdPanel .me-dug{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}.mEdPanel button,.mEdPanel .me-dosya{min-height:34px;padding:6px 9px;border-radius:8px;border:1px solid #8a76a8;background:#33285a;color:#fff;font:inherit;cursor:pointer;justify-content:center}.mEdPanel button:hover,.mEdPanel .me-dosya:hover{background:#45377a}.mEdPanel button:focus-visible{outline:2px solid #ffd76a}' +
      '.mEdPanel .me-dosya input{display:none}.mEdPanel input[type=range]{flex:1;min-width:90px}.mEdPanel .me-palet{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.mEdPanel .me-palet button{padding:3px;height:56px;background:#2a2148}.mEdPanel .me-palet img{width:100%;height:100%;object-fit:contain}';
    document.head.appendChild(st); }

  B.tanimla = function (V) {
    const id = V.id, depo = 'eo2.' + id, klasor = V.klasor || 'assets/dunya/an/';
    const s = { kilavuz: 0, deneme: 0, set: V.setler ? 1 : 0 };
    try { Object.assign(s, JSON.parse(localStorage.getItem(depo) || '{}')); } catch (e) { /* gizli pencere */ }
    const kaydet = () => { try { localStorage.setItem(depo, JSON.stringify(s)); } catch (e) { /* gizli pencere */ } };

    /* ---------- kamera ---------- */
    const REF = Object.assign({}, REF0, V.referans || {}), MW = REF.en, MH = REF.boy, UFUK = REF.ufuk, HP = REF.hp, ODAK = REF.odak;
    const TH = Math.atan((MH / 2 - UFUK) / ODAK), CT = Math.cos(TH), ST = Math.sin(TH), KH = HP * CT, OLC0 = REF.kisiBoy / 1.7, Z0 = ODAK / OLC0, D0 = (Z0 - KH * ST) / CT, PY = V.oyuncuY === undefined ? 10 : V.oyuncuY;
    const CX = -(REF.oyuncu[0] - MW / 2) / ((REF.oyuncu[1] - UFUK) / HP), kamAd = 'bolum-' + id;
    if (EO2.CAM) EO2.CAM[kamAd] = { th: TH, H: KH, D: D0, feet: REF.oyuncu[1] / MH, kisi: REF.kisiBoy / MH };
    const OLC = y => (y - UFUK) / HP;
    const PX = (x, y) => { const Z = ODAK / OLC(y), d = (Z - KH * ST) / CT; return [(x - MW / 2) / OLC(y) + CX, PY + d - D0]; };
    const kisi = (x, y) => { const w = PX(x, y); return { x: w[0], y: w[1] }; };

    /* ---------- veri ---------- */
    const NESNE = V.nesneler || [], ISIK = V.isiklar || [], NOKTA = V.noktalar || [], AILE = V.aileler || {}, SET2 = V.setler ? V.setler.esle || {} : {}, ISIKSIZ = V.isiksiz || {}, GOLGESIZ = V.golgesiz || [];
    const ZM = Object.assign({}, ZEMIN0, V.zemin || {}), MERKEZ = PX(ZM.merkez[0], ZM.merkez[1]);
    /* gölge kütleleri (V.golgeler): [x, y, rx, ry, şiddet, açı]; merkez referans pikseli, yarıçaplar birim. Zemine işlenir; içindeki kişi ve nesne koyulaşır.
       ortam tonu (V.isik.ton): [r, g, b] çarpanı; zemine, kişilere ve bütün nesnelere uygulanır (akşam için). Işık havuzları tonun üstünde kalır.
       yön okları (V.oklar): [x0, y0, x1, y1, boy çarpanı, aralık]; referans pikseli; yol boyunca akan mavi işaretler. */
    const KUTLE = (V.golgeler || []).map(q => { const w = PX(q[0], q[1]); return { x: w[0], y: w[1], rx: q[2], ry: q[3], s: q[4] === undefined ? 1 : q[4], aci: q[5] || 0 }; });
    const kutleAt = (X, Y) => { let k = 1; for (const q of KUTLE) { const c = Math.cos(q.aci * RADYAN), sn = Math.sin(q.aci * RADYAN), dx = X - q.x, dy = Y - q.y, u = (dx * c + dy * sn) / q.rx, v = (-dx * sn + dy * c) / q.ry, d = Math.sqrt(u * u + v * v); if (d < 1) k = Math.min(k, 1 - 0.42 * q.s * Math.min(1, (1 - d) / 0.3)); } return k; };
    const TON = V.isik && V.isik.ton ? V.isik.ton : null;
    const OKLAR = (V.oklar || []).map(q => { const a = PX(q[0], q[1]), b = PX(q[2], q[3]), len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { ax: a[0], ay: a[1], dx: (b[0] - a[0]) / len, dy: (b[1] - a[1]) / len, len, n: Math.max(1, Math.round(len / (q[5] || 1.5))), b: q[4] || 1 }; });
    const TOPLAM = ZM.tugla.reduce((a, q) => a + q[1], 0);
    const ton = r => { let v = r() * TOPLAM; for (const q of ZM.tugla) { v -= q[1]; if (v <= 0) return q[0]; } return ZM.tugla[0][0]; };
    const ORT = (() => { const a = [0, 0, 0]; for (const q of ZM.tugla) { const n = parseInt(q[0].slice(1), 16); a[0] += (n >> 16) * q[1]; a[1] += ((n >> 8) & 255) * q[1]; a[2] += (n & 255) * q[1]; } return a.map(v => v / TOPLAM); })();
    const orta = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (ORT[i] - v) * k)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

    /* ---------- düzen: sahnedeki nesnelerin dünya ölçüleriyle listesi ----------
       Öncelik: tarayıcıda kayıtlı düzen (editörde "Kaydet") → dışa aktarılmış düzen (EO2.bolumDuzen[id]) → V.nesneler'den hesaplanan varsayılan.
       Her nesne: ad (çizim), x, y (taban ortası), w (en), ayna, key (sıra kayması), z (yerden yükseklik), carp (çarpışma yarıçapı), cy, yon, aci. */
    const varsayilan = () => NESNE.map(q => { if (!Array.isArray(q)) return Object.assign({ ayna: 0, key: 0, z: 0, carp: 0, cy: 0 }, q); const o = q[4] || {}, w = PX(q[1], q[2]); const n = { ad: q[0], x: r3(w[0]), y: r3(w[1]), w: r3(q[3] / OLC(q[2])), ayna: o.ayna ? 1 : 0, key: o.key || 0, z: o.z || 0, carp: o.carp || 0, cy: o.cy || 0 }; if (o.yon) n.yon = o.yon; if (o.aci !== undefined) n.aci = o.aci; return n; });
    const aktarilan = () => { const a = (EO2.bolumDuzen && EO2.bolumDuzen[id]) || (id === 'master' ? EO2.masterDuzen : null); return Array.isArray(a) ? a.map(o => Object.assign({}, o)) : null; };
    let DUZEN = null; try { DUZEN = JSON.parse(localStorage.getItem(depo + '.duzen') || 'null'); } catch (e) { /* gizli pencere */ }
    if (!Array.isArray(DUZEN)) DUZEN = aktarilan() || varsayilan();
    const carp = [];
    function carpKur() { carp.length = 0; for (const o of DUZEN) if (!o.sil && o.carp) carp.push([o.x, o.y + (o.cy || 0), o.carp]);
      for (const q of ((V.engeller || {}).cizgi || [])) { const a = PX(q[0], q[1]), b = PX(q[2], q[3]), n = q[4] || 8; for (let i = 0; i <= n; i++) carp.push([a[0] + (b[0] - a[0]) * i / n + (q[5] || 0), a[1] + (b[1] - a[1]) * i / n + (q[6] || 0), q[7] || 1]); } }   // çizgi: iki referans pikseli arasına dizilen daireler [ax, ay, bx, by, adet, x kayması, y kayması, yarıçap]
    carpKur();
    const L = { id, name: V.ad || id, sub: V.altAd || '', zemin: ['tas5', 'cim', 2.3, 7], sadeHalka: true, flyer: false, petals: V.yaprak !== false,
      bounds: [-9, 15, 3.5, 40], mapRect: [-40, -12, 80, 80], paved: [[-40, -12, 40, 68]], start: { x: 0, y: PY, dir: 'down' }, entry: {}, signs: [], interact: [],
      lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [], rects: [], lights: ISIK.map(q => { const w = PX(q[0], q[1]); return [w[0], w[1], q[2] * 1.3, q[3]]; }), embers: [], shadows: [],
      mini: { paved: [[-9, 3, 15, 34]], blocks: [], bg: '#c9b3bd' }, npcs: [] };
    if (V.yer) Object.assign(L, V.yer({ PX, OLC, PY, kisi }));
    if (TON && !(L.light && L.light.amb)) L.light = Object.assign({}, L.light || {}, { amb: TON });
    if (KUTLE.length) L.golgeKat = kutleAt;
    /* mini harita: bölüm kendi haritasını vermediyse büyük nesneler (eni 2,4 birimden geniş) blok olarak çizilir; boş bej daire kalmaz */
    if (!L.mini || !(L.mini.blocks || []).length) L.mini = Object.assign({}, L.mini, { blocks: (DUZEN || []).filter(o => !o.sil && !o.z && o.w >= 2.4).map(o => [o.x - o.w / 2, o.y, o.x + o.w / 2, o.y + Math.min(4, o.w * 0.55)]) });
    L.circles = carp;

    /* ---------- çizimler ---------- */
    const ic = { R0: null, K: null, dokular: {}, yenile: null, fx: null, dip: null, elips: null, golgeUv: null };
    const ad3 = (A, a) => A.onek + pad3(a);
    const adlar = (() => { const k = new Set(); for (const q of NESNE) k.add(Array.isArray(q) ? q[0] : q.ad); for (const o of DUZEN) k.add(o.ad); for (const v of Object.values(SET2)) if (v[0]) k.add(v[0]); for (const v of Object.values(ISIKSIZ)) k.add(v);
      for (const A of Object.values(AILE)) for (const a of A.acilar) k.add(ad3(A, a)); for (const a of (V.cizimler || [])) k.add(a); for (const q of (V.onPlan || [])) k.add(q[0]); if (V.tavan && V.tavan.ad) k.add(V.tavan.ad);
      for (const a of Object.keys(AILE)) k.delete(a); return [...k]; })();   // aile adı (ör. ms-bank) çizim değildir; yerine açı çizimleri yüklenir
    /* zemine serilen resimler (V.zemin.resimler): [ad, x0, y0, x1, y1] dünya dikdörtgeni; resmin altı yakın, üstü uzak kenardır.
       Döşemeyle birlikte boyanır: nesne gölge lekeleri ve ışık havuzları üstüne düşer. Palette görünmez. api.zeminResim(0) ile kapatılır (kıyas için). */
    const ZRES = (ZM.resimler || []).slice(), ekle = a => a.length && EO2.doku && EO2.doku.ekle ? EO2.doku.ekle(a, klasor) : Promise.resolve([]);
    /* çizimler ilk istendiğinde yüklenir: sahneye girilirken (EO2.sahneYukle) ya da sahne kurulurken. Başlangıç sahnesi (master) hemen yükler. */
    let yukP = null; const yukleCiz = () => yukP || (yukP = Promise.all([ekle(adlar), ekle(ZRES.map(q => q[0]))]));
    if (id === 'master') yukleCiz();
    const dokuOf = ad => { const t = ic.dokular[ad]; if (t) return t; const im = ad && ic.K && ic.K.im[ad]; if (!im || !ic.R0) return null; return ic.dokular[ad] = Object.assign(ic.R0.texture(im), { oran: im.naturalHeight / im.naturalWidth, gen: im.naturalWidth }); };
    /* ışıma ve gölge dokuları çizimin kendisinden üretilir:
         ışıma (p): çok parlak kehribar (fener camı, pencere) ve çok parlak camgöbeği (su) pikselleri ayrılır, bulanıklaştırılır; toplamalı çizilir.
                    Kiremit turuncusu eşiğin altında kalır (yeşil bileşeni 186'dan küçük); eşik gevşetilirse bütün çatı parlar.
         gölge (g): silüet bulanıklaştırılır ve mora boyanır. İkisinde de çevreye pay bırakılır (PAY), yoksa bulanıklık dikdörtgende kesilir. */
    const ekDoku = (ad, tur) => { const k = ad + '#' + tur; if (k in ic.dokular) return ic.dokular[k]; const im = ic.K && ic.K.im[ad]; if (!im || !ic.R0) return null;
      const ol = Math.min(1, (tur === 'p' ? 460 : 300) / im.naturalWidth), w = Math.max(8, Math.round(im.naturalWidth * ol)), hh = Math.max(8, Math.round(im.naturalHeight * ol)), px = Math.round(w * PAY), py = Math.round(hh * PAY);
      const c = document.createElement('canvas'); c.width = w + px * 2; c.height = hh + py * 2; const x = c.getContext('2d');
      if (tur === 'g') { x.filter = 'blur(' + Math.max(2, Math.round(w * 0.018)) + 'px)'; x.drawImage(im, px, py, w, hh); x.filter = 'none'; x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(52,34,78)'; x.fillRect(0, 0, c.width, c.height); }
      else { const g = document.createElement('canvas'); g.width = w; g.height = hh; const gx = g.getContext('2d', { willReadFrequently: true }); gx.drawImage(im, 0, 0, w, hh); const idt = gx.getImageData(0, 0, w, hh), d = idt.data; let say = 0;
        for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], a = d[i + 3], kehribar = a > 200 && r > 232 && gg > 186 && b < 170 && r - b > 78, su = a > 200 && b > 225 && gg > 195 && r < 150 && b - r > 80;
          if (kehribar) { d[i] = 255; d[i + 1] = Math.min(255, gg + 8); d[i + 2] = Math.round(b * 0.7); d[i + 3] = 255; say++; } else if (su) { d[i] = Math.round(r * 0.5); d[i + 1] = Math.round(gg * 0.9); d[i + 2] = 255; d[i + 3] = 90; say++; } else d[i + 3] = 0; }
        if (!say) return ic.dokular[k] = null; gx.putImageData(idt, 0, 0);
        x.globalCompositeOperation = 'lighter'; x.filter = 'blur(' + Math.max(6, Math.round(w * 0.045)) + 'px)'; x.globalAlpha = 0.95; x.drawImage(g, px, py); x.filter = 'blur(' + Math.max(2, Math.round(w * 0.012)) + 'px)'; x.globalAlpha = 0.6; x.drawImage(g, px, py); x.filter = 'none'; }
      return ic.dokular[k] = ic.R0.texture(c); };
    /* ayakOf: çizimde tabana inen her ayağın yeri [u (soldan oran), v (üstten oran: ayağın en alt pikseli)]. Her sütunun en alttaki dolu
       pikseline bakılır; komşu sütunlarla aynı hizada kalan öbekler ayaktır. Tabana yakın olmayanlar (oturağın altı) atılır. */
    const ayakOf = ad => { const k = ad + '#a'; if (k in ic.dokular) return ic.dokular[k]; const im = ic.K && ic.K.im[ad]; if (!im) return null;
      const W = Math.min(260, im.naturalWidth), H = Math.round(W * im.naturalHeight / im.naturalWidth), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data, p = new Int32Array(W).fill(-1), ayak = []; for (let xx = 0; xx < W; xx++) for (let y = H - 1; y >= H * 0.55; y--) if (d[(y * W + xx) * 4 + 3] > 120) { p[xx] = y; break; }
      let b = -1; for (let xx = 0; xx <= W; xx++) { const surer = xx < W && p[xx] >= 0 && b >= 0 && Math.abs(p[xx] - p[xx - 1]) <= H * 0.03; if (surer) continue;
        if (b >= 0 && xx - b > W * 0.025) { let m = 0; for (let j = b; j < xx; j++) m = Math.max(m, p[j]); if ((m + 1) / H >= 0.86) ayak.push([(b + xx) / 2 / W, (m + 1) / H]); } b = xx < W && p[xx] >= 0 ? xx : -1; }
      return ic.dokular[k] = ayak; };

    /* ---------- nesnenin çizimi, eni, aynası ---------- */
    const aile = o => { const A = AILE[o.ad]; return A && dokuOf(ad3(A, A.acilar[0])) ? A : null; };
    const aciOf = o => { const A = AILE[o.ad], v = (A && A.varsayilan) || 30; return o.aci !== undefined ? o.aci : (o.ayna ? -v : v); };
    const aileSec = (o, A) => { const a = ((aciOf(o) + 180) % 360 + 360) % 360 - 180, m = Math.abs(a); let en = A.acilar[0]; for (const q of A.acilar) if (dokuOf(ad3(A, q)) && Math.abs(q - m) < Math.abs(en - m)) en = q; return { ad: ad3(A, en), ayna: a < 0 && en !== 0 && en !== 180 }; };
    const set2 = o => s.set && SET2[o.ad] ? SET2[o.ad] : null;
    const cizimAd = o => { const A = aile(o); if (A) return aileSec(o, A).ad; const q = set2(o); if (q) return q[0] || ''; return s.deneme && ISIKSIZ[o.ad] && ic.K && ic.K.im[ISIKSIZ[o.ad]] ? ISIKSIZ[o.ad] : o.ad; };
    const aynaOf = o => { const A = aile(o); return A ? aileSec(o, A).ayna : !!o.ayna; };
    const enOf = o => { const A = aile(o); if (A) { const t = dokuOf(cizimAd(o)), t0 = dokuOf(ad3(A, A.acilar[0])); return t && t0 ? o.w * t.gen / t0.gen : o.w; } const q = set2(o); return q ? o.w * q[1] : o.w; };
    const boyOf = o => { const t = dokuOf(cizimAd(o)); return t ? enOf(o) * t.oran : enOf(o); };
    const motorlu = o => !!o.gs || !!aile(o) || (!set2(o) && cizimAd(o) !== o.ad);            // ışığını motorun verdiği nesne
    const bagli = o => { const A = aile(o); return !!(A && A.bagla) || !!o.bagla; };          // zemine bağlanan nesne
    const yonOf = o => o.yon || 0;
    const buyuk = o => enOf(o) > 5;   // büyük yapı gölge kütlesinden etkilenmez: tabanı kütlenin içinde kalsa da bütünüyle kararmasın
    const hazirRenk = (F, o) => (TON || KUTLE.length) && F.lit ? F.lit(o.x, o.y - 0.3, 1, buyuk(o)) : BIRR;   // ışığı içine boyanmış çizim: yalnız ortam tonu ve gölge kütlesi
    const isikRenk = (F, o) => { const c = F.lit ? F.lit(o.x, o.y - 0.3, 1, buyuk(o)) : BIRR; return [Math.min(1.08, c[0] * 1.06), Math.min(1.08, c[1] * 1.06), Math.min(1.08, c[2] * 1.06), 1]; };

    /* öndeki yüksek yapı: tabanı oyuncudan güneyde (kameraya yakın) kalıp oyuncuyu örtüyorsa saydamlaşır; eski sahnelerdeki örtü sınamasının (F.coverTest) karşılığı.
       Çapraz nesnede taban, oyuncunun hizasındaki noktadan alınır. Nesnede `ort: false` verilirse kapanır. Durum nesnenin dışında tutulur: düzen kaydına karışmaz. */
    const ORTU = new WeakMap();
    const ortu = (F, o, w, hh) => { const tepe = (o.z || 0) + hh; if (o.ort === false || o.tavan || tepe < 2.2 || !F.coverTest || ED.acik) return 1; let q = ORTU.get(o); if (!q) ORTU.set(o, q = { a: 1, t: -1 });
      if (q.t !== F.time) { q.t = F.time; const p = EO2.api.player, u = p ? Math.max(-0.5, Math.min(0.5, (p.x - o.x) / w)) : 0, yb =o.y + yonOf(o) * u, onde = !!p && yb + (o.key || 0) < p.y - 0.15;
        q.a += ((onde && F.coverTest({ x: o.x, y: yb, w, h: tepe, alt: o.z || 0 }) ? 0.2 : 1) - q.a) * Math.min(1, F.dt * 8); }
      return q.a; };

    const nesneItler = o => { const N = DILIM, liste = [];
      for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N;
        liste.push({ o, get key() { return o.y + yonOf(o) * ((u0 + u1) / 2 - 0.5) + (o.key || 0); }, draw(R, F) { if (o.sil || (o.tavan && F.camH > (o.z || 0))) return; const t = dokuOf(cizimAd(o)); if (!t) return;
          const w = enOf(o), yo = yonOf(o), xa = o.x - w / 2 + w * u0, xb = o.x - w / 2 + w * u1, ya = o.y + yo * (u0 - 0.5), yb = o.y + yo * (u1 - 0.5), z0 = o.z || 0, hh = w * t.oran, ay = aynaOf(o), uA = ay ? 1 - u0 : u0, uB = ay ? 1 - u1 : u1, A = aile(o), sa = ortu(F, o, w, hh);
          if (A && A.bagla) { const c = isikRenk(F, o); for (const [a, b, m] of (A.ton || TON0)) R.quad(t, [xa, ya, z0 + hh * a], [xb, yb, z0 + hh * a], [xb, yb, z0 + hh * b], [xa, ya, z0 + hh * b], uA, 1 - b, uB, 1 - a, [c[0] * m, c[1] * m * 0.97, c[2] * m, sa], false, 1); return; }
          const c = motorlu(o) ? isikRenk(F, o) : hazirRenk(F, o);
          R.quad(t, [xa, ya, z0], [xb, yb, z0], [xb, yb, z0 + hh], [xa, ya, z0 + hh], uA, 0, uB, 1, sa < 0.995 ? [c[0], c[1], c[2], sa] : c, false, 1); } }); }
      /* bağlı nesnenin dibi: her ayağın dibine, ayağın altını hafifçe örtecek biçimde bir çakıl öbeği ve bir ot tutamı */
      liste.push({ o, get key() { return o.y + (o.key || 0) - 0.02; }, draw(R, F) { if (o.sil || !bagli(o) || !ic.dip) return; const ad = cizimAd(o), Ay = ayakOf(ad), t = dokuOf(ad); if (!Ay || !Ay.length || !t) return;
        const w = enOf(o), hh = w * t.oran, ay = aynaOf(o), c = F.lit ? F.lit(o.x, o.y - 0.3, 1) : BIRR, cc = [c[0] * 0.92, c[1] * 0.92, c[2] * 0.92, 1], t0 = Math.abs(Math.round(o.x * 7 + o.y * 13));
        Ay.forEach((q, i) => { const fx = o.x - w / 2 + w * (ay ? 1 - q[0] : q[0]), fz = hh * (1 - q[1]) - 0.015, yon = (i + t0) % 2 ? 1 : -1;
          for (const [dx, tur, en] of [[-0.1 * yon, 0, 0.36], [0.12 * yon, 1 + (t0 + i) % 2, 0.3]]) { const d = ic.dip[tur], dh = en * d.oran, x = fx + dx, ters = (t0 + i + tur) % 2;
            R.quad(d.t, [x - en / 2, o.y - 0.01, fz], [x + en / 2, o.y - 0.01, fz], [x + en / 2, o.y - 0.01, fz + dh], [x - en / 2, o.y - 0.01, fz + dh], ters ? 1 : 0, 0, ters ? 0 : 1, 1, cc, false, 1); } }); } });
      /* ışıma katmanı: ışıksız eşlerde, nesnenin önünde, toplamalı */
      liste.push({ o, get key() { return o.y - Math.abs(yonOf(o)) / 2 + (o.key || 0) - 0.003; }, draw(R, F) { if (o.sil || !motorlu(o) || aile(o) || (o.tavan && F.camH > (o.z || 0))) return; const ad = cizimAd(o), t = dokuOf(ad), g = ekDoku(ad, 'p'); if (!t || !g) return;
        const w = enOf(o), hh = w * t.oran, yo = yonOf(o), pw = w * PAY, ph = hh * PAY, z0 = (o.z || 0), xa = o.x - w / 2 - pw, xb = o.x + w / 2 + pw, ya = o.y - yo * (0.5 + PAY) - 0.03, yb = o.y + yo * (0.5 + PAY) - 0.03, k = (0.62 + 0.04 * Math.sin(F.time * 2.6 + o.x) + 0.45 * (F.night || 0)) * ortu(F, o, w, hh), ay = aynaOf(o);
        R.quad(g, [xa, ya, z0 - ph], [xb, yb, z0 - ph], [xb, yb, z0 + hh + ph], [xa, ya, z0 + hh + ph], ay ? 1 : 0, 0, ay ? 0 : 1, 1, [k, k, k, 1], true); } });
      return liste; };

    /* ---------- zemin boyama: x0..x1, y0..y1 dünya dikdörtgeni, ppm piksel/birim; tuvalin altı yakın, üstü uzak ---------- */
    function zeminCiz(x0, y0, x1, y1, ppm, tohum) {
      const W = Math.round((x1 - x0) * ppm), H = Math.round((y1 - y0) * ppm), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rng(tohum);
      const cx = X => (X - x0) * ppm, cy = Y => (y1 - Y) * ppm;
      x.fillStyle = ZM.derz; x.fillRect(0, 0, W, H); x.lineJoin = 'round';
      const EN = ZM.en, BOY = ZM.boy, ARA = ZM.ara, uzak = Math.hypot(Math.max(Math.abs(x0 - MERKEZ[0]), Math.abs(x1 - MERKEZ[0])), Math.max(Math.abs(y0 - MERKEZ[1]), Math.abs(y1 - MERKEZ[1])));
      for (let k = 1; k * EN < uzak + EN; k++) { const r0 = k * EN + ARA, r1 = (k + 1) * EN - ARA, n = Math.max(6, Math.round(2 * Math.PI * (r0 + r1) / 2 / BOY)), da = 2 * Math.PI / n, kay = r() * da, ga = ARA / ((r0 + r1) / 2);
        for (let i = 0; i < n; i++) { const a0 = kay + i * da + ga, a1 = kay + (i + 1) * da - ga, am = (a0 + a1) / 2, mx = MERKEZ[0] + Math.cos(am) * (r0 + r1) / 2, my = MERKEZ[1] + Math.sin(am) * (r0 + r1) / 2;
          if (mx < x0 - 0.5 || mx > x1 + 0.5 || my < y0 - 0.5 || my > y1 + 0.5) { r(); r(); continue; }
          const renk = orta(ton(r), ZM.yumusat), j = (r() - 0.5) * 0.018, p = (rr, a) => [cx(MERKEZ[0] + Math.cos(a) * rr), cy(MERKEZ[1] + Math.sin(a) * rr)], q = [p(r0 + j, a0), p(r0 - j, a1), p(r1 + j, a1), p(r1 - j, a0)];
          x.beginPath(); x.moveTo(q[0][0], q[0][1]); for (let t = 1; t < 4; t++) x.lineTo(q[t][0], q[t][1]); x.closePath(); x.fillStyle = renk; x.fill();
          /* cel gölge: uzak kenarda açık, yakın kenarda koyu çizgi (ışık yukarıdan-arkadan) */
          x.lineWidth = Math.max(1.5, ppm * 0.022); x.strokeStyle = koyu(renk, 0.86); x.stroke();
          const ust = my > MERKEZ[1] ? [q[2], q[3]] : [q[0], q[1]], alt = my > MERKEZ[1] ? [q[0], q[1]] : [q[2], q[3]];
          x.lineWidth = Math.max(1, ppm * 0.016); x.strokeStyle = koyu(renk, 1.1); x.beginPath(); x.moveTo(ust[0][0], ust[0][1] + ppm * 0.02); x.lineTo(ust[1][0], ust[1][1] + ppm * 0.02); x.stroke();
          x.strokeStyle = koyu(renk, 0.78); x.beginPath(); x.moveTo(alt[0][0], alt[0][1] - ppm * 0.02); x.lineTo(alt[1][0], alt[1][1] - ppm * 0.02); x.stroke(); } }
      for (let i = 0; i < W * H / 5200; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,240,225,.2)' : 'rgba(90,60,100,.14)'; const s2 = 1 + r() * ppm * 0.03; x.fillRect(r() * W, r() * H, s2, s2); }   // benek: düz renk yığınını kırar
      /* zemine serilen çizimler (zemin.resimler): döşemenin üstüne, gölge ve ışık lekelerinin altına boyanır */
      if (s.zeminResim !== 0) for (const q of ZRES) { const im = ic.K && ic.K.im[q[0]]; if (im) x.drawImage(im, cx(q[1]), cy(q[4]), (q[3] - q[1]) * ppm, (q[4] - q[2]) * ppm); }
      /* nesnelerin yere düşen yumuşak gölgesi (mor) ve ışıkların sıcak havuzu zemine işlenir */
      const leke = (X, Y, rx, ry, renk, kip) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, renk); g.addColorStop(0.6, renk.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.55) + ')')); g.addColorStop(1, renk.replace(/[\d.]+\)$/, '0)'));
        x.save(); x.globalCompositeOperation = kip; x.translate(cx(X), cy(Y)); x.scale(rx * ppm, ry * ppm); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.fill(); x.restore(); };
      for (const o of DUZEN) { if (o.sil || o.z || GOLGESIZ.indexOf(o.ad) >= 0 || !cizimAd(o)) continue; if (motorlu(o)) leke(o.x, o.y + 0.04, o.w * 0.46, Math.max(0.16, o.w * 0.09), 'rgba(60,40,84,0.55)', 'multiply'); else leke(o.x + o.w * 0.08, o.y + (o.cy || 0) * 0.6 + 0.05, o.w * 0.62, Math.max(0.35, o.w * 0.26), 'rgba(74,52,98,0.5)', 'multiply'); }
      for (const q of KUTLE) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1), a = Math.min(0.9, 0.62 * q.s); g.addColorStop(0, 'rgba(56,38,86,' + a + ')'); g.addColorStop(0.7, 'rgba(56,38,86,' + a + ')'); g.addColorStop(1, 'rgba(56,38,86,0)');
        x.save(); x.globalCompositeOperation = 'multiply'; x.translate(cx(q.x), cy(q.y)); x.rotate(-q.aci * RADYAN); x.scale(q.rx * ppm, q.ry * ppm); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.fill(); x.restore(); }
      if (TON) { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(' + TON.map(v => Math.round(Math.min(1, v) * 255)).join(',') + ')'; x.fillRect(0, 0, W, H); x.restore(); }
      for (const q of ISIK) { const w = PX(q[0], q[1]); leke(w[0], w[1] - 0.2, q[2], q[2] * 0.8, 'rgba(255,196,120,' + (0.42 * q[3]).toFixed(2) + ')', 'soft-light'); leke(w[0], w[1] - 0.2, q[2] * 0.55, q[2] * 0.45, 'rgba(255,214,150,' + (0.2 * q[3]).toFixed(2) + ')', 'lighter'); }
      return c; }

    /* ---------- sahne ---------- */
    D[id] = { L, build(h) { if (!L.indoor) h.addSky(); const R0 = h.R, beyaz = h.uv('white');   // iç mekânda gök, uzak arka plan ve bulut çizilmez: boş yer L.light.clear rengidir
      const yer = ZM.alanlar.map(q => ({ q, t: null }));
      ic.R0 = R0; ic.K = EO2.doku; ic.dokular = {}; ic.fx = h.T.fx; ic.golgeUv = h.uv('shadow'); ic.dip = dipDokular(R0);
      { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = 'rgb(58,40,84)'; x.beginPath(); x.ellipse(128, 64, 126, 62, 0, 0, 6.3); x.fill(); ic.elips = R0.texture(c); }
      ic.yenile = () => { for (const y of yer) y.t = R0.texture(zeminCiz(y.q[0], y.q[1], y.q[2], y.q[3], y.q[4], y.q[5])); }; ic.yenile();
      yukleCiz().then(() => { if (ic.yenile) ic.yenile(); });   // çizimler sahneden sonra yüklendiyse gölgeler yeniden boyanır
      h.push({ key: 960, draw(R) { for (const y of yer) { const q = y.q; R.quad(y.t, [q[0], q[1], 0.006], [q[2], q[1], 0.006], [q[2], q[3], 0.006], [q[0], q[3], 0.006], 0, 0, 1, 1, BIRR, false, 1); } } });
      for (const o of DUZEN) for (const it of nesneItler(o)) h.push(it);
      /* tavan düzlemi (V.tavan: { ad, z, x0, x1, y0, y1, karo, isik }): yatay, döşenen doku; kamera tavanın üstüne çıkınca (dikey ekran) çizilmez. Doku dünyaya bağlıdır, kamera yürüyünce kaymaz. */
      if (V.tavan) { const T = V.tavan; let tt = null; h.push({ key: 952, draw(R, F) { if (F.camH > T.z - 0.4) return; if (!tt) { const im = ic.K && ic.K.im[T.ad]; if (!im) return; tt = R0.texture(im, { repeat: true }); tt.oran = im.naturalHeight / im.naturalWidth; }
        const k = T.karo || 4, kb = k * tt.oran, ya = Math.max(T.y0, F.camY + 0.5), p = T.isik === undefined ? 0.85 : T.isik, a = F.amb; if (ya >= T.y1) return;
        R.quad(tt, [T.x0, ya, T.z], [T.x1, ya, T.z], [T.x1, T.y1, T.z], [T.x0, T.y1, T.z], T.x0 / k, ya / kb, T.x1 / k, T.y1 / kb, [a[0] * p, a[1] * p, a[2] * p, 1], false, 0); } }); }
      /* yer gölgeleri (zeminin hemen üstünde, bütün nesnelerden önce): bağlı nesnede keskin elips, ışıksız eşte yumuşak silüet */
      h.push({ key: 955, draw(R) { for (const o of DUZEN) { if (o.sil || o.z) continue;
        if (bagli(o)) { const a = Math.abs(Math.sin(aciOf(o) * RADYAN)), rx = enOf(o) * 0.6, ry = 0.5 + 0.5 * a * o.w * 0.5, cx = o.x - 0.04, cy = o.y + ry * 0.15;   // bank ne kadar dönükse elips o kadar derin
          R.quad(ic.elips, [cx - rx, cy - ry, 0.012], [cx + rx, cy - ry, 0.012], [cx + rx, cy + ry, 0.012], [cx - rx, cy + ry, 0.012], 0, 0, 1, 1, [1, 1, 1, 0.5]); continue; }
        if (!motorlu(o)) continue; const ad = cizimAd(o), t = dokuOf(ad), g = ekDoku(ad, 'g'); if (!t || !g) continue;
        const w = enOf(o), yo = yonOf(o), hh = Math.min(GOLGE[3], w * t.oran * GOLGE[2]), pw = w * PAY, ph = hh * PAY, xa = o.x - w / 2 - pw, xb = o.x + w / 2 + pw, ya = o.y - yo * (0.5 + PAY), yb = o.y + yo * (0.5 + PAY), ux = GOLGE[0], uy = GOLGE[1], ay = aynaOf(o);
        /* gölge kameraya doğru düştüğü için köşeler yakından uzağa sıralanır; dokunun üstü gölgenin ucuna gelir */
        R.quad(g, [xa + ux * (hh + ph), ya + uy * (hh + ph), 0.013], [xb + ux * (hh + ph), yb + uy * (hh + ph), 0.013], [xb - ux * ph, yb - uy * ph, 0.013], [xa - ux * ph, ya - uy * ph, 0.013], ay ? 1 : 0, 1, ay ? 0 : 1, 0, [1, 1, 1, 0.42], false, 1); } } });
      /* yön okları: yol boyunca akan ışıklı işaretler */
      if (OKLAR.length) { const ch = h.uv('chev'); h.push({ key: 950, draw(R, F) { for (const q of OKLAR) for (let i = 0; i < q.n; i++) { const m = (i + 0.5) * q.len / q.n, ox = q.ax + q.dx * m, oy = q.ay + q.dy * m, k = 0.5 + 0.5 * Math.sin(F.time * 4 - i * 0.9), a = 0.3 + 0.55 * k, en = 0.7 * q.b, boy = 0.55 * q.b, px = q.dy, py = -q.dx;
        R.quad(h.T.fx, [ox + q.dx * boy - px * en, oy + q.dy * boy - py * en, 0.014], [ox + q.dx * boy + px * en, oy + q.dy * boy + py * en, 0.014], [ox - q.dx * boy + px * en, oy - q.dy * boy + py * en, 0.014], [ox - q.dx * boy - px * en, oy - q.dy * boy - py * en, 0.014], ch[0], ch[1], ch[2], ch[3], [0.25, 0.62, 1.0, a], false, 0); } } }); }
      /* kılavuz: ölçü noktaları (kişi boyu verilmişse direk) ve 5 birimlik zemin ızgarası */
      h.push({ key: -40, draw(R) { if (!s.kilavuz) return;
        for (const q of NOKTA) { const w = PX(q[0], q[1]), r = 0.12, c = q[2] ? [1, 0.2, 0.2, 0.9] : [0.1, 0.9, 1, 0.9];
          R.quad(h.T.fx, [w[0] - r, w[1] - r, 0.03], [w[0] + r, w[1] - r, 0.03], [w[0] + r, w[1] + r, 0.03], [w[0] - r, w[1] + r, 0.03], beyaz[0], beyaz[1], beyaz[2], beyaz[3], c);
          if (q[2]) { const hh = q[2] / OLC(q[1]); R.quad(h.T.fx, [w[0] - 0.04, w[1], 0], [w[0] + 0.04, w[1], 0], [w[0] + 0.04, w[1], hh], [w[0] - 0.04, w[1], hh], beyaz[0], beyaz[1], beyaz[2], beyaz[3], [1, 0.9, 0.1, 0.9]); } }
        for (let gy = 0; gy <= 55; gy += 5) R.quad(h.T.fx, [-20, gy - 0.03, 0.02], [25, gy - 0.03, 0.02], [25, gy + 0.03, 0.02], [-20, gy + 0.03, 0.02], beyaz[0], beyaz[1], beyaz[2], beyaz[3], [1, 1, 1, 0.35]);
        for (let gx = -20; gx <= 25; gx += 5) R.quad(h.T.fx, [gx - 0.03, 0, 0.02], [gx + 0.03, 0, 0.02], [gx + 0.03, 55, 0.02], [gx - 0.03, 55, 0.02], beyaz[0], beyaz[1], beyaz[2], beyaz[3], [1, 1, 1, 0.35]); } });
      return {}; } };

    /* ---------- ön plan: ekrana sabit, oyuncuyla hafifçe kayan bulanık çizimler (V.onPlan: [çizim, css]) ---------- */
    let onEl = null;
    function onPlan() { if (onEl || !(V.onPlan || []).length) return onEl; onEl = document.createElement('div'); onEl.className = 'bolumOn'; onEl.setAttribute('aria-hidden', 'true'); onEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
      onEl.innerHTML = V.onPlan.map(q => '<img alt="" src="' + klasor + q[0] + '.webp" style="position:absolute;' + q[1] + '">').join('');
      const cv = document.getElementById('isikSuzgeci') || document.getElementById('world'); cv.insertAdjacentElement('afterend', onEl); return onEl; }

    /* ---------- sahne editörü ----------
       Nesneye tıkla: seç. Sürükle: taşı. Tekerlek: boyut (Shift ile yükseklik). Oklar: ince kaydır (Shift ile kaba). F: çevir. Ctrl+D: çoğalt.
       Delete: sil. Alt+tık: arkadaki nesne. Esc: seçimi bırak. Oyuncu WASD ile yürür. Kaydet tarayıcıya yazar; Dışa aktar düzen dosyasını indirir. */
    const ED = { acik: false, sec: null, surukle: null, el: null, panel: null, cerceve: null, bindirme: null };
    const duzenYaz = () => { try { localStorage.setItem(depo + '.duzen', JSON.stringify(DUZEN.filter(o => !o.sil))); } catch (e) { /* gizli pencere */ } };
    const kutu = o => { const R = EO2.api.R, hh = boyOf(o), w = enOf(o), a = R.project(o.x - w / 2, o.y, (o.z || 0) + hh), b = R.project(o.x + w / 2, o.y, o.z || 0); return a && b ? { x0: a[0], y0: a[1], x1: b[0], y1: b[1] } : null; };
    const altinda = (sx, sy) => DUZEN.filter(o => { if (o.sil) return false; const k = kutu(o); return k && sx >= k.x0 && sx <= k.x1 && sy >= k.y0 && sy <= k.y1; }).sort((p, q) => (p.y + (p.key || 0)) - (q.y + (q.key || 0)));
    const ekleNesne = o => { DUZEN.push(o); const st = EO2.api.sceneState(); if (st && st.id === id && st.w && st.w.statics) for (const it of nesneItler(o)) st.w.statics.push(it); carpKur(); return o; };
    const palet = () => { const K = EO2.doku, aileCizim = new Set(); for (const A of Object.values(AILE)) for (const a of A.acilar) aileCizim.add(ad3(A, a)); const isz = new Set(Object.values(ISIKSIZ));
      return adlar.filter(a => K.im[a] && !aileCizim.has(a) && !isz.has(a)).concat(Object.keys(AILE)).sort(); };
    function panelCiz() { const p = ED.panel, o = ED.sec; if (!p) return;
      const alan = (k, ad, adim) => '<label><span>' + ad + '</span><input type="number" step="' + adim + '" data-k="' + k + '" value="' + (o ? r3(o[k] || 0) : '') + '"></label>', pl = palet();
      const kucuk = a => AILE[a] ? ad3(AILE[a], AILE[a].acilar[0]) : a;
      p.innerHTML = '<b class="me-bas">Sahne editörü · ' + (V.ad || id) + '</b>' +
        (o ? '<div class="me-sec"><i>' + o.ad + '</i>' + (b => b && b.yakin > 1.15 ? '<em style="display:block;color:#ffb4a2;font-style:normal;font-size:11px">Yakından ×' + b.yakin.toFixed(1) + ' büyüyor (kaynak ' + b.kaynak + ' piksel): bulanık görünür</em>' : '')(buyutme(o)) + '<label><span>Çizim</span><select data-k="ad">' + pl.map(a => '<option' + (a === o.ad ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></label>' +
          alan('x', 'Sağ-sol', 0.05) + alan('y', 'Derinlik', 0.05) + alan('w', 'En', 0.05) + alan('z', 'Yükseklik', 0.05) + alan('yon', 'Çapraz derinlik', 0.1) + (AILE[o.ad] ? alan('aci', 'Dönüş (derece)', 15) : '') + alan('key', 'Sıra kayması', 0.1) + alan('carp', 'Çarpışma yarıçapı', 0.05) + alan('cy', 'Çarpışma derinliği', 0.05) +
          '<div class="me-dug"><button data-e="cevir">Çevir (F)</button><button data-e="cogalt">Çoğalt</button><button data-e="sil">Sil</button></div></div>'
          : '<p class="me-bos">Bir nesneye tıkla. Sürükle: taşı. Tekerlek: boyut. Oklar: ince kaydır. WASD: yürü.</p>') +
        '<b class="me-alt">Ekle</b><div class="me-palet">' + pl.map(a => '<button data-ekle="' + a + '" title="' + a + '"><img alt="' + a + '" src="' + klasor + kucuk(a) + '.webp"></button>').join('') + '</div>' +
        '<div class="me-dug"><button data-e="kaydet">Kaydet</button><button data-e="aktar">Dışa aktar</button><button data-e="zemin">Zemini yenile</button><button data-e="sifirla">Varsayılana dön</button></div>' +
        (V.setler ? '<div class="me-dug"><button data-e="set">Çizim seti: ' + (s.set ? (V.setler.ad || 'ikinci set') : (V.setler.ilkAd || 'ilk set')) + '</button></div>' : '') +
        (Object.keys(ISIKSIZ).length ? '<div class="me-dug"><button data-e="deneme">Işıksız çizim ' + (s.deneme ? 'açık' : 'kapalı') + '</button></div>' : '') +
        '<div class="me-dug"><button data-e="kilavuz">Kılavuz ' + (s.kilavuz ? 'açık' : 'kapalı') + '</button><label class="me-dosya">Referans bindir<input type="file" accept="image/*" data-e="ref"></label><input type="range" min="0" max="100" value="' + (ED.bindirme ? Math.round(+ED.bindirme.style.opacity * 100) : 50) + '" data-e="saydam" title="Referans saydamlığı"></div>' +
        '<div class="me-dug"><button data-e="kapat">Editörü kapat</button></div>';
      p.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', () => { if (!ED.sec) return; const k = el.dataset.k; if (k === 'ad') { ED.sec.ad = el.value; panelCiz(); } else ED.sec[k] = +el.value || 0; carpKur(); }));
      p.querySelectorAll('[data-ekle]').forEach(el => el.addEventListener('click', () => { const R = EO2.api.R, g = R.unproject(R.w / 2, R.h * 0.62) || [EO2.api.player.x, EO2.api.player.y + 2], im = EO2.doku.im[kucuk(el.dataset.ekle)];
        ED.sec = ekleNesne({ ad: el.dataset.ekle, x: r3(g[0]), y: r3(g[1]), w: r3(Math.min(4, Math.max(0.6, (im ? im.naturalWidth : 300) / 300))), ayna: 0, key: 0, z: 0, carp: 0, cy: 0 }); panelCiz(); }));
      p.querySelectorAll('button[data-e]').forEach(el => el.addEventListener('click', () => komut(el.dataset.e)));
      const ref = p.querySelector('[data-e="ref"]'); if (ref) ref.addEventListener('change', () => { const f = ref.files && ref.files[0]; if (!f) return; if (!ED.bindirme) { ED.bindirme = document.createElement('img'); ED.bindirme.alt = ''; ED.bindirme.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:.5;pointer-events:none'; ED.el.appendChild(ED.bindirme); } ED.bindirme.src = URL.createObjectURL(f); });
      const sy = p.querySelector('[data-e="saydam"]'); if (sy) sy.addEventListener('input', () => { if (ED.bindirme) ED.bindirme.style.opacity = String(sy.value / 100); }); }
    function komut(e) { const o = ED.sec, T = m => EO2.api.toast && EO2.api.toast(m);
      if (e === 'cevir' && o) o.ayna = o.ayna ? 0 : 1;
      else if (e === 'cogalt' && o) ED.sec = ekleNesne(Object.assign({}, o, { x: r3(o.x + 0.6), y: r3(o.y - 0.2) }));
      else if (e === 'sil' && o) { o.sil = 1; ED.sec = null; carpKur(); }
      else if (e === 'kaydet') { duzenYaz(); T('Düzen bu tarayıcıya kaydedildi.'); }
      else if (e === 'aktar') { const dosya = id + '.duzen.js', metin = '/* ' + (V.ad || id) + ' düzeni: sahne editöründen dışa aktarıldı (' + new Date().toISOString().slice(0, 16) + ').\n   eo2/js/bolumler/' + dosya + ' olarak kaydedilir ve js/bolumler/liste.js içinde bölüm dosyasından ÖNCE yazılır. */\nwindow.EO2 = window.EO2 || {}; EO2.bolumDuzen = EO2.bolumDuzen || {}; EO2.bolumDuzen[' + JSON.stringify(id) + '] = ' + JSON.stringify(DUZEN.filter(q => !q.sil)).replace(/\},\{/g, '},\n  {').replace('[{', '[\n  {').replace('}]', '}\n]') + ';\n';
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([metin], { type: 'text/javascript' })); a.download = dosya; a.click(); try { navigator.clipboard.writeText(metin); } catch (er) { /* pano yok */ } duzenYaz(); T(dosya + ' indirildi ve panoya kopyalandı.'); }
      else if (e === 'zemin') { if (ic.yenile) ic.yenile(); T('Zemin gölgeleri yeni yerlere göre boyandı.'); }
      else if (e === 'sifirla') { try { localStorage.removeItem(depo + '.duzen'); } catch (er) { /* gizli pencere */ } for (const q of DUZEN) q.sil = 1; ED.sec = null; for (const q of (aktarilan() || varsayilan())) ekleNesne(q); if (ic.yenile) ic.yenile(); T('Varsayılan düzene dönüldü.'); }
      else if (e === 'kilavuz') { s.kilavuz = s.kilavuz ? 0 : 1; kaydet(); }
      else if (e === 'deneme') { api.deneme(!s.deneme); }
      else if (e === 'set') { api.set(!s.set); }
      else if (e === 'kapat') { editor(false); return; }
      panelCiz(); }
    function editor(v) { ED.acik = !!v; if (v) { const b = bulaniklik(); if (b.length) console.warn('[bölüm ' + id + '] 1920 genişlikte yakından büyüyen çizimler (oran, kaynak piksel): ' + b.map(q => q.ad + ' ×' + q.yakin + ' (' + q.kaynak + ')').join(', ')); } if (v && !ED.el) { editorStili();
        ED.el = document.createElement('div'); ED.el.className = 'mEd'; ED.cerceve = document.createElement('div'); ED.cerceve.className = 'mEdCer'; ED.el.appendChild(ED.cerceve); ED.panel = document.createElement('div'); ED.panel.className = 'mEdPanel';
        const cv = document.getElementById('world'); cv.parentElement.appendChild(ED.el); cv.parentElement.appendChild(ED.panel);
        const yer = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        ED.el.addEventListener('pointerdown', e => { const [sx, sy] = yer(e), ad = altinda(sx, sy); let o = ad[0] || null; if (e.altKey && ad.length > 1) { const i = ad.indexOf(ED.sec); o = ad[(i + 1) % ad.length]; }
          ED.sec = o; if (o) { const t = EO2.api.R.project(o.x, o.y, 0); ED.surukle = t ? { dx: t[0] - sx, dy: t[1] - sy } : null; try { ED.el.setPointerCapture(e.pointerId); } catch (er) { /* yapay olay */ } } panelCiz(); });
        ED.el.addEventListener('pointermove', e => { if (!ED.surukle || !ED.sec) return; const [sx, sy] = yer(e), g = EO2.api.R.unproject(sx + ED.surukle.dx, sy + ED.surukle.dy); if (g) { ED.sec.x = r3(g[0]); ED.sec.y = r3(g[1]); } });
        const birak = () => { if (ED.surukle) { ED.surukle = null; carpKur(); panelCiz(); } }; ED.el.addEventListener('pointerup', birak); ED.el.addEventListener('pointercancel', birak);
        ED.el.addEventListener('wheel', e => { const o = ED.sec; if (!o) return; e.preventDefault(); const y = e.deltaY < 0 ? 1 : -1; if (e.shiftKey) o.z = r3(Math.max(0, (o.z || 0) + y * 0.05)); else o.w = r3(Math.max(0.1, o.w * (1 + y * 0.03))); panelCiz(); }, { passive: false });
        addEventListener('keydown', e => { if (!ED.acik || /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return; const o = ED.sec, k = e.key, a = e.shiftKey ? 0.5 : 0.05;
          if (k === 'Escape') { ED.sec = null; panelCiz(); } else if (!o) return;
          else if (k === 'ArrowLeft') o.x = r3(o.x - a); else if (k === 'ArrowRight') o.x = r3(o.x + a); else if (k === 'ArrowUp') o.y = r3(o.y + a); else if (k === 'ArrowDown') o.y = r3(o.y - a);
          else if (k === 'Delete' || k === 'Backspace') { komut('sil'); } else if (k.toLowerCase() === 'f') { komut('cevir'); } else if (k.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) { komut('cogalt'); } else return;
          e.preventDefault(); e.stopImmediatePropagation(); carpKur(); panelCiz(); }, true); }
      if (ED.el) { ED.el.style.display = v ? '' : 'none'; ED.panel.style.display = v ? '' : 'none'; } if (v) panelCiz(); else ED.sec = null; }

    /* ---------- kare: sahneye girince bölümün kamerası ve ışığı; çıkınca eski hâl ---------- */
    let oncekiKam = null;
    function kare(acik) { const AS = EO2.api.S, sz = document.getElementById('isikSuzgeci');
      if (acik || onEl) { const el = onPlan(); if (el) { el.style.display = acik ? '' : 'none'; if (acik) el.style.setProperty('--kx', (-(EO2.api.player.x || 0) * 6).toFixed(1)); } }
      if (ED.acik) { if (!acik) editor(false); else { const k = ED.sec && !ED.sec.sil ? kutu(ED.sec) : null, c = ED.cerceve; if (k) { c.style.display = ''; c.style.left = k.x0 + 'px'; c.style.top = k.y0 + 'px'; c.style.width = (k.x1 - k.x0) + 'px'; c.style.height = (k.y1 - k.y0) + 'px'; } else c.style.display = 'none'; } }
      if (acik && oncekiKam === null && AS) { oncekiKam = AS.camMode || 'yakin'; AS.camMode = kamAd; EO2.isikAyar = V.isik || { ik: 0.18, sicak: 1 }; if (sz) sz.style.opacity = '0'; }
      else if (!acik && oncekiKam !== null && AS) { if (AS.camMode === kamAd) AS.camMode = oncekiKam; oncekiKam = null; if (EO2.pilot && EO2.pilot.uygula) EO2.pilot.uygula(); } }

    /* büyütme oranı: çizimin ekranda tuttuğu piksel / kaynak pikseli. yakin: oyuncu nesnenin yanındayken, bas: oyuncu başlangıç yerindeyken. 1'in üstü bulanıklaşır. */
    const buyutme = (o, en) => { const t = dokuOf(cizimAd(o)); if (!t || !t.gen) return null; const k = (en || 1920) / MW, Z = (o.y - PY + D0) * CT + KH * ST; return { kaynak: t.gen, yakin: enOf(o) * OLC(REF.oyuncu[1]) * k / t.gen, bas: Z > 0.1 ? enOf(o) * (ODAK / Z) * k / t.gen : 0 }; };
    const bulaniklik = en => DUZEN.filter(o => !o.sil).map(o => { const b = buyutme(o, en); return b && { ad: cizimAd(o), x: r3(o.x), y: r3(o.y), kaynak: b.kaynak, yakin: +b.yakin.toFixed(2), bas: +b.bas.toFixed(2) }; }).filter(b => b && b.yakin > 1.15).sort((a, b) => b.yakin - a.yakin);
    const api = { id, ad: V.ad || id, s, PX, OLC, get hazir() { return yukleCiz(); }, yukle: yukleCiz, bulaniklik, kamera: { TH, KH, D0, ODAK, UFUK, ad: kamAd }, kare, editor,
      duzen: () => DUZEN.filter(o => !o.sil), cizimler: () => adlar.slice(),
      kilavuz: v => { s.kilavuz = v ? 1 : 0; kaydet(); },
      zeminResim: v => { s.zeminResim = v ? 1 : 0; kaydet(); if (ic.yenile) ic.yenile(); },
      zeminSer: (ad, x0, y0, x1, y1) => { ZRES.push([ad, x0, y0, x1, y1]); return EO2.doku.ekle([ad], klasor).then(() => { if (ic.yenile) ic.yenile(); }); },   // deneme için: çalışırken zemine resim ser
      set: v => { s.set = v ? 1 : 0; kaydet(); carpKur(); if (ic.yenile) ic.yenile(); },
      deneme: v => { s.deneme = v ? 1 : 0; kaydet(); carpKur(); if (ic.yenile) ic.yenile(); } };
    B.hepsi[id] = api; if (id === 'master') EO2.master = api;   // EO2.master: eski ad, uyumluluk için
    return api;
  };

  B.al = id => B.hepsi[id] || null;
  B.aktif = () => EO2.api ? B.hepsi[EO2.api.scene()] || null : null;
  /* Menüdeki "Sahne editörü": bulunulan bölümün editörünü açar; bölüm dışındaysa ilk bölüme gidip açar */
  B.editorAc = () => { const a = B.aktif(); if (a) { a.editor(true); return; } const ilk = Object.keys(B.hepsi)[0]; if (!ilk || !EO2.api) return; EO2.api.go(ilk); setTimeout(() => { const b = B.aktif(); if (b) b.editor(true); }, 1800); };

  /* tek kare kancası: önce çıkılan bölümler, sonra girilen bölüm (kamera ve ışık doğru sırayla el değiştirsin) */
  EO2.frameHooks.push(() => { if (!EO2.api) return; const a = EO2.api.scene(), dn = document.getElementById('world'); if (dn) dn.classList.toggle('bolum-sahne', !!B.hepsi[a]);
    for (const k in B.hepsi) if (k !== a) B.hepsi[k].kare(false); if (B.hepsi[a]) B.hepsi[a].kare(true); });

  /* bölüm dosyaları: js/bolumler/liste.js → EO2.bolumListe (dosya adları, sırayla yüklenir). ?v= sürüm damgasıdır: yayında değişmez önbellek (server/eo2_page.js) */
  for (const dosya of (EO2.bolumListe || [])) { const sc = document.createElement('script'); sc.src = 'js/bolumler/' + dosya + (window.EO2_V ? '?v=' + window.EO2_V : ''); sc.async = false; document.head.appendChild(sc); }
})();
