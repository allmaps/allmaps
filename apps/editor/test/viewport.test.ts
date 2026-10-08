import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

const viewportUrl = new URL('../src/lib/shared/viewport.ts', import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === '../src/lib/shared/viewport.js' &&
      context.parentURL === import.meta.url
    ) {
      return { url: viewportUrl.href, shortCircuit: true }
    }

    return nextResolve(specifier, context)
  }
})
const { getNavPlaceViewport, getBboxViewport, sortGeoViewports } =
  await import('../src/lib/shared/viewport.js')
hooks.deregister()

test('a standard IIIF navPlace FeatureCollection supplies a viewport', () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        '../../../packages/iiif-parser/test/input/manifest.3.navplace-example.json',
        import.meta.url
      ),
      'utf8'
    )
  )

  assert.deepEqual(getNavPlaceViewport(manifest.navPlace), {
    bounds: [9.938, 51.533, 9.938, 51.533]
  })
})

test('navPlace combines the extents of its features', () => {
  assert.deepEqual(
    getNavPlaceViewport({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [5.4, 47.05],
                [5.46, 47.05],
                [5.46, 47.1],
                [5.4, 47.1],
                [5.4, 47.05]
              ]
            ]
          }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [6, 48] }
        },
        { type: 'Feature', geometry: null }
      ]
    }),
    { bounds: [5.4, 47.05, 6, 48] }
  )
})

test('empty or referenced navPlace collections have no viewport', () => {
  assert.equal(getNavPlaceViewport(undefined), undefined)
  assert.equal(
    getNavPlaceViewport({ type: 'FeatureCollection', features: [] }),
    undefined
  )
  assert.equal(
    getNavPlaceViewport({
      id: 'https://example.org/navplace',
      type: 'FeatureCollection'
    }),
    undefined
  )
})

test('viewport selection preserves saved views and navPlace precedence', () => {
  const state = { center: [1, 2] as [number, number], zoom: 8, bearing: 30 }
  const navPlace = getNavPlaceViewport({
    type: 'Point',
    coordinates: [9.938, 51.533]
  })
  const url = getBboxViewport([5.4, 47.05, 5.46, 47.1])

  assert.equal(sortGeoViewports({ state, navPlace, url })[0], state)
  assert.equal(sortGeoViewports({ navPlace, url })[0], navPlace)
  assert.equal(sortGeoViewports({ url })[0], url)
  assert.deepEqual(sortGeoViewports({}), [])
})
