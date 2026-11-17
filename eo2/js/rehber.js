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
    if (yer === 'hafta') return haftaGoster();
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
  serit.innerHTML = '<i class="rh-im" aria-hidden="true"></i><p></p><button type="button" class="rh-git"></button><button type="button" class="rh-kapat" aria-label="İpucunu kapat">×</button>';
  app.appendChild(serit);
  const sP = serit.querySelector('p'), sGit = serit.querySelector('.rh-git'); let simdi = null, sure = 0;
  function goster(o) { if (simdi && simdi.id === o.id && simdi.metin === o.metin) return; simdi = o; clearTimeout(sure); sP.innerHTML = o.metin; sGit.hidden = !o.git; sGit.textContent = o.dugme || 'Git'; serit.dataset.tur = o.tur; serit.hidden = false; serit.classList.remove('gel'); void serit.offsetWidth; serit.classList.add('gel');
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
  serit.querySelector('.rh-kapat').addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); if (simdi) isaretle(simdi.id); gizle(); tazele(); });
  sGit.addEventListener('click', () => { if (!simdi || !simdi.git) return; if (EO2.audio) EO2.audio.ui(); const g = simdi.git; if (simdi.tur === 'adim' && g === 'hafta') isaretle(simdi.id); ac(g); });

  /* ---------- ilk hafta adımları: durumdan okunur, sıradaki ilk uygun adım gösterilir ---------- */
  const bos = () => S.dragons.some(d => !d.dead && !d.inj && !d.task);
  const ADIM = [
    { id: 'a-emir', k: () => S.week === 1 && !S.st.train && bos(), m: () => 'İlk iş: <b>' + kor() + '</b> için bu haftanın emrini ver.', dugme: 'Ejderhalar', git: 'ejderhalar' },
    { id: 'a-kulucka', k: () => S.week <= 3 && !S.goals.includes('kulucka') && (S.eggs || []).some(e => !e.inK) && typeof BUILD !== 'undefined' && BUILD.kulucka && S.gold >= BUILD.kulucka.fiyat, m: () => 'Yumurta soğukta bekliyor. Ocağına bir <b>Kuluçka Ocağı</b> kur.', dugme: 'Ocak', git: 'ocak' },
    { id: 'a-hafta', k: () => S.week === 1 && !bos(), m: () => 'Emirler hazır. <b>Haftayı Bitir</b> ile geceyi getir.', dugme: 'Göster', git: 'hafta' },
    { id: 'a-arena', k: () => S.week >= 2 && S.week <= 4 && !S.st.fights, m: () => 'Yeni hafta başladı. Köy Arenası\'nda ilk dövüşünü dene.', dugme: 'Arena', git: 'arena' },
    { id: 'a-bakim', k: () => S.week >= 2 && S.week <= 4 && (!S.st.talk || !S.st.feed), m: () => 'Ejderhanı besle ve onunla konuş; bağınız güçlenir.', dugme: 'Ejderhalar', git: 'ejderhalar' },
  ];
  /* ---------- ekran ipuçları: ilk açılışta bir kez ---------- */
  const IPUCU = {
    ejderhalar: 'Her ejderhaya bir emir ver. Emirler hafta sonunda işlenir.',
    /* ipucu sekme değişince ekranda kalır: her sekmede doğru olan söz (Er Meydanı ödülsüzdür) */
    arena: 'Bir rakip seç ve Meydan oku. Arenalar ün ve altın getirir; Er Meydanı dostça oynanır.',
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
    let a = null; try { a = ADIM.find(x => !gor[x.id] && x.k()); } catch (_) { a = null; }
    if (!a) return gizle(); goster({ id: a.id, tur: 'adim', metin: a.m(), dugme: a.dugme, git: a.git }); }
  function ekran(id) { if (!G.live) return;
    if (id && IPUCU[id] && !gor['e-' + id]) { isaretle('e-' + id); goster({ id: 'e-' + id, tur: 'ekran', metin: typeof IPUCU[id] === 'function' ? IPUCU[id]() : IPUCU[id], sn: 14 }); return; }
    if (simdi && simdi.tur === 'ekran') gizle(); if (!id) tazele(); else if (simdi) gizle(); }
  let sonSahne = null;
  setInterval(() => { const A = EO2.api; if (!A || !A.scene || !G.live) return; const sc = A.scene(); if (sc === sonSahne) return; sonSahne = sc;
    if (simdi && simdi.tur === 'sahne') gizle();
    if (sc === 'ocak' && EO2.ziyaret && EO2.ziyaret.evSahibi()) { goster({ id: 's-misafir', tur: 'sahne', metin: 'Misafirsin: gez, bak. Ev sahibinin yanına gel ve E ile ejderhanı eşleşmeye sun.', sn: 16 }); return; }
    if (SAHNE_IPUCU[sc] && !gor['s-' + sc] && !(G.ekran && G.ekran())) { isaretle('s-' + sc); goster({ id: 's-' + sc, tur: 'sahne', metin: SAHNE_IPUCU[sc], sn: 16 }); } else tazele(); }, 600);

  /* ---------- kilitli düğme: nedenini söyle ----------
     Kapalı düğme tıklama olayı üretmez; dokunulan noktadaki öğeye bakılır. Neden, düğmenin title'ında ya da data-neden'inde durur. */
  let sonNeden = 0;
  document.addEventListener('pointerdown', e => { if (!G.live) return; let n = null;
    try { n = (document.elementsFromPoint(e.clientX, e.clientY) || []).find(x => x.matches && x.matches('button[disabled], [aria-disabled="true"], .kilitli')); } catch (_) { }
    if (!n || !app.contains(n)) return; const neden = (n.dataset && n.dataset.neden) || n.getAttribute('title') || ''; if (!neden || neden.length < 4) return;
    const t = Date.now(); if (t - sonNeden < 1200) return; sonNeden = t; de(esc(neden)); }, true);

  EO2.rehber = { git, ac, tazele, ekran, basla() { sonSahne = null; tazele(); }, sifirla() { gor = {}; yaz(); gizle(); }, gorulen: () => Object.assign({}, gor), simdi: () => simdi ? Object.assign({}, simdi) : null };
})();
