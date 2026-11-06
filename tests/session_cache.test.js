'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGuestSessions } = require('../server/guest_session');
test('session reads coalesce and are cached for 60 seconds, never beyond expiry', async () => {
  let calls = 0, time = 1000;
  const store = { async resolveSession() { calls++; return { accountId: 'a', expiresAt: 91000 }; } };
  const sessions = createGuestSessions(store, 'http://game.test', false, { now: () => time });
  const req = { headers: { cookie: 'eo_guest=' + 'a'.repeat(43) } };
  await Promise.all(Array.from({ length: 30 }, () => sessions.resolve(req)));
  assert.equal(calls, 1);
  time = 60999; await sessions.resolve(req); assert.equal(calls, 1);
  time = 61001; await sessions.resolve(req); assert.equal(calls, 2);
  time = 91000; assert.equal(await sessions.resolve(req), null); assert.equal(calls, 3);
});

test('fresh economic authorization bypasses a cached session immediately after revocation',async()=>{
 let revoked=false;const sessions=createGuestSessions({resolveSession:async()=>revoked?null:{accountId:'a',expiresAt:Date.now()+60000}},'http://game.test');
 const req={headers:{cookie:'eo_guest='+'b'.repeat(43)}};
 assert.equal((await sessions.resolve(req)).accountId,'a');revoked=true;
 assert.equal(await sessions.resolve(req,{fresh:true}),null);
});
