'use strict';
/* ============ EJDER OCAĞI — SEYİRCİ PANELLERİ ============
   Maç sırasında köşeden Persona tarzı eğik bir çizgi roman paneli fırlar: arka plan ve karakter ayrı katmanlardır
   (hafif paralaks), üstte konuşma balonu. Seçim yoktur; bazıları küçük bir etki bırakır (log'a düşer).
   Turda en çok bir panel, iki tur bekleme, maç başına en çok dört panel. */

const PIP = [
  { id: 'cosku', snd: 'cheer', ch: 'pip-cosku', bg: 'pipbg-tribun', side: 'p', w: 5,
    when: (ev, F) => ev.who === 'p' && (ev.crit || (ev.dmg && ev.dmg >= F.e.maxHp * 0.2)),
    lines: ['VUR ŞUNU!', 'İşte bu be!', 'Bir daha! Bir daha!', 'Ocak! Ocak! Ocak!'], fx: F => { F.p.fury = Math.max(F.p.fury, 1); return 'Tribünler coştu: ejderhan öfkelendi.'; } },
  { id: 'yuha', snd: 'boo', ch: 'pip-yuha', bg: 'pipbg-tribun', side: 'p', w: 4,
    when: (ev, F) => ev.who === 'p' && ev.miss && FT.missRow >= 2,
    lines: ['Yuuuh!', 'Kör müsün be!', 'Paramızı geri verin!', 'Şalgamı yiyen bu ejderhadan iyi vurur!'] },
  { id: 'bahisci', ch: 'pip-bahisci', bg: 'pipbg-bahis', side: 'p', w: 6,
    when: (ev, F) => FT.bet && ev.who === 'e' && ev.dmg && F.p.hp < F.p.maxHp * 0.45,
    lines: ['Param... param gidiyor...', 'Hadi oğlum, hadi! Bütün kesemi bastım!', 'Defterime yazdım, kaybedersen sen ödersin!'] },
  { id: 'cocuk', snd: 'cheer', ch: 'pip-cocuk', bg: 'pipbg-tribun', side: 'p', w: 3,
    when: (ev, F) => ev.who === 'p' && (ev.act === 'card' || (ev.act === 'round' && F.round === 1 && chance(35))),
    lines: ['Anne bak! Ejderha!', 'Ben de büyüyünce ejderha terbiyecisi olacağım!', 'Vaaay! Gördün mü onu?'] },
  { id: 'simitci', ch: 'pip-simitci', bg: 'pipbg-merdiven', side: 'e', w: 2,
    when: (ev, F) => ev.act === 'round' && F.round >= 3 && chance(30),
    lines: ['Simiiit! Taze simit!', 'Maç uzun, karın aç! Simiiit!', 'Susamlı, sıcacık! Ejderhalar bile yer!'] },
  { id: 'hakem', snd: 'horn', ch: 'pip-hakem', bg: 'pipbg-kapi', side: 'e', w: 3,
    when: (ev, F) => ev.act === 'round' && (F.round === 1 ? chance(40) : F.round >= 22),
    lines: F => F.round >= 22 ? ['Süre daralıyor! Bitirin şu işi!', 'Az kaldı, kum saati dönüyor!'] : ['Temiz dövüş istiyorum!', 'Kurallar belli: teslim eden kaybeder!', 'Başlaaa!'] },
  { id: 'ihtiyar', ch: 'pip-ihtiyar', bg: 'pipbg-tribun', side: 'e', w: 2,
    when: (ev, F) => ev.act === 'round' && F.round >= 8 && chance(40),
    lines: ['Zzz... bizim zamanımızda... zzz...', 'Hı? Bitti mi? ...zzz', 'Zzzz...'] },
  { id: 'rakip', snd: 'boo', ch: 'pip-rakip', bg: 'pipbg-kose', side: 'e', w: 5,
    when: (ev, F) => ev.who === 'p' && ev.dmg && F.e.hp > 0 && F.e.hp < F.e.maxHp * 0.3,
    lines: () => [`Kalk ${FT.opp.name}! Kalk dedim!`, 'Bu bir şans, sadece şans!', `${FT.opp.name}, beni rezil etme!`] },
  { id: 'soylu', ch: 'pip-soylu', bg: 'pipbg-loca', side: 'e', w: 3,
    when: (ev, F) => ev.act === 'round' && F.round === 2 && (FT.mode === 'tour' || FT.tier === 'sehir' || FT.tier === 'cukur'),
    lines: ['Fena değil... bir köylüye göre.', 'Bu ejderhanın soyunu araştırın.', 'Sıkıldım. Biri bir şey yaksın.'] },
  { id: 'cift', snd: 'gasp', ch: 'pip-cift', bg: 'pipbg-tribun', side: 'p', w: 5,
    when: (ev, F) => ev.who === 'e' && ev.dmg && (ev.crit || F.p.hp < F.p.maxHp * 0.22) && F.p.hp > 0,
    lines: ['Bakamıyorum!', 'Ölecek mi? Söyle bana ölmeyecek!', 'Aman Allahım!'] },
  { id: 'davul', snd: 'drum', ch: 'pip-davul', bg: 'pipbg-calgi', side: 'p', w: 4,
    when: (ev, F) => ev.who === 'p' && ev.act === 'kukre' && ev.ok,
    lines: ['DUM! DUM! TEK!', 'Çal davulcu çal!', 'Zurnayı duyan arenaya koşsun!'], fx: F => { F.p.sta = Math.min(100, F.p.sta + 15); return 'Davul zurna ejderhanı coşturdu: nefes +15.'; } },
  { id: 'sifaci', snd: 'page', ch: 'pip-sifaci', bg: 'pipbg-kapi', side: 'p', w: 6,
    when: (ev, F) => ev.saved || (ev.who === 'e' && ev.dmg && F.p.hp > 0 && F.p.hp < F.p.maxHp * 0.15 && !FT.healed),
    lines: ['Dayan! Merhem geliyor!', 'Bir nefes daha! Dayan!', 'Kenara çekin onu, saracağım!'], fx: F => { if (FT.healed) return null; FT.healed = true; const h = Math.round(F.p.maxHp * 0.06); F.p.hp = Math.min(F.p.maxHp, F.p.hp + h); return `Şifacı kenardan merhem fırlattı: can +${h}.`; } },
  /* --- BOSS VE RAKİP LAF ATMA (TAUNT / MEYDAN OKUMA) ÇİZGİ ROMAN PANELLERİ --- */
  { id: 'boss_demirhan_laf', snd: 'boo', ch: 'npc-demirhan', bg: 'pipbg-kose', side: 'e', w: 8, speaker: 'DEMİRHAN', sfx: 'KÜÇÜMSEME!',
    when: (ev, F) => (FT.final || (FT.opp && /Karabela|Demirhan/i.test(FT.opp.name || ''))) && ev.act === 'round' && F.round >= 2 && F.round <= 6,
    lines: [
      'Dedenin kül olmuş ocağından çıkan kıvılcım bu kadar mı?!',
      'Karabela daha kanatlarını bile tam açmadı! Teslim ol da ejderhana acıyayım!',
      'Kızıl Taç benim hakkım! Köylü terbiyecilerin devri kapandı!'
    ],
    fx: F => { F.p.fury = Math.max(F.p.fury, 1); F.p.sta = Math.min(100, F.p.sta + 12); return 'Demirhan laf attı: Ejderhan hırslandı (Öfke + Nefes +12)!'; } },
  { id: 'boss_kulyutan_laf', snd: 'horn', ch: 'npc-komutan-mavikor', bg: 'pipbg-cukur', side: 'e', w: 9, speaker: 'KÜL YUTAN / KARABELA', sfx: 'KÜKRER!!',
    when: (ev, F) => (FT.tower || FT.tier === 'cukur' || FT.mode === 'tour') && ev.who === 'e' && (ev.act === 'kukre' || ev.act === 'savun' || (ev.act === 'round' && F.round === 3)),
    lines: () => [
      `${FT.opp ? FT.opp.name : 'Rakip'} doğrudan saldırmak yerine alaycı bir kükremeyle meydan okuyor!`,
      'Bütün gücün bu mu?! Gardımı bile indirmeden seni yorarım!',
      'Ateşin sönük, pençen titrek! Bir adım daha yaklaşmaya cesaretin var mı?!'
    ],
    fx: F => { F.p.fury = Math.max(F.p.fury, 1); return 'Rakibin küstah laf atması ejderhanın kanını kaynattı: Öfke aktif!'; } },
  { id: 'rakip_laf_atma', snd: 'boo', ch: 'pip-rakip', bg: 'pipbg-kose', side: 'e', w: 6, speaker: 'RAKİP TERBİYECİ', sfx: 'LAF ATMA!',
    when: (ev, F) => ev.act === 'round' && F.round >= 2 && F.round <= 5 && chance(55),
    lines: () => [
      `Haha! ${FT.you ? FT.you.name : 'Ejderhan'} daha şimdiden nefes nefese kaldı!`,
      `${FT.opp ? FT.opp.name : 'Ejderham'} seninle kedinin fareyle oynadığı gibi oynuyor!`,
      'Ocağınızın meşhur eğitimi bu muydu? Çok güldürdün beni!'
    ],
    fx: F => { F.p.sta = Math.min(100, F.p.sta + 15); return 'Rakibin laf atmasına karşılık ejderhan derin bir nefes topladı (+15 Nefes)!'; } },
];

function pipReset() { if (FT) { FT.pipN = 0; FT.pipCd = 0; FT.missRow = 0; FT.pipSeen = {}; } }
function pipOnEvent(ev, F) {
  if (!FT || FT.skip) return;
  if (FT.pipN == null) pipReset();
  if (ev.who === 'p' && (ev.dmg != null || ev.miss)) FT.missRow = ev.miss ? FT.missRow + 1 : 0;
  if (ev.act === 'round' && FT.pipCd > 0) FT.pipCd--;
  if (FT.pipN >= 5 || FT.pipCd > 0 || FT.pipNow) return;
  const pit = FT.tier === 'cukur';
  const cands = PIP.filter(p => asset(p.ch) && !FT.pipSeen[p.id] && p.when(ev, F));
  if (!cands.length) return;
  let r = Math.random() * cands.reduce((t, p) => t + p.w, 0), P = cands[0];
  for (const c of cands) { r -= c.w; if (r <= 0) { P = c; break; } }
  if (!chance(ev.act === 'round' ? 75 : 88)) return;
  FT.pipN++; FT.pipCd = 2; FT.pipSeen[P.id] = true;
  const ls = typeof P.lines === 'function' ? P.lines(F) : P.lines, line = pick(ls);
  const fxt = P.fx ? P.fx(F) : null;
  if (fxt) { FT.pipLog = FT.pipLog || []; FT.pipLog.push({ t: `<i>${fxt}</i>`, c: 'mute' }); setTimeout(() => { if (FT && FT.F === F) { setBars('p', fsnap(F).p, F); } }, 400); }
  showPip(P, line, pit ? 'pipbg-cukur' : P.bg, fxt);
}
function showPip(P, line, bgk, fxt) {
  const host = $('.fight'); if (!host) return;
  const el = document.createElement('div');
  el.className = `pip ${P.side === 'p' ? 'left' : 'right'} ${P.speaker ? 'pip-boss-taunt' : ''}`;
  const speakerBadge = P.speaker ? `<span class="pip-speaker-tag">${esc(P.speaker)}</span>` : '';
  const sfxBadge = P.sfx ? `<div class="pip-sfx-stamp">${esc(P.sfx)}</div>` : '';
  el.innerHTML = `<div class="pip-in"><div class="pip-bg" style="background-image:url(${asset(bgk) || ''})"></div><div class="pip-tone"></div>
    <img class="pip-ch" src="${asset(P.ch)}" alt="">${sfxBadge}<div class="pip-lines"></div></div>
    <div class="pip-say">${speakerBadge}<b>${esc(line)}</b></div>${fxt ? `<div class="pip-fx">${fxt}</div>` : ''}`;
  host.appendChild(el); FT.pipNow = true; window.__pips = (window.__pips || 0) + 1;
  SFX.play('page', { vol: .6 }); if (P.snd && P.snd !== 'page') setTimeout(() => SFX.play(P.snd, { vol: .75 }), 120);
  const life = window.__fastFx ? 40 : 3200;
  setTimeout(() => el.classList.add('out'), life);
  setTimeout(() => { el.remove(); if (FT) FT.pipNow = false; }, life + 420);
}
