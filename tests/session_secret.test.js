'use strict';
// K2 (Y-3): üretimde SESSION_SECRET zorunlu; yerelde rastgele sır + tek satır uyarı.
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveSessionSecret, isProductionEnv } = require('../server/session_secret');

const collect = () => { const lines = []; return { lines, warn: (m) => lines.push(m) }; };

test('K2 session secret: production without SESSION_SECRET refuses to start', () => {
  for (const env of [{ NODE_ENV: 'production' }, { K_SERVICE: 'ejderocagi' }, { NODE_ENV: 'production', SESSION_SECRET: '' }, { K_SERVICE: 'x', NODE_ENV: 'test' }]) {
    const w = collect();
    assert.throws(() => resolveSessionSecret(env, w.warn), (e) => e instanceof Error && e.message === 'SESSION_SECRET is required in production');
    assert.equal(w.lines.length, 0);
  }
});

test('K2 session secret: configured secret is used as-is and never logged', () => {
  const secret = 'configured-secret-value-1234567890';
  for (const env of [{ NODE_ENV: 'production', SESSION_SECRET: secret }, { K_SERVICE: 'x', SESSION_SECRET: secret }, { NODE_ENV: 'test', SESSION_SECRET: secret }]) {
    const w = collect();
    assert.equal(resolveSessionSecret(env, w.warn), secret);
    assert.equal(w.lines.length, 0);
  }
});

test('K2 session secret: local/test env keeps random per-process secret with one warning', () => {
  for (const env of [{}, { NODE_ENV: 'test' }, { NODE_ENV: 'development' }]) {
    const w = collect();
    const a = resolveSessionSecret(env, w.warn);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(w.lines.length, 1);
    assert.ok(!w.lines[0].includes(a));
    assert.notEqual(resolveSessionSecret(env, () => {}), a);
  }
  assert.equal(isProductionEnv({ NODE_ENV: 'test' }), false);
  assert.equal(isProductionEnv({ NODE_ENV: 'production' }), true);
  assert.equal(isProductionEnv({ K_SERVICE: 'svc' }), true);
});
