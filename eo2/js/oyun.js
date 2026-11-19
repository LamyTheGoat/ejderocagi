/* Ejder Ocağı 2.0 · oyun katmanı
   Oyunun kendi kuralları (js/core.js, js/week.js ...) üzerine 2.0 arayüzü: giriş, gerçek verili HUD, ekran çerçevesi,
   pencereler ve hafta sonu akışı. Kural, fiyat ve ödül burada tanımlanmaz; yalnız çağrılır ve gösterilir. */
(function () {
  'use strict';
  const EO2 = window.EO2, OLD = window.EO2_OLD || 'oyun/', $id = id => document.getElementById(id), app = $id('app');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = EO2.game = { live: false, busy: false, OLD };
  EO2.surum = '2.0.0';
  /* yumurta çizimi: genlerdeki baskın elemente göre (eski oyun da yumurtayı elementinin rengiyle gösterir); gen yoksa sedef yumurta */
  G.yumurtaResim = e => { let el = ''; try { const g = e && e.genes && e.genes.el; el = g ? (typeof expEl === 'function' ? expEl(g) : g[0]) : (e && e.el) || ''; } catch (_) { el = ''; }
    return 'assets/ik/yum-' + (['ates', 'buz', 'firtina', 'toprak', 'golge'].includes(el) ? el : 'soy') + '.webp?v=2'; };   // sürüm numarası: giriş ekranındaki künyede ve sorun bildirimlerinde görünür
  const EV_NPC = { harita: 'selin', bataklik: 'selin', demirhan: 'demirhan', tac_davet: 'demirhan', dem2: 'demirhan', dem3: 'demirhan', dem4: 'demirhan', selin_yavru: 'selin', kor_ani: 'dede', cukur: 'cukur', cukur2: 'cukur', kan_tuccari: 'kantuccari', kerim: 'kerim', kristal: 'tuccar', ozan: 'ozan', sponsor: 'tuccar', kupa_ilan: 'muhtar', hirsiz: 'muhtar', son_gece: 'dede', mektup: 'dede', bilge: 'bilge', pul: 'muhtar' };
  const NPC_AD = { dede: 'Deden', selin: 'Haritacı Selin', demirhan: 'Demirhan', kerim: 'Usta Kerim', tuccar: 'Ejderha tüccarı Rüstem', kantuccari: 'Kan tüccarı', cukur: 'Yara izli adam', muhtar: 'Muhtar', ozan: 'Gezgin ozan', bilge: 'Bilge ejderha' };
  G.ELC = { ates: '#ff7a3d', buz: '#6fd0ff', firtina: '#b58cff', toprak: '#8fcf5a', golge: '#9a6bff' };
  G.img = d => OLD + 'img/dr-' + d.el + '-' + d.stage + '.webp';
  G.npcImg = k => OLD + 'img/npc-' + k + '.webp';
  G.el = el;
  G.url = rel => new URL(OLD + rel, location.href).href;
  G.bgUrl = bg => bg.startsWith('a:') ? new URL('assets/bg/' + bg.slice(2) + '.webp', location.href).href : G.url('img/' + bg + '.webp');      // 'a:ad' = 2.0 için üretilmiş arka plan (eo2/assets/bg), diğerleri oyunun kendi sahneleri      // CSS değişkenine giden adres mutlak olmalı (göreli adres stil dosyasına göre çözülür)

  /* ---------- bildirim ---------- */
  const tray = el('div', 'bildirimler'); tray.setAttribute('aria-live', 'polite'); app.appendChild(tray);
  /* bildirim tepsisi düğmelerin üstüne çıkmaz: olağan yerinde bir düğmeye biniyorsa sırayla öteki yerler denenir, ilk boş olan seçilir.
     G.dugmeyeBiner(kutular): verilen kutulardan biri görünen bir düğmeye, girişe ya da sekmeye değiyor mu (js/rehber.js de kullanır). */
  G.dugmeyeBiner = function (kutular, haric) { const L = kutular.filter(q => q && q.width > 3 && q.height > 3); let alan = 0; if (!L.length) return 0;
    for (const b of document.querySelectorAll('#app button, #app input, #app select, #app [role="button"], #app [role="tab"], #app > .rehber:not([hidden])')) {   /* öğretici şeridi de engeldir: bildirim onun yazısına binmez */ if ((haric && haric.contains(b)) || b.closest('#world, #anchors, #loading')) continue;
      const r = b.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue; const cs = getComputedStyle(b); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none' || +cs.opacity < 0.05) continue;
      for (const q of L) if (Math.min(q.right, r.right) - Math.max(q.left, r.left) > 3 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 3) { const t = document.elementFromPoint((Math.max(q.left, r.left) + Math.min(q.right, r.right)) / 2, (Math.max(q.top, r.top) + Math.min(q.bottom, r.bottom)) / 2); if (t && (t === b || b.contains(t) || t.contains(b))) alan += (Math.min(q.right, r.right) - Math.max(q.left, r.left)) * (Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top)); } }
    return alan; };
  const BY = ['', 'by-ust', 'by-ust2', 'by-orta', 'by-orta2', 'by-alt2', 'by-alt', 'by-bas'], BY_AD = BY.filter(Boolean);
  /* hiçbir yer boş değilse (telefonda baştan sona düğme olan ekranlar) en az binen yer seçilir; bildirim dokunmayı engellemez ve birkaç saniyede gider */
  /* bildirimler boş yere oturur; hiçbir yerde düğmeye binmeden sığmıyorsa (üst üste birkaç bildirim) en eskisi bırakılır ve yeniden denenir:
     tek bildirim de sığmıyorsa en az binen yer seçilir */
  function trayYer() { const biner = () => G.dugmeyeBiner([...tray.children].map(c => c.getBoundingClientRect()), tray);
    for (let tur = 0; tur < 4; tur++) { tray.classList.remove(...BY_AD); if (!biner()) return; let enIyi = '', enAz = Infinity, sigdi = false;
      for (const y of BY) { tray.classList.remove(...BY_AD); if (y) tray.classList.add(y); const a = biner(); if (!a) { sigdi = true; break; } if (a < enAz) { enAz = a; enIyi = y; } }
      if (sigdi) return; tray.classList.remove(...BY_AD); if (tray.children.length > 1) { tray.firstChild.remove(); continue; } if (enIyi) tray.classList.add(enIyi); return; } }
  G.toast = function (html, kind) { const t = el('div', 'bildirim cam' + (kind ? ' ' + kind : ''), html); if (!tray.children.length) tray.classList.remove(...BY_AD); tray.appendChild(t); while (tray.children.length > 4) tray.firstChild.remove(); try { trayYer(); } catch (_) { }
    setTimeout(() => { t.classList.add('git'); setTimeout(() => t.remove(), 400); }, kind === 'goal' ? 4600 : 3000); if (EO2.audio) (kind === 'goal' ? EO2.audio.chime : EO2.audio.pop)(); };
  EO2_BUS.toast = G.toast;
  EO2_BUS.sfx = k => { const a = EO2.audio; if (!a) return; if (k === 'coin' || k === 'bell' || k === 'build' || k === 'grow' || k === 'hatch') a.chime(); else if (k === 'heart' || k === 'chirp') a.chirp(); else if (k === 'error') a.pop(); else a.ui(); };

  /* ---------- pencere: Promise döner; düğmenin değeriyle çözülür ---------- */
  let pens = 0;
  G.pen = function (o) { return new Promise(res => { pens++; const w = el('div', 'pen-perde'), p = el('div', 'pen' + (o.wide ? ' genis' : '')); p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
    p.innerHTML = '<header>' + (o.face ? '<img class="yuz" alt="" src="' + o.face + '">' : '') + (o.k ? '<small>' + o.k + '</small>' : '') + '<h2>' + o.t + '</h2></header><div class="pen-b kay">' + (o.body || '') + '</div><div class="pen-f' + (o.dikey ? ' dikey' : '') + '"></div>';
    const f = p.querySelector('.pen-f'), done = v => { pens--; w.remove(); res(v); };
    for (const b of (o.btns || [{ t: 'Tamam', cls: 'altin', v: true }])) { const x = el('button', 'gbtn ' + (b.cls || ''), b.t + (b.sub ? '<small>' + b.sub + '</small>' : '')); x.type = 'button'; if (b.off) { x.disabled = true; x.title = b.off; if (!b.sub) x.insertAdjacentHTML('beforeend', '<small>' + esc(b.off) + '</small>'); }      // kilidin nedeni dokunmatikte de okunur
      x.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); if (b.fn) { const r = b.fn(p, done); if (r === false) return; if (r && r.keep) return; } done(b.v === undefined ? true : b.v); }); f.appendChild(x); }
    w.appendChild(p); app.appendChild(w); if (o.on) o.on(p, done); const first = f.querySelector('.gbtn:not([disabled])'); if (first) first.focus(); }); };

  /* ---------- hikâye sahnesi: sahne resmi, büyük portre, altta konuşma kutusu, sağda seçenekler ----------
     o: { bg, face, face2, dragon, name, k, text, after, btns:[{t, sub, off, v, cls}] } · Promise seçilen düğmenin değeriyle çözülür. */
  G.vn = function (o) { return new Promise(res => { pens++; const w = el('div', 'vn'); if (o.bg) w.style.setProperty('--sahne', 'url("' + G.bgUrl(o.bg) + '")');
    w.innerHTML = '<div class="vn-kisi' + (o.dragon ? ' ejder' : '') + '">' + (o.face ? '<img alt="" src="' + o.face + '">' : '') + (o.face2 ? '<img class="iki" alt="" src="' + o.face2 + '">' : '') + '</div><div class="vn-sec" hidden></div><div class="vn-kutu"><div class="vn-ad"><b>' + (o.name || '') + '</b>' + (o.k ? '<small>' + o.k + '</small>' : '') + '</div><p class="vn-metin">' + (o.text || '') + '</p>' + (o.after ? '<div class="vn-ek" hidden>' + o.after + '</div>' : '') + '<i class="vn-ok" hidden></i></div>';
    const p = w.querySelector('.vn-metin'), sec = w.querySelector('.vn-sec'), ek = w.querySelector('.vn-ek'), ok = w.querySelector('.vn-ok'), btns = o.btns || [{ t: 'Devam', cls: 'altin', v: true }];
    const nodes = [], tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, total = 0; while ((n = tw.nextNode())) { nodes.push([n, n.nodeValue]); total += n.nodeValue.length; n.nodeValue = ''; }
    let shown = 0, tm = null, ready = false;
    const paint = () => { let left = shown; for (const [nd, full] of nodes) { const k = Math.min(full.length, Math.max(0, left)); if (nd.nodeValue.length !== k) nd.nodeValue = full.slice(0, k); left -= full.length; } };
    const finish = () => { if (ready) return; ready = true; clearInterval(tm); shown = total; paint(); if (ek) ek.hidden = false; sec.hidden = false; ok.hidden = btns.length > 1; const f = sec.querySelector('.gbtn:not([disabled])'); if (f) f.focus(); };
    tm = setInterval(() => { shown += 3; paint(); if (shown >= total) finish(); }, 16);
    const done = v => { pens--; w.classList.add('git'); setTimeout(() => w.remove(), 220); res(v); };
    btns.forEach((b, i) => { const x = el('button', 'gbtn vn-opt ' + (b.cls || ''), '<span>' + b.t + '</span>' + (b.sub ? '<small>' + b.sub + '</small>' : '')); x.type = 'button'; x.style.animationDelay = (i * 0.06) + 's'; if (b.off) { x.disabled = true; x.title = b.off; }
      x.addEventListener('click', e => { e.stopPropagation(); if (EO2.audio) EO2.audio.ui(); if (b.fn) b.fn(); done(b.v === undefined ? true : b.v); }); sec.appendChild(x); });
    w.addEventListener('click', () => { if (!ready) finish(); else if (btns.length === 1 && !btns[0].off) sec.querySelector('.gbtn').click(); });
    app.appendChild(w); if (EO2.audio && EO2.audio.page) EO2.audio.page(); }); };
  const EV_BG = ev => { const id = ev.id || ''; if (ev.rstory || id.startsWith('rs_')) return 'bg-kayalik'; if (['cukur', 'cukur2', 'kan_tuccari', 'as_kanli', 'as_efsane', 'as_kum'].includes(id)) return 'bg-pit'; if (ev.astory || id.startsWith('as_')) return 'bg-arena';
    if (['harita', 'bataklik', 'selin_yavru', 'pul'].includes(id)) return 'bg-harita'; if (['tuccar', 'kristal', 'sponsor', 'kerim', 'dem3'].includes(id)) return 'bg-pazar'; if (ev.ctx && ev.ctx.d) return 'bg-ahir'; return 'bg-ocak'; };
  G.evBg = EV_BG;

  /* ---------- ekran çerçevesi ---------- */
  const scr = el('section', 'scr'); scr.id = 'scr'; scr.setAttribute('aria-hidden', 'true');
  scr.innerHTML = '<header class="scr-h"><button type="button" class="gbtn" id="scrBack">◂ Meydan</button><div class="ad"><small id="scrK"></small><h1 id="scrT"></h1></div><div class="sekme" id="scrNav" role="tablist" hidden></div><span class="res2" title="Altın"><i></i><b id="scrGold"></b></span><span class="res2 un" title="Ün"><i></i><b id="scrUn"></b></span><button type="button" class="gbtn altin" id="scrWeek"></button></header><div class="scr-b" id="scrB"></div>';
  app.appendChild(scr);
  const SCREENS = {}; let cur = null;
  G.screen = (id, def) => { SCREENS[id] = def; };
  G.open = function (id, arg) { if (!G.live || !SCREENS[id]) return; if (cur && cur.id !== id && SCREENS[cur.id].leave) { try { SCREENS[cur.id].leave(); } catch (_) { } }   /* leave: ekrandan çıkılırken (kapanış ya da başka ekrana geçiş) */ cur = { id, arg }; const d = SCREENS[id]; $id('scrK').textContent = d.k; $id('scrT').textContent = d.t; $id('scrB').className = 'scr-b ' + (d.cls || ''); const nav = (G.navOf || {})[id], nv = $id('scrNav'); nv.hidden = !nav; nv.innerHTML = nav ? nav.map(n => '<button type="button" role="tab" data-go="' + n[0] + '" aria-selected="' + (n[0] === id) + '">' + n[1] + '</button>').join('') : ''; nv.querySelectorAll('button').forEach(b => b.addEventListener('click', () => G.open(b.dataset.go))); scr.style.setProperty('--sahne', d.bg ? 'url("' + G.bgUrl(d.bg) + '")' : ''); if (d.enter) d.enter(arg); draw();
    scr.classList.add('acik'); scr.setAttribute('aria-hidden', 'false'); app.classList.add('ekranda'); if (EO2.api) EO2.api.closePanel(); if (EO2.audio) EO2.audio.whoosh && EO2.audio.whoosh(); if (EO2.rehber) EO2.rehber.ekran(id); };
  G.close = function () { if (!cur) return; const eski = SCREENS[cur.id]; cur = null; if (eski && eski.leave) { try { eski.leave(); } catch (_) { } } scr.classList.remove('acik'); scr.setAttribute('aria-hidden', 'true'); app.classList.remove('ekranda'); hud(); if (EO2.rehber) EO2.rehber.ekran(null); };
  G.ekran = () => cur ? cur.id : null;      // açık ekranın kimliği (müzik ve rehber buna bakar)
  /* BASINCA KAYMA YOK (kullanıcı, 2026-11-17): bir ekran ilk açılışta giriş canlandırmasıyla gelir; aynı ekran her dokunuşta yeniden çizilirken
     canlandırmalar baştan oynamaz (gövdeye "yeniden" sınıfı konur; css/deneyim.css giriş canlandırmalarını son hâline alır). */
  function draw() { if (!cur) return; const govde = $id('scrB'); cur.cizim = (cur.cizim || 0) + 1; govde.classList.toggle('yeniden', cur.cizim > 1); $id('scrGold').textContent = S.gold; $id('scrUn').textContent = S.un; $id('scrWeek').innerHTML = S.week >= SEASON ? 'Sezonu Bitir' : 'Haftayı Bitir'; SCREENS[cur.id].draw($id('scrB'), cur.arg); }
  G.redraw = function () { if (!G.live) return; draw(); hud(); };
  EO2_BUS.render = G.redraw;
  $id('scrBack').addEventListener('click', () => G.close());      // çağrı anındaki G.close: başka dosya sarmışsa (kiraathane2.js) o da çalışır
  $id('scrWeek').addEventListener('click', () => G.endWeek());
  EO2.blocked = () => !G.live || !!cur || pens > 0 || !!G.mesgul;
  G.sakin = () => pens === 0 && !G.mesgul && !G.busy;   // açık pencere, sahne ya da hafta geçişi yok: ekran güvenle tazelenebilir
  addEventListener('keydown', e => { if (e.key === 'Escape' && cur && !pens) { e.stopPropagation(); G.close(); } }, true);

  /* ---------- HUD: gerçek veriler ---------- */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function hud() { if (!G.live) return; const chips = document.querySelectorAll('#hud .tc .chip'), se = seasonOf();
    chips[0].innerHTML = '<span class="coin"></span>' + fmt(S.gold); chips[1].lastChild.textContent = fmt(S.un);
    chips[2].innerHTML = '<b>Hafta ' + S.week + '</b>/ ' + SEASON + '<small>' + se.ad + '</small>';
    const pr = document.querySelector('#profile > span'); pr.innerHTML = '<b>' + esc(G.ad()) + '</b><span>' + S.dragons.length + ' / ' + capacity() + ' ejder</span>';
    const ul = document.querySelector('.quests ul'), gs = activeGoals(3);      // hedefe dokununca rehber ilgili yere götürür (js/rehber.js)
    ul.innerHTML = gs.length ? gs.map(g => '<li data-hedef="' + g.id + '" role="button" tabindex="0" title="Oraya git">' + g.t + '<span class="au">+' + g.r + '</span></li>').join('') : '<li class="bos">Bütün hedefler tamam.</li>';
    if (EO2.rehber) EO2.rehber.tazele();
    const b = $id('btnWeek'); if (b) { b.textContent = S.week >= SEASON ? 'Sezonu Bitir' : 'Haftayı Bitir'; b.dataset.hafta = 'Hafta ' + S.week + ' / ' + SEASON; } document.getElementById('profile').style.setProperty('--sezon', Math.round(S.week / SEASON * 100) + '%'); if (EO2.api && EO2.api.player) EO2.api.setPlate(EO2.api.player); }
  G.hud = hud;
  G.plate = () => G.live ? 'Hafta ' + S.week : '';     // oyuncunun isim plakası: seviye yok (K5); şimdilik sezon haftası

  /* ---------- oyuncu adı ----------
     Yerel kayıtta S.terbiyeci alanında durur (eski kayıtlarda yoksa "Terbiyeci"). İsim plakasında, profilde ve menüde görünür.
     Sunucuya yazılmaz: sunucudaki kimlik (oturum handle'ı) ayrı bir iştir. */
  const AD_ONERI = ['Aybars', 'Elçin', 'Toygar', 'Umay', 'Börte', 'Alpagu', 'Asena', 'Kayra', 'İlbey', 'Tomris', 'Çağrı', 'Selcen', 'Bengü', 'Göktuğ', 'Ayşan', 'Demir', 'Tuğrul', 'Gökçen', 'Bars', 'Sungur', 'Almıla', 'Kutay', 'Yağmur', 'Oğuz'];
  const adDuz = s => s.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/[ıî]/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/[üû]/g, 'u').replace(/â/g, 'a');
  /* basit uygunsuz ad süzgeci: kısa kökler yalnız tam sözcük olarak (Işık gibi adlar takılmasın), uzunlar içinde geçerse */
  const AD_YASAK_SOZ = ['sik', 'am', 'got', 'pic', 'aq', 'amk', 'mal', 'gm', 'mod'], AD_YASAK_IC = ['orospu', 'yarak', 'yarrak', 'sikik', 'sikim', 'siktir', 'amcik', 'amina', 'gotveren', 'pezevenk', 'gavat', 'ibne', 'kahpe', 'serefsiz', 'pust', 'fuck', 'shit', 'bitch', 'hitler', 'nazi', 'admin', 'moderator', 'yonetici', 'gamemaster', 'sistem', 'destek'];
  G.adDenetle = function (ham) { const v = String(ham == null ? '' : ham).replace(/\s+/g, ' ').trim();
    if (v.length < 2) return { hata: 'Ad en az iki harf olmalı.' }; if (v.length > 16) return { hata: 'Ad en çok on altı harf olabilir.' };
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû ]+$/.test(v)) return { hata: 'Yalnız harf ve boşluk kullan.' };
    const d = adDuz(v), soz = d.split(' '), bitisik = d.replace(/ /g, '');
    if (soz.some(w => AD_YASAK_SOZ.includes(w)) || AD_YASAK_IC.some(k => bitisik.includes(k))) return { hata: 'Bu ad kullanılamıyor. Başka bir ad dene.' };
    return { ad: v }; };
  G.ad = () => (typeof S !== 'undefined' && S && typeof S.terbiyeci === 'string' && S.terbiyeci) || 'Terbiyeci';
  function adUygula() { const A = EO2.api; if (A && A.player) { A.player.name = G.ad(); if (A.setPlate) A.setPlate(A.player); } }
  G.adUygula = adUygula;
  const adOner = simdiki => { let v; do v = AD_ONERI[Math.floor(Math.random() * AD_ONERI.length)]; while (v === simdiki); return v; };
  const adAlani = (deger, baslik) => '<div class="ad-sor"><label for="adGir">' + baslik + '</label><div class="ad-kutu"><input id="adGir" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" value="' + esc(deger) + '"><button type="button" class="ad-zar" aria-label="Başka bir ad öner" title="Başka bir ad öner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.6 6.4A8 8 0 1 0 20 12h-2.2a5.8 5.8 0 1 1-1.7-4.1L13 11h7V4z" fill="currentColor"/></svg></button></div><p class="ad-hata" role="alert" hidden></p><small>2 ile 16 harf arası. Sonra menüden değiştirebilirsin.</small></div>';
  function adBagla(p) { const inp = p.querySelector('#adGir'), zar = p.querySelector('.ad-zar'), hata = p.querySelector('.ad-hata'); if (!inp) return;
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); const b = p.querySelector('.pen-f .gbtn.altin'); if (b) b.click(); } });
    inp.addEventListener('input', () => { hata.hidden = true; });
    zar.addEventListener('click', () => { inp.value = adOner(inp.value); hata.hidden = true; if (EO2.audio) EO2.audio.pop(); }); }
  function adOnay(p) { const inp = p.querySelector('#adGir'), hata = p.querySelector('.ad-hata'), r = G.adDenetle(inp.value);
    if (r.hata) { hata.textContent = r.hata; hata.hidden = false; const k = p.querySelector('.ad-kutu'); k.classList.remove('salla'); void k.offsetWidth; k.classList.add('salla'); inp.focus(); return false; }
    S.terbiyeci = r.ad; saveGame(); adUygula(); hud(); return true; }
  /* menüden ad değiştirme */
  G.adSor = async function () { const v = await G.pen({ k: 'Terbiyeci', t: 'Adını değiştir', body: adAlani(G.ad() === 'Terbiyeci' && !S.terbiyeci ? adOner() : G.ad(), 'Ocağın kapısındaki ad'), on: adBagla, btns: [{ t: 'Vazgeç', v: false }, { t: 'Kaydet', cls: 'altin', v: true, fn: p => adOnay(p) }] });
    if (v) { toast('Adın artık <b>' + esc(G.ad()) + '</b>.'); G.redraw(); } return v; };

  /* ---------- hafta sonu ---------- */
  const strip = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '');
  async function eventPen(ev) { if (G.hasComic && G.hasComic(ev)) { const ok = await G.comic(ev); if (ok) return; }      // hikâye olayları çizgi roman sayfalarıyla anlatılır
    const c = ev.ctx || {}, npc = EV_NPC[ev.id], text = typeof ev.text === 'function' ? ev.text(c) : ev.text, face = npc ? G.npcImg(npc) : c.d ? G.img(c.d) : null;
    const bg = EV_BG(ev), who = npc ? NPC_AD[npc] || ev.title : c.d ? esc(c.d.name) : ev.title, kick = (typeof STORY !== 'undefined' && STORY[S.week] && STORY[S.week].id === ev.id ? 'Hikâye' : 'Olay') + ' · ' + ev.title, face2 = !npc && c.d2 ? G.img(c.d2) : null;
    const i = await G.vn({ bg, face, face2, dragon: !npc && !!c.d, name: who, k: kick, text,
      btns: ev.opts.map((o, i) => { const why = o.req ? o.req(c) : null; return { t: typeof o.t === 'function' ? o.t(c) : o.t, sub: why || '', off: why || null, v: i }; }) });
    const res = ev.opts[i].fx(c); afterAction(true);
    if (res !== null && res !== undefined && strip(res)) await G.vn({ bg, face, face2, dragon: !npc && !!c.d, name: who, k: kick, text: String(res) }); }
  G.olay = eventPen;
  /* oyunun kendi modülleri (yarış ve arena hikâyeleri) olay açmak için eventModal çağırır; 2.0'da hikâye sahnesine gider */
  window.eventModal = ev => { eventPen(ev).then(() => G.redraw()); };
  /* doğum sahnesi: yumurtaya dokundukça çatlar; üçüncü dokunuşta kabuk açılır, yavru görünür ve adı konur (hatchEgg oyunun kendisidir) */
  function hatchPen(egg) { return new Promise(res => { pens++; const w = el('div', 'dogum-s'); w.style.setProperty('--sahne', 'url("' + G.bgUrl('bg-yuva') + '")'); let n = 0;
    w.innerHTML = '<div class="dg-bas"><small>Kuluçka ocağı</small><h1>Kabuk çatlıyor</h1><p>' + (egg.origin || 'Yumurta') + '. İçeriden tırmalama sesleri geliyor.</p></div><button type="button" class="dg-yumurta" aria-label="Yumurtaya dokun"><i class="kabuk res" style="background-image:url(' + G.yumurtaResim(egg) + ')"></i><svg viewBox="0 0 100 130" class="catlak"><path class="c1" d="M54 13l-9 12 9 9-10 12 6 10"/><path class="c2" d="M18 58l14 4 6-10 10 12 12-8 8 12 14-4"/><path class="c3" d="M30 100l8-14 10 8 6-14 10 12 8-10"/></svg></button><div class="dg-alt"><span class="dg-ipucu">Yumurtaya dokun</span></div>';
    app.appendChild(w); const yum = w.querySelector('.dg-yumurta');
    const ac = () => { const { d, notes } = hatchEgg(egg); if (EO2.audio) EO2.audio.chime(); if (G.fx) { G.fx.flash('rgba(255,245,210,.85)'); G.fx.stars(yum, 34); G.fx.burst(yum, G.ELC[d.el], 26); }
      w.classList.add('acildi'); w.style.setProperty('--el', G.ELC[d.el]);
      w.innerHTML = '<div class="dg-bas"><small>Yeni bir ejderha</small><h1>' + EL_AD[d.el] + ' yavrusu</h1></div><div class="dg-yavru"><i class="hale"></i><img alt="" src="' + OLD + 'img/angle/' + d.el + '-yavru-front.webp" onerror="this.onerror=null;this.src=\'' + G.img(d) + '\'"></div>' +
        '<div class="dg-alt"><label class="dg-ad"><span>Adını koy</span><input id="hatchName" maxlength="16" value="' + esc(d.name) + '" autocomplete="off"></label><div class="dg-pot">' + STATS.map(k => { const s = d.genes.pot[k][0] + d.genes.pot[k][1]; return '<span>' + ST_KISA[k] + ' <b class="harf g' + Math.floor(s / 2) + '">' + potLetter(s) + '</b></span>'; }).join('') + '</div><ul class="dg-not">' + notes.map(x => '<li>' + x + '</li>').join('') + '</ul><button type="button" class="gbtn altin buyuk" id="dgTamam">Hoş geldin</button></div>';
      w.querySelector('#dgTamam').addEventListener('click', () => { const v = (w.querySelector('#hatchName').value || '').trim(); if (v) d.name = v.slice(0, 16); afterAction(true); pens--; w.classList.add('git'); setTimeout(() => w.remove(), 400); if (G.fx) G.fx.hearts('.dg-yavru', 10); res(); });
      const inp = w.querySelector('#hatchName'); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') w.querySelector('#dgTamam').click(); }); };
    yum.addEventListener('click', () => { n++; yum.className = 'dg-yumurta c' + n + ' vur'; void yum.offsetWidth; if (EO2.audio) EO2.audio.pop(); if (G.fx) G.fx.burst(yum, '#fff3c4', 6 + n * 3); setTimeout(() => yum.classList.remove('vur'), 300); const ip = w.querySelector('.dg-ipucu'); if (ip) ip.textContent = n === 1 ? 'Bir daha' : 'Son bir kez'; if (n >= 3) setTimeout(ac, window.__fastFx ? 0 : 420); });
    if (window.__fastFx) { n = 3; ac(); } }); }
  function reportBody(R, before) { const rows = R.report.map((r, i) => '<div style="animation-delay:' + (i * 0.07) + 's"><img alt="" src="' + G.img(r.d) + '"><div><b class="kim">' + esc(r.d.name) + '</b>' + r.lines.map(l => '<span>' + l + '</span>').join('') + '</div></div>').join('');
    const dg = S.gold - before.gold, du = S.un - before.un;
    return '<div class="rap">' + rows + (R.gen.length ? '<div class="genel"><div>' + R.gen.map(l => '<span>' + l + '</span>').join('') + '</div></div>' : '') + '</div><p style="text-align:center;margin-top:.9em">Kese: <b class="' + (dg < 0 ? 'kotu' : 'au') + '">' + (dg >= 0 ? '+' : '') + dg + ' altın</b>' + (du ? ' · Ün: <b class="au">' + (du > 0 ? '+' : '') + du + '</b>' : '') + '</p>'; }
  /* hafta sonu: gece çöker, her ejderhanın kartı sırayla açılır, kese sayılır; sonra sabah olur */
  const sahneUrl = bg => 'url("' + G.bgUrl(bg) + '")';
  function gece(R, before) { return new Promise(res => { pens++; const w = el('div', 'gece'); w.style.setProperty('--sahne', sahneUrl('a:gece')); const dg = S.gold - before.gold, du = S.un - before.un;
    w.innerHTML = '<div class="gece-bas"><small>Gece çöktü</small><h1>Hafta ' + (S.over ? S.week : S.week - 1) + ' sona erdi</h1></div><div class="gece-kartlar">' + R.report.map(r => '<article class="gk" style="--el:' + G.ELC[r.d.el] + '"><img alt="" src="' + (G.poz ? G.poz(r.d, r.d.stage === 'yetiskin' && !r.d.dead ? 'P15' : null) : G.img(r.d)) + '"><h3>' + esc(r.d.name) + '</h3><ul>' + (r.lines.length ? r.lines.map(l => '<li>' + l + '</li>').join('') : '<li>Sakin bir hafta geçirdi.</li>') + '</ul></article>').join('') + '</div>' +
      '<div class="gece-alt">' + (R.gen.length ? '<div class="gece-genel">' + R.gen.map(l => '<span>' + l + '</span>').join('') + '</div>' : '') + '<div class="kese"><span>Kese <b class="' + (dg < 0 ? 'kotu' : 'au') + '" id="geceAltin">0</b> altın</span>' + (du ? '<span>Ün <b class="au">' + (du > 0 ? '+' : '') + du + '</b></span>' : '') + '</div><button type="button" class="gbtn altin buyuk" id="geceDevam" disabled>' + (S.over ? 'Sonuca bak' : 'Sabaha uyan') + '</button></div>';
    app.appendChild(w); const cards = [...w.querySelectorAll('.gk')], btn = w.querySelector('#geceDevam'), fast = window.__fastFx;
    cards.forEach((c, i) => setTimeout(() => { c.classList.add('acik'); if (EO2.audio) EO2.audio.pop(); }, fast ? 0 : 900 + i * 420));
    setTimeout(() => { const e = w.querySelector('#geceAltin'); if (G.fx) G.fx.count(e, 0, dg, 900, v => (v > 0 ? '+' : '') + v); else e.textContent = (dg > 0 ? '+' : '') + dg; if (dg > 0 && G.fx) G.fx.coins(e, Math.min(12, 3 + dg / 20), e); btn.disabled = false; btn.focus(); }, fast ? 0 : 1100 + cards.length * 420);
    btn.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); pens--; w.classList.add('git'); setTimeout(() => w.remove(), 620); res(); }); }); }
  function sabah() { return new Promise(res => { if (S.over) return res(); const w = el('div', 'sabah', '<div><small>' + seasonOf().ad + '</small><b>Hafta ' + S.week + '</b></div>'); w.style.setProperty('--sahne', sahneUrl('a:sabah')); app.appendChild(w); if (EO2.audio) EO2.audio.chime(); setTimeout(() => { w.classList.add('git'); setTimeout(() => w.remove(), 720); res(); }, window.__fastFx ? 300 : 1900); }); }
  const ENDING = { taj: ['Kızıl Taç senin', 'Dedenin harabe ocağı yirmi haftada diyarın en ünlü ocağı oldu. Demirhan tribünde ayağa kalkıp seni alkışladı. O gece Kor\'un kuyruğu kuluçka ocağının taşlarına dolanmış uyudu.'], 'tac-kayip': ['Taç bu yıl başkasının', 'Kızıl Taç\'a kadar geldin ama son adım tutmadı. Yine de meydanda senin ocağının adı konuşuluyor. Bahar yeniden gelecek.'] };
  G.endWeek = async function () { if (!G.live || G.busy) return;
    const idle = S.dragons.filter(d => typeof needsOrder === 'function' ? needsOrder(d) : (!d.inj && !d.task));
    if (idle.length) { const v = await G.pen({ k: 'Hafta sonu', t: 'Emir bekleyen ejder var', body: '<p><b>' + idle.map(d => esc(d.name)).join(', ') + '</b> bu hafta için görev almadı. Görevsiz geçen hafta boşa gider.</p>', btns: [{ t: 'Ejderhalara git', v: 'go' }, { t: 'Yine de bitir', cls: 'altin', v: 'ok' }] }); if (v !== 'ok') { if (v === 'go') G.open('ejderhalar'); return; } }
    G.busy = true; G.close(); const before = { gold: S.gold, un: S.un }; window.__grew = []; const R = endWeek(); saveGame(); hud();
    await gece(R, before);
    for (const id of (window.__grew || [])) { const g = byId(id); if (g && !g.dead) await G.pen({ k: 'Büyüme', t: esc(g.name) + ' artık ' + STAGE_AD[g.stage].toLowerCase(), body: '<div class="dogum" style="--el:' + G.ELC[g.el] + '"><img alt="" src="' + G.img(g) + '"></div>', btns: [{ t: 'Aferin', cls: 'altin' }] }); }
    for (const q of R.queue) { if (q.type === 'hatch') await hatchPen(q.egg); else if (q.type === 'event') await eventPen(q.ev); }
    if (typeof storyFlush === 'function') storyFlush();
    await sabah();
    if (S.over) { G.busy = false; return G.son(); }
    G.busy = false; G.redraw(); };

  /* ---------- giriş ekranı ---------- */
  let giris = null;
  function title() { if (giris) giris.remove(); const sv = loadGame(), ok = sv && (!sv.over || sv.ending !== 'iflas');
    giris = el('div', 'giris', '<div class="giris-ic"><img src="assets/logo.webp" alt="Ejder Ocağı"><p>Dedenden kalan harabe bir ocak. Yaşlı bir ateş ejderhası. Soğumaya yüz tutmuş bir yumurta.<br>Yirmi hafta sonra Kızıl Taç başlıyor.</p><div class="dugmeler"></div><div class="not">Oyunun kendiliğinden kaydedilir. <button type="button" class="giris-bag" data-kurtar>Kurtarma kodum var</button></div><div class="kunye">Sürüm ' + EO2.surum + ' · <a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik</a> · <a href="kosullar.html" target="_blank" rel="noopener">Kullanım koşulları</a></div></div>');
    const box = giris.querySelector('.dugmeler'), add = (t, sub, cls, fn) => { const b = el('button', 'gbtn buyuk ' + cls, t + (sub ? '<small>' + sub + '</small>' : '')); b.type = 'button'; b.addEventListener('click', fn); box.appendChild(b); return b; };
    if (ok) add('Ocağa dön', sv.over ? (sv.seasonNo || 1) + '. sezon bitti' : 'Hafta ' + sv.week + ' · ' + (sv.dragons || []).length + ' ejderha · ' + sv.gold + ' altın', 'altin', () => { S = sv; if (typeof careerRepair === 'function') careerRepair(); if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms(); UI.sel = S.dragons[0] ? S.dragons[0].id : null; enter(false); });
    add('Yeni ocak kur', '', ok ? '' : 'altin', async () => { if (ok && !sv.over) { const v = await G.pen({ k: 'Yeni ocak', t: 'Kayıtlı ocağın silinsin mi?', body: '<p>Yeni bir ocak kurarsan bu yuvadaki kayıt (Hafta ' + sv.week + ') üzerine yazılır.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yeni ocak kur', cls: 'kor', v: true }] }); if (!v) return; }
      if (ok && EO2.kayit) EO2.kayit.yedekle('yeni ocak');      // üzerine yazılan kayıt bir kez geri alınabilsin
      newGame(); S.kusam = { giyili: 'bare', sahip: ['bare'] };   /* yeni terbiyeci çıplak setle başlar; zırhı çarşıdan alır */ UI.sel = S.dragons[0].id; saveGame(); if (EO2.rehber) EO2.rehber.sifirla(); enter(true); });
    { const kb = giris.querySelector('[data-kurtar]'); if (kb) kb.addEventListener('click', () => { if (EO2.hesap) EO2.hesap.geriYukle(); }); }
    app.appendChild(giris); const f = box.querySelector('.gbtn'); if (f) f.focus(); }
  async function enter(fresh) { G.live = true; giris.classList.add('gitti'); if (EO2.audio) EO2.audio.start && EO2.audio.start(); adUygula(); hud(); if (EO2.api) EO2.api.titleCard('Merkez Meydan', 'Ejder Ocağı');
    if (fresh) await G.pen({ k: 'Mektup', t: 'Torunuma,', face: G.npcImg('dede'), body: '<div class="mektup"><p>Bu mektubu okuyorsan ocak artık senin. Çatılar akıyor, kuluçka ocağı yıllardır soğuk, demirci bile yolu unuttu. Ama Kor hâlâ burada. Yaşlandı, inatlaştı, ama yüreği hâlâ kızgın bir kor.</p><p>Bir de yumurta bırakıyorum. Nereden geldiğini sorma. Onu ısıt; ne çıkacağını ben de bilmiyorum.</p><p>Kızıl Taç\'ı bir kez de bu ocak alsın isterdim. Yirmi haftan var.</p><p class="imza">Deden</p></div>' + adAlani(adOner(), 'Ocağın kapısına hangi adı yazalım?'), on: p => { adBagla(p); const f = p.querySelector('.pen-f'); f.classList.add('adli'); f.insertBefore(p.querySelector('.ad-sor'), f.firstChild); }, btns: [{ t: 'Ocağa gir', cls: 'altin buyuk', fn: p => adOnay(p) }] });
    if (S.over) return G.son();
    const oto = navigator.webdriver && !window.__gercekAkis;   /* otomatik denetimler kısa yoldan girer (meydanda, seçimsiz); gerçek akışı check_baslangic.mjs ölçer */
    if (fresh && !oto && EO2.gorunum && EO2.gorunum.ilkSecim) await EO2.gorunum.ilkSecim();   /* oyunun başında saç ve göz seçimi */
    if (!oto && EO2.ocak && EO2.ocak.git) { try { await EO2.ocak.git(); } catch (_) { } }   /* oyun ocakta açılır (kullanıcı, 2026-11-17) */
    if (EO2.rehber) EO2.rehber.basla(fresh); }

  /* ---------- dünyaya bağlama ---------- */
  function wire() { const A = EO2.api; if (!A) return setTimeout(wire, 60);
    { const q = document.querySelector('.quests'), h = q.querySelector('h3'), ANH = 'eo2.hedefKucuk'; let kucuk = false; try { kucuk = localStorage.getItem(ANH) === '1'; } catch (_) { }
      const uygula = () => { q.classList.toggle('kucuk', kucuk); h.setAttribute('aria-expanded', String(!kucuk)); h.title = kucuk ? 'Hedefleri aç' : 'Hedefleri küçült'; };
      h.setAttribute('role', 'button'); h.tabIndex = 0; uygula();
      const cevir = () => { kucuk = !kucuk; try { localStorage.setItem(ANH, kucuk ? '1' : '0'); } catch (_) { } uygula(); if (EO2.audio) EO2.audio.ui(); };
      h.addEventListener('click', cevir); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); cevir(); } }); }
    const q = document.querySelector('.quests'), b = el('button', 'gbtn altin', 'Haftayı Bitir'); b.id = 'btnWeek'; b.type = 'button'; b.addEventListener('click', () => G.endWeek()); q.appendChild(b);
    const hedefAc = e => { const li = e.target.closest('li[data-hedef]'); if (!li || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return; if (e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); } if (EO2.audio) EO2.audio.ui(); if (EO2.rehber) EO2.rehber.git(li.dataset.hedef); };
    q.addEventListener('click', hedefAc); q.addEventListener('keydown', hedefAc);
    EO2.hooks.panel = id => { if (!G.live) return true; if (id === 'ejderhalar' || id === 'bahce') { G.open('ejderhalar'); return true; } if (id === 'ocak') { if (EO2.ocak) EO2.ocak.git(); return true; } if (id === 'arena') { G.open('arena'); return true; } if (id === 'pazar' || id === 'uretim') { G.open('pazar'); return true; } if (id === 'kuzey') { G.open('sefer'); return true; } if (id === 'sosyal' || id === 'han') { G.open('han'); return true; } if (id === 'gorevler') { G.open('defter'); return true; } if (id === 'envanter') { G.open('canta'); return true; } if (id === 'menu') { G.open('menu'); return true; } return false; };
    EO2.hooks.act = act => { if (!G.live) return true; if (act.startsWith('pet:')) { G.open('ejderhalar'); return true; } return false; };
    const P = A.PANELS, rows = a => '<ul class="rows">' + a.map(r => '<li><div><b>' + r[0] + '</b>' + (r[1] ? '<span>' + r[1] + '</span>' : '') + '</div></li>').join('') + '</ul>';
    title(); }
  G.title = () => { G.live = false; title(); };
  wire();
})();
