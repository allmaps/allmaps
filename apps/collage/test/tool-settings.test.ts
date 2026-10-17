import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  defaultToolSettings,
  parseToolSettings,
  enabledTools,
  visibleTools,
  reorderTool,
  parseImportTransformation,
  parseImportLayout,
  parseDoubleTapMode,
  parseResetMode
} from '../src/lib/tool-settings.ts'
import {
  controlLayout,
  fitControlCenter,
  radiusForSize
} from '../src/lib/control-layout.ts'

test('reset defaults to visual settings and is added to existing tool preferences', () => {
  assert.equal(parseResetMode('all'), 'all')
  for (const value of [null, undefined, 'appearance', 'invalid', true])
    assert.equal(parseResetMode(value), 'appearance')
  const old = defaultToolSettings().filter(({ tool }) => tool !== 'reset')
  assert.equal(
    visibleTools(parseToolSettings(old), true).includes('reset'),
    true
  )
  assert.equal(
    visibleTools(parseToolSettings(old), false).includes('reset'),
    false
  )
})

test('tool preferences default to hidden mirror and retain order through storage', () => {
  const defaults = defaultToolSettings()
  assert.deepEqual(
    defaults.filter((tool) => tool.enabled === false).map((tool) => tool.tool),
    ['mirror']
  )
  const changed = defaults
    .toReversed()
    .map((entry) =>
      entry.tool === 'more' ? entry : { ...entry, enabled: !entry.enabled }
    )
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
  assert.deepEqual(
    recovered.find(({ tool }) => tool === 'transform'),
    { tool: 'transform', enabled: true }
  )
  const legacy = parseToolSettings([{ tool: 'skew', enabled: true }])
  assert.equal(
    legacy.some(({ tool }) => String(tool) === 'skew'),
    false
  )
  assert.equal(legacy.find(({ tool }) => tool === 'transform')?.enabled, true)
  assert.deepEqual(
    enabledTools(
      defaults.map((entry) =>
        entry.tool === 'more' ? entry : { ...entry, enabled: false }
      )
    ),
    []
  )
  assert.equal(
    parseToolSettings([{ tool: 'lock', enabled: true }]).some(
      ({ tool }) => String(tool) === 'lock'
    ),
    true
  )
})

test('compact tools, divider position and enabled states survive storage and reordering', () => {
  const defaults = defaultToolSettings()
  assert.deepEqual(visibleTools(defaults, false), [
    'move',
    'rotate',
    'remove',
    'more'
  ])
  assert.deepEqual(visibleTools(defaults, true), [
    ...enabledTools(defaults),
    'more'
  ])
  const changed = reorderTool(defaults, 'opacity', 1)
  assert.deepEqual(visibleTools(changed, false), [
    'move',
    'opacity',
    'rotate',
    'remove',
    'more'
  ])
  assert.deepEqual(
    parseToolSettings(JSON.parse(JSON.stringify(changed))),
    changed
  )
  const onlyToggle = reorderTool(changed, 'more', 0)
  assert.deepEqual(visibleTools(onlyToggle, false), ['more'])
  assert.deepEqual(visibleTools(onlyToggle, true), [
    ...enabledTools(onlyToggle),
    'more'
  ])
  const allVisible = reorderTool(changed, 'more', 100)
  assert.deepEqual(visibleTools(allVisible, false), enabledTools(allVisible))
  assert.deepEqual(visibleTools(allVisible, true), enabledTools(allVisible))
  const allDisabled = defaults.map((entry) =>
    entry.tool === 'more' ? entry : { ...entry, enabled: false }
  )
  assert.deepEqual(visibleTools(allDisabled, false), [])
  assert.deepEqual(visibleTools(allDisabled, true), [])
  assert.deepEqual(parseToolSettings([...changed, { tool: 'more' }]), changed)
})

test('legacy preferences migrate to a compact ring without re-enabling tools', () => {
  const legacy = [
    { tool: 'opacity', enabled: true },
    { tool: 'rotate', enabled: false },
    { tool: 'remove', enabled: true },
    { tool: 'move', enabled: true }
  ]
  const migrated = parseToolSettings(legacy)
  assert.deepEqual(visibleTools(migrated, false), ['remove', 'move', 'more'])
  assert.equal(migrated.find(({ tool }) => tool === 'rotate')?.enabled, false)
  assert.equal(
    migrated[migrated.findIndex(({ tool }) => tool === 'more') + 1].tool,
    'opacity'
  )
  assert.deepEqual(
    parseToolSettings(JSON.parse(JSON.stringify(migrated))),
    migrated
  )
})

test('custom ring order has no gaps and handles a single tool or an empty ring', () => {
  const layout = controlLayout(
    [300, 300],
    0,
    { saturation: 1, opacity: 1, hue: 0 },
    150,
    ['rotate', 'opacity', 'move']
  )
  assert.deepEqual(Object.keys(layout), ['rotate', 'opacity', 'move'])
  const distance = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  assert.ok(
    Math.abs(
      distance(layout.rotate.position, layout.opacity.position) -
        distance(layout.opacity.position, layout.move.position)
    ) < 1e-8
  )
  assert.ok(radiusForSize(0, 3) < radiusForSize(0, 12))
  const single = controlLayout(
    [300, 300],
    0,
    { saturation: 1, opacity: 1, hue: 0 },
    100,
    ['opacity']
  )
  assert.ok(single.opacity.position.every(Number.isFinite))
  const empty = controlLayout(
    [300, 300],
    0,
    { saturation: 1, opacity: 1, hue: 0 },
    100,
    []
  )
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

test('double tap defaults to mask and accepts only supported editor modes', () => {
  assert.equal(parseDoubleTapMode('transform'), 'transform')
  for (const value of [undefined, null, 'mask', 'invalid', {}, []])
    assert.equal(parseDoubleTapMode(value), 'mask')
})

test('import layout defaults to compact and accepts geographic placement', () => {
  assert.equal(parseImportLayout('geographic'), 'geographic')
  for (const value of [undefined, null, 'compact', 'invalid', {}, []])
    assert.equal(parseImportLayout(value), 'compact')
})
