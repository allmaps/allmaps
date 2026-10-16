import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  defaultToolSettings,
  parseToolSettings,
  enabledTools,
  reorderTool,
  parseImportTransformation
} from '../src/lib/tool-settings.ts'
import {
  controlLayout,
  fitControlCenter,
  radiusForSize
} from '../src/lib/control-layout.ts'

test('tool preferences default to hidden mirror and retain order through storage', () => {
  const defaults = defaultToolSettings()
  assert.deepEqual(
    defaults.filter((tool) => !tool.enabled).map((tool) => tool.tool),
    ['mirror']
  )
  const changed = defaults
    .toReversed()
    .map((entry) => ({ ...entry, enabled: !entry.enabled }))
  assert.deepEqual(
    parseToolSettings(JSON.parse(JSON.stringify(changed))),
    changed
  )
  assert.deepEqual(parseToolSettings(null), defaults)
  const recovered = parseToolSettings([
    { tool: 'transform', enabled: true },
    { tool: 'transform', enabled: false },
    { tool: 'unknown', enabled: true }
  ])
  assert.equal(recovered.length, defaults.length)
  assert.deepEqual(recovered[0], { tool: 'transform', enabled: true })
  const legacy = parseToolSettings([{ tool: 'skew', enabled: true }])
  assert.equal(
    legacy.some(({ tool }) => String(tool) === 'skew'),
    false
  )
  assert.equal(legacy.find(({ tool }) => tool === 'transform')?.enabled, true)
  assert.deepEqual(
    enabledTools(defaults.map((entry) => ({ ...entry, enabled: false }))),
    []
  )
  assert.deepEqual(
    enabledTools(
      defaults.map((entry) => ({ ...entry, enabled: false })),
      true
    ),
    ['lock']
  )
})

test('custom ring order has no gaps and handles a single tool or an empty ring', () => {
  const layout = controlLayout([300, 300], 0, { opacity: 1, hue: 0 }, 150, [
    'rotate',
    'lock',
    'move'
  ])
  assert.deepEqual(Object.keys(layout), ['rotate', 'lock', 'move'])
  const distance = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  assert.ok(
    Math.abs(
      distance(layout.rotate.position, layout.lock.position) -
        distance(layout.lock.position, layout.move.position)
    ) < 1e-8
  )
  assert.ok(radiusForSize(0, 3) < radiusForSize(0, 12))
  const single = controlLayout([300, 300], 0, { opacity: 1, hue: 0 }, 100, [
    'lock'
  ])
  assert.ok(single.lock.position.every(Number.isFinite))
  const empty = controlLayout([300, 300], 0, { opacity: 1, hue: 0 }, 100, [])
  assert.deepEqual(fitControlCenter([300, 300], empty, [600, 600]), [300, 300])
})

test('drag ordering moves a tool without changing other settings and clamps list boundaries', () => {
  const defaults = defaultToolSettings()
  const ordered = reorderTool(defaults, 'rotate', 2)
  assert.equal(ordered[2].tool, 'rotate')
  assert.deepEqual(
    ordered.filter((entry) => entry.tool !== 'rotate'),
    defaults.filter((entry) => entry.tool !== 'rotate')
  )
  assert.equal(reorderTool(defaults, 'transform', -1)[0].tool, 'transform')
  assert.equal(
    reorderTool(defaults, 'transform', 100).at(-1)?.tool,
    'transform'
  )
  assert.equal(parseImportTransformation('polynomial'), 'polynomial')
  for (const value of [undefined, null, 'bad', {}, 'helmert'])
    assert.equal(parseImportTransformation(value), 'helmert')
})
