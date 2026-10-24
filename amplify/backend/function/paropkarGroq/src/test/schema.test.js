const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateExtraction } = require('../lib/schema');

const VALID = {
  certificateType: 'caste_certificate',
  holderName: 'Meena Kumari',
  issueDate: '2024-02-29',
  expiryDate: null,
  issuingAuthority: 'Tahsildar, Sadar',
  state: 'Uttar Pradesh',
  confidence: 0.8,
};

test('accepts a valid extraction', () => {
  const r = validateExtraction(VALID);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, VALID);
});

test('accepts all-null fields', () => {
  const r = validateExtraction({
    certificateType: null, holderName: null, issueDate: null, expiryDate: null,
    issuingAuthority: null, state: null, confidence: 0,
  });
  assert.equal(r.success, true);
});

test('strips unknown keys', () => {
  const r = validateExtraction({ ...VALID, fatherName: 'X' });
  assert.equal(r.success, true);
  assert.equal('fatherName' in r.data, false);
});

const invalidCases = [
  ['missing key', (({ state, ...rest }) => rest)(VALID), 'state'],
  ['unknown certificate type', { ...VALID, certificateType: 'income' }, 'certificateType'],
  ['non-ISO date', { ...VALID, issueDate: '29/02/2024' }, 'issueDate'],
  ['impossible date', { ...VALID, expiryDate: '2023-02-29' }, 'expiryDate'],
  ['empty string instead of null', { ...VALID, holderName: '  ' }, 'holderName'],
  ['confidence above 1', { ...VALID, confidence: 1.5 }, 'confidence'],
  ['confidence as string', { ...VALID, confidence: '0.9' }, 'confidence'],
  ['missing confidence', (({ confidence, ...rest }) => rest)(VALID), 'confidence'],
];

for (const [name, value, field] of invalidCases) {
  test(`rejects ${name}`, () => {
    const r = validateExtraction(value);
    assert.equal(r.success, false);
    assert.ok(r.errors.some(e => e.startsWith(field)), r.errors.join('; '));
  });
}

test('rejects non-objects', () => {
  for (const v of [null, [], 'text', 42]) assert.equal(validateExtraction(v).success, false);
});
