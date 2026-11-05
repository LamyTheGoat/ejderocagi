'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEconomyClient } = require('../js/economy_client');
const reply = (version, gold = 420, extra = {}) => ({ ok: true, status: 200, json: async () => ({ economy: { version, gold }, ...extra }) });
test('economic client deduplicates reads; response loss retries exactly the same command', async () => {
  const sent = []; let reads = 0, writes = 0;
  const client = createEconomyClient({ uuid: () => 'fixed-request', fetch: async (url, options) => {
    if (options.method !== 'POST') { reads++; return reply(1); }
    sent.push(JSON.parse(options.body));
    if (++writes === 1) throw new Error('response_lost');
    return reply(2, 220, { replayed: true });
  } });
  await Promise.all([client.refresh(), client.refresh()]); assert.equal(reads, 1);
  await assert.rejects(client.command('chibi.craft', { itemId: 'hat_2' }), /response_lost/);
  assert.equal(client.state.gold, 420); assert.equal(client.hasPending, true);
  await assert.rejects(client.command('shop.food', { key: 'balik' }), /pending/);
  const result = await client.retry(); assert.equal(result.replayed, true);
  assert.deepEqual(sent[0], sent[1]); assert.equal(client.state.gold, 220); assert.equal(client.hasPending, false);
});
test('version conflicts refresh state but never silently repeat a purchase', async () => {
  let reads = 0, writes = 0;
  const client = createEconomyClient({ uuid: () => 'fixed-request', fetch: async (url, options) => {
    if (options.method !== 'POST') return reply(++reads, reads === 1 ? 420 : 220);
    writes++; return { ok: false, status: 409, json: async () => ({ error: 'version_conflict' }) };
  } });
  await assert.rejects(client.command('chibi.craft', { itemId: 'hat_2' }), /version_conflict/);
  assert.equal(writes, 1); assert.equal(reads, 2); assert.equal(client.state.gold, 220); assert.equal(client.hasPending, false);
});
