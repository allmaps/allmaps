import { IRequestStrict } from 'itty-router'

import type { Env } from '../shared/types.js'

export async function loadImage(
  req: IRequestStrict,
  env: Env,
  imagePath: string
): Promise<string | null> {
  try {
    if (!env?.ASSETS) {
      throw new Error('ASSETS binding is not configured')
    }
    const imageUrl = new URL(imagePath, req.url).toString()
    const imageData = await env.ASSETS.fetch(imageUrl)
    // Get content-type from response
    // TODO: does this work for SVG?
    const contentType = imageData.headers.get('content-type') || 'image/png'
    const arrayBuffer = await imageData.arrayBuffer()

    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    // const base64Image = Buffer.from(arrayBuffer).toString('base64');
    return `data:${contentType};base64,${base64Image}`
  } catch (error) {
    console.warn(`Failed to load image ${imagePath}:`, error)
    return null
  }
}
