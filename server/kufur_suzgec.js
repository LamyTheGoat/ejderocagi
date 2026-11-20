'use strict';
// Küfür ve hakaret süzgeci (2026-11-20). Meydan sohbeti, fısıltı, parti sohbeti ve oyuncu adları bu süzgeçten geçer
// (server/meydan_presence.js temizAd ve temizSoz buraya bağlıdır).
//
// Neden iki biçim var:
//   sıkı   : Türkçe harfler korunur (ı, ç, ş, ğ, ö, ü). "sık" ile "sik", "göt" ile "got", "piç" ile "pic" ayrılır;
//            böylece "sıkıldım", "götür", "nice pic" gibi masum sözler takılmaz.
//   gevşek : harfler ASCII'ye indirilir. Uzun ve masum sözcükte geçmeyen kökler (orospu, pezevenk ...) bu biçimde aranır,
//            "orospu"yu "or0spu", "o.r.o.s.p.u", "orrrospu" ya da Kiril harfiyle yazmak işe yaramaz.
// Her iki biçimde de: 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s, harf dışı her şey atılır, yinelenen harf ayrı ayrı
// tek harfe (h1) ve en çok iki harfe (h2) indirilir. "yarrak" h2'de aranır; tek r'li "yarak" yalnız söz başında,
// çünkü "sayarak", "boyarak" gibi ulaçların içinde geçer.
//
// Kural türleri:
//   ic  : gevşek biçimin içinde geçerse          bas : gevşek biçim bununla başlarsa       tam : gevşek biçim tam buysa
//   sic : sıkı biçimin içinde geçerse            sbas: sıkı biçim bununla başlarsa         stam: sıkı biçim tam buysa
// HARIC: sıkı biçimi bunlardan biriyle başlayan söz hiç yıldızlanmaz (sikke bir altın oyununda sık geçer).
// Liste bilerek "küfür ve nefret" ile sınırlıdır; "salak", "aptal" gibi hafif sözler süzülmez.
// Yanlış pozitif görülürse önce HARIC'e ekle, sonra testine bir satır yaz (tests/kufur_suzgec.test.js).

const KURAL = {
  ic: ['orospu', 'orspu', 'oruspu', 'orosbu', 'pezevenk', 'kahpe', 'kaltak', 'kevase', 'fahise', 'yavsak', 'serefsiz', 'dalyarak', 'dalyarrak',
    'yarrak', 'yarrağ', 'amcik', 'aminakoy', 'aminako', 'aminiko', 'amnakoy', 'gotveren', 'gotlek', 'ibne', 'gavat', 'tassak', 'surtuk',
    'fuck', 'shit', 'bitch', 'cunt', 'whore', 'pussy', 'asshole', 'bastard', 'nigg', 'nigga', 'faggot', 'retard', 'hitler'],
  bas: ['yarak', 'amina', 'amk', 'amq', 'aqq', 'puşt', 'pust', 'pezo', 'slut'],
  tam: ['aq', 'mk', 'oc', 'ipne', 'fag', 'dick', 'nazi', 'nazis', 'sg', 'siktirgit'],
  sic: ['siktir', 'sikerim', 'sikeyim', 'sikiyim', 'sikis', 'sikiş', 'sikik', 'sikim', 'sikti', 'sikicem', 'sikecem', 'amına', 'amcık', 'piçkurusu', 'göt veren'],
  sbas: ['sik', 'piç', 'taşak', 'göt'],
  stam: ['oç', 'göt'],
};
// "götür", "götürmek" ve "sikke", "siklet", "siklon" bu köklerle başlar ama masumdur
const HARIC = ['sikke', 'sikl', 'götür'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };
// Kiril ve Yunan harflerinden Latin görünüşlülere (а, е, о, р, с, х, і ...): "оrоspu" gibi karışık yazım
const BENZER = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'к': 'k', 'м': 'm', 'т': 't', 'н': 'h', 'в': 'b', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ο': 'o', 'α': 'a', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ρ': 'p', 'τ': 't' };
const TR_HARF = /[a-zçğıöşü]/;

function sikiBicim(s) {
  // toLowerCase (tr değil): büyük harfle yazılan "SIKTIR" da "siktir" olsun. "İ" küçülünce gelen birleşik nokta atılır.
  let out = '';
  for (const ch of String(s).normalize('NFC').toLowerCase().replace(/̇/g, '')) {
    const c = LEET[ch] || BENZER[ch] || ({ 'â': 'a', 'î': 'i', 'û': 'u' })[ch] || ch;
    if (TR_HARF.test(c)) out += c;
  }
  return out;
}
const gevset = s => s.replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
const h1 = s => s.replace(/(.)\1+/g, '$1');
const h2 = s => s.replace(/(.)\1{2,}/g, '$1$1');

const G = { ic: KURAL.ic.map(gevset), bas: KURAL.bas.map(gevset), tam: KURAL.tam.map(gevset) };
const S = { sic: KURAL.sic.map(k => k.replace(/ /g, '')), sbas: KURAL.sbas, stam: KURAL.stam };

/* Tek bir sözcük (ya da boşluksuz birleşik metin) uygunsuz mu? */
function kotuMu(ham) {
  const siki = sikiBicim(ham); if (!siki) return false;
  const s1 = h1(siki), s2 = h2(siki);
  if (HARIC.some(h => s1.startsWith(h) || s2.startsWith(h))) return false;
  const g1 = gevset(s1), g2 = gevset(s2);
  const herIki = f => f(g1) || f(g2), herIkiS = f => f(s1) || f(s2);
  if (G.ic.some(k => herIki(g => g.includes(k)))) return true;
  if (G.bas.some(k => herIki(g => g.startsWith(k)))) return true;
  if (G.tam.some(k => herIki(g => g === k))) return true;
  if (S.sic.some(k => herIkiS(s => s.includes(k)))) return true;
  if (S.sbas.some(k => herIkiS(s => s.startsWith(k)))) return true;
  if (S.stam.some(k => herIkiS(s => s === k))) return true;
  return false;
}

const yildiz = soz => '•'.repeat(Math.min(6, Math.max(3, [...soz].length)));

/* Sohbet metni: uygunsuz sözcükler yıldızlanır. Harf harf aralıklı yazım ("o r o s p u", "s.i.k") da yakalanır:
   art arda en az üç tek harfli parça birleştirilip denetlenir; tutarsa o parçaların hepsi yıldızlanır. */
function metniSuz(metin) {
  const parca = String(metin).split(' ');
  const kotu = parca.map(p => kotuMu(p));
  for (let i = 0; i < parca.length;) {
    if (sikiBicim(parca[i]).length !== 1) { i++; continue; }
    let j = i; while (j < parca.length && sikiBicim(parca[j]).length === 1) j++;
    if (j - i >= 3 && kotuMu(parca.slice(i, j).join(''))) for (let k = i; k < j; k++) kotu[k] = true;
    i = j;
  }
  let out = parca.map((p, i) => kotu[i] ? yildiz(p) : p);
  // aralıklı yazım tek yıldız öbeği olsun ("• • •" yerine "•••")
  out = out.join(' ').replace(/•{3}( •{3})+/g, '••••••');
  return out;
}

/* Oyuncu adı: her sözcük, bitişik hâli ve yönetici kılığı denetlenir (Admin, Moderatör, Destek ... adı kullanılamaz). */
const KILIK = ['admin', 'moderator', 'yonetici', 'gamemaster', 'sistem', 'destek', 'ejderocagi'];
function adUygunsuz(ad) {
  const sozler = String(ad).split(/\s+/).filter(Boolean);
  if (sozler.some(kotuMu)) return true;
  const bitisik = sozler.join('');
  if (kotuMu(bitisik)) return true;
  const g = gevset(h1(sikiBicim(bitisik)));
  return KILIK.some(k => g.includes(k));
}

module.exports = { kotuMu, metniSuz, adUygunsuz, sikiBicim, KURAL, HARIC };
