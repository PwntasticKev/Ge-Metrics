import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeProcessingSessionLabel, validateProcessingSessionLabel } from '../processingSessionLabel.ts'

test('normalizes input with NFC, Unicode whitespace and code point length', () => {
  assert.equal(normalizeProcessingSessionLabel('  Cafe\u0301\t 日本\n 👩‍💻  '), 'Café 日本 👩‍💻')
  assert.equal(normalizeProcessingSessionLabel(' \n\t '), null)
  assert.equal(normalizeProcessingSessionLabel('😀'.repeat(80)), '😀'.repeat(80))
  assert.throws(() => normalizeProcessingSessionLabel('😀'.repeat(81)), RangeError)
  for (const value of ['a\0b', '\u0085', 'a\u202Eb', '\u061C', '\u200E', '\u2066', '\uD800', '\uDC00']) assert.throws(() => normalizeProcessingSessionLabel(value), RangeError)
})
test('durable labels must already be canonical; absent and explicit null are supported', () => {
  for (const record of [{}, { label: null }, { label: '日本 👩‍💻' }]) assert.doesNotThrow(() => validateProcessingSessionLabel(record))
  for (const label of [undefined, 1, '', ' a', 'a  b', 'e\u0301', 'a\0', 'x'.repeat(81)]) assert.throws(() => validateProcessingSessionLabel({ label }), RangeError)
})
