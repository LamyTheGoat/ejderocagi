/* Ejder Ocağı 2.0 · Han: ilişkiler, haftalık akşam, Ejder Dili ve ocaklar sıralaması
   Kurallar oyunun kendisidir (js/social.js, js/rival.js): haftada bir akşam, yakınlık eşikleri ve ayrıcalıklar, itiraf sahneleri,
   Hatice'nin yumurtası, Bilge Ejder'in üç dersi. Akış eski eve / eveopt / lang eylemleriyle aynı sıradadır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const BG = 'bg-sofra';

  async function evening(k) { if (S.evening === S.week) return; const N = SOC[k]; S.relSeen = S.relSeen || [];
    const st = socStage(k), id = k + ':' + st; let sc = N.scenes[st];
    if (st === 4 && (S.partner === k || S.relSeen.includes(id))) sc = null; else if (st < 4 && S.relSeen.includes(id)) sc = null;
    if (!sc) sc = { t: S.partner === k && N.date ? N.date : pick(N.chat), o: [['Sohbeti uzat.', S.partner === k ? 3 : 5, N.ad + ' ile gece uzadı.']], chat: true };
    const face = G.npcImg(N.npc), kick = 'Han · ' + N.unvan;
    const i = await G.vn({ bg: BG, face, name: N.ad, k: kick, text: sc.t, btns: sc.o.map((o, i) => { const why = o[3] === 'pay30' && S.gold < 30 ? 'Yeterli altın yok' : null; return { t: o[0], sub: why || '', off: why, v: i }; }) });
    const o = sc.o[i]; if (o[3] === 'pay30') { if (S.gold < 30) return; S.gold -= 30; }
    S.evening = S.week; if (!sc.chat) S.relSeen.push(id); addRel(k, o[1]); let extra = '';
    if (o[3] === 'partner') { S.partner = k; chron(N.ad + ' ile sevgili oldunuz.'); S.album = S.album || []; S.album.push({ w: S.week, kind: 'heart', title: N.ad, text: N.ad + ' ile o akşam bir şey değişti.', npc: N.npc }); extra = ' Artık sevgilisiniz: her hafta ejderhalarından biri bu mutluluktan pay alır.'; if (EO2.audio) EO2.audio.chirp(); }
    if (o[3] === 'gift') { const g = randomGenes({ q: 0.5 }); g.eye = ['A', 'A'];
      S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [pick(TRAIT_KEYS.filter(t => t !== 'vahsi'))], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: 'Hatice\'nin hediyesi' });
      chron('Hatice sana nadir bir yumurta hediye etti.'); extra = ' Nadir yumurta Yuva\'ya kondu.'; }
    await G.vn({ bg: BG, face, name: N.ad, k: kick, text: o[2] + extra, after: '<span class="etk ' + (o[1] >= 0 ? 'iyi' : 'kotu') + '">' + N.ad + ' ' + (o[1] >= 0 ? '+' : '') + o[1] + '</span>', btns: [{ t: 'Hana dön', cls: 'altin' }] });
    afterAction(true); G.redraw(); if (G.fx && o[1] > 0) setTimeout(() => G.fx.hearts('.han-bilgi .kalpler', 6 + o[1] / 2), 250); }

  /* Han sahnesi: seçili kişi sahnede büyük durur, bilgiler sahnenin üstünde yüzer, kadro altta madalyon sırasıdır. Kart ızgarası yok. */
  let sel = 'selin', lastSel = null;
  G.screen('han', { k: 'Kervansaray', t: 'Han', cls: 'hn', bg: BG, draw(body) {
    const used = S.evening === S.week, L = langLv(), next = LANG[L + 1], keys = [...Object.keys(SOC), 'bilge']; if (!keys.includes(sel)) sel = keys[0];
    const isB = sel === 'bilge', N = isB ? { npc: 'bilge', ad: 'Bilge Ejder', unvan: 'Ejder Dili öğretmeni' } : SOC[sel], r = isB ? 0 : rel(sel), partner = S.partner === sel, fresh = lastSel !== sel; lastSel = sel;
    const yol = isB ? LANG.slice(1).map((x, i) => '<li class="' + (L > i ? 'acik' : L === i ? 'sirada' : '') + '"><em>' + ['I', 'II', 'III'][i] + '</em><div><b>' + x.ad + '</b><span>' + x.d + '</span></div></li>').join('')
      : N.perks.map(p => '<li class="' + (r >= p[0] ? 'acik' : '') + '"><em>' + p[0] + '</em><div><b>' + p[1] + '</b>' + (r < p[0] ? '<span>' + (p[0] - r) + ' yakınlık daha</span>' : '<span>Açıldı</span>') + '</div></li>').join('');
    const dolu = isB ? L / 3 * 100 : r;
    body.innerHTML = '<div class="han-buyuk' + (fresh ? ' gir' : '') + '"><img alt="" src="' + G.npcImg(N.npc) + '"></div>' +
      '<div class="han-bilgi' + (fresh ? ' gir' : '') + '"><small class="ust">' + N.unvan + (isB || N.romance ? '' : ' · dostluk') + '</small><h2>' + N.ad + (partner ? '<i class="sevgili">Sevgilin</i>' : '') + '</h2>' +
        (isB ? '<p class="soz">“Dil öğrenen, ejderhasının susarken ne dediğini duyar.”</p>' : '<div class="kalpler" title="Yakınlık ' + r + ' / 100">' + Array.from({ length: 10 }, (_, i) => '<i class="' + (r >= (i + 1) * 10 ? 'dolu' : r > i * 10 ? 'yarim' : '') + '"></i>').join('') + '<b>' + r + '</b></div>') +
        '<ol class="yol" style="--dolu:' + dolu + '%">' + yol + '</ol>' +
        (isB ? (next ? '<button type="button" class="gbtn altin buyuk" data-lang="1" ' + (S.gold < next.fiyat || S.un < next.un ? 'disabled' : '') + '>' + next.ad + ' öğren<small>' + next.fiyat + ' altın' + (S.un < next.un ? ' · ' + next.un + ' ün gerekir' : '') + '</small></button>' : '<p class="soz">Bütün dersleri tamamladın.</p>')
          : '<button type="button" class="gbtn ' + (used ? '' : 'altin') + ' buyuk" data-eve="' + sel + '" ' + (used ? 'disabled' : '') + '>' + (used ? 'Bu akşam doldu' : partner ? 'Birlikte bir akşam' : 'Akşamı onunla geçir') + '<small>' + (used ? 'Haftaya yine gel' : 'Haftada bir akşam') + '</small></button>') + '</div>' +
      '<div class="kadro">' + keys.map(k => { const n = k === 'bilge' ? 'bilge' : SOC[k].npc, v = k === 'bilge' ? ['', 'I', 'II', 'III'][L] : rel(k); return '<button type="button" class="madalyon' + (S.partner === k ? ' sevgili' : '') + '" data-kisi="' + k + '" aria-pressed="' + (k === sel) + '" title="' + (k === 'bilge' ? 'Bilge Ejder' : SOC[k].ad) + '"><img alt="" src="' + G.npcImg(n) + '">' + (v !== '' ? '<b>' + v + '</b>' : '') + '<span>' + (k === 'bilge' ? 'Bilge' : SOC[k].ad.replace('Usta ', '')) + '</span></button>'; }).join('') + '</div>';
    on(body, '[data-kisi]', b => { sel = b.dataset.kisi; render(); });
    on(body, '[data-eve]', b => evening(b.dataset.eve));
    on(body, '[data-lang]', b => { const n = LANG[langLv() + 1]; if (!n || S.gold < n.fiyat || S.un < n.un) return; S.gold -= n.fiyat; S.lang = langLv() + 1; chron('Bilge Ejder\'den ' + n.ad + ' öğrendin.'); toast('<b>' + n.ad + '</b> öğrenildi. ' + n.d, 'goal'); if (G.fx) { G.fx.stars(b, 16); G.fx.flash('rgba(160,220,255,.35)'); } afterAction(); });
  } });

  /* Ün tablosu: rakip ocaklar ve şampiyonları (js/rival.js rankList) */
  G.screen('siralama', { k: 'Ocaklar sıralaması', t: 'Ün Tablosu', cls: 'sr', bg: 'bg-meydan', draw(body) { const L = rankList(), best = S.dragons.slice().sort((a, b) => sum(STATS.map(k => b.st[k])) - sum(STATS.map(k => a.st[k])))[0];
    body.innerHTML = '<div class="sancaklar">' + L.map((r, i) => { const prof = r.aiProfile && RIVAL_AI_PROFILES[r.aiProfile], el = r.me ? (best ? best.el : 'ates') : r.champ ? r.champ.el : 'ates', img = r.me ? (best ? G.img(best) : '') : G.OLD + 'img/dr-' + el + '-yetiskin.webp';
      return '<div class="sancak-sar' + (r.me ? ' ben' : '') + '" style="animation-delay:' + (i * 0.09) + 's"><div class="sancak' + (r.me ? ' ben' : '') + '" style="--el:' + G.ELC[el] + ';--sira:' + i + ';animation-delay:' + (i * 0.09) + 's,' + (i * 0.4) + 's"><b class="no n' + (i + 1) + '">' + (i + 1) + '</b>' + (img ? '<img alt="" src="' + img + '">' : '') + (r.npc ? '<img class="kisi" alt="" src="' + G.npcImg(r.npc) + '">' : '') +
        '<h3>' + esc(r.ad) + '</h3><small>' + esc(r.sahip) + (r.me ? (best ? ' · ' + esc(best.name) : '') : r.champ ? ' · ' + esc(r.champ.name) : '') + '</small><small>' + (r.me ? 'Senin komutanlığın' : esc(prof ? prof.ad : 'Dengeli')) + ' · güç ~' + Math.round(r.power) + '</small><span class="un">' + r.un + '</span></div></div>'; }).join('') + '</div>' +
      '<p class="sira-not">Sancaklar üne göre dizilir. Güç, ocağın en iyi ejderhasının dört değerinin ortalamasıdır; rakipler ocağın yükseldikçe antrenman temposunu artırır.</p>'; } });
  G.navOf = Object.assign(G.navOf || {}, { han: [['han', 'Han'], ['siralama', 'Ün Tablosu']], siralama: [['han', 'Han'], ['siralama', 'Ün Tablosu']] });
})();
