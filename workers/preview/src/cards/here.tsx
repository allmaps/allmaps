import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import tinycolor from 'tinycolor2'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'
import { Image } from '@allmaps/iiif-parser'
import { computeBbox } from '@allmaps/stdlib'
import { pink } from '@allmaps/tailwind'

import { cachedFetch } from '../shared/fetch.js'
import { getLocalFont } from '../shared/fonts.js'
import { loadImage } from '../shared/image.js'
import { computeCrop } from '../shared/crop.js'

import { Pin } from '../components/Pin.js'
import { Dots } from '../components/Dots.js'

import type { IRequestStrict } from 'itty-router'

import type { QueryOptions, Env } from '../shared/types.js'

import type { Size, Point } from '@allmaps/types'

const padding = 40

const pinSize = [182.4, 315]
const pinShadowSize = [825, 260]
const stampSize = [300.8, 147.4]

export async function generateHereCard(
  req: IRequestStrict,
  env: Env,
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  const color = options.color || tinycolor(pink).toRgb()

  const font = await getLocalFont(req, env, {
    path: 'geograph-bold.woff',
    weight: 500
  })

  const pinShadow = await loadImage(req, env, 'pin-shadow.svg')
  const stamp = await loadImage(req, env, 'stamp-texture.svg')

  if (!options.from) {
    throw new Error('No coordinates provided')
  }

  const cardResourceSize: Size = [
    Math.round(size[0] - 2 * padding),
    Math.round(size[1] - 2 * padding)
  ]

  const stampWidth = 200

  const pinWidth = 120
  const pinHeight = (pinSize[1] / pinSize[0]) * pinWidth

  const pinShadowWidth = 200
  const pinShadowHeight = (pinShadowSize[1] / pinShadowSize[0]) * pinShadowWidth

  const mapUrl = `https://api.allmaps.org/maps/${mapId}`

  const map = await cachedFetch(mapUrl).then((response) => response.json())
  const parsedMap = validateGeoreferencedMap(map)

  if (Array.isArray(parsedMap)) {
    throw new Error('Multiple maps found')
  }

  const transformer = new GcpTransformer(
    parsedMap.gcps,
    parsedMap.transformation?.type
  )

  const resourceCoords = transformer.transformToResource([
    options.from[1],
    options.from[0]
  ])

  const imageId = parsedMap.resource.id

  const image = await cachedFetch(`${imageId}/info.json`).then((response) =>
    response.json()
  )
  const parsedImage = Image.parse(image)

  const bbox = computeBbox(parsedMap.resourceMask)

  // TODO: check if parsedImage.supportsAnyRegionAndSize

  const targetPoint: Point = [
    cardResourceSize[0] / 2,
    cardResourceSize[1] / 2 + pinHeight / 2
  ]

  const crop = computeCrop(
    cardResourceSize,
    [parsedImage.width, parsedImage.height],
    resourceCoords,
    bbox,
    targetPoint
  )

  const imageUrl = parsedImage.getImageUrl({
    region: crop.region,
    size: crop.size
  })

  const pinLeft = crop.coordinates[0] - pinWidth / 2
  const pinTop = crop.coordinates[1] - pinHeight

  const pinShadowLeft = crop.coordinates[0]
  const pinShadowTop =
    crop.coordinates[1] -
    (pinShadowSize[1] / pinShadowSize[0]) * pinShadowWidth +
    pinShadowHeight / 2

  const pinRotation = (Math.random() * 10 + 5) * (Math.random() > 0.5 ? 1 : -1)

  const jsx = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: `${padding}px`,
        height: '100vh',
        width: '100vw',
        background: tinycolor(color).lighten(20).toString()
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          position: 'absolute',
          top: 0
        }}
      >
        {Dots(color)}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px',
          width: '100%',
          height: '100%'
        }}
      >
        <img
          src={imageUrl}
          width={cardResourceSize[0]}
          height={cardResourceSize[1]}
          style={{ position: 'absolute', top: 0 }}
        />

        <img
          src={pinShadow}
          width={pinShadowWidth}
          height={pinShadowHeight}
          style={{
            position: 'absolute',
            left: `${pinShadowLeft}px`,
            top: `${pinShadowTop}px`
          }}
        />

        {Pin(color, pinWidth, pinHeight, {
          position: 'absolute',
          left: `${pinLeft}px`,
          top: `${pinTop}px`,
          transformOrigin: 'bottom center',
          transform: `rotate(${pinRotation}deg)`
        })}
      </div>
      <img
        src={stamp}
        width={stampWidth}
        height={(stampSize[1] / stampSize[0]) * stampWidth}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          transform: 'rotate(10deg)',
          opacity: 1
        }}
      />
    </div>
  )

  return new ImageResponse(jsx, {
    width: size[0],
    height: size[1],
    fonts: [font]
  })
}
