/* Ejder Ocağı 2.0 · Ortak zindan seferi (EO2.zindan) · ilk zindan: Zümrüt Saray
   YÖNTEM (2026-11-17): bu dosya her zindan için aynıdır. Zindanın kendisi (aşamalar, sahne, zemin, düşmanlar, canlar) js/zindan_tarif.js'tedir;
   yeni zindan yalnız oraya eklenir (eo2/docs/ZINDAN_YONTEMI.md). Aşağıdaki Zümrüt Saray notları ilk zindanın tarihçesidir.
   Sunucu tarafı: server/zindan_ortak.js (ortak oda altyapısının "zindan" türü). Bir ile dört terbiyeci aynı sefere girer.
   AKIŞ: Topçu ekranı → Zümrüt Saray seferi (özel sefer kur, kodla katıl, partiyle kur, yoldaş ara) → Sefer Kampı (js/bolumler/sefer-kampi.js)
     → herkes Zümrüt Kapı'da "hazırım" der → aşama savaşı → çark (herkes kendi çarkını çevirir) → kampa dönüş → … → Şahmeran → büyük çark → sefer sonu.
   SAVAŞ: TEK ORTAK SAVAŞ. Sıra, rüzgâr, düşmanların canı, yeri ve hamleleri herkeste aynıdır (sunucu söyler: 'sira' olayı).
     Her turda önce oyuncular sırayla oynar, sonra düşmanlar sırayla saldırır; sıra kimdeyse herkesin ekranında o oynar.
     Düşen oyuncu seyirci kalır; herkes düşerse kampa dönülür ve aynı aşama yeniden denenir.
   ÖDÜL: tek oyunculu seferle aynı kurallar ve aynı fonksiyonlar (js/topcu.js: odulYaz, kucukCark, buyukCark). Yeni miktar ya da olasılık yoktur.
   Aşamalar (kullanıcı kararı): 1) Zümrüt Saray Köprüsü, iki yandan gelen yılanlar. 2) Şahmeran'ın defilesi: dümdüz, kırılmaz zemin; boss sağ uçta yükseltide.
   Şahmeran'ın çizimi V3.1'dir (kullanıcı onayı 2026-11-16; js/topcu_veri.js BOSS.sahmeran_v3). Köprü, defile salonu, seyirciler ve yerdeki yılanlar
   konsept çizimlerdir (kullanıcı onayı 2026-11-17: geçici; tools/zumrut_sahne.mjs dizer). Üretim hâli gelince yalnız o araç ve ASAMA tablosu değişir.
   Uçan engereğin yeni çizimi yok: eskisi durur. Köprü de artık kırılmaz zemin (resim çukur gösteremez). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, OR = EO2 && EO2.ortak, B = EO2 && EO2.battle, T = EO2 && EO2.topcu, V = EO2 && EO2.topcuVeri, app = document.getElementById('app');
  if (!G || !AG || !OR || !B || !T || !V || !V.ZINDAN.sahmeran) return;
  const TARIF = window.EO2_ZINDAN || {};
  /* zindanın adı her yerde aynıdır: haritadaki künye, ortak seferin adını taşır (eski veri "Sırça Saray" diyordu, sefer "Zümrüt Saray") */
  for (const k in TARIF) { const z = EO2.topcuVeri && EO2.topcuVeri.ZINDAN && EO2.topcuVeri.ZINDAN[TARIF[k].odul]; if (z && TARIF[k].ad) z.ad = TARIF[k].ad; }
  const Z = { zindan: Object.keys(TARIF)[0], zorluk: 'normal', hata: '', savas: false, savasBitti: false, sonAsama: null, islenen: -1, seyir: false, davetAcik: false, cagri: null, canT: 0 };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HATA = { tur_bilinmiyor: 'Sefer şu an açık değil.', zaten_odada: 'Zaten bir seferde ya da masadasın.', oda_yok: 'Bu kodla bir sefer yok.', oda_mesgul: 'O sefer yola çıkmış.', oda_dolu: 'Sefer dolu (en çok dört kişi).', yalniz_kurucu: 'Seferi kuran başlatır.', hazir_degil: 'Herkes hazır değil.', cevrimdisi: 'O terbiyeci çevrimiçi değil.', baglanti_yok: 'Sunucuya ulaşılamıyor.', faz_uygun_degil: 'Şu an yapılamaz.' };
  /* Zindanın tarifi js/zindan_tarif.js'tedir (sunucu da aynı dosyayı okur). Buradaki kod her zindan için aynıdır:
     hangi zindanda olduğumuz odanın anahtarından ('zumrut-normal') okunur; oda yokken sefer ekranında seçili olan geçerlidir. */
  const zid = () => { const o = OR.durum().oda, k = o && o.tur === 'zindan' ? String(o.anahtar).split('-')[0] : Z.zindan; return TARIF[k] ? k : Object.keys(TARIF)[0]; };
  const tarif = k => TARIF[k || zid()], zs = k => V.ZINDAN[tarif(k).odul], zad = k => tarif(k).ad;
  /* aşama = arena: tek yükleyici js/battle.js arenaCfg (düello meydanı da onu kullanır) */
  /* çizimsiz arena (arena.json içinde "eski"): zemin, arka plan, deniz ve özel kurallar eski seferin aşamasından alınır; düşman sırası ve adları arena kaydından */
  const eskiAsama = ad => { const R = (window.EO2_ARENA || {})[ad], Zo = R && R.eski && V.ZINDAN[R.eski.zindan], As = Zo && Zo.asama[R.eski.asama]; if (!As) return null; const PX = B.api.PX, x0 = (As.x0 || 460) / PX;
    return { eski: true, As, Zo, ad: As.ad, alt: As.alt, ipucu: As.ipucu, tema: As.tema || Zo.tema, ortam: Zo.ortam, en: 64, oyuncu: [0, -1.5, 1.5, -3].map(dx => ({ x: x0 + dx })), moblar: R.dusman.map(q => ({ tip: q.tip, ad: q.ad })), boss: R.boss ? { tip: R.boss.tip, ad: R.boss.ad, unvan: R.boss.unvan } : null }; };
  const hazirAsama = {}, asamalar = k => { k = k || zid(); return hazirAsama[k] || (hazirAsama[k] = tarif(k).asama.map(ad => B.arenaCfg(ad) || eskiAsama(ad))); };
  /* doğuş yeri: gruptaki sıraya göre mavi kutulardan biri; kutu yetmezse ilk kutunun çevresine dizilir (dünya birimi) */
  const dogus = (A, i) => { const K = A.oyuncu; i = Math.max(0, i); return i < K.length ? K[i].x : K[0].x + [0, -2.8, 2.8, -5.6][i % 4]; };
  const D = () => OR.durum(), oda = () => D().oda, od = () => D().ortak, ben = () => D().ben, benim = () => !!(oda() && oda().tur === 'zindan');
  const seferde = () => benim() && oda().durum === 'oyunda' && !!od();
  const uyeAd = id => { const u = oda() && oda().uyeler.find(x => x.id === id); return u ? (id === ben() ? 'Sen' : u.ad) : 'Yoldaş'; };
  const sahne = () => EO2.api && EO2.api.scene(), kampaGit = () => { if (sahne() !== 'kamp' && EO2.api) EO2.api.go('kamp'); };
  const ses = k => { const a = EO2.audio; if (a && a[k]) a[k](); };

  /* ---------- savaş ---------- */
  function cfgKur(d) { const A = asamalar()[d.asama], zr = V.ZORLUK[d.zorluk], n = oda().uyeler.filter(u => u.bagli).length, o = T.oyuncuDeger(true); if (n > 1) o.dmg = Math.round(o.dmg / 1.40);   // 1,40 yoldaşsız sefer çarpanıdır (js/topcu.js); grupla girilince uygulanmaz
    if (A.eski) { const As = A.As, aile = A.Zo.tema, can = j => d.dusman[j] ? d.dusman[j].max : 1, m0 = As.moblar(1), b0 = As.boss ? As.boss(1) : null;   /* yerler, kalkan ve uçuş yüksekliği eski aşamadan; canlar sunucudan */
      return { kimlik: 'ortak-' + oda().id + '-' + d.tur, kip: 'zindan', baslik: A.ad, alt: 'Aşama ' + (d.asama + 1) + ' / ' + d.n + ' · ' + zr.ad + (n > 1 ? ' · ' + n + ' terbiyeci' : ''), arazi: V.arazi(A.tema, aile, As.f, 11 + d.asama * 7), bg: As.bg, deniz: As.deniz, ozel: As.ozel, ortam: A.ortam,
        x0: dogus(A, oda().uyeler.findIndex(u => u.id === ben())) * B.api.PX, ortak: true, oyuncu: Object.assign(o, As.aci ? { angle: As.aci } : {}), zorluk: zr, moblar: m0.map((m, j) => Object.assign({}, m, { hp: can(j) })), boss: b0 ? Object.assign({}, b0, { hp: can(m0.length) }) : null,
        asama: { ad: zad(), n: d.n, i: d.asama }, ipucu: A.ipucu, cikis: savasAyril, sis: aile === 'kaldera' ? 'rgba(30,6,4,.5)' : aile === 'donanma' ? 'rgba(4,16,34,.5)' : 'rgba(4,14,20,.55)' }; }
    const can = j => d.dusman[j] ? d.dusman[j].max : 1, moblar = A.moblar.map((m, j) => Object.assign({}, m, { hp: can(j) })), boss = A.boss ? Object.assign({}, A.boss, { hp: can(A.moblar.length) }) : null;
    return { kimlik: 'ortak-' + oda().id + '-' + d.tur, kip: 'zindan', baslik: A.ad, alt: 'Aşama ' + (d.asama + 1) + ' / ' + d.n + ' · ' + zr.ad + (n > 1 ? ' · ' + n + ' terbiyeci' : ''), arazi: { tema: A.tema, aile: A.tema, maske: A.maske }, bg: null, sahne: A.sahne, arenaEn: A.en, kameraBoy: A.kameraBoy, ortam: A.ortam, x0: dogus(A, oda().uyeler.findIndex(u => u.id === ben())) * B.api.PX, ortak: true,
      ozel: { mobSinir: A.mobSinir }, oyuncu: o, zorluk: zr, moblar, boss, asama: { ad: zad(), n: d.n, i: d.asama }, ipucu: A.ipucu, cikis: savasAyril, sis: 'rgba(4,14,20,.55)' }; }
  async function savasAyril() { const M = B.state(); if (!M || M.over || M.dur) return; M.dur = true;
    const v = await G.pen({ k: 'Sefer', t: 'Seferden ayrılacak mısın?', body: '<p>Ayrılırsan grubun sensiz sürdürür; bu sefere geri dönemezsin. O ana kadar aldığın ganimet sende kalır.</p>', btns: [{ t: 'Savaşa dön', v: false }, { t: 'Ayrıl', cls: 'kor', v: true }] });
    if (M !== B.state()) return; M.dur = false; if (v) B.kapat(); }
  B.dinle((olay, v) => { if (!Z.savas || !seferde() || od().faz !== 'savas') return;
    if (olay === 'dusman_hasar' && v.i > 0 && v.h > 0) OR.eylem({ t: 'hasar', i: v.i - 1, h: v.h });
    else if (olay === 'dustum') { OR.eylem({ t: 'dustu' }); G.toast('Düştün. Savaş sürüyor: yoldaşlarını izliyorsun, aşama bitince payını alırsın.'); }
    else if (olay === 'adim_bitti') { const s = od().sav; if (s && v.adim < s.adim) siraUygula(s); else OR.eylem({ t: 'tur_bitti', adim: v.adim, ex: v.ex, x: v.x, y: v.y }); }   // bu ekran geride kaldıysa sunucudaki adıma atlar
    else if (olay === 'ates' && v.kim === 0) { const M = B.state(); OR.eylem({ t: 'ates', x: v.x, y: v.y, aci: v.aci, guc: v.guc, yon: v.yon, ruz: M ? M.wind : 0, mod: v.mod || {}, el: M && (M.ben.el === 'ates' || M.ben.el2 === 'ates') ? 'ates' : v.el }); }
    else if (olay === 'oyuk') OR.eylem({ t: 'oyuk', x: v.x, y: v.y, r: v.r });
    else if (olay === 'konum') { const t = Date.now(); if (t - (Z.konumT || 0) > 240) { Z.konumT = t; OR.eylem({ t: 'konum', x: v.x, y: v.y, aci: v.aci, yon: v.yon }); } }
    else if (olay === 'can' && v.kim === 0) { const t = Date.now(); if (t - Z.canT > 350 || v.hp <= 0) { Z.canT = t; OR.eylem({ t: 'can', hp: Math.round(v.hp), max: Math.round(v.max) }); } } });
  const kimden = id => (id === ben() ? 'ben' : id);
  function siraUygula(s) { if (!Z.savas || !s || !s.adim) return; B.ortakSira({ adim: s.adim, tur: s.tur, kim: s.kim ? kimden(s.kim) : null, i: s.i, hedef: kimden(s.hedef), tohum: s.tohum, ruzgar: s.ruzgar, ex: s.ex }); }
  /* yoldaşların topçuları bu ekranda da durur (js/battle.js yoldasKoy); motor savaşı kurana dek beklenir */
  function yoldaslariKur(deneme) { const M = B.state(); if (!Z.savas || !benim()) return; if (!M || !M.on || !M.ben) { if ((deneme || 0) < 40) setTimeout(() => yoldaslariKur((deneme || 0) + 1), 150); return; }
    for (const u of oda().uyeler) { if (u.id === ben() || !u.bagli) continue; const c = EO2.meydanAg && [...EO2.meydanAg.kisiler.values()].find(x => x.handle === u.h); B.yoldasKoy(u.id, { ad: u.ad, set: (c && c.set) || 'temel', gor: EO2.gorunum ? EO2.gorunum.kodOf(u.h) : '', x: dogus(asamalar()[od().asama], oda().uyeler.indexOf(u)) }); } }
  /* savaşa dönüş: bu ekran savaşı baştan kurar; düşman canları ve oyuncunun kendi durumu sunucudaki hâle getirilir. Sıra, giriş bitince sunucudaki adımdan sürer ('adim_bitti'). */
  function canEsitle(deneme) { const M = B.state(), d = od(); if (!Z.savas || !d || d.faz !== 'savas') return; if (!M || !M.on || !M.ben) { if ((deneme || 0) < 40) setTimeout(() => canEsitle((deneme || 0) + 1), 150); return; }
    d.dusman.forEach((q, j) => { if (q.hp < q.max) B.ortakCan(j + 1, q.hp); });
    const me = d.uye[ben()]; if (me && me.hayatta === false) { M.ben.hp = 0; M.ben.dead = true; M.ben.dustuKesin = true; M.ben.revive = 0; } else if (me && me.max > 0 && me.hp > 0) M.ben.hp = Math.min(M.ben.max, me.hp);
    for (const u of oda().uyeler) { const q = d.uye[u.id]; if (u.id !== ben() && q) B.yoldasKoy(u.id, q.hayatta === false ? { dustu: true } : q.max ? { hp: q.hp, max: q.max } : {}); } }
  /* savaştaki yoldaş topçuları odanın hâline uyar: ayrılan ya da bağlantısı kopan yoldaş yere serilir (sırası zaten atlanır), geri gelen ayağa kalkar */
  function yoldasEsitle() { const M = B.state(), d = od(); if (!Z.savas || !M || !M.on || !M.yoldas || !d || d.faz !== 'savas') return;
    for (const id in M.yoldas) { const a = M.yoldas[id], u = oda().uyeler.find(x => x.id === id), q = d.uye[id], yok = !u || !u.bagli || (q && q.hayatta === false);
      if (yok && !a.dustuKesin) { B.yoldasKoy(id, { dustu: true }); if (!u || !u.bagli) G.toast(esc_(a.ad || 'Yoldaş') + (u ? ' bağlantısını yitirdi.' : ' seferden ayrıldı.')); } else if (!yok && a.dustuKesin) B.yoldasKoy(id, Object.assign({ dustu: false }, q && q.max ? { hp: q.hp || q.max, max: q.max } : {})); } }
  async function asamaBaslat(donus) { const d = od(); if (!d || d.faz !== 'savas' || Z.savas) return;
    if (!G.live) return;   /* giriş ekranındayken (sayfa yenilendi, kayıt henüz açılmadı) savaş kurulmaz; ocağa girilince aşağıdaki nöbetçi savaşa döndürür */
    Z.savas = true; Z.savasBitti = false; Z.sonAsama = null; seyirKapat(); G.close(); document.querySelectorAll('.pen-perde').forEach(w => w.remove());
    const cfg = cfgKur(d), bek = B.ac(cfg); yoldaslariKur(); if (donus) canEsitle();
    setTimeout(() => { const M = B.state(); if (M && Z.savas) OR.eylem({ t: 'konum', x: M.ben.x, y: M.ben.y, aci: Math.round(M.ben.angle), yon: M.ben.face }); }, 700);
    setTimeout(() => { if (B.active() && cfg.ipucu) B.ipucu(cfg.baslik, cfg.ipucu); const M = B.state(); if (M) OR.eylem({ t: 'can', hp: Math.round(M.ben.hp), max: Math.round(M.ben.max) }); yoldasCiz(); }, window.__fastFx ? 0 : 2400);
    const r = await bek; Z.savasBitti = true;
    if (r.terk && !Z.sonAsama) { Z.savas = false; yoldasCiz(); OR.cik(); return; }
    if (!r.zafer && !Z.sonAsama && seferde() && od().faz === 'savas') { OR.eylem({ t: 'dustu' }); B.kapat(); seyirAc(); }
    if (Z.sonAsama) sonrasi(); }
  function asamaBitti(o) { Z.sonAsama = o; if (Z.savas && !Z.savasBitti && B.active()) { const M = B.state(); if (M && !M.over) { if (o.zafer) B.sonlandir(true); else B.kapat(); } return; } sonrasi(); }
  /* aşama sonu: çark ve ödül (tek oyunculu seferle aynı fonksiyonlar), sonra kampa dönüş */
  async function sonrasi() { Z.carkta = true; try { await sonrasiIc(); } finally { Z.carkta = false; Z.carkT = Date.now(); } }
  async function sonrasiIc() { const o = Z.sonAsama, d = od(); if (!o || !d || Z.islenen === d.tur * 10 + (o.zafer ? 1 : 0)) return; Z.islenen = d.tur * 10 + (o.zafer ? 1 : 0); Z.sonAsama = null; Z.savas = false; seyirKapat(); if (B.active()) B.kapat(); yoldasCiz(); kampaGit();
    if (!o.zafer) { ses('pop'); await G.pen({ k: zad() + ' · Aşama ' + (o.asama + 1), t: 'Grup düştü', body: '<p>Ayakta kimse kalmadı. Kampta toparlanın; aynı aşama yeniden denenir.</p>', btns: [{ t: 'Kampa dön', cls: 'altin' }] }); return; }
    T.ornekKur({ zindan: tarif().odul, zorluk: d.zorluk });
    if (!o.son) { T.odulYaz('asama'); await T.cark('Aşama ' + (o.asama + 1) + ' temizlendi', '150 altın kesene girdi. Çarkı bir kez çevir.', T.kucukCark(o.asama + 1), false); }
    else { T.odulYaz('zindan', { zindan: tarif().odul, zorluk: d.zorluk }); await T.cark(zs().boss + ' yenildi', 'İlk çeviriş bedava; sonrakiler 120 altın.', T.buyukCark(d.zorluk), true); }
    if (seferde() && od().faz === 'cark') { OR.eylem({ t: 'cark' }); if (oda().uyeler.filter(u => u.bagli).length > 1) G.toast('Yoldaşların çarkını çevirmesi bekleniyor.'); } }
  async function seferSonu(sonuc) { seyirKapat(); if (B.active()) B.kapat(); Z.savas = false; yoldasCiz(); const o = T.ornek();
    if (sonuc && sonuc.kazanan) { ses('win'); await G.pen({ k: zad() + ' · ' + V.ZORLUK[sonuc.zorluk || 'normal'].ad, t: 'Sefer tamamlandı', face: zs().yuz, body: '<p>' + zs().boss + ' yenildi. Seferden dönerken heybende şunlar var:</p>' + (o && o.ganimet.length ? T.ganimetHtml(o.ganimet) : '') + '<p class="tp-ozet"><span><small>Altın</small><b>' + (o ? o.altin : 0) + '</b></span></p>', btns: [{ t: 'Meydana dön', cls: 'altin' }] }); }
    T.ornekKur(null); OR.cik(); if (sahne() === 'kamp' && EO2.api.runAct) EO2.api.runAct('go:meydan'); }

  /* ---------- yoldaş çerçevesi (savaşta) ve seyir (düşünce) ---------- */
  const yoldas = document.createElement('div'); yoldas.id = 'seferYoldas'; yoldas.hidden = true; app.appendChild(yoldas);
  function yoldasCiz() { const d = od(), goster = seferde() && d.faz === 'savas' && (Z.savas || Z.seyir) && oda().uyeler.length > 1; yoldas.hidden = !goster; if (!goster) return;
    yoldas.innerHTML = oda().uyeler.filter(u => u.id !== ben()).map(u => { const q = d.uye[u.id] || {}, oran = q.max ? Math.max(0, Math.min(1, q.hp / q.max)) : 1; return '<div class="sy-yoldas' + (q.hayatta === false ? ' dustu' : '') + (u.bagli ? '' : ' kopuk') + '"><b>' + esc_(u.ad) + '</b><i><s style="width:' + Math.round(oran * 100) + '%"></s></i><small>' + (!u.bagli ? 'Bağlantısı koptu' : q.hayatta === false ? 'Düştü' : q.max ? q.hp + ' / ' + q.max : 'Savaşıyor') + '</small></div>'; }).join(''); }
  const seyir = document.createElement('div'); seyir.id = 'seferSeyir'; seyir.hidden = true; app.appendChild(seyir);
  function seyirAc() { Z.seyir = true; seyirCiz(); yoldasCiz(); }
  function seyirKapat() { Z.seyir = false; seyir.hidden = true; }
  function seyirCiz() { const d = od(); if (!Z.seyir || !seferde() || d.faz !== 'savas') { seyir.hidden = true; return; } const A = asamalar()[d.asama], adlar = [...A.moblar.map(m => m.ad), ...(A.boss ? [A.boss.ad] : [])];
    seyir.hidden = false; seyir.innerHTML = '<div class="ss-kutu cam"><small>' + esc_(A.ad) + '</small><h3>Düştün</h3><p>Yoldaşların savaşı sürdürüyor. Aşama bitince ganimetten payını alırsın.</p><div class="ss-dusman">' + d.dusman.map((q, j) => '<div class="' + (q.hp <= 0 ? 'oldu' : '') + '"><b>' + esc_(adlar[j] || 'Düşman') + '</b><i><s style="width:' + Math.round(q.hp / q.max * 100) + '%"></s></i></div>').join('') + '</div><button type="button" class="gbtn kucuk" data-ss-ayril="1">Seferden ayrıl</button></div>';
    seyir.querySelector('[data-ss-ayril]').addEventListener('click', () => ayril()); }

  /* ---------- sefer şeridi: kampta ve dünyada seferin durumu, hazır düğmesi ---------- */
  const serit = document.createElement('aside'); serit.id = 'seferSerit'; serit.hidden = true; serit.setAttribute('aria-label', 'Sefer'); app.appendChild(serit);
  function seritCiz() { const goster = seferde() && !B.active() && G.live && !(G.ekran && G.ekran()); serit.hidden = !goster; if (!goster) return; const d = od(), A = asamalar()[d.asama], me = d.uye[ben()] || {};
    const imza = JSON.stringify([d.faz, d.asama, d.deneme, d.uye, oda().uyeler.map(u => [u.id, u.bagli]), sahne() === 'kamp']); if (serit.dataset.imza === imza) return; serit.dataset.imza = imza;
    serit.innerHTML = '<header><small>' + zad() + ' · ' + V.ZORLUK[d.zorluk].ad + '</small><b>Aşama ' + (d.asama + 1) + ' / ' + d.n + '</b><span>' + esc_(A.ad) + (d.deneme ? ' · ' + (d.deneme + 1) + '. deneme' : '') + '</span></header>' +
      '<ul>' + oda().uyeler.map(u => { const q = d.uye[u.id] || {}, iyi = d.faz === 'bekleme' ? q.hazir : d.faz === 'cark' ? q.cark : true; return '<li class="' + (iyi ? 'tamam' : '') + (u.bagli ? '' : ' kopuk') + '"><i></i>' + esc_(u.id === ben() ? 'Sen' : u.ad) + '<em>' + (!u.bagli ? 'koptu' : d.faz === 'bekleme' ? (q.hazir ? 'hazır' : 'kampta') : d.faz === 'cark' ? (q.cark ? 'tamam' : 'çarkta') : '') + '</em></li>'; }).join('') + '</ul>' +
      (d.faz === 'bekleme' ? '<button type="button" class="gbtn kucuk ' + (me.hazir ? '' : 'altin') + '" data-sf="hazir">' + (me.hazir ? 'Hazır değilim' : 'Hazırım') + '</button>' : d.faz === 'cark' ? '<p>Çarklar çevriliyor…</p>' : '') +
      (sahne() !== 'kamp' ? '<button type="button" class="gbtn kucuk" data-sf="kamp">Kampa dön</button>' : '');
    serit.querySelectorAll('[data-sf]').forEach(b => b.addEventListener('click', () => { ses('ui'); if (b.dataset.sf === 'hazir') hazir(); else kampaGit(); })); }
  function hazir() { const d = od(); if (!seferde() || d.faz !== 'bekleme') return; const me = d.uye[ben()] || {}; OR.eylem({ t: 'hazir', v: !me.hazir }); }
  async function ayril() { if (!benim()) return; const v = await G.pen({ k: 'Sefer', t: 'Seferden ayrılacak mısın?', body: '<p>Ayrılırsan grubun sensiz sürdürür; bu sefere geri dönemezsin. O ana kadar aldığın ganimet sende kalır.</p>', btns: [{ t: 'Kal', v: false }, { t: 'Ayrıl', cls: 'kor', v: true }] }); if (v) OR.cik(); }
  async function durumPen() { const d = od(); if (!seferde()) return; ses('chirp'); if (EO2.api && EO2.api.emote) EO2.api.emote(0);
    await G.pen({ k: 'Sefer Kampı', t: zad(), body: '<p>Ateş sıcak, sırtın duvara dönük. <b>Aşama ' + (d.asama + 1) + ' / ' + d.n + '</b>: ' + esc_(asamalar()[d.asama].ad) + '.</p><p>' + esc_(asamalar()[d.asama].ipucu) + '</p><p class="soluk">Hazır olan Zümrüt Kapı\'ya yürür. Herkes hazır olunca mühür açılır ve aşama başlar. Aşama bitince çark çevrilir, sonra yine buraya dönülür.</p>', btns: [{ t: 'Kalk', cls: 'altin' }] }); }

  /* kamptaki sandık: bu seferde o ana dek toplanan ganimet (kişiye özel) */
  async function ganimetPen() { if (!seferde()) return; const o = T.ornek(), d = od(); ses('ui');
    await G.pen({ k: 'Sefer Kampı', t: 'Ganimet sandığı', body: (o && o.ganimet.length ? '<p>Bu seferde heybene girenler:</p>' + T.ganimetHtml(o.ganimet) : '<p>Sandık henüz boş. İlk aşamayı temizleyince çarktan çıkan buraya yazılır.</p>') + '<p class="tp-ozet"><span><small>Altın</small><b>' + (o ? o.altin : 0) + '</b></span><span><small>Aşama</small><b>' + (d.asama + 1) + ' / ' + d.n + '</b></span></p><p class="soluk">Ganimet kişiye özeldir; herkes kendi çarkını çevirir.</p>', btns: [{ t: 'Kapat', cls: 'altin' }] }); }

  /* ---------- sunucudan gelenler ---------- */
  OR.dinle((olay, v) => {
    if (olay === 'davet') return davetGeldi(v);
    if (olay === 'hata') { if (benim() || G.ekran() === 'zindan') { Z.hata = HATA[v.kod] || 'İşlem yapılamadı.'; if (G.ekran() === 'zindan') G.redraw(); else G.toast(Z.hata); } return; }
    if (olay === 'ayrildi') { const vardi = Z.savas || Z.seyir || sahne() === 'kamp'; seyirKapat(); if (B.active() && Z.savas) B.kapat(); Z.savas = false; yoldasCiz(); seritCiz(); T.ornekKur(null); if (vardi && sahne() === 'kamp' && EO2.api.runAct) EO2.api.runAct('go:meydan'); if (G.ekran() === 'zindan') G.redraw(); return; }
    if (!benim()) return;
    if (olay === 'oda' && Z.tek && v.durum === 'bekliyor') { Z.tek = false; OR.baslat(); }   // tek kişilik sefer: toplanma beklenmez, doğrudan kampa çıkılır
    if (olay === 'oda' && Z.cagri && v.durum === 'bekliyor') { const c = Z.cagri; Z.cagri = null; for (const h of c) OR.davet(h); G.toast('Sefer davetin gitti.'); }
    if (olay === 'basladi') { Z.hata = ''; Z.islenen = -1; T.ornekKur({ zindan: tarif().odul, zorluk: v.durum.zorluk }); if (G.ekran()) G.close(); ses('chime'); kampaGit(); if (v.durum.faz === 'savas') setTimeout(asamaBaslat, 900); else G.toast('<b>' + zad() + '</b> seferi başladı. Hazır olan Zümrüt Kapı\'ya yürüsün.', 'goal'); }
    if (olay === 'olay') for (const o of v.olaylar) {
      if (o.t === 'asama_basla') { Z.baslaT = Date.now(); setTimeout(asamaBaslat, sahne() === 'kamp' ? 500 : 1400); }
      else if (o.t === 'hasar' && o.kim !== ben() && Z.savas) B.ortakHasar(o.i + 1, o.h, uyeAd(o.kim));
      else if (o.t === 'konum' && o.kim !== ben() && Z.savas) B.yoldasKoy(o.kim, o);
      else if (o.t === 'ates' && o.kim !== ben() && Z.savas) B.yoldasAtes(o.kim, o);
      else if (o.t === 'oyuk' && o.kim !== ben() && Z.savas) B.yoldasOyuk(o);
      else if (o.t === 'can' && o.kim !== ben() && Z.savas) B.yoldasKoy(o.kim, { hp: o.hp, max: o.max });
      else if (o.t === 'sira' && Z.savas) siraUygula(o);
      else if (o.t === 'tur_bitti' && o.kim !== ben() && Z.savas) { B.yoldasKoy(o.kim, { x: o.x, y: o.y }); if (od().sav && od().sav.kim === o.kim && od().sav.adim === o.adim) B.ortakPas(o.kim); }
      else if (o.t === 'dustu' && o.kim !== ben()) { if (Z.savas) B.yoldasKoy(o.kim, { dustu: true }); G.toast(esc_(uyeAd(o.kim)) + ' düştü.'); }
      else if (o.t === 'asama_bitti') asamaBitti(o);
      else if (o.t === 'kampa_don') { ses('chime'); kampaGit(); G.toast('Sıradaki aşama: <b>' + esc_(asamalar()[o.asama].ad) + '</b>. Hazır olan kapıya.', 'goal'); }
      else if (o.t === 'hazir' && o.kim !== ben() && o.v && od().faz === 'bekleme') G.toast(esc_(uyeAd(o.kim)) + ' hazır.'); }   // son hazır olan aşamayı başlatır: o an bildirim çıkmaz
    if (olay === 'bitti') seferSonu(v.sonuc);
    yoldasEsitle(); yoldasCiz(); seyirCiz(); seritCiz(); if (G.ekran() === 'zindan') G.redraw(); });
  setInterval(() => { seritCiz();
    /* çark aşamasında bu ekranda çark açık değilse (sayfa çark sırasında yenilendi) grup bekletilmez: çark geçilir. Ödül iki kez yazılmasın diye çark yeniden açılmaz. */
    if (seferde() && od().faz === 'cark' && !(od().uye[ben()] || {}).cark && !Z.savas && !Z.sonAsama && !Z.carkta && !B.active() && G.live && Date.now() - (Z.carkT || 0) > 6000) { Z.carkT = Date.now(); OR.eylem({ t: 'cark' }); G.toast('Sayfa yenilendiği için bu aşamanın çarkı geçildi. Sefer sürüyor.'); }
    // sefer savaştayken bu ekranda savaş açık değilse (sayfa yenilendi ya da bağlantı kopup geldi) savaşa geri dönülür
    if (seferde() && od().faz === 'savas' && !Z.savas && !Z.sonAsama && !B.active() && G.live && Date.now() - (Z.donusT || 0) > 4000 && Date.now() - (Z.baslaT || 0) > 5000) {   /* aşama yeni başlıyorsa olağan başlangıç beklenir */ Z.donusT = Date.now(); G.toast('Sefer sürüyor: savaşa dönüyorsun.', 'goal'); T.ornekKur(T.ornek() || { zindan: tarif().odul, zorluk: od().zorluk }); asamaBaslat(true); } const L = EO2.api && EO2.api.sceneState && EO2.api.sceneState().L, k = L && L.id === 'kamp' && (L.interact || []).find(i => i.id === 'kapi'), d = od();
    if (k && seferde()) { const me = d.uye[ben()] || {}; k.sub = d.faz !== 'bekleme' ? 'Mühür kapalı' : me.hazir ? 'Hazırsın · vazgeç' : 'Aşama ' + (d.asama + 1) + ': hazırım'; }
    if (sahne() === 'kamp' && !seferde() && G.live && !Z.cikiyor && EO2.api.runAct) { Z.cikiyor = true; EO2.api.runAct('go:meydan'); setTimeout(() => { Z.cikiyor = false; }, 3000); } }, 500);
  (function bagla() { if (!EO2.hooks || !EO2.hooks.act) return setTimeout(bagla, 120); const a0 = EO2.hooks.act;
    EO2.hooks.act = act => { if (typeof act === 'string' && act.startsWith('zindan:')) { const k = act.slice(7); if (k === 'hazir') hazir(); else if (k === 'durum') durumPen(); else if (k === 'ganimet') ganimetPen(); else if (k === 'ayril') ayril(); return true; } return a0 ? a0(act) : false; }; })();

  /* ---------- davet ---------- */
  async function davetGeldi(v) { if (!v || v.tur !== 'zindan' || Z.davetAcik || !G.live || oda()) return; Z.davetAcik = true; const zr = String(v.anahtar || '').split('-')[1], zk = TARIF[String(v.anahtar || '').split('-')[0]] ? String(v.anahtar).split('-')[0] : Z.zindan;
    const ad = (EO2.meydanAg && EO2.meydanAg.adOf(v.from)) || v.ad || 'Bir terbiyeci';
    const k = await G.pen({ k: 'Sefer daveti', t: zad(zk), face: zs(zk).yuz, body: '<p><b>' + esc_(ad) + '</b> seni ' + zad(zk) + ' seferine çağırıyor' + (V.ZORLUK[zr] ? ' (' + V.ZORLUK[zr].ad + ')' : '') + '.</p><p>' + esc_(tarif(zk).tanitim) + ' Aşamalar arasında kampta toplanırsınız; ganimet herkese ayrı düşer.</p>' + (T.kilitli() ? '<p class="kotu">Sefere çıkmak için omuz ejderin olmalı (Sonsuz Gençlik İksiri içmiş bir yavru).</p>' : ''), btns: [{ t: 'Şimdi değil', v: false }, { t: 'Sefere katıl', cls: 'altin', v: true, off: T.kilitli() ? 'Omuz ejderi gerek' : '' }] });
    Z.davetAcik = false; if (k && OR.katil(v.kod)) G.open('zindan'); }
  function cagir(h, ad) { if (!AG.cevrimici()) return G.toast('Sunucuya ulaşılamıyor.'); if (T.kilitli()) return G.toast('Sefere çıkmak için omuz ejderin olmalı.'); const o = oda();
    if (o && benim() && o.durum === 'bekliyor') { OR.davet(h); G.toast('Sefer davetin ' + esc_(ad || 'terbiyeciye') + ' gitti.'); } else if (o) return G.toast('Önce bulunduğun seferden ya da masadan ayrıl.'); else { Z.cagri = [h]; OR.kur('zindan', Z.zindan + '-' + Z.zorluk, { ozel: true }); }
    G.open('zindan'); }

  /* ---------- ekran: sefer kurma ve toplanma ---------- */
  function lobi() { const ZS1 = zs(Z.zindan), ZAD1 = zad(Z.zindan); const k = D().kuyruk, kil = T.kilitli(), parti = EO2.parti && EO2.parti.durum().parti, lider = parti && parti.lider === (AG.kimlik() || {}).handle;
    return '<div class="zn-lobi"><div class="zn-kart"><img class="zn-yuz" alt="" src="' + ZS1.yuz + '"><small>Ortak sefer · 1 ile 4 terbiyeci</small><h2>' + esc_(ZAD1) + '</h2><p>' + esc_(tarif(Z.zindan).tanitim) + ' Hepiniz aynı savaştasınız: sırayla atarsınız, düşman kime saldırırsa herkes onu görür. Düşen arenada kalır ve izler.</p><p>Aşamalar arasında <b>Sefer Kampı</b>\'na dönersiniz. Her aşamadan sonra herkes kendi çarkını çevirir; ganimet kişiye özeldir.</p>' +
        (Object.keys(TARIF).length > 1 ? '<div class="zn-zorluk" role="group" aria-label="Zindan">' + Object.keys(TARIF).map(z => '<button type="button" class="gbtn kucuk" data-zin="' + z + '" aria-pressed="' + (Z.zindan === z) + '">' + esc_(TARIF[z].ad) + '</button>').join('') + '</div>' : '') + '<div class="zn-zorluk" role="group" aria-label="Zorluk">' + Object.keys(V.ZORLUK).map(z => '<button type="button" class="gbtn kucuk" data-zor="' + z + '" aria-pressed="' + (Z.zorluk === z) + '">' + V.ZORLUK[z].ad + '</button>').join('') + '</div></div>' +
      '<div class="zn-secenek">' + (kil ? '<p class="zn-muhur">Mühürlü: sefere yalnız omuz ejderi olan çıkar.</p><button type="button" class="gbtn" data-zn="kilit">Nasıl açılır?</button>' :
        '<button type="button" class="gbtn altin buyuk" data-zn="kur">Sefer kur<small>kodu dostuna ver ya da çağır; tek başına da çıkılır</small></button>' +
        (parti && lider ? '<button type="button" class="gbtn buyuk" data-zn="parti">Partiyle kur<small>' + (parti.uyeler.length - 1) + ' yoldaşına davet gider</small></button>' : '') +
        (k ? '<button type="button" class="gbtn buyuk" data-zn="kuyruk-cik">Aramayı bırak<small>yoldaş aranıyor…</small></button>' : '<button type="button" class="gbtn buyuk" data-zn="kuyruk">Yoldaş ara<small>aynı seferi arayanlarla eşleşirsin</small></button>') +
        '<form class="ms-kod" data-zn-form="1"><label for="znKod">Sefer kodu</label><div><input id="znKod" name="kod" maxlength="8" placeholder="ORT-ABCD" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>') + '</div></div>'; }
  function toplanma(o) { const kurucu = o.kurucu === ben(), bn = o.uyeler.find(u => u.id === ben()) || {}, zr = o.anahtar.split('-')[1], hazirlar = o.uyeler.every(u => u.id === o.kurucu || u.hazir);
    return '<div class="zn-toplan"><div class="ms-kodluk"><small>Sefer kodu · ' + zad() + ' · ' + (V.ZORLUK[zr] ? V.ZORLUK[zr].ad : '') + '</small><b>' + esc_(o.kod) + '</b></div><div class="zn-koltuklar">' + [0, 1, 2, 3].map(i => { const u = o.uyeler[i];
        return '<div class="zn-koltuk' + (u ? (u.hazir || u.id === o.kurucu ? ' hazir' : '') : ' bos') + '"><canvas width="96" height="96" aria-hidden="true" data-yuz="' + (u ? i : '') + '"></canvas><b>' + (u ? esc_(u.id === ben() ? 'Sen' : u.ad) : 'Boş yer') + '</b><em>' + (!u ? 'Yoldaş bekleniyor' : u.id === o.kurucu ? 'Seferi kurdu' : u.hazir ? 'Hazır' : 'Hazır değil') + (u && !u.bagli ? ' · koptu' : '') + '</em></div>'; }).join('') + '</div>' +
      '<div class="ms-eylem"><button type="button" class="gbtn" data-zn="cik">Seferden ayrıl</button>' + (kurucu ? '<button type="button" class="gbtn altin buyuk" data-zn="baslat" ' + (hazirlar ? '' : 'disabled') + '>Kampa çık<small>' + (o.uyeler.length === 1 ? 'tek başına' : hazirlar ? o.uyeler.length + ' terbiyeci' : 'herkes hazır olmalı') + '</small></button>' : '<button type="button" class="gbtn altin buyuk" data-zn="hazir">' + (bn.hazir ? 'Hazır değilim' : 'Hazırım') + '</button>') + '</div></div>'; }
  G.screen('zindan', { k: 'Ortak sefer', t: zad(), cls: 'zn', bg: 'a:tp-kapilar', enter() { Z.hata = ''; if (AG.cevrimici()) AG.gonder({ type: 'ortak_durum' }); }, draw(body) {
    if (!AG.cevrimici()) { body.innerHTML = '<div class="ar-kilit bos"><p>Ortak sefer çevrimiçi oynanır. Sunucuya ulaşılınca açılır.</p></div>'; return; }
    const o = benim() ? oda() : null;
    body.innerHTML = '<div class="zn-kok">' + (o && o.durum === 'bekliyor' ? toplanma(o) : o ? '<div class="ar-kilit bos"><p>Sefer sürüyor. Kampa dönmek için ekranı kapat.</p></div>' : lobi()) + (Z.hata ? '<p class="ms-hata" role="alert">' + esc_(Z.hata) + '</p>' : '') + '</div>';
    if (o) body.querySelectorAll('[data-yuz]').forEach(cv => { const u = o.uyeler[+cv.dataset.yuz]; if (!cv.dataset.yuz || !u) return; const c = EO2.meydanAg && [...EO2.meydanAg.kisiler.values()].find(x => x.handle === u.h); try { EO2.api.drawPortrait(cv, u.id === ben() ? EO2.api.player.set : (c && c.set) || 'temel', 0.66, u.id === ben() ? true : u.h); } catch (_) { } });
    body.querySelectorAll('[data-zin]').forEach(b => b.addEventListener('click', () => { Z.zindan = b.dataset.zin; ses('ui'); G.redraw(); }));
    body.querySelectorAll('[data-zor]').forEach(b => b.addEventListener('click', () => { Z.zorluk = b.dataset.zor; ses('ui'); G.redraw(); }));
    const fk = body.querySelector('[data-zn-form]'); if (fk) { const gir = fk.elements.kod, KY = Z.kodYazi || (Z.kodYazi = { v: '', odak: false }); gir.value = KY.v; gir.addEventListener('input', () => { KY.v = gir.value; }); gir.addEventListener('focus', () => { KY.odak = true; }); gir.addEventListener('blur', () => { if (gir.isConnected) KY.odak = false; }); if (KY.odak) { gir.focus(); try { gir.setSelectionRange(gir.value.length, gir.value.length); } catch (_) { } }   /* ekran yenilenince yazılan kod ve imleç korunur */
      for (const ad of ['keydown', 'keyup', 'keypress']) gir.addEventListener(ad, e => e.stopPropagation()); fk.addEventListener('submit', e => { e.preventDefault(); const kod = (gir.value || '').trim(); Z.hata = kod ? '' : 'Sefer kodunu yaz.'; if (kod) OR.katil(kod); G.redraw(); }); }
    body.querySelectorAll('[data-zn]').forEach(b => b.addEventListener('click', () => { ses('ui'); const k = b.dataset.zn; Z.hata = '';
      if (k === 'kur') OR.kur('zindan', Z.zindan + '-' + Z.zorluk, { ozel: true }); else if (k === 'kuyruk') OR.kuyruk('zindan', Z.zindan + '-' + Z.zorluk); else if (k === 'kuyruk-cik') OR.kuyrukCik();
      else if (k === 'parti') { const p = EO2.parti.durum().parti, benH = (AG.kimlik() || {}).handle; Z.cagri = p.uyeler.filter(u => u.h !== benH && u.cevrimici).map(u => u.h); OR.kur('zindan', Z.zindan + '-' + Z.zorluk, { ozel: true }); }
      else if (k === 'hazir') { const u = oda().uyeler.find(x => x.id === ben()); OR.hazir(!(u && u.hazir)); } else if (k === 'baslat') OR.baslat(); else if (k === 'cik') OR.cik();
      else if (k === 'kilit') { G.close(); G.open('topcu'); }
      G.redraw(); }));
  } });
  /* Topçu ekranındaki Sırça Saray künyesine giriş düğmesi */
  setInterval(() => { const alt = document.querySelector('#scrB.tp .tp-k-alt'); const zk = Object.keys(TARIF).find(k => TARIF[k].odul === T.secili()); if (!alt || !zk || alt.querySelector('[data-ortak-sefer]')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'gbtn'; b.dataset.ortakSefer = '1'; b.innerHTML = 'Ortak sefer<small>' + esc_(TARIF[zk].ad) + ' · 1-4 terbiyeci</small>'; b.addEventListener('click', () => { ses('ui'); Z.zindan = zk; G.open('zindan'); }); alt.appendChild(b); }, 500);
  /* tek kişilik giriş (js/topcu.js): aynı sefer, içinde tek kişi */
  const tekAnahtar = odul => Object.keys(TARIF).find(k => TARIF[k].odul === odul);
  function tekBasla(odul, zorluk) { const zk = tekAnahtar(odul); if (!zk || !AG.cevrimici() || oda()) { if (zk && oda()) G.toast('Önce bulunduğun seferden ya da masadan ayrıl.'); return !!(zk && oda()); }
    Z.zindan = zk; Z.zorluk = V.ZORLUK[zorluk] ? zorluk : 'normal'; Z.tek = true; Z.hata = ''; if (G.ekran()) G.close(); OR.kur('zindan', zk + '-' + Z.zorluk, { ozel: true }); return true; }
  EO2.zindan = { tekVar: odul => !!tekAnahtar(odul) && AG.cevrimici(), tekBasla, cagir, durum: () => Z, get ASAMA() { return asamalar(); }, tarif, hazir, seferde };
})();
