/* Ejder Ocağı 2.0 · NPC sohbeti (hazır replikler)
   Hiçbir dış bağlantı yok: her soru için cevap burada yazılıdır. Replikler oyunun kendi dünyasından söz eder;
   fiyat, ödül, olasılık ve sayı içermez. Metin yalnız textContent ile yazılır. */
(function () {
  'use strict';
  const EO2 = window.EO2, $ = id => document.getElementById(id);
  const REPLY = {
    ozan: { 'Bir türkü söyle': 'Kor düştü ocağa, kül oldu gece; bir yumurta ısındı, bekledi sessizce. Kanat açtı sabaha, göründü Kızıl Taç; dedenin ocağında yine yandı ağaç.', 'Kor\'u tanır mısın?': 'Kor\'u bilmeyen mi var? Deden onunla arenaya çıktığında meydan susardı. Yaşlandı ama yüreği hâlâ kızgın bir kor.', 'Meydanda ne var?': 'Han\'da masalar, Bedesten\'de pazarlık, kuzeyde sefer yolu, batıda Topçu Arenası. Yorulursan çeşmenin başına gel, saz hazır.' },
    rustem: { 'Bedesten nasıl işler?': 'Terbiyeciler mallarını ilan eder, alan da satan da pazarlığını kendi yapar. Ben yalnız terazinin doğru tartmasına bakarım.', 'Sende ne bulunur?': 'Yem, yumurta, damızlık, bazen de nadir bir tılsım. Ne varsa tezgâhta görürsün; kulaktan dolma mal satmam.' },
    kerim: { 'Örste ne dövülür?': 'Pençe, zırh, başlık, tılsım. Demir kordan çıkmadan şekil almaz; ejderin de öyle.', 'Topçu için ne gerek?': 'Sağlam bir top, sabırlı bir ejder, bir de rüzgârı okuyan göz. Topu ben dökerim, gerisi sende.' },
    bekci1: { 'Kuzey Yolu nereye çıkar?': 'Seferlere ve kervan kampına çıkar. Hazırlıksız gitme, terbiyeci; yol uzun, biyomlar huysuz.' },
    bekci2: { 'Kapıdan kimler geçer?': 'Kervancılar, haritacılar, bir de yavrusunu ilk kez sefere çıkaran terbiyeciler. Hepsinin yüzünü tanırım.' },
    yumurtaci: { 'Yavruma nasıl bakarım?': 'Karnını doyur, onunla konuş, yorulunca dinlendir. Yavru sevgiyle büyür, zorla değil.', 'Bahçede kim var?': 'Ocağının ejderleri orada gezinir. Kapıdan gir, hepsini gerçek boylarında görürsün.' },
    muhtar: { 'Bugün meydanda ne var?': 'Pazar kuruldu, Han\'da masalar dolu, arenada talim var. Her zamanki gibi: bir köşede kavga, bir köşede türkü.', 'Nereden başlamalıyım?': 'Önce ocağını toparla, yumurtanı ısıt. Sonra ejderine bir görev ver ve haftayı bitir. Gerisi kendiliğinden gelir.' },
    tuccar: { 'Tezgâhında ne var?': 'Uzak diyarlardan ne bulduysam. Bak, dokun, beğenirsen konuşuruz.' }, hamal: { 'Nereye taşıyorsun?': 'Bedesten\'e, tezgâhlara, bir oraya bir buraya. Sırtım biliyor, dilim söylemiyor.' },
    baharatci: { 'Ejderim ne sever?': 'Her ejderin bir sevdiği vardır; ateşliler biberi, buzlular kar meyvesini arar. Seninkinin huyunu onunla konuşarak öğrenirsin.', 'Bugün ne taze?': 'Sabah ne geldiyse o taze. Tezgâha bak, kokusundan anlarsın.' },
    talimci: { 'Atışta nelere bakmalıyım?': 'Açına, gücüne, bir de bastığın yere. Acele eden ıskalar; nefesini tut, öyle bırak.', 'Rüzgâr neyi değiştirir?': 'Her şeyi. Karşıdan eserse atışın kısalır, arkandan eserse uzar. Sancağa bak, sonra nişan al.' },
    arenabekci: { 'Arenada neler var?': 'Topçu düelloları, ejderha dövüşleri ve mühürlü zindan kapıları. Kapılar hak edene açılır.' }, cirak: { 'Talim nasıl gidiyor?': 'Dün hedefi vurdum! Bugün de vuracağım, yani umarım. Usta bakarken elim titriyor.' },
    hanci: { 'Handa ne oynanır?': 'Tavla, Kor Yirmi Bir, bir de ejder pokeri. Zar da kart da hazır; yeter ki masada yer bulunsun.', 'Bana bir masa var mı?': 'Senin için her zaman var, terbiyeci. Ocağın başı sıcak, otur soluklan.' },
    tavlaci1: { 'Kim kazanıyor?': 'Kim olacak, ben! Zar benden yana, bugün düşeş üstüne düşeş.' }, tavlaci2: { 'Şansın nasıl?': 'Sorma. Zar bana küsmüş. Ama masadan kalkarsam hiç dönmez.' },
    bahcivan: { 'Kor nasıl bugün?': 'Güneşe yattı, kuyruğunu kıvırdı. Yaşlı ejder böyledir; az kıpırdar, çok görür.', 'Yavrulara ne iyi gelir?': 'Sabır. Bir de sevdiği yem. Acele ettirirsen huysuzlanır.' },
    kervanci: { 'Sefer nereye gider?': 'Ormana, bataklığa, buzula, daha ötesine. Her biyomun ejderi de derdi de ayrıdır.', 'Yolda ne beklemeliyim?': 'Beklemediğini. Yanına yem al, ejderini yormadan çık.' }, devriye: { 'Yol güvenli mi?': 'Kampa kadar güvenli. Ötesi için söz veremem.' },
  };
  const BOS = ['Hayırlı işler, terbiyeci.', 'Sözün özü: ejderine iyi bak.'];
  let cur = null, built = false;
  function build() { if (built) return; built = true; const I = EO2.api.ICON, el = document.createElement('section'); el.id = 'dlg'; el.className = 'box'; el.hidden = true; el.setAttribute('aria-label', 'Konuşma');
    el.innerHTML = '<img id="dlgArt" alt="" hidden><canvas id="dlgFace" width="144" height="144"></canvas><div class="dlg-main"><header><b id="dlgName"></b><i id="dlgRole"></i><button type="button" class="rb" id="dlgClose" aria-label="Konuşmayı kapat (Esc)"></button></header><p id="dlgText"></p><div id="dlgChips"></div></div>';
    $('hud').appendChild(el); $('dlgClose').innerHTML = I.close; $('dlgClose').addEventListener('click', close); }
  const ACT_AD = { 'panel:uretim': 'Örse bak', duel: 'Düelloya gir', 'panel:kuzey': 'Sefere bak', 'panel:pazar': 'İlanlara bak' };
  function chips() { const box = $('dlgChips'); box.textContent = ''; for (const q of Object.keys(REPLY[cur.id] || {})) { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', () => ask(q)); box.appendChild(b); }
    if (cur.act) { const b = document.createElement('button'); b.type = 'button'; b.className = 'go'; b.textContent = ACT_AD[cur.act] || 'İçeri gir'; b.addEventListener('click', () => { const a = cur.act; close(); EO2.api.runAct(a); }); box.appendChild(b); } }
  function open(n, line) { build(); cur = n; EO2.api.drawPortrait($('dlgFace'), n.set); const art = $('dlgArt');
    if (n.portrait) { art.onerror = () => { art.hidden = true; $('dlg').classList.remove('art'); }; art.src = 'assets/ext/' + n.portrait + '.webp'; art.hidden = false; $('dlg').classList.add('art'); } else { art.hidden = true; $('dlg').classList.remove('art'); }
    $('dlgName').textContent = n.name; $('dlgRole').textContent = n.role && n.role !== 'NPC' ? n.role : ''; $('dlgText').textContent = line; chips(); $('dlg').hidden = false; document.getElementById('app').classList.add('talk'); EO2.api.say(n, line, 4); return true; }
  function close() { if (!built) return; $('dlg').hidden = true; document.getElementById('app').classList.remove('talk'); cur = null; }
  function ask(q) { if (!cur) return; const n = cur, a = (REPLY[n.id] || {})[q] || BOS[Math.floor(Math.random() * BOS.length)]; EO2.api.say(EO2.api.player, q.slice(0, 80), 3); $('dlgText').textContent = a; EO2.api.say(n, a.length > 90 ? a.slice(0, 88) + '…' : a, 5); if (EO2.audio) EO2.audio.pop(); }
  EO2.dialog = { open, close, isOpen: () => !!cur, npc: () => cur };
})();
