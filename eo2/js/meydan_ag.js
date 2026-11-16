/* Ejder Ocağı 2.0 · Meydanda öteki oyuncular (EO2.meydanAg)
   Sunucu tarafı: server/meydan_presence.js (tür 'meydan', 'meydan_liste', 'meydan_cik'); kanal EO2.ag üzerindeki canlı bağlantıdır.
   Oyuncu kendi konumunu, yönünü, kuşam setini, yol arkadaşını ve jestini bildirir; aynı alandaki öteki oyuncular
   sahnede yürür. Hiçbir şey kalıcı değildir, oyun kuralına ve ekonomiye dokunmaz. Sohbet taşınmaz (süzgeç ve şikâyet
   akışı gelene dek kapalı); ad sunucuda süzgeçten geçer.
   Gelen her veri güvenilmezdir: sayılar sınırlanır, set ve yön bilinen listeden seçilir, ad yalnız textContent ile yazılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, ATLAS = window.EO2_ATLAS;
  if (!G || !AG || !ATLAS) return;
  const SETLER = Object.keys(ATLAS.sets), YON = ['up', 'down', 'left', 'right'], JEST = ['smile', 'wave', 'heart', 'spark', 'think', 'note'];
  const sayi = (v, a, b) => (typeof v === 'number' && isFinite(v)) ? Math.max(a, Math.min(b, v)) : null;
  const kisiler = new Map(); let api = null, sonJson = '', sonGonderim = 0, jest = null, alanim = null;

  function birak(id) { const c = kisiler.get(id); if (!c) return; kisiler.delete(id); const i = api.remotes.indexOf(c); if (i >= 0) api.remotes.splice(i, 1); api.dropChar(c); }
  function hepsiniBirak() { for (const id of [...kisiler.keys()]) birak(id); }
  function isle(p) {
    if (!api || !p || typeof p.id !== 'string' || p.id.length > 12) return;
    const x = sayi(p.x, -400, 400), y = sayi(p.y, -400, 400); if (x === null || y === null || typeof p.a !== 'string') return;
    if (p.a !== alanim) return birak(p.id);                         // başka alandan gelen gecikmiş bildirim
    const set = SETLER.includes(p.s) ? p.s : (SETLER.includes('temel') ? 'temel' : SETLER[0]), dir = YON.includes(p.d) ? p.d : 'down', ad = typeof p.n === 'string' && p.n ? p.n.slice(0, 16) : 'Gezgin';
    let c = kisiler.get(p.id);
    if (!c) {
      if (kisiler.size >= 40) return;
      c = api.mkChar({ remote: true, name: ad, x, y, tx: x, ty: y, set, dir, rdir: dir, crumbs: [[x, y]], lastE: p.e && p.e.t });
      c.area = p.a; kisiler.set(p.id, c); api.remotes.push(c); api.setPlate(c);
    }
    if (c.name !== ad) { c.name = ad; api.setPlate(c); }
    c.area = p.a; c.tx = x; c.ty = y; c.set = set; c.rdir = dir;
    if (Math.hypot(c.x - x, c.y - y) > 12) { c.x = x; c.y = y; c.crumbs = [[x, y]]; }      // ışınlanma: araya yürütme
    if (p.p && !c.pet) c.pet = { x: c.x + 0.8, y: c.y - 0.2, face: 1, hop: 0, moving: false, cheer: 0 }; else if (!p.p && c.pet) { if (c.pet.bub) c.pet.bub.remove(); c.pet = null; }
    if (p.e && typeof p.e.t === 'number' && p.e.t !== c.lastE) { c.lastE = p.e.t; if (JEST.includes(p.e.k)) { api.say(c, p.e.k, 2.4, true); c.happy = 2.4; if (c.pet && p.e.k === 'heart') c.pet.cheer = 1.4; } }
  }

  function bildir(zorla) {
    if (!api || !G.live || !AG.cevrimici()) return;
    const p = api.player, s = { type: 'meydan', a: api.scene(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), d: p.dir, s: p.set, p: api.S.companion ? 1 : 0, e: jest, n: G.ad ? G.ad() : 'Gezgin' };
    const j = JSON.stringify(s), t = Date.now();
    if (!zorla && (j === sonJson ? t - sonGonderim < 8000 : t - sonGonderim < 180)) return;   // değişmediyse sekiz saniyede bir nabız; değiştiyse saniyede en çok beş
    if (s.a !== alanim) { alanim = s.a; hepsiniBirak(); }
    if (AG.gonder(s)) { sonJson = j; sonGonderim = t; }
  }

  AG.dinle('meydan', m => isle(m));
  AG.dinle('meydan_liste', m => { if (!api || !m || m.a !== alanim || !Array.isArray(m.liste)) return; const gelen = new Set(m.liste.map(p => p && p.id)); for (const id of [...kisiler.keys()]) if (!gelen.has(id)) birak(id); for (const p of m.liste.slice(0, 40)) isle(p); });
  AG.dinle('meydan_cik', m => { if (m && typeof m.id === 'string') birak(m.id); });
  AG.dinle('durum', d => { if (d !== 'cevrimici') { hepsiniBirak(); sonJson = ''; alanim = null; } else setTimeout(() => bildir(true), 300); });

  (function bekle() {
    if (!EO2.api || !EO2.hooks) return setTimeout(bekle, 120);
    api = EO2.api;
    const jest0 = EO2.hooks.emote; EO2.hooks.emote = k => { if (jest0) jest0(k); jest = { k, t: Date.now() }; bildir(true); };
    setInterval(() => bildir(false), 100);
  })();
  EO2.meydanAg = { kisiler, sayi: () => kisiler.size };
})();
