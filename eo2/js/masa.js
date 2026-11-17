/* Ejder Ocağı 2.0 · Kıraathane: oyuncuya karşı masa (EO2.masa)
   Sunucu tarafı: server/kiraathane_pvp.js (ortak oda altyapısının "kiraathane" türü) ve takas hizmeti (bahis emaneti).
   Oyunlar: Ejder Pokeri (beş zar) ve Kor 21 (kart). Zarı ve kartı sunucu dağıtır, eli sunucu sayar, bahsi sunucu aktarır; bu dosya yalnız gösterir ve isteği yollar.
   Bahis yalnız KAZANILMIŞ mal ve altındır: masada açılan takasın tepsilerine konur; "Bahsi kilitle" denince oyun bitene dek
   kimse tepsiye dokunamaz. Kazanan kendi bahsini korur ve kaybedeninkini alır; berabere kalınırsa bahisler iade edilir.

   Masaya üç yoldan oturulur: özel masa kur (kodu ver ya da meydandaki oyuncu kartından çağır), kodla katıl, rakip ara. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag, OR = EO2 && EO2.ortak, TK = EO2 && EO2.takas;
  if (!G || !AG || !OR || !TK) return;
  const M = { oyun: 'poker', hata: '', odeme: null, tut: [false, false, false, false, false], cagri: null, davetAcik: false, takasIstendi: 0 };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const OYUN = { poker: { ad: 'Ejder Pokeri', kural: 'Beş zar, üç atış. Tuttuğun zar yerinde kalır; eli iyi olan kazanır. Zarları sunucu atar.', kisa: 'Beş zar, üç atış.' },
    kor21: { ad: 'Kor 21', kural: 'Yirmi bire en yakın el kazanır; yirmi biri geçen yanar. As 1 ya da 11, resimli kartlar 10 sayılır. Kartları sunucu dağıtır.', kisa: 'Yirmi bire en yakın el kazanır.' } };
  const TAKIM = { '♠': '♠︎', '♥': '♥︎', '♦': '♦︎', '♣': '♣︎' };
  const kart = (c, gizli) => gizli ? '<i class="kr-kart arka" style="animation:none"></i>' : '<i class="kr-kart ' + (c.s === '♥' || c.s === '♦' ? 'kizil' : '') + '" style="animation:none"><b>' + c.r + '</b><em>' + TAKIM[c.s] + '</em><span>' + TAKIM[c.s] + '</span></i>';
  /* elin değeri (kural sunucudadır; bu yalnız oyuncuya kendi elini göstermek için aynı hesabı yapar) */
  const deger = el => { let t = 0, a = 0; for (const c of el) { if (c.r === 'A') { a++; t += 11; } else if (c.r === 'J' || c.r === 'Q' || c.r === 'K') t += 10; else t += +c.r; } while (t > 21 && a > 0) { t -= 10; a--; } return t; };
  const EL = ['Yüksek zar', 'Tek per', 'Döper', 'Üçlü', 'Kent', 'Ful', 'Kare', 'Ejderha Eli'];
  const HATA = { tur_bilinmiyor: 'Masa şu an açık değil.', zaten_odada: 'Zaten bir masadasın.', oda_yok: 'Bu kodla bir masa yok.', oda_mesgul: 'O masada oyun sürüyor.', oda_dolu: 'Masa dolu.', yalniz_kurucu: 'Oyunu masayı kuran başlatır.', hazir_degil: 'Rakibin hazır değil.', oyuncu_eksik: 'Karşına biri oturmadan oyun başlamaz.', cevrimdisi: 'O terbiyeci çevrimiçi değil.',
    bahis_uyusmuyor: 'İkiniz aynı bahsi kilitlemelisiniz; yeniden deneyin.', takas_uygun_degil: 'Bahis tepsisi geçerli değil; tepsiler yeniden açılıyor.', takas_suresi_az: 'Bahis tepsisinin süresi azaldı; tepsiler yeniden açılıyor.', once_zar_at: 'Önce zar at.', elin_acik: 'Elin açık; rakibini bekle.', baglanti_yok: 'Sunucuya ulaşılamıyor.', faz_uygun_degil: 'Şu an yapılamaz.' };
  const NOKTA = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const zar = (v, cls, ek) => '<' + (ek ? 'button type="button" ' + ek : 'i') + ' class="kr-zar ' + (cls || '') + '" aria-label="' + (v || 'atılmadı') + '">' + (v ? Array.from({ length: 9 }, (_, i) => '<s' + (NOKTA[v].includes(i) ? ' class="d"' : '') + '></s>').join('') : '') + '</' + (ek ? 'button' : 'i') + '>';
  const D = () => OR.durum(), ben = () => D().ben, oda = () => D().oda, ortak = () => D().ortak;
  const rakip = () => { const o = oda(); return o ? o.uyeler.find(u => u.id !== ben()) || null : null; };
  const benim = () => { const o = oda(); return o && o.tur === 'kiraathane'; };
  const ciz = () => { if (G.ekran() === 'masa') G.redraw(); };
  const takas = () => { const t = TK.durum().trade, r = rakip(); return t && r && t.status === 'active' && t.participants.includes(r.id) ? t : null; };

  /* ortada gerçekten bahis var mı: tepsiler boşsa oyun çayınadır (kilitli takas açık olsa da) */
  const bosTepsi = o => !o || (!(o.gold > 0) && !['items', 'dragons', 'eggs'].some(k => (o[k] || []).length) && !Object.values(o.food || {}).some(n => n > 0));
  const bahisli = d => { if (!d || !d.takas) return false; const t = takas(), r = rakip(); return !(t && r && bosTepsi(t.offers[ben()]) && bosTepsi(t.offers[r.id])); };
  /* bahis fazı başlayınca masayı kuran takası açar; karşı taraf kendiliğinden kabul eder (js/takas.js masa kipi) */
  function bahisHazirla() { const o = oda(), d = ortak(), r = rakip(); if (!benim() || !d || d.faz !== 'bahis' || !r) return; TK.masaKipi(r.id, ciz);
    if (takas() || o.kurucu !== ben() || Date.now() - M.takasIstendi < 6000) return; M.takasIstendi = Date.now();
    TK.komut('invite', { targetId: r.id }).then(ok => { if (!ok) { M.hata = 'Bahis tepsisi açılamadı (' + (TK.durum().hata || 'takas') + '). Bahissiz oynayabilirsiniz.'; ciz(); } }); }
  OR.dinle((olay, v) => { if (olay === 'hata') { M.hata = HATA[v.kod] || 'İşlem yapılamadı.'; if (v.kod === 'takas_uygun_degil' || v.kod === 'takas_suresi_az') { const t = takas(); if (t) TK.komut('cancel', { tradeId: t.id }).then(() => { M.takasIstendi = 0; bahisHazirla(); }); } return ciz(); }
    if (olay === 'davet') return davetGeldi(v);
    if (!benim() && olay !== 'ayrildi') return;
    if (olay === 'oda' && M.cagri && v.durum === 'bekliyor' && v.uyeler.length === 1) { const c = M.cagri; M.cagri = null; OR.davet(c.h); G.toast('Davetin ' + esc_(c.ad || 'terbiyeciye') + ' gitti.'); }
    if (olay === 'basladi') { M.hata = ''; M.odeme = null; M.tut = [false, false, false, false, false]; M.takasIstendi = 0; if (G.live && G.ekran() !== 'masa') G.open('masa'); bahisHazirla(); if (EO2.audio && EO2.audio.chime) EO2.audio.chime(); }
    if (olay === 'olay') { const d = v.durum; if (d.faz === 'bahis') bahisHazirla(); if (v.olaylar.some(x => x.t === 'atti' || x.t === 'sure' || x.t === 'cekti' || x.t === 'durdu') && EO2.audio && EO2.audio.pop) EO2.audio.pop(); if (d.oyuncu[ben()] && d.oyuncu[ben()].atis === 0) M.tut = [false, false, false, false, false]; }
    if (olay === 'ayrildi') { TK.masaKipi(null); M.odeme = null; }
    if (olay === 'bitti') { TK.masaKipi(null); const k = v.sonuc.kazananId; if (EO2.audio) (k === ben() ? EO2.audio.win : EO2.audio.pop) && (k === ben() ? EO2.audio.win() : EO2.audio.pop()); }
    ciz(); });
  AG.dinle('masa_odeme', m => { M.odeme = m; AG.yenile().catch(() => { }); TK.tazele(); if (EO2.ocakDefteri) EO2.ocakDefteri.esle(); ciz(); });

  /* ---------- davet ---------- */
  async function davetGeldi(v) { if (!v || v.tur !== 'kiraathane' || M.davetAcik || !G.live || oda()) return; M.davetAcik = true;
    const ad = (EO2.meydanAg && EO2.meydanAg.adOf(v.from)) || v.ad || 'Bir terbiyeci';
    const k = await G.pen({ k: 'Kıraathane', t: 'Masaya davet', body: '<p><b>' + esc_(ad) + '</b> seni ' + (OYUN[v.anahtar] || OYUN.poker).ad + ' masasına çağırıyor.</p><p>' + (OYUN[v.anahtar] || OYUN.poker).kisa + ' Bahsi masada birlikte koyarsınız; bahissiz de oynanır.</p>', btns: [{ t: 'Şimdi değil', v: false }, { t: 'Masaya otur', cls: 'altin', v: true }] });
    M.davetAcik = false; if (k && OR.katil(v.kod)) G.open('masa'); }
  function cagir(h, ad) { if (!AG.cevrimici()) { G.toast('Sunucuya ulaşılamıyor.'); return; } const o = oda();
    if (o && benim() && o.durum !== 'oyunda') { OR.davet(h); G.toast('Davetin ' + esc_(ad || 'terbiyeciye') + ' gitti.'); } else if (o) { G.toast('Önce bulunduğun masadan kalk.'); } else { M.cagri = { h, ad }; OR.kur('kiraathane', M.oyun, { ozel: true }); }
    if (G.live) G.open('masa'); }

  /* ---------- ekran parçaları ---------- */
  function lobi() { const k = D().kuyruk;
    return '<div class="ms-lobi"><div class="ms-kart"><div class="zn-zorluk ms-oyunlar" role="group" aria-label="Oyun">' + Object.keys(OYUN).map(o => '<button type="button" class="gbtn kucuk" data-oyun="' + o + '" aria-pressed="' + (M.oyun === o) + '" ' + (k ? 'disabled' : '') + '>' + OYUN[o].ad + '</button>').join('') + '</div><h2>' + OYUN[M.oyun].ad + '</h2><p>' + OYUN[M.oyun].kural + '</p><p class="soluk">Bahis yalnız kazanılmış mal ve altınla, masada birlikte konur. Bahissiz (çayına) da oynanır.</p></div>' +
      '<div class="ms-secenek"><button type="button" class="gbtn altin buyuk" data-ms="kur">Masa kur<small>listede görünür; kodla da oturulur</small></button>' +
      (k ? '<button type="button" class="gbtn buyuk" data-ms="kuyruk-cik">Aramayı bırak<small>rakip aranıyor…</small></button>' : '<button type="button" class="gbtn buyuk" data-ms="kuyruk">Rakip ara<small>masaya oturan ilk terbiyeciyle</small></button>') +
      '<form class="ms-kod" data-ms-form="1"><label for="msKod">Masa kodu</label><div><input id="msKod" name="kod" maxlength="8" placeholder="ORT-ABCD" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>' + OR.listeHtml('kiraathane', a => (OYUN[a] || OYUN.poker).ad, 'Açık masalar', 'Şu an açık masa yok. Sen kurarsan burada görünür.') + '</div></div>'; }
  function koltuklar(o) { return '<div class="ms-koltuklar">' + [0, 1].map(i => { const u = o.uyeler[i]; return '<div class="ms-koltuk' + (u ? (u.hazir || u.id === o.kurucu ? ' hazir' : '') : ' bos') + '"><small>' + (i ? 'Kızıl minder' : 'Mavi minder') + '</small><b>' + (u ? esc_(u.id === ben() ? 'Sen' : u.ad) : 'Boş') + '</b><em>' + (!u ? 'Rakip bekleniyor' : u.id === o.kurucu ? 'Masayı kurdu' : u.hazir ? 'Hazır' : 'Hazır değil') + (u && !u.bagli ? ' · bağlantısı koptu' : '') + '</em></div>'; }).join('') + '</div>'; }
  function bekleme(o) { const kurucu = o.kurucu === ben(), r = rakip(), bn = o.uyeler.find(u => u.id === ben()) || {};
    return '<div class="ms-bekle"><div class="ms-kodluk"><small>' + (OYUN[o.anahtar] || OYUN.poker).ad + ' · masa kodu</small><b>' + esc_(o.kod) + '</b></div>' + koltuklar(o) +
      '<div class="ms-eylem"><button type="button" class="gbtn" data-ms="cik">Masadan kalk</button>' + (kurucu ? '<button type="button" class="gbtn altin buyuk" data-ms="baslat" ' + (r && r.hazir ? '' : 'disabled') + '>Oyuna başla</button>' : '<button type="button" class="gbtn altin buyuk" data-ms="hazir">' + (bn.hazir ? 'Hazır değilim' : 'Hazırım') + '</button>') + '</div></div>'; }
  function bahis(o, d) { const t = takas(), r = rakip(), me = ben(), kilitBen = d.kilit[me] !== undefined, kilitO = r && d.kilit[r.id] !== undefined;
    if (!t) return '<div class="ms-bahis tek"><p class="ms-not">' + (M.hata ? esc_(M.hata) : 'Bahis tepsileri açılıyor…') + '</p><div class="ms-eylem"><button type="button" class="gbtn" data-ms="cik">Masadan kalk</button><button type="button" class="gbtn altin buyuk" data-ms="kilit-bos" ' + (kilitBen ? 'disabled' : '') + '>' + (kilitBen ? 'Rakip bekleniyor' : 'Bahissiz oyna') + '</button></div></div>';
    const benimT = t.offers[me] || { gold: 0, items: [], dragons: [], eggs: [] }, tepside = new Set([...benimT.items, ...benimT.dragons, ...benimT.eggs]), mallar = TK.mallar(), kazan = ((TK.durum().eko || {}).funds || {}).earned || 0;
    return '<div class="ms-bahis"><div class="tk-mal"><h3>Bahse koyabileceklerin</h3><div class="tk-izgara kay">' + (mallar.length ? mallar.map(m => '<button type="button" class="tk-esb' + (tepside.has(m.id) ? ' secili' : '') + '" data-koy="' + esc_(m.id) + '" data-alan="' + m.alan + '" ' + (kilitBen ? 'disabled' : '') + '>' + TK.kart(m.mal, m.id) + '</button>').join('') : '<p class="tk-bos">Kazanılmış malın yok. Altın koyabilir ya da bahissiz oynayabilirsin.</p>') + '</div>' +
      '<form class="tk-altin" data-altin="1"><label for="msAltin"><img alt="" src="assets/ik/para.webp">Altın koy <small>kazanılmış: ' + kazan + '</small></label><div><input id="msAltin" name="altin" type="number" inputmode="numeric" min="0" max="' + kazan + '" step="1" value="' + (benimT.gold || 0) + '" ' + (kilitBen ? 'disabled' : '') + '><button type="submit" class="gbtn kucuk" ' + (kilitBen ? 'disabled' : '') + '>Koy</button></div></form></div>' +
      '<div class="tk-orta">' + TK.tepsi(me, true, kilitBen ? 'Kilitledi' : 'Kilit bekliyor', kilitBen) + '<i class="tk-ok" aria-hidden="true"></i>' + TK.tepsi(r.id, false, kilitO ? 'Kilitledi' : 'Kilit bekliyor', kilitO) +
      '<p class="tk-durum" role="status" aria-live="polite">' + (M.hata ? '<span class="kotu">' + esc_(M.hata) + '</span>' : kilitBen ? 'Bahsini kilitledin. ' + esc_(r.ad) + ' da kilitleyince ' + (d.oyun === 'kor21' ? 'kartlar dağıtılır.' : 'zarlar atılır.') : 'Tepsine bahsini koy, sonra kilitle. Kilitlenince oyun bitene dek tepsiler değişmez.') + '</p>' +
      '<div class="tk-eylem"><button type="button" class="gbtn" data-ms="cik">Masadan kalk</button>' + (kilitBen ? '<button type="button" class="gbtn" data-ms="coz">Kilidi çöz</button>' : '<button type="button" class="gbtn altin buyuk" data-ms="kilit">Bahsi kilitle</button>') + '</div></div></div>'; }
  /* Kor 21: rakibin kartları oyun bitene dek kapalıdır (kaç kart çektiği görünür) */
  function oyun21(o, d) { const me = ben(), r = rakip(), b = d.oyuncu[me], k = r && d.oyuncu[r.id], bitti = d.faz === 'bitti', son = d.son, kazandi = bitti && son.kazanan === me, berabere = bitti && son.kazanan == null, od = M.odeme, bd = deger(b.el);
    const odYazi = !bitti ? '' : !od ? 'Bahis işleniyor…' : !od.bahis ? 'Çayına oynandı; ortada bahis yoktu.' : od.odendi ? (kazandi ? 'Rakibinin bahsi hesabına geçti.' : 'Bahsin rakibine geçti.') : od.neden === 'berabere' ? 'Berabere: bahisler sahiplerine döndü.' : 'Bahis aktarılamadı; tepsiler sahiplerine döndü.';
    const elYazi = id => { const e = son && son.eller[id]; return !e ? '' : e.yandi ? 'Yandı (' + e.deger + ')' : e.deger === 21 ? 'Yirmi bir' : String(e.deger); };
    const sira = (id, z, benimMi) => '<div class="ms-el' + (benimMi ? ' ben' : ' rakip') + (bitti && son.kazanan === id ? ' kazanan' : '') + '"><div class="ms-el-ad"><b>' + (benimMi ? 'Sen' : esc_(r ? r.ad : 'Rakip')) + '</b><small>' + (bitti ? elYazi(id) : z.acik ? (benimMi && bd > 21 ? 'Yandın' : benimMi && bd === 21 ? 'Yirmi bir' : 'Durdu') : benimMi ? 'Elin ' + bd : z.el.length + ' kart') + '</small></div><div class="ms-zarlar kr-kartlar">' +
      z.el.map(c => kart(c, !benimMi && !bitti)).join('') + (benimMi || bitti ? '<span class="kr-sayi">' + (bitti ? son.eller[id].deger : bd) + '</span>' : '<span class="kr-sayi">?</span>') + '</div></div>';
    return '<div class="ms-oyun ms-21">' + (k ? sira(r.id, k, false) : '') + '<div class="ms-orta">' + (bitti ? '<div class="ms-sonuc ' + (kazandi ? 'iyi' : berabere ? '' : 'kotu') + '"><b>' + (kazandi ? 'Kazandın' : berabere ? 'Berabere' : 'Kaybettin') + '</b><small>' + odYazi + '</small></div>'
        : '<p class="ms-not">' + (M.hata ? '<span class="kotu">' + esc_(M.hata) + '</span>' : b.acik ? (bd > 21 ? 'Yandın. Rakibin de yanarsa berabere.' : 'Durdun. Rakibin oynuyor.') : 'Kart çek ya da dur. Yirmi biri geçersen yanarsın.') + (bahisli(d) ? ' <small>Bahis kilitli.</small>' : ' <small>Çayına.</small>') + '</p>') + '</div>' + sira(me, b, true) +
      '<div class="ms-eylem">' + (bitti ? '<button type="button" class="gbtn" data-ms="cik">Masadan kalk</button>' + (o.kurucu === me ? '<button type="button" class="gbtn altin buyuk" data-ms="baslat" ' + (r && r.hazir ? '' : 'disabled') + '>Rövanş<small>' + (r && r.hazir ? 'rakibin hazır' : 'rakibin hazır olmalı') + '</small></button>' : '<button type="button" class="gbtn altin buyuk" data-ms="hazir">' + ((o.uyeler.find(u => u.id === me) || {}).hazir ? 'Rövanşa hazırsın' : 'Rövanşa hazırım') + '</button>')
        : '<button type="button" class="gbtn kucuk" data-ms="cik">Masadan kalk</button><button type="button" class="gbtn" data-ms="dur" ' + (b.acik ? 'disabled' : '') + '>Dur<small>' + bd + ' ile kal</small></button><button type="button" class="gbtn altin buyuk" data-ms="cek" ' + (b.acik ? 'disabled' : '') + '>Kart çek</button>') + '</div></div>'; }
  function oyun(o, d) { if (d.oyun === 'kor21') return oyun21(o, d); const me = ben(), r = rakip(), b = d.oyuncu[me], k = r && d.oyuncu[r.id], bitti = d.faz === 'bitti', son = d.son;
    const el = id => son && son.eller[id] ? EL[son.eller[id].rank] : '', kazandi = bitti && son.kazanan === me, berabere = bitti && son.kazanan == null, od = M.odeme;
    const odYazi = !bitti ? '' : !od ? 'Bahis işleniyor…' : !od.bahis ? 'Çayına oynandı; ortada bahis yoktu.' : od.odendi ? (kazandi ? 'Rakibinin bahsi hesabına geçti.' : 'Bahsin rakibine geçti.') : od.neden === 'berabere' ? 'Berabere: bahisler sahiplerine döndü.' : 'Bahis aktarılamadı; tepsiler sahiplerine döndü.';
    const sira = (id, z, benimMi) => '<div class="ms-el' + (benimMi ? ' ben' : ' rakip') + (bitti && son.kazanan === id ? ' kazanan' : '') + '"><div class="ms-el-ad"><b>' + (benimMi ? 'Sen' : esc_(r ? r.ad : 'Rakip')) + '</b><small>' + (bitti ? el(id) : z.acik ? 'Elini açtı' : z.atis ? z.atis + '. atış' : 'Zar bekliyor') + '</small></div><div class="ms-zarlar">' +
      z.zar.map((v, i) => benimMi && !bitti && !z.acik && z.atis > 0 ? zar(v, M.tut[i] ? 'tutuldu' : '', 'data-tut="' + i + '" aria-pressed="' + M.tut[i] + '"') : zar(v, (benimMi ? '' : 'rk ') + (bitti || z.acik ? '' : ''))).join('') + '</div></div>';
    return '<div class="ms-oyun">' + (k ? sira(r.id, k, false) : '') + '<div class="ms-orta">' + (bitti ? '<div class="ms-sonuc ' + (kazandi ? 'iyi' : berabere ? '' : 'kotu') + '"><b>' + (kazandi ? 'Kazandın' : berabere ? 'Berabere' : 'Kaybettin') + '</b><small>' + odYazi + '</small></div>'
        : '<p class="ms-not">' + (M.hata ? '<span class="kotu">' + esc_(M.hata) + '</span>' : b.acik ? 'Elin açık. Rakibin oynuyor.' : b.atis ? 'Tutmak istediğin zarlara dokun, kalanları yeniden at ya da elini aç.' : 'Zarları at.') + (bahisli(d) ? ' <small>Bahis kilitli.</small>' : ' <small>Çayına.</small>') + '</p>') + '</div>' + sira(me, b, true) +
      '<div class="ms-eylem">' + (bitti ? '<button type="button" class="gbtn" data-ms="cik">Masadan kalk</button>' + (o.kurucu === me ? '<button type="button" class="gbtn altin buyuk" data-ms="baslat" ' + (r && r.hazir ? '' : 'disabled') + '>Rövanş<small>' + (r && r.hazir ? 'rakibin hazır' : 'rakibin hazır olmalı') + '</small></button>' : '<button type="button" class="gbtn altin buyuk" data-ms="hazir">' + ((o.uyeler.find(u => u.id === me) || {}).hazir ? 'Rövanşa hazırsın' : 'Rövanşa hazırım') + '</button>')
        : '<button type="button" class="gbtn kucuk" data-ms="cik">Masadan kalk</button><button type="button" class="gbtn" data-ms="ac" ' + (b.atis > 0 && !b.acik ? '' : 'disabled') + '>Elini aç</button><button type="button" class="gbtn altin buyuk" data-ms="at" ' + (b.acik ? 'disabled' : '') + '>' + (b.atis ? 'Kalanları at' : 'Zarları at') + '<small>' + Math.min(3, b.atis + 1) + '. atış / 3</small></button>') + '</div></div>'; }

  G.screen('masa', { k: 'Kıraathane', t: 'Oyuncu masası', cls: 'ms kr2', bg: 'a:kiraathane', enter() { M.hata = ''; if (AG.cevrimici()) AG.gonder({ type: 'ortak_durum' }); }, draw(body) {
    if (!AG.cevrimici()) { body.innerHTML = '<div class="ar-kilit bos"><p>Oyuncu masası çevrimiçi oynanır. Sunucuya ulaşılınca açılır.</p></div>'; return; }
    const o = benim() ? oda() : null, d = ortak(), kodda = document.activeElement && document.activeElement.id === 'msKod';   /* ekran yenilenirken yazılan masa kodu ve imleç korunur */
    body.innerHTML = '<div class="ms-kok">' + (!o ? lobi() + (M.hata ? '<p class="ms-hata" role="alert">' + esc_(M.hata) + '</p>' : '') : (o.durum === 'bekliyor' || !d) ? bekleme(o) + (M.hata ? '<p class="ms-hata" role="alert">' + esc_(M.hata) + '</p>' : '') : d.faz === 'bahis' ? bahis(o, d) : oyun(o, d)) + '</div>';
    const t = takas(), me = ben();
    const yeniTeklif = degis => { if (!t) return; const bt = t.offers[me] || {}, y = { gold: bt.gold || 0, items: [...(bt.items || [])], dragons: [...(bt.dragons || [])], eggs: [...(bt.eggs || [])], food: Object.assign({}, bt.food || {}) }; degis(y); M.hata = ''; TK.komut('offer', { tradeId: t.id, revision: t.revision, offer: y }).then(ok => { if (!ok) M.hata = TK.durum().hata; ciz(); }); };
    body.querySelectorAll('[data-koy]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.koy, alan = b.dataset.alan; yeniTeklif(y => { const i = y[alan].indexOf(id); if (i >= 0) y[alan].splice(i, 1); else y[alan].push(id); }); }));
    body.querySelectorAll('[data-cikar]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.cikar; yeniTeklif(y => { for (const a of ['items', 'dragons', 'eggs']) { const i = y[a].indexOf(id); if (i >= 0) y[a].splice(i, 1); } }); }));
    const fa = body.querySelector('[data-altin]'); if (fa) { const gir = fa.elements.altin; for (const ad of ['keydown', 'keyup', 'keypress']) gir.addEventListener(ad, e => e.stopPropagation()); fa.addEventListener('submit', e => { e.preventDefault(); const n = Math.max(0, Math.floor(+gir.value || 0)); yeniTeklif(y => { y.gold = n; }); }); }
    const fk = body.querySelector('[data-ms-form]'); if (fk) { const gir = fk.elements.kod; gir.value = M.kod || ''; gir.addEventListener('input', () => { M.kod = gir.value; }); if (kodda) { gir.focus(); try { gir.setSelectionRange(gir.value.length, gir.value.length); } catch (_) { } } for (const ad of ['keydown', 'keyup', 'keypress']) gir.addEventListener(ad, e => e.stopPropagation()); fk.addEventListener('submit', e => { e.preventDefault(); const kod = (gir.value || '').trim(); M.hata = kod ? '' : 'Masa kodunu yaz.'; if (kod) { OR.katil(kod); M.kod = ''; } ciz(); }); }
    body.querySelectorAll('[data-oyun]').forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); M.oyun = OYUN[b.dataset.oyun] ? b.dataset.oyun : 'poker'; ciz(); }));
    body.querySelectorAll('[data-tut]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.tut; M.tut[i] = !M.tut[i]; if (EO2.audio) EO2.audio.ui(); ciz(); }));
    OR.listeBagla(body);
    body.querySelectorAll('[data-ms]').forEach(b => b.addEventListener('click', async () => { if (EO2.audio) EO2.audio.ui(); const k = b.dataset.ms; M.hata = '';
      if (k === 'kur') OR.kur('kiraathane', M.oyun, { ozel: false }); else if (k === 'kuyruk') OR.kuyruk('kiraathane', M.oyun); else if (k === 'kuyruk-cik') OR.kuyrukCik();
      else if (k === 'hazir') { const u = oda().uyeler.find(x => x.id === ben()); OR.hazir(!(u && u.hazir)); } else if (k === 'baslat') OR.baslat();
      else if (k === 'kilit') OR.eylem({ t: 'kilit', takas: t ? t.id : '' }); else if (k === 'kilit-bos') OR.eylem({ t: 'kilit', takas: '' }); else if (k === 'coz') OR.eylem({ t: 'coz' });
      else if (k === 'at') { OR.eylem({ t: 'at', tut: M.tut.slice() }); } else if (k === 'ac') OR.eylem({ t: 'ac' }); else if (k === 'cek') OR.eylem({ t: 'cek' }); else if (k === 'dur') OR.eylem({ t: 'dur' });
      else if (k === 'cik') { const d2 = ortak(), oyunda = oda() && oda().durum === 'oyunda' && d2 && d2.faz === 'oyun';
        const v = !oyunda || await G.pen({ k: 'Kıraathane', t: 'Masadan kalkılsın mı?', body: '<p>Oyun sürerken kalkarsan <b>kaybetmiş sayılırsın</b>' + (bahisli(d2) ? ' ve bahsin rakibine geçer' : '') + '.</p>', btns: [{ t: 'Masada kal', v: false }, { t: 'Kalk', cls: 'kor', v: true }] });
        if (v) { const tt = takas(), d3 = ortak(); if (tt && d3 && d3.faz === 'bahis') TK.komut('cancel', { tradeId: tt.id }); OR.cik(); } }
      ciz(); }));
  } });
  /* Kıraathane salonundan giriş: salonun notuna "Oyuncu masası" düğmesi eklenir */
  setInterval(() => { const n = document.querySelector('#scrB.kr2 .kr-salon-not'); if (n && !n.querySelector('[data-oyuncu-masa]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gbtn kucuk altin'; b.dataset.oyuncuMasa = '1'; b.textContent = 'Oyuncuya karşı masa'; b.addEventListener('click', () => G.open('masa')); n.appendChild(document.createTextNode(' ')); n.appendChild(b); } }, 700);
  EO2.masa = { cagir, durum: () => M, oyunlar: () => Object.keys(OYUN) };
})();
