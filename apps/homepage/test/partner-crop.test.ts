import { describe, expect, test } from 'vitest'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { getPartnerCrop } from '../src/lib/partner-preview.js'
import {
  combinePartners,
  organizationPlans,
  partnerOrganizations
} from '../src/lib/data/partners.js'

const map: GeoreferencedMap = {
  type: 'GeoreferencedMap',
  resource: {
    id: 'https://example.org/image',
    type: 'ImageService2',
    width: 1000,
    height: 800
  },
  gcps: [
    { resource: [0, 0], geo: [4, 52] },
    { resource: [1000, 0], geo: [4.01, 52] },
    { resource: [0, 800], geo: [4, 51.99] }
  ],
  resourceMask: [
    [0, 0],
    [1000, 0],
    [1000, 800],
    [0, 800]
  ]
}

describe('partner thumbnail crops', () => {
  test('keeps edge locations inside the map interior instead of exposing the sheet border', () => {
    const crop = getPartnerCrop(map, 500, 400, [4, 52], [0.1, 0.2, 0.9, 0.85])
    expect(crop.left).toBe(50)
    expect(crop.top).toBe(80)
    expect(crop.left + crop.width).toBeLessThanOrEqual(450)
    expect(crop.top + crop.height).toBeLessThanOrEqual(340)
    expect(crop.width).toBeLessThan(getPartnerCrop(map, 500, 400).width)
  })

  test('rejects reversed crop bounds', () => {
    expect(() =>
      getPartnerCrop(map, 500, 400, undefined, [0.9, 0, 0.1, 1])
    ).toThrow('Invalid partner preview bounds')
  })

  test('centers on the institution and scales annotation coordinates to downloaded pixels', () => {
    const crop = getPartnerCrop(map, 500, 400, [4.005, 51.995])
    expect(crop.width).toBe(333)
    expect(crop.height).toBe(185)
    expect(Math.abs(crop.left + crop.width / 2 - 250)).toBeLessThanOrEqual(1)
    expect(Math.abs(crop.top + crop.height / 2 - 200)).toBeLessThanOrEqual(1)
  })

  test.each([
    [4, 52],
    [4.01, 51.99]
  ])(
    'keeps edge crops inside the original pixels (%j)',
    (longitude, latitude) => {
      const crop = getPartnerCrop(map, 500, 400, [longitude, latitude])
      expect(crop.left).toBeGreaterThanOrEqual(0)
      expect(crop.top).toBeGreaterThanOrEqual(0)
      expect(crop.left + crop.width).toBeLessThanOrEqual(500)
      expect(crop.top + crop.height).toBeLessThanOrEqual(400)
    }
  )
})

test('only membership plans are fetched; editorial partners have no membership tag', () => {
  expect(organizationPlans).toEqual(['innovator', 'supporter'])
  expect(partnerOrganizations.map(({ slug }) => slug).sort()).toEqual([
    'agsl',
    'ghent',
    'knaw',
    'leiden',
    'lmec',
    'nls',
    'tudelft',
    'vu'
  ])
  expect(partnerOrganizations.every(({ plan }) => plan === 'partner')).toBe(
    true
  )
})

test('combines partners alphabetically and prevents duplicates when a partner joins a paid plan', () => {
  const nls = partnerOrganizations.find(({ slug }) => slug === 'nls')!
  const organizations = combinePartners([{ ...nls, plan: 'supporter' }])
  expect(organizations.filter(({ slug }) => slug === 'nls')).toHaveLength(1)
  expect(organizations.find(({ slug }) => slug === 'nls')?.plan).toBe(
    'supporter'
  )
  expect(organizations.map(({ name }) => name)).toEqual(
    organizations
      .map(({ name }) => name)
      .sort((left, right) =>
        left.localeCompare(right, 'en', { sensitivity: 'base' })
      )
  )
})
