/* EO2 dikey dilim · konuşan NPC'ler (deneme)
   Yayın sayfasının "sample" yeteneğiyle NPC, oyuncunun yazdığı soruya karakterinde kalarak cevap verir; "tts" ile
   cevabı seslendirir. İkisi de yoksa (yerel çalıştırma, izin verilmemesi) hazır cümlelere düşer.
   Onaylı kapsamın dışında bir denemedir: oyuna girip girmeyeceği ayrı karar ister. Kural: fiyat, ödül, olasılık ve
   sayı söylemez; mekanik uydurmaz. Model çıktısı güvenilmez metindir, yalnız textContent ile yazılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, $ = id => document.getElementById(id);
  const PERSONA = {
    ozan: 'Gezgin bir halk ozanısın; çeşme başında saz çalarsın. Şiirsel ve şakacısın. Türkü istenirse yalnız dört kısa dize söylersin.',
    rustem: 'Bedesten\'in kâhyasısın. Ağırbaşlı, ölçülü, pazarlık bilen bir adamsın.',
    kerim: 'Demircisin; Kor Örsü\'nde ekipman döversin. Az ve öz konuşursun.',
    bekci1: 'Kuzey Kapısı nöbetçisisin. Resmî ve kısa konuşursun.', bekci2: 'Kuzey Kapısı nöbetçisisin. Resmî ve kısa konuşursun.',
    yumurtaci: 'Ejder Bahçesi kapısında yumurta ve yavrularla ilgilenirsin. Neşeli ve yavrulara düşkünsün.',
    muhtar: 'Meydanın muhtarısın. Konuşkan ve babacansın.',
    tuccar: 'Gece Çarşısı\'nda tezgâhı olan bir tüccarsın. Kurnaz ama dürüstsün; malını översin.', hamal: 'Çarşıda yük taşıyan bir hamalsın. Nefes nefese, kısa konuşursun.', baharatci: 'Meydandaki baharat tezgâhının sahibisin. Neşeli, konuşkansın; ejderhaların ne sevdiğini bilirsin.',
    talimci: 'Topçu Arenası\'nın talimcisisin. Sert ama adilsin; ejder topuyla atışı öğretirsin.', arenabekci: 'Topçu Arenası\'nın bekçisisin. Resmî ve kısa konuşursun.', cirak: 'Arenada talim yapan bir çıraksın. Hevesli ve biraz sakarsın.',
    hanci: 'Han\'ın sahibisin. Güler yüzlü, hazırcevap birisin; ocak başında herkesi ağırlarsın.', tavlaci1: 'Handa tavla oynayan bir müdavimsin. Zar tutmakla övünür, biraz hava atarsın.', tavlaci2: 'Handa tavla oynayan bir müdavimsin. Şanssızlığından yakınır, yine de masadan kalkmazsın.',
    bahcivan: 'Ejder Bahçesi\'nin bahçıvanısın. Sakin ve sabırlısın; ejderhaların huyunu bilirsin. Bahçede Kor (oyuncunun yaşlı ateş ejderi), Ayaz (genç buz ejderi) ve Tozan (toprak yavrusu) vardır.', kervanci: 'Kuzey Yolu\'ndaki kervan kampının başısın. Yol görmüş, az konuşan, tedbirli birisin.', devriye: 'Kuzey Yolu\'nda devriye gezen bekçisin. Resmî ve kısa konuşursun.',
  };
  const CHIPS = {
    ozan: ['Bir türkü söyle', 'Kor\'u tanır mısın?', 'Meydanda ne var?'], rustem: ['Bedesten nasıl işler?', 'Sende ne bulunur?'], kerim: ['Örste ne dövülür?', 'Topçu için ne gerek?'],
    bekci1: ['Kuzey Yolu nereye çıkar?'], bekci2: ['Kapıdan kimler geçer?'], yumurtaci: ['Yavruma nasıl bakarım?', 'Bahçede kim var?'], muhtar: ['Bugün meydanda ne var?', 'Nereden başlamalıyım?'],
    tuccar: ['Tezgâhında ne var?'], hamal: ['Nereye taşıyorsun?'], baharatci: ['Ejderim ne sever?', 'Bugün ne taze?'], talimci: ['Atışta nelere bakmalıyım?', 'Rüzgâr neyi değiştirir?'], arenabekci: ['Arenada neler var?'], cirak: ['Talim nasıl gidiyor?'],
    hanci: ['Handa ne oynanır?', 'Bana bir masa var mı?'], tavlaci1: ['Kim kazanıyor?'], tavlaci2: ['Şansın nasıl?'], bahcivan: ['Kor nasıl bugün?', 'Yavrulara ne iyi gelir?'], kervanci: ['Sefer nereye gider?', 'Yolda ne beklemeliyim?'], devriye: ['Yol güvenli mi?'],
  };
  const VOICE = { tuccar: 'buttery', hamal: 'airy', baharatci: 'airy', talimci: 'buttery', arenabekci: 'glassy', cirak: 'airy', hanci: 'rounded', tavlaci1: 'buttery', tavlaci2: 'airy', bahcivan: 'rounded', kervanci: 'buttery', devriye: 'glassy', ozan: 'airy', rustem: 'rounded', kerim: 'buttery', bekci1: 'glassy', bekci2: 'glassy', yumurtaci: 'airy', muhtar: 'rounded' };
  const WORLD = 'Dünya: Terbiyeciler dedelerinden kalan ocaklarda ejderha yetiştirir. Beş element vardır: ateş, buz, fırtına, toprak, gölge. Ejderhalar yavru, genç ve yetişkin evrelerinden geçer. Sezon yirmi hafta sürer ve sonunda Kızıl Taç için yarışılır. Oyuncunun dedesinden kalan yaşlı ateş ejderinin adı Kor\'dur; şu an yanında küçük kızıl bir yavru yürüyor. Meydanda Han (kıraathane, tavla ve masa oyunları), Pazar ve Bedesten (Rüstem Ağa, oyuncu ilanları), Usta Kerim\'in Kor Örsü, Topçu Arenası (ejder toplarıyla düello; Şahmeran, Komutan ve Abra zindanları), Ejder Bahçesi (bakım ve kuluçka) ve Kuzey Kapısı (seferler, kervan yolu) vardır. Ortada mavi ejder heykelli bir çeşme durur.';
  const RULES = 'Kurallar: Yalnız Türkçe konuş. En çok iki kısa cümle yaz. Karakterinden çıkma; yapay zekâ olduğunu söyleme. Fiyat, ödül, olasılık ya da herhangi bir sayı verme; sorulursa "onu tezgâhta görürsün" gibi geçiştir. Bilmediğin şeyi uydurma, "onu bilmem" de. Oyun dışı konularda sözü nazikçe meydana getir. Oyuncuya "terbiyeci" diye hitap et. Yalnız karakterin söylediği sözü yaz: tırnak, sahne notu, ad etiketi yok.';
  const FALLBACK = ['Hayırlı işler, terbiyeci.', 'Onu bilmem; meydanı bir dolaş, görürsün.', 'Sözün özü: ejderine iyi bak.'];
  let sample = null, tts = null, cur = null, busy = false, speakOn = false, abort = null, built = false;
  const hist = {};
  if (window.claude && claude.use) { claude.use('sample').then(s => { sample = s; mark(); }); claude.use('tts').then(t => { tts = t; mark(); }); }
  function mark() { if (!built) return; $('dlgLive').textContent = sample ? 'Claude ile canlı' : 'hazır cümleler'; $('dlgLive').classList.toggle('on', !!sample); $('dlgSpeak').hidden = !tts; $('dlgForm').hidden = false; }
  function build() {
    if (built) return; built = true; const I = EO2.api.ICON, el = document.createElement('section'); el.id = 'dlg'; el.className = 'box'; el.hidden = true; el.setAttribute('aria-label', 'Konuşma');
    el.innerHTML = '<img id="dlgArt" alt="" hidden><canvas id="dlgFace" width="144" height="144"></canvas><div class="dlg-main"><header><b id="dlgName"></b><i id="dlgRole"></i><span class="live" id="dlgLive"></span><button type="button" class="rb" id="dlgSpeak" aria-pressed="false" title="Cevapları seslendir" aria-label="Cevapları seslendir"></button><button type="button" class="rb" id="dlgClose" aria-label="Konuşmayı kapat (Esc)"></button></header><p id="dlgText"></p><div id="dlgChips"></div><form id="dlgForm"><input id="dlgInput" maxlength="200" autocomplete="off" placeholder="Bir şey sor… (Enter)" aria-label="Sorun"><button class="primary" type="submit">Sor</button></form></div>';
    $('hud').appendChild(el); $('dlgSpeak').innerHTML = I.sound; $('dlgClose').innerHTML = I.close;
    $('dlgClose').addEventListener('click', close);
    $('dlgSpeak').addEventListener('click', () => { speakOn = !speakOn; $('dlgSpeak').setAttribute('aria-pressed', String(speakOn)); if (speakOn) speak($('dlgText').textContent); else if (tts) tts.stop(); });
    $('dlgForm').addEventListener('submit', e => { e.preventDefault(); const v = $('dlgInput').value.trim(); if (v) { $('dlgInput').value = ''; ask(v); } });
    mark();
  }
  function speak(text) { if (!tts || !cur || !text) return; tts.speak(text.slice(0, 600), { voice: VOICE[cur.id] || 'buttery', language: 'tr' }).catch(() => {}); }
  const clean = t => String(t || '').replace(/^["“”'\s]+|["“”'\s]+$/g, '').slice(0, 420);
  function show(t, thinking) { const p = $('dlgText'); p.textContent = t; p.classList.toggle('thinking', !!thinking); }
  function chips() { const box = $('dlgChips'); box.textContent = ''; for (const c of (CHIPS[cur.id] || [])) { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.addEventListener('click', () => ask(c)); box.appendChild(b); } if (cur.act) { const b = document.createElement('button'); b.type = 'button'; b.className = 'go'; b.textContent = cur.act === 'panel:uretim' ? 'Örse bak' : cur.act === 'duel' ? 'Düelloya gir' : cur.act === 'panel:kuzey' ? 'Sefere bak' : cur.act === 'panel:pazar' ? 'İlanlara bak' : 'İçeri gir'; b.addEventListener('click', () => { const a = cur.act; close(); EO2.api.runAct(a); }); box.appendChild(b); } }
  function open(n, line) { build(); cur = n; busy = false; EO2.api.drawPortrait($('dlgFace'), n.set);
    const art = $('dlgArt'); if (n.portrait) { art.onerror = () => { art.hidden = true; $('dlg').classList.remove('art'); }; art.src = 'assets/ext/' + n.portrait + '.webp'; art.hidden = false; $('dlg').classList.add('art'); } else { art.hidden = true; $('dlg').classList.remove('art'); } $('dlgName').textContent = n.name; $('dlgRole').textContent = n.role && n.role !== 'NPC' ? n.role : ''; show(line); chips(); $('dlg').hidden = false; document.getElementById('app').classList.add('talk'); EO2.api.say(n, line, 4); if (speakOn) speak(line); return true; }
  function close() { if (!built) return; if (abort) abort.abort(); if (tts) tts.stop(); $('dlg').hidden = true; document.getElementById('app').classList.remove('talk'); cur = null; busy = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  async function ask(q) {
    if (busy || !cur) return; busy = true; const n = cur, h = hist[n.id] || (hist[n.id] = []);
    EO2.api.say(EO2.api.player, q.slice(0, 80), 3.5); EO2.api.chatAdd('bolge', 'Sen', q); show('…', true);
    let out = '';
    if (!sample) out = Math.random() < 0.5 ? n.lines[Math.floor(Math.random() * n.lines.length)] : FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    else {
      const intro = 'Ejder Ocağı adlı oyunun Merkez Meydan\'ında bir karakteri canlandırıyorsun.\nKarakter: ' + n.name + (n.role && n.role !== 'NPC' ? ' (' + n.role + ')' : '') + '. ' + (PERSONA[n.id] || '') + '\n' + WORLD + '\n' + RULES + '\n\n';
      const msgs = []; h.concat([{ q }]).forEach((t, i) => { msgs.push({ role: 'user', content: (i === 0 ? intro : '') + 'Oyuncu: ' + t.q }); if (t.a) msgs.push({ role: 'assistant', content: t.a }); });
      try { abort = new AbortController(); const res = await sample(msgs, { onText: ({ text }) => { if (cur === n) show(clean(text)); }, modelTier: 'quick', cache: false, signal: abort.signal }); out = clean(res && res.text); }
      catch (e) { const code = e && e.code; if (code === 'not_granted') { sample = null; mark(); } out = code === 'rate_limited' ? 'Biraz soluklanayım terbiyeci, sonra yine sor.' : code === 'aborted' ? '' : FALLBACK[1]; }
    }
    busy = false; if (cur !== n || !out) return;
    show(out); h.push({ q, a: out }); if (h.length > 6) h.shift();
    EO2.api.say(n, out.length > 96 ? out.slice(0, 93) + '…' : out, 6); EO2.api.chatAdd('bolge', n.name, out); n.happy = 2.5;
    if (n.id === 'ozan' && /türkü|şarkı|çal|söyle/i.test(q) && EO2.audio) EO2.audio.sing(10);
    if (speakOn) speak(out);
  }
  EO2.dialog = { open, close, isOpen: () => !!cur, npc: () => cur };
  // Oyuncu uzaklaşırsa konuşma kapanır.
  const wait = setInterval(() => { if (!EO2.api) return; clearInterval(wait); EO2.frameHooks.push(() => { if (cur && Math.hypot(EO2.api.player.x - cur.x, EO2.api.player.y - cur.y) > 3.2) close(); }); }, 80);
})();
