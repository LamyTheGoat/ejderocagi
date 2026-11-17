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

  /* yer rozetinde kaç oyuncu olduğu: 'Merkez Meydan · 3 oyuncu' (kendin dahil); yalnızken görünmez */
  function say() { const el = document.getElementById('locKisi'); if (!el) return; const n = kisiler.size; el.hidden = !n; el.textContent = n ? (n + 1) + ' oyuncu' : ''; el.title = n ? 'Bu alanda seninle birlikte ' + (n + 1) + ' oyuncu var' : ''; }
  /* etkileşim: oyuncunun yanına gelince (E ya da beliren düğme) Er Meydanı daveti. Kayıt, sahnenin etkileşim listesine eklenir ve
     her karede oyuncunun konumunu izler; oyuncu ayrılınca ya da alan değişince listeden çıkar. */
  let etkL = null;
  function etkEkle(id, c) { if (!api.sceneState) return; const L = api.sceneState().L; if (!L || !Array.isArray(L.interact) || !c.handle) return; if (etkL !== L) etkL = L;
    c.etk = { id: 'oy:' + id, x: c.x, y: c.y, r: 1.5, z: 2.3, label: c.name, sub: 'Selam ver, düelloya çağır', act: 'oyuncu:' + id }; L.interact.push(c.etk); }
  function etkSil(c) { if (!c.etk) return; for (const L of [etkL, api.sceneState && api.sceneState().L]) if (L && Array.isArray(L.interact)) { const i = L.interact.indexOf(c.etk); if (i >= 0) L.interact.splice(i, 1); } c.etk = null; }
  /* ---------- engelleme ve şikâyet ----------
     Engellenen oyuncunun sözleri ve balonları gösterilmez (bu tarayıcıda, hesap adına göre). Şikâyet, oyuncunun son sözleriyle
     birlikte sorun bildirimi olarak sunucuya gider (/api/report). */
  const ENGEL = 'eo2.engel'; let engelli = new Set(); try { engelli = new Set(JSON.parse(localStorage.getItem(ENGEL) || '[]')); } catch (_) { }
  const engelYaz = () => { try { localStorage.setItem(ENGEL, JSON.stringify([...engelli].slice(-200))); } catch (_) { } };
  const temiz = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sozGunlugu = [];   // son sözler: { h, n, x, t }
  async function sikayet(c) {
    const son = sozGunlugu.filter(z => z.h === c.handle).slice(-10).map(z => z.x);
    const v = await G.pen({ k: 'Şikâyet', t: temiz(c.name) + ' şikâyet edilsin mi?', body: '<p>Şikâyetin, bu oyuncunun son sözleriyle birlikte bize ulaşır. İstersen oyuncuyu ayrıca engelleyebilirsin.</p>' + (son.length ? '<p class="soluk">Son sözleri: ' + son.map(temiz).join(' · ') + '</p>' : ''), btns: [{ t: 'Vazgeç', v: false }, { t: 'Şikâyet et', cls: 'kor', v: true }] });
    if (!v) return;
    try { const r = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ metin: '[şikâyet] ' + c.handle + ' (' + c.name + ') · ' + (son.join(' | ') || 'söz yok'), surum: EO2.surum || '', sahne: api.scene() }) });
      G.toast(r.ok ? 'Şikâyetin ulaştı. Teşekkürler.' : 'Şikâyet gönderilemedi; biraz sonra yeniden dene.'); } catch (_) { G.toast('Bağlantı yok; şikâyet gönderilemedi.'); }
  }
  /* ---------- oyuncu kartı: yanına gelinen oyuncuyla yapılabilecekler ---------- */
  async function cagir(id) { const c = kisiler.get(id); if (!c || !c.handle) return;
    const eng = engelli.has(c.handle);
    const v = await G.pen({ k: 'Terbiyeci', t: temiz(c.name), dikey: true, body: '<p>Aynı meydandasınız. Ne yapmak istersin?</p>',
      btns: [{ t: 'Selam ver', cls: 'altin', sub: 'El sallarsın', v: 'selam' }, ...(EO2.profil ? [{ t: 'Künyesine bak', sub: 'Haftası, ünü, yıldız ejderhası', v: 'profil' }] : []),
        ...(EO2.parti && !EO2.parti.uyeMi(c.handle) ? [{ t: 'Partiye çağır', sub: 'Birbirinizi her yerden görür, parti sohbetinde konuşursunuz', v: 'parti' }] : []), { t: 'Ejderha düellosuna çağır', sub: 'Canlı dövüş: ejderhan onunkine karşı', v: 'ejder', off: EO2.arena && EO2.arena.erCagir ? '' : 'Arena yüklenemedi' },
        { t: 'Topçu düellosuna çağır', sub: 'Dostça maç; altın ve ün yazılmaz', v: 'duello', off: EO2.topcuPvp && EO2.topcuPvp.davet ? '' : 'Er Meydanı yüklenemedi' },
        ...(EO2.zindan ? [{ t: 'Zümrüt Saray seferine çağır', sub: 'Ortak zindan; aşamalar arasında kampta toplanırsınız', v: 'sefer' }] : []),
        { t: 'Kıraathane masasına çağır', sub: 'Ejder Pokeri; bahsi masada koyarsınız', v: 'masa', off: EO2.masa ? '' : 'Masa yüklenemedi' },
        ...(EO2.ziyaret ? (EO2.ziyaret.evSahibi() && EO2.ziyaret.evSahibi().h === c.handle ? [{ t: 'Bir ejderhamı eşleşmeye sun', sub: 'Yumurta ev sahibinin ocağına gider', v: 'sun' }]
          : EO2.ziyaret.misafirMi(c.handle) ? [{ t: 'Birlikte çiftleştir', sub: 'Misafirin bir ejderhasını sunar; yumurta sana gelir', v: 'esle' }, { t: 'Misafirleri uğurla', sub: 'Ziyareti bitirir', v: 'ugurla' }]
          : EO2.ziyaret.evSahibi() ? [] : [{ t: 'Ocağına çağır', sub: 'Arazini gezer; birlikte çiftleştirirsiniz', v: 'ocak' }]) : []),
        { t: 'Takas teklif et', sub: 'Kazanılmış mal ve altın; ikiniz de onaylayınca', v: 'takas', off: EO2.takas ? '' : 'Takas yüklenemedi' },
        ...(EO2.dostlar ? [EO2.dostlar.dostMu(c.handle) ? { t: 'Fısılda', sub: 'Dostuna özel mesaj', v: 'fis' } : { t: 'Dost ekle', sub: 'Kabul ederse fısıldaşır, her yerden çağırırsın', v: 'dost' }] : []),
        { t: eng ? 'Engeli kaldır' : 'Engelle', sub: eng ? 'Sözlerini yeniden görürsün' : 'Sözlerini ve balonlarını görmezsin', v: 'engel' }, { t: 'Şikâyet et', sub: 'Uygunsuz ad ya da söz', v: 'sikayet' }, { t: 'Kapat', v: false }] });
    if (v === 'selam') { if (api.emote) api.emote(1); }
    else if (v === 'ejder') EO2.arena.erCagir(c.handle, c.name);
    else if (v === 'duello') EO2.topcuPvp.davet(c.handle, c.name);
    else if (v === 'takas') EO2.takas.teklif(c.handle, c.name);
    else if (v === 'masa') EO2.masa.cagir(c.handle, c.name);
    else if (v === 'sefer') EO2.zindan.cagir(c.handle, c.name);
    else if (v === 'ocak') EO2.ziyaret.cagir(c.handle, c.name);
    else if (v === 'profil') EO2.profil.ac(c.handle, c.name);
    else if (v === 'parti') EO2.parti.davet(c.handle, c.name);
    else if (v === 'sun') EO2.ziyaret.sun(false);
    else if (v === 'esle') EO2.ziyaret.iste(c.handle);
    else if (v === 'ugurla') EO2.ziyaret.ugurla();
    else if (v === 'dost') EO2.dostlar.ekle(c.handle, c.name);
    else if (v === 'fis') { const d = EO2.dostlar.durum().veri.dostlar.find(x => x.h === c.handle); if (d) EO2.dostlar.fisilda(d.id); }
    else if (v === 'engel') { if (eng) engelli.delete(c.handle); else engelli.add(c.handle); engelYaz(); G.toast(eng ? temiz(c.name) + ' için engel kalktı.' : temiz(c.name) + ' engellendi.'); }
    else if (v === 'sikayet') sikayet(c); }
  function birak(id) { const c = kisiler.get(id); if (!c) return; etkSil(c); kisiler.delete(id); const i = api.remotes.indexOf(c); if (i >= 0) api.remotes.splice(i, 1); api.dropChar(c); say(); }
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
      c.area = p.a; c.handle = typeof p.h === 'string' && /^@[^\s]{2,40}$/.test(p.h) ? p.h : null; kisiler.set(p.id, c); api.remotes.push(c); api.setPlate(c); say(); etkEkle(p.id, c);
    }
    if (c.name !== ad) { c.name = ad; api.setPlate(c); if (c.etk) c.etk.label = ad; }
    c.area = p.a; c.tx = x; c.ty = y; c.set = set; c.rdir = dir; if (EO2.gorunum) EO2.gorunum.uzak(c, p.g);
    if (Math.hypot(c.x - x, c.y - y) > 12) { c.x = x; c.y = y; c.crumbs = [[x, y]]; }      // ışınlanma: araya yürütme
    if (p.p && !c.pet) c.pet = { x: c.x + 0.8, y: c.y - 0.2, face: 1, hop: 0, moving: false, cheer: 0 }; else if (!p.p && c.pet) { if (c.pet.bub) c.pet.bub.remove(); c.pet = null; }
    if (p.e && typeof p.e.t === 'number' && p.e.t !== c.lastE) { c.lastE = p.e.t; if (JEST.includes(p.e.k)) { api.say(c, p.e.k, 2.4, true); c.happy = 2.4; if (c.pet && p.e.k === 'heart') c.pet.cheer = 1.4; } }
  }

  function bildir(zorla) {
    if (!api || !G.live || !AG.cevrimici()) return;
    const p = api.player, s = { type: 'meydan', a: api.scene(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), d: p.dir, s: p.set, g: EO2.gorunum ? EO2.gorunum.kod() : '', p: api.S.companion ? 1 : 0, e: jest, n: G.ad ? G.ad() : 'Gezgin' };
    const j = JSON.stringify(s), t = Date.now();
    if (!zorla && (j === sonJson ? t - sonGonderim < 8000 : t - sonGonderim < 180)) return;   // değişmediyse sekiz saniyede bir nabız; değiştiyse saniyede en çok beş
    if (s.a !== alanim) { alanim = s.a; hepsiniBirak(); }
    if (AG.gonder(s)) { sonJson = j; sonGonderim = t; }
  }

  AG.dinle('meydan', m => isle(m));
  AG.dinle('meydan_liste', m => { if (!api || !m || m.a !== alanim || !Array.isArray(m.liste)) return; const gelen = new Set(m.liste.map(p => p && p.id)); for (const id of [...kisiler.keys()]) if (!gelen.has(id)) birak(id); for (const p of m.liste.slice(0, 40)) isle(p); });
  AG.dinle('meydan_cik', m => { if (m && typeof m.id === 'string') birak(m.id); });
  /* ---------- alan sohbeti: aynı kanal ve alandakiler; sunucu süzer ve hızı sınırlar ---------- */
  AG.dinle('meydan_soz', m => { if (!api || !m || typeof m.x !== 'string') return; const x = m.x.slice(0, 120);
    if (m.ben) { api.chatAdd('genel', 'Sen', x); api.say(api.player, x.slice(0, 80), 4.5); return; }
    const c = kisiler.get(m.id); if (!c || (c.handle && engelli.has(c.handle))) return;
    sozGunlugu.push({ h: c.handle, n: c.name, x, t: Date.now() }); if (sozGunlugu.length > 80) sozGunlugu.shift();
    api.say(c, x.slice(0, 80), 4.5); api.chatAdd('genel', c.name, x); if (EO2.audio && EO2.audio.pop) EO2.audio.pop(); });
  AG.dinle('meydan_soz_red', () => { if (api) api.chatAdd('sistem', '', 'Çok hızlı yazıyorsun; biraz bekle.'); });
  const sohbetAcik = () => { const a = document.getElementById('app'); if (a) a.classList.toggle('sohbet-acik', AG.cevrimici() && G.live); };
  setInterval(sohbetAcik, 1500);
  AG.dinle('durum', d => { if (d !== 'cevrimici') { hepsiniBirak(); sonJson = ''; alanim = null; } else setTimeout(() => bildir(true), 300); });

  (function bekle() {
    if (!EO2.api || !EO2.hooks || !EO2.hooks.act) return setTimeout(bekle, 120);   // hooks.act'i oyun.js kurar; ondan sonra sarılır
    api = EO2.api;
    EO2.hooks.sohbet = (x, sekme) => { if (!AG.cevrimici() || !G.live) return false; if (EO2.parti && EO2.parti.soz(String(x), sekme)) return true; bildir(true); return AG.gonder({ type: 'meydan_soz', x: String(x).slice(0, 120) }); };   // game.js sohbet kutusu buradan yollar
    const jest0 = EO2.hooks.emote; EO2.hooks.emote = k => { if (jest0) jest0(k); jest = { k, t: Date.now() }; bildir(true); };
    setInterval(() => bildir(false), 100);
    EO2.frameHooks.push(() => { for (const c of kisiler.values()) if (c.etk) { c.etk.x = c.x; c.etk.y = c.y; } });
    const act0 = EO2.hooks.act; EO2.hooks.act = act => { if (typeof act === 'string' && act.startsWith('oyuncu:')) { cagir(act.slice(7)); return true; } return act0 ? act0(act) : false; };
  })();
  EO2.meydanAg = { tazele: () => bildir(true), kisiler, sayi: () => kisiler.size, adOf: h => { for (const c of kisiler.values()) if (c.handle === h) return c.name; return null; } };
})();
