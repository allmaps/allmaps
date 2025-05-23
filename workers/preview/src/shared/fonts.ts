import type { IRequestStrict } from 'itty-router'

import type { Env } from './types.js'

type Style = 'normal' | 'italic'
type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

type FontConfig = {
  path: string
  weight: Weight
  style?: Style
}

export async function getLocalFont(
  req: IRequestStrict,
  env: Env,
  font: FontConfig
) {
  try {
    const { path, weight, style = 'normal' } = font

    const fontUrl = new URL(`/fonts/${path}`, req.url).toString()
    const response = await env.ASSETS.fetch(fontUrl)

    if (!response.ok) {
      throw new Error(
        `Failed to load font: ${path} - Status: ${response.status} ${response.statusText}. URL: ${fontUrl}
          }`
      )
    }

    const data = await response.arrayBuffer()

    return {
      data,
      name: 'font-family',
      style,
      weight
    }
  } catch (error: unknown) {
    throw new Error(
      `Failed to load fonts: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
