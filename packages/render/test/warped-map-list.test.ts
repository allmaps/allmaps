import { describe, expect, test } from 'vitest'

import { WarpedMapList } from '../src/maps/WarpedMapList.js'
import { WarpedMap } from '../src/maps/WarpedMap.js'
import {
  WarpedMapErrorEvent,
  WarpedMapEventType
} from '../src/shared/events.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  GetWarpedMapOptions,
  WarpedMapFactory,
  WarpedMapListOptions
} from '../src/shared/types.js'

const GOOD_MAP_ID_1 = 'https://example.com/maps/good-1'
const BAD_MAP_ID = 'https://example.com/maps/bad'
const GOOD_MAP_ID_2 = 'https://example.com/maps/good-2'

function createGeoreferencedMap(id: string): unknown {
  return {
    version: 1,
    id,
    gcps: [
      {
        image: [0, 0],
        world: [0, 0]
      },
      {
        image: [100, 0],
        world: [1, 0]
      },
      {
        image: [100, 100],
        world: [1, 1]
      },
      {
        image: [0, 100],
        world: [0, 1]
      }
    ],
    image: {
      uri: `${id}/info.json`,
      type: 'ImageService3',
      width: 100,
      height: 100
    },
    pixelMask: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ]
  }
}

function createWarpedMapFactory(
  failingMapId: string
): WarpedMapFactory<WarpedMap> {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    listOptions?: Partial<WarpedMapListOptions<WarpedMap>>,
    mapOptions?: Partial<GetWarpedMapOptions<WarpedMap>>
  ) => {
    if (mapId === failingMapId) {
      throw new Error(`Failed map ${mapId}`)
    }

    return new WarpedMap(mapId, georeferencedMap, listOptions, mapOptions)
  }
}

describe('WarpedMapList batch failures', () => {
  test('addGeoreferencedMaps collects errors by default', () => {
    const warpedMapList = new WarpedMapList({
      warpedMapFactory: createWarpedMapFactory(BAD_MAP_ID)
    })

    const results = warpedMapList.addGeoreferencedMaps([
      createGeoreferencedMap(GOOD_MAP_ID_1),
      createGeoreferencedMap(BAD_MAP_ID),
      createGeoreferencedMap(GOOD_MAP_ID_2)
    ])

    expect(results).toMatchObject([
      { ok: true, mapId: GOOD_MAP_ID_1, index: 0 },
      { ok: false, mapId: BAD_MAP_ID, index: 1 },
      { ok: true, mapId: GOOD_MAP_ID_2, index: 2 }
    ])
    expect(warpedMapList.getMapIds()).to.deep.equal([
      GOOD_MAP_ID_1,
      GOOD_MAP_ID_2
    ])
  })

  test('addGeoreferencedMaps can fail fast', () => {
    const warpedMapList = new WarpedMapList({
      warpedMapFactory: createWarpedMapFactory(BAD_MAP_ID)
    })

    expect(() =>
      warpedMapList.addGeoreferencedMaps(
        [
          createGeoreferencedMap(GOOD_MAP_ID_1),
          createGeoreferencedMap(BAD_MAP_ID),
          createGeoreferencedMap(GOOD_MAP_ID_2)
        ],
        undefined,
        { failureMode: 'fail-fast' }
      )
    ).to.throw(`Failed map ${BAD_MAP_ID}`)
    expect(warpedMapList.getMapIds()).to.deep.equal([GOOD_MAP_ID_1])
  })

  test('updateWarpedMapsUsingFactory removes failed maps and continues', () => {
    const warpedMapList = new WarpedMapList()
    const errors: WarpedMapErrorEvent[] = []

    warpedMapList.addGeoreferencedMaps([
      createGeoreferencedMap(GOOD_MAP_ID_1),
      createGeoreferencedMap(BAD_MAP_ID),
      createGeoreferencedMap(GOOD_MAP_ID_2)
    ])
    warpedMapList.setOptions({
      warpedMapFactory: createWarpedMapFactory(BAD_MAP_ID)
    })
    warpedMapList.addEventListener(WarpedMapEventType.ERROR, (event) => {
      if (event instanceof WarpedMapErrorEvent) {
        errors.push(event)
      }
    })

    const results = warpedMapList.updateWarpedMapsUsingFactory()

    expect(results).toMatchObject([
      { ok: true, mapId: GOOD_MAP_ID_1, index: 0 },
      { ok: false, mapId: BAD_MAP_ID, index: 1 },
      { ok: true, mapId: GOOD_MAP_ID_2, index: 2 }
    ])
    expect(warpedMapList.getMapIds()).to.deep.equal([
      GOOD_MAP_ID_1,
      GOOD_MAP_ID_2
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0].data?.mapIds).to.deep.equal([BAD_MAP_ID])
  })
})
