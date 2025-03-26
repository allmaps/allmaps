import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'
import { Image } from '@allmaps/iiif-parser'
import { computeBbox } from '@allmaps/stdlib'

import { cachedFetch } from '../shared/fetch.js'
import { getLocalFont } from '../shared/fonts.js'

import type { IRequestStrict } from 'itty-router'

import type { QueryOptions, Env } from '../shared/types.js'

import type { Size } from '@allmaps/types'

// import Pin from '../shared/images/pin.svg'
// import Stamp from '../shared/images/stamp.svg'

const padding = 30

const PinSize = [182.4, 314.5]
const StampSize = [300.8, 147.4]

export async function generateHereCard(
  req: IRequestStrict,
  env: Env,
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  const font = await getLocalFont(req, env, {
    path: 'geograph-bold.woff',
    weight: 500
  })

  const jsx = <div>Allmaps Editor</div>

  return new ImageResponse(jsx, {
    width: size[0],
    height: size[1],
    fonts: [font]
  })

  // if (!options.from) {
  //   throw new Error('No coordinates provided')
  // }

  // const cardResourceSize = {
  //   width: Math.round(size[0] - 2 * padding),
  //   height: Math.round(size[1] - 2 * padding)
  // }

  // // const font = await cachedFetch(
  // //   'https://fonts.allmaps.org/geograph/woff/geograph-bold.woff'
  // // ).then((response) => response.arrayBuffer())

  // const mapUrl = `https://api.allmaps.org/maps/${mapId}`

  // const map = await cachedFetch(mapUrl).then((response) => response.json())
  // const parsedMap = validateGeoreferencedMap(map)

  // if (Array.isArray(parsedMap)) {
  //   throw new Error('Multiple maps found')
  // }

  // const transformer = new GcpTransformer(
  //   parsedMap.gcps,
  //   parsedMap.transformation?.type
  // )

  // const resourceCoords = transformer.transformToResource([
  //   options.from[1],
  //   options.from[0]
  // ])

  // const region = {
  //   x: Math.round(resourceCoords[0] - cardResourceSize.width / 2),
  //   y: Math.round(resourceCoords[1] - cardResourceSize.height / 2),
  //   width: cardResourceSize.width,
  //   height: cardResourceSize.height
  // }

  // // [xMin, yMin, xMax, yMax]
  // const bbox = computeBbox(parsedMap.resourceMask)

  // const imageId = parsedMap.resource.id

  // const image = await cachedFetch(`${imageId}/info.json`).then((response) =>
  //   response.json()
  // )
  // const parsedImage = Image.parse(image)

  // const imageUrl = parsedImage.getImageUrl({
  //   region: region,
  //   size: cardResourceSize
  // })

  // console.log(imageUrl)

  // // <svg width="10px" height="10px" style="position: absolute; top: 50%; left: 50%;">
  // //       <circle cx="5" cy="5" r="10" fill="purple" />
  // //   </svg>

  // const html = `
  //   <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;
  //     position: relative;
  //     padding: ${padding}px;
  //     height: 100vh; width: 100vw;
  //     font-family: Geograph; background: #ffabc1;">
  //     <!-- TODO: dots background -->
  //     <div style="position: relative; display: flex; overflow: hidden;
  //       border-radius: 10px; width: 100%; height: 100%;">
  //       <img src="${imageUrl}" width="${cardResourceSize.width}" height="${cardResourceSize.height}"
  //         style="position: absolute; top: 0;" />
  //     </div>

  //   </div>`

  // //   <img src="${Stamp}" width="280" height="${(StampSize[1] / StampSize[0]) * 280}"
  // //   style="position: absolute; top: 10px; right: 10px; transform: rotate(10deg); opacity: 0.8;" />

  // // <img src="${Pin}" width="150" height="${(PinSize[1] / PinSize[0]) * 150}"
  // //   style="position: absolute; top: 50%; left: 50%; transform: rotate(10deg);" />

  // return new ImageResponse(html, {
  //   width: size[0],
  //   height: size[1]
  //   // fonts: [
  //   //   {
  //   //     name: 'Geograph',
  //   //     data: font,
  //   //     weight: 400,
  //   //     style: 'normal'
  //   //   }
  //   // ]
  // })
}
