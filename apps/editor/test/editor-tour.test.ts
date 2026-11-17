import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

import type { TourTarget } from '../src/lib/shared/editor-tour.js'

const moduleUrl = new URL('../src/lib/shared/editor-tour.ts', import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === '../src/lib/shared/editor-tour.js' &&
      context.parentURL === import.meta.url
    ) {
      return { url: moduleUrl.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  }
})
const { getTourViewTarget, prepareTourStep } =
  await import('../src/lib/shared/editor-tour.js')
hooks.deregister()

function createEnvironment(missing = false) {
  const prepared: TourTarget[] = []
  return {
    prepared,
    isActive: () => true,
    prepare: async (target: TourTarget) => {
      prepared.push(target)
    },
    waitForElement: async () => (missing ? undefined : ({} as Element))
  }
}

test('disabled Results highlights its button on Next and Back without navigating', async () => {
  const target = () =>
    getTourViewTarget('results', { canEdit: true, resultsEnabled: false })
  const steps = [
    { target: () => ({ selector: '#maps' }) },
    { target },
    { target: () => ({ selector: '#export' }) }
  ]

  for (const [index, direction] of [
    [0, 1],
    [2, -1]
  ] as const) {
    const environment = createEnvironment()
    assert.deepEqual(
      await prepareTourStep(steps, index, direction, environment),
      { index: 1, selector: '[data-tour="editor-results"]' }
    )
    assert.equal('view' in environment.prepared[0], false)
  }
})

test('Results availability is checked again when revisiting the step', async () => {
  let resultsEnabled = true
  const steps = [
    { target: () => ({ selector: '#maps' }) },
    {
      target: () =>
        getTourViewTarget('results', { canEdit: true, resultsEnabled })
    },
    { target: () => ({ selector: '#export' }) }
  ]
  const environment = createEnvironment()
  const next = await prepareTourStep(steps, 0, 1, environment)
  assert.equal(next?.selector, '[data-tour="editor-results-view"]')
  assert.equal(environment.prepared[0].view, 'results')

  resultsEnabled = false
  const previous = await prepareTourStep(steps, 2, -1, environment)
  assert.equal(previous?.selector, '[data-tour="editor-results"]')
  assert.equal('view' in environment.prepared[1], false)
})

test('a collection without an editable manifest highlights disabled editing buttons', () => {
  for (const view of ['mask', 'georeference'] as const) {
    const target = getTourViewTarget(view, {
      canEdit: false,
      resultsEnabled: false
    })
    assert.deepEqual(target, { selector: `[data-tour="editor-${view}"]` })
  }
})

test('unavailable panels are skipped in both directions without opening them', async () => {
  const steps = [
    { target: () => ({ selector: '#settings' }) },
    { target: () => ({ selector: '#maps', available: false }) },
    { target: () => ({ selector: '#results' }) }
  ]
  const environment = createEnvironment()
  assert.deepEqual(await prepareTourStep(steps, 0, 1, environment), {
    index: 2,
    selector: '#results'
  })
  assert.deepEqual(await prepareTourStep(steps, 2, -1, environment), {
    index: 0,
    selector: '#settings'
  })
  assert.deepEqual(
    environment.prepared.map((target) => target.selector),
    ['#results', '#settings']
  )
})

test('a panel that never mounts advances to its fallback instead of stalling', async () => {
  const steps = [
    { target: () => ({ selector: '#settings' }) },
    {
      target: () => ({
        selector: '#maps-panel',
        fallbackSelector: '#maps-button'
      })
    }
  ]
  assert.deepEqual(
    await prepareTourStep(steps, 0, 1, createEnvironment(true)),
    {
      index: 1,
      selector: '#maps-button'
    }
  )
})

test('closing the tour while waiting prevents a delayed advance', async () => {
  let active = true
  const environment = {
    ...createEnvironment(),
    isActive: () => active,
    waitForElement: async () => {
      active = false
      return undefined
    }
  }
  assert.equal(
    await prepareTourStep(
      [{ target: () => ({ selector: '#source' }) }],
      -1,
      1,
      environment
    ),
    undefined
  )
})

test('Next past the final step finishes the tour and Back before the first is ignored', async () => {
  const steps = [{ target: () => ({ selector: '#source' }) }]
  const environment = createEnvironment()
  assert.equal((await prepareTourStep(steps, 0, 1, environment))?.index, 1)
  assert.equal(await prepareTourStep(steps, 0, -1, environment), undefined)
  assert.deepEqual(environment.prepared, [])
})
