const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDayRange,
  uniqueKey,
  toCsv,
  snowflakeFromTimestamp
} = require('../src/lib/shared-utils.js');

test('parseDayRange returns full-day bounds', () => {
  const { from, to } = parseDayRange('2026-02-12', '2026-02-13');
  assert.equal(from.getFullYear(), 2026);
  assert.equal(from.getMonth(), 1);
  assert.equal(from.getDate(), 12);
  assert.equal(from.getHours(), 0);
  assert.equal(from.getMinutes(), 0);
  assert.equal(from.getSeconds(), 0);

  assert.equal(to.getFullYear(), 2026);
  assert.equal(to.getMonth(), 1);
  assert.equal(to.getDate(), 13);
  assert.equal(to.getHours(), 23);
  assert.equal(to.getMinutes(), 59);
  assert.equal(to.getSeconds(), 59);
});

test('uniqueKey handles Date and string timestamps', () => {
  const rowDate = { time: new Date('2026-02-12T10:00:00Z'), author: 'A', text: 'Hi' };
  const rowString = { time: '2026-02-12T10:00:00.000Z', author: 'A', text: 'Hi' };

  assert.equal(uniqueKey(rowDate), uniqueKey(rowString));
});

test('toCsv escapes quotes and builds header', () => {
  const csv = toCsv([
    { time: '2026-02-12T10:00:00.000Z', author: 'Ann', text: 'Hello' },
    { time: '2026-02-12T11:00:00.000Z', author: 'Bob', text: 'He said "ok"' }
  ]);

  const lines = csv.split('\n');
  assert.equal(lines[0], '"Дата","Автор","Текст"');
  assert.equal(lines[2], '"2026-02-12T11:00:00.000Z","Bob","He said ""ok"""');
});

test('snowflakeFromTimestamp uses Discord epoch', () => {
  assert.equal(snowflakeFromTimestamp(1420070400000), '0');
  const next = snowflakeFromTimestamp(1420070400001);
  assert.ok(BigInt(next) > 0n);
});