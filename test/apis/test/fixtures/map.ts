import type { GeoreferencedMap } from '@allmaps/annotation'

export const fixtureMap: GeoreferencedMap = {
  '@context': 'https://schemas.allmaps.org/map/2/context.json',
  type: 'GeoreferencedMap',
  resource: {
    id: 'https://fixtures.allmaps.test/iiif/amsterdam',
    type: 'ImageService3',
    width: 1000,
    height: 1000
  },
  gcps: [
    { resource: [0, 0], geo: [4.89, 52.37] },
    { resource: [1000, 0], geo: [4.9, 52.37] },
    { resource: [1000, 1000], geo: [4.9, 52.38] },
    { resource: [0, 1000], geo: [4.89, 52.38] }
  ],
  resourceMask: [
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [0, 1000]
  ],
  transformation: { type: 'polynomial', options: { order: 1 } }
}
