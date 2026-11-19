/* Ejder Ocağı 2.0 · Kıraathane: han masaları (Kor 21, Kervan Tavlası, Ejder Pokeri) ve bahis tepsisi
   Kurallar, rakibin oyunu ve olasılıklar oyunun kendi dosyasıdır (js/kiraathane.js: bj*, tv*, pk*); burada yalnız çağrılır ve çizilir.
   Bahis: iki tarafın ortaya koyduğu şeyler masada durur (tepsi). Oyuncu kesesinden, kilerinden, sandığından dilediğini koyar;
   rakip değeri denk bir karşılık koyar. js/kiraathane.js içindeki kanca (KIR.tepsi = { yeter, ode }) bahsi buraya yönlendirir.
   Rakip bir "bağlantı"dır (bkz. yerelRakip): yerel NPC ile ileride uzak oyuncu aynı tepsiyi ve aynı akışı kullanır. Ağ kodu yoktur. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  if (typeof KIR === 'undefined' || typeof bjStart !== 'function') return;
  const ses = k => { const a = EO2.audio; if (a && a[k]) a[k](); };
  const temiz = s => String(s == null ? '' : s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{265F}\u{2670}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sec = a => a[Math.floor(Math.random() * a.length)];
  const ALTIN = '<i class="kr-altin"></i>';

  /* ---------- masalar ve rakipler ---------- */
  const OYUN = {
    blackjack: { ad: 'Kor 21', basla: 'Eli dağıt', kural: 'Yirmi bire en yakın el kazanır. As 1 ya da 11, resimli kartlar 10 sayılır.',
      rakip: { k: 'ozan', ad: 'Gezgin Ozan', kisa: 'Ozan', handle: '@gezgin_ozan', unvan: 'Kor 21 masası',
        otur: ['Otur bakalım. Deste taze, çay demli.', 'Hoş geldin terbiyeci. Kartlar bugün türkü söylüyor.'], agir: ['Ooo, masaya bunu mu koyuyorsun? Elim titredi.', 'Bunun türküsü yazılır. Kaybedersen ben yazarım.'],
        yendi: ['Bunu bir türküye bağlarım, adını da anarım.', 'Kartlar ozanı sever, darılma.'], yenildi: ['Helal olsun. Sazımı rehin bırakmadığıma şükür.', 'Şans bugün senin omzunda.'], berabere: ['Ne sen ne ben. Bir el daha?'], cay: ['Çayına oynayan dost kazanır.'] } },
    tavla: { ad: 'Kervan Tavlası', basla: 'Tahtayı kur', kural: 'On iki hane, altışar pul. Düşeş dört hamle verir, tek pul kırılır; rakibi hiç pul toplatmadan yenersen mars, iki kat.',
      rakip: { k: 'muhtar', ad: 'Muhtar', kisa: 'Muhtar', handle: '@muhtar', unvan: 'Tavla masası',
        otur: ['Gel evladım. Bu tahtada kırk yıllık zar sesi var.', 'Pullar dizili. Zar tutmak yok, ona göre.'], agir: ['Bunu ortaya koyan ya çok usta ya çok cesur.', 'Deden görse kulağını çekerdi. Ama bahis bahistir.'],
        yendi: ['Tecrübe evladım, tecrübe.', 'Pulları toplarken acele etmeyeceksin.'], yenildi: ['Zar senden yanaydı. Bir dahakine görüşürüz.', 'İyi oynadın. Köye anlatırım.'], berabere: ['Olur böyle.'], cay: ['Çaylar ocaktan, sohbet bizden.'] } },
    poker: { ad: 'Ejder Pokeri', basla: 'Zarları savur', kural: 'Beş zar, üç atış. Tuttuğun zar yerinde kalır. Beşi bir gelirse Ejderha Eli: iki kat.',
      rakip: { k: 'tuccar', ad: 'Rüstem', kisa: 'Rüstem', handle: '@rustem', unvan: 'Ejderha tüccarı · zar masası',
        otur: ['Zar da maldır terbiyeci. Ucuza almam.', 'Buyur. Benim masamda herkes bir şey bırakır.'], agir: ['İşte şimdi konuşuyoruz. Karşılığını sayıyorum.', 'Gözüm üstünde. Kaybedersen ben iyi bakarım.'],
        yendi: ['Alışveriş tamam. Yine beklerim.', 'Zar tüccarı tanır.'], yenildi: ['Kesem hafifledi. Bunu unutmam.', 'Bugün senin günün. Yarın benim.'], berabere: ['Kimse kimseye borçlu değil.'], cay: ['Parasız oyunun da tadı ayrı.'] } },
  };
  const kisiImg = k => 'assets/ext/npc-' + k + '.webp';

  /* ---------- taş, cevher, kalıp: fiyatlar js/chibi.js içindeki basePrice değerleridir (o dosya 2.0'da yüklenmez; yüklüyse oradan okunur).
     2.0'da bu mallar S.topcu.ganimet defterinde durur (eo2/js/topcu.js odulYaz); chibi sistemi yüklüyse C.stones / C.ores kullanılır. ---------- */
  const TAS0 = { kor_t1: ['Kıvılcım Kor Taşı', 'stone_kor_t1', 45], kor_t2: ['Harlı Kor Taşı', 'stone_kor_t2', 140], kor_t3: ['Kadim Magma Taşı', 'stone_kor_t3', 380], anka_koruma: ['Anka Mühür Taşı', 'stone_anka_koruma', 950],
    obsidiyen: ['Obsidiyen Cevheri', 'ore_obsidiyen', 110], kehribar: ['Donmuş Kehribar', 'ore_kehribar', 110], mercan: ['Derin Mercan Taşı', 'ore_mercan', 110], yildirim: ['Yıldırım Kuvarsı', 'ore_yildirim', 130],
    sahmeran_kalip: ['Şahmeran Sırça Kalıbı', 'shard_sahmeran', 480], kalgarot_kalip: ['Kalgarot Kor Kalıbı', 'shard_kalgarot', 520], kiyamet_ozu: ['Kıyamet Özü', 'essence_kiyamet', 900] };
  const CEVHER = ['obsidiyen', 'kehribar', 'mercan', 'yildirim'];
  const chibiVar = () => typeof CHIBI_STONES !== 'undefined' && typeof ensureChibi === 'function';
  function tasKap(k) { if (chibiVar()) { const C = ensureChibi(); if (CHIBI_STONES[k]) return C.stones = C.stones || {}; if (typeof CHIBI_ORES !== 'undefined' && CHIBI_ORES[k]) return C.ores = C.ores || {}; return null; }
    S.topcu = S.topcu || {}; return S.topcu.ganimet = S.topcu.ganimet || {}; }
  const tasSay = k => { const o = tasKap(k); return o ? (o[k] || 0) : 0; };
  const tasEkle = (k, n) => { const o = tasKap(k); if (o) o[k] = Math.max(0, (o[k] || 0) + n); };
  const tasFiyat = k => { if (typeof CHIBI_STONES !== 'undefined' && CHIBI_STONES[k]) return CHIBI_STONES[k].basePrice; if (typeof CHIBI_ORES !== 'undefined' && CHIBI_ORES[k]) return CHIBI_ORES[k].basePrice; return TAS0[k] ? TAS0[k][2] : 0; };

  /* ---------- tepsi girdisi: { t, k | id, n, veri } ----------
     t: altin | yem | tas (sayılır; n adet) · yumurta | ejder | kusam | sus (tek parça; id ile bulunur).
     veri: karşı tarafın koyduğu tek parçanın kendisi (uzak oyuncu için; yerel rakip yalnız sayılır mal koyar). */
  const SAYILIR = { altin: 1, yem: 1, tas: 1 };
  const anahtar = e => e.t + ':' + (e.k != null ? e.k : e.id != null ? e.id : '');
  const yumEl = e => (typeof expEl === 'function' && e.genes && expEl(e.genes.el)) || 'ates';
  function bilgi(e) {
    if (e.t === 'altin') return { ad: 'Altın', alt: '', img: '', deger: 1, var: S.gold || 0 };
    if (e.t === 'yem') { const F = FOODS[e.k] || {}; return { ad: F.ad || e.k, alt: 'Yem ve iksir', img: OLD + 'img/' + (e.k === 'genclik' ? 'ic-feed' : 'food-' + e.k) + '.webp', deger: F.fiyat || 0, var: (S.food && S.food[e.k]) || 0 }; }
    if (e.t === 'tas') { const T = TAS0[e.k] || [e.k, 'stone_kor_t1', 0]; return { ad: T[0], alt: CEVHER.includes(e.k) ? 'Cevher' : 'Taş', img: OLD + 'img/ui/items/' + T[1] + '.webp', deger: tasFiyat(e.k), var: tasSay(e.k) }; }
    if (e.t === 'yumurta') { const y = e.veri || (S.eggs || []).find(x => x.id === e.id); if (!y) return { ad: 'Yumurta', alt: '', img: G.yumurtaResim(null), deger: 0, var: 0 };
      return { ad: EL_AD[yumEl(y)] + ' yumurtası', alt: y.origin || 'Yumurta', img: G.yumurtaResim(y), deger: Math.round(lotValue({ kind: 'egg', egg: y })), var: 1, nesne: y }; }
    if (e.t === 'ejder') { const d = e.veri || byId(e.id); if (!d) return { ad: 'Ejderha', alt: '', img: '', deger: 0, var: 0 };
      return { ad: d.name, alt: EL_AD[d.el] + ' · ' + STAGE_AD[d.stage], img: G.img(d), deger: value(d), var: 1, nesne: d }; }
    if (e.t === 'kusam') { const x = e.veri || (S.inv || []).find(i => i.uid === e.id), it = x && ITEMS[x.id]; if (!it) return { ad: 'Kuşam', alt: '', img: '', deger: 0, var: 0 };
      return { ad: it.ad, alt: (G.SLOT_AD && G.SLOT_AD[it.slot]) || 'Kuşam', img: OLD + 'img/item-' + x.id + '.webp', deger: it.fiyat, var: 1, nesne: x }; }
    if (e.t === 'sus') { const c = COSMETICS[e.id]; if (!c) return { ad: 'Süs', alt: '', img: '', deger: 0, var: 0 };
      return { ad: c.ad, alt: 'Süs', img: OLD + 'img/ui/cos-' + e.id + '.webp', deger: c.fiyat, var: e.veri || (S.cosOwned || []).includes(e.id) ? 1 : 0 }; }
    return { ad: '?', alt: '', img: '', deger: 0, var: 0 };
  }
  const toplam = L => L.reduce((a, e) => a + bilgi(e).deger * (e.n || 1), 0);
  /* masaya konamayanlar: neden bir cümleyle döner */
  function engel(e, tepsi) {
    if (e.t === 'ejder') { const d = byId(e.id); if (!d) return 'Bu ejderha artık ocakta değil.';
      const masada = (tepsi || []).filter(x => x.t === 'ejder' && x.id !== e.id).length;
      if (S.dragons.length - masada <= 1) return 'Son ejderhan masaya konmaz: ocak ejderhasız kalamaz.';
      if (d.eternalYouth) return d.name + ' senin Topçu yoldaşın; hikâye için kilitli, masaya konmaz.';
      if (S.tour && S.tour.dragon === d.id && !S.tour.done) return d.name + ' turnuvaya yazılı; turnuva bitmeden masaya konmaz.';
      if (d.task) return d.name + ' şu an görevde; emri bitmeden masaya getirilemez.';
      if (d.inj) return d.name + ' yaralı; iyileşmeden masaya getirilemez.';
      return ''; }
    if (e.t === 'yumurta') { const y = (S.eggs || []).find(x => x.id === e.id); if (!y) return 'Bu yumurta artık yuvada değil.'; if (y.special) return 'Dedenin yumurtası hikâyenin parçası; masaya konmaz.'; return ''; }
    if (e.t === 'kusam') { const x = (S.inv || []).find(i => i.uid === e.id); if (!x) return 'Bu kuşam artık sandıkta değil.'; const it = ITEMS[x.id] || {};
      if (x.heirloomId || it.heirloom) return 'Ata Yadigârı aile mirasıdır; masaya konmaz.'; const w = typeof equippedBy === 'function' && equippedBy(x.uid); if (w) return w.name + ' bunu kuşanıyor; önce Ahır\'da çıkar.'; return ''; }
    if (e.t === 'sus') { const c = COSMETICS[e.id], w = c && S.dragons.find(d => d.cos && d.cos[c.slot] === e.id); if (w) return w.name + ' bunu takıyor; önce Süs Dolabı\'nda çıkar.'; return ''; }
    return '';
  }
  /* ===== yerel kayda (S) yazan iki fonksiyon: al (kayıptan çıkar) ve ver (kazanılanı ekle). Sunucu otoritesinde bu ikisi komuta dönüşür. ===== */
  function al(e, n) {
    if (e.t === 'altin') S.gold = Math.max(0, S.gold - n);
    else if (e.t === 'yem') S.food[e.k] = Math.max(0, (S.food[e.k] || 0) - n);
    else if (e.t === 'tas') tasEkle(e.k, -n);
    else if (e.t === 'yumurta') S.eggs = S.eggs.filter(x => x.id !== e.id);
    else if (e.t === 'ejder') { const d = byId(e.id); if (!d) return; for (const s in d.equip) d.equip[s] = null; if (typeof linReg === 'function') linReg(d); S.dragons = S.dragons.filter(x => x !== d); if (S.star === d.id) S.star = S.dragons[0] ? S.dragons[0].id : null; if (UI.sel === d.id) UI.sel = null; chron(d.name + ' kıraathane masasında kaybedildi.'); }
    else if (e.t === 'kusam') S.inv = S.inv.filter(i => i.uid !== e.id);
    else if (e.t === 'sus') { const c = COSMETICS[e.id]; S.cosOwned = (S.cosOwned || []).filter(x => x !== e.id); if (c) S.dragons.forEach(d => { if (d.cos && d.cos[c.slot] === e.id) d.cos[c.slot] = null; }); }
  }
  function ver(e, n) {
    if (e.t === 'altin') S.gold = (S.gold || 0) + n;
    else if (e.t === 'yem') S.food[e.k] = (S.food[e.k] || 0) + n;
    else if (e.t === 'tas') tasEkle(e.k, n);
    else if (!e.veri) return;
    else if (e.t === 'yumurta') S.eggs.push(Object.assign({}, e.veri, { id: 'e' + S.uid++, inK: kuluckaFree() > 0 }));
    else if (e.t === 'ejder') { const d = Object.assign({}, e.veri, { id: S.nid++, task: null }); S.dragons.push(d); if (typeof linReg === 'function') linReg(d); chron(d.name + ' kıraathane masasında kazanıldı.'); }
    else if (e.t === 'kusam') S.inv.push({ uid: S.uid++, id: e.veri.id });
    else if (e.t === 'sus') { S.cosOwned = S.cosOwned || []; if (!S.cosOwned.includes(e.id)) S.cosOwned.push(e.id); }
  }

  /* ---------- rakip bağlantısı ----------
     Masa rakibi şu arayüzle tanır; uzak oyuncu aynı dört işi ağ üzerinden yapar (EO2.ag.gonder / EO2.ag.dinle):
       kimlik            { ad, kisa, handle, unvan, img }
       karsilik(benim)   benim tepsime karşı koyduğu girdiler (uzakta: karşı oyuncunun kendi tepsisi, 'kr_tepsi' iletisi)
       onay()            Promise<boolean>: tepsiyi kabul etti mi (yerelde hemen evet; uzakta 'kr_onay' iletisi beklenir)
       soz(olay)         otur | agir | yendi | yenildi | berabere | cay için bir replik (uzakta boş; oyuncu kendi yazar) */
  function yerelRakip(oyun) { const R = OYUN[oyun].rakip;
    return { tur: 'yerel', kimlik: { ad: R.ad, kisa: R.kisa, handle: R.handle, unvan: R.unvan, img: kisiImg(R.k) },
      /* Karşılık kuralı: sayılır mal (altın, yem, taş, cevher) aynı maldan aynı adetle; tek parça (ejderha, yumurta, kuşam, süs) değeri kadar altınla. */
      karsilik(benim) { const L = []; let altin = 0; for (const e of benim) { if (e.t === 'altin') altin += e.n; else if (SAYILIR[e.t]) L.push({ t: e.t, k: e.k, n: e.n }); else altin += bilgi(e).deger; } if (altin > 0) L.unshift({ t: 'altin', n: Math.round(altin) }); return L; },
      onay() { return Promise.resolve(true); },
      soz(olay) { return R[olay] ? sec(R[olay]) : ''; } }; }

  /* ---------- masa durumu ---------- */
  const K = { oyun: null, faz: 'salon', ben: [], rakip: [], bag: null, sekme: 'kese', son: null, gir: true, jest: false, ipucu: '' };
  const gor = { bj: null, bjBen: 0, bjRakip: 0, bjAcik: false, pk: null, pkAtis: 0, pkTut: [], tvZar: '', tvPul: '' };
  const elde = () => K.faz === 'oyun';
  const hepsiSayilir = () => K.ben.every(e => SAYILIR[e.t]);
  const tekParca = () => K.ben.filter(e => e.t === 'ejder' || e.t === 'yumurta');
  function rakipGuncelle() { K.rakip = K.bag ? K.bag.karsilik(K.ben) : []; }

  /* js/kiraathane.js kancası. Çarpan (çiftleme, mars, Ejderha Eli = 2) yalnız tepsinin tamamı sayılır malsa uygulanır:
     tek parça bir varlık ikiye katlanamaz, o yüzden masada ejderha, yumurta, kuşam ya da süs varken el tek kat oynanır. */
  const kanca = {
    yeter(mult) { if (mult > 1 && !hepsiSayilir()) return false; return K.ben.every(e => !engel(e, K.ben) && bilgi(e).var >= (e.n || 1) * mult); },
    ode(res, mult) { const kat = hepsiSayilir() ? mult : 1, son = K.son = { res, kat, aldim: [], verdim: [], dostluk: 0, deger: 0 }; let txt = '';
      const kayit = (L, e, n) => { const b = bilgi(e); L.push({ t: e.t, ad: b.ad, img: b.img, n, deger: b.deger * n }); son.deger += b.deger * n; };
      if (!K.ben.length) { if (typeof addPeerAff === 'function') addPeerAff(K.bag.kimlik.handle, 5); son.dostluk = 5; txt = '+5 dostluk'; }
      else if (res === 'push') txt = 'bahis iade';
      else if (res === 'win') { for (const e of K.rakip) { const n = (e.n || 1) * kat; kayit(son.aldim, e, n); ver(e, n); } txt = '+' + fmt(son.deger) + ' altın değerinde'; }
      else { for (const e of K.ben) { const n = Math.min(bilgi(e).var, (e.n || 1) * kat); if (n <= 0) continue; kayit(son.verdim, e, n); al(e, n); } txt = '-' + fmt(son.deger) + ' altın değerinde'; }
      if (res === 'win') { S.un = (S.un || 0) + 1; ses('win'); } else if (res === 'lose') ses('pop');
      if (typeof saveGame === 'function') saveGame();
      return txt; },
  };

  /* rakibin bekleyen hamlesi: js/kiraathane.js zamanlayıcıları buradan geçer, böylece dokunuşla atlanabilir (davranış aynı, yalnız bekleme kısalır) */
  let bekleyen = [];
  window.kirLater = function (fn, ms) { const o = { fn }; o.t = setTimeout(() => { bekleyen = bekleyen.filter(x => x !== o); fn(); }, window.__fastFx ? 10 : ms); KIR.timers.push(o.t); bekleyen.push(o); return o.t; };
  window.kirClearTimers = function () { bekleyen = []; KIR.timers.forEach(clearTimeout); KIR.timers = []; };
  function atla() { const b = bekleyen; if (!b.length) return false; bekleyen = []; b.forEach(o => clearTimeout(o.t)); b.forEach(o => o.fn()); return true; }

  /* ---------- konuşma balonları ---------- */
  let balonT = {};
  function soyle(kim, metin) { const el = document.querySelector('.kr-balon.' + kim); K['balon_' + kim] = metin || ''; clearTimeout(balonT[kim]);
    if (el) { el.textContent = metin || ''; el.hidden = !metin; if (metin) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; } }
    if (metin) balonT[kim] = setTimeout(() => soyle(kim, ''), 5200); }
  const rakipSoz = olay => { const t = K.bag && K.bag.soz(olay); if (t) soyle('rakip', t); };

  /* ---------- tepsi işlemleri ---------- */
  function koy(e) { const neden = engel(e, K.ben); if (neden) { toast(neden); ses('pop'); return false; }
    const b = bilgi(e), var_ = K.ben.find(x => anahtar(x) === anahtar(e));
    if (SAYILIR[e.t]) { const adim = e.n || 1, simdi = var_ ? var_.n : 0; if (b.var < simdi + adim) { toast(e.t === 'altin' ? 'Kesende o kadar altın yok.' : 'Elinde bu kadar ' + b.ad + ' yok.'); return false; }
      if (var_) var_.n += adim; else { if (K.ben.length >= 8) { toast('Tepsi doldu: en çok sekiz çeşit konur.'); return false; } K.ben.push({ t: e.t, k: e.k, n: adim }); } }
    else { if (var_) return false; if (b.var < 1) return false; if (K.ben.length >= 8) { toast('Tepsi doldu: en çok sekiz çeşit konur.'); return false; } K.ben.push({ t: e.t, id: e.id });
      if (e.t === 'ejder' || e.t === 'yumurta') rakipSoz('agir'); }
    rakipGuncelle(); ses('ui'); return true; }
  function cikar(i) { const e = K.ben[i]; if (!e) return; if (SAYILIR[e.t]) { e.n -= e.t === 'altin' ? Math.min(e.n, 50) : 1; if (e.n <= 0) K.ben.splice(i, 1); } else K.ben.splice(i, 1); rakipGuncelle(); ses('ui'); }
  /* eski dört bahis: çayına · 50 altın · 1 cevher (en çok olanından) · 2 Kıvılcım Kor Taşı */
  const HAZIR = { cay: { ad: 'Çayına', L: () => [] }, altin: { ad: '50 altın', L: () => [{ t: 'altin', n: 50 }] },
    cevher: { ad: '1 cevher', L: () => { const k = CEVHER.slice().sort((a, b) => tasSay(b) - tasSay(a))[0]; return [{ t: 'tas', k, n: 1 }]; } }, tas: { ad: '2 kor taşı', L: () => [{ t: 'tas', k: 'kor_t1', n: 2 }] } };
  function hazir(k) { const L = HAZIR[k].L(); for (const e of L) if (bilgi(e).var < e.n) { toast(e.t === 'altin' ? 'Kesende 50 altın yok.' : 'Elinde yeterince ' + bilgi(e).ad + ' yok.'); ses('pop'); return; }
    K.ben = L; rakipGuncelle(); if (!L.length) rakipSoz('cay'); ses('ui'); }
  /* tepsideki girdilerden artık elde olmayanları ayıkla (rövanş öncesi) */
  function ayikla() { const once = JSON.stringify(K.ben); K.ben = K.ben.filter(e => { const b = bilgi(e); if (engel(e, K.ben)) return false; if (SAYILIR[e.t]) { e.n = Math.min(e.n, b.var); return e.n > 0; } return b.var > 0; }); rakipGuncelle(); return once === JSON.stringify(K.ben); }

  /* ---------- akış ---------- */
  function sahne() { const s = document.getElementById('scr'); if (s) s.style.setProperty('--sahne', 'url("' + G.bgUrl(K.faz === 'salon' ? 'a:kiraathane' : 'bg-table') + '")'); }
  function otur(oyun) { K.oyun = oyun; K.faz = 'tepsi'; K.bag = yerelRakip(oyun); K.ben = []; K.son = null; K.gir = true; K.jest = false; kirResetGame(); KIR.tepsi = null; rakipGuncelle(); sahne(); render(); setTimeout(() => rakipSoz('otur'), 350); }
  function kalk() { if (elde()) { toast('Önce oynadığın eli bitir.'); return; } kirResetGame(); KIR.tepsi = null; K.oyun = null; K.faz = 'salon'; K.ben = []; K.son = null; sahne(); render(); }
  async function basla() { if (elde()) return;
    if (!ayikla()) { K.faz = 'tepsi'; toast('Tepsideki bazı şeyler artık sende değil; bahsi yeniden kur.'); render(); return; }
    const agir = tekParca();
    if (agir.length) { const ok = await G.pen({ k: 'Geri dönüşü yok', t: 'Ortaya koyuyor musun?', face: bilgi(agir[0]).img || null,
        body: agir.map(e => { const b = bilgi(e); return '<p><b>' + esc(ek(b.ad, 'acc')) + '</b> ortaya koyuyorsun; kaybedersen gider. <span class="kr-pen-deger">' + ALTIN + fmt(b.deger) + ' değerinde</span></p>'; }).join('') +
          '<p class="kr-pen-not">' + esc(K.bag.kimlik.kisa) + ' karşılığında ' + ALTIN + '<b>' + fmt(toplam(K.rakip)) + '</b> değerinde mal koyuyor. Masada tek parça varlık varken el tek kat oynanır: çiftleme, mars ve Ejderha Eli katlamaz.</p>',
        btns: [{ t: 'Vazgeç', v: false }, { t: 'Ortaya koy', cls: 'kor', v: true }] }); if (!ok) return; }
    if (!(await K.bag.onay())) { toast(esc(K.bag.kimlik.kisa) + ' bu bahsi kabul etmedi.'); return; }
    KIR.tepsi = kanca; K.son = null; K.faz = 'oyun'; K.jest = false; kirClearTimers(); gor.bj = gor.pk = null; gor.tvZar = gor.tvPul = '';
    if (K.oyun === 'blackjack') { KIR.bj = null; bjStart(); if (!KIR.bj) { K.faz = 'tepsi'; render(); } }
    else if (K.oyun === 'tavla') { KIR.tv = tvNew(); ses('ui'); render(); }
    else { KIR.pk = pkNew(); gor.pkTut = []; pkRollAll(); render(); } }
  const bitti = () => K.oyun === 'blackjack' ? !!(KIR.bj && KIR.bj.done) : K.oyun === 'tavla' ? !!(KIR.tv && KIR.tv.winner) : !!(KIR.pk && KIR.pk.phase === 'done');
  const sonMetin = () => temiz(K.oyun === 'blackjack' ? KIR.bj.text : K.oyun === 'tavla' ? KIR.tv.text : KIR.pk.text).replace(/\s*\((?:[+-][^)]*|bahis iade)\)\s*$/, '').replace(K.son && K.son.kat > 1 ? /$^/ : /\s*\(2× (?:Ödül|Kayıp)\)/g, '');
  function sonucaGec() { K.faz = 'sonuc'; const r = K.son ? K.son.res : 'push';
    setTimeout(() => { rakipSoz(!K.ben.length ? 'cay' : r === 'win' ? 'yenildi' : r === 'lose' ? 'yendi' : 'berabere');
      const var_ = s => !!document.querySelector(s); if (!G.fx || K.faz !== 'sonuc' || !var_('.kr-sonuc')) return;
      if (r === 'win') { G.fx.stars('.kr-sonuc', 26); if (K.son.aldim.some(x => x.t === 'altin') && var_('.kr-tepsi.rakip') && var_('#scrGold')) G.fx.coins('.kr-tepsi.rakip', 9); } else if (r === 'lose') G.fx.shake(document.querySelector('.kr-cuha')); }, 60); }

  /* ---------- çizim parçaları ---------- */
  const TAKIM = { '♠': '♠︎', '♥': '♥︎', '♦': '♦︎', '♣': '♣︎' };
  const kart = (c, gizli, cls, gec) => gizli ? '<i class="kr-kart arka ' + (cls || '') + '" style="animation-delay:' + (gec || 0) + 's"></i>'
    : '<i class="kr-kart ' + (c.s === '♥' || c.s === '♦' ? 'kizil ' : '') + (cls || '') + '" style="animation-delay:' + (gec || 0) + 's"><b>' + c.r + '</b><em>' + TAKIM[c.s] + '</em><span>' + TAKIM[c.s] + '</span></i>';
  const NOKTA = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const zarIc = v => Array.from({ length: 9 }, (_, i) => '<s' + (NOKTA[v].includes(i) ? ' class="d"' : '') + '></s>').join('');
  const zar = (v, cls, gec) => '<i class="kr-zar ' + (cls || '') + '" style="animation-delay:' + (gec || 0) + 's" aria-label="' + v + '">' + zarIc(v) + '</i>';
  const resim = (b, t) => t === 'altin' ? '<i class="kr-kese"></i>' : b.img ? '<img alt="" src="' + b.img + '" draggable="false">' : '<i class="kr-kese"></i>';
  function tepsiHtml(kim, L, mini) { const ben = kim === 'ben', deger = toplam(L), ad = ben ? 'Senin tepsin' : esc(ek(K.bag.kimlik.kisa, 'gen')) + ' karşılığı';
    const ic = L.length ? L.map((e, i) => { const b = bilgi(e), ic2 = '<span class="kr-res">' + resim(b, e.t) + '</span>' + (SAYILIR[e.t] ? '<em>' + (e.t === 'altin' ? fmt(e.n) : '×' + e.n) + '</em>' : '') + (mini ? '' : '<b>' + esc(e.t === 'altin' ? 'Altın' : b.ad) + '</b>');
        return ben && !mini ? '<button type="button" class="kr-pay t-' + e.t + '" data-cikar="' + i + '" title="' + esc(b.ad) + ': geri al">' + ic2 + '</button>' : '<span class="kr-pay t-' + e.t + '" title="' + esc(b.ad) + '">' + ic2 + '</span>'; }).join('')
      : '<span class="kr-pay cay"><span class="kr-res"><img alt="" src="assets/ik/cay.webp"></span>' + (mini ? '' : '<b>Çayına</b>') + '</span>';
    return '<div class="kr-tepsi ' + kim + (mini ? ' mini' : '') + '"' + (ben && !mini ? ' id="krTepsi"' : '') + '><small>' + ad + '</small><div class="kr-tepsi-ic">' + ic + '</div><span class="kr-deger">' + (L.length ? ALTIN + '<b>' + fmt(deger) + '</b>' : 'dostluk') + '</span></div>'; }

  /* heybe: oyuncunun masaya koyabileceği her şey, türüne göre gözlerde */
  const SEKME = [['kese', 'Kese'], ['kiler', 'Kiler'], ['tas', 'Taş'], ['yuva', 'Yuva'], ['ahir', 'Ahır'], ['sandik', 'Sandık'], ['sus', 'Süs']];
  function heybeListe() { const L = [], tepside = e => { const x = K.ben.find(y => anahtar(y) === anahtar(e)); return x ? (x.n || 1) : 0; };
    const ekle = (s, e, adim) => { const b = bilgi(e), kalan = b.var - tepside(e); L.push({ s, e: SAYILIR[e.t] ? Object.assign({}, e, { n: adim || 1 }) : e, b, kalan, neden: SAYILIR[e.t] ? '' : engel(e, K.ben), adim: adim || 1 }); };
    [10, 50, 100, 500].forEach(n => ekle('kese', { t: 'altin' }, n));
    Object.keys(FOODS).forEach(k => { if ((S.food[k] || 0) > 0) ekle('kiler', { t: 'yem', k }); });
    Object.keys(TAS0).forEach(k => { if (tasSay(k) > 0) ekle('tas', { t: 'tas', k }); });
    (S.eggs || []).forEach(y => ekle('yuva', { t: 'yumurta', id: y.id }));
    (S.dragons || []).forEach(d => ekle('ahir', { t: 'ejder', id: d.id }));
    (S.inv || []).forEach(x => ekle('sandik', { t: 'kusam', id: x.uid }));
    (S.cosOwned || []).forEach(id => ekle('sus', { t: 'sus', id }));
    return L; }
  let heybeL = [];
  function heybeHtml() { heybeL = heybeListe(); const dolu = SEKME.filter(s => heybeL.some(x => x.s === s[0])); if (!dolu.some(s => s[0] === K.sekme)) K.sekme = 'kese';
    return '<div class="kr-heybe"><div class="kr-hy-sekme" role="tablist">' + dolu.map(s => '<button type="button" role="tab" data-sekme="' + s[0] + '" aria-selected="' + (s[0] === K.sekme) + '">' + s[1] + '</button>').join('') + '</div>' +
      '<div class="kr-hy-serit" id="krSerit">' + heybeL.map((x, i) => { if (x.s !== K.sekme) return ''; const altin = x.e.t === 'altin', yok = !!SAYILIR[x.e.t] && x.kalan < x.adim, tepside = !SAYILIR[x.e.t] && x.kalan < 1;
        return '<button type="button" class="kr-esya t-' + x.e.t + (x.neden ? ' kilit' : '') + (yok && !x.neden ? ' yok' : '') + (tepside ? ' masada' : '') + '" data-koy="' + i + '" title="' + esc(x.neden || x.b.ad) + '"><span class="kr-res">' + resim(x.b, x.e.t) + '</span>' +
          '<b>' + (altin ? '+' + x.adim : esc(x.b.ad)) + '</b><small>' + (x.neden ? 'konamaz' : tepside ? 'masada' : altin ? 'altın' : ALTIN + fmt(x.b.deger)) + '</small>' + (SAYILIR[x.e.t] && !altin ? '<em>×' + Math.max(0, x.kalan) + '</em>' : '') + '</button>'; }).join('') + '</div></div>'; }

  /* ---------- üç oyunun masası ---------- */
  function bjHtml() { const B = KIR.bj; if (!B) return ''; if (gor.bj !== B) { gor.bj = B; gor.bjBen = gor.bjRakip = 0; gor.bjAcik = false; }
    const acik = B.reveal, cevir = acik && !gor.bjAcik && gor.bjRakip >= 2;
    const rk = B.opp.map((c, i) => kart(c, !acik && i === 1, i >= gor.bjRakip ? 'dagit' : (i === 1 && cevir ? 'cevir' : ''), i >= gor.bjRakip ? (i - gor.bjRakip) * 0.14 + (gor.bjRakip ? 0 : 0.07) : 0)).join('');
    const bn = B.me.map((c, i) => kart(c, false, i >= gor.bjBen ? 'dagit' : '', i >= gor.bjBen ? (i - gor.bjBen) * 0.14 : 0)).join('');
    gor.bjBen = B.me.length; gor.bjRakip = B.opp.length; gor.bjAcik = acik;
    return '<div class="kr-el rakip"><div class="kr-kartlar">' + rk + '</div><span class="kr-sayi">' + (acik ? bjVal(B.opp) : '?') + '</span></div>' + ortada(B.phase === 'opp' ? esc(K.bag.kimlik.kisa) + ' düşünüyor' : B.phase === 'player' ? 'Sıra sende' : '') +
      '<div class="kr-el ben"><div class="kr-kartlar">' + bn + '</div><span class="kr-sayi">' + bjVal(B.me) + (B.mult === 2 ? '<small>çiftlendi</small>' : '') + '</span></div>'; }
  function pkHtml() { const P = KIR.pk; if (!P) return ''; const yeni = gor.pk !== P || gor.pkAtis !== P.roll, tutulabilir = P.phase === 'play' && P.roll >= 1 && P.roll < 3;
    const sira = (side, ben) => side.d.map((v, i) => { const don = yeni && !(ben && gor.pkTut[i]), cls = (ben && side.hold[i] ? 'tutuldu ' : '') + (don ? 'at' : ''), ic = zarIc(v || 0);
      return ben && tutulabilir ? '<button type="button" class="kr-zar ' + cls + '" style="animation-delay:' + (i * 0.05) + 's" data-tut="' + i + '" aria-pressed="' + !!side.hold[i] + '" aria-label="' + v + (side.hold[i] ? ', tutuluyor' : '') + '">' + ic + '</button>' : '<i class="kr-zar ' + cls + '" style="animation-delay:' + (i * 0.05) + 's">' + ic + '</i>'; }).join('');
    gor.pk = P; gor.pkAtis = P.roll; gor.pkTut = [];
    const benE = P.me.d[0] ? pkEval(P.me.d) : null, rkE = P.phase === 'done' && P.opp.d[0] ? pkEval(P.opp.d) : null;
    return '<div class="kr-el rakip"><div class="kr-zarlar">' + sira(P.opp, false) + '</div><span class="kr-sayi yazi">' + (rkE ? temiz(rkE.name) : '') + '</span></div>' + ortada(P.phase === 'done' ? '' : 'Atış ' + P.roll + ' / 3' + (tutulabilir ? ' · tutacağın zarlara dokun' : '')) +
      '<div class="kr-el ben"><div class="kr-zarlar">' + sira(P.me, true) + '</div><span class="kr-sayi yazi">' + (benE ? temiz(benE.name) : '') + '</span></div>'; }
  function tvHtml() { const T = KIR.tv; if (!T) return ''; const hareket = T.turn === 'me' && T.phase === 'move' && !T.busy && !T.winner, all = hareket ? tvAllMoves(T, 'me') : [];
    const imza = JSON.stringify(T.pts.map(p => [p.o, p.n])), eski = gor.tvPul ? JSON.parse(gor.tvPul) : null, zarImza = T.turn + T.phase, zarYeni = T.dice.length > 0 && T.phase === 'move' && gor.tvZar !== zarImza;
    const hane = i => { const p = T.pts[i], hedef = T.sel && T.sel.targets.find(t => t.to === i), benim = hareket && T.bar.me === 0 && p.o === 'me' && p.n > 0 && all.some(m => m.from === i), secili = T.sel && T.sel.from === i;
      const kondu = eski && p.n > 0 && (p.n > eski[i][1] || eski[i][0] !== p.o);
      const pul = Array.from({ length: Math.min(p.n, 5) }, (_, j) => '<i class="kr-pul ' + p.o + (kondu && j === Math.min(p.n, 5) - 1 ? ' kon' : '') + '"></i>').join('') + (p.n > 5 ? '<em>' + p.n + '</em>' : '');
      const cls = 'kr-hane ' + (i < 6 ? 'ust' : 'alt') + (i % 2 ? ' koyu' : '') + (benim ? ' benim' : '') + (hedef ? ' hedef' + (hedef.hit ? ' kir' : '') : '') + (secili ? ' secili' : '');
      return hedef ? '<button type="button" class="' + cls + '" data-tv-to="' + i + '" aria-label="Hane ' + (i + 1) + ': buraya oyna">' + pul + '</button>' : benim ? '<button type="button" class="' + cls + '" data-tv-sel="' + i + '" aria-label="Hane ' + (i + 1) + ': pul seç">' + pul + '</button>' : '<div class="' + cls + '">' + pul + '</div>'; };
    gor.tvPul = imza; gor.tvZar = zarImza;
    const cikan = (s, n) => Array.from({ length: n }, () => '<i class="kr-pul ' + s + '"></i>').join(''), offHedef = T.sel && T.sel.targets.some(t => t.to === 'off'), barSec = hareket && T.bar.me > 0;
    return '<div class="kr-tavla"><div class="kr-kasa"><div class="kr-cikan rakip" title="' + esc(K.bag.kimlik.kisa) + ' topladı: ' + T.off.opp + ' / 6">' + cikan('opp', T.off.opp) + '<small>' + T.off.opp + '/6</small></div>' +
      (offHedef ? '<button type="button" class="kr-cikan ben hedef" data-tv-to="off" aria-label="Pulu topla">' + cikan('me', T.off.me) + '<small>Topla</small></button>' : '<div class="kr-cikan ben" title="Topladığın: ' + T.off.me + ' / 6">' + cikan('me', T.off.me) + '<small>' + T.off.me + '/6</small></div>') + '</div>' +
      '<div class="kr-tahta"><div class="kr-sira">' + [0, 1, 2, 3, 4, 5].map(hane).join('') + '</div>' +
      '<div class="kr-bar"><span class="kr-kirik rakip">' + cikan('opp', T.bar.opp) + '</span><span class="kr-zarlar">' + T.dice.map((d, i) => zar(d, (zarYeni ? 'at ' : '') + (T.phase === 'roll' ? 'eski ' : '') + (T.turn === 'opp' ? 'rk' : ''), i * 0.06)).join('') + '</span>' +
        (barSec ? '<button type="button" class="kr-kirik ben sec" data-tv-sel="bar" aria-label="Kırık pulunu oyuna sok">' + cikan('me', T.bar.me) + '</button>' : '<span class="kr-kirik ben">' + cikan('me', T.bar.me) + '</span>') + '</div>' +
      '<div class="kr-sira">' + [11, 10, 9, 8, 7, 6].map(hane).join('') + '</div></div></div>' +
      '<div class="kr-tv-alt">' + tepsiHtml('rakip', K.rakip, true) + '<p class="kr-durum">' + esc(temiz(T.text)) + (T.moves.length && T.turn === 'me' ? ' <small>Kalan zar: ' + T.moves.join(' · ') + '</small>' : '') + '</p>' + tepsiHtml('ben', K.ben, true) + '</div>'; }
  const ortada = durum => '<div class="kr-ortada">' + tepsiHtml('rakip', K.rakip, true) + '<p class="kr-durum">' + (durum || '') + '</p>' + tepsiHtml('ben', K.ben, true) + '</div>';

  function eylemHtml() { const b = (t, a, cls, off, sub) => '<button type="button" class="gbtn ' + (cls || '') + '" data-e="' + a + '"' + (off ? ' disabled' : '') + '>' + t + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
    if (K.faz === 'tepsi') return b('Masadan kalk', 'kalk') + b(OYUN[K.oyun].basla, 'basla', 'altin buyuk', false, K.ben.length ? fmt(toplam(K.ben)) + ' altın değerinde bahis' : 'çayına, dostluk için');
    if (K.faz === 'sonuc') return b('Masadan kalk', 'kalk') + b('Bahsi değiştir', 'tepsi') + b('Rövanş', 'basla', 'altin buyuk', false, K.ben.length ? 'aynı bahisle' : 'çayına');
    if (K.oyun === 'blackjack') { const B = KIR.bj, sira = B && B.phase === 'player'; return b('Kal', 'bj-kal', '', !sira) + b('Çiftle', 'bj-cift', 'kor', !(sira && B.me.length === 2 && kanca.yeter(2)), 'bahis iki kat, tek kart') + b('Kart çek', 'bj-cek', 'altin buyuk', !sira); }
    if (K.oyun === 'tavla') { const T = KIR.tv, at = T && T.turn === 'me' && T.phase === 'roll' && !T.winner, oyna = T && T.turn === 'me' && T.phase === 'move' && !T.busy && !T.winner; return b('Benim yerime oyna', 'tv-oto', '', !oyna) + b('Zarları at', 'tv-zar', 'altin buyuk', !at); }
    const P = KIR.pk; return b('Elini aç', 'pk-ac', '', !(P && P.phase === 'play')) + b(P && P.roll < 3 ? 'Kalanları at' : 'Zarları at', 'pk-at', 'altin buyuk', !(P && P.phase === 'play'), P ? (P.roll + 1) + '. atış' : ''); }
  function sonucHtml() { const s = K.son || { res: 'push', aldim: [], verdim: [], kat: 1 }, bas = { win: 'Kazandın', lose: 'Kaybettin', push: 'Berabere' }[s.res];
    const pay = L => L.map(x => '<span class="kr-pay t-' + x.t + '"><span class="kr-res">' + resim(x, x.t) + '</span>' + (SAYILIR[x.t] ? '<em>' + (x.t === 'altin' ? fmt(x.n) : '×' + x.n) + '</em>' : '') + '<b>' + esc(x.ad) + '</b></span>').join('');
    return '<div class="kr-sonuc ' + s.res + '"><small>' + esc(OYUN[K.oyun].ad) + (s.kat > 1 ? ' · iki kat' : '') + '</small><h2>' + bas + '</h2><p>' + esc(sonMetin()) + '</p>' +
      (s.aldim.length ? '<div class="kr-el-degisti al"><small>Kesene ve sandığına girdi</small><div>' + pay(s.aldim) + '</div></div>' : '') + (s.verdim.length ? '<div class="kr-el-degisti ver"><small>Masada kaldı</small><div>' + pay(s.verdim) + '</div></div>' : '') +
      (s.dostluk ? '<div class="kr-el-degisti al"><small>' + esc(K.bag.kimlik.kisa) + ' ile dostluk</small><div><span class="kr-pay cay"><span class="kr-res"><img alt="" src="assets/ik/cay.webp"></span><em>+' + s.dostluk + '</em></span></div></div>' : '') +
      (s.res === 'push' && K.ben.length ? '<div class="kr-el-degisti"><small>Bahisler sahiplerine döndü</small></div>' : '') + (s.res === 'win' ? '<span class="kr-un">+1 ün</span>' : '') + '</div>'; }

  function salonHtml() { const mini = { blackjack: '<i class="kr-kart mk kizil"><b>A</b><em>♥︎</em></i><i class="kr-kart mk"><b>K</b><em>♠︎</em></i><i class="kr-kart mk arka"></i>',
      tavla: '<span class="kr-mini-tahta">' + [1, 0, 1, 0, 1, 0].map((k, i) => '<i class="' + (k ? 'koyu' : '') + '">' + (i === 0 ? '<s class="kr-pul me"></s><s class="kr-pul me"></s>' : i === 5 ? '<s class="kr-pul opp"></s><s class="kr-pul opp"></s>' : i === 3 ? '<s class="kr-pul me"></s>' : '') + '</i>').join('') + '</span>',
      poker: zar(6, 'mz') + zar(6, 'mz') + zar(5, 'mz') };
    return '<div class="kr-salon"><p class="kr-salon-not">Kervansarayın kıraathanesi. Bir masaya otur; ortaya ne koyacağına masada karar verirsin.</p><div class="kr-masalar">' + Object.keys(OYUN).map((k, i) => { const O = OYUN[k], R = O.rakip;
      return '<button type="button" class="kr-masa-sec m' + i + '" data-masa="' + k + '" style="animation-delay:' + (i * 0.09) + 's"><span class="kr-ms-kisi"><img alt="" src="' + kisiImg(R.k) + '"></span><span class="kr-ms-masa"><span class="kr-ms-cuha">' + mini[k] + '</span></span>' +
        '<span class="kr-ms-ad"><b>' + O.ad + '</b><small>' + R.ad + ' bekliyor</small><em>' + O.kural + '</em></span></button>'; }).join('') + '</div></div>'; }

  function odaHtml() { const R = K.bag.kimlik, tepsi = K.faz === 'tepsi', gir = K.gir; K.gir = false;
    const cuha = tepsi ? tepsiHtml('rakip', K.rakip) + '<div class="kr-hazir"><small>Hazır bahis</small>' + Object.keys(HAZIR).map(k => '<button type="button" class="gbtn kucuk" data-hazir="' + k + '">' + HAZIR[k].ad + '</button>').join('') + '</div>' + tepsiHtml('ben', K.ben) + heybeHtml()
      : (K.oyun === 'blackjack' ? bjHtml() : K.oyun === 'tavla' ? tvHtml() : pkHtml()) + (K.faz === 'sonuc' ? sonucHtml() : '');
    return '<div class="kr-oda f-' + K.faz + ' o-' + K.oyun + '">' +
      '<div class="kr-rakip' + (gir ? ' gir' : '') + '"><img alt="" src="' + R.img + '"><div class="kr-plaka"><b>' + esc(R.ad) + '</b><small>' + esc(R.unvan) + '</small></div><div class="kr-balon rakip"' + (K.balon_rakip ? '' : ' hidden') + '>' + esc(K.balon_rakip || '') + '</div></div>' +
      '<div class="kr-cuha' + (gir ? ' gir' : '') + '"' + (K.faz === 'oyun' ? ' data-atla' : '') + '>' + cuha + '</div>' +
      '<div class="kr-alt"><div class="kr-ben"><canvas id="krYuz" width="96" height="96"></canvas><span><b>Sen</b><small>' + (K.oyun ? OYUN[K.oyun].ad : '') + '</small></span><div class="kr-balon ben"' + (K.balon_ben ? '' : ' hidden') + '>' + esc(K.balon_ben || '') + '</div>' +
        '<button type="button" class="gbtn kucuk kr-laf" data-e="jest" aria-expanded="' + K.jest + '">Laf at</button>' + (K.jest ? '<div class="kr-jestler">' + KIR_EMOTES.map((j, i) => '<button type="button" class="gbtn kucuk" data-jest="' + i + '">' + esc(j[1]) + '</button>').join('') + '</div>' : '') + '</div>' +
      '<div class="kr-eylem">' + eylemHtml() + '</div></div></div>'; }

  /* ---------- eylemler ---------- */
  const EYLEM = {
    kalk, basla, tepsi() { if (elde()) return; kirResetGame(); KIR.tepsi = null; K.faz = 'tepsi'; K.son = null; ayikla(); render(); },
    jest() { K.jest = !K.jest; render(); },
    'bj-cek': () => bjHit(), 'bj-kal': () => bjStand(), 'bj-cift': () => bjDouble(),
    'tv-zar': () => ACT['kir-tv-roll'](), 'tv-oto': () => tvAuto(),
    'pk-at'() { const P = KIR.pk; if (!P || P.phase !== 'play') return; gor.pkTut = P.me.hold.slice(); pkRollAll(); render(); }, 'pk-ac'() { gor.pkTut = [true, true, true, true, true]; pkOpen(); },
  };
  function bagla(body) { const on = (sel, fn) => body.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); fn(b, e); }));
    on('[data-masa]', b => { ses('ui'); otur(b.dataset.masa); });
    on('[data-e]', b => { ses('ui'); EYLEM[b.dataset.e](); });
    on('[data-hazir]', b => { hazir(b.dataset.hazir); render(); });
    on('[data-sekme]', b => { K.sekme = b.dataset.sekme; seritX = 0; ses('ui'); render(); });
    on('[data-cikar]', b => { cikar(+b.dataset.cikar); render(); });
    on('[data-koy]', b => { if (surukledi) return; const x = heybeL[+b.dataset.koy]; if (x && koy(x.e)) render(); });
    on('[data-jest]', b => { const i = +b.dataset.jest; K.jest = false; render(); soyle('ben', KIR_EMOTES[i][1]); ses('ui'); setTimeout(() => soyle('rakip', sec(KIR_REPLIES[i])), 900); });
    on('[data-tut]', b => { ACT['kir-pk-hold']({ dataset: { i: b.dataset.tut } }); });
    on('[data-tv-sel]', b => { ACT['kir-tv-sel']({ dataset: { p: b.dataset.tvSel } }); });
    on('[data-tv-to]', b => { ACT['kir-tv-to']({ dataset: { p: b.dataset.tvTo } }); });
    const c = body.querySelector('[data-atla]'); if (c) c.addEventListener('click', () => { c.classList.add('hizli'); atla(); });
    const cv = body.querySelector('#krYuz'); if (cv) { try { EO2.api.drawPortrait(cv, EO2.api.player.set, 0, true); } catch (e) { cv.hidden = true; } }
    const serit = body.querySelector('#krSerit'); if (serit) { serit.scrollLeft = seritX; serit.addEventListener('scroll', () => { seritX = serit.scrollLeft; }, { passive: true }); surukleBagla(serit, body); } }
  /* sürükle bırak: heybeden bir şeyi tutup tepsiye taşı (dokunuşla koymak da aynı işi görür) */
  let seritX = 0, surukledi = false;
  function surukleBagla(serit, body) { serit.querySelectorAll('.kr-esya').forEach(btn => btn.addEventListener('pointerdown', e => { if (e.button) return; const x0 = e.clientX, y0 = e.clientY, id = e.pointerId; let hayalet = null; surukledi = false;
      const tasi = ev => { if (ev.pointerId !== id) return; const dx = ev.clientX - x0, dy = ev.clientY - y0; if (!hayalet) { if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx)) return; const r = btn.querySelector('.kr-res'); hayalet = r.cloneNode(true); hayalet.className = 'kr-res kr-hayalet'; document.getElementById('app').appendChild(hayalet); surukledi = true; const t = body.querySelector('#krTepsi'); if (t) t.classList.add('bekliyor'); }
          hayalet.style.left = ev.clientX + 'px'; hayalet.style.top = ev.clientY + 'px'; ev.preventDefault(); },
        bitir = ev => { if (ev.pointerId !== id) return; removeEventListener('pointermove', tasi); removeEventListener('pointerup', bitir); removeEventListener('pointercancel', bitir);
          if (!hayalet) return; hayalet.remove(); const t = body.querySelector('#krTepsi'), r = t && t.getBoundingClientRect(); if (t) t.classList.remove('bekliyor');
          if (ev.type === 'pointerup' && r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20) { const x = heybeL[+btn.dataset.koy]; if (x && koy(x.e)) render(); } setTimeout(() => { surukledi = false; }, 0); };
      addEventListener('pointermove', tasi, { passive: false }); addEventListener('pointerup', bitir); addEventListener('pointercancel', bitir); })); }

  /* ---------- ekran ---------- */
  G.screen('kiraathane', { k: 'Kervansaray kıraathanesi', t: 'Kıraathane', cls: 'kr2', bg: 'a:kiraathane',
    enter() { if (!elde()) { kirResetGame(); KIR.tepsi = null; K.faz = 'salon'; K.oyun = null; K.ben = []; K.son = null; } setTimeout(sahne, 0); },
    draw(body) { if (K.faz === 'oyun' && bitti()) sonucaGec(); document.getElementById('scrT').textContent = K.oyun ? OYUN[K.oyun].ad : 'Kıraathane';
      body.innerHTML = K.faz === 'salon' || !K.oyun ? salonHtml() : odaHtml(); bagla(body); } });
  const HAN = [['han', 'Han'], ['siralama', 'Ün Tablosu'], ['kiraathane', 'Kıraathane']]; G.navOf = Object.assign(G.navOf || {}, { han: HAN, siralama: HAN, kiraathane: HAN });
  /* el sürerken masadan kalkılmaz: geri düğmesi, sekmeler ve Esc bekler (bahis ortadayken kaçış olmasın) */
  const acik = () => { const b = document.getElementById('scrB'); return !!b && b.classList.contains('kr2') && document.getElementById('scr').classList.contains('acik'); };
  const bekle = () => { if (acik() && elde()) { toast('Önce oynadığın eli bitir.'); return true; } return false; };
  const kapat0 = G.close; G.close = function () { if (bekle()) return; const bizdik = acik(); const r = kapat0.apply(this, arguments); if (bizdik && !elde()) { kirResetGame(); KIR.tepsi = null; K.faz = 'salon'; K.oyun = null; } return r; };
  const ac0 = G.open; G.open = function (id) { if (id !== 'kiraathane' && bekle()) return; if (id !== 'kiraathane' && acik()) { kirResetGame(); KIR.tepsi = null; K.faz = 'salon'; K.oyun = null; } return ac0.apply(this, arguments); };
  const geri = document.getElementById('scrBack'); if (geri) geri.addEventListener('click', e => { if (!acik()) return; e.stopImmediatePropagation(); if (K.faz === 'salon' || !K.oyun) G.close(); else kalk(); }, true);

  /* dışa açık yüz: denetim betikleri ve ileride ağ katmanı */
  EO2.kiraathane = { durum: () => ({ oyun: K.oyun, faz: K.faz, ben: K.ben.map(e => Object.assign({}, e)), rakip: K.rakip.map(e => Object.assign({}, e)), son: K.son }), otur, kalk, koy(e) { const ok = koy(e); render(); return ok; }, hazir(k) { hazir(k); render(); }, basla, engel: e => engel(e, K.ben), deger: e => bilgi(e).deger * (e.n || 1), atla,
    /* uzak rakip: aynı arayüzü sağlayan bir bağlantı verilir (kimlik, karsilik, onay, soz); tepsi ve maç akışı değişmez */
    baglan(oyun, bag) { otur(oyun); K.bag = bag; rakipGuncelle(); render(); } };
})();
