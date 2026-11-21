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
    if (yer === 'ocak-yol') { if (EO2.ocak && EO2.ocak.yolaCik) { if (G.ekran && G.ekran()) G.close(); EO2.ocak.yolaCik(); return; } yer = 'ocak'; }      // ilk adım: boş kareye kadar götürür
    if (yer === 'meydan') { if (G.ekran && G.ekran()) G.close(); if (EO2.api && EO2.api.scene() !== 'master') EO2.api.go('master'); return; }
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
  /* dokunmatik cihazda E tuşu yok: yönergeler orada beliren düğmeye dokunmayı söyler */
  const dokun = () => matchMedia('(pointer: coarse)').matches;
  const HEDEF = {
    kulucka: ['ocak-yol', () => dokun() ? 'Işıklı boş kareye yürü, Yapı kur düğmesine dokun, Kuluçka Ocağı kur.' : 'Işıklı boş kareye yürü, E ile Kuluçka Ocağı kur.'],
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
  function git(id) { if (!G.live || (G.sakin && !G.sakin())) return; const h = HEDEF[id]; if (!h) { G.open('defter'); return; } ac(h[0]); de(typeof h[1] === 'function' ? h[1]() : h[1]); }

  /* ---------- şerit: tek satır, kapatılabilir ---------- */
  const serit = document.createElement('div'); serit.className = 'rehber'; serit.hidden = true; serit.setAttribute('role', 'status'); serit.setAttribute('aria-live', 'polite');
  serit.innerHTML = '<i class="rh-im" aria-hidden="true"></i><p></p><button type="button" class="rh-git"></button><button type="button" class="rh-gec" hidden>Öğreticiyi geç</button><button type="button" class="rh-kapat" aria-label="İpucunu kapat">×</button>';
  app.appendChild(serit);
  const sP = serit.querySelector('p'), sGit = serit.querySelector('.rh-git'); let simdi = null, sure = 0;
  function goster(o) { if (simdi && simdi.id === o.id && simdi.metin === o.metin) return; simdi = o; clearTimeout(sure); sP.innerHTML = o.metin; sGit.hidden = !o.git; sGit.textContent = o.dugme || 'Git'; serit.dataset.tur = o.tur; serit.classList.toggle('kilit', !!o.kilit); serit.querySelector('.rh-gec').hidden = !o.kilit; serit.querySelector('.rh-kapat').hidden = !!o.kilit; serit.hidden = false; serit.classList.remove('gel'); void serit.offsetWidth; serit.classList.add('gel');
    if (o.sn) sure = setTimeout(() => { if (simdi === o) gizle(); }, o.sn * 1000);
    serit.classList.remove(...YERLER.filter(Boolean)); if (o.tur === 'ekran') for (const ms of [380, 1200]) setTimeout(() => { if (simdi === o) yerles(); }, ms); }
  /* ekran ipucu ekranın düğmelerini örtmez: altta bir düğmeye biniyorsa üste (başlığın altına) çıkar */
  function binen() { const q = serit.getBoundingClientRect(); let n = 0; if (q.width < 4) return 0; for (const el of document.querySelectorAll('#app button, #app input, #app [role="button"], #app [role="tab"], #app .ag-rozet, #app > .bildirimler > .bildirim' + (G.ORTULMEZ ? ', ' + G.ORTULMEZ : ''))) {   /* bildirimler ve G.ORTULMEZ (kalp, adlar, durum halkaları) da örtülmez */   /* .ag-rozet: arenadaki durum etiketi (ipucu onun üstüne binmesin) */ if (serit.contains(el) || el.closest('#hud, .quests, #chat, #emotes, #actions, #world, #anchors')) continue;
      const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || (cs.pointerEvents === 'none' && !el.matches('.bildirim, ' + (G.ORTULMEZ || '.yok')))) continue;
      if (Math.min(q.right, r.right) - Math.max(q.left, r.left) > 4 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 4) n++; } return n; }   // kaç öğeye biniyor (0: boş yer)
  /* sırayla denenen yerler: altta, başlığın altında, sekmelerin altında, ekranın ortasının üstünde, ortasının altında. İlk boş olan seçilir. */
  const YERLER = ['', 'yer-ust', 'yer-ust2', 'yer-orta', 'yer-orta2', 'yer-sagalt', 'yer-solalt'], DIK = ['', 'yer-orta2', 'yer-orta', 'yer-ust2', 'yer-ust'];   // yatayda son çare alt köşeler (dar şerit, kalbe ve adlara binmez)   // dik ekranda üst taraf doludur: önce ekranın ortası denenir
  function yerles() { if (serit.hidden || !binen()) return; const adlar = YERLER.filter(Boolean);
    let enIyi = 'yer-ust2', enAz = Infinity;   /* hiçbir yer boş değilse en az öğeye binen yer seçilir */
    for (const y of (innerWidth < innerHeight ? DIK : YERLER)) { serit.classList.remove(...adlar); if (y) serit.classList.add(y); const n = binen(); if (!n) return; if (n < enAz) { enAz = n; enIyi = y; } }
    serit.classList.remove(...adlar); if (enIyi) serit.classList.add(enIyi); }
  function gizle() { clearTimeout(sure); simdi = null; serit.hidden = true; }
  serit.querySelector('.rh-kapat').addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); if (simdi && simdi.kilit) return; if (simdi) isaretle(simdi.id); gizle(); tazele(); });
  serit.querySelector('.rh-gec').addEventListener('click', async () => { if (EO2.audio) EO2.audio.ui(); const v = await G.pen({ k: 'Öğretici', t: 'Öğreticiyi geçelim mi?', body: '<p>Her yer hemen açılır. İpuçları yine sırası gelince görünür.</p>', btns: [{ t: 'Öğreticiye dön', v: false }, { t: 'Geç', cls: 'altin', v: true }] }); if (v) kilitGec(); });
  sGit.addEventListener('click', () => { if (!simdi || !simdi.git) return; if (EO2.audio) EO2.audio.ui(); const g = simdi.git; if (simdi.tur === 'adim' && g === 'hafta') isaretle(simdi.id); ac(g); });

  /* ---------- ÖĞRETİCİ BÖLÜMLERİ (kullanıcı, 2026-11-21) ----------
     Oyuncu geri bildirimi: "vibe çok güzel ama ne yapacağımızla ilgili daha fazla yönerge olmasını isterdim". Öğretici bütün sistemleri
     yedi bölümde, sırayla öğretir. KARAR (Mehmet): HER BÖLÜM KİLİTLİ: bir bölüm bitmeden sonraki bölümlerin yerleri (ekranları) açılmaz.
     Birinci bölümde (ilk hafta) eskisi gibi her şey kapalıdır; sonraki bölümlerde dünya gezilir, yalnız sırası gelmemiş sistemler kapalı.
     KARAR (Mehmet): adım bir kaynak istiyorsa (altın, kor taşı) öğretici onu verir: yalnız eksik kadarını, adım başına en çok üç kez.
     Altın tek kesede bağlı yazılır (takas edilemez, TEK_KESE). KARAR: çiftleşme için öğretici bir kez ücretsiz damızlık verir ve yakınlığı
     yüksek tutar. KARAR: dostluk adımı, oyuncu görünüşlü bir NPC terbiyeciyle (Ayaz) yapılır.
     Her adım durumdan okunur: bitti() doğruysa geçilir; uygun() yanlışsa adım atlanır. "Öğreticiyi geç" her zaman şeritte durur.
     Kilit yalnız yeni ocaklarda işler (gor.v2, sifirla ile konur); eski oyuncuların açık yerleri kapanmaz, onlara bölümler öneri olarak görünür. */
  const bos = () => S.dragons.some(d => !d.dead && !d.inj && !d.task);
  const kusamTek = () => { try { return EO2.gorunum && EO2.gorunum.kusam && EO2.gorunum.kusam().sahip.length <= 1; } catch (_) { return false; } };
  const yetiskinCift = () => { const L = (S.dragons || []).filter(d => !d.dead && d.stage === 'yetiskin'); for (const A of L) for (const B of L) if (A.id < B.id && A.sex !== B.sex) return [A, B]; return null; };
  const gorev = t => (S.dragons || []).some(d => !d.dead && d.task && d.task.t === t);
  const yavruVar = () => (S.dragons || []).some(d => !d.dead && d.stage === 'yavru');
  const omuz = () => typeof getEternalBabyDragon === 'function' && !!getEternalBabyDragon();
  const fiyat = k => (typeof BUILD !== 'undefined' && BUILD[k] ? BUILD[k].fiyat : 0);
  const sepette = () => (S.eggs || []).some(e => !e.inK);
  const kFree = () => typeof kuluckaFree === 'function' ? kuluckaFree() : 0;
  const BOLUM = [null,
    { ad: 'Ocak', t: 'Ocağını kur, ejderhana emir ver, haftayı bitir.' },
    { ad: 'Topçu', t: 'Ejder Topçusu sıra tabanlı bir top düellosudur. Talimde rüzgârı, açıyı ve gücü öğren; ödülsüzdür, kaybın olmaz.', acar: ['Topçu'] },
    { ad: 'Kasaba ve bakım', t: 'Kasabayı gez, ejderhanla bağ kur, ilk zırhını giy ve Köy Arenası\'nda ilk dövüşüne çık.', acar: ['Harita', 'Köy Arenası'] },
    { ad: 'Üreme', t: 'Her ejderha anne ile babasından gen alır; yavru ikisinin karışımıdır. Usta sana bir damızlık armağan ediyor.', acar: ['Pazar', 'Yuva'] },
    { ad: 'Zindan', t: 'Zindanlara omuz ejderiyle girilir: Sonsuz Gençlik İksiri içmiş bir yavru topunun üstünde seninle savaşır.', acar: ['Zindanlar', 'Sefer', 'Kule'] },
    { ad: 'Ticaret', t: 'Her şey takas edilir. Bedesten\'de oyuncular mal satar; Kor Örsü\'nde kuşam parçalarını dövüp güçlendirirsin.', acar: ['Bedesten', 'Kor Örsü', 'Takas'] },
    { ad: 'Birlikte', t: 'Ejder Ocağı birlikte oynanır: dost edin, Han\'da akşamı geçir, Kıraathane\'de masaya otur.', acar: ['Han', 'Kıraathane', 'Dostlar', 'Takım Meydanı'] }];
  /* hangi ekran hangi bölümde açılır (adı geçmeyen ekran hep açıktır: menü, ayarlar, kuşam, çanta, defter...) */
  const YER_BOLUM = { topcu: 2, ermeydani: 2, harita: 3, arena: 3, pazar: 4, yuva: 4, damizlik: 4, zindan: 5, boss: 5, kervan: 5, sefer: 5, kule: 5,
    bedesten: 6, sandik: 6, muzayede: 6, ors: 6, takas: 6, siparis: 6, han: 7, kiraathane: 7, masa: 7, dostlar: 7, takim: 7, yaris: 7 };
  const ADIM0 = [
    { id: 'a-kulucka', b: 1, bitti: () => hasB('kulucka') || S.st.hatch > 0, ver: () => ({ altin: fiyat('kulucka') }), m: () => dokun() ? 'Işıklı boş kareye yürü, <b>Yapı kur</b> düğmesine dokun, <b>Kuluçka Ocağı</b> kur.' : 'Işıklı boş kareye yürü, <b>E</b> ile <b>Kuluçka Ocağı</b> kur.', dugme: 'Yolu göster', git: 'ocak-yol' },
    { id: 'a-emir', b: 1, bitti: () => S.week >= 2 || S.st.train > 0 || !bos(), m: () => '<b>' + kor() + '</b> için bu haftanın emrini ver.', dugme: 'Ejderhalar', git: 'ejderhalar' },
    { id: 'a-hafta', b: 1, bitti: () => S.week >= 2, m: () => 'Emirler hazır. <b>Haftayı Bitir</b> ile geceyi getir.', dugme: 'Göster', git: 'hafta' },
    { id: 't-talim', b: 2, bitti: () => !!gor['o-talim'], m: () => '<b>Topçu</b>\'ya git, <b>Talim</b> alanında bir düello bitir.', dugme: 'Topçu', git: 'topcu',
      ekranda: { topcu: '<b>Talim alanı</b>nı seç, <b>Talime başla</b>. Basılı tut, bırak: güç ve açı. Rüzgâr okuna bak.' } },
    { id: 'k-harita', b: 3, bitti: () => !!(gor['a-harita'] || gor['ac-harita']), m: () => '<b>Mini haritaya</b> dokun: kasabada hızlı seyahat et.', dugme: 'Harita', git: 'harita' },
    { id: 'k-bakim', b: 3, bitti: () => S.st.talk > 0 && S.st.feed > 0, m: () => '<b>' + kor() + '</b>\'u besle ve onunla konuş; bağınız güçlenir.', dugme: 'Ejderhalar', git: 'ejderhalar',
      ekranda: { ejderhalar: '<b>Besle</b> ile yem ver, <b>Bakım</b>\'da sohbet et.' } },
    { id: 'k-kusam', b: 3, bitti: () => !kusamTek(), ver: () => ({ altin: 120 }), m: () => 'Hâlâ çıplaksın. <b>Portrene</b> dokun, ilk zırhını al.', dugme: 'Zırhçı', git: 'zirhci' },
    { id: 'k-arena', b: 3, bitti: () => S.st.fights > 0 || S.st.wins > 0, m: () => '<b>Köy Arenası</b>\'nda ilk dövüşüne çık.', dugme: 'Arena', git: 'arena',
      ekranda: { arena: 'Bir rakip seç, <b>Meydan oku</b>. Ejderhan kendi dövüşür; sen taktiği seçersin.' } },
    { id: 'u-yuva', b: 4, bitti: () => hasB('yuva'), ver: () => ({ altin: fiyat('yuva') }), m: () => 'Ocağında boş bir kareye <b>Yuva Bahçesi</b> kur; çiftleşme orada olur.', dugme: 'Ocak', git: 'ocak' },
    { id: 'u-in', b: 4, uygun: () => !yetiskinCift(), bitti: () => typeof freeSlots === 'function' && freeSlots() >= 1, ver: () => ({ altin: fiyat('in') }), m: () => 'Yeni ejderhaya yer gerek. Ocağına bir <b>İn</b> daha kur.', dugme: 'Ocak', git: 'ocak' },
    { id: 'u-damizlik', b: 4, bitti: () => !!yetiskinCift(), m: () => '<b>Pazar</b>\'daki ejderha tüccarında Usta\'nın armağanı bekliyor: ücretsiz bir damızlık.', dugme: 'Pazar', git: 'pazar',
      ekranda: { pazar: '<b>Usta\'nın armağanı</b> ilk sırada. Seç, <b>Satın al</b>; bedeli 0 altın.' } },
    { id: 'u-ciftles', b: 4, bitti: () => S.st.bred > 0 || gorev('breed'), m: () => 'Çiftin yakınlığı hazır. <b>Yuva</b>\'da çifti seç, <b>Yuva kur</b> de. Normalde yakınlık gezintiyle artar.', dugme: 'Yuva', git: 'yuva',
      ekranda: { yuva: 'Çifti seç, <b>Yuva kur</b> de. Yavru, anne ile babanın genlerini karışık alır.' } },
    { id: 'u-hafta', b: 4, bitti: () => S.st.bred > 0, m: () => 'Çift yuvada. <b>Haftayı Bitir</b>; yumurta sabah gelir.', dugme: 'Göster', git: 'hafta' },
    { id: 'u-kulucka', b: 4, uygun: () => sepette() && kFree() > 0, bitti: () => !sepette(), m: () => 'Yumurtan sepette. Ocağındaki <b>Kuluçka Ocağı</b>\'na koy.', dugme: 'Ocak', git: 'ocak' },
    { id: 'z-iksir', b: 5, bitti: () => S.food.genclik > 0 || omuz(), ver: () => ({ altin: (typeof FOODS !== 'undefined' && FOODS.genclik ? FOODS.genclik.fiyat : 140) }), m: () => '<b>Pazar</b>\'daki yemciden <b>Sonsuz Gençlik İksiri</b> al.', dugme: 'Pazar', git: 'pazar',
      ekranda: { pazar: 'Alttan <b>Yemci</b>\'yi seç, <b>Sonsuz Gençlik İksiri</b>\'ni al.' } },
    { id: 'z-yavru', b: 5, uygun: () => !omuz() && !yavruVar(), bitti: () => false, m: () => 'İksiri içecek bir <b>yavru</b> gerek. Yumurtan çatlayana dek <b>Haftayı Bitir</b>.', dugme: 'Göster', git: 'hafta' },
    { id: 'z-icir', b: 5, bitti: () => omuz(), m: () => 'İksiri bir <b>yavru</b>ya ikram et: hiç büyümez, Topçu\'da omuz ejderin olur.', dugme: 'Ejderhalar', git: 'ejderhalar',
      ekranda: { ejderhalar: 'Yavruyu seç, <b>Besle</b>\'de <b>Sonsuz Gençlik İksiri</b>\'ni ver.' } },
    { id: 'z-zindan', b: 5, bitti: () => !!gor['o-zindan'] || Object.keys((S.topcu && S.topcu.zafer) || {}).length > 0, m: () => '<b>Topçu</b>\'da <b>Zümrüt Saray</b> kapısına gir; Normal zorluk yeter.', dugme: 'Topçu', git: 'topcu',
      ekranda: { topcu: 'Bir zindan kapısına dokun, <b>Normal</b> seç ve gir.' } },
    { id: 'tc-bedesten', b: 6, bitti: () => !!gor['ac-bedesten'], m: () => '<b>Bedesten</b>\'e bak: oyuncular mallarını ve ejderhalarını burada satar.', dugme: 'Bedesten', git: 'bedesten' },
    { id: 'tc-ors', b: 6, bitti: () => !!((S.ekipman && (S.ekipman.parca || []).some(p => p.deneme > 0)) || (S.ors && S.ors.deneme > 0)), ver: () => ({ altin: 40, tas: { kor_t1: 3 } }), m: () => '<b>Kor Örsü</b>\'nde Ejder Topu\'nu bir kez döv. İbre altın kora gelince çekici indir.', dugme: 'Örs', git: 'ors' },
    { id: 'b-dost', b: 7, bitti: () => !!gor['o-dost'], m: () => 'Meydanda terbiyeci <b>Ayaz</b> seni bekliyor. Yanına git, dost ol.', dugme: 'Meydan', git: 'meydan' },
    { id: 'b-han', b: 7, bitti: () => !!gor['ac-han'], m: () => '<b>Han</b>\'a uğra: haftada bir akşamı biriyle geçirirsin.', dugme: 'Han', git: 'han' },
    { id: 'b-masa', b: 7, bitti: () => !!(gor['ac-kiraathane'] || gor['ac-masa']), m: () => '<b>Kıraathane</b>\'de masalara bak: Ejder Pokeri burada oynanır.', dugme: 'Kıraathane', git: 'kiraathane' },
  ];
  const ADIM = ADIM0.map((a, n) => Object.assign({}, a, { m: () => '<small class="rh-sira" title="Öğretici · ' + BOLUM[a.b].ad + '">' + a.b + '. bölüm</small> ' + a.m() }));
  const yeni = () => !!gor.v2, otoKip = () => !!navigator.webdriver && !window.__gercekAkis;
  let hataGosterildi = 0;
  const sinanir = a => { try { return (!a.uygun || a.uygun()) && !a.bitti(); } catch (e) { if (!hataGosterildi++) console.warn('rehber adımı okunamadı', a.id, e); return false; } };
  /* şimdiki adım: sıradaki bitmemiş adım. Yeni ocakta adımlar kapatılamaz; eski oyuncuda kapatılan adım geçilir. */
  function aktifAdim() { if (typeof S === 'undefined' || !S || S.over || gor['kilit-gec']) return null; if (EO2.ziyaret && EO2.ziyaret.evSahibi && EO2.ziyaret.evSahibi()) return null;
    return ADIM0.find(a => (yeni() || !gor[a.id]) && sinanir(a)) || null; }
  const aktifBolum = () => { const a = aktifAdim(); return a ? a.b : 99; };
  /* ---------- İLK HAFTA KİLİDİ (kullanıcı kararı, 2026-11-18) ----------
     İlk haftada oyuncu yalnız birinci bölümü yapabilir: Kuluçka Ocağı'nı kur, ejderhana emir ver, haftayı bitir.
     Bu sırada başka ekran açılmaz, ocaktan çıkılmaz, hafta erken bitirilmez; basılan yerde ne yapılacağı söylenir.
     Otomatik denetimlerde (navigator.webdriver) kilit kapalıdır; gerçek akışı ölçen denetim window.__gercekAkis ile açar. */
  const ORTAK_EKRAN = ['menu', 'ayarlar', 'gorunus', 'dolap'];
  const KILIT_IZIN = { 'a-kulucka': ['ocak', 'gorevler', 'kur:kulucka'], 'a-emir': ['ocak', 'gorevler', 'ejderhalar'], 'a-hafta': ['ocak', 'gorevler', 'ejderhalar'] };
  function kilitAdim() { if (!G.live || typeof S === 'undefined' || !S || S.over || S.week !== 1 || gor['kilit-gec'] || otoKip()) return null;
    const a = aktifAdim(); return a && a.b === 1 ? a : null; }
  /* bölüm kilidi (2. bölümden sonra): sırası gelmemiş bölümün ekranı açılmaz */
  function bolumKilit() { if (!G.live || !yeni() || gor['kilit-gec'] || otoKip()) return null; return aktifAdim(); }
  let sonKilitUyari = 0;
  function kilitUyar(a, bolumAd) { const t = Date.now(); if (t - sonKilitUyari < 1400) return; sonKilitUyari = t; de((bolumAd ? 'Burası <b>' + bolumAd + '</b> bölümünde açılır. Şimdi: ' : 'Önce bunu bitirelim: ') + a.m(), 'goal'); serit.classList.remove('rh-salla'); void serit.offsetWidth; serit.classList.add('rh-salla'); tazele(); }
  /* bir ekran, panel ya da yer kilit yüzünden kapalı mı? Kapalıysa oyuncuya söyler ve true döner. */
  function kilitEngel(ad) { const a = kilitAdim(); if (a) { if (ORTAK_EKRAN.includes(ad) || KILIT_IZIN[a.id].includes(ad)) return false; kilitUyar(a); return true; }
    const p = { sosyal: 'han', envanter: 'canta', gorevler: 'defter' }[ad] || ad, n = YER_BOLUM[p], k = n ? bolumKilit() : null;
    if (k && n > k.b) { kilitUyar(k, n + '. ' + BOLUM[n].ad); return true; } return false; }
  function kilitGec() { isaretle('kilit-gec'); gizle(); tazele(); de('Öğretici geçildi. Her yer açık.'); }
  { const ac0 = G.open; G.open = function (id) { if (kilitEngel(id)) return; return ac0.apply(this, arguments); };
    const hafta0 = G.endWeek; if (hafta0) G.endWeek = function () { const a = kilitAdim(); if (a && a.id !== 'a-hafta') { kilitUyar(a); return; } return hafta0.apply(this, arguments); };
    EO2.kilitYer = id => { const a = kilitAdim(); if (!a || id === 'ocak') return false; kilitUyar(a); return true; }; }   /* game.js goScene buraya sorar */

  /* ---------- kaynak: adımın istediği eksik kadarını öğretici verir (adım başına en çok üç kez) ---------- */
  const TAS_AD = { kor_t1: 'Kıvılcım Kor Taşı' };
  function kaynakVer(a) { if (!a.ver || !yeni() || otoKip() || (gor['v-' + a.id] | 0) >= 3) return; let v; try { v = a.ver(); } catch (_) { return; } if (!v) return;
    const ver = []; if (v.altin && S.gold < v.altin) { const n = v.altin - S.gold; S.gold += n; ver.push('<b>' + n + ' altın</b>'); }
    if (v.tas) { S.topcu = S.topcu || {}; const H = S.topcu.ganimet = S.topcu.ganimet || {}; for (const k in v.tas) { const n = v.tas[k] - (H[k] | 0); if (n > 0) { H[k] = (H[k] | 0) + n; ver.push('<b>' + n + ' ' + (TAS_AD[k] || k) + '</b>'); } } }
    if (!ver.length) return; gor['v-' + a.id] = (gor['v-' + a.id] | 0) + 1; yaz(); if (typeof saveGame === 'function') saveGame(); if (G.hud) G.hud();
    de('Usta sana ' + ver.join(' ve ') + ' verdi. Bu adım için yeter.', 'goal'); if (G.fx && G.fx.coins && v.altin) try { G.fx.coins('#scrGold', 6); } catch (_) { } }
  /* çiftleşme adımı: Pazar'da bir kez ücretsiz damızlık; alınınca çiftin yakınlığı ve morali yüksek tutulur */
  function damizlik() { const a = aktifAdim(); if (!a || !S.market) return; const L = S.market.dragons = S.market.dragons || [];
    if (a.id === 'u-damizlik' && !gor['u-armagan'] && typeof mkDragon === 'function' && !L.some(d => d.ogretici)) {
      const es = (S.dragons || []).find(d => !d.dead && d.stage === 'yetiskin') || {}, sex = es.sex === 'F' ? 'M' : 'F';
      const d = mkDragon({ name: sex === 'F' ? 'Sürmeli' : 'Alpagut', sex, genes: typeof randomGenes === 'function' ? randomGenes({ q: 0.3 }) : undefined, stage: 'yetiskin', age: 5, traits: [], bond: 40, mood: 4, origin: 'Usta\'nın armağanı' });
      S.nid--; d.id = 'm' + S.uid++; d.price = 0; d.ogretici = 1; d.mood = 4; L.unshift(d); }
    const yeniD = (S.dragons || []).find(d => d.ogretici && !d.dead); if (!yeniD) return; if (!gor['u-armagan']) isaretle('u-armagan');
    if (S.st.bred > 0) return; const es = (S.dragons || []).find(d => !d.dead && d !== yeniD && d.stage === 'yetiskin' && d.sex !== yeniD.sex); if (!es || typeof affKey !== 'function') return;
    const k = affKey(yeniD.id, es.id); if ((S.aff[k] || 0) < 100) S.aff[k] = 100; for (const d of [yeniD, es]) if (d.mood < 3) d.mood = 3; }
  /* yedek: iksir adımında hiç yavru ve yumurta yoksa öğretici bir yumurtayı kuluçkaya koyar */
  function yedekYumurta() { const a = aktifAdim(); if (!a || a.id !== 'z-yavru' || (S.eggs || []).length || gor['z-yumurta'] || typeof marketEgg !== 'function' || kFree() < 1) return;
    const e = marketEgg(); delete e.price; e.origin = 'Usta\'nın armağanı'; e.inK = true; S.eggs.push(e); isaretle('z-yumurta'); if (typeof saveGame === 'function') saveGame(); de('Usta kuluçkana bir yumurta koydu. Çatlayınca yavruna iksiri içir.', 'goal'); }

  /* ---------- bölüm kartı: yeni bölüm başlarken bir kez ---------- */
  let kartAcik = false;
  async function bolumKarti() { if (kartAcik || !yeni() || otoKip() || !G.live || (G.sakin && !G.sakin()) || (G.ekran && G.ekran()) || app.classList.contains('fight') || document.querySelector('.pen-perde, .gece, .sabah, .vn, .dogum-s')) return;
    const a = aktifAdim(), n = a ? a.b : 8, s = gor.bolum | 0; if (n <= 1 || n <= s) return; gor.bolum = n; yaz();
    if (n > 7) { de('Öğretici bitti. Ejder Ocağı\'nın her yeri artık açık.', 'goal'); return; }
    const B = BOLUM[n]; kartAcik = true;
    try { await G.pen({ k: 'Yeni bölüm · ' + n + ' / 7', t: B.ad, body: '<p>' + B.t + '</p>' + (B.acar ? '<p class="soluk">Açılanlar: ' + B.acar.join(', ') + '</p>' : ''), btns: [{ t: 'Başla', cls: 'altin', v: true }] }); } catch (_) { }
    kartAcik = false; tazele(); }
  /* Defter'deki "Öğretici" sayfası için bölümlerin durumu */
  function bolumler() { const a = aktifAdim(), n = a ? a.b : 8; return BOLUM.slice(1).map((B, i) => ({ n: i + 1, ad: B.ad, t: B.t, durum: i + 1 < n ? 'tamam' : i + 1 === n ? 'simdi' : 'kilitli', adim: i + 1 === n && a ? a.m() : '' })); }
  function olay(ad) { isaretle('o-' + ad); setTimeout(tazele, 50); }

  /* ---------- Ayaz: oyuncu görünüşlü NPC terbiyeci; dostluk adımı onunla yapılır ---------- */
  let ayaz = null;
  function ayazKur() { const A = EO2.api; if (!A || !A.mkChar || !G.live || !yeni()) return; const sc = A.scene(); if (sc !== 'master' && sc !== 'meydan') return; const L = A.sceneState().L;
    if (ayaz && ayaz.area === sc && L.interact.includes(ayaz.etk)) return; if (ayaz) ayazSil();
    const x = L.start.x - 1.9, y = L.start.y + 0.8;
    ayaz = A.mkChar({ name: 'Ayaz', role: 'Terbiyeci', x, y, tx: x, ty: y, set: 'avci', dir: 'down', rdir: 'down', crumbs: [[x, y]] }); ayaz.area = sc; A.remotes.push(ayaz);
    ayaz.etk = { id: 'rh:ayaz', x, y, r: 1.6, z: 2.3, label: 'Ayaz', sub: gor['o-dost'] ? 'Dostun · selam ver' : 'Terbiyeci · selam ver', act: 'rehber:ayaz' }; L.interact.push(ayaz.etk); }
  function ayazSil() { const A = EO2.api; if (!ayaz || !A) return; const i = A.remotes.indexOf(ayaz); if (i >= 0) A.remotes.splice(i, 1); for (const s of [A.sceneState && A.sceneState().L]) if (s && s.interact) { const j = s.interact.indexOf(ayaz.etk); if (j >= 0) s.interact.splice(j, 1); } if (A.dropChar) A.dropChar(ayaz); ayaz = null; }
  async function ayazKonus() { const A = EO2.api; if (gor['o-dost']) { if (ayaz && A.say) A.say(ayaz, 'wave', 2.2, true); de('Ayaz el sallıyor: "Meydanda görüşürüz, dostum!"'); return; }
    const v = await G.pen({ k: 'Terbiyeci', t: 'Ayaz', body: '<p>"Selam! Ben de ocağımı yeni kurdum. Dost olalım mı? Dostlar fısıldaşır, birbirini düelloya, sefere ve masaya çağırır."</p>', btns: [{ t: 'Sonra', v: false }, { t: 'Dost ol', cls: 'altin', v: true }] });
    if (!v) return; olay('dost'); if (ayaz) { ayaz.etk.sub = 'Dostun · selam ver'; if (A.say) A.say(ayaz, 'heart', 2.4, true); }
    de('<b>Ayaz</b> artık dostun. Gerçek terbiyecileri de meydanda yanlarına gidip <b>Dost ekle</b> ile eklersin.', 'goal'); }
  (function bagla() { if (!EO2.hooks || !EO2.hooks.act) return setTimeout(bagla, 150); const a0 = EO2.hooks.act; EO2.hooks.act = act => { if (act === 'rehber:ayaz') { if (EO2.audio) EO2.audio.ui(); ayazKonus(); return true; } return a0(act); }; })();

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
  const SAHNE_IPUCU = { ocak: () => dokun() ? 'Bir kareye yürü. Beliren düğmeye dokun: araziyi aç ya da yapı kur.' : 'Bir kareye yürü. E ile araziyi aç ya da yapı kur.' };

  function tazele() { if (!G.live || typeof S === 'undefined' || !S || S.over) return gizle();
    if (simdi && simdi.tur !== 'adim') return;      // ekran ya da sahne ipucu görünürken adım araya girmez
    const e = G.ekran && G.ekran(); if (e) { if (simdi) gizle(); return; }
    const k = aktifAdim(), a = k ? ADIM[ADIM0.indexOf(k)] : null, kil = !!k && (!!kilitAdim() || !!bolumKilit());
    if (!a) return gizle(); goster({ id: a.id, tur: 'adim', metin: a.m(), dugme: a.dugme, git: a.git, kilit: kil }); }
  function ekran(id) { if (!G.live) return; if (id) isaretle('ac-' + id);
    const k = id && aktifAdim(), ek = k && k.ekranda && k.ekranda[id];
    if (ek && !(simdi && simdi.id === 'x-' + k.id)) { goster({ id: 'x-' + k.id, tur: 'ekran', metin: ek, sn: 16 }); return; }      // şimdiki adımın bu ekrandaki yönergesi
    if (id && IPUCU[id] && !gor['e-' + id]) { isaretle('e-' + id); goster({ id: 'e-' + id, tur: 'ekran', metin: typeof IPUCU[id] === 'function' ? IPUCU[id]() : IPUCU[id], sn: 14 }); return; }
    if (simdi && simdi.tur === 'ekran' && !(ek && simdi.id === 'x-' + k.id)) gizle(); if (!id) tazele(); else if (simdi && simdi.tur !== 'ekran') gizle(); }
  let sonSahne = null;
  setInterval(() => { const A = EO2.api; if (!A || !A.scene || !G.live) return; const sc = A.scene(); if (sc === sonSahne) return; sonSahne = sc;
    if ((sc === 'meydan' || sc === 'master' || sc === 'pazar' || sc === 'carsi' || sc === 'arena') && typeof S !== 'undefined' && S && S.week >= 2 && !gor['a-harita']) isaretle('a-harita');
    if (simdi && simdi.tur === 'sahne') gizle(); if (sc === 'master' || sc === 'meydan') ayazKur();
    if (sc === 'ocak' && EO2.ziyaret && EO2.ziyaret.evSahibi()) { goster({ id: 's-misafir', tur: 'sahne', metin: dokun() ? 'Misafirsin: gez, bak. Ev sahibinin yanına gel, beliren düğmeye dokun ve ejderhanı eşleşmeye sun.' : 'Misafirsin: gez, bak. Ev sahibinin yanına gel ve E ile ejderhanı eşleşmeye sun.', sn: 16 }); return; }
    if (SAHNE_IPUCU[sc] && !gor['s-' + sc] && !(G.ekran && G.ekran()) && !aktifAdim()) { isaretle('s-' + sc); goster({ id: 's-' + sc, tur: 'sahne', metin: SAHNE_IPUCU[sc](), sn: 16 }); } else tazele(); }, 600);

  /* ---------- kilitli düğme: nedenini söyle ----------
     Kapalı düğme tıklama olayı üretmez; dokunulan noktadaki öğeye bakılır. Neden, düğmenin title'ında ya da data-neden'inde durur. */
  let sonNeden = 0;
  document.addEventListener('pointerdown', e => { if (!G.live) return; let n = null;
    try { n = (document.elementsFromPoint(e.clientX, e.clientY) || []).find(x => x.matches && x.matches('button[disabled], [aria-disabled="true"], .kilitli')); } catch (_) { }
    if (!n || !app.contains(n)) return; const neden = (n.dataset && n.dataset.neden) || n.getAttribute('title') || ''; if (!neden || neden.length < 4) return;
    const t = Date.now(); if (t - sonNeden < 1200) return; sonNeden = t; de(esc(neden)); }, true);

  /* bakım döngüsü: adımın kaynağı, damızlık, yedek yumurta ve bölüm kartı */
  let sonAdim = null;
  setInterval(() => { if (!G.live || typeof S === 'undefined' || !S || S.over) return; const a = aktifAdim();
    try { if (a) kaynakVer(a); damizlik(); yedekYumurta(); } catch (e) { console.warn('rehber', e); }
    if ((a && a.id) !== sonAdim) { sonAdim = a && a.id; if (!(G.ekran && G.ekran())) tazele(); } bolumKarti(); }, 1000);

  EO2.rehber = { git, ac, tazele, ekran, olay, bolumler, aktif: () => { const a = aktifAdim(); return a ? { id: a.id, bolum: a.b } : null; }, kilit: () => { const a = kilitAdim(); return a ? a.id : null; }, bolumKilit: () => { const a = bolumKilit(); return a ? a.b : null; }, kilitEngel, kilitGec, basla() { sonSahne = null; tazele(); }, sifirla() { gor = { v2: 1 }; yaz(); gizle(); }, gorulen: () => Object.assign({}, gor), simdi: () => simdi ? Object.assign({}, simdi) : null };
})();
