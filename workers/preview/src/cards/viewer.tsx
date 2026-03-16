import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import { getLocalFont } from '../shared/fonts.js'
import { generateWarpedMapImage } from '../shared/warped-map-wasm.js'
import { arrayBufferToBase64 } from '../shared/base64.js'

import type { IRequestStrict } from 'itty-router'

import type { Size } from '@allmaps/types'

import type { QueryOptions, Env, ResourceWithId } from '../shared/types.js'

export async function generateViewerCard(
  req: IRequestStrict,
  env: Env,
  resourceWithId: ResourceWithId,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  const font = await getLocalFont(req, env, {
    path: 'geograph-bold.woff',
    weight: 500
  })
  const logoUrl =
    'https://raw.githubusercontent.com/allmaps/style/master/images/allmaps-logo-inverted.svg'

  const imageResponse = await generateWarpedMapImage(
    env,
    resourceWithId,
    size,
    options
  )
  const image = await imageResponse.arrayBuffer()

  const base64Image = arrayBufferToBase64(image)
  const imageSrc = `data:image/png;base64,${base64Image}`

  const html = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        fontFamily: 'Geograph',
        background: '#101655'
      }}
    >
      <img
        src={imageSrc}
        width={size[0]}
        height={size[1]}
        style={{ position: 'absolute', top: 0 }}
      />
      <div
        style={{
          display: 'flex',
          color: 'white',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <img
          src={logoUrl}
          width="150px"
          height="150px"
          style={{ marginBottom: '20px' }}
        />
        <h1
          style={{
            fontSize: '120px',
            fontWeight: 600,
            margin: 0,
            fontFamily: 'Geograph'
          }}
        >
          Allmaps
        </h1>
      </div>
    </div>
  )

  return new ImageResponse(html, {
    width: size[0],
    height: size[1],
    fonts: [font]
  })
}
