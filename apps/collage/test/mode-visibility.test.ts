import assert from 'node:assert/strict'
import { test } from 'node:test'
import { modeVisibility } from '../src/lib/mode-visibility.ts'

test('editing visibility preserves group scope and restores it after either mode', () => {
  for (const showOthers of [true, false]) {
    const maps = new Map([
      ['active', { visible: true }],
      ['peer', { visible: true }],
      ['outside-group', { visible: false }]
    ])
    const visibility = modeVisibility(
      {
        getWarpedMap: (id) => maps.get(id),
        setMapOptions: (id, options, animation) => {
          assert.equal(animation.animate, false)
          Object.assign(maps.get(id)!, options)
        }
      },
      [...maps.keys(), 'unavailable'],
      'active'
    )
    visibility.showOthers(showOthers)
    assert.equal(maps.get('active')!.visible, true)
    assert.equal(maps.get('peer')!.visible, showOthers)
    assert.equal(maps.get('outside-group')!.visible, false)
    visibility.showOthers(!showOthers)
    assert.equal(maps.get('peer')!.visible, !showOthers)
    assert.equal(maps.get('outside-group')!.visible, false)
    visibility.restore()
    assert.equal(maps.get('peer')!.visible, true)
    assert.equal(maps.get('outside-group')!.visible, false)
    maps.delete('peer')
    assert.doesNotThrow(() => visibility.restore())
  }
})

test('hiding other maps keeps every member of a Transform selection visible', () => {
  const maps = new Map(
    ['first', 'second', 'other'].map((id) => [id, { visible: true }])
  )
  const visibility = modeVisibility(
    {
      getWarpedMap: (id) => maps.get(id),
      setMapOptions: (id, options) => Object.assign(maps.get(id)!, options)
    },
    [...maps.keys()],
    ['first', 'second']
  )
  visibility.showOthers(false)
  assert.deepEqual(
    [...maps.values()].map((map) => map.visible),
    [true, true, false]
  )
  visibility.restore()
  assert.ok([...maps.values()].every((map) => map.visible))
})
