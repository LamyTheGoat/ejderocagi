/* Ejder Ocağı 2.0 · Bire bir takas (EO2.takas)
   Sunucu tarafı: server/trade_service.js (davet, kabul, teklif, onay, vazgeç) ve /api/trade, /api/trade/state, /api/trade/peers.
   Kural burada değildir: neyin takas edilebileceğine, kimin neye sahip olduğuna ve aktarıma sunucu karar verir. Yalnız KAZANILMIŞ
   mal ve altın takas edilir (hesaba bağlı olan edilmez); iki taraf da onaylayınca aktarım tek adımda yapılır.

   AKIŞ
   Meydanda oyuncu kartından "Takas teklif et" → karşı taraf kabul ederse iki ekranda aynı takas masası açılır. Her iki oyuncu
   kendi tepsisine mal ya da altın koyar; tepsi değişince iki tarafın onayı düşer. İkisi de onaylayınca mallar el değiştirir;
   gelen ejderha ve yumurtalar ocağa ocak defteriyle iner. Takas beş dakika içinde bitmezse kendiliğinden düşer. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  const T = { trade: null, eko: null, onizle: {}, kisiler: [], mesgul: false, hata: '', davetAcik: false, bitenler: new Set() };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ben = () => (AG.kimlik() || {}).accountId;
  const oteki = () => T.trade ? T.trade.participants.find(p => p !== ben()) : null;
  const HATA = { trade_busy: 'İkinizden biri başka bir takasta.', game_not_started: 'Karşı tarafın ocağı henüz kurulmamış.', trade_revision_conflict: 'Tepsi az önce değişti; yeniden dene.', trade_offer_changed: 'Teklif değişti; yeniden bak ve onayla.',
    insufficient_gold: 'O kadar kazanılmış altının yok.', bound_asset: 'Hesaba bağlı mal takas edilemez.', asset_not_tradeable: 'Bu mal takas edilemez.', trade_reserved_asset: 'Bu mal başka bir işte ayrılmış.', market_reserved_asset: 'Bu mal Bedesten ilanında.',
    rate_limited: 'Çok hızlı gidiyorsun; biraz bekle.', trade_not_found: 'Takas bulunamadı.', invalid_trade_state: 'Takas artık bu adımda değil.', debt_blocked: 'Borç kapanmadan takas yapılamaz.' };
  const hataYaz = e => HATA[e && e.code] || (e && e.status ? 'İşlem yapılamadı (' + (e.code || e.status) + ').' : 'Bağlantı yok.');
  const adOf = acct => { const k = T.kisiler.find(p => p.accountId === acct); const h = k && k.handle; return (h && EO2.meydanAg && EO2.meydanAg.adOf(h)) || h || 'Terbiyeci'; };

  async function cek() { const j = await AG.istek('/api/trade/state'); T.trade = j.trade; T.eko = j.economy; T.onizle = j.previews || {}; return j; }
  async function kisileriCek() { try { T.kisiler = (await AG.istek('/api/trade/peers')).peers || []; } catch (_) { } }
  async function komut(type, extra) { if (T.mesgul) return false; T.mesgul = true; T.hata = ''; ciz();
    try { await AG.istek('/api/trade', { method: 'POST', body: Object.assign({ type, requestId: crypto.randomUUID() }, extra || {}) }); await cek(); return true; }
    catch (e) { T.hata = hataYaz(e); try { await cek(); } catch (_) { } return false; }
    finally { T.mesgul = false; isle(); } }
  HATA.trade_locked_by_table = 'Bahis kilitli; oyun bitene dek tepsi değişmez.';

  /* ---------- teklif (meydandaki oyuncu kartından) ---------- */
  async function teklif(handle, ad) {
    if (!AG.cevrimici()) { G.toast('Sunucuya ulaşılamıyor; takas teklif edilemedi.'); return; }
    await kisileriCek(); const k = T.kisiler.find(p => p.handle === handle);
    if (!k) { G.toast(esc_(ad || 'Terbiyeci') + ' şu an takas için görünmüyor.'); return; }
    if (await komut('invite', { targetId: k.accountId })) G.toast('Takas teklifin ' + esc_(ad || 'terbiyeciye') + ' gitti. Kabul ederse masa açılır.'); else if (T.hata) G.toast(T.hata, 'kotu');
  }

  /* ---------- durum değişince ---------- */
  async function isle() { const t = T.trade, me = ben(); if (!t) { if (G.ekran() === 'takas') G.close(); if (T.masa && T.masaCiz) T.masaCiz(); return; }
    if (T.masa && t.participants.includes(T.masa)) { T.bitenler.add(t.id);   // sonucu masa ekranı söyler; takas bildirimi çıkmaz
// Kıraathane masasının bahsi (js/masa.js): karşı tarafın daveti kendiliğinden kabul edilir
      if (t.status === 'invited' && t.participants[1] === me && !T.mesgul) { await komut('accept', { tradeId: t.id }); return; }
      if (t.status === 'active' && !T.kisiler.length) await kisileriCek();
      if (T.masaCiz) T.masaCiz(); return; }
    if (t.status === 'invited' && t.participants[1] === me && !T.davetAcik && G.live) { T.davetAcik = true; await kisileriCek();
      const v = await G.pen({ k: 'Takas', t: 'Takas teklifi', body: '<p><b>' + esc_(adOf(t.participants[0])) + '</b> seninle takas yapmak istiyor.</p><p>Masada yalnız kazanılmış mal ve altın el değiştirir; ikiniz de onaylamadan hiçbir şey gitmez.</p>', btns: [{ t: 'Geri çevir', v: false }, { t: 'Masaya otur', cls: 'altin', v: true }] });
      T.davetAcik = false; await komut(v ? 'accept' : 'reject', { tradeId: t.id }); return; }
    if (t.status === 'active') { if (!T.kisiler.length) await kisileriCek(); if (G.live && G.ekran() !== 'takas') G.open('takas'); else ciz(); return; }
    if (['completed', 'cancelled', 'rejected', 'expired'].includes(t.status) && !T.bitenler.has(t.id)) { T.bitenler.add(t.id);
      const yazi = { completed: 'Takas tamamlandı. Gelen mallar ocağına iniyor.', cancelled: 'Takastan vazgeçildi.', rejected: 'Takas teklifi geri çevrildi.', expired: 'Takasın süresi doldu.' }[t.status];
      if (t.participants.includes(me) && (t.status !== 'rejected' || t.participants[0] === me)) G.toast(yazi, t.status === 'completed' ? 'goal' : undefined);
      if (t.status === 'completed') { AG.yenile().catch(() => { }); if (EO2.ocakDefteri) EO2.ocakDefteri.esle(); if (EO2.audio && EO2.audio.chime) EO2.audio.chime(); }
      if (G.ekran() === 'takas') G.close(); }
  }
  const tazele = () => cek().then(isle, () => { });
  AG.dinle('trade_state', tazele); AG.dinle('trade_error', tazele);
  AG.dinle('durum', d => { if (d === 'cevrimici') setTimeout(tazele, 800); });

  /* ---------- mallar ---------- */
  const B = () => EO2.bedesten && EO2.bedesten.mal;
  const MDL = { dragon: 'ejder', egg: 'yumurta', item: 'kusam', food: 'besle' };
  function benimMallar() { const e = T.eko, out = []; if (!e || !e.game || !B()) return out; const ikiz = new Set((e.game.ocak && e.game.ocak.taban) || []);
    const ekle = (tur, alan, r, mal) => { const d = r.data || {}; if (ikiz.has(r.assetId) || d.funding !== 'earned') return; if (d.dead || d.task || d.busy || d.inK || d.hatching || d.heirloomId || d.tradeLocked) return; out.push({ tur, alan, id: r.assetId, mal }); };
    (e.dragons || []).forEach(r => ekle('dragon', 'dragons', r, B().dragon(r.data))); (e.eggs || []).forEach(r => ekle('egg', 'eggs', r, B().egg(r.data))); (e.items || []).forEach(r => ekle('item', 'items', r, B().item(r.data.id)));
    return out; }
  function onizleMal(id) { const o = T.onizle[id]; if (!o || !B()) return null; try { return o.kind === 'dragon' ? B().dragon(o.data) : o.kind === 'egg' ? B().egg(o.data) : o.kind === 'item' ? B().item(o.data.id) : null; } catch (_) { return null; } }
  const kart = (mal, id, ek) => '<span class="tk-es"' + (ek || '') + '><span class="tk-res">' + (mal ? mal.cizim : '<img alt="" src="assets/ik/mdl-sandik.webp">') + '</span><b>' + esc_(mal ? mal.ad : 'Mal') + '</b><small>' + esc_(mal ? mal.alt || '' : '') + '</small></span>';
  function tepsiHtml(acct, benim, rozet, isaretli) { const o = (T.trade.offers || {})[acct] || { gold: 0, items: [], dragons: [], eggs: [] }, onay = rozet ? !!isaretli : (T.trade.approvals || []).includes(acct);
    const ic = [...o.dragons, ...o.eggs, ...o.items].map(id => { const mal = onizleMal(id); return benim ? '<button type="button" class="tk-esb" data-cikar="' + esc_(id) + '" title="Tepsiden al">' + kart(mal, id) + '</button>' : kart(mal, id); }).join('') +
      (o.gold > 0 ? '<span class="tk-es altin"><span class="tk-res"><img alt="" src="assets/ik/para.webp"></span><b>' + o.gold + ' altın</b><small>kazanılmış</small></span>' : '');
    return '<div class="tk-tepsi ' + (benim ? 'ben' : 'o') + (onay ? ' onayli' : '') + '"><h3>' + (benim ? 'Senin tepsin' : esc_(adOf(acct)) + ' tepsisi') + '</h3><em class="tk-onay">' + (rozet || (onay ? 'Onayladı' : 'Onay bekliyor')) + '</em><div class="tk-ic">' + (ic || '<p class="tk-bos">' + (benim ? 'Soldan bir mal seç ya da altın koy.' : 'Henüz bir şey koymadı.') + '</p>') + '</div></div>'; }

  /* ---------- ekran ---------- */
  G.screen('takas', { k: 'Bire bir', t: 'Takas masası', cls: 'tk', bg: 'a:bd-sandik', draw(body) {
    const t = T.trade, me = ben(); if (!t || t.status !== 'active') { body.innerHTML = '<div class="ar-kilit bos"><p>Açık bir takas yok. Meydanda bir oyuncunun yanına gel ve <b>Takas teklif et</b>.</p></div>'; return; }
    const o = oteki(), benimT = t.offers[me] || { gold: 0, items: [], dragons: [], eggs: [] }, tepside = new Set([...benimT.items, ...benimT.dragons, ...benimT.eggs]);
    const mallar = benimMallar(), kazan = (T.eko && T.eko.funds && T.eko.funds.earned) || 0, onayim = (t.approvals || []).includes(me), kalan = Math.max(0, Math.round((t.expiresAt - Date.now()) / 60000));
    body.innerHTML = '<div class="tk-mal"><h3>Takas edebileceklerin</h3><div class="tk-izgara kay">' + (mallar.length ? mallar.map(m => '<button type="button" class="tk-esb' + (tepside.has(m.id) ? ' secili' : '') + '" data-koy="' + esc_(m.id) + '" data-alan="' + m.alan + '" aria-pressed="' + tepside.has(m.id) + '">' + kart(m.mal, m.id) + '</button>').join('') : '<p class="tk-bos">Takas edilebilecek kazanılmış malın yok. Arenada kazandığın altınla hesap tezgâhından ya da Bedesten\'den aldıkların burada görünür.</p>') + '</div>' +
      '<form class="tk-altin" data-altin="1"><label for="tkAltin"><img alt="" src="assets/ik/para.webp">Altın koy <small>kazanılmış: ' + kazan + '</small></label><div><input id="tkAltin" name="altin" type="number" inputmode="numeric" min="0" max="' + kazan + '" step="1" value="' + (benimT.gold || 0) + '"><button type="submit" class="gbtn kucuk">Koy</button></div></form></div>' +
      '<div class="tk-orta">' + tepsiHtml(me, true) + '<i class="tk-ok" aria-hidden="true"></i>' + tepsiHtml(o, false) +
      '<p class="tk-durum" role="status" aria-live="polite">' + (T.hata ? '<span class="kotu">' + esc_(T.hata) + '</span>' : onayim ? 'Onayladın. ' + esc_(adOf(o)) + ' da onaylayınca mallar el değiştirir.' : 'İki taraf da onaylayınca mallar el değiştirir. Tepsi değişirse onaylar düşer.') + ' <small>Kalan süre: ' + kalan + ' dk</small></p>' +
      '<div class="tk-eylem"><button type="button" class="gbtn" data-tk="vazgec">Takastan vazgeç</button><button type="button" class="gbtn altin buyuk" data-tk="onay" ' + (onayim || T.mesgul ? 'disabled' : '') + '>' + (onayim ? 'Onaylandı' : 'Onayla') + '</button></div></div>';
    const yeniTeklif = degis => { const y = { gold: benimT.gold || 0, items: [...benimT.items], dragons: [...benimT.dragons], eggs: [...benimT.eggs], food: Object.assign({}, benimT.food || {}) }; degis(y); return komut('offer', { tradeId: t.id, revision: t.revision, offer: y }); };
    body.querySelectorAll('[data-koy]').forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); const id = b.dataset.koy, alan = b.dataset.alan; yeniTeklif(y => { const i = y[alan].indexOf(id); if (i >= 0) y[alan].splice(i, 1); else y[alan].push(id); }); }));
    body.querySelectorAll('[data-cikar]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.cikar; yeniTeklif(y => { for (const a of ['items', 'dragons', 'eggs']) { const i = y[a].indexOf(id); if (i >= 0) y[a].splice(i, 1); } }); }));
    const f = body.querySelector('[data-altin]'); if (f) { const gir = f.elements.altin; for (const ad of ['keydown', 'keyup', 'keypress']) gir.addEventListener(ad, e => e.stopPropagation()); f.addEventListener('submit', e => { e.preventDefault(); const n = Math.max(0, Math.min(kazan, Math.floor(+gir.value || 0))); yeniTeklif(y => { y.gold = n; }); }); }
    body.querySelectorAll('[data-tk]').forEach(b => b.addEventListener('click', async () => { if (EO2.audio) EO2.audio.ui();
      if (b.dataset.tk === 'onay') komut('confirm', { tradeId: t.id, revision: t.revision, offerHash: t.offerHash });
      else { const v = await G.pen({ k: 'Takas', t: 'Takastan vazgeçilsin mi?', body: '<p>Tepsilerdeki her şey sahibinde kalır.</p>', btns: [{ t: 'Masada kal', v: false }, { t: 'Vazgeç', cls: 'kor', v: true }] }); if (v) komut('cancel', { tradeId: t.id }); } }));
  } });
  function ciz() { if (G.ekran() === 'takas') G.redraw(); }
  setInterval(() => { if (G.ekran() === 'takas' && T.trade && T.trade.status === 'active' && !T.mesgul) { if (T.trade.expiresAt <= Date.now()) komut('get', { tradeId: T.trade.id }); else ciz(); } }, 20000);
  setTimeout(tazele, 2500);
  EO2.takas = { teklif, durum: () => T, tazele, komut, mallar: benimMallar, tepsi: tepsiHtml, kart,
    masaKipi(hesap, cizici) { T.masa = hesap || null; T.masaCiz = hesap ? cizici : null; if (hesap) tazele(); } };
})();
