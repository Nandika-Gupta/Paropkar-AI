const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeExpiry } = require('../lib/expiry');
const { normalizeDate, todayInIndia } = require('../lib/dates');

const today = '2025-01-15';

test('uses the printed expiry date', () => {
  const r = computeExpiry({ certificateType: 'income_certificate', issueDate: '2024-03-12', expiryDate: '2025-03-11' }, { today });
  assert.deepEqual(r, { expiryDate: '2025-03-11', expirySource: 'document', status: 'VALID', daysRemaining: 55 });
});

test('expiring soon within 30 days, inclusive', () => {
  assert.equal(computeExpiry({ expiryDate: '2025-02-14' }, { today }).status, 'EXPIRING_SOON');
  assert.equal(computeExpiry({ expiryDate: '2025-02-15' }, { today }).status, 'VALID');
  const sameDay = computeExpiry({ expiryDate: today }, { today });
  assert.equal(sameDay.status, 'EXPIRING_SOON');
  assert.equal(sameDay.daysRemaining, 0);
});

test('expired gives negative days remaining', () => {
  const r = computeExpiry({ expiryDate: '2025-01-10' }, { today });
  assert.equal(r.status, 'EXPIRED');
  assert.equal(r.daysRemaining, -5);
});

test('derives expiry from validity when none is printed', () => {
  const income = computeExpiry({ certificateType: 'income_certificate', issueDate: '2024-03-12', expiryDate: null }, { today });
  assert.equal(income.expiryDate, '2025-03-11');
  assert.equal(income.expirySource, 'derived_from_validity');

  const caste = computeExpiry({ certificateType: 'caste_certificate', issueDate: '2023-01-01', expiryDate: null }, { today });
  assert.equal(caste.expiryDate, '2024-12-30');
  assert.equal(caste.status, 'EXPIRED');
});

test('unknown when there is nothing to go on', () => {
  for (const f of [{}, { certificateType: 'domicile_certificate', issueDate: '2024-01-01' }, { certificateType: 'income_certificate' }]) {
    assert.deepEqual(computeExpiry(f, { today }), { expiryDate: null, expirySource: null, status: 'UNKNOWN', daysRemaining: null });
  }
});

test('day counts are not affected by leap years or time zones', () => {
  assert.equal(computeExpiry({ expiryDate: '2024-03-01' }, { today: '2024-02-28' }).daysRemaining, 2);
  // 20:00 UTC on Jan 14 is already Jan 15 in India
  assert.equal(todayInIndia(new Date('2025-01-14T20:00:00Z')), '2025-01-15');
});

test('normalizeDate reads Indian day-first formats', () => {
  const cases = {
    '05/06/2024': '2024-06-05',
    '5-6-2024': '2024-06-05',
    '05.06.24': '2024-06-05',
    '2024-06-05': '2024-06-05',
    '15 March 2024': '2024-03-15',
    '15-Mar-2024': '2024-03-15',
    '1st Jan, 2024': '2024-01-01',
    'March 15, 2024': '2024-03-15',
    '1O/O5/2O24': '2024-05-10',
    '31/04/2024': null,
    'soon': null,
    '': null,
    null: null,
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(normalizeDate(input === 'null' ? null : input), expected, input);
  }
});
