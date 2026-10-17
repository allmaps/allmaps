import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyPixelEffects,
  defaultExportEffects,
  exportAppearance,
  hasPixelEffects
} from '../src/lib/export-effects.ts'
import type { CollageMap } from '../src/lib/model.ts'

const appearance: CollageMap['appearance'] = {
  applyMask: true,
  opacity: 0.2,
  saturation: 1,
  colorize: false,
  hue: 0,
  removeBackground: false
}

test('export effect choices preserve mask and leave the collage untouched', () => {
  const item = {
    appearance: {
      ...appearance,
      saturation: 0,
      colorize: true,
      removeBackground: true
    }
  } as CollageMap
  const original = structuredClone(item)
  const disabled = exportAppearance(item, {
    opacity: false,
    saturation: false,
    colorize: false,
    removeBackground: false
  })
  assert.deepEqual(disabled, { ...appearance, opacity: 1 })
  assert.deepEqual(exportAppearance(item), original.appearance)
  assert.equal(
    exportAppearance(item, { ...defaultExportEffects, colorize: false })
      .saturation,
    0
  )
  assert.deepEqual(item, original)
})

test('source pixel effects preserve alpha and never bake in map opacity', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255
  ])
  applyPixelEffects(pixels, { ...appearance, saturation: 0 })
  assert.deepEqual(
    [...pixels],
    [54, 54, 54, 255, 181, 181, 181, 128, 18, 18, 18, 255]
  )
  assert.equal(hasPixelEffects(appearance), false)
})

test('background removal keeps soft alpha and applies color effects in renderer order', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255, 235, 235, 235, 255, 0, 0, 0, 255
  ])
  applyPixelEffects(pixels, {
    ...appearance,
    removeBackground: true,
    backgroundColor: '#ffffff'
  })
  assert.equal(pixels[3], 0)
  assert.ok(pixels[7] > 0 && pixels[7] < 255)
  assert.equal(pixels[11], 255)
  assert.deepEqual([...pixels.slice(4, 7)], [235, 235, 235])
  const colored = new Uint8ClampedArray([235, 235, 235, 255])
  applyPixelEffects(colored, {
    ...appearance,
    colorize: true,
    removeBackground: true,
    backgroundColor: '#ffffff'
  })
  assert.equal(colored[3], pixels[7])
  assert.ok(colored[0] >= pixels[4])
  assert.ok(colored[1] < pixels[5])
})
