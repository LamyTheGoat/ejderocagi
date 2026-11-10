/* EO2 · yalnız yerel deneme için: yayın sayfasındaki window.claude yeteneklerinin taklidi (?mock=1 ile yüklenir).
   room: aynı tarayıcıdaki sekmeler arasında BroadcastChannel; user: rastgele ad; sample: hazır cümleyi akıtır; tts: sessiz.
   Yayına gitmez (index.html'de BODY işaretlerinin dışında). */
(function () {
  'use strict';
  const me = 'p' + Math.random().toString(36).slice(2, 10), names = ['Arven', 'Mirae', 'Kordis', 'Thorn', 'Selin', 'Bora'], myName = names[Math.floor(Math.random() * names.length)];
  const ch = new BroadcastChannel('eo2-mock-room'), peers = new Map(), handlers = [];
  let pres = {};
  const snap = () => [{ peer: me, by: me, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: pres, updatedAt: Date.now() }, ...[...peers.values()]];
  const fire = (joined, left, updated) => { const c = { peers: snap(), joined, left, updated }; for (const h of handlers) h(c); };
  ch.onmessage = e => { const m = e.data; if (m.from === me) return;
    if (m.t === 'bye') { const p = peers.get(m.from); if (p) { peers.delete(m.from); fire([], [p], []); } return; }
    if (m.t === 'hello') ch.postMessage({ t: 'pres', from: me, name: myName, pres });
    const was = peers.get(m.from), p = { peer: m.from, by: m.from, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: m.pres || {}, updatedAt: Date.now(), _name: m.name };
    peers.set(m.from, p); fire(was ? [] : [p], [], was ? [p] : []); };
  addEventListener('pagehide', () => ch.postMessage({ t: 'bye', from: me }));
  const room = { presence(patch) { pres = Object.assign({}, pres, patch); for (const k of Object.keys(pres)) if (pres[k] === null) delete pres[k]; ch.postMessage({ t: 'pres', from: me, name: myName, pres }); return Promise.resolve(); },
    peers: snap, onPeers(h) { handlers.push(h); Promise.resolve().then(() => h({ peers: snap(), joined: snap(), left: [], updated: [] })); ch.postMessage({ t: 'hello', from: me, name: myName, pres }); return () => {}; },
    emit: () => Promise.resolve(), on: () => () => {}, connected: () => true, onConnection(h) { h(true); return () => {}; } };
  const user = { me: () => Promise.resolve({ id: me, name: myName + ' Deneme' }), id: () => Promise.resolve(me), profiles: ids => Promise.resolve(Object.fromEntries(ids.map(i => [i, { id: i, name: (peers.get(i) && peers.get(i)._name) || '' }]))) };
  const sample = async (input, opt) => { const q = Array.isArray(input) ? input[input.length - 1].content : String(input), text = /türkü/i.test(q) ? 'Kor yanar ocakta, yavru uyur kucakta. Meydanın çeşmesi akar, ejder gölgesi bakar.' : 'Hoş geldin terbiyeci. Meydanı bir dolaş, sonra yine gel konuşalım.';
    let out = ''; for (const w of text.split(' ')) { await new Promise(r => setTimeout(r, 60)); out += (out ? ' ' : '') + w; if (opt && opt.onText) opt.onText({ text: out, delta: w }); } return { text: out, truncated: false }; };
  const tts = { speak: () => new Promise(r => setTimeout(r, 400)), stop() {}, onState() { return () => {}; } };
  const caps = { room, user, sample, tts };
  window.claude = { use: n => Promise.resolve(caps[n] || null) };
})();
