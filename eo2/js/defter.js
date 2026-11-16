/* Ejder Ocağı 2.0 · Görev Defteri, Kiler ve Sandık (envanter), Menü
   Defter: masadaki açık defterin iki sayfası (hedefler ve yıldızın kariyeri solda; günce, albüm ve sayılar sağda).
   Envanter: kilerdeki raflar; kareler nadirlik zeminli, altta adet şeridi; seçilen şeyin ayrıntısı sağda.
   Veriler oyunun kendisidir: activeGoals, career/careerProg, S.chron, S.album, S.st, S.food, S.inv, S.eggs. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const ik = n => new URL('assets/ik/' + n + '.webp', location.href).href;

  /* ================= GÖREV DEFTERİ ================= */
  let sayfa = 'gunce';
  const ST_AD2 = { wins: 'Zafer', losses: 'Yenilgi', fights: 'Dövüş', train: 'Antrenman', feed: 'Besleme', talk: 'Sohbet', fav: 'Bulunan sevilen yem', hatch: 'Çatlayan yumurta', bred: 'Çiftleşme', acq: 'Edinilen ejderha', seferler: 'Sefer', catches: 'Yakalanan yaban', kupa: 'Kupa', deaths: 'Kayıp' };
  G.screen('defter', { k: 'Ocak defteri', t: 'Görevler', cls: 'df', bg: 'a:defter', draw(body) {
    const gs = activeGoals(6), C = typeof career === 'function' ? career() : null, cd = C ? byId(C.id) : null, se = seasonOf();
    const sol = '<div class="sayfa sol"><h2>Hedefler</h2><p class="alt">Hafta ' + S.week + ' / ' + SEASON + ' · ' + se.ad + '</p>' +
      (gs.length ? '<ul class="hedef">' + gs.map((g, i) => '<li style="animation-delay:' + (i * 0.06) + 's"><i></i><span>' + g.t + '</span><em>' + g.r + '</em></li>').join('') + '</ul>' : '<p class="bos">Bütün hedefler tamam. Defterin bu sayfası doldu.</p>') +
      (C && cd ? '<h2 class="ara">' + esc(cd.name) + ' · kariyer</h2><ol class="kariyer">' + C.goals.map((g, i) => { const st = g.st === 'ok' ? 'tamam' : i === C.i ? 'simdi' : '', p = i === C.i ? careerProg(cd, g) : null, wl = weeksLeft(g); return '<li class="' + st + '"><b>' + (g.st === 'ok' ? '✓' : i + 1) + '</b><div><span>' + esc(g.t) + '</span><small>' + (g.st === 'ok' ? 'tamamlandı' : i === C.i ? esc(p.txt) + ' · ' + (wl <= 0 ? 'bu hafta son' : wl + ' hafta kaldı') : 'son hafta ' + g.by) + ' · ödül ' + goalGold(g) + ' altın</small></div></li>'; }).join('') + '</ol><p class="dip">Tutturamazsa kariyeri biter: emekli olur, ocağın hocası olarak kalır; yıldızlık başkasına geçer.</p>' : '') + '</div>';
    const chron = (S.chron || []).slice().reverse(), album = (S.album || []).slice().reverse();
    const sag = '<div class="sayfa sag"><div class="ayraclar">' + [['gunce', 'Günce'], ['album', 'Albüm'], ['sayi', 'Sayılar']].map(t => '<button type="button" data-sayfa="' + t[0] + '" aria-pressed="' + (sayfa === t[0]) + '">' + t[1] + '</button>').join('') + '</div>' +
      (sayfa === 'gunce' ? '<h2>Günce</h2><div class="kay ic">' + (chron.length ? chron.map(c => '<p class="satir"><b>' + (c.w ? c.w + '. hafta' : '') + '</b>' + (typeof c === 'string' ? c : (c.t || c.text || '')) + '</p>').join('') : '<p class="bos">Henüz yazılmış bir şey yok.</p>') + '</div>'
        : sayfa === 'album' ? '<h2>Albüm</h2><div class="kay ic albumler">' + (album.length ? album.map(a => { const d = a.d != null ? byId(a.d) : null, src = a.npc ? G.npcImg(a.npc) : d ? G.img(d) : a.el ? OLD + 'img/dr-' + a.el + '-' + (a.stage || 'yetiskin') + '.webp' : ''; return '<figure>' + (src ? '<img alt="" src="' + src + '">' : '<i></i>') + '<figcaption><b>' + esc(a.title || '') + '</b><span>' + (a.text || '') + '</span><small>' + (a.w ? a.w + '. hafta' : '') + '</small></figcaption></figure>'; }).join('') : '<p class="bos">İlk anı buraya yapıştırılacak: bir doğum, bir zafer, bir yakalayış.</p>') + '</div>'
        : '<h2>Sayılar</h2><div class="kay ic sayilar">' + Object.keys(S.st || {}).map(k => '<div><span>' + (ST_AD2[k] || k) + '</span><b>' + S.st[k] + '</b></div>').join('') + '<div><span>Ejderha</span><b>' + S.dragons.length + ' / ' + capacity() + '</b></div><div><span>Açık arazi</span><b>' + S.grid.filter(t => t.open).length + '</b></div><div><span>Ün sırası</span><b>' + (rankList().findIndex(r => r.me) + 1) + '.</b></div></div>') + '</div>';
    body.innerHTML = '<div class="defter">' + sol + '<i class="cilt"></i>' + sag + '</div>';
    on(body, '[data-sayfa]', b => { sayfa = b.dataset.sayfa; render(); });
  } });

  /* ================= ENVANTER ================= */
  let raf = 'yem', secili = null;
  const TIER = ['t0', 't1', 't2', 't3', 't4'];
  function items() {
    if (raf === 'yem') return Object.keys(FOODS).filter(k => (S.food[k] || 0) > 0).map(k => ({ key: 'f:' + k, ad: FOODS[k].ad, img: OLD + 'img/' + (k === 'genclik' ? 'ic-feed' : 'food-' + k) + '.webp', adet: S.food[k], tier: k === 'ziyafet' ? 3 : k === 'genclik' ? 4 : FOODS[k].el ? 1 : 0, tur: 'Yem' + (FOODS[k].el ? ' · ' + EL_AD[FOODS[k].el] : ''), d: FOODS[k].d || (FOODS[k].el ? EL_AD[FOODS[k].el] + ' ejderlerinin sevdiği yem.' : ''), git: ['ejderhalar', 'Ahıra git ve besle'] }));
    if (raf === 'esya') return (S.inv || []).filter(x => ITEMS[x.id]).map(x => { const it = ITEMS[x.id], o = equippedBy(x.uid); return { key: 'i:' + x.uid, ad: it.ad, img: OLD + 'img/item-' + x.id + '.webp', fb: OLD + 'img/ic-train.webp', adet: o ? '✓' : '', tier: it.tier || 1, tur: (G.SLOT_AD[it.slot] || it.slot) + ' kuşamı', d: G.itemInfo(it) + (o ? '. ' + esc(o.name) + ' kuşanıyor.' : '. Kimse kuşanmıyor.'), sat: sellBack(x.id), git: ['ejderhalar', 'Ahıra git ve kuşandır'] }; });
    return (S.eggs || []).map(e => ({ key: 'e:' + e.id, ad: e.origin || 'Yumurta', img: G.yumurtaResim(e), adet: e.inK ? (e.w || 0) + '. hf' : '', tier: e.parents ? 2 : 3, tur: 'Yumurta', d: (e.inK ? 'Kuluçkada, ' + (e.w || 0) + '. haftasında.' : 'Soğukta bekliyor; bir Kuluçka Ocağına konmalı.') + (e.gen ? ' ' + e.gen + '. nesil.' : ''), git: ['ocak', 'Ocağa git'] }));
  }
  G.screen('canta', { k: 'Kiler ve sandık', t: 'Envanter', cls: 'cn', bg: 'a:depo', draw(body) {
    const L = items(); let cur = L.find(x => x.key === secili) || L[0]; secili = cur ? cur.key : null; const bos = Math.max(0, 24 - L.length);
    body.innerHTML = '<div class="raflar"><div class="sekme" role="tablist">' + [['yem', 'Yem', Object.keys(FOODS).filter(k => (S.food[k] || 0) > 0).length], ['esya', 'Kuşam', (S.inv || []).length], ['yumurta', 'Yumurta', (S.eggs || []).length]].map(t => '<button type="button" role="tab" data-raf="' + t[0] + '" aria-selected="' + (raf === t[0]) + '">' + t[1] + ' <small>' + t[2] + '</small></button>').join('') + '</div>' +
      '<div class="izgara kay">' + L.map((x, i) => '<button type="button" class="kare2 ' + TIER[x.tier] + '" data-key="' + x.key + '" aria-pressed="' + (cur && x.key === cur.key) + '" style="animation-delay:' + Math.min(i * 0.025, 0.4) + 's" title="' + esc(x.ad) + '"><img alt="" src="' + x.img + '"' + (x.fb ? ' onerror="this.onerror=null;this.src=\'' + x.fb + '\'"' : '') + '><b>' + (x.adet !== '' ? x.adet : '&nbsp;') + '</b></button>').join('') + Array.from({ length: bos }, () => '<i class="kare2 bos"></i>').join('') + '</div></div>' +
      (cur ? '<aside class="ayrinti ' + TIER[cur.tier] + '"><div class="ay-res"><img alt="" src="' + cur.img + '"' + (cur.fb ? ' onerror="this.onerror=null;this.src=\'' + cur.fb + '\'"' : '') + '></div><span class="ust">' + cur.tur + '</span><h2>' + esc(cur.ad) + '</h2><div class="yildizlar">' + '★'.repeat(Math.max(1, cur.tier + 1)) + '</div><p>' + cur.d + '</p>' + (cur.sat ? '<p class="soluk">Demircide geri satış: ' + cur.sat + ' altın.</p>' : '') + '<button type="button" class="gbtn altin" data-git="' + cur.git[0] + '">' + cur.git[1] + '</button></aside>'
        : '<aside class="ayrinti bosay"><img alt="" src="' + ik('canta') + '"><p>' + (raf === 'yem' ? 'Kilerde yem yok. Pazardaki yemciden alabilirsin.' : raf === 'esya' ? 'Sandıkta kuşam yok. Demirci Usta Kerim satar; turnuvalar da kazandırır.' : 'Bekleyen yumurta yok. Yuva\'da çiftleştir ya da yumurtacıdan al.') + '</p><button type="button" class="gbtn altin" data-git="pazar">Pazara git</button></aside>');
    on(body, '[data-raf]', b => { raf = b.dataset.raf; secili = null; render(); }); on(body, '[data-key]', b => { secili = b.dataset.key; render(); }); on(body, '[data-git]', b => G.open(b.dataset.git));
  } });

  /* ================= KAYIT GÜVENLİĞİ =================
     Kayıt anahtarı ve biçimi oyunun kendisidir (js/core.js: ejder-ocagi-v1). Burada yalnız çevresi kurulur:
     dosyaya aktarma, dosyadan yükleme (önce onay ve yedek), iki adımlı silme, yazma hatası uyarısı, iki sekme koruması. */
  const app = document.getElementById('app'), YEDEK = 'eo2-kayit-yedek';
  const anahtar = () => typeof saveKeyForSlot === 'function' ? saveKeyForSlot() : 'ejder-ocagi-v1';
  const depo = { al(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }, sil(k) { try { localStorage.removeItem(k); } catch (_) { } } };
  const iki = n => String(n).padStart(2, '0');
  const zaman = t => { if (!t) return ''; const dk = Math.round((Date.now() - t) / 60000); if (dk < 1) return 'az önce'; if (dk < 60) return dk + ' dakika önce'; if (dk < 60 * 24) return Math.round(dk / 60) + ' saat önce'; const d = new Date(t); return iki(d.getDate()) + '.' + iki(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const ozet = sv => ({ ad: (sv && typeof sv.terbiyeci === 'string' && sv.terbiyeci) || 'Terbiyeci', hafta: sv.week || 1, sezon: sv.seasonNo || 1, ejder: (sv.dragons || []).length, altin: sv.gold || 0, un: sv.un || 0 });
  const ozetKart = (baslik, o, cls) => '<div class="ky-kart ' + (cls || '') + '"><span class="ust">' + baslik + '</span><b>' + esc(o.ad) + '</b><p>Hafta ' + o.hafta + (o.sezon > 1 ? ' · ' + o.sezon + '. sezon' : '') + '</p><p>' + o.ejder + ' ejderha · ' + o.altin + ' altın · ' + o.un + ' ün</p></div>';

  let engel = false, uyariEl = null, uyariKapali = false;
  /* kayıt yazılamazsa (depo dolu, gizli pencere, depo kapalı) oyuncu bilsin: sade, kalıcı bir şerit */
  function uyar() { if (uyariEl || uyariKapali || !G.live) return; uyariEl = document.createElement('div'); uyariEl.className = 'kayit-uyari'; uyariEl.setAttribute('role', 'alert');
    uyariEl.innerHTML = '<i></i><p><b>Kayıt yazılamadı.</b> Tarayıcının deposu dolu ya da kapalı. İlerlemen şimdilik yalnız bu sekmede duruyor.</p><button type="button" class="gbtn altin kucuk" data-u="aktar">Dosyaya aktar</button><button type="button" class="ky-kapat" data-u="kapat" aria-label="Uyarıyı kapat">×</button>';
    uyariEl.addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (!b) return; if (b.dataset.u === 'aktar') aktar(); else { uyariKapali = true; uyariKapat(); } }); app.appendChild(uyariEl); }
  function uyariKapat() { if (uyariEl) { uyariEl.remove(); uyariEl = null; } }
  const cekirdekKaydet = window.saveGame;
  if (typeof cekirdekKaydet === 'function') window.saveGame = function (slot) { if (engel) return false; const tamam = cekirdekKaydet(slot); if (tamam) { uyariKapali = false; uyariKapat(); } else if (typeof S !== 'undefined' && S) uyar(); return tamam; };

  /* üzerine yazılacak kaydın ham hâli saklanır: bir kez geri alınabilir */
  function yedekle(neden) { const ham = depo.al(anahtar()); if (!ham) return false; return depo.yaz(YEDEK, JSON.stringify({ t: Date.now(), neden: neden || '', kayit: ham })); }
  function yedekOku() { try { const y = JSON.parse(depo.al(YEDEK) || 'null'); if (y && typeof y.kayit === 'string') { const sv = JSON.parse(y.kayit); if (sv && Array.isArray(sv.dragons)) return { t: y.t, neden: y.neden, sv }; } } catch (_) { } return null; }
  function yerlestir(sv) { if (typeof importSaveString !== 'function' || !importSaveString(JSON.stringify(sv))) return false;
    if (typeof careerRepair === 'function') careerRepair(); if (typeof registerAllHeirlooms === 'function') registerAllHeirlooms(); UI.sel = S.dragons[0] ? S.dragons[0].id : null; if (G.adUygula) G.adUygula(); return true; }

  /* dosyaya aktar: okunur JSON; içinde oyunun kaydı olduğu gibi durur */
  function aktarMetni() { if (G.live && typeof S !== 'undefined' && S) saveGame(); const sv = (G.live && typeof S !== 'undefined' && S) ? S : loadGame(); if (!sv) return '';
    return JSON.stringify({ oyun: 'Ejder Ocağı', bicim: 'eo2-kayit', surum: 1, tarih: new Date().toISOString(), kayit: sv }); }
  function aktar() { const metin = aktarMetni(); if (!metin) { toast('Aktarılacak kayıt yok.'); return false; }
    const o = ozet(JSON.parse(metin).kayit), d = new Date(), ad = 'ejder-ocagi-' + (o.ad.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]+/g, '-').replace(/^-|-$/g, '') || 'ocak') + '-hafta' + o.hafta + '-' + d.getFullYear() + iki(d.getMonth() + 1) + iki(d.getDate()) + '.json';
    try { const url = URL.createObjectURL(new Blob([metin], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = ad; a.hidden = true; app.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000); }
    catch (_) { toast('Dosya oluşturulamadı.'); return false; }
    toast('Kayıt dosyaya aktarıldı: <b>' + esc(ad) + '</b>'); return true; }
  /* dosya metnini çöz: 2.0 dosyası, çıplak kayıt ya da eski oyunun dışa aktarma metni */
  function coz(metin) { let v = null; const t = String(metin || '').trim(); if (!t) return { hata: 'Dosya boş.' };
    try { v = JSON.parse(t); } catch (_) { try { const bin = atob(t.replace(/\s+/g, '')), by = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i); v = JSON.parse(new TextDecoder().decode(by)); } catch (_2) { return { hata: 'Bu dosya bir Ejder Ocağı kaydı değil.' }; } }
    const sv = v && typeof v === 'object' && v.kayit && typeof v.kayit === 'object' ? v.kayit : v;
    if (!sv || typeof sv !== 'object' || Array.isArray(sv) || !Array.isArray(sv.dragons) || !Array.isArray(sv.grid) || !isFinite(Number(sv.week))) return { hata: 'Bu dosya bir Ejder Ocağı kaydı değil.' };
    return { kayit: sv }; }
  async function yukleMetin(metin) { const r = coz(metin); if (r.hata) { await G.pen({ k: 'Kayıt', t: 'Dosya okunamadı', body: '<p>' + r.hata + '</p>', btns: [{ t: 'Tamam', cls: 'altin' }] }); return false; }
    const simdi = typeof S !== 'undefined' && S ? ozet(S) : null;
    const v = await G.pen({ k: 'Kayıt', t: 'Dosyadaki ocak yüklensin mi?', wide: !!simdi, body: '<div class="ky-kiyas">' + (simdi ? ozetKart('Şimdiki ocak', simdi, 'eski') + '<i class="ky-ok"></i>' : '') + ozetKart('Dosyadaki ocak', ozet(r.kayit), 'yeni') + '</div><p class="ky-not">' + (simdi ? 'Şimdiki ocağın yerini dosyadaki alır. Şimdiki kayıt yedeklenir; menüden bir kez geri alabilirsin.' : 'Dosyadaki ocak bu tarayıcıya yazılır.') + '</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yükle', cls: 'altin', v: true }] });
    if (!v) return false; if (G.live) saveGame(); yedekle('dosyadan yükleme');
    if (!yerlestir(r.kayit)) { await G.pen({ k: 'Kayıt', t: 'Yüklenemedi', body: '<p>Dosya okundu ama kayıt yazılamadı. Şimdiki ocağın yerinde duruyor.</p>', btns: [{ t: 'Tamam', cls: 'altin' }] }); return false; }
    toast('<b>' + esc(G.ad()) + '</b> ocağı yüklendi · Hafta ' + S.week, 'goal'); if (S.over && G.son) { G.close(); G.son(); } else G.redraw(); return true; }
  let dosyaGir = null;
  function yukle() { if (!dosyaGir) { dosyaGir = document.createElement('input'); dosyaGir.type = 'file'; dosyaGir.accept = '.json,.txt,application/json,text/plain'; dosyaGir.id = 'kayitDosya'; dosyaGir.hidden = true; app.appendChild(dosyaGir);
      dosyaGir.addEventListener('change', async () => { const f = dosyaGir.files && dosyaGir.files[0]; dosyaGir.value = ''; if (!f) return; if (f.size > 8 * 1024 * 1024) { toast('Dosya çok büyük; bu bir kayıt dosyası olamaz.'); return; }
        let metin = ''; try { metin = await f.text(); } catch (_) { toast('Dosya okunamadı.'); return; } yukleMetin(metin); }); }
    dosyaGir.click(); }
  async function geriAl() { const y = yedekOku(); if (!y) { toast('Geri alınacak yedek yok.'); return false; }
    const v = await G.pen({ k: 'Kayıt', t: 'Önceki ocağa dönülsün mü?', wide: true, body: '<div class="ky-kiyas">' + ozetKart('Şimdiki ocak', ozet(S), 'eski') + '<i class="ky-ok"></i>' + ozetKart('Yedekteki ocak · ' + zaman(y.t), ozet(y.sv), 'yeni') + '</div><p class="ky-not">İkisi yer değiştirir: şimdiki ocak yedeğe geçer.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Geri al', cls: 'altin', v: true }] });
    if (!v) return false; saveGame(); yedekle('geri alma'); if (!yerlestir(y.sv)) { toast('Yedek yüklenemedi.'); return false; } toast('Önceki ocak geri geldi · Hafta ' + S.week, 'goal'); G.redraw(); return true; }
  /* kaydı sil: iki adım; ikinci adımda dosyaya aktarma önerilir */
  async function sil() { const o = ozet(S);
    const v1 = await G.pen({ k: 'Kayıt', t: 'Ocağı silmek mi istiyorsun?', body: '<div class="ky-kiyas">' + ozetKart('Silinecek ocak', o, 'eski') + '</div><p class="ky-not">Ejderhaların, arazin ve bütün ilerlemen bu tarayıcıdan silinir.</p>', btns: [{ t: 'Vazgeç', cls: 'altin', v: false }, { t: 'Silmeye devam et', v: true }] });
    if (!v1) return false;
    const v2 = await G.pen({ k: 'Son onay', t: 'Bu işlem geri alınamaz', body: '<p class="ky-orta"><b>' + esc(o.ad) + '</b> ocağı, Hafta ' + o.hafta + ', ' + o.ejder + ' ejderha. Yedeğiyle birlikte kalıcı olarak silinecek.</p><p class="ky-not">Emin değilsen önce dosyaya aktar; dosyadan her zaman geri yüklenir.</p>', dikey: true, btns: [{ t: 'Vazgeç', cls: 'altin', v: false }, { t: 'Önce dosyaya aktar', v: 'aktar' }, { t: 'Kalıcı olarak sil', cls: 'kor', v: 'sil' }] });
    if (v2 === 'aktar') { aktar(); return false; } if (v2 !== 'sil') return false;
    engel = true; if (typeof clearSave === 'function') clearSave(); else { depo.sil(anahtar()); depo.sil(anahtar() + '-bak'); } depo.sil(YEDEK); if (EO2.rehber) EO2.rehber.sifirla();
    G.close(); engel = false; G.title(); toast('Ocak silindi.'); return true; }
  EO2.kayit = { anahtar, ham: () => depo.al(anahtar()), aktar, aktarMetni, yukle, yukleMetin, coz, yedekle, yedekVar: () => !!yedekOku(), geriAl, sil, engelli: () => engel };

  /* ---------- iki sekme: aynı oyun iki sekmede açılırsa kayıtlar birbirini ezer ---------- */
  let perde = null;
  function sekmePerde(tur) { if (perde) perde.remove(); engel = true; perde = document.createElement('div'); perde.className = 'sekme-perde'; perde.setAttribute('role', 'alertdialog'); perde.setAttribute('aria-modal', 'true');
    perde.innerHTML = '<div class="sekme-kutu cam"><span class="ust">' + (tur === 'yeni' ? 'Oyun zaten açık' : 'Bu sekme durduruldu') + '</span><h2>' + (tur === 'yeni' ? 'Ejder Ocağı başka bir sekmede açık' : 'Oyun başka bir sekmede sürüyor') + '</h2><p>' + (tur === 'yeni' ? 'İki sekme aynı kaydı yazarsa biri ötekinin ilerlemesini siler. Burada oynarsan öteki sekme durur.' : 'Kaydın bozulmasın diye bu sekme artık kayıt yazmıyor. Öteki sekmeden devam et ya da oyunu buraya al.') + '</p><button type="button" class="gbtn altin buyuk">' + (tur === 'yeni' ? 'Burada oyna' : 'Oyunu buraya al') + '</button><small>' + (tur === 'yeni' ? 'Ya da bu sekmeyi kapat.' : 'Sayfa yeniden yüklenir.') + '</small></div>';
    perde.querySelector('button').addEventListener('click', () => { if (tur === 'yeni') { if (kanal) kanal.postMessage({ t: 'devral', kim }); perde.remove(); perde = null; engel = false; } else location.reload(); });
    app.appendChild(perde); perde.querySelector('button').focus(); if (EO2.audio && EO2.audio.duraklat && tur === 'eski') EO2.audio.duraklat(true); }
  const kim = Math.random().toString(36).slice(2) + Date.now().toString(36); let kanal = null;
  try { if (window.BroadcastChannel) { kanal = new BroadcastChannel('eo2-sekme');
    kanal.onmessage = e => { const m = e.data || {}; if (m.kim === kim) return;
      if (m.t === 'merhaba') { if (!engel) kanal.postMessage({ t: 'buradayim', kim, kime: m.kim }); }
      else if (m.t === 'buradayim' && m.kime === kim) { if (!perde) sekmePerde('yeni'); }
      else if (m.t === 'devral') sekmePerde('eski'); };
    kanal.postMessage({ t: 'merhaba', kim }); } } catch (_) { kanal = null; }
  /* yedek ağ: kanal yoksa ya da kaçırıldıysa, başka sekmenin yazdığı kayıt görülünce bu sekme durur */
  addEventListener('storage', e => { if (!e.key || e.key !== anahtar() || !G.live || engel || !e.newValue) return; sekmePerde('eski'); });

  /* ================= SORUN BİLDİR =================
     Oyuncunun yazdığı metin, sürüm, sahne ve bellekteki hata günlüğü (EO2.hatalar, js/saglam.js) sunucuya gider (/api/report).
     Kayıt, altın ya da kişisel veri gönderilmez. Bağlantı yoksa metin panoya kopyalanabilsin diye pencerede kalır. */
  async function sorunBildir() {
    const durum = { gitti: false };
    await G.pen({ k: 'Yardım', t: 'Sorun bildir', body: '<div class="sorun"><p>Ne oldu, ne bekliyordun? Kısaca yaz. Bildirimle birlikte oyunun sürümü, bulunduğun yer ve hata günlüğü gider; kaydın ve altının gitmez.</p>' +
      '<textarea class="sorun-metin" maxlength="2000" rows="6" placeholder="Örnek: Ahırda besle düğmesine bastım, yem azaldı ama ejderha yemedi."></textarea><p class="sorun-durum" role="status" aria-live="polite"></p></div>',
      on(p) { const m = p.querySelector('.sorun-metin'); setTimeout(() => m && m.focus(), 60); m.addEventListener('keydown', e => e.stopPropagation()); m.addEventListener('keyup', e => e.stopPropagation()); },
      btns: [{ t: 'Vazgeç', v: false }, { t: 'Gönder', cls: 'altin', fn(p, done) {
        if (durum.gitti) return true; const m = p.querySelector('.sorun-metin'), d = p.querySelector('.sorun-durum'), metin = m.value.trim();
        if (metin.length < 5) { d.textContent = 'Birkaç sözcük yazar mısın?'; m.focus(); return false; }
        if (durum.yolda) return false; durum.yolda = true; d.textContent = 'Gönderiliyor…';
        const A = EO2.api, govde = { metin, surum: EO2.surum || '', sahne: A ? A.scene() : '', ekran: innerWidth + 'x' + innerHeight + '@' + (devicePixelRatio || 1), hafta: typeof S !== 'undefined' && S ? (S.seasonNo || 1) + '/' + S.week : '', tarayici: navigator.userAgent, hatalar: (EO2.hatalar || []).slice(-30) };
        fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(govde) })
          .then(r => r.json().catch(() => ({})).then(j => ({ r, j })))
          .then(({ r, j }) => { durum.yolda = false; if (r.ok && j.ok) { durum.gitti = true; done(true); toast('Bildirimin ulaştı. Teşekkürler.'); } else d.textContent = r.status === 429 ? 'Kısa sürede çok bildirim gönderdin. Biraz sonra yeniden dene.' : 'Gönderilemedi. Biraz sonra yeniden dene.'; })
          .catch(() => { durum.yolda = false; d.textContent = 'Bağlantı yok; bildirim gönderilemedi. Metnin burada duruyor.'; });
        return false; } }] });
  }

  /* ================= MENÜ ================= */
  G.screen('menu', { k: 'Ocak ve kayıt', t: 'Menü', cls: 'mn', bg: 'bg-title', draw(body) { const A = EO2.api, se = seasonOf(), gel = app.classList.contains('gelistirici'), dokun = matchMedia('(pointer: coarse)').matches, yedek = yedekOku();
    const oyuncu = [['devam', 'Oyuna dön', 'Kaldığın yerden sürdür'], ['ayarlar', 'Ayarlar', 'Ses, görüntü, arayüz boyu'], ['nasil', 'Nasıl oynanır', 'Hafta, emir, bakım ve arena'], ['sorun', 'Sorun bildir', 'Bir hata mı gördün? Bize yaz']].concat(dokun ? [] : [['gizle', 'Arayüzü gizle', 'Ekran görüntüsü için (H)']]).concat([['cik', 'Ana ekrana dön', 'Oyun kaydedilir']]);
    /* geliştirici araçları yalnız ?gelistirici ile menüye girer */
    const arac = gel ? [['isik', 'Işık', 'Gündüz ya da akşam (L)'], ['kamera', 'Kamera', 'Yakın ya da yüksek açı (C)'], ['meydan', 'Dünya çizimi', (EO2.meydanUslup === 'cizim' ? 'Şimdi çizim · çizgi dünyaya dön' : 'Şimdi çizgi · çizim dünyasına geç')], ['pilot', 'Pilot Meydan', 'Deneme haritası'], ['master', 'Master Meydan', 'Master referanstan kurulan sahne'], ['deneme', 'Deneme alanı', 'Motor ve perspektif denemesi'], ['editor', 'Sahne editörü', 'Bölümün nesnelerini taşı, kaydet']] : [];
    const liste = oyuncu.slice(0, -1).concat(arac, oyuncu.slice(-1));
    body.innerHTML = '<div class="menu-sol">' + liste.map((m, i) => '<button type="button" class="menu-d' + (m[0] === 'cik' ? ' cik' : '') + '" data-m="' + m[0] + '" style="animation-delay:' + (i * 0.05) + 's"><b>' + m[1] + '</b><span>' + m[2] + '</span></button>').join('') + '</div>' +
      '<div class="menu-sag"><img alt="Ejder Ocağı" src="assets/logo.webp"><div class="menu-kayit"><span class="ust">Kayıtlı ocak</span>' +
        '<button type="button" class="mk-ad" data-k="ad" title="Adını değiştir"><b>' + esc(G.ad()) + '</b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>' +
        '<b>Hafta ' + S.week + ' / ' + SEASON + ' · ' + se.ad + '</b><div class="cubuk"><i style="width:' + (S.week / SEASON * 100) + '%"></i></div><p>' + S.dragons.length + ' ejderha · ' + S.gold + ' altın · ' + S.un + ' ün' + (S.seasonNo > 1 ? ' · ' + S.seasonNo + '. sezon' : '') + '</p>' +
        '<p class="soluk">Kayıt bu tarayıcıda durur ve hesabına yedeklenir' + (S.updatedAt ? '; son yazım ' + zaman(S.updatedAt) : '') + '. Yedek için dosyaya aktar.</p>' +
        '<div class="mk-islem"><button type="button" class="gbtn kucuk" data-k="aktar">Dosyaya aktar</button><button type="button" class="gbtn kucuk" data-k="yukle">Dosyadan yükle</button></div>' + (EO2.hesap ? EO2.hesap.menu() : '') +
        '<div class="mk-alt">' + (yedek ? '<button type="button" class="mk-bag" data-k="geri">Önceki ocağı geri al</button>' : '<span></span>') + '<button type="button" class="mk-bag sil" data-k="sil">Kaydı sil</button></div></div></div>';
    on(body, '[data-m]', async b => { const m = b.dataset.m;
      if (m === 'devam') G.close(); else if (m === 'ayarlar') G.open('ayarlar');
      else if (m === 'kamera' && A) { A.setCam(A.S.camMode === 'yakin' ? 'yuksek' : 'yakin'); G.close(); } else if (m === 'isik' && A) { A.setNight(A.S.nightT ? 0 : 1); G.close(); } else if (m === 'meydan' && EO2.meydanSec) { EO2.meydanSec(EO2.meydanUslup === 'cizim' ? 'duz' : 'cizim'); saveGame(); location.reload(); } else if (m === 'pilot' && A) { G.close(); A.go('pilot'); } else if (m === 'master' && A) { G.close(); A.go('master'); } else if (m === 'deneme' && A) { G.close(); A.go('deneme'); } else if (m === 'editor' && A) { G.close(); setTimeout(() => EO2.bolum && EO2.bolum.editorAc(), 60); } else if (m === 'gizle' && A) { G.close(); A.setHud(false); }
      else if (m === 'sorun') await sorunBildir();
      else if (m === 'nasil') await G.pen({ k: 'Kılavuz', t: 'Nasıl oynanır', wide: true, body: '<div class="kilavuz"><p><b>Hafta.</b> Her ejderhaya bir emir ver (antrenman, dinlenme, gezinti), sonra <b>Haftayı Bitir</b>. Emirler hafta sonunda işlenir; yirmi hafta bir sezondur.</p><p><b>Bakım.</b> Besle, yıka, top oyna, konuş. Bağ ve moral yükseldikçe antrenman verimi ve arenadaki direnç artar.</p><p><b>Arena.</b> Dövüş ün ve altın kazandırır. Ün yükseldikçe yeni ligler, Bahar Kupası ve Kızıl Taç açılır.</p><p><b>Ocak.</b> Araziyi aç, yapı kur: kuluçka yumurtayı çatlatır, in yer açar, yuva çiftleştirir.</p><p><b>Han.</b> Haftada bir akşamı biriyle geçir; yakınlık ayrıcalık açar. Bilge Ejder dil öğretir.</p><p><b>Pazar ve sefer.</b> Yem, yumurta, kuşam ve ejderha alınıp satılır; seferlerde yaban ejderhası yakalanır.</p></div>', btns: (EO2.rehber ? [{ t: 'İpuçlarını yeniden göster', v: 'ipucu' }] : []).concat([{ t: 'Anladım', cls: 'altin' }]) }).then(v => { if (v === 'ipucu' && EO2.rehber) { EO2.rehber.sifirla(); G.close(); EO2.rehber.basla(false); toast('İpuçları yeniden açıldı.'); } });
      else if (m === 'cik') { saveGame(); G.close(); G.title(); } });
    on(body, '[data-h]', b => { if (EO2.hesap) EO2.hesap.tikla(b.dataset.h); });
    on(body, '[data-k]', b => { const k = b.dataset.k; if (k === 'ad') G.adSor(); else if (k === 'aktar') aktar(); else if (k === 'yukle') yukle(); else if (k === 'geri') geriAl(); else if (k === 'sil') sil(); });
  } });

})();
