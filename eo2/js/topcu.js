/* Ejder Ocağı 2.0 · Ejder Topçusu ve Zindan ekranı
   G.open('topcu') ile açılır. Kip seçimi bir liste değil, bir sahnedir: üç zindan kapısı, önde talim alanı, yanda kervan yolu.
   Buradaki akış eski oyunun akışıdır: iksir kapısı (canEnterZindanOrTopcu), prolog çizgi romanı, dört aşamalı sefer, her ara
   aşamadan sonra 150 altın ve Öncü Ganimet Çarkı, final zaferinde zindan ganimeti, zafer çizgi romanı ve Ulu Kader Çarkı.
   Her sefer bir ÖRNEKtir (ornek): zindan, zorluk, aşama ve toplanan ganimet orada durur; seferden çıkılınca sıfırlanır.
   Ödül yazan tek yer odulYaz()'dır; miktarlar ve olasılıklar js/minigame/shm_ui.js ve shm_data.js ile aynıdır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, B = EO2.battle, V = EO2.topcuVeri, el = G.el, OLD = G.OLD;
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  /* AŞAMA YOLU (ekonomi raporu 2026-11-20, O1): yeni yöntemle kurulmuş zindanın (js/zindan_tarif.js) çevrimdışı tek kişilik
     seferi, çevrimiçi seferle aynı sayıda aşama oynar: tarifteki aşama sayısı kadar, son aşama hep boss. Böylece çevrimiçi ve
     çevrimdışı aynı ödülü verir (Zümrüt Saray: 1 ara aşama + Şahmeran). Tarifi olmayan zindan eski aşamalarının hepsini oynar. */
  const yolu = z => { const Z = V.ZINDAN[z], tum = Z.asama.map((_, i) => i), tarif = Object.values(window.EO2_ZINDAN || {}).find(t => t && t.odul === z);
    const n = tarif && Array.isArray(tarif.asama) ? tarif.asama.length : 0;
    return n >= 1 && n < tum.length ? [...tum.slice(0, n - 1), tum.length - 1] : tum; };
  const kilitli = () => typeof canEnterZindanOrTopcu === 'function' ? !canEnterZindanOrTopcu() : false;
  const kayit = () => { S.topcu = S.topcu || {}; const T = S.topcu; T.ganimet = T.ganimet || {}; T.zafer = T.zafer || {}; T.okundu = T.okundu || {}; T.zorluk = T.zorluk || {}; return T; };
  const sofra = () => !!(S.sofraBuff && S.sofraBuff.week === S.week);
  let ornek = null;                                 // etkin sefer örneği
  let secili = null, sonKaydir = null;

  /* ---------- oyuncunun savaş değerleri: eski calcMainDragonSynergy ve initSahmeranBattleStage ile aynı formüller ---------- */
  function oyuncuDeger(pve) {
    const star = (typeof byId === 'function' && byId(S.star)) || S.dragons[0] || { name: 'Kor', el: 'ates', st: { gu: 68, ce: 66, da: 68, ze: 66 }, bond: 75, gen: 2 }, st = star.st || {};
    const gu = Math.max(10, +st.gu || 68), ce = Math.max(10, +st.ce || 66), da = Math.max(10, +st.da || 68), ze = Math.max(10, +st.ze || 66), bond = Math.max(0, Math.min(100, star.bond != null ? +star.bond : 75)), gen = Math.max(1, star.gen != null ? +star.gen : 2);
    const hpBonus = Math.round(da * 3.5 + bond * 2.4 + gen * 45), staBonus = Math.round(ce * 0.25 + bond * 0.14 + gen * 3), crit = Math.min(48, Math.round(ze * 0.18 + ce * 0.10 + bond * 0.08 + gen * 2)), dmgPct = Math.round(gu * 0.15 + bond * 0.08 + gen * 3);
    const dmg = Math.round(210 * (pve ? 1.40 : 1.0) * (sofra() ? 1.15 : 1.0) * (1 + dmgPct * 0.005));      // 1,40: yoldaşsız sefer çarpanı (eski soloMult)
    const P = EO2.api.player, ors = EO2.ors ? EO2.ors.carpan() : 1;   // Kor Örsü: Ejder Topu'nun kademesi (kademe başına yüzde 2; çatlak topta artış yok)
    return { ad: P.name || 'Terbiyeci', set: P.set, hp: Math.round((1350 + hpBonus) * ors), sta: 100 + staBonus + 25 + (sofra() ? 25 : 0), rage: 40, revive: 1, dmg: Math.round(dmg * ors), el: star.el || 'ates', el2: star.el2 || null, crit, ejder: star.name };
  }

  /* ================= ÖDÜL: yerel kayda (S) yazan tek fonksiyon =================
     tur: 'asama' | 'zindan' | 'kervan' | 'cark' | 'cark-ucret'. Dönen değer gösterilecek satırlardır.
     Altın, ün, yem ve yumurta doğrudan S'ye yazılır. Kor taşı, cevher, kalıp ve öz chibi sisteminin malıdır: o sistem yüklüyse
     awardChibiStones çağrılır; 2.0'da henüz yüklü olmadığından S.topcu.ganimet defterine yazılır (aynı anahtar, aynı miktar). */
  const TAS_AD = { kor_t1: 'Kıvılcım Kor Taşı', kor_t2: 'Harlı Kor Taşı', kor_t3: 'Kadim Magma Taşı', kiyamet_ozu: 'Kıyamet Özü', anka_koruma: 'Anka Mühür Taşı', obsidiyen: 'Obsidiyen Cevheri', kehribar: 'Donmuş Kehribar', mercan: 'Derin Mercan Taşı', yildirim: 'Yıldırım Kuvarsı', sahmeran_kalip: 'Şahmeran Sırça Kalıbı', kalgarot_kalip: 'Kalgarot Kor Kalıbı', abra_kalip: 'Abra Leviathan Kalıbı', kalip_zirh: 'Zırh, miğfer ya da pelerin kalıp parçası', kalip_silah: 'Silah, tılsım ya da maske kalıp parçası' };
  function odulYaz(tur, o) {
    o = o || {}; const T = kayit(), satir = [], altin = n => { S.gold = (S.gold || 0) + n; if (ornek) ornek.altin += n; satir.push(fmt(n) + ' altın'); };
    const tas = d => { if (typeof awardChibiStones === 'function') awardChibiStones(d); else for (const k in d) T.ganimet[k] = (T.ganimet[k] || 0) + d[k]; for (const k in d) if (d[k] > 0) satir.push(d[k] + ' × ' + (TAS_AD[k] || k)); };
    if (tur === 'asama') altin(150);
    else if (tur === 'cark-ucret') { S.gold -= 120; }
    else if (tur === 'kervan') { const ROTA = { kizil_vadi: 'obsidiyen', buzul_gecidi: 'kehribar', mercan_kiyisi: 'mercan', firtina_bogazi: 'yildirim' }, cevher = ROTA[o.rota] || 'obsidiyen';
      const d = { [cevher]: 1 + (Math.random() < 0.45 ? 1 : 0) + 1, kor_t2: 1 + (Math.random() < 0.45 ? 1 : 0) + (sofra() && Math.random() < 0.20 ? 1 : 0) };      // +1: eski baskın kipindeki yoldaş payı (caravanCoopCount 1)
      if (Math.random() < 0.25) d.kor_t3 = 1; if (Math.random() < 0.35) d[Math.random() < 0.5 ? 'sahmeran_kalip' : 'kalgarot_kalip'] = 1;
      tas(d); altin(180); S.un = (S.un || 0) + 8; satir.push('8 ün'); if (S.hub && S.hub.caravan) { S.hub.caravan.dispatched = true; S.hub.caravan.ambushed = false; } }
    else if (tur === 'zindan') { const Z = V.ZINDAN[o.zindan], k = Z.kalip, t2 = 2 + (sofra() && Math.random() < 0.20 ? 1 : 0);
      if (o.zorluk === 'normal') { tas({ [k]: 1, kor_t2: t2 }); altin(250); } else { const d = { [k]: 2, kor_t2: t2 }; if (Math.random() < 0.50) d.kor_t3 = 1; tas(d); altin(500); }
      S.sahmeranRaid = S.sahmeranRaid || { ownedLoot: [], clears: 0, bestRank: 'S+' }; S.sahmeranRaid.clears = (S.sahmeranRaid.clears || 0) + 1; T.zafer[o.zindan] = (T.zafer[o.zindan] || 0) + 1; if (typeof chron === 'function') chron(Z.boss + ' yenildi (' + V.ZORLUK[o.zorluk].ad + ' sefer).'); }
    else if (tur === 'cark') { const id = o.dilim.id;
      if (id === 'minor_gold_120') altin(120); else if (id === 'minor_gold_220') altin(220);
      else if (id === 'minor_food_2') { S.food = S.food || {}; const ks = ['biber', 'mantar', 'kar', 'balik', 'zambak']; for (let i = 0; i < 2; i++) { const f = ks[Math.floor(Math.random() * ks.length)]; S.food[f] = (S.food[f] || 0) + 1; satir.push('1 × ' + ((typeof FOODS !== 'undefined' && FOODS[f] && FOODS[f].ad) || f)); } }
      else if (id === 'minor_kort1_2') tas({ kor_t1: 2 }); else if (id === 'minor_kort1_3') tas({ kor_t1: 3 }); else if (id === 'minor_kort2_1') tas({ kor_t2: 1 });
      else if (id === 'minor_feast_1') { S.food = S.food || {}; S.food.ziyafet = (S.food.ziyafet || 0) + 1; S.food.biber = (S.food.biber || 0) + 2; satir.push('1 × Ejder Ziyafeti', '2 × Biber'); }
      else if (id === 'minor_ore_1') { const ks = ['obsidiyen', 'kehribar', 'mercan', 'yildirim']; tas({ [ks[Math.floor(Math.random() * ks.length)]]: 2 }); }
      else if (id === 'major_gold') altin(450); else if (id === 'major_kort2_2') tas({ kor_t2: 2 }); else if (id === 'major_kort2_3') tas({ kor_t2: 3 }); else if (id === 'major_kort3_1') tas({ kor_t3: 1 });
      else if (id === 'major_egg_1') { if (!Array.isArray(S.eggs)) S.eggs = []; const e = ['ates', 'buz', 'firtina', 'toprak', 'golge'][Math.floor(Math.random() * 5)];
        S.eggs.push({ id: 'e' + (S.uid ? S.uid++ : Date.now()), genes: randomGenes({ q: 0.52, el: e }), sex: Math.random() < 0.5 ? 'F' : 'M', traits: ['asil'], w: 0, inK: typeof kuluckaFree === 'function' ? kuluckaFree() > 0 : false, gen: 2, parents: null, origin: 'Zindan Kader Çarkı Hazinesi' }); satir.push('Mühürlü Soy Yumurtası'); }
      else if (id === 'major_shard_armor' || id === 'major_shard_wpn') tas({ [V.ZINDAN[o.zindan].kalip]: 1, [id === 'major_shard_armor' ? 'kalip_zirh' : 'kalip_silah']: 1 });
      else if (id === 'major_jackpot') tas({ anka_koruma: 1, kiyamet_ozu: 1 }); }
    if (typeof afterAction === 'function') afterAction(true); else if (typeof saveGame === 'function') saveGame(); if (G.hud) G.hud();
    return satir;
  }

  /* ---------- ganimet çarkları: dilimler ve ağırlıklar eski getMinorWheelSlices / getMajorWheelSlices ile aynı ---------- */
  const kucukCark = asama => [['minor_gold_120', 25, '120 altın', '#7c5218'], ['minor_food_2', 22, 'İki kiler erzağı', '#3d5a34'], ['minor_kort1_2', 20, '2 Kıvılcım Kor Taşı', '#5e3a24'], ['minor_gold_220', 12, '220 altın', '#8f621c'], ['minor_feast_1', 9, 'Ziyafet ve biber', '#4a6b28'], ['minor_kort1_3', 6, '3 Kıvılcım Kor Taşı', '#6e4226'], ['minor_ore_1', 4, '2 kervan cevheri', '#2b5468'], ['minor_kort2_1', asama === 3 ? 4 : 2, 'Harlı Kor Taşı', '#8a241c']].map((d, i) => ({ idx: i, id: d[0], w: d[1], ad: d[2], renk: d[3] }));
  const buyukCark = zorluk => { const k = zorluk === 'zor' ? 1.35 : 1.0; return [['major_gold', 28, '450 altın', '#8a5a18'], ['major_kort2_2', 24, '2 Harlı Kor Taşı', '#5e3a24'], ['major_kort2_3', 16, '3 Harlı Kor Taşı', '#6e4226'], ['major_kort3_1', 12, 'Kadim Magma Taşı', '#7a2e1c'], ['major_egg_1', 8, 'Mühürlü Soy Yumurtası', '#2b5468'], ['major_shard_armor', +(6 * k).toFixed(2), 'Zırh kalıbı', '#58246e'], ['major_shard_wpn', +(4 * k).toFixed(2), 'Silah kalıbı', '#6e1c48'], ['major_jackpot', +(2 * k).toFixed(2), 'Anka Mührü ve Kıyamet Özü', '#9e1c1c']].map((d, i) => ({ idx: i, id: d[0], w: d[1], ad: d[2], renk: d[3] })); };
  function cark(baslik, ust, dilimler, buyuk) { let donus = 0, sayi = 0, mesgul = false;
    const n = dilimler.length, der = 360 / n, kon = 'conic-gradient(from ' + (-der / 2) + 'deg,' + dilimler.map((d, i) => d.renk + ' ' + (i * der) + 'deg ' + ((i + 1) * der) + 'deg').join(',') + ')';
    const body = '<div class="tp-cark"><div class="tp-teker" style="background:' + kon + '">' + dilimler.map((d, i) => '<span style="transform:rotate(' + (i * der) + 'deg)"><b>' + d.ad + '</b></span>').join('') + '<i class="tp-gobek"></i></div><i class="tp-ok"></i></div><p class="tp-cark-son" aria-live="polite">' + ust + '</p>';
    return G.pen({ k: buyuk ? 'Ulu Kader Çarkı' : 'Öncü Ganimet Çarkı', t: baslik, body, wide: true, btns: [{ t: 'Çarkı çevir', cls: 'altin', fn(p, done) { if (mesgul) return { keep: true }; const btn = p.querySelector('.pen-f .gbtn'), son = p.querySelector('.tp-cark-son');
        if (sayi > 0 && !buyuk) { done(true); return { keep: true }; }
        if (sayi > 0 && buyuk) { if (btn.dataset.bitir) { done(true); return { keep: true }; } }
        if (sayi > 0) { if ((S.gold || 0) < 120) { son.textContent = 'Bir daha çevirmek için 120 altın gerek.'; return { keep: true }; } odulYaz('cark-ucret'); }
        let sec = dilimler[0], r = Math.random() * dilimler.reduce((a, d) => a + d.w, 0); for (const d of dilimler) { r -= d.w; if (r <= 0) { sec = d; break; } }
        donus = (Math.floor(donus / 360) + 4) * 360 + (360 - sec.idx * der); mesgul = true; sayi++; p.querySelector('.tp-teker').style.transform = 'rotate(' + donus + 'deg)'; if (EO2.audio) EO2.audio.whoosh();
        const tik = setInterval(() => { if (EO2.audio) EO2.audio.ui(); }, 160);
        setTimeout(() => { clearInterval(tik); mesgul = false; const s = odulYaz('cark', { dilim: sec, zindan: ornek && ornek.zindan }); { const ek = s.filter(q => q !== sec.ad); son.innerHTML = '<span class="tp-kazanc"><small>Kazandın</small><b>' + sec.ad + '</b>' + (ek.length ? '<em>' + ek.join(', ') + '</em>' : '') + '</span>'; }   /* ödül adı ile yazılan ödül aynıysa bir kez yazılır */ if (ornek) ornek.ganimet.push(...s); if (EO2.audio) EO2.audio.chime(); if (G.fx) G.fx.stars(p.querySelector('.tp-gobek'), 18);
          if (buyuk) { btn.innerHTML = 'Bir daha çevir<small>120 altın</small>'; const f = p.querySelector('.pen-f'); if (!f.querySelector('[data-tamam]')) { const b2 = el('button', 'gbtn', 'Tamam'); b2.type = 'button'; b2.dataset.tamam = '1'; b2.addEventListener('click', () => { if (!mesgul) done(true); }); f.appendChild(b2); } } else btn.textContent = 'Devam'; }, window.__fastFx ? 60 : 2150);
        return { keep: true }; } }] }); }

  /* ---------- maç yapılandırması: her karşılaşma bir örnek ---------- */
  const MEYDAN = 'er-meydani', MEYDAN_BG = 'assets/arena/er_meydani_bg.webp', MEYDAN_SIS = 'rgba(40,70,120,.12)';   // boyalı arka plan (gündüz: alttaki koyu sis hafif tutulur)   // eo2/arenalar/er-meydani: düello ve talim meydanı (çizimi gelince kod değişmeden devreye girer)
  function meydanUygula(cfg) { const A = B.arenaCfg && B.arenaCfg(MEYDAN); if (!A || A.oyuncu.length < 2) return cfg; const PX = B.api.PX;
    cfg.arazi = { tema: A.tema, aile: 'talim', maske: A.maske }; cfg.sahne = A.sahne; cfg.arenaEn = A.en; cfg.kameraBoy = A.kameraBoy; cfg.ortam = A.ortam; cfg.x0 = A.oyuncu[0].x * PX; cfg.rakip.x = A.oyuncu[A.oyuncu.length - 1].x * PX; return cfg; }
  function talimCfg() { const o = oyuncuDeger(false);
    return meydanUygula({ kimlik: 'talim-' + Date.now(), kip: 'talim', baslik: 'Talim', alt: 'Ödülsüz düello', arazi: V.talimArazi(), bg: MEYDAN_BG, sis: MEYDAN_SIS, ortam: 'yaprak', x0: 1010, oyuncu: o, zorluk: { hp: 1, dmg: 1 }, cikis: ayril,
      rakip: { ad: 'Talimci', unvan: 'Arena talimcisi', set: o.set === 'muhafiz' ? 'temel' : 'muhafiz', kontrol: 'yapay', hp: 1350, dmg: 210, el: 'talim', x: 2390, revive: 0 } }); }
  function asamaCfg() { const Z = V.ZINDAN[ornek.zindan], As = Z.asama[ornek.yol[ornek.asama]], zr = V.ZORLUK[ornek.zorluk], aile = Z.tema, o = oyuncuDeger(true);
    return { kimlik: ornek.kimlik + '-' + (ornek.asama + 1), kip: 'zindan', baslik: As.ad, alt: 'Aşama ' + (ornek.asama + 1) + ' / ' + ornek.yol.length + ' · ' + zr.ad, arazi: Object.assign(V.arazi(As.tema || Z.tema, aile, As.f, 11 + ornek.asama * 7), {}), bg: As.bg, deniz: As.deniz, ozel: As.ozel, ortam: Z.ortam, x0: As.x0 || 460,
      oyuncu: Object.assign(o, As.aci ? { angle: As.aci } : {}), zorluk: zr, moblar: As.moblar(zr.hp), boss: As.boss ? As.boss(zr.hp) : null, asama: { ad: Z.ad, n: ornek.yol.length, i: ornek.asama }, ipucu: As.ipucu, cikis: ayril, sis: aile === 'kaldera' ? 'rgba(30,6,4,.5)' : aile === 'donanma' ? 'rgba(4,16,34,.5)' : 'rgba(4,14,20,.55)' }; }
  function kervanCfg(cv) { const K = V.KERVAN, o = oyuncuDeger(true);
    return { kimlik: 'kervan-' + (cv ? cv.id : 'x') + '-' + Date.now(), kip: 'kervan', baslik: K.ad, alt: cv ? cv.guild + ' kervanı · ' + cv.route : K.alt, arazi: V.arazi(K.tema, 'kervan', K.f, 23), bg: K.bg, ortam: K.ortam, x0: 460, oyuncu: o, zorluk: { hp: 1, dmg: 1 }, moblar: K.moblar(), props: K.props, ipucu: K.ipucu, cikis: ayril, sis: 'rgba(60,30,16,.35)' }; }
  async function ayril() { const M = B.state(); if (!M || M.over || M.dur) return; M.dur = true;
    const v = await G.pen({ k: 'Ayrıl', t: ornek ? 'Seferden ayrılacak mısın?' : 'Savaştan ayrılacak mısın?', body: '<p>' + (ornek ? 'Sefer bir örnektir: ayrılırsan aşama ilerlemesi sıfırlanır. O ana kadar aldığın ganimet sende kalır.' : 'Ödül yok, kaybın da olmaz.') + '</p>', btns: [{ t: 'Savaşa dön', v: false }, { t: 'Ayrıl', cls: 'kor', v: true }] });
    if (M !== B.state()) return; M.dur = false; if (v) B.kapat(); }
  const ipucuGoster = cfg => { if (cfg.ipucu) setTimeout(() => { if (B.active()) B.ipucu(cfg.baslik, cfg.ipucu); }, window.__fastFx ? 0 : 2400); };
  const ozet = r => '<p class="tp-ozet">' + [['Hasar', fmt(r.ist.hasar)], ['Kritik', r.ist.kritik], ['Atış', Math.max(0, r.ist.tur - 1)]].map(x => '<span><small>' + x[0] + '</small><b>' + x[1] + '</b></span>').join('') + '</p>';
  const ganimetHtml = s => s && s.length ? '<p class="tp-ganimet">' + s.map(x => '<span class="etk">' + x + '</span>').join(' ') + '</p>' : '';

  /* ---------- akışlar ---------- */
  const mac = cfg => { G.close(); const bek = B.ac(cfg); ipucuGoster(cfg); return bek; };      // savaş kendi tam ekran katmanıdır; ekran çerçevesi kapanır, bitince sahneye dönülür
  const dondur = () => { const M = B.state(); if (M) M.dur = true; };                             // çark ve çizgi roman sırasında meydan arkada donuk durur
  const bitis = () => { B.kapat(); G.open('topcu'); };
  async function talim() { for (;;) { const cfg = talimCfg(), r = await mac(cfg); if (r.terk) break;
      const v = await G.pen({ k: 'Talim', t: r.zafer ? 'Zafer' : 'Yenildin', body: '<p>' + (r.zafer ? 'Talimci başını eğdi.' : 'Talimci bu kez isabetliydi.') + ' Talim ödülsüzdür: altın, ün ya da sıralama yazılmaz.</p>' + ozet(r), btns: [{ t: 'Sahneye dön', v: false }, { t: 'Yeniden', cls: 'altin', v: true }] }); if (!v) break; }
    bitis(); }
  async function kervan() { if (kilitli()) return kilitPen(); const cv = bosKervan(); if (!cv) return G.toast('Bu hafta yoldaki kervanların hepsine baskın verildi.');
    const H = ensureHub(); H.raidedCaravans = H.raidedCaravans || {}; H.raidedCaravans[cv.id] = true; ornek = null;
    for (;;) { const cfg = kervanCfg(cv), r = await mac(cfg); if (r.terk) break;
      if (r.zafer) { const s = odulYaz('kervan', { rota: cv.routeKey }); if (typeof chron === 'function') chron(cv.guild + ' kervanına baskın verildi.'); await G.pen({ k: 'Kervan Baskını', t: 'Zafer', body: '<p>Haydutlar dağıldı; ' + cv.guild + ' kervanının yükü senin.</p>' + ozet(r) + ganimetHtml(s), btns: [{ t: 'Sahneye dön', cls: 'altin' }] }); break; }
      const v = await G.pen({ k: 'Kervan Baskını', t: 'Yenildin', body: '<p>Pusu seni geri püskürttü. Ganimet yok.</p>' + ozet(r), btns: [{ t: 'Çekil', v: false }, { t: 'Yeniden dene', cls: 'altin', v: true }] }); if (!v) break; }
    bitis(); }
  const destan = (z, hangi) => { const Z = V.ZINDAN[z], id = hangi === 'zafer' ? Z.zafer : Z.prolog; if (!G.comic || typeof COMIC === 'undefined' || !COMIC[id]) return Promise.resolve(false); return G.comic({ id, title: Z.destan, opts: [{ t: hangi === 'zafer' ? 'Ocağa dön' : Z.gir, fx: () => null }] }); };
  async function zindan(z, zorluk, ilkAsama) { if (kilitli()) return kilitPen(); const Z = V.ZINDAN[z], T = kayit();
    /* Tek kişi = içinde tek kişi olan aynı zindan (kullanıcı, 2026-11-17). Yeni yöntemle kurulmuş zindan (js/zindan_tarif.js) varsa tek kişilik sefer açılır. */
    if (!ilkAsama && EO2.zindan && EO2.zindan.tekVar && EO2.zindan.tekVar(z)) { if (!T.okundu[z]) { await destan(z, 'prolog'); T.okundu[z] = 1; if (typeof saveGame === 'function') saveGame(); } if (EO2.zindan.tekBasla(z, zorluk)) return; }
    ornek = { kimlik: z + '-' + zorluk + '-' + Date.now(), zindan: z, zorluk, yol: yolu(z), asama: ilkAsama || 0, altin: 0, ganimet: [], hasar: 0 };      // ilkAsama yalnız denetim betikleri içindir; oyunda sefer hep ilk aşamadan başlar
    if (!T.okundu[z]) { await destan(z, 'prolog'); T.okundu[z] = 1; if (typeof saveGame === 'function') saveGame(); }
    for (;;) { const cfg = asamaCfg(), r = await mac(cfg); if (r.terk) break; ornek.hasar += r.ist.hasar; const son = ornek.asama === ornek.yol.length - 1;
      if (!r.zafer) { const v = await G.pen({ k: Z.ad + ' · Aşama ' + (ornek.asama + 1), t: 'Yenildin', body: '<p>Anka külün tükendi. Aynı aşamayı yeniden deneyebilir ya da seferi bırakabilirsin.</p>' + ozet(r), btns: [{ t: 'Seferi bırak', v: false }, { t: 'Yeniden dene', cls: 'altin', v: true }] }); if (!v) break; continue; }
      if (!son) { const s = odulYaz('asama'); ornek.ganimet.push(...s); dondur();
        await cark('Aşama ' + (ornek.asama + 1) + ' temizlendi', '150 altın kesene girdi. Çarkı bir kez çevir.', kucukCark(ornek.asama + 1), false); ornek.asama++; continue; }
      const s = odulYaz('zindan', { zindan: z, zorluk }); ornek.ganimet.push(...s); dondur();
      await destan(z, 'zafer'); await cark(Z.boss + ' yenildi', 'İlk çeviriş bedava; sonrakiler 120 altın.', buyukCark(zorluk), true);
      await G.pen({ k: Z.ad + ' · ' + V.ZORLUK[zorluk].ad, t: 'Sefer tamamlandı', face: Z.yuz, body: '<p>' + Z.boss + ' yenildi. Seferden dönerken heybende şunlar var:</p>' + ganimetHtml(ornek.ganimet) + '<p class="tp-ozet"><span><small>Toplam hasar</small><b>' + fmt(ornek.hasar) + '</b></span><span><small>Altın</small><b>' + fmt(ornek.altin) + '</b></span></p>', btns: [{ t: 'Sahneye dön', cls: 'altin' }] }); break; }
    ornek = null; bitis(); }
  function kilitPen() { const n = (S.food && S.food.genclik) || 0, yavru = S.dragons.find(d => d.stage === 'yavru');
    return G.pen({ k: 'Mühürlü', t: 'Topçunun bir omuz ejderi olmalı', face: OLD + 'img/ui/ik-genclik.webp', body: '<p>Zindanlara ve kervan yoluna yalnız <b>Sonsuz Gençlik İksiri</b> içmiş bir yavruyla çıkılır: iksir onu ebediyen genç tutar, o da topunun üstüne kurulur.</p><p>İksir Pazar\'daki yem tezgâhında satılır ve yalnız yavrular içebilir. ' + (n ? 'Kilerinde <b>' + n + '</b> iksir var; ' + (yavru ? 'Ejderhalar ekranında <b>' + esc(yavru.name) + '</b> içebilir.' : 'ama ocağında yavru yok.') : 'Kilerinde iksir yok.') + '</p>',
      btns: [{ t: 'Anladım', v: 0 }, n && yavru ? { t: 'Ejderhalara git', cls: 'altin', v: 2 } : { t: 'Pazara git', cls: 'altin', v: 1 }] }).then(v => { if (v === 1) G.open('pazar'); else if (v === 2) G.open('ejderhalar'); }); }
  /* İLK GİRİŞ (UX denetimi, 2026-11-20): "omuz ejderi" tek cümleyle anlatılır; kural kilitPen'deki ile aynıdır, yeni kural yok */
  const OMUZ = '<b>Omuz ejderi</b>, Sonsuz Gençlik İksiri içip topunun üstüne kurulan bir yavrundur; iksir Pazar\'daki yem tezgâhında satılır.';
  const bosKervan = () => { if (typeof ensureCaravans !== 'function' || typeof ensureHub !== 'function') return null; const H = ensureHub(), r = H.raidedCaravans || {}; return ensureCaravans().find(c => !r[c.id]) || null; };

  /* ================= SAHNE: kip seçimi ================= */
  const YER = [   // konumlar tp-kapilar.webp üzerindeki oranlardır (2:1 çizim)
    { k: 'sahmeran', x: 0.214, y: 0.585, w: 0.085, h: 0.31, tur: 'zindan' }, { k: 'komutan', x: 0.5, y: 0.585, w: 0.09, h: 0.32, tur: 'zindan' }, { k: 'abra', x: 0.791, y: 0.585, w: 0.075, h: 0.3, tur: 'zindan' },
    { k: 'talim', x: 0.176, y: 0.905, w: 0.15, h: 0.13, tur: 'talim' }, { k: 'kervan', x: 0.726, y: 0.9, w: 0.13, h: 0.17, tur: 'kervan' }, { k: 'meydan', x: 0.325, y: 0.79, w: 0.12, h: 0.2, tur: 'pvp' }];
  const yerAd = y => y.tur === 'zindan' ? ['Zindan ' + V.ZINDAN[y.k].rakam, V.ZINDAN[y.k].ad] : y.tur === 'talim' ? ['Talim alanı', 'Talim'] : y.tur === 'pvp' ? ['Dostça düello', 'Er Meydanı'] : ['Kervan yolu', 'Kervan Baskını'];
  function kunye(y) { const kil = kilitli(), T = kayit();
    if (y.tur === 'pvp') return EO2.topcuPvp ? EO2.topcuPvp.kunye() : '<div class="tp-k-bas"><small>Dostça düello</small><h2>Er Meydanı</h2></div><p>Oda sistemi yüklenemedi.</p>';
    if (y.tur === 'talim') return '<div class="tp-k-bas"><small>Talim alanı</small><h2>Talim</h2></div><p>Arena talimcisiyle sırayla atış. Rüzgârı, açıyı, gücü ve becerileri burada denersin. Ödülsüzdür; kaybın da olmaz.</p>' + (kil ? '<p class="tp-k-not tp-omuz"><b>Önce burada başla.</b> ' + OMUZ + '</p>' : '') + '<div class="tp-k-alt">' + (kil ? '<button type="button" class="gbtn" data-kilit="1">Omuz ejderi nasıl edinilir?</button>' : '') + '<button type="button" class="gbtn altin buyuk" data-git="talim">Talime başla</button></div>';
    if (y.tur === 'kervan') { const cv = bosKervan(); return '<div class="tp-k-bas"><small>Kervan yolu · tek aşama</small><h2>Kervan Baskını</h2></div><p>' + (cv ? '<b>' + esc(cv.guild) + '</b> kervanı ' + esc(cv.route) + ' üzerinde. Üç haydut pusuda; arabanın yükü kazananın.' : 'Bu hafta yolda baskın verilecek kervan kalmadı.') + '</p><p class="tp-k-not">Zaferde 180 altın, 8 ün, rotanın cevheri ve Harlı Kor Taşı.</p>' +
        '<div class="tp-k-alt">' + (kil ? '<span class="tp-muhur">Mühürlü: omuz ejderi gerek</span><button type="button" class="gbtn" data-kilit="1">Nasıl açılır?</button>' : '<button type="button" class="gbtn altin buyuk" data-git="kervan" ' + (cv ? '' : 'disabled') + '>Baskına çık</button>') + '</div>'; }
    const Z = V.ZINDAN[y.k], zr = T.zorluk[y.k] || 'normal', zafer = T.zafer[y.k] || 0;
    return '<img class="tp-k-yuz" alt="" src="' + Z.yuz + '"><div class="tp-k-bas"><small>Zindan ' + Z.rakam + ' · ' + Z.el + '</small><h2>' + Z.ad + '</h2><em>' + Z.boss + (zafer ? ' · ' + zafer + ' zafer' : '') + '</em></div>' +
      '<ol class="tp-yol" aria-label="Aşamalar">' + yolu(y.k).map(j => Z.asama[j]).map((a, i) => '<li class="' + (a.boss ? 'boss' : '') + '"><i>' + (i + 1) + '</i><span><b>' + a.ad + '</b><small>' + a.alt + '</small></span></li>').join('') + '</ol>' +
      '<div class="tp-zor" role="radiogroup" aria-label="Zorluk">' + Object.keys(V.ZORLUK).map(k => '<button type="button" role="radio" aria-checked="' + (k === zr) + '" data-zor="' + k + '"><b>' + V.ZORLUK[k].ad + '</b><small>' + (k === 'normal' ? 'Düşman canı dörtte üç' : 'Tam güç') + '</small></button>').join('') + '</div>' +
      '<p class="tp-k-not">Her ara aşama: 150 altın ve Öncü Ganimet Çarkı. Final: ' + (zr === 'normal' ? '250 altın, 1 ' + Z.ganimet + ', 2 Harlı Kor Taşı' : '500 altın, 2 ' + Z.ganimet + ', 2 Harlı Kor Taşı') + ' ve Ulu Kader Çarkı.</p>' +
      '<div class="tp-k-alt">' + (kil ? '<span class="tp-muhur">Mühürlü: omuz ejderi gerek</span><button type="button" class="gbtn" data-kilit="1">Nasıl açılır?</button>' : '<button type="button" class="gbtn" data-destan="' + y.k + '">Destanı oku</button><button type="button" class="gbtn altin buyuk" data-git="zindan">Sefere çık</button>') + '</div>'; }
  function yerlestir(body) { const pano = body.querySelector('.tp-pano'), tuval = body.querySelector('.tp-tuval'); if (!pano) return; const w = pano.clientWidth, h = pano.clientHeight; if (!w || !h) return; const k = Math.max(w / 2, h), tw = Math.round(k * 2), th = Math.round(k);
    tuval.style.width = tw + 'px'; tuval.style.height = th + 'px'; tuval.style.marginTop = Math.min(0, h - th) + 'px'; pano.classList.toggle('kayar', tw > w + 2); if (tw > w + 2 && !pano.dataset.kaydi) { pano.dataset.kaydi = '1'; const y = YER.find(v => v.k === secili); pano.style.scrollBehavior = 'auto'; pano.scrollLeft = y ? y.x * tw - w / 2 : sonKaydir != null ? sonKaydir : (tw - w) / 2; pano.style.scrollBehavior = ''; pano.addEventListener('scroll', () => { sonKaydir = pano.scrollLeft; }, { passive: true }); } }
  G.screen('topcu', { k: 'Topunla sen dövüşürsün', t: 'Topçu Arenası', cls: 'tp', enter() { secili = kilitli() ? 'talim' : null; }, draw(body) {   /* omuz ejderi yokken (yeni oyuncu) Talim seçili açılır */
    const kil = kilitli(), T = kayit(), y = YER.find(v => v.k === secili);
    body.innerHTML = '<div class="tp-pano"><div class="tp-tuval"><img class="tp-resim" alt="Üç zindan kapısı, talim alanı ve kervan yolu" src="assets/bg/tp-kapilar.webp" draggable="false">' +
      YER.map(v => { const ad = yerAd(v), kk = kil && v.tur !== 'talim' && v.tur !== 'pvp', zf = v.tur === 'zindan' ? T.zafer[v.k] || 0 : 0;
        return '<button type="button" class="tp-yer ' + v.tur + (kk ? ' kilitli' : '') + '" data-yer="' + v.k + '" aria-pressed="' + (secili === v.k) + '" style="left:' + (v.x * 100) + '%;top:' + (v.y * 100) + '%;width:' + (v.w * 100) + '%;height:' + (v.h * 100) + '%"><i class="tp-cerceve"></i><span class="tp-plaka"><small>' + ad[0] + '</small><b>' + ad[1] + '</b>' + (kk ? '<em class="kilit">Mühürlü</em>' : zf ? '<em>' + zf + ' zafer</em>' : '') + '</span></button>'; }).join('') + '</div></div>' +
      '<p class="tp-rehber cam"' + (y ? ' hidden' : '') + '>' + (kil ? 'Zindanlar ve kervan yolu mühürlü. ' + OMUZ + ' Talim ve Er Meydanı herkese açık.' : 'Bir kapıya, talim alanına ya da kervan arabasına dokun.') + '</p>' +
      '<aside class="tp-kunye cam"' + (y ? '' : ' hidden') + '>' + (y ? '<button type="button" class="tp-k-kapat" aria-label="Kapat">' + ((EO2.icons || {}).close || '×') + '</button>' + kunye(y) : '') + '</aside>';
    yerlestir(body); requestAnimationFrame(() => yerlestir(body));
    const on = (sel, fn) => body.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => { if (EO2.audio) EO2.audio.ui(); fn(b, e); }));
    on('.tp-yer', b => { secili = secili === b.dataset.yer ? null : b.dataset.yer; G.redraw(); });
    on('.tp-k-kapat', () => { secili = null; G.redraw(); });
    on('[data-zor]', b => { T.zorluk[secili] = b.dataset.zor; G.redraw(); });
    on('[data-kilit]', () => kilitPen()); on('[data-destan]', b => destan(b.dataset.destan, 'prolog'));
    if (y && y.tur === 'pvp' && EO2.topcuPvp) EO2.topcuPvp.bagla(body);
    on('[data-git]', b => baslat(b.dataset.git, { zindan: secili, zorluk: T.zorluk[secili] || 'normal' }));
  } });
  addEventListener('resize', () => { const b = document.querySelector('#scrB.tp'); if (b) yerlestir(b); });
  function baslat(kip, o) { o = o || {}; if (B.active()) return; if (kip === 'talim') return talim(); if (kip === 'kervan') return kervan(); if (kip === 'zindan' && V.ZINDAN[o.zindan]) return zindan(o.zindan, V.ZORLUK[o.zorluk] ? o.zorluk : 'normal', o.denetimAsama); }

  /* ---------- PvP bağlantı noktası (2. aşama; ağ kodu burada yok) ----------
     Oda sunucusu (server/pvp_rooms.js) maç başında tek `pvp_match_start` yollar: harita, ilk tur sahibi, rüzgâr tohumu, rakip.
     ag.js o mesajla EO2.topcu.pvpBaslat({ rakip: { ad, set, el, hp }, ilk: 'ben'|'rakip', ruzgar: tur => sayı }) çağırır; dönen Promise maç sonucudur.
     Giden: EO2.battle.dinle((olay, veri) => …) → 'ates' (pvp_sync fire), 'isabet' (hit), 'can' (hp_sync), 'pas', 'mac_bitti' (pvp_match_result).
     Gelen: EO2.battle.uzak({ t: 'ates' | 'isabet' | 'can' | 'pas' | 'ruzgar', … }). */
  /* ER MEYDANI HARİTALARI (EKSIK_OZELLIKLER §4 ilk adım, 2026-11-20): zindan arenaları dostça düelloya açılır. Adlar sunucudaki EO2_MAP_IDS ile aynı (server/pvp_rooms.js).
     'er-meydani' bugünkü talim adasıdır (kırılır zemin). Zümrüt arenalarının zemini kırılmaz; iki terbiyeci aynı yükseklikte, ortaya eşit uzaklıkta durur (x: dünya birimi).
     Eski oyunun harita adı gelirse (hızlı eşleşme) sabit tabloyla 2.0 haritasına eşlenir: iki uç aynı haritayı görür. Kaldera ve Donanma arenaları çizimsiz; bekletiliyor. */
  const PVP_HARITA = [
    { id: 'er-meydani', ad: 'Talim Adası', kisa: 'Talim Adası', alt: 'Kırılır zemin: atış çukur açar', resim: 'assets/arena/harita-er-meydani.webp' },
    { id: 'zumrut-kopru', ad: 'Zümrüt Saray Köprüsü', kisa: 'Zümrüt Köprü', alt: 'Uzun düz köprü, kırılmaz zemin', resim: 'assets/arena/harita-zumrut-kopru.webp', x: [19, 45] },
    { id: 'zumrut-defile', ad: "Şahmeran'ın Defilesi", kisa: 'Şahmeran Defilesi', alt: 'Loş salon, kırılmaz zemin', resim: 'assets/arena/harita-zumrut-defile.webp', x: [10, 36] }];
  const ESKI_HARITA = { steppe_canyon: 'er-meydani', seljuk_ruins: 'er-meydani', sky_archipelago: 'zumrut-kopru', dragon_caldera: 'zumrut-kopru', sandstorm: 'zumrut-defile', glacier: 'zumrut-defile' };
  const haritaBul = id => PVP_HARITA.find(h => h.id === (ESKI_HARITA[id] || id)) || PVP_HARITA[0];
  function haritaUygula(cfg, id) { const H = haritaBul(id), A = H.x && B.arenaCfg && B.arenaCfg(H.id); if (!A) return cfg; const PX = B.api.PX;
    Object.assign(cfg, { arazi: { tema: A.tema, aile: A.tema, maske: A.maske }, bg: null, sahne: A.sahne, arenaEn: A.en, kameraBoy: A.kameraBoy, ortam: A.ortam, sis: 'rgba(4,14,20,.45)', x0: H.x[0] * PX, harita: H.id });
    cfg.rakip.x = H.x[1] * PX; return cfg; }
  async function pvpBaslat(o) { const cfg = haritaUygula(talimCfg(), o.harita); cfg.kimlik = 'pvp-' + (o.macKimlik || Date.now()); cfg.kip = 'pvp'; cfg.baslik = 'Er Meydanı'; cfg.alt = haritaBul(o.harita).ad; cfg.ruzgar = o.ruzgar || null;
    cfg.rakip = Object.assign(cfg.rakip, { ad: 'Rakip', unvan: 'Topçu' }, o.rakip || {}, { kontrol: 'uzak' }); cfg.ilkRakip = o.ilk === 'rakip';
    if (o.sag) { cfg.yon = -1; const sol = cfg.x0; cfg.x0 = cfg.rakip.x; cfg.rakip.x = sol; }      // odadaki ikinci yuva sağda durur: iki uçta meydan aynı
    const r = await mac(cfg); if (o.sonra) await o.sonra(r); bitis(); return r; }

  /* ortak sefer (js/zindan_ortak.js) aynı ödül ve çark fonksiyonlarını kullanır; ornekKur etkin sefer kaydını açar ya da kapatır */
  const ornekKur = o => { ornek = o ? { kimlik: 'ortak-' + Date.now(), zindan: o.zindan, zorluk: o.zorluk, asama: 0, altin: (ornek && ornek.ortak ? ornek.altin : 0), ganimet: (ornek && ornek.ortak ? ornek.ganimet : []), hasar: 0, ortak: true } : null; };
  EO2.topcu = { baslat, pvpBaslat, PVP_HARITA, haritaBul, odulYaz, oyuncuDeger, ornek: () => ornek, kilitli, ornekKur, cark, kucukCark, buyukCark, ganimetHtml, YER, sec: k => { secili = k; G.redraw(); }, secili: () => secili };
})();
