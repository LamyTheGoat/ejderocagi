/* Ejder Ocağı 2.0 · Arena: kademeler, rakip ilanları, tur tabanlı dövüş ve turnuvalar
   Dövüş motoru oyunun kendisidir (js/core.js: newFight, fightRound; js/week.js: fightOutcome, rollDeath). Sonuç, ödül ve ölüm
   zarı eski arayüzdeki finishFight / finishTourRound ile aynı sırayla işlenir.
   ALTIN SUNUCUDADIR (eo2/js/ag.js, server/arena_service.js): kademe, turnuva ve Gök Kulesi dövüşleri sunucuda açılır (arena.open), turlar
   sunucunun tohumuyla oynanır, bitince yalnız hamle listesi gider (arena.settle); sunucu dövüşü yeniden oynatıp ödülü kendi yazar.
   Bu dosya arena altınını yerel keseye YAZMAZ. Sunucu yoksa dövüş oynanır, altın ödülü yazılmaz ve ekranda söylenir.
   Er Meydanı (oyuncuya karşı dostça düello) aynı dövüş sahnesinde oynanır; hamleler sunucuya gider, ödül yoktur. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, el = G.el, app = document.getElementById('app');
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const wait = ms => new Promise(r => setTimeout(r, window.__fastFx ? 10 : ms));
  const pw = o => Math.round(sum(STATS.map(k => o.st[k])) / 4);
  let FT = null;
  /* oyunun kule mantığı (endgame.js) dövüş durumunu küresel FT adıyla kurar ve okur; buradaki duruma bağlanır */
  Object.defineProperty(window, 'FT', { configurable: true, get: () => FT, set: v => { FT = v; } });
  const pickAuto = () => { const x = autoChoose(FT.F.p, FT.F.e); return can(x) ? x : 'pence'; };      // otomatik dövüş: oyunun kendi dövüş zekâsı oyuncu adına seçer

  /* ---------- sunucu bağı ---------- */
  const cevrimici = () => !!(EO2.ag && EO2.ag.cevrimici());
  const P_KEYS = ['name', 'el', 'mood', 'cards', 'gu', 'ce', 'da', 'ze', 'atk', 'def', 'crit', 'dodge', 'nefesB', 'maxHp', 'hp', 'sta', 'bond', 'saves', 'cesur', 'temkinli', 'demir', 'vahsi', 'bondUsed', 'heart', 'tired'];
  const E_KEYS = [...P_KEYS, 'aiProfile'], O_KEYS = ['name', 'trainer', 'arch', 'el', 'st', 'gear', 'eye', 'mood', 'traits', 'cards', 'gx', 'genes', 'story', 'odul', 'utilityWeights'];
  const sec = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; return r; };
  const BAHIS_PAYI = { 180: 80 };                          // js/fightev.js: 80 altın yatırılır, kazanırsa 180 öder
  const HATA = { baglanti_yok: 'sunucuya ulaşılamadı', rate_limited: 'sunucu şu an çok yoğun', arena_reward_invalid: 'sunucu bu ilanın ödülünü tanımadı', arena_opp_invalid: 'sunucu bu rakibi tanımadı', arena_fighter_invalid: 'sunucu dövüşçü verisini kabul etmedi' };
  const neden = e => HATA[e && e.code] || (e && e.code) || 'bilinmeyen hata';
  /* Yalnız tur çözülürken oyunun rastgeleliği sunucunun tohumuna bağlanır; böylece sunucu aynı dövüşü yeniden oynatabilir. */
  const tohumla = (rnd, fn) => { const o = Math.random; Math.random = rnd; try { return fn(); } finally { Math.random = o; } };
  /* Dövüş kurulduktan (destekler, turnuva canı) sonra, sahne açılmadan önce: dövüşü sunucuda aç. */
  async function sunucuAc() { const F = FT.F; FT.srv = null;
    const cevrimdisi = why => { FT.cevrimdisi = true; FT.log.push({ t: '<b>Çevrimdışı:</b> bu dövüşün altın ödülü yazılmayacak (' + why + ').', c: 'kotu' });
      if (FT.bet && BAHIS_PAYI[FT.bet]) { S.gold += BAHIS_PAYI[FT.bet]; FT.log.push({ t: 'Bahis geçersiz sayıldı; yatırdığın ' + BAHIS_PAYI[FT.bet] + ' altın iade edildi.', c: 'soluk' }); FT.bet = 0; } };
    if (!cevrimici()) return cevrimdisi('sunucuya bağlı değilsin');
    const spec = { mode: FT.mode === 'tour' ? 'tour' : FT.mode === 'kule' ? 'kule' : 'tier', week: S.week, season: typeof seasonNo === 'function' ? seasonNo() : 1, p: sec(F.p, P_KEYS), e: sec(F.e, E_KEYS), opp: sec(FT.opp, O_KEYS) };
    if (spec.mode === 'tour') { spec.tour = S.tour.id; spec.round = S.tour.round; } else if (spec.mode === 'kule') { spec.floor = FT.floor; if (ensureDivan().active === 'gladyator') spec.divan = 'gladyator'; } else { spec.tier = FT.tier; spec.bet = FT.bet || 0; spec.goldB = equipStats(FT.d).gold || 0; }
    try { const a = (await EO2.ag.komut('arena.open', { spec: JSON.stringify(spec) })).result.arena; Object.assign(F.p, a.p); Object.assign(F.e, a.e); FT.srv = { id: a.fightId, rnd: EO2.ag.rng(a.seed), acts: [], odul: a.reward }; }
    catch (e) { cevrimdisi(neden(e)); } }
  /* Dövüş bitince: hamle listesini gönder, sunucunun kararını al. Döner: { ok, gold, a } ya da { ok: false, why, bekliyor } */
  async function sunucuBitir() { if (!FT.srv) return { ok: false, why: 'çevrimdışı' };
    try { const a = await EO2.ag.arenaBitir(FT.srv.id, FT.srv.acts); if (a.final.p.hp !== Math.max(0, FT.F.p.hp) || a.final.e.hp !== Math.max(0, FT.F.e.hp) || a.rounds !== FT.F.round) EO2.arena.sapma = (EO2.arena.sapma || 0) + 1;      // yeniden oynatma yerel dövüşle birebir değil (olmamalı)
      if (a.winner !== FT.F.winner) { console.warn('[arena] sunucu sonucu farklı', a.winner, FT.F.winner); FT.F.winner = a.winner; FT.F.surrender = a.surrender; } return { ok: true, gold: a.gold, a }; }
    catch (e) { return { ok: false, why: neden(e), bekliyor: !e.status || e.status >= 500 }; } }

  /* ---------- olay metni (eski evText ile aynı cümleler) ---------- */
  function evText(ev) { const F = FT.F, a = ev.who === 'p' ? F.p : F.e, t = ev.who === 'p' ? F.e : F.p, A = '<b>' + esc(a.name) + '</b>';
    if (ev.act === 'savun') return { t: A + ' savunmaya geçti ve nefeslendi.' };
    if (ev.act === 'teslim') return { t: A + ' başını eğdi.', c: 'kotu' };
    if (ev.act === 'stun') return { t: A + ' sersemledi, bu tur kıpırdayamadı.', c: ev.who === 'p' ? 'kotu' : 'iyi' };
    const c = ev.who === 'p' ? 'iyi' : 'kotu';
    if (ev.act === 'card') { const K = '<b class="au">' + CARDS[ev.card].ad + '</b>';
      if (ev.heal && (ev.card === 'son_nefes' || ev.card === 'kadim_buzul')) return { t: A + ' ' + K + '! <b>' + ev.heal + '</b> can topladı.', c };
      if (ev.miss) return { t: A + ' ' + K + ' denedi ama ' + (ev.evaded ? esc(t.name) + ' gölgeden sıyrıldı' : 'boşa gitti') + '.', c: 'soluk' };
      if (ev.blocked) return { t: A + ' ' + K + ' indirdi ama ' + esc(t.name) + ' kanat kalkanıyla hepsini savuşturdu.', c: 'soluk' };
      if (!ev.dmg) return { t: A + ' ' + K + '!', c };
      return { t: A + ' ' + K + ': <b>' + ev.dmg + '</b> hasar' + (ev.hits === 2 ? ' (iki darbe)' : '') + (ev.crit ? ', kritik!' : '') + (ev.saved ? ' <b class="heart">' + esc(t.name) + ' düşmek üzereyken sana baktı ve ayağa kalktı!</b>' : ''), c }; }
    if (ev.act === 'kukre') return ev.ok ? { t: A + ' kükredi! ' + esc(t.name) + ' sarsıldı.', c: 'iyi' } : { t: A + ' kükredi ama ' + esc(t.name) + ' istifini bozmadı.', c: 'soluk' };
    const nm = ev.act === 'nefes' ? EL_AD[a.el].toLowerCase() + ' nefesi' : 'pençesi', fb = ev.fb ? A + ' nefesi yetmedi, pençeye döndü. ' : '';
    if (ev.miss) return { t: fb + (ev.evaded ? esc(t.name) + ' gölgeden sıyrıldı; ' : '') + ek(A, 'gen') + ' ' + nm + ' boşa gitti.', c: 'soluk' };
    if (ev.covered) return { t: '<b>' + esc(ev.covered) + '</b> araya atıldı ve darbeyi göğsüyle karşıladı!', c: ev.who === 'e' ? 'iyi' : 'kotu' };
    if (ev.blocked) return { t: esc(t.name) + ' kanat kalkanıyla darbeyi savuşturdu.', c: 'soluk' };
    return { t: fb + ek(A, 'gen') + ' ' + nm + ': <b>' + ev.dmg + '</b> hasar' + (ev.crit ? ', kritik!' : '') + (ev.elm > 1 ? ' Element üstünlüğü!' : '') + (ev.saved ? ' <b class="heart">' + esc(t.name) + ' düşmek üzereyken sana baktı ve ayağa kalktı!</b>' : ''), c }; }

  /* ---------- dövüş sahnesi ---------- */
  const can = x => { const p = FT.F.p; if (x === 'pence' || x === 'savun' || x === 'teslim') return true; if (x === 'nefes') return p.sta >= NEFES_COST; if (x === 'kukre') return p.sta >= 15; if (x.startsWith('card:')) { const k = x.slice(5); return p.cards.includes(k) && !(p.used || []).includes(k); } return false; };
  /* terbiyeciler: dövüşte iki tarafın terbiyecisi avatarıyla görünür. Oyuncu kendi kuşam setiyle; öteki oyuncu (Er Meydanı)
     bildirdiği setle; yapay rakibin terbiyecisi adından türetilen sabit bir setle (aynı rakip hep aynı görünür). */
  const SETLER = () => Object.keys((EO2.api && EO2.api.sets) || {}).filter(k => k !== 'bare');
  const adKarma = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function terbiyeci(kim) { if (kim === 'ben') return (G.ad && G.ad()) || 'Terbiyeci'; const o = FT.opp || {}; return FT.rakipAd || o.trainer || o.owner || 'Rakip terbiyeci'; }
  function yuzCiz(kok) { const A = EO2.api; if (!A || !A.drawPortrait) return; const L = SETLER(); if (!L.length) return;
    kok.querySelectorAll('canvas.dov-yuz').forEach(cv => { try { const ben = cv.dataset.yuz === 'ben', set = ben ? A.player.set : (FT.rakipSet && L.includes(FT.rakipSet) ? FT.rakipSet : L[adKarma(terbiyeci('rakip')) % L.length]);
      A.drawPortrait(cv, set, 0.66, ben ? true : (FT.rakipH || undefined)); } catch (e) { cv.hidden = true; } }); }
  function fightUI() { const F = FT.F, w = el('div', 'dov fight'); w.id = 'dov'; w.addEventListener('animationend', e => { if (e.target === w) w.classList.add('girdi'); });   /* açılış solması bir kez oynar: sarsıntı bitince yeniden başlamasın (ekran bir an saydamlaşıyordu) */ w.style.setProperty('--sahne', 'url("' + (FT.mode === 'kule' ? G.bgUrl('a:kule') : G.url('img/' + (FT.tier === 'cukur' ? 'bg-pit' : FT.mode === 'tour' ? 'bg-saray' : 'bg-arena') + '.webp')) + '")');
    w.innerHTML = '<header><small>' + esc(FT.title) + '</small><b id="dovTur"></b></header><div class="dov-saha"><div class="taraf sol" style="--el:' + G.ELC[F.p.el] + '"><div class="isim"><canvas class="dov-yuz" width="96" height="96" data-yuz="ben" aria-hidden="true"></canvas><span class="dov-ad"><b>' + esc(F.p.name) + '</b><small>' + esc(terbiyeci('ben')) + '</small></span><span class="etk el-' + F.p.el + '">' + EL_AD[F.p.el] + '</span></div><div class="can"><i id="hpP"></i><b id="hpPt"></b></div><div class="nefes"><i id="stP"></i></div><div class="govde"><img id="imP" alt="" src="' + G.img(FT.d) + '"><em id="dmP"></em></div></div>' +
      '<div class="vs">VS</div><div class="taraf sag" style="--el:' + G.ELC[F.e.el] + '"><div class="isim"><span class="etk el-' + F.e.el + '">' + EL_AD[F.e.el] + '</span><span class="dov-ad"><b>' + esc(F.e.name) + '</b><small>' + esc(terbiyeci('rakip')) + '</small></span><canvas class="dov-yuz" width="96" height="96" data-yuz="rakip" aria-hidden="true"></canvas></div><div class="can"><i id="hpE"></i><b id="hpEt"></b></div><div class="nefes"><i id="stE"></i></div><div class="govde"><img id="imE" alt="" src="' + G.img(FT.opp) + '"><em id="dmE"></em></div></div></div>' +
      '<div class="dov-kayit cam kay" id="dovLog"></div><div class="dov-eylem" id="dovAct"></div>';
    app.appendChild(w); yuzCiz(w); FT.view = { p: { hp: F.p.hp, sta: F.p.sta }, e: { hp: F.e.hp, sta: F.e.sta } }; for (const l of FT.log) logLine(l); paint();
    /* açılış karesi (ilk sürümdeki gibi): iki ejderha karşı karşıya, "ÇARPIŞMA!"; kare bitene dek hamle seçilmez */
    if (FT.mode !== 'mp' && kareVar()) { FT.busy = true; paint(); kare('kalkis').then(() => { if (!FT) return; FT.busy = false; paint(); }); } }
  /* ---------- dövüş kareleri: ilk sürümün çizgi roman ara kareleri (js/fsupport.js fightCut, fightCutPick) ----------
     Kural değiştirmez; yalnız gösterir. Hangi hamlede kare çıkacağını eski seçici belirler (dövüş ortasında en çok üç kare,
     bitişte zafer ya da yenilgi karesi). Hareketi azalt ayarında ve hızlı kipte kare çıkmaz. */
  const kareVar = () => typeof fightCut === 'function' && typeof fightCutPick === 'function' && !window.__fastFx && !app.classList.contains('sakin');
  async function kare(tur, ctx) { if (!FT || !kareVar()) return; FT.cutSeen = FT.cutSeen || {}; try { if (EO2.audio && EO2.audio.whoosh) EO2.audio.whoosh(); await fightCut(tur, ctx); } catch (e) { console.error('dövüş karesi', tur, e); } }
  async function turKaresi(evs) { if (!FT || !kareVar()) return; let ct = null; try { ct = fightCutPick(evs, FT.F); } catch (e) { ct = null; } if (!ct) return;
    FT.cutN = (FT.cutN || 0) + 1; FT.cutSeen = FT.cutSeen || {}; FT.cutSeen[ct] = 1; await kare(ct); }
  function logLine(l) { const box = document.getElementById('dovLog'), p = el('p', l.c || '', l.t); box.appendChild(p); while (box.children.length > 40) box.firstChild.remove(); box.scrollTop = box.scrollHeight; }
  function bars() { const F = FT.F, v = FT.view, set = (id, k) => { document.getElementById(id).style.width = Math.max(0, Math.min(100, k * 100)) + '%'; };
    set('hpP', v.p.hp / F.p.maxHp); set('hpE', v.e.hp / F.e.maxHp); set('stP', v.p.sta / 100); set('stE', v.e.sta / 100);
    document.getElementById('hpPt').textContent = Math.max(0, v.p.hp) + ' / ' + F.p.maxHp; document.getElementById('hpEt').textContent = Math.max(0, v.e.hp) + ' / ' + F.e.maxHp;
    document.getElementById('hpP').classList.toggle('az', v.p.hp / F.p.maxHp < 0.3); document.getElementById('hpE').classList.toggle('az', v.e.hp / F.e.maxHp < 0.3);
    document.getElementById('dovTur').textContent = 'Tur ' + Math.max(1, F.round + (F.over ? 0 : 1)) + ' / 30'; }
  const MDL = { pence: 'gu', nefes: 'nefes', kukre: 'kukre', savun: 'da', teslim: 'teslim' };   // dövüş düğmeleri: madalyon ailesi (assets/ik/mdl-*.webp)
  /* nefes ışını: saldıranın ağzından hedefe uzanan, elementin renginde kısa bir ışın (ilk sürümdeki nefes efektinin karşılığı) */
  function isin(me, im, renk) { const dov = document.getElementById('dov'); if (!dov || window.__fastFx || app.classList.contains('sakin')) return;
    const D = dov.getBoundingClientRect(), a = me.getBoundingClientRect(), b = im.getBoundingClientRect(), sol = a.left < b.left;
    const x0 = (sol ? a.right - a.width * 0.18 : a.left + a.width * 0.18) - D.left, x1 = (sol ? b.left + b.width * 0.3 : b.right - b.width * 0.3) - D.left, y = a.top + a.height * 0.36 - D.top;
    const e = el('i', 'dov-isin' + (sol ? '' : ' ters')); e.style.cssText = 'left:' + Math.min(x0, x1) + 'px;top:' + y + 'px;width:' + Math.abs(x1 - x0) + 'px;--c:' + renk; dov.appendChild(e); setTimeout(() => e.remove(), 560);
    const t = el('i', 'dov-ton'); t.style.setProperty('--c', renk); dov.appendChild(t); setTimeout(() => t.remove(), 520); }
  function paint() { bars(); const box = document.getElementById('dovAct'), p = FT.F.p, mp = FT.mode === 'mp'; if (FT.F.over) { box.innerHTML = ''; return; }
    const IK = { pence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"><path d="M6 3c1.600 6 2 11 0 18M12 2c1.600 7 2 13 0 20M18 3c1.600 6 2 11 0 18"/></svg>', nefes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.500 2c1 4-3.500 6-3.500 10 0 1.500.8 2.600 1.800 3-.2-2 .9-3.200 2-4.200.3 2.500 3.200 3.400 3.200 6.400 0 2.700-2 4.800-4.800 4.800C7.600 22 5 19.400 5 15.600 5 9.800 11 8 12.500 2z"/></svg>', kukre: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M4 9v6M9 5v14M14 8v8M19 3v18"/></svg>', savun: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5z"/></svg>', teslim: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 2h2v20H5zM8 3h11l-3 4 3 4H8z"/></svg>' };
    const B = (x, t, sub, cls) => { const card = x.startsWith('card:') ? x.slice(5) : null; return '<button type="button" class="beceri ' + (cls || '') + '" data-x="' + x + '" ' + (can(x) && !FT.busy && !FT.bekle ? '' : 'disabled') + ' title=""' + (card && CARDS[card].d ? CARDS[card].d : '') + '"><i>' + (card ? '<img alt="" src="' + G.OLD + 'img/ui/card-' + card + '.webp">' : MDL[x] ? '<img class="mdl" alt="" src="assets/ik/mdl-' + MDL[x] + '.webp">' : IK[x] || '') + '</i><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>'; };
    box.innerHTML = B('pence', 'Pençe', '', 'altin') + B('nefes', EL_AD[p.el] + ' nefesi', NEFES_COST + ' nefes', 'kor') + B('kukre', 'Kükre', '15 nefes', '') + B('savun', 'Savun', 'nefes toplar', 'cini') +
      p.cards.filter(k => !(p.used || []).includes(k)).map(k => B('card:' + k, CARDS[k].ad, 'kart', 'kart')).join('') + '<span class="ara"></span>' + (mp ? '<span class="dov-bekle' + (FT.bekle ? ' acik' : '') + '">' + (FT.bekle ? 'Hamlen gitti · rakip bekleniyor' : 'Hamleni seç') + '</span>' : '<button type="button" class="beceri kucuk' + (FT.auto ? ' secili' : '') + '" data-auto="1"><i><img class="mdl" alt="" src="assets/ik/mdl-oto.webp"></i><b>Otomatik</b></button>') + B('teslim', 'Teslim ol', '', 'kucuk');
    on(box, '[data-x]', b => act(b.dataset.x)); on(box, '[data-auto]', () => { FT.auto = !FT.auto; paint(); if (FT.auto && !FT.busy) act(pickAuto()); }); }
  /* vuruş hissi (2026-11-17): her isabette çarpma parlaması, kısa donma, sahne sarsıntısı ve geri savrulma; kritikte daha sert; canı bitiren darbede ağır çekim ve yıkılış.
     Yalnız görüntü: hasar, sıra ve sonuç değişmez. "Hareketi azalt" ayarında ve hızlı kipte çalışmaz. Dönen değer: donma süresi (ms). */
  function carpma(im, tgt, ev, olum) { const dov = document.getElementById('dov'); if (!dov || !im || window.__fastFx || app.classList.contains('sakin')) return 0;
    const q = im.getBoundingClientRect(), R = dov.getBoundingClientRect(), k = el('i', 'dov-carpma' + (olum ? ' olum' : ev.crit ? ' kritik' : '')); k.style.left = (q.left - R.left + q.width * (tgt === 'E' ? 0.42 : 0.58)) + 'px'; k.style.top = (q.top - R.top + q.height * 0.46) + 'px'; dov.appendChild(k); setTimeout(() => k.remove(), 560);
    dov.classList.remove('yumruk', 'yumruk-agir'); void dov.offsetWidth; dov.classList.add(ev.crit || olum ? 'yumruk-agir' : 'yumruk'); im.classList.toggle('agir', !!(ev.crit || olum));
    const sure = olum ? 280 : ev.crit ? 130 : 65; dov.classList.add('donma'); setTimeout(() => dov.classList.remove('donma'), sure);
    if (olum) { dov.classList.add('son-darbe'); setTimeout(() => dov.classList.remove('son-darbe'), 950); setTimeout(() => im.classList.add('yikildi'), sure + 380); } return sure; }
  async function play(ev) { const t = evText(ev); logLine(t); if (ev.after) FT.view = ev.after; const tgt = ev.who === 'p' ? 'E' : 'P', im = document.getElementById('im' + tgt), me = document.getElementById('im' + (ev.who === 'p' ? 'P' : 'E'));
    const fx = G.fx, who = ev.who === 'p' ? FT.d : FT.opp, elc = G.ELC[(ev.who === 'p' ? FT.F.p : FT.F.e).el], pz = ev.act === 'kukre' ? 'P7' : ev.act === 'savun' ? 'P6' : ev.act === 'nefes' || (ev.act || '').startsWith('card') ? 'P12' : ev.act === 'pence' ? 'P8' : null;
    if (pz && who && who.stage === 'yetiskin' && typeof hasPose === 'function' && hasPose(who, pz) && !window.__fastFx) { const base = me.dataset.base || (me.dataset.base = me.getAttribute('src')); me.src = G.poz(who, pz); clearTimeout(me._pz); me._pz = setTimeout(() => { me.src = base; }, 720); }
    if (ev.act !== 'savun' && ev.act !== 'stun' && ev.act !== 'teslim') { me.classList.remove('hamle'); void me.offsetWidth; me.classList.add('hamle'); }
    if (fx && ev.act === 'kukre') { fx.shake(document.getElementById('dov')); fx.stars(me, 8, '#fff3c4'); } if (fx && ev.act === 'savun') fx.stars(me, 8, '#a6e0ff');
    if ((ev.act === 'nefes' || (ev.act || '').startsWith('card')) && !ev.miss) { isin(me, im, elc); if (EO2.audio && EO2.audio.fire) EO2.audio.fire(); }
    else if (ev.act === 'pence' && EO2.audio && EO2.audio.whoosh) EO2.audio.whoosh();
    else if (ev.act === 'kukre' && EO2.audio && EO2.audio.charge) EO2.audio.charge();
    if (fx && (ev.act === 'nefes' || (ev.act || '').startsWith('card')) && !ev.miss) { const a = me.getBoundingClientRect(), b = im.getBoundingClientRect(), A = app.getBoundingClientRect(); for (let i = 1; i <= 5; i++) setTimeout(() => fx.burst([a.left - A.left + a.width / 2 + (b.left + b.width / 2 - a.left - a.width / 2) * i / 6, a.top - A.top + a.height * 0.42], elc, 5), i * 28); }
    if (ev.dmg && !ev.miss && !ev.blocked) { await wait(170); const d = document.getElementById('dm' + tgt); d.textContent = '-' + ev.dmg; d.className = ev.crit ? 'kritik' : ''; void d.offsetWidth; d.classList.add('uc'); im.classList.remove('vuruldu'); void im.offsetWidth; im.classList.add('vuruldu');
      const hs = ev.after && (tgt === 'E' ? ev.after.e : ev.after.p), olum = !!(hs && typeof hs.hp === 'number' && hs.hp <= 0), don = carpma(im, tgt, ev, olum);
      if (fx) { fx.burst(im, ev.act === 'pence' ? '#fff' : elc, olum ? 40 : ev.crit ? 26 : 12); fx.shake(document.getElementById('dov'), !!(ev.crit || olum)); if (ev.crit || olum) fx.flash(olum ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.28)'); } if (don) await wait(don); if (EO2.audio) (ev.crit ? EO2.audio.boom || EO2.audio.pop : EO2.audio.hit || EO2.audio.pop)(); }
    else if (EO2.audio) EO2.audio.pop();
    bars(); await wait(FT.auto ? 300 : 620); }
  async function act(x) { if (!FT || FT.busy || FT.F.over || !can(x)) return; if (FT.mode === 'mp') return mpHamle(x);
    FT.busy = true; paint(); const evs = FT.srv ? tohumla(FT.srv.rnd, () => fightRound(FT.F, x)) : fightRound(FT.F, x); if (FT.srv) FT.srv.acts.push(x); for (const ev of evs) await play(ev); await turKaresi(evs); if (!FT) return; FT.busy = false;
    if (FT.F.over) return finish(); paint(); if (FT.auto) act(pickAuto()); }
  function closeFight() { const w = document.getElementById('dov'); if (w) w.remove(); FT = null; }
  async function died(d, why, where) { killDragon(d, why); afterAction(true); await G.pen({ k: where, t: esc(d.name) + ' aramızdan ayrıldı', face: G.img(d), body: '<p>' + esc(d.name) + ' ' + why + '. Ocak bu gece sessiz.</p>', btns: [{ t: 'Uğurla', cls: 'altin' }] }); }
  async function ending() { closeFight(); return G.son(); }
  /* Gök Kulesi (js/endgame.js): kat kurulumu, ödül, lütuf ve sıfırlama kuralları oyunun kendisidir; dövüş 2.0 sahnesinde oynanır */
  G.kuleBasla = d => { if (!d || d.dead || d.stage === 'yavru') return; window.fightModal = () => {}; startKuleFloor(d); FT.auto = false; FT.busy = false; G.close(); return sunucuAc().then(fightUI); };
  async function kuleSonra(d, kat, won) { const T = ensureTowerState(); if (!won || d.dead) return G.open('kule');
    const sec = shuffle([...TOWER_BOONS]).slice(0, 3), i = await G.vn({ bg: 'a:kule', k: kat + '. kat tamamlandı · sıradaki: kat ' + T.curFloor, name: 'Kadim Kule Sunağı', face: G.img(d), dragon: true,
      text: esc(d.name) + ' kulenin ' + kat + '. katını aştı. Mermer sunaktaki üç kadim mühürden birini seçip ' + T.curFloor + '. kata tırmanabilir ya da dinlenmek için ocağa dönebilirsin.',
      btns: [...sec.map((b, j) => ({ t: b.ad + ': ' + b.d, v: j })), { t: 'Ganimetle kuleden ayrıl', v: -1 }] });
    if (i >= 0 && sec[i]) { if (!T.boons.includes(sec[i].k)) T.boons.push(sec[i].k); saveGame(); return G.kuleBasla(d); } G.open('kule'); }
  async function finish() { const { F, d, opp } = FT; let lines = [], dead = false, tourOver = false;
    /* altın: sunucu dövüşü yeniden oynatır ve öder; yerel keseye arena altını yazılmaz */
    const srv = await sunucuBitir(), won = F.winner === 'p';
    const altin = g => srv && srv.ok ? '+' + srv.gold + ' altın' : '<span class="kotu">altın yazılmadı</span>';
    const altinNot = () => { if (!srv || srv.ok || !won) return; lines.push(srv.bekliyor ? '<span class="kotu">Sonuç sunucuya ulaşmadı. Bağlantı gelince yeniden gönderilecek; ödül o zaman yazılır.</span>' : '<span class="kotu">Çevrimdışı dövüş: altın ödülü yazılmadı' + (srv.why === 'çevrimdışı' ? '' : ' (' + srv.why + ')') + '.</span>'); };
    if (FT.mode === 'kule') { const g0 = S.gold; finishKuleFight(); lines = (FT.result || []).map(x => x.replace(/class="good"/g, 'class="iyi"').replace(/class="bad"/g, 'class="kotu"'));
      if (won) { S.gold = g0; lines[0] = lines[0].replace(/\+\d+ altın/, altin()); altinNot(); } }      // oyunun yazdığı kat ödülü geri alınır: altını sunucu yazdı
    else if (FT.mode === 'tour') { const T = S.tour; d.fat = clamp(d.fat + 12, 0, 100);
      if (won) { const g = T.odul[T.round], u = T.un[T.round]; S.un += u; d.w++; S.st.wins++; addBond(d, 3); nudge(d, 'ces', 3); d.tourW = d.tourW || {}; d.tourW[T.id] = Math.max(d.tourW[T.id] || 0, T.round + 1);
        lines.push('<b class="iyi">' + ['İlk turu', 'Yarı finali', 'Finali'][T.round] + ' kazandın!</b> ' + altin(g) + ', +' + u + ' ün.'); altinNot();
        if (typeof awardChibiStones === 'function') { const rs = awardChibiStones({ stones: { kor_t2: ri(1, 2) } }); if (rs.length) lines.push('Turnuva Turu Ödülü: <b>' + rs.join(', ') + '</b>.'); }
        T.hp = F.p.hp; T.round++; if (F.p.saves) d.saved = (d.saved || 0) + F.p.saves; if (T.round === 3 && T.id === 'kupa' && typeof rivalBeaten === 'function') rivalBeaten('demirhan', 6);
        if (T.round >= 3) { d.champ = T.id; if (T.id === 'tac') { S.flags = S.flags || {}; S.flags.champ = true; S.flags.kizilTac = true; S.st.kupa = (S.st.kupa || 0) + 1; }
          if (typeof awardChibiStones === 'function') { const got = awardChibiStones({ stones: T.id === 'tac' ? { anka_koruma: 1, kor_t3: 2 } : { anka_koruma: 1, kor_t2: 2 } }); if (got.length) lines.push('<b class="iyi">Şampiyonluk Hazinesi:</b> ' + got.join(', ') + '!'); }
          if (typeof titleCheck === 'function') titleCheck(d); snapAlbum('tour', T.ad, d.name + ' ' + ek(T.ad, 'acc') + ' kazandı!', d); T.done = true; T.won = true; tourOver = true; T.summary = d.name + ' şampiyon oldu!'; chron(d.name + ' ' + ek(T.ad, 'acc') + ' kazandı!'); lines.push('<b>' + T.ad + ' senin!</b>'); } }
      else { d.l++; S.st.losses++; T.done = true; T.won = false; tourOver = true; const where = ['ilk turda', 'yarı finalde', 'finalde'][T.round]; T.summary = d.name + ' ' + where + ' elendi.'; chron(d.name + ' ' + ek(T.ad, 'loc') + ' ' + where + ' elendi.');
        lines.push(F.surrender ? 'Teslim oldun ve turnuvadan çekildin.' : '<span class="kotu">' + where[0].toUpperCase() + where.slice(1) + ' elendin.</span>');
        if (!F.surrender) { if (chance(hasMark(d, 'Temkinli') ? 25 : 50)) d.inj = ri(1, 2); const r = rollDeath(d, 10); if (r.anka) lines.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümden döndü.'); else if (r.died) { dead = true; lines.push('<b class="kotu">' + esc(d.name) + ' ayağa kalkmadı.</b>'); } }
        addMood(d, -1, true); } }
    else { const g0 = S.gold, out = fightOutcome(d, F, FT.tier, opp); lines = out.lines;
      if (out.won) { S.gold = g0; lines[0] = lines[0].replace(/\+\d+ altın/, altin()); altinNot(); }      // oyunun yazdığı ilan ödülü geri alınır: altını sunucu yazdı
      if (!out.won && !F.surrender && FT.lethal) { const r = rollDeath(d, TIERS[FT.tier].olum); if (r.anka) lines.push('<b>Anka Külü alev aldı!</b> Ejderhan ölümün eşiğinden döndü. Tılsım yandı.'); else if (r.died) { dead = true; lines.push('<b class="kotu">' + esc(d.name) + ' ayağa kalkmadı.</b>'); } else lines.push('Ölüm zarı (%' + r.risk + ') tuttu; ' + esc(d.name) + ' yaralı ama hayatta.'); }
      if (!out.won && F.surrender && FT.tier === 'cukur' && srv && srv.ok && srv.a.penalty) S.gold += srv.a.penalty;      // çukur cezasını sunucu kendi kesesinden kesti; gösterge sunucudan düşer
      if (out.won && FT.bet && srv && srv.ok) lines.push('Bahis kâğıdı kazandı: <b class="iyi">+' + FT.bet + ' altın</b> (ödülün içinde).');
      S.arena[FT.tier].splice(FT.idx, 1); d.task = { t: 'done', what: (out.won ? 'Kazandığı' : 'Kaybettiği') + ' bir dövüşe çıktı' }; }
    const mode = FT.mode, tier = FT.tier, kat = FT.floor; paint(); if (EO2.audio) (won ? EO2.audio.win || EO2.audio.chime : EO2.audio.pop)();
    await wait(500); await G.pen({ k: FT.title, t: won ? 'Zafer' : F.surrender ? 'Teslim' : 'Yenilgi', face: G.img(d), body: '<div class="rap">' + lines.map(l => '<div class="genel"><span>' + l + '</span></div>').join('') + '</div>', btns: [{ t: 'Devam', cls: 'altin' }] });
    closeFight();
    if (mode === 'kule') { afterAction(true); return kuleSonra(d, kat, won); }
    if (dead) { await died(d, mode === 'tour' ? 'turnuvada öldü' : tier === 'cukur' ? 'Yeraltı Çukuru\'nda öldü' : 'arenada öldü', mode === 'tour' ? 'Turnuva' : 'Arena'); if (mode === 'tour' && S.tour.id === 'tac') { S.over = true; S.ending = 'tac-kayip'; return ending(); } afterAction(); return; }
    if (mode === 'tour' && !tourOver) { afterAction(true); return tourRound(); }
    if (mode === 'tour' && S.tour.id === 'tac') { S.over = true; S.ending = S.tour.won ? 'taj' : 'tac-kayip'; afterAction(true); return ending(); }
    /* arena hikâyeleri (js/arenastory.js) dövüş sonrası sahnelerden önce gelir; eski finishFight ile aynı sıra */
    const asr = mode !== 'tour' && typeof arenaStoryNext === 'function' ? arenaStoryNext(d, tier, opp, won) : null;
    if (asr && typeof ASTORY !== 'undefined' && ASTORY[asr[0]]) { const olay = Object.assign({ id: asr[0], astory: 1 }, ASTORY[asr[0]], { ctx: asr[1] }); let hikaye = false;
      /* "Çukurun Efsanesi": Ağa'nın 100 altını yerel keseye yazılmaz; sunucu, kendi doğruladığı Kanlı Gece zaferine karşılık öder (arena.story) */
      if (asr[0] === 'as_efsane') olay.opts = olay.opts.map(o => Object.assign({}, o, { fx: (...a) => { const g = S.gold, r = o.fx(...a); if (S.gold - g === 100) { S.gold = g; hikaye = true; } return r; } }));
      await G.olay(olay);
      if (hikaye) EO2.ag.komut('arena.story', { id: 'efsane' }).then(r => toast('Çukur Ağası\'nın kesesi sunucuya yazıldı: <b class="au">+' + r.result.arenaStory.gold + ' altın</b>', 'iyi'), e => toast('Ağa\'nın 100 altını yazılmadı (' + neden(e) + ').', 'kotu')); }
    else if (mode !== 'tour' && typeof pickFightPost === 'function' && chance(45) && S.dragons.includes(d)) { const pp = pickFightPost(d, opp, won); if (pp) await postScene(pp); }
    afterAction(); }
  /* maç öncesi ve sonrası sahneler: oyunun kendi olayları (js/fightev.js). Öncesinde verilen destek dövüşçüye işlenir, bahis kazanılırsa ödenir. */
  async function preScene(pe, d, o) { const c = pe.c, face = G.img(o), i = await G.vn({ bg: 'bg-arena', k: 'Dövüşten önce', name: pe.ev.title, face: G.img(d), dragon: true, face2: face, text: pe.ev.text(c), btns: pe.ev.opts.map((x, i) => ({ t: typeof x.t === 'function' ? x.t(c) : x.t, v: i })) });
    const res = pe.ev.opts[i].fx(c); afterAction(true); await G.vn({ bg: 'bg-arena', k: 'Dövüşten önce', name: pe.ev.title, face: G.img(d), dragon: true, face2: face, text: res.r, btns: [{ t: 'Arenaya çık', cls: 'altin' }] }); return { buff: res.b, bet: res.bet || 0, buffText: pe.ev.title + ': ' + res.r }; }
  async function postScene(pp) { const c = pp.c, face = G.img(c.d);
    /* "Locadan Bir Teklif": satılan ejderha sunucu kökenliyse (kazanılmış varlık) satış sunucudan geçer: yerel keseye altın yazılmaz,
       bedeli sunucu kendi kopyasının değeriyle öder (offer.sell). Yerel kökenli ejderhada satış eskisi gibi yereldedir. */
    if (pp.ev.id === 'teklif' && EO2.ocakDefteri && EO2.ocakDefteri.sunucuKokenli(c.d)) { const d0 = c.d, id = d0.assetId;
      pp = Object.assign({}, pp, { ev: Object.assign({}, pp.ev, { opts: pp.ev.opts.map((o, k) => k ? o : Object.assign({}, o, { req: () => cevrimici() ? null : 'Çevrimdışıyken satılamaz', fx: x => { const g = S.gold, r = o.fx(x); if (!S.dragons.includes(d0)) { S.gold = g; EO2.ocakDefteri.teklif(id); return r + ' Bedeli hesabına yazılıyor.'; } return r; } })) }) }); }
    const i = await G.vn({ bg: 'bg-arena', k: c.won ? 'Zaferin ardından' : 'Dövüşten sonra', name: pp.ev.title, face, dragon: true, text: pp.ev.text(c), btns: pp.ev.opts.map((x, i) => { const why = x.req ? x.req(c) : null; return { t: typeof x.t === 'function' ? x.t(c) : x.t, sub: why || '', off: why || null, v: i }; }) });
    const r = pp.ev.opts[i].fx(c); afterAction(true); if (r) await G.vn({ bg: 'bg-arena', k: c.won ? 'Zaferin ardından' : 'Dövüşten sonra', name: pp.ev.title, face, dragon: true, text: r }); }
  function start(d, opp, ctx) { const F = newFight(fighterFromDragon(d), fighterFromOpp(opp)); if (ctx.buff && typeof applyBuff === 'function') applyBuff(F.p, ctx.buff); FT = Object.assign({ F, d, opp, log: [], auto: false, busy: false }, ctx); if (ctx.buffText) FT.log.push({ t: ctx.buffText, c: 'soluk' });
    if (typeof scoutBuff === 'function') { const sb = scoutBuff(d, F.p); if (sb) FT.log.push({ t: sb, c: 'soluk' }); } return F; }
  function tourRound() { const T = S.tour, d = byId(T.dragon), opp = genOpp(null, T.rounds[T.round], T.gear);
    if (T.id === 'tac' && T.round === 2) { const rv = rivals()[0], L = Math.round((T.rounds[2] + rv.power) / 2); Object.assign(opp, genOpp(null, L, T.gear), { id: opp.id });
      Object.assign(opp, { name: (rv.champ && rv.champ.name) || 'Karabela', trainer: 'Demirhan', el: 'golge', eye: 'A', horn: 't', pat: 'd', arch: 'Saf kanlı şampiyon', traits: ['demir'] });
      if (S.flags.demHelped) Object.assign(opp, { traits: [], arch: 'Saf kanlı şampiyon · borcunu ödüyor' }); if (S.flags.demRefused) { for (const k of STATS) opp.st[k] = Math.round(opp.st[k] * 0.92); opp.arch = 'Saf kanlı şampiyon · yarası tam kapanmadı'; } }
    if (T.id === 'kupa' && T.round === 2) Object.assign(opp, { trainer: 'Demirhan', name: 'Kuzgun' });
    const F = start(d, opp, { mode: 'tour', lethal: true, risk: deathRisk(d, 10), title: T.ad + ' · ' + ['İlk tur', 'Yarı final', 'Final'][T.round] + ' · ' + opp.trainer });
    if (T.hp != null) { F.p.hp = Math.round(T.hp + (F.p.maxHp - T.hp) * 0.5); if (T.round > 0) FT.log.push({ t: 'Turlar arası yaraların yarısı sarıldı. ' + esc(d.name) + ' ' + F.p.hp + '/' + F.p.maxHp + ' canla çıkıyor.', c: 'soluk' }); }
    return sunucuAc().then(fightUI); }
  function startTour(d) { const T = S.tour; d.tourW = d.tourW || {}; if (d.tourW[T.id] == null) d.tourW[T.id] = 0; if (typeof careerCheck === 'function') careerCheck(false); T.dragon = d.id; T.round = 0; T.hp = null; d.task = { t: 'done', what: ek(T.ad, 'loc') + ' dövüştü' }; tourRound(); }
  EO2.arena = { fight: () => FT, act, er: () => ER,
    /* meydandaki oyuncu kartından: Er Meydanı (canlı ejderha düellosu) o oyuncu seçili olarak açılır. Oyuncu lobideyse "Meydan oku"
       düğmesi hazırdır; değilse listede görünmez ve bunu söyleriz (düello için iki tarafın da ejderhasıyla meydana girmesi gerekir). */
    erCagir(h, ad) { if (!G.live || FT) return; UI.arenaTier = 'er'; ER.sec = h; G.open('arena');
      setTimeout(() => { const var_ = ER.lobi && ER.lobi.players.some(p => p.handle === h); toast(var_ ? esc(ad || 'Terbiyeci') + ' Er Meydanı\'nda. <b>Meydan oku</b> ile çağır.' : esc(ad || 'Terbiyeci') + ' henüz Er Meydanı\'na girmemiş. Sohbetten çağır; Arena → Er Meydanı\'na gelince burada görünür.'); }, 1200); } };

  /* ================= Er Meydanı: oyuncuya karşı dostça düello =================
     Görev bulucu mantığı: lobiye ejderhanla girersin; kuyruğa girer (eşleşince dövüş kendiliğinden açılır), sancak diker
     (açık oda; ilk gelenle dövüşürsün), dikili bir sancağa katılır ya da birine meydan okursun. Dövüş bu dosyadaki sahnede
     oynanır; iki taraf hamlesini sunucuya yollar, turu sunucu çözer (js/duel_engine.js), iki ekran aynı sonucu oynatır.
     DOSTÇA: altın, ün, taş, yorgunluk, yara, ölüm YOK. Yerel kayda hiçbir şey yazılmaz. */
  const ER = { lobi: null, sec: null, girdi: null, davet: null, sira: Promise.resolve() };
  const ET = { idle: 'meydanda', queue: 'eşleşme arıyor', found: 'rakip buldu', room: 'sancağı dikili', fight: 'dövüşte' };
  const benim = () => ((EO2.ag && EO2.ag.kimlik()) || {}).handle;
  const erDurum = () => { const me = ER.lobi && ER.lobi.players.find(p => p.handle === benim()); return me ? me.status : null; };
  const erAcik = () => UI.arenaTier === 'er' && document.querySelector('#scr.acik .scr-b.ar2');
  const dovusci = d => { const f = Object.assign({}, fighterFromDragon(d), { seasonMult: typeof seasonMult === 'function' ? seasonMult(d.el) : 1 }); delete f.ref; return f; };
  /* rakibin ekranında çizilecek kopya: yalnız görünüş ve ad (G.img bunlardan çizer) */
  const vitrin = d => sec(d, ['id', 'name', 'el', 'stage', 'sex', 'genes', 'gx', 'hue', 'eye', 'pat', 'horn', 'cos', 'old', 'retired', 'st', 'bond', 'traits', 'cards', 'w', 'l']);
  const erIste = (action, extra) => EO2.ag.gonder(Object.assign({ type: 'duel_lobby', action }, extra || {}));
  function erGir(d) { if (!d || !cevrimici()) return; ER.girdi = d.id; erIste('enter', { star: vitrin(d), duelFighter: dovusci(d) }); }
  function erCik() { if (ER.girdi != null && cevrimici() && !(FT && FT.mode === 'mp')) erIste('leave'); ER.girdi = null; ER.lobi = null; ER.sec = null; }
  const erTazele = () => { if (erAcik() && G.sakin() && !FT) render(); };

  function erCiz(body, f, elig, sekme, sekmeBagla) {
    const acik = cevrimici(); if (acik && f && ER.girdi !== f.id) erGir(f);
    const L = ER.lobi, ben = benim(), diger = L ? L.players.filter(p => p.handle !== ben) : [], st = erDurum();
    if (ER.sec && !diger.find(p => p.handle === ER.sec)) ER.sec = null; if (!ER.sec && diger.length) ER.sec = (diger.find(p => p.status === 'room') || diger[0]).handle;
    const r = diger.find(p => p.handle === ER.sec) || null, guc = f ? pw(f) : 0;
    const muhur = st === 'found' ? ['kolay ara', 'Rakip bulundu'] : st === 'queue' ? ['denk ara', 'Eşleşme aranıyor'] : st === 'room' ? ['kolay ara', 'Sancağın dikili · rakip bekleniyor'] : r ? [r.power > guc * 1.25 ? 'olum' : r.power > guc * 1.05 ? 'zor' : r.power > guc * 0.82 ? 'denk' : 'kolay', 'Güç ' + guc + ' · ' + r.power] : ['denk', 'Meydan boş'];
    body.innerHTML = sekme + '<div class="ag-rozet ' + (acik ? 'acik' : 'kapali') + '"><i></i>' + (acik ? 'Dostça düello · ödül yok · turu sunucu çözer' : 'Çevrimdışı: Er Meydanı kapalı') + '</div>' +
      '<div class="ar-ben" style="--el:' + (f ? G.ELC[f.el] : '#888') + '">' + (f ? '<img class="ar-ej" alt="" src="' + G.img(f) + '"><div class="ar-ad"><span class="ust">' + STAGE_AD[f.stage] + ' · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>Güç ' + guc + ' · ' + esc(ben || '') + '</small></div>' : '<p class="ah-not">Boşta dövüşçü yok: ejderlerin görevde ya da sakat.</p>') + '</div>' +
      (elig.length > 1 ? '<div class="ar-kadro">' + elig.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"' + (st === 'queue' || st === 'room' || st === 'found' ? ' disabled' : '') + '><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      (!acik ? '<div class="ar-kilit"><i></i><p>Er Meydanı sunucuya bağlanınca açılır.<br>Şu an çevrimdışısın.</p><button type="button" class="gbtn altin" data-er="baglan">Yeniden bağlan</button></div>' :
        (r ? '<div class="ar-rakip" style="--el:' + G.ELC[r.dragon.el] + '"><img class="ar-ej" alt="" src="' + G.img(r.dragon) + '"><div class="ar-ad"><span class="ust">' + esc(r.handle) + ' · ' + ET[r.status] + '</span><h2>' + esc(r.dragon.name) + '</h2><small><span class="etk el-' + r.dragon.el + '">' + EL_AD[r.dragon.el] + '</span>' + (elMult(f ? f.el : 'ates', r.dragon.el) > 1 ? '<span class="etk iyi">üstünsün</span>' : f && elMult(r.dragon.el, f.el) > 1 ? '<span class="etk kotu">dezavantaj</span>' : '') + '</small></div></div>'
           : '<div class="ar-rakip er-bos"><div class="er-siluet"></div><p>Meydanda senden başka terbiyeci yok.<br>Kuyruğa gir ya da sancağını dik; biri gelince dövüş kendiliğinden açılır.</p></div>') +
        '<div class="ar-orta er-orta"><i class="vs2">VS</i><span class="damga2 ' + muhur[0] + '">' + muhur[1] + '</span></div>' +
        '<div class="ar-alt er-alt"><div class="ar-odul"><b class="au">Dostça düello</b><span>altın ve ün yazılmaz</span><span>' + (diger.length ? diger.length + ' terbiyeci meydanda' : 'meydan sessiz') + '</span></div>' +
          '<div class="er-dugme">' +
            (st === 'found' ? '' : st === 'queue' ? '<button type="button" class="gbtn buyuk" data-er="unqueue">Aramayı bırak</button>' : '<button type="button" class="gbtn buyuk altin" data-er="queue" ' + (f && st !== 'room' ? '' : 'disabled') + '>Eşleşme ara</button>') +
            (st === 'room' ? '<button type="button" class="gbtn buyuk" data-er="room_close">Sancağı indir</button>' : '<button type="button" class="gbtn buyuk" data-er="room_open" ' + (f && st !== 'queue' && st !== 'found' ? '' : 'disabled') + '>Sancak dik</button>') +
            (r && f && st === 'idle' && r.status === 'room' ? '<button type="button" class="gbtn buyuk kor" data-er="join">Sancağına katıl</button>' : r && f && st === 'idle' && r.status !== 'fight' ? '<button type="button" class="gbtn buyuk kor" data-er="invite">Meydan oku</button>' : '') +
          '</div>' +
          '<div class="kadro">' + diger.map(x => '<button type="button" class="madalyon ejm er-' + x.status + '" data-ersec="' + esc(x.handle) + '" aria-pressed="' + (x.handle === ER.sec) + '" title="' + esc(x.handle) + ' · ' + ET[x.status] + '"><img alt="" src="' + G.img(x.dragon) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.dragon.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(x.dragon.name) + '</span></button>').join('') + '</div></div>');
    sekmeBagla(); on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); }); on(body, '[data-ersec]', b => { ER.sec = b.dataset.ersec; render(); });
    on(body, '[data-er]', b => { const x = b.dataset.er;
      if (x === 'baglan') return EO2.ag.baglan().then(() => render());
      if (x === 'invite') { if (EO2.ag.gonder({ type: 'duel_invite', to: ER.sec })) toast('Meydan okuma gönderildi: ' + esc(ER.sec), 'iyi'); return; }
      if (x === 'join') return erIste('room_join', { host: ER.sec });
      erIste(x); });
  }

  /* ---------- sunucu görüntüsünü dövüş sahnesine çevir: ben hep soldayım ---------- */
  const cevir = (fight, rol) => { const F = JSON.parse(JSON.stringify(fight)); if (rol === 'e') { const p = F.e, e = F.p; F.p = p; F.e = e; p.side = 'p'; e.side = 'e'; if (F.winner) F.winner = F.winner === 'p' ? 'e' : 'p'; } return F; };
  const olayCevir = (ev, rol) => { if (rol !== 'e') return ev; const o = Object.assign({}, ev, { who: ev.who === 'p' ? 'e' : 'p' }); if (ev.after) o.after = { p: ev.after.e, e: ev.after.p }; return o; };
  async function mpAc(m) { const rol = m.players[0].handle === m.you ? 'p' : 'e', ben = m.players[rol === 'p' ? 0 : 1], rakip = m.players[rol === 'p' ? 1 : 0];
    for (let i = 0; i < 60 && (FT || !G.sakin()); i++) await wait(500);      // açık pencere ya da başka dövüş varsa bitmesini bekle
    if (FT) return EO2.ag.gonder({ type: 'duel_leave', roomId: m.roomId });
    if (ER.davet) { ER.davet(false); ER.davet = null; }
    const d = byId(ER.girdi) || byId(UI.arenaSel) || S.dragons[0];
    FT = { mode: 'mp', F: cevir(m.fight, rol), d, opp: rakip.dragon, rakip: rakip.handle, oda: m.roomId, rol, log: [], auto: false, busy: false, bekle: (m.submitted || []).includes(m.you), title: 'Er Meydanı · ' + rakip.handle };
    /* öteki oyuncu meydanda görünüyorsa adı ve kuşam seti oradan alınır: dövüşte kendi avatarıyla durur */
    { const K = EO2.meydanAg && EO2.meydanAg.kisiler, c = K ? [...K.values()].find(x => x.handle === rakip.handle) : null; FT.rakipAd = c ? c.name : rakip.handle; if (c) FT.rakipSet = c.set; FT.rakipH = rakip.handle; if (c) FT.title = 'Er Meydanı · ' + c.name; }
    FT.log.push({ t: '<b>' + esc(rakip.handle) + '</b> ile dostça düello. ' + (m.via === 'queue' ? 'Kuyruk eşleştirdi.' : m.via === 'room' ? 'Sancak karşılık buldu.' : 'Meydan okuma kabul edildi.') + ' Ödül yok; iki taraf hamlesini seçince tur çözülür.', c: 'soluk' });
    void ben; G.close(); fightUI(); }
  function mpHamle(x) { if (FT.bekle) return; if (!EO2.ag.gonder({ type: 'duel_action', roomId: FT.oda, round: FT.F.round + 1, action: x })) { logLine({ t: 'Bağlantı yok; hamle gönderilemedi.', c: 'kotu' }); return; } FT.bekle = true; paint(); }
  function mpDurum(m) { ER.sira = ER.sira.then(async () => { if (!FT || FT.mode !== 'mp' || FT.oda !== m.roomId) return;
      FT.busy = true; paint(); for (const ev of m.events || []) await play(olayCevir(ev, FT.rol));
      FT.F = cevir(m.fight, FT.rol); FT.view = { p: { hp: FT.F.p.hp, sta: FT.F.p.sta }, e: { hp: FT.F.e.hp, sta: FT.F.e.sta } }; FT.busy = false; FT.bekle = (m.submitted || []).includes(benim());
      if (FT.F.over) return mpBitir(m); paint(); }).catch(e => console.error('[er]', e)); }
  async function mpBitir(m) { const F = FT.F, d = FT.d, kopan = m.fight.disconnected, lines = [];
    const won = F.winner === 'p', berabere = F.winner == null;
    lines.push(berabere ? '<b>Berabere.</b> İki taraf da meydandan çekildi.' : won ? '<b class="iyi">Zafer!</b> ' + (kopan ? esc(FT.rakip) + ' meydanı bıraktı.' : F.surrender ? esc(FT.rakip) + ' teslim oldu.' : esc(FT.opp.name) + ' yere serildi.') : '<span class="kotu">Yenilgi.</span> ' + (kopan ? 'Meydanı bıraktın.' : F.surrender ? 'Teslim oldun.' : esc(d.name) + ' bu kez geride kaldı.'));
    lines.push('Dostça düello: altın, ün ve ganimet yazılmaz. ' + esc(d.name) + ' yorulmadı, yaralanmadı.');
    paint(); if (EO2.audio) (won ? EO2.audio.win || EO2.audio.chime : EO2.audio.pop)(); await wait(500);
    await G.pen({ k: FT.title, t: berabere ? 'Berabere' : won ? 'Zafer' : F.surrender && !kopan ? 'Teslim' : 'Yenilgi', face: G.img(d), body: '<div class="rap">' + lines.map(l => '<div class="genel"><span>' + l + '</span></div>').join('') + '</div>', btns: [{ t: 'Er Meydanı\'na dön', cls: 'altin' }] });
    closeFight(); ER.girdi = null; UI.arenaTier = 'er'; G.open('arena'); }

  /* ---------- ağ olayları ---------- */
  function agBagla() { const A = EO2.ag; if (!A) return;
    A.dinle('duel_lobby_state', m => { ER.lobi = m; erTazele(); });
    A.dinle('durum', d => { if (d !== 'cevrimici') { ER.lobi = null; ER.girdi = null; } if (document.querySelector('#scr.acik .scr-b.ar2') && G.live && G.sakin() && !FT) render(); });
    /* kuyruk eşleşmesi: "rakip bulundu" onayı ve geri sayım; iki taraf onaylayınca sunucu odayı açar */
    A.dinle('duel_match_found', async m => { if (ER.bulundu || FT) return erIste('ready', { matchId: m.matchId, accept: false });
      const sure = Math.max(1, Math.round((m.readyMs || 12000) / 1000)), o = m.opponent; let t = null;
      const yanit = await G.pen({ k: 'Er Meydanı · kuyruk', t: 'Rakip bulundu', face: G.img(o.dragon), body: '<p><b>' + esc(o.dragon.name) + '</b> · ' + esc(o.handle) + ' · Güç ' + o.power + '</p><p>Meydana çıkmak için <b class="au" id="erSayac">' + sure + '</b> saniyen var. Dostça düello: ödül yok.</p>',
        btns: [{ t: 'Vazgeç', v: false }, { t: 'Meydana çık', cls: 'altin', v: true }], on: (pen, done) => { ER.bulundu = done; let k = sure; t = setInterval(() => { k--; const e = pen.querySelector('#erSayac'); if (e) e.textContent = Math.max(0, k); if (k <= 0) clearInterval(t); }, 1000); } });
      clearInterval(t); ER.bulundu = null; if (yanit === 'iptal') return;
      erIste('ready', { matchId: m.matchId, accept: !!yanit }); if (yanit) toast('Hazırsın. Rakibin onayı bekleniyor.', 'iyi'); });
    A.dinle('duel_match_cancelled', m => { if (ER.bulundu) { const kapat = ER.bulundu; ER.bulundu = null; kapat('iptal'); }
      toast(m.requeued ? 'Rakip meydana çıkmadı. Kuyrukta kalıyorsun.' : m.by === benim() ? 'Eşleşmeden vazgeçtin; kuyruktan çıktın.' : m.reason === 'timeout' ? 'Süre doldu; kuyruktan çıktın.' : 'Eşleşme düştü.', m.requeued ? '' : 'kotu'); erTazele(); });
    A.dinle('duel_room_start', m => { mpAc(m).catch(() => {}); });
    A.dinle('duel_room_resume', m => { if (!FT) mpAc(m).catch(() => {}); });
    A.dinle('duel_room_state', mpDurum);
    A.dinle('duel_waiting', m => { if (FT && FT.mode === 'mp' && FT.oda === m.roomId && !FT.busy) { FT.bekle = (m.submitted || []).includes(benim()); paint(); } });
    A.dinle('duel_opponent_disconnected', m => { if (FT && FT.mode === 'mp' && FT.oda === m.roomId) logLine({ t: 'Rakibin bağlantısı koptu. ' + Math.round((m.graceMs || 30000) / 1000) + ' saniye içinde dönmezse meydan senin.', c: 'soluk' }); });
    A.dinle('duel_opponent_reconnected', m => { if (FT && FT.mode === 'mp' && FT.oda === m.roomId) logLine({ t: 'Rakip geri döndü.', c: 'soluk' }); });
    A.dinle('duel_error', m => { if (FT && FT.mode === 'mp') { FT.bekle = (m.submitted || []).includes(benim()); logLine({ t: esc(m.message || 'Düello hatası'), c: 'kotu' }); paint(); } else { if (m.code === 'lobby_required' || m.code === 'sync_required') ER.girdi = null; toast(esc(m.message || 'Er Meydanı isteği reddedildi.'), 'kotu'); erTazele(); } });
    A.dinle('duel_invite_sent', () => {});
    A.dinle('duel_invite_result', m => { if (ER.davet && m.from) { ER.davet(false); ER.davet = null; } if (m.status === 'rejected') toast(esc(m.from || 'Rakip') + ' meydan okumanı geri çevirdi.', 'kotu'); else if (m.status === 'expired' && m.to) toast('Meydan okuman yanıtsız kaldı.', 'kotu'); });
    A.dinle('duel_invite', async m => { if (m.ranked) return;                      // ödüllü oda 2.0'da açık değil
      if (FT || !G.live || !G.sakin() || ER.davet) return A.gonder({ type: 'duel_invite_reply', inviteId: m.id, accept: false });
      const kabul = await G.pen({ k: 'Er Meydanı · dostça düello', t: esc(m.from) + ' meydan okuyor', face: m.dragon ? G.img(m.dragon) : null, body: '<p><b>' + esc(m.dragon ? m.dragon.name : 'Ejderhası') + '</b> ile karşına çıkmak istiyor. Dostça düello: ödül yok, kimse yaralanmaz.</p>', btns: [{ t: 'Geri çevir', v: false }, { t: 'Kabul et', cls: 'altin', v: true }], on: (p, done) => { ER.davet = done; } });
      ER.davet = null; A.gonder({ type: 'duel_invite_reply', inviteId: m.id, accept: !!kabul }); });
    A.dinle('kanal_kapandi', () => { if (FT && FT.mode === 'mp') logLine({ t: 'Sunucu bağlantısı koptu; yeniden bağlanılıyor.', c: 'kotu' }); });
  }
  agBagla();
  /* Er Meydanı ekranından çıkılınca (başka sekme, başka ekran, meydana dönüş) lobiden ve kuyruktan düşülür */
  setInterval(() => { if (ER.girdi != null && !FT && !ER.bulundu && !erAcik()) erCik(); }, 500);


  /* ---------- arena ekranı ---------- */
  /* Arena: eşleşme sahnesi. Dövüşçün solda, seçili rakip sağda karşı karşıya durur; değerler ortada kıyaslanır, rakipler alttaki madalyonlardan seçilir. */
  G.screen('arena', { k: 'Dövüş ve turnuva', t: 'Arena', cls: 'ar2', bg: 'bg-arena', enter() { if (UI.arenaTier !== 'er' && !TIERS[UI.arenaTier]) UI.arenaTier = 'koy'; UI.arenaOpp = 0; }, draw(body) {
    const elig = S.dragons.filter(d => canAct(d)); if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null; if (!UI.arenaSel && elig.length) UI.arenaSel = (elig.find(d => d.stage === 'yetiskin') || elig[0]).id;
    const sekme = '<div class="ar-sekme"><div class="sekme" role="tablist">' + Object.keys(TIERS).map(k => '<button type="button" role="tab" data-tier="' + k + '" aria-selected="' + (k === UI.arenaTier) + '">' + (TIERS[k].flag && !S.flags[TIERS[k].flag] ? '???' : TIERS[k].ad) + '</button>').join('') + '<button type="button" role="tab" class="er-sekme" data-tier="er" aria-selected="' + (UI.arenaTier === 'er') + '">Er Meydanı</button></div></div>';
    const sekmeBagla = () => on(body, '[data-tier]', b => { if (UI.arenaTier === 'er' && b.dataset.tier !== 'er') erCik(); UI.arenaTier = b.dataset.tier; UI.arenaOpp = 0; render(); });
    if (UI.arenaTier === 'er') return erCiz(body, byId(UI.arenaSel), elig, sekme, sekmeBagla);
    const f = byId(UI.arenaSel), tk = UI.arenaTier, T = TIERS[tk]; let lock = '';
    if (T.flag && !S.flags[T.flag]) lock = 'Bu kapının yerini henüz bilmiyorsun.'; else if (T.unReq && S.un < T.unReq) lock = 'Mermer kapıdaki bekçi seni içeri almıyor: ' + T.unReq + ' ün gerekiyor (sende ' + S.un + ').';
    const okStage = f && T.stages.includes(f.stage) && !f.old, opps = lock ? [] : (S.arena[tk] || []); if (!(UI.arenaOpp >= 0 && UI.arenaOpp < opps.length)) UI.arenaOpp = 0; const oi = UI.arenaOpp, o = opps[oi];
    const zor = x => { const adv = f ? elMult(f.el, x.el) : 1, dadv = f ? elMult(x.el, f.el) : 1, p = pw(x), mine = f ? pw(f) : 0, ratio = mine ? (p * dadv) / (mine * adv) : 9; return { adv, dadv, p, mine, st: ratio < 0.82 ? ['kolay', 'Kolay lokma'] : ratio < 1.06 ? ['denk', 'Denk dövüş'] : ratio < 1.3 ? ['zor', 'Zorlu'] : ['olum', 'Çok güçlü'] }; };
    const Z = o ? zor(o) : null, risk = f && T.olum ? deathRisk(f, T.olum) : 0;
    const kiyas = o && f ? '<div class="kiyas">' + STATS.map(k => { const a = f.st[k], b = o.st[k], m = Math.max(a, b, 1); return '<div><b class="' + (a >= b ? 'ust' : '') + '">' + a + '</b><span class="cb sol"><i style="width:' + (a / m * 100) + '%"></i></span><em>' + ST_KISA[k] + '</em><span class="cb sag"><i style="width:' + (b / m * 100) + '%"></i></span><b class="' + (b > a ? 'ust' : '') + '">' + b + '</b></div>'; }).join('') + '</div>' : '';
    let tour = ''; if (S.tour) { const Tt = S.tour, okUn = S.un >= Tt.unReq, cand = f && canAct(f) && f.stage === 'yetiskin' && !f.old;
      tour = '<div class="turnuva2' + (Tt.done ? ' bitti' : '') + '"><span class="ust">Turnuva</span><b>' + Tt.ad + '</b><p>' + (Tt.done ? (Tt.summary || '') : 'Üç tur, tek ejderha. Turlar arasında yaraların yarısı sarılır. Yenilgide ölüm riski %10. Şampiyona ' + Tt.odul[2] + ' altın.' + (okUn ? '' : ' <span class="kotu">Katılmak için ' + Tt.unReq + ' ün gerekiyor (sende ' + S.un + ').</span>')) + '</p>' + (Tt.done ? '' : '<button type="button" class="gbtn altin" data-tour="1" ' + (okUn && cand ? '' : 'disabled') + '>' + (cand ? esc(f.name) + ' ile katıl' : 'Yetişkin bir dövüşçü seç') + '</button>') + '</div>'; }
    body.innerHTML = sekme + '<div class="ag-rozet ' + (cevrimici() ? 'acik' : 'kapali') + '"><i></i>' + (cevrimici() ? 'Arena altını sunucu kesesine yazılır' : 'Çevrimdışı: arena altını yazılmaz') + '</div>' + tour +
      '<div class="ar-ben" style="--el:' + (f ? G.ELC[f.el] : '#888') + '">' + (f ? '<img class="ar-ej" alt="" src="' + G.img(f) + '"><div class="ar-ad"><span class="ust">' + STAGE_AD[f.stage] + ' · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>Güç ' + pw(f) + ' · ' + f.w + ' G ' + f.l + ' M</small></div>' : '<p class="ah-not">Boşta dövüşçü yok: ejderlerin görevde ya da sakat.</p>') + '</div>' +
      (elig.length > 1 ? '<div class="ar-kadro">' + elig.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      (lock ? '<div class="ar-kilit"><i></i><p>' + lock + '</p></div>' : !o ? '<div class="ar-kilit bos"><p>Bu hafta başka rakip kalmadı. Haftaya yeni ilanlar asılır.</p></div>' :
        '<div class="ar-rakip" style="--el:' + G.ELC[o.el] + '"><img class="ar-ej" alt="" src="' + G.img(o) + '"><div class="ar-ad"><span class="ust">' + esc(o.trainer) + ' · ' + o.arch + '</span><h2>' + esc(o.name) + '</h2><small><span class="etk el-' + o.el + '">' + EL_AD[o.el] + '</span>' + (Z.adv > 1 ? '<span class="etk iyi">üstünsün</span>' : Z.dadv > 1 ? '<span class="etk kotu">dezavantaj</span>' : '') + '</small></div></div>' +
        '<div class="ar-orta"><i class="vs2">VS</i>' + (f && okStage ? '<span class="damga2 ' + Z.st[0] + '">' + Z.st[1] + '</span>' : '') + kiyas + '</div>' +
        '<div class="ar-alt"><div class="ar-odul"><b class="au">' + o.odul + ' altın</b><span>+' + T.un + ' ün</span>' + (T.olum ? '<span class="kotu">ölüm riski %' + risk + '</span>' : '') + '</div>' +
          '<button type="button" class="gbtn buyuk ' + (T.olum ? 'kor' : 'altin') + '" data-fight="' + oi + '" ' + (!f || !okStage ? 'disabled' : '') + '>' + (!f ? 'Boşta dövüşçü yok' : okStage ? 'Meydan oku' : f.old ? 'Emekli, dövüşmüyor' : STAGE_AD[f.stage] + ' giremez') + '</button>' +
          '<div class="kadro">' + opps.map((x, i) => { const z = zor(x); return '<button type="button" class="madalyon ejm zr-' + z.st[0] + '" data-opp="' + i + '" aria-pressed="' + (i === oi) + '" title="' + esc(x.name) + '"><img alt="" src="' + G.img(x) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(x.name) + '</span></button>'; }).join('') + '</div></div>');
    sekmeBagla(); on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); }); on(body, '[data-opp]', b => { UI.arenaOpp = +b.dataset.opp; render(); });
    on(body, '[data-tour]', () => { if (f) startTour(f); });
    on(body, '[data-fight]', async b => { const i = +b.dataset.fight, o = S.arena[tk][i]; if (!o || !f) return; if (T.olum) { const ok = await G.pen({ k: T.ad, t: 'Ölüm riski var', body: '<p>Bu dövüşte yenilirsen ' + esc(f.name) + ' için ölüm riski <b class="kotu">%' + deathRisk(f, T.olum) + '</b>.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yine de çık', cls: 'kor', v: true }] }); if (!ok) return; }
      const ctx = { tier: tk, idx: i, lethal: !!T.olum, risk: deathRisk(f, T.olum), title: T.ad + ' · ' + o.trainer }, pe = !window.__noPre && typeof pickFightPre === 'function' && chance(55) ? pickFightPre(f, o, tk) : null; if (pe) Object.assign(ctx, await preScene(pe, f, o));
      UI.arenaOpp = 0; start(f, o, ctx); await sunucuAc(); fightUI(); });
  } });
})();
