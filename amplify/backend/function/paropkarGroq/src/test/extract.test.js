const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractFields, parseJsonReply, loadPrompt } = require('../lib/extract');

const LINES = [
  'GOVERNMENT OF KARNATAKA',
  'INCOME CERTIFICATE',
  'This is to certify that Shri Arjun Nayak S/o Ramesh Nayak',
  'Date of Issue: 12/03/2024',
  'Valid Upto: 11/03/2025',
  'Tahsildar, Hunsur Taluk',
];

const GOOD = {
  certificateType: 'income_certificate',
  holderName: 'Arjun Nayak',
  issueDate: '2024-03-12',
  expiryDate: '2025-03-11',
  issuingAuthority: 'Tahsildar, Hunsur Taluk',
  state: 'Karnataka',
  confidence: 0.92,
};

/** Mock Groq client that returns the given replies in order and records calls. */
function mockClient(...replies) {
  const calls = [];
  return {
    calls,
    async chat(req) {
      calls.push(JSON.parse(JSON.stringify(req)));
      const next = replies[calls.length - 1];
      if (next instanceof Error) throw next;
      return {
        content: typeof next === 'string' ? next : JSON.stringify(next),
        usage: { promptTokens: 100, completionTokens: 40 },
        latencyMs: 50,
      };
    },
  };
}

test('valid reply on first attempt is returned without review', async () => {
  const client = mockClient(GOOD);
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, false);
  assert.deepEqual(r.fields, GOOD);
  assert.equal(r.attempts, 1);
  assert.equal(r.schemaValidFirstAttempt, true);
  assert.equal(client.calls.length, 1);
});

test('calls Groq with temperature 0, JSON mode and the versioned prompt', async () => {
  const client = mockClient(GOOD);
  await extractFields(LINES, { client, model: 'some-model' });
  const req = client.calls[0];
  assert.equal(req.temperature, 0);
  assert.equal(req.jsonMode, true);
  assert.equal(req.model, 'some-model');
  assert.equal(req.messages[0].content, loadPrompt('v1'));
  assert.deepEqual(JSON.parse(req.messages[1].content), LINES);
});

test('malformed JSON is retried once and can succeed', async () => {
  const client = mockClient('{"certificateType": "income_certificate", ', GOOD);
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, false);
  assert.equal(r.attempts, 2);
  assert.equal(r.schemaValidFirstAttempt, false);
  assert.deepEqual(r.fields, GOOD);
  // The retry tells the model what was wrong
  const retryMsg = client.calls[1].messages.at(-1).content;
  assert.match(retryMsg, /invalid JSON/);
  // Usage and latency are summed across attempts
  assert.deepEqual(r.usage, { promptTokens: 200, completionTokens: 80 });
  assert.equal(r.latencyMs, 100);
});

test('two malformed replies give needsReview and no more calls', async () => {
  const client = mockClient('not json at all', 'still not json', GOOD);
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, true);
  assert.deepEqual(r.reviewReasons, ['invalid_output']);
  assert.equal(r.fields, null);
  assert.equal(client.calls.length, 2);
  assert.match(r.error, /invalid JSON/);
});

test('schema-invalid JSON is retried, then needsReview', async () => {
  const bad = { ...GOOD, issueDate: '12/03/2024', certificateType: 'income' };
  const client = mockClient(bad, bad);
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, true);
  assert.equal(r.attempts, 2);
  assert.match(r.error, /issueDate/);
  assert.match(r.error, /certificateType/);
  // raw keeps the parsed (invalid) object for debugging/eval
  assert.equal(r.raw.issueDate, '12/03/2024');
});

test('reply wrapped in code fences is accepted', async () => {
  const client = mockClient('```json\n' + JSON.stringify(GOOD) + '\n```');
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, false);
});

test('network/API error gives needsReview without retry', async () => {
  const client = mockClient(new Error('Groq API 503: unavailable'));
  const r = await extractFields(LINES, { client });
  assert.equal(r.needsReview, true);
  assert.deepEqual(r.reviewReasons, ['llm_error']);
  assert.equal(client.calls.length, 1);
});

test('empty input skips the LLM call', async () => {
  const client = mockClient(GOOD);
  for (const input of [[], ['', '   '], null, 'not-an-array']) {
    const r = await extractFields(input, { client });
    assert.equal(r.needsReview, true);
    assert.deepEqual(r.reviewReasons, ['no_text']);
  }
  assert.equal(client.calls.length, 0);
});

test('parseJsonReply', () => {
  assert.deepEqual(parseJsonReply('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.equal(parseJsonReply('').ok, false);
  assert.equal(parseJsonReply(undefined).ok, false);
});

test('loadPrompt rejects path-like versions', () => {
  assert.throws(() => loadPrompt('../secrets'), /Invalid prompt version/);
});
