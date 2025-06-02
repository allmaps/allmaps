import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import { cachedFetch } from '../shared/fetch.js'
import { generateWarpedMapImage } from '../shared/warped-map.js'
import { arrayBufferToBase64 } from '../shared/base64.js'

import type { IRequestStrict } from 'itty-router'

import type { TransformationOptions, Env } from '../shared/types.js'

import type { Size } from '@allmaps/types'

export async function generateWarpedMapCard(
  req: IRequestStrict,
  env: Env,
  mapId: string,
  size: Size,
  options: Partial<TransformationOptions>
) {
  // TODO: move font and logo to static dir or to static.allmaps.org
  const font = await cachedFetch(
    'https://fonts.allmaps.org/geograph/woff/geograph-bold.woff'
  ).then((response) => response.arrayBuffer())
  const logoUrl =
    'https://raw.githubusercontent.com/allmaps/style/master/images/allmaps-logo-inverted.svg'

  const imageResponse = await generateWarpedMapImage(mapId, size, options)
  const image = await imageResponse.arrayBuffer()

  const base64Image = arrayBufferToBase64(image)
  const imageSrc = `data:image/png;base64,${base64Image}`

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; width: 100vw; font-family: Geograph; background: #101655">
      <img src="${imageSrc}" width="${size[0]}" height="${size[1]}" style="position: absolute; top: 0;" />
      <div style="display: flex; color: white; flex-direction: column; justify-content: center; align-items: center;">
        <img src="${logoUrl}" width="150px" height="150px" style="margin-bottom: 20px" />
        <h1 style="font-size: 120px; font-weight: 600; margin: 0; font-family: 'Geograph'; font-weight: 500">
          Allmaps
        </h1>
      </div>
    </div>
    `

  return new ImageResponse(html, {
    width: size[0],
    height: size[1],
    fonts: [
      {
        name: 'Geograph',
        data: font,
        weight: 400,
        style: 'normal'
      }
    ]
  })
}
