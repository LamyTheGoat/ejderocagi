/* Ejder Ocağı 2.0 · Rehber: ilk hafta yönlendirmesi ve bağlamsal ipuçları
   - HUD'daki hedefe dokununca oyuncuyu ilgili yere götürür (EO2.rehber.git).
   - İlk haftalarda sıradaki adımı tek satırla gösterir; oyunu durdurmaz, kapatılabilir, kapatılan bir daha gelmez.
   - Bir ekran ilk kez açıldığında tek cümlelik ipucu gösterir (bir kez).
   - Kilitli bir düğmeye dokununca nedenini bildirim olarak söyler (dokunmatikte title görünmez).
   Yeni kural, ödül ya da mekanik yoktur: yalnız var olan durum okunur ve var olan ekranlar açılır.
   Görülenler localStorage 'eo2-rehber' içinde durur; yeni ocak kurulunca sıfırlanır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, app = document.getElementById('app'); if (!G || !app) return;
  const ANAHTAR = 'eo2-rehber';
  let gor = {}; try { const h = JSON.parse(localStorage.getItem(ANAHTAR) || '{}'); if (h && typeof h === 'object') gor = h; } catch (_) { }
  const yaz = () => { try { localStorage.setItem(ANAHTAR, JSON.stringify(gor)); } catch (_) { } };
  const isaretle = id => { if (!gor[id]) { gor[id] = 1; yaz(); } };
  const de = (html, tur) => { if (typeof window.toast === 'function') window.toast(html, tur); };
  const kor = () => { const d = (S.dragons || []).find(x => !x.dead); return d ? esc(d.name) : 'Ejderhan'; };

  /* ---------- yer açma ---------- */
  function ac(yer) {
    if (yer === 'hafta') return haftaGoster(); if (yer === 'harita') { if (EO2.harita) EO2.harita.ac(); return; }
    if (G.ekran && G.ekran() === yer) return;
    /* Ocak, Ejderhalar ve Arena dünyadaki kapılarla aynı yoldan açılır (Ocak 2.5D araziye götürür) */
    if ((yer === 'ocak' || yer === 'ejderhalar' || yer === 'arena') && EO2.hooks && EO2.hooks.panel) { if (G.ekran && G.ekran()) G.close(); EO2.hooks.panel(yer); return; }
    G.open(yer); }
  function haftaGoster() { if (G.ekran && G.ekran()) G.close();
    const b = ['#btnWeek', '#btnWeekMobil'].map(s => document.querySelector(s)).find(x => x && x.offsetParent !== null);
    if (!b) { G.open('ejderhalar'); const s = document.getElementById('scrWeek'); if (s) parla(s); return; } parla(b); }
  function parla(b) { b.classList.remove('rh-parla'); void b.offsetWidth; b.classList.add('rh-parla'); setTimeout(() => b.classList.remove('rh-parla'), 5200); }

  /* ---------- hedef → yer ve tek cümle ---------- */
  const HEDEF = {
    kulucka: ['ocak', 'Boş bir kareye yürü, E ile Kuluçka Ocağı kur.'],
    train: ['ejderhalar', 'Bir antrenman seç, sonra Haftayı Bitir.'],
    win1: ['arena', 'Köy Arenası\'nda bir rakip seç ve Meydan oku.'],
    talk: ['ejderhalar', 'Bakım bölümünde besle, sonra sohbet et.'],
    acq: ['pazar', 'Ejderha tüccarına bak ya da sefere çık.'],
    fav: ['ejderhalar', 'Farklı yemler dene; sevdiğini bulunca belli eder.'],
    mark: ['ejderhalar', 'Sohbetler ve dövüşler karakterde iz bırakır.'],
    yuva: ['ocak', 'Boş bir kareye Yuva Bahçesi kur.'],
    aff: ['yuva', 'İki ejderhayı birlikte gezintiye çıkar.'],
    bred: ['yuva', 'Yakınlığı yüksek bir çifti çiftleştir.'],
    un25: ['arena', 'Kazandığın her dövüş ün getirir.'],
    gen2: ['yuva', 'Kendi yumurtanı kuluçkada çatlat.'],
    un45: ['arena', 'Dövüşler ve turnuvalar ün getirir.'],
  };
  function git(id) { if (!G.live || (G.sakin && !G.sakin())) return; const h = HEDEF[id]; if (!h) { G.open('defter'); return; } ac(h[0]); de(h[1]); }

  /* ---------- şerit: tek satır, kapatılabilir ---------- */
  const serit = document.createElement('div'); serit.className = 'rehber'; serit.hidden = true; serit.setAttribute('role', 'status'); serit.setAttribute('aria-live', 'polite');
  serit.innerHTML = '<i class="rh-im" aria-hidden="true"></i><p></p><button type="button" class="rh-git"></button><button type="button" class="rh-gec" hidden>Öğreticiyi geç</button><button type="button" class="rh-kapat" aria-label="İpucunu kapat">×</button>';
  app.appendChild(serit);
  const sP = serit.querySelector('p'), sGit = serit.querySelector('.rh-git'); let simdi = null, sure = 0;
  function goster(o) { if (simdi && simdi.id === o.id && simdi.metin === o.metin) return; simdi = o; clearTimeout(sure); sP.innerHTML = o.metin; sGit.hidden = !o.git; sGit.textContent = o.dugme || 'Git'; serit.dataset.tur = o.tur; serit.classList.toggle('kilit', !!o.kilit); serit.querySelector('.rh-gec').hidden = !o.kilit; serit.querySelector('.rh-kapat').hidden = !!o.kilit; serit.hidden = false; serit.classList.remove('gel'); void serit.offsetWidth; serit.classList.add('gel');
    if (o.sn) sure = setTimeout(() => { if (simdi === o) gizle(); }, o.sn * 1000);
    serit.classList.remove(...YERLER.filter(Boolean)); if (o.tur === 'ekran') for (const ms of [380, 1200]) setTimeout(() => { if (simdi === o) yerles(); }, ms); }
  /* ekran ipucu ekranın düğmelerini örtmez: altta bir düğmeye biniyorsa üste (başlığın altına) çıkar */
  function binen() { const q = serit.getBoundingClientRect(); if (q.width < 4) return false; for (const el of document.querySelectorAll('#app button, #app input, #app [role="button"], #app [role="tab"], #app .ag-rozet')) {   /* .ag-rozet: arenadaki durum etiketi (ipucu onun üstüne binmesin) */ if (serit.contains(el) || el.closest('#hud, .quests, #chat, #emotes, #actions, #world, #anchors')) continue;
      const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
      if (Math.min(q.right, r.right) - Math.max(q.left, r.left) > 4 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 4) return true; } return false; }
  /* sırayla denenen yerler: altta, başlığın altında, sekmelerin altında, ekranın ortasının üstünde, ortasının altında. İlk boş olan seçilir. */
  const YERLER = ['', 'yer-ust', 'yer-ust2', 'yer-orta', 'yer-orta2'], DIK = ['', 'yer-orta2', 'yer-orta', 'yer-ust2', 'yer-ust'];   // dik ekranda üst taraf doludur: önce ekranın ortası denenir
  function yerles() { if (serit.hidden || !binen()) return; const adlar = YERLER.filter(Boolean);
    for (const y of (innerWidth < innerHeight ? DIK : YERLER)) { serit.classList.remove(...adlar); if (y) serit.classList.add(y); if (!binen()) return; }
    serit.classList.remove(...adlar); serit.classList.add('yer-ust2'); }
  function gizle() { clearTimeout(sure); simdi = null; serit.hidden = true; }
  serit.querySelector('.rh-kapat').addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); if (simdi && simdi.kilit) return; if (simdi) isaretle(simdi.id); gizle(); tazele(); });
  serit.querySelector('.rh-gec').addEventListener('click', async () => { if (EO2.audio) EO2.audio.ui(); const v = await G.pen({ k: 'Öğretici', t: 'Öğreticiyi geçelim mi?', body: '<p>Her yer hemen açılır. İpuçları yine sırası gelince görünür.</p>', btns: [{ t: 'Öğreticiye dön', v: false }, { t: 'Geç', cls: 'altin', v: true }] }); if (v) kilitGec(); });
  sGit.addEventListener('click', () => { if (!simdi || !simdi.git) return; if (EO2.audio) EO2.audio.ui(); const g = simdi.git; if (simdi.tur === 'adim' && g === 'hafta') isaretle(simdi.id); ac(g); });

  /* ---------- ilk hafta adımları: durumdan okunur, sıradaki ilk uygun adım gösterilir ---------- */
  const bos = () => S.dragons.some(d => !d.dead && !d.inj && !d.task);
  /* ÖĞRETİCİ ZİNCİRİ (kullanıcı, 2026-11-17): oyunun mekaniklerini sırayla anlatan yedi kısa adım. Her adım tek satırdır, oyunu durdurmaz,
     kapatılabilir; koşulu sağlanınca kendiliğinden sıradakine geçer. Sıra: kuluçka → emir → hafta → harita → kuşam → arena → bakım. */
  const kusamTek = () => { try { return EO2.gorunum && EO2.gorunum.kusam && EO2.gorunum.kusam().sahip.length <= 1; } catch (_) { return false; } };
  const ADIM0 = [
    { id: 'a-kulucka', k: () => S.week <= 3 && !S.goals.includes('kulucka') && (S.eggs || []).some(e => !e.inK) && typeof BUILD !== 'undefined' && BUILD.kulucka && S.gold >= BUILD.kulucka.fiyat, m: () => 'Boş bir kareye yürü, <b>E</b> ile <b>Kuluçka Ocağı</b> kur.', dugme: 'Ocak', git: 'ocak' },
    { id: 'a-emir', k: () => S.week === 1 && !S.st.train && bos(), m: () => '<b>' + kor() + '</b> için bu haftanın emrini ver.', dugme: 'Ejderhalar', git: 'ejderhalar' },
    { id: 'a-hafta', k: () => S.week === 1 && !bos(), m: () => 'Emirler hazır. <b>Haftayı Bitir</b> ile geceyi getir.', dugme: 'Göster', git: 'hafta' },
    { id: 'a-harita', k: () => S.week >= 2 && S.week <= 5 && !!EO2.harita, m: () => '<b>Mini haritaya</b> dokun: kasabada hızlı seyahat et.', dugme: 'Harita', git: 'harita' },
    { id: 'a-kusam', k: () => S.week >= 2 && S.week <= 6 && kusamTek() && S.gold >= 120, m: () => 'Hâlâ çıplaksın. <b>Portrene</b> dokun, ilk zırhını al.', dugme: 'Kuşam', git: 'gorunus' },
    { id: 'a-arena', k: () => S.week >= 2 && S.week <= 5 && !S.st.fights, m: () => '<b>Ejder Arenası</b>\'nda ilk dövüşüne çık.', dugme: 'Arena', git: 'arena' },
    { id: 'a-bakim', k: () => S.week >= 2 && S.week <= 5 && (!S.st.talk || !S.st.feed), m: () => 'Ejderhanı besle ve onunla konuş; bağınız güçlenir.', dugme: 'Ejderhalar', git: 'ejderhalar' },
  ];
  const ADIM = ADIM0.map((a, n) => Object.assign({}, a, { m: () => '<small class="rh-sira" title="Öğretici">' + (n + 1) + ' / ' + ADIM0.length + '</small> ' + a.m() }));
  /* ---------- İLK HAFTA KİLİDİ (kullanıcı kararı, 2026-11-18) ----------
     İlk haftada oyuncu yalnız öğreticinin ilk üç adımını yapabilir: Kuluçka Ocağı'nı kur, ejderhana emir ver, haftayı bitir.
     Bu sırada başka ekran açılmaz, ocaktan çıkılmaz, hafta erken bitirilmez; basılan yerde ne yapılacağı söylenir. İkinci haftada her şey açılır.
     "Öğreticiyi geç" her zaman şeritte durur. Sonraki dört adım (harita, kuşam, arena, bakım) eskisi gibi öneridir, kilitlemez.
     Otomatik denetimlerde (navigator.webdriver) kilit kapalıdır; gerçek akışı ölçen denetim window.__gercekAkis ile açar. */
  const otoKip = () => !!navigator.webdriver && !window.__gercekAkis, KILIT_ADIM = ADIM0.slice(0, 3), ORTAK_EKRAN = ['menu', 'ayarlar', 'gorunus'];
  const KILIT_IZIN = { 'a-kulucka': ['ocak', 'gorevler'], 'a-emir': ['ocak', 'gorevler', 'ejderhalar'], 'a-hafta': ['ocak', 'gorevler', 'ejderhalar'] };
  function kilitAdim() { if (!G.live || typeof S === 'undefined' || !S || S.over || S.week !== 1 || gor['kilit-gec'] || otoKip()) return null;
    if (EO2.ziyaret && EO2.ziyaret.evSahibi && EO2.ziyaret.evSahibi()) return null; try { return KILIT_ADIM.find(a => a.k()) || null; } catch (_) { return null; } }
  let sonKilitUyari = 0;
  function kilitUyar(a) { const t = Date.now(); if (t - sonKilitUyari < 1400) return; sonKilitUyari = t; de('Önce bunu bitirelim: ' + a.m(), 'goal'); serit.classList.remove('rh-salla'); void serit.offsetWidth; serit.classList.add('rh-salla'); tazele(); }
  /* bir ekran, panel ya da yer kilit yüzünden kapalı mı? Kapalıysa oyuncuya söyler ve true döner. */
  function kilitEngel(ad) { const a = kilitAdim(); if (!a) return false; if (ORTAK_EKRAN.includes(ad) || KILIT_IZIN[a.id].includes(ad)) return false; kilitUyar(a); return true; }
  function kilitGec() { isaretle('kilit-gec'); gizle(); tazele(); de('Öğretici geçildi. Her yer açık.'); }
  { const ac0 = G.open; G.open = function (id) { if (kilitEngel(id)) return; return ac0.apply(this, arguments); };
    const hafta0 = G.endWeek; if (hafta0) G.endWeek = function () { const a = kilitAdim(); if (a && a.id !== 'a-hafta') { kilitUyar(a); return; } return hafta0.apply(this, arguments); };
    EO2.kilitYer = id => { const a = kilitAdim(); if (!a || id === 'ocak') return false; kilitUyar(a); return true; }; }   /* game.js goScene buraya sorar */

  /* ---------- ekran ipuçları: ilk açılışta bir kez ---------- */
  const IPUCU = {
    ejderhalar: 'Her ejderhaya bir emir ver. Emirler hafta sonunda işlenir.',
    /* ipucu sekme değişince ekranda kalır: her sekmede doğru olan söz (Er Meydanı ödülsüzdür) */
    ors: 'Bedeli öde, ibre altın kora gelince çekici indir. Üç darbe; kademe yükseldikçe risk büyür.',
    arena: 'Burada ejderhan dövüşür. Bir rakip seç, Meydan oku. Kazanırsan altın ve ün gelir; Dost Dövüşü ödülsüzdür.',
    yuva: 'İki yetişkini gezintiye çıkar; yakınlaştıkça çiftleşebilirler.',
    pazar: 'Bir tezgâh seç. Yem, yumurta ve kuşam burada satılır.',
    sefer: 'Bir bölge seç ve boştaki ejderhanla yola çık.',
    han: 'Haftada bir akşamı biriyle geçir. Yakınlık yeni kapılar açar.',
    defter: 'Hedefler solda durur. Sağda ocağının güncesi birikir.',
    canta: 'Yem, kuşam ve yumurtaların burada bekler.',
  };
  const SAHNE_IPUCU = { ocak: 'Bir kareye yürü. E ile araziyi aç ya da yapı kur.' };

  function tazele() { if (!G.live || typeof S === 'undefined' || !S || S.over) return gizle();
    if (simdi && simdi.tur !== 'adim') return;      // ekran ya da sahne ipucu görünürken adım araya girmez
    const e = G.ekran && G.ekran(); if (e) { if (simdi) gizle(); return; }
    const k = kilitAdim(); let a = null; try { a = k ? ADIM[ADIM0.indexOf(k)] : ADIM.find(x => !gor[x.id] && x.k()); } catch (_) { a = null; }
    if (!a) return gizle(); goster({ id: a.id, tur: 'adim', metin: a.m(), dugme: a.dugme, git: a.git, kilit: !!k }); }
  function ekran(id) { if (!G.live) return;
    if (id && IPUCU[id] && !gor['e-' + id]) { isaretle('e-' + id); goster({ id: 'e-' + id, tur: 'ekran', metin: typeof IPUCU[id] === 'function' ? IPUCU[id]() : IPUCU[id], sn: 14 }); return; }
    if (simdi && simdi.tur === 'ekran') gizle(); if (!id) tazele(); else if (simdi) gizle(); }
  let sonSahne = null;
  setInterval(() => { const A = EO2.api; if (!A || !A.scene || !G.live) return; const sc = A.scene(); if (sc === sonSahne) return; sonSahne = sc;
    if ((sc === 'meydan' || sc === 'master' || sc === 'pazar' || sc === 'carsi' || sc === 'arena') && typeof S !== 'undefined' && S && S.week >= 2 && !gor['a-harita']) isaretle('a-harita');
    if (simdi && simdi.tur === 'sahne') gizle();
    if (sc === 'ocak' && EO2.ziyaret && EO2.ziyaret.evSahibi()) { goster({ id: 's-misafir', tur: 'sahne', metin: 'Misafirsin: gez, bak. Ev sahibinin yanına gel ve E ile ejderhanı eşleşmeye sun.', sn: 16 }); return; }
    if (SAHNE_IPUCU[sc] && !gor['s-' + sc] && !(G.ekran && G.ekran()) && !ADIM0.some(a => { try { return a.k(); } catch (_) { return false; } })) { isaretle('s-' + sc); goster({ id: 's-' + sc, tur: 'sahne', metin: SAHNE_IPUCU[sc], sn: 16 }); } else tazele(); }, 600);

  /* ---------- kilitli düğme: nedenini söyle ----------
     Kapalı düğme tıklama olayı üretmez; dokunulan noktadaki öğeye bakılır. Neden, düğmenin title'ında ya da data-neden'inde durur. */
  let sonNeden = 0;
  document.addEventListener('pointerdown', e => { if (!G.live) return; let n = null;
    try { n = (document.elementsFromPoint(e.clientX, e.clientY) || []).find(x => x.matches && x.matches('button[disabled], [aria-disabled="true"], .kilitli')); } catch (_) { }
    if (!n || !app.contains(n)) return; const neden = (n.dataset && n.dataset.neden) || n.getAttribute('title') || ''; if (!neden || neden.length < 4) return;
    const t = Date.now(); if (t - sonNeden < 1200) return; sonNeden = t; de(esc(neden)); }, true);

  EO2.rehber = { git, ac, tazele, ekran, kilit: () => { const a = kilitAdim(); return a ? a.id : null; }, kilitEngel, kilitGec, basla() { sonSahne = null; tazele(); }, sifirla() { gor = {}; yaz(); gizle(); }, gorulen: () => Object.assign({}, gor), simdi: () => simdi ? Object.assign({}, simdi) : null };
})();
