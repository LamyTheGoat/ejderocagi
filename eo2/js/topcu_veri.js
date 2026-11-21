/* Ejder Ocağı 2.0 · Topçu ve Zindan verisi
   Eski oyunun zindan dosyalarından (js/minigame/raids/*) aynen taşınan içerik: aşama arazileri (aynı formüller), düşman ve boss
   canları, konumları, boss hamle havuzları, hamle hasarları, faz eşikleri, zayıf nokta ölçüleri. Ölçüler eski oyunun pikselidir;
   motor (js/battle.js) bunları dünya birimine çevirir. Çizimler eski oyunun kendi çizimleridir (img/sahmeran, komutan, abra, extreme).
   Kapsam: her zindanın dört aşamalı Normal ve Ağır seferi. Cehennem (9 ve 12 aşama, beş fazlı boss) bu dosyada yoktur. */
(function () {
  'use strict';
  const EO2 = window.EO2, B = EO2.battle, A = B.api, OLD = (EO2.game && EO2.game.OLD) || window.EO2_OLD || 'oyun/', I = p => OLD + 'img/' + p, u = A.u, Y_ = A.Y_;
  const arazi = (tema, aile, f, tohum) => ({ tema, aile, tohum, top: wx => { const y = f(wx * A.PX); return y >= 1440 ? null : Y_(y); } });
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;

  /* ---------- düşmanlar ---------- */
  Object.assign(B.MOB, {
    cobra: { spr: { idle: I('sahmeran/cobra_idle_1.webp'), atk: I('sahmeran/cobra_spit_3.webp'), hit: I('sahmeran/cobra_hit_4.webp') }, h: 2.4, yon: 1, el: 'venom' },
    oracle: { spr: { idle: I('extreme/sub_oracle_1.webp'), atk: I('extreme/sub_oracle_2.webp') }, h: 2.7, yon: 1, el: 'venom', sabit: true },
    viper: { spr: { idle: I('sahmeran/viper_fly_1.webp'), idle2: I('sahmeran/viper_fly_2.webp') }, h: 2.7, yon: 1, el: 'buz', ucan: true },
    drake: { spr: { idle: I('komutan/drake_idle_1.webp'), atk: I('komutan/drake_breath_3.webp'), hit: I('komutan/drake_hit_4.webp') }, h: 2.2, yon: 1, el: 'magma' },
    wyvern: { spr: { idle: I('komutan/wyvern_fly_1.webp'), idle2: I('komutan/wyvern_fly_2.webp') }, h: 2.9, yon: 1, el: 'magma', ucan: true },
    /* Karkinos: alçak atış kıskaçtan seker (38° ve altı: hasarın %40'ı), yüksek aşırtma kabuğu kırar (52° ve üstü: 1,5 kat) */
    karkinos: { spr: { idle: I('abra/mob_karkinos_body.webp') }, h: 2.3, yon: -1, el: 'buz', atis: { sure: 1.5 },
      hasar(e, s, dmg, not) { const aci = s.aci != null ? s.aci : 38; if (aci <= 38) { not.not = 'Kıskaç kalkanı: yüksek açıyla aşırt'; not.col = '#9fe0ff'; return Math.max(15, Math.round(dmg * 0.40)); } if (aci >= 52) { A.M.ist.kritik++; not.not = 'Aşırtma: kabuk kırıldı ×1,5'; not.crit = 1; return Math.round(dmg * 1.5); } return dmg; } },
  });
  /* ---------- sahne eşyaları (kervan) ---------- */
  const kutu = (renk, kusak) => (x, px, py, sc) => { const w = 1.1 * sc, h = 0.95 * sc; x.fillStyle = renk; x.strokeStyle = '#2a160e'; x.lineWidth = 2.5; x.beginPath(); x.roundRect(px - w / 2, py - h, w, h, 5); x.fill(); x.stroke(); x.fillStyle = kusak; x.fillRect(px - w / 2, py - h * 0.72, w, h * 0.12); x.fillRect(px - w / 2, py - h * 0.3, w, h * 0.12); x.strokeRect(px - w / 2, py - h * 0.72, w, h * 0.12); };
  Object.assign(B.PROP, {
    araba: { ad: 'Kervan arabası', ciz(x, px, py, sc) { const w = 3.6 * sc, h = 1.0 * sc, yy = py - 0.75 * sc; x.lineJoin = 'round'; x.strokeStyle = '#2a160e'; x.lineWidth = 3;
      x.fillStyle = '#f0e2c4'; x.beginPath(); x.moveTo(px - w * 0.46, yy - h); x.quadraticCurveTo(px - w * 0.44, yy - h - 1.7 * sc, px, yy - h - 1.75 * sc); x.quadraticCurveTo(px + w * 0.44, yy - h - 1.7 * sc, px + w * 0.46, yy - h); x.closePath(); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(90,60,40,.45)'; x.lineWidth = 2; for (const k of [-0.25, 0, 0.25]) { x.beginPath(); x.moveTo(px + w * k, yy - h); x.quadraticCurveTo(px + w * k * 0.9, yy - h - 1.2 * sc, px + w * k * 0.8, yy - h - 1.7 * sc); x.stroke(); }
      x.strokeStyle = '#2a160e'; x.lineWidth = 3; x.fillStyle = '#8a5a34'; x.beginPath(); x.roundRect(px - w / 2, yy - h, w, h, 6); x.fill(); x.stroke(); x.fillStyle = '#213270'; x.fillRect(px - w / 2 + 4, yy - h * 0.62, w - 8, h * 0.2); x.fillStyle = '#e8b64c'; x.fillRect(px - w / 2 + 4, yy - h * 0.42, w - 8, h * 0.06);
      for (const k of [-0.3, 0.3]) { const cx = px + w * k, cy = py - 0.52 * sc, r = 0.52 * sc; x.fillStyle = '#5a3a24'; x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = '#c99a4a'; x.beginPath(); x.arc(cx, cy, r * 0.22, 0, 6.3); x.fill(); x.lineWidth = 2; for (let a = 0; a < 6.2; a += 0.785) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); } x.lineWidth = 3; }
      const lx = px + w * 0.5 + 0.2 * sc, ly = yy - h - 0.5 * sc, g = x.createRadialGradient(lx, ly, 0, lx, ly, 1.1 * sc); g.addColorStop(0, 'rgba(255,210,120,.8)'); g.addColorStop(1, 'rgba(255,180,80,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, 1.1 * sc, 0, 6.3); x.fill(); x.fillStyle = '#ffe9a8'; x.beginPath(); x.roundRect(lx - 0.1 * sc, ly - 0.14 * sc, 0.2 * sc, 0.28 * sc, 3); x.fill(); x.stroke(); } },
    sandik: { ikmal: true, ciz: kutu('#b98a4e', '#e8c36a'), ad: 'İkmal sandığı' },
    fici: { patlar: true, ciz: kutu('#8a3a2a', '#3a2018'), ad: 'Barut fıçısı' },
  });

  /* ---------- zayıf nokta ve gövde vuruşu (eski updateProjectilesAndHazards) ---------- */
  const kritik = (b, s, ek) => { const p = A.M.ben, acik = b.acik ? 1 + b.acik : 1; if (b.acik) { A.yazi(b.x, b.y + b.h + 2.8, 'Açık yakalandı', { kucuk: 1, col: '#8fffe0' }); b.acik = 0; } return (2.7 + (ek || 0) + (p.crit || 0) * 0.008) * acik; };
  const kiyametBoz = b => { if (b.kiyamet > 0) { b.kiyamet = 0; b.sersem = 1; A.yazi(b.x, b.y + b.h + 2.6, 'Kıyamet büyüsü bozuldu', { col: '#8ff0a4', crit: 1 }); } };
  function vurus(o) { return function (s, b) { const px = (x, y) => Math.hypot(s.x - x, s.y - y) * A.PX, f = b.face || -1, M = A.M;
      if (o.kalp && px(b.x + f * u(24), b.y + u(190)) <= 64) { const k = kritik(b, s, 0.2), h = Math.round(s.dmg * k); M.ist.kritik++; A.hasarBoss(b, h, true, 'Kor kalp ×' + k.toFixed(1).replace('.', ','), true); kiyametBoz(b); A.sars(1.2); A.pankart('Kor Kalp!', '', 'hit'); return true; }
      if (px(b.x + f * u(o.tac[0]), b.y + u(o.tac[1])) <= o.tac[2]) { const k = kritik(b, s), h = Math.round(s.dmg * k); M.ist.kritik++; A.hasarBoss(b, h, true, o.tacAd + ' ×' + k.toFixed(1).replace('.', ','), true); kiyametBoz(b); A.sars(1.1); A.pankart(o.tacAd + '!', '', 'hit'); return true; }
      const kutuda = Math.abs(s.x - b.x) * A.PX <= o.kutu[0] && s.y >= b.y - u(15) && s.y <= b.y + u(o.kutu[1]);
      if (px(b.x, b.y + u(o.govde[0])) <= o.govde[1] || kutuda) { if (s.ayaz) b.chill = 2; A.hasarBoss(b, s.dmg, s.delici); return true; } return false; }; }
  const zayif = o => b => { const f = b.face || -1, z = [{ x: b.x + f * u(o.tac[0]), y: b.y + u(o.tac[1]), r: u(o.tac[2]), ad: o.tacAd }]; if (o.kalp) z.push({ x: b.x + f * u(24), y: b.y + u(190), r: u(64), ad: 'Kor kalp' }); return z; };
  const iki = (b, p, sx, sy, d1, d2, dmg, el1, el2, pat) => { A.nisanliAt(b, b.x + (b.face || -1) * u(sx), b.y + u(sy), p.x + u(d1), p.y + u(30), dmg, el1, pat); A.nisanliAt(b, b.x + (b.face || -1) * u(sx), b.y + u(sy), p.x + u(d2), p.y + u(30), dmg, el2, pat); };
  const agiz = (b, dx, dy) => [b.x + (b.face || -1) * u(dx), b.y + u(dy)];
  const ALT = { tac: [14, 175, 48], govde: [110, 82], kutu: [95, 220] };

  Object.assign(B.BOSS, {
    /* --- ara bosslar: canın %55'inde öfkelenir ve 220 kalkan alır --- */
    sirca_golem: { spr: { idle: I('extreme/sub_sirca_golem_1.webp'), atk: I('extreme/sub_sirca_golem_2.webp') }, h: 4.4, el: 'toprak', bolge: 210, yuzK: [0.5, 0.2, 0.36], giris: 'Camasb\'ın kanını taşıyan hiçbir fani bu mahzenden geçemez.', veda: 'Kristalim... çatlıyor...',
      fazlar: [{ faz: 2, oran: 0.55, kalkan: 220, ad: 'Öfke Patlaması', soz: 'Sırça yumruğum yeri yaracak!' }], vurus: vurus(Object.assign({ tacAd: 'Baş kritiği' }, ALT)), zayif: zayif(Object.assign({ tacAd: 'Baş' }, ALT)),
      hamle: () => 'deprem', hamleler: { deprem: { ad: 'Sırça Prizma Depremi', soz: 'Kristal sütunlar yükselsin!' } },
      uygula(b, p, h, dm) { A.sars(0.8); A.halka(b.x - u(80), b.y, u(230) / 2.4, A.EL.toprak); A.carve(b.x + b.face * u(140), b.y, u(42)); iki(b, p, 65, 135, -22, 28, Math.round(165 * dm), 'toprak', 'venom', 48); } },
    behemoth: { spr: { idle: I('extreme/sub_behemoth_1.webp'), atk: I('extreme/sub_behemoth_2.webp') }, h: 4.2, yon: 1, el: 'magma', bolge: 240, yuzK: [0.72, 0.42, 0.4], giris: 'Örsün başında otuz yıldır nöbetteyim.', veda: 'Örs... soğuyor...',
      fazlar: [{ faz: 2, oran: 0.55, kalkan: 220, ad: 'Öfke Patlaması', soz: 'Sırtımdaki yanardağ patlıyor!' }], vurus: vurus(Object.assign({ tacAd: 'Boynuz kritiği' }, ALT)), zayif: zayif(Object.assign({ tacAd: 'Boynuz' }, ALT)),
      hamle: () => 'pusku', hamleler: { pusku: { ad: 'Bazalt Volkan Püskürmesi', soz: 'Kızgın lavlar altında kal!' } },
      uygula(b, p, h, dm) { A.sars(0.9); A.halka(b.x - u(90), b.y, u(250) / 2.4, A.EL.magma); A.carve(b.x + b.face * u(150), b.y, u(46)); iki(b, p, 75, 155, -26, 28, Math.round(175 * dm), 'magma', 'magma', 52); } },
    /* Dalgıç ve Mercan Golemi: miğfer camı 2 kat kritik verir ve top kolunu bir tur kilitler; göğüs zırhı hasarı %30 azaltır */
    mercan_golem: { spr: { idle: I('abra/mob_coral_golem.webp') }, h: 4.6, yon: -1, el: 'buz', bolge: 225, yuzK: [0.62, 0.2, 0.36], giris: 'Batık tersanenin kapısı bana emanet.', veda: 'Miğferim... su alıyor...',
      fazlar: [{ faz: 2, oran: 0.55, kalkan: 220, ad: 'Abisal Basınç Zırhı', soz: 'Dev demir çapam rıhtımı yaracak!' }],
      vurus(s, b) { const px = (x, y) => Math.hypot(s.x - x, s.y - y) * A.PX, dx = Math.abs(s.x - b.x) * A.PX, dy = (s.y - b.y) * A.PX;
        if (px(b.x - u(10), b.y + u(196)) <= 62 || (dx <= 78 && dy >= 152 && dy <= 252)) { b.tutuk = 1; A.M.ist.kritik++; A.hasarBoss(b, Math.round(s.dmg * 2.0), true, 'Miğfer camı ×2,0 · top kilitlendi', true); A.sars(1.1); A.pankart('Lumbuz!', '', 'hit'); return true; }
        if (dx <= 112 && dy >= -20 && dy <= 152) { A.hasarBoss(b, Math.round(s.dmg * 0.70), s.delici, 'Mercan zırhı emdi: miğfer camını vur'); return true; } return false; },
      zayif: b => [{ x: b.x - u(14), y: b.y + u(182), r: u(40), ad: 'Miğfer camı ×2' }],
      hamle: () => 'capa', hamleler: { capa: { ad: 'Çapa Darbesi ve Borda Topu', soz: 'Borda topu, ateş!' } },
      uygula(b, p, h, dm) { A.sars(0.8); const tutuk = b.tutuk > 0; if (tutuk) { b.tutuk--; A.yazi(b.x, b.y + b.h + 1, 'Top kolu tutukluk yaptı', { kucuk: 1, col: '#7fe8d8' }); }
        if (tutuk || A.tur() % 2 === 1) { A.halka(b.x - u(95), b.y, u(250) / 2.4, A.EL.buz); A.nisanliAt(b, b.x - u(65), b.y + u(135), p.x, p.y + u(30), Math.round(170 * dm), 'buz', 52, { sure: 1.5 }); }
        else { A.nisanliAt(b, b.x - u(65), b.y + u(145), p.x - u(24), p.y + u(30), Math.round(165 * dm), 'buz', 48, { sure: 1.5 }); A.nisanliAt(b, b.x - u(65), b.y + u(145), p.x + u(26), p.y + u(30), Math.round(165 * dm), 'firtina', 48, { sure: 1.65 }); } } },

    /* --- Yılan Kraliçe Şahmeran: tacı zayıf nokta; %62'de Kızıl Taç Öfkesi (300 kalkan), %28'de Yılan Kıyameti --- */
    sahmeran: (() => { const o = { tac: [18, 295, 66], tacAd: 'Taç kritiği', govde: [175, 122], kutu: [145, 360] }; return {
      spr: { idle: I('sahmeran/sahmeran_idle_1.webp'), idle2: I('sahmeran/sahmeran_idle_2.webp'), atk: I('sahmeran/sahmeran_attack.webp'), hit: I('sahmeran/sahmeran_hit.webp'), ofke: I('sahmeran/sahmeran_enrage.webp') }, durum: b => b.faz >= 2 ? I('sahmeran/sahmeran_enrage.webp') : null,
      h: 6.9, el: 'venom', bolge: 210, yuzK: [0.47, 0.17, 0.3], giris: 'Ocağın varisi, kehribar kuyusuna barış için mi indin, kan için mi?', veda: 'Ateşinde dedenin onuru var... Sırça Saray sana açık.',
      laflar: ['Gözlerin tacımı mı arıyor? Vurabilirsen vur!', 'Camasb da böyle cesur bakardı. Sonunu bilirsin.', 'Bin yıllık zehrim, senin bir nefeslik ateşin.'],
      fazlar: [{ faz: 2, oran: 0.62, kalkan: 300, ad: 'Kızıl Taç Öfkesi', soz: 'Kızıl tacım uyandı!' }, { faz: 3, oran: 0.28, kiyamet: 2, ad: 'Yılan Kıyameti', soz: 'Sırça Saray üstüne çöksün!' }],
      vurus: vurus(o), zayif: zayif({ tac: o.tac, tacAd: 'Altın taç' }),
      hamle: b => { const h = b.faz >= 3 ? ['tufan', 'tas', 'isin'] : b.faz >= 2 ? ['isin', 'tufan', 'tas'] : ['isin', 'tufan', 'yagmur']; return h[A.tur() % h.length]; },
      hamleler: { isin: { ad: 'Çifte Engerek Ölüm Işını', soz: 'Engereklerim, ısırın!' }, tufan: { ad: 'Zümrüt Asit Tufanı', soz: 'Asit gölü yükselsin!' }, tas: { ad: 'Sırça Taşlaştırma Bakışı', soz: 'Gözlerime bak ve taş kesil!' }, yagmur: { ad: 'Kehribar Sütun Yağmuru', soz: 'Tavan başına yıkılsın!' } },
      uygula(b, p, h, dm) { const [gx, gy] = b.D.agiz || [85, 195], [ax, ay] = agiz(b, gx, gy);   // agiz: merminin çıktığı nokta (yeni çizimde yay)
        if (h === 'isin') { A.sars(0.7); A.isin(ax, ay + u(25), p.x, p.y + u(52), A.EL.venom); A.isin(ax, ay - u(20), p.x, p.y + u(28), [255, 215, 106]); iki(b, p, gx, gy, -20, 22, Math.round(185 * dm), 'venom', 'venom', 48); }
        else if (h === 'tufan') { A.sars(0.7); A.halka(b.x - u(95), b.y + u(120), u(260) / 2.4, A.EL.venom); iki(b, p, gx, gy - 10, -26, 26, Math.round(175 * dm), 'venom', 'venom', 52); }
        else if (h === 'tas') { A.sars(0.6); A.isin(ax, ay + u(15), p.x, p.y + u(46), [255, 215, 106]); if (p.shield > 0) A.yazi(p.x, p.y + 3, 'Taşlaştırma engellendi', { kucuk: 1, col: '#ffe08a' }); else { p.sta = Math.max(25, p.sta - 35); A.yazi(p.x, p.y + 3, 'Taşlaştırma: −35 nefes', { col: '#b8e08a' }); } A.nisanliAt(b, ax, b.y + u(gy - 10), p.x, p.y + u(30), Math.round(175 * dm), 'venom', 48); }
        else { A.sars(0.7); A.isin(ax, ay + u(40), p.x, p.y + u(42), [255, 215, 106]); A.meteor(b, p, 2, Math.round(185 * dm), 'toprak', 54); A.nisanliAt(b, ax, b.y + u(gy + 25), p.x, p.y + u(30), Math.round(190 * dm), 'toprak', 52); } } }; })(),

    /* --- Başkomutan Kalgarot: göğsündeki kor kalp ve boynuzu zayıf nokta; %62'de Kanat Kasırgası (300 kalkan), %28'de Kıyamet Çekirdeği --- */
    kalgarot: (() => { const o = { kalp: true, tac: [42, 315, 66], tacAd: 'Boynuz kritiği', govde: [185, 140], kutu: [165, 385] }; return {
      spr: { idle: I('komutan/komutan_idle_1.webp'), idle2: I('komutan/komutan_idle_2.webp'), atk: I('komutan/komutan_breath.webp'), hit: I('komutan/komutan_hit.webp') }, durum: b => b.faz >= 3 ? I('komutan/komutan_enrage.webp') : null, ek: [I('komutan/komutan_enrage.webp')],
      h: 7.4, yon: 1, el: 'magma', bolge: 240, yuzK: [0.6, 0.2, 0.3], giris: 'Kaldera\'nın bazalt sütunları altında adımını dikkatli at, ejder çocuğu.', veda: 'Zincirlerim... çözülüyor. Ateşin beni özgür kıldı.',
      laflar: ['Hah! Görmek istediğim öfke bu. Gel bakalım!', 'Kül Yutan\'ın sağ koluna mı kafa tutuyorsun?', 'Otuz yıldır bu kalderadan sağ çıkan olmadı.'],
      fazlar: [{ faz: 2, oran: 0.62, kalkan: 300, ad: 'Kanat Kasırgası', soz: 'Kanatlarım kalderayı süpürsün!' }, { faz: 3, oran: 0.28, kiyamet: 2, ad: 'Kıyamet Çekirdeği', soz: 'Çekirdeğim tutuştu. Kaçacak yer yok!' }],
      vurus: vurus(o), zayif: zayif({ kalp: true, tac: o.tac, tacAd: 'Boynuz' }),
      hamle: b => { const h = b.faz >= 3 ? ['kuyruk', 'zincir', 'nova'] : b.faz >= 2 ? ['kuyruk', 'dalis', 'zincir'] : ['dalis', 'kuyruk', 'zincir']; return h[A.tur() % h.length]; },
      hamleler: { dalis: { ad: 'Meteor Dalışı', soz: 'Gök başına yıkılsın!' }, kuyruk: { ad: 'Obsidiyen Kuyruk Depremi', soz: 'Yer yarılsın!' }, zincir: { ad: 'Kor Zincir Kasırgası', soz: 'Otuz yıllık zincirlerim, savrulun!' }, nova: { ad: 'Süpernova Kıyamet Çekirdeği', soz: 'Mavi kor her şeyi yutsun!' } },
      uygula(b, p, h, dm) { const f = b.face || -1;
        if (h === 'dalis') { A.sars(0.9); A.halka(b.x + f * u(110), b.y + u(180), u(240) / 2.4, A.EL.magma); A.meteor(b, p, b.faz >= 3 ? 3 : 2, Math.round(185 * dm), 'magma', 58); A.nisanliAt(b, b.x + f * u(110), b.y + u(280), p.x, p.y + u(30), Math.round(205 * dm), 'magma', 62); }
        else if (h === 'kuyruk') { A.sars(0.9); A.halka(b.x + f * u(120), b.y, u(290) / 2.4, A.EL.magma); A.halka(b.x + f * u(260), b.y, u(220) / 2.4, [255, 215, 106]); A.carve(b.x + f * u(190), b.y, u(52)); iki(b, p, 95, 110, -32, 36, Math.round(180 * dm), 'magma', 'magma', 56); }
        else if (h === 'zincir') { A.sars(0.8); A.isin(b.x + f * u(110), b.y + u(210), p.x, p.y + u(48), A.EL.magma); A.isin(b.x + f * u(110), b.y + u(165), p.x + u(28), p.y + u(24), [255, 215, 106]); iki(b, p, 95, 185, -18, 24, Math.round(190 * dm), 'magma', 'magma', 52); }
        else { A.sars(0.9); A.halka(b.x + f * u(110), b.y + u(210), u(310) / 2.4, A.EL.bluekor); A.isin(b.x + f * u(110), b.y + u(225), p.x, p.y + u(42), A.EL.bluekor); A.meteor(b, p, 3, Math.round(195 * dm), 'bluekor', 56); A.nisanliAt(b, b.x + f * u(95), b.y + u(210), p.x, p.y + u(30), Math.round(205 * dm), 'bluekor', 56); } } }; })(),

    /* --- Derya Yılanı Abra: denizin içinden yükselir. Baş 1,4 kat; boyun pulu %30 emer; tsunamiden sonra kuyruk yüzgeci bir tur yüzeye çıkar,
           iki ayrı turda vurulursa Abra bir tur sersemler (baş 2 kat). %70'te Suya Dalış (280 kalkan), %40'ta kuyruk hep yüzeyde (320 kalkan) --- */
    abra: { spr: { idle: I('abra/abra_head_idle.webp'), atk: I('abra/abra_head_attack.webp'), hit: I('abra/abra_head_stagger.webp') }, durum: b => b.sersemTur > 0 ? I('abra/abra_head_stagger.webp') : null, ek: [I('abra/abra_tail_fin_v2.webp')],
      h: 11.5, yon: -1, cx: 0.42, taban: 1, el: 'buz', bolge: 225, suda: 1300, arkada: true, lafsiz: true, yuzK: [0.36, 0.26, 0.42], giris: 'Kadırgan üçe bölündü, sıra sende.', veda: 'Derinler... beni geri çağırıyor.',
      laflar: ['Fosforlu pullarıma dokunabileceğini mi sandın?', 'Bu deniz yüz donanma yuttu. Sen bir lokmasın.'],
      fazlar: [{ faz: 2, oran: 0.70, kalkan: 280, ad: 'Suya Dalış', soz: 'Derin sulara dalıyorum!', yap: b => { b.lafZorla = true; } }, { faz: 3, oran: 0.40, kalkan: 320, ad: 'Kuyruk Yüzgeci Yüzeyde', soz: 'Kuyruğumla denizi şahlandıracağım!', yap: b => { b.lafZorla = true; b.kuyrukHedef = 1; } }],
      kur(b) { b.dalis = 1; b.dalisHedef = 0; b.kuyruk = 0; b.kuyrukHedef = 0; b.kuyrukTur = 0; b.kuyrukVurus = 0; b.sonKuyruk = -1; b.sersemTur = 0; b.direnc = 0; },
      dal: b => { const dt = 1 / 60; b.dalis += Math.sign(b.dalisHedef - b.dalis) * Math.min(Math.abs(b.dalisHedef - b.dalis), dt * 0.9); b.kuyruk += Math.sign(b.kuyrukHedef - b.kuyruk) * Math.min(Math.abs(b.kuyrukHedef - b.kuyruk), dt * 0.8); return b.dalis * 10.5; },
      gizli: b => b.dalis > 0.55,
      kuyrukYer: b => ({ x: b.x + 8.5, ust: Y_(1238) + b.kuyruk * 4.2 }),
      bas: b => ({ x: b.x - 0.95, y: b.y + 8.4 - b.dalis * 10.5 }),      // çizimdeki başın yeri
      vurus(s, b) { const D = B.BOSS.abra, su = Y_(1238), bat = b.dalis > 0.55, k = D.kuyrukYer(b), bs = D.bas(b), bx = bs.x, by = bs.y, px = Math.hypot(s.x - bx, s.y - by) * A.PX, M = A.M;
        const kuyrukta = b.kuyruk > 0.5 && !bat && Math.abs(s.x - k.x) * A.PX <= 58 && s.y <= k.ust - u(20) && s.y >= su + u(10), basta = !bat && px <= 92, boyunda = !bat && Math.abs(s.x - (b.x + 2.2)) <= 1.7 && s.y <= by - u(60) && s.y >= su + u(10);
        if (bat && (Math.abs(s.x - b.x) * A.PX <= 180)) { if (s.y < su + 0.6) { A.yazi(s.x, su + 1.5, 'Abra su altında', { kucuk: 1, col: '#9fe0ff' }); return true; } return false; }
        if (kuyrukta) { const h = Math.round(s.dmg * 1.35); M.ist.kritik++; if (b.direnc > 0) A.hasarBoss(b, h, true, 'Kuyruk isabeti · sersemlemeye dirençli', true); else { if (b.sonKuyruk !== M.ist.tur) { b.sonKuyruk = M.ist.tur; b.kuyrukVurus++; }
            if (b.kuyrukVurus >= 2) { b.sersemTur = 1; b.kuyrukVurus = 0; A.hasarBoss(b, h, true, 'Kuyruk yüzgeci kırıldı: Abra sersemledi', true); A.pankart('Sersemledi!', 'Başına nişan al', 'hit'); } else A.hasarBoss(b, h, true, 'Kuyruk isabeti ' + b.kuyrukVurus + ' / 2', true); } A.sars(1.1); return true; }
        if (basta || (b.sersemTur > 0 && boyunda)) { const k2 = b.sersemTur > 0 ? 2.0 : 1.4; M.ist.kritik++; A.hasarBoss(b, Math.round(s.dmg * k2), true, b.sersemTur > 0 ? 'Sersemlemiş baş ×2,0' : 'Baş isabeti ×1,4', true); A.sars(b.sersemTur > 0 ? 1.2 : 0.9); return true; }
        if (boyunda) { A.hasarBoss(b, Math.round(s.dmg * 0.70), s.delici, 'Pul zırhı emdi: kuyruk yüzgecini vur'); return true; } return false; },
      zayif: b => { const D = B.BOSS.abra, z = []; if (b.dalis < 0.5) z.push({ x: D.bas(b).x, y: D.bas(b).y, r: u(92), ad: b.sersemTur > 0 ? 'Baş ×2' : 'Baş ×1,4' }); if (b.kuyruk > 0.5) { const k = D.kuyrukYer(b); z.push({ x: k.x, y: k.ust - 1.4, r: 1.1, ad: 'Kuyruk' }); } return z; },
      oyuncuSirasi(b) { if (b.kuyrukTur > 0) { b.kuyrukTur--; } else if (b.faz < 3 && b.sersemTur <= 0) b.kuyrukHedef = 0; },
      siraBasi(b) { if (b.direnc > 0) b.direnc--; if (b.kesinSaldir) { b.kesinSaldir = false; b.sersemTur = 0; b.sersem = 0; return false; } if (b.sersemTur > 0) { b.sersemTur--; b.kesinSaldir = true; b.direnc = 2; A.yazi(b.x, b.y + 9, 'Abra sersem: sırası geçti', { col: '#7fe8d8', crit: 1 }); return true; } return false; },
      hamle: b => { if (b.cikacak) { b.cikacak = false; return 'cikis'; } const h = b.faz >= 3 ? ['tsunami', 'simsek', 'dalis'] : b.faz >= 2 ? ['dalis', 'simsek', 'tsunami'] : ['tsunami', 'dalis', 'simsek']; return h[A.tur() % h.length]; },
      hamleler: { tsunami: { ad: 'Kuyruk Şamarı ve Tsunami', soz: 'Güverteden süpürüleceksin!' }, dalis: { ad: 'Abisal Dalış', soz: 'Güvertenin altından fışkıracağım!' }, simsek: { ad: 'Yıldırımlı Çene', soz: 'Kadırganın güvertesini parçalayacağım!' }, cikis: { ad: 'Gayzer Fışkırması', soz: 'Suların dibinden kopup geldim!' } },
      uygula(b, p, h, dm) { const M = A.M, ax = b.x - 2.4, ay = b.y + 7.4, su = Y_(1238), at = (dx, d, el, pat, sure) => A.nisanliAt(b, ax, ay, p.x + u(dx), p.y + u(30), Math.round(d * dm), el, pat, { sure });
        if (h === 'tsunami') { A.sars(0.9); M.dalga.push({ x0: b.x - u(80), x: b.x, yol: u(1650), sure: 1.25, t: 0, dmg: Math.round(165 * dm) }); if (b.faz < 3) { b.kuyrukHedef = 1; b.kuyrukTur = 1; } at(-18, 180, 'buz', 52, 1.55); at(24, 175, 'firtina', 48, 1.4); A.ses('splash'); }
        else if (h === 'dalis') { A.sars(1); b.dalisHedef = 1; b.cikacak = true; A.toz(b.x, su, 30, [200, 240, 255]); M.bolge.push({ x: p.x, y: p.y, r: u(120), dmg: 230, el: 'buz' }); A.ses('splash'); }
        else if (h === 'cikis') { A.sars(1.1); const yer = [1960, 2040, 2140].map(A.X_).filter(v => Math.abs(v - b.x) > u(40)); b.x = yer[Math.floor(Math.random() * yer.length)] || A.X_(2040); b.dalisHedef = 0; A.toz(b.x, su, 40, [200, 240, 255]); A.halka(b.x, su, 2.6, A.EL.buz); at(0, 175, 'buz', 48, 1.5); A.ses('splash'); }
        else { A.sars(0.9); A.isin(ax, ay, p.x, p.y + u(38), [200, 160, 255], 0.7); at(-16, 190, 'firtina', 54, 1.6); at(22, 180, 'buz', 48, 1.4); } },
      cizArka(b, x, V) { const im = A.img(I('abra/abra_tail_fin_v2.webp')); if (!im || b.kuyruk <= 0.02 || b.dead) return; const D = B.BOSS.abra, k = D.kuyrukYer(b), h = 6.2 * V.sc, w = h * im.naturalWidth / im.naturalHeight; x.drawImage(im, V.X(k.x) - w / 2, V.Y(k.ust), w, h); } },
  });
  /* Şahmeran V3.1 (kullanıcı onayı 2026-11-16): yeni savaş çizimi, kareli canlandırma (tools/sahmeran_v3.mjs sayfayı üretir; ölçüler onun çıktısıdır).
     Kurallar (can, fazlar, hamleler, hasarlar) eski Şahmeran'ın aynısıdır; yalnız çizim, tacın yeri ve merminin çıktığı nokta (yay) değişir.
     Klipler: bekleme 18 kare · yay germe 8 · bırakma 6 · toparlanma 6 · Mâr tıslaması 9 (vurulunca; vuruluş ve ölüm klibi yok). Çizim sola bakar. */
  B.BOSS.sahmeran_v3 = (() => { const o = { tac: [-17, 328, 60], tacAd: 'Taç kritiği', govde: [175, 122], kutu: [145, 360] }, sayfa = 'assets/sahmeran_v3.webp', yuz = 'assets/sahmeran_v3_yuz.webp';
    /* TASARIM (kullanıcı, 2026-11-17): Şahmeran yayıyla savaşır. Hamleleri oklardır; ikinci fazdan sonra Cazibe Oku da atar.
       Çifte Ok (2 × 185) · Ok Yaylımı (2 × 175, geniş açı) · Gökten Ok Yağmuru (2 × 185 gökten + 1 × 190) · Cazibe Oku (175 + büyü).
       Cazibe Oku isabet ederse terbiyeci büyülenir: sırası gelince ateş edemez, Şahmeran'a doğru yürür. Kalkan büyüyü kırar. Sayılar eski hamlelerle aynıdır. */
    const ok = (b, p, gx, gy, dx, dmg, pat, ek) => A.nisanliAt(b, b.x + (b.face || -1) * u(gx), b.y + u(gy), p.x + u(dx), p.y + u(30), dmg, 'venom', pat, Object.assign({ ok: true, col: [246, 217, 138] }, ek));
    return Object.assign({}, B.BOSS.sahmeran, { spr: { idle: sayfa, yuz }, yuz, yuzK: [0.5, 0.5, 1], durum: null, yon: -1, agiz: [160, 223], vurus: vurus(o), zayif: zayif({ tac: o.tac, tacAd: 'Altın taç' }),
      hamle: b => { const h = b.faz >= 3 ? ['yaylim', 'cazibe', 'ok'] : b.faz >= 2 ? ['ok', 'yaylim', 'cazibe'] : ['ok', 'yaylim', 'yagmur']; return h[A.tur() % h.length]; },
      hamleler: { ok: { ad: 'Çifte Ok', soz: 'Yayım hiç şaşmaz!' }, yaylim: { ad: 'Zehirli Ok Yaylımı', soz: 'Oklarım üstüne yağsın!' }, yagmur: { ad: 'Gökten Ok Yağmuru', soz: 'Gökyüzü oklarımla kararsın!' }, cazibe: { ad: 'Cazibe Oku', soz: 'Gözlerime bak. Bana gel!' } },
      uygula(b, p, h, dm) { const [gx, gy] = b.D.agiz; A.sars(0.5);
        if (h === 'ok') { ok(b, p, gx, gy, -20, Math.round(185 * dm), 48); ok(b, p, gx, gy, 22, Math.round(185 * dm), 48, { sure: 1.32 }); }
        else if (h === 'yaylim') { ok(b, p, gx, gy - 10, -26, Math.round(175 * dm), 52); ok(b, p, gx, gy - 10, 26, Math.round(175 * dm), 52, { sure: 1.34 }); }
        else if (h === 'cazibe') { A.halka(b.x + (b.face || -1) * u(gx), b.y + u(gy), 1.4, [255, 122, 196]); ok(b, p, gx, gy - 10, 0, Math.round(175 * dm), 48, { cazibe: true, col: [255, 122, 196], kesin: true }); }
        else { A.meteor(b, p, 2, Math.round(185 * dm), 'venom', 54, { ok: true, col: [246, 217, 138] }); ok(b, p, gx, gy + 25, 0, Math.round(190 * dm), 52); } },
      sayfa: { src: sayfa, cw: 465, ch: 339, sutun: 8, px: 197, py: 322, kare(b, t) { const son = (i0, n, oran) => i0 + Math.max(0, Math.min(n - 1, Math.floor(oran * n)));
        if (b.anim === 'atk') { const g = 2.4 - b.animT; return g < 1.2 ? son(18, 8, g / 1.2) : g < 1.55 ? son(26, 6, (g - 1.2) / 0.35) : son(32, 6, (g - 1.55) / 0.85); }
        if (b.anim === 'hit') return son(38, 9, (0.5 - b.animT) / 0.5); return Math.floor(t * 7.5) % 18; } } }); })();
  /* Şahmeran'da işaretler gizli (kullanıcı, 2026-11-17: "sürekli çizerek zayıf noktasını ve atış yapacağı yeri gösterme; onlar yine olsun ama gizle"):
     taç kritiği ve nişan aldığı bölge kural olarak aynen işler, ekrana çizilmez. Oyuncu tacı kendi bulur, her tur yerini değiştirir. */
  B.BOSS.sahmeran.isaretGizli = B.BOSS.sahmeran_v3.isaretGizli = true;
  /* Zümrüt Saray'ın yılanları (konsept çizim, kullanıcı onayı 2026-11-17: geçici). Kurallar yerdeki muhafızın (cobra) aynısıdır; yalnız çizim değişir.
     Tek duruş var: saldırı ve vuruluş karesi çizilmedi. Çizim sola bakar, alt kenarı zemindir. */
  /* Canlandırma (2026-11-17): bekleme, ilerleme, saldırı, vuruluş, ölüm klipleri tek sayfada (tools/zumrut_yilan.mjs → js/zumrut_yilan_veri.js).
     Ölen yılan son karede yerde kalır. Sayfa yüklenemezse tek duruşlu çizim kullanılır. */
  const yilan = (ad, duz) => { const Y = (window.EO2_YILAN || {})[ad], D = Object.assign({}, B.MOB.cobra, { spr: { idle: duz }, yon: -1, taban: 1 }); if (!Y) return D;
    const kl = (k, oran) => Y.dizin[k][0] + Math.max(0, Math.min(Y.dizin[k][1] - 1, Math.floor(oran * Y.dizin[k][1])));
    return Object.assign(D, { spr: { idle: Y.src }, sayfa: { src: Y.src, cw: Y.cw, ch: Y.ch, sutun: Y.sutun, px: Y.px, py: Y.py, ceset: true,
      kare(a, t) { if (a.dead) return kl('death', (a.olu || 0) / 0.9); if (a.anim === 'hit') return kl('hit', (0.45 - a.animT) / 0.45); if (a.anim === 'atk') return kl('attack', (0.9 - a.animT) / 0.9);
        if (a.yuruT != null && t - a.yuruT < 0.8) return kl('move', (t - a.yuruT) / 0.8); return Y.dizin.idle[0] + Math.floor(t * 7.5 + a.x) % Y.dizin.idle[1]; } } }); };
  /* Yakın dövüş (kullanıcı, 2026-11-21): yılanlar mermi atmaz; sürünüp yaklaşır, dibine gelince ısırır (battle.js yakinSira). adim: bir turda gidilen yol, menzil: ısırma uzaklığı (dünya birimi). */
  B.MOB.zs_vurucu = Object.assign(yilan('vurucu', 'assets/zumrut/yilan_vurucu.webp'), { yakin: { adim: 3.4, menzil: 1.7 } });
  B.MOB.zs_agir = Object.assign(yilan('agir', 'assets/zumrut/yilan_agir.webp'), { yakin: { adim: 2.0, menzil: 1.9 } });
  B.MOB.zs_kucuk = Object.assign(yilan('kucuk', 'assets/zumrut/yilan_kucuk.webp'), { yakin: { adim: 2.8, menzil: 1.5 } });   // köprünün uçlarındaki küçük yılan (uçan engereğin yerine: uçan engerek hiçbir zaman olmayacak)
  for (const k in B.BOSS) { const D = B.BOSS[k]; if (D.ek) D.ek.forEach((e, i) => { D.spr['ek' + i] = e; }); }

  /* ---------- deniz ve dalga çizimi (Batık Donanma) ---------- */
  const deniz = { cizOn(x, V) { const M = A.M, su = V.Y(M.deniz), t = M.time; const dalga = (dy, al, hiz, gen) => { x.beginPath(); x.moveTo(0, V.H); for (let px = 0; px <= V.W + 24; px += 24) x.lineTo(px, su + dy + Math.sin(px / V.sc * gen + t * hiz) * 0.16 * V.sc); x.lineTo(V.W, V.H); x.closePath(); x.fillStyle = al; x.fill(); };
      dalga(-0.1 * V.sc, 'rgba(120,220,230,.35)', 1.3, 1.1); dalga(0.25 * V.sc, 'rgba(20,90,120,.62)', -1.0, 0.8); dalga(0.8 * V.sc, 'rgba(8,36,64,.8)', 0.7, 0.6);
      for (const d of M.dalga) { const k = Math.sin(Math.min(1, d.t / d.sure) * PI), hx = V.X(d.x), hy = 4.4 * k * V.sc; x.beginPath(); x.moveTo(hx + 4.2 * V.sc, su + 4); x.quadraticCurveTo(hx + 1.2 * V.sc, su - hy * 0.9, hx - 0.9 * V.sc, su - hy); x.quadraticCurveTo(hx - 2.2 * V.sc, su - hy * 0.85, hx - 2.0 * V.sc, su - hy * 0.45); x.quadraticCurveTo(hx - 0.8 * V.sc, su - hy * 0.5, hx - 0.6 * V.sc, su + 4); x.closePath();
        const g = x.createLinearGradient(0, su - hy, 0, su); g.addColorStop(0, 'rgba(220,255,250,.95)'); g.addColorStop(0.35, 'rgba(90,210,220,.85)'); g.addColorStop(1, 'rgba(14,70,110,.9)'); x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(6,22,40,.8)'; x.lineWidth = 2.5; x.stroke(); } } };
  /* Girdap Boğazı: iki ada arasındaki hortum alçak mermiyi yukarı saptırır; her iki turda bir öncü kuyruk dalgası gelir (145 hasar) */
  const girdap = Object.assign({}, deniz, { mobSinir: [1960, 2660],
    ucus(s) { if (s.teleport || s.saptı || s.takim !== 0) return; const gx = A.X_(1370); if (Math.abs(s.x - gx) * A.PX <= 95 && s.y <= Y_(720) && s.y >= Y_(1180)) { s.saptı = true; s.vy += 6.3; s.vx *= 0.86; A.halka(gx, s.y, 1.2, A.EL.buz); A.yazi(gx, s.y + 1, 'Hortum mermiyi saptırdı', { kucuk: 1, col: '#9fe0ff' }); } },
    dusmanBasi() { const M = A.M; if (M.ist.tur % 2 === 1) { M.dalga.push({ x0: A.X_(2680 - 120), x: A.X_(2560), yol: u(1750), sure: 1.3, t: 0, dmg: 145 }); A.yazi(A.X_(2600), Y_(980), 'Öncü kuyruk dalgası geliyor', { col: '#9fe0ff', crit: 1 }); A.ses('splash'); } },
    cizArka(x, V) { const M = A.M, gx = V.X(A.X_(1370)), su = V.Y(M.deniz), t = M.time; for (let i = 0; i < 7; i++) { const yy = su - i * 0.75 * V.sc, w = (1.1 + i * 0.22) * V.sc, o = Math.sin(t * 2.4 + i * 0.9) * 0.35 * V.sc; x.strokeStyle = 'rgba(170,240,250,' + (0.55 - i * 0.05) + ')'; x.lineWidth = 0.16 * V.sc; x.beginPath(); x.ellipse(gx + o, yy, w, 0.2 * V.sc, 0, 0, 6.3); x.stroke(); } } });

  /* ---------- aşamalar: arazi formülleri, canlar ve konumlar eski dosyalardan aynen ---------- */
  const kapi = x => { let y; if (x < 820) y = 1020 + sin(x * 0.011) * 18; else if (x < 1750) y = 1055 - ((x - 820) / 930) * 75 + sin(x * 0.016) * 24; else if (x < 2450) y = 980 + cos((x - 1750) * 0.013) * 26; else y = 925 - ((x - 2450) / 950) * 45 + sin(x * 0.014) * 14; return y; };
  const kopru = x => { let y; if (x < 780) y = 990 + sin(x * 0.012) * 18; else if (x < 960) y = 1190; else if (x < 1880) y = 1025 + sin((x - 960) * 0.012) * 28; else if (x < 2080) y = 1205; else y = 935 + cos((x - 2080) * 0.011) * 20; return y; };
  const mahzen = x => { let y; if (x < 800) y = 1015 + sin(x * 0.012) * 18; else if (x < 1620) y = 1050 - sin(((x - 800) / 820) * PI) * 68; else if (x < 2380) y = 995 + sin((x - 1620) * 0.015) * 28; else y = 915 + cos((x - 2380) * 0.012) * 18; return y; };
  const mabet = x => { let y; if (x < 860) y = 1025 + sin(x * 0.012) * 16; else if (x < 1520) y = 1065 + sin((x - 860) * 0.016) * 28; else if (x < 2180) y = 1020 - sin(((x - 1520) / 660) * PI) * 60; else if (x < 2420) y = 995 - ((x - 2180) / 240) * 95; else y = 900 + sin((x - 2420) * 0.009) * 12; return y; };
  const kiyi = x => { let y; if (x < 920) y = 985 + sin(x * 0.011) * 14; else if (x < 1780) y = 1015 + sin((x - 920) * 0.014) * 20; else if (x < 2520) y = 955 + cos((x - 1780) * 0.012) * 16; else y = 925 + sin((x - 2520) * 0.012) * 14; return y; };
  const bogaz = x => x >= 180 && x <= 1120 ? 965 + sin((x - 180) * 0.009) * 14 : x >= 1620 && x <= 2880 ? 950 + cos((x - 1620) * 0.009) * 16 : 1455;
  const tersane = x => x < 880 ? 978 + sin(x * 0.006) * 8 : x < 1760 ? 968 + cos((x - 880) * 0.006) * 8 : x < 2850 ? 958 + sin((x - 1760) * 0.005) * 6 : 1455;
  const kadirga = x => x >= 165 && x <= 595 ? 962 - Math.max(0, Math.min(1, (595 - x) / 430)) * 44 : x >= 810 && x <= 1205 ? 962 + sin((x - 810) * 0.015) * 3 : x >= 1410 && x <= 1835 ? 962 - Math.max(0, Math.min(1, (x - 1410) / 425)) * 36 : 1455;
  const ZINDAN = {
    sahmeran: { ad: 'Zümrüt Saray', rakam: 'I', boss: 'Yılan Kraliçe Şahmeran', el: 'Toprak', ganimet: 'Şahmeran Sırça Kalıbı', kalip: 'sahmeran_kalip', prolog: null, zafer: null, destan: 'Zümrüt Saray', gir: 'Zümrüt Saray seferine gir', yuz: 'assets/sahmeran_v3_yuz.webp',   /* Zümrüt Saray yenilemesi (2026-11-21): eski Sırça Saray çizgi romanı ve yakın çekimi kaldırıldı (kullanıcı: iptal edilmişti) */ ortam: 'spor', tema: 'sirca',
      asama: [
        { ad: 'Tarsus Kehribar Kuyusu', alt: 'Bronz engerek muhafızları kapıyı tutuyor', bg: I('sahmeran/sahmeran_gate_bg.webp'), f: kapi, ipucu: 'Önce yaklaşanı vur: yerdeki muhafız her tur sana doğru yürür.',
          moblar: d => [{ tip: 'cobra', ad: 'Bronz Engerek Muhafızı', hp: Math.round(700 * d), x: 1680 }, { tip: 'oracle', ad: 'Engerek Rahibesi', hp: Math.round(740 * d), x: 2320 }] },
        { ad: 'Sırça Köprü ve Zümrüt Şelale', alt: 'Sırça engerekleri', bg: I('sahmeran/sahmeran_bridge_bg.webp'), f: kopru, ipucu: 'Köprünün iki ucunda engerek var: önce yaklaşanı vur.',
          moblar: d => [{ tip: 'cobra', ad: 'Bronz Engerek Muhafızı', hp: Math.round(760 * d), x: 1680 }, { tip: 'cobra', ad: 'Sırça Engerek', hp: Math.round(800 * d), x: 2320 }   /* uçan engerek yok (kullanıcı, 2026-11-17: hiçbir zaman olmayacak) */] },
        { ad: 'Sırça Kristal Mahzeni', alt: 'Ara boss: Sırça Kristal Yılan Golemi', bg: I('extreme/ex_sah_vault_bg.webp'), f: mahzen, ipucu: 'Golemin başına nişan al. Kalkanı varken Krater Güllesi deler.',
          boss: d => ({ tip: 'sirca_golem', ad: 'Sırça Kristal Yılan Golemi', unvan: 'Camasb\'ın mahzen muhafızı', hp: Math.round(2600 * d), kalkan: 250, x: 2560 }), moblar: () => [{ tip: 'cobra', ad: 'Mahzen Nöbetçisi', hp: 620, x: 1840 }] },
        { ad: 'Yılan Kraliçe Şahmeran', alt: 'Sırça Saray\'ın iç mabedi', bg: I('sahmeran/sahmeran_bg.webp'), f: mabet, ipucu: 'Tacına nişan al. Durduğun yere ok yağdırır: her tur yerini değiştir, sonra ateş et.',
          boss: d => ({ tip: 'sahmeran', ad: 'Yılan Kraliçe Şahmeran', unvan: 'Sırça Saray\'ın ebedi hükümdarı', hp: Math.round(3600 * d), x: 2680 }), moblar: d => [{ tip: 'cobra', ad: 'Sırça Taht Muhafızı', hp: Math.round(640 * d), x: 2060 }] }] },
    komutan: { ad: 'Volkanik Kaldera', rakam: 'II', boss: 'Başkomutan Kalgarot', el: 'Ateş ve Gölge', ganimet: 'Kalgarot Kor Kalıbı', kalip: 'kalgarot_kalip', prolog: 'komutan_prolog', zafer: 'komutan_zafer', destan: 'Başkomutan Kalgarot', gir: 'Volkanik Kaldera seferine gir', yuz: I('komutan/komutan_closeup.webp'), ortam: 'kor', tema: 'kaldera',
      asama: [
        { ad: 'Yanık Bazalt Yolu', alt: 'Zırhlı magma drake\'leri', bg: I('komutan/komutan_gate_bg.webp'), f: kapi, ipucu: 'Drake\'ler her tur yaklaşır. Ağır Gülle ile birini çabuk indir.',
          moblar: d => [{ tip: 'drake', ad: 'Zırhlı Magma Drake', hp: Math.round(735 * d), x: 1680 }, { tip: 'drake', ad: 'Kıdemli Kaldera Drake\'i', hp: Math.round(775 * d), x: 2320 }] },
        { ad: 'Bazalt Köprü ve Lav Nehri', alt: 'Uçan kor kanat wyvern', bg: I('komutan/komutan_bridge_bg.webp'), f: kopru, ipucu: 'Wyvern yüksekte durur: açıyı büyüt, gücü kıs.',
          moblar: d => [{ tip: 'drake', ad: 'Zırhlı Magma Drake', hp: Math.round(790 * d), x: 1680 }, { tip: 'wyvern', ad: 'Uçan Kor Kanat Wyvern', hp: Math.round(830 * d), x: 2320, yuk: 590 }] },
        { ad: 'Yıkık Ejderha Örsü', alt: 'Ara boss: Zırhlı Magma Behemoth', bg: I('komutan/komutan_crater_bg.webp'), f: mahzen, ipucu: 'Behemoth\'un kalkanı kalın. Krater Güllesi kalkanı deler.',
          boss: d => ({ tip: 'behemoth', ad: 'Zırhlı Magma Behemoth', unvan: 'Yıkık Ejderha Örsü\'nün devi', hp: Math.round(2900 * d), kalkan: 300, x: 2560 }), moblar: () => [] },
        { ad: 'Başkomutan Kalgarot', alt: 'Kaldera\'nın iç mabedi', bg: I('komutan/komutan_sanctum_bg.webp'), f: mabet, ipucu: 'Göğsündeki kor kalp en büyük zayıf noktası; boynuzu da kritik verir.',
          boss: d => ({ tip: 'kalgarot', ad: 'Başkomutan Kalgarot', unvan: 'Kül Yutan\'ın sağ kolu', hp: Math.round(4400 * d), x: 2680 }), moblar: d => [{ tip: 'drake', ad: 'Kaldera Muhafız Drake\'i', hp: Math.round(680 * d), x: 2040 }] }] },
    abra: { ad: 'Batık Donanma', rakam: 'III', boss: 'Derya Yılanı Abra', el: 'Buz ve Fırtına', ganimet: 'Abra Leviathan Kalıbı', kalip: 'abra_kalip', prolog: 'abra_prolog', zafer: 'abra_zafer', destan: 'Batık Donanma ve Derya Yılanı Abra', gir: 'Batık Donanma seferine gir', yuz: I('abra/abra_closeup_portrait_v2.webp'), ortam: 'yagmur', tema: 'donanma',
      asama: [
        { ad: 'Fosforlu Mercan Kıyısı', alt: 'Kıskaç kalkanlı karkinoslar', bg: I('abra/abra_sanctum_bg.webp'), f: kiyi, deniz: 1300, ozel: deniz, aci: 58, ipucu: 'Alçak atış kıskaçtan seker. 52° ve üstüyle aşırt: kabuk kırılır, hasar bir buçuk kat.',
          moblar: d => [{ tip: 'karkinos', ad: 'Derin Deniz Karkinosu', hp: Math.round(650 * d), x: 1580 }, { tip: 'karkinos', ad: 'Kıdemli Mercan Karkinosu', hp: Math.round(750 * d), x: 2180 }] },
        { ad: 'Girdap Boğazı', alt: 'İki ada, ortada su hortumu', bg: I('abra/abra_sanctum_bg.webp'), f: bogaz, deniz: 1238, ozel: girdap, ipucu: 'Hortum alçak mermiyi saptırır: üstünden aşırt. Dalga gelmeden Demir Çapa at.',
          moblar: d => [{ tip: 'karkinos', ad: 'Zırhlı Boğaz Karkinosu', hp: Math.round(800 * d), x: 1840 }, { tip: 'karkinos', ad: 'Derin Girdap Karkinosu', hp: Math.round(850 * d), x: 2340 }] },
        { ad: 'Batık Tersane Mahzeni', alt: 'Ara boss: Dalgıç ve Mercan Golemi', bg: I('abra/abra_dock_vault_bg.webp'), f: tersane, deniz: 1300, ozel: deniz, tema: 'guverte', ipucu: 'Göğüs zırhı hasarı emer. Miğferin camını vur: iki kat hasar, top kolu bir tur kilitlenir.',
          boss: d => ({ tip: 'mercan_golem', ad: 'Dalgıç ve Mercan Golemi', unvan: 'Batık tersane muhafızı', hp: Math.round(2200 * d), kalkan: 200, x: 2260 }), moblar: () => [] },
        { ad: 'Derya Yılanı Abra', alt: 'Üçe bölünmüş kadırga', bg: I('abra/abra_arena_bg_v2.webp'), f: kadirga, deniz: 1238, ozel: deniz, tema: 'guverte', x0: 980, ipucu: 'Tsunamiden sonra kuyruk yüzgeci yüzeye çıkar. İki ayrı turda vur: Abra sersemler, başı iki kat hasar alır.',
          boss: d => ({ tip: 'abra', ad: 'Derya Yılanı Abra', unvan: 'Kadim derya leviathanı', hp: Math.round(4800 * d), x: 2040 }), moblar: () => [] }] },
  };
  /* Kervan pususu (eski gameMode 'caravan'): tek aşama, üç haydut, bir ikmal sandığı, bir barut fıçısı */
  const KERVAN = { ad: 'Kervan Baskını', alt: 'İpek Geçidi pususu', bg: 'assets/bg/kervan.webp', f: kapi, tema: 'kervan', ortam: 'toz', ipucu: 'Sandığı vurursan can ve öfke verir; fıçı patlar ve yanındakileri de yakar.',
    moblar: () => [{ tip: 'drake', ad: 'Kervan Pusucusu Drake', hp: 720, x: 1760 }, { tip: 'cobra', ad: 'Bozkır Haydudu Engerek', hp: 680, x: 2180 }, { tip: 'wyvern', ad: 'Hava Akıncısı Wyvern', hp: 740, x: 2540, yuk: 590 }],
    props: [{ tip: 'araba', x: 1380 }, { tip: 'sandik', x: 960 }, { tip: 'fici', x: 1920 }] };
  /* zorluk: can ve hasar çarpanları eski oyunla aynı (Normal ×0,75 can ve ×0,80 hasar; Ağır ×1,0) */
  const ZORLUK = { normal: { ad: 'Normal', hp: 0.75, dmg: 0.80 }, zor: { ad: 'Ağır', hp: 1.0, dmg: 1.0 } };
  EO2.topcuVeri = { ZINDAN, KERVAN, ZORLUK, arazi, talimArazi: () => ({ tema: 'talim', aile: 'talim', ada: true, top: null }) };
})();
