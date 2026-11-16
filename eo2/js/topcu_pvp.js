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
  const st = { oda: null, ben: null, kuyruk: null, hata: '', mac: null, sonuc: null, rakipKoptu: false };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const yolla = o => { if (!ag.gonder(o)) { st.hata = 'Sunucuya ulaşılamıyor.'; ciz(); return false; } return true; };
  const ciz = () => { if (EO2.topcu.secili() === 'meydan' && !B.active()) G.redraw(); };
  const kimlik = () => { const o = EO2.topcu.oyuncuDeger(false); return { el: o.el, chibi: { set: o.set, ad: o.ad } }; };
  const ruzgar = tohum => n => { let h = (tohum ^ Math.imul(n, 0x9E3779B1)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return Math.round(((h >>> 0) / 4294967296 * 4.6 - 2.3) * 10) / 10; };

  /* ---------- künye: sahnenin Er Meydanı köşesi ---------- */
  function kunye() { const d = ag.durum(), o = st.oda, bas = '<div class="tp-k-bas"><small>Dostça düello · ödülsüz</small><h2>Er Meydanı</h2></div>';
    if (d !== 'cevrimici') return bas + '<p>' + (d === 'baglaniyor' ? 'Sunucuya bağlanılıyor.' : 'Sunucuya ulaşılamıyor. Er Meydanı çevrimiçi oynanır; talim alanı açık.') + '</p><div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="baglan">Yeniden dene</button></div>';
    const hata = st.hata ? '<p class="tp-pvp-hata" role="alert">' + esc_(st.hata) + '</p>' : '';
    if (st.kuyruk) return bas + '<p>' + (st.kuyruk === 'bulundu' ? 'Rakip bulundu. Meydan hazırlanıyor.' : 'Rakip aranıyor. Biri sıraya girince maç kendiliğinden başlar.') + '</p>' + hata + '<div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="kuyruk-cik">Vazgeç</button></div>';
    if (o) { const benKurucu = o.host === st.ben, ben = o.slots.find(s => s.handle === st.ben) || {}, rakip = o.slots.find(s => s.kind !== 'empty' && s.handle !== st.ben), bitti = o.state === 'ended';
      return bas + '<div class="tp-oda"><small>Oda kodu</small><b>' + esc_(o.code) + '</b></div><div class="tp-yuvalar">' + o.slots.map(s => '<div class="tp-yuva ' + (s.kind === 'empty' ? 'bos' : '') + (s.ready && s.kind !== 'empty' ? ' hazir' : '') + '"><small>' + (s.idx === 0 ? 'Mavi sancak' : 'Kızıl sancak') + '</small><b>' + (s.kind === 'empty' ? 'Rakip bekleniyor' : esc_((s.chibi && s.chibi.ad) || s.name || s.handle)) + '</b><em>' + (s.kind === 'empty' ? 'Kodu arkadaşına ver' : s.host ? 'Kurucu' : s.ready ? 'Hazır' : 'Hazırlanıyor') + (s.handle === st.ben ? ' · sen' : '') + '</em></div>').join('') + '</div>' +
        (st.sonuc ? '<p class="tp-k-not">Son maç: ' + st.sonuc + '</p>' : '') + (st.rakipKoptu ? '<p class="tp-k-not">Rakibin bağlantısı koptu; dönmesi bekleniyor.</p>' : '') + hata +
        '<div class="tp-k-alt"><button type="button" class="gbtn" data-pvp="cik">Odadan çık</button>' + (bitti ? '<button type="button" class="gbtn altin buyuk" data-pvp="rovans">Rövanş iste</button>' : benKurucu ? '<button type="button" class="gbtn altin buyuk" data-pvp="baslat" ' + (rakip && rakip.ready ? '' : 'disabled') + '>Maçı başlat</button>' : '<button type="button" class="gbtn altin buyuk" data-pvp="hazir">' + (ben.ready ? 'Hazır değilim' : 'Hazırım') + '</button>') + '</div>'; }
    return bas + '<p>Başka bir terbiyeciyle sırayla atış. Altın, ün ve sıralama yazılmaz; kaybın olmaz.</p>' + hata +
      '<div class="tp-pvp-sec"><button type="button" class="gbtn altin" data-pvp="kur">Oda kur</button><button type="button" class="gbtn" data-pvp="esles">Hızlı eşleş</button></div>' +
      '<form class="tp-pvp-kod" data-pvp-form="1"><label for="tpKod">Arkadaşının oda kodu</label><div><input id="tpKod" name="kod" maxlength="8" placeholder="EJD-ABC" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="gbtn">Katıl</button></div></form>'; }
  function bagla(body) {
    body.querySelectorAll('[data-pvp]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.pvp, K = kimlik(); st.hata = ''; if (EO2.audio) EO2.audio.ui();
      if (k === 'baglan') { ag.baglan().then(ciz); ciz(); }
      else if (k === 'kur') yolla(Object.assign({ type: 'pvp_room_create', mode: '1v1' }, K)); else if (k === 'esles') { st.sonuc = null; yolla(Object.assign({ type: 'pvp_queue_join', mode: '1v1' }, K)); }
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
    EO2.topcu.pvpBaslat({ macKimlik: m.matchId, rakip: { ad: (rakip.chibi && rakip.chibi.ad) || rakip.name || rakip.handle || 'Rakip', set: (rakip.chibi && rakip.chibi.set) || 'temel', el: rakip.el || 'talim', unvan: 'Er Meydanı rakibi' }, ilk: m.firstTurn === m.you ? 'ben' : 'rakip', sag: benYuva.idx === 1, ruzgar: ruzgar(m.seed),
      sonra: r => { kes(); const M_ = st.mac; if (r.terk && M_ && !M_.sunucuBitirdi) ag.gonder({ type: 'pvp_match_result', matchId: M_.id, result: 'lose' }); if (M_) M_.bitti = true; st.sonuc = r.terk ? 'Meydandan ayrıldın.' : r.zafer ? 'Kazandın.' : 'Kaybettin.';
        return G.pen({ k: 'Er Meydanı · dostça maç', t: r.terk ? 'Ayrıldın' : r.zafer ? 'Zafer' : 'Yenildin', body: '<p>' + (r.terk ? 'Maçtan ayrıldın; rakibin kazandı.' : r.zafer ? (M_ && M_.neden === 'forfeit' ? 'Rakibin meydandan ayrıldı.' : 'Rakibin topu sustu.') : 'Bu kez rakibin daha isabetliydi.') + ' Dostça maç ödülsüzdür: altın, ün ve sıralama yazılmaz.</p>', btns: [{ t: 'Odaya dön', cls: 'altin' }] }); } })
      .then(() => { EO2.topcu.sec('meydan'); });
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
  ag.dinle('pvp_match_end', m => { const M_ = st.mac; if (!M_ || (m.matchId && m.matchId !== M_.id)) return; M_.sunucuBitirdi = true; M_.neden = m.reason; if (st.oda) st.oda.state = 'ended'; if (B.active() && B.state() && !B.state().over) B.sonlandir(m.winner === m.you); });
  ag.dinle('pvp_room', m => { st.oda = m.room; st.ben = m.you; st.hata = ''; if (m.room.state === 'waiting') st.rakipKoptu = false;
    if (st.davet && m.room.state === 'waiting') { const to = st.davet; st.davet = null; yolla({ type: 'pvp_room_invite', to: to.h }); }   // oda kuruldu: bekleyen davet gider
    ciz(); });
  /* ---------- meydandan davet (js/meydan_ag.js çağırır) ----------
     Oyuncu meydanda yanına geldiği başka bir oyuncuyu Er Meydanı'na çağırır: oda yoksa kurulur, davet sunucudan gider.
     Çağrılan oyuncu kabul ederse odaya katılır; ikisi de Er Meydanı künyesine götürülür. Dostça, ödülsüz. */
  const meydanAc = () => { if (!G.live || B.active()) return; if (G.ekran() !== 'topcu') G.open('topcu'); EO2.topcu.sec('meydan'); };
  function davet(h, ad) {
    if (ag.durum() !== 'cevrimici') { G.toast('Sunucuya ulaşılamıyor; davet gönderilemedi.'); return false; }
    if (B.active() || st.kuyruk) { G.toast('Önce süren maçı ya da eşleşmeyi bitir.'); return false; }
    if (st.oda && st.oda.state === 'waiting' && st.oda.host === st.ben) yolla({ type: 'pvp_room_invite', to: h });
    else if (st.oda) { G.toast('Zaten bir odadasın. Önce odadan çık.'); meydanAc(); return false; }
    else { st.davet = { h, ad }; yolla(Object.assign({ type: 'pvp_room_create', mode: '1v1' }, kimlik())); }
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
  EO2.topcuPvp = { kunye, bagla, davet, durum: () => st };
})();
