/* Ejder Ocağı 2.0 · Er Meydanı: Topçu PvP odaları (dostça, ödülsüz)
   Sahnedeki sancaklı çardak Er Meydanı'dır: oda kur, kodla katıl ya da hızlı eşleş. Sunucu tarafı server/pvp_rooms.js'tir;
   bu dosya yalnız EO2.ag.dinle / EO2.ag.gonder kullanır, kendi bağlantısını açmaz.
   Maç motoru js/battle.js'tir ve rakibi 'uzak' kontrolle sürer: bu dosya motorun olaylarını pvp_sync'e, gelen pvp_sync'i motor
   komutuna çevirir. Eşleme:  ates → fire · isabet → hit · can → hp_sync · konum → move_aim · pas / sıra devri → turn_handoff.
   Hasarı alan uç kendi canına yazar ve hp_sync ile bildirir (sunucu doğrulamaz; iki uç dürüst varsayılır, ödül yoktur).
   Rüzgâr sunucunun maç tohumundan türetilir: iki uçta aynı sıra numarası aynı rüzgârı verir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, B = EO2.battle, ag = EO2.ag;
  if (!ag || !B || !EO2.topcu) return;
  const st = { oda: null, ben: null, kuyruk: null, hata: '', mac: null, sonuc: null, rakipKoptu: false, lobi: [] };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const yolla = o => { if (!ag.gonder(o)) { st.hata = 'Sunucuya ulaşılamıyor.'; ciz(); return false; } return true; };
  const EKRAN = 'ermeydani', acikMi = () => G.ekran && G.ekran() === EKRAN;
  const ciz = () => { if (B.active()) return; if (acikMi() || EO2.topcu.secili() === 'meydan') G.redraw(); };
  const kimlik = () => { const o = EO2.topcu.oyuncuDeger(false); return { el: o.el, chibi: { set: o.set, ad: o.ad } }; };
  /* harita seçimi: oda kurulurken son seçilen harita gider; kurucu bekleme odasında değiştirir (pvp_room_map). Son seçim bu tarayıcıda hatırlanır (yalnız kolaylık). */
  const HARITALAR = () => EO2.topcu.PVP_HARITA || [], hAd = id => id === 'rastgele' ? 'Rastgele' : EO2.topcu.haritaBul ? EO2.topcu.haritaBul(id).ad : 'Er Meydanı';
  let secHarita = 'er-meydani'; try { const v = localStorage.getItem('eo2.pvpHarita'); if (v && (v === 'rastgele' || HARITALAR().some(h => h.id === v))) secHarita = v; } catch (_) { }
  const haritaSec = id => { secHarita = id; try { localStorage.setItem('eo2.pvpHarita', id); } catch (_) { } };
  const kurMsg = () => Object.assign({ type: 'pvp_room_create', mode: '1v1', mapId: secHarita }, kimlik());
  const ruzgar = tohum => n => { let h = (tohum ^ Math.imul(n, 0x9E3779B1)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return Math.round(((h >>> 0) / 4294967296 * 4.6 - 2.3) * 10) / 10; };

  /* ---------- künye: sahnenin Er Meydanı köşesi ---------- */
  function kunye() { const bas0 = '<div class="tp-k-bas"><small>Dostça düello · ödülsüz</small><h2>Er Meydanı</h2></div>';
    return bas0 + '<p>Başka bir terbiyeciyle sırayla atış. Altın, ün ve sıralama yazılmaz; kaybın olmaz.</p>' + (st.oda ? '<p class="tp-k-not">Odan açık: ' + esc_(st.oda.code) + '</p>' : st.kuyruk ? '<p class="tp-k-not">Rakip aranıyor.</p>' : '') + '<div class="tp-k-alt"><button type="button" class="gbtn altin buyuk" data-pvp="gir">Er Meydanı\'na gir<small>odalar, hızlı eşleşme</small></button></div>'; }
  function kunyeEski() { const d = ag.durum(), o = st.oda, bas = '<div class="tp-k-bas"><small>Dostça düello · ödülsüz</small><h2>Er Meydanı</h2></div>';
    if (d !== 'cevrimici') return bas + '<p>' + (d === 'baglaniyor' ? 'Sunucuya bağlanılıyor.' : 'Sunucuya ulaşılamıyor. Er Meydanı çevrimiçi oynanır; talim alanı açık.') + '</p><div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="baglan">Yeniden dene</button></div>';
    const hata = st.hata ? '<p class="tp-pvp-hata" role="alert">' + esc_(st.hata) + '</p>' : '';
    if (st.kuyruk) return bas + '<p>' + (st.kuyruk === 'bulundu' ? 'Rakip bulundu. Meydan hazırlanıyor.' : 'Rakip aranıyor. Biri sıraya girince maç kendiliğinden başlar.') + '</p>' + hata + '<div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="kuyruk-cik">Vazgeç</button></div>';
    if (o) { const benKurucu = o.host === st.ben, ben = o.slots.find(s => s.handle === st.ben) || {}, rakip = o.slots.find(s => s.kind !== 'empty' && s.handle !== st.ben), bitti = o.state === 'ended';
      return bas + '<div class="tp-oda"><small>Oda kodu</small><b>' + esc_(o.code) + '</b></div><div class="tp-yuvalar">' + o.slots.map(s => '<div class="tp-yuva ' + (s.kind === 'empty' ? 'bos' : '') + (s.ready && s.kind !== 'empty' ? ' hazir' : '') + '"><small>' + (s.idx === 0 ? 'Mavi sancak' : 'Kızıl sancak') + '</small><b>' + (s.kind === 'empty' ? 'Rakip bekleniyor' : esc_((s.chibi && s.chibi.ad) || s.name || s.handle)) + '</b><em>' + (s.kind === 'empty' ? 'Kodu arkadaşına ver' : s.host ? 'Kurucu' : s.ready ? 'Hazır' : 'Hazırlanıyor') + (s.handle === st.ben ? ' · sen' : '') + '</em></div>').join('') + '</div>' +
        (st.sonuc ? '<p class="tp-k-not">Son maç: ' + st.sonuc + '</p>' : '') + (st.rakipKoptu ? '<p class="tp-k-not">Rakibin bağlantısı koptu; dönmesi bekleniyor.</p>' : '') + hata +
        '<div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="cik">Odadan çık</button>' + (bitti ? '<button type="button" class="gbtn altin buyuk" data-pvp="rovans">Rövanş iste</button>' : benKurucu ? '<button type="button" class="gbtn altin buyuk" data-pvp="baslat" ' + (rakip && rakip.ready ? '' : 'disabled') + '>Maçı başlat</button>' : '<button type="button" class="gbtn altin buyuk" data-pvp="hazir">' + (ben.ready ? 'Hazır değilim' : 'Hazırım') + '</button>') + '</div>'; }
    return bas + '<p>Başka bir terbiyeciyle sırayla atış. Altın, ün ve sıralama yazılmaz; kaybın olmaz.</p>' + hata +
      '<div class="tp-pvp-sec"><button type="button" class="gbtn altin" data-pvp="kur">Oda kur</button><button type="button" class="gbtn" data-pvp="esles">Hızlı eşleş</button></div>' +
      '<form class="tp-pvp-kod" data-pvp-form="1"><label for="tpKod">Arkadaşının oda kodu</label><div><input id="tpKod" name="kod" maxlength="8" placeholder="EJD-ABC" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>' +
      '<div class="or-liste"><h3>Açık odalar</h3>' + (st.lobi.length ? '<ul>' + st.lobi.map(r => '<li><span><b>' + esc_(r.hostAd || r.host || 'Terbiyeci') + '</b><small>Topçu düellosu</small></span><em>' + r.players + ' / ' + r.max + '</em><button type="button" class="gbtn kucuk altin" data-pvp-oda="' + esc_(r.code) + '">Katıl</button></li>').join('') + '</ul>' : '<p class="soluk">Şu an açık oda yok. Sen kurarsan burada görünür.</p>') + '</div>'; }
  function bagla(body) {
    body.querySelectorAll('[data-harita]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.harita; if (EO2.audio) EO2.audio.ui(); haritaSec(id); if (st.oda && st.oda.state === 'waiting' && st.oda.host === st.ben) yolla({ type: 'pvp_room_map', mapId: id }); else ciz(); }));
    body.querySelectorAll('[data-soz]').forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); yolla({ type: 'pvp_room_say', i: +b.dataset.soz }); }));
    body.querySelectorAll('[data-pvp-oda]').forEach(b => b.addEventListener('click', () => { st.hata = ''; if (EO2.audio) EO2.audio.ui(); yolla(Object.assign({ type: 'pvp_room_join', code: b.dataset.pvpOda }, kimlik())); }));
    body.querySelectorAll('[data-pvp]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.pvp, K = kimlik(); st.hata = ''; if (EO2.audio) EO2.audio.ui();
      if (k === 'gir') { G.open(EKRAN); return; } if (k === 'takim') { G.open('takim'); return; } if (k === 'ejder') { G.open('arena'); return; } if (k === 'kusam') { G.open(EO2.ekipman ? 'dolap' : 'gorunus'); return; }
      if (k === 'cagir') { meydandanCagir(); return; } if (k === 'izle') { st.hata = ''; yolla({ type: 'pvp_watch', code: b.dataset.kod }); return; } if (k === 'izle-cik') { yolla({ type: 'pvp_unwatch' }); st.izle = null; ciz(); return; }
      if (k === 'kopya') { const kod = st.oda && st.oda.code; try { navigator.clipboard.writeText(kod).then(() => G.toast('Oda kodu kopyalandı: <b>' + esc_(kod) + '</b>'), () => { }); } catch (_) { } return; }
      if (k === 'baglan') { ag.baglan().then(ciz); ciz(); }
      else if (k === 'kur') yolla(kurMsg()); else if (k === 'esles') { st.sonuc = null; yolla(Object.assign({ type: 'pvp_queue_join', mode: '1v1' }, K)); }
      else if (k === 'kuyruk-cik') yolla({ type: 'pvp_queue_leave' }); else if (k === 'cik') { yolla({ type: 'pvp_room_leave' }); st.oda = null; st.sonuc = null; ciz(); }
      else if (k === 'hazir') { const ben = st.oda.slots.find(s => s.handle === st.ben) || {}; yolla({ type: 'pvp_room_ready', ready: !ben.ready }); }
      else if (k === 'baslat') yolla({ type: 'pvp_room_start' }); else if (k === 'rovans') { yolla({ type: 'pvp_rematch' }); st.sonuc = 'Rövanş istendi; rakip bekleniyor.'; ciz(); } }));
    const f = body.querySelector('[data-pvp-form]'); if (f) { f.addEventListener('submit', e => { e.preventDefault(); const kod = (f.elements.kod.value || '').trim(); st.hata = ''; if (!kod) { st.hata = 'Oda kodunu yaz.'; return ciz(); } yolla(Object.assign({ type: 'pvp_room_join', code: kod }, kimlik())); });
      const inp = f.elements.kod; inp.addEventListener('keydown', e => e.stopPropagation()); }
  }

  /* ---------- maç: motor olayları ↔ pvp_sync ---------- */
  function macBaslat(m) { if (m.practice) return;                                   // bot provası 2.0'da talim alanıdır
    const benYuva = m.slots.find(s => s.handle === m.you) || { idx: 0 }, rakip = m.slots.find(s => s.kind !== 'empty' && s.handle !== m.you) || {};
    st.mac = { id: m.matchId, oda: m.roomId, ben: m.you, turNo: 0, bitti: false, hazir: false, bekleyen: [] }; st.kuyruk = null; st.sonuc = null; st.rakipKoptu = false; st.oda = m.room || st.oda; st.ben = m.you;
    const kes = B.dinle((olay, v) => { const M_ = st.mac; if (!M_ || M_.bitti) return; const sync = o => ag.gonder(Object.assign({ type: 'pvp_sync', turnNo: M_.turNo }, o));
      if (olay === 'mac_basla' || (olay === 'sira' && v.kim === 0)) { const P = B.state().ben; sync({ action: 'hp_sync', hp: P.hp, maxHp: P.max }); if (olay === 'mac_basla') { M_.hazir = true; for (const b of M_.bekleyen.splice(0)) isle(b); } }
      else if (olay === 'ates' && v.kim === 0) { sync({ action: 'fire', x: v.x, y: v.y, angle: v.aci, power: v.guc, facing: v.yon, el: v.el, dmg: v.hasar, mods: v.mod }); M_.turNo++; sync({ action: 'turn_handoff', turnNo: M_.turNo }); }
      else if (olay === 'isabet' && v.kim === 1) sync({ action: 'hit', dmg: v.hasar, kb: v.it, kind: (v.delici ? 'd' : '') + (v.bas ? 'b' : '') });
      else if (olay === 'can' && v.kim === 0) sync({ action: 'hp_sync', hp: v.hp, maxHp: v.max });
      else if (olay === 'konum') sync({ action: 'move_aim', x: v.x, y: v.y, angle: v.aci, facing: v.yon });
      else if (olay === 'pas' && v.kim === 0) { sync({ action: 'pass' }); M_.turNo++; sync({ action: 'turn_handoff', turnNo: M_.turNo }); }
      else if (olay === 'mac_bitti') { if (!v.zafer && !M_.sunucuBitirdi) ag.gonder({ type: 'pvp_match_result', matchId: M_.id, result: 'lose' }); } });
    EO2.topcu.pvpBaslat({ macKimlik: m.matchId, rakip: { ad: (rakip.chibi && rakip.chibi.ad) || rakip.name || rakip.handle || 'Rakip', set: (rakip.chibi && rakip.chibi.set) || 'temel', gor: EO2.gorunum ? EO2.gorunum.kodOf(rakip.handle) : '', el: rakip.el || 'talim', unvan: 'Er Meydanı rakibi' }, ilk: m.firstTurn === m.you ? 'ben' : 'rakip', sag: benYuva.idx === 1, ruzgar: ruzgar(m.seed), harita: m.mapId,
      sonra: r => { kes(); const M_ = st.mac; if (r.terk && M_ && !M_.sunucuBitirdi) ag.gonder({ type: 'pvp_match_result', matchId: M_.id, result: 'lose' }); if (M_) M_.bitti = true; st.sonuc = r.terk ? 'Meydandan ayrıldın.' : r.zafer ? 'Kazandın.' : 'Kaybettin.';
        return G.pen({ k: 'Er Meydanı · dostça maç', t: r.terk ? 'Ayrıldın' : r.zafer ? 'Zafer' : 'Yenildin', body: '<p>' + (r.terk ? 'Maçtan ayrıldın; rakibin kazandı.' : r.zafer ? (M_ && M_.neden === 'forfeit' ? 'Rakibin meydandan ayrıldı.' : 'Rakibin topu sustu.') : 'Bu kez rakibin daha isabetliydi.') + ' Dostça maç ödülsüzdür: altın, ün ve sıralama yazılmaz.</p>', btns: [{ t: 'Odaya dön', cls: 'altin' }] }); } })
      .then(() => { meydanAc(); });   /* maçtan sonra Er Meydanı ekranına (bekleme odasına) dönülür */
  }
  const benden = m => !st.mac || m.from === st.mac.ben;
  ag.dinle('pvp_sync', m => { if (!st.mac || st.mac.bitti || benden(m) || (m.matchId && m.matchId !== st.mac.id)) return; if (!st.mac.hazir) { if (m.action !== 'move_aim') st.mac.bekleyen.push(m); return; } isle(m); });
  function isle(m) { const a = m.action;
    if (a === 'fire') B.uzak({ t: 'ates', x: m.x, y: m.y, aci: m.angle, guc: m.power, yon: m.facing, mod: m.mods || {} });
    else if (a === 'hit') B.uzak({ t: 'isabet', hasar: m.dmg, it: m.kb, delici: /d/.test(m.kind || ''), bas: /b/.test(m.kind || '') });
    else if (a === 'hp_sync') B.uzak({ t: 'can', hp: m.hp, max: m.maxHp });
    else if (a === 'move_aim') B.uzak({ t: 'konum', x: m.x, y: m.y, aci: m.angle, yon: m.facing });
    else if (a === 'pass') B.uzak({ t: 'pas' }); }
  ag.dinle('pvp_match_start', macBaslat);
  /* açık odalar: Er Meydanı künyesi açıkken sunucunun oda listesine abone olunur; bekleyen ve yeri olan odalar gösterilir */
  ag.dinle('pvp_lobby', m => { const L = (m.rooms || []).filter(r => r.host !== st.ben && (r.state === 'playing' || (r.state === 'waiting' && r.players < r.max))).sort((p, q) => (p.state === 'playing') - (q.state === 'playing')), imza = JSON.stringify(L); if (imza === st.lobiImza) return; st.lobiImza = imza; st.lobi = L; if (!st.oda && !st.kuyruk) ciz(); });
  let lobiAcik = false; setInterval(() => { const acik = G.live && G.ekran && acikMi() && !B.active() && !st.oda && !st.izle && ag.durum() === 'cevrimici';
    if (acik && !lobiAcik) yolla({ type: 'pvp_lobby_sub' }); else if (!acik && lobiAcik && ag.durum() === 'cevrimici') yolla({ type: 'pvp_lobby_unsub' }); lobiAcik = acik; }, 800);
  ag.dinle('pvp_match_end', m => { const M_ = st.mac; if (!M_ || (m.matchId && m.matchId !== M_.id)) return; M_.sunucuBitirdi = true; M_.neden = m.reason; if (st.oda) st.oda.state = 'ended'; if (B.active() && B.state() && !B.state().over) B.sonlandir(m.winner === m.you); });
  ag.dinle('pvp_room', m => { st.oda = m.room; st.ben = m.you; st.hata = ''; if (m.room.state === 'waiting') st.rakipKoptu = false;
    if (st.davet && m.room.state === 'waiting') { const to = st.davet; st.davet = null; yolla({ type: 'pvp_room_invite', to: to.h }); }   // oda kuruldu: bekleyen davet gider
    ciz(); });
  /* ---------- meydandan davet (js/meydan_ag.js çağırır) ----------
     Oyuncu meydanda yanına geldiği başka bir oyuncuyu Er Meydanı'na çağırır: oda yoksa kurulur, davet sunucudan gider.
     Çağrılan oyuncu kabul ederse odaya katılır; ikisi de Er Meydanı künyesine götürülür. Dostça, ödülsüz. */
  const meydanAc = () => { if (!G.live || B.active()) return; if (!acikMi()) G.open(EKRAN); else G.redraw(); };
  function davet(h, ad) {
    if (ag.durum() !== 'cevrimici') { G.toast('Sunucuya ulaşılamıyor; davet gönderilemedi.'); return false; }
    if (B.active() || st.kuyruk) { G.toast('Önce süren maçı ya da eşleşmeyi bitir.'); return false; }
    if (st.oda && st.oda.state === 'waiting' && st.oda.host === st.ben) yolla({ type: 'pvp_room_invite', to: h });
    else if (st.oda) { G.toast('Zaten bir odadasın. Önce odadan çık.'); meydanAc(); return false; }
    else { st.davet = { h, ad }; yolla(kurMsg()); }
    meydanAc(); return true;
  }
  ag.dinle('pvp_invite_sent', () => G.toast('Davet gönderildi. Kabul ederse kızıl sancağa oturur.'));
  ag.dinle('pvp_invite_declined', () => G.toast('Davetin geri çevrildi.'));
  let davetAcik = false;
  ag.dinle('pvp_invite', async m => {
    if (!m || typeof m.code !== 'string' || davetAcik || !G.live || B.active() || st.oda || st.kuyruk) { if (m && m.roomId && !davetAcik) ag.gonder({ type: 'pvp_invite_reply', roomId: m.roomId, accept: false }); return; }
    davetAcik = true; const kim = EO2.meydanAg && EO2.meydanAg.adOf ? EO2.meydanAg.adOf(m.from) : null;
    const v = await G.pen({ k: 'Er Meydanı', t: 'Düello daveti', body: '<p><b>' + esc_(kim || 'Bir terbiyeci') + '</b> seni Topçu düellosuna çağırıyor.</p><p>Dostça bir maç: altın, ün ve sıralama yazılmaz; kaybın olmaz.</p>', btns: [{ t: 'Şimdi değil', v: false }, { t: 'Kabul et', cls: 'altin', v: true }] });
    davetAcik = false;
    if (!v) { ag.gonder({ type: 'pvp_invite_reply', roomId: m.roomId, accept: false }); return; }
    if (yolla(Object.assign({ type: 'pvp_room_join', code: m.code }, kimlik()))) meydanAc();
  });
  ag.dinle('pvp_room_left', () => { st.oda = null; ciz(); });
  ag.dinle('pvp_room_closed', () => { st.oda = null; st.hata = 'Oda kapandı.'; ciz(); });
  ag.dinle('pvp_error', m => { st.hata = m.message || 'İşlem yapılamadı.'; if (st.kuyruk) st.kuyruk = null; ciz(); });
  ag.dinle('pvp_queue_state', m => { st.kuyruk = m.status === 'searching' ? 'ariyor' : null; if (m.status === 'dropped') st.hata = 'Eşleşme düştü. Yeniden dene.'; ciz(); });
  ag.dinle('pvp_queue_found', m => { st.kuyruk = 'bulundu'; ag.gonder({ type: 'pvp_queue_ready', matchKey: m.matchKey }); ciz(); });
  ag.dinle('pvp_peer_left', () => { st.rakipKoptu = true; if (B.active()) G.toast('Rakibin bağlantısı koptu. Dönmezse maç sana yazılır.'); });
  ag.dinle('pvp_peer_back', () => { st.rakipKoptu = false; if (B.active()) G.toast('Rakibin geri döndü.'); });
  ag.dinle('pvp_rematch_pending', m => { if (!m.self) { st.sonuc = 'Rakibin rövanş istiyor.'; ciz(); } });
  ag.dinle('durum', () => { if (ag.durum() !== 'cevrimici') { st.kuyruk = null; } ciz(); });
  /* ---------- ER MEYDANI EKRANI (taslak onayı: kullanıcı, 2026-11-18; eo2/docs/mockup/oda_arena.html) ----------
     Oda listesi: odalar tablo değil sancak kartıdır; kartta odadaki terbiyeci kendi zırhıyla durur, boş yer "+" ile görünür.
     Bekleme odası: iki terbiyeci sancaklarının altında karşı karşıya durur; hazır olanın lambası yanar; altta tek büyük düğme. */
  const GR = () => EO2.gorunum, cizim = new Map(), SOZ = ['Selam!', 'Hazır mısın?', 'Bol şans', 'Bir dakika'], balon = {};   // balon: adres → { i, t } (bekleme odasında terbiyecinin üstünde üç saniye durur)
  /* maç izleme: st.izle = { code, slots, hp, turnNo, sira, olay, son } (sunucudan pvp_watch_state / pvp_watch_ev / pvp_watch_end) */
  ag.dinle('pvp_watch_state', m => { st.izle = { id: m.roomId, code: m.code, slots: m.slots || [], hp: m.hp || {}, turnNo: m.turnNo || 0, sira: m.sira, olay: 'Maç sürüyor.', son: null }; ciz(); });
  ag.dinle('pvp_watch_ev', m => { const z = st.izle; if (!z || z.id !== m.roomId) return; const ad = h => (z.slots.find(s => s.h === h) || {}).ad || 'Terbiyeci', oteki = h => (z.slots.find(s => s.h !== h) || {}).h;
    if (m.action === 'hp_sync' && typeof m.hp === 'number') z.hp[m.from] = { hp: m.hp, maxHp: m.maxHp }; else if (m.action === 'fire') { z.olay = esc_(ad(m.from)) + ' ateş etti.'; z.atan = m.from; z.atisT = Date.now(); }
    else if (m.action === 'hit') { const v = oteki(m.from), q = z.hp[v]; z.olay = esc_(ad(m.from)) + ' isabet aldı: −' + Math.round(m.dmg || 0); if (z.hp[m.from]) z.hp[m.from].hp = Math.max(0, z.hp[m.from].hp - Math.round(m.dmg || 0)); z.vurulan = m.from; z.vurT = Date.now(); void v; void q; }
    if (m.turnNo != null) z.turnNo = m.turnNo; if (m.sira) z.sira = m.sira; if (EO2.audio && EO2.audio.pop && m.action !== 'hp_sync') EO2.audio.pop(); ciz(); });
  ag.dinle('pvp_watch_end', m => { const z = st.izle; if (!z) { if (m.neden === 'mac_yok') G.toast('O maç bitmiş.'); return; } if (m.roomId && z.id !== m.roomId) return; z.son = { kazanan: m.winner, neden: m.neden }; z.olay = m.winner ? esc_((z.slots.find(s => s.h === m.winner) || {}).ad || 'Terbiyeci') + ' kazandı.' : 'Maç bitti.'; if (EO2.audio && EO2.audio.chime) EO2.audio.chime(); ciz(); });
  function izleHtml() { const z = st.izle, kazanan = z.son && z.son.kazanan;
    const taraf = (s, i) => { const c = (s && z.hp[s.h]) || null, oran = c && c.maxHp ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 1, sirada = !z.son && s && z.sira === s.h, vur = s && z.vurulan === s.h && Date.now() - (z.vurT || 0) < 900;
      return '<div class="em-taraf ' + (i ? 'sagt' : 'sol') + (vur ? ' vuruldu' : '') + (kazanan && s && kazanan !== s.h ? ' dustu' : '') + '">' + (s ? cv_({ set: s.set, h: s.h }, i ? 'left' : 'right', true) : '') + '<div class="em-kaide"></div><div class="em-plaka cam"><div><b>' + esc_(s ? s.ad : '') + '</b><small>' + (i ? 'Kızıl sancak' : 'Mavi sancak') + (kazanan && s && kazanan === s.h ? ' · kazandı' : '') + '</small><span class="em-can"><i style="width:' + Math.round(oran * 100) + '%"></i></span></div>' + (z.son ? '' : '<span class="em-lamba' + (sirada ? '' : ' bekle') + '">' + (sirada ? 'Sırası' : 'Bekliyor') + '</span>') + '</div></div>'; };
    return '<div class="em-kok oda izle"><div class="em-kod2 cam"><small>Canlı maç · izliyorsun</small><b>Tur ' + (Math.floor((z.turnNo || 0) / 2) + 1) + '</b><em>' + esc_(z.code) + '</em></div><i class="em-sancakU m" aria-hidden="true"></i><i class="em-sancakU k" aria-hidden="true"></i>' + taraf(z.slots[0], 0) + taraf(z.slots[1], 1) +
      '<div class="em-orta"><div class="em-vsB" aria-hidden="true">VS</div><div class="em-kural cam" role="status" aria-live="polite"><b>' + (z.son ? 'Maç bitti' : 'Maç sürüyor') + '</b>' + z.olay + '</div></div>' +
      '<div class="em-altB"><div class="em-sol"></div><button type="button" class="gbtn altin buyuk em-hazir" data-pvp="izle-cik">' + (z.son ? 'Meydana dön' : 'İzlemeyi bırak') + '</button><div class="em-sagalt"></div></div></div>'; }
  ag.dinle('pvp_room_say', m => { if (!st.oda || m.roomId !== st.oda.id || !SOZ[m.i]) return; balon[m.from] = { i: m.i, t: Date.now() }; if (EO2.audio && EO2.audio.pop) EO2.audio.pop(); ciz(); setTimeout(() => { if (balon[m.from] && Date.now() - balon[m.from].t >= 2900) { delete balon[m.from]; ciz(); } }, 3000); });
  /* meydandan çağır: şu an aynı yerde görünen terbiyecilerden biri seçilir, davet ona gider */
  async function meydandanCagir() { const K = EO2.meydanAg && EO2.meydanAg.kisiler ? [...EO2.meydanAg.kisiler.values()].filter(c => c.handle && c.handle !== st.ben) : [];
    if (!K.length) return G.toast('Yakınında başka terbiyeci görünmüyor. Kodu arkadaşına verebilirsin.');
    const v = await G.pen({ k: 'Er Meydanı', t: 'Kimi çağıralım?', dikey: true, body: '<p>Yakınındaki terbiyeciler. Seçtiğine davet gider; kabul ederse kızıl sancağa oturur.</p>', btns: [...K.slice(0, 6).map(c => ({ t: esc_(c.name || c.handle), cls: 'altin', v: c.handle })), { t: 'Vazgeç', v: false }] });
    if (v && st.oda && st.oda.state === 'waiting') yolla({ type: 'pvp_room_invite', to: v }); }
  function chibi(cv, set, yon, kod, benMi) { const A = EO2.api, g = GR(); if (!cv || !A || !EO2.setAl) return; set = EO2.setAl(set) ? set : 'temel';
    let ad = set; if (benMi && A.player.set === set && A.player.gor && EO2.setAl(A.player.gor)) ad = A.player.gor; else if (kod && g && g.adOf) { const a = g.adOf(set, kod); if (a && EO2.setAl(a)) ad = a; else if (a && g.kurKod) g.kurKod(set, kod).then(() => { if (cv.isConnected) chibi(cv, set, yon, kod, benMi); }).catch(() => { }); }
    const st0 = EO2.setAl(ad); if (!st0 || !st0.img) { try { A.drawPortrait(document.createElement('canvas'), set, 0.5); } catch (_) { } const n = (cizim.get(cv) || 0) + 1; cizim.set(cv, n); if (n < 12) setTimeout(() => { if (cv.isConnected) chibi(cv, set, yon, kod, benMi); }, 400); return; }
    const m = st0.m, sol = yon === 'left', i = m.frames[(sol ? 'right' : yon) + '_idle']; cv.width = m.cw; cv.height = m.ch; const x = cv.getContext('2d'); x.clearRect(0, 0, m.cw, m.ch); if (sol) { x.translate(m.cw, 0); x.scale(-1, 1); }
    x.drawImage(st0.img, (i % m.cols) * m.cw, Math.floor(i / m.cols) * m.ch, m.cw, m.ch, 0, 0, m.cw, m.ch); }
  const kodOf = h => (GR() && GR().kodOf ? GR().kodOf(h) : '') || '';
  const cv_ = (s, yon, buyuk) => '<canvas class="em-chibi' + (buyuk ? ' buyuk' : '') + '" data-set="' + esc_((s && s.set) || 'temel') + '" data-yon="' + yon + '" data-h="' + esc_((s && s.h) || '') + '"></canvas>';
  function lobi() { const d = ag.durum(), hata = st.hata ? '<p class="tp-pvp-hata" role="alert">' + esc_(st.hata) + '</p>' : '';
    if (d !== 'cevrimici') return '<div class="em-kok"><div class="em-tek cam"><h2>Er Meydanı</h2><p>' + (d === 'baglaniyor' ? 'Sunucuya bağlanılıyor.' : 'Sunucuya ulaşılamıyor. Er Meydanı çevrimiçi oynanır; talim alanı açık.') + '</p><button type="button" class="gbtn" data-pvp="baglan">Yeniden dene</button></div></div>';
    const kartlar = st.lobi.map(r => { const S0 = (r.slots || []).filter(Boolean), ilk = S0[0] || { ad: r.hostAd || r.host, set: 'temel', h: r.host };
      if (r.state === 'playing') return '<div class="em-sancak cam dolu"><div class="em-kip2"><span>Düello</span><span>' + r.players + ' / ' + r.max + ' · maçta</span></div><div class="em-sahne">' + cv_(ilk, 'right') + '<span class="em-vs">VS</span>' + (S0[1] ? cv_(S0[1], 'left') : '<span class="em-yer"><span>+</span></span>') + '</div><div class="em-alt"><b>' + esc_(S0.map(q => q.ad).join(' · ') || r.hostAd || 'Terbiyeci') + '<small>Maç sürüyor</small></b><button type="button" class="gbtn" data-pvp="izle" data-kod="' + esc_(r.code) + '">İzle</button></div></div>';
      return '<div class="em-sancak cam"><div class="em-kip2"><span>Düello · ' + esc_(hAd(r.mapId)) + '</span><span>' + r.players + ' / ' + r.max + '</span></div><div class="em-sahne">' + cv_(ilk, 'right') + '<span class="em-vs">VS</span><span class="em-yer"><span>+</span></span></div><div class="em-alt"><b>' + esc_(r.hostAd || r.host || 'Terbiyeci') + '<small>Rakip bekliyor</small></b><button type="button" class="gbtn altin" data-pvp-oda="' + esc_(r.code) + '">Katıl</button></div></div>'; }).join('');
    return '<div class="em-kok"><div class="em-kipler" role="tablist" aria-label="Meydan türü"><button type="button" class="em-kip secili" role="tab" aria-selected="true">Düello<small>1\'e 1 topçu</small></button><button type="button" class="em-kip cam" role="tab" aria-selected="false" data-pvp="takim">Takım Meydanı<small>2\'ye 2 topçu</small></button><button type="button" class="em-kip cam" role="tab" aria-selected="false" data-pvp="ejder">Ejderha dövüşü<small>ejderhan dövüşür</small></button></div>' +
      '<div class="em-sancaklar or-liste-yok" data-em-liste="1">' + kartlar + '<div class="em-bosyer"><div>' + (st.lobi.length ? 'Buraya senin odan gelir' : 'Şu an açık oda yok') + '<small>Oda kurunca herkes listede görür</small></div></div></div>' +
      '<div class="em-sag">' + (st.kuyruk ? '<div class="em-buyuk cam ariyor"><img alt="" src="assets/ik/mdl-topcu.webp"><div><b>' + (st.kuyruk === 'bulundu' ? 'Rakip bulundu' : 'Rakip aranıyor…') + '</b><small>' + (st.kuyruk === 'bulundu' ? 'Meydan hazırlanıyor.' : 'Biri sıraya girince maç kendiliğinden başlar.') + '</small></div></div><button type="button" class="gbtn" data-pvp="kuyruk-cik">Aramayı bırak</button>'
        : '<button type="button" class="em-buyuk ana" data-pvp="esles"><img alt="" src="assets/ik/mdl-topcu.webp"><div><b>Hızlı eşleş</b><small>Sıraya gir; ilk gelenle hemen başlar</small></div></button><button type="button" class="em-buyuk cam" data-pvp="kur"><img alt="" src="assets/ik/mdl-arena.webp"><div><b>Oda kur</b><small>Listede görünür; kodla da girilir</small></div></button>' +
          '<form class="em-kod cam" data-pvp-form="1"><label for="tpKod">Arkadaşının oda kodu</label><div><input id="tpKod" name="kod" maxlength="8" placeholder="EJD-ABC" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>') +
        hata + '<p class="em-not cam"><b>Dostça oynanır.</b> Altın, ün ve sıralama yazılmaz; kaybın olmaz.</p></div></div>'; }
  /* bekleme odasında harita: kurucu dört kartdan birini seçer (üç harita ve Rastgele), misafir seçileni görür */
  const hResim = id => { const H = HARITALAR().find(h => h.id === id); return H ? H.resim : ''; };
  function haritaHtml(o, secebilir) { const id = o.mapId === 'rastgele' || HARITALAR().some(h => h.id === o.mapId) ? o.mapId : EO2.topcu.haritaBul ? EO2.topcu.haritaBul(o.mapId).id : 'er-meydani';
    const H = id === 'rastgele' ? { ad: 'Rastgele', alt: 'Maç başında üç haritadan biri çekilir' } : HARITALAR().find(h => h.id === id) || { ad: hAd(id), alt: '' };
    const kart = (k, ad, sec) => '<button type="button" class="em-hkart' + (k === 'rastgele' ? ' rastgele' : '') + '" role="radio" aria-checked="' + sec + '" data-harita="' + esc_(k) + '"' + (k !== 'rastgele' ? ' style="background-image:url(' + esc_(hResim(k)) + ')"' : '') + '><span>' + esc_(ad) + '</span></button>';
    if (!secebilir) return '<div class="em-haritalar tek"><div class="em-hkart' + (id === 'rastgele' ? ' rastgele' : '') + '"' + (id !== 'rastgele' ? ' style="background-image:url(' + esc_(hResim(id)) + ')"' : '') + '><span>Harita · ' + esc_(H.ad) + '</span></div><small>' + esc_(H.alt) + ' · rüzgâr her tur değişir</small></div>';
    return '<div class="em-haritalar"><div class="em-hsec" role="radiogroup" aria-label="Harita">' + HARITALAR().map(h => kart(h.id, h.kisa || h.ad, h.id === id)).join('') + kart('rastgele', 'Rastgele', id === 'rastgele') + '</div><small>' + esc_(H.alt) + ' · rüzgâr her tur değişir</small></div>'; }
  function odaHtml() { const o = st.oda, benKurucu = o.host === st.ben, ben = o.slots.find(s => s.handle === st.ben) || {}, rakip = o.slots.find(s => s.kind !== 'empty' && s.handle !== st.ben), bitti = o.state === 'ended', hata = st.hata ? '<p class="tp-pvp-hata" role="alert">' + esc_(st.hata) + '</p>' : '';
    const taraf = (s, i) => { const bos = !s || s.kind === 'empty', benim = !bos && s.handle === st.ben, ad = bos ? 'Rakip bekleniyor' : benim ? 'Sen' : esc_((s.chibi && s.chibi.ad) || s.name || s.handle);
      return '<div class="em-taraf ' + (i ? 'sagt' : 'sol') + ' tp-yuva' + (bos ? ' bos' : '') + (!bos && s.ready ? ' hazir' : '') + '">' + (bos ? '<span class="em-yer buyuk"><span>+</span></span>' : (balon[s.handle] ? '<span class="em-balon" role="status">' + esc_(SOZ[balon[s.handle].i]) + '</span>' : '') + cv_({ set: (s.chibi && s.chibi.set) || 'temel', h: s.handle }, i ? 'left' : 'right', true)) + '<div class="em-kaide"></div><div class="em-plaka cam"><div><b>' + ad + '</b><small>' + (i ? 'Kızıl sancak' : 'Mavi sancak') + (bos ? ' · kodu arkadaşına ver' : s.host ? ' · odayı kurdu' : '') + '</small></div>' + (bos ? '' : '<span class="em-lamba' + (s.ready ? '' : ' bekle') + '">' + (s.ready ? 'Hazır' : 'Hazır değil') + '</span>') + '</div></div>'; };
    return '<div class="em-kok oda"><button type="button" class="em-kod2 cam tp-oda" data-pvp="kopya" title="Kodu kopyala"><small>Oda kodu</small><b>' + esc_(o.code) + '</b><em>dokun: kopyala</em></button><i class="em-sancakU m" aria-hidden="true"></i><i class="em-sancakU k" aria-hidden="true"></i>' + taraf(o.slots[0], 0) + taraf(o.slots[1], 1) +
      '<div class="em-orta"><div class="em-vsB" aria-hidden="true">VS</div>' + haritaHtml(o, benKurucu && !bitti) + '<div class="em-kural cam"><b>Sırayla atış</b>Canı biten kaybeder. Ödül yok, kayıp yok.</div>' + (st.sonuc ? '<p class="em-sonuc cam">Son maç: ' + st.sonuc + '</p>' : '') + (st.rakipKoptu ? '<p class="em-sonuc cam">Rakibinin bağlantısı koptu; dönmesi bekleniyor.</p>' : '') + hata + '</div>' +
      '<div class="em-altB"><div class="em-sol"><button type="button" class="gbtn" data-pvp="cik">Odadan çık</button>' + SOZ.map((t, i) => '<button type="button" class="gbtn kucuk em-soz" data-soz="' + i + '">' + t + '</button>').join('') + '</div>' + (bitti ? '<button type="button" class="gbtn altin buyuk em-hazir" data-pvp="rovans">Rövanş iste</button>' : benKurucu ? '<button type="button" class="gbtn altin buyuk em-hazir" data-pvp="baslat" ' + (rakip && rakip.ready ? '' : 'disabled') + '>Maçı başlat<small>' + (!rakip ? 'rakip bekleniyor' : rakip.ready ? 'rakibin hazır' : 'rakibin hazır olmalı') + '</small></button>' : '<button type="button" class="gbtn altin buyuk em-hazir" data-pvp="hazir">' + (ben.ready ? 'Hazır değilim' : 'Hazırım') + '<small>' + (ben.ready ? 'kurucu başlatınca maç açılır' : 'hazır olunca kurucu başlatır') + '</small></button>') +
      '<div class="em-sagalt">' + (benKurucu && !rakip && !bitti ? '<button type="button" class="gbtn" data-pvp="cagir">Meydandan çağır</button>' : '') + '<button type="button" class="gbtn" data-pvp="kusam">Kuşam</button></div></div></div>'; }
  G.screen(EKRAN, { k: 'Dostça düello · ödülsüz', t: 'Er Meydanı', cls: 'em', bg: 'a:../arena/er_meydani_bg', enter() { st.hata = ''; }, leave() { if (st.izle) { if (ag.durum() === 'cevrimici') ag.gonder({ type: 'pvp_unwatch' }); st.izle = null; } }, draw(body) {
    body.innerHTML = st.oda && ag.durum() === 'cevrimici' ? odaHtml() : st.izle && ag.durum() === 'cevrimici' ? izleHtml() : lobi(); bagla(body);
    body.querySelectorAll('canvas.em-chibi').forEach(cv => chibi(cv, cv.dataset.set, cv.dataset.yon, kodOf(cv.dataset.h), cv.dataset.h === st.ben)); } });
  EO2.topcuPvp = { kunye, bagla, davet, durum: () => st, ac: meydanAc, chibi, kodOf };   /* chibi: bekleme odalarında terbiyecinin boydan çizimi (takım ve sefer odaları da kullanır) */
})();
