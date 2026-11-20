'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { kotuMu, metniSuz, adUygunsuz } = require('../server/kufur_suzgec');
const { temizAd, temizSoz } = require('../server/meydan_presence');

test('yaygın küfür, hakaret ve nefret sözleri yakalanır', () => {
  for (const s of ['orospu', 'Orospuçocuğu', 'siktir', 'sikerim', 'amk', 'AMK', 'aq', 'amına', 'amcık', 'yarrak', 'yarak', 'piç', 'göt', 'götveren',
    'pezevenk', 'kahpe', 'kaltak', 'kevaşe', 'fahişe', 'yavşak', 'şerefsiz', 'puşt', 'ibne', 'gavat', 'dalyarak', 'taşak', 'sürtük', 'oç', 'mk',
    'fuck', 'motherfucker', 'shit', 'bitch', 'cunt', 'whore', 'nigga', 'faggot', 'hitler', 'nazi'])
    assert.equal(kotuMu(s), true, s);
});

test('kılık değiştirme işe yaramaz: rakam, işaret, harf tekrarı, büyük harf, Kiril harfi, aralıklı yazım', () => {
  for (const s of ['0r0spu', 'o.r.o.s.p.u', 'orrrrospuuu', 's1kt1r', 'S!KT!R'.replace(/!/g, '1'), 'SİKTİR', 'SIKTIR', 'yarrrrak', '@mk', 'f*u*c*k', 'оrоspu', 'p.e.z.e.v.e.n.k'])
    assert.equal(kotuMu(s), true, s);
  assert.equal(metniSuz('sen bir o r o s p u sun'), 'sen bir •••••• sun');
  assert.equal(metniSuz('s i k t i r git'), '•••••• git');
});

test('masum sözler takılmaz (yanlış pozitif listesi)', () => {
  const masum = ['klasik', 'müzik', 'fizik', 'sıkı', 'sıkıldım', 'sıkıntı', 'sıkça', 'Sıkışık', 'sikke', 'sikkeler', 'siklet', 'siklon', 'götür', 'götürdüm',
    'nazik', 'nazır', 'sayarak', 'boyarak', 'oyarak', 'kıyarak', 'doyarak', 'yaratık', 'kasıkım', 'amaç', 'amca', 'amcam', 'ama', 'aman', 'kamyon',
    'fukara', 'piknik', 'got', 'pic', 'nice', 'class', 'passage', 'hitap', 'ibrik', 'pusula', 'kahve', 'kalkan', 'tasarım', 'taşıyıcı', 'yarar', 'yarın',
    'orası', 'oraya', 'koç', 'aç', 'Işık', 'Çağrı', 'Aybars', 'Tomris', 'Sungur', 'Göktuğ', 'ejderha', 'ocak', 'Ahırda', 'düello'];
  for (const s of masum) assert.equal(kotuMu(s), false, s);
  assert.equal(metniSuz('sıkıldım ama klasik bir maçtı, sikke topladık'), 'sıkıldım ama klasik bir maçtı, sikke topladık');
});

test('sohbet ve ad süzgeci yeni kuralları kullanır', () => {
  assert.equal(temizSoz('ulan s1kt1r git'), 'ulan •••••• git');
  assert.equal(temizSoz('sen bir orospusun'), 'sen bir ••••••');
  assert.equal(temizSoz('nazik ol, götür şunu'), 'nazik ol, götür şunu');
  for (const kotu of ['Admin', 'Moderatör', 'Destek Ekibi', 'Sistem', 'Kaltak', 'Puşt Ali', 'Or Os Pu']) assert.equal(temizAd(kotu), 'Gezgin', kotu);
  for (const iyi of ['Işık', 'Sıkı Bars', 'Nazik Umay', 'Klasik', 'Sikke Avcısı']) assert.equal(temizAd(iyi), iyi, iyi);
  assert.equal(adUygunsuz('Ayşe Nur'), false);
});
