import assert from 'node:assert/strict'
import { test } from 'node:test'
import { updateLoadFailures } from '../src/lib/load-status.ts'

test('failed maps stay marked until all failed image resources recover', () => {
  let status = updateLoadFailures({}, ['a', 'b'], 'tile-1', true)
  status = updateLoadFailures(status, ['a'], 'tile-2', true)
  status = updateLoadFailures(status, ['c'], 'image-info', true)
  status = updateLoadFailures(status, ['a'], 'unrelated-tile', false)
  assert.deepEqual(status.a, ['tile-1', 'tile-2'])
  status = updateLoadFailures(status, ['a', 'b'], 'tile-1', false)
  assert.deepEqual(status, { a: ['tile-2'], c: ['image-info'] })
  status = updateLoadFailures(status, ['a'], 'tile-2', false)
  status = updateLoadFailures(status, ['c'], 'image-info', false)
  assert.deepEqual(status, {})
})
