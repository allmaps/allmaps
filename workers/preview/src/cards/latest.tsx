import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'
import { json, IRequestStrict } from 'itty-router'

import {
  blue,
  purple,
  orange,
  red,
  pink,
  green,
  yellow
} from '@allmaps/tailwind'

import { validateGeoreferencedMap } from '@allmaps/annotation'

import { cachedFetch } from '../shared/fetch.js'
import { getTransformedPolygon, geometryToPath } from '../shared/geometry.js'
import { hexToRgb } from '../shared/colors.js'

import type { Size } from '@allmaps/types'

import type { Env } from '../shared/types.js'

const colors = [blue, purple, orange, red, pink, green, yellow]

const columns = 8
const rows = 4
const mapCount = columns * rows
const padding = 5
const strokeWidth = 4

function getMapPath(color: string, path: string) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      <path fill="none" stroke={color} stroke-width={strokeWidth} d={path} />
    </svg>
  )
}

function getGrayMapMonster() {
  // TODO: return gray map monster
  return <div></div>
}

export async function generateLatestCard(
  req: IRequestStrict,
  env: Env,
  size: Size
): Promise<ImageResponse> {
  try {
    const url = `https://api.allmaps.org/maps?limit=${mapCount}`
    const apiMaps = await cachedFetch(url).then((response) => response.json())

    const maps = validateGeoreferencedMap(apiMaps)

    if (!Array.isArray(maps)) {
      throw new Error('Only single map returned')
    }

    const jsx = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          backgroundColor: 'white',
          padding: `${padding}px`
        }}
      >
        {maps.map((map, index) => {
          const color = colors[index % colors.length]
          const rgbColor = hexToRgb(color)

          let path: string | null = null
          try {
            const polygon = getTransformedPolygon(map)
            path = geometryToPath(polygon, [100, 100])
          } catch (error) {
            // Transforming resource mask to path failed.
            // Show a gray map monster instead!
          }

          return (
            <span
              key={index}
              style={{
                width: `${(1 / columns) * 100}%`,
                height: `${(1 / rows) * 100}%`,
                padding: `${padding}px`
              }}
            >
              <span
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '5px',
                  backgroundColor: `rgba(${rgbColor?.r},${rgbColor?.g},${rgbColor?.b}, 0.2)`,
                  borderRadius: '5px'
                }}
              >
                {path ? getMapPath(color, path) : getGrayMapMonster()}
              </span>
            </span>
          )
        })}
      </div>
    )

    return new ImageResponse(jsx, {
      width: size[0],
      height: size[1]
    })
  } catch (error: any) {
    console.error('OG Image generation error:', error)
    // todo status 500
    return json({ error: 'Failed to generate image', details: error.message })
  }
}
