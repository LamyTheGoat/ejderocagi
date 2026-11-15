/* Ejder Ocağı 2.0 · ağ katmanı (EO2.ag)
   Tek iş: 2.0 sayfasını oyun sunucusuna bağlamak. Oturum (misafir çerezi), sunucu kesesi (ekonomi komutları) ve canlı
   kanal (WebSocket) buradadır; Arena, Er Meydanı ve Topçu odaları bu arayüzü kullanır, kendi bağlantılarını açmazlar.

   KESE KURALI: istemci sunucuya hiçbir zaman "şu kadar altın ver" demez. Sunucu altını yalnız sunucunun hesapladığı
   komut sonuçlarıyla artar (arena.settle gibi). Göstergedeki altın = yerel kese + sunucu kesesindeki arena kazancı:
   sunucu bakiyesi değiştikçe fark `S.gold`a yansıtılır (`S.ag.srv` o payın ne kadarının içeride olduğunu tutar).
   Yerel harcama sunucu payına uzanırsa aradaki fark sunucudan düşülür (yalnız AZALTAN komut: gold.local, eksi tutar).

   ÇEVRİMDIŞI: sunucu yoksa (statik yayın, kopuk ağ) oyun aynen çalışır; `durum()` 'cevrimdisi' döner, sunucuya bağlı
   ödüller yazılmaz ve bunu çağıran ekran açıkça söyler. Bağlantı arka planda yeniden denenir. */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};
  const dinleyen = {};                                   // tür → Set(fn)
  let durum = 'baglaniyor', kimlik = null, eko = null, ws = null, wsAcik = false, deneme = 0, zincir = Promise.resolve(), hazirSoz = null, pingT = null, yenidenT = null;
  const yay = (tur, veri) => { for (const k of [tur, '*']) if (dinleyen[k]) for (const fn of [...dinleyen[k]]) { try { fn(veri, tur); } catch (e) { console.error('[ag]', tur, e); } } };
  const durumYap = d => { if (durum === d) return; durum = d; yay('durum', d); };
  const hata = (code, status) => Object.assign(new Error(code), { code, status: status || 0 });

  /* ---------- HTTP ---------- */
  async function istek(yol, secenek) {
    const o = secenek || {}, ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), o.sure || 10000);
    let r, veri = null;
    try {
      r = await fetch(yol, { method: o.method || (o.body ? 'POST' : 'GET'), credentials: 'same-origin', signal: ctrl.signal,
        headers: o.body ? { 'Content-Type': 'application/json' } : undefined, body: o.body ? JSON.stringify(o.body) : undefined });
      try { veri = await r.json(); } catch (_) { veri = null; }
    } catch (_) { throw hata('baglanti_yok', 0); } finally { clearTimeout(t); }
    if (!r.ok || !veri || veri.ok === false) throw hata((veri && veri.error) || 'sunucu_hatasi', r.status);
    return veri;
  }

  /* ---------- sunucu kesesi ---------- */
  const al = veri => { if (veri && veri.economy && (!eko || veri.economy.version >= eko.version)) { eko = veri.economy; esitle(); yay('kese', eko); } return veri; };
  const yenile = () => istek('/api/economy').then(al);
  /* Komutlar sıraya girer (aynı anda tek komut). Sürüm çakışmasında kese tazelenip bir kez daha denenir; aynı requestId
     ile yinelenen istek sunucuda tek kez uygulanır (makbuz). Belirsiz hata (ağ) aynı gövdeyle iki kez daha denenir. */
  function komut(type, args) {
    const is = zincir.then(async () => {
      if (!kimlik) throw hata('baglanti_yok', 0);
      if (!eko) await yenile();
      let govde = { requestId: crypto.randomUUID(), expectedVersion: eko.version, type, args: args || {} };
      for (let i = 0; ; i++) {
        try { return al(await istek('/api/economy/command', { body: govde })); }
        catch (e) {
          if (e.code === 'version_conflict' && i < 2) { await yenile(); govde = Object.assign({}, govde, { requestId: crypto.randomUUID(), expectedVersion: eko.version }); continue; }
          if (!e.status && i < 2) { await new Promise(r => setTimeout(r, 600 * (i + 1))); continue; }
          if (e.status === 401) { kimlik = null; eko = null; }          // oturum düştü: sessizce yeniden kurulur (yeni misafir)
          if (!e.status || e.status >= 500 || e.status === 401) baglantiKoptu();
          throw e;
        }
      }
    });
    zincir = is.catch(() => {});
    return is;
  }

  /* Gösterge: sunucudaki arena payını yerel keseye yansıt. `S.ag` kayıtla birlikte saklanır. */
  let harcaniyor = false;
  function esitle() {
    if (!eko || !eko.game || typeof S === 'undefined' || !S || !EO2.game || !EO2.game.live) return;      // sunucu ocağı kurulmadan (game.start) taban alınmaz: başlangıç kesesi pay sayılmasın
    let A = S.ag;
    if (!A || A.acct !== eko.accountId) {
      /* başka hesaba geçildi (misafir çerezi gitti): o ana dek gösterilen pay yerel kesede kalır; oyuncunun altını silinmez */
      A = S.ag = { acct: eko.accountId, base: eko.gold, srv: 0 };   // taban: bağlandığı andaki sunucu altını (başlangıç kesesi) sayılmaz
      if (eko.game.ocak && eko.game.ocak.kese) A.dus = eko.game.ocak.kese.dusulen;
    }
    /* Sunucu, ocak bağlanınca çift başlangıç kesesini sıfırlar (server/ocak_service.js). O altın zaten tabandaydı,
       göstergede hiç görünmedi: taban aynı tutar kadar iner, oyuncunun göstergesi değişmez. Bir kez uygulanır. */
    const K = eko.game.ocak && eko.game.ocak.kese;
    if (K && A.dus == null) { A.base -= K.dusulen; A.dus = K.dusulen; }
    const simdi = eko.gold - A.base, fark = simdi - A.srv;
    if (fark && !harcaniyor) { S.gold += fark; A.srv = simdi; kaydetCiz(); }
    /* Yerel harcama sunucu payına uzandıysa (yerel kısım eksiye düştü) farkı sunucudan düş. İstemci yalnız azaltır. */
    const yerel = S.gold - A.srv;
    if (yerel < 0 && A.srv > 0 && !harcaniyor && durum === 'cevrimici') {
      const tutar = Math.min(-yerel, A.srv); harcaniyor = true;
      komut('gold.local', { amount: -tutar, reason: 'other' }).then(() => { A.srv -= tutar; }).catch(() => {}).finally(() => { harcaniyor = false; kaydetCiz(); esitle(); });
    }
  }
  function kaydetCiz() { try { if (typeof saveGame === 'function') saveGame(); } catch (_) { } const G = EO2.game; if (G && G.hud) G.hud(); const g = document.getElementById('scrGold'); if (g && typeof S !== 'undefined' && S) g.textContent = S.gold; }
  setInterval(() => { if (durum === 'cevrimici') esitle(); }, 2000);

  /* ---------- canlı kanal ---------- */
  function wsAc() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (_) { return baglantiKoptu(); }
    const bu = ws;
    bu.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (!m || !m.type) return;
      if (m.type === 'welcome') { wsAcik = true; deneme = 0; if (m.handle && kimlik) kimlik.handle = m.handle; durumYap('cevrimici'); }
      yay(m.type, m); };
    bu.onclose = () => { if (ws !== bu) return; const idi = wsAcik; wsAcik = false; ws = null; if (idi) yay('kanal_kapandi', null); baglantiKoptu(); };
    bu.onerror = () => { };
    clearInterval(pingT); pingT = setInterval(() => { if (wsAcik) gonder({ type: 'ping' }); }, 25000);
  }
  function gonder(obj) { if (!wsAcik || !ws || ws.readyState !== 1) return false; try { ws.send(JSON.stringify(obj)); return true; } catch (_) { return false; } }
  function baglantiKoptu() { durumYap('cevrimdisi'); clearTimeout(yenidenT); yenidenT = setTimeout(baglan, Math.min(30000, 2000 * Math.pow(1.7, deneme++))); }

  /* ---------- kurulum ---------- */
  async function kur() {
    /* `yeni=1`: çerez eskimişse (sunucu yeniden başladı, oturum silindi) sunucu 401 yerine yeni misafir oturumu açar */
    const o = await istek('/api/session?yeni=1', { method: 'POST' });
    kimlik = { accountId: o.accountId, handle: o.handle };
    await yenile();
    if (!eko || !eko.game) await komut('game.start', {});     // sunucu ocağı (kese) ilk bağlantıda kurulur
    wsAc();
    await new Promise((res, rej) => { const t = setTimeout(() => { k(); rej(hata('kanal_zaman_asimi', 0)); }, 8000), k = dinle('welcome', () => { clearTimeout(t); k(); res(); }); if (wsAcik) { clearTimeout(t); k(); res(); } });
    durumYap('cevrimici'); bekleyenArena();
    return true;
  }
  function baglan() {
    if (hazirSoz) return hazirSoz;
    if (durum !== 'cevrimici') durumYap('baglaniyor');
    hazirSoz = kur().then(() => true, () => { baglantiKoptu(); return false; }).finally(() => { hazirSoz = null; });
    return hazirSoz;
  }
  function dinle(tur, fn) { (dinleyen[tur] = dinleyen[tur] || new Set()).add(fn); return () => dinleyen[tur].delete(fn); }

  /* ---------- arena PvE: sunucunun tohumuyla aynı sayıları üreten RNG (server/arena_service.js `rng` ile aynı) ---------- */
  function rng(seed) {
    let a = parseInt(seed.slice(0, 8), 16) | 0, b = parseInt(seed.slice(8, 16), 16) | 0, c = parseInt(seed.slice(16, 24), 16) | 0, d = parseInt(seed.slice(24, 32), 16) | 0;
    const next = () => { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0; return (t >>> 0) / 4294967296; };
    for (let i = 0; i < 12; i++) next();
    return next;
  }
  /* Dövüş bitti ama sonuç sunucuya ulaşamadıysa hamle listesi kayıtta bekler; bağlantı gelince bir kez daha gönderilir. */
  async function arenaBitir(fightId, acts) {
    try { const r = await komut('arena.settle', { fightId, acts: acts.join(',') }); if (typeof S !== 'undefined' && S && S.ag && S.ag.bekleyen && S.ag.bekleyen.fightId === fightId) { delete S.ag.bekleyen; kaydetCiz(); } return r.result.arena; }
    catch (e) { if (!e.status || e.status >= 500) { if (typeof S !== 'undefined' && S) { S.ag = S.ag || {}; S.ag.bekleyen = { fightId, acts }; kaydetCiz(); } } throw e; }
  }
  function bekleyenArena() {
    if (typeof S === 'undefined' || !S || !S.ag || !S.ag.bekleyen) return;
    const b = S.ag.bekleyen;
    komut('arena.settle', { fightId: b.fightId, acts: b.acts.join(',') }).then(r => { delete S.ag.bekleyen; kaydetCiz(); const a = r.result.arena; if (a.gold && typeof toast === 'function') toast('Bekleyen arena ödülü yazıldı: <b class="au">+' + a.gold + ' altın</b>', 'iyi'); })
      .catch(e => { if (e.status && e.status < 500) { delete S.ag.bekleyen; kaydetCiz(); } });
  }

  EO2.ag = {
    durum: () => durum,                                   // 'baglaniyor' | 'cevrimici' | 'cevrimdisi'
    cevrimici: () => durum === 'cevrimici',
    kimlik: () => kimlik && Object.assign({}, kimlik),    // { accountId, handle }
    baglan,                                               // Promise<boolean>: oturum + kese + kanal hazır mı (gerekirse kurar)
    dinle,                                                // dinle(tur, fn) → kapatıcı. tur: WS mesaj türü, 'durum', 'kese', 'kanal_kapandi', '*'
    gonder,                                               // WS'e nesne yollar; kanal kapalıysa false
    istek,                                                // istek(yol, { method, body }) → JSON; hata: { code, status }
    kese: () => eko,                                      // son sunucu kesesi (ekonomi görüntüsü) ya da null
    yenile, komut,                                        // komut(type, args) → { result, economy }
    pay: () => (typeof S !== 'undefined' && S && S.ag ? { sunucu: S.ag.srv || 0, yerel: S.gold - (S.ag.srv || 0) } : { sunucu: 0, yerel: typeof S !== 'undefined' && S ? S.gold : 0 }),
    esitle, rng, arenaBitir,
  };
  baglan();
  dinle('durum', d => { if (d === 'cevrimici') esitle(); });
})();
