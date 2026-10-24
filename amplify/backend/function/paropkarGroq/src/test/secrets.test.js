const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { getGroqApiKey, resetSecretCache } = require('../lib/secrets');

beforeEach(resetSecretCache);

test('reads the key from SSM when the env var is an Amplify secret path', async () => {
  const seen = [];
  const key = await getGroqApiKey({
    env: { GROQ_API_KEY: '/amplify/app/dev/AMPLIFY_paropkarGroq_GROQ_API_KEY', REGION: 'ap-south-1' },
    getParameter: async (name, region) => { seen.push([name, region]); return 'from-ssm'; },
  });
  assert.equal(key, 'from-ssm');
  assert.deepEqual(seen, [['/amplify/app/dev/AMPLIFY_paropkarGroq_GROQ_API_KEY', 'ap-south-1']]);
});

test('caches the key after the first lookup', async () => {
  let calls = 0;
  const opts = { env: { GROQ_API_KEY: '/p' }, getParameter: async () => { calls++; return 'k'; } };
  await getGroqApiKey(opts);
  await getGroqApiKey(opts);
  assert.equal(calls, 1);
});

test('accepts a literal key for local runs', async () => {
  assert.equal(await getGroqApiKey({ env: { GROQ_API_KEY: 'local-key' } }), 'local-key');
});

test('returns empty string when not configured', async () => {
  assert.equal(await getGroqApiKey({ env: {} }), '');
});
